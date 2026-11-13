/* ================= 🏮 線上大廳滿版水墨圖「千燈天井」（開發者 11/8 定案：Gemini 方案 1＋9 精簡版；史學顧問核過，必改的素材另外換圖）=================
   規劃：story/gemini_app/37 號 md；圖：park/lobbymap/lobby_v4.png（AI 桌的棋盤程式畫完整開局）＋綠幕素材（棋桌、燈籠亮暗、茶客剪影）→ art/lobbymap/ → data/lobbymap/。
   包一層 Lobby(v)：原本的大廳清單（#lb，paint() 每 15 秒和有人進出時重畫）照舊畫、照舊綁好所有按鈕，只是收進「📜 名冊」抽屜（點竹簡從下方拉出來）；
   場景上的每個東西都是「按清單裡對應的那顆按鈕」，邀請、觀戰、時制確認、進行中對局的確認全部照原本的流程：
     天井八張棋桌＝正在對戰的棋局（最多 8 桌，點了＝清單裡那盤的「👀 觀看」）；自己有一盤在下＝那張桌子金框，點了回到對局；盤數少於 4 時補空桌，人少也不冷清；
     中央大銅鑼＝🎲 隨機配對（#sk1）；正在找對手時銅鑼一圈圈聲波、標籤改「找對手中」，再點一下取消（#sk0）；
     二、一樓迴廊的燈籠（50 盞）＝在線的人，一盞一人：有人亮燈、燈下有茶客剪影；點燈＝清單裡那個人（資料卡、邀請）；
       熟面孔＝燈下金色掛牌；路過的石桌往事人物＝燈下青色掛牌（點了＝jcharSheet）；雲遊棋客（電腦）＝燈光淡一點；一盞燈固定給同一個人（不會每次重畫亂跳）；
     二樓說書台＝🏆 千秋盃（#cupE；沒有千秋盃資料就開 #/cup）；角色走右邊木樓梯上二樓（路線同對戰頁），樓上身高不縮；
     右柱木牌＝🏅 我的戰績 #/stats；左邊竹簡卷＝📜 名冊（清單抽屜）；左下特別棋桌＝📺 AI 對戰（有 #aiw 才是 AI 對戰；手機版沒有 AI 對戰就改成 🤖 挑戰電腦 #/cpu）。
   標籤只有大字。接 07w 走路（SHW_LOBBY）、07x 兩指縮放。圖片網址帶 LM_IMGV（data/lobbymap 在不跟版本走的快取裡，換圖要改這個數字）。
   開關 LOBBY_MAP_ON（false＝照舊清單）；樣式在 lmCss */
const LOBBY_MAP_ON=true;   /* 開發者 11/8 說打開 */
const LM_IMGV="2215";   /* 11/10 經典世界（還沒登船或停在經典）用觀星閣的天井 lobby_classic；明朝照舊用 lobby（明清徽州茶樓），構圖相同、座標共用 */
const LM_IMG=n=>`data/lobbymap/${n}.webp?v=${LM_IMGV}`;
/* 開發者 11/9：照星槎停靠的朝代換圖（story/朝代場景計畫.md；考究說明 park/lobbymap/考究說明_各朝大廳_1109.md）。構圖、入口、棋桌、燈、走路節點的座標都不變。
   有停靠才算（判斷跟 07y hbDockEra() 一樣）；沒停靠、明朝用原圖和原素材。各朝檔名一律帶朝代（同一組時代的內容一樣），preload-list.js 的 ERA_RE 才分得到各朝：
     底圖 lobby_<朝>（11 朝）；棋桌 table_empty_<朝>／table_game_<朝>（清用原圖）；茶客 fig_sit／fig_lean／fig_fan_<朝>（11 朝）；
     燈：秦～隋（唐以前不用紙燈籠）＝細鏈吊的青銅燈盞圖 lantern_on／lantern_off_<朝>；唐、五代＝程式畫的素紗、素紙燈籠（暗燈是淡紙色）；宋以後＝程式畫的紅紙燈籠（照舊） */
const LM_ERAS="qin han sanguo weijin nanbei sui tang wudai song yuan qing".split(" ");
const LM_SET={lobby:LM_ERAS,table_empty:LM_ERAS.slice(0,10),table_game:LM_ERAS.slice(0,10),fig_sit:LM_ERAS,fig_lean:LM_ERAS,fig_fan:LM_ERAS,lantern_on:LM_ERAS.slice(0,6),lantern_off:LM_ERAS.slice(0,6)};
function lmEra(){let e="";try{e=typeof hbDockEra==="function"?hbDockEra():typeof shipAt==="function"&&typeof shipDockList==="function"&&shipDockList()?shipAt()||"":""}catch(x){}return LM_ERAS.includes(e)?e:""}
const lmN=(n,e)=>e&&(LM_SET[n]||[]).includes(e)?n+"_"+e:n;   /* 素材名 → 這一朝的檔名（沒有就用原素材） */
/* 回饋 800（開發者 11/8「打燈籠有一點不好看」）：亮著的燈原本是圓滾滾的橘色燈籠圖，外面再罩一圈 340% 大、screen 混色的光（看起來像白色圓盤）。
   改成程式畫的細長紙燈籠（SVG：繩、上下黑邊、淡墨描邊和竹骨、流蘇），亮燈＝暖黃紙色＋一小圈柔光（一般混色、不發白），暗燈＝暗紅舊紙。開關 LM_INK_LAMP（false＝照舊用圖） */
