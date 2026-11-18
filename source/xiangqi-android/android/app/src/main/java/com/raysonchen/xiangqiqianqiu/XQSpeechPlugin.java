package com.raysonchen.xiangqiqianqiu;

// 象棋千秋 Android 版的系統語音朗讀（報棋「吃！」「將軍！」）。
// Copyright (c) 2026 陳泓昇 (Chen Hung-Sheng)．SPDX-License-Identifier: GPL-3.0-or-later
//
// 為什麼：11/18 拿掉 12 個 Windows 語音音檔、改用系統語音即時朗讀；網頁版用瀏覽器的 speechSynthesis，
// 但 Android 的 WebView 不提供 speechSynthesis，所以 Android 版要自己接系統的 TextToSpeech。
// 介面跟 iOS 的 XQSpeech 外掛（xiangqi-ios/native/ios/XQSpeechPlugin.swift）一樣，網頁 01-board.js 的 ttsNat()／sayCall() 不用分平台：
//   speak({ text, lang, rate, pitch, volume })  lang：zh（zh-TW → zh-HK → zh-CN → zh）或 en（en-US → en-GB → en）；
//                                               rate 1＝系統預設語速；找不到語音就不出聲
//   stop()
//   isAvailable({ lang })                       有沒有這個語言的系統語音
// 音訊：用 USAGE_GAME／CONTENT_TYPE_SPEECH，不搶音訊焦點，背景音樂照放；App 進背景就停。
// 系統語音引擎是非同步初始化的：還沒好之前來的那一句先記著，好了 3 秒內就補念，超過就丟（不在很晚的時候突然出聲）。

import android.media.AudioAttributes;
import android.os.Bundle;
import android.os.SystemClock;
import android.speech.tts.TextToSpeech;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Locale;

@CapacitorPlugin(name = "XQSpeech")
public class XQSpeechPlugin extends Plugin implements TextToSpeech.OnInitListener {

    private static final String[] ZH = { "zh-TW", "zh-HK", "zh-CN", "zh" };
    private static final String[] EN = { "en-US", "en-GB", "en" };
    private static final long PENDING_MS = 3000;

    private TextToSpeech tts;
    private volatile boolean ready = false;
    private String pText, pLang;
    private float pRate, pPitch, pVol;
    private long pAt = 0;

    @Override
    public void load() {
        try {
            tts = new TextToSpeech(getContext(), this);
        } catch (RuntimeException e) {
            tts = null;
        }
    }

    @Override
    public void onInit(int status) {
        if (status != TextToSpeech.SUCCESS || tts == null) return;
        try {
            tts.setAudioAttributes(new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_GAME)
                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                .build());
        } catch (RuntimeException e) {
            // 設不了就照系統預設，不影響朗讀
        }
        ready = true;
        synchronized (this) {
            if (pText != null && SystemClock.elapsedRealtime() - pAt <= PENDING_MS) say(pText, pLang, pRate, pPitch, pVol);
            pText = null;
        }
    }

    /** 照 lang 找第一個系統有的語音地區；都沒有回 null。 */
    private Locale pick(String lang) {
        if (tts == null) return null;
        String[] list = lang != null && lang.toLowerCase(Locale.ROOT).startsWith("en") ? EN : ZH;
        for (String tag : list) {
            Locale l = Locale.forLanguageTag(tag);
            try {
                if (tts.isLanguageAvailable(l) >= TextToSpeech.LANG_AVAILABLE) return l;
            } catch (RuntimeException e) {
                return null;
            }
        }
        return null;
    }

    private void say(String text, String lang, float rate, float pitch, float vol) {
        Locale l = pick(lang);
        if (l == null) return;
        try {
            tts.setLanguage(l);
            tts.setSpeechRate(Math.max(0.25f, Math.min(3f, rate)));
            tts.setPitch(Math.max(0.5f, Math.min(2f, pitch)));
            Bundle p = new Bundle();
            p.putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, Math.max(0f, Math.min(1f, vol)));
            tts.speak(text, TextToSpeech.QUEUE_FLUSH, p, "xq" + SystemClock.elapsedRealtime());
        } catch (RuntimeException e) {
            // 朗讀失敗就不出聲，不影響下棋
        }
    }

    @PluginMethod
    public void speak(PluginCall call) {
        String text = call.getString("text", "");
        String lang = call.getString("lang", "zh");
        float rate = call.getFloat("rate", 1f);
        float pitch = call.getFloat("pitch", 1f);
        float vol = call.getFloat("volume", 1f);
        if (text == null || text.isEmpty() || tts == null) { call.resolve(); return; }
        if (!ready) {
            synchronized (this) {
                pText = text; pLang = lang; pRate = rate; pPitch = pitch; pVol = vol;
                pAt = SystemClock.elapsedRealtime();
            }
            call.resolve();
            return;
        }
        say(text, lang, rate, pitch, vol);
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        try { if (tts != null) tts.stop(); } catch (RuntimeException e) { }
        call.resolve();
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        Locale l = ready ? pick(call.getString("lang", "zh")) : null;
        JSObject r = new JSObject();
        r.put("ok", l != null);
        r.put("voice", l != null ? l.toLanguageTag() : "");
        r.put("ready", ready);
        call.resolve(r);
    }

    @Override
    protected void handleOnPause() {
        try { if (tts != null) tts.stop(); } catch (RuntimeException e) { }
    }

    @Override
    protected void handleOnDestroy() {
        try {
            if (tts != null) { tts.stop(); tts.shutdown(); }
        } catch (RuntimeException e) { }
        tts = null;
        ready = false;
    }
}
