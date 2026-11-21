// 象棋千秋 Android：把剛安裝的 App 帶到「封測玩家狀態」，讓模擬器上看到的畫面跟封測玩家手機一樣（W41，2026-11-21）
// Copyright (c) 2026 陳泓昇 (Chen Hung-Sheng)．SPDX-License-Identifier: GPL-3.0-or-later
//
// 為什麼：空白存檔的新安裝看到的是小帥、英文（模擬器系統語言是英文）、新手流程，跟封測玩家（臺灣、已開旅程、帶著七星夥伴）完全不同。
//   開發者 11/21：「我這邊也要精準看到跟 Android 手機的畫面樣子」。破圖、版面問題要在玩家真的會看到的畫面上找。
// 做法（都用 App 自己的流程函式，不手寫存檔欄位）：
//   1. App 語言設繁中（adb shell cmd locale set-app-locales，Android 13 以上；不支援時只靠 App 內設定）
//   2. journeyStart 開新旅程（新旅程一律齊轍開局）→ 序局標成下過（bhXuDone，玩家都下過）
//   3. ptyJoin 讓隨行夥伴上船、ptySetLook 設成隨行（預設駱躍梅，跟開發者手機一致）→ 存檔、重新載入
//   4. 等預載頁收掉，收下新旅程的「七星授印禮」
// 跟真實封測玩家還有這些差別（PR #12 審查，報告裡要照實寫）：
//   - 只到「剛開旅程」：修為、星輝、官階、進度都是新的，玩了幾天的玩家畫面會多一些已解鎖的東西
//   - 連到大廳的測試房（xq_netRoot＝xq_test），不是正式大廳
//   - App 語言靠 cmd locale set-app-locales 設繁中：要 Android 13 以上；Android 12 設不了，navigator.language 仍是英文，只靠 App 內設定換成中文
// 用法：const { setupPlayer } = require("./player-state.js"); await setupPlayer({ adb, serial, port, companion })
"use strict";
const cp = require("child_process");
const { connect } = require("./cdp.js");
const PKG = "com.raysonchen.xiangqiqianqiu";
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function attach(adbFn, port, ready, tries = 90) {
  for (let i = 0; i < tries; i++) {
    let c = null;
    try {
      const pid = adbFn("shell", "pidof", PKG).split(/\s+/)[0];
      if (pid) { adbFn("forward", "tcp:" + port, "localabstract:webview_devtools_remote_" + pid); c = await connect(port); if (await c.ev(ready)) return c }
    } catch (e) { }
    if (c) c.close();
    await sleep(1000);
  }
  throw new Error("App 沒有就緒（" + ready.slice(0, 60) + "）");
}
const PRELOAD_BUSY = '[...document.querySelectorAll("body *")].some(e=>e.childElementCount===0&&/正在準備棋盤/.test(e.textContent)&&e.getBoundingClientRect().height>0)';
async function waitPreload(c, ms = 240000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (!(await c.ev(PRELOAD_BUSY))) return true; await sleep(3000) }
  return false;
}

/* 回傳 { c 角色, look 隨行, lang, appLocale } ；失敗丟錯（呼叫端當「測試不成立」） */
async function setupPlayer({ adb: ADB = process.env.ADB || "adb", serial, port = 9262, companion = "x_miaogirl" }) {
  const adb = (...a) => cp.execFileSync(ADB, ["-s", serial, ...a], { encoding: "utf8", timeout: 180000 }).trim();
  let appLocale = "zh-TW";
  try { adb("shell", "cmd", "locale", "set-app-locales", PKG, "--locales", "zh-TW") } catch (e) { appLocale = "不支援（只設 App 內語言）" }
  adb("shell", "am", "force-stop", PKG); adb("shell", "am", "start", "-n", PKG + "/.MainActivity");
  let c = await attach(adb, port, 'typeof journeyStart==="function"&&typeof store!=="undefined"');
  try {
    await c.ev(`(async()=>{localStorage.setItem('xq_netRoot',JSON.stringify('xq_test'));store.set('lang','zh');if(!journey())await journeyStart(1,null,'封測測試',2)})()`);
    await sleep(1500);
    await c.ev(`(async()=>{store.set('bhXuDone',Date.now());store.set('bhxLand',Date.now());store.set('lang','zh');
      if(typeof ptyJoin==='function')ptyJoin(${JSON.stringify(companion)},'ship');if(typeof ptySetLook==='function')ptySetLook(${JSON.stringify(companion)});
      await saveNow(true);location.hash='#/';location.reload()})()`).catch(() => { });
  } finally { c.close() }
  await sleep(5000);
  c = await attach(adb, port, 'typeof route==="function"&&Boolean(document.querySelector(".home-page"))');
  try {
    if (!(await waitPreload(c))) throw new Error("預載頁 4 分鐘還沒收掉");
    await sleep(2000);
    /* 新旅程的歡迎視窗（七星授印禮）：玩家都按過「收下」 */
    await c.ev(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.offsetParent&&x.textContent.trim()==='收下');if(b)b.click()})()`);
    await sleep(1500);
    const st = JSON.parse(await c.ev('JSON.stringify({c:myChar(),look:(typeof ptyGet==="function"&&ptyGet()||{}).look||null,lang:store.get("lang",null),nav:navigator.language})'));
    if (st.c !== companion || st.lang !== "zh") throw new Error("封測玩家狀態沒設成：" + JSON.stringify(st));
    return { ...st, appLocale };
  } finally { c.close() }
}
module.exports = { setupPlayer, waitPreload, PRELOAD_BUSY };
