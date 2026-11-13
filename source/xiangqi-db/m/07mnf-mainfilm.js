/* ================= 🎬 主線電影播放器（開發者 11/13 新手體驗第一波；定案 story/新手體驗定案_141_兩輪討論.md 第九節、分鏡 story/chatgpt_app/回覆_141d 第 2 節）=================
   跟開場電影（07bh-blackhole.js 的 OP_FILM1／bhxFilm）同一種「即時演出」：水墨場景圖滿版＋Ken Burns 推拉（kb）＋粒子（fx）＋書法字幕＋配樂，不是影片檔。
   bhxFilm 綁著黑洞配樂的 OP 時鐘和 BHX_PG 圖表；這裡做成通用版：mnfPlay(filmId,{onDone,...})，自己的時鐘（performance.now，可暫停）、自己的配樂播放器（現有曲目 data/bgm/<朝代>/）。
   電影資料 MNF_FILMS[id]＝{end 秒, mus 配樂（data/bgm/ 底下的相對路徑）, card 跳過後的任務卡 {t 大字, b 按鈕}, shots:[鏡頭…]}；
   鏡頭＝{at 秒, img 圖代號（MNF_IMG）, kb [[縮放,焦點x%,焦點y%] 起, 迄], fx 粒子, src 粒子源頭（圖上像素）, say [[秒,字幕]], who [[秒,角色,"l"|"r"]], sfx [[秒,音效]],
          board 秒＝星線棋盤（沿用 07bh bhxBoardSvg）, bp [中心 y, 寬], big [秒,大字], seal [秒,印文], qte 危機題代號（到這個鏡頭就定格解題，解完才往下）}。
   fx：mist 晨霧、glow 金光上升、stars 星點、whirl 墨色漩渦、river 河光流動、ink 墨石暈開、burst 一次炸開、gates 十三道星門、frz 定格（只剩霧在動）。
   字幕（開發者定）：每個畫面最多一行、8～16 字，像電影台詞；同一個鏡頭的兩句至少隔 2 秒，後一句換掉前一句。
   跳過：右上角常駐「略過」，電影隨時可以跳；危機解題不能跳（解題時「略過」藏起來）。跳過後一定先顯示一張任務卡（大字寫現在要做什麼），按了才往下。
   危機解題 mnfQte：畫面定格、棋盤從場景浮出（沿用 01-board.js 的 Board 畫棋盤、XQCore 判合法與勝負，不另寫規則）；只放 4～6 顆子、一開始就選起要動的那顆、合法落點發光；
     上方大字「開路！」；走錯不算失敗，畫面倒帶重來；錯 2 次給提示（一句話＋藍框）；錯 3 次出現「看軍師演示」，看完也算通過（demo）。解對＝棋子化光，接回電影。
     勝負照殘局頁的判法：對方一步都不能走（將死或困斃）就算解開，所以多解的題（例如仕、相讓開一步，四個方向都行）也照樣算對。
   殘局解開儀式 mnfSolveRite（開發者 11/13 看小說第一章追加）：老人手掌移開 → 石桌邊一小段刻痕泛起青玉色微光（只一小點）→ 殘譜翻開，空著的一行逐字浮現墨色。
     圖用小說插畫 data/shipmap/novel/ch01_3.webp（石桌與老人），殘譜用程式畫；行數、刻痕段數照「千秋殘局」真實進度（07f-ship.js store "shipSolved"，見 mnfRiteCount），不另造數字。
     主線每章危機、星槎主場殘局都能叫：mnfSolveRite({k:朝代,id:題號,cn:走法,state:"new"|"old"|"demo",onDone})。
   減少動態（prefers-reduced-motion）：不推拉、不放粒子，字幕直接出現。
   名稱前綴 mnf／MNF（m/*.js 共用全域，11/13 已 grep 確認沒人用）。 */
const MNF_W=768,MNF_H=1376;
/* 只用現有的圖（開發者：不出新圖）；w、h＝原圖尺寸（cover 換算用） */
const MNF_IMG={home:{u:"data/homemap/home.webp"},table:{u:"data/shipmap/page_canju.webp"},sail:{u:"data/shipmap/page_sail.webp"},port:{u:"data/shipmap/port_classic.webp"},
  whirl:{u:"data/story0/s0_5.webp"},river:{u:"data/story0/s0_6.webp"},stone:{u:"data/story0/s0_7.webp"},ship:{u:"data/story0/s0_3b.webp"},
  rite:{u:"data/shipmap/novel/ch01_3.webp",w:1000,h:747},riteHand:{u:"data/shipmap/novel/ch01_3_hand.webp",w:1000,h:747}};   /* 殘局解開儀式：riteHand＝老人右手平按在桌緣（11/13 開發者採用的新圖，park/gen/rite_1.png 縮成 1000 寬），rite＝手已抬起移開（小說插畫原圖）；兩張同構圖、座標對齊 */
const MNF_FX=["mist","glow","stars","whirl","river","ink","burst","gates","frz"];
const MNF_SFX=["bell","star","drum","heart","gong","drip","whoosh"];
/* 第 1 章「古典・河圖初渡」三段（ChatGPT 141d 第一章分鏡表；字幕改成 8～16 字）。c1o 開章 35 秒、c1m 危機（1 步題）＋殘局解開儀式＋上船、c1e 章末 28 秒 */
const MNF_FILMS={
  c1o:{end:35,mus:"classic/zheng_1.mp3",card:{t:"開路！",b:"出發"},shots:[
    {at:0,img:"home",kb:[[1.0,50,72],[1.18,50,62]],fx:"mist",sfx:[[0.3,"bell"]],say:[[0.6,"楚河渡口，晨霧未散。"]]},
    {at:4,img:"home",kb:[[1.3,52,36],[1.7,52,30]],fx:"glow",src:[400,410],sfx:[[4.4,"star"]],say:[[4.5,"河心那艘星槎，醒了。"]],who:[[5,"guide","r"]]},
    {at:8,img:"home",kb:[[1.6,51,57],[1.9,51,55]],fx:"mist",who:[[8.3,"me","l"]],say:[[8.7,"今日，要渡第一條河。"]]},
    {at:13,img:"table",kb:[[1.0,50,62],[1.12,50,64]],fx:"ink",src:[384,900],sfx:[[13.4,"drip"]],say:[[13.6,"棋路，原來就是水路。"]],who:[[14,"guide","r"]]},
    {at:18,img:"whirl",kb:[[1.6,50,26],[1.0,50,40]],fx:"whirl",src:[384,350],sfx:[[18.3,"drum"],[20.5,"drum"],[22.5,"drum"]],say:[[18.8,"遠方河面，墨色翻湧。"]]},
    {at:25,img:"river",kb:[[1.0,50,55],[1.15,50,62]],fx:"river",src:[384,700],board:26,bp:[980,420],who:[[26.2,"me","r"]],say:[[25.6,"先替星槎開一條路！"]]},
    {at:31,img:"river",kb:[[1.15,50,62],[1.3,50,66]],fx:"frz",big:[31.3,"開路！"],sfx:[[31.3,"gong"]]}]},
  c1m:{end:8.6,mus:"classic/zheng_1.mp3",card:{t:"上船，出發！",b:"出發"},shots:[
    {at:0,img:"river",kb:[[1.2,50,62],[1.35,50,66]],fx:"ink",src:[384,900],sfx:[[0.2,"drum"]],say:[[0.4,"河口被墨石封住了。"]]},
    {at:2.6,img:"river",kb:[[1.35,50,66],[1.45,50,70]],fx:"ink",src:[384,900],sfx:[[2.8,"heart"],[3.6,"heart"],[4.4,"heart"]],say:[[2.8,"一步，就能開河。"]]},
    {at:5,img:"river",kb:[[1.45,50,70],[1.45,50,70]],fx:"frz",qte:"c1"},
    {at:5.1,img:"ship",kb:[[1.0,50,50],[1.2,50,45]],fx:"stars",src:[384,600],sfx:[[5.2,"star"]],who:[[5.4,"me","l"]],say:[[5.5,"上船，星槎要出發。"]]}]},
  c1e:{end:28,mus:"classic/zheng_6.mp3",card:{t:"收下古典之印",b:"好"},shots:[
    {at:0,img:"sail",kb:[[1.2,50,60],[1.0,50,50]],fx:"mist",who:[[0.8,"me","l"]],say:[[0.5,"渡口，已在身後。"]]},
    {at:5,img:"table",kb:[[1.0,50,62],[1.15,50,64]],fx:"glow",src:[384,900],sfx:[[5.3,"star"]],say:[[5.4,"河圖光點，落入棋盤。"],[7.6,"第一印，已經點亮。"]]},
    {at:10,img:"river",kb:[[1.35,50,18],[1.1,50,24]],fx:"gates",src:[384,260],sfx:[[10.4,"star"]],say:[[10.6,"天上浮出十三道星門。"]]},
    {at:16,img:"stone",kb:[[1.0,50,50],[1.15,50,52]],fx:"glow",src:[384,600],seal:[16.6,"古典"],sfx:[[16.6,"bell"]],who:[[17.2,"me","r"]],say:[[17,"收下這枚古典之印。"]]},
    {at:22,img:"ship",kb:[[1.3,50,45],[1.0,50,50]],fx:"stars",src:[384,500],say:[[22.5,"下一朝，就要來了。"]]}]}};
