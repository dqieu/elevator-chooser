import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {search,evaluate,models} from '../dist/chooser.mjs';
import {sectionGeometry,sectionDrawingFor} from '../dist/cad-section.mjs';
import {toDxf,toSvg} from '../dist/cad.mjs';
const out=new URL('../analysis/cad/section-test/',import.meta.url);mkdirSync(out,{recursive:true});
const samples=[];
const candidates=[...search({capacity:1000,doorType:'CO'}).results,...search({capacity:1000,application:'goods'}).results];
function check(r,options){
 const d=sectionDrawingFor({...r,outputs:{BH:1,OH:1,PD:1}},options),g=d.geometry,m=models.find(m=>m.id===r.model);
 assert.equal(g.levels.length,options.stops);assert.equal(g.levels[0],0);
 assert.equal(g.travel,g.heights.reduce((a,b)=>a+b,0));assert.equal(g.top,g.travel+d.result.outputs.OH);assert.equal(g.pit,-d.result.outputs.PD);
 if(m.inputs.TR)assert.equal(d.result.inputs.TR,r.model==='LEHY-L-G'?(g.travel<=30000?'<=30':'>30'):g.travel/1000);
 const recalculated=evaluate(r.model,d.result.inputs);assert.deepEqual(d.result.outputs,recalculated.outputs);
 const measured=d.dimensions.map(v=>v.rotation===0?Math.abs(v.b[0]-v.a[0]):Math.abs(v.b[1]-v.a[1]));
 const expected=[...g.heights.flatMap(v=>[r.inputs.HH,v]),r.inputs.HH,d.result.outputs.OH,g.travel,d.result.outputs.PD,g.top-g.pit,r.inputs.BB,...g.room?[g.room]:[]];
 assert.deepEqual(measured,expected);
 const dxf=toDxf(d);assert.ok(!/NaN|Infinity|undefined/.test(dxf));
 assert.equal(d.entities.filter(e=>e.type==='text'&&e.value.startsWith('Tầng ')).length,options.stops);
 const name=d.filename+'-'+samples.length;
 writeFileSync(new URL(name+'.dxf',out),dxf);writeFileSync(new URL(name+'.svg',out),toSvg(d));
 samples.push({name,options,model:r.model,inputs:d.result.inputs,outputs:d.result.outputs,levels:g.levels,expectedDimensions:expected});return d;
}
for(const r of candidates){check(r,{stops:2,floorHeight:3300});check(r,{stops:5,floorHeights:'4200; 3300; 3300; 3600'});check(r,{stops:12,floorHeight:3300});}
const r=candidates[0],mr=candidates.find(c=>!c.model.startsWith('LEHY-L-'));
check(mr,{stops:5,floorHeight:3300,machineRoomHeight:Math.max(2800,mr.outputs.HM??0)});
assert.throws(()=>sectionGeometry(r,{machineRoomHeight:2800}),/không phòng máy/);
assert.ok(!sectionGeometry(r).warnings.some(w=>w.includes('phòng máy')));
assert.equal(sectionDrawingFor(r).orientation,'vertical');
assert.equal(sectionDrawingFor(r,{orientation:'horizontal'}).orientation,'horizontal');
check(r,{stops:3,floorHeights:[3200,4100]});
check(r,{stops:60,floorHeight:3300});
const through=search({capacity:1000,entrance:'1D/2D-2G',application:'passenger'}).results[0];check(through,{stops:5,floorHeight:3300});
for(const stops of [1,0,-1,3.5,61,NaN,Infinity])assert.throws(()=>sectionGeometry(r,{stops}),/Số điểm dừng/);
for(const floorHeights of ['3300;3300','3300;3300;abc;3300','3300;;3300;0;3300','3300;3300;-1;3300'])assert.throws(()=>sectionGeometry(r,{stops:5,floorHeights}));
assert.throws(()=>sectionGeometry(r,{floorHeight:1e100}),/20000/);
assert.equal(sectionGeometry(r,{stops:2,floorHeight:3300}).result.outputs.OH,3750);
assert.equal(sectionGeometry(r,{stops:20,floorHeight:3300}).result.outputs.OH,3800);
assert.throws(()=>sectionGeometry(r,{floorHeight:2100}),/chồng nhau/);
assert.throws(()=>sectionGeometry(r,{wallThickness:0}),/Dày vách/);
assert.throws(()=>sectionGeometry(r,{machineRoomHeight:-1}),/Cao phòng máy/);
assert.throws(()=>sectionGeometry({...r,inputs:{...r.inputs,AA:-1}}),/chưa hợp lệ/);
const goods=candidates.find(c=>c.model==='LEHY-G');assert.ok(goods);assert.throws(()=>sectionGeometry(goods,{machineRoomHeight:1}),/HM/);
// The source's categorical travel branch must flip at 30 m, including exact boundary.
const lg=candidates.find(c=>c.model==='LEHY-L-G');assert.ok(lg);
assert.equal(sectionGeometry(lg,{stops:11,floorHeight:3000}).result.inputs.TR,'<=30');
assert.equal(sectionGeometry(lg,{stops:11,floorHeight:3001}).result.inputs.TR,'>30');
writeFileSync(new URL('manifest.json',out),JSON.stringify(samples,null,2));
console.log(`${samples.length} sections: all six families, 2/5/12/60 stops, uneven heights, travel recomputation, room/through variants, dimensions and invalid-input guards passed.`);

// Travel must not stretch the physical counterweight/buffer body.
const extent=(d,part)=>{const es=d.entities.filter(e=>e.sourcePart===part);const ys=es.flatMap(e=>[e.y1,e.y2]);return Math.max(...ys)-Math.min(...ys)};
const short=sectionDrawingFor(mr,{stops:4,floorHeight:3300});
const tall=sectionDrawingFor(mr,{stops:8,floorHeight:3300});
assert.ok(Math.abs(extent(short,'mrCounterBuffer')-extent(tall,'mrCounterBuffer'))<1e-6);
const roomChanged=sectionDrawingFor(mr,{stops:4,floorHeight:3300,machineRoomHeight:Math.max(4000,mr.outputs.HM??0)});
assert.ok(Math.abs(extent(short,'mrMachine')-extent(roomChanged,'mrMachine'))<1e-6);
assert.ok(short.entities.some(e=>e.referenceGraphic&&e.color===3));
assert.ok(!short.entities.some(e=>e.layer==='HATCH'));
