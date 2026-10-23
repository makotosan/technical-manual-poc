import { readFileSync } from "node:fs";
const data = JSON.parse(readFileSync(new URL("../sample-data/safety-messages.json", import.meta.url), "utf8"));
export const messages = data.messages;
export const aliases = data.aliases;
const esc = value => String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const allowed = new Set(["DANGER", "WARNING", "CAUTION", "NOTICE"]);
const symbols = new Set(["electric","crush","entanglement","restart","load","projection","cut"]);
const ids = new Set();
for (const m of messages) {
 if(ids.has(m.id)||!/^[WDCN]-[0-9]{2}$/.test(m.id)) throw new Error("Invalid safety ID"); ids.add(m.id);
 if(m.relatedHazardIds?.some(id=>!/^H-[0-9]{2}$/.test(id))) throw new Error("Invalid related hazard");
 if(!allowed.has(m.severity)||!m.title||!m.consequence||!m.avoidance) throw new Error("Incomplete message");
 if(m.severity==="NOTICE" ? m.hazardId!==null||m.symbol!==null : !/^H-[0-9]{2}$/.test(m.hazardId)||!symbols.has(m.symbol)) throw new Error("Invalid message semantics");
}
export function renderSafety(id,{assetPrefix="assets/",referencePrefix="",instance=1}={}) {
 const m=messages.find(x=>x.id===(aliases[id]||id)); if(!m) throw new Error("Unknown safety message: "+id);
 const title="safety-"+m.id.toLowerCase()+"-"+instance;
 const old=Object.entries(aliases).filter(([,v])=>v===m.id).map(([k])=>k);
 const icon=m.symbol ? '<img class="safety-hazard" src="'+esc(assetPrefix)+'symbols/'+m.symbol+'.svg" alt="'+esc(m.title)+'の危険を表す独自概念図">' : '<span class="safety-info" aria-label="機器・情報に関する注記">i</span>';
 const alert=m.severity==="NOTICE" ? "" : '<svg class="safety-alert" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2L23 22H1Z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 9v6m0 3v1" stroke="currentColor" stroke-width="2"/></svg>';
 return '<section class="safety-message safety-'+m.severity.toLowerCase()+(m.consequence.length+m.avoidance.length>900?" safety-long":"")+'" aria-labelledby="'+title+'" data-message-id="'+m.id+'"><div class="safety-rail">'+icon+'</div><div class="safety-body"><div class="safety-heading"><span class="safety-signal">'+alert+m.severity+'</span> <strong id="'+title+'">'+esc(m.title)+'</strong></div><p class="safety-consequence">'+esc(m.consequence)+'</p><p class="safety-avoidance">'+esc(m.avoidance)+'</p><p class="safety-ref">'+m.id+(old.length?'（旧 '+old.join(" / ")+'）':"")+(m.hazardId?' / '+[m.hazardId,...(m.relatedHazardIds||[])].join(' / '):"")+' · <a href="'+esc(referencePrefix)+'02-safety.html">第2章</a> · <a href="'+esc(referencePrefix)+'appendices/c-warning-labels.html">付録C</a></p></div></section>';
}
export function safetyMarkdown(md,options={}) {
 let serial=0;
 md.block.ruler.before("paragraph","safety_message",(state,line,end,silent)=>{
  const text=state.src.slice(state.bMarks[line]+state.tShift[line],state.eMarks[line]).trim();
  const id=text.startsWith("[[safety:") && text.endsWith("]]") ? text.slice(9,-2) : "";
  const match=/^[WDCN]-[0-9]{2}$/.test(id) ? [text,id] : null;
  if(!match)return false;if(silent)return true;
  const t=state.push("safety_message","",0);t.content=match[1];t.meta={serial:++serial};t.map=[line,line+1];state.line=line+1;return true;
 });
 md.renderer.rules.safety_message=(tokens,i)=>renderSafety(tokens[i].content,{...options,instance:tokens[i].meta.serial})+String.fromCharCode(10);
}
