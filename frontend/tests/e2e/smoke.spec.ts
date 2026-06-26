import { expect, test } from "@playwright/test";

test("home page renders core navigation", async ({ page }) => {
  await page.goto("/");

  const header = page.getByRole("banner");
  const nav = header.getByRole("navigation");

  await expect(page).toHaveTitle(/AI Wiki/);
  await expect(header.getByRole("link", { name: "AI Wiki" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "页面", exact: true })).toBeVisible();
  await expect(nav.getByRole("link", { name: "搜索", exact: true })).toBeVisible();
  await expect(nav.getByRole("link", { name: "AI 问答", exact: true })).toBeVisible();
  await expect(nav.getByRole("link", { name: "知识编译", exact: true })).toBeVisible();
});

test("language switcher changes visible navigation labels", async ({ page }) => {
  await page.goto("/");

  const header = page.getByRole("banner");
  const nav = header.getByRole("navigation");

  await header.getByRole("button", { name: "Switch language" }).first().hover();
  await page.getByRole("button", { name: "English" }).first().click();

  await expect(nav.getByRole("link", { name: "Pages", exact: true })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Search", exact: true })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Ask AI", exact: true })).toBeVisible();
});

test("compile page enables submit after content is entered", async ({ page }) => {
  await page.goto("/compile");

  const button = page.getByRole("button", { name: "编译知识" });
  await expect(button).toBeDisabled();

  await page
    .getByRole("textbox", { name: "内容" })
    .fill("AI Wiki uses FastAPI, Next.js, PostgreSQL, and Playwright for local verification.");

  await expect(button).toBeEnabled();
});
