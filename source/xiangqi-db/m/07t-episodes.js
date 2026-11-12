/* ================= 🎐 旅途插曲：雲河七星的遊玩互動、插曲與意外（開發者 11/8 核准 Gemini 五案；提問 story/gemini_app/30_七星互動插曲意外五案.md）=================
   原則：插曲最後都落在一盤棋、一題殘局或一個棋理選擇上；有機率、有條件才出現；不懲罰、不擋主線、不加新貨幣；線上對戰完全不受影響。
   共用：
     開關＝每案一個常數 EP1_ON～EP5_ON；玩家可以在 設定 → 角色 →「🎐 旅途插曲」關掉（store "epOff"，偏好、各存檔格共用，不跟存檔走）。
     頻率＝五案合計一天最多 EP_DAYMAX（2）次、兩次至少隔 EP_GAP（30 分鐘）；只有雲河七星的旅程才有（說書人的學徒沒有）。開發者模式的「立即觸發」不算次數。
     出現的地方：星槎頁、渡口（包一層 07j-visit.js 的 v7Try：輪到插曲時這次就不來串門子）、首頁（只有第 4 案）、驛站信箱（包一層 07m-yizhan.js 的 yzMail）、園子對局（聽 local.js 的 xq-play）。
     解題頁＝07c-canju.js 的 CanjuPlay，網址 #/canju/e/<案>/<…>（包一層 07e-garden2.js 的 cjXMode 給 XM 設定）；第 5 案的題目在 data/canju/episode-set.json（包一層 07c 的 cjData 併進 byId）。
     石桌對話框（epTalk）：每句一張小立繪＋名字＋話；台詞裡 {名}＝怎麼叫玩家、{你}＝你／妳、{@S}…{@X}＝某位七星的小名（小梅叫燕子「燕子姊姊」、方庭不叫「庭哥」）。
     存檔 store "ep"（JOURNEY_KEYS 的 m_ep）＝{d 今天,n 今天幾次,last 上次時間,at {站:第一次看到停在這站的時間},lose {站:千秋殘局連續走錯幾步},r1 {站:哪天擲過},
       a {站:{k 第幾組,c [兩位],L {角色:題號},pick 選了誰,at,done}},m {信:{at 收到,done 重圓,f 填對的格}},mp 信箱裡等著的那封,g {對局:1},nt 哪一晚,ntr {哪一晚:擲過},
       sw {cur {id,c,p,at},done {題號:時間},t {子:得到稱號的時間},pend 起航後等著出現的那一次}}；解題進度 store "cjRunEp"（也在 JOURNEY_KEYS）。
   1 石桌起爭執（EP1_ON）：非家鄉站停靠超過 3 天、或這站千秋殘局連續走錯 2 步，每天擲一次 30%；每朝最多一次。兩位角色為見聞或棋理吵起來（EP1_TALK，每朝兩組、人不重複，
     玩家是其中一位就換另一組），玩家選邊 → 解一題「被選的那顆子當主力」的短殺（epPick1：照 data/canju/tags.json 標籤＋主變裡這顆子動幾步、第一步、最後一步；另一顆子在主變裡不能動，
     最好根本不在盤上；相、仕、帥的殺法題太少，照 07q 的放寬法退到「安靜一手」「以少勝多」）；兩題在吵起來那一刻挑好存檔。解開：贏方得意、輸方嘟囔，修為 +20（addXP「插曲」）；退出、看答案都不罰。
   2 驛站漏字信（EP2_ON）：打開驛站信箱時 20% 收到一封被雨水浸壞的信（EP2_MAIL，要停靠過那一站、讀過那一章）；字卡填進缺字（每格附一句棋理提示），填錯無限重試，
     或用一顆提示棋亮出正解；填完蓋「重圓」印、修為 +20，信留在信箱裡可以重讀。
   3 不速之客（EP3_ON）：只在單機的園子對局（st.journey==="park"）、輪到你、第 15～20 步、局面接近（引擎 ±1.5 兵內、沒被將軍）時，每盤擲一次 15%。
     一兩位七星跑來觀戰、對手宣告「若我這一步走這裡」：拿現在的局面讓對手多走一步（Pikafish 挑一步真的有威脅、而且守得住的），你在 3 步內化解（對手用引擎應），
     3 步後引擎判分沒比最佳守法差 1.8 兵以上就算化解：修為 +30、七成機率撿到這一朝的珍品。失敗或退出直接回原局。
     這段是蓋在對局上的另一層，完全不碰 local.js 裡的那盤棋（盤面、步數、悔棋、存檔都不動），關掉時檢查原局沒變、通知對局頁重畫；中途換頁就收掉；App 關掉＝沒發生過。
   4 星夜茶話會（EP4_ON）：深夜 23:00～04:00 打開 App（首頁、星槎、渡口），或這一站停靠超過 48 小時還沒學會，每晚擲一次 50%；每晚最多一次。
     兩位七星陪你玩 1 分鐘眼力題（一步將軍：點出走一步就能將軍的紅子；傌的將軍點：點出紅傌站上去就將軍的格子），結束一定勸你去休息；
     獎勵二選一：修為 +15，或「燈花」＝提示棋 1 顆（hintBonus，跟兩位老人送的同一種，不是新東西）。
   5 星槎大掃除（EP5_ON）：起航或千秋穿梭時 5%，到站後星槎頁冒出來：有人掃地時把一顆子掃進了雲河，玩家解「少一子」的殘局（tools/canju/9_episode.js 用 Pikafish 重建全部應著樹，
     確認少了那顆子照樣殺得了才收錄）；不改棋規。解開修為 +25，每種子第一次解開得到稱號（EP5_TITLE，設定的旅途插曲卡片上看得到）；失敗不罰。
   人物口吻照《雲河七星》最終定稿與 story/寫正文檢查清單.md；不說破後段（說書人身分、界石下落）；跟某一章有關的話要讀過那一章（shipRead）才出現。 */
const EP1_ON=true,EP2_ON=true,EP3_ON=true,EP4_ON=true,EP5_ON=true;   /* 開發者還沒看過：先全部關著，開發者模式的「立即觸發」照樣能試 */
const EP_DAYMAX=2,EP_GAP=30*6e4,EP_P={1:.3,2:.2,3:.15,4:.5,5:.05},EP_XP={1:20,2:20,3:30,4:15,5:25};
const EP_K={S:"x_swordboy",Y:"x_spiritgirl",H:"x_martialgirl",M:"x_miaogirl",F:"x_shuai",L:"x_shi",X:"x_bing"};
const EP_PC={x_swordboy:"R",x_spiritgirl:"B",x_martialgirl:"C",x_miaogirl:"N",x_shuai:"K",x_shi:"A",x_bing:"P"};
const EP_PCN={R:"俥",N:"傌",C:"炮",P:"兵",K:"帥",A:"仕",B:"相"};
let EP_DEV=0,EP3_FORCE=false,EP3_ON_NOW=false;
function epSt(){const S=store.get("ep",null)||{};for(const k of["at","lose","r1","a","m","g","ntr"])if(!S[k]||typeof S[k]!=="object")S[k]={};S.sw=S.sw&&typeof S.sw==="object"?S.sw:{};S.sw.done=S.sw.done||{};S.sw.t=S.sw.t||{};return S}
const epSave=S=>store.set("ep",S);
const epMe=()=>{try{return myChar()}catch(e){return""}};
function epOk(){try{return!store.get("epOff",false)&&!!journey()&&!!myChar()&&!shipAppr()}catch(e){return false}}
function epNet(){try{return!!(window.XQNet&&typeof XQNet.playing==="function"&&XQNet.playing())}catch(e){return false}}
/* 今天還能不能再來一次插曲（一天 2 次、隔 30 分鐘） */
function epRoom(S){const d=localDay();if(S.d!==d){S.d=d;S.n=0}return(S.n|0)<EP_DAYMAX&&Date.now()-(S.last||0)>=EP_GAP}
function epCount(S){if(EP_DEV)return;const d=localDay();if(S.d!==d){S.d=d;S.n=0}S.n=(S.n|0)+1;S.last=Date.now()}
function epHere(){try{return shipHere()}catch(e){return"classic"}}
const epRead=k=>!!(store.get("shipRead",{})||{})[k];
const epNk=(c,by)=>by===EP_K.M&&c===EP_K.Y?"燕子姊姊":c===EP_K.F?"方庭":((WX_CHARS[c]||{}).nk||(WX_CHARS[c]||{}).n||"");
function epTx(s,by){const me=epMe(),M=WX_CHARS[me]||{};return String(s).replace(/\{@([SYHMFLX])\}/g,(m,k)=>epNk(EP_K[k],by)).replace(/\{名\}/g,epNk(me,by)).replace(/\{你\}/g,M.sx==="f"?"妳":"你")}
const epOne=a=>a[Math.floor(Math.random()*a.length)];
function epCss(){if(document.getElementById("epCss"))return;const s=document.createElement("style");s.id="epCss";s.textContent=`
.v7.ep{max-width:min(84vw,310px)}
.ep-say{display:flex;gap:10px;align-items:flex-start;margin:6px 0;line-height:1.65;font-size:15.5px;font-family:var(--serif)}
.ep-say img{flex:none;width:42px;height:56px;object-fit:cover;object-position:top;border-radius:8px;background:var(--bg)}
.ep-say b{display:block;font:700 12.5px var(--sans);color:var(--accent)}.ep-say.tl b{color:#7A5512}
.ep-say.me{flex-direction:row-reverse;text-align:right}
.ep-row{display:flex;gap:8px;margin-top:10px}.ep-row .btn{flex:1;margin:0}
.ep-card{margin-top:10px;padding:10px 12px;border:1px dashed var(--line);border-radius:12px;line-height:1.7}
.ep-ov{position:fixed;inset:0;z-index:60;background:var(--bg);display:flex;flex-direction:column;overflow:auto;padding:10px 12px calc(14px + env(safe-area-inset-bottom))}
.ep-ov h3{margin:2px 0 4px;font-family:var(--serif);font-size:18px}.ep-ov .boardbox{padding:4px 0}.ep-ov .boardbox svg{max-width:440px}
.ep-st{min-height:24px;font-weight:700;text-align:center;margin:4px 0}.ep-tm{font:900 22px var(--sans);text-align:center;color:var(--accent)}
.ep-letter{position:relative;padding:14px 14px 18px;border-radius:10px;background:#f6efe0;color:#2a2018;font:17px/2.1 "Noto Serif TC",var(--serif);border:1px solid #d9c9a6;box-shadow:inset 0 0 30px rgba(120,90,40,.15)}
.ep-letter .bl{display:inline-block;min-width:1.4em;height:1.5em;line-height:1.5em;margin:0 1px;text-align:center;border-bottom:2px dotted #8a6d3b;color:#B3261E;font-weight:900;cursor:pointer;background:rgba(120,140,170,.18);border-radius:4px}
.ep-letter .bl.sel{outline:2px solid #C8962E}.ep-letter .bl.ok{background:none;border-bottom:0;cursor:default}
.ep-clue{margin:10px 0 6px;padding:8px 10px;border-radius:10px;background:rgba(200,150,46,.12);border:1px solid rgba(200,150,46,.45);line-height:1.6;font-size:15px}
.ep-cards{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:8px 0}
.ep-cards button{width:48px;height:56px;border-radius:8px;border:1.5px solid #2a2018;background:#fffaf0;color:#2a2018;font:900 24px "Noto Serif TC",serif;box-shadow:0 2px 4px rgba(0,0,0,.2)}
.ep-cards button.hl{border-color:#C8962E;box-shadow:0 0 0 3px #C8962E}.ep-cards button.no{animation:epShake .35s}
.ep-seal{position:absolute;right:12px;bottom:10px;width:64px;height:64px;border:3px solid #B3261E;border-radius:8px;color:#B3261E;font:900 22px/1.15 "Noto Serif TC",serif;display:flex;align-items:center;justify-content:center;text-align:center;transform:rotate(-8deg);opacity:.85;animation:epSeal .5s ease-out both}
@keyframes epShake{0%,100%{transform:none}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
@keyframes epSeal{from{transform:rotate(-8deg) scale(2.2);opacity:0}to{transform:rotate(-8deg) scale(1);opacity:.85}}
@media (prefers-reduced-motion:reduce){.ep-seal,.ep-cards button.no{animation:none}}`;document.head.append(s)}
const epFace=c=>c==="teller"?`<img src="data/actors/teller.webp" alt="" onerror="this.remove()">`:`<img src="data/xs/prev_${c}.webp" alt="" onerror="this.remove()">`;
function epSay(c,line){const nm=c==="teller"?"說書人":epNk(c);return`<div class="ep-say${c==="teller"?" tl":""}">${epFace(c)}<div><b>${esc(nm)}</b>「${esc(epTx(line,c))}」</div></div>`}
function epTalk(L){return L.map(([c,l])=>epSay(EP_K[c]||c,l)).join("")}
/* 星槎頁、渡口、首頁上的小卡（借 07j 的 .v7 樣式；點了開 fn） */
function epBubble(v,where,cs,title,line,fn){if(typeof v7Css==="function")v7Css();epCss();const el=document.createElement("div");el.className="v7 ep"+(where==="port"?" inl":"");el.setAttribute("role","button");el.setAttribute("aria-label",title);
  el.innerHTML=`<img src="data/xs/prev_${cs[0]}.webp" alt="" onerror="this.remove()">${cs[1]?`<img src="data/xs/prev_${cs[1]}.webp" alt="" style="margin-left:-26px" onerror="this.remove()">`:""}<div class="v7b"><b>${esc(title)}</b><span>「${esc(epTx(line,cs[0]))}」</span><button class="v7x" aria-label="先不理">✕</button></div>`;
  const bye=()=>{el.classList.add("out");setTimeout(()=>el.remove(),450)};
  el.querySelector(".v7x").onclick=e=>{e.stopPropagation();vibrate(5);bye()};el.onclick=()=>{vibrate(5);el.remove();fn()};
  if(where==="port"){const a=v.querySelector(".port-say");if(a)a.after(el);else{const p=v.querySelector(".pad")||v;p.prepend(el)}}
  else if(where==="home"){el.style.left="10px";el.style.top=Math.max(70,innerHeight-230)+"px";document.body.append(el);setTimeout(()=>{if(el.isConnected)bye()},20000)}
  else{el.style.visibility="hidden";v.append(el);if(typeof v7Place==="function")v7Place(v,el);else{el.style.left="10px";el.style.top="80px"}el.style.visibility="";setTimeout(()=>{if(el.isConnected)bye()},20000)}
  vibrate(8);return el}
