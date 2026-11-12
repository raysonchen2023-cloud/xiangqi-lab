#!/usr/bin/env node
// 繁體中文用字一致性檢查（評比循環第 12 輪 X12；評審「繁中在地化 QA」68.5 分扣在用字一致、在地用語、同物異名、全半形標點）。
// 只讀：從 App 原始碼抽出使用者看得到的中文字串（字串常值、模板字面、HTML 片段文字；略過 /* */ 與 // 註解、正規式），逐條套規則。
// 用法（在任何資料夾都可以）：
//   node xiangqi-lab/tools/zh-lint.js                     掃預設範圍，印摘要
//   node xiangqi-lab/tools/zh-lint.js --report a.md [--copy b.md]   另寫成 Markdown 報告（LF 換行；--copy 寫一份逐字相同的）
//   node xiangqi-lab/tools/zh-lint.js --json              整份結果印成 JSON
//   node xiangqi-lab/tools/zh-lint.js --fixes f.json [--preview]   檢查修正清單：每筆 old 在檔內恰好出現一次、new 不同；--preview 另印套用前後的處數（只在記憶體套，不寫檔）
//   node xiangqi-lab/tools/zh-lint.js 檔案 ...            只掃指定的檔（相對 myClaude 或絕對路徑）
// 預設範圍：xiangqi-db/m/*.js、xiangqi-db/m.css、xiangqi-lab/src/*.js（不含第三方 opencc／three／jsQR／qrcode）、
//           xiangqi-lab/site/core.js、xiangqi-lab/site/zh.js、xiangqi-lab/site/data/docs/*.md。
// 略過一行：同一行任一處（通常是 /* */ 註解）寫 zh-lint-ok。不要用 // 註解（一行程式會被吃掉）。
// 嚴重度：error＝幾乎一定要改；review＝看語境（同一個詞在臺灣也有別的正確用法）；info＝只統計。
// 簡體字判定：沿用 site/zh.js 的「Big5 沒有的純簡體字」表（App 執行時遇到這些字會當場用 OpenCC 轉，但原始碼裡仍不該有）；
//           建議字用 src/opencc-cn2t.js（opencc-js，MIT）轉；找不到這兩個檔就退回內建的小表。
"use strict";
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..", "..");
const HAN = /\p{sc=Han}/u;
const MASK = "¤";   /* 模板 ${…} 的內容換成同長度的 ¤，位移不變、規則看不到程式 */

/* ===== 1. 大陸用語 → 臺灣用語 =====
   [大陸用語, 臺灣建議, 嚴重度, 說明, (可選)排除的正規式：命中位置前後文符合就不算] */
const TERMS = [
  ["視頻", "影片", "error", "video；臺灣說影片"],
  ["軟件", "軟體", "error", "software"],
  ["硬件", "硬體", "error", "hardware"],
  ["默認", "預設", "error", "default"],
  ["缺省", "預設", "error", "default"],
  ["網絡", "網路", "error", "network"],
  ["屏幕", "螢幕", "error", "screen"],
  ["全屏", "全螢幕", "error", "full screen"],
  ["截屏", "截圖", "error", "screenshot"],
  ["觸屏", "觸控螢幕", "error", "touch screen"],
  ["鼠標", "滑鼠", "error", "mouse"],
  ["用戶", "使用者／玩家", "error", "user；遊戲內多半就是玩家"],
  ["質量", "品質", "error", "quality（物理的質量除外）"],
  ["反饋", "回饋", "error", "feedback；App 用「意見回饋」"],
  ["激活", "啟用", "error", "activate"],
  ["登錄", "登入", "error", "log in"],
  ["菜單", "選單", "error", "menu"],
  ["界面", "介面", "error", "interface"],
  ["窗口", "視窗", "review", "電腦視窗才改；房子的窗口不改"],
  ["讀屏", "螢幕報讀", "error", "screen reader；臺灣說螢幕報讀／螢幕閱讀器"],
  ["彈窗", "彈出視窗", "error", "popup"],
  ["鏈接", "連結", "error", "link"],
  ["博客", "部落格", "error", "blog"],
  ["打印", "列印", "error", "print"],
  ["緩存", "快取", "error", "cache"],
  ["內存", "記憶體", "error", "memory"],
  ["服務器", "伺服器", "error", "server"],
  ["互聯網", "網際網路", "error", "internet"],
  ["在線", "線上", "error", "online", /在線(?=上)/],
  ["短信", "簡訊", "error", "SMS"],
  ["兼容", "相容", "error", "compatible"],
  ["卸載", "解除安裝", "error", "uninstall"],
  ["加載", "載入", "error", "load"],
  ["運行", "執行", "error", "run"],
  ["調試", "偵錯", "error", "debug"],
  ["源代碼", "原始碼", "error", "source code"],
  ["源碼", "原始碼", "error", "source code"],
  ["代碼", "程式碼", "review", "程式碼意思才改；編號、結束代碼這類代號不改"],
  ["字符", "字元", "error", "character"],
  ["圖標", "圖示", "error", "icon"],
  ["刷新", "重新整理", "error", "refresh"],
  ["搜索", "搜尋", "error", "search"],
  ["粘貼", "貼上", "error", "paste"],
  ["文件夾", "資料夾", "error", "folder"],
  ["文檔", "文件", "error", "document"],
  ["自定義", "自訂", "error", "customize"],
  ["個性化", "個人化", "error", "personalize"],
  ["二維碼", "QR 碼", "error", "QR code"],
  ["掃碼", "掃描 QR 碼", "error", "scan code"],
  ["線程", "執行緒", "error", "thread", /線程式/],
  ["變量", "變數", "error", "variable"],
  ["字段", "欄位", "error", "field"],
  ["數據庫", "資料庫", "error", "database"],
  ["端口", "連接埠", "error", "port"],
  ["插件", "外掛", "error", "plugin"],
  ["控件", "控制項", "error", "control"],
  ["實時", "即時", "error", "real time"],
  ["人工智能", "人工智慧", "error", "AI"],
  ["智能", "智慧", "error", "smart／intelligent"],
  ["計算機", "電腦", "error", "computer（臺灣的計算機是計算器）"],
  ["移動端", "行動裝置", "error", "mobile"],
  ["高清", "高畫質", "error", "HD"],
  ["交互", "互動", "error", "interaction"],
  ["帶寬", "頻寬", "error", "bandwidth"],
  ["分辨率", "解析度", "error", "resolution"],
  ["充值", "儲值", "error", "top up"],
  ["賬號", "帳號", "error", "account"],
  ["賬戶", "帳戶", "error", "account"],
  ["信號", "訊號", "error", "signal"],
  ["音頻", "音訊", "error", "audio", /音頻率/],
  ["運營", "營運", "error", "operation"],
  ["靠譜", "可靠", "error", "reliable"],
  ["點贊", "按讚", "error", "like"],
  ["帖子", "貼文", "review", "網路發文才改；請帖、名帖不改"],
  ["教程", "教學", "error", "tutorial"],
  ["性價比", "CP 值", "error", "cost performance"],
  ["信息", "訊息／資訊", "error", "information／message"],
  ["程序員", "程式設計師", "error", "programmer"],
  ["小程序", "小程式", "error", "mini program"],
  ["應用程序", "應用程式", "error", "application"],
  ["屏蔽", "封鎖", "error", "block"],
  ["拉黑", "封鎖", "error", "block"],
  ["硬盤", "硬碟", "error", "hard disk"],
  ["光盤", "光碟", "error", "CD"],
  ["筆記本電腦", "筆電", "error", "laptop"],
  ["寬帶", "寬頻", "error", "broadband"],
  ["錄像", "錄影", "error", "recording"],
  ["獲取", "取得", "error", "get"],
  ["創建", "建立", "error", "create"],
  ["注銷", "登出", "error", "log out"],
  ["註銷", "登出", "review", "log out（臺灣的註銷多指撤銷登記）"],
  ["登陸", "登入", "review", "log in（颱風、軍隊上岸的登陸不改）"],
  ["程序", "程式／步驟", "review", "program（法律、行政程序不改）"],
  ["設置", "設定", "review", "settings（設置路障這類「安裝」意思不改）"],
  ["保存", "儲存", "review", "save（保存古物這類意思不改）"],
  ["數據", "資料", "review", "data（統計數字意思可留）"],
  ["優化", "最佳化／改善", "review", "optimize（臺灣也常說優化）"],
  ["點擊", "點選／輕觸", "review", "click；臺灣也說，但同一個 App 要統一"],
  ["退出", "離開／結束", "review", "exit"],
  ["不支持", "不支援", "review", "not supported（軟體功能）"],
  ["模板", "範本", "review", "template"],
  ["視圖", "檢視", "review", "view"],
  ["調用", "呼叫", "review", "call"],
  ["關注", "追蹤", "review", "follow（社群）"],
  ["博弈", "對弈", "review", "game theory 以外的下棋"],
  ["這兒", "這裡", "review", "北方口語；角色對白可留"],
  ["那兒", "那裡", "review", "北方口語；角色對白可留"],
  ["哪兒", "哪裡", "review", "北方口語；角色對白可留"],
  ["咱們", "我們", "review", "北方口語；角色對白可留"],
  ["給力", "很棒", "review", "大陸網路用語"],
  ["立馬", "立刻", "review", "大陸口語"],
  ["貌似", "好像", "review", "大陸網路用語"],
  ["出租車", "計程車", "error", "taxi"],
  ["公交車", "公車", "error", "bus"],
  ["方便面", "泡麵", "error", "instant noodles"],
  ["早上好", "早安", "error", "good morning"],
  ["晚上好", "晚安", "error", "good evening"]
];

