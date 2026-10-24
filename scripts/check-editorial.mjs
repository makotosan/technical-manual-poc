import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {publication} from "../lib/publication.mjs";
import {messages,aliases} from "../lib/safety-messages.mjs";
const json=async path=>JSON.parse(await readFile(path,"utf8"));
const [spec,hazardData,residual,standards,visuals,review]=await Promise.all(["machine-spec.yaml","hazards.yaml","residual-risks.yaml","standards-mapping.yaml","visual-inventory.json","editorial-review.json"].map(x=>json("sample-data/"+x)));
const sources=new Map(await Promise.all(publication.chapters.map(async c=>[c.id,await readFile(c.source,"utf8")])));
for(const c of publication.chapters)for(const role of c.audiences)if(role!=="全担当者")assert(sources.get("ch-01").includes(role),"Undocumented audience: "+role);
const messageMap=new Map(messages.map(m=>[m.id,m]));
const sections=(text)=>text.split(/(?=^#{1,4} )/m);
let placements=0;
for(const [id,text] of sources){
 for(const part of sections(text)){
  const used=[...part.matchAll(/\[\[safety:([WDCN]-\d{2})\]\]/g)].map(m=>m[1]);
  assert.equal(new Set(used).size,used.length,"Duplicate warning in section: "+id+" "+part.split("\n")[0]);
  for(const m of used){assert(messageMap.has(m),"Unknown/legacy warning: "+m);placements++;}
 }
}
for(const h of hazardData.hazards){
 const m=messageMap.get(h.message_id);assert(m,h.id);
 assert.equal(h.message_id,aliases[h.legacy_message]||h.legacy_message);
 assert([m.hazardId,...(m.relatedHazardIds||[])].includes(h.id));
 for(const comp of h.components)assert(spec.components[comp],comp);
 for(const chapter of [h.general_location,...h.chapters])assert(sources.get(chapter)?.includes("[[safety:"+h.message_id+"]]"),h.id+" warning absent in "+chapter);
}
assert.equal(residual.records.length,12);
for(const r of residual.records){
 assert(hazardData.hazards.some(h=>h.id===r.hazard_id),r.id);
 assert.equal(r.message_id,aliases[r.legacy_message]||r.legacy_message);
 assert(sources.get("app-c").includes(r.id),r.id);
 assert(sources.get("app-c").includes(r.message_id),r.message_id);
}
for(const [chapter,heading,warning] of [["ch-09","9.5","W-02"],["ch-10","10.5","W-02"],["ch-11","11.6","W-03"],["ch-11","11.6","W-04"]]){
 const part=sections(sources.get(chapter)).find(s=>s.startsWith("## "+heading+" "));
 assert(part?.includes("[[safety:"+warning+"]]"),"Point-of-use warning: "+chapter+" "+heading);
}
const compact=s=>s.replace(/\s/g,"").replace(/[〜～]/g,"~");
const ch3=compact(sources.get("ch-03")), appA=compact(sources.get("app-a"));
const drawing=compact(await readFile("manual-v02/assets/figures/fig-03-03-installation-space.svg","utf8"));
assert(ch3.includes("搬送方向"+spec.envelope_mm[0]+"×奥行"+spec.envelope_mm[1]+"×高さ"+spec.envelope_mm[2]+"mm"));
assert(appA.includes(spec.envelope_mm.join("/")+"mm"));
for(const s of [ch3,appA,drawing])assert(s.includes(spec.mass_kg+"kg"),"Mass differs from baseline");
assert(drawing.includes("搬送方向："+spec.envelope_mm[0]+"mm"));assert(drawing.includes("奥行："+spec.envelope_mm[1]+"mm"));
for(const s of [ch3,appA]){
 assert(s.includes("AC100V")&&s.includes("50/60Hz")&&s.includes("DC24V"));
 assert(s.includes(spec.electrical.input_current_A_mock_max+"A"));
}
const speed=spec.belt.speed_m_per_s.map(n=>n.toFixed(2)).join("~")+"m/s";
for(const chapter of ["ch-03","ch-07"])assert(compact(sources.get(chapter)).includes(speed));
assert.equal(spec.electrical.input_apparent_power_VA_mock_max,100*spec.electrical.input_current_A_mock_max);
assert.equal(.2/(spec.workpiece.pitch_mm_min/1000)*60,60);
const stateTable=sources.get("ch-03").split("## 3.8")[1].split("## 3.9")[0];
for(const state of spec.states)assert(stateTable.includes("| "+state.split("（")[0]+" |"),"Missing state: "+state);
assert(stateTable.includes("通電運転モードではない"));
assert.equal(standards.clause_assessments.length,45);
for(const row of standards.clause_assessments)assert(row.clause&&row.assessment&&row.evidence&&row.finding);
assert(standards.editorial_review.conformance_owner.includes("#22"));
for(const f of visuals.figures){
 assert([...sources.values()].some(s=>s.includes(f.path.split("/").at(-1))),f.id);
 if(f.path.endsWith(".svg")){
  const svg=await readFile(f.path,"utf8");
  for(const id of new Set(svg.match(/\b(?:M0[1-9]|S0[1-9]|G0[1-9]|A0[1-9]|CP0[1-9]|EC0[1-9]|BZ0[1-9]|NP0[1-9])\b/g)||[]))assert(spec.components[id],f.id+" unknown component "+id);
 }
}
assert(review.findings.filter(f=>f.priority==="high").every(f=>f.status==="resolved"||f.status==="deferred-22"));
const result={chapters:sources.size,hazards:hazardData.hazards.length,residualRisks:residual.records.length,warningPlacements:placements,figures:visuals.figures.length,clauses:standards.clause_assessments.length,humanSignOff:"pending-pr-review"};
console.log("PASS editorial consistency:",JSON.stringify(result));
