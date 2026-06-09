/**
 * Tiny in-process scheduler for periodic maintenance jobs. The collect watch
 * scheduler is purpose-built for eBay polling, so we keep a separate registry
 * here for cross-feature jobs (reliability score recompute today, payout
 * aggregation in Phase 4).
 *
 * Intentionally not BullMQ / node-cron — a single-node deploy and a daily
 * cadence don't justify a queue. If we add multi-node later, swap this for a
 * proper scheduler without touching call sites.
 */

type Job = {
  name: string
  intervalMs: number
  run: () => Promise<void>
  timer: NodeJS.Timeout | null
  running: boolean
}

const jobs = new Map<string, Job>()

export function registerJob(name: string, intervalMs: number, run: () => Promise<void>) {
  if (jobs.has(name)) {
    console.warn(`[scheduler] job "${name}" already registered — skipping`)
    return
  }
  jobs.set(name, { name, intervalMs, run, timer: null, running: false })
}

export function startJobs() {
  for (const job of jobs.values()) {
    if (job.timer) continue
    job.timer = setInterval(() => {
      if (job.running) return
      job.running = true
      void job
        .run()
        .catch((err) => console.error(`[scheduler] job ${job.name} failed:`, err))
        .finally(() => {
          job.running = false
        })
    }, job.intervalMs)
    console.log(`[scheduler] started job "${job.name}" interval=${job.intervalMs}ms`)
  }
}

export function stopJobs() {
  for (const job of jobs.values()) {
    if (job.timer) clearInterval(job.timer)
    job.timer = null
  }
}
