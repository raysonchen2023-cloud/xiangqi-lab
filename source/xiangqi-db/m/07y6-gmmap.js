/* ================= 🖼 特級大師「崇文畫像長廊」（41 案第 6 頁：Gemini 方案 1＋2，Claude 依考究清單修正；考究說明 park/gmmap/考究說明.md，史學顧問核圖中）=================
   圖：park/gmmap/gm_day_v3.png（Gemini 第一張＋局部修：走道木地板、裱褙改淡青素綾；宣紙濾鏡 0.6）、夜版 gm_night_v1.png（月光、欄杆影）→ art/gmmap/ → data/gmmap/。
   畫心六款（山、竹、梅、蘭石、雲水、寒林，gh_*_t.png，紙色已校成同一個色調）：依序輪流配給每一軸（第 n 軸用第 n % 6 款），跟人、年代、評價無關。
   規矩：不畫任何人的臉或肖像；72 位（含 2024 年撤銷稱號的 15 位）畫軸、名牌、印章完全一樣，撤銷只在小傳裡照 gmbios.json 的原文寫。
   名印與楷書名牌由程式畫（印文用一般字體，不假裝篆書）；讀過他的 5 盤以上，軸角蓋一方中性的「覽」字小印，不寫稱讚的話。
   上方：長廊圖，牆上六軸的畫心由程式貼上山水；角色走到第三軸前鞠躬，往下就是畫像長廊。
   下方：竹牌分出生年代＋搜尋；點一軸就地展開（返回鍵先收起），小傳和全部對局滑出來，點一盤就開棋。
   入口：棋譜庫二樓的「特級大師」畫軸（10b 的 lbBios）。開關 GM_MAP_ON；圖片網址帶 GM2_IMGV。路由：#/gm 原本落到 Home(v)，這裡包一層 Home 接走
   11/9 各朝版（史學顧問盤查 C 類第 3 項；考究說明＋顧問核 park/gmmap/考究說明_各朝_1109.md）：照棋譜庫的畫像形制分 3 組，停靠判斷跟 07y hbDockEra() 一樣：
     han＝秦～三國「分格壁畫」（白灰牆上的朱色寬框）、weijin＝魏晉～五代「畫障」（深褐木框）；宋以後、沒停靠用原圖（立軸）。
     圖 gm_day_<組>／gm_night_<組>：框是沿 GM2_Q 畫的，畫心照舊貼、座標不用分組。顧問必改：兩組的畫心只輪流用「山」「雲水」兩款（墨竹、墨梅、蘭石、寒林要到五代、北宋才成熟）；
     下方 72 軸跟著換形制（gm2-g-han 朱框、gm2-g-weijin 木框，都沒有掛繩、軸桿）；說明另加「分格壁畫」「畫障」，「山水畫心」改寫（g:"han weijin"＝只在這幾組登記，gm2Sci） */
const GM_MAP_ON=true;
const GM2_IMGV="2360";
const GM2_HEARTS=["gh_shan","gh_zhu","gh_mei","gh_lan","gh_yun","gh_lin"];
const GM2_GRP={qin:"han",han:"han",sanguo:"han",weijin:"weijin",nanbei:"weijin",sui:"weijin",tang:"weijin",wudai:"weijin"};
const gm2Grp=()=>{let e="";try{e=typeof hbDockEra==="function"?hbDockEra():typeof sciDock==="function"?sciDock():""}catch(x){}return GM2_GRP[e]||""};
const gm2Img=(dk,g)=>xqClImg(`data/gmmap/${dk?"gm_night":"gm_day"}${g?"_"+g:""}.webp?v=${GM2_IMGV}`);
const gm2Hearts=g=>g?["gh_shan","gh_yun"]:GM2_HEARTS;
/* 牆上六軸畫心的四角（像素 768×1376；左上、右上、右下、左下） */
const GM2_Q=[[[89,316],[176,382],[176,862],[89,911]],[[251,441],[295,477],[295,762],[251,795]],[[339,509],[363,524],[363,720],[339,735]],
  [[385,545],[397,555],[397,697],[385,705]],[[411,557],[419,564],[419,676],[411,680]],[[430,570],[436,575],[436,660],[430,662]]];
