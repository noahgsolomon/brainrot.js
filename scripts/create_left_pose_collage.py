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

SPEAKERS = [
    "ANDREW_TATE",
    "BARACK_OBAMA",
    "BEN_SHAPIRO",
    "DONALD_TRUMP",
    "JOE_BIDEN",
    "JOE_ROGAN",
    "JORDAN_PETERSON",
    "KAMALA_HARRIS",
]


def build_collage(input_dir: Path, output_path: Path) -> Path:
    font = ImageFont.load_default()
    sample_image = Image.open(input_dir / EMOTIONS[0] / f"{SPEAKERS[0]}.png").convert(
        "RGBA"
    )
    sample_width, sample_height = sample_image.size

    tile_width = 180
    tile_height = max(180, int(sample_height * (tile_width / sample_width)))
    column_label_height = 28
    row_label_width = 140
    margin = 24
    cell_gap = 12

    canvas_width = (
        margin * 2
        + row_label_width
        + len(SPEAKERS) * tile_width
        + (len(SPEAKERS) - 1) * cell_gap
    )
    canvas_height = (
        margin * 2
        + column_label_height
        + len(EMOTIONS) * tile_height
        + (len(EMOTIONS) - 1) * cell_gap
    )

    collage = Image.new("RGBA", (canvas_width, canvas_height), (248, 248, 248, 255))
    draw = ImageDraw.Draw(collage)

    for column_index, speaker in enumerate(SPEAKERS):
        x = margin + row_label_width + column_index * (tile_width + cell_gap)
        bbox = draw.textbbox((0, 0), speaker, font=font)
        text_width = bbox[2] - bbox[0]
        draw.text(
            (x + (tile_width - text_width) / 2, margin),
            speaker,
            fill=(25, 25, 25, 255),
            font=font,
        )

    for row_index, emotion in enumerate(EMOTIONS):
        y = margin + column_label_height + row_index * (tile_height + cell_gap)
        bbox = draw.textbbox((0, 0), emotion, font=font)
        text_height = bbox[3] - bbox[1]
        draw.text(
            (margin, y + (tile_height - text_height) / 2),
            emotion,
            fill=(25, 25, 25, 255),
            font=font,
        )

        for column_index, speaker in enumerate(SPEAKERS):
            source_path = input_dir / emotion / f"{speaker}.png"
            source_image = Image.open(source_path).convert("RGBA")
            fitted_image = Image.new("RGBA", (tile_width, tile_height), (255, 255, 255, 0))
            resized = source_image.copy()
            resized.thumbnail((tile_width, tile_height), Image.Resampling.LANCZOS)
            offset_x = (tile_width - resized.width) // 2
            offset_y = (tile_height - resized.height) // 2
            fitted_image.alpha_composite(resized, (offset_x, offset_y))

            x = margin + row_label_width + column_index * (tile_width + cell_gap)
            draw.rounded_rectangle(
                (x, y, x + tile_width, y + tile_height),
                radius=14,
                fill=(236, 236, 236, 255),
                outline=(220, 220, 220, 255),
                width=1,
            )
            collage.alpha_composite(fitted_image, (x, y))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    collage.convert("RGB").save(output_path, format="PNG")
    return output_path.resolve()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Build a collage of all standardized left-side pose emotion sprites."
    )
    parser.add_argument(
        "--input-dir",
        default="generate/public/pose/left",
        help="Directory containing left-side emotion pose folders.",
    )
    parser.add_argument(
        "--output",
        default="generate/public/pose/left-emotions-collage.png",
        help="Where to write the collage image.",
    )
    args = parser.parse_args()

    output_path = build_collage(Path(args.input_dir), Path(args.output))
    print(output_path)


if __name__ == "__main__":
    main()
