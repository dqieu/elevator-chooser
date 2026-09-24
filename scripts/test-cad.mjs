import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {search,evaluate} from '../dist/chooser.mjs';
import {drawingFor,toDxf,toSvg} from '../dist/cad.mjs';
import {planGeometry} from '../dist/cad-geometry.mjs';
const out=new URL('../analysis/cad/plan-test/',import.meta.url);mkdirSync(out,{recursive:true});
let count=0,missing=0,mirrors=0,eccentric=0;const samples=[];
function check(r,manual={}){
 const d=drawingFor({...r,outputs:{AH:1}},manual),g=d.geometry,dxf=toDxf(d);
 assert.equal(d.result.outputs.AH,r.outputs.AH);
 assert.equal(g.car.cx,r.outputs.HAXX);assert.equal(g.doors[0].x,r.outputs.DTL);
 assert.equal(g.rails[1].x-g.rails[0].x,g.railGauge);
 assert.equal(g.car.width,r.inputs.AA);assert.equal(g.car.depth,r.inputs.BB);
 assert.ok(Math.abs(g.counter.x-g.car.cx)===(g.counter.back?0:g.source.CA.value));
 if(!r.model.endsWith('-G')){assert.equal(g.railY,g.source.B_3.value+g.source.EE.value);assert.equal(g.counter.y,g.railY+g.source.CD.value)}
 assert.equal(d.dimensions.length,11);assert.equal(d.entities.filter(e=>e.layer==='RAIL').length,56);assert.ok(dxf.includes('DIMENSION'));assert.ok(d.entities.some(e=>e.layer==='HATCH'));assert.equal(d.wallThickness,200);
 assert.ok(!/NaN|Infinity|undefined/.test(dxf));assert.ok(dxf.endsWith('EOF\r\n'));
 assert.ok(d.entities.some(e=>e.layer==='CENTER'));assert.ok(d.entities.some(e=>e.layer==='RAIL'));
 const name=d.filename+'-'+r.inputs.DRKI+'-'+r.inputs.POCW+'-'+count;
 writeFileSync(new URL(name+'.dxf',out),dxf);writeFileSync(new URL(name+'.svg',out),toSvg(d));
 samples.push({name,model:r.model,inputs:r.inputs,outputs:r.outputs,manual,car:g.car,rails:g.rails,counter:g.counter,source:g.source});count++;
 return g;
}
for(const doorType of ['CO','SO','2CO'])for(const r of search({capacity:1000,doorType}).results){
 const g=planGeometry(r);
 if(g.missing.length){assert.deepEqual(g.missing,['railGauge','railY','counterY']);assert.throws(()=>drawingFor(r),/bổ sung/);missing++;continue}
 check(r);
 const mirrored=evaluate(r.model,{...r.inputs,POCW:r.inputs.POCW==='LB'?'RB':r.inputs.POCW==='RB'?'LB':'BACK',DRKI:r.inputs.DRKI==='2SL'?'2SR':r.inputs.DRKI==='2SR'?'2SL':r.inputs.DRKI});
 if(!mirrored.errors.length){const mg=check(mirrored);if(r.inputs.POCW!=='BACK'){assert.equal(mg.car.cx+r.outputs.HAXX,r.outputs.AH);assert.equal(mg.doors[0].x+r.outputs.DTL,r.outputs.AH);mirrors++}}
 if(doorType==='CO')for(const DRDI of ['L','R']){const e=evaluate(r.model,{...r.inputs,DRDI,DRE:50});if(!e.errors.length){check(e);assert.notEqual(e.outputs.DTL,e.outputs.HAXX);eccentric++}}
}
const r=search({capacity:1000}).results[0];assert.throws(()=>drawingFor({...r,inputs:{...r.inputs,AA:-1}}),/chưa hợp lệ/);
assert.throws(()=>drawingFor(r,{wallThickness:-1}),/Dày vách/);assert.throws(()=>drawingFor(r,{openingAllowance:NaN}),/Chừa cửa/);
const bare=drawingFor(r,{wallThickness:0,openingAllowance:100});assert.equal(bare.wallThickness,0);assert.ok(!bare.entities.some(e=>e.layer==='HATCH'));
const goods=search({capacity:1000,application:'goods'}).results[0];
// Synthetic engineering inputs exercise the manual path, not manufacturer defaults.
check(goods,{railGauge:goods.inputs.AA+160,railY:goods.outputs.BH/2,counterY:goods.outputs.BH/2});
assert.throws(()=>drawingFor(goods,{railGauge:goods.inputs.AA+160,railY:goods.outputs.BH/2,counterY:1}),/vượt/);
const through=search({capacity:1000,entrance:'1D/2D-2G',application:'passenger'}).results[0];
assert.ok(through);const tg=planGeometry(through);if(tg.autoRear){assert.equal(tg.doors[1].x,through.outputs.HAXX);check(through)}else{assert.ok(tg.missing.includes('rearDoorX'));check(through,{rearDoorX:through.outputs.DTL})}
writeFileSync(new URL('manifest.json',out),JSON.stringify(samples,null,2));
assert.ok(mirrors>0);assert.ok(eccentric>0);
console.log(`CAD plan: ${count} exports; ${missing} missing-geometry gates; ${mirrors} mirror checks; ${eccentric} eccentric doors; through entrance and invalid coordinate guards passed.`);
