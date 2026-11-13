# 裝置支援檢查的拼圖：把 device-fit.js 拍的 <裝置>-<頁面>.png 依頁面拼成一張（每格標裝置名與尺寸），給評審一眼看完各尺寸
# 用法：python xiangqi-lab/tools/qa/device-montage.py [devices 資料夾]（預設 xiangqi-db/tools/review_loop/rounds/r15/devices）
#   產出 <資料夾>/montage-<頁面>.png；格子高度固定 360 點，寬度照原比例縮
import json, os, sys
from PIL import Image, ImageDraw, ImageFont

HOME = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
D = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HOME, "xiangqi-db", "tools", "review_loop", "rounds", "r15", "devices")
R = json.load(open(os.path.join(D, "device-fit.json"), encoding="utf-8"))
FONT = ImageFont.truetype("C:/Windows/Fonts/msjh.ttc", 15)
CH, PADX, LAB, MAXW = 360, 10, 40, 2400

def page_sheet(p):
    cells = []
    for dv in R["devices"]:
        x = R["res"].get(dv["id"], {}).get(p["id"])
        if not x: continue
        im = Image.open(os.path.join(D, "shots", x["file"])).convert("RGB")
        im = im.resize((max(1, round(im.width * CH / im.height)), CH))
        n = len(x["fit"]) + len(x["lay"])
        cells.append((im, f'{dv["name"]} {dv["w"]}×{dv["h"]}', n))
    if not cells: return None
    rows, cur, w = [], [], 0
    for c in cells:
        if cur and w + c[0].width + PADX > MAXW: rows.append(cur); cur, w = [], 0
        cur.append(c); w += c[0].width + PADX
    if cur: rows.append(cur)
    W = max(sum(c[0].width + PADX for c in r) for r in rows) + PADX
    H = 50 + len(rows) * (CH + LAB + PADX)
    out = Image.new("RGB", (W, H), (245, 240, 230)); g = ImageDraw.Draw(out)
    g.text((PADX, 12), f'{p["name"]}（{R["build"]}・無頭 Chrome 模擬，不是實機；紅字＝有問題）', fill=(60, 40, 20), font=ImageFont.truetype("C:/Windows/Fonts/msjh.ttc", 20))
    y = 50
    for r in rows:
        x = PADX
        for im, lab, n in r:
            out.paste(im, (x, y)); g.rectangle([x - 1, y - 1, x + im.width, y + im.height], outline=(180, 160, 130))
            g.text((x, y + CH + 4), lab + (f"  ⚠{n}" if n else "  ✓"), fill=(170, 20, 20) if n else (40, 90, 40), font=FONT)
            x += im.width + PADX
        y += CH + LAB + PADX
    f = os.path.join(D, f'montage-{p["id"]}.png'); out.save(f, optimize=True); return f

for p in R["pages"]:
    f = page_sheet(p)
    if f: print("拼好", f)
