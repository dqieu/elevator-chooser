import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {evaluate,search,models,Workbook} from '../dist/chooser.mjs';
import {drawingPairFor} from '../dist/cad-pair.mjs';
import {drawingFor,toDxf,toSvg} from '../dist/cad.mjs';
import {sectionDrawingFor,sectionGeometry} from '../dist/cad-section.mjs';
import {cadReference} from '../dist/cad-reference.mjs';
import {planGeometry} from '../dist/cad-geometry.mjs';
const out=new URL('../analysis/cad/model-review/',import.meta.url);mkdirSync(out,{recursive:true});
const manifest=[];
for(const model of models){
 let r;
 if(model.id==='LEHY-G')r=evaluate(model.id,{}, {en81:false});
 else if(model.id==='LEHY-L-G')r=evaluate(model.id,{ENTR:'1D1G'}, {en81:false});
 else r=search({capacity:630,doorType:'CO',application:'passenger',en81:false}).results.find(v=>v.model===model.id);
 assert.ok(r);r=evaluate(r.model,r.inputs,{en81:false});assert.deepEqual(r.errors,[]);
 const options={stops:5,floorHeights:'4200;3300;3300;3600'};
 if(r.model==='LEHY-L-G'){
  assert.deepEqual(planGeometry(r).missing,['railGauge','railY','counterY']);
  // Manual synthetic inputs exercise the remaining fallback, never treated as source rules.
  options.railGauge=r.inputs.AA+160;options.railY=r.outputs.BH/2;options.counterY=r.outputs.BH/2;
 }
 if(!r.model.startsWith('LEHY-L-')&&!r.outputs.HM){
  assert.ok(sectionGeometry(r,options).warnings.some(v=>/phòng máy|HM/.test(v)));
  options.machineRoomHeight=2500; // Explicit synthetic project input, not a manufacturer default.
 }
 const d=drawingPairFor(r,options),{plan,section}=d.sheets;
 assert.deepEqual(plan.result.inputs,section.result.inputs);assert.deepEqual(plan.result.outputs,section.result.outputs);
 assert.equal(section.geometry.travel,14400);assert.equal(section.orientation,'vertical');
 assert.equal(d.dimensions.length,plan.dimensions.length+section.dimensions.length);
 assert.equal(d.entities.length,plan.entities.length+section.entities.length);
 assert.equal(section.geometry.room===0,r.model.startsWith('LEHY-L-'));
 assert.equal(section.geometry.roughHead,r.model.startsWith('LEHY-L-')?0:70);
 const dxf=toDxf(d);assert.ok(!/NaN|Infinity|undefined/.test(dxf));
 if(plan.reference.file)assert.ok(dxf.includes(plan.reference.sha256));
 if(section.reference.file)assert.ok(dxf.includes(section.reference.sha256));
 for(const [kind,drawing]of [['pair',d],['plan',plan],['section',section]]){
  const name=r.model.replaceAll(' ','_')+'-'+kind;
  writeFileSync(new URL(name+'.dxf',out),toDxf(drawing));writeFileSync(new URL(name+'.svg',out),toSvg(drawing));
  manifest.push({name,model:r.model,kind,manual:options,planReference:plan.reference,sectionReference:section.reference,expectedDimensions:drawing.dimensions.map(v=>Math.hypot(v.b[0]-v.a[0],v.b[1]-v.a[1]))});
 }
}
// Original drawing snapshots are independent of the workbook formulas.
for(const [CAP,AA,BB,BG,EE] of [[630,1100,1400,1200,570],[825,1400,1400,1500,570],[1000,1600,1400,1700,570],[1050,1600,1500,1700,670]]){
 const r=evaluate('LEHY-L-S',{CAP,AA,BB,JJ:800,WADD:0,WG:650,WW:260,DRDI:'NO',DRE:'Default'},{en81:false});assert.deepEqual(r.errors,[]);
 const g=planGeometry(r);assert.equal(g.source.BG.value,BG);assert.equal(g.source.EE.value,EE);assert.equal(cadReference(r,'plan',g).issues.length,0);
 const t=evaluate(r.model,{...r.inputs,ENTR:'1D/2D-2G'},{en81:false});assert.deepEqual(t.errors,[]);assert.equal(planGeometry(t).autoRear,true);
 assert.equal(planGeometry(t).doors[1].x,t.outputs.HAXX);
 const e=evaluate(r.model,{...t.inputs,DRDI:'R',DRE:20},{en81:false});if(!e.errors.length)assert.ok(planGeometry(e).missing.includes('rearDoorX'));
}
const deep=evaluate('LEHY-L-S',{CAP:1050,AA:1100,BB:2100,JJ:800,WADD:0,WG:650,WW:260,DRDI:'NO',DRE:'Default'},{en81:false});
assert.deepEqual(deep.errors,[]);assert.match(cadReference(deep,'plan',planGeometry(deep)).issues.join(' '),/Excel 1002.*1003/);
assert.equal(cadReference(evaluate('LEHY-L-G',{}, {en81:false})).file,null);
writeFileSync(new URL('manifest.json',out),JSON.stringify(manifest,null,2));
console.log(`${manifest.length} sheets: six families, synchronized pair export, upright sections, source snapshots, centered rear doors, MRL room exclusion and retained source discrepancy passed.`);