/* 危機題：預設（沒有另外指定時）＝船艙站齊轍那題 xs-classic-R（data/canju/ship-set.json），主線會照玩家本命子換成同一站那一題（07mnq mnqQteFor） */
const MNF_QTE={c1:{id:"xs-classic-R",fen:"4ka3/4a4/RP7/9/9/9/9/9/9/4K4",side:"r",line:["a7a9"],big:"開路！",say:"一步，打開河口！",hint:"看你的本命棋子：一路衝到底！",est:20}};
/* 殘局解開儀式的字幕（一行 ≤16 字） */
const MNF_RITE_TXT={press:"老人按著石桌邊。",hand:"老人的手，慢慢移開。",glow:"刻痕，亮回一小段。",line:"補上一行。",rule:"解開一盤，刻痕亮一段。",old:"這一行，早已補上。",demo:"這一行，還空著。",demo2:"下次，自己補上它。"};
const MNF={on:false,au:null,mus:"",u:{},cur:null};
/* ---------- 純計算（自動測試 xiangqi-lab/tools/test-mainquest.js 用 vm 跑）---------- */
const mnfLen=s=>[...String(s||"")].length;
/* 檢查一段電影資料：回傳問題清單（空＝沒問題） */
function mnfCheck(F,id){const P=[],N=id||"?";if(!F||!Array.isArray(F.shots)||!F.shots.length)return[N+"：沒有鏡頭"];if(!(F.end>0))P.push(N+"：沒有 end");
  if(!F.card||!F.card.t||!F.card.b)P.push(N+"：沒有跳過後的任務卡");
  F.shots.forEach((S,i)=>{const nx=i+1<F.shots.length?F.shots[i+1].at:F.end;if(!(S.at>=0)||S.at>=nx)P.push(`${N} 第 ${i+1} 個鏡頭的時間不對`);
    if(!MNF_IMG[S.img])P.push(`${N} 第 ${i+1} 個鏡頭沒有圖 ${S.img}`);if(S.fx&&!MNF_FX.includes(S.fx))P.push(`${N} 第 ${i+1} 個鏡頭的 fx 不認得：${S.fx}`);
    if(S.kb&&!(S.kb.length===2&&S.kb.every(a=>a.length===3&&a[0]>=1)))P.push(`${N} 第 ${i+1} 個鏡頭的 kb 格式不對`);
    let last=-9;for(const[t,s]of S.say||[]){const n=mnfLen(s);if(n<4||n>16)P.push(`${N} 字幕「${s}」${n} 字（要 ≤16）`);if(/\n/.test(s))P.push(`${N} 字幕「${s}」換行了`);if(t<S.at||t>=nx)P.push(`${N} 字幕「${s}」不在鏡頭時間內`);if(t-last<2)P.push(`${N} 字幕「${s}」跟前一句不到 2 秒`);last=t}
    for(const[t,k]of S.sfx||[]){if(!MNF_SFX.includes(k))P.push(`${N} 音效不認得：${k}`);if(t<S.at||t>=nx)P.push(`${N} 音效 ${k} 不在鏡頭時間內`)}
    if(S.qte&&!MNF_QTE[S.qte])P.push(`${N} 危機題不存在：${S.qte}`)});
  return P}
/* 一段電影有幾秒是看的、有沒有危機題（主線解題比例用） */
const mnfQteIn=F=>(F&&F.shots||[]).filter(S=>S.qte).map(S=>S.qte);
/* 殘局解開儀式的進度：殘譜行數＝刻痕段數＝千秋殘局（store "shipSolved"）13 站解開的題數，每站最多 per 題（07f SHIP_PER） */
function mnfRiteCount(A,route,per){A=A||{};route=route||[];per=per||3;let n=0;for(const k of route)n+=Math.min(per,Object.keys(A[k]||{}).length);return{n,all:route.length*per}}
/* 這一站的殘譜頁：per 行，照題目順序（L＝這一站的題號；不知道就照解開的先後）；回傳 [{id,on}] */
function mnfRiteRows(A,k,L,per){const E=(A||{})[k]||{},ids=L&&L.length?L.slice(0,per):Object.keys(E).sort((a,b)=>((E[a]&&E[a].at)||+E[a]||0)-((E[b]&&E[b].at)||+E[b]||0)).slice(0,per);
  const R=ids.map(id=>({id,on:!!E[id]}));while(R.length<per)R.push({id:"",on:false});return R}
