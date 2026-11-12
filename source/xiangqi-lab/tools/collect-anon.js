#!/usr/bin/env node
// 只收匿名資料，不上線任何虛擬玩家（開發者 11/11：漏斗資料要補收）。
// 以前這三種資料都是 lobby-bots.js 順便收的；11/10 大廳角色全關以後就沒人收了。這支只訂大廳的 irt 頻道，收到就照原格式存檔：
//   新手流程 t:"fun"   → xiangqi-db/onboard-funnel.jsonl      （看漏斗：node xiangqi-lab/tools/onboard-funnel.js）
//   成長曲線 t:"tal"   → xiangqi-db/talent-responses.jsonl
//   測驗、殘局、讀譜作答 → xiangqi-db/irt-responses.jsonl      （給 calibrate-irt.js 校正題目）
//   卡關訊號 t:"stk"   → xiangqi-db/stuck-signals.jsonl
//   跟電腦下完的評分 t:"cpu" → xiangqi-db/cpu-games.jsonl     （開發者 11/11 照三方審查新增；給 tools/calibrate-wdl.js、calibrate-grades.js 校正新算法）
//   匿名健康摘要 t:"hlt"   → xiangqi-db/health-telemetry.jsonl （第 11 輪 X3；玩家在設定打開才送，預設關；App 05d-telemetry.js；保留 90 天）
// 用法：node xiangqi-lab/tools/collect-anon.js                正式大廳
//       node xiangqi-lab/tools/collect-anon.js --room citytest  測試房間（寫 *.test.jsonl）
// 電腦要開著、這個視窗要開著才收得到（MQTT 不會幫你留訊息）。App 每多走一步會把整份步驟重送，關掉一段時間也只少掉中間那幾筆。
// 不要跟 lobby-bots.js 同時開：兩邊都會寫同一個檔，同一筆會存兩次。
"use strict";
const fs = require("fs"), path = require("path");
const argv = process.argv.slice(2), roomArg = argv.includes("--room") ? argv[argv.indexOf("--room") + 1] : null;
if (roomArg && !/^[\w-]{3,40}$/.test(roomArg)) { console.log("房間名稱只能用英數字、底線、減號（3～40 字）"); process.exit(1) }
const LIVE = !roomArg, ROOT = LIVE ? "xqlab-r7k2q/v1" : "xqlab-test-" + roomArg + "/v1", TOPIC = ROOT + "/irt";
const MQ = require("./mqtt-config.js"), CFG = MQ.load(argv);
const DBDIR = path.join(__dirname, "..", "..", "xiangqi-db"), F = n => path.join(DBDIR, LIVE ? n + ".jsonl" : n + ".test.jsonl");
const STK_FILE = F("stuck-signals"), STK_TEST_FILE = path.join(DBDIR, "stuck-signals.test.jsonl");
const CPU_FILE = F("cpu-games"), CPU_TEST_FILE = path.join(DBDIR, "cpu-games.test.jsonl");
const HLT_FILE = F("health-telemetry"), HLT_TEST_FILE = path.join(DBDIR, "health-telemetry.test.jsonl");
const IRT_FILE = F("irt-responses"), TAL_FILE = F("talent-responses"), FUN_FILE = F("onboard-funnel"), FUN_TEST_FILE = path.join(DBDIR, "onboard-funnel.test.jsonl");
const log = (...a) => console.log(new Date().toLocaleString("zh-TW", { hour12: false }), ...a);
const NL = String.fromCharCode(10);

