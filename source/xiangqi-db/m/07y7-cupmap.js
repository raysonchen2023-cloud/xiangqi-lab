/* ================= 🏯 千秋盃「說書台金榜＋大掛盤」（41 案第 7 頁：Gemini 方案 1，Claude 依考究清單修正；考究說明 park/cupmap/考究說明.md，史學顧問核圖中）=================
   圖：park/cupmap/cup_day.png（對戰頁茶樓二樓說書台的近景：朱紅帳額、三扇空白屏風、說書桌上英雄帖和毛筆、台右空白大掛板、台下看座）、夜版 cup_night → art/cupmap/ → data/cupmap/。
   程式疊上去的：
     屏風三扇＝對陣金榜（照透視）：左扇、右扇各 8 位的紅紙名字，對陣線往中間收；中扇是決賽和擂主。還沒排籤時貼報名名單。字都由程式寫，圖上不畫字。
     大掛板＝大掛盤：比賽日掛上正在下的那一盤（挑輪次最高的；XQNet.fetchGame 讀最新局面），點了觀戰；平常掛開局的樣子。
     英雄帖：報了名就在帖上畫一個朱圈；點帖＝報名／點將／入座（照原本 06c 的按鈕）。
     比賽日（週六點將起）掛兩盞紅紗燈（不用宮燈）、帳額下一顆紅綵球；擂主出爐才灑紅紙屑和金箔（不放煙火光團）。平常冷清。
   角色：到說書桌前揮手（＝簽名）；比賽日在台下歡呼。原本 06c 的內容（報名、對陣表、規則、擂主碑）照舊放在下面。
   接 07w 走路（SHW_CP2）、07x 縮放。開關 CUP_MAP_ON；圖片網址帶 CP2_IMGV。包一層 CupPage
   11/9 各朝版（史學顧問盤查 C 類第 2 項；考究說明＋顧問核 park/cupmap/考究說明_各朝_1109.md）：照星槎停靠的朝代分 4 組換圖，判斷跟 07y hbDockEra() 一樣：
     han＝秦漢三國（土黃夯土牆、黑漆屏風、竹簡扁鼓、落地矮榻、耳杯）、weijin＝魏晉南北朝隋（麈尾、筌蹄、矮榻、青瓷碗）、tang＝唐五代（朱柱、團扇拍板、圈椅）；
     宋以後、沒停靠用原圖。圖 cup_day_<組>／cup_night_<組>（tools/era_cupgm.py 貼回原圖，金榜三扇、大掛板、英雄帖位置和原圖一樣，座標不用分組）。
     比賽日的兩盞燈也分組：han 青銅吊燈盞、weijin 青瓷吊燈盞、tang 白紗燈籠、宋以後紅紗燈；說明條目照組登記（物件寫 g:"han weijin"＝只在這幾組登記，cp2Sci） */
const CUP_MAP_ON=true;
const CP2_IMGV="2370";
const CP2_GRP={qin:"han",han:"han",sanguo:"han",weijin:"weijin",nanbei:"weijin",sui:"weijin",tang:"tang",wudai:"tang"};
const cp2Grp=()=>{let e="";try{e=typeof hbDockEra==="function"?hbDockEra():typeof sciDock==="function"?sciDock():""}catch(x){}return CP2_GRP[e]||""};
const cp2Img=(dk,g)=>xqClImg(`data/cupmap/${dk?"cup_night":"cup_day"}${g?"_"+g:""}.webp?v=${CP2_IMGV}`);
/* 圖上各物的四角（像素 768×1376；左上、右上、右下、左下） */
const CP2_SCR=[[[192,484],[258,487],[258,742],[192,738]],[[276,472],[494,472],[494,660],[276,660]],[[518,487],[583,484],[583,738],[518,742]]];
const CP2_BRD=[[575,562],[675,570],[674,800],[577,787]];
const CP2_BOOK=[[369,759],[425,759],[425,787],[369,787]];
const CP2_LAMP=[[150,228],[618,228]],CP2_BALL=[384,214];
/* 回饋 818：點畫裡的東西看說明（07w6-sceneinfo.js 的 sciPage；內容取自 park/cupmap/考究說明.md）。屏風、大掛板、英雄帖是入口本身，不登記；英雄帖放進 no（點了當空地），中間走道留給角色 */
/* 11/9 各朝版：說明裡 {{朝:…}}／{{<朝:…}} 照停靠朝代顯示（07w6 sciEraText）；宋以前三組（qin～wudai）剛好就是換了圖的三組，所以「{{<song:…}}」＝各朝版圖、「{{song:…}}」＝原圖。
   g:"han weijin"＝只在這幾組登記（沒寫＝每組都有；原圖那組叫 song），同一件東西各組圖上位置不同（茶碗）或樣子不同（燈）時分開寫，n 相同的共用「看過了沒」 */