const LM_INK_LAMP=true;
const LM_LAMP_SVG='<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>'+
  '<radialGradient id="lmLgOn" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="#fff0c4"/><stop offset=".55" stop-color="#f3b45c"/><stop offset="1" stop-color="#c8602e"/></radialGradient>'+
  '<linearGradient id="lmLgOff" x1="0" x2="1"><stop offset="0" stop-color="#6e3426"/><stop offset=".45" stop-color="#9a4b34"/><stop offset="1" stop-color="#5f2c20"/></linearGradient>'+
  '<linearGradient id="lmLgOffP" x1="0" x2="1"><stop offset="0" stop-color="#b9ab8c"/><stop offset=".45" stop-color="#e6dcc2"/><stop offset="1" stop-color="#a99a7a"/></linearGradient>'+
  '<symbol id="lmLamp" viewBox="0 0 20 46"><path d="M10 0V8" stroke="#3a2a1c" stroke-width=".8"/><rect x="6.4" y="6.4" width="7.2" height="2.2" rx=".6" fill="#2b2016"/>'+
  '<path d="M10 8.4C16.9 8.8 17.5 29.6 10 30.8C2.5 29.6 3.1 8.8 10 8.4Z" style="fill:var(--lmf)" stroke="#3a2416" stroke-width=".9"/>'+
  '<path d="M10 8.6V30.6M6.8 9.6C5 16 5 23.6 6.8 29.8M13.2 9.6C15 16 15 23.6 13.2 29.8" fill="none" stroke="rgba(70,34,16,.45)" stroke-width=".5"/>'+
  '<rect x="7" y="30.4" width="6" height="2" rx=".5" fill="#2b2016"/><path d="M10 32.4V44" stroke="#a8321e" stroke-width="1.3"/><circle cx="10" cy="34.4" r="1" fill="#a8321e"/></symbol></defs></svg>';
const LM_TBL={};   /* 對局 gid → 桌子的位置（同一盤一直坐同一張桌，直到下完） */
/* 入口標籤：[id, 左%, 上%, 大字]（量 768×1376 的 lobby_v4，標籤放在東西上方） */
/* 11/10 開發者：拿掉「千秋盃」（只留茶坊二樓那個入口）、「我的戰績」（跟學習書院的重複）；「挑戰電腦」不放在線上對戰天井（只有開發者的 📺 AI 對戰才出現） */
/* 11/10 天井照茶坊重畫（lobby_re3：右牆黑板、兩面紅旗、左邊白牆廂房、門口兩盆松；art_lobbyre*.json、史學顧問核過）：名冊改到右牆黑板、AI 對戰改到一樓左廂門口 */
const LM_SPOTS=[["lmGong",50,50.5,"🎲 隨機配對"],["lmList",88,27,"📜 名冊"],["lmAi",25,42.5,"📺 AI 對戰"]];
/* 11/10 開發者「按下隨機配對，做一個敲鑼的動畫」：天井中央那面鑼（秦～五代的圖畫的是鼓）被敲一下——
   鑼槌從角色那邊揮過去，鑼面（從同一張圖切出來的圓）晃動、金色聲波一圈圈散開，配 01-board 合成的鑼聲；鼓就敲兩下「咚、咚」、鼓面一彈一彈。
   位置是 12 張大廳圖量出來的：中心 50.3%、59.6%，直徑約圖寬 10.5%；有沒有開「過場鼓聲」照 XQ_DRUM 的設定 */
