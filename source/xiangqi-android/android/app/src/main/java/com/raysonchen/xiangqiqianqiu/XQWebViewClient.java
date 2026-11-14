package com.raysonchen.xiangqiqianqiu;

// 象棋千秋 Android 版：替 App 自己的檔案回應補上隔離標頭。
// Copyright (c) 2026 陳泓昇 (Chen Hung-Sheng)．SPDX-License-Identifier: GPL-3.0-or-later
//
// 狀態（2026-11-13）：已編譯通過（debug APK 可逐位元重現，見 build-records/）；在 Android 模擬器（WebView 154）上驗過，
// 清掉 App 資料後連續冷啟動，crossOriginIsolated 每次都是 true、引擎會回著；還沒在真機上跑過。
// Capacitor 的 WebViewLocalServer 會把 https://localhost/... 換成安裝包裡 assets/public/ 的檔案，
// 但沒有設定可以加自訂標頭；所以在它回傳之後補上 ISOLATION_HEADERS 這一組：
//   Document-Isolation-Policy: isolate-and-require-corp   （配合 MainActivity 的允許清單，開 SharedArrayBuffer）
//   Cross-Origin-Opener-Policy／Cross-Origin-Embedder-Policy （跟網頁版 sw.js 一致，WebView 本身不靠這兩個）
//   Cross-Origin-Resource-Policy: same-origin              （自己的檔案給自己用）
// 頁面發的請求走這個 WebViewClient；Service Worker 發的請求走 MainActivity 設的 ServiceWorkerClient，
// 兩邊都呼叫 addIsolationHeaders()，標頭清單只有這裡一份。
// 只動 App 自己來源的回應；跨站（CDN 補檔）的回應不經過這裡，CDN 的 _headers 已帶 CORP: cross-origin。

import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebViewClient;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;

public class XQWebViewClient extends BridgeWebViewClient {

    /** App 自己來源的每個回應都要帶的標頭（WebViewClient 和 ServiceWorkerClient 共用，只在這裡改）。 */
    static final Map<String, String> ISOLATION_HEADERS;

    static {
        Map<String, String> h = new LinkedHashMap<>();
        h.put("Document-Isolation-Policy", "isolate-and-require-corp");
        h.put("Cross-Origin-Opener-Policy", "same-origin");
        h.put("Cross-Origin-Embedder-Policy", "require-corp");
        h.put("Cross-Origin-Resource-Policy", "same-origin");
        ISOLATION_HEADERS = Collections.unmodifiableMap(h);
    }

    public XQWebViewClient(Bridge bridge) {
        super(bridge);
    }

    @Override
    public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        return addIsolationHeaders(request, super.shouldInterceptRequest(view, request));
    }

    /**
     * 回應是 App 自己來源（https://localhost）的，就補上 ISOLATION_HEADERS；其他來源、沒有回應的照原樣回傳。
     * 頁面請求（上面的 shouldInterceptRequest）和 Service Worker 請求（MainActivity 的 ServiceWorkerClient）都走這裡。
     */
    static WebResourceResponse addIsolationHeaders(WebResourceRequest request, WebResourceResponse r) {
        if (r == null || request == null || request.getUrl() == null) return r;
        String origin = request.getUrl().getScheme() + "://" + request.getUrl().getHost();
        if (!MainActivity.APP_ORIGIN.equals(origin)) return r;
        Map<String, String> h = r.getResponseHeaders() == null ? new HashMap<>() : new HashMap<>(r.getResponseHeaders());
        h.putAll(ISOLATION_HEADERS);
        r.setResponseHeaders(h);
        return r;
    }
}
