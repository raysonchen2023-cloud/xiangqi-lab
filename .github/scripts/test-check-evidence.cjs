// check-evidence.cjs 的自我測試（W60-A2）：只差執行編號、產生時間才算同一份；倉庫那份要是 CI 產生的
"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const { compare } = require("./check-evidence.cjs");

const page = (id, time, body = "共 10 項＝通過 9、失敗 0、略過 1") => `# 驗證紀錄（版本 20261122-0600）

- 執行編號：${id}（Node.js v24.0.0；…）
- 產生時間：${time}
- 結果：${body}
- 測試對象：公開倉庫的 \`source/\`（3 個檔，樹雜湊 SHA-256 \`${"a".repeat(64)}\`），對應的發布版：\`20261122-0600\`。
`;

test("只差執行編號與產生時間（連 Node.js 小版本不同）：算同一份", () => {
  const r = compare(page("gh-100-1", "2026-11-22 06:00:00（臺灣時間）"), page("gh-200-2", "2026-11-22 07:30:00（臺灣時間）").replace("v24.0.0", "v24.1.0"));
  assert.equal(r.ok, true, r.errors.join("；"));
});

test("CRLF 與檔尾多空行不影響", () => {
  const a = page("gh-1-1", "t1").replace(/\n/g, "\r\n") + "\r\n\r\n", b = page("gh-2-1", "t2");
  assert.equal(compare(a, b).ok, true);
});

test("內容不同（例如通過數）：不算同一份，而且指出哪一行", () => {
  const r = compare(page("gh-1-1", "t"), page("gh-2-1", "t", "共 10 項＝通過 10、失敗 0、略過 0"));
  assert.equal(r.ok, false);
  assert.match(r.errors.join("\n"), /第 \d+ 行起[\s\S]*通過 9[\s\S]*通過 10/);
});

test("倉庫那份是本機產生（local-）或沒有執行編號（手改／舊工具）：不准", () => {
  const ci = page("gh-2-1", "t");
  assert.match(compare(page("local-20261122T000000Z-ab12", "t"), ci).errors.join(), /要用 GitHub Actions 產生的/);
  assert.match(compare(page("gh-2-1", "t").replace(/^- 執行編號：.*\n/m, ""), ci).errors.join(), /（沒有）/);
});

test("少一行或多一行也抓得到", () => {
  const a = page("gh-1-1", "t"), b = page("gh-2-1", "t") + "- 多出來的一行\n";
  const r = compare(a, b);
  assert.equal(r.ok, false);
  assert.match(r.errors.join(), /（沒有這一行）/);
});