const CP2_LAMP_S=[[[122,226],[178,226],[178,348],[122,348]],[[590,226],[646,226],[646,348],[590,348]]],cp2LampOn=P=>!!P.querySelector(".cp2-lamp");
const CP2_SCI={k:"cp2",nm:"千秋盃",it:[
  {n:"朱紅帳額",s:[[[85,66],[690,66],[690,206],[85,212]]],
   t:"台上方這塊朱紅的布叫「帳額」。整張畫大多是木頭色和淡墨，朱紅只用在帳額{{tang:{{<song:和前面兩根柱子}}}}，所以屏風上貼的紅紙名字特別醒目。比賽日，帳額下還會掛一顆紅綵球。"},
  {n:"說書台",nd:"{{<tang:說唱台}}{{tang:{{<song:歌台}}}}{{song:說書台}}",s:[[[250,748],[527,748],[527,906],[250,906]],[[333,662],[442,662],[442,750],[333,750]]],
   t:"{{<song:這是樓上的{{<tang:說唱台}}{{tang:歌台}}。{{<han:秦代宮中已經有俳優，在宴飲時說唱逗樂；}}{{han:{{<weijin:漢代宴飲時，常有俳優擊鼓說唱，四川出土的東漢說唱俑就抱著一面扁鼓；}}}}{{<weijin:桌上這面扁鼓就是說唱用的。}}{{weijin:{{<tang:魏晉名士喜歡清談，手裡常拿著一柄麈尾，桌上那柄圓圓、鑲一圈白毛的就是；桌後那個籐編的腰鼓形坐墩叫筌蹄。}}}}{{tang:唐代的酒樓叫「旗亭」，伶人在台上唱詩，桌上的拍板和團扇是唱曲的道具。}}{{<tang:桌子比那時候常見的矮案高一些，好讓報名用的帖子擺在顯眼的地方。}}}}{{song:說書台是說書人講故事的地方。{{song:宋代汴京的「瓦子」裡有五十多座大小勾欄，還有專門講歷史故事的藝人{{ming:；到了明代，南京的說書人柳敬亭一天只說一回，聽一回要一兩銀子}}。}}}}千秋盃就在這座{{<song:台}}{{song:說書台}}上開賽。"},
  {n:"屏風的楣板",s:[[[186,450],[264,450],[264,484],[186,484]],[[266,426],[507,426],[507,470],[266,470]],[[508,450],[594,450],[594,484],[508,484]]],
   t:"屏風最上面這條木板叫楣板，{{<weijin:黑漆底上用朱色畫著流動的雲氣紋}}{{weijin:{{<tang:畫著一片接一片的忍冬紋}}}}{{tang:{{<song:畫著一卷接一卷的卷草紋}}}}{{song:只雕卷草紋和回紋}}，沒有龍。龍是帝王的象徵，歷代多半不准百姓的房子、屏風{{<song:畫}}{{song:雕}}龍{{ming:，明代還寫進了規定}}。"},
  {n:"徽州茶樓",nd:"{{<tang:酒肆}}{{tang:{{<song:旗亭}}}}{{song:{{ming:徽州}}茶樓}}",s:[[[33,0],[84,0],[87,928],[28,928]],[[691,0],[746,0],[750,928],[688,928]],[[80,208],[152,208],[152,402],[80,402]],[[626,208],[702,208],[702,402],[626,402]],[[84,478],[152,478],[152,662],[84,662]],[[634,478],[692,478],[692,662],[634,662]]],
   t:"這座樓和對戰頁天井那張大圖是同一座。二樓正中是{{<tang:說唱台}}{{tang:{{<song:歌台}}}}{{song:說書台}}，兩旁的{{<song:直欞窗}}{{song:格扇窗}}、粗木柱和朱紅帳額，都和天井那張大圖一樣。",
   tn:"這座樓和對戰頁天井那張大圖是同一座。散場後的夜裡，月光從兩側的{{<song:直欞窗}}{{song:格扇窗}}照進來，台上留下一{{<song:條一條}}{{song:格一格}}的窗影。"},
  {n:"台下看座",s:[[[0,1034],[312,1034],[312,1376],[0,1376]],[[478,1034],[768,1034],[768,1376],[478,1376]]],
   t:"台下{{<tang:一排排鋪著草蓆的矮榻是看座，那時候的人跪坐、盤坐在榻上，還不坐高凳}}{{tang:一排排長凳是看座}}，坐在這裡，視線一路看到屏風上的金榜。平常日子只有空{{<tang:榻}}{{tang:凳子}}，冷冷清清；到了比賽日才掛燈、掛綵球，熱鬧起來。"},
  {n:"茶碗",nd:"耳杯",g:"han",s:[[29,1180,22],[63,1206,24],[700,1228,22],[740,1246,24]],
   t:"台下矮案上擺著紅黑兩色的漆耳杯。{{<han:秦人}}{{han:漢代人}}喝酒用耳杯，在酒肆裡看台上說唱、看棋，是很熱鬧的事。"},
  {n:"茶碗",nd:"青瓷碗",g:"weijin",s:[[62,1200,22],[100,1224,24],[712,1196,22],[750,1220,24]],
   t:"台下矮几上是幾隻青瓷碗。兩晉{{nanbei:南朝}}的越窯青瓷很流行，這裡用它盛茶湯。"},
  {n:"茶碗",g:"tang",s:[[28,1166,24],[62,1196,26],[714,1172,24],[752,1200,26]],
   t:"台下小桌上擺著白瓷茶碗。唐代開元以後，城裡開了許多煎茶賣茶的店鋪；在旗亭裡喝茶、聽曲、看棋，是很熱鬧的事。"},
  {n:"茶碗",g:"song",s:[[28,1166,24],[62,1196,26],[714,1172,24],[752,1200,26]],
   t:"在茶樓喝茶看棋，是很熱鬧的事。象棋名家胡榮華回憶 1950 年代的上海：豫園的得意樓上泡一壺茶就能看象棋，高手還用大棋盤表演對局。這裡是把那份熱鬧借進來。"},
  {n:"紅紗燈",fe:"song",g:"song",on:cp2LampOn,s:CP2_LAMP_S,
   t:"比賽日才掛起的兩盞紅燈。宮燈是宮廷裡用的東西，民間的酒樓、茶樓不用宮燈。"},
  {n:"白紗燈",fe:"tang",g:"tang",on:cp2LampOn,s:CP2_LAMP_S,
   t:"比賽日才掛起的兩盞白紗燈籠，竹骨上蒙一層白紗，裡面點著燈。唐代的上元燈節已經很熱鬧。民間的酒樓不用宮燈，宮燈是宮廷裡用的東西。"},
  {n:"吊燈盞",g:"han weijin",on:cp2LampOn,s:CP2_LAMP_S,
   t:"比賽日才吊起的兩盞{{<weijin:青銅}}{{weijin:青瓷}}燈盞：細鏈吊著一隻淺淺的燈盞，盞裡點著一朵小火苗。那時候還沒有紙燈籠，照明用的是燈盞。"}],
  no:[CP2_BOOK]};