/* 以下三個函式跟 lobby-bots.js 的 saveIRT／saveTal／saveFun 同一套檢查和格式（那邊改了這邊也要跟著改） */
function saveIRT(x) {
  if (!x || !Array.isArray(x.r) || x.r.length > 40) return;
  const t = typeof x.t === "string" && /^[a-z]{1,8}$/.test(x.t) ? x.t : "quiz", th = x.th == null || x.th === "" || !isFinite(+x.th) ? null : Math.max(-5, Math.min(5, +x.th));
  const ok = a => Array.isArray(a) && typeof a[0] === "string" && a[0].length > 0 && a[0].length <= 40, sec = v => v == null || !isFinite(+v) ? null : Math.max(0, Math.min(600, +v)), int = (v, m) => Math.max(0, Math.min(m, Math.round(+v || 0)));
  const r = x.r.filter(ok).map(a => t === "cj" ? [a[0], a[1] ? 1 : 0, sec(a[4]), int(a[2], 4), int(a[3], 99)] : t === "rd" ? [a[0], a[1] ? 1 : 0, sec(a[2]), int(a[3], 9)] : [a[0], a[1] ? 1 : 0, sec(a[2])]);
  const rec = { at: Date.now(), v: 2, t, th, ...(typeof x.aid === "string" && x.aid.length <= 40 ? { aid: x.aid } : {}), r };
  if (rec.r.length) { fs.appendFileSync(IRT_FILE, JSON.stringify(rec) + NL); log(`收到匿名作答（${t}）${rec.r.length} 題`) }
}
/* 數學修正 11/11（審查 A.3）：保留 aid（App 送的匿名碼，04-stats.js shareIRT 已經有帶）——calibrate-talent.js 用它把同一個人每兩天送一次的曲線合併成一份，沒有它每一份都算成不同的人，常下棋的人權重會被灌大。
   v2 格式：pts 每點 [累積練習量, 準確度, 對手級數或 null]；ax＝最近約 150 步各階段 [準確度加總, 步數] 與 bad [失著＋敗著, 步數]（給 calibrate-axes.js 算各段位的階段基準） */
function saveTal(x) {
  const pts = Array.isArray(x.pts) ? x.pts.filter(a => Array.isArray(a) && isFinite(a[0]) && isFinite(a[1])).slice(-80).map(a => [+(+a[0]).toFixed(1), Math.max(0, Math.min(100, Math.round(+a[1]))), a[2] != null && isFinite(+a[2]) ? Math.max(1, Math.min(18, Math.round(+a[2]))) : null]) : [];
  if (pts.length < 3) return; const rk = typeof x.rk === "string" && x.rk.length < 8 ? x.rk : null, crk = typeof x.crk === "string" && x.crk.length < 8 ? x.crk : null;
  const aid = typeof x.aid === "string" && /^[a-z0-9]{4,40}$/.test(x.aid) ? x.aid : null, pair = a => Array.isArray(a) && isFinite(a[0]) && isFinite(a[1]) && +a[1] >= 0 ? [Math.round(+a[0] * 10) / 10, Math.min(5000, Math.round(+a[1]))] : null;
  const ax = x.ax && typeof x.ax === "object" ? Object.fromEntries(["open", "mid", "end", "bad"].map(k => [k, pair(x.ax[k])]).filter(e => e[1])) : null;
  fs.appendFileSync(TAL_FILE, JSON.stringify({ at: Date.now(), v: 2, ...(aid ? { aid } : {}), rk, crk, pts, ...(ax && Object.keys(ax).length ? { ax } : {}) }) + NL); log(`收到匿名成長曲線 ${pts.length} 點（${rk || crk || "?"}${aid ? "・" + aid.slice(0, 4) : ""}）`)
}
/* 新手步驟：nxcpu／nxmore／nxhome／fwok2 是 11/11 0923 版第一課三條路加的（下一盤簡單的棋／再練一題／先逛逛、第二題走對） */
const FUN_STEPS = ["open", "pre", "fw", "fwok", "fwskip", "nxcpu", "nxmore", "fwok2", "nxhome", "pick", "pro", "home", "g1", "g1e"];
function saveFun(x) {
  if (typeof x.iid !== "string" || !/^[a-z0-9]{6,20}$/.test(x.iid) || !x.s || typeof x.s !== "object") return;
  const s = {}; for (const k of FUN_STEPS) { const v = +x.s[k]; if (x.s[k] != null && isFinite(v) && v >= 0 && v <= 30 * 86400) s[k] = Math.round(v) } if (s.open == null) return;
  const rec = { at: Date.now(), iid: x.iid, s, ver: typeof x.ver === "string" ? x.ver.slice(0, 20) : "", dev: /^(phone|tablet|desktop)$/.test(x.dev) ? x.dev : "?", ...(x.test ? { test: 1 } : {}) };
  fs.appendFileSync(LIVE && !x.test ? FUN_FILE : FUN_TEST_FILE, JSON.stringify(rec) + NL); log(`收到新手流程（${Object.keys(s).length} 步${x.test ? "・測試" : ""}）`)
}
/* 卡關訊號（開發者 11/11 核准，App 05b-save.js 的 STK）：每次開 App 一段，走過的頁、卡住訊號；live:1＝同一頁 3 分鐘沒動，即時跳一行 */
const STK_KINDS = ["idle", "rage", "bounce", "mvt", "miss", "hint", "quit", "err"];
function saveStk(x) {
  if (typeof x.sid !== "string" || !/^[a-z0-9]{6,20}$/.test(x.sid)) return;
  const txt = (v, n) => String(v == null ? "" : v).slice(0, n), int = (v, m) => Math.max(0, Math.min(m, Math.round(+v || 0)));
  const p = Array.isArray(x.p) ? x.p.filter(a => Array.isArray(a)).slice(-30).map(a => [txt(a[0], 20), int(a[1], 86400)]) : [];
  const e = Array.isArray(x.e) ? x.e.filter(a => Array.isArray(a) && STK_KINDS.includes(a[0])).slice(-60).map(a => [a[0], txt(a[1], 20), int(a[2], 86400), ...(a[3] != null ? [txt(a[3], 40)] : [])]) : [];
  const rec = { at: Date.now(), sid: x.sid, sec: int(x.sec, 864000), p, e, last: txt(x.last, 20), ver: txt(x.ver, 20), dev: /^(phone|tablet|desktop)$/.test(x.dev) ? x.dev : "?", ...(x.live ? { live: 1 } : {}), ...(x.test ? { test: 1 } : {}) };
  fs.appendFileSync(LIVE && !x.test ? STK_FILE : STK_TEST_FILE, JSON.stringify(rec) + NL);
  const tag = x.test ? "・測試" : "";
  if (rec.live) { log(`⚠ 有人卡住了：在「${rec.last}」3 分鐘沒動（${rec.dev}${tag}）`); return }
  const cnt = {}; for (const a of e) cnt[a[0]] = (cnt[a[0]] || 0) + 1;
  log(`收到卡關訊號：${p.length} 頁、${Object.entries(cnt).map(([k, n]) => k + " " + n).join("、") || "沒有卡住"}，最後在「${rec.last}」${tag}`);
}
/* 跟電腦下完一盤的評分（開發者 11/11 照三方審查：影子模式同時收新的匿名對局資料；App 05b-save.js 的 cpaDone）。只有數字和段位名，沒有名字、裝置代號、棋譜、存檔。
   檢查照 saveStk／saveFun 的寫法：碼的格式要對、字串截長度、數字夾範圍、陣列限長度；欄位意思見 05b-save.js 的 cpa 段。test:1 或測試房間 → cpu-games.test.jsonl */
