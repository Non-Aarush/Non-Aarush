#!/usr/bin/env node
'use strict';
/*
 * Embeds Monocraft (SIL OFL) as a base64 @font-face inside every assets/*.svg.
 *   1. Put Monocraft.ttf in fonts/  (https://github.com/IdreesInc/Monocraft/releases) - or let this script try to download it.
 *   2. node scripts/embed-font.js
 * It subsets the font to the glyphs we use (needs `pip install fonttools brotli`) to keep each SVG well under 1 MB;
 * without fonttools it embeds the full TTF and warns if the SVGs get big.
 * It also writes fonts/monocraft.src.txt (used by generate-stats.js).
 */
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..'), ttf = path.join(ROOT, 'fonts', 'Monocraft.ttf');
const URLS = ['https://github.com/IdreesInc/Monocraft/releases/latest/download/Monocraft.ttf'];
const UNI = 'U+0020-007E,U+00A0-00FF,U+2022,U+2026,U+25B6,U+25BE,U+25BC,U+2588,U+269D,U+2725,U+272A,U+272B';

(async () => {
  if (!fs.existsSync(ttf)) {
    for (const u of URLS) {
      try { const r = await fetch(u); if (r.ok) { fs.writeFileSync(ttf, Buffer.from(await r.arrayBuffer())); break; } } catch (e) {}
    }
  }
  if (!fs.existsSync(ttf)) { console.error('Could not download Monocraft. Download Monocraft.ttf manually into fonts/ and re-run.'); process.exit(1); }

  let file = ttf, mime = 'font/ttf', fmt = 'truetype';
  for (const [flavor, ext, m] of [['woff2','woff2','font/woff2'], ['woff','woff','font/woff']]) {
    const o = path.join(ROOT, 'fonts', 'Monocraft.subset.' + ext);
    try { execFileSync('pyftsubset', [ttf, '--unicodes=' + UNI, '--flavor=' + flavor, '--output-file=' + o, '--layout-features=*'], {stdio:'pipe'});
      file = o; mime = m; fmt = flavor; break; } catch (e) {}
  }
  const b64 = fs.readFileSync(file).toString('base64');
  fs.writeFileSync(path.join(ROOT, 'fonts', 'monocraft.src.txt'), `url(data:${mime};base64,${b64}) format('${fmt}')`);
  console.log(`font: ${fmt}, ${(b64.length/1024).toFixed(0)} KB base64`);

  const css = `/*FONT_START*/@font-face{font-family:'Monocraft';src:url(data:${mime};base64,${b64}) format('${fmt}');}/*FONT_END*/`;
  for (const f of fs.readdirSync(path.join(ROOT, 'assets')).filter(f => f.endsWith('.svg'))) {
    const p = path.join(ROOT, 'assets', f), s = fs.readFileSync(p, 'utf8');
    if (!s.includes('/*FONT_START*/')) continue;
    const n = s.replace(/\/\*FONT_START\*\/[\s\S]*?\/\*FONT_END\*\//, () => css);
    fs.writeFileSync(p, n);
    const kb = n.length/1024; console.log(`  ${f}: ${kb.toFixed(0)} KB${kb > 1000 ? '  (over ~1 MB: install fonttools+brotli and re-run)' : ''}`);
  }
})();