const LM_GONG={x:50.6,y:59,d:10.5,drum:["qin","han","sanguo","weijin","nanbei","sui","tang","wudai"]};
function lmGongCss(){if(document.getElementById("lmGongCss"))return;const s=document.createElement("style");s.id="lmGongCss";s.textContent=`
.lm-hit{position:absolute;pointer-events:none;z-index:2;transform:translate(-50%,-50%)}
.lm-hit .gd{position:absolute;inset:0;border-radius:50%;background-repeat:no-repeat;transform-origin:50% 0}
.lm-hit.gong .gd{animation:lmGongSw 1.6s cubic-bezier(.3,.6,.4,1) .22s both}
.lm-hit.drum .gd{transform-origin:50% 50%;animation:lmDrumP .34s ease-out .22s 2 both}
.lm-hit .rp{position:absolute;inset:0;border-radius:50%;border:2.5px solid rgba(255,214,120,.95);box-shadow:0 0 10px rgba(255,200,90,.7);opacity:0;animation:lmRip 1.3s ease-out both}
.lm-hit.drum .rp{border-color:rgba(255,236,200,.9);box-shadow:0 0 8px rgba(255,230,190,.6)}
.lm-hit .ml{position:absolute;left:78%;top:84%;width:62%;height:12%;transform-origin:100% 50%;animation:lmMal .62s ease-in-out both}
.lm-hit.drum .ml{animation:lmMal .34s ease-in-out 2 both}
.lm-hit .ml i{position:absolute;right:0;top:35%;width:88%;height:30%;border-radius:3px;background:linear-gradient(#8a5a32,#5b3a1e)}
.lm-hit .ml b{position:absolute;left:0;top:-30%;width:34%;height:160%;border-radius:50%;background:radial-gradient(circle at 35% 35%,#c98b55,#7a3f1c)}
@keyframes lmGongSw{0%{transform:rotate(0)}12%{transform:rotate(5deg) scale(.97)}28%{transform:rotate(-4deg)}44%{transform:rotate(3deg)}60%{transform:rotate(-2deg)}76%{transform:rotate(1deg)}100%{transform:rotate(0)}}
@keyframes lmDrumP{0%{transform:scale(1)}30%{transform:scale(.94)}65%{transform:scale(1.03)}100%{transform:scale(1)}}
@keyframes lmRip{0%{opacity:0;transform:scale(.9)}8%{opacity:1}100%{opacity:0;transform:scale(2.9)}}
@keyframes lmMal{0%{transform:rotate(-40deg);opacity:0}15%{opacity:1}40%{transform:rotate(3deg)}52%{transform:rotate(-2deg)}100%{transform:rotate(-34deg);opacity:0}}
@media (prefers-reduced-motion:reduce){.lm-hit .gd,.lm-hit .ml{animation:none}.lm-hit .rp{animation-duration:.8s}}`;document.head.append(s)}
function lmGongHit(P){try{const im=P&&P.querySelector(":scope>img");if(!im)return;lmGongCss();P.querySelectorAll(".lm-hit").forEach(x=>x.remove());
  const e=lmEra(),drum=LM_GONG.drum.includes(e),R=im.getBoundingClientRect(),W=R.width,H=R.height,d=W*LM_GONG.d/100,cx=W*LM_GONG.x/100,cy=H*LM_GONG.y/100;
  const h=document.createElement("div");h.className="lm-hit "+(drum?"drum":"gong");h.style.cssText=`left:${LM_GONG.x}%;top:${LM_GONG.y}%;width:${d}px;height:${d}px`;
  const n=drum?2:3,rips=Array.from({length:n},(_,i)=>`<span class="rp" style="animation-delay:${(drum?.22+i*.34:.22+i*.28).toFixed(2)}s"></span>`).join("");
  h.innerHTML=`<div class="gd" style="background-image:url('${im.currentSrc||im.src}');background-size:${W}px ${H}px;background-position:${-(cx-d/2)}px ${-(cy-d/2)}px"></div>${rips}<div class="ml"><i></i><b></b></div>`;
  P.append(h);setTimeout(()=>h.remove(),2400);
  if(store.get("gateDrum",true)&&typeof withAudio==="function"){try{unlockAudio()}catch(x){}withAudio(()=>{const t=AC.currentTime+.24;if(drum){drumHit(t,1.1,58);drumHit(t+.34,1,58)}else gongHit(t,150,2.6,true)})}}catch(x){}}
/* 八張棋桌的位置（桌子中心，%）：左兩張、右四張、銅鑼前兩張，中軸和兩側走道都空著（角色不會穿過桌子） */
/* 11/10 新天井：右邊有紅旗、門口兩盆松，右排往內收、前排改成左右各一＋門內兩張 */
const LM_TABLES=[[24,56],[73,58],[24,66],[73,68],[29,76.5],[71,76.5],[37,85],[63,85]];
/* 44 盞燈：[左%, 上%, 層, 剪影]（層 2＝二樓、1＝一樓簷下；剪影 1＝亮燈時燈下站一個人影，只放在有地板站得住的地方）
   11/10 新天井：左邊是白牆廂房（燈掛在一二樓之間的斜橫樑、一樓牆邊），右牆有黑板和紅旗（燈改掛右牆頂、紅旗下方） */
const LM_LAMPS=(()=>{const L=[];
  for(const x of[22.5,25.5,28.5,31.5,34.5,65.5,68.5,71.5,74.5,77.5])L.push([x,20.5,2,1]);L.push([36.2,21.5,2,1],[63.8,21.5,2,1]);
  for(let i=0;i<14;i++)L.push([+(22+i*3.2).toFixed(1),37.8,1,0]);
  for(const x of[3,7,11,15,19])L.push([x,+(34.7-x/20.7*5).toFixed(1),2,0]);
  for(const y of[40,45,50,55,60,65,70])L.push([9.5,y,1,y>=60?1:0]);
  for(const x of[86,90,94,98])L.push([x,22,2,0]);for(const y of[67,72])L.push([91.5,y,1,1]);return L})();
