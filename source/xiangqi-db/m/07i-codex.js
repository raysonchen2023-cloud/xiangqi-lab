/* ================= 📚 千秋大百科・🎁 珍品開箱（Gemini 評估 11/8，開發者核准）=================
   收集品分散在很多地方（修為、官階、寶物、珍品、印章、路引、稱號、棋話、正文、消寒圖…），玩家記不住哪裡拿、有什麼用。
   開發者決定不硬合併系統，只做一個總入口 #/codex：每類一張卡（圖示、名稱、已收 X／Y 進度條、一句白話：是什麼、去哪裡拿、有什麼用），點了跳到那個收藏冊或取得的地方。
   CODEX＝類別清單；X／Y 都從現有存檔、現有資料檔算，算不出總數的類別只寫已收數（不編造）。
   頂部總完成度＝有總數的收集類別各自完成比例的平均（修為、官階是等級，不算進去）。
   入口：我的角色頁底下的大百科小卡（07-legend.js Me 呼叫 codexMeCard）、星槎行囊（07f-ship.js ShipBag）；小幫手 09-askbot.js 一條。
   開發者 11/9（story/收集系統合併方案_1109.md）：擂台印、戰役印、路引、《千秋棋話》頁數合成一張「🏮 千秋印」（07i2-seal.js）；珍品藏局併進珍品卡、棋罐併進石桌往事卡、千秋盃名次併進稱號卡；21 類 → 15 類。
     #/codex/seal＝打開大百科後直接翻開千秋印譜。稱號表分「千秋印」和「其他」兩組。

   開箱特效 relicFx(era,it,o)：所有「得到一件新珍品」都走這裡——盒子打開、光芒、珍品圖放大、名稱和一句來歷、鐘聲（沿用 01-board.js 的 bellHit／matSound，不加新檔）。
   呼叫點：relicDrop（07-legend.js：園子長卷、攔路棋客破陣、雲河棋寇擋住）、relicSightDrop（07v-relicdrop.js：渡口景點、驛站小牌；外框依等級加 class rfx-common／rare／legend，重複加 rfx-dup，樣式在 07v）、cjRelic（07c-canju.js：一盞茶連續 7 天；07g-battle.js 戰役集滿傳 quiet，跳稱號卡前才播）。
   點一下跳過動畫，再點一下收下；有 prefers-reduced-motion 就不動、直接顯示。回傳 Promise，關掉才 resolve；同時來好幾件就排隊。
   一般寶物（提示棋、悔棋符、將令…）不開箱，維持原本的小提示。 */

