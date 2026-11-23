// 象棋千秋 CI：圖片裡會洩漏個資的中繼資料（W69 流程盤點中 16「私密掃描在 CI 偏弱」，2026-11-23）
// Copyright (c) 2026 陳泓昇 (Chen Hung-Sheng)．SPDX-License-Identifier: GPL-3.0-or-later
//
// 為什麼：oss-scan 只看文字檔，圖片整個略過。用手機或相機拍、再放進倉庫的圖，EXIF 裡可能有拍攝地點（GPS）、
//   相機型號與序號、拍攝者姓名；公開倉庫一推上去就外洩。
// 看什麼（只回報「有哪一種」，不回報值本身）：
//   gps＝拍攝地點；camera＝相機廠牌／型號；owner＝拍攝者、著作權人、相機主人姓名、機身／鏡頭序號；comment＝JPEG 註解區（可能寫了任何東西）
// 格式用檔頭判斷，不看副檔名（sniff）。支援：
//   JPEG（APP1 Exif、XMP、延伸 XMP、APP13 IPTC、COM 註解）、PNG（eXIf、tEXt／zTXt／iTXt 含壓縮、XMP、Raw profile）、
//   WebP（EXIF、XMP）、TIFF（本體就是 EXIF）、GIF（XMP 應用程式擴充）、BMP（沒有中繼資料）。
//   HEIC／HEIF／AVIF 讀不懂 → imageMeta 回 null，scan-changed 一律擋（PR #68 審查③：讀不懂的不能當乾淨）。
// 純函式、不讀檔，給 scan-changed.cjs 用、test-guard-scan.cjs 測。
"use strict";
const zlib = require("zlib");

/* 檔頭判斷格式：回 "jpeg"／"png"／"webp"／"tiff"／"gif"／"bmp"／"heif"／"avif"，不是圖片回 null */
/* 第九輪審查③：BMP、ICO 的檔頭判斷收嚴，開頭剛好是「BM」的文字檔、00 00 01 00 開頭的資料檔不會被當成圖片：
   BMP 要 14 位元組檔頭的保留欄是 0、像素位移在檔內、資訊頭大小是 12／40／52／56／64／108／124；
   ICO／CUR 要張數 1～256，而且每一張的「大小＋位移」都落在檔內、位移在目錄之後 */
function isBmp(b) {
  if (b.length < 26 || b[0] !== 0x42 || b[1] !== 0x4d) return false;
  const off = b.readUInt32LE(10), dib = b.readUInt32LE(14);
  return b.readUInt32LE(6) === 0 && off >= 26 && off <= b.length && [12, 40, 52, 56, 64, 108, 124].includes(dib);
}
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
function sniff(buf) { return imgFormat(Buffer.isBuffer(buf) ? buf : Buffer.from(buf)) }

const TAG = { 0x010f: "camera", 0x0110: "camera", 0x013b: "owner", 0x8298: "owner", 0x9c9d: "owner", 0xa430: "owner", 0xa431: "owner", 0xa435: "owner" };   /* 0x9c9d＝XPAuthor */
const P_EXIF = 0x8769, P_GPS = 0x8825;