const GM2_ERA=[["","全部"],["a","1950 年以前生"],["b","1950–60 年代生"],["c","1970 年代生"],["d","1980 年代以後生"]];
/* 長廊很深（消失點約在圖高 51%）：照透視算是 (y－50.9)×0.0111，Q 版角色身形寬，縮成約七成（＝(y－50.6)×0.0075） */
const SHW_GM2={el:40,h:[.085,61.7,.0075],look0:[48,45],home:"home",N:{home:[56,63],sc:[49,60]},E:"home-sc",HS:{gm2Go:["sc",45.7,45,"bow"]}};
/* 回饋 818：點畫裡的東西看說明（07w6-sceneinfo.js 的 sciPage；內容取自 park/gmmap/考究說明.md；走道地板留給角色走路，不登記） */
const GM2_SCI={k:"gm2",nm:"特級大師",it:[
  {n:"淡青裱褙",fe:"song",s:[[[62,85],[198,240],[202,915],[58,1058]],[[236,305],[306,385],[306,818],[234,882]]],
   t:"畫四周鑲著一圈淡淡的青色素綾，看起來淡雅；不用皇宮的黑綾，也不織鸞鳥花紋，因為這裡是書院的長廊，不是皇宮。"},
  {n:"分格壁畫",g:"han",s:[[[77,281],[186,368],[186,878],[77,944]],[[244,420],[301,469],[301,770],[244,816]],[[334,496],[367,518],[367,726],[334,748]]],
   t:"牆上這一格一格朱色邊框的畫，是直接畫在白灰牆上的壁畫。{{<han:秦代的宮殿裡已經有壁畫，咸陽宮遺址就出土過壁畫殘片；}}{{han:漢宣帝曾把霍光等十一位功臣畫在麒麟閣裡；}}那時候還沒有掛軸，畫多半畫在牆上、屏風上或絲帛上。"},
  {n:"畫障",g:"weijin",s:[[[69,256],[192,358],[192,889],[69,967]],[[239,405],[305,464],[305,776],[239,831]],[[331,487],[370,513],[370,731],[331,757]]],
   t:"牆上嵌著一塊塊木框畫板，叫畫屏或畫障。{{nanbei:北魏司馬金龍墓出土過一塊塊畫在木板上的漆畫屏風；}}那時候還沒有掛軸，畫多半畫在屏風和牆上。"},
  {n:"山水畫心",g:"song",s:[GM2_Q[0],GM2_Q[1]],
   t:"掛軸中間的畫有山、竹、梅、蘭石、雲水、寒林六款{{song:，都是宋畫常見的題材}}，用水墨淡淡上色畫在絹上。六款照名冊順序輪流掛，不代表哪位大師的棋風。72 位大師都是現代真實的棋手，所以這裡不畫任何人的臉，表示尊重。"},
  {n:"山水畫心",g:"han weijin",s:[GM2_Q[0],GM2_Q[1]],
   t:"牆上的畫只畫山水雲氣，不畫任何人的臉。72 位大師都是現代真實的棋手，所以這裡不畫肖像，表示尊重。"},
  {n:"畫像和像贊",s:[[[324,420],[444,540],[444,698],[324,795]]],
   t:"替值得敬重的人畫像、寫讚美的文字（叫「像贊」），是很久的傳統。{{tang:唐太宗曾把二十四位功臣畫在凌煙閣{{song:；宋代的朱熹也替六位先生的畫像各寫了一首贊}}。}}{{<tang:{{han:漢宣帝曾在麒麟閣畫霍光等十一位功臣像。}}}}走到第三{{<song:幅畫}}{{song:軸}}前鞠躬，就是向先賢行禮。"},
  {n:"直欞窗",s:[[[450,560],[526,560],[526,654],[450,654]]],
   t:"長廊的盡頭是一扇直欞窗，一根根直木條排得整整齊齊。直欞窗是中國很古老的窗子樣式，素面、樸素。",
   tn:"長廊的盡頭是一扇直欞窗，一根根直木條排得整整齊齊，是中國很古老的窗子樣式。晚上月光就從中庭和這扇窗照進來。"},
  {n:"素面欄杆",s:[[[530,655],[600,690],[768,780],[768,1140],[610,862],[530,732]]],
   t:"右邊是素面的直欞欄杆，欄杆外是挑空的中庭。這裡不畫後來那種雕滿花的欄杆，保持樸素。",
   tn:"右邊是素面的直欞欄杆，不畫後來那種雕滿花的欄杆，保持樸素。晚上月光照進來，欄杆的影子長長地落在地板上。"},
  {n:"樑架和椽子",s:[[[222,0],[700,0],[620,300],[556,500],[444,500],[352,300]],[[598,262],[620,262],[620,860],[598,860]]],
   t:"抬頭看：屋頂的樑架和一根根椽子都露在外面，沒有用天花板遮起來，叫做「露明」，是古代木構常見的樣子。"},
  {n:"一樓的書櫃",s:[[[620,425],[768,405],[768,772],[620,700]]],
   t:"欄杆外是挑空的中庭，對面是書閣一樓的書櫃。這座樓和棋譜庫的書閣是同一座：二樓是畫像長廊，一樓是書櫃。",
   tn:"欄杆外是挑空的中庭，對面是書閣一樓的書櫃，夜裡有幾扇窗透出燈火。這座樓和棋譜庫的書閣是同一座：二樓是畫像長廊，一樓是書櫃。"}]};
