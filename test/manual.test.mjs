import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir, access } from "node:fs/promises";
import { chapterHeading, chapterTitle } from "../lib/chapters.mjs";

const html = await readFile("dist-web/index.html", "utf8");
const slugs = ["01-introduction", "02-safety", "03-operation"];

test("one HTML contains all chapters once in explicit order", async () => {
  const sections = [...html.matchAll(/<section class="chapter" id="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(sections, slugs);
  assert.equal((html.match(/<h1>/g) || []).length, 1);
  for (const text of ["はじめに", "安全上の注意", "操作方法"]) {
    assert.ok(html.includes(text));
  }
  assert.match(html, /<table>/);
  assert.match(html, /<ol>/);
  assert.doesNotMatch(html, /<script\b/i);
  const files = await readdir("dist-web", { recursive: true });
  assert.deepEqual(files.filter((f) => f.endsWith(".html")), ["index.html"]);
});

test("all chapter navigation and heading references resolve to unique IDs", () => {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const slug of slugs) {
    assert.match(html, new RegExp(`href="#${slug}"`));
    assert.ok(ids.includes(`${slug}-heading-1`));
  }
  for (const [, target] of html.matchAll(/(?:href="#|aria-labelledby=")([^"]+)"/g)) {
    assert.ok(ids.includes(target), `Missing anchor: ${target}`);
  }
});

test("every local link and asset resolves at the Pages subpath", async () => {
  const base = new URL("http://localhost/technical-manual-poc/");
  for (const [, ref] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const url = new URL(ref, base);
    if (url.origin !== base.origin) continue;
    assert.ok(url.pathname.startsWith(base.pathname), ref);
    const relative = url.pathname.slice(base.pathname.length) || "index.html";
    await access(`dist-web/${decodeURIComponent(relative)}`);
  }
});

test("repeated headings remain unique within and across chapters", () => {
  const repeated = "<h1>章</h1>\n<h2>確認</h2>\n<h2>確認</h2>";
  const output = chapterHeading(repeated, "chapter-a") + chapterHeading(repeated, "chapter-b");
  const ids = [...output.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(ids.length, 6);
  assert.equal(new Set(ids).size, 6);
  assert.equal(chapterTitle("<h1>安全 &amp; 操作</h1>"), "安全 & 操作");
  assert.equal(chapterTitle("<h1>literal &amp;lt;</h1>"), "literal &lt;");
  assert.throws(() => chapterTitle("<p>missing title</p>"), /level-one heading/);
});