/* ===== 2. 簡繁轉換常見錯字（一簡對多繁轉錯）：[錯, 對, 說明, (可選)排除] ===== */
const MISCONV = [
  ["分鍾", "分鐘", "鐘錶的鐘"], ["時鍾", "時鐘", "鐘錶的鐘"], ["鍾頭", "鐘頭", "鐘錶的鐘"],
  ["放松", "放鬆", "鬆緊的鬆"], ["輕松", "輕鬆", "鬆緊的鬆"], ["寬松", "寬鬆", "鬆緊的鬆"],
  ["頭發", "頭髮", "毛髮的髮"], ["干脆", "乾脆", "乾溼的乾"], ["干淨", "乾淨", "乾溼的乾"], ["干杯", "乾杯", "乾溼的乾"],
  ["重復", "重複", "複數的複"], ["復製", "複製", "複製"], ["復制", "複製", "複製"], ["復雜", "複雜", "複數的複"],
  ["反復", "反覆", "覆蓋的覆"], ["答復", "答覆", "覆蓋的覆"],
  ["聯系", "聯繫", "繫結的繫"], ["關系", "關係", "關係的係"], ["沒關系", "沒關係", "關係的係"],
  ["一只", "一隻", "量詞用隻（只是副詞「只有」）", /一只[是有要能會在好剩看差用]/], ["兩只", "兩隻", "量詞用隻"], ["幾只", "幾隻", "量詞用隻"],
  ["這只", "這隻", "量詞用隻（「這只是」不算）", /這只[是有要能會在好剩看差用證不]/], ["那只", "那隻", "量詞用隻", /那只[是有要能會在好剩看差用證不]/],
  ["台風", "颱風", "颱風"], ["范圍", "範圍", "範圍"], ["模范", "模範", "範"], ["規范", "規範", "範"], ["示范", "示範", "範"],
  ["制作", "製作", "製造的製"], ["繪制", "繪製", "製造的製"], ["錄制", "錄製", "製造的製"],
  ["准確", "準確", "標準的準（准是准許）"], ["標准", "標準", "標準的準"], ["准備", "準備", "標準的準"], ["水准", "水準", "標準的準"], ["精准", "精準", "標準的準"],
  ["這里", "這裡", "裡外的裡"], ["那里", "那裡", "裡外的裡"], ["哪里", "哪裡", "裡外的裡"], ["心里", "心裡", "裡外的裡"], ["家里", "家裡", "裡外的裡"],
  ["然后", "然後", "前後的後"], ["以后", "以後", "前後的後"], ["之后", "之後", "前後的後"], ["最后", "最後", "前後的後"],
  ["后面", "後面", "前後的後"], ["后來", "後來", "前後的後"], ["先后", "先後", "前後的後"], ["前后", "前後", "前後的後"], ["后手", "後手", "前後的後"],
  ["其余", "其餘", "多餘的餘"], ["剩余", "剩餘", "多餘的餘"], ["多余", "多餘", "多餘的餘"], ["業余", "業餘", "多餘的餘"],
  ["收獲", "收穫", "收穫"], ["日歷", "日曆", "曆法的曆"], ["日志", "日誌", "誌"], ["標志", "標誌", "誌"], ["雜志", "雜誌", "誌"],
  ["游戲", "遊戲", "遊玩的遊（游泳才用游）"], ["旅游", "旅遊", "遊"], ["游客", "遊客", "遊"], ["游玩", "遊玩", "遊"],
  ["沖突", "衝突", "衝"], ["緩沖", "緩衝", "衝"], ["沖擊", "衝擊", "衝"], ["注冊", "註冊", "註"],
  ["戰斗", "戰鬥", "鬥"], ["斗爭", "鬥爭", "鬥"], ["搏斗", "搏鬥", "鬥"], ["決斗", "決鬥", "鬥"], ["奮斗", "奮鬥", "鬥"],
  ["舍不得", "捨不得", "捨"], ["取舍", "取捨", "捨"], ["舍棄", "捨棄", "捨"], ["鍛煉", "鍛鍊", "臺灣標準字作鍛鍊"], ["向往", "嚮往", "嚮"],
  ["什麽", "什麼", "麼"], ["于是", "於是", "於"], ["關于", "關於", "於"], ["對于", "對於", "於"], ["由于", "由於", "於"], ["終于", "終於", "於"],
  ["等于", "等於", "於"], ["位于", "位於", "於"], ["屬于", "屬於", "於"], ["至于", "至於", "於"], ["在于", "在於", "於"],
  ["保証", "保證", "證"], ["驗証", "驗證", "證"], ["証明", "證明", "證"], ["按扭", "按鈕", "鈕"],
  ["每周", "每週", "星期用週"], ["本周", "本週", "星期用週"], ["上周", "上週", "星期用週"], ["下周", "下週", "星期用週"], ["周末", "週末", "星期用週"],
  ["周一", "週一", "星期用週"], ["周二", "週二", "星期用週"], ["周三", "週三", "星期用週"], ["周四", "週四", "星期用週"], ["周五", "週五", "星期用週"],
  ["周六", "週六", "星期用週"], ["周日", "週日", "星期用週"], ["周年", "週年", "週年"], ["周賽", "週賽", "星期用週"], ["周榜", "週榜", "星期用週"], ["周報", "週報", "星期用週"]
];

