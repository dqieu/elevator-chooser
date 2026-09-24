import {templateParts} from './cad-assets/template-parts.mjs?v=20260924-specdefaults';

// Common graphics and native dimension definitions for plan and section sheets.
export function cadCanvas(h){
 const entities=[],dimensions=[];
 const line=(x1,y1,x2,y2,layer='OUTLINE')=>entities.push({type:'line',x1,y1,x2,y2,layer});
 const text=(x,y,value,layer='TEXT',size=h,rotation=0)=>entities.push({type:'text',x,y,value:String(value),layer,size,rotation});
 const rect=(x,y,w,d,layer='OUTLINE')=>{line(x,y,x+w,y,layer);line(x+w,y,x+w,y+d,layer);line(x+w,y+d,x,y+d,layer);line(x,y+d,x,y,layer)};
 const axis=(x1,y1,x2,y2)=>{const length=Math.hypot(x2-x1,y2-y1);for(let t=0;t<length;t+=h*3){for(const [start,end] of [[t,t+h*2],[t+h*2.4,t+h*2.55]]){if(start>=length)continue;const z=Math.min(end,length);line(x1+(x2-x1)*start/length,y1+(y2-y1)*start/length,x1+(x2-x1)*z/length,y1+(y2-y1)*z/length,'CENTER')}}};
 const dh=(a,b,y,dy,label)=>{const start=entities.length;line(a,y,a,dy,'DIM');line(b,y,b,dy,'DIM');line(a,dy,b,dy,'DIM');for(const x of [a,b])line(x-h*.25,dy-h*.25,x+h*.25,dy+h*.25,'DIM');text((a+b)/2-label.length*h*.22,dy+h*.4,label,'DIMTEXT',h*.8);dimensions.push({start,end:entities.length,a:[a,y],b:[b,y],location:[b,dy],text:[(a+b)/2,dy+h*.4],rotation:0,label,height:h*.8})};
 const dv=(a,b,x,dx,label)=>{const start=entities.length;line(x,a,dx,a,'DIM');line(x,b,dx,b,'DIM');line(dx,a,dx,b,'DIM');for(const y of [a,b])line(dx-h*.25,y-h*.25,dx+h*.25,y+h*.25,'DIM');text(dx-h*.4,(a+b)/2-label.length*h*.22,label,'DIMTEXT',h*.8,90);dimensions.push({start,end:entities.length,a:[x,a],b:[x,b],location:[dx,b],text:[dx-h*.4,(a+b)/2],rotation:90,label,height:h*.8})};
 const wallRect=(x,y,w,d)=>{if(w<=0||d<=0)return;rect(x,y,w,d,'WALL');
  for(const p of templateParts.concretePattern){const angle=p.angle*Math.PI/180,u=[Math.cos(angle),Math.sin(angle)],v=[-u[1],u[0]],delta=v[0]*p.offset[0]+v[1]*p.offset[1];
   const projections=[[x,y],[x+w,y],[x,y+d],[x+w,y+d]].map(c=>((c[0]-p.base[0])*v[0]+(c[1]-p.base[1])*v[1])/delta);
   for(let n=Math.floor(Math.min(...projections))-1;n<=Math.ceil(Math.max(...projections))+1;n++){const base=[p.base[0]+n*p.offset[0],p.base[1]+n*p.offset[1]];let lo=-Infinity,hi=Infinity;
    for(let axis=0;axis<2;axis++){const min=axis===0?x:y,max=min+(axis===0?w:d);if(Math.abs(u[axis])<1e-9){if(base[axis]<min||base[axis]>max){hi=-Infinity;break}}else{const a=(min-base[axis])/u[axis],b=(max-base[axis])/u[axis];lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b))}}
    if(hi<=lo)continue;const period=p.dashes.reduce((sum,z)=>sum+Math.abs(z),0);
    for(let t=Math.floor(lo/period)*period;t<hi;t+=period){let offset=0;for(const dash of p.dashes){if(dash>=0){const a=Math.max(lo,t+offset),b=Math.min(hi,t+offset+Math.max(dash,.8));if(b>a)line(base[0]+a*u[0],base[1]+a*u[1],base[0]+b*u[0],base[1]+b*u[1],'HATCH')}offset+=Math.abs(dash)}}
   }
  }
 };
 return {entities,dimensions,line,text,rect,axis,dh,dv,wallRect};
}
