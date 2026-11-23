#!/usr/bin/env node
// 公開原始碼前的機密與個資掃描（開發者 11/13：原始碼要公開，先掃 opensource-stage/）
// 用法：node xiangqi-lab/tools/oss-scan.js <資料夾> [--public <已公開的資料夾>] [--allow <白名單.json>] [--json <輸出.json>] [--no-known] [--known-file <檔>]
//   --public  已經公開的東西（例如公開倉庫匯出的一份），掃到的字串如果在那裡也有，標「本來就公開」（不算新洩漏）
//   --allow   白名單：[{ "rule": "email", "file": "路徑結尾", "match": "掃到的那一串字（要一模一樣）", "reason": "為什麼可以留" }]
//             （rule、file、match 都可省略，省略＝不限；reason 必填）。某一行寫了 oss-scan:allow 也會略過那一行
//             另可寫 sha256＝掃到那一串字的雜湊、fileSha256＝整個檔的雜湊
//   --no-known  不比對本機的已知機密（見下）
//   --all     什麼都不跳過（平常會跳過 .git、node_modules；scan-changed 用）
// 已知機密比對：讀使用者資料夾的 .xiangqi-* 金鑰檔、tools/mqtt-config.json、名稱像 KEY／TOKEN／SECRET／PASS 的環境變數，
//   只在記憶體裡比對「這些值有沒有出現在要公開的檔案裡」，報告只寫哪一檔哪一行、哪一種，絕不印出值本身。
// 結束代碼：有沒被白名單略過的高風險＝1；其他＝0。
"use strict";
const fs = require("fs"), path = require("path"), os = require("os");

