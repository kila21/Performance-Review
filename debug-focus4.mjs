import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("console", (msg) => console.log("[browser]", msg.text()));

await page.goto("http://localhost:8080/index.html#/javascript/arrays/what-is-an-array", { waitUntil: "networkidle" });
await page.waitForTimeout(700);

await page.evaluate(() => {
  document.querySelector(".sapMPageEnableScrolling.sapUiScrollDelegate").scrollTop = 250;
  const orig = HTMLElement.prototype.focus;
  HTMLElement.prototype.focus = function(...args) {
    console.log("FOCUS CALLED on", this.tagName, this.id);
    return orig.apply(this, args);
  };
});

await page.getByRole("button", { name: "Next" }).last().click();
await page.waitForTimeout(700);
await browser.close();
