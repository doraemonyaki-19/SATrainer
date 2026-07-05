/*
 * SATrainer — persistence layer (localStorage).
 *
 * v2: progress is tracked per section ("rw" and "math"), each running its own
 * evaluate -> train -> re-evaluate loop. Migrates v1 (single R&W profile) by
 * moving it under sections.rw.
 *
 * Exposes a global `Store`.
 */

const Store = (() => {
  const KEY = "satrainer.v1"; // key name kept for continuity across versions

  function blankSection() {
    return {
      skills: {}, // skillId -> { attempts, correct, mastery, lastSeen }
      history: [], // { ts, skill, questionId, correct, difficulty, phase }
      cycles: 0,
      diagnosticDone: false,
      phase: "diagnostic", // "diagnostic" | "training" | "reeval"
    };
  }

  function blankState() {
    return {
      version: 2,
      createdAt: Date.now(),
      activeSection: "rw",
      sections: { rw: blankSection(), math: blankSection() },
    };
  }

  function migrateV1(v1) {
    const s = blankState();
    s.createdAt = v1.createdAt || Date.now();
    s.sections.rw = {
      skills: v1.skills || {},
      history: v1.history || [],
      cycles: v1.cycles || 0,
      diagnosticDone: !!v1.diagnosticDone,
      phase: v1.phase || "diagnostic",
    };
    return s;
  }

  function normalize(parsed) {
    if (!parsed) return blankState();
    if (parsed.version === 1) return migrateV1(parsed);
    if (parsed.version === 2) {
      // Defensive: ensure both sections exist.
      parsed.sections = parsed.sections || {};
      parsed.sections.rw = parsed.sections.rw || blankSection();
      parsed.sections.math = parsed.sections.math || blankSection();
      parsed.activeSection = parsed.activeSection || "rw";
      return parsed;
    }
    return blankState();
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return blankState();
      return normalize(JSON.parse(raw));
    } catch (e) {
      console.warn("SATrainer: failed to load state, starting fresh.", e);
      return blankState();
    }
  }

  function save(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      console.error("SATrainer: failed to save state.", e);
    }
  }

  function reset() {
    localStorage.removeItem(KEY);
    return blankState();
  }

  function exportJSON(state) {
    return JSON.stringify(state, null, 2);
  }

  function importJSON(text) {
    const parsed = JSON.parse(text);
    if (!parsed || (parsed.version !== 1 && parsed.version !== 2)) {
      throw new Error("Unrecognized or incompatible SATrainer save file.");
    }
    return normalize(parsed);
  }

  return { blankState, blankSection, load, save, reset, exportJSON, importJSON };
})();
