/**
 * Offline heuristic feedback and scores - illustrative, not a substitute for human review.
 */

const JUNIOR_LEVELS = new Set(["intern", "newgrad"]);

/** @param {string} [levelId] */
export function isJuniorLevel(levelId) {
  return JUNIOR_LEVELS.has(String(levelId || ""));
}

/**
 * @param {string} answer
 * @param {{ kind: string; text: string }} question
 * @param {number} salt
 * @param {string} [levelId]
 */
export function offlineFeedback(answer, question, salt, levelId = "mid") {
  const t = answer.trim();
  const len = t.length;
  const words = t.split(/\s+/).filter(Boolean).length;
  const kind = question.kind;
  const junior = isJuniorLevel(levelId);

  const blocks = [];

  if (junior) {
    if (len < 40 || words <= 3) {
      blocks.push(
        "For intern / new grad practice, you still want a clear thread: what the situation was, what you contributed, and what happened next. " +
          "It is OK if the example is from class, a club, or a small project - just make your part concrete.",
      );
    } else if (len < 100) {
      blocks.push(
        "You are close to a solid answer for your level - add a bit more: one sentence on your personal role and one on the outcome or what you learned.",
      );
    } else {
      blocks.push(
        "Good amount to work with for your level. Next, polish structure so the interviewer can follow without effort - lead with context, then what you did, then result.",
      );
    }
  } else {
    if (len < 40 || words <= 3) {
      blocks.push(
        "This answer would not meet the bar in most onsite rounds: it does not give the interviewer enough to score " +
          "ownership, judgment, or impact. In a real loop, pause, ask for 10 seconds to think, then deliver a compact story.",
      );
    } else if (len < 120) {
      blocks.push(
        "You are in the right direction on length, but the answer still reads like notes rather than a full response. " +
          "Aim for one clear narrative with a beginning (context), middle (what you did), and end (result or lesson).",
      );
    } else {
      blocks.push(
        "Length is workable for practice. The next step is to stress-test structure: every sentence should earn its place " +
          "and push the rubric (ownership, tradeoffs, or outcomes) forward.",
      );
    }
  }

  if (kind === "behavioral") {
    const outcome = /(result|outcome|impact|metric|\d+%|reduced|increased|saved|learned|lesson)/i.test(t);
    const ownership = /(i |we |my team|i led|i owned|i proposed|i drove|i was responsible)/i.test(t);
    const context = /(when |during|project|quarter|team|stakeholder|conflict|deadline|mistake)/i.test(t);

    if (junior) {
      blocks.push(
        "Behavioral check (new grad / intern): " +
          (outcome ? "You mention an outcome or learning - good start. " : "Add what changed or what you learned, even in one sentence. ") +
          (ownership ? "Ownership is coming through. " : "Clarify what you personally did (\"I implemented…\", \"I coordinated…\"). ") +
          (context ? "Context is there. " : "A tiny bit of when/where helps the story feel real."),
      );
      if (!outcome) {
        blocks.push(
          "At your level, interviewers still want a takeaway - e.g. \"we shipped on time\" or \"I learned to communicate earlier.\"",
        );
      }
      if (!ownership) {
        blocks.push(
          "Avoid sounding like the group did everything: one sentence that starts with \"I\" and names your task helps a lot.",
        );
      }
    } else {
      blocks.push(
        "Behavioral rubric check: " +
          (outcome ? "You hinted at outcomes or learning - keep quantifying where you can. " : "Missing a crisp outcome or lesson - add what changed because of your actions. ") +
          (ownership ? "You signal some ownership. " : "Make first-person ownership unmistakable: what did you personally decide or execute? ") +
          (context ? "There is situational context. " : "Ground the story in time, team, and constraints so it feels verifiable."),
      );

      if (!outcome) {
        blocks.push(
          "Go deeper on impact: even a directional metric (latency down, tickets cleared, NPS movement) or a qualitative " +
            "result (trust rebuilt, launch unblocked) helps interviewers compare you to other candidates.",
        );
      }
      if (!ownership) {
        blocks.push(
          "Interviewers often fail candidates who sound like the team did the work. Re-read your answer and count " +
            'sentences that start with "I" and describe a decision or action only you could take.',
        );
      }
    }
  } else if (junior) {
    const tradeoff = /(tradeoff|latency|scale|failure|error|bottleneck|constraint|alternative|versus|vs\.|cost|complexity)/i.test(t);
    const mechanism = /(api|database|cache|queue|shard|replica|partition|consistent|event|retry|idempot)/i.test(t);
    const reasoning = /(because|therefore|so that|in order to|if we|otherwise)/i.test(t);

    blocks.push(
      "Technical check (new grad / intern): " +
        (tradeoff ? "You touch on alternatives or constraints - strong for your level. " : "Try naming one tradeoff or constraint, even simply (speed vs correctness). ") +
        (mechanism ? "Some concrete tech appears - good. " : "If you can, mention a specific tool or component (DB, queue, API) you would use. ") +
        (reasoning ? "You link choices to reasons. " : "One \"because…\" sentence helps interviewers follow your logic."),
    );
    if (len > 60 && !tradeoff) {
      blocks.push(
        "You do not need senior system design - just show you can compare options and pick one with a reason.",
      );
    }
  } else {
    const tradeoff = /(tradeoff|latency|scale|failure|error|bottleneck|constraint|alternative|versus|vs\.|cost|complexity)/i.test(t);
    const mechanism = /(api|database|cache|queue|shard|replica|partition|consistent|event|retry|idempot)/i.test(t);
    const reasoning = /(because|therefore|so that|in order to|if we|otherwise)/i.test(t);

    blocks.push(
      "Technical rubric check: " +
        (tradeoff ? "You mention engineering tension or alternatives - good signal. " : "Name at least one real tradeoff (latency vs consistency, cost vs complexity, etc.). ") +
        (mechanism ? "Some concrete mechanism appears. " : "Push one level deeper: names of components, failure modes, or interfaces you would rely on. ") +
        (reasoning ? "You link choices to reasons. " : "Explicitly chain design choices to requirements with \"because\" or \"so that\"."),
    );

    if (len > 100 && !tradeoff) {
      blocks.push(
        "For system-style prompts, interviewers often listen for what you would not do and why. Add one rejected option " +
          "and the downside you avoided.",
      );
    }
  }

  const drillsJunior = [
    "Drill: answer the same question in 60 seconds out loud, then again in 90 seconds - notice what extra detail you add the second time.",
    "Drill: write one sentence that starts with \"My responsibility was…\" and one that starts with \"The outcome was…\".",
    "Drill: pick one technical term you used and define it in plain English in a single sentence (practice for nervous moments).",
    "Drill: practice with a friend who only says \"why?\" after each sentence - tighten until each answer holds.",
  ];
  const drillsSenior = [
    "Drill: record a 90-second version of this answer, then cut filler words until you land under 75 seconds without losing the result.",
    "Drill: rewrite the same story using only STAR headings (Situation / Task / Action / Result) as bullet labels, then turn it back into prose.",
    "Drill: add one sentence that starts with \"The risk was…\" and one that starts with \"We validated by…\" - even hypothetically.",
    "Drill: ask a peer to interrupt you once mid-answer; practice recovering without losing your thread.",
  ];
  blocks.push((junior ? drillsJunior : drillsSenior)[salt % 4]);

  return blocks.join("\n\n");
}

