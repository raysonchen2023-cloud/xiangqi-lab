#!/usr/bin/env node
/* W79 新舊 AAB 產物比對（開發者 11/23 看外部測試手法清單後選單選「新舊 AAB 產物比對」）
   拿「前一版是對的」當標準答案：Play 上現行的 AAB 跟這次的候選包比，不用跑 App 就能看出
   少了檔、檔案變成 0 位元組、多帶了 debug 檔、大小暴增這類 P0-IMG 前兆。
   做法：只讀 zip 尾端的中央目錄（每個檔的名稱、壓縮前大小、CRC32），不解壓，不需要 unzip。
   用法：node aab-diff.js <舊版.aab> <新版.aab> [--expect-removed=<正規式>] [--expect-added=<正規式>] [--strict] [--json=<輸出檔>] [--md=<輸出檔>]
   結束代碼：0＝沒有紅項（可能有黃項要人看）；1＝有紅項，不能送審（--strict 時黃項也算）；
            2＝沒驗到：讀不到檔、不是 AAB（少了 BundleConfig.pb 等必有的檔）、新舊是同一個檔或每個檔都一樣（拿錯檔）、寫不出報告。
   這不是內容完整性檢查：只比中央目錄的 CRC32 與大小，不解壓、不驗簽章。
   紅：舊版有、新版沒有（不在 --expect-removed）；原本有內容、新版變成 0 位元組；
       1 KB 以上的檔（BUNDLE-METADATA/、META-INF/ 除外）縮到原本 10% 以下；
       程式、結構、引擎與 3D 模型檔（html、js、json、css、dex、so、pb、xml、arsc、wasm、nnue、glb、gltf）64 位元組以上、縮到 60% 以下（不在 --expect-shrunk）；
       新版多了 debug 類檔案（不在 --expect-added；只有 BUNDLE-METADATA/ 和 GPL 重建紀錄 build.log 不算，會列在報告裡）；
       新版裡有可能含金鑰的檔（.env、.pem、.key、.p8、.jks、id_rsa、google-services.json、key.properties、.dev.vars、.git/、.ssh/…，加備份副檔名也算；舊版就帶著也算；任何參數都不放過）；
       新增 0 位元組的素材、程式或 data 檔；zip 裡有重複檔名（回 2）。
   黃：程式檔、素材縮到 90% 以下；其他 1 KB 以上的檔縮到 60% 以下；放行超過 50 個（報告特別標出）；新增其他 0 位元組的檔；整包壓縮前總大小增加超過 20%；單檔變成 5 倍以上而且超過 1 MB；新增超過 20 MB 的單檔；有任何檔照參數放行。
   確認清單 --ack：每個黃項有確認碼（檔名＠新版 CRC），人看過後寫進清單，該黃項就不再讓 --strict 擋；內容一變確認碼就變。紅項不能確認。
   參數只收上面列的：不認得的、沒有值的、重複的、正規式寫錯的、報告路徑指到輸入的 AAB（含硬連結），一律結束代碼 2。
   被放行的檔和放行參數的原始正規式都會寫在報告裡。接進送審閘門時一律加 --strict。 */
"use strict";
const fs = require("fs"), path = require("path");

