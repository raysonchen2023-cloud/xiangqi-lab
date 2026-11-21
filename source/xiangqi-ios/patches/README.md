# 原生 App 的接法：橋接檔＋原始碼修補

> 這個資料夾**沒有改動任何現有檔案**。`xiangqi-db/m/*.js` 有別的代理在改，所以修補寫成「檢查／套用工具＋說明」，由開發者決定什麼時候套。

## 一、不用改 App 程式就生效的：`src/native-bridge.js`

`scripts/copy-www.js` 複製網頁成品時，會在 `www/index.html` 的 `<meta charset="utf-8">` 後面插兩行：

```html
<script src="capacitor.js"></script>       <!-- @capacitor/core 的瀏覽器版（registerPlugin） -->
<script src="native-bridge.js"></script>   <!-- 原生橋接 -->
```

所以橋接檔比 App 所有程式都早跑。**網頁版不插、不受影響**；就算插了，在一般瀏覽器裡它只設 `window.XQ_NATIVE=false` 就結束。

在原生 App 裡它做的事：

| 功能 | 原本網頁版 | 原生 App 裡（橋接檔做的） | 對應的 App 模組 |
|---|---|---|---|
| 原生判斷 | — | `window.XQ_NATIVE=true`、`window.XQNative`（給修補呼叫） | 全部 |
| service worker | `sw.js` 把 data/、engine/ 轉去 CDN、做快取 | **關掉**（檔都在安裝包裡）；拿掉 `navigator.serviceWorker`，萬一拿不掉就換成不會出錯的空殼 | `02-shell.js` 第 170 行那段自動跳過 |
| Cache Storage | 圖、引擎、大師棋譜各存一份（約 600 MB） | **藏起來**（`window.caches` 拿掉）→ `09b-preload.js` 直接進首頁、不跑「研墨鋪紙」；`engine.js` 直接讀本機引擎檔 | `09b-preload.js:105`、`engine.js:20`、`02-shell.js:148／285`、`park3d.js:155`、`local.js:800`（都有 try／判斷，不會出錯） |
| 觸覺回饋 | iPhone 沒有 `navigator.vibrate`，不會震 | 補一個 `navigator.vibrate`，改呼叫 iOS **Haptics**：落子＝輕、吃子＝中×2、將軍＝警告、走不了＝輕×3、贏＝成功、輸＝錯誤、和＝中×2、將死＝重×2；其他節奏照長短換成輕／中／重 | `07hp-haptics.js` 的 `hapSupport()` 會回 `"vibrate"`，設定頁開關、圖鑑試震都能用；`00-util.js vibrate()` 的按鈕小震也會變成輕觸感 |
| 分享 | `navigator.share`（WKWebView 不一定有） | 改走 iOS 分享面板（**@capacitor/share**），附檔案時先寫進暫存資料夾（**@capacitor/filesystem**） | `07dq-daily.js`（每日同題成績、成績圖）、`10d-coach.js`（棋譜匯出）、`04c-weekly.js`（週報圖）、`05b-save.js`（存檔匯出）、`02-shell.js`（分享連結） |
| 下載檔案 | `<a download href="blob:…">` | WKWebView 本來**不會動**；攔下來 → 暫存檔 → 分享面板（可選「儲存到檔案」） | `05c-health.js`（健康紀錄 JSON）、上面幾支的備援路徑 |
| 停權名單 | `data/banlist.json` 由 sw.js 直接上網 | 安裝包裡**不放**；一律抓 GitHub Pages 最新的 | `07x4-lobbysafe.js:36` |
| 修正通知 | `data/fixes.json` | 先抓 CDN 最新的，抓不到用安裝包裡的 | `05-settings.js:520`、`07s3-feedback.js` |
| 本機缺檔 | — | 本機伺服器回 404 → `00-util.js` 原本就會改抓 CDN；橋接再補「連線錯誤」時也改抓 CDN | `00-util.js:7-8` |
| 啟動畫面 | — | 網頁畫好（`PRE_FIRST`）或 1.5 秒後收起原生啟動畫面（**@capacitor/splash-screen**） | — |
| 前景／背景 | — | 切背景時 `XQSave.flush()` 把存檔寫完；回前景發 `xq-native-resume` 事件（**@capacitor/app**） | `m.html` 的 XQSave |
| 每日同題提醒 | — | `XQNative.daily.enable(時,分)`／`disable()`／`status()`（**@capacitor/local-notifications**，預設關、玩家自己開；點通知開到 `#/daily`） | 要加設定開關，見下面 N6 |
| 引擎已下載？ | `local.js` 的 `engineCached()` 看 Cache Storage | 載入後改成永遠 `true`（引擎在安裝包裡） | `local.js:800` |
| 版本號 | `appVer()` 看 service worker 快取名稱 | 載入後改成回 `window.XQ_BUILD` | `02-shell.js:148` |

## 二、一定要改的原始碼（3 處）

原生 App 的網址是 `http://127.0.0.1:47821`（原因見 `notes/wasm-threads.md`），會被幾個「電腦本機測試」的判斷誤認：

