import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {models,Workbook,evaluate,search,validateRequest} from '../dist/chooser.mjs';
let checks=0;const check=(condition,message)=>{assert.ok(condition,message);checks++};
const started=performance.now();
for(const m of models){
 const w=new Workbook(m);
 for(const key of Object.keys(m.formulas))w.cell(key);
 checks+=Object.keys(m.formulas).length;
 const baseline=evaluate(m.id,{});check(!baseline.errors.length,m.id+' saved configuration');
 const before=w.get('AA');w.set({AA:before+50});
 const fresh=new Workbook(m).set(w.snapshot());
 for(const key of Object.keys(m.formulas))assert.deepEqual(w.cell(key),fresh.cell(key),m.id+' incremental '+key);
 checks+=Object.keys(m.formulas).length;
 w.set({AA:before});for(const [key,value] of Object.entries(baseline.outputs))check(w.get(key)===value,m.id+' restored '+key);
 const invalid=evaluate(m.id,{AA:-50});check(invalid.errors.length>0&&!Object.keys(invalid.outputs).length,m.id+' reject negative width');
}
const allCaps=[...new Set(models.flatMap(m=>new Workbook(m).options('CAP')))].sort((a,b)=>a-b),runs=[];
for(const capacity of allCaps){
 const result=search({capacity});check(result.results.length>0,'at least one configuration for '+capacity);
 for(const r of result.results){
  check(r.inputs.CAP>=capacity,'minimum capacity');
  const exact=evaluate(r.model,r.inputs);check(exact.errors.length===0,'source conditions '+r.model);assert.deepEqual(exact.outputs,r.outputs);checks++;
 }
 runs.push({capacity,matches:result.results.length,examined:result.examined});
}
const sample=search({capacity:630,application:'passenger'}).results[0],o=sample.outputs;
const fixed={capacity:630,application:'passenger',carWidth:sample.inputs.AA,carDepth:sample.inputs.BB,doorWidth:sample.inputs.JJ,width:o.AH,depth:o.BH,overhead:o.OH,pit:o.PD};
check(search(fixed).results.some(r=>r.model===sample.model),'equal dimensional boundaries accepted');
for(const [key,out] of [['width','AH'],['depth','BH'],['overhead','OH'],['pit','PD']]){
 const request={...fixed,[key]:o[out]-1};const r=search(request);
 check(r.results.every(v=>v.outputs[out]<=request[key]),'one mm too small excluded '+key);
}
const margin=50,roomy=search({capacity:1050,width:3000,depth:3000,overhead:6000,pit:3000,margin,entrance:'1D/2D-2G',fire:'YES',safety:'YES',speed:1.75,travel:60});
check(roomy.results.length>0,'through doors with safety/fire constraints');
for(const r of roomy.results){check(r.inputs.ENTR==='1D/2D-2G'&&r.inputs.DRTP==='YES'&&r.inputs.GOVO==='YES','flags retained');for(const [k,v] of [['AH',3000],['BH',3000],['OH',6000],['PD',3000]])check(r.outputs[k]+margin<=v,'margin respected');}
check(search({capacity:630,width:100,depth:100}).results.length===0,'impossible shaft');
check(search({capacity:630,application:'forklift'}).results[0]?.inputs.CAP===3000,'forklift increases capacity to allowed minimum');
check(search({capacity:630,application:'car'}).results[0]?.inputs.CAP===10000,'car increases capacity to allowed minimum');
for(const m of models.filter(m=>['LEHY-Pro','LEHY-L-Pro'].includes(m.id)))for(const cap of [1000,1150,1165])check(!new Workbook(m).options('CAP').includes(cap),'unreleased capacity excluded '+m.id+' '+cap);
check(new Workbook(models.find(m=>m.id==='LEHY-L-S')).options('CAP').includes(1165),'released L-S 1165 available');
for(const request of [{capacity:0},{capacity:-1},{capacity:NaN},{capacity:10001},{capacity:630,width:-10},{capacity:630,margin:-1},{capacity:630,travel:0},{capacity:630,application:'unknown'}]){assert.throws(()=>validateRequest(request));checks++}
const badGrid=evaluate('LEHY-L-S',{AA:851});check(badGrid.errors.some(e=>e.text.includes('bội số')),'dimension step enforced');
const overArea=evaluate('LEHY-L-S',{CAP:320,AA:1200,BB:1500});check(overArea.errors.some(e=>e.text.includes('Diện tích cabin')),'area limit enforced');
const badCap=evaluate('LEHY-L-Pro',{CAP:1000});check(badCap.errors.some(e=>e.text.includes('ngoài danh sách')),'exact editor cannot accept unreleased capacity');
const doorOffset=evaluate('LEHY-L-S',{DRDI:'NO',DRE:20});check(doorOffset.errors.some(e=>e.text.includes('Default')),'offset consistency enforced');
const report={checks,formulaCount:models.reduce((n,m)=>n+Object.keys(m.formulas).length,0),seconds:(performance.now()-started)/1000,runs};
writeFileSync(new URL('../analysis/chooser-tests.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
