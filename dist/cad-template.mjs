import {roomDetails} from './cad-room.mjs?v=20260924-specdefaults';
import {userTemplate} from './cad-assets/user-template.mjs?v=20260924-specdefaults';
import {cadCanvas} from './cad-primitives.mjs?v=20260924-specdefaults';
import {display} from './chooser.mjs?v=20260924-specdefaults';
export const templateSource='Bản vẽ gửi CHAT GPT.dwg';
export const templateHash='69d6b494ca022ddf38f42bdd4b212636159d9825106f2f7e1761305ad4e1483c';
const supplied=(options,key)=>String(options[key]??'').trim()||'Chưa xác định';
export const specificationDefaults=Object.freeze({liftName:'P1, P2',usage:'Thang chở khách',control:'VVVF',operation:'Nhóm 02 thang',unservedFloors:'Không',roping:'2 : 1',motorPower:'Theo tiêu chuẩn nhà sản xuất',powerSupply:'AC 3 phase - 380V - 50Hz',lightingSupply:'AC 1 phase - 220V - 50Hz',powerBreaker:'50',powerCable:'16',earthCable:'10',lightingBreaker:'20',lightingCable:'2.5'});
const fmt=n=>String(Math.round(n*1000)/1000);
// Rebuild the supplied template's right-hand title block using code. Names and
// approvals in the example belong to that project and are deliberately blank.
export function frameSheet(drawing,title,code,options={}){
 const b=drawing.bounds,pad=250,contentWidth=b.right-b.left,contentHeight=b.top-b.bottom;
 const height=Math.max(contentHeight+2*pad,(contentWidth+2*pad)/1.13,6000);
 const width=height*1.4142,strip=width*.17,left=b.left-pad,top=b.top+pad,bottom=top-height,right=left+width,tx=right-strip;
 const c=cadCanvas(height/100),h=height/100;
 c.rect(left,bottom,width,height,'FRAME');c.rect(left+60,bottom+60,width-120,height-120,'FRAME');
 c.line(tx,top-60,tx,bottom+60,'FRAME');
 const span=strip-120,fit=(value,size=h)=>Math.min(size,span/Math.max(1,String(value).length)/.65);
 const label=(y,value,size=h*.62)=>c.text(tx+60,y,value,'NOTES',fit(value,size));
 const content=(y,value,size=h)=>c.text(tx+60,y,String(value),'TEXT',fit(value,size));
 let y=top-60;
 const row=(fraction,title,draw)=>{const rh=(height-120)*fraction;label(y-h*.75,title);draw(y,rh);y-=rh;c.line(tx,y,right-60,y,'FRAME')};
 row(.10,'HIỆU CHỈNH / REVISION',(y,rh)=>{
  const widths=[0,.22,.75,1],heads=['Xuất bản','Nội dung điều chỉnh','Ngày'];
  for(let n=1;n<3;n++)c.line(tx+span*widths[n],y-h*1.3,tx+span*widths[n],y-rh,'FRAME');
  for(let n=0;n<3;n++)c.text(tx+span*widths[n]+30,y-h*1.9,heads[n],'NOTES',h*.4);
  c.line(tx,y-h*2.2,right-60,y-h*2.2,'FRAME');
  content(y-h*3,options.revision||'P01 - DỰ THẢO',h*.55);
 });
 row(.20,'CHỦ ĐẦU TƯ / CLIENT',(y,rh)=>{content(y-h*2.4,supplied(options,'client'));label(y-rh*.55,'XÁC NHẬN CỦA CHỦ ĐẦU TƯ',h*.6)});
 row(.11,'DỰ ÁN / PROJECT',(y)=>content(y-h*2.4,supplied(options,'projectName')));
 row(.08,'HẠNG MỤC / WORK',(y,rh)=>{content(y-h*2,'THANG MÁY',h*.75);label(y-rh*.58,'ĐỊA ĐIỂM / LOCATION');content(y-rh*.8,supplied(options,'location'),h*.7)});
 row(.15,'NHÀ THẦU / CONTRACTOR',(y,rh)=>{
  content(y-h*2,'CÔNG TY CỔ PHẦN VIỆT CHÀO',h*.8);
  const segments=userTemplate.parts.logo.records.flatMap(r=>r.segments),xs=segments.flatMap(s=>[s[0],s[2]]),ys=segments.flatMap(s=>[s[1],s[3]]);
  const lx=Math.min(...xs),ly=Math.min(...ys),lw=Math.max(...xs)-lx,lh=Math.max(...ys)-ly,scale=Math.min(span*.5/lw,rh*.23/lh);
  for(const [a,b,d,e]of segments)c.line(tx+span*.5+(a-lx-lw/2)*scale,y-rh*.48+(b-ly)*scale,tx+span*.5+(d-lx-lw/2)*scale,y-rh*.48+(e-ly)*scale,'TEXT');
  label(y-rh*.59,'THE BEST CHOICE FOR BUILDINGS',h*.45);
  label(y-rh*.70,'61/66 Triều Khúc, Thanh Trì, Hà Nội',h*.45);
  label(y-rh*.79,'ĐT: 84 24 35638650 | Fax: 35638649',h*.45);
  label(y-rh*.88,'vietchao@vietchao.vn | vietchao.vn',h*.45);
 });
 row(.11,'THIẾT KẾ / KIỂM TRA / PHÊ DUYỆT',(y,rh)=>{
  [['T.GIÁM ĐỐC','director'],['THIẾT KẾ','designer'],['KIỂM','checker'],['DUYỆT','approver']].forEach(([title,key],n)=>{
   const yy=y-h*1.6-n*rh*.19;c.text(tx+60,yy,title,'NOTES',h*.5);c.text(tx+span*.46,yy,options[key]||'____________','TEXT',Math.min(h*.6,span*.5/Math.max(1,String(options[key]||'____________').length)/.65));if(n<3)c.line(tx,yy-h*.5,right-60,yy-h*.5,'FRAME');
  });
 });
 row(.08,'TÊN BẢN VẼ / DRAWING NAME',(y)=>content(y-h*2.8,title,h*.95));
 row(.07,'HẠNG MỤC / MODEL',(y)=>{content(y-h*2.4,drawing.result.model);content(y-h*4,`${drawing.result.inputs.CAP} kg / ${drawing.result.inputs.SPD} m/s`,h*.65)});
 row(.10,'THÔNG TIN BẢN VẼ',(y,rh)=>{
  [['ĐƠN VỊ','mm - hình học 1:1'],['XUẤT BẢN',options.issueDate||'____________'],['BẢN VẼ SỐ',code],['SỐ TỜ',options.sheetNumber||code]].forEach(([name,value],n)=>{const yy=y-h*1.6-n*rh*.2;label(yy,name,h*.5);c.text(tx+span*.4,yy,value,'TEXT',Math.min(h*.65,span*.55/String(value).length/.65))});
 });
 // Keep the scope note on every exported sheet, including the cropped template views.
 c.text(left+100,bottom+95,'Chi tiết thiết bị / kết cấu theo mẫu tham khảo; thông số công trình theo kích thước ghi.','NOTES',Math.min(h*.55,(tx-left-200)/100/.65));
 const dx=(tx-left-contentWidth)/2-pad,dy=-(height-contentHeight)/2+pad;
 const move=p=>[p[0]+dx,p[1]+dy];
 const entities=drawing.entities.map(e=>e.type==='line'?{...e,x1:e.x1+dx,y1:e.y1+dy,x2:e.x2+dx,y2:e.y2+dy}:{...e,x:e.x+dx,y:e.y+dy});
 const dimensions=drawing.dimensions.map(d=>({...d,a:move(d.a),b:move(d.b),location:move(d.location),text:move(d.text)}));
 return {...drawing,entities:[...entities,...c.entities],dimensions,bounds:{left:left-60,right:right+60,bottom:bottom-60,top:top+60},provenance:[...(drawing.provenance??[]),`Presentation template: ${templateSource}; SHA-256: ${templateHash}; sheet ${code}.`]};
}
export function templateView(drawing,title,code,options={}){
 // Existing geometry precedes the old title block; keep native dimension indices.
 const end=drawing.entities.findIndex(e=>e.layer==='FRAME');
 let entities=drawing.entities.slice(0,end<0?undefined:end);
 if(drawing.kind==='section'&&entities.at(-1)?.type==='text'&&entities.at(-1).value.startsWith('MẶT CẮT'))entities.pop();
 const xs=entities.flatMap(e=>e.type==='line'?[e.x1,e.x2]:[e.x,e.x+(e.rotation===90?e.size:e.value.length*e.size*.65)]);
 const ys=entities.flatMap(e=>e.type==='line'?[e.y1,e.y2]:[e.y,e.y+(e.rotation===90?e.value.length*e.size*.65:e.size)]);
 return frameSheet({...drawing,entities,bounds:{left:Math.min(...xs),right:Math.max(...xs),bottom:Math.min(...ys),top:Math.max(...ys)}},title,code,options);
}
export function specificationSheet(section,options={}){
 const {result:r,geometry:g}=section,i=r.inputs,o=r.outputs,p=g.project.values,c=cadCanvas(65),w=6500,rowHeight=230,split=3300;
 const defaults={...specificationDefaults,doorCount:String(g.stops*(i.ENTR==='1D/2D-2G'?2:1)),servedFloors:Array.from({length:g.stops},(_,n)=>String(n+1)).join(', ')};
 const value=key=>String(options[key]??'').trim()||defaults[key]||'Chưa xác định';
 const rows=[['Tên thang',value('liftName')],['Mã hiệu',r.model],['Sử dụng',display(i.USE??i.APP??'')||value('usage')],['Loại thang',g.mrl?'Không phòng máy':'Có phòng máy'],['Tải trọng',`${i.CAP} kg`],['Tốc độ',`${i.SPD} m/s`],['Điều khiển',value('control')],['Vận hành',value('operation')],['Tầng / điểm dừng / cửa',`${g.stops} / ${g.stops} / ${value('doorCount')}`],['Tên tầng phục vụ',value('servedFloors')],['Tên tầng không phục vụ',value('unservedFloors')],['Hành trình',`${fmt(g.travel)} mm`],['Kích thước cabin (W × D × H)',`${i.AA} × ${i.BB} × ${i.HL} mm`],['Kích thước cửa (W × H)',`${i.JJ} × ${i.HH} mm`],['Kiểu mở cửa',display(i.DRKI)],['Kích thước giếng AH × BH',`${o.AH} × ${o.BH} mm`],['OH công trình / tối thiểu',`${p.OH} / ${g.project.minimums.OH} mm`],['pit công trình / tối thiểu',`${p.PD} / ${g.project.minimums.PD} mm`],...g.mrl?[]:[['Cao phòng máy hm',g.room?`${g.room} mm`:'Chưa xác định']],['Tỷ số truyền',value('roping')],['Công suất động cơ (kW)',value('motorPower')],['DỮ LIỆU NGUỒN ĐIỆN / 1 THANG MÁY',''],['Nguồn động lực',value('powerSupply')],['Nguồn chiếu sáng',value('lightingSupply')],['CB nguồn động lực (A)',value('powerBreaker')],['Tiết diện dây chính (mm²)',value('powerCable')],['Tiết diện dây tiếp địa (mm²)',value('earthCable')],['CB nguồn chiếu sáng (A)',value('lightingBreaker')],['Tiết diện dây chiếu sáng (mm²)',value('lightingCable')]];
 c.text(0,600,'THÔNG SỐ KỸ THUẬT','TEXT',130);
 c.text(90,160,'THÔNG SỐ','TEXT',80);c.text(split+90,160,'CÔNG TRÌNH','TEXT',80);
 c.rect(0,-rows.length*rowHeight,w,rows.length*rowHeight,'FRAME');c.line(split,0,split,-rows.length*rowHeight,'FRAME');
 rows.forEach(([label,value],n)=>{const y=-n*rowHeight;c.line(0,y,w,y,'FRAME');c.text(90,y-140,label,'TEXT',Math.min(65,(split-180)/label.length/.65));c.text(split+90,y-140,value,'TEXT',Math.min(65,(w-split-180)/Math.max(1,value.length)/.65));});
 return frameSheet({...section,kind:'specification',entities:c.entities,dimensions:[],rows,bounds:{left:0,right:w,bottom:-rows.length*rowHeight-350,top:850}},'THÔNG SỐ KỸ THUẬT','TS-01',options);
}
// The supplied sample is the default. Project values override its reference sizes.
export function machineRoomSheet(section,options={}){
 const {geometry:g,result:r}=section,o=r.outputs,c=cadCanvas(65),wall=g.wall;
 const details=roomDetails(g,options),{openings,beam,hook}=details;
 c.rect(-wall,-wall,o.AH+2*wall,o.BH+2*wall,'WALL');
 c.line(0,0,o.AH,0,'WALL');c.line(0,0,0,o.BH,'WALL');c.line(o.AH,0,o.AH,o.BH,'WALL');
 c.line(0,o.BH,beam.x,o.BH,'WALL');c.line(beam.x+beam.width,o.BH,o.AH,o.BH,'WALL');
 c.rect(beam.x,o.BH,beam.width,beam.depth,'STRUCTURE');
 c.axis(o.AH/2,-wall,o.AH/2,o.BH+wall);
 for(const a of openings){
  c.rect(a.x,a.y,a.w,a.d,'OUTLINE');c.text(a.x+30,a.y+a.d+85,a.name,'TEXT',65);
  c.dh(a.x,a.x+a.w,a.y,a.y-100,`${a.w}`);c.dv(a.y,a.y+a.d,a.x,a.x-100,`${a.d}`);
 }
 for(const record of userTemplate.parts.planHook.records)for(const [a,b,d,e]of record.segments)c.line(hook.x+a,hook.y+b,hook.x+d,hook.y+e,'STRUCTURE');
 c.line(hook.x+70,hook.y+60,hook.x+420,hook.y+430,'STRUCTURE');c.text(hook.x+420,hook.y+450,'c','TEXT',80);
 c.dh(0,o.AH,o.BH,o.BH+550,`${o.AH}`);c.dv(0,o.BH,0,-550,`${o.BH}`);
 c.dh(beam.x,beam.x+beam.width,o.BH+beam.depth,o.BH+300,`${beam.width}`);
 c.text(0,o.BH+1050,'MẶT BẰNG LỖ CHỜ PHÒNG MÁY','TEXT',100);
 c.text(0,o.BH+830,'ÁP DỤNG CHO THANG CÓ PHÒNG MÁY','TEXT',70);
 for(const [name,ratio]of [['N1',160/2160],['N2',450/2160]]){
  const x=o.AH*ratio,y=-400,radius=90;c.line(x,0,x,y+radius,'STRUCTURE');
  for(let n=0;n<24;n++){const a=n*Math.PI/12,b=(n+1)*Math.PI/12;c.line(x+radius*Math.cos(a),y+radius*Math.sin(a),x+radius*Math.cos(b),y+radius*Math.sin(b),'STRUCTURE');}
  c.text(x-55,y-25,name,'TEXT',55);
 }
 c.text(0,-650,'a: Lỗ cáp (*) - b: Lỗ thi công, hoàn thiện lại sau lắp đặt (*)','NOTES',65);
 c.text(0,-850,`c: Móc treo palang trên trần phòng máy: ${hook.load} kN (*)`,'NOTES',65);
 c.text(0,-1050,`Lỗ chờ dầm (*): ${beam.width} × ${beam.depth} × ${beam.height} mm (rộng × sâu × cao)`,'NOTES',65);
 // Side detail represents the recess height, which a plan rectangle cannot show.
 const bx=o.AH+1500,by=500;
 c.rect(bx,by,wall,beam.height+450,'WALL');c.rect(bx,by+200,beam.depth,beam.height,'STRUCTURE');
 c.dv(by+200,by+200+beam.height,bx,bx-220,`${beam.height}`);c.dh(bx,bx+beam.depth,by+200+beam.height,by+beam.height+600,`${beam.depth}`);
 c.text(bx-250,by+beam.height+850,'MẶT CẮT LỖ CHỜ DẦM','TEXT',80);
 const notes=[...openings.map(a=>`${a.name}: X=${fmt(a.x)}; Y=${fmt(a.y)}; ${a.w} × ${a.d} mm`),
  `N1: ${supplied(options,'powerSupply')} - N2: ${supplied(options,'lightingSupply')}`,
  'Các mục (*) do đơn vị khác thực hiện; kích thước / tải mặc định theo mẫu.',
  'Chi tiết tham khảo: xác nhận theo thiết bị và kết cấu công trình.'];
 notes.forEach((t,n)=>c.text(0,-1350-n*180,t,'NOTES',65));
 return frameSheet({...section,kind:'machine-room',entities:c.entities,dimensions:c.dimensions,openings,roomDetails:details,
  bounds:{left:-850,right:Math.max(o.AH+2500,6800),bottom:-1550-notes.length*180,top:o.BH+1300},
  provenance:[...section.provenance,details.note,`Reference construction: ${JSON.stringify(details)}`]},'LỖ CHỜ PHÒNG MÁY','PM-01',options);
}
