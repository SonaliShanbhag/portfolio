import React, { useCallback, useMemo, useState } from "react";
import { buildQuestionQueue, LEVELS, resolveCompany } from "./data/companies.js";
import { buildFollowUp, buildOpening } from "./lib/offlineInterview.js";
import { computeOfflineFinal, offlineFeedback } from "./lib/feedback.js";
import {
  buildSystemPrompt,
  groqChat,
  groqEvaluateInterview,
  replyToDisplayMessages,
} from "./lib/groqClient.js";

const STORAGE_KEY = "mock-interview-groq-key";

function MessageBubble({ role, children, variant }) {
  const isUser = role === "user";
  const isCoach = variant === "coach";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[min(100%,42rem)] rounded-2xl border px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "border-fuchsia-500/30 bg-fuchsia-950/40 text-zinc-100"
            : isCoach
              ? "border-cyan-500/25 bg-cyan-950/25 text-zinc-200"
              : "border-white/10 bg-white/[0.04] text-zinc-200"
        }`}
      >
        {!isUser && (
          <p
            className={`mb-2 text-xs font-medium uppercase tracking-wider ${
              isCoach ? "text-cyan-300/85" : "text-emerald-400/90"
            }`}
          >
            {isCoach ? "Coach" : "Interviewer"}
          </p>
        )}
        {isUser && (
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-fuchsia-300/80">You</p>
        )}
        <div className="whitespace-pre-wrap">{children}</div>
      </div>
    </div>
  );
}

function formatTranscript(msgs) {
  return msgs
    .map((m) => {
      if (m.role === "user") return `Candidate: ${m.content}`;
      if (m.variant === "coach") return `Coach feedback: ${m.content}`;
      return `Interviewer: ${m.content}`;
    })
    .join("\n\n");
}

function FinalScoreCard({ evaluation }) {
  const b = evaluation.behavioral ?? evaluation.behavioralScore;
  const t = evaluation.technical ?? evaluation.technicalScore;
  const o = evaluation.overall ?? evaluation.overallScore;
  const workOn = evaluation.workOn ?? [];
  const summary = evaluation.summary;
  const note = evaluation.note;

  return (
    <div className="rounded-2xl border border-emerald-500/25 bg-emerald-950/20 p-6">
      <h3 className="font-display text-lg font-bold text-white">Final interview report</h3>
      <p className="mt-1 text-xs text-zinc-500">Illustrative scores — keep practicing with real humans when possible.</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Behavioral", value: b },
          { label: "Technical", value: t },
          { label: "Overall", value: o },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-white/10 bg-black/30 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</p>
            <p className="mt-1 font-display text-3xl font-bold text-emerald-300">
              {value}
              <span className="text-lg font-semibold text-zinc-500">/5</span>
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-emerald-500/90 transition-all"
                style={{ width: `${Math.min(100, (Number(value) / 5) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      {summary && (
        <p className="mt-5 text-sm leading-relaxed text-zinc-300">{summary}</p>
      )}
      {workOn.length > 0 && (
        <div className="mt-5">
          <p className="text-sm font-medium text-zinc-200">What to work on</p>
          <ul className="mt-2 list-inside list-disc space-y-1.5 text-sm text-zinc-400">
            {workOn.map((w, i) => (
              <li key={`${i}-${w.slice(0, 24)}`}>{w}</li>
            ))}
          </ul>
        </div>
      )}
      {note && (
        <p className="mt-4 border-t border-white/10 pt-4 text-xs text-zinc-600">{note}</p>
      )}
    </div>
  );
}

