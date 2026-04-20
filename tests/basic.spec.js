const { test, expect } = require("@playwright/test");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

test("游戏首页能正常加载核心界面", async ({ page }) => {
  const fileUrl = pathToFileURL(path.join(__dirname, "..", "index.html")).href;

  await page.goto(fileUrl);

  await expect(page).toHaveTitle("坦克大战：钢铁防线");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("坦克大战：钢铁防线");
  await expect(page.getByRole("button", { name: "重新开始" })).toBeVisible();
  await expect(page.locator("#gameCanvas")).toBeVisible();
  await expect(page.locator("#minimapCanvas")).toBeVisible();
  await expect(page.locator("#healthValue")).toHaveText("3 / 3");
  await expect(page.locator("#healthBar")).toBeVisible();
  await expect(page.locator("#baseBar")).toBeVisible();
  await expect(page.locator("#waveValue")).toHaveText("1");
  await expect(page.locator("#statusValue")).toContainText("大地图追击中");
  const worldInfo = await page.evaluate(() => window.__tankBattle);
  expect(worldInfo.WORLD_WIDTH).toBeGreaterThan(worldInfo.VIEWPORT_WIDTH);
  expect(worldInfo.WORLD_HEIGHT).toBeGreaterThan(worldInfo.VIEWPORT_HEIGHT);
});
