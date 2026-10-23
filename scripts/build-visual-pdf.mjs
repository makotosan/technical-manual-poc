import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { startStaticServer } from "./static-server.mjs";
await mkdir("dist-visual-pdf",{recursive:true});
await rm("dist-visual-pdf/review.pdf",{force:true});
const file="dist-visual-web/index.html";
const hash=x=>createHash("sha256").update(x).digest("hex");
const before=hash(await readFile(file));
const server=await startStaticServer("dist-visual-web");
try {
 const args=["node_modules/@vivliostyle/cli/dist/cli.js","build",server.url,"--output",resolve("dist-visual-pdf/review.pdf"),"--browser","chrome@155.0.8059.84","--timeout","120"];
 await new Promise((yes,no)=>{const p=spawn(process.execPath,args,{stdio:"inherit",windowsHide:true});const timer=setTimeout(()=>p.kill(),180000);p.on("error",e=>{clearTimeout(timer);no(e)});p.on("exit",code=>{clearTimeout(timer);code===0?yes():no(new Error("Visual PDF failed: "+code))});});
 if(hash(await readFile(file))!==before)throw new Error("Input HTML mutated");
 if(server.failures.length)throw new Error("Missing resources: "+server.failures.join(","));
 console.log("Verified shared HTML unchanged; all PDF resources served.");
} finally {await server.close();}
