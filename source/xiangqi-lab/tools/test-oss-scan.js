// 公開原始碼前的機密與個資掃描（xiangqi-lab/tools/oss-scan.js，開發者 11/13 原始碼公開）
// 用假的資料夾驗：各類金鑰、私鑰、密碼、token、信箱、電話、本機路徑、匿名碼樣本、金鑰檔名都抓得到；佔位字不誤報；
// 白名單與 oss-scan:allow 會略過；已知機密只報位置、不印值；--public 標「本來就公開」；有高風險才以代碼 1 結束。
// 假機密一律用字串相接組出來，這個檔本身被掃描時不會誤報。
// 用法：node --test xiangqi-lab/tools/test-oss-scan.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), os = require("os"), path = require("path"), cp = require("child_process");
const OS = require("./oss-scan.js"), CLI = path.join(__dirname, "oss-scan.js");

function fake(files) { const d = fs.mkdtempSync(path.join(os.tmpdir(), "xqossscan-")); for (const [f, c] of Object.entries(files)) { const p = path.join(d, f); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, c) } return d }
const clean = d => fs.rmSync(d, { recursive: true, force: true });
const rep = (c, n) => c.repeat(n);
const SECRETS = {
  "pem-private": "-----BEGIN " + "PRIVATE KEY-----\nMIIB\n-----END " + "PRIVATE KEY-----",
  "jwk-private": '{"kty":"EC","crv":"P-256","d":"' + rep("Qx", 22) + '"}',
  "google-api-key": 'const K="AIza' + rep("B", 35) + '";',
  "anthropic-key": 'k="sk-' + "ant-" + rep("a1", 15) + '"',
  "openai-key": 'k="sk-' + "proj-" + rep("Zz9", 10) + '"',
  "tripo-key": 'TRIPO="tsk' + "_" + rep("q7", 15) + '"',
  "github-token": "gh" + "p_" + rep("A1", 20),
  "aws-key": "AK" + "IA" + rep("Q", 16),
  "slack-token": "xo" + "xb-" + rep("1", 12),
  "jwt": "ey" + "J" + rep("a", 12) + ".ey" + "J" + rep("b", 12) + "." + rep("c", 12),
  "cloudflare-token": "CLOUDFLARE_API_" + "TOKEN=" + rep("x9", 20),   // oss-scan:allow 這一行的鍵名「…token": "…」會被當成設定值，測試用假資料
  "url-credentials": 'const U="mqtt' + "s://bot:" + "pw1234@" + 'host.example.net:8883";',
  "password-assign": "const o={pass" + 'word:"' + "S3cr3t!x" + '"};',
  "bearer": "Authorization: Bear" + "er " + rep("t0k", 10),
  "mqtt-credentials": 'const MQ={host:"h",user:"' + "app" + '",pass:"' + "app12345" + '"};',
  "dev-hash": "DEV_" + 'HASH="' + rep("ab", 32) + '";',
  "email": "// 聯絡：some" + "one@" + "gmail.com",
  "phone-tw": "// 電話 09" + "12-345-678",
  "tw-id": "// A1" + "23456789",
  "local-path": "// 在 C:" + "\\Users\\" + "demo\\proj 下執行",
  "google-endpoint": "https://docs.google.com/forms/d/e/1FAI" + rep("p", 30) + "/viewform",
  "ntfy-topic": "https://ntfy" + ".sh/my-private-topic",
  "private-ip": "// 192." + "168.1.20",
  "anon-sample": '{"ai' + 'd":"' + "k3j9x2q8" + '"}',
};

test("各類機密、個資都抓得到，標出規則、檔名、行號；機密內容遮住", () => {
  const files = {}; for (const [k, v] of Object.entries(SECRETS)) files["src/" + k + ".js"] = "// 第一行\n" + v + "\n";
  const d = fake(files);
  try {
    const R = OS.scan(d), got = new Set(R.findings.map(f => f.rule));
    for (const k of Object.keys(SECRETS)) assert.ok(got.has(k), "抓到 " + k);
    for (const k of Object.keys(SECRETS)) { const f = R.findings.find(x => x.rule === k && x.file === "src/" + k + ".js"); assert.ok(f, k + " 在自己的檔"); assert.equal(f.line, 2, k + " 在第 2 行") }
    const g = R.findings.find(f => f.rule === "google-api-key"); assert.ok(!g.shown.includes(rep("B", 35)), "金鑰內容遮住"); assert.match(g.shown, /共 39 字/);
    const e = R.findings.find(f => f.rule === "email"); assert.equal(e.shown, "s***@gmail.com", "信箱只露第一個字和網域");
    assert.equal(R.findings.find(f => f.rule === "dev-hash").risk, "low", "DEV_HASH 是雜湊＝低風險");
    assert.equal(R.findings.find(f => f.rule === "pem-private").risk, "high");
  } finally { clean(d) }
});

test("金鑰檔名、紀錄檔名也抓（不管內容）", () => {
  const d = fake({ ".xiangqi-cup-key.json": "{}", "tools/mqtt-config.json": "{}", "a/server.pem": "x", ".env": "A=1", "logs/x.jsonl": "{}", "ok.js": "1" });
  try {
    const R = OS.scan(d), names = R.findings.filter(f => f.rule === "secret-file").map(f => f.file).sort();
    assert.deepEqual(names, [".env", ".xiangqi-cup-key.json", "a/server.pem", "tools/mqtt-config.json"]);
    assert.ok(R.findings.some(f => f.rule === "data-log" && f.file === "logs/x.jsonl"));
    assert.ok(!R.findings.some(f => f.file === "ok.js"));
  } finally { clean(d) }
});

