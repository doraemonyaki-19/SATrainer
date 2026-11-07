#!/usr/bin/env python
"""Parse College Board Digital SAT practice-test PDFs (main + answer key) into
structured questions for the SATrainer app.

Main PDF gives: question text, blank markers, and A)-D) choices.
Answer PDF gives: correct choice letter (or SPR answer) + per-choice rationale.
We join them by (section, module, question number).

R&W extracts cleanly; math is assessed separately (figures/equations are lossy).
"""
import fitz, re, json, glob, os, sys

PDF_DIR = "pdfs"
OUT_DIR = "work"

NOISE = [
    r"^Unauthorized copying or reuse.*$",
    r"^CONTINUE\s*$", r"^STOP\s*$", r"^DIRECTIONS\s*$",
    r"^Module\s*$", r"^\s*$",
    r"^===PAGE \d+===$",
    # Rule/leader lines only. (A line that merely *starts* with a blank, e.g.
    # "_______ tug-of-war as an official Olympic event!", is content.)
    r"^\.{5,}.*$", r"^-{3,}.*$", r"^_{3,}\s*$",
    r"^The questions in this section.*$",
    r"^Read each passage.*$", r"^All questions in this section.*$",
    r"^single best answer.*$", r"^and question carefully.*$",
    r"^question includes one or more passages.*$",
]
NOISE_RE = [re.compile(p) for p in NOISE]

def clean_symbols(s):
    reps = [
        ("percent sign", "%"), ("dollar sign", "$"),
        ("greater than or equal to", "≥"), ("less than or equal to", "≤"),
        ("greater than", ">"), ("less than", "<"),
        ("plus or minus", "±"), ("square root", "√"),
        ("infinity", "∞"), ("pi ", "π "),
        ("degrees", "°"),
    ]
    for a, b in reps:
        s = s.replace(a, b)
    return s

def read_pages(path):
    d = fitz.open(path)
    return [p.get_text() for p in d]

def full_text(path):
    return "\n".join(read_pages(path))

# ---------------------------------------------------------------------------
# MAIN test parsing
# ---------------------------------------------------------------------------
DIRECTIONS_RE = re.compile(r"important (reading and writing|math) skills")

def split_regions(text):
    """Return list of (section, module, region_text) split on directions blocks."""
    lines = text.split("\n")
    marks = []  # (index, section)
    for i, ln in enumerate(lines):
        m = DIRECTIONS_RE.search(ln)
        if m:
            sec = "rw" if "reading" in m.group(1) else "math"
            marks.append((i, sec))
    regions = []
    for k, (idx, sec) in enumerate(marks):
        end = marks[k + 1][0] if k + 1 < len(marks) else len(lines)
        # module number = 1 for first of each section, 2 for second
        prior_same = sum(1 for j in range(k) if marks[j][1] == sec)
        module = prior_same + 1
        regions.append((sec, module, "\n".join(lines[idx + 1:end])))
    return regions

def is_noise(ln):
    return any(r.match(ln) for r in NOISE_RE)

def has_choice_group(lines, start, end):
    found = set()
    for ln in lines[start:end]:
        m = re.match(r"\s*([ABCD])\)", ln)
        if m:
            found.add(m.group(1))
    return {"A", "B", "C", "D"} <= found

def parse_region_questions(region_text):
    """Split a module region into raw question blocks keyed by the printed number.

    Robust to two-column extraction scrambling: we accept a bare integer 1..45 as
    a question boundary only when (a) it is not a module header or footer page
    number and (b) a full A-D choice group follows it before the next candidate.
    Numbers must be monotonically increasing but gaps are tolerated, so a single
    scrambled/missing question does not derail the rest of the module.
    """
    lines = region_text.split("\n")
    n = len(lines)
    cands = []
    for i, ln in enumerate(lines):
        s = ln.strip()
        if not re.fullmatch(r"\d+", s):
            continue
        N = int(s)
        if not (1 <= N <= 45):
            continue
        prev = lines[i - 1].strip() if i > 0 else ""
        prev2 = lines[i - 2].strip() if i > 1 else ""
        nxt = lines[i + 1].strip() if i + 1 < n else ""
        nxt2 = lines[i + 2].strip() if i + 2 < n else ""
        if prev == "Module":
            continue
        if ("Unauthorized" in prev or "Unauthorized" in prev2
                or nxt in ("CONTINUE", "STOP") or nxt2 in ("CONTINUE", "STOP")):
            continue
        cands.append((i, N))

    sel = []
    expected = 1
    for idx, (i, N) in enumerate(cands):
        nxt_i = cands[idx + 1][0] if idx + 1 < len(cands) else n
        if N >= expected and has_choice_group(lines, i + 1, nxt_i):
            sel.append((i, N))
            expected = N + 1

    blocks = {}
    for k, (i, N) in enumerate(sel):
        end = sel[k + 1][0] if k + 1 < len(sel) else n
        blocks[N] = lines[i + 1:end]
    return blocks

