import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
page.on("pageerror", (err) => errors.push(String(err)));

// 1. Top nav bar + scroll-to-top behavior
await page.goto("http://localhost:8080/index.html#/javascript/arrays/what-is-an-array", { waitUntil: "networkidle" });
await page.waitForTimeout(700);

const topButtons = await page.getByRole("button", { name: "Next" }).count();
console.log("Number of 'Next' buttons found (expect 2: top + bottom):", topButtons);

// Scroll down to the bottom, then click the BOTTOM Next button, and check scroll position resets
await page.evaluate(() => {
  const scroller = document.querySelector(".sapMPageEnableScrolling.sapUiScrollDelegate");
  if (scroller) scroller.scrollTop = 500;
});
await page.waitForTimeout(200);
const scrollBefore = await page.evaluate(() => {
  const scroller = document.querySelector(".sapMPageEnableScrolling.sapUiScrollDelegate");
  return scroller ? scroller.scrollTop : null;
});
console.log("Scroll position before clicking Next (should be ~500):", scrollBefore);

const nextButtons = page.getByRole("button", { name: "Next" });
await nextButtons.last().click();
await page.waitForTimeout(600);
const scrollAfter = await page.evaluate(() => {
  const scroller = document.querySelector(".sapMPageEnableScrolling.sapUiScrollDelegate");
  return scroller ? scroller.scrollTop : null;
});
console.log("Scroll position after clicking Next (expect 0):", scrollAfter);
console.log("URL after Next:", page.url());

// 2. Not Found page -- bad question id
await page.goto("http://localhost:8080/index.html#/javascript/arrays/not-a-real-id", { waitUntil: "networkidle" });
await page.waitForTimeout(700);
const notFoundVisible = await page.getByText("Page not found").isVisible().catch(() => false);
console.log("Not Found page shown for bad question id:", notFoundVisible);
const crumbsOnNotFound = await page.locator(".sapMBreadcrumbsCurrentLocation, .sapMBreadcrumbs .sapMLnk").allTextContents();
console.log("Breadcrumb/title area on Not Found page:", crumbsOnNotFound);

// 3. Not Found for malformed hash (too many segments -> bypassed)
await page.goto("http://localhost:8080/index.html#/javascript/arrays/some-id/extra/segments", { waitUntil: "networkidle" });
await page.waitForTimeout(700);
const notFoundVisible2 = await page.getByText("Page not found").isVisible().catch(() => false);
console.log("Not Found page shown for malformed hash (too many segments):", notFoundVisible2);

// 4. Not Found for bad subject id
await page.goto("http://localhost:8080/index.html#/not-a-real-subject", { waitUntil: "networkidle" });
await page.waitForTimeout(700);
const notFoundVisible3 = await page.getByText("Page not found").isVisible().catch(() => false);
console.log("Not Found page shown for bad subject id:", notFoundVisible3);

// 5. "Back to topics overview" button works
await page.getByRole("button", { name: "Back to topics overview" }).click();
await page.waitForTimeout(700);
console.log("URL after clicking Back to topics overview:", page.url());

await page.screenshot({ path: "update-notfound.png", fullPage: true });

console.log("\nConsole errors:", errors);
await browser.close();
