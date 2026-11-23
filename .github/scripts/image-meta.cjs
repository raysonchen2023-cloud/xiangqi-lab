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
function sniff(buf) {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf), s = (a, z) => b.toString("latin1", a, z);
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  if (b.length >= 8 && b[0] === 0x89 && s(1, 4) === "PNG") return "png";
  if (b.length >= 12 && s(0, 4) === "RIFF" && s(8, 12) === "WEBP") return "webp";
  if (b.length >= 4 && (s(0, 4) === "II*\0" || s(0, 4) === "MM\0*")) return "tiff";
  if (b.length >= 6 && /^GIF8[79]a$/.test(s(0, 6))) return "gif";
  if (b.length >= 2 && s(0, 2) === "BM") return "bmp";
  if (b.length >= 12 && s(4, 8) === "ftyp") { const brands = s(8, Math.min(b.length, 8 + 64)); if (/avi[fs]/.test(brands)) return "avif"; if (/hei[cfsx]|hev[cx]|mif1|msf1/.test(brands)) return "heif" }
  return null;
}

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
const inflate = (d) => { try { return zlib.inflateSync(d) } catch (e) { return Buffer.alloc(0) } };
/* JPEG APP13（Photoshop 8BIM）裡的 IPTC：1C 02 50＝By-line、1C 02 74＝Copyright、1C 02 76＝Contact */
function iptc(seg, out) { for (let i = 0; i + 3 <= seg.length; i++) if (seg[i] === 0x1c && seg[i + 1] === 0x02 && [0x50, 0x74, 0x76].includes(seg[i + 2])) { out.add("owner"); return } }

/* 回傳 { format, kinds:[…] }；讀不懂的格式（HEIC、AVIF、不是圖片）回 null */
function imageMeta(buf) {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf), out = new Set(), fmt = sniff(b);
  const done = () => ({ format: fmt, kinds: [...out].sort() });
  if (fmt === "jpeg") {
    let p = 2;
    while (p + 4 <= b.length && b[p] === 0xff) {
      const m = b[p + 1]; if (m === 0xda || m === 0xd9) break;
      const len = b.readUInt16BE(p + 2), seg = b.subarray(p + 4, p + 2 + len), head = seg.toString("latin1", 0, 40);
      if (m === 0xe1 && head.startsWith("Exif\0\0")) tiff(seg.subarray(6), out);
      else if (m === 0xe1 && /^http:\/\/ns\.adobe\.com\/xmp\/extension\/|^http:\/\/ns\.adobe\.com\/xap\/1\.0\//.test(head)) xmp(seg.toString("utf8"), out);
      else if (m === 0xed) iptc(seg, out);
      else if (m === 0xfe && seg.length) out.add("comment");
      p += 2 + len;
    }
    return done();
  }
  if (fmt === "png") {
    let p = 8;
    while (p + 12 <= b.length) {
      const len = b.readUInt32BE(p), type = b.toString("latin1", p + 4, p + 8), d = b.subarray(p + 8, p + 8 + len);
      if (type === "eXIf") tiff(d, out);
      else if (type === "tEXt" || type === "zTXt" || type === "iTXt") {
        const z = d.indexOf(0), key = d.toString("latin1", 0, Math.max(0, z));
        let text = "";
        if (type === "tEXt") text = d.subarray(z + 1).toString("latin1");
        else if (type === "zTXt") text = inflate(d.subarray(z + 2)).toString("latin1");
        else { const comp = d[z + 1], r = d.subarray(z + 3); const a = r.indexOf(0), b2 = r.indexOf(0, a + 1); const body = r.subarray(b2 + 1); text = (comp ? inflate(body) : body).toString("utf8") }
        if (/^(?:Author|Copyright|Owner|Artist)$/i.test(key)) out.add("owner");
        if (key === "XML:com.adobe.xmp") xmp(text, out);
        if (/^Raw profile type (?:exif|app1|xmp)$/i.test(key)) rawProfile(key, text, out);
      }
      if (type === "IEND") break;
      p += 12 + len;
    }
    return done();
  }
  if (fmt === "webp") {
    let p = 12;
    while (p + 8 <= b.length) {
      const cc = b.toString("latin1", p, p + 4), len = b.readUInt32LE(p + 4), d = b.subarray(p + 8, p + 8 + len);
      if (cc === "EXIF") tiff(d.toString("latin1", 0, 6) === "Exif\0\0" ? d.subarray(6) : d, out);
      else if (cc === "XMP ") xmp(d.toString("utf8"), out);
      p += 8 + len + (len & 1);
    }
    return done();
  }
  if (fmt === "tiff") { tiff(b, out); xmp(b.toString("latin1"), out); return done() }
  if (fmt === "gif") { const i = b.indexOf("XMP DataXMP"); if (i >= 0) xmp(b.subarray(i).toString("utf8"), out); return done() }
  if (fmt === "bmp") return done();
  return null;
}

const KIND_ZH = { gps: "拍攝地點（GPS）", camera: "相機廠牌／型號", owner: "拍攝者／著作權人／相機主人或序號", comment: "JPEG 註解" };
module.exports = { imageMeta, sniff, KIND_ZH };
