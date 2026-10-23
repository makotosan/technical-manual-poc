import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as mupdf from "mupdf";

test("rendered PDF contains Japanese chapter text in source order", async () => {
  const doc = mupdf.Document.openDocument(await readFile("dist-pdf/manual.pdf"), "application/pdf");
  const text = [];
  try {
    for (let i = 0; i < doc.countPages(); i++) {
      const page = doc.loadPage(i);
      const structured = page.toStructuredText();
      text.push(structured.asText().replace(/\s/g, ""));
      structured.destroy();
      page.destroy();
    }
  } finally { doc.destroy(); }
  const content = text.slice(1).join("");
  let offset = -1;
  for (const title of ["はじめに", "安全上の注意", "操作方法"]) {
    const next = content.indexOf(title, offset + 1);
    assert.ok(next > offset, `Missing or unordered PDF chapter: ${title}`);
    offset = next;
  }
  for (const sentence of ["平らな場所に設置します。", "終了ボタンを押し、表示が消えたことを確認します。"]) {
    assert.ok(content.includes(sentence), `Missing PDF source text: ${sentence}`);
  }
});