/* 讀 zip 中央目錄：回傳 Map(名稱 → {size, csize, crc})。支援 ZIP64（AAB 常超過 4 GB 的欄位上限）。 */
function readZipIndex(file) {
  const fd = fs.openSync(file, "r");
  try {
    const st = fs.fstatSync(fd), tailLen = Math.min(st.size, 65557 + 20), tail = Buffer.alloc(tailLen);
    fs.readSync(fd, tail, 0, tailLen, st.size - tailLen);
    let eocd = -1;
    for (let i = tailLen - 22; i >= 0; i--) if (tail.readUInt32LE(i) === 0x06054b50) { eocd = i; break }
    if (eocd < 0) throw new Error("找不到 zip 結尾記錄（不是 zip／AAB，或檔案不完整）");
    let count = tail.readUInt16LE(eocd + 10), cdSize = tail.readUInt32LE(eocd + 12), cdOff = tail.readUInt32LE(eocd + 16);
    if (count === 0xffff || cdSize === 0xffffffff || cdOff === 0xffffffff) {
      const loc = eocd - 20;
      if (loc < 0 || tail.readUInt32LE(loc) !== 0x07064b50) throw new Error("ZIP64 定位記錄缺漏");
      const z64 = Number(tail.readBigUInt64LE(loc + 8)), h = Buffer.alloc(56);
      fs.readSync(fd, h, 0, 56, z64);
      if (h.readUInt32LE(0) !== 0x06064b50) throw new Error("ZIP64 結尾記錄格式不對");
      count = Number(h.readBigUInt64LE(32)); cdSize = Number(h.readBigUInt64LE(40)); cdOff = Number(h.readBigUInt64LE(48));
    }
    const cd = Buffer.alloc(cdSize); fs.readSync(fd, cd, 0, cdSize, cdOff);
    const out = new Map(); let p = 0;
    for (let i = 0; i < count; i++) {
      if (cd.readUInt32LE(p) !== 0x02014b50) throw new Error("中央目錄第 " + (i + 1) + " 筆格式不對");
      const crc = cd.readUInt32LE(p + 16); let csize = cd.readUInt32LE(p + 20), size = cd.readUInt32LE(p + 24);
      const nl = cd.readUInt16LE(p + 28), xl = cd.readUInt16LE(p + 30), cl = cd.readUInt16LE(p + 32);
      const name = cd.toString("utf8", p + 46, p + 46 + nl);
      if (size === 0xffffffff || csize === 0xffffffff) {   /* ZIP64 額外欄位 0x0001：依序放「超過上限的」原始大小、壓縮大小 */
        let q = p + 46 + nl; const end = q + xl;
        while (q + 4 <= end) {
          const id = cd.readUInt16LE(q), len = cd.readUInt16LE(q + 2);
          if (id === 0x0001) { let r = q + 4; if (size === 0xffffffff) { size = Number(cd.readBigUInt64LE(r)); r += 8 } if (csize === 0xffffffff) csize = Number(cd.readBigUInt64LE(r)); break }
          q += 4 + len;
        }
      }
      if (!name.endsWith("/")) { if (out.has(name)) throw new Error("zip 裡有重複的檔名（第五輪審查：原本會默默合併）：" + name); out.set(name, { size, csize, crc }) }
      p += 46 + nl + xl + cl;
    }
    if (!out.size) throw new Error("zip 裡沒有任何檔案");
    return out;
  } finally { fs.closeSync(fd) }
}

/* debug／開發用的檔（第五輪審查補 .pdb、編輯器與 AI 工具設定、.github/、coverage/、output/、test-*.js、包在裡面的 apk／aab／zip） */
const DEBUG_RE = /(\.map|\.log|\.bak|\.orig|\.tmp|\.swp|\.pdb|\.apk|\.aab|\.zip|~)$|(^|\/)(\.DS_Store|Thumbs\.db|node_modules\/|\.vscode\/|\.idea\/|__MACOSX\/|CLAUDE\.md$|\.claude\/|\.github\/|coverage\/|output\/)|(^|\/)data\/evidence\/|(^|\/)assets\/public\/(tools|tests?)\/|(^|\/)tools\/test-[^/]*\.js$/i;
/* 照規則不算 debug 的：BUNDLE-METADATA/（Android 建置工具自己放的 proguard.map 等，不會裝到手機）、
   GPL 重建紀錄 build.log（只放行這一個檔；第五輪審查：原本整個 pikafish-src/ 都不查）。被免掉的新增檔會列在報告「照規則不算 debug」一節。 */
const DEBUG_OK = /^BUNDLE-METADATA\/|^base\/assets\/public\/pikafish-src\/full\/rebuild-evidence\/build\.log$/;
/* 可能含金鑰、帳號、本機設定的檔：新版裡只要有就紅（舊版就帶著也一樣），任何放行參數、確認清單都不放過。
   第五輪審查：結尾接備份副檔名（.bak、.orig、.tmp、.swp、.old、~）照樣算；補 key／secrets.properties、.dev.vars、client_secret*、firebase-adminsdk*、
   .git-credentials、沒有副檔名的 credentials、secrets.json、.ppk、.mobileprovision、.asc、.htpasswd；.git/、.ssh/ 底下任何檔 */