/* 危機題判對錯（照殘局頁：對方一步都不能走＝解開；或跟題目的著法一樣也算對）；C＝XQCore */
function mnfQteJudge(C,b,side,f,t,want){const nb=C.make(b,f,t),o=C.opp(side),dead=!C.legal(nb,o).length;return{nb,win:dead,ok:dead||(want&&C.iccs(f,t)===want),mate:dead&&C.inCheck(nb,o)}}
/* ---------- 樣式 ---------- */
function mnfCss(){if(document.getElementById("mnfCss"))return;const s=document.createElement("style");s.id="mnfCss";s.textContent=`
#mnfPg{position:fixed;inset:0;z-index:9100;background:#05060d;color:#f6efe0;overflow:hidden;opacity:0;transition:opacity .5s;touch-action:manipulation;-webkit-user-select:none;user-select:none}
#mnfPg.on{opacity:1}
#mnfPg .mnf-st{position:absolute;inset:0;will-change:transform;transition:filter .6s}
#mnfPg .mnf-bg{position:absolute;inset:0;background:#05060d center/cover no-repeat;transition:opacity .7s}
#mnfPg .mnf-st.frz{filter:grayscale(.55) brightness(.62) contrast(1.05)}
#mnfPg .mnf-fx{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2}
#mnfPg .mnf-lb{position:absolute;left:0;right:0;height:7vh;z-index:3;pointer-events:none}
#mnfPg .mnf-lb.t{top:0;background:linear-gradient(#000,rgba(0,0,0,0))}#mnfPg .mnf-lb.b{bottom:0;background:linear-gradient(rgba(0,0,0,0),#000)}
#mnfPg .mnf-sub{position:absolute;left:0;right:0;bottom:calc(9vh + env(safe-area-inset-bottom,0px));z-index:5;text-align:center;white-space:nowrap;font:600 var(--mnfs,26px)/1.4 var(--serif,serif);letter-spacing:.1em;color:#fff7e6;text-shadow:0 2px 12px #000,0 0 3px #000;opacity:0;transform:translateY(8px);transition:opacity .7s,transform .7s;pointer-events:none}
#mnfPg .mnf-sub.on{opacity:1;transform:none}
#mnfPg .mnf-big{position:absolute;left:0;right:0;top:calc(13vh + env(safe-area-inset-top,0px));z-index:6;text-align:center;white-space:nowrap;font:900 clamp(44px,14vw,76px)/1 var(--serif,serif);letter-spacing:.2em;color:#ffe6a8;text-shadow:0 0 24px rgba(255,190,90,.75),0 4px 14px #000;opacity:0;transform:scale(1.5);transition:opacity .35s,transform .45s cubic-bezier(.2,1.4,.4,1);pointer-events:none}
#mnfPg .mnf-big.on{opacity:1;transform:none}
#mnfPg .mnf-who{position:absolute;bottom:calc(17vh + env(safe-area-inset-bottom,0px));height:min(30vh,240px);aspect-ratio:3/4;z-index:4;background:center bottom/contain no-repeat;filter:drop-shadow(0 6px 14px rgba(0,0,0,.6));opacity:0;transition:opacity .6s,transform .7s cubic-bezier(.2,1,.3,1);pointer-events:none}
#mnfPg .mnf-who.l{left:3%;transform:translateX(-40%)}#mnfPg .mnf-who.r{right:3%;transform:translateX(40%)}#mnfPg .mnf-who.on{opacity:1;transform:none;animation:mnfBob 2.6s ease-in-out .7s infinite}
@keyframes mnfBob{50%{translate:0 -6px}}
#mnfPg .mnf-k{position:absolute;right:14px;top:calc(12px + env(safe-area-inset-top,0px));z-index:8;min-width:72px;min-height:44px;padding:10px 18px;border-radius:99px;font:700 16px var(--serif,serif);color:#f2e4c4;background:rgba(0,0,0,.45);border:1px solid rgba(232,199,122,.6)}
#mnfPg .mnf-k:focus-visible,#mnfPg .mnf-card button:focus-visible,#mnfPg .mnf-demo:focus-visible{outline:3px solid #E8C77A;outline-offset:3px}
#mnfPg.qt .mnf-k{display:none}
#mnfPg .bx-bd{position:absolute;left:50%;transform:translate(-50%,-50%);pointer-events:none}
#mnfPg .bx-bd line,#mnfPg .bx-bd polyline{fill:none;stroke:rgba(236,204,128,.7);stroke-width:.34;stroke-dasharray:100;stroke-dashoffset:100;animation:mnfLn 2.2s ease-out forwards}
@keyframes mnfLn{to{stroke-dashoffset:0}}
#mnfPg .mnf-seal{position:absolute;z-index:1;transform:translate(-50%,-50%) scale(2.6) rotate(-14deg);opacity:0;width:min(34vw,150px);aspect-ratio:1;border:6px solid #b3261e;border-radius:10px;color:#b3261e;background:rgba(246,236,214,.55);display:flex;align-items:center;justify-content:center;font:900 min(10vw,44px)/1.05 var(--serif,serif);text-align:center;box-shadow:0 0 30px rgba(255,200,120,.6)}
#mnfPg .mnf-seal.on{animation:mnfStamp .55s ease forwards}
@keyframes mnfStamp{60%{opacity:1;transform:translate(-50%,-50%) scale(.92) rotate(-7deg)}100%{opacity:1;transform:translate(-50%,-50%) scale(1) rotate(-6deg)}}
#mnfPg .mnf-q{position:absolute;left:50%;top:52%;z-index:7;width:min(94vw,56vh);transform:translate(-50%,-50%);perspective:900px}
#mnfPg .mnf-qi{background:linear-gradient(#e9dcbc,#d8c59a);border:3px solid #8a5a2b;border-radius:14px;padding:8px;box-shadow:0 0 0 2px rgba(255,230,160,.5),0 20px 50px rgba(0,0,0,.7);transform-origin:50% 100%;transform:translateY(42vh) rotateX(55deg) scale(.55);opacity:0;transition:transform .9s cubic-bezier(.2,1,.3,1),opacity .6s}
#mnfPg .mnf-q.on .mnf-qi{transform:none;opacity:1}
#mnfPg .mnf-qi svg{display:block;width:100%;height:auto;touch-action:none}
#mnfPg .mnf-qs{margin:8px 0 0;text-align:center;font:800 19px/1.35 var(--serif,serif);color:#3b2a1a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#mnfPg .mnf-qh{margin:4px 0 0;text-align:center;font:800 18px/1.35 var(--serif,serif);color:#1f5fae;white-space:nowrap;min-height:0}
#mnfPg .mnf-demo{display:block;margin:8px auto 2px;min-height:48px;padding:10px 24px;border-radius:99px;border:2px solid #f2c94c;background:linear-gradient(#b3261e,#7d1611);color:#fff6dc;font:900 19px var(--serif,serif)}
#mnfPg .mnf-qw{position:relative}
#mnfPg .mnf-tg{fill:rgba(255,222,120,.55);stroke:#fff3c4;stroke-width:3;pointer-events:none;transform-box:fill-box;transform-origin:center;animation:mnfTg 1.1s ease-in-out infinite}
@keyframes mnfTg{50%{fill:rgba(255,200,80,.85);transform:scale(1.18)}}
#mnfPg .mnf-qw.rew{animation:mnfRew .5s ease}
@keyframes mnfRew{0%{filter:none;transform:none}40%{filter:sepia(.9) blur(2px) brightness(.7);transform:translateX(-10px) skewX(-4deg)}100%{filter:none;transform:none}}
#mnfPg .mnf-qw.shk{animation:mnfShk .35s}
@keyframes mnfShk{25%{transform:translateX(-7px)}50%{transform:translateX(6px)}75%{transform:translateX(-4px)}}
#mnfPg .mnf-lit{position:absolute;width:30%;aspect-ratio:1;transform:translate(-50%,-50%) scale(.2);border-radius:50%;pointer-events:none;background:radial-gradient(circle,#fffbe8 0,rgba(255,226,140,.9) 22%,rgba(255,200,90,.35) 50%,rgba(255,200,90,0) 70%);opacity:0;animation:mnfLit 1.1s ease-out forwards}
@keyframes mnfLit{30%{opacity:1}100%{opacity:0;transform:translate(-50%,-50%) scale(3.2)}}
#mnfPg .mnf-q.done .mnf-qi{transition:transform .9s ease-in,opacity .9s,filter .9s;filter:brightness(2.2) saturate(.4);opacity:0;transform:scale(1.15)}
#mnfPg .mnf-card{position:absolute;inset:0;z-index:9;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:26px;padding:24px;background:radial-gradient(circle at 50% 45%,rgba(40,24,10,.82),rgba(0,0,0,.94) 75%);opacity:0;transition:opacity .4s}
#mnfPg .mnf-card.on{opacity:1}
#mnfPg .mnf-card b{font:900 clamp(30px,9vw,48px)/1.25 var(--serif,serif);letter-spacing:.12em;color:#ffe6a8;text-align:center;text-shadow:0 0 18px rgba(255,190,90,.5)}
#mnfPg .mnf-card button{min-width:200px;min-height:56px;padding:12px 30px;border-radius:99px;border:2px solid #f2c94c;background:linear-gradient(#b3261e,#7d1611);color:#fff6dc;font:900 22px var(--serif,serif);letter-spacing:.1em}
#mnfPg .mnf-card button.g{min-height:48px;font-size:17px;background:rgba(0,0,0,.4);border-color:rgba(232,199,122,.6);color:#f2e4c4}
#mnfRite{position:fixed;inset:0;z-index:9150;background:#06070c;overflow:hidden;opacity:0;transition:opacity .5s;color:#f6efe0}
#mnfRite.on{opacity:1}
#mnfRite .rt-st{position:absolute;inset:0;transition:opacity .8s}
#mnfRite .rt-im{position:absolute;left:0;top:0;transform-origin:0 0;will-change:transform}
#mnfRite .rt-im img{display:block;position:absolute;left:0;top:0;width:100%;height:100%}#mnfRite .rt-im .rt-up{opacity:0;transition:opacity .9s ease}#mnfRite .rt-im .rt-up.on{opacity:1}
#mnfRite .rt-im{transition:filter .5s}#mnfRite .rt-im.mv{filter:blur(1.6px)}
#mnfRite .rt-dot{position:absolute;width:7%;aspect-ratio:3;transform:translate(-50%,-50%) rotate(-14deg);border-radius:50%;background:radial-gradient(closest-side,#c8ffe9,#3fcf9c 45%,rgba(40,170,130,.5) 72%,rgba(40,170,130,0));box-shadow:0 0 16px 5px rgba(60,200,160,.6);opacity:0;transition:opacity 1.2s}
#mnfRite .rt-dot.on{opacity:1;animation:mnfJade 1.8s ease-in-out 1.2s infinite}
@keyframes mnfJade{50%{filter:brightness(1.35)}}
#mnfRite .rt-bk{position:absolute;left:50%;top:44%;width:min(88vw,400px);transform:translate(-50%,-50%) scale(.85);opacity:0;transition:opacity .8s,transform .9s cubic-bezier(.2,1,.3,1);perspective:1000px}
#mnfRite .rt-bk.on{opacity:1;transform:translate(-50%,-50%)}
#mnfRite .rt-pg{position:relative;padding:22px 22px 18px;border-radius:6px;background:linear-gradient(90deg,#d9c79e,#efe3c6 8%,#efe3c6 92%,#d9c79e);box-shadow:0 18px 50px rgba(0,0,0,.7),inset 0 0 40px rgba(120,80,30,.25);color:#2a1d12}
#mnfRite .rt-cv{position:absolute;inset:0;border-radius:6px;background:linear-gradient(90deg,#5a2a16,#7a3a1e);transform-origin:0 50%;transition:transform 1s ease-in-out;backface-visibility:hidden;display:flex;align-items:center;justify-content:center;font:900 26px var(--serif,serif);color:#e8c77a;letter-spacing:.3em;writing-mode:vertical-rl}
#mnfRite .rt-bk.op .rt-cv{transform:rotateY(-170deg)}
#mnfRite .rt-h{text-align:center;font:900 20px var(--serif,serif);letter-spacing:.2em;margin:0 0 10px;color:#5a2a16}
#mnfRite .rt-r{display:flex;align-items:center;gap:10px;min-height:46px;border-bottom:1px solid rgba(90,58,26,.35);font:800 22px/1.2 var(--serif,serif);letter-spacing:.12em;white-space:nowrap}
#mnfRite .rt-r i{font-style:normal;flex:none;width:1.4em;color:#8a5a2b;font-size:16px}
#mnfRite .rt-r .ink{opacity:.18}#mnfRite .rt-r.on .ink{opacity:.85}
#mnfRite .rt-r span.c{display:inline-block;opacity:0;filter:blur(3px);transform:scale(1.4);transition:opacity .35s,filter .45s,transform .35s}
#mnfRite .rt-r span.c.on{opacity:1;filter:none;transform:none}
#mnfRite .rt-r.nw{background:linear-gradient(90deg,rgba(110,214,176,0),rgba(110,214,176,.22),rgba(110,214,176,0))}
#mnfRite .rt-mk{display:flex;gap:2px;margin:12px 0 0;justify-content:center;flex-wrap:nowrap}
#mnfRite .rt-mk u{flex:1;max-width:8px;height:8px;border-radius:2px;background:rgba(90,58,26,.25)}
#mnfRite .rt-mk u.on{background:#4fae8c;box-shadow:0 0 5px rgba(79,174,140,.8)}#mnfRite .rt-mk u.nw{animation:mnfJade 1s ease-in-out infinite;background:#9ff2cf}
#mnfRite .rt-n{margin:8px 0 0;text-align:center;font:800 17px var(--serif,serif);color:#5a3a20;white-space:nowrap}
#mnfRite .mnf-sub{position:absolute;left:0;right:0;bottom:calc(9vh + env(safe-area-inset-bottom,0px));text-align:center;white-space:nowrap;font:600 var(--mnfs,26px)/1.4 var(--serif,serif);letter-spacing:.1em;color:#fff7e6;text-shadow:0 2px 12px #000;opacity:0;transition:opacity .6s;pointer-events:none}
#mnfRite .mnf-sub.on{opacity:1}
#mnfRite .mnf-k{position:absolute;right:14px;top:calc(12px + env(safe-area-inset-top,0px));min-width:72px;min-height:44px;padding:10px 18px;border-radius:99px;font:700 16px var(--serif,serif);color:#f2e4c4;background:rgba(0,0,0,.45);border:1px solid rgba(232,199,122,.6)}
@media (prefers-reduced-motion:reduce){#mnfPg *,#mnfRite *{transition-duration:.01s!important;animation:none!important}}`;document.head.append(s)}
/* ---------- 聲音：配樂（自己一個 Audio，跟一般背景音樂分開）＋合成音效（沿用 01-board 的鐘、鼓、鑼和 07bh 的星光聲） ---------- */
function mnfMusOk(){try{return!!store.get("bgm",true)&&(typeof sxmGain!=="function"||sxmGain("bgm")>0)&&!(typeof sxmAllOff==="function"&&sxmAllOff())}catch(e){return true}}
function mnfLevel(){try{return Math.max(.05,Math.min(1,typeof sxmBgmVol==="function"?sxmBgmVol(sxmMix()):.5))}catch(e){return .5}}
function mnfBlob(rel){const u="data/bgm/"+rel;if(MNF.u[u])return Promise.resolve(MNF.u[u]);const base=typeof BGM_BASE!=="undefined"?BGM_BASE:"";
  return MNF.u[u]=fetch(base+u,base?{mode:"cors",credentials:"omit"}:undefined).then(r=>{if(!r.ok)throw 0;return r.blob()}).then(b=>MNF.u[u]=URL.createObjectURL(b)).catch(()=>{delete MNF.u[u];return null})}
