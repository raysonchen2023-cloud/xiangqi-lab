/* ================= 🔋 平日體力：定軌力（紅）＋星芒（藍）＋化墨退場（開發者 11/13 選定）=================
   規格：story/新手體驗定案_141_兩輪討論.md 第十四節「七星平日的體力與靈力」、「開發者 11/13 選定（第 145、146 題）」、「化墨退場規格」，第二十四節「首頁角色體力」。
   跟黑洞裡的元氣／靈力分開（那是 07bht-td.js 的 BHTD）。
   定軌力（紅，DGL_MAX）：
     人間、星槎、不算的頁（dglZone）：原則照開發者 11/13 更正「船艙是下船後，有人間時辰；只有在船上才雲河無歲月」——
       星槎＝07w8-shichen.js CLK_SHIP_RE 那一組（甲板 #/adventure、#/ship/…、星槎千秋殘局解題頁 #/canju/s/、q/、e/5/、千秋穿梭 #/qqev、千秋穿梭過場 .travel.qq）再加船艙書架讀書 #/shelf/…；
       不算（不扣也不回）＝線上大廳、對戰、觀戰、千秋盃、殘篇閣、設定、意見回饋、週報、條款、我的角色頁；其他都是人間（渡口、園子、驛站、擂台、首頁、書院、茶樓、雅間…）。
       黑洞對局（塔防、星淵急襲、黑洞對戰）＝"bh"：開發者 11/14 選 Claude 修正版（story/黑洞塔防爽度_Gemini提案與審查_1114.md），照人間每分鐘扣 DGL_DRAIN、扣到 0 照樣等那盤下完化墨退場；路由不擋，入口另外關（dglBhLock）。
     人間畫面亮著每分鐘扣 DGL_DRAIN；星槎上不扣、每分鐘回 DGL_SHIP；切到背景不算。關掉 App 再開＝回滿（只放在記憶體 DGL.s，不存檔）。
     下完一盤（xq-result）、解完一題（包一層 addXP，解題類 DGL_PUZ_WHY，3 秒內只算一次）各回 2；黑洞過關回 DGL_BH（包一層 07bh bhGameEnd；練習賽、序局不算），
     但一天最多靠黑洞回 DGL_BH_DAY（日界照人間時辰：子時起算，dglDay；用了多少記在 store "dgl".bd，跟存檔走）。定軌力用完（due／out／歸零）＝黑洞入口也關（dglBhLock：觀星臺渾儀、星槎星淵、關卡卡片、再刷都問這裡）。
   化墨退場：在人間扣到 0 → 記 due；正在下的那盤、正在解的那題照常下完（結果視窗出來 2.5 秒後、或離開對局頁才算），才播化墨（約 2 秒）、自動回星槎；
     之後 out：人間的頁先關著（02-shell.js route() 開頭呼叫 dglRouteGate，擋下來回星槎）；首頁、書院／茶樓、棋譜、百科、戰績（DGL_OPEN_RE）照開，免得線上大廳、千秋盃走不到；
     在星槎上回到 DGL_BACK 才能再下船。家長時段（07m5）照舊先擋，這裡不碰。
   星芒（藍，store "dgl".x，跟存檔走 05b JOURNEY_KEYS 的 m_dgl）：解殘局（解題類）、主線過關（闖關）各 +1，上限 DGL_XM_MAX；
     進黑洞塔防時整包帶進去當開局靈力（07bht-td.js bhtdStart 呼叫 dglXmTake → boot 的 cfg.xm），用掉的扣掉；提示照舊免費，不拿星芒換。
   畫面：首頁頂欄右上頭像（包一層 07-legend.js meChip）小字下面兩條細條；點頭像開角色卡 dglCard（11/14 開發者定五項：修為、紅血＝定軌力、藍血＝星芒、攻擊力、防禦；攻擊力與防禦力＝BHTD.stats 依修為，畫面用 BHTD.atkPt／defPt 換成以 100 為基準的數值，dglCardAD）。
     第一次下船（星槎 → 人間；沒上過船的人在人間扣到 25 以下也算）角色說一句、條閃兩下（store "dgl".f1，只一次）。
     定軌力 ≤ DGL_LOW 只換表現、什麼都不擋：走路角色（07w shwLoad 呼叫 dglWalkHook）頭上才冒出小條、走慢（07w shwNext 乘 dglSlow）、不時打哈欠（慢放鞠躬＋伸展）、
     說七星各自累了的台詞（DGL_TIRED，第十四節表格）；畫面邊緣淡淡暈墨（對局、解題頁不暈）。化墨退場後在星槎上，右上角浮一張小卡顯示還差多少才能下船。
   11/13 晚加強（定案第二十四節）：
     ① 地點頁兩條：人間的頁（dglLocOn：land、不是 dglBusy 的對局解題頁、不是首頁）頂欄最右邊放 #dglLoc（小頭像＋紅藍兩條，點了開 dglCard）；包一層 setTop 換頁時放／收，dglTick 再對一次。
     ② 二十八宿星圖：觀星臺「二十八宿」標籤 → dglXiuSheet；每宿花 DGL_XIU_COST 星芒，四象點齊修為 +DGL_XIANG_XP、全亮 +DGL_XIU_ALL_XP 與稱號 DGL_XIU_TITLE；紀錄在 store "dgl".t／.tw。
     ③ 設定開關：設定 → 角色「平日體力（定軌力／星芒）」（dglSetRow、#dglSw），store dglOff；關掉＝dglLive() 為 false：不扣、不退場、沒有修為加成、兩條收起來（html[data-dgloff]），星芒照常。
   前綴 dgl／DGL（11/13 grep 過：stam 會撞 stampBook、stm 是 07z6 的）；開關 DGL_ON；純函式在 #DGL-PURE 區段，測試 xiangqi-lab/tools/test-dgl.js；樣式在 dglCss */
/* #DGL-PURE-BEGIN：到 #DGL-PURE-END 是不碰畫面的常數與純函式，test-dgl.js 用 vm 直接載入 */
const DGL_ON=true;
const DGL_MAX=30,DGL_DRAIN=1,DGL_SHIP=3,DGL_BACK=15,DGL_GAME=2,DGL_PUZ=2,DGL_BH=20,DGL_LOW=10,DGL_XM_MAX=20,DGL_SLOW=1.6,DGL_SAFE=2500,DGL_HELLO=25;   /* DGL_BH＝黑洞過關回多少（三分之二條）；DGL_LOW＝體力低的門檻；DGL_SLOW＝體力低時走路時間乘幾倍；DGL_HELLO＝沒上過船的人扣到多少時補說明 */
const DGL_BH_DAY=20,DGL_DAY_SH=1;   /* 11/14：一天最多靠黑洞回幾點；日界往前挪幾小時（1＝子時 23:00 起算新的一天，跟頂欄時辰鐘的子時一致） */
const DGL_SHIP_RE=/^\/(adventure|ship(\/|$)|shelf(\/|$)|canju\/s\/|canju\/q\/|canju\/e\/5\/|qqev(\/|$))/;
const DGL_FREE_RE=/^\/((lobby|pvp|join|watch|cup|settings|feedback|fbadmin|weekly|terms|me|profile)(\/|$)|coop\/lobby(\/|$)|connect=)/;
const DGL_OPEN_RE=/^\/($|hub\/|(db|codex|stats|openings)(\/|$))/;
const DGL_PUZ_WHY=["殘局","千秋殘局","解題","輿圖遊歷","消寒圖","偶遇幫忙","說書人的考問"],DGL_MAIN_WHY=["闖關"];
/* 七星累了時的動作與台詞（第十四節 Claude 修正版；動作空手） */
const DGL_TIRED={x_swordboy:["揉眉心","跑了一天的馳道，車輪都要轉不動了……歇一會兒吧。"],x_spiritgirl:["伸懶腰","渡口的船都靠岸了，我們也該歇一歇啦！"],
  x_martialgirl:["打大大的哈欠","哈——欠！我說話都小聲了，這可不得了，快休息！"],x_miaogirl:["盤腿坐下","草原的風都吹不走睡意了，我們回星槎睡一覺吧。"],
  x_shuai:["輕扶胸口、慢慢吸氣","呼……人間的風有點重，我緩一緩就好。"],x_shi:["閉目站好","……休整，是為了下一場勝仗。"],x_bing:["揉揉腿","跑了一整天的腿，腳都軟了，今天先到這兒吧！"]};