const CPU_RES = ["w", "l", "d"];
function saveCpu(x) {
  if (typeof x.aid !== "string" || !/^[a-z0-9]{4,40}$/.test(x.aid) || typeof x.g !== "string" || !/^[a-z0-9]{6,20}$/.test(x.g) || !CPU_RES.includes(x.res) || (x.hu !== "r" && x.hu !== "b")) return;
  const txt = (v, n) => v == null ? null : String(v).slice(0, n), int = (v, lo, hi) => v == null || v === "" || !isFinite(+v) ? null : Math.max(lo, Math.min(hi, Math.round(+v))), b01 = v => v ? 1 : 0;
  const ev = v => int(v, -32000, 32000), sc = a => Array.isArray(a) && a.length >= 2 ? [int(a[0], 0, 100), int(a[1], 0, 4), a[2] == null ? null : Math.max(0, Math.min(100, Math.round(+a[2] * 10) / 10 || 0))] : null;
  const m = Array.isArray(x.m) ? x.m.filter(a => Array.isArray(a) && a.length >= 9 && isFinite(+a[0])).slice(0, 150).map(a => [int(a[0], 1, 999), int(a[1], 0, 2), ev(a[2]), ev(a[3]), b01(a[4]), int(a[5], 0, 4000), int(a[6], -1, 5), int(a[7], -1, 5), int(a[8], 0, 2)]) : [];
  if (m.length < 4) return;
  const rec = { at: Date.now(), v: 1, aid: x.aid, g: x.g, ver: txt(x.ver, 20) || "", dev: /^(phone|tablet|desktop)$/.test(x.dev) ? x.dev : "?", mx: int(x.mx, 0, 999), kind: txt(x.kind, 10) || "cpu",
    lv: int(x.lv, 0, 30), ...(x.rlv != null ? { rlv: int(x.rlv, 0, 30) } : {}), rk: b01(x.rk), ...(x.ork ? { ork: txt(x.ork, 8) } : {}), hu: x.hu, res: x.res, why: txt(x.why, 12) || "",
    n: int(x.n, 0, 2000), std: b01(x.std), hn: int(x.hn, 0, 999), un: int(x.un, 0, 999), bl: b01(x.bl), full: b01(x.full),
    crk: txt(x.crk, 8), pts: int(x.pts, 0, 5000), ...(x.d != null ? { d: int(x.d, -200, 200) } : {}), nrk: txt(x.nrk, 8), o: sc(x.o), s: sc(x.s), m, ...(x.test ? { test: 1 } : {}) };
  fs.appendFileSync(LIVE && !x.test ? CPU_FILE : CPU_TEST_FILE, JSON.stringify(rec) + NL);
  log(`收到對局評分：${rec.kind} 第 ${rec.lv} 級${rec.rk ? "（積分挑戰）" : ""}、${rec.res === "w" ? "贏" : rec.res === "l" ? "輸" : "和"}、${m.length} 步、舊 ${rec.o ? rec.o[0] : "?"} 新 ${rec.s ? rec.s[0] : "?"}（${rec.crk || "?"}${x.test ? "・測試" : ""}）`);
}
/* 匿名健康摘要（第 11 輪 X3，App 05d-telemetry.js 的 tlmPacket）：玩家自己打開「每天自動送匿名健康摘要」才送，每天最多一次，是「上次送出以後新增」的數字。
   沒有任何 id（同一支手機每天送的對不起來）；只收這幾欄，其他欄位一律丟掉：
   e 錯誤次數、em 最多 5 筆 [訊息前 80 字, 檔名 40 字, 行號]、lt [長任務次數, 總毫秒]、bt 啟動時間中位數、rf 資源失敗 [圖片, 程式, 資料檔]、ver、dev、test。
   test:1 或測試房間 → health-telemetry.test.jsonl（file 參數只給測試用）。看彙整：node xiangqi-lab/tools/health-funnel.js --tele */
