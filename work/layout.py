#!/usr/bin/env python
"""Page-layout helpers shared by the question croppers.

Every Digital SAT practice-test question starts with a grey header bar holding
the question number as WHITE text in a dark box. That white span is the only
reliable question-label signature: plain black digits on the page belong to
figures (axis ticks, fraction parts, table cells) and must be ignored.

Pages alternate between two left margins (36pt / 54pt). A page is either two
columns (each ~242pt wide) or, for a few wide questions, a single full-width
column (its header bar is wider than a normal column).

A module is treated as one continuous "flow" of column regions in reading
order (page by page, left column then right column). Question N's content is
everything in that flow from its label to label N+1, which may span a column
or page break.
"""
import io, re
import fitz
from PIL import Image, ImageChops

TOP, BOT = 104, 742          # content band (below running header, above footer)
COL_W = 256                  # left-column crop width from the margin (stops short
                             # of the dotted column divider at margin+261)
RIGHT_OFF = 272              # right-column start offset from the margin
PAGE_W = 534                 # full content width from the margin (+ slack)
WIDE_BAR = 280               # a header bar wider than this marks a full-width page


def page_sections(doc):
    """Map page index -> (section, module) using the directions pages."""
    out, sec, mod = {}, None, {"rw": 0, "math": 0}
    for i, pg in enumerate(doc):
        t = pg.get_text()
        if "important reading and writing skills" in t:
            sec = "rw"; mod["rw"] += 1
        elif "important math skills" in t:
            sec = "math"; mod["math"] += 1
        out[i] = (sec, mod[sec] if sec else 0)
    return out


def crosses_gutter(page, m):
    """True if text or figure content sits in the gap between the two columns
    (ignoring the dotted column divider at margin+261)."""
    band = fitz.Rect(m + 256, TOP, m + 270, BOT)
    for w in page.get_text("words"):
        if fitz.Rect(w[:4]).intersects(band):
            return True
    for d in page.get_drawings():
        r = d["rect"]
        is_divider = r.width < 2 and abs(r.x0 - (m + 261)) < 3
        if not is_divider and r.intersects(band):
            return True
    return False


def _bars(page):
    return [d["rect"] for d in page.get_drawings()
                    if d.get("fill") and 8 < d["rect"].height < 20 and d["rect"].width > 100
                    and min(d["fill"]) > 0.6]


