/* 象棋千秋 iOS 原生橋接（Capacitor）
   copy-www.js 會在 www/index.html 的 <meta charset> 後面插入：
     <script src="capacitor.js"></script>       ← @capacitor/core 的瀏覽器版（提供 capacitorExports.registerPlugin）
     <script src="native-bridge.js"></script>   ← 這個檔
   所以這個檔比 App 自己的程式（m.html 組出來的 index.html、core.js、engine.js、net.js…）都早執行。

   在網頁版（不是原生 App）什麼都不做，只設 window.XQ_NATIVE=false。
   在原生 App 裡做這幾件事，不必改 xiangqi-db/m/*.js 就能生效：
     1. window.XQ_NATIVE=true、window.XQNative（給之後的修補檔呼叫）。
     2. 關掉 service worker（原生版的檔都在安裝包裡；sw.js 會把 data/、engine/ 改去 CDN 拿，原生版不要）。
     3. 藏起 Cache Storage（window.caches）：網頁版把圖、引擎、大師棋譜另存一份在快取；原生版檔案本來就在手機裡，
        再存一份會多佔 600 MB 以上。09b-preload.js 看到沒有 caches 就直接進首頁、不跑「研墨鋪紙」預先下載。
     4. 震動：iPhone 的 WKWebView 沒有 navigator.vibrate，這裡補一個，改呼叫 iOS 觸覺回饋（Haptics）。
        07hp-haptics.js 的 hapSupport() 就會回 "vibrate"，落子、吃子、將軍、走不了、勝負各有不同觸感。
     5. 分享與存檔：navigator.share 改走 iOS 分享面板（@capacitor/share，可附檔案）；
        <a download href="blob:…"> 的下載（存檔、週報圖、成績圖、棋譜匯出、健康紀錄）WKWebView 本來不會動，
        這裡攔下來，寫進暫存資料夾再開分享面板（可選「儲存到檔案」）。
     6. 停權名單 data/banlist.json 一律上網抓 GitHub 上最新的（安裝包裡不放）；data/fixes.json 先抓 CDN 最新的，抓不到用安裝包裡的。
        本機沒有的 data/ 檔：本機伺服器回 404 時 00-util.js 本來就會改抓 CDN；這裡再補「連線錯誤」的情況（capacitor:// 模式）。
        engine/ 不補（11/17 審查指南 2.5.2：可執行的程式碼只用安裝包裡的，00-util.js 在原生版也一樣只補 data/）。
     7. 啟動畫面：網頁畫好就收起原生啟動畫面。
     8. 切到背景時把存檔寫入（XQSave.flush），回前景時發 xq-native-resume 事件。
     9. 每日同題提醒（本機通知，預設關）：XQNative.daily.enable(時, 分)／disable()／status()，設定頁的開關由修補檔加。
   規則：不呼叫任何外部 AI、不送任何資料；只用官方 @capacitor/* 外掛。 */
