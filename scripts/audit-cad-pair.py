"""Independent audit of the paired and separate sheets from test-cad-pair.mjs."""
from pathlib import Path
import json
import ezdxf
root=Path(__file__).resolve().parents[1]/'analysis/cad/model-review'
rows=json.loads((root/'manifest.json').read_text())
for row in rows:
    doc=ezdxf.readfile(root/(row['name']+'.dxf'))
    audit=doc.audit()
    assert not audit.errors and not audit.fixes,row['name']
    dims=list(doc.modelspace().query('DIMENSION'))
    assert len(dims)==len(row['expectedDimensions'])
    for dim,expected in zip(dims,row['expectedDimensions']):
        assert abs(dim.get_measurement()-expected)<.002,(row['name'],expected)
        assert len(doc.blocks[dim.dxf.geometry])>=6
    if row['kind']!='plan':
        labels=[e.dxf.text for e in doc.modelspace().query('TEXT')]
        assert sum(t.startswith('Tang ') for t in labels)==row['manual']['stops']
print(f'{len(rows)} sheets: clean DXF audits, native measurements, cached dimensions and floor counts passed.')
