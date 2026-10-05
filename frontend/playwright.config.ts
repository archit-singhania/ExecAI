import { defineConfig, devices } from "@playwright/test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdirSync } from "node:fs";

const api = "http://127.0.0.1:8012";
const web = "http://localhost:3012";
const testDirectory = join(tmpdir(), `ceoai-e2e-${Date.now()}`);
mkdirSync(testDirectory, { recursive: true });
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 180000,
  expect: { timeout: 15000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    actionTimeout: 30000,
    navigationTimeout: 60000,
    baseURL: web,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: { mode: "on", size: { width: 1280, height: 720 } },
    channel: process.env.PLAYWRIGHT_CHANNEL || "chromium",
  },
  projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.PLAYWRIGHT_EXTERNAL_SERVERS
    ? undefined
    : [
        {
          command: `"${process.env.CEOAI_PYTHON || "python"}" ../backend/scripts/e2e_server.py`,
          url: `${api}/health`,
          timeout: 90000,
          reuseExistingServer: false,
          env: {
            DATABASE_URL: `sqlite:///${join(testDirectory, "manual_acceptance.db").replaceAll("\\", "/")}`,
            JWT_SECRET: "isolated-e2e-secret",
            APP_ENV: "test",
            CORS_ORIGINS: web,
            APP_BASE_URL: web,
            RESEARCH_API_KEY: "",
            RESEND_API_KEY: "",
            OLLAMA_BASE_URL: "http://127.0.0.1:9/v1",
            LLM_LOCAL_ONLY: "true",
          },
        },
        {
          command: `"${process.execPath}" "${require.resolve("next/dist/bin/next")}" ${process.env.CEOAI_E2E_PRODUCTION ? "start" : "dev"} --port 3012`,
          url: web,
          timeout: 90000,
          reuseExistingServer: false,
          env: { NEXT_PUBLIC_API_URL: api },
        },
      ],
});
