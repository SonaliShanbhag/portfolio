/**
 * Curated themes and example questions (illustrative practice only - not affiliated with any employer).
 */

export const LEVELS = [
  { id: "intern", label: "Intern" },
  { id: "newgrad", label: "New grad" },
  { id: "mid", label: "Mid-level" },
  { id: "senior", label: "Senior" },
];

const behavioral = (lines) => lines.map((text) => ({ kind: "behavioral", text }));
const technical = (lines) => lines.map((text) => ({ kind: "technical", text }));

/** @type {Record<string, { id: string; aliases: string[]; hiringManagerNote: string; behavioral: ReturnType<typeof behavioral>; technical: ReturnType<typeof technical> }>} */
export const COMPANY_PROFILES = {
  google: {
    id: "google",
    aliases: ["google", "alphabet", "google llc"],
    hiringManagerNote:
      "Google often emphasizes general cognitive ability, role-related knowledge, leadership / Googleyness, and structured problem-solving. Interviews frequently use open-ended design and coding with strong communication.",
    behavioral: behavioral([
      "Tell me about a time you had to navigate ambiguity on a project. What was your approach?",
      "Describe a situation where you disagreed with a teammate. How did you resolve it?",
      "Give an example of how you improved something that was not explicitly assigned to you.",
    ]),
    technical: technical([
      "How would you design a rate limiter used by many distributed clients?",
      "Explain tradeoffs between strong consistency and eventual consistency for a cross-region product feature.",
      "Walk through how you would debug a sudden latency spike in a service you own.",
    ]),
  },
  meta: {
    id: "meta",
    aliases: ["meta", "facebook", "fb"],
    hiringManagerNote:
      "Meta often stresses impact at scale, moving fast with measurable experimentation, and collaboration across large codebases. System design and practical tradeoffs appear frequently for senior roles.",
    behavioral: behavioral([
      "Tell me about a product or feature you shipped where you had to balance speed and quality.",
      "Describe a time you used data or metrics to change a team's direction.",
      "How do you handle conflicting priorities from different stakeholders?",
    ]),
    technical: technical([
      "How would you design a news feed ranking system at a high level?",
      "Discuss strategies for reducing memory use in a high-QPS caching layer.",
      "How would you approach rolling out a risky backend change safely?",
    ]),
  },
  amazon: {
    id: "amazon",
    aliases: ["amazon", "aws", "amazon web services"],
    hiringManagerNote:
      "Amazon interviews often reference Leadership Principles. Expect behavioral answers with situation, action, and result, plus operational thinking about scale and customer obsession.",
    behavioral: behavioral([
      "Tell me about a time you took ownership when something was going wrong.",
      "Describe a decision you made with incomplete information. What was the outcome?",
      "Give an example of a time you insisted on a higher standard of quality.",
    ]),
    technical: technical([
      "Design a key-value store API that must stay available during partial failures.",
      "How would you implement idempotent processing for duplicate webhook deliveries?",
      "Explain how you would monitor and alert on error budgets for a critical service.",
    ]),
  },
  microsoft: {
    id: "microsoft",
    aliases: ["microsoft", "msft"],
    hiringManagerNote:
      "Microsoft often blends collaboration and growth mindset with deep technical rounds. Cloud and enterprise scenarios are common for Azure-related roles.",
    behavioral: behavioral([
      "Tell me about a time you mentored someone or helped raise the bar on a team.",
      "Describe a project where you had to work across multiple teams. What made it hard?",
      "How do you approach giving difficult feedback?",
    ]),
    technical: technical([
      "Walk through designing a multi-tenant SaaS feature with strong isolation guarantees.",
      "How would you version and migrate a widely used internal API?",
      "Discuss authentication options for a mobile app calling your backend.",
    ]),
  },
  apple: {
    id: "apple",
    aliases: ["apple"],
    hiringManagerNote:
      "Apple interviews often value craft, user-visible quality, and secrecy-safe problem solving. Expect precision about performance, privacy, and end-to-end ownership.",
    behavioral: behavioral([
      "Tell me about a time you pushed for a better user experience when it was costly to deliver.",
      "Describe a bug or outage you diagnosed under pressure.",
      "How do you balance perfectionism with shipping?",
    ]),
    technical: technical([
      "How would you reduce battery or CPU use for a background processing task on a device?",
      "Design a sync strategy for user data across devices with intermittent connectivity.",
      "Explain how you would test a release that must not regress core user flows.",
    ]),
  },
  netflix: {
    id: "netflix",
    aliases: ["netflix"],
    hiringManagerNote:
      "Netflix often emphasizes freedom and responsibility, strong written communication, and systems that scale globally with resilient playback experiences.",
    behavioral: behavioral([
      "Tell me about a time you influenced a team without formal authority.",
      "Describe a failure you owned. What changed afterward?",
      "How do you approach building trust with partners in other disciplines?",
    ]),
    technical: technical([
      "How would you design a personalized home screen with low latency worldwide?",
      "Discuss fault tolerance for streaming playback when edge nodes fail.",
      "How would you experiment on ranking changes without harming member trust?",
    ]),
  },
  adobe: {
    id: "adobe",
    aliases: ["adobe"],
    hiringManagerNote:
      "Adobe roles often combine customer-facing product thinking with reliable services. Collaboration across design, marketing cloud, and creative workflows is common.",
    behavioral: behavioral([
      "Tell me about a time you delivered software that had to satisfy both technical and business constraints.",
      "Describe how you prioritized bugs versus features in a busy release cycle.",
      "Give an example of improving reliability or observability for a service you touched.",
    ]),
    technical: technical([
      "How would you design a workflow engine that coordinates long-running marketing automations?",
      "Walk through handling duplicate or out-of-order events in an integration pipeline.",
      "How would you roll out a schema change consumed by multiple downstream teams?",
    ]),
  },
};

