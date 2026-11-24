package com.raysonchen.xiangqiqianqiu;

// 象棋千秋 Android 版的主畫面（Capacitor BridgeActivity）。
// Copyright (c) 2026 陳泓昇 (Chen Hung-Sheng)．SPDX-License-Identifier: GPL-3.0-or-later
//
// 狀態（2026-11-13）：已用 Temurin JDK 21.0.13＋AGP 8.13.0＋compileSdk 36 編譯通過（debug APK 可逐位元重現，
// 見 build-records/），API 用 javap 對過 androidx.webkit 1.18.0 的 Profile／WebViewFeature；
// 在 Android 模擬器（WebView 154）上驗過跨來源隔離和引擎；還沒在真機上跑過。
// 做的事：讓 Pikafish 多執行緒 WebAssembly 需要的 SharedArrayBuffer 在 Android WebView 裡能用。
//   1. Android WebView 不支援 COOP/COEP 的跨來源隔離（WebView 沒有渲染程序隔離），網頁版 sw.js 那一套沒用。
//   2. androidx.webkit 1.18.0（2026-10-21）新增 Profile#setCrossOriginIsolatedAllowlist：
//      把 App 自己的來源 https://localhost 加進允許清單，再由每個回應帶 Document-Isolation-Policy 標頭，
//      頁面就能用 SharedArrayBuffer（官方文件：只能放自己信任的來源）。
//   3. 「每個回應」包含 Service Worker 發的請求：見 load() 裡的 ServiceWorkerClient。
//   4. 舊版 WebView 沒有這個功能（WebViewFeature.CROSS_ORIGIN_ISOLATED_ALLOWLIST 回 false）時，
//      引擎會載入失敗；備案見 xiangqi-db/art/docs/android.md〈引擎多執行緒〉（原生 Pikafish 或單執行緒版）。
// 來源要固定：存檔（localStorage、IndexedDB）跟著 https://localhost 走，上架後不能改 server.hostname／androidScheme。

import android.os.Bundle;
import android.webkit.ServiceWorkerClient;
import android.webkit.ServiceWorkerController;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import androidx.webkit.Profile;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Logger;
import java.util.Collections;

public class MainActivity extends BridgeActivity {

    /** App 自己的來源（capacitor.config.json 的 server.androidScheme＋hostname）。 */
    static final String APP_ORIGIN = "https://localhost";

    /** 隔離有沒有設成功；native-bridge 之後可以讀這個值決定要不要顯示「引擎不能用」的說明。 */
    static boolean isolationAllowlisted = false;

    /**
     * 最小的 XQNative 橋（11/18）：網頁 01-board.js 的 ttsNat() 用 XQNative.has("XQSpeech")／plug("XQSpeech") 判斷有沒有原生朗讀。
     * iOS 由 native-bridge.js 提供完整的 XQNative；Android 只需要這兩個，用文件開始注入，不改 index.html（保持跟 source/ 組出來的一致）。
     * 不設 XQ_NATIVE（Android 版靠瀏覽器識別字串 XQQianqiuApp/ 判斷原生，別的 iOS 專屬功能都有先檢查存在才呼叫）。
     */
    static final String NATIVE_BRIDGE_JS =
        "(function(){if(window.XQNative)return;"
        + "var P=function(n){try{var C=window.Capacitor;return C&&C.Plugins&&C.Plugins[n]||null}catch(e){return null}};"
        + "window.XQNative={android:true,plug:P,has:function(n){try{var C=window.Capacitor;"
        + "return!!(C&&typeof C.isPluginAvailable==='function'?C.isPluginAvailable(n):P(n))}catch(e){return false}}};})();";

