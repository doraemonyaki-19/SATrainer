#!/usr/bin/env python
"""Crop each Digital SAT Math question into an image (equations/figures preserved
exactly), to be paired with the answer key's correct answer + rationale.

Two-column pages: questions are segmented by column x-bounds and the y-range
between consecutive question-number blocks.
"""
import fitz, re, os, sys

ZOOM = 2.6
COL_SEP = 294
LEFT_X = (30, 291)
RIGHT_X = (312, 582)
Y_TOP_MIN, Y_BOT_MAX = 96, 746

def page_sections(doc):
    """Map page index -> (section, module) via directions pages."""
    out = {}
    sec, mod = None, {"rw": 0, "math": 0}
    for i, pg in enumerate(doc):
        t = pg.get_text()
        if "important reading and writing skills" in t:
            sec = "rw"; mod["rw"] += 1
        elif "important math skills" in t:
            sec = "math"; mod["math"] += 1
        out[i] = (sec, mod[sec] if sec else 0)
    return out

def num_blocks(page):
    """Return list of (col, y0, N) for question-number blocks on the page."""
    out = []
    for b in page.get_text("dict")["blocks"]:
        if "lines" not in b:
            continue
        txt = "".join(s["text"] for l in b["lines"] for s in l["spans"]).strip()
        if not re.fullmatch(r"\d+", txt):
            continue
        N = int(txt)
        x0, y0, x1, y1 = b["bbox"]
        if not (1 <= N <= 45):
            continue
        if not (Y_TOP_MIN < y0 < Y_BOT_MAX):
            continue
        if (x1 - x0) > 45:  # a real number label is narrow
            continue
        col = "L" if x0 < COL_SEP else "R"
        out.append((col, y0, N))
    return out

def gather_module(doc, psec, module):
    """Return ordered list of (page_index, col, y0, N) candidates for a module,
    in reading order (each page: left column then right column, top to bottom)."""
    cands = []
    for i in range(doc.page_count):
        sec, mod = psec[i]
        if sec != "math" or mod != module:
            continue
        nums = num_blocks(doc[i])
        for col in ("L", "R"):
            for y0, N in sorted([(y, N) for c, y, N in nums if c == col]):
                cands.append((i, col, y0, N))
    return cands

def filter_monotonic(cands):
    """Keep only strictly increasing question numbers (drops stray numbers that
    appear inside question content)."""
    kept, last = [], 0
    for c in cands:
        N = c[3]
        if N > last and N <= last + 15:
            kept.append(c)
            last = N
    return kept

def crop_module(doc, test, module, kept, outdir):
    """Crop each kept question; y-range runs to the next kept number in the same
    page+column."""
    results = []
    for idx, (pi, col, y0, N) in enumerate(kept):
        page = doc[pi]
        xr = LEFT_X if col == "L" else RIGHT_X
        # next kept number in the same page + column bounds the bottom
        y_bot = Y_BOT_MAX
        for pj, cj, yj, Nj in kept[idx + 1:]:
            if pj == pi and cj == col:
                y_bot = yj - 6
                break
            if pj != pi:
                break
        rect = fitz.Rect(xr[0], max(Y_TOP_MIN, y0 - 6), xr[1], y_bot)
        pix = page.get_pixmap(matrix=fitz.Matrix(ZOOM, ZOOM), clip=rect)
        fname = f"t{test}-m{module}-{N}.png"
        pix.save(os.path.join(outdir, fname))
        text = page.get_text("text", clip=rect)
        results.append((N, f"assets/math/{fname}", text))
    return results

if __name__ == "__main__":
    test = sys.argv[1] if len(sys.argv) > 1 else "4"
    outdir = "assets/math"
    os.makedirs(outdir, exist_ok=True)
    doc = fitz.open(f"pdfs/sat-practice-test-{test}-digital.pdf")
    psec = page_sections(doc)
    total = 0
    for module in (1, 2):
        cands = gather_module(doc, psec, module)
        kept = filter_monotonic(cands)
        res = crop_module(doc, test, module, kept, outdir)
        total += len(res)
        print(f"Test {test} math m{module}: {[r[0] for r in res]}")
    print(f"Test {test}: cropped {total} math question images")
