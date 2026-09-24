"""Audit generated plans with a separate DXF implementation; run test-cad.mjs first."""
from pathlib import Path
import json
import ezdxf
root=Path(__file__).resolve().parents[1]/'analysis/cad/plan-test'
samples=json.loads((root/'manifest.json').read_text())
for s in samples:
    d=ezdxf.readfile(root/(s['name']+'.dxf'));audit=d.audit()
    assert not audit.errors and not audit.fixes,s['name']
    dims=list(d.modelspace().query('DIMENSION'));o=s['outputs']
    expected=[o['AH'],o['HAXX'],o['AH']-o['HAXX'],s['rails'][1]['x']-s['rails'][0]['x'],s['inputs']['AA'],s['inputs']['BB'],o['BH'],s['rails'][0]['y'],s['counter']['y'],o['DTL'],s['inputs']['JJ']]
    assert len(dims)==len(expected)
    for entity,value in zip(dims,expected):assert abs(entity.get_measurement()-value)<.002,(s['name'],value)
    assert len(d.modelspace().query('LINE[layer=="RAIL"]'))==56
    assert d.viewports.get('*Active')[0].dxf.height>1000
print(f'{len(samples)} DXFs: audit, native dimension measurements, extracted rail profiles and opening view passed.')
