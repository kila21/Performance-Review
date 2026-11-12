import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.goto("http://localhost:8080/index.html#/javascript/arrays/what-is-an-array", { waitUntil: "networkidle" });
await page.waitForTimeout(700);

await page.evaluate(() => {
  document.querySelector(".sapMPageEnableScrolling.sapUiScrollDelegate").scrollTop = 250;
});
await page.waitForTimeout(200);

const buttons = page.getByRole("button", { name: "Next" });
await buttons.last().click();

// Sample scrollTop at several points in time after the click
for (const delay of [0, 50, 100, 200, 400, 800]) {
  await page.waitForTimeout(delay === 0 ? 0 : 50);
  const info = await page.evaluate(() => ({
    scrollTop: document.querySelector(".sapMPageEnableScrolling.sapUiScrollDelegate").scrollTop,
    activeTag: document.activeElement.tagName,
    activeText: document.activeElement.textContent?.slice(0, 40),
    activeClass: document.activeElement.className
  }));
  console.log(`+${delay}ms:`, JSON.stringify(info));
}
await browser.close();
