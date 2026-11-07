#!/usr/bin/env python
"""Build js/exam_math.js: join cropped math question images with the answer key
(correct answer + rationale), and tag each with a math skill inferred from the
clean rationale prose.
"""
import fitz, re, json, os
import shutil
import layout as L
import crop_math as C
import crop_expl as E
import parse as P

TESTS = ["4", "5", "6", "7", "8", "9", "10", "11"]
LETTER_IDX = {"A": 0, "B": 1, "C": 2, "D": 3}

# Skill keywords, matched as whole words/phrases (substring matching mis-tagged
# e.g. "because" as a causal claim and "business" as trigonometry).
SKILL_RULES = [
    # Geometry & Trigonometry
    ("geo-righttri", r"hypotenuse|sine|cosine|tangent|sin|cos|tan|right triangles?|pythagorean"),
    ("geo-circles", r"circles?|radius|radii|diameter|circumference|arcs?|central angle|radians?"),
    ("geo-area", r"area|volume|perimeter|cylinders?|spheres?|cubes?|rectangular prism|surface area|cones?|prisms?|pyramids?"),
    ("geo-lines", r"triangles?|angles?|parallel lines?|transversal|polygons?|quadrilaterals?|similar triangles|congruent"),
    # Problem-Solving & Data Analysis
    ("data-prob", r"probability|at random|chosen at random|selected at random"),
    ("data-inference", r"margin of error|confidence interval|representative sample|random sample|sample of|population of|generaliz\w+"),
    ("data-claims", r"observational study|experiments?|causal|cause-and-effect|randomly assigned|random assignment|control group"),
    ("data-twovar", r"line of best fit|scatterplot|model predicts|association between|two-way table"),
    ("data-onevar", r"mean|median|mode|standard deviation|data set|frequency|histogram|box ?plot|range of the data|average"),
    ("data-percent", r"percent|percentage|%"),
    ("data-rates", r"ratio|proportion(al)?|rates?|per hour|per minute|per unit|scale|unit rate|density"),
    # Advanced Math
    ("adv-nonlinear-eq", r"quadratic|parabola|vertex|factored form|x-intercepts|exponential|squared|squaring|square root"),
    ("adv-equiv", r"equivalent expressions?|factor|factored|expand|simplif\w+|rewritten"),
    # Algebra
    ("alg-systems", r"system of|systems of"),
]


def has_word(text, pattern):
    return re.search(rf"(?<![\w-])(?:{pattern})(?![\w])", text) is not None


# Rules on the question stem itself (what is being asked) take priority over
# the explanation, which mentions many incidental concepts.
STEM_RULES = [
    ("alg-systems", r"system of|systems of|given system"),
    ("data-prob", r"probability"),
    ("data-inference", r"margin of error|confidence interval|random sample|surveyed|sample of|plausible"),
    ("data-claims", r"observational study|experiment|causal|randomly assigned"),
    ("data-twovar", r"scatterplot|line of best fit|two-way table"),
    ("data-onevar", r"mean|median|mode|standard deviation|range of|data set|frequency|histogram|box ?plot|dot plot|average"),
    ("geo-circles", r"circle|radius|diameter|circumference|arc|radians?"),
    ("geo-righttri", r"sin|cos|tan|right triangle|hypotenuse"),
    ("geo-area", r"area|volume|perimeter|surface area|cube|cylinder|sphere|cone|prism|pyramid"),
    ("geo-lines", r"triangles?|angles?|parallel|perpendicular lines|polygon|quadrilateral|congruent|similar"),
    ("data-percent", r"percent|percentage|%"),
    ("alg-inequalities", r"inequality|inequalities"),
    ("data-rates", r"are equivalent to|is equivalent to \d|ratio|unit rate|proportional|convert\w*"),
    ("adv-equiv", r"expression is equivalent|equivalent expression|equivalent to the given expression|equivalent forms?|which expression"),
]