/* 這一組要登記的物件（g 沒寫＝每組都有；原圖那組＝song） */
const cp2Sci=g=>Object.assign({},CP2_SCI,{it:CP2_SCI.it.filter(x=>!x.g||x.g.split(" ").includes(g||"song"))});
const SHW_CP2={el:40,h:[.085,70,.0012],look0:[50,40],home:"home",N:{home:[50,96],mid:[50,86],top:[50,78]},E:"home-mid mid-top",
  HS:{cp2Book:["top",51,57,"wave"],cp2Scr:["mid",50,42,"idle"],cp2Brd:["top",81,49,"idle"]}};
const cp2Pc=(x,y)=>[(x/7.68).toFixed(2),(y/13.76).toFixed(2)];
const cp2Dark=()=>{const t=store.get("pageTheme","auto"),h=new Date().getHours();return t==="dark"||(t==="auto"&&matchMedia("(prefers-color-scheme: dark)").matches)||h>=19||h<5};
function cp2M3(w,h,q){const[[x0,y0],[x1,y1],[x2,y2],[x3,y3]]=q,dx1=x1-x2,dx2=x3-x2,dx3=x0-x1+x2-x3,dy1=y1-y2,dy2=y3-y2,dy3=y0-y1+y2-y3,den=dx1*dy2-dx2*dy1;
  const g=(dx3*dy2-dx2*dy3)/den,hh=(dx1*dy3-dx3*dy1)/den,a=x1-x0+g*x1,b=x3-x0+hh*x3,d=y1-y0+g*y1,e=y3-y0+hh*y3;
  return`matrix3d(${a/w},${d/w},0,${g/w},${b/h},${e/h},0,${hh/h},0,0,1,0,${x0},${y0},0,1)`}
