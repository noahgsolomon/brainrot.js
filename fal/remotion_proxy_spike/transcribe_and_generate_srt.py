import argparse
import concurrent.futures
import json
import math
import os
import re
import subprocess
import sys
from difflib import SequenceMatcher
from functools import lru_cache
from pathlib import Path
from typing import Optional
from urllib import request

from fal.toolkit import Audio


WHISPER_URL = "https://fal.run/fal-ai/whisper"
DEFAULT_TRANSCRIBE_CONCURRENCY = 4
MAX_ALIGNMENT_GROUP_SIZE = 3
ALIGNMENT_SKIP_COST = 0.85
MIN_GROUP_MATCH_RATIO = 0.72
MIN_WORD_DURATION_SECONDS = 0.01


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input-json", required=True)
    return parser.parse_args()


def load_payload(input_json_path: str) -> dict:
    return json.loads(Path(input_json_path).read_text())


def log(message: str) -> None:
    print(f"[transcribe_and_generate_srt] {message}", file=sys.stderr)


def ensure_fal_key() -> str:
    fal_key = os.environ.get("FAL_KEY", "").strip()
    if not fal_key:
        raise RuntimeError("Missing required environment variable: FAL_KEY")
    return fal_key


def run_command(command: list[str]) -> None:
    subprocess.run(
        command,
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )


def ffprobe_duration(audio_path: str) -> float:
    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            audio_path,
        ],
        capture_output=True,
        text=True,
    )

    if result.returncode != 0:
        stderr = result.stderr.strip()
        raise RuntimeError(
            f"ffprobe failed for {audio_path}: {stderr or 'unknown ffprobe error'}"
        )

    return float(result.stdout.strip())


def ensure_parent_dir(target_path: str) -> None:
    Path(target_path).parent.mkdir(parents=True, exist_ok=True)


def upload_audio(audio_path: str) -> str:
    uploaded = Audio.from_path(audio_path, content_type="audio/mpeg")
    return str(uploaded.url)


def transcribe_audio(audio_path: str) -> list[dict]:
    fal_key = ensure_fal_key()
    audio_url = upload_audio(audio_path)
    req = request.Request(
        WHISPER_URL,
        data=json.dumps(
            {
                "audio_url": audio_url,
                "chunk_level": "word",
            }
        ).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Key {fal_key}",
        },
        method="POST",
    )

    with request.urlopen(req, timeout=300) as response:
        payload = json.loads(response.read().decode("utf-8"))

    chunks = payload.get("chunks") or []
    normalized = []
    for chunk in chunks:
        timestamp = chunk.get("timestamp") or [0, 0]
        if len(timestamp) != 2:
            continue

        text = str(chunk.get("text") or "").strip()
        start = float(timestamp[0] or 0)
        end = float(timestamp[1] or 0)
        if not text:
            continue

        normalized.append(
            {
                "text": text,
                "start": start,
                "end": max(start, end),
            }
        )

    return normalized


def resolve_transcribe_concurrency(audio_file_count: int) -> int:
    configured = os.environ.get("BRAINROT_TRANSCRIBE_CONCURRENCY", "").strip()
    try:
        requested = int(configured) if configured else DEFAULT_TRANSCRIBE_CONCURRENCY
    except ValueError:
        requested = DEFAULT_TRANSCRIBE_CONCURRENCY

    return max(1, min(requested, max(audio_file_count, 1)))


def split_transcript_words(transcript_text: str) -> list[str]:
    return [word for word in transcript_text.split() if word.strip()]


def normalize_alignment_token(token: str) -> str:
    normalized = str(token).lower().replace("'", "").replace("’", "")
    return re.sub(r"[^a-z0-9]+", "", normalized)


def joined_normalized_tokens(tokens: list[str]) -> str:
    normalized_parts = [normalize_alignment_token(token) for token in tokens]
    return "".join(part for part in normalized_parts if part)