function saveHlt(x, file) {
  if (!x || x.v !== 1) return null;
  const int = (v, m) => Math.max(0, Math.min(m, Math.round(+v || 0))), txt = (v, n) => String(v == null ? "" : v).replace(/\s+/g, " ").slice(0, n);
  const em = Array.isArray(x.em) ? x.em.filter(a => Array.isArray(a)).slice(0, 5).map(a => [txt(a[0], 80), txt(a[1], 40).replace(/[^\w.-]/g, ""), int(a[2], 1e7)]) : [];
  const lt = Array.isArray(x.lt) ? [int(x.lt[0], 1e6), int(x.lt[1], 1e9)] : [0, 0], rf = [0, 1, 2].map(i => int(Array.isArray(x.rf) ? x.rf[i] : 0, 1e6));
  const rec = { at: Date.now(), v: 1, ver: txt(x.ver, 20), dev: /^(phone|tablet|desktop)$/.test(x.dev) ? x.dev : "?", e: int(x.e, 1e6), em, lt, bt: x.bt == null || !isFinite(+x.bt) ? null : int(x.bt, 6e5), rf, ...(x.test ? { test: 1 } : {}) };
  fs.appendFileSync(file || (LIVE && !x.test ? HLT_FILE : HLT_TEST_FILE), JSON.stringify(rec) + NL);
  log(`收到匿名健康摘要：錯誤 ${rec.e}、長任務 ${lt[0]}、資源失敗 ${rf[0] + rf[1] + rf[2]}、啟動 ${rec.bt == null ? "?" : rec.bt + " 毫秒"}（${rec.dev}${x.test ? "・測試" : ""}）`);
  return rec;
}
function onMsg(msg) {
  let x; try { x = JSON.parse(msg) } catch (e) { return }
  try { if (x && x.t === "tal") return saveTal(x); if (x && x.t === "fun") return saveFun(x); if (x && x.t === "stk") return saveStk(x); if (x && x.t === "cpu") return saveCpu(x); if (x && x.t === "hlt") return saveHlt(x); saveIRT(x) } catch (e) { log("存檔失敗：" + e.message) }
}

