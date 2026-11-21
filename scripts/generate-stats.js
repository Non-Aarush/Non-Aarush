#!/usr/bin/env node
'use strict';
/*
 * Builds assets/stats.svg (Larpify-style overlay) from real GitHub data.
 *   node scripts/generate-stats.js          (needs GH_TOKEN, GH_USER)
 *   node scripts/generate-stats.js --demo   (sample data, no network)
 *
 * COLUMN MAPPING (each ROW = one of your repos, top 8 by FKDR):
 *   TAGS   chip: BL=archived, SNI=has open issues, AC=pushed in last 7 days, K=10+ stars (first match wins)
 *   PLAYER [rank] repo-name + primary language in red. Rank by stars: 50+ MVP++, 10+ MVP+, 3+ MVP, 1+ VIP+, else VIP
 *   STAR   stargazers as a Bed Wars prestige star, e.g. [12✫]
 *   FKDR   commits / PRs            (ratio, sorted high to low; arrow = sort column)
 *   WLR    merged PRs / closed (unmerged) PRs
 *   W      total commits on default branch
 *   BBLR   closed issues / open issues
 *   FK     repo size in KB
 *   WS     forks
 *   INDEX  stars*10 + commits*0.5 + forks*5 + merged PRs*3
 * Colours: gray = low, green = good, yellow/orange = better, red/pink = elite.
 */
const fs = require('fs'), path = require('path');
const L = require('./lib/mc'); const { txt, star, rank, rankColor, typewriter, panel, shell } = L;
const USER = process.env.GH_USER || 'Non-Aarush', TOKEN = process.env.GH_TOKEN;
const DEMO = process.argv.includes('--demo') || !TOKEN;

const QUERY = `query($login:String!){user(login:$login){
 contributionsCollection{totalCommitContributions totalPullRequestContributions totalPullRequestReviewContributions}
 repositories(first:100,ownerAffiliations:OWNER,isFork:false,privacy:PUBLIC,orderBy:{field:PUSHED_AT,direction:DESC}){totalCount nodes{
  name stargazerCount forkCount isArchived pushedAt diskUsage primaryLanguage{name}
  defaultBranchRef{target{... on Commit{history{totalCount}}}}
  prs:pullRequests{totalCount} merged:pullRequests(states:MERGED){totalCount} closedPr:pullRequests(states:CLOSED){totalCount}
  closedIssues:issues(states:CLOSED){totalCount} openIssues:issues(states:OPEN){totalCount}}}}}`;

async function load() {
  if (DEMO) {
    const d = (n,s,f,a,p,m,c,ci,oi,kb,lang,days) => ({name:n,stargazerCount:s,forkCount:f,isArchived:a,diskUsage:kb,primaryLanguage:{name:lang},
      pushedAt:new Date(Date.now()-days*864e5).toISOString(),defaultBranchRef:{target:{history:{totalCount:c}}},
      prs:{totalCount:p},merged:{totalCount:m},closedPr:{totalCount:Math.max(0,p-m)},closedIssues:{totalCount:ci},openIssues:{totalCount:oi}});
    return {contributionsCollection:{totalCommitContributions:842,totalPullRequestContributions:37,totalPullRequestReviewContributions:12},
      repositories:{totalCount:14,nodes:[
        d('bedwars-overlay',58,9,false,6,5,420,12,1,820,'Java',1), d('discord-bot',14,3,false,4,3,260,9,2,340,'Python',3),
        d('mc-plugin-kit',6,1,false,3,2,180,4,0,210,'Java',12), d('portfolio-site',3,0,false,2,2,95,1,0,1200,'JavaScript',20),
        d('web-tools',2,0,false,1,1,64,0,0,60,'JavaScript',2), d('dotfiles',1,0,false,0,0,48,0,0,20,'Shell',40),
        d('old-experiments',0,0,true,0,0,31,0,3,90,'Python',300), d('cli-tools',0,0,false,0,0,22,2,1,35,'Go',9)]}};
  }
  const r = await fetch('https://api.github.com/graphql', {method:'POST',
    headers:{Authorization:`bearer ${TOKEN}`,'Content-Type':'application/json','User-Agent':'stats-svg'},
    body:JSON.stringify({query:QUERY,variables:{login:USER}})});
  const j = await r.json();
  if (!j.data || !j.data.user) throw new Error('GitHub API error: ' + JSON.stringify(j).slice(0,400));
  return j.data.user;
}

