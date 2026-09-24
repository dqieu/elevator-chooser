"""Audit ODA's DXF readback of test-dwg.mjs output, independently of acadrust."""
from pathlib import Path
from collections import Counter
import json
import ezdxf
root = Path(__file__).resolve().parents[1] / 'analysis/cad'
rows = json.loads((root / 'model-review/manifest.json').read_text())
def check_entity(a, b):
    assert a.dxftype() == b.dxftype()
    assert a.dxf.layer == b.dxf.layer
    if a.dxftype() == 'LINE':
        assert a.dxf.start.isclose(b.dxf.start, abs_tol=1e-7)
        assert a.dxf.end.isclose(b.dxf.end, abs_tol=1e-7)
    elif a.dxftype() == 'TEXT':
        assert a.dxf.text == b.dxf.text
        assert a.dxf.insert.isclose(b.dxf.insert, abs_tol=1e-7)
        assert abs(a.dxf.height - b.dxf.height) < 1e-7
        assert abs(a.dxf.rotation - b.dxf.rotation) < 1e-7
for row in rows:
    name = row['name']
    original = ezdxf.readfile(root / 'model-review' / (name + '.dxf'))
    result = ezdxf.readfile(root / 'dwg-wasm-roundtrip' / (name + '.dxf'))
    audit = result.audit()
    assert not audit.errors and not audit.fixes, name
    assert result.header['$INSUNITS'] == 4, name
    assert Counter(e.dxftype() for e in original.modelspace()) == Counter(e.dxftype() for e in result.modelspace()), name
    for a, b in zip(original.modelspace(), result.modelspace()):
        check_entity(a, b)
        if a.dxftype() == 'DIMENSION':
            assert abs(a.get_measurement() - b.get_measurement()) < 1e-7
            assert a.dxf.text == b.dxf.text
            old, new = original.blocks[a.dxf.geometry], result.blocks[b.dxf.geometry]
            assert len(old) == len(new)
            for x, y in zip(old, new):
                check_entity(x, y)
    a, b = original.viewports.get('*Active')[0], result.viewports.get('*Active')[0]
    assert a.dxf.center.isclose(b.dxf.center, abs_tol=1e-7)
    assert abs(a.dxf.height - b.dxf.height) < 1e-7
    assert abs(a.dxf.aspect_ratio - b.dxf.aspect_ratio) < 1e-7
print(f'{len(rows)} DWG/WASM/ODA roundtrips passed: geometry, text, layers, native dimensions, dimension graphics, viewports and mm units; clean audits.')
