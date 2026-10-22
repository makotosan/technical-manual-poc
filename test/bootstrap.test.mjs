import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";


test("build emits Japanese HTML and a resolvable subpath stylesheet", async () => {
  const html = await readFile("dist-web/index.html", "utf8");
  assert.match(html, /<html lang="ja">/);
  assert.match(html, /技術マニュアル PoC/);
  assert.match(html, /href="\/technical-manual-poc\/styles\/web.css"/);
  assert.ok((await readFile("dist-web/styles/web.css", "utf8")).length > 0);
});

test("fictional PNG and SVG fixtures are copied intact", async () => {
  for (const name of ["status.png", "device.svg"]) {
    const original = await readFile(`manual/assets/${name}`);
    assert.deepEqual(await readFile(`dist-web/assets/${name}`), original);
  }
  const png = await readFile("dist-web/assets/status.png");
  assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
});
