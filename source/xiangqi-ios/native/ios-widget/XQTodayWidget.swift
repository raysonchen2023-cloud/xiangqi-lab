//
//  XQTodayWidget.swift
//  象棋千秋：「今日茶單」桌面小工具（Widget Extension，SwiftUI＋WidgetKit）
//
//  11/17 加（上架原生 App 待辦第 3 項）。小、中兩種尺寸：
//    小：節氣圖當底、節氣名、今日茶單完成幾題
//    中：左邊節氣圖，右邊節氣名＋今天三題（一口、一盞、一壺）＋連續天數
//  點了開 App 的今日茶單頁（xqqianqiu://canju → 網頁 #/canju，src/native-bridge.js 接手）。
//
//  資料：主 App 的 XQWidgetDataPlugin 寫進 App Group 容器的 today.json＋today.jpg（見 native/ios/XQWidgetDataPlugin.swift）。
//  沒有資料、或資料是前一天的（茶單每天凌晨 4 點換，跟網頁 cjDay 一樣），顯示預設文字，中英文都有。
//
//  這支只讀手機上的 App Group 容器，不連網、不收資料。
//  在 Windows 上寫好、還沒編譯過。只用公開 API：WidgetKit、SwiftUI、UIKit、Foundation。
//

import WidgetKit
import SwiftUI
import UIKit
import Foundation

// MARK: - 共用設定（要跟 native/ios/XQWidgetDataPlugin.swift 一樣）

enum XQWidgetConfig {
    static let appGroup = "group.com.raysonchen.xiangqiqianqiu.shared"
    static let dataFile = "today.json"
    static let imageFile = "today.jpg"
    static let kind = "XQTodayWidget"
    /// 點小工具開 App 的今日茶單（Info.plist 的 CFBundleURLTypes 要有 xqqianqiu，scripts/install-native.js --gc-widget 會加）
    static let openURL = URL(string: "xqqianqiu://canju")
    /// 茶單換日的時間（凌晨 4 點，跟網頁 07c-canju.js 的 cjDay 一樣）
    static let rolloverHour = 4
}

// MARK: - 資料

/// today.json 的格式（07gc-native.js 的 gcnWidgetData 產生）
struct XQTodayItem: Decodable {
    let ic: String?
    let zh: String?
    let en: String?
    let done: Bool?
}

struct XQTodayData: Decodable {
    let v: Int?
    /// 茶單的日子（凌晨 4 點換日），例如 "2026-11-17"
    let day: String?
    /// "zh"／"en"：玩家在 App 裡選的語言
    let lang: String?
    let termZh: String?
    let termEn: String?
    let items: [XQTodayItem]?
    let doneN: Int?
    let streak: Int?
}

struct XQTodayEntry: TimelineEntry {
    let date: Date
    let data: XQTodayData?
    /// 資料是不是今天的
    let fresh: Bool
    let image: UIImage?
    let english: Bool
}

enum XQTodayStore {
    static func container() -> URL? {
        FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: XQWidgetConfig.appGroup)
    }

    /// 茶單的日子：現在往前推 4 小時的本地日期
    static func dayKey(_ d: Date) -> String {
        let shifted = d.addingTimeInterval(-Double(XQWidgetConfig.rolloverHour) * 3600)
        let c = Calendar.current.dateComponents([.year, .month, .day], from: shifted)
        return String(format: "%04ld-%02ld-%02ld", c.year ?? 0, c.month ?? 0, c.day ?? 0)
    }

    /// 下一次凌晨 4 點
    static func nextRollover(after d: Date) -> Date {
        let cal = Calendar.current
        var c = cal.dateComponents([.year, .month, .day], from: d)
        c.hour = XQWidgetConfig.rolloverHour
        c.minute = 0
        c.second = 5
        var t = cal.date(from: c) ?? d.addingTimeInterval(3600)
        if t <= d {
            t = cal.date(byAdding: .day, value: 1, to: t) ?? d.addingTimeInterval(86400)
        }
        return t
    }

    static func systemEnglish() -> Bool {
        let first = (Locale.preferredLanguages.first ?? "zh-Hant").lowercased()
        return !first.hasPrefix("zh")
    }

    static func load(at date: Date) -> XQTodayEntry {
        var data: XQTodayData?
        var image: UIImage?
        if let box = container() {
            if let raw = try? Data(contentsOf: box.appendingPathComponent(XQWidgetConfig.dataFile)) {
                data = try? JSONDecoder().decode(XQTodayData.self, from: raw)
            }
            image = UIImage(contentsOfFile: box.appendingPathComponent(XQWidgetConfig.imageFile).path)
        }
        let english: Bool
        if let l = data?.lang { english = (l == "en") } else { english = systemEnglish() }
        let fresh = data?.day != nil && data?.day == dayKey(date)
        return XQTodayEntry(date: date, data: data, fresh: fresh, image: image, english: english)
    }
}

