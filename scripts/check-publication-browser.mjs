import assert from "node:assert/strict";
import {mkdir,readFile} from "node:fs/promises";
import puppeteer from "puppeteer-core";
import {computeExecutablePath} from "@puppeteer/browsers";
import {homedir} from "node:os";
import {join} from "node:path";
import {startStaticServer} from "./static-server.mjs";
import {publication,orderedFiles} from "../lib/publication.mjs";
const server=await startStaticServer("dist-v02-web");
const cacheDir=process.platform==="win32"?join(process.env.LOCALAPPDATA,"vivliostyle","browsers"):join(homedir(),".cache","vivliostyle","browsers");
const browser=await puppeteer.launch({executablePath:process.env.VISUAL_BROWSER_PATH||computeExecutablePath({browser:"chrome",buildId:"155.0.8059.84",cacheDir}),headless:true});
await mkdir("docs/publication-review",{recursive:true});
try{
 const page=await browser.newPage();
 await page.setViewport({width:1280,height:1000});
 for(const file of orderedFiles){
  await page.goto(server.url+file,{waitUntil:"networkidle0"});
  await page.evaluate(()=>document.fonts.ready);
  assert(await page.$$eval("img",images=>images.every(x=>x.complete&&x.naturalWidth>0)),file);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),"desktop overflow "+file);
 }
 await page.goto(server.url+"chapters/ch-02.html",{waitUntil:"networkidle0"});
 assert.equal(await page.$eval('.web-sidebar [aria-current="page"]',x=>x.textContent.trim()),publication.chapters[2].title);
 await page.keyboard.press("Tab");
 assert.equal(await page.evaluate(()=>document.activeElement.className),"web-skip");
 await page.keyboard.press("Enter");assert.equal(await page.evaluate(()=>document.activeElement.id),"reading-content");
 await page.$eval('[data-message-id="W-02"]',el=>el.scrollIntoView());
 await page.screenshot({path:"docs/publication-review/desktop-safety.png"});
 await page.setViewport({width:390,height:1000});
 await page.goto(server.url+"chapters/ch-05.html",{waitUntil:"networkidle0"});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.keyboard.press("Tab");await page.keyboard.press("Tab");await page.keyboard.press("Space");
 assert(await page.$eval(".web-mobile-toc",x=>x.open));
 await page.screenshot({path:"docs/publication-review/mobile-navigation.png"});
 await page.$eval(".web-mobile-toc",x=>x.open=false);
 await page.$eval("#ch-05-s5-5-2",x=>x.scrollIntoView());
 await page.screenshot({path:"docs/publication-review/mobile-table.png"});
 await page.goto(server.url+"chapters/app-c.html",{waitUntil:"networkidle0"});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.equal(await page.$$eval("table",x=>x.length),15);
 assert.equal(server.failures.length,0,server.failures.join(","));
 console.log("PASS: 19 documents and assets, desktop/mobile layout, active chapter, keyboard skip/toggle, full appendix C.");
}finally{await browser.close();await server.close();}