export const GENERIC = {
  id: "generic",
  aliases: [],
  hiringManagerNote:
    "Use common hiring-manager patterns: clarify scope, probe for tradeoffs, and ask for specific examples with outcomes.",
  behavioral: behavioral([
    "Walk me through a project you are proud of. What was your role and the measurable outcome?",
    "Tell me about a conflict or misalignment on a team and how you handled it.",
    "Describe a time you failed or missed a deadline. What did you learn?",
    "Give an example of giving or receiving feedback that changed how you worked.",
  ]),
  technical: technical([
    "How would you design an API for a feature that must scale to many tenants?",
    "Explain how you would add caching to a read-heavy service and what could go wrong.",
    "Walk through diagnosing a production incident: what steps do you take first?",
    "How do you approach testing for a critical payment or data path?",
    "Discuss tradeoffs between SQL and NoSQL for a new feature.",
  ]),
};

function normalize(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * @param {string} rawCompany
 * @returns {{ profile: typeof GENERIC & { displayName: string }; matched: boolean }}
 */
export function resolveCompany(rawCompany) {
  const n = normalize(rawCompany);
  if (!n) {
    return { profile: { ...GENERIC, displayName: "your target company" }, matched: false };
  }
  for (const key of Object.keys(COMPANY_PROFILES)) {
    const p = COMPANY_PROFILES[key];
    if (p.aliases.some((a) => n === a || n.includes(a) || a.includes(n))) {
      return { profile: { ...p, displayName: rawCompany.trim() }, matched: true };
    }
  }
  return {
    profile: {
      ...GENERIC,
      displayName: rawCompany.trim(),
      hiringManagerNote: `${GENERIC.hiringManagerNote} Tailor questions to what is publicly known about ${rawCompany.trim()} and the role.`,
    },
    matched: false,
  };
}

/**
 * Seeded shuffle for repeatable but varied order per session.
 * @param {number} seed
 * @param {T[]} arr
 * @returns {T[]}
 * @template T
 */
export function seededShuffle(seed, arr) {
  const out = [...arr];
  let s = seed >>> 0;
  for (let i = out.length - 1; i > 0; i--) {
    s = (1664525 * s + 1013904223) >>> 0;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function hashSeed(parts) {
  let h = 2166136261;
  for (const part of parts) {
    for (let i = 0; i < part.length; i++) {
      h ^= part.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    h ^= 58;
  }
  return h >>> 0;
}

/**
 * @param {{ company: string; role: string; level: string; profile: ReturnType<typeof resolveCompany>["profile"] }}
 */
export function buildQuestionQueue({ company, role, level, profile }) {
  const seed = hashSeed([company, role, level, profile.id]);
  const bPool = seededShuffle(seed, [...profile.behavioral]);
  const tPool = seededShuffle(seed + 1, [...profile.technical]);
  const n = level === "senior" ? 4 : 3;
  const queue = [];
  for (let i = 0; i < n; i++) {
    queue.push(bPool[i % bPool.length]);
    queue.push(tPool[i % tPool.length]);
  }
  if (level === "intern" || level === "newgrad") {
    return queue.slice(0, 5);
  }
  return queue.slice(0, 6);
}
