/* ================= 🌦 節氣天氣・時辰光影・登船紀念日・朝代過場・四季變色（意見回饋 811「時間變化與角色年齡」，開發者 11/9 決定：不做角色變老，改做這幾項）=================
   背景：story/gemini_app/43_時間變化與角色年齡十案.md 與 _Gemini回覆.md 的方案 1、2（只取光影）、4、6；雨雪照 44_戶外場景下雨下雪五案_Gemini回覆.md，開發者選 B＋C。
   ① 節氣天氣：只在有戶外的滿版頁（SW7_PAGES：out 全戶外整張下；semi 半戶外只在看得到天的多邊形裡下；in 室內、古戰場不下；沒列到的頁也不下）。
      哪天下雨下雪：節氣機率（SW7_PREC）×地點（sw7RgMul：北方春天少雨、大漠草原少雨、嶺南閩台不下雪），用「日期＋地點」當種子，同一天全 App 一致，一天分 6 段只有部分時段在下（sw7Precip）。
      沒下雨雪時，照節氣有小點綴（SW7_AMB：花瓣、柳絮、落葉、薄霧、夏夜螢火）。這一頁算哪個節氣問 sw7TermFor(P,o)（預設手機真實日期，之後各朝可按頁覆寫）。
      雨＝淡墨斜線、雪＝水墨彈白小白點（不閃、不發光），每種效果一組 mk／draw（SW7_KIND），粒子上限 150；下雨整頁蒙一層很淡的煙雨灰、下雪天色微冷（.sw7-mist）。
      C 前景遮擋：semi 頁的屋簷、柱子、欄杆（fg 多邊形）從同一張底圖切一份疊在雨雪上面，雨雪像下在建築後面；3D 小人、標籤仍在最上層。
      不改各頁的檔：MutationObserver 看到 .shp-page.cq（和星槎主圖 .shp-map.full>.shp-in）就插一層 .sw7-fx（pointer-events:none，大小對齊底圖），放在入口標籤、標題字前面。
      一個 requestAnimationFrame 迴圈，只在 App 在前景、那一頁在畫面上時跑，約每秒 30 格；兩指縮放時照圖的 getBoundingClientRect 重算，雨絲雪點在螢幕上一樣大。
      夜景（圖檔名有 night）：雨改極淡紙白、雪不加墨邊、花葉淡一點；螢火只在夜景圖。prefers-reduced-motion：雨雪花葉畫一張靜止的淡層，螢火不顯示，霧不飄。
      今日推薦頁自己有冬至小寒雪、清明雨、春分桃花、秋分落葉（07y5 tdWeather），那幾個節氣那一頁不再疊；晨昏色那一頁也有（tdShadow），不疊。
      B 首頁換底圖：07z-homemap.js 問 sw7HomeWx()——大雪節氣、或小雪～大寒正在下雪換 data/homemap/home_snow.webp，下雨換 home_rain.webp，載不到留原圖。
   ② 時辰光影：白天圖（檔名沒有 night）在卯、辰時（5～9 點）整頁很淡的青、酉時（17～19 點）很淡的暖橘，漸強漸弱，每分鐘更新；不碰各頁換夜景的判斷。
   ③ 登船紀念日：登船日＝旅程鍵 journey.born（選角那一刻寫的，05b-save.js；跟存檔格、換手機轉移碼一起走，換手機不重置）。沒選角色＝還沒上船，不算。
      每年登船那天（之後 30 天內第一次打開也算，不用天天上線）在首頁、星槎頁、我的角色頁跳一張小卡「登上雲河星槎滿 N 年」，一年一次（store sw7Ann＝"登船時間:N"）；
      我的角色頁 3D 名字底下那條加「⛵ 船齡 N 年」，點一下看登船日。七星與玩家角色的外表、年紀設定都不變。
   ④ 朝代過場：千秋穿梭（07-legend.js qianqiu；星槎起航、航線換站、千秋石枰都走它）的字幕底下加一句「星槎破浪，光陰荏苒，忽已越四百年矣」，
      年數＝兩站故事場景的大約年份（SW7_ERA_Y）相差，取整到百年，不到 80 年寫「數十年」；白話小字說明船上的七星不會變老。
   ⑤ 四季變色：落葉樹（tr 多邊形；松柏竹不圈）裡偏綠的像素照節氣換色相、飽和（SW7_LEAFP），明暗與墨線照舊；算一次快取。
   ⑥ 四時風物匣：各朝渡口、驛站圖上的小木匣，四季風物照真實季節或贏棋收集，點了暫時換季（詳見 ⑥ 段）。文言句（過場、紀念日卡、詩詞）底下都有一行國小中年級看得懂的白話。
   開關：SW7_ON（全部）、SW7_BOX_ON（風物匣）；設定 → 深淺色那張卡「場景節氣天氣」（store sw7Wx，預設開，管 ① ② ⑤ 和首頁換圖；關掉時風物匣換季只換樹葉與色調）。 */
const SW7_ON=true;
/* 節氣的小點綴（沒在下雨雪的時候）：[效果, 粒子數, 顏色]；fog 第二格 1＝霜降（偏白）；fly＝螢火（只在夜景圖） */
const SW7_AMB={"立春":["petal",8,"#f6e1e6"],"春分":["petal",12,"#f2b4bf"],"立夏":["fluff",9],"夏至":["fly",9],"小暑":["fly",11],"大暑":["fly",13],
  "立秋":["leaf",6,"#b29a3e"],"處暑":["leaf",8,"#c08a34"],"白露":["fog",0],"秋分":["leaf",12,"#c8642c"],"寒露":["leaf",10,"#b5512a"],"霜降":["fog",1],"立冬":["leaf",8,"#8f5a2e"]};
/* 節氣 → 這一天會下雨、下雪的機率 [雨, 雪]（以江南水鄉為準，地點再乘 sw7RgMul） */
const SW7_PREC={"小寒":[.15,.35],"大寒":[.15,.4],"立春":[.3,.15],"雨水":[.5,.06],"驚蟄":[.5,0],"春分":[.45,0],"清明":[.6,0],"穀雨":[.55,0],"立夏":[.45,0],"小滿":[.5,0],"芒種":[.6,0],"夏至":[.55,0],
  "小暑":[.4,0],"大暑":[.35,0],"立秋":[.35,0],"處暑":[.3,0],"白露":[.25,0],"秋分":[.25,0],"寒露":[.2,0],"霜降":[.15,0],"立冬":[.2,.03],"小雪":[.2,.25],"大雪":[.12,.45],"冬至":[.12,.4]};
const SW7_SPRING=new Set(["立春","雨水","驚蟄","春分","清明","穀雨"]),SW7_SUMMER=new Set(["立夏","小滿","芒種","夏至","小暑","大暑"]),SW7_WINTER=new Set(["立冬","小雪","大雪","冬至","小寒","大寒"]);
/* 地點 → [雨的倍數, 雪的倍數]。s＝江南與長江水鄉（棋鎮、三國赤壁、南北朝、隋揚州、宋臨安、明徽州、清揚州）；n＝北方（秦咸陽、魏晉竹林、唐長安、五代：春天少雨、冬天多雪）；
   nw＝西域大漠（漢）；st＝草原（元）；cl＝雲河（星槎、船艙）；south＝嶺南、閩台、南海（不下雪；目前沒有這種頁，留給以後） */
function sw7RgMul(rg,t){const sp=SW7_SPRING.has(t),su=SW7_SUMMER.has(t),wi=SW7_WINTER.has(t);
  if(rg==="n")return[sp?.35:su?.8:wi?.3:.6,wi?1.25:1];if(rg==="nw")return[.15,.6];if(rg==="st")return[su?.7:.35,1];if(rg==="south")return[wi?.6:1.1,0];if(rg==="s")return[1,.7];return[1,.8]}
const SW7={L:new Set(),raf:0,last:0,q:0,io:null,ro:null,tm:0,ann:false,leaf:new Map()};
const sw7RM=()=>{try{return matchMedia("(prefers-reduced-motion: reduce)").matches}catch(e){return false}};
const sw7On=()=>SW7_ON&&store.get("sw7Wx",true)!==false;
function sw7Term(d){try{return typeof tdTerm==="function"?tdTerm(d):""}catch(e){return""}}
function sw7TdHas(t){try{return typeof tdWeather==="function"&&typeof TODAY_MAP_ON!=="undefined"&&TODAY_MAP_ON&&!!tdWeather(t)}catch(e){return false}}
const sw7Day=d=>`${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
function sw7Hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function sw7Rng(a){return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
/* 今天這個地點下不下雨雪：用「日期＋地點」當種子，同一天全 App 一樣、怎麼重開都一樣；一天分 6 段（每 4 小時），下雨天裡約六成的時段在下。回傳 {t:"rain"|"snow",a:0.55～1 濃淡} 或 null */
function sw7Precip(t,rg,d){d=d||new Date();const B=SW7_PREC[t];if(!B)return null;const[mr,ms]=sw7RgMul(rg,t),pr=B[0]*mr,ps=B[1]*ms,R=sw7Rng(sw7Hash(sw7Day(d)+"|"+rg)),r=R(),ty=r<ps?"snow":r<ps+pr?"rain":"";
  const W=[];for(let i=0;i<6;i++)W.push(R()<.62);if(!W.some(Boolean))W[Math.floor(R()*6)]=true;const a=.55+R()*.45;
  return ty&&W[Math.floor(d.getHours()/4)]?{t:ty,a}:null}
/* 卯辰（5～9 點）青、酉（17～19 點）暖；a＝0～1 的強度 */
function sw7Tint(d){d=d||new Date();const h=d.getHours()+d.getMinutes()/60;
  if(h>=5&&h<9)return{c:"dawn",a:h<6?h-5:h<7.5?1:(9-h)/1.5};
  if(h>=17&&h<19)return{c:"dusk",a:h<18?.3+(h-17)*.7:h<18.7?1:(19-h)/.3};
  return null}
function sw7Css(){if(document.getElementById("sw7Css"))return;const s=document.createElement("style");s.id="sw7Css";s.textContent=`.sw7-card{display:grid;gap:6px;margin:6px auto 0;max-width:300px;text-align:left}.sw7-card>div{display:grid;grid-template-columns:4.2em 1fr;gap:8px;align-items:baseline}.sw7-card span{color:var(--muted);font-size:13px}.sw7-card b{font-weight:700;white-space:nowrap}
#title .sw7-hd{display:block;margin:1px 0 0;padding:0;border:0;background:none;color:inherit;opacity:.82;font:600 11.5px/1.3 var(--serif,serif);letter-spacing:.02em;text-align:left;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}#title:has(.sw7-hd){line-height:1.15}

