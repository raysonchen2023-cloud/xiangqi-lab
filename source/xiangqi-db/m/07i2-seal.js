/* ================= 🏮 千秋印・千秋印譜（Gemini 遊玩樂趣評估「系統複雜度」最差，開發者 11/9 確認 story/收集系統合併方案_1109.md）=================
   把各朝的「通關證明」合成一種：每一朝一方千秋印（13 方，含船艙），印的四邊是四道關——
     上＝📘 棋理（星槎這一站 3 題都解開，shipLearn）、右＝🏯 擂台（打贏擂主，xq_arenaStamps，由 xiangqi-lab/src/local.js 寫）、
     下＝⚔ 古戰場（有一卷 5 場都打下來：battleTitle／battleVolY／battleVol／battleGrand／battleVolLegacy，或 battleSeal 裡真的有一卷 5 場）、
     左＝🧭 輿圖（輿圖路線整條走完，yuRoute[朝].done）。船艙沒有古戰場，三邊就夠（下邊畫雲紋）。
   亮 0 邊＝灰印；1～3 邊＝朱印；該朝要的邊都亮＝金印（印上的鈕變金色）。加成：本命挑戰（chd.seal）＝擂台邊旁一顆 ⭐ 本命星；千古名將（battleGrand）＝古戰場那一邊描金。
   原則：千秋印「不存進度」，每次都從上面那些舊 key 即時算，舊 key 一個都不刪、不改格式（舊存檔、雲端還原、換手機、3 格存檔打開就換算好）。
     棋理邊（開發者 11/9 第 8 點）：只認 shipLearn，或 674 版 eraOpen 裡「那一站真的有解題紀錄（shipSolved）」的站；說書人學徒的「13 站全開」是不鎖站，不是學會，不會亮。
   新 key 只有兩個（05b-save.js JOURNEY_KEYS）：sealGold＝{朝代:{at 第一次鑄成金印的時間, xp:1 已發修為, boot:1 換算時補發}}、sealIntro＝看過「印譜換新」說明卡的時間。
     鑄成金印修為 +30（addXP 的 key「seal:gold:<朝代>」再擋一次重複）；舊玩家換算後已是金印的，第一次打開補發一次。13 方都是金印＝稱號「千秋印主」（XQ_TITLE 排在本週擂主後面）。
   入口：千秋大百科「🏮 千秋印譜」、#/codex/seal、擂主卡「🏮 千秋印譜」（stampBook 轉過來）、渡口、驛站千秋驛路。印用程式畫（CSS＋SVG 鈕），不出圖。
   形制說明 SEAL_FORM：鈕式和「那一朝真的印」的小知識是初稿，ok:0＝還沒經史學顧問核，畫面只顯示通用說明 SEAL_GENERIC；核過把 ok 改成 1 才顯示 note。 */
