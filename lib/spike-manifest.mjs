import { readFileSync } from "node:fs";
import { chapterTitle } from "./chapters.mjs";

export function loadManifest() {
  const manifest = JSON.parse(readFileSync(new URL("../manual-v02/manifest.json", import.meta.url), "utf8"));
  const ids = new Set();
  for (const chapter of manifest.chapters) {
    if (!/^[a-z][a-z0-9-]*$/.test(chapter.id) || ids.has(chapter.id)) throw new Error("Invalid or duplicate chapter ID");
    ids.add(chapter.id);
    if (!/^manual-v02\/[a-z0-9-]+\.md$/.test(chapter.source)) throw new Error("Invalid chapter source");
    chapter.output = `chapters/${chapter.id}.html`;
    for (const section of chapter.sections) {
      if (!section.id.startsWith(chapter.id + "-") || !/^[a-z][a-z0-9-]*$/.test(section.id) || ids.has(section.id)) throw new Error("Invalid or duplicate section ID");
      ids.add(section.id);
    }
  }

  return manifest;
}
export const manifest = loadManifest();

export function chapterMarkup(html, chapter) {
  const expected = [{ id: chapter.id, title: chapter.title, level: 1 }, ...chapter.sections];
  let position = 0;
  const result = html.replace(/<h([1-6])>([\s\S]*?)<\/h\1>/g, (_, level, content) => {
    const heading = expected[position++];
    const text = chapterTitle(`<h1>${content}</h1>`);
    if (!heading || text !== heading.title || Number(level) !== heading.level) throw new Error(`Manifest heading drift: ${chapter.id} / ${text}`);
    return `<h${level} id="${heading.id}">${content}</h${level}>`;
  });
  if (position !== expected.length) throw new Error(`Missing manifest headings: ${chapter.id}`);
  return result;
}
