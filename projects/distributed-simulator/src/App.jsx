import React, { useCallback, useMemo, useRef, useState } from "react";
import PortfolioBackBar from "../../shared/PortfolioBackBar.jsx";

const SERVICES = [
  { id: "gateway", label: "Gateway" },
  { id: "svcA", label: "Service A" },
  { id: "svcB", label: "Service B" },
  { id: "svcC", label: "Service C" },
];

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function simulateRequest({
  seed,
  failureRates,
  latencies,
  jitterMs,
  maxRetries,
  retryBackoffMs,
  timeoutMs,
}) {
  const rand = mulberry32(seed);
  const log = [];
  let attempt = 0;
  let totalLatency = 0;

  const failRoll = (serviceId) => rand() < (failureRates[serviceId] ?? 0) / 100;

  while (attempt <= maxRetries) {
    if (attempt > 0) {
      const backoff = retryBackoffMs * Math.pow(2, attempt - 1) + rand() * jitterMs;
      log.push({ type: "retry", attempt, backoffMs: Math.round(backoff) });
      totalLatency += backoff;
      if (totalLatency > timeoutMs) {
        log.push({ type: "timeout", at: "retry-wait", totalLatencyMs: Math.round(totalLatency) });
        return { ok: false, log, totalLatencyMs: Math.round(totalLatency), failedAt: null };
      }
    }

    let failedAt = null;
    for (const { id } of SERVICES) {
      const base = latencies[id] ?? 50;
      const hopLatency = base + rand() * jitterMs;
      totalLatency += hopLatency;

      if (totalLatency > timeoutMs) {
        log.push({
          type: "timeout",
          at: id,
          totalLatencyMs: Math.round(totalLatency),
        });
        return { ok: false, log, totalLatencyMs: Math.round(totalLatency), failedAt: id };
      }

      log.push({
        type: "hop",
        service: id,
        latencyMs: Math.round(hopLatency),
        cumulativeMs: Math.round(totalLatency),
      });

      if (failRoll(id)) {
        failedAt = id;
        log.push({ type: "fail", service: id, attempt });
        break;
      }
    }

    if (!failedAt) {
      log.push({ type: "success", attempt, totalLatencyMs: Math.round(totalLatency) });
      return { ok: true, log, totalLatencyMs: Math.round(totalLatency), failedAt: null };
    }

    attempt += 1;
    if (attempt > maxRetries) {
      log.push({ type: "exhausted", failedAt });
      return { ok: false, log, totalLatencyMs: Math.round(totalLatency), failedAt };
    }
  }

  return { ok: false, log, totalLatencyMs: Math.round(totalLatency), failedAt: null };
}

