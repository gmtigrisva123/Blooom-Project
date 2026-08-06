"""Derive the Blooom app icons and Open Graph card from the master wordmark.

`public/blooom-logo.png` is the single source of truth — everything else in
public/ is generated from it, so re-run this after the logo ever changes:

    python3 scripts/generate-assets.py

Backdrop colours mirror the app shell: --bg-base #0a0a14 with a violet #8b5cf6
glow, the same pair used for background_color / theme_color in the manifest.
"""

import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public")

BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
REG = "/System/Library/Fonts/Supplemental/Arial.ttf"

INK = (10, 10, 20, 255)
GLOW = (139, 92, 246)

wordmark = Image.open(os.path.join(OUT, "blooom-logo.png")).convert("RGBA")
wordmark = wordmark.crop(wordmark.getbbox())

# The "B" is the first glyph; the column after it is fully transparent, so the
# split point can be found rather than hard-coded against one export.
alpha = wordmark.split()[3].load()
gap = next(
    x
    for x in range(1, wordmark.width)
    if all(alpha[x, y] <= 20 for y in range(wordmark.height))
)
mark = wordmark.crop((0, 0, gap, wordmark.height))
mark = mark.crop(mark.getbbox())
mark.save(os.path.join(OUT, "blooom-mark.png"))


def backdrop(size, radius_ratio=0.22, full_bleed=False):
    """Dark tile — rounded unless full_bleed — with a soft violet centre glow."""
    w, h = size
    ss = 4  # supersample so the rounded corners stay clean
    tile = Image.new("RGBA", (w * ss, h * ss), (0, 0, 0, 0))
    radius = 0 if full_bleed else int(min(w, h) * radius_ratio * ss)
    ImageDraw.Draw(tile).rounded_rectangle(
        [0, 0, w * ss - 1, h * ss - 1], radius=radius, fill=INK
    )
    tile = tile.resize((w, h), Image.LANCZOS)

    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    steps = 60
    for i in range(steps, 0, -1):
        t = i / steps
        r = min(w, h) * 0.62 * t
        gd.ellipse(
            [w / 2 - r, h / 2 - r, w / 2 + r, h / 2 + r],
            fill=(*GLOW, int(46 * (1 - t) ** 1.6)),
        )
    # Clip the glow to the tile so it never bleeds past the rounded corners.
    glow.putalpha(
        Image.composite(glow.split()[3], Image.new("L", (w, h), 0), tile.split()[3])
    )
    return Image.alpha_composite(tile, glow)


def app_icon(px, glyph_ratio, full_bleed=False):
    canvas = backdrop((px, px), full_bleed=full_bleed)
    target = px * glyph_ratio
    scale = min(target / mark.width, target / mark.height)
    glyph = mark.resize(
        (max(1, round(mark.width * scale)), max(1, round(mark.height * scale))),
        Image.LANCZOS,
    )
    canvas.alpha_composite(glyph, ((px - glyph.width) // 2, (px - glyph.height) // 2))
    return canvas


app_icon(32, 0.72).save(f"{OUT}/favicon-32.png")
app_icon(192, 0.62).save(f"{OUT}/icon-192.png")
app_icon(512, 0.62).save(f"{OUT}/icon-512.png")
# iOS ignores transparency and composites onto black, so flatten it here.
app_icon(180, 0.62).convert("RGB").save(f"{OUT}/apple-touch-icon.png")
# Maskable icons get cropped to a circle by Android — keep the mark well inside
# the 80% safe zone and let the backdrop run edge to edge.
app_icon(512, 0.42, full_bleed=True).save(f"{OUT}/icon-maskable-512.png")

# ---------------------------------------------------------------------------
# Open Graph card (1200x630) — what Facebook/Zalo/LinkedIn show when shared.
# ---------------------------------------------------------------------------
W, H = 1200, 630
PAD = 88


def mix(base, rgb, amount):
    return tuple(round(base[i] + (rgb[i] - base[i]) * amount) for i in range(3))


def washes(size, spots):
    """Ink base lit by soft radial washes — `spots` is (cx, cy, radius, rgb)."""
    w, h = size
    layer = Image.new("RGBA", (w, h), INK)
    for cx, cy, radius, rgb in spots:
        glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        gd = ImageDraw.Draw(glow)
        steps = 64
        for i in range(steps, 0, -1):
            t = i / steps
            r = radius * t
            gd.ellipse(
                [cx - r, cy - r, cx + r, cy + r], fill=(*rgb, int(30 * (1 - t) ** 1.7))
            )
        layer = Image.alpha_composite(layer, glow)
    return layer


og = washes(
    (W, H),
    (
        (150, 60, 760, (139, 92, 246)),  # violet behind the wordmark
        (1120, 640, 620, (249, 115, 22)),  # warm counterweight, bottom right
    ),
)

# The wordmark carries the branding on its own — no lockup text beside it.
logo_w = 448
logo = wordmark.resize((logo_w, round(wordmark.height * logo_w / wordmark.width)), Image.LANCZOS)
og.alpha_composite(logo, (PAD, 52))

d = ImageDraw.Draw(og)
d.text((PAD + 4, 216), "Học nhóm • Tập trung • Tiến bộ", font=ImageFont.truetype(REG, 30),
       fill=(176, 170, 208))
d.text((PAD, 300), "Nền tảng nhóm học tập tương tác", font=ImageFont.truetype(BOLD, 56),
       fill=(255, 255, 255))
d.text((PAD, 374), "cho học sinh & sinh viên", font=ImageFont.truetype(BOLD, 56),
       fill=(255, 255, 255))

# Feature pills, tinted with the real section accents from src/constants/nav.js.
pill_font = ImageFont.truetype(REG, 27)
PILL_TOP, PILL_BOT = 486, 558
x = PAD
for label, accent in (
    ("Nhóm học tập", (139, 92, 246)),
    ("Pomodoro", (249, 115, 22)),
    ("Hiệu suất", (16, 185, 129)),
    ("Ghi chú", (6, 182, 212)),
):
    # Measure the real glyph box so Vietnamese diacritics never touch the edge.
    box = d.textbbox((0, 0), label, font=pill_font)
    text_w, text_h = box[2] - box[0], box[3] - box[1]
    width = text_w + 78
    mid = (PILL_TOP + PILL_BOT) / 2
    d.rounded_rectangle(
        [x, PILL_TOP, x + width, PILL_BOT],
        (PILL_BOT - PILL_TOP) / 2,
        fill=mix(INK[:3], accent, 0.15),
        outline=mix(INK[:3], accent, 0.5),
        width=2,
    )
    d.ellipse([x + 26, mid - 6, x + 38, mid + 6], fill=accent)
    d.text((x + 52 - box[0], mid - text_h / 2 - box[1]), label, font=pill_font, fill=accent)
    x += width + 16

og.convert("RGB").save(f"{OUT}/og-image.png", optimize=True)

print("\n".join(sorted(os.listdir(OUT))))
