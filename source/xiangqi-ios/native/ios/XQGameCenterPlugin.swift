//
//  XQGameCenterPlugin.swift
//  象棋千秋：Game Center 成就與排行榜（Capacitor 自訂外掛，JS 名稱 XQGameCenter）
//
//  11/17 加（上架原生 App 待辦第 4 項）。網頁端呼叫的地方：src/native-bridge.js 的 XQNative.gc.*，
//  成就對應表與觸發點在 xiangqi-db/m/07gc-native.js。
//
//  原則：
//   - 不擋遊戲：開 App 時只在背景問 Game Center「登入了沒」，不主動跳登入畫面；
//     玩家沒登入、拒絕登入、或這支 App 還沒開 Game Center 功能（免費開發者帳號），每個方法都照常回傳 ok:false，遊戲照玩。
//     登入畫面只在玩家自己按「Game Center」（showDashboard）而且還沒登入時才出現。
//   - 不收資料：不回傳玩家 ID、暱稱；只把成就進度、分數交給 Apple 的 Game Center，不送到我們的伺服器（這支檔沒有任何網路程式）。
//   - 同一個成就已經回報到 100％ 就不再回報（避免每次開 App 都跳「達成成就」橫幅）。
//
//  註冊方式：capacitor.config.json 的 packageClassList 加 "XQGameCenterPlugin"（scripts/install-native.js --gc-widget 會加），
//  Capacitor 啟動時用 NSClassFromString 自動註冊，不用改 XQBridgeViewController.swift。
//
//  在 Windows 上寫好、還沒編譯過。只用公開 API：GameKit、UIKit、Foundation。
//

import Foundation
import UIKit
import GameKit
import Capacitor

