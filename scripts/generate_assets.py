#!/usr/bin/env python3
"""Generates the profile SVGs: dist/lobby.svg (stats table) and dist/chat.svg (typed chat line).
Usage: GITHUB_USER=Non-Aarush GITHUB_TOKEN=... python scripts/generate_assets.py [outdir]
Stdlib only. Token is optional but avoids rate limits."""
import json, os, sys, urllib.request
from datetime import datetime, timezone
from xml.sax.saxutils import escape

USER = os.environ.get("GITHUB_USER", "Non-Aarush")
OUT = sys.argv[1] if len(sys.argv) > 1 else "dist"
MOCK = os.environ.get("MOCK") == "1"
FONT = "'Press Start 2P','Minecraftia','Consolas','DejaVu Sans Mono',monospace"
GOLD, AQUA, GREEN, WHITE, GRAY, RED = "#FFAA00", "#55FFFF", "#55FF55", "#EDEDED", "#6B6B6B", "#DC143C"

def api(path):
    req = urllib.request.Request("https://api.github.com" + path, headers={"User-Agent": "profile-assets"})
    tok = os.environ.get("GITHUB_TOKEN")
    if tok:
        req.add_header("Authorization", "Bearer " + tok)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)

def ago(iso):
    d = (datetime.now(timezone.utc) - datetime.fromisoformat(iso.replace("Z", "+00:00"))).days
    return "today" if d < 1 else f"{d}d" if d < 60 else f"{d // 30}mo" if d < 365 else f"{d // 365}y"

def short(n):
    return f"{n/1000:.1f}k".replace(".0k", "k") if n >= 1000 else str(n)

def load():
    if MOCK:
        now = datetime.now(timezone.utc).isoformat()
        repos = [dict(name=f"project-{i}", language=l, stargazers_count=s, forks_count=f, size=sz,
                      open_issues_count=i % 3, pushed_at=now, created_at=now, fork=False)
                 for i, (l, s, f, sz) in enumerate([("Python", 12, 3, 5400), ("TypeScript", 7, 1, 2300), ("C++", 4, 0, 900),
                                                    ("Go", 2, 0, 300), ("Python", 1, 0, 120), ("JavaScript", 0, 0, 80)])]
        return dict(public_repos=6, followers=14), repos
    u = api(f"/users/{USER}")
    repos = api(f"/users/{USER}/repos?per_page=100&type=owner&sort=pushed")
    return u, [r for r in repos if not r["fork"]]