def tag_math(rtext, stem=""):
    st = " ".join((stem or "").lower().split())
    for skill, pat in STEM_RULES:
        if pat == "percent|percentage|%":
            if "%" in st or has_word(st, "percent|percentage"):
                return skill
            continue
        if has_word(st, pat):
            return skill
    t = (rtext or "").lower()
    # A question about a function: linear vs nonlinear from the explanation.
    if has_word(st, "function|functions"):
        nonlinear = has_word(t, r"quadratic|parabola|vertex|exponential|exponent|squared|"
                                r"cubic|polynomial|square root|absolute value|growth|decay")
        return "adv-nonlinear-fn" if nonlinear else "alg-linear-fn"
    for skill, pat in SKILL_RULES:
        if pat == "percent|percentage|%":
            if "%" in t or has_word(t, "percent|percentage"):
                return skill
            continue
        if has_word(t, pat):
            return skill
    if has_word(t, "function|functions"):
        return "adv-nonlinear-fn" if has_word(t, "quadratic|squared|parabola|exponential") else "alg-linear-fn"
    if has_word(t, r"inequalit\w+|greater than or equal|less than or equal"):
        return "alg-inequalities"
    if has_word(t, r"slope|y-intercept|linear equation in two variables|line that|graph of the line"):
        return "alg-linear-2"
    return "alg-linear-1"


# ---- Student-produced-response (grid-in) answers --------------------------
# The key's text layer mangles stacked fractions, decimal points, thousands
# separators and minus signs ("1 5" for 1/5, ". 4 51" for 4.51, "24 -" for -24).
# Most keys also carry a clean sentence: "Note that 1/5 and .2 are examples of
# ways to enter a correct answer." -- prefer that, else decode the garbled form.
NUM_RE = r"-?(?:\d+(?:\.\d+)?|\.\d+)(?:/\d+)?"
NOTE_RE = re.compile(r"Note that (.+?) (?:are|is) (?:examples|an example) of ways? to enter")


def num_value(tok):
    if "/" in tok:
        a, b = tok.split("/")
        return float(a) / float(b)
    return float(tok)


def from_note(bt):
    m = NOTE_RE.search(bt)
    if not m:
        return None
    s = m.group(1).replace("–", "-").replace("−", "-").replace("- ", "-")
    toks = re.findall(NUM_RE, s)
    groups = []  # [(value, display)] -- one per distinct correct answer
    for tok in toks:
        v = num_value(tok)
        is_decimal = "." in tok and "/" not in tok
        # A decimal entry is a truncated/rounded form of an answer already listed
        # (e.g. 7/24 -> .2916, .2917) when within one unit of its last digit.
        tol = 10 ** -len(tok.split(".")[1]) if is_decimal else 1e-9
        if any(abs(v - g[0]) <= tol + 1e-12 for g in groups):
            continue
        if is_decimal and groups:
            # Decimals only restate a listed answer; one that matches nothing is a
            # typo in the key (test 6 lists "0.219" for 7/24 = 0.2917).
            print(f"  !! ignoring unmatched decimal {tok!r} in note: {m.group(1)!r}")
            continue
        groups.append((v, tok))
    return groups or None


def decode_garbled(raw):
    """Decode the mangled 'The correct answer is ...' fragment; None if ambiguous."""
    raw = re.sub(r"^\s*either\s+", "", raw.strip())
    out = []
    for part in re.split(r"\s+or\s+", raw):
        part = part.strip()
        neg = part.endswith("-") or part.startswith("-") or part.startswith("–")
        part = part.strip("-– ").strip()
        m1 = re.fullmatch(r"\.\s*(\d+)\s+(\d+)", part)        # ". 4 51" -> 4.51
        m2 = re.fullmatch(r",\s*(\d+)\s+(\d{3})", part)        # ", 2 850" -> 2850
        m3 = re.fullmatch(r"(\d+(?:\.\d+)?)", part)            # plain number
        if m1:
            disp = f"{m1.group(1)}.{m1.group(2)}"
        elif m2:
            disp = f"{m2.group(1)}{m2.group(2)}"
        elif m3:
            disp = m3.group(1)
        else:
            return None  # e.g. a stacked fraction with no Note sentence
        disp = ("-" if neg else "") + disp
        out.append((num_value(disp), disp))
    return out or None


def spr_answer(raw, bt):
    return from_note(bt) or decode_garbled(raw or "")



def reset_dir(d):
    """Empty d of PNGs (stale/orphan crops must never ship). Deletes files one by
    one rather than the folder, which survives a viewer holding it open."""
    os.makedirs(d, exist_ok=True)
    for f in os.listdir(d):
        if f.lower().endswith(".png"):
            os.remove(os.path.join(d, f))


