import React, { useCallback, useEffect, useRef, useState } from "react";

let idSeq = 0;
function nextId() {
  idSeq += 1;
  return `job-${idSeq}`;
}

export default function App() {
  const [queued, setQueued] = useState([]);
  const [processingCount, setProcessingCount] = useState(0);
  const [deadLetter, setDeadLetter] = useState([]);
  const [stats, setStats] = useState({ processed: 0, failed: 0, retried: 0 });
  const [workerCount, setWorkerCount] = useState(2);
  const [failureRate, setFailureRate] = useState(35);
  const [maxAttempts, setMaxAttempts] = useState(4);
  const [backoffBaseMs, setBackoffBaseMs] = useState(120);
  const [tickMs, setTickMs] = useState(400);
  const [paused, setPaused] = useState(false);
  const [log, setLog] = useState([]);
  const [nowTick, setNowTick] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  const queuedRef = useRef(queued);
  const processingRef = useRef(0);

  useEffect(() => {
    queuedRef.current = queued;
    processingRef.current = processingCount;
  });

  const pushLog = useCallback((line) => {
    setLog((prev) => [...prev.slice(-80), { t: Date.now(), line }]);
  }, []);

  const enqueue = useCallback(
    (job) => {
      setQueued((q) => [...q, job]);
      pushLog(`enqueued ${job.id}`);
    },
    [pushLog],
  );

  const addJobs = useCallback(
    (n) => {
      for (let i = 0; i < n; i += 1) {
        enqueue({
          id: nextId(),
          attempts: 0,
          createdAt: Date.now(),
        });
      }
    },
    [enqueue],
  );

  useEffect(() => {
    if (paused) return undefined;

    const timer = setInterval(() => {
      const now = Date.now();
      const q = queuedRef.current;
      const slots = Math.max(0, workerCount - processingRef.current);
      if (slots <= 0) return;

      const ready = [];
      const delayed = [];
      for (const j of q) {
        if (j.notBefore != null && j.notBefore > now) delayed.push(j);
        else ready.push(j);
      }
      if (ready.length === 0) {
        setQueued([...delayed].sort((a, b) => (a.notBefore ?? 0) - (b.notBefore ?? 0)));
        return;
      }

      const take = Math.min(slots, ready.length);
      const batch = ready.slice(0, take);
      const remaining = [...ready.slice(take), ...delayed].sort(
        (a, b) => (a.notBefore ?? 0) - (b.notBefore ?? 0),
      );
      setQueued(remaining);

      batch.forEach((job) => {
        setProcessingCount((c) => c + 1);
        const duration = 180 + Math.random() * 120;
        setTimeout(() => {
          const fail = Math.random() * 100 < failureRate;
          setProcessingCount((c) => Math.max(0, c - 1));

          if (fail) {
            const nextAttempt = job.attempts + 1;
            setStats((s) => ({ ...s, failed: s.failed + 1 }));
            pushLog(`fail ${job.id} (attempt ${nextAttempt})`);

            if (nextAttempt >= maxAttempts) {
              setDeadLetter((d) => [...d, { ...job, attempts: nextAttempt, reason: "max retries" }]);
              pushLog(`dead-letter ${job.id}`);
            } else {
              const backoff = backoffBaseMs * 2 ** (nextAttempt - 1) + Math.random() * 80;
              setStats((s) => ({ ...s, retried: s.retried + 1 }));
              setQueued((qq) =>
                [...qq, { ...job, attempts: nextAttempt, notBefore: Date.now() + backoff }].sort(
                  (a, b) => (a.notBefore ?? 0) - (b.notBefore ?? 0),
                ),
              );
              pushLog(`requeue ${job.id} in ${Math.round(backoff)}ms`);
            }
          } else {
            setStats((s) => ({ ...s, processed: s.processed + 1 }));
            pushLog(`done ${job.id}`);
          }
        }, duration);
      });
    }, tickMs);

    return () => clearInterval(timer);
  }, [paused, workerCount, failureRate, maxAttempts, backoffBaseMs, tickMs, pushLog]);

  const reset = () => {
    setQueued([]);
    setProcessingCount(0);
    setDeadLetter([]);
    setStats({ processed: 0, failed: 0, retried: 0 });
    setLog([]);
    idSeq = 0;
  };

  const queueDepth = queued.length;

  return (
    <div className="min-h-screen bg-[#070708] bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,oklch(0.22_0.08_310/0.45),transparent_50%)] px-4 py-10 md:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10">
          <p className="font-[family-name:var(--font-family-display)] text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-400/80">
            Interactive demo
          </p>
          <h1 className="font-[family-name:var(--font-family-display)] mt-2 text-3xl font-bold text-white md:text-4xl">
            Async job queue
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
            In-browser simulation of workers pulling from a queue: random failures, exponential
            backoff, retries, and a dead-letter list when attempts are exhausted - patterns you see in
            real job runners.
          </p>
        </header>

        <div className="mb-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => addJobs(5)}
            className="rounded-xl bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-fuchsia-500"
          >
            Enqueue 5 jobs
          </button>
          <button
            type="button"
            onClick={() => addJobs(1)}
            className="rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-fuchsia-500/40"
          >
            +1 job
          </button>
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            className="rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-fuchsia-500/40"
          >
            {paused ? "Resume" : "Pause"} workers
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded-xl border border-rose-500/30 px-4 py-2 text-sm text-rose-300 transition hover:bg-rose-500/10"
          >
            Reset all
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 lg:col-span-2">
            <h2 className="font-[family-name:var(--font-family-display)] text-lg font-semibold text-white">
              Live state
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/5 p-4">
                <p className="text-xs uppercase tracking-wider text-zinc-500">Queue depth</p>
                <p className="mt-1 font-[family-name:var(--font-family-display)] text-3xl font-bold text-fuchsia-200">
                  {queueDepth}
                </p>
              </div>
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <p className="text-xs uppercase tracking-wider text-zinc-500">In flight</p>
                <p className="mt-1 font-[family-name:var(--font-family-display)] text-3xl font-bold text-amber-200">
                  {processingCount}
                </p>
              </div>
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
                <p className="text-xs uppercase tracking-wider text-zinc-500">Dead letter</p>
                <p className="mt-1 font-[family-name:var(--font-family-display)] text-3xl font-bold text-rose-200">
                  {deadLetter.length}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="text-sm font-medium text-zinc-300">Queued (waiting / delayed)</h3>
                <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto font-mono text-xs text-zinc-400">
                  {queueDepth === 0 ? (
                    <li className="text-zinc-600">Empty</li>
                  ) : (
                    queued.map((j) => (
                      <li key={j.id + String(j.notBefore ?? 0)}>
                        {j.id}
                        {j.notBefore != null && j.notBefore > nowTick && (
                          <span className="text-amber-400/90">
                            {" "}
                            · retry @ {new Date(j.notBefore).toLocaleTimeString()}
                          </span>
                        )}
                        {j.attempts > 0 && (
                          <span className="text-zinc-500"> · attempt {j.attempts}</span>
                        )}
                      </li>
                    ))
                  )}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-medium text-zinc-300">Dead letter</h3>
                <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto font-mono text-xs text-rose-300/90">
                  {deadLetter.length === 0 ? (
                    <li className="text-zinc-600">None</li>
                  ) : (
                    deadLetter.map((j) => (
                      <li key={j.id + "-dl"}>
                        {j.id} · {j.reason}
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <h3 className="text-sm font-semibold text-white">Throughput</h3>
              <p className="mt-2 text-sm text-zinc-400">
                Processed:{" "}
                <span className="font-mono text-emerald-400">{stats.processed}</span>
              </p>
              <p className="text-sm text-zinc-400">
                Handler failures:{" "}
                <span className="font-mono text-amber-400">{stats.failed}</span>
              </p>
              <p className="text-sm text-zinc-400">
                Requeues: <span className="font-mono text-fuchsia-400">{stats.retried}</span>
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <h3 className="text-sm font-semibold text-white">Tuning</h3>
              <label className="mt-3 block text-xs text-zinc-500">Workers</label>
              <input
                type="number"
                min="1"
                max="8"
                value={workerCount}
                onChange={(e) => setWorkerCount(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm"
              />
              <label className="mt-3 block text-xs text-zinc-500">Simulated failure rate (%)</label>
              <input
                type="range"
                min="0"
                max="90"
                value={failureRate}
                onChange={(e) => setFailureRate(Number(e.target.value))}
                className="mt-1 w-full accent-fuchsia-500"
              />
              <span className="text-sm text-fuchsia-300">{failureRate}%</span>
              <label className="mt-3 block text-xs text-zinc-500">Max attempts (before DL)</label>
              <input
                type="number"
                min="1"
                max="12"
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm"
              />
              <label className="mt-3 block text-xs text-zinc-500">Backoff base (ms)</label>
              <input
                type="number"
                min="50"
                max="2000"
                value={backoffBaseMs}
                onChange={(e) => setBackoffBaseMs(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm"
              />
              <label className="mt-3 block text-xs text-zinc-500">Scheduler tick (ms)</label>
              <input
                type="number"
                min="100"
                max="2000"
                value={tickMs}
                onChange={(e) => setTickMs(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <h2 className="font-[family-name:var(--font-family-display)] text-lg font-semibold text-white">
            Activity log
          </h2>
          <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto font-mono text-xs text-zinc-500">
            {log.length === 0 ? (
              <li>Enqueue jobs to see worker activity.</li>
            ) : (
              log.map((e, i) => (
                <li key={e.t + "-" + i}>
                  {new Date(e.t).toLocaleTimeString()} - {e.line}
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
