#!/bin/zsh
# 用法：p0-3d.sh <App.app 路徑> [情境…]   例：p0-3d.sh build-sim/Build/Products/Debug-iphonesimulator/App.app
# 環境變數：P03D_UDID（模擬器 UDID；不給就找名字是 $P03D_DEVICE（預設 iPhone 18 Pro）的那台）、P03D_OUTDIR（證據放哪，預設目前目錄的 output/）
#   P03D_FAULT=cover：反測（模擬 W02：落點被按鈕蓋住），每個情境都必須失敗、結束代碼非 0
#   P03D_ROUNDS（預設 2）：八個情境整組連跑幾輪，每一輪都全過才算過（開發者 11/23 選「連續 2 輪」；失敗後重跑到過的不算）
# iOS 版 P0-3D（發版回歸驗收規則「封測 P0 永久測項」）：模擬器上真實觸控選子、點暗綠落點，再讀同一盤棋譜確認新增那一步。
#   1. 抹掉模擬器、系統語言設繁中、裝包、預寫測試房（fresh-app.sh）、冷啟
#   2. 建 P03D（XCUITest 觸控伺服，本資料夾的 P03D.xcodeproj）
#   3. node p03d/p03d.js：玩家狀態 → 一般電腦、驛站、同桌紅黑（含翻面黑方）、車輪戰三桌、黑洞正背面、星門圍城俯視／斜視
#   4. 跑完再抹掉模擬器（進場用 JS 改過存檔，不能留給下一位當玩家狀態）
# 證據：$P03D_OUTDIR/p03d-<時間>/（log.txt、result.json、每步三張截圖）。結束代碼 0＝全過。
# 只能跑模擬器的 Debug 包（Release 包的 WebView 不能用 Web Inspector 檢查）。只用模擬器、一次一台；不分發、不推 git。正式 P0-3D 要在「實際待送審的候選包」上跑（寫、建、驗分開：建包的人不跑自己的包）。
set -uo pipefail
HERE=${0:A:h}
APP=${1:?要給 App.app 路徑（模擬器的 Debug 包）}
U=${P03D_UDID:-$(xcrun simctl list devices available | grep -F "    ${P03D_DEVICE:-iPhone 18 Pro} (" | head -1 | grep -oE "[0-9A-F-]{36}")}
[ -n "$U" ] || { echo "✘ 找不到模擬器；用 P03D_UDID 指定"; exit 2; }
shift 2>/dev/null || true
[ -d "$APP" ] || { echo "✘ 找不到 $APP"; exit 2; }
BOOTED=$(xcrun simctl list devices booted | grep -c Booted)
[ "$BOOTED" -gt 0 ] && ! xcrun simctl list devices booted | grep -q $U && { echo "✘ 已經有別台模擬器開著（一台機器一次一台），先關掉"; exit 2; }
T=$(date +%m%d-%H%M%S); OUT=${P03D_OUTDIR:-$PWD/output}/p03d-$T; mkdir -p $OUT; OUT=${OUT:A}
IOSV=$(xcrun simctl list devices -j | node $HERE/rounds.js ios $U)   # 模擬器系統的 iOS 大版號（WebView 回報的是凍結值，不能用）
ATT=${OUT:h}/p03d-attempts.jsonl   # 嘗試紀錄：每次執行（過不過、測試不成立）都追加一行到同一份固定檔，同一個包之前失敗過看得到（W69 流程盤點第 5 項）
echo "包：$APP" | tee $OUT/run.txt
echo "模擬器 iOS：${IOSV:-（讀不到）}" | tee -a $OUT/run.txt
XB=$(grep -ao 'XQ_BUILD="[0-9-]*"' $APP/public/index.html | head -1 | cut -d'"' -f2)
XS=$(shasum -a 256 $APP/public/index.html | cut -c1-64)
[ -n "$XB" ] || { echo "✘ 包裡讀不到 XQ_BUILD"; exit 2; }
echo "包內 XQ_BUILD：$XB" | tee -a $OUT/run.txt
echo "index.html SHA-256：$XS" | tee -a $OUT/run.txt
die(){ echo "✘ $1：測試不成立" | tee -a $OUT/run.txt; node $HERE/rounds.js unfit "$ATT" "$XS" "$XB" "$IOSV" "$U" "${OUT:t}" "${P03D_FAULT:-}" "$1"; xcrun simctl shutdown $U >/dev/null 2>&1; exit 2; }   # 測試不成立（裝包失敗、包不符）也寫嘗試紀錄（PR #61 審查③）
# 1. 乾淨模擬器
xcrun simctl shutdown $U >/dev/null 2>&1
$HERE/fresh-app.sh $U "$APP" > $OUT/fresh-app.log 2>&1 || die "抹掉／安裝失敗（見 fresh-app.log）"   # fresh-app：抹掉、開機、裝包、預寫 xq_netRoot＝xq_test
xcrun simctl spawn $U defaults write -g AppleLanguages '("zh-Hant-TW")' || die "設繁中失敗"
# 核對模擬器上裝的就是這個包（比 index.html 的 SHA-256）
IA=$(xcrun simctl get_app_container $U com.raysonchen.xiangqiqianqiu.dev app 2>/dev/null) || die "模擬器上找不到 App"
IS=$(shasum -a 256 "$IA/public/index.html" | cut -c1-64)
echo "模擬器上的 index.html SHA-256：$IS" | tee -a $OUT/run.txt
[ "$IS" = "$XS" ] || die "模擬器上裝的不是這個包"
xcrun simctl launch $U com.raysonchen.xiangqiqianqiu.dev >/dev/null || die "App 開不起來"; sleep 8
# 2. 觸控伺服
cd $HERE
DD=${P03D_DD:-${TMPDIR:-/tmp}/p03d-dd}   # XCUITest 建置資料夾放暫存目錄，不留在倉庫裡
xcodebuild -project P03D.xcodeproj -scheme P03DUITests -destination "platform=iOS Simulator,id=$U" -derivedDataPath $DD build-for-testing > $OUT/p03d-build.log 2>&1 || { echo "✘ P03D 建置失敗，見 $OUT/p03d-build.log"; exit 2; }
# 3. 跑
P03D_DD=$DD P03D_UDID=$U P03D_OUT=$OUT P03D_ATTEMPTS=$ATT P03D_IOS=$IOSV P03D_EXPECT_BUILD=$XB P03D_EXPECT_SHA=$XS node p03d.js "$@"; RC=$?
# 4. 抹掉
xcrun simctl shutdown $U >/dev/null 2>&1; xcrun simctl erase $U
echo "模擬器已抹掉（$U）" | tee -a $OUT/run.txt
echo "證據：$OUT"
exit $RC
