import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.goto("http://localhost:8080/index.html#/javascript/arrays/what-is-an-array", { waitUntil: "networkidle" });
await page.waitForTimeout(700);

await page.evaluate(() => {
  const scroller = document.querySelector(".sapMPageEnableScrolling.sapUiScrollDelegate");
  scroller.scrollTop = 250;
});
await page.waitForTimeout(200);

const result = await page.evaluate(() => {
  const components = sap.ui.core.Component.registry.all();
  const comp = Object.values(components)[0];
  if (!comp) return "no component found";
  const shellBody = comp.getRootControl().byId("shellBody");
  const before = document.querySelector(".sapMPageEnableScrolling.sapUiScrollDelegate").scrollTop;
  comp.getEventBus().publish("app", "scrollToTop");
  const afterPublish = document.querySelector(".sapMPageEnableScrolling.sapUiScrollDelegate").scrollTop;
  let afterDirectCall = null;
  if (shellBody && shellBody.scrollTo) {
    shellBody.scrollTo(0, 0);
    afterDirectCall = document.querySelector(".sapMPageEnableScrolling.sapUiScrollDelegate").scrollTop;
  }
  return {
    foundShellBody: !!shellBody,
    shellBodyId: shellBody ? shellBody.getId() : null,
    before,
    afterPublish,
    afterDirectCall
  };
});
console.log(JSON.stringify(result, null, 2));
await browser.close();
