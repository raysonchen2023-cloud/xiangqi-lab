/* ---------- W172 漕運鑰匙開地底迷宮的隱藏密室（11/27 Windows Claude 2）----------
   開發者 11/26 用選單從 Gemini 跨系統文案選中；11/27 選單定規格：
     先做漕船停靠的那幾派（漕運只停徐州、泗州、淮安、揚州四州＝起馬、飛相、中炮、仙人指路），密室放在第二層；
     這次不做「用門派貢獻換鑰匙」，錯過就等下一班（四州輪流，每 8 小時輪回同一州）。
   規則：
     ・漕船停在某州時解開那一班的漕運殘局（07z9b-jianghu.js 的 jhCanalMark），就拿到那一州門派的密室鑰匙。
       只有該派第二層的地圖上真的有密室門 N 才發（還沒做密室的派不發，免得拿到鑰匙卻找不到門）。
     ・N＝密室門（漕幫的銅鎖門）：擋路、擋視線。有鑰匙朝它走就打開（不算回合），之後這一派的密室永久開著，下次進來也是開的。
       沒鑰匙只說「漕船停在哪一州時解題可以拿到鑰匙」。
     ・p＝殘譜架：擋路、不擋視線。朝它走就讀到這一派掌門的私房殘譜（卡片）；第一次讀給修為（去重鍵 vault:<派>），之後照樣讀得到。
     ・鑰匙只開密室：這支只處理 N、p，其他格子（水窪、石門、踏板、各派機關）都交回原本的規則，鑰匙不會讓你跳過任何機關。
   紀錄 jhMzKey（實際鍵 m_jhMzKey，跟著存檔格走）：{派:{got:拿到鑰匙的時間, open:打開密室的時間, read:第一次讀殘譜的時間}}。
   這支排在 m.html 全部 07z9m-* 的最後（07z9m-fall.js 之後），包住四派第二層的 onStep 與共用的 jhMzReset，不改共用的 07z9m-maze.js。 */