def get_group_match_cost(
    transcript_group: list[str], recognized_group: list[dict]
) -> Optional[float]:
    transcript_key = joined_normalized_tokens(transcript_group)
    recognized_key = joined_normalized_tokens(
        [str(word.get("text") or "") for word in recognized_group]
    )

    if not transcript_key or not recognized_key:
        return None

    if transcript_key == recognized_key:
        return 0.0

    if len(transcript_key) >= 3 and len(recognized_key) >= 3:
        if transcript_key.startswith(recognized_key) or recognized_key.startswith(
            transcript_key
        ):
            length_gap = abs(len(transcript_key) - len(recognized_key)) / max(
                len(transcript_key), len(recognized_key), 1
            )
            return 0.12 + (length_gap * 0.25)

    similarity = SequenceMatcher(None, transcript_key, recognized_key).ratio()
    if similarity < MIN_GROUP_MATCH_RATIO:
        return None

    return 1.0 - similarity


def distribute_words_in_span(
    transcript_words: list[str], span_start: float, span_end: float
) -> list[dict]:
    if not transcript_words:
        return []

    normalized_weights = [
        max(len(normalize_alignment_token(word)), 1) for word in transcript_words
    ]
    total_weight = sum(normalized_weights) or len(transcript_words)
    current = float(span_start)
    final_end = max(
        float(span_end),
        current + (MIN_WORD_DURATION_SECONDS * len(transcript_words)),
    )
    distributed: list[dict] = []
    consumed_weight = 0

    for index, (word, weight) in enumerate(zip(transcript_words, normalized_weights)):
        consumed_weight += weight
        if index == len(transcript_words) - 1:
            next_boundary = final_end
        else:
            progress = consumed_weight / max(total_weight, 1)
            next_boundary = float(span_start) + ((final_end - span_start) * progress)
        next_boundary = max(current + MIN_WORD_DURATION_SECONDS, next_boundary)
        distributed.append(
            {
                "text": word,
                "start": current,
                "end": next_boundary,
            }
        )
        current = next_boundary

    return distributed


def align_transcript_word_groups(
    transcript_words: list[str], recognized_words: list[dict]
) -> tuple[tuple[str, int, int, int, int], ...]:
    transcript_count = len(transcript_words)
    recognized_count = len(recognized_words)
    normalized_lengths = [
        max(len(normalize_alignment_token(word)), 1) for word in transcript_words
    ]

    @lru_cache(maxsize=None)
    def solve(
        transcript_index: int, recognized_index: int
    ) -> tuple[tuple[float, int, int], tuple[tuple[str, int, int, int, int], ...]]:
        if transcript_index >= transcript_count and recognized_index >= recognized_count:
            return (0.0, 0, 0), ()

        best_score = (float("inf"), sys.maxsize, sys.maxsize)
        best_steps: tuple[tuple[str, int, int, int, int], ...] = ()

        if recognized_index < recognized_count:
            next_score, next_steps = solve(transcript_index, recognized_index + 1)
            candidate_score = (
                next_score[0] + ALIGNMENT_SKIP_COST,
                next_score[1] + 1,
                next_score[2],
            )
            if candidate_score < best_score:
                best_score = candidate_score
                best_steps = (
                    ("skip_recognized", transcript_index, transcript_index, recognized_index, recognized_index + 1),
                ) + next_steps

        if transcript_index < transcript_count:
            next_score, next_steps = solve(transcript_index + 1, recognized_index)
            candidate_score = (
                next_score[0] + ALIGNMENT_SKIP_COST,
                next_score[1] + 1,
                next_score[2],
            )
            if candidate_score < best_score:
                best_score = candidate_score
                best_steps = (
                    ("skip_transcript", transcript_index, transcript_index + 1, recognized_index, recognized_index),
                ) + next_steps

        max_transcript_group = min(
            MAX_ALIGNMENT_GROUP_SIZE, transcript_count - transcript_index
        )
        max_recognized_group = min(
            MAX_ALIGNMENT_GROUP_SIZE, recognized_count - recognized_index
        )

        for transcript_group_size in range(1, max_transcript_group + 1):
            transcript_group = transcript_words[
                transcript_index : transcript_index + transcript_group_size
            ]
            matched_weight = sum(
                normalized_lengths[
                    transcript_index : transcript_index + transcript_group_size
                ]
            )

            for recognized_group_size in range(1, max_recognized_group + 1):
                recognized_group = recognized_words[
                    recognized_index : recognized_index + recognized_group_size
                ]
                match_cost = get_group_match_cost(transcript_group, recognized_group)

                if match_cost is None:
                    continue

                next_score, next_steps = solve(
                    transcript_index + transcript_group_size,
                    recognized_index + recognized_group_size,
                )
                candidate_score = (
                    next_score[0] + match_cost,
                    next_score[1],
                    next_score[2] - matched_weight,
                )

                if candidate_score < best_score:
                    best_score = candidate_score
                    best_steps = (
                        (
                            "match",
                            transcript_index,
                            transcript_index + transcript_group_size,
                            recognized_index,
                            recognized_index + recognized_group_size,
                        ),
                    ) + next_steps

        return best_score, best_steps

    _, steps = solve(0, 0)
    return steps


