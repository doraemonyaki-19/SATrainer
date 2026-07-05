/*
 * SATrainer — mastery model and the evaluate -> train -> re-evaluate loop.
 *
 * Section-agnostic: every function takes an explicit `prog` (a section's
 * progress object from Store.blankSection) plus the relevant `taxonomy` and
 * `questions` pool, so the same engine drives Reading & Writing and Math.
 *
 * Mastery per skill is an exponentially weighted moving average (EWMA) of
 * outcomes, so recent performance dominates — the loop should steer on current
 * readiness, not lifetime average.
 *
 * Exposes a global `Engine`.
 */

const Engine = (() => {
  const ALPHA = 0.3;
  const DIFFICULTY_WEIGHT = { 1: 0.8, 2: 1.0, 3: 1.3 };

  const BANDS = [
    { min: 90, label: "Mastered", cls: "band-mastered" },
    { min: 75, label: "Proficient", cls: "band-proficient" },
    { min: 50, label: "Approaching", cls: "band-approaching" },
    { min: 0, label: "Developing", cls: "band-developing" },
  ];

  function bandFor(mastery) {
    if (mastery == null) return { label: "Not started", cls: "band-none" };
    return BANDS.find((b) => mastery >= b.min);
  }

  function skillRecord(prog, skillId) {
    if (!prog.skills[skillId]) {
      prog.skills[skillId] = { attempts: 0, correct: 0, mastery: null, lastSeen: null };
    }
    return prog.skills[skillId];
  }

  function recordAnswer(prog, question, isCorrect, phase) {
    const rec = skillRecord(prog, question.skill);
    rec.attempts += 1;
    if (isCorrect) rec.correct += 1;
    rec.lastSeen = Date.now();

    const w = DIFFICULTY_WEIGHT[question.difficulty] || 1.0;
    const outcome = isCorrect ? 100 : 0;
    const alpha = Math.min(0.6, ALPHA * w);
    if (rec.mastery == null) {
      rec.mastery = Math.round(outcome * 0.6 + 50 * 0.4);
    } else {
      rec.mastery = Math.round(rec.mastery * (1 - alpha) + outcome * alpha);
    }
    rec.mastery = Math.max(0, Math.min(100, rec.mastery));

    prog.history.push({
      ts: Date.now(),
      skill: question.skill,
      questionId: question.id,
      correct: isCorrect,
      difficulty: question.difficulty,
      phase: phase || prog.phase,
    });
    return rec;
  }

  function overallMastery(prog, taxonomy) {
    const skills = taxonomy.skillList;
    let sum = 0, counted = 0, untested = 0;
    for (const s of skills) {
      const rec = prog.skills[s.id];
      if (rec && rec.mastery != null) { sum += rec.mastery; counted += 1; }
      else untested += 1;
    }
    if (counted === 0) return null;
    const total = sum + untested * 45;
    return Math.round(total / skills.length);
  }

  function estimatedScore(prog, taxonomy) {
    const m = overallMastery(prog, taxonomy);
    if (m == null) return null;
    const score = 200 + Math.round((m / 100) * 600);
    return Math.round(score / 10) * 10;
  }

  function rankedWeakSkills(prog, taxonomy) {
    return taxonomy.skillList
      .map((s) => {
        const rec = prog.skills[s.id];
        return {
          ...s,
          mastery: rec ? rec.mastery : null,
          attempts: rec ? rec.attempts : 0,
        };
      })
      .sort((a, b) => {
        const am = a.mastery == null ? -1 : a.mastery;
        const bm = b.mastery == null ? -1 : b.mastery;
        return am - bm;
      });
  }

  function recommendNextAction(prog, taxonomy) {
    if (!prog.diagnosticDone) {
      return {
        phase: "diagnostic",
        title: "Start with a diagnostic",
        detail:
          "Take a short mixed quiz across every skill so we can find your weak areas before training.",
        cta: "Begin diagnostic",
      };
    }

    const weak = rankedWeakSkills(prog, taxonomy);
    const untested = weak.filter((s) => s.mastery == null);
    const belowProficient = weak.filter((s) => s.mastery != null && s.mastery < 75);

    if (untested.length > 0) {
      return {
        phase: "training",
        title: "Cover the remaining skills",
        detail: `${untested.length} skill${untested.length > 1 ? "s have" : " has"} not been assessed yet. Train them to complete your profile.`,
        cta: "Train weak skills",
        focusSkills: untested.slice(0, 3).map((s) => s.id),
      };
    }
    if (belowProficient.length > 0) {
      const focus = belowProficient.slice(0, 3);
      return {
        phase: "training",
        title: "Train your weakest skills",
        detail: `Focus areas: ${focus.map((s) => s.name).join(", ")}. Drill these, then re-evaluate to confirm gains.`,
        cta: "Train weak skills",
        focusSkills: focus.map((s) => s.id),
      };
    }
    return {
      phase: "reeval",
      title: "Re-evaluate to lock in gains",
      detail:
        "All skills are proficient or better. Take a fresh mixed test to confirm your progress and complete this loop cycle.",
      cta: "Take re-evaluation",
    };
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // opts: { mode, count, focusSkills }
  function buildQuiz(prog, taxonomy, questions, opts) {
    const { mode, count = 10, focusSkills = [] } = opts;
    let pool = questions.slice();

    if (mode === "training" && focusSkills.length > 0) {
      const focused = pool.filter((q) => focusSkills.includes(q.skill));
      pool = focused.length >= Math.min(count, 3) ? focused : pool;
    }

    if (mode === "diagnostic" || mode === "reeval") {
      const bySkill = {};
      for (const q of shuffle(pool)) if (!bySkill[q.skill]) bySkill[q.skill] = q;
      const spread = Object.values(bySkill);
      const chosen = shuffle(spread).slice(0, count);
      if (chosen.length < count) {
        const extra = shuffle(pool.filter((q) => !chosen.includes(q))).slice(
          0,
          count - chosen.length
        );
        return shuffle(chosen.concat(extra));
      }
      return chosen;
    }
    return shuffle(pool).slice(0, count);
  }

  return {
    BANDS,
    bandFor,
    recordAnswer,
    overallMastery,
    estimatedScore,
    rankedWeakSkills,
    recommendNextAction,
    buildQuiz,
  };
})();
