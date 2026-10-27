import { test, expect } from "@playwright/test";

test("outcome review records actual zero, freezes snapshots and creates selected tasks", async ({
  page,
}) => {
  test.setTimeout(300000);
  await page.goto("/login");
  await page.locator('input[type="email"]').fill("strategy.fixture@example.com");
  await page
    .locator('input[autocomplete="current-password"]')
    .fill("Correct-Horse-Browser-2026!");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL(/\/studio$/, { timeout: 90000 });
  await page.getByLabel("Company name", { exact: true }).fill("Outcome acceptance");
  await page
    .getByLabel("Business goal & context")
    .fill("Illustrative outcome-review acceptance workspace.");
  await page.getByRole("button", { name: "Create workspace", exact: true }).click();
  await expect(page.getByLabel("Choose workspace")).toContainText("Outcome acceptance");
  const sid = await page.getByLabel("Choose workspace").inputValue();
  await page.evaluate(async (sid) => {
    const headers = {
      "Content-Type": "application/json",
      Authorization: "Bearer " + sessionStorage.getItem("ceoai-auth-token"),
    };
    async function post(path: string, body: unknown) {
      const r = await fetch(`http://127.0.0.1:8012/api/studio/${sid}${path}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    }
    const decision = await post("/records", {
      kind: "decision",
      title: "Test launch",
      body: "Validate before spending",
    });
    const metric = await post("/records", {
      kind: "metric",
      title: "Orders",
      data: { value: 3, target: 10 },
    });
    await post("/freshness/baselines", {
      confirmed: true,
      decision_id: decision.id,
      evidence_ids: [metric.id],
    });
  }, sid);
  await page.goto("/studio/decisions");
  const panel = page.locator('section[aria-labelledby="outcome-heading"]');
  await panel.getByText("Create outcome review", { exact: true }).click();
  await panel
    .getByLabel("Approved evidence baseline")
    .selectOption({ label: "Test launch · revision 1" });
  await panel.getByLabel("Review date", { exact: true }).fill("2026-11-30");
  await panel.getByLabel("Criterion label").fill("Orders");
  await panel.getByLabel("Target", { exact: true }).fill("10");
  await panel.getByLabel("Unit", { exact: true }).fill("orders");
  await panel.getByLabel("Reporting period", { exact: true }).fill("November 2026");
  await panel.getByRole("button", { name: "Create review", exact: true }).click();
  await expect(
    panel.getByText("No measurement recorded.", { exact: false }),
  ).toBeVisible();
  await panel.getByLabel("Actual value (blank means unknown)").fill("0");
  await panel.getByLabel("Observed unit").fill("orders");
  await panel.getByLabel("Observed period").fill("November 2026");
  await panel
    .getByLabel("Source / measurement reference")
    .fill("Local acceptance ledger");
  await panel.getByLabel("Measured on").fill("2026-11-30");
  await panel
    .getByLabel("Lessons, including evidence limitations")
    .fill("No orders were observed.");
  await panel
    .getByLabel("Proposed follow-up actions", { exact: false })
    .fill("Interview five buyers");
  await page.goto("/studio/execution");
  await page.goto("/studio/decisions");
  await expect(
    panel.getByText("Recovered unsaved observations", { exact: false }),
  ).toBeVisible();
  await expect(panel.getByLabel("Actual value (blank means unknown)")).toHaveValue("0");
  await panel.getByRole("button", { name: "Complete and freeze review" }).click();
  await expect(panel.getByText("Variance: -10", { exact: false })).toBeVisible();
  await panel.getByLabel("Interview five buyers", { exact: true }).check();
  await panel.getByRole("button", { name: "Confirm selected tasks" }).click();
  await expect(panel.getByRole("status")).toContainText("1 tasks available");
  await page.reload();
  await panel
    .getByRole("button", { name: "Test launch · completed · 2026-11-30", exact: true })
    .click();
  await expect(panel.getByLabel("Actual value (blank means unknown)")).toBeDisabled();
  await expect(panel.getByLabel("Actual value (blank means unknown)")).toHaveValue("0");
  await panel.getByRole("button", { name: "Create correction draft" }).click();
  await expect(panel.getByText("Correction of review", { exact: false })).toBeVisible();
  await expect(panel.getByLabel("Actual value (blank means unknown)")).toBeEnabled();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    panel.getByRole("heading", { name: "Decision outcome reviews" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
});