/* ===== 3. 異體字（Big5 有，但不是臺灣教育部標準字／臺灣慣用字）：字 → 建議 ===== */
const VARIANTS = {
  "着": "著", "裏": "裡", "爲": "為", "説": "說", "綫": "線", "眞": "真", "啓": "啟", "衆": "眾", "户": "戶", "内": "內",
  "温": "溫", "强": "強", "敎": "教", "吴": "吳", "衞": "衛", "峯": "峰", "羣": "群", "牀": "床", "麪": "麵", "鷄": "雞",
  "閲": "閱", "擧": "舉", "産": "產", "竪": "豎", "册": "冊", "卧": "臥", "墻": "牆", "僞": "偽", "録": "錄", "黄": "黃",
  "麽": "麼", "歳": "歲", "凈": "淨", "鈎": "鉤", "綉": "繡", "兎": "兔", "銹": "鏽", "脚": "腳", "躰": "體",
  "粧": "妝", "峝": "峒", "嵗": "歲", "倣": "仿", "徧": "遍", "衹": "只", "祇": "只", "敍": "敘", "叙": "敘"
};

/* ===== 4. 同一概念多種叫法（統計；建議統一成 pick） =====
   terms：[詞, 正規式（不給就是字面）]；pick：建議用的；why：理由。只統計使用者看得到的字串。 */
const CONCEPTS = [
  { id: "cpu", name: "電腦對手", pick: "電腦", why: "臺灣象棋 App 慣稱「電腦」；「AI」留給說明技術的地方（AI 生成圖、AI 評審）",
    terms: [["電腦", /電腦(?!版|上|裡)/], ["AI 對手", /AI ?(對手|棋手|陪練)/], ["電腦棋手"], ["機器人"]] },
  { id: "resign", name: "認輸", pick: "認輸", why: "象棋用語是認輸；投降是戰爭用語", terms: [["認輸"], ["投降"]] },
  { id: "undo", name: "悔棋", pick: "悔棋", why: "象棋用語；撤回／退一步容易跟「上一步」瀏覽混淆", terms: [["悔棋"], ["撤回"], ["退一步"], ["撤銷"]] },
  { id: "record", name: "棋譜", pick: "棋譜", why: "象棋界通稱棋譜；棋紀錄、對局紀錄偶用即可", terms: [["棋譜"], ["棋紀錄"], ["棋記錄"], ["對局紀錄"], ["對局記錄"], ["棋局紀錄"]] },
  { id: "jilu", list: false, name: "紀錄／記錄", pick: "名詞用紀錄、動詞用記錄", why: "教育部：紀錄（名詞，最高紀錄）、記錄（動詞，記錄下來）", terms: [["紀錄"], ["記錄"]] },
  { id: "draw", name: "和棋", pick: "和棋", why: "象棋界說和棋（和局可）；平局、平手偏一般比賽用語", terms: [["和棋"], ["和局"], ["平局"], ["平手"]] },
  { id: "rank", list: false, name: "棋力等級", pick: "依現有設計（段位＝級別名稱，等級分＝數字）", why: "兩者各有意思，不要混用成同一件事", terms: [["段位"], ["等級分"], ["等級", /等級(?!分)/], ["級分"], ["積分"]] },
  { id: "user", name: "使用者", pick: "玩家", why: "遊戲內統一叫玩家；隱私條款等正式文件可用使用者", terms: [["玩家"], ["使用者"], ["用戶"], ["棋友"]] },
  { id: "tap", name: "點按動詞", pick: "點", why: "手機 App 多數地方已用「點」「點一下」；點擊／點選／輕觸混用", terms: [["點一下"], ["點選"], ["點擊"], ["輕觸"], ["輕點"], ["按一下"]] },
  { id: "save", name: "存檔", pick: "存檔（遊戲進度）／儲存（設定、檔案）", why: "保存是大陸慣用；臺灣用儲存", terms: [["存檔"], ["儲存"], ["保存"]] },
  { id: "feedback", name: "意見回饋", pick: "意見回饋", why: "反饋是大陸用語", terms: [["意見回饋"], ["回饋"], ["反饋"], ["回報問題"]] },
  { id: "tw", name: "臺／台", pick: "臺灣（正式）", why: "教育部標準字是臺；台灣也常見，但同一個 App 要統一", terms: [["臺灣"], ["台灣"], ["臺北"], ["台北"]] },
  { id: "what", name: "什麼／甚麼", pick: "什麼", why: "臺灣通行什麼", terms: [["什麼"], ["甚麼"]] },
  { id: "li", name: "裡／裏", pick: "裡", why: "臺灣慣用裡", terms: [["裡"], ["裏"]] },
  { id: "week", name: "週／周（星期）", pick: "週", why: "臺灣星期用週；周是周圍、周到", terms: [["週", /週/], ["周（星期）", /(每|本|上|下|一)周(?![圍到全遭邊])|(?<![後北東西])周[一二三四五六日末報賽榜]/]] },
  { id: "net", name: "網路", pick: "網路", why: "網絡是大陸用語", terms: [["網路"], ["網絡"]] },
  { id: "screen", name: "螢幕", pick: "螢幕", why: "屏幕是大陸用語", terms: [["螢幕"], ["屏幕"]] },
  { id: "video", name: "影片", pick: "影片", why: "視頻是大陸用語", terms: [["影片"], ["視頻"], ["錄影"]] },
  { id: "tutorial", name: "教學", pick: "教學", why: "教程是大陸用語", terms: [["教學"], ["教程"]] },
  { id: "setting", name: "設定", pick: "設定", why: "設置是大陸用語", terms: [["設定"], ["設置"]] },
  { id: "layout", name: "佈局／布局", pick: "佈局", why: "臺灣象棋書多寫佈局；兩種都對但要統一", terms: [["佈局"], ["布局"]] },
  { id: "replay", name: "覆盤／復盤", pick: "覆盤", why: "臺灣棋界多寫覆盤；復盤是大陸寫法", terms: [["覆盤"], ["復盤"], ["賽後檢討"]] },
  { id: "online", name: "線上", pick: "線上", why: "在線是大陸用語", terms: [["線上"], ["在線", /在線(?!上)/], ["聯網"]] },
  { id: "msg", name: "訊息", pick: "訊息", why: "信息是大陸用語", terms: [["訊息"], ["信息"], ["資訊"]] },
  { id: "sr", name: "螢幕報讀", pick: "螢幕報讀", why: "讀屏（读屏软件）是大陸用語；臺灣視障圈說螢幕報讀、報讀軟體、螢幕閱讀器", terms: [["讀屏"], ["螢幕報讀"], ["報讀"], ["螢幕閱讀器"]] },
  { id: "bang", name: "驚嘆號全半形", pick: "！", why: "中文句子用全形", terms: [["！"], ["!", /(?<=\p{sc=Han})!/u]] }
];

