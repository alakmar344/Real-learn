// Automatic Bun Runtime Bootstrapper for PaaS Web Services (Render)
// Bun is the PRIMARY runtime: when deployed on standard Node web services
// (no Docker / no terminal access), this script ensures Bun is available —
// installing a PINNED, SHA-256-VERIFIED release when missing — and runs the
// server on Bun. Node.js is the secondary runtime: if Bun cannot be acquired
// or verified, the server falls back to Node safely.
//
// SECURITY: the previous installer piped https://bun.sh/install into bash —
// a supply-chain RCE surface (DNS hijack / TLS-intercepting proxy / upstream
// compromise executes attacker code with this service's secrets in env).
// The installer below instead downloads a version-pinned release archive and
// refuses to run anything whose SHA-256 doesn't match the checksums baked in
// here. Set BUN_AUTO_INSTALL=0 to disable the auto-install entirely.

import { spawn, execSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Pinned Bun release. To upgrade: bump the version AND replace the checksums
// with the matching lines from that release's SHASUMS256.txt
// (https://github.com/oven-sh/bun/releases/download/bun-v<ver>/SHASUMS256.txt).
const BUN_VERSION = "1.4.0";
const BUN_SHA256 = {
  "linux-x64": "2d03fb5fb83ac8b567aca0a281b2ce1a1a19d488f56c2968d88c3f25e92fe452",
  "linux-x64-baseline": "184fb4595f0d401a217cf7c78c1bc430ba83314dab7a8b94805babbf7fa7097f",
  "linux-aarch64": "4b1a332ee861983eb93bcfe6f770fff94e3e31b2c388bdaea3c8ed35e58eed0e",
};

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

  // 2. Check standard Bun installation directories (including our own pinned
  // install root from a previous boot).
  const home = os.homedir();
  const standardPaths = [
    ...pinnedBunCandidates(),
    path.join(home, ".bun", "bin", process.platform === "win32" ? "bun.exe" : "bun"),
    "/opt/render/.bun/bin/bun",
    "/home/render/.bun/bin/bun",
    "/root/.bun/bin/bun",
    process.env.BUN_INSTALL ? path.join(process.env.BUN_INSTALL, "bin", "bun") : null,
  ].filter(Boolean);

  for (const candidate of standardPaths) {
    if (fs.existsSync(candidate) && verifyBunRuns(candidate)) {
      return candidate;
    }
  }

  return null;
}

function pinnedInstallRoot() {
  return path.join(os.homedir(), ".bun-pinned", `v${BUN_VERSION}`);
}

/** Release targets to try for this machine, most-optimized first. */
function bunReleaseTargets() {
  if (process.platform !== "linux") return [];
  // x64-baseline covers pre-AVX2 CPUs; tried only if the optimized build
  // fails its --version smoke test on this machine.
  if (process.arch === "x64") return ["linux-x64", "linux-x64-baseline"];
  if (process.arch === "arm64") return ["linux-aarch64"];
  return [];
}

function pinnedBunCandidates() {
  return bunReleaseTargets().map((target) =>
    path.join(pinnedInstallRoot(), `bun-${target}`, "bun")
  );
}

/** A binary that can't print its version must never become the runtime. */
function verifyBunRuns(binPath) {
  try {
    execSync(`${JSON.stringify(binPath)} --version`, {
      stdio: "ignore",
      timeout: 15_000,
    });
    return true;
  } catch {
    return false;
  }
}

function hasUnzip() {
  try {
    execSync("unzip -v", { stdio: "ignore", timeout: 10_000 });
    return true;
  } catch {
    return false;
  }
}