const SECRET_RE = /(^|\/)(\.env(\.[^/]*)?|[^/]*\.(pem|key|jks|keystore|p12|pfx|p8|ppk|mobileprovision|provisionprofile|asc|gpg|crt|cer|der|p7b)|id_(rsa|dsa|ecdsa|ed25519)|(local|signing|key|gradle|secrets?)\.properties|[^/]*keystore[^/]*\.properties|google-services\.json|GoogleService-Info\.plist|\.npmrc|\.netrc|\.pgpass|\.htpasswd|\.dev\.vars|\.git-credentials|credentials|secrets?\.(json|ya?ml)|service-account[^/]*\.json|credentials[^/]*\.json|client_secret[^/]*\.json|firebase-adminsdk[^/]*\.json)(\.(bak|backup|orig|tmp|swp|old|save|\d+)|~)*$|(^|\/)\.(git|ssh|aws|gnupg)\//i;
/* 大幅縮小判斷不套用的：建置工具自己的檔、簽章檔（每次建包本來就會變） */
const SHRINK_SKIP = /^(BUNDLE-METADATA|META-INF)\//;
/* 程式、結構、引擎與 3D 模型檔：截掉一部分就會白畫面、閃退、引擎壞掉或 3D 破圖，門檻比較嚴
   （第四輪審查：core.js 截到 50%、index.html 截到 15% 原本都綠；第五輪審查：wasm、nnue、glb 截到 55% 原本只算黃） */
const CODE_RE = /\.(html?|m?js|json|css|dex|so|pb|xml|arsc|wasm|nnue|glb|gltf)$/i;
/* 縮小判斷的下限：一般檔 1 KB；程式檔 64 位元組（第五輪審查：sw.js 775、capacitor.config.json 481、BundleConfig.pb 628 位元組截斷原本不報） */
/* Capacitor 沒有 Cordova 外掛時一定產生的兩個空檔（真包 0804 實例）：新增時算黃不算紅。只認這兩個固定路徑 */
const ZERO_STUB = /^base\/assets\/public\/(cordova|cordova_plugins)\.js$/;
/* 第六輪審查：素材下限也降到 64 位元組（res 的 png 截到 100 位元組原本不報）；程式檔縮到 90% 以下算黃（靠 --ack 確認）；
   建置時不會變的引擎權重、wasm、3D 模型（nnue、wasm、glb、gltf）只要大小變了就算黃 */
const SHRINK_MIN = 1024, SHRINK_MIN_CODE = 64, SHRINK_RED = 0.1, SHRINK_CODE = 0.6, SHRINK_CODE_WARN = 0.9, ALLOW_MAX = 50;
const FIXED_BIN = /\.(nnue|wasm|glb|gltf)$/i;
/* 素材類（圖、模型、聲音、字型、引擎權重）：大幅縮小多半是壞圖（例如被換成 Git LFS 指標檔，約 130 位元組）。iMac Claude 1 11/23 審查要改。 */
const MEDIA_RE = /\.(webp|png|jpe?g|gif|avif|svg|glb|gltf|bin|mp3|ogg|wav|m4a|woff2?|ttf|otf|nnue|wasm)$/i;
/* 每個 AAB 一定有的檔：兩包都要有，才算拿對檔。審查要改：原本兩個不相干的 zip 互比也會回 0。 */
const AAB_MUST = ["BundleConfig.pb", "base/manifest/AndroidManifest.xml", "base/assets/public/index.html"];
const MB = 1024 * 1024;
/* W91（11/24）：新增的檔要在現行包本來就有的位置（照 26112401 的實際結構）；不在這些位置就亮黃。
   補 26112301 那次漏掉的那一類：根目錄多了 AGENTS.md、releases/、驗證紀錄（W83）——不是 debug 檔、也不是金鑰，原本完全不報。 */
const NEW_OK = /^(base\/assets\/public\/(data|engine|pikafish-src|licenses)\/|base\/assets\/public\/[^/]+\.(m?js|html?|css|json|png|svg|webp|ico)$|base\/assets\/public\/(LICENSE[^/]*|NOTICE[^/]*|NNUE-License\.md)$|base\/(dex|lib|res|manifest|root)\/|base\/[^/]+\.pb$|base\/assets\/[^/]+\.json$|BUNDLE-METADATA\/|META-INF\/|BundleConfig\.pb$)/;
/* 在允許的位置裡、但不該進安裝包的：驗證紀錄、證據頁（W83 從 make-www 排除過；網頁版才放） */
const NEW_SUSPECT = /^base\/assets\/public\/data\/docs\/(verification-log|evidence)[^/]*$/;
const TOOL_PINS = require("./tool-pin.js").pinsFor("AAB-DIFF");   /* 啟動就先算：記的是實際被載入、跑這一次的那一份 */

