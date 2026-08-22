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

  const workerStartTimes = new Map(); // worker.id -> fork timestamp
  const fork = () => {
    const worker = cluster.fork();
    workerStartTimes.set(worker.id, Date.now());
    return worker;
  };

  for (let i = 0; i < workerCount; i++) {
    fork();
  }

  // Graceful zero-downtime worker replacement on unexpected death — with a
  // crash-loop backstop: a worker dying that fast (e.g. fatal config error at
  // startup) would otherwise be re-forked in a tight loop forever, pegging the
  // CPU while never serving a single request. Exiting instead surfaces the
  // failure to the process supervisor / PaaS, where it belongs.
  const FAST_DEATH_MS = 5000;
  const MAX_CONSECUTIVE_FAST_DEATHS = 5;
  let consecutiveFastDeaths = 0;
  let shuttingDown = false;
  cluster.on("exit", (worker, code, signal) => {
    const startedAt = workerStartTimes.get(worker.id);
    workerStartTimes.delete(worker.id);
    // Workers terminate via their own shutdown handler + process.exit(0), so
    // exitedAfterDisconnect is false during a signal-driven shutdown; without
    // the shuttingDown check every gracefully-exiting worker would be treated
    // as an unexpected death and re-forked forever, keeping the port bound
    // until the platform SIGKILLs the primary.
    if (shuttingDown || worker.exitedAfterDisconnect) {
      console.log(`[cluster] Worker ${worker.process.pid} shut down gracefully`);
      if (shuttingDown && Object.keys(cluster.workers ?? {}).length === 0) {
        console.log("[cluster] All workers exited — primary shutting down");
        process.exit(0);
      }
      return;
    }
    const diedFast = startedAt != null && Date.now() - startedAt < FAST_DEATH_MS;
    consecutiveFastDeaths = diedFast ? consecutiveFastDeaths + 1 : 0;
    if (consecutiveFastDeaths >= MAX_CONSECUTIVE_FAST_DEATHS) {
      console.error(
        `[cluster] ${consecutiveFastDeaths} consecutive workers died within ${FAST_DEATH_MS}ms of forking — startup is fatally broken. Exiting instead of crash-looping.`
      );
      process.exit(1);
    }
    console.error(
      `[cluster] Worker ${worker.process.pid} died (code: ${code}, signal: ${signal}). Forking replacement...`
    );
    fork();
  });

  // Forward termination signals to all active workers
  const forwardSignal = (sig) => {
    console.log(`[cluster] Primary received ${sig}, terminating workers...`);
    shuttingDown = true;
    for (const id in cluster.workers) {
      cluster.workers[id]?.process.kill(sig);
    }
    // Backstop: if a worker hangs past its own shutdown deadline, exit anyway
    // so the platform's grace window is never exceeded by the primary.
    const backstop = setTimeout(() => {
      console.error("[cluster] Workers did not exit in time — forcing primary exit");
      process.exit(1);
    }, 25_000);
    backstop.unref();
  };

  process.on("SIGTERM", () => forwardSignal("SIGTERM"));
  process.on("SIGINT", () => forwardSignal("SIGINT"));
} else {
  // Workers must call startServer() explicitly: server.js only auto-starts
  // when it is the process entrypoint (process.argv[1]), and in a cluster
  // worker argv[1] is cluster.js — a bare import would never bind the port.
  const { startServer } = await import("./server.js");
  await startServer();
}