function cp2Css(){if(document.getElementById("cp2Css"))return;const s=document.createElement("style");s.id="cp2Css";s.textContent=`
.cp2-page{margin:0 0 10px}
.cp2-fx{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.cp2-q{position:absolute;left:0;top:0;transform-origin:0 0;overflow:hidden}
.cp2-q svg{display:block;width:100%;height:100%}
.cp2-night .cp2-q{filter:brightness(.78)}
.cp2-lamp{position:absolute;width:6.5%;transform:translate(-50%,0);transform-origin:50% 0;animation:cp2Sway 5s ease-in-out infinite}
.cp2-lamp svg{display:block;width:100%;height:auto;filter:drop-shadow(0 0 6px rgba(255,120,80,.55))}
.cp2-lamp:nth-of-type(2){animation-delay:-2.2s}
.cp2-lamp.g-han svg,.cp2-lamp.g-weijin svg,.cp2-lamp.g-tang svg{filter:drop-shadow(0 0 6px rgba(255,200,120,.6))}
@keyframes cp2Sway{0%,100%{transform:translate(-50%,0) rotate(-2deg)}50%{transform:translate(-50%,0) rotate(2deg)}}
.cp2-ball{position:absolute;width:15%;transform:translate(-50%,-30%)}
.cp2-ball svg{display:block;width:100%;height:auto}
.cp2-rain i{position:absolute;top:-4%;display:block;width:7px;height:5px;background:var(--c);animation:cp2Fall linear infinite;opacity:.95}
.cp2-rain i.g{width:6px;height:6px;border-radius:1px;box-shadow:0 0 3px rgba(255,220,120,.8)}
@keyframes cp2Fall{0%{transform:translate(0,0) rotate(0)}100%{transform:translate(-4vw,108vh) rotate(540deg)}}
.cp2-page .shp-spot.cp2-tag b{white-space:nowrap}
@media (prefers-reduced-motion:reduce){.cp2-lamp,.cp2-rain i{animation:none}.cp2-rain{display:none}}`;document.head.append(s)}
/* 紅紗燈（茶樓用的，不是宮燈）＋紅綵球 */
const CP2_LAMP_SVG='<svg viewBox="0 0 30 70" aria-hidden="true"><path d="M15 0V9" stroke="#3a2a1c" stroke-width="1"/><rect x="9" y="8" width="12" height="3" rx="1" fill="#2b2016"/><path d="M15 11C26 11.5 27 45 15 47C3 45 4 11.5 15 11Z" fill="#c8402c" stroke="#5a1e12" stroke-width="1"/><path d="M15 11.5V46.5M10 12.5C7 22 7 36 10 46M20 12.5C23 22 23 36 20 46" fill="none" stroke="rgba(90,30,16,.4)" stroke-width=".7"/><ellipse cx="15" cy="27" rx="7" ry="12" fill="rgba(255,214,150,.45)"/><rect x="9.5" y="46" width="11" height="3" rx="1" fill="#2b2016"/><path d="M12 49V64M15 49V67M18 49V64" stroke="#b8322a" stroke-width="1.2"/></svg>';
/* 11/9 各朝版的燈（顧問核：照對戰頁同組）：唐以前還沒有紙燈籠，用三條細鏈吊一只淺燈盞、點一朵小火苗（han 青銅、weijin 青瓷）；唐五代是竹骨白紗燈籠 */
const cp2Bowl=(c,s)=>`<svg viewBox="0 0 30 70" aria-hidden="true"><path d="M15 0V7M15 7L6.5 50M15 7V49.5M15 7L23.5 50" stroke="#4a3e2c" stroke-width=".8" stroke-dasharray="1.6 .7" fill="none"/><circle cx="15" cy="7" r="1.3" fill="none" stroke="#4a3e2c" stroke-width=".8"/><ellipse cx="15" cy="45" rx="8" ry="7" fill="rgba(255,205,120,.35)"/><path d="M15 39.5C17.8 43.5 17.8 47.5 15 50C12.2 47.5 12.2 43.5 15 39.5Z" fill="#ffc760"/><path d="M15 43.5C16.1 45.5 16.1 47.8 15 49.3C13.9 47.8 13.9 45.5 15 43.5Z" fill="#fff3cf"/><path d="M4.5 49.5H25.5C24.6 56 20.6 59.5 15 59.5C9.4 59.5 5.4 56 4.5 49.5Z" fill="${c}" stroke="${s}" stroke-width=".9"/><path d="M6.5 52.5C9 55 12 56 15 56" fill="none" stroke="rgba(255,255,255,.28)" stroke-width=".9"/><ellipse cx="15" cy="49.6" rx="10.5" ry="1.6" fill="rgba(40,30,20,.35)" stroke="${s}" stroke-width=".6"/><rect x="13.6" y="59.3" width="2.8" height="2" rx=".6" fill="${s}"/></svg>`;
const CP2_LAMPS={"":CP2_LAMP_SVG,han:cp2Bowl("#7c6c40","#3e3420"),weijin:cp2Bowl("#9fc2aa","#4c6c58"),
  tang:'<svg viewBox="0 0 30 70" aria-hidden="true"><path d="M15 0V9" stroke="#3a2a1c" stroke-width="1"/><rect x="9" y="8" width="12" height="3" rx="1" fill="#6a4a28"/><path d="M15 11C26 11.5 27 45 15 47C3 45 4 11.5 15 11Z" fill="#f2ede0" stroke="#6a5a44" stroke-width="1"/><path d="M15 11.5V46.5M10 12.5C7 22 7 36 10 46M20 12.5C23 22 23 36 20 46M6 22H24M5.5 30H24.5M6 38H24" fill="none" stroke="rgba(110,84,50,.38)" stroke-width=".7"/><ellipse cx="15" cy="28" rx="7.5" ry="12.5" fill="rgba(255,214,140,.55)"/><rect x="9.5" y="46" width="11" height="3" rx="1" fill="#6a4a28"/><path d="M15 49V62" stroke="#8a6a42" stroke-width="1"/></svg>'};
