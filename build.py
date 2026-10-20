import re,os
import os.path as P; base=P.dirname(P.abspath(__file__)); src=P.join(base,'src'); out=base; os.makedirs(out,exist_ok=True)
h=open(f'{src}/index.html').read()
h=h.replace('<link rel="stylesheet" href="styles.css">','<style>\n'+open(f'{src}/styles.css').read()+'\n</style>')
def rep(m): return '<script>\n'+open(f'{src}/'+m.group(1)).read()+'\n</script>'
h=re.sub(r'<script src="([a-z]+\.js)"></script>',rep,h)
h=h.replace('<head>','<head>\n<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🍺</text></svg>">',1)
open(f'{out}/index.html','w').write(h); print(len(h))