.sw7-fx{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;overflow:hidden}.sw7-fx *{pointer-events:none}
.sw7-cv,.sw7-leaf{position:absolute;left:0;top:0;width:100%;height:100%}.sw7-fogw,.sw7-fg{position:absolute;inset:0;overflow:hidden}
.sw7-fg>b,.sw7-fg>canvas{position:absolute;left:0;top:0;width:100%;height:100%;display:block;background:0 0/100% 100% no-repeat}
.sw7-tint{position:absolute;inset:0;mix-blend-mode:multiply;transition:opacity 2s}
.sw7-night{position:absolute;inset:0;transition:opacity 2s;background:linear-gradient(180deg,rgba(12,18,52,.62) 0%,rgba(16,24,58,.52) 45%,rgba(10,14,40,.6) 100%)}   /* 11/9 iPhone 上 multiply 混色沒作用，不透明的藍整片蓋住圖；改成半透明深藍、不靠混色 */
.sw7-cl{position:absolute;left:0;width:200%;background-image:var(--sw7cl);background-repeat:repeat-x;background-size:50% 100%;will-change:transform;animation:sw7cl 110s linear infinite}
.sw7-cl.a{top:60%;height:44%;opacity:.5}.sw7-cl.b{top:74%;height:30%;opacity:.38;animation-duration:70s}.sw7-cl.c{top:-6%;height:24%;opacity:.28;animation-duration:150s}
.sw7-cl.nt{filter:brightness(.5) saturate(.7)}
.sw7-cl.c.k-learn{top:8%;height:20%;opacity:.62}   /* hspx 11/10：藏譜石窟的山頭畫到一半就淡進天空，用一條雲帶包住山頂 */
@keyframes sw7cl{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@media (prefers-reduced-motion:reduce){.sw7-cl{animation:none}}
.sw7-moon{position:absolute;inset:0;transition:opacity 2s;background:radial-gradient(30% 16% at 80% 9%,rgba(200,210,240,.28),rgba(200,210,240,0) 70%)}
.sw7-tint.dawn{background:linear-gradient(180deg,rgba(112,166,196,.24),rgba(140,186,198,.14) 55%,rgba(160,196,204,.1))}
.sw7-tint.dusk{background:linear-gradient(200deg,rgba(255,150,72,.26),rgba(255,176,104,.15) 55%,rgba(226,146,108,.1))}
.sw7-mist{position:absolute;inset:0;transition:opacity 3s}
.sw7-mist.rain{background:linear-gradient(180deg,rgba(206,208,210,.3),rgba(214,215,214,.2) 60%,rgba(220,220,216,.16))}.sw7-mist.rain.nt{background:linear-gradient(180deg,rgba(60,66,78,.24),rgba(60,66,78,.14))}
.sw7-mist.snow{background:linear-gradient(180deg,rgba(214,226,242,.26),rgba(226,232,240,.12));mix-blend-mode:normal}.sw7-mist.snow.nt{background:linear-gradient(180deg,rgba(150,170,205,.16),rgba(150,170,205,.08))}
.sw7-fog{position:absolute;inset:-6% -30%;opacity:.8;background:radial-gradient(60% 16% at 28% 60%,rgba(238,240,242,.5),rgba(238,240,242,0) 70%),radial-gradient(52% 12% at 76% 76%,rgba(238,240,242,.44),rgba(238,240,242,0) 70%),radial-gradient(75% 18% at 50% 93%,rgba(242,242,242,.5),rgba(242,242,242,0) 70%);animation:sw7Fog 80s ease-in-out infinite alternate}
.sw7-fog.frost{background:radial-gradient(70% 14% at 40% 20%,rgba(232,240,248,.34),rgba(232,240,248,0) 70%),radial-gradient(60% 16% at 28% 60%,rgba(236,242,250,.54),rgba(236,242,250,0) 70%),radial-gradient(52% 12% at 76% 76%,rgba(236,242,250,.48),rgba(236,242,250,0) 70%),radial-gradient(75% 18% at 50% 93%,rgba(240,244,250,.56),rgba(240,244,250,0) 70%)}
.sw7-fog.nt{opacity:.5;filter:brightness(.78) saturate(.6)}.sw7-fog.still{animation:none}
@keyframes sw7Fog{from{transform:translateX(-7%)}to{transform:translateX(7%)}}
.travel .tcap .sw7-qq{margin:8px auto 6px;max-width:30em;padding:4px 10px;border-radius:8px;background:rgba(240,232,214,.62);animation:sw7In .7s .35s ease-out both}.travel.qq.qqhold .tcap .sw7-qq{background:rgba(0,0,0,.35)}
.travel .tcap .sw7-q1{font:800 16px/1.5 var(--serif,serif);letter-spacing:.08em}
.travel .tcap .sw7-q2{font-size:12.5px;line-height:1.5;opacity:.86;margin-top:2px}
@keyframes sw7In{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.sw7-age{border:0;background:none;color:inherit;font:inherit;padding:0;cursor:pointer;text-decoration:underline dotted rgba(255,255,255,.6);text-underline-offset:3px}
.me-born2 .sw7-age{display:block;margin:0 auto}.me-born2.sw7-b2{line-height:1.6}
.modal.sw7-ann .box{background:#f6efdf;color:#2a1f15;border:1px solid rgba(90,60,30,.25)}.modal.sw7-ann .em{font-size:46px}.modal.sw7-ann p{line-height:1.8;margin:8px 0}.modal.sw7-ann .muted{color:#6b5a46;font-size:13.5px}
.sw7-tone{position:absolute;inset:0}.sw7-tone.sp{background:rgba(255,226,236,.12)}.sw7-tone.su{background:rgba(214,236,204,.1)}
.sw7-tone.au{background:linear-gradient(rgba(255,196,120,.18),rgba(230,160,90,.12));mix-blend-mode:multiply}.sw7-tone.wi{background:linear-gradient(rgba(220,232,248,.3),rgba(232,238,246,.16))}
.sw7-box{position:absolute;z-index:4;width:10%;aspect-ratio:560/570;transform:translate(-50%,-100%);border:0;padding:0;margin:0;background:none;cursor:pointer;pointer-events:auto;filter:drop-shadow(0 2px 2px rgba(0,0,0,.45))}
.sw7-box img{width:100%;height:100%;display:block;pointer-events:none}.sw7-box:active{transform:translate(-50%,-100%) scale(.94)}
.sw7-box.tok::after{content:"";position:absolute;right:-3px;top:-3px;width:9px;height:9px;border-radius:50%;background:#c0392b;box-shadow:0 0 0 2px #fff}
.sw7-now{position:absolute;z-index:5;right:3%;top:74px;width:38px;height:38px;border:2px solid #b23a26;border-radius:4px;background:rgba(255,242,232,.88);color:#b23a26;font:900 13px/1.1 var(--serif,serif);transform:rotate(-6deg);cursor:pointer;pointer-events:auto;padding:0}
.sw7-bxs{position:fixed;inset:0;z-index:950;background:rgba(20,14,8,.25);opacity:0;transition:opacity .2s}.sw7-bxs.open{opacity:1}
.sw7-bxp{position:fixed;left:12px;right:12px;max-width:420px;margin:0 auto;top:calc(var(--xqT,56px) + 8px);max-height:calc(100vh - var(--xqT,56px) - var(--xqB,64px) - 16px);overflow:auto;z-index:951;background:#f6efdf;color:#2a1f15;border:1px solid rgba(90,60,30,.3);border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.4);padding:10px 14px 14px;opacity:0;transform:translateY(12px);transition:opacity .2s,transform .2s}
.sw7-bxp.open{opacity:1;transform:none}.sw7-bxh{display:flex;align-items:center;justify-content:space-between;gap:8px}.sw7-bxh b{font:800 16px/1.4 var(--serif,serif)}
.sw7-bxx{border:0;background:none;font-size:18px;color:#6b5a46;padding:4px 6px;cursor:pointer}
.sw7-bxi{position:relative;width:min(100%,300px);margin:6px auto}.sw7-bxi>img{width:100%;display:block}
.sw7-cell{position:absolute;border:0;padding:0;margin:0;background:none;cursor:pointer;border-radius:3px}.sw7-cell i{position:absolute;inset:0;display:none;border-radius:2px}
.sw7-cell:not(.has) i{display:block;background:#efe9db url(${SW7_BOX_IMG}) no-repeat;background-size:var(--bw) auto;background-position:var(--bx) var(--by);filter:grayscale(1) contrast(.5) brightness(1.18);opacity:.92}
.sw7-cell em{position:absolute;left:6px;top:4px;font:800 13px/1 var(--serif,serif);font-style:normal;color:#8a7a66}.sw7-cell.has:active{box-shadow:inset 0 0 0 3px rgba(201,162,74,.7)}
.sw7-cell.cur{box-shadow:inset 0 0 0 3px #c9a24a}
.sw7-bxt{font-size:13.5px;line-height:1.7;margin:6px 0 2px}.sw7-bxt.hint{color:#8a3a20}.sw7-bxw{font-size:12.5px;color:#6b5a46;margin:2px 0 8px}
.sw7-poem{border-top:1px dashed rgba(90,60,30,.35);padding:8px 2px 4px;margin-top:4px}.sw7-poem b{display:block;font:800 16px/1.6 var(--serif,serif)}.sw7-poem small{display:block;color:#6b5a46;font-size:12px}.sw7-poem span{display:block;font-size:13px;line-height:1.6;margin-top:2px}
.sw7-bxback{width:100%;margin-top:6px}.sw7-bxok{display:flex;gap:8px;margin-top:6px}.sw7-bxok .btn{flex:1;margin:0}
.sw7-plain{display:block;font-size:12.5px;color:#6b5a46;margin-top:4px;line-height:1.6}
@media (prefers-reduced-motion:reduce){.sw7-bxs,.sw7-bxp{transition:none}.sw7-fog{animation:none}.travel .tcap .sw7-qq{animation:none}.sw7-tint,.sw7-mist{transition:none}}`;document.head.append(s)}

/* ---------- ① 各頁的戶外範圍、前景、落葉樹（開發者 11/9 選定 Gemini 44 號的 B＋C）----------
   照圖檔網址比對（先比對到的算數，沒列到的頁一律當室內）。座標都是原圖像素（768×1376；星槎主圖 896×1200 用 W、H 註明）。
   m：out 全戶外（整張下）／semi 半戶外（只在 sky 多邊形裡下）／in 室內、古戰場（不下）；rg：地點（sw7RgMul）；
   fg：前景（屋簷、柱子、欄杆、近景的樹）——從同一張底圖用 clip-path 切一份（背景圖，不是 <img>，免得 07k 墨韻又掛一次）疊在雨雪上面，雨雪就像下在它們後面；
   tr：落葉樹的樹冠（柳、槐、闊葉樹；松柏竹不圈），節氣變色只改這裡面偏綠的像素。量法與檢查圖：scratchpad t811／genpages.py */
const SW7_PAGES=[
  {k:"home",re:/data\/homemap\/home\.webp/,m:"out",rg:"s",fg:[[[300,60],[400,20],[520,0],[768,0],[768,387],[720,387],[700,200],[640,153],[560,140],[467,127],[387,107]]],tr:[[[80,960],[149,935],[229,949],[261,1009],[249,1089],[200,1109],[109,1120],[69,1060]],[[527,940],[600,915],[689,935],[709,1000],[689,1085],[600,1095],[540,1060]],[[693,1260],[768,1240],[768,1376],[693,1376]],[[261,261],[300,257],[305,309],[265,312]]]},
  {k:"homeAlt",re:/data\/homemap\/home_(snow|rain|spring|summer|autumn|winter|[a-z]+_(spring|summer|autumn|winter))/,m:"out",rg:"s"},
  {k:"today",re:/data\/todaymap\/today_day/,m:"out",rg:"s",tr:[[[0,120],[60,109],[140,149],[149,249],[120,329],[0,340]],[[215,149],[289,125],[360,160],[365,249],[220,255]],[[400,160],[469,128],[549,149],[549,245],[400,249]]]},
  {k:"todayN",re:/data\/todaymap\//,m:"out",rg:"s"},
  {k:"learn",re:/data\/hubmap\/learn/,m:"semi",rg:"s",sky:[[[0,0],[768,0],[768,300],[560,300],[480,331],[300,320],[180,331],[0,291]],[[131,720],[627,720],[660,800],[651,1000],[560,963],[380,949],[213,965],[140,1000],[115,800]]]},
  {k:"battle",re:/data\/hubmap\/battle/,m:"semi",rg:"s",sky:[[[0,0],[768,0],[768,253],[693,253],[587,200],[507,160],[400,160],[400,200],[0,240]],[[213,633],[547,633],[560,667],[747,667],[747,760],[440,853],[440,920],[320,933],[267,800],[200,693]],[[533,1133],[693,1107],[768,1147],[768,1376],[560,1376]]],fg:[[[440,816],[627,787],[696,803],[700,867],[627,927],[507,933],[447,880]]]},
  {k:"lobby",re:/data\/lobbymap\/lobby(_[a-z]+)*\.webp/,m:"semi",rg:"s",sky:[[[47,51],[720,51],[627,167],[627,640],[707,747],[753,1040],[753,1227],[13,1227],[53,747],[147,627],[147,167]]],fg:[[[0,0],[768,0],[768,53],[0,53]],[[0,1220],[768,1220],[768,1280],[0,1280]],[[200,1187],[273,1187],[273,1376],[200,1376]],[[493,1187],[573,1187],[573,1376],[493,1376]]]},
  {k:"canju",re:/data\/canjumap\//,m:"semi",rg:"s",sky:[[[0,0],[187,0],[187,247],[0,260]],[[267,0],[768,0],[768,313],[267,240]]],fg:[[[187,0],[267,0],[267,400],[187,400]]]},
  {k:"terms",re:/data\/termsmap\//,m:"semi",rg:"s",sky:[[[0,0],[768,0],[768,1376],[0,1376]]]},
  {k:"redo",re:/data\/redomap\/redo_/,m:"semi",rg:"s",sky:[[[77,53],[731,144],[731,920],[80,813]]],fg:[[[60,633],[731,853],[731,891],[60,667]],[[80,713],[731,920],[731,945],[80,740]],[[60,640],[95,640],[95,811],[60,811]],[[296,700],[320,700],[320,793],[296,793]],[[516,760],[540,760],[540,860],[516,860]],[[0,53],[731,127],[731,153],[0,80]]],tr:[[[80,140],[149,100],[260,105],[360,100],[409,160],[400,300],[300,300],[149,305],[80,289]],[[425,140],[529,140],[529,189],[425,189]]]},
  {k:"theme",re:/data\/thememap\//,m:"semi",rg:"s",sky:[[[0,267],[80,333],[213,467],[300,560],[300,747],[213,773],[120,853],[53,907],[0,920]],[[768,267],[688,333],[555,467],[468,560],[468,747],[555,773],[648,853],[715,907],[768,920]]],fg:[[[44,400],[73,173],[127,173],[133,447],[133,867],[127,1053],[80,1053],[44,907]],[[197,333],[247,333],[247,880],[197,880]],[[267,440],[301,440],[301,800],[267,800]],[[637,173],[696,173],[731,400],[731,907],[696,1053],[651,1053],[637,873]],[[523,333],[573,333],[573,880],[523,880]],[[469,440],[501,440],[501,800],[469,800]]]},
  {k:"shipMap",re:/data\/shipmap\/ship_map/,m:"out",rg:"cl",W:896,H:1200},
  {k:"shipDeck",re:/data\/shipmap\/page_(sail|lesson)/,m:"out",rg:"cl"},
  {k:"portClassic",re:/data\/shipmap\/port_classic/,m:"out",rg:"cl"},
  {k:"port_qin",re:/data\/shipmap\/port_qin(_c|_f)?\.webp/,m:"out",rg:"n"},
  {k:"port_han",re:/data\/shipmap\/port_han(_c|_f)?\.webp/,m:"out",rg:"nw"},
  {k:"port_sanguo",re:/data\/shipmap\/port_sanguo(_c|_f)?\.webp/,m:"out",rg:"s"},
  {k:"port_weijin",re:/data\/shipmap\/port_weijin(_c|_f)?\.webp/,m:"out",rg:"n"},
  {k:"port_nanbei",re:/data\/shipmap\/port_nanbei(_c|_f)?\.webp/,m:"out",rg:"s"},
  {k:"port_sui",re:/data\/shipmap\/port_sui(_c|_f)?\.webp/,m:"out",rg:"s"},
  {k:"port_tang",re:/data\/shipmap\/port_tang(_c|_f)?\.webp/,m:"out",rg:"n",tr:[[[538,246],[555,238],[590,235],[620,240],[650,236],[690,240],[702,250],[690,257],[600,257],[540,257]]]},
  {k:"port_wudai",re:/data\/shipmap\/port_wudai(_c|_f)?\.webp/,m:"out",rg:"n"},
  {k:"port_song",re:/data\/shipmap\/port_song(_c|_f)?\.webp/,m:"out",rg:"s",tr:[[[0,440],[60,428],[130,440],[200,465],[250,515],[300,575],[312,640],[275,685],[180,692],[100,692],[50,705],[0,720]],[[0,305],[40,298],[90,302],[140,315],[140,345],[70,348],[0,345]],[[395,312],[430,302],[470,305],[500,318],[500,345],[395,345]]]},
  {k:"port_yuan",re:/data\/shipmap\/port_yuan(_c|_f)?\.webp/,m:"out",rg:"st",tr:[[[110,665],[140,655],[160,635],[195,625],[245,635],[252,660],[262,712],[255,735],[230,728],[195,742],[150,746],[110,727],[100,695]]]},
  {k:"port_ming",re:/data\/shipmap\/port_ming(_c|_f)?\.webp/,m:"out",rg:"s",tr:[[[198,490],[220,482],[250,492],[258,520],[255,550],[225,556],[200,552],[195,520]],[[362,372],[390,362],[420,365],[442,380],[440,402],[400,405],[362,400]],[[588,382],[620,372],[655,375],[672,388],[668,405],[590,405]]]},
  {k:"port_qing",re:/data\/shipmap\/port_qing(_c|_f)?\.webp/,m:"out",rg:"s",tr:[[[0,600],[30,560],[90,520],[110,495],[180,490],[230,510],[270,560],[310,570],[345,600],[350,640],[320,690],[250,700],[180,692],[120,700],[40,700],[0,690]],[[690,445],[730,430],[768,440],[768,610],[722,612],[700,560],[704,520],[680,490]],[[0,185],[30,175],[60,182],[76,200],[76,250],[40,262],[0,262]],[[200,215],[215,195],[250,190],[280,200],[320,205],[335,225],[320,242],[250,250],[240,258],[200,256]]]},
  {k:"yz_qin",re:/data\/yizhan\/qin(_c|_f)?\.webp/,m:"out",rg:"n"},
  {k:"yz_han",re:/data\/yizhan\/han(_c|_f)?\.webp/,m:"out",rg:"nw"},
  {k:"yz_sanguo",re:/data\/yizhan\/sanguo(_c|_f)?\.webp/,m:"out",rg:"s"},
  {k:"yz_weijin",re:/data\/yizhan\/weijin(_c|_f)?\.webp/,m:"out",rg:"n"},
  {k:"yz_nanbei",re:/data\/yizhan\/nanbei(_c|_f)?\.webp/,m:"out",rg:"s"},
  {k:"yz_sui",re:/data\/yizhan\/sui(_c|_f)?\.webp/,m:"out",rg:"s",tr:[[[0,420],[35,362],[95,390],[115,333],[150,345],[170,385],[235,405],[262,465],[250,560],[235,615],[195,600],[145,480],[95,485],[45,682],[0,672]]]},
  {k:"yz_tang",re:/data\/yizhan\/tang(_c|_f)?\.webp/,m:"out",rg:"n",tr:[[[0,415],[30,385],[65,370],[120,395],[185,420],[240,500],[275,565],[250,605],[185,615],[140,560],[60,560],[25,640],[0,640]],[[712,372],[735,350],[755,343],[768,343],[768,410],[745,415],[712,405]]]},
  {k:"yz_wudai",re:/data\/yizhan\/wudai(_c|_f)?\.webp/,m:"out",rg:"n"},
  {k:"yz_song",re:/data\/yizhan\/song(_c|_f)?\.webp/,m:"out",rg:"s",tr:[[[0,455],[25,425],[60,430],[100,405],[130,400],[160,440],[172,480],[200,490],[215,540],[210,600],[170,640],[155,700],[120,665],[60,670],[0,655]],[[222,558],[232,545],[250,540],[258,555],[255,590],[225,590]],[[732,470],[745,455],[768,455],[768,515],[735,515]]]},
  {k:"yz_yuan",re:/data\/yizhan\/yuan(_c|_f)?\.webp/,m:"out",rg:"st"},
  {k:"yz_ming",re:/data\/yizhan\/ming(_c|_f)?\.webp/,m:"out",rg:"s",tr:[[[200,505],[215,492],[235,495],[248,510],[245,545],[205,545]]]},
  {k:"yz_qing",re:/data\/yizhan\/qing(_c|_f)?\.webp/,m:"out",rg:"s",tr:[[[0,380],[30,345],[90,322],[150,298],[180,310],[220,365],[270,410],[292,470],[282,570],[255,650],[205,665],[155,560],[90,520],[30,600],[15,680],[0,680]],[[600,400],[625,370],[660,345],[700,335],[730,330],[768,320],[768,500],[740,470],[720,420],[690,405],[640,410]]]},
  {k:"yz_classic",re:/data\/yizhan\/classic(_c|_f)?\.webp/,m:"out",rg:"cl"},
  {k:"indoor",re:/data\/(campmap|gmmap|cupmap|exammap|openmap|libmap|setmap|feedback|statmap|shipmap\/page_(bag|shelf|canju))\/?/,m:"in"}];
function sw7Page(src){for(const o of SW7_PAGES)if(o.re.test(src))return o;return null}
/* 這一頁現在是哪個節氣：預設跟手機的真實日期（07y5 tdTerm）。星槎的新世界觀若讓各朝渡口、驛站改用自己的「歷史時間」，在這裡按頁（P、o.k）覆寫就好，天氣、四季變色都問它 */
function sw7TermFor(P,o){return P&&P.dataset&&P.dataset.sw7Term||sw7Term()}   /* ⑥ 四時風物匣點了某一季＝這一頁 data-sw7-term 暫時覆寫，離開這頁就沒了 */
/* 11/10 開發者「同一個朝代某個場景下雨，其他場景也要統一下雨」：棋鎮各頁（首頁、書院、茶坊、天井…）原本固定算南方 "s"，渡口、驛站照那一朝自己的地區算，停在唐、五代時會一邊下一邊晴；
   停靠某一朝時，棋鎮各頁改用那一朝渡口的地區，同一天同一時段的雨雪就一致（沒停靠照舊 "s"） */
const SW7_TOWN=/^(home|homeAlt|today|todayN|learn|battle|lobby|canju|terms|redo|theme|shipMap|shipDeck)$/;   /* 回饋 858（開發者 11/10）「兩邊場景的天氣不同」：星槎航線圖、甲板也跟著停靠那一朝渡口的天氣（停在船艙＝雲河自己的天氣） */
function sw7Rg(o){if(!o||!o.rg)return"";if(!SW7_TOWN.test(o.k||""))return o.rg;let e="";try{e=typeof hbDockEra==="function"?hbDockEra():""}catch(x){}const q=e&&SW7_PAGES.find(x=>x.k==="port_"+e);return q&&q.rg||o.rg}
function sw7WxFor(P,o){if(!o||o.m==="in"||!o.rg)return null;return sw7Precip(sw7TermFor(P,o),sw7Rg(o))}
/* 首頁換底圖（07z-homemap.js 問這裡）：大雪節氣那幾天、或小雪～大寒正在下雪＝積雪版 snow；正在下雨＝雨景版 rain；其他＝""（原圖）；設定關掉也是 "" */
const SW7_SNOWY=new Set(["小雪","大雪","冬至","小寒","大寒"]);
/* 開發者 11/9「首頁變秋天的時候還是綠色的葉子，冬天也不會變，要符合天氣和大自然」：首頁照季節換整張圖（同一張原圖改的，構圖、入口、走路的路都不變）——
   春（立春～穀雨）＝home_spring（柳樹嫩黃綠、桃花杏花、盆栽牡丹；設定關掉「場景節氣天氣」才用原圖）；夏（立夏～處暑，立秋、處暑柳樹還綠）＝home_summer（柳濃綠、岸邊荷花）；
   秋（白露～立冬）＝home_autumn（柳葉轉黃、蘆花、遠山赭紅、書院旁闊葉樹黃紅，松竹照舊綠）；冬（小雪～大寒）＝home_winter（柳枝光禿、枯草、松竹常青）。
   下雪照舊換 home_snow；雨景圖 home_rain 的柳樹是春天的綠，只在春夏用，秋冬下雨就用那一季的圖、雨由程式畫。季節圖不再做 ⑤ 的換色（已經畫好了） */
const SW7_HSEA={"立春":"spring","雨水":"spring","驚蟄":"spring","春分":"spring","清明":"spring","穀雨":"spring","立夏":"summer","小滿":"summer","芒種":"summer","夏至":"summer","小暑":"summer","大暑":"summer","立秋":"summer","處暑":"summer",
  "白露":"autumn","秋分":"autumn","寒露":"autumn","霜降":"autumn","立冬":"autumn","小雪":"winter","大雪":"winter","冬至":"winter","小寒":"winter","大寒":"winter"};
/* ---------- 開發者 11/9「轉換季節的時候要有轉折感，讓玩家有『哇，換季了』的體驗」：首頁換季轉場 ----------
   這一季（SW7_HSEA，春夏秋冬，跟天氣無關）跟上次在首頁看到的季節（store hmSea）不一樣，就在新的季節圖載好時播一次（每季一次）：
   ① 先蓋一張上一季的圖；② 從橋上石桌那裡往外，新季節像墨在宣紙上暈開一樣一圈圈露出來（約 2.8 秒）；
   ③ 同時飄這一季的東西（春桃花瓣、夏荷花瓣、秋黃紅落葉、冬細霜）；④ 上方一張宣紙小籤：一句古詩文（附出處；開發者 11/9 拿掉白話）；⑤ 小帥說一句。
   開頭畫面、載入畫面還蓋著就等它們關掉再播。第一次裝 App（還沒選角色）只記下季節、不播；以前看過首頁的人，上一季算春（舊版首頁就是春景）。
   「減少動態」：不暈開、不飄，只淡入淡出＋小籤。設定關掉「場景節氣天氣」時不換季節圖，也就不播 */
const SW7_SEA_TXT={spring:{e:"🌸",n:"春天來了",q:"竹外桃花三兩枝，春江水暖鴨先知。",s:"蘇軾〈惠崇春江晚景〉",w:"竹林外開了幾枝桃花，春天的江水變暖和了。",say:"哇，換季了！桃花開了，柳樹也冒出嫩芽了！",p:["#f4b6c2","#f9d3dc","#fbe7ec"]},
  summer:{e:"🪷",n:"夏天到了",q:"接天蓮葉無窮碧，映日荷花別樣紅。",s:"楊萬里〈曉出淨慈寺送林子方〉",w:"荷葉綠到天邊，太陽照著荷花，紅得特別好看。",say:"哇，夏天了！橋下開了荷花，柳樹好綠喔！",p:["#f6c9d4","#fbe2e8","#cfe6c3"]},
  autumn:{e:"🍂",n:"秋天到了",q:"見一葉落，而知歲之將暮。",s:"《淮南子・說山訓》",w:"看到一片葉子落下來，就知道這一年快要過完了。",say:"哇，換季了！柳樹都變黃了，葉子掉到河裡了！",p:["#d9a441","#c8642c","#e8c25a","#a8462a"]},
  winter:{e:"❄",n:"冬天到了",q:"歲寒，然後知松柏之後彫也。",s:"《論語・子罕》",w:"天氣最冷的時候，才看得出松樹柏樹最晚凋零。",say:"哇，冬天了！柳樹的葉子都掉光了，只有松樹還是綠的。",p:["#ffffff","#eef3f8","#dfe8f1"]}};
function sw7SeaNow(){try{const o=SW7_PAGES.find(x=>x.k==="home");return SW7_HSEA[sw7TermFor(null,o)]||"spring"}catch(e){return""}}
function sw7SeaCss(){if(document.getElementById("sw7SeaCss"))return;const s=document.createElement("style");s.id="sw7SeaCss";s.textContent=`
.sw7-turn{position:absolute;left:0;top:0;width:100%;height:auto;display:block;pointer-events:none;z-index:2}
.sw7-pt{position:absolute;top:-4%;pointer-events:none;z-index:3;opacity:0;animation:sw7Fall var(--d,3.6s) ease-in var(--dl,0s) forwards}
.sw7-pt.leaf{width:12px;height:7px;border-radius:70% 0 70% 0}.sw7-pt.petal{width:9px;height:7px;border-radius:60% 60% 60% 10%}.sw7-pt.frost{width:5px;height:5px;border-radius:50%;box-shadow:0 0 4px rgba(255,255,255,.9)}
@keyframes sw7Fall{0%{opacity:0;transform:translate(0,0) rotate(0)}12%{opacity:.95}85%{opacity:.85}100%{opacity:0;transform:translate(var(--dx,30px),var(--dy,62vh)) rotate(var(--rt,320deg))}}
.sw7-slip{position:absolute;left:50%;top:14%;z-index:320;transform:translate(-50%,-8px);width:84%;max-width:380px;box-sizing:border-box;padding:12px 14px 11px;text-align:center;
  background:#f7f0dc;color:#3a2618;border:1px solid rgba(120,84,40,.35);border-radius:4px;box-shadow:0 6px 22px rgba(40,25,10,.28);opacity:0;transition:opacity .7s,transform .7s;font-family:var(--serif,serif);pointer-events:auto;cursor:pointer}
.sw7-slip.on{opacity:1;transform:translate(-50%,0)}.sw7-slip b{display:block;font-size:20px;letter-spacing:.12em;margin-bottom:6px}.sw7-slip q{display:block;quotes:none;font-size:14.5px;letter-spacing:.02em;font-weight:700;line-height:1.6;color:#5a2a14}
.sw7-slip small{display:block;font-size:11.5px;color:#7a6650;margin:2px 0 6px}.sw7-slip span{display:block;font-size:13px;line-height:1.6;color:#4a3828}
@media (prefers-reduced-motion:reduce){.sw7-pt{display:none}.sw7-slip{transition:opacity .4s}}`;document.head.append(s)}
/* 回傳 true＝這次由轉場負責換圖 */
function sw7SeaTurn(P,im0,newSrc){const sea=sw7SeaNow();if(!sea)return false;let prev=store.get("hmSea",null);
  if(!prev){const old=(()=>{try{return typeof sw7Born==="function"&&sw7Born()>0}catch(e){return false}})();if(!old){store.set("hmSea",sea);return false}prev="spring"}
  if(prev===sea)return false;store.set("hmSea",sea);sw7SeaCss();
  const era=sw7HomeEra(),oldSrc=prev==="spring"&&!era?im0.src:"data/homemap/home_"+(era?era+"_":"")+prev+".webp?v="+(typeof HM_IMGV!=="undefined"?HM_IMGV:"");
  const ov=document.createElement("img");ov.className="sw7-turn";ov.alt="";ov.setAttribute("aria-hidden","true");let started=false;
  const go=()=>{if(started)return;started=true;if(!P.isConnected)return;P.insertBefore(ov,im0.nextSibling);im0.src=newSrc;sw7SeaWait(P,()=>sw7SeaPlay(P,ov,sea))};
  ov.onload=go;ov.onerror=()=>{ov.src=im0.src};setTimeout(go,1500);ov.src=oldSrc;return true}
/* 等開頭畫面（body.xqt-on）、載入畫面（#preov）關掉，畫面在前景才播；等太久（2 分鐘）就直接拿掉舊圖 */
function sw7SeaWait(P,f){const t0=Date.now();const k=()=>{if(!P.isConnected)return;const busy=document.body.classList.contains("xqt-on")||document.getElementById("preov")||document.hidden;
  if(!busy){setTimeout(f,350);return}if(Date.now()-t0>12e4){const o=P.querySelector(".sw7-turn");if(o)o.remove();return}setTimeout(k,400)};k()}
function sw7SeaPlay(P,ov,sea){const T=SW7_SEA_TXT[sea],rm=sw7RM(),D=rm?900:2800,t0=performance.now();
  const step=now=>{if(!ov.isConnected)return;const u=Math.min(1,(now-t0)/D);
    if(rm)ov.style.opacity=String(1-u);else{const e=u<.5?2*u*u:1-Math.pow(-2*u+2,2)/2,r=(e*150).toFixed(1),m=`radial-gradient(circle at 50% 46%,transparent ${r}%,rgba(0,0,0,.55) calc(${r}% + 6%),#000 calc(${r}% + 16%))`;ov.style.webkitMaskImage=m;ov.style.maskImage=m}
    if(u<1)requestAnimationFrame(step);else ov.remove()};requestAnimationFrame(step);
  if(!rm){const kind=sea==="autumn"?"leaf":sea==="winter"?"frost":"petal";for(let i=0;i<26;i++){const d=document.createElement("i");d.className="sw7-pt "+kind;
    d.style.left=(Math.random()*100).toFixed(1)+"%";d.style.background=T.p[i%T.p.length];d.style.setProperty("--d",(3+Math.random()*2.2).toFixed(2)+"s");d.style.setProperty("--dl",(Math.random()*1.6).toFixed(2)+"s");
    d.style.setProperty("--dx",((Math.random()-.5)*120).toFixed(0)+"px");d.style.setProperty("--dy",(40+Math.random()*45).toFixed(0)+"vh");d.style.setProperty("--rt",((Math.random()-.5)*720).toFixed(0)+"deg");P.append(d);setTimeout(()=>d.remove(),7600)}}
  const sl=document.createElement("div");sl.className="sw7-slip";sl.setAttribute("role","status");sl.innerHTML=`<b>${T.e} ${esc(T.n)}</b><q>${esc(T.q)}</q><small>${esc(T.s)}</small>`;   /* 開發者 11/9「拿掉底下的白話文，味道整個變調」：小籤只留古詩文和出處 */
  const off=()=>{sl.classList.remove("on");setTimeout(()=>sl.remove(),800)};sl.onclick=off;P.append(sl);setTimeout(()=>sl.classList.add("on"),rm?100:900);setTimeout(off,rm?6500:8000);
  setTimeout(()=>{try{if(typeof BOT!=="undefined"&&BOT&&BOT.say)BOT.say(T.say,5);else window.dispatchEvent(new CustomEvent("xq-bot-said",{detail:T.say}))}catch(e){}},rm?400:2600)}
/* 開發者 11/9「除了白天和晚上，也會有傍晚的夕陽和日出」：首頁有畫好的季節就換日出、夕陽圖（home_<季>_dawn／_dusk，跟季節圖同構圖）。
   日出 5:00～7:30（卯時）、夕陽 16:30～18:30（酉時前後）；還沒畫的季節照舊用季節圖＋淡淡的晨昏色。換圖時不再疊 ② 的晨昏色（圖本身已經是晨昏） */
/* 有畫好晨昏圖的「朝代_季節」（宋＝只寫季節）。11/9 開發者「繼續做其他朝代春夏冬日出夕陽」：12 朝 × 四季陸續補齊，審過的才加進來 */
const SW7_HTOD=new Set(["spring","summer","autumn","winter",..."qin han sanguo weijin nanbei sui tang wudai yuan ming qing".split(" ").flatMap(e=>["spring","summer","autumn","winter"].map(q=>e+"_"+q))]);   /* 11/9 十二朝四季晨昏 96 張都經史學顧問審過 */
/* 開發者 11/9「首頁也要根據停靠的朝代來區分，畫出不同朝代首頁」：首頁換成星槎停靠那一朝的版本（home_<朝>_<季>，跟宋代原圖同構圖，星槎造型不變）。
   SW7_HERA＝已經畫好四季的朝代；宋、還沒畫好的朝代、還沒登船＝現在這套（宋代江南）。各朝還沒有雨景、雪景、晨昏圖：用那一季的圖，雨雪由程式畫 */
const SW7_HERA={qin:1,han:1,sanguo:1,weijin:1,nanbei:1,sui:1,tang:1,wudai:1,yuan:1,ming:1,qing:1};   /* 11/9 漢朝、其餘十朝四季都經史學顧問核過（宋＝原本這套） */
function sw7HomeEra(){try{const e=typeof shipAt==="function"?shipAt():"";return e&&e!=="song"&&SW7_HERA[e]?e:""}catch(x){return""}}
/* 日出、夕陽的時段照季節（臺灣／江南大約的日出日落：夏天日出 5 點、日落 18:45；冬天日出 6:35、日落 17:15）；季節照首頁用的 SW7_HSEA */
const SW7_TODW={spring:[5.25,7.25,17.25,19],summer:[4.75,6.75,18,19.75],autumn:[5.25,7.5,16.75,18.5],winter:[6,8,16.5,18.25]};
/* 11/9 開發者「已經亥時但還是很亮」：首頁沒有夜景圖，日落後（夕陽時段結束）到日出前，整頁蓋一層月夜的深藍；剛入夜、天快亮時淡一點 */
/* 11/9 開發者「對戰和學習還是亮著」：學習、對戰、線上大廳（露天庭院）也套同一層月夜；棋譜庫在室內不套 */
function sw7HomeNightA(d,sea){d=d||new Date();const h=d.getHours()+d.getMinutes()/60,w=SW7_TODW[sea]||SW7_TODW.autumn;if(h>=w[3])return Math.min(1,.7+(h-w[3])*.6);if(h<w[0])return w[0]-h<.5?.7+(w[0]-h)*.6:1;return 0}
/* 11/10 開發者「其他朝代的夜景也用 Gemini 重畫，後置的夜晚效果不好」：首頁、學習、對戰、天井日落後換畫好的夜景圖（<名>_night），不再整頁蓋月夜深藍；沒換到夜景圖（載不到、雨雪圖、設定關掉）才照舊蓋 */
function sw7NightNow(){try{return sw7HomeNightA(null,sw7SeaNow())>0}catch(e){return false}}
function sw7HomeTod(d,sea){d=d||new Date();const h=d.getHours()+d.getMinutes()/60,w=SW7_TODW[sea]||SW7_TODW.autumn;return h>=w[0]&&h<w[1]?"dawn":h>=w[2]&&h<w[3]?"dusk":""}
function sw7HomeWx(){if(!sw7On())return"";try{const o=SW7_PAGES.find(x=>x.k==="home"),t=sw7TermFor(null,o),p=sw7Precip(t,sw7Rg(o)),sea=SW7_HSEA[t]||"";
  const era=sw7HomeEra(),s2=sea||"spring",td=sw7HomeTod(null,s2),nt=sw7NightNow()?"_night":"";if(typeof hbIsCl==="function"&&hbIsCl())return"classic_"+s2+nt;   /* 11/10 經典世界首頁：只換千秋樹的季節色，晨昏用程式調色、不另外換雨雪圖 */
  if(era){const k=era+"_"+s2;return nt?k+nt:SW7_HTOD.has(k)&&td?k+"_"+td:k}if(nt)return s2+nt;
  if(p&&p.t==="snow"&&SW7_SNOWY.has(t))return"snow";   /* 11/10 原本「大雪」節氣整段都換積雪圖，跟別頁那天沒下雪對不上；改成真的在下雪才換 */if(p&&p.t==="rain"&&(!sea||sea==="spring"||sea==="summer"))return"rain";return sea&&td&&SW7_HTOD.has(sea)?sea+"_"+td:sea}catch(e){}return""}
const sw7PolyCss=(q,IW,IH)=>`polygon(${q.map(([x,y])=>(x/IW*100).toFixed(2)+"% "+(y/IH*100).toFixed(2)+"%").join(",")})`;

/* ---------- ① 雨雪本體：每種效果一組 mk（生一顆）＋ draw（畫一格），要換畫法整組換掉 ----------
   座標是頁面（未縮放）的像素；R.z＝兩指縮放的倍數，大小、速度都除以 R.z，放大時雨絲、雪點在螢幕上一樣大（範圍跟著圖走）。 */
/* 雨：淡墨斜線，三種粗細濃淡；夜景改極淡紙白；不閃、不發光 */
const SW7_RAIN_G=[[.6,.13],[.9,.2],[1.4,.27]];
function sw7RainMk(p){const r=Math.random;p.l=14+r()*16;p.v=560+r()*320;p.g=r()<.45?0:r()<.8?1:2}
function sw7RainDraw(c,R,dt){const z=R.z||1,k=dt/z;
  for(const p of R.A){p.y+=p.v*k;p.x-=p.v*.2*k;if(p.y>R.H+40||p.x<-40)sw7Re(R,p)}
  const ink=R.night?"232,226,210":"38,38,46",m=(.65+.35*(R.amt||1))*(R.run?1:.6);
  SW7_RAIN_G.forEach(([w,a],g)=>{c.lineWidth=w/z;c.strokeStyle=`rgba(${ink},${(a*m*(R.night?1.1:1)).toFixed(3)})`;c.beginPath();
    for(const p of R.A)if(p.g===g){c.moveTo(p.x,p.y);c.lineTo(p.x+p.l*.2/z,p.y-p.l/z)}c.stroke()})}
/* 雪：水墨「彈白」——大小不一的小白點，慢慢落、輕輕橫飄；白天加一圈極淡的墨邊，免得在宣紙上看不見 */
function sw7SnowMk(p){const r=Math.random;p.r=.8+r()*r()*2.4;p.v=22+r()*34;p.d=(r()-.5)*10}
function sw7SnowDraw(c,R,dt,t){const z=R.z||1,k=dt/z;c.beginPath();
  for(const p of R.A){p.y+=p.v*k;p.x+=(p.d+Math.sin(t*.8+p.ph)*7)*k;if(p.y>R.H+10||p.x<-10||p.x>R.W+10)sw7Re(R,p);c.moveTo(p.x+p.r/z,p.y);c.arc(p.x,p.y,p.r/z,0,6.283)}
  if(!R.night){c.lineWidth=.6/z;c.strokeStyle="rgba(70,70,82,.16)";c.stroke()}c.fillStyle=R.night?"rgba(240,240,236,.82)":"rgba(252,250,244,.92)";c.fill()}
function sw7FluffMk(p,W,H,s,init){p.r=1.1+Math.random()*1.3;p.vy=(-2+Math.random()*7)*s;p.vx=7+Math.random()*11;if(!init){p.x=-8;p.y=Math.random()*H}}
function sw7FluffDraw(c,R,dt,t){const z=R.z||1;c.beginPath();for(const p of R.A){p.x+=(p.vx+Math.sin(t*.7+p.ph)*6)*dt/z;p.y+=(p.vy+Math.cos(t*.5+p.ph)*5)*dt/z;if(p.x>R.W+10||p.y<-10||p.y>R.H+10)sw7Re(R,p);c.moveTo(p.x+p.r/z,p.y);c.arc(p.x,p.y,p.r/z,0,6.283)}
  c.lineWidth=.8/z;c.strokeStyle=R.night?"rgba(30,36,50,.2)":"rgba(80,90,110,.2)";c.stroke();c.fillStyle="rgba(255,255,255,.7)";c.fill()}
function sw7FallMk(p,W,H,s){p.r=p.k==="leaf"?3+Math.random()*1.8:2.2+Math.random()*1.2;p.vy=(20+Math.random()*22)*s;p.vx=-10-Math.random()*16;p.rot=Math.random()*6.283;p.vr=(Math.random()-.5)*2.6}
function sw7FallDraw(c,R,dt,t){const z=R.z||1;c.fillStyle=R.col||"#f2b4bf";c.globalAlpha=R.night?.5:R.k==="leaf"?.82:.86;
  for(const p of R.A){p.y+=p.vy*dt/z;p.x+=(p.vx+Math.sin(t*1.1+p.ph)*14)*dt/z;p.rot+=p.vr*dt;if(p.y>R.H+10||p.x<-12)sw7Re(R,p);
    c.save();c.translate(p.x,p.y);c.rotate(p.rot);c.scale(1/z,(.3+.7*Math.abs(Math.cos(t*1.6+p.ph)))/z);c.beginPath();c.ellipse(0,0,p.r*1.5,p.r,0,0,6.283);c.fill();c.restore()}
  c.globalAlpha=1}
function sw7FlyMk(p,W,H){p.x=Math.random()*W;p.y=H*(.4+Math.random()*.55);p.vx=(Math.random()-.5)*10;p.vy=(Math.random()-.5)*6}
function sw7FlyDraw(c,R,dt,t){for(const p of R.A){p.vx=Math.max(-12,Math.min(12,p.vx+(Math.random()-.5)*24*dt));p.vy=Math.max(-8,Math.min(8,p.vy+(Math.random()-.5)*16*dt));p.x+=p.vx*dt;p.y+=p.vy*dt;
    if(p.x<0||p.x>R.W)p.vx*=-1;if(p.y<R.H*.35||p.y>R.H)p.vy*=-1;const a=Math.sin(t*1.3+p.ph);if(a<.06)continue;
    const g=c.createRadialGradient(p.x,p.y,0,p.x,p.y,6);g.addColorStop(0,`rgba(232,255,150,${(.85*a).toFixed(2)})`);g.addColorStop(1,"rgba(200,255,120,0)");c.fillStyle=g;c.fillRect(p.x-6,p.y-6,12,12)}}
/* 11/10 Gemini 71 作法 2（開發者選）：經典世界（千秋時光之苑，紙墨世界）的雨雪換樣子——雨是淡墨滴、落地暈開一圈；雪是飄落的碎宣紙片，夾著幾點淡金星光。
   哪一天、哪個時段下雨下雪照全 App 共用的天氣（sw7Precip），只換畫法 */
/* 經典世界的頁才換（各朝的港口、驛站圖照舊下真的雨雪） */
function sw7ClWx(o){try{return typeof hbIsCl==="function"&&hbIsCl()&&!(o&&/^(port_|yz_)/.test(o.k))}catch(e){return false}}
/* hspx 11/10「讓經典世界的雲有流動的視覺效果」：經典世界的首頁、觀星閣、藏譜石窟、天井（雲海在畫面下半、天上有淡雲），
   疊三條程式畫的淡雲帶（下方兩條快慢不同、上方一條很淡），慢慢往左飄；雲的紋理是一張左右接得起來的軟雲圖，只畫一次 */
function sw7ClCloud(o,src){if(!o||!/^(home|homeAlt|learn|battle|lobby)$/.test(o.k)||!/classic/.test(src)||!sw7ClWx(o))return false;
  if(!SW7.clT){try{const W=1024,H=256,c=document.createElement("canvas");c.width=W;c.height=H;const g=c.getContext("2d");
    for(let i=0;i<70;i++){const x=Math.random()*W,y=H*(.25+Math.random()*.6),rx=40+Math.random()*120,ry=rx*(.28+Math.random()*.2),a=.18+Math.random()*.32;
      for(const dx of[-W,0,W]){const gr=g.createRadialGradient(x+dx,y,0,x+dx,y,rx);gr.addColorStop(0,`rgba(255,255,255,${a})`);gr.addColorStop(.6,`rgba(250,250,248,${a*.45})`);gr.addColorStop(1,"rgba(255,255,255,0)");
        g.save();g.translate(x+dx,y);g.scale(1,ry/rx);g.translate(-(x+dx),-y);g.fillStyle=gr;g.beginPath();g.arc(x+dx,y,rx,0,6.283);g.fill();g.restore()}}
    SW7.clT=1;document.documentElement.style.setProperty("--sw7cl",`url(${c.toDataURL("image/png")})`)}catch(e){return false}}
  return true}
function sw7InkMk(p,W,H){const r=Math.random;p.v=240+r()*150;p.l=5+r()*5;p.gy=H*(.45+r()*.55);p.sp=0}
function sw7InkDraw(c,R,dt){const z=R.z||1,k=dt/z,ink=R.night?"236,230,214":"34,36,44";
  c.fillStyle=`rgba(${ink},${R.night?.5:.5})`;c.beginPath();
  for(const p of R.A){if(p.sp){p.sp+=dt;if(p.sp>.7)sw7Re(R,p);continue}p.y+=p.v*k;if(p.y>=p.gy){p.sp=1e-4;continue}
    c.moveTo(p.x,p.y);c.ellipse(p.x,p.y,1.4/z,p.l*.5/z,0,0,6.283)}
  c.fill();
  for(const p of R.A){if(!p.sp)continue;const u=p.sp/.7,rr=(2+u*15)/z,a=(1-u);
    c.fillStyle=`rgba(${ink},${(.12*a).toFixed(3)})`;c.beginPath();c.ellipse(p.x,p.y,rr*.8,rr*.3,0,0,6.283);c.fill();
    c.lineWidth=1/z;c.strokeStyle=`rgba(${ink},${(.45*a).toFixed(3)})`;c.beginPath();c.ellipse(p.x,p.y,rr,rr*.36,0,0,6.283);c.stroke()}}
function sw7PaperMk(p){const r=Math.random;p.w=3.6+r()*3.4;p.h=p.w*(.55+r()*.5);p.v=16+r()*24;p.d=(r()-.5)*12;p.rot=r()*6.283;p.vr=(r()-.5)*2.4;p.g=r()<.22}
function sw7PaperDraw(c,R,dt,t){const z=R.z||1,k=dt/z;
  for(const p of R.A){p.y+=p.v*k;p.x+=(p.d+Math.sin(t*.9+p.ph)*9)*k;p.rot+=p.vr*dt;if(p.y>R.H+10||p.x<-10||p.x>R.W+10){sw7Re(R,p);continue}
    if(p.g){const a=.55+.35*Math.sin(t*2+p.ph),rr=5/z,g=c.createRadialGradient(p.x,p.y,0,p.x,p.y,rr);g.addColorStop(0,`rgba(255,236,170,${a.toFixed(2)})`);g.addColorStop(1,"rgba(240,205,120,0)");c.fillStyle=g;c.fillRect(p.x-rr,p.y-rr,rr*2,rr*2);continue}
    c.save();c.translate(p.x,p.y);c.rotate(p.rot);c.scale(1/z,(.35+.65*Math.abs(Math.cos(t*1.4+p.ph)))/z);
    c.fillStyle=R.night?"rgba(238,230,206,.78)":"rgba(246,232,190,.97)";c.fillRect(-p.w/2,-p.h/2,p.w,p.h);
    if(!R.night){c.lineWidth=.8;c.strokeStyle="rgba(110,88,56,.5)";c.strokeRect(-p.w/2,-p.h/2,p.w,p.h)}c.restore()}}
/* n＝基準粒子數；still＝prefers-reduced-motion 時能不能畫成一張靜止的（螢火不行，就不顯示） */
const SW7_KIND={rain:{mk:sw7RainMk,draw:sw7RainDraw,n:120,still:true},snow:{mk:sw7SnowMk,draw:sw7SnowDraw,n:100,still:true},inkr:{mk:sw7InkMk,draw:sw7InkDraw,n:70,still:true},paper:{mk:sw7PaperMk,draw:sw7PaperDraw,n:80,still:true},fluff:{mk:sw7FluffMk,draw:sw7FluffDraw,still:true},
  petal:{mk:sw7FallMk,draw:sw7FallDraw,still:true},leaf:{mk:sw7FallMk,draw:sw7FallDraw,still:true},fly:{mk:sw7FlyMk,draw:sw7FlyDraw,still:false}};
function sw7P(k,W,H,init){const r=Math.random,p={k,x:r()*W*(k==="fluff"?1:1.25),y:init?r()*H:-8-r()*60,ph:r()*6.283},K=SW7_KIND[k];if(K)K.mk(p,W,H,H/700,init);return p}
function sw7Re(R,p){Object.assign(p,sw7P(R.k,R.W,R.H,false))}
function sw7Draw(R,dt,t){const c=R.cx,W=R.W,H=R.H,K=SW7_KIND[R.k];if(!c||!W||!H||!K)return;c.clearRect(0,0,W,H);c.save();
  if(R.sky){const sx=W/R.IW,sy=H/R.IH;c.beginPath();for(const q of R.sky)q.forEach(([x,y],i)=>c[i?"lineTo":"moveTo"](x*sx,y*sy));c.clip()}
  K.draw(c,R,dt,t);c.restore()}
function sw7Loop(t){SW7.raf=0;if(document.hidden)return;let n=0;for(const R of SW7.L)if(R.run&&R.vis&&R.P.isConnected)n++;if(!n)return;
  SW7.raf=requestAnimationFrame(sw7Loop);if(SW7.last&&t-SW7.last<31)return;const dt=SW7.last?Math.min(.1,(t-SW7.last)/1000):0;SW7.last=t;
  for(const R of SW7.L)if(R.run&&R.vis&&R.P.isConnected){sw7Zoom(R);sw7Draw(R,dt,t/1000)}}
function sw7Kick(){if(!SW7.raf&&!document.hidden){SW7.last=0;SW7.raf=requestAnimationFrame(sw7Loop)}}
/* 兩指縮放（07x 用 transform 放大整頁）：照圖在螢幕上的大小（getBoundingClientRect）重算縮放倍數，畫布解析度跟著提高 */
function sw7Zoom(R){const w=R.img.offsetWidth;if(!w)return;const z=Math.max(1,R.img.getBoundingClientRect().width/w);if(Math.abs(z-(R.z||1))>.03){R.z=z;sw7Size(R,true)}}
function sw7Size(R,force){const img=R.img,W=img.offsetWidth,H=img.offsetHeight;if(!W||!H)return;
  R.box.style.width=W+"px";R.box.style.height=H+"px";R.box.style.left=img.offsetLeft+"px";R.box.style.top=img.offsetTop+"px";
  if(!R.cv||(!force&&W===R.W&&H===R.H))return;const z=R.z||1,dpr=Math.min(1.5,window.devicePixelRatio||1),bs=Math.min(dpr*Math.min(z,2),2048/W);
  if(R.W&&R.H)for(const p of R.A){p.x*=W/R.W;p.y*=H/R.H}
  const first=!R.W;R.W=W;R.H=H;R.cv.width=Math.round(W*bs);R.cv.height=Math.round(H*bs);R.cx.setTransform(bs,0,0,bs,0,0);
  if(first||!R.A.length){const K=SW7_KIND[R.k],n=Math.min(150,Math.round((K&&K.n?K.n*(R.amt||1):R.n)*Math.max(.7,Math.min(1.4,W/420))));   /* 半戶外頁的粒子也撒滿整頁再裁，密度跟全戶外一樣 */R.A=[];for(let i=0;i<n;i++)R.A.push(sw7P(R.k,W,H,true))}
  if(!R.run)sw7Draw(R,0,0)}

/* ---------- ⑤ 落葉樹四季變色（開發者 11/9：「會有春夏秋冬嗎？葉子也會枯黃」）----------
   開頁時讀底圖，在 tr 多邊形裡把偏綠的像素（色相 55～175°、夠飽和、不是墨線）換色相與飽和度，明暗照舊（墨線、明暗都留著）；結果畫成一張疊在底圖上的 canvas。
   [目標色相, 往目標靠多少 0～1, 飽和度倍數, 亮度加減, 往宣紙色退多少, 秋天最低飽和度（水墨的綠很淡，不墊一點秋色出不來）]：春天嫩綠稍淡；夏天不變；立秋漸黃、秋分～寒露黃橙轉紅褐、霜降枯褐；冬天枯淡、像落了大半。
   同一張圖、同一個節氣算一次就快取（換頁回來不重算）；首頁換成積雪版、雨景版時那張不在表裡，不變色。 */
const SW7_LEAFP={"立春":[96,.35,.55,.1,0],"雨水":[95,.3,.6,.08,0],"驚蟄":[92,.25,.75,.06,0],"春分":[90,.2,.85,.05,0],"清明":[88,.15,.9,.04,0],"穀雨":[88,.1,.95,.02,0],
  "立秋":[66,.3,1.15,0,0,.2],"處暑":[56,.5,1.3,0,0,.28],"白露":[48,.68,1.4,.01,0,.36],"秋分":[38,.85,1.6,.02,0,.46],"寒露":[26,.92,1.5,0,0,.46],"霜降":[24,1,.85,-.03,.05,.3],
  "立冬":[30,1,.35,.04,.15],"小雪":[32,1,.25,.06,.3],"大雪":[32,1,.2,.08,.4],"冬至":[32,1,.2,.08,.4],"小寒":[32,1,.2,.08,.4],"大寒":[34,1,.22,.07,.35]};
function sw7LeafMake(o,src,par){return new Promise(res=>{const im=new Image();im.decoding="async";
  im.onload=()=>{try{const IW=im.naturalWidth,IH=im.naturalHeight,sx=IW/(o.W||768),sy=IH/(o.H||1376),cv=document.createElement("canvas");cv.width=IW;cv.height=IH;
    const c=cv.getContext("2d",{willReadFrequently:true});let x0=IW,y0=IH,x1=0,y1=0;c.save();c.beginPath();
    for(const q of o.tr)q.forEach(([x,y],i)=>{x*=sx;y*=sy;x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);c[i?"lineTo":"moveTo"](x,y)});
    c.clip();c.drawImage(im,0,0);x0=Math.max(0,Math.floor(x0));y0=Math.max(0,Math.floor(y0));const w=Math.min(IW,Math.ceil(x1))-x0,h=Math.min(IH,Math.ceil(y1))-y0;if(w<1||h<1)return res(null);
    const D=c.getImageData(x0,y0,w,h);c.restore();const a=D.data,[th,mx,sm,la,pm,ms]=par,PR=236,PG=228,PB=210;
    for(let i=0;i<a.length;i+=4){const al=a[i+3];if(!al)continue;const r=a[i]/255,g=a[i+1]/255,b=a[i+2]/255,M=Math.max(r,g,b),m=Math.min(r,g,b),dl=M-m;
      if(M<.12||dl<.03){a[i+3]=0;continue}
      let hh=M===r?((g-b)/dl)%6:M===g?(b-r)/dl+2:(r-g)/dl+4;hh*=60;if(hh<0)hh+=360;const sv=dl/M;
      const wh=hh<55||hh>175?0:hh<70?(hh-55)/15:hh>160?(175-hh)/15:1,ws=sv<.09?0:sv>.2?1:(sv-.09)/.11,wt=wh*ws*al/255;if(wt<=0){a[i+3]=0;continue}
      const L=(M+m)/2,S=dl/(1-Math.abs(2*L-1)||1),H2=hh+(th-hh)*mx,S2=Math.max(ms||0,Math.min(1,S*sm)),L2=Math.max(0,Math.min(1,L+la)),C=(1-Math.abs(2*L2-1))*S2,X=C*(1-Math.abs((H2/60)%2-1)),m2=L2-C/2;
      let[rr,gg,bb]=H2<60?[C,X,0]:H2<120?[X,C,0]:H2<180?[0,C,X]:[0,X,C];rr=(rr+m2)*255;gg=(gg+m2)*255;bb=(bb+m2)*255;
      a[i]=rr*(1-pm)+PR*pm;a[i+1]=gg*(1-pm)+PG*pm;a[i+2]=bb*(1-pm)+PB*pm;a[i+3]=Math.round(255*wt)}
    c.clearRect(0,0,IW,IH);c.putImageData(D,x0,y0);res(cv)}catch(e){res(null)}};
  im.onerror=()=>res(null);im.src=src})}
function sw7Leaf(R,o,src){const t=sw7TermFor(R.P,o),par=o&&o.tr&&o.tr.length&&(sw7On()||R.P.dataset.sw7Term)&&!/night/i.test(src)?SW7_LEAFP[t]:null,key=par?src+"|"+t:"";
  if(key===R.lk)return;R.lk=key;const old=R.box.querySelectorAll(".sw7-leaf");old.forEach(e=>e.remove());if(!par)return;
  let P=SW7.leaf.get(key);if(!P){P=sw7LeafMake(o,src,par);SW7.leaf.set(key,P);if(SW7.leaf.size>8)SW7.leaf.delete(SW7.leaf.keys().next().value)}
  P.then(cv=>{if(!cv||R.lk!==key||!R.box.isConnected)return;const put=(par0,before)=>{const d=document.createElement("canvas");d.className="sw7-leaf";d.width=cv.width;d.height=cv.height;d.getContext("2d").drawImage(cv,0,0);par0.insertBefore(d,before)};
    put(R.box,R.box.firstChild);R.box.querySelectorAll(".sw7-fg").forEach(f=>put(f,null))})}

/* 照現在的設定、節氣、天氣、時辰把這一頁的疊層排好；沒變就只更新晨昏色的濃淡 */
/* 11/9 開發者截圖：圖還沒下載完（剛換版要重抓）時，月夜層會把空白頁塗成一片藍；圖載好才蓋，載好再補畫一次 */
function sw7ImgOk(R){const im=R.img;if(im.complete&&im.naturalWidth>0)return true;if(!R.wl){R.wl=1;im.addEventListener("load",()=>{R.wl=0;R.sig="";try{sw7Fill(R)}catch(e){}},{once:true})}return false}
function sw7Fill(R){const P=R.P,box=R.box,on=sw7On(),img=R.img,src=img.getAttribute("src")||"",o=sw7Page(src),hn=o&&/^(home|homeAlt|learn|battle|lobby)$/.test(o.k)&&!/_(dawn|dusk|night)\./.test(src)&&sw7ImgOk(R)?sw7HomeNightA(null,SW7_HSEA[sw7TermFor(P,o)]||""):0,night=/night/i.test(src)||P.classList.contains("td-night")||hn>0,
    td=P.classList.contains("td-page"),ov=P.dataset.sw7Term||"",out=on&&o&&o.m!=="in",term=sw7TermFor(P,o),rm=sw7RM(),
    pw=out?(ov?(term==="冬至"?{t:"snow",a:.8}:null):sw7WxFor(P,o)):null,A0=out&&!pw?SW7_AMB[term]||null:null,tone=ov?sw7SeaOf(term):"";
  let k=pw?pw.t:A0?A0[0]:"";if(td&&!pw&&sw7TdHas(term))k="";
  if((k==="rain"||k==="snow")&&sw7ClWx(o))k=k==="rain"?"inkr":"paper";   /* 經典世界：墨滴雨、碎紙雪 */
  if(k==="fly"&&!night)k="";if(rm&&k&&k!=="fog"&&!(SW7_KIND[k]&&SW7_KIND[k].still))k="";
  const tn=on&&!night&&!td&&!/_(dawn|dusk)\./.test(src)?sw7Tint():null,sky=o&&o.m==="semi"?o.sky||null:null,IW=o&&o.W||768,IH=o&&o.H||1376,
    cl=sw7ClCloud(o,src),sig=[k,night,rm,tn?tn.c:"",term,src,pw?pw.a.toFixed(2):"",on,ov,hn.toFixed(1),cl].join("|");
  if(sig!==R.sig){R.sig=sig;if(R.cv&&SW7.io)SW7.io.unobserve(R.cv);R.cv=R.cx=null;R.A=[];R.W=R.H=0;R.k=k;R.night=night;R.run=false;R.amt=pw?pw.a:1;
    R.col=A0&&A0[2]||"";R.n=A0&&A0[1]||0;R.sky=sky;R.IW=IW;R.IH=IH;R.lk="";
    const fog=`<i class="sw7-fog${k==="fog"&&A0&&A0[1]?" frost":""}${night?" nt":""}${rm?" still":""}"></i>`,cp=q=>`clip-path:${sw7PolyCss(q,IW,IH)};-webkit-clip-path:${sw7PolyCss(q,IW,IH)}`;
    box.innerHTML=(cl?["a","b","c"].map(c=>`<i class="sw7-cl ${c} k-${o.k}${night?" nt":""}"></i>`).join(""):"")+(hn?`<i class="sw7-night" style="opacity:${hn.toFixed(2)}"></i><i class="sw7-moon" style="opacity:${hn.toFixed(2)}"></i>`:"")+(tone?`<i class="sw7-tone ${tone}"></i>`:"")+(tn?`<i class="sw7-tint ${tn.c}"></i>`:"")+(pw?`<i class="sw7-mist ${pw.t}${night?" nt":""}" style="opacity:${(.5+.5*pw.a).toFixed(2)}"></i>`:"")
      +(k==="fog"?(sky?sky.map(q=>`<i class="sw7-fogw" style="${cp(q)}">${fog}</i>`).join(""):fog):"")+(k&&k!=="fog"?'<canvas class="sw7-cv"></canvas>':"")
      +(k&&k!=="fog"&&o&&o.fg?o.fg.map(q=>`<i class="sw7-fg" style="${cp(q)}"><b style="background-image:url(&quot;${esc(src)}&quot;)"></b></i>`).join(""):"");
    const cv=box.querySelector("canvas");if(cv){R.cv=cv;R.cx=cv.getContext("2d");cv._sw7=R;R.run=!rm;R.vis=true;R.z=1;if(SW7.io)SW7.io.observe(cv)}
    sw7Size(R,true)}
  sw7Leaf(R,o,src);try{sw7Box(R)}catch(e){}
  const ti=box.querySelector(".sw7-tint");if(ti&&tn)ti.style.opacity=Math.max(0,Math.min(1,tn.a)).toFixed(2)}
/* 掛到頁上：.shp-page.cq（滿版頁）插在入口標籤、標題字前面；星槎主圖 .shp-map.full>.shp-in 插在標籤層 .px-sw 前面。底圖換圖（日夜、全彩版、首頁雪景）時重排 */
function sw7Attach(P,img){sw7Css();const box=document.createElement("div");box.className="sw7-fx";box.setAttribute("aria-hidden","true");
  const ref=P.querySelector(":scope>.shp-cap,:scope>.shp-spot,:scope>button,:scope>.px-sw");if(ref)P.insertBefore(box,ref);else img.after(box);
  const R={P,img,box,cv:null,cx:null,k:"",A:[],W:0,H:0,z:1,vis:true,run:false,sig:""};SW7.L.add(R);if(SW7.ro)SW7.ro.observe(img);
  img.addEventListener("load",()=>{if(box.isConnected){sw7Fill(R);sw7Size(R);sw7Kick()}});sw7Fill(R)}
function sw7Scan(){SW7.q=0;if(!SW7_ON)return;
  for(const R of[...SW7.L])if(!R.box.isConnected){SW7.L.delete(R);if(R.cv&&SW7.io)SW7.io.unobserve(R.cv);if(SW7.ro)try{SW7.ro.unobserve(R.img)}catch(e){}}
  document.querySelectorAll(".shp-page.cq,.shp-map.full>.shp-in").forEach(P=>{if(P.querySelector(":scope>.sw7-fx"))return;const img=P.querySelector(":scope>img");if(img)sw7Attach(P,img)});
  if(SW7.L.size&&!SW7.tm)SW7.tm=setInterval(sw7Tick,60000);if(!SW7.L.size&&SW7.tm){clearInterval(SW7.tm);SW7.tm=0}
  sw7Kick()}
function sw7Tick(){for(const R of SW7.L)if(R.box.isConnected)sw7Fill(R);sw7Kick()}
/* 設定的開關：sw7Set(true/false)，馬上套到畫面上的每一頁（首頁的雪景、雨景底圖下次進首頁才換回） */
function sw7Set(on){store.set("sw7Wx",!!on);sw7Tick()}
function sw7SetRow(){if(!SW7_ON)return"";return`<label class="row" style="justify-content:space-between;padding:8px 2px"><span><b>場景節氣天氣</b><br><span class="muted" style="font-size:12.5px">戶外場景照節氣下雨、下雪、樹葉變色，清晨偏青、黃昏偏暖（很淡，不擋點選）</span></span><input type="checkbox" class="sw" id="sw7Wx" ${sw7On()?"checked":""} onchange="sw7Set(this.checked)"></label>`}

/* ---------- ③ 登船紀念日 ---------- */
function sw7Born(){try{const J=store.get("journey",null);return J&&+J.born>0?+J.born:0}catch(e){return 0}}
function sw7AnnDay(B,Y){const m=B.getMonth(),d=new Date(Y,m,B.getDate());return d.getMonth()!==m?new Date(Y,m+1,0):d}   /* 2/29 上船的，平年算 2/28 */
function sw7Age(b,now){if(!b)return-1;const B=new Date(b),N=now||new Date();let y=N.getFullYear()-B.getFullYear();if(N<sw7AnnDay(B,N.getFullYear()))y--;return Math.max(0,y)}
const sw7Ymd=d=>`${d.getFullYear()} 年 ${d.getMonth()+1} 月 ${d.getDate()} 日`;
const SW7_CN="〇一二三四五六七八九";
const sw7Cn=n=>n<10?SW7_CN[n]:n<20?"十"+(n%10?SW7_CN[n%10]:""):SW7_CN[Math.floor(n/10)]+"十"+(n%10?SW7_CN[n%10]:"");
function sw7AnnTry(){if(SW7.ann||!SW7_ON)return;const b=sw7Born(),N=new Date(),n=sw7Age(b,N);if(n<1)return;
  const B=new Date(b),A=sw7AnnDay(B,B.getFullYear()+n),key=b+":"+n;if(N-A>30*864e5||store.get("sw7Ann","")===key){SW7.ann=true;return}
  const h=typeof navKey==="function"?navKey(location.hash):(location.hash.replace(/^#/,"")||"/");if(!/^\/(adventure|me|ship)?$/.test(h))return;
  if(document.querySelector("#xqTitle,#preov,.modal,#sheet,.travel,.walkc,.ecover")||document.body.classList.contains("xqt-on")){if((SW7.annN=(SW7.annN||0)+1)<15)sw7AnnLater(8000);return}
  SW7.ann=true;store.set("sw7Ann",key);sw7Css();const today=A.toDateString()===N.toDateString();
  modal(`<div class="em">⛵</div><h2>登上雲河星槎滿${sw7Cn(n)}年</h2><p>${today?`${sw7Cn(n)}年前的今天（${esc(sw7Ymd(B))}），你登上了雲河星槎。`:`${esc(sw7Ymd(B))}，你登上了雲河星槎；轉眼滿${sw7Cn(n)}年了。`}</p>
    <p class="muted">凡間又過了一年，船上的人卻一點也沒有變老——在星槎上，不受凡間歲月影響。七星和你，都還是上船那年的模樣。<span class="sw7-plain">意思是：外面的世界過了一年，可是在船上，你和七星都沒有長大，也沒有變老。</span></p>
    <p class="muted">說書人笑道：「船上的光陰，只記一盤一盤的棋。」<span class="sw7-plain">意思是：在船上不用數日子，大家只記得一起下過的每一盤棋。</span></p>`,[["收下這份紀念",null]],"sw7-ann");sw7PlainSet("外面的世界過了一年，可是在船上，你和七星都沒有長大，也沒有變老。")}
function sw7AnnLater(ms){setTimeout(()=>{try{sw7AnnTry()}catch(e){}},ms)}
/* 我的角色頁：3D 名字底下那條加「⛵ 船齡 N 年」 */
function sw7MeAge(v){const st=v&&v.querySelector("#meSt"),b=sw7Born();if(!SW7_ON||!st||!b||st.querySelector(".sw7-age"))return;sw7Css();const n=sw7Age(b),t=n>=1?`⛵ 船齡 ${n} 年`:"⛵ 船齡未滿一年";
  const b2=st.querySelector(".me-born2");if(b2)b2.insertAdjacentHTML("beforeend",`<button type="button" class="sw7-age">${t}</button>`);else st.insertAdjacentHTML("beforeend",`<div class="me-born2 sw7-b2"><button type="button" class="sw7-age">${t}</button></div>`);
  const btn=st.querySelector(".sw7-age");if(btn)btn.onclick=e=>{e.stopPropagation();sw7AgeCard()}}
if(typeof Me==="function"){const f0=Me;Me=function(v){const r=f0.apply(this,arguments);try{sw7MeAge(v)}catch(e){}return r}}
/* 回饋 837、857（開發者 11/9「船齡要在哪邊查看，還有時間，希望可以在首頁就看到」）：船齡卡抽成一個函式；首頁頂欄「象棋千秋」底下多一行小字＝船上第幾天・節氣・時辰，點了開這張卡 */
const sw7Shi=N=>"子丑寅卯辰巳午未申酉戌亥"[Math.floor(((N.getHours()+1)%24)/2)]+"時";
const sw7OnDay=(b,N)=>{const B=new Date(b);return Math.round((new Date(N.getFullYear(),N.getMonth(),N.getDate())-new Date(B.getFullYear(),B.getMonth(),B.getDate()))/864e5)+1};
function sw7AgeCard(){if(typeof vibrate==="function")vibrate(5);const b=sw7Born(),N=new Date(),tm=sw7Term(N),n=b?sw7Age(b):-1,t=!b?"還沒登船":n>=1?`船齡 ${n} 年`:"船齡未滿一年";
  const ymd=d=>`${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`;   /* 回饋 839（開發者 11/9「廢話有點多，簡單一些，還有排版」）：只留兩行資料＋一句話，日期用短寫，不折行 */
  const xz=typeof CLK_ON!=="undefined"&&CLK_ON&&typeof clkXz==="function";   /* 回饋 858（時辰鐘）：兩行資料底下加十二時辰香篆鐘（07w8-shichen.js） */
  const m=modal(`<div class="em">⛵</div><h2>${esc(t)}</h2><div class="sw7-card">${b?`<div><span>登船日</span><b>${ymd(new Date(b))}（第 ${sw7OnDay(b,N)} 天）</b></div>`:""}<div><span>今天</span><b>${ymd(N)}${tm?`・${esc(tm)}`:""}・${sw7Shi(N)}</b></div></div>${xz?clkXz(N):""}<p class="muted" style="margin:10px 0 0">${b?"在星槎上，大家都不會變老。":"選好角色、開始旅程那天，就是登船日。"}</p>`,[["好",null]],"sw7-ann"+(xz?" clk-card":""));if(m&&xz)clkXzBind(m,N)}
/* 首頁頂欄的一行小字（只在首頁；每分鐘更新時辰；換頁時 setTop 改寫標題，這行自然消失） */
function sw7HomeInfo(){if(!SW7_ON||(typeof CLK_ON!=="undefined"&&CLK_ON))return;   /* 回饋 858（時辰鐘）：改由 07w8 的頂欄星晷顯示 */const h=document.getElementById("title");if(!h||!["","#","#/"].includes(location.hash))return;sw7Css();let e=h.querySelector(".sw7-hd");if(!e){e=document.createElement("button");e.type="button";e.className="sw7-hd";e.onclick=ev=>{ev.stopPropagation();sw7AgeCard()};h.append(e)}
  const N=new Date(),b=sw7Born(),tm=sw7Term(N);e.textContent=[b?`⛵ 船上第 ${sw7OnDay(b,N)} 天`:"⛵ 還沒登船",tm,sw7Shi(N)].filter(Boolean).join("・");e.setAttribute("aria-label","看船齡和今天的時間："+e.textContent)}
if(typeof Home==="function"){const f0=Home;Home=function(v,hub){const r=f0.apply(this,arguments);if(!hub){setTimeout(()=>{try{sw7HomeInfo()}catch(e){}},0);setTimeout(()=>{try{sw7HomeInfo()}catch(e){}},600)}return r}}
setInterval(()=>{try{if(document.querySelector("#title .sw7-hd"))sw7HomeInfo()}catch(e){}},60000);

/* ---------- ④ 朝代過場：千秋穿梭字幕底下一句 ---------- */
/* 各站故事場景的大約年份（秦直道、漢通西域、赤壁、竹林、劉宋渡江、隋開運河、盛唐長安、五代、南宋臨安元宵、元延祐、明萬曆、清乾隆南巡），只拿來算相差幾百年 */
const SW7_ERA_Y={qin:-212,han:-100,sanguo:208,weijin:260,nanbei:450,sui:605,tang:750,wudai:930,song:1183,yuan:1316,ming:1582,qing:1765};
function sw7Span(a,b){const d=Math.abs(SW7_ERA_Y[b]-SW7_ERA_Y[a]);if(d<80)return["數十年","幾十年"];const n=Math.round(d/100),t=Math.floor(n/10),h=n%10;
  const w=(t?(t===2?"兩":SW7_CN[t])+"千":"")+(h?(t||h>1?SW7_CN[h]:"")+"百":"")+"年";return[w,"大約"+(w==="百年"?"一百年":w)]}
function sw7QqLine(from,to){const A=SW7_ERA_Y[from],B=SW7_ERA_Y[to],nm=k=>typeof eraLabel==="function"?eraLabel(k):k;
  if(A==null&&B==null)return null;
  if(A==null)return["星槎駛出雲河，落向"+nm(to)+"的人間",`船從天上的雲河開到${nm(to)}。在船上不算日子，大家都不會變老。`];
  if(B==null)return["星槎升回雲河，此間不記年月","船回到天上的雲河。在船上不算日子，大家都不會變老。"];
  const[s,p]=sw7Span(from,to);
  return B>A?["星槎破浪，光陰荏苒，忽已越"+s+"矣",`船走了${p.replace("大約 ","大約")}。船上的七星不會變老，還是上船時的樣子。`]
    :["星槎逆溯雲河，溯回"+s+"前",`船往回走了${p.replace("大約 ","大約")}。在船上，大家不會變老，也不會變小。`]}
function sw7QqAdd(ov,from,to){const cap=ov&&ov.querySelector(".tcap"),L=sw7QqLine(from,to);if(!cap||!L||cap.querySelector(".sw7-qq"))return;sw7Css();
  const d=document.createElement("div");d.className="sw7-qq";d.innerHTML=`<div class="sw7-q1">${esc(L[0])}</div><div class="sw7-q2">${esc(L[1])}</div>`;
  const bar=cap.querySelector(".tbar");if(bar)cap.insertBefore(d,bar);else cap.append(d);sw7PlainSet(L[1])}
/* 給 07w 小帥選單用（之後排）：剛看過的過場、紀念日卡的白話，sw7PlainLast(毫秒) 拿得到，太久以前的回 "" */
function sw7PlainSet(t){SW7.plain={t:String(t||""),at:Date.now()}}
function sw7PlainLast(ms){const p=SW7.plain;return p&&Date.now()-p.at<(ms||120000)?p.t:""}
if(typeof qianqiu==="function"){const qq0=qianqiu;qianqiu=function(from,to,done,src){const had=new Set(document.querySelectorAll(".travel.qq")),r=qq0.apply(this,arguments);
  try{if(SW7_ON){const ov=[...document.querySelectorAll(".travel.qq")].find(o=>!had.has(o));if(ov)sw7QqAdd(ov,from,to)}}catch(e){}return r}}

/* ---------- ⑥ 四時風物匣（開發者 11/9 選定 Gemini 46 號方案二修正版）----------
   只在各朝渡口（12）與驛站（13）頁：圖上一個小木匣（SW7_BOX_POS：[左%,上%]＝木匣底邊中心，量法 scratchpad t811／boxpos.json），點了展開面板（夾在頂欄和底欄之間，點外面收起）。
   四格＝春桃花、夏蓮蓬荷葉、秋楓葉、冬臘梅帶雪；拿到的亮、沒拿到的淡墨，底下一句「真實的○季來這裡就能拿到；或在這個朝代下贏 3 盤」。
   取得：①真實的那一季（照二十四節氣分四季）打開過這一頁；②在那個朝代（驛站旅人、路過客人、園子、擂台都算；古戰場、練習不算）累計每下贏 3 盤，可以自己挑一季沒有的拿一個。
   點拿到的風物＝這一頁立刻換成那一季（sw7TermFor 覆寫成春分、夏至、秋分、冬至；樹葉、粒子、色調都照那季），角落出一個「歸今」印，點了回真實節氣；離開這一頁就回真實節氣，不記住。
   「場景節氣天氣」關掉時：木匣照樣能開，換季只換樹葉與色調，不放粒子。
   收齊四季：解鎖那一朝的一句古詩詞（SW7_POEM；ok:0＝史學顧問還沒核，先不顯示原句）。
   存檔：store sw7Box（旅程鍵，05b-save.js JOURNEY_KEYS 已加）＝{pg:{"port:qin":{sp:時間,…}}, w:{朝代:贏的盤數}, u:{朝代:用掉幾次挑選}, g:[記過的對局 id]} */
const SW7_BOX_ON=true,SW7_BOX_IMG="data/seasonbox/box_open.webp?v=1";
const SW7_BOX_POS={port:{qin:[28.0,55.8],han:[26.0,53.0],sanguo:[44.5,79.0],weijin:[75.0,54.4],nanbei:[83.0,56.4],sui:[23.0,58.6],tang:[24.0,54.0],wudai:[48.0,59.0],song:[24.5,55.2],yuan:[29.5,56.4],ming:[51.0,53.6],qing:[86.0,66.0]},
  yz:{classic:[21.0,85.0],qin:[60.0,43.0],han:[21.5,56.0],sanguo:[68.5,41.3],weijin:[76.0,51.0],nanbei:[56.0,49.4],sui:[17.5,56.4],tang:[59.0,42.0],wudai:[59.0,47.8],song:[61.5,46.3],yuan:[58.0,51.4],ming:[7.5,66.2],qing:[57.5,49.2]}};
/* 四季：[代號, 季, 風物, 換季用的節氣, 拿到時的小字] */
const SW7_SEA=[["sp","春","一枝桃花","春分","🌸"],["su","夏","蓮蓬和荷葉","夏至","🪷"],["au","秋","幾片楓葉","秋分","🍁"],["wi","冬","一枝帶雪的臘梅","冬至","❄"]];
/* 木匣圖裡四格的位置（圖寬、圖高的 %；照 560×570 的去背版量的） */
const SW7_BOX_CELL={sp:[10.4,12.6,49.1,45.3],su:[51.8,12.6,90.2,45.3],au:[9.8,52.6,49.1,86],wi:[51.8,52.6,90.7,86]};
/* 收齊四季解鎖的詩詞：s 原句、a 作者與出處、p 白話（國小中年級看得懂）、ok 史學顧問核過才是 1 */
const SW7_POEM={
  classic:{s:"河漢清且淺，相去復幾許。",a:"〈古詩十九首・迢迢牽牛星〉（漢）",p:"天上的銀河又清又淺，兩岸其實沒有隔多遠。",ok:1},
  qin:{s:"豈曰無衣？與子同袍。",a:"《詩經・秦風・無衣》",p:"誰說沒有衣服穿？我的長袍分你一起穿。",ok:1},
  han:{s:"秦時明月漢時關，萬里長征人未還。",a:"王昌齡〈出塞〉（唐）",p:"還是秦朝的月亮、漢朝的關口，走了萬里路去打仗的人還沒回家。",ok:1},
  sanguo:{s:"大江東去，浪淘盡，千古風流人物。",a:"蘇軾〈念奴嬌・赤壁懷古〉（宋）",p:"長江一直往東流，浪花把古時候的英雄都沖走了。",ok:1},
  weijin:{s:"采菊東籬下，悠然見南山。",a:"陶淵明〈飲酒〉其五（東晉）",p:"在東邊的籬笆下摘菊花，抬頭就悠閒的看見南邊的山。",ok:1},
  nanbei:{s:"南朝四百八十寺，多少樓臺煙雨中。",a:"杜牧〈江南春〉（唐）",p:"南朝蓋了好多好多寺廟，現在很多樓臺都在細雨裡若隱若現。",ok:1},
  sui:{s:"盡道隋亡為此河，至今千里賴通波。",a:"皮日休〈汴河懷古〉其二（唐）",p:"大家都說隋朝是因為挖這條運河才滅亡的，可是到現在，千里的船運還是靠著它。",ok:1},
  tang:{s:"長安一片月，萬戶擣衣聲。",a:"李白〈子夜吳歌・秋歌〉（唐）",p:"長安城上一片月光，家家戶戶都傳來搗洗衣服的聲音。",ok:1},
  wudai:{s:"春花秋月何時了？往事知多少。",a:"李煜〈虞美人〉（南唐）",p:"春天的花、秋天的月，年年都來；過去的事，記得的又有多少呢？",ok:1},
  song:{s:"東風夜放花千樹，更吹落，星如雨。",a:"辛棄疾〈青玉案・元夕〉（宋）",p:"元宵夜的花燈像春風吹開千棵樹的花，煙火落下來像下了一場星星雨。",ok:1},
  yuan:{s:"枯藤老樹昏鴉，小橋流水人家。",a:"馬致遠〈天淨沙・秋思〉（元）",p:"乾枯的藤、老樹上停著黃昏的烏鴉；小橋下流著水，旁邊住著人家。",ok:1},
  ming:{s:"一生癡絕處，無夢到徽州。",a:"湯顯祖〈吳序憐予乏絕，勸為黃山白嶽之遊，不果〉（明）",p:"我這一生最著迷的事，就是連作夢都沒能到徽州去（徽州好到讓人想念）。",ok:1},
  qing:{s:"二十四橋明月夜，玉人何處教吹簫。",a:"杜牧〈寄揚州韓綽判官〉（唐）",p:"揚州二十四橋，月光好亮的晚上，你現在在哪裡教人吹簫呢？",ok:1}};
const sw7SeaOf=t=>SW7_SPRING.has(t)?"sp":SW7_SUMMER.has(t)?"su":SW7_WINTER.has(t)?"wi":t?"au":"";
function sw7BoxSt(){const S=store.get("sw7Box",null)||{};S.pg=S.pg||{};S.w=S.w||{};S.u=S.u||{};S.g=S.g||[];return S}
const sw7BoxTok=(S,e)=>Math.max(0,Math.floor((S.w[e]||0)/3)-(S.u[e]||0));
function sw7BoxKey(src){let m=/data\/shipmap\/port_(\w+?)(?:_c|_f)?\.webp/.exec(src);if(m&&m[1]!=="classic"&&SW7_BOX_POS.port[m[1]])return["port",m[1]];m=/data\/yizhan\/(\w+?)(?:_c|_f)?\.webp/.exec(src);if(m&&SW7_BOX_POS.yz[m[1]])return["yz",m[1]];return null}
/* 贏棋記到那一朝（包一層 07-legend.js 的 journeyGameEnd：先讀 jPending，古戰場 bt: 不算） */
function sw7BoxWin(st,P){if(!st||!st.result||st.practice||st.result.w!==st.human||(st.moves||[]).length<10)return;if(P&&P.game===st.id&&String(P.id).startsWith("bt:"))return;
  const S=sw7BoxSt(),id=String(st.id||"");if(!id||S.g.includes(id))return;S.g=S.g.concat(id).slice(-60);const e=store.get("eraUser",null)||store.get("era","classic");S.w[e]=(S.w[e]||0)+1;store.set("sw7Box",S);
  if(S.w[e]%3===0)setTimeout(()=>{try{toast(`🧺 在${e==="classic"?"雲河":eraLabel(e)}贏滿 ${S.w[e]} 盤：四時風物匣可以自己挑一季`)}catch(x){}},3800)}
if(typeof journeyGameEnd==="function"){const f0=journeyGameEnd;journeyGameEnd=function(st){let P=null;try{P=store.get("jPending",null)}catch(e){}const r=f0.apply(this,arguments);try{if(SW7_BOX_ON)sw7BoxWin(st,P)}catch(e){}return r}}
/* 掛木匣：開頁時順便把「真實的這一季」收進來 */
function sw7Box(R){if(!SW7_BOX_ON)return;const P=R.P,src=R.img.getAttribute("src")||"",K=sw7BoxKey(src);if(!K){const o=P.querySelector(":scope>.sw7-box");if(o)o.remove();return}
  const[g,e]=K,key=g+":"+e,S=sw7BoxSt(),pg=S.pg[key]||(S.pg[key]={}),se=sw7SeaOf(sw7Term());
  if(se&&!pg[se]){pg[se]=Date.now();store.set("sw7Box",S);const x=SW7_SEA.find(z=>z[0]===se);setTimeout(()=>{try{toast(`${x[4]} 四時風物匣收進了${x[2]}（真實的${x[1]}天來過這裡）`)}catch(z){}},2200)}
  let b=P.querySelector(":scope>.sw7-box");if(b&&b.dataset.k===key)return sw7BoxDot(b,S,e);if(b)b.remove();
  const[x,y]=SW7_BOX_POS[g][e];b=document.createElement("button");b.type="button";b.className="sw7-box";b.dataset.k=key;b.style.left=x+"%";b.style.top=y+"%";b.setAttribute("aria-label","四時風物匣");
  b.innerHTML=`<img src="${SW7_BOX_IMG}" alt="" draggable="false">`;b.onclick=ev=>{ev.stopPropagation();ev.preventDefault();if(typeof vibrate==="function")vibrate(5);sw7BoxOpen(R,g,e)};
  ["pointerdown","touchstart","mousedown"].forEach(t=>b.addEventListener(t,ev=>ev.stopPropagation(),{passive:true}));P.append(b);sw7BoxDot(b,S,e)}
function sw7BoxDot(b,S,e){b.classList.toggle("tok",sw7BoxTok(S,e)>0)}
function sw7BoxSet(R,term){const P=R.P;if(term)P.dataset.sw7Term=term;else delete P.dataset.sw7Term;R.sig="";sw7Fill(R);sw7Kick();
  let s=P.querySelector(":scope>.sw7-now");if(!term){if(s)s.remove();return}
  if(!s){s=document.createElement("button");s.type="button";s.className="sw7-now";s.innerHTML="歸<br>今";s.setAttribute("aria-label","回到現在的節氣");
    s.onclick=ev=>{ev.stopPropagation();if(typeof vibrate==="function")vibrate(5);sw7BoxSet(R,"");try{toast("回到今天的節氣："+sw7Term())}catch(z){}};
    ["pointerdown","touchstart","mousedown"].forEach(t=>s.addEventListener(t,ev=>ev.stopPropagation(),{passive:true}));P.append(s)}
  const x=SW7_SEA.find(z=>z[3]===term);s.title=x?"現在看的是"+x[1]+"天":""}
function sw7BoxClose(){document.querySelectorAll(".sw7-bxs,.sw7-bxp").forEach(e=>{e.classList.remove("open");setTimeout(()=>e.remove(),220)})}
function sw7BoxOpen(R,g,e){sw7Css();sw7BoxClose();const key=g+":"+e,nm=e==="classic"?"雲河驛站":(g==="port"?eraLabel(e)+"的渡口":eraLabel(e)+"的驛站"),era=e==="classic"?"雲河驛站":eraLabel(e);
  const sc=document.createElement("div"),pn=document.createElement("div");sc.className="sw7-bxs";pn.className="sw7-bxp";pn.setAttribute("role","dialog");pn.setAttribute("aria-label","四時風物匣");
  const draw=()=>{const S=sw7BoxSt(),pg=S.pg[key]||{},tok=sw7BoxTok(S,e),all=SW7_SEA.every(z=>pg[z[0]]),cur=R.P.dataset.sw7Term||"",po=SW7_POEM[e];
    pn.innerHTML=`<div class="sw7-bxh"><b>🧺 四時風物匣・${esc(nm)}</b><button type="button" class="sw7-bxx" aria-label="收起">✕</button></div>
      <div class="sw7-bxi"><img src="${SW7_BOX_IMG}" alt="打開的木匣，四格放著四季的風物">${SW7_SEA.map(([k,ji,thing,t,ic])=>{const c=SW7_BOX_CELL[k],has=!!pg[k];
        return`<button type="button" class="sw7-cell${has?" has":""}${cur===t?" cur":""}" data-s="${k}" style="left:${c[0]}%;top:${c[1]}%;width:${c[2]-c[0]}%;height:${c[3]-c[1]}%;--bx:${(c[0]/(100-(c[2]-c[0]))*100).toFixed(2)}%;--by:${(c[1]/(100-(c[3]-c[1]))*100).toFixed(2)}%;--bw:${(10000/(c[2]-c[0])).toFixed(1)}%" aria-label="${ji}・${thing}${has?"":"（還沒拿到）"}"><i></i>${has?"":`<em>${ji}</em>`}</button>`}).join("")}</div>
      <p class="sw7-bxt">${all?"四季的風物都收齊了！點一格，這裡就換成那一季。":`點拿到的風物，這裡就換成那一季；沒拿到的：真實的那一季來這裡就能拿到，或在${esc(era)}下贏 3 盤自己挑一個。`}</p>
      <p class="sw7-bxw">在${esc(era)}贏了 ${S.w[e]||0} 盤${tok?`，現在可以挑 <b>${tok}</b> 個`:`（每贏 3 盤可以挑一個）`}</p>
      ${all&&po?`<div class="sw7-poem">${po.ok?`<b>${esc(po.s)}</b><small>${esc(po.a)}</small><span>${esc(po.p)}</span>`:`<span>收齊四季，說書人要送你一句跟這裡有關的古詩，正在請先生核對，下次打開就看得到。</span>`}</div>`:""}
      ${cur?`<button type="button" class="btn ghost sw7-bxback">回到今天的節氣（${esc(sw7Term())}）</button>`:""}`;
    pn.querySelector(".sw7-bxx").onclick=()=>sw7BoxClose();
    const bk=pn.querySelector(".sw7-bxback");if(bk)bk.onclick=()=>{sw7BoxSet(R,"");sw7BoxClose()};
    pn.querySelectorAll(".sw7-cell").forEach(c=>c.onclick=()=>{const k=c.dataset.s,x=SW7_SEA.find(z=>z[0]===k),S2=sw7BoxSt(),pg2=S2.pg[key]||(S2.pg[key]={});if(typeof vibrate==="function")vibrate(5);
      if(pg2[k]){sw7BoxSet(R,x[3]);sw7BoxClose();try{toast(`${x[4]} 這裡換成了${x[1]}天`)}catch(z){}return}
      if(sw7BoxTok(S2,e)>0){const t=pn.querySelector(".sw7-bxt");if(!t)return;t.classList.remove("hint");   /* 確認放在面板裡（一般的 modal 會被面板蓋住） */
        t.innerHTML=`用「贏 3 盤」的機會，拿${esc(x[2])}（${x[1]}）？<span class="sw7-bxok"><button type="button" class="btn">拿這個</button><button type="button" class="btn ghost">先不要</button></span>`;
        const[yes,no]=t.querySelectorAll("button");no.onclick=()=>draw();
        yes.onclick=()=>{const S3=sw7BoxSt(),p3=S3.pg[key]||(S3.pg[key]={});if(p3[k]||sw7BoxTok(S3,e)<1)return draw();p3[k]=Date.now();S3.u[e]=(S3.u[e]||0)+1;store.set("sw7Box",S3);
          try{saveNow(true)}catch(z){}const b=R.P.querySelector(":scope>.sw7-box");if(b)sw7BoxDot(b,S3,e);draw();try{toast(`${x[4]} 收進了${x[2]}`)}catch(z){}};return}
      const t=pn.querySelector(".sw7-bxt");if(t){t.textContent=`真實的${x[1]}天來這裡就能拿到；或在${era}下贏 3 盤，自己挑一個。`;t.classList.add("hint")}})};
  draw();{const b=R.P.querySelector(":scope>.sw7-box");if(b)sw7BoxDot(b,sw7BoxSt(),e)}sc.onclick=()=>sw7BoxClose();document.body.append(sc,pn);requestAnimationFrame(()=>{sc.classList.add("open");pn.classList.add("open")});
  const off=()=>{sw7BoxClose();removeEventListener("hashchange",off)};addEventListener("hashchange",off)}

/* ---------- 開機：看 DOM、看前景背景 ---------- */
if(SW7_ON){try{
  if(window.IntersectionObserver)SW7.io=new IntersectionObserver(E=>{for(const e of E){const R=e.target._sw7;if(R)R.vis=e.isIntersecting}sw7Kick()});
  if(window.ResizeObserver)SW7.ro=new ResizeObserver(E=>{for(const e of E)for(const R of SW7.L)if(R.img===e.target)sw7Size(R)});
  new MutationObserver(()=>{if(SW7.q)return;SW7.q=1;const go=()=>{if(SW7.q)sw7Scan()};requestAnimationFrame(go);setTimeout(go,300)}).observe(document.body||document.documentElement,{childList:true,subtree:true});
  document.addEventListener("visibilitychange",()=>{if(!document.hidden){sw7Tick();sw7AnnLater(1500)}});
  addEventListener("hashchange",()=>sw7AnnLater(1800));
  if(document.readyState==="complete")sw7AnnLater(6000);else addEventListener("load",()=>sw7AnnLater(6000));
  sw7Scan()}catch(e){}}
/* 11/10 開發者「如果當時有下雨或下雪，對戰的時候也會出現，甚至讓畫面積雪」：3D 園子（park3d.js）開場時問這裡——
   這一朝現在下不下雨雪；跟渡口、棋鎮各頁同一份天氣（同一天同一時段、同一個地區），棋鎮（classic）算南方 "s"。設定關掉天氣就回 null。
   測試：主控台 window.__wxForce="rain"|"snow" 強制 */
window.XQ_PARKWX=e=>{try{if(window.__wxForce)return{t:window.__wxForce,a:1};if(!sw7On())return null;const q=e&&e!=="classic"?SW7_PAGES.find(x=>x.k==="port_"+e):null;return sw7Precip(sw7Term(),q&&q.rg||"s")}catch(x){return null}};
