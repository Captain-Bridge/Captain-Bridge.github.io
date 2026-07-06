from __future__ import annotations

import json
from pathlib import Path

import cv2
import numpy as np


ROOT = Path(r"C:\codes\myblog")
REF_PATH = ROOT / "source" / "map" / "参考图.png"
BASE_PATH = ROOT / "source" / "map" / "assets" / "cyro_archive_basemap_4x.webp"
OUT_PATH = ROOT / "artifacts" / "cryo-icon-detections.json"


def load_bgr(path: Path) -> np.ndarray:
    data = np.fromfile(path, dtype=np.uint8)
    image = cv2.imdecode(data, cv2.IMREAD_COLOR)
    if image is None:
      raise RuntimeError(f"Failed to decode image: {path}")
    return image


def detect_color_shapes(ref_bgr: np.ndarray) -> list[dict]:
    hsv = cv2.cvtColor(ref_bgr, cv2.COLOR_BGR2HSV)
    detections: list[dict] = []

    specs = [
        ("runner-respawn", [(20, 80, 150), (45, 255, 255)]),
        ("extract-possible", [(20, 90, 90), (45, 255, 255)]),
        ("extract-active", [(20, 90, 90), (45, 255, 255)]),
        ("extract-final", [(10, 110, 110), (30, 255, 255)]),
        ("coolant-full", [(135, 90, 110), (175, 255, 255)]),
        ("vault", [(90, 110, 120), (125, 255, 255)]),
        ("credential-orange", [(10, 130, 130), (30, 255, 255)]),
        ("credential-red", [(0, 120, 120), (8, 255, 255)]),
        ("credential-red", [(170, 120, 120), (180, 255, 255)]),
        ("credential-blue-drone", [(95, 90, 100), (125, 255, 255)]),
        ("secret-lab", [(115, 90, 90), (145, 255, 255)]),
    ]

    seen = []
    for icon_id, (lower, upper) in specs:
        mask = cv2.inRange(hsv, np.array(lower, dtype=np.uint8), np.array(upper, dtype=np.uint8))
        mask = cv2.medianBlur(mask, 5)
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        for contour in contours:
            area = cv2.contourArea(contour)
            if area < 120:
                continue

            x, y, w, h = cv2.boundingRect(contour)
            cx = x + (w / 2)
            cy = y + (h / 2)
            key = (round(cx), round(cy))
            if any(abs(cx - sx) < 10 and abs(cy - sy) < 10 for sx, sy in seen):
                continue

            seen.append(key)
            detections.append(
                {
                    "iconKey": icon_id,
                    "refCenter": {"x": round(cx, 2), "y": round(cy, 2)},
                    "refBox": {"x": x, "y": y, "w": w, "h": h},
                    "area": round(area, 2),
                }
            )

    return detections


def map_to_base(detections: list[dict], ref_shape: tuple[int, int], base_shape: tuple[int, int]) -> list[dict]:
    ref_h, ref_w = ref_shape[:2]
    base_h, base_w = base_shape[:2]
    sx = base_w / ref_w
    sy = base_h / ref_h

    output = []
    counters: dict[str, int] = {}
    for det in detections:
        icon_key = det["iconKey"]
        counters[icon_key] = counters.get(icon_key, 0) + 1
        idx = counters[icon_key]
        x = round(det["refCenter"]["x"] * sx)
        y = round(det["refCenter"]["y"] * sy)
        output.append(
            {
                "id": f"{icon_key}-{idx:02d}",
                "title": f"{icon_key}-{idx:02d}",
                "type": "reference",
                "iconKey": icon_key,
                "x": x,
                "y": y,
                "description": "Imported from reference image.",
                "source": "参考图.png",
                "confidence": "reference"
            }
        )

    return output


def main() -> None:
    ref_bgr = load_bgr(REF_PATH)
    base_bgr = load_bgr(BASE_PATH)
    detections = detect_color_shapes(ref_bgr)
    pois = map_to_base(detections, ref_bgr.shape, base_bgr.shape)
    OUT_PATH.write_text(json.dumps({"detections": detections, "pois": pois}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {OUT_PATH}")
    print(f"detections={len(detections)}")


if __name__ == "__main__":
    main()
