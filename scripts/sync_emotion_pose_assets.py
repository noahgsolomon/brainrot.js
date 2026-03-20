#!/usr/bin/env python3
"""Sync generated emotion cutouts into a standardized left/right pose tree.

Source:
  generate/public/emotions_cutout/{speaker}/{emotion}/{speaker}__{emotion}__01.png

Outputs:
  generate/public/pose/left/{emotion}/{speaker}.png
  generate/public/pose/right/{emotion}/{speaker}.png

The right-side asset is a mirrored copy of the left-side cutout.
Existing root-level neutral fallback files in generate/public/pose/{left,right}
are left untouched.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


DEFAULT_SOURCE_DIR = Path("generate/public/emotions_cutout")
DEFAULT_POSE_DIR = Path("generate/public/pose")
IMAGE_EXTENSION = ".png"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Sync emotion cutouts into standardized left/right pose folders.",
    )
    parser.add_argument(
        "--source-dir",
        type=Path,
        default=DEFAULT_SOURCE_DIR,
        help=f"Emotion cutout source directory. Default: {DEFAULT_SOURCE_DIR}",
    )
    parser.add_argument(
        "--pose-dir",
        type=Path,
        default=DEFAULT_POSE_DIR,
        help=f"Pose output directory. Default: {DEFAULT_POSE_DIR}",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Overwrite existing standardized pose assets.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print planned output paths without writing files.",
    )
    return parser.parse_args()


def discover_source_images(source_dir: Path) -> list[Path]:
    if not source_dir.exists():
        raise FileNotFoundError(f"Source directory does not exist: {source_dir}")

    images: list[Path] = []
    for path in sorted(source_dir.rglob(f"*{IMAGE_EXTENSION}")):
        if not path.is_file():
            continue
        images.append(path)
    return images


def parse_source_path(source_dir: Path, source_path: Path) -> tuple[str, str]:
    relative = source_path.relative_to(source_dir)
    parts = relative.parts
    if len(parts) < 3:
        raise ValueError(f"Unexpected source path layout: {source_path}")

    speaker = parts[0]
    emotion = parts[1]
    return speaker, emotion


def build_output_paths(
    pose_dir: Path,
    speaker: str,
    emotion: str,
) -> tuple[Path, Path]:
    left_path = pose_dir / "left" / emotion / f"{speaker}.png"
    right_path = pose_dir / "right" / emotion / f"{speaker}.png"
    return left_path, right_path


def write_left_and_right(
    source_path: Path,
    left_path: Path,
    right_path: Path,
) -> None:
    left_path.parent.mkdir(parents=True, exist_ok=True)
    right_path.parent.mkdir(parents=True, exist_ok=True)

    with Image.open(source_path) as source_image:
        source_rgba = source_image.convert("RGBA")
        source_rgba.save(left_path)

        mirrored = source_rgba.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        mirrored.save(right_path)


def main() -> None:
    args = parse_args()
    source_images = discover_source_images(args.source_dir)

    planned: list[tuple[Path, Path, Path]] = []
    for source_path in source_images:
        speaker, emotion = parse_source_path(args.source_dir, source_path)
        left_path, right_path = build_output_paths(args.pose_dir, speaker, emotion)

        if not args.overwrite and left_path.exists() and right_path.exists():
            continue

        planned.append((source_path, left_path, right_path))

    print(f"Planned syncs: {len(planned)}")
    if not planned:
        print("No pose assets to sync.")
        return

    for source_path, left_path, right_path in planned:
        print(f"{source_path} -> {left_path}")
        print(f"{source_path} -> {right_path}")
        if args.dry_run:
            continue
        write_left_and_right(source_path, left_path, right_path)


if __name__ == "__main__":
    main()
