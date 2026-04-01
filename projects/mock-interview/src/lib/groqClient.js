import { isJuniorLevel } from "./feedback.js";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
/** Groq free tier: fast models; swap if deprecated - check https://console.groq.com/docs/models */
export const DEFAULT_GROQ_MODEL = "llama-3.1-8b-instant";

/**
 * @param {{ apiKey: string; system: string; messages: { role: 'user'|'assistant'; content: string }[]; model?: string; temperature?: number; max_tokens?: number }}
 */
export async function groqChat({
  apiKey,
  system,
  messages,
  model = DEFAULT_GROQ_MODEL,
  temperature = 0.65,
  max_tokens = 900,
}) {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: system }, ...messages],
      temperature,
      max_tokens,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || res.statusText || "Groq request failed";
    throw new Error(msg);
  }
  const text = data?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("Empty response from Groq");
  }
  return text.trim();
}

export function buildSystemPrompt({ companyDisplay, role, level, hiringManagerNote, levelId }) {
  const junior = isJuniorLevel(levelId);

  const coachBlock = junior
    ? `Part 1 - Coach feedback (supportive, in-depth, intern/new grad bar): Write 5–8 sentences across 2 short paragraphs. They are not expected to match senior depth. Structure:
(1) One sentence on what worked (clarity, effort, or a good instinct);
(2) One or two specific, kind improvements tied to their text (ownership, outcome, or simple technical reasoning) - frame as "next step," not failure;
(3) One small practice drill (2–5 minutes).
Do not repeat the interview question verbatim. Encourage growth; avoid harsh or discouraging language.`
    : `Part 1 - Coach feedback (strict, in-depth): Write 6–10 sentences across 2–3 short paragraphs. Structure explicitly:
(1) One sentence on what (if anything) met the bar for this question type;
(2) Two or more specific gaps (missing ownership, missing outcome, missing tradeoffs, shallow technical depth, unclear structure, etc.) tied to what they actually wrote;
(3) One concrete practice drill or rewrite instruction they could do in 5 minutes.
Do not repeat the interview question verbatim. Do not give generic praise if the answer was thin.`;

  return `You are a hiring manager conducting a realistic mock interview for ${companyDisplay}. The candidate is applying for: ${role}. Level: ${level}.

Context (illustrative - use as tone and theme guidance, not verbatim facts about the company):
${hiringManagerNote}

Rules:
- Stay in character as a professional hiring manager. Be concise.
- Mix behavioral and technical questions appropriate to the level. Senior candidates get more system design and leadership depth; interns and new grads get fundamentals, learning mindset, and reasonable-scope problems - not trick senior-only design grills.
- Do not ask illegal interview questions (age, family status, religion, etc.).
- This is practice: you may reference commonly discussed interview themes for large tech companies, but do not claim insider knowledge or confidential processes.

**Response format (required):** Every reply must be exactly two parts separated by a line containing only three dashes: ---
${coachBlock}
Part 2 - Interviewer: Brief transition, then ONE next interview question (behavioral or technical), OR a short wrap-up if the candidate said they are done.

In part 2, never praise a thin, off-topic, or one-word answer (do not say "great answer," "useful answer," or similar). For weak answers use neutral transitions only: e.g. "Thanks - let's move on," "Here's the next question." Reserve warmer acknowledgment for substantive replies.

Keep part 2 under ~160 words.`;
}

const EVAL_SYSTEM = `You are a senior interview coach. Read the mock interview transcript (hiring manager + candidate + coach). Calibrate like a strong tech company loop: most candidates land 2–3; 4 requires clear evidence; 5 is rare and requires sustained depth, structure, and signal across answers.

Reply with ONLY valid JSON (no markdown fences), exactly this shape:
{"behavioralScore":1,"technicalScore":1,"overallScore":1,"summary":"string","workOn":["string"]}

Rules:
- Scores are integers from 1 to 5. Be strict: short, vague, or off-topic answers must pull scores down.
- behavioralScore: STAR-style clarity, first-person ownership, measurable or qualitative outcomes, reflection - penalize missing outcomes or ownership.
- technicalScore: mechanisms, tradeoffs, constraints, failure modes, validation - penalize hand-waving or buzzwords without reasoning.
- overallScore: holistic bar for the role (not necessarily the average of the two); thin transcripts should rarely exceed 3.
- summary: 2–4 sentences with specific strengths and gaps (reference patterns from the transcript, not generic advice).
- workOn: 4–6 concrete, prioritized practice items (drills, structures to rehearse, types of detail to add).
- If the transcript is very short, scores should reflect that; explain why in summary and workOn.`;