async function downloadAndVerifyBun(target, destDir) {
  const archive = `bun-${target}.zip`;
  const url = `https://github.com/oven-sh/bun/releases/download/bun-v${BUN_VERSION}/${archive}`;
  console.log(`[bootstrap] Downloading pinned ${archive} (bun-v${BUN_VERSION})...`);
  const response = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(90_000),
  });
  if (!response.ok) {
    throw new Error(`Download failed: HTTP ${response.status}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());

  const digest = crypto.createHash("sha256").update(bytes).digest("hex");
  const expected = BUN_SHA256[target];
  if (digest !== expected) {
    throw new Error(
      `SHA-256 mismatch for ${archive}: expected ${expected}, got ${digest} — refusing to install`
    );
  }

  const zipPath = path.join(destDir, archive);
  fs.writeFileSync(zipPath, bytes);
  try {
    execSync(`unzip -o ${JSON.stringify(zipPath)} -d ${JSON.stringify(destDir)}`, {
      stdio: "ignore",
      timeout: 60_000,
    });
  } finally {
    fs.rmSync(zipPath, { force: true });
  }

  const binPath = path.join(destDir, `bun-${target}`, "bun");
  if (!fs.existsSync(binPath)) {
    throw new Error(`Archive did not contain the expected binary at ${binPath}`);
  }
  fs.chmodSync(binPath, 0o755);
  return binPath;
}

async function installBunPinned() {
  if (process.env.BUN_AUTO_INSTALL === "0") {
    console.log(
      "[bootstrap] Bun not found and BUN_AUTO_INSTALL=0 — skipping install; using Node.js runtime."
    );
    return null;
  }
  const targets = bunReleaseTargets();
  if (targets.length === 0) {
    console.log(
      `[bootstrap] No pinned Bun build for ${process.platform}/${process.arch}; using Node.js runtime.`
    );
    return null;
  }
  if (!hasUnzip()) {
    console.warn("[bootstrap] `unzip` is not available; cannot install Bun. Using Node.js runtime.");
    return null;
  }

  const installRoot = pinnedInstallRoot();
  fs.mkdirSync(installRoot, { recursive: true });

  for (const target of targets) {
    try {
      const binPath = await downloadAndVerifyBun(target, installRoot);
      if (verifyBunRuns(binPath)) {
        console.log(`[bootstrap] Bun ${BUN_VERSION} installed and verified (${target}).`);
        return binPath;
      }
      console.warn(
        `[bootstrap] Installed bun-${target} does not run on this CPU; trying next target...`
      );
    } catch (error) {
      console.warn(`[bootstrap] Bun install for ${target} failed:`, error.message);
    }
  }
  return null;
}

async function run() {
  let bunPath = findBunExecutable();

  // Bun is the primary runtime — install the pinned, checksum-verified
  // release when it's missing.
  if (!bunPath) {
    bunPath = await installBunPinned();
  }

  if (bunPath) {
    console.log(`[bootstrap] 🚀 Launching Fastify backend under Bun (${bunPath})...`);
    const polyfillsFile = path.join(__dirname, "lib", "polyfills.js");
    const serverFile = path.join(__dirname, "server.js");

    const child = spawn(bunPath, ["run", "--preload", polyfillsFile, serverFile], {
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
    const concurrency = process.env.WEB_CONCURRENCY;
    const isCluster =
      process.env.CLUSTER_MODE === "1" ||
      (typeof concurrency === "string" &&
        (concurrency.trim().toLowerCase() === "auto" || Number(concurrency) > 1));
    if (isCluster) {
      console.log(
        `[bootstrap] Multi-core clustering requested (WEB_CONCURRENCY=${concurrency || "auto"}). Launching cluster...`
      );
      await import("./cluster.js");
    } else {
      // server.js only auto-starts when it is the entry script (argv[1]); here
      // argv[1] is bootstrap.js, so startServer() must be invoked explicitly —
      // a bare import would load the module without ever binding the port.
      const { startServer } = await import("./server.js");
      await startServer();
    }
  }
}

run().catch((err) => {
  console.error("[bootstrap] Fatal startup error:", err);
  process.exit(1);
});
