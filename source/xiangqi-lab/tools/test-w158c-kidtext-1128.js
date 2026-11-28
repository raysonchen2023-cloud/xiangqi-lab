// W158③（11/28，送審必擋，Apple 1.2、5.1）：兒童模式的說明文字要跟實際行為一致。
// 外部審核：設定寫「不連線、資料不送出」，但兒童模式下意見回饋照樣送文字、換手機（家長驗證後）會把加密存檔暫存到伺服器、公開檔案照常下載。
// 改成「不連線上大廳、不送使用資料」，清單補上換手機與公開下載兩項；中英文一起改（英文放內建字典 07i18n.js）。
// 這裡檢查：舊說法都不見了、新說法都在、每一句新中文在內建字典都有英文。
// 用法：node --test xiangqi-lab/tools/test-w158c-kidtext-1128.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "../..");
const rd = p => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const FAM = rd("xiangqi-db/m/07m5-family.js"), LBS = rd("xiangqi-db/m/07x4-lobbysafe.js"), I18 = rd("xiangqi-db/m/07i18n.js");
const OLD = ["開（不連線、資料不送出）", "觀戰都不開，資料也不送出去。", "（不跟陌生人互動、資料不送出、提醒休息）"];
const NEW = [
  [FAM, "開（不連線上大廳、不送使用資料）"],
  [FAM, "📲 換手機要家長驗證：驗證後才會把加密的存檔暫存到伺服器，新手機收完就刪"],
  [FAM, "⬇ 棋子圖、引擎這類公開檔案照常下載，不帶任何個人資料"],
  [LBS, "兒童模式不跟陌生人互動：線上大廳、千秋盃、觀戰都不開，也不送使用資料（意見回饋只送文字，換手機要家長驗證）。"],
  [LBS, "（不跟陌生人互動、不送使用資料、提醒休息）"],
];
const keyIn = (zh) => I18.includes(JSON.stringify(zh) + ":\"");
test("〔原始碼〕舊說法（不連線、資料不送出）在畫面程式與字典都不見了", () => {
  for (const o of OLD) for (const [n, s] of [["07m5", FAM], ["07x4", LBS], ["07i18n", I18]]) assert.ok(!s.includes(o), n + " 還有舊說法：" + o);
});
test("〔原始碼〕新說法都在畫面程式裡", () => { for (const [s, t] of NEW) assert.ok(s.includes(t), "少了：" + t) });
test("〔原始碼〕新說法在內建字典都有英文（不靠只放 CDN 的外掛字典）", () => {
  for (const [, t] of NEW) {
    const k = t.startsWith("（") ? null : t;
    if (k) assert.ok(keyIn(k), "內建字典少了：" + k);
    else assert.ok(I18.includes(t + "\":\""), "內建字典少了含這段的句子：" + t);
  }
  assert.ok(/no usage data sent/.test(I18) && /parent's approval/.test(I18), "英文要寫明不送使用資料、換手機要家長同意");
});
test("改壞驗證：把舊說法放回去，檢查要抓得到", () => {
  const bad = FAM.replace("開（不連線上大廳、不送使用資料）", OLD[0]);
  assert.ok(bad.includes(OLD[0]) && !bad.includes(NEW[0][1]), "壞版本做出來了");
  assert.throws(() => { for (const o of OLD) assert.ok(!bad.includes(o)) }, "舊說法回來時要失敗");
});
