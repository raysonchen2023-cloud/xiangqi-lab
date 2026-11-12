#!/usr/bin/env node
// 線上大廳保留訊息的過期清理（開發者 11/11 核准資料保留期限，說明 xiangqi-db/story/91_資料保留期限與清理.md）：
//   ROOT/h/<裝置代號>   戰績摘要（net.js pubHist，訊息裡 at＝最後更新時間）   → 90 天沒更新就清
//   ROOT/g/<對局代號>/s 整盤棋譜（net.js pubGame，at＝開局時間、tk＝最後一步的時間） → 30 天就清（以 at、tk 較晚的那個算）
//   ROOT/x/<雜湊>/…     換手機轉移碼的加密暫存（m/05-settings.js xfUpload，說明裡 exp＝期限） → 過期 10 分鐘後連同分段一起清（judgeX）
// 清法：對那個主題發一則「空的保留訊息」，伺服器就把保留的那則刪掉（MQTT 標準做法，net.js forget 也是這樣清）。
// 用法（預設只列出、不刪）：
//   node xiangqi-lab/tools/mqtt-prune.js                       正式大廳，只列出要清哪些（dry-run）
//   node xiangqi-lab/tools/mqtt-prune.js --root citytest       測試房間 xqlab-test-citytest/v1
//   node xiangqi-lab/tools/mqtt-prune.js --root citytest --apply   真的清（正式大廳加 --apply 會先等 8 秒，Ctrl+C 可以取消）
//   node xiangqi-lab/tools/mqtt-prune.js --id <裝置代號>       刪除請求：不管期限，列出這個人的戰績摘要和他下過的每一盤棋譜（加 --apply 才清）
//   --mqtt-config <檔案>  指定伺服器設定（預設 tools/mqtt-config.json，讀法跟其他工具一樣，見 mqtt-config.js）
// 沒有時間欄位、或內容不是 JSON 的保留訊息不會清（列在「看不出時間」），請人工看。
// 不會印出帳號密碼。過期判斷是純函式 judge()，tools/test-retention.js 有測。
"use strict";
const H_DAYS = 90, G_DAYS = 30, DAY = 864e5, LIVE_ROOT = "xqlab-r7k2q/v1";

/* 從主題分出種類：h＝戰績摘要、g＝棋譜；其他回 null */
function kindOf(rel) { return /^h\/[^/]+$/.test(rel) ? "h" : /^g\/[^/]+\/s$/.test(rel) ? "g" : null }
const num = v => typeof v === "number" && isFinite(v) && v > 0 ? v : null;
/* 訊息裡的時間（毫秒）：h 看 at；g 看 at、tk 較晚的那個。看不出來回 null */
function msgTime(kind, x) {
  if (!x || typeof x !== "object") return null;
  if (kind === "h") return num(x.at);
  if (kind === "g") { const a = num(x.at), b = num(x.tk); return a && b ? Math.max(a, b) : a || b }
  return null;
}
/* 這則保留訊息要不要清：{kind, at, age（天）, expire（true 要清／false 留著）, why}
   o.id 有值＝刪除請求模式：h/<id> 和紅黑任一方是 id 的棋譜都要清，不看期限 */
function judge(rel, payload, now, o) {
  o = o || {}; now = now || Date.now();
  const kind = kindOf(rel); if (!kind) return { kind: null, expire: false, why: "不是 h／g 主題" };
  if (payload === "" || payload == null) return { kind, expire: false, why: "已經是空的" };
  let x = null; try { x = JSON.parse(payload) } catch (e) { }
  if (o.id) {
    const mine = kind === "h" ? rel === "h/" + o.id || !!(x && x.id === o.id) : !!(x && ((x.red && x.red.id === o.id) || (x.black && x.black.id === o.id)));
    return { kind, at: msgTime(kind, x), expire: mine, why: mine ? "刪除請求：" + (kind === "h" ? "這個人的戰績摘要" : "這個人下過的棋") : "不是這個人的" };
  }
  const at = msgTime(kind, x);
  if (!at) return { kind, at: null, expire: false, why: "看不出時間" };
  const days = kind === "h" ? (o.hDays || H_DAYS) : (o.gDays || G_DAYS), age = (now - at) / DAY;
  return { kind, at, age, expire: age > days, why: age > days ? `超過 ${days} 天（${Math.floor(age)} 天前）` : `還沒過期（${Math.floor(age)} 天前）` };
}
/* 評審 P22 缺陷 e（11/11）：換手機轉移碼的暫存 x/<碼的雜湊>/m（說明，exp＝期限）＋ x/<雜湊>/<i>（加密分段）。以前只靠舊手機 App 開著的計時器清，舊手機先關掉就永遠留著。
   要整組看，所以另外一個函式 judgeX(全部保留訊息 [相對主題, 內容], now)：說明過期（多給 10 分鐘寬限，防兩台電腦時鐘差）、說明沒有期限、或只剩分段沒有說明 → 說明和分段一起清。
   回傳 [{rel, kind:"x", at（期限）, expire, why}]；刪除請求模式（--id）不管 x（轉移碼看不出是誰的） */
