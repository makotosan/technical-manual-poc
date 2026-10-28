import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {orderedFiles} from "../lib/publication.mjs";
const args=process.argv.slice(2);
assert(args.every(a=>a.startsWith("--base=")||a.startsWith("--commit=")),"Unknown verification option");
const base=new URL(args.find(a=>a.startsWith("--base="))?.slice(7)||"https://makotosan.github.io/technical-manual-poc/");
const commit=args.find(a=>a.startsWith("--commit="))?.slice(9);
if(commit)assert(/^[a-f0-9]{40}$/.test(commit),"Expected full merge SHA");
if(!["127.0.0.1","localhost"].includes(base.hostname))assert(commit,"Public verification requires --commit=full-SHA");
assert(base.pathname.endsWith("/"));
const hash=bytes=>createHash("sha256").update(bytes).digest("hex");
const get=async url=>{const response=await fetch(url,{cache:"no-store"});assert.equal(response.status,200,String(url));return {bytes:Buffer.from(await response.arrayBuffer()),type:response.headers.get("content-type")||""};};
const evidence=JSON.parse((await get(new URL("publication-evidence.json",base))).bytes.toString("utf8"));
assert.equal(evidence.variant,"v0.2");assert.deepEqual(evidence.files,orderedFiles);if(commit)assert.equal(evidence.commit,commit,"Deployment belongs to another commit");
const assets=new Set();
const add=value=>{
 if(value.startsWith("#")||/^[a-z]+:/i.test(value))return;
 const url=new URL(value,base);assert(url.href.startsWith(base.href),"Asset outside Pages subpath");url.hash="";assets.add(url.href);
};
for(let i=0;i<orderedFiles.length;i++){
 const url=new URL(orderedFiles[i],base), response=await get(url);assert(response.type.includes("text/html"));assert.equal(hash(response.bytes),evidence.sha256[i],orderedFiles[i]);
 for(const [,value] of response.bytes.toString("utf8").matchAll(/\b(?:href|src)="([^"]+)"/g)){
  if(/^[a-z]+:/i.test(value)||value.startsWith("#"))continue;
  const resource=new URL(value,url);if(resource.pathname.endsWith(".html"))continue;
  add(resource.href.startsWith(base.href)?resource.href.slice(base.href.length):value);
 }
}
const pdf=await get(new URL("manual.pdf",base));assert(pdf.type.includes("application/pdf"),"PDF content type");assert.equal(hash(pdf.bytes),evidence.pdfSha256);assert(pdf.bytes.subarray(0,5).toString()==="%PDF-");
const checked=new Set();
while([...assets].some(url=>!checked.has(url))){
 const batch=[...assets].filter(url=>!checked.has(url)).slice(0,8);
 await Promise.all(batch.map(async url=>{
  checked.add(url);const response=await get(url);
  if(new URL(url).pathname.endsWith(".css"))for(const [,value] of response.bytes.toString("utf8").matchAll(/url\(["']?([^"')]+)["']?\)/g)){
   if(value.startsWith("data:"))continue;const resource=new URL(value,url);assert(resource.href.startsWith(base.href));assets.add(resource.href);
  }
 }));
}
console.log("PASS live publication:",orderedFiles.length,"HTML files, PDF hash and",checked.size,"resources; commit",evidence.commit);
