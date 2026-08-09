from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "source"
OUTPUT = SOURCE / "images" / "share-card.png"
PORTRAIT_OUTPUT = SOURCE / "images" / "share-card-portrait.png"

WIDTH, HEIGHT = 1200, 630
LANDSCAPE_OUTPUT_SIZE = (1920, 1008)
PORTRAIT_OUTPUT_SIZE = (1440, 1920)
ACID = (193, 254, 0)
WHITE = (246, 248, 244)
SOFT = (199, 207, 205)


def font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size)


def cover(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    scale = max(size[0] / image.width, size[1] / image.height)
    resized = image.resize(
        (round(image.width * scale), round(image.height * scale)),
        Image.Resampling.LANCZOS,
    )
    left = (resized.width - size[0]) // 2
    top = (resized.height - size[1]) // 2
    return resized.crop((left, top, left + size[0], top + size[1]))


def main() -> None:
    backdrop = Image.open(SOURCE / "images" / "lobby.webp").convert("RGB")
    backdrop = cover(backdrop, (WIDTH, HEIGHT))
    backdrop = ImageEnhance.Contrast(backdrop).enhance(1.12)
    backdrop = ImageEnhance.Color(backdrop).enhance(0.72)
    canvas = backdrop.convert("RGBA")

    shade = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    shade_draw = ImageDraw.Draw(shade)
    for x in range(WIDTH):
        strength = int(238 * (1 - x / WIDTH) ** 1.7)
        shade_draw.line((x, 0, x, HEIGHT), fill=(3, 7, 9, strength))
    shade_draw.rectangle((0, 0, WIDTH, HEIGHT), fill=(0, 0, 0, 22))
    for y in range(0, HEIGHT, 4):
        shade_draw.line((0, y, WIDTH, y), fill=(255, 255, 255, 8))
    canvas = Image.alpha_composite(canvas, shade)

    glow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.rectangle((0, 0, 13, HEIGHT), fill=(*ACID, 220))
    glow_draw.rectangle((46, 49, 655, 51), fill=(*ACID, 155))
    glow = glow.filter(ImageFilter.GaussianBlur(1.2))
    canvas = Image.alpha_composite(canvas, glow)

    draw = ImageDraw.Draw(canvas)
    maratype = SOURCE / "fonts" / "Maratype.otf"
    chinese_bold = Path(r"C:\Windows\Fonts\msyhbd.ttc")
    chinese = Path(r"C:\Windows\Fonts\msyh.ttc")

    draw.text((60, 35), "UESC // TAU CETI IV", font=font(maratype, 22), fill=ACID)
    draw.text((60, 102), "MARATHON", font=font(maratype, 112), fill=WHITE)
    draw.text((64, 218), "失落星船：马拉松", font=font(chinese_bold, 39), fill=WHITE)
    draw.text((65, 280), "中文资料站", font=font(chinese_bold, 39), fill=ACID)
    draw.text(
        (66, 355),
        "百科  /  新闻  /  阵营  /  互动地图  /  经典马拉松终端  /  社区内容",
        font=font(chinese, 21),
        fill=SOFT,
    )
    draw.line((66, 410, 600, 410), fill=(193, 254, 0, 105), width=1)
    draw.text(
        (66, 438),
        "ESCAPE WILL MAKE ME GOD",
        font=font(maratype, 31),
        fill=WHITE,
    )

    mark = Image.open(
        SOURCE / "marathon-lore" / "assets" / "images" / "icons" / "marathon-brand-mark.webp"
    ).convert("RGBA")
    mark.thumbnail((105, 105), Image.Resampling.LANCZOS)
    mark_alpha = mark.getchannel("A").point(lambda value: int(value * 0.92))
    mark.putalpha(mark_alpha)
    canvas.alpha_composite(mark, (1042, 55))

    draw = ImageDraw.Draw(canvas)
    draw.rectangle((58, 542, 365, 598), fill=ACID)
    draw.text(
        (73, 552),
        "MARATHON.UESC.TOP",
        font=font(maratype, 28),
        fill=(4, 8, 9),
    )
    draw.text((1003, 568), "白枭#9801 // 2026", font=font(chinese_bold, 17), fill=WHITE)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    landscape_output = canvas.convert("RGB").resize(
        LANDSCAPE_OUTPUT_SIZE, Image.Resampling.LANCZOS
    )
    landscape_output.save(OUTPUT, "PNG", optimize=True)
    print(
        f"Wrote {OUTPUT} "
        f"({LANDSCAPE_OUTPUT_SIZE[0]}x{LANDSCAPE_OUTPUT_SIZE[1]})"
    )

    portrait_width, portrait_height = 1080, 1440
    portrait_backdrop = Image.open(SOURCE / "images" / "lobby.webp").convert("RGB")
    portrait_backdrop = cover(portrait_backdrop, (portrait_width, portrait_height))
    portrait_backdrop = ImageEnhance.Contrast(portrait_backdrop).enhance(1.14)
    portrait_backdrop = ImageEnhance.Color(portrait_backdrop).enhance(0.68)
    portrait = portrait_backdrop.convert("RGBA")

    portrait_shade = Image.new("RGBA", portrait.size, (0, 0, 0, 0))
    portrait_shade_draw = ImageDraw.Draw(portrait_shade)
    for y in range(portrait_height):
        if y < 600:
            strength = int(220 * (1 - y / 600) ** 1.8)
        elif y > 820:
            strength = int(232 * ((y - 820) / (portrait_height - 820)) ** 1.45)
        else:
            strength = 28
        portrait_shade_draw.line(
            (0, y, portrait_width, y), fill=(3, 7, 9, min(strength, 232))
        )
    portrait_shade_draw.rectangle((0, 0, portrait_width, portrait_height), fill=(0, 0, 0, 18))
    for y in range(0, portrait_height, 4):
        portrait_shade_draw.line(
            (0, y, portrait_width, y), fill=(255, 255, 255, 8)
        )
    portrait = Image.alpha_composite(portrait, portrait_shade)

    portrait_glow = Image.new("RGBA", portrait.size, (0, 0, 0, 0))
    portrait_glow_draw = ImageDraw.Draw(portrait_glow)
    portrait_glow_draw.rectangle((0, 0, portrait_width, 14), fill=(*ACID, 225))
    portrait_glow_draw.rectangle((62, 96, 1018, 99), fill=(*ACID, 165))
    portrait_glow_draw.rectangle((62, 1095, 1018, 1098), fill=(*ACID, 140))
    portrait_glow = portrait_glow.filter(ImageFilter.GaussianBlur(1.2))
    portrait = Image.alpha_composite(portrait, portrait_glow)

    portrait_draw = ImageDraw.Draw(portrait)
    portrait_draw.text(
        (64, 47), "UESC // TAU CETI IV", font=font(maratype, 25), fill=ACID
    )
    portrait_draw.text((62, 132), "MARATHON", font=font(maratype, 148), fill=WHITE)
    portrait_draw.text(
        (67, 294), "失落星船：马拉松", font=font(chinese_bold, 49), fill=WHITE
    )
    portrait_draw.text((68, 371), "中文资料站", font=font(chinese_bold, 49), fill=ACID)

    portrait_mark = Image.open(
        SOURCE
        / "marathon-lore"
        / "assets"
        / "images"
        / "icons"
        / "marathon-brand-mark.webp"
    ).convert("RGBA")
    portrait_mark.thumbnail((128, 128), Image.Resampling.LANCZOS)
    portrait_mark_alpha = portrait_mark.getchannel("A").point(
        lambda value: int(value * 0.94)
    )
    portrait_mark.putalpha(portrait_mark_alpha)
    portrait.alpha_composite(portrait_mark, (884, 34))

    portrait_draw = ImageDraw.Draw(portrait)
    portrait_draw.text(
        (68, 978),
        "百科  /  新闻  /  阵营  /  互动地图",
        font=font(chinese, 27),
        fill=SOFT,
    )
    portrait_draw.text(
        (68, 1028),
        "经典马拉松终端  /  社区内容",
        font=font(chinese, 27),
        fill=SOFT,
    )
    portrait_draw.text(
        (68, 1140),
        "ESCAPE WILL MAKE ME GOD",
        font=font(maratype, 43),
        fill=WHITE,
    )
    portrait_draw.rectangle((58, 1268, 510, 1339), fill=ACID)
    portrait_draw.text(
        (78, 1280),
        "MARATHON.UESC.TOP",
        font=font(maratype, 38),
        fill=(4, 8, 9),
    )
    portrait_draw.text(
        (772, 1298), "白枭#9801 // 2026", font=font(chinese_bold, 20), fill=WHITE
    )
    portrait_draw.rectangle((62, 1356, 1018, 1358), fill=(*ACID, 100))
    portrait_draw.text(
        (62, 1373),
        "Somewhere in the heavens, they are waiting",
        font=font(maratype, 19),
        fill=SOFT,
    )

    portrait_output = portrait.convert("RGB").resize(
        PORTRAIT_OUTPUT_SIZE, Image.Resampling.LANCZOS
    )
    portrait_output.save(PORTRAIT_OUTPUT, "PNG", optimize=True)
    print(
        f"Wrote {PORTRAIT_OUTPUT} "
        f"({PORTRAIT_OUTPUT_SIZE[0]}x{PORTRAIT_OUTPUT_SIZE[1]})"
    )


if __name__ == "__main__":
    main()
