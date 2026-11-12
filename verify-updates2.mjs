import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
page.on("pageerror", (err) => errors.push(String(err)));

await page.goto("http://localhost:8080/index.html#/javascript/arrays/what-is-an-array", { waitUntil: "networkidle" });
await page.waitForTimeout(700);

await page.evaluate(() => {
  const scroller = document.querySelector(".sapMPageEnableScrolling.sapUiScrollDelegate");
  scroller.scrollTop = 1000;
});
await page.waitForTimeout(200);
const before = await page.evaluate(() => document.querySelector(".sapMPageEnableScrolling.sapUiScrollDelegate").scrollTop);
console.log("scrollTop before click:", before);

await page.getByRole("button", { name: "Next" }).last().click();
await page.waitForTimeout(800);
const after = await page.evaluate(() => document.querySelector(".sapMPageEnableScrolling.sapUiScrollDelegate").scrollTop);
console.log("scrollTop right after click+wait:", after);

await page.waitForTimeout(1000);
const afterMore = await page.evaluate(() => document.querySelector(".sapMPageEnableScrolling.sapUiScrollDelegate").scrollTop);
console.log("scrollTop after an extra second:", afterMore);

console.log("errors:", errors);
await browser.close();
