# SATrainer

An offline trainer for the **Digital SAT** — both **Reading & Writing** and **Math**.
It runs a continuous improvement loop — **evaluate → train → re-evaluate** — to move
a test taker's weakest skills up over time.

No account, no backend. Everything runs locally and progress is saved in the browser.

## Run it

- **Windows:** double-click **`SATrainer.bat`**.
- **macOS:** double-click **`SATrainer.command`** (first time: right-click → Open).
- **Any OS:** open `index.html` in a browser. (Serving via the launchers is
  recommended so saved progress works in every browser — Safari blocks localStorage
  under `file://`.)
- **Build a real desktop app:** see [`PACKAGING.md`](PACKAGING.md) (Electron → `.app`,
  `.dmg`, or Windows `.exe`).

## How the loop works

1. **Evaluate** — a short mixed *diagnostic* samples every skill in the section and
   builds a mastery profile.
2. **Train** — the dashboard points you at your lowest-mastery skills and serves
   targeted drills, each with the answer explanation.
3. **Re-evaluate** — once your weak skills reach proficiency, a fresh mixed test
   confirms the gains and completes a loop *cycle*.
4. **Repeat** — the "Loop" tab always shows the single best next action.

Mastery is a **recency-weighted** score per skill (an EWMA), so it reflects your
*current* readiness, not a lifetime average. Each section runs its own loop; switch
between **Reading & Writing** and **Math** with the toggle at the top.

## Skills tracked (official College Board domains)

**Reading & Writing (11 skills):**
- *Information and Ideas* — Central Ideas, Command of Evidence (Textual & Quantitative), Inferences
- *Craft and Structure* — Words in Context, Text Structure & Purpose, Cross-Text Connections
- *Expression of Ideas* — Rhetorical Synthesis, Transitions
- *Standard English Conventions* — Boundaries (punctuation), Form/Structure/Sense

**Math (19 skills):** Algebra · Advanced Math · Problem-Solving & Data Analysis ·
Geometry and Trigonometry (all official skills). Includes multiple-choice and
student-produced-response (grid-in) questions.

## The question bank (~974 items)

Each section has a small **golden** set of original hand-written questions plus the
bulk drawn from **real College Board official practice tests (4–11)**, provided by
the user for personal study.

- **Reading & Writing (563):** ~83 original hand-written items + **480 real exam
  questions**. R&W extracts cleanly to text; skills are inferred from the
  standardized prompts.
- **Math (411):** ~46 original hand-written items + **365 real exam questions**.
  Math is shown as **cropped images** (equations and figures preserved exactly),
  since plain-text extraction mangles equations. The correct answer, and the answer
  **explanation image**, come from the official answer key.

> Sourcing note: the real questions/images are extracted from practice-test PDFs the
> user supplied, for their own offline study. They are College Board material and are
> not redistributed.

## Project layout

```
index.html            App shell; loads scripts in dependency order.
css/styles.css        All styling (dark theme, no framework).
js/questions.js       R&W taxonomy (4 domains → 11 skills) + golden R&W bank.
js/exam_rw.js         Real R&W exam questions (from PDFs).
js/math_questions.js  Math taxonomy (4 domains → 19 skills) + golden Math bank.
js/exam_math.js       Real Math exam questions (image-based) + explanation images.
js/storage.js         Per-section localStorage; export/import backup.
js/mastery.js         Mastery EWMA model + loop recommendation engine.
js/app.js             Section-aware UI, routing, and quiz flow (MC + grid-in + images).
assets/math/          Cropped exam question & explanation images.

electron-main.js      Electron wrapper (desktop app).
package.json          Electron build config (mac + win).
SATrainer.bat         Windows launcher.
SATrainer.command     macOS launcher.
build/                App icons (.icns, .ico, .png).

pdfs/                 Source practice-test PDFs (build-time only, not shipped).
work/                 Extraction/packaging scripts (build-time only, not shipped):
                        parse.py       R&W + answer-key parsing
                        crop_math.py   crop math question images
                        crop_expl.py   crop math explanation images
                        build_math.py  emit js/exam_math.js
                        make_icon.py   generate app icons
                        package.py     build the distributable zip
```

## Rebuilding the banks from the PDFs

Requires Python 3 with `PyMuPDF` (fitz) and `Pillow`. Run from the project root:

```bash
PYTHONUTF8=1 python work/parse.py        # -> js/exam_rw.js
PYTHONUTF8=1 python work/build_math.py   # crops images + -> js/exam_math.js
PYTHONUTF8=1 python work/make_icon.py    # -> build/ icons
PYTHONUTF8=1 python work/package.py       # -> SATrainer.zip (trimmed, runtime only)
```

Skill tags are heuristic (R&W from prompt patterns, Math from answer-key keywords):
reliable at the domain level, but individual items may be mis-routed — easy to
correct by editing the emitted `js/exam_*.js`.

### Adding your own hand-written questions

Append to `SAT_QUESTIONS` (`js/questions.js`) or `MATH_QUESTIONS` (`js/math_questions.js`):

```js
{
  id: "unique-id",
  skill: "transitions",          // must match a skill id in the taxonomy
  difficulty: 2,                 // 1 easy | 2 medium | 3 hard
  type: "mc",                    // "mc" | "spr" (grid-in)
  passage: "…",                  // or omit and use image: "assets/…png"
  prompt: "Which choice…",
  choices: ["A", "B", "C", "D"], // mc only
  answer: 0,                     // mc: index 0–3 | spr: the numeric answer
  rationales: ["…","…","…","…"], // mc; or explanation: "…" for spr/image
}
```

## Data & backups

The **Data & Help** tab exports your progress (both sections) to a JSON file and
imports it back — handy for moving between machines or keeping a backup. "Reset all
progress" clears everything.

## Roadmap ideas

- Improve skill tagging (e.g. per-item review of the mis-routed defaults).
- Timed full-length section practice mode.
- Optional AI grading/generation of new items (would require an API key + backend).
