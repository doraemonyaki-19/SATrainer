/*
 * SATrainer — UI and routing (section-aware).
 * Depends on: questions.js + exam_rw.js (SAT_TAXONOMY, SAT_QUESTIONS),
 *             math_questions.js + exam_math.js (MATH_TAXONOMY, MATH_QUESTIONS),
 *             storage.js (Store), mastery.js (Engine).
 */

(() => {
  let state = Store.load();

  const SECTIONS = [
    { id: "rw", name: "Reading & Writing", taxonomy: SAT_TAXONOMY, questions: SAT_QUESTIONS },
    { id: "math", name: "Math", taxonomy: MATH_TAXONOMY, questions: MATH_QUESTIONS },
  ];
  const sectionById = Object.fromEntries(SECTIONS.map((s) => [s.id, s]));

  const view = () => document.getElementById("view");
  const curSection = () => sectionById[state.activeSection] || SECTIONS[0];
  const prog = () => state.sections[state.activeSection];
  const tax = () => curSection().taxonomy;
  const pool = () => curSection().questions;

  // ---- DOM helpers -------------------------------------------------------
  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") node.className = v;
      else if (k === "html") node.innerHTML = v;
      else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
      else if (v != null) node.setAttribute(k, v);
    }
    for (const c of [].concat(children)) {
      if (c == null) continue;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
    return node;
  }
  const fillClass = (m) => Engine.bandFor(m).cls.replace("band-", "fill-");

  // ---- navigation --------------------------------------------------------
  const routes = { dashboard: renderDashboard, skills: renderSkills, help: renderHelp };
  let current = "dashboard";

  function setNav() {
    document.querySelectorAll(".nav button").forEach((b) =>
      b.classList.toggle("active", b.dataset.route === current)
    );
    document.querySelectorAll("#sectionSwitch button").forEach((b) =>
      b.classList.toggle("active", b.dataset.section === state.activeSection)
    );
  }
  function go(route) { current = route; setNav(); routes[route](); }
  function switchSection(id) {
    state.activeSection = id;
    Store.save(state);
    quiz = null;
    go("dashboard");
  }

  // =======================================================================
  // Dashboard
  // =======================================================================
  function renderDashboard() {
    const rec = Engine.recommendNextAction(prog(), tax());
    const overall = Engine.overallMastery(prog(), tax());
    const est = Engine.estimatedScore(prog(), tax());
    const answered = prog().history.length;

    // Combined total across both sections (of 1600).
    const rwEst = Engine.estimatedScore(state.sections.rw, SAT_TAXONOMY);
    const mEst = Engine.estimatedScore(state.sections.math, MATH_TAXONOMY);
    const total = rwEst == null && mEst == null ? null : (rwEst || 0) + (mEst || 0);

    const root = el("div");
    root.appendChild(loopBanner(rec));
    root.appendChild(
      el("div", { class: "card" }, [
        el("h2", {}, curSection().name + " snapshot"),
        el("div", { class: "stat-grid" }, [
          stat(est == null ? "—" : est, "Est. section score"),
          stat(overall == null ? "—" : overall + "%", "Overall mastery"),
          stat(String(answered), "Questions answered"),
          stat(total == null ? "—" : total, "Est. total (of 1600)"),
        ]),
        el("p", { class: "muted small", style: "margin-top:12px" },
          est == null
            ? "Take this section's diagnostic to generate your first estimate."
            : "Scores are rough estimates from your skill mastery — a motivational gauge, not an official prediction."),
      ])
    );

    const weak = Engine.rankedWeakSkills(prog(), tax()).slice(0, 4);
    root.appendChild(
      el("div", { class: "card" }, [
        el("h2", {}, "Where to focus"),
        el("h3", {}, "Lowest-mastery skills right now"),
        ...weak.map(weakRow),
        el("div", { class: "btn-row" }, [
          el("button", { class: "btn secondary", onclick: () => go("skills") }, "See all skills"),
        ]),
      ])
    );
    view().replaceChildren(root);
  }

  function loopBanner(rec) {
    const order = ["diagnostic", "training", "reeval"];
    const labels = { diagnostic: "Evaluate", training: "Train", reeval: "Re-evaluate" };
    const steps = el("div", { class: "loop-steps" });
    order.forEach((p, i) => {
      steps.appendChild(el("div", { class: "loop-step" + (rec.phase === p ? " on" : "") }, [
        el("span", { class: "dot" }), labels[p],
      ]));
      if (i < order.length - 1) steps.appendChild(el("span", { class: "muted small" }, "→"));
    });

    const startQuiz = () => {
      if (rec.phase === "diagnostic")
        launchQuiz({ mode: "diagnostic", count: Math.min(tax().skillList.length, 12), title: "Diagnostic" });
      else if (rec.phase === "reeval")
        launchQuiz({ mode: "reeval", count: Math.min(tax().skillList.length, 12), title: "Re-evaluation" });
      else
        launchQuiz({ mode: "training", count: 6, focusSkills: rec.focusSkills || [], title: "Training" });
    };

    return el("div", { class: "card loop-banner" }, [
      el("h3", {}, "Next in your loop · " + curSection().name),
      el("h2", {}, rec.title),
      el("p", { class: "small" }, rec.detail),
      steps,
      el("div", { class: "btn-row" }, [el("button", { class: "btn", onclick: startQuiz }, rec.cta)]),
    ]);
  }

  const stat = (num, lbl) =>
    el("div", { class: "stat" }, [el("div", { class: "num" }, String(num)), el("div", { class: "lbl" }, lbl)]);

  function weakRow(s) {
    const band = Engine.bandFor(s.mastery);
    const pct = s.mastery == null ? 0 : s.mastery;
    return el("div", { class: "skill-row" }, [
      el("div", { class: "skill-name" }, [s.name, el("small", {}, s.domainName)]),
      el("div", { class: "small muted" }, s.mastery == null ? "untested" : s.mastery + "%"),
      el("div", { class: "bar" }, [el("span", { class: fillClass(s.mastery), style: `width:${pct}%` })]),
      el("div", { class: "badge " + band.cls }, band.label),
    ]);
  }

  // =======================================================================
  // Skills
  // =======================================================================
  function renderSkills() {
    const root = el("div");
    root.appendChild(el("div", { class: "card" }, [
      el("h2", {}, curSection().name + " skill mastery"),
      el("p", { class: "muted small" },
        "Every skill in this section, grouped by its official domains. Bars reflect recent performance."),
    ]));

    for (const domain of tax().domains) {
      const block = el("div", { class: "card domain-block" }, [el("div", { class: "domain-name" }, domain.name)]);
      for (const skill of domain.skills) {
        const rec = prog().skills[skill.id];
        const mastery = rec ? rec.mastery : null;
        const band = Engine.bandFor(mastery);
        const pct = mastery == null ? 0 : mastery;
        const attempts = rec ? rec.attempts : 0;
        const qCount = tax().questionCountBySkill[skill.id] || 0;
        block.appendChild(el("div", { class: "skill-row" }, [
          el("div", { class: "skill-name" }, [skill.name, el("small", {}, `${attempts} attempted · ${qCount} in bank`)]),
          el("div", { class: "small muted" }, mastery == null ? "—" : mastery + "%"),
          el("div", { class: "bar" }, [el("span", { class: fillClass(mastery), style: `width:${pct}%` })]),
          el("button", {
            class: "btn ghost small",
            onclick: () => launchQuiz({ mode: "training", count: Math.min(5, Math.max(2, qCount)), focusSkills: [skill.id], title: "Drill: " + skill.name }),
          }, "Drill"),
        ]));
      }
      root.appendChild(block);
    }
    view().replaceChildren(root);
  }

  // =======================================================================
  // Quiz flow (supports MC and SPR)
  // =======================================================================
  let quiz = null;

  // Hand-written questions were authored with the key mostly in slot A/B, so
  // shuffle their text choices per presentation (keeping answer + rationales
  // aligned). Real exam items keep the official order: their explanations and
  // images refer to the printed letters.
  function presentable(q) {
    if (q.exam || q.type === "spr" || !Array.isArray(q.choices)) return q;
    const order = q.choices.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    return {
      ...q,
      choices: order.map((i) => q.choices[i]),
      rationales: q.rationales ? order.map((i) => q.rationales[i]) : q.rationales,
      answer: order.indexOf(q.answer),
    };
  }

  function launchQuiz(opts) {
    const questions = Engine.buildQuiz(prog(), tax(), pool(), opts).map(presentable);
    if (questions.length === 0) { alert("No questions available for that selection yet."); return; }
    quiz = { questions, idx: 0, results: [], mode: opts.mode, title: opts.title || "Practice" };
    renderQuestion();
  }

  function renderQuestion() {
    const q = quiz.questions[quiz.idx];
    const skill = tax().skillById[q.skill];
    const n = quiz.questions.length;
    const root = el("div", {}, [
      el("div", { class: "card" }, [
        el("div", { class: "quiz-meta" }, [
          el("span", {}, `${quiz.title} · Question ${quiz.idx + 1} of ${n}`),
          el("span", {}, [el("span", { class: "chip" }, skill.name), el("span", { class: "chip diff-" + q.difficulty })]),
        ]),
        el("div", { class: "progress-track" }, [el("span", { style: `width:${(quiz.idx / n) * 100}%` })]),
        ...stimulus(q),
        q.type === "spr" ? buildSpr(q) : q.choices ? buildChoices(q) : buildImageChoices(q),
        el("div", { id: "feedback" }),
      ]),
    ]);
    view().replaceChildren(root);
    window.scrollTo(0, 0);
    if (q.type === "spr") { const inp = document.getElementById("sprInput"); if (inp) inp.focus(); }
  }

  // Passage text may mark underlined portions as <u>…</u>. Build real nodes
  // (never innerHTML) so passage text can't inject markup.
  function richText(text) {
    const out = [];
    const parts = String(text).split(/(<u>|<\/u>)/);
    let underline = false;
    for (const part of parts) {
      if (part === "<u>") underline = true;
      else if (part === "</u>") underline = false;
      else if (part) out.push(underline ? el("u", {}, part) : part);
    }
    return out;
  }

  function stimulus(q) {
    if (q.image) {
      // The image holds the full stem (passage + figure/table + question).
      const out = [el("img", { class: "qimage", src: q.image, alt: "SAT question" })];
      if (q.type === "spr")
        out.push(el("div", { class: "spr-note" }, "Student-produced response — enter your answer below."));
      return out;
    }
    const out = [];
    if (q.passage) out.push(el("div", { class: "passage" }, richText(q.passage)));
    if (q.prompt) out.push(el("div", { class: "prompt" }, q.prompt));
    return out;
  }

  function buildChoices(q) {
    const wrap = el("div", { class: "choices", id: "choices" });
    q.choices.forEach((text, i) => {
      wrap.appendChild(el("button", { class: "choice", onclick: () => answerMC(q, i) }, [
        el("span", { class: "key" }, "ABCD"[i]), el("span", {}, text),
      ]));
    });
    return wrap;
  }

  // For image questions the choices A-D are inside the image; show letter buttons.
  function buildImageChoices(q) {
    const wrap = el("div", { class: "choices imgchoices", id: "imgchoices" });
    ["A", "B", "C", "D"].forEach((L, i) => {
      wrap.appendChild(el("button", { class: "choice imgchoice", onclick: () => answerImageMC(q, i) }, L));
    });
    return wrap;
  }

  // Explanation body: image (math, equations preserved) with text fallback.
  function explanationNode(q) {
    if (q.explanationImage)
      return el("img", { class: "qimage expl-image", src: q.explanationImage, alt: "Answer explanation" });
    return el("div", {}, q.explanation || "");
  }

  function answerImageMC(q, choiceIdx) {
    const isCorrect = choiceIdx === q.answer;
    recordAndTally(q, isCorrect);
    document.querySelectorAll("#imgchoices .choice").forEach((b, i) => {
      b.disabled = true;
      if (i === q.answer) b.classList.add("correct");
      if (i === choiceIdx && !isCorrect) b.classList.add("wrong");
    });
    const parts = [el("div", { class: "rationale " + (isCorrect ? "ok" : "no") }, [
      el("div", { class: "verdict" }, isCorrect ? "Correct" : `Not quite — correct answer: ${"ABCD"[q.answer]}`),
      explanationNode(q),
    ]), nextButton()];
    document.getElementById("feedback").replaceChildren(...parts);
  }

  function buildSpr(q) {
    const submit = () => answerSPR(q, document.getElementById("sprInput").value);
    return el("div", {}, [
      el("div", { class: "spr" }, [
        el("input", {
          id: "sprInput", type: "text", autocomplete: "off", placeholder: "Enter answer",
          onkeydown: (e) => { if (e.key === "Enter") submit(); },
        }),
        el("button", { class: "btn", id: "sprSubmit", onclick: submit }, "Submit"),
      ]),
      el("div", { class: "spr-hint" }, "Type a number, decimal, or fraction (e.g. 3/2, 1.5, .75, -4)."),
    ]);
  }

  // --- SPR grading (Digital SAT student-produced-response rules) ---
  // Accepts integers, decimals (incl. ".5", "-.5"), fractions ("7/24"), and
  // thousands separators ("2,850"). A decimal that doesn't fit the grid may be
  // truncated or rounded as long as it fills it (5 characters, 6 with a minus
  // sign): for 2/3, ".6666", ".6667", "0.666", "0.667" are right, ".67" is not.
  const NUM = String.raw`-?(?:\d+(?:\.\d*)?|\.\d+)`;
  function normalizeEntry(s) {
    return String(s).replace(/\s+/g, "").replace(/[−–]/g, "-").replace(/,(?=\d{3}\b)/g, "");
  }
  function parseNumeric(s) {
    s = normalizeEntry(s);
    if (new RegExp(`^${NUM}$`).test(s)) return parseFloat(s);
    const m = s.match(new RegExp(`^(${NUM})/(${NUM})$`));
    if (m) { const d = parseFloat(m[2]); if (d !== 0) return parseFloat(m[1]) / d; }
    return null;
  }
  function sprAnswers(q) {
    return Array.isArray(q.answers) && q.answers.length ? q.answers : [q.answer];
  }
  function matchesValue(entry, val, target) {
    if (Math.abs(val - target) < 1e-9 * Math.max(1, Math.abs(target))) return true;
    const dec = entry.match(/^-?\d*\.(\d+)$/);
    if (!dec) return false;
    const width = entry.replace(/^-/, "").length;
    // Only a grid-filling decimal may be an approximation (truncated/rounded).
    return width >= 5 && Math.abs(val - target) < Math.pow(10, -dec[1].length);
  }
  // Returns true/false, or null when there is nothing gradable to submit.
  function checkSpr(raw, q) {
    const entry = normalizeEntry(raw || "");
    if (!entry) return null;
    if (q.accept && q.accept.map(normalizeEntry).includes(entry)) return true;
    const val = parseNumeric(entry);
    if (val == null) return null;
    return sprAnswers(q).some((t) => matchesValue(entry, val, t));
  }
  function sprAnswerText(q) {
    if (q.answerText) return q.answerText;
    return q.accept && q.accept.length ? q.accept[0] : String(q.answer);
  }

  function recordAndTally(q, isCorrect) {
    const phase = quiz.mode === "training" ? "training" : quiz.mode;
    Engine.recordAnswer(prog(), q, isCorrect, phase);
    Store.save(state);
    quiz.results.push({ skill: q.skill, correct: isCorrect });
  }

  function nextButton() {
    const last = quiz.idx === quiz.questions.length - 1;
    return el("div", { class: "btn-row" }, [
      el("button", { class: "btn", onclick: () => { if (last) finishQuiz(); else { quiz.idx++; renderQuestion(); } } },
        last ? "See results" : "Next question"),
    ]);
  }

  function answerMC(q, choiceIdx) {
    const isCorrect = choiceIdx === q.answer;
    recordAndTally(q, isCorrect);
    document.querySelectorAll("#choices .choice").forEach((b, i) => {
      b.disabled = true;
      if (i === q.answer) b.classList.add("correct");
      if (i === choiceIdx && !isCorrect) b.classList.add("wrong");
    });
    const parts = [el("div", { class: "rationale " + (isCorrect ? "ok" : "no") }, [
      el("div", { class: "verdict" }, isCorrect ? "Correct" : "Not quite"),
      el("div", {}, q.rationales[choiceIdx]),
    ])];
    if (!isCorrect) parts.push(el("div", { class: "rationale ok", style: "margin-top:8px" }, [
      el("div", { class: "verdict" }, `Correct answer: ${"ABCD"[q.answer]}`),
      el("div", {}, q.rationales[q.answer]),
    ]));
    parts.push(nextButton());
    document.getElementById("feedback").replaceChildren(...parts);
  }

  function answerSPR(q, raw) {
    const isCorrect = checkSpr(raw, q);
    const inp = document.getElementById("sprInput");
    if (isCorrect === null) {
      // Empty or not a number: don't count it as a wrong answer.
      const hint = document.querySelector(".spr-hint");
      if (hint) { hint.textContent = "Enter a number, decimal, or fraction (e.g. 3/2, .75, -4) before submitting."; hint.classList.add("warn"); }
      if (inp) inp.focus();
      return;
    }
    recordAndTally(q, isCorrect);
    if (inp) inp.disabled = true;
    const btn = document.getElementById("sprSubmit"); if (btn) btn.disabled = true;
    const shown = sprAnswerText(q);
    const parts = [el("div", { class: "rationale " + (isCorrect ? "ok" : "no") }, [
      el("div", { class: "verdict" }, isCorrect ? "Correct" : `Not quite — the answer is ${shown}`),
      explanationNode(q),
    ]), nextButton()];
    document.getElementById("feedback").replaceChildren(...parts);
  }

  function finishQuiz() {
    if (quiz.mode === "diagnostic") { prog().diagnosticDone = true; prog().phase = "training"; }
    else if (quiz.mode === "reeval") { prog().cycles += 1; prog().phase = "training"; }
    Store.save(state);

    const bySkill = {};
    for (const r of quiz.results) {
      bySkill[r.skill] = bySkill[r.skill] || { correct: 0, total: 0 };
      bySkill[r.skill].total += 1;
      if (r.correct) bySkill[r.skill].correct += 1;
    }
    const correct = quiz.results.filter((r) => r.correct).length;
    const total = quiz.results.length;

    const root = el("div", {}, [
      el("div", { class: "card" }, [
        el("h2", {}, `${quiz.title} complete`),
        el("div", { class: "stat-grid" }, [
          stat(`${correct}/${total}`, "Correct"),
          stat(`${Math.round((correct / total) * 100)}%`, "Accuracy"),
        ]),
      ]),
      el("div", { class: "card" }, [
        el("h3", {}, "By skill this session"),
        ...Object.entries(bySkill).map(([sid, v]) =>
          el("div", { class: "result-skill" }, [
            el("span", {}, tax().skillById[sid].name),
            el("span", { class: v.correct === v.total ? "" : "muted" }, `${v.correct}/${v.total}`),
          ])),
        el("div", { class: "btn-row" }, [
          el("button", { class: "btn", onclick: () => go("dashboard") }, "Back to loop"),
          el("button", { class: "btn secondary", onclick: () => go("skills") }, "View skill mastery"),
        ]),
      ]),
    ]);
    quiz = null;
    view().replaceChildren(root);
    window.scrollTo(0, 0);
  }

  // =======================================================================
  // Help / data management
  // =======================================================================
  function renderHelp() {
    const root = el("div", {}, [
      el("div", { class: "card" }, [
        el("h2", {}, "How the loop works"),
        el("p", { class: "small" }, "SATrainer runs a continuous improvement cycle, separately for each section:"),
        el("ol", { class: "small" }, [
          el("li", {}, "Evaluate — a mixed diagnostic finds your weak skills."),
          el("li", {}, "Train — targeted drills on your lowest-mastery skills, with full explanations."),
          el("li", {}, "Re-evaluate — a fresh mixed test confirms your gains and completes a cycle."),
          el("li", {}, "Repeat — the dashboard always shows the single best next step."),
        ]),
        el("p", { class: "small muted" },
          "Switch between Reading & Writing and Math with the toggle at the top. Each section tracks its own mastery and loop."),
      ]),
      el("div", { class: "card" }, [
        el("h2", {}, "Your data"),
        el("p", { class: "small muted" },
          "Progress is stored only in this browser (localStorage). Export a backup or move it to another machine below."),
        el("div", { class: "btn-row" }, [
          el("button", { class: "btn secondary", onclick: exportData }, "Export progress"),
          el("button", { class: "btn secondary", onclick: () => document.getElementById("importFile").click() }, "Import progress"),
          el("button", { class: "btn ghost", onclick: resetData }, "Reset all progress"),
        ]),
        el("input", { type: "file", id: "importFile", accept: "application/json", class: "hidden", onchange: importData }),
      ]),
    ]);
    view().replaceChildren(root);
  }

  function exportData() {
    const blob = new Blob([Store.exportJSON(state)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = el("a", { href: url, download: "satrainer-progress.json" });
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }
  function importData(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try { state = Store.importJSON(reader.result); Store.save(state); alert("Progress imported."); go("dashboard"); }
      catch (err) { alert("Import failed: " + err.message); }
    };
    reader.readAsText(file);
  }
  function resetData() {
    if (!confirm("Erase all progress for both sections and start over? This cannot be undone.")) return;
    state = Store.reset(); go("dashboard");
  }

  // ---- wire up -----------------------------------------------------------
  document.querySelectorAll(".nav button").forEach((b) => b.addEventListener("click", () => go(b.dataset.route)));
  document.querySelectorAll("#sectionSwitch button").forEach((b) => b.addEventListener("click", () => switchSection(b.dataset.section)));
  go("dashboard");
})();
