# Distributed system simulator

A small browser demo that models a **single client request** traveling through a **linear chain of four services** (Gateway → Service A → Service B → Service C). It is meant to illustrate how **latency**, **per-hop failure probability**, **retries with exponential backoff**, and a **total client timeout** interact - the same kinds of knobs you tune when debugging orchestrated flows or flaky dependencies in production.

This is a **pure frontend simulation**: nothing runs on a server; all numbers are computed in JavaScript when you click **Send request**.

## What it simulates

1. **Request path**  
   Each attempt walks the chain in order. At each hop, the simulator adds a **hop latency** (base latency for that service plus random **jitter**) and rolls a random check: if the roll is below that service’s **failure rate**, the hop fails, the chain stops, and the client may **retry** the whole request from the beginning (depending on policy).

2. **Retries**  
   After a failed attempt, the client waits **exponential backoff**: roughly `retryBackoffMs × 2^(attempt - 1)` plus extra jitter. That wait counts toward **total elapsed time**.

3. **Timeout**  
   If cumulative time (hops + retry waits) exceeds **Total timeout**, the run ends in **timeout** - either mid-chain, during a hop, or while waiting before a retry.

4. **Deterministic randomness**  
   Randomness uses a **mulberry32** PRNG seeded from **RNG seed** plus an internal run counter, so you can reproduce a scenario by reusing the same seed and settings.

5. **Event log**  
   The log lists hops (latency and running total), failures, retries, timeouts, success, or exhausted retries.

## Controls (UI)

| Control | Effect |
|--------|--------|
| Per-service **failure rate (%)** | Independent probability that a hop fails. |
| Per-service **base latency (ms)** | Minimum-ish delay before jitter is applied. |
| **Jitter (ms)** | Random extra delay per hop and in retry backoff. |
| **Max retries** | How many *additional* attempts after the first failure (0 = no retries). |
| **Retry backoff base (ms)** | Scales exponential backoff between attempts. |
| **Total timeout (ms)** | Hard cap on simulated elapsed time for the whole interaction. |
| **RNG seed** | Changes the pseudo-random sequence for repeatable demos. |

## Tech stack

- [Vite](https://vitejs.dev/) + [React](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/) v4

## Run locally

From this directory:

```bash
npm install
npm run dev
```

From the **portfolio repo root** (with proxy to this app on port 5174):

```bash
npm run dev:all
```

Production build (output in `dist/`):

```bash
npm run build
```

## Deploy note

In the portfolio monorepo, the parent build copies this app into `dist/simulator/` after `npm run build:all` at the root.
