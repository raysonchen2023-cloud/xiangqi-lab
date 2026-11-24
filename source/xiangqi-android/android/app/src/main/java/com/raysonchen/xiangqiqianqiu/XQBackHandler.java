package com.raysonchen.xiangqiqianqiu;

// 象棋千秋 Android：返回鍵／返回手勢先交給網頁回上一頁（W100，2026-11-24）。
// Copyright (c) 2026 陳泓昇 (Chen Hung-Sheng)．SPDX-License-Identifier: GPL-3.0-or-later
//
// 為什麼：專案沒裝 @capacitor/app（backButton 事件在那個外掛），MainActivity 也沒攔返回鍵，Android 預設是直接把 App 收到背景。
//   11/24 Windows Claude 2 在 Android 12／16 模擬器上重現：設定頁（瀏覽紀錄 17 筆）、迷宮被抓的殘局卡按返回，App 都直接回桌面；
//   W99「Android 返回手勢先跳逃跑確認」在原生 App 上也因此沒作用。開發者 11/24 選「送審前修」。
// 做法：返回鍵先問網頁——App 自己記的上一頁層數 NAV_D（m/00-util.js、02-shell.js）大於 0，就 history.back()，
//   交給網頁原本的 popstate 處理（換頁、關面板、W99 殘局先問要不要逃跑都在那裡）；在首頁、沒得回（NAV_D 是 0）才照 Android 預設收到背景。
//   問網頁是非同步的：先回「處理中」，網頁說沒得回，再暫時關掉這個 callback、交還給系統預設。
// 用法：MainActivity.load() 在 super.load() 之後呼叫 XQBackHandler.install(this, bridge)。
//   變體（source/xiangqi-android-variants/<版本>/）若覆蓋 MainActivity，也要加這一行，不然這個檔帶進去了卻沒裝上。

import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import androidx.appcompat.app.AppCompatActivity;
import com.getcapacitor.Bridge;
import com.getcapacitor.Logger;

public final class XQBackHandler {

    private XQBackHandler() {}

    /** 網頁那一端：有上一頁就回上一頁並回 "back"，沒有就回 "exit"。出錯也回 "exit"，不會卡住返回鍵。 */
    static final String BACK_JS = "(function(){try{"
        + "if(typeof NAV_D==='number'&&NAV_D>0&&history.length>1){history.back();return 'back'}"
        + "}catch(e){}return 'exit'})()";

    /** evaluateJavascript 回傳的是 JSON 字串（例如 "\"back\""），只有明確是 back 才算網頁接手。 */
    static boolean webHandled(String v) {
        return v != null && v.contains("back") && !v.contains("exit");
    }

    static void install(final AppCompatActivity act, final Bridge bridge) {
        try {
            act.getOnBackPressedDispatcher().addCallback(act, new OnBackPressedCallback(true) {
                @Override
                public void handleOnBackPressed() {
                    final OnBackPressedCallback self = this;
                    final WebView wv = bridge != null ? bridge.getWebView() : null;
                    if (wv == null) {
                        systemBack(act, self);
                        return;
                    }
                    wv.evaluateJavascript(BACK_JS, v -> {
                        if (!webHandled(v)) systemBack(act, self);
                    });
                }
            });
        } catch (RuntimeException e) {
            Logger.error("XQ", "裝返回鍵處理失敗（照 Android 預設：按返回收到背景）", e);
        }
    }

    /** 交還給系統預設（收到背景）：先關掉自己，免得又被自己攔到，處理完再打開。 */
    static void systemBack(AppCompatActivity act, OnBackPressedCallback self) {
        self.setEnabled(false);
        try {
            act.getOnBackPressedDispatcher().onBackPressed();
        } finally {
            self.setEnabled(true);
        }
    }
}
