import test from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validatePdf } from "../scripts/validate-pdf.mjs";
import { startStaticServer } from "../scripts/static-server.mjs";

test("generated PDF parses as multiple A4 pages", async () => {
  await validatePdf("dist-pdf/manual.pdf");
});

test("PDF validator rejects arbitrary non-PDF data", async () => {
  const temp = await mkdtemp(join(tmpdir(), "manual-pdf-test-"));
  try {
    const file = join(temp, "invalid.pdf");
    await writeFile(file, "not a PDF");
    await assert.rejects(validatePdf(file), /Invalid PDF header/);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});

test("PDF server serves the exact HTML and local font resources at the Pages subpath", async () => {
  const server = await startStaticServer();
  try {
    assert.deepEqual(Buffer.from(await (await fetch(server.url + "index.html")).arrayBuffer()), await readFile("dist-web/index.html"));
    for (const asset of ["styles/print.css", "fonts/400.css", "fonts/700.css", "fonts/LICENSE", "assets/device.svg", "assets/status.png"]) {
      assert.equal((await fetch(server.url + asset)).status, 200, asset);
    }
    const css = await (await fetch(server.url + "fonts/400.css")).text();
    for (const [, ref] of css.matchAll(/url\(([^)]+)\)/g)) {
      assert.equal((await fetch(new URL(ref, server.url + "fonts/400.css"))).status, 200, ref);
    }
    assert.equal((await fetch(new URL("/package.json", server.url))).status, 404);
    assert.equal((await fetch(server.url + "%2e%2e%5cpackage.json")).status, 404);
  } finally { await server.close(); }
});
