import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const before = await readFile("dist-web/index.html", "utf8");
const build = spawnSync(process.execPath, ["node_modules/@11ty/eleventy/cmd.cjs"], { encoding: "utf8" });
assert.equal(build.status, 0, build.stderr);
assert.equal(await readFile("dist-web/index.html", "utf8"), before);
console.log("Rebuilding unchanged sources produces identical HTML");