/* 主變（解題方與對方交替）；解題方每一步是哪顆子 */
function epMain(P){const out=[];let n=P.tree;while(n&&n.o){const u=Object.keys(n.o)[0];if(!u)break;const o=n.o[u];out.push(u);if(o[1]){out.push(o[0]);n=o[1]}else break}return out}
function epMoves(P){const C=window.XQCore;let b=C.parseFen(P.fen);const r=[];epMain(P).forEach((u,i)=>{const f=C.parseSq(u.slice(0,2)),t=C.parseSq(u.slice(2,4));if(i%2===0)r.push(String(b[f]||"").toUpperCase());b=C.make(b,f,t)});return r}

/* ---------- 1 石桌起爭執 ---------- */
/* 每朝兩組（人不重複）：a、b＝兩位（EP_K 的代號）；l＝對話 [誰, 話]；g＝被選上、解開以後得意的一句；m＝沒被選上的嘟囔 */
const EP1_TALK={
  classic:[{a:"M",b:"L",l:[["M","船頭的燈好亮呀！我跳過去看看就回來！"],["L","坐下。"],["M","傌本來就是跳著走的嘛，一直坐著，腳都麻了。"],["L","仕不出九宮。守住，才不出事。"],["M","{名}，{你}評評理嘛！"]],
      g:{M:"嘿嘿，跳出去，也找得到路回來！",L:"……守住了。"},m:{M:"好嘛好嘛，坐一下就坐一下……",L:"……跳得是快。下回先說一聲。"}},
    {a:"X",b:"F",l:[["X","棋盤上最要緊的，當然是小兵啦！沒有兵衝在前頭，誰去擒王？"],["F","帥若倒了，整盤棋就輸了。"],["X","帥坐著不動，又不會倒。"],["F","不動，也是在撐著大家。"],["X","{名}，{你}說，誰最要緊？"]],
      g:{X:"小兵擒王！我就說嘛！",F:"帥站穩了，大家才敢往前。"},m:{X:"……帥坐著，原來也不輕鬆。",F:"……溪兒的兵，走得是勇敢。"}}],
  qin:[{a:"S",b:"H",l:[["S","直道從雲陽一路往北。車只管往前，最快。"],["H","前面堆著石頭呢！我看呀，得先轟開一條路。"],["S","轟開？那是蠻勁。俥看準了，自己找得到通路。"],["H","蠻勁？沒有架子，炮還不打呢！我是有章法的！"],["S","{名}，秦地的路，該怎麼走？"]],
      g:{S:"看準了，一直走，就到了。",H:"哈！石頭一轟，路就開啦！"},m:{S:"……隔一個打一個，我記下了。",H:"直走就直走嘛……下回換我。"}},
    {a:"X",b:"Y",l:[["X","那邊的老伯推不動車，我去幫一把啦！"],["Y","先等等。妳一個人衝過去，車沒推動，自己先摔了。"],["X","兵就是往前走的嘛，停下來心裡不踏實。"],["Y","相守在後頭，前面的人才敢往前走。"],["X","{名}，{你}說，先衝還是先守？"]],
      g:{X:"看吧，一步一步往前，也走到了！",Y:"穩住了再走，就不怕摔。"},m:{X:"好啦好啦，守著也行……可是我腳癢。",Y:"……往前衝，也是一種照應吧。"}}],
  han:[{a:"M",b:"S",l:[["M","沙地上繞著紅柳走，比直穿過去快多了！"],["S","繞路，容易繞丟。直走，看得見方向。"],["M","傌走日字，本來就是拐著彎到的呀。"],["S","拐彎要先看馬腳。腳被蹩住了，跳不過去。"],["M","{名}，{你}說嘛，繞路好還是直走好？"]],
      g:{M:"拐個彎，就到啦！",S:"看清楚，就直走。"},m:{M:"直的也行嘛……就是沒那麼好玩。",S:"……拐彎，有時候是快。"}},
    {a:"H",b:"L",l:[["H","風這麼大，我喊一聲，前頭的人就知道我們在這裡！"],["L","別喊。守著門。"],["H","光守著，人怎麼找得到？炮不響，誰知道它在哪？"],["L","仕守住宮門，帥才安穩。"],["H","{名}，{你}評評理！"]],
      g:{H:"響一聲，路就開了！",L:"守住了。"},m:{H:"……好嘛，守門也是在幫忙。",L:"……響得好。"}}],
  sanguo:[{a:"F",b:"L",l:[["F","城子，我想到船樓上看看江面。"],["L","風大。你留在這裡。"],["F","帥只在九宮裡走，可九宮裡也有路。我總不能一步都不動。"],["L","帥一動，仕就得跟著換位置。"],["F","{名}，勞{你}評個理：帥該動，還是該坐著？"]],
      g:{F:"原來帥走一步，也能幫上忙。",L:"坐穩了，就不會輸。"},m:{F:"……城子說得也是。我再想想。",L:"……你想去，我陪你去。"}},
    {a:"X",b:"S",l:[["X","江上的船一艘挨一艘，我從船頭跳過去，一步一步就過江啦！"],["S","一步一步太慢。看準了，一條直線划過去。"],["X","兵過了河才能橫著走，急什麼嘛。"],["S","俥一步就能走到底。"],["X","{名}，{你}說，快的好還是穩的好？"]],
      g:{X:"一步一步，也過江啦！",S:"直線，最快。"},m:{X:"好啦，一條直線……可是我想看看兩邊。",S:"……一步一步，也到了。"}}],
  weijin:[{a:"H",b:"Y",l:[["H","那兩個人下的棋，黑白的，一顆都不吃！真悶！"],["Y","小聲一點。人家下得安靜，我們繞過去。"],["H","象棋才好看，一炮過去，熱熱鬧鬧！"],["Y","守得住，也是本事。不是每一盤都要響。"],["H","{名}，{你}說，棋要下得熱鬧，還是下得穩？"]],
      g:{H:"熱熱鬧鬧，才像下棋！",Y:"看，守住了，就不怕。"},m:{H:"……穩穩的，好像也不壞。",Y:"花兒的炮，是響得好看。"}},
    {a:"M",b:"F",l:[["M","溪水才到腳踝，跳石頭過去，一下就到對岸啦！"],["F","石頭滑。我們沿著溪邊走，找座橋吧。"],["M","傌哪有不跳的？跳過去才看得到對岸呀！"],["F","帥走得慢，但每一步都踩實了。"],["M","{名}，{你}幫誰？"]],
      g:{M:"嘿嘿，跳過去就到啦！",F:"慢慢走，也到了對岸。"},m:{M:"好嘛，走橋……橋上看風景也好。",F:"……跳過去，原來也不難。"}}],
  nanbei:[{a:"X",b:"Y",l:[["X","對岸就是江南了！小兵一過河，就能橫著走啦！"],["Y","相不過河。守著這邊的渡口，也很要緊。"],["X","可是不過河，怎麼看得到那邊？"],["Y","守在這裡的人，等的就是過河的人回來。"],["X","{名}，{你}說，過河好，還是守河好？"]],
      g:{X:"過了河，天地就大啦！",Y:"守住河口，大家都過得去。"},m:{X:"……守著渡口，也得有人做嘛。",Y:"溪兒過河的樣子，真像一隻小鴨子。"}},
    {a:"H",b:"F",l:[["H","江面上船好少！我去渡口敲鑼，叫一艘過來！"],["F","花兒，先別敲。看看渡口的規矩，再開口也不遲。"],["H","等規矩，船都走了！炮要響得早才有用！"],["F","帥不輕易出宮。先看清楚，才不會打錯。"],["H","{名}，{你}評評理！"]],
      g:{H:"看！一響就有人來了！",F:"看清楚了，再出手。"},m:{H:"……先看清楚，好像也對。",F:"……花兒這一聲，是響得及時。"}}],
  sui:[{a:"X",b:"M",l:[["X","挖河就得一鍬一鍬往前挖，哪有捷徑嘛！"],["M","我看那邊地勢低，從那兒繞過去，水自己就流過來了呀！"],["X","繞來繞去，河就歪了啦。"],["M","傌走日字，歪著走，也比直著走快！"],["X","{名}，{你}說，一步一步好，還是繞過去好？"]],
      g:{X:"一鍬一鍬，河就通啦！",M:"嘿嘿，繞過去就通啦！"},m:{X:"……繞一下，好像也省力。這回算我欠妳的。",M:"好嘛，一步一步……溪兒的腳比我穩。"}},
    {a:"S",b:"Y",l:[["S","先把這車土運完，再喝茶。"],["Y","太陽這麼大，先歇一口氣。茶涼了就不好喝了。"],["S","俥不停，路才走得完。"],["Y","相守在家，人才有地方回來喝茶。"],["S","{名}，{你}說呢？"]],
      g:{S:"運完了。現在喝茶。",Y:"看，歇過了，走得更快。"},m:{S:"……茶，是好喝。",Y:"好，那就先運完，我把茶溫著。"}}],
  tang:[{a:"H",b:"L",l:[["H","那把西域的刀亮晶晶的！我去試一試！"],["L","別碰。"],["H","看看又不會怎樣！炮不試，怎麼知道打得多遠？"],["L","刀不是玩的。仕守在旁邊，就是不讓人亂碰。"],["H","{名}，{你}幫我說句話嘛！"]],
      g:{H:"試一下就知道啦！",L:"守住了。"},m:{H:"……好嘛，不碰就不碰。",L:"……下回我陪妳看。"}},
    {a:"F",b:"Y",l:[["F","那位胡商的駝隊從很遠的地方來。我想去問問路上的事。"],["Y","西市人多，走散了不好找。大家先在一起。"],["F","帥坐在九宮，也該知道九宮外頭的事。"],["Y","相守著帥，帥才能安心問。"],["F","{名}，勞{你}說說看。"]],
      g:{F:"問過了，路就清楚了。",Y:"都在一起，就不怕。"},m:{F:"……燕子說得是，走散了，大家都擔心。",Y:"好，去問吧。我在這裡等。"}}],
  wudai:[{a:"H",b:"M",l:[["H","這盤棋，兩門炮疊在一起，對方的將就悶死啦！"],["M","一匹馬臥槽，也能將死呀，還不用那麼大聲。"],["H","大聲才嚇得住人嘛！"],["M","嚇人做什麼？輕輕跳過去就好了。"],["H","{名}，{你}說，炮好還是馬好？"]],
      g:{H:"兩門炮一疊，悶住啦！",M:"跳過去，不用喊！"},m:{H:"……輕輕的，也行。",M:"好嘛，炮響起來是很威風啦。"}},
    {a:"S",b:"F",l:[["S","前面的路燒斷了。從田間直穿過去，天黑前能到。"],["F","田裡有人家在收拾。我們等一等，問清楚再走。"],["S","等，天就黑了。"],["F","帥走得慢，但不會走錯。"],["S","{名}，{你}說。"]],
      g:{S:"到了。路是直的。",F:"問清楚了，就不會繞路。"},m:{S:"……問清楚，也好。",F:"……阿轍看路，看得比我準。"}}],
  song:[{a:"H",b:"X",l:[["H","這盤當頭炮，我一炮就打進去！"],["X","炮要有架子才打得到。沒有小兵在前面墊著，炮哪兒也打不進啦。"],["H","架子誰都能當，打進去的才厲害！"],["X","那妳試試看，沒有兵，炮怎麼打！"],["H","{名}，{你}說，是炮厲害，還是兵厲害？"]],
      g:{H:"一炮打進去啦！",X:"兵一步一步，也擒得到王！"},m:{H:"……好啦，沒有架子，炮是打不響。",X:"好嘛，炮響了……可是架子是我墊的喔！"}},
    {a:"Y",b:"L",l:[["Y","燈市人多，我守在外頭，大家走散了，就往我這裡找。"],["L","外頭太遠。守在近處就好。"],["Y","相守河口，看得遠。"],["L","仕守宮門，離得近。"],["Y","{名}，{你}說，守遠一點好，還是守近一點好？"]],
      g:{Y:"看得遠，才接得住。",L:"近的，最穩。"},m:{Y:"……守在身邊，也是一種照應。",L:"……燕子看得遠。"}}],
  yuan:[{a:"M",b:"Y",l:[["M","驛站的馬都認得我！我騎一匹，一下就跑到水蕩那頭！"],["Y","先跟驛裡的人說一聲，再去。"],["M","傌就是要跑呀，說一聲多慢。"],["Y","說了一聲，跑多遠，大家都找得到妳。"],["M","{名}，{你}說嘛！"]],
      g:{M:"嘿嘿，臥槽一跳，就到啦！",Y:"說好了再去，大家都放心。"},m:{M:"好嘛……先說一聲。",Y:"……妳跑得真快。"}},
    {a:"S",b:"L",l:[["S","草原上沒有路，就自己壓出一條直的。"],["L","別亂走。跟著牧民的帳篷走。"],["S","俥不怕沒有路。"],["L","仕不離宮。離了，就回不來。"],["S","{名}，{你}說。"]],
      g:{S:"壓出來了，就是路。",L:"跟著走，不會丟。"},m:{S:"……跟著人走，也好。",L:"……路，是你壓出來的。"}}],
  ming:[{a:"X",b:"L",l:[["X","當鋪的櫃台好高！我幫忙搬東西，跑得最快啦！"],["L","別碰。當鋪的東西，一件都不能錯。"],["X","兵一步一步走，不會錯的嘛。"],["L","仕守著櫃台，就是不讓東西錯。"],["X","{名}，{你}幫誰？"]],
      g:{X:"看吧，一件都沒錯！",L:"嗯。沒錯。"},m:{X:"好嘛……城子守得真緊。",L:"……跑得穩。"}},
    {a:"S",b:"F",l:[["S","殘局到了最後，帥就該坐著，讓俥去衝。"],["F","帥也能幫忙。站到旁邊那一路，俥就多了一條路。"],["S","帥出來，太險。"],["F","帥仍在九宮之內，不算出去。"],["S","{名}，{你}說。"]],
      g:{S:"俥衝到底，就殺了。",F:"看，帥讓開一路，俥就有路了。"},m:{S:"……帥也能幫忙，我記下了。",F:"……阿轍的俥，衝得真直。"}}],
  qing:[{a:"X",b:"F",l:[["X","碼頭的巷子我都認得！我抄小巷跑過去，比走大街快多啦！"],["F","雪地滑。我們走大街，慢一點也不要緊。"],["X","小兵過了河就能橫著走，抄小巷剛剛好嘛。"],["F","帥不怕慢，只怕摔。"],["X","{名}，{你}說呢？"]],
      g:{X:"看！抄小巷就到啦！",F:"慢慢走，一個都沒摔。"},m:{X:"好啦……大街也沒那麼慢。",F:"……溪兒認得路，跟著她走，是快。"}},
    {a:"H",b:"L",l:[["H","這條船繩，我一甩就甩上岸了！"],["L","先看繩結。綁不牢，船會漂走。"],["H","看來看去，船都開了！炮要快！"],["L","仕守著，就是要看清楚。"],["H","{名}，{你}評評理！"]],
      g:{H:"一甩就上岸啦！",L:"綁牢了。"},m:{H:"……繩結，是要看一下。",L:"……甩得準。"}}]};