export default function App() {
  const [seed, setSeed] = useState(42);
  const [failureRates, setFailureRates] = useState({
    gateway: 5,
    svcA: 12,
    svcB: 8,
    svcC: 15,
  });
  const [latencies, setLatency] = useState({
    gateway: 20,
    svcA: 40,
    svcB: 35,
    svcC: 50,
  });
  const [jitterMs, setJitterMs] = useState(25);
  const [maxRetries, setMaxRetries] = useState(3);
  const [retryBackoffMs, setRetryBackoffMs] = useState(80);
  const [timeoutMs, setTimeoutMs] = useState(800);
  const [result, setResult] = useState(null);
  const runCounter = useRef(0);

  const run = useCallback(() => {
    runCounter.current += 1;
    const r = simulateRequest({
      seed: seed + runCounter.current,
      failureRates,
      latencies,
      jitterMs,
      maxRetries,
      retryBackoffMs,
      timeoutMs,
    });
    setResult(r);
  }, [seed, failureRates, latencies, jitterMs, maxRetries, retryBackoffMs, timeoutMs]);

  const activeHighlight = useMemo(() => {
    if (!result?.log) return {};
    const lastHop = [...result.log].reverse().find((e) => e.type === "hop");
    const lastFail = [...result.log].reverse().find((e) => e.type === "fail");
    return {
      lastHop: lastHop?.service,
      failed: lastFail?.service,
      ok: result.ok,
    };
  }, [result]);

  return (
    <div className="min-h-screen bg-[#070708] bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,oklch(0.22_0.08_310/0.45),transparent_50%)] px-4 py-10 md:px-8">
      <PortfolioBackBar />
      <div className="mx-auto max-w-4xl">
        <header className="mb-10">
          <p className="font-[family-name:var(--font-family-display)] text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-400/80">
            Interactive demo
          </p>
          <h1 className="font-[family-name:var(--font-family-display)] mt-2 text-3xl font-bold text-white md:text-4xl">
            Distributed system simulator
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
            A request flows through a chain of services. Tune failure rates, latency, retries, and
            timeouts to see cascading effects - similar to debugging orchestrated flows in production.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <h2 className="font-[family-name:var(--font-family-display)] text-lg font-semibold text-white">
                Request path
              </h2>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2 md:gap-4">
                {SERVICES.map(({ id, label }, i) => {
                  const isFail = activeHighlight.failed === id;
                  const isHop = activeHighlight.lastHop === id && !result?.ok;
                  const dim =
                    result &&
                    !result.ok &&
                    activeHighlight.failed &&
                    activeHighlight.failed !== id &&
                    !isHop;
                  return (
                    <React.Fragment key={id}>
                      {i > 0 && (
                        <span className="text-zinc-600 select-none" aria-hidden>
                          →
                        </span>
                      )}
                      <div
                        className={[
                          "rounded-xl border px-4 py-3 text-center text-sm font-medium transition",
                          result?.ok && activeHighlight.lastHop === id
                            ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-200"
                            : isFail
                              ? "border-rose-500/60 bg-rose-500/15 text-rose-100"
                              : dim
                                ? "border-white/5 text-zinc-600"
                                : "border-fuchsia-500/30 bg-fuchsia-500/5 text-zinc-200",
                        ].join(" ")}
                      >
                        {label}
                        <div className="mt-1 text-xs text-zinc-500">
                          p={failureRates[id]}% · {latencies[id]}ms base
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
              {result && (
                <p
                  className={`mt-6 text-center text-sm font-medium ${
                    result.ok ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {result.ok
                    ? `Completed in ${result.totalLatencyMs}ms`
                    : `Failed - ${result.totalLatencyMs}ms elapsed`}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <h2 className="font-[family-name:var(--font-family-display)] text-lg font-semibold text-white">
                Event log
              </h2>
              <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto font-mono text-xs text-zinc-400">
                {(result?.log ?? []).map((e, i) => (
                  <li key={i} className="border-l-2 border-fuchsia-500/30 pl-3">
                    {e.type === "hop" && (
                      <>
                        <span className="text-zinc-500">hop</span>{" "}
                        <span className="text-zinc-200">{e.service}</span> +{e.latencyMs}ms (Σ{" "}
                        {e.cumulativeMs}ms)
                      </>
                    )}
                    {e.type === "fail" && (
                      <>
                        <span className="text-rose-400">fail</span> at{" "}
                        <span className="text-zinc-200">{e.service}</span> (attempt {e.attempt + 1})
                      </>
                    )}
                    {e.type === "retry" && (
                      <>
                        <span className="text-amber-400">retry</span> backoff ~{e.backoffMs}ms
                      </>
                    )}
                    {e.type === "timeout" && (
                      <>
                        <span className="text-rose-400">timeout</span> at {e.at} (Σ{" "}
                        {e.totalLatencyMs}ms)
                      </>
                    )}
                    {e.type === "success" && (
                      <>
                        <span className="text-emerald-400">success</span> after attempt{" "}
                        {e.attempt + 1}
                      </>
                    )}
                    {e.type === "exhausted" && (
                      <>
                        <span className="text-rose-400">retries exhausted</span> at {e.failedAt}
                      </>
                    )}
                  </li>
                ))}
                {!result && (
                  <li className="text-zinc-600">Run a simulation to populate the log.</li>
                )}
              </ul>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <label className="block text-xs font-medium uppercase tracking-wider text-zinc-500">
                RNG seed
              </label>
              <input
                type="number"
                value={seed}
                onChange={(e) => setSeed(Number(e.target.value))}
                className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
              />
              <p className="mt-2 text-xs text-zinc-500">Change seed for a different random path.</p>
            </div>

            {SERVICES.map(({ id, label }) => (
              <div key={id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <h3 className="text-sm font-semibold text-white">{label}</h3>
                <label className="mt-3 block text-xs text-zinc-500">Failure rate (%)</label>
                <input
                  type="range"
                  min="0"
                  max="60"
                  value={failureRates[id]}
                  onChange={(e) =>
                    setFailureRates((s) => ({ ...s, [id]: Number(e.target.value) }))
                  }
                  className="mt-1 w-full accent-fuchsia-500"
                />
                <span className="text-sm text-fuchsia-300">{failureRates[id]}%</span>
                <label className="mt-3 block text-xs text-zinc-500">Base latency (ms)</label>
                <input
                  type="number"
                  min="5"
                  max="500"
                  value={latencies[id]}
                  onChange={(e) =>
                    setLatency((s) => ({ ...s, [id]: Number(e.target.value) }))
                  }
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm"
                />
              </div>
            ))}

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <h3 className="text-sm font-semibold text-white">Client policy</h3>
              <label className="mt-3 block text-xs text-zinc-500">Jitter (ms)</label>
              <input
                type="number"
                min="0"
                max="200"
                value={jitterMs}
                onChange={(e) => setJitterMs(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm"
              />
              <label className="mt-3 block text-xs text-zinc-500">Max retries</label>
              <input
                type="number"
                min="0"
                max="10"
                value={maxRetries}
                onChange={(e) => setMaxRetries(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm"
              />
              <label className="mt-3 block text-xs text-zinc-500">Retry backoff base (ms)</label>
              <input
                type="number"
                min="10"
                max="2000"
                value={retryBackoffMs}
                onChange={(e) => setRetryBackoffMs(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm"
              />
              <label className="mt-3 block text-xs text-zinc-500">Total timeout (ms)</label>
              <input
                type="number"
                min="100"
                max="10000"
                value={timeoutMs}
                onChange={(e) => setTimeoutMs(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm"
              />
            </div>

            <button
              type="button"
              onClick={run}
              className="w-full rounded-xl bg-gradient-to-r from-fuchsia-600 to-fuchsia-500 py-3 font-[family-name:var(--font-family-display)] text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/25 transition hover:from-fuchsia-500 hover:to-fuchsia-400"
            >
              Send request
            </button>
          </aside>
        </div>

        <p className="mt-12 text-center text-xs text-zinc-600">
          Deterministic for a given seed; uses a simple PRNG for reproducible demos.
        </p>
      </div>
    </div>
  );
}
