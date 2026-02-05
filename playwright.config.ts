import { defineConfig, devices } from "@playwright/test";

// Keep host consistent with NEXTAUTH_URL to avoid cookie/redirect mismatches (localhost vs 127.0.0.1).
const baseURL = process.env.E2E_BASE_URL || "http://localhost:3000";
// Use an API healthcheck endpoint to avoid locale redirects and guarantee a 200 for readiness.
const webServerUrl = `${baseURL}/api/health`;
const webServerEnv: Record<string, string> = {
  ...Object.fromEntries(Object.entries(process.env).filter(([, v]) => typeof v === "string")) as Record<string, string>,
  NEXTAUTH_URL: baseURL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || "e2e_dummy_secret",
  E2E: "true"
};

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  webServer: {
    command: "npm run dev -- --webpack -p 3000",
    url: webServerUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: webServerEnv
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
