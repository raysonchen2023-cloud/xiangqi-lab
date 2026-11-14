// 第 12 輪 X12 繁中用字：城市名單（00-util.js 的 CITY_ZH）改寫「臺北」之後，問小帥天氣（09-askbot.js 的 worldWeather）
// 打「台北」「臺北」都要對到同一個英文地名去查；設定頁城市選單舊存檔的「台北」也要選得到。不開瀏覽器、不連網路（fetch 是假的）。
// 用法：node --test xiangqi-lab/tools/test-askbot-city.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const M = path.join(__dirname, "..", "..", "xiangqi-db", "m");
const rd = f => fs.readFileSync(path.join(M, f), "utf8").replace(/\r\n/g, "\n");
const UTIL = rd("00-util.js"), ASK = rd("09-askbot.js"), SET = rd("05-settings.js");
const CITY = (UTIL.match(/^const CITY_ZH=.*;$/m) || [])[0];
const WW = (ASK.match(/^async function worldWeather\(q\)\{[\s\S]*?\n(?=function |async function )/m) || [])[0];

function ask(q, myCity) {
  const URLS = [];
  const ctx = vm.createContext({ URLS, encodeURIComponent, store: { get: (k, d) => k === "myCity" ? (myCity || d) : d }, fetch: async u => { URLS.push(u); return { json: async () => ({ results: [] }) } } });
  vm.runInContext(CITY + "\n" + WW + "\nthis.worldWeather=worldWeather;", ctx);
  return ctx.worldWeather(q).then(r => ({ r, urls: URLS }));
}

test("CITY_ZH 寫「臺北」（不再寫台北），也抽得出 worldWeather", () => {
  assert.ok(CITY && WW, "抽得出 CITY_ZH 與 worldWeather");
  assert.match(CITY, /\["Taipei","臺北"\]/);
  assert.doesNotMatch(CITY, /台北/);
});

test("問天氣打「台北」「臺北」「臺北市」都用 Taipei 去查", async () => {
  for (const q of ["台北天氣", "臺北天氣", "臺北市明天會不會下雨", "台北市的天氣"]) {
    const { urls } = await ask(q);
    assert.equal(urls.length, 1, q);
    assert.match(urls[0], /name=Taipei&/, q);
  }
});

test("設定裡選的城市是舊存檔「台北」也查得到；台中照舊", async () => {
  assert.match((await ask("今天天氣", "台北")).urls[0], /name=Taipei&/);
  assert.match((await ask("今天天氣", "臺北")).urls[0], /name=Taipei&/);
  assert.match((await ask("台中天氣")).urls[0], /name=Taichung&/);
});

test("〔原始碼〕設定頁城市選單：舊存檔「台北」對到新的「臺北」選項", () => {
  assert.ok(SET.includes('String(store.get("myCity","")||"").replace(/^台北$/,"臺北")===v'));
});

/* 11/13 開發者截圖：問小帥「遊戲大小」被「小人…調大小」那筆搶走。把 BOT_FAQ 和 askNorm 原樣切出來，用 askKB 同樣的打分（命中的關鍵字字數 ×3）挑第一名 */
test("〔混合〕問「遊戲大小」「佔多少空間」「容量」→ 回答到「設定 → 關於」看已下載／整包；「小人可以調大小嗎」還是小人那筆",()=>{
  const a=ASK.indexOf("const BOT_FAQ=["),b=ASK.indexOf("\n// 學習指南（意見回饋 183）");assert.ok(a>=0&&b>a,"切得出 BOT_FAQ");
  const NORM=(ASK.match(/^function askNorm\(q\)\{.*$/m)||[])[0];assert.ok(NORM,"切得出 askNorm");
  const ctx=vm.createContext(new Proxy({},{has:()=>true,get:(t,k)=>k in t?t[k]:k===Symbol.unscopables?undefined:typeof k==="string"&&/^[A-Z_]+$/.test(k)?k:globalThis[k],set:(t,k,v)=>{t[k]=v;return true}}));vm.runInContext('const ZHN="〇一二三四五六七八九";'+ASK.slice(a,b)+"\n"+NORM+"\nthis.F=BOT_FAQ;this.N=askNorm;",ctx);
  const top=q=>{const n=ctx.N(q);let best=null,bs=-1;for(const[keys,text]of ctx.F){let sc=0,hit=[];for(const k0 of keys){const k=ctx.N(k0);if(!k)continue;if(n.includes(k)){if(!hit.some(h=>h.includes(k)||k.includes(h))){hit.push(k);sc+=k.length*3}}else if(k.includes(n)&&n.length>=2)sc=Math.max(sc,n.length*2)}if(sc>bs){bs=sc;best=text}}return best};
  for(const q of["遊戲大小","整個遊戲大小","佔多少空間","容量多少","儲存空間"])assert.match(top(q),/設定 → 📜 關於/,q);
  assert.match(top("小人可以調大小嗎"),/\{BOT\}/,"問小人大小還是小人那筆");
});
