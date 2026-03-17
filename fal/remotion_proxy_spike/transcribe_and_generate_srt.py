import argparse
import concurrent.futures
import json
import math
import os
import subprocess
import sys
from pathlib import Path
from urllib import request

from fal.toolkit import Audio


WHISPER_URL = "https://fal.run/fal-ai/whisper"
DEFAULT_TRANSCRIBE_CONCURRENCY = 4


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
        check=True,
        capture_output=True,
        text=True,
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


def align_words(
    transcript_text: str, recognized_words: list[dict], duration_seconds: float
) -> list[dict]:
    transcript_words = split_transcript_words(transcript_text)
    if not transcript_words:
        return []

    if recognized_words and len(recognized_words) == len(transcript_words):
        return [
            {
                "text": transcript_words[index],
                "start": float(word["start"]),
                "end": max(float(word["end"]), float(word["start"])),
            }
            for index, word in enumerate(recognized_words)
        ]

    total_duration = max(duration_seconds, 0.05)
    word_duration = total_duration / max(len(transcript_words), 1)
    aligned_words = []

    for index, transcript_word in enumerate(transcript_words):
        start = index * word_duration
        if recognized_words and index < len(recognized_words):
            start = float(recognized_words[index]["start"])

        if index + 1 < len(transcript_words):
            end = (index + 1) * word_duration
            if recognized_words and index + 1 < len(recognized_words):
                end = float(recognized_words[index + 1]["start"])
        else:
            end = total_duration
            if recognized_words:
                end = max(total_duration, float(recognized_words[-1]["end"]))

        aligned_words.append(
            {
                "text": transcript_word,
                "start": start,
                "end": max(start + 0.01, end),
            }
        )

    return aligned_words


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
    silence_path = str(Path(work_dir) / "silence.mp3")
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
    audio_paths: list[str],
    output_audio_path: str,
    work_dir: str,
    silence_duration_seconds: float,
) -> None:
    ensure_parent_dir(output_audio_path)
    silence_path = ensure_silence_file(work_dir, silence_duration_seconds)
    concat_list_path = Path(work_dir) / "audio-concat.txt"

    concat_entries: list[str] = []
    for index, audio_path in enumerate(audio_paths):
        concat_entries.append(f"file '{audio_path}'")
        if index < len(audio_paths) - 1:
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

    ordered_audio_paths = [
        str(processed_audio_by_order[order]["path"]) for order in range(len(audio_files))
    ]

    for order in range(len(audio_files)):
        processed_audio = processed_audio_by_order[order]
        person = str(processed_audio["person"])
        index = int(processed_audio["index"])
        duration_seconds = float(processed_audio["durationSeconds"])
        aligned_words = processed_audio["alignedWords"]
        srt_content = build_srt_content(aligned_words, timeline_offset)
        if output_srt_dir is None:
            raise RuntimeError("Missing outputSrtDir for full subtitle generation mode")
        srt_path = output_srt_dir / f"{person}-{index}.srt"
        srt_path.write_text(srt_content, encoding="utf-8")

        srt_files.append(
            {
                "person": person,
                "index": index,
                "path": str(srt_path),
            }
        )
        timeline_offset += duration_seconds + silence_duration_seconds

    if not concatenated_audio_path:
        raise RuntimeError("Missing outputAudioPath for full subtitle generation mode")

    concatenate_audio_files(
        audio_paths=ordered_audio_paths,
        output_audio_path=concatenated_audio_path,
        work_dir=work_dir,
        silence_duration_seconds=silence_duration_seconds,
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
