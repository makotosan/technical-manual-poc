import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, sep, extname } from "node:path";

const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".woff": "font/woff" };
export async function startStaticServer(root = "dist-web") {
  const directory = resolve(root);
  const prefix = "/technical-manual-poc/";
  const failures = [];
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
      if (!pathname.startsWith(prefix)) throw new Error("Outside publication path");
      const relative = pathname.slice(prefix.length) || "index.html";
      const path = resolve(directory, relative);
      if (!path.startsWith(directory + sep)) throw new Error("Outside publication directory");
      const bytes = await readFile(path);
      response.writeHead(200, { "Content-Type": types[extname(path)] || "application/octet-stream" });
      response.end(bytes);
    } catch {
      // Browsers may request a favicon even when none was declared.
      if (request.url !== "/favicon.ico") failures.push(request.url);
      response.writeHead(404); response.end("Not found");
    }
  });
  await new Promise((accept, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", accept);
  });
  return {
    url: `http://127.0.0.1:${server.address().port}${prefix}`,
    failures,
    close: () => new Promise((accept, reject) => {
      server.close((error) => error ? reject(error) : accept());
      server.closeAllConnections();
    })
  };
}
