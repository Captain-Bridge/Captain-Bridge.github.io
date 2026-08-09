import argparse
import hashlib
import json
import re
import shutil
from pathlib import Path

import numpy as np
from PIL import Image


LOGIN_COLORS = {
    "01600.bmp": ("human", "$C0"),
    "01603.bmp": ("human", "$C0"),
    "01607.bmp": ("human", "$C0"),
    "01601.bmp": ("spht", "$C5"),
    "01602.bmp": ("pfhor", "$C2"),
    "01605.bmp": ("pfhor", "$C2"),
    "01608.bmp": ("jjaro", "$C1"),
    "01613.bmp": ("bungie", "$C0"),
}
VARIANT_ORDER = ("UNFINISHED", "FINISHED")


def image_mask(path):
    pixels = np.asarray(Image.open(path).convert("RGB"))
    return (pixels.max(axis=2) > 40).astype(float)


def match_image(render_path, candidates):
    source = image_mask(render_path)
    scored = []

    for candidate in candidates:
        template = image_mask(candidate)
        height, width = template.shape
        shape = (source.shape[0] + height - 1, source.shape[1] + width - 1)
        source_fft = np.fft.rfftn(source, shape, axes=(0, 1))
        overlap = np.fft.irfftn(
            source_fft * np.fft.rfftn(template[::-1, ::-1], shape, axes=(0, 1)),
            shape,
            axes=(0, 1),
        )
        window_sum = np.fft.irfftn(
            source_fft * np.fft.rfftn(np.ones_like(template), shape, axes=(0, 1)),
            shape,
            axes=(0, 1),
        )
        valid = (slice(height - 1, source.shape[0]), slice(width - 1, source.shape[1]))
        mismatch = template.sum() + window_sum[valid] - 2 * overlap[valid]
        score = 1 - float(mismatch.min()) / template.size
        scored.append((score, candidate.name))

    scored.sort(reverse=True)
    if not scored or scored[0][0] < 0.99:
        raise RuntimeError(f"No reliable image match for {render_path}: {scored[:3]}")
    return scored[0][1]


def variant_files(terminal_dir, variant):
    pattern = re.compile(rf"^{variant}_(\d{{3}})_(LOGON|PICT|LOGOFF)\.txt$")
    files = []
    for path in terminal_dir.glob(f"{variant}_*.txt"):
        match = pattern.match(path.name)
        if match:
            files.append((int(match.group(1)), match.group(2).lower(), path.name))
    return sorted(files)


def build_variant(terminal_dir, variant, candidates):
    files = variant_files(terminal_dir, variant)
    if not files:
        return None

    by_kind = {"logon": [], "pict": [], "logoff": []}
    for _, kind, name in files:
        by_kind[kind].append(name)

    if len(by_kind["logon"]) != 1:
        raise RuntimeError(f"{terminal_dir} {variant} must have exactly one LOGON")

    render_dir = terminal_dir / "renders"
    logon = by_kind["logon"][0]
    logon_image = match_image(render_dir / logon.replace(".txt", ".png"), candidates)
    race, default_color = LOGIN_COLORS.get(logon_image, ("unknown", "$C0"))

    picts = []
    for file_name in by_kind["pict"]:
        image = match_image(render_dir / file_name.replace(".txt", ".png"), candidates)
        picts.append({"file": file_name, "image": image})

    logoff = by_kind["logoff"][0] if by_kind["logoff"] else None
    logoff_image = None
    if logoff:
        logoff_image = match_image(render_dir / logoff.replace(".txt", ".png"), candidates)

    result = {
        "logon": logon,
        "logonImage": logon_image,
        "race": race,
        "defaultColor": default_color,
        "picts": picts,
        "logoff": logoff,
        "logoffImage": logoff_image,
    }
    return result


def build_catalog(root):
    levels = []
    image_names = set()
    pict_count = 0
    terminal_count = 0
    variant_count = 0

    level_dirs = sorted(
        path for path in root.iterdir() if path.is_dir() and re.match(r"^\d{2} ", path.name)
    )
    for level_dir in level_dirs:
        level_id, level_name = level_dir.name.split(" ", 1)
        terminals = []

        for terminal_dir in sorted(level_dir.glob("Terminal_*"), key=lambda path: int(path.name.split("_")[1])):
            candidates = sorted((terminal_dir / "picts").glob("*.bmp"))
            if not candidates:
                raise RuntimeError(f"No BMP resources found in {terminal_dir}")
            image_names.update(path.name for path in candidates)

            variant_data = {}
            for variant in VARIANT_ORDER:
                data = build_variant(terminal_dir, variant, candidates)
                if data:
                    variant_data[variant] = data
                    pict_count += len(data["picts"])
                    variant_count += 1

            if not variant_data:
                raise RuntimeError(f"No terminal variants found in {terminal_dir}")

            default_variant = "UNFINISHED" if "UNFINISHED" in variant_data else next(iter(variant_data))
            default_data = variant_data[default_variant]
            terminals.append({
                "name": terminal_dir.name,
                "variants": list(variant_data),
                "defaultVariant": default_variant,
                **default_data,
                "variantData": variant_data,
            })
            terminal_count += 1

        levels.append({"id": level_id, "name": level_name, "terminals": terminals})

    return {
        "meta": {
            "description": "Marathon 2 scenario terminal files mapped to AO resources",
            "total_levels": len(levels),
            "total_terminals": terminal_count,
            "total_variants": variant_count,
            "total_picts": pict_count,
            "total_images": len(image_names),
        },
        "levels": levels,
    }


def same_file(left, right):
    def digest(path):
        return hashlib.sha256(path.read_bytes()).digest()
    return left.stat().st_size == right.stat().st_size and digest(left) == digest(right)


def move_unique(source, destination):
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.exists():
        if not same_file(source, destination):
            raise RuntimeError(f"Conflicting files: {source} and {destination}")
        source.unlink()
    else:
        shutil.move(str(source), str(destination))


def organize(root):
    text_root = root / "text"
    pict_root = root / "picts"
    render_root = root / "renders"
    level_dirs = sorted(
        path for path in root.iterdir() if path.is_dir() and re.match(r"^\d{2} ", path.name)
    )

    for level_dir in level_dirs:
        for terminal_dir in sorted(level_dir.glob("Terminal_*")):
            relative = Path(level_dir.name) / terminal_dir.name
            for text_file in terminal_dir.glob("*.txt"):
                move_unique(text_file, text_root / relative / text_file.name)
            for image_file in (terminal_dir / "picts").glob("*.bmp"):
                move_unique(image_file, pict_root / image_file.name)
            for render_file in (terminal_dir / "renders").glob("*.png"):
                move_unique(render_file, render_root / relative / render_file.name)

            for child in (terminal_dir / "picts", terminal_dir / "renders", terminal_dir):
                if child.exists():
                    child.rmdir()
        level_dir.rmdir()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--organize", action="store_true")
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1] / "source" / "Classic-marathon" / "M2"
    raw_levels = [path for path in root.iterdir() if path.is_dir() and re.match(r"^\d{2} ", path.name)]
    if not raw_levels:
        raise SystemExit("M2 is already organized; restore the raw level directories before rebuilding the catalog.")

    catalog = build_catalog(root)
    output = root / "terminals.json"
    output.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(catalog["meta"], ensure_ascii=False))

    if args.organize:
        organize(root)
        print("Organized M2 into text/, picts/, and renders/.")


if __name__ == "__main__":
    main()
