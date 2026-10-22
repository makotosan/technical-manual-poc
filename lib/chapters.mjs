// Eleventy has already converted Markdown. Only heading structure is adjusted here.
// Ordinal IDs are deterministic and scoped to the source chapter's filename.
export function chapterHeading(html, slug) {
  if (!/^[a-z0-9-]+$/.test(slug)) throw new Error("Invalid chapter slug");
  let index = 0;
  return html.replace(/<h([1-6])>([\s\S]*?)<\/h\1>/g, (_, level, content) => {
    const outputLevel = Math.min(Number(level) + 1, 6);
    const id = `${slug}-heading-${++index}`;
    return `<h${outputLevel} id="${id}">${content}</h${outputLevel}>`;
  });
}

export function chapterTitle(html) {
  const match = html.match(/^<h1>([\s\S]*?)<\/h1>/);
  if (!match) throw new Error("Each chapter must start with a level-one heading");
  // Decode once, after stripping markup. Nunjucks escapes the resulting TOC text.
  const entities = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" };
  return match[1].replace(/<[^>]*>/g, "").replace(/&(?:amp|lt|gt|quot|#39);/g, (entity) => entities[entity]);
}
