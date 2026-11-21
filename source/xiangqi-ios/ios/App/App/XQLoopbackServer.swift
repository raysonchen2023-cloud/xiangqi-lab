//
//  XQLoopbackServer.swift
//  象棋千秋：App 內的本機 HTTP 伺服器（只聽 127.0.0.1）
//
//  為什麼要有它：
//  Pikafish 引擎是 WebAssembly 多執行緒版，需要「跨來源隔離」（crossOriginIsolated == true，才有 SharedArrayBuffer）。
//  Capacitor 預設用 capacitor://localhost 這個自訂網址載入網頁；WKWebView 對自訂網址就算回應帶了 COOP／COEP 標頭，
//  也不會進入跨來源隔離（實測：iPhone 15 Pro Max、iOS 26.6.1，logos-fleet/logos-workspace#287）。
//  同樣的標頭從 http://127.0.0.1:<埠> 送出就會生效。所以 App 啟動時開這個只聽本機的小伺服器，
//  把安裝包裡的 public/（= Capacitor 的 www）送給 WKWebView，每個回應都帶：
//    Cross-Origin-Opener-Policy: same-origin
//    Cross-Origin-Embedder-Policy: require-corp
//    Cross-Origin-Resource-Policy: same-origin
//
//  重要：網頁的 localStorage／IndexedDB（玩家的存檔）是跟著「來源」（協定＋主機＋埠）存的。
//  埠號 47821 上架後永遠不能改，改了玩家的存檔就看不到了。
//
//  11/17 App Store 審查（iMac 測試員，P1 資安）：同一支手機上別的 App 如果先在 127.0.0.1:47821 開了伺服器，
//  以前我們綁不上去，WebView 卻照樣去載入 http://127.0.0.1:47821/，載到的是對方的網頁，對方就能讀寫玩家存檔、注入程式。
//  現在改成「先驗明正身才載入」：
//    1. 綁定：先精確綁 127.0.0.1:47821（不設 SO_REUSEPORT，別人不能跟我們同時綁同一個位址）。
//       綁不上而且是「位址已被占用」（EADDRINUSE）＝有人占著 127.0.0.1:47821，直接回報 portInUse，
//       「不」改綁萬用位址（改了也收不到 127.0.0.1 的連線，連線會被比較精確的那個綁定搶走）。
//       只有精確綁定因為其他原因失敗時，才用 loopback 介面上的萬用位址當備援。
//    2. 驗證：每次要確認時，原生端產生一組一次性的「考題 c＋答案 a」（各 32 bytes 系統亂數，只存在這個行程的記憶體），
//       用 URLSession 打 http://127.0.0.1:47821/__xq_whoami?c=<考題>。只有我們自己的伺服器查得到 a 並回傳；
//       別人的伺服器拿到 c 也算不出 a。考題用過就作廢、15 秒過期，所以錄下來重播也沒用。
//       （比「每次啟動一組固定 token」更強：別的 App 就算連到我們的伺服器，也拿不到能重複使用的值。）
//    3. 驗證通過才讓 XQBridgeViewController 載入網頁；綁不上、驗證不過，就不載入，改顯示錯誤畫面。
//  每次回到前景、監聽中途壞掉時，都再驗一次（見 XQBridgeViewController.swift）。
//
//  只用 Apple 內建的 Network.framework 與 Foundation，沒有第三方套件。只回 GET／HEAD；只讀 public/ 裡的檔；不寫任何檔。
//  不用檔案時間戳 API（ETag 用 App 版本＋檔案大小），所以這支檔不需要在隱私清單裡加 File timestamp 理由。
//
//  在 Windows 上寫好、還沒編譯過：iMac 第一次 Build 時若有編譯錯誤，照錯誤訊息修。
//

import Foundation
import Network

/// 開一次監聽的結果（這個檔內部用）
fileprivate enum XQBindResult {
    case ready
    case inUse
    case failed
}

/// 只記第一次結果的小盒子：監聽的狀態回呼跟等待的執行緒不同，所以要上鎖
fileprivate final class XQOnce: @unchecked Sendable {
    private let lock = NSLock()
    private var done = false
    private var value: XQBindResult = .failed

    /// 第一次呼叫才記下結果並回 true；之後都回 false
    func set(_ r: XQBindResult) -> Bool {
        lock.lock()
        defer { lock.unlock() }
        if done { return false }
        done = true
        value = r
        return true
    }

    var result: XQBindResult {
        lock.lock()
        defer { lock.unlock() }
        return value
    }
}