const X_GRACE = 10 * 60000;
function judgeX(entries, now) {
  now = now || Date.now(); const grp = new Map(), out = [];
  for (const [rel, msg] of entries) {
    const m = /^x\/([0-9a-f]{20})\/(m|\d{1,4})$/.exec(rel); if (!m || msg === "" || msg == null) continue;
    const g = grp.get(m[1]) || { meta: null, parts: [] }; if (m[2] === "m") g.meta = { rel, msg }; else g.parts.push(rel); grp.set(m[1], g);
  }
  for (const g of grp.values()) {
    let exp = null; if (g.meta) { try { const x = JSON.parse(g.meta.msg); exp = num(x && +x.exp) } catch (e) { } }
    const expire = !g.meta || !exp || now > exp + X_GRACE;
    const why = !g.meta ? "只剩分段、沒有說明（已經用不到）" : !exp ? "說明裡沒有期限（已經用不到）" : expire ? `轉移碼過期 ${Math.floor((now - exp) / 60000)} 分鐘` : "轉移碼還在有效期限內";
    for (const rel of [...(g.meta ? [g.meta.rel] : []), ...g.parts]) out.push({ rel, kind: "x", at: exp, expire, why });
  }
  return out;
}
function rootOf(arg) { if (!arg || arg === "live") return LIVE_ROOT; if (!/^[\w-]{3,40}$/.test(arg)) throw new Error("房間名稱只能用英數字、底線、減號（3～40 字）"); return "xqlab-test-" + arg + "/v1" }
module.exports = { judge, judgeX, kindOf, msgTime, rootOf, H_DAYS, G_DAYS, LIVE_ROOT, X_GRACE };