def build_lobby(u, repos):
    rows = sorted(repos, key=lambda r: (r["stargazers_count"], r["pushed_at"]), reverse=True)[:8]
    stars = sum(r["stargazers_count"] for r in repos)
    forks = sum(r["forks_count"] for r in repos)
    langs = {}
    for r in repos:
        if r["language"]:
            langs[r["language"]] = langs.get(r["language"], 0) + 1
    top_lang = max(langs, key=langs.get) if langs else "n/a"
    W, RH, TOP, HDR = 820, 32, 46, 30
    H = TOP + HDR + max(len(rows), 1) * RH + 30 + 4 * 24 + 22
    cols = dict(lang=345, star=500, fork=565, size=640, iss=705, upd=790)
    o = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" font-family="{FONT}">',
         '<style>.m{font-family:"DejaVu Sans Mono",Consolas,monospace;font-weight:700}.lb{fill:#6B6B6B;font-size:10px;letter-spacing:1.2px}</style>',
         f'<rect x="0.5" y="0.5" width="{W-1}" height="{H-1}" rx="10" fill="#000" stroke="#151515"/>',
         f'<rect x="10" y="10" width="{W-20}" height="{TOP-12}" rx="6" fill="#0A0A0A"/>',
         f'<circle cx="26" cy="{TOP/2+4}" r="4" fill="{GREEN}"/>',
         f'<text x="38" y="{TOP/2+9}" class="m" font-size="14" fill="{WHITE}">{escape(USER)}</text>',
         f'<rect x="150" y="{TOP/2-8}" width="84" height="24" rx="5" fill="#151515"/>',
         f'<text x="162" y="{TOP/2+8}" class="m" font-size="12" fill="{WHITE}">GitHub</text>',
         f'<text x="{W-20}" y="{TOP/2+8}" text-anchor="end" class="m" font-size="11" fill="{GRAY}">{u["public_repos"]} repos</text>']
    y = TOP + 20
    o.append(f'<line x1="10" x2="{W-10}" y1="{TOP+HDR-4}" y2="{TOP+HDR-4}" stroke="#151515"/>')
    o.append(f'<text x="20" y="{y}" class="lb m">TAGS</text><text x="95" y="{y}" class="lb m">REPO</text>'
             f'<text x="{cols["lang"]}" y="{y}" class="lb m">LANG</text>')
    for k, t in (("star", "STAR"), ("fork", "FORKS"), ("size", "SIZE"), ("iss", "ISSUES"), ("upd", "PUSHED")):
        o.append(f'<text x="{cols[k]}" y="{y}" text-anchor="end" class="lb m" {"fill=\"#DC143C\"" if k=="star" else ""}>{t}</text>')
    ranks = [("[MVP++]", GOLD), ("[MVP+]", AQUA), ("[MVP+]", AQUA), ("[MVP]", AQUA), ("[MVP]", AQUA), ("[VIP+]", GREEN), ("[VIP+]", GREEN), ("[VIP]", GREEN)]
    now = datetime.now(timezone.utc)
    for i, r in enumerate(rows):
        ry = TOP + HDR + i * RH
        ty = ry + 21
        d = i * 0.18
        o.append(f'<g opacity="0"><animate attributeName="opacity" from="0" to="1" begin="{d:.2f}s" dur="0.3s" fill="freeze"/>')
        if i % 2 == 0:
            o.append(f'<rect x="10" y="{ry}" width="{W-20}" height="{RH}" fill="#0A0A0A"/>')
        pushed = (now - datetime.fromisoformat(r["pushed_at"].replace("Z", "+00:00"))).days
        created = (now - datetime.fromisoformat(r["created_at"].replace("Z", "+00:00"))).days
        tag = ("HOT", "#B00000") if pushed <= 14 else ("NEW", "#E040C8") if created <= 90 else None
        if tag:
            o.append(f'<rect x="18" y="{ry+7}" width="38" height="18" rx="3" fill="{tag[1]}"/>'
                     f'<text x="37" y="{ry+20}" text-anchor="middle" class="m" font-size="10" fill="#fff">{tag[0]}</text>')
        label, col = ranks[min(i, len(ranks) - 1)]
        name = escape(r["name"][:22])
        o.append(f'<text x="95" y="{ty}" class="m" font-size="13" fill="{col}">{label} {name}</text>')
        o.append(f'<text x="{cols["lang"]}" y="{ty}" class="m" font-size="12" fill="{GREEN if r["language"] else GRAY}">{escape(r["language"] or "-")}</text>')
        vals = [("star", short(r["stargazers_count"]), GOLD if r["stargazers_count"] else GRAY),
                ("fork", short(r["forks_count"]), "#E040C8" if r["forks_count"] else GRAY),
                ("size", (f'{r["size"]/1000:.1f}MB' if r["size"] >= 1000 else f'{r["size"]}kB'), WHITE), ("iss", str(r["open_issues_count"]), WHITE),
                ("upd", ago(r["pushed_at"]), AQUA)]
        for k, v, c in vals:
            o.append(f'<text x="{cols[k]}" y="{ty}" text-anchor="end" class="m" font-size="12" fill="{c}">{v}</text>')
        o.append('</g>')
    fy = TOP + HDR + max(len(rows), 1) * RH
    o.append(f'<line x1="10" x2="{W-10}" y1="{fy}" y2="{fy}" stroke="#151515"/>')
    o.append(f'<text x="20" y="{fy+19}" class="m" font-size="11" fill="{GRAY}">github.com/{escape(USER)}  |  {len(repos)} repos  |  {stars} stars</text>')
    log = [(GREEN, f"[GitHub] {escape(USER)} joined the lobby."),
           (WHITE, f"[GitHub] Total stars: {stars}  forks: {forks}  followers: {u['followers']}."),
           (AQUA, f"[GitHub] Main language: {escape(top_lang)}."),
           (GRAY, "[GitHub] Stats refresh every 12 hours.")]
    base = fy + 30 + 18
    for i, (c, t) in enumerate(log):
        o.append(f'<text x="20" y="{base+i*24}" class="m" font-size="12" fill="{c}" opacity="0">{t}'
                 f'<animate attributeName="opacity" from="0" to="1" begin="{1.8+i*0.5:.1f}s" dur="0.2s" fill="freeze"/></text>')
    o.append('</svg>')
    return "\n".join(o)

