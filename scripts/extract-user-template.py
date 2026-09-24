"""Compile traced source vectors. Copies only; never uploads or alters the original."""
from pathlib import Path
import json,hashlib
import ezdxf
from ezdxf.disassemble import recursive_decompose
from ezdxf.path import make_path
from ezdxf import bbox
root=Path(__file__).resolve().parents[1]
source=root/'analysis/cad/user-template-20260923/dxf/template.dxf'
doc=ezdxf.readfile(source)
sha=hashlib.sha256((source.parent.parent/'input/template.dwg').read_bytes()).hexdigest()
parts={}
def extract(name,handles,origin,kind):
    records=[]
    for handle in handles:
        for index,e in enumerate(recursive_decompose([doc.entitydb[handle]])):
            if e.dxftype() not in ('LINE','LWPOLYLINE','POLYLINE','ARC','CIRCLE','ELLIPSE','SPLINE'):continue
            points=list(make_path(e).flattening(.35))
            segments=[]
            for a,b in zip(points,points[1:]):
                row=[round(a.x-origin[0],5),round(a.y-origin[1],5),round(b.x-origin[0],5),round(b.y-origin[1],5)]
                if row[:2]!=row[2:]:segments.append(row)
            if not segments:continue
            layer=e.dxf.layer
            role=kind
            if name=='mrlAssembly':
                b=bbox.extents([e],fast=True)
                if b.size.y>6000:role='ropes'
                elif b.extmax.y<-430000:role='pitAssembly'
                elif b.extmin.y>-416850 and b.extmin.x>119980:role='machine'
                else:role='carAssembly'
            records.append({'sourceHandle':handle,'child':index,'layer':layer,'color':e.dxf.color if 0<e.dxf.color<256 else abs(doc.layers.get(layer).dxf.color),'role':role,'segments':segments})
    assert records,name
    parts[name]={'handles':handles,'origin':origin,'records':records}
mr=(102394.0789876672,-432956.9102796214)
mrl=(119087.3993,-432956.9102796214)
extract('mrCar',[f'{h:X}' for h in range(int('F1F4D43',16),int('F1F4D59',16))],mr,'carAssembly')
extract('mrMachine',['F1F4D5A'],mr,'machine')
extract('mrRopes',['F1F4D5F','F1F4D60','F1F4D61'],mr,'ropes')
extract('mrCounterBuffer',['F1F4D62'],mr,'pitAssembly')
extract('mrHook',['F1F4D7E'],mr,'hook')
extract('mrlAssembly',['F1FC69F'],mrl,'assembly')
extract('mrlHook',['F1FC46A'],mrl,'hook')
extract('landingDoor',['F1F4D22'],mr,'landingDoor')
# Source hook glyph, for the room plan; dimensioned opening shapes are built in code.
extract('planHook',['F1F4F43','F1F4F44'],(202949.838,-436363.404),'hook')
# Trace only the contractor logo geometry inside its source title-block cell.
logo=[]
for n,e in enumerate(recursive_decompose([doc.entitydb['F1F4C1F']])):
    if e.dxftype() not in ('LINE','LWPOLYLINE','POLYLINE','ARC','CIRCLE','ELLIPSE','SPLINE'):continue
    b=bbox.extents([e],fast=True)
    if not b.has_data or not (80000<b.extmin.x<b.extmax.x<80900 and -444090<b.extmin.y and b.extmax.y<-443800):continue
    pts=list(make_path(e).flattening(.1));segs=[[round(a.x-80000,4),round(a.y+444090,4),round(b.x-80000,4),round(b.y+444090,4)]for a,b in zip(pts,pts[1:])]
    if segs:logo.append({'sourceHandle':'F1F4C1F','child':n,'layer':e.dxf.layer,'role':'logo','segments':segs})
if logo:parts['logo']={'handles':['F1F4C1F'],'origin':[80000,-444090],'records':logo}
result={'source':'Bản vẽ gửi CHAT GPT.dwg','sha256':sha,'dxfSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'tolerance':.35,'parts':parts,
 'section':{'shaftDepth':2455,'travel':14100,'pit':1701.5203312952,'ceiling':18550.01,'roomFloor':18700,'roof':20900,
 'mr':{'carFront':319.044,'carBack':2019.044,'carHeight':2300},'mrl':{'carFront':274.3511,'carBack':1950.3511,'carHeight':2400}},
 'openings':{'shaft':[2160,2600],'installation':{'size':[800,800],'centerRatio':[.5,1037.5/2600]},'cable':{'size':[300,300],'centerRatios':[[862.51/2160,2100/2600],[1302.51/2160,2100/2600]]},'beam':{'size':[1200,150,650],'centerRatio':.5},'hook':{'centerRatio':[.5,1037.5/2600],'loadKN':25},'note':'Cable-opening note says 250x250; source drawn squares measure 300x300. User confirmed 300x300 on 2026-09-24; parameterized openings follow the drawn size.'}}
(root/'dist/cad-assets/user-template.mjs').write_text('export const userTemplate = '+json.dumps(result,ensure_ascii=False,separators=(',',':'))+';\n')
report={k:{'records':len(v['records']),'segments':sum(len(r['segments'])for r in v['records'])}for k,v in parts.items()}
(source.parent.parent/'extraction.json').write_text(json.dumps(report,indent=2))
print(report)
