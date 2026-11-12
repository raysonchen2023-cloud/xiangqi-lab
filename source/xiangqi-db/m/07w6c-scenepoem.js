/* ================= 🌙 場景物件・當代詩詞（開發者需求 hspx 第 1034 列）=================
   「場景圖裡沒有說明的物件（例如月亮），讓玩家點選後出現『當代詩人』的作品；每次按都換一位詩人對月亮的詩詞。」
   跟 07w6 的 sci 說明卡不同：sci 跳的是物件白話說明，這裡跳的是「詩詞卡」（詩題、詩人（朝代）、全文、出處，『再一首』換下一首）。
   做法：在滿版圖的座標框（.shp-page.cq）上，依登記的熱區（POEM_REG）疊一顆透明按鈕（真的 <button>，不是圖上判點），
     所以：螢幕報讀模式可聚焦、可朗讀（有 aria-label）；07w 走路與 07w6 的 sci 都不受影響（它們只認圖本身的點選，排除按鈕）。
   朝代＝看圖網址：home_<朝>_<季>_night＝該朝；無朝代前綴（home_<季>_night）＝宋（原圖）；home_classic_*_night＝經典世界（跨朝代 classic 池）。
     唐場景的月亮出唐詩、宋出宋人，先秦／戰國用《詩經》《楚辭》……照「當代」挑。白天無月，只認 _night。
   詩詞逐字查證於維基文庫，資料在 data/poems/poems.json（原始檔 xiangqi-db/art/poems/poems.json，build-site 會複製到 site/data）。
   不在畫面加任何常駐小字（開發者規定：場景入口不加小字）；月亮能不能點，靠玩家自己發現（跟 sci 物件一樣沒有常駐標示）。
   開關 SCENE_POEM_ON；座標一律原圖 768×1376 像素。 */