/* 07w 的座標表：從入口進來；銅鑼前、左右走道；上二樓：樓梯腳→下段→轉角平台→上段→樓梯頂→二樓遠側→說書台旁；樓上身高照樓梯腳算 */
const SHW_LOBBY={el:40,h:y=>.06+(Math.max(y,53)-80)*.0008,look0:[50,60],
  N:{home:[50,93],c:[50,80],g:[50,71.5],l0:[38,64],l1:[36,52],ai:[26,49],r0:[62,64],r1:[64,52],sgn:[83,51],
    sf:[66,53],s1:[72,48],sl:[82,44],s2:[78,37],st:[74,31.5],gal:[67,31],stage:[59,31.5]},
  E:"home-c c-g g-l0 l0-l1 l1-ai g-r0 r0-r1 r1-sgn r1-sf sf-s1 s1-sl sl-s2 s2-st st-gal gal-stage",
  HS:{lmGong:["g",50,62,"cheer"],lmList:["sgn",92,36,"bow"],lmAi:["ai",25,44,"bow"]}};
function lmCss(){if(document.getElementById("lmCss"))return;const s=document.createElement("style");s.id="lmCss";s.textContent=`
.lobby-page{margin:0 0 6px}.lobby-page .shp-spot{max-width:46%;padding:4px 11px;z-index:3}.lobby-page .shp-spot b{white-space:nowrap;font-size:14px}.lobby-page .shp-spot.hot{padding:5px 13px}.lobby-page .shp-spot.hot b{font-size:15px}
.lm-l{position:absolute;inset:0;pointer-events:none}
.lobby-page.nt .lm-t>img,.lobby-page.nt .lm-fig{filter:brightness(.55) saturate(.7)}
.lm-t{position:absolute;width:18%;transform:translate(-50%,-50%);padding:0;border:0;background:none;pointer-events:auto;cursor:pointer;z-index:1}
.lm-t img{display:block;width:100%;height:auto;filter:drop-shadow(0 2px 2px rgba(40,30,20,.35))}
.lm-t.mine img{filter:drop-shadow(0 0 4px #f2c94c) drop-shadow(0 0 2px #f2c94c)}.lm-t.empty{pointer-events:none}
.lm-lp{position:absolute;width:3.2%;transform:translate(-50%,-12%);padding:0;border:0;background:none;pointer-events:none;z-index:2}
.lm-lp.f1{width:3.6%}
.lm-lp img{display:block;width:100%;height:auto}
.lm-l .lm-lp>img{width:100%!important;height:auto!important;max-width:none}   /* 秦～隋的青銅燈是 <img>：亮著的故事角色燈有 data-jc，會被全域 [data-jc]>img{width:56px}（角色頭像）放大，這裡壓回去 */
.lm-lp.on{pointer-events:auto;cursor:pointer}
.lm-lp.on::before{content:"";position:absolute;left:50%;top:40%;width:340%;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(closest-side,rgba(255,222,140,.55),rgba(255,190,90,0));mix-blend-mode:screen;pointer-events:none;animation:lmFl 3s ease-in-out infinite alternate}
.lm-lp.bot::before{opacity:.45}
.lm-lp i{position:absolute;left:50%;top:100%;width:46%;height:34%;transform:translateX(-50%);border-radius:2px}
.lm-lp.fam i{background:#e2b53e;box-shadow:0 0 3px #f2c94c}.lm-lp.story i{background:#3f8f86;box-shadow:0 0 3px #7fd1c4}
.lm-fig{position:absolute;width:3.4%;transform:translate(-50%,-100%);pointer-events:none;opacity:.88;z-index:1}
@keyframes lmFl{from{opacity:.8}to{opacity:1}}
.lm-lp.ink{width:2.3%;transform:translate(-50%,-4%)}.lm-lp.ink.f1{width:2.6%}
.lm-lp.ink svg{display:block;width:100%;height:auto;overflow:visible;--lmf:url(#lmLgOff);filter:drop-shadow(0 1px 1px rgba(40,24,12,.35))}
.lm-lp.ink.on svg{--lmf:url(#lmLgOn)}
.lm-lp.ink.pale svg{--lmf:url(#lmLgOffP)}.lm-lp.ink.pale.on svg{--lmf:url(#lmLgOn)}
.lm-lp.gu{width:2.4%;transform:translate(-50%,-2%)}.lm-lp.gu.f1{width:2.7%}
.lm-lp.gu.on::before{width:240%;top:74%;background:radial-gradient(closest-side,rgba(255,176,80,.45),rgba(255,160,60,.16) 60%,rgba(255,150,50,0));mix-blend-mode:normal}
.lm-lp.ink.on::before{width:230%;top:42%;background:radial-gradient(closest-side,rgba(255,176,80,.42),rgba(255,160,60,.16) 60%,rgba(255,150,50,0));mix-blend-mode:normal}
.lm-more{position:absolute;transform:translate(-50%,-50%);z-index:3;pointer-events:auto;cursor:pointer;border:1px solid #6b4a2a;border-radius:3px;background:#f3e6c8;color:#3a2618;font:800 12px/1 var(--serif,serif);padding:4px 8px;box-shadow:0 1px 3px rgba(40,24,12,.4);white-space:nowrap}
.lm-more::before{content:"";position:absolute;left:50%;bottom:100%;width:1px;height:8px;background:#3a2a1c}
.lm-quiet{position:absolute;left:50%;top:65%;transform:translate(-50%,-50%);z-index:3;pointer-events:none;background:rgba(30,24,18,.62);color:#f6e7c8;font:700 12px/1 var(--serif,serif);padding:5px 10px;border-radius:999px;white-space:nowrap}
.lm-wave{position:absolute;left:50%;top:59.5%;width:22%;aspect-ratio:1;transform:translate(-50%,-50%);pointer-events:none}
.lm-wave i{position:absolute;inset:0;border-radius:50%;border:2px solid rgba(242,201,76,.85);animation:lmWave 1.8s ease-out infinite;opacity:0}
.lm-wave i:nth-child(2){animation-delay:-.6s}.lm-wave i:nth-child(3){animation-delay:-1.2s}
@keyframes lmWave{0%{transform:scale(.25);opacity:.95}100%{transform:scale(1.25);opacity:0}}
.lm-dw{position:fixed;left:0;right:0;bottom:0;z-index:950;max-height:72vh;display:flex;flex-direction:column;background:var(--bg,#f5efe2);border-top:2px solid #b5452b;border-radius:16px 16px 0 0;box-shadow:0 -6px 24px rgba(0,0,0,.25);transform:translateY(105%);transition:transform .28s ease}
.lm-dw.open{transform:none}.lm-dw-h{display:flex;align-items:center;gap:8px;padding:10px 14px 6px;font:900 16px var(--serif,serif)}.lm-dw-h button{margin-left:auto;border:0;background:none;font-size:20px;cursor:pointer;color:inherit}
.lm-dw-b{overflow:auto;padding:0 2px 16px}
.lm-scrim{position:fixed;inset:0;z-index:949;background:rgba(0,0,0,.25);display:none}.lm-scrim.open{display:block}
/* 第 16 輪版面缺陷清零（r15 device-fit：大廳每種尺寸 6～13 處）：
   ① 亮著的燈（一盞一人、可以點）畫出來只有 9～10px 寬：外觀不變，透明的 ::after 把點選範圍擴到 44×44（標籤、棋桌在上面，蓋到的地方照樣點到它們）；lmSlots 也盡量讓亮燈彼此隔開一個指頭寬
   ② 熟面孔、石桌往事人物的小掛牌原本掛在燈的框外面（top:100%），燈的框加高把掛牌包進來（墨畫燈 20×46 → 20×62），量起來不再「超出元素框」
   ③ 收起來的名冊抽屜只是往下推出畫面，裡面的名冊、門房入口還「看得到」；收起時 visibility:hidden，滑出動畫結束後才藏 */
.lm-lp.on::after{content:"";position:absolute;left:50%;top:50%;width:max(100%,44px);height:max(100%,44px);transform:translate(-50%,-50%)}
.lm-lp.ink.fam,.lm-lp.ink.story{aspect-ratio:20/62}.lm-lp.ink.fam i,.lm-lp.ink.story i{top:auto;bottom:0;height:24%}
.lm-dw{visibility:hidden;transition:transform .28s ease,visibility 0s linear .28s}.lm-dw.open{visibility:visible;transition:transform .28s ease}
@media (prefers-reduced-motion:reduce){.lm-lp.on::before,.lm-wave i{animation:none}.lm-wave i{opacity:.6;transform:scale(.8)}.lm-dw,.lm-dw.open{transition:none}}`;document.head.append(s)}
const LM_SLOT={};   /* 人 id → 燈的編號（同一個人一直用同一盞，直到離開） */
function lmSlots(ids){for(const k of Object.keys(LM_SLOT))if(!ids.includes(k))delete LM_SLOT[k];const used=new Set(Object.values(LM_SLOT));
  for(const id of ids){if(LM_SLOT[id]!=null)continue;let h=0;for(const c of String(id))h=(h*31+c.charCodeAt(0))>>>0;
    let pk=-1;for(let i=0;i<LM_LAMPS.length;i++){const s=(h+i*7)%LM_LAMPS.length;if(used.has(s))continue;if(pk<0)pk=s;if(lmFar(s,used)){pk=s;break}}if(pk>=0){LM_SLOT[id]=pk;used.add(pk)}}}
