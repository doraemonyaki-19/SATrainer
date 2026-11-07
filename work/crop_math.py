#!/usr/bin/env python
"""Crop each Digital SAT Math question into an image (equations/figures preserved
exactly), to be paired with the answer key's correct answer + rationale.

Questions are located by their white question-number labels (see layout.py) and
cropped across column/page breaks, so wide questions and questions whose answer
choices continue in the next column come out whole.
"""
import fitz, os, sys
import layout as L

ZOOM = 2.6


def crop_module(doc, test, module, outdir):
    """Return [(N, image_path, text)] for every question in a math module."""
    flow = L.ModuleFlow(doc, "math", module)
    results = []
    for N in flow.numbers():
        pieces = flow.pieces(N)
        img = flow.render(pieces, ZOOM)
        if img is None:
            continue
        fname = f"t{test}-m{module}-{N}.png"
        img.save(os.path.join(outdir, fname))
        results.append((N, f"assets/math/{fname}", flow.text(pieces)))
    return results


if __name__ == "__main__":
    test = sys.argv[1] if len(sys.argv) > 1 else "4"
    outdir = "assets/math"
    os.makedirs(outdir, exist_ok=True)
    doc = fitz.open(f"pdfs/sat-practice-test-{test}-digital.pdf")
    total = 0
    for module in (1, 2):
        res = crop_module(doc, test, module, outdir)
        total += len(res)
        print(f"Test {test} math m{module}: {[r[0] for r in res]}")
    print(f"Test {test}: cropped {total} math question images")
