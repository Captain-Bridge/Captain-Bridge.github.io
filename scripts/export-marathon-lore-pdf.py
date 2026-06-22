from __future__ import annotations

import argparse
import json
import os
import re
from dataclasses import dataclass
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Image as RLImage
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    Image,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    XPreformatted,
)
from reportlab.platypus.tableofcontents import TableOfContents


ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = ROOT / "source"
DEFAULT_MODULES_DIR = SOURCE_ROOT / "marathon-lore" / "content" / "modules"
DEFAULT_OUTPUT = ROOT / "artifacts" / "marathon-lore" / "marathon-lore-logs.pdf"

SPAN_RE = re.compile(r"<span\b([^>]*)>(.*?)</span>", re.I | re.S)
DIV_RE = re.compile(r"<div\b([^>]*)>(.*?)</div>", re.I | re.S)
STYLE_RE = re.compile(r"style\s*=\s*(['\"])(.*?)\1", re.I | re.S)
CLASS_RE = re.compile(r"class\s*=\s*(['\"])(.*?)\1", re.I | re.S)
TAG_SPLIT_RE = re.compile(r"(<[^>]+>)")
INLINE_TAG_RE = re.compile(r"^(?:<br\s*/?>|</?font\b[^>]*>)$", re.I)


@dataclass
class LogEntry:
    title: str
    image: str | None
    body_file: str | None


def resolve_source_path(raw_path: str | None) -> Path | None:
    if not raw_path or not isinstance(raw_path, str):
        return None
    rel = raw_path.strip().lstrip("/").replace("/", os.sep)
    return SOURCE_ROOT / rel


def register_cjk_font() -> str:
    candidates = [
        Path(os.environ.get("WINDIR", r"C:\Windows")) / "Fonts" / "NotoSansSC-VF.ttf",
        Path(os.environ.get("WINDIR", r"C:\Windows")) / "Fonts" / "simhei.ttf",
        Path(os.environ.get("WINDIR", r"C:\Windows")) / "Fonts" / "simsun.ttc",
        Path(os.environ.get("WINDIR", r"C:\Windows")) / "Fonts" / "Deng.ttf",
    ]
    for font_path in candidates:
        if font_path.exists():
            font_name = "MarathonCJK"
            pdfmetrics.registerFont(TTFont(font_name, str(font_path)))
            return font_name
    raise SystemExit("找不到可用的中文字体，请确认 Windows Fonts 目录里有 NotoSansSC-VF.ttf 或 simhei.ttf")


def load_json(file_path: Path) -> object:
    with file_path.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def collect_logs(node: object, logs: list[LogEntry]) -> None:
    if isinstance(node, list):
        for item in node:
            collect_logs(item, logs)
        return

    if not isinstance(node, dict):
        return

    node_logs = node.get("logs")
    if isinstance(node_logs, list):
        for log in node_logs:
            if not isinstance(log, dict):
                continue
            title = log.get("title")
            if not isinstance(title, str) or not title.strip():
                title = log.get("id") if isinstance(log.get("id"), str) else "Untitled log"
            logs.append(
                LogEntry(
                    title=title.strip(),
                    image=log.get("image") if isinstance(log.get("image"), str) else None,
                    body_file=log.get("bodyFile") if isinstance(log.get("bodyFile"), str) else None,
                )
            )

    for key, value in node.items():
        if key == "logs":
            continue
        if isinstance(value, (dict, list)):
            collect_logs(value, logs)


def sanitize_style(style_text: str) -> str:
    parts = []
    for raw_part in style_text.split(";"):
        part = raw_part.strip()
        if not part or ":" not in part:
            continue
        key, value = [piece.strip() for piece in part.split(":", 1)]
        key = key.lower()
        if key not in {"color", "background-color", "text-align"}:
            continue
        if re.search(r"url\s*\(|expression\s*\(|[<>]", value, flags=re.I):
            continue
        parts.append(f"{key}: {value}")
    return "; ".join(parts)


