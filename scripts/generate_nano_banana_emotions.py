#!/usr/bin/env python3
"""Generate emotion variants for brainrot speaker sprites using fal Nano Banana 2 Edit.

Examples:
  python3 scripts/generate_nano_banana_emotions.py \
    --speaker JOE_BIDEN \
    --emotion smug

  python3 scripts/generate_nano_banana_emotions.py \
    --all-speakers \
    --all-emotions \
    --include-pose-references
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from types import ModuleType
from typing import Iterable
from urllib.request import urlopen

MODEL_ID = "fal-ai/nano-banana-2/edit"
BG_REMOVE_MODEL_ID = "fal-ai/bria/background/remove"
DEFAULT_SOURCE_DIR = Path("public/img")
DEFAULT_OUTPUT_DIR = Path("generate/public/emotions")
DEFAULT_CUTOUT_OUTPUT_DIR = Path("generate/public/emotions_cutout")
DEFAULT_POSE_DIR = Path("generate/public/pose")
DEFAULT_IMAGE_EXTENSIONS = (".png", ".webp", ".jpg", ".jpeg")

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

EMOTION_DESCRIPTIONS: dict[str, str] = {
    "neutral": "relaxed face, normal talking expression, calm eyes, natural mouth",
    "smug": "slight grin, one eyebrow raised, self-satisfied expression, subtle 'I won' energy",
    "angry": "furrowed brows, tense eyes, open shouting mouth, visibly irritated",
    "shocked": "wide eyes, raised brows, open mouth, stunned disbelief",
    "confused": "squinting eyes, uneven brows, puzzled expression, slight head tilt",
    "laughing": "big grin or laughing mouth, eyes squeezed or bright, visibly losing composure",
    "deadpan": "blank stare, flat mouth, zero emotional reaction, completely unimpressed",
    "panic": "alarmed eyes, stressed expression, overwhelmed energy, visibly anxious",
    "sad_defeated": "slumped or softened expression, downturned mouth, tired defeated look",
    "locked_in": "intense focused eyes, serious face, high concentration, hyper-engaged",
    "disgusted": "skeptical side-eye, mildly grossed-out expression, curled upper lip, annoyed and unimpressed rather than extreme",
    "evil_grin": "sinister grin, mischievous eyes, menacing satisfaction, slightly cursed energy",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate emotion variants for speaker sprites via fal Nano Banana 2 Edit.",
    )
    parser.add_argument(
        "--speaker",
        action="append",
        choices=SPEAKER_IDS,
        help="Speaker ID to generate. Repeat for multiple speakers.",
    )
    parser.add_argument(
        "--all-speakers",
        action="store_true",
        help="Generate for all built-in brainrot speakers.",
    )
    parser.add_argument(
        "--exclude-speaker",
        action="append",
        choices=SPEAKER_IDS,
        help="Speaker ID to exclude from the run. Repeat for multiple speakers.",
    )
    parser.add_argument(
        "--emotion",
        action="append",
        choices=sorted(EMOTION_DESCRIPTIONS.keys()),
        help="Emotion to generate. Repeat for multiple emotions.",
    )
    parser.add_argument(
        "--all-emotions",
        action="store_true",
        help="Generate every supported emotion.",
    )
    parser.add_argument(
        "--input-image",
        type=Path,
        help="Single local image to edit instead of resolving from --source-dir and --speaker.",
    )
    parser.add_argument(
        "--reference-image",
        action="append",
        type=Path,
        help="Additional local reference image to include. Repeat to add more.",
    )
    parser.add_argument(
        "--source-dir",
        type=Path,
        default=DEFAULT_SOURCE_DIR,
        help=f"Directory containing base speaker images. Default: {DEFAULT_SOURCE_DIR}",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help=f"Directory where generated emotion images are written. Default: {DEFAULT_OUTPUT_DIR}",
    )
    parser.add_argument(
        "--cutout-output-dir",
        type=Path,
        default=DEFAULT_CUTOUT_OUTPUT_DIR,
        help=(
            "Directory where background-removed images are written. "
            f"Default: {DEFAULT_CUTOUT_OUTPUT_DIR}"
        ),
    )
    parser.add_argument(
        "--include-pose-references",
        action="store_true",
        help="Also include generate/public/pose/left and /right images as extra references when available.",
    )
    parser.add_argument(
        "--pose-dir",
        type=Path,
        default=DEFAULT_POSE_DIR,
        help=f"Pose reference directory. Default: {DEFAULT_POSE_DIR}",
    )
    parser.add_argument(
        "--prompt-suffix",
        default="",
        help="Extra prompt text appended after the base edit instructions.",
    )
    parser.add_argument(
        "--background-color",
        default="flat medium gray",
        help=(
            "Background color instruction for the generated sprite. "
            "Default: flat medium gray"
        ),
    )
    parser.add_argument(
        "--num-images",
        type=int,
        default=1,
        help="Number of output images to request per prompt. Default: 1",
    )
    parser.add_argument(
        "--aspect-ratio",
        default="auto",
        choices=["auto", "21:9", "16:9", "3:2", "4:3", "5:4", "1:1", "4:5", "3:4", "2:3", "9:16", "4:1", "1:4", "8:1", "1:8"],
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
        "--overwrite",
        action="store_true",
        help="Overwrite existing files instead of skipping them.",
    )
    parser.add_argument(
        "--remove-background",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Run BRIA background removal on each generated image. Default: enabled",
    )
    parser.add_argument(
        "--max-concurrency",
        type=int,
        default=8,
        help="Maximum number of fal jobs to run at once. Default: 8",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print the planned requests without calling fal.",
    )
    return parser.parse_args()


def humanize_speaker_name(speaker_id: str) -> str:
    return " ".join(word.capitalize() for word in speaker_id.split("_") if word)


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


def dedupe_paths(paths: Iterable[Path]) -> list[Path]:
    deduped: list[Path] = []
    seen: set[str] = set()

    for path in paths:
        resolved = str(path.resolve())
        if resolved in seen:
            continue
        seen.add(resolved)
        deduped.append(path)

    return deduped


def find_speaker_image(source_dir: Path, speaker_id: str) -> Path:
    for ext in DEFAULT_IMAGE_EXTENSIONS:
        candidate = source_dir / f"{speaker_id}{ext}"
        if candidate.exists():
            return candidate

    raise FileNotFoundError(
        f"Could not find an image for {speaker_id} in {source_dir}. "
        f"Tried extensions: {', '.join(DEFAULT_IMAGE_EXTENSIONS)}"
    )


def resolve_speakers(args: argparse.Namespace) -> list[str]:
    excluded = set(args.exclude_speaker or [])

    if args.input_image:
        return [args.input_image.stem]

    if args.all_speakers:
        return [speaker_id for speaker_id in SPEAKER_IDS if speaker_id not in excluded]

    if args.speaker:
        return [
            speaker_id
            for speaker_id in dict.fromkeys(args.speaker)
            if speaker_id not in excluded
        ]

    raise SystemExit("Choose at least one speaker with --speaker or use --all-speakers.")


def resolve_emotions(args: argparse.Namespace) -> list[str]:
    if args.all_emotions:
        return list(EMOTION_DESCRIPTIONS.keys())

    if args.emotion:
        return list(dict.fromkeys(args.emotion))

    raise SystemExit("Choose at least one emotion with --emotion or use --all-emotions.")


def resolve_reference_images(args: argparse.Namespace, speaker_id: str) -> list[Path]:
    references: list[Path] = []

    if args.input_image:
        references.append(args.input_image)
    else:
        references.append(find_speaker_image(args.source_dir, speaker_id))

    if args.include_pose_references and not args.input_image:
        for pose_name in ("left", "right"):
            for ext in DEFAULT_IMAGE_EXTENSIONS:
                pose_path = args.pose_dir / pose_name / f"{speaker_id}{ext}"
                if pose_path.exists():
                    references.append(pose_path)
                    break

    for extra_reference in args.reference_image or []:
        references.append(extra_reference)

    missing_paths = [path for path in references if not path.exists()]
    if missing_paths:
        missing_text = ", ".join(str(path) for path in missing_paths)
        raise FileNotFoundError(f"Reference image(s) not found: {missing_text}")

    return dedupe_paths(references)


def build_prompt(
    emotion: str,
    background_color: str,
    prompt_suffix: str = "",
) -> str:
    emotion_description = EMOTION_DESCRIPTIONS[emotion]
    lines = [
        "Use the attached source image(s) as the identity and style reference.",
        "Create an edited version of this exact same character in the exact same visual style.",
        "Preserve the character identity perfectly: same face shape, skin tone, hair, clothing, accessories, proportions, silhouette, and overall vibe.",
        "Keep the same crop, framing, camera angle, lighting, shading, color palette, linework, and rendering quality as the original sprite.",
        "This must look like the same asset pack, not a new illustration.",
        f"Put the character on a {background_color} background, not black.",
        "The background should be plain, uniform, and high-contrast enough that dark outlines and dark hair stay fully visible for later background removal.",
        "",
        f"Only change the facial expression and very slight head or upper-body pose to convey this emotion: {emotion}. {emotion_description}.",
        "",
        "Keep the result clean and production-ready for a video character sprite.",
        "No style drift, no redesign, no new props, no extra accessories, no extra limbs, no text, no watermark, no duplicated features, no anatomy errors, no transparent background, and no dramatic camera changes.",
    ]

    suffix = prompt_suffix.strip()
    if suffix:
        lines.extend(["", suffix])

    return "\n".join(lines)


def make_request_arguments(
    prompt: str,
    image_urls: list[str],
    args: argparse.Namespace,
) -> dict[str, object]:
    request: dict[str, object] = {
        "prompt": prompt,
        "image_urls": image_urls,
        "num_images": args.num_images,
        "aspect_ratio": args.aspect_ratio,
        "output_format": args.output_format,
        "safety_tolerance": args.safety_tolerance,
        "resolution": args.resolution,
        "limit_generations": True,
    }

    if args.seed is not None:
        request["seed"] = args.seed

    if args.thinking_level:
        request["thinking_level"] = args.thinking_level

    return request


def download_file(url: str, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with urlopen(url) as response:
        destination.write_bytes(response.read())


def save_result_bundle(
    speaker_id: str,
    emotion: str,
    result: dict[str, object],
    request_arguments: dict[str, object],
    output_dir: Path,
    output_format: str,
) -> list[Path]:
    job_dir = output_dir / speaker_id / emotion
    job_dir.mkdir(parents=True, exist_ok=True)

    result_path = job_dir / "result.json"
    result_payload = {
        "speaker_id": speaker_id,
        "emotion": emotion,
        "request": request_arguments,
        "result": result,
    }
    result_path.write_text(json.dumps(result_payload, indent=2), encoding="utf-8")

    saved_images: list[Path] = []
    images = result.get("images", [])
    if not isinstance(images, list):
        return saved_images

    extension = "jpg" if output_format == "jpeg" else output_format
    for index, image in enumerate(images, start=1):
        if not isinstance(image, dict):
            continue

        image_url = image.get("url")
        if not isinstance(image_url, str) or not image_url:
            continue

        file_name = f"{speaker_id}__{emotion}__{index:02d}.{extension}"
        destination = job_dir / file_name
        download_file(image_url, destination)
        saved_images.append(destination)

    return saved_images


def upload_reference_images(reference_paths: Iterable[Path]) -> list[str]:
    fal_client = load_fal_client()
    uploaded_urls: list[str] = []

    for path in reference_paths:
        print(f"Uploading reference: {path}")
        uploaded_urls.append(fal_client.upload_file(str(path)))

    return uploaded_urls


def subscribe_with_logs(
    model_id: str,
    request_arguments: dict[str, object],
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
        model_id,
        arguments=request_arguments,
        with_logs=True,
        on_queue_update=on_queue_update,
    )

    if not isinstance(result, dict):
        raise TypeError(f"Unexpected fal response type: {type(result)!r}")

    return result


def upload_single_file(path: Path) -> str:
    fal_client = load_fal_client()
    print(f"Uploading file: {path}")
    return fal_client.upload_file(str(path))


def save_background_removed_bundle(
    speaker_id: str,
    emotion: str,
    source_image_path: Path,
    result: dict[str, object],
    output_dir: Path,
) -> Path:
    job_dir = output_dir / speaker_id / emotion
    job_dir.mkdir(parents=True, exist_ok=True)

    image = result.get("image")
    if not isinstance(image, dict):
        raise ValueError("fal background removal response did not include an `image` object.")

    image_url = image.get("url")
    if not isinstance(image_url, str) or not image_url:
        raise ValueError(
            "fal background removal response did not include a downloadable image URL."
        )

    destination = job_dir / source_image_path.name
    download_file(image_url, destination)

    metadata_path = destination.with_suffix(".bg_remove.json")
    metadata_payload = {
        "speaker_id": speaker_id,
        "emotion": emotion,
        "source_image_path": str(source_image_path),
        "result": result,
    }
    metadata_path.write_text(json.dumps(metadata_payload, indent=2), encoding="utf-8")

    return destination


def remove_background_for_image(
    speaker_id: str,
    emotion: str,
    image_path: Path,
    cutout_output_dir: Path,
) -> Path:
    log_prefix = f"[{speaker_id}/{emotion}/bg]"
    uploaded_url = upload_single_file(image_path)
    result = subscribe_with_logs(
        BG_REMOVE_MODEL_ID,
        {"image_url": uploaded_url},
        log_prefix=log_prefix,
    )
    return save_background_removed_bundle(
        speaker_id=speaker_id,
        emotion=emotion,
        source_image_path=image_path,
        result=result,
        output_dir=cutout_output_dir,
    )


def run_single_job(
    speaker_id: str,
    emotion: str,
    request_arguments: dict[str, object],
    output_dir: Path,
    output_format: str,
    cutout_output_dir: Path,
    remove_background: bool,
) -> tuple[list[Path], list[Path]]:
    log_prefix = f"[{speaker_id}/{emotion}]"
    print(f"{log_prefix} submitting")
    result = subscribe_with_logs(MODEL_ID, request_arguments, log_prefix=log_prefix)
    saved_files = save_result_bundle(
        speaker_id=speaker_id,
        emotion=emotion,
        result=result,
        request_arguments=request_arguments,
        output_dir=output_dir,
        output_format=output_format,
    )

    cutout_files: list[Path] = []
    if remove_background:
        for saved_file in saved_files:
            cutout_files.append(
                remove_background_for_image(
                    speaker_id=speaker_id,
                    emotion=emotion,
                    image_path=saved_file,
                    cutout_output_dir=cutout_output_dir,
                )
            )

    return saved_files, cutout_files


def main() -> None:
    args = parse_args()
    speakers = resolve_speakers(args)
    emotions = resolve_emotions(args)

    if not args.dry_run:
        ensure_fal_key_present()

    if args.max_concurrency < 1:
        raise SystemExit("--max-concurrency must be at least 1.")

    planned_jobs: list[tuple[str, str, list[Path], dict[str, object]]] = []

    for speaker_id in speakers:
        references = resolve_reference_images(args, speaker_id)
        for emotion in emotions:
            prompt = build_prompt(
                emotion,
                background_color=args.background_color,
                prompt_suffix=args.prompt_suffix,
            )
            job_dir = args.output_dir / speaker_id / emotion
            result_path = job_dir / "result.json"

            if result_path.exists() and not args.overwrite:
                print(f"Skipping {speaker_id}/{emotion}: {result_path} already exists")
                continue

            request_arguments = make_request_arguments(prompt, [], args)
            planned_jobs.append((speaker_id, emotion, references, request_arguments))

    print(f"Planned jobs: {len(planned_jobs)}")

    if not planned_jobs:
        print("No jobs to run.")
        return

    if args.dry_run:
        for speaker_id, emotion, references, request_arguments in planned_jobs:
            print("")
            print(f"[{speaker_id}] -> {emotion}")
            print(f"References: {', '.join(str(path) for path in references)}")
            prompt = request_arguments["prompt"]
            if isinstance(prompt, str):
                print(prompt)
        return

    uploaded_references_by_speaker: dict[str, list[str]] = {}
    for speaker_id, _, references, _ in planned_jobs:
        if speaker_id in uploaded_references_by_speaker:
            continue
        uploaded_references_by_speaker[speaker_id] = upload_reference_images(references)

    jobs_with_urls: list[tuple[str, str, dict[str, object]]] = []
    for speaker_id, emotion, _, request_arguments in planned_jobs:
        request_arguments["image_urls"] = uploaded_references_by_speaker[speaker_id]
        jobs_with_urls.append((speaker_id, emotion, request_arguments))

    max_workers = min(args.max_concurrency, len(jobs_with_urls))
    print(f"Running up to {max_workers} job(s) in parallel")

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {
            executor.submit(
                run_single_job,
                speaker_id,
                emotion,
                request_arguments,
                args.output_dir,
                args.output_format,
                args.cutout_output_dir,
                args.remove_background,
            ): (speaker_id, emotion)
            for speaker_id, emotion, request_arguments in jobs_with_urls
        }

        for future in as_completed(futures):
            speaker_id, emotion = futures[future]
            try:
                saved_files, cutout_files = future.result()
            except Exception as exc:
                print(f"[{speaker_id}/{emotion}] failed: {exc}", file=sys.stderr)
                continue

            if saved_files:
                for file_path in saved_files:
                    print(f"[{speaker_id}/{emotion}] saved {file_path}")
            else:
                print(
                    f"[{speaker_id}/{emotion}] request completed, but no downloadable image URLs were returned."
                )

            if args.remove_background:
                if cutout_files:
                    for file_path in cutout_files:
                        print(f"[{speaker_id}/{emotion}] saved cutout {file_path}")
                else:
                    print(
                        f"[{speaker_id}/{emotion}] background removal was enabled, but no cutouts were produced."
                    )


if __name__ == "__main__":
    main()