/* ---------- 開箱 ---------- */
const RFX_C={common:"#E8C887",rare:"#7FB2F0",legend:"#FFD45A"};
let RFX_Q=Promise.resolve();
function relicFx(era,it,o){if(!it)return Promise.resolve();const p=RFX_Q.then(()=>relicFx0(era,it,o||{})).catch(()=>{});RFX_Q=p;return p}
function rfxCss(){if(document.getElementById("rfxCss"))return;const s=document.createElement("style");s.id="rfxCss";s.textContent=`
.rfx{position:fixed;inset:0;z-index:9000;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;overflow:hidden;text-align:center;color:#FFF7E6;cursor:pointer;-webkit-tap-highlight-color:transparent;background:radial-gradient(circle at 50% 42%,rgba(60,30,8,.95),rgba(0,0,0,.97) 70%);animation:rfxIn .25s ease-out both;outline:none}
.rfx.out{animation:rfxOut .22s ease-in forwards}
.rfx-st{position:relative;width:260px;height:250px;flex:none}
.rfx-ray{position:absolute;left:50%;top:46%;width:560px;height:560px;margin:-280px 0 0 -280px;border-radius:50%;background:repeating-conic-gradient(from 0deg,var(--rc) 0 7deg,transparent 7deg 20deg);-webkit-mask:radial-gradient(circle,#000 0 14%,transparent 60%);mask:radial-gradient(circle,#000 0 14%,transparent 60%);opacity:0;animation:rfxRay .9s .75s ease-out forwards,rfxSpin 16s .75s linear infinite;pointer-events:none}
.rfx-glow{position:absolute;left:50%;top:46%;width:240px;height:240px;margin:-120px 0 0 -120px;border-radius:50%;background:radial-gradient(circle,var(--rc),transparent 65%);opacity:0;animation:rfxGlow .8s .7s ease-out forwards;pointer-events:none}
.rfx-box{position:absolute;left:50%;bottom:8px;width:150px;height:100px;margin-left:-75px;animation:rfxShake .6s .05s ease-in-out both,rfxBoxOut .45s 1.25s ease-in forwards}
.rfx-base{position:absolute;left:0;right:0;top:26px;bottom:0;border-radius:6px 6px 12px 12px;background:linear-gradient(#A3301F,#68140E);border:3px solid #D9AE45;box-shadow:inset 0 -10px 18px rgba(0,0,0,.35),0 10px 24px rgba(0,0,0,.5)}
.rfx-base::before{content:"";position:absolute;left:50%;top:8px;width:26px;height:30px;margin-left:-13px;border-radius:5px;background:linear-gradient(#F5D77A,#B98A22);box-shadow:0 0 0 2px #7A5512}
.rfx-base::after{content:"";position:absolute;left:12px;right:12px;bottom:10px;height:3px;border-radius:2px;background:#D9AE45;opacity:.7}
.rfx-lid{position:absolute;left:-7px;right:-7px;top:0;height:32px;border-radius:9px 9px 4px 4px;background:linear-gradient(#C2402B,#7E1B12);border:3px solid #D9AE45;transform-origin:8% 100%;animation:rfxLid .55s .7s cubic-bezier(.3,1.5,.5,1) forwards}
.rfx-it{position:absolute;left:50%;top:46%;width:180px;height:180px;margin:-90px 0 0 -90px;display:flex;align-items:center;justify-content:center;font-size:96px;opacity:0;transform:translateY(70px) scale(.12);animation:rfxItem .75s .85s cubic-bezier(.2,1.35,.4,1) forwards;filter:drop-shadow(0 0 16px var(--rc)) drop-shadow(0 6px 10px rgba(0,0,0,.5))}
.rfx-sp{position:absolute;left:50%;top:46%;width:8px;height:8px;margin:-4px;border-radius:50%;background:var(--rc);box-shadow:0 0 8px var(--rc);opacity:0;animation:rfxSp 1.1s var(--d) ease-out forwards;pointer-events:none}
.rfx-tx{max-width:360px;margin-top:6px;opacity:0;transform:translateY(10px);animation:rfxTxt .45s 1.35s ease-out forwards}
.rfx-fr{font-size:13px;opacity:.82;margin-bottom:4px}
.rfx-rk{display:inline-block;padding:2px 12px;border-radius:999px;font-size:12.5px;font-weight:700;color:#fff}
.rfx-nm{margin:8px 0 6px;font-family:var(--serif);font-size:27px;font-weight:900;color:var(--rc);text-shadow:0 2px 10px rgba(0,0,0,.6)}
.rfx-ds{margin:0;font-size:15.5px;line-height:1.8}
.rfx-ct{margin:8px 0 0;font-size:12.5px;opacity:.75}
.rfx-tap{margin-top:16px;font-size:13px;opacity:0;animation:rfxTap 1.6s 1.9s ease-in-out infinite}
.rfx.end .rfx-ray,.rfx.end .rfx-glow,.rfx.end .rfx-box,.rfx.end .rfx-lid,.rfx.end .rfx-it,.rfx.end .rfx-sp,.rfx.end .rfx-tx,.rfx.end .rfx-tap{animation:none}
.rfx.end .rfx-box,.rfx.end .rfx-sp{opacity:0}.rfx.end .rfx-it,.rfx.end .rfx-tx{opacity:1;transform:none}.rfx.end .rfx-glow{opacity:.55}.rfx.end .rfx-tap{opacity:.75}
.rfx.end:not(.rm) .rfx-ray{opacity:.5;animation:rfxSpin 16s linear infinite}.rfx.rm .rfx-ray{opacity:.4}
@keyframes rfxIn{from{opacity:0}}@keyframes rfxOut{to{opacity:0}}
@keyframes rfxShake{0%{transform:translateY(40px);opacity:0}30%{transform:none;opacity:1}45%{transform:rotate(-4deg)}60%{transform:rotate(4deg)}75%{transform:rotate(-2deg)}100%{transform:none;opacity:1}}
@keyframes rfxBoxOut{to{transform:translateY(40px) scale(.9);opacity:0}}
@keyframes rfxLid{to{transform:translate(-34px,-80px) rotate(-40deg);opacity:0}}
@keyframes rfxItem{55%{opacity:1}to{opacity:1;transform:none}}
@keyframes rfxRay{to{opacity:.5}}@keyframes rfxSpin{to{transform:rotate(360deg)}}@keyframes rfxGlow{40%{opacity:1}to{opacity:.55}}
@keyframes rfxSp{0%{opacity:0;transform:none}15%{opacity:1}to{opacity:0;transform:translate(var(--x),var(--y)) scale(.4)}}
@keyframes rfxTxt{to{opacity:1;transform:none}}@keyframes rfxTap{0%,100%{opacity:.35}50%{opacity:.85}}`;document.head.append(s)}
/* 珍品說明的第一句＝「一句來歷」 */
const rfxLine=d=>{const s=String(d||"").trim(),m=s.match(/^[^。！？]*[。！？]/);return m?m[0]:s};
function rfxSound(rm){try{if(typeof sndOn==="function"&&!sndOn())return;if(typeof withAudio!=="function"||typeof bellHit!=="function")return;
  withAudio(()=>{const t=AC.currentTime+.03;if(!rm&&typeof matSound==="function"&&typeof SND_MAT!=="undefined"&&SND_MAT.wood)try{matSound(true,SND_MAT.wood)}catch(e){}
    const a=rm?0:.72;bellHit(t+a,784);bellHit(t+a+.18,1175);bellHit(t+a+.36,1568)})}catch(e){}}