def fill_unmatched_transcript_words(
    transcript_words: list[str],
    aligned_words: list[Optional[dict]],
    duration_seconds: float,
) -> list[dict]:
    resolved_words = list(aligned_words)
    total_duration = max(
        float(duration_seconds),
        MIN_WORD_DURATION_SECONDS * max(len(transcript_words), 1),
    )
    index = 0

    while index < len(transcript_words):
        if resolved_words[index] is not None:
            index += 1
            continue

        gap_start = index
        while index < len(transcript_words) and resolved_words[index] is None:
            index += 1
        gap_end = index

        span_start = 0.0
        if gap_start > 0 and resolved_words[gap_start - 1] is not None:
            span_start = float(resolved_words[gap_start - 1]["end"])

        span_end = total_duration
        if gap_end < len(transcript_words) and resolved_words[gap_end] is not None:
            span_end = float(resolved_words[gap_end]["start"])

        distributed_gap = distribute_words_in_span(
            transcript_words[gap_start:gap_end],
            span_start,
            span_end,
        )
        for offset, word_timing in enumerate(distributed_gap):
            resolved_words[gap_start + offset] = word_timing

    finalized_words: list[dict] = []
    previous_end = 0.0
    for index, word in enumerate(resolved_words):
        if word is None:
            word = {
                "text": transcript_words[index],
                "start": previous_end,
                "end": previous_end + MIN_WORD_DURATION_SECONDS,
            }

        start = max(previous_end, float(word["start"]))
        end = max(start + MIN_WORD_DURATION_SECONDS, float(word["end"]))
        finalized_words.append(
            {
                "text": transcript_words[index],
                "start": start,
                "end": end,
            }
        )
        previous_end = end

    if duration_seconds > 0 and finalized_words:
        final_word = finalized_words[-1]
        final_word["end"] = max(
            final_word["start"] + MIN_WORD_DURATION_SECONDS,
            float(duration_seconds),
        )

    return finalized_words