/* MQTT 3.1.1 over WebSocket，只訂一個頻道；寫法跟 watch-feedback.js 一樣，斷線 5 秒後重連 */
const te = new TextEncoder(), td = new TextDecoder();
const str = x => { const b = te.encode(x); return [b.length >> 8, b.length & 255, ...b] };
const vlen = n => { const a = []; do { let d = n % 128; n = Math.floor(n / 128); if (n > 0) d |= 128; a.push(d) } while (n > 0); return a };
const pkt = (h, body) => new Uint8Array([h, ...vlen(body.length), ...body]);
function run() {
  const ws = new WebSocket(CFG.url, ["mqtt"]); ws.binaryType = "arraybuffer"; let ping = null, buf = new Uint8Array(0), done = false;
  const again = why => { if (done) return; done = true; clearInterval(ping); try { ws.close() } catch (e) { } log(`連線中斷（${why}），5 秒後重連`); setTimeout(run, 5000) };
  ws.onopen = () => ws.send(MQ.connectPacket({ clientId: "xqanon" + Date.now().toString(36), keepalive: 60, username: CFG.username, password: CFG.password }));
  ws.onmessage = e => {
    const n = new Uint8Array(e.data), b = new Uint8Array(buf.length + n.length); b.set(buf); b.set(n, buf.length); buf = b;
    for (;;) {
      if (buf.length < 2) return; let len = 0, mul = 1, i = 1, d; do { if (i >= buf.length) return; d = buf[i++]; len += (d & 127) * mul; mul *= 128 } while (d & 128);
      if (buf.length < i + len) return; const p = buf.slice(0, i + len), body = p.slice(i); buf = buf.slice(i + len); const type = p[0] >> 4;
      if (type === 2) { if (body[1] !== 0) return again("伺服器拒絕"); ws.send(pkt(0x82, [0, 1, ...str(TOPIC), 0])); ping = setInterval(() => ws.send(new Uint8Array([0xC0, 0])), 30000); log(`開始收匿名資料 ${TOPIC}（${LIVE ? "正式" : "測試"}）`) }
      else if (type === 3) { const tl = (body[0] << 8) | body[1], topic = td.decode(body.slice(2, 2 + tl)); if (topic === TOPIC) onMsg(td.decode(body.slice(2 + tl + ((p[0] & 6) ? 2 : 0)))) }
    }
  };
  ws.onerror = () => { }; ws.onclose = () => again("關閉")
}
/* v5 改善單 R05：保留期限（App 隱私說明寫的是同一組數字）。卡關訊號 90 天、對局評分一年、匿名健康摘要 hlt 90 天（第 11 輪 X3）；開程式時清一次、之後每天清一次，超過的整行刪掉
   資料保留期限（開發者 11/11 核准，xiangqi-db/story/91_資料保留期限與清理.md）：新手流程 fun、成長曲線 tal、測驗／殘局／讀譜作答（quiz、cj、rd，都在 irt-responses）也是一年。
   正式和測試的檔都列進來（用完整檔名，不管這次是正式還是 --room 測試都清同一組）。
   talent-responses.test.jsonl 不列：那是 at:1 的手工測試資料（calibrate-talent.js 指定檔案時用），列進來會被整份刪光；lobby-bots.js 的 irt-bots*.jsonl 是虛擬玩家的資料，也不列 */
const P = n => path.join(DBDIR, n);
const KEEP = [[P("stuck-signals.jsonl"), 90], [P("stuck-signals.test.jsonl"), 90], [P("cpu-games.jsonl"), 365], [P("cpu-games.test.jsonl"), 365], [P("health-telemetry.jsonl"), 90], [P("health-telemetry.test.jsonl"), 90],
  [P("onboard-funnel.jsonl"), 365], [P("onboard-funnel.test.jsonl"), 365], [P("talent-responses.jsonl"), 365], [P("irt-responses.jsonl"), 365], [P("irt-responses.test.jsonl"), 365]];
/* 清一個檔：at（收到的時間，毫秒）早於 now－days 天的整行刪掉；看不懂的行也刪。回傳刪掉幾筆（沒有檔＝0） */
function pruneFile(f, days, now) {
  if (!fs.existsSync(f)) return 0; const cut = (now || Date.now()) - days * 864e5, all = fs.readFileSync(f, "utf8").split(NL).filter(Boolean);
  const keep = all.filter(l => { try { return JSON.parse(l).at >= cut } catch (e) { return false } });
  if (keep.length < all.length) fs.writeFileSync(f, keep.map(l => l + NL).join(""));
  return all.length - keep.length;
}
function prune(list, now) {
  for (const [f, days] of list || KEEP) {
    try { const n = pruneFile(f, days, now); if (n) log(`${path.basename(f)}：刪掉超過 ${days} 天的 ${n} 筆`) } catch (e) { log("清過期資料失敗：" + e.message) }
  }
}
/* tools/test-retention.js 用 require 載入、只測 KEEP／pruneFile，不連線 */
if (require.main === module) { prune(); setInterval(prune, 864e5); run() }
else module.exports = { KEEP, pruneFile, prune, saveHlt, onMsg, HLT_FILE, HLT_TEST_FILE };
