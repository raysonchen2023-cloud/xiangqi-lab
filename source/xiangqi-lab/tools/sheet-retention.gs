// 象棋千秋：意見回饋試算表的資料保留期限自動清理（開發者 11/11 核准；貼上步驟見 xiangqi-db/story/91_資料保留期限與清理.md）
// 開發者自己貼進「象棋千秋 意見回饋 (回覆)」試算表的 Apps Script（擴充功能 → Apps Script → 新增一個檔案 sheet-retention），設每日觸發。
// 這支程式裡的名字都用 RET_ / ret 開頭，跟同一個專案裡的 feedback-api.gs（意見回饋管理頁）不會撞名。
//
// 期限（跟 App 設定 → 隱私、data/docs/privacy.md 寫的一樣）：
//   意見回饋（含 💬 Claude 對話、🧪 測試、🗑 刪除請求）：處理完後 1 年
//   🚩 檢舉：處理完後 1 年；被檢舉的人還在停權名單（banlist.json）上就一直留著，停權解除後再算 1 年（從處理完那天算，已經超過就下次清）
//   👤 玩家登記（含「🌐 大廳上線」）：同一個線上 ID 最後一次登記後 1 年，整個 ID 的登記列一起清
//   「處理完」＝「已修復」打勾，或「開發者決定」是「不處理」。還沒處理的回饋、檢舉一律不清。
//   處理完那天：「處理說明」開頭有版本號（20261111-1530：…）就用那天；沒有就由這支程式第一次看到它處理完的那天，記在最後面的「處理完成日」欄（沒有這欄會自動加）。
//
// 怎麼清：預設 RET_APPLY = false，只把要清的列複製到「待刪預覽」分頁（第一欄是原本的列號、第二欄是原因），不動原本的資料。
//   確認預覽沒問題，把 RET_APPLY 改成 true 再存檔，下次觸發（或手動執行 retentionDaily）才真的清。
//   真的清＝把那一列的內容整列清空（不是刪掉那一列）：fixes.json 的修正紀錄、手機的「看過的修正」、管理頁的「第 N 列」、核准通知都用列號認人，
//   刪列會讓下面每一列的列號往上挪、手機會把舊的修正當成新的再跳一次。整列空白的列管理頁會算成「整列空白」，不影響其他功能。
//   預覽模式也會在「處理完成日」欄補日期（只是記日期，不刪任何東西），不然期限沒有起算點。
//
// 刪除請求（App 設定 → 隱私「🗑 申請刪除我在伺服器上的資料」送來的「🗑 刪除請求」列，內容有 [D-月日-四碼] 和裝置代號）：
//   1. 把 RET_DEVICE_ID 填成內容裡的裝置代號（試算表「線上ID」欄也是它），執行 retentionDeleteDevice：先只列到「待刪預覽」分頁。
//   2. 看過沒問題，把 RET_APPLY 改成 true，再執行一次 retentionDeleteDevice：清掉這個裝置代號送過的意見回饋、檢舉、玩家登記；
//      「🗑 刪除請求」那一列本身留著（打勾「已修復」、處理說明寫清了幾列），當處理紀錄，處理完 1 年後照上面的規則清。
//   3. 別人檢舉這個人的列（內容裡「對方 ID：…」是他）不在這裡清：那是別人送的資料、停權要用，照檢舉的期限處理。
//   4. 線上大廳的戰績摘要和棋譜在電腦上清：node xiangqi-lab/tools/mqtt-prune.js --id <裝置代號>（先看列表），再加 --apply。
//   5. 做完把 RET_DEVICE_ID 改回空字串、RET_APPLY 改回原本的設定。承諾 30 天內處理。

const RET_APPLY = false;          // false＝只預覽；true＝真的清（整列清空）
const RET_DAYS = 365;             // 處理完後／最後一次登記後保留幾天
const RET_PREVIEW = '待刪預覽';
const RET_DONE_COL = '處理完成日';
const RET_BANLIST_URL = 'https://raysonchen2023-cloud.github.io/xiangqi-lab/data/banlist.json';
const RET_DEVICE_ID = '';         // 刪除請求：填裝置代號後執行 retentionDeleteDevice

function retSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheets().find(s => s.getRange(1, 1).getValue() === '時間戳記') || ss.getSheets()[0];
}
function retDate_(v) { if (v instanceof Date && !isNaN(v)) return v; const d = v ? new Date(v) : null; return d && !isNaN(d) ? d : null }
// 處理說明開頭的版本號 20261111-1530 → 那天
function retNoteDate_(note) { const m = String(note || '').match(/^(?:進度\s*)?(\d{4})(\d\d)(\d\d)-\d{4}/); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null }
function retFmt_(d) { return Utilities.formatDate(d, 'Asia/Taipei', 'yyyy/MM/dd HH:mm') }
// 停權名單（公開的 banlist.json）：拿不到回 null，這時檢舉一律不清
function retBanned_() {
  try { const r = UrlFetchApp.fetch(RET_BANLIST_URL + '?t=' + Date.now(), { muteHttpExceptions: true }); if (r.getResponseCode() !== 200) return null;
    const j = JSON.parse(r.getContentText()); return j && j.ids && typeof j.ids === 'object' ? j.ids : null } catch (e) { return null }
}
// 讀整張表＋欄位位置（用標題找，不寫死欄號）；沒有「處理完成日」欄就加在最後面
function retLoad_() {
  const sh = retSheet_(); let data = sh.getDataRange().getValues(); const H = data[0].map(String);
  if (H.indexOf(RET_DONE_COL) < 0) { sh.getRange(1, H.length + 1).setValue(RET_DONE_COL); data = sh.getDataRange().getValues(); }
  const H2 = data[0].map(String), ix = k => H2.indexOf(k);
  const C = { ts: ix('時間戳記'), type: ix('類型'), text: ix('內容'), id: ix('線上ID'), fixed: ix('已修復'), note: ix('處理說明'), dec: ix('開發者決定'), done: ix(RET_DONE_COL) };
  if (C.ts < 0 || C.type < 0) throw new Error('找不到「時間戳記」「類型」欄，是不是貼錯試算表？');
  return { sh, data, H: H2, C };
}
const retProcessed_ = (v, C) => (C.fixed >= 0 && v[C.fixed] === true) || (C.dec >= 0 && String(v[C.dec]) === '不處理');
const retBlank_ = (v, C) => !v[C.ts] && !String(v[C.type] || '');

// 補「處理完成日」：處理完、還沒有日期的列，填處理說明版本號那天，沒有就填今天。回傳改了幾列
function retStamp_(L, now) {
  const { sh, data, C } = L, col = [], changed = [];
  for (let r = 1; r < data.length; r++) {
    const v = data[r]; let d = retDate_(v[C.done]);
    if (!d && !retBlank_(v, C) && retProcessed_(v, C)) { d = (C.note >= 0 && retNoteDate_(v[C.note])) || now; v[C.done] = d; changed.push(r) }
    col.push([v[C.done] === undefined ? '' : v[C.done]]);
  }
  if (changed.length && col.length) sh.getRange(2, C.done + 1, col.length, 1).setValues(col);
  return changed.length;
}

// 判斷每一列要不要清，回傳 [{r（0 起算的資料列）, why}]
function retPlan_(L, now, banned) {
  const { data, C } = L, out = [], cut = now.getTime() - RET_DAYS * 864e5, lastReg = {};
  const isReg = v => /玩家/.test(String(v[C.type] || ''));
  for (let r = 1; r < data.length; r++) { const v = data[r]; if (!isReg(v)) continue; const id = C.id >= 0 ? String(v[C.id] || '').trim() : '', t = retDate_(v[C.ts]);
    if (id && t) lastReg[id] = Math.max(lastReg[id] || 0, t.getTime()); }
  for (let r = 1; r < data.length; r++) {
    const v = data[r]; if (retBlank_(v, C)) continue;
    const type = String(v[C.type] || ''), id = C.id >= 0 ? String(v[C.id] || '').trim() : '';
    if (isReg(v)) {
      const t = id && lastReg[id] ? lastReg[id] : (retDate_(v[C.ts]) || now).getTime();
      if (t < cut) out.push({ r, why: '玩家登記：' + (id ? '這個 ID ' : '') + '最後一次登記 ' + retFmt_(new Date(t)) + '，超過 ' + RET_DAYS + ' 天' });
      continue;
    }
    if (!retProcessed_(v, C)) continue;
    const done = retDate_(v[C.done]); if (!done || done.getTime() >= cut) continue;
    if (/檢舉/.test(type)) {
      if (!banned) continue;
      const m = String(v[C.text] || '').match(/對方 ID：\s*([A-Za-z0-9_-]{3,40})/);
      if (m && banned[m[1]]) continue;
      out.push({ r, why: '檢舉：' + retFmt_(done) + ' 處理完，超過 ' + RET_DAYS + ' 天' + (m ? '，對方 ' + m[1] + ' 不在停權名單' : '') });
      continue;
    }
    out.push({ r, why: (type || '回饋') + '：' + retFmt_(done) + ' 處理完，超過 ' + RET_DAYS + ' 天' });
  }
  return out;
}