/**
 * Interviewer line before the next question - must not praise thin or placeholder answers.
 * @param {string} answer
 * @param {number} seed
 */
export function pickInterviewerAck(answer, seed) {
  const t = answer.trim();
  const len = t.length;
  const words = t.split(/\s+/).filter(Boolean).length;

  const neutral = [
    "Thanks - let's move on.",
    "Let's take the next question.",
    "Understood - moving on.",
    "No problem - here's the next one.",
  ];

  if (len < 45 || words <= 2) {
    return `${neutral[Math.abs(seed) % neutral.length]} `;
  }

  const mixed = [
    "Thanks - that helps.",
    "Got it.",
    "Appreciate you sharing that.",
    "Understood.",
  ];

  if (len < 140) {
    return `${mixed[Math.abs(seed) % mixed.length]} `;
  }

  const warm = [
    "Thanks - useful context.",
    "Appreciate the specifics.",
    "That gives me a clearer picture.",
  ];
  return `${warm[Math.abs(seed) % warm.length]} `;
}

/**
 * 1–5 rubric; intern/new grad uses a more lenient curve.
 * @param {string} text
 * @param {'behavioral'|'technical'} kind
 * @param {string} [levelId]
 * @returns {number} 1–5
 */
export function scoreAnswer(text, kind, levelId = "mid") {
  const junior = isJuniorLevel(levelId);
  const t = text.trim();
  const len = t.length;
  const words = t.split(/\s+/).filter(Boolean).length;

  if (len < 10 || words <= 1) return 1;

  if (junior) {
    if (len < 30 || words < 5) return 2;
  } else {
    if (len < 45 || words < 8) return 2;
  }

  if (kind === "behavioral") {
    return scoreBehavioral(t, len, junior);
  }
  return scoreTechnical(t, len, junior);
}

