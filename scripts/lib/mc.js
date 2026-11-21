'use strict';
// Shared Minecraft / Hypixel helpers: colours, Bed Wars stars, ranks, shadow text, typewriter.
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');

const C = { green:'#55FF55', aqua:'#55FFFF', red:'#FF5555', pink:'#FF55FF', yellow:'#FFFF55', white:'#FFFFFF',
  gold:'#FFAA00', gray:'#AAAAAA', dgray:'#555555', blue:'#5555FF', dgreen:'#00AA00', daqua:'#00AAAA',
  dred:'#AA0000', dblue:'#0000AA', purple:'#AA00AA' };
const col = c => C[c] || c;
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
// Minecraft text shadow = colour * 0.25
const shade = h => { if (h.length === 4) h = '#' + [...h.slice(1)].map(c => c + c).join(''); return '#' + [1,3,5].map(i => Math.round(parseInt(h.slice(i,i+2),16)*0.25).toString(16).padStart(2,'0')).join(''); };
const len = segs => segs.reduce((n,s) => n + [...s[0]].length, 0);
const FAM = "'Monocraft',monospace";

// ---- font: injected between markers by scripts/embed-font.js (fonts/monocraft.src.txt) ----
function fontCss() {
  let src = '';
  try { src = fs.readFileSync(path.join(ROOT,'fonts','monocraft.src.txt'),'utf8').trim(); } catch (e) {}
  return '/*FONT_START*/' + (src ? `@font-face{font-family:'Monocraft';src:${src};}` : '') + '/*FONT_END*/';
}

// ---- Bed Wars prestige star: returns colour segments ----
const RAINBOW = ['red','gold','yellow','green','aqua','pink','purple'];
const PREST = {0:'gray',100:'white',200:'gold',300:'aqua',400:'dgreen',500:'daqua',600:'dred',700:'pink',800:'blue',
  900:'purple',1200:'yellow',1300:'aqua',1400:'green',1500:'daqua',1600:'red',1700:'pink',1800:'blue',1900:'purple'};
function star(l) {
  l = Math.floor(l);
  const sym = l >= 3100 ? '✥' : l >= 2100 ? '⚝' : l >= 1100 ? '✪' : '✫', s = String(l), h = Math.floor(l/100)*100;
  if (l >= 1000 && l < 1100) return ['[', ...s, sym, ']'].map((c,i) => [c, RAINBOW[i % 7]]);
  if (l >= 5000 && l < 5100) { // Eternal Prestige (approximation of the in-game gradient)
    const g = ['dred','red','gold','yellow','green','aqua','blue','purple'];
    return ['[', ...s, sym, ']'].map((c,i) => [c, g[i % g.length]]);
  }
  if (h === 1100) return [['[','gray'],[s,'white'],[sym,'gray'],[']','gray']];
  if (h === 2000) return [['[','gold'],[s,'gold'],[sym,'yellow'],[']','gold']];
  if (h >= 2100)  return [['[','gray'],[s,'white'],[sym,'yellow'],[']','gray']];
  return [[`[${s}${sym}]`, PREST[h] || 'gray']];
}
// ---- Hypixel ranks ----
const RANK = { 'MVP++':{c:'gold',plus:'+\u200A+',pc:'dblue',base:'MVP'}, 'MVP+':{c:'aqua',plus:'+',pc:'red',base:'MVP'},
  'MVP':{c:'aqua',plus:'',base:'MVP'}, 'VIP+':{c:'green',plus:'+',pc:'gold',base:'VIP'}, 'VIP':{c:'green',plus:'',base:'VIP'} };
function rank(r, plusColor) {
  const k = RANK[r], s = [[`[${k.base}`, k.c]];
  if (k.plus) s.push([k.plus, plusColor || k.pc]);
  s.push([']', k.c]); return s;
}
const rankColor = r => RANK[r].c;
const chat = (lvl, r, name, msg, pc) =>
  [...star(lvl), [' ','white'], ...rank(r,pc), [' ','white'], [name, rankColor(r)], [': ','white'], [msg,'white']];

