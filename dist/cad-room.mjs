import {userTemplate} from './cad-assets/user-template.mjs?v=20260924-specdefaults';
const value=(options,key,fallback,label)=>{const raw=options[key],n=raw==null||String(raw).trim()===''?fallback:Number(raw);if(!Number.isFinite(n)||n<=0)throw new Error(`${label}: nhập số dương.`);return n};
export function roomDetails(g,options={}){
 const s=userTemplate.openings,{AH,BH}=g.result.outputs;
 const cable=value(options,'cableHoleSize',300,'Cạnh lỗ cáp'),installation=value(options,'installationHoleSize',800,'Cạnh lỗ thi công');
 const beam={width:value(options,'beamWidth',1200,'Rộng lỗ chờ dầm'),depth:value(options,'beamDepth',150,'Sâu lỗ chờ dầm'),height:value(options,'beamHeight',650,'Cao lỗ chờ dầm')};
 if(beam.width>AH||beam.depth>g.wall||beam.height>g.room)throw new Error('Lỗ chờ dầm vượt rộng giếng, dày vách hoặc cao phòng máy; điều chỉnh kích thước lỗ chờ.');
 beam.x=(AH-beam.width)/2;beam.y=BH;
 let openings;
 const manual=String(options.roomOpenings??'').trim();
 if(manual)openings=manual.split(/\n|;/).filter(s=>s.trim()).map((row,n)=>{const a=row.trim().split(/\s*,\s*/);if(a.length!==5||!a[0]||a.slice(1).some(v=>!v.trim()))throw new Error(`Lỗ chờ dòng ${n+1}: nhập tên, X, Y, rộng, sâu.`);const [x,y,w,d]=a.slice(1).map(Number);return {name:a[0],x,y,w,d}});
 else{
  const opening=(name,ratio,size)=>({name,x:AH*ratio[0]-size/2,y:BH*ratio[1]-size/2,w:size,d:size});
  openings=[opening('b',s.installation.centerRatio,installation),...s.cable.centerRatios.map((ratio,n)=>opening('a'+(n+1),ratio,cable))];
 }
 for(const a of openings)if(![a.x,a.y,a.w,a.d].every(Number.isFinite)||a.x<0||a.y<0||a.w<=0||a.d<=0||a.x+a.w>AH||a.y+a.d>BH)throw new Error(`Lỗ chờ ${a.name} phải nằm trong AH × BH; điều chỉnh kích thước / tọa độ.`);
 for(let n=0;n<openings.length;n++)for(const b of openings.slice(n+1)){const a=openings[n];if(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.d&&a.y+a.d>b.y)throw new Error('Các lỗ chờ phòng máy không được chồng nhau.');}
 const hook={x:AH*s.hook.centerRatio[0],y:BH*s.hook.centerRatio[1],load:value(options,'hookLoad',25,'Tải móc treo')};
 return {openings,beam,hook,manualOpenings:!!manual,source:userTemplate.source,sha256:userTemplate.sha256,note:s.note};
}