/* 這一組要登記的物件（g 沒寫＝每組都有；原圖那組＝song） */
const gm2Sci=g=>Object.assign({},GM2_SCI,{it:GM2_SCI.it.filter(x=>!x.g||x.g.split(" ").includes(g||"song"))});
let GM2_ST={era:"",q:""},GM2_ITEMS=null,GM2_P=null;
const gm2Dark=()=>{const t=store.get("pageTheme","auto"),h=new Date().getHours();return t==="dark"||(t==="auto"&&matchMedia("(prefers-color-scheme: dark)").matches)||h>=20||h<5};
const gm2Era=p=>{const y=parseInt(p&&p.born)||0;return!y?"":y<1950?"a":y<1970?"b":y<1980?"c":"d"};
function gm2M3(w,h,q){const[[x0,y0],[x1,y1],[x2,y2],[x3,y3]]=q,dx1=x1-x2,dx2=x3-x2,dx3=x0-x1+x2-x3,dy1=y1-y2,dy2=y3-y2,dy3=y0-y1+y2-y3,den=dx1*dy2-dx2*dy1;
  const g=(dx3*dy2-dx2*dy3)/den,hh=(dx1*dy3-dx3*dy1)/den,a=x1-x0+g*x1,b=x3-x0+hh*x3,d=y1-y0+g*y1,e=y3-y0+hh*y3;
  return`matrix3d(${a/w},${d/w},0,${g/w},${b/h},${e/h},0,${hh/h},0,0,1,0,${x0},${y0},0,1)`}
