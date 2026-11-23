// W76（11/23，開發者看外部評論後選「P0 加回退與開關測項」）：遠端開關真的關得掉。
//   check-flags.js 照代號表一個一個關，冷啟一次、回前景一次，再試讀不到開關檔。這裡驗它「怎麼判」：不開模擬器、不連網、不裝 App。
//   重點：全開時入口就不在＝測不成立（不能把「本來就沒有」當成「關掉了」）；工具不認得的代號＝測不成立（不能默默不驗）。
// 用法：node --test xiangqi-lab/tools/test-check-flags-1123.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), os = require("os"), path = require("path"), cp = require("child_process");
const AND = path.join(__dirname, "..", "..", "xiangqi-android", "scripts");
const CF = path.join(AND, "check-flags.js");
const { planFor, judgeStep, verdict, stepJs } = require(CF);

/* 跟 #71 代號表同樣的結構（只放三個） */
const CODES = [{ code: "halls8", entry: "八派門內頁" }, { code: "play_horse", sid: "horse", spot: "post" }, { code: "play_pawn", sid: "pawn", spot: "rock" }];

test("判法：halls8 關掉＝八派門內頁導回江湖頁，中炮門、屏風馬門照常；全開時要進得去", () => {
  const p = planFor("halls8", CODES);
  assert.deepEqual(p.on, [{ go: "#/jianghu/hall/horse", has: [".jh-hall"] }]);
  assert.equal(p.off[0].go, "#/jianghu/hall/horse"); assert.equal(p.off[0].hashIs, "#/jianghu"); assert.deepEqual(p.off[0].not, [".jh-hall"]);
  assert.deepEqual(p.off.slice(1).map((s) => [s.go, s.has[0]]), [["#/jianghu/hall/central", ".jh-hall"], ["#/jianghu/hall/screen", ".jh-hall"]]);
});

test("判法：play_<派> 關掉＝門內頁照常、只有那一派的入口不見，別派照常；全開時兩派入口都要在", () => {
  const p = planFor("play_horse", CODES);
  assert.deepEqual(p.on, [{ go: "#/jianghu/hall/horse", has: [".jh-hall", '.jh-hall-spot[data-k="post"]'] }, { go: "#/jianghu/hall/pawn", has: ['.jh-hall-spot[data-k="rock"]'] }]);
  assert.deepEqual(p.off[0].has, [".jh-hall"]); assert.deepEqual(p.off[0].not, ['.jh-hall-spot[data-k="post"]']);
  assert.deepEqual(p.off[1].has, ['.jh-hall-spot[data-k="rock"]'], "對照組：別派的入口照常");
});

test("判法：工具不認得的代號、沒有 sid／spot 的代號回 null（測不成立，不能默默不驗）；只有一派時沒有對照組也照樣判", () => {
  assert.equal(planFor("halls9", CODES), null); assert.equal(planFor("play_x", [...CODES, { code: "play_x" }]), null);
  assert.equal(planFor("halls8", [{ code: "halls8" }]), null, "沒有任何一派可以拿來開門內頁");
  const one = planFor("play_horse", [CODES[1]]); assert.equal(one.off.length, 1); assert.equal(one.on.length, 1);
});

test("一步怎麼判：網址要對、該有的有、不該有的沒有；沒拿到狀態、沒查到的選擇器都算錯", () => {
  const s = { go: "#/jianghu/hall/horse", hashIs: "#/jianghu", has: ["#a"], not: ["#b"] };
  assert.deepEqual(judgeStep(s, { hash: "#/jianghu", has: { "#a": true, "#b": false } }), []);
  assert.deepEqual(judgeStep(s, { hash: "#/jianghu/hall/horse", has: { "#a": true, "#b": false } }), ["網址要變成 #/jianghu，實際 #/jianghu/hall/horse"]);
  assert.deepEqual(judgeStep(s, { hash: "#/jianghu", has: { "#a": false, "#b": true } }), ["少了 #a", "還在 #b"]);
  assert.deepEqual(judgeStep(s, { hash: "#/jianghu", has: {} }), ["少了 #a", "還在 #b"], "沒查到＝不能當成「不在」");
  assert.deepEqual(judgeStep(s, null), ["沒拿到畫面狀態"]);
});

