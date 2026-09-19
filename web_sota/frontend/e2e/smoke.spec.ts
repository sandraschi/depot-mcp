import { expect, test } from "@playwright/test";

// Requires: backend :10727 + frontend :10726 running (just serve).
// The SPA lives under /app (vite base + router basename).
test("dashboard loads with hero and KPIs", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByTestId("dashboard")).toBeVisible();
  await expect(page.getByTestId("kpi-total-files")).toBeVisible();
  await expect(page.getByTestId("backend-dot")).toBeVisible();
});

test("sidebar nav reaches chat with testids", async ({ page }) => {
  await page.goto("./");
  await page.getByTestId("nav-chat").click();
  await expect(page.getByTestId("chat-page")).toBeVisible();
  await expect(page.getByTestId("chat-input")).toBeVisible();
  await expect(page.getByTestId("personality-select")).toBeVisible();
});

test("inbox, skills, logs pages render", async ({ page }) => {
  for (const [nav, mark] of [
    ["nav-inbox", "inbox-page"],
    ["nav-skills", "skills-page"],
    ["nav-logs", "logs-page"],
    ["nav-errors", "errors-page"],
  ] as const) {
    await page.goto("./");
    await page.getByTestId(nav).click();
    await expect(page.getByTestId(mark)).toBeVisible();
  }
});

test("file detail exposes migrate actions", async ({ page }) => {
  await page.goto("browse");
  const list = page.getByTestId("browse-list");
  const empty = page.getByTestId("browse-empty");
  await expect(list.or(empty)).toBeVisible({ timeout: 15000 });
  if ((await empty.count()) > 0) test.skip(true, "depot empty - upload a file first");
  await list.locator("a").first().click();
  await expect(page.getByTestId("file-detail-page")).toBeVisible();
  await expect(page.getByTestId("file-migrate-fast")).toBeVisible();
  await expect(page.getByTestId("file-migrate-slow")).toBeVisible();
});