function relicFx0(era,it,o){return new Promise(done=>{rfxCss();const rm=matchMedia("(prefers-reduced-motion: reduce)").matches,rc=RFX_C[it.rarity]||RFX_C.common;
  const rk=(typeof RELIC_RK!=="undefined"&&RELIC_RK[it.rarity])||["珍品","#8A7A66"],en=typeof relicEra==="function"?relicEra(era):eraLabel(era);
  const img=typeof relicImg==="function"?relicImg(era,it.id):"🏺",sp=[0,1,2,3,4,5,6,7,8,9].map(i=>{const a=i/10*Math.PI*2,r=110+(i%3)*28;return`<i class="rfx-sp" style="--x:${Math.round(Math.cos(a)*r)}px;--y:${Math.round(Math.sin(a)*r)}px;--d:${(.85+(i%4)*.06).toFixed(2)}s"></i>`}).join("");
  const d=document.createElement("div");d.className="rfx rfx-"+(it.rarity||"common")+(o.dup?" rfx-dup":"")+(rm?" end rm":"");d.tabIndex=0;d.setAttribute("role","dialog");d.setAttribute("aria-modal","true");d.setAttribute("aria-label","得到珍品："+(it.name||""));d.style.setProperty("--rc",rc);
  d.innerHTML=`<div class="rfx-st"><div class="rfx-ray"></div><div class="rfx-glow"></div>${rm?"":sp}<div class="rfx-box"><div class="rfx-base"></div><div class="rfx-lid"></div></div><div class="rfx-it">${img}</div></div>
    <div class="rfx-tx" aria-live="polite"><div class="rfx-fr">🎁 ${esc(o.from||"得到一件珍品")}</div><span class="rfx-rk" style="background:${rk[1]}">${esc(rk[0])}・${esc(en)}</span><div class="rfx-nm">${esc(it.name||"")}</div><p class="rfx-ds">${esc(rfxLine(it.desc))}</p>${o.cnt?`<p class="rfx-ct">${esc(o.cnt)}</p>`:""}</div>
    <div class="rfx-tap">點一下收下</div>`;
  document.body.append(d);try{d.focus({preventScroll:true})}catch(e){}rfxSound(rm);
  let end=rm,shut=false;const T=setTimeout(()=>{end=true;d.classList.add("end")},2000);
  const close=()=>{if(shut)return;shut=true;clearTimeout(T);d.classList.add("out");setTimeout(()=>{d.remove();done()},230)};
  const tap=e=>{if(e){e.preventDefault();e.stopPropagation()}if(!end){end=true;clearTimeout(T);d.classList.add("end");return}close()};
  d.addEventListener("click",tap);d.addEventListener("keydown",e=>{if(e.key==="Escape"){e.preventDefault();close()}else if(e.key==="Enter"||e.key===" ")tap(e)})})}

