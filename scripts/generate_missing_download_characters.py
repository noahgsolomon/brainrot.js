#!/usr/bin/env python3
"""Generate full emotion packs for new characters found in ~/Downloads/output.

This pipeline:
1. Scans ~/Downloads/output/*/final for source character images.
2. Skips the built-in 8 speakers and any character that already has a full pose pack.
3. Generates all 12 emotions with fal Nano Banana 2 Edit.
4. Runs fal BRIA background removal for each generated image.
5. Writes the finished assets directly into generate/public/pose/{left,right}/{emotion}/.
6. Optionally writes root-level neutral fallbacks into generate/public/pose/{left,right}/.

It avoids storing raw generation artifacts in the repo.
"""

from __future__ import annotations

import argparse
import json
import math
import re
import tempfile
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from PIL import Image

from generate_nano_banana_emotions import (
    BG_REMOVE_MODEL_ID,
    EMOTION_DESCRIPTIONS,
    MODEL_ID,
    SPEAKER_IDS,
    build_prompt,
    download_file,
    ensure_fal_key_present,
    make_request_arguments,
    subscribe_with_logs,
    upload_reference_images,
)


DEFAULT_OUTPUT_ROOT = Path.home() / "Downloads" / "output"
DEFAULT_POSE_DIR = Path("generate/public/pose")
DEFAULT_MANIFEST_PATH = Path("generate/public/pose/custom-character-manifest.json")
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate 12-emotion pose packs for missing characters from ~/Downloads/output.",
    )
    parser.add_argument(
        "--output-root",
        type=Path,
        default=DEFAULT_OUTPUT_ROOT,
        help=f"Root containing character folders with final images. Default: {DEFAULT_OUTPUT_ROOT}",
    )
    parser.add_argument(
        "--pose-dir",
        type=Path,
        default=DEFAULT_POSE_DIR,
        help=f"Standardized pose output directory. Default: {DEFAULT_POSE_DIR}",
    )
    parser.add_argument(
        "--manifest",
        type=Path,
        default=DEFAULT_MANIFEST_PATH,
        help=f"Manifest file describing generated custom characters. Default: {DEFAULT_MANIFEST_PATH}",
    )
    parser.add_argument(
        "--character-name",
        action="append",
        help="Only process this display name from ~/Downloads/output. Repeat for multiple names.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        help="Only process the first N missing characters after filtering.",
    )
    parser.add_argument(
        "--background-color",
        default="flat medium gray",
        help="Background color instruction sent to the edit model. Default: flat medium gray",
    )
    parser.add_argument(
        "--prompt-suffix",
        default="",
        help="Extra prompt text appended to every emotion generation prompt.",
    )
    parser.add_argument(
        "--num-images",
        type=int,
        default=1,
        help="Number of images to request per emotion. Default: 1",
    )
    parser.add_argument(
        "--aspect-ratio",
        default="auto",
        choices=[
            "auto",
            "21:9",
            "16:9",
            "3:2",
            "4:3",
            "5:4",
            "1:1",
            "4:5",
            "3:4",
            "2:3",
            "9:16",
            "4:1",
            "1:4",
            "8:1",
            "1:8",
        ],
        help="Aspect ratio sent to fal. Default: auto",
    )
    parser.add_argument(
        "--output-format",
        default="png",
        choices=["png", "jpeg", "webp"],
        help="Output format sent to fal. Default: png",
    )
    parser.add_argument(
        "--resolution",
        default="1K",
        choices=["0.5K", "1K", "2K", "4K"],
        help="Resolution sent to fal. Default: 1K",
    )
    parser.add_argument(
        "--safety-tolerance",
        default="4",
        choices=["1", "2", "3", "4", "5", "6"],
        help="Safety tolerance sent to fal. Default: 4",
    )
    parser.add_argument(
        "--thinking-level",
        choices=["minimal", "high"],
        help="Optional thinking level for the model.",
    )
    parser.add_argument(
        "--seed",
        type=int,
        help="Optional seed.",
    )
    parser.add_argument(
        "--max-concurrency",
        type=int,
        default=12,
        help="Maximum number of emotion jobs to run in parallel. Default: 12",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Regenerate even if the full pose pack already exists.",
    )
    parser.add_argument(
        "--write-root-neutral",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Also write root-level neutral fallback sprites. Default: enabled",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print the planned characters and job count without calling fal.",
    )
    return parser.parse_args()


def normalize_character_id(display_name: str) -> str:
    collapsed = re.sub(r"[^A-Za-z0-9]+", "_", display_name.strip()).strip("_")
    collapsed = re.sub(r"_+", "_", collapsed)
    if not collapsed:
        raise ValueError(f"Could not normalize character name: {display_name!r}")
    return collapsed.upper()


