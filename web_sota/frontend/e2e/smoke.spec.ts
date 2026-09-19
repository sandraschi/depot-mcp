import { expect, test } from "@playwright/test";

// Requires: backend :10727 + frontend :10726 running (just serve).
test("dashboard loads with hero and KPIs", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("dashboard")).toBeVisible();
  await expect(page.getByTestId("kpi-total-files")).toBeVisible();
  await expect(page.getByTestId("backend-dot")).toBeVisible();
});

test("sidebar nav reaches chat with testids", async ({ page }) => {
  await page.goto("/");
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
  ] as const) {
    await page.goto("/");
    await page.getByTestId(nav).click();
    await expect(page.getByTestId(mark)).toBeVisible();
  }
});