/// 驗證請求的結果（URLSession 的回呼在別的執行緒）
fileprivate final class XQFlag: @unchecked Sendable {
    private let lock = NSLock()
    private var v = false

    var value: Bool {
        get {
            lock.lock()
            defer { lock.unlock() }
            return v
        }
        set {
            lock.lock()
            v = newValue
            lock.unlock()
        }
    }
}

/// 錯誤是不是「位址已被占用」（POSIX EADDRINUSE）
fileprivate func xqIsAddressInUse(_ error: Error) -> Bool {
    if let e = error as? NWError, case .posix(let code) = e {
        return code == .EADDRINUSE
    }
    return false
}

final class XQLoopbackServer {
    static let shared = XQLoopbackServer()

    /// 上架後不能改（改了＝玩家存檔的來源變了）
    static let port: UInt16 = 47821
    static let host = "127.0.0.1"
    /// 驗明正身用的路徑（不在 public/ 裡，網頁拿不到答案）
    static let whoamiPath = "/__xq_whoami"
    var origin: String { "http://\(XQLoopbackServer.host):\(XQLoopbackServer.port)" }

    /// establish() 的結果
    enum Outcome {
        /// 我們的伺服器在 127.0.0.1:47821 上，而且答對了這次的考題：可以載入
        case verified
        /// 綁不上：127.0.0.1:47821 被別的程式占住
        case portInUse
        /// 監聽看起來開著，但 127.0.0.1:47821 上回話的不是我們（或沒回話）
        case notOurServer
        /// 其他原因開不起來
        case failed
    }

    /// 監聽跑到一半壞掉時，在主執行緒呼叫（XQBridgeViewController 會重新驗證；不在這裡自己默默重綁）
    var onBroken: (() -> Void)?

    private var root: URL?
    private let listenerQueue = DispatchQueue(label: "tw.xiangqi.loopback.listener")
    private let workQueue = DispatchQueue(label: "tw.xiangqi.loopback.work", qos: .userInitiated, attributes: .concurrent)
    /// 開／關監聽、驗證都排在這條序列佇列上（會用號誌等結果），不在主執行緒等
    private let controlQueue = DispatchQueue(label: "tw.xiangqi.loopback.control", qos: .userInitiated)
    private let etagBase: String = {
        let v = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "0"
        let b = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "0"
        return "\(v)-\(b)"
    }()

    /// 監聽狀態：controlQueue、listenerQueue、各連線的佇列都會讀，所以上鎖
    private let stateLock = NSLock()
    private var currentListener: NWListener?
    private var ready = false
    private var exactBind = true

    /// 驗證專用的連線設定：不用快取、不存 cookie、不走代理
    private let verifySession: URLSession = {
        let cfg = URLSessionConfiguration.ephemeral
        cfg.requestCachePolicy = .reloadIgnoringLocalCacheData
        cfg.urlCache = nil
        cfg.httpCookieStorage = nil
        cfg.httpShouldSetCookies = false
        cfg.connectionProxyDictionary = [:]
        cfg.timeoutIntervalForRequest = 3
        cfg.timeoutIntervalForResource = 4
        cfg.waitsForConnectivity = false
        return URLSession(configuration: cfg)
    }()

    /// 一次性考題 → 答案
    private struct Challenge {
        let answer: String
        let expires: Date
    }
    private let challengeLock = NSLock()
    private var challenges: [String: Challenge] = [:]

    var isReady: Bool {
        stateLock.lock()
        defer { stateLock.unlock() }
        return ready
    }

    private var boundExactly: Bool {
        stateLock.lock()
        defer { stateLock.unlock() }
        return exactBind
    }

    private func setReady(_ v: Bool) {
        stateLock.lock()
        ready = v
        stateLock.unlock()
    }

    private func setExact(_ v: Bool) {
        stateLock.lock()
        exactBind = v
        stateLock.unlock()
    }

    private func isCurrent(_ l: NWListener) -> Bool {
        stateLock.lock()
        defer { stateLock.unlock() }
        return currentListener === l
    }

    private func install(_ l: NWListener) {
        stateLock.lock()
        currentListener = l
        ready = false
        stateLock.unlock()
    }

    private func stopListening() {
        stateLock.lock()
        let old = currentListener
        currentListener = nil
        ready = false
        stateLock.unlock()
        old?.cancel()
    }