const EP1_TAG={R:["首俥","車殺","雙車錯"],N:["首傌","馬殺","臥槽馬","掛角馬"],C:["首炮","炮殺","重炮","悶宮"],P:["首兵","兵卒"],K:["首帥"],A:["首仕"],B:["首相"]};
const EP1_FB={K:["以少勝多"],A:["安靜一手"],B:["安靜一手"]};
const EP1_KILL={R:["車殺","雙車錯"],N:["馬殺","臥槽馬","掛角馬","馬後炮"],C:["炮殺","重炮","悶宮","馬後炮"],P:["小兵擒王"],K:[],A:[],B:[]};
/* 這一朝現在能吵的那一組（兩位都不是玩家）；k＝第幾組 */
function ep1Talk(here){const me=epMe(),L=EP1_TALK[here]||[];for(let k=0;k<L.length;k++){const T=L[k];if(EP_K[T.a]!==me&&EP_K[T.b]!==me)return{k,T}}return null}
/* 替角色 c 挑一題：c 的本命子當主力、對手 o 的本命子在主變裡不動（最好不在盤上）；ex＝不能用的題 */
function ep1Score(P,p,q,T,band,seed){const C=window.XQCore,s=P.side,mv=epMoves(P);if(!mv.length)return null;const up=x=>s==="r"?x:x.toLowerCase(),b=C.parseFen(P.fen);
  if(mv.includes(q))return null;const hasQ=b.some(x=>x===up(q)),by=mv.filter(x=>x===p).length,tp=T[P.id]||[],d=+P.d||3;
  const tag=tp.some(t=>(EP1_TAG[p]||[]).includes(t)),fb=tp.some(t=>(EP1_FB[p]||[]).includes(t)),kill=(EP1_KILL[p]||[]).includes(P.kill);
  if(!by&&!fb&&!kill)return null;const mid=(band[0]+Math.min(band[1],band[0]+4))/2;
  return(tag?5:0)+(mv[0]===p?3:0)+1.5*Math.min(by,3)+(mv[mv.length-1]===p?2:0)+(kill?2:0)+(fb&&!by?1.5:0)-(hasQ?1.5:0)-(P.n>3?1.5:0)-(P.t==="古譜校錯"?3:0)-(s==="b"?.5:0)-.6*Math.abs(d-mid)+cjRand(seed+P.id)()*.6}
async function ep1Pick(here,T0){const{pool,T}=await shipMorePool(),S=epSt(),used=new Set();for(const e in S.a)for(const c in(S.a[e].L||{}))used.add(S.a[e].L[c]);
  const band=diffOf().band,a=EP_K[T0.a],b=EP_K[T0.b],out={};
  for(const[c,o]of[[a,b],[b,a]]){const p=EP_PC[c],q=EP_PC[o];let best=null,bs=-1e9;
    for(const P of pool){if(used.has(P.id)||!(P.n>=1&&P.n<=4))continue;const sc=ep1Score(P,p,q,T,band,cjAid()+"|ep1|"+here+"|"+c);if(sc!=null&&sc>bs){bs=sc;best=P}}
    if(!best)return null;out[c]=best.id;used.add(best.id)}
  return out}