const CP2_BALL_SVG='<svg viewBox="0 0 120 70" aria-hidden="true"><path d="M2 6C25 26 40 30 48 30M118 6C95 26 80 30 72 30" fill="none" stroke="#c23a2a" stroke-width="6" stroke-linecap="round"/><path d="M2 6C25 26 40 30 48 30M118 6C95 26 80 30 72 30" fill="none" stroke="rgba(255,190,170,.4)" stroke-width="2"/><circle cx="60" cy="34" r="15" fill="#c8402c" stroke="#6a2216" stroke-width="1.2"/><path d="M47 28C55 34 65 34 73 28M46 38C55 44 65 44 74 38M60 19C54 27 54 41 60 49M60 19C66 27 66 41 60 49" fill="none" stroke="rgba(110,30,18,.55)" stroke-width="1.2"/><path d="M54 49L50 68M60 49V70M66 49L70 68" stroke="#c23a2a" stroke-width="2.4" stroke-linecap="round"/></svg>';
/* 名字縮成三個字以內（紅紙窄） */
const cp2Nm=p=>{if(!p)return"";if(p.none)return"從缺";const n=String(lbnShow(p)||"").trim();return n.length>4?n.slice(0,3)+"…":n};
/* 屏風一扇：8 位（4 組）＋對陣線往內收；side＝"l"（線往右收）或 "r"（線往左收） */
function cp2Side(side,P8,win){const W=100,H=380,rows=8,top=18,step=(H-top*2)/(rows-1),nx=side==="l"?4:46,nw=50,j1=side==="l"?62:38,j2=side==="l"?78:22,j3=side==="l"?96:4;
  let s=`<rect x="0" y="0" width="${W}" height="${H}" fill="none"/>`;
  const yOf=i=>top+i*step,ln=(a,b,c,d,on)=>`<path d="M${a} ${b}H${c}V${d}" fill="none" stroke="${on?"#b8322a":"rgba(50,34,20,.65)"}" stroke-width="${on?2.4:1.4}"/>`;
  for(let i=0;i<rows;i++){const p=P8[i],y=yOf(i),w=win.r1&&p&&win.r1.includes(p.id);
    s+=`<rect x="${nx}" y="${y-13}" width="${nw}" height="26" rx="2" fill="${p?(w?"#c8402c":"#d8705a"):"rgba(216,112,90,.25)"}" stroke="rgba(90,30,16,.5)" stroke-width=".8"/>`;
    if(p)s+=`<text x="${nx+nw/2}" y="${y+5.5}" text-anchor="middle" font-size="15" font-weight="800" fill="${w?"#fff6dc":"#2a160c"}" font-family="var(--kai,serif)">${esc(cp2Nm(p))}</text>`;
    const x0=side==="l"?nx+nw:nx;s+=`<path d="M${x0} ${y}H${j1}" stroke="${w?"#b8322a":"rgba(50,34,20,.65)"}" stroke-width="${w?2.4:1.4}" fill="none"/>`}
  for(let k=0;k<4;k++){const a=yOf(2*k),b=yOf(2*k+1),m=(a+b)/2,on=win.r2&&win.r2[k];s+=`<path d="M${j1} ${a}V${b}" stroke="rgba(50,34,20,.65)" stroke-width="1.4"/>`+`<path d="M${j1} ${m}H${j2}" stroke="${on?"#b8322a":"rgba(50,34,20,.65)"}" stroke-width="${on?2.4:1.4}"/>`}
  for(let k=0;k<2;k++){const a=(yOf(4*k)+yOf(4*k+1))/2,b=(yOf(4*k+2)+yOf(4*k+3))/2,on=win.r3&&win.r3[k];s+=`<path d="M${j2} ${a}V${b}" stroke="rgba(50,34,20,.65)" stroke-width="1.4"/>`+`<path d="M${j2} ${(a+b)/2}H${j3}" stroke="${on?"#b8322a":"rgba(50,34,20,.65)"}" stroke-width="${on?2.4:1.4}"/>`}
  s+=`<path d="M${j3} ${(yOf(0)+yOf(1)+yOf(2)+yOf(3))/4}V${(yOf(4)+yOf(5)+yOf(6)+yOf(7))/4}" stroke="rgba(50,34,20,.65)" stroke-width="1.4"/>`;
  return`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${s}</svg>`}
/* 中扇：兩位決賽者、擂主 */
function cp2Mid(fa,fb,ch,ttl){const W=300,H=260,box=(x,y,w,h,p,big,on)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${p?(on?"#c8402c":"#d8705a"):"rgba(216,112,90,.22)"}" stroke="rgba(90,30,16,.55)" stroke-width="1"/>`+(p?`<text x="${x+w/2}" y="${y+h/2+(big?9:6)}" text-anchor="middle" font-size="${big?26:17}" font-weight="900" fill="${on?"#fff6dc":"#2a160c"}" font-family="var(--kai,serif)">${esc(cp2Nm(p))}</text>`:"");
  return`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><text x="150" y="26" text-anchor="middle" font-size="18" font-weight="900" fill="#3a2010" font-family="var(--kai,serif)" letter-spacing="3">${esc(ttl)}</text>
    <path d="M0 150H70M300 150H230M110 150V112H190V150" fill="none" stroke="rgba(50,34,20,.65)" stroke-width="1.6"/><path d="M150 112V98" stroke="${ch?"#b8322a":"rgba(50,34,20,.65)"}" stroke-width="${ch?3:1.6}"/>
    ${box(20,132,90,36,fa,0,ch&&fa&&ch.id===fa.id)}${box(190,132,90,36,fb,0,ch&&fb&&ch.id===fb.id)}${box(85,44,130,54,ch,1,1)}
    <text x="150" y="196" text-anchor="middle" font-size="14" fill="#4a3020" font-family="var(--serif,serif)">${ch?"本週擂主":"擂主虛位以待"}</text></svg>`}
