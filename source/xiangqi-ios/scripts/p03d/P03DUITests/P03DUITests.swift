import XCTest

/// iOS P0-3D 真實觸控伺服：在 P03D_DIR（預設 /tmp/p03d）輪詢 cmd-<n>.json，
/// 內容是 JSON 陣列：{"op":"tap"|"press"|"wait","x":..,"y":..,"s":秒,"after":秒}，座標單位是裝置 point（以 App 視窗左上角為原點）。
/// 用 XCUICoordinate 真實點擊（走系統觸控，不是 JS 合成），做完寫 done-<n>.txt。看到 {"op":"quit"} 就結束。
/// 驅動端是 p03d.js；這支只負責「點」，不判斷結果。
final class P03DUITests: XCTestCase {
    func testServe() throws {
        let env = ProcessInfo.processInfo.environment
        let dir = env["P03D_DIR"] ?? "/tmp/p03d"
        let bundle = env["P03D_BUNDLE"] ?? "com.raysonchen.xiangqiqianqiu.dev"
        let maxIdle = Double(env["P03D_IDLE"] ?? "600") ?? 600
        let app = XCUIApplication(bundleIdentifier: bundle)
        let fm = FileManager.default
        try? "ready \(app.state.rawValue)\n".write(toFile: dir + "/served.txt", atomically: true, encoding: .utf8)
        var n = 1
        var idleSince = Date()
        while true {
            let cmd = "\(dir)/cmd-\(n).json"
            guard fm.fileExists(atPath: cmd), let data = fm.contents(atPath: cmd),
                  let cmds = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else {
                if Date().timeIntervalSince(idleSince) > maxIdle { return }
                Thread.sleep(forTimeInterval: 0.15); continue
            }
            idleSince = Date()
            var log = ""
            let origin = app.coordinate(withNormalizedOffset: CGVector(dx: 0, dy: 0))
            for c in cmds {
                let op = c["op"] as? String ?? "tap"
                if op == "quit" { try? "quit\n".write(toFile: "\(dir)/done-\(n).txt", atomically: true, encoding: .utf8); return }
                if op == "wait" { Thread.sleep(forTimeInterval: (c["s"] as? Double) ?? 1); log += "wait\n"; continue }
                let x = (c["x"] as? Double) ?? 0, y = (c["y"] as? Double) ?? 0
                let p = origin.withOffset(CGVector(dx: x, dy: y))
                if op == "press" { p.press(forDuration: (c["s"] as? Double) ?? 1) } else { p.tap() }
                log += "\(op) \(x) \(y) \(Date().timeIntervalSince1970)\n"
                Thread.sleep(forTimeInterval: (c["after"] as? Double) ?? 0.3)
            }
            try? log.write(toFile: "\(dir)/done-\(n).txt", atomically: true, encoding: .utf8)
            n += 1
        }
    }
}