const DGL_TIRED0="定軌力微弱，星槎旅人要歇一會兒啦。";
const dglKey=h=>"/"+String(h==null?"":h).replace(/^#?\/?/,"").split("?")[0];
/* 哪一邊：o.bh＝黑洞對局中、o.travel＝千秋穿梭過場還在畫面上 */
function dglZone(h,o){o=o||{};if(o.travel)return"ship";if(o.bh)return"bh";const k=dglKey(h);if(DGL_SHIP_RE.test(k))return"ship";if(DGL_FREE_RE.test(k))return"free";return"land"}
/* 化墨退場後還能進的頁：星槎、不算的頁、首頁與選單類 */
function dglOpen(h,o){return dglZone(h,o)!=="land"||DGL_OPEN_RE.test(dglKey(h))}
/* 對局、解題頁（扣到 0 時先讓它下完） */
function dglBusy(h){const p=dglKey(h).split("/").filter(Boolean),a=p[0]||"",b=p[1]||"";
  return["cpu","arena","pvp","qqev","quiz","guess","legend","simul"].includes(a)||((a==="journey"||a==="redo"||a==="pos")&&b==="play")||(["canju","battle","camp","theme","ouyu","lesson","lab"].includes(a)&&!!b)||
    (a==="hw"&&!!p[2])||(a==="daily"&&p[2]==="play")||(a==="coop"&&b!=="lobby")||(a==="ship"&&(b==="lv"||b==="pz"))}
function dglNew(){return{r:DGL_MAX,out:false,due:false}}
const dglShow=r=>Math.max(0,Math.min(DGL_MAX,Math.ceil((+r||0)-1e-9)));
const dglTired=r=>(+r||0)<=DGL_LOW;
const dglSlowOf=r=>dglTired(r)?DGL_SLOW:1;
/* 過了 ms 毫秒、人在 z 那一邊：回傳事件 low（剛掉到門檻）、zero（扣到 0，記 due）、back（星槎上回到 DGL_BACK，又能下船） */
function dglStep(s,ms,z){const ev=[],m=Math.max(0,+ms||0)/6e4,r0=s.r;
  if((z==="land"||z==="bh")&&!s.out){s.r=Math.max(0,s.r-DGL_DRAIN*m);if(r0>DGL_LOW&&s.r<=DGL_LOW)ev.push("low");if(r0>0&&s.r<=0&&!s.due){s.due=true;ev.push("zero")}}
  else if(z==="ship"){s.r=Math.min(DGL_MAX,s.r+DGL_SHIP*m);if(s.out&&s.r>=DGL_BACK){s.out=false;ev.push("back")}}
  return ev}
/* 回定軌力（不超過上限）；due 不取消：扣到 0 那一盤下完照樣退場 */
function dglGain(s,n){const r0=s.r;s.r=Math.max(0,Math.min(DGL_MAX,s.r+Math.max(0,+n||0)));const back=!!s.out&&s.r>=DGL_BACK;if(back)s.out=false;return{n:s.r-r0,back}}
function dglExit(s){s.out=true;s.due=false;return s}
const dglCanLand=s=>!s.out;
/* 什麼時候退場：o＝{zone, busy 對局／解題頁, done 那盤結束的時間, now, block 有別的大畫面蓋著}；回 exit（播化墨回星槎）、rest（已經在船上，直接記退場）或 null */
function dglWhen(s,o){if(!s.due)return null;if(o.zone==="ship")return"rest";if((o.zone!=="land"&&o.zone!=="bh")||o.block)return null;if(!o.busy)return"exit";return o.done&&o.now-o.done>=DGL_SAFE?"exit":null}
/* 換頁時擋不擋：人間的頁（DGL_OPEN_RE 以外）在 due＝退場、out＝回星槎 */
function dglGate(s,h,o){if(dglOpen(h,o))return null;if(s.due)return"exit";if(s.out)return"rest";return null}
const dglXmAdd=(x,n)=>Math.max(0,Math.min(DGL_XM_MAX,(Math.round(+x)||0)+(Math.round(+n)||0)));
/* 心定則棋穩（開發者 11/13 晚選）：定軌力一半以上修為 ×1.1、滿格 ×1.2；零頭累積在 fx，滿 1 才多給（修為常一次只給 1、2 點，直接四捨五入等於沒加） */
const dglXpMul=r=>{const v=dglShow(r);return v>=DGL_MAX?1.2:v>=DGL_MAX/2?1.1:1};   /* 11/14 開發者：加成照畫面上看到的數字（dglShow 進位後），29.5 顯示 30 就給 ×1.2 */
function dglXpBonus(n,r,fx){n=Math.round(+n)||0;fx=+fx||0;if(n<=0)return{n,fx};fx+=n*(dglXpMul(r)-1);const add=Math.floor(fx+1e-9);return{n:n+add,fx:Math.max(0,Math.round((fx-add)*1e6)/1e6)}}
/* 星芒帶進黑洞：開局靈力 sp0（已照上限截過）加上星芒 × k（11/14 晚靈力 ×10：1 點星芒＝k 點靈力，預設 1），不超過靈力上限；used＝真的用掉幾點星芒（最後一點不滿 k 也算一點，補到上限） */
function dglXmUse(sp0,spMax,xm,k){k=Math.max(1,Math.round(+k)||1);spMax=Math.max(0,+spMax||0);sp0=Math.max(0,Math.min(spMax,+sp0||0));const sp=Math.min(spMax,sp0+Math.max(0,Math.round(+xm)||0)*k);return{sp,used:Math.ceil((sp-sp0)/k-1e-9)}}
const dglTiredLine=c=>(DGL_TIRED[c]||[])[1]||DGL_TIRED0;
/* 地點頁的小頭像＋兩條（開發者 11/13 晚「每個人間地點都有兩條」）：人間的頁、不是對局／解題頁、不是首頁（首頁用頂欄 meChip）；o.off＝設定關了平日體力 */
function dglLocOn(h,o){o=o||{};if(o.off)return false;return dglZone(h,o)==="land"&&!dglBusy(h)&&dglKey(h)!=="/"}
/* 二十八宿星圖（開發者 11/13 晚：星芒在人間也有用，觀星臺「二十八宿」入口）。每宿 [宿名, 四象序號, 大致所在的今星座, 補充一句]，順序照傳統：
   東方蒼龍角→箕、北方玄武斗→壁、西方白虎奎→參、南方朱雀井→軫。星座對照與補充句都待史學顧問核。
   點亮紀錄放 store "dgl"（跟存檔走）：t＝28 位元遮罩（第 i 位＝第 i 宿）、tw＝拿過的獎（0～3 位＝四象點齊、第 4 位＝全亮＋稱號），不另開存檔鍵 */
const DGL_XIU_COST=2,DGL_XIANG_XP=10,DGL_XIU_ALL_XP=30,DGL_XIU_TITLE="觀星客";
const DGL_XIANG=[["東方蒼龍","東方"],["北方玄武","北方"],["西方白虎","西方"],["南方朱雀","南方"]];
const DGL_XIU=[["角",0,"室女座","角宿一是室女座最亮的星。"],["亢",0,"室女座",""],["氐",0,"天秤座",""],["房",0,"天蠍座","房宿古稱「天駟」。"],
  ["心",0,"天蠍座","心宿二是天蠍座最亮的星，古稱「大火」；《詩經》「七月流火」說的就是它。"],["尾",0,"天蠍座",""],["箕",0,"人馬座","名字取自簸箕。"],
  ["斗",1,"人馬座","斗宿六顆星又稱「南斗」。"],["牛",1,"摩羯座","牛宿又稱「牽牛」；今天說的牛郎星是另一顆星「河鼓二」。"],["女",1,"寶瓶座","女宿又稱「須女」、「婺女」。"],
  ["虛",1,"寶瓶座、小馬座",""],["危",1,"寶瓶座、飛馬座",""],["室",1,"飛馬座","室宿古稱「營室」。"],["壁",1,"飛馬座、仙女座","壁宿又稱「東壁」。"],
  ["奎",2,"仙女座、雙魚座",""],["婁",2,"白羊座",""],["胃",2,"白羊座",""],["昴",2,"金牛座","昴宿就是昴星團，肉眼大約看得到六、七顆星。"],
  ["畢",2,"金牛座","畢宿五是金牛座最亮的星。"],["觜",2,"獵戶座",""],["參",2,"獵戶座","參宿四、參宿七是獵戶座的兩顆亮星；參宿和心宿此出彼沒，所以有「參商」一詞。"],
  ["井",3,"雙子座","井宿又稱「東井」。"],["鬼",3,"巨蟹座","鬼宿中間的鬼星團，古稱「積尸氣」。"],["柳",3,"長蛇座",""],["星",3,"長蛇座","星宿又稱「七星」，星宿一是長蛇座最亮的星。"],
  ["張",3,"長蛇座",""],["翼",3,"巨爵座、長蛇座",""],["軫",3,"烏鴉座",""]];
const dglXiuMask=t=>(Math.round(+t)||0)&0xFFFFFFF;
const dglXiuHas=(t,i)=>i>=0&&i<28&&!!(dglXiuMask(t)&(1<<i));
function dglXiuN(t){let n=0;for(let i=0;i<DGL_XIU.length;i++)if(dglXiuHas(t,i))n++;return n}
const dglXiangDone=(t,k)=>DGL_XIU.every((s,i)=>s[1]!==k||dglXiuHas(t,i));
/* 點亮第 i 宿：o＝store "dgl" 的內容（x 星芒、t、tw）；成功時直接改 o。回 {ok, why:"bad"|"lit"|"poor", need, xiang:剛點齊的四象（沒有＝-1）, all:剛好全亮} */
function dglXiuLight(o,i){i=Math.round(+i);if(!(i>=0&&i<DGL_XIU.length))return{ok:false,why:"bad"};const t=dglXiuMask(o.t);if(dglXiuHas(t,i))return{ok:false,why:"lit"};
  const x=dglXmAdd(o.x,0);if(x<DGL_XIU_COST)return{ok:false,why:"poor",need:DGL_XIU_COST-x};
  o.x=x-DGL_XIU_COST;o.t=t|(1<<i);const k=DGL_XIU[i][1];let tw=Math.round(+o.tw)||0,xiang=-1,all=false;
  if(dglXiangDone(o.t,k)&&!(tw&(1<<k))){tw|=1<<k;xiang=k}if(dglXiuN(o.t)===DGL_XIU.length&&!(tw&16)){tw|=16;all=true}o.tw=tw;return{ok:true,xiang,all}}
/* 點亮後的說明：宿名、四象與方位、第幾宿、大致在今天哪個星座＋補充一句 */
function dglXiuLine(i){const s=DGL_XIU[i];if(!s)return"";const X=DGL_XIANG[s[1]],n=DGL_XIU.filter((y,j)=>j<=i&&y[1]===s[1]).length;
  return`${s[0]}宿：${X[0]}七宿的第${"一二三四五六七"[n-1]}宿（${X[1]}），大致在今天的${s[2]}。${s[3]}`}
/* 角色卡（開發者 11/14 採用 ChatGPT 設計稿 story/chatgpt_app/回覆_角色卡設計_1114.md）：
   DGL_ICO＝角色卡用到的圖示對照表，之後換水墨圖示只改這裡；值寫 "img:路徑" 就畫成圖片（dglIc），其他當文字（emoji）。
   DGL_XM_GET＝解殘局、主線過關各得幾點星芒；DGL_CD_LOW＝角色卡「快回星槎」的門檻（畫面上看到的數字 ≤ 這個） */
const DGL_ICO={red:"🔴",blue:"🔵",land:"⛰️",ship:"🚢",game:"♟️",puz:"🧩",bh:"🌀",zero:"🖌️",flag:"🚩",main:"📜",xiu:"🌌",xm:"✨",hp:"❤️",sp:"🔷",atk:"⚔️",def:"🛡️",rg:"🔄",ttl:"🏅",off:"⏸️"};
const DGL_XM_GET=1,DGL_CD_LOW=5;
/* 角色卡的定軌力狀態：off 設定關了、out 化墨退場中（在星槎歇息）、due 用完了（這盤下完就退場）、low 快用完、full 滿格 ×1.2、half 一半以上 ×1.1、none 一半以下沒加成。
   加成照畫面上看到的數字（dglShow，跟頂欄、卡片上的「30／30」一致；dglXpMul 也照 dglShow，看到的就是實際給的） */
function dglCardSt(s,off){if(off)return"off";s=s||{};if(s.out)return"out";if(s.due)return"due";const v=dglShow(s.r);if(v<=DGL_CD_LOW)return"low";const m=dglXpMul(v);return m>=dglXpMul(DGL_MAX)?"full":m>1?"half":"none"}
/* 11/14 黑洞的定軌力（開發者選 Claude 修正版）：用完（退場中、該退場、歸零）＝黑洞入口關著；一天最多靠黑洞回 DGL_BH_DAY。
   dglDay＝人間時辰的日界（子時 23:00 起算新的一天）；dglBhCap＝這次過關最多還能回幾點（o＝store "dgl"，o.bd＝{d 日期, n 今天已經回了幾點}）；dglBhUse 記下用掉的 */
const dglBhLocked=s=>!!s&&(!!s.out||!!s.due||(+s.r||0)<=0);
function dglDay(d){d=new Date((d instanceof Date?d.getTime():+d||Date.now())+DGL_DAY_SH*3600e3);return d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate()}
function dglBhCap(o,day,want){const B=o&&o.bd&&o.bd.d===day?o.bd:{d:day,n:0};return Math.max(0,Math.min(Math.max(0,+want||0),DGL_BH_DAY-(+B.n||0)))}
function dglBhUse(o,day,n){const B=o.bd&&o.bd.d===day?o.bd:{d:day,n:0};o.bd={d:day,n:Math.round(((+B.n||0)+Math.max(0,+n||0))*100)/100};return o.bd}
/* 化墨退場後還要幾分鐘能下船（星槎上每分鐘回 DGL_SHIP，回到 DGL_BACK 才能下船；無條件進位） */
const dglBackMin=r=>Math.max(0,Math.ceil((DGL_BACK-(+r||0))/DGL_SHIP-1e-9));
/* #DGL-PURE-END */

const DGL={s:dglNew(),last:Date.now(),done:0,pz:0,say:0,lastZ:"",fromZ:"",walk:new Set(),wt:0,ft:0};
const dglRM=()=>{try{return matchMedia("(prefers-reduced-motion: reduce)").matches}catch(e){return false}};
function dglSt(){const o=store.get("dgl",null);return o&&typeof o==="object"?o:{}}
function dglXm(){return dglXmAdd(dglSt().x,0)}
function dglXmGive(n){const o=dglSt(),x0=dglXmAdd(o.x,0);o.x=dglXmAdd(x0,n);store.set("dgl",o);return o.x-x0}
/* 07bht-td.js bhtdStart 呼叫：回傳這一局帶進去幾點（＝用掉的），同時從身上扣掉 */
function dglXmTake(sp0,spMax,k){try{if(!DGL_ON)return 0;const o=dglSt(),U=dglXmUse(sp0,spMax,dglXmAdd(o.x,0),k);if(U.used>0){o.x=dglXmAdd(o.x,-U.used);store.set("dgl",o)}return U.sp-Math.max(0,Math.min(Math.max(0,+spMax||0),+sp0||0))}catch(e){return 0}}   /* 回傳換到幾點靈力（k＝1 時跟用掉的星芒一樣） */
/* 設定頁「平日體力（定軌力／星芒）」開關（開發者 11/13 晚、第 16 輪評比第 2 項）：store dglOff（設定，不跟存檔走），預設 false＝開著。
   關掉：定軌力不扣、不化墨退場、沒有心定則棋穩加成、不走慢不暈墨，頂欄與地點頁的兩條藏起來（html[data-dgloff]）；星芒照常累積、照常帶進黑洞、照常點亮星圖 */
function dglUserOff(){try{return!!store.get("dglOff",false)}catch(e){return false}}
const dglLive=()=>DGL_ON&&!dglUserOff();
const dglSlow=()=>dglLive()?dglSlowOf(DGL.s.r):1;
/* 11/14：黑洞入口關不關（觀星臺渾儀、星槎「星淵」、關卡卡片、結果視窗「再刷一場」都問這裡）；設定關掉平日體力＝永遠開著 */
function dglBhLock(){try{return dglLive()&&dglBhLocked(DGL.s)}catch(e){return false}}
function dglBhLockMsg(){return DGL.s.due&&!DGL.s.out?"定軌力用完了，黑洞入口先關著：這盤下完先回星槎歇息":`定軌力用完了，黑洞入口先關著：在星槎歇到 ${DGL_BACK} 再來`}
function dglBh(h){if(!/^#\/journey\/play/.test(h||""))return false;try{if(typeof BHTD_ST!=="undefined"&&BHTD_ST)return true}catch(e){}
  try{if(document.body.classList.contains("bh-full"))return true;const R=store.get("bhRet",null);return!!(R&&Date.now()-(+R.at||0)<15e3)}catch(e){return false}}   /* 剛從關卡卡片開局（bhtdStart 記 bhRet.at），塔防畫面還沒掛上的那幾秒 */
function dglZoneNow(h){h=h==null?location.hash:h;return dglZone(h,{bh:dglBh(h),travel:!!document.querySelector(".travel.qq")})}
function dglName(){try{return typeof myChar==="function"?myChar():""}catch(e){return""}}

/* ---------- 樣式 ---------- */
function dglCss(){if(document.getElementById("dglCss"))return;const s=document.createElement("style");s.id="dglCss";s.textContent=`
#meChip .dgl-bars{display:flex;flex-direction:column;gap:3px;margin-top:4px;min-width:58px}
.dgl-bars i,.dgl-head i,.dgl-float i,.dgl-cd-bar{display:block;position:relative;height:3px;border-radius:2px;background:rgba(40,28,18,.24);overflow:hidden;font-style:normal}
.dgl-bars i b,.dgl-head i b,.dgl-float i b,.dgl-cd-bar b{position:absolute;left:0;top:0;bottom:0;border-radius:2px;transition:width .6s ease}
.dgl-r b,.dgl-cd-bar.dgl-r b{background:#cf3b2e}.dgl-b b,.dgl-cd-bar.dgl-b b{background:#3d85d6}
html[data-era=qin] #meChip .dgl-bars i,html[data-era=wudai] #meChip .dgl-bars i{background:rgba(255,248,236,.28)}
#meChip .dgl-bars i{height:5px;border-radius:3px;background:rgba(128,118,104,.38);box-shadow:inset 0 0 0 1px rgba(0,0,0,.18),0 0 0 1px rgba(255,255,255,.22)}#meChip .dgl-bars i b{border-radius:3px}   /* 11/13 實看：3px 高在手機上幾乎看不到（星芒 0 時藍條整條空的更不明顯），頂欄這兩條改 5px、加細邊 */
.dgl-bars.low i.dgl-r b,.dgl-head.low i.dgl-r b{background:#e0563f}
@keyframes dglFlash{0%,100%{box-shadow:none}50%{box-shadow:0 0 0 2px #ffcfc7,0 0 9px 2px #ff5a45}}
.dgl-flash i.dgl-r{animation:dglFlash .5s ease-in-out 2;overflow:visible}
.dgl-head{position:absolute;z-index:152;display:none;width:36px;padding:3px 4px;border-radius:6px;background:rgba(251,246,234,.92);box-shadow:0 1px 3px rgba(0,0,0,.28);transform:translate(-50%,-100%);pointer-events:none}
.dgl-head i{height:4px;margin:1px 0}.dgl-head .z{position:absolute;left:100%;top:-10px;margin-left:2px;font-size:17px;line-height:1;opacity:0;transition:opacity .3s}.dgl-head.yawn .z{opacity:1}
@keyframes dglYawn{0%,100%{scale:1 1;rotate:0deg}25%{scale:.96 1.07;rotate:0deg}55%{scale:1.02 .97;rotate:-4deg}80%{scale:1 1;rotate:2deg}}
.shw.dgl-yawn canvas{animation:dglYawn 2.4s ease-in-out}
.shw.dgl-ink{transition:filter 1.4s ease-in,opacity 1.4s ease-in!important;filter:grayscale(1) blur(6px);opacity:0!important}
.dgl-float{position:fixed;right:10px;top:calc(var(--safeT,0px) + 64px);z-index:60;width:min(236px,72vw);box-sizing:border-box;background:#2a1f15;color:#fbf3e2;border-radius:12px;padding:8px 10px;box-shadow:0 3px 12px rgba(0,0,0,.32);pointer-events:none;font:700 12px/1.45 var(--serif,serif);opacity:0;transition:opacity .35s}
.dgl-float.on{opacity:.96}.dgl-float p{margin:6px 0 0;font-weight:600;font-size:12.5px}
.dgl-fl-row{display:grid;grid-template-columns:auto 1fr auto;gap:7px;align-items:center;margin:2px 0}.dgl-float i{height:5px;background:rgba(255,248,236,.22)}
#dglVig{position:fixed;inset:0;z-index:25;pointer-events:none;opacity:0;transition:opacity 1.4s;background:radial-gradient(ellipse at 50% 50%,rgba(0,0,0,0) 60%,rgba(30,22,14,.2) 88%,rgba(30,22,14,.3) 100%)}
#dglVig.on{opacity:1}
.dgl-out{position:fixed;inset:0;z-index:9500;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;background:rgba(244,236,220,0);animation:dglOBg .5s ease forwards}
@keyframes dglOBg{to{background:rgba(244,236,220,.9)}}
.dgl-out.bye{opacity:0;transition:opacity .5s}
.dgl-o-fig{position:relative;width:150px;height:180px}
.dgl-o-fig img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;transform-origin:50% 95%;animation:dglFall 2s ease-in forwards}
@keyframes dglFall{0%{transform:none;filter:none;opacity:1}35%{transform:rotate(-78deg) translateY(6px);filter:grayscale(.7);opacity:1}70%{filter:grayscale(1) blur(3px) contrast(1.4);opacity:.7}100%{transform:rotate(-82deg) translateY(10px) scale(1.15);filter:grayscale(1) blur(10px);opacity:0}}
.dgl-o-fig i{position:absolute;left:50%;top:80%;width:28px;height:28px;margin:-14px;border-radius:50%;background:radial-gradient(circle,rgba(24,17,11,.92),rgba(24,17,11,0) 70%);opacity:0;animation:dglInk 1.5s .6s ease-out forwards}
@keyframes dglInk{0%{opacity:0;transform:rotate(var(--a)) translateX(0) scale(.4)}30%{opacity:.9}100%{opacity:0;transform:rotate(var(--a)) translateX(92px) scale(2.6)}}
.dgl-out p{margin:0;color:#2a1f15;font:700 17px/1.5 var(--serif,serif);text-align:center;padding:0 24px;opacity:0;animation:dglTx .5s .5s ease forwards}
@keyframes dglTx{to{opacity:1}}
.dgl-out.rm,.dgl-out.rm *{animation:none!important}.dgl-out.rm{background:rgba(244,236,220,.9)}.dgl-out.rm p{opacity:1}.dgl-out.rm .dgl-o-fig img{filter:grayscale(1);opacity:.45}.dgl-out.rm .dgl-o-fig i{display:none}
.dgl-cd-h{display:flex;justify-content:space-between;align-items:baseline;font-size:15px}.dgl-cd-h span{font-weight:700}
.dgl-cd-bar{height:8px;margin:5px 0 4px;background:color-mix(in srgb,currentColor 14%,transparent)}
.dgl-ic{font-style:normal;flex:none;line-height:1}img.dgl-ic{width:1.15em;height:1.15em;object-fit:contain}
.dgl-khero{display:flex;gap:12px;align-items:center;margin:0 0 2px}.dgl-khero img{width:52px;height:62px;object-fit:contain;flex:none}
.dgl-khero b{display:block;font-size:17px;line-height:1.35}.dgl-khero div>span{display:block;font-size:15px;color:var(--muted,#7A6A58)}
.dgl-khero .dgl-klv{font-size:24px;font-weight:900;line-height:1.2;color:var(--ink,#2A1F15);font-variant-numeric:tabular-nums}
.dgl-khero .dgl-kttl{display:flex;align-items:center;gap:4px;font-size:14px}
.dgl-ksub{font-size:14px;font-weight:700;color:var(--muted,#7A6A58)}
.dgl-kad{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:8px 0 0}
.dgl-kad>span{display:flex;align-items:center;justify-content:space-between;gap:6px;min-width:0;min-height:48px;padding:4px 12px;border-radius:14px;background:color-mix(in srgb,currentColor 6%,transparent)}
.dgl-kad small{display:flex;align-items:center;gap:4px;font-size:15px;font-weight:800}.dgl-kad b{font-size:22px;line-height:1.1;font-variant-numeric:tabular-nums}
.dgl-kadn{margin:4px 2px 2px}
.dgl-me .dgl-kst{grid-template-columns:repeat(6,1fr)}.dgl-me .dgl-kst>span{grid-column:span 2}.dgl-me .dgl-kst>span:nth-child(n+4){grid-column:span 3}   /* 11/14 晚五格：上排元氣、靈力上限、每回合回靈，下排攻擊力、防禦力 */
.dgl-khero.out img{opacity:.45;filter:grayscale(1)}
.dgl-kc{position:relative;border:1px solid color-mix(in srgb,currentColor 16%,transparent);border-radius:16px;padding:4px 10px 10px 12px;margin:8px 0}
.dgl-kwarn{background:linear-gradient(90deg,color-mix(in srgb,currentColor 13%,transparent),transparent 42%)}
.dgl-kh{display:flex;align-items:center;gap:6px;min-height:44px}
.dgl-kt{display:flex;align-items:center;gap:6px;margin:0 auto 0 0;min-width:0;font-size:18px;font-weight:900;white-space:nowrap}
html[lang=en] .dgl-kt{white-space:normal;line-height:1.2}
.dgl-kv{flex:none;font-size:24px;font-weight:900;line-height:1;white-space:nowrap;font-variant-numeric:tabular-nums}
.dgl-kq{flex:none;display:grid;place-items:center;width:44px;height:44px;margin:0 -8px 0 -4px;padding:0;border:0;border-radius:50%;background:none;color:inherit;font:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}
.dgl-kq span{display:grid;place-items:center;width:28px;height:28px;border-radius:50%;border:1.5px solid color-mix(in srgb,currentColor 45%,transparent);font-size:16px;font-weight:900;line-height:1}
.dgl-kq[aria-expanded=true] span{background:color-mix(in srgb,currentColor 16%,transparent)}
.dgl-kq:focus-visible{outline:2px solid #3d85d6;outline-offset:-2px}
.dgl-kln{display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px}
.dgl-kl{display:flex;align-items:center;gap:5px;flex:1 1 auto;margin:0;font-size:17px;font-weight:800;line-height:1.4}
.dgl-kwarn .dgl-kl{color:var(--red,#B3261E)}
.dgl-ks{display:flex;align-items:center;flex-wrap:wrap;gap:4px;margin:2px 0 0;font-size:14px;line-height:1.4;color:var(--muted,#7A6A58)}.dgl-ks b{color:var(--ink,#2A1F15)}
.dgl-knum{font-size:20px}
.dgl-kbd{flex:none;display:inline-flex;align-items:center;gap:3px;min-height:26px;padding:0 10px;border-radius:999px;font-size:14px;font-weight:800;white-space:nowrap;color:var(--muted,#7A6A58);background:color-mix(in srgb,currentColor 12%,transparent)}
.dgl-kbd.on{color:var(--red,#B3261E);background:color-mix(in srgb,#cf3b2e 15%,transparent)}
.dgl-kbd.blue{color:color-mix(in srgb,#2f6fbd 70%,var(--ink,#2A1F15));background:color-mix(in srgb,#3d85d6 15%,transparent)}
.dgl-kbw{position:relative;margin:10px 0 0}
.dgl-kbar{display:block;position:relative;height:12px;border-radius:6px;overflow:hidden;background:color-mix(in srgb,currentColor 13%,transparent)}
.dgl-kbar b{position:absolute;left:0;top:0;bottom:0;border-radius:6px;transition:width .6s ease}
.dgl-kwarn .dgl-kbar.dgl-r b{background:#9e2f24}
.dgl-kbar.dgl-b b{background:repeating-linear-gradient(135deg,#3d85d6 0 7px,#6aa3e3 7px 10px)}
.dgl-kmk{position:absolute;top:-3px;width:2px;height:18px;margin-left:-1px;border-radius:1px;background:color-mix(in srgb,currentColor 50%,transparent)}
.dgl-ktks{position:relative;height:38px;margin-top:2px}
.dgl-ktk{position:absolute;top:0;display:flex;flex-direction:column;align-items:center;transform:translateX(-50%);font-size:14px;line-height:1.25;white-space:nowrap;color:var(--muted,#7A6A58)}
.dgl-ktk>span{display:flex;align-items:center;gap:2px}.dgl-ktk small{font-size:14px}
.dgl-ktk.end{left:auto!important;right:0;transform:none;align-items:flex-end}
.dgl-ktk.on{color:var(--red,#B3261E);font-weight:800}
.dgl-kcps{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:4px}
.dgl-kcp{display:flex;align-items:center;justify-content:center;gap:4px;min-height:34px;padding:3px 6px;border-radius:12px;font-size:14px;font-weight:700;line-height:1.25;text-align:center;background:color-mix(in srgb,#cf3b2e 9%,transparent)}
.dgl-kct{min-width:0}.dgl-knw{white-space:nowrap}
.dgl-kflow{display:grid;grid-template-columns:1fr auto 1fr;gap:6px;margin-top:8px}
.dgl-kfb{display:flex;flex-direction:column;gap:2px;min-width:0;padding:6px 8px;border-radius:12px;background:color-mix(in srgb,#3d85d6 9%,transparent)}
.dgl-kfb small{font-size:14px;color:var(--muted,#7A6A58)}.dgl-kfb .dgl-kxn{margin:-2px 0 2px 1.4em}
.dgl-kfb .dgl-kcp{justify-content:flex-start;min-height:0;padding:1px 0;border-radius:0;background:none;text-align:left}
.dgl-kar{align-self:center;font-style:normal;font-size:22px;font-weight:900;color:#3d85d6}
.dgl-kst{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:8px}
.dgl-kst>span{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;min-width:0;min-height:64px;padding:4px 2px;border-radius:12px;text-align:center;background:color-mix(in srgb,currentColor 6%,transparent)}
.dgl-kst small{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:2px;font-size:14px;font-weight:700}.dgl-kst b{font-size:24px;line-height:1.1;font-variant-numeric:tabular-nums}
.dgl-kmore{margin:8px 0 0;padding:6px 10px;border-radius:12px;background:color-mix(in srgb,currentColor 5%,transparent)}.dgl-kmore[hidden]{display:none}
.dgl-kmore ul{margin:0;padding-left:18px;font-size:14px;line-height:1.55}
.dgl-kme{width:100%;min-height:48px;margin-top:4px}
.dgl-loc{display:flex;align-items:center;gap:5px;flex:none;border:0;border-radius:999px;padding:2px 9px 2px 3px;margin-left:4px;min-height:44px;background:color-mix(in srgb,var(--ink,#2a1f15) 6%,transparent);color:inherit;font:inherit;cursor:pointer}
html[data-era=qin] .dgl-loc,html[data-era=wudai] .dgl-loc{background:rgba(255,248,236,.16)}
.dgl-loc img{width:24px;height:32px;object-fit:contain;flex:none}.dgl-loc .dgl-bars{display:flex;flex-direction:column;gap:5px;width:40px}
.dgl-loc .dgl-bars i{height:5px;border-radius:3px;background:rgba(128,118,104,.38);box-shadow:inset 0 0 0 1px rgba(0,0,0,.18),0 0 0 1px rgba(255,255,255,.22)}.dgl-loc .dgl-bars i b{border-radius:3px}
html[data-era=qin] .dgl-loc .dgl-bars i,html[data-era=wudai] .dgl-loc .dgl-bars i{background:rgba(255,248,236,.28)}
@media (max-width:480px){.dgl-loc{flex-direction:column;justify-content:center;gap:3px;padding:2px 4px;border-radius:12px;margin-left:2px}.dgl-loc img{width:20px;height:21px}.dgl-loc .dgl-bars{width:32px;gap:3px}}   /* 手機頂欄窄：頭像在上、兩條在下，只佔 40px，標題少被擠 */
#topbar.dgl-fit #title{font-size:.88em;letter-spacing:-.01em}   /* 放了兩條以後標題放不下（古戰場・元朝、每日同題這種右邊鈕多的頁）才縮一點字 */
html[data-dgloff] #meChip .dgl-bars,html[data-dgloff] .dgl-loc,html[data-dgloff] .dgl-head,html[data-dgloff] #dglVig{display:none!important}
.dgl-xt-info{min-height:4.7em;margin:6px 0 4px;padding:8px 10px;border-radius:10px;background:color-mix(in srgb,#3d85d6 11%,transparent);font-size:14px;line-height:1.55}
.dgl-xt-g{margin:10px 0 0}.dgl-xt-h{display:flex;justify-content:space-between;align-items:baseline;font-size:14.5px;margin:0 2px 5px}.dgl-xt-h span{font-weight:700}
.dgl-xt-row{display:grid;grid-template-columns:repeat(7,1fr);gap:5px}
.dgl-xt-s{display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:0;min-height:50px;padding:3px 0;border-radius:12px;border:1px solid #39406a;background:#1b2140;color:#9097b4;font:inherit;cursor:pointer}
.dgl-xt-s b{font:900 19px/1.1 var(--serif,serif)}.dgl-xt-s small{font-size:11px;margin-top:2px;opacity:.9;white-space:nowrap}
.dgl-xt-s.on{background:radial-gradient(circle at 50% 38%,#3d4d8c,#161c3a);color:#ffe7a3;border-color:#d6b25a;box-shadow:0 0 9px rgba(255,212,120,.45)}
.dgl-xt-s.sel{outline:2px solid #3d85d6;outline-offset:1px}
@media (prefers-reduced-motion:reduce){.dgl-flash i.dgl-r,.shw.dgl-yawn canvas{animation:none}.dgl-bars i b,.dgl-head i b,.dgl-float i b,.dgl-cd-bar b,.dgl-kbar b{transition:none}}`;document.head.append(s)}
const dglBarsHTML='<i class="dgl-r"><b></b></i><i class="dgl-b"><b></b></i>';

/* ---------- 畫面：首頁頭像下兩條、浮動小卡、頭上小條 ---------- */
function dglPaint(){if(!DGL_ON||typeof document==="undefined")return;const r=dglShow(DGL.s.r),x=dglXm(),low=dglTired(DGL.s.r);
  document.querySelectorAll(".dgl-bars,.dgl-head,.dgl-float,.dgl-cd").forEach(e=>{e.querySelectorAll(".dgl-r b").forEach(b=>b.style.width=(100*r/DGL_MAX).toFixed(1)+"%");e.querySelectorAll(".dgl-b b").forEach(b=>b.style.width=(100*x/DGL_XM_MAX).toFixed(1)+"%");e.classList.toggle("low",low)});
  document.querySelectorAll("[data-dgl=r]").forEach(e=>e.textContent=r+"／"+DGL_MAX);document.querySelectorAll("[data-dgl=x]").forEach(e=>e.textContent=x+"／"+DGL_XM_MAX);
  const b=document.getElementById("meChip");if(b&&b.querySelector(".dgl-bars"))b.title=`定軌力 ${r}／${DGL_MAX}・星芒 ${x}／${DGL_XM_MAX}`;
  const L=document.getElementById("dglLoc");if(L){const t=`我的角色：定軌力 ${r}／${DGL_MAX}，星芒 ${x}／${DGL_XM_MAX}`;if(L.title!==t){L.title=t;L.setAttribute("aria-label",t)}}
  const off=dglUserOff(),H=document.documentElement;if(H.hasAttribute("data-dgloff")!==off)H.toggleAttribute("data-dgloff",off);
  const cd=document.querySelector(".dgl-cd[data-k]");if(cd&&DGL.cdDraw&&cd.dataset.k!==dglCardKey())DGL.cdDraw()}   /* 角色卡開著、狀態變了（例如退場倒數少一分、回到能下船）就重畫 */
/* 地點頁（人間、不是對局解題頁、不是首頁）：頂欄最右邊放小頭像＋兩條，點了開角色卡；包一層 setTop 換頁就跟著放／收，每 2 秒（dglTick）再對一次 */
function dglLocSync(h,fit){if(typeof document==="undefined")return;h=h==null?location.hash:h;const tb=document.getElementById("topbar");let e=document.getElementById("dglLoc");
  const on=!!tb&&DGL_ON&&dglLocOn(h,{off:dglUserOff(),bh:dglBh(h),travel:!!document.querySelector(".travel.qq")});
  if(!on){if(e){e.remove();if(tb)tb.classList.remove("dgl-fit")}return}
  if(!e){dglCss();e=document.createElement("button");e.type="button";e.id="dglLoc";e.className="dgl-loc";let im="",tg="";try{im=meImg();tg=meImgTag(myStyle(),mySex())}catch(x){}
    e.innerHTML=(im?`<img src="${esc(im)}" ${tg} alt="" onerror="this.remove()">`:"")+`<span class="dgl-bars" aria-hidden="true">${dglBarsHTML}</span>`;e.onclick=()=>{vibrate(5);dglCard()}}
  if(e.parentNode!==tb){tb.append(e);fit=true}if(fit){clearTimeout(DGL.fitT);DGL.fitT=setTimeout(dglFit,80)}
  dglPaint()}
/* 標題放不下才縮字（等其他模組包的 setTop 把右上角的鈕放好再量）；頂欄變窄，時辰鐘重量一次寬度 */
function dglFit(){const tb=document.getElementById("topbar"),t=document.getElementById("title");if(!tb||!t)return;tb.classList.remove("dgl-fit");
  if(document.getElementById("dglLoc")&&t.scrollWidth>t.clientWidth+1)tb.classList.add("dgl-fit");try{if(typeof clkPlace==="function")clkPlace()}catch(x){}}
function dglChip(){const b=document.getElementById("meChip");if(!b||!DGL_ON)return;dglCss();const sm=b.querySelector("small");
  if(sm&&!sm.querySelector(".dgl-bars")){const s=document.createElement("span");s.className="dgl-bars";s.setAttribute("aria-hidden","true");s.innerHTML=dglBarsHTML;sm.append(s)}
  b.onclick=()=>{vibrate(5);dglCard()};dglPaint()}
/* 浮動小卡：kind＝"hello"（第一次下船，7 秒後收）或 "rest"（化墨退場後在星槎上，常駐到能下船） */
function dglFloat(kind,text){dglCss();let e=document.getElementById("dglFloat");if(!e){e=document.createElement("div");e.id="dglFloat";e.className="dgl-float";e.setAttribute("aria-hidden","true");document.body.append(e)}
  e.dataset.kind=kind;e.innerHTML=`<div class="dgl-fl-row"><span>定軌力</span><i class="dgl-r"><b></b></i><span data-dgl="r"></span></div><div class="dgl-fl-row"><span>星芒</span><i class="dgl-b"><b></b></i><span data-dgl="x"></span></div>${text?`<p>${esc(text)}</p>`:""}`;
  dglPaint();requestAnimationFrame(()=>e.classList.add("on"));clearTimeout(DGL.ft);if(kind==="hello"){e.classList.add("dgl-flash");DGL.ft=setTimeout(()=>dglFloatOff("hello"),7000)}return e}
function dglFloatOff(kind){const e=document.getElementById("dglFloat");if(!e||(kind&&e.dataset.kind!==kind))return;e.classList.remove("on");setTimeout(()=>{if(!e.classList.contains("on"))e.remove()},400)}
function dglFlashChip(){const s=document.querySelector("#meChip .dgl-bars,#dglLoc .dgl-bars");if(!s)return false;s.classList.remove("dgl-flash");void s.offsetWidth;s.classList.add("dgl-flash");setTimeout(()=>s.classList.remove("dgl-flash"),1300);return true}
/* 角色說一句：有走路角色＝頭上冒泡泡（07w 收 xq-bot-said）；沒有＝浮動小卡（長句）或 toast（短句） */
function dglSay(t,card){if(document.body.classList.contains("shw-on")&&document.querySelector(".shw.on")){try{window.dispatchEvent(new CustomEvent("xq-bot-said",{detail:t}));return true}catch(e){}}
  if(card)dglFloat("hello",t);else toast(t);return false}

/* ---------- 走路角色：頭上小條、走慢、打哈欠、累了的台詞（07w shwLoad 掛好角色後呼叫） ---------- */
function dglWalkHook(S){if(!dglLive()||!S||!S.box)return;dglCss();DGL.walk.add(S);const L=S.o&&S.o.layer||S.box.parentNode;
  if(L&&!(S.dglHead&&S.dglHead.isConnected)){const e=document.createElement("div");e.className="dgl-head";e.setAttribute("aria-hidden","true");e.innerHTML=dglBarsHTML+'<span class="z">🥱</span>';L.append(e);S.dglHead=e}
  if(!S.dglY)S.dglY=Date.now()-14e3;if(!DGL.wt)DGL.wt=setInterval(dglWalkTick,300);dglPaint();
  if(dglTired(DGL.s.r))setTimeout(()=>dglTiredSay(false),2600)}
function dglWalkTick(){const now=Date.now(),tired=dglTired(DGL.s.r);
  for(const S of[...DGL.walk]){const e=S.dglHead;if(!S.box.isConnected){if(e)e.remove();DGL.walk.delete(S);continue}if(!e)continue;
    const m=/translate\(([-\d.]+)px,\s*([-\d.]+)px\)\s*scale\(([\d.]+)\)/.exec(S.box.style.transform),cv=S.box.querySelector("canvas"),L=e.parentNode,say=L&&L.querySelector(".shw-say.on");
    if(!tired||!m||!cv||!S.box.classList.contains("on")||S.box.style.opacity==="0"||say){e.style.display="none";continue}
    const k=+m[3],ch=parseFloat(cv.style.height)||cv.clientHeight,T=parseFloat(cv.style.top)||0,top=+m[2]+(T+ch*.12)*k;
    Object.assign(e.style,{display:"block",left:(+m[1]).toFixed(1)+"px",top:(top-6).toFixed(1)+"px"});
    if(!S.go&&!dglRM()&&now-S.dglY>2e4){S.dglY=now;dglYawn(S)}}
  if(!DGL.walk.size){clearInterval(DGL.wt);DGL.wt=0}}
function dglYawn(S){try{if(S.anim)S.anim("bow",.45)}catch(e){}S.box.classList.add("dgl-yawn");if(S.dglHead)S.dglHead.classList.add("yawn");
  setTimeout(()=>{S.box.classList.remove("dgl-yawn");if(S.dglHead)S.dglHead.classList.remove("yawn");try{if(!S.go&&S.anim)S.anim("idle",1)}catch(e){}},2400)}
function dglTiredSay(force){const now=Date.now();if(dglBusy(location.hash)||document.getElementById("dglOut"))return;if(!force&&now-DGL.say<18e4)return;
  const walk=document.body.classList.contains("shw-on")&&!!document.querySelector(".shw.on");if(!walk&&!force)return;DGL.say=now;
  if(walk)dglSay(dglTiredLine(dglName()));else toast("🥱 "+DGL_TIRED0)}

/* ---------- 化墨退場 ---------- */
function dglExitNow(gate){if(document.getElementById("dglOut"))return;dglExit(DGL.s);DGL.done=0;dglCss();const rm=dglRM();
  let im="";try{im=meImg()}catch(e){}
  const ov=document.createElement("div");ov.id="dglOut";ov.className="dgl-out"+(rm?" rm":"");ov.setAttribute("role","alert");
  ov.innerHTML=`<div class="dgl-o-fig">${im?`<img src="${esc(im)}" alt="">`:""}${[0,1,2,3,4,5,6,7].map(i=>`<i style="--a:${i*45+12}deg"></i>`).join("")}</div><p>定軌力耗盡，化墨退場——回星槎歇息。</p>`;
  document.body.append(ov);try{vibrate([20,60,20])}catch(e){}try{closeSheet()}catch(e){}
  document.querySelectorAll(".shw.on").forEach(b=>b.classList.add("dgl-ink"));
  const go=()=>{if(dglZone(location.hash)!=="ship")location.hash="#/adventure"};
  if(gate)navReplace("#/adventure");else setTimeout(go,rm?700:1700);
  setTimeout(()=>{ov.classList.add("bye");setTimeout(()=>{ov.remove();toast(`在星槎上歇息：每分鐘回 ${DGL_SHIP}，回到 ${DGL_BACK} 就能再下船`)},500)},rm?1500:2400)}
/* 02-shell.js route() 開頭呼叫：化墨退場後（或該退場了）要進人間的頁 → 擋下來回星槎 */
function dglRouteGate(){try{if(!dglLive())return false;const h=location.hash,g=dglGate(DGL.s,h,{bh:dglBh(h)});if(!g)return false;
    if(g==="exit"){dglExitNow(true);return true}
    navReplace("#/adventure");setTimeout(()=>toast(`🌫 定軌力 ${dglShow(DGL.s.r)}／${DGL_MAX}：在星槎上歇到 ${DGL_BACK} 才能再下船`),450);return true}catch(e){return false}}

/* ---------- 角色卡（點頭像）：開發者 11/14 採用 ChatGPT 角色卡設計（story/chatgpt_app/回覆_角色卡設計_1114.md 第 1～5 節）。
   每塊「一句大字＋圖示膠囊」，原本的條列細則收進每塊右上角的「？」（點了展開、再點收起）。規則字都從 DGL_* 常數組；圖示查 DGL_ICO（dglIc）。
   數字跟中文分在不同的文字節點（07i18n 逐節點查字典，規則數字改了英文也不會失效）。卡片開著時狀態一變（dglCardKey）就重畫，展開的「？」保持展開 ---------- */
const dglIc=k=>{const v=String(DGL_ICO[k]||"");return/^img:/.test(v)?`<img class="dgl-ic" src="${esc(v.slice(4))}" alt="" aria-hidden="true">`:`<i class="dgl-ic" aria-hidden="true">${v}</i>`};
function dglCardKey(){const st=dglCardSt(DGL.s,dglUserOff());return st+(st==="out"?":"+dglBackMin(DGL.s.r):"")}
/* 「？」鈕（44×44；讀屏念「定軌力細則」＋展開／收起）與它收著的細則 */
const dglCdQ=(id,lab,open)=>`<button type="button" class="dgl-kq" data-q="${id}" aria-expanded="${open?"true":"false"}" aria-controls="dglQ_${id}" aria-label="${lab}"><span aria-hidden="true">？</span></button>`;
const dglCdMore=(id,open,L)=>`<div class="dgl-kmore" id="dglQ_${id}"${open?"":" hidden"}><ul>${L.map(t=>`<li>${t}</li>`).join("")}</ul></div>`;
function dglCard(){dglCss();let nm="";try{nm=meName()}catch(e){}const Q=new Set();
  sheet("🙂 我的角色",b=>{   /* 11/14 開發者選 B：標題固定「我的角色」，名字只留頭部那一個 */const draw=()=>{const s=DGL.s,r=dglShow(s.r),x=dglXm(),off=dglUserOff(),st=dglCardSt(s,off),k=dglCardKey(),sy=b.scrollTop;
    let im="",rk="",lv=1;try{im=meImg();rk=rankInfo().name;lv=xpInfo().L}catch(e){}
    const Sx=dglSt(),xn=dglXiuN(Sx.t),ttl=(Math.round(+Sx.tw)||0)&16,half=DGL_MAX/2,m1=dglXpMul(half),m2=dglXpMul(DGL_MAX),mu=dglXpMul(r),warn=st==="low"||st==="due"||st==="out";
    /* 11/14 開發者看手機截圖：「對新手玩家這內容還是太複雜」→ 選「所有人都極簡」：每塊只留圖示、名稱、數字、一條、一句話；
       刻度、膠囊、來源→用途、加成徽章都收進「？」；黑洞三個數字搬到我的角色頁（dglMeCard），黑洞選關卡片本來也有 */
    const bonus=mu>=m2?`<span>現在滿格，下棋、解題得到的修為</span> ×${m2}`:mu>1?`<span>現在一半以上，下棋、解題得到的修為</span> ×${m1}`:`<span>到一半以上，下棋、解題得到的修為</span> ×${m1}<span>；滿格</span> ×${m2}`;
    let red;
    if(off)red=`<section class="dgl-kc dgl-koff"><div class="dgl-kh"><h3 class="dgl-kt">${dglIc("off")}<span>平日體力已關閉</span></h3>${dglCdQ("r","定軌力細則",Q.has("r"))}</div>
      <p class="dgl-kl"><span>不扣、不退場、無加成</span></p>${dglCdMore("r",Q.has("r"),["平日體力已在設定裡關掉：定軌力不扣、不會化墨退場，也沒有「心定則棋穩」修為加成。","想再打開：設定 → 👘 換造型，裡面的「平日體力」。"])}</section>`;
    else{const line=st==="out"?`<span>化墨退場中・</span><b class="dgl-knum">${dglBackMin(s.r)}</b> <span>分鐘後可以下船</span>`:st==="due"?"<span>這盤下完，就回星槎歇息</span>":st==="low"?"<span>快用完了，回星槎歇一下吧</span>":"<span>下船後會慢慢用掉，回星槎就補回來</span>";
      red=`<section class="dgl-kc${warn?" dgl-kwarn":""}"><div class="dgl-kh"><h3 class="dgl-kt">${dglIc("red")}<span>紅血</span> <small class="dgl-ksub">定軌力</small></h3><span class="dgl-kv" data-dgl="r">${r}／${DGL_MAX}</span>${dglCdQ("r","定軌力細則",Q.has("r"))}</div>
        <div class="dgl-kbw" aria-hidden="true"><div class="dgl-kbar dgl-r"><b style="width:${(100*r/DGL_MAX).toFixed(1)}%"></b></div></div>
        <p class="dgl-kl">${line}</p>
        ${dglCdMore("r",Q.has("r"),[bonus,`在人間（下船以後）每分鐘少 ${DGL_DRAIN}；在星槎上不會少。`,`下完一盤棋、解完一題，各回 ${DGL_GAME}。`,`黑洞過關回 ${DGL_BH}，一天最多回 ${DGL_BH_DAY}；關掉 App 再打開就回滿。`,"定軌力用完時，黑洞入口也會關。",`用完了會化墨退場，回星槎歇息：船上每分鐘回 ${DGL_SHIP}，回到 ${DGL_BACK} 就能再下船。`,"線上大廳、千秋盃不用定軌力。"])}</section>`}
    const xs=`<section class="dgl-kc"><div class="dgl-kh"><h3 class="dgl-kt">${dglIc("blue")}<span>藍血</span> <small class="dgl-ksub">星芒</small></h3><span class="dgl-kv" data-dgl="x">${x}／${DGL_XM_MAX}</span>${dglCdQ("x","星芒細則",Q.has("x"))}</div>
      ${off?"":`<div class="dgl-kbw" aria-hidden="true"><div class="dgl-kbar dgl-b"><b style="width:${(100*x/DGL_XM_MAX).toFixed(1)}%"></b></div></div>`}
      <p class="dgl-kl"><span>解殘局、過主線章節就會得到</span></p>
      ${dglCdMore("x",Q.has("x"),[`解殘局、主線過關，各得 ${DGL_XM_GET} 點，最多存 ${DGL_XM_MAX} 點。`,`在觀星臺可以點亮二十八宿星圖：每宿 ${DGL_XIU_COST} 點。`,`<span>已點亮</span> ${xn}／${DGL_XIU.length}`,"進黑洞時，星芒會變成開局靈力，用掉多少扣多少。","最多補到靈力上限。","提示照舊免費，不用花星芒。"])}</section>`;
    const hero=`<div class="dgl-khero${st==="out"?" out":""}">${im?`<img src="${esc(im)}" alt="">`:""}<div><b>${esc(nm||rk)}</b><span class="dgl-klv"><span>修為</span> Lv ${lv}</span>${ttl?`<span class="dgl-kttl">${dglIc("ttl")}<span>${DGL_XIU_TITLE}</span></span>`:""}</div></div>`;
    const ad=dglCardAD(lv);
    b.innerHTML=`<div class="dgl-cd" data-k="${k}">${hero}${red}${xs}${ad}<button type="button" class="btn dgl-kme" id="dglMe">🙂 我的角色頁</button></div>`;
    b.querySelector("#dglMe").onclick=()=>{closeSheet();location.hash="#/me"};
    b.querySelectorAll(".dgl-kq").forEach(e=>e.onclick=()=>{const id=e.dataset.q,o=!Q.has(id),p=b.querySelector("#dglQ_"+id);if(o)Q.add(id);else Q.delete(id);e.setAttribute("aria-expanded",o?"true":"false");if(p)p.hidden=!o;try{vibrate(5)}catch(z){}});
    b.scrollTop=sy;dglPaint()};
  DGL.cdDraw=draw;draw()})}
/* 11/14 開發者「修為／攻擊力／防禦／紅血／藍血」：角色卡第 4 列＝攻擊力、防禦力兩格（顯示 BHTD.atkPt／defPt 的數值，100 為基準、越大越強）（BHTD.stats 照角色與修為；黑洞模組沒載入、沒選角色就整列不畫） */
function dglCardAD(lv){try{const c=dglName();if(typeof BHTD==="undefined"||!BHTD.CH||!BHTD.CH[c])return"";const S=BHTD.stats(c,lv);
  return`<div class="dgl-kad"><span><small>${dglIc("atk")}<span>攻擊力</span></small><b>${BHTD.atkPt(S.atk)}</b></span><span><small>${dglIc("def")}<span>防禦力</span></small><b>${BHTD.defPt(S.def)}</b></span></div><p class="dgl-ks dgl-kadn"><span>修為越高，攻擊力和防禦力越強（黑洞裡用）</span></p>`}catch(e){return""}}
/* 我的角色頁（07-legend Me）多一張「黑洞裡的你」：11/14 從角色卡搬過來；黑洞（觀星臺）解鎖後才出現 */
function dglMeCard(){try{const c=dglName();if(!c||typeof BHTD==="undefined"||typeof bhtdL!=="function"||!(typeof gxtOpen==="function"&&gxtOpen()))return null;
  dglCss();const S=BHTD.stats(c,bhtdL()),d=document.createElement("section");d.className="card dgl-kc dgl-me";
  d.innerHTML=`<div class="dgl-kh"><h3 class="dgl-kt">${dglIc("bh")}<span>黑洞裡的你</span></h3><span class="dgl-kbd blue"><span>修為</span> Lv ${S.L}</span></div>
    <div class="dgl-kst"><span><small>${dglIc("hp")}<span>元氣</span></small><b>${S.hp}</b></span><span><small>${dglIc("sp")}<span>靈力上限</span></small><b>${S.sp}</b></span><span><small>${dglIc("rg")}<span>每回合回靈</span></small><b>${S.spRegen}</b></span><span><small>${dglIc("atk")}<span>攻擊力</span></small><b>${BHTD.atkPt(S.atk)}</b></span><span><small>${dglIc("def")}<span>防禦力</span></small><b>${BHTD.defPt(S.def)}</b></span></div>
    <p class="dgl-ks"><span>修為越高，五項越強；身上的星芒進黑洞會變成開局靈力（1 點換 10 靈）。</span></p>`;return d}catch(e){return null}}
/* ---------- 計時與事件 ---------- */
function dglHello(z,busy){if(z!=="land"||busy||document.getElementById("dglOut")||document.querySelector(".walkc"))return;const o=dglSt();if(o.f1)return;
  const fs=DGL.fromZ==="ship";if(!fs&&DGL.s.r>DGL_HELLO)return;o.f1=Date.now();store.set("dgl",o);
  const t=fs?"下了船，每走一會兒就要花一點定軌力；下完一盤棋、解完一題都能補回來。":"在人間走動，每過一會兒就要花一點定軌力；下完一盤棋、解完一題都能補回來。";
  setTimeout(()=>{const said=dglSay(t,false);if(!dglFlashChip()||!said)dglFloat("hello",said?"":t)},1800)}
function dglFx(z,busy){const tired=dglTired(DGL.s.r);let v=document.getElementById("dglVig");const on=tired&&z!=="free"&&!busy&&!document.getElementById("dglOut");
  if(on&&!v){dglCss();v=document.createElement("div");v.id="dglVig";v.setAttribute("aria-hidden","true");document.body.append(v);requestAnimationFrame(()=>v.classList.add("on"))}else if(v)v.classList.toggle("on",on);
  const f=document.getElementById("dglFloat");if(DGL.s.out&&z==="ship"){if(!f||f.dataset.kind!=="rest")dglFloat("rest",`在星槎上歇息，回到 ${DGL_BACK} 就能再下船。`)}else if(f&&f.dataset.kind==="rest")dglFloatOff("rest")}
function dglTick(){if(!DGL_ON)return;const now=Date.now(),dt=Math.max(0,Math.min(now-DGL.last,15e3));DGL.last=now;if(document.hidden)return;
  const h=location.hash;try{dglLocSync(h)}catch(e){}
  if(dglUserOff()){dglPaint();dglFx("free",true);return}   /* 設定關了體力：不扣、不退場、不暈墨、不打招呼 */
  const z=dglZoneNow(h),busy=dglBusy(h);if(z!==DGL.lastZ){DGL.fromZ=DGL.lastZ;DGL.lastZ=z}
  if(busy&&!DGL.done&&document.querySelector(".modal.res,#cjNext"))DGL.done=now;
  const ev=dglStep(DGL.s,dt,z);if(ev.includes("low"))dglTiredSay(true);
  if(ev.includes("back"))toast(`✨ 定軌力回到 ${DGL_BACK}，可以下船了。`);
  const w=dglWhen(DGL.s,{zone:z,busy,done:DGL.done,now,block:!!document.querySelector("#dglOut,#fmOv,#fmOv2,.travel,#preov")||document.body.classList.contains("xqt-on")});
  if(w==="exit")dglExitNow(false);else if(w==="rest"){dglExit(DGL.s);toast(`🌫 定軌力耗盡：在星槎上歇到 ${DGL_BACK} 才能再下船`)}
  dglHello(z,busy);dglPaint();dglFx(z,busy)}
/* 黑洞過關：大量回復（序局、練習賽不算） */
function dglBhEnd(st){if(!dglLive()||!st||!st.result||!st.result.w||st.result.w!==st.human)return;const j=String(st.journey||"");if(!/^bh:/.test(j)||j==="bh:tl"||(typeof BHX_ID!=="undefined"&&j===BHX_ID))return;
  const o=dglSt(),day=dglDay(),cap=dglBhCap(o,day,DGL_BH),g=dglGain(DGL.s,cap);if(g.n>0){dglBhUse(o,day,g.n);store.set("dgl",o)}dglPaint();   /* 11/14：一天最多靠黑洞回 DGL_BH_DAY（實際回了多少才算，滿格沒回到的不算） */
  setTimeout(()=>toast(g.n>0?`✨ 星淵靈氣入體，旅人精神百倍！定軌力 +${Math.round(g.n)}`:cap<=0?`✨ 今天靠黑洞回的定軌力已經滿 ${DGL_BH_DAY} 了`:"✨ 星淵靈氣入體，旅人精神百倍！"),1600)}
/* 解完一題（addXP 的解題類，同一題常有兩筆，3 秒內只算一次）、主線過關 */
function dglXP(why){if(!DGL_ON)return;const w=String(why||""),now=Date.now();if(DGL_MAIN_WHY.includes(w)){dglXmGive(DGL_XM_GET);dglPaint();return}if(!DGL_PUZ_WHY.includes(w))return;
  DGL.done=now;if(now-DGL.pz<3000)return;DGL.pz=now;if(dglLive())dglGain(DGL.s,DGL_PUZ);dglXmGive(DGL_XM_GET);dglPaint()}   /* 關了體力：星芒照給 */

/* ---------- 設定頁開關（05-settings.js 角色分頁呼叫 dglSetRow；切換由下面的 change 監聽） ---------- */
function dglSetRow(){if(!DGL_ON)return"";return`<div class="sec-t">平日體力</div><label class="card row" style="justify-content:space-between;gap:10px;margin-bottom:6px"><span><b>平日體力（定軌力／星芒）</b><br><span class="muted" style="font-size:12.5px">關掉後定軌力不扣、不會化墨退場回星槎，也沒有「心定則棋穩」修為加成，頂欄和各地點的兩條收起來；星芒照常累積，進黑洞、點亮星圖照樣能用</span></span><input type="checkbox" class="sw" id="dglSw" aria-label="平日體力（定軌力／星芒）"${dglUserOff()?"":" checked"}></label>`}
/* 切換：兩個方向都回滿、清掉退場記號（關掉前在船上歇息的人不會卡住；再打開＝像重開 App 一樣滿格） */
function dglSetOff(off){off=!!off;store.set("dglOff",off);DGL.s=dglNew();DGL.done=0;DGL.fx=0;
  if(typeof document!=="undefined"){try{const v=document.getElementById("dglVig");if(v)v.remove()}catch(e){}try{dglFloatOff()}catch(e){}try{dglPaint();dglLocSync()}catch(e){}}return off}

/* ---------- 二十八宿星圖（觀星臺「二十八宿」入口，07gxt-guanxing.js GXT_ACT 呼叫） ---------- */
function dglXiuSheet(){dglCss();sheet("🌌 二十八宿星圖",b=>{
  const draw=sel=>{const o=dglSt(),t=dglXiuMask(o.t),x=dglXm(),n=dglXiuN(t),ttl=(Math.round(+o.tw)||0)&16;
    const info=sel>=0&&dglXiuHas(t,sel)?esc(dglXiuLine(sel)):"點一顆星：已點亮的看說明，還沒點亮的花星芒點亮。";
    b.innerHTML=`<div class="dgl-cd dgl-xt"><div class="dgl-cd-h"><b>星芒（藍）</b><span data-dgl="x">${x}／${DGL_XM_MAX}</span></div><div class="dgl-cd-bar dgl-b"><b></b></div>
      <p class="muted" style="font-size:13px;margin:4px 2px 0;line-height:1.55">每點亮一宿花 ${DGL_XIU_COST} 點星芒。一方七宿點齊，修為 +${DGL_XIANG_XP}；二十八宿全亮，修為 +${DGL_XIU_ALL_XP}，得到稱號「${DGL_XIU_TITLE}」。<br>已點亮 ${n}／${DGL_XIU.length}${ttl?`・🏅 ${DGL_XIU_TITLE}`:""}</p>
      <p class="dgl-xt-info" aria-live="polite">${info}</p>
      ${DGL_XIANG.map((X,k)=>{const L=DGL_XIU.map((s,i)=>[s,i]).filter(([s])=>s[1]===k),m=L.filter(([,i])=>dglXiuHas(t,i)).length;
        return`<div class="dgl-xt-g"><div class="dgl-xt-h"><b>${X[0]}</b><span>${m}／7${m===7?" ✓":""}</span></div><div class="dgl-xt-row">${L.map(([s,i])=>{const on=dglXiuHas(t,i);
          return`<button type="button" class="dgl-xt-s${on?" on":""}${sel===i?" sel":""}" data-i="${i}" aria-label="${s[0]}宿${on?"，已點亮":`，點亮要 ${DGL_XIU_COST} 點星芒`}"><b>${s[0]}</b><small>${on?"✦":DGL_XIU_COST+" 星芒"}</small></button>`}).join("")}</div></div>`}).join("")}
      <p class="muted" style="font-size:12.5px;margin:10px 2px 0">星芒從解殘局、主線過關得來。</p></div>`;
    dglPaint();b.querySelectorAll(".dgl-xt-s").forEach(e=>e.onclick=()=>{const i=+e.dataset.i;vibrate(5);if(dglXiuHas(dglSt().t,i))draw(i);else dglXiuBuy(i,draw)})};
  draw(-1)})}
function dglXiuBuy(i,draw){const o=dglSt(),R=dglXiuLight(o,i);
  if(!R.ok){if(R.why==="poor")toast(`✧ 星芒不夠：還差 ${R.need} 點（解殘局、主線過關可以得到）`);return}
  store.set("dgl",o);try{vibrate([10,40,10])}catch(e){}draw(i);
  try{if(R.xiang>=0)addXP(DGL_XIANG_XP,"星圖","dglxt:"+R.xiang)}catch(e){}
  try{if(R.all)addXP(DGL_XIU_ALL_XP,"星圖","dglxt:all")}catch(e){}
  toast(R.all?`🏅 二十八宿全部點亮！得到稱號「${DGL_XIU_TITLE}」`:R.xiang>=0?`✨ ${DGL_XIANG[R.xiang][0]}七宿點齊了！`:`✦ 點亮${DGL_XIU[i][0]}宿`)}

if(typeof setTop==="function"){const f0=setTop;setTop=function(){const r=f0.apply(this,arguments);try{dglLocSync(null,1)}catch(e){}return r}}   /* 換頁就放／收地點頁的兩條 */
if(typeof meChip==="function"){const f0=meChip;meChip=function(){const r=f0.apply(this,arguments);try{dglChip()}catch(e){}return r}}
if(typeof bhGameEnd==="function"){const f0=bhGameEnd;bhGameEnd=function(st){const r=f0.apply(this,arguments);try{dglBhEnd(st)}catch(e){}return r}}
if(typeof addXP==="function"){const f0=addXP;addXP=function(n,why){const a=Array.prototype.slice.call(arguments);try{if(dglLive()&&+n>0){const B=dglXpBonus(n,DGL.s.r,DGL.fx);DGL.fx=B.fx;a[0]=B.n}}catch(e){}const r=f0.apply(this,a);try{dglXP(why)}catch(e){}return r}}
if(DGL_ON&&typeof window!=="undefined"){
  addEventListener("xq-result",()=>{DGL.done=Date.now();if(dglLive())dglGain(DGL.s,DGL_GAME);dglPaint()});
  document.addEventListener("change",e=>{const t=e.target;if(!t||t.id!=="dglSw")return;try{vibrate(5)}catch(x){}dglSetOff(!t.checked);
    toast(t.checked?"已打開平日體力：定軌力回滿，在人間會慢慢用掉":"已關閉平日體力：定軌力不扣、不會化墨退場；星芒照常")});
  addEventListener("hashchange",()=>{DGL.done=0;setTimeout(dglTick,700)});
  document.addEventListener("visibilitychange",()=>{DGL.last=Date.now()});
  setInterval(dglTick,2000)}
