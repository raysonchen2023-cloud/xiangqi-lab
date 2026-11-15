// 11/15 hspx「沒有網路的時候，3D 角色會變成小帥 Q 版，而不是選定的角色」：
// 原因是 sw.js 沒存 3D 模型載入器（06-cpu XQGLB 用 import() 載 GLTFLoader.mjs，它再 import three-shim.mjs、BufferGeometryUtils.mjs），
// 安裝時的 APP_FILES 沒列，一般檔案又只存 .js／.json／.svg／.wasm；離線時 import 失敗，所有 Tripo 模型都載不到，退回 Q 版小帥。
// 用法：node --test xiangqi-lab/tools/test-sw-offline.js
"use strict";
const test = require("node:test"), assert = require("node:assert"), fs = require("fs"), path = require("path");
const SITE = path.join(__dirname, "..", "site"), SW = fs.readFileSync(path.join(SITE, "sw.js"), "utf8");
const APP = (() => { const m = SW.match(/const APP_FILES=\[([\s\S]*?)\];/); return m ? [...m[1].matchAll(/"([^"]+)"/g)].map(x => x[1]) : [] })();

test("〔原始碼〕3D 模型載入器和它 import 的檔都在安裝時先存（APP_FILES）", () => {
  assert.ok(APP.length > 20, "讀得到 APP_FILES");
  const need = new Set(["GLTFLoader.mjs"]), todo = ["GLTFLoader.mjs"];
  while (todo.length) {   /* 照 import 一路找下去：載入器用到的每一支 .mjs 都要在 APP_FILES */
    const f = todo.pop(), src = fs.readFileSync(path.join(SITE, f), "utf8");
    for (const m of src.matchAll(/from\s+['"]\.\/([\w.-]+\.mjs)['"]/g)) if (!need.has(m[1])) { need.add(m[1]); todo.push(m[1]) }
  }
  for (const f of need) assert.ok(APP.includes(f), "APP_FILES 少了 " + f + "（離線時 3D 角色載不到，會退回 Q 版小帥）");
  assert.ok(need.size >= 3, "至少 GLTFLoader、three-shim、BufferGeometryUtils：" + [...need].join("、"));
});

test("〔原始碼〕一般檔案用到就存：.mjs 也要存（之後新增的 .mjs 不會再漏）", () => {
  assert.ok(SW.includes("url.pathname.match(/\\.(m?js|json|svg|wasm)$/)"), "存檔規則要包含 .mjs");
});