const SCENE_POEM_ON = true;
const SPM_ERAS = ["qin","han","sanguo","weijin","nanbei","sui","tang","wudai","song","yuan","ming","qing"];
/* 詩詞資料（lazy 載入一次） */
let SPM_P = null;
const spmData = () => SPM_P || (SPM_P = fetch("data/poems/poems.json").then(r => r.ok ? r.json() : null).catch(() => { SPM_P = null; return null; }));
/* 看圖網址判朝代：回傳 classic / 某朝 / "song"（原圖）；不是首頁夜景就回 null */
function spmEra(src) {
  src = String(src || "");
  if (!/\/homemap\/home[\w]*_night\.webp/.test(src)) return null;
  const m = src.match(/\/homemap\/home(?:_(classic|qin|han|sanguo|weijin|nanbei|sui|tang|wudai|song|yuan|ming|qing))?(?:_(?:spring|summer|autumn|winter))?(?:_(?:dawn|dusk))?_night\.webp/);
  if (!m) return null;
  return m[1] || "song";
}
/* 登記：哪張圖、哪個物件、熱區形狀（圓 [x,y,r] 或多邊形）。座標原圖 768×1376 像素 */
const POEM_REG = [
  { re: /\/homemap\/home[\w]*_night\.webp/, img: ".shp-page.cq>img", items: [
    { obj: "moon", shape: [208, 66, 62] }
  ] }
];
/* 這個物件在這一朝有沒有詩（池長度 ≥ 1 才登記按鈕；資料保證每池 ≥ 3 首） */
function spmPool(J, obj, era) {
  const P = J && J.poems && J.poems[obj];
  return (P && P[era]) || null;
}
/* aria-label：月亮：聽一首唐詩 */
function spmLabel(J, obj, era) {
  const o = (J.objects || {})[obj] || {}, el = (J.eraLabel || {})[era] || "";
  const tpl = o.labelTpl || "{name}：聽一首{eraLabel}詩";
  return tpl.replace("{name}", o.name || obj).replace("{eraLabel}", el);
}
/* 輪播：每開一次換下一首，一輪（池長度）內不重複同一首；起點記在 store，重訪會換 */
function spmNext(obj, era, n) {
  if (n <= 0) return 0;
  const key = obj + "|" + era, G = store.get("spmIdx", {}) || {};
  const cur = (typeof G[key] === "number" && G[key] >= 0) ? G[key] : (Math.random() * n | 0);
  G[key] = (cur + 1) % n;
  store.set("spmIdx", G);
  return cur % n;
}
/* 詩詞卡：詩題、詩人（朝代）、全文、出處；『再一首』原地換下一首（不另開卡、不多推一筆歷史） */
function spmRender(body, J, obj, era) {
  const pool = spmPool(J, obj, era);
  if (!pool || !pool.length) { body.textContent = "（這一朝暫時還沒有收詩）"; return; }
  const i = spmNext(obj, era, pool.length), p = pool[i];
  const nm = (J.objects[obj] || {}).name || obj;
  if (typeof vibrate === "function") try { vibrate(5); } catch (e) {}
  const tail = p.excerpt ? "（節錄）" : "";
  body.innerHTML =
    '<div class="muted" style="margin:-4px 0 10px">' + esc(nm) + '・' + esc((J.eraLabel || {})[era] || "") + '當代詩詞</div>' +
    '<p style="font:700 17px/1.4 var(--serif,serif);margin:0 0 4px">' + esc(p.title) + '</p>' +
    '<p class="muted" style="margin:0 0 10px;font-size:13px">' + esc(p.poet) + '（' + esc(p.dynasty) + '）' + esc(tail) + '</p>' +
    '<p style="line-height:2;margin:0 0 12px;font-size:17px">' + esc(p.text) + '</p>' +
    '<p class="muted" style="margin:0 0 14px;font-size:13px">出處：' + esc(p.source) +
      ' ・ <a href="' + esc(p.ref) + '" target="_blank" rel="noopener">查證原文</a></p>';
  const b = document.createElement("button");
  b.type = "button"; b.className = "btn"; b.textContent = "🔁 再一首";
  b.setAttribute("aria-label", "再換一首" + ((J.eraLabel || {})[era] || "") + "詠" + esc(nm) + "的詩");
  b.onclick = e => { e.stopPropagation(); spmRender(body, J, obj, era); };
  body.append(b);
}
function spmShow(obj, era) {
  spmData().then(J => {
    if (!J || !spmPool(J, obj, era)) return;
    const nm = (J.objects[obj] || {}).name || obj;
    sheet("🌙 " + nm, body => spmRender(body, J, obj, era));
  });
}
/* 在座標框上疊透明按鈕；一個框一個物件一顆。朝代變了（換停靠、換季）就更新 label 或移除（該朝沒詩時） */
function spmMount(P, I) {
  if (!SCENE_POEM_ON || !P || !I) return;
  const era = spmEra(I.getAttribute("src") || I.src || "");
  spmData().then(J => {
    if (!J) return;
    for (const R of POEM_REG) {
      if (!R.re.test(I.getAttribute("src") || I.src || "")) continue;
      for (const it of R.items) {
        const id = "spmBtn_" + it.obj;
        let btn = P.querySelector(":scope > ." + id);
        const has = era && !!spmPool(J, it.obj, era);
        if (!has) { if (btn) btn.remove(); continue; }
        if (!btn) {
          spmCss();
          btn = document.createElement("button");
          btn.type = "button"; btn.className = "spm-hot " + id;
          const s = it.shape, W = 768, H = 1376;
          if (typeof s[0] === "number" && s.length === 3) {
            btn.style.left = ((s[0] - s[2]) / W * 100) + "%";
            btn.style.top = ((s[1] - s[2]) / H * 100) + "%";
            btn.style.width = (s[2] * 2 / W * 100) + "%";
            btn.style.height = (s[2] * 2 / H * 100) + "%";
            btn.style.borderRadius = "50%";
          }
          btn.addEventListener("click", e => { e.stopPropagation(); const er = spmEra(I.getAttribute("src") || I.src || ""); if (er && spmPool(J, it.obj, er)) spmShow(it.obj, er); });
          P.append(btn);
        }
        btn.setAttribute("aria-label", spmLabel(J, it.obj, era));
        btn.title = spmLabel(J, it.obj, era);
      }
    }
  });
}
function spmCss() {
  if (document.getElementById("spmCss")) return;
  const s = document.createElement("style"); s.id = "spmCss";
  s.textContent = ".spm-hot{position:absolute;z-index:2;margin:0;padding:0;border:0;background:transparent;cursor:pointer;-webkit-tap-highlight-color:transparent}" +
    ".spm-hot:focus-visible{outline:2px solid rgba(255,224,150,.95);outline-offset:2px;border-radius:50%}";
  document.head.append(s);
}
/* 自動接：跟 07w6 的 sciAuto 一樣，畫面有變動就看一下（最多 0.4 秒一次），各頁模組不用改 */
function spmAuto() {
  if (!SCENE_POEM_ON) return;
  for (const R of POEM_REG) {
    for (const I of document.querySelectorAll(R.img || ".shp-page.cq>img")) {
      const P = I.parentElement; if (!P) continue;
      try { spmMount(P, I); } catch (e) {}
    }
  }
}
{
  let busy = 0;
  const kick = () => { if (busy) return; busy = 1; setTimeout(() => { busy = 0; try { spmAuto(); } catch (e) {} }, 400); };
  const init = () => { try { new MutationObserver(kick).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["src"] }); } catch (e) {} addEventListener("hashchange", kick); kick(); };
  if (document.readyState === "loading") addEventListener("DOMContentLoaded", init); else init();
}