/* ---------- 千秋大百科 ---------- */
const CODEX_GRP=[["grow","🌱 成長"],["item","🎒 寶物"],["seal","🏮 千秋印譜"],["book","🏺 收藏冊"],["story","📖 故事"]];
const cxN=o=>Object.keys(o||{}).length,cxTry=(f,z)=>{try{const r=f();return r==null?z:r}catch(e){return z}};
/* 從我的角色頁打開棋盤、棋譜、秘境棋友（那三個清單在 Profile 裡，我的角色頁的花窗會轉按過去） */
function cxMe(c){location.hash="#/me";let n=0;const f=()=>{const b=document.querySelector(`.mw[data-c="${c}"]`);if(b)b.click();else if(++n<10)setTimeout(f,120)};setTimeout(f,160)}
/* 回饋 860（入口盤查後續）：「寶物」卡原本只換到 #/me、要找 .mw[data-c="items"]，可是那頁沒有這顆，點了沒反應。
   改成打開書齋那張寶物小卡（07z4 mzItemSheet）：已經在 #/me 就直接開；不在就先換過去，等那頁畫好（換頁會關掉小卡）再開 */
function cxItems(){const op=()=>{if(typeof mzItemSheet==="function")mzItemSheet("bag");else toast("對局時按「🎒 寶物」就能用")};
  if(navKey(location.hash)==="/me")return op();location.hash="#/me";let n=0;
  const f=()=>{if(navKey(location.hash)!=="/me")return;if(document.querySelector("#view .me2"))setTimeout(()=>{if(navKey(location.hash)==="/me")op()},120);else if(++n<40)setTimeout(f,120)};setTimeout(f,160)}
let CX_BT_P=null;
function cxBattleTotal(){const B=cxTry(()=>BATTLE_CARDS,null);if(B&&cxN(B))return Promise.resolve(Object.values(B).reduce((a,x)=>a+(x||[]).length,0));
  return CX_BT_P||(CX_BT_P=fetch(typeof BTL_FILE!=="undefined"?BTL_FILE:"data/canju/battles.json").then(r=>r.ok?r.json():null).then(j=>j&&j.eras?Object.values(j.eras).reduce((a,x)=>a+(x||[]).filter(c=>c&&!(typeof BTL_HIDE!=="undefined"&&BTL_HIDE.includes(c.id))&&((typeof BTL_VOL_ON!=="undefined"&&BTL_VOL_ON)||(c.vol||1)<2)).length,0):null).catch(()=>{CX_BT_P=null;return null}))}
/* 稱號：照各系統自己的條件逐一對（06-cpu.js XQ_TITLE 那幾個來源） */
function cxTitles(){const L=[];let grp="seal";const add=(t,how,got)=>L.push({t,how,got:!!got,g:grp});
  /* 🏮 千秋印這一組（開發者 11/9：條件照舊，只是說法改成千秋印的邊） */
  add("千秋印主","13 方千秋印都鑄成金印",cxTry(()=>sealTitle(),""));
  const an=cxTry(()=>cxN(arenaStamps()),0);cxTry(()=>ARENA_TITLES,[]).slice().reverse().forEach(([k,t])=>add(t,`千秋印的「擂台」那一邊亮了 ${k} 方（打贏 ${k} 位擂主）`,an>=k));
  const BT=cxTry(()=>store.get("battleTitle",{})||{},{});Object.keys(BT).forEach(k=>add(cxTry(()=>shipShort(k),eraLabel(k))+"・百戰之將","這一朝千秋印的「古戰場」那一邊亮了（一卷 5 場都打下來）",true));
  if(!cxN(BT))add("〇・百戰之將","某一朝千秋印的「古戰場」那一邊亮了（一卷 5 場都打下來；每朝一個）",false);
  const GD=cxTry(()=>store.get("battleGrand",{})||{},{});Object.keys(GD).forEach(k=>add(cxTry(()=>shipShort(k),eraLabel(k))+"・千古名將","這一朝古戰場全部打下來（千秋印的古戰場那一邊描金）",true));
  add("行萬里路","13 方千秋印的「輿圖」那一邊都亮了（13 條路線都走完）",cxTry(()=>yuTitle(),""));
  grp="etc";const G=cxTry(()=>Object.values(cupGot()),[]),cur=cxTry(()=>cupTitle(),"");
  add("本週擂主","千秋盃拿到冠軍，7 天內掛著",cur==="本週擂主");add("千秋擂主","千秋盃拿過一次冠軍",G.includes(1));add("三屆擂主","千秋盃拿過三次冠軍",G.filter(x=>x===1).length>=3);add("擂台常客","千秋盃參加 4 屆以上",G.length>=4);
  const jn=cxTry(()=>jarN(),0);cxTry(()=>JAR_TITLES,[]).slice().reverse().forEach(([k,t])=>add(t,`棋罐收到 ${k} 子`,jn>=k));
  add("領令先鋒","隱藏殘局累積拿到 12 枚將令",cxTry(()=>jHidGot(),0)>=12);add("棋史通","13 張棋史卡都不看答案解開 1 題",cxTry(()=>histTitle(),""));
  add("九九消寒","九九消寒圖 81 瓣都染完",cxTry(()=>xhTitle(),""));
  /* 開發者 11/11 hspx：車輪戰朱印以上（中心第 7 級以上）的五個成就也是稱號（08s-simul.js SIM_ACH） */
  {const A=cxTry(()=>simLs("simulAch")||{},{});cxTry(()=>SIM_ACH,[]).filter(x=>x[4]).forEach(([k,nm,how])=>add(nm,`車輪戰「${nm}」拿到朱印以上（中心第 7 級以上）：${how}`,A[k]&&A[k].tier>=2))}
  return L}
