"""Generate StudyHub brand assets (app icons + Open Graph image).

Colours mirror the .brand-mark gradient in src/styles/layout.css:
violet #8b5cf6 -> pink #ec4899 -> orange #f97316
"""

import os
from PIL import Image, ImageDraw, ImageFont

OUT = "/Users/macbook/Downloads/Blooom/public"
os.makedirs(OUT, exist_ok=True)

BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
BLACK = "/System/Library/Fonts/Supplemental/Arial Black.ttf"
REG = "/System/Library/Fonts/Supplemental/Arial.ttf"

STOPS = [(0.0, (139, 92, 246)), (0.55, (236, 72, 153)), (1.0, (249, 115, 22))]
INK = (10, 10, 20)


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def stop_color(t):
    t = max(0.0, min(1.0, t))
    for i in range(len(STOPS) - 1):
        p0, c0 = STOPS[i]
        p1, c1 = STOPS[i + 1]
        if p0 <= t <= p1:
            return lerp(c0, c1, (t - p0) / (p1 - p0))
    return STOPS[-1][1]


def diagonal_gradient(size):
    """135deg gradient, same direction as the CSS."""
    w, h = size
    img = Image.new("RGB", size)
    px = img.load()
    for y in range(h):
        for x in range(w):
            px[x, y] = stop_color((x / max(1, w - 1) + y / max(1, h - 1)) / 2)
    return img


def rounded_mask(size, radius):
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], radius, fill=255)
    return mask


def centered_letter(img, letter, font_path, ratio, fill=(255, 255, 255)):
    d = ImageDraw.Draw(img)
    font = ImageFont.truetype(font_path, int(img.height * ratio))
    box = d.textbbox((0, 0), letter, font=font)
    d.text(
        ((img.width - (box[2] - box[0])) / 2 - box[0],
         (img.height - (box[3] - box[1])) / 2 - box[1]),
        letter, font=font, fill=fill,
    )


def app_icon(px, pad_ratio=0.0, radius_ratio=0.22):
    """Square icon. pad_ratio > 0 leaves the safe zone maskable icons need."""
    canvas = Image.new("RGBA", (px, px), (0, 0, 0, 0))
    pad = int(px * pad_ratio)
    inner = px - pad * 2
    tile = diagonal_gradient((inner, inner)).convert("RGBA")
    tile.putalpha(rounded_mask((inner, inner), int(inner * radius_ratio)))
    centered_letter(tile, "S", BLACK, 0.62)
    if pad:
        bg = Image.new("RGBA", (px, px), (139, 92, 246, 255))
        bg.alpha_composite(tile, (pad, pad))
        return bg
    canvas.alpha_composite(tile)
    return canvas


for size in (32, 180, 192, 512):
    app_icon(size).save(f"{OUT}/icon-{size}.png")

# Maskable icons get cropped to a circle by Android — keep the mark inside 80%.
app_icon(512, pad_ratio=0.12, radius_ratio=0.28).save(f"{OUT}/icon-maskable-512.png")
os.rename(f"{OUT}/icon-180.png", f"{OUT}/apple-touch-icon.png")
os.rename(f"{OUT}/icon-32.png", f"{OUT}/favicon-32.png")

# ---------------------------------------------------------------------------
# Open Graph card (1200x630) — what Facebook/Zalo/Twitter show when shared.
# ---------------------------------------------------------------------------
W, H = 1200, 630
og = Image.new("RGB", (W, H), INK)
d = ImageDraw.Draw(og)

# Soft brand glow in the corners.
for cx, cy, rad, col in ((90, 40, 620, (139, 92, 246)), (1130, 620, 560, (249, 115, 22))):
    glow = Image.new("RGB", (W, H), INK)
    gd = ImageDraw.Draw(glow)
    for i in range(38, 0, -1):
        r = rad * i / 38
        gd.ellipse([cx - r, cy - r, cx + r, cy + r], fill=lerp(INK, col, 0.020 * (38 - i) / 38 + 0.006))
    og = Image.blend(og, glow, 0.85)
    d = ImageDraw.Draw(og)

mark = app_icon(132)
og.paste(mark, (88, 92), mark)

d.text((248, 108), "StudyHub", font=ImageFont.truetype(BLACK, 66), fill=(255, 255, 255))
d.text((250, 186), "Học nhóm • Tập trung • Tiến bộ", font=ImageFont.truetype(REG, 30), fill=(185, 186, 214))

d.text((88, 300), "Nền tảng nhóm học tập tương tác", font=ImageFont.truetype(BOLD, 54), fill=(255, 255, 255))
d.text((88, 366), "cho học sinh & sinh viên", font=ImageFont.truetype(BOLD, 54), fill=(255, 255, 255))

feat_font = ImageFont.truetype(REG, 27)
PILL_TOP, PILL_BOT = 462, 534
x = 88
for label, col in (
    ("Nhóm học tập", (167, 139, 250)),
    ("Pomodoro", (251, 146, 60)),
    ("Hiệu suất", (52, 211, 153)),
    ("Ghi chú", (34, 211, 238)),
):
    # Measure the real glyph box so Vietnamese diacritics never touch the edge.
    box = d.textbbox((0, 0), label, font=feat_font)
    text_w, text_h = box[2] - box[0], box[3] - box[1]
    w = text_w + 76
    mid = (PILL_TOP + PILL_BOT) / 2
    d.rounded_rectangle(
        [x, PILL_TOP, x + w, PILL_BOT], (PILL_BOT - PILL_TOP) / 2,
        fill=lerp(INK, col, 0.16), outline=lerp(INK, col, 0.55), width=2,
    )
    d.ellipse([x + 24, mid - 6, x + 36, mid + 6], fill=col)
    d.text((x + 50 - box[0], mid - text_h / 2 - box[1]), label, font=feat_font, fill=col)
    x += w + 16

og.save(f"{OUT}/og-image.png", optimize=True)

print("\n".join(sorted(os.listdir(OUT))))
