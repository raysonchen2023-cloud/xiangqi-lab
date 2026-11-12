// 千秋盃的裁判台（意見回饋 635，開發者：每週擂台大賽，16 強，線上虛擬玩家也可以報名）
// 由 lobby-bots.js 載入，跟 20 位常駐棋友同一個程式一起跑；開發者電腦開著、大廳角色在線上，比賽才辦得起來。
//
// 規則（象棋裁判、賽事營運、遊戲企劃三位專家的共識，開發者 11/5 選了「週六下午 14:00」「冠軍獎品先做基本的」）：
//   報名：週一 00:00～週五 22:00（臺灣時間），真人先到先得 16 位，超過的排候補
//   點將（報到）：週六 13:30～13:55；沒報到的位子先給候補真人，還有空位才由虛擬棋客補上（籤表會標示）
//   賽制：16 強單淘汰，14:00、14:40、15:20、16:00 四輪滾動開賽；前三輪一盤定勝負，決賽紅黑各一盤；另有一盤季軍戰
//   時限：每方 10 分鐘，每走一步加 5 秒；每步 3 分鐘沒走仍然判超時（App 那邊判）
//   和棋：加賽一盤超快棋（紅 5 分、黑 4 分、不加秒），正局拿黑的這盤拿紅；加賽再和，算黑方勝
//   棄擂：輪到的人 5 分鐘沒動、而且不在這盤棋裡＝棄擂；兩人都沒來就都出局，下一輪的對手輪空直入
//   公平：籤表、賽果只認裁判台簽名發布的那一份（ECDSA P-256，App 裡只放公鑰）；
//         私鑰在開發者電腦的使用者資料夾 %USERPROFILE%\.xiangqi-cup-key.json（測試房 .xiangqi-cup-key.test.json），由 tools/cup-key.js 管（第 9 輪評審：不放專案資料夾）；
//         廣播多帶 k（state／hall）、rt（大廳根目錄），裁判台開的對局帶 hs（裁判台簽名）；報名、取消、點將要玩家自己的對局金鑰簽名（pk＋sg），驗不過不受理（格式見 cup-key.js）
//         裁判台會重播整盤棋步，不合法的狀態不採用；時間到了由裁判台判超時（用自己收到每一步的時間算）
//   真人少於 2 位時是「闖擂練習」（照常比、只發參加獎）；沒有真人報到就休賽一週
//
// 測試：node tools/lobby-bots.js --room citytest --cup-fast   （馬上開一屆：報名 2 分鐘、點將 1 分鐘、每方 3 分鐘＋每步 2 秒）
"use strict";
const fs = require("fs"), path = require("path"), CK = require("./cup-key.js");

const H = 3600e3, D = 24 * H, MIN = 60e3;
const TZ = 8 * H;   // 臺灣時間（沒有日光節約）
const MON0 = Date.UTC(1970, 0, 5);   // 1970-01-05 是星期一
const SEED_POS = [1, 16, 8, 9, 5, 12, 4, 13, 3, 14, 6, 11, 7, 10, 2, 15];
const ROUND_NAME = { 1: "兵卒過河", 2: "車馬爭先", 3: "炮震中原", 4: "九宮論劍", 5: "雙士爭輝" };   // 5＝季軍戰
const PL = { r: "紅方", b: "黑方" }, opp = s => s === "r" ? "b" : "r";
const CK_PK = /^[A-Za-z0-9_-]{80,100}$/;   // 玩家公開金鑰的格式（跟 cup-key.js 的 PK_RE、App 的 sgPk 一樣）

