import { readFile, writeFile, mkdir, rm, copyFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { publication, orderedFiles } from "../lib/publication.mjs";
const prefix=process.env.MANUAL_OUTPUT_PREFIX||"dist";
if(!/^dist(?:-[a-z0-9-]+)?$/.test(prefix))throw new Error("Invalid output prefix");
const web=prefix+"-web", pdf=prefix+"-pdf";
import { startStaticServer } from "./static-server.mjs";

await mkdir(pdf, { recursive: true });
await rm(pdf+"/manual.pdf", { force: true });
const files = orderedFiles;
const selection=JSON.parse(await readFile(web+"/publication-build.json","utf8"));
if(selection.variant!=="v0.2"||JSON.stringify(selection.files)!==JSON.stringify(files))throw new Error("PDF input selection mismatch");
const hash = value => createHash("sha256").update(value).digest("hex");
const before = await Promise.all(files.map(async file => hash(await readFile(web+"/" + file))));
const server = await startStaticServer(web);
try {
  const config = {
    title: publication.title,
    language: "ja",
    size: "A4",
    entryContext: resolve(web),
    entry: files.map(file => ({ path: file })),
    workspaceDir: resolve(pdf+"/work"),
    output: resolve(pdf+"/manual.pdf")
  };
  await writeFile(pdf+"/vivliostyle.config.json", JSON.stringify(config, null, 2));
  await new Promise((accept, reject) => {
    const child = spawn(process.execPath, [
      "node_modules/@vivliostyle/cli/dist/cli.js", "build",
      "--config", pdf+"/vivliostyle.config.json",
      "--style", server.url + "styles/print.css",
      "--browser", "chrome@155.0.8059.84", "--timeout", "240"
    ], { stdio: "inherit", windowsHide: true });
    const timer = setTimeout(() => child.kill(), 300000);
    child.once("error", error => { clearTimeout(timer); reject(error); });
    child.once("exit", code => { clearTimeout(timer); code === 0 ? accept() : reject(new Error("Spike PDF build failed: " + code)); });
  });
  if (server.failures.length) throw new Error("Missing resources: " + server.failures.join(", "));
  const after = await Promise.all(files.map(async file => hash(await readFile(web+"/" + file))));
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error("PDF build mutated HTML inputs");
  await writeFile(pdf+"/html-inputs.json",JSON.stringify({files,sha256:before},null,2));
  await copyFile(pdf+"/manual.pdf",web+"/manual.pdf");
  console.log("All ordered HTML entries unchanged:", files.join(", "));
} catch(error) {
  await rm(pdf+"/manual.pdf", { force: true });
  throw error;
} finally { await server.close(); }
