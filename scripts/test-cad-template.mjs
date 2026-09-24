import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {evaluate,search,models} from '../dist/chooser.mjs';
import {drawingPackageFor} from '../dist/cad-pair.mjs';
import {drawingFor,toDxf,toSvg} from '../dist/cad.mjs';
import {userTemplate} from '../dist/cad-assets/user-template.mjs';
import {sectionGeometry} from '../dist/cad-section.mjs';
const out=new URL('../analysis/cad/template-test/',import.meta.url);mkdirSync(out,{recursive:true});
let encode;
if(process.argv.includes('--dwg')){const wasm=await import('../dist/cad-assets/dwg/elevator_dwg.js');await wasm.default({module_or_path:readFileSync(new URL('../dist/cad-assets/dwg/elevator_dwg_bg.wasm',import.meta.url))});encode=wasm.encode_dwg;mkdirSync(new URL('dwg/',out),{recursive:true});}
const manifest=[];
for(const model of models){
 const r=model.id==='LEHY-G'?evaluate(model.id,{}, {en81:false}):model.id==='LEHY-L-G'?evaluate(model.id,{ENTR:'1D1G'}, {en81:false}):search({capacity:630,doorType:'CO',application:'passenger',en81:false}).results.find(v=>v.model===model.id);
 const options={stops:4,floorHeights:'4200;3300;3600',projectName:'Công trình thử nghiệm',liftName:'P1',powerSupply:'Theo hồ sơ điện'};
 if(model.id==='LEHY-L-G')Object.assign(options,{railGauge:r.inputs.AA+160,railY:r.outputs.BH/2,counterY:r.outputs.BH/2});
 const mrl=model.id.startsWith('LEHY-L-');if(!mrl)options.machineRoomHeight=r.outputs.HM??2500;
 const baseline=sectionGeometry(r,options);options.OH=baseline.result.outputs.OH+500;options.PD=baseline.result.outputs.PD+300;
 const d=drawingPackageFor(r,options),g=d.sheets.section.geometry;
 assert.equal(g.top,11100+options.OH);assert.equal(g.pit,-options.PD);
 assert.equal(g.result.outputs.OH,baseline.result.outputs.OH); // minimum remains a source value
 assert.equal(d.sheets.plan.project.values.OH,options.OH);
 const mechanism=g.mechanics;
 for(const role of ['machine','ropes','pitAssembly','carAssembly','hook','landingDoor'])assert.ok(mechanism.components[role]>0,model.id+' missing '+role);
 assert.equal(d.sheets.section.dimensions.filter(v=>v.label===`hh.${r.inputs.HH}`).length,g.stops);
 assert.ok(d.sheets.section.entities.some(e=>e.type==='text'&&e.value==='Móc treo palang (*)'));
 assert.equal(mechanism.sha256,userTemplate.sha256);assert.equal(mechanism.carLevel,g.travel);
 assert.deepEqual(mechanism.xKnots.at(-1),[2455,r.outputs.BH]);
 assert.ok(d.sheets.section.entities.some(e=>e.component==='machine'&&e.sourceHandle));
 const originalSegments=mechanism.parts.flatMap(k=>userTemplate.parts[k].records).reduce((sum,r)=>sum+r.segments.length,0);
 assert.ok(d.sheets.section.entities.filter(e=>e.referenceGraphic&&e.component!=='landingDoor').length>=originalSegments);
 assert.ok(d.sheets.section.entities.some(e=>e.type==='text'&&e.value==='XÁC NHẬN CỦA CHỦ ĐẦU TƯ'));
 for(const field of ['T.GIÁM ĐỐC','THIẾT KẾ','KIỂM','DUYỆT'])assert.ok(d.sheets.section.entities.some(e=>e.type==='text'&&e.value===field));
 assert.ok(!d.sheets.specification.entities.some(e=>e.type==='text'&&/MẪU THAM KHẢO/.test(e.value)));
 assert.equal(d.sheets.specification.rows.find(([k])=>k==='Nguồn động lực')[1],'Theo hồ sơ điện');
 if(!mrl){
  const defaults=drawingPackageFor(r,{...options,roomOpenings:''}),room=defaults.sheets.machineRoom.roomDetails;
  assert.equal(room.openings.length,3);const manual=drawingPackageFor(r,{...options,roomOpenings:'a,100,100,250,250;b,500,600,800,800'});assert.equal(manual.sheets.machineRoom.openings.length,2);assert.deepEqual(room.openings.map(v=>v.w),[800,300,300]);
  assert.deepEqual([room.beam.width,room.beam.depth,room.beam.height],[1200,150,650]);assert.equal(room.hook.load,25);
  assert.ok(defaults.sheets.machineRoom.entities.some(e=>e.type==='text'&&e.value==='MẶT CẮT LỖ CHỜ DẦM'));
  const changed=drawingPackageFor(r,{...options,beamWidth:1000,beamDepth:100,beamHeight:500,hookLoad:30});
  assert.equal(changed.sheets.machineRoom.roomDetails.beam.height,500);assert.equal(changed.sheets.section.geometry.roomDetails.beam.height,500);assert.equal(changed.sheets.machineRoom.roomDetails.hook.load,30);
  assert.throws(()=>drawingPackageFor(r,{...options,beamDepth:999}),/Lỗ chờ dầm/);
 }
 assert.ok(d.sheets.specification.rows.some(([k,v])=>k==='Kích thước cabin (W × D × H)'&&v===`${r.inputs.AA} × ${r.inputs.BB} × ${r.inputs.HL} mm`));
 assert.equal(Object.keys(d.sheets).length,mrl?3:4);
 assert.equal(!!d.sheets.machineRoom,!mrl);
 assert.ok(d.sheets.specification.rows.some(([k,v])=>k.startsWith('pit')&&v===`${options.PD} / ${baseline.result.outputs.PD} mm`));
 assert.ok(d.sheets.specification.rows.some(([k,v])=>k==='CB nguồn động lực (A)'&&v==='50'));
 assert.ok(d.sheets.section.dimensions.some(v=>v.label===`OH.${options.OH}`&&Math.abs(Math.hypot(v.a[0]-v.b[0],v.a[1]-v.b[1])-options.OH)<.001));
 assert.ok(d.sheets.section.dimensions.some(v=>v.label===`pit.${options.PD}`));
 for(const [label,value] of [[`OH.${options.OH}`,options.OH],[`pit.${options.PD}`,options.PD],[`hh.${r.inputs.HH}`,r.inputs.HH],[`bb.${r.inputs.BB}`,r.inputs.BB],[`tr-${g.travel}`,g.travel],...mrl?[]:[[`hm.${g.room}`,g.room]]]){
  const dim=d.sheets.section.dimensions.find(v=>v.label===label);assert.ok(dim,model.id+' missing source notation '+label);assert.ok(Math.abs(Math.hypot(dim.a[0]-dim.b[0],dim.a[1]-dim.b[1])-value)<.001);
 }
 assert.ok(d.sheets.plan.dimensions.some(v=>v.label===`bb.${r.inputs.BB}`));
 assert.throws(()=>drawingPackageFor(r,{...options,OH:baseline.result.outputs.OH-1}),/OH phải từ/);
 assert.throws(()=>drawingFor(r,{...options,PD:1}),/PIT phải từ/);
 for(const value of [0,-1,'abc',Infinity])assert.throws(()=>drawingPackageFor(r,{...options,OH:value}));
 if(!mrl){assert.throws(()=>drawingPackageFor(r,{...options,roomOpenings:'a,0,0,999999,2'}),/phải nằm/);assert.throws(()=>drawingPackageFor(r,{...options,roomOpenings:'a,0,0,100,100;b,50,50,100,100'}),/chồng nhau/);if(!r.outputs.HM){assert.equal(drawingPackageFor(r,{...options,machineRoomHeight:''}).sheets.section.geometry.room,2200);assert.throws(()=>drawingPackageFor(r,{...options,machineRoomHeight:0}),/Nhập chiều cao/);}}
 const spec=(opts)=>Object.fromEntries(drawingPackageFor(r,opts).sheets.specification.rows);
 const fallback=spec({...options,powerSupply:'  ',powerBreaker:''});
 assert.equal(fallback['Nguồn động lực'],'AC 3 phase - 380V - 50Hz');
 assert.equal(fallback['Tên tầng phục vụ'],'1, 2, 3, 4');
 assert.equal(spec({...options,powerBreaker:'63'})['CB nguồn động lực (A)'],'63');
 assert.equal(spec({...options,powerBreaker:0})['CB nguồn động lực (A)'],'0');
 const name=model.id.replaceAll(' ','_');
 const dxf=toDxf(d);assert.ok(!/NaN|Infinity|undefined/.test(dxf));assert.ok(dxf.includes('69d6b494'));
 for(const symbol of ['OH.','pit.','hh.','bb.','tr-',...mrl?[]:['hm.']])assert.ok(dxf.replaceAll('\r','').includes('\n1\n'+symbol+'<>\n'), 'Native dimension must preserve '+symbol);
 writeFileSync(new URL(name+'.dxf',out),dxf);if(encode)writeFileSync(new URL('dwg/'+name+'.dwg',out),encode(new TextEncoder().encode(dxf)));writeFileSync(new URL(name+'.svg',out),toSvg(d));
 for(const [key,sheet]of Object.entries(d.sheets)){writeFileSync(new URL(name+'-'+key+'.svg',out),toSvg(sheet));writeFileSync(new URL(name+'-'+key+'.dxf',out),toDxf(sheet));}
 manifest.push({name,model:model.id,kind:'package',manual:options,expectedDimensions:d.dimensions.map(v=>Math.hypot(v.b[0]-v.a[0],v.b[1]-v.a[1]))});
}
writeFileSync(new URL('manifest.json',out),JSON.stringify(manifest,null,2));
console.log('Six model families: complete template sheets, project OH/PIT vs minimums, real dimensions, room exclusion, reference component coverage, structural defaults/overrides and invalid openings passed.');
