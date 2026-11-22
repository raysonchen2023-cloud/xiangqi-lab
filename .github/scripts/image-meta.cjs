// 象棋千秋 CI：圖片裡會洩漏個資的中繼資料（W69 流程盤點中 16「私密掃描在 CI 偏弱」，2026-11-23）
// Copyright (c) 2026 陳泓昇 (Chen Hung-Sheng)．SPDX-License-Identifier: GPL-3.0-or-later
//
// 為什麼：oss-scan 只看文字檔，圖片整個略過。用手機或相機拍、再放進倉庫的圖，EXIF 裡可能有拍攝地點（GPS）、
//   相機型號與序號、拍攝者姓名；公開倉庫一推上去就外洩。
// 看什麼（只回報「有哪一種」，不回報值本身）：
//   gps＝拍攝地點；camera＝相機廠牌／型號；owner＝拍攝者、著作權人、相機主人姓名、機身／鏡頭序號
// 支援 JPEG（APP1 Exif、XMP）、PNG（eXIf、XMP 文字區塊、Author／Copyright 文字）、WebP（EXIF、XMP 區塊）。
//   其他格式回 null（讀不懂，不當作乾淨）。純函式、不讀檔，給 scan-changed.cjs 用、test-guard-scan.cjs 測。
"use strict";

const TAG = { 0x010f: "camera", 0x0110: "camera", 0x013b: "owner", 0x8298: "owner", 0xa430: "owner", 0xa431: "owner", 0xa435: "owner" };
const P_EXIF = 0x8769, P_GPS = 0x8825;

/* TIFF（EXIF 本體）：回傳找到的種類集合；壞資料就停，不丟錯 */
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
  };
  ifd(u32(4), "ifd0");
}
/* XMP（文字）：用屬性或元素名稱判斷 */
function xmp(s, out) {
  if (/exif:GPS(?:Latitude|Longitude)|GPSLatitude|GPSLongitude/.test(s)) out.add("gps");
  if (/tiff:(?:Make|Model)\b/.test(s)) out.add("camera");
  if (/exif(?:EX)?:(?:CameraOwnerName|BodySerialNumber|LensSerialNumber)|aux:SerialNumber|tiff:Artist|photoshop:AuthorsPosition/.test(s)) out.add("owner");
}

/* 回傳 { format, kinds:[…] }；看不懂的格式回 null */
function imageMeta(buf) {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf), out = new Set();
  if (b.length >= 4 && b[0] === 0xff && b[1] === 0xd8) {
    let p = 2;
    while (p + 4 <= b.length && b[p] === 0xff) {
      const m = b[p + 1]; if (m === 0xda || m === 0xd9) break;
      const len = b.readUInt16BE(p + 2), seg = b.subarray(p + 4, p + 2 + len);
      if (m === 0xe1 && seg.toString("latin1", 0, 6) === "Exif\0\0") tiff(seg.subarray(6), out);
      else if (m === 0xe1 && /^http:\/\/ns\.adobe\.com\/xap\/1\.0\//.test(seg.toString("latin1", 0, 40))) xmp(seg.toString("utf8"), out);
      p += 2 + len;
    }
    return { format: "jpeg", kinds: [...out].sort() };
  }
  if (b.length >= 8 && b.toString("latin1", 1, 4) === "PNG") {
    let p = 8;
    while (p + 12 <= b.length) {
      const len = b.readUInt32BE(p), type = b.toString("latin1", p + 4, p + 8), d = b.subarray(p + 8, p + 8 + len);
      if (type === "eXIf") tiff(d, out);
      else if (type === "iTXt" || type === "tEXt" || type === "zTXt") {
        const key = d.toString("latin1", 0, Math.max(0, d.indexOf(0)));
        if (/^(?:Author|Copyright)$/i.test(key)) out.add("owner");
        if (key === "XML:com.adobe.xmp") xmp(d.toString("utf8"), out);
      }
      if (type === "IEND") break;
      p += 12 + len;
    }
    return { format: "png", kinds: [...out].sort() };
  }
  if (b.length >= 12 && b.toString("latin1", 0, 4) === "RIFF" && b.toString("latin1", 8, 12) === "WEBP") {
    let p = 12;
    while (p + 8 <= b.length) {
      const cc = b.toString("latin1", p, p + 4), len = b.readUInt32LE(p + 4), d = b.subarray(p + 8, p + 8 + len);
      if (cc === "EXIF") tiff(d.toString("latin1", 0, 6) === "Exif\0\0" ? d.subarray(6) : d, out);
      else if (cc === "XMP ") xmp(d.toString("utf8"), out);
      p += 8 + len + (len & 1);
    }
    return { format: "webp", kinds: [...out].sort() };
  }
  return null;
}

const KIND_ZH = { gps: "拍攝地點（GPS）", camera: "相機廠牌／型號", owner: "拍攝者／著作權人／相機主人或序號" };
module.exports = { imageMeta, KIND_ZH };
