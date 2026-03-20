#!/usr/bin/env python3

from __future__ import annotations

import argparse
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


DEFAULT_SPEAKERS = [
    "ANDREW_TATE",
    "BARACK_OBAMA",
    "BEN_SHAPIRO",
    "DONALD_TRUMP",
    "JOE_BIDEN",
    "JOE_ROGAN",
    "JORDAN_PETERSON",
    "KAMALA_HARRIS",
]

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}


def find_ai_tiles(output_root: Path) -> list[tuple[str, Path]]:
    tiles: list[tuple[str, Path]] = []

    for character_dir in sorted(
        [path for path in output_root.iterdir() if path.is_dir()],
        key=lambda path: path.name.lower(),
    ):
        final_dir = character_dir / "final"
        if not final_dir.is_dir():
            continue

        image_files = sorted(
            [
                path
                for path in final_dir.iterdir()
                if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
            ],
            key=lambda path: path.name.lower(),
        )
        if not image_files:
            continue

        tiles.append((character_dir.name, image_files[0]))

    return tiles


def contain_image(source: Image.Image, tile_width: int, tile_height: int) -> Image.Image:
    fitted = Image.new("RGBA", (tile_width, tile_height), (255, 255, 255, 0))
    resized = source.copy()
    resized.thumbnail((tile_width, tile_height), Image.Resampling.LANCZOS)
    offset_x = (tile_width - resized.width) // 2
    offset_y = (tile_height - resized.height) // 2
    fitted.alpha_composite(resized, (offset_x, offset_y))
    return fitted


def draw_ai_badge(draw: ImageDraw.ImageDraw, x: int, y: int, font: ImageFont.ImageFont) -> None:
    badge_text = "AI"
    text_box = draw.textbbox((0, 0), badge_text, font=font)
    text_width = text_box[2] - text_box[0]
    text_height = text_box[3] - text_box[1]
    badge_width = text_width + 18
    badge_height = text_height + 10
    badge_x = x - badge_width - 10
    badge_y = y + 10

    draw.rounded_rectangle(
        (badge_x, badge_y, badge_x + badge_width, badge_y + badge_height),
        radius=10,
        fill=(28, 28, 28, 235),
    )
    draw.text(
        (badge_x + 9, badge_y + 5),
        badge_text,
        fill=(255, 255, 255, 255),
        font=font,
    )


def build_collage(default_dir: Path, output_root: Path, output_path: Path) -> Path:
    default_tiles = [
        (speaker.replace("_", " ").title(), default_dir / f"{speaker}.png")
        for speaker in DEFAULT_SPEAKERS
    ]
    ai_tiles = find_ai_tiles(output_root)

    tiles = [
        {"label": label, "path": path, "is_ai": False}
        for label, path in default_tiles
    ] + [
        {"label": label, "path": path, "is_ai": True}
        for label, path in ai_tiles
    ]

    if not tiles:
        raise RuntimeError("No images found to build the collage")

    sample = Image.open(tiles[0]["path"]).convert("RGBA")
    sample_width, sample_height = sample.size

    columns = 8
    rows = math.ceil(len(tiles) / columns)
    tile_width = 180
    tile_height = max(180, int(sample_height * (tile_width / sample_width)))
    label_height = 36
    title_height = 46
    margin = 24
    gap = 12

    canvas_width = margin * 2 + columns * tile_width + (columns - 1) * gap
    canvas_height = (
        margin * 2
        + title_height
        + rows * (tile_height + label_height)
        + (rows - 1) * gap
    )
    collage = Image.new("RGBA", (canvas_width, canvas_height), (246, 246, 246, 255))
    draw = ImageDraw.Draw(collage)
    font = ImageFont.load_default()

    title = "Default Cast + AI Character Output"
    subtitle = "Top row: default characters   |   AI badge: imported from ~/Downloads/output"
    draw.text((margin, margin), title, fill=(22, 22, 22, 255), font=font)
    draw.text((margin, margin + 20), subtitle, fill=(90, 90, 90, 255), font=font)

    for index, tile in enumerate(tiles):
        row = index // columns
        column = index % columns
        x = margin + column * (tile_width + gap)
        y = margin + title_height + row * (tile_height + label_height + gap)

        draw.rounded_rectangle(
            (x, y, x + tile_width, y + tile_height),
            radius=14,
            fill=(235, 235, 235, 255),
            outline=(220, 220, 220, 255),
            width=1,
        )

        source = Image.open(tile["path"]).convert("RGBA")
        collage.alpha_composite(contain_image(source, tile_width, tile_height), (x, y))

        label_box = draw.textbbox((0, 0), tile["label"], font=font)
        label_width = label_box[2] - label_box[0]
        draw.text(
            (x + (tile_width - label_width) / 2, y + tile_height + 10),
            tile["label"],
            fill=(30, 30, 30, 255),
            font=font,
        )

        if tile["is_ai"]:
            draw_ai_badge(draw, x + tile_width, y, font)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    collage.convert("RGB").save(output_path, format="PNG")
    return output_path.resolve()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Build a collage from default left-side characters and ~/Downloads/output/final renders."
    )
    parser.add_argument(
        "--default-dir",
        default="generate/public/pose/left/neutral",
        help="Directory for the 8 default character sprites.",
    )
    parser.add_argument(
        "--output-root",
        default=str(Path.home() / "Downloads" / "output"),
        help="Root directory containing arbitrary character folders with final outputs.",
    )
    parser.add_argument(
        "--output",
        default="generate/public/pose/default-and-ai-collage.png",
        help="Where to write the collage PNG.",
    )
    args = parser.parse_args()

    output_path = build_collage(
        default_dir=Path(args.default_dir),
        output_root=Path(args.output_root),
        output_path=Path(args.output),
    )
    print(output_path)


if __name__ == "__main__":
    main()