/* 大掛盤：棋盤＋棋子＋兩位棋手 */
function cp2Board(fen,red,blk,cap){const W=200,H=450,ox=22,oy=74,c=19.5;let g="";
  for(let i=0;i<9;i++)g+=`<line x1="${ox+i*c}" y1="${oy}" x2="${ox+i*c}" y2="${oy+(i%8?4:9)*c}"/>`+(i%8?`<line x1="${ox+i*c}" y1="${oy+5*c}" x2="${ox+i*c}" y2="${oy+9*c}"/>`:"");
  for(let j=0;j<10;j++)g+=`<line x1="${ox}" y1="${oy+j*c}" x2="${ox+8*c}" y2="${oy+j*c}"/>`;
  g+=`<path d="M${ox+3*c} ${oy}L${ox+5*c} ${oy+2*c}M${ox+5*c} ${oy}L${ox+3*c} ${oy+2*c}M${ox+3*c} ${oy+7*c}L${ox+5*c} ${oy+9*c}M${ox+5*c} ${oy+7*c}L${ox+3*c} ${oy+9*c}"/>`;
  let b=null;try{b=parseFen(fen||START)}catch(e){b=parseFen(START)}let p="";
  for(let k=0;k<90;k++){const x=b[k];if(!x)continue;const r=x===x.toUpperCase(),n=NAMES[r?"r":"b"][x.toUpperCase()]||"";const cx=ox+(k%9)*c,cy=oy+Math.floor(k/9)*c;
    p+=`<circle cx="${cx}" cy="${cy}" r="8.6" fill="#f1e2bf" stroke="${r?"#b8322a":"#2a2420"}" stroke-width="1.3"/><text x="${cx}" y="${cy+4.2}" text-anchor="middle" font-size="11.5" font-weight="900" fill="${r?"#b8322a":"#2a2420"}" font-family="var(--kai,serif)">${n}</text>`}
  const nm=(t,y,col)=>t?`<text x="100" y="${y}" text-anchor="middle" font-size="15" font-weight="800" fill="${col}" font-family="var(--kai,serif)">${esc(t)}</text>`:"";
  return`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><rect x="6" y="6" width="${W-12}" height="${H-12}" fill="rgba(244,232,206,.92)" stroke="rgba(90,60,30,.5)"/>
    ${nm(blk,48,"#2a2420")}<g stroke="#5a3a1c" stroke-width="1" fill="none">${g}</g><text x="${ox+2*c}" y="${oy+4.5*c+5}" font-size="12" fill="#5a3a1c" text-anchor="middle" font-family="var(--kai,serif)">楚河</text><text x="${ox+6*c}" y="${oy+4.5*c+5}" font-size="12" fill="#5a3a1c" text-anchor="middle" font-family="var(--kai,serif)">漢界</text>${p}
    ${nm(red,oy+9*c+34,"#b8322a")}<text x="100" y="${H-30}" text-anchor="middle" font-size="12.5" fill="#4a3020" font-family="var(--serif,serif)">${esc(cap)}</text></svg>`}
/* 線上對局的著法 → 局面（著法是 {f,t} 或 [f,t]，0～89） */
function cp2Fen(g){const b=parseFen(START);for(const m of(g&&g.moves)||[]){const f=m&&(m.f!=null?m.f:m[0]),t=m&&(m.t!=null?m.t:m[1]);if(f==null||t==null||!b[f])continue;b[t]=b[f];b[f]=null}
  let s="";for(let r=0;r<10;r++){let e=0;for(let c=0;c<9;c++){const x=b[r*9+c];if(!x)e++;else{if(e){s+=e;e=0}s+=x}}if(e)s+=e;if(r<9)s+="/"}return s}