/* TIFF（EXIF 本體）：把找到的種類加進 out；壞資料就停，不丟錯 */
function tiff(b, out) {
  if (b.length < 8) return;
  const le = b.toString("latin1", 0, 2) === "II"; if (!le && b.toString("latin1", 0, 2) !== "MM") return;
  const u16 = (o) => (o + 2 <= b.length ? (le ? b.readUInt16LE(o) : b.readUInt16BE(o)) : -1);
  const u32 = (o) => (o + 4 <= b.length ? (le ? b.readUInt32LE(o) : b.readUInt32BE(o)) : -1);
  if (u16(2) !== 42) return;
  const seen = new Set();
  const ifd = (off, kind) => {
    if (off <= 0 || off >= b.length || seen.has(off)) return; seen.add(off);
    const n = u16(off); if (n < 0 || n > 500) return;
    for (let i = 0; i < n; i++) {
      const e = off + 2 + i * 12, tag = u16(e), val = u32(e + 8); if (tag < 0) return;
      if (kind === "gps") { out.add("gps"); continue }   /* GPS 區有任何一項就算 */
      if (tag === P_EXIF) ifd(val, "exif");
      else if (tag === P_GPS) ifd(val, "gps");
      else if (TAG[tag]) out.add(TAG[tag]);
    }
    if (kind === "ifd0") ifd(u32(off + 2 + n * 12), "ifd0");   /* 下一個 IFD（縮圖）也看 */
  };
  ifd(u32(4), "ifd0");
}
/* XMP（文字）：用屬性或元素名稱判斷 */
function xmp(s, out) {
  if (/GPS(?:Latitude|Longitude)/.test(s)) out.add("gps");
  if (/tiff:(?:Make|Model)\b/.test(s)) out.add("camera");
  if (/(?:CameraOwnerName|BodySerialNumber|LensSerialNumber|SerialNumber|tiff:Artist|dc:creator|dc:rights|photoshop:Credit|xmpRights:Owner|Iptc4xmpCore:CreatorContactInfo)\b/.test(s)) out.add("owner");
}
/* PNG「Raw profile type exif／app1／xmp」：十六進位文字；解開後當 EXIF 或 XMP 看 */
function rawProfile(key, text, out) {
  const hex = String(text).split("\n").slice(3).join("").replace(/[^0-9a-f]/gi, "");
  if (hex.length < 16) return;
  const d = Buffer.from(hex, "hex");
  if (/xmp/i.test(key)) return xmp(d.toString("utf8"), out);
  const i = d.indexOf("Exif\0\0"); tiff(i >= 0 ? d.subarray(i + 6) : d, out);
}
/* 第七輪審查④：壓縮資料不完整時也把解得出來的部分拿回來（Z_SYNC_FLUSH），不整段丟掉 */
/* 第八輪審查①：壓縮資料壞掉（Adler、FCHECK 錯）時不當成空的乾淨圖，丟出 BAD，imageMeta 回 null（讀不懂＝擋） */
const BAD = new Error("壓縮資料壞掉");
/* 第九輪審查③：Apple 的 CgBI PNG 用不帶檔頭的 raw deflate，先照 zlib 解，不行再照 raw deflate 解；兩種都不行才算壞掉 */
const inflate = (d) => { const o = { finishFlush: zlib.constants.Z_SYNC_FLUSH }; try { return zlib.inflateSync(d, o) } catch (e) { try { return zlib.inflateRawSync(d, o) } catch (e2) { throw BAD } } };
/* 第七輪審查②：不管放在哪個區塊、哪一段（JPEG 第一個 SOS 之後、漸進式兩次掃描之間、EOI 之後），整個檔裡找得到的 Exif 與 XMP 都看 */
function anywhere(b, out, texts) {
  for (let i = b.indexOf("Exif\0\0"); i >= 0; i = b.indexOf("Exif\0\0", i + 6)) tiff(b.subarray(i + 6), out);
  /* 第八輪審查③：沒有 Exif 開頭、直接接上的 TIFF（BMP 後面接 TIFF、JPEG／GIF 後面接 PNG eXIf…）也看；開頭 8 位元組是檔案本身，跳過 */
  for (const sig of ["II*\0", "MM\0*"]) for (let i = b.indexOf(sig, 8); i >= 0; i = b.indexOf(sig, i + 4)) tiff(b.subarray(i), out);
  for (let i = b.indexOf("<x:xmpmeta"); i >= 0; i = b.indexOf("<x:xmpmeta", i + 10)) { const e = b.indexOf("</x:xmpmeta>", i), t = b.toString("utf8", i, e > i ? e + 12 : Math.min(b.length, i + 65536)); xmp(t, out); texts.push(t) }
}
/* JPEG APP13（Photoshop 8BIM）裡的 IPTC：1C 02 50＝By-line、1C 02 74＝Copyright、1C 02 76＝Contact */
function iptc(seg, out) { for (let i = 0; i + 3 <= seg.length; i++) if (seg[i] === 0x1c && seg[i + 1] === 0x02 && [0x50, 0x74, 0x76].includes(seg[i + 2])) { out.add("owner"); return } }

