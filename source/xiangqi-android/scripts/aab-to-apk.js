#!/usr/bin/env node
// 象棋千秋 Android：從「實際要送審的 AAB」產生 P0 驗收用的 APK（W69 流程盤點第 3 項，2026-11-22）
// Copyright (c) 2026 陳泓昇 (Chen Hung-Sheng)．SPDX-License-Identifier: GPL-3.0-or-later
//
// 為什麼：26112201 的 P0-3D／P0-UPD 驗的是另外用 gradle assembleRelease 建的 APK，報告只記檔名；
//   送審的 AAB 跟驗過的 APK 是不是同一份內容，沒有任何東西綁住。盤點報告第 3 項。
// 這支：用 Google 官方 bundletool 從同一個 AAB 產 universal APK（所有裝置共用的單一 APK），
//   簽章用跟 AAB 同一把上傳金鑰（才能跟上一版 APK 覆蓋安裝，P0-UPD 要用），
//   並把 AAB 與 APK 的 SHA-256 寫進 <out>/aab-apk.json；之後 P0 三份報告都寫這個 AAB 的 SHA-256，送審前 p0-gate.js 核對。
// 用法：node scripts/aab-to-apk.js --aab <檔.aab> --signing <signing.properties> --out <資料夾>
//         [--bundletool <bundletool-all.jar>（預設環境變數 BUNDLETOOL）] [--java <java 執行檔>（預設 JAVA_HOME/bin/java 或 PATH 的 java）]
//   signing.properties＝app/build.gradle 用的同一份（storeFile、storePassword、keyAlias、keyPassword 四行，放在倉庫外面）；
//   密碼只寫進權限 600 的暫存檔交給 bundletool（不放命令列、不印出來），跑完就刪。
// 結束代碼：0＝產好；2＝用法或環境錯誤
"use strict";
const fs = require("fs"), path = require("path"), os = require("os"), cp = require("child_process"), crypto = require("crypto");

const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null };
const die = (m, c = 2) => { console.error("✘ " + m); process.exit(c) };
const sha256 = f => crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex");

/* signing.properties：只認四個欄位；值不回傳到任何輸出 */
function readSigning(file) {
  const P = {};
  for (const l of fs.readFileSync(file, "utf8").split(/\r?\n/)) { const m = l.match(/^\s*([A-Za-z]+)\s*=\s*(.*)$/); if (m) P[m[1]] = m[2].trim() }
  for (const k of ["storeFile", "storePassword", "keyAlias", "keyPassword"]) if (!P[k]) throw new Error("signing.properties 少了 " + k);
  if (!path.isAbsolute(P.storeFile)) P.storeFile = path.resolve(path.dirname(file), P.storeFile);
  return P;
}
/* bundletool build-apks 的參數；密碼用 file: 形式 */
function buildApksArgs({ jar, aab, apks, signing, passFile, keyPassFile }) {
  return ["-jar", jar, "build-apks", "--mode=universal", "--bundle=" + aab, "--output=" + apks, "--overwrite",
    "--ks=" + signing.storeFile, "--ks-pass=file:" + passFile, "--ks-key-alias=" + signing.keyAlias, "--key-pass=file:" + keyPassFile];
}

function main() {
  const AAB = arg("--aab"), SIGN = arg("--signing"), OUT = arg("--out"), JAR = arg("--bundletool") || process.env.BUNDLETOOL;
  if (!AAB || !SIGN || !OUT) die("用法：node scripts/aab-to-apk.js --aab <檔.aab> --signing <signing.properties> --out <資料夾> [--bundletool <jar>] [--java <java>]");
  if (!fs.existsSync(AAB)) die("找不到 AAB：" + AAB);
  if (!JAR || !fs.existsSync(JAR)) die("找不到 bundletool（--bundletool 或環境變數 BUNDLETOOL）；下載 https://github.com/google/bundletool/releases ，核對官方 SHA-256 再用");
  const JAVA = arg("--java") || (process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, "bin", "java") : "java");
  let signing; try { signing = readSigning(SIGN) } catch (e) { die(e.message) }
  fs.mkdirSync(OUT, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "xq-aab2apk-"));
  const passFile = path.join(tmp, "ks.pass"), keyPassFile = path.join(tmp, "key.pass"), apks = path.join(tmp, "out.apks");
  try {
    fs.writeFileSync(passFile, signing.storePassword, { mode: 0o600 }); fs.writeFileSync(keyPassFile, signing.keyPassword, { mode: 0o600 });
    const r = cp.spawnSync(JAVA, buildApksArgs({ jar: JAR, aab: path.resolve(AAB), apks, signing, passFile, keyPassFile }), { encoding: "utf8", maxBuffer: 1e8 });
    if (r.status !== 0) die("bundletool build-apks 失敗：" + String(r.stderr || r.stdout || r.error).replace(/pass[^\s]*/gi, "pass:…").slice(0, 400));
    const x = cp.spawnSync("unzip", ["-o", "-q", apks, "universal.apk", "-d", tmp], { encoding: "utf8" });
    if (x.status !== 0 || !fs.existsSync(path.join(tmp, "universal.apk"))) die("從 .apks 取出 universal.apk 失敗：" + String(x.stderr).slice(0, 200));
    const name = path.basename(AAB).replace(/\.aab$/i, "") + "-universal.apk", apk = path.join(OUT, name);
    fs.copyFileSync(path.join(tmp, "universal.apk"), apk);
    const ver = cp.spawnSync(JAVA, ["-jar", JAR, "version"], { encoding: "utf8" }).stdout.trim();
    const rec = { aab: path.basename(AAB), aabSha256: sha256(AAB), apk: name, apkSha256: sha256(apk), bundletool: ver, mode: "universal", madeAt: new Date().toISOString() };
    fs.writeFileSync(path.join(OUT, "aab-apk.json"), JSON.stringify(rec, null, 1) + "\n");
    console.log(`✔ ${rec.apk}\n  AAB SHA-256 ${rec.aabSha256}\n  APK SHA-256 ${rec.apkSha256}\n  bundletool ${ver}；P0 三份報告都要帶這個 AAB 的 SHA-256（--aab-sha）`);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }) }
}
module.exports = { readSigning, buildApksArgs };
if (require.main === module) main();