def convert_span_tags(text: str) -> str:
    def repl(match: re.Match[str]) -> str:
        attrs = match.group(1) or ""
        inner = match.group(2) or ""
        style_match = STYLE_RE.search(attrs)
        if style_match:
            style_text = sanitize_style(style_match.group(2))
            rgb_match = re.search(r"color\s*:\s*rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)", style_text, flags=re.I)
            if rgb_match:
                r, g, b = (int(rgb_match.group(i)) for i in range(1, 4))
                return f'<font color="#{r:02X}{g:02X}{b:02X}">{inner}</font>'
            hex_match = re.search(r"color\s*:\s*#([0-9a-f]{6})", style_text, flags=re.I)
            if hex_match:
                return f'<font color="#{hex_match.group(1).upper()}">{inner}</font>'
        return inner

    previous = None
    while previous != text:
        previous = text
        text = SPAN_RE.sub(repl, text)
    return text


def convert_div_tags(text: str) -> str:
    def repl(match: re.Match[str]) -> str:
        attrs = match.group(1) or ""
        inner = match.group(2) or ""
        style_match = STYLE_RE.search(attrs)
        if style_match:
            style_text = sanitize_style(style_match.group(2))
            if re.search(r"text-align\s*:\s*center", style_text, flags=re.I):
                return f'<center-block>{inner}</center-block>'

        class_match = CLASS_RE.search(attrs)
        if class_match:
            classes = class_match.group(2).split()
            if "manifest-block" in classes:
                return f'<manifest-block>{inner}</manifest-block>'
            if "manifest-line" in classes:
                indent = next((c for c in classes if re.fullmatch(r"x-\d+", c)), "")
                if indent:
                    return f'<manifest-line {indent}>{inner}</manifest-line>'
                return f'<manifest-line>{inner}</manifest-line>'
        return inner

    previous = None
    while previous != text:
        previous = text
        text = DIV_RE.sub(repl, text)
    return text


def sanitize_inline_markup(text: str) -> str:
    text = convert_span_tags(convert_div_tags(text.replace("\r\n", "\n").replace("\r", "\n")))
    text = re.sub(r"<br\s*/?>", "<br/>", text, flags=re.I)
    parts = TAG_SPLIT_RE.split(text)
    out: list[str] = []
    for part in parts:
        if not part:
            continue
        if part.startswith("<") and (
            INLINE_TAG_RE.match(part.strip())
            or re.match(r"^<(?:center-block|manifest-block|manifest-line)\b", part, flags=re.I)
        ):
            out.append(part)
        else:
            out.append(escape(part))
    return "".join(out)


def read_markdown(path: Path) -> str:
    with path.open("r", encoding="utf-8") as fh:
        return fh.read().strip()


def parse_body_to_blocks(text: str) -> list[dict]:
    lines = text.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    blocks: list[dict] = []
    paragraph: list[str] = []
    code: list[str] = []
    in_code = False
    in_manifest = False
    manifest_lines: list[tuple[str, int]] = []

    def flush_paragraph() -> None:
        nonlocal paragraph
        if not paragraph:
            return
        blocks.append({"type": "paragraph", "html": "<br/>".join(sanitize_inline_markup(line) for line in paragraph)})
        paragraph = []

    def flush_code() -> None:
        nonlocal code
        if not code:
            return
        blocks.append({"type": "code", "text": "\n".join(code)})
        code = []

    def flush_manifest() -> None:
        nonlocal manifest_lines
        if not manifest_lines:
            return
        blocks.append({"type": "manifest", "lines": manifest_lines[:]})
        manifest_lines = []

    for raw_line in lines:
        line = raw_line.rstrip()
        trimmed = line.strip()

        if trimmed.startswith("```"):
            if in_code:
                flush_code()
                in_code = False
            else:
                flush_paragraph()
                flush_manifest()
                in_code = True
            continue

        if in_code:
            code.append(raw_line)
            continue

        if not trimmed:
            flush_paragraph()
            flush_manifest()
            continue

        if trimmed in {"---", "***", "___"}:
            flush_paragraph()
            flush_manifest()
            blocks.append({"type": "hr"})
            continue

        heading = re.match(r"^(#{1,6})\s+(.*)$", trimmed)
        if heading:
            flush_paragraph()
            flush_manifest()
            blocks.append({"type": "heading", "level": len(heading.group(1)), "html": sanitize_inline_markup(heading.group(2).strip())})
            continue

        if "<div class=\"manifest-block\">" in trimmed:
            flush_paragraph()
            flush_manifest()
            in_manifest = True
            continue
        if in_manifest and "</div>" in trimmed and "manifest-block" in trimmed:
            flush_manifest()
            in_manifest = False
            continue
        if in_manifest and "manifest-line" in trimmed:
            line_html = sanitize_inline_markup(trimmed)
            indent_match = re.search(r"manifest-line\s+x-(\d+)", line_html)
            indent = int(indent_match.group(1)) if indent_match else 0
            content = re.sub(r'^<div class="manifest-line(?:\s+x-\d+)?">', "", line_html).replace("</div>", "")
            manifest_lines.append((content, indent))
            continue

        if in_manifest:
            continue

        paragraph.append(line)

    if in_code:
        flush_code()
    flush_paragraph()
    flush_manifest()
    return blocks