// MARK: - 文字（中英）

enum XQText {
    static func title(_ en: Bool) -> String { en ? "Today's tea menu" : "今日茶單" }
    static func appName(_ en: Bool) -> String { en ? "Xiangqi Qianqiu" : "象棋千秋" }
    static func empty(_ en: Bool) -> String { en ? "Open the app to brew today's three puzzles." : "打開 App，泡今天的三題殘局。" }
    static func stale(_ en: Bool) -> String { en ? "A new menu is ready. Open the app to see it." : "今天的茶單換新了，打開 App 看看。" }
    static func allDone(_ en: Bool) -> String { en ? "All done today ✔" : "今天的茶喝完了 ✔" }
    static func progress(_ en: Bool, _ n: Int) -> String { en ? "\(n)/3 done" : "已完成 \(n)／3" }
    static func streak(_ en: Bool, _ n: Int) -> String { en ? "🔥 \(n)-day streak" : "🔥 連續 \(n) 天" }
    static let displayName = "今日茶單 Today's tea"
    static let desc = "節氣圖和今天的三題殘局。Solar term and today's three puzzles."
}

// MARK: - 時間軸

struct XQTodayProvider: TimelineProvider {
    func placeholder(in context: Context) -> XQTodayEntry {
        XQTodayEntry(date: Date(), data: nil, fresh: false, image: nil, english: XQTodayStore.systemEnglish())
    }

    func getSnapshot(in context: Context, completion: @escaping (XQTodayEntry) -> Void) {
        completion(XQTodayStore.load(at: Date()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<XQTodayEntry>) -> Void) {
        let now = Date()
        let next = XQTodayStore.nextRollover(after: now)
        // 現在一筆；凌晨 4 點再一筆（那時資料變成前一天的，會改顯示「換新了」）
        let entries = [XQTodayStore.load(at: now), XQTodayStore.load(at: next)]
        completion(Timeline(entries: entries, policy: .after(next.addingTimeInterval(60))))
    }
}

// MARK: - 畫面

private let xqInk = Color(red: 0.95, green: 0.90, blue: 0.81)
private let xqBrown = Color(red: 59.0 / 255.0, green: 42.0 / 255.0, blue: 26.0 / 255.0)

/// iOS 17 起小工具要用 containerBackground；15、16 用一般背景
struct XQWidgetBackground<B: View>: ViewModifier {
    let bg: B
    @ViewBuilder
    func body(content: Content) -> some View {
        if #available(iOS 17.0, *) {
            content.containerBackground(for: .widget) { bg }
        } else {
            content.background(bg)
        }
    }
}

extension View {
    func xqWidgetBackground<B: View>(_ bg: B) -> some View {
        modifier(XQWidgetBackground(bg: bg))
    }
}

struct XQTermImage: View {
    let image: UIImage?
    var body: some View {
        if let img = image {
            Image(uiImage: img)
                .resizable()
                .scaledToFill()
        } else {
            LinearGradient(colors: [Color(red: 0.42, green: 0.30, blue: 0.18), xqBrown], startPoint: .top, endPoint: .bottom)
        }
    }
}

struct XQTodayView: View {
    @Environment(\.widgetFamily) var family
    let entry: XQTodayEntry