const SEAL_ON=true,SEAL_GOLD_XP=30;
const SEAL_SIDES=[["li","📘","棋理"],["arena","🏯","擂台"],["battle","⚔","古戰場"],["yu","🧭","輿圖"]];
const SEAL_SIDE={li:SEAL_SIDES[0],arena:SEAL_SIDES[1],battle:SEAL_SIDES[2],yu:SEAL_SIDES[3]};
const SEAL_GENERIC="這是說書人照古時候印的樣子替你鑄的紀念印，不是官印；印上刻的是那一朝的字。";
/* 鈕式：bi 鼻鈕、gui 龜鈕、tuo 駝鈕、jue 橛鈕、zhi 直鈕。note＝那一朝真的印長什麼樣子（待史學顧問核，ok:0 不顯示） */
const SEAL_KNOB={bi:"鼻鈕",gui:"龜鈕",tuo:"駝鈕",jue:"橛鈕",zhi:"直鈕"};
const SEAL_FORM={
  classic:{knob:"bi",ok:0,note:"船艙在雲河上，不屬於哪一朝；這方印用最古老、最簡單的鼻鈕。"},
  qin:{knob:"bi",ok:0,note:"秦朝起只有皇帝的印叫「璽」，臣子的叫「印」；秦印常把印面隔成田字四格，用鼻鈕。"},
  han:{knob:"gui",ok:0,note:"漢代丞相、列侯用金印龜鈕；出土的廣陵王璽、「滇王之印」（蛇鈕）都是漢代金印。"},
  sanguo:{knob:"gui",ok:0,note:"三國時曹魏的印制大致沿用漢朝，常見龜鈕。"},
  weijin:{knob:"tuo",ok:0,note:"晉朝頒給邊疆首領的印常用駝鈕、羊鈕，例如「晉歸義羌王」金印。"},
  nanbei:{knob:"gui",ok:0,note:"南北朝的官印開始變大，也開始沾朱泥蓋在紙上。"},
  sui:{knob:"bi",ok:0,note:"隋唐的官印刻官署的名字，印跟著官府走，不跟著人走；方印比漢印大得多。"},
  tang:{knob:"bi",ok:0,note:"唐朝官印是朱文大方印，蓋在紙寫的公文上。"},
  wudai:{knob:"bi",ok:0,note:"五代的印制大致接著唐朝。"},
  song:{knob:"jue",ok:0,note:"宋代官印用「九疊篆」，筆畫折來折去填滿印面，印背是長長的橛鈕。"},
  yuan:{knob:"jue",ok:0,note:"元代官印刻八思巴字，也用橛鈕。"},
  ming:{knob:"zhi",ok:0,note:"明代官印用九疊篆、直鈕；一二品用銀印、其餘用銅印，只有親王是金寶。"},
  qing:{knob:"zhi",ok:0,note:"清代官印滿文、漢文並刻，用直鈕。"}};
const SEAL_ERAS=()=>(typeof ARENA_ORDER!=="undefined"?ARENA_ORDER:["classic","qin","han","sanguo","weijin","nanbei","sui","tang","wudai","song","yuan","ming","qing"]);
const sealNeed=k=>k==="classic"?["li","arena","yu"]:["li","arena","battle","yu"];
const SEAL_SIDE_TOTAL=()=>SEAL_ERAS().reduce((a,k)=>a+sealNeed(k).length,0);
const sealNm=k=>k==="classic"?"船艙印":eraLabel(k)+"印";
const sealGlyph=k=>(typeof ARENA!=="undefined"&&ARENA[k]&&ARENA[k].seal)||"棋";
/* 時間：數字、ISO 字串、{at}／{done} 都收；有但看不出時間＝1 */
function sealTs(v){if(v==null||v===false||v===0)return 0;if(typeof v==="number")return v>0?v:0;if(typeof v==="string"){const t=Date.parse(v);return isNaN(t)?1:t}if(typeof v==="object"){const t=sealTs(v.at!=null?v.at:v.done);return t||1}return v?1:0}
const sealMinT=o=>{let m=0;for(const x of Object.values(o||{})){const t=sealTs(x);if(t&&(!m||t<m))m=t}return m};
/* 古戰場的保險：battleSeal 裡真的有一卷 5 場都在（只在戰役卡已經載入時算；不寫存檔） */
function sealBtlFull(k){try{if(typeof BATTLE_CARDS==="undefined"||!BATTLE_CARDS||!(BATTLE_CARDS[k]||[]).length)return 0;const C=BATTLE_CARDS[k],raw=(store.get("battleSeal",{})||{})[k]||{};
    const E=typeof battleMigMap==="function"?battleMigMap(raw,k):raw,V={};for(const c of C){const vo=(c&&c.vol)||1;(V[vo]||(V[vo]=[])).push(c)}
    for(const L of Object.values(V))if(L.length>=5&&L.every(c=>E[c.id]))return Math.max(...L.map(c=>sealTs(E[c.id])))||1}catch(e){}return 0}