    private func xqLog(_ m: String) {
        NSLog("[XQLoopback] %@", m)
    }

    // MARK: - 啟動＋驗證

    /// 設定要送的資料夾（Capacitor 的 public/）。只記下來，不開監聽。
    func configure(root: URL) {
        self.root = root.standardizedFileURL
    }

    /// 確保「我們的」伺服器在 127.0.0.1:47821 上：沒在聽就開；然後一定驗一次。
    /// 在背景佇列做（最久大約 1.5＋1.5＋3 秒），完成後在主執行緒呼叫 completion。
    func establish(completion: @escaping (Outcome) -> Void) {
        controlQueue.async { [weak self] in
            let outcome = self?.establishNow() ?? .failed
            DispatchQueue.main.async {
                completion(outcome)
            }
        }
    }

    private func establishNow() -> Outcome {
        guard root != nil else {
            xqLog("還沒設定網頁資料夾")
            return .failed
        }
        if isReady {
            if verifyNow(timeout: 2.0) { return .verified }
            xqLog("監聽開著但驗證沒過，重開監聽再驗一次")
        }
        stopListening()
        switch startListening(timeout: 1.5) {
        case .inUse:
            xqLog("127.0.0.1:47821 已被別的程式占用：不載入網頁")
            return .portInUse
        case .failed:
            xqLog("監聽開不起來")
            return .failed
        case .ready:
            if verifyNow(timeout: 2.0) {
                xqLog("驗證通過（" + (boundExactly ? "精確綁定 127.0.0.1" : "萬用位址備援") + "）")
                return .verified
            }
            xqLog("驗證沒過：127.0.0.1:47821 上回話的不是這個 App 的伺服器")
            stopListening()
            return .notOurServer
        }
    }

    /// 先精確綁 127.0.0.1:47821；位址被占用就直接回 inUse；其他原因失敗才試萬用位址備援
    private func startListening(timeout: TimeInterval) -> XQBindResult {
        let exact = startOnce(timeout: timeout, bindEndpoint: true)
        if exact == .ready {
            setExact(true)
            return .ready
        }
        if exact == .inUse {
            return .inUse
        }
        let wide = startOnce(timeout: timeout, bindEndpoint: false)
        if wide == .ready {
            setExact(false)
            xqLog("精確綁定失敗（不是被占用），改用 loopback 介面上的萬用位址（備援）")
        }
        return wide
    }

    private func startOnce(timeout: TimeInterval, bindEndpoint: Bool) -> XQBindResult {
        guard let port = NWEndpoint.Port(rawValue: XQLoopbackServer.port) else { return .failed }
        let params = NWParameters.tcp
        // allowLocalEndpointReuse＝SO_REUSEADDR：App 剛被關掉又打開時，上一個行程留下的 TIME_WAIT 連線不會擋住綁定。
        // 它不是 SO_REUSEPORT（Apple DTS：兩個 NWListener 都設了，第二個照樣 EADDRINUSE），所以別的 App 不能跟我們同時綁 127.0.0.1:47821。
        params.allowLocalEndpointReuse = true
        params.requiredInterfaceType = .loopback
        // 11/16 iMac 實測：iOS 27.2 模擬器上 acceptLocalOnly = true 連 127.0.0.1 的連線也拒絕（WebKit -1005、App 停在啟動畫面），所以拿掉；
        // 只准本機改由 requiredInterfaceType = .loopback、綁 127.0.0.1、accept() 檢查來源位址三道負責
        let l: NWListener
        do {
            if bindEndpoint {
                params.requiredLocalEndpoint = NWEndpoint.hostPort(host: NWEndpoint.Host(XQLoopbackServer.host), port: port)
                l = try NWListener(using: params)
            } else {
                l = try NWListener(using: params, on: port)
            }
        } catch {
            xqLog("NWListener 建立失敗：\(error)")
            return xqIsAddressInUse(error) ? .inUse : .failed
        }
        stopListening()
        let once = XQOnce()
        let sem = DispatchSemaphore(value: 0)
        l.stateUpdateHandler = { [weak self, weak l] state in
            // 舊的監聽（已換掉的）回報的狀態不理
            guard let self = self, let l = l, self.isCurrent(l) else { return }
            switch state {
            case .ready:
                self.setReady(true)
                if once.set(.ready) { sem.signal() }
            case .waiting(let err):
                self.setReady(false)
                if xqIsAddressInUse(err) {
                    self.xqLog("監聽在等待：位址已被占用")
                    if once.set(.inUse) {
                        sem.signal()
                    } else {
                        DispatchQueue.main.async { [weak self] in self?.onBroken?() }
                    }
                } else {
                    self.xqLog("監聽在等待：\(err)")
                }
            case .failed(let err):
                self.xqLog("監聽失敗：\(err)")
                self.setReady(false)
                l.cancel()
                if once.set(xqIsAddressInUse(err) ? .inUse : .failed) {
                    sem.signal()
                } else {
                    // 跑到一半壞掉：交給畫面那邊重新開＋重新驗證（不在這裡默默重綁）
                    DispatchQueue.main.async { [weak self] in self?.onBroken?() }
                }
            case .cancelled:
                self.setReady(false)
            default:
                break
            }
        }
        l.newConnectionHandler = { [weak self] conn in
            self?.accept(conn)
        }
        install(l)
        l.start(queue: listenerQueue)
        if sem.wait(timeout: .now() + timeout) == .timedOut {
            if once.set(.failed) {
                xqLog("等不到 ready（逾時）")
                stopListening()
                return .failed
            }
        }
        let r = once.result
        if r != .ready { stopListening() }
        return r
    }