(function () {
  "use strict";
  var C = window.Capacitor;
  var NATIVE = !!(C && typeof C.isNativePlatform === "function" && C.isNativePlatform());
  window.XQ_NATIVE = NATIVE;
  if (!NATIVE) return;

  var CDN = "https://xiangqi-cdn.pages.dev/";
  var GH = "https://raysonchen2023-cloud.github.io/xiangqi-lab/";
  var BASE = new URL("./", location.href);

  var plugins = {};
  function plug(name) {
    if (plugins[name] !== undefined) return plugins[name];
    var p = null;
    try {
      if (window.capacitorExports && typeof capacitorExports.registerPlugin === "function") p = capacitorExports.registerPlugin(name);
      else if (C.Plugins && C.Plugins[name]) p = C.Plugins[name];
    } catch (e) { p = null; }
    plugins[name] = p;
    return p;
  }
  function has(name) {
    try { return typeof C.isPluginAvailable === "function" ? C.isPluginAvailable(name) : !!plug(name); } catch (e) { return false; }
  }
  function log(m) { try { console.log("[XQNative] " + m); } catch (e) {} }

  var XQNative = window.XQNative = {
    platform: (function () { try { return C.getPlatform(); } catch (e) { return "ios"; } })(),
    origin: location.origin,
    isolated: !!self.crossOriginIsolated,
    plug: plug,
    has: has
  };

  /* ---------- 2. 關掉 service worker ---------- */
  try {
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
      navigator.serviceWorker.getRegistrations().then(function (rs) { rs.forEach(function (r) { r.unregister(); }); }).catch(function () {});
    }
  } catch (e) {}
  /* 把屬性從原型鏈上拿掉（WebIDL 的屬性都可刪）；萬一刪不掉，換成 fallback（不能是 undefined：
     02-shell.js 用 "serviceWorker" in navigator 判斷後直接呼叫 register，undefined 會讓整段程式出錯） */
  function hide(obj, key, fallback) {
    try {
      var o = obj;
      while (o && !Object.prototype.hasOwnProperty.call(o, key)) o = Object.getPrototypeOf(o);
      if (o) delete o[key];
    } catch (e) {}
    try { if (key in obj) Object.defineProperty(obj, key, { value: fallback, configurable: true }); } catch (e) {}
  }
  var swStub = {
    controller: null,
    ready: new Promise(function () {}),
    register: function () { return Promise.reject(new Error("原生 App 不用 service worker")); },
    getRegistration: function () { return Promise.resolve(undefined); },
    getRegistrations: function () { return Promise.resolve([]); },
    addEventListener: function () {},
    removeEventListener: function () {}
  };
  hide(navigator, "serviceWorker", swStub);

  /* ---------- 3. 藏起 Cache Storage ---------- */
  hide(window, "caches", undefined);

  /* ---------- 6. 網路：停權名單、修正通知、本機缺檔 ---------- */
  var f0 = window.fetch;
  function relOf(u) {
    if (u.origin !== location.origin) return "";
    var b = BASE.pathname;
    return u.pathname.indexOf(b) === 0 ? decodeURI(u.pathname.slice(b.length)) : "";
  }
  if (f0) {
    window.fetch = function (input, init) {
      var self = this, args = arguments, rel = "", u = null;
      try {
        u = new URL(typeof input === "string" ? input : (input && input.url) || String(input), location.href);
        rel = relOf(u);
      } catch (e) { rel = ""; }
      if (rel === "data/banlist.json") {
        return f0.call(window, GH + "data/banlist.json" + (u.search || ""), { cache: "no-store", mode: "cors", credentials: "omit" });
      }
      if (rel === "data/fixes.json") {
        return f0.call(window, CDN + "data/fixes.json?t=" + Date.now(), { cache: "no-store", mode: "cors", credentials: "omit" })
          .then(function (r) { return r.ok ? r : f0.apply(self, args); }, function () { return f0.apply(self, args); });
      }
      var p = f0.apply(self, args);
      /* 11/17 App Store 審查（測試員 E，指南 2.5.2）：只替 data/（圖、聲音、資料）向 CDN 補抓；
         engine/（wasm、引擎 js）是可執行的程式碼，一律只用安裝包裡的，抓不到就照原本的錯誤回報，不改去網路下載 */
      if (/^data\//.test(rel)) {
        p = p.catch(function (err) {
          return f0.call(window, CDN + rel.split("/").map(encodeURIComponent).join("/"), { mode: "cors", credentials: "omit" })
            .then(function (r) { if (r.ok) return r; throw err; });
        });
      }
      return p;
    };
  }

  /* ---------- 4. 震動 → iOS 觸覺回饋 ---------- */
  var KNOWN = {
    "15": [["i", "LIGHT", 0]],
    "25,40,25": [["i", "MEDIUM", 0], ["i", "MEDIUM", 65]],
    "40,50,40,50,120": [["n", "WARNING", 0]],
    "10,30,10,30,10": [["i", "LIGHT", 0], ["i", "LIGHT", 40], ["i", "LIGHT", 80]],
    "30,40,30,40,30,40,200": [["n", "SUCCESS", 0]],
    "300": [["n", "ERROR", 0]],
    "80,80,80": [["i", "MEDIUM", 0], ["i", "MEDIUM", 160]],
    "120,60,300": [["i", "HEAVY", 0], ["i", "HEAVY", 180]]
  };
  var vibTimers = [];
  function hapRun(step) {
    var H = plug("Haptics");
    if (!H) return;
    try {
      if (step[0] === "n") H.notification({ type: step[1] }).catch(function () {});
      else H.impact({ style: step[1] }).catch(function () {});
    } catch (e) {}
  }
  function nativeVibrate(pattern) {
    vibTimers.forEach(clearTimeout);
    vibTimers = [];
    var P = Array.isArray(pattern) ? pattern.map(function (x) { return Math.max(0, +x || 0); }) : [Math.max(0, +pattern || 0)];
    if (!P.length || (P.length === 1 && P[0] === 0)) return true;
    var steps = KNOWN[P.join(",")];
    if (!steps) {
      steps = [];
      var t = 0;
      for (var i = 0; i < P.length; i++) {
        if (i % 2 === 0 && P[i] > 0) steps.push(["i", P[i] < 20 ? "LIGHT" : P[i] < 60 ? "MEDIUM" : "HEAVY", t]);
        t += P[i];
      }
    }
    steps.forEach(function (s) {
      if (s[2] === 0) hapRun(s);
      else vibTimers.push(setTimeout(function () { hapRun(s); }, s[2]));
    });
    return true;
  }
  if (typeof navigator.vibrate !== "function" && has("Haptics")) {
    try { Object.defineProperty(Navigator.prototype, "vibrate", { value: nativeVibrate, configurable: true, writable: true }); }
    catch (e) { try { navigator.vibrate = nativeVibrate; } catch (e2) {} }
  }
  XQNative.haptic = nativeVibrate;

  /* ---------- 5. 分享與存檔 ---------- */
  function blobToB64(blob) {
    return new Promise(function (ok, bad) {
      var r = new FileReader();
      r.onload = function () { var s = String(r.result || ""); ok(s.slice(s.indexOf(",") + 1)); };
      r.onerror = function () { bad(r.error); };
      r.readAsDataURL(blob);
    });
  }
  function safeName(n) {
    n = String(n || "file").replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").slice(0, 120);
    return n || "file";
  }
  function writeTemp(blob, name) {
    var FS = plug("Filesystem");
    if (!FS) return Promise.reject(new Error("沒有 Filesystem 外掛"));
    return blobToB64(blob).then(function (b64) {
      return FS.writeFile({ path: "xq-share/" + Date.now() + "-" + safeName(name), data: b64, directory: "CACHE", recursive: true });
    }).then(function (r) { return r.uri; });
  }
  function abortErr() {
    try { return new DOMException("Share canceled", "AbortError"); } catch (e) { var x = new Error("Share canceled"); x.name = "AbortError"; return x; }
  }
  function nativeShare(data) {
    data = data || {};
    var SH = plug("Share");
    if (!SH) return Promise.reject(new Error("沒有 Share 外掛"));
    var files = data.files && data.files.length ? Array.prototype.slice.call(data.files) : [];
    return Promise.all(files.map(function (f) { return writeTemp(f, f.name || "file"); })).then(function (uris) {
      var o = {};
      if (data.title) { o.title = String(data.title); o.dialogTitle = String(data.title); }
      if (data.text) o.text = String(data.text);
      if (data.url) o.url = String(data.url);
      if (uris.length) o.files = uris;
      return SH.share(o);
    }).then(function () { return undefined; }, function (e) {
      var m = String((e && (e.message || e.errorMessage)) || e || "");
      if (/cancel/i.test(m)) throw abortErr();
      throw e;
    });
  }
  if (has("Share")) {
    try {
      Object.defineProperty(Navigator.prototype, "share", { value: nativeShare, configurable: true, writable: true });
      Object.defineProperty(Navigator.prototype, "canShare", { value: function (d) { return !!(d && (d.text || d.url || d.title || (d.files && d.files.length))); }, configurable: true, writable: true });
    } catch (e) { log("share 補不上：" + e.message); }
  }
  XQNative.share = nativeShare;
  /* <a download> 攔截：blob:／data: 連結 → 暫存檔 → 分享面板（可「儲存到檔案」） */
  XQNative.saveBlob = function (blob, name) {
    return nativeShare({ files: [new File([blob], safeName(name), { type: blob.type || "application/octet-stream" })], title: name });
  };
  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest("a[download]") : null;
    if (!a) return;
    var href = a.getAttribute("href") || "";
    if (!/^(blob:|data:)/.test(href)) return;
    e.preventDefault();
    e.stopPropagation();
    var name = a.getAttribute("download") || "xiangqi-file";
    f0.call(window, href).then(function (r) { return r.blob(); }).then(function (b) { return XQNative.saveBlob(b, name); })
      .catch(function (err) { if (!err || err.name !== "AbortError") log("存檔失敗：" + (err && err.message)); });
  }, true);

  /* ---------- 7. 啟動畫面 ---------- */
  var splashDone = false;
  function hideSplash() {
    if (splashDone) return;
    splashDone = true;
    var S = plug("SplashScreen");
    if (S) try { S.hide({ fadeOutDuration: 250 }).catch(function () {}); } catch (e) {}
  }
  document.addEventListener("DOMContentLoaded", function () {
    var P = window.PRE_FIRST;
    if (P && typeof P.then === "function") P.then(hideSplash, hideSplash);
    setTimeout(hideSplash, 1500);
  });

  /* ---------- 8. 前景／背景 ---------- */
  var App = plug("App");
  if (App) {
    try {
      App.addListener("appStateChange", function (st) {
        var active = !!(st && st.isActive);
        if (!active) { try { if (window.XQSave && XQSave.flush) XQSave.flush(function () {}); } catch (e) {} }
        else { try { dispatchEvent(new CustomEvent("xq-native-resume")); } catch (e) {} }
      });
    } catch (e) {}
  }

  /* ---------- 9. 每日同題提醒（本機通知，預設關） ---------- */
  var DAILY_ID = 1001;
  var LN = function () { return plug("LocalNotifications"); };
  XQNative.daily = {
    enable: function (hour, minute) {
      var N = LN();
      if (!N) return Promise.resolve({ ok: false, why: "沒有通知外掛" });
      hour = Math.max(0, Math.min(23, hour | 0)); minute = Math.max(0, Math.min(59, minute | 0));
      return N.requestPermissions().then(function (p) {
        if (!p || p.display !== "granted") return { ok: false, why: "沒有通知權限（可到「設定」App → 通知 → 象棋千秋 打開）" };
        return N.cancel({ notifications: [{ id: DAILY_ID }] }).catch(function () {}).then(function () {
          return N.schedule({ notifications: [{
            id: DAILY_ID,
            title: "象棋千秋・每日同題",
            body: "今天的題目出來了，挑一口、一盞或一壺來解吧。",
            schedule: { on: { hour: hour, minute: minute }, allowWhileIdle: true },
            extra: { hash: "#/daily" }
          }] });
        }).then(function () { return { ok: true, hour: hour, minute: minute }; });
      });
    },
    disable: function () {
      var N = LN();
      return N ? N.cancel({ notifications: [{ id: DAILY_ID }] }).then(function () { return { ok: true }; }, function () { return { ok: true }; }) : Promise.resolve({ ok: false });
    },
    status: function () {
      var N = LN();
      if (!N) return Promise.resolve({ on: false });
      return N.getPending().then(function (r) {
        var x = (r && r.notifications || []).filter(function (n) { return n.id === DAILY_ID; })[0];
        return { on: !!x, schedule: x ? x.schedule : null };
      }, function () { return { on: false }; });
    }
  };
  if (LN()) {
    try {
      LN().addListener("localNotificationActionPerformed", function (ev) {
        var h = ev && ev.notification && ev.notification.extra && ev.notification.extra.hash;
        if (h && /^#\/[\w\/-]*$/.test(h)) location.hash = h;
      });
    } catch (e) {}
  }

  /* ---------- 其他：App 載入後修正兩個「看快取判斷」的小地方 ---------- */
  addEventListener("load", function () {
    /* 原生版引擎檔在安裝包裡：local.js 的 engineCached() 原本看 Cache Storage */
    try { if (window.XQ && typeof XQ.engineCached === "function") XQ.engineCached = function () { return Promise.resolve(true); }; } catch (e) {}
    /* 「關於」頁的版本：網頁版看 service worker 快取名稱，原生版改看建置時寫進頁面的 XQ_BUILD */
    try { if (typeof window.appVer === "function" && window.XQ_BUILD) window.appVer = function () { return Promise.resolve(window.XQ_BUILD); }; } catch (e) {}
    XQNative.isolated = !!self.crossOriginIsolated;
    log("載入完成：origin=" + location.origin + "、crossOriginIsolated=" + self.crossOriginIsolated + "、SharedArrayBuffer=" + (typeof SharedArrayBuffer));
  });
})();
