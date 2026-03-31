# Async job queue (browser demo)

A **client-side simulation** of an asynchronous **job queue** with **multiple workers**, **random handler failures**, **exponential backoff** between retries, and a **dead-letter** list when a job exceeds a maximum number of attempts. It mirrors patterns from real systems (Sidekiq, SQS consumers, Celery, etc.) without any backend: state lives in the browser.

Use it to see how **concurrency**, **failure rate**, and **retry policy** affect throughput, queue depth, and how often jobs end up in the dead-letter list.

## What it simulates

1. **Queue**  
   Jobs are simple objects with an id and attempt count. You enqueue them with **Enqueue 5 jobs** or **+1 job**.

2. **Workers**  
   **Workers** is the max number of jobs that can be “in flight” at once. A periodic **scheduler tick** looks for free slots and pulls **ready** jobs from the queue (jobs with a `notBefore` time in the future stay **delayed** until that time).

3. **Processing**  
   Each job runs for a short random **simulated duration**. When it finishes, the handler **succeeds** or **fails** based on **Simulated failure rate (%)**.

4. **Retries**  
   On failure, if attempts are still below **Max attempts**, the job is **requeued** with `notBefore = now + backoff`, where backoff is **exponential**: `backoffBaseMs × 2^(attempt - 1)` plus a little random jitter. Failed jobs wait until that time before they are eligible again.

5. **Dead letter**  
   When attempts reach **Max attempts**, the job goes to the **Dead letter** list and is not retried again.

6. **Pause**  
   **Pause workers** stops the scheduler from starting new work; jobs already “in flight” still complete.

7. **Activity log**  
   A rolling log records enqueue, done, fail, requeue, and dead-letter events.

8. **Counters**  
   **Processed**, **Handler failures**, and **Requeues** aggregate outcomes over the session (reset with **Reset all**).

## Controls (UI)

| Control | Effect |
|--------|--------|
| **Workers** | Max concurrent in-flight jobs. |
| **Simulated failure rate (%)** | Probability each job fails at completion. |
| **Max attempts (before DL)** | Attempts allowed before dead-letter. |
| **Backoff base (ms)** | Scales exponential delay before a retried job is ready again. |
| **Scheduler tick (ms)** | How often the scheduler tries to fill worker slots from the queue. |

## Tech stack

- [Vite](https://vitejs.dev/) + [React](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/) v4

## Run locally

From this directory:

```bash
npm install
npm run dev
```

From the **portfolio repo root** (with proxy to this app on port 5175):

```bash
npm run dev:all
```

Production build (output in `dist/`):

```bash
npm run build
```

## Deploy note

In the portfolio monorepo, the parent build copies this app into `dist/queue/` after `npm run build:all` at the root.