def _spaced(word):
    return r"\s*".join(re.escape(c) for c in word)

START_REF_RE = re.compile(
    _spaced("Start") + r"\s+" + _spaced("referenced") + r"\s+" + _spaced("content") + r"\s*:?",
    re.I)
END_REF_RE = re.compile(
    _spaced("End") + r"\s+" + _spaced("referenced") + r"\s+" + _spaced("content") + r"\s*[.:]?",
    re.I)

# Module-end boilerplate that the last question's final choice swallows.
CHOICE_TAIL_RE = re.compile(
    r"\s*(If you finish before time is called|No Test Material On This Page|"
    r"Reading and Writing \d+ QUESTIONS|Math \d+ QUESTIONS).*$", re.S)

CHOICE_RE = re.compile(r"(?m)^\s*([ABCD])\)\s?(.*)$")
STEM_RE = re.compile(
    r"(Which choice|Which finding|Which quotation|Which statement|"
    r"According to the|Based on the)"
)

def parse_block(raw_lines):
    """Return dict: passage, prompt, choices{A..D} or None (SPR)."""
    # Drop noise lines and page-number-only footer lines.
    kept = []
    for ln in raw_lines:
        s = ln.strip()
        if is_noise(ln):
            continue
        if re.fullmatch(r"\d+", s):  # stray footer page number
            continue
        kept.append(s)
    text = "\n".join(kept)
    # Strip accessibility annotations that mark underlined portions.
    # Accessibility markers around underlined portions -> <u>…</u> (rendered by
    # the app as underline). The text layer sometimes splits the words
    # ("Conte nt"), so allow whitespace between letters.
    text = START_REF_RE.sub(" <u>", text)
    text = END_REF_RE.sub("</u> ", text)
    text = re.sub(r"\bb\s?l\s?a\s?n\s?k\b", " ______ ", text)  # "b l a n k", "b lan\nk"
    text = re.sub(r"(?<=[A-Za-z])blank\b", " ______ ", text)  # glued, e.g. "USblank"
    text = re.sub(r"\b(?:blank|BLANK)\b", " ______ ", text)
    # Decorative rules in the PDF extract as runs of dash/tilde-only tokens.
    text = re.sub(r"(?m)(?:(?<=\s)|^)[-~]+(?:[ \t]+[-~]+)+(?=\s|$)", " ", text)
    text = re.sub(r"(?m)(?:(?<=\s)|^)[-~]{3,}(?=\s|$)", " ", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{2,}", "\n", text).strip()

    # Locate choices.
    choices = {}
    cm = list(CHOICE_RE.finditer(text))
    stem_area = text
    if cm:
        stem_area = text[: cm[0].start()].strip()
        # capture each choice's text up to next choice marker
        for i, m in enumerate(cm):
            letter = m.group(1)
            start = m.start(2)  # start of the choice text (after "A) ")
            end = cm[i + 1].start() if i + 1 < len(cm) else len(text)
            choices[letter] = CHOICE_TAIL_RE.sub("", " ".join(text[start:end].split())).strip()
    # Split stem_area into passage + prompt (last ?-terminated sentence).
    prompt, passage = stem_area, ""
    # find last sentence ending in ?
    qmarks = [mm.end() for mm in re.finditer(r"\?", stem_area)]
    if qmarks:
        last_q = qmarks[-1]
        # find sentence start: previous period/newline before the question sentence
        seg = stem_area[:last_q]
        # find start of the question sentence
        starts = [mm.end() for mm in re.finditer(r"[.?!]\s", seg[:-1])]
        s0 = starts[-1] if starts else 0
        prompt = stem_area[s0:last_q].strip()
        passage = (stem_area[:s0] + stem_area[last_q:]).strip()
    # Trim passage text that leaked into the prompt (a blank sits right before the
    # stem, so the sentence splitter grabs "…______ Which choice…?" as one unit).
    sm = list(STEM_RE.finditer(prompt))
    if sm and sm[-1].start() > 0:
        lead = prompt[: sm[-1].start()].strip()
        prompt = prompt[sm[-1].start():].strip()
        passage = (passage + " " + lead).strip()
    has_all = all(k in choices for k in "ABCD")
    return {
        "passage": clean_symbols(passage),
        "prompt": clean_symbols(prompt),
        "choices": {k: clean_symbols(v) for k, v in choices.items()} if has_all else None,
        "type": "mc" if has_all else "spr",
    }

def well_formed(pb):
    """Passage/prompt/choices split cleanly: a question sentence and A-D."""
    return bool(pb["choices"]) and pb["prompt"].rstrip().endswith("?")


def parse_main(path):
    text = full_text(path)
    out = {}
    for sec, module, region in split_regions(text):
        blocks = parse_region_questions(region)
        for num, raw in blocks.items():
            pb = parse_block(raw)
            out[(sec, module, num)] = pb
    # Two-column text extraction scrambles some pages (questions missed, or
    # directions text glued into choices). For R&W, prefer each question's own
    # label-delimited region (see layout.py), which is never scrambled across
    # columns; keep the text-flow parse only as a fallback.
    import layout as L
    doc = fitz.open(path)
    for module in (1, 2):
        flow = L.ModuleFlow(doc, "rw", module)
        for num in flow.numbers():
            key = ("rw", module, num)
            pieces, _ = split_trailing_figure(doc, flow.pieces(num))
            cands = [parse_block(question_text(flow, doc, pieces, s).split("\n"))
                     for s in (False, True)]
            good = [pb for pb in cands if well_formed(pb)]
            if good:
                out[key] = good[0]
            elif not (key in out and well_formed(out[key])) and cands[0]["choices"]:
                # No question sentence in the text layer at all (drawn as
                # graphics); the stem is shown as an image, choices stay text.
                out[key] = cands[0]
    return out

# ---------------------------------------------------------------------------
# ANSWER key parsing
# ---------------------------------------------------------------------------
ANS_SEC_RE = re.compile(r"(READING AND WRITING|MATH): MODULE (\d)")
BEST_RE = re.compile(r"Choice ([ABCD]) is (?:the best answer|correct)")
SPR_RE = re.compile(r"The correct answer is\s+(.+?)\.")
CHOICE_INCORRECT_RE = re.compile(r"Choice ([ABCD]) is incorrect")

def parse_answers(path):
    """Split the answer key into QUESTION blocks keyed by (section, module, N).

    The "MATH: MODULE 2" style header is a running page header, and on some pages
    the text layer emits it *after* the first questions -- so the section/module
    is taken per page (from anywhere on the page), not from line order.
    """
    pages = read_pages(path)
    blocks = []  # (sec, mod, num, block_text)
    cur, curkey = None, None
    seen = set()
    def flush():
        if cur is not None and curkey is not None:
            if curkey in seen:
                print(f"  !! duplicate answer block {curkey} in {path}")
            seen.add(curkey)
            blocks.append((curkey[0], curkey[1], curkey[2], "\n".join(cur)))
    for page in pages:
        h = ANS_SEC_RE.search(page)
        page_sec = page_mod = None
        if h:
            page_sec = "rw" if "READING" in h.group(1) else "math"
            page_mod = int(h.group(2))
        for ln in page.split("\n"):
            if ANS_SEC_RE.search(ln):
                continue
            qm = re.fullmatch(r"QUESTION (\d+)", ln.strip())
            if qm and page_sec:
                flush()
                cur = []
                curkey = (page_sec, page_mod, int(qm.group(1)))
                continue
            if cur is not None:
                cur.append(ln)
    flush()

    out = {}
    for sec, mod, num, btext in blocks:
        bt = clean_symbols(" ".join(btext.split()))
        letter = None
        spr = None
        mbest = BEST_RE.search(bt)
        if mbest:
            letter = mbest.group(1)
        else:
            msp = SPR_RE.search(bt)
            if msp:
                spr = msp.group(1).strip()
        out[(sec, mod, num)] = {
            "letter": letter, "spr": spr,
            "rationales": extract_rationales(bt),
            "rationale_text": bt,
        }
    return out

MARK_RE = re.compile(r"Choice ([ABCD]) is (?:the best answer|correct|incorrect)")

# Running page footer of the answer PDFs ("n 3 SAT PRACTICE TEST #4 ANSWER
# EXPLANATIONS") and the next section's heading leak into explanation text.
RAT_FOOTER_RE = re.compile(r"\s*(?:\bn\s+)?\d+\s+SAT PRACTICE TEST #\d+ ANSWER EXPLANATIONS\.?")
RAT_TAIL_RE = re.compile(r"\s*(?:Reading and Writing|Math) Module \d \(\d+ questions\)\.?\s*$")


def clean_rationale(seg):
    seg = RAT_FOOTER_RE.sub(" ", seg)
    seg = RAT_TAIL_RE.sub("", seg)
    seg = " ".join(seg.split())
    seg = re.sub(r"^\s*because\s*", "", seg)
    seg = re.sub(r"^[\s.,;:]+", "", seg)   # "Choice B is incorrect. The …" -> "The …"
    seg = seg.strip().rstrip(".") + "."
    return seg[:1].upper() + seg[1:]


def extract_rationales(bt):
    ms = list(MARK_RE.finditer(bt))
    rats = {}
    for i, m in enumerate(ms):
        L = m.group(1)
        start = m.end()
        end = ms[i + 1].start() if i + 1 < len(ms) else len(bt)
        seg = bt[start:end]
        seg = clean_rationale(seg)
        if L not in rats:  # keep first mention
            rats[L] = seg
    return rats

# ---------------------------------------------------------------------------
# R&W skill inference from the (highly standardized) prompt text.
# ---------------------------------------------------------------------------
def boundaries_or_form(choices):
    norm = [re.sub(r"[^a-z0-9]", "", c.lower()) for c in choices.values()]
    return "boundaries" if len(set(norm)) == 1 else "form-structure"

def infer_skill(prompt, passage, choices):
    # Collapse line breaks first — extracted prompts wrap mid-phrase, e.g.
    # "most\nlogical transition", which would defeat substring matching.
    p = " ".join((prompt or "").split()).lower()
    pa = " ".join((passage or "").split()).lower()
    if "most logical transition" in p:
        return "transitions"
    if "?" not in p and choices and all(len(c.split()) <= 2 for c in choices.values()):
        # Prompt missing from the text layer; one/two-word options = vocabulary.
        return "words-in-context"
    if "precise word or phrase" in p or "most logical and precise word" in p:
        return "words-in-context"
    if "conventions of standard english" in p:
        return boundaries_or_form(choices) if choices else "form-structure"
    if "based on the texts" in p or ("text 1" in pa and "text 2" in pa):
        return "cross-text"
    if "uses relevant information from the notes" in p or ("notes" in pa and "student" in pa):
        return "rhetorical-synthesis"
    # Text Structure and Purpose: purpose, overall structure, function of a portion.
    if ("main purpose" in p or "primary purpose" in p or "overall structure" in p
            or "function of" in p or "structure of the text" in p):
        return "text-structure"
    # Command of Evidence — Quantitative: explicitly draws on data / graph / table.
    if ("data from the" in p or "according to the graph" in p or "according to the table" in p
            or ("according to the" in p and any(w in pa for w in ["graph", "table"]))):
        return "evidence-quant"
    # Command of Evidence — Textual: support/weaken a claim, or a quotation illustrating one.
    if any(w in p for w in ["support the", "supports the", "if true", "would most directly",
                            "illustrate the claim", "quotation", "best example", "finding",
                            "supports that", "weaken"]):
        return "evidence-textual"
    if "main idea" in p:
        return "central-ideas"
    # Central Ideas and Details: detail retrieval from the passage.
    if "according to the text" in p or "based on the text," in p or "in what way" in p:
        return "central-ideas"
    # Inferences: logical completion of a blank, or "most strongly supported" claims.
    return "inferences"

LETTER_IDX = {"A": 0, "B": 1, "C": 2, "D": 3}

def clean_passage(passage):
    p = " ".join(passage.split())  # undo the PDF's hard line wraps
    p = re.sub(r"\s+</u>", "</u>", re.sub(r"<u>\s+", "<u>", p))
    p = re.sub(r"(?:______\s*){2,}", "______ ", p).strip()  # "blank" + its alt text
    p = re.sub(r"______\s+([:;,.!?])", r"______\1", p)
    if "•" in p:
        # Student notes: one bullet per line, the goal sentence on its own line.
        p = re.sub(r"\s*•\s*", "\n• ", p)
        p = re.sub(r"\s+(The student wants)", r"\n\1", p)
        return p.strip()
    if p.startswith("Text 1"):
        p = re.sub(r"\s+(Text 2\b)", r"\n\n\1", p, count=1)
    return p

FIG_ZOOM = 2.6


def figure_boxes(doc, pi, r):
    """Rects of tables/graphs/images inside clip r: anything drawn besides the
    grey header bar / label box and single thin underline strokes."""
    page = doc[pi]
    out = [fitz.Rect(i["bbox"]) for i in page.get_image_info()
           if fitz.Rect(i["bbox"]).intersects(r)]
    for d in page.get_drawings():
        dr = d["rect"]
        if not dr.intersects(r) or (d.get("fill") and dr.height < 20):
            continue
        underline = len(d["items"]) == 1 and dr.height < 1 and (d.get("width") or 0) < 2
        if not underline:
            out.append(dr)
    return out


def has_figure(doc, pieces):
    return any(figure_boxes(doc, pi, r) for pi, r in pieces)


def first_choice_y(doc):
    def stop(pi, r):
        ys = [w[1] for w in doc[pi].get_text("words", clip=r) if w[4] == "A)"]
        return min(ys) - 4 if ys else None
    return stop


def split_trailing_figure(doc, pieces):
    """Some questions place their graph *below* the answer choices (in the same
    column or the next one). Return (text_pieces, figure_pieces): the question
    without that figure (so its labels don't leak into choice D) and the figure
    region itself."""
    def real(boxes, r):
        # Ignore hairline strips (footer rules) hugging the bottom of a column.
        return [bx for bx in boxes if bx.height > 4 and bx.y0 < r.y1 - 12]
    for k, (pi, r) in enumerate(pieces):
        dys = [w[3] for w in doc[pi].get_text("words", clip=r) if w[4] == "D)"]
        if not dys:
            continue
        below = [bx for bx in real(figure_boxes(doc, pi, r), r) if bx.y0 > dys[0] + 2]
        if below:
            cut = min(bx.y0 for bx in below) - 6
            text_p = pieces[:k] + [(pi, fitz.Rect(r.x0, r.y0, r.x1, cut))]
            fig_p = [(pi, fitz.Rect(r.x0, cut, r.x1, r.y1))] + pieces[k + 1:]
            return text_p, fig_p
        rest = pieces[k + 1:]
        if any(real(figure_boxes(doc, pj, rj), rj) for pj, rj in rest):
            return pieces[:k + 1], rest
        return pieces, []
    return pieces, []


def split_at_choices(doc, pieces):
    """(stem_pieces, choice_pieces): split the question at its "A)" line."""
    stop = first_choice_y(doc)
    for k, (pi, r) in enumerate(pieces):
        y = stop(pi, r)
        if y is not None:
            return (pieces[:k] + [(pi, fitz.Rect(r.x0, r.y0, r.x1, y))],
                    [(pi, fitz.Rect(r.x0, y, r.x1, r.y1))] + pieces[k + 1:])
    return pieces, []


def question_text(flow, doc, pieces, sort):
    """Stem and choices read from separate clips: a figure's hidden text can be
    emitted after the choices in the content stream although it sits above
    them, and would otherwise be glued onto choice D."""
    stem, choices = split_at_choices(doc, pieces)
    return flow.text(stem, sort=sort) + "\n" + flow.text(choices, sort=sort)


def stimulus_images(test, outdir="assets/rw"):
    """Crop the stimulus (label down to choice A, plus any figure placed below
    the choices) of every R&W question that has a table/figure or whose
    question sentence is missing from the text layer.
    Returns {(module, N): image_path}."""
    import layout as L
    doc = fitz.open(f"{PDF_DIR}/sat-practice-test-{test}-digital.pdf")
    out = {}
    for mod in (1, 2):
        flow = L.ModuleFlow(doc, "rw", mod)
        for N in flow.numbers():
            stem = flow.pieces(N, stop_y=first_choice_y(doc))
            if not stem:
                continue
            _, fig = split_trailing_figure(doc, flow.pieces(N))
            # Also image the stem when its question sentence isn't in the text
            # layer (drawn as graphics, e.g. test 7 R&W Q1).
            no_prompt = "?" not in flow.text(stem)
            if not (no_prompt or fig or has_figure(doc, stem)):
                continue
            img = flow.render(stem + fig, FIG_ZOOM)
            if img is None:
                continue
            fname = f"t{test}-rw{mod}-{N}.png"
            img.save(os.path.join(outdir, fname))
            out[(mod, N)] = f"assets/rw/{fname}"
    return out



def reset_dir(d):
    """Empty d of PNGs (stale/orphan crops must never ship). Deletes files one by
    one rather than the folder, which survives a viewer holding it open."""
    os.makedirs(d, exist_ok=True)
    for f in os.listdir(d):
        if f.lower().endswith(".png"):
            os.remove(os.path.join(d, f))


def build_rw(test, main, ans, figures):
    """Return (questions[], skipped_count)."""
    qs, skipped = [], 0
    for key in sorted(main):
        sec, mod, num = key
        if sec != "rw":
            continue
        m, a = main[key], ans.get(key)
        if not a or not m["choices"] or not a["letter"]:
            skipped += 1
            continue
        pa = m["passage"]
        image = figures.get((mod, num))
        # A question that refers to a figure we could not crop can't be shown.
        if (not image and re.search(r"\b(graph|chart|figure|bar graph)\b", pa.lower())
                and "•" not in pa):
            skipped += 1
            continue
        skill = infer_skill(m["prompt"], pa, m["choices"])
        letters = ["A", "B", "C", "D"]
        choices = [m["choices"][L] for L in letters]
        if any(not c for c in choices):
            skipped += 1
            continue
        rats = a["rationales"]
        rationales = [rats.get(L, "This choice is not the best answer.") for L in letters]
        qs.append({
            "id": f"t{test}-rw{mod}-{num}",
            "skill": skill, "difficulty": 2, "type": "mc",
            "passage": clean_passage(pa),
            "prompt": clean_passage(m["prompt"]),
            "choices": choices,
            "answer": LETTER_IDX[a["letter"]],
            "rationales": rationales,
            "exam": f"Practice Test {test}",
            "image": image,
        })
    return qs, skipped

# ---------------------------------------------------------------------------
def js_string(s):
    return json.dumps(s, ensure_ascii=False)

if __name__ == "__main__":
    from collections import Counter
    tests = ["4", "5", "6", "7", "8", "9", "10", "11"]
    import shutil
    reset_dir("assets/rw")
    all_q = []
    total_skipped = 0
    for t in tests:
        main = parse_main(f"{PDF_DIR}/sat-practice-test-{t}-digital.pdf")
        ans = parse_answers(f"{PDF_DIR}/sat-practice-test-{t}-answers-digital.pdf")
        figures = stimulus_images(t)
        qs, skipped = build_rw(t, main, ans, figures)
        all_q.extend(qs)
        total_skipped += skipped
        print(f"Test {t}: {len(qs)} R&W questions kept, {skipped} skipped")

    skdist = Counter(q["skill"] for q in all_q)
    print("\nTotal R&W questions:", len(all_q), "| skipped:", total_skipped)
    print("Skill distribution:")
    for s, n in sorted(skdist.items(), key=lambda x: -x[1]):
        print(f"  {s:24} {n}")

    # Emit JS data file that pushes real exam questions into SAT_QUESTIONS.
    lines = [
        "/* SATrainer — real Digital SAT Reading & Writing questions extracted from",
        " * College Board official practice tests 4-11 (provided by the user for",
        " * personal study). Generated by work/parse.py — do not edit by hand.",
        " * Pushed into SAT_QUESTIONS; skills inferred from the standardized prompts. */",
        "(() => {",
        "  const EXAM_RW = [",
    ]
    for q in all_q:
        lines.append("    {")
        lines.append(f"      id: {js_string(q['id'])}, skill: {js_string(q['skill'])}, difficulty: {q['difficulty']}, type: \"mc\",")
        lines.append(f"      exam: {js_string(q['exam'])},")
        if q.get("image"):
            lines.append(f"      image: {js_string(q['image'])},")
        lines.append(f"      passage: {js_string(q['passage'])},")
        lines.append(f"      prompt: {js_string(q['prompt'])},")
        lines.append(f"      choices: {json.dumps(q['choices'], ensure_ascii=False)},")
        lines.append(f"      answer: {q['answer']},")
        lines.append(f"      rationales: {json.dumps(q['rationales'], ensure_ascii=False)},")
        lines.append("    },")
    lines.append("  ];")
    lines.append("  for (const q of EXAM_RW) SAT_QUESTIONS.push(q);")
    lines.append("  SAT_TAXONOMY.questionCountBySkill = SAT_QUESTIONS.reduce((a, q) => { a[q.skill] = (a[q.skill]||0)+1; return a; }, {});")
    lines.append("  window.EXAM_RW_COUNT = EXAM_RW.length;")
    lines.append("})();")
    with open("js/exam_rw.js", "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print("\nwrote js/exam_rw.js")