export default function App() {
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [level, setLevel] = useState("mid");
  const [useAi, setUseAi] = useState(false);
  const [groqKey, setGroqKey] = useState(() =>
    typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) || "" : "",
  );
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [started, setStarted] = useState(false);
  const [offlineAnswered, setOfflineAnswered] = useState(0);
  const [sessionMeta, setSessionMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState(null);
  const [finalEvaluation, setFinalEvaluation] = useState(null);

  const resolved = useMemo(() => resolveCompany(company), [company]);

  const persistKey = useCallback((v) => {
    setGroqKey(v);
    try {
      localStorage.setItem(STORAGE_KEY, v);
    } catch {
      /* ignore */
    }
  }, []);

  const resetSession = useCallback(() => {
    setMessages([]);
    setStarted(false);
    setOfflineAnswered(0);
    setSessionMeta(null);
    setInput("");
    setError(null);
    setFinalEvaluation(null);
    setEvaluating(false);
  }, []);

  const startOffline = useCallback(() => {
    const profile = resolved.profile;
    const queue = buildQuestionQueue({
      company,
      role,
      level,
      profile,
    });
    const seed = company.length + role.length + level.length;
    const levelLabel = LEVELS.find((l) => l.id === level)?.label ?? level;
    const opening = buildOpening({
      companyDisplay: profile.displayName,
      role,
      level: levelLabel,
      queue,
    });
    setSessionMeta({ mode: "offline", queue, seed });
    setMessages([{ role: "assistant", content: opening }]);
    setOfflineAnswered(0);
    setFinalEvaluation(null);
    setStarted(true);
    setError(null);
  }, [company, role, level, resolved.profile]);

  const startGroq = useCallback(async () => {
    const key = groqKey.trim();
    if (!key) {
      setError("Add a Groq API key (free tier at console.groq.com) or switch to offline mode.");
      return;
    }
    const profile = resolved.profile;
    const system = buildSystemPrompt({
      companyDisplay: profile.displayName,
      role: role.trim() || "Software engineer",
      level: LEVELS.find((l) => l.id === level)?.label ?? level,
      hiringManagerNote: profile.hiringManagerNote,
      levelId: level,
    });
    const userMsg = {
      role: "user",
      content:
        `Start the mock interview now. ` +
        `Company: ${profile.displayName}. Role: ${role.trim() || "Software engineer"}. ` +
        `Level: ${LEVELS.find((l) => l.id === level)?.label ?? level}. ` +
        `Follow the two-part format: part 1 = one sentence on how you'll give brief feedback after each answer; ` +
        `part 2 = introduce yourself as the hiring manager and ask the first question only. Separate with ---`,
    };
    setLoading(true);
    setError(null);
    try {
      const text = await groqChat({ apiKey: key, system, messages: [userMsg], max_tokens: 1400 });
      const groqMessages = [userMsg, { role: "assistant", content: text }];
      setSessionMeta({ mode: "groq", system, groqMessages, levelId: level });
      setMessages(replyToDisplayMessages(text));
      setFinalEvaluation(null);
      setStarted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, [company, groqKey, level, resolved.profile, role]);

  const onStart = useCallback(() => {
    if (!company.trim()) {
      setError("Enter the company you are interviewing with.");
      return;
    }
    if (!role.trim()) {
      setError("Enter the role (e.g. Software Engineer, Backend).");
      return;
    }
    if (useAi) {
      startGroq();
    } else {
      startOffline();
    }
  }, [company, role, startGroq, startOffline, useAi]);

  const sendOffline = useCallback(() => {
    const text = input.trim();
    if (!text || !sessionMeta || sessionMeta.mode !== "offline") return;
    const { queue, seed } = sessionMeta;
    const qIndex = offlineAnswered;
    const questionMeta = queue[qIndex];
    const feedbackText = offlineFeedback(text, questionMeta, seed + qIndex, level);
    const nextAnswered = offlineAnswered + 1;
    const follow = buildFollowUp({
      queue,
      answeredCount: nextAnswered,
      seed,
      lastAnswer: text,
    });
    const priorUser = messages.filter((m) => m.role === "user").map((m) => m.content);
    const userAnswersForFinal = [...priorUser, text];
    const isDone = nextAnswered >= queue.length;

    if (isDone) {
      const ev = computeOfflineFinal(userAnswersForFinal, queue, level);
      setFinalEvaluation({
        source: "offline",
        behavioral: ev.behavioral,
        technical: ev.technical,
        overall: ev.overall,
        workOn: ev.workOn,
        note: ev.note,
      });
    }

    setMessages((m) => [
      ...m,
      { role: "user", content: text },
      { role: "assistant", variant: "coach", content: feedbackText },
      { role: "assistant", content: follow },
    ]);
    setOfflineAnswered(nextAnswered);
    setInput("");
  }, [input, offlineAnswered, level, messages, sessionMeta]);

  const sendGroq = useCallback(async () => {
    const text = input.trim();
    if (!text || !sessionMeta || sessionMeta.mode !== "groq" || !sessionMeta.groqMessages) return;
    const key = groqKey.trim();
    if (!key) {
      setError("Groq API key missing.");
      return;
    }
    const nextMessages = [...sessionMeta.groqMessages, { role: "user", content: text }];
    setLoading(true);
    setError(null);
    try {
      const reply = await groqChat({
        apiKey: key,
        system: sessionMeta.system,
        messages: nextMessages,
        max_tokens: 1400,
      });
      const groqMessages = [...nextMessages, { role: "assistant", content: reply }];
      setSessionMeta((s) => (s?.mode === "groq" ? { ...s, groqMessages } : s));
      const display = replyToDisplayMessages(reply);
      setMessages((m) => [...m, { role: "user", content: text }, ...display]);
      setInput("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, [groqKey, input, sessionMeta]);

  const endGroqInterview = useCallback(async () => {
    const key = groqKey.trim();
    if (!key || !messages.some((m) => m.role === "user")) {
      setError("Answer at least one question, then request scores.");
      return;
    }
    setEvaluating(true);
    setError(null);
    try {
      const transcript = formatTranscript(messages);
      const r = await groqEvaluateInterview({
        apiKey: key,
        transcript,
        levelId: sessionMeta?.levelId ?? level,
      });
      setFinalEvaluation({
        source: "groq",
        behavioral: r.behavioralScore,
        technical: r.technicalScore,
        overall: r.overallScore,
        summary: r.summary,
        workOn: r.workOn,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate scores");
    } finally {
      setEvaluating(false);
    }
  }, [groqKey, level, messages, sessionMeta?.levelId]);

  const onSend = useCallback(() => {
    if (useAi && sessionMeta?.mode === "groq") {
      sendGroq();
    } else {
      sendOffline();
    }
  }, [sendGroq, sendOffline, sessionMeta, useAi]);

  const doneOffline =
    sessionMeta?.mode === "offline" &&
    sessionMeta.queue &&
    offlineAnswered >= sessionMeta.queue.length;

  const sessionComplete = doneOffline || (useAi && finalEvaluation);
  const hasUserMessage = messages.some((m) => m.role === "user");
  const showGroqEndButton =
    started &&
    useAi &&
    sessionMeta?.mode === "groq" &&
    !finalEvaluation &&
    !doneOffline &&
    hasUserMessage;

  return (
    <div className="min-h-screen bg-[#070708] text-zinc-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(16,185,129,0.08),transparent)]" />

      <header className="relative border-b border-white/5 bg-[#070708]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl flex-col gap-2 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight text-white md:text-2xl">
              Mock interview coach
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Company-aware behavioral + technical practice (offline or your Groq key).
            </p>
          </div>
          {started && (
            <button
              type="button"
              onClick={resetSession}
              className="shrink-0 rounded-lg border border-white/15 px-3 py-2 text-sm text-zinc-300 transition hover:border-emerald-500/40 hover:text-white"
            >
              New session
            </button>
          )}
        </div>
      </header>

      <main className="relative mx-auto max-w-3xl px-4 py-8">
        <p className="mb-6 rounded-xl border border-amber-500/20 bg-amber-950/20 px-4 py-3 text-sm text-amber-100/90">
          Practice only — not affiliated with any employer. Questions are illustrative; verify expectations with
          your recruiter.
        </p>

        {!started ? (
          <div className="space-y-6 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <div>
              <label htmlFor="company" className="block text-sm font-medium text-zinc-300">
                Company
              </label>
              <input
                id="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Google, Adobe, Stripe"
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
              />
              {company.trim() && (
                <p className="mt-2 text-xs text-zinc-500">
                  {resolved.matched
                    ? `Matched profile: ${resolved.profile.id} — themes loaded.`
                    : `No curated profile for "${resolved.profile.displayName}" — using generic themes with your company name.`}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-zinc-300">
                Role
              </label>
              <input
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Backend engineer, ML engineer"
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
              />
            </div>

            <div>
              <span className="block text-sm font-medium text-zinc-300">Level</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {LEVELS.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setLevel(l.id)}
                    className={`rounded-full border px-4 py-2 text-sm transition ${
                      level === l.id
                        ? "border-emerald-500/50 bg-emerald-950/50 text-emerald-100"
                        : "border-white/10 bg-black/30 text-zinc-400 hover:border-white/20"
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={useAi}
                  onChange={(e) => setUseAi(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-white/20 bg-zinc-900 text-emerald-600 focus:ring-emerald-500/40"
                />
                <span>
                  <span className="font-medium text-zinc-200">AI interviewer (Groq)</span>
                  <span className="mt-1 block text-sm text-zinc-500">
                    Uses your free Groq API key from the browser (stored only in this browser). Offline mode needs
                    no key and works on static hosting.
                  </span>
                </span>
              </label>
              {useAi && (
                <div className="mt-4">
                  <label htmlFor="groq" className="text-sm font-medium text-zinc-300">
                    Groq API key
                  </label>
                  <input
                    id="groq"
                    type="password"
                    autoComplete="off"
                    value={groqKey}
                    onChange={(e) => persistKey(e.target.value)}
                    placeholder="gsk_…"
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 font-mono text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
                  />
                  <p className="mt-2 text-xs text-zinc-600">
                    Get a key at{" "}
                    <a
                      href="https://console.groq.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400/90 underline-offset-2 hover:underline"
                    >
                      console.groq.com
                    </a>{" "}
                    (free tier). Never share keys or commit them to git.
                  </p>
                </div>
              )}
            </div>

            {error && (
              <p className="rounded-lg border border-red-500/30 bg-red-950/30 px-3 py-2 text-sm text-red-200">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={onStart}
              disabled={loading}
              className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
            >
              {loading ? "Starting…" : "Start mock interview"}
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6 space-y-4">
              {messages.map((m, i) => (
                <MessageBubble key={`${i}-${m.role}-${m.variant ?? ""}`} role={m.role} variant={m.variant}>
                  {m.content}
                </MessageBubble>
              ))}
            </div>

            {finalEvaluation && (
              <div className="mb-8">
                <FinalScoreCard evaluation={finalEvaluation} />
              </div>
            )}

            {error && (
              <p className="mb-4 rounded-lg border border-red-500/30 bg-red-950/30 px-3 py-2 text-sm text-red-200">
                {error}
              </p>
            )}

            {!sessionComplete && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <label htmlFor="answer" className="text-sm font-medium text-zinc-300">
                  Your answer
                </label>
                <textarea
                  id="answer"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  rows={5}
                  placeholder="Type your response…"
                  className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
                  disabled={loading || evaluating}
                />
                <button
                  type="button"
                  onClick={onSend}
                  disabled={loading || evaluating || !input.trim()}
                  className="mt-3 w-full rounded-xl border border-emerald-500/40 bg-emerald-950/40 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-900/50 disabled:opacity-40"
                >
                  {loading ? "Thinking…" : "Send"}
                </button>
                {showGroqEndButton && (
                  <button
                    type="button"
                    onClick={endGroqInterview}
                    disabled={evaluating || loading}
                    className="mt-3 w-full rounded-xl border border-white/15 bg-white/[0.04] py-3 text-sm font-medium text-zinc-200 transition hover:border-emerald-500/35 hover:text-white disabled:opacity-40"
                  >
                    {evaluating ? "Scoring…" : "End interview & get scores"}
                  </button>
                )}
              </div>
            )}

            {sessionComplete && (
              <p className="text-center text-sm text-zinc-500">
                Session complete. Use <strong className="text-zinc-400">New session</strong> to practice again.
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
