//
//  XQWidgetDataPlugin.swift
//  象棋千秋：把「今日茶單」交給桌面小工具（Capacitor 自訂外掛，JS 名稱 XQWidgetData）
//
//  11/17 加（上架原生 App 待辦第 3 項）。網頁端 xiangqi-db/m/07gc-native.js 每天（開 App、回到前景換了日子、茶單進度變了）
//  經由 src/native-bridge.js 的 XQNative.widget.setToday(json, imagePath) 呼叫這裡：
//    json      ＝今天的節氣、茶單三題（一口、一盞、一壺）、完成幾題、連續天數，中英文都有（格式見 native/ios-widget/XQTodayWidget.swift 的 XQTodayData）
//    imagePath ＝安裝包 www 裡的節氣圖相對路徑（例如 data/homemap/home_winter.webp）
//  這裡把 json 存成 App Group 容器裡的 today.json，把圖從安裝包讀出來、裁成正方形縮到 400×400 存成 today.jpg，
//  再呼叫 WidgetCenter.shared.reloadAllTimelines() 請小工具重畫。
//
//  原則：只寫手機上的 App Group 容器，不連網、不送資料。
//  App Group 要付費開發者帳號；還沒開（免費 Personal Team）時 containerURL 是 nil，這裡回 ok:false，App 照常。
//
//  註冊方式：capacitor.config.json 的 packageClassList 加 "XQWidgetDataPlugin"（scripts/install-native.js --gc-widget 會加）。
//
//  在 Windows 上寫好、還沒編譯過。只用公開 API：WidgetKit、UIKit、Foundation。
//

import Foundation
import UIKit
import WidgetKit
import Capacitor

@objc(XQWidgetDataPlugin)
public class XQWidgetDataPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "XQWidgetDataPlugin"
    public let jsName = "XQWidgetData"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setToday", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise)
    ]

    /// 跟小工具共用的 App Group（主 App 與 Widget Extension 的 entitlements 都要有這一個）
    static let appGroup = "group.com.raysonchen.xiangqiqianqiu.shared"
    static let dataFile = "today.json"
    static let imageFile = "today.jpg"
    /// 小工具用的圖：正方形 400×400（小工具的圖太大會畫不出來）
    static let imageSide: CGFloat = 400
    static let maxJSONBytes = 16 * 1024

    private let work = DispatchQueue(label: "xq.widgetdata", qos: .utility)

    @objc func status(_ call: CAPPluginCall) {
        let ok = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: XQWidgetDataPlugin.appGroup) != nil
        call.resolve(["ok": ok, "appGroup": ok])
    }

    @objc func setToday(_ call: CAPPluginCall) {
        guard let json = call.getString("json"), let data = json.data(using: .utf8),
              data.count > 0, data.count <= XQWidgetDataPlugin.maxJSONBytes,
              let obj = try? JSONSerialization.jsonObject(with: data, options: []), obj is [String: Any] else {
            call.resolve(["ok": false, "reason": "badJson"])
            return
        }
        guard let box = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: XQWidgetDataPlugin.appGroup) else {
            call.resolve(["ok": false, "reason": "noAppGroup"])
            return
        }
        let imagePath = call.getString("imagePath") ?? ""
        let www = bridge?.config.appLocation
        work.async {
            var hasImage = false
            let imgURL = box.appendingPathComponent(XQWidgetDataPlugin.imageFile)
            if let root = www, let src = XQWidgetDataPlugin.safeAsset(root: root, rel: imagePath),
               let img = UIImage(contentsOfFile: src.path),
               let jpg = XQWidgetDataPlugin.squareJPEG(img) {
                do {
                    try jpg.write(to: imgURL, options: .atomic)
                    hasImage = true
                } catch {
                    hasImage = false
                }
            }
            if !hasImage {
                // 沒有新圖：拿掉舊圖，免得小工具顯示別的節氣的圖
                try? FileManager.default.removeItem(at: imgURL)
            }
            do {
                try data.write(to: box.appendingPathComponent(XQWidgetDataPlugin.dataFile), options: .atomic)
            } catch {
                call.resolve(["ok": false, "reason": "writeFailed"])
                return
            }
            DispatchQueue.main.async {
                WidgetCenter.shared.reloadAllTimelines()
            }
            call.resolve(["ok": true, "image": hasImage])
        }
    }

    /// 只收安裝包 www 底下 data/ 裡的圖（不收「..」、不收絕對路徑），而且檔案要真的在
    static func safeAsset(root: URL, rel: String) -> URL? {
        if rel.isEmpty || rel.count > 200 { return nil }
        if !rel.hasPrefix("data/") || rel.contains("..") || rel.contains("//") || rel.contains("\\") { return nil }
        let lower = rel.lowercased()
        guard lower.hasSuffix(".webp") || lower.hasSuffix(".png") || lower.hasSuffix(".jpg") || lower.hasSuffix(".jpeg") else { return nil }
        let ok = CharacterSet(charactersIn: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._-/")
        guard rel.unicodeScalars.allSatisfy({ ok.contains($0) }) else { return nil }
        let url = root.appendingPathComponent(rel).standardizedFileURL
        let base = root.standardizedFileURL.path
        guard url.path.hasPrefix(base.hasSuffix("/") ? base : base + "/") else { return nil }
        return FileManager.default.fileExists(atPath: url.path) ? url : nil
    }

    /// 從中間裁成正方形、縮成 imageSide×imageSide 的 JPEG
    static func squareJPEG(_ img: UIImage) -> Data? {
        let w = img.size.width, h = img.size.height
        if w <= 0 || h <= 0 { return nil }
        let side = imageSide
        let scale = max(side / w, side / h)
        let dw = w * scale, dh = h * scale
        let rect = CGRect(x: (side - dw) / 2, y: (side - dh) / 2, width: dw, height: dh)
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        format.opaque = true
        let renderer = UIGraphicsImageRenderer(size: CGSize(width: side, height: side), format: format)
        let out = renderer.image { ctx in
            UIColor(red: 59.0 / 255.0, green: 42.0 / 255.0, blue: 26.0 / 255.0, alpha: 1).setFill()
            ctx.fill(CGRect(x: 0, y: 0, width: side, height: side))
            img.draw(in: rect)
        }
        return out.jpegData(compressionQuality: 0.82)
    }
}
