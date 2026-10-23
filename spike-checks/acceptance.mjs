import test from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, relative } from "node:path";
import { PDFDocument } from "pdf-lib";
import * as mupdf from "mupdf";
import { manifest, chapterMarkup } from "../lib/spike-manifest.mjs";

const paths = ["index.html", ...manifest.chapters.map(c => c.output)];
const documents = new Map(await Promise.all(paths.map(async path => [path, await readFile("dist-spike-web/" + path, "utf8")])));

test("every chapter/section link and asset resolves at the Pages subpath", async () => {
  for (const [path, html] of documents) {
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
    assert.equal(new Set(ids).size, ids.length);
    for (const [, ref] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const base = new URL("https://example.test/technical-manual-poc/" + path);
      const url = new URL(ref, base);
      assert.ok(url.pathname.startsWith("/technical-manual-poc/"), ref);
      const target = url.pathname.slice("/technical-manual-poc/".length);
      if (target.endsWith(".html")) {
        assert.ok(documents.has(target), target);
        if (url.hash) assert.ok(documents.get(target).includes(`id="${url.hash.slice(1)}"`), ref);
      } else await readFile("dist-spike-web/" + target);
    }
  }
});

test("manifest controls active chapter, hierarchy, stable IDs and PDF entry order", async () => {
  for (const chapter of manifest.chapters) {
    const html = documents.get(chapter.output);
    assert.ok(html.includes(`id="${chapter.id}"`));
    assert.ok(html.includes(`href="../${chapter.output}#${chapter.id}" aria-current="page"`));
    assert.match(html, /<details class="web-mobile-toc">/);
    assert.match(html, /<summary>モバイル目次を開閉<\/summary>/);
    for (const section of chapter.sections) assert.ok(html.includes(`id="${section.id}"`));
  }
  const config = JSON.parse(await readFile("dist-spike-pdf/vivliostyle.config.json", "utf8"));
  assert.deepEqual(config.entry.map(e => relative(resolve("dist-spike-web"), resolve(config.entryContext, e.path)).replaceAll("\\", "/")), paths);
  const publication = JSON.parse(await readFile("dist-spike-pdf/work/publication.json", "utf8"));
  assert.deepEqual(publication.readingOrder.map(e => e.url), paths);
  assert.throws(() => chapterMarkup("<h1>違う見出し</h1>", manifest.chapters[0]), /drift/);
});

test("actual PDF has one TOC and ordered chapters, with no sidebar or reserved left column", async () => {
  const bytes = await readFile("dist-spike-pdf/manual.pdf");
  const pdf = await PDFDocument.load(bytes);
  assert.equal(pdf.getPageCount(), 3, "No extra navigation/blank pages");
  const document = mupdf.Document.openDocument(bytes, "application/pdf");
  await mkdir("dist-spike-review", { recursive: true });
  const titles = ["検証用マニュアル目次", ...manifest.chapters.map(c => c.title)];
  const targets = new Set();
  try {
    for (let i = 0; i < document.countPages(); i++) {
      const page = document.loadPage(i);
      const structured = page.toStructuredText();
      const text = structured.asText().replace(/\s/g, "");
      assert.ok(text.startsWith(titles[i].replace(/\s/g, "")), `PDF page order: ${i}`);
      for (const chrome of ["ウェブ目次", "モバイル目次", "本文へ移動", "検証用目次ページ"]) assert.ok(!text.includes(chrome), chrome);
      assert.ok(text.endsWith(String(i + 1)), "Continuous page numbering");
      let firstLine;
      structured.walk({ beginLine: bbox => { firstLine ??= bbox; } });
      assert.ok(firstLine[0] > 45 && firstLine[0] < 70, `Unexpected left margin: ${firstLine[0]}`);
      const { width, height } = pdf.getPage(i).getSize();
      assert.ok(Math.abs(width - 595.28) < 1 && Math.abs(height - 841.89) < 1);
      for (const link of page.getLinks()) {
        const target = document.resolveLink(link);
        assert.ok(target === 1 || target === 2, "Visible PDF links target real chapter pages");
        targets.add(target);
        link.destroy();
      }
      const pixmap = page.toPixmap(mupdf.Matrix.scale(1.2, 1.2), mupdf.ColorSpace.DeviceRGB, false);
      await writeFile(`dist-spike-review/pdf-${i + 1}.png`, pixmap.asPNG());
      pixmap.destroy(); structured.destroy(); page.destroy();
    }
    assert.deepEqual([...targets].sort(), [1, 2]);
  } finally { document.destroy(); }
});
