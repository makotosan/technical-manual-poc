export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "styles": "styles" });
  eleventyConfig.addPassthroughCopy({ "manual/assets": "assets" });
  return {
    dir: { input: "src", includes: "_includes", output: "dist-web" },
    templateFormats: ["njk"],
    htmlTemplateEngine: "njk",
    pathPrefix: "/technical-manual-poc/"
  };
}
