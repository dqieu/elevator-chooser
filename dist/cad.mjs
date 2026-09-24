import {projectDimensions} from './cad-project.mjs?v=20260924-specdefaults';
import {cadReference} from './cad-reference.mjs?v=20260924-specdefaults';
import {cadCanvas} from './cad-primitives.mjs?v=20260924-specdefaults';
import {templateParts} from './cad-assets/template-parts.mjs?v=20260924-specdefaults';
import {display} from './chooser.mjs?v=20260924-specdefaults';
import {planGeometry} from './cad-geometry.mjs?v=20260924-specdefaults';

const ascii=s=>String(s).replaceAll('×','x').replaceAll('±','+/-').replaceAll('·','|').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').replace(/[^\x20-\x7e]/g,' ').replace(/\s+/g,' ').trim();
const xml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=n=>String(Math.round(n*1000)/1000);

// Source-based plan; template convention: entrance at bottom, dimensions around shaft.
export function drawingFor(result,manual={}){
 const g=planGeometry(result,manual);if(g.missing.length)throw new Error('Cần bổ sung tọa độ trong các ô phía trên, rồi bấm Dựng mặt bằng.');
 const r=g.result,i=r.inputs,o=r.outputs;
 const project=projectDimensions(r,manual);
 const reference=cadReference(r,'plan',g);
 if(g.autoRear)reference.issues.push('Cửa trước và sau đồng tim cabin theo bố trí cửa mở tim xuyên cabin.');
 const allowance=Number(manual.openingAllowance??200);if(!Number.isFinite(allowance)||allowance<0||allowance>1000)throw new Error('Chừa cửa: nhập tổng phần cộng thêm 0–1000 mm.');
 const wall=Number(manual.wallThickness??200);if(!Number.isFinite(wall)||wall<0||wall>1000)throw new Error('Dày vách: nhập 0–1000 mm.');
 const h=Math.max(28,Math.max(o.AH,o.BH)/90),step=Math.max(h*3.2,wall+45);
 const {entities,dimensions,line,text,rect,axis,dh,dv,wallRect}=cadCanvas(h);
 wallRect(-wall,-wall,wall,o.BH+2*wall);wallRect(o.AH,-wall,wall,o.BH+2*wall);
 for(const [y,d] of [[-wall,g.doors[0]],[o.BH,g.doors[1]]]){if(d){const roughLeft=d.x-i.JJ/2-allowance/2,roughRight=d.x+i.JJ/2+allowance/2;wallRect(0,y,Math.max(0,roughLeft),wall);wallRect(roughRight,y,Math.max(0,o.AH-roughRight),wall)}else wallRect(0,y,o.AH,wall)}
 // Rough-opening allowance is an explicit project input, initialized from the sample.
 const c=g.car,outer=g.outer,cw=g.counter,box=g.counterBox;
 // Cabin side/rear outlines use A_S and BS; no arbitrary wall thickness.
 line(outer.x,outer.y,outer.x,outer.y+outer.depth,'CABIN');line(outer.x+outer.width,outer.y,outer.x+outer.width,outer.y+outer.depth,'CABIN');
 if(g.doors.length===1)line(outer.x,outer.y+outer.depth,outer.x+outer.width,outer.y+outer.depth,'CABIN');
 line(c.x,c.y,c.x,c.y+c.depth,'CABIN');line(c.x+c.width,c.y,c.x+c.width,c.y+c.depth,'CABIN');
 const frontDoor=g.doors[0];line(c.x,c.y,frontDoor.x-i.JJ/2,c.y,'CABIN');line(frontDoor.x+i.JJ/2,c.y,c.x+c.width,c.y,'CABIN');
 if(g.doors.length===1)line(c.x,c.y+c.depth,c.x+c.width,c.y+c.depth,'CABIN');else{const d=g.doors[1];line(c.x,c.y+c.depth,d.x-i.JJ/2,c.y+c.depth,'CABIN');line(d.x+i.JJ/2,c.y+c.depth,c.x+c.width,c.y+c.depth,'CABIN')}
 axis(c.x,c.y,c.x+c.width,c.y+c.depth);axis(c.x,c.y+c.depth,c.x+c.width,c.y);
 axis(c.cx,-step*.4,c.cx,o.BH+step*.4);axis(0,c.cy,o.AH,c.cy);
 axis(-step*.3,g.railY,o.AH+step*.3,g.railY);
 axis(cw.x,box.y-step*.3,cw.x,box.y+box.depth+step*.3);axis(box.x-step*.3,cw.y,box.x+box.width+step*.3,cw.y);
 const placePart=(name,transform,layer)=>{for(const [x1,y1,x2,y2] of templateParts.parts[name].segments){const a=transform(x1,y1),b=transform(x2,y2);line(...a,...b,layer)}};
 const rail=(p,dx,dy,name='T75-3_B')=>placePart(name,(x,y)=>[p.x+dx*x-dy*y,p.y+dy*x+dx*y],'RAIL');
 g.rails.forEach((p,n)=>rail(p,n===0?-1:1,0));
 g.counterRails.forEach((p,n)=>rail(p,cw.back?(n===0?-1:1):0,cw.back?0:(n===0?-1:1),'TD65'));
 placePart('counterRear',(x,y)=>{const xx=Math.abs(x)===675?Math.sign(x)*cw.gauge/2:x,yy=Math.abs(y)===75?Math.sign(y)*cw.thickness/2:y;return cw.back?[cw.x+xx,cw.y+yy]:[cw.x+yy,cw.y+xx]},'COUNTER');
 text(c.cx-h*.7,c.cy+h*.5,'C','CENTER');text(cw.x+h*.5,cw.y+h*.5,'W','CENTER');
 for(const door of g.doors){const sign=door.back?-1:1,left=door.x-i.JJ/2,right=door.x+i.JJ/2,sill=door.back?outer.y+outer.depth:outer.y;
  const carFront=door.back?c.y+c.depth:c.y;line(left,carFront,left,sill+sign*g.source.DKWC.value,'CABIN');line(right,carFront,right,sill+sign*g.source.DKWC.value,'CABIN');
  if(i.DRKI==='CO'){
   const mapX=x=>x===0?0:Math.sign(x)*(Math.abs(x)>=900?Math.max(i.AA/2+145,i.JJ+45):i.JJ/2+Math.abs(x)-450);
   placePart('coCarSill',(x,y)=>[door.x+mapX(x),sill+sign*y*g.source.DKWC.value/60],'DOOR');
   placePart('coLanding',(x,y)=>[door.x+mapX(x),sill+sign*y],'DOOR');
  }else{
   // Telescopic leaves: preserve opening and depth; no invented manufacturer part number.
   const depth=g.source.DKWC.value,count=i.DRKI==='3CO'?6:i.DRKI==='2CO'?4:2,center=i.DRKI.endsWith('CO');
   for(const base of [sill,sill-sign*(depth+30)]){
    rect(left-35,Math.min(base,base+sign*depth),i.JJ+70,depth,'DOOR');
    for(let k=0;k<count;k++){const tier=center?Math.min(k,count-1-k):i.DRKI==='2SL'?count-1-k:k,x=left+k*i.JJ/count,y=base+sign*(12+tier*depth/(count+1));rect(x,Math.min(y,y+sign*18),i.JJ/count,18,'DOOR')}
   }
  }
  axis(door.x,door.y-sign*step*.4,door.x,sill+sign*step);
 }
 dh(0,o.AH,o.BH,o.BH+step*3,'AH = '+num(o.AH));dh(0,c.cx,o.BH,o.BH+step*2,'HAXX = '+num(c.cx));dh(c.cx,o.AH,o.BH,o.BH+step*2,num(o.AH-c.cx));
 dh(g.rails[0].x,g.rails[1].x,g.railY,o.BH+step,'BG = '+num(g.railGauge));
 dh(c.x,c.x+c.width,c.y+c.depth,c.y+c.depth-step*.5,'AA = '+num(i.AA));
 dv(c.y,c.y+c.depth,c.x,c.x+step*.65,'bb.'+num(i.BB));
 dv(0,o.BH,0,-step*3,'BH = '+num(o.BH));dv(0,g.railY,0,-step*2,'YR = '+num(g.railY));
 dv(0,cw.y,0,-step,'YW = '+num(cw.y));
 dh(0,frontDoor.x,0,-step*2,'DTL = '+num(frontDoor.x));dh(frontDoor.x-i.JJ/2,frontDoor.x+i.JJ/2,0,-step,'JJ = '+num(i.JJ));
 const left=-wall-step*3.5,top=o.BH+wall+step*3.6,bottom=-wall-step*3.4;
 const titleWidth=h*25,tx=Math.max(o.AH+wall+step*1.25,left+(top-bottom)*1.4142-titleWidth),right=tx+titleWidth;
 rect(tx,bottom,titleWidth,top-bottom,'FRAME');let ty=top;
 const boxRow=(label,value,fraction)=>{const depth=(top-bottom)*fraction;line(tx,ty-depth,right,ty-depth,'FRAME');text(tx+h*.5,ty-h,label,'NOTES',h*.65);text(tx+h*.5,ty-h*2.3,value,'TEXT',h*.85);ty-=depth};
 boxRow('HIỆU CHỈNH / REVISION','P01 — DỰ THẢO',.07);boxRow('CHỦ ĐẦU TƯ / CLIENT','________________________',.13);boxRow('DỰ ÁN / PROJECT','________________________',.15);boxRow('HẠNG MỤC / WORK','THANG MÁY',.12);boxRow('NHÀ THẦU / CONTRACTOR','VIỆT CHÀO',.10);boxRow('THIẾT KẾ / KIỂM TRA','________________________',.10);boxRow('TÊN BẢN VẼ / DRAWING','MẶT BẰNG LẮP ĐẶT',.09);boxRow('DÒNG THANG / MODEL',r.model,.06);boxRow('THÔNG SỐ / SPEC',`${i.CAP} kg / ${i.SPD} m/s / ${i.DRKI}`,.05);boxRow('MÃ BẢN VẼ / SHEET','MB-01 / mm',.04);
 let y=ty-h;const small=t=>{text(tx+h*.5,y,t,'NOTES',h*.65);y-=h*1.15};small(`C: ${num(c.cx)} ; ${num(c.cy)}`);small(`D: ${num(frontDoor.x)} ; 0`);small(`Ray cabin Y: ${num(g.railY)}`);small(`W: ${num(cw.x)} ; ${num(cw.y)}`);small(`BG ${g.railGauge} / WG ${cw.gauge}`);
 for(const [k,v] of Object.entries(g.manual))small(`KT nhập ${k}: ${num(v)}`);
 text(0,-wall-step*2.5,'MẶT BẰNG LẮP ĐẶT THANG MÁY','TEXT',h*1.15);
 text(left+h,bottom+h*2.7,`Vách ${wall} mm / chừa cửa JJ+${allowance}: giả định trình bày từ mẫu, cần xác nhận xây dựng.`,'NOTES',h*.7);
 text(left+h,bottom+h*1.6,'Ray, cụm cửa và khung đối trọng theo mẫu tham khảo; kiểm tra chọn thiết bị trước thi công.','NOTES',h*.7);
 text(left+h,bottom+h*.5,`${reference.file?'Mẫu: '+reference.file+' | ':''}${r.en81===false?'EN 81-20: OFF | ':''}Nguồn: ${r.file}`,'NOTES',h*.65);
 const bounds={left:left-h,right:right+h,bottom:bottom-h,top:top+h};rect(bounds.left,bounds.bottom,bounds.right-bounds.left,bounds.top-bounds.bottom,'FRAME');
 return {entities,dimensions,bounds,result:r,geometry:g,project,reference,provenance:[`Project OH=${project.values.OH}; PIT=${project.values.PD}; minimum OH=${project.minimums.OH}; PIT=${project.minimums.PD}.`,reference.file?`Plan reference: ${reference.file}; SHA-256: ${reference.sha256}`:reference.basis,reference.scope??'',...reference.issues],wallThickness:wall,openingAllowance:allowance,filename:`VietChao-${ascii(r.model).replace(/[^a-zA-Z0-9-]/g,'_')}-${i.CAP}kg-${i.AA}x${i.BB}-PLAN-DRAFT`};
}
export function toDxf(drawing){
 const rows=[];const pair=(code,value)=>rows.push(String(code),String(value));
 pair(999,'App EN 81-20 area filter: '+(drawing.result.en81===false?'OFF':'ON'));pair(999,'Source SHA-256: '+drawing.result.sha256);pair(999,'Template DXF SHA-256: '+templateParts.dxfSha256);pair(999,drawing.kind==='section'?`Section: ${drawing.orientation==='vertical'?'X=shaft depth; Y=elevation':'X=-elevation; Y=shaft depth'}. Civil draft, not equipment installation approval.`:'Reference rail profiles: T75-3_B / TD65; verify equipment selection.');
 for(const [key,entry] of Object.entries(drawing.geometry.source))pair(999,ascii(`${key} = ${entry.value} from ${entry.cell??'workbook'}`));
 if(drawing.geometry.template)pair(999,'Geometry template DWG SHA-256: '+drawing.geometry.template.sha256);
 if(drawing.kind!=='section')pair(999,'X cabin=HAXX; X door=DTL; Y rail=B_3+EE; Y counter=Y rail+CD; see manual coordinates if supplied.');
 for(const note of drawing.provenance??[])pair(999,ascii(note));
 for(const [key,value] of Object.entries(drawing.geometry.manual))pair(999,`ENGINEERING INPUT ${key} = ${value}`);
 pair(0,'SECTION');pair(2,'HEADER');pair(9,'$ACADVER');pair(1,'AC1009');pair(9,'$DIMTXT');pair(40,drawing.dimensions[0]?.height??28);pair(9,'$DIMASZ');pair(40,10);pair(9,'$DIMCLRD');pair(70,8);pair(9,'$DIMCLRE');pair(70,8);pair(9,'$DIMCLRT');pair(70,3);pair(9,'$DIMTAD');pair(70,1);pair(0,'ENDSEC');
 pair(0,'SECTION');pair(2,'TABLES');pair(0,'TABLE');pair(2,'LAYER');pair(70,17);
 for(const [name,color] of [['WALL',4],['HATCH',8],['OUTLINE',4],['CABIN',7],['DOOR',7],['DIM',8],['DIMTEXT',3],['TEXT',7],['NOTES',7],['FRAME',8],['CENTER',6],['RAIL',7],['COUNTER',7],['EQUIPMENT',4],['ROPE',6],['STRUCTURE',2],['LEVEL',1]]){pair(0,'LAYER');pair(2,name);pair(70,0);pair(62,color);pair(6,'CONTINUOUS')}
 pair(0,'ENDTAB');
 const b=drawing.bounds,width=b.right-b.left,height=b.top-b.bottom;
 pair(0,'TABLE');pair(2,'VPORT');pair(70,1);pair(0,'VPORT');pair(2,'*ACTIVE');pair(70,0);
 pair(10,0);pair(20,0);pair(11,1);pair(21,1);pair(12,(b.left+b.right)/2);pair(22,(b.bottom+b.top)/2);
 pair(16,0);pair(26,0);pair(36,1);pair(17,0);pair(27,0);pair(37,0);pair(40,Math.max(height,width/1.35)*1.12);pair(41,1.35);pair(42,50);pair(71,0);pair(72,100);pair(90,0);
 pair(0,'ENDTAB');pair(0,'ENDSEC');
 const emit=e=>{pair(0,e.type==='line'?'LINE':'TEXT');pair(8,e.layer);if(e.color)pair(62,e.color);if(e.type==='line'){pair(10,num(e.x1));pair(20,num(e.y1));pair(30,0);pair(11,num(e.x2));pair(21,num(e.y2));pair(31,0)}else{pair(10,num(e.x));pair(20,num(e.y));pair(30,0);pair(40,num(e.size));pair(50,e.rotation??0);pair(1,ascii(e.value))}};
 pair(0,'SECTION');pair(2,'BLOCKS');
 drawing.dimensions.forEach((d,index)=>{pair(0,'BLOCK');pair(8,'DIM');pair(2,'*D'+(index+1));pair(70,1);pair(10,0);pair(20,0);pair(30,0);pair(3,'*D'+(index+1));for(const e of drawing.entities.slice(d.start,d.end))emit(e);pair(0,'ENDBLK');pair(8,'DIM')});
 pair(0,'ENDSEC');pair(0,'SECTION');pair(2,'ENTITIES');
 const hidden=new Set(drawing.dimensions.flatMap(d=>Array.from({length:d.end-d.start},(_,i)=>i+d.start)));
 drawing.entities.forEach((e,index)=>{if(!hidden.has(index))emit(e)});
 drawing.dimensions.forEach((d,index)=>{pair(0,'DIMENSION');pair(8,'DIM');pair(2,'*D'+(index+1));pair(70,32);pair(10,num(d.location[0]));pair(20,num(d.location[1]));pair(30,0);pair(11,num(d.text[0]));pair(21,num(d.text[1]));pair(31,0);pair(1,ascii(d.label).replace(/[0-9]+(?:\.[0-9]+)?$/,'<>'));pair(3,'STANDARD');pair(13,num(d.a[0]));pair(23,num(d.a[1]));pair(33,0);pair(14,num(d.b[0]));pair(24,num(d.b[1]));pair(34,0);pair(50,d.rotation)});
 pair(0,'ENDSEC');pair(0,'EOF');return rows.join('\r\n')+'\r\n';
}
export function toSvg(d){
 const b=d.bounds,w=b.right-b.left,ht=b.top-b.bottom;
 const colors={WALL:'#16829a',HATCH:'#a2aab1',OUTLINE:'#14283c',CABIN:'#126b54',DOOR:'#086d91',DIM:'#8190a0',DIMTEXT:'#16802e',TEXT:'#14283c',NOTES:'#34465a',FRAME:'#8190a0',CENTER:'#a22492',RAIL:'#b12725',COUNTER:'#087895',EQUIPMENT:'#006e8a',ROPE:'#a22492',STRUCTURE:'#9b6910',LEVEL:'#d12b2b'};
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${b.left-30} ${-b.top-30} ${w+60} ${ht+60}" role="img" aria-label="Bản vẽ dự thảo kích thước thang máy"><rect x="${b.left-30}" y="${-b.top-30}" width="${w+60}" height="${ht+60}" fill="white"/>${d.entities.map(e=>e.type==='line'?`<line x1="${e.x1}" y1="${-e.y1}" x2="${e.x2}" y2="${-e.y2}" stroke="${e.color?({1:'#d12b2b',2:'#9b6910',3:'#16802e',4:'#16829a',5:'#315fc2',6:'#a22492',7:'#14283c',8:'#8190a0',9:'#8190a0'}[e.color]??colors[e.layer]):colors[e.layer]}" stroke-width="${d.kind==='section'?(e.layer==='HATCH'?.45:.8):3}" ${d.kind==='section'?'vector-effect="non-scaling-stroke"':''}/>`:`<text x="${e.x}" y="${-e.y}" fill="${colors[e.layer]}" font-family="Arial,sans-serif" font-size="${e.size}" transform="rotate(${-e.rotation||0} ${e.x} ${-e.y})">${xml(e.value)}</text>`).join('')}</svg>`;
}
