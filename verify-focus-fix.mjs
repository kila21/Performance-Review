import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });

await page.goto("http://localhost:8080/index.html#/javascript/arrays/what-is-an-array", { waitUntil: "networkidle" });
await page.waitForTimeout(700);

await page.evaluate(() => {
  document.querySelector(".sapMPageEnableScrolling.sapUiScrollDelegate").scrollTop = 250;
});
await page.waitForTimeout(200);
const before = await page.evaluate(() => document.querySelector(".sapMPageEnableScrolling.sapUiScrollDelegate").scrollTop);

await page.getByRole("button", { name: "Next" }).last().click();
await page.waitForTimeout(500);
const after = await page.evaluate(() => document.querySelector(".sapMPageEnableScrolling.sapUiScrollDelegate").scrollTop);
const activeInfo = await page.evaluate(() => ({
  tag: document.activeElement.tagName,
  text: document.activeElement.textContent?.slice(0, 50)
}));

console.log(`Before: ${before}, After clicking Next: ${after}`);
console.log("Active element after click:", JSON.stringify(activeInfo));
console.log("URL:", page.url());

// Do it again with Previous from the top bar too
await page.evaluate(() => {
  document.querySelector(".sapMPageEnableScrolling.sapUiScrollDelegate").scrollTop = 250;
});
await page.waitForTimeout(200);
await page.getByRole("button", { name: "Previous" }).first().click();
await page.waitForTimeout(500);
const after2 = await page.evaluate(() => document.querySelector(".sapMPageEnableScrolling.sapUiScrollDelegate").scrollTop);
console.log("After clicking top Previous:", after2);

console.log("errors:", errors);
await browser.close();