    // MARK: - 驗明正身（/__xq_whoami）

    private static func randomHex(byteCount: Int) -> String {
        // SystemRandomNumberGenerator：Apple 平台上是密碼學等級的系統亂數（arc4random_buf）
        var g = SystemRandomNumberGenerator()
        var s = ""
        for _ in 0..<byteCount {
            let b = UInt8.random(in: UInt8.min ... UInt8.max, using: &g)
            let h = String(b, radix: 16)
            s += h.count == 1 ? "0" + h : h
        }
        return s
    }

    private func issueChallenge() -> (challenge: String, answer: String) {
        let c = XQLoopbackServer.randomHex(byteCount: 32)
        let a = XQLoopbackServer.randomHex(byteCount: 32)
        let now = Date()
        challengeLock.lock()
        defer { challengeLock.unlock() }
        challenges = challenges.filter { $0.value.expires > now }
        if challenges.count >= 16 { challenges.removeAll() }
        challenges[c] = Challenge(answer: a, expires: now.addingTimeInterval(15))
        return (challenge: c, answer: a)
    }

    /// 查答案並作廢（一次性）；過期或沒有就回 nil
    private func takeAnswer(for c: String) -> String? {
        challengeLock.lock()
        defer { challengeLock.unlock() }
        guard let e = challenges.removeValue(forKey: c) else { return nil }
        return e.expires > Date() ? e.answer : nil
    }

    private func dropChallenge(_ c: String) {
        challengeLock.lock()
        challenges.removeValue(forKey: c)
        challengeLock.unlock()
    }