function ep1Due(S,here){if(!EP1_ON&&!EP_DEV)return false;if(S.a[here]||!ep1Talk(here))return false;const me=epMe(),now=Date.now(),at=S.at[here]||now;
  const long=here!==CHAR_ERA[me]&&now-at>=3*864e5,lose=(S.lose[here]|0)>=2;return long||lose}
function ep1Show(v,where,here){const S=epSt(),X=ep1Talk(here);if(!X)return false;const T=X.T,a=EP_K[T.a],b=EP_K[T.b];
  S.a[here]={k:X.k,c:[a,b],at:Date.now()};epCount(S);epSave(S);
  epBubble(v,where,[a,b],"⚡ 石桌邊吵起來了",T.l[0][1],()=>ep1Sheet(here));return true}
async function ep1Sheet(here){epCss();const S=epSt(),R=S.a[here];if(!R)return;const T=(EP1_TALK[here]||[])[R.k];if(!T)return;const a=EP_K[T.a],b=EP_K[T.b];
  sheet("⚡ 石桌邊吵起來了",bx=>{const paint=async()=>{const R2=epSt().a[here];
    if(R2.done){bx.innerHTML=epTalk(T.l)+`<div class="ep-card">這場爭執已經用一盤棋說完了：${esc(epNk(R2.pick))}的${EP_PCN[EP_PC[R2.pick]]}贏了。</div>`;return}
    if(R2.pick){bx.innerHTML=epTalk(T.l)+epSay(R2.pick,"那就用一盤棋說話！")+`<div class="ep-card">♟ ${esc(epNk(R2.pick))}的<b>${EP_PCN[EP_PC[R2.pick]]}</b>當主力，解開這一題就算贏。<br><span class="muted" style="font-size:13px">解不開、中途離開都不要緊，不扣任何東西。</span></div><div class="ep-row"><button class="btn" id="ep1Go">♟ 開始解題</button></div>`;
      bx.querySelector("#ep1Go").onclick=()=>{vibrate(8);closeSheet();setTimeout(()=>{location.hash="#/canju/e/1/"+here},240)};return}
    bx.innerHTML=epTalk(T.l)+`<p class="muted" style="margin:8px 0 0;font-size:13.5px">站哪一邊，就用那顆子解一題殘局給對方看。</p><div class="ep-row"><button class="btn" data-ep1="${a}">站${esc(epNk(a))}這邊（${EP_PCN[EP_PC[a]]}）</button><button class="btn" data-ep1="${b}">站${esc(epNk(b))}這邊（${EP_PCN[EP_PC[b]]}）</button></div><button class="btn ghost" id="ep1No" style="width:100%;margin-top:8px">兩邊都有道理，先不管</button>`;
    bx.querySelector("#ep1No").onclick=()=>{vibrate(5);closeSheet()};
    bx.querySelectorAll("[data-ep1]").forEach(y=>y.onclick=async()=>{vibrate(8);const c=y.dataset.ep1;y.disabled=true;y.textContent="說書人在擺棋…";
      let L=epSt().a[here].L;if(!L){try{L=await ep1Pick(here,T)}catch(e){L=null}}
      if(!L){toast("殘譜裡暫時找不到合適的題，下次再吵吧");closeSheet();return}
      const S3=epSt();S3.a[here].L=L;S3.a[here].pick=c;epSave(S3);try{saveNow(true)}catch(e){}paint()})};paint()})}
function ep1XM(here){const S=epSt(),R=S.a[here],T=R&&(EP1_TALK[here]||[])[R.k];if(!R||!R.pick||!R.L||!T)return{err:"這場爭執已經過去了。",back:()=>"#/adventure"};
  const c=R.pick,o=R.c.find(x=>x!==c),id=R.L[c];
  return{id,rk:"cjRunEp",back:()=>"#/adventure",top:"⚡ 石桌起爭執",icon:"⚡",noXP:true,ans:"看答案這一題就不算數（也沒有修為），確定？",
    head:P=>`<b>⚡ ${esc(shipShort(here))}・${esc(epNk(R.c[0]))}和${esc(epNk(R.c[1]))}吵起來了</b>・${esc(epNk(c))}的${EP_PCN[EP_PC[c]]}當主力・${cjLv(P.d)}　<span class="muted">${cjSrc(P)}</span><div class="shp-psay">${esc(epNk(o))}：「${esc(epTx("我倒要看看，"+EP_PCN[EP_PC[c]]+"能怎麼贏。",o))}」</div>`,
    wrong:(u,step)=>step===0?epNk(o)+"："+epTx("看吧，沒那麼好走吧？",o):"",
    mark:()=>{const S2=epSt(),R2=S2.a[here];const first=!R2.done;if(first){R2.done=Date.now();epSave(S2);addXP(EP_XP[1],"插曲","ep1:"+here)}return{first}},
    done:(x,ans)=>{if(ans||!x)return`<p class="muted">看了答案，這場爭執先不算數；不看答案解開才算。</p>`;epCss();return epSay(c,T.g[Object.keys(EP_K).find(k=>EP_K[k]===c)])+epSay(o,T.m[Object.keys(EP_K).find(k=>EP_K[k]===o)])+(x.first?`<p>✨ 修為 +${EP_XP[1]}</p>`:"")},
    next:()=>"#/adventure",nextL:()=>"⛵ 回星槎"}}

/* ---------- 2 驛站漏字信 ---------- */
/* t＝信文，[[字]]＝被雨水泡糊的字；q＝每一格的棋理提示（照出現順序）；x＝字卡裡的干擾字；to＝寄給誰（null＝寄給玩家這一位旅人）；r＝要讀過哪一章；by＝補完以後說話的人；src＝史實依據（送史學顧問） */
const EP2_MAIL=[
  {id:"yan",era:"nanbei",to:"x_spiritgirl",r:"nanbei",from:"燕子的娘",title:"娘的信",
    intro:"燕子收在油布包裡的那封信。星槎漏了雨，油布包沒蓋嚴，墨暈開了好幾個字。",
    t:"燕子，娘已到[[江]]南，[[平]]安。等戰事[[平]]息，娘就[[回]]茶棚找妳。好好吃飯，夜裡莫忘添衣。",
    q:["說書人在艙門口念過：「相未渡＿，＿已渡心。」","俥從一邊橫著走到另一邊，棋譜上記作「俥二＿五」。","炮從邊上橫移到中路，叫「炮二＿五」，就是當頭炮。","兵卒過了河能往前、能往旁邊，就是不能往＿退。"],
    x:["河","進","退"],by:"x_spiritgirl",end:"字都回來了。……娘的「衣」字，還是拖得長長的。",endMe:"字都回來了。最後那個「衣」字，還是拖得長長的。",src:"信文照《雲河七星》第六章原文，不涉史實。"},
  {id:"cen",era:"tang",to:null,r:"",from:"唐朝後來的抄書人",title:"抄來的怪談",
    intro:"信箱裡夾著一張泛黃的紙，是唐朝後來的人抄給下棋的朋友的。紙角泡過水，有三個字糊掉了。裡頭說的象戲是一種古象戲，規則跟今天的象棋不一樣。",
    t:"客中無事，抄一段怪談給下棋的朋友：寶應年間，岑順寄住陝州的山宅，夜裡夢見兩軍交戰，聽見軍中傳令：「天馬[[斜]]飛度三止，上將[[橫]]行擊四方，輜車[[直]]入無迴翔，六甲次第不乖行。」後來家人在宅下掘地，掘出一座古墓，墓裡擺著一局古象戲。這是牛僧孺《玄怪錄》裡的故事。下棋的時候，不妨想想：馬怎麼飛，車怎麼入。",
    q:["傌走日字，不是直走，是＿著跳過去。","帥在九宮裡，一次走一格，可以直走，也可以＿走。","俥前面沒有東西擋著，就能一路＿走到底。"],
    x:["退","平","田"],by:"x_shi",byAlt:"x_shuai",end:"……車直入，不回頭。我記住這句。",endAlt:"原來唐朝就有人把棋寫進故事裡。這張紙，我想留著。",
    src:"史學顧問 11/8 核過：〈岑順〉見《太平廣記》卷三六九，出牛僧孺《玄怪錄》（宋代改稱《幽怪錄》）；年份不寫「元年」，改「寶應年間」；四句用「擊」「迴」；墓中是一種古象戲（規則跟今天的象棋不同）；寄信人寫「唐朝後來的抄書人」（唐站設在天寶年間，寶應較晚）。"},
  {id:"hua",era:"song",to:"x_martialgirl",r:"song",from:"花兒的爺爺",title:"爺爺的信",
    intro:"一封寄給花兒的信，字歪歪扭扭，是臨安煙火鋪的夥計替爺爺寫的。半路遇上了雨。",
    t:"花兒：爺爺耳朵不靈，叫夥計替我寫。燈罩的紙樣，你們幾個畫的，爺爺都掛起來了。那張煙火圖，畫著棋盤和楚[[河]]，中間一個「[[炮]]」字；那不是棋譜，可妳要記得：炮要有個[[架]]子才打得響，人也一樣，身邊有人，才走得穩。好好跟著同伴，走完了再回來。門邊的燈，爺爺每晚都點著。",
    q:["棋盤中間那條界，叫楚＿漢界。","中間要隔一顆子才能吃子的，是哪一顆？","炮要吃子，中間隔著的那一顆，叫炮＿。"],
    x:["車","馬","帥"],by:"x_martialgirl",end:"爺爺叫夥計寫信，一定唸了好幾遍才放心……謝謝{你}幫我把字補回來。",endMe:"爺爺叫夥計寫信，一定唸了好幾遍才放心。",src:"信文照《雲河七星》第十章（爺爺左耳聽不清、罩燈紙樣、煙火圖畫棋盤河界和「炮」字、「不能當棋譜」、門邊留燈），不涉史實。"},
  {id:"mei",era:"yuan",to:"x_miaogirl",r:"yuan",from:"小梅的阿娘",title:"阿娘的信",
    intro:"一封寄給小梅的信，從集寧路的驛站捎來，請驛裡的人代筆。路上遇到一場雨。",
    t:"梅子：帽頂的紅珠子，阿娘又替妳縫緊了一回。聽說那半塊布，妳給了溪兒；兩半合起來是個「[[卒]]」字，阿娘不怪妳。卒子過了[[河]]，能往前、能往旁邊，就是不回頭；可妳記著，累了就回驛站來。老駱說，祖姓是[[步]]也好，姓駱也好，妳都是他的梅子。驛裡的[[馬]]，都還認得妳。",
    q:["黑方的兵，棋子上寫的是哪一個字？","兵卒要過了＿，才能橫著走。","兵卒一次只能走一＿。","走日字的那顆子，黑方的棋子上寫作「＿」。"],
    x:["象","車","兵"],by:"x_miaogirl",end:"嘿嘿，阿娘又縫了一回珠子……{名}，謝謝{你}。",endMe:"阿娘又縫了一回珠子。",src:"信文照《雲河七星》第十一章（帽頂紅琉璃珠、兩半塊布拼成「卒」字祈福小旗、祖姓步、小梅把布給溪兒、老駱叫她梅子），不涉史實。"},
  {id:"shu",era:"ming",to:"x_shuai",r:"ming",from:"休寧的書生",title:"書生的信",
    intro:"一封寄給方庭的信，夾著一頁從書上抄下來的棋局。信紙受了潮，書頁上還有幾個蟲蛀的小洞。",
    t:"小郎君台鑒：家母喪事已畢，謹此致謝。那日小郎君說，書請懂的人估價，急用的錢另外寫清楚，不必拿一盤棋作賭；晚生回去，想了許多夜。先父留下的《適情雅趣》，晚生每日拿出來攤開晾著，可惜書頁被蟲蛀了幾處。那一局出[[帥]]助攻，晚生照著擺了又擺：帥不出九[[宮]]，只讓開一路，[[俥]]就有了去處。棋盤暫存府上，來日必當贖回。",
    q:["紅方的主將，棋子上寫的是哪一個字？","帥和仕，只能在九＿裡走。","直走、橫走都能一路走到底的紅子，是哪一顆？"],
    x:["炮","河","相"],by:"x_shuai",byAlt:"x_shi",end:"書還在，就好。……勞{你}替他補這幾個字。",endAlt:"……書生的字，寫得端正。",
    src:"史學顧問 11/8 核過：《適情雅趣》明隆慶四年（1570）刊，徐芝輯、陳學禮校；萬曆十年（1582）休寧書生有這部刻本合理。情節照《雲河七星》第十二章。"}];
