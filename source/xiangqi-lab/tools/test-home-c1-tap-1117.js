// 11/17 iPhone 模擬器測試（iPhone 18 Pro、iOS 27.2、正式站 20261117-0005，全新玩家）第 1 項：
//   首頁走路角色站在「📖 第一章」按鈕上方，點按鈕點到角色身上的透明按鈕（07w .shw-me），跳出「問問題／聽棋語／我的角色」小選單蓋住按鈕。
//   修法：有走路角色時（07w shwMount 給首頁 P 加 shw-iso，P 自成一個疊層），底部那條（07z .hm-go-bar，「📖 第一章」07mnq #mnqNext 就在裡面）墊到角色按鈕上面；
//   入口標籤（z 200）、角色泡泡與小選單（210、211）照舊在它上面。
// 不開瀏覽器：讀 07z、07w 的樣式字串，比 z-index 的高低。用法：node --test xiangqi-lab/tools/test-home-c1-tap-1117.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..", ".."), rd = p => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const HM = rd("xiangqi-db/m/07z-homemap.js"), SHW = rd("xiangqi-db/m/07w-shipwalk.js"), MNQ = rd("xiangqi-db/m/07mnq-mainquest.js");
const zOf = (src, sel) => { const i = src.indexOf(sel + "{"); assert.ok(i >= 0, "找得到 " + sel); const m = /z-index:(\d+)/.exec(src.slice(i, src.indexOf("}", i))); assert.ok(m, sel + " 有 z-index"); return +m[1] };

test("〔樣式〕有走路角色時，底部那條（含「📖 第一章」）在角色按鈕、💬 上面，在入口標籤、泡泡、小選單底下", () => {
  const bar = zOf(HM, ".shw-iso>.hm-go-bar"), me = zOf(SHW, ".shw-me"), hint = zOf(SHW, ".shw-hint"), say = zOf(SHW, ".shw-say"), menu = zOf(SHW, ".shw-menu");
  const spot = +/\.shw-iso\.shw-iso \.shp-spot,[^{]*\{z-index:(\d+)/.exec(SHW)[1];
  assert.ok(bar > me, `底部那條 ${bar} 要高過角色按鈕 .shw-me ${me}`);
  assert.ok(bar > hint, "高過頭上的 💬");
  assert.ok(bar < spot && bar < say && bar < menu, "入口標籤、泡泡、自己打開的小選單照舊在上面");
  assert.equal(zOf(HM, ".hm-go-bar"), 30, "沒有走路角色（減少動態等）照舊 30，不跟 body 上的視窗搶");
});

test("〔接點〕shw-iso 加在首頁 P（shwMount 的 root），底部那條是 P 的直接子元素、「📖 第一章」在底部那條裡", () => {
  assert.ok(SHW.includes('o.root.dataset.shw="1";shwCss();o.root.classList.add("shw-iso")'), "07w shwMount 給 root 加 shw-iso");
  assert.ok(SHW.includes(".shw-iso{isolation:isolate}"), "shw-iso 自成疊層");
  assert.ok(HM.includes('shwPage(v,hmwWalkCfg(hk,P),"home")'), "首頁的 root 就是 P（shwPage 用 .shp-page.cq）");
  assert.ok(HM.includes('P.querySelector(":scope>.hm-go-bar")'), "底部那條是 P 的直接子元素（:scope>）");
  assert.ok(MNQ.includes('b.className="mnq-next";b.id="mnqNext";bar.insertBefore(b,bar.firstChild)'), "「📖 第一章」（mnqNext）插在底部那條裡");
});
