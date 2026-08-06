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
og = backdrop((W, H), full_bleed=True)

logo_w = int(W * 0.56)
logo = wordmark.resize((logo_w, round(wordmark.height * logo_w / wordmark.width)), Image.LANCZOS)
og.alpha_composite(logo, ((W - logo.width) // 2, int(H * 0.28) - logo.height // 2))

d = ImageDraw.Draw(og)
for text, font, y, fill in (
    ("Học nhóm • Tập trung • Tiến bộ", ImageFont.truetype(BOLD, 44), 400, (245, 243, 255)),
    (
        "Nền tảng nhóm học tập tương tác cho học sinh & sinh viên",
        ImageFont.truetype(REG, 32),
        478,
        (167, 160, 200),
    ),
):
    # Measure the real glyph box so Vietnamese diacritics stay centred.
    width = d.textbbox((0, 0), text, font=font)[2]
    d.text(((W - width) / 2, y), text, font=font, fill=fill)

og.convert("RGB").save(f"{OUT}/og-image.png", optimize=True)

print("\n".join(sorted(os.listdir(OUT))))