const ep2Mail=id=>EP2_MAIL.find(x=>x.id===id)||null;
const ep2Blanks=M=>(M.t.match(/\[\[(.+?)\]\]/g)||[]).map(x=>x.slice(2,-2));
function ep2Ready(M){try{if(!shipDocked().includes(M.era))return false}catch(e){return false}return!M.r||epRead(M.r)}
/* 信箱打開時：已經在等著的那封，或擲 20% 收到一封（先挑這一站的） */
function ep2Arrive(k,force){const S=epSt();if(S.mp&&ep2Mail(S.mp)&&!(S.m[S.mp]||{}).done)return S.mp;if(!force&&(!EP2_ON||!epOk()||!epRoom(S)||Math.random()>=EP_P[2]))return null;
  const L=EP2_MAIL.filter(M=>!(S.m[M.id]||{}).done&&(force||ep2Ready(M)));if(!L.length)return null;const M=L.find(x=>x.era===k)||epOne(L);
  S.mp=M.id;S.m[M.id]=S.m[M.id]||{at:Date.now(),f:[]};if(!force)epCount(S);epSave(S);return M.id}
function ep2Rows(){const S=epSt(),o=[];if(S.mp&&ep2Mail(S.mp)&&!(S.m[S.mp]||{}).done)o.push([S.mp,0]);for(const M of EP2_MAIL)if((S.m[M.id]||{}).done)o.push([M.id,1]);return o}
function ep2Inject(){const b=document.querySelector("#sheet .sh-b");if(!b)return;const R=ep2Rows();if(!R.length)return;
  const box=document.createElement("div");box.className="items";box.style.cssText="padding:0;margin-bottom:10px";
  box.innerHTML=R.map(([id,dn])=>{const M=ep2Mail(id);return`<button class="item" data-ep2="${id}"><span class="lb" style="font-size:22px">${dn?"📜":"💧"}</span><span class="tx"><b>${dn?esc(M.title)+"（重圓）":"一封被雨水浸壞的信 🆕"}</b><span>${dn?"寄自"+esc(eraLabel(M.era))+"・"+esc(M.from):"字糊掉了幾個，補得回來嗎？"}</span></span><span class="muted">›</span></button>`}).join("");
  b.prepend(box);b.querySelectorAll(":scope > p.muted").forEach(x=>{if(/^還沒有/.test(x.textContent.trim()))x.remove()});   /* 信箱有漏字信時，拿掉 07m 的「還沒有寄自這一朝的信……」那行 */
  box.querySelectorAll("[data-ep2]").forEach(y=>y.onclick=()=>{vibrate(5);closeSheet();setTimeout(()=>ep2Sheet(y.dataset.ep2),260)})}
function ep2Sheet(id){const M=ep2Mail(id);if(!M)return;epCss();const me=epMe(),A=ep2Blanks(M);
  const to=M.to?(M.to===me?"寄給{你}的信":"寄給"+epNk(M.to)+"的信"):"寄給往來旅人的信",byC=M.by===me&&M.byAlt?M.byAlt:M.by,endL=M.by===me?(M.byAlt?M.endAlt:M.endMe):M.end;
  sheet("💧 "+M.title,bx=>{let sel=-1;const paint=()=>{const S=epSt(),R=S.m[id]||(S.m[id]={at:Date.now(),f:[]}),F=R.f||[],done=!!R.done;let i=-1;
      const txt=esc(M.t).replace(/\[\[(.+?)\]\]/g,()=>{i++;return F[i]?`<span class="bl ok">${esc(A[i])}</span>`:`<span class="bl${i===sel?" sel":""}" data-bl="${i}">${i===sel?"？":"　"}</span>`});
      const cards=[...new Set(A.concat(M.x))].sort((p,q)=>(p+id).charCodeAt(0)%7-(q+id).charCodeAt(0)%7);
      bx.innerHTML=`<p class="muted" style="margin:0 0 6px;font-size:13.5px">${esc(epTx(M.intro,byC))}（${esc(epTx(to,byC))}，寄自${esc(eraLabel(M.era))}）</p><div class="ep-letter">${txt}<div style="text-align:right;margin-top:4px">—— ${esc(M.from)}</div>${done?'<div class="ep-seal">重<br>圓</div>':""}</div>`
        +(done?epSay(byC,endL)+`<p class="muted" style="font-size:13px;margin:6px 0 0">這封信會留在驛站信箱裡，隨時可以再讀。</p>`
        :`<div class="ep-clue">${sel>=0?"💡 "+esc(M.q[sel]||""):"點信上糊掉的格子，看那個字的提示；再從下面的字卡挑一張填進去。"}</div><div class="ep-cards">${cards.map(c=>`<button data-cd="${esc(c)}">${esc(c)}</button>`).join("")}</div>
        <div class="ep-row"><button class="btn ghost" id="ep2H"${sel<0?" disabled":""}>💡 用一顆提示棋亮出正解</button></div>`);
      bx.querySelectorAll("[data-bl]").forEach(y=>y.onclick=()=>{vibrate(5);sel=+y.dataset.bl;paint()});
      bx.querySelectorAll("[data-cd]").forEach(y=>y.onclick=()=>{if(sel<0){toast("先點信上糊掉的那一格");return}const c=y.dataset.cd;
        if(c!==A[sel]){vibrate([20,40,20]);y.classList.remove("no");void y.offsetWidth;y.classList.add("no");toast("這個字放不進去，再想想提示");return}
        vibrate(12);const S2=epSt(),R2=S2.m[id];R2.f=R2.f||[];R2.f[sel]=1;const all=A.every((_,j)=>R2.f[j]);if(all&&!R2.done){R2.done=Date.now();if(S2.mp===id)S2.mp=null}epSave(S2);
        if(all){addXP(EP_XP[2],"插曲","ep2:"+id);try{saveNow(true)}catch(e){}vibrate([15,30,15,30,40])}
        sel=A.findIndex((_,j)=>!R2.f[j]);paint()});
      const h=bx.querySelector("#ep2H");if(h)h.onclick=()=>{if(sel<0)return;const H=useHint();if(!H)return;const c=A[sel];bx.querySelectorAll("[data-cd]").forEach(y=>y.classList.toggle("hl",y.dataset.cd===c));toast("💡 金框那張字卡就是")}};
    const F0=(epSt().m[id]||{}).f||[];sel=A.findIndex((_,j)=>!F0[j]);paint()})}

/* ---------- 3 不速之客 ---------- */
const EP3_SAY={classic:["客官，這局面我看出一手狠的，{你}接得住嗎？","接住了。好棋。","這一手借{你}看看，回原局吧。"],
  qin:["直道上沒有回頭路。我這一步走下去，{你}守得住嗎？","守住了。路還通著。","路被我堵上了。不要緊，回原局再走。"],
  han:["大漠起風了。我這一手像沙暴，{你}擋擋看。","沙停了，{你}還站著。","這陣風颳過去了。回原局吧。"],
  sanguo:["江上起了東風。借這陣風，我走一步狠的。","風向轉了，好守法。","東風借到了。回原局再說。"],
  weijin:["溪水看著平，底下有暗流。我這一步，{你}看出來了嗎？","暗流也被{你}看穿了。","水底下的東西，下回再看。回原局吧。"],
  nanbei:["隔江插旗，等的就是這一步。","旗沒插上，{你}守住了渡口。","旗插上了。回原局，還有得下。"],
  sui:["河渠一開，水就衝下來了。這一步，{你}堵得住嗎？","堵住了，水沒漫上岸。","水漫上來了。回原局，慢慢收拾。"],
  tang:["西市的刀快，我這一步也快。","刀快，{你}的手更穩。","這一刀借{你}看看。回原局吧。"],
  wudai:["亂世裡，一步慢了就沒了退路。{你}看好了。","退路還在，{你}守住了。","這一步慢了。不要緊，回原局。"],
  song:["上元的煙火，最響的在後頭。這一步，{你}接著。","煙火放完了，{你}還好好的。","這一響太大了。回原局吧。"],
  yuan:["草原上的馬，說到就到。我這一跳，{你}擋不擋得住？","馬被{你}攔下了。","馬跑過去了。回原局再追。"],
  ming:["當鋪裡講究看貨。我這一步，{你}估估看值多少。","估得準，守得住。","這一步估低了。回原局吧。"],
  qing:["碼頭風大，船繩一鬆就漂走。這一步，{你}綁得住嗎？","綁牢了，船沒漂走。","繩鬆了。回原局，重新綁。"]};
const EP3_WATCH={x_swordboy:["我來看看。……這一步衝著{你}來的，看清楚再走。","守住了。路還在。","沒關係。這是借來的局面。"],
  x_spiritgirl:["別慌，先看看他想打哪裡。守住了，再說。","守住了。喝口茶，接著下。","不要緊，回去接著下原來那盤。"],
  x_martialgirl:["哇，這步好狠！{名}，頂住！","頂住啦！好！","哎呀……沒事沒事，那盤還在！"],
  x_miaogirl:["嘿，他要繞過來了！{你}看馬腳那裡！","嘿嘿，擋住啦！","繞過來了呀……下回我幫{你}看。"],
  x_shuai:["{名}，先別急著還手。看看哪一路最危險。","原來是這樣守。我記下了。","我也沒看出來。回去慢慢想。"],
  x_shi:["……守。","嗯。守得好。","……下回，先守宮門。"],
  x_bing:["一步一步來，三步就夠啦！","三步就守住啦！","沒守住也不要緊，原來那盤還等著{你}！"]};