def build_chat(prefix="[MVP++] ", name=None, msg="i build random things"):
    name = name or USER
    gold_part, white_part = f"{prefix}{name}", f": {msg}"
    full = gold_part + white_part
    n, cw, fs = len(full), 13, 20
    W, H = n * cw + 40, 46
    x0, y = 20, 31
    step = 0.11
    type_t = n * step
    hold = 2.4
    total = type_t + hold
    vals = ";".join(str(i * cw) for i in range(n + 1)) + f";{n*cw}"
    kt = ";".join(f"{(i*step)/total:.4f}" for i in range(n + 1)) + ";1"
    def txt(dx, fill):
        return (f'<text x="{x0+dx}" y="{y+dy}" font-size="{fs}" font-weight="700" textLength="{n*cw}" lengthAdjust="spacing" '
                f'xml:space="preserve" fill="{fill}">')
    def layer(dx, dy, gold, white):
        s = (f'<text x="{x0+dx}" y="{y+dy}" font-size="{fs}" font-weight="700" textLength="{n*cw}" lengthAdjust="spacing" xml:space="preserve">'
             f'<tspan fill="{gold}">{escape(gold_part)}</tspan><tspan fill="{white}">{escape(white_part)}</tspan></text>')
        return s
    clip_anim = (f'<animate attributeName="width" values="{vals}" keyTimes="{kt}" dur="{total:.2f}s" calcMode="discrete" repeatCount="indefinite"/>')
    cur_anim = (f'<animate attributeName="x" values="{vals.replace(";", ";")}" keyTimes="{kt}" dur="{total:.2f}s" calcMode="discrete" repeatCount="indefinite"/>')
    cur_vals = ";".join(str(x0 + i * cw) for i in range(n + 1)) + f";{x0+n*cw}"
    cur_anim = f'<animate attributeName="x" values="{cur_vals}" keyTimes="{kt}" dur="{total:.2f}s" calcMode="discrete" repeatCount="indefinite"/>'
    blink = '<animate attributeName="opacity" values="1;0;1" dur="0.8s" repeatCount="indefinite"/>'
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" font-family="{FONT}">
<defs><clipPath id="c"><rect x="{x0-2}" y="0" width="0" height="{H}">{clip_anim}</rect></clipPath></defs>
<g clip-path="url(#c)">
{layer(2.5, 2.5, "#553700", "#3F3F3F")}
{layer(0, 0, GOLD, WHITE)}
</g>
<rect y="{y-fs+2}" width="{cw-2}" height="3" fill="{WHITE}" x="{x0}" transform="translate(0 {fs-3})">{cur_anim}{blink}</rect>
</svg>'''

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    u, repos = load()
    open(os.path.join(OUT, "lobby.svg"), "w", encoding="utf-8").write(build_lobby(u, repos))
    open(os.path.join(OUT, "chat.svg"), "w", encoding="utf-8").write(build_chat())
    print("wrote", OUT)