/**
 * @param {string} t
 * @param {number} len
 * @param {boolean} junior
 */
function scoreBehavioral(t, len, junior) {
  const outcome = /(result|outcome|impact|metric|\d+%|learned|lesson|because we|saved|reduced|increased)/i.test(t);
  const ownership = /(i |we |my team|i led|i owned|i proposed|i drove|i was responsible)/i.test(t);
  const context = /(when |during|project|team|stakeholder|quarter|deadline|conflict|mistake|challenge)/i.test(t);

  let s = 2;
  const t100 = junior ? 70 : 100;
  const t200 = junior ? 150 : 200;
  const t350 = junior ? 280 : 350;

  if (len >= t100) s = 3;
  if (len >= t200) s = 3;
  if (len >= t350) s = 4;

  if (junior) {
    if (!outcome) s = Math.min(s, 3);
    else if (!ownership) s = Math.min(s, 3);
    if (!context && len < 120) s = Math.min(s, 3);

    if (outcome && ownership && len >= 100) s = Math.max(s, 3);
    if (outcome && ownership && context && len >= 140) s = Math.max(s, 4);
    if (outcome && ownership && context && len >= 220 && /(reflect|learned|would|class|intern|team)/i.test(t)) {
      s = Math.max(s, 4);
    }
    if (s >= 4 && len >= 200 && outcome && ownership && (/\d/.test(t) || /(reflect|learned)/i.test(t))) {
      s = Math.min(5, Math.max(s, 4));
    }
    if (len >= 260 && outcome && ownership && context) s = 5;

    return Math.max(1, Math.min(5, s));
  }

  if (!outcome) s = Math.min(s, 2);
  else if (!ownership) s = Math.min(s, 3);
  if (!context && len < 180) s = Math.min(s, 3);

  if (outcome && ownership && context && len >= 160) s = Math.max(s, 3);
  if (outcome && ownership && context && len >= 220 && /(reflect|next time|learned|would)/i.test(t)) s = Math.max(s, 4);
  if (outcome && ownership && context && len >= 300 && /\d/.test(t)) s = Math.min(5, Math.max(s, 4));

  if (s >= 4 && len >= 280 && outcome && ownership && context && (/\d/.test(t) || /(reflect|learned)/i.test(t))) {
    s = 5;
  }

  return Math.max(1, Math.min(5, s));
}

/**
 * @param {string} t
 * @param {number} len
 * @param {boolean} junior
 */
function scoreTechnical(t, len, junior) {
  const tradeoff = /(tradeoff|latency|scale|failure|error|bottleneck|constraint|alternative|versus|vs\.|cost|complexity|CAP|partition|benefit|drawback|downside|instead|rather|pros|cons)/i.test(t);
  const mechanism = /(api|database|cache|queue|shard|replica|consistent|event|retry|idempot|load|node|service|region|sync)/i.test(t);
  const reasoning = /(because|therefore|so that|in order to|if we|otherwise)/i.test(t);

  let s = 2;
  const t100 = junior ? 75 : 100;
  const t260 = junior ? 200 : 260;

  if (len >= t100) s = 3;
  if (len >= t260) s = 4;

  if (junior) {
    if (!tradeoff && len < 70) s = Math.min(s, 2);
    else if (!tradeoff && len < 200) s = Math.min(s, 3);

    if (!mechanism && len < 90) s = Math.min(s, 2);

    if (tradeoff && reasoning && len >= 120) s = Math.max(s, 3);
    if (tradeoff && len >= 140) s = Math.max(s, 3);
    if ((mechanism || tradeoff) && reasoning && len >= 180) s = Math.max(s, 4);
    if (tradeoff && mechanism && reasoning && len >= 240) s = Math.min(5, Math.max(s, 4));

    return Math.max(1, Math.min(5, s));
  }

  if (!tradeoff && len < 110) s = Math.min(s, 2);
  else if (!tradeoff && len < 240) s = Math.min(s, 3);

  if (!mechanism && len < 130) s = Math.min(s, 2);

  if (tradeoff && reasoning && len >= 200) s = Math.max(s, 3);
  if (tradeoff && mechanism && reasoning && len >= 260) s = Math.max(s, 4);
  if (tradeoff && mechanism && reasoning && len >= 360 && /(fail|monitor|roll|test|validate|observ)/i.test(t)) {
    s = Math.min(5, Math.max(s, 4));
  }

  return Math.max(1, Math.min(5, s));
}