let EP3_CUR=null;
function ep3Watchers(here){const me=epMe(),L=Object.keys(WX_CHARS).filter(c=>EP_PC[c]&&c!==me),hm=L.filter(c=>CHAR_ERA[c]===here||((SHIP_STOP[here]||{}).who||[]).includes(c));
  const a=hm.length?epOne(hm):epOne(L),rest=L.filter(c=>c!==a);return Math.random()<.5?[a,epOne(rest)]:[a]}
/* 對手多走一步：Pikafish 挑一步「真的有威脅、而且守得住」的著法 */
async function ep3Threat(board,human){const C=window.XQCore,bot=C.opp(human),fs=(b,s)=>({fen:C.fen(b,s)});
  const r1=await XQEngine.search(fs(board,bot),{movetime:900},3);
  for(const l of r1.lines||[]){const u=l.mv;if(!u)continue;const f=C.parseSq(u.slice(0,2)),t=C.parseSq(u.slice(2,4));if(!C.legal(board,bot).some(([x,y])=>x===f&&y===t))continue;
    const Q=C.make(board,f,t);if(!C.legal(Q,human).length)continue;
    const r2=await XQEngine.search(fs(Q,human),{movetime:900},1),d=(r2.lines||[])[0];if(!d)continue;if(d.mate!=null&&d.mate<=0)continue;if(d.v<-250)continue;
    let threat=C.inCheck(Q,human);if(!threat){const r3=await XQEngine.search(fs(Q,bot),{movetime:700},1),z=(r3.lines||[])[0];threat=!!z&&(z.mate!=null&&z.mate>0||z.v>=-d.v+200)}
    if(threat)return{u,f,t,Q,vb:d.v,def:d.mv}}
  return null}
async function ep3Check(){if(EP3_CUR||(!EP3_ON&&!EP3_FORCE)||!epOk()||epNet())return;if(!window.XQEngine||typeof OFF==="undefined"||!OFF)return;
  if(typeof PARK_J==="undefined"||PARK_J!=="park"||navKey(location.hash)!=="/journey/play")return;if(document.querySelector("#sheet,.modal,.ep-ov,.travel"))return;
  let s=null;try{s=await api("/play/state")}catch(e){return}if(!s||s.journey!=="park"||s.arena||s.result||s.practice||s.turn!==s.human||s.thinking||s.check>=0)return;
  const n=s.moves.length,S=epSt();
  if(!EP3_FORCE){if(n<28||n>40||S.g[s.id])return;if(s.eval&&Math.abs(s.eval.v)>150)return;if(!epRoom(S))return;S.g[s.id]=1;const ks=Object.keys(S.g);if(ks.length>60)for(const k of ks.slice(0,20))delete S.g[k];epSave(S);if(Math.random()>=EP_P[3])return}
  const forced=EP3_FORCE;EP3_CUR={id:s.id};let T=null;try{T=await ep3Threat(s.board,s.human)}catch(e){T=null}
  if(!T||navKey(location.hash)!=="/journey/play"||document.querySelector("#sheet,.modal")){EP3_CUR=null;return}
  let s2=null;try{s2=await api("/play/state")}catch(e){}if(!s2||s2.id!==s.id||s2.moves.length!==n){EP3_CUR=null;return}
  EP3_FORCE=false;if(!forced){const S2=epSt();epCount(S2);epSave(S2)}ep3Run(s,T)}
function ep3Run(s,T){epCss();const C=window.XQCore,here=epHere(),human=s.human,bot=C.opp(human),W=ep3Watchers(here),SY=EP3_SAY[here]||EP3_SAY.classic,n0=s.moves.length,h0=location.hash;
  let opp="對手";try{const N=parkNpcOf(s);if(N&&N.name)opp=N.name}catch(e){}
  const ov=document.createElement("div");ov.className="ep-ov";ov.setAttribute("role","dialog");ov.setAttribute("aria-label","不速之客");
  ov.innerHTML=`<h3>🌀 不速之客</h3><div id="ep3T"></div><div class="boardbox" id="ep3B"></div><div class="ep-st" id="ep3S"></div><div id="ep3A"></div>`;document.body.append(ov);
  const $=q=>ov.querySelector(q),bd=Board(i=>tap(i));$("#ep3B").append(bd.svg);
  let b=T.Q,sel=-1,last={f:T.f,t:T.t},left=3,busy=false,over=false;const flip=human==="b";
  const draw=()=>bd.draw(b,{flip,sel,last,check:C.inCheck(b,human)?C.kingSq(b,human):C.inCheck(b,bot)?C.kingSq(b,bot):-1,targets:sel>=0?C.legal(b,human).filter(([f])=>f===sel).map(x=>x[1]):[]});
  const st=t=>{$("#ep3S").textContent=t};
  const close=(why)=>{if(over&&why!=="done")return;over=true;removeEventListener("hashchange",onHash);ov.remove();EP3_CUR=null;
    api("/play/state").then(x=>{if(x&&x.id===s.id&&x.moves.length!==n0)console.warn("ep3：原局步數變了",n0,x.moves.length)}).catch(()=>{});try{window.dispatchEvent(new Event("xq-play"))}catch(e){}};
  const onHash=()=>{if(location.hash!==h0)close("done")};addEventListener("hashchange",onHash);
  const tn=C.notate(s.board,T.f,T.t);
  $("#ep3T").innerHTML=W.map(c=>epSay(c,EP3_WATCH[c][0])).join("")+`<div class="ep-say"><div style="width:42px;flex:none;font-size:30px;text-align:center">♟</div><div><b>${esc(opp)}</b>「${esc(epTx(SY[0]))}」<br><span class="muted" style="font-size:13.5px">借現在的局面，${esc(opp)}多走一步：<strong style="color:var(--accent)">${esc(tn)}</strong>。你有 3 步化解，原來那盤不會動。</span></div></div>`;
  st(`輪到你守・還有 ${left} 步`);draw();
  const acts=()=>{$("#ep3A").innerHTML=`<div class="ep-row"><button class="btn ghost" id="ep3Q">↩ 不接了，回原局</button></div>`;$("#ep3Q").onclick=()=>{vibrate(5);close("done")}};acts();
  async function tap(i){if(busy||over)return;const L=C.legal(b,human);if(sel>=0&&L.some(([f,t])=>f===sel&&t===i)){const f=sel;sel=-1;vibrate(12);b=C.make(b,f,i);last={f,t:i};left--;draw();await after();return}sel=L.some(([f])=>f===i)?i:-1;if(sel>=0)vibrate(5);draw()}
  async function after(){busy=true;if(!C.legal(b,bot).length){return finish(true,"對手動彈不得了！")}
    if(left<=0){st("Pikafish 在看守住了沒有…");let h=null;try{const r=await XQEngine.search({fen:C.fen(b,bot)},{movetime:1100},1),z=(r.lines||[])[0];h=z?-z.v:null;if(z&&z.mate!=null&&z.mate>0)h=-30000}catch(e){}
      if(over)return;return finish(h!=null&&h>=T.vb-180&&h>-350)}
    st("對手在想…");let mv=null;try{const r=await XQEngine.search({fen:C.fen(b,bot)},{movetime:700},1);mv=r.best}catch(e){}if(over)return;
    const Lb=C.legal(b,bot);let f,t;if(mv){f=C.parseSq(mv.slice(0,2));t=C.parseSq(mv.slice(2,4))}if(!mv||!Lb.some(([x,y])=>x===f&&y===t))[f,t]=Lb[0];
    b=C.make(b,f,t);last={f,t};draw();if(!C.legal(b,human).length)return finish(false);busy=false;st(`輪到你守・還有 ${left} 步`)}
  function finish(ok,why){busy=true;over=true;vibrate(ok?[15,30,15,30,40]:[20,40,20]);const dn=T.def?(()=>{try{return C.notate(T.Q,C.parseSq(T.def.slice(0,2)),C.parseSq(T.def.slice(2,4)))}catch(e){return""}})():"";
    if(ok)addXP(EP_XP[3],"插曲","ep3:"+s.id);
    st(ok?"✔ 化解了！":"✘ 沒守住");
    $("#ep3T").innerHTML=(why?`<p style="margin:0 0 6px"><b>${esc(why)}</b></p>`:"")+`<div class="ep-say"><div style="width:42px;flex:none;font-size:30px;text-align:center">♟</div><div><b>${esc(opp)}</b>「${esc(epTx(ok?SY[1]:SY[2]))}」</div></div>`+W.map(c=>epSay(c,EP3_WATCH[c][ok?1:2])).join("")
      +(ok?`<p>✨ 修為 +${EP_XP[3]}</p>`:`<p class="muted" style="font-size:13.5px">${dn?`Pikafish 的守法是 <b>${esc(dn)}</b>。`:""}不扣任何東西，原來那盤也沒動。</p>`);
    $("#ep3A").innerHTML=`<div class="ep-row"><button class="btn" id="ep3Back">♟ 回原局</button></div>`;
    $("#ep3Back").onclick=()=>{vibrate(5);over=false;close("done");if(ok&&typeof relicDrop==="function")setTimeout(()=>{relicDrop(here,.7).catch(()=>{})},400)}}}
window.addEventListener("xq-play",()=>{setTimeout(()=>{ep3Check().catch(()=>{EP3_CUR=null})},900)});

/* ---------- 4 星夜茶話會 ---------- */
const EP4_OPEN={x_swordboy:["……睡不著，就看一會兒棋。一會兒就好。","這一站走了好幾天了。先放下那題，看點別的。"],
  x_spiritgirl:["這麼晚還醒著？我沏了一壺淡茶，不濃，喝了好睡。","這一站卡了好幾天了吧？先別想那題，喝口茶，玩點別的。"],
  x_martialgirl:["{名}也睡不著？那我們小聲玩一局，就一局！","那題好難對不對？我也解不出來！先玩點別的嘛！"],
  x_miaogirl:["嘿嘿，我也還醒著！星星好亮，來玩個小的嘛。","前面堵住了？那就先拐個彎，玩點別的呀！"],
  x_shuai:["{名}也還沒睡？城子說夜裡不該熬著……那，只玩一會兒。","我想了幾天也沒想通。不如先換個題目，讓眼睛歇一歇。"],
  x_shi:["……一會兒。然後去睡。","……卡住了。先歇。"],
  x_bing:["睡不著喔？我數星星，{你}數棋子，誰先數完誰先睡！","那題先放著，又不會跑掉啦！我們玩個快的！"]};
