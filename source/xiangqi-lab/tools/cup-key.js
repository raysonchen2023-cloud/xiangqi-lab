// 千秋盃裁判台金鑰與簽名格式（第 9 輪外部評審：千秋盃報名與賽程廣播也要簽名驗證）
//   私鑰只放開發者電腦的使用者資料夾：%USERPROFILE%\.xiangqi-cup-key.json（正式大廳）、%USERPROFILE%\.xiangqi-cup-key.test.json（測試房）。
//   絕不放進專案資料夾、倉庫、測試或文件；這支程式不會印出私鑰。App 只內建公開金鑰（src/net.js 的 CUP_KEY）。
//   cup-host.js 啟動時呼叫 ensureKey()：使用者資料夾有就用；沒有、但舊位置（tools/.cup-key.json、tools/.cup-key.test.json）有＝複製過去（公開金鑰不變，舊版 App 照樣驗得過）；
//   都沒有＝產生新的一把（這時 App 內建的公開金鑰要換成新的，cup-host.js 會比對、對不上就不開賽）。
// 用法：
//   node xiangqi-lab/tools/cup-key.js                 正式大廳的金鑰：檢查（沒有就搬／產生）、印公開金鑰、跟 App 內建的比對
//   node xiangqi-lab/tools/cup-key.js --test          測試房的金鑰
//   node xiangqi-lab/tools/cup-key.js --remove-legacy 確認使用者資料夾那份跟舊位置那份是同一把以後，刪掉專案資料夾裡的舊私鑰檔（--test 一起用＝測試房那份）
// 簽名格式（App 端 src/net.js 照同一套驗）：
//   廣播 cup/state、cup/hall：{d, s}；d＝JSON 字串（多帶 k＝"state"／"hall"、rt＝大廳根目錄 ROOT），s＝ECDSA P-256／SHA-256 對 d 的簽名（IEEE-P1363 r||s，base64url）
//   裁判台開的對局 g/<cup…>/s：多帶 hs＝{v:1, k}，k 簽「xq-cupg1|ROOT|gid|內容」；內容＝對局狀態去掉 rev、at、sg、rl、hs 以後的 JSON（只換 rev 轉送時簽名照樣對）
//   玩家的報名、取消、點將 cup/req：{t, wk, id, name, pts, at, pk, sg}；sg＝玩家自己的對局金鑰（pk，raw 65 位元組 base64url）簽「xq-cupreq1」＋JSON.stringify([ROOT, wk, t, id, name, pts, at, pk])
"use strict";
const fs = require("fs"), path = require("path"), os = require("os"), crypto = require("crypto");

/* XQ_CUP_KEY_DIR、XQ_CUP_LEGACY_DIR：只給測試用（換成暫存資料夾，不碰開發者真正的金鑰） */
const keyFile = live => path.join(process.env.XQ_CUP_KEY_DIR || os.homedir(), live ? ".xiangqi-cup-key.json" : ".xiangqi-cup-key.test.json");
const legacyFile = (live, dir) => path.join(dir || process.env.XQ_CUP_LEGACY_DIR || __dirname, live ? ".cup-key.json" : ".cup-key.test.json");
const pubOf = key => { const p = crypto.createPublicKey(key).export({ format: "jwk" }); return { x: p.x, y: p.y } };

/* 讀金鑰；沒有就從舊位置搬、或產生新的。回傳 {key（私鑰 KeyObject）, pub:{x,y}, file, how:"found"|"migrated"|"made", legacy（舊檔還在的話是路徑）} */
function ensureKey(live, o) {
  o = o || {}; const f = o.file || keyFile(live), old = legacyFile(live, o.legacyDir), log = o.log || (() => { });
  let j = null, how = "found";
  if (fs.existsSync(f)) j = JSON.parse(fs.readFileSync(f, "utf8"));
  else if (fs.existsSync(old)) {
    j = JSON.parse(fs.readFileSync(old, "utf8")); how = "migrated";
    fs.writeFileSync(f, JSON.stringify(j, null, 1), { flag: "wx", mode: 0o600 });
    log(`千秋盃：裁判台私鑰從專案資料夾搬到 ${f}（公開金鑰不變）。確認裁判台正常以後，執行 node tools/cup-key.js${live ? "" : " --test"} --remove-legacy 刪掉舊檔 ${old}`);
  } else {
    const { privateKey } = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" }), priv = privateKey.export({ format: "jwk" });
    j = { note: "千秋盃裁判台私鑰（" + (live ? "正式大廳" : "測試房") + "）。只放這台電腦，不能放進專案資料夾、倉庫或傳給任何人；App 只放公開金鑰 pub", priv, pub: { x: priv.x, y: priv.y }, at: new Date().toISOString() };
    fs.writeFileSync(f, JSON.stringify(j, null, 1), { flag: "wx", mode: 0o600 }); how = "made";
    log(`千秋盃：產生了新的裁判台金鑰 ${f}；App 內建的公開金鑰（src/net.js CUP_KEY${live ? " 正式大廳那組" : " 測試房那組"}）要換成 x=${priv.x} y=${priv.y}`);
  }
  if (!j || !j.priv) throw new Error("金鑰檔格式不對：" + f);
  const key = crypto.createPrivateKey({ key: j.priv, format: "jwk" });
  return { key, pub: pubOf(key), file: f, how, legacy: fs.existsSync(old) ? old : null };
}

