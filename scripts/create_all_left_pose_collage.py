#!/usr/bin/env python3

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


EMOTIONS = [
    "angry",
    "confused",
    "deadpan",
    "disgusted",
    "evil_grin",
    "laughing",
    "locked_in",
    "neutral",
    "panic",
    "sad_defeated",
    "shocked",
    "smug",
]


def contain_image(source: Image.Image, tile_width: int, tile_height: int) -> Image.Image:
    fitted = Image.new("RGBA", (tile_width, tile_height), (255, 255, 255, 0))
    resized = source.copy()
    resized.thumbnail((tile_width, tile_height), Image.Resampling.LANCZOS)
    offset_x = (tile_width - resized.width) // 2
    offset_y = (tile_height - resized.height) // 2
    fitted.alpha_composite(resized, (offset_x, offset_y))
    return fitted


def discover_speakers(input_dir: Path) -> list[str]:
    speakers = sorted({path.stem for path in input_dir.glob("*/*.png")})
    if not speakers:
        raise RuntimeError(f"No left-side pose assets found in {input_dir}")
    return speakers


def build_collage(input_dir: Path, output_path: Path) -> Path:
    speakers = discover_speakers(input_dir)
    sample_image_path = next(input_dir.glob(f"{EMOTIONS[0]}/*.png"))
    sample_image = Image.open(sample_image_path).convert("RGBA")
    sample_width, sample_height = sample_image.size

    tile_width = 92
    tile_height = max(92, int(sample_height * (tile_width / sample_width)))
    label_column_width = 190
    header_height = 54
    margin = 24
    gap = 8

    canvas_width = (
        margin * 2
        + label_column_width
        + len(EMOTIONS) * tile_width
        + (len(EMOTIONS) - 1) * gap
    )
    canvas_height = (
        margin * 2
        + header_height
        + len(speakers) * tile_height
        + (len(speakers) - 1) * gap
    )

    collage = Image.new("RGBA", (canvas_width, canvas_height), (246, 246, 246, 255))
    draw = ImageDraw.Draw(collage)
    font = ImageFont.load_default()

    title = f"All Left Pose Assets ({len(speakers)} speakers x {len(EMOTIONS)} emotions)"
    draw.text((margin, margin), title, fill=(24, 24, 24, 255), font=font)

    for emotion_index, emotion in enumerate(EMOTIONS):
        x = margin + label_column_width + emotion_index * (tile_width + gap)
        bbox = draw.textbbox((0, 0), emotion, font=font)
        text_width = bbox[2] - bbox[0]
        draw.text(
            (x + (tile_width - text_width) / 2, margin + 22),
            emotion,
            fill=(70, 70, 70, 255),
            font=font,
        )

    for speaker_index, speaker in enumerate(speakers):
        y = margin + header_height + speaker_index * (tile_height + gap)
        bbox = draw.textbbox((0, 0), speaker, font=font)
        text_height = bbox[3] - bbox[1]
        draw.text(
            (margin, y + (tile_height - text_height) / 2),
            speaker,
            fill=(30, 30, 30, 255),
            font=font,
        )

        for emotion_index, emotion in enumerate(EMOTIONS):
            x = margin + label_column_width + emotion_index * (tile_width + gap)
            draw.rounded_rectangle(
                (x, y, x + tile_width, y + tile_height),
                radius=12,
                fill=(235, 235, 235, 255),
                outline=(220, 220, 220, 255),
                width=1,
            )

            source_path = input_dir / emotion / f"{speaker}.png"
            if source_path.exists():
                source_image = Image.open(source_path).convert("RGBA")
                collage.alpha_composite(contain_image(source_image, tile_width, tile_height), (x, y))
                continue

            missing_text = "missing"
            missing_box = draw.textbbox((0, 0), missing_text, font=font)
            missing_width = missing_box[2] - missing_box[0]
            missing_height = missing_box[3] - missing_box[1]
            draw.text(
                (x + (tile_width - missing_width) / 2, y + (tile_height - missing_height) / 2),
                missing_text,
                fill=(150, 70, 70, 255),
                font=font,
            )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    collage.convert("RGB").save(output_path, format="PNG")
    return output_path.resolve()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Build a collage of every left-side pose asset currently on disk.",
    )
    parser.add_argument(
        "--input-dir",
        default="generate/public/pose/left",
        help="Directory containing left-side pose emotion folders.",
    )
    parser.add_argument(
        "--output",
        default="generate/public/pose/all-left-pose-collage.png",
        help="Where to write the collage PNG.",
    )
    args = parser.parse_args()

    output_path = build_collage(Path(args.input_dir), Path(args.output))
    print(output_path)


if __name__ == "__main__":
    main()
