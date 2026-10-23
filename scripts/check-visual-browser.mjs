import assert from "node:assert/strict";
import {mkdir} from "node:fs/promises";
import puppeteer from "puppeteer-core";
import {join} from "node:path";
import {homedir} from "node:os";
import {computeExecutablePath} from "@puppeteer/browsers";
import {startStaticServer} from "./static-server.mjs";
const server=await startStaticServer("dist-visual-web");
const browser=await puppeteer.launch({executablePath:process.env.VISUAL_BROWSER_PATH||computeExecutablePath({browser:"chrome",buildId:"155.0.8059.84",cacheDir:process.platform==="win32"?join(process.env.LOCALAPPDATA,"vivliostyle","browsers"):join(homedir(),".cache","vivliostyle","browsers")}),headless:true});
await mkdir("docs/visual-review",{recursive:true});
try {
 const page=await browser.newPage();
 await page.setViewport({width:1100,height:1200});
 await page.goto(server.url,{waitUntil:"networkidle0"});
 await page.evaluate(()=>document.fonts.ready);
 assert.equal(await page.$$eval(".safety-message",x=>x.length),18);
 assert(await page.$$eval("img",els=>els.every(x=>x.complete&&x.naturalWidth>0)));
 await page.screenshot({path:"docs/visual-review/desktop.png"});
 await page.keyboard.press("Tab");
 assert(await page.evaluate(()=>document.activeElement.tagName==="A"));
 await page.setViewport({width:390,height:1000});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),"mobile overflow");
 await page.screenshot({path:"docs/visual-review/mobile.png"});
 await page.setViewport({width:1100,height:1200});
 await page.addStyleTag({content:"html{filter:grayscale(1)}"});
 await page.screenshot({path:"docs/visual-review/monochrome.png"});
 await page.$eval('[data-message-id="C-03"]',el=>el.scrollIntoView());
 await page.screenshot({path:"docs/visual-review/monochrome-caution-notice.png"});

 await page.goto(server.url+"gallery.html",{waitUntil:"networkidle0"});
 await page.evaluate(()=>document.fonts.ready);
 assert(await page.$$eval("img",els=>els.length===27&&els.every(x=>x.complete&&x.naturalWidth>0)));
 await page.screenshot({path:"docs/visual-review/figures.png",fullPage:true});
 assert.equal(server.failures.length,0,server.failures.join(","));
 console.log("PASS: desktop/mobile/grayscale, keyboard link, no mobile overflow, all 27 figures loaded");
} finally {await browser.close();await server.close();}
