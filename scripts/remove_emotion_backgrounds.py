#!/usr/bin/env python3
"""Batch background removal for generated emotion sprites using fal BRIA.

Examples:
  python3 scripts/remove_emotion_backgrounds.py

  python3 scripts/remove_emotion_backgrounds.py \
    --speaker JOE_BIDEN \
    --emotion smug

  python3 scripts/remove_emotion_backgrounds.py \
    --exclude-speaker JORDAN_PETERSON \
    --max-concurrency 8
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from types import ModuleType
from urllib.request import urlopen


MODEL_ID = "fal-ai/bria/background/remove"
DEFAULT_INPUT_DIR = Path("generate/public/emotions")
DEFAULT_OUTPUT_DIR = Path("generate/public/emotions_cutout")
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}

SPEAKER_IDS = (
    "JORDAN_PETERSON",
    "BEN_SHAPIRO",
    "JOE_ROGAN",
    "BARACK_OBAMA",
    "DONALD_TRUMP",
    "JOE_BIDEN",
    "ANDREW_TATE",
    "KAMALA_HARRIS",
)

EMOTION_IDS = (
    "neutral",
    "smug",
    "angry",
    "shocked",
    "confused",
    "laughing",
    "deadpan",
    "panic",
    "sad_defeated",
    "locked_in",
    "disgusted",
    "evil_grin",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Remove backgrounds from generated emotion sprites via fal BRIA.",
    )
    parser.add_argument(
        "--input-dir",
        type=Path,
        default=DEFAULT_INPUT_DIR,
        help=f"Directory containing generated emotion sprites. Default: {DEFAULT_INPUT_DIR}",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help=f"Directory where cutout sprites will be written. Default: {DEFAULT_OUTPUT_DIR}",
    )
    parser.add_argument(
        "--speaker",
        action="append",
        choices=SPEAKER_IDS,
        help="Only process this speaker. Repeat for multiple speakers.",
    )
    parser.add_argument(
        "--exclude-speaker",
        action="append",
        choices=SPEAKER_IDS,
        help="Skip this speaker. Repeat for multiple speakers.",
    )
    parser.add_argument(
        "--emotion",
        action="append",
        choices=EMOTION_IDS,
        help="Only process this emotion. Repeat for multiple emotions.",
    )
    parser.add_argument(
        "--exclude-emotion",
        action="append",
        choices=EMOTION_IDS,
        help="Skip this emotion. Repeat for multiple emotions.",
    )
    parser.add_argument(
        "--max-concurrency",
        type=int,
        default=8,
        help="Maximum number of fal jobs to run at once. Default: 8",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Overwrite existing cutouts instead of skipping them.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print the files that would be processed without calling fal.",
    )
    return parser.parse_args()


def ensure_fal_key_present() -> None:
    if os.getenv("FAL_KEY"):
        return

    print("FAL_KEY is not set. Export it before running this script.", file=sys.stderr)
    raise SystemExit(1)


def load_fal_client() -> ModuleType:
    try:
        import fal_client  # type: ignore
    except ModuleNotFoundError as exc:
        print(
            "fal_client is not installed. Run `pip install fal-client` before "
            "submitting jobs to fal.",
            file=sys.stderr,
        )
        raise SystemExit(1) from exc

    return fal_client


def download_file(url: str, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with urlopen(url) as response:
        destination.write_bytes(response.read())


def discover_input_images(input_dir: Path, output_dir: Path) -> list[Path]:
    if not input_dir.exists():
        raise FileNotFoundError(f"Input directory does not exist: {input_dir}")

    images: list[Path] = []
    for path in sorted(input_dir.rglob("*")):
        if not path.is_file():
            continue
        if path.suffix.lower() not in IMAGE_EXTENSIONS:
            continue
        if output_dir in path.parents:
            continue
        images.append(path)

    return images


def extract_speaker_and_emotion(relative_path: Path) -> tuple[str | None, str | None]:
    parts = relative_path.parts
    speaker = parts[0] if len(parts) >= 1 else None
    emotion = parts[1] if len(parts) >= 2 else None
    return speaker, emotion


def should_include_file(
    relative_path: Path,
    include_speakers: set[str],
    exclude_speakers: set[str],
    include_emotions: set[str],
    exclude_emotions: set[str],
) -> bool:
    speaker, emotion = extract_speaker_and_emotion(relative_path)

    if include_speakers and speaker not in include_speakers:
        return False
    if speaker in exclude_speakers:
        return False

    if include_emotions and emotion not in include_emotions:
        return False
    if emotion in exclude_emotions:
        return False

    return True


def build_output_paths(
    input_path: Path,
    input_dir: Path,
    output_dir: Path,
) -> tuple[Path, Path]:
    relative_path = input_path.relative_to(input_dir)
    output_image_path = output_dir / relative_path
    metadata_path = output_image_path.with_suffix(".bg_remove.json")
    return output_image_path, metadata_path


def upload_source_image(input_path: Path) -> str:
    fal_client = load_fal_client()
    print(f"Uploading source: {input_path}")
    return fal_client.upload_file(str(input_path))


def subscribe_with_logs(
    input_url: str,
    log_prefix: str = "",
) -> dict[str, object]:
    fal_client = load_fal_client()

    def on_queue_update(update: object) -> None:
        if isinstance(update, fal_client.InProgress):
            for log in update.logs:
                message = log.get("message")
                if message:
                    prefix = f"{log_prefix} " if log_prefix else ""
                    print(f"{prefix}{message}")

    result = fal_client.subscribe(
        MODEL_ID,
        arguments={"image_url": input_url},
        with_logs=True,
        on_queue_update=on_queue_update,
    )

    if not isinstance(result, dict):
        raise TypeError(f"Unexpected fal response type: {type(result)!r}")

    return result


def save_result_bundle(
    input_path: Path,
    output_image_path: Path,
    metadata_path: Path,
    result: dict[str, object],
) -> Path:
    image = result.get("image")
    if not isinstance(image, dict):
        raise ValueError("fal response did not include an `image` object.")

    image_url = image.get("url")
    if not isinstance(image_url, str) or not image_url:
        raise ValueError("fal response did not include a downloadable image URL.")

    download_file(image_url, output_image_path)

    metadata_path.parent.mkdir(parents=True, exist_ok=True)
    metadata_payload = {
        "input_path": str(input_path),
        "output_path": str(output_image_path),
        "result": result,
    }
    metadata_path.write_text(json.dumps(metadata_payload, indent=2), encoding="utf-8")

    return output_image_path


def run_single_job(
    input_path: Path,
    input_dir: Path,
    output_dir: Path,
) -> Path:
    relative_path = input_path.relative_to(input_dir)
    output_image_path, metadata_path = build_output_paths(input_path, input_dir, output_dir)
    log_prefix = f"[{relative_path}]"
    print(f"{log_prefix} submitting")
    input_url = upload_source_image(input_path)
    result = subscribe_with_logs(input_url, log_prefix=log_prefix)
    return save_result_bundle(input_path, output_image_path, metadata_path, result)


def main() -> None:
    args = parse_args()
    if args.max_concurrency < 1:
        raise SystemExit("--max-concurrency must be at least 1.")

    if not args.dry_run:
        ensure_fal_key_present()

    include_speakers = set(args.speaker or [])
    exclude_speakers = set(args.exclude_speaker or [])
    include_emotions = set(args.emotion or [])
    exclude_emotions = set(args.exclude_emotion or [])

    discovered_images = discover_input_images(args.input_dir, args.output_dir)
    planned_inputs: list[Path] = []

    for input_path in discovered_images:
        relative_path = input_path.relative_to(args.input_dir)
        if not should_include_file(
            relative_path,
            include_speakers,
            exclude_speakers,
            include_emotions,
            exclude_emotions,
        ):
            continue

        output_image_path, metadata_path = build_output_paths(
            input_path,
            args.input_dir,
            args.output_dir,
        )
        if output_image_path.exists() and metadata_path.exists() and not args.overwrite:
            print(f"Skipping {relative_path}: cutout already exists")
            continue

        planned_inputs.append(input_path)

    print(f"Planned jobs: {len(planned_inputs)}")
    if not planned_inputs:
        print("No jobs to run.")
        return

    if args.dry_run:
        for input_path in planned_inputs:
            relative_path = input_path.relative_to(args.input_dir)
            output_image_path, _ = build_output_paths(input_path, args.input_dir, args.output_dir)
            print(f"{relative_path} -> {output_image_path}")
        return

    max_workers = min(args.max_concurrency, len(planned_inputs))
    print(f"Running up to {max_workers} job(s) in parallel")

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {
            executor.submit(run_single_job, input_path, args.input_dir, args.output_dir): input_path
            for input_path in planned_inputs
        }

        for future in as_completed(futures):
            input_path = futures[future]
            relative_path = input_path.relative_to(args.input_dir)
            try:
                output_path = future.result()
            except Exception as exc:
                print(f"[{relative_path}] failed: {exc}", file=sys.stderr)
                continue

            print(f"[{relative_path}] saved {output_path}")


if __name__ == "__main__":
    main()
