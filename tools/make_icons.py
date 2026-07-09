#!/usr/bin/env python3
"""Generate LOOP extension icons from the BetterWayAI brand mark.

The mark: navy (#0C2448) rounded square (corner radius ~13.5% of side),
gold (#F5A623) border (~3.8% of side), gold round-cap up-arrow.
Rendered at 1024px and downscaled with Lanczos for crisp small sizes.

Usage:  python3 tools/make_icons.py
Writes: extension/icons/{16,48,128}.png
"""
from pathlib import Path

from PIL import Image, ImageDraw

NAVY = (12, 36, 72, 255)     # #0C2448 — brand logo navy
GOLD = (245, 166, 35, 255)   # #F5A623 — brand gold

S = 1024
OUT = Path(__file__).resolve().parent.parent / "extension" / "icons"


def round_cap_line(draw, p1, p2, width):
    draw.line([p1, p2], fill=GOLD, width=width)
    r = width / 2
    for x, y in (p1, p2):
        draw.ellipse([x - r, y - r, x + r, y + r], fill=GOLD)


def main():
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    radius = 0.135 * S
    border = 0.038 * S

    # Navy rounded square
    d.rounded_rectangle([0, 0, S - 1, S - 1], radius=radius, fill=NAVY)

    # Gold border, inset so the stroke sits fully inside the square
    inset = border / 2
    d.rounded_rectangle(
        [inset, inset, S - 1 - inset, S - 1 - inset],
        radius=radius - inset,
        outline=GOLD,
        width=round(border),
    )

    # Gold up-arrow with round caps
    w = round(0.085 * S)
    cx = S / 2
    tip_y = 0.30 * S
    tail_y = 0.70 * S
    head_dx = 0.155 * S
    head_y = tip_y + 0.185 * S
    round_cap_line(d, (cx, tail_y), (cx, tip_y), w)
    round_cap_line(d, (cx, tip_y), (cx - head_dx, head_y), w)
    round_cap_line(d, (cx, tip_y), (cx + head_dx, head_y), w)

    OUT.mkdir(parents=True, exist_ok=True)
    for size in (16, 48, 128):
        img.resize((size, size), Image.LANCZOS).save(OUT / f"{size}.png")
        print(f"wrote {OUT / f'{size}.png'}")


if __name__ == "__main__":
    main()
