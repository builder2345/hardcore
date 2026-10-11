#!/usr/bin/env python3
"""
claude.ai 아티팩트용 단일 페이지를 만든다: dist/naraak.html
- doctype/html/head/body 껍데기 없이 본문만 (게시 시 감싸진다)
- CSS와 JS는 인라인, 그림(assets/)은 같은 경로의 별도 파일로 함께 게시한다
사용: python3 -I tools/build_artifact.py
"""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
html = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
css = open(os.path.join(ROOT, 'css/style.css'), encoding='utf-8').read()

title = re.search(r'<title>.*?</title>', html, re.S).group(0)
fonts = '\n'.join(re.findall(r'<link rel="(?:preconnect|stylesheet)" href="https://fonts[^>]*>', html))
body = re.search(r'<body>(.*?)</body>', html, re.S).group(1)
scripts = re.findall(r'<script src="([^"]+)"></script>', body)
markup = re.sub(r'<script src="[^"]+"></script>\s*', '', body).strip()

js = []
for src in scripts:
    code = open(os.path.join(ROOT, src), encoding='utf-8').read()
    if '</script' in code.lower():
        raise SystemExit('스크립트 안에 </script 가 있다: ' + src)
    js.append('/* ' + src + ' */\n' + code)

out = '\n'.join([
    title,
    fonts,
    '<style>\n' + css + '\n</style>',
    markup,
    '<script>\n' + '\n'.join(js) + '\n</script>',
]) + '\n'

os.makedirs(os.path.join(ROOT, 'dist'), exist_ok=True)
path = os.path.join(ROOT, 'dist', 'naraak.html')
open(path, 'w', encoding='utf-8').write(out)
assets = []
for dp, dn, fn in os.walk(os.path.join(ROOT, 'assets')):
    for f in fn:
        if f.lower().endswith('.png'):
            assets.append(os.path.relpath(os.path.join(dp, f), ROOT))
print(path, len(out), 'bytes;', len(assets), 'asset files')
