"""Rebuild small reference index from locally inspected, ignored SMEC copies. Run from repo root."""
import json,re
from pathlib import Path
base=Path('analysis/cad/smec-models');manifest=json.load(open(base/'manifest.json'));g=json.load(open('analysis/cad/smec-g/manifest.json'))
hashes={r['file']:r['sha256'] for r in manifest+g}
plans=[]
for n in list(range(1,12))+list(range(14,24)):
 f=f'LEHY-L-S-{n:02}-1.dwg';rows=json.load(open(base/'extracted'/f.replace('.dwg','.json')))['texts']
 v={}
 for key in ['AA','BB','BG','EE']:
  vals=[float(m[1])for r in rows if (m:=re.fullmatch(key+r' (\d+(?:\.\d+)?)',r['text']))]
  if vals:v[key]=vals[0]
 plans.append(dict(file=f,through=n>=14,door='CO' if n in [1,3,5,7,9,14,16,18,20,22] else 'SO',**v))
Path('dist/cad-assets/references.mjs').write_text('export const drawingHashes = '+json.dumps(hashes,ensure_ascii=False,indent=2)+';\nexport const lsPlanSamples = '+json.dumps(plans,ensure_ascii=False,indent=2)+';\n')