test("結束代碼：有一段不成立、有不認得的代號、攔截沒生效、一段都沒跑＝2；有一段關不掉＝1；全過＝0", () => {
  const ok = { code: "a", phase: "冷啟關掉", ok: true, problems: [] }, bad = { ...ok, ok: false }, inv = { ...ok, ok: false, invalid: true };
  assert.equal(verdict([ok, ok]), 0); assert.equal(verdict([ok, bad]), 1);
  assert.equal(verdict([ok, inv]), 2); assert.equal(verdict([bad, inv]), 2, "不成立優先：基準就不對，後面的結果沒意義");
  assert.equal(verdict([ok], { unknown: ["x"] }), 2); assert.equal(verdict([ok], { routeOk: false }), 2); assert.equal(verdict([]), 2);
});

test("頁面程式：照步驟換網址、等一下、回報每個選擇器在不在（用假的 document 實跑）", async () => {
  const step = { go: "#/jianghu/hall/horse", has: [".jh-hall"], not: ['.jh-hall-spot[data-k="post"]'] };
  const js = stepJs(step, 1);
  const present = new Set([".jh-hall"]); let closed = 0;
  const location = { hash: "#/" }, document = { querySelector: (s) => (s === ".modal" ? {} : present.has(s) ? {} : null) };
  const out = await new Function("location", "document", "closeModal", "return " + js)(location, document, () => closed++);
  assert.equal(location.hash, "#/jianghu/hall/horse"); assert.equal(closed, 1, "有視窗先關掉");
  assert.deepEqual(out, { hash: "#/jianghu/hall/horse", has: { ".jh-hall": true, '.jh-hall-spot[data-k="post"]': false } });
  assert.deepEqual(judgeStep(step, out), []);
});

test("命令列：回前景等待不超過 60 秒、代號表讀不到、有不認得的代號，都直接結束代碼 2（不用模擬器）", () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "xq-cflags-")), t = path.join(d, "codes.json");
  fs.writeFileSync(t, JSON.stringify({ codes: CODES }));
  for (const [a, re] of [[["--fg-wait", "30", "--codes", t], /用法/], [["--codes", path.join(d, "沒有.json")], /讀不到代號表/],
    [["--codes", t, "--only", "halls9"], /不認得/], [["--codes", t, "--out", d, "--only", "play_horse,play_zz"], /play_zz/]]) {
    /* cwd 放暫存資料夾：沒給 --out 的那幾種，預設輸出 flags-check/ 也落在暫存資料夾，不弄髒倉庫 */
    const r = cp.spawnSync(process.execPath, [CF, ...a], { cwd: d, encoding: "utf8", timeout: 20000, env: { ...process.env, ADB: "不存在的adb" } });
    assert.equal(r.status, 2, a.join(" ")); assert.match(r.stderr, re);
  }
  assert.equal(JSON.parse(fs.readFileSync(path.join(d, "flags.json"), "utf8")).result, "測不成立", "報告也要寫測不成立");
});

test("〔原始碼〕回前景那段：先全開冷啟、確認開著，放背景等滿 --fg-wait 秒，才把開關檔改成關、叫回前景；要看到重讀開關檔才算", () => {
  const s = fs.readFileSync(CF, "utf8");
  const i = s.indexOf("/* ③ 回前景關掉"), seg = s.slice(i, s.indexOf("/* ④", i));
  const order = ['ro.flags = { v: 1, off: {} }; await cold(true);', "const wasOn = await flagIs(code, true);", '"KEYCODE_HOME"', "await sleep(O.fgWait * 1000);",
    'ro.flags = { v: 1, off: { [code]:', "const before = flagReq();", '"am", "start"', "flagReq() <= before"];
  let at = 0; for (const o of order) { const k = seg.indexOf(o, at); assert.ok(k >= 0, "順序不對或少了：" + o); at = k + 1 }
});