/* ===== 5. 標點與空格 ===== */
const PUNCT = [
  { id: "comma", re: /(?<=\p{sc=Han}),|,(?= ?\p{sc=Han})/gu, sug: "，", why: "中文句子用全形逗號" },
  { id: "q", re: /(?<=\p{sc=Han})\?|(?<![ 、；：，（])\?(?= ?\p{sc=Han})/gu, sug: "？", why: "中文句子用全形問號（「、? 說明」這種鍵盤按鍵名稱不算）" },
  { id: "ex", re: /(?<=\p{sc=Han})!|(?<![ 、；：，（])!(?= ?\p{sc=Han})/gu, sug: "！", why: "中文句子用全形驚嘆號" },
  { id: "colon", re: /(?<=\p{sc=Han}) ?:(?![:/])/gu, sug: "：", why: "中文句子用全形冒號" },
  { id: "semi", re: /(?<=\p{sc=Han});|;(?= ?\p{sc=Han})/gu, sug: "；", why: "中文句子用全形分號" },
  { id: "paren", re: /(?<=\p{sc=Han}) ?\((?=[^()\n]{0,40}\))|\((?=\p{sc=Han}[^()\n]{0,40}\))|(?<=\p{sc=Han})\)/gu, sug: "（）", why: "中文句子裡的括號用全形" },
  { id: "dots", re: /(?<=\p{sc=Han}[^.\n]{0,2})(?<![0-9])\.{3}|(?<![0-9])\.{3}(?=\p{sc=Han})/gu, sug: "…", why: "三個半形點改刪節號" },
  { id: "period", re: /(?<=\p{sc=Han})\.(?=$|\s|["'<`])/gu, sug: "。", why: "中文句子結尾用全形句號" },
  { id: "quote", re: /[“”‘’]/g, sug: "「」『』", why: "臺灣用直角引號" },
  { id: "fwalnum", re: /[０-９Ａ-Ｚａ-ｚ]+/g, sug: "半形英數", why: "數字、英文字母用半形" },
  { id: "hanspace", re: /(?<=\p{sc=Han}) (?=\p{sc=Han})/gu, sug: "（刪空格或改全形空格）", why: "兩個中文字中間夾半形空格", sev: "info" }
];
const PUNCT_NAME = { comma: "半形逗號", q: "半形問號", ex: "半形驚嘆號", colon: "半形冒號", semi: "半形分號", paren: "半形括號", dots: "...（三點）", period: "半形句號", quote: "彎引號", fwalnum: "全形英數", hanspace: "中文字間半形空格" };

/* ===== 6. 白名單（刻意保留）：file、re 比對「命中處所在字串」；cats 不給＝全部規則 ===== */
const WHITELIST = [
  { file: /(^|\/)zh\.js$/, re: /^[\s\S]{300,}$/, why: "zh.js 的純簡體字表（判斷要不要轉繁體用的資料）" },
  { file: /(^|\/)zh\.js$/, re: /丑咸/, why: "zh.js 保留字表" },
  { file: /./, re: /zh-lint-ok/, why: "同一行標 zh-lint-ok" },
  { file: /./, re: /大都博弈皆戲劇|博弈論/, cats: ["大陸用語"], why: "古詩〈象戲〉原句、古書篇名〈博弈論〉" },
  { file: /./, re: /滬尾登陸|登陸作戰|颱風登陸/, cats: ["大陸用語"], why: "歷史敘述的登陸（上岸），不是登入" },
  { file: /\.js$/, re: /這兒|那兒|哪兒|咱們/, cats: ["大陸用語"], why: "角色對白（古代、北方背景人物的口吻），刻意保留" },
  { file: /07w6b-scenedata\.js$|07y7-cupmap\.js$/, re: /帖子/, cats: ["大陸用語"], why: "名帖、報名帖（古代請帖），不是網路貼文" },
  { file: /\.js$/, re: /窗口飛走/, cats: ["大陸用語"], why: "房子的窗口（字串裡的 CSS 註解）" },
  { file: /07z6-sitemap\.js$/, re: /^(?=.* )[\p{sc=Han}A-Za-z0-9 ]+$/u, why: "站內搜尋關鍵字（空格分隔、同義詞刻意並列，玩家看不到）" },
  { file: /01-board\.js$/, re: /^[楚漢] [河界]$/, why: "棋盤「楚 河　漢 界」刻意字距" },
  { file: /\.md$/, re: /[將士象馬車砲卒包帥仕相傌俥炮兵][１-９][進退平][１-９]/, cats: ["標點"], why: "棋規案例名稱照測試名稱原文（黑方路數全形數字）" },
  { file: /05d-telemetry\.js$/, re: /^\(網址\)$/, cats: ["標點"], why: "匿名資料裡代換網址的記號（開發者看，不顯示給玩家）" },
  { file: /./, re: /數據節省/, cats: ["大陸用語"], why: "Android 臺灣版的設定名稱就叫「數據節省」（Save-Data），照系統用語" },
  { file: /./, re: /作業代碼|以代碼 1 結束/, cats: ["大陸用語"], why: "代碼＝代號（作業代號、結束代碼），不是程式碼" },
  { file: /04-stats\.js$/, re: /^\p{sc=Han}{1,6}$/u, cats: ["簡體字"], why: "比對資料庫裡簡體開局名的關鍵字（程式邏輯，玩家看不到）" },
  { file: /05-settings\.js$/, re: /简体中文/, cats: ["簡體字"], why: "繁簡切換：簡體選項本來就用簡體字顯示" },
  { file: /data\/docs\/zh-lint\.md$/, re: /./, why: "這份報告本身（舉例會含錯字）" }
];

/* ---------- 抽字串 ---------- */
const lineIndex = src => { const a = [0]; for (let i = 0; i < src.length; i++) if (src[i] === "\n") a.push(i + 1); return a };
const posOf = (idx, off) => { let lo = 0, hi = idx.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (idx[m] <= off) lo = m; else hi = m - 1 } return { line: lo + 1, col: off - idx[lo] + 1 } };
const KW = new Set(["return", "typeof", "case", "do", "else", "in", "of", "new", "delete", "void", "throw", "yield", "await", "instanceof"]);
/* JS：回傳 [{start,end,text}]，text 是原始碼片段（不解跳脫），模板的 ${…} 換成 ¤ */
function lexJs(src) {
  const out = []; const n = src.length; let lastSig = "", lastWord = "";
  const isId = c => /[A-Za-z0-9_$]/.test(c) || c.charCodeAt(0) > 0x7f;
  function str(i, q) { let j = i + 1; while (j < n && src[j] !== q && src[j] !== "\n") { if (src[j] === "\\") j++; j++ } out.push({ start: i + 1, end: j, text: src.slice(i + 1, j) }); return j + 1 }
  function tpl(i) {
    let j = i + 1; const s = j; let text = "";
    let seg = j;
    while (j < n && src[j] !== "`") {
      if (src[j] === "\\") { j += 2; continue }
      if (src[j] === "$" && src[j + 1] === "{") { text += src.slice(seg, j); const e = code(j + 2, true); text += MASK.repeat(Math.min(e + 1, n) - j); j = e + 1; seg = j; continue }
      j++;
    }
    text += src.slice(seg, Math.min(j, n)); out.push({ start: s, end: j, text }); return j + 1;
  }
  function regex(i) { let j = i + 1, cls = false; while (j < n && src[j] !== "\n") { const c = src[j]; if (c === "\\") { j += 2; continue } if (cls) { if (c === "]") cls = false } else if (c === "[") cls = true; else if (c === "/") break; j++ } if (src[j] !== "/") return -1; j++; while (j < n && /[a-z]/i.test(src[j])) j++; return j }
  function code(i, untilBrace) {
    let depth = 0; lastSig = "{"; lastWord = "";   /* ${ 後面可以直接接正規式 */
    while (i < n) {
      const c = src[i];
      if (c === "/" && src[i + 1] === "/") { while (i < n && src[i] !== "\n") i++; continue }
      if (c === "/" && src[i + 1] === "*") { const e = src.indexOf("*/", i + 2); i = e < 0 ? n : e + 2; continue }
      if (c === "'" || c === "\"") { i = str(i, c); lastSig = "s"; lastWord = ""; continue }
      if (c === "`") { i = tpl(i); lastSig = "s"; lastWord = ""; continue }
      if (c === "/") {
        const reOk = lastSig === "" || "(,=:[!&|?{};+-*%<>~^".includes(lastSig) || KW.has(lastWord);
        if (reOk) { const e = regex(i); if (e > 0) { i = e; lastSig = "r"; lastWord = ""; continue } }
        lastSig = "/"; lastWord = ""; i++; continue;
      }
      if (/\s/.test(c)) { i++; continue }
      if (isId(c)) { let j = i; while (j < n && isId(src[j])) j++; lastWord = src.slice(i, j); lastSig = KW.has(lastWord) ? "(" : "a"; i = j; continue }
      if (untilBrace) { if (c === "{") depth++; else if (c === "}") { if (depth === 0) return i; depth-- } }
      lastSig = c; lastWord = ""; i++;
    }
    return n;
  }
  code(0, false);
  return out;
}
/* CSS：只有引號字串（content:"…"），略過 /* *\/ 註解 */
function lexCss(src) {
  const out = []; let i = 0; const n = src.length;
  while (i < n) {
    if (src[i] === "/" && src[i + 1] === "*") { const e = src.indexOf("*/", i + 2); i = e < 0 ? n : e + 2; continue }
    if (src[i] === "\"" || src[i] === "'") { const q = src[i]; let j = i + 1; while (j < n && src[j] !== q && src[j] !== "\n") { if (src[j] === "\\") j++; j++ } out.push({ start: i + 1, end: j, text: src.slice(i + 1, j) }); i = j + 1; continue }
    i++;
  }
  return out;
}
/* Markdown：每一行一段，略過 ``` 程式碼框；行內 `程式碼` 與連結網址換成 ¤ */
function lexMd(src) {
  const out = []; let off = 0, fence = false;
  for (const line of src.split("\n")) {
    if (/^\s*```/.test(line)) fence = !fence;
    else if (!fence) { const t = line.replace(/`[^`]*`/g, m => MASK.repeat(m.length)).replace(/\]\([^)]*\)/g, m => "]" + MASK.repeat(m.length - 1)).replace(/https?:\/\/\S+/g, m => MASK.repeat(m.length)); if (HAN.test(t)) out.push({ start: off, end: off + line.length, text: t, quote: /^\s*>/.test(line) }) }
    off += line.length + 1;
  }
  return out;
}
const kindOf = f => /\.md$/i.test(f) ? "md" : /\.css$/i.test(f) ? "css" : "js";

