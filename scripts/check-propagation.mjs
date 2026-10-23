import assert from "node:assert/strict";
import { readFile, writeFile, cp, mkdir, mkdtemp, symlink, rm } from "node:fs/promises";
import { resolve, join, sep } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import * as mupdf from "mupdf";

const root = resolve(".");
const tempRoot = resolve(tmpdir());
const sandbox = await mkdtemp(join(tempRoot, "manual-propagation-"));
assert.ok(sandbox.startsWith(tempRoot + sep));
const evidence = join(root, "dist-acceptance");
await mkdir(evidence, { recursive: true });
const source = "manual/02-safety.md";
const original = await readFile(source);
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const publishedHtml = hash(await readFile("dist-web/index.html"));
const publishedPdf = hash(await readFile("dist-pdf/manual.pdf"));
const sentence = "受入確認用の文章が共通HTMLからPDFへ反映されます。";
const imageName = "acceptance-status.svg";
const alternate = '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="80"><rect width="240" height="80" fill="#ff00ff"/></svg>';

function run(args) {
  return new Promise((accept, reject) => {
    const child = spawn(process.execPath, args, { cwd: sandbox, stdio: "inherit", windowsHide: true });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? accept() : reject(new Error(`Acceptance command failed: ${code}`)));
  });
}

async function inspect(label) {
  await run([join(root, "node_modules/@11ty/eleventy/cmd.cjs")]);
  await run([join(root, "scripts/build-pdf.mjs")]);
  const html = await readFile(join(sandbox, "dist-web/index.html"), "utf8");
  const document = mupdf.Document.openDocument(await readFile(join(sandbox, "dist-pdf/manual.pdf")), "application/pdf");
  let text = "";
  let magenta = 0;
  try {
    for (let i = 0; i < document.countPages(); i++) {
      const page = document.loadPage(i);
      const structured = page.toStructuredText();
      text += structured.asText();
      structured.destroy();
      const pixels = page.toPixmap(mupdf.Matrix.scale(1, 1), mupdf.ColorSpace.DeviceRGB, false);
      const samples = pixels.getPixels();
      const components = pixels.getNumberOfComponents();
      for (let offset = 0; offset < samples.length; offset += components) {
        if (samples[offset] > 240 && samples[offset + 1] < 15 && samples[offset + 2] > 240) magenta++;
      }
      await writeFile(join(evidence, `${label}-${i + 1}.png`), pixels.asPNG());
      pixels.destroy();
      page.destroy();
    }
  } finally { document.destroy(); }
  return { html, text: text.replace(/\s/g, ""), magenta };
}

try {
  for (const path of ["manual", "src", "styles", "lib", "eleventy.config.js", "package.json"]) {
    await cp(join(root, path), join(sandbox, path), { recursive: true });
  }
  await symlink(join(root, "node_modules"), join(sandbox, "node_modules"), process.platform === "win32" ? "junction" : "dir");
  const baseline = await inspect("baseline");
  assert.ok(!baseline.html.includes(sentence));
  assert.ok(!baseline.text.includes(sentence));
  assert.equal(baseline.magenta, 0);
  const changed = original.toString("utf8").replace("assets/status.png", `assets/${imageName}`) + "\n" + sentence + "\n";
  assert.notEqual(changed, original.toString("utf8"));
  await writeFile(join(sandbox, source), changed);
  await writeFile(join(sandbox, "manual/assets", imageName), alternate);
  const updated = await inspect("changed");
  assert.ok(updated.html.includes(sentence), "Edited text must appear in HTML");
  assert.ok(updated.text.includes(sentence), "Edited text must appear in PDF text");
  assert.ok(updated.html.includes(`src="assets/${imageName}"`), "Edited image reference must appear in HTML");
  assert.equal(await readFile(join(sandbox, "dist-web/assets", imageName), "utf8"), alternate);
  assert.ok(updated.magenta > 5000, "Replacement image must be rendered in the PDF, not only referenced");
  console.log(`PASS text/image propagation: new PDF image contains ${updated.magenta} magenta pixels`);
} finally {
  assert.ok(sandbox.startsWith(tempRoot + sep) && sandbox.split(sep).at(-1).startsWith("manual-propagation-"));
  await rm(sandbox, { recursive: true, force: true });
  assert.deepEqual(await readFile(source), original, "Normal source remains untouched");
  assert.equal(hash(await readFile("dist-web/index.html")), publishedHtml, "Normal HTML remains untouched");
  assert.equal(hash(await readFile("dist-pdf/manual.pdf")), publishedPdf, "Normal PDF remains untouched");
}
