import {rm,readFile,writeFile} from "node:fs/promises";
import {resolve,sep} from "node:path";
import {spawn} from "node:child_process";
const args=process.argv.slice(2);
const options={variant:process.env.MANUAL_VARIANT||"v0.1",format:"both",prefix:"dist",skipWeb:false};
for(const arg of args){
 if(arg.startsWith("--variant="))options.variant=arg.slice(10);
 else if(arg.startsWith("--format="))options.format=arg.slice(9);
 else if(arg.startsWith("--output-prefix="))options.prefix=arg.slice(16);
 else if(arg==="--skip-web")options.skipWeb=true;
 else throw new Error("Unknown build option: "+arg);
}
if(!["v0.1","v0.2"].includes(options.variant)||!["web","pdf","both"].includes(options.format)||!/^dist(?:-[a-z0-9-]+)?$/.test(options.prefix))throw new Error("Invalid manual selection");
if(options.variant==="v0.1"&&options.prefix!=="dist")throw new Error("v0.1 uses the preserved default output");
function run(args){return new Promise((yes,no)=>{const p=spawn(process.execPath,args,{stdio:"inherit",windowsHide:true,env:{...process.env,MANUAL_OUTPUT_PREFIX:options.prefix}});p.on("error",no);p.on("exit",code=>code===0?yes():no(new Error("Manual build failed: "+code)));});}
if(!options.skipWeb){
 const output=resolve(options.prefix+"-web");
 if(!output.startsWith(resolve(".")+sep))throw new Error("Output outside workspace");
 await rm(output,{recursive:true,force:true});
 await run(["node_modules/@11ty/eleventy/cmd.cjs",...(options.variant==="v0.2"?["--config=eleventy.publication.config.js"]:[])]);
 if(options.variant==="v0.2"){
  const {orderedFiles}=await import("../lib/publication.mjs");
  await writeFile(output+"/publication-build.json",JSON.stringify({variant:options.variant,files:orderedFiles},null,2));
 }
}
if(options.skipWeb&&options.variant==="v0.1"){
 try {const marker=JSON.parse(await readFile(options.prefix+"-web/publication-build.json","utf8"));if(marker.variant==="v0.2")throw new Error("v0.2 HTML cannot be consumed by v0.1 PDF");}
 catch(error){if(error.code!=="ENOENT")throw error;}
}
if(options.format!=="web")await run([options.variant==="v0.2"?"scripts/build-publication-pdf.mjs":"scripts/build-pdf.mjs"]);
