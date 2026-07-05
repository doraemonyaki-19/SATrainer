#!/usr/bin/env python
"""Build js/exam_math.js: join cropped math question images with the answer key
(correct answer + rationale), and tag each with a math skill inferred from the
clean rationale prose.
"""
import fitz, re, json, os
import crop_math as C
import crop_expl as E
import parse as P

TESTS = ["4", "5", "6", "7", "8", "9", "10", "11"]
LETTER_IDX = {"A": 0, "B": 1, "C": 2, "D": 3}

def tag_math(rtext):
    t = (rtext or "").lower()
    def has(*ws): return any(w in t for w in ws)
    # Geometry & Trigonometry
    if has("hypotenuse", "sine", "cosine", "tangent", "sin ", "cos ", "tan ",
           "right triangle", "pythagorean"):
        return "geo-righttri"
    if has("circle", "radius", "diameter", "circumference", "arc ", "central angle"):
        return "geo-circles"
    if has("area", "volume", "perimeter", "cylinder", "sphere", "cube",
           "rectangular", "surface area", "cone"):
        return "geo-area"
    if has("triangle", "angle", "parallel line", "transversal", "polygon", "quadrilateral"):
        return "geo-lines"
    # Problem-Solving & Data Analysis
    if has("probability", "at random"):
        return "data-prob"
    if has("margin of error", "confidence interval", "representative sample",
           "randomly selected", "population of", "generalize"):
        return "data-inference"
    if has("observational study", "experiment", "cause", "causal", "control group"):
        return "data-claims"
    if has("line of best fit", "scatterplot", "model predicts", "of best fit",
           "association between"):
        return "data-twovar"
    if has("mean", "median", "mode ", "standard deviation", "data set",
           "frequency", "histogram", "boxplot", "average of"):
        return "data-onevar"
    if has("percent", "%"):
        return "data-percent"
    if has("ratio", "proportion", "rate", "per hour", "per unit", "scale", "unit rate"):
        return "data-rates"
    # Advanced Math
    if has("quadratic", "parabola", "vertex", "factored form", "x-intercepts",
           "exponential", "squared"):
        return "adv-nonlinear-eq"
    if has("equivalent expression", "factor", "expand", "simplif"):
        return "adv-equiv"
    if has("system of"):
        return "alg-systems"
    if has("function"):
        return "adv-nonlinear-fn" if has("quadratic", "squared", "parabola", "exponential") else "alg-linear-fn"
    # Algebra
    if has("inequalit", "greater than or equal", "less than or equal"):
        return "alg-inequalities"
    if has("slope", "y-intercept", "linear equation in two", "line that", "graph of the line"):
        return "alg-linear-2"
    return "alg-linear-1"

def spr_numbers(raw):
    return re.findall(r"-?\d+(?:/\d+)?(?:\.\d+)?", raw or "")

def to_num(s):
    s = s.strip()
    try:
        if "/" in s:
            a, b = s.split("/"); return float(a) / float(b)
        return float(s)
    except Exception:
        return None

def build():
    all_q = []
    for t in TESTS:
        doc = fitz.open(f"pdfs/sat-practice-test-{t}-digital.pdf")
        psec = C.page_sections(doc)
        crops = {}
        for module in (1, 2):
            kept = C.filter_monotonic(C.gather_module(doc, psec, module))
            for num, img, text in C.crop_module(doc, t, module, kept, "assets/math"):
                crops[(module, num)] = (img, text)
        ans = P.parse_answers(f"pdfs/sat-practice-test-{t}-answers-digital.pdf")
        expl_imgs = E.crop_math_explanations(
            f"pdfs/sat-practice-test-{t}-answers-digital.pdf", t, "assets/math")
        for (module, num), (img, text) in sorted(crops.items()):
            a = ans.get(("math", module, num))
            if not a:
                continue
            skill = tag_math(a["rationale_text"])
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
                toks = spr_numbers(a["spr"])
                val = to_num(toks[0]) if toks else None
                if val is None:
                    continue
                base.update({"type": "spr", "answer": val, "accept": toks})
                all_q.append(base)
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
        " * come from the answer key; skill inferred from the rationale. Built by",
        " * work/build_math.py. Pushed into MATH_QUESTIONS, replacing the generator. */",
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
            lines.append(f"      answer: {q['answer']}, accept: {json.dumps(q['accept'], ensure_ascii=False)},")
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
