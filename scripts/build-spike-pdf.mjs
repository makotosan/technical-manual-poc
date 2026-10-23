import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { manifest } from "../lib/spike-manifest.mjs";
import { startStaticServer } from "./static-server.mjs";

await mkdir("dist-spike-pdf", { recursive: true });
await rm("dist-spike-pdf/manual.pdf", { force: true });
const files = ["index.html", ...manifest.chapters.map(c => c.output)];
const hash = value => createHash("sha256").update(value).digest("hex");
const before = await Promise.all(files.map(async file => hash(await readFile("dist-spike-web/" + file))));
const server = await startStaticServer("dist-spike-web");
try {
  const config = {
    title: manifest.title,
    language: "ja",
    size: "A4",
    entryContext: resolve("dist-spike-web"),
    entry: files.map(file => ({ path: resolve("dist-spike-web/" + file) })),
    workspaceDir: resolve("dist-spike-pdf/work"),
    output: resolve("dist-spike-pdf/manual.pdf")
  };
  await writeFile("dist-spike-pdf/vivliostyle.config.json", JSON.stringify(config, null, 2));
  await new Promise((accept, reject) => {
    const child = spawn(process.execPath, [
      "node_modules/@vivliostyle/cli/dist/cli.js", "build",
      "--config", "dist-spike-pdf/vivliostyle.config.json",
      "--style", server.url + "styles/print.css",
      "--browser", "chrome@155.0.8059.84", "--timeout", "120"
    ], { stdio: "inherit", windowsHide: true });
    const timer = setTimeout(() => child.kill(), 180000);
    child.once("error", error => { clearTimeout(timer); reject(error); });
    child.once("exit", code => { clearTimeout(timer); code === 0 ? accept() : reject(new Error("Spike PDF build failed: " + code)); });
  });
  if (server.failures.length) throw new Error("Missing resources: " + server.failures.join(", "));
  const after = await Promise.all(files.map(async file => hash(await readFile("dist-spike-web/" + file))));
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error("PDF build mutated HTML inputs");
  console.log("All ordered HTML entries unchanged:", files.join(", "));
} catch(error) {
  await rm("dist-spike-pdf/manual.pdf", { force: true });
  throw error;
} finally { await server.close(); }