/* ---------- 規則 ---------- */
let _cn2t = null, _simp = null;
function simpSet() {
  if (_simp) return _simp;
  try { const s = fs.readFileSync(path.join(ROOT, "xiangqi-lab/site/zh.js"), "utf8"); const m = /new Set\("([^"]{500,})"\)/.exec(s); if (m) _simp = new Set(m[1]) } catch (e) { }
  if (!_simp) _simp = new Set("这个们来说时对会为经过还没进发现问题开关门车东头让给从应该样实现点击设置视频网络软件默认屏幕鼠标用户质量反馈录载复杂错误显选择确认帮助页面输赢胜负将帅马炮兵卒红黑棋谱级");
  return _simp;
}
function cn2t(s) {
  if (_cn2t === null) { try { _cn2t = require(path.join(ROOT, "xiangqi-lab/src/opencc-cn2t.js")).Converter({ from: "cn", to: "tw" }) } catch (e) { _cn2t = false } }
  return _cn2t ? _cn2t(s) : null;
}
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const TERM_RES = TERMS.map(([w, sug, sev, why, ex]) => ({ w, sug, sev, why, ex, re: new RegExp(escRe(w), "g") }));
/* 「周X」都排除朝代（後周、北周、東周、西周：後周五個朝代、西周一代） */
const MIS_RES = MISCONV.map(([w, sug, why, ex]) => ({ w, sug, why, ex: ex || (/^周/.test(w) ? /[後北東西]周/ : null), re: new RegExp(escRe(w), "g") }));