def align_words(
    transcript_text: str, recognized_words: list[dict], duration_seconds: float
) -> list[dict]:
    transcript_words = split_transcript_words(transcript_text)
    if not transcript_words:
        return []

    if not recognized_words:
        return distribute_words_in_span(
            transcript_words,
            0.0,
            max(duration_seconds, 0.05),
        )

    alignment_steps = align_transcript_word_groups(transcript_words, recognized_words)
    aligned_by_index: list[Optional[dict]] = [None] * len(transcript_words)

    for step_type, transcript_start, transcript_end, recognized_start, recognized_end in alignment_steps:
        if step_type != "match":
            continue

        transcript_group = transcript_words[transcript_start:transcript_end]
        recognized_group = recognized_words[recognized_start:recognized_end]

        if not transcript_group or not recognized_group:
            continue

        if len(transcript_group) == 1 and len(recognized_group) == 1:
            recognized_word = recognized_group[0]
            aligned_by_index[transcript_start] = {
                "text": transcript_group[0],
                "start": float(recognized_word["start"]),
                "end": max(
                    float(recognized_word["end"]),
                    float(recognized_word["start"]) + MIN_WORD_DURATION_SECONDS,
                ),
            }
            continue

        distributed_group = distribute_words_in_span(
            transcript_group,
            float(recognized_group[0]["start"]),
            max(
                float(recognized_group[-1]["end"]),
                float(recognized_group[0]["start"])
                + (MIN_WORD_DURATION_SECONDS * len(transcript_group)),
            ),
        )

        for offset, distributed_word in enumerate(distributed_group):
            aligned_by_index[transcript_start + offset] = distributed_word

    return fill_unmatched_transcript_words(
        transcript_words,
        aligned_by_index,
        duration_seconds,
    )


def seconds_to_srt_time(seconds: float) -> str:
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int(round((seconds - math.floor(seconds)) * 1000))
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def build_srt_content(words: list[dict], offset_seconds: float) -> str:
    lines = []
    for index, word in enumerate(words, start=1):
        start = seconds_to_srt_time(offset_seconds + float(word["start"]))
        end = seconds_to_srt_time(offset_seconds + float(word["end"]))
        lines.append(f"{index}\n{start} --> {end}\n{word['text']}\n")

    return "\n".join(lines) + ("\n" if lines else "")


def ensure_silence_file(work_dir: str, silence_duration_seconds: float) -> str:
    silence_duration_seconds = max(float(silence_duration_seconds), 0.0)
    if silence_duration_seconds <= 0:
        raise ValueError("silence_duration_seconds must be greater than 0")

    silence_duration_ms = max(int(round(silence_duration_seconds * 1000)), 1)
    silence_path = str(Path(work_dir) / f"silence-{silence_duration_ms}ms.mp3")
    if Path(silence_path).exists():
        return silence_path

    run_command(
        [
            "ffmpeg",
            "-y",
            "-f",
            "lavfi",
            "-i",
            "anullsrc=r=32000:cl=mono",
            "-t",
            str(silence_duration_seconds),
            "-q:a",
            "9",
            "-acodec",
            "libmp3lame",
            silence_path,
        ]
    )
    return silence_path


def concatenate_audio_files(
    audio_files: list[dict],
    output_audio_path: str,
    work_dir: str,
    default_silence_duration_seconds: float,
) -> None:
    ensure_parent_dir(output_audio_path)
    concat_list_path = Path(work_dir) / "audio-concat.txt"

    concat_entries: list[str] = []
    for index, audio_file in enumerate(audio_files):
        audio_path = str(audio_file["path"])
        concat_entries.append(f"file '{audio_path}'")

        silence_after_seconds = float(
            audio_file.get(
                "silenceAfterSeconds",
                default_silence_duration_seconds if index < len(audio_files) - 1 else 0,
            )
        )
        if silence_after_seconds > 0:
            silence_path = ensure_silence_file(work_dir, silence_after_seconds)
            concat_entries.append(f"file '{silence_path}'")

    concat_list_path.write_text("\n".join(concat_entries) + "\n")

    run_command(
        [
            "ffmpeg",
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(concat_list_path),
            "-c:a",
            "libmp3lame",
            output_audio_path,
        ]
    )


