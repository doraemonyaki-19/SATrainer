#!/usr/bin/env python
"""Generate a proper macOS .icns app icon for SATrainer (plus a 1024 PNG master).

Draws a Big-Sur-style rounded square in the app's accent blue with "SAT" and a
rising-bars motif (echoing the mastery bars), then packs a multi-resolution
.icns container directly (no macOS iconutil needed).
"""
import io, os, struct
from PIL import Image, ImageDraw, ImageFont

S = 1024
os.makedirs("build", exist_ok=True)

def load_font(size):
    for p in ("C:/Windows/Fonts/arialbd.ttf", "C:/Windows/Fonts/segoeuib.ttf",
              "C:/Windows/Fonts/Arialbd.ttf"):
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()

def make_master():
    # vertical gradient
    top, bot = (86, 148, 255), (43, 95, 208)
    grad = Image.new("RGBA", (S, S))
    px = grad.load()
    for y in range(S):
        t = y / S
        c = tuple(int(top[i] + (bot[i] - top[i]) * t) for i in range(3))
        for x in range(S):
            px[x, y] = c + (255,)
    # rounded-square mask
    mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(mask).rounded_rectangle([40, 40, S - 40, S - 40], radius=210, fill=255)
    icon = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    icon.paste(grad, (0, 0), mask)

    d = ImageDraw.Draw(icon)
    # "SAT" wordmark
    font = load_font(300)
    text = "SAT"
    bb = d.textbbox((0, 0), text, font=font)
    tw, th = bb[2] - bb[0], bb[3] - bb[1]
    tx = (S - tw) / 2 - bb[0]
    ty = 250 - bb[1]
    d.text((tx + 6, ty + 8), text, font=font, fill=(20, 40, 90, 90))  # soft shadow
    d.text((tx, ty), text, font=font, fill=(255, 255, 255, 255))

    # rising bars (mastery motif)
    heights = [120, 180, 240, 300]
    bw, gap = 96, 44
    total = len(heights) * bw + (len(heights) - 1) * gap
    x0 = (S - total) // 2
    base = 810
    for i, h in enumerate(heights):
        x = x0 + i * (bw + gap)
        d.rounded_rectangle([x, base - h, x + bw, base], radius=20, fill=(255, 255, 255, 235))
    return icon

def png_bytes(img, size):
    buf = io.BytesIO()
    img.resize((size, size), Image.LANCZOS).save(buf, format="PNG")
    return buf.getvalue()

def write_icns(master, path):
    # OSType -> pixel size for PNG-encoded icon chunks
    types = {
        b"icp4": 16, b"icp5": 32, b"icp6": 64,
        b"ic07": 128, b"ic08": 256, b"ic09": 512, b"ic10": 1024,
        b"ic11": 32, b"ic12": 64, b"ic13": 256, b"ic14": 512,
    }
    chunks = b""
    for ostype, size in types.items():
        data = png_bytes(master, size)
        chunks += ostype + struct.pack(">I", len(data) + 8) + data
    body = b"icns" + struct.pack(">I", len(chunks) + 8) + chunks
    with open(path, "wb") as f:
        f.write(body)

if __name__ == "__main__":
    master = make_master()
    master.save("build/icon.png")           # for electron-builder fallback / preview
    write_icns(master, "build/icon.icns")    # macOS
    master.save("build/icon.ico", sizes=[(16, 16), (24, 24), (32, 32), (48, 48),
                                         (64, 64), (128, 128), (256, 256)])  # Windows
    print("wrote build/icon.png, build/icon.icns, build/icon.ico")