/* 某一邊亮起來的時間（0＝沒亮） */
function sealSideAt(k,s){try{
    if(s==="li"){const L=store.get("shipLearn",{})||{};if(L[k])return sealTs(L[k]);const O=store.get("eraOpen",[])||[];if(Array.isArray(O)&&O.includes(k)){const S=(store.get("shipSolved",{})||{})[k];if(S&&typeof S==="object"&&Object.keys(S).length)return sealMinT(S)||1}return 0}
    if(s==="arena"){const A=typeof arenaStamps==="function"?arenaStamps():{};return A&&A[k]?sealTs(A[k].at)||1:0}
    if(s==="battle"){if(k==="classic")return 0;const g=n=>(store.get(n,{})||{})[k],LG=g("battleVolLegacy");
      return sealTs(g("battleTitle"))||sealMinT(g("battleVolY"))||sealMinT(g("battleVol"))||sealTs(g("battleGrand"))||(LG&&(LG.n|0)>0?1:0)||sealBtlFull(k)}
    if(s==="yu"){const R=(store.get("yuRoute",{})||{})[k];return R&&R.done?sealTs(R.done):0}}catch(e){}return 0}
const sealSideOn=(k,s)=>!!sealSideAt(k,s);
function sealOf(k){const need=sealNeed(k),on={};for(const s of need){const t=sealSideAt(k,s);if(t)on[s]=t}const n=Object.keys(on).length;
  let star=false,grand=false;try{star=!!((store.get("chd",{})||{}).seal||{})[k]}catch(e){}try{grand=!!(store.get("battleGrand",{})||{})[k]}catch(e){}
  return{k,need,on,n,N:need.length,gold:n>=need.length,star,grand}}
const sealAll=()=>SEAL_ERAS().map(sealOf);
const sealGoldN=()=>sealAll().filter(S=>S.gold).length;
const sealLitN=()=>sealAll().reduce((a,S)=>a+S.n,0);
const sealTitle=()=>SEAL_ON&&sealGoldN()>=SEAL_ERAS().length?"千秋印主":"";
/* 這一週亮了幾邊、鑄成幾方金印（04c-weekly.js 學習週報；換算時補發的不算這週新鑄的） */
function sealWeek(inW){let n=0,g=0;try{const G=store.get("sealGold",{})||{};for(const S of sealAll()){for(const t of Object.values(S.on))if(t>1&&inW(t))n++;const z=G[S.k];if(S.gold&&z&&!z.boot&&inW(z.at))g++}}catch(e){}return{n,g}}