function mnfMusic(rel,vol){if(!rel)return;try{if(typeof BGM!=="undefined"&&BGM.a)BGM.a.pause()}catch(e){}if(!mnfMusOk())return;
  if(!MNF.au){MNF.au=new Audio();MNF.au.loop=true;try{MNF.au.playsInline=true}catch(e){}}const a=MNF.au,v=(vol==null?1:vol)*mnfLevel();
  if(MNF.mus===rel&&!a.paused){mnfVol(vol==null?1:vol);return}MNF.mus=rel;
  const go=u=>{if(MNF.mus!==rel||!u)return;if(a.src!==u)a.src=u;a.volume=0;const p=a.play();if(p&&p.catch)p.catch(()=>{MNF.need=true});mnfVol(vol==null?1:vol,1.2)};
  const c=MNF.u["data/bgm/"+rel];if(typeof c==="string")go(c);else mnfBlob(rel).then(go);return v}
function mnfVol(v,d){const a=MNF.au;if(!a)return;const to=Math.max(0,Math.min(1,v*mnfLevel())),from=a.volume,st=performance.now(),D=(d==null?.8:d)*1000;clearInterval(MNF.vt);
  MNF.vt=setInterval(()=>{const p=Math.min(1,(performance.now()-st)/Math.max(1,D));try{a.volume=from+(to-from)*p}catch(e){}if(p>=1)clearInterval(MNF.vt)},40)}