def build_styles(font_name: str) -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle("title", parent=base["Title"], fontName=font_name, fontSize=22, leading=28, alignment=TA_CENTER, textColor=colors.HexColor("#111111"), spaceAfter=6 * mm),
        "subtitle": ParagraphStyle("subtitle", parent=base["Normal"], fontName=font_name, fontSize=9.5, leading=12, alignment=TA_CENTER, textColor=colors.HexColor("#666666"), spaceAfter=5 * mm),
        "toc_title": ParagraphStyle("toc_title", parent=base["Title"], fontName=font_name, fontSize=18, leading=20, alignment=TA_CENTER, textColor=colors.HexColor("#111111"), spaceAfter=4 * mm),
        "toc_entry": ParagraphStyle("toc_entry", parent=base["Normal"], fontName=font_name, fontSize=9.25, leading=11.5, textColor=colors.HexColor("#111111")),
        "body": ParagraphStyle("body", parent=base["Normal"], fontName=font_name, fontSize=11, leading=16, alignment=TA_LEFT, textColor=colors.HexColor("#111111"), spaceAfter=0),
        "center": ParagraphStyle("center", parent=base["Normal"], fontName=font_name, fontSize=11, leading=16, alignment=TA_CENTER, textColor=colors.HexColor("#111111"), spaceAfter=0),
        "code": ParagraphStyle("code", parent=base["Code"], fontName=font_name, fontSize=9.5, leading=13, alignment=TA_LEFT, backColor=colors.HexColor("#F7F7F7"), borderPadding=4, spaceBefore=2 * mm, spaceAfter=2 * mm),
        "h1": ParagraphStyle("h1", parent=base["Heading1"], fontName=font_name, fontSize=16, leading=20, textColor=colors.HexColor("#111111"), spaceBefore=2 * mm, spaceAfter=2 * mm),
        "h2": ParagraphStyle("h2", parent=base["Heading2"], fontName=font_name, fontSize=13.5, leading=17, textColor=colors.HexColor("#111111"), spaceBefore=2 * mm, spaceAfter=2 * mm),
        "h3": ParagraphStyle("h3", parent=base["Heading3"], fontName=font_name, fontSize=12, leading=15, textColor=colors.HexColor("#111111"), spaceBefore=1.5 * mm, spaceAfter=1.5 * mm),
        "pre": ParagraphStyle("pre", parent=base["Code"], fontName=font_name, fontSize=10.5, leading=14, alignment=TA_LEFT, textColor=colors.HexColor("#111111")),
    }


def page_canvas(font_name: str, doc_title: str):
    def _draw(canvas, doc):
        canvas.saveState()
        canvas.setFont(font_name, 9)
        canvas.setFillColor(colors.HexColor("#666666"))
        canvas.drawString(doc.leftMargin, 12 * mm, doc_title)
        canvas.drawRightString(doc.pagesize[0] - doc.rightMargin, 12 * mm, f"{canvas.getPageNumber()}")
        canvas.restoreState()

    return _draw


def fit_image(image_path: Path, max_width: float, max_height: float):
    image = RLImage(str(image_path))
    image._restrictSize(max_width, max_height)
    return image