/* ---------- 畫印 ---------- */
function sealCss(){if(document.getElementById("sealCss"))return;const s=document.createElement("style");s.id="sealCss";s.textContent=`
.qs{--s:44px;position:relative;display:inline-flex;flex-direction:column;align-items:center;flex:none;vertical-align:middle;line-height:1}
.qs.sm{--s:30px}.qs.lg{--s:84px}.qs.fx{--s:150px}
.qs-knob{display:block;width:calc(var(--s)*.62);height:calc(var(--s)*.3);margin-bottom:-1px;color:#cfc5b4;opacity:.55}
.qs.gold .qs-knob{color:#C8962E;opacity:1;filter:drop-shadow(0 1px 1px #0004)}
.qs-face{position:relative;width:var(--s);height:var(--s);border-radius:calc(var(--s)*.1);background:#FBF6EC;box-shadow:0 1px 3px #0003;display:flex;align-items:center;justify-content:center;transform:rotate(-4deg);overflow:hidden}
.qs-face i{position:absolute;background:repeating-linear-gradient(90deg,#d3c9b8 0 4px,transparent 4px 7px)}
.qs-face i.t,.qs-face i.b{left:0;right:0;height:calc(var(--s)*.1)}.qs-face i.t{top:0}.qs-face i.b{bottom:0}
.qs-face i.l,.qs-face i.r{top:0;bottom:0;width:calc(var(--s)*.1);background:repeating-linear-gradient(0deg,#d3c9b8 0 4px,transparent 4px 7px)}.qs-face i.l{left:0}.qs-face i.r{right:0}
.qs-face i.on{background:#B5452B}.qs-face i.gd{background:#C8962E}
.qs-face i.na{background:repeating-radial-gradient(circle at 50% 50%,#d9c79a 0 2px,transparent 2px 5px);opacity:.8}
.qs-ch{font:900 calc(var(--s)*.5)/1 var(--serif,serif);color:#bcb09d}.qs-ch.two{font-size:calc(var(--s)*.34);writing-mode:vertical-rl;letter-spacing:-1px}
.qs.lit .qs-ch{color:#B5452B}
.qs.gold .qs-face{background:linear-gradient(135deg,#FCE7A2,#E6B955 55%,#B8862B);box-shadow:0 0 0 1px #9A6B12,0 2px 8px rgba(200,150,46,.6)}
.qs.gold .qs-face i,.qs.gold .qs-face i.on{background:#8A2E1A}.qs.gold .qs-ch{color:#7A2E1A}
.qs-star{position:absolute;right:calc(var(--s)*-.16);top:calc(var(--s)*.22);font-size:calc(var(--s)*.34);font-style:normal;filter:drop-shadow(0 1px 1px #0005)}
.chd-shine .qs-face,.qs.star .qs-face{box-shadow:0 0 0 2px #E8C462,0 0 12px rgba(232,196,98,.75)}
.qs-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.qs-grid .stamp-cell{cursor:pointer;font:inherit}.qs-grid .stamp-cell small{font-size:11.5px}
.qs-lit{display:flex;gap:12px;align-items:center;text-align:left;margin:8px 0;padding:8px 12px;border-radius:12px;border:1px solid rgba(181,69,43,.35);background:rgba(181,69,43,.06)}
.qs-lit b{display:block;font-size:15.5px;line-height:1.5}.qs-lit .muted{font-size:13px;line-height:1.55}.qs-lit.gold{border-color:#C8962E;background:rgba(200,150,46,.12)}
.qs-port{display:flex;gap:12px;align-items:center;width:100%;text-align:left;font:inherit;color:inherit;cursor:pointer;margin-top:10px}
.qs-sum{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0 2px}
.qsfx{position:fixed;inset:0;z-index:9000;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;text-align:center;color:#FFF7E6;cursor:pointer;background:radial-gradient(circle at 50% 42%,rgba(70,40,8,.95),rgba(0,0,0,.96) 70%);animation:qsIn .25s ease-out both;outline:none}
.qsfx.out{opacity:0;transition:opacity .22s}
.qsfx .qs{animation:qsDrop .7s .15s cubic-bezier(.3,1.4,.5,1) both}
.qsfx h2{margin:18px 0 6px;font:900 26px/1.3 var(--serif,serif);color:#FFD45A}.qsfx p{margin:4px 0;max-width:360px;font-size:15.5px;line-height:1.75}.qsfx small{display:block;margin-top:14px;font-size:13px;opacity:.75}
@keyframes qsIn{from{opacity:0}to{opacity:1}}@keyframes qsDrop{from{transform:scale(2.4) rotate(-12deg);opacity:0}to{transform:none;opacity:1}}
@media (prefers-reduced-motion:reduce){.qsfx,.qsfx .qs{animation:none}}
.yz-seal.gd{background:linear-gradient(135deg,#FCE7A2,#E6B955 55%,#B8862B)!important;color:#7A2E1A!important;border-color:#9A6B12!important}`;document.head.append(s)}
/* 鈕的剪影（viewBox 40×20，用 currentColor） */
const SEAL_KNOB_SVG={bi:'<path d="M9 20C9 7 14 3 20 3s11 4 11 17z"/><ellipse cx="20" cy="13" rx="4.2" ry="3.6" fill="#0003"/>',
  gui:'<ellipse cx="19" cy="15" rx="13" ry="6.5"/><circle cx="34" cy="13" r="3.4"/><path d="M11 15q8-5 16 0" stroke="#0003" stroke-width="1.4" fill="none"/>',
  tuo:'<path d="M3 20c2-6 5-8 8-7 2-8 7-9 9-2 2-7 7-6 9 1 3-1 6 1 8 8z"/><circle cx="35" cy="11" r="2.4"/>',
  jue:'<path d="M14 20l2-15q4-4 8 0l2 15z"/>',
  zhi:'<path d="M15 20V4q5-4 10 0v16z"/>'};