function mnfMusicStop(d){const a=MNF.au;MNF.mus="";if(!a){mnfBgmBack();return}mnfVol(0,d==null?1:d);setTimeout(()=>{if(!MNF.mus){try{a.pause()}catch(e){}mnfBgmBack()}},((d==null?1:d)+.1)*1000)}
function mnfBgmBack(){MNF.on=false;try{if(typeof bgmSync==="function")bgmSync()}catch(e){}}
function mnfSfx(k){if(typeof withAudio!=="function"||typeof AC==="undefined")return;try{if(typeof sndOn==="function"&&!sndOn())return}catch(e){}
  withAudio(()=>{const t=AC.currentTime+.02;
    if(k==="bell"&&typeof bellHit==="function"){bellHit(t,784);bellHit(t+.5,1175)}
    else if(k==="drum"&&typeof drumHit==="function")drumHit(t,.85,55);
    else if(k==="heart"&&typeof drumHit==="function"){drumHit(t,.55,46);drumHit(t+.22,.4,46)}
    else if(k==="gong"&&typeof gongHit==="function")gongHit(t,196,2.4,true);
    else if(k==="drip"&&typeof bellHit==="function")bellHit(t,1568);
    else if((k==="star"||k==="whoosh")&&typeof opSfx==="function")opSfx(k==="star"?"lines":"suck")})}
/* 電影、解題、儀式播放中（畫面上有 #mnfPg 而且不是任務卡、或有 #mnfRite）：別的 toast、修為通知（07-legend xpChip，例如解開千秋殘局 addXP 的「+35 修為」）先排隊，
   播完或跳到任務卡再照順序一則一則顯示（不丟掉、不疊在電影字幕上）；平常照舊直接顯示（開發者 11/13 看儀式截圖） */
const MNF_Q=[];let MNF_QT=0;
function mnfBusy(){try{const p=document.getElementById("mnfPg");return!!document.getElementById("mnfRite")||!!(p&&!p.querySelector(".mnf-card"))}catch(e){return false}}
function mnfHold(fn,args,ms){MNF_Q.push([fn,args,ms]);mnfFlushSoon()}
function mnfFlushSoon(){if(MNF_QT)return;const step=()=>{MNF_QT=0;if(!MNF_Q.length)return;if(mnfBusy()){MNF_QT=setTimeout(step,400);return}const[fn,a,ms]=MNF_Q.shift();try{fn.apply(null,a)}catch(e){}if(MNF_Q.length)MNF_QT=setTimeout(step,ms)};MNF_QT=setTimeout(step,400)}
if(typeof toast==="function"){const f=toast;toast=function(m){if(mnfBusy()||MNF_Q.length)return mnfHold(f,[m],2400);return f.apply(this,arguments)}}
if(typeof xpChip==="function"){const f=xpChip;xpChip=function(t,big){if(mnfBusy()||MNF_Q.length)return mnfHold(f,[t,big],big?3400:1600);return f.apply(this,arguments)}}
/* bgmSync（01-board）：電影播的時候一般背景音樂暫停 */
if(typeof bgmSync==="function"){const f0=bgmSync;bgmSync=async function(){if(MNF.on){try{if(typeof BGM!=="undefined"&&BGM.a)BGM.a.pause()}catch(e){}return}return f0.apply(this,arguments)}}
if(typeof document!=="undefined"){document.addEventListener("visibilitychange",()=>{const a=MNF.au;if(!a||!MNF.mus)return;if(document.hidden){try{a.pause()}catch(e){}}else{const p=a.play();if(p&&p.catch)p.catch(()=>{MNF.need=true})}});
  for(const ev of["pointerdown","touchend"])document.addEventListener(ev,()=>{if(!MNF.need||!MNF.au||!MNF.mus)return;MNF.need=false;const p=MNF.au.play();if(p&&p.catch)p.catch(()=>{MNF.need=true})},{passive:true,capture:true})}
