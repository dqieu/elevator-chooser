import {templateView,specificationSheet,machineRoomSheet} from './cad-template.mjs?v=20260924-specdefaults';
import {drawingFor} from './cad.mjs?v=20260924-specdefaults';
import {sectionDrawingFor} from './cad-section.mjs?v=20260924-specdefaults';

// Recompute travel first so both sheets always share the same workbook result.
export function drawingPairFor(result,options={}){
 const section=sectionDrawingFor(result,options),plan=drawingFor(section.result,options);
 const gap=1000,dx=plan.bounds.right+gap-section.bounds.left,dy=plan.bounds.top-section.bounds.top;
 const move=p=>[p[0]+dx,p[1]+dy];
 const shifted=section.entities.map(e=>e.type==='line'?{...e,x1:e.x1+dx,y1:e.y1+dy,x2:e.x2+dx,y2:e.y2+dy}:{...e,x:e.x+dx,y:e.y+dy});
 const dimensions=section.dimensions.map(d=>({...d,start:d.start+plan.entities.length,end:d.end+plan.entities.length,a:move(d.a),b:move(d.b),location:move(d.location),text:move(d.text)}));
 return {...plan,kind:'pair',sheets:{plan,section},entities:[...plan.entities,...shifted],dimensions:[...plan.dimensions,...dimensions],
  bounds:{left:plan.bounds.left,right:section.bounds.right+dx,top:plan.bounds.top,bottom:Math.min(plan.bounds.bottom,section.bounds.bottom+dy)},
  provenance:[...plan.provenance,`Two sheets, physical millimetres: MB-01 plan; MC-01 section. Section offset ${dx},${dy}.`,...section.provenance,...Object.entries(section.geometry.source).map(([k,v])=>`Section source ${k} = ${v.value} from ${v.cell}`),...Object.entries(section.geometry.manual).map(([k,v])=>`Section project input ${k} = ${v}`)],
  filename:plan.filename.replace('-PLAN-DRAFT',`-${section.geometry.stops}stops-PLAN-SECTION-DRAFT`)};
}

// Complete project set follows the user's supplied presentation template.
export function drawingPackageFor(result,options={}){
 const rawSection=sectionDrawingFor(result,options);
 if(!rawSection.geometry.mrl&&!rawSection.geometry.room)throw new Error('Nhập chiều cao phòng máy HM để xuất đủ bộ bản vẽ có phòng máy.');
 const rawPlan=drawingFor(rawSection.result,options);
 const plan=templateView(rawPlan,'MẶT BẰNG LẮP ĐẶT','MB-01',options);
 const section=templateView(rawSection,rawSection.geometry.mrl?'MẶT CẮT KHÔNG PHÒNG MÁY':'MẶT CẮT CÓ PHÒNG MÁY','MC-01',options);
 const specification=specificationSheet(rawSection,options);
 const sheets={plan,section,specification};
 if(!rawSection.geometry.mrl)sheets.machineRoom=machineRoomSheet(rawSection,options);
 const entities=[],dimensions=[],provenance=[];let cursor=0;
 const bounds={left:0,right:0,top:0,bottom:0};
 for(const [key,sheet] of Object.entries(sheets)){
  const dx=cursor-sheet.bounds.left,dy=-sheet.bounds.top,offset=entities.length,move=p=>[p[0]+dx,p[1]+dy];
  entities.push(...sheet.entities.map(e=>e.type==='line'?{...e,x1:e.x1+dx,y1:e.y1+dy,x2:e.x2+dx,y2:e.y2+dy}:{...e,x:e.x+dx,y:e.y+dy}));
  dimensions.push(...sheet.dimensions.map(d=>({...d,start:d.start+offset,end:d.end+offset,a:move(d.a),b:move(d.b),location:move(d.location),text:move(d.text)})));
  provenance.push(`Sheet ${key}: offset ${dx},${dy}.`,...(sheet.provenance??[]));
  bounds.right=sheet.bounds.right+dx;bounds.bottom=Math.min(bounds.bottom,sheet.bounds.bottom+dy);cursor=bounds.right+1000;
 }
 return {...plan,kind:'package',sheets,entities,dimensions,bounds,provenance,
  filename:rawPlan.filename.replace('-PLAN-DRAFT','-FULL-SET-DRAFT')};
}