/* o：sm／lg／fx 尺寸；印面四邊 上棋理、右擂台、下古戰場、左輿圖 */
function sealDraw(k,o){o=o||{};sealCss();const S=sealOf(k),F=SEAL_FORM[k]||{},g=sealGlyph(k),cls=s=>!S.need.includes(s)?"na":S.on[s]?(s==="battle"&&S.grand&&!S.gold?"gd":"on"):"";
  const sz=o.fx?" fx":o.lg?" lg":o.sm?" sm":"";
  return`<span class="qs${sz}${S.gold?" gold":S.n?" lit":""}${S.star?" star":""}" data-qs="${k}" role="img" aria-label="${esc(sealNm(k))}：${S.gold?"金印":`亮了 ${S.n}／${S.N} 邊`}${S.star?"，有本命星":""}">`+
    `<svg class="qs-knob" viewBox="0 0 40 20" fill="currentColor" aria-hidden="true">${SEAL_KNOB_SVG[F.knob]||SEAL_KNOB_SVG.bi}</svg>`+
    `<span class="qs-face"><i class="t ${cls("li")}"></i><i class="r ${cls("arena")}"></i><i class="b ${cls("battle")}"></i><i class="l ${cls("yu")}"></i><b class="qs-ch${g.length>1?" two":""}">${esc(g)}</b></span>${S.star?'<em class="qs-star" aria-hidden="true">⭐</em>':""}</span>`}
const sealStateTxt=S=>S.gold?"金印":S.n?`亮了 ${S.n}／${S.N} 邊`:"還沒亮";

/* ---------- 某一邊剛亮起來（擂台結果、古戰場一卷集滿、輿圖走完、星槎學會一站呼叫）：一張小卡；要的邊都亮了就鑄成金印 ---------- */
function sealLitHTML(k,s){if(!SEAL_ON)return"";try{const S=sealOf(k),D=SEAL_SIDE[s];if(!D||!S.need.includes(s)||!S.on[s])return"";sealCss();
    if(S.gold)sealGoldCheck({fx:true,delay:1800});
    return`<div class="qs-lit${S.gold?" gold":""}">${sealDraw(k)}<div><b>${esc(sealNm(k))}亮了「${D[2]}」這一邊（${S.n}／${S.N}）</b><div class="muted">${S.gold?`${S.N} 邊都亮了，鑄成金印！修為 +${SEAL_GOLD_XP}`:`再亮 ${S.N-S.n} 邊就鑄成金印`}・📚 千秋大百科 → 🏮 千秋印譜</div></div></div>`}catch(e){return""}}
/* 鑄成金印：記進 sealGold、發修為（每朝一次）；fx＝播動畫；boot＝舊存檔換算時補發 */
let SEAL_FX_Q=Promise.resolve();
function sealGoldCheck(o){o=o||{};if(!SEAL_ON)return[];const G=store.get("sealGold",{})||{},nw=[];
  for(const S of sealAll()){if(!S.gold)continue;const z=G[S.k];if(z&&z.xp)continue;G[S.k]={at:(z&&z.at)||Date.now(),xp:1};if(o.boot)G[S.k].boot=1;nw.push(S.k)}
  if(!nw.length)return nw;store.set("sealGold",G);
  nw.forEach((k,i)=>setTimeout(()=>{try{addXP(SEAL_GOLD_XP,"鑄成金印・"+sealNm(k),"seal:gold:"+k)}catch(e){}},(o.delay||0)+600+i*500));
  if(o.fx)nw.forEach((k,i)=>setTimeout(()=>sealGoldFx(k),(o.delay||0)+i*50));return nw}
