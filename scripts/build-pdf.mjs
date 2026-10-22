import { readFile, mkdir, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { startStaticServer } from "./static-server.mjs";
import { validatePdf } from "./validate-pdf.mjs";

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
function run(args) {
  return new Promise((accept, reject) => {
    const child = spawn(process.execPath, args, { stdio: "inherit", windowsHide: true });
    const timer = setTimeout(() => child.kill(), 180_000);
    child.once("error", (error) => { clearTimeout(timer); reject(error); });
    child.once("exit", (code, signal) => {
      clearTimeout(timer);
      code === 0 ? accept() : reject(new Error(`PDF build failed (code=${code}, signal=${signal})`));
    });
  });
}
const input = "dist-web/index.html";
const before = hash(await readFile(input));
await mkdir("dist-pdf", { recursive: true });
await rm("dist-pdf/manual.pdf", { force: true });
const server = await startStaticServer();
try {
  const entry = server.url + "index.html";
  const response = await fetch(entry);
  if (!response.ok || hash(Buffer.from(await response.arrayBuffer())) !== before) throw new Error("Served HTML differs from build artifact");
  await run([
    "node_modules/@vivliostyle/cli/dist/cli.js", "build", entry,
    "--style", server.url + "styles/print.css",
    "--browser", "chrome@155.0.8059.84", "--single-doc", "--timeout", "120",
    "--size", "A4", "--output", "dist-pdf/manual.pdf"
  ]);
  if (server.failures.length) throw new Error(`Missing publication resources: ${server.failures.join(", ")}`);
  if (hash(await readFile(input)) !== before) throw new Error("PDF generation changed the shared HTML");
  await validatePdf("dist-pdf/manual.pdf");
  console.log(`Shared HTML SHA256: ${before} (unchanged)`);
} catch (error) {
  await rm("dist-pdf/manual.pdf", { force: true });
  throw error;
} finally {
  await server.close();
}
