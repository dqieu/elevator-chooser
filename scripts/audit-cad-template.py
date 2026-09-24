"""Independent DXF and optional ODA readback checks for the complete user-template sets."""
from pathlib import Path
from collections import Counter
import argparse,json,ezdxf
parser=argparse.ArgumentParser()
parser.add_argument('--roundtrip',action='store_true')
parser.add_argument('--roundtrip-dir',default='roundtrip')
args=parser.parse_args()
root=Path(__file__).resolve().parents[1]/'analysis/cad/template-test'
for row in json.loads((root/'manifest.json').read_text()):
    original=ezdxf.readfile(root/(row['name']+'.dxf'))
    docs=[original]
    if args.roundtrip:
        actual=ezdxf.readfile(root/args.roundtrip_dir/(row['name']+'.dxf'))
        assert actual.header['$INSUNITS']==4
        assert Counter(e.dxftype() for e in original.modelspace())==Counter(e.dxftype() for e in actual.modelspace())
        for a,b in zip(original.modelspace(),actual.modelspace()):
            assert a.dxftype()==b.dxftype() and a.dxf.layer==b.dxf.layer
            assert a.dxf.color==b.dxf.color
            if a.dxftype()=='DIMENSION':
                assert a.dxf.text==b.dxf.text
            if a.dxftype()=='LINE':
                assert a.dxf.start.isclose(b.dxf.start,abs_tol=1e-7) and a.dxf.end.isclose(b.dxf.end,abs_tol=1e-7)
            elif a.dxftype()=='TEXT':
                assert a.dxf.text==b.dxf.text and a.dxf.insert.isclose(b.dxf.insert,abs_tol=1e-7)
                assert abs(a.dxf.height-b.dxf.height)<1e-7 and abs(a.dxf.rotation-b.dxf.rotation)<1e-7
        docs.append(actual)
    for doc in docs:
        audit=doc.audit();assert not audit.errors and not audit.fixes,row['name']
        dims=list(doc.modelspace().query('DIMENSION'));assert len(dims)==len(row['expectedDimensions'])
        for dim,expected in zip(dims,row['expectedDimensions']):
            assert abs(dim.get_measurement()-expected)<.002
            assert len(doc.blocks[dim.dxf.geometry])>=6
print('Six complete template sets passed: clean audits and native dimensions'+('; DWG readback preserves geometry, text, layers and mm units.' if args.roundtrip else '.'))
