import { test, expect } from "@playwright/test";

test("CSV review stages, imports and deduplicates observations", async ({
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
  await page.getByLabel("Company name", { exact: true }).fill("Allocation acceptance");
  await page
    .getByLabel("Business goal & context")
    .fill("Illustrative outcome-review acceptance workspace.");
  await page.getByRole("button", { name: "Create workspace", exact: true }).click();
  await expect(page.getByLabel("Choose workspace")).toContainText("Allocation acceptance");
  await page.goto("/studio/goals");
  const panel=page.getByRole("region",{name:"Import KPI observations"});
  await panel.getByLabel("Source name").fill("Fixture ledger");
  await panel.getByLabel("CSV text",{exact:true}).fill("id,metric,value,unit,date\na,Orders,0,count,2026-11-01\nb,Orders,3,count,2026-11-02");
  await panel.getByRole("button",{name:"Preview and stage CSV"}).click();
  await expect(panel.getByText("2 ready",{exact:true})).toBeVisible();
  await panel.getByRole("button",{name:"Approve eligible observations"}).click();
  await expect(panel.getByText("2 imported",{exact:true})).toBeVisible();
  await panel.getByRole("button",{name:"Preview and stage CSV"}).click();
  await expect(panel.getByText("2 duplicate",{exact:true})).toBeVisible();
  await page.reload();await expect(panel.getByText("2 imported",{exact:true})).toBeVisible();
});