const k1 = n => n >= 1e6 ? (n/1e6).toFixed(1)+'M' : n >= 1e4 ? (n/1e3).toFixed(1)+'k' : String(Math.round(n));
const r2 = n => n.toFixed(2);
const LADDER = ['gray','green','yellow','gold','red','pink'];
const tone = (v, th) => LADDER[th.filter(t => v >= t).length];
const COLS = [
  {k:'fkdr', x:468, h:'FKDR', fmt:r2, th:[2,5,12,30,70]},  {k:'wlr', x:530, h:'WLR', fmt:r2, th:[.3,.6,1,2,4]},
  {k:'w',    x:592, h:'W',    fmt:k1, th:[10,50,200,1000,5000]}, {k:'bblr', x:654, h:'BBLR', fmt:r2, th:[.5,1,2,5,10]},
  {k:'fk',   x:716, h:'FK',   fmt:k1, th:[50,500,5000,2e4,1e5]}, {k:'ws', x:752, h:'WS', fmt:k1, th:[1,2,5,15,40]},
  {k:'index',x:790, h:'INDEX',fmt:k1, th:[20,100,300,800,2000]}];
const CHIP = {BL:'#aa0000', SNI:'#dd3322', AC:'#d63ad6', K:'#4b7bec'};

(async () => {
  const u = await load();
  let repos = u.repositories.nodes.map(r => {
    const commits = (r.defaultBranchRef && r.defaultBranchRef.target && r.defaultBranchRef.target.history.totalCount) || 0;
    const m = {name:r.name, lang:(r.primaryLanguage||{}).name||'', stars:r.stargazerCount, commits,
      fkdr:commits/Math.max(1,r.prs.totalCount), wlr:r.merged.totalCount/Math.max(1,r.closedPr.totalCount),
      w:commits, bblr:r.closedIssues.totalCount/Math.max(1,r.openIssues.totalCount), fk:r.diskUsage, ws:r.forkCount,
      index:Math.round(r.stargazerCount*10 + commits*.5 + r.forkCount*5 + r.merged.totalCount*3)};
    const days = (Date.now()-new Date(r.pushedAt))/864e5;
    m.tag = r.isArchived ? 'BL' : r.openIssues.totalCount > 0 ? 'SNI' : days <= 7 ? 'AC' : r.stargazerCount >= 10 ? 'K' : '';
    m.rank = m.stars >= 50 ? 'MVP++' : m.stars >= 10 ? 'MVP+' : m.stars >= 3 ? 'MVP' : m.stars >= 1 ? 'VIP+' : 'VIP';
    return m;
  }).filter(r => r.commits > 0).sort((a,b) => b.fkdr - a.fkdr);
  const all = repos; repos = repos.slice(0,8);

  const totStars = all.reduce((n,r) => n + r.stars, 0), cc = u.contributionsCollection;
  const langs = {}; all.forEach(r => r.lang && (langs[r.lang] = (langs[r.lang]||0)+1));
  const [topLang, topN] = Object.entries(langs).sort((a,b) => b[1]-a[1])[0] || ['Code',0];
  const nm = i => (repos[i] ? repos[i].name : '-');

  // ---- ticker (typed below the overlay) ----
  const K = ['[Larpify] ','aqua'];
  const ticker = [
    [[`Sending you to github.com/${USER}!`,'green']],
    [K, ['Loaded ','gray'], [String(u.repositories.totalCount),'yellow'], [' repos, ','gray'], [String(totStars),'yellow'], [' stars, ','gray'], [String(cc.totalCommitContributions),'yellow'], [' commits this year.','gray']],
    [K, ['Party: ','gray'], [nm(0),'yellow'], [' and ','gray'], [nm(1),'yellow'], [' queued together.','gray']],
    [K, [USER,'green'], [' flagged ','white'], [topLang,'red'], [` x${topN}`,'gray'], [' [WDR]','white']],
    [K, ['Sniper warning: ','red'], [USER,'yellow'], [` opened ${cc.totalPullRequestContributions} PRs, ${cc.totalPullRequestReviewContributions} reviews.`,'gray']]
  ];
  const W = 820, H = 500, ROW0 = 92, RH = 30;
  const tw = typewriter(ticker, {x:28, y0:392, step:22, size:13, id:'k', t0:3.4, hold:7});
  const T = tw.T, kf = v => (v/T).toFixed(4);

  // ---- count-up cell: 6 frames, each visible for a short slice ----
  const F = 6; let t0 = 0;
  const cell = (x, y, make, v, anchor, size = 13) => {
    let s = '';
    for (let j = 1; j <= F; j++) {
      const a = t0 + (j-1)*.07, last = j === F, val = last ? v : v*j/F;
      const vis = last ? `values="0;1" keyTimes="0;${kf(a)}"` : `values="0;1;0" keyTimes="0;${kf(a)};${kf(a+.07)}"`;
      s += `<g opacity="0"><animate attributeName="opacity" ${vis} calcMode="discrete" dur="${T.toFixed(2)}s" repeatCount="indefinite"/>${txt(x, y, make(val), {size, anchor})}</g>`;
    }
    return s;
  };

  let rows = '';
  repos.forEach((r, i) => {
    const top = ROW0 + i*RH, y = top + 20, rs = 0.5 + i*.22; t0 = rs + .15;
    let g = `<rect x="23" y="${top}" width="774" height="${RH}" fill="${r.tag==='BL' ? '#2a1010' : i%2 ? '#0d0d0d' : '#131313'}"/>`;
    if (r.tag) {
      const w = r.tag.length*5.4 + 10;
      g += `<rect x="30" y="${top+8}" width="${w.toFixed(1)}" height="14" rx="2" fill="${CHIP[r.tag]}"/>` + txt(35, top+19, [[r.tag,'white']], {size:9});
    }
    const nameSegs = [...rank(r.rank), [' ' + r.name.slice(0,16), rankColor(r.rank)]];
    g += txt(80, y, nameSegs, {size:13});
    if (r.lang) g += txt(80 + L.len(nameSegs)*7.8 + 8, y, [[r.lang.slice(0,9),'red']], {size:10});
    g += cell(400, y, v => star(Math.round(v)), r.stars, 'end');
    COLS.forEach(c => { g += cell(c.x, y, v => [[c.fmt(v), tone(v, c.th)]], r[c.k], 'end'); });
    rows += `<g opacity="0"><animate attributeName="opacity" values="0;0;1;1" keyTimes="0;${kf(rs)};${kf(rs+.35)};1" dur="${T.toFixed(2)}s" repeatCount="indefinite"/>` +
      `<animateTransform attributeName="transform" type="translate" values="-14 0;-14 0;0 0;0 0" keyTimes="0;${kf(rs)};${kf(rs+.35)};1" dur="${T.toFixed(2)}s" repeatCount="indefinite"/>${g}</g>`;
  });

  const hdr = '#666';
  let head = `<rect x="22" y="22" width="776" height="340" rx="8" fill="#0b0b0b" stroke="#262626"/>` +
    `<circle cx="40" cy="41" r="4" fill="#55FF55"><animate attributeName="opacity" values="1;.3;1" dur="1.6s" repeatCount="indefinite"/></circle>` +
    txt(54, 46, [['Larpify','white']], {size:15}) + txt(130, 46, [['|','dgray'],[' Bed Wars','gray']], {size:13}) +
    txt(790, 45, [[`github.com/${USER}`,'dgray']], {size:11, anchor:'end'}) +
    `<line x1="23" y1="58" x2="797" y2="58" stroke="#262626"/>` +
    txt(30, 82, [['TAGS',hdr]], {size:10}) + txt(80, 82, [['PLAYER',hdr]], {size:10}) + txt(400, 82, [['STAR',hdr]], {size:10, anchor:'end'});
  COLS.forEach(c => { head += txt(c.x, 82, c.k === 'fkdr' ? [['FKDR ▾','gold']] : [[c.h,hdr]], {size:10, anchor:'end'}); });
  head += `<line x1="23" y1="91" x2="797" y2="91" stroke="#262626"/>` +
    `<line x1="23" y1="${ROW0 + 8*RH}" x2="797" y2="${ROW0 + 8*RH}" stroke="#262626"/>` +
    txt(34, ROW0 + 8*RH + 20, [[`Larp Client  |  1.8/logs/latest.log  |  ${repos.length} players`,'#777777']], {size:11});

  const body = panel(W,H) + head + rows + tw.body;
  fs.writeFileSync(path.join(L.ROOT,'assets','stats.svg'), shell(W, H, tw.defs, body));
  console.log(`wrote assets/stats.svg (${DEMO ? 'demo data' : 'live data for ' + USER}, ${repos.length} rows)`);
})().catch(e => { console.error(e); process.exit(1); });