def white_labels(page):
    """[(N, label_rect, bar_rect)] for the white question-number labels on a page."""
    bars = _bars(page)
    out = []
    for b in page.get_text("dict")["blocks"]:
        for l in b.get("lines", []):
            for s in l["spans"]:
                txt = s["text"].strip()
                if s["color"] != 0xFFFFFF or not re.fullmatch(r"\d+", txt):
                    continue
                r = fitz.Rect(s["bbox"])
                c = fitz.Point((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2)
                bar = next((br for br in bars if br.y0 - 2 <= c.y <= br.y1 + 2
                                        and br.x0 - 2 <= c.x <= br.x1), None)
                if bar is None:
                    bar = fitz.Rect(r.x0 - 6, r.y0 - 1, r.x0 + 236, r.y1 + 1)
                out.append((int(txt), r, bar))
    return out


class ModuleFlow:
    """Column regions of one (section, module), in reading order, plus labels."""

    def __init__(self, doc, section, module):
        self.doc = doc
        psec = page_sections(doc)
        pages = [i for i in range(doc.page_count) if psec[i] == (section, module)]
        labels_by_page = {i: white_labels(doc[i]) for i in pages}
        # Pages from the first labelled page up to and including the STOP page.
        first = next(i for i in pages if labels_by_page[i])
        self.pages = []
        for i in pages:
            if i < first:
                continue
            self.pages.append(i)
            if re.search(r"(?m)^\s*STOP\s*$", doc[i].get_text()):
                break
        margins = {}
        for i in self.pages:
            for _, _, bar in labels_by_page[i]:
                margins[i] = bar.x0 if bar.x0 < 200 else bar.x0 - (RIGHT_OFF + 6)
                break
        self.regions = []  # (page, Rect)
        for i in self.pages:
            m = margins.get(i, margins.get(i - 2, margins.get(i + 2, 36)))
            top = TOP
            if i == first:
                # The module's directions box sits above the first questions.
                top = min(bar.y0 for _, _, bar in labels_by_page[i]) - 4
            wide = any(bar.width > WIDE_BAR for _, _, bar in labels_by_page[i])
            if not labels_by_page[i] and crosses_gutter(doc[i], m):
                wide = True  # unlabelled continuation page laid out full-width
            if wide:
                self.regions.append((i, fitz.Rect(m - 6, top, m + PAGE_W, BOT)))
            else:
                self.regions.append((i, fitz.Rect(m - 6, top, m + COL_W, BOT)))
                self.regions.append((i, fitz.Rect(m + RIGHT_OFF, top, m + PAGE_W, BOT)))
        # Label positions in the flow: N -> (region index, y_top).
        self.labels = {}
        for ri, (pi, reg) in enumerate(self.regions):
            for N, lr, bar in labels_by_page[pi]:
                c = fitz.Point((lr.x0 + lr.x1) / 2, (lr.y0 + lr.y1) / 2)
                if reg.contains(c) and N not in self.labels:
                    self.labels[N] = (ri, bar.y0 - 4)
        self.end = self._stop_position()

    def _stop_position(self):
        """Flow position of the module's STOP marker (end of the last question)."""
        for ri in range(len(self.regions) - 1, -1, -1):
            pi, reg = self.regions[ri]
            for w in self.doc[pi].get_text("words", clip=reg):
                if w[4] == "STOP":
                    return (ri, w[1] - 4)
        ri = len(self.regions) - 1
        return (ri, self.regions[ri][1].y1)

    def numbers(self):
        return sorted(self.labels)

    def pieces(self, N, stop_y=None):
        """Clip rects [(page, Rect)] covering question N, in reading order.

        stop_y: optional callable(page, rect) -> y or None, to end the question early
        (e.g. at its first answer choice)."""
        start = self.labels[N]
        later = [self.labels[k] for k in self.labels if k > N]
        end = min(later) if later else self.end
        out = []
        for ri in range(start[0], end[0] + 1):
            pi, reg = self.regions[ri]
            y0 = start[1] if ri == start[0] else reg.y0
            y1 = end[1] if ri == end[0] else reg.y1
            if y1 - y0 < 10:
                continue
            r = fitz.Rect(reg.x0, y0, reg.x1, y1)
            if stop_y:
                sy = stop_y(pi, r)
                if sy is not None:
                    if sy - y0 >= 10:
                        out.append((pi, fitz.Rect(reg.x0, y0, reg.x1, sy)))
                    return out
            out.append((pi, r))
        return out

    def text(self, pieces, sort=False):
        """Text of the pieces, excluding the grey header bar (label number and
        stray glyphs drawn on it).

        Default is the PDF's content-stream order, which keeps accessibility
        markers ("Start referenced content: ...") next to the words they wrap;
        sort=True orders by position instead, which fixes pages whose stream
        emits the answer choices before the passage. Callers pick whichever
        yields a well-formed question."""
        out = []
        for pi, r in pieces:
            clip = fitz.Rect(r)
            for bar in _bars(self.doc[pi]):
                if bar.intersects(clip) and bar.y0 - 6 <= clip.y0 <= bar.y1:
                    clip.y0 = bar.y1 + 0.5
            out.append(self.doc[pi].get_text("text", clip=clip, sort=sort))
        return "\n".join(out)

    def render(self, pieces, zoom):
        imgs = []
        for pi, r in pieces:
            pix = self.doc[pi].get_pixmap(matrix=fitz.Matrix(zoom, zoom), clip=r)
            im = trim(Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB"))
            if im is not None:
                imgs.append(im)
        return stitch(imgs)


def trim(im, pad=8):
    """Crop surrounding whitespace; None if the image is blank."""
    bg = Image.new("RGB", im.size, "white")
    diff = ImageChops.difference(im, bg).convert("L").point(lambda v: 255 if v > 24 else 0)
    bbox = diff.getbbox()
    if not bbox:
        return None
    l, t, r, b = bbox
    return im.crop((max(0, l - pad), max(0, t - pad), min(im.width, r + pad), min(im.height, b + pad)))


def stitch(imgs, gap=14):
    imgs = [i for i in imgs if i is not None and i.height > 4]
    if not imgs:
        return None
    if len(imgs) == 1:
        return imgs[0]
    w = max(i.width for i in imgs)
    h = sum(i.height for i in imgs) + gap * (len(imgs) - 1)
    canvas = Image.new("RGB", (w, h), "white")
    y = 0
    for im in imgs:
        canvas.paste(im, (0, y))
        y += im.height + gap
    return canvas
