//
//  XQBridgeViewController.swift
//  象棋千秋：Capacitor 主畫面，改從 App 內的本機伺服器（http://127.0.0.1:47821）載入網頁
//
//  Capacitor 預設用 capacitor://localhost 載入；那個網址在 WKWebView 裡不會「跨來源隔離」，
//  Pikafish 多執行緒引擎就開不起來（engine.js 會說「瀏覽器還沒開啟多執行緒模式」）。
//  這裡把 serverURL 換成本機伺服器，而且「驗明正身才載入」：
//
//  11/17 App Store 審查（iMac 測試員）兩個 P1：
//   (1) 資安：別的 App 先占住 127.0.0.1:47821 時，以前 WebView 照樣去載入，載到別人的網頁（能讀寫存檔、注入程式）。
//       現在 viewDidLoad「不」讓 Capacitor 直接載入；先由 XQLoopbackServer.establish() 開監聽＋用一次性考題驗證
//       （/__xq_whoami，見 XQLoopbackServer.swift），通過才呼叫 loadWebView()。綁不上或驗證不過就絕不載入。
//       每次回到前景、監聽中途壞掉時再驗一次；跑到一半驗不過，先把網頁換成空白頁（停掉網頁程式、不再向那個埠要東西），再走重試。
//       載入前先清掉 WebView 的 HTTP 快取（只清快取，不動 localStorage／IndexedDB 存檔），免得之前被別人塞進快取的檔案被拿來用。
//   (2) 審查指南 2.1：以前搶不到埠號時 showRetry() 每 0.5 秒自己重跳「象棋千秋開不起來」。
//       現在自動重試有上限、間隔遞增（1、2、4 秒，共 3 次），期間只顯示「啟動中」；
//       之後才顯示一個錯誤畫面（全螢幕的原生畫面，不是一直跳的提示視窗），上面寫原因和處理方式，有「重試」按鈕。
//       按「重試」只試一次，失敗就停在同一個錯誤畫面，不會自己再跳。
//       文字分中英：用網頁設定 m_lang（App 每次切到背景時從網頁讀出來記在 UserDefaults）；沒記過就看系統語言。
//
//  伺服器開不起來時「不」退回 capacitor://：那是另一個來源，玩家會看到一個沒有存檔的空 App（存檔跟著來源走），
//  還可能在那邊產生第二份進度。
//
//  SceneDelegate.swift 要把 CAPBridgeViewController() 換成 XQBridgeViewController()（scripts/install-native.js 會改）。
//
//  在 Windows 上寫好、還沒編譯過。
//

import UIKit
import WebKit
import Capacitor

final class XQBridgeViewController: CAPBridgeViewController {

    private enum Phase {
        /// 還沒載入網頁（或網頁已撤掉），正在開伺服器＋驗證
        case starting
        /// 驗證通過、網頁已載入
        case running
        /// 自動重試用完，停在錯誤畫面等玩家按「重試」
        case failed
    }

    /// 錯誤畫面語言的記憶（"en"／"zh"），來自網頁的 m_lang
    private static let langKey = "xq_native_ui_lang"
    /// 自動重試的間隔（秒）：遞增、最多 3 次
    private let retryDelays: [TimeInterval] = [1, 2, 4]

    private var phase: Phase = .starting
    private var retryIndex = 0
    private var checking = false
    private var pageLoaded = false
    private var cover: XQStartupCoverView?
    private var observers: [NSObjectProtocol] = []
    /// 這次重驗是不是回前景觸發的（通過時在 console 印一行，方便確認；iMac 11/17 建議）
    private var foregroundRecheck = false

    deinit {
        for o in observers { NotificationCenter.default.removeObserver(o) }
    }

    override func instanceDescriptor() -> InstanceDescriptor {
        let descriptor = super.instanceDescriptor()
        let server = XQLoopbackServer.shared
        server.configure(root: descriptor.appLocation)
        descriptor.serverURL = server.origin
        NSLog("[XQ] 網頁來源：%@（本機伺服器驗證通過才載入）", server.origin)
        return descriptor
    }