const JH_MZ_VAULT_KEY = "jhMzKey", JH_MZ_VAULT_XP = 20, JH_MZ_VAULT_LAYER = 2;
/* 各派的密室：州名（給沒鑰匙時的提示）、殘譜內容。州名照漕運的 JH_CANAL */
const JH_MZ_VAULT = {
  central: { zh: "中炮門", en: "Central Cannon", port: ["淮安", "Huai'an"],
    title: ["淮安碼頭私記・炮要車跟", "Huai'an Dock Notes: The Cannon Needs Its Chariot"],
    body: ["中炮門掌門年輕時在淮安碼頭跟漕幫的船工下棋，回來在小冊子上記了一句：「當頭炮架好以後別急著衝。先看對面的馬出來沒有——馬還沒出，炮可以壓過去；馬出來了，先把車開出來再說。炮後面要有車跟著，才不會被人家的馬一口咬掉。」冊子最後一頁還畫著一艘漕船，船頭插著一面寫了「炮」字的小旗。",
      "When the Central Cannon master was young, he played the boatmen on the Huai'an docks, and wrote one line in a little notebook: \"Once the central cannon is set, don't rush. See whether the other side's horses are out. If not, the cannon can press forward; if they are, bring out your chariot first. A cannon needs a chariot behind it, or a horse will snap it up.\" On the last page is a sketch of a grain barge flying a small flag marked \"Cannon\"."] },
  elephant: { zh: "飛相門", en: "Flying Elephant", port: ["泗州", "Sizhou"],
    title: ["泗州茶棚私記・先守後攻", "Sizhou Teahouse Notes: Defend First, Then Strike"],
    body: ["飛相門掌門當年在泗州考場外的茶棚，看幾個落第的老考生下棋，悟出一句話，寫在帳本背面：「先把相飛起來，把中路守住，不急著出手。等人家把子一顆一顆壓過河，再用車馬從兩邊包回去。守得住，才有本錢反攻。」字跡旁邊有一圈茶漬，看得出是邊喝茶邊寫的。",
      "Years ago, outside the Sizhou exam hall, the Flying Elephant master watched a few failed old candidates play in a tea stall, and wrote one line on the back of a ledger: \"Fly the elephant first and hold the centre; don't rush. Let them push their pieces across the river one by one, then swing your chariots and horses round both flanks. Only if you can hold do you have anything to counterattack with.\" A ring of tea stain sits beside the writing."] },
};
/* 紀錄：{派:{got,open,read}} */
function jhMzVaultGet() { let o = null; try { o = store.get(JH_MZ_VAULT_KEY, null) } catch (e) { } return o && typeof o === "object" && !Array.isArray(o) ? o : {} }
function jhMzVaultOf(sid) { const o = jhMzVaultGet()[sid]; return o && typeof o === "object" ? o : {} }
function jhMzVaultSet(sid, k) { const all = jhMzVaultGet(), m = jhMzVaultOf(sid); if (!m[k]) m[k] = Date.now(); all[sid] = m; try { store.set(JH_MZ_VAULT_KEY, all) } catch (e) { } return m }
/* 這一派第二層的地圖上有沒有密室門（沒有就不發鑰匙） */
function jhMzVaultHas(sid) { const B = typeof JH_MZ_LV === "object" && JH_MZ_LV[sid], L = B && B.layers && B.layers[JH_MZ_VAULT_LAYER]; return !!(JH_MZ_VAULT[sid] && L && Array.isArray(L.map) && L.map.some((r) => String(r).includes("N"))) }
/* 漕運解題時呼叫：這一派有密室、還沒拿過鑰匙、密室也還沒開，就發一把；回傳要顯示的派名，沒發回 null */
function jhMzVaultGive(sid) { if (!jhMzVaultHas(sid)) return null; const m = jhMzVaultOf(sid); if (m.got || m.open) return null; jhMzVaultSet(sid, "got"); const V = JH_MZ_VAULT[sid]; return { zh: V.zh, en: V.en } }
/* 這一層是不是有密室的那一層 */
const jhMzVaultLv = (lv) => !!(lv && JH_MZ_VAULT[lv.sid] && lv.layer === JH_MZ_VAULT_LAYER);
/* 走一步之前：N、p 照密室規則；其他交給原本的 onStep（碑刻、暗門、各派機關） */
function jhMzVaultStep(S, dx, dy, c, prev) {
  const nx = S.player.x + dx, ny = S.player.y + dy, V = JH_MZ_VAULT[S.lv.sid];
  if (V && c === "N") {
    const m = jhMzVaultOf(S.lv.sid);
    /* ev 不用 "locked"：共用畫面遇到 locked 會改顯示石門那句固定的提示，蓋掉這裡的州名 */
    if (!m.got && !m.open) return { ev: "bump", msg: [`門上掛著一把漕幫的銅鎖，鎖孔還很新。漕船停在${V.port[0]}的時候，解開那一班的漕運殘局，就能拿到鑰匙。`, `A canal guild's brass lock hangs on the door. Solve the canal puzzle when the barge is docked at ${V.port[1]} to get the key.`] };
    jhMzVaultSet(S.lv.sid, "open"); S.grid[ny][nx] = ".";
    return { ev: "secret", msg: ["你用漕幫給的鑰匙打開銅鎖，門後是一間小小的密室。", "You open the brass lock with the canal guild's key. Behind the door is a small hidden room."] };
  }
  if (V && c === "p") {
    const first = !jhMzVaultOf(S.lv.sid).read;
    if (first) { jhMzVaultSet(S.lv.sid, "read"); if (typeof addXP === "function") try { addXP(JH_MZ_VAULT_XP, jhL("迷宮密室", "Hidden room"), "vault:" + S.lv.sid) } catch (e) { } }
    return { ev: "lore", id: "vault:" + S.lv.sid, first, card: { title: [`殘譜・${V.title[0]}`, `Manual fragment · ${V.title[1]}`], body: V.body },
      msg: first ? [`收好了。修為 +${JH_MZ_VAULT_XP}`, `Kept. +${JH_MZ_VAULT_XP} XP`] : null };
  }
  return typeof prev === "function" ? prev(S, dx, dy, c) : null;
}
/* 包住有密室的那一層：N、p 擋路；N 擋視線，p 不擋（架子不高） */
function jhMzVaultWrap(lv) {
  if (!jhMzVaultLv(lv) || lv._vault) return; const prev = lv.onStep;
  for (const ch of "Np") if (!lv.solid.includes(ch)) lv.solid += ch;
  if (!lv.opaque.includes("N")) lv.opaque += "N";
  lv.onStep = (S, dx, dy, c) => jhMzVaultStep(S, dx, dy, c, prev); lv._vault = 1;
}
for (const sid of Object.keys(JH_MZ_VAULT)) { const B = typeof JH_MZ_LV === "object" && JH_MZ_LV[sid]; if (B && B.layers) jhMzVaultWrap(B.layers[JH_MZ_VAULT_LAYER]) }
/* 重建格子（新開局、被拖回入口）時，已經打開的密室維持打開 */
try {
  if (typeof jhMzReset === "function" && !jhMzReset.vault) {
    const r0 = jhMzReset;
    jhMzReset = function (S, full) { const v = r0(S, full); if (S && S.lv && jhMzVaultLv(S.lv) && jhMzVaultOf(S.lv.sid).open) for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) if (S.grid[y][x] === "N") S.grid[y][x] = "."; return v };
    jhMzReset.vault = 1;
  }
} catch (e) { }
/* 3D：銅鎖木門（跟牆一樣高，門上一塊銅鎖）；殘譜架是一張矮几上放一卷書 */
JH_MZ_OBJ.N = (H) => { const { T3, mesh, lam, WH } = H, g = new T3.Group(); g.add(mesh(new T3.BoxGeometry(1, WH, 1), lam("#5a3b22"), 0, WH / 2, 0));
  g.add(mesh(new T3.BoxGeometry(.2, .22, .06), lam("#c79a3c"), 0, WH * .5, .52)); return g };
