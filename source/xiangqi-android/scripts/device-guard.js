// 象棋千秋 Android：測試工具只准在模擬器上跑（W41，2026-11-21 PR #12 審查）
// Copyright (c) 2026 陳泓昇 (Chen Hung-Sheng)．SPDX-License-Identifier: GPL-3.0-or-later
//
// check-upgrade.js 會解除安裝 App（刪掉存檔），check-scenes.js 還會切飛航模式。指到玩家或開發者自己的手機，資料就沒了。
// 所以預設只在模擬器上執行；真的要在實體手機上跑，要加 --allow-wipe-device，並在開頭印出警告。
// 判斷：模擬器的 ro.kernel.qemu 或 ro.boot.qemu 是 1，或硬體名稱是 ranchu／goldfish。
"use strict";
const isEmulatorProps = p => p["ro.kernel.qemu"] === "1" || p["ro.boot.qemu"] === "1" || /^(ranchu|goldfish)$/.test(p["ro.hardware"] || "");

/* adb(...args) 回傳字串；allow＝有沒有加 --allow-wipe-device。回傳 { ok, emulator, message } */
function checkDevice(adb, allow) {
  const p = {};
  for (const k of ["ro.kernel.qemu", "ro.boot.qemu", "ro.hardware"]) { try { p[k] = String(adb("shell", "getprop", k)).trim() } catch (e) { p[k] = "" } }
  const emulator = isEmulatorProps(p);
  if (emulator) return { ok: true, emulator, message: "" };
  if (!allow) return { ok: false, emulator, message: "這台不是模擬器：測試會解除安裝 App（刪掉存檔）並切飛航模式。真的要在實體手機上跑，請加 --allow-wipe-device" };
  return { ok: true, emulator, message: "⚠ 警告：這是實體手機，測試會解除安裝 App、刪掉上面的存檔，並切換飛航模式（加了 --allow-wipe-device）" };
}
module.exports = { isEmulatorProps, checkDevice };