/* 回傳 { format, kinds:[…], texts:[…] }；讀不懂的格式（HEIC、AVIF、不是圖片、JPEG 結構壞掉）回 null。
   texts＝圖裡解出來的文字（PNG 文字區、XMP、JPEG／GIF 註解），scan-changed 交給 oss-scan 的規則掃（PR #68 第二輪審查④：Comment 裡寫信箱也要抓到） */
function imageMeta(buf) { try { return imageMeta0(buf) } catch (e) { if (e === BAD) return null; throw e } }
function imageMeta0(buf) {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf), out = new Set(), fmt = sniff(b), texts = [];
  const done = () => { anywhere(b, out, texts); return { format: fmt, kinds: [...out].sort(), texts } };
  if (fmt === "jpeg") {
    /* PR #68 第二輪審查③：標記前可以有任意個填充用的 FF，要跳過；一路要走到 SOS（影像資料開始）才算讀完，走不到＝結構壞掉＝讀不懂 */
    let p = 2, sos = false;
    while (p + 1 < b.length) {
      if (b[p] !== 0xff) return null;
      while (p + 1 < b.length && b[p + 1] === 0xff) p++;
      const m = b[p + 1];
      if (m === 0xda) { sos = true; break }
      if (m === 0xd9) break;
      if (m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { p += 2; continue }   /* 沒有長度的標記 */
      if (p + 4 > b.length) return null;
      const len = b.readUInt16BE(p + 2); if (len < 2 || p + 2 + len > b.length) return null;
      const seg = b.subarray(p + 4, p + 2 + len), head = seg.toString("latin1", 0, 40);
      if (m === 0xe1 && head.startsWith("Exif\0\0")) tiff(seg.subarray(6), out);
      else if (m === 0xe1 && /^http:\/\/ns\.adobe\.com\/xmp\/extension\/|^http:\/\/ns\.adobe\.com\/xap\/1\.0\//.test(head)) { const t = seg.toString("utf8"); xmp(t, out); texts.push(t) }
      else if (m === 0xed) { iptc(seg, out); texts.push(seg.toString("latin1")) }
      else if (m === 0xfe && seg.length) { out.add("comment"); texts.push(seg.toString("utf8")) }
      p += 2 + len;
    }
    if (!sos) return null;
    return done();
  }
  if (fmt === "png") {
    let p = 8, ended = false;
    while (p + 8 <= b.length) {
      const len = b.readUInt32BE(p), type = b.toString("latin1", p + 4, p + 8), d = b.subarray(p + 8, p + 8 + len);
      /* 第五輪審查③：區塊長度超出檔案＝結構壞掉＝讀不懂。第九輪審查③：IEND 之後殘留的舊尾巴（存檔工具留下的）長度對不上就停下來，不算讀不懂；
         停下來的地方之後，整個檔的 Exif／XMP／TIFF 還是會由 anywhere 找 */
      if (p + 12 + len > b.length) { if (ended) break; return null }
      if (type === "IEND") ended = true;
      if (type === "eXIf") tiff(d.toString("latin1", 0, 6) === "Exif\0\0" ? d.subarray(6) : d, out);   /* 第六輪審查④：開頭帶 Exif\0\0 的也認（跟 WebP 一樣） */
      else if (type === "iCCP") { const z = d.indexOf(0), u = inflate(d.subarray(z + 2)); texts.push(u.toString("latin1").replace(/[^\x20-\x7e\n]+/g, " "), u.toString("latin1")) }   /* 第八輪審查②：另外留一份原文，mluc（UTF-16BE）的描述交給 textsOf 的「拿掉 NUL」解碼 */   /* 壓縮的 ICC：解開後的描述文字交給規則掃 */
      else if (type === "tEXt" || type === "zTXt" || type === "iTXt") {
        const z = d.indexOf(0), key = d.toString("latin1", 0, Math.max(0, z));
        let text = "";
        if (type === "tEXt") text = d.subarray(z + 1).toString("latin1");
        else if (type === "zTXt") text = inflate(d.subarray(z + 2)).toString("latin1");
        else { const comp = d[z + 1], r = d.subarray(z + 3); const a = r.indexOf(0), b2 = r.indexOf(0, a + 1); const body = r.subarray(b2 + 1); text = (comp ? inflate(body) : body).toString("utf8") }
        texts.push(key + ": " + text);
        if (/^(?:Author|Copyright|Owner|Artist)$/i.test(key)) out.add("owner");
        if (key === "XML:com.adobe.xmp") xmp(text, out);
        if (/^Raw profile type (?:exif|app1|xmp)$/i.test(key)) rawProfile(key, text, out);
      }
      p += 12 + len;   /* 第五輪審查③：IEND 之後的區塊照樣看（原本遇到 IEND 就停，後面的 zTXt、eXIf 都沒解） */
    }
    return done();
  }
  if (fmt === "webp") {
    /* 第十一輪審查②：只讀到 RIFF 自己記的長度（8＋RIFF 長度）為止；結尾之後多出來的尾巴不算讀不懂（main 版會過），尾巴裡的 Exif／XMP／TIFF 照樣由 anywhere 找 */
    let p = 12; const end = Math.min(b.length, 8 + b.readUInt32LE(4));
    while (p + 8 <= end) {
      const cc = b.toString("latin1", p, p + 4), len = b.readUInt32LE(p + 4), d = b.subarray(p + 8, p + 8 + len);
      if (p + 8 + len > end) return null;   /* 第七輪審查③：區塊長度超出 RIFF＝讀不懂 */
      if (cc === "EXIF") tiff(d.toString("latin1", 0, 6) === "Exif\0\0" ? d.subarray(6) : d, out);
      else if (cc === "XMP ") { xmp(d.toString("utf8"), out); texts.push(d.toString("utf8")) }
      p += 8 + len + (len & 1);
    }
    return done();
  }
  if (fmt === "tiff") { tiff(b, out); xmp(b.toString("latin1"), out); texts.push(b.toString("latin1").replace(/[^\x20-\x7e\n]+/g, " ")); return done() }
  if (fmt === "gif") {
    /* 第十二輪審查①：GIF 要照區塊一路走到結尾（0x3B）才算讀得懂；只有 GIF89a 檔頭、後面是文字的檔＝讀不懂 */
    const ct = (f) => (f & 0x80 ? 3 * (2 << (f & 7)) : 0), subs = (q) => { while (q < b.length && b[q] > 0) q += 1 + b[q]; return q < b.length ? q + 1 : -1 };
    let g = 13 + ct(b[10]), ok = false;
    while (g >= 0 && g < b.length) {
      const c = b[g];
      if (c === 0x3b) { ok = true; break }
      if (c === 0x21) { g = g + 2 > b.length ? -1 : subs(g + 2); continue }
      if (c === 0x2c) { if (g + 11 > b.length) { g = -1; break } g = subs(g + 10 + ct(b[g + 9]) + 1); continue }
      g = -1;
    }
    if (!ok) return null;
    const i = b.indexOf("XMP DataXMP"); if (i >= 0) { const t = b.subarray(i).toString("utf8"); xmp(t, out); texts.push(t) }
    /* 擴充區塊 21 FE（註解）、21 01（純文字）、21 FF（應用程式）：一串子區塊（長度＋內容），長度 0 結束；子區塊接回來（第五輪審查④：原本只接 21 FE，切開放的金鑰會漏） */
    for (const lab of [0xfe, 0x01, 0xff]) for (let j = b.indexOf(Buffer.from([0x21, lab])); j >= 0; j = b.indexOf(Buffer.from([0x21, lab]), j + 2)) {
      let q = j + 2, t = ""; while (q < b.length && b[q] > 0) { t += b.toString("latin1", q + 1, q + 1 + b[q]); q += 1 + b[q] } texts.push(t);
    }
    return done();
  }
  if (fmt === "bmp") { if (b.readUInt32LE(2) !== b.length) return null; return done() }   /* 第十二輪審查①：BMP 檔頭記的檔案大小要跟實際一樣（像素位置在檔裡由 isBmp 檢查，這裡不重複） */
  return null;
}

const KIND_ZH = { gps: "拍攝地點（GPS）", camera: "相機廠牌／型號", owner: "拍攝者／著作權人／相機主人或序號", comment: "JPEG 註解" };
module.exports = { imgFormat, imageMeta, sniff, KIND_ZH };