/* ---------- 角色立繪（第一版用 2D 立繪 data/xs/prev_<角色>.webp；3D 七星之後再接） ---------- */
function mnfWho(k){let me="";try{me=typeof myChar==="function"&&myChar()||""}catch(e){}if(k==="me")return me||"x_swordboy";if(k==="guide")return me==="x_swordboy"?"x_miaogirl":"x_swordboy";return k}
function mnfPre(id){const F=MNF_FILMS[id];if(!F)return;const ld=u=>{const im=new Image();im.decoding="async";im.src=u};for(const S of F.shots){const I=MNF_IMG[S.img];if(I)ld(I.u)}if(mnfQteIn(F).length){ld(MNF_IMG.riteHand.u);ld(MNF_IMG.rite.u)}   /* 有危機題＝解開後要演儀式：兩張圖先載好，交叉淡入時才不會現抓 */if(F.mus&&mnfMusOk())mnfBlob(F.mus)}
/* ---------- 播放器 ---------- */
function mnfPlay(id,opt){opt=opt||{};const F=opt.film||MNF_FILMS[id];if(!F){if(opt.onDone)opt.onDone({skipped:true,missing:true});return null}mnfCss();
  let rm=false;try{rm=matchMedia("(prefers-reduced-motion:reduce)").matches}catch(e){}
  const old=document.getElementById("mnfPg");if(old)old.remove();
  const o=document.createElement("div");o.id="mnfPg";o.setAttribute("role","dialog");o.setAttribute("aria-label",opt.label||"主線電影");
  o.innerHTML=`<div class="mnf-st"><div class="mnf-bg"></div></div><canvas class="mnf-fx" aria-hidden="true"></canvas><div class="mnf-lb t"></div><div class="mnf-lb b"></div><div class="mnf-who" aria-hidden="true"></div><div class="mnf-big" aria-hidden="true"></div><div class="mnf-sub" aria-live="polite"></div><button class="mnf-k" type="button">略過</button>`;
  document.body.append(o);requestAnimationFrame(()=>requestAnimationFrame(()=>o.classList.add("on")));MNF.on=true;
  const st=o.querySelector(".mnf-st"),bg=o.querySelector(".mnf-bg"),cv=o.querySelector(".mnf-fx"),g=cv.getContext("2d"),sub=o.querySelector(".mnf-sub"),who=o.querySelector(".mnf-who"),big=o.querySelector(".mnf-big");
  const low=(()=>{try{return(navigator.deviceMemory||4)<=3||(navigator.hardwareConcurrency||4)<=4}catch(e){return false}})(),dpr=low?1:Math.min(2,devicePixelRatio||1);
  let W=0,H=0;const fit=()=>{W=o.clientWidth||innerWidth;H=o.clientHeight||innerHeight;cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);g.setTransform(dpr,0,0,dpr,0,0);
    const n=Math.max(8,...F.shots.flatMap(S=>(S.say||[]).map(([,t])=>mnfLen(t))));o.style.setProperty("--mnfs",Math.max(15,Math.min(28,Math.floor((W-36)/(n*1.12))))+"px")};fit();addEventListener("resize",fit);
  /* 時鐘：可暫停（解題、任務卡、切到背景） */
  let T0=performance.now(),PT=0;const PZ=new Set();const clock=()=>PZ.size?PT:(performance.now()-T0)/1000;
  const pause=r=>{if(!PZ.size)PT=(performance.now()-T0)/1000;PZ.add(r)},resume=r=>{if(!PZ.has(r))return;PZ.delete(r);if(!PZ.size)T0=performance.now()-PT*1000},seek=t=>{T0=performance.now()-t*1000;PT=t};
  const vis=()=>{if(document.hidden)pause("hid");else resume("hid")};document.addEventListener("visibilitychange",vis);
  if(F.mus)mnfMusic(F.mus,opt.vol==null?1:opt.vol);
  const cover=([ix,iy])=>{const s=Math.max(W/MNF_W,H/MNF_H);return[(W-MNF_W*s)/2+ix*s,(H-MNF_H*s)/2+iy*s]};let kbNow=[1,50,50];
  const onScr=pt=>{const[s,fx,fy]=kbNow,ox=W*fx/100,oy=H*fy/100;return[ox+(pt[0]-ox)*s,oy+(pt[1]-oy)*s]};
  let si=-1,S=null,fin=false,raf=0,fired={},qDone={},P=[],res={skipped:false,qte:{}};
  const add=(x,y,vx,vy,life,r,col,k)=>{if(P.length<(low?120:260))P.push({x,y,vx,vy,l:0,m:life,r,col,k})};
  const nextAt=i=>i+1<F.shots.length?F.shots[i+1].at:F.end;
  const setShot=i=>{si=i;S=F.shots[i];fired={};const I=MNF_IMG[S.img];bg.style.backgroundImage=I?`url(${I.u})`:"none";st.classList.toggle("frz",S.fx==="frz");
    st.querySelectorAll(".bx-bd,.mnf-seal").forEach(e=>e.remove());if(S.fx!=="frz")P.length=0;sub.classList.remove("on");
    if(!(S.who||[]).length){who.classList.remove("on")}if(!S.big)big.classList.remove("on")};
  const finish=sk=>{if(fin)return;fin=true;cancelAnimationFrame(raf);removeEventListener("resize",fit);document.removeEventListener("visibilitychange",vis);res.skipped=!!sk;
    if(!opt.keepMusic)mnfMusicStop(.8);o.classList.remove("on");setTimeout(()=>o.remove(),520);if(opt.onDone)setTimeout(()=>opt.onDone(res),300)};
  /* 跳過：還有沒解的危機題＝先出任務卡、再直接跳到解題（解題不能跳）；沒有＝任務卡 → 結束 */
  const card=(c,go)=>{pause("card");const d=document.createElement("div");d.className="mnf-card";d.setAttribute("role","dialog");d.setAttribute("aria-label",c.t);
    d.innerHTML=`<b>${esc(c.t)}</b><button type="button">${esc(c.b||"出發")}</button>${c.g?`<button type="button" class="g">${esc(c.g)}</button>`:""}`;o.append(d);requestAnimationFrame(()=>d.classList.add("on"));
    const[b1,b2]=d.querySelectorAll("button");try{b1.focus({preventScroll:true})}catch(e){}
    b1.onclick=e=>{e.stopPropagation();if(typeof vibrate==="function")vibrate(8);d.remove();resume("card");go(1)};if(b2)b2.onclick=e=>{e.stopPropagation();d.remove();resume("card");go(2)}};
  const skip=()=>{if(fin||o.classList.contains("qt")||o.querySelector(".mnf-card"))return;if(typeof vibrate==="function")vibrate(5);const t=clock(),Q=F.shots.find(x=>x.qte&&!qDone[x.at]&&x.at>=t-.01);
    if(Q){card({t:(MNF_QTE[Q.qte]||{}).big||F.card.t,b:"出發"},()=>{seek(Q.at);});return}
    const c=(typeof opt.card==="function"?opt.card(F):opt.card)||F.card;card(c,k=>{res.card=k;finish(true)})};
  o.querySelector(".mnf-k").onclick=e=>{e.stopPropagation();skip()};
  const qte=Q=>{pause("qte");o.classList.add("qt");const PZL=(opt.qte&&opt.qte[Q.qte])||MNF_QTE[Q.qte];if(opt.vol!==0)mnfVol(.4,.6);
    mnfQte(o,PZL,r=>{qDone[Q.at]=1;res.qte[Q.qte]=r;o.classList.remove("qt");big.classList.remove("on");st.classList.remove("frz");if(opt.vol!==0)mnfVol(1,1.2);
      const go=()=>{seek(Q.at+.06);resume("qte")};if(typeof opt.onQte==="function"){try{opt.onQte(Q.qte,r,go)}catch(e){go()}}else go()})};
  const frame=()=>{if(fin)return;const t=clock();let i=F.shots.length-1;while(i>0&&F.shots[i].at>t)i--;if(i!==si)setShot(i);
    if(S.qte&&!qDone[S.at]&&!fired.q){fired.q=1;if(S.big==null){big.textContent=((opt.qte&&opt.qte[S.qte])||MNF_QTE[S.qte]||{}).big||"";big.classList.add("on")}mnfSfx("gong");qte(S)}
    if(t>=F.end){finish(false);return}
    const a=S.at,b=nextAt(si),p=rm?0:Math.max(0,Math.min(1,(t-a)/Math.max(.1,b-a))),e=p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2;
    if(S.kb&&!rm){const[A,B]=S.kb;kbNow=[A[0]+(B[0]-A[0])*e,A[1]+(B[1]-A[1])*e,A[2]+(B[2]-A[2])*e]}else kbNow=[1,50,50];
    st.style.transformOrigin=`${kbNow[1]}% ${kbNow[2]}%`;st.style.transform=`scale(${kbNow[0]})`;
    for(const[ts,k]of S.sfx||[])if(t>=ts&&!fired["s"+ts+k]){fired["s"+ts+k]=1;if(t<ts+1)mnfSfx(k)}
    {let cur=null;for(const x of S.say||[])if(t>=x[0])cur=x;if(cur&&fired.say!==cur[0]){fired.say=cur[0];sub.classList.remove("on");sub.textContent=cur[1];void sub.offsetWidth;sub.classList.add("on")}}
    for(const[ts,k,sd]of S.who||[])if(t>=ts&&!fired["w"+ts]){fired["w"+ts]=1;who.className="mnf-who "+(sd||"l");who.style.backgroundImage=`url(data/xs/prev_${mnfWho(k)}.webp)`;void who.offsetWidth;who.classList.add("on")}
    if(S.big&&t>=S.big[0]&&!fired.big){fired.big=1;big.textContent=S.big[1];big.classList.add("on")}
    if(S.board!=null&&t>=S.board&&!fired.bd&&typeof bhxBoardSvg==="function"){fired.bd=1;st.insertAdjacentHTML("beforeend",bhxBoardSvg());const B=st.querySelector(".bx-bd"),cs=Math.max(W/MNF_W,H/MNF_H);if(B){B.style.top=cover([0,S.bp?S.bp[0]:819])[1]+"px";B.style.width=(S.bp?S.bp[1]:480)*cs+"px"}}
    if(S.seal&&t>=S.seal[0]&&!fired.seal){fired.seal=1;const d=document.createElement("div");d.className="mnf-seal";const c=cover(S.src||[384,720]);d.style.left=c[0]+"px";d.style.top=c[1]+"px";d.innerHTML=esc(S.seal[1])+"<br>之印";st.append(d);requestAnimationFrame(()=>d.classList.add("on"))}
    g.clearRect(0,0,W,H);if(!rm)mnfFx(g,S,t,W,H,P,add,onScr,cover,fired);
    raf=requestAnimationFrame(frame)};
  setShot(0);raf=requestAnimationFrame(frame);MNF.cur={finish,skip,clock};return MNF.cur}