/* 第 16 輪：新點的燈先挑離其他亮燈至少 LM_GAP（圖寬的 %；手機 375 寬約 44px）的那盞，44×44 的點選範圍才不會互相蓋到；都太近才照舊用第一盞空燈。座標是圖寬、圖高的 %，高換成寬的單位（圖 768×1376） */
const LM_GAP=12;
function lmFar(s,used){const a=LM_LAMPS[s];for(const u of used){const b=LM_LAMPS[u];if(!b)continue;if(Math.max(Math.abs(a[0]-b[0]),Math.abs(a[1]-b[1])*1376/768)<LM_GAP)return false}return true}
/* 照 XQNet 的即時資料畫棋桌、燈籠、剪影、銅鑼狀態 */
function lmPaint(v,P){const lay=P.querySelector(".lm-l");if(!lay||!window.XQNet)return;let ps=[];try{ps=XQNet.people()||[]}catch(e){}
  const me=(()=>{try{return XQNet.me().id}catch(e){return""}})(),G=(()=>{try{return XQNet.playing()&&XQNet.game()}catch(e){return null}})();
  /* 熟面孔、路過的石桌往事人物 */
  let fam=new Set();try{for(const x of(XQNet.rating().hist||[]))if(x.oid)fam.add(x.oid)}catch(e){}
  const games={};for(const p of ps)if(p.st==="playing"&&p.gid)(games[p.gid]=games[p.gid]||[]).push(p);
  /* 回饋 800：棋局比桌子多時，照熱度挑（熟面孔在下的最先、觀眾多的、段位高的），已經上桌的那盤不會被換走；其他的收進「更多棋局」 */
  const all=Object.keys(games).filter(g=>!G||g!==G.gid),cap=G?7:8;
  const heat=g=>(games[g].some(p=>fam.has(p.id))?1e6:0)+ps.filter(p=>p.st==="watching"&&p.gid===g).length*1e4+games[g].reduce((t,p)=>t+(+p.pts||0),0);
  for(const g of Object.keys(LM_TBL))if(!all.includes(g)||LM_TBL[g]>=cap)delete LM_TBL[g];
  {const used=new Set(Object.values(LM_TBL));for(const g of all.filter(g=>LM_TBL[g]==null).sort((a,b)=>heat(b)-heat(a))){let k=0;while(used.has(k))k++;if(k>=cap)break;LM_TBL[g]=k;used.add(k)}}
  const gids=Object.keys(LM_TBL).sort((a,b)=>LM_TBL[a]-LM_TBL[b]),moreG=all.length-gids.length;
  const T=[];if(G)T.push({mine:1,gid:G.gid});for(const g of gids)T.push({gid:g,l:games[g]});while(T.length<4)T.push({empty:1});
  let VS=[];try{VS=typeof lobbyVisitors==="function"?lobbyVisitors():[]}catch(e){}
  /* 回饋 800：人比燈多（50 盞）時，熟面孔、真人先點燈，石桌往事人物其次，雲遊棋客（電腦）最後；點不到燈的人數掛在「＋N 人」木牌上（點了開名冊） */
  const pri=id=>/^jc:/.test(id)?2:fam.has(id)?0:(typeof isCloud==="function"&&isCloud(id))?3:1;
  const ids0=ps.filter(p=>p.id!==me).map(p=>p.id).concat(VS.map(k=>"jc:"+k)),ids=ids0.map((id,i)=>[id,i]).sort((a,b)=>pri(a[0])-pri(b[0])||a[1]-b[1]).map(x=>x[0]).slice(0,LM_LAMPS.length);
  const extra=ids0.length-ids.length;lmSlots(ids);
  const lit={};for(const p of ps)if(p.id!==me&&LM_SLOT[p.id]!=null)lit[LM_SLOT[p.id]]={id:p.id,name:lbnShow(p),cls:(fam.has(p.id)?" fam":"")+(typeof isCloud==="function"&&isCloud(p.id)?" bot":"")};
  for(const k of VS){const s=LM_SLOT["jc:"+k];if(s!=null)lit[s]={jc:k,name:(typeof JCHAR!=="undefined"&&JCHAR[k]&&JCHAR[k].name)||k,cls:" story"}}
  const E=lmEra(),GU=(LM_SET.lantern_on||[]).includes(E),PALE=E==="tang"||E==="wudai";   /* 停靠朝代：唐以前掛青銅燈盞圖，唐、五代素紗燈 */
  const FIG=["fig_sit","fig_lean","fig_fan"].map(n=>lmN(n,E));
  lay.innerHTML=T.slice(0,8).map((t,i)=>{const[x,y]=LM_TABLES[i];const nm=t.l?t.l.map(p=>lbnShow(p)).join(" 對 "):"";
      const tg=t.empty?"span":"button";   /* 第 16 輪版面缺陷清零：空桌、暗燈本來就不接點選（pointer-events:none、tabindex -1），改成裝飾用的 span，不再算成按鈕（讀螢幕也不念「空著的燈」×40） */
      return`<${tg} class="lm-t${t.mine?" mine":""}${t.empty?" empty":""}" ${t.gid?`data-g="${esc(t.gid)}"`:""}${t.mine?' data-mine="1"':""} style="left:${x}%;top:${y}%;z-index:${Math.round(y)}" ${t.empty?'aria-hidden="true"':`aria-label="${esc(t.mine?"我的對局":nm+"・觀戰")}" tabindex="0"`}><img src="${LM_IMG(lmN(t.empty?"table_empty":"table_game",E))}" alt=""></${tg}>`}).join("")+
    LM_LAMPS.map(([x,y,f,g],i)=>{const o=lit[i];const fig=o&&g?`<img class="lm-fig" src="${LM_IMG(FIG[i%3])}" alt="" style="left:${x}%;top:${y+(f===2?10.5:7.5)}%">`:"";
      const tg=o?"button":"span";return`${fig}<${tg} class="lm-lp f${f}${GU?" gu":LM_INK_LAMP?" ink"+(PALE?" pale":""):""}${o?" on"+o.cls:""}" ${o?(o.jc?`data-jc="${esc(o.jc)}"`:`data-p="${esc(o.id)}"`):""} style="left:${x}%;top:${y}%" ${o?`aria-label="${esc(o.name)+(/ bot/.test(o.cls)?"（雲遊棋客・電腦）":"")}" tabindex="0"`:'aria-hidden="true"'}>${LM_INK_LAMP&&!GU?'<svg viewBox="0 0 20 46"><use href="#lmLamp"/></svg>':`<img src="${LM_IMG(lmN(o?"lantern_on":"lantern_off",E))}" alt="">`}${o&&/fam|story/.test(o.cls)?"<i></i>":""}</${tg}>`}).join("")+
    (XQNet.seeking&&XQNet.seeking()?'<span class="lm-wave"><i></i><i></i><i></i></span>':"")+
    (extra>0?`<button type="button" class="lm-more" data-more="p" style="left:88%;top:30.5%">＋${extra} 人</button>`:"")+
    (moreG>0?`<button type="button" class="lm-more" data-more="g" style="left:67%;top:90%">更多棋局 ＋${moreG}</button>`:"")+
    (!ids0.length&&!T.some(t=>t.gid)?'<span class="lm-quiet">天井清靜・敲鑼等棋友</span>':"");
  /* 點了＝按清單裡對應的那顆（邀請、觀戰、確認視窗都照原本） */
  const lb=v.querySelector("#lb"),press=sel=>{const b=lb&&lb.querySelector(sel);if(b){b.click();return true}return false};
  lay.querySelectorAll(".lm-t[data-g]").forEach(b=>b.onclick=e=>{e.stopPropagation();vibrate(5);if(b.dataset.mine){location.hash="#/pvp";return}press(`[data-w="${CSS.escape(b.dataset.g)}"]`)||toast("這盤剛下完了")});
  lay.querySelectorAll(".lm-lp[data-p]").forEach(b=>b.onclick=e=>{e.stopPropagation();vibrate(5);press(`[data-p="${CSS.escape(b.dataset.p)}"]`)||(typeof oppCard==="function"&&oppCard(b.dataset.p,b.getAttribute("aria-label")))});
  lay.querySelectorAll(".lm-lp[data-jc]").forEach(b=>b.onclick=e=>{e.stopPropagation();vibrate(5);if(typeof jcharSheet==="function")jcharSheet(b.dataset.jc)});
  lay.querySelectorAll(".lm-more").forEach(b=>b.onclick=e=>{e.stopPropagation();vibrate(5);const l=P.querySelector("#lmList");if(l)l.click()});
  {const l=P.querySelector("#lmList b");if(l)l.textContent=ids0.length?`📜 名冊 ${ids0.length}`:"📜 名冊"}
  const gb=P.querySelector("#lmGong");if(gb){const sk=XQNet.seeking&&XQNet.seeking();gb.querySelector("b").textContent=sk?"🥁 找對手中…":"🎲 隨機配對";gb.classList.toggle("hot",!!sk)}
  const ai=P.querySelector("#lmAi");if(ai){const aw=!!(lb&&lb.querySelector("#aiw"));ai.querySelector("b").textContent="📺 AI 對戰";ai.style.display=aw?"":"none"}}
