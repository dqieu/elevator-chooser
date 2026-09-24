import assert from 'node:assert/strict';
import {areaBand,maximumArea,minimumArea,areaAssessment,areaErrors} from '../dist/en81.mjs';
import {search,evaluate,Workbook,models} from '../dist/chooser.mjs';
const near=(actual,expected)=>assert(Math.abs(actual-expected)<1e-9,`${actual} != ${expected}`);
// Independently transcribed representative table entries and interpolation.
for(const [q,min,max] of [[450,1.17,1.3],[630,1.45,1.66],[1050,2.29,2.5],[1600,3.245,3.56],[2500,4.625,5]]){const b=areaBand(q);near(b.minimum,min);near(b.maximum,max)}
near(maximumArea(320),.90+20/75*.20);near(maximumArea(1165),2.73);near(maximumArea(3000),5.8);near(maximumArea(10000),17);
near(minimumArea(20),3.13);near(minimumArea(21),3.245);
assert.equal(areaBand(5000,true).minimum,null);
const normal=search({capacity:630,application:'passenger',doorType:'CO'}).results.find(r=>r.model==='LEHY-L-S');
assert(normal);
const tooSmall=evaluate(normal.model,{...normal.inputs,AA:1100,BB:1300});assert(tooSmall.area.below);assert(tooSmall.errors.some(e=>e.cell.includes('Bảng 8')));assert.deepEqual(tooSmall.outputs,{});
const tooLarge=evaluate(normal.model,{...normal.inputs,AA:1300,BB:1300});assert(tooLarge.area.above);assert(tooLarge.errors.length);
for(const area of [1.45,1.66])assert.equal(areaErrors({...areaBand(630),area,below:false,above:false}).length,0);
for(const doorType of ['CO','SO','2CO']){
 const found=search({capacity:1600,application:'passenger',doorType});assert(found.results.length,doorType);
 for(const r of found.results){assert(!r.area.below&&!r.area.above);near(r.area.minimum,minimumArea(Math.floor(r.inputs.CAP/75)));assert(r.area.area<=maximumArea(r.inputs.CAP)+1e-9);assert(doorType==='SO'?['2SL','2SR'].includes(r.inputs.DRKI):r.inputs.DRKI===doorType);assert.deepEqual(evaluate(r.model,r.inputs).outputs,r.outputs)}
}
// 2CO entrance area is included; single/two entrances must not be collapsed to AA*BB.
for(const entrance of ['1D1G','1D/2D-2G']){
 const w=new Workbook(models.find(m=>m.id==='LEHY-Pro')).set({CAP:1600,AA:1800,BB:1800,JJ:1400,DRKI:'2CO',ENTR:entrance});
 near(areaAssessment(w).area,3.24+(entrance==='1D1G'?1:2)*((700+20)*84+(700-20)*120)/1e6);
}
const w=new Workbook(models.find(m=>m.id==='LEHY-L-S')).set({...normal.inputs,AA:1000,DRKI:'CO'});
for(const [depth,below,above] of [[1449,true,false],[1450,false,false],[1660,false,false],[1661,false,true]]){w.set({BB:depth});const a=areaAssessment(w);assert.equal(a.below,below);assert.equal(a.above,above)}
console.log('EN81 table points, interpolation, exact boundaries, lower/upper rejection, CO/SO/2CO, entrances and source recalculation passed.');

// Opt-out removes only the app's extra EN area gate, and survives CAD re-evaluation.
const {drawingFor,toDxf}=await import('../dist/cad.mjs');
const {sectionDrawingFor}=await import('../dist/cad-section.mjs');
const optedOut=evaluate(normal.model,tooSmall.inputs,{en81:false});
assert.equal(optedOut.en81,false);assert.equal(optedOut.area.enforced,false);
assert(optedOut.area.below);assert.equal(optedOut.errors.length,0);assert(optedOut.outputs.AH>0);
assert(evaluate(normal.model,optedOut.inputs).errors.some(e=>e.cell.includes('Bảng 8')));
assert(evaluate(normal.model,{...optedOut.inputs,AA:-1},{en81:false}).errors.length);
assert(evaluate(normal.model,tooLarge.inputs,{en81:false}).errors.length,'Manufacturer area limits remain active');
const fixed={capacity:630,application:'passenger',doorType:'CO',carWidth:1100,carDepth:1300};
assert.equal(search(fixed).results.length,0);
const offResults=search({...fixed,en81:false}).results;assert(offResults.length);
for(const r of offResults){assert.equal(r.en81,false);assert.equal(r.area.enforced,false);assert.deepEqual(evaluate(r.model,r.inputs,{en81:false}).outputs,r.outputs)}
const stdModel=models.find(m=>m.inputs.STD),defaultSTD=new Workbook(stdModel).get('STD');
assert.equal(offResults.find(r=>r.model===stdModel.id).inputs.STD,defaultSTD);
for(const draw of [drawingFor,sectionDrawingFor]){
 const d=draw(optedOut);assert.equal(d.result.en81,false);assert.equal(d.result.area.enforced,false);
 assert(toDxf(d).includes('App EN 81-20 area filter: OFF'));
 assert(d.entities.some(e=>e.type==='text'&&e.value.includes('EN 81-20: OFF')));
 assert.throws(()=>draw({...optedOut,en81:true}),/chưa hợp lệ/);
}
for(const en81 of ['false',0,null]){assert.throws(()=>search({...fixed,en81}),/EN 81-20/);assert.throws(()=>evaluate(normal.model,normal.inputs,{en81}),/EN 81-20/)}
console.log('EN opt-out: default on, on/off/on, manufacturer gates, search STD and CAD plan/section policy propagation passed.');
