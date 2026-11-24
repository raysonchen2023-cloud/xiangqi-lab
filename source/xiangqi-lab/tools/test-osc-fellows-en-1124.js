"use strict";
/* #107 審查後續建議（11/24）：修行頁「師友」英文句 oscFellows(sid)[1] 的行為——沒找到的秘境人物不列、照樣翻譯、全空時用英文的空句，不夾中文。
   用 vm 跑真的 m/07z9-school.js（OSC 核心＋oscNpcShown／oscWhoShown／oscWhoNames／oscFellows）。 */
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const OS = fs.readFileSync(path.join(__dirname, "..", "..", "xiangqi-db", "m", "07z9-school.js"), "utf8");

function load(sec) {
  const fn = (name) => { const m = OS.match(new RegExp("^function " + name + "\\(.*$", "m")); assert.ok(m, "抓得到 " + name); return m[0] };
  const c = { jhT: (s) => s, oscT: (s) => "EN:" + s, jSecrets: () => sec };
  vm.createContext(c);
  vm.runInContext(OS.slice(OS.indexOf("const OSC=(()=>{"), OS.indexOf("/* ===== END osc-core")) + ";this.OSC=OSC;\n" + ["oscNpcShown", "oscWhoShown", "oscWhoNames", "oscFellows"].map(fn).join("\n"), c);
  return c;
}
const HAN = /[㐀-鿿]/;

test("英文師友句：沒找到的秘境人物不列；列出的名字都經 oscT 翻譯；句子裡除了翻譯過的名字沒有中文", () => {
  const c = load({}), SCH = c.OSC.SCH, SEC = Object.entries(c.OSC.NPC).filter(([k]) => k.startsWith("secret:")).map(([, x]) => x[2]);
  assert.ok(SCH.length >= 9 && SEC.length >= 1, "測試前提：有門派、有秘境人物");
  for (const s of SCH) {
    const [zh, en] = c.oscFellows(s.id);
    assert.ok(en.startsWith("Fellow players: "), s.id + "：英文句開頭");
    for (const n of SEC) assert.ok(!en.includes("EN:" + n) && !en.includes(n), s.id + " 英文師友不列沒找到的 " + n);
    const names = zh.startsWith("師友：還沒") ? [] : zh.slice(3, -1).split("、");
    if (names.length) assert.equal(en, "Fellow players: " + names.map((n) => "EN:" + n).join(", ") + ".", s.id + "：英文名單跟中文名單一一對應");
    else assert.equal(en, "Fellow players: you haven't met anyone from this school yet.", s.id + "：全空時用英文空句");
    assert.ok(!HAN.test(en.replace(/EN:[^,.]+/g, "")), s.id + "：英文句沒有夾中文：" + en);
  }
});

test("英文師友句：秘境人物找到過就照列（翻譯過）", () => {
  const c0 = load({}), all = {};
  for (const k of Object.keys(c0.OSC.NPC)) if (k.startsWith("secret:")) all[k.slice(7)] = 1;
  const c = load(all), SEC = Object.entries(c.OSC.NPC).filter(([k]) => k.startsWith("secret:"));
  const hit = c.OSC.SCH.filter((s) => SEC.some(([, x]) => c.oscFellows(s.id)[1].includes("EN:" + x[2])));
  assert.ok(hit.length >= 1, "全部找到過時，至少一派的英文師友出現秘境人物");
});
