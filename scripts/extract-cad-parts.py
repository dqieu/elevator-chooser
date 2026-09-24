"""Extract bounded, source-traceable 2D details; never alter source drawings."""
from pathlib import Path
import json, hashlib
import ezdxf
from ezdxf.disassemble import recursive_decompose
from ezdxf.path import make_path
root=Path(__file__).resolve().parents[1]
p=root/'analysis/cad/oda/template-1.dxf';doc=ezdxf.readfile(p)
def segments(entities,origin=(0,0)):
    result=[]
    for e in recursive_decompose(entities):
        if e.dxftype() not in ('LINE','LWPOLYLINE','POLYLINE','ARC','CIRCLE','ELLIPSE','SPLINE'):continue
        pts=list(make_path(e).flattening(.1))
        for a,b in zip(pts,pts[1:]):
            row=[round(a.x-origin[0],4),round(a.y-origin[1],4),round(b.x-origin[0],4),round(b.y-origin[1],4)]
            if row[:2]!=row[2:]:result.append(row)
    return result
parts={}
for name in ['T75-3_B','TD65']:
    parts[name]={'segments':segments(doc.blocks[name]),'sourceBlock':name,'transform':'Rigid placement only; no profile scaling'}
# Car and landing entrance details from the same CO900 installation plan.
origin=(229312.7885599415,-76430.02843834425)
for name,handles in {
    'coCarSill':['F15F7E1','F15F7E2','F15F7E3'],
    'coLanding':['F15F7FB','F15F7FC','F15F7FD','F15F805','F15F806','F15F80A','F15F80B'],
    'counterRear':['F15F810','F15F81E'],
}.items():
    org=(229492.7885599415,-74645.02843834425) if name=='counterRear' else origin
    parts[name]={'segments':segments([doc.entitydb[h] for h in handles],org),'sourceHandles':handles,'reference':{'JJ':900,'AA':1600,'WG':1350,'WW':150},'transform':'Presentation adaptation; confirm component selection before installation'}
hatch=next(e for e in doc.modelspace().query('HATCH') if e.dxf.pattern_name=='AR-CONC' and e.dxf.pattern_scale==20)
anchor=hatch.pattern.lines[0].base_point
pattern=[{'angle':l.angle,'base':[l.base_point.x-anchor.x,l.base_point.y-anchor.y],'offset':list(l.offset),'dashes':l.dash_length_items} for l in hatch.pattern.lines]
result={'concretePattern':pattern,'source':'template-1.dwg / passenger with machine room','dxfSha256':hashlib.sha256(p.read_bytes()).hexdigest(),'parts':parts}
out=root/'dist/cad-assets/template-parts.mjs';out.write_text('export const templateParts = '+json.dumps(result,ensure_ascii=False,separators=(',',':'))+';\n')
print({k:len(v['segments']) for k,v in parts.items()})