    /// 11/18 iMac 套用 1041：`npx cap sync ios` 會重寫 ios/App/App/capacitor.config.json 的 packageClassList，
    /// 把 install-native.js 加的 XQSpeechPlugin 拿掉 → App 裡沒有 XQSpeech，網頁退回瀏覽器語音（之前卡住過，P1 風險）。
    /// 改用 Capacitor 給「App 內自訂外掛」的正式做法：capacitorDidLoad() 裡 bridge?.registerPluginInstance(...) 直接註冊，cap sync 不會影響。
    /// （Capacitor 8.6.2：CAPBridgeViewController.loadView() 建好 bridge 後就呼叫 capacitorDidLoad()，在網頁載入之前；
    ///  這裡的 viewDidLoad 沒叫 super 也不影響，因為呼叫點在 loadView。registerPluginInstance 會順便把 JS 端的外掛注入 WebView。）
    /// Game Center、今日茶單小工具兩支一起改成這樣：只有 --gc-widget 裝了才會編進 App，所以用 NSClassFromString 找得到才註冊
    /// （三支都有 @objc(名字)）；packageClassList 不再列這三支（scripts/install-native.js 會清掉舊的，免得註冊兩次）。
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(XQSpeechPlugin())
        for name in ["XQGameCenterPlugin", "XQWidgetDataPlugin"] {
            if let type = NSClassFromString(name) as? CAPPlugin.Type {
                bridge?.registerPluginInstance(type.init())
            }
        }
        NSLog("[XQ] 已註冊 App 內外掛：XQSpeech%@", NSClassFromString("XQGameCenterPlugin") != nil ? "、XQGameCenter、XQWidgetData" : "")
    }

    override func viewDidLoad() {
        // 故意「不」呼叫 super.viewDidLoad()：
        // Capacitor 8 的 CAPBridgeViewController.viewDidLoad() 只做兩件事：super.viewDidLoad()（UIViewController 的，本身是空的）
        // 和 loadWebView()（馬上載入 http://127.0.0.1:47821/）。後者正是這次要擋的：還沒確認 47821 上是我們自己的伺服器就載入。
        // 所以這裡不呼叫，改成驗證通過後自己呼叫 loadWebView()。
        // （scripts/check-native.js 會檢查 node_modules 裡 Capacitor 的 viewDidLoad 還是只有這兩行；Capacitor 升級後要重看。）
        let center = NotificationCenter.default
        observers.append(center.addObserver(forName: UIApplication.willEnterForegroundNotification, object: nil, queue: .main) { [weak self] _ in
            guard let self = self else { return }
            if self.phase == .running { self.foregroundRecheck = true }
            self.recheckIfRunning()
        })
        observers.append(center.addObserver(forName: UIApplication.didEnterBackgroundNotification, object: nil, queue: .main) { [weak self] _ in
            self?.rememberLanguage()
        })
        XQLoopbackServer.shared.onBroken = { [weak self] in
            self?.recheckIfRunning()
        }
        phase = .starting
        retryIndex = 0
        runCheck()
    }

    // MARK: - iPad 視窗控制鈕

    /// B5（11/24 iMac Claude 2 的 iPad 相容模式驗收）：iPadOS 26 起，App 在 iPad 上是一個視窗，左上角有視窗控制鈕（紅黃綠三點），
    /// 會蓋在網頁頂欄的「‹ 回…」返回鈕上（字被擋住，點那一塊可能點到視窗控制）。
    /// iPadOS 26 的 cornerAdaptation 安全區域會讓開這種角落的系統元件：用它算出比一般安全區域多出來的高度，加進 additionalSafeAreaInsets.top，
    /// 網頁頂欄本來就照 env(safe-area-inset-top)（m.css 的 --safeT）往下讓，所以不用改網頁。
    /// iPhone、全螢幕的 iPad 沒有角落元件，多出來的是 0，畫面不變。算法收斂：加進去之後 cornerAdaptation 的值等於一般安全區域，差值不再變。
    override func viewSafeAreaInsetsDidChange() {
        super.viewSafeAreaInsetsDidChange()
        updateWindowControlsInset()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        updateWindowControlsInset()
    }

    private func updateWindowControlsInset() {
        guard #available(iOS 26.0, *) else { return }
        let adapted = view.edgeInsets(for: .safeArea(cornerAdaptation: .vertical))
        let base = view.safeAreaInsets.top - additionalSafeAreaInsets.top
        let need = max(0, (adapted.top - base).rounded())
        if abs(need - additionalSafeAreaInsets.top) >= 1 {
            additionalSafeAreaInsets.top = need
            NSLog("[XQ] 視窗控制鈕讓出頂部 %.0f pt", need)
        }
    }

    // MARK: - 開伺服器＋驗證

    private func runCheck() {
        if checking { return }
        checking = true
        XQLoopbackServer.shared.establish { [weak self] outcome in
            guard let self = self else { return }
            self.checking = false
            self.handle(outcome)
        }
    }

    /// 回到前景、監聽壞掉時：網頁正在跑才需要重驗
    private func recheckIfRunning() {
        guard phase == .running else { return }
        runCheck()
    }

    private func handle(_ outcome: XQLoopbackServer.Outcome) {
        if outcome == .verified {
            retryIndex = 0
            if phase == .running {
                if foregroundRecheck { NSLog("[XQLoopback] 回前景重驗通過（%@）", XQLoopbackServer.shared.origin) }
                foregroundRecheck = false
                return
            }
            phase = .running
            removeCover()
            loadVerifiedPage()
            return
        }
        if foregroundRecheck { NSLog("[XQLoopback] 回前景重驗沒過") }
        foregroundRecheck = false
        NSLog("[XQ] 本機伺服器檢查沒過：%@", String(describing: outcome))
        if phase == .running {
            // 跑到一半發現 127.0.0.1:47821 不是我們：先把網頁撤掉，免得網頁再向別人的伺服器要東西
            unloadPage()
            phase = .starting
            retryIndex = 0
        }
        if phase == .starting && retryIndex < retryDelays.count {
            let delay = retryDelays[retryIndex]
            retryIndex += 1
            NSLog("[XQ] %@ 秒後自動重試（第 %@ 次）", String(delay), String(retryIndex))
            showCover(.waiting)
            DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in
                self?.runCheck()
            }
            return
        }
        phase = .failed
        showCover(.error(outcome))
    }

    @objc private func retryTapped() {
        guard phase == .failed, !checking else { return }
        phase = .starting
        // 手動重試只試一次；失敗就回到同一個錯誤畫面（不再自動連續重試、不重跳視窗）
        retryIndex = retryDelays.count
        showCover(.waiting)
        runCheck()
    }

    // MARK: - 載入／撤掉網頁

    private func loadVerifiedPage() {
        guard let wv = webView else { return }
        // 只清 HTTP 快取（磁碟＋記憶體），不動 localStorage、IndexedDB 等存檔
        let types: Set<String> = [WKWebsiteDataTypeDiskCache, WKWebsiteDataTypeMemoryCache]
        wv.configuration.websiteDataStore.removeData(ofTypes: types, modifiedSince: Date.distantPast) { [weak self] in
            DispatchQueue.main.async {
                guard let self = self, self.phase == .running else { return }
                self.pageLoaded = true
                self.loadWebView()
            }
        }
    }

    private func unloadPage() {
        guard pageLoaded, let wv = webView else { return }
        pageLoaded = false
        wv.stopLoading()
        // 換成一張不含任何程式、不向網路要東西的空白頁（loadHTMLString 不會連線）。
        // baseURL 用同一個來源，Capacitor 的導覽檢查才會放行（別的網址會被它丟給 Safari 開）。
        let html = "<!doctype html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width\"></head><body style=\"margin:0;background:#3B2A1A\"></body></html>"
        if let base = URL(string: XQLoopbackServer.shared.origin + "/__xq_offline") {
            _ = wv.loadHTMLString(html, baseURL: base)
        }
    }

    // MARK: - 錯誤畫面的語言

    private func rememberLanguage() {
        guard phase == .running, pageLoaded, let wv = webView else { return }
        let js = "(function(){try{return localStorage.getItem('m_lang')}catch(e){return null}})()"
        wv.evaluateJavaScript(js) { result, error in
            guard error == nil else { return }
            // m_lang 存的是 JSON 字串，例如 "\"en\""；中文模式時沒有這個值（null）
            let v = (result as? String) ?? ""
            UserDefaults.standard.set(v.contains("en") ? "en" : "zh", forKey: XQBridgeViewController.langKey)
        }
    }

    private var useEnglish: Bool {
        if let saved = UserDefaults.standard.string(forKey: XQBridgeViewController.langKey) {
            return saved == "en"
        }
        let first = (Locale.preferredLanguages.first ?? "zh-Hant").lowercased()
        return !first.hasPrefix("zh")
    }

    // MARK: - 啟動中／錯誤畫面（同一個畫面，只換內容，不會重複跳出）

    private func showCover(_ mode: XQStartupCoverView.Mode) {
        let c: XQStartupCoverView
        if let existing = cover {
            c = existing
        } else {
            c = XQStartupCoverView(frame: view.bounds)
            c.autoresizingMask = [.flexibleWidth, .flexibleHeight]
            c.retryButton.addTarget(self, action: #selector(retryTapped), for: .touchUpInside)
            view.addSubview(c)
            cover = c
        }
        view.bringSubviewToFront(c)
        c.apply(mode, english: useEnglish)
    }

    private func removeCover() {
        cover?.removeFromSuperview()
        cover = nil
    }
}