/* 比對兩份索引；opts.expectRemoved／expectAdded＝正規式（列在裡面的檔可以從新版拿掉／新增，不算紅，但會列在報告裡） */
function diffIndex(A, B, opts = {}) {
  const red = [], yellow = [], allowed = [], noted = [], info = { removed: 0, added: 0, changed: 0, same: 0 };
  let ta = 0, tb = 0;
  for (const n of B.keys()) if (SECRET_RE.test(n)) red.push({ f: n, why: (A.has(n) ? "新版還帶著" : "新版多了") + "可能含金鑰／帳號／本機設定的檔（任何放行參數、確認清單都不放過）" });
  for (const [n, a] of A) {
    ta += a.size; const b = B.get(n);
    if (!b) { info.removed++; if (opts.expectRemoved && opts.expectRemoved.test(n)) allowed.push({ f: n, crc: "removed:" + (a.crc >>> 0).toString(16), why: "預期拿掉（--expect-removed）" }); else red.push({ f: n, why: "新版少了這個檔（舊版 " + a.size + " 位元組）" }); continue }
    if (a.crc === b.crc && a.size === b.size) { info.same++; continue }
    info.changed++;
    if (a.size > 0 && b.size === 0) red.push({ f: n, why: "原本有內容（" + a.size + " 位元組），新版變成 0 位元組" });
    else if (!SHRINK_SKIP.test(n) && a.size >= (CODE_RE.test(n) || MEDIA_RE.test(n) ? SHRINK_MIN_CODE : SHRINK_MIN) && b.size < a.size * SHRINK_CODE) {   /* 第三輪審查：套到整包。第四輪審查：只看比例，不用「小於 1 KB」的絕對門檻（1098→1000 位元組原本誤報紅） */
      const pct = Math.round(b.size / a.size * 100), hard = b.size < a.size * SHRINK_RED || CODE_RE.test(n);
      if (opts.expectShrunk && opts.expectShrunk.test(n)) allowed.push({ f: n, crc: (b.crc >>> 0).toString(16) + ":" + b.size, why: "預期大幅縮小（--expect-shrunk）：" + a.size + " → " + b.size + " 位元組（" + pct + "%）" });
      else if (hard) red.push({ f: n, why: "大幅縮小（" + a.size + " → " + b.size + " 位元組，剩 " + pct + "%），可能被截斷、換成壞圖或指標檔" });
      else yellow.push({ f: n, why: "縮小到 " + pct + "%（" + a.size + " → " + b.size + " 位元組），請人確認" }) }
    else if (!SHRINK_SKIP.test(n) && FIXED_BIN.test(n) && b.size !== a.size) yellow.push({ f: n, why: "建置時不會變的引擎／3D 檔大小變了（" + a.size + " → " + b.size + " 位元組），請人確認" });
    else if (!SHRINK_SKIP.test(n) && (CODE_RE.test(n) || MEDIA_RE.test(n)) && a.size >= SHRINK_MIN_CODE && b.size < a.size * SHRINK_CODE_WARN) yellow.push({ f: n, why: (CODE_RE.test(n) ? "程式檔" : "素材") + "縮小到 " + Math.round(b.size / a.size * 100) + "%（" + a.size + " → " + b.size + " 位元組），請人確認" });
    else if (b.size > 5 * a.size && b.size > MB) yellow.push({ f: n, why: "變成 " + (b.size / a.size).toFixed(1) + " 倍（" + (a.size / MB).toFixed(1) + " → " + (b.size / MB).toFixed(1) + " MB）" });
  }
  for (const [n, b] of B) {
    tb += b.size; if (A.has(n)) continue;
    info.added++;
    const ok = opts.expectAdded && opts.expectAdded.test(n);
    if (SECRET_RE.test(n)) { /* 上面已經對新版每個檔判紅 */ }
    else if (DEBUG_RE.test(n)) { if (DEBUG_OK.test(n)) noted.push({ f: n, why: "照規則不算 debug（建置工具的檔或 GPL 重建紀錄）" }); else if (ok) allowed.push({ f: n, crc: (b.crc >>> 0).toString(16) + ":" + b.size, why: "預期新增（--expect-added）" }); else red.push({ f: n, why: "新版多了 debug／開發用的檔" }) }
    else if (b.size === 0 && ZERO_STUB.test(n)) yellow.push({ f: n, why: "Capacitor 產生的空殼檔（本來就是 0 位元組），請人確認一次" });
    else if (b.size === 0 && (MEDIA_RE.test(n) || CODE_RE.test(n) || /^base\/assets\/public\/data\//.test(n))) red.push({ f: n, why: "新增的素材或程式檔是 0 位元組" });
    else if (b.size === 0) yellow.push({ f: n, why: "新增的檔是 0 位元組，請人確認" });
    else if (NEW_SUSPECT.test(n) || !NEW_OK.test(n)) {
      if (ok) allowed.push({ f: n, crc: (b.crc >>> 0).toString(16) + ":" + b.size, why: "預期新增（--expect-added）" });
      else yellow.push({ f: n, why: NEW_SUSPECT.test(n) ? "新增驗證紀錄／證據頁進了安裝包（網頁版才放，W83），請人確認" : "新增的檔不在現行包本來就有的位置（例如根目錄多了說明文件、releases/），請人確認" }) }
    if (b.size > 20 * MB) yellow.push({ f: n, why: "新增超過 20 MB 的單檔（" + (b.size / MB).toFixed(1) + " MB）" });
  }
  if (ta > 0 && tb > ta * 1.2) yellow.push({ f: "（整包）", why: "壓縮前總大小增加 " + ((tb / ta - 1) * 100).toFixed(0) + "%（" + (ta / MB).toFixed(0) + " → " + (tb / MB).toFixed(0) + " MB）" });
  /* 第三輪審查：--expect-removed=. 之類一次全放也會回 0。有放行就至少算黃（--strict 時擋），放行超過 ALLOW_MAX 個直接算紅（參數寫太寬） */
  /* 第七輪審查：超過 ALLOW_MAX 原本判紅又不能確認，正常的大改版沒路轉綠；改成黃，確認碼綁住整份放行清單（每筆檔名＋內容），報告寫明參數可能太寬 */
  if (allowed.length > ALLOW_MAX) yellow.push({ f: "（放行參數）", why: "照參數放行了 " + allowed.length + " 個檔，超過 " + ALLOW_MAX + " 個，參數可能寫太寬：請逐筆看過「放行」那一節再確認" });
  else if (allowed.length) yellow.push({ f: "（放行參數）", why: "照參數放行了 " + allowed.length + " 個檔，請人看過「放行」那一節" });
  /* 每個黃項都有一個確認碼：檔名＠新版 CRC（拿掉的檔＠removed，整包＠新版總大小，放行參數＠放行清單的 CRC）。
     人看過、把確認碼寫進 --ack 清單，該黃項就移到「已確認」，--strict 不再擋。紅項不能確認。內容一變確認碼就變，舊清單自動失效。 */
  /* 第六輪審查：確認碼原本只綁檔名或總大小，沿用舊清單就能放過被截斷的檔。現在放行參數綁住每一筆「檔名＋內容 CRC＋大小」，整包綁住新版整份清單 */
  const z = require("zlib"), hx = (t) => (z.crc32(t) >>> 0).toString(16), allKey = hx([...B].map(([n, b]) => n + "@" + (b.crc >>> 0).toString(16) + ":" + b.size).sort().join("\n")),
    keyOf = (y) => y.f === "（整包）" ? y.f + "@" + allKey : y.f === "（放行參數）" ? y.f + "@" + hx(allowed.map((x) => x.f + "@" + x.crc).sort().join("\n")) : B.has(y.f) ? y.f + "@" + (B.get(y.f).crc >>> 0).toString(16) + ":" + B.get(y.f).size : y.f + "@removed";
  for (const y of yellow) y.ack = keyOf(y);
  const ack = opts.ack || new Set(), acked = yellow.filter((y) => ack.has(y.ack));
  return { red, yellow: yellow.filter((y) => !ack.has(y.ack)), acked, allowed, noted, info, total: { old: ta, new: tb } };
}
/* 輸入檢查：回傳「沒驗到」的原因（null＝可以比）。兩包都要是 AAB；新舊一模一樣多半是拿錯檔 */
function checkInputs(A, B, pathA, pathB) {
  for (const [I, w] of [[A, "舊版"], [B, "新版"]]) { const miss = AAB_MUST.filter((n) => !I.has(n)); if (miss.length) return w + "不是 AAB（少了 " + miss.join("、") + "）" }
  try { if (pathA && pathB && fs.realpathSync(pathA) === fs.realpathSync(pathB)) return "新舊是同一個檔，可能拿錯檔" } catch (e) {}
  if (A.size === B.size && [...A].every(([n, a]) => { const b = B.get(n); return b && b.crc === a.crc && b.size === a.size })) return "新舊每個檔都一模一樣，可能拿錯檔";
  return null;
}

/* W91 金絲雀（AGENTS.md「P0 出口驗證要難作假」：壞樣本從實際的候選包做、跟正式比對走同一條判斷路徑 diffIndex，參數與確認清單也一樣）：
   ①刪一個首頁素材 ②把一個根目錄的 js 縮成 0 位元組 ③多帶一個 .jks——都要變紅；④多一個沒確認過的 AGENTS.md——要變黃（--strict 擋）。
   參數放太寬（例如 --expect-removed=.）會讓①不紅，金絲雀就判失靈。回傳 { home, zeroJs, jks, yellow: {f, ok}, ok } */
function canaryRun(A, B, opts = {}) {
  const pick = (re) => [...B.keys()].filter((n) => A.has(n) && re.test(n) && B.get(n).size > 0).sort()[0] || null;
  const out = {};
  const run = (k, f, mut, where) => {
    if (!f) { out[k] = { f: null, ok: false, why: "包裡找不到可以拿來做壞樣本的檔" }; return }
    const B2 = new Map(B); mut(B2, f);
    const r = diffIndex(A, B2, opts);
    out[k] = { f, ok: r[where].some((x) => x.f === f) };
  };
  run("home", pick(/^base\/assets\/public\/data\/homemap\/[^/]+\.(webp|png|jpe?g)$/) || pick(/^base\/assets\/public\/data\/.+\.(webp|png|jpe?g)$/), (M, f) => M.delete(f), "red");
  run("zeroJs", pick(/^base\/assets\/public\/[^/]+\.js$/), (M, f) => M.set(f, { size: 0, csize: 0, crc: 0 }), "red");
  const JKS = "base/assets/public/upload-keystore.jks", AG = "base/assets/public/AGENTS.md";
  run("jks", B.has(JKS) ? null : JKS, (M, f) => M.set(f, { size: 2048, csize: 2000, crc: 0x1234abcd }), "red");
  run("yellow", B.has(AG) ? null : AG, (M, f) => M.set(f, { size: 4096, csize: 1500, crc: 0x5a5a5a5a }), "yellow");
  out.ok = ["home", "zeroJs", "jks", "yellow"].every((k) => out[k].ok === true);
  return out;
}

function renderMd(r, oldName, newName, args) {
  const given = Object.entries(args || {}).map(([k, v]) => "`--" + k + "=" + String(v).replace(/`/g, "'") + "`");
  const L = ["# 新舊 AAB 產物比對", "", "- 舊版（標準答案）：" + oldName, "- 新版（候選）：" + newName,
    "- 放行參數（原始正規式）：" + (given.length ? given.join("、") : "沒有"),
    "- 檔案：拿掉 " + r.info.removed + "、新增 " + r.info.added + "、內容改變 " + r.info.changed + "、相同 " + r.info.same,
    "- 壓縮前總大小：" + (r.total.old / MB).toFixed(1) + " → " + (r.total.new / MB).toFixed(1) + " MB", "",
    "## 結論：" + (r.red.length ? "✘ 有 " + r.red.length + " 個紅項，不能送審" : "✔ 沒有紅項") + (r.yellow.length ? "（另有 " + r.yellow.length + " 個黃項要人看）" : "") + ((r.acked || []).length ? "；已確認 " + r.acked.length + " 個黃項" : "") + ((r.allowed || []).length ? "；照參數放行 " + r.allowed.length + " 個" : ""), "",
    "說明：只比中央目錄的檔名、大小與 CRC32，不解壓、不驗內容完整性，也不驗簽章。", ""];
  const T = (t, a, withAck) => { if (!a.length) return; L.push("### " + t, "", withAck ? "| 檔案 | 原因 | 確認碼 |" : "| 檔案 | 原因 |", withAck ? "|---|---|---|" : "|---|---|"); for (const x of a) L.push("| `" + x.f + "` | " + x.why + (withAck ? " | `" + x.ack + "`" : "") + " |"); L.push("") };
  T("紅項", r.red); T("黃項（人看過後把確認碼寫進 --ack 清單）", r.yellow, true); T("已確認的黃項（--ack 清單）", r.acked || [], true);
  T("放行（照參數預期的改動，請人看過）", r.allowed || []); T("照規則不算 debug 的新增檔（建置工具、GPL 重建紀錄）", r.noted || []);
  return L.join("\n");
}

/* 整個檔的 SHA-256（分塊讀，安裝包可能好幾百 MB） */
function sha256File(f) {
  const h = require("crypto").createHash("sha256"), fd = fs.openSync(f, "r"), b = Buffer.alloc(8 * MB);
  try { let n; while ((n = fs.readSync(fd, b, 0, b.length, null)) > 0) h.update(b.subarray(0, n)) } finally { fs.closeSync(fd) }
  return h.digest("hex");
}
/* 結束代碼：0＝沒有紅項；1＝有紅項（--strict 時黃項也算；金絲雀結果記在報告 canary 與 pass，閘門看）；2＝沒驗到（讀不到、不是 AAB、拿錯檔、參數不對、寫不出報告） */
/* 參數：白名單（第二輪審查要改：--Strict、--strict=1、--foo=bar 原本被默默忽略）。
   不認得的、值是空的、同一個出現兩次、正規式寫錯，一律當「沒驗到」回 2。回傳 {pos, opt, strict} 或錯誤訊息字串。 */
const ARG_VAL = ["expect-removed", "expect-added", "expect-shrunk", "json", "md", "ack", "old-code", "new-code"];
function parseArgs(argv) {
  const pos = [], opt = {}; let strict = false;
  for (const a of argv) {
    if (!a.startsWith("--")) { pos.push(a); continue }
    if (a === "--strict") { if (strict) return "--strict 重複"; strict = true; continue }
    const m = a.match(/^--([a-z-]+)=(.*)$/);
    if (!m || !ARG_VAL.includes(m[1])) return "不認得的參數：" + a;
    if (m[2] === "") return "參數沒有值：" + a;
    if (m[1] in opt) return "參數重複：--" + m[1];
    opt[m[1]] = m[2];
  }
  if (pos.length !== 2) return "要剛好兩個 AAB 路徑（舊版、新版），收到 " + pos.length + " 個";
  /* 第四輪審查：--json／--md 指到輸入的 AAB 會把候選包蓋掉（實跑變成 308 位元組） */
  /* 第五輪審查：硬連結（不同路徑、同一個檔）也算——兩個都存在時比 dev＋ino，不存在時比正規化後的路徑 */
  const same = (x, y) => {
    try { const a = fs.statSync(x, { bigint: true }), b = fs.statSync(y, { bigint: true }); if (a.ino !== 0n && a.dev === b.dev && a.ino === b.ino) return true } catch (e) {}
    const R = (p) => { try { return fs.realpathSync(p) } catch (e) { return path.resolve(p) } }; return R(x).toLowerCase() === R(y).toLowerCase() };
  for (const k of ["json", "md", "ack"]) if (k in opt) for (const p of pos) if (same(opt[k], p)) return "--" + k + " 指到輸入的 AAB：" + opt[k];
  if ("json" in opt && "md" in opt && same(opt.json, opt.md)) return "--json 和 --md 指到同一個檔";
  for (const k of ["json", "md"]) if (k in opt && "ack" in opt && same(opt[k], opt.ack)) return "--" + k + " 會蓋掉 --ack 清單";
  for (const k of ["old-code", "new-code"]) if (k in opt && !/^\d{1,10}$/.test(opt[k])) return "--" + k + " 要是 versionCode 數字：" + opt[k];   /* W91：送審閘門要知道「舊版」是 Play 上哪一版 */
  const raw = {};
  for (const k of ["expect-removed", "expect-added", "expect-shrunk"]) if (k in opt) { raw[k] = opt[k]; try { opt[k] = new RegExp(opt[k]) } catch (e) { return "--" + k + " 的正規式寫錯：" + e.message } }
  /* --ack：人看過的黃項確認碼清單，JSON 字串陣列（例如 ["base/assets/public/release.json@1a2b3c4d"]）。讀不到、格式不對一律回 2 */
  if ("ack" in opt) { raw.ack = opt.ack; try { const j = JSON.parse(fs.readFileSync(opt.ack, "utf8")); if (!Array.isArray(j) || !j.every((s) => typeof s === "string" && s.includes("@"))) throw new Error("要是確認碼字串的陣列"); opt.ack = new Set(j) } catch (e) { return "--ack 清單讀不到或格式不對：" + e.message } }
  return { pos, opt, strict, raw };
}

if (require.main === module) {
  const no = (m) => { console.error("✘ 沒驗到：" + m); process.exit(2) };
  const P = parseArgs(process.argv.slice(2));
  if (typeof P === "string") { console.error("用法：node aab-diff.js <舊版.aab> <新版.aab> [--expect-removed=<正規式>] [--expect-added=<正規式>] [--expect-shrunk=<正規式>] [--strict] [--ack=<確認清單.json>] [--json=<檔>] [--md=<檔>]"); no(P) }
  let A, B;
  try { A = readZipIndex(P.pos[0]); B = readZipIndex(P.pos[1]) } catch (e) { no(e.message) }
  const bad = checkInputs(A, B, P.pos[0], P.pos[1]); if (bad) no(bad);
  const OPTS = { expectRemoved: P.opt["expect-removed"], expectAdded: P.opt["expect-added"], expectShrunk: P.opt["expect-shrunk"], ack: P.opt.ack };
  const r = diffIndex(A, B, OPTS);
  /* W91：送審閘門要的欄位——兩個 AAB 的 SHA-256（閘門核對新版＝送審的 AAB）、舊版是 Play 上哪一版（--old-code）、有沒有 --strict、
     金絲雀（同一套參數與確認清單）、工具雜湊（跟 origin/main 比）、結束代碼 */
  let oldSha256, newSha256;
  try { oldSha256 = sha256File(P.pos[0]); newSha256 = sha256File(P.pos[1]) } catch (e) { no("算不出 AAB 的 SHA-256：" + e.message) }
  /* 結束代碼照舊只看紅黃項（命令列的意思不變）；金絲雀另外記在報告，pass 要三樣都成立：結束代碼 0、--strict、金絲雀都抓到——送審閘門看 pass 與 canary */
  const canary = canaryRun(A, B, OPTS), code = r.red.length || (P.strict && r.yellow.length) ? 1 : 0;
  Object.assign(r, { tool: "AAB-DIFF", args: P.raw, strict: P.strict, oldName: P.pos[0].split(/[\\/]/).pop(), newName: P.pos[1].split(/[\\/]/).pop(), oldSha256, newSha256,
    oldCode: P.opt["old-code"] || null, newCode: P.opt["new-code"] || null, canary, exitCode: code, pass: code === 0 && P.strict === true && canary.ok === true, toolPins: TOOL_PINS });
  const md = renderMd(r, r.oldName, r.newName, P.raw) + "\n\n## 金絲雀（從這個候選包做的壞樣本，同一套參數與確認清單）：" + (canary.ok ? "✔ 都抓到" : "✘ 沒抓到，這次比對不可信") + "\n" +
    ["home", "zeroJs", "jks", "yellow"].map((k) => "- " + { home: "刪一個首頁素材→紅", zeroJs: "一個 js 縮成 0 位元組→紅", jks: "多帶一個 .jks→紅", yellow: "多一個沒確認的 AGENTS.md→黃" }[k] + "：" + (canary[k].ok ? "✔" : "✘") + "（" + (canary[k].f || canary[k].why) + "）").join("\n");
  try { if (P.opt.json) fs.writeFileSync(P.opt.json, JSON.stringify(r, null, 1) + "\n"); if (P.opt.md) fs.writeFileSync(P.opt.md, md + "\n") } catch (e) { no("寫不出報告：" + e.message) }
  console.log(md);
  process.exit(code);
}
module.exports = { readZipIndex, diffIndex, checkInputs, renderMd, parseArgs, canaryRun, sha256File, DEBUG_RE, DEBUG_OK, SECRET_RE, MEDIA_RE, CODE_RE, AAB_MUST, NEW_OK, NEW_SUSPECT };
