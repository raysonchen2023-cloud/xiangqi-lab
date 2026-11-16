/* 象棋千秋・黑洞超展開引擎（XQVar）
   走法完全照標準中國象棋（蹩馬腿、塞象眼、炮架、將帥照面、兵過河可橫走），但允許任何陣容（例如兵全換傌、卒全換車）。
   Pikafish 拒絕非標準陣容（「WHITE has more than 2 knights」），所以黑洞超展開另用這支。

   檔案分三層：
     1. 規則層 Position：棋盤、走法生成、走子／退子、將軍判定、雜湊、評估。之後臺灣暗棋另寫一個同介面的類別即可共用搜尋層。
     2. 搜尋層 Searcher：alpha-beta（PVS）、迭代加深、置換表、靜態搜尋（吃子）、走法排序（置換表著、MVV-LVA、殺手著、歷史表）、
        空著裁剪、延後減深、將軍延伸。只透過下面「規則層介面」使用局面，不認得象棋本身。
     3. 對外 API：FEN 進出、合法著法、最佳著（level 1～8、weaken 降強度）、將死／困斃、自由擺棋規則（validateSetup、genSetup、
        dailySetup、charSetup）、對局物件 Game。

   規則層介面（Searcher 只用這些；暗棋的局面類別也要提供）：
     pos.side（0 紅 1 黑）、pos.lo／pos.hi（64 位元雜湊的兩半）、pos.gen(out,off,capsOnly)→著法數、pos.make(m)→合法與否（不合法會自己退回）、
     pos.unmake()、pos.makeNull()／pos.unmakeNull()、pos.inCheck(side)、pos.isRepetition()、pos.evaluate()（走方觀點）、
     pos.hasBig(side)（有沒有能做空著裁剪的大子）、pos.capVal(m)（吃子排序分數，不吃子回 -1）、pos.lastCap()（上一步吃到的子）。
     暗棋的翻子是機率節點：之後在 Searcher.negamax 的著法迴圈加 expectimax 分支，局面類別提供 pos.chanceOutcomes(m)（[{p,機率}]）即可，
     其餘介面不變。

   座標：跟 App（site/core.js）一樣，棋盤是 90 格陣列，索引 = 列×9＋行，第 0 列在最上面（黑方底線），紅方在下面。
   著法字串用 ICCS（例如 "h2e2"），a～i 是行、0～9 是紅方觀點的橫線（0＝紅方底線）。FEN 用 RNBAKCP（大寫紅、小寫黑），
   後面接 " w"（紅走）或 " b"（黑走）；讀 FEN 時也認 H（馬）、E（象）。
   瀏覽器、Node、Web Worker 都能用：同時掛 globalThis.XQVar 與 module.exports。 */