const EVAL_SYSTEM_JUNIOR = `You are a supportive interview coach. Read the mock interview transcript (hiring manager + candidate + coach). The candidate is an intern or new grad.

Reply with ONLY valid JSON (no markdown fences), exactly this shape:
{"behavioralScore":1,"technicalScore":1,"overallScore":1,"summary":"string","workOn":["string"]}

Calibration (lenient for level):
- Scores are integers from 1 to 5. A solid, clear performance often lands at 3; 4 means clearly strong for intern/new grad; 5 is exceptional maturity and signal - rare.
- behavioralScore: learning mindset, ownership where possible, communication, any outcome or lesson - do not demand senior metrics.
- technicalScore: sound reasoning, fundamentals, ability to discuss tradeoffs simply - not full production system design.
- overallScore: holistic for the level; reward preparation and clarity.
- summary: 2–4 sentences, honest but encouraging; reference patterns from the transcript.
- workOn: 4–6 gentle, actionable practice items suited to early-career candidates.
- Thin or nervous answers: score fairly but kindly; explain gaps in workOn without harsh judgment.`;

/**
 * @param {string} raw
 * @returns {{ behavioralScore: number; technicalScore: number; overallScore: number; summary: string; workOn: string[] }}
 */
export function parseEvaluationJson(raw) {
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "");
  }
  const obj = JSON.parse(text);
  const clamp = (n) => Math.max(1, Math.min(5, Math.round(Number(n))));
  return {
    behavioralScore: clamp(obj.behavioralScore),
    technicalScore: clamp(obj.technicalScore),
    overallScore: clamp(obj.overallScore),
    summary: String(obj.summary || "").trim() || "See scores and focus areas below.",
    workOn: Array.isArray(obj.workOn) ? obj.workOn.map(String).slice(0, 8) : [],
  };
}

/**
 * @param {{ apiKey: string; transcript: string; model?: string; levelId?: string }}
 */
export async function groqEvaluateInterview({ apiKey, transcript, model = DEFAULT_GROQ_MODEL, levelId }) {
  const system = isJuniorLevel(levelId) ? EVAL_SYSTEM_JUNIOR : EVAL_SYSTEM;
  const text = await groqChat({
    apiKey,
    system,
    messages: [{ role: "user", content: `Transcript:\n\n${transcript}` }],
    model,
    temperature: 0.3,
    max_tokens: 1000,
  });
  try {
    return parseEvaluationJson(text);
  } catch {
    throw new Error("Could not parse evaluation JSON - try End interview again.");
  }
}

/**
 * Splits model reply into coach vs interviewer when formatted with --- per system prompt.
 * @param {string} reply
 * @returns {{ coach: string | null; interviewer: string }}
 */
export function splitCoachReply(reply) {
  const parts = reply.split(/\n---\n/);
  if (parts.length >= 2) {
    return {
      coach: parts[0].trim(),
      interviewer: parts.slice(1).join("\n---\n").trim(),
    };
  }
  return { coach: null, interviewer: reply.trim() };
}

/**
 * @param {string} reply
 * @returns {{ role: 'assistant'; content: string; variant?: 'coach' }[]}
 */
export function replyToDisplayMessages(reply) {
  const { coach, interviewer } = splitCoachReply(reply);
  if (coach) {
    return [
      { role: "assistant", variant: "coach", content: coach },
      { role: "assistant", content: interviewer },
    ];
  }
  return [{ role: "assistant", content: reply }];
}
