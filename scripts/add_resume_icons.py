#!/usr/bin/env python3
"""Add LinkedIn and website icon links to top-right of PDF first page."""

import io
import shutil

import fitz
from PIL import Image, ImageDraw, ImageFont


def make_linkedin_icon(size: int = 32) -> bytes:
    img = Image.new("RGBA", (size, size), (10, 102, 194, 255))
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", size // 2)
    except OSError:
        font = ImageFont.load_default()
    text = "in"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(((size - tw) // 2, (size - th) // 2 - 1), text, fill=(255, 255, 255, 255), font=font)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def make_web_icon(size: int = 32) -> bytes:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    pad = 4
    draw.ellipse([pad, pad, size - pad, size - pad], outline=(60, 60, 60, 255), width=2)
    cx = size // 2
    draw.line([(cx, pad), (cx, size - pad)], fill=(60, 60, 60, 255), width=1)
    draw.arc([pad, pad, size - pad, size - pad], 200, 340, fill=(60, 60, 60, 255), width=1)
    draw.arc([pad, pad, size - pad, size - pad], 20, 160, fill=(60, 60, 60, 255), width=1)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def main() -> None:
    src = "/Users/sshanbhag/Desktop/Sonali_Shanbhag_-_Software_Engineer-2.pdf"
    backup = "/Users/sshanbhag/Desktop/Sonali_Shanbhag_-_Software_Engineer-2.backup.pdf"

    linkedin_url = "https://www.linkedin.com/in/sonali-shanbhag-b73052180/"
    website_url = "https://sonalishanbhag.com"

    shutil.copy2(src, backup)

    out = src + ".tmp.pdf"

    doc = fitz.open(src)
    page = doc[0]
    w, h = page.rect.width, page.rect.height

    icon_px = 22
    gap = 8
    margin = 36
    total_w = icon_px * 2 + gap
    x0 = w - margin - total_w
    y0 = margin

    # Left to right: LinkedIn, then website (at outer edge)
    li_rect = fitz.Rect(x0, y0, x0 + icon_px, y0 + icon_px)
    web_rect = fitz.Rect(x0 + icon_px + gap, y0, x0 + total_w, y0 + icon_px)

    web_png = make_web_icon(icon_px)
    li_png = make_linkedin_icon(icon_px)

    page.insert_image(li_rect, stream=li_png)
    page.insert_image(web_rect, stream=web_png)

    page.insert_link({"kind": fitz.LINK_URI, "from": li_rect, "uri": linkedin_url})
    page.insert_link({"kind": fitz.LINK_URI, "from": web_rect, "uri": website_url})

    doc.save(out, incremental=False, deflate=True, garbage=4)
    doc.close()
    shutil.move(out, src)
    print(f"Updated: {src}")
    print(f"Original saved as: {backup}")


if __name__ == "__main__":
    main()
