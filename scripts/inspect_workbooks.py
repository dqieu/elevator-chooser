import io, json, hashlib, zipfile, xml.etree.ElementTree as ET
from pathlib import Path
import msoffcrypto, openpyxl
from oletools.olevba import VBA_Parser

import argparse
parser = argparse.ArgumentParser(description='Inspect locally supplied manufacturer workbooks; originals remain private.')
parser.add_argument('source', type=Path, help='Folder containing the original workbooks and Password (1).txt')
SOURCE = parser.parse_args().source
OUT = Path(__file__).resolve().parents[1] / 'analysis'
OUT.mkdir(exist_ok=True)
password = (SOURCE / 'Password (1).txt').read_text(encoding='utf-8-sig').strip()
for path in sorted(SOURCE.glob('*.xlsm')):
    if path.name.startswith('~$'): continue
    office = msoffcrypto.OfficeFile(io.BytesIO(path.read_bytes()))
    candidates = [password, password.split(':')[-1].strip(), password.split('=')[-1].strip()]
    for candidate in candidates:
        try:
            office.load_key(password=candidate, verify_password=True)
            stream=io.BytesIO(); office.decrypt(stream); break
        except Exception:
            stream=None
    if stream is None: raise RuntimeError('Cannot decrypt '+path.name)
    raw=stream.getvalue()
    xml=ET.fromstring(zipfile.ZipFile(io.BytesIO(raw)).read('xl/worksheets/sheet1.xml'))
    validations=[]
    for elem in xml.iter():
        if elem.tag.split('}')[-1]=='dataValidation':
            validations.append({'attributes':elem.attrib,'xml':ET.tostring(elem,encoding='unicode')})
    book=openpyxl.load_workbook(io.BytesIO(raw),data_only=False,keep_vba=True)
    values=openpyxl.load_workbook(io.BytesIO(raw),data_only=True)
    result={'file':path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'names':{k:v.attr_text for k,v in book.defined_names.items()},'sheets':[]}
    result['layout_validations']=validations
    for sheet in book:
        cells={c.coordinate:{'value':c.value,'cached':values[sheet.title][c.coordinate].value} for row in sheet for c in row if c.value is not None}
        result['sheets'].append({'name':sheet.title,'state':sheet.sheet_state,'cells':cells,'validations':[str(v) for v in sheet.data_validations.dataValidation],'merges':[str(m) for m in sheet.merged_cells.ranges]})
    vba=VBA_Parser(path.name,data=raw)
    modules=[]
    for _,_,name,code in vba.extract_macros():
        modules.append({'name':name,'code':code})
    result['vba']=modules
    (OUT/(path.stem+'.json')).write_text(json.dumps(result,ensure_ascii=False,indent=2,default=str))
    print(path.name,[(s['name'],len(s['cells'])) for s in result['sheets']], 'VBA',[(m['name'],len(m['code'])) for m in modules])