/* 粒子：每格依鏡頭 fx 生、畫 */
function mnfFx(g,S,t,W,H,P,add,onScr,cover,fired){const src=onScr(cover(S.src||[384,688])),R=Math.random,fx=S.fx;
  if(fx==="mist"||fx==="frz"){if(R()<.08)add(-120,H*(.2+R()*.7),.25+R()*.35,0,600,60+R()*90,"245,240,230","m")}
  if(fx==="glow"&&R()<.7)add(src[0]+(R()-.5)*60,src[1]+(R()-.5)*20,(R()-.5)*.4,-.5-R()*1.1,90+R()*60,.8+R()*1.6,"255,214,120");
  if(fx==="stars"&&R()<.5)add(R()*W,R()*H*.7,0,.05,120+R()*80,.5+R()*1.3,"210,228,255","t");
  if(fx==="whirl")for(let k=0;k<2;k++){const a=R()*6.283,r=Math.max(W,H)*.6;add(src[0]+Math.cos(a)*r,src[1]+Math.sin(a)*r*.6,0,0,140,.8+R()*1.6,R()<.5?"170,130,255":"200,225,255","w")}
  if(fx==="river"&&R()<.8)add(src[0]+(R()-.5)*W*.5,H+8,(R()-.5)*.4,-1.2-R()*1.6,H/1.6,.6+R()*1.4,"200,232,255");
  if(fx==="ink"&&R()<.06)add(src[0]+(R()-.5)*W*.6,src[1]+(R()-.5)*H*.18,0,0,110,4,"10,10,16","i");
  if(fx==="burst"&&!fired.bu){fired.bu=1;for(let k=0;k<110;k++){const a=R()*6.283,v=1+R()*6;add(src[0],src[1],Math.cos(a)*v,Math.sin(a)*v,50+R()*50,1+R()*2.4,R()<.5?"255,236,170":"190,240,220")}}
  g.globalCompositeOperation="lighter";
  if(fx==="gates"){const n=Math.min(13,Math.floor((t-S.at)/.2)+1);for(let i=0;i<n;i++){const a=Math.PI*(.08+.84*i/12),x=W/2-Math.cos(a)*W*.44,y=H*.3-Math.sin(a)*H*.15,tw=.75+.25*Math.sin(t*3+i),rr=7+2*tw,gr=g.createRadialGradient(x,y,0,x,y,rr*2);
      gr.addColorStop(0,`rgba(255,246,214,${.9*tw})`);gr.addColorStop(.35,`rgba(255,214,120,${.45*tw})`);gr.addColorStop(1,"rgba(255,214,120,0)");g.fillStyle=gr;g.fillRect(x-rr*2,y-rr*2,rr*4,rr*4);   /* 一道星門＝金色光暈＋亮心＋一圈門框 */
      g.fillStyle=`rgba(255,252,236,${tw})`;g.beginPath();g.arc(x,y,2.4,0,6.2832);g.fill();g.strokeStyle=`rgba(255,226,150,${.7*tw})`;g.lineWidth=1.2;g.beginPath();g.arc(x,y,rr*.9,Math.PI,0);g.lineTo(x+rr*.9,y+rr*.9);g.moveTo(x-rr*.9,y);g.lineTo(x-rr*.9,y+rr*.9);g.stroke()}}
  for(let j=P.length-1;j>=0;j--){const q=P[j];q.l++;
    if(q.k==="w"){const dx=src[0]-q.x,dy=src[1]-q.y,d=Math.hypot(dx,dy)||1;q.vx=q.vx*.95+(dx/d)*.7+(-dy/d)*1;q.vy=q.vy*.95+(dy/d)*.7+(dx/d)*1;if(d<10)q.l=q.m}
    q.x+=q.vx;q.y+=q.vy;const al=Math.max(0,1-q.l/q.m);if(al<=0||q.x>W+200||q.y<-40){P.splice(j,1);continue}
    if(q.k==="m"){g.globalCompositeOperation="source-over";const gr=g.createRadialGradient(q.x,q.y,0,q.x,q.y,q.r);gr.addColorStop(0,`rgba(${q.col},${.16*Math.min(1,q.l/60)*al})`);gr.addColorStop(1,`rgba(${q.col},0)`);g.fillStyle=gr;g.fillRect(q.x-q.r,q.y-q.r,q.r*2,q.r*2);g.globalCompositeOperation="lighter";continue}
    if(q.k==="i"){g.globalCompositeOperation="source-over";const rr=q.r+q.l*.5;g.fillStyle=`rgba(${q.col},${.32*al})`;g.beginPath();g.arc(q.x,q.y,rr,0,6.2832);g.fill();g.globalCompositeOperation="lighter";continue}
    const tw=q.k==="t"?.5+.5*Math.sin(q.l*.15+q.x):1;g.fillStyle=`rgba(${q.col},${al*.9*tw})`;g.beginPath();g.arc(q.x,q.y,q.r,0,6.2832);g.fill()}
  g.globalCompositeOperation="source-over"}
/* ---------- 危機解題（QTE）：P＝{fen,side,line:[著法…],big,say,hint,presel}；done({mist,hint,demo,cn}) ---------- */
function mnfQte(host,P,done){const C=typeof window!=="undefined"&&window.XQCore;
  if(!C||!P||typeof Board!=="function"){setTimeout(()=>done({mist:0,hint:false,demo:true,cn:"",skip:1}),600);return}
  const w=document.createElement("div");w.className="mnf-q";w.innerHTML=`<div class="mnf-qi"><div class="mnf-qw"></div><p class="mnf-qs">${esc(P.say||"")}</p><p class="mnf-qh" aria-live="polite"></p><div class="mnf-qd"></div></div>`;host.append(w);
  const wrap=w.querySelector(".mnf-qw"),hintE=w.querySelector(".mnf-qh"),dE=w.querySelector(".mnf-qd");
  const side=P.side||"r",b0=C.parseFen(String(P.fen).split(" ")[0]),line=(P.line||[]).slice();let b=b0.slice(),step=0,sel=-1,last=null,busy=false,mist=0,hintOn=false,demo=false,cn=[];
  const sq=u=>[C.parseSq(u.slice(0,2)),C.parseSq(u.slice(2,4))],want=()=>line[step*2]||"",ck=bb=>C.inCheck(bb,"r")?C.kingSq(bb,"r"):C.inCheck(bb,"b")?C.kingSq(bb,"b"):-1;
  const bd=Board(x=>tap(x));wrap.append(bd.svg);
  const tg=()=>sel>=0?C.legal(b,side).filter(([f])=>f===sel).map(x=>x[1]):[];
  const draw=o=>{const O=Object.assign({sel,last,check:ck(b),targets:tg()},hintOn&&want()?{hint:[sq(want())[0]]}:{},o||{});bd.draw(b,O);mnfTgGlow(bd.svg,O.targets||[])};
  const presel=()=>{const u=want();if(P.presel!==false&&u){const f=sq(u)[0];if(C.legal(b,side).some(([x])=>x===f))sel=f}};
  presel();draw();requestAnimationFrame(()=>requestAnimationFrame(()=>w.classList.add("on")));
  const lit=s=>{const r=bd.svg.getBoundingClientRect(),wr=wrap.getBoundingClientRect(),k=r.width/560,x=(40+(s%9)*60)*k+(r.left-wr.left),y=(40+(s/9|0)*60)*k+(r.top-wr.top);const d=document.createElement("div");d.className="mnf-lit";d.style.left=x+"px";d.style.top=y+"px";wrap.append(d);setTimeout(()=>d.remove(),1300)};
  const win=()=>{busy=true;hintE.textContent="";dE.innerHTML="";mnfSfx("gong");if(typeof vibrate==="function")vibrate([15,40,25]);lit(last.t);
    setTimeout(()=>{w.classList.add("done");setTimeout(()=>{w.remove();done({mist,hint:hintOn,demo,cn:cn.join("　")})},900)},700)};
  const wrong=(nb,f,t)=>{busy=true;mist++;b=nb;last={f,t};sel=-1;draw({targets:[]});wrap.classList.add("shk");if(typeof vibrate==="function")vibrate([20,40,20]);mnfSfx("drum");
    setTimeout(()=>{wrap.classList.remove("shk");wrap.classList.add("rew");setTimeout(()=>{wrap.classList.remove("rew");b=bstep.slice();last=lastStep;
      if(mist>=2&&!hintOn){hintOn=true;hintE.textContent=P.hint||"看藍框那顆棋子。"}
      if(mist>=3&&!dE.firstChild){const bt=document.createElement("button");bt.type="button";bt.className="mnf-demo";bt.textContent="看軍師演示";bt.onclick=e=>{e.stopPropagation();playDemo()};dE.append(bt)}
      presel();busy=false;draw()},520)},620)};
  let bstep=b.slice(),lastStep=null;
  const go=(f,t)=>{const J=mnfQteJudge(C,b,side,f,t,want());cn.push(C.notate(b,f,t));
    if(!J.ok){cn.pop();return wrong(J.nb,f,t)}
    b=J.nb;last={f,t};sel=-1;draw({targets:[]});if(typeof vibrate==="function")vibrate(15);
    if(J.win||!line[step*2+1]){win();return}
    busy=true;setTimeout(()=>{const[f2,t2]=sq(line[step*2+1]);b=C.make(b,f2,t2);last={f:f2,t:t2};step++;bstep=b.slice();lastStep=last;presel();busy=false;draw()},600)};
  function tap(x){if(busy)return;const L=C.legal(b,side);if(sel>=0&&L.some(([f,t])=>f===sel&&t===x)){const f=sel;return go(f,x)}sel=L.some(([f])=>f===x)?x:-1;if(sel>=0&&typeof vibrate==="function")vibrate(5);draw()}
  function playDemo(){if(busy)return;demo=true;busy=true;dE.innerHTML="";hintE.textContent="軍師：看好了——";const u=want();if(!u){win();return}const[f,t]=sq(u);sel=f;draw();
    setTimeout(()=>{busy=false;go(f,t)},1100)}
  return{tap,demo:playDemo}}
