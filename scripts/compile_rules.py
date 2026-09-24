import json,re,xml.etree.ElementTree as ET
from pathlib import Path
from openpyxl.formula.tokenizer import Tokenizer
from openpyxl.utils.cell import range_boundaries,get_column_letter
ROOT=Path(__file__).resolve().parents[1]
J=lambda x:json.dumps(x,ensure_ascii=False,separators=(',',':'))
PRE={'=':1,'<>':1,'<':1,'>':1,'<=':1,'>=':1,'&':2,'+':3,'-':3,'*':4,'/':4,'^':5}
class Compiler:
 def __init__(self,formula,sheet,names):
  self.ts=[t for t in Tokenizer(formula).items if t.type!='WHITE-SPACE'];self.i=0;self.sheet=sheet;self.names=names;self.refs=set()
 def ref(self,s):
  if s.upper() in self.names:s=self.names[s.upper()]
  if '#REF!' in s:return 'e("#REF!")'
  sheet,addr=s.rsplit('!',1) if '!' in s else (self.sheet,s)
  sheet=sheet.strip("'");addr=addr.replace('$','')
  if not re.fullmatch(r'[A-Z]+[0-9]+(:[A-Z]+[0-9]+)?',addr,re.I):raise ValueError(s)
  if ':' in addr:
   a,b,c,d=range_boundaries(addr);return '['+','.join(self.ref(sheet+'!'+get_column_letter(x)+str(y)) for y in range(b,d+1) for x in range(a,c+1))+']'
  key=sheet+'!'+addr.upper();self.refs.add(key);return 'c('+J(key)+')'
 def expr(self,minimum=0):
  t=self.ts[self.i];self.i+=1
  if t.type=='OPERATOR-PREFIX':left='('+t.value+'n('+self.expr(6)+'))'
  elif t.type=='PAREN' and t.subtype=='OPEN':left=self.expr();assert self.ts[self.i].subtype=='CLOSE';self.i+=1
  elif t.type=='FUNC' and t.subtype=='OPEN':
   name=t.value[:-1].upper();args=[]
   while self.ts[self.i].subtype!='CLOSE':
    args.append(self.expr())
    if self.ts[self.i].type=='SEP':self.i+=1
    else:break
   assert self.ts[self.i].subtype=='CLOSE';self.i+=1
   if name=='IF':left='('+args[0]+'?'+args[1]+':'+(args[2] if len(args)>2 else 'false')+')'
   elif name in ('AND','OR'):left='('+('&&' if name=='AND' else '||').join('('+a+')' for a in args)+')'
   else:left='f('+J(name)+',['+','.join(args)+'])'
  elif t.type=='OPERAND':
   if t.subtype=='RANGE':left=self.ref(t.value)
   elif t.subtype=='TEXT':left=J(t.value[1:-1].replace('""','"'))
   elif t.subtype=='LOGICAL':left=t.value.lower()
   elif t.subtype=='NUMBER':left=t.value
   elif t.subtype=='ERROR':left='e('+J(t.value)+')'
   else:raise ValueError(t)
  else:raise ValueError(t)
  while self.i<len(self.ts):
   t=self.ts[self.i]
   if t.type!='OPERATOR-INFIX' or PRE[t.value]<minimum:break
   self.i+=1;right=self.expr(PRE[t.value]+1);op=t.value
   if op in ('+','-','*','/','^'):left='(n('+left+')'+('**' if op=='^' else op)+'n('+right+'))'
   elif op=='&':left='(s('+left+')+s('+right+'))'
   else:left='b('+J(op)+','+left+','+right+')'
  return left

models=[];functions=[];fixtures=[]
for p in sorted((ROOT/'analysis').glob('LEHY*.json')):
 d=json.loads(p.read_text());names={k.upper():v.replace('$','') for k,v in d['names'].items()};sheets={s['name']:s for s in d['sheets']};layout=sheets['Layout']['cells'];model={'id':p.stem.split('_')[0],'file':d['file'],'sha256':d['sha256'],'names':names,'values':{},'inputs':{},'outputs':{},'options':{},'messages':[],'dependencies':{}}
 funcs={};cache={}
 for sheet in d['sheets']:
  for addr,cell in sheet['cells'].items():
   key=sheet['name']+'!'+addr;v=cell['value']
   if isinstance(v,str) and v.startswith('='):
    compiler=Compiler(v,sheet['name'],names)
    try:code=compiler.expr();assert compiler.i==len(compiler.ts)
    except Exception as ex:raise RuntimeError((key,v,str(ex))) from ex
    funcs[key]='(c)=>'+code;model['dependencies'][key]=sorted(compiler.refs)
    if cell['cached'] is not None:cache[key]=cell['cached']
   else:model['values'][key]=v
 for addr,cell in layout.items():
  if re.fullmatch('C[0-9]+',addr) and addr!='C4':
   row=addr[1:];target='Layout!D'+row;code=cell['value'];v=layout.get('D'+row,{}).get('value')
   model['outputs' if isinstance(v,str) and v.startswith('=') else 'inputs'][code]=target
  if addr.startswith('F') and isinstance(cell['value'],str) and cell['value'].startswith('='):model['messages'].append('Layout!'+addr)
 for addr,cell in sheets['Input']['cells'].items():
  if re.fullmatch('[A-Z]+1',addr):
   col=addr[:-1];code=cell['value'];code='CeilingTH' if code=='CellingTH' else code
   if code not in model['inputs']:continue
   refs=[]
   for row in range(2,50):
    if col+str(row) not in sheets['Input']['cells']:break
    refs.append('Input!'+col+str(row))
   model['options'][code]=refs
 for validation in d['layout_validations']:
  x=ET.fromstring(validation['xml']);nodes={e.tag.split('}')[-1]:e.text for e in x.iter() if e.text}
  target='Layout!'+nodes.get('sqref',validation['attributes'].get('sqref',''))
  code=next((k for k,v in model['inputs'].items() if v==target),None)
  source=nodes.get('f',nodes.get('formula1','')).replace('$','')
  if code and source.startswith('Input!'):
   col,a,col2,z=re.fullmatch(r'Input!([A-Z]+)([0-9]+)(?::([A-Z]+)([0-9]+))?',source).groups()
   model['options'][code]=['Input!'+col+str(row) for row in range(int(a),int(z or a)+1)]
 model['options'].pop('DRE',None)
 models.append(model);functions.append(funcs);fixtures.append({'model':model['id'],'cached':cache})
text='import {n,s,b,f,e} from "./excel.mjs";\nexport const models='+J(models)+';\n'
for i,funcs in enumerate(functions):text+='models['+str(i)+'].formulas={'+','.join(J(k)+':'+v for k,v in funcs.items())+'};\n'
(ROOT/'dist/rules.mjs').write_text(text)
(ROOT/'analysis/fixtures.json').write_text(J(fixtures))
print('Compiled',len(models),'workbooks;',sum(map(len,functions)),'formulas;',len(text),'characters')
