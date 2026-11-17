import { test, expect } from "@playwright/test";

test("strategy experiment draft recovery and approved KPI closure", async ({
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
  const panel=page.locator('section[aria-labelledby="experiment-heading"]');
  await panel.getByLabel("Hypothesis",{exact:true}).fill("Evidence-based launch");
  await page.goto("/studio");await page.goto("/studio/decisions");
  await expect(panel.getByLabel("Hypothesis",{exact:true})).toHaveValue("Evidence-based launch",{timeout:90000});
  await panel.getByLabel("Approved evidence baseline").selectOption({label:"Test launch"});
  await panel.getByLabel("Success criteria · one per line").fill("Orders increase");
  await panel.getByLabel("Observation start").fill("2026-11-01");
  await panel.getByLabel("Observation end").fill("2026-11-30");
  await panel.getByLabel("Stop conditions").fill("Stop if costs exceed budget");
  await panel.getByRole("button",{name:"Plan experiment",exact:true}).click();
  await panel.getByRole("button",{name:"Activate saved experiment"}).click();
  await panel.getByLabel("Observation or closure summary").fill("Orders reviewed");
  await panel.getByLabel("Approved KPI snapshot").selectOption({label:"Orders · revision 1"});
  await panel.getByLabel("Measurement date").fill("2026-11-10");
  await page.reload();
  await expect(panel.getByLabel("Observation or closure summary")).toHaveValue("Orders reviewed");
  await panel.getByRole("button",{name:"Record checkpoint"}).click();
  await expect(panel.getByText("Saved revision: 3.",{exact:false})).toBeVisible();
  await panel.getByRole("button",{name:"Complete and create review draft"}).click();
  await expect(panel.getByText("Outcome review draft created:",{exact:false})).toBeVisible();
  await page.setViewportSize({width:390,height:844});
  await expect(panel.getByRole("heading",{name:"Strategy experiments"})).toBeVisible();
  await page.reload();await expect(panel.getByText("Status: completed.",{exact:false})).toBeVisible();
});
