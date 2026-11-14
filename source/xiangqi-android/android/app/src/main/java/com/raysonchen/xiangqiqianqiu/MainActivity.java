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

    @Override
    protected void load() {
        // 允許清單要在頁面載入「之前」設；BridgeActivity.load() 會建立 Bridge 並開始載入網址。
        WebView wv = findViewById(com.getcapacitor.android.R.id.webview);
        if (wv != null) isolationAllowlisted = allowCrossOriginIsolation(wv);
        super.load();
        // 換成會補標頭的 WebViewClient，然後從頭載入一次，確保第一個文件回應就帶 Document-Isolation-Policy。
        if (bridge != null) {
            bridge.setWebViewClient(new XQWebViewClient(bridge));
            installServiceWorkerClient(bridge);
            bridge.getWebView().stopLoading();
            bridge.getWebView().loadUrl(bridge.getAppUrl());
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
                return XQWebViewClient.addIsolationHeaders(request, bridge.getLocalServer().shouldInterceptRequest(request));
            }
        });
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