const EP4_END={x_swordboy:["睡飽了，路才走得直。去睡吧。","歇夠了，再回去看那題，路就看得清。"],
  x_spiritgirl:["好了，茶也喝完了。去睡吧，明天的棋，明天再下。","歇一歇再看，那題就沒那麼難了。"],
  x_martialgirl:["呵——我都打呵欠了。{名}快去睡！","好啦，玩夠了！那題明天一定解得開！"],
  x_miaogirl:["星星也要睡覺啦，{名}也去睡嘛。","繞一圈回來，說不定就看見路了呀。"],
  x_shuai:["城子說得對，夜深了。明日再見。","換個時候再看，也許就懂了。不必急。"],
  x_shi:["去睡。","……先歇。明天再看。"],
  x_bing:["睡吧睡吧，明天我跑腿叫{你}起床！","歇夠了再一步一步來，不急不急！"]};
const EP4_GAME={ck:["一步將軍","點出走一步就能將軍的紅子（有好幾顆就點其中一顆）。"],nk:["傌的將軍點","點出所有「紅傌站上去就將軍」的格子（臥槽、掛角都算；被擋住馬腳的不算）。"]};
const ep4Night=()=>{const h=new Date().getHours();return h>=23||h<4};
const ep4Key=()=>{const d=new Date(Date.now()-5*36e5);return d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate()};
function ep4Due(S,here){if(!EP4_ON&&!EP_DEV)return null;const k=ep4Key();if(S.nt===k||S.ntr[k])return null;if(ep4Night())return"night";
  let lr=false;try{lr=shipLearned(here)}catch(e){}const at=S.at[here];if(!lr&&at&&Date.now()-at>=48*36e5)return"stuck";return null}
function ep4Show(v,where,why,force){const S=epSt(),k=ep4Key();if(!force){S.ntr[k]=1;const ks=Object.keys(S.ntr);if(ks.length>14)delete S.ntr[ks[0]];if(Math.random()>=EP_P[4]){epSave(S);return false}}
  S.nt=k;epCount(S);epSave(S);const me=epMe(),L=Object.keys(EP4_OPEN).filter(c=>c!==me),a=epOne(L),b=epOne(L.filter(c=>c!==a));
  epBubble(v,where,[a,b],why==="night"?"🌙 星夜茶話會":"🍵 石桌邊歇一歇",EP4_OPEN[a][why==="night"?0:1],()=>ep4Sheet([a,b],why));return true}
function ep4Sheet(cs,why){epCss();const w=why==="night"?0:1;
  sheet(why==="night"?"🌙 星夜茶話會":"🍵 石桌邊歇一歇",bx=>{bx.innerHTML=epSay(cs[0],EP4_OPEN[cs[0]][w])+epSay(cs[1],EP4_OPEN[cs[1]][w])+epSay("teller",why==="night"?"客官，夜深了。老朽點一盞燈，陪你們看一分鐘的棋，看完就去歇著。":"客官，同一題盯久了，眼睛會累。換一分鐘的小題，鬆鬆眼。")
    +`<div class="ep-card">⏱ 1 分鐘眼力題，二選一：</div><div class="ep-row"><button class="btn" data-g4="ck">♟ ${EP4_GAME.ck[0]}</button><button class="btn" data-g4="nk">🐎 ${EP4_GAME.nk[0]}</button></div><button class="btn ghost" id="ep4No" style="width:100%;margin-top:8px">${why==="night"?"今天先不玩，直接去睡":"先不玩"}</button>`;
    bx.querySelector("#ep4No").onclick=()=>{vibrate(5);closeSheet();if(why==="night")toast(epTx(EP4_END[cs[0]][0],cs[0]))};
    bx.querySelectorAll("[data-g4]").forEach(y=>y.onclick=()=>{vibrate(8);closeSheet();setTimeout(()=>ep4Game(y.dataset.g4,cs,why),260)})})}
/* 題目局面：一盞茶題庫的紅方先走題（沒被將軍）；ck＝有子能一步將軍，nk＝紅傌站上去能將軍的空格 2～8 格 */
function ep4Pos(D,kind){const C=window.XQCore;for(let tries=0;tries<80;tries++){const P=D.items[Math.floor(Math.random()*D.items.length)];if(!P||P.side!=="r")continue;let b;try{b=C.parseFen(P.fen)}catch(e){continue}
    if(C.inCheck(b,"b")||C.inCheck(b,"r"))continue;
    if(kind==="ck"){const A=new Set();for(const[f,t]of C.legal(b,"r"))if(C.inCheck(C.make(b,f,t),"b"))A.add(f);if(A.size&&A.size<=4)return{b,A}}
    else{const A=new Set();for(let i=0;i<90;i++){if(b[i])continue;const b2=b.slice();b2[i]="N";if(C.inCheck(b2,"b"))A.add(i)}if(A.size>=2&&A.size<=8)return{b,A}}}
  return null}
async function ep4Game(kind,cs,why){epCss();const C=window.XQCore;let D=null;try{D=await cjData()}catch(e){toast("題庫載入失敗");return}
  const ov=document.createElement("div");ov.className="ep-ov";const h0=location.hash;
  ov.innerHTML=`<h3>${kind==="ck"?"♟":"🐎"} ${EP4_GAME[kind][0]}・1 分鐘</h3><p class="muted" style="margin:0 0 4px;font-size:14px">${esc(EP4_GAME[kind][1])}</p><div class="ep-tm" id="ep4T">60</div><div class="boardbox" id="ep4B"></div><div class="ep-st" id="ep4S">答對 0 題</div><div class="ep-row"><button class="btn ghost" id="ep4Q">提早結束</button></div>`;
  document.body.append(ov);const $=q=>ov.querySelector(q),bd=Board(i=>tap(i));$("#ep4B").append(bd.svg);
  let pos=null,got=new Set(),score=0,miss=0,lock=false,end=false;const t0=Date.now();
  const next=()=>{pos=ep4Pos(D,kind);got=new Set();if(!pos){finish();return}bd.draw(pos.b,{})};
  const show=()=>bd.draw(pos.b,{hint:[...got]});
  function tap(i){if(lock||end||!pos)return;
    if(kind==="ck"){if(pos.A.has(i)){vibrate(12);score++;lock=true;bd.draw(pos.b,{hint:[i]});setTimeout(()=>{lock=false;next()},350)}
      else if(pos.b[i]&&C.sideOf(pos.b[i])==="r"){vibrate([20,40,20]);miss++;lock=true;bd.draw(pos.b,{hint:[...pos.A]});setTimeout(()=>{lock=false;next()},900)}}
    else{if(pos.A.has(i)&&!got.has(i)){vibrate(10);got.add(i);show();if(got.size===pos.A.size){score++;lock=true;setTimeout(()=>{lock=false;next()},450)}}
      else if(!got.has(i)){vibrate([20,40,20]);miss++;lock=true;bd.draw(pos.b,{hint:[...pos.A]});setTimeout(()=>{lock=false;next()},1000)}}
    $("#ep4S").textContent=`答對 ${score} 題`}
  const tick=setInterval(()=>{if(end)return;if(location.hash!==h0||!ov.isConnected){finish(true);return}const s=60-Math.floor((Date.now()-t0)/1000);$("#ep4T").textContent=Math.max(0,s);if(s<=0)finish()},250);
  $("#ep4Q").onclick=()=>{vibrate(5);finish()};
  function finish(quiet){if(end)return;end=true;clearInterval(tick);if(quiet){ov.remove();return}
    ov.innerHTML=`<h3>🌙 一分鐘到了</h3><p style="font-size:17px;margin:4px 0 8px">答對 <b>${score}</b> 題</p>`+epSay(cs[0],score>=5?"好眼力！":"看得仔細，就是好棋。")+epSay(cs[1],EP4_END[cs[1]][why==="night"?0:1])+epSay(cs[0],EP4_END[cs[0]][why==="night"?0:1])
      +`<div class="ep-card">說書人：「燈芯結了一朵燈花——老一輩說，這是好兆頭。」<br>挑一樣帶走：</div><div class="ep-row"><button class="btn" id="ep4X">✨ 修為 +${EP_XP[4]}</button><button class="btn" id="ep4H">🪔 燈花：提示棋 1 顆</button></div>`;
    const take=f=>{const S=epSt(),k="ep4:"+ep4Key();if(S.nr===k){ov.remove();return}S.nr=k;epSave(S);f();ov.remove();if(why==="night")setTimeout(()=>toast("🌙 夜深了，早點休息"),600)};
    $("#ep4X").onclick=()=>{vibrate(8);take(()=>addXP(EP_XP[4],"插曲","ep4:"+ep4Key()))};
    $("#ep4H").onclick=()=>{vibrate(8);take(()=>{store.set("hintBonus",(+store.get("hintBonus",0)||0)+1);toast("🪔 收下一朵燈花：提示棋 +1")})}}
  next()}
function ep4Home(){if(!epOk()||!EP4_ON)return;if(navKey(location.hash)!=="/"||document.querySelector("#sheet,.modal,.ep-ov,.v7,.travel,.ecover"))return;const S=epSt(),here=epHere(),why=ep4Due(S,here);if(!why||!epRoom(S))return;ep4Show(null,"home",why)}
setTimeout(ep4Home,5000);document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")setTimeout(ep4Home,3000)});

/* ---------- 5 星槎大掃除 ---------- */
const EP5_DROP={B:["x_spiritgirl","哎呀，我擦桌子的時候，一顆相滾進雲河裡了……","少了相也贏了！那顆相，我再雕一顆。"],
  A:["x_shi","……仕掉了。我的錯。","……贏了。仕，我會撈回來。"],
  P:["x_bing","我掃地掃太快，把一顆兵掃出船外啦！對不住對不住！","少一顆兵也贏啦！這回算我欠{你}的！"],
  C:["x_martialgirl","我、我只是揮了一下抹布……炮就飛出去了！","沒有炮也贏了！……可是下回我會輕一點。"],
  N:["x_miaogirl","我想讓傌跳一下給大家看……它就跳進雲河裡了呀……","嘿嘿，沒有傌也到得了！"],
  R:["x_swordboy","我把棋盒抱直了走……一顆俥從縫裡掉下去了。","少了俥，路也通了。"]};
const EP5_TITLE={B:"無相大師",A:"無仕自安",P:"無兵也勝",C:"無炮自鳴",N:"失馬非禍",R:"無車亦通"};
let EP5_P=null;
function ep5Data(){return EP5_P||(EP5_P=fetch("data/canju/episode-set.json").then(r=>r.ok?r.json():{items:[]}).catch(()=>{EP5_P=null;return{items:[]}}))}
/* 起航、千秋穿梭：擲 5%，記下「到站後出現」 */
function ep5Roll(){if(!EP5_ON||!epOk())return;const S=epSt();if(!epRoom(S)||Math.random()>=EP_P[5])return;S.sw.pend=Date.now();epSave(S)}
async function ep5Start(force){const D=await ep5Data(),S=epSt(),me=epMe(),Ps=Object.keys(EP5_DROP).filter(p=>EP5_DROP[p][0]!==me);
  const L=D.items.filter(x=>x.gone&&Ps.includes(x.gone.p)&&!S.sw.done[x.id]);const A=L.length?L:D.items.filter(x=>x.gone&&Ps.includes(x.gone.p));if(!A.length)return null;
  const fresh=A.filter(x=>!S.sw.t[x.gone.p]),P=epOne(fresh.length?fresh:A);S.sw.cur={id:P.id,p:P.gone.p,c:EP5_DROP[P.gone.p][0],at:Date.now()};S.sw.pend=null;if(!force)epCount(S);epSave(S);return S.sw.cur}