    /// 用 URLSession 打 127.0.0.1:47821/__xq_whoami：回來的答案對，才代表回話的是我們自己的伺服器。在 controlQueue 上呼叫。
    private func verifyNow(timeout: TimeInterval) -> Bool {
        let ch = issueChallenge()
        defer { dropChallenge(ch.challenge) }
        guard let url = URL(string: origin + XQLoopbackServer.whoamiPath + "?c=" + ch.challenge) else { return false }
        var req = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: timeout)
        req.httpMethod = "GET"
        let expected = ch.answer
        let passed = XQFlag()
        let sem = DispatchSemaphore(value: 0)
        let task = verifySession.dataTask(with: req) { data, response, error in
            defer { sem.signal() }
            guard error == nil,
                  let http = response as? HTTPURLResponse,
                  http.statusCode == 200,
                  http.url?.host == XQLoopbackServer.host,
                  http.url?.port == Int(XQLoopbackServer.port),
                  let data = data,
                  let body = String(data: data, encoding: .utf8) else { return }
            passed.value = body.trimmingCharacters(in: .whitespacesAndNewlines) == expected
        }
        task.resume()
        if sem.wait(timeout: .now() + timeout + 1.0) == .timedOut {
            task.cancel()
            xqLog("驗證逾時")
            return false
        }
        return passed.value
    }

    /// 這條連線是不是連到 127.0.0.1:47821（萬用位址備援模式時用：擋掉從 ::1 等其他位址繞進來的轉送）
    private func connectionIsOnExactOrigin(_ conn: NWConnection) -> Bool {
        guard let ep = conn.currentPath?.localEndpoint,
              case let .hostPort(host, port) = ep,
              port.rawValue == XQLoopbackServer.port else { return false }
        let lo = Data([127, 0, 0, 1])
        switch host {
        case .ipv4(let a):
            return a.rawValue == lo
        case .ipv6(let a):
            return a.asIPv4?.rawValue == lo
        default:
            return false
        }
    }

    private func handleWhoami(_ conn: NWConnection, req: Request, isHead: Bool) {
        var challenge = ""
        if let q = req.path.firstIndex(of: "?") {
            for pair in req.path[req.path.index(after: q)...].split(separator: "&") {
                let kv = pair.split(separator: "=", maxSplits: 1, omittingEmptySubsequences: false)
                if kv.count == 2, kv[0] == "c" { challenge = String(kv[1]) }
            }
        }
        // 先作廢考題（不管後面過不過），同一題不能試第二次
        var answer: String? = nil
        if challenge.count == 64, challenge.allSatisfy({ $0.isHexDigit }) {
            answer = takeAnswer(for: challenge)
        }
        let originOK = boundExactly || connectionIsOnExactOrigin(conn)
        guard !isHead, originOK, let a = answer else {
            dlog(conn, "whoami → 404")
            sendSimple(conn, status: 404, reason: "Not Found", keepAlive: req.keepAlive, isHead: isHead)
            return
        }
        let body = Data(a.utf8)
        var h = baseHeaders(contentType: "text/plain; charset=utf-8")
        h["Cache-Control"] = "no-store"
        h["Content-Length"] = String(body.count)
        dlog(conn, "whoami → 200")
        send(conn, status: 200, reason: "OK", headers: h, keepAlive: req.keepAlive, body: body)
    }

    // MARK: - 連線

    /// 11/16 iMac：標頭（\r\n\r\n）後面已經收進來的位元組＝下一個請求的開頭，要留給下一輪 readRequest，不能丟。
    /// 以前直接丟掉：WebKit 在同一條 keep-alive 連線上緊接著送下一個請求時，那個請求就消失了，連線等不到回應、那張圖失敗。
    private var leftovers: [ObjectIdentifier: Data] = [:]
    private let leftoverLock = NSLock()
    private func putLeftover(_ conn: NWConnection, _ d: Data) {
        leftoverLock.lock(); defer { leftoverLock.unlock() }
        if d.isEmpty { leftovers.removeValue(forKey: ObjectIdentifier(conn)) } else { leftovers[ObjectIdentifier(conn)] = d }
    }
    private func takeLeftover(_ conn: NWConnection) -> Data {
        leftoverLock.lock(); defer { leftoverLock.unlock() }
        return leftovers.removeValue(forKey: ObjectIdentifier(conn)) ?? Data()
    }

    #if DEBUG
    private var connSeq = 0
    private var connIds: [ObjectIdentifier: Int] = [:]
    private func cid(_ conn: NWConnection) -> Int {
        leftoverLock.lock(); defer { leftoverLock.unlock() }
        if let i = connIds[ObjectIdentifier(conn)] { return i }
        connSeq += 1; connIds[ObjectIdentifier(conn)] = connSeq; return connSeq
    }
    private func dlog(_ conn: NWConnection, _ m: @autoclosure () -> String) { NSLog("[XQSRV] c\(cid(conn)) \(m())") }
    #else
    @inline(__always) private func dlog(_ conn: NWConnection, _ m: @autoclosure () -> String) {}
    #endif

    private func accept(_ conn: NWConnection) {
        // acceptLocalOnly 拿掉後的防線：來源不是本機（127.x、::1、對應到 127.x 的 IPv6）就直接關掉
        if case let .hostPort(host, _) = conn.endpoint {
            var local = false
            switch host {
            case .ipv4(let a): local = a.isLoopback
            case .ipv6(let a): local = a.isLoopback || (a.asIPv4?.isLoopback ?? false)
            case .name(let n, _): local = (n == "localhost")
            @unknown default: local = false
            }
            if !local { conn.cancel(); return }
        }
        let q = DispatchQueue(label: "tw.xiangqi.loopback.conn", target: workQueue)
        conn.stateUpdateHandler = { [weak self] state in
            switch state {
            case .failed(let e):
                self?.dlog(conn, "failed \(e)")
                conn.cancel()
            case .cancelled:
                self?.dlog(conn, "cancelled")
                _ = self?.takeLeftover(conn)
            default: break
            }
        }
        dlog(conn, "accept \(conn.endpoint)")
        conn.start(queue: q)
        readRequest(conn, buffer: Data())
    }

    /// 讀到一個完整的請求標頭（\r\n\r\n）為止。buffer 裡如果已經有完整的標頭（上一個請求後面跟著來的），直接處理，不再等網路。
    private func readRequest(_ conn: NWConnection, buffer: Data) {
        if takeHead(conn, buffer) { return }
        conn.receive(minimumIncompleteLength: 1, maximumLength: 65536) { [weak self] data, _, isComplete, error in
            guard let self = self else { conn.cancel(); return }
            var buf = buffer
            if let d = data { buf.append(d) }
            self.dlog(conn, "recv \(data?.count ?? 0)B buf=\(buf.count)B complete=\(isComplete) err=\(String(describing: error))")
            if self.takeHead(conn, buf) { return }
            if error != nil || isComplete || buf.count > 65536 {
                conn.cancel()
                return
            }
            self.readRequest(conn, buffer: buf)
        }
    }

    /// buf 裡有完整標頭就交給 handle，標頭後剩下的位元組存起來給下一個請求；回 true＝處理了
    private func takeHead(_ conn: NWConnection, _ buf: Data) -> Bool {
        guard let end = buf.range(of: Data([13, 10, 13, 10])) else { return false }
        let head = buf.subdata(in: buf.startIndex..<end.lowerBound)
        let rest = buf.subdata(in: end.upperBound..<buf.endIndex)
        if !rest.isEmpty { dlog(conn, "標頭後還有 \(rest.count)B（下一個請求）") }
        putLeftover(conn, rest)
        handle(conn, head: head)
        return true
    }

    private struct Request {
        var method = ""
        var path = ""
        var headers: [String: String] = [:]
        var keepAlive = true
    }

    private func parse(_ head: Data) -> Request? {
        guard let text = String(data: head, encoding: .utf8) ?? String(data: head, encoding: .isoLatin1) else { return nil }
        let lines = text.components(separatedBy: "\r\n")
        guard let first = lines.first else { return nil }
        let parts = first.split(separator: " ", omittingEmptySubsequences: true)
        guard parts.count >= 3 else { return nil }
        var r = Request()
        r.method = String(parts[0]).uppercased()
        r.path = String(parts[1])
        let version = String(parts[2]).uppercased()
        for line in lines.dropFirst() {
            guard let c = line.firstIndex(of: ":") else { continue }
            let k = line[..<c].trimmingCharacters(in: .whitespaces).lowercased()
            let v = line[line.index(after: c)...].trimmingCharacters(in: .whitespaces)
            r.headers[k] = v
        }
        let conn = (r.headers["connection"] ?? "").lowercased()
        r.keepAlive = version == "HTTP/1.1" ? conn != "close" : conn == "keep-alive"
        return r
    }

    // MARK: - 回應

    private func handle(_ conn: NWConnection, head: Data) {
        guard let req = parse(head) else {
            sendSimple(conn, status: 400, reason: "Bad Request", keepAlive: false, isHead: false)
            return
        }
        guard req.method == "GET" || req.method == "HEAD" else {
            sendSimple(conn, status: 405, reason: "Method Not Allowed", keepAlive: req.keepAlive, isHead: false, extra: ["Allow": "GET, HEAD"])
            return
        }
        let isHead = req.method == "HEAD"
        if req.path == XQLoopbackServer.whoamiPath || req.path.hasPrefix(XQLoopbackServer.whoamiPath + "?") {
            handleWhoami(conn, req: req, isHead: isHead)
            return
        }
        dlog(conn, "\(req.method) \(req.path) range=\(req.headers["range"] ?? "-") inm=\(req.headers["if-none-match"] ?? "-") ka=\(req.keepAlive)")
        guard let file = resolve(req.path) else {
            dlog(conn, "→ 404")
            sendSimple(conn, status: 404, reason: "Not Found", keepAlive: req.keepAlive, isHead: isHead)
            return
        }
        guard let fh = try? FileHandle(forReadingFrom: file) else {
            sendSimple(conn, status: 404, reason: "Not Found", keepAlive: req.keepAlive, isHead: isHead)
            return
        }
        let size: UInt64
        do { size = try fh.seekToEnd() } catch {
            try? fh.close()
            sendSimple(conn, status: 500, reason: "Internal Server Error", keepAlive: false, isHead: isHead)
            return
        }
        let etag = "\"\(etagBase)-\(size)\""
        var headers = baseHeaders(contentType: mimeType(for: file.pathExtension))
        headers["ETag"] = etag
        headers["Accept-Ranges"] = "bytes"

        if let inm = req.headers["if-none-match"], inm == etag, req.headers["range"] == nil {
            try? fh.close()
            headers["Content-Length"] = "0"
            dlog(conn, "→ 304")
            send(conn, status: 304, reason: "Not Modified", headers: headers, keepAlive: req.keepAlive)
            return
        }

        var start: UInt64 = 0
        var end: UInt64 = size == 0 ? 0 : size - 1
        var status = 200, reason = "OK"
        if let range = req.headers["range"] {
            if let (s, e) = parseRange(range, size: size) {
                start = s; end = e; status = 206; reason = "Partial Content"
                headers["Content-Range"] = "bytes \(s)-\(e)/\(size)"
            } else {
                try? fh.close()
                headers["Content-Range"] = "bytes */\(size)"
                headers["Content-Length"] = "0"
                send(conn, status: 416, reason: "Range Not Satisfiable", headers: headers, keepAlive: req.keepAlive)
                return
            }
        }
        let length: UInt64 = size == 0 ? 0 : end - start + 1
        headers["Content-Length"] = String(length)
        dlog(conn, "→ \(status) \(length)B \(req.path)")
        send(conn, status: status, reason: reason, headers: headers, keepAlive: req.keepAlive, finish: false) { [weak self] ok in
            guard ok, !isHead, length > 0 else {
                try? fh.close()
                if ok { self?.finish(conn, keepAlive: req.keepAlive) } else { conn.cancel() }
                return
            }
            do { try fh.seek(toOffset: start) } catch { try? fh.close(); conn.cancel(); return }
            self?.stream(conn, fh: fh, remaining: length, keepAlive: req.keepAlive)
        }
    }

    /// 分塊把檔案送出去（每塊 256 KB），大檔（神經網路 48 MB、音樂）不會一次讀進記憶體
    private func stream(_ conn: NWConnection, fh: FileHandle, remaining: UInt64, keepAlive: Bool) {
        let chunk = Int(min(remaining, 262_144))
        let data: Data
        do { data = try fh.read(upToCount: chunk) ?? Data() } catch { try? fh.close(); conn.cancel(); return }
        if data.isEmpty { dlog(conn, "stream 讀不到資料，還差 \(remaining)B，cancel"); try? fh.close(); conn.cancel(); return }
        let left = remaining - UInt64(data.count)
        conn.send(content: data, completion: .contentProcessed { [weak self] err in
            if let err = err { self?.dlog(conn, "send 失敗 \(err)，還差 \(left)B，cancel"); try? fh.close(); conn.cancel(); return }
            if left == 0 {
                try? fh.close()
                self?.finish(conn, keepAlive: keepAlive)
            } else {
                self?.stream(conn, fh: fh, remaining: left, keepAlive: keepAlive)
            }
        })
    }

    private func finish(_ conn: NWConnection, keepAlive: Bool) {
        let rest = takeLeftover(conn)
        dlog(conn, "done keepAlive=\(keepAlive) leftover=\(rest.count)B")
        if keepAlive { readRequest(conn, buffer: rest) } else { conn.cancel() }
    }

    private func baseHeaders(contentType: String) -> [String: String] {
        return [
            "Content-Type": contentType,
            "Cross-Origin-Opener-Policy": "same-origin",
            "Cross-Origin-Embedder-Policy": "require-corp",
            "Cross-Origin-Resource-Policy": "same-origin",
            "Cache-Control": "no-cache",
            "X-Content-Type-Options": "nosniff",
        ]
    }

    private func send(_ conn: NWConnection, status: Int, reason: String, headers: [String: String], keepAlive: Bool,
                      finish: Bool = true, body: Data? = nil, then: ((Bool) -> Void)? = nil) {
        var h = headers
        h["Connection"] = keepAlive ? "keep-alive" : "close"
        var s = "HTTP/1.1 \(status) \(reason)\r\n"
        for (k, v) in h { s += "\(k): \(v)\r\n" }
        s += "\r\n"
        var out = Data(s.utf8)
        if let b = body { out.append(b) }
        conn.send(content: out, completion: .contentProcessed { [weak self] err in
            if let then = then { then(err == nil); return }
            if err != nil { conn.cancel(); return }
            if finish { self?.finish(conn, keepAlive: keepAlive) }
        })
    }

    private func sendSimple(_ conn: NWConnection, status: Int, reason: String, keepAlive: Bool, isHead: Bool, extra: [String: String] = [:]) {
        let body = Data("\(status) \(reason)\n".utf8)
        var h = baseHeaders(contentType: "text/plain; charset=utf-8")
        for (k, v) in extra { h[k] = v }
        h["Content-Length"] = String(body.count)
        send(conn, status: status, reason: reason, headers: h, keepAlive: keepAlive, body: isHead ? nil : body)
    }

    // MARK: - 路徑與型別

    /// 網址路徑 → public/ 裡的檔；擋掉 ..、隱藏檔、資料夾外的路徑
    private func resolve(_ target: String) -> URL? {
        guard let root = root else { return nil }
        var p = target
        if let i = p.firstIndex(where: { $0 == "?" || $0 == "#" }) { p = String(p[..<i]) }
        guard let decoded = p.removingPercentEncoding, decoded.hasPrefix("/") else { return nil }
        var comps: [String] = []
        for c in decoded.split(separator: "/", omittingEmptySubsequences: true) {
            if c == "." { continue }
            if c == ".." || c.hasPrefix(".") { return nil }
            comps.append(String(c))
        }
        var url = root
        for c in comps { url.appendPathComponent(c) }
        var isDir: ObjCBool = false
        if !FileManager.default.fileExists(atPath: url.path, isDirectory: &isDir) { return nil }
        if isDir.boolValue {
            url.appendPathComponent("index.html")
            if !FileManager.default.fileExists(atPath: url.path) { return nil }
        }
        let rp = url.standardizedFileURL.path
        guard rp == root.path || rp.hasPrefix(root.path + "/") else { return nil }
        return url
    }

    /// Range: bytes=a-b／a-／-n（只支援單一段）
    private func parseRange(_ h: String, size: UInt64) -> (UInt64, UInt64)? {
        guard size > 0 else { return nil }
        let v = h.trimmingCharacters(in: .whitespaces)
        guard v.lowercased().hasPrefix("bytes=") else { return nil }
        let spec = v.dropFirst(6)
        if spec.contains(",") { return nil }
        let ab = spec.split(separator: "-", maxSplits: 1, omittingEmptySubsequences: false)
        guard ab.count == 2 else { return nil }
        let a = ab[0].trimmingCharacters(in: .whitespaces), b = ab[1].trimmingCharacters(in: .whitespaces)
        if a.isEmpty {
            guard let n = UInt64(b), n > 0 else { return nil }
            let len = min(n, size)
            return (size - len, size - 1)
        }
        guard let s = UInt64(a), s < size else { return nil }
        if b.isEmpty { return (s, size - 1) }
        guard let e = UInt64(b), e >= s else { return nil }
        return (s, min(e, size - 1))
    }

    private func mimeType(for ext: String) -> String {
        switch ext.lowercased() {
        case "html", "htm": return "text/html; charset=utf-8"
        case "js", "mjs": return "text/javascript; charset=utf-8"
        case "css": return "text/css; charset=utf-8"
        case "json", "webmanifest": return "application/json; charset=utf-8"
        case "md": return "text/markdown; charset=utf-8"
        case "txt", "sh", "cpp": return "text/plain; charset=utf-8"
        case "xml": return "application/xml; charset=utf-8"
        case "svg": return "image/svg+xml"
        case "wasm": return "application/wasm"
        case "png": return "image/png"
        case "jpg", "jpeg": return "image/jpeg"
        case "webp": return "image/webp"
        case "gif": return "image/gif"
        case "ico": return "image/x-icon"
        case "mp3": return "audio/mpeg"
        case "wav": return "audio/wav"
        case "m4a": return "audio/mp4"
        case "ogg": return "audio/ogg"
        case "mp4": return "video/mp4"
        case "glb": return "model/gltf-binary"
        case "gltf": return "model/gltf+json"
        case "woff2": return "font/woff2"
        case "woff": return "font/woff"
        case "ttf": return "font/ttf"
        case "otf": return "font/otf"
        case "pdf": return "application/pdf"
        default: return "application/octet-stream"
        }
    }
}
