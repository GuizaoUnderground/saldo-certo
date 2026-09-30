#!/bin/sh
set -e
cd "$(dirname "$0")/.."
node web-preview/build.mjs >/dev/null 2>&1 || node web-preview/build.mjs
python3 - <<'P'
t=open('web-preview/pagina.html').read(); js=open('web-preview/dist/app.js').read().replace('</script','<\\/script')
open('web-preview/dist/saldo-certo.html','w').write(t.replace('__APP_JS__',js))
open('web-preview/dist/local.html','w').write('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+t.replace('__APP_JS__',js).replace('<title>Saldo Certo</title>','<title>Saldo Certo</title></head><body>',1)+'</body></html>')
P
echo build-ok
