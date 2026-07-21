from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageOps


BASE_DIR = Path(__file__).resolve().parent
SOURCE_PATTERN = "*_bg.webp"
OUTPUT_DIR = BASE_DIR / "aligned"
PREVIEW_DIR = BASE_DIR / "_review"
TARGET_POINTS = np.array([0, 5, 25, 50, 75, 95, 100], dtype=np.float32)


def build_lut(y_channel: np.ndarray, target_percentiles: np.ndarray) -> np.ndarray:
    source_percentiles = np.percentile(y_channel, TARGET_POINTS).astype(np.float32)
    source_percentiles[0] = 0.0
    source_percentiles[-1] = 255.0

    target_values = target_percentiles.astype(np.float32).copy()
    target_values[0] = 0.0
    target_values[-1] = 255.0

    source_percentiles = np.maximum.accumulate(source_percentiles)
    target_values = np.maximum.accumulate(target_values)

    unique_x, unique_idx = np.unique(source_percentiles, return_index=True)
    unique_y = target_values[unique_idx]
    if unique_x[0] > 0:
        unique_x = np.insert(unique_x, 0, 0.0)
        unique_y = np.insert(unique_y, 0, 0.0)
    if unique_x[-1] < 255:
        unique_x = np.append(unique_x, 255.0)
        unique_y = np.append(unique_y, 255.0)

    lut = np.interp(np.arange(256, dtype=np.float32), unique_x, unique_y)
    return np.clip(lut, 0, 255).astype(np.uint8)


def align_image(path: Path, target_percentiles: np.ndarray) -> Image.Image:
    image = Image.open(path).convert("YCbCr")
    y_channel, cb_channel, cr_channel = image.split()
    y_np = np.asarray(y_channel, dtype=np.uint8)
    lut = build_lut(y_np, target_percentiles)
    adjusted_y = Image.fromarray(lut[y_np], mode="L")
    merged = Image.merge("YCbCr", (adjusted_y, cb_channel, cr_channel)).convert("RGB")
    return merged


def make_contact_sheet(paths: list[Path], output_path: Path, title_suffix: str) -> None:
    thumbs = []
    thumb_w, thumb_h, label_h = 420, 236, 40

    for path in paths:
        image = Image.open(path).convert("RGB")
        thumb = ImageOps.contain(image, (thumb_w, thumb_h))
        canvas = Image.new("RGB", (thumb_w, thumb_h + label_h), "white")
        x = (thumb_w - thumb.width) // 2
        y = (thumb_h - thumb.height) // 2
        canvas.paste(thumb, (x, y))
        draw = ImageDraw.Draw(canvas)
        draw.rectangle((0, thumb_h, thumb_w, thumb_h + label_h), fill=(244, 244, 244))
        draw.text((10, thumb_h + 11), f"{path.name} {title_suffix}", fill=(18, 18, 18))
        thumbs.append(canvas)

    cols = 2
    pad = 20
    rows = (len(thumbs) + cols - 1) // cols
    cell_h = thumb_h + label_h
    sheet_w = cols * thumb_w + pad * (cols + 1)
    sheet_h = rows * cell_h + pad * (rows + 1)
    sheet = Image.new("RGB", (sheet_w, sheet_h), (228, 228, 228))

    for idx, thumb in enumerate(thumbs):
        row = idx // cols
        col = idx % cols
        x = pad + col * (thumb_w + pad)
        y = pad + row * (cell_h + pad)
        sheet.paste(thumb, (x, y))

    sheet.save(output_path)


def main() -> None:
    OUTPUT_DIR.mkdir(exist_ok=True)
    PREVIEW_DIR.mkdir(exist_ok=True)

    source_paths = sorted(BASE_DIR.glob(SOURCE_PATTERN))
    if not source_paths:
        raise SystemExit(f"No files matched {SOURCE_PATTERN!r} in {BASE_DIR}")

    all_percentiles = []
    for path in source_paths:
        image = Image.open(path).convert("YCbCr")
        y_channel = np.asarray(image.getchannel(0), dtype=np.uint8)
        all_percentiles.append(np.percentile(y_channel, TARGET_POINTS))

    target_percentiles = np.median(np.stack(all_percentiles), axis=0).astype(np.float32)
    # Roll highlights slightly to keep the ceiling glow consistent across the set.
    target_percentiles[5] = min(target_percentiles[5], 138.0)

    output_paths = []
    for path in source_paths:
        aligned = align_image(path, target_percentiles)
        out_path = OUTPUT_DIR / path.name
        aligned.save(out_path, format="WEBP", quality=95, method=6)
        output_paths.append(out_path)

    make_contact_sheet(source_paths, PREVIEW_DIR / "before.png", "(original)")
    make_contact_sheet(output_paths, PREVIEW_DIR / "after.png", "(aligned)")

    print("Saved aligned images:")
    for path in output_paths:
        print(path)
    print(f"Before preview: {PREVIEW_DIR / 'before.png'}")
    print(f"After preview: {PREVIEW_DIR / 'after.png'}")


if __name__ == "__main__":
    main()