function cxTitleSheet(){const L=cxTitles(),n=L.filter(x=>x.got).length,top=cxTry(()=>window.XQ_TITLE(),""),G=cxTry(()=>cupGot(),{});
  const row=x=>`<div class="item"${x.got?"":' style="opacity:.55"'}><span class="lb" style="font-size:20px">${x.got?"🏅":"🔒"}</span><span class="tx"><b>${esc(x.t)}</b><span>${esc(x.how)}</span></span></div>`;
  sheet(`🏅 稱號（已得 ${n}）`,b=>{b.innerHTML=`<p class="muted" style="font-size:13px;line-height:1.6;margin:0 0 8px">稱號是各種收集集滿的獎勵。大廳裡別人點你的資料卡，會看到你最優先的一個${top?`：現在是「${esc(top)}」`:""}。</p>
    <div class="sec-t">🏮 千秋印</div><div class="items" style="padding:0">${L.filter(x=>x.g==="seal").map(row).join("")}</div>
    <div class="sec-t">🏆 千秋盃、棋罐與其他</div><div class="items" style="padding:0">${L.filter(x=>x.g!=="seal").map(row).join("")}</div>
    <p class="muted" style="font-size:12.5px;margin:8px 2px 0">🏆 千秋盃：參加了 ${cxN(G)} 屆（每週六下午的 16 強擂台賽，打進十六強以上就有獎）　<a href="#/cup">看千秋盃 ›</a></p>`})}