// 寫「待刪預覽」分頁：第一欄原列號、第二欄原因，後面是原本整列
function retPreview_(L, plan, title) {
  const ss = SpreadsheetApp.getActiveSpreadsheet(); let pv = ss.getSheetByName(RET_PREVIEW); if (!pv) pv = ss.insertSheet(RET_PREVIEW); pv.clear();
  const head = ['原列號', '原因（' + title + '）'].concat(L.H), rows = plan.map(p => [p.r + 1, p.why].concat(L.data[p.r].map(x => typeof x === 'string' && x.length > 49000 ? x.slice(0, 49000) : x)));
  pv.getRange(1, 1, 1, head.length).setValues([head]);
  if (rows.length) pv.getRange(2, 1, rows.length, head.length).setValues(rows);
}
// 真的清：整列清空（列號不動，理由見最上面）
function retClear_(L, plan) { for (const p of plan) L.sh.getRange(p.r + 1, 1, 1, L.H.length).clearContent(); }

// 每天跑這個（retentionInstallTrigger 會幫你設好每天凌晨 4 點）
function retentionDaily() {
  const now = new Date(), L = retLoad_(), st = retStamp_(L, now), banned = retBanned_(), plan = retPlan_(L, now, banned);
  const title = retFmt_(now) + (RET_APPLY ? ' 已清空這些列' : ' 預覽，還沒清') + (banned ? '' : '；停權名單讀不到，檢舉這次都沒清');
  retPreview_(L, plan, title);
  if (RET_APPLY) retClear_(L, plan);
  console.log('補處理完成日 ' + st + ' 列；' + (RET_APPLY ? '清空 ' : '預覽 ') + plan.length + ' 列' + (banned ? '' : '（停權名單讀不到，檢舉沒清）'));
  return plan.length;
}

// 刪除請求：清這個裝置代號送過的每一列（「🗑 刪除請求」那一列留著當紀錄）
function retentionDeleteDevice() {
  const id = String(RET_DEVICE_ID || '').trim(); if (!/^[A-Za-z0-9_-]{3,40}$/.test(id)) throw new Error('先把 RET_DEVICE_ID 填成刪除請求裡的裝置代號');
  const now = new Date(), L = retLoad_(), { data, C } = L, plan = [], reqs = [];
  if (C.id < 0) throw new Error('找不到「線上ID」欄');
  for (let r = 1; r < data.length; r++) { const v = data[r]; if (retBlank_(v, C) || String(v[C.id] || '').trim() !== id) continue;
    if (/刪除請求/.test(String(v[C.type] || ''))) { reqs.push(r); continue }
    plan.push({ r, why: '刪除請求：裝置代號 ' + id + ' 送的' + (String(v[C.type] || '') || '資料') }); }
  retPreview_(L, plan, retFmt_(now) + (RET_APPLY ? ' 已清空' : ' 預覽，還沒清') + '：裝置代號 ' + id + ' 的 ' + plan.length + ' 列');
  if (RET_APPLY) {
    retClear_(L, plan);
    const ver = Utilities.formatDate(now, 'Asia/Taipei', 'yyyyMMdd-HHmm');
    for (const r of reqs) {
      if (C.fixed >= 0) L.sh.getRange(r + 1, C.fixed + 1).setValue(true);
      if (C.note >= 0) L.sh.getRange(r + 1, C.note + 1).setValue(ver + '：已清空這個裝置代號送過的 ' + plan.length + ' 列（意見回饋、檢舉、玩家登記）');
      L.sh.getRange(r + 1, C.done + 1).setValue(now);
    }
  }
  console.log((RET_APPLY ? '清空 ' : '預覽 ') + plan.length + ' 列；刪除請求紀錄 ' + reqs.length + ' 列' + (RET_APPLY ? '已標成處理完' : ''));
  return plan.length;
}

// 設每天凌晨 4 點跑 retentionDaily（重複執行只會留一個）
function retentionInstallTrigger() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'retentionDaily').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('retentionDaily').timeBased().everyDays(1).atHour(4).inTimezone('Asia/Taipei').create();
  console.log('已設定每天凌晨 4 點執行 retentionDaily');
}
