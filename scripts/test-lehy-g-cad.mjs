import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {evaluate} from '../dist/chooser.mjs';
import {planGeometry} from '../dist/cad-geometry.mjs';
import {lehyGGeometry,lehyGProfiles} from '../dist/cad-assets/lehy-g.mjs';
import {drawingFor,toDxf,toSvg} from '../dist/cad.mjs';
const out=new URL('../analysis/cad/smec-g/generated/',import.meta.url);mkdirSync(out,{recursive:true});
// Independent expected values from source TABLE 102 formulas, not measured schematic lines.
const fixtures=[
 {CAP:2000,AA:1500,BB:2620,JJ:1500,YOTO:'标准版',expected:[1660,1604.5,1664.5]},
 {CAP:3000,AA:2200,BB:2500,JJ:1800,YOTO:'标准版',expected:[2380,1544.5,1604.5]},
 {CAP:5000,AA:2500,BB:3200,JJ:2000,YOTO:'叉车版',expected:[2680,1894.5,1954.5]},
 {CAP:10000,AA:3300,BB:5020,JJ:2500,YOTO:'叉车版',expected:[3600,2814.5,3034.5]},
];
let count=0;
for(const {expected,...inputs} of fixtures){
 const geometries=[];
 for(const POCW of ['LB','RB']){
  const r=evaluate('LEHY-G',{...inputs,POCW,HL:2400,HH:2300,DRTP:'NO'},{en81:false});assert.deepEqual(r.errors,[]);
  const g=planGeometry(r);assert.deepEqual(g.missing,[]);assert.deepEqual(g.required,[]);assert.deepEqual(g.manual,{});
  assert.deepEqual([g.railGauge,g.railY,g.counter.y],expected);assert.match(g.source.BG.cell,/TABLE 102/);assert.equal(g.source.BG.sha256.length,64);
  const d=drawingFor(r),dxf=toDxf(d);assert.ok(dxf.includes(g.template.sha256));assert.equal(d.dimensions.length,11);
  writeFileSync(new URL(`${inputs.CAP}-${POCW}.dxf`,out),dxf);writeFileSync(new URL(`${inputs.CAP}-${POCW}.svg`,out),toSvg(d));
  geometries.push(g);count++;
 }
 assert.equal(geometries[0].counter.x+geometries[1].counter.x,geometries[0].result.outputs.AH);
 assert.equal(geometries[0].railY,geometries[1].railY);
}
const i={CAP:5000,AA:2500,BB:3200,SPD:0.5,ENTR:'1D1G',DRKI:'2CO',POCW:'LB'};
const source={A_S:2600,BS:3429,B_3:180,KAKK:80,DKWC:119};
assert.ok(lehyGGeometry('LEHY-G',i,source));
for(const change of [{DRKI:'3CO'},{POCW:'BACK'},{AA:1999},{BB:3601},{SPD:1.5}])assert.equal(lehyGGeometry('LEHY-G',{...i,...change},source),null);
assert.equal(lehyGGeometry('LEHY-L-G',i,source),null);
assert.equal(lehyGGeometry('LEHY-G',i,{...source,BS:3430}),null);
for(const p of lehyGProfiles)for(const AA of p.width)for(const BB of p.depth){
 const ii={...i,CAP:p.capacity,AA,BB};const v={...source,A_S:AA+(p.capacity===2000?80:100),BS:BB+(p.capacity===10000?249:229)};
 assert.ok(lehyGGeometry('LEHY-G',ii,v));
}
const through=evaluate('LEHY-G',{ENTR:'1D/2D-2G'},{en81:false});assert.deepEqual(through.errors,[]);
const gt=planGeometry(through);assert.deepEqual(gt.missing,[]);assert.equal(gt.autoRear,true);assert.equal(gt.doors[1].x,through.outputs.HAXX);assert.equal(gt.railY,1979);assert.equal(gt.counter.y,2039);assert.match(gt.template.file,/-22-1/);
console.log(`LEHY-G: ${count} source-based plans; four loads, mirror pairs, source bounds, provenance and manual fallback passed.`);
