import {readFileSync} from "node:fs";
import {EleventyRenderPlugin} from "@11ty/eleventy";
import {loadPublication,chapterMarkup} from "./lib/publication.mjs";
import {safetyMarkdown} from "./lib/safety-messages.mjs";
const prefix=process.env.MANUAL_OUTPUT_PREFIX||"dist";
if(!/^dist(?:-[a-z0-9-]+)?$/.test(prefix))throw new Error("Invalid output prefix");
export default function(config){
 config.addPlugin(EleventyRenderPlugin);
 config.addGlobalData("publication",loadPublication);
 config.addGlobalData("visuals",JSON.parse(readFileSync("sample-data/visual-inventory.json","utf8")));
 config.addFilter("source",path=>readFileSync(path,"utf8"));
 config.addFilter("chapterMarkup",chapterMarkup);
 config.addFilter("figureAnchor",(figure,chapter)=>chapter.id+"-"+figure.id.toLowerCase());
 config.amendLibrary("md",md=>md.set({html:false}).use(safetyMarkdown));
 config.addPassthroughCopy({"manual-v02/assets":"assets","manual-v02/styles":"styles","publication/styles":"styles"});
 config.addPassthroughCopy({"node_modules/@fontsource/noto-sans-jp/files":"fonts/files","node_modules/@fontsource/noto-sans-jp/400.css":"fonts/400.css","node_modules/@fontsource/noto-sans-jp/700.css":"fonts/700.css","node_modules/@fontsource/noto-sans-jp/LICENSE":"fonts/LICENSE"});
 config.addWatchTarget("manual-v02");
 return {dir:{input:"publication",includes:"_includes",output:prefix+"-web"},templateFormats:["njk"],pathPrefix:"/technical-manual-poc/"};
}
