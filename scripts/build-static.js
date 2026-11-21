#!/usr/bin/env node
'use strict';
// Builds assets/intro.svg, header.svg, stack.svg, play.svg, footer.svg from profile.config.json.
// Edit the config (ABOUT_LINE / LANGS / PROJECTS / TECH ...) then run:  node scripts/build-static.js
const fs = require('fs'), path = require('path');
const L = require('./lib/mc'); const { C, txt, star, rank, chat, typewriter, panel, shell, len } = L;
const cfg = JSON.parse(fs.readFileSync(path.join(L.ROOT,'profile.config.json'),'utf8'));
const out = (n, s) => { fs.writeFileSync(path.join(L.ROOT,'assets',n), s); console.log('wrote assets/'+n, (s.length/1024).toFixed(1)+' KB'); };
const U = cfg.USER, LV = cfg.LEVEL, W = 820, MAXC = Math.floor((W-60)/9);
const fit = (s, n) => { s = String(s); return [...s].length > n ? [...s].slice(0,n-1).join('')+'…' : s; };
const say = (lvl, r, name, msg, pc) => { const pre = len(chat(lvl,r,name,'',pc)); return chat(lvl, r, name, fit(msg, MAXC-pre), pc); };
const me = msg => say(LV, 'MVP++', U, msg);

// ---------- intro.svg : Hypixel Bed Wars lobby chat ----------
{
  const lines = [
    [['Sending you to BedWarsLobby12!','green']],
    [...rank('MVP++'), [' '+U+' joined the lobby!','gold']],
    me('hi everyone! o/'),
    say(38,'VIP+','CreeperSlayer','o/ welcome back'),
    say(412,'MVP+','NetherNinja','who is this guy again?'),
    me(cfg.ABOUT_LINE),
    say(1342,'MVP','SweatyBedHop','what do you build?'),
    me('I build ' + cfg.PROJECTS),
    say(205,'VIP','LapisLarry','and what do you code in?'),
    me('I code in ' + cfg.LANGS),
    [...chat(LV,'MVP++',U,'').slice(0,-1), ['type ','white'], ['/stats','yellow'], [' to view my stats ','white'], ['▼','aqua']],
    [['[Kolify] ','aqua'], ['Stats overlay ready. Scroll down!','gray']]
  ];
  const H = 46 + lines.length*26 + 18;
  const tw = typewriter(lines, {x:28, y0:46, step:26, size:15, id:'i'});
  out('intro.svg', shell(W, H, tw.defs, panel(W,H) + tw.body));
}

// ---------- header.svg : name + bobbing grass block ----------
{
  const H = 190, G = ['#2f7d1f','#3f9e2f','#4cb83a','#55c444'], D = ['#6b4423','#7a4e2a','#5a3a1d','#8a5a30'];
  const hash = (x,y) => ((x*73856093) ^ (y*19349663)) >>> 0;
  let block = '';
  for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) {
    const h = hash(x,y) % 4, grass = y < 3 || (y === 3 && h < 2) || (y === 4 && h === 0);
    block += `<rect x="${x*6}" y="${y*6}" width="6" height="6" fill="${(grass?G:D)[h]}"/>`;
  }
  let stars = '';
  for (let i = 0; i < 26; i++) {
    const x = 20 + hash(i,7)%780, y = 16 + hash(i,3)%150, d = (1.5 + (hash(i,5)%30)/10).toFixed(1);
    stars += `<rect x="${x}" y="${y}" width="2" height="2" fill="#fff" opacity=".15"><animate attributeName="opacity" values=".1;.8;.1" dur="${d}s" begin="${(i%7)*0.3}s" repeatCount="indefinite"/></rect>`;
  }
  let parts = '';
  for (let i = 0; i < 6; i++) parts += `<rect x="${78+i*11}" y="125" width="3" height="3" fill="${i%2?C.green:C.aqua}" opacity="0"><animate attributeName="opacity" values="0;.9;0" dur="2.6s" begin="${(i*.45).toFixed(2)}s" repeatCount="indefinite"/><animateTransform attributeName="transform" type="translate" values="0 0;${i%2?4:-4} -50" dur="2.6s" begin="${(i*.45).toFixed(2)}s" repeatCount="indefinite"/></rect>`;
  const body = panel(W,H) + stars +
    `<ellipse cx="106" cy="148" rx="30" ry="5" fill="#000" opacity=".6"><animate attributeName="rx" values="30;24;30" dur="2.2s" repeatCount="indefinite"/></ellipse>` +
    `<g transform="translate(70 62)"><animateTransform attributeName="transform" type="translate" values="70 62;70 54;70 62" dur="2.2s" repeatCount="indefinite"/>${block}</g>` + parts +
    txt(190, 98, [['Non-','white'],['Aarush','green']], {size:44}) +
    txt(192, 132, [...star(LV), [' ','white'], ...rank('MVP++'), [' '+cfg.TAGLINE,'gray']], {size:15}) +
    txt(192, 158, [['Hypixel Bed Wars Lobby | Minecraft 1.8.9','dgray']], {size:12});
  out('header.svg', shell(W, H, '', body));
}

