import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const nextDir = path.resolve(".next");

if (!fs.existsSync(nextDir)) {
  console.log("No .next directory to remove.");
  process.exit(0);
}

try {
  fs.rmSync(nextDir, { recursive: true, force: true });
  console.log("Removed .next directory.");
  process.exit(0);
} catch (err) {
  if (process.platform !== "win32") {
    console.error("Failed to remove .next directory.", err);
    process.exit(1);
  }
}

// Windows fallback (handles some locked-path edge cases better)
const res = spawnSync("cmd", ["/c", "rmdir", "/s", "/q", ".next"], { stdio: "inherit" });
if (res.error) {
  console.error("Failed to remove .next directory.", res.error);
  process.exit(1);
}
process.exit(res.status ?? 0);