function sealGoldFx(k){const p=SEAL_FX_Q.then(()=>new Promise(done=>{try{sealCss();const all=sealGoldN()>=SEAL_ERAS().length,d=document.createElement("div");d.className="qsfx";d.tabIndex=0;
    d.innerHTML=`${sealDraw(k,{fx:1})}<h2>${esc(sealNm(k))}・鑄成金印！</h2><p>${esc(eraLabel(k)==="青石園"?"船艙":eraLabel(k))}的關都過了。修為 +${SEAL_GOLD_XP}</p>${all?'<p style="color:#FFD45A;font-weight:900">🏅 13 方千秋印都是金印了！得到稱號「千秋印主」</p>':`<p>金印 ${sealGoldN()}／13 方</p>`}<small>點一下收下</small>`;
    document.body.append(d);try{d.focus({preventScroll:true})}catch(e){}try{if(typeof vibrate==="function")vibrate([20,60,40,60])}catch(e){}try{if(typeof rfxSound==="function")rfxSound(matchMedia("(prefers-reduced-motion: reduce)").matches)}catch(e){}
    let shut=false;const close=e=>{if(e){e.preventDefault();e.stopPropagation()}if(shut)return;shut=true;d.classList.add("out");setTimeout(()=>{d.remove();done()},230)};
    d.addEventListener("click",close);d.addEventListener("keydown",e=>{if(e.key==="Escape"||e.key==="Enter"||e.key===" ")close(e)})}catch(e){done()}})).catch(()=>{});SEAL_FX_Q=p;return p}

/* ---------- 千秋印譜 ---------- */
function sealBook(start){sealCss();const L=sealAll(),g=L.filter(S=>S.gold).length,lit=L.reduce((a,S)=>a+S.n,0),T=SEAL_SIDE_TOTAL(),t=sealTitle();
  sheet("🏮 千秋印譜",b=>{b.innerHTML=`<p style="margin:0 0 6px;line-height:1.7;font-size:14.5px">每一朝一方<b>千秋印</b>。印的四邊是四道關：📘 棋理、🏯 擂台、⚔ 古戰場、🧭 輿圖。過一道亮一邊，四邊都亮就<b>鑄成金印</b>（修為 +${SEAL_GOLD_XP}）。船艙沒有古戰場，三邊就夠。</p>
    <p style="margin:0 0 8px">金印 <b>${g}</b>／13 方・亮了 ${lit}／${T} 邊${t?`・稱號 <b style="color:var(--accent)">「${esc(t)}」</b>`:"<br><span class=\"muted\" style=\"font-size:13px\">13 方都鑄成金印，得到稱號「千秋印主」</span>"}</p>
    <div class="qs-grid">${L.map(S=>`<button class="stamp-cell" data-qe="${S.k}">${sealDraw(S.k)}<b>${esc(S.k==="classic"?"船艙":eraLabel(S.k))}</b><small>${esc(sealStateTxt(S))}</small></button>`).join("")}</div>
    <p class="muted" style="font-size:12.5px;line-height:1.6;margin-top:10px">點一方印，看那一朝四道關走到哪裡、去哪裡打。${esc(SEAL_GENERIC)}</p>
    ${typeof OFF!=="undefined"&&OFF&&typeof legendBook==="function"?`<button class="btn ghost" id="qsLg" style="width:100%;margin-top:6px">🪨 石桌往事（已解開 ${legendState().n}／36 回）</button>`:""}`;
    {const lb=b.querySelector("#qsLg");if(lb)lb.onclick=()=>legendBook()}
    b.querySelectorAll("[data-qe]").forEach(c=>c.onclick=()=>{try{vibrate(5)}catch(e){}sealEraSheet(c.dataset.qe,start)})})}