    private var en: Bool { entry.english }
    private var term: String? {
        guard let d = entry.data else { return nil }
        let t = en ? (d.termEn ?? d.termZh) : (d.termZh ?? d.termEn)
        return (t?.isEmpty ?? true) ? nil : t
    }
    private var items: [XQTodayItem] { entry.fresh ? (entry.data?.items ?? []) : [] }
    private var doneN: Int { entry.fresh ? max(0, min(3, entry.data?.doneN ?? 0)) : 0 }
    private var streak: Int { entry.fresh ? max(0, entry.data?.streak ?? 0) : 0 }

    private var statusLine: String {
        if entry.data == nil { return XQText.empty(en) }
        if !entry.fresh { return XQText.stale(en) }
        return doneN >= 3 ? XQText.allDone(en) : XQText.progress(en, doneN)
    }

    var body: some View {
        Group {
            if family == .systemMedium {
                medium
            } else {
                small
            }
        }
        .widgetURL(XQWidgetConfig.openURL)
    }

    private var small: some View {
        VStack(alignment: .leading, spacing: 2) {
            Spacer(minLength: 0)
            Text(term ?? XQText.appName(en))
                .font(.system(.title3, design: .serif).weight(.bold))
                .foregroundColor(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
            Text(XQText.title(en))
                .font(.caption.weight(.semibold))
                .foregroundColor(xqInk)
                .lineLimit(1)
            Text(statusLine)
                .font(.caption2)
                .foregroundColor(xqInk)
                .lineLimit(2)
                .minimumScaleFactor(0.8)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomLeading)
        .shadow(color: Color.black.opacity(0.6), radius: 2, x: 0, y: 1)
        .xqWidgetBackground(
            ZStack {
                XQTermImage(image: entry.image)
                LinearGradient(colors: [Color.clear, Color.black.opacity(0.65)], startPoint: .center, endPoint: .bottom)
            }
        )
        .accessibilityElement(children: .combine)
    }

    private var medium: some View {
        GeometryReader { geo in
            HStack(spacing: 12) {
                XQTermImage(image: entry.image)
                    .frame(width: geo.size.height, height: geo.size.height)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    .accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 4) {
                    HStack(alignment: .firstTextBaseline, spacing: 6) {
                        Text(term ?? XQText.appName(en))
                            .font(.system(.headline, design: .serif).weight(.bold))
                            .foregroundColor(xqInk)
                            .lineLimit(1)
                        Text(XQText.title(en))
                            .font(.caption)
                            .foregroundColor(xqInk.opacity(0.8))
                            .lineLimit(1)
                    }
                    if items.isEmpty {
                        Text(statusLine)
                            .font(.footnote)
                            .foregroundColor(xqInk)
                            .lineLimit(3)
                    } else {
                        ForEach(0..<min(3, items.count), id: \.self) { i in
                            row(items[i])
                        }
                        Text(streak > 0 ? XQText.streak(en, streak) + "・" + statusLine : statusLine)
                            .font(.caption2)
                            .foregroundColor(xqInk.opacity(0.85))
                            .lineLimit(1)
                            .minimumScaleFactor(0.8)
                    }
                    Spacer(minLength: 0)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .xqWidgetBackground(xqBrown)
        .accessibilityElement(children: .combine)
    }

    private func row(_ it: XQTodayItem) -> some View {
        let text = (en ? (it.en ?? it.zh) : (it.zh ?? it.en)) ?? ""
        let done = it.done ?? false
        return HStack(spacing: 4) {
            Text(it.ic ?? "🍵").font(.footnote)
            Text(text)
                .font(.footnote)
                .foregroundColor(xqInk)
                .lineLimit(1)
                .minimumScaleFactor(0.75)
            Spacer(minLength: 0)
            if done {
                Text("✔").font(.footnote.weight(.bold)).foregroundColor(Color(red: 0.55, green: 0.82, blue: 0.55))
            }
        }
        .opacity(done ? 0.7 : 1)
    }
}

// MARK: - 小工具

struct XQTodayWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: XQWidgetConfig.kind, provider: XQTodayProvider()) { entry in
            XQTodayView(entry: entry)
        }
        .configurationDisplayName(XQText.displayName)
        .description(XQText.desc)
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

@main
struct XQWidgetBundle: WidgetBundle {
    var body: some Widget {
        XQTodayWidget()
    }
}
