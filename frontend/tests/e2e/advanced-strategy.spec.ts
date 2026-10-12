import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
async function call(page: Page, path: string, method = "GET", body?: unknown) {
  return page.evaluate(
    async ({ path, method, body }) => {
      const response = await fetch("http://127.0.0.1:8012" + path, {
        method,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + sessionStorage.getItem("ceoai-auth-token"),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    { path, method, body },
  );
}
test("freshness review, concession comparison and exported revocable board deck", async ({
  page,
  browser,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/login");
  await page.locator('input[type="email"]').fill("strategy.fixture@example.com");
  await page
    .locator('input[autocomplete="current-password"]')
    .fill("Correct-Horse-Browser-2026!");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL(/\/studio$/);
  await page
    .getByLabel("Company name", { exact: true })
    .fill("Strategy test · illustrative");
  await page
    .getByLabel("Business goal & context")
    .fill("Review labelled local test evidence before expanding.");
  await page.getByRole("button", { name: "Create workspace", exact: true }).click();
  await expect(page.getByLabel("Choose workspace")).toContainText("Strategy test");
  const sid = await page.getByLabel("Choose workspace").inputValue();
  const records = `/api/studio/${sid}/records`;
  const decision = await call(page, records, "POST", {
    kind: "decision",
    title: "Evidence-led expansion",
    body: "Validate demand before expansion",
    data: { assumptions: "Demand uncertain", alternatives: "Remain local" },
  });
  const metric = await call(page, records, "POST", {
    kind: "metric",
    title: "Metric evidence",
    data: { value: 2, target: 10 },
  });
  await call(page, records, "POST", {
    kind: "scenario",
    title: "Conservative scenario",
    data: { cash: 10000, monthly_cost: 1000, monthly_revenue: 500 },
  });
  await page.goto("/studio/decisions");
  const freshness = page
    .locator("section")
    .filter({
      has: page.getByRole("heading", { name: "Evidence freshness", exact: true }),
    })
    .last();
  await freshness.getByLabel("Decision to baseline").selectOption(decision.id);
  await freshness.getByRole("checkbox", { name: /Metric evidence/ }).check();
  await freshness
    .getByRole("checkbox", {
      name: "I reviewed this decision and its selected supporting evidence.",
    })
    .check();
  await freshness
    .getByRole("button", { name: "Save approval baseline", exact: true })
    .click();
  await expect(freshness.getByRole("status")).toContainText("baseline saved");
  await call(page, records + "/" + metric.id, "PUT", {
    kind: "metric",
    title: "Metric evidence",
    version: metric.version,
    data: { value: 3, target: 10 },
  });
  await freshness
    .getByRole("button", { name: "Check evidence freshness", exact: true })
    .click();
  await expect(freshness).toContainText("Metric evidence · changed · open");
  await freshness.getByText("Inspect evidence change", { exact: true }).click();
  await expect(freshness).toContainText('"value": 2');
  await expect(freshness).toContainText('"value": 3');
  await freshness
    .getByRole("button", { name: "Acknowledge alert", exact: true })
    .click();
  await expect(freshness).toContainText("acknowledged");
  await page.goto("/studio/strategy");
  const negotiation = page
    .locator("section")
    .filter({
      has: page.getByRole("heading", { name: "Negotiation studio", exact: true }),
    })
    .last();
  await negotiation
    .getByText("Create a negotiation comparison", { exact: true })
    .click();
  await negotiation.getByLabel("Negotiation title").fill("Supplier comparison");
  await negotiation
    .getByLabel("Negotiation objectives")
    .fill("Keep acquisition cost below the entered limit.");
  await negotiation.getByLabel("Variable name 1", { exact: true }).fill("Price");
  await negotiation.getByLabel("maximum 1", { exact: true }).fill("100");
  await negotiation.getByLabel("Package A — Price", { exact: true }).fill("90");
  await negotiation.getByLabel("Package B — Price", { exact: true }).fill("110");
  await negotiation
    .getByRole("button", { name: "Save negotiation comparison", exact: true })
    .click();
  await expect(negotiation.getByRole("status")).toContainText("Comparison saved");
  await expect(negotiation).toContainText("Reservation limit violated");
  const deck = page
    .locator("section")
    .filter({
      has: page.getByRole("heading", { name: "Board presentations", exact: true }),
    })
    .last();
  await deck.getByLabel("Presentation decision").selectOption(decision.id);
  await deck
    .getByRole("checkbox", { name: "Include scenario: Conservative scenario" })
    .check();
  await deck
    .getByRole("button", { name: "Generate board presentation", exact: true })
    .click();
  await expect(deck.getByRole("status")).toContainText("generated");
  await expect(
    deck.getByRole("region", { name: "Board presentation viewer" }),
  ).toContainText("Validate demand before expansion");
  await deck.getByRole("button", { name: "Next slide", exact: true }).click();
  await expect(
    deck.getByRole("region", { name: "Board presentation viewer" }),
  ).toContainText("Alternatives and assumptions");
  for (const name of ["Download board PDF", "Download board PowerPoint"]) {
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      deck.getByRole("button", { name, exact: true }).click(),
    ]);
    const file = await download.path();
    expect(file).toBeTruthy();
    const bytes = await readFile(file!);
    expect(bytes.length).toBeGreaterThan(1000);
    expect(bytes.subarray(0, 2).toString()).toBe(name.includes("PDF") ? "%P" : "PK");
  }
  await deck.getByText("Publish a reviewed snapshot", { exact: true }).click();
  await deck
    .getByRole("button", { name: "Publish presentation snapshot", exact: true })
    .click();
  await expect(deck.getByRole("status")).toContainText("snapshot published");
  const publicLink = await deck.locator('a[target="_blank"]').getAttribute("href");
  const visitor = await browser.newContext();
  const shared = await visitor.newPage();
  await shared.goto(publicLink!);
  await expect(
    shared.getByRole("region", { name: "Board presentation viewer" }),
  ).toContainText("Validate demand before expansion");
  await deck
    .getByRole("button", { name: "Revoke presentation links", exact: true })
    .click();
  await expect(deck.getByRole("status")).toContainText("revoked");
  await shared.reload();
  await expect(
    shared.getByRole("heading", { name: "Presentation unavailable", exact: true }),
  ).toBeVisible();
  await visitor.close();
  await page.reload();
  await expect(negotiation).toContainText("Supplier comparison");
  await page.screenshot({
    path: "../docs/screenshots/advanced-features-2026-10-12/strategy-lab.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
