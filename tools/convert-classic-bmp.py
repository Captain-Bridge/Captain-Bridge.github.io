"""Generate lossless WebP companions and update Classic Marathon references.

Original BMPs remain in source/. The static build excludes a BMP only when its
WebP companion exists. Requires Pillow: python -m pip install Pillow.
Run again after rebuilding M2/M3 catalogs from raw resources.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / "source" / "Classic-marathon"


def main():
    replacements = {}
    for source in ROOT.rglob("*.bmp"):
        target = source.with_suffix(".webp")
        if not target.exists():
            with Image.open(source) as image:
                image.save(target, "WEBP", lossless=True, method=6)
        replacements[source.name] = target.name
    changed = 0
    for source in ROOT.rglob("*"):
        if not source.is_file() or source.suffix.lower() not in {".json", ".html", ".txt", ".md"}:
            continue
        original = source.read_bytes()
        updated = original
        for before, after in replacements.items():
            updated = updated.replace(before.encode(), after.encode())
        if updated != original:
            source.write_bytes(updated)
            changed += 1
    print(f"WebP companions: {len(replacements)} image names; updated {changed} content files.")


if __name__ == "__main__":
    main()
