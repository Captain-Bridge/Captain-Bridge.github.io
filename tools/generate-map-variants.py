from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


TARGET_WIDTHS = {
    "low": 960,
    "medium": 1440,
    "full": None,
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate GitHub Pages friendly WebP map variants from a single source image.",
    )
    parser.add_argument("source", help="Path to the original map image.")
    parser.add_argument(
        "--output-dir",
        required=True,
        help="Directory where low.webp / medium.webp / full.webp will be written.",
    )
    parser.add_argument(
        "--quality",
        type=int,
        default=92,
        help="WebP quality for generated files. Default: 92",
    )
    return parser.parse_args()


def resize_image(image: Image.Image, target_width: int | None) -> Image.Image:
    if target_width is None or image.width <= target_width:
        return image.copy()

    ratio = target_width / image.width
    target_height = round(image.height * ratio)
    return image.resize((target_width, target_height), Image.Resampling.LANCZOS)


def main() -> None:
    args = parse_args()
    source_path = Path(args.source).resolve()
    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    with Image.open(source_path) as image:
        if image.mode not in ("RGB", "RGBA"):
            image = image.convert("RGBA" if "A" in image.getbands() else "RGB")

        print(f"Source: {source_path}")
        print(f"Original size: {image.width}x{image.height}")

        for name, width in TARGET_WIDTHS.items():
            variant = resize_image(image, width)
            output_path = output_dir / f"{name}.webp"
            variant.save(output_path, "WEBP", quality=args.quality, method=6)
            print(f"Wrote {output_path.name}: {variant.width}x{variant.height}")


if __name__ == "__main__":
    main()