    /**
     * W88（11/24）：清舊網頁版留下的 xqlab-app- 程式快取，並擋掉 Service Worker 註冊。
     * 為什麼要這一段：變體原本靠 capacitor.config.json 的 appStartPath 先開遷移頁清快取，但 capacitor sync 會照專案根目錄的設定重產這個檔，
     * appStartPath 被蓋掉（26112104、26112301 的安裝包裡都沒有），遷移頁從來沒跑過；舊快取其實是舊 Worker 接管頁面後才被清。
     * 現在 WebView 啟動前就刪了註冊（purgeServiceWorkerRegistrations），頁面不會被接管，所以這裡直接清。
     * 只刪 xqlab-app- 開頭的；素材（xqlab-look 等）、引擎、存檔都不動。不用 reload：註冊已經不在，這一頁本來就是本機檔。
     */
    static final String RETIRE_CACHE_JS = "(function(){try{"
        + "if(location.origin!=='https://localhost'||window.top!==window||window.__xqRetiredCache)return;window.__xqRetiredCache=true;"
        + "if('serviceWorker' in navigator)Object.defineProperty(navigator.serviceWorker,'register',{configurable:true,value:function(){return Promise.reject(new Error('Native app does not use a service worker'))}});"
        + "if('caches' in window)caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k.indexOf('xqlab-app-')===0}).map(function(k){return caches.delete(k)}))})"
        + ".catch(function(e){console.warn('[native] old app cache cleanup failed',String(e))});"
        + "}catch(e){console.warn('[native] old app cache cleanup failed',String(e))}})();";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        purgeServiceWorkerRegistrations(getDataDir());   // 要在 super.onCreate 建立 WebView 之前
        registerPlugin(XQSpeechPlugin.class);   // 要在 super.onCreate 之前註冊，Bridge 建立時才會載入
        super.onCreate(savedInstanceState);
    }

    /**
     * W88（11/24 P0-UPD）：從 1740 那一代（≤26111817，網頁版留下 Service Worker）升級，第一次冷啟舊 Worker 還在接管、顯示舊版，
     * 要第二次冷啟才好（Play 現行 26112104 也一樣）。遷移頁是在「已經被舊 Worker 接管的頁面」裡登出再換頁，跟舊 Worker 交棒有時間差。
     * 原生版從來不用 Service Worker，所以在 WebView 啟動之前，直接刪掉 WebView 的 Service Worker 註冊資料（Database、ScriptCache）：
     * 沒有註冊，第一個文件就由 App 本機檔回應。不刪 CacheStorage（素材、CDN 補檔、引擎快取還要用）；舊的 xqlab-app- 程式快取由 RETIRE_CACHE_JS 清。
     * 沒有這個資料夾（新安裝）就什麼都不做。共用版 source/xiangqi-android 的 MainActivity 也有同一段。
     */
    static int purgeServiceWorkerRegistrations(java.io.File dataDir) {
        int n = 0;
        try {
            java.io.File sw = new java.io.File(dataDir, "app_webview/Default/Service Worker");
            for (String sub : new String[] {"Database", "ScriptCache"}) n += deleteTree(new java.io.File(sw, sub));
        } catch (RuntimeException e) {
            Logger.error("XQ", "清除舊 Service Worker 註冊失敗（改由遷移頁清）", e);
        }
        return n;
    }

    static int deleteTree(java.io.File f) {
        if (!f.exists()) return 0;
        int n = 0;
        java.io.File[] kids = f.isDirectory() ? f.listFiles() : null;
        if (kids != null) for (java.io.File k : kids) n += deleteTree(k);
        return f.delete() ? n + 1 : n;
    }

    @Override
    protected void load() {
        // 允許清單要在頁面載入「之前」設；BridgeActivity.load() 會建立 Bridge 並開始載入網址。
        WebView wv = findViewById(com.getcapacitor.android.R.id.webview);
        if (wv != null) isolationAllowlisted = allowCrossOriginIsolation(wv);
        super.load();
        // Capacitor 首頁是遷移頁。遊戲頁由 XQWebViewClient 在遷移完成後載入。
        if (bridge != null) {
            bridge.setWebViewClient(new XQWebViewClient(bridge));
            installServiceWorkerClient(bridge);
            installNativeBridge(bridge.getWebView());
            XQBackHandler.install(this, bridge);   /* W100：返回鍵先交給網頁回上一頁，首頁才收到背景（變體覆蓋 MainActivity 時也要有這一行） */
        }
    }

    /**
     * Service Worker 的請求也要補隔離標頭。
     * 為什麼：Service Worker（網站的 sw.js）發出的請求不經過 WebViewClient，而是走 ServiceWorkerController 的
     * ServiceWorkerClient；Capacitor 8.6.2 的 Bridge 自己設了一個，只把請求交給本機伺服器、不加標頭。
     * sw.js 安裝時把頁面存進快取，那份快取就沒有 Document-Isolation-Policy；第二次開 App 起頁面從快取來，
     * crossOriginIsolated 變成 false、引擎載不起來（11/13 模擬器 WebView 154 上重現過）。
     * 怎麼補：換成自己的 ServiceWorkerClient，一樣交給 Capacitor 的本機伺服器，再呼叫
     * XQWebViewClient.addIsolationHeaders() 補同一組 ISOLATION_HEADERS（標頭清單只在 XQWebViewClient 一份）。
     * 要在 super.load() 之後設，才會蓋掉 Bridge 設的那個；跟 Capacitor 一樣看 server.resolveServiceWorkerRequests 設定。
     */
    static void installServiceWorkerClient(final Bridge bridge) {
        if (!bridge.getConfig().isResolveServiceWorkerRequests()) return;
        ServiceWorkerController.getInstance().setServiceWorkerClient(new ServiceWorkerClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebResourceRequest request) {
                // W21 全離線包：向 CDN 要、手機裡有的素材直接回本機檔（XQOfflineAssets，移植自 193 單機版）
                WebResourceResponse local = XQOfflineAssets.serve(bridge.getContext(), request);
                if (local != null) return local;
                WebResourceResponse cdn = XQCdnFallback.serve(bridge.getContext(), request);
                if (cdn != null) return cdn;
                return XQWebViewClient.addIsolationHeaders(request, bridge.getLocalServer().shouldInterceptRequest(request));
            }
        });
    }

    /** 文件一開始就注入 NATIVE_BRIDGE_JS（只給 App 自己的來源）；WebView 不支援就靠 XQWebViewClient.onPageFinished 補。 */
    static void installNativeBridge(WebView wv) {
        try {
            if (wv != null && WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
                WebViewCompat.addDocumentStartJavaScript(wv, NATIVE_BRIDGE_JS, Collections.singleton(APP_ORIGIN));
                WebViewCompat.addDocumentStartJavaScript(wv, RETIRE_CACHE_JS, Collections.singleton(APP_ORIGIN));
            }
        } catch (RuntimeException e) {
            Logger.error("XQ", "注入 XQNative 橋失敗（改由頁面載完時補）", e);
        }
    }

    static boolean allowCrossOriginIsolation(WebView wv) {
        try {
            if (!WebViewFeature.isFeatureSupported(WebViewFeature.MULTI_PROFILE)) return false;
            if (!WebViewFeature.isFeatureSupported(WebViewFeature.CROSS_ORIGIN_ISOLATED_ALLOWLIST)) return false;
            Profile p = WebViewCompat.getProfile(wv);
            p.setCrossOriginIsolatedAllowlist(Collections.singleton(APP_ORIGIN));
            return true;
        } catch (RuntimeException e) {
            Logger.error("XQ", "設定跨來源隔離允許清單失敗", e);
            return false;
        }
    }
}
