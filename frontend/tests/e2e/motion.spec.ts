import { test, expect } from "@playwright/test";

test("route motion renders then settles and system reduced motion stays immediate", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const records: { start: number; end?: number; duration: number }[] = [];
    (window as Window & { routeMotion?: typeof records }).routeMotion = records;
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (...args) {
      const animation = animate.apply(this, args);
      if (this.matches(".material-hero, main, .st-content")) {
        const entry = {
          start: Number(getComputedStyle(this).opacity),
          duration: Number(animation.effect?.getComputedTiming().duration),
        };
        records.push(entry);
        animation.addEventListener(
          "finish",
          () => {
            Object.assign(entry, { end: Number(getComputedStyle(this).opacity) });
          },
          { once: true },
        );
      }
      return animation;
    };
  });
  await page.goto("/");
  await expect
    .poll(() =>
      page.evaluate(() =>
        (
          window as Window & {
            routeMotion: { start: number; end?: number; duration: number }[];
          }
        ).routeMotion.some(
          (item) =>
            item.start < 1 &&
            item.end === 1 &&
            item.duration > 0 &&
            item.duration <= 320,
        ),
      ),
    )
    .toBe(true);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/login");
  expect(
    await page.evaluate(
      () => (window as Window & { routeMotion: unknown[] }).routeMotion.length,
    ),
  ).toBe(0);
  await expect(page.getByRole("button", { name: "Log in", exact: true })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
});
