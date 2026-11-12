import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("console", (msg) => console.log("[browser]", msg.text()));

await page.goto("http://localhost:8080/index.html#/javascript/arrays/what-is-an-array", { waitUntil: "networkidle" });
await page.waitForTimeout(700);

// Monkey-patch the event bus to log all publish calls
await page.evaluate(() => {
  const components = sap.ui.core.Component.registry.all();
  const comp = Object.values(components)[0];
  const bus = comp.getEventBus();
  const origPublish = bus.publish.bind(bus);
  window.__publishLog = [];
  bus.publish = function (channel, event, data) {
    window.__publishLog.push(channel + "/" + event);
    console.log("PUBLISH CALLED:", channel, event);
    return origPublish(channel, event, data);
  };
});

await page.evaluate(() => {
  document.querySelector(".sapMPageEnableScrolling.sapUiScrollDelegate").scrollTop = 250;
});
await page.waitForTimeout(200);

await page.getByRole("button", { name: "Next" }).last().click();
await page.waitForTimeout(800);

const log = await page.evaluate(() => window.__publishLog);
console.log("Publish log:", JSON.stringify(log));
const scrollTop = await page.evaluate(() => document.querySelector(".sapMPageEnableScrolling.sapUiScrollDelegate").scrollTop);
console.log("Final scrollTop:", scrollTop);

await browser.close();