def find_first_final_image(character_dir: Path) -> Path | None:
    final_dir = character_dir / "final"
    if not final_dir.is_dir():
        return None

    image_files = sorted(
        [
            path
            for path in final_dir.iterdir()
            if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
        ],
        key=lambda path: path.name.lower(),
    )
    return image_files[0] if image_files else None


def discover_missing_characters(
    output_root: Path,
    pose_dir: Path,
    names_filter: set[str],
    overwrite: bool,
) -> list[dict[str, str | Path]]:
    if not output_root.is_dir():
        raise FileNotFoundError(f"Output root does not exist: {output_root}")

    discovered: list[dict[str, str | Path]] = []
    built_in_ids = set(SPEAKER_IDS)

    for character_dir in sorted(
        [path for path in output_root.iterdir() if path.is_dir()],
        key=lambda path: path.name.lower(),
    ):
        display_name = character_dir.name
        if names_filter and display_name not in names_filter:
            continue

        speaker_id = normalize_character_id(display_name)
        if speaker_id in built_in_ids:
            continue

        source_image = find_first_final_image(character_dir)
        if source_image is None:
            continue

        emotion_ids = list(EMOTION_DESCRIPTIONS.keys())
        if overwrite:
            missing_emotions = emotion_ids
        else:
            missing_emotions = missing_emotions_for_speaker(pose_dir, speaker_id, emotion_ids)

        if not missing_emotions:
            continue

        discovered.append(
            {
                "display_name": display_name,
                "speaker_id": speaker_id,
                "source_image": source_image,
                "missing_emotions": missing_emotions,
            }
        )

    return discovered


def pose_pack_exists(pose_dir: Path, speaker_id: str) -> bool:
    return all(
        (pose_dir / "left" / emotion / f"{speaker_id}.png").exists()
        and (pose_dir / "right" / emotion / f"{speaker_id}.png").exists()
        for emotion in EMOTION_DESCRIPTIONS
    )


def missing_emotions_for_speaker(
    pose_dir: Path,
    speaker_id: str,
    emotion_ids: list[str],
) -> list[str]:
    missing: list[str] = []
    for emotion in emotion_ids:
        left_path, right_path = build_pose_paths(pose_dir, speaker_id, emotion)
        if left_path.exists() and right_path.exists():
            continue
        missing.append(emotion)
    return missing


def save_pose_pair(source_path: Path, left_path: Path, right_path: Path) -> None:
    left_path.parent.mkdir(parents=True, exist_ok=True)
    right_path.parent.mkdir(parents=True, exist_ok=True)

    with Image.open(source_path) as image:
        rgba = image.convert("RGBA")
        rgba.save(left_path)
        mirrored = rgba.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        mirrored.save(right_path)


def build_pose_paths(
    pose_dir: Path,
    speaker_id: str,
    emotion: str,
) -> tuple[Path, Path]:
    left_path = pose_dir / "left" / emotion / f"{speaker_id}.png"
    right_path = pose_dir / "right" / emotion / f"{speaker_id}.png"
    return left_path, right_path


def build_root_neutral_paths(pose_dir: Path, speaker_id: str) -> tuple[Path, Path]:
    left_path = pose_dir / "left" / f"{speaker_id}.png"
    right_path = pose_dir / "right" / f"{speaker_id}.png"
    return left_path, right_path


def generate_single_emotion(
    character: dict[str, str | Path],
    emotion: str,
    uploaded_reference_urls: list[str],
    args: argparse.Namespace,
    work_dir: Path,
) -> Path:
    speaker_id = str(character["speaker_id"])
    prompt = build_prompt(
        emotion,
        background_color=args.background_color,
        prompt_suffix=args.prompt_suffix,
    )
    request_arguments = make_request_arguments(prompt, uploaded_reference_urls, args)

    log_prefix = f"[{speaker_id}/{emotion}]"
    print(f"{log_prefix} submitting")
    generation_result = subscribe_with_logs(MODEL_ID, request_arguments, log_prefix=log_prefix)
    images = generation_result.get("images", [])
    if not isinstance(images, list) or not images:
        raise RuntimeError(f"{log_prefix} did not return any generated images")

    first_image = images[0]
    if not isinstance(first_image, dict):
        raise RuntimeError(f"{log_prefix} returned an invalid image payload")

    generated_url = first_image.get("url")
    if not isinstance(generated_url, str) or not generated_url:
        raise RuntimeError(f"{log_prefix} did not return a downloadable image URL")

    temp_generated_path = work_dir / speaker_id / emotion / "generated.png"
    download_file(generated_url, temp_generated_path)

    bg_result = subscribe_with_logs(
        BG_REMOVE_MODEL_ID,
        {"image_url": generated_url},
        log_prefix=f"[{speaker_id}/{emotion}/bg]",
    )
    bg_image = bg_result.get("image")
    if not isinstance(bg_image, dict):
        raise RuntimeError(f"[{speaker_id}/{emotion}/bg] missing image payload")

    cutout_url = bg_image.get("url")
    if not isinstance(cutout_url, str) or not cutout_url:
        raise RuntimeError(f"[{speaker_id}/{emotion}/bg] missing downloadable image URL")

    temp_cutout_path = work_dir / speaker_id / emotion / "cutout.png"
    download_file(cutout_url, temp_cutout_path)
    return temp_cutout_path