def build():
    # Start from an empty image folder so stale/orphan crops never ship.
    reset_dir("assets/math")
    all_q = []
    for t in TESTS:
        doc = fitz.open(f"pdfs/sat-practice-test-{t}-digital.pdf")
        crops = {}
        for module in (1, 2):
            for num, img, text in C.crop_module(doc, t, module, "assets/math"):
                crops[(module, num)] = (img, text)
        ans = P.parse_answers(f"pdfs/sat-practice-test-{t}-answers-digital.pdf")
        expl_imgs = E.crop_math_explanations(
            f"pdfs/sat-practice-test-{t}-answers-digital.pdf", t, "assets/math")
        for (module, num), (img, text) in sorted(crops.items()):
            a = ans.get(("math", module, num))
            if not a:
                continue
            skill = tag_math(a["rationale_text"], text)
            rid = f"t{t}-math{module}-{num}"
            eimg = expl_imgs.get((module, num))
            base = {
                "id": rid, "skill": skill, "difficulty": 2,
                "image": img, "explanationImage": eimg,
                "explanation": a["rationale_text"], "exam": f"Practice Test {t}",
            }
            if a["letter"]:
                base.update({"type": "mc", "answer": LETTER_IDX[a["letter"]]})
                all_q.append(base)
            elif a["spr"]:
                ans_list = spr_answer(a["spr"], a["rationale_text"])
                if not ans_list:
                    print(f"  !! could not decode SPR answer for {rid}: {a['spr']!r}")
                    continue
                base.update({
                    "type": "spr",
                    "answer": ans_list[0][0],
                    "answers": [v for v, _ in ans_list],
                    "answerText": " or ".join(d for _, d in ans_list),
                })
                all_q.append(base)
            else:
                print(f"  !! no answer found for {rid}")
    return all_q

if __name__ == "__main__":
    from collections import Counter
    qs = build()
    mc = sum(1 for q in qs if q["type"] == "mc")
    spr = sum(1 for q in qs if q["type"] == "spr")
    print(f"Math questions: {len(qs)} (MC {mc}, SPR {spr})")
    dist = Counter(q["skill"] for q in qs)
    for s, n in sorted(dist.items(), key=lambda x: -x[1]):
        print(f"  {s:22} {n}")

    lines = [
        "/* SATrainer — real Digital SAT Math questions from College Board official",
        " * practice tests 4-11 (provided by the user for personal study). Each question",
        " * is a cropped image (equations/figures preserved); correct answer + rationale",
        " * come from the answer key; skill inferred from the rationale. Generated by",
        " * work/build_math.py -- do not edit by hand. Pushed into MATH_QUESTIONS. */",
        "(() => {",
        "  const EXAM_MATH = [",
    ]
    for q in qs:
        lines.append("    {")
        lines.append(f"      id: {json.dumps(q['id'])}, skill: {json.dumps(q['skill'])}, difficulty: 2, type: {json.dumps(q['type'])},")
        lines.append(f"      exam: {json.dumps(q['exam'])}, image: {json.dumps(q['image'])},")
        if q.get("explanationImage"):
            lines.append(f"      explanationImage: {json.dumps(q['explanationImage'])},")
        if q["type"] == "mc":
            lines.append(f"      answer: {q['answer']},")
        else:
            lines.append(f"      answer: {json.dumps(q['answer'])}, answers: {json.dumps(q['answers'])}, answerText: {json.dumps(q['answerText'])},")
        lines.append(f"      explanation: {json.dumps(q['explanation'], ensure_ascii=False)},")
        lines.append("    },")
    lines.append("  ];")
    lines.append("  for (const q of EXAM_MATH) MATH_QUESTIONS.push(q);")
    lines.append("  MATH_TAXONOMY.questionCountBySkill = MATH_QUESTIONS.reduce((a, q) => { a[q.skill] = (a[q.skill]||0)+1; return a; }, {});")
    lines.append("  window.EXAM_MATH_COUNT = EXAM_MATH.length;")
    lines.append("})();")
    with open("js/exam_math.js", "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print("\nwrote js/exam_math.js")
