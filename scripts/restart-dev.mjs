import { execSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = process.env.PORT ?? "3000";

function killPort(targetPort) {
  if (process.platform === "win32") {
    try {
      const out = execSync(`netstat -ano | findstr :${targetPort}`, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
      const pids = new Set(
        out
          .split(/\r?\n/)
          .map((line) => line.trim().split(/\s+/).pop())
          .filter((pid) => pid && /^\d+$/.test(pid) && pid !== "0"),
      );
      for (const pid of pids) {
        try {
          execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
          console.log(`Stopped process ${pid} on port ${targetPort}`);
        } catch {
          /* already gone */
        }
      }
    } catch {
      /* nothing listening */
    }
    return;
  }

  try {
    execSync(`lsof -ti:${targetPort} | xargs kill -9`, {
      stdio: "ignore",
      shell: true,
    });
  } catch {
    /* nothing listening */
  }
}

console.log(`\nRestarting dev server on http://localhost:${port} ...\n`);
killPort(port);
killPort("3001");

const nextDir = path.join(root, ".next");
try {
  if (fs.existsSync(nextDir)) {
    fs.rmSync(nextDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
    console.log("Cleared .next cache");
  }
} catch {
  console.log("Could not clear .next cache (still starting dev server)");
}

const child = spawn("npm", ["run", "dev"], {
  cwd: root,
  stdio: "inherit",
  shell: true,
  env: { ...process.env, PORT: port },
});

child.on("exit", (code) => process.exit(code ?? 0));