function gm2Css(){if(document.getElementById("gm2Css"))return;const s=document.createElement("style");s.id="gm2Css";s.textContent=`
.gm2-page{margin:0}
.gm2-fx{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.gm2-wh{position:absolute;left:0;top:0;width:90px;height:200px;transform-origin:0 0;object-fit:cover;opacity:.93;mix-blend-mode:multiply}
.gm2-night .gm2-wh{opacity:.55;filter:brightness(.8) saturate(.7)}
.gm2-hall{position:relative;padding:10px 12px 28px;background:#ece5d6;background-image:radial-gradient(rgba(120,100,70,.06) 1px,transparent 1.2px);background-size:7px 7px;color:#2a1f15;border-top:6px solid #8a7058}
.gm2-hall.dk{background-color:#2d3138;color:#e7e1d4;border-top-color:#3a3026}
.gm2-bar{position:sticky;top:0;z-index:5;margin:-10px -12px 10px;padding:8px 12px 6px;background:inherit;box-shadow:0 2px 4px rgba(60,40,20,.12)}
.gm2-tags{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding-bottom:4px}.gm2-tags::-webkit-scrollbar{display:none}
.gm2-tag{flex:none;border:0;padding:6px 10px 5px;font:700 12.5px/1.2 var(--serif,serif);color:#3a2a1a;background:linear-gradient(90deg,#c9b27a,#e3d19c 30%,#d2bb84 55%,#e6d6a6 80%,#c4ab70);border-radius:3px;box-shadow:inset 0 0 0 1px rgba(90,64,30,.35),0 1px 2px rgba(0,0,0,.2);cursor:pointer}
.gm2-tag.on{background:linear-gradient(90deg,#7d6330,#a2864a 40%,#8a6e38);color:#fbf3df}
.gm2-q{display:block;width:100%;box-sizing:border-box;margin-top:4px;padding:7px 10px;border:1px solid rgba(90,64,30,.35);border-radius:4px;background:#f8f2e4;font:15px/1.3 var(--serif,serif);color:#2a1f15}
.gm2-hall.dk .gm2-q{background:#3a3e46;color:#efe9dc;border-color:#59544a}
.gm2-cnt{font:12px/1.4 var(--serif,serif);opacity:.7;margin:2px 0 0}
.gm2-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px 12px}
.gm2-ax{position:relative;scroll-margin-top:118px;display:flex;flex-direction:column;align-items:center;border:0;background:none;padding:0;cursor:pointer;color:inherit;font:inherit;text-align:center}
.gm2-cord{width:46%;height:10px;border:1px solid rgba(60,40,24,.55);border-bottom:0;border-radius:50% 50% 0 0/100% 100% 0 0}
.gm2-rod{width:100%;height:7px;border-radius:4px;background:linear-gradient(#a07a52,#6a4a2c);position:relative}
.gm2-rod::before,.gm2-rod::after{content:"";position:absolute;top:-1.5px;width:6px;height:10px;border-radius:3px;background:#5a3a22}.gm2-rod::before{left:-5px}.gm2-rod::after{right:-5px}
.gm2-mt{width:88%;padding:14% 8% 18%;background:#b9cdbd;background-image:linear-gradient(#a9c0b0 0 9%,transparent 9% 91%,#a9c0b0 91%);box-shadow:inset 0 0 0 1px rgba(60,80,60,.25),1px 2px 3px rgba(40,30,20,.25);box-sizing:border-box}
.gm2-hall.dk .gm2-mt{filter:brightness(.8)}.gm2-hall.dk .gm2-ht img{filter:brightness(.85)}
.gm2-ht{display:block;position:relative;aspect-ratio:.45;overflow:hidden;box-shadow:0 0 0 1px rgba(60,40,24,.35)}
.gm2-ht img{width:100%;height:100%;object-fit:cover;display:block}
.gm2-g-han .gm2-cord,.gm2-g-han .gm2-rod,.gm2-g-weijin .gm2-cord,.gm2-g-weijin .gm2-rod{display:none}
.gm2-g-han .gm2-mt{margin-top:10px;padding:8%;background:#b5563f;background-image:linear-gradient(100deg,rgba(255,255,255,.07),transparent 40%,rgba(90,20,10,.1) 70%,transparent);box-shadow:inset 0 0 0 1px rgba(80,40,28,.45),inset 0 0 0 4px rgba(150,60,40,.25)}
.gm2-g-han .gm2-ht{box-shadow:0 0 0 1px rgba(80,40,28,.5)}
.gm2-g-weijin .gm2-mt{margin-top:10px;padding:9%;background:#5a4130;background-image:repeating-linear-gradient(90deg,rgba(0,0,0,.08) 0 2px,transparent 2px 7px),linear-gradient(135deg,#6e5039,#4b3424 65%,#5a4130);box-shadow:inset 1px 1px 0 rgba(255,228,190,.22),inset -1px -1px 0 rgba(0,0,0,.4),2px 3px 4px rgba(30,20,10,.35)}
.gm2-g-weijin .gm2-ht{box-shadow:0 0 0 2px rgba(176,140,100,.6)}
.gm2-lan{position:absolute;right:6%;bottom:5%;width:24%;aspect-ratio:1;border:1.5px solid #b23a26;border-radius:2px;color:#b23a26;font:900 13px/1 var(--serif,serif);display:flex;align-items:center;justify-content:center;background:rgba(255,240,230,.35);transform:rotate(-6deg);opacity:.9}
.gm2-nb{display:flex;align-items:center;gap:6px;margin-top:7px;max-width:100%}
.gm2-seal{flex:none;width:26px;height:26px;border:1.5px solid #b23a26;border-radius:2px;color:#b23a26;display:flex;align-items:center;justify-content:center;background:rgba(255,245,236,.6);overflow:hidden}
.gm2-seal i{font:900 10.5px/1.05 var(--serif,serif);font-style:normal;writing-mode:vertical-rl;height:2.2em;text-align:center}
.gm2-nm{display:flex;flex-direction:column;text-align:left;min-width:0}
.gm2-nm b{font:800 14px/1.2 var(--kai,var(--serif,serif))}.gm2-nm small{font:11px/1.3 var(--serif,serif);opacity:.72}
.gm2-ax.open{grid-column:1/-1;flex-direction:row;align-items:flex-start;gap:12px;cursor:default}
.gm2-ax.open .gm2-col{width:34%;flex:none;display:flex;flex-direction:column;align-items:center}
.gm2-col{display:flex;flex-direction:column;align-items:center;width:100%}
.gm2-dt{display:none;flex:1;min-width:0;text-align:left;animation:gm2In .35s ease-out both}
.gm2-ax.open .gm2-dt{display:block}
@keyframes gm2In{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:none}}
.gm2-dt h3{margin:0 0 2px;font:900 19px/1.25 var(--kai,var(--serif,serif))}
.gm2-dt .m{font:12px/1.45 var(--serif,serif);opacity:.75;margin:0 0 6px}
.gm2-dt p{font:14px/1.65 var(--serif,serif);margin:0 0 8px}
.gm2-dt ul{margin:0 0 8px;padding-left:18px;font:13px/1.5 var(--serif,serif)}
.gm2-gl{border-top:1px dashed rgba(90,64,30,.4);padding-top:6px}
.gm2-gl h4{margin:0 0 4px;font:800 14px/1.3 var(--serif,serif)}
.gm2-g{display:block;width:100%;text-align:left;border:0;border-bottom:1px solid rgba(90,64,30,.15);background:none;padding:6px 2px;font:13px/1.4 var(--serif,serif);color:inherit;cursor:pointer}
.gm2-g small{display:block;opacity:.7;font-size:11.5px}
.gm2-x{position:absolute;right:-4px;top:-4px;width:30px;height:30px;border-radius:50%;border:1px solid rgba(90,64,30,.4);background:#f6efdf;color:#3a2618;font:700 15px/1 sans-serif;cursor:pointer;z-index:2}
.gm2-more{margin-top:6px;border:1px solid rgba(90,64,30,.4);background:#f6efdf;color:#3a2618;border-radius:4px;padding:6px 10px;font:13px var(--serif,serif);cursor:pointer}
.gm2-page .shp-spot.gm2-tagspot{padding:4px 12px}.gm2-page .shp-spot.gm2-tagspot b{white-space:nowrap}
@media (prefers-reduced-motion:reduce){.gm2-dt{animation:none}}`;document.head.append(s)}
/* 72 位排成一定的順序（出生年、沒有的排後面，同年依名字）；第 n 軸用第 n % 6 款畫心，跟人無關 */
function gm2List(B,HS){HS=HS||GM2_HEARTS;return Object.entries(B||{}).map(([n,p])=>({n,p,y:parseInt(p.born)||9999})).sort((a,b)=>a.y-b.y||String(a.p.zh||a.n).localeCompare(String(b.p.zh||b.n),"zh-Hant")).map((x,i)=>Object.assign(x,{h:HS[i%HS.length]}))}
/* 讀過幾盤：棋譜頁打開過的特級大師對局（rdLog，04-stats）裡，紅方或黑方是他的 */
function gm2Read(L){const o=(()=>{try{const g=(rdLog().o||{}).gmgames;return g?g.split(","):[]}catch(e){return[]}})();if(!o.length||!GM2_ITEMS)return{};
  const ids=new Set(o.map(k=>RDL.id("gmgames",k))),C={};for(const it of GM2_ITEMS){if(!ids.has(it.id))continue;for(const x of L)if((it.red||"").includes(x.n)||(it.black||"").includes(x.n))C[x.n]=(C[x.n]||0)+1}return C}