// ---------- stack.svg : blocky tech badges ----------
{
  const size = 13, cw = size*.6, h = 32; let x = 28, y = 22, body = '', i = 0;
  for (const [name, c] of cfg.TECH) {
    const w = Math.ceil(name.length*cw + 44);
    if (x + w > W-24) { x = 28; y += h+12; }
    body += `<g opacity="0"><animate attributeName="opacity" values="0;1" dur="0.01s" begin="${(i*0.12).toFixed(2)}s" fill="freeze"/>` +
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#0d0d0d" stroke="${C[c]||c}" stroke-width="2"/>` +
      `<rect x="${x+2}" y="${y+2}" width="${h-4}" height="${h-4}" fill="${C[c]||c}" opacity=".9"/>` +
      `<rect x="${x+5}" y="${y+5}" width="6" height="6" fill="#fff" opacity=".45"/>` +
      txt(x+h+6, y+h/2+5, [[name,'white']], {size}) + '</g>';
    x += w + 10; i++;
  }
  const H = y + h + 22;
  out('stack.svg', shell(W, H, '', panel(W,H) + body));
}

// ---------- play.svg : banner image for the snake game link ----------
{
  const w = 380, h = 92;
  const body = `<rect x="8" y="8" width="${w-16}" height="${h-16}" fill="none" stroke="#55FF55" stroke-width="6" opacity=".35" filter="url(#glow)"><animate attributeName="opacity" values=".15;.55;.15" dur="1.8s" repeatCount="indefinite"/></rect>` +
    `<rect x="8" y="8" width="${w-16}" height="${h-16}" fill="#0a0a0a" stroke="#55FF55" stroke-width="2"/>` +
    `<rect x="12" y="12" width="${w-24}" height="4" fill="#fff" opacity=".12"/><rect x="12" y="${h-16}" width="${w-24}" height="4" fill="#000" opacity=".5"/>` +
    txt(w/2, 48, [['▶ ','yellow'],['PLAY SNAKE','green']], {size:26, anchor:'middle'}) +
    txt(w/2, 72, [['Minecraft edition | arrows / WASD','gray']], {size:11, anchor:'middle'});
  out('play.svg', shell(w, h, '', body));
}

// ---------- footer.svg : Bed Wars kill feed ----------
{
  const lines = [
    [['BED DESTRUCTION > ','white'], ['Boredom Bed','red'], [' was destroyed by ','gray'], [U,'gold'], ['!','gray']],
    [['Boredom','gray'], [' was killed by ','gray'], ['[MVP++] '+U,'gold'], ['. ','gray'], ['FINAL KILL!','aqua']],
    [['Thanks for visiting! ','green'], ['Click a link below to ','gray'], ['/msg','yellow'], [' me.','gray']]
  ];
  const H = 40 + lines.length*26;
  const tw = typewriter(lines, {x:28, y0:44, step:26, size:15, id:'f', hold:6});
  out('footer.svg', shell(W, H, tw.defs, panel(W,H) + tw.body));
}