/* ---------- 以下是直接執行時才跑的連線部分（MQTT 3.1.1 over WebSocket，寫法跟 collect-anon.js 一樣） ---------- */
if (require.main === module) {
  const argv = process.argv.slice(2), opt = k => argv.includes(k) ? argv[argv.indexOf(k) + 1] : null;
  const APPLY = argv.includes("--apply"), ID = opt("--id");
  let ROOT; try { ROOT = rootOf(opt("--root")) } catch (e) { console.log(e.message); process.exit(1) }
  if (ID != null && !/^[A-Za-z0-9_-]{3,40}$/.test(ID)) { console.log("裝置代號不對：要 3～40 個英數字"); process.exit(1) }
  const MQ = require("./mqtt-config.js"); let CFG; try { CFG = MQ.load(argv) } catch (e) { console.log("❌ " + e.message); process.exit(1) }
  const te = new TextEncoder(), td = new TextDecoder();
  const str = x => { const b = te.encode(x); return [b.length >> 8, b.length & 255, ...b] };
  const vlen = n => { const a = []; do { let d = n % 128; n = Math.floor(n / 128); if (n > 0) d |= 128; a.push(d) } while (n > 0); return a };
  const pkt = (h, body) => new Uint8Array([h, ...vlen(body.length), ...body]);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const tw = t => t ? new Date(t + 8 * 3600e3).toISOString().slice(0, 16).replace("T", " ") : "?";

  /* 連上、訂閱 h/+、g/+/s、x/+/+，收保留訊息到安靜 3 秒（最多 90 秒）為止；回傳 {ws, got: Map(相對主題 → 內容)} */
  function collect() {
    return new Promise((res, rej) => {
      const ws = new WebSocket(CFG.url, ["mqtt"]); ws.binaryType = "arraybuffer";
      let buf = new Uint8Array(0), last = 0, subOk = false, ping = null; const got = new Map();
      const fail = setTimeout(() => { try { ws.close() } catch (e) { } rej(new Error("90 秒內沒收完（連不上或太慢）")) }, 90000);
      const done = () => { clearTimeout(fail); clearInterval(chk); res({ ws, got, ping }) };
      const chk = setInterval(() => { if (subOk && Date.now() - last > 3000) done() }, 500);
      ws.onopen = () => ws.send(MQ.connectPacket({ clientId: "xqprune" + Date.now().toString(36), keepalive: 60, username: CFG.username, password: CFG.password }));
      ws.onmessage = e => {
        const n = new Uint8Array(e.data), b = new Uint8Array(buf.length + n.length); b.set(buf); b.set(n, buf.length); buf = b;
        for (;;) {
          if (buf.length < 2) return; let len = 0, mul = 1, i = 1, d; do { if (i >= buf.length) return; d = buf[i++]; len += (d & 127) * mul; mul *= 128 } while (d & 128);
          if (buf.length < i + len) return; const p = buf.slice(0, i + len), body = p.slice(i); buf = buf.slice(i + len); const type = p[0] >> 4;
          if (type === 2) {
            if (body[1] !== 0) { clearTimeout(fail); clearInterval(chk); return rej(new Error("伺服器拒絕連線（代碼 " + body[1] + "）")) }
            ws.send(pkt(0x82, [0, 1, ...str(ROOT + "/h/+"), 0, ...str(ROOT + "/g/+/s"), 0, ...str(ROOT + "/x/+/+"), 0])); ping = setInterval(() => { try { ws.send(new Uint8Array([0xC0, 0])) } catch (e) { } }, 30000);
          } else if (type === 9) {
            if ([...body.slice(2)].some(c => c === 0x80)) { clearTimeout(fail); clearInterval(chk); return rej(new Error("不准訂閱 " + ROOT + " 的 h/+、g/+/s 或 x/+/+（ACL 權限要再檢查）")) }
            subOk = true; last = Date.now();
          } else if (type === 3) {
            const tl = (body[0] << 8) | body[1], topic = td.decode(body.slice(2, 2 + tl)), msg = td.decode(body.slice(2 + tl + ((p[0] & 6) ? 2 : 0)));
            last = Date.now(); if ((p[0] & 1) && topic.startsWith(ROOT + "/")) got.set(topic.slice(ROOT.length + 1), msg);
          }
        }
      };
      ws.onerror = () => { }; ws.onclose = () => { };
    });
  }
  const bye = c => { clearInterval(c.ping); try { c.ws.send(new Uint8Array([0xE0, 0])); c.ws.close() } catch (e) { } };

  (async () => {
    console.log(`連線到 ${CFG.url}，房間 ${ROOT}${ROOT === LIVE_ROOT ? "（正式大廳）" : "（測試）"}，${APPLY ? "會真的清" : "只列出、不刪（加 --apply 才清）"}${ID ? "，刪除請求：" + ID : ""}`);
    if (APPLY && ROOT === LIVE_ROOT) { console.log("⚠ 這是正式大廳，8 秒後開始清；不要清請按 Ctrl+C"); await wait(8000) }
    const now = Date.now(), c = await collect(), rows = [];
    for (const [rel, msg] of c.got) { const j = judge(rel, msg, now, { id: ID }); if (j.kind) rows.push({ rel, msg, ...j }) }
    if (!ID) rows.push(...judgeX(c.got, now));
    const cnt = k => rows.filter(r => r.kind === k).length, kill = rows.filter(r => r.expire), unk = rows.filter(r => !r.expire && /看不出時間/.test(r.why));
    console.log(`收到保留訊息：戰績摘要 h ${cnt("h")} 則、棋譜 g ${cnt("g")} 則、轉移碼暫存 x ${cnt("x")} 則`);
    console.log(`要清 ${kill.length} 則（戰績摘要 ${kill.filter(r => r.kind === "h").length}、棋譜 ${kill.filter(r => r.kind === "g").length}、轉移碼暫存 ${kill.filter(r => r.kind === "x").length}）：`);
    for (const r of kill) console.log(`  ${r.rel}　最後時間 ${tw(r.at)}（臺灣時間）　${r.why}`);
    if (unk.length) { console.log(`看不出時間、沒有清的 ${unk.length} 則（請人工看）：`); for (const r of unk.slice(0, 50)) console.log("  " + r.rel) }
    if (!APPLY || !kill.length) { bye(c); console.log(APPLY ? "沒有要清的。" : "（只列出，沒有刪。確定要清再加 --apply）"); process.exit(0) }
    /* 專用伺服器每條連線每秒最多收 10 則（net.js 回饋 854）：每則隔 150 毫秒 */
    for (const r of kill) { c.ws.send(pkt(0x31, [...str(ROOT + "/" + r.rel)])); await wait(150) }
    await wait(1500); bye(c);
    console.log(`已送出 ${kill.length} 則清除。再連一次確認…`);
    await wait(1500);
    const c2 = await collect(), left = kill.filter(r => c2.got.has(r.rel) && c2.got.get(r.rel) !== ""); bye(c2);
    console.log(left.length ? `⚠ 還有 ${left.length} 則沒清掉：` + left.map(r => r.rel).join("、") : `✅ 確認清掉了（剩下戰績摘要 ${[...c2.got.keys()].filter(k => kindOf(k) === "h").length}、棋譜 ${[...c2.got.keys()].filter(k => kindOf(k) === "g").length} 則）`);
    process.exit(left.length ? 2 : 0);
  })().catch(e => { console.log("❌ " + e.message); process.exit(1) });
}