/* 每一邊現在走到哪裡（白話） */
function sealSideTxt(k,s,on){try{
    if(s==="li"){if(on)return"星槎這一站的 3 題都解開了";const E=(store.get("shipSolved",{})||{})[k]||{},n=Object.keys(E).length;return`星槎這一站的 3 題，解開 ${Math.min(n,3)}／3 題`}
    if(s==="arena"){const A=(typeof ARENA!=="undefined"&&ARENA[k])||{};return on?`打贏了擂主「${A.name||""}」`:`打贏擂主「${A.name||""}」`}
    if(s==="battle"){const raw=(store.get("battleSeal",{})||{})[k]||{},n=Object.keys(raw).length;const gd=(store.get("battleGrand",{})||{})[k];return on?(gd?"全部戰役都打下來了（千古名將，這一邊描金）":"有一卷 5 場都打下來了"):`已攻下 ${n} 場；有一卷 5 場都打下來，這一邊就亮`}
    if(s==="yu"){const R=(typeof YU_R!=="undefined"&&YU_R[k])||null,P=(store.get("yuRoute",{})||{})[k]||{};if(!R)return on?"走完了":"輿圖路線";return on?`「${R.t}」走完了`:`「${R.t}」走到 ${Math.min(P.n||0,R.s.length)}／${R.s.length} 站（在石桌往事的園子裡拉遠看地圖）`}}catch(e){}return""}
function sealEraSheet(k,start){sealCss();const S=sealOf(k),F=SEAL_FORM[k]||{},G=(store.get("sealGold",{})||{})[k],nm=k==="classic"?"船艙":eraLabel(k);
  sheet(`🏮 ${sealNm(k)}`,b=>{b.innerHTML=`<div style="display:flex;gap:16px;align-items:center;margin-bottom:8px">${sealDraw(k,{lg:1})}<div><div style="font:900 21px/1.3 var(--serif,serif)">${esc(sealNm(k))}</div>
      <div class="muted" style="font-size:14px">${S.gold?`已鑄成金印${G&&G.at>1?"（"+new Date(G.at).toLocaleDateString()+"）":""}`:`亮了 ${S.n}／${S.N} 邊・再 ${S.N-S.n} 邊鑄成金印`}</div>${S.star?'<div style="font-size:13.5px;margin-top:4px">⭐ 本命星：本命挑戰打贏過這一朝的擂主</div>':""}${F.ok&&SEAL_KNOB[F.knob]?`<div class="muted" style="font-size:13px;margin-top:4px">${esc(SEAL_KNOB[F.knob])}</div>`:""}</div></div>
    <div class="items" style="padding:0">${SEAL_SIDES.map(([s,ic,lb])=>{if(!S.need.includes(s))return`<div class="item" style="opacity:.6"><span class="lb" style="font-size:20px">☁</span><span class="tx"><b>${lb}</b><span style="white-space:normal">船艙沒有古戰場，這一邊畫成雲紋，不用打</span></span></div>`;
        const on=!!S.on[s];return`<button class="item" data-qs="${s}"><span class="lb" style="font-size:20px">${on?"✅":ic}</span><span class="tx"><b>${on?ic+" ":""}${lb}${on?"・亮了":""}</b><span style="white-space:normal">${esc(sealSideTxt(k,s,on))}</span></span><span class="muted">›</span></button>`}).join("")}</div>
    <p class="muted" style="font-size:13px;line-height:1.65;margin:10px 2px 0">${esc(F.ok&&F.note?F.note:SEAL_GENERIC)}</p>
    <button class="btn ghost" id="qsBk" style="width:100%;margin-top:10px">‹ 回千秋印譜</button>`;
    b.querySelector("#qsBk").onclick=()=>sealBook(start);
    b.querySelectorAll("button[data-qs]").forEach(x=>x.onclick=()=>{try{vibrate(5)}catch(e){}const s=x.dataset.qs;
      if(s==="arena"&&typeof arenaSheet==="function")return arenaSheet(k,start);
      if(s==="yu"&&typeof yuRouteSheet==="function"&&typeof YU_R!=="undefined"&&YU_R[k])return yuRouteSheet(k);
      const go=h=>{closeSheet();if(typeof shipGoTo==="function")shipGoTo(k,()=>{location.hash=h});else location.hash=h};
      if(s==="li")return go("#/adventure");if(s==="battle")return go("#/battle")})})}