def write_manifest(manifest_path: Path, characters: list[dict[str, str | Path]]) -> None:
    manifest_payload = [
        {
            "display_name": str(character["display_name"]),
            "speaker_id": str(character["speaker_id"]),
            "source_image": str(character["source_image"]),
        }
        for character in characters
    ]
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(manifest_payload, indent=2), encoding="utf-8")


def main() -> None:
    args = parse_args()
    if args.max_concurrency < 1:
        raise SystemExit("--max-concurrency must be at least 1.")

    names_filter = set(args.character_name or [])
    characters = discover_missing_characters(
        output_root=args.output_root,
        pose_dir=args.pose_dir,
        names_filter=names_filter,
        overwrite=args.overwrite,
    )

    if args.limit is not None:
        characters = characters[: args.limit]

    planned_jobs = sum(len(character["missing_emotions"]) for character in characters)

    print(f"Missing characters found: {len(characters)}")
    print(f"Planned emotion jobs: {planned_jobs}")

    for character in characters:
        print(
            f"- {character['display_name']} -> {character['speaker_id']} "
            f"({character['source_image']}) "
            f"[missing: {', '.join(character['missing_emotions'])}]"
        )

    if not characters:
        print("No new characters to process.")
        return

    write_manifest(args.manifest, characters)
    print(f"Manifest written to: {args.manifest.resolve()}")

    if args.dry_run:
        return

    ensure_fal_key_present()

    uploaded_reference_urls_by_speaker: dict[str, list[str]] = {}
    for character in characters:
        speaker_id = str(character["speaker_id"])
        source_image = Path(character["source_image"])
        uploaded_reference_urls_by_speaker[speaker_id] = upload_reference_images([source_image])

    jobs: list[tuple[dict[str, str | Path], str]] = [
        (character, emotion)
        for character in characters
        for emotion in character["missing_emotions"]
    ]
    max_workers = min(args.max_concurrency, max(1, len(jobs)))
    print(f"Running up to {max_workers} job(s) in parallel")

    with tempfile.TemporaryDirectory(prefix="brainrot-custom-emotions-") as temp_dir_name:
        work_dir = Path(temp_dir_name)
        neutral_paths: dict[str, Path] = {}

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {
                executor.submit(
                    generate_single_emotion,
                    character,
                    emotion,
                    uploaded_reference_urls_by_speaker[str(character["speaker_id"])],
                    args,
                    work_dir,
                ): (character, emotion)
                for character, emotion in jobs
            }

            for future in as_completed(futures):
                character, emotion = futures[future]
                speaker_id = str(character["speaker_id"])
                try:
                    cutout_path = future.result()
                except Exception as exc:
                    print(f"[{speaker_id}/{emotion}] failed: {exc}")
                    continue

                left_path, right_path = build_pose_paths(args.pose_dir, speaker_id, emotion)
                save_pose_pair(cutout_path, left_path, right_path)
                print(f"[{speaker_id}/{emotion}] saved {left_path}")
                print(f"[{speaker_id}/{emotion}] saved {right_path}")

                if emotion == "neutral":
                    neutral_paths[speaker_id] = cutout_path

        if args.write_root_neutral:
            for character in characters:
                speaker_id = str(character["speaker_id"])
                neutral_path = neutral_paths.get(speaker_id)
                if neutral_path is None:
                    continue
                left_root_path, right_root_path = build_root_neutral_paths(args.pose_dir, speaker_id)
                save_pose_pair(neutral_path, left_root_path, right_root_path)
                print(f"[{speaker_id}/neutral-root] saved {left_root_path}")
                print(f"[{speaker_id}/neutral-root] saved {right_root_path}")


if __name__ == "__main__":
    main()
