"""Independent section-DXF audit and dimension checks. Run test-section.mjs first."""
from pathlib import Path
import json
import ezdxf
root=Path(__file__).resolve().parents[1]/'analysis/cad/section-test'
samples=json.loads((root/'manifest.json').read_text())
for sample in samples:
    doc=ezdxf.readfile(root/(sample['name']+'.dxf'))
    audit=doc.audit()
    assert not audit.errors and not audit.fixes, sample['name']
    dims=list(doc.modelspace().query('DIMENSION'))
    assert len(dims)==len(sample['expectedDimensions'])
    for entity,expected in zip(dims,sample['expectedDimensions']):
        assert abs(entity.get_measurement()-expected)<.002, (sample['name'],expected)
    labels=[e.dxf.text for e in doc.modelspace().query('TEXT')]
    assert sum(s.startswith('Tang ') for s in labels)==sample['options']['stops']
    assert doc.viewports.get('*Active')[0].dxf.height>1000
print(f'{len(samples)} section DXFs: no audit errors/fixes; independently measured dimensions and floor marker counts passed.')