/**
 * @param {string[]} userAnswersInOrder
 * @param {{ kind: string }[]} queue
 * @param {string} [levelId]
 */
export function computeOfflineFinal(userAnswersInOrder, queue, levelId = "mid") {
  const junior = isJuniorLevel(levelId);
  const bScores = [];
  const tScores = [];
  for (let i = 0; i < queue.length; i++) {
    const ans = userAnswersInOrder[i] ?? "";
    const sc = scoreAnswer(ans, queue[i].kind, levelId);
    if (queue[i].kind === "behavioral") bScores.push(sc);
    else tScores.push(sc);
  }

  const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : junior ? 3 : 2.5);
  const weakThreshold = junior ? 35 : 55;
  const anyWeak = userAnswersInOrder.some((a) => (a || "").trim().length < weakThreshold);

  let behavioral = Math.max(1, Math.min(5, Math.round(avg(bScores))));
  let technical = Math.max(1, Math.min(5, Math.round(avg(tScores))));

  if (anyWeak && !junior) {
    behavioral = Math.min(behavioral, Math.max(1, behavioral - 1));
    technical = Math.min(technical, Math.max(1, technical - 1));
  }

  const overall = Math.max(1, Math.min(5, Math.round((behavioral + technical) / 2)));
  const workOn = buildWorkOnList(behavioral, technical, userAnswersInOrder, levelId);

  return {
    behavioral,
    technical,
    overall,
    workOn,
    note: junior
      ? "Lenient heuristic for intern / new grad (growth-oriented). Mid+ roles use a stricter bar in this app."
      : "Strict heuristic preview (structure + length + keyword signals). Not a substitute for human interviewers.",
  };
}

/**
 * @param {number} behavioral
 * @param {number} technical
 * @param {string[]} userAnswersInOrder
 * @param {string} [levelId]
 */
function buildWorkOnList(behavioral, technical, userAnswersInOrder, levelId = "mid") {
  const junior = isJuniorLevel(levelId);
  const out = [];

  const lowBeh = junior ? behavioral <= 2 : behavioral <= 3;
  const lowTech = junior ? technical <= 2 : technical <= 3;

  if (lowBeh) {
    out.push(
      junior
        ? "Behavioral: practice two stories from school, internships, or projects - each with what you did (I…) and what happened (result or learning)."
        : "Behavioral: rehearse three stories with explicit Situation → your Action → quantified or qualitative Result, plus one sentence on what you would do differently.",
    );
  } else if (!junior && behavioral < technical - 1) {
    out.push(
      "Behavioral stories are trailing your technical depth - add metrics, scope, and first-person ownership to every example.",
    );
  }

  if (lowTech) {
    out.push(
      junior
        ? "Technical: when stuck, say your assumptions aloud, propose one simple design, and give one reason you would pick it (speed, cost, correctness)."
        : "Technical: for each design question, default to listing constraints, two viable approaches, tradeoffs, and how you would test or roll out.",
    );
  } else if (!junior && technical < behavioral - 1) {
    out.push(
      "Technical answers are weaker than behavioral - drill one system-design skeleton (API, storage, scaling, failure) per week.",
    );
  }

  const shortLen = junior ? 55 : 80;
  const short = userAnswersInOrder.filter((a) => (a || "").trim().length < shortLen).length;
  if (short >= 1) {
    out.push(
      junior
        ? `${short} answer(s) were very short - aim for ~60–90 seconds of speaking, or ~80–120 words, when you practice.`
        : `${short} answer(s) were under-developed - in practice, aim for ~120–180 words or ~90 seconds spoken per prompt unless the interviewer stops you.`,
    );
  }

  const avgLen =
    userAnswersInOrder.reduce((acc, a) => acc + (a || "").trim().length, 0) / Math.max(1, userAnswersInOrder.length);
  const avgThreshold = junior ? 90 : 140;
  if (avgLen < avgThreshold) {
    out.push(
      junior
        ? "Overall: add a few more concrete details (who, what you built, what you learned) - interviewers want to picture you in the work."
        : "Overall: average depth is low - interviewers infer preparation from specificity; expand with names, timelines, and decisions only you made.",
    );
  }

  out.push(
    junior
      ? "Meta: do one 15-minute practice session weekly - same questions until answers feel natural, not memorized."
      : "Meta: do one full mock with a timer (8–10 min per round) and force yourself to finish each answer with \"So the result was…\" or \"The tradeoff was…\"",
  );

  return out.slice(0, 6);
}