/* 日期：19990820 這種寫成 1999.8.20，其他照原樣 */
const gm2Date=it=>{const d=String(it.date||"");const m=d.match(/^(\d{4})(\d{2})(\d{2})$/);return m?`${m[1]}.${+m[2]}.${+m[3]}`:d||String(it.year||"")};
function gm2Items(){if(GM2_ITEMS)return Promise.resolve(GM2_ITEMS);return GM2_P||(GM2_P=api("/db/items?c=gmgames").then(d=>GM2_ITEMS=(d&&d.items)||[]).catch(e=>{GM2_P=null;throw e}))}
function GmHall(v){gm2Css();setTop("🖼 特級大師","#/db");if(typeof setTabs==="function")setTabs(true,"#/db");v.className="view";
  const dk=gm2Dark(),grp=gm2Grp(),HS=gm2Hearts(grp),P=document.createElement("div");P.className="shp-page cq gm2-page"+(dk?" gm2-night":"");v.innerHTML="";v.append(P);
  const pc=(x,y)=>[(x/7.68).toFixed(2),(y/13.76).toFixed(2)],ax=grp?"畫":"畫軸";
  P.innerHTML=`<img src="${gm2Img(dk,grp)}" alt="${grp?"書閣":"崇文書閣"}二樓的畫像長廊"><div class="gm2-fx" aria-hidden="true">${GM2_Q.map((q,i)=>`<img class="gm2-wh" data-i="${i}" src="data/gmmap/${HS[i%HS.length]}.webp?v=${GM2_IMGV}" alt="">`).join("")}</div>
    <button class="shp-spot gm2-tagspot" id="gm2Go" style="left:${pc(351,470)[0]}%;top:${pc(351,470)[1]}%"><b>畫像長廊・往下看</b></button>`;
  const H=document.createElement("section");H.className="gm2-hall"+(dk?" dk":"")+(grp?" gm2-g-"+grp:"");H.setAttribute("aria-label","特級大師畫像長廊");v.append(H);
  H.innerHTML=`<div class="gm2-bar"><div class="gm2-tags" role="tablist">${GM2_ERA.map(([k,t])=>`<button type="button" class="gm2-tag${GM2_ST.era===k?" on":""}" data-e="${k}" role="tab" aria-selected="${GM2_ST.era===k}">${esc(t)}</button>`).join("")}</div>
    <input class="gm2-q" type="search" placeholder="找一位：名字、籍貫、頭銜" value="${esc(GM2_ST.q)}" aria-label="搜尋特級大師"><div class="gm2-cnt"></div></div><div class="gm2-grid"><p class="gm2-cnt">展開${ax}中…</p></div>`;
  const fit=()=>{const k=P.clientWidth/768;if(!k)return;P.querySelectorAll(".gm2-wh").forEach(m=>{const q=GM2_Q[+m.dataset.i].map(([x,y])=>[x*k,y*k]);m.style.transform=gm2M3(90,200,q)})};
  if(window.ResizeObserver){const ro=new ResizeObserver(()=>{if(!P.isConnected){ro.disconnect();return}fit()});ro.observe(P)}fit();
  /* 回饋 833（開發者 11/9：四頁也改成一對一）：這頁圖上只有「畫像長廊」一個入口，面板裡也只有畫像長廊這一塊（年代竹牌、搜尋、72 軸），所以不用藏東西，
     只把面板標題換成入口名「畫像長廊」（原本是頁名「🖼 特級大師」）。面板是 07w 的 xqSheetAuto 晚一點（0～700ms）才建的，所以點的當下才去拿；還沒建好就照舊捲過去 */
  P.querySelector("#gm2Go").onclick=()=>{const X=v.querySelector(".xqs"),S=X&&X._S;if(S&&X.contains(H)){S.open(H,"畫像長廊");return}try{H.scrollIntoView({behavior:"smooth",block:"start"})}catch(e){H.scrollIntoView()}};
  let L=[],RD={},unNav=null,openN="";
  const grid=H.querySelector(".gm2-grid"),cnt=H.querySelector(".gm2-bar .gm2-cnt");
  const axHTML=x=>{const p=x.p,nm=p.zh||x.n,seal=nm.length===3?nm+"印":nm.slice(0,4),rd=(RD[x.n]||0)>=5;
    return`<div class="gm2-ax" data-n="${esc(x.n)}" role="button" tabindex="0" aria-label="${esc(nm+"的"+ax+(rd?"，已讀過五盤以上":""))}"><div class="gm2-col"><span class="gm2-cord" aria-hidden="true"></span><span class="gm2-rod" aria-hidden="true"></span>
      <span class="gm2-mt"><span class="gm2-ht"><img loading="lazy" src="data/gmmap/${x.h}.webp?v=${GM2_IMGV}" alt="">${rd?'<span class="gm2-lan" aria-hidden="true">覽</span>':""}</span></span><span class="gm2-rod" aria-hidden="true"></span>
      <span class="gm2-nb"><span class="gm2-seal" aria-hidden="true"><i>${esc(seal)}</i></span><span class="gm2-nm"><b>${esc(nm)}</b><small>${p.gm?esc(p.gm)+" 年特級大師":"特級大師"}</small></span></span></div><div class="gm2-dt"></div></div>`};
  const shown=()=>{const q=s2(GM2_ST.q.trim());return L.filter(x=>(!GM2_ST.era||gm2Era(x.p)===GM2_ST.era)&&(!q||[x.n,x.p.zh,x.p.from,(x.p.titles||[]).join(" ")].some(t=>s2(t).includes(q))))};
  const s2=t=>String(t||"").toLowerCase();
  const draw=()=>{const S=shown();cnt.textContent=`${S.length} ${grp?"幅":"軸"}`+(S.length<L.length?`・共 ${L.length} ${grp?"幅":"軸"}`:"");
    grid.innerHTML=S.length?S.map(axHTML).join(""):'<p class="gm2-cnt">沒有找到這位，換個字試試</p>';
    if(openN&&grid.querySelector(`[data-n="${CSS.escape(openN)}"]`))expand(openN,true);else openN=""};
  const collapse=()=>{const o=grid.querySelector(".gm2-ax.open");if(o){o.classList.remove("open");const d=o.querySelector(".gm2-dt");d.innerHTML="";const b=o.querySelector(".gm2-x");if(b)b.remove()}openN=""};
  const close=()=>{collapse();if(unNav){const f=unNav;unNav=null;f()}};
  const games=(n,box,lim)=>{box.innerHTML='<h4>對局</h4><p class="gm2-cnt">翻棋譜中…</p>';
    gm2Items().then(I=>{if(!box.isConnected)return;const G=I.map((it,i)=>[it,i]).filter(([it])=>(it.red||"").includes(n)||(it.black||"").includes(n)).sort((a,b)=>(+b[0].year||0)-(+a[0].year||0)||b[1]-a[1]).map(x=>x[0]);
      box.innerHTML=`<h4>對局（${G.length} 盤）</h4>`+(G.length?G.slice(0,lim).map(it=>`<button type="button" class="gm2-g" data-id="${esc(it.id)}">${esc(it.red||"")} ${esc(it.result||"")} ${esc(it.black||"")}<small>${esc([gm2Date(it),it.event].filter(Boolean).join("・"))}</small></button>`).join(""):'<p class="gm2-cnt">棋譜庫裡還沒有他的對局</p>')
        +(G.length>lim?`<button type="button" class="gm2-more">再看 ${Math.min(40,G.length-lim)} 盤</button>`:"");
      box.querySelectorAll(".gm2-g").forEach(b=>b.onclick=e=>{e.stopPropagation();if(typeof vibrate==="function")vibrate(5);location.hash="#/db/gmgames/"+encodeURIComponent(b.dataset.id)});
      const m=box.querySelector(".gm2-more");if(m)m.onclick=e=>{e.stopPropagation();games(n,box,lim+40)}}).catch(e=>{if(box.isConnected)box.innerHTML='<h4>對局</h4><p class="gm2-cnt">讀不到對局，請確認網路後再試</p>'})};
  const expand=(n,keep)=>{const el=grid.querySelector(`[data-n="${CSS.escape(n)}"]`);if(!el)return;if(!keep&&openN===n)return;collapse();const x=L.find(y=>y.n===n);if(!x)return;const p=x.p;
    el.classList.add("open");openN=n;const life=[p.born&&String(p.born).slice(0,4)+" 年生",p.died&&String(p.died).slice(0,4)+" 年逝",p.from].filter(Boolean).join("・");
    el.querySelector(".gm2-dt").innerHTML=`<h3>${esc(p.zh||n)}</h3><div class="m">${esc(life)}</div><p>${esc(p.bio||"")}</p>${(p.titles||[]).length?`<ul>${p.titles.map(t=>`<li>${esc(t)}</li>`).join("")}</ul>`:""}<div class="gm2-gl"></div>`;
    const xb=document.createElement("button");xb.type="button";xb.className="gm2-x";xb.setAttribute("aria-label","收起"+ax);xb.textContent="✕";xb.onclick=e=>{e.stopPropagation();close()};el.append(xb);
    games(n,el.querySelector(".gm2-gl"),40);
    if(!keep){if(!unNav&&typeof xqPanelNav==="function")unNav=xqPanelNav(()=>{unNav=null;collapse()});requestAnimationFrame(()=>{try{el.scrollIntoView({behavior:"smooth",block:"start"})}catch(e){}})}};
  grid.onclick=e=>{const a=e.target.closest(".gm2-ax");if(!a||a.classList.contains("open"))return;if(typeof vibrate==="function")vibrate(5);expand(a.dataset.n)};
  grid.onkeydown=e=>{if(e.key!=="Enter"&&e.key!==" ")return;const a=e.target.closest(".gm2-ax");if(!a||a.classList.contains("open"))return;e.preventDefault();expand(a.dataset.n)};
  H.querySelectorAll(".gm2-tag").forEach(b=>b.onclick=()=>{GM2_ST.era=b.dataset.e;H.querySelectorAll(".gm2-tag").forEach(t=>{const on=t===b;t.classList.toggle("on",on);t.setAttribute("aria-selected",on)});close();draw()});
  H.querySelector(".gm2-q").oninput=e=>{GM2_ST.q=e.target.value;close();draw()};
  XQ_BIOS().then(B=>{if(!H.isConnected)return;L=gm2List(B,HS);draw();
    let any=false;try{any=!!(rdLog().o||{}).gmgames}catch(e){}
    if(any)setTimeout(()=>gm2Items().then(()=>{if(!H.isConnected)return;RD=gm2Read(L);if(!openN)draw();else grid.querySelectorAll(".gm2-ax:not(.open)").forEach(a=>{if((RD[a.dataset.n]||0)>=5&&!a.querySelector(".gm2-lan"))a.querySelector(".gm2-ht").insertAdjacentHTML("beforeend",'<span class="gm2-lan" aria-hidden="true">覽</span>')})}).catch(()=>{}),1200)})
    .catch(()=>{grid.innerHTML='<p class="gm2-cnt">讀不到特級大師的資料，請確認網路後再試</p>'});
  if(!P.dataset.shw){try{if(typeof shwPage==="function"&&typeof SHIP_WALK_ON!=="undefined"&&SHIP_WALK_ON)shwPage(v,Object.assign({},SHW_PG0,SHW_GM2),"gm2")}catch(e){}}
  if(typeof shpFit==="function")shpFit(v);
  try{if(typeof zmPage==="function")zmPage(v)}catch(e){}
  try{if(typeof sciPage==="function")sciPage(v,gm2Sci(grp))}catch(e){}
  return{}}
if(typeof Home==="function"){const f0=Home;Home=function(v,hub){if(GM_MAP_ON&&!hub&&/^#\/gm\/?$/.test(location.hash))return GmHall(v);return f0.apply(this,arguments)}}
if(typeof lbBios==="function"){const f0=lbBios;lbBios=function(){if(GM_MAP_ON){location.hash="#/gm";return}return f0.apply(this,arguments)}}