/* ---------- 舊存檔第一次打開：換新說明卡（只一次，記在 sealIntro）＋已經是金印的補發修為 ---------- */
function sealHadOld(){try{const n=o=>Object.keys(o||{}).length;
    return n(typeof arenaStamps==="function"?arenaStamps():{})>0||n(store.get("yuRoute",{}))>0||n(store.get("shipLearn",{}))>0||n(store.get("battleSeal",{}))>0||(store.get("eraOpen",[])||[]).length>0||n((store.get("chd",{})||{}).seal)>0}catch(e){return false}}
function sealIntroSheet(nw){sealCss();const L=sealAll(),cnt=(f)=>L.filter(f).length,ar=cnt(S=>S.on.arena),yu=cnt(S=>S.on.yu),li=cnt(S=>S.on.li),bt=cnt(S=>S.on.battle),st=cnt(S=>S.star),g=cnt(S=>S.gold),r=cnt(S=>!S.gold&&S.n),lit=L.reduce((a,S)=>a+S.n,0);
  const row=(ic,t,n)=>n?`<li>${ic} ${t}：<b>${n}</b></li>`:"";
  sheet("🏮 集章簿換成千秋印譜了",b=>{b.innerHTML=`<p style="line-height:1.8;font-size:15px;margin:0 0 6px">以前的<b>集章簿、路引、擂台印、戰役印、站章</b>，現在收在同一本「千秋印譜」：每一朝一方千秋印，四邊是四道關。你打過的關一個都沒少——</p>
    <ul style="line-height:1.9;font-size:14.5px;margin:4px 0 8px;padding-left:20px">${row("🏯","打贏的擂主（擂台印）",ar)}${row("⚔","古戰場集滿一卷的朝代",bt)}${row("🧭","走完的輿圖路線（路引）",yu)}${row("📘","星槎學會的站",li)}${row("⭐","本命星（閃版擂台印）",st)}</ul>
    <div class="qs-sum">${L.map(S=>sealDraw(S.k,{sm:1})).join("")}</div>
    <p style="line-height:1.8;font-size:15px;margin:8px 0">換算好了：<b>金印 ${g} 方</b>、朱印 ${r} 方，一共亮了 ${lit}／${SEAL_SIDE_TOTAL()} 邊。${nw&&nw.length?`<br>已經是金印的 ${nw.length} 方，補發修為 +${SEAL_GOLD_XP*nw.length}。`:""}</p>
    <p class="muted" style="font-size:12.5px;line-height:1.6">每一場戰役打下來，古戰場地圖上改插一面小旗（🚩 已攻下）。稱號都照舊。</p>
    <button class="btn" id="qsOpen" style="width:100%;margin-top:6px">🏮 打開千秋印譜</button><button class="btn ghost" id="qsOk" style="width:100%;margin-top:6px">好</button>`;
    b.querySelector("#qsOpen").onclick=()=>sealBook();b.querySelector("#qsOk").onclick=()=>closeSheet()})}
let SEAL_BOOT_N=0,SEAL_BOOT_T=null;
function sealBoot(){if(!SEAL_ON)return;SEAL_BOOT_T=null;try{if(typeof journey!=="function"||!journey())return;if(navKey(location.hash)!=="/")return}catch(e){return}
  if(document.body.classList.contains("xqt-on")||document.querySelector("#sheet,.modal,.rfx,.qsfx,#preov,.kx")){if(++SEAL_BOOT_N<20)SEAL_BOOT_T=setTimeout(sealBoot,3000);return}
  if(!store.get("sealIntro",0)){const old=sealHadOld(),nw=sealGoldCheck({boot:1});store.set("sealIntro",Date.now());if(old)sealIntroSheet(nw);return}
  sealGoldCheck({fx:true})}
function sealBootSoon(ms){if(SEAL_BOOT_T)clearTimeout(SEAL_BOOT_T);SEAL_BOOT_T=setTimeout(sealBoot,ms||2500)}
addEventListener("hashchange",()=>{try{if(navKey(location.hash)==="/")sealBootSoon(2500)}catch(e){}});
setTimeout(()=>{try{if(navKey(location.hash)==="/")sealBootSoon(1500)}catch(e){}},3000);
