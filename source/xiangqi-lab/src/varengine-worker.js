/* 黑洞超展開引擎的 Web Worker 包裝：把 varengine.js 放到背景執行緒跑，畫面不會卡。
   開法（同源 worker；App 開了 COEP require-corp／COOP same-origin，同源的 worker 與 importScripts 都不受影響，不需要 blob:）：
     const vw = XQVar.worker("varengine-worker.js");          // 主執行緒要先載入 varengine.js 才有 XQVar.worker
     const r = await vw.call("bestMove", {fen:"...", moves:[...]}, {level:4});
   或自己 postMessage：{id, cmd, args:[...]} → 回 {id, ok:true, result} 或 {id, ok:false, error:"中文訊息"}。
   指令：ping、weights（args[0]＝權重物件或網址；沒給就讀 data/varengine/weights.json）、bestMove、legalMoves、status、isMate、isStalemate、
         validateSetup、genSetup、dailySetup、charSetup、setupsToFen、newGame／play／think／weakenNext／gameStatus（worker 內保留一盤對局）。
   啟動時自動試著讀 data/varengine/weights.json（訓練結果）；讀不到就用引擎內建的預設權重。 */
"use strict";
(function () {
  var G = typeof self !== "undefined" ? self : globalThis;
  if (typeof G.XQVar === "undefined") G.importScripts("varengine.js");
  var X = G.XQVar, game = null, weightsInfo = "內建預設";
  function loadWeights(src) {
    if (src && typeof src === "object") { X.loadWeights(src); weightsInfo = (src.meta && src.meta.name) || "自訂"; return Promise.resolve(weightsInfo); }
    var url = src || "data/varengine/weights.json";
    if (typeof G.fetch !== "function") return Promise.resolve(weightsInfo);
    return G.fetch(url).then(function (r) { if (!r.ok) throw new Error("讀不到權重檔（" + r.status + "）"); return r.json(); })
      .then(function (w) { X.loadWeights(w); weightsInfo = (w.meta && w.meta.name) || url; return weightsInfo; });
  }
  var ready = loadWeights().catch(function () { return weightsInfo; });
  var CMDS = {
    ping: function () { return { ok: true, version: X.VERSION, weights: weightsInfo }; },
    weights: function (src) { return loadWeights(src); },
    bestMove: function (pos, opts) { return X.bestMove(pos, opts); },
    legalMoves: function (pos, opts) { return X.legalMoves(pos, opts); },
    status: function (pos, opts) { return X.status(pos, opts); },
    isMate: function (pos) { return X.isMate(pos); },
    isStalemate: function (pos) { return X.isStalemate(pos); },
    validateSetup: function (s, opts) { return X.validateSetup(s, opts); },
    genSetup: function (style, opts) { return X.genSetup(style, opts); },
    dailySetup: function (d) { return X.dailySetup(d); },
    charSetup: function (k, opts) { return X.charSetup(k, opts); },
    setupsToFen: function (r, b, t) { return X.setupsToFen(r, b, t); },
    newGame: function (start, opts) { game = new X.Game(start, opts); return { fen: game.fen(), status: game.status() }; },
    play: function (mv) { if (!game) throw new Error("還沒有開新對局（newGame）"); return game.play(mv); },
    think: function (opts) { if (!game) throw new Error("還沒有開新對局（newGame）"); return game.think(opts); },
    weakenNext: function (n, by) { if (!game) throw new Error("還沒有開新對局（newGame）"); game.weakenNext(n, by); return true; },
    gameStatus: function () { if (!game) throw new Error("還沒有開新對局（newGame）"); return { fen: game.fen(), status: game.status() }; }
  };
  G.onmessage = function (e) {
    var d = e.data || {}, id = d.id, f = CMDS[d.cmd];
    if (!f) { G.postMessage({ id: id, ok: false, error: "沒有這個指令：" + d.cmd }); return; }
    ready.then(function () { return f.apply(null, d.args || []); })
      .then(function (result) { G.postMessage({ id: id, ok: true, result: result }); },
        function (err) { G.postMessage({ id: id, ok: false, error: String(err && err.message || err) }); });
  };
})();