JH_MZ_OBJ.p = (H) => { const { T3, mesh, lam } = H, g = new T3.Group(); g.add(mesh(new T3.BoxGeometry(.6, .06, .4), lam("#6b4a2e"), 0, .34, 0));
  for (const [x, z] of [[-.26, -.16], [.26, -.16], [-.26, .16], [.26, .16]]) g.add(mesh(new T3.BoxGeometry(.05, .32, .05), lam("#4e3520"), x, .16, z));
  g.add(mesh(new T3.CylinderGeometry(.06, .06, .42, 10), lam("#e6d7b0"), 0, .43, 0)); g.children[g.children.length - 1].rotation.z = Math.PI / 2; return g };
/* 平面版 */
JH_MZ_TILE.N = (cx, px, py, T) => { cx.fillStyle = "#5a3b22"; cx.fillRect(px, py, T, T); cx.strokeStyle = "rgba(0,0,0,.4)"; cx.lineWidth = 1; cx.strokeRect(px + T * .12, py + T * .08, T * .76, T * .84);
  cx.fillStyle = "#c79a3c"; cx.fillRect(px + T * .42, py + T * .42, T * .16, T * .2) };
JH_MZ_TILE.p = (cx, px, py, T) => { cx.fillStyle = "rgba(0,0,0,.3)"; cx.beginPath(); cx.ellipse(px + T * .5, py + T * .84, T * .32, T * .08, 0, 0, 7); cx.fill();
  cx.fillStyle = "#6b4a2e"; cx.fillRect(px + T * .2, py + T * .46, T * .6, T * .12); cx.fillRect(px + T * .24, py + T * .58, T * .06, T * .24); cx.fillRect(px + T * .7, py + T * .58, T * .06, T * .24);
  cx.fillStyle = "#e6d7b0"; cx.fillRect(px + T * .28, py + T * .34, T * .44, T * .12); cx.strokeStyle = "#8a7550"; cx.strokeRect(px + T * .28, py + T * .34, T * .44, T * .12) };
