import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {spawnSync} from "node:child_process";
import {createHash} from "node:crypto";
import {orderedFiles} from "../lib/publication.mjs";
const prefix=process.env.PUBLICATION_OUTPUT_PREFIX||"dist-v02";
assert(/^dist(?:-[a-z0-9-]+)?$/.test(prefix));
const result=spawnSync(process.execPath,["scripts/build-manual.mjs","--variant=v0.2","--format=web","--output-prefix=dist-repeat"],{stdio:"inherit",windowsHide:true});
assert.equal(result.status,0);
for(const f of orderedFiles){
 const digest=async root=>createHash("sha256").update(await readFile(root+"/"+f)).digest("hex");
 assert.equal(await digest(prefix+"-web"),await digest("dist-repeat-web"),"Rebuild differs: "+f);
}
console.log("PASS: all 19 v0.2 HTML files reproduce exactly.");
