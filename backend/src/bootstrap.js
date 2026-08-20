// Automatic Bun Runtime Bootstrapper for PaaS Web Services (Render, etc.)
// When deployed on standard Node web services (no Docker / no terminal access),
// this script automatically ensures Bun is available and runs the server on Bun.
// If Bun cannot be acquired, it safely falls back to Node.js.

import { spawn, execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function findBunExecutable() {
  // 1. Check PATH
  try {
    const isWindows = process.platform === "win32";
    const checkCmd = isWindows ? "where bun" : "which bun";
    const out = execSync(checkCmd, { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
    if (out) return isWindows ? out.split(/\r?\n/)[0] : out;
  } catch {
    // Not in PATH
  }

  // 2. Check standard Bun installation directories
  const home = os.homedir();
  const standardPaths = [
    path.join(home, ".bun", "bin", process.platform === "win32" ? "bun.exe" : "bun"),
    "/root/.bun/bin/bun",
    "/home/render/.bun/bin/bun",
  ];

  for (const candidate of standardPaths) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function installBunOnLinux() {
  try {
    console.log("[bootstrap] Bun not found in environment. Automatically installing Bun...");
    execSync("curl -fsSL https://bun.sh/install | bash", {
      stdio: "inherit",
      timeout: 60_000,
    });
    return findBunExecutable();
  } catch (error) {
    console.warn("[bootstrap] Automated Bun installation failed:", error.message);
    return null;
  }
}

async function run() {
  let bunPath = findBunExecutable();

  // If on Linux (Render, etc.) and Bun is missing, auto-install it
  if (!bunPath && process.platform === "linux") {
    bunPath = installBunOnLinux();
  }

  if (bunPath) {
    console.log(`[bootstrap] 🚀 Launching Fastify backend under Bun (${bunPath})...`);
    const serverFile = path.join(path.dirname(new URL(import.meta.url).pathname), "server.js");
    // Normalize path for Windows/Linux
    const cleanServerFile = process.platform === "win32" && serverFile.startsWith("/")
      ? serverFile.slice(1)
      : serverFile;

    const child = spawn(bunPath, ["run", cleanServerFile], {
      stdio: "inherit",
      env: {
        ...process.env,
        PATH: `${path.dirname(bunPath)}${path.delimiter}${process.env.PATH || ""}`,
      },
    });

    const forwardSignal = (sig) => {
      if (!child.killed) child.kill(sig);
    };

    process.on("SIGTERM", () => forwardSignal("SIGTERM"));
    process.on("SIGINT", () => forwardSignal("SIGINT"));

    child.on("exit", (code, signal) => {
      if (signal) {
        process.kill(process.pid, signal);
      } else {
        process.exit(code ?? 0);
      }
    });
  } else {
    console.log("[bootstrap] Bun is not available. Falling back to Node.js 24 runtime...");
    await import("./server.js");
  }
}

run().catch((err) => {
  console.error("[bootstrap] Fatal startup error:", err);
  process.exit(1);
});
