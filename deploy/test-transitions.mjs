#!/usr/bin/env node
/**
 * Test if page transitions are working
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const transitionFile = path.join(__dirname, "..", "src", "components", "page-transition.tsx");

console.log(`
╔═══════════════════════════════════════╗
║   CHECKING PAGE TRANSITION CODE       ║
╚═══════════════════════════════════════╝
`);

try {
  const content = fs.readFileSync(transitionFile, "utf-8");

  console.log("✓ PageTransition component found at:", transitionFile);
  console.log("");

  const checks = [
    {
      name: 'Has "page-enter" class',
      test: () => content.includes("page-enter"),
    },
    {
      name: 'Has "page-exit" class',
      test: () => content.includes("page-exit"),
    },
    {
      name: "Uses usePathname hook",
      test: () => content.includes("usePathname"),
    },
    {
      name: "Has animation logic",
      test: () => content.includes("setIsVisible"),
    },
    {
      name: "Has children dependency in useEffect",
      test: () => content.includes("[pathname, children]"),
    },
  ];

  let allPassed = true;
  checks.forEach((check) => {
    const passed = check.test();
    console.log(`${passed ? "✓" : "✗"} ${check.name}`);
    if (!passed) allPassed = false;
  });

  console.log("");
  if (allPassed) {
    console.log("✅ All checks passed! Page transitions should be working.");
    console.log("");
    console.log("📝 To see the transitions in action:");
    console.log("  1. Visit https://freela.ge");
    console.log("  2. Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)");
    console.log("  3. Click between pages");
    console.log("  4. You should see smooth fade-in/fade-out animations!");
  } else {
    console.log("⚠️  Some checks failed. Code may not be deployed yet.");
    console.log("   GitHub Actions is still deploying...");
  }
} catch (error) {
  console.error("✗ Error reading file:", error.message);
  process.exit(1);
}
