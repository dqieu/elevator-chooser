import {userTemplate as template} from './cad-assets/user-template.mjs?v=20260924-specdefaults';

// Piecewise presentation anchors preserve cabin/shaft boundaries. These vectors
// reproduce the supplied reference; they do not select a machine or size a beam.
export function anchorMap(knots){
 for(let n=1;n<knots.length;n++)if(knots[n][0]<=knots[n-1][0]||knots[n][1]<=knots[n-1][1])throw new Error('Mốc bố trí chi tiết mẫu không tăng; kiểm tra cabin, OH và PIT.');
 return value=>{let n=1;while(n<knots.length-1&&value>knots[n][0])n++;const [a,b]=[knots[n-1],knots[n]];return a[1]+(value-a[0])*(b[1]-a[1])/(b[0]-a[0])};
}
export function mappedSegments(segment,xKnots,yKnots,mapX,mapY){
 const [x1,y1,x2,y2]=segment,ts=[0,1];
 for(const [a,b,knots] of [[x1,x2,xKnots],[y1,y2,yKnots]])if(a!==b)for(const [k] of knots){const t=(k-a)/(b-a);if(t>0&&t<1)ts.push(t)}
 const sorted=[...new Set(ts)].sort((a,b)=>a-b),point=t=>[mapX(x1+(x2-x1)*t),mapY(y1+(y2-y1)*t)];
 return sorted.slice(1).map((t,n)=>[...point(sorted[n]),...point(t)]);
}
export function sectionMechanics(g,canvas){
 const s=template.section,variant=g.mrl?s.mrl:s.mr,i=g.result.inputs;
 const xKnots=[[0,0],[variant.carFront,g.carFront],[variant.carBack,g.carFront+i.BB],[s.shaftDepth,g.result.outputs.BH]];
 const yKnots=[[-s.pit,g.pit],[0,0],[s.travel,g.travel],[s.travel+variant.carHeight,g.travel+i.HL],[s.ceiling,g.top]];
 if(!g.mrl&&g.room)yKnots.push([s.roomFloor,g.top+g.wall],[s.roof,g.top+g.wall+g.room]);
 const mapX=anchorMap(xKnots),mapY=anchorMap(yKnots),components={};
 const names=g.mrl?['mrlAssembly','mrlHook']:['mrCar','mrCounterBuffer',...(g.room?['mrMachine','mrRopes','mrHook']:[])];
 const emit=(line,record,part)=>{
  const role=record.role,center=/CENTER|中心/.test(record.layer),layer=center?'CENTER':role==='ropes'?'ROPE':role==='hook'?'STRUCTURE':role==='pitAssembly'?'COUNTER':role==='carAssembly'?'CABIN':'EQUIPMENT';
  const [a,z,b,w]=line;canvas.line(-z,a,-w,b,layer);
  Object.assign(canvas.entities.at(-1),{component:role,sourcePart:part,sourceHandle:record.sourceHandle,color:record.color,referenceGraphic:true});
  components[role]=(components[role]??0)+1;
 };
 // Hold the pit equipment, machine and hook at their support elevations.
 // Changing travel must stretch the free rope span, not the counterweight body.
 const pitTop=2311.96597, pitShift=g.pit+s.pit;
 const carBottom=s.travel-335, carShift=g.travel-s.travel;
 const equipmentY=value=>{
  if(value<=pitTop)return value+pitShift;
  if(value<carBottom)return pitTop+pitShift+(value-pitTop)*(carBottom+carShift-pitTop-pitShift)/(carBottom-pitTop);
  if(value<s.travel)return value+carShift;
  return mapY(value);
 };
 const equipmentKnots=[...yKnots,[pitTop,0],[carBottom,0]];
 for(const name of names){
  const hook=name.endsWith('Hook'),machine=name==='mrMachine';
  const y=hook?(v=>v+(g.mrl?g.top-s.ceiling:g.top+g.wall+g.room-s.roof)):
   machine?(v=>v+g.top+g.wall-s.roomFloor):equipmentY;
  // Keep rope attachment heights aligned with the translated MR machine.
  const ropeY=v=>!g.mrl&&v>=s.roomFloor?v+g.top+g.wall-s.roomFloor:y(v);
  for(const record of template.parts[name].records)for(const segment of record.segments)
   for(const line of mappedSegments(segment,xKnots,equipmentKnots,mapX,ropeY))emit(line,record,name);
 }
 // Repeat the source landing-door assembly at the actual stop elevations.
 // Clear door height is driven by HH; front/rear doors share the same detail.
 for(const z of g.levels)for(const record of template.parts.landingDoor.records)for(const [a,b,c,d] of record.segments){
  for(const rear of [false,...i.ENTR==='1D/2D-2G'?[true]:[]]){
   const x=q=>rear?g.result.outputs.BH-q:q;
   canvas.line(-(z+b*i.HH/2100),x(a),-(z+d*i.HH/2100),x(c),'DOOR');
   Object.assign(canvas.entities.at(-1),{component:'landingDoor',sourcePart:'landingDoor',sourceHandle:record.sourceHandle,color:record.color,referenceGraphic:true});
   components.landingDoor=(components.landingDoor??0)+1;
  }
 }
 return {source:template.source,sha256:template.sha256,parts:names,components,xKnots,yKnots,
  mode:g.mrl?'MRL':'MR',carLevel:g.travel,
  note:'Chi tiết máy, cáp, đối trọng, giảm chấn và móc treo theo mẫu tham khảo; vị trí đã thích ứng kích thước công trình.'};
}