/* App 內建的公開金鑰（從 src/net.js 的 CUP_KEY 那行讀；正式大廳、測試房各一組） */
function appKey(live, src) {
  src = src || fs.readFileSync(path.join(__dirname, "..", "src", "net.js"), "utf8");
  const m = src.match(/const CUP_KEY=\/\^xqlab-test-\/\.test\(ROOT\)\?\{x:"([\w-]+)",y:"([\w-]+)"\}:\{x:"([\w-]+)",y:"([\w-]+)"\}/);
  return m ? (live ? { x: m[3], y: m[4] } : { x: m[1], y: m[2] }) : null;
}

/* ---------- 簽名格式（App 端 src/net.js 照同一套驗） ---------- */
const sign = (key, s) => crypto.sign("sha256", Buffer.from(s), { key, dsaEncoding: "ieee-p1363" }).toString("base64url");
/* 廣播：d 多帶 k（哪一種公告）、rt（哪個大廳），換頻道、換大廳重貼都驗不過 */
function envelope(key, kind, ROOT, obj) { const d = JSON.stringify({ ...obj, k: kind, rt: ROOT }); return JSON.stringify({ d, s: sign(key, d) }) }
/* 對局內容（去掉 rev、at、sg、rl、hs）：只換 rev 重送時不變 */
const hcCup = g => { const o = {}; for (const k in g) if (k !== "rev" && k !== "at" && k !== "sg" && k !== "rl" && k !== "hs") o[k] = g[k]; return JSON.stringify(o) };
const gameMsg = (ROOT, g) => "xq-cupg1|" + ROOT + "|" + g.gid + "|" + hcCup(g);
/* 裁判台發的對局狀態蓋章：回傳一份新的（原本那份不動），舊的 hs 先拿掉再簽 */
function sealGame(key, ROOT, G) { const o = { ...G }; delete o.hs; o.hs = { v: 1, k: sign(key, gameMsg(ROOT, o)) }; return o }
const reqMsg = (ROOT, x) => "xq-cupreq1" + JSON.stringify([ROOT, x.wk, x.t, x.id, x.name, x.pts, x.at, x.pk]);
const PK_RE = /^[A-Za-z0-9_-]{80,100}$/;
/* 玩家公開金鑰（raw 65 位元組：04||x||y，base64url）→ KeyObject */
function rawPub(pk) {
  const b = Buffer.from(pk, "base64url"); if (b.length !== 65 || b[0] !== 4) throw new Error("公開金鑰格式不對");
  return crypto.createPublicKey({ key: { kty: "EC", crv: "P-256", x: b.subarray(1, 33).toString("base64url"), y: b.subarray(33).toString("base64url") }, format: "jwk" });
}
/* 驗玩家的報名／取消／點將：回 {ok:true} 或 {ok:false, why} */
function verifyReq(ROOT, x) {
  if (!x || typeof x !== "object") return { ok: false, why: "格式不對" };
  if (typeof x.sg !== "string" || typeof x.pk !== "string") return { ok: false, why: "沒有簽名（舊版 App 或偽造）" };
  if (!PK_RE.test(x.pk)) return { ok: false, why: "公開金鑰格式不對" };
  try { if (crypto.verify("sha256", Buffer.from(reqMsg(ROOT, x)), { key: rawPub(x.pk), dsaEncoding: "ieee-p1363" }, Buffer.from(x.sg, "base64url"))) return { ok: true } } catch (e) { }
  return { ok: false, why: "簽名不對（內容被改過、或不是這把金鑰簽的）" };
}

module.exports = { keyFile, legacyFile, ensureKey, appKey, pubOf, sign, envelope, hcCup, gameMsg, sealGame, reqMsg, verifyReq, rawPub };

if (require.main === module) {
  const live = !process.argv.includes("--test"), k = ensureKey(live, { log: console.log }), want = appKey(live);
  console.log(`${live ? "正式大廳" : "測試房"}裁判台金鑰：${k.file}（${{ found: "已存在", migrated: "從舊位置搬來", made: "新產生" }[k.how]}）`);
  console.log(`公開金鑰 x=${k.pub.x} y=${k.pub.y}`);
  console.log(want && want.x === k.pub.x && want.y === k.pub.y ? "跟 App 內建的公開金鑰一樣 ✅" : "⚠ 跟 App 內建的公開金鑰（src/net.js CUP_KEY）不一樣：App 會把裁判台的公告都當成偽造。要換 App 裡的公開金鑰、重新發布");
  if (k.legacy) {
    if (process.argv.includes("--remove-legacy")) {
      const o = crypto.createPrivateKey({ key: JSON.parse(fs.readFileSync(k.legacy, "utf8")).priv, format: "jwk" }), op = pubOf(o);
      if (op.x === k.pub.x && op.y === k.pub.y) { fs.unlinkSync(k.legacy); console.log("已刪掉專案資料夾裡的舊私鑰檔 " + k.legacy) }
      else console.log("⚠ 舊檔 " + k.legacy + " 跟使用者資料夾那份不是同一把，沒有刪；請開發者自己確認");
    } else console.log("⚠ 專案資料夾裡還有舊的私鑰檔 " + k.legacy + "：確認裁判台正常以後加 --remove-legacy 刪掉");
  }
}