function lobbyMap(v){const lb=v.querySelector("#lb");if(!lb||v.querySelector(".lobby-page"))return;lmCss();
  const d=document.createElement("div");
  const lmNt=typeof sw7NightNow==="function"&&sw7NightNow();   /* 11/10 日落後換夜景圖 lobby_<朝>_night；棋桌、茶客小圖跟著調暗（.nt），燈照樣亮 */
  d.innerHTML=`<div class="shp-page cq lobby-page${lmNt?" nt":""}"><img src="${LM_IMG((typeof hbIsCl==="function"&&hbIsCl()?"lobby_classic":lmN("lobby",lmEra()))+(lmNt?"_night":""))}" alt="千燈天井" onerror="this.onerror=null;this.src=this.src.replace('_night.','.');this.parentNode.classList.remove('nt')"><div class="lm-l"></div>${LM_INK_LAMP?LM_LAMP_SVG:""}${LM_SPOTS.map(([id,x,y,t])=>`<button class="shp-spot" id="${id}" style="left:${x}%;top:${y}%"><b>${esc(t)}</b></button>`).join("")}</div>`;
  const P=d.firstElementChild;v.insertBefore(P,lb);
  /* 名冊抽屜：原本的清單整個搬進來（還在 v 裡面，paint() 照樣找得到 #lb） */
  const dw=document.createElement("div");dw.className="lm-dw";dw.innerHTML='<div class="lm-dw-h">📜 名冊<button type="button" aria-label="關上名冊">✕</button></div><div class="lm-dw-b"></div>';
  const sc=document.createElement("div");sc.className="lm-scrim";v.append(sc,dw);dw.querySelector(".lm-dw-b").append(lb);
  let unNav=null;const open=on=>{const was=dw.classList.contains("open");if(on&&!was&&typeof xqPanelNav==="function")unNav=xqPanelNav(()=>{unNav=null;dw.classList.remove("open");sc.classList.remove("open")});if(!on&&was&&unNav){const f=unNav;unNav=null;f()}dw.classList.toggle("open",on);sc.classList.toggle("open",on)};   /* 回饋 803：返回鍵先收名冊 */dw.querySelector("button").onclick=()=>open(false);sc.onclick=()=>open(false);
  /* 清單裡按了會換頁、開資料卡的按鈕：先把抽屜收起來 */
  lb.addEventListener("click",e=>{if(e.target.closest("button,[data-p],[data-jc]"))setTimeout(()=>{if(!document.getElementById("sheet")&&!document.querySelector(".modal .box"))open(false)},50)});
  const lbPress=sel=>{const b=lb.querySelector(sel);if(b){b.click();return true}return false};
  let gongT=0;const GO={lmCup:()=>lbPress("#cupE")||(location.hash="#/cup"),lmList:()=>open(true),
    lmGong:()=>{const t=Date.now();if(t-gongT<600)return;gongT=t;   /* 回饋 860（入口盤查後續）：角色已經站在入口前，快點兩下會切換兩次（開始找又取消）；600ms 內只算一次 */
      if(XQNet.playing&&XQNet.playing()){lbPress("#back");return}{const sk=XQNet.seeking&&XQNet.seeking();if(!sk)lmGongHit(P);lbPress(sk?"#sk0":"#sk1")}},
    lmAi:()=>lbPress("#aiw")||(location.hash="#/cpu")};
  for(const[id]of LM_SPOTS){const b=P.querySelector("#"+id);if(b)b.onclick=()=>{vibrate(5);try{GO[id]()}catch(e){}}}
  lmPaint(v,P);
  /* 清單每次重畫（有人進出、每 15 秒）場景也跟著重畫 */
  const mo=new MutationObserver(()=>{if(!P.isConnected){mo.disconnect();return}lmPaint(v,P)});mo.observe(lb,{childList:true});
  if(typeof shpFit==="function")shpFit(v);
  try{if(typeof shwPage==="function"&&SHIP_WALK_ON)shwPage(v,Object.assign({},SHW_PG0,SHW_LOBBY),"lobby")}catch(e){}
  try{if(typeof zmPage==="function")zmPage(v)}catch(e){}}