/* 合法落點發光：Board 畫的落點是小點，新手看不清楚；在上面多疊一圈會呼吸的金光（不吃點選） */
function mnfTgGlow(svg,T){const NS="http://www.w3.org/2000/svg";svg.querySelectorAll(".mnf-tg").forEach(e=>e.remove());
  for(const s of T){const c=document.createElementNS(NS,"circle");c.setAttribute("class","mnf-tg");c.setAttribute("cx",40+(s%9)*60);c.setAttribute("cy",40+(s/9|0)*60);c.setAttribute("r",17);c.setAttribute("aria-hidden","true");svg.append(c)}}
/* ---------- 殘局解開儀式：o＝{k 站,id 題號,cn 走法文字,state "new"|"old"|"demo",L 這一站題號,onDone} ---------- */
function mnfSolveRite(o){o=o||{};mnfCss();let rm=false;try{rm=matchMedia("(prefers-reduced-motion:reduce)").matches}catch(e){}
  const A=(()=>{try{return store.get("shipSolved",{})||{}}catch(e){return{}}})(),per=typeof SHIP_PER!=="undefined"?SHIP_PER:3,route=typeof SHIP_ROUTE!=="undefined"?SHIP_ROUTE:[o.k];
  const cnt=mnfRiteCount(A,route,per),rows=mnfRiteRows(A,o.k,o.L,per),me=rows.findIndex(r=>r.id===o.id),st=o.state||"new";
  const nm=(typeof QP_SEAL!=="undefined"&&QP_SEAL[o.k])||(typeof shipShort==="function"?(()=>{try{return shipShort(o.k)}catch(e){return""}})():""),I=MNF_IMG.rite;
  const d=document.createElement("div");d.id="mnfRite";d.setAttribute("role","dialog");d.setAttribute("aria-label","殘譜補上一行");
  const CN=["一","二","三","四","五","六"];
  const rowH=rows.map((r,i)=>{const txt=r.id===o.id?(o.cn||"──"):r.on?"〰〰〰":"";const isMe=i===me&&st!=="demo";
    return`<div class="rt-r${r.on&&!(isMe&&st==="new")?" on":""}${isMe?" nw":""}"><i>${CN[i]||i+1}</i>${isMe&&st==="new"?[...txt].map(c=>`<span class="c">${esc(c)}</span>`).join(""):`<span class="ink">${esc(txt)}</span>`}</div>`}).join("");
  const segs=Array.from({length:cnt.all},(_,i)=>`<u class="${i<cnt.n?"on":""}${st==="new"&&i===cnt.n-1?" nw":""}"></u>`).join("");
  d.innerHTML=`<div class="rt-st"><div class="rt-im"><img src="${MNF_IMG.riteHand.u}" alt=""><img class="rt-up" src="${I.u}" alt=""><div class="rt-dot"></div></div></div><div class="rt-bk"><div class="rt-pg"><p class="rt-h">《千秋棋話》${esc(nm)}</p>${rowH}<div class="rt-mk" aria-hidden="true">${segs}</div><p class="rt-n">殘譜 ${cnt.n}／${cnt.all} 行</p><div class="rt-cv">千秋棋話</div></div></div><div class="mnf-sub" aria-live="polite"></div><button class="mnf-k" type="button">略過</button>`;
  document.body.append(d);requestAnimationFrame(()=>requestAnimationFrame(()=>d.classList.add("on")));
  const im=d.querySelector(".rt-im"),dot=d.querySelector(".rt-dot"),sub=d.querySelector(".mnf-sub"),bk=d.querySelector(".rt-bk"),stg=d.querySelector(".rt-st");
  const W=()=>d.clientWidth||innerWidth,H=()=>d.clientHeight||innerHeight,FH=[390,452],FX=[348,456];   /* 新圖上老人右手平按的位置、手掌下那一小段桌緣（1000×747 像素）；鏡頭對準手，推近時老人的臉在畫面外，兩張圖的臉不一樣也看不出來 */
  const place=k=>{const w=W(),h=H(),s0=Math.max(w/I.w,h/I.h),s=s0*k,fx=FH[0]*s,fy=FH[1]*s,ox=Math.min(0,Math.max(w-I.w*s,w*.5-fx)),oy=Math.min(0,Math.max(h-I.h*s,h*.42-fy));
    im.style.width=I.w*s+"px";im.style.height=I.h*s+"px";im.style.transform=`translate(${ox}px,${oy}px)`;dot.style.left=FX[0]/I.w*100+"%";dot.style.top=FX[1]/I.h*100+"%"};
  const n=Math.max(...Object.values(MNF_RITE_TXT).map(mnfLen));d.style.setProperty("--mnfs",Math.max(15,Math.min(28,Math.floor((W()-36)/(n*1.12))))+"px");
  const say=t=>{sub.classList.remove("on");sub.textContent=t;void sub.offsetWidth;sub.classList.add("on")};
  const T=[],at=(s,f)=>T.push(setTimeout(f,rm?Math.min(s*1000,s*300):s*1000));let fin=false,k0=performance.now(),raf=0;
  const up=d.querySelector(".rt-up");   /* 鏡頭：0～2.6 秒從 1.25 倍推近到手（2.1 倍）→ 停住交叉淡入（手移開）→ 3.6 秒起慢慢退到 1.8 倍 */
  const zk=t=>rm?2:t<2.6?1.25+.85*(1-Math.pow(1-t/2.6,2)):t<3.6?2.1:2.1-.3*Math.min(1,(t-3.6)/2.4);
  const zoom=()=>{if(fin)return;const t=(performance.now()-k0)/1000;place(zk(t));if(t<6.2)raf=requestAnimationFrame(zoom)};zoom();
  const end=()=>{if(fin)return;fin=true;T.forEach(clearTimeout);cancelAnimationFrame(raf);d.classList.remove("on");setTimeout(()=>d.remove(),520);if(o.onDone)setTimeout(o.onDone,300)};
  d.querySelector(".mnf-k").onclick=e=>{e.stopPropagation();if(typeof vibrate==="function")vibrate(5);end()};
  at(.3,()=>say(MNF_RITE_TXT.press));
  at(2.6,()=>{im.classList.add("mv");up.classList.add("on")});
  at(2.8,()=>say(MNF_RITE_TXT.hand));
  at(3.6,()=>im.classList.remove("mv"));
  at(3.9,()=>{dot.classList.add("on");mnfSfx("drip")});
  at(4.5,()=>say(MNF_RITE_TXT.glow));
  at(6.2,()=>{stg.style.opacity=".28";bk.classList.add("on");say(st==="demo"?MNF_RITE_TXT.demo:st==="old"?MNF_RITE_TXT.old:MNF_RITE_TXT.line)});
  at(6.9,()=>{bk.classList.add("op");mnfSfx("star")});
  if(st==="new")at(7.8,()=>{const cs=[...d.querySelectorAll(".rt-r.nw span.c")];cs.forEach((c,i)=>T.push(setTimeout(()=>c.classList.add("on"),rm?0:i*260)));const r=d.querySelector(".rt-r.nw");if(r)T.push(setTimeout(()=>r.classList.add("on"),cs.length*260))});
  at(9.4,()=>say(st==="demo"?MNF_RITE_TXT.demo2:MNF_RITE_TXT.rule));
  at(12,end);
  return{end,count:cnt,rows}}
