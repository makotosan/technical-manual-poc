import { readFileSync } from "node:fs";
import { EleventyRenderPlugin } from "@11ty/eleventy";
import { loadManifest, chapterMarkup } from "./lib/spike-manifest.mjs";

export default function(config) {
  config.addPlugin(EleventyRenderPlugin);
  config.addGlobalData("manifest", loadManifest);
  config.addFilter("chapterMarkup", chapterMarkup);
  config.addFilter("chapterSource", path => readFileSync(path, "utf8"));
  config.amendLibrary("md", md => md.set({ html: false }));
  config.addWatchTarget("manual-v02");
  config.addPassthroughCopy({ "spike/styles": "styles", "manual-v02/assets": "assets" });
  config.addPassthroughCopy({
    "node_modules/@fontsource/noto-sans-jp/files": "fonts/files",
    "node_modules/@fontsource/noto-sans-jp/400.css": "fonts/400.css",
    "node_modules/@fontsource/noto-sans-jp/700.css": "fonts/700.css",
    "node_modules/@fontsource/noto-sans-jp/LICENSE": "fonts/LICENSE"
  });
  return {
    dir: { input: "spike", includes: "_includes", output: "dist-spike-web" },
    templateFormats: ["njk"],
    markdownTemplateEngine: false,
    pathPrefix: "/technical-manual-poc/"
  };
}
