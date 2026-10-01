import { defineConfig, devices } from "@playwright/test";
import { tmpdir } from "node:os";
import { join } from "node:path";

const api = "http://127.0.0.1:8012";
const web = "http://localhost:3012";
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 90000,
  expect: { timeout: 15000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL: web, trace: "retain-on-failure", screenshot: "only-on-failure", channel: process.env.PLAYWRIGHT_CHANNEL || "chromium" },
  projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.PLAYWRIGHT_EXTERNAL_SERVERS ? undefined : [
    { command: `${process.env.CEOAI_PYTHON || "python"} -m uvicorn app.main:app --app-dir ../backend --host 127.0.0.1 --port 8012`, url: `${api}/health`, timeout: 90000, reuseExistingServer: false, env: { DATABASE_URL: `sqlite:///${join(tmpdir(), `ceoai-e2e-${Date.now()}.db`).replaceAll("\\", "/")}`, JWT_SECRET: "isolated-e2e-secret", APP_ENV: "test", CORS_ORIGINS: web, OLLAMA_BASE_URL: "http://127.0.0.1:9/v1", LLM_LOCAL_ONLY: "true" } },
    { command: "npm run dev -- --port 3012", url: web, timeout: 90000, reuseExistingServer: false, env: { NEXT_PUBLIC_API_URL: api } },
  ],
});