def build_pdf(entries: list[LogEntry], output_path: Path, font_name: str) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    styles = build_styles(font_name)
    doc = BaseDocTemplate(
        str(output_path),
        pagesize=A4,
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=16 * mm,
        bottomMargin=18 * mm,
        title="marathon-lore logs",
        author="Codex",
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="normal")
    doc.addPageTemplates([PageTemplate(id="main", frames=[frame], onPage=page_canvas(font_name, "marathon-lore"))])

    toc = TableOfContents()
    toc.levelStyles = [
        ParagraphStyle(
            "toc_level_0",
            parent=styles["toc_entry"],
            leftIndent=0,
            firstLineIndent=0,
            spaceBefore=0,
            spaceAfter=0,
            leading=11.5,
        )
    ]

    story = [
        Paragraph("Marathon Lore Log Archive", styles["title"]),
        Paragraph(f"Total logs: {len(entries)}", styles["subtitle"]),
        Spacer(1, 8 * mm),
        Paragraph("目录", styles["toc_title"]),
        toc,
        PageBreak(),
    ]

    for index, entry in enumerate(entries, start=1):
        if index > 1:
            story.append(PageBreak())

        title = sanitize_inline_markup(f"{index}. {entry.title}")
        title_para = Paragraph(f'<a name="log-{index}"/>{title}', styles["h1"])
        title_para._toc_title = entry.title
        title_para._toc_key = f"log-{index}"
        story.append(title_para)
        story.append(Spacer(1, 2 * mm))

        image_path = resolve_source_path(entry.image)
        if image_path and image_path.exists():
            story.append(fit_image(image_path, doc.width, 125 * mm))
            story.append(Spacer(1, 4 * mm))
        else:
            story.append(Paragraph("Image not found.", styles["body"]))
            story.append(Spacer(1, 4 * mm))

        body_path = resolve_source_path(entry.body_file)
        if not body_path or not body_path.exists():
            story.append(Paragraph("Markdown bodyFile not found.", styles["body"]))
            continue

        blocks = parse_body_to_blocks(read_markdown(body_path))
        for block in blocks:
            if block["type"] == "hr":
                story.append(Spacer(1, 2 * mm))
                story.append(Paragraph('<font color="#666666">────────────────────────────────────────</font>', styles["body"]))
                story.append(Spacer(1, 3 * mm))
            elif block["type"] == "heading":
                level = min(int(block["level"]), 3)
                story.append(Paragraph(block["html"], styles[f"h{level}"]))
                story.append(Spacer(1, 3 * mm))
            elif block["type"] == "paragraph":
                html = block["html"]
                if html.startswith("<center-block>") and html.endswith("</center-block>"):
                    html = html[len("<center-block>"):-len("</center-block>")]
                    story.append(Paragraph(html, styles["center"]))
                else:
                    story.append(Paragraph(html, styles["body"]))
                story.append(Spacer(1, 2 * mm))
            elif block["type"] == "manifest":
                story.append(Spacer(1, 1 * mm))
                for line_html, indent in block["lines"]:
                    line_style = ParagraphStyle(
                        "manifest",
                        parent=styles["body"],
                        leftIndent=indent * 0.6 * 12,
                        leading=16,
                        spaceAfter=0,
                    )
                    story.append(Paragraph(line_html, line_style))
                story.append(Spacer(1, 3 * mm))
            elif block["type"] == "code":
                story.append(XPreformatted(escape(block["text"]), styles["pre"]))
                story.append(Spacer(1, 3 * mm))

    def after_flowable(flowable):
        if isinstance(flowable, Paragraph) and getattr(flowable, "_toc_title", None):
            doc.notify("TOCEntry", (0, flowable._toc_title, doc.page, flowable._toc_key))

    doc.afterFlowable = after_flowable
    doc.multiBuild(story)


def main() -> int:
    parser = argparse.ArgumentParser(description="Export every marathon-lore log into one PDF.")
    parser.add_argument("--modules-dir", type=Path, default=DEFAULT_MODULES_DIR, help="Folder containing module JSON files")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="Output PDF path")
    args = parser.parse_args()

    if not args.modules_dir.exists():
        raise SystemExit(f"Modules directory not found: {args.modules_dir}")

    font_name = register_cjk_font()
    entries: list[LogEntry] = []

    for module_file in sorted(args.modules_dir.glob("*.json")):
        collect_logs(load_json(module_file), entries)

    if not entries:
        raise SystemExit("No logs found in module JSON files.")

    build_pdf(entries, args.output, font_name)
    print(f"Generated: {args.output}")
    print(f"Logs exported: {len(entries)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
