import test from "node:test";
import assert from "node:assert/strict";
import {readFile,access,mkdir,writeFile} from "node:fs/promises";
import {resolve,dirname} from "node:path";
import MarkdownIt from "markdown-it";
import {PDFDocument} from "pdf-lib";
import * as mupdf from "mupdf";
import {messages,renderSafety,safetyMarkdown} from "../lib/safety-messages.mjs";
const inv=JSON.parse(await readFile("sample-data/visual-inventory.json","utf8"));
const html=await readFile("dist-visual-web/index.html","utf8");
const norm=s=>s.replace(/\s+/g,"");
test("inventory retains all figures/tables and exact 18 severity types",async()=>{
 assert.equal(inv.figures.filter(x=>x.kind==="core").length,24);
 assert.equal(inv.tables.filter(x=>x.acceptance_set==="baseline-18").length,18);
 const counts=Object.fromEntries(["DANGER","WARNING","CAUTION","NOTICE"].map(s=>[s,messages.filter(m=>m.severity===s).length]));
 assert.deepEqual(counts,{DANGER:2,WARNING:8,CAUTION:5,NOTICE:3});
 const hazards=new Set(messages.flatMap(m=>[m.hazardId,...(m.relatedHazardIds||[])]).filter(Boolean));
 assert.equal(hazards.size,10);
 for(const f of inv.figures){await access(f.path);const src=await readFile(f.source,"utf8");assert(src.includes(f.path.split("/").at(-1)));}
 for(const table of inv.tables){const src=await readFile(table.source,"utf8");assert(src.includes(table.heading));}
 const chapterPlan=JSON.parse(await readFile("sample-data/content-inventory.yaml","utf8"));
 const sources=[chapterPlan.frontmatter.source,...chapterPlan.chapters.map(x=>x.source),...chapterPlan.appendices.map(x=>x.source)];
 const parser=new MarkdownIt({html:false}).use(safetyMarkdown);
 let actualTables=0;const used=new Set();
 for(const source of sources){
  const text=await readFile(source,"utf8");
  actualTables+=parser.parse(text,{}).filter(t=>t.type==="table_open").length;
  for(const match of text.matchAll(/\[\[safety:([WDCN]-[0-9]{2})\]\]/g)) used.add(match[1]);
 }
 assert.equal(actualTables,inv.tables.length,"inventory matches independently parsed source tables");
 for(const message of messages)assert(used.has(message.id),message.id+" missing from manuscript");

});
test("shared renderer preserves safety semantics and rejects unknown markers",()=>{
 const md=new MarkdownIt({html:false}).use(safetyMarkdown);
 assert.throws(()=>md.render("[[safety:W-99]]"),/Unknown/);
 const notice=renderSafety("N-01");assert(!notice.includes("safety-alert"));assert(!notice.includes("safety-hazard"));assert(notice.includes("aria-labelledby"));
 assert(renderSafety("W-01").includes('data-message-id="W-05"'));
 assert(renderSafety("C-01").includes('data-message-id="W-06"'));
 const repeated=md.render("[[safety:W-02]]\n\n[[safety:W-02]]");
 const labels=[...repeated.matchAll(/aria-labelledby="([^"]+)"/g)].map(x=>x[1]);assert.equal(new Set(labels).size,2);
 assert(!md.render("<script>bad()</script>").includes("<script>"));
 const original=messages[0].avoidance;
 try {messages[0].avoidance="長文検証用。".repeat(200);assert(renderSafety("D-01").includes("safety-long"));} finally {messages[0].avoidance=original;}

});
test("review HTML contains exact common prose, accessible labels and all symbols",async()=>{
 assert.equal((html.match(/data-message-id=/g)||[]).length,18);assert(!html.includes("[[safety:"));
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);assert.equal(new Set(ids).size,ids.length);
 for(const m of messages){assert(html.includes(m.consequence));assert(html.includes(m.avoidance));if(m.symbol)await access("dist-visual-web/assets/symbols/"+m.symbol+".svg");}
 const chapter=await readFile("dist-visual-web/02-safety.html","utf8");
 for(const s of ["DANGER","WARNING","CAUTION","NOTICE"])assert(chapter.includes("safety-"+s.toLowerCase()));
});
test("actual PDF preserves all warning prose and repeats the long-table header",async()=>{
 const bytes=await readFile("dist-visual-pdf/review.pdf");
 const pdf=await PDFDocument.load(bytes);assert(pdf.getPageCount()>=4);
 const doc=mupdf.Document.openDocument(bytes,"application/pdf");
 const pages=Array.from({length:doc.countPages()},(_,i)=>doc.loadPage(i).toStructuredText().asText());
 const text=norm(pages.join("\n"));
 for(const m of messages){assert(text.includes(norm(m.consequence)),m.id+" consequence");assert(text.includes(norm(m.avoidance)),m.id+" avoidance");}
 assert(pages.filter(p=>p.includes("管理番号")).length>=2,"repeated long table header");
 assert(pages.findIndex(p=>p.includes("CK-01"))<pages.findIndex(p=>p.includes("CK-34")));
 assert(!text.includes("全図版ギャラリー"),"screen navigation excluded");
 await mkdir("dist-visual-review",{recursive:true});
 for(let i=0;i<doc.countPages();i++){
  const page=doc.loadPage(i);const box=page.getBounds();assert(Math.abs(box[2]-595.28)<2);assert(Math.abs(box[3]-841.89)<2);
  await writeFile("dist-visual-review/pdf-"+(i+1)+".png",page.toPixmap([1,0,0,1,0,0],mupdf.ColorSpace.DeviceRGB,false).asPNG());
 }
 console.log("PDF pages:",doc.countPages());
});
