import { chapterHeading, chapterTitle } from "./lib/chapters.mjs";

const chapterFiles = ["01-introduction", "02-safety", "03-operation"];

export default function (eleventyConfig) {
  for (const path of ["README.md", "dist-web/**", "dist-pdf/**", "test/**", "scripts/**", "lib/**"]) {
    eleventyConfig.ignores.add(path);
  }
  eleventyConfig.addPassthroughCopy({ "styles": "styles" });
  eleventyConfig.addPassthroughCopy({ "manual/assets": "assets" });
  eleventyConfig.addPassthroughCopy({
    "node_modules/@fontsource/noto-sans-jp/files": "fonts/files",
    "node_modules/@fontsource/noto-sans-jp/400.css": "fonts/400.css",
    "node_modules/@fontsource/noto-sans-jp/700.css": "fonts/700.css",
    "node_modules/@fontsource/noto-sans-jp/LICENSE": "fonts/LICENSE"
  });
  eleventyConfig.amendLibrary("md", (md) => md.set({ html: false }));
  eleventyConfig.addCollection("chapters", (api) => {
    const chapters = api.getFilteredByGlob("./manual/*.md");
    if (chapters.length !== chapterFiles.length) throw new Error("Expected exactly three manual chapters");
    return chapterFiles.map((slug) => {
      const chapter = chapters.find((item) => item.fileSlug === slug);
      if (!chapter) throw new Error(`Missing chapter: ${slug}`);
      return chapter;
    });
  });
  eleventyConfig.addFilter("chapterHeading", chapterHeading);
  eleventyConfig.addFilter("chapterTitle", chapterTitle);
  return {
    dir: { input: ".", includes: "src/_includes", output: "dist-web" },
    templateFormats: ["md", "njk"],
    markdownTemplateEngine: false,
    htmlTemplateEngine: "njk",
    pathPrefix: "/technical-manual-poc/"
  };
}
