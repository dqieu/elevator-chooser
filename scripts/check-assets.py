from pathlib import Path
from html.parser import HTMLParser
import re, subprocess, shutil
root=Path(__file__).resolve().parents[1]
class Parser(HTMLParser):
 def handle_starttag(self,tag,attrs):
  for k,v in attrs:
   if k in ('src','href') and v and v!='./':
    if tag=='a' and v.startswith('https:'):continue
    assert not v.startswith(('http:', 'https:')),v
    assert (root/'dist'/v.split('?')[0]).is_file(),v
p=Parser();p.feed((root/'dist/index.html').read_text())
for path in (root/'dist').glob('*.mjs'):
 subprocess.run([shutil.which('node') or 'node','--check',str(path)],check=True)
 for ref in re.findall(r'''(?:from\s*|import\s*|new Worker\()['"](\./[^'"]+)''',path.read_text()):
  assert (path.parent/ref.split('?')[0]).is_file(),ref
assert (root/'dist/en81.mjs').is_file()
print('HTML entrypoint, local module/worker references, and JavaScript syntax verified.')
