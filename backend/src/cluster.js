// Production-ready cluster launcher: scales the backend across available CPU
// cores to achieve maximum concurrent request throughput.
import cluster from "node:cluster";
import os from "node:os";

if (cluster.isPrimary) {
  const cpuCount = os.availableParallelism ? os.availableParallelism() : os.cpus().length;
  const configuredConcurrency = Number(process.env.WEB_CONCURRENCY);
  const workerCount =
    Number.isFinite(configuredConcurrency) && configuredConcurrency > 0
      ? configuredConcurrency
      : Math.max(1, cpuCount);

  console.log(`[cluster] Primary process ${process.pid} is running`);
  console.log(`[cluster] Forking ${workerCount} worker(s)...`);

  for (let i = 0; i < workerCount; i++) {
    cluster.fork();
  }

  // Graceful zero-downtime worker replacement on unexpected death
  cluster.on("exit", (worker, code, signal) => {
    if (worker.exitedAfterDisconnect) {
      console.log(`[cluster] Worker ${worker.process.pid} shut down gracefully`);
    } else {
      console.error(
        `[cluster] Worker ${worker.process.pid} died (code: ${code}, signal: ${signal}). Forking replacement...`
      );
      cluster.fork();
    }
  });

  // Forward termination signals to all active workers
  const forwardSignal = (sig) => {
    console.log(`[cluster] Primary received ${sig}, terminating workers...`);
    for (const id in cluster.workers) {
      cluster.workers[id]?.process.kill(sig);
    }
  };

  process.on("SIGTERM", () => forwardSignal("SIGTERM"));
  process.on("SIGINT", () => forwardSignal("SIGINT"));
} else {
  // Workers import and run server.js directly
  import("./server.js");
}