/* 類別清單：ic 圖示、nm 名稱、g 分組、say 一句白話、v()＝{x 已收, y 總數（算不出就不給）, s 補充}、go 點了去哪、lv＝等級類（不算進總完成度） */
const CODEX=[
  {id:"xp",g:"grow",ic:"🀄",nm:"修為",lv:1,say:"下棋、解題、過關都會加修為；等級越高，每天送的提示棋越多。",v:()=>{const I=xpInfo();return{x:I.L,y:100,s:`Lv ${I.L}・${I.title}`,u:"級"}},go:()=>xpSheet()},
  {id:"rank",g:"grow",ic:"🏛",nm:"官階",lv:1,say:"挑戰電腦的積分越高，官階越高（九品升到一品）；官名跟著朝代換。",v:()=>{const R=rankInfo();return{x:10-R.g,y:9,s:R.name,u:"階"}},go:()=>rankSheet()},
  {id:"items",g:"item",ic:"💡",nm:"寶物",say:"提示棋、悔棋符在對局時按「🎒 寶物」就能用；將令拿去驛站的點將台換東西；預習卷附在石桌往事的關卡裡。每盤棋下完都有機會掉。",v:()=>{const H=hintInfo();return{s:`💡 提示棋 ${H.left+(H.bonus||0)}・↶ 悔棋符 ${undoLeft()}・🪙 將令 ${cxTry(()=>lingN(),0)}・📜 預習卷 ${cxTry(()=>cxN(prevOwn()),0)}`}},go:()=>cxItems()},
  {id:"seal",g:"seal",ic:"🏮",nm:"千秋印",say:"每一朝一方千秋印，四邊是四道關：📘 棋理、🏯 擂台、⚔ 古戰場、🧭 輿圖。過一道亮一邊，四邊都亮鑄成金印。以前的擂台印、戰役印、路引、《千秋棋話》頁數都在這裡。",v:()=>({x:sealLitN(),y:SEAL_SIDE_TOTAL(),u:"邊",s:`金印 ${sealGoldN()}／13 方`}),go:()=>sealBook()},
  {id:"relic",g:"book",ic:"🏺",nm:"朝代珍品",say:"13 個朝代的文物，每朝 10 件，分普通、稀有、傳說三級。在園子、渡口、驛站到處點點看會撿到；一盞茶連續 7 天、古戰場集滿一卷也會送。每件藏著一局殘局，不看答案解開就打上紅色「已解」。",v:async()=>{const R=await relicsData(),M=relicsMine(),Z=relicSolved(),CJ=Object.values(R).flat().filter(x=>x.cj);return{x:Object.keys(R).reduce((a,e)=>a+(M[e]||[]).filter(id=>(R[e]||[]).some(z=>z.id===id)).length,0),y:Object.values(R).reduce((a,x)=>a+x.length,0),u:"件",s:CJ.length?`藏局解開 ${CJ.filter(x=>Z[x.id]).length}／${CJ.length} 局`:""}},go:()=>{location.hash="#/me/relics"}},
  {id:"boards",g:"book",ic:"🎁",nm:"棋盤",say:"驛站的秘境棋友送的：跟他下到賽後評等 S 就送一張；稀有的拓本能拿去石桌換獎勵。",v:()=>({x:bag().boards.length,u:"張"}),go:()=>cxMe("b")},
  {id:"records",g:"book",ic:"📜",nm:"棋譜",say:"驛站、茶杯底下、漂流瓶偶爾撿到的實戰棋譜；可以一步一步讀、寫心得。",v:()=>({x:bag().records.length,u:"份"}),go:()=>cxMe("r")},
  {id:"secrets",g:"book",ic:"🤝",nm:"秘境棋友",say:"藏在各朝代園子某個角落的歷史人物；找到他以後去驛站跟他下棋。",v:()=>({x:cxN(jSecrets()),y:SECRETS.length,u:"位"}),go:()=>cxMe("s")},
  {id:"bond",g:"book",ic:"🌸",nm:"園子棋友",say:"園子裡的女棋手：常跟她下棋、幫她的委託就加羈絆，到第 3 級她會寄信到驛站。",v:()=>{const M=npcBonds(),W=NPC_W();return{x:W.filter(n=>M[n.id]&&M[n.id].m).length,y:W.length,u:"位"}},go:()=>npcBondBook()},
  {id:"hist",g:"book",ic:"📜",nm:"棋史卡",say:"在石桌往事的園子裡點石桌，收到那一朝的棋史卡；13 張都解開 1 題古法殘局，得到「棋史通」。",v:()=>({x:histSeenN(),y:13,u:"張",s:`古法殘局解開 ${histDoneN()}／13 朝`}),go:()=>histBook()},
  {id:"title",g:"seal",ic:"🏅",nm:"稱號",say:"千秋印亮滿、千秋盃名次、棋罐、將令、棋史卡、消寒圖集滿都有稱號；大廳裡別人看得到。",v:()=>{const L=cxTitles().filter(x=>x.got),cp=cxN(cxTry(()=>cupGot(),{}));return{x:L.length,u:"個",s:(L.length?L.slice(0,3).map(x=>x.t).join("、")+(L.length>3?"…":""):"")+(cp?`${L.length?"・":""}千秋盃 ${cp} 屆`:"")}},go:()=>cxTitleSheet()},
  {id:"legend",g:"story",ic:"🪨",nm:"石桌往事・第一集",say:"說書人講的雲河鎮故事；雲河棋路每過一關，就解開下一回。每關收兵、馬、車放進棋罐（兩集共 216 子），集到門檻換寶物和稱號。",v:()=>{const S=jStars(),J=jStages(),jn=cxTry(()=>jarN(),0),jt=cxTry(()=>jarTitle(),"");return{x:J.filter(z=>S[z.id]).length,y:J.length,u:"關",s:`🫙 棋罐 ${jn}／${cxTry(()=>JAR_MAX,216)} 子${jt?"・"+jt:""}`}},go:()=>{location.hash="#/shelf/1"}},
  {id:"book2",g:"story",ic:"📜",nm:"紙譜新局・第二集",say:"第一集的關都過了才打開，故事接到明朝隆慶年間。",v:()=>{const S=jStars(),J=jStages2();return{x:J.filter(z=>S[z.id]).length,y:J.length,u:"關",s:book1Done()?"":"🔒 第一集都過了才打開"}},go:()=>{location.hash="#/shelf/2"}},
  {id:"novel",g:"story",ic:"🌌",nm:"《雲河七星》章節",say:"雲河七星的長篇故事，每一站一章；在星槎每站或船艙書架都能讀。",v:()=>({x:cxN(store.get("shipRead",{})),y:cxN(YUNHE_PICS),u:"章"}),go:()=>{SHIP_RD_BACK="#/codex";location.hash="#/ship/read"}},
  {id:"xh",g:"story",ic:"❄",nm:"九九消寒圖",say:"冬至起 81 天，每天解一題染一瓣梅花；81 瓣都染完得到「九九消寒」。",v:()=>{const N=xhNow();if(N.pre)return{x:0,s:`冬至還有 ${N.cd} 天才開始`,u:"瓣"};return{x:cxN(xhMei(N.season)),y:81,u:"瓣"}},go:()=>xhOpen()}];
