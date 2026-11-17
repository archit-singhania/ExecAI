import { test, expect } from "@playwright/test";

test("decision approval policy and persisted review history", async ({
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
  const panel=page.getByRole("region",{name:"Decision approvals"});
  const policy = panel.getByLabel("Allow self-approval in this workspace");
  await policy.click(); await expect(policy).toBeChecked();
  await panel.getByLabel("Decision to review").selectOption({label:"Test launch"});
  await panel.getByLabel("Orders · revision 1").check();
  await panel.getByLabel("Stage 1 reviewer").selectOption({index:1});
  await panel.getByRole("button",{name:"Create approval draft"}).click();
  await panel.getByRole("button",{name:"Submit revision for approval"}).click();
  await panel.getByLabel("Reviewer comment").fill("Reviewed fixture evidence");
  await panel.getByRole("button",{name:"approve",exact:true}).click();
  await expect(panel.getByText("approved · Decision revision 1",{exact:false})).toBeVisible();
  await page.reload();await panel.getByText("Review history",{exact:true}).click();
  await expect(panel.getByText("Reviewed fixture evidence",{exact:false})).toBeVisible();
});