(function (root, factory) {
  var X = factory();
  if (typeof module === "object" && module.exports) module.exports = X;
  if (root) root.XQVar = X;
})(typeof globalThis !== "undefined" ? globalThis : (typeof self !== "undefined" ? self : this), function () {
  "use strict";

  /* ===================== 共用小工具 ===================== */
  function hashStr(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) {
    var a = seed >>> 0;
    return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function gauss(R) { var u = 0, v = 0; while (u === 0) u = R(); v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  var now = (typeof performance !== "undefined" && performance.now) ? function () { return performance.now(); } : function () { return Date.now(); };

  /* ===================== 棋子與棋盤表 ===================== */
  /* 棋子代碼：紅 1～7、黑 9～15（＝8＋種類）；種類 K1 A2 B3 N4 R5 C6 P7；p>>3 是哪一方（0 紅 1 黑） */
  var K = 1, A = 2, B = 3, N = 4, R = 5, C = 6, P = 7;
  var LET = "?KABNRCP";
  var T_OF = { K: 1, A: 2, B: 3, E: 3, N: 4, H: 4, R: 5, C: 6, P: 7 };
  var NAMES = { r: { K: "帥", A: "仕", B: "相", N: "傌", R: "俥", C: "炮", P: "兵" }, b: { K: "將", A: "士", B: "象", N: "馬", R: "車", C: "砲", P: "卒" } };
  var ROW = new Int8Array(90), COL = new Int8Array(90), MIR = new Int8Array(90), FOLD = new Int8Array(90);
  for (var s0 = 0; s0 < 90; s0++) { ROW[s0] = (s0 / 9) | 0; COL[s0] = s0 % 9; MIR[s0] = (9 - ROW[s0]) * 9 + COL[s0]; FOLD[s0] = ROW[s0] * 5 + (COL[s0] <= 4 ? COL[s0] : 8 - COL[s0]); }
  function inb(r, c) { return r >= 0 && r < 10 && c >= 0 && c < 9; }
  function palace(side, r, c) { return c >= 3 && c <= 5 && (side === 0 ? r >= 7 && r <= 9 : r >= 0 && r <= 2); }
  function ownHalf(side, r) { return side === 0 ? r >= 5 : r <= 4; }
  var DR = [-1, 1, 0, 0], DC = [0, 0, -1, 1];
  var RAY = [];
  var NMOV = [], NATK = [];
  var KMOV = [[], []], AMOV = [[], []], BMOV = [[], []], PMOV = [[], []], PATK = [[], []];
  var NJ = [[-2, -1, -1, 0], [-2, 1, -1, 0], [2, -1, 1, 0], [2, 1, 1, 0], [-1, -2, 0, -1], [1, -2, 0, -1], [-1, 2, 0, 1], [1, 2, 0, 1]];
  (function buildTables() {
    var sq, d, i, sd;
    for (sq = 0; sq < 90; sq++) { NATK.push([]); PATK[0].push([]); PATK[1].push([]); }
    for (sq = 0; sq < 90; sq++) {
      var r = ROW[sq], c = COL[sq];
      for (d = 0; d < 4; d++) { var ray = [], rr = r + DR[d], cc = c + DC[d]; while (inb(rr, cc)) { ray.push(rr * 9 + cc); rr += DR[d]; cc += DC[d]; } RAY.push(Int8Array.from(ray)); }
      var nm = [];
      for (i = 0; i < 8; i++) { var j = NJ[i], tr = r + j[0], tc = c + j[1]; if (!inb(tr, tc)) continue; var to = tr * 9 + tc, leg = (r + j[2]) * 9 + c + j[3]; nm.push(to, leg); NATK[to].push(sq, leg); }
      NMOV.push(Int8Array.from(nm));
      for (sd = 0; sd < 2; sd++) {
        var km = [], am = [], bm = [], pm = [];
        for (d = 0; d < 4; d++) { var kr = r + DR[d], kc = c + DC[d]; if (inb(kr, kc) && palace(sd, kr, kc)) km.push(kr * 9 + kc); }
        for (var a = -1; a <= 1; a += 2) for (var b = -1; b <= 1; b += 2) {
          if (inb(r + a, c + b) && palace(sd, r + a, c + b)) am.push((r + a) * 9 + c + b);
          var er = r + 2 * a, ec = c + 2 * b; if (inb(er, ec) && ownHalf(sd, er)) bm.push(er * 9 + ec, (r + a) * 9 + c + b);
        }
        var f = sd === 0 ? -1 : 1;
        if (inb(r + f, c)) pm.push((r + f) * 9 + c);
        if (sd === 0 ? r <= 4 : r >= 5) { if (c > 0) pm.push(sq - 1); if (c < 8) pm.push(sq + 1); }
        KMOV[sd].push(Int8Array.from(km)); AMOV[sd].push(Int8Array.from(am)); BMOV[sd].push(Int8Array.from(bm)); PMOV[sd].push(Int8Array.from(pm));
        for (i = 0; i < pm.length; i++) PATK[sd][pm[i]].push(sq);
      }
    }
    for (sq = 0; sq < 90; sq++) { NATK[sq] = Int8Array.from(NATK[sq]); PATK[0][sq] = Int8Array.from(PATK[0][sq]); PATK[1][sq] = Int8Array.from(PATK[1][sq]); }
  })();

  /* Zobrist 雜湊（固定種子，所有裝置一樣） */
  var ZL = new Int32Array(16 * 90), ZH = new Int32Array(16 * 90), ZSL, ZSH;
  (function () { var Rz = rng(20261113); for (var i = 0; i < 16 * 90; i++) { ZL[i] = (Rz() * 4294967296) | 0; ZH[i] = (Rz() * 4294967296) | 0; } ZSL = (Rz() * 4294967296) | 0; ZSH = (Rz() * 4294967296) | 0; })();

  /* ===================== 評估權重 =====================
     評估是線性的：分數 = Σ 權重 × 特徵（紅方觀點，單位厘兵，兵 ≈ 100），所以可以用 Texel 方法（邏輯迴歸）直接調。
     權重向量配置：
       MAT  6 個：仕 相 傌 俥 炮 兵 的子力
       PST  7×50：每種棋子的位置分，從該方觀點看，左右對稱折半（10 列 × 5 行；第 0 列是對方底線）
       OCC  4 個：傌 俥 炮 兵 × 盤面擁擠度（(總子數−16)/16），炮在子多時強、傌在子少時強
       MOB  3 個：傌 俥 炮 的機動性（能走的格數）
       CEMP 1 個：空頭炮（炮跟對方將帥同一直線，中間沒子）
       TEMPO 1 個：輪到誰走 */
  var MAT0 = 0, PST0 = 6, OCC0 = 356, MOB0 = 360, CEMP0 = 363, TEMPO0 = 364, NW = 365;
  var OCC_T = [N, R, C, P], MOB_T = [N, R, C];
  function rows(a) { var o = []; for (var i = 0; i < a.length; i++) o.push.apply(o, a[i]); return o; }
  var DEFAULT_W = {
    format: "xqvar-weights", version: 1, units: "厘兵（兵≈100）",
    mat: { A: 200, B: 200, N: 400, R: 900, C: 450, P: 100 },
    pst: {
      K: rows([[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, -25, -20], [0, 0, 0, -15, -10], [0, 0, 0, -5, 0]]),
      A: rows([[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 5], [0, 0, 0, 0, 0]]),
      B: rows([[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, -5, 0, 0], [0, 0, 0, 0, 0], [-5, 0, 0, 0, 5], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]]),
      N: rows([[0, -10, 0, 0, 0], [0, 20, 30, 40, 20], [10, 30, 40, 50, 40], [10, 30, 40, 40, 40], [0, 20, 30, 30, 30], [0, 10, 20, 20, 20], [0, 10, 15, 10, 10], [-10, 5, 10, 5, 0], [-20, -10, 0, 0, -20], [-30, -20, -10, -10, -10]]),
      R: rows([[10, 10, 10, 20, 20], [20, 20, 20, 30, 30], [10, 20, 20, 25, 25], [10, 15, 15, 20, 20], [10, 15, 15, 15, 15], [5, 10, 10, 10, 10], [0, 5, 5, 5, 5], [-5, 5, 5, 5, 5], [-5, 5, 0, 5, 0], [-10, 0, 0, 5, 0]]),
      C: rows([[20, 10, 0, -10, -10], [10, 10, 0, -5, -5], [5, 5, 5, 10, 20], [0, 5, 5, 5, 10], [0, 5, 5, 5, 10], [0, 5, 5, 5, 10], [0, 5, 5, 5, 10], [0, 5, 5, 10, 20], [0, 0, 0, 5, 10], [0, 0, 0, 0, 5]]),
      P: rows([[10, 15, 20, 30, 35], [60, 80, 100, 120, 130], [60, 80, 100, 120, 130], [50, 70, 80, 100, 100], [40, 50, 60, 70, 70], [5, 0, 10, 0, 15], [0, 0, 5, 0, 10], [-10, -10, -10, -10, -10], [-10, -10, -10, -10, -10], [-10, -10, -10, -10, -10]])
    },
    occ: { N: -30, R: 0, C: 60, P: 0 },
    mob: { N: 8, R: 4, C: 2 },
    cempty: 60, tempo: 10
  };
  function weightsToVec(o) {
    var v = new Float64Array(NW), i, t;
    var m = o.mat || {}, ps = o.pst || {}, oc = o.occ || {}, mb = o.mob || {};
    var MT = "ABNRCP";
    for (i = 0; i < 6; i++) v[MAT0 + i] = +m[MT[i]] || 0;
    for (t = 1; t <= 7; t++) { var a = ps[LET[t]] || []; for (i = 0; i < 50; i++) v[PST0 + (t - 1) * 50 + i] = +a[i] || 0; }
    for (i = 0; i < 4; i++) v[OCC0 + i] = +oc[LET[OCC_T[i]]] || 0;
    for (i = 0; i < 3; i++) v[MOB0 + i] = +mb[LET[MOB_T[i]]] || 0;
    v[CEMP0] = +o.cempty || 0; v[TEMPO0] = +o.tempo || 0;
    return v;
  }
  function vecToWeights(v, meta) {
    var r1 = function (x) { return Math.round(x * 10) / 10; };
    var o = { format: "xqvar-weights", version: 1, units: "厘兵（兵≈100）", mat: {}, pst: {}, occ: {}, mob: {}, cempty: r1(v[CEMP0]), tempo: r1(v[TEMPO0]) };
    var MT = "ABNRCP", i, t;
    for (i = 0; i < 6; i++) o.mat[MT[i]] = r1(v[MAT0 + i]);
    for (t = 1; t <= 7; t++) { var a = []; for (i = 0; i < 50; i++) a.push(r1(v[PST0 + (t - 1) * 50 + i])); o.pst[LET[t]] = a; }
    for (i = 0; i < 4; i++) o.occ[LET[OCC_T[i]]] = r1(v[OCC0 + i]);
    for (i = 0; i < 3; i++) o.mob[LET[MOB_T[i]]] = r1(v[MOB0 + i]);
    if (meta) o.meta = meta;
    return o;
  }
  /* 編譯後的權重（引擎實際用的） */
  var PSQ = new Float64Array(16 * 90), EW = {};
  var CUR_W = null, CUR_VEC = null;
  function setWeights(o) {
    var src = o || DEFAULT_W;
    if (src.format && src.format !== "xqvar-weights") throw new Error("權重檔格式不對：" + src.format);
    var v = weightsToVec(src);
    for (var t = 1; t <= 7; t++) for (var sq = 0; sq < 90; sq++) {
      var val = (t >= 2 ? v[MAT0 + t - 2] : 0) + v[PST0 + (t - 1) * 50 + FOLD[sq]];
      PSQ[t * 90 + sq] = val; PSQ[(t + 8) * 90 + MIR[sq]] = -val;
    }
    EW.occN = v[OCC0]; EW.occR = v[OCC0 + 1]; EW.occC = v[OCC0 + 2]; EW.occP = v[OCC0 + 3];
    EW.mobN = v[MOB0]; EW.mobR = v[MOB0 + 1]; EW.mobC = v[MOB0 + 2]; EW.cemp = v[CEMP0]; EW.tempo = v[TEMPO0];
    CUR_W = src; CUR_VEC = v;
    return true;
  }
  setWeights(DEFAULT_W);

  /* ===================== 規則層：Position ===================== */
  var MAXH = 4096;
  function Position() {
    this.b = new Int8Array(90); this.side = 0; this.ks = new Int16Array([-1, -1]);
    this.lo = 0; this.hi = 0; this.psq = 0; this.cnt = new Int16Array(16); this.total = 0;
    this.hLo = new Int32Array(MAXH); this.hHi = new Int32Array(MAXH); this.hIrr = new Int32Array(MAXH); this.hn = 0;
    this.uMove = new Int32Array(MAXH); this.uCap = new Int8Array(MAXH); this.uPsq = new Float64Array(MAXH); this.un = 0;
    this.startFen = null;
  }
  Position.prototype.clear = function () { this.b.fill(0); this.side = 0; this.ks[0] = this.ks[1] = -1; this.cnt.fill(0); this.total = 0; this.hn = 0; this.un = 0; };
  /* 從頭算雜湊、子力位置分、子數（讀 FEN 後呼叫） */
  Position.prototype.rehash = function () {
    var lo = 0, hi = 0, ps = 0, b = this.b; this.cnt.fill(0); this.total = 0; this.ks[0] = this.ks[1] = -1;
    for (var sq = 0; sq < 90; sq++) { var p = b[sq]; if (!p) continue; lo ^= ZL[p * 90 + sq]; hi ^= ZH[p * 90 + sq]; ps += PSQ[p * 90 + sq]; this.cnt[p]++; this.total++; if ((p & 7) === K) this.ks[p >> 3] = sq; }
    if (this.side) { lo ^= ZSL; hi ^= ZSH; }
    this.lo = lo; this.hi = hi; this.psq = ps;
    this.hn = 1; this.hLo[0] = lo; this.hHi[0] = hi; this.hIrr[0] = 0; this.un = 0;
  };
  /* 換權重後要重算 psq（局面物件不會自己知道） */
  Position.prototype.refreshEval = function () { var ps = 0; for (var sq = 0; sq < 90; sq++) { var p = this.b[sq]; if (p) ps += PSQ[p * 90 + sq]; } this.psq = ps; };
  Position.prototype.clone = function () {
    var q = new Position(); q.b.set(this.b); q.side = this.side; q.ks.set(this.ks); q.lo = this.lo; q.hi = this.hi; q.psq = this.psq; q.cnt.set(this.cnt); q.total = this.total;
    q.hLo.set(this.hLo.subarray(0, this.hn)); q.hHi.set(this.hHi.subarray(0, this.hn)); q.hIrr.set(this.hIrr.subarray(0, this.hn)); q.hn = this.hn;
    q.uMove.set(this.uMove.subarray(0, this.un)); q.uCap.set(this.uCap.subarray(0, this.un)); q.uPsq.set(this.uPsq.subarray(0, this.un)); q.un = this.un;
    q.startFen = this.startFen; return q;
  };
  Position.prototype.gen = function (out, o, caps) {
    var b = this.b, me = this.side, n = o, sq, p, L, i, t, q, d, ray;
    for (sq = 0; sq < 90; sq++) {
      p = b[sq]; if (!p || (p >> 3) !== me) continue;
      switch (p & 7) {
        case K: L = KMOV[me][sq]; for (i = 0; i < L.length; i++) { t = L[i]; q = b[t]; if (q) { if ((q >> 3) !== me) out[n++] = sq | t << 7; } else if (!caps) out[n++] = sq | t << 7; } break;
        case A: L = AMOV[me][sq]; for (i = 0; i < L.length; i++) { t = L[i]; q = b[t]; if (q) { if ((q >> 3) !== me) out[n++] = sq | t << 7; } else if (!caps) out[n++] = sq | t << 7; } break;
        case B: L = BMOV[me][sq]; for (i = 0; i < L.length; i += 2) { if (b[L[i + 1]]) continue; t = L[i]; q = b[t]; if (q) { if ((q >> 3) !== me) out[n++] = sq | t << 7; } else if (!caps) out[n++] = sq | t << 7; } break;
        case N: L = NMOV[sq]; for (i = 0; i < L.length; i += 2) { if (b[L[i + 1]]) continue; t = L[i]; q = b[t]; if (q) { if ((q >> 3) !== me) out[n++] = sq | t << 7; } else if (!caps) out[n++] = sq | t << 7; } break;
        case R:
          for (d = 0; d < 4; d++) { ray = RAY[sq * 4 + d]; for (i = 0; i < ray.length; i++) { t = ray[i]; q = b[t]; if (!q) { if (!caps) out[n++] = sq | t << 7; } else { if ((q >> 3) !== me) out[n++] = sq | t << 7; break; } } }
          break;
        case C:
          for (d = 0; d < 4; d++) {
            ray = RAY[sq * 4 + d]; i = 0;
            for (; i < ray.length; i++) { t = ray[i]; if (b[t]) break; if (!caps) out[n++] = sq | t << 7; }
            for (i++; i < ray.length; i++) { t = ray[i]; q = b[t]; if (q) { if ((q >> 3) !== me) out[n++] = sq | t << 7; break; } }
          }
          break;
        case P: L = PMOV[me][sq]; for (i = 0; i < L.length; i++) { t = L[i]; q = b[t]; if (q) { if ((q >> 3) !== me) out[n++] = sq | t << 7; } else if (!caps) out[n++] = sq | t << 7; } break;
      }
    }
    return n - o;
  };
  /* sq 有沒有被 by 方攻擊（含將帥照面：直線上第一個子是對方將帥） */
  Position.prototype.attacked = function (sq, by) {
    var b = this.b, d, ray, i, q, L;
    var rook = by << 3 | R, can = by << 3 | C, kng = by << 3 | K, kn = by << 3 | N, pw = by << 3 | P;
    for (d = 0; d < 4; d++) {
      ray = RAY[sq * 4 + d];
      for (i = 0; i < ray.length; i++) { q = b[ray[i]]; if (q) { if (q === rook || (q === kng && d < 2)) return true; break; } }
      for (i++; i < ray.length; i++) { q = b[ray[i]]; if (q) { if (q === can) return true; break; } }
    }
    L = NATK[sq]; for (i = 0; i < L.length; i += 2) if (b[L[i]] === kn && !b[L[i + 1]]) return true;
    L = PATK[by][sq]; for (i = 0; i < L.length; i++) if (b[L[i]] === pw) return true;
    return false;
  };
  Position.prototype.inCheck = function (side) { if (side === undefined) side = this.side; var k = this.ks[side]; return k < 0 || this.attacked(k, side ^ 1); };
  Position.prototype.facing = function () { var a = this.ks[0], k = this.ks[1]; if (a < 0 || k < 0 || COL[a] !== COL[k]) return false; for (var i = k + 9; i < a; i += 9) if (this.b[i]) return false; return true; };
  /* 走一步；走完自己被將（或照面）就退回並回 false */
  Position.prototype.make = function (m) {
    var f = m & 127, t = m >> 7, b = this.b, p = b[f], c = b[t], me = this.side;
    this.uMove[this.un] = m; this.uCap[this.un] = c; this.uPsq[this.un] = this.psq; this.un++;
    var lo = this.lo ^ ZL[p * 90 + f] ^ ZL[p * 90 + t] ^ ZSL, hi = this.hi ^ ZH[p * 90 + f] ^ ZH[p * 90 + t] ^ ZSH;
    this.psq += PSQ[p * 90 + t] - PSQ[p * 90 + f];
    if (c) { lo ^= ZL[c * 90 + t]; hi ^= ZH[c * 90 + t]; this.psq -= PSQ[c * 90 + t]; this.cnt[c]--; this.total--; }
    b[t] = p; b[f] = 0; if ((p & 7) === K) this.ks[me] = t;
    this.side = me ^ 1; this.lo = lo; this.hi = hi;
    var hn = this.hn; this.hLo[hn] = lo; this.hHi[hn] = hi; this.hIrr[hn] = c ? hn : this.hIrr[hn - 1]; this.hn = hn + 1;
    if (this.attacked(this.ks[me], me ^ 1)) { this.unmake(); return false; }
    return true;
  };
  Position.prototype.unmake = function () {
    var u = --this.un, m = this.uMove[u], c = this.uCap[u], f = m & 127, t = m >> 7, b = this.b, p = b[t];
    b[f] = p; b[t] = c; this.side ^= 1; if ((p & 7) === K) this.ks[this.side] = f;
    if (c) { this.cnt[c]++; this.total++; }
    this.psq = this.uPsq[u]; this.hn--; this.lo = this.hLo[this.hn - 1]; this.hi = this.hHi[this.hn - 1];
  };
  Position.prototype.makeNull = function () {
    this.uMove[this.un] = 0; this.uCap[this.un] = 0; this.uPsq[this.un] = this.psq; this.un++;
    this.side ^= 1; this.lo ^= ZSL; this.hi ^= ZSH;
    var hn = this.hn; this.hLo[hn] = this.lo; this.hHi[hn] = this.hi; this.hIrr[hn] = hn; this.hn = hn + 1;
  };
  Position.prototype.unmakeNull = function () { this.un--; this.side ^= 1; this.hn--; this.lo = this.hLo[this.hn - 1]; this.hi = this.hHi[this.hn - 1]; };
  Position.prototype.lastCap = function () { return this.un ? this.uCap[this.un - 1] : 0; };
  /* 搜尋路徑或對局裡出現過同一局面（上次吃子以後）：簡化處理＝和棋，不判長將長捉 */
  Position.prototype.isRepetition = function () {
    var n = this.hn - 1, lo = this.hLo[n], hi = this.hHi[n], stop = this.hIrr[n];
    for (var j = n - 2; j >= stop; j -= 2) if (this.hLo[j] === lo && this.hHi[j] === hi) return true;
    return false;
  };
  Position.prototype.repCount = function () {
    var n = this.hn - 1, lo = this.hLo[n], hi = this.hHi[n], stop = this.hIrr[n], k = 1;
    for (var j = n - 2; j >= stop; j -= 2) if (this.hLo[j] === lo && this.hHi[j] === hi) k++;
    return k;
  };
  Position.prototype.pliesNoCap = function () { var n = this.hn - 1; return n - this.hIrr[n]; };
  Position.prototype.hasBig = function (side) { var o = side << 3; return this.cnt[o | N] + this.cnt[o | R] + this.cnt[o | C] > 0; };
  var ORDV = [0, 50, 2, 2, 4, 9, 5, 1, 0, 50, 2, 2, 4, 9, 5, 1];
  Position.prototype.capVal = function (m) { var c = this.b[m >> 7]; if (!c) return -1; return ORDV[c] * 16 - ORDV[this.b[m & 127]]; };
  Position.prototype.legal = function () {
    var buf = new Int32Array(400), n = this.gen(buf, 0, false), out = [];
    for (var i = 0; i < n; i++) if (this.make(buf[i])) { this.unmake(); out.push(buf[i]); }
    return out;
  };
  /* 評估（走方觀點）；跟 features() 算出來的線性和一致（只差最後四捨五入） */
  var MOBT = new Float64Array(4);
  Position.prototype.evaluate = function () {
    var c = this.cnt, s = this.psq;
    var occ = (this.total - 16) / 16;
    s += occ * (EW.occN * (c[4] - c[12]) + EW.occR * (c[5] - c[13]) + EW.occC * (c[6] - c[14]) + EW.occP * (c[7] - c[15]));
    this.mobTerms(MOBT);
    s += EW.mobN * MOBT[0] + EW.mobR * MOBT[1] + EW.mobC * MOBT[2] + EW.cemp * MOBT[3];
    var v = (this.side ? -s : s) + EW.tempo;
    return Math.round(v);
  };
  /* 機動性與空頭炮（紅減黑）：out[0] 傌、out[1] 俥、out[2] 炮 能走的格數，out[3] 空頭炮數 */
  Position.prototype.mobTerms = function (out) {
    var b = this.b, mN = 0, mR = 0, mC = 0, ce = 0, sq, p, t, me, sg, L, i, k, d, ray, q;
    for (sq = 0; sq < 90; sq++) {
      p = b[sq]; if (!p) continue; t = p & 7; if (t < 4 || t === 7) continue; me = p >> 3; sg = me ? -1 : 1;
      if (t === N) { L = NMOV[sq]; k = 0; for (i = 0; i < L.length; i += 2) { if (b[L[i + 1]]) continue; q = b[L[i]]; if (!q || (q >> 3) !== me) k++; } mN += sg * k; continue; }
      k = 0;
      for (d = 0; d < 4; d++) {
        ray = RAY[sq * 4 + d]; i = 0;
        if (t === R) { for (; i < ray.length; i++) { q = b[ray[i]]; if (q) { if ((q >> 3) !== me) k++; break; } k++; } }
        else { for (; i < ray.length; i++) { if (b[ray[i]]) break; k++; } for (i++; i < ray.length; i++) { q = b[ray[i]]; if (q) { if ((q >> 3) !== me) k++; break; } } }
      }
      if (t === R) { mR += sg * k; continue; }
      mC += sg * k;
      var ek = this.ks[me ^ 1];
      if (ek >= 0 && COL[ek] === COL[sq]) { var st = ek > sq ? 9 : -9, clear = true; for (var x = sq + st; x !== ek; x += st) if (b[x]) { clear = false; break; } if (clear) ce += sg; }
    }
    out[0] = mN; out[1] = mR; out[2] = mC; out[3] = ce;
  };
  /* 紅方觀點、不加 tempo、不四捨五入的評估（測試用來對照 features） */
  Position.prototype.evalRed = function () {
    var c = this.cnt, s = this.psq, occ = (this.total - 16) / 16, mt = new Float64Array(4);
    s += occ * (EW.occN * (c[4] - c[12]) + EW.occR * (c[5] - c[13]) + EW.occC * (c[6] - c[14]) + EW.occP * (c[7] - c[15]));
    this.mobTerms(mt);
    return s + EW.mobN * mt[0] + EW.mobR * mt[1] + EW.mobC * mt[2] + EW.cemp * mt[3];
  };
  /* Texel 調參用的特徵（紅方觀點；回傳 [索引陣列, 值陣列]） */
  function features(pos) {
    var f = new Float64Array(NW), b = pos.b, c = pos.cnt, sq, p, t, me, sg, rel;
    for (sq = 0; sq < 90; sq++) {
      p = b[sq]; if (!p) continue; t = p & 7; me = p >> 3; sg = me ? -1 : 1; rel = me ? MIR[sq] : sq;
      if (t >= 2) f[MAT0 + t - 2] += sg;
      f[PST0 + (t - 1) * 50 + FOLD[rel]] += sg;
    }
    var occ = (pos.total - 16) / 16;
    for (var i = 0; i < 4; i++) f[OCC0 + i] = occ * (c[OCC_T[i]] - c[OCC_T[i] + 8]);
    var mt = new Float64Array(4); pos.mobTerms(mt);
    f[MOB0] = mt[0]; f[MOB0 + 1] = mt[1]; f[MOB0 + 2] = mt[2]; f[CEMP0] = mt[3];
    f[TEMPO0] = pos.side ? -1 : 1;
    var I = [], V = [];
    for (var k = 0; k < NW; k++) if (f[k] !== 0) { I.push(k); V.push(f[k]); }
    return [I, V];
  }

  /* ===================== FEN 與座標 ===================== */
  var START = "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR";
  function sqName(q) { return String.fromCharCode(97 + q % 9) + (9 - ((q / 9) | 0)); }
  function parseSq(s) { var c = s.charCodeAt(0) - 97, r = 9 - (+s[1]); if (!(c >= 0 && c < 9 && r >= 0 && r < 10) || s.length !== 2) return -1; return r * 9 + c; }
  function mvName(m) { return sqName(m & 127) + sqName(m >> 7); }
  function parseMv(s) { if (typeof s !== "string" || s.length !== 4) return -1; var f = parseSq(s.slice(0, 2)), t = parseSq(s.slice(2, 4)); if (f < 0 || t < 0) return -1; return f | t << 7; }
  function fromFen(fen) {
    var pos = new Position(), parts = String(fen || START).trim().split(/\s+/), bd = parts[0], r = 0, c = 0;
    for (var i = 0; i < bd.length; i++) {
      var ch = bd[i];
      if (ch === "/") { r++; c = 0; continue; }
      if (ch >= "1" && ch <= "9") { c += +ch; continue; }
      var t = T_OF[ch.toUpperCase()];
      if (!t || r > 9 || c > 8) throw new Error("FEN 看不懂：" + fen);
      pos.b[r * 9 + c] = (ch === ch.toUpperCase() ? 0 : 8) | t; c++;
    }
    if (r !== 9) throw new Error("FEN 要有 10 列：" + fen);
    pos.side = (parts[1] === "b") ? 1 : 0;
    pos.rehash(); pos.startFen = toFen(pos);
    return pos;
  }
  function boardFen(pos) {
    var out = [];
    for (var r = 0; r < 10; r++) { var row = "", e = 0; for (var c = 0; c < 9; c++) { var p = pos.b[r * 9 + c]; if (!p) e++; else { if (e) { row += e; e = 0; } var l = LET[p & 7]; row += p >> 3 ? l.toLowerCase() : l; } } if (e) row += e; out.push(row); }
    return out.join("/");
  }
  function toFen(pos) { return boardFen(pos) + " " + (pos.side ? "b" : "w"); }
  /* App 格式：board＝90 格陣列（"R"、"n"…或 null），turn＝"r"／"b" */
  function toApp(pos) { var a = new Array(90); for (var i = 0; i < 90; i++) { var p = pos.b[i]; a[i] = p ? (p >> 3 ? LET[p & 7].toLowerCase() : LET[p & 7]) : null; } return { board: a, turn: pos.side ? "b" : "r" }; }
  function fromApp(board, turn) {
    var pos = new Position();
    for (var i = 0; i < 90; i++) { var ch = board[i]; if (!ch) continue; var t = T_OF[ch.toUpperCase()]; if (!t) throw new Error("棋盤上有看不懂的子：" + ch); pos.b[i] = (ch === ch.toUpperCase() ? 0 : 8) | t; }
    pos.side = turn === "b" ? 1 : 0; pos.rehash(); pos.startFen = toFen(pos); return pos;
  }
  /* 各種局面輸入都轉成 Position：FEN 字串、{fen, moves}、{board, turn}、Position */
  function toPos(x) {
    if (x instanceof Position) return x;
    if (x == null) return fromFen(START + " w");
    if (typeof x === "string") return fromFen(x);
    var pos;
    if (x.board) pos = fromApp(x.board, x.turn || x.side);
    else pos = fromFen(x.fen || (START + " w"));
    var mv = x.moves || [];
    for (var i = 0; i < mv.length; i++) {
      var m = typeof mv[i] === "number" ? mv[i] : parseMv(mv[i]);
      if (m < 0 || !isLegal(pos, m)) throw new Error("第 " + (i + 1) + " 步不合法：" + mv[i]);
      pos.make(m);
    }
    return pos;
  }
  function isLegal(pos, m) { var L = pos.legal(); return L.indexOf(m) >= 0; }

  /* ===================== 搜尋層：Searcher ===================== */
  var MATE = 30000, MATE_B = 29000, INF = 32000, MAXPLY = 96, MAXMV = 400;
  var EXACT = 0, LOWER = 1, UPPER = 2;
  function Searcher(ttBits) {
    var size = 1 << (ttBits || 18);
    this.mask = size - 1; this.tKey = new Int32Array(size); this.tData = new Int32Array(size); this.tScore = new Int16Array(size); this.tLo = new Int32Array(size);
    this.killer = new Int32Array(MAXPLY * 2); this.histT = new Int32Array(90 * 128);
    this.moves = new Int32Array(MAXPLY * MAXMV); this.scores = new Int32Array(MAXPLY * MAXMV);
    this.nodes = 0; this.stop = false; this.deadline = Infinity; this.nodeLimit = Infinity; this.rootBest = 0; this.rootScore = 0;
  }
  Searcher.prototype.clear = function () { this.tKey.fill(0); this.tData.fill(0); this.tScore.fill(0); this.tLo.fill(0); this.killer.fill(0); this.histT.fill(0); };
  Searcher.prototype.ttProbe = function (pos) { var i = pos.lo & this.mask; return (this.tKey[i] === pos.hi && this.tLo[i] === pos.lo && this.tData[i]) ? i : -1; };
  Searcher.prototype.ttStore = function (pos, depth, flag, v, m, ply) {
    var i = pos.lo & this.mask, od = this.tData[i];
    if (od && this.tKey[i] === pos.hi && this.tLo[i] === pos.lo && ((od >> 14) & 63) - 1 > depth && flag !== EXACT) return;
    if (v > MATE_B) v += ply; else if (v < -MATE_B) v -= ply;
    this.tKey[i] = pos.hi; this.tLo[i] = pos.lo; this.tScore[i] = v; this.tData[i] = (m & 16383) | ((depth + 1) & 63) << 14 | flag << 20 | 1 << 23;
  };
  Searcher.prototype.checkTime = function () { if (now() >= this.deadline || this.nodes >= this.nodeLimit) this.stop = true; };
  Searcher.prototype.order = function (pos, base, n, ttMove, ply, capsOnly) {
    var mv = this.moves, sc = this.scores, k1 = this.killer[ply * 2], k2 = this.killer[ply * 2 + 1];
    for (var i = 0; i < n; i++) {
      var m = mv[base + i], cv = pos.capVal(m);
      if (m === ttMove) sc[base + i] = 1 << 30;
      else if (cv >= 0) sc[base + i] = (1 << 28) + cv;
      else if (capsOnly) sc[base + i] = 0;
      else if (m === k1) sc[base + i] = (1 << 27) + 2;
      else if (m === k2) sc[base + i] = (1 << 27) + 1;
      else sc[base + i] = this.histT[m & 16383] || 0;
    }
  };
  Searcher.prototype.pick = function (base, i, n) {
    var mv = this.moves, sc = this.scores, bi = i, bs = sc[base + i];
    for (var j = i + 1; j < n; j++) if (sc[base + j] > bs) { bs = sc[base + j]; bi = j; }
    if (bi !== i) { var tm = mv[base + i]; mv[base + i] = mv[base + bi]; mv[base + bi] = tm; var ts = sc[base + i]; sc[base + i] = sc[base + bi]; sc[base + bi] = ts; }
    return mv[base + i];
  };
  Searcher.prototype.qs = function (pos, alpha, beta, ply) {
    if ((++this.nodes & 1023) === 0) this.checkTime();
    if (this.stop) return 0;
    if (ply >= MAXPLY - 1) return pos.evaluate();
    var inChk = pos.inCheck(pos.side), best;
    if (!inChk) { best = pos.evaluate(); if (best >= beta) return best; if (best > alpha) alpha = best; }
    else best = -MATE + ply;
    var base = ply * MAXMV, n = pos.gen(this.moves, base, !inChk), legal = 0;
    this.order(pos, base, n, 0, ply, true);
    for (var i = 0; i < n; i++) {
      var m = this.pick(base, i, n);
      if (!pos.make(m)) continue;
      legal++;
      var v = -this.qs(pos, -beta, -alpha, ply + 1);
      pos.unmake();
      if (this.stop) return 0;
      if (v > best) { best = v; if (v > alpha) { alpha = v; if (v >= beta) break; } }
    }
    if (inChk && !legal) return -MATE + ply;
    return best;
  };
  Searcher.prototype.negamax = function (pos, depth, alpha, beta, ply, nullOk) {
    if ((++this.nodes & 1023) === 0) this.checkTime();
    if (this.stop) return 0;
    if (ply >= MAXPLY - 1) return pos.evaluate();
    var pvNode = beta - alpha > 1;
    if (ply > 0) {
      if (pos.isRepetition()) return 0;
      var ma = -MATE + ply, mb = MATE - ply - 1; if (alpha < ma) alpha = ma; if (beta > mb) beta = mb; if (alpha >= beta) return alpha;
    }
    var inChk = pos.inCheck(pos.side);
    if (inChk && ply < MAXPLY - 10) depth++;
    if (depth <= 0) return this.qs(pos, alpha, beta, ply);
    var ttMove = 0, ti = this.ttProbe(pos);
    if (ti >= 0) {
      var d = this.tData[ti]; ttMove = d & 16383;
      var td = ((d >> 14) & 63) - 1, fl = (d >> 20) & 3;
      if (td >= depth && !pvNode && ply > 0) {
        var tv = this.tScore[ti]; if (tv > MATE_B) tv -= ply; else if (tv < -MATE_B) tv += ply;
        if (fl === EXACT || (fl === LOWER && tv >= beta) || (fl === UPPER && tv <= alpha)) return tv;
      }
    }
    if (!pvNode && !inChk && ply > 0) {
      var ev = pos.evaluate();
      if (depth <= 3 && ev - 110 * depth >= beta && beta > -MATE_B && beta < MATE_B) return ev;
      if (nullOk && depth >= 3 && ev >= beta && pos.hasBig(pos.side)) {
        pos.makeNull();
        var rr = depth >= 6 ? 3 : 2;
        var nv = -this.negamax(pos, depth - 1 - rr, -beta, -beta + 1, ply + 1, false);
        pos.unmakeNull();
        if (this.stop) return 0;
        if (nv >= beta) return nv >= MATE_B ? beta : nv;
      }
    }
    var base = ply * MAXMV, n = pos.gen(this.moves, base, false);
    this.order(pos, base, n, ttMove, ply, false);
    var best = -INF, bestM = 0, legal = 0, a0 = alpha, k1 = this.killer[ply * 2], k2 = this.killer[ply * 2 + 1];
    for (var i = 0; i < n; i++) {
      var m = this.pick(base, i, n);
      var isCap = pos.b[m >> 7] !== 0;
      if (!pos.make(m)) continue;
      legal++;
      var gives = pos.inCheck(pos.side), v;
      if (legal === 1) v = -this.negamax(pos, depth - 1, -beta, -alpha, ply + 1, true);
      else {
        var red = 0;
        if (depth >= 3 && !inChk && !isCap && !gives && legal > 3 && m !== k1 && m !== k2) red = (legal > 10 && depth >= 5) ? 2 : 1;
        v = -this.negamax(pos, depth - 1 - red, -alpha - 1, -alpha, ply + 1, true);
        if (v > alpha && red && !this.stop) v = -this.negamax(pos, depth - 1, -alpha - 1, -alpha, ply + 1, true);
        if (v > alpha && v < beta && !this.stop) v = -this.negamax(pos, depth - 1, -beta, -alpha, ply + 1, true);
      }
      pos.unmake();
      if (this.stop) return 0;
      if (v > best) {
        best = v; bestM = m;
        if (v > alpha) {
          alpha = v;
          if (ply === 0) { this.rootBest = m; this.rootScore = v; }
          if (v >= beta) {
            if (!isCap) { if (m !== k1) { this.killer[ply * 2 + 1] = k1; this.killer[ply * 2] = m; } var hi = m & 16383; this.histT[hi] += depth * depth; if (this.histT[hi] > 1e8) for (var h = 0; h < this.histT.length; h++) this.histT[h] >>= 1; }
            break;
          }
        }
      }
    }
    if (!legal) return -MATE + ply;
    this.ttStore(pos, depth, best >= beta ? LOWER : (best > a0 ? EXACT : UPPER), best, bestM, ply);
    return best;
  };
  Searcher.prototype.pv = function (pos, maxLen) {
    var out = [], made = 0;
    for (var k = 0; k < maxLen; k++) {
      var ti = this.ttProbe(pos); if (ti < 0) break;
      var m = this.tData[ti] & 16383; if (!m || !isLegal(pos, m)) break;
      pos.make(m); made++; out.push(m);
      if (pos.isRepetition()) break;
    }
    while (made--) pos.unmake();
    return out;
  };
  /* lim：{depth, timeMs, nodes, rootScores:true（每個根著法都算精確分數，給加雜訊用）} */
  Searcher.prototype.search = function (pos, lim) {
    lim = lim || {};
    var t0 = now(), maxD = Math.min(lim.depth || 64, MAXPLY - 20);
    this.nodes = 0; this.stop = false; this.deadline = lim.timeMs ? t0 + lim.timeMs : Infinity; this.nodeLimit = lim.nodes || Infinity;
    for (var i = 0; i < this.killer.length; i++) this.killer[i] = 0;
    var legalMoves = pos.legal();
    var res = { move: 0, score: 0, depth: 0, nodes: 0, ms: 0, pv: [], roots: null, legal: legalMoves.length };
    if (!legalMoves.length) { res.score = -MATE; return res; }
    var bestM = legalMoves[0], bestV = 0, doneD = 0;
    var idD = lim.rootScores ? Math.max(1, maxD - 1) : maxD;
    if (legalMoves.length === 1 && !lim.rootScores) idD = Math.min(idD, 2);
    for (var d = 1; d <= idD; d++) {
      this.rootBest = 0;
      var v = this.negamax(pos, d, -INF, INF, 0, false);
      if (this.stop) { if (this.rootBest && d > 1) bestM = this.rootBest; break; }
      bestM = this.rootBest || bestM; bestV = v; doneD = d;
      if (Math.abs(v) > MATE_B && d >= 3) break;
      if (lim.timeMs && now() - t0 > lim.timeMs * 0.45) break;
    }
    if (lim.rootScores && !this.stop) {
      var roots = [], rd = maxD;
      for (var j = 0; j < legalMoves.length; j++) {
        var m = legalMoves[j]; pos.make(m);
        var rv = rd <= 1 ? -this.qs(pos, -INF, INF, 1) : -this.negamax(pos, rd - 1, -INF, INF, 1, true);
        pos.unmake();
        if (this.stop) break;
        roots.push({ m: m, v: rv });
      }
      if (roots.length) { res.roots = roots; doneD = Math.max(doneD, rd); }
    }
    res.move = bestM; res.score = bestV; res.depth = doneD; res.nodes = this.nodes; res.ms = now() - t0;
    res.pv = this.pv(pos, Math.max(1, doneD));
    if (!res.pv.length || res.pv[0] !== bestM) res.pv = [bestM];
    return res;
  };

  /* ===================== 強度分級 =====================
     depth＝最多算幾層（紅黑各一步算 2 層）；noise＝每個根著法分數加上的常態雜訊標準差（厘兵），越大越常走錯；
     timeMs＝每步時間上限。所有級數另外都有硬上限 HARD_MS（手機每步 ≤1.5 秒；量測見 var-budget.js --speed）。 */
  var HARD_MS = 1500;
  var LEVELS = [null,
    { n: 1, name: "入門", depth: 1, noise: 300 },
    { n: 2, name: "新手", depth: 1, noise: 150 },
    { n: 3, name: "初級", depth: 2, noise: 90 },
    { n: 4, name: "中級", depth: 3, noise: 50 },
    { n: 5, name: "高級", depth: 4, noise: 25 },
    { n: 6, name: "強手", depth: 6, noise: 10, timeMs: 600 },
    { n: 7, name: "高手", depth: 12, timeMs: 1000 },
    { n: 8, name: "全力", depth: 40, timeMs: 1500 }];
  var DEF_SEARCHER = null;
  function defSearcher() { return DEF_SEARCHER || (DEF_SEARCHER = new Searcher(18)); }
  /* weaken：這一步降幾級（技能、新手保護用；降到 1 級以下改成加大雜訊） */
  function levelCfg(level, weaken) {
    var lv = Math.max(1, Math.min(8, Math.round(level || 4))), w = Math.max(0, Math.round(weaken || 0)), eff = lv - w;
    var base = LEVELS[Math.max(1, eff)], cfg = { n: lv, eff: eff, depth: base.depth, noise: base.noise || 0, timeMs: base.timeMs || HARD_MS };
    if (eff < 1) cfg.noise = base.noise + 150 * (1 - eff);
    return cfg;
  }
  function bestMove(posIn, opts) {
    opts = opts || {};
    var pos = toPos(posIn), cfg = levelCfg(opts.level == null ? 4 : opts.level, opts.weaken);
    var hard = Math.min(opts.maxMs || HARD_MS, HARD_MS * 4);
    var timeMs = Math.min(opts.timeMs || cfg.timeMs, hard);
    var depth = opts.depth || cfg.depth, noise = opts.noise != null ? opts.noise : cfg.noise;
    var S = opts.searcher || defSearcher(); if (opts.fresh) S.clear();
    var R0 = opts.rng || (opts.seed != null ? rng(opts.seed) : Math.random);
    var r = S.search(pos, { depth: depth, timeMs: timeMs, nodes: opts.nodes, rootScores: noise > 0 });
    var out = { move: null, from: -1, to: -1, score: r.score, depth: r.depth, nodes: r.nodes, ms: Math.round(r.ms), pv: r.pv.map(mvName), level: cfg.n, weaken: cfg.n - cfg.eff, noise: noise };
    if (!r.legal) { out.status = status(pos); return out; }
    var m = r.move;
    if (noise > 0 && r.roots && r.roots.length) {
      var bi = -1, bv = -Infinity, top = -Infinity;
      for (var i = 0; i < r.roots.length; i++) { var x = r.roots[i], nv = x.v + noise * gauss(R0); if (x.v > top) top = x.v; if (nv > bv) { bv = nv; bi = i; } }
      m = r.roots[bi].m; out.score = r.roots[bi].v; out.bestScore = top;
      if (m !== r.pv[0]) out.pv = [mvName(m)];
    }
    out.move = mvName(m); out.from = m & 127; out.to = m >> 7;
    return out;
  }

  /* ===================== 終局判定 ===================== */
  function legalMoves(posIn, opts) { var pos = toPos(posIn), L = pos.legal(); if (opts && opts.pairs) return L.map(function (m) { return [m & 127, m >> 7]; }); return L.map(mvName); }
  function isMate(posIn) { var pos = toPos(posIn); return pos.legal().length === 0 && pos.inCheck(pos.side); }
  function isStalemate(posIn) { var pos = toPos(posIn); return pos.legal().length === 0 && !pos.inCheck(pos.side); }
  /* 對局狀態：沒有合法著法＝走方輸（將死或困斃，象棋困斃算輸）；三次重複＝和（不判長將長捉）；
     60 回合（120 步）沒吃子＝和；總步數到上限（預設 300 步＝150 回合）＝和；雙方都沒有能攻擊的子（俥傌炮兵）＝和 */
  function status(posIn, opts) {
    opts = opts || {}; var pos = toPos(posIn), sd = pos.side ? "b" : "r", other = pos.side ? "r" : "b";
    if (pos.legal().length === 0) return { over: true, winner: other, reason: pos.inCheck(pos.side) ? "將死" : "困斃" };
    if (pos.repCount() >= (opts.repLimit || 3)) return { over: true, winner: null, reason: "三次重複局面" };
    if (pos.pliesNoCap() >= (opts.noCapPlies || 120)) return { over: true, winner: null, reason: "60 回合沒有吃子" };
    if (pos.un >= (opts.maxPlies || 300)) return { over: true, winner: null, reason: "回合上限" };
    var c = pos.cnt, atk0 = c[4] + c[5] + c[6] + c[7], atk1 = c[12] + c[13] + c[14] + c[15];
    if (!atk0 && !atk1) return { over: true, winner: null, reason: "雙方都沒有攻擊子" };
    return { over: false, winner: null, reason: null, turn: sd, check: pos.inCheck(pos.side) };
  }

  /* ===================== 自由擺棋規則 ===================== */
  /* 11/13 開發者定案（依自我對弈校正）：俥 10、炮 6、傌 3.5、相 2、仕 1、兵 0.5（標準陣 47.5 分），預算 48 不變；
     堆疊加價：同一種大子（俥、炮、傌）超過 4 顆，每多一顆加 1 分；
     本命優惠：六位是本命子打八折；沈方庭（本命子是帥，不能改）改成「九宮內的仕、相打八折」。
     分數一律用十分之一分的整數算（COST10），避免小數誤差 */
  var BUDGET = 48;
  var COST10 = { A: 10, B: 20, N: 35, R: 100, C: 60, P: 5, K: 0 };
  var STACK = { types: "RCN", over: 4, add10: 10 };
  var CHARS = {
    x_swordboy: { name: "齊轍", piece: "R", theme: "兵全換俥（劍陣）" },
    x_spiritgirl: { name: "田飛燕", piece: "B", theme: "相、仕護宮，另加兩顆相" },
    x_martialgirl: { name: "雷借花", piece: "C", theme: "兵全換炮（炮陣）" },
    x_miaogirl: { name: "駱躍梅", piece: "N", theme: "兵全換傌（騎兵陣）" },
    x_shuai: { name: "沈方庭", piece: "K", theme: "九宮塞滿仕", perk: "九宮內的仕、相打八折" },
    x_shi: { name: "鐵連城", piece: "A", theme: "前排換成俥，兩翼護衛（鐵壁）" },
    x_bing: { name: "步越溪", piece: "P", theme: "多一排兵，兵一開始就在河邊" }
  };
  function charKeyOf(x) { if (!x) return null; if (CHARS[x]) return x; for (var k in CHARS) if (CHARS[k].name === x) return k; return null; }
  /* 本命優惠的種類：一般是本命子的代號；沈方庭是 "palaceAB"（九宮內的仕、相） */
  function discOf(ck) { if (!ck) return null; return ck === "x_shuai" ? "palaceAB" : CHARS[ck].piece; }
  function inPalaceRel(rel) { return rel[0] >= "d" && rel[0] <= "f" && +rel[1] <= 2; }
  /* 一顆子幾分（十分之一分）；rel＝紅方觀點格名（沈方庭的優惠要看位置；沒給位置時仕一律算在九宮內，相一律不算） */
  function pieceCost10(t, discT, rel) {
    var c = COST10[t] || 0;
    if (t === discT) return c * 8 / 10;
    if (discT === "palaceAB" && (t === "A" || t === "B") && (rel ? inPalaceRel(rel) : t === "A")) return c * 8 / 10;
    return c;
  }
  function stackAdd10(counts) { var s = 0; for (var i = 0; i < STACK.types.length; i++) { var n = counts[STACK.types[i]] || 0; if (n > STACK.over) s += (n - STACK.over) * STACK.add10; } return s; }
  /* list：[{t, sq}]（實際格名）→ {total, base, stack}（十分之一分） */
  function listCost10(list, side, discT) {
    var base = 0, cnt = {};
    for (var i = 0; i < list.length; i++) { var x = list[i]; base += pieceCost10(x.t, discT, absToRel(x.sq, side)); cnt[x.t] = (cnt[x.t] || 0) + 1; }
    var st = stackAdd10(cnt); return { total: Math.round(base + st), base: base, stack: st };
  }
  var A_PTS = ["d0", "f0", "e1", "d2", "f2"], B_PTS = ["c0", "g0", "a2", "e2", "i2", "c4", "g4"];
  /* 紅方觀點的格名（a0）換成某一方的實際格名：黑方上下翻（行不變） */
  function relToAbs(name, side) { if (side === "r") return name; return name[0] + (9 - (+name[1])); }
  function absToRel(name, side) { return relToAbs(name, side); }
  function sideKey(s) { return s === "b" || s === 1 || s === "black" ? "b" : "r"; }
  /* 擺法正規化：{side, pieces:{"a0":"R",…}}、{side, pieces:["Ra0",…]}、{side, pieces:[{t:"R",sq:"a0"}]} */
  function normSetup(setup) {
    var side = sideKey(setup && setup.side), list = [], errs = [], pcs = setup && setup.pieces;
    var add = function (t, sq) {
      var T = String(t || "").toUpperCase(); if (T === "H") T = "N"; if (T === "E") T = "B";
      if (!COST10.hasOwnProperty(T)) { errs.push("棋子代號「" + t + "」看不懂（只認 K A B N R C P）"); return; }
      if (parseSq(String(sq)) < 0) { errs.push("格子「" + sq + "」看不懂（要像 a0～i9）"); return; }
      list.push({ t: T, sq: String(sq) });
    };
    if (Array.isArray(pcs)) for (var i = 0; i < pcs.length; i++) { var x = pcs[i]; if (typeof x === "string") add(x[0], x.slice(1)); else if (x) add(x.t || x.type, x.sq); }
    else if (pcs && typeof pcs === "object") for (var k in pcs) add(pcs[k], k);
    else errs.push("擺法裡沒有 pieces");
    return { side: side, list: list, errs: errs };
  }
  function setupCost(setup, charKey) {
    var ns = normSetup(setup), ck = charKeyOf(charKey || setup.char);
    return listCost10(ns.list, ns.side, discOf(ck)).total / 10;
  }
  function validateSide(ns, opts, errors) {
    var side = ns.side, sname = side === "r" ? "紅方" : "黑方", nm = NAMES[side], ck = charKeyOf(opts.char), discT = discOf(ck);
    var budget = opts.budget == null ? BUDGET : opts.budget, seen = {}, kings = 0, cost = 0, i;
    for (i = 0; i < ns.errs.length; i++) errors.push(sname + "：" + ns.errs[i]);
    if (ns.list.length !== 16) errors.push(sname + "要剛好 16 子，現在是 " + ns.list.length + " 子");
    for (i = 0; i < ns.list.length; i++) {
      var x = ns.list[i], rel = absToRel(x.sq, side), rank = +rel[1];
      if (seen[x.sq]) errors.push(sname + "在 " + x.sq + " 重複擺了兩子"); seen[x.sq] = 1;
      if (x.t === "K") kings++;
      if (rank > 4) { errors.push(sname + "的" + nm[x.t] + "（" + x.sq + "）超出己方半場"); continue; }
      if (x.t === "K" && !(rel[0] >= "d" && rel[0] <= "f" && rank <= 2)) errors.push(sname + "的" + nm.K + "要擺在九宮內，" + x.sq + " 不行");
      if (x.t === "A" && A_PTS.indexOf(rel) < 0) errors.push(sname + "的" + nm.A + "只能擺在九宮的 5 個" + nm.A + "位（" + A_PTS.map(function (q) { return relToAbs(q, side); }).join("、") + "），" + x.sq + " 不行");
      if (x.t === "B" && B_PTS.indexOf(rel) < 0) errors.push(sname + "的" + nm.B + "只能擺在己方 7 個" + nm.B + "位（" + B_PTS.map(function (q) { return relToAbs(q, side); }).join("、") + "），" + x.sq + " 不行");
    }
    if (kings === 0) errors.push(sname + "一定要有一個" + nm.K);
    if (kings > 1) errors.push(sname + "只能有一個" + nm.K + "，現在有 " + kings + " 個");
    var lc = listCost10(ns.list, side, discT); cost = lc.total / 10;
    if (cost > budget + 1e-9) errors.push(sname + "點數 " + cost + " 分，超過預算 " + budget + " 分" + (lc.stack ? "（含同類大子超過 4 顆的加價 " + lc.stack / 10 + " 分）" : "") + (ck ? "（已算" + CHARS[ck].name + (CHARS[ck].perk || "本命子八折") + "）" : ""));
    return cost;
  }
  function setupsToFen(red, black, turn) {
    var b = new Array(90).fill(null), sides = [normSetup(red), normSetup(black)];
    for (var s = 0; s < 2; s++) { var ns = sides[s]; for (var i = 0; i < ns.list.length; i++) { var q = parseSq(ns.list[i].sq); if (q < 0) continue; b[q] = ns.side === "r" ? ns.list[i].t : ns.list[i].t.toLowerCase(); } }
    return toFen(fromApp(b, turn === "b" ? "b" : "r"));
  }
  function fenToSetups(fen) {
    var pos = fromFen(fen), red = { side: "r", pieces: {} }, black = { side: "b", pieces: {} };
    for (var i = 0; i < 90; i++) { var p = pos.b[i]; if (!p) continue; (p >> 3 ? black : red).pieces[sqName(i)] = LET[p & 7]; }
    return { red: red, black: black, turn: pos.side ? "b" : "r" };
  }
  /* validateSetup(input, opts)
     input：單方擺法 {side, pieces}；或雙方 {red, black}；或整盤 FEN 字串／{fen}
     opts：{budget（預設 48）, char（單方的本命角色）, chars:{r,b}（雙方的本命角色）, against（單方時對手的擺法，一起檢查將軍與照面）}
     回傳 {ok, errors:[中文…], cost:{r,b}, budget} */
  function validateSetup(input, opts) {
    opts = opts || {}; var errors = [], cost = {}, budget = opts.budget == null ? BUDGET : opts.budget, chars = opts.chars || {};
    var red = null, black = null;
    if (typeof input === "string" || (input && input.fen)) { var sp = fenToSetups(typeof input === "string" ? input : input.fen); red = sp.red; black = sp.black; }
    else if (input && (input.red || input.black)) { red = input.red; black = input.black; }
    else if (input) { if (sideKey(input.side) === "r") { red = input; black = opts.against || null; } else { black = input; red = opts.against || null; } }
    else return { ok: false, errors: ["沒有擺法"], cost: cost, budget: budget };
    var single = !(typeof input === "string" || (input && (input.fen || input.red || input.black)));
    var nr = red ? normSetup(red) : null, nb = black ? normSetup(black) : null;
    if (nr) { nr.side = "r"; cost.r = validateSide(nr, { budget: budget, char: chars.r || (single && sideKey(input.side) === "r" ? opts.char : null) || red.char }, errors); }
    if (nb) { nb.side = "b"; cost.b = validateSide(nb, { budget: budget, char: chars.b || (single && sideKey(input.side) === "b" ? opts.char : null) || black.char }, errors); }
    if (nr && nb && !errors.length) {
      var pos = fromFen(setupsToFen({ side: "r", pieces: nr.list.map(function (x) { return x.t + x.sq; }) }, { side: "b", pieces: nb.list.map(function (x) { return x.t + x.sq; }) }, "r"));
      if (pos.facing()) errors.push("將帥不能照面（同一直線中間沒有棋子）");
      else {
        if (pos.attacked(pos.ks[0], 1)) errors.push("開局不能已經將軍：紅方的帥正被將軍");
        if (pos.attacked(pos.ks[1], 0)) errors.push("開局不能已經將軍：黑方的將正被將軍");
      }
    }
    return { ok: errors.length === 0, errors: errors, cost: cost, budget: budget };
  }

  /* ---------- 電腦依風格擺棋 ---------- */
  var STYLES = {
    standard: { name: "標準陣" }, balanced: { name: "平衡陣" }, cavalry: { name: "騎兵陣" }, cannon: { name: "炮陣" },
    wall: { name: "鐵壁" }, rook: { name: "俥陣" }, pawnsea: { name: "兵海" }, random: { name: "隨機陣" }
  };
  var STYLE_LIST = ["cavalry", "cannon", "wall", "rook", "pawnsea", "balanced", "random"];
  function styleKey(s) { if (!s) return "balanced"; if (STYLES[s]) return s; for (var k in STYLES) if (STYLES[k].name === s || STYLES[k].name.replace("陣", "") === s) return k; throw new Error("沒有這種風格：" + s); }
  var TPL = {
    cavalry: { up: "N", maxUp: 9, r: { N: [5, 8], R: [1, 2], C: [0, 1], A: [2, 2], B: [0, 2] } },
    cannon: { up: "C", maxUp: 8, r: { C: [5, 7], R: [1, 2], N: [0, 1], A: [2, 2], B: [2, 2] } },
    rook: { up: "R", maxUp: 5, r: { R: [3, 5], C: [0, 1], N: [0, 1], A: [1, 2], B: [0, 2] } },
    wall: { up: "R", maxUp: 3, r: { A: [3, 5], B: [3, 6], R: [2, 3], C: [0, 1], N: [0, 1] } },
    pawnsea: { up: null, r: { P: [9, 11], R: [2, 2], C: [1, 2], N: [0, 1], A: [1, 2], B: [0, 2] } }
  };
  var STD_COMP = { A: 2, B: 2, N: 2, R: 2, C: 2, P: 5 };
  var LIMIT = { A: 5, B: 7, N: 15, R: 15, C: 15, P: 15 };
  function compCost(comp, discT) { var s = 0; for (var t in comp) s += comp[t] * pieceCost10(t, discT); return s + stackAdd10(comp); }
  /* 試著把一顆 from 換成 to：沒超預算就保留並回 true，超了就換回來 */
  function tryUp(comp, from, to, discT, budget10) { if (comp[from] <= 0) return false; comp[from]--; comp[to]++; if (compCost(comp, discT) <= budget10) return true; comp[from]++; comp[to]--; return false; }
  function ri(R0, a, b) { return a + Math.floor(R0() * (b - a + 1)); }
  function genComp(style, R0, budget10, discT) {
    var comp = { A: 0, B: 0, N: 0, R: 0, C: 0, P: 0 }, t, k;
    if (style === "standard") return Object.assign(comp, STD_COMP);
    if (style === "balanced") {
      Object.assign(comp, STD_COMP);
      var swaps = ri(R0, 1, 3), types = ["A", "B", "N", "R", "C", "P"];
      for (k = 0; k < 20 && swaps > 0; k++) {
        var x = types[ri(R0, 0, 5)], y = types[ri(R0, 0, 5)];
        if (x === y || !comp[x] || comp[y] >= LIMIT[y]) continue;
        comp[x]--; comp[y]++;
        if (compCost(comp, discT) > budget10) { comp[x]++; comp[y]--; continue; }
        swaps--;
      }
      return comp;
    }
    if (style === "random") {
      var W = { P: 4, A: 1, B: 1, N: 2, R: 1.2, C: 1.5 };
      for (var slot = 0; slot < 15; slot++) {
        var left = 15 - slot - 1, cands = [], tot = 0;
        for (t in W) { if (comp[t] >= LIMIT[t]) continue; comp[t]++; var ok = compCost(comp, discT) + left * pieceCost10("P", discT) <= budget10; comp[t]--; if (!ok) continue; cands.push(t); tot += W[t]; }
        var u = R0() * tot, pick = cands.length ? cands[cands.length - 1] : "P";
        for (k = 0; k < cands.length; k++) { u -= W[cands[k]]; if (u <= 0) { pick = cands[k]; break; } }
        comp[pick]++;
      }
      return comp;
    }
    var tp = TPL[style];
    for (t in tp.r) comp[t] = ri(R0, tp.r[t][0], tp.r[t][1]);
    var sum = function () { return comp.A + comp.B + comp.N + comp.R + comp.C + comp.P; };
    var theme = tp.up || "P";
    var order = ["R", "C", "N", "B", "A"].filter(function (x) { return x !== theme; });
    while (sum() > 15) {
      var cut = order.filter(function (x) { return comp[x] > (tp.r[x] ? tp.r[x][0] : 0); });
      if (!cut.length) cut = order.filter(function (x) { return comp[x] > 0; });
      if (!cut.length) cut = [theme];
      comp[cut[ri(R0, 0, cut.length - 1)]]--;
    }
    if (style !== "pawnsea") comp.P = 15 - (sum() - comp.P);
    else { comp.P += 15 - sum(); }
    var guard = 0;
    while (compCost(comp, discT) > budget10 && guard++ < 40) {
      var dn = ["R", "C", "N"].filter(function (x) { return x !== theme && comp[x] > 0; });
      if (!dn.length) dn = [theme].filter(function (x) { return x !== "P" && comp[x] > 0; });
      if (!dn.length) dn = ["A", "B"].filter(function (x) { return comp[x] > 0; });
      if (!dn.length) break;
      var d = dn[R0() < 0.6 ? 0 : ri(R0, 0, dn.length - 1)]; comp[d]--; comp.P++;
    }
    if (tp.up) while (comp[tp.up] < Math.min(tp.maxUp, LIMIT[tp.up]) && tryUp(comp, "P", tp.up, discT, budget10)) { }
    /* 預算還有剩：把兵升成傌或炮（兵海保留至少 9 兵，其他至少 2 兵） */
    var minP = style === "pawnsea" ? 9 : 2;
    for (k = 0; k < 8 && comp.P > minP; k++) {
      var upT = R0() < 0.5 ? "N" : "C";
      if (!tryUp(comp, "P", upT, discT, budget10) && !tryUp(comp, "P", upT === "N" ? "C" : "N", discT, budget10)) break;
    }
    return comp;
  }
  /* 紅方觀點格子的偏好分數（rank 0＝己方底線，f 0～8＝a～i） */
  function prefScore(t, f, k, style) {
    var edge = f === 0 || f === 8, wing = f === 1 || f === 7;
    if (t === "R") { if (style === "wall" && k === 3 && f >= 3 && f <= 5) return 12; return k === 0 ? (edge ? 10 : 5) : k === 1 ? (edge ? 7 : 3) : k === 2 ? (edge ? 7 : 4) : k === 3 ? 5 : 4; }
    if (t === "N") return k === 0 ? (wing ? 10 : 5) : k === 2 ? ((wing || f === 2 || f === 6) ? 7 : 4) : k === 1 ? 3 : k === 3 ? 5 : 4;
    if (t === "C") return k === 2 ? (wing ? 10 : 6) : k === 1 ? 4 : k === 0 ? 3 : k === 3 ? 4 : 3;
    if (style === "pawnsea") return k === 4 ? (f % 2 === 0 ? 10 : 8) : k === 3 ? (f % 2 === 1 ? 9 : 7) : k === 2 ? 3 : 1;
    return k === 3 ? (f % 2 === 0 ? 10 : 7) : k === 4 ? 6 : k === 2 ? 3 : k === 1 ? 2 : 1;
  }
  function placeComp(comp, side, R0, style) {
    var occ = {}, out = {}, i, k, f;
    var kSq = "e0";
    if (style === "random") { var ks = ["e0", "e0", "e0", "d0", "f0", "e1"]; kSq = ks[ri(R0, 0, ks.length - 1)]; }
    occ[kSq] = "K";
    var shuffleTail = function (arr, keep) { var a = arr.slice(0, keep), b = arr.slice(keep); for (var j = b.length - 1; j > 0; j--) { var x = ri(R0, 0, j), tm = b[j]; b[j] = b[x]; b[x] = tm; } return a.concat(b); };
    var ap = shuffleTail(A_PTS, style === "random" ? 0 : 2).filter(function (q) { return !occ[q]; });
    for (i = 0; i < comp.A && i < ap.length; i++) occ[ap[i]] = "A";
    var bp = shuffleTail(B_PTS, style === "random" ? 0 : 2).filter(function (q) { return !occ[q]; });
    for (i = 0; i < comp.B && i < bp.length; i++) occ[bp[i]] = "B";
    var types = ["R", "C", "N", "P"];
    for (var ti = 0; ti < types.length; ti++) {
      var t = types[ti];
      for (var n = 0; n < comp[t]; n++) {
        var best = null, bs = -1;
        for (k = 0; k <= 4; k++) for (f = 0; f < 9; f++) { var nm = String.fromCharCode(97 + f) + k; if (occ[nm]) continue; var sc = prefScore(t, f, k, style) + R0() * (style === "random" ? 8 : 3); if (sc > bs) { bs = sc; best = nm; } }
        if (best) occ[best] = t;
      }
    }
    var kf = kSq[0], kr = +kSq[1], cover = false;
    for (k = kr + 1; k <= 4; k++) if (occ[kf + k]) cover = true;
    if (!cover) {
      var mov = null; for (var q in occ) if (occ[q] === "P" || occ[q] === "N" || occ[q] === "C") { mov = q; if (occ[q] === "P") break; }
      var tgt = [kf + 3, kf + 4, kf + 2, kf + 1].filter(function (x) { return !occ[x] && +x[1] > kr; })[0];
      if (mov && tgt) { occ[tgt] = occ[mov]; delete occ[mov]; }
    }
    for (var key in occ) out[relToAbs(key, side)] = occ[key];
    return out;
  }
  /* genSetup(style, {budget, seed, side, char, against})：依風格擺一方 16 子（一定合法；有 against 時連將軍、照面一起避開） */
  function genSetup(style, opts) {
    opts = opts || {};
    var st = styleKey(style), side = sideKey(opts.side), budget = opts.budget == null ? BUDGET : opts.budget, ck = charKeyOf(opts.char), discT = discOf(ck);
    var seed = opts.seed == null ? (Math.random() * 4294967296) >>> 0 : (typeof opts.seed === "number" ? opts.seed >>> 0 : hashStr(String(opts.seed)));
    for (var attempt = 0; attempt < 60; attempt++) {
      var R0 = rng(seed + attempt * 7919);
      var comp = genComp(st, R0, Math.round(budget * 10), discT);
      var pieces = placeComp(comp, side, R0, st);
      var setup = { side: side, style: st, name: STYLES[st].name, pieces: pieces, char: ck || undefined };
      var v = validateSetup(setup, { budget: budget, char: ck, against: opts.against });
      if (v.ok) { setup.cost = v.cost[side]; setup.budget = budget; setup.comp = comp; return setup; }
    }
    throw new Error("擺不出合法的" + STYLES[st].name + "（預算 " + budget + "）");
  }
  function taiwanDate() { return new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10); }
  /* 今日異象：同一天所有人同一套（日期當種子） */
  function dailySetup(dateStr) {
    var date = dateStr || taiwanDate(), seed = hashStr("XQVar-daily|" + date), R0 = rng(seed);
    var rs = STYLE_LIST[Math.floor(R0() * STYLE_LIST.length)], bs = STYLE_LIST[Math.floor(R0() * STYLE_LIST.length)];
    var red = genSetup(rs, { side: "r", seed: seed ^ 0x5bd1e995 });
    var black = genSetup(bs, { side: "b", seed: seed ^ 0x1b873593, against: red });
    return { date: date, title: "今日異象：紅方" + red.name + " 對 黑方" + black.name, red: red, black: black, fen: setupsToFen(red, black, "r") };
  }
  /* 七星本命陣（11/13 開發者定案的新點數規則；紅方觀點；原案超出預算的已調整，original 是原案、adjust 是怎麼調的；細節見 xiangqi-db/story/黑洞超展開_點數校正.md） */
  var CHAR_LAYOUT = {
    x_swordboy: { pieces: "Ke0 Ad0 Af0 Ra0 Ri0 Rb2 Rh2 Re3 Pa3 Pb3 Pc3 Pd3 Pf3 Pg3 Ph3 Pi3", original: "兵全換俥＝7 俥（俥八折 8×7＋第 5～7 俥加價 3＋其他＝84 分）", adjust: "改成 5 俥＋2 仕＋8 兵（47 分，含第 5 俥加價 1 分）：傌、炮、相全拿掉，8 兵在前排一字排開，中路一支俥" },
    x_spiritgirl: { pieces: "Ke0 Ad0 Af0 Bc0 Bg0 Ba2 Bi2 Ra0 Ri0 Nb0 Nh0 Ce2 Pa4 Pc3 Pe3 Pg3", original: "4 相＋2 仕＋標準其他子＋3 兵＝48.9 分，超 0.9", adjust: "拿掉一門炮、多一兵（43.4 分）；相、仕的位置本來就不重疊，「換位」做不到，改成 4 相把兩翼護住" },
    x_martialgirl: { pieces: "Ke0 Ad0 Af0 Bc0 Bg0 Ra0 Nh0 Cb0 Ci0 Cb2 Ch2 Ce1 Pa3 Pc3 Pe3 Pg3", original: "兵全換炮＝7 炮（炮八折 4.8×7＋第 5～7 炮加價 3＋其他＝69.6 分）", adjust: "改成 5 炮＋1 俥＋1 傌＋2 仕＋2 相＋4 兵（46.5 分，含第 5 炮加價 1 分）：拿掉一俥一傌一兵；中兵保留當炮架，也避免開局空頭炮將軍" },
    x_miaogirl: { pieces: "Ke0 Ad0 Af0 Bc0 Bg0 Ra0 Ch2 Nb0 Nh0 Na3 Nc3 Ne3 Ng3 Ni3 Pb3 Ph3", original: "兵全換傌＝7 傌（傌八折 2.8×7＋第 5～7 傌加價 3＋其他＝60.6 分）", adjust: "保留 7 傌，拿掉一俥一炮、換兩兵（45.6 分，含第 5～7 傌加價 3 分）" },
    x_shuai: { pieces: "Ke0 Ad0 Af0 Ae1 Ad2 Af2 Bc0 Bg0 Ra0 Ri0 Nb0 Nh0 Cb2 Ch2 Pc3 Pg3", original: "5 仕塞滿九宮＋標準其他子＋2 兵", adjust: "照原案（48 分）：九宮內的 5 仕打八折才剛好進預算，沒有優惠是 49 分" },
    x_shi: { pieces: "Ke0 Ad0 Af0 Bc0 Bg0 Ch2 Rd3 Re3 Rf3 Pa3 Pb3 Pc3 Pg3 Ph3 Pi3 Pe4", original: "前排 5 兵全換俥＝7 俥（仕八折也要 97.6 分）", adjust: "改成 3 俥守中路前排、兩翼 6 兵＋河口 1 兵、1 炮、2 仕 2 相（45.1 分）" },
    x_bing: { pieces: "Ke0 Ad0 Af0 Ra0 Ri0 Cb2 Ch2 Pa4 Pc4 Pe4 Pg4 Pi4 Pb3 Pd3 Pf3 Ph3", original: "多一排兵：兵數加倍就得拿掉別的子", adjust: "9 兵（河邊 5、後排 4）＋2 俥 2 炮 2 仕（37.6 分）：傌、相讓給兵，預算有剩（開發者 11/13：七星保留強弱差異）" }
  };
  function charSetup(charKey, opts) {
    opts = opts || {};
    var ck = charKeyOf(charKey); if (!ck) throw new Error("沒有這位角色：" + charKey);
    var side = sideKey(opts.side), L = CHAR_LAYOUT[ck], pieces = {};
    L.pieces.split(" ").forEach(function (x) { pieces[relToAbs(x.slice(1), side)] = x[0]; });
    var setup = { side: side, style: "char", name: CHARS[ck].name + "本命陣", char: ck, piece: CHARS[ck].piece, theme: CHARS[ck].theme, original: L.original, adjust: L.adjust, pieces: pieces };
    var v = validateSetup(setup, { char: ck });
    setup.cost = v.cost[side]; setup.budget = BUDGET; setup.ok = v.ok; setup.errors = v.errors;
    return setup;
  }

  /* ===================== 對局物件（UI 方便用；含「降強度 N 手」） ===================== */
  function Game(start, opts) {
    this.opts = opts || {};
    this.pos = start && start.red && start.black ? fromFen(setupsToFen(start.red, start.black, start.turn || "r")) : toPos(start || (START + " w")).clone();
    this.weakLeft = 0; this.weakBy = 0; this.searcher = this.opts.searcher || new Searcher(this.opts.ttBits || 18);
  }
  Game.prototype.fen = function () { return toFen(this.pos); };
  Game.prototype.legal = function () { return this.pos.legal().map(mvName); };
  Game.prototype.play = function (mv) { var m = typeof mv === "number" ? mv : parseMv(mv); if (m < 0 || !isLegal(this.pos, m)) throw new Error("不合法的著法：" + mv); var cap = this.pos.b[m >> 7]; this.pos.make(m); return { move: mvName(m), capture: cap ? (cap >> 3 ? LET[cap & 7].toLowerCase() : LET[cap & 7]) : null, status: this.status() }; };
  Game.prototype.undo = function () { if (this.pos.un > 0) this.pos.unmake(); };
  Game.prototype.status = function () { return status(this.pos, this.opts); };
  /* 接下來 n 次電腦思考都降 by 級（預設 2 級）；技能、新手保護用 */
  Game.prototype.weakenNext = function (n, by) { this.weakLeft = Math.max(0, n | 0); this.weakBy = by == null ? 2 : by; };
  Game.prototype.think = function (o) {
    o = Object.assign({}, this.opts, o || {}, { searcher: this.searcher });
    if (this.weakLeft > 0) { o.weaken = (o.weaken || 0) + this.weakBy; this.weakLeft--; }
    return bestMove(this.pos, o);
  };

  /* ===================== Worker 用戶端（瀏覽器） ===================== */
  /* XQVar.worker(url)：開 varengine-worker.js，回 {call(cmd,...args)→Promise, terminate()}。同源 worker 在 COEP require-corp 下也能開 */
  function workerClient(url) {
    var w = new Worker(url || "varengine-worker.js"), seq = 0, wait = {};
    w.onmessage = function (e) { var d = e.data || {}, cb = wait[d.id]; if (!cb) return; delete wait[d.id]; if (d.ok) cb[0](d.result); else cb[1](new Error(d.error)); };
    return { call: function (cmd) { var args = Array.prototype.slice.call(arguments, 1); return new Promise(function (res, rej) { var id = ++seq; wait[id] = [res, rej]; w.postMessage({ id: id, cmd: cmd, args: args }); }); }, terminate: function () { w.terminate(); } };
  }

  return {
    VERSION: "2026-11-13",
    START: START, START_FEN: START + " w", NAMES: NAMES, BUDGET: BUDGET, COST: { A: 1, B: 2, N: 3.5, R: 10, C: 6, P: 0.5 }, STACK: { types: "RCN", over: 4, add: 1 }, CHARS: CHARS, STYLES: STYLES, STYLE_LIST: STYLE_LIST, LEVELS: LEVELS, HARD_MS: HARD_MS, MATE: MATE,
    Position: Position, Searcher: Searcher, Game: Game,
    fromFen: fromFen, toFen: toFen, toApp: toApp, fromApp: fromApp, toPos: toPos, sqName: sqName, parseSq: parseSq, mvName: mvName, parseMv: parseMv,
    legalMoves: legalMoves, bestMove: bestMove, isMate: isMate, isStalemate: isStalemate, status: status, levelCfg: levelCfg,
    validateSetup: validateSetup, genSetup: genSetup, dailySetup: dailySetup, charSetup: charSetup, setupCost: setupCost, setupsToFen: setupsToFen, fenToSetups: fenToSetups, charKeyOf: charKeyOf,
    weights: { DEFAULT: DEFAULT_W, set: setWeights, get: function () { return CUR_W; }, vec: function () { return CUR_VEC; }, toVec: weightsToVec, fromVec: vecToWeights, NW: NW, layout: { MAT0: MAT0, PST0: PST0, OCC0: OCC0, MOB0: MOB0, CEMP0: CEMP0, TEMPO0: TEMPO0 } },
    loadWeights: setWeights, features: features,
    worker: workerClient, util: { rng: rng, hashStr: hashStr, gauss: gauss, now: now, taiwanDate: taiwanDate }
  };
});