/* 算每一類的 X／Y（哪一類出錯就略過，不擋整頁） */
async function codexData(){const out=[];for(const c of CODEX){let r=null;try{r=await c.v()}catch(e){r=null}if(r)out.push({...c,...r})}return out}
const cxPct=L=>{const T=L.filter(c=>!c.lv&&c.y>0);if(!T.length)return{p:0,n:0};return{p:Math.round(T.reduce((a,c)=>a+Math.min(1,(c.x||0)/c.y),0)/T.length*100),n:T.length}};
function cxCss(){if(document.getElementById("cxCss"))return;const s=document.createElement("style");s.id="cxCss";s.textContent=`
.cx-top{display:flex;align-items:center;gap:14px}.cx-ring{flex:none;width:84px;height:84px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:conic-gradient(var(--accent) calc(var(--p)*1%),var(--line) 0)}
.cx-ring b{width:66px;height:66px;border-radius:50%;background:var(--card);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;font-family:var(--serif)}
.cx-grid{display:grid;grid-template-columns:1fr;gap:8px}@media(min-width:640px){.cx-grid{grid-template-columns:1fr 1fr}}
.cx-c{display:flex;gap:10px;align-items:flex-start;width:100%;text-align:left;padding:10px 12px;border-radius:14px;border:1px solid var(--line);background:var(--card);color:inherit;font:inherit;cursor:pointer}
.cx-c:active{transform:scale(.99)}.cx-ic{flex:none;width:42px;height:42px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:24px;background:var(--bg)}
.cx-b{flex:1;min-width:0}.cx-h{display:flex;justify-content:space-between;gap:8px;align-items:baseline}.cx-h b{font-size:15.5px}.cx-h span{font-size:13px;white-space:nowrap;color:var(--accent);font-weight:700}
.cx-c .st-bar{display:block;margin:6px 0 4px;background:var(--bg)}.cx-c .st-bar i{background:var(--accent)}.cx-c.full .st-bar i{background:#C8962E}.cx-s{font-size:12.5px;color:var(--accent);margin:3px 0 2px}.cx-say{font-size:12.5px;line-height:1.6}.cx-c.full{border-color:#C8962E}.cx-c.full .cx-ic{background:#C8962E22}
.cx-me{display:flex;align-items:center;gap:12px;width:100%;text-align:left;font:inherit;color:inherit;cursor:pointer}.cx-me .cx-ic{width:46px;height:46px}`;document.head.append(s)}
function cxCard(c){const has=c.y>0,f=has&&c.x>=c.y,pc=has?Math.round(Math.min(1,c.x/c.y)*100):0;
  return`<button class="cx-c${f?" full":""}" data-cx="${c.id}"><span class="cx-ic">${c.ic}</span><span class="cx-b"><span class="cx-h"><b>${esc(c.nm)}</b><span>${c.lv?esc(c.s||""):has?`已收 ${c.x}／${c.y}${c.u?" "+c.u:""}`:c.x!=null?`已收 ${c.x}${c.u?" "+c.u:""}`:""}</span></span>
    ${has?`<span class="st-bar"><i style="width:${pc}%"></i></span>`:""}${!c.lv&&c.s?`<div class="cx-s">${esc(c.s)}</div>`:""}<div class="cx-say muted">${esc(c.say)}</div></span><span class="muted" style="align-self:center">›</span></button>`}