def process_audio_file(audio_file: dict) -> dict:
    person = str(audio_file["person"])
    index = int(audio_file["index"])
    audio_path = str(audio_file["path"])
    transcript_text = str(audio_file["text"])
    srt_file_name = str(audio_file.get("srtFileName") or f"{person}-{index}.srt")
    silence_after_seconds = float(audio_file.get("silenceAfterSeconds", 0))

    duration_seconds = ffprobe_duration(audio_path)
    recognized_words = transcribe_audio(audio_path)
    aligned_words = align_words(
        transcript_text=transcript_text,
        recognized_words=recognized_words,
        duration_seconds=duration_seconds,
    )

    return {
        "person": person,
        "index": index,
        "path": audio_path,
        "srtFileName": srt_file_name,
        "silenceAfterSeconds": silence_after_seconds,
        "durationSeconds": duration_seconds,
        "alignedWords": aligned_words,
    }


def main() -> None:
    args = parse_args()
    payload = load_payload(args.input_json)
    work_dir = str(payload["workDir"])
    mode = str(payload.get("mode", "full"))
    silence_duration_seconds = float(payload.get("silenceDurationSeconds", 0.2))
    concatenated_audio_path = str(payload.get("outputAudioPath", ""))
    output_srt_dir_value = payload.get("outputSrtDir")
    output_srt_dir = Path(str(output_srt_dir_value)) if output_srt_dir_value else None
    if output_srt_dir is not None:
        output_srt_dir.mkdir(parents=True, exist_ok=True)

    audio_files = payload["audioFiles"]
    log(f"Generating SRTs for {len(audio_files)} clips")

    srt_files = []
    timeline_offset = 0.0
    transcribe_concurrency = resolve_transcribe_concurrency(len(audio_files))
    log(
        f"Transcribing {len(audio_files)} clips with concurrency {transcribe_concurrency}"
    )

    processed_audio_by_order: dict[int, dict] = {}
    with concurrent.futures.ThreadPoolExecutor(
        max_workers=transcribe_concurrency
    ) as executor:
        future_to_order = {
            executor.submit(process_audio_file, audio_file): order
            for order, audio_file in enumerate(audio_files)
        }

        for future in concurrent.futures.as_completed(future_to_order):
            order = future_to_order[future]
            processed_audio_by_order[order] = future.result()

    ordered_processed_audio = [
        processed_audio_by_order[order] for order in range(len(audio_files))
    ]

    if mode == "alignment_only":
        print(
            json.dumps(
                {
                    "ok": True,
                    "audioFiles": ordered_processed_audio,
                }
            )
        )
        return

    for order in range(len(audio_files)):
        processed_audio = processed_audio_by_order[order]
        person = str(processed_audio["person"])
        index = int(processed_audio["index"])
        srt_file_name = str(processed_audio["srtFileName"])
        silence_after_seconds = float(
            processed_audio.get(
                "silenceAfterSeconds",
                silence_duration_seconds if order < len(audio_files) - 1 else 0,
            )
        )
        duration_seconds = float(processed_audio["durationSeconds"])
        aligned_words = processed_audio["alignedWords"]
        srt_content = build_srt_content(aligned_words, timeline_offset)
        if output_srt_dir is None:
            raise RuntimeError("Missing outputSrtDir for full subtitle generation mode")
        srt_path = output_srt_dir / srt_file_name
        srt_path.write_text(srt_content, encoding="utf-8")

        srt_files.append(
            {
                "person": person,
                "index": index,
                "fileName": srt_file_name,
                "path": str(srt_path),
            }
        )
        timeline_offset += duration_seconds
        if order < len(audio_files) - 1:
            timeline_offset += max(silence_after_seconds, 0.0)

    if not concatenated_audio_path:
        raise RuntimeError("Missing outputAudioPath for full subtitle generation mode")

    concatenate_audio_files(
        audio_files=ordered_processed_audio,
        output_audio_path=concatenated_audio_path,
        work_dir=work_dir,
        default_silence_duration_seconds=silence_duration_seconds,
    )

    print(
        json.dumps(
            {
                "ok": True,
                "outputAudioPath": concatenated_audio_path,
                "srtFiles": srt_files,
                "totalDurationSeconds": timeline_offset,
            }
        )
    )


if __name__ == "__main__":
    main()