// ---- text with Minecraft drop shadow (a darker copy offset by size/8) ----
function txt(x, y, segs, o = {}) {
  const size = o.size || 15, w = len(segs) * size * 0.6;
  if (o.anchor === 'end') x -= w; else if (o.anchor === 'middle') x -= w/2;
  const off = Math.max(1, Math.round(size/8));
  const mk = (d, sh) => `<text x="${(x+d).toFixed(1)}" y="${(y+d).toFixed(1)}" font-size="${size}" textLength="${w.toFixed(1)}" lengthAdjust="spacing" xml:space="preserve">` +
    segs.map(([t,c]) => `<tspan fill="${sh ? shade(col(c)) : col(c)}">${esc(t)}</tspan>`).join('') + '</text>';
  return `<g${o.attr || ''}>${mk(off,true)}${mk(0,false)}</g>`;
}

// ---- typewriter: each line revealed char-by-char with a clip-path width animation + block cursor ----
// All animations share one duration T (looping, in sync). Pass o.T to force a common period.
function typewriter(items, o) {
  const size = o.size || 15, cw = size*0.6, id = o.id || 'tw', dt = o.dt || 0.022, gap = o.gap || 0.45, hold = o.hold || 5;
  let t = o.t0 || 0.6;
  const plan = items.map(s => { const n = len(s), st = t; t += n*dt + gap; return {s, n, st}; });
  const T = o.T || (t + hold), k = v => (v/T).toFixed(4);
  let defs = '', body = '';
  plan.forEach((p, i) => {
    const y = o.y0 + i*o.step, last = i === plan.length-1, x = o.x;
    const J = Array.from({length:p.n}, (_, j) => j);
    const kt = ['0', ...J.map(j => k(p.st + j*dt))].join(';');
    const wv = ['0', ...J.map(j => ((j+1)*cw + 3).toFixed(1))].join(';');
    const xv = [x.toFixed(1), ...J.map(j => (x + (j+1)*cw).toFixed(1))].join(';');
    defs += `<clipPath id="${id}${i}"><rect x="${x-2}" y="${y-size-2}" width="0" height="${size+8}"><animate attributeName="width" values="${wv}" keyTimes="${kt}" calcMode="discrete" dur="${T.toFixed(2)}s" repeatCount="indefinite"/></rect></clipPath>`;
    body += txt(x, y, p.s, {size, attr:` clip-path="url(#${id}${i})"`});
    const vis = last ? `values="0;1" keyTimes="0;${k(p.st)}"` : `values="0;1;0" keyTimes="0;${k(p.st)};${k(p.st + p.n*dt + 0.05)}"`;
    body += `<g opacity="0"><animate attributeName="opacity" ${vis} calcMode="discrete" dur="${T.toFixed(2)}s" repeatCount="indefinite"/>` +
      `<g><animate attributeName="opacity" values="1;0" dur="0.9s" calcMode="discrete" repeatCount="indefinite"/>` +
      `<rect x="${x}" y="${y-size+1}" width="${(cw-1.5).toFixed(1)}" height="${size}" fill="#fff" opacity=".9"><animate attributeName="x" values="${xv}" keyTimes="${kt}" calcMode="discrete" dur="${T.toFixed(2)}s" repeatCount="indefinite"/></rect></g></g>`;
  });
  return {defs, body, T};
}

const panel = (w, h) =>
  `<rect x="5" y="5" width="${w-10}" height="${h-10}" rx="10" fill="none" stroke="#ff4d4d" stroke-width="4" opacity=".5" filter="url(#glow)"/>` +
  `<rect x="5.5" y="5.5" width="${w-11}" height="${h-11}" rx="10" fill="#050505" stroke="#ff4d4d" stroke-width="1"/>`;

function shell(w, h, defs, body) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img">\n` +
    `<defs><style>${fontCss()}\ntext{font-family:${FAM};white-space:pre}</style>` +
    `<filter id="glow" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="4"/></filter>${defs}</defs>\n${body}\n</svg>\n`;
}
module.exports = { ROOT, C, col, esc, shade, len, txt, star, rank, rankColor, chat, typewriter, panel, shell };