/* 排除式剛好從命中位置開始比對成功＝這處不算（例如「在線上」不是「在線」） */
const exAt = (ex, text, at) => {
  if (!ex) return false; const r = new RegExp(ex.source, ex.flags.replace("g", "") + "y");
  for (let k = 0; k <= 3 && at - k >= 0; k++) { r.lastIndex = at - k; const m = r.exec(text); if (m && m.index + m[0].length > at) return true }   /* 排除式可以從命中處前 3 個字開始（例如「後周五個朝代」） */
  return false;
};
/* 對一段文字套規則，回傳 [{cat, rule, off, len, match, sug, why, sev}]（off 是 text 內位移） */
function lintText(text, opt = {}) {
  const f = [];
  if (!HAN.test(text)) return f;
  for (const t of TERM_RES) { t.re.lastIndex = 0; let m; while ((m = t.re.exec(text))) { if (exAt(t.ex, text, m.index)) continue; f.push({ cat: "大陸用語", rule: t.w, off: m.index, len: t.w.length, match: t.w, sug: t.sug, why: t.why, sev: t.sev }) } }
  for (const t of MIS_RES) { t.re.lastIndex = 0; let m; while ((m = t.re.exec(text))) { if (exAt(t.ex, text, m.index)) continue; f.push({ cat: "轉換錯字", rule: t.w, off: m.index, len: t.w.length, match: t.w, sug: t.sug, why: t.why, sev: "error" }) } }
  const S = simpSet();
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (S.has(c)) { f.push({ cat: "簡體字", rule: c, off: i, len: 1, match: c, sug: cn2t(c) || "（繁體）", why: "Big5 沒有的簡體字", sev: "error" }); continue }
    if (VARIANTS[c]) f.push({ cat: "異體字", rule: c, off: i, len: 1, match: c, sug: VARIANTS[c], why: "臺灣標準字／慣用字", sev: "error" });
  }
  /* 標點只看「句子」：函式寫法 logit(勝率)、PGN 的 ( )、陣列 [震, 停] 這類技術寫法先遮掉 */
  const pt = text.replace(/[A-Za-z_]\w*\([^()\n]{0,40}\)|\( \)|\[[^\[\]\n]{0,40}\]/g, m => MASK.repeat(m.length));
  if (!opt.noPunct) for (const p of PUNCT) {
    p.re.lastIndex = 0; let m;
    while ((m = p.re.exec(pt))) {
      const s = pt.slice(Math.max(0, m.index - 1), m.index + m[0].length + 1);
      if (s.includes(MASK)) continue;
      if (p.id === "fwalnum" && [...m[0]].every(c => text.includes(String.fromCharCode(c.charCodeAt(0) - 0xfee0)))) continue;   /* 同一段也有半形對應字＝輸入對照表 */
      f.push({ cat: p.id === "hanspace" ? "空格" : "標點", rule: p.id, off: m.index, len: m[0].length, match: m[0], sug: p.sug, why: p.why, sev: p.sev || "error" });
    }
  }
  return f;
}
/* 概念叫法：回傳 {id: {term: count}} 與位置 */
function conceptHits(text) {
  const hits = [];
  if (!HAN.test(text) && !/AI/.test(text)) return hits;
  for (const g of CONCEPTS) for (const [term, re0] of g.terms) {
    const re = re0 ? new RegExp(re0.source, re0.flags.includes("g") ? re0.flags : re0.flags + "g") : new RegExp(escRe(term), "g");
    let m; while ((m = re.exec(text))) { hits.push({ id: g.id, term, off: m.index, len: m[0].length }); if (!m[0].length) re.lastIndex++ }
  }
  return hits;
}

