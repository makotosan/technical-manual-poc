import {readFileSync} from "node:fs";
import {posix} from "node:path";
import {chapterTitle} from "./chapters.mjs";
const dataPath=new URL("../manual-v02/publication.json",import.meta.url);
const inventory=JSON.parse(readFileSync(new URL("../sample-data/visual-inventory.json",import.meta.url),"utf8"));
export function loadPublication() {
 const p=JSON.parse(readFileSync(dataPath,"utf8"));const ids=new Set();const outputs=new Set();
 if(p.chapters.length!==18)throw new Error("Expected front matter, 12 chapters and 5 appendices");
 for(const c of p.chapters){
  if(!/^(front|ch-[0-9]{2}|app-[a-e])$/.test(c.id)||ids.has(c.id))throw new Error("Invalid publication chapter ID");
  ids.add(c.id);
  if(!/^manual-v02\/(?:appendices\/)?[a-z0-9-]+\.md$/.test(c.source))throw new Error("Invalid chapter source");
  if(c.output!=="chapters/"+c.id+".html"||outputs.has(c.output))throw new Error("Invalid chapter output");
  outputs.add(c.output);
  for(const s of c.sections){if(!s.id.startsWith(c.id+"-")||ids.has(s.id)||!/^[-a-z0-9]+$/.test(s.id))throw new Error("Invalid section ID");ids.add(s.id);}
 }
 if(p.chapters.map(c=>c.id).join(",")!==["front",...Array.from({length:12},(_,i)=>"ch-"+String(i+1).padStart(2,"0")),...Array.from("abcde",a=>"app-"+a)].join(","))throw new Error("Publication order drift");
 return p;
}
export const publication=loadPublication();
export const orderedFiles=["chapters/front.html","index.html",...publication.chapters.slice(1).map(c=>c.output)];
export function chapterMarkup(html,chapter) {
 const expected=[{id:chapter.id,title:chapter.title,level:1},...chapter.sections];let n=0;
 html=html.replace(/<h([1-6])>([\s\S]*?)<\/h\1>/g,(_,level,content)=>{
  const e=expected[n++];if(!e||e.level!==Number(level)||e.title!==chapterTitle("<h1>"+content+"</h1>"))throw new Error("Heading drift: "+chapter.id+" / "+content);
  return "<h"+level+' id="'+e.id+'">'+content+"</h"+level+">";
 });
 if(n!==expected.length)throw new Error("Missing publication heading");
 const sourceMap=new Map(publication.chapters.map(c=>[c.source,c]));
 html=html.replace(/\b(href|src)="([^"]+)"/g,(_,attr,value)=>{
  if(/^(?:[a-z]+:|\/|#)/i.test(value))return attr+'="'+value+'"';
  const [path,fragment]=value.split("#");let target;
  if(path==="02-safety.html")target="manual-v02/02-safety.md";
  else if(path==="appendices/c-warning-labels.html")target="manual-v02/appendices/c-warning-labels.md";
  else target=posix.normalize(posix.join(posix.dirname(chapter.source),path));
  let url;
  if(sourceMap.has(target))url=posix.relative(posix.dirname(chapter.output),sourceMap.get(target).output);
  else if(path.startsWith("assets/"))url="../"+path;
  else if(target.startsWith("manual-v02/assets/"))url="../"+target.slice("manual-v02/".length);
  else url=path;
  return attr+'="'+url+(fragment?"#"+fragment:"")+'"';
 });
 html=html.replace(/<img\b([^>]*?)src="([^"]+)"([^>]*)>/g,(whole,before,src,after)=>{
  const f=inventory.figures.find(f=>f.path==="manual-v02/"+posix.normalize(posix.join("chapters",src)));
  return f?'<span class="figure-target" id="'+chapter.id+"-"+f.id.toLowerCase()+'"><img'+before+'src="'+src+'"'+after+"></span>":whole;
 });
 html=html.replace(/<p>(<span class="figure-target"[\s\S]*?<\/span>)<\/p>\s*<p><em>([\s\S]*?)<\/em><\/p>/g,'<figure class="manual-figure">$1<figcaption>$2</figcaption></figure>');
 const tables=inventory.tables.filter(t=>t.source===chapter.source);let table=0;
 html=html.replace(/<table>/g,()=>{
  const t=tables[table++];if(!t)throw new Error("Table inventory drift: "+chapter.source);
  return '<div class="table-scroll" tabindex="0" role="region" aria-label="表 '+t.id+'"><table id="'+chapter.id+"-"+t.id.toLowerCase()+'"><caption>'+t.id+" "+t.heading+"</caption>";
 }).replace(/<\/table>/g,"</table></div>");
 if(table!==tables.length)throw new Error("Missing source table: "+chapter.source);
 return html;
}
