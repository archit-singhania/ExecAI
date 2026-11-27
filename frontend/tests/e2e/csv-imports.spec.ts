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
  await page.getByRole("button", { name: "New workspace", exact: true }).click();
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

test("HubSpot fixture can connect, stage two pages, approve and disconnect", async ({ page, request }) => {
  test.skip(process.env.CEOAI_E2E_HUBSPOT !== "1", "Requires the isolated HubSpot provider fixture");
  await page.goto("/login");
  await page.locator('input[type="email"]').fill("strategy.fixture@example.com");
  await page.locator('input[autocomplete="current-password"]').fill("Correct-Horse-Browser-2026!");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL(/\/studio$/);
  await page.getByRole("button", { name: "New workspace", exact: true }).click();
  await page.getByLabel("Company name", { exact: true }).fill("HubSpot browser fixture");
  await page.getByLabel("Business goal & context").fill("Review staged deal observations.");
  await page.getByRole("button", { name: "Create workspace", exact: true }).click();
  await expect(page.getByLabel("Choose workspace")).toContainText("HubSpot browser fixture");
  await page.goto("/studio/goals");
  const panel = page.getByRole("region", { name: "Import KPI observations" });
  await expect(panel.getByRole("button", { name: "Check HubSpot for updates" })).toBeDisabled();
  await panel.getByRole("button", { name: "Connect HubSpot", exact: true }).click();
  const consent = panel.getByRole("link", { name: "Continue to HubSpot" });
  await expect(consent).toBeVisible();
  const authorization = new URL((await consent.getAttribute("href"))!);
  expect(authorization.hostname).toBe("app.hubspot.com");
  expect(authorization.searchParams.get("scope")).toBe("crm.objects.deals.read");
  expect(authorization.searchParams.get("optional_scope")).toBe("crm.objects.companies.read");
  const callback = new URL(authorization.searchParams.get("redirect_uri")!);
  expect(callback.hostname).toBe("127.0.0.1");
  callback.searchParams.set("state", authorization.searchParams.get("state")!);
  callback.searchParams.set("code", "browser-fixture");
  expect((await request.get(callback.href)).ok()).toBeTruthy();
  await panel.getByRole("button", { name: "Refresh connection" }).click();
  await panel.getByRole("button", { name: "Check HubSpot for updates" }).click();
  await expect(panel.getByText(/The time window was narrowed/)).toBeVisible();
  await expect(panel.getByText("1 ready", { exact: true })).toHaveCount(0);
  await page.reload();
  await panel.getByRole("button", { name: "Check HubSpot for updates" }).click();
  await expect(panel.getByRole("button", { name: "Stage next HubSpot page" })).toBeEnabled();
  await expect(panel.getByText("1 ready", { exact: true })).toHaveCount(1);
  await page.reload();
  await panel.getByRole("button", { name: "Stage next HubSpot page" }).click();
  await expect(panel.getByText("1 ready", { exact: true })).toHaveCount(2);
  await panel.getByRole("button", { name: "Approve eligible observations" }).first().click();
  await expect(panel.getByText("1 imported", { exact: true })).toBeVisible();
  await panel.getByLabel("HubSpot object").selectOption("companies");
  await panel.getByRole("button", { name: "Check HubSpot for updates" }).click();
  await expect(panel.getByText(/HubSpot company 1 headcount · Fixture company/).first()).toBeVisible();
  await panel.getByRole("button", { name: "Disconnect HubSpot" }).click();
  await expect(panel.getByRole("button", { name: "Check HubSpot for updates" })).toBeDisabled();
});