/* ---------- 檔案 ---------- */
function defaultFiles() {
  const L = [];
  const add = (dir, re, skip) => { const d = path.join(ROOT, dir); if (!fs.existsSync(d)) return; for (const f of fs.readdirSync(d).sort()) if (re.test(f) && !(skip && skip.test(f))) L.push(dir + "/" + f) };
  add("xiangqi-db/m", /\.js$/);
  if (fs.existsSync(path.join(ROOT, "xiangqi-db/m.css"))) L.push("xiangqi-db/m.css");
  add("xiangqi-lab/src", /\.js$/, /^(opencc-|three\.|jsQR|qrcode)/);
  for (const f of ["xiangqi-lab/site/core.js", "xiangqi-lab/site/zh.js"]) if (fs.existsSync(path.join(ROOT, f))) L.push(f);
  add("xiangqi-lab/site/data/docs", /\.md$/, /^zh-lint\.md$/);
  return L;
}
/* 簡體字 c 的繁體對應字也出現在同一段字串 → 對照表 */
const pairOf = (text, c) => { const t = cn2t(c); return !!t && t !== c && text.includes(t) };
/* 一段字串裡有 3 個以上「簡體字＋它的繁體字」成對出現＝整段是繁簡對照表 */
const isTable = text => { const S = simpSet(); let n = 0; for (const c of new Set(text)) if (S.has(c) && pairOf(text, c) && ++n >= 3) return true; return false };
/* 字串裡不顯示的部分換成 ¤：場景文字的 {{tang:…}} 標記、HTML 實體、字串裡的 CSS／HTML 註解 */
const maskMarkup = t => t.replace(/\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->|\{\{<?[a-z]+:|\}\}|&[a-z]+;|&#\d+;/g, m => MASK.repeat(m.length));
const isDevLine = l => /console\.(log|warn|error|info|debug)\s*\(/.test(l);
/* 掃一份原始碼（file 是相對路徑，用來判斷種類與白名單） */
function lintSource(src, file) {
  src = src.replace(/\r\n?/g, "\n");
  const kind = kindOf(file), idx = lineIndex(src), lines = src.split("\n");
  const lits = kind === "md" ? lexMd(src) : kind === "css" ? lexCss(src) : lexJs(src);
  const findings = [], concepts = [], skipped = [];
  for (const L of lits) {
    if (!HAN.test(L.text) && !/AI/.test(L.text)) continue;
    if (kind !== "md") L.text = maskMarkup(L.text);
    const table = isTable(L.text);
    const line0 = lines[posOf(idx, L.start).line - 1] || "";
    const wlFor = cat => WHITELIST.find(w => w.file.test(file) && (!w.cats || w.cats.includes(cat)) && (w.re.test(L.text) || w.re.test(line0)));
    const wlAll = WHITELIST.find(w => !w.cats && w.file.test(file) && (w.re.test(L.text) || w.re.test(line0)));
    const res = lintText(L.text, { noPunct: false });
    const lineAt = off => posOf(idx, L.start + off);
    const snip = (off, len) => { const a = Math.max(0, off - 18), b = Math.min(L.text.length, off + len + 18); return (a > 0 ? "…" : "") + L.text.slice(a, b).replace(new RegExp(MASK + "+", "g"), "${}").replace(/\s+/g, " ") + (b < L.text.length ? "…" : "") };
    for (const r of res) {
      const p = lineAt(r.off), lineText = lines[p.line - 1] || "";
      const item = { file, line: p.line, col: p.col, cat: r.cat, rule: r.rule, match: r.match, sug: r.sug, why: r.why, sev: r.sev, snippet: snip(r.off, r.len), dev: kind === "js" && isDevLine(lineText), quote: !!L.quote };
      const wl = wlFor(r.cat);
      if (wl) { item.allow = wl.why; skipped.push(item) }
      else if ((r.cat === "簡體字" || r.cat === "異體字") && (table || pairOf(L.text, r.match) || pairOf(line0, r.match))) { item.allow = "繁簡對照表（同一段字串也有對應的繁體字：接受簡體輸入、語音辨識用）"; skipped.push(item) }
      else if (item.quote && kind === "md") { item.allow = "Markdown 引用區塊（> 開頭，評審原話或古文）"; skipped.push(item) }
      else if (item.dev) { item.allow = "console 開發者訊息（玩家看不到）"; skipped.push(item) }
      else findings.push(item);
    }
    if (!wlAll && !table && !(kind === "js" && isDevLine(line0))) for (const h of conceptHits(L.text)) { const p = lineAt(h.off); concepts.push({ file, line: p.line, id: h.id, term: h.term, snippet: snip(h.off, h.len) }) }
  }
  return { file, kind, literals: lits.length, findings, concepts, skipped };
}
/* over：{相對路徑: 內容}，用來預覽「套用修正清單之後」的結果（不寫檔） */
function run(files, over = {}) {
  files = files && files.length ? files : defaultFiles();
  const R = { files: [], findings: [], concepts: [], skipped: [], literals: 0, dups: [] }, seen = new Map();
  for (const f of files) {
    const abs = path.isAbsolute(f) ? f : path.join(ROOT, f);
    const rel = path.relative(ROOT, abs).split(path.sep).join("/");
    const src = rel in over ? over[rel] : fs.readFileSync(abs, "utf8");
    if (seen.has(src)) { R.dups.push({ file: rel, same: seen.get(src) }); continue }   /* 建置複本（src/zh.js＝site/zh.js）只算一次 */
    seen.set(src, rel);
    const r = lintSource(src, rel);
    R.files.push({ file: rel, literals: r.literals, findings: r.findings.length });
    R.literals += r.literals; R.findings.push(...r.findings); R.concepts.push(...r.concepts); R.skipped.push(...r.skipped);
  }
  return R;
}
function conceptTable(R) {
  return CONCEPTS.map(g => { const by = {}; for (const [t] of g.terms) by[t] = { n: 0, at: [] }; for (const h of R.concepts) if (h.id === g.id) { by[h.term].n++; if (by[h.term].at.length < 5) by[h.term].at.push(`${h.file}:${h.line}`) } return { ...g, by, used: Object.values(by).filter(x => x.n).length } });
}
/* 修正清單依序套到記憶體裡的內容（不寫檔）；回傳 {相對路徑: 內容} */
function applyFixes(list) {
  const mem = {};
  for (const x of list) { const s = x.file in mem ? mem[x.file] : fs.readFileSync(path.join(ROOT, x.file), "utf8"); if (s.split(x.old).length === 2) mem[x.file] = s.replace(x.old, () => x.new); else mem[x.file] = s }
  return mem;
}
/* 修正清單檢查：回傳 [{i, file, ok, n, why}] */
function checkFixes(list) {
  return list.map((x, i) => {
    let src = ""; try { src = fs.readFileSync(path.join(ROOT, x.file), "utf8") } catch (e) { return { i, file: x.file, ok: false, n: 0, why: "讀不到檔" } }
    let n = 0, k = -1; if (x.old) while ((k = src.indexOf(x.old, k + 1)) >= 0) n++;
    const ok = n === 1 && typeof x.new === "string" && x.new !== x.old && !!x.why;
    return { i, file: x.file, ok, n, why: n !== 1 ? `old 出現 ${n} 次` : x.new === x.old ? "new 跟 old 一樣" : !x.why ? "沒寫理由" : "" };
  });
}

/* ---------- 報告 ---------- */
const CATS = ["大陸用語", "簡體字", "異體字", "轉換錯字", "標點", "空格"];
/* 表格格子：| 換全形、反引號換 ˋ、不留原樣的 ](（App 的說明文件會當成連結） */
const cell = s => String(s).replace(/\|/g, "｜").replace(/\n/g, " ").replace(/`/g, "ˋ").replace(/\]\(/g, "] (");
const inl = s => "`" + cell(s).trim() + "`";
function summary(R) {
  const c = {}; for (const f of R.findings) { const k = f.cat + (f.sev === "review" ? "（看語境）" : f.sev === "info" ? "（統計）" : ""); c[k] = (c[k] || 0) + 1 }
  return c;
}
function report(R, extra = {}) {
  const o = [], S = summary(R), CT = conceptTable(R);
  o.push("# 繁體中文用字一致性檢查（zh-lint）", "", `${extra.date || new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10)}（臺灣時間）產生（評比循環第 12 輪 X12；評審「繁中在地化 QA」扣在用字一致、在地用語、同一個東西不同頁叫法不同、全半形標點混用）。這一頁是工具 \`xiangqi-lab/tools/zh-lint.js\` 跑出來的，可以重跑：\`node xiangqi-lab/tools/zh-lint.js --report 這個檔\`。`, "");
  o.push(...(extra.head || []));
  o.push("## 方法", "",
    "1. **只看玩家看得到的字**：從 App 原始碼抽出字串常值、模板字面（`${…}` 裡的程式換成記號不檢查）、HTML 片段、CSS 的 `content:` 字串；`/* */`、`//` 註解與正規式不看；字串裡的 CSS／HTML 註解、場景文字的朝代標記（例如 `{{tang:`）、HTML 實體也遮掉。說明文件逐行看，略過程式碼框、行內程式碼與連結網址。",
    "2. **範圍**：" + "`xiangqi-db/m/*.js`、`xiangqi-db/m.css`、`xiangqi-lab/src/*.js`（不含第三方 opencc、three、jsQR、qrcode）、`xiangqi-lab/site/core.js`、`site/zh.js`、`site/data/docs/*.md`" + (R.dups.length ? `；逐字相同的建置複本只算一次（${R.dups.map(d => d.file.replace(/^xiangqi-(db|lab)\//, "") + "＝" + d.same.replace(/^xiangqi-(db|lab)\//, "")).join("、")}）` : "") + "。",
    "3. **規則**：大陸用語、簡體字、異體字、簡繁轉換錯字、標點、空格（見下面規則表）；另外統計「同一個東西的不同叫法」。",
    "4. **刻意保留**：白名單（工具裡的 `WHITELIST`）、繁簡對照表（同一段字串裡簡體字與它的繁體字成對出現）、`console` 開發者訊息、說明文件的 `>` 引用區塊，都另外計數、不算問題。某一行要略過，在那一行加 `/* zh-lint-ok */`。",
    "5. **嚴重度**：error＝幾乎一定要改；review＝臺灣也有正確用法，要逐條看；info＝只統計。", "");
  o.push(rulesMd());
  o.push("## 統計", "", `掃了 ${R.files.length} 個檔、${R.literals} 段字串（含沒有中文的）。下表只算玩家看得到的字串；白名單與 console 開發者訊息另計（${R.skipped.length} 處）。`, "", "| 類別 | 處數 |", "|---|---:|");
  for (const k of Object.keys(S).sort()) o.push(`| ${k} | ${S[k]} |`);
  const byFile = R.files.filter(f => f.findings).sort((a, b) => b.findings - a.findings).slice(0, 15);
  o.push("", "問題最多的檔：" + byFile.map(f => `${f.file.replace(/^xiangqi-(db|lab)\//, "")}（${f.findings}）`).join("、") + "。", "");
  const top = (title, list, note) => {
    o.push(`### ${title}`, "");
    if (note) o.push(note, "");
    if (!list.length) { o.push("（沒有）", ""); return }
    const key = f => PUNCT_NAME[f.rule] && (f.cat === "標點" || f.cat === "空格") ? PUNCT_NAME[f.rule] : f.rule + "→" + f.sug;
    const cnt = {}; for (const f of list) cnt[key(f)] = (cnt[key(f)] || 0) + 1;
    o.push("各規則處數：" + Object.entries(cnt).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}（${v}）`).join("、"), "");
    o.push("| 位置 | 原文 | 建議 | 說明 |", "|---|---|---|---|");
    for (const f of list.slice(0, extra.top || 30)) o.push(`| ${f.file.replace(/^xiangqi-(db|lab)\//, "")}:${f.line} | ${inl(f.snippet)} | ${f.match.trim() ? cell(f.match) : "半形空格"}→${cell(f.sug)} | ${cell(f.why)} |`);
    if (list.length > (extra.top || 30)) o.push("", `（另有 ${list.length - (extra.top || 30)} 處，跑工具加 --json 看全部）`);
    o.push("");
  };
  o.push("## 各類實例（每類前 30 個）", "");
  const sevOrd = { error: 0, review: 1, info: 2 };
  const sortF = l => l.slice().sort((a, b) => sevOrd[a.sev] - sevOrd[b.sev] || a.file.localeCompare(b.file) || a.line - b.line);
  top("大陸用語（一定要改）", sortF(R.findings.filter(f => f.cat === "大陸用語" && f.sev === "error")));
  top("大陸用語（看語境）", sortF(R.findings.filter(f => f.cat === "大陸用語" && f.sev === "review")), "這些詞在臺灣也有正確用法，下表逐條看過才列進修正清單。");
  top("簡體字", sortF(R.findings.filter(f => f.cat === "簡體字")));
  top("異體字", sortF(R.findings.filter(f => f.cat === "異體字")));
  top("簡繁轉換錯字", sortF(R.findings.filter(f => f.cat === "轉換錯字")));
  for (const id of Object.keys(PUNCT_NAME)) { const l = sortF(R.findings.filter(f => (f.cat === "標點" || f.cat === "空格") && f.rule === id)); if (l.length) top("標點：" + PUNCT_NAME[id], l) }
  o.push("## 同一個東西的不同叫法", "", "只算玩家看得到的字串（含說明文件）。紀錄／記錄、棋力等級兩組的各叫法意思本來就不同，只列處數。", "", "| 概念 | 各叫法（處數） | 建議 | 理由 |", "|---|---|---|---|");
  for (const g of CT) o.push(`| ${g.name} | ${Object.entries(g.by).map(([t, v]) => `${t} ${v.n}`).join("、")} | ${g.pick} | ${g.why} |`);
  o.push("", "少數叫法出現的位置：", "");
  for (const g of CT) { const e = Object.entries(g.by).filter(([t, v]) => v.n); if (e.length < 2 || g.list === false) continue; const max = Math.max(...e.map(([, v]) => v.n)); for (const [t, v] of e) if (v.n < max && v.n) o.push(`- ${g.name}「${t}」${v.n} 處：${v.at.map(x => x.replace(/^xiangqi-(db|lab)\//, "")).join("、")}${v.n > 5 ? "…" : ""}`) }
  o.push("");
  const sk = {}; for (const f of R.skipped) sk[f.allow] = (sk[f.allow] || 0) + 1;
  o.push("## 自動略過的（白名單）", "", "| 理由 | 處數 |", "|---|---:|"); for (const [k, v] of Object.entries(sk)) o.push(`| ${cell(k)} | ${v} |`);
  o.push("", ...(extra.tail || []));
  return o.join("\n").replace(/\n{3,}/g, "\n\n") + "\n";
}
function rulesMd() {
  const o = ["## 規則表", "", "### 大陸用語 → 臺灣用語", "", "error＝幾乎一定要改；review＝臺灣也有正確用法，要看語境。", "", "| 大陸 | 臺灣 | 嚴重度 | 說明 |", "|---|---|---|---|"];
  for (const [w, s, sev, why] of TERMS) o.push(`| ${w} | ${s} | ${sev} | ${cell(why)} |`);
  o.push("", "### 簡繁轉換常見錯字", "", MISCONV.map(([w, s]) => `${w}→${s}`).join("、"), "", "### 異體字", "", Object.entries(VARIANTS).filter(([, v]) => v).map(([k, v]) => `${k}→${v}`).join("、"), "",
    "### 簡體字", "", `沿用 App 執行時繁簡切換用的表（site/zh.js：Big5 沒有的純簡體字，${simpSet().size} 字），建議字用 opencc-js 簡→臺灣繁體。`, "",
    "### 標點與空格", "", "| 規則 | 抓什麼 | 建議 |", "|---|---|---|");
  for (const p of PUNCT) o.push(`| ${PUNCT_NAME[p.id]} | ${cell(p.why)} | ${cell(p.sug)} |`);
  o.push("", "冒號後面接數字（時間 12:30、比例）不算；Markdown 的行內程式碼、連結網址不算；模板 ${…} 兩邊不算。", "");
  return o.join("\n");
}

module.exports = { lexJs, lexCss, lexMd, lintText, lintSource, conceptHits, run, conceptTable, checkFixes, applyFixes, report, rulesMd, summary, defaultFiles, TERMS, MISCONV, VARIANTS, CONCEPTS, PUNCT, WHITELIST, ROOT };

if (require.main === module && !process.env.NODE_TEST_CONTEXT) {
  const a = process.argv.slice(2), opt = {}, files = [];
  for (let i = 0; i < a.length; i++) { if (a[i] === "--json") opt.json = true; else if (a[i] === "--report") opt.report = a[++i]; else if (a[i] === "--copy") opt.copy = a[++i]; else if (a[i] === "--fixes") opt.fixes = a[++i]; else if (a[i] === "--preview") opt.preview = true; else if (a[i] === "--head") opt.head = a[++i]; else if (a[i] === "--tail") opt.tail = a[++i]; else files.push(a[i]) }
  if (opt.fixes) {
    const L = JSON.parse(fs.readFileSync(path.resolve(opt.fixes), "utf8")); const res = checkFixes(L), bad = res.filter(r => !r.ok);
    console.log(`修正清單 ${L.length} 筆：${L.length - bad.length} 筆 old 唯一、${bad.length} 筆有問題`); for (const b of bad) console.log(`  #${b.i} ${b.file}：${b.why}`);
    if (opt.preview) { const a = summary(run(files)), b = summary(run(files, applyFixes(L))); console.log("套用前 → 套用後（不寫檔）："); for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) console.log(`  ${k}：${a[k] || 0} → ${b[k] || 0}`) }
    process.exitCode = bad.length ? 1 : 0; return;
  }
  const R = run(files);
  if (opt.json) { console.log(JSON.stringify(R, null, 1)); return }
  const S = summary(R);
  console.log(`zh-lint：${R.files.length} 檔、${R.literals} 段字串`); for (const [k, v] of Object.entries(S)) console.log(`  ${k}：${v}`); console.log(`  白名單／開發者訊息略過：${R.skipped.length}`);
  if (opt.report) {
    const rd = p => p && fs.existsSync(p) ? fs.readFileSync(p, "utf8").replace(/\r\n?/g, "\n").split("\n") : [];
    const md = report(R, { head: rd(opt.head), tail: rd(opt.tail) }).replace(/\r/g, "");
    fs.writeFileSync(opt.report, md); if (opt.copy) fs.writeFileSync(opt.copy, md);
    console.log("報告寫到 " + opt.report + (opt.copy ? "（另一份 " + opt.copy + "）" : ""));
  }
}