function Codex(v){setTop("📚 千秋大百科","#/me");if(typeof setTabs==="function")setTabs(false);v.className="view";cxCss();
  if(/^#\/codex\/seal/.test(location.hash||"")&&typeof sealBook==="function")setTimeout(()=>{if(v.isConnected)sealBook()},350);   /* #/codex/seal：直接翻開千秋印譜（小幫手、舊的集章簿說明用） */
  v.innerHTML=`<div class="pad" style="padding-bottom:28px"><div class="card muted" style="text-align:center;padding:24px 12px">正在翻收藏冊…</div></div>`;
  codexData().then(L=>{if(!v.isConnected)return;const P=cxPct(L),full=L.filter(c=>!c.lv&&c.y>0&&c.x>=c.y).length;
    v.innerHTML=`<div class="pad" style="padding-bottom:28px"><div class="card cx-top"><span class="cx-ring" style="--p:${P.p}" role="img" aria-label="總完成度 ${P.p}%"><b>${P.p}%</b></span><div><b style="font-size:18px;font-family:var(--serif)">總完成度</b>
      <div class="muted" style="font-size:13px;line-height:1.6">有總數的 ${P.n} 類收集，各類完成比例的平均${full?`・已經集滿 ${full} 類`:""}。<br>修為、官階是等級，不算進去；寶物、棋盤、棋譜這些沒有上限的只寫已收。</div></div></div>
      ${CODEX_GRP.map(([g,t])=>{const G=L.filter(c=>c.g===g);return G.length?`<div class="sec-t">${t}</div><div class="cx-grid">${G.map(cxCard).join("")}</div>`:""}).join("")}
      <button class="btn ghost" id="cxReplay" style="width:100%;margin-top:12px">🎁 再看一次開箱</button>
      <p class="muted" style="font-size:12.5px;line-height:1.7;margin-top:12px">點一張卡，直接打開那個收藏冊或去拿的地方。</p></div>`;
    /* 開發者 11/8：開箱動畫平常要撿到新珍品才看得到；這顆拿已經有的珍品重播一次（沒有就借一件給你看），不會多給東西 */
    {const rb=v.querySelector("#cxReplay");if(rb)rb.onclick=async()=>{if(typeof vibrate==="function")vibrate(5);try{const R=await relicsData(),M=relicsMine(),own=[];for(const e in M)for(const id of M[e]||[]){const it=(R[e]||[]).find(z=>z.id===id);if(it)own.push([e,it])}
      let pick=own.length?own[Math.floor(Math.random()*own.length)]:null;if(!pick){const es=Object.keys(R).filter(e=>(R[e]||[]).length);if(es.length){const e=es[Math.floor(Math.random()*es.length)];pick=[e,R[e][Math.floor(Math.random()*R[e].length)]]}}
      if(pick)relicFx(pick[0],pick[1],{from:own.length?"重播開箱・你收藏的珍品":"開箱預覽・還沒收到的珍品"});else toast("珍品資料還沒載好")}catch(e){toast("暫時沒辦法播放")}}}
    v.querySelectorAll("[data-cx]").forEach(b=>b.onclick=()=>{const c=CODEX.find(z=>z.id===b.dataset.cx);if(!c)return;if(typeof vibrate==="function")vibrate(5);try{c.go()}catch(e){toast("這一類暫時打不開")}})}).catch(e=>{if(v.isConnected)v.innerHTML=`<div class="pad"><div class="card muted">${esc(e.message||"載入失敗")}</div></div>`});return{}}
/* 我的角色頁底下的小卡（07-legend.js Me） */
function codexMeCard(){cxCss();const d=document.createElement("div");d.className="card";d.innerHTML=`<button class="cx-me" id="cxMe"><span class="cx-ic">📚</span><span style="flex:1;min-width:0"><b>千秋大百科</b><br><span class="muted" style="font-size:13px" id="cxMeS">所有收藏一次看：已收多少、去哪裡拿、有什麼用</span></span><span class="muted">›</span></button>`;
  d.querySelector("#cxMe").onclick=()=>{if(typeof vibrate==="function")vibrate(5);location.hash="#/codex"};
  codexData().then(L=>{const s=d.querySelector("#cxMeS");if(s&&s.isConnected)s.textContent=`總完成度 ${cxPct(L).p}%・${L.length} 類收藏：已收多少、去哪裡拿、有什麼用`}).catch(()=>{});return d}
