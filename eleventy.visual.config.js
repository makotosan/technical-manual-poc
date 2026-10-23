import { readFileSync } from "node:fs";
import { EleventyRenderPlugin } from "@11ty/eleventy";
import { messages, safetyMarkdown } from "./lib/safety-messages.mjs";
const inventory=JSON.parse(readFileSync("sample-data/visual-inventory.json","utf8"));
export default function(config) {
 config.addPlugin(EleventyRenderPlugin);
 config.addGlobalData("messages",messages);
 config.addGlobalData("figures",inventory.figures);
 config.addFilter("source",path=>readFileSync(path,"utf8"));
 config.addFilter("longTable",source=>source.slice(source.indexOf("## B.6")));
 config.amendLibrary("md",md=>md.set({html:false}).use(safetyMarkdown));
 config.addPassthroughCopy({"manual-v02/assets":"assets","manual-v02/styles":"styles","visual-review/styles":"styles"});
 config.addPassthroughCopy({"node_modules/@fontsource/noto-sans-jp/files":"fonts/files","node_modules/@fontsource/noto-sans-jp/400.css":"fonts/400.css","node_modules/@fontsource/noto-sans-jp/700.css":"fonts/700.css"});
 return {dir:{input:"visual-review",includes:"_includes",output:"dist-visual-web"},templateFormats:["njk"],pathPrefix:"/technical-manual-poc/"};
}
