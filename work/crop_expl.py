#!/usr/bin/env python
"""Crop each Math answer explanation from the answer-key PDF into an image
(equations preserved), since the plain-text explanations are garbled. Answer
pages are single-column with QUESTION N headings; explanations that run past a
page break are stitched with the top of the next page.
"""
import fitz, re, io, os
from PIL import Image, ImageChops

ZOOM = 2.4
X0, X1 = 48, 566
CONTENT_TOP, CONTENT_BOTTOM = 63, 736

def secmod(pg):
    m = re.search(r"(READING AND WRITING|MATH): MODULE (\d)", pg.get_text())
    if not m:
        return (None, None)
    return ("math" if "MATH" in m.group(1) else "rw", int(m.group(2)))

def heads(pg):
    hs = []
    for b in pg.get_text("dict")["blocks"]:
        if "lines" not in b:
            continue
        txt = "".join(s["text"] for l in b["lines"] for s in l["spans"]).strip()
        m = re.match(r"QUESTION (\d+)\b", txt)
        if m:
            hs.append((int(m.group(1)), b["bbox"][1]))
    hs.sort(key=lambda h: h[1])
    return hs

def render(pg, rect):
    pix = pg.get_pixmap(matrix=fitz.Matrix(ZOOM, ZOOM), clip=rect)
    return Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")

def trim(im):
    bg = Image.new("RGB", im.size, "white")
    bbox = ImageChops.difference(im, bg).getbbox()
    if not bbox:
        return im
    # pad a few px
    l, t, r, b = bbox
    return im.crop((max(0, l - 6), max(0, t - 6), min(im.width, r + 6), min(im.height, b + 6)))

def stitch(imgs):
    imgs = [i for i in imgs if i.height > 4]
    if not imgs:
        return None
    if len(imgs) == 1:
        return imgs[0]
    w = max(i.width for i in imgs)
    h = sum(i.height for i in imgs) + 8 * (len(imgs) - 1)
    canvas = Image.new("RGB", (w, h), "white")
    y = 0
    for im in imgs:
        canvas.paste(im, (0, y))
        y += im.height + 8
    return canvas

def crop_math_explanations(answer_pdf, test, outdir):
    doc = fitz.open(answer_pdf)
    pages = []  # (page_index, module, heads)
    for i in range(doc.page_count):
        sec, mod = secmod(doc[i])
        if sec == "math":
            pages.append((i, mod, heads(doc[i])))
    out = {}
    for idx, (pi, mod, hs) in enumerate(pages):
        for j, (num, y0) in enumerate(hs):
            y_top = max(CONTENT_TOP, y0 - 4)
            if j + 1 < len(hs):
                img = trim(render(doc[pi], fitz.Rect(X0, y_top, X1, hs[j + 1][1] - 6)))
            else:
                parts = [trim(render(doc[pi], fitz.Rect(X0, y_top, X1, CONTENT_BOTTOM)))]
                if idx + 1 < len(pages):
                    npi, nmod, nhs = pages[idx + 1]
                    if nmod == mod:
                        cont_bot = (nhs[0][1] - 6) if nhs else CONTENT_BOTTOM
                        if cont_bot > CONTENT_TOP + 12:  # real continuation exists
                            parts.append(trim(render(doc[npi], fitz.Rect(X0, CONTENT_TOP, X1, cont_bot))))
                img = stitch(parts)
            if img is None:
                continue
            fname = f"e-t{test}-m{mod}-{num}.png"
            img.save(os.path.join(outdir, fname))
            out[(mod, num)] = f"assets/math/{fname}"
    return out

if __name__ == "__main__":
    import sys
    t = sys.argv[1] if len(sys.argv) > 1 else "4"
    os.makedirs("assets/math", exist_ok=True)
    d = crop_math_explanations(f"pdfs/sat-practice-test-{t}-answers-digital.pdf", t, "assets/math")
    print(f"Test {t}: cropped {len(d)} explanation images")
