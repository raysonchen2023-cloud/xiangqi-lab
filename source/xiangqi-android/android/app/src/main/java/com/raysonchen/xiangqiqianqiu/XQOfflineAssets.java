package com.raysonchen.xiangqiqianqiu;

// 象棋千秋 Android 單機版（原型 11/18，還沒在手機上跑過）：向 CDN 要的素材，手機裡有就直接用手機裡的。
// Copyright (c) 2026 陳泓昇 (Chen Hung-Sheng)．SPDX-License-Identifier: GPL-3.0-or-later
//
// 為什麼：網頁的 sw.js 對 data/ 一律「先問 CDN（https://xiangqi-cdn.pages.dev/）、不行才問本機」，00-util.js 在本機 404 時也改抓 CDN。
//   單機版把素材放進 install-time 素材包（併進 App 的 assets/public/），有網路時照樣會先去 CDN 抓一次，浪費流量；
//   網路卡住（連得上 Wi-Fi 但出不去）時每個檔還要等 sw.js 的 10 秒逾時。
// 怎麼做：頁面請求（XQWebViewClient）和 Service Worker 請求（MainActivity 的 ServiceWorkerClient）都先問這裡：
//   https://xiangqi-cdn.pages.dev/data/<路徑>，而 assets/public/data/<路徑> 存在 → 直接回本機檔（不上網），網頁程式完全不用改。
//   - <檔>.parts.json（CDN 上切塊的大檔）：手機裡有整檔就回 404，sw.js 會改要整檔，再由這裡回本機整檔
//   - LIVE 名單（開發者回信、每日名單…會在兩版之間更新的）不攔，照舊上網；沒網路時 sw.js 自己退回本機那份
//   - 回應帶 Access-Control-Allow-Origin: * 和 Cross-Origin-Resource-Policy: cross-origin（跟 CDN 的 _headers 一樣），
//     頁面是跨來源隔離（COEP require-corp）＋fetch mode:"cors"，少了這兩個會被擋
//   - engine/ 不處理：原生版本來就不向 CDN 要程式碼（00-util.js xqCdnRel）

import android.content.Context;
import android.content.res.AssetManager;
import android.net.Uri;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Pattern;

final class XQOfflineAssets {

    static final String CDN_HOST = "xiangqi-cdn.pages.dev";

    /** 兩版之間會更新、要先上網拿最新的檔（沒網路時 sw.js 會退回本機那份）。 */
    static final Pattern LIVE = Pattern.compile("^/data/(fixes|banlist|daily-roster|preload|big-books)\\.json$");

    private XQOfflineAssets() {}

    /** 是 CDN 的 data/ 請求、而且手機裡有這個檔，就回本機檔；否則回 null（照原本的路走：上網）。 */
    static WebResourceResponse serve(Context ctx, WebResourceRequest request) {
        if (ctx == null || request == null || request.getUrl() == null) return null;
        Uri u = request.getUrl();
        if (!"https".equals(u.getScheme()) || !CDN_HOST.equals(u.getHost())) return null;
        if (request.getMethod() != null && !"GET".equalsIgnoreCase(request.getMethod())) return null;
        String p = u.getPath();
        if (p == null || !p.startsWith("/data/") || p.contains("..") || LIVE.matcher(p).matches()) return null;
        AssetManager am = ctx.getAssets();
        if (!offline(am)) return null;   // 瘦身版（沒有素材包）照舊上網：手機裡只有倉庫版的少數檔，可能比 CDN 舊
        if (p.endsWith(".parts.json")) {
            String whole = p.substring(0, p.length() - ".parts.json".length());
            if (!exists(am, "public" + whole)) return null;
            return respond(404, "Not Found", "text/plain", new ByteArrayInputStream(new byte[0]));
        }
        try {
            InputStream in = am.open("public" + p, AssetManager.ACCESS_STREAMING);
            return respond(200, "OK", mimeOf(p), in);
        } catch (IOException e) {
            return null;
        }
    }

    /** 單機版才有的標記檔（scripts/make-offline-packs.js 寫進 xq_art 素材包）；查一次就記住。 */
    private static volatile Boolean OFFLINE = null;
    private static boolean offline(AssetManager am) {
        Boolean o = OFFLINE;
        if (o == null) { o = exists(am, "public/xq-offline.json"); OFFLINE = o; }
        return o;
    }

    private static boolean exists(AssetManager am, String path) {
        try (InputStream in = am.open(path, AssetManager.ACCESS_STREAMING)) {
            return true;
        } catch (IOException e) {
            return false;
        }
    }

    private static WebResourceResponse respond(int code, String reason, String mime, InputStream body) {
        Map<String, String> h = new HashMap<>();
        h.put("Access-Control-Allow-Origin", "*");
        h.put("Cross-Origin-Resource-Policy", "cross-origin");
        h.put("Cache-Control", "no-cache");
        h.put("X-XQ-Local", "1");
        return new WebResourceResponse(mime, null, code, reason, h, body);
    }

    static String mimeOf(String p) {
        String s = p.toLowerCase(java.util.Locale.ROOT);
        if (s.endsWith(".json")) return "application/json";
        if (s.endsWith(".webp")) return "image/webp";
        if (s.endsWith(".png")) return "image/png";
        if (s.endsWith(".jpg") || s.endsWith(".jpeg")) return "image/jpeg";
        if (s.endsWith(".svg")) return "image/svg+xml";
        if (s.endsWith(".mp3")) return "audio/mpeg";
        if (s.endsWith(".ogg")) return "audio/ogg";
        if (s.endsWith(".m4a")) return "audio/mp4";
        if (s.endsWith(".mp4")) return "video/mp4";
        if (s.endsWith(".glb")) return "model/gltf-binary";
        if (s.endsWith(".woff2")) return "font/woff2";
        if (s.endsWith(".ttf")) return "font/ttf";
        if (s.endsWith(".otf")) return "font/otf";
        if (s.endsWith(".txt") || s.endsWith(".md")) return "text/plain";
        return "application/octet-stream";
    }
}