test("佔位字、範例信箱、中文值不誤報", () => {
  const d = fake({ "a.js": 'const c={pass' + 'word:"your-password"};\nconst t={tok' + 'en:"changeme"};\n// 寄到 me' + '@example.com\nconst L={pass:"走對這一步"};\nconst q="1.2.3";\n' });
  try { const R = OS.scan(d); assert.deepEqual(R.findings, []) } finally { clean(d) }
});

test("白名單：rule＋file＋match 對上的略過、記下理由；行內 oss-scan:allow 也略過；summary 不算進風險", () => {
  const d = fake({ "lib/a.js": SECRETS["email"] + "\n" + SECRETS["phone-tw"] + "\n", "lib/b.js": SECRETS["google-api-key"] + " // oss-scan:allow 測試資料\n" });
  try {
    const allow = [{ rule: "email", file: "lib/a.js", match: "gmail.com", reason: "第三方作者信箱" }];
    const R = OS.scan(d, { allow }), S = OS.summary(R);
    const e = R.findings.find(f => f.rule === "email"); assert.equal(e.allowed, "第三方作者信箱");
    assert.ok(!R.findings.some(f => f.rule === "google-api-key"), "行內 allow 整行略過");
    assert.equal(S.medium, 1, "只剩電話"); assert.equal(S.allowed, 1); assert.equal(S.high, 0);
    const R2 = OS.scan(d, { allow: [{ rule: "email", file: "lib/zzz.js", reason: "別的檔" }] });
    assert.equal(R2.findings.find(f => f.rule === "email").allowed, null, "檔名對不上就不略過");
  } finally { clean(d) }
});

test("已知機密：只比對私密欄位（JWK 的 d、密碼行），公開金鑰不算；報告與指令輸出都不印值", () => {
  const priv = rep("Pk", 21) + "Z", pubx = rep("Xp", 21) + "Y", pw = "Pw-" + rep("7a", 7);
  const keys = fake({ "cup.json": JSON.stringify({ priv: { kty: "EC", d: priv, x: pubx }, pub: { kty: "EC", x: pubx } }), "login.txt": "開發者登入\n帳號：tester\n密碼：" + pw + "\n" });
  const d = fake({ "app.js": "const PUB={x:\"" + pubx + "\"};\n", "leak.js": "// 1\n// 2\nconst k=\"" + priv + "\";\nconst p=\"" + pw + "\";\n" });
  try {
    const K = OS.knownSecrets({ knownFiles: [path.join(keys, "cup.json"), path.join(keys, "login.txt")] });
    assert.deepEqual(K.map(k => k.value).sort(), [priv, pw].sort(), "只取 d 和密碼");
    const R = OS.scan(d, { known: K }), ks = R.findings.filter(f => f.rule === "known-secret");
    assert.deepEqual(ks.map(f => f.file + ":" + f.line).sort(), ["leak.js:3", "leak.js:4"]);
    assert.ok(ks.every(f => f.shown === "（值不顯示）" && f.risk === "high"));
    assert.ok(!JSON.stringify(R).includes(priv) && !JSON.stringify(R).includes(pw), "結果物件裡沒有值");
    const r = cp.spawnSync(process.execPath, [CLI, d, "--known-file", path.join(keys, "cup.json"), "--known-file", path.join(keys, "login.txt")], { encoding: "utf8" });
    assert.equal(r.status, 1, "有高風險＝代碼 1"); assert.ok(!r.stdout.includes(priv) && !r.stdout.includes(pw), "指令輸出不印值");
    assert.match(r.stdout, /leak\.js:3 {2}本機已知機密（cup\.json 的 d）/);
  } finally { clean(d); clean(keys) }
});

test("--public：已公開的資料夾裡也有的字串標「本來就公開」；只有中低風險時代碼 0", () => {
  const d = fake({ "net.js": SECRETS["mqtt-credentials"] + "\n", "tool.js": SECRETS["ntfy-topic"] + "\n" }), pub = fake({ "net.js": "x;" + SECRETS["mqtt-credentials"] });
  try {
    const R = OS.scan(d, { publicTexts: OS.loadPublic(pub) });
    assert.equal(R.findings.find(f => f.rule === "mqtt-credentials").public, true);
    assert.equal(R.findings.find(f => f.rule === "ntfy-topic").public, false);
    const r = cp.spawnSync(process.execPath, [CLI, d, "--public", pub, "--no-known"], { encoding: "utf8" });
    assert.equal(r.status, 0); assert.match(r.stdout, /本來就公開 2）/, "MQTT 帳密那一行（帳密、密碼兩條規則）都標本來就公開"); assert.match(r.stdout, /tool\.js:1 {2}ntfy 通知頻道：ntfy\.sh\/my-private-topic\n/, "沒公開過的不標");
  } finally { clean(d); clean(pub) }
});

test("二進位檔不掃內容、.git 與 node_modules 跳過", () => {
  const d = fake({ "img.png": Buffer.concat([Buffer.from([0, 1, 2]), Buffer.from(SECRETS["google-api-key"])]), ".git/config": SECRETS["url-credentials"], "node_modules/x/i.js": SECRETS["aws-key"] });
  try { const R = OS.scan(d); assert.deepEqual(R.findings, []); assert.equal(R.files, 1) } finally { clean(d) }
});
