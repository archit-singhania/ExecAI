import { test, expect } from "@playwright/test";

test("real company workflows persist, with dark/mobile and keyboard access", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/signup");
  await page.locator('input[autocomplete="name"]').fill("Studio Founder");
  await page.locator('input[type="email"]').fill(`founder-${Date.now()}@example.com`);
  await page
    .locator('input[autocomplete="new-password"]')
    .fill("Correct-Horse-Board-2026!");
  await page.getByRole("button", { name: "Create free account", exact: true }).click();
  await expect(page).toHaveURL(/\/studio$/);
  await page.getByLabel("Company name", { exact: true }).fill("Northstar Labs · Illustrative workspace");
  await page
    .getByLabel("Business goal & context")
    .fill(
      "Validate invoice reconciliation for accountants before spending the launch budget.",
    );
  await page.getByRole("button", { name: "Create workspace", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your executive desk", exact: false }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Choose workspace")).toContainText("Northstar Labs");
  await page.goto("/studio/decisions");
  await page.getByLabel("Title", { exact: true }).fill("Interview before launch");
  await page
    .getByLabel("Decision rationale")
    .fill("Evidence should precede engineering effort.");
  await page.getByRole("button", { name: "Save decision", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Interview before launch", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Interview before launch", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Search everything" }).click();
  const dialog = page.getByRole("dialog", { name: "Search workspace" });
  await expect(dialog).toBeVisible();
  const search = dialog.getByLabel("Search query");
  await search.fill("Interview");
  await search.press("End");
  await search.pressSequentially(" before");
  await expect(search).toHaveValue("Interview before");
  await dialog.getByRole("button", { name: "Search", exact: true }).click();
  await expect(
    dialog.getByRole("button", { name: /^decision Interview before launch/ }),
  ).toBeVisible();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.locator(":focus")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await page.goto("/studio/finance");
  await page.getByLabel("Title", { exact: true }).fill("Lean launch");
  await page.getByLabel("Available cash").fill("12000");
  await page.getByLabel("Monthly costs", { exact: true }).fill("3000");
  await page.getByLabel("Monthly revenue", { exact: true }).fill("1000");
  await page.getByRole("button", { name: "Save scenario" }).click();
  await expect(page.getByRole("table")).toContainText("6.0 months");
  await page.goto("/studio/execution");
  await page.getByLabel("Task title").fill("Interview five accountants");
  await page.getByRole("button", { name: "Save task" }).click();
  await expect(
    page.getByRole("heading", { name: "Interview five accountants" }),
  ).toBeVisible();
  await page.goto("/studio/knowledge");
  await page.getByLabel("Choose document").setInputFiles({
    name: "buyers.md",
    mimeType: "text/markdown",
    buffer: Buffer.from("Accountants need invoice reconciliation and audit trails."),
  });
  await page.getByRole("button", { name: "Upload & index" }).click();
  await expect(page.getByRole("heading", { name: "buyers.md" })).toBeVisible();
  await page.getByLabel("Search your documents").fill("invoice");
  await page.getByRole("button", { name: "Search knowledge" }).click();
  await expect(page.getByText(/Passage 1/)).toBeVisible();
  await page.goto("/studio/boardroom");
  await page.getByRole("button", { name: "Product launch", exact: true }).click();
  await expect(page.locator('textarea[name="prompt"]')).toHaveValue(
    /Assess the launch/,
  );
  await page.getByRole("button", { name: "Convene board", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Dissent & alternatives" }),
  ).toBeVisible({ timeout: 60000 });
  await expect(page.locator(".st-report-grid").first().locator(".st-card")).toHaveCount(
    9,
  );
  await page.goto("/studio");
  await page.screenshot({
    path: "test-results/studio-light.png",
    fullPage: true,
    animations: "disabled",
    timeout: 15000,
  });
  await page.getByLabel("Appearance", { exact: true }).selectOption("dark");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.screenshot({
    path: "test-results/studio-dark.png",
    fullPage: true,
    animations: "disabled",
    timeout: 15000,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("link", { name: "Execution", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Execution", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/studio-mobile.png",
    fullPage: true,
    animations: "disabled",
    timeout: 15000,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.context().setOffline(true);
  await expect(page.getByText("Offline · reading mode")).toBeVisible();
  await page.getByLabel("Task title").fill("Blocked offline action");
  await page.getByRole("button", { name: "Save task", exact: true }).click();
  await expect(page.getByRole("alert").first()).toContainText(
    "Reconnect to make changes",
  );
  await page.context().setOffline(false);
  expect(errors).toEqual([]);
});

test("marketing remains readable with reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "light" });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Create your workspace", exact: true }).first(),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
});
