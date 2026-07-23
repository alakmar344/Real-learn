/**
 * Lightweight load / stress test for the backend API.
 *
 * Usage:
 *   node backend/loadtest.js [url] [concurrency] [requests]
 *
 * Defaults:
 *   url         http://localhost:10000
 *   concurrency 50
 *   requests    500
 *
 * Example:
 *   node backend/loadtest.js http://localhost:10000 100 1000
 */

const url = process.argv[2] || "http://localhost:10000";
const concurrency = Math.min(Number(process.argv[3]) || 50, 500);
const totalRequests = Math.min(Number(process.argv[4]) || 500, 5000);

let completed = 0;
let errors = 0;
let latencySum = 0;
let maxLatency = 0;
let minLatency = Infinity;

const queue = [];
const results = new Array(totalRequests).fill(null);

for (let i = 0; i < totalRequests; i++) {
  queue.push(i);
}

async function run() {
  const workers = [];
  for (let w = 0; w < concurrency; w++) {
    workers.push(
      (async () => {
        while (queue.length > 0) {
          const idx = queue.pop();
          if (idx === undefined) break;
          const start = Date.now();
          try {
            const res = await fetch(`${url}/health`);
            const ok = res.ok;
            const latency = Date.now() - start;
            results[idx] = ok ? latency : -1;
            if (!ok) errors++;
          } catch {
            results[idx] = -1;
            errors++;
          } finally {
            const latency = Date.now() - start;
            latencySum += latency;
            if (latency > maxLatency) maxLatency = latency;
            if (latency < minLatency) minLatency = latency;
            completed++;
          }
        }
      })()
    );
  }

  await Promise.all(workers);

  const successes = results.filter((r) => r > 0);
  const successCount = successes.length;
  const avgLatency = successCount > 0 ? latencySum / successCount : 0;

  console.log(JSON.stringify(
    {
      url,
      concurrency,
      totalRequests,
      completed,
      successCount,
      errors,
      avgLatencyMs: Math.round(avgLatency),
      minLatencyMs: minLatency === Infinity ? null : minLatency,
      maxLatencyMs: maxLatency,
    },
    null,
    2
  ));

  if (errors > totalRequests * 0.05) {
    console.error(`[loadtest] ERROR rate too high: ${errors}/${totalRequests}`);
    process.exitCode = 1;
  }
}

run().catch((err) => {
  console.error("[loadtest] Fatal", err);
  process.exit(1);
});
