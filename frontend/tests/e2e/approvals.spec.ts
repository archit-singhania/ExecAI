import { test, expect } from "@playwright/test";

test("assigned reviewer approves in a separate browser context", async ({
  page, browser,
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
    await post("/members", {email:"editor.fixture@example.com", role:"editor"});
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
  await panel.getByLabel("Decision to review").selectOption({label:"Test launch"});
  await panel.getByLabel("Orders · revision 1").check();
  await panel.getByLabel("Stage 1 reviewer").selectOption({label:"Local QA Editor · Illustrative"});
  await panel.getByRole("button",{name:"Create approval draft"}).click();
  await panel.getByRole("button",{name:"Submit revision for approval"}).click();
  await expect(panel.getByRole("button",{name:"approve",exact:true})).toHaveCount(0);
  const reviewerContext = await browser.newContext();
  try {
    const reviewer = await reviewerContext.newPage();
    await reviewer.goto(new URL("/login",page.url()).href);
    await reviewer.locator('input[type="email"]').fill("editor.fixture@example.com");
    await reviewer.locator('input[autocomplete="current-password"]').fill("Correct-Horse-Browser-2026!");
    await reviewer.getByRole("button",{name:"Log in",exact:true}).click();
    await expect(reviewer).toHaveURL(/\/studio$/);
    await reviewer.getByLabel("Choose workspace").selectOption(sid);
    await reviewer.goto(new URL("/studio/decisions",page.url()).href);
    const reviewPanel = reviewer.getByRole("region",{name:"Decision approvals"});
    await reviewPanel.getByLabel("Reviewer comment").fill("Reviewed fixture evidence");
    let competingStatuses: number[] = [];
    await reviewer.route("**/approvals/*/transitions", async (route) => {
      const responses = await Promise.all([route.fetch(), route.fetch()]);
      competingStatuses = responses.map(response => response.status()).sort();
      const accepted = responses.find(response => response.ok());
      await route.fulfill({ response: accepted ?? responses[0] });
    }, { times: 1 });
    await reviewPanel.getByRole("button",{name:"approve",exact:true}).click();
    await expect(reviewPanel.getByText("approved · Decision revision 1")).toBeVisible();
    expect(competingStatuses).toEqual([200, 409]);
  } finally {
    await reviewerContext.close();
  }
  await page.reload();
  await expect(panel.getByText("approved · Decision revision 1",{exact:false})).toBeVisible();
  await page.reload();await panel.getByText("Review history",{exact:true}).click();
  const receipt = panel.getByText("Reviewed fixture evidence",{exact:false});
  await expect(receipt).toBeVisible();
  await expect(receipt).toHaveCount(1);
});