/* 每條規則：id、風險（high／medium／low）、說明、建議。re 要有 g 旗標；secret＝報告時遮住內容 */
const RULES = [
  { id: "pem-private", risk: "high", what: "PEM 私鑰", re: /-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----/g, secret: true, fix: "刪掉；這把金鑰要當作已外洩、換新的" },
  { id: "jwk-private", risk: "high", what: "JWK 私鑰（d 欄位）", re: /["']?\bd["']?\s*:\s*["'][A-Za-z0-9_-]{40,}["']/g, near: /\bkty\b/, secret: true, fix: "刪掉；改從使用者資料夾的金鑰檔讀，換一把新金鑰" },
  { id: "google-api-key", risk: "high", what: "Google／Gemini API 金鑰", re: /\bAIza[0-9A-Za-z_-]{35}\b/g, secret: true, fix: "刪掉、到 Google Cloud 撤銷；程式改讀環境變數" },
  { id: "anthropic-key", risk: "high", what: "Anthropic API 金鑰", re: /\bsk-ant-[A-Za-z0-9_-]{20,}/g, secret: true, fix: "刪掉並撤銷；改讀環境變數" },
  { id: "openai-key", risk: "high", what: "OpenAI API 金鑰", re: /\bsk-(?!ant-)(?:proj-|svcacct-|admin-)?[A-Za-z0-9_-]{20,}/g, secret: true, fix: "刪掉並撤銷；改讀環境變數 OPENAI_API_KEY" },
  { id: "tripo-key", risk: "high", what: "Tripo API 金鑰", re: /\btsk_[A-Za-z0-9_-]{20,}/g, secret: true, fix: "刪掉並撤銷；改讀環境變數" },
  { id: "github-token", risk: "high", what: "GitHub token", re: /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{50,})/g, secret: true, fix: "刪掉並撤銷" },
  { id: "aws-key", risk: "high", what: "AWS 存取金鑰", re: /\bAKIA[0-9A-Z]{16}\b/g, secret: true, fix: "刪掉並撤銷" },
  { id: "slack-token", risk: "high", what: "Slack token", re: /\bxox[abprs]-[A-Za-z0-9-]{10,}/g, secret: true, fix: "刪掉並撤銷" },
  { id: "jwt", risk: "high", what: "JWT（登入憑證）", re: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, secret: true, fix: "刪掉；確認不是真的登入憑證" },
  { id: "cloudflare-token", risk: "high", what: "Cloudflare API token／金鑰", re: /\b(?:CLOUDFLARE_API_(?:TOKEN|KEY)|CF_API_(?:TOKEN|KEY)|CLOUDFLARE_TOKEN|api[_-]?token)\s*[:=]\s*["'`]?[A-Za-z0-9_-]{37,}/gi, secret: true, fix: "刪掉並到 Cloudflare 撤銷；改讀環境變數" },
  { id: "url-credentials", risk: "high", what: "網址裡帶帳密", re: /\b[a-z][a-z0-9+.-]*:\/\/[^\s:@\/"'`<>]+:[^\s@\/"'`<>]{3,}@[^\s"'`<>]+/g, secret: true, fix: "帳密拿出網址，改讀設定檔或環境變數" },
  { id: "password-assign", risk: "medium", what: "像密碼／token 的設定值", re: /\b(?:pass(?:word|wd)?|pwd|secret|api[_-]?key|apikey|access[_-]?key|client[_-]?secret|auth[_-]?token|token)["']?\s*[:=]\s*["'`]([\x21\x23-\x26\x28-\x5f\x61-\x7e]{6,})["'`]/gi, secret: true, skipVal: /^(?:x+|\*+|\.+|password|true|false|null|undefined|test)$|^(?:your|<|\$\{|example|placeholder|changeme|dummy|fake|填|請填)/i, fix: "確認是不是真的密碼；真的就換成佔位字，改讀設定檔" },
  { id: "bearer", risk: "medium", what: "Bearer 憑證", re: /\bBearer\s+[A-Za-z0-9_\-.=]{20,}/g, secret: true, fix: "確認是不是真的憑證" },
  { id: "mqtt-credentials", risk: "medium", what: "MQTT 帳密", re: /\buser(?:name)?\s*:\s*["'][^"'\s]{2,}["']\s*,\s*pass(?:word)?\s*:\s*["'][^"'\s]{2,}["']/g, secret: true, fix: "App 用的公開帳號可以留（伺服器端要限權限）；其他帳號改讀設定檔" },
  { id: "dev-hash", risk: "low", what: "開發者登入雜湊 DEV_HASH", re: /\bDEV_HASH\s*=\s*["']([0-9a-f]{64})["']/g, fix: "是 SHA-256 雜湊、不是明碼，可以留；密碼本身要夠長夠亂（雜湊沒加鹽）" },
  { id: "email", risk: "medium", what: "電子郵件地址", re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, skipVal: /@(?:example\.(?:com|org|net)|users\.noreply\.github\.com|noreply\.)|^noreply@|^git@github\.com$|@\d+x\.(?:png|jpe?g|webp|gif|pdf)$/i, email: true, fix: "個人信箱拿掉；第三方作者的信箱（授權檔裡）可以留" },
  { id: "phone-tw", risk: "medium", what: "電話號碼", re: /(?<![\d.])(?:\+886[- ]?9\d{2}|09\d{2})[- ]?\d{3}[- ]?\d{3}(?![\d])/g, secret: true, fix: "拿掉" },
  { id: "tw-id", risk: "medium", what: "身分證字號格式", re: /\b[A-Z][12]\d{8}\b/g, secret: true, fix: "確認不是真的身分證字號" },
  { id: "local-path", risk: "medium", what: "本機路徑（含使用者名稱）", re: /\b[A-Za-z]:(?:\\\\|\\|\/)+Users(?:\\\\|\\|\/)+[^\\\/\s"'`<>*]+|(?<![\w.])\/(?:c\/)?Users\/[A-Za-z0-9._-]+|(?<![\w.])\/home\/[a-z0-9._-]+/gi, fix: "改成相對路徑、os.homedir() 或 %USERPROFILE%" },
  { id: "google-endpoint", risk: "medium", what: "Google 表單／試算表／Apps Script 網址", re: /\b(?:docs\.google\.com\/(?:spreadsheets|forms|document)\/d\/(?:e\/)?[A-Za-z0-9_-]{20,}|script\.google\.com\/macros\/s\/[A-Za-z0-9_-]{20,})/g, fix: "App 送回饋要用、本來就公開的可以留；試算表網址要確認權限只有自己" },
  { id: "ntfy-topic", risk: "medium", what: "ntfy 通知頻道", re: /\bntfy\.sh\/[A-Za-z0-9_-]+/g, fix: "主題名稱等於頻道密碼；本來就在 App 裡的可以留，私人通知的換掉" },
  { id: "private-ip", risk: "low", what: "區網 IP", re: /\b(?:10\.\d{1,3}|192\.168|172\.(?:1[6-9]|2\d|3[01]))\.\d{1,3}\.\d{1,3}\b/g, fix: "通常無害；確認不是自己家裡的設備" },
  { id: "anon-sample", risk: "medium", what: "匿名碼／玩家 ID 樣本", re: /["'](?:aid|pid|uid|deviceId|playerId|anonId)["']\s*:\s*["'][A-Za-z0-9_-]{6,}["']/g, secret: true, fix: "確認是測試用的假資料，不是真玩家的" },
];
/* 檔名規則 */
const NAME_RULES = [
  { id: "secret-file", risk: "high", what: "金鑰／帳密檔", re: /(?:^|\/)(?:\.xiangqi-[^\/]*|\.cup-key[^\/]*|[^\/]*\.pem|[^\/]*\.key|id_rsa[^\/]*|id_ed25519[^\/]*|\.env(?:\.[^\/]*)?|mqtt-config\.json|remote-key\.json|[^\/]*\.p12|[^\/]*\.pfx|[^\/]*\.keystore|[^\/]*\.jks|credentials\.json|service-account[^\/]*\.json|\.npmrc|\.netrc)$/i, fix: "從要公開的資料夾移除" },
  { id: "data-log", risk: "medium", what: "收集來的紀錄檔（.jsonl／.log）", re: /\.(?:jsonl|log)$/i, fix: "確認不是玩家資料" },
];
/* W69 盤點中 16（PR #68 第二輪審查①⑦）：不再用副檔名決定掃不掃（.bak、.sql、.go、沒副檔名、點開頭的檔都可能放機密），每一個檔都當文字掃——
   UTF-16（BOM 或一半是 NUL）先解碼；其餘照 UTF-8 解，控制字元（含 NUL）換成空白，長度與換行不變，所以塞 NUL、混二進位都躲不掉。
   PR #68 第三輪審查：①檔頭像圖片的檔也照樣當文字掃（圖片另外由 image-meta.cjs 查中繼資料），不然在 BM／PNG／GIF 檔頭後面接機密就躲過去了；
   第四輪（開發者 11/23 選「圖片全文掃、誤報用整張圖 sha256 放行」）：真圖片也全文掃、不設門檻；壓縮資料偶然湊出的誤報，放行清單寫 file＋fileSha256（整個檔的雜湊）；
   ③檔裡有 NUL 時，另外多解幾種（見 textsOf），沒有 BOM 的 UTF-16、奇數長度的 UTF-16BE、UTF-32 都躲不掉。IMG_HEAD 留著給外面判斷用 */
/* 第九輪審查③：BMP、ICO 的判斷跟 .github/scripts/image-meta.cjs 的 isBmp／isIco 一樣嚴（文字檔開頭剛好是 BM、資料檔開頭是 00 00 01 00 不算圖片） */
function isBmp(b) { if (b.length < 26 || b[0] !== 0x42 || b[1] !== 0x4d) return false; const off = b.readUInt32LE(10), dib = b.readUInt32LE(14); return b.readUInt32LE(6) === 0 && off >= 26 && off <= b.length && [12, 40, 52, 56, 64, 108, 124].includes(dib) }
function isIco(b) {
  if (b.length < 22 || b[0] !== 0 || b[1] !== 0 || !(b[2] === 1 || b[2] === 2) || b[3] !== 0) return false;
  const n = b.readUInt16LE(4); if (n < 1 || n > 256 || 6 + 16 * n > b.length) return false;
  for (let i = 0; i < n; i++) { const e = 6 + 16 * i, size = b.readUInt32LE(e + 8), off = b.readUInt32LE(e + 12); if (b[e + 3] !== 0 || size < 1 || off < 6 + 16 * n || off + size > b.length) return false }
  return true;
}
/* 第十輪審查②④：看檔頭判斷是哪一種圖（image-meta.cjs 的 sniff 和 oss-scan.js 的 IMG_HEAD 用同一段，兩邊逐字相同，測試會核對）。
   檔頭要整段對上：PNG 8 位元組簽章；WebP 的 RIFF 長度要落在檔內；PSD 要版本 1／2；JPEG XL、JPEG 2000 的盒子要 12 位元組簽章；
   HEIF／AVIF 的 ftyp 盒子長度要合理、品牌要認得。開頭剛好寫著「The JXL」「### ftyp」「RIFF1234WEBP」的文字檔不算圖 */
function imgFormat(b) {
  const s = (a, z) => b.toString("latin1", a, z), at = (o, sig) => b.length >= o + sig.length && sig.every((x, i) => b[o + i] === x);
  if (at(0, [0xff, 0xd8, 0xff])) return "jpeg";
  if (at(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (b.length >= 16 && s(0, 4) === "RIFF" && s(8, 12) === "WEBP") { const n = b.readUInt32LE(4); if (n >= 8 && n + 8 <= b.length + 1) return "webp" }
  if (b.length >= 8 && (s(0, 4) === "II*\0" || s(0, 4) === "MM\0*")) return "tiff";
  if (b.length >= 13 && /^GIF8[79]a$/.test(s(0, 6))) return "gif";
  if (isBmp(b)) return "bmp";
  if (isIco(b)) return "ico";
  if (b.length >= 26 && s(0, 4) === "8BPS" && b[4] === 0 && (b[5] === 1 || b[5] === 2)) return "psd";
  if (at(0, [0xff, 0x0a]) || at(0, [0, 0, 0, 0x0c, 0x4a, 0x58, 0x4c, 0x20, 0x0d, 0x0a, 0x87, 0x0a])) return "jxl";
  if (at(0, [0, 0, 0, 0x0c, 0x6a, 0x50, 0x20, 0x20, 0x0d, 0x0a, 0x87, 0x0a])) return "jp2";
  if (b.length >= 16 && s(4, 8) === "ftyp") { const n = b.readUInt32BE(0); if (n >= 16 && n <= b.length && n % 4 === 0) { const brands = s(8, n); if (/avi[fs]/.test(brands)) return "avif"; if (/hei[cfsx]|hev[cx]|mif1|msf1/.test(brands)) return "heif" } }
  return null;
}
const IMG_HEAD = (b) => imgFormat(b) !== null;
const CTRL = /[\x00-\x08\x0b\x0c\x0e-\x1f]/g;
function asText(b) {
  const n = Math.min(b.length, 65536); let z0 = 0, z1 = 0;
  for (let i = 0; i < n; i++) if (b[i] === 0) { if (i & 1) z1++; else z0++ }
  const bomLE = b[0] === 0xff && b[1] === 0xfe, bomBE = b[0] === 0xfe && b[1] === 0xff;
  if (bomLE || (n > 16 && z1 > n * 0.3 && z0 < n * 0.05)) return b.subarray(bomLE ? 2 : 0).toString("utf16le").replace(CTRL, " ");
  if (bomBE || (n > 16 && z0 > n * 0.3 && z1 < n * 0.05)) { const c = Buffer.from(b.subarray(bomBE ? 2 : 0)); const e = Buffer.from(c.subarray(0, c.length & ~1)); e.swap16(); return e.toString("utf16le").replace(CTRL, " ") }
  return b.toString("utf8").replace(CTRL, " ");
}
/* 一個檔要掃的每一種文字（PR #68 第三輪審查③）：第一種一定是 asText；檔裡有 NUL 的，再加
   ・把 NUL 全部拿掉後照 UTF-8 解：UTF-16LE／BE（不論從第幾個位元組對齊）、UTF-32 裡的英數字都會連回原樣（機密、信箱、電話都是英數字）
   ・照 UTF-16LE、UTF-16BE 各從第 0、第 1 個位元組解一次：沒有 BOM、以中文為主的 UTF-16（判斷式抓不到的那種）
   行內放行標記也是在這幾種文字裡找（scan-changed 要求登記時用同一份，見 MARK） */
function textsOf(b) {
  const out = [asText(b), b.toString("utf8").replace(CTRL, " "), b.toString("utf8")];   /* 第四輪審查①：有 BOM 但內容其實是 UTF-8 的檔，照 UTF-16 解會漏，所以一律也照 UTF-8 解一次；
     第五輪審查①：再放一份不換控制字元的原文（網址帳密裡夾 \x1f、ANSI 碼時，換成空白會把「不含空白」的規則切斷，main 版會擋） */
  if (b.indexOf(0) < 0) return out;
  out.push(Buffer.from(b.filter((x) => x !== 0)).toString("utf8").replace(CTRL, " "));
  for (const off of [0, 1]) {
    const c = Buffer.from(b.subarray(off, off + ((b.length - off) & ~1)));
    out.push(c.toString("utf16le").replace(CTRL, " ")); c.swap16(); out.push(c.toString("utf16le").replace(CTRL, " "));
  }
  return [...new Set(out)];
}
/* 行內放行標記：這一行不掃。scan-changed.cjs 用同一個判斷、同一份文字找標記要求登記（PR #68 第三輪審查②：oss-scan:\x01allow 換成空白後也算標記，所以一定要拿換過的文字比） */
const MARK = /oss-scan:\s*allow/;

const mask = (s, isEmail) => {
  if (isEmail) { const [u, d] = s.split("@"); return u[0] + "***@" + d }
  return s.length <= 8 ? s[0] + "…（" + s.length + " 字）" : s.slice(0, 4) + "…（共 " + s.length + " 字）";
};
/* all＝什麼都不跳過（scan-changed 用：暫存資料夾裡的檔全是從 git 拿出來的，node_modules 底下的也是要公開的檔；PR #68 第三輪審查④）；
   平常掃 source/ 時跳過 .git 與 node_modules（本機裝的套件不會進倉庫） */
const walk = (d, base = d, out = [], all = false) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (!all && (e.name === ".git" || e.name === "node_modules")) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, base, out, all); else out.push({ abs: p, rel: path.relative(base, p).split(path.sep).join("/") });
  }
  return out;
};

/* Windows 的使用者環境變數（setx 存的，例如 API 金鑰；已經開著的程式不一定拿得到）：只取名稱像金鑰的，值不印 */
function winUserEnv() {
  if (process.platform !== "win32") return {};
  try {
    const out = require("child_process").execFileSync("reg", ["query", "HKCU\\Environment"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }), env = {};
    for (const l of out.split(/\r?\n/)) { const m = /^\s+(\S+)\s+REG_(?:EXPAND_)?SZ\s+(.*)$/.exec(l); if (m && /KEY|TOKEN|SECRET|PASS/i.test(m[1])) env[m[1]] = m[2].trim() }
    return env;
  } catch (e) { return {} }
}
/* 已知機密：使用者資料夾的 .xiangqi-* 檔、tools/mqtt-config.json、環境變數。只回傳 {label, value}，值不印 */
function knownSecrets(opts = {}) {
  const out = [], add = (label, v) => { if (typeof v === "string" && v.length >= 8 && !/^(?:true|false|null|undefined)$/i.test(v)) out.push({ label, value: v }) };
  const PRIV = /^(?:d|p|q|dp|dq|qi|k|pass|password|passwd|secret|token|apikey|api_key|key|private|privatekey)$/i;
  const fromJson = (label, j) => {
    const walkJ = (o, isJwk) => { if (!o || typeof o !== "object") return; const jwk = isJwk || typeof o.kty === "string";
      for (const k in o) { const v = o[k]; if (v && typeof v === "object") walkJ(v, false); else if (PRIV.test(k) && (!jwk || /^(?:d|p|q|dp|dq|qi|k)$/.test(k))) add(label + " 的 " + k, v) } };
    walkJ(j, false);
  };
  const fromText = (label, s) => {
    for (const line of s.split(/\r?\n/)) { const m = /(?:密碼|password|passwd|pass|token|secret|key|金鑰)\s*[:：=]\s*(\S+)/i.exec(line); if (m) add(label + " 的密碼／金鑰", m[1]) }
    for (const m of s.matchAll(/-----BEGIN [^-]*PRIVATE KEY-----([\s\S]*?)-----END/g)) for (const l of m[1].split(/\s+/)) if (l.length >= 40) add(label + " 的私鑰內容", l);
  };
  const files = opts.knownFiles || (() => { const h = os.homedir(); let l = []; try { l = fs.readdirSync(h).filter(f => /^\.xiangqi-/.test(f)).map(f => path.join(h, f)) } catch (e) { }
    l.push(path.join(__dirname, "mqtt-config.json")); return l })();
  for (const f of files) {
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) continue;
    const s = fs.readFileSync(f, "utf8"), label = path.basename(f);
    let j = null; try { j = JSON.parse(s) } catch (e) { }
    if (j) fromJson(label, j); else fromText(label, s);
  }
  const env = opts.env || (opts.knownFiles ? {} : { ...winUserEnv(), ...process.env });
  for (const k in env) if (/KEY|TOKEN|SECRET|PASS/i.test(k) && String(env[k] || "").length >= 16) add("環境變數 " + k, String(env[k]));
  return out;
}

function loadPublic(dir) {
  if (!dir) return null;
  const texts = [];
  for (const f of walk(dir)) { const st = fs.statSync(f.abs); if (st.size > 40e6) continue; texts.push(...textsOf(fs.readFileSync(f.abs))) }
  return texts;
}

function scan(dir, opts = {}) {
  const allow = opts.allow || [], known = opts.known || [], pub = opts.publicTexts || null, findings = [];
  /* file 要跟掃描根目錄算起的路徑一模一樣（PR #68 第二輪審查⑤：寫檔名或路徑結尾，別的資料夾同名的檔也會被放行）；
     sha256＝掃到的那一串字的 SHA-256：個資（信箱、電話）用它指定是哪一筆，放行清單裡不寫個資本身；
     match 要跟掃到的那一串字一模一樣（PR #68 第三輪審查⑦：寫一部分的話，pass:"xqapp 會連 pass:"xqapp-別的密碼 也放行）；
     fileSha256＝整個檔的 SHA-256（第四輪：圖片壓縮資料湊出來的誤報用它放行，圖一改雜湊就變、要重新登記） */
  const sha = (x) => require("crypto").createHash("sha256").update(String(x), "utf8").digest("hex");
  const fileSha = new Map();
  /* 第九輪審查①（開發者決定 4）：圖片只能用整張圖的 fileSha256 放行；沒寫 fileSha256 的放行項目對圖片不算數 */
  const imgFiles = new Set();
  const allowed = (rule, rel, match) => allow.find(a => (!imgFiles.has(rel) || a.fileSha256) && (!a.rule || a.rule === rule) && (!a.file || rel === a.file) && (!a.match || String(match) === a.match) && (!a.sha256 || sha(match) === a.sha256) && (!a.fileSha256 || fileSha.get(rel) === a.fileSha256));
  const isPublic = s => !!pub && pub.some(t => t.includes(s));
  const push = (rule, rel, line, match, extra = {}) => {
    const a = allowed(rule.id, rel, match);
    findings.push({ rule: rule.id, risk: rule.risk, what: rule.what, file: rel, line, shown: extra.shown || (rule.secret ? mask(match) : rule.email ? mask(match, true) : match.slice(0, 120)),
      public: isPublic(match), allowed: a ? a.reason || "白名單" : null, fix: rule.fix });
  };
  const files = walk(dir, dir, [], !!opts.all), seen = new Set();
  const report = (rule, rel, line, match, extra) => { const k = rule.id + "\n" + rel + "\n" + line + "\n" + match; if (seen.has(k)) return; seen.add(k); push(rule, rel, line, match, extra) };
  for (const f of files) {
    for (const r of NAME_RULES) if (r.re.test(f.rel)) push(r, f.rel, 0, path.basename(f.rel), { shown: path.basename(f.rel) });
    const name = path.basename(f.rel);
    const buf = fs.readFileSync(f.abs);
    /* 圖片也照樣掃（中繼資料另外交給 image-meta.cjs；scan-changed 會把圖裡解出來的文字另外放成 .meta 檔給這裡掃） */
    const img = IMG_HEAD(buf); if (img) imgFiles.add(f.rel);
    fileSha.set(f.rel, require("crypto").createHash("sha256").update(buf).digest("hex"));
    for (const s of textsOf(buf)) {
    const starts = [0];
    for (let i = 0; i < s.length; i++) if (s.charCodeAt(i) === 10) starts.push(i + 1);
    const lineOf = idx => { let lo = 0, hi = starts.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (starts[m] <= idx) lo = m; else hi = m - 1 } return lo + 1 };
    const lineText = n => s.slice(starts[n - 1], (starts[n] || s.length + 1) - 1);
    for (const r of RULES) {
      const t = s;
      r.re.lastIndex = 0; let m;
      while ((m = r.re.exec(t))) {
        const match = m[0], val = m[1] || match;
        if (r.skipVal && r.skipVal.test(r.email ? match : val)) continue;
        if (r.near && !r.near.test(t.slice(Math.max(0, m.index - 300), m.index + 300))) continue;
        const ln = lineOf(m.index);
        /* 第五輪審查②：行內標記只略過中、低風險，高風險照擋。第六輪審查②：比對到的字跨了幾行，每一行都要有標記才略過（\s 會吃掉換行，機密放下一行就漏）；
           第六輪審查③：檔頭是圖片的檔不認標記（圖片只能用整張圖 sha256 放行） */
        if (r.risk !== "high" && !img) { const l2 = lineOf(m.index + Math.max(0, match.length - 1)); let all = true; for (let q = ln; q <= l2; q++) if (!MARK.test(lineText(q))) { all = false; break } if (all) continue }
        report(r, f.rel, ln, match);
      }
    }
    for (const k of known) {
      let i = s.indexOf(k.value);
      while (i >= 0) {
        const ln = lineOf(i);
        report({ id: "known-secret", risk: "high", what: "本機已知機密（" + k.label + "）", fix: "刪掉；這個值要當作已外洩、換新的" }, f.rel, ln, k.value, { shown: "（值不顯示）" });
        i = s.indexOf(k.value, i + 1);
      }
    }
    }
  }
  return { files: files.length, findings };
}

function summary(res) {
  const live = res.findings.filter(f => !f.allowed), by = r => live.filter(f => f.risk === r);
  return { files: res.files, high: by("high").length, medium: by("medium").length, low: by("low").length, allowed: res.findings.length - live.length,
    alreadyPublic: live.filter(f => f.public).length, failing: by("high").length };
}

module.exports = { imgFormat, scan, summary, knownSecrets, loadPublic, asText, textsOf, MARK, IMG_HEAD, RULES, NAME_RULES };

if (require.main === module) {
  const argv = process.argv.slice(2), opt = k => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null };
  const dir = argv.find((a, i) => !a.startsWith("--") && !["--public", "--allow", "--json", "--known-file"].includes(argv[i - 1]));
  if (!dir) { console.log("用法：node oss-scan.js <資料夾> [--public <已公開的資料夾>] [--allow <白名單.json>] [--json <輸出.json>] [--no-known]"); process.exit(2) }
  const allow = opt("--allow") ? JSON.parse(fs.readFileSync(opt("--allow"), "utf8")) : [];
  /* --known-file <檔>（可以給好幾個）：只拿這些檔當已知機密（測試用；不讀使用者資料夾和環境變數） */
  const kf = argv.map((a, i) => a === "--known-file" ? argv[i + 1] : null).filter(Boolean);
  const known = argv.includes("--no-known") ? [] : kf.length ? knownSecrets({ knownFiles: kf.map(f => path.resolve(f)) }) : knownSecrets();
  const res = scan(path.resolve(dir), { allow, known, publicTexts: loadPublic(opt("--public")), all: argv.includes("--all") }), S = summary(res);
  const RISK = { high: "高", medium: "中", low: "低" };
  for (const r of ["high", "medium", "low"]) {
    const L = res.findings.filter(f => f.risk === r && !f.allowed); if (!L.length) continue;
    console.log(`\n== ${RISK[r]}風險 ${L.length} 筆 ==`);
    for (const f of L) console.log(`  ${f.file}${f.line ? ":" + f.line : ""}  ${f.what}：${f.shown}${f.public ? "  〔本來就公開〕" : ""}\n      → ${f.fix}`);
  }
  const A = res.findings.filter(f => f.allowed);
  if (A.length) { console.log(`\n== 白名單略過 ${A.length} 筆 ==`); for (const f of A) console.log(`  ${f.file}${f.line ? ":" + f.line : ""}  ${f.what}：${f.allowed}`) }
  console.log(`\n掃了 ${S.files} 個檔：高 ${S.high}、中 ${S.medium}、低 ${S.low}（其中本來就公開 ${S.alreadyPublic}）、白名單略過 ${S.allowed}；比對了 ${known.length} 個本機已知機密（值不顯示）`);
  if (opt("--json")) fs.writeFileSync(opt("--json"), JSON.stringify({ summary: S, findings: res.findings }, null, 1));
  process.exit(S.failing ? 1 : 0);
}