| 代號 | 檔案 | 現在的問題 | 改法 |
|---|---|---|---|
| **N1** | `xiangqi-lab/src/net.js` 第 32 行 | 網址是 127.x → **一律進測試房 `xqlab-test-local`**，原生 App 的玩家看不到正式大廳的人 | 條件加 `!(typeof window!=="undefined"&&window.XQ_NATIVE===true)` |
| **N2** | `xiangqi-db/m/05-settings.js` `reportPlayer()` | 網址是 127.x → 不送玩家登記（跟隱私說明「預設送、可以關」不一致） | 條件加 `!window.XQ_NATIVE&&` |
| **N3** | `xiangqi-db/m/05b-save.js` `fnTest()` | 網址是 127.x → 新手流程、卡關訊號、健康摘要都當成測試機 | 條件加 `!window.XQ_NATIVE&&` |

`window.XQ_NATIVE` 只有原生 App 的橋接檔會設成 `true`；網頁版、電腦本機測試、Playwright 都不會，所以「測試機不進正式大廳」的保護照舊。

**iMac 當天在 App 裡測試前，一樣要先設測試房**：`localStorage.setItem("xq_netRoot", JSON.stringify("xq_test"))`（有設就不會進正式大廳，跟 N1 無關）。

## 三、建議改的（2 處，工具也能套）

| 代號 | 檔案 | 改法 |
|---|---|---|
| N4 | `05-settings.js` `updCheck()` | 原生 App 沒有 service worker，「檢查更新」會顯示「沒有網路」；改成顯示「新版由 App Store 更新」 |
| N5 | `05-settings.js` `wipeAllData()` | 刪除全部資料時一併取消每日提醒通知 |

## 四、要手動做的（工具不會套）

### N6　每日同題提醒的開關（選用，但對「不是只包網頁」有幫助）

建議放在每日同題頁（`07dq-daily.js`）的說明區，或設定 → 系統。只在 `window.XQ_NATIVE` 時顯示：

```js
/* 只在原生 App 顯示：每日同題提醒（預設關，玩家自己開；兒童模式也可以用，因為只是本機通知、不送資料） */
function dqRemindRow(){if(!window.XQ_NATIVE||!window.XQNative||!XQNative.daily)return"";
  return`<label class="row"><input type="checkbox" id="dqRem"> 每天提醒我（晚上 7 點）</label>`}
document.addEventListener("change",async e=>{const t=e.target;if(!t||t.id!=="dqRem")return;
  const r=t.checked?await XQNative.daily.enable(19,0):await XQNative.daily.disable();
  if(t.checked&&!r.ok){t.checked=false;toast(r.why||"沒有開成功")}else toast(t.checked?"🔔 每天晚上 7 點提醒你":"🔕 已關閉提醒")});
/* 畫面打開時同步勾選狀態：XQNative.daily.status().then(s=>{const c=document.getElementById("dqRem");if(c)c.checked=s.on}) */
```

注意前綴：`dq` 已是 07dq-daily 的前綴（記憶：模組撞名，新前綴先 grep）。時間可以做成下拉選單（18:00～20:00），兒童作息不要太晚。

### N7　隱私說明（`data/docs/privacy.md`、設定頁隱私卡片）

原生版跟網頁版不同的地方要補一段「iPhone／iPad App 版」：
- 資料存在 App 自己的儲存空間（不是「瀏覽器」），刪掉 App 就全部清掉。
- App 不用 service worker、不用瀏覽器快取；圖片、音樂、引擎都在安裝檔裡。安裝檔沒有的新內容才從 Cloudflare 下載。
- 停權名單每次打開從 GitHub Pages 抓。
- 每日提醒是手機本機排程的通知，不經過任何伺服器（預設關）。
- 分享、存檔是交給 iOS 分享面板，App 不會自己送出。
- 相機：換手機掃 QR 碼才用。`install-native.js` 已在 Info.plist 加相機、麥克風、語音辨識、加入相簿的說明文字（缺了 App 會閃退）。
- **要更正**：`privacy.md`「App 不做的事」寫「不讀…麥克風」，但 `06-cpu.js` 有「語音走棋」（`webkitSpeechRecognition`，會用麥克風，語音由 Apple 的辨識服務處理）。二選一：在說明裡寫清楚語音走棋，或原生版把語音走棋藏起來（`vcOK()` 在 `window.XQ_NATIVE` 時回 false）。

### N8　其他觀察（不急）

- `10-db.js` 的「比賽對局」下載會把本機檔再存一份進 IndexedDB（約 70 MB）。原生版可以改成直接讀本機檔，但不改也能用。
- `02-shell.js:143` 只在非離線版執行，原生版不受影響。
- `07dq-daily.js dqBase()`、`02-shell.js:464／478` 的分享網址在非 https 時會用 `APP_HOME`（GitHub Pages 網址），原生版分享出去的連結是網頁版，對方點得開。
- `09b-preload.js:152` 的「連電腦」QR 網址會變成 127.0.0.1（只有開發者模式用），原生版用不到。

## 五、套用方式

```
node xiangqi-ios/patches/apply-native-patches.js            # 只檢查（預設）
node xiangqi-ios/patches/apply-native-patches.js --apply    # 套 N1～N5（每改一個檔就 node --check，失敗自動還原）
node xiangqi-ios/patches/apply-native-patches.js --apply --only N1,N2,N3
```

套完照平常流程：`node xiangqi-lab/tools/build-site.js` → 測試 → 發布網頁版 → 再到 `xiangqi-ios` 跑 `node scripts/copy-www.js`（它取的是**已發布的** commit）。
2026-11-13 檢查時 N1～N5 五處都「找得到」。
