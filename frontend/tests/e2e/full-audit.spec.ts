import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

const api = "http://127.0.0.1:8012";
const fixturePassword = "Correct-Horse-Browser-2026!";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[autocomplete="current-password"]').fill(fixturePassword);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL(/\/studio$/);
}

async function call(page: Page, path: string, method = "GET", body?: unknown) {
  return page.evaluate(
    async ({ api, path, method, body }) => {
      const response = await fetch(api + path, {
        method,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + sessionStorage.getItem("ceoai-auth-token"),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return { status: response.status, value: await response.json() };
    },
    { api, path, method, body },
  );
}

test("extended real studio operations, exports, roles and workspace isolation", async ({
  page,
  browser,
}) => {
  test.setTimeout(360000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await login(page, "owner.fixture@example.com");
  const name = "Northstar · Full audit fixture";
  await page.getByLabel("Company name", { exact: true }).fill(name);
  await page
    .getByLabel("Business goal & context")
    .fill(
      "Validate invoice reconciliation using customer interviews and a reviewable pilot.",
    );
  await page.getByRole("button", { name: "Create workspace", exact: true }).click();
  await expect(page.getByLabel("Choose workspace")).toHaveValue(/.+/);
  const workspace = await page.getByLabel("Choose workspace").inputValue();

  await test.step("reusable briefs, debates, actual board trace and typed voice captions", async () => {
    await page.goto("/studio/boardroom");
    await page.getByText("Save your own brief", { exact: true }).click();
    await page.getByLabel("Brief name").fill("Interview gate");
    await page
      .getByLabel("Reusable question")
      .fill(
        "Compare five interviews against immediately implementing invoice integrations.",
      );
    await page.getByRole("button", { name: "Save brief", exact: true }).click();
    await page.getByRole("button", { name: "Interview gate", exact: true }).click();
    await expect(page.locator('textarea[name="prompt"]')).toHaveValue(
      /Compare five interviews/,
    );
    await page.getByRole("button", { name: "Convene board", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Dissent & alternatives" }),
    ).toBeVisible({ timeout: 60000 });
    await expect(
      page.locator(".st-report-grid").first().locator(".st-card"),
    ).toHaveCount(9);
    await expect(page.getByRole("heading", { name: "Execution trace" })).toBeVisible();
    await page
      .getByLabel("Follow-up question")
      .fill("Which validation expense should we postpone?");
    await page.getByLabel("First perspective").selectOption("cfo");
    await page.getByLabel("Challenge with").selectOption("product");
    await page.getByRole("button", { name: "Discuss with specialists" }).click();
    await expect(
      page.locator("details").filter({ hasText: "Which validation expense" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Open voice", exact: true }).click();
    await expect(page.getByLabel("Voice boardroom message")).toBeVisible();
    await page.getByRole("button", { name: "Spoken", exact: true }).click();
    await page
      .getByLabel("Voice boardroom message")
      .fill("What is our next evidence gathering action?");
    await page.getByRole("button", { name: "Send message", exact: true }).click();
    await expect(page.locator(".voice-stage")).toContainText("Ready", {
      timeout: 60000,
    });
    await expect(page.locator(".voice-stage")).not.toContainText(
      "Ask the board anything",
    );
    const runs = await call(page, "/api/jobs");
    expect(
      runs.value.filter(
        (run: { status: string; session_id: string }) =>
          run.status === "done" && run.session_id === workspace,
      ),
    ).toHaveLength(2);
    await page.getByRole("button", { name: "Close voice", exact: true }).click();
  });

  await test.step("metric revisions and task dependency failure/recovery", async () => {
    await page.goto("/studio/goals");
    await page.getByLabel("Title", { exact: true }).fill("Buyer interviews");
    await page.getByLabel("Objective", { exact: true }).fill("Validate demand");
    await page.getByLabel("Current value").fill("2");
    await page.getByLabel("Target", { exact: true }).fill("5");
    await page.getByRole("button", { name: "Save metric", exact: true }).click();
    const metric = page
      .locator("article.st-card")
      .filter({
        has: page.getByRole("heading", { name: "Buyer interviews", exact: true }),
      });
    await metric.getByRole("button", { name: "Edit", exact: true }).click();
    await page.getByLabel("Current value").fill("5");
    await page.getByRole("button", { name: "Save metric", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Historical scorecard" }),
    ).toBeVisible();
    const records = await call(page, `/api/studio/${workspace}/records`);
    expect(
      records.value.some(
        (r: { kind: string; data: { value: number } }) =>
          r.kind === "metric_observation" && r.data.value === 2,
      ),
    ).toBe(true);

    await page.goto("/studio/execution");
    await page.getByLabel("Task title").fill("Complete buyer interviews");
    await page.getByRole("button", { name: "Save task", exact: true }).click();
    const tasks = await call(page, `/api/studio/${workspace}/tasks`);
    const prerequisite = tasks.value.find(
      (task: { title: string }) => task.title === "Complete buyer interviews",
    );
    await page.getByLabel("Task title").fill("Design the pilot");
    await page
      .getByLabel("Dependencies (select multiple)")
      .selectOption(prerequisite.id);
    await page.getByLabel("Status", { exact: true }).selectOption("Done");
    await page.getByRole("button", { name: "Save task", exact: true }).click();
    await expect(page.getByRole("alert").first()).toContainText(/dependenc/i);
    await page.getByLabel("Status", { exact: true }).selectOption("Ready");
    await page.getByRole("button", { name: "Save task", exact: true }).click();
    await page
      .locator("article.st-task")
      .filter({ hasText: "Complete buyer interviews" })
      .getByRole("button", { name: "Edit task" })
      .click();
    await page.getByLabel("Status", { exact: true }).selectOption("Done");
    await page.getByRole("button", { name: "Save task", exact: true }).click();
    await page
      .locator("article.st-task")
      .filter({ hasText: "Design the pilot" })
      .getByRole("button", { name: "Edit task" })
      .click();
    await page.getByLabel("Status", { exact: true }).selectOption("Done");
    await page.getByRole("button", { name: "Save task", exact: true }).click();
    await expect(
      page
        .locator(".st-kanban-column")
        .filter({ has: page.getByRole("heading", { name: "Done", exact: true }) }),
    ).toContainText("Design the pilot");
  });

  await test.step("research failure is visible, real source metadata and routing persist", async () => {
    await page.goto("/studio/knowledge");
    await page
      .getByLabel("External research (configured Tavily provider)")
      .fill("Invoice reconciliation for agencies");
    await page.getByRole("button", { name: "Research sources" }).click();
    await expect(page.getByRole("alert").first()).toContainText(
      "Research search is unavailable",
    );
    await page.getByLabel("Source title").fill("Evidence fixture source");
    await page.getByLabel("Original URL").fill("https://example.com/evidence");
    await page
      .getByLabel("What the source establishes")
      .fill("Illustrative metadata used to verify persistence; not market evidence.");
    await page.getByRole("button", { name: "Save source" }).click();
    await expect(
      page.getByRole("heading", { name: "Evidence fixture source" }),
    ).toBeVisible();
    await page.goto("/studio/controls");
    await page.getByLabel("Preferred provider").selectOption("ollama");
    await page.getByLabel("Privacy", { exact: true }).selectOption("true");
    await page.getByLabel("Maximum tokens per model response").fill("700");
    await page.getByRole("button", { name: "Save agent controls" }).click();
    await page.reload();
    await expect(page.getByLabel("Maximum tokens per model response")).toHaveValue(
      "700",
    );
  });

  await test.step("exports decode, public sharing revokes, account schedule persists", async () => {
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/studio/reports");
    await page.getByRole("button", { name: "Run review", exact: true }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Review generated" }),
    ).toBeVisible();
    const report = page.locator("article.st-card").first();
    const pdfWait = page.waitForEvent("download");
    await report.getByRole("button", { name: "PDF", exact: true }).click();
    const pdf = await pdfWait;
    const pdfPath = await pdf.path();
    expect((await readFile(pdfPath!)).subarray(0, 5).toString()).toBe("%PDF-");
    const markdownWait = page.waitForEvent("download");
    await report.getByRole("button", { name: "Markdown", exact: true }).click();
    expect((await readFile((await (await markdownWait).path())!)).toString()).toContain(
      "#",
    );
    const shareWait = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url().includes("/api/share/reports/"),
    );
    await report.getByRole("button", { name: "Share", exact: true }).click();
    const shared = await (await shareWait).json();
    const sharing = page.getByRole("dialog", { name: "Share report", exact: true });
    await expect(sharing.getByLabel("Public report link")).toHaveValue(shared.url);
    await sharing.getByRole("button", { name: "Close", exact: true }).click();
    expect(shared.url).toMatch(/^http:\/\/localhost:3012\/r\//);
    const publicView = await page.context().newPage();
    await publicView.goto(shared.url);
    await expect(publicView.getByRole("heading", { level: 1 })).toBeVisible();
    expect(
      (await publicView.request.get(`${api}/api/share/${shared.slug}`)).status(),
    ).toBe(200);
    await report.getByRole("button", { name: "Revoke link", exact: true }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Public share link revoked" }),
    ).toBeVisible();
    expect(
      (await publicView.request.get(`${api}/api/share/${shared.slug}`)).status(),
    ).toBe(404);
    await publicView.close();
    await page.getByRole("button", { name: "Weekly", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Weekly", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Weekly", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  await test.step("workspace scoping and shared viewer/editor boundaries", async () => {
    await page.goto("/studio/team");
    for (const [email, role] of [
      ["viewer.fixture@example.com", "viewer"],
      ["editor.fixture@example.com", "editor"],
    ]) {
      await page.getByLabel("Colleague email").fill(email);
      await page.getByLabel("Access", { exact: true }).selectOption(role);
      await page.getByRole("button", { name: "Add member", exact: true }).click();
      await expect(
        page.locator(".st-compact-row").filter({ hasText: email }),
      ).toBeVisible();
    }
    await page.getByLabel("Topic", { exact: true }).fill("Inspect interview evidence");
    await page
      .getByLabel("Comment", { exact: true })
      .fill("@editor.fixture@example.com Please review this illustrative evidence.");
    await page.getByRole("button", { name: "Post comment", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Inspect interview evidence" }),
    ).toBeVisible();

    const viewerContext = await browser.newContext();
    const viewer = await viewerContext.newPage();
    await login(viewer, "viewer.fixture@example.com");
    await viewer.getByLabel("Choose workspace").selectOption(workspace);
    await viewer.goto("/studio/forecasts");
    await expect(
      viewer.getByRole("button", { name: "Right", exact: true }).first(),
    ).toBeDisabled();
    const forecasts = await call(viewer, `/api/predictions?session_id=${workspace}`);
    expect(forecasts.value.predictions.length).toBeGreaterThan(0);
    expect(
      (
        await call(
          viewer,
          `/api/predictions/${forecasts.value.predictions[0].id}`,
          "PATCH",
          { status: "hit" },
        )
      ).status,
    ).toBe(403);
    await viewerContext.close();

    await page.getByRole("button", { name: "New workspace" }).click();
    await page
      .getByLabel("Company name", { exact: true })
      .fill("Southstar · Empty fixture");
    await page
      .getByLabel("Business goal & context")
      .fill("A separate company with no board runs.");
    await page.getByRole("button", { name: "Create workspace", exact: true }).click();
    const second = await page.getByLabel("Choose workspace").inputValue();
    expect(second).not.toBe(workspace);
    await page.goto("/studio/forecasts");
    await expect(page.getByText("No open predictions", { exact: true })).toBeVisible();
    await page.goto("/studio/analytics");
    const analytics = await call(page, `/api/analytics/overview?session_id=${second}`);
    expect(analytics.value.totals.reports).toBe(0);
    await page.getByLabel("Choose workspace").selectOption(workspace);
    await page.goto("/studio/forecasts");
    await expect(
      page.getByRole("button", { name: "Right", exact: true }).first(),
    ).toBeEnabled();
    await page.getByRole("button", { name: "Right", exact: true }).first().click();
    await expect(page.getByText("100% overall", { exact: true })).toBeVisible();
  });
  expect(errors).toEqual([]);
});

test("glass, comfort preferences, mobile drawer and service error recovery", async ({
  page,
}) => {
  await page.goto("/signup");
  await page.locator('input[autocomplete="name"]').fill("Visual audit founder");
  await page.locator('input[type="email"]').fill(`visual-${Date.now()}@example.com`);
  await page.locator('input[autocomplete="new-password"]').fill(fixturePassword);
  await page.getByRole("button", { name: "Create free account", exact: true }).click();
  await expect(page).toHaveURL(/\/studio$/);
  await page
    .getByLabel("Company name", { exact: true })
    .fill("Glass audit · Illustrative");
  await page
    .getByLabel("Business goal & context")
    .fill("A visual and keyboard acceptance fixture.");
  await page.getByRole("button", { name: "Create workspace", exact: true }).click();
  await expect(page.locator(".st-hero")).toBeVisible();
  await expect
    .poll(() =>
      page.locator(".st-topbar").evaluate((el) => getComputedStyle(el).backdropFilter),
    )
    .toContain("blur");
  await page.getByRole("button", { name: "Visual comfort", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Visual comfort", exact: true });
  await dialog.getByRole("checkbox", { name: /Reduce transparency/ }).check();
  await dialog.getByRole("checkbox", { name: /Reduce motion/ }).check();
  await dialog.getByRole("checkbox", { name: /Increase contrast/ }).check();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Visual comfort", exact: true }),
  ).toBeFocused();
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/reduce-transparency/);
  expect(
    await page
      .locator(".st-topbar")
      .evaluate((el) => getComputedStyle(el).backdropFilter),
  ).toBe("none");
  await page.getByRole("button", { name: "Visual comfort", exact: true }).click();
  await dialog.getByRole("checkbox", { name: /Reduce transparency/ }).uncheck();
  await dialog.getByRole("checkbox", { name: /Reduce motion/ }).uncheck();
  await dialog.getByRole("checkbox", { name: /Increase contrast/ }).uncheck();
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await page.setViewportSize({ width: 320, height: 740 });
  await page.getByRole("button", { name: "Open navigation" }).click();
  const navigation = page.getByRole("dialog", { name: "Studio navigation" });
  await expect(navigation).toBeVisible();
  expect(
    await page.locator(".st-main").evaluate((el) => (el as HTMLElement).inert),
  ).toBe(true);
  await navigation.getByRole("button", { name: "Sign out" }).focus();
  await page.keyboard.press("Tab");
  await expect(navigation.getByRole("link").first()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Open navigation" })).toBeFocused();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.route("**/api/analytics/overview**", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ detail: "Isolated service interruption" }),
    }),
  );
  await page.goto("/studio/analytics");
  await expect(
    page.getByRole("alert").filter({ hasText: "Isolated service interruption" }),
  ).toBeVisible();
  await page.unroute("**/api/analytics/overview**");
  await page.getByRole("button", { name: "Retry analytics" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Isolated service interruption" }),
  ).toHaveCount(0);
});

test("password changes end the revoked browser session and permit a new sign-in", async ({
  page,
}) => {
  const email = `password-${Date.now()}@example.com`;
  await page.goto("/signup");
  await page.locator('input[autocomplete="name"]').fill("Password fixture");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[autocomplete="new-password"]').fill(fixturePassword);
  await page.getByRole("button", { name: "Create free account", exact: true }).click();
  await expect(page).toHaveURL(/\/studio$/);
  await page.goto("/settings");
  await page.getByLabel("Current password", { exact: true }).fill(fixturePassword);
  await page
    .getByLabel("New password", { exact: true })
    .fill("Changed-Horse-Browser-2026!");
  await page.getByRole("button", { name: "Change password", exact: true }).click();
  await expect(page).toHaveURL(/\/login\?password=changed$/);
  await expect(page.getByRole("status")).toContainText(
    "previous sessions have been revoked",
  );
  expect(
    await page.evaluate(() => sessionStorage.getItem("ceoai-auth-token")),
  ).toBeNull();
  await page.locator('input[type="email"]').fill(email);
  await page
    .locator('input[autocomplete="current-password"]')
    .fill("Changed-Horse-Browser-2026!");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL(/\/studio$/);
});