function cp2Wrap(v,R){if(!CUP_MAP_ON||!window.XQNet||!v.querySelector("#cupb"))return R;cp2Css();
  const dk=cp2Dark(),grp=cp2Grp(),P=document.createElement("div");P.className="shp-page cq cp2-page"+(dk?" cp2-night":"");
  P.innerHTML=`<img src="${cp2Img(dk,grp)}" alt="${grp==="tang"?"旗亭樓上的歌台":grp?"酒肆樓上的說唱台":"茶樓二樓的說書台"}"><div class="cp2-fx" aria-hidden="true">
      ${CP2_SCR.map((q,i)=>`<div class="cp2-q" data-q="s${i}" style="width:${i===1?300:100}px;height:${i===1?260:380}px"></div>`).join("")}
      <div class="cp2-q" data-q="b" style="width:200px;height:450px"></div><div class="cp2-q" data-q="k" style="width:120px;height:60px"></div><div class="cp2-deco"></div></div>
    <button class="shp-spot cp2-tag" id="cp2Scr" style="left:${cp2Pc(385,405)[0]}%;top:${cp2Pc(385,405)[1]}%"><b>對陣金榜</b></button>
    <button class="shp-spot cp2-tag" id="cp2Book" style="left:${cp2Pc(397,840)[0]}%;top:${cp2Pc(397,840)[1]}%"><b>英雄帖</b></button>
    <button class="shp-spot cp2-tag" id="cp2Brd" style="left:${cp2Pc(625,850)[0]}%;top:${cp2Pc(625,850)[1]}%"><b>大掛盤</b></button>`;
  v.insertBefore(P,v.firstChild);
  const Q=k=>P.querySelector(`[data-q="${k}"]`),fit=()=>{const k=P.clientWidth/768;if(!k)return;const sc=q=>q.map(([x,y])=>[x*k,y*k]);
    CP2_SCR.forEach((q,i)=>{Q("s"+i).style.transform=cp2M3(i===1?300:100,i===1?260:380,sc(q))});Q("b").style.transform=cp2M3(200,450,sc(CP2_BRD));Q("k").style.transform=cp2M3(120,60,sc(CP2_BOOK))};
  if(window.ResizeObserver){const ro=new ResizeObserver(()=>{if(!P.isConnected){ro.disconnect();return}fit()});ro.observe(P)}
  let feat="",featG=null,featAt=0;
  const draw=()=>{if(!P.isConnected)return;let S=null;try{S=XQNet.cup()}catch(e){}const me=(()=>{try{return meInfo().id}catch(e){return""}})();
    const ms=S&&S.m&&S.order?S.order.map(id=>S.m[id]).filter(Boolean):[],R1=ms.filter(m=>m.r===1);
    let L=[],Rr=[],win={l:{},r:{}},fa=null,fb=null,ch=null;
    if(R1.length){const pl=R1.flatMap(m=>[m.a,m.b]);L=pl.slice(0,8);Rr=pl.slice(8,16);
      const W=r=>ms.filter(m=>m.r===r&&m.w);
      const w1=new Set(W(1).map(m=>m.w)),w2=new Set(W(2).map(m=>m.w));
      for(const[s,arr]of[["l",L],["r",Rr]]){win[s].r1=arr.filter(p=>p&&w1.has(p.id)).map(p=>p.id);
        win[s].r2=[0,1,2,3].map(k=>arr.slice(2*k,2*k+2).some(p=>p&&w1.has(p.id)));
        win[s].r3=[0,1].map(k=>arr.slice(4*k,4*k+4).some(p=>p&&w2.has(p.id)))}
      const F=ms.find(m=>m.r===4);if(F){fa=F.a;fb=F.b}ch=S.champ||null}
    else if(S&&S.reg){const reg=S.reg.slice(0,16);L=reg.slice(0,8);Rr=reg.slice(8,16)}
    const pad=a=>{a=a.slice(0,8);while(a.length<8)a.push(null);return a};
    Q("s0").innerHTML=cp2Side("l",pad(L),win.l);Q("s2").innerHTML=cp2Side("r",pad(Rr),win.r);
    Q("s1").innerHTML=cp2Mid(fa,fb,ch,S?(cupNm(S.name)+(S.ed?` 第 ${S.ed} 屆`:"")):"千秋盃");
    /* 英雄帖：報了名畫朱圈 */
    const ri=S&&S.reg?S.reg.findIndex(r=>r.id===me):-1;
    Q("k").innerHTML=ri>=0?'<svg viewBox="0 0 120 60"><ellipse cx="88" cy="30" rx="16" ry="12" fill="none" stroke="#b8322a" stroke-width="3.2" stroke-dasharray="90 8" transform="rotate(-14 88 30)"/></svg>':"";
    /* 大掛盤：比賽中挑輪次最高的那盤 */
    const live=ms.filter(m=>m.st==="live"&&m.gid).sort((a,b)=>b.r-a.r)[0];
    if(live&&(live.gid!==feat||Date.now()-featAt>15000)){feat=live.gid;featAt=Date.now();XQNet.fetchGame(live.gid,5000).then(g=>{if(g&&g.gid===feat){featG=g;paintB()}}).catch(()=>{})}
    if(!live){feat="";featG=null}
    const paintB=()=>{const lv=ms.find(m=>m.gid===feat&&m.st==="live");if(lv&&featG)Q("b").innerHTML=cp2Board(cp2Fen(featG),lbnShow(featG.red&&featG.red.name?featG.red:lv.a||{}),lbnShow(featG.black&&featG.black.name?featG.black:lv.b||{}),`${CUP_RN[lv.r]||""}・點一下觀戰`);
      else Q("b").innerHTML=cp2Board(START,"","",S&&S.ph==="play"?"等下一盤開打":"週六開擂後，掛上正在下的對局")};
    paintB();
    /* 比賽日：紅紗燈、紅綵球；擂主出爐才灑紅紙屑、金箔 */
    const day=S&&["ck","play","done"].includes(S.ph),deco=P.querySelector(".cp2-deco");let h="";
    if(day){h+=CP2_LAMP.map(([x,y])=>`<span class="cp2-lamp${grp?" g-"+grp:""}" style="left:${cp2Pc(x,y)[0]}%;top:${cp2Pc(x,y)[1]}%">${CP2_LAMPS[grp]||CP2_LAMP_SVG}</span>`).join("")+`<span class="cp2-ball" style="left:${cp2Pc(...CP2_BALL)[0]}%;top:${cp2Pc(...CP2_BALL)[1]}%">${CP2_BALL_SVG}</span>`}
    if(S&&S.ph==="done"&&S.champ){let r="";for(let i=0;i<34;i++){const g=i%3===0;r+=`<i class="${g?"g":""}" style="left:${(i*37)%100}%;--c:${g?"#e8c25a":"#c8402c"};animation-duration:${5+(i%5)}s;animation-delay:-${(i*.53%6).toFixed(2)}s"></i>`}h+=`<span class="cp2-rain" style="position:absolute;inset:0">${r}</span>`}
    if(deco.dataset.h!==h){deco.innerHTML=h;deco.dataset.h=h}
    const cheer=S&&["play","done"].includes(S.ph);try{const c=P._shwCfg;if(c)c.HS.cp2Scr[3]=cheer?"cheer":"idle"}catch(e){}
    fit()};
  const box=v.querySelector("#cupb"),press=sel=>{const b=box&&box.querySelector(sel);if(b){b.click();return true}return false},show=()=>{try{box.scrollIntoView({behavior:"smooth",block:"start"})}catch(e){}};
  /* 回饋 833（開發者 11/9：四頁也改成一對一）：點圖上的東西＝面板只看那一塊，標題換成入口名（照 832 我的戰績的做法）。#cupb 每 20 秒整個重畫，所以用 CSS 照排列位置分塊，不在元素上做記號：
     英雄帖（book）＝上面的橫幅、報名／點將／入座那一段，加上「比賽規則」「家長看這裡」兩張摺卡（規則沒有自己的入口，歸給英雄帖：帖上本來就寫賽制）；
     對陣金榜（scr）＝各輪對陣（第一個 .sec-t 起到規則之前），加上最下面的「千秋擂主碑」（擂主碑也沒有自己的入口，歸給金榜：中扇寫的就是擂主）。
     英雄帖照舊：有報名、點將、入座的鈕就直接按；大掛盤照舊：有正在下的那盤就觀戰，沒有就只跳一行說明，不開面板（掛盤本身就是那一盤棋，沒有另外的內容）。
     面板上記 data-cp2＝目前那一塊；收起（class 沒了 open）就拿掉 data-cp2、標題換回頁名。面板是 07w 的 xqSheetAuto 晚一點（0～700ms）才建的，所以點的當下才去拿；還沒建好就照舊捲過去 */
  if(!document.getElementById("cp2OneCss")){const s=document.createElement("style");s.id="cp2OneCss";s.textContent=`.xqs[data-cp2="book"] #cupb>:is(.sec-t,.sec-t~*):not(details){display:none}
.xqs[data-cp2="scr"] #cupb>:not(.sec-t):not(.sec-t~*),.xqs[data-cp2="scr"] #cupb>details{display:none}`;document.head.append(s)}
  const one=(k,t)=>{const X=v.querySelector(".xqs"),S=X&&X._S;if(!S||!box||!X.contains(box))return false;
    if(!X._cp2Mo){X._cp2T0=X.querySelector(".xqs-h b").textContent;X._cp2Mo=new MutationObserver(()=>{if(!X.classList.contains("open")&&X.dataset.cp2){delete X.dataset.cp2;S.title(X._cp2T0)}});X._cp2Mo.observe(X,{attributes:true,attributeFilter:["class"]})}
    X.dataset.cp2=k;S.open(null,t);return true};
  P.querySelector("#cp2Book").onclick=()=>{if(!press("#cuJ")&&!press("#cuK")&&!press("#cuR")&&!one("book","英雄帖"))show()};
  P.querySelector("#cp2Scr").onclick=()=>{const t=box&&box.querySelector(".sec-t");
    if(!t){toast("還沒有排出對陣，週六點將截止後就會貼上金榜");return}
    const br=!!box.querySelector(":scope>.sec-t:not(details~*)");   /* 有各輪對陣嗎（沒有的話面板裡只有擂主碑） */
    if(!one("scr","對陣金榜")){try{t.scrollIntoView({behavior:"smooth",block:"start"})}catch(e){}return}
    if(!br)toast("還沒有排出對陣，週六點將截止後就會貼上金榜；先看看歷屆擂主")};
  P.querySelector("#cp2Brd").onclick=()=>{if(feat){XQNet.watch(feat);location.hash="#/pvp";return}let S=null;try{S=XQNet.cup()}catch(e){}
    toast(S&&S.ph==="play"?"這會兒沒有正在下的對局，下一盤開打就掛上來，點一下觀戰":"週六開擂後，大掛盤會掛上正在下的對局，點一下就能觀戰")};
  draw();const offs=[XQNet.on("cup",draw)],t=setInterval(draw,20000);
  const cfg=Object.assign({},SHW_PG0,SHW_CP2,{HS:Object.assign({},SHW_CP2.HS,{cp2Scr:SHW_CP2.HS.cp2Scr.slice()})});P._shwCfg=cfg;
  {let S=null;try{S=XQNet.cup()}catch(e){}if(S&&["play","done"].includes(S.ph))cfg.HS.cp2Scr[3]="cheer"}
  if(!P.dataset.shw){try{if(typeof shwPage==="function"&&typeof SHIP_WALK_ON!=="undefined"&&SHIP_WALK_ON)shwPage(v,cfg,"cp2")}catch(e){}}
  if(typeof shpFit==="function")shpFit(v);
  try{if(typeof zmPage==="function")zmPage(v)}catch(e){}
  try{if(typeof sciPage==="function")sciPage(v,cp2Sci(grp))}catch(e){}
  const st0=R&&R.stop;return Object.assign({},R,{stop:()=>{offs.forEach(f=>{try{f()}catch(e){}});clearInterval(t);if(st0)st0()}})}
if(typeof CupPage==="function"){const f0=CupPage;CupPage=function(v){const R=f0.apply(this,arguments);try{return cp2Wrap(v,R)}catch(e){return R}}}
