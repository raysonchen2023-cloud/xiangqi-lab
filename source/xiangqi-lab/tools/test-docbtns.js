// 11/13 開發者截圖：設定的說明清單（XQDOC，三欄按鈕）「新手流程與健康數字」「電腦對手怎麼下」字超出框。
// 修法：名稱縮短、按鈕改成放不下就換行（不再 white-space:nowrap）。用法：node --test xiangqi-lab/tools/test-docbtns.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path");
const SET = fs.readFileSync(path.join(__dirname, "../../xiangqi-db/m/05-settings.js"), "utf8");

test("〔原始碼〕說明按鈕放不下就換行，不再強制一行（不會再衝出框）", () => {
  assert.ok(SET.includes(".xqd-g>button{white-space:normal;line-height:1.25;overflow-wrap:anywhere;"));
  assert.ok(!SET.includes(".xqd-g>button{white-space:nowrap"));
});

test("〔行為〕說明清單每一項的名稱（去掉開頭圖示）都在 7 個字以內（三欄時放得下，放不下也會換行），檔名都對得到 data/docs 裡的文件", () => {
  const m = SET.match(/XQDOC=(\{.*?\});/); assert.ok(m, "切得出 XQDOC");
  const X = new Function("return " + m[1])(), docs = path.join(__dirname, "../site/data/docs");
  for (const [k, [f, lab]] of Object.entries(X)) {
    const name = lab.replace(/^[\p{Extended_Pictographic}\u{FE0F}\u{200D}\s]+/u, "");
    assert.ok([...name].length <= 7, `${k}「${name}」${[...name].length} 個字`);
    assert.ok(fs.existsSync(path.join(docs, f + ".md")), `${k} 對到 ${f}.md`);
  }
});
