import { test, expect } from "@playwright/test";

test("decision relationships persist, reject cycles and inspect downstream impact", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/signup");
  await page.locator('input[autocomplete="name"]').fill("Graph acceptance");
  await page.locator('input[type="email"]').fill(`graph-${Date.now()}@example.com`);
  await page
    .locator('input[autocomplete="new-password"]')
    .fill("Correct-Horse-Board-2026!");
  await page.getByRole("button", { name: "Create free account", exact: true }).click();
  await expect(page).toHaveURL(/\/studio$/);
  await page
    .getByLabel("Company name", { exact: true })
    .fill("Graph fixture · illustrative");
  await page
    .getByLabel("Business goal & context")
    .fill("Validate relationships using a labelled test workspace.");
  await page.getByRole("button", { name: "Create workspace", exact: true }).click();
  await expect(page.getByLabel("Choose workspace")).toContainText("Graph fixture");
  await page.goto("/studio/decisions");
  const graph = page
    .locator("section")
    .filter({
      has: page.getByRole("heading", { name: "Decision dependency map", exact: true }),
    })
    .last();
  for (const title of ["Demand assumption", "Retention assumption"]) {
    await graph.getByLabel("New assumption").fill(title);
    await graph.getByRole("button", { name: "Add assumption", exact: true }).click();
    await expect(
      graph.getByRole("button", { name: title + " · assumption", exact: true }),
    ).toBeVisible();
  }
  await graph
    .getByLabel("Prerequisite/source")
    .selectOption({ label: "Demand assumption · assumption" });
  await graph
    .getByLabel("Dependent/target")
    .selectOption({ label: "Retention assumption · assumption" });
  await graph.getByRole("button", { name: "Link records", exact: true }).click();
  await expect(graph.getByRole("list", { name: "Saved relationships" })).toContainText(
    "Demand assumption → Retention assumption",
  );
  await graph
    .getByRole("button", { name: "Demand assumption · assumption", exact: true })
    .click();
  await expect(graph).toContainText("1 downstream records");
  const visualNode = graph.getByRole("button", { name: "Inspect Retention assumption", exact: true });
  await visualNode.focus();
  await visualNode.press("Enter");
  await expect(visualNode).toHaveAttribute("aria-pressed", "true");
  await graph
    .getByLabel("Prerequisite/source")
    .selectOption({ label: "Retention assumption · assumption" });
  await graph
    .getByLabel("Dependent/target")
    .selectOption({ label: "Demand assumption · assumption" });
  await graph.getByRole("button", { name: "Link records", exact: true }).click();
  await expect(graph.getByRole("alert")).toContainText("cycle");
  await page.reload();
  await expect(graph.getByRole("list", { name: "Saved relationships" })).toContainText(
    "Demand assumption → Retention assumption",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await graph.getByRole("button", { name: "Unlink relationship", exact: true }).click();
  await expect(
    graph.getByRole("list", { name: "Saved relationships" }).getByRole("listitem"),
  ).toHaveCount(0);
  await page.setViewportSize({ width: 1280, height: 900 });
  const premortem = page
    .locator("section")
    .filter({
      has: page.getByRole("heading", { name: "Pre-mortem simulator", exact: true }),
    })
    .last();
  await premortem.getByLabel("Pre-mortem title").fill("Demand risk analysis");
  await premortem
    .getByLabel("Proposed strategy")
    .fill("Validate the offer before funding a launch.");
  await premortem
    .getByLabel("Failure path", { exact: true })
    .fill("Customers do not adopt");
  await premortem.getByLabel("Early warning").fill("No trial conversions");
  await premortem
    .getByLabel("Mitigation", { exact: true })
    .fill("Interview ten buyers");
  await premortem.getByRole("button", { name: "Save pre-mortem", exact: true }).click();
  await expect(premortem.getByRole("status")).toContainText("saved");
  await premortem
    .getByRole("button", { name: "Review mitigation task", exact: true })
    .click();
  await premortem
    .getByRole("button", { name: "Cancel task creation", exact: true })
    .click();
  await expect(
    premortem.getByRole("button", { name: "Review mitigation task", exact: true }),
  ).toBeVisible();
  await premortem
    .getByRole("button", { name: "Review mitigation task", exact: true })
    .click();
  await premortem
    .getByRole("button", { name: "Confirm create mitigation task", exact: true })
    .click();
  await expect(premortem.getByRole("status")).toContainText("task created");
  await page.reload();
  await expect(premortem).toContainText("Linked task");
  await page.screenshot({
    path: "../docs/screenshots/advanced-features-2026-10-12/decision-graph-premortem.png",
    fullPage: true,
  });
  await page.goto("/studio/execution");
  await expect(page.locator("body")).toContainText("Interview ten buyers");
  expect(errors).toEqual([]);
});
