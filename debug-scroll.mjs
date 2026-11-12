import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("console", (msg) => console.log("[browser]", msg.type(), msg.text()));

await page.goto("http://localhost:8080/index.html#/javascript/arrays/what-is-an-array", { waitUntil: "networkidle" });
await page.waitForTimeout(700);

await page.evaluate(() => {
  const scroller = document.querySelector(".sapMPageEnableScrolling.sapUiScrollDelegate");
  scroller.scrollTop = 250;
});
await page.waitForTimeout(200);

const result = await page.evaluate(() => {
  const control = sap.ui.getCore().byId("app--shellBody");
  if (!control) return "shellBody control not found by id app--shellBody";
  control.scrollTo(0, 0);
  const scroller = document.querySelector(".sapMPageEnableScrolling.sapUiScrollDelegate");
  return { foundControl: true, scrollTopAfterManualCall: scroller.scrollTop };
});
console.log("Manual scrollTo(0,0) result:", JSON.stringify(result));
await browser.close();
