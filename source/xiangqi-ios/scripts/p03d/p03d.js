#!/usr/bin/env node
/* p03d.js：iOS 版 P0-3D 自動驗收（照 Windows Claude 2 的 Android 做法改成 iOS）
   - 進場、讀狀態、算落點：用 wir.js 經 Web Inspector 在 App 的 WebView 執行 JS（不改 App，不需要鉤子）
   - 點擊：XCUITest（P03D 專案）真實觸控，不用 JS 合成點擊
   - 通過條件：每個情境紅黑各走一步（車輪戰每桌一步），點完 6 秒內棋譜多出 f、t 相符的那一步
   用法：node p03d.js [情境…]   情境：cpu inn pvp simul bhx-front bhx-back siege-top siege-iso（不給就全跑）
   環境變數：P03D_UDID（模擬器）、P03D_OUT（證據資料夾，預設目前目錄的 output/p03d-<時間>）、P03D_FAULT=cover（反測：模擬 W02 落點被按鈕蓋住，必須失敗）
   前提：模擬器上已裝好要驗的 App 並開著（fresh-app.sh ＋ simctl launch）；P03D 專案已 build-for-testing。
   注意：進場用 JS 開局，會改到存檔；跑完要 simctl erase 或寫明（見 memory：捷徑測試後抹掉模擬器）。 */
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process");
const { evaluate } = require("./wir.js");
const HERE = __dirname, DD = process.env.P03D_DD || path.join(HERE, "dd");   /* XCUITest 的建置資料夾（p0-3d.sh 放在暫存目錄，不進倉庫） */
const UDID = process.env.P03D_UDID; if (!UDID) { console.error("✘ 要給 P03D_UDID（正式跑請用 p0-3d.sh）"); process.exit(2); }
const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(4, 13).replace("T", "-");
const OUT = process.env.P03D_OUT || path.join(process.cwd(), "output/p03d-" + stamp);
const CMD = path.join(OUT, "cmd"); fs.mkdirSync(CMD, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => { const s = a.join(" "); console.log(s); fs.appendFileSync(path.join(OUT, "log.txt"), s + "\n"); };
const js = (expr, t) => evaluate(expr, { timeout: t || 30000 });
const jsj = async (expr, t) => { const v = await js("(async()=>JSON.stringify(await (async()=>{" + expr + "})()))()", t); return v === undefined ? undefined : JSON.parse(v); };

/* ---------- XCUITest 觸控伺服 ---------- */
let server = null, cmdN = 0;
function startServer() {
  const xr = fs.readdirSync(path.join(DD, "Build/Products")).find((f) => f.endsWith(".xctestrun"));
  if (!xr) throw new Error("先 build-for-testing P03D 專案");
  const env = Object.assign({}, process.env, { TEST_RUNNER_P03D_DIR: CMD, TEST_RUNNER_P03D_IDLE: "900" });
  server = cp.spawn("xcodebuild", ["test-without-building", "-xctestrun", path.join(DD, "Build/Products", xr), "-destination", "platform=iOS Simulator,id=" + UDID, "-only-testing:P03DUITests/P03DUITests/testServe"], { env, stdio: ["ignore", fs.openSync(path.join(OUT, "xcuitest.log"), "w"), "inherit"] });
}
async function waitServer() { for (let i = 0; i < 240; i++) { if (fs.existsSync(path.join(CMD, "served.txt"))) return; await sleep(500); } throw new Error("XCUITest 伺服沒起來，見 xcuitest.log"); }
async function touch(cmds) {
  cmdN++; const f = path.join(CMD, "cmd-" + cmdN + ".json"), d = path.join(CMD, "done-" + cmdN + ".txt");
  fs.writeFileSync(f + ".tmp", JSON.stringify(cmds)); fs.renameSync(f + ".tmp", f);
  for (let i = 0; i < 200; i++) { if (fs.existsSync(d)) return fs.readFileSync(d, "utf8"); await sleep(150); }
  throw new Error("觸控沒完成：" + f);
}
async function stopServer() { if (!server) return; try { await touch([{ op: "quit" }]); } catch (e) {} try { server.kill(); } catch (e) {} }
function shot(name) { try { cp.execSync(`xcrun simctl io ${UDID} screenshot "${path.join(OUT, name)}.png"`, { stdio: "ignore" }); } catch (e) {} }

/* ---------- App 裡的共用 JS ---------- */
const PRE = `localStorage.setItem("xq_netRoot","xq_test");store.set("park3d",true);store.set("parkView","topfit");store.set("autoFlip",true);store.set("focusBoard",false);
  (window.__p03dRm=window.__p03dRm||[]);document.querySelectorAll("#tCont,.modal,#preov").forEach(e=>{try{window.__p03dRm.push("前置："+e.tagName+(e.id?"#"+e.id:"")+"."+String(e.className).slice(0,30)+"「"+e.textContent.trim().slice(0,24)+"」");e.remove()}catch(x){}});`;
/* 就緒：3D 棋盤在、沒有開場動畫或遮罩 */
const READY = `(()=>{try{return !!(PARK&&PARK.last&&PARK.v&&PARK.v.el&&PARK.v.el.isConnected&&PARK.v.el.getBoundingClientRect().width>0&&!pkGateEat()&&!document.querySelector("#pgate:not(.out),#preov:not(.out),.scrim.show"))}catch(e){return false}})()`;
async function waitReady(extra, ms) {
  const cond = extra ? `(${READY})&&(()=>{try{return !!(${extra})}catch(e){return false}})()` : READY;
  for (let i = 0; i < (ms || 60000) / 500; i++) {
    /* 上一盤的結算視窗可能晚幾秒才跳出來，蓋住新的一盤：就緒前一律清掉（Android 腳本的前置也是關 .modal） */
    await js(`(()=>{(window.__p03dRm=window.__p03dRm||[]);document.querySelectorAll("#p03dFault").forEach(e=>e.remove());document.querySelectorAll(".modal").forEach(e=>{try{window.__p03dRm.push("就緒前：."+String(e.className).slice(0,30)+"「"+e.textContent.trim().slice(0,24)+"」");e.remove()}catch(x){}});return 1})()`).catch(() => {});
    if (await js(cond).catch(() => false)) { await sleep(2500); if (await js(cond).catch(() => false)) return true; }
    await sleep(500);
  }
  throw new Error("等不到就緒：" + (extra || "3D 棋盤"));
}

/* 讀著法清單：各模式的 state API */
const ST = { cpu: `await api("/play/state")`, pvp: `await api("/pvp/state")`, simul: `(await api("/simul/state")).tb[TB]` };
const MOVES = ST;   /* oneMove 收的是「讀狀態」的運算式；狀態裡有 legal、board、moves */

/* 挑一步：輪到的那方、目標格空、起訖都在安全區；回傳 {f,t,fx,fy,tx,ty}（CSS 像素＝iOS point，WebView 從 (0,0) 起） */
const PICK = (stExpr, prefer, seed) => `const SEED=${seed || 0};const PREF=${JSON.stringify(prefer || [])};const S=${stExpr},b=S.board||PARK.last.board||[],W=innerWidth,H=innerHeight;
  const lg=S.legal||[];const safe=p=>p&&p.x>30&&p.x<W-30&&p.y>160&&p.y<H-140;
  const BP=i=>{const a0=PARK.v.screenOf(i),hd=PARK.v.headOf?PARK.v.headOf(i):null;return a0&&hd&&Math.hypot(hd.x-a0.x,hd.y-a0.y)>4?{x:a0.x+(hd.x-a0.x)*.45,y:a0.y+(hd.y-a0.y)*.45}:a0};
  /* 起點要「點得開」：跟其他棋子的點擊位置至少隔 34 點（背面、斜視時前排棋子會擋住後排，點下去會吸到別顆或判成太近） */
  const occ=[];for(let i=0;i<90;i++)if(b[i]){const p=BP(i);if(p)occ.push([i,p])}
  const iso=(f,a)=>occ.every(([i,p])=>i===f||Math.hypot(p.x-a.x,p.y-a.y)>=34);
  const out=[];for(const m of lg){const f=m.f!=null?m.f:m[0],t=m.t!=null?m.t:m[1];const pf=PREF.some(p=>p[0]===f&&p[1]===t);if(b[t]&&!pf)continue;const a0=PARK.v.screenOf(f),hd=PARK.v.headOf?PARK.v.headOf(f):null,c=PARK.v.screenOf(t);   /* 巨盤（黑洞）選子吸的是角色身體中段：取腳下格點和頭頂之間 */
    const a=a0&&hd&&Math.hypot(hd.x-a0.x,hd.y-a0.y)>4?{x:a0.x+(hd.x-a0.x)*.45,y:a0.y+(hd.y-a0.y)*.45}:a0;if(!safe(a)||!safe(c)||!iso(f,a))continue;
    const ea=document.elementFromPoint(a.x,a.y),ec=document.elementFromPoint(c.x,c.y);if(!ea||ea.tagName!=="CANVAS"||!ec||ec.tagName!=="CANVAS")continue;out.push({f,t,fx:a.x,fy:a.y,tx:c.x,ty:c.y})}
  const pp=out.find(o=>PREF.some(p=>p[0]===o.f&&p[1]===o.t));return {n:lg.length,ok:out.length,pick:pp||out[SEED%Math.max(1,out.length)]||null}`;   /* 依情境名稱分散挑的著法（不要每個情境都 64→68） */

/* 等鏡頭停：同一格的螢幕座標連兩次（間隔 250ms）差不到 1.5 點才算停（選子後鏡頭會跟過去） */
async function settle(sq, body) {
  const expr = body ? `(()=>{const a=PARK.v.screenOf(${sq}),h=PARK.v.headOf?PARK.v.headOf(${sq}):null;return h&&a&&Math.hypot(h.x-a.x,h.y-a.y)>4?{x:a.x+(h.x-a.x)*.45,y:a.y+(h.y-a.y)*.45}:a})()` : `PARK.v.screenOf(${sq})`;
  let prev = null, stable = 0;
  for (let i = 0; i < 24; i++) {
    const p = await jsj(`return ${expr}`);
    if (p && prev && Math.hypot(p.x - prev.x, p.y - prev.y) < 1.5) { if (++stable >= 2) return p; } else stable = 0;
    prev = p; await sleep(250);
  }
  return prev;
}
async function oneMove(tag, movesExpr, prefer) {
  const before = await jsj(`const S=${movesExpr};return S&&S.moves`).catch(() => null);
  const n0 = before ? before.length : -1;
  const seed = [...tag].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const pk = await jsj(PICK(movesExpr, prefer, seed));
  if (!pk || !pk.pick) throw new Error(tag + "：挑不到可點的著法 " + JSON.stringify(pk));
  const m = pk.pick; shot(tag + "-1-前");
  let sel = false, selBy = "真實觸控";
  for (let i = 0; i < (prefer && prefer.jsSelFallback ? 4 : 10) && !sel; i++) {
    const sp = await settle(m.f, true);
    await touch([{ op: "tap", x: sp.x, y: sp.y, after: 0.45 }]);
    sel = await js(`(()=>{try{return PARK.last.o.sel===${m.f}}catch(e){return false}})()`);
    if (!sel) {
      /* W68（PR #38 起）：黑洞背面點到疊住的子，會跳「選哪顆？」選單（role=menu），用真實觸控點選單裡要選的那顆 */
      const mb = await jsj(`const mu=[...document.querySelectorAll('[role=menu]')].find(e=>e.getBoundingClientRect().width>0);if(!mu)return null;
        const p=(PARK.last.board||[])[${m.f}]||"";const NM={K:"帥將",A:"仕士",B:"相象",N:"傌馬",R:"俥車",C:"炮砲",P:"兵卒"}[p.toUpperCase()]||"";
        const red=p===p.toUpperCase(),want=NM[red?0:1];const b=[...mu.querySelectorAll('button')].find(x=>x.textContent.trim()===want);
        if(!b)return {menu:[...mu.querySelectorAll('button')].map(x=>x.textContent.trim())};const r=b.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,t:want}`);
      if (mb && mb.x != null) {
        await touch([{ op: "tap", x: mb.x, y: mb.y, after: 0.45 }]);
        sel = await js(`(()=>{try{return PARK.last.o.sel===${m.f}}catch(e){return false}})()`);
        if (sel) selBy = "真實觸控（疊子選單選「" + mb.t + "」）";
      } else if (mb && mb.menu) log("  疊子選單裡沒有要選的子：" + mb.menu.join("、"));
    }
  }
  if (!sel && prefer && prefer.jsSelFallback) {
    /* 退路（跟 Android 的 android-p0-modes-2251.js 一樣）：選子改用 cgPlay.tap；P0-3D 要驗的落點仍用真實觸控 */
    await js(`(()=>{cgPlay.tap(${m.f});return 1})()`); await sleep(600);
    sel = await js(`(()=>{try{return PARK.last.o.sel===${m.f}}catch(e){return false}})()`); selBy = "cgPlay.tap（真實觸控 4 次沒選到）";
  }
  if (!sel) throw new Error(tag + "：點起點 " + m.f + " 沒選到");
  shot(tag + "-2-選子");
  const tp = await settle(m.t, false);   /* 選子後鏡頭會動，等停了再算落點 */
  if (process.env.P03D_FAULT === "cover") {
    /* 反測（W02 重現）：在落點上放一顆按鈕，像當年縮放、切換按鈕蓋住暗綠落點那樣；這個腳本必須判失敗 */
    await js(`(()=>{const b=document.createElement("button");b.id="p03dFault";b.textContent="⇅";b.style.cssText="position:fixed;z-index:99;width:44px;height:44px;left:${tp.x - 22}px;top:${tp.y - 22}px";document.body.append(b);return 1})()`);
  }
  const cover = await js(`(()=>{const e=document.elementFromPoint(${tp.x},${tp.y});return e?e.tagName:null})()`);
  if (cover !== "CANVAS") throw new Error(tag + "：落點 " + m.t + " 被 " + cover + " 蓋住（W02 類問題）");
  await touch([{ op: "tap", x: tp.x, y: tp.y, after: 0.3 }]);
  for (let i = 0; i < 35; i++) {
    const mv = await jsj(`const S=${movesExpr};return S&&S.moves`).catch(() => null);
    if (mv && mv.length > n0) { const hit = mv.slice(n0).find((x) => (x.f === m.f && x.t === m.t) || (x[0] === m.f && x[1] === m.t)); if (hit) { shot(tag + "-3-後"); return { ok: true, f: m.f, t: m.t, n0, n1: mv.length, sel: selBy, target: "真實觸控" }; } }
    await sleep(180);
  }
  shot(tag + "-3-後");
  throw new Error(tag + "：棋譜沒有新增 " + m.f + "→" + m.t);
}

/* ---------- 情境 ---------- */
const SC = {
  async cpu() {
    await jsj(`${PRE}await api("/play/new",{human:"r",level:1,ranked:false});location.hash="#/cpu";return 1`);
    await waitReady();
    /* 對電腦：只有紅方是玩家，黑方由電腦走；紅黑兩方都由真人點的情境是同桌紅黑（pvp） */
    return [await oneMove("cpu-紅", MOVES.cpu)];
  },
  async inn() {
    await jsj(`${PRE}return await new Promise(res=>{const id="inn:"+INN[0].id;jStart(id,{human:"r",lx:1,journey:id},()=>{location.hash="#/journey/play";res(1)},true)})`);
    await waitReady();
    return [await oneMove("inn-紅", MOVES.cpu)];
  },
  async pvp() {
    await jsj(`${PRE}store.set("pvpSeat",null);await api("/pvp/new",{red:"QA red",black:"QA black"});location.hash="#/pvp";return 1`);
    await waitReady();
    const a = await oneMove("pvp-紅", MOVES.pvp);
    await sleep(1500); await waitReady();
    const b = await oneMove("pvp-黑翻面", MOVES.pvp);
    return [a, b];
  },
  async simul() {
    await jsj(`${PRE}await api("/simul/new",{n:3,lx:1});location.hash="#/simul";return 1`);
    await waitReady();
    const res = [];
    for (let i = 0; i < 3; i++) {
      const tb = await jsj(`const e=document.querySelector('.sim-tb[data-i="${i}"]');if(!e)return null;const r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}`);
      if (tb) { await touch([{ op: "tap", x: tb.x, y: tb.y, after: 0.6 }]); }
      await waitReady();
      res.push(await oneMove("simul-桌" + (i + 1), MOVES.simul.replace("TB", i)));
    }
    return res;
  },
  async bhx(view) {
    await jsj(`${PRE}store.set("parkView","");return await new Promise(res=>{jStart(BHX_ID,{human:"r",lx:1,journey:BHX_ID,lv:{fen:BHX_FEN,turn:"r",noPerpetual:true}},()=>{location.hash="#/journey/play";res(1)},true)})`);
    await waitReady(`BHFX_XUID===PARK.last.o.id||!bhfxXuBusy()`, 90000);
    await jsj(`PARK.v.setView(BHX_CAM);return 1`);
    await sleep(2500); await waitReady();
    if (view === "back") {
      /* 背面＝玩家按右下的 ⇅（「翻到棋盤背面」），用真實觸控按；setView("under") 在 iPhone 直式比例是貼盤平視、棋子全疊在一起，不是玩家看到的背面 */
      const fb = await jsj(`const b=[...document.querySelectorAll("button")].find(x=>/棋盤背面|back side/i.test(x.title||x.getAttribute("aria-label")||"")&&x.getBoundingClientRect().width>0);if(!b)return null;const r=b.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}`);
      if (!fb) throw new Error("bhx-back：找不到「到棋盤背面」的 ⇅ 按鈕（已經在背面？）");
      await touch([{ op: "tap", x: fb.x, y: fb.y, after: 1 }]);
      await sleep(2500); await waitReady();
    }
    const pref = [[22, 13]]; pref.jsSelFallback = true;
    return [await oneMove("bhx-" + view, MOVES.cpu, pref)];   /* 跟 Android 一樣固定走 22→13（俥吃士將死） */
  },
  async siege(view) {
    await jsj(`${PRE}gsvStart(31,"classic",false,[],true,false,1);return 1`);
    await waitFn(`GSV_ST&&GSV_ST.journey==="bh:gs31"&&!pkGateEat()&&!document.querySelector("#pgate:not(.out),#preov:not(.out),.scrim.show")`, 60000, "星門圍城進場");
    await sleep(1500);
    /* 星門圍城一進場是平面棋盤，切視角後 3D 棋盤才出來。上一盤晚跳出的結算視窗會吃掉切換：先清遮罩，8 秒內沒出來就再切一次（最多 3 次） */
    let up = false;
    for (let k = 0; k < 3 && !up; k++) {
      await js(`(()=>{(window.__p03dRm=window.__p03dRm||[]);document.querySelectorAll(".modal").forEach(e=>{window.__p03dRm.push("切視角前：."+String(e.className).slice(0,30)+"「"+e.textContent.trim().slice(0,24)+"」");e.remove()});${view === "top" ? "" : `gsvSetView("top");`}gsvSetView("${view}");return 1})()`);   /* 從平面棋盤直接切「斜視」不會出 3D（11/22 實測），先切俯視再切 */
      for (let i = 0; i < 16 && !up; i++) { await sleep(500); up = await js(`(()=>{try{return PARK.v.el.isConnected&&PARK.v.el.getBoundingClientRect().width>0}catch(e){return false}})()`).catch(() => false); }
    }
    await sleep(2500); await waitReady();
    const pref = []; pref.jsSelFallback = true;
    return [await oneMove("siege-" + view, MOVES.cpu, pref)];
  },
};
/* ---------- 玩家狀態（照 xiangqi-android/scripts/player-state.js；iMac Claude 2 驗 0804 用的同一套） ----------
   繁中、已開旅程、序局下過、駱躍梅入隊；授印禮「收下」和開頭畫面都用真實觸控關。
   已經是玩家狀態就只關開頭畫面。用 JS 改過存檔，跑完要 simctl erase 或在報告寫明。 */
const VISBTN = (re) => `(()=>{const b=[...document.querySelectorAll("button,a,[role=button]")].find(x=>{const r=x.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(x).visibility!=="hidden"&&${re}.test(x.textContent.trim())});if(!b)return null;const r=b.getBoundingClientRect();return {t:b.textContent.trim().slice(0,20),x:r.left+r.width/2,y:r.top+r.height/2}})()`;
const PRELOAD_BUSY = `[...document.querySelectorAll("body *")].some(e=>e.childElementCount===0&&/正在準備棋盤/.test(e.textContent)&&e.getBoundingClientRect().height>0)`;
async function waitFn(expr, ms, what) { for (let i = 0; i < ms / 1000; i++) { if (await js(`(()=>{try{return !!(${expr})}catch(e){return false}})()`).catch(() => false)) return; await sleep(1000); } throw new Error("等不到：" + what); }
async function tapVisible(re, what) { const b = await jsj(`return ${VISBTN(re)}`); if (!b) return null; await touch([{ op: "tap", x: b.x, y: b.y, after: 1 }]); log("  點「" + b.t + "」（" + what + "）"); return b; }
async function prep() {
  await waitFn(`typeof journeyStart==="function"&&typeof store!=="undefined"`, 60000, "App 載入");
  const has = await js(`(()=>{try{return !!journey()&&!!store.get("bhxLand",0)}catch(e){return false}})()`);
  if (!has) {
    log("  建玩家狀態（繁中、開旅程、序局標成下過、駱躍梅入隊）");
    await js(`(async()=>{localStorage.setItem('xq_netRoot',JSON.stringify('xq_test'));store.set('lang','zh');if(!journey())await journeyStart(1,null,'封測測試',2);return 1})()`);
    await sleep(1500);
    await js(`(async()=>{store.set('bhXuDone',Date.now());store.set('bhxLand',Date.now());store.set('lang','zh');if(typeof ptyJoin==='function')ptyJoin('x_miaogirl','ship');if(typeof ptySetLook==='function')ptySetLook('x_miaogirl');await saveNow(true);setTimeout(()=>{location.hash='#/';location.reload()},50);return 1})()`).catch(() => {});
    await sleep(6000);
  }
  await waitFn(`typeof route==="function"&&typeof store!=="undefined"`, 60000, "重新載入");
  for (let i = 0; i < 80; i++) { if (!(await js(PRELOAD_BUSY).catch(() => true))) break; await sleep(3000); }
  await sleep(2000);
  /* 開頭畫面：點「繼續」類的按鈕；授印禮：點「收下」（都是真實觸控） */
  for (let k = 0; k < 4; k++) {
    const t = await js(`!!document.querySelector("#xqTitle:not(.out)")`).catch(() => false);
    if (t) { if (!(await tapVisible(`/^(繼續|續|回到|進入)/`, "開頭畫面"))) throw new Error("開頭畫面找不到繼續的按鈕（不是玩家狀態？）"); await sleep(2500); continue; }
    if (await tapVisible(`/^收下$/`, "授印禮")) { await sleep(1500); continue; }
    break;
  }
  const st = await jsj(`return {c:myChar(),lang:store.get("lang",null),title:!!document.querySelector("#xqTitle:not(.out)")}`);
  if (st.c !== "x_miaogirl" || st.lang !== "zh" || st.title) throw new Error("玩家狀態沒設成：" + JSON.stringify(st));
  return [st];
}

const LIST = { prep: () => prep(), cpu: () => SC.cpu(), inn: () => SC.inn(), pvp: () => SC.pvp(), simul: () => SC.simul(), "bhx-front": () => SC.bhx("front"), "bhx-back": () => SC.bhx("back"), "siege-top": () => SC.siege("top"), "siege-iso": () => SC.siege("iso") };

(async () => {
  const want = ["prep", ...(process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(LIST).filter((k) => k !== "prep"))].filter((k, i, a) => a.indexOf(k) === i);
  log("P0-3D iOS｜模擬器 " + UDID + "｜證據 " + OUT);
  const info = await jsj(`return {b:typeof XQ_BUILD!=="undefined"?XQ_BUILD:null,w:innerWidth,h:innerHeight,dpr:devicePixelRatio,ua:navigator.userAgent}`);
  log("App：" + JSON.stringify(info));
  /* 核對模擬器上實際跑的是不是要驗的那個包（p0-3d.sh 會傳 P03D_EXPECT_BUILD） */
  if (process.env.P03D_EXPECT_BUILD && info.b !== process.env.P03D_EXPECT_BUILD) { log("✘ App 執行時的 XQ_BUILD 是 " + info.b + "，要驗的包是 " + process.env.P03D_EXPECT_BUILD + "：測試不成立"); process.exit(2); }
  startServer(); await waitServer(); log("XCUITest 觸控伺服就緒");
  const R = {};
  for (const k of want) {
    if (!LIST[k]) { R[k] = { ok: false, err: "不認得的情境（可用：" + Object.keys(LIST).join(" ") + "）" }; log("✘ " + k + "：" + R[k].err); continue; }
    try { R[k] = { ok: true, moves: await LIST[k]() }; log("✔ " + k + " " + JSON.stringify(R[k].moves)); }
    catch (e) { R[k] = { ok: false, err: e.message }; log("✘ " + k + "：" + e.message); shot(k + "-失敗"); }
    const rm = await jsj(`const a=window.__p03dRm||[];window.__p03dRm=[];return a`).catch(() => []);
    if (rm && rm.length) { R[k].removed = rm; log("  移除的遮罩：" + rm.join("；")); }
  }
  await stopServer();
  fs.writeFileSync(path.join(OUT, "result.json"), JSON.stringify({ app: info, expect: { build: process.env.P03D_EXPECT_BUILD || null, indexSha256: process.env.P03D_EXPECT_SHA || null }, udid: UDID, at: new Date().toISOString(), results: R }, null, 1));
  const bad = Object.keys(R).filter((k) => !R[k].ok);
  const fb = Object.keys(R).filter((k) => R[k].ok && (R[k].moves || []).some((m) => m.sel && /^cgPlay/.test(m.sel)));
  if (fb.length) log("ⓘ " + fb.length + " 個情境選子用了退路 cgPlay.tap（落點仍是真實觸控）：" + fb.join("、"));
  if (process.env.P03D_FAULT === "cover") {
    /* 反測模式（PR #45 審查②）：注入了 W02 故障，期望是「每個情境都判落點被 BUTTON 蓋住」；全部擋到才回 0，有任何情境照常通過或因別的原因失敗都回 1 */
    const sc = Object.keys(R).filter((k) => k !== "prep"), caught = sc.filter((k) => !R[k].ok && /被 BUTTON 蓋住/.test(R[k].err || ""));
    const miss = sc.filter((k) => !caught.includes(k)), prepOk = !R.prep || R.prep.ok;
    fs.writeFileSync(path.join(OUT, "result.json"), JSON.stringify({ app: info, fault: "cover", faultCaught: caught, faultMissed: miss, udid: UDID, at: new Date().toISOString(), results: R }, null, 1));
    const good = prepOk && sc.length > 0 && miss.length === 0;
    log(good ? "✔ 反測成立：" + caught.length + " 個情境都判出落點被蓋住（W02）" : "✘ 反測不成立：" + (miss.length ? "沒擋到 " + miss.join("、") : "沒有情境可驗") + (prepOk ? "" : "；玩家狀態沒建好"));
    process.exit(good ? 0 : 1);
  }
  log(bad.length ? "✘ 失敗：" + bad.join("、") : "✔ 全部通過（" + Object.keys(R).length + " 個情境）");
  process.exit(bad.length ? 1 : 0);
})().catch(async (e) => { log("✘ " + e.message); await stopServer(); process.exit(2); });
