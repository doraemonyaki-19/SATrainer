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
    r"^\.{5,}.*$", r"^-{3,}.*$", r"^_{3,}.*$",
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
    text = text.replace("Start referenced Content:", "").replace("End referenced Content", "")
    text = re.sub(r"(?<=[a-z])blank\b", " ______ ", text)  # glued, e.g. "beblank"
    text = re.sub(r"\bblank\b", " ______ ", text)
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
            choices[letter] = " ".join(text[start:end].split()).strip()
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

def parse_main(path):
    text = full_text(path)
    out = {}
    for sec, module, region in split_regions(text):
        blocks = parse_region_questions(region)
        for num, raw in blocks.items():
            pb = parse_block(raw)
            out[(sec, module, num)] = pb
    return out

# ---------------------------------------------------------------------------
# ANSWER key parsing
# ---------------------------------------------------------------------------
ANS_SEC_RE = re.compile(r"(READING AND WRITING|MATH): MODULE (\d)")
BEST_RE = re.compile(r"Choice ([ABCD]) is (?:the best answer|correct)")
SPR_RE = re.compile(r"The correct answer is\s+(.+?)\.")
CHOICE_INCORRECT_RE = re.compile(r"Choice ([ABCD]) is incorrect")

def parse_answers(path):
    pages = read_pages(path)
    text = "\n".join(pages)
    lines = text.split("\n")
    # Determine module region for each line by scanning headers.
    out = {}
    cur_sec, cur_mod = None, None
    # Rebuild by splitting on "QUESTION N" markers while tracking section/module.
    # First, find section/module transitions with their line indices.
    joined = text
    # Split by QUESTION markers, but we need section context; do a linear pass.
    idx = 0
    blocks = []  # (sec, mod, num, block_text)
    cur = None
    curkey = None
    def flush():
        if cur is not None and curkey is not None:
            blocks.append((curkey[0], curkey[1], curkey[2], "\n".join(cur)))
    for ln in lines:
        h = ANS_SEC_RE.search(ln)
        if h:
            cur_sec = "rw" if "READING" in h.group(1) else "math"
            cur_mod = int(h.group(2))
            continue
        qm = re.fullmatch(r"QUESTION (\d+)", ln.strip())
        if qm and cur_sec:
            flush()
            cur = []
            curkey = (cur_sec, cur_mod, int(qm.group(1)))
            continue
        if cur is not None:
            cur.append(ln)
    flush()

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

def extract_rationales(bt):
    ms = list(MARK_RE.finditer(bt))
    rats = {}
    for i, m in enumerate(ms):
        L = m.group(1)
        start = m.end()
        end = ms[i + 1].start() if i + 1 < len(ms) else len(bt)
        seg = bt[start:end]
        seg = re.sub(r"^\s*because\s*", "", seg).strip()
        seg = seg.strip().rstrip(".") + "."
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
    if "•" in passage:
        return "\n".join(" ".join(l.split()) for l in passage.split("\n") if l.strip())
    return " ".join(passage.split())

def build_rw(test, main, ans):
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
        # Skip questions that depend on a figure we cannot render from text.
        if re.search(r"\b(graph|chart|figure|bar graph)\b", pa.lower()) and "•" not in pa:
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
            "prompt": " ".join(m["prompt"].split()),
            "choices": choices,
            "answer": LETTER_IDX[a["letter"]],
            "rationales": rationales,
            "exam": f"Practice Test {test}",
        })
    return qs, skipped

# ---------------------------------------------------------------------------
def js_string(s):
    return json.dumps(s, ensure_ascii=False)

if __name__ == "__main__":
    from collections import Counter
    tests = ["4", "5", "6", "7", "8", "9", "10", "11"]
    all_q = []
    total_skipped = 0
    for t in tests:
        main = parse_main(f"{PDF_DIR}/sat-practice-test-{t}-digital.pdf")
        ans = parse_answers(f"{PDF_DIR}/sat-practice-test-{t}-answers-digital.pdf")
        qs, skipped = build_rw(t, main, ans)
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