module.exports = function startCup(ctx) {
  const { ROOT, URL, mqtt, BOTS, people, isHuman, C, log, LIVE, DBDIR, argv, hex } = ctx;
  /* 回饋 854（開發者 11/9：專用 MQTT 伺服器、降流量）：mqtt 是 lobby-bots.js 給的「共用連線」（不另開一條）；alive 判斷在線（新版 App 看 ts、舊版看 at） */
  const alive = ctx.alive || (x => !!x && Date.now() - x.at < 150000);
  if (argv.includes("--cup-off")) { log("千秋盃：這次不開（--cup-off）"); return }
  const FAST = argv.includes("--cup-fast") && !LIVE;
  /* 第 9 輪評審：私鑰改放使用者資料夾（tools/cup-key.js 的 ensureKey：沒有就從舊位置搬、或產生新的）；公開金鑰要跟 App 內建的一樣才開賽，不然 App 會把所有公告當成偽造。
     ctx.key：只給測試用（測試自己臨時產生的金鑰） */
  let KEY = ctx.key || null;
  if (!KEY) {
    try {
      const k = CK.ensureKey(LIVE, { log }), want = CK.appKey(LIVE); KEY = k.key;
      if (!want || want.x !== k.pub.x || want.y !== k.pub.y) { log(`千秋盃：裁判台金鑰（${k.file}）跟 App 內建的公開金鑰（src/net.js CUP_KEY）對不上，App 會把公告都當成偽造，這次不開。執行 node tools/cup-key.js${LIVE ? "" : " --test"} 看怎麼處理`); return }
    } catch (e) { log("千秋盃：讀不到簽名金鑰（" + e.message + "），這次不開"); return }
  }
  const FILE = path.join(DBDIR, LIVE ? "cup-state.json" : "cup-state.test.json");
  const HALLF = path.join(DBDIR, LIVE ? "cup-hall.json" : "cup-hall.test.json");
  const TC = FAST ? { m: 3, inc: 2000, tb: [90e3, 72e3] } : { m: 10, inc: 5000, tb: [5 * MIN, 4 * MIN] };
  const GAP = FAST ? 20e3 : 3 * MIN, TBGAP = FAST ? 10e3 : MIN, NOSHOW = FAST ? 90e3 : 5 * MIN, GRACE = 8000;

  // ---------- 一週的時間表 ----------
  const weekIdx = t => Math.floor((t + TZ - MON0) / (7 * D));
  const monOf = w => MON0 + w * 7 * D - TZ;
  function timesOf(w) {
    const m = monOf(w);
    return { reg0: m, reg1: m + 4 * D + 22 * H, ck0: m + 5 * D + 13.5 * H, ck1: m + 5 * D + 13 * H + 55 * MIN, r: [m + 5 * D + 14 * H, m + 5 * D + 14 * H + 40 * MIN, m + 5 * D + 15 * H + 20 * MIN, m + 5 * D + 16 * H] }
  }
  function fastTimes(t0) { return { reg0: t0, reg1: t0 + 2 * MIN, ck0: t0 + 2 * MIN, ck1: t0 + 3 * MIN, r: [t0 + 3 * MIN, 0, 0, 0] } }

  // ---------- 存檔 ----------
  let S = null, X = null;   // S：公開的狀態（會簽名發布）；X：只在電腦上的資料（每位拿紅的次數、上屆出賽的棋客）
  let HALL = { list: [] };
  try { HALL = JSON.parse(fs.readFileSync(HALLF, "utf8")) } catch (e) { }
  try { const o = JSON.parse(fs.readFileSync(FILE, "utf8")); S = o.S; X = o.X } catch (e) { }
  const save = () => { try { fs.writeFileSync(FILE, JSON.stringify({ S, X }, null, 1)) } catch (e) { log("千秋盃存檔失敗：", e.message) } };
  function newWeek(now) {
    const w = FAST ? "t" + now : weekIdx(now), first = HALL.base == null ? (FAST ? 0 : weekIdx(now)) : HALL.base;
    if (HALL.base == null && !FAST) { HALL.base = first; fs.writeFileSync(HALLF, JSON.stringify(HALL)) }
    const lastBots = X && X.lastBots || [];
    S = { v: 1, wk: String(w), ed: FAST ? 0 : weekIdx(now) - first + 1, name: FAST ? "千秋盃（測試）" : "千秋盃", fast: FAST, ph: "reg", t: FAST ? fastTimes(now) : timesOf(w), tc: { m: TC.m, inc: TC.inc / 1000 },
      reg: [], ck: [], practice: false, m: {}, order: [], place: {}, champ: null, why: "", n: 0, at: now };
    X = { reds: {}, lastBots, games: {} };
    log(`千秋盃：開放報名（${S.name}${S.ed ? " 第 " + S.ed + " 屆" : ""}）`); publish()
  }

  // ---------- 簽名發布 ----------
  let cli = null;
  /* 第 9 輪評審：簽的內容多帶 k（state／hall）、rt（這個大廳），App 收到要跟主題、自己連的大廳一樣；at 是發布時間，App 不收比看過的還舊的（防重放） */
  function publish() {
    if (!cli || !cli.up || !S) return; S.n = (S.n || 0) + 1; S.at = Date.now();
    cli.pub(`${ROOT}/cup/state`, CK.envelope(KEY, "state", ROOT, S), true); save()
  }
  function publishHall() { if (!cli || !cli.up) return; cli.pub(`${ROOT}/cup/hall`, CK.envelope(KEY, "hall", ROOT, { v: 1, list: HALL.list.slice(0, 52), at: Date.now() }), true) }

  // ---------- 報名、取消、報到 ----------
  /* 回饋 852（停權名單）：tools/ban.js 管的名單（xiangqi-db/banlist.json；沒有就看 site/data/banlist.json），名單上的人不能報名、報到；已經報名的拿掉。每分鐘最多讀一次檔 */
  let BAN = { ids: {} }, banAt = 0;
  const banned = id => { if (Date.now() - banAt > MIN) { banAt = Date.now(); for (const f of [path.join(__dirname, "..", "..", "xiangqi-db", "banlist.json"), path.join(__dirname, "..", "site", "data", "banlist.json")]) { try { const j = JSON.parse(fs.readFileSync(f, "utf8")); if (j && j.ids && typeof j.ids === "object") { BAN = j; break } } catch (e) { } } } return Object.prototype.hasOwnProperty.call(BAN.ids || {}, id) };
  /* 第 9 輪評審（報名簽名）：報名、取消、點將要玩家自己的對局金鑰簽名（cup-key.js 的 verifyReq）。另外：
     ① 金鑰要跟他在線狀態裡的一樣（有的話）；② 這一屆第一次驗過的金鑰就綁在他的代號上（X.pk），之後換金鑰不收；
     ③ at 要在 10 分鐘內、而且比他上一則受理的新（X.reqAt），重放舊的（例如舊的「取消報名」）不收。驗不過的記在 REQBAD，不受理 */
  const REQBAD = { n: 0, why: {} }; let reqLogAt = 0;
  function reqBad(x, why) {
    REQBAD.n++; REQBAD.why[why] = (REQBAD.why[why] || 0) + 1;
    if (Date.now() - reqLogAt > 5000) { reqLogAt = Date.now(); log(`千秋盃：不受理 ${String(x && x.id || "?").slice(0, 40)} 的${x && x.t === "reg" ? "報名" : x && x.t === "ck" ? "點將" : x && x.t === "unreg" ? "取消報名" : "請求"}（${why}；累計 ${REQBAD.n} 則）`) }
  }
  function onReq(msg) {
    let x; try { x = JSON.parse(msg) } catch (e) { return } if (!x || !S || x.wk !== S.wk || typeof x.id !== "string" || x.id.length > 40 || !isHuman(x.id)) return;
    if (!["reg", "unreg", "ck"].includes(x.t)) return;
    const v = CK.verifyReq(ROOT, x); if (!v.ok) return reqBad(x, v.why);
    if (Math.abs(Date.now() - (+x.at || 0)) > 10 * MIN) return reqBad(x, "時間不對（超過 10 分鐘，可能是重放）");
    const pp = people[x.id]; if (pp && typeof pp.pk === "string" && pp.pk && pp.pk !== x.pk) return reqBad(x, "金鑰跟他在線狀態裡的不一樣");
    X.pk = X.pk || {}; X.reqAt = X.reqAt || {};
    if (X.pk[x.id] && X.pk[x.id] !== x.pk) return reqBad(x, "金鑰跟這一屆第一次報名時的不一樣");
    if (+x.at <= (X.reqAt[x.id] || 0)) return reqBad(x, "重放（不比上一則新）");
    X.pk[x.id] = x.pk; X.reqAt[x.id] = +x.at;
    if (banned(x.id)) { const k = S.reg.findIndex(r => r.id === x.id); if (k >= 0 && S.ph === "reg") { S.reg.splice(k, 1); publish() } log(`千秋盃：停權名單上的 ${x.id} 想${x.t === "reg" ? "報名" : x.t === "ck" ? "報到" : "取消報名"}，不受理`); return }   /* 回饋 852 */
    const name = String(x.name || "").slice(0, 16) || "棋友" + x.id.slice(0, 4), pts = Math.max(0, Math.min(3000, +x.pts || 0));
    const i = S.reg.findIndex(r => r.id === x.id), now = Date.now();
    if (x.t === "reg" && S.ph === "reg") { if (i < 0) { S.reg.push({ id: x.id, name, pts, at: now }); log(`千秋盃：${name} 報名（第 ${S.reg.length} 位）`) } else { S.reg[i].name = name; S.reg[i].pts = pts } publish() }
    else if (x.t === "unreg" && S.ph === "reg" && i >= 0) { S.reg.splice(i, 1); log(`千秋盃：${name} 取消報名`); publish() }
    else if (x.t === "ck" && S.ph === "ck" && i >= 0 && !S.ck.includes(x.id)) { S.ck.push(x.id); log(`千秋盃：${name} 點將（報到）`); publish() }
  }

  // ---------- 排籤：報到的真人照報名順序取前 16 位，空位由程度接近的虛擬棋客補上 ----------
  const botById = id => BOTS.find(b => b.id === id);
  const pinfo = p => ({ id: p.id, name: p.name, pts: p.pts || 0, bot: !!p.bot });
  function draw() {
    const hum = S.reg.filter(r => S.ck.includes(r.id)).slice(0, 16);
    if (!hum.length) { S.ph = "off"; S.why = "這一週沒有人點將（報到），休賽一週，下週見！"; log("千秋盃：沒有真人報到，休賽"); publish(); return }
    S.practice = hum.length < 2;
    const ps = hum.map(r => r.pts).sort((a, b) => a - b), med = ps[Math.floor(ps.length / 2)];
    const pool = BOTS.slice().sort((a, b) => (X.lastBots.includes(a.id) - X.lastBots.includes(b.id)) || (Math.abs(a.d.pts - med) - Math.abs(b.d.pts - med)));
    const bots = pool.slice(0, 16 - hum.length);
    for (const b of bots) { b.cupBusy = true; if (!b.on) b.connect() }
    X.lastBots = bots.map(b => b.id);
    const champ = HALL.list[0] && HALL.list[0].id;
    const all = [...hum.map(r => ({ id: r.id, name: r.name, pts: r.pts, bot: false })), ...bots.map(b => ({ id: b.id, name: b.name, pts: b.d.pts, bot: true }))]
      .sort((a, b) => (b.id === champ) - (a.id === champ) || b.pts - a.pts);
    const P = SEED_POS.map(seed => ({ ...all[seed - 1], seed }));
    S.m = {}; S.order = [];
    const mk = (id, r, i, a, b) => { S.m[id] = { id, r, i, a, b, g: [], sc: [0, 0], st: "wait", w: null, why: "", gid: null, done: 0 }; S.order.push(id) };
    for (let i = 0; i < 8; i++) mk(`1-${i}`, 1, i, P[2 * i], P[2 * i + 1]);
    for (let i = 0; i < 4; i++) mk(`2-${i}`, 2, i, null, null);
    for (let i = 0; i < 2; i++) mk(`3-${i}`, 3, i, null, null);
    mk("4-0", 4, 0, null, null); mk("5-0", 5, 0, null, null);
    S.ph = "play"; log(`千秋盃：排好籤表（真人 ${hum.length} 位、虛擬棋客 ${bots.length} 位${S.practice ? "，闖擂練習" : ""}）`); publish()
  }

  // ---------- 開一盤 ----------
  const roundAt = r => FAST ? S.t.r[0] : S.t.r[Math.min(3, r - 1)];
  function feeders(m) { if (m.r === 1) return []; if (m.r === 5) return [S.m["3-0"], S.m["3-1"]]; return [S.m[`${m.r - 1}-${2 * m.i}`], S.m[`${m.r - 1}-${2 * m.i + 1}`]] }
  function startGame(m, tb) {
    const now = Date.now(), k = m.g.length, last = m.g[k - 1];
    let red, black;
    if (tb && last) { red = last.red === m.a.id ? m.b : m.a; black = red === m.a ? m.b : m.a }   // 加賽：正局拿黑的這盤拿紅
    else if (m.r === 4 && k === 1 && last) { red = last.red === m.a.id ? m.b : m.a; black = red === m.a ? m.b : m.a }   // 決賽第二盤：交換紅黑
    else { const ra = X.reds[m.a.id] || 0, rb = X.reds[m.b.id] || 0; red = ra < rb ? m.a : rb < ra ? m.b : Math.random() < .5 ? m.a : m.b; black = red === m.a ? m.b : m.a }
    X.reds[red.id] = (X.reds[red.id] || 0) + 1;
    const gid = "cup" + hex(6) + now.toString(36), clk = tb ? { r: TC.tb[0], b: TC.tb[1] } : { r: TC.m * MIN, b: TC.m * MIN };
    /* 評比第 14 輪 F2：雙方報名時驗過、綁在代號上的公開金鑰（X.pk）寫進開局狀態，整份蓋裁判台的章＝「裁判台認證」的金鑰；App 拿它驗千秋盃連線同步頻道（k）的簽名。虛擬棋客沒有金鑰就不寫 */
    const kp = p => X.pk && typeof X.pk[p.id] === "string" && CK_PK.test(X.pk[p.id]) ? { pk: X.pk[p.id] } : {};
    const G = { rules: C.REP_RULES.id, gid, id: new Date(now).toISOString().replace(/[:.]/g, "-").slice(0, 19), rev: 1, red: { id: red.id, name: red.name, pts: red.pts, ...kp(red) }, black: { id: black.id, name: black.name, pts: black.pts, ...kp(black) },
      moves: [], result: null, draw: null, at: now, tc: tb ? 5 : TC.m, inc: tb ? 0 : TC.inc, clk, tk: now, tkN: 0, cup: { wk: S.wk, m: m.id, g: k, tb: !!tb, rn: ROUND_NAME[m.r], fast: FAST || undefined } };
    X.games[gid] = { G, arrN: 0, arrT: now, t0: now, m: m.id };
    m.g.push({ gid, red: red.id, black: black.id, tb: !!tb, res: null, why: "" }); m.gid = gid; m.st = "live"; m.t0 = m.t0 || now;
    cli.sub([`${ROOT}/g/${gid}/s`]); pubGame(G);
    for (const p of [red, black]) if (p.bot) { const b = botById(p.id); if (b) b.cupEnter(gid) }
    log(`千秋盃：${ROUND_NAME[m.r]}${tb ? "（加賽）" : ""} 開打 ${red.name}（紅）對 ${black.name}（黑）`); publish()
  }
  /* 第 9 輪評審：裁判台發的對局狀態（開局、改回不合法的、規則判決、判超時、棄擂）都蓋裁判台的章 hs；App 第一次看到這盤千秋盃、或收到「棄擂」判決時要驗 */
  const pubGame = G => cli && cli.up && cli.pub(`${ROOT}/g/${G.gid}/s`, JSON.stringify(CK.sealGame(KEY, ROOT, G)), true);

  // ---------- 重播棋步：合法才採用；結果站得住才記 ----------
  function replay(moves) {
    const S0 = { moves: [] }; C.stateRebuild(S0);
    for (const mv of moves) { if (!Array.isArray(mv)) return null; const [f, t] = mv; if (!C.legal(S0.board, S0.turn).some(([a, b]) => a === f && b === t)) return null; C.stateApply(S0, f, t) }
    return S0
  }
  function onGame(gid, msg) {
    const T = X && X.games[gid]; if (!T || !msg) return; let x; try { x = JSON.parse(msg) } catch (e) { return }
    if (!x || x.gid !== gid || x.rules !== T.G.rules || !(x.rev > T.G.rev)) return;
    /* 第 14 輪 F2：雙方的公開金鑰（裁判台認證的）也不能被換掉或拿掉 */
    const okIds = x.red && x.black && x.red.id === T.G.red.id && x.black.id === T.G.black.id && x.cup && x.cup.m === T.G.cup.m && (x.red.pk || null) === (T.G.red.pk || null) && (x.black.pk || null) === (T.G.black.pk || null);
    const st = okIds && Array.isArray(x.moves) ? replay(x.moves) : null;
    const pre = T.G.moves, prefix = st && pre.every((mv, i) => i >= x.moves.length || (x.moves[i][0] === mv[0] && x.moves[i][1] === mv[1]));
    const fake = !!(x.result && x.result.forfeit);   /* 第 9 輪評審：「棄擂」只有裁判台自己判（setRes），從網路上收到的一律當成不合法 */
    if (!st || !prefix || fake || x.moves.length < pre.length || T.G.result) { if (!T.G.result || !st) { const n = { ...T.G, rev: x.rev + 1, at: Date.now() }; T.G = n; pubGame(n); log(`千秋盃：${gid} 收到不合法的對局狀態，改回原本的`) } return }
    if (x.moves.length !== T.arrN) { T.arrN = x.moves.length; T.arrT = Date.now() }
    T.G = x;
    if (x.result) {
      const j = C.judgeState(st);
      if (j && x.result.w !== j.w && !x.result.timeout) { const n = { ...x, result: j, rev: x.rev + 1, at: Date.now() }; T.G = n; pubGame(n) }   // 規則判得出來的以規則為準
      gameOver(gid)
    }
  }
  function setRes(gid, r) { const T = X.games[gid]; const n = { ...T.G, result: r, draw: null, rev: T.G.rev + 1, at: Date.now() }; T.G = n; pubGame(n); gameOver(gid) }

  // ---------- 時間到、棄擂（由裁判台判，不靠手機） ----------
  const present = (id, gid) => { const b = botById(id); if (b) return !!(b.on && b.cli && b.cli.up); const x = people[id]; return !!(alive(x) && x.gid === gid) };
  function clockTick() {
    for (const gid of Object.keys(X.games)) {
      const T = X.games[gid], G = T.G; if (G.result) continue;
      const tm = G.moves.length % 2 ? "b" : "r", left = G.clk[tm] - (Date.now() - T.arrT), wait = Date.now() - T.arrT;
      if (left < -GRACE) { setRes(gid, { w: opp(tm), timeout: true, why: PL[tm] + "時間用完，超時判負" }); continue }
      if (wait > NOSHOW) {
        const tid = tm === "r" ? G.red.id : G.black.id, oid = tm === "r" ? G.black.id : G.red.id;
        if (!present(tid, gid)) {
          if (!G.moves.length && !present(oid, gid)) setRes(gid, { w: null, forfeit: true, both: true, timeout: true, why: "雙方都沒有入座，一起棄擂" });
          else setRes(gid, { w: opp(tm), forfeit: true, timeout: true, why: PL[tm] + "沒有入座，棄擂" })
        }
      }
    }
  }

  // ---------- 一盤結束 → 這一場的勝負 ----------
  function gameOver(gid) {
    const T = X.games[gid]; if (!T || T.done) return; T.done = true; const G = T.G, m = S.m[T.m]; if (!m) return;
    const g = m.g.find(z => z.gid === gid); const r = G.result; g.res = r.w || (r.both ? "x" : "d"); g.why = r.why || ""; g.n = G.moves.length;
    const wid = r.w ? (r.w === "r" ? G.red.id : G.black.id) : null;
    log(`千秋盃：${G.red.name} 對 ${G.black.name} → ${r.w ? (r.w === "r" ? G.red.name : G.black.name) + " 勝" : r.both ? "雙方棄擂" : "和棋"}（${r.why || ""}）`);
    setTimeout(() => { if (cli && cli.up) cli.unsub([`${ROOT}/g/${gid}/s`]) }, 5000);
    for (const id of [G.red.id, G.black.id]) { const b = botById(id); if (b && b.cur && b.cur.gid === gid) setTimeout(() => b.leave(), 20000) }
    if (r.both) return finish(m, null, "雙方都沒有入座，一起出局");
    if (g.tb) return finish(m, wid || G.black.id, wid ? "" : "加賽和棋，黑方勝");
    if (m.r === 4) {   // 決賽：紅黑各一盤
      if (wid) m.sc[wid === m.a.id ? 0 : 1] += 1; else { m.sc[0] += .5; m.sc[1] += .5 }
      if (m.g.filter(z => !z.tb).length < 2) { m.st = "next"; m.nextAt = Date.now() + TBGAP; publish(); return }
      if (m.sc[0] !== m.sc[1]) return finish(m, m.sc[0] > m.sc[1] ? m.a.id : m.b.id, "");
      m.st = "tb"; m.nextAt = Date.now() + TBGAP; publish(); return
    }
    if (wid) { m.sc[wid === m.a.id ? 0 : 1] = 1; return finish(m, wid, r.forfeit ? "對手棄擂" : "") }
    m.st = "tb"; m.nextAt = Date.now() + TBGAP; publish()   // 和棋：加賽
  }
  function finish(m, wid, why) {
    m.st = "done"; m.w = wid; m.why = why || ""; m.done = Date.now(); m.gid = null;
    const W = wid ? (wid === m.a.id ? m.a : m.b) : null, L = W ? (W === m.a ? m.b : m.a) : null;
    const put = (id, p) => { const x = S.m[id]; if (!x) return; if (m.i % 2 === 0) x.a = p; else x.b = p };
    if (m.r <= 2) put(`${m.r + 1}-${m.i >> 1}`, W || { none: true });
    if (m.r === 3) { put("4-0", W || { none: true }); put("5-0", L || { none: true }) }
    // 被淘汰的虛擬棋客：比賽結束前不再被派去做別的事（還在等季軍戰的例外）
    if (L && L.bot && !(m.r === 3)) { const b = botById(L.id); if (b) b.cupBusy = false }
    if (m.r === 4 || m.r === 5) { const done4 = S.m["4-0"].st === "done", done5 = S.m["5-0"].st === "done"; if (done4 && done5) return wrapUp() }
    publish()
  }

  // ---------- 名次、頒獎、擂主碑 ----------
  function wrapUp() {
    const P = {}, F = S.m["4-0"], T3 = S.m["5-0"];
    const loserOf = m => m.w ? (m.w === m.a.id ? m.b : m.a) : null;
    if (F.w) { P[F.w] = 1; const l = loserOf(F); if (l && l.id) P[l.id] = 2 }
    if (T3.w) { P[T3.w] = 3; const l = loserOf(T3); if (l && l.id) P[l.id] = 4 }
    for (const id of S.order) { const m = S.m[id], l = loserOf(m); if (!l || !l.id || P[l.id]) continue; if (m.r === 2) P[l.id] = 8; if (m.r === 1) P[l.id] = 16 }
    for (const id of S.order) { const m = S.m[id]; for (const p of [m.a, m.b]) if (p && p.id && !P[p.id]) P[p.id] = 16 }
    S.place = P; S.ph = "done";
    const ch = F.w ? (F.w === F.a.id ? F.a : F.b) : null; S.champ = ch ? pinfo(ch) : null;
    if (ch && !S.fast) { const ru = loserOf(F); HALL.list.unshift({ wk: S.wk, ed: S.ed, id: ch.id, name: ch.name, bot: !!ch.bot, ru: ru && ru.id ? { id: ru.id, name: ru.name, bot: !!ru.bot } : null, practice: !!S.practice, at: Date.now() }); HALL.list = HALL.list.slice(0, 200); fs.writeFileSync(HALLF, JSON.stringify(HALL)) }
    if (ch && S.fast) { HALL.list.unshift({ wk: S.wk, ed: 0, id: ch.id, name: ch.name, bot: !!ch.bot, ru: null, practice: !!S.practice, test: true, at: Date.now() }); fs.writeFileSync(HALLF, JSON.stringify(HALL)) }
    for (const b of BOTS) b.cupBusy = false;
    log(`千秋盃：比賽結束，擂主是 ${ch ? ch.name : "（從缺）"}`); publish(); publishHall()
  }

  // ---------- 每 2 秒：換階段、開下一盤、判時間 ----------
  function tick() {
    if (!cli || !cli.up) return; const now = Date.now();
    if (!S || (!FAST && String(weekIdx(now)) !== S.wk && (S.ph === "done" || S.ph === "off" || now > S.t.r[3] + 6 * H))) newWeek(now);
    if (FAST && !S) newWeek(now);
    if (!S.fast !== !FAST) newWeek(now);
    if (S.ph === "reg" && now >= S.t.reg1) { S.ph = "wait"; publish() }
    if (S.ph === "wait" && now >= S.t.ck0) { S.ph = "ck"; log("千秋盃：開始點將（報到）"); publish() }
    if (S.ph === "ck" && now >= S.t.ck1) draw();
    if (S.ph !== "play") return;
    clockTick();
    for (const id of S.order) {
      const m = S.m[id];
      if (m.st === "wait") {
        if (!m.a || !m.b) continue;
        if (m.a.none || m.b.none) { const w = m.a.none ? (m.b.none ? null : m.b) : m.a; finish(m, w && w.id, w ? "對手從缺，輪空直入" : "雙方從缺"); continue }
        const fd = feeders(m).map(f => f.done || 0), at = Math.max(roundAt(m.r), ...fd.map(t => t + GAP));
        if (now >= at) startGame(m, false)
      } else if ((m.st === "tb" || m.st === "next") && now >= (m.nextAt || 0)) startGame(m, m.st === "tb")
    }
  }

  // ---------- 連線 ----------
  function connect() {
    const c = mqtt(URL, { clientId: "xqcup" + hex(8), keepalive: 30 });
    c.onup = () => { cli = c; c.sub([`${ROOT}/cup/req`, ...Object.keys(X && X.games || {}).filter(g => !X.games[g].done).map(g => `${ROOT}/g/${g}/s`)]); log("千秋盃裁判台連上大廳"); if (S) publish(); publishHall() };
    c.onmsg = (topic, msg) => { const p = topic.slice(ROOT.length + 1).split("/"); if (p[0] === "cup" && p[1] === "req") return onReq(msg); if (p[0] === "g" && p[2] === "s") return onGame(p[1], msg) };
    c.ondown = () => { cli = null; setTimeout(connect, 3000) }
  }
  if (FAST) { S = null; X = null }
  connect();
  /* ctx.noTimers：只給測試用（測試自己呼叫 tick） */
  if (!ctx.noTimers) {
    setInterval(() => { try { tick() } catch (e) { log("千秋盃出錯：", e.stack || e.message) } }, 2000);
    setInterval(() => { if (S) publish(); publishHall() }, 30 * MIN);   /* 每 30 分鐘重發一次（公開伺服器偶爾會清掉保留訊息）。回饋 854：原本每分鐘，每支手機一直收、比賽後一則約 10 KB，改成 30 分鐘；有變化時本來就會馬上發。第 9 輪評審：App 不收太久沒更新的公告，擂主碑也一起重發 */
  }
  log(`千秋盃裁判台啟動${FAST ? "（快速測試：現在開一屆）" : ""}`);
  /* 給測試用的把手（lobby-bots.js 不用） */
  return { tick, onReq, publish, publishHall, startGame, setRes, state: () => S, priv: () => X, reqBad: () => REQBAD };
};