/// 啟動中／錯誤畫面：全螢幕、底色跟 App 一樣，中間一段說明＋「重試」按鈕
final class XQStartupCoverView: UIView {

    enum Mode {
        case waiting
        case error(XQLoopbackServer.Outcome)
    }

    let retryButton = UIButton(type: .system)
    private let spinner = UIActivityIndicatorView(style: .large)
    private let titleLabel = UILabel()
    private let bodyLabel = UILabel()
    private let ink = UIColor(red: 0.95, green: 0.90, blue: 0.81, alpha: 1)

    override init(frame: CGRect) {
        super.init(frame: frame)
        backgroundColor = UIColor(red: 59.0 / 255.0, green: 42.0 / 255.0, blue: 26.0 / 255.0, alpha: 1)

        spinner.color = ink
        spinner.hidesWhenStopped = true

        titleLabel.font = UIFont.preferredFont(forTextStyle: .title2)
        titleLabel.adjustsFontForContentSizeCategory = true
        titleLabel.textColor = ink
        titleLabel.textAlignment = .center
        titleLabel.numberOfLines = 0
        titleLabel.accessibilityTraits = .header

        bodyLabel.font = UIFont.preferredFont(forTextStyle: .body)
        bodyLabel.adjustsFontForContentSizeCategory = true
        bodyLabel.textColor = ink
        bodyLabel.textAlignment = .center
        bodyLabel.numberOfLines = 0

        retryButton.titleLabel?.font = UIFont.preferredFont(forTextStyle: .headline)
        retryButton.titleLabel?.adjustsFontForContentSizeCategory = true
        retryButton.setTitleColor(UIColor(red: 0.23, green: 0.16, blue: 0.10, alpha: 1), for: .normal)
        retryButton.backgroundColor = ink
        retryButton.layer.cornerRadius = 10

        let stack = UIStackView(arrangedSubviews: [spinner, titleLabel, bodyLabel, retryButton])
        stack.axis = .vertical
        stack.alignment = .center
        stack.spacing = 18
        stack.translatesAutoresizingMaskIntoConstraints = false
        addSubview(stack)

        let guide = safeAreaLayoutGuide
        let centerY = stack.centerYAnchor.constraint(equalTo: guide.centerYAnchor)
        centerY.priority = .defaultHigh
        NSLayoutConstraint.activate([
            centerY,
            stack.leadingAnchor.constraint(equalTo: guide.leadingAnchor, constant: 28),
            stack.trailingAnchor.constraint(equalTo: guide.trailingAnchor, constant: -28),
            stack.topAnchor.constraint(greaterThanOrEqualTo: guide.topAnchor, constant: 16),
            stack.bottomAnchor.constraint(lessThanOrEqualTo: guide.bottomAnchor, constant: -16),
            titleLabel.widthAnchor.constraint(equalTo: stack.widthAnchor),
            bodyLabel.widthAnchor.constraint(equalTo: stack.widthAnchor),
            retryButton.heightAnchor.constraint(greaterThanOrEqualToConstant: 48),
            retryButton.widthAnchor.constraint(greaterThanOrEqualToConstant: 160),
        ])
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) is not supported")
    }

    func apply(_ mode: Mode, english: Bool) {
        switch mode {
        case .waiting:
            spinner.startAnimating()
            titleLabel.text = english ? "Starting Xiangqi Qianqiu…" : "象棋千秋啟動中…"
            bodyLabel.text = nil
            bodyLabel.isHidden = true
            retryButton.isHidden = true
        case .error(let outcome):
            spinner.stopAnimating()
            let t = XQStartupCoverView.texts(for: outcome, english: english)
            titleLabel.text = t.title
            bodyLabel.text = t.body
            bodyLabel.isHidden = false
            retryButton.setTitle(english ? "Retry" : "重試", for: .normal)
            retryButton.isHidden = false
            UIAccessibility.post(notification: .screenChanged, argument: titleLabel)
        }
    }

    static func texts(for outcome: XQLoopbackServer.Outcome, english: Bool) -> (title: String, body: String) {
        switch outcome {
        case .portInUse, .notOurServer:
            if english {
                return (title: "Local connection in use",
                        body: "Another app is using the local connection this app needs (127.0.0.1:47821). To protect your saved games, Xiangqi Qianqiu will not load until it is free.\n\nClose other apps from the App Switcher, then tap Retry.")
            }
            return (title: "本機連線被占用",
                    body: "另一個 App 占用了象棋千秋需要的本機連線（127.0.0.1:47821）。為了保護你的存檔，連線空出來之前不會載入。\n\n請關閉其他 App（從多工畫面滑掉）後按「重試」。")
        case .failed, .verified:
            if english {
                return (title: "Xiangqi Qianqiu couldn't start",
                        body: "The app's built-in content service didn't start.\n\nTap Retry. If it still doesn't work, restart your iPhone or iPad and open the app again.")
            }
            return (title: "象棋千秋開不起來",
                    body: "App 內的資料讀取服務沒有啟動。\n\n請按「重試」；還是不行的話，請把手機重新開機後再打開。")
        }
    }
}
