import test from "node:test";
import assert from "node:assert/strict";
import {readFile,access,readdir,mkdir,writeFile,unlink} from "node:fs/promises";
import {posix,resolve,relative} from "node:path";
import {createHash} from "node:crypto";
import {spawnSync} from "node:child_process";
import {PDFDocument} from "pdf-lib";
import * as mupdf from "mupdf";
import {publication,orderedFiles,chapterMarkup} from "../lib/publication.mjs";
import {messages} from "../lib/safety-messages.mjs";
const prefix=process.env.PUBLICATION_OUTPUT_PREFIX||"dist-v02";
assert(/^dist(?:-[a-z0-9-]+)?$/.test(prefix));
const root=prefix+"-web";
const htmls=new Map(await Promise.all(orderedFiles.map(async f=>[f,await readFile(root+"/"+f,"utf8")])));
const ids=html=>new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(x=>x[1]));
test("one manifest drives 18 source documents, headings and ordered PDF entries",async()=>{
 assert.equal(publication.chapters.length,18);assert.equal(htmls.size,19);
 const marker=JSON.parse(await readFile(root+"/publication-build.json","utf8"));assert.deepEqual(marker.files,orderedFiles);
 const config=JSON.parse(await readFile(prefix+"-pdf/vivliostyle.config.json","utf8"));assert.deepEqual(config.entry.map(x=>x.path),orderedFiles);
 const generated=JSON.parse(await readFile(prefix+"-pdf/work/publication.json","utf8"));assert.deepEqual(generated.readingOrder.map(x=>typeof x==="string"?x:x.url),orderedFiles);
 assert.equal((await readdir(root+"/chapters")).filter(f=>f.endsWith(".html")).length,18);
 for(const c of publication.chapters){
  const html=htmls.get(c.output);const set=ids(html);
  assert(html.includes('href="../manual.pdf" download'),"PDF download on every chapter");
  assert(set.has(c.id));for(const section of c.sections)assert(set.has(section.id),section.id);
  assert(!html.includes("[[safety:"));assert(!html.includes("第1章 構成の確認"));
 }
 assert.throws(()=>chapterMarkup("<h1>drift</h1>",publication.chapters[0]),/drift/);
 const invalid=spawnSync(process.execPath,["scripts/build-manual.mjs","--variant=unknown"],{encoding:"utf8"});assert.notEqual(invalid.status,0);
});
test("all relative HTML/asset/fragment links resolve at the Pages subpath",async()=>{
 for(const [file,html] of htmls){
  const unique=[...html.matchAll(/\sid="([^"]+)"/g)].map(x=>x[1]);assert.equal(new Set(unique).size,unique.length,"duplicate ID in "+file);
  for(const match of html.matchAll(/\b(href|src)="([^"]+)"/g)){
   const value=match[2];if(/^[a-z]+:/i.test(value))continue;
   const url=new URL(value,"https://example.test/technical-manual-poc/"+file);
   assert(url.pathname.startsWith("/technical-manual-poc/"),value);
   const target=decodeURIComponent(url.pathname.slice("/technical-manual-poc/".length));
   await access(root+"/"+target);
   if(url.hash&&target.endsWith(".html"))assert(ids(await readFile(root+"/"+target,"utf8")).has(decodeURIComponent(url.hash.slice(1))),file+" -> "+value);
   assert(!/\.md(?:#|$)/.test(value),"unrewritten source link");
  }
 }
});
test("published chapter HTML is unchanged after PDF creation",async()=>{
 assert.deepEqual(await readFile(root+"/manual.pdf"),await readFile(prefix+"-pdf/manual.pdf"),"Web download equals reviewed PDF");
 const evidence=JSON.parse(await readFile(prefix+"-pdf/html-inputs.json","utf8"));assert.deepEqual(evidence.files,orderedFiles);
 for(let i=0;i<orderedFiles.length;i++)assert.equal(createHash("sha256").update(await readFile(root+"/"+orderedFiles[i])).digest("hex"),evidence.sha256[i]);
 const all=[...htmls.values()].join("\n");
 for(const m of messages){assert(all.includes(m.consequence),m.id);assert(all.includes(m.avoidance),m.id);}
 assert(!await readFile(root+"/index.html","utf8").then(s=>s.includes('data-message-id=')),"index remains TOC rather than combined prose");
});
test("multi-document PDF has all chapters, warning prose, internal links and A4 pagination",async()=>{
 const bytes=await readFile(prefix+"-pdf/manual.pdf");const pdf=await PDFDocument.load(bytes);const doc=mupdf.Document.openDocument(bytes,"application/pdf");
 assert(pdf.getPageCount()>=60&&pdf.getPageCount()<=80,"v0.2 must have 60–80 pages");const pages=Array.from({length:doc.countPages()},(_,i)=>doc.loadPage(i).toStructuredText().asText());const text=pages.join("\n");const normalized=text.replace(/\s+/g,"");
 assert(!text.includes("ウェブ目次"));assert(!text.includes("章と節の目次を開閉"));assert(!text.includes("本文へ移動"));assert(!text.includes("PDFをダウンロード"));
 for(const c of publication.chapters)assert(normalized.includes(c.title.replace(/\s+/g,"")),c.title);
 for(const m of messages){assert(normalized.includes(m.consequence.replace(/\s+/g,"")),m.id);assert(normalized.includes(m.avoidance.replace(/\s+/g,"")),m.id);}
 let links=0;for(let i=0;i<doc.countPages();i++){
  const page=doc.loadPage(i);const bounds=page.getBounds();assert(Math.abs(bounds[2]-595.28)<2);assert(Math.abs(bounds[3]-841.89)<2);
  for(const link of page.getLinks())if(link.getURI().startsWith("#")){const target=doc.resolveLink(link);assert(target>=0&&target<doc.countPages(),"PDF destination resolves");links++;}
 }
 assert(links>50,"PDF internal TOC/section links");
 assert(pages.filter(x=>x.includes("管理番号")).length>=2,"long table header repeats");
 await mkdir("dist-v02-review",{recursive:true});
 for(const name of await readdir("dist-v02-review"))if(/^pdf-\d+\.png$/.test(name))await unlink("dist-v02-review/"+name);
 // Export every page for full visual review.
 for(let i=0;i<doc.countPages();i++)await writeFile("dist-v02-review/pdf-"+(i+1)+".png",doc.loadPage(i).toPixmap([.8,0,0,.8,0,0],mupdf.ColorSpace.DeviceRGB,false).asPNG());
 await writeFile("dist-v02-review/summary.json",JSON.stringify({pages:doc.countPages(),internalLinks:links},null,2));
 console.log("v0.2 PDF:",doc.countPages(),"pages,",links,"internal links");
});

test("glossary and index offer working chapter/section links",()=>{const html=htmls.get("chapters/app-e.html");assert((html.match(/href="ch-\d{2}\.html#/g)||[]).length>=30);});
