import { test, expect } from "@playwright/test";

test("allocation proposal optimizes and saves a durable plan", async ({
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
  await page.getByRole("button", { name: "New workspace", exact: true }).click();
  await page.getByLabel("Company name", { exact: true }).fill("Resource allocation acceptance");
  await page
    .getByLabel("Business goal & context")
    .fill("Illustrative outcome-review acceptance workspace.");
  await page.getByRole("button", { name: "Create workspace", exact: true }).click();
  await page.getByLabel("Choose workspace").selectOption({label:"Resource allocation acceptance"});
  await page.goto("/studio/execution");
  const panel=page.locator('section[aria-labelledby="allocation-heading"]');
  await panel.getByLabel("Scenario name").fill("Local capacity");
  await panel.getByLabel("Initiative name").fill("Launch");
  await panel.getByLabel("initiative-1 cost",{exact:true}).fill("40");
  await panel.getByLabel("initiative-1 hours",{exact:true}).fill("20");
  await panel.getByLabel("initiative-1 value",{exact:true}).fill("75");
  await panel.getByRole("button",{name:"Save and optimize scenario"}).click();
  await expect(panel.getByRole("cell",{name:"optimal",exact:true})).toBeVisible({timeout:30000});
  await panel.getByRole("button",{name:"Apply reviewed proposal as new plan"}).click();
  await expect(panel.getByRole("button",{name:"Plan revision saved"})).toBeDisabled();
  await page.reload();await expect(panel.getByRole("button",{name:"Plan revision saved"})).toBeDisabled();
  await page.setViewportSize({width:390,height:844});await expect(panel.getByRole("heading",{name:"Resource allocation"})).toBeVisible();
});
