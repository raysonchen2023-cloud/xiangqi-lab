package com.raysonchen.xiangqiqianqiu;

// 象棋千秋 Android 封測小包：安裝包裡沒有的 data/ 素材，由原生層向 CDN 下載、存進手機快取再交給網頁。
// Copyright (c) 2026 陳泓昇 (Chen Hung-Sheng)．SPDX-License-Identifier: GPL-3.0-or-later
//
// 為什麼（W21 小包，2026-11-21）：AppConsoleLab 要求封測包約 100 MB，大圖、音樂、3D 只能放 CDN。
//   網頁原本的補抓只在 <img> 載入失敗、fetch 回 404 時改向 CDN 要；CSS 背景圖、部分改過網址的圖（渡口）補不到，連線也破圖。
// 怎麼做：頁面請求 https://localhost/data/<路徑>，安裝包裡沒有這個檔時，在這裡向 https://xiangqi-cdn.pages.dev/data/<路徑> 下載，
//   寫進 App 快取資料夾 xq-cdn/，以同源回應交給網頁；所有載入方式（img、CSS 背景、SVG image、fetch、音訊）都一樣補到。
//   - 只處理 data/：engine/ 等程式碼一律只用安裝包裡的（原生版不從網路抓程式碼）
//   - 下載過的檔下次直接用快取，離線也看得到；系統清快取後再連線重抓
//   - 兩版之間會更新的名單（XQOfflineAssets.LIVE）每次先上網，拿不到才用快取
//   - CDN 也沒有（或沒網路又沒快取）就回 null，照原本的路走（本機伺服器回 404，網頁照舊處理）

import android.content.Context;
import android.content.res.AssetManager;
import android.net.Uri;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.DigestOutputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Pattern;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

final class XQCdnFallback {

    static final String CDN = "https://xiangqi-cdn.pages.dev";

    private XQCdnFallback() {}

    static WebResourceResponse serve(Context ctx, WebResourceRequest request) {
        if (ctx == null || request == null || request.getUrl() == null) return null;
        Uri u = request.getUrl();
        if (!"https".equals(u.getScheme()) || !"localhost".equals(u.getHost())) return null;
        if (request.getMethod() != null && !"GET".equalsIgnoreCase(request.getMethod())) return null;
        String p = u.getPath();
        if (p == null || !p.startsWith("/data/") || p.contains("..") || p.endsWith("/")) return null;
        if (inPackage(ctx.getAssets(), "public" + p)) return null;   // 安裝包裡有：交給 Capacitor 本機伺服器
        File f = new File(new File(ctx.getCacheDir(), "xq-cdn"), p.substring(1));
        boolean live = XQOfflineAssets.LIVE.matcher(p).matches();
        if (!live && f.isFile() && f.length() > 0) return fileResponse(p, f);
        File tmp = null;
        try {
            File dir = f.getParentFile();
            if (dir != null && !dir.isDirectory() && !dir.mkdirs() && !dir.isDirectory()) return null;
            tmp = File.createTempFile(f.getName(), ".part", dir);
            boolean ok;
            try (OutputStream out = new FileOutputStream(tmp)) {
                long n = fetchTo(CDN + p, out);
                // W30（11/21）：超過 20 MB 的檔在 CDN 上切塊（tools/cdn-deploy.js），整檔網址回 404，改照 <檔名>.parts.json 依序接回
                ok = n > 0 || (n == -404 && fetchParts(p, out));
            }
            if (!ok || tmp.length() == 0 || (!tmp.renameTo(f) && !(f.delete() && tmp.renameTo(f)))) {
                tmp.delete();
                return f.isFile() && f.length() > 0 ? fileResponse(p, f) : null;
            }
            return fileResponse(p, f);
        } catch (IOException | RuntimeException e) {
            if (tmp != null) tmp.delete();
            return f.isFile() && f.length() > 0 ? fileResponse(p, f) : null;
        }
    }

    /** 下載 url 寫進 out：成功回寫入的位元組數（≥0），HTTP 不是 200 回負的狀態碼。 */
    private static long fetchTo(String url, OutputStream out) throws IOException {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(10000);
        c.setReadTimeout(30000);
        c.setRequestProperty("Accept-Encoding", "identity");
        try {
            int code = c.getResponseCode();
            if (code != 200) return -code;
            long total = 0;
            try (InputStream in = c.getInputStream()) {
                byte[] buf = new byte[64 * 1024];
                int n;
                while ((n = in.read(buf)) > 0) { out.write(buf, 0, n); total += n; }
            }
            return total;
        } finally {
            c.disconnect();
        }
    }

    /**
     * W30：讀 CDN 上的 <路徑>.parts.json（{"size","sha1","parts":[{"f","size"}]}），把各塊照順序接到 out，
     * 總大小與 SHA-1 都要跟清單一致才算成功（跟網頁版 sw.js 的分塊讀法一樣）；塊檔名只准字母數字與 ._-。
     */
    private static boolean fetchParts(String p, OutputStream out) throws IOException {
        ByteArrayOutputStream js = new ByteArrayOutputStream();
        if (fetchTo(CDN + p + ".parts.json", js) <= 0) return false;
        try {
            JSONObject m = new JSONObject(js.toString("UTF-8"));
            JSONArray parts = m.getJSONArray("parts");
            if (parts.length() == 0) return false;
            MessageDigest md = MessageDigest.getInstance("SHA-1");
            DigestOutputStream d = new DigestOutputStream(out, md);
            String base = CDN + p.substring(0, p.lastIndexOf('/') + 1);
            long total = 0;
            for (int i = 0; i < parts.length(); i++) {
                String name = parts.getJSONObject(i).getString("f");
                if (!SAFE_PART.matcher(name).matches()) return false;
                long n = fetchTo(base + name, d);
                if (n <= 0) return false;
                total += n;
            }
            d.flush();
            if (m.has("size") && total != m.getLong("size")) return false;
            String want = m.optString("sha1", "");
            return want.isEmpty() || want.equalsIgnoreCase(hex(md.digest()));
        } catch (JSONException | NoSuchAlgorithmException e) {
            return false;
        }
    }

    private static final Pattern SAFE_PART = Pattern.compile("[A-Za-z0-9._-]+");

    private static String hex(byte[] b) {
        StringBuilder s = new StringBuilder(b.length * 2);
        for (byte x : b) s.append(String.format("%02x", x & 0xff));
        return s.toString();
    }

    private static boolean inPackage(AssetManager am, String path) {
        try (InputStream in = am.open(path, AssetManager.ACCESS_STREAMING)) {
            return true;
        } catch (IOException e) {
            return false;
        }
    }

    private static WebResourceResponse fileResponse(String path, File f) {
        try {
            Map<String, String> h = new HashMap<>(XQWebViewClient.ISOLATION_HEADERS);
            h.put("Cache-Control", "no-cache");
            h.put("Content-Length", String.valueOf(f.length()));
            h.put("X-XQ-Cdn-Cache", "1");
            return new WebResourceResponse(XQOfflineAssets.mimeOf(path), null, 200, "OK", h, new FileInputStream(f));
        } catch (IOException e) {
            return null;
        }
    }
}
