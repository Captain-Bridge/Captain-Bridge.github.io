from __future__ import annotations

from pathlib import Path
from typing import Iterable

from PIL import Image


ROOT_DIR = Path(__file__).resolve().parent.parent
SOURCE_ROOT = ROOT_DIR / "source"
TEXT_ROOTS = [
    SOURCE_ROOT,
    ROOT_DIR / "_config.next.yml",
]
TEXT_EXTENSIONS = {".css", ".html", ".js", ".json", ".yml", ".yaml"}


def walk_png_files(root: Path) -> Iterable[Path]:
    for path in root.rglob("*.png"):
        if path.is_file():
            yield path


def walk_text_files() -> Iterable[Path]:
    for target in TEXT_ROOTS:
        if target.is_dir():
            for path in target.rglob("*"):
                if path.is_file() and path.suffix.lower() in TEXT_EXTENSIONS:
                    yield path
            continue

        if target.is_file():
            yield target


def to_posix(path: Path) -> str:
    return path.as_posix()


def to_site_path(path: Path) -> str:
    return "/" + to_posix(path.relative_to(SOURCE_ROOT))


def select_webp_options(path: Path, image: Image.Image, size_bytes: int) -> dict:
    normalized_path = to_posix(path)
    width, height = image.size
    max_edge = max(width, height)
    has_alpha = image.mode in ("RGBA", "LA") or ("transparency" in image.info)

    if has_alpha:
        return {"lossless": True, "method": 6}

    if "/assets/images/icons/" in normalized_path:
        return {"lossless": True, "method": 6}

    if size_bytes <= 128 * 1024 and max_edge <= 512:
        return {"lossless": True, "method": 6}

    return {"quality": 95, "method": 6}


def replace_all(content: str, search: str, replacement: str) -> str:
    return content.replace(search, replacement)


def main() -> None:
    png_files = list(walk_png_files(SOURCE_ROOT))
    replacements: list[dict[str, str]] = []
    total_original_bytes = 0
    total_webp_bytes = 0

    for png_file in png_files:
        original_bytes = png_file.stat().st_size
        webp_file = png_file.with_suffix(".webp")

        with Image.open(png_file) as image:
            converted = image
            if image.mode not in ("RGB", "RGBA", "LA"):
                converted = image.convert("RGBA" if "transparency" in image.info else "RGB")

            save_options = select_webp_options(png_file, converted, original_bytes)
            converted.save(webp_file, format="WEBP", **save_options)

        webp_bytes = webp_file.stat().st_size
        total_original_bytes += original_bytes
        total_webp_bytes += webp_bytes

        replacements.append(
            {
                "from_site_path": to_site_path(png_file),
                "to_site_path": to_site_path(webp_file),
                "from_source_path": to_posix(png_file.relative_to(SOURCE_ROOT)),
                "to_source_path": to_posix(webp_file.relative_to(SOURCE_ROOT)),
                "from_relative_path": to_posix(png_file.relative_to(ROOT_DIR)),
                "to_relative_path": to_posix(webp_file.relative_to(ROOT_DIR)),
            }
        )

    changed_text_files = 0

    for text_file in walk_text_files():
        original = text_file.read_text(encoding="utf-8")
        updated = original

        for replacement in replacements:
            updated = replace_all(updated, replacement["from_site_path"], replacement["to_site_path"])
            updated = replace_all(updated, replacement["from_source_path"], replacement["to_source_path"])
            updated = replace_all(updated, replacement["from_relative_path"], replacement["to_relative_path"])

        if updated != original:
            text_file.write_text(updated, encoding="utf-8")
            changed_text_files += 1

    for png_file in png_files:
        png_file.unlink()

    saved_bytes = total_original_bytes - total_webp_bytes
    print(f"Converted {len(png_files)} PNG files to WebP.")
    print(f"Updated {changed_text_files} text files with new image paths.")
    print(f"Original size: {total_original_bytes / (1024 * 1024):.2f} MB")
    print(f"WebP size: {total_webp_bytes / (1024 * 1024):.2f} MB")
    print(f"Saved: {saved_bytes / (1024 * 1024):.2f} MB")


if __name__ == "__main__":
    main()