function ep5Show(v,where){const S=epSt();if(!S.sw.pend||Date.now()-S.sw.pend>15*6e4){if(S.sw.pend){S.sw.pend=null;epSave(S)}return false}
  ep5Start(false).then(cur=>{if(!cur||!v.isConnected)return;epBubble(v,where,[cur.c],"🧹 星槎大掃除",EP5_DROP[cur.p][1],()=>ep5Sheet())}).catch(()=>{});return true}
function ep5Sheet(){epCss();const S=epSt(),cur=S.sw.cur;if(!cur)return;const d=EP5_DROP[cur.p],pc=EP_PCN[cur.p];
  sheet("🧹 星槎大掃除",bx=>{bx.innerHTML=epSay(cur.c,d[1])+epSay("teller","無妨。少了一顆子，殘局照樣擺。客官，少一顆"+pc+"，{你}也殺得了嗎？")
    +`<div class="ep-card">♟ 這一題紅方少了一顆<b>${pc}</b>。Pikafish 算過：少了它照樣殺得了。<br><span class="muted" style="font-size:13px">解開修為 +${EP_XP[5]}${S.sw.t[cur.p]?"":`，第一次解開還有稱號「${EP5_TITLE[cur.p]}」`}；解不開不扣東西。</span></div><div class="ep-row"><button class="btn" id="ep5Go">♟ 開始解題</button><button class="btn ghost" id="ep5No">之後再說</button></div>`;
    bx.querySelector("#ep5Go").onclick=()=>{vibrate(8);closeSheet();setTimeout(()=>{location.hash="#/canju/e/5/"+encodeURIComponent(cur.id)},240)};bx.querySelector("#ep5No").onclick=()=>{vibrate(5);closeSheet()}})}
const ep5File=sq=>{const c="abcdefghi".indexOf(String(sq||"")[0]);return c>=0?"紅方第"+CNUM(9-c)+"路":""};
function ep5XM(id){const S=epSt(),cur=S.sw.cur&&S.sw.cur.id===id?S.sw.cur:null,done=!!S.sw.done[id];if(!cur&&!done)return{err:"這次的大掃除已經過去了。",back:()=>"#/adventure"};
  return{id,rk:"cjRunEp",back:()=>"#/adventure",top:"🧹 星槎大掃除",icon:"🧹",noXP:true,ans:"看答案這一題就不算數（也沒有修為和稱號），確定？",
    head:P=>{const g=P.gone||{},nm=EP_PCN[g.p]||"";return`<b>🧹 星槎大掃除・少了一顆紅${nm}</b>（原本在${esc(ep5File(g.sq))}）・${cjLv(P.d)}　<span class="muted">${cjSrc(P)}・少一子</span>${cur?`<div class="shp-psay">${esc(epNk(cur.c))}：「${esc(epTx("對不住……{你}一定解得開！",cur.c))}」</div>`:""}`},
    mark:()=>{const S2=epSt(),first=!S2.sw.done[id];let title=null;const p=(S2.sw.cur&&S2.sw.cur.id===id?S2.sw.cur.p:null)||id.replace(/^ep5-.+-([A-Z])[a-i]\d$/,"$1");
      if(first){S2.sw.done[id]=Date.now();if(EP5_TITLE[p]&&!S2.sw.t[p]){S2.sw.t[p]=Date.now();title=EP5_TITLE[p]}epSave(S2);addXP(EP_XP[5],"插曲","ep5:"+id)}return{first,title,p}},
    done:(x,ans)=>{if(ans||!x)return`<p class="muted">看了答案，這一題先不算數；不看答案解開才算。</p>`;epCss();const d=EP5_DROP[x.p];return(d?epSay(d[0],d[2]):"")+(x.first?`<p>✨ 修為 +${EP_XP[5]}</p>`:"")+(x.title?`<p style="color:#C8962E;font-weight:900">🏅 得到稱號「${esc(x.title)}」</p>`:"")},
    next:()=>"#/adventure",nextL:()=>"⛵ 回星槎"}}

/* ---------- 接到別人的程式（包一層，不改原檔） ---------- */
/* 星槎頁、渡口：輪到插曲就這次不串門子 */
if(typeof v7Try==="function"){const v7Try0=v7Try;v7Try=function(v,where){let shown=false;try{shown=epTry(v,where)}catch(e){console.warn(e)}if(!shown)return v7Try0(v,where)}}
function epTry(v,where){if(!epOk()||!v)return false;const S=epSt(),here=epHere();if(!S.at[here]){S.at[here]=Date.now();epSave(S)}
  if(document.querySelector("#sheet,.modal,.ep-ov,.travel"))return false;
  if(EP5_ON&&S.sw.pend)return ep5Show(v,where);
  if(!epRoom(S))return false;
  const w4=EP4_ON?ep4Due(S,here):null;if(w4&&ep4Show(v,where,w4))return true;
  if(EP1_ON&&ep1Due(S,here)){const d=localDay();if(S.r1[here]===d)return false;S.r1[here]=d;epSave(S);if(Math.random()>=EP_P[1])return false;return ep1Show(v,where,here)}
  return false}
/* 驛站信箱：漏字信放在最上面 */
if(typeof yzMail==="function"){const yzMail0=yzMail;yzMail=function(k){const r=yzMail0(k);try{if(epOk()){ep2Arrive(k,false);ep2Inject()}}catch(e){console.warn(e)}return r}}
/* 解題頁：e/1/<朝代>＝石桌起爭執、e/5/<題號>＝星槎大掃除；千秋殘局 s/ 的錯著、解開記下來（第 1 案「連續走錯 2 步」） */
if(typeof cjXMode==="function"){const cjXMode0=cjXMode;cjXMode=function(id){let m=/^e\/1\/(\w+)$/.exec(id);if(m)return ep1XM(m[1]);m=/^e\/5\/(.+)$/.exec(id);if(m)return ep5XM(m[1]);
  const X=cjXMode0(id);m=/^s\/(\w+)\//.exec(id);if(X&&m&&!X.err){const k=m[1],w0=X.wrong,k0=X.mark;
    X.wrong=function(){try{const S=epSt();S.lose[k]=(S.lose[k]|0)+1;epSave(S)}catch(e){}return w0?w0.apply(this,arguments):""};
    X.mark=function(){try{const S=epSt();S.lose[k]=0;epSave(S)}catch(e){}return k0?k0.apply(this,arguments):null}}
  return X}}
/* 第 5 案的題併進題庫 byId（不進 items：不排進茶單） */
if(typeof cjData==="function"){const cjData0=cjData;let epCjP=null;cjData=function(){return epCjP||(epCjP=Promise.all([cjData0(),ep5Data()]).then(([d,e])=>{for(const x of(e&&e.items)||[])if(!d.byId[x.id])d.byId[x.id]=x;return d}).catch(err=>{epCjP=null;throw err}))}}
/* 起航、千秋穿梭：擲第 5 案 */
if(typeof qianqiu==="function"){const qq0=qianqiu;qianqiu=function(from,to,done,src){if(to&&from!==to)try{ep5Roll()}catch(e){}return qq0(from,to,done,src)}}

/* ---------- 設定 → 角色：🎐 旅途插曲（開關、稱號、開發者的立即觸發） ---------- */
function epSetHTML(){if(!journey()||!myChar())return"";const S=epSt(),T=Object.keys(S.sw.t||{}).map(p=>EP5_TITLE[p]).filter(Boolean),nm=EP2_MAIL.filter(M=>(S.m[M.id]||{}).done).length,
    dv=typeof DEVMODE==="function"&&DEVMODE();
  return`<div class="sec-t">🎐 旅途插曲</div><div class="card"><label class="row" style="justify-content:space-between"><span><b>旅途插曲</b><br><span class="muted">七星吵架、漏字信、不速之客、星夜茶話、大掃除；一天最多 2 次，不會扣東西</span></span><input type="checkbox" class="sw" id="epSw" ${store.get("epOff",false)?"":"checked"}></label>
    ${T.length||nm?`<div class="muted" style="font-size:13px;margin-top:6px">${T.length?"🏅 稱號："+T.map(esc).join("、"):""}${T.length&&nm?"<br>":""}${nm?"📜 補好的信："+nm+"／"+EP2_MAIL.length+" 封":""}</div>`:""}
    ${dv?`<div style="border-top:1px solid var(--line);margin:8px 0 6px"></div><div class="muted" style="font-size:12.5px">🧪 開發者：立即觸發（不算次數、不看開關和機率）</div><div class="row" style="gap:6px;flex-wrap:wrap;margin-top:6px">${[[1,"⚡ 吵架"],[2,"💧 漏字信"],[3,"🌀 不速之客"],[4,"🌙 茶話會"],[5,"🧹 大掃除"]].map(([k,l])=>`<button class="pill" data-epdev="${k}">${l}</button>`).join("")}</div>`:""}</div>`}
function epSetBind(v){const sw=v.querySelector("#epSw");if(sw)sw.onchange=()=>{store.set("epOff",!sw.checked);toast(sw.checked?"🎐 旅途插曲打開了":"🎐 旅途插曲關掉了")};
  v.querySelectorAll("[data-epdev]").forEach(b=>b.onclick=()=>{vibrate(5);epDev(+b.dataset.epdev)})}
async function epDev(k){EP_DEV=1;try{const here=epHere(),S=epSt();
  if(k===1){const X=ep1Talk(here);if(!X)return toast("這一站的兩組都有你自己，換一站試");delete S.a[here];S.a[here]={k:X.k,c:[EP_K[X.T.a],EP_K[X.T.b]],at:Date.now()};epSave(S);ep1Sheet(here)}
  else if(k===2){const id=ep2Arrive(here,true);if(!id)return toast("五封信都補好了");ep2Sheet(id)}
  else if(k===3){EP3_FORCE=true;if(navKey(location.hash)==="/journey/play"){toast("🌀 不速之客：馬上來");ep3Check().catch(()=>{})}else toast("🌀 不速之客：去園子跟路人下一盤，輪到你走時就會來")}
  else if(k===4){const me=epMe(),L=Object.keys(EP4_OPEN).filter(c=>c!==me),a=epOne(L);ep4Sheet([a,epOne(L.filter(c=>c!==a))],ep4Night()?"night":"stuck")}
  else if(k===5){const cur=await ep5Start(true);if(!cur)return toast("題庫載入失敗");ep5Sheet()}}finally{setTimeout(()=>{EP_DEV=0},500)}}
