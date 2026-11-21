//
//  XQSpeechPlugin.swift
//  象棋千秋：語音報棋（「吃！」「將軍！」）用 iOS 系統語音朗讀（Capacitor 自訂外掛，JS 名稱 XQSpeech）
//
//  11/18 加（開發者選單核准改原生）。原因：11/17 iOS 模擬器上，原生 App 第一次經由 WKWebView 的 speechSynthesis.speak 朗讀時，
//  App 的主執行緒卡在 WebPageProxy::speechSynthesisSpeak → TextToSpeech（TTSPreferencesCopyDefaultOutputLanguageIdentifierForUserPreferences，
//  semaphore_wait）約 60 秒，整個 App 凍結。這裡改用 AVSpeechSynthesizer：建立、取語音、朗讀全部放在自己的序列佇列（不碰主執行緒），
//  JS 呼叫後立刻回傳，不等朗讀結束。
//
//  方法：
//    speak({ text, lang, rate, pitch, volume })  lang：zh（zh-TW → zh-Hant → zh-HK）或 en（en-US → en-GB → en）；rate 1＝系統預設語速；找不到語音就不出聲
//    stop()                                        馬上停、清掉還沒念的
//    isAvailable({ lang })                         有沒有這個語言的系統語音（另外回目前的音訊類別，給 iMac 對照配樂的設定用）
//
//  音訊：AVAudioSession 用 .ambient（跟靜音開關走：靜音時不出聲；可以跟別的 App 的音樂混在一起，不打斷）；
//        usesApplicationAudioSession＝true（跟 App 同一個 session），只在外掛載入時設一次，朗讀前不重設，不去改配樂（WKWebView 的 <audio>）播放時的設定。
//  進背景：stopSpeaking(at: .immediate) 並清掉排隊的，回前景不會補念一串舊的「吃」「將軍」。
//  不要求任何權限（AVSpeechSynthesizer 不需要麥克風權限），不連網、不送資料：朗讀在手機上處理。
//
//  註冊方式：capacitor.config.json 的 packageClassList 加 "XQSpeechPlugin"（scripts/install-native.js 預設就裝，免費 Personal Team 也能用）。
//  在 Windows 上寫好、還沒編譯過。只用公開 API：AVFoundation、UIKit、Foundation。
//

import Foundation
import UIKit
import AVFoundation
import Capacitor

@objc(XQSpeechPlugin)
public class XQSpeechPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "XQSpeechPlugin"
    public let jsName = "XQSpeech"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "speak", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise)
    ]

    static let zhLangs = ["zh-TW", "zh-Hant", "zh-HK"]
    static let enLangs = ["en-US", "en-GB", "en"]
    static let maxText = 40

    /// 所有語音工作都在這個序列佇列（不在主執行緒）
    private let work = DispatchQueue(label: "xq.speech", qos: .userInitiated)
    private var synth: AVSpeechSynthesizer?
    private var voices: [String: AVSpeechSynthesisVoice] = [:]
    private var looked: Set<String> = []
    /// 進背景時加一，排在佇列裡、還沒輪到的朗讀看到代數變了就不念
    private var gen = 0
    private var bgObserver: NSObjectProtocol?

    public override func load() {
        /* 音訊類別：外掛載入時設一次 .ambient（跟靜音開關走、跟別的 App 的音樂混音）；設失敗就照系統原本的，不影響 App */
        work.async {
            do { try AVAudioSession.sharedInstance().setCategory(.ambient, mode: .default, options: []) } catch { }
        }
        /* 第一次初始化（建立朗讀器、取語音清單）：App 啟動後 2 秒、在背景佇列先做，不要等到第一次吃子 */
        work.asyncAfter(deadline: .now() + 2.0) { [weak self] in
            guard let self = self else { return }
            _ = self.ensureSynth()
            _ = self.voice(for: "zh")
            _ = self.voice(for: "en")
        }
        bgObserver = NotificationCenter.default.addObserver(forName: UIApplication.didEnterBackgroundNotification, object: nil, queue: nil) { [weak self] _ in
            self?.stopAll()
        }
    }

    deinit {
        if let o = bgObserver { NotificationCenter.default.removeObserver(o) }
    }

    /// 只在 work 佇列裡呼叫
    private func ensureSynth() -> AVSpeechSynthesizer {
        if let s = synth { return s }
        let s = AVSpeechSynthesizer()
        s.usesApplicationAudioSession = true
        synth = s
        return s
    }

    /// 只在 work 佇列裡呼叫：zh → zh-TW、zh-Hant、zh-HK；en → en-US、en-GB、en；都沒有就 nil（不出聲）
    private func voice(for key: String) -> AVSpeechSynthesisVoice? {
        if let v = voices[key] { return v }
        if looked.contains(key) { return nil }
        looked.insert(key)
        let wants = key == "en" ? XQSpeechPlugin.enLangs : XQSpeechPlugin.zhLangs
        var found: AVSpeechSynthesisVoice? = nil
        for w in wants {
            if let v = AVSpeechSynthesisVoice(language: w) { found = v; break }
        }
        if found == nil {
            let all = AVSpeechSynthesisVoice.speechVoices()
            for w in wants {
                if let v = all.first(where: { $0.language.hasPrefix(w) }) { found = v; break }
            }
        }
        if let v = found { voices[key] = v }
        return found
    }

    private func stopAll() {
        work.async { [weak self] in
            guard let self = self else { return }
            self.gen += 1
            self.synth?.stopSpeaking(at: .immediate)
        }
    }

    @objc func speak(_ call: CAPPluginCall) {
        let text = String((call.getString("text") ?? "").prefix(XQSpeechPlugin.maxText))
        let key = (call.getString("lang") ?? "zh").lowercased().hasPrefix("en") ? "en" : "zh"
        let rate = Float(call.getDouble("rate") ?? 1.0)
        let pitch = Float(call.getDouble("pitch") ?? 1.0)
        let volume = Float(call.getDouble("volume") ?? 1.0)
        if text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { call.resolve(["ok": false, "reason": "empty"]); return }
        /* 先回傳：JS 不等朗讀，也不等佇列。佇列照順序跑：進背景的 stopAll 排在後面，會把這之前排進去、已經在念的一起停掉、清掉；
           取語音的時候剛好進背景（代數變了）就不念 */
        call.resolve(["ok": true])
        work.async { [weak self] in
            guard let self = self else { return }
            let g = self.gen
            guard let v = self.voice(for: key) else { return }
            if g != self.gen { return }
            let s = self.ensureSynth()
            if s.isSpeaking { s.stopSpeaking(at: .immediate) }
            let u = AVSpeechUtterance(string: text)
            u.voice = v
            u.rate = min(AVSpeechUtteranceMaximumSpeechRate, max(AVSpeechUtteranceMinimumSpeechRate, AVSpeechUtteranceDefaultSpeechRate * rate))
            u.pitchMultiplier = min(2.0, max(0.5, pitch))
            u.volume = min(1.0, max(0.0, volume))
            s.speak(u)
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        stopAll()
        call.resolve(["ok": true])
    }

    @objc func isAvailable(_ call: CAPPluginCall) {
        let key = (call.getString("lang") ?? "zh").lowercased().hasPrefix("en") ? "en" : "zh"
        work.async { [weak self] in
            guard let self = self else { call.resolve(["ok": false]); return }
            let v = self.voice(for: key)
            let cat = AVAudioSession.sharedInstance().category.rawValue
            call.resolve(["ok": v != nil, "voice": v?.language ?? "", "category": cat])
        }
    }
}