if(typeof Lobby==="function"){const f0=Lobby;Lobby=function(v){const r=f0.apply(this,arguments);try{if(LOBBY_MAP_ON&&OFF&&window.XQNet)lobbyMap(v)}catch(e){}return r}}
/* 11/10 開發者「線上對戰點進去場景跟茶坊不同，玩家會困惑」第一步：
   ① 茶坊圖上的入口改叫「走進天井・線上對戰」，點了畫面往天井那張方桌拉近、淡出，再到天井頁（像走進去）；
   ② 天井頁一打開從稍微放大、淡淡的慢慢退回原位，標題改「〇〇・天井」（〇〇跟停靠朝代的茶坊名）。手機設定「減少動態效果」就直接換頁 */
/* 11/12 ChatGPT UI 冗餘盤查（story/104 號）第 4 項：入口名稱只寫「線上對戰」（跟對戰頁第一次的短暫提示同一個詞）；「走進天井」留給場景本身（點了拉近走進天井的動畫、天井頁標題） */
const LM_NET_NM="線上對戰";
let LM_IN=0;
const lmNoMove=()=>{try{return matchMedia("(prefers-reduced-motion: reduce)").matches}catch(e){return false}};
if(typeof hubMap==="function"){const f0=hubMap;hubMap=function(v,hub){const r=f0.apply(this,arguments);try{if(hub==="battle"){const b=v.querySelector("#hbNet"),P=v.querySelector(".hub-page");if(b&&P){
  const w=document.createTreeWalker(b,NodeFilter.SHOW_TEXT);while(w.nextNode()){const n=w.currentNode;if(/線上對戰/.test(n.nodeValue)){n.nodeValue=n.nodeValue.replace(/線上對戰・觀戰|線上對戰/,LM_NET_NM);break}}
  const orig=b.onclick;b.onclick=e=>{if(typeof orig!=="function")return;if(lmNoMove()||!P.animate)return orig(e);if(P.dataset.lmGo)return;P.dataset.lmGo="1";LM_IN=Date.now();
    P.style.transformOrigin="50% 55%";const an=P.animate([{transform:"scale(1)",opacity:1},{transform:"scale(2.4)",opacity:0}],{duration:460,easing:"ease-in",fill:"forwards"});
    let done=false;const go=()=>{if(done)return;done=true;orig(e);setTimeout(()=>{try{an.cancel()}catch(x){}delete P.dataset.lmGo},400)};an.onfinish=go;setTimeout(go,600)}}}}catch(e){}return r}}
if(typeof lobbyMap==="function"){const f1=lobbyMap;lobbyMap=function(v){const r=f1.apply(this,arguments);try{
  const t=document.getElementById("title");if(t&&typeof xqHubName==="function"){const n=xqHubName("battle").split(" ").slice(1).join(" ");if(n)t.textContent=n+"・天井"}
  const P=v.querySelector(".lobby-page");if(P&&Date.now()-LM_IN<2500&&!lmNoMove()&&P.animate){LM_IN=0;P.style.transformOrigin="50% 70%";P.animate([{transform:"scale(1.16)",opacity:0},{transform:"scale(1)",opacity:1}],{duration:520,easing:"ease-out"})}}catch(e){}return r}}