@objc(XQGameCenterPlugin)
public class XQGameCenterPlugin: CAPPlugin, CAPBridgedPlugin, GKGameCenterControllerDelegate {
    public let identifier = "XQGameCenterPlugin"
    public let jsName = "XQGameCenter"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "authenticate", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "reportAchievement", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "submitScore", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "showDashboard", returnType: CAPPluginReturnPromise)
    ]

    /// Game Center 給的登入畫面（玩家還沒登入時才有）；不主動顯示，玩家按 showDashboard 才顯示
    private var loginVC: UIViewController?
    /// authenticateHandler 已經設過（Apple 建議整個 App 只設一次）
    private var handlerSet = false
    /// authenticateHandler 至少回來過一次
    private var authAnswered = false
    private var lastError: String?
    /// 等 authenticateHandler 第一次回來的呼叫
    private var waitingAuth: [CAPPluginCall] = []
    /// 已經在 Game Center 上的成就進度（登入後讀一次），用來跳過重複回報
    private var knownPercent: [String: Double]?
    private var loadingKnown = false
    private var waitingKnown: [([String: Double]) -> Void] = []

    // MARK: - 登入（不擋遊戲）

    @objc func authenticate(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.startAuthIfNeeded()
            if GKLocalPlayer.local.isAuthenticated || self.authAnswered {
                call.resolve(self.authState())
                return
            }
            self.waitingAuth.append(call)
            // 萬一 Game Center 一直沒回應（例如網路很慢），10 秒後先回「還沒登入」，遊戲不用等
            DispatchQueue.main.asyncAfter(deadline: .now() + 10) {
                if let i = self.waitingAuth.firstIndex(where: { $0 === call }) {
                    self.waitingAuth.remove(at: i)
                    call.resolve(self.authState())
                }
            }
        }
    }

    /// 只在主執行緒呼叫
    private func startAuthIfNeeded() {
        if handlerSet { return }
        handlerSet = true
        GKLocalPlayer.local.authenticateHandler = { [weak self] viewController, error in
            DispatchQueue.main.async {
                guard let self = self else { return }
                self.authAnswered = true
                // 有登入畫面＝還沒登入：先收著，不顯示（不擋遊戲）
                self.loginVC = viewController
                self.lastError = error.map { $0.localizedDescription }
                if GKLocalPlayer.local.isAuthenticated {
                    self.loginVC = nil
                } else {
                    // 登出或換帳號：已知進度作廢，下次登入重讀
                    self.knownPercent = nil
                }
                let st = self.authState()
                let calls = self.waitingAuth
                self.waitingAuth.removeAll()
                for c in calls { c.resolve(st) }
                self.notifyListeners("authChange", data: st)
            }
        }
    }

    /// 回給網頁的登入狀態：只有是否登入，不含玩家 ID、暱稱
    private func authState() -> [String: Any] {
        let authed = GKLocalPlayer.local.isAuthenticated
        var o: [String: Any] = [
            "ok": authed,
            "authenticated": authed,
            "loginAvailable": loginVC != nil
        ]
        if !authed, let e = lastError { o["reason"] = e }
        return o
    }

    // MARK: - 成就

    @objc func reportAchievement(_ call: CAPPluginCall) {
        guard let id = call.getString("id"), XQGameCenterPlugin.validId(id) else {
            call.resolve(["ok": false, "reason": "badId"])
            return
        }
        let pct = max(0.0, min(100.0, XQGameCenterPlugin.number(call, "percent") ?? 100.0))
        DispatchQueue.main.async {
            guard GKLocalPlayer.local.isAuthenticated else {
                call.resolve(["ok": false, "reason": "notAuthenticated"])
                return
            }
            self.withKnown { known in
                if let had = known[id], had >= pct {
                    call.resolve(["ok": true, "skipped": true])
                    return
                }
                let a = GKAchievement(identifier: id)
                a.percentComplete = pct
                a.showsCompletionBanner = pct >= 100.0
                GKAchievement.report([a]) { error in
                    DispatchQueue.main.async {
                        if let e = error {
                            call.resolve(["ok": false, "reason": e.localizedDescription])
                        } else {
                            if self.knownPercent != nil { self.knownPercent?[id] = pct }
                            call.resolve(["ok": true])
                        }
                    }
                }
            }
        }
    }

    /// 讀一次 Game Center 上已有的成就進度（只在主執行緒呼叫）；讀不到就當作都沒有
    private func withKnown(_ done: @escaping ([String: Double]) -> Void) {
        if let k = knownPercent { done(k); return }
        waitingKnown.append(done)
        if loadingKnown { return }
        loadingKnown = true
        GKAchievement.loadAchievements { list, error in
            DispatchQueue.main.async {
                var m: [String: Double] = [:]
                for a in list ?? [] {
                    let ident: String? = a.identifier
                    if let i = ident { m[i] = a.percentComplete }
                }
                if error == nil { self.knownPercent = m }
                self.loadingKnown = false
                let waiters = self.waitingKnown
                self.waitingKnown.removeAll()
                for w in waiters { w(m) }
            }
        }
    }

    // MARK: - 排行榜

    @objc func submitScore(_ call: CAPPluginCall) {
        guard let board = call.getString("leaderboardId"), XQGameCenterPlugin.validId(board) else {
            call.resolve(["ok": false, "reason": "badId"])
            return
        }
        let raw = XQGameCenterPlugin.number(call, "value") ?? 0
        guard raw.isFinite, raw >= 0 else {
            call.resolve(["ok": false, "reason": "badValue"])
            return
        }
        let value = Int(min(raw, 2_000_000_000).rounded(.down))
        DispatchQueue.main.async {
            guard GKLocalPlayer.local.isAuthenticated else {
                call.resolve(["ok": false, "reason": "notAuthenticated"])
                return
            }
            GKLeaderboard.submitScore(value, context: 0, player: GKLocalPlayer.local, leaderboardIDs: [board]) { error in
                if let e = error {
                    call.resolve(["ok": false, "reason": e.localizedDescription])
                } else {
                    call.resolve(["ok": true])
                }
            }
        }
    }

    // MARK: - Game Center 畫面（玩家自己按才開）

    @objc func showDashboard(_ call: CAPPluginCall) {
        let view = call.getString("view") ?? "dashboard"
        let board = call.getString("leaderboardId")
        DispatchQueue.main.async {
            self.startAuthIfNeeded()
            guard let host = self.topViewController() else {
                call.resolve(["ok": false, "reason": "noViewController"])
                return
            }
            if !GKLocalPlayer.local.isAuthenticated {
                // 還沒登入：玩家自己按的，才顯示 Game Center 的登入畫面；按取消也沒關係
                if let vc = self.loginVC {
                    self.loginVC = nil
                    host.present(vc, animated: true)
                    call.resolve(["ok": true, "login": true])
                } else {
                    call.resolve(["ok": false, "reason": self.lastError ?? "notAuthenticated"])
                }
                return
            }
            let gc: GKGameCenterViewController
            if view == "leaderboards", let b = board, XQGameCenterPlugin.validId(b) {
                gc = GKGameCenterViewController(leaderboardID: b, playerScope: .global, timeScope: .allTime)
            } else if view == "leaderboards" {
                gc = GKGameCenterViewController(state: .leaderboards)
            } else if view == "achievements" {
                gc = GKGameCenterViewController(state: .achievements)
            } else {
                gc = GKGameCenterViewController(state: .dashboard)
            }
            gc.gameCenterDelegate = self
            host.present(gc, animated: true)
            call.resolve(["ok": true])
        }
    }

    public func gameCenterViewControllerDidFinish(_ gameCenterViewController: GKGameCenterViewController) {
        gameCenterViewController.dismiss(animated: true)
    }

    // MARK: - 小工具

    private func topViewController() -> UIViewController? {
        var top = bridge?.viewController
        while let p = top?.presentedViewController { top = p }
        return top
    }

    /// 數字參數：JS 傳整數、小數、字串都收
    static func number(_ call: CAPPluginCall, _ key: String) -> Double? {
        if let d = call.getDouble(key) { return d }
        if let i = call.getInt(key) { return Double(i) }
        if let s = call.getString(key), let d = Double(s) { return d }
        return nil
    }

    /// 成就、排行榜 id：英數字、點、底線、減號，最長 100 字
    static func validId(_ s: String) -> Bool {
        if s.isEmpty || s.count > 100 { return false }
        let ok = CharacterSet(charactersIn: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._-")
        return s.unicodeScalars.allSatisfy { ok.contains($0) }
    }
}
