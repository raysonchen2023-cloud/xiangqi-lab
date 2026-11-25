/* ================= 🔋 平日體力：定軌力（紅）＋星芒（藍）＋化墨退場（開發者 11/13 選定）=================
   規格：story/新手體驗定案_141_兩輪討論.md 第十四節「七星平日的體力與靈力」、「開發者 11/13 選定（第 145、146 題）」、「化墨退場規格」，第二十四節「首頁角色體力」。
   跟黑洞裡的元氣／靈力分開（那是 07bht-td.js 的 BHTD）。
   定軌力（紅，DGL_MAX）：
     人間、星槎、不算的頁（dglZone）：原則照開發者 11/13 更正「船艙是下船後，有人間時辰；只有在船上才雲河無歲月」——
       星槎＝07w8-shichen.js CLK_SHIP_RE 那一組（甲板 #/adventure、#/ship/…、星槎千秋殘局解題頁 #/canju/s/、q/、e/5/、千秋穿梭 #/qqev、千秋穿梭過場 .travel.qq）再加船艙書架讀書 #/shelf/…；
       不算（不扣也不回）＝線上大廳、對戰、觀戰、千秋盃、殘篇閣、設定、意見回饋、週報、條款、我的角色頁；其他都是人間（渡口、園子、驛站、擂台、首頁、書院、茶樓、雅間…）。
       黑洞對局（塔防、星淵急襲、黑洞對戰）＝"bh"：開發者 11/14 選 Claude 修正版（story/黑洞塔防爽度_Gemini提案與審查_1114.md），照人間每分鐘扣 DGL_DRAIN、扣到 0 照樣等那盤下完化墨退場；路由不擋，入口另外關（dglBhLock）。
     人間畫面亮著每分鐘扣 DGL_DRAIN；星槎上不扣、每分鐘回 DGL_SHIP；切到背景時不扣。（11/16 起：體力記在 store "dgl"，關掉 App 再開、切到背景再回來，離開的時間都照星槎上的速度回，不再一開就回滿；見下面 11/16 那一段。）
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
/* 11/16 開發者「在首頁點選角色有一個人間體力和靈力。點進去我的角色頁又有不同數值的體力，先直接拿掉人間的體力靈力設定，太亂了」（選單：關掉並藏起來、存檔保留；二十八宿改成打贏星門圍城的關亮一宿）：
   DGL_HUMAN＝false＝人間的定軌力、星芒整個關掉（跟玩家在設定裡關掉一樣：不扣、不化墨退場、沒有修為加成；星芒不再增加、不再變開局靈力），頂欄兩條、角色卡兩條、設定開關都不畫；
   程式與存檔 dgl 都留著，改回 true 就恢復。角色卡只留卡冊同一組四條（07pty ptyStatHTML） */
const DGL_HUMAN=false;
const DGL_MAX=30,DGL_DRAIN=1,DGL_SHIP=3,DGL_BACK=15,DGL_GAME=2,DGL_PUZ=2,DGL_BH=20,DGL_LOW=10,DGL_XM_MAX=20,DGL_SLOW=1.6,DGL_SAFE=2500,DGL_HELLO=25;   /* DGL_BH＝黑洞過關回多少（三分之二條）；DGL_LOW＝體力低的門檻；DGL_SLOW＝體力低時走路時間乘幾倍；DGL_HELLO＝沒上過船的人扣到多少時補說明 */
const DGL_BH_DAY=20,DGL_DAY_SH=1;   /* 11/14：一天最多靠黑洞回幾點；日界往前挪幾小時（1＝子時 23:00 起算新的一天，跟頂欄時辰鐘的子時一致） */
/* 開發者 11/16（卡冊每位寫「體力 57」、角色卡寫「體力 30／30」）：「這樣人間體力不一樣 玩家會很困惑 而且人間體力歸0後 也只會回到星槎上 根本不會有什麼懲罰」
   → Gemini 討論 story/gemini_app/159，他用選單定了四件事：
   ① 人間體力的上限＝「陪你走」那一位在黑洞裡的體力（元氣）：內部照舊用 0～DGL_MAX 算，節奏不變（大約 30 分鐘用完、歇 5 分鐘能再下船），
      只有畫面上的數字換到那一把尺（dglMx、dglDisp、dglU）；換人陪你走、升級，上限變了，現在的值照比例跟著變。
   ② 歸零不另外罰，改成加大滿格的獎勵：滿格修為 ×DGL_M2、一半以上 ×DGL_M1（原本 ×1.2／×1.1）。
   ③ 關掉 App 再打開不再回滿：記住體力（store "dgl" 的 r、ra、ro），離開的時間照星槎上的速度回（dglWake）；切到背景再回來也一樣。
   ④ 卡冊上黑洞的「靈力」改叫「靈力上限」（07pty-party.js），人間的存量照舊叫靈力。 */
const DGL_M1=1.2,DGL_M2=1.5;
/* 同一天 RPG 數值盤查（story/160_…md）查到上面那版（0635）的問題，開發者再用選單定：
   ⑤ 加成的門檻不再是「滿格／一半」。0635 的滿格只維持半分鐘左右（上限 57 是 32 秒、100 是 18 秒，數字越大掉 1 點越快），在人間下一盤棋根本拿不到 ×1.5。
      改成三分之二以上 ×DGL_M2、三分之一以上 ×DGL_M1（內部 DGL_T2、DGL_T1）：下船後前 10 分鐘、10～20 分鐘、最後 10 分鐘三段，跟上限的數字大小無關。
   ⑥ 上限不取陪你走那一位自己的，改取「全隊體力」＝黑洞開局實際看到的那個數字（已加入的照各自等級、沒加入的用木棋靈，七種棋子平均；點了天賦厚土固元再加），
      人間、卡冊、黑洞三個地方才是同一個數。（①改掉；②③④照舊。）
   ⑦ 不用問的三個洞：重解已經拿過修為的舊題，不再回體力、不再給靈力（原本可以反覆解同一題一直拿）；進對局頁不到 DGL_GAME_MIN 就結束的那一盤（一開局就認輸）不回體力；
      設定裡把平日體力關掉再打開，不再回滿（跟重開 App 一樣接著原本的值）。 */
const DGL_T1=10,DGL_T2=20,DGL_GAME_MIN=6e4;
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
/* 畫面上的數字（11/16 ①）：mx＝這把尺的上限（沒給＝DGL_MAX）。dglDisp＝現在幾點（跟 dglShow 一樣無條件進位，所以還有一點點就不會顯示 0、差一點點滿也顯示滿）；
   dglU＝規則裡的量（回多少、回到多少能下船）換到這把尺，四捨五入、至少 1 */
const dglDisp=(r,mx)=>{mx=+mx>0?Math.round(+mx):DGL_MAX;return mx===DGL_MAX?dglShow(r):Math.max(0,Math.min(mx,Math.ceil((+r||0)/DGL_MAX*mx-1e-9)))};
const dglU=(n,mx)=>{mx=+mx>0?Math.round(+mx):DGL_MAX;n=+n||0;return mx===DGL_MAX?Math.round(n):n>0?Math.max(1,Math.round(n/DGL_MAX*mx)):0};
/* 重開 App、切回前景（11/16 ③）：o＝存著的 {r, ra 存的時間, ro 當時在退場或該退場}；離開的時間照星槎上的速度回。沒有紀錄＝滿的；時間倒退不回也不扣。
   當時用完了（ro 或 r≤0）而且還沒回到能下船＝照舊在星槎歇著（out），回到了就解除 */
function dglWake(o,now){const s=dglNew();if(!o||typeof o!=="object"||!(+o.ra>0)||!isFinite(+o.r))return s;const m=Math.max(0,(+now||0)-(+o.ra))/6e4,r0=Math.max(0,Math.min(DGL_MAX,+o.r));
  s.r=Math.min(DGL_MAX,r0+DGL_SHIP*m);s.out=(!!o.ro||r0<=0)&&s.r<DGL_BACK;return s}
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
const dglXpMul=(r,mx)=>{const M=+mx>0?Math.round(+mx):DGL_MAX,v=dglDisp(r,M);return v>=dglU(DGL_T2,M)?DGL_M2:v>=dglU(DGL_T1,M)?DGL_M1:1};   /* 11/14 開發者：加成照畫面上看到的數字（進位後），差一點點滿、畫面顯示滿格就給滿格的；11/16：倍率改 DGL_M2／DGL_M1，數字照 mx 那把尺 */
function dglXpBonus(n,r,fx,mx){n=Math.round(+n)||0;fx=+fx||0;if(n<=0)return{n,fx};fx+=n*(dglXpMul(r,mx)-1);const add=Math.floor(fx+1e-9);return{n:n+add,fx:Math.max(0,Math.round((fx-add)*1e6)/1e6)}}
/* 星芒帶進黑洞：開局靈力 sp0（已照上限截過）加上星芒 × k（11/14 晚靈力 ×10：1 點星芒＝k 點靈力，預設 1），不超過靈力上限；used＝真的用掉幾點星芒（最後一點不滿 k 也算一點，補到上限） */
function dglXmUse(sp0,spMax,xm,k){k=Math.max(1,Math.round(+k)||1);spMax=Math.max(0,+spMax||0);sp0=Math.max(0,Math.min(spMax,+sp0||0));const sp=Math.min(spMax,sp0+Math.max(0,Math.round(+xm)||0)*k);return{sp,used:Math.ceil((sp-sp0)/k-1e-9)}}
const dglTiredLine=c=>(DGL_TIRED[c]||[])[1]||DGL_TIRED0;
/* 地點頁的小頭像＋兩條（開發者 11/13 晚「每個人間地點都有兩條」）：人間的頁、不是對局／解題頁、不是首頁（首頁用頂欄 meChip）；o.off＝設定關了平日體力 */
function dglLocOn(h,o){o=o||{};if(o.off)return false;return dglZone(h,o)==="land"&&!dglBusy(h)&&dglKey(h)!=="/"}
/* 二十八宿星圖（開發者 11/13 晚：星芒在人間也有用，觀星臺「二十八宿」入口）。每宿 [宿名, 四象序號, 大致所在的今星座, 補充一句]，順序照傳統：
   東方蒼龍角→箕、北方玄武斗→壁、西方白虎奎→參、南方朱雀井→軫。星座對照與補充句都待史學顧問核。
   點亮紀錄放 store "dgl"（跟存檔走）：t＝28 位元遮罩（第 i 位＝第 i 宿）、tw＝拿過的獎（0～3 位＝四象點齊、第 4 位＝全亮＋稱號），不另開存檔鍵 */
const DGL_XIU_COST=2,DGL_XIU_STAR_XP=10,DGL_XIANG_XP=30,DGL_XIU_ALL_XP=100,DGL_XIU_TITLE="觀星客";   /* 11/16 開發者「5項還沒做的請開始做」（Gemini 158 號、開發者選「照這組做」）：每點亮一宿修為 +10、一方七宿點齊 +30、全亮 +100＋稱號；原本只有點齊 +10、全亮 +30，已點亮的人在 dglXiuSync 補差額 */
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
/* 11/16 開發者選單「打贏星門圍城的關亮一宿」（拿掉星芒以後）：可以再點亮幾宿＝星門圍城第一次打贏過的關數（gsv 存檔 c／h／v2，哪個難度贏過都算那一關）－已點亮的宿數；用星芒點亮過的照舊 */
function dglXiuWins(G){if(!G||typeof G!=="object")return 0;const S=new Set(),add=T=>{if(T&&typeof T==="object")for(const[n,r]of Object.entries(T))if(r&&(+r.w||0)>0)S.add(String(n))};add(G.c);add(G.h);
  if(G.v2&&typeof G.v2==="object")for(const[n,D]of Object.entries(G.v2))if(D&&typeof D==="object"&&Object.values(D).some(r=>r&&(+r.w||0)>0))S.add(String(n));return S.size}
const dglXiuLeft=(o,G)=>Math.max(0,dglXiuWins(G)-dglXiuN(dglXiuMask(o&&o.t)));
/* left＝給了就照「打贏的關」算（新規則），沒給照舊花星芒 */
function dglXiuLight(o,i,left){i=Math.round(+i);if(!(i>=0&&i<DGL_XIU.length))return{ok:false,why:"bad"};const t=dglXiuMask(o.t);if(dglXiuHas(t,i))return{ok:false,why:"lit"};
  if(left!=null){if(!(left>=1))return{ok:false,why:"win"}}else{const x=dglXmAdd(o.x,0);if(x<DGL_XIU_COST)return{ok:false,why:"poor",need:DGL_XIU_COST-x};o.x=x-DGL_XIU_COST}
  o.t=t|(1<<i);const k=DGL_XIU[i][1];let tw=Math.round(+o.tw)||0,xiang=-1,all=false;
  if(dglXiangDone(o.t,k)&&!(tw&(1<<k))){tw|=1<<k;xiang=k}if(dglXiuN(o.t)===DGL_XIU.length&&!(tw&16)){tw|=16;all=true}o.tw=tw;return{ok:true,xiang,all}}
/* 點亮後的說明：宿名、四象與方位、第幾宿、大致在今天哪個星座＋補充一句 */
function dglXiuLine(i){const s=DGL_XIU[i];if(!s)return"";const X=DGL_XIANG[s[1]],n=DGL_XIU.filter((y,j)=>j<=i&&y[1]===s[1]).length;
  return`${s[0]}宿：${X[0]}七宿的第${"一二三四五六七"[n-1]}宿（${X[1]}），大致在今天的${s[2]}。${s[3]}`}
/* 角色卡（開發者 11/14 採用 ChatGPT 設計稿 story/chatgpt_app/回覆_角色卡設計_1114.md）：
   DGL_ICO＝角色卡用到的圖示對照表，之後換水墨圖示只改這裡；值寫 "img:路徑" 就畫成圖片（dglIc），其他當文字（emoji）。
   DGL_XM_GET＝解殘局、主線過關各得幾點星芒；DGL_CD_LOW＝角色卡「快回星槎」的門檻（畫面上看到的數字 ≤ 這個） */
const DGL_ICO={red:"🔴",blue:"🔵",land:"⛰️",ship:"🚢",game:"♟️",puz:"🧩",bh:"🌀",zero:"🖌️",flag:"🚩",main:"📜",xiu:"🌌",xm:"✨",hp:"❤️",sp:"🔷",atk:"⚔️",def:"🛡️",rg:"🔄",ttl:"🏅",off:"⏸️",tal:"🌌",sk:"📜",lock:"🔒"};
const DGL_XM_GET=1,DGL_CD_LOW=5;
/* 角色卡的定軌力狀態：off 設定關了、out 化墨退場中（在星槎歇息）、due 用完了（這盤下完就退場）、low 快用完、full 滿格 ×1.2、half 一半以上 ×1.1、none 一半以下沒加成。
   加成照畫面上看到的數字（dglShow，跟頂欄、卡片上的「30／30」一致；dglXpMul 也照 dglShow，看到的就是實際給的） */
function dglCardSt(s,off,mx){if(off)return"off";s=s||{};if(s.out)return"out";if(s.due)return"due";const v=dglShow(s.r);if(v<=DGL_CD_LOW)return"low";const m=dglXpMul(s.r,mx);return m>=DGL_M2?"full":m>1?"half":"none"}
/* 11/14 黑洞的定軌力（開發者選 Claude 修正版）：用完（退場中、該退場、歸零）＝黑洞入口關著；一天最多靠黑洞回 DGL_BH_DAY。
   dglDay＝人間時辰的日界（子時 23:00 起算新的一天）；dglBhCap＝這次過關最多還能回幾點（o＝store "dgl"，o.bd＝{d 日期, n 今天已經回了幾點}）；dglBhUse 記下用掉的 */
const dglBhLocked=s=>!!s&&(!!s.out||!!s.due||(+s.r||0)<=0);
function dglDay(d){d=new Date((d instanceof Date?d.getTime():+d||Date.now())+DGL_DAY_SH*3600e3);return d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate()}
function dglBhCap(o,day,want){const B=o&&o.bd&&o.bd.d===day?o.bd:{d:day,n:0};return Math.max(0,Math.min(Math.max(0,+want||0),DGL_BH_DAY-(+B.n||0)))}
function dglBhUse(o,day,n){const B=o.bd&&o.bd.d===day?o.bd:{d:day,n:0};o.bd={d:day,n:Math.round(((+B.n||0)+Math.max(0,+n||0))*100)/100};return o.bd}
/* 化墨退場後還要幾分鐘能下船（星槎上每分鐘回 DGL_SHIP，回到 DGL_BACK 才能下船；無條件進位） */
const dglBackMin=r=>Math.max(0,Math.ceil((DGL_BACK-(+r||0))/DGL_SHIP-1e-9));
/* #DGL-PURE-END */

const DGL={s:dglNew(),last:Date.now(),done:0,pz:0,say:0,lastZ:"",fromZ:"",walk:new Set(),wt:0,ft:0,kt:0,hid:0};
try{if(DGL_ON)DGL.s=dglWake(store.get("dgl",null),Date.now())}catch(e){}   /* 11/16 ③：重開 App 接著上次的體力，離開的時間照星槎上的速度回 */
/* 11/16 黑洞新規則（story/164、166 第三期，開發者選單）：人間那一條改回「定軌力」、自己的上限 DGL_MAX，不再跟黑洞的體力掛鉤（拆掉上面 ⑥ 的全隊體力）。
   三分之二／三分之一的加成門檻（⑤）、記住體力（③）照舊；dglDisp／dglU 碰到 mx＝DGL_MAX 就是原樣 */
function dglMx(){return DGL_MAX}
/* 記住體力（11/16 ③）：寫進 store "dgl"（讀了再寫，不蓋掉星芒、星圖那些欄位）；設定關了平日體力時不記 */
function dglKeep(){try{if(!dglLive())return;const o=dglSt();o.r=Math.round(DGL.s.r*100)/100;o.ra=Date.now();o.ro=DGL.s.out||DGL.s.due?1:0;store.set("dgl",o);DGL.kt=o.ra}catch(e){}}
const dglRM=()=>{try{return matchMedia("(prefers-reduced-motion: reduce)").matches}catch(e){return false}};
function dglSt(){const o=store.get("dgl",null);return o&&typeof o==="object"?o:{}}
function dglXm(){return dglXmAdd(dglSt().x,0)}
function dglXmGive(n){const o=dglSt(),x0=dglXmAdd(o.x,0);o.x=dglXmAdd(x0,n);store.set("dgl",o);return o.x-x0}
/* 07bht-td.js bhtdStart 呼叫：回傳這一局帶進去幾點（＝用掉的），同時從身上扣掉 */
function dglXmTake(sp0,spMax,k){try{if(!DGL_ON||!DGL_HUMAN)return 0;const o=dglSt(),U=dglXmUse(sp0,spMax,dglXmAdd(o.x,0),k);if(U.used>0){o.x=dglXmAdd(o.x,-U.used);store.set("dgl",o)}return U.sp-Math.max(0,Math.min(Math.max(0,+spMax||0),+sp0||0))}catch(e){return 0}}   /* 回傳換到幾點靈力（k＝1 時跟用掉的星芒一樣） */
/* 設定頁「平日體力（定軌力／星芒）」開關（開發者 11/13 晚、第 16 輪評比第 2 項）：store dglOff（設定，不跟存檔走），預設 false＝開著。
   關掉：定軌力不扣、不化墨退場、沒有心定則棋穩加成、不走慢不暈墨，頂欄與地點頁的兩條藏起來（html[data-dgloff]）；星芒照常累積、照常帶進黑洞、照常點亮星圖 */
function dglUserOff(){if(!DGL_HUMAN)return true;try{return!!store.get("dglOff",false)}catch(e){return false}}
const dglLive=()=>DGL_ON&&!dglUserOff();
const dglSlow=()=>dglLive()?dglSlowOf(DGL.s.r):1;
/* 11/14：黑洞入口關不關（觀星臺渾儀、星槎「星淵」、關卡卡片、結果視窗「再刷一場」都問這裡）；設定關掉平日體力＝永遠開著 */
function dglBhLock(){try{return dglLive()&&dglBhLocked(DGL.s)}catch(e){return false}}
function dglBhLockMsg(){return DGL.s.due&&!DGL.s.out?"定軌力用完了，黑洞入口先關著：這盤下完先回星槎歇息":`定軌力用完了，黑洞入口先關著：在星槎歇到 ${dglU(DGL_BACK,dglMx())} 再來`}
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
.dgl-kme{width:100%;min-height:48px;margin-top:4px}.dgl-khi{min-width:0;flex:1}.dgl-kxp{display:block;position:relative;height:8px;margin:5px 0 2px;border-radius:4px;overflow:hidden;background:color-mix(in srgb,currentColor 12%,transparent)}.dgl-kxp b{position:absolute;left:0;top:0;bottom:0;border-radius:4px;background:#C9A24A}.dgl-khero .dgl-kxpn{display:block;font-size:13px;color:var(--muted,#7A6A58);font-variant-numeric:tabular-nums}.dgl-kpan{border:1px solid color-mix(in srgb,currentColor 16%,transparent);border-radius:16px;padding:6px 12px 10px;margin:10px 0 8px}.dgl-krow{display:grid;grid-template-columns:minmax(6.7em,auto) 1fr auto;align-items:center;gap:8px;min-height:42px}.dgl-krow .dgl-kt{margin:0;font-size:16px;white-space:nowrap}.dgl-krow .dgl-ksub{font-size:12px}.dgl-krow .dgl-kbar{height:14px;border-radius:7px}.dgl-krow .dgl-kbar b{border-radius:7px}.dgl-krow .dgl-kv{min-width:4.4em;font-size:18px;text-align:right}.dgl-krow.dgl-koff{grid-template-columns:auto 1fr}.dgl-krow.dgl-koff .dgl-ks{margin:0;justify-content:flex-end}.dgl-kpan>.dgl-kl{margin:2px 0 4px;font-size:15px}.dgl-kpan .dgl-kad{margin:8px 0 0;padding-top:10px;border-top:1px solid color-mix(in srgb,currentColor 12%,transparent)}.dgl-kfoot{display:flex;gap:8px;align-items:center}.dgl-kfoot .dgl-kme{flex:1;margin:0}.dgl-kfoot .dgl-kqb{display:inline-flex;align-items:center;gap:6px;width:auto;height:auto;min-height:48px;margin:0;padding:0 14px;border-radius:12px;font-weight:800}.dgl-kmh{margin:6px 0 2px;font-size:14px;font-weight:900}.dgl-kgo{width:100%;margin:0;padding:0;border:0;background:none;color:inherit;font:inherit;text-align:left;cursor:pointer;-webkit-tap-highlight-color:transparent}.dgl-kgo .dgl-ks{margin:0;justify-content:flex-end;font-size:15px}.dgl-kgo .dgl-ks span{color:var(--muted,#7A6A58)}.dgl-kchev{font-size:22px;font-weight:900;line-height:1;color:var(--muted,#7A6A58)}.dgl-kgo:focus-visible{outline:2px solid #3d85d6;outline-offset:2px;border-radius:8px}.dgl-kpan>.dgl-kgo[data-go=tal]{border-bottom:1px solid color-mix(in srgb,currentColor 12%,transparent);margin-bottom:4px}.dgl-kpan>.dgl-kgo[data-go=sk]{border-top:1px solid color-mix(in srgb,currentColor 12%,transparent);margin-top:8px}.dgl-ski{padding:10px 2px;border-bottom:1px solid color-mix(in srgb,currentColor 12%,transparent)}.dgl-ski.lk{opacity:.55}.dgl-skh{display:flex;justify-content:space-between;align-items:baseline;gap:8px;font-size:16px}.dgl-skh>span{flex:none;font-weight:800;color:#2f6fbd}.dgl-ski.lk .dgl-skh>span{color:var(--muted,#7A6A58)}.dgl-ski p{margin:2px 0 0;font-size:14px;line-height:1.5;color:var(--muted,#7A6A58)}
.dgl-khero{position:relative;gap:16px;margin:2px 0 4px;padding-right:38px}
.dgl-kfig{position:relative;flex:none;display:grid;place-items:center;width:92px;height:108px;border-radius:14px;border:1.5px solid #C9A24A;background:color-mix(in srgb,currentColor 6%,transparent)}.dgl-khero .dgl-kfig img{width:80px;height:96px}
.dgl-kpc{position:absolute;right:-9px;bottom:-9px;display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:#C9A24A;color:#2A1F15;font:900 16px/1 var(--serif,serif);font-style:normal}
.dgl-khero b{font-size:22px;line-height:1.2}.dgl-khero .dgl-klv{display:flex;align-items:baseline;gap:8px;margin-top:5px;font-size:26px}
.dgl-khero .dgl-klv>span{font-size:12px;font-weight:800;line-height:1.5;color:#C9A24A;border:1px solid #C9A24A;border-radius:6px;padding:0 7px}
.dgl-khero .dgl-kxp{height:4px;margin:10px 0 3px;border-radius:2px}.dgl-khero .dgl-kxp b{border-radius:2px}
.dgl-kqt{position:absolute;right:-6px;top:-8px;margin:0}
.dgl-cd .dgl-kpan{border:0;padding:0;margin:16px 0 12px}.dgl-cd .dgl-kpan.dgl-kwarn{padding:8px 10px;border-radius:12px}
.dgl-krow.dgl-k2{grid-template-columns:1fr auto;grid-template-areas:"t v" "bar bar";gap:5px 8px;min-height:0;margin:0 0 12px}
.dgl-k2 .dgl-kt{grid-area:t;font-size:15px;font-weight:800}.dgl-k2 .dgl-kv{grid-area:v;min-width:0;font-size:16px}.dgl-k2 .dgl-kbar{grid-area:bar;height:10px;border-radius:5px}.dgl-k2 .dgl-kbar b{border-radius:5px}.dgl-k2>span:empty{display:none}
.dgl-cd .dgl-kpan>.dgl-kl{margin:-4px 0 10px}
.dgl-cd .dgl-kpan .dgl-kad{margin:4px 0 0;padding-top:0;border-top:0;gap:10px}
.dgl-cd .dgl-kad>span{flex-direction:column;align-items:flex-start;justify-content:center;gap:2px;min-height:62px;padding:8px 14px}
.dgl-cd .dgl-kad small{font-size:13px;font-weight:700;color:var(--muted,#7A6A58)}.dgl-cd .dgl-kad b{font-size:24px}
.dgl-kts{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}
.dgl-kts .dgl-kgo{display:grid;grid-template-columns:1fr auto;grid-template-areas:"t c" "s s";align-items:center;gap:2px 6px;min-height:62px;padding:8px 14px;border-radius:14px;border:1px solid color-mix(in srgb,currentColor 18%,transparent);background:color-mix(in srgb,currentColor 6%,transparent)}
.dgl-kts .dgl-kgo .dgl-kt{grid-area:t;font-size:15px}.dgl-kts .dgl-kgo .dgl-kchev{grid-area:c;font-size:18px}.dgl-kts .dgl-kgo .dgl-ks{grid-area:s;justify-content:flex-start;font-size:13px}
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
function dglPaint(){if(!DGL_ON||typeof document==="undefined")return;const mx=dglMx(),r=dglDisp(DGL.s.r,mx),x=dglXm(),low=dglTired(DGL.s.r);   /* 11/16 ①：數字照陪你走那一位的尺（mx）；條的長度照舊是比例 */
  document.querySelectorAll(".dgl-bars,.dgl-head,.dgl-float,.dgl-cd").forEach(e=>{e.querySelectorAll(".dgl-r b").forEach(b=>b.style.width=(100*r/mx).toFixed(1)+"%");e.querySelectorAll(".dgl-b b").forEach(b=>b.style.width=(100*x/DGL_XM_MAX).toFixed(1)+"%");e.classList.toggle("low",low)});
  document.querySelectorAll("[data-dgl=r]").forEach(e=>e.textContent=r+"／"+mx);document.querySelectorAll("[data-dgl=x]").forEach(e=>e.textContent=x+"／"+DGL_XM_MAX);
  const b=document.getElementById("meChip");if(b&&b.querySelector(".dgl-bars"))b.title=`定軌力 ${r}／${mx}・星芒 ${x}／${DGL_XM_MAX}`;
  const L=document.getElementById("dglLoc");if(L){const t=`我的角色：定軌力 ${r}／${mx}，星芒 ${x}／${DGL_XM_MAX}`;if(L.title!==t){L.title=t;L.setAttribute("aria-label",t)}}
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
  if(DGL_HUMAN&&sm&&!sm.querySelector(".dgl-bars")){const s=document.createElement("span");s.className="dgl-bars";s.setAttribute("aria-hidden","true");s.innerHTML=dglBarsHTML;sm.append(s)}
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
  if(!S.dglY)S.dglY=Date.now()-14e3;if(!DGL.wt)DGL.wt=(typeof bgpEvery==="function"?bgpEvery:setInterval)(dglWalkTick,300);dglPaint();
  if(dglTired(DGL.s.r))setTimeout(()=>dglTiredSay(false),2600)}
function dglWalkTick(){const now=Date.now(),tired=dglTired(DGL.s.r);
  for(const S of[...DGL.walk]){const e=S.dglHead;if(!S.box.isConnected){if(e)e.remove();DGL.walk.delete(S);continue}if(!e)continue;
    const m=/translate\(([-\d.]+)px,\s*([-\d.]+)px\)\s*scale\(([\d.]+)\)/.exec(S.box.style.transform),cv=S.box.querySelector("canvas"),L=e.parentNode,say=L&&L.querySelector(".shw-say.on");
    if(!tired||!m||!cv||!S.box.classList.contains("on")||S.box.style.opacity==="0"||say){e.style.display="none";continue}
    const k=+m[3],ch=parseFloat(cv.style.height)||cv.clientHeight,T=parseFloat(cv.style.top)||0,top=+m[2]+(T+ch*.12)*k;
    Object.assign(e.style,{display:"block",left:(+m[1]).toFixed(1)+"px",top:(top-6).toFixed(1)+"px"});
    if(!S.go&&!dglRM()&&now-S.dglY>2e4){S.dglY=now;dglYawn(S)}}
  if(!DGL.walk.size){(typeof bgpStop==="function"?bgpStop:clearInterval)(DGL.wt);DGL.wt=0}}
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
  setTimeout(()=>{ov.classList.add("bye");setTimeout(()=>{ov.remove();toast(`在星槎上歇息：大約 ${Math.ceil(DGL_BACK/DGL_SHIP)} 分鐘回到 ${dglU(DGL_BACK,dglMx())}，就能再下船`)},500)},rm?1500:2400)}
/* 02-shell.js route() 開頭呼叫：化墨退場後（或該退場了）要進人間的頁 → 擋下來回星槎 */
function dglRouteGate(){try{if(!dglLive())return false;const h=location.hash,g=dglGate(DGL.s,h,{bh:dglBh(h)});if(!g)return false;
    if(g==="exit"){dglExitNow(true);return true}
    navReplace("#/adventure");setTimeout(()=>toast(`🌫 定軌力 ${dglDisp(DGL.s.r,dglMx())}／${dglMx()}：在星槎上歇到 ${dglU(DGL_BACK,dglMx())} 才能再下船`),450);return true}catch(e){return false}}

/* ---------- 角色卡（點頭像）：開發者 11/14 採用 ChatGPT 角色卡設計（story/chatgpt_app/回覆_角色卡設計_1114.md 第 1～5 節）。
   每塊「一句大字＋圖示膠囊」，原本的條列細則收進每塊右上角的「？」（點了展開、再點收起）。規則字都從 DGL_* 常數組；圖示查 DGL_ICO（dglIc）。
   數字跟中文分在不同的文字節點（07i18n 逐節點查字典，規則數字改了英文也不會失效）。卡片開著時狀態一變（dglCardKey）就重畫，展開的「？」保持展開 ---------- */
const dglIc=k=>{const v=String(DGL_ICO[k]||"");return/^img:/.test(v)?`<img class="dgl-ic" src="${esc(v.slice(4))}" alt="" aria-hidden="true">`:`<i class="dgl-ic" aria-hidden="true">${v}</i>`};
function dglCardKey(){const mx=dglMx(),st=dglCardSt(DGL.s,dglUserOff(),mx);return st+(st==="out"?":"+dglBackMin(DGL.s.r):"")+":"+mx}   /* 11/16：上限變了（換人陪你走、升級）也重畫 */
/* 「？」鈕（44×44；讀屏念「定軌力細則」＋展開／收起）與它收著的細則 */
const dglCdQ=(id,lab,open)=>`<button type="button" class="dgl-kq" data-q="${id}" aria-expanded="${open?"true":"false"}" aria-controls="dglQ_${id}" aria-label="${lab}"><span aria-hidden="true">？</span></button>`;
const dglCdMore=(id,open,L)=>`<div class="dgl-kmore" id="dglQ_${id}"${open?"":" hidden"}><ul>${L.map(t=>`<li>${t}</li>`).join("")}</ul></div>`;
function dglCard(){dglCss();let nm="";try{nm=meName()}catch(e){}const Q=new Set();
  sheet("🙂 我的角色",b=>{   /* 11/14 開發者選 B：標題固定「我的角色」，名字只留頭部那一個 */const draw=()=>{const s=DGL.s,mx=dglMx(),r=dglDisp(s.r,mx),x=dglXm(),off=dglUserOff(),st=dglCardSt(s,off,mx),k=dglCardKey(),sy=b.scrollTop;
    let im="",rk="",lv=1;try{im=meImg();rk=rankInfo().name;lv=xpInfo().L}catch(e){}
    const Sx=dglSt(),xn=dglXiuN(Sx.t),ttl=(Math.round(+Sx.tw)||0)&16,m1=DGL_M1,m2=DGL_M2,mu=dglXpMul(s.r,mx),warn=st==="low"||st==="due"||st==="out";
    /* 11/14 開發者看手機截圖：「對新手玩家這內容還是太複雜」→ 選「所有人都極簡」：每塊只留圖示、名稱、數字、一條、一句話；
       刻度、膠囊、來源→用途、加成徽章都收進「？」；黑洞三個數字搬到我的角色頁（dglMeCard），黑洞選關卡片本來也有 */
    const t1=dglU(DGL_T1,mx),t2=dglU(DGL_T2,mx),bonus=mu>=m2?`<span>現在定軌力</span> ${t2} <span>以上，得到的修為</span> ×${m2}`:mu>1?`<span>現在體力</span> ${t1} <span>以上，得到的修為</span> ×${m1}<span>；到</span> ${t2} <span>以上是</span> ×${m2}`:`<span>體力到</span> ${t1} <span>以上，得到的修為</span> ×${m1}<span>；到</span> ${t2} <span>以上是</span> ×${m2}`;   /* 11/16 ⑤：寫出門檻是幾點；盤查第 22 項：加成其實所有修為都乘，不只下棋、解題，字跟著改 */
    /* 開發者 11/15「體力／靈力／攻擊／防禦的排版照 RPG 遊戲設計師調整」→ 選「經典狀態欄」：
       頭部＝頭像＋名字＋修為 Lv＋經驗條；下面一塊面板＝紅血、藍血兩條緊貼（名稱｜條｜數字），再一排攻擊力、防禦力；
       平常的說明句都收進底下「？ 細則」，卡上只留狀態警告（快用完、這盤下完要歇、化墨退場倒數） */
    let red="",line="";
    if(!DGL_HUMAN){}else if(off)red=`<div class="dgl-krow dgl-koff"><span class="dgl-kt">${dglIc("off")}<span>平日體力已關閉</span></span><span class="dgl-ks"><span>不扣、不退場、無加成</span></span></div>`;
    else{line=st==="out"?`<span>化墨退場中・</span><b class="dgl-knum">${dglBackMin(s.r)}</b> <span>分鐘後可以下船</span>`:st==="due"?"<span>這盤下完，就回星槎歇息</span>":st==="low"?"<span>快用完了，回星槎歇一下吧</span>":"";
      red=`<div class="dgl-krow dgl-k2"><span class="dgl-kt">${dglIc("red")}<span>體力</span></span><div class="dgl-kbar dgl-r" aria-hidden="true"><b style="width:${(100*r/mx).toFixed(1)}%"></b></div><span class="dgl-kv" data-dgl="r">${r}／${mx}</span></div>`}
    const xs=!DGL_HUMAN?"":`<div class="dgl-krow dgl-k2"><span class="dgl-kt">${dglIc("blue")}<span>靈力</span></span>${off?"<span></span>":`<div class="dgl-kbar dgl-b" aria-hidden="true"><b style="width:${(100*x/DGL_XM_MAX).toFixed(1)}%"></b></div>`}<span class="dgl-kv" data-dgl="x">${x}／${DGL_XM_MAX}</span></div>`;
    let xp=null;try{xp=xpInfo()}catch(e){}const xpBar=xp&&xp.need>0?`<span class="dgl-kxp" aria-hidden="true"><b style="width:${(100*Math.min(1,(xp.rest||0)/xp.need)).toFixed(1)}%"></b></span><small class="dgl-kxpn"><span>距離下一級</span> ${xp.rest||0}／${xp.need}</small>`:"";
    /* 開發者 11/15「根據 RPG 熱門遊戲重新設計角色的這一頁」「角色數值卡精簡／美化／排版，不要出現定軌力和星芒（細節再提即可）」（設計稿他選「照這版做」）：
       頭部＝放大的立繪（金框、右下角本命子徽章）＋名字大字＋「修為」小標與 Lv 大字＋細金線經驗條，右上角一顆「？」開細則（原本在底下的「？ 細則」鈕搬上來）；
       體力、靈力各一條（名稱在左、數字在右、條在下面），卡面不再寫「定軌力」「星芒」，這兩個詞只留在細則裡；
       攻擊力、防禦力、天賦、技能排成四格；底下只留主要按鈕。字樣（體力、靈力、攻擊力、防禦力、距離下一級、已點亮、已學會）不變，07i18n 的字典照用 */
    let pc="";try{pc=typeof botPc==="function"?String(botPc()||""):""}catch(e){}
    const hero=`<div class="dgl-khero${st==="out"?" out":""}"><span class="dgl-kfig">${im?`<img src="${esc(im)}" alt="">`:""}${pc?`<i class="dgl-kpc" aria-hidden="true">${esc(pc)}</i>`:""}</span><div class="dgl-khi"><b>${esc(nm||rk)}</b><span class="dgl-klv"><span>修為</span> Lv ${lv}</span>${ttl?`<span class="dgl-kttl">${dglIc("ttl")}<span>${DGL_XIU_TITLE}</span></span>`:""}${xpBar}</div><button type="button" class="dgl-kq dgl-kqt" data-q="all" aria-expanded="${Q.has("all")?"true":"false"}" aria-controls="dglQ_all" aria-label="細則"><span aria-hidden="true">？</span></button></div>`;
    const NEW=typeof SG2G!=="undefined"&&typeof ptyStatHTML==="function",ad=NEW?dglCardSV():dglCardAD(lv);   /* 11/16：有黑洞新規則＝卡冊同一組四條 */
    const grp=(t,L)=>`<p class="dgl-kmh">${t}</p><ul>${L.map(z=>`<li>${z}</li>`).join("")}</ul>`;
    let more=`<div class="dgl-kmore" id="dglQ_all"${Q.has("all")?"":" hidden"}>`+(off?grp("平日體力",["平日體力已在設定裡關掉：定軌力不扣、不會化墨退場，也沒有「心定則棋穩」修為加成。","想再打開：設定 → 👘 換造型，裡面的「平日體力」。"]):
        grp("體力・定軌力",[...(mx!==DGL_MAX?[`<span>體力上限是全隊的體力，進黑洞開局也是這個數，現在是</span> ${mx}<span>；夥伴加入、升級都會跟著變。</span>`]:[]),"下船後會慢慢用掉，回星槎就補回來。",bonus,`<span>在人間（下船以後）大約</span> ${Math.round(DGL_MAX/DGL_DRAIN)} <span>分鐘用完；在星槎上不會少。</span>`,`<span>下完一盤棋、解完一題，各回</span> ${dglU(DGL_GAME,mx)} <span>點。</span>`,`<span>黑洞過關回</span> ${dglU(DGL_BH,mx)} <span>點，一天最多回</span> ${dglU(DGL_BH_DAY,mx)} <span>點。</span>`,"離開 App 的時間也會慢慢回，跟在星槎上歇息一樣。","定軌力用完時，黑洞入口也會關。",`<span>用完了會化墨退場，回星槎歇息：大約</span> ${Math.ceil(DGL_BACK/DGL_SHIP)} <span>分鐘回到</span> ${dglU(DGL_BACK,mx)} <span>點，就能再下船。</span>`,"線上大廳、千秋盃不用定軌力。"]))+
      grp("靈力・星芒",["解殘局、過主線章節就會得到。",`解殘局、主線過關，各得 ${DGL_XM_GET} 點，最多存 ${DGL_XM_MAX} 點。`,`在觀星臺可以點亮二十八宿星圖：每宿 ${DGL_XIU_COST} 點。`,`<span>已點亮</span> ${xn}／${DGL_XIU.length}`,"進黑洞時，星芒會變成開局靈力，用掉多少扣多少。","最多補到靈力上限。","提示照舊免費，不用花星芒。"])+
      (ad?grp("攻擊力・防禦力",["修為越高，攻擊力和防禦力越強（黑洞裡用）。","以 100 為基準，數字越大越強。"]):"")+`</div>`;
    /* 開發者 11/15「角色卡：天賦／體力／靈力／攻擊／防禦／技能；天賦點進去是角色的天賦，技能點進去是目前學會的招式」：
       天賦＝黑洞星塵天賦樹（bhtdTal，看完回角色卡）、技能＝這位角色的黑洞招式清單（dglSkills）；黑洞模組沒載入、沒選角色就不畫這兩列 */
    if(!DGL_HUMAN)more=`<div class="dgl-kmore" id="dglQ_all"${Q.has("all")?"":" hidden"}>`+grp("黑洞裡的數值",["體力、靈力、攻擊力、防禦力是這位在黑洞（星門圍城）裡的數值，等級越高越強；跟雲河七星卡冊上的一樣。",
      "條的長度：體力、攻擊力、防禦力跟同等級七種棋子裡最高的比；靈力跟 Lv100 的比。"])+`</div>`;   /* 11/16 人間體力、星芒拿掉：細則只留黑洞數值，不寫「上限」 */
    const ts=NEW?dglCardTS2():dglCardTS(lv);
    const pan=`<section class="dgl-kpan${warn?" dgl-kwarn":""}" aria-label="角色狀態">${red}${xs}${line?`<p class="dgl-kl">${line}</p>`:""}${ad}${ts?`<div class="dgl-kts">${ts.tal}${ts.sk}</div>`:""}</section>`;
    b.innerHTML=`<div class="dgl-cd" data-k="${k}">${hero}${pan}<div class="dgl-kfoot"><button type="button" class="btn dgl-kme" id="dglMe">🙂 我的角色頁</button>${typeof ptySheet==="function"&&typeof journey==="function"&&journey()?`<button type="button" class="btn dgl-kme" id="dglPty">雲河七星</button>`:""}</div>${more}</div>`;
    b.querySelector("#dglMe").onclick=()=>{closeSheet();location.hash="#/me"};{const e=b.querySelector("#dglPty");if(e)e.onclick=()=>{closeSheet();setTimeout(ptySheet,60)}}   /* 11/15 七星改版：七位各自的等級、星輝、陪你走的人在卡冊（07pty-party.js；11/16 取消隊長） */
    b.querySelectorAll("[data-go]").forEach(e=>e.onclick=()=>{try{vibrate(5)}catch(z){}if(e.dataset.go==="tal"){closeSheet();setTimeout(()=>{if(NEW&&typeof sg2TalSheet==="function")sg2TalSheet(()=>dglCard(),"‹ 回我的角色",dglWho());else bhtdTal(()=>dglCard(),"‹ 回我的角色")},60)}else if(NEW&&typeof ptySkills==="function"){closeSheet();setTimeout(()=>ptySkills(dglWho()),60)}else dglSkills(lv)});   /* 11/16：天賦樹的返回鈕照從哪裡進來的寫（原本一律寫「回選關」） */
    b.querySelectorAll(".dgl-kq").forEach(e=>e.onclick=()=>{const id=e.dataset.q,o=!Q.has(id),p=b.querySelector("#dglQ_"+id);if(o)Q.add(id);else Q.delete(id);e.setAttribute("aria-expanded",o?"true":"false");if(p)p.hidden=!o;try{vibrate(5)}catch(z){}});
    b.scrollTop=sy;dglPaint()};
  DGL.cdDraw=draw;draw()})}
/* 角色卡的天賦、技能兩列（可點）：天賦＝已點亮幾個／共幾個（bhtdDust().t）；技能＝這位角色已學會幾招／共幾招（BHTD.SK 照修為解鎖） */
function dglCardTS(lv){try{const c=dglName();if(typeof ptyLv==="function")lv=ptyLv(c);   /* 11/15 七星改版：天賦、技能看這位角色自己的等級 */if(typeof BHTD==="undefined"||!BHTD.CH||!BHTD.CH[c]||typeof bhtdTal!=="function")return null;const S=BHTD.stats(c,lv),pool=BHTD.SK.filter(s=>s.ch===S.ck),un=pool.filter(s=>s.lv<=lv);
  let tn=0;try{tn=(bhtdDust().t||[]).length}catch(e){}
  const row=(go,ic,nm,v)=>`<button type="button" class="dgl-krow dgl-kgo" data-go="${go}"><span class="dgl-kt">${dglIc(ic)}<span>${nm}</span></span><span class="dgl-ks">${v}</span><span class="dgl-kchev" aria-hidden="true">›</span></button>`;
  return{tal:row("tal","tal","天賦",`<span>已點亮</span> ${tn}／${BHTD.TAL.length}`),sk:row("sk","sk","技能",`<span>已學會</span> ${un.length}／${pool.length}`)}}catch(e){return null}}
/* 技能清單：已學會的在前（名稱、靈力、效果），還沒學會的灰著寫幾級學會 */
function dglSkills(lv){let c="";try{c=dglName()}catch(e){}try{if(typeof ptyLv==="function")lv=ptyLv(c)}catch(e){}if(typeof BHTD==="undefined"||!BHTD.CH||!BHTD.CH[c])return;const S=BHTD.stats(c,lv),pool=BHTD.SK.filter(s=>s.ch===S.ck).slice().sort((a,b)=>(a.lv>lv)-(b.lv>lv)||a.lv-b.lv);
  sheet("技能",b=>{b.innerHTML=`<div class="dgl-cd">${pool.map(s=>{const lk=s.lv>lv;return`<div class="dgl-ski${lk?" lk":""}"><div class="dgl-skh"><b>${lk?dglIc("lock"):""}${esc(s.nm)}</b><span>${lk?`Lv ${s.lv} <span>學會</span>`:`${s.cost} <span>靈</span>`}</span></div><p>${esc(s.d||"")}</p></div>`}).join("")}<p class="dgl-ks"><span>在黑洞裡使用，學會的都會帶上場</span></p><button type="button" class="btn dgl-kme" id="dglSkB">‹ 回我的角色</button></div>`;
    b.querySelector("#dglSkB").onclick=()=>{closeSheet();setTimeout(dglCard,60)}})}
/* 11/14 開發者「修為／攻擊力／防禦／紅血／藍血」：角色卡第 4 列＝攻擊力、防禦力兩格（顯示 BHTD.atkPt／defPt 的數值，100 為基準、越大越強）（BHTD.stats 照角色與修為；黑洞模組沒載入、沒選角色就整列不畫） */
function dglCardAD(lv){try{const c=dglName();if(typeof ptyLv==="function")lv=ptyLv(c);if(typeof BHTD==="undefined"||!BHTD.CH||!BHTD.CH[c])return"";const S=BHTD.stats(c,lv);
  return`<div class="dgl-kad"><span><small>${dglIc("atk")}<span>攻擊力</span></small><b>${BHTD.atkPt(S.atk)}</b></span><span><small>${dglIc("def")}<span>防禦力</span></small><b>${BHTD.defPt(S.def)}</b></span></div>`}catch(e){return""}}
/* 11/16 開發者「這邊也要改成前面說的bar和排版」「不能在任何地方寫上限」（角色卡、我的角色頁「黑洞裡的你」）：有黑洞新規則（07sg2）就用卡冊同一組四條（07pty ptyStatHTML，
   陪你走那一位 ptyLook、照他自己的等級）；天賦開每位專屬天賦頁（sg2TalSheet）、招式開這位的招式清單（ptySkills）。沒有新規則（舊測試、模組沒載入）照舊 */
const dglWho=()=>{try{if(typeof ptyLook==="function"){const c=ptyLook();if(c)return c}}catch(e){}return dglName()};
function dglCardSV(){try{const c=dglWho();if(!c||typeof ptyStatHTML!=="function")return"";try{if(typeof ptyCss==="function")ptyCss()}catch(e){}return ptyStatHTML(c,typeof ptyLv==="function"?ptyLv(c):1)}catch(e){return""}}
function dglCardTS2(){try{const c=dglWho();if(!c||typeof ptySkPool!=="function")return null;const lv=typeof ptyLv==="function"?ptyLv(c):1,pool=ptySkPool(c),un=pool.filter(s=>s.lv<=lv);let tn=0;try{const T=typeof sg2TalGet==="function"?sg2TalGet():{};tn=(T[c]||[]).length}catch(e){}   /* 11/16：這一位自己點亮的（天賦頁也只看這一位） */
  const row=(go,ic,nm,v)=>`<button type="button" class="dgl-krow dgl-kgo" data-go="${go}"><span class="dgl-kt">${dglIc(ic)}<span>${nm}</span></span><span class="dgl-ks">${v}</span><span class="dgl-kchev" aria-hidden="true">›</span></button>`;
  return{tal:row("tal","tal","天賦",`<span>已點亮</span> ${tn}${typeof SG2G!=="undefined"?"／"+SG2G.TAL_MAX:""}`),sk:row("sk","sk","招式",`<span>已學會</span> ${un.length}／${pool.length}`)}}catch(e){return null}}
/* 我的角色頁（07-legend Me）多一張「黑洞裡的你」：11/14 從角色卡搬過來；黑洞（觀星臺）解鎖後才出現 */
function dglMeCard(){try{if(typeof SG2G!=="undefined"&&typeof ptyStatHTML==="function"){const c=dglWho();if(!c||!(typeof gxtOpen==="function"&&gxtOpen()))return null;dglCss();try{if(typeof ptyCss==="function")ptyCss()}catch(e){}
    const lv=typeof ptyLv==="function"?ptyLv(c):1,d=document.createElement("section");d.className="card dgl-kc dgl-me";   /* 11/16：新規則四條，不寫「上限」、不再有每回合回靈、星芒換靈力 */
    d.innerHTML=`<div class="dgl-kh"><h3 class="dgl-kt">${dglIc("bh")}<span>黑洞裡的你</span></h3><span class="dgl-kbd blue"><span>修為</span> Lv ${lv}</span></div>${ptyStatHTML(c,lv)}<p class="dgl-ks"><span>修為越高，四項越強。</span></p>`;return d}}catch(e){return null}
  try{const c=dglName();if(!c||typeof BHTD==="undefined"||typeof bhtdL!=="function"||!(typeof gxtOpen==="function"&&gxtOpen()))return null;
  dglCss();const S=BHTD.stats(c,bhtdL(c)),d=document.createElement("section");d.className="card dgl-kc dgl-me";
  d.innerHTML=`<div class="dgl-kh"><h3 class="dgl-kt">${dglIc("bh")}<span>黑洞裡的你</span></h3><span class="dgl-kbd blue"><span>修為</span> Lv ${S.L}</span></div>
    <div class="dgl-kst"><span><small>${dglIc("hp")}<span>元氣</span></small><b>${S.hp}</b></span><span><small>${dglIc("sp")}<span>靈力上限</span></small><b>${S.sp}</b></span><span><small>${dglIc("rg")}<span>每回合回靈</span></small><b>${S.spRegen}</b></span><span><small>${dglIc("atk")}<span>攻擊力</span></small><b>${BHTD.atkPt(S.atk)}</b></span><span><small>${dglIc("def")}<span>防禦力</span></small><b>${BHTD.defPt(S.def)}</b></span></div>
    <p class="dgl-ks"><span>修為越高，五項越強；身上的星芒進黑洞會變成開局靈力（1 點換 10 靈）。</span></p>`;return d}catch(e){return null}}
/* ---------- 計時與事件 ---------- */
function dglHello(z,busy){if(z!=="land"||busy||document.getElementById("dglOut")||document.querySelector(".walkc"))return;const o=dglSt();if(o.f1)return;
  const fs=DGL.fromZ==="ship";if(!fs&&DGL.s.r>DGL_HELLO)return;o.f1=Date.now();store.set("dgl",o);
  const t=fs?"下了船，每走一會兒就要花一點定軌力；下完一盤棋、解完一題都能補回來。":"在人間走動，每過一會兒就要花一點定軌力；下完一盤棋、解完一題都能補回來。";
  stillHere(1800,()=>{const said=dglSay(t,false);if(!dglFlashChip()||!said)dglFloat("hello",said?"":t)},()=>!dglBusy(location.hash)&&!document.getElementById("dglOut")&&!document.querySelector(".walkc"))}   /* W120：1.8 秒後還在原頁、沒進對局解題、沒退場才打招呼 */
function dglFx(z,busy){const tired=dglTired(DGL.s.r);let v=document.getElementById("dglVig");const on=tired&&z!=="free"&&!busy&&!document.getElementById("dglOut");
  if(on&&!v){dglCss();v=document.createElement("div");v.id="dglVig";v.setAttribute("aria-hidden","true");document.body.append(v);requestAnimationFrame(()=>v.classList.add("on"))}else if(v)v.classList.toggle("on",on);
  const f=document.getElementById("dglFloat");if(DGL.s.out&&z==="ship"){if(!f||f.dataset.kind!=="rest")dglFloat("rest",`在星槎上歇息，回到 ${dglU(DGL_BACK,dglMx())} 就能再下船。`)}else if(f&&f.dataset.kind==="rest")dglFloatOff("rest")}
function dglTick(){if(!DGL_ON)return;const now=Date.now(),dt=Math.max(0,Math.min(now-DGL.last,15e3));DGL.last=now;if(document.hidden)return;
  const h=location.hash;try{dglLocSync(h)}catch(e){}
  if(dglUserOff()){dglPaint();dglFx("free",true);return}   /* 設定關了體力：不扣、不退場、不暈墨、不打招呼 */
  const z=dglZoneNow(h),busy=dglBusy(h);if(z!==DGL.lastZ){DGL.fromZ=DGL.lastZ;DGL.lastZ=z}
  if(busy&&!DGL.wasBusy)DGL.bt=now;DGL.wasBusy=busy;   /* 11/16 ⑦：這一盤從什麼時候開始算（進對局頁的那一刻） */
  if(busy&&!DGL.done&&document.querySelector(".modal.res,#cjNext"))DGL.done=now;
  const ev=dglStep(DGL.s,dt,z);if(ev.includes("low"))dglTiredSay(true);
  if(ev.includes("back"))toast(`✨ 定軌力回到 ${dglU(DGL_BACK,dglMx())}，可以下船了。`);
  const w=dglWhen(DGL.s,{zone:z,busy,done:DGL.done,now,block:!!document.querySelector("#dglOut,#fmOv,#fmOv2,.travel,#preov")||document.body.classList.contains("xqt-on")});
  if(w==="exit")dglExitNow(false);else if(w==="rest"){dglExit(DGL.s);toast(`🌫 定軌力耗盡：在星槎上歇到 ${dglU(DGL_BACK,dglMx())} 才能再下船`)}
  if(now-DGL.kt>15e3||ev.length||w)dglKeep();   /* 11/16 ③：每 15 秒、或狀態有變（剛掉到門檻、歸零、退場、回到能下船）就記一次 */
  dglHello(z,busy);dglPaint();dglFx(z,busy)}
/* 黑洞過關：大量回復（序局、練習賽不算） */
function dglBhEnd(st){if(!dglLive()||!st||!st.result||!st.result.w||st.result.w!==st.human)return;const j=String(st.journey||"");if(!/^bh:/.test(j)||/^bh:gs/.test(j)||j==="bh:tl"||(typeof BHX_ID!=="undefined"&&j===BHX_ID))return;
  const o=dglSt(),day=dglDay(),cap=dglBhCap(o,day,DGL_BH),g=dglGain(DGL.s,cap);if(g.n>0){dglBhUse(o,day,g.n);store.set("dgl",o)}dglPaint();   /* 11/14：一天最多靠黑洞回 DGL_BH_DAY（實際回了多少才算，滿格沒回到的不算） */
  stillHere(1600,()=>toast(g.n>0?`✨ 星淵靈氣入體，旅人精神百倍！定軌力 +${dglU(g.n,dglMx())}`:cap<=0?`✨ 今天靠黑洞回的定軌力已經滿 ${dglU(DGL_BH_DAY,dglMx())} 了`:"✨ 星淵靈氣入體，旅人精神百倍！"))}   /* W120：定軌力當下就回；吐司只在還在原頁時出 */
/* 下完一盤（xq-result）：回 DGL_GAME。11/15 開發者選：星門圍城試玩（07bhg 對局中 body.gsv-on）不回 */
function dglOnResult(){const now=Date.now(),long=!DGL.bt||now-DGL.bt>=DGL_GAME_MIN;DGL.done=now;DGL.bt=now;if(long&&dglLive()&&!document.body.classList.contains("gsv-on"))dglGain(DGL.s,DGL_GAME);dglPaint()}
/* 解完一題（addXP 的解題類，同一題常有兩筆，3 秒內只算一次）、主線過關 */
function dglXP(why,gave){if(!DGL_ON||!DGL_HUMAN)return;gave=gave!==false;const w=String(why||""),now=Date.now();if(DGL_MAIN_WHY.includes(w)){if(gave){dglXmGive(DGL_XM_GET);dglPaint()}return}if(!DGL_PUZ_WHY.includes(w))return;   /* 11/16 ⑦：gave＝這一筆修為有沒有真的給（同一題拿過就沒有）；沒給＝重解舊題，不回體力、不給靈力 */
  DGL.done=now;if(!gave||now-DGL.pz<3000)return;DGL.pz=now;if(dglLive())dglGain(DGL.s,DGL_PUZ);dglXmGive(DGL_XM_GET);dglPaint()}   /* 關了體力：星芒照給 */

/* ---------- 設定頁開關（05-settings.js 角色分頁呼叫 dglSetRow；切換由下面的 change 監聽） ---------- */
function dglSetRow(){if(!DGL_ON||!DGL_HUMAN)return"";return`<div class="sec-t">平日體力</div><label class="card row" style="justify-content:space-between;gap:10px;margin-bottom:6px"><span><b>平日體力（定軌力／星芒）</b><br><span class="muted" style="font-size:12.5px">關掉後定軌力不扣、不會化墨退場回星槎，也沒有「心定則棋穩」修為加成，頂欄和各地點的兩條收起來；星芒照常累積，進黑洞、點亮星圖照樣能用</span></span><input type="checkbox" class="sw" id="dglSw" aria-label="平日體力（定軌力／星芒）"${dglUserOff()?"":" checked"}></label>`}
/* 切換：兩個方向都回滿、清掉退場記號（關掉前在船上歇息的人不會卡住；再打開＝像重開 App 一樣滿格） */
function dglSetOff(off){off=!!off;if(off){try{dglKeep()}catch(e){}}store.set("dglOff",off);DGL.done=0;DGL.fx=0;   /* 11/16 ⑦：關掉前先把體力記下來；再打開＝跟重開 App 一樣接著那個值、關著的時間照星槎上的速度回，不再一開就回滿（原本切一下開關就滿了） */
  if(off)DGL.s=dglNew();else{try{DGL.s=dglWake(store.get("dgl",null),Date.now())}catch(e){DGL.s=dglNew()}try{dglKeep()}catch(e){}}
  if(typeof document!=="undefined"){try{const v=document.getElementById("dglVig");if(v)v.remove()}catch(e){}try{dglFloatOff()}catch(e){}try{dglPaint();dglLocSync()}catch(e){}}return off}

/* ---------- 二十八宿星圖（觀星臺「二十八宿」入口，07gxt-guanxing.js GXT_ACT 呼叫） ---------- */
/* ---------- 11/16 開發者「找gemini繪製環景圖 關於這一頁，按照天文專家的判斷」（選單：1 張夜空環景、接進 App）：二十八宿星圖頁改成滿版圖 ----------
   底圖 data/guanxing/xiu_sky（768×1376，Gemini 依 story/gemini_app/回覆_170 的天文考究畫的：蓋天式圓形星圖的底子、四象淡墨剪影、前景渾儀欄杆，不畫星點）。
   二十八宿的星點、連線由程式畫在外圈（SVG，跟底圖同一個座標）：圖像模型畫不準星官、按鈕也對不齊，所以星點不放在圖裡。
   方位照仰觀星圖：東方蒼龍在左、北方玄武在下、西方白虎在右、南方朱雀在上，從左上的角宿起逆時針排（四象跟底圖的剪影同邊）；
   每宿佔的角度照宿度（古度，DGL_XIU_DU）比例，太窄的（觜、鬼…）放寬到 DGL_XS_MIN 度才點得到。星官形狀照《步天歌》的星數畫成示意（DGL_XS_T），不是精確星圖。
   點一宿＝選它、下面說明列寫它的說明；還沒點亮又有勝場時多一顆「點亮」。「☰ 清單」打開原本四排按鈕的那一頁（dglXiuList，讀屏與想用清單的人）。 */
const DGL_XS_IMG="data/guanxing/xiu_sky.webp?v=1116",DGL_XS_C=[384,553],DGL_XS_R=242,DGL_XS_MIN=7;
const DGL_XIU_DU=[12,9,15,5,5,18,11,26,8,12,10,17,16,9,16,12,14,11,16,2,9,33,4,15,7,18,18,17];   /* 二十八宿古度（角～軫，共 365¼ 度左右；常見數值，各家略有出入） */
/* 星官示意：[點（x,y 在 -1～1）, 連線："p" 依序連、"c" 連成一圈、"n" 不連、或 [[i,j],…]] */
const DGL_XS_T={角:[[[-.5,.4],[.5,-.4]],"p"],亢:[[[-.7,.3],[-.25,-.2],[.25,-.25],[.7,.2]],"p"],氐:[[[-.5,-.45],[.5,-.3],[.35,.45],[-.45,.35]],"c"],房:[[[-.15,-.75],[-.05,-.25],[.05,.25],[.15,.75]],"p"],
  心:[[[-.6,.25],[0,-.15],[.6,.25]],"p"],尾:[[[-.7,-.75],[-.55,-.35],[-.35,0],[-.05,.25],[.3,.45],[.6,.55],[.75,.25],[.65,-.05],[.4,-.15]],"p"],箕:[[[-.6,-.45],[.45,-.55],[.6,.45],[-.45,.35]],"p"],
  斗:[[[-.75,-.25],[-.35,-.35],[0,-.1],[.1,.35],[.5,.45],[.75,.15]],"p"],牛:[[[0,-.7],[0,-.1],[-.5,.35],[.5,.35],[-.7,.75],[.7,.75]],[[0,1],[1,2],[1,3],[2,4],[3,5]]],女:[[[-.6,0],[0,-.45],[.6,0],[0,.45]],"c"],
  虛:[[[0,-.55],[0,.55]],"p"],危:[[[-.6,.45],[0,-.55],[.6,.45]],"p"],室:[[[-.1,-.6],[.1,.6]],"p"],壁:[[[.1,-.6],[-.1,.6]],"p"],
  奎:[Array.from({length:16},(_,i)=>[.85*Math.cos(i*Math.PI/8),.5*Math.sin(i*Math.PI/8)]),"c"],婁:[[[-.55,.4],[0,-.45],[.55,.4]],"c"],胃:[[[-.4,.35],[.1,-.35],[.45,.3]],"c"],
  昴:[[[-.3,-.3],[.15,-.4],[.4,-.05],[.05,.05],[-.35,.25],[.2,.4],[-.05,-.6]],"n"],畢:[[[-.7,-.6],[-.35,-.15],[0,.2],[.35,-.15],[.7,-.6],[0,.55],[.15,.8],[-.2,.85]],[[0,1],[1,2],[2,3],[3,4],[2,5],[5,6],[5,7]]],
  觜:[[[-.3,.25],[0,-.3],[.3,.25]],"c"],參:[[[-.55,-.7],[.55,-.7],[-.25,0],[0,0],[.25,0],[-.55,.7],[.55,.7]],[[0,2],[1,4],[2,3],[3,4],[2,5],[4,6]]],
  井:[[[-.35,-.75],[-.35,-.25],[-.35,.25],[-.35,.75],[.35,-.75],[.35,-.25],[.35,.25],[.35,.75]],[[0,1],[1,2],[2,3],[4,5],[5,6],[6,7]]],鬼:[[[-.45,-.45],[.45,-.45],[.45,.45],[-.45,.45]],"c"],
  柳:[[[-.75,-.6],[-.45,-.35],[-.2,-.05],[0,.25],[.25,.45],[.5,.55],[.7,.4],[.8,.15]],"p"],星:[[[-.7,0],[-.35,-.3],[0,0],[.35,-.3],[.7,0],[.35,.35],[0,.55]],"p"],
  張:[[[-.75,.35],[-.45,-.15],[-.1,-.4],[.25,-.4],[.55,-.15],[.75,.3]],"p"],翼:[Array.from({length:22},(_,i)=>{const k=i%11,r=i<11?-1:1;return[(k-5)*.15,r*(.25+.04*Math.abs(k-5))]}),"n"],
  軫:[[[-.55,-.45],[.5,-.4],[.6,.45],[-.5,.4]],"c"]};
/* 純計算：每一宿在圖上的中心角（度，數學方向：0＝右、90＝上）與寬度；東方七宿的中心對準左邊 180 度，逆時針排 */
function dglXsAngles(){const d=DGL_XIU_DU.map(x=>Math.max(x,DGL_XS_MIN)),tot=d.reduce((a,b)=>a+b,0),w=d.map(x=>x*360/tot),east=w.slice(0,7).reduce((a,b)=>a+b,0);
  let t=180-east/2;return w.map(x=>{const c=t+x/2;t+=x;return{a:((c%360)+360)%360,w:x}})}
const dglXsPos=(a,r)=>[DGL_XS_C[0]+r*Math.cos(a*Math.PI/180),DGL_XS_C[1]-r*Math.sin(a*Math.PI/180)];
/* 一宿的 SVG：點、連線、點選範圍（扇形），lit＝已點亮（金色發光） */
function dglXsLodge(i,A,lit,sel){const s=DGL_XIU[i],T=DGL_XS_T[s[0]]||[[[0,0]],"n"],[cx,cy]=dglXsPos(A.a,DGL_XS_R),half=Math.max(10,Math.min(22,A.w*Math.PI/180*DGL_XS_R*.42)),
    P=T[0].map(([x,y])=>[cx+x*half,cy+y*half]),L=T[1]==="p"?P.slice(1).map((_,k)=>[k,k+1]):T[1]==="c"?P.map((_,k)=>[k,(k+1)%P.length]):T[1]==="n"?[]:T[1],
    a0=(A.a-A.w/2)*Math.PI/180,a1=(A.a+A.w/2)*Math.PI/180,r0=DGL_XS_R-46,r1=DGL_XS_R+46,pt=(a,r)=>`${(DGL_XS_C[0]+r*Math.cos(a)).toFixed(1)},${(DGL_XS_C[1]-r*Math.sin(a)).toFixed(1)}`;
  const hit=`M${pt(a0,r0)}L${pt(a0,r1)}A${r1},${r1} 0 0 0 ${pt(a1,r1)}L${pt(a1,r0)}A${r0},${r0} 0 0 1 ${pt(a0,r0)}Z`;
  return`<g class="dgl-xs-g${lit?" on":""}${sel?" sel":""}" data-i="${i}" role="button" tabindex="0" aria-label="${esc(s[0])}宿，${lit?"已點亮":"還沒點亮"}"><path class="h" d="${hit}"/>`+
    L.map(([a,b])=>`<line x1="${P[a][0].toFixed(1)}" y1="${P[a][1].toFixed(1)}" x2="${P[b][0].toFixed(1)}" y2="${P[b][1].toFixed(1)}"/>`).join("")+
    P.map(([x,y])=>`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${T[0].length>12?2.6:3.6}"/>`).join("")+`</g>`}
function dglXsCss(){if(document.getElementById("dglXsCss"))return;const s=document.createElement("style");s.id="dglXsCss";s.textContent=`
#dglXs{position:fixed;inset:0;z-index:9100;background:#0c1020;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden}
#dglXs .xs-top{position:absolute;left:0;right:0;top:0;z-index:3;display:flex;align-items:center;gap:8px;padding:max(10px,env(safe-area-inset-top,0px)) 12px 8px;color:#f4ecd8;background:linear-gradient(rgba(8,10,22,.85),rgba(8,10,22,0))}
#dglXs .xs-top b{flex:1;font:900 18px var(--serif,serif);letter-spacing:.08em}
#dglXs .xs-top button{min-width:44px;min-height:44px;border-radius:99px;border:1px solid rgba(244,236,216,.45);background:rgba(0,0,0,.35);color:#f4ecd8;font:700 14px var(--serif,serif);padding:0 12px}
#dglXs .xs-art{position:relative;width:min(100%,calc(100dvh*768/1376));aspect-ratio:768/1376}
#dglXs .xs-art img,#dglXs .xs-art svg{position:absolute;inset:0;width:100%;height:100%}
#dglXs svg .dgl-xs-g{cursor:pointer;outline:none}#dglXs svg .h{fill:transparent}
#dglXs svg line{stroke:#3a3f52;stroke-width:1.6;stroke-linecap:round}#dglXs svg circle{fill:#2a2f44}
#dglXs svg .on line{stroke:#c98a12;stroke-width:2.2}#dglXs svg .on circle{fill:#ffcf5a;filter:drop-shadow(0 0 4px rgba(255,190,60,.95))}
#dglXs svg .sel .h{fill:rgba(255,214,120,.18);stroke:rgba(201,138,18,.7);stroke-width:1.5}
#dglXs svg .dgl-xs-g:focus-visible .h{stroke:#E8C77A;stroke-width:3}
#dglXs .xs-pan{position:absolute;left:10px;right:10px;bottom:max(12px,env(safe-area-inset-bottom,0px));z-index:3;padding:10px 12px;border-radius:14px;background:rgba(251,248,241,.94);color:#2b241c;box-shadow:0 4px 18px rgba(0,0,0,.35);font-size:14px;line-height:1.55}
#dglXs .xs-pan .hd{display:flex;align-items:baseline;justify-content:space-between;gap:8px}#dglXs .xs-pan .hd b{font-size:16px}#dglXs .xs-pan .hd span{color:#6b6257;font-size:13px}
#dglXs .xs-pan .q{display:flex;gap:6px;margin:6px 0 4px;flex-wrap:wrap}#dglXs .xs-pan .q span{flex:1 1 0;min-width:64px;text-align:center;font-size:12.5px;padding:2px 4px;border-radius:8px;background:rgba(128,110,80,.12)}#dglXs .xs-pan .q span.full{background:#f3e3b5;color:#5a4300}
#dglXs .xs-pan p{margin:4px 0 0}#dglXs .xs-pan .go{width:100%;margin-top:8px}
@media (prefers-reduced-motion:reduce){#dglXs svg .on circle{filter:none}}`;document.head.append(s)}
/* 二十八宿星圖（觀星臺「二十八宿」07gxt gxtSky 開這裡） */
/* 11/16 開發者選單：四象七宿點齊的黑洞（星門圍城）永久效果——東方蒼龍每回合靈力 +1、北方玄武開局靈力 +10、西方白虎過關星塵 +1、南方朱雀帥的體力 +10（07sg2 開局、roundEnd、結算讀這裡） */
const DGL_XIANG_FX=[{rg:1},{sp0:10},{dust:1},{kHp:10}],DGL_XIANG_FXT=["每回合靈力 +1","開局靈力 +10","過關星塵 +1","帥的體力 +10"];
function dglXiangFx(){const F={rg:0,sp0:0,dust:0,kHp:0};try{const tw=Math.round(+dglSt().tw)||0;DGL_XIANG_FX.forEach((x,k)=>{if(tw&(1<<k))for(const n in x)F[n]+=x[n]})}catch(e){}return F}
/* 二十八宿修為：照現在點亮的狀態把該給的都給（addXP 的 key 只給一次）。每宿 dglxs:i；點齊、全亮用 dglxt3:（舊版用 dglxt: 給過 10／30 的，只補差額） */
function dglXiuSync(){try{if(typeof addXP!=="function")return;const o=dglSt(),t=dglXiuMask(o.t),tw=Math.round(+o.tw)||0,K=store.get("xpKeys",{})||{};
  for(let i=0;i<DGL_XIU.length;i++)if(dglXiuHas(t,i))addXP(DGL_XIU_STAR_XP,"星圖","dglxs:"+i);
  for(let k=0;k<4;k++)if(tw&(1<<k)&&!K["dglxt3:"+k])addXP(K["dglxt:"+k]?DGL_XIANG_XP-10:DGL_XIANG_XP,"星圖","dglxt3:"+k);
  if(tw&16&&!K["dglxt3:all"])addXP(K["dglxt:all"]?DGL_XIU_ALL_XP-30:DGL_XIU_ALL_XP,"星圖","dglxt3:all")}catch(e){}}
function dglXiuSheet(){if(typeof document==="undefined")return;dglXiuSync();dglCss();dglXsCss();const old=document.getElementById("dglXs");if(old)old.remove();
  const A=dglXsAngles(),o=document.createElement("div");o.id="dglXs";o.setAttribute("role","dialog");o.setAttribute("aria-modal","true");o.setAttribute("aria-label","二十八宿星圖");let sel=-1;
  const draw=()=>{const S=dglSt(),t=dglXiuMask(S.t),n=dglXiuN(t),H=DGL_HUMAN;let G=null;try{G=store.get("gsv",null)}catch(e){}const lf=H?Math.floor(dglXm()/DGL_XIU_COST):dglXiuLeft(S,G),ttl=(Math.round(+S.tw)||0)&16;
    const on=sel>=0&&dglXiuHas(t,sel),info=sel<0?(lf?"點一宿看說明，再按「點亮」。":"打贏星門圍城的一關，就能再點亮一宿。"):on?dglXiuLine(sel):`${DGL_XIU[sel][0]}宿：${DGL_XIANG[DGL_XIU[sel][1]][0]}的一宿。${lf?"可以點亮。":"打贏星門圍城的一關，就能點亮它。"}`;
    o.innerHTML=`<div class="xs-top"><b>🌌 二十八宿星圖</b><button type="button" data-x="list" aria-label="用清單看二十八宿">☰ 清單</button><button type="button" data-x="close" aria-label="關閉">✕</button></div>
      <div class="xs-art"><img src="${DGL_XS_IMG}" alt="以北極為中心的圓形星圖，東方蒼龍在左、南方朱雀在上、西方白虎在右、北方玄武在下，下方是觀星臺的渾儀與欄杆"><svg viewBox="0 0 768 1376" aria-label="二十八宿">${A.map((a,i)=>dglXsLodge(i,a,dglXiuHas(t,i),i===sel)).join("")}</svg></div>
      <div class="xs-pan"><div class="hd"><b>已點亮 ${n}／${DGL_XIU.length}${ttl?`・🏅 ${DGL_XIU_TITLE}`:""}</b><span>可以點亮 ${lf} 宿</span></div>
        <div class="q">${DGL_XIANG.map((X,k)=>{const m=DGL_XIU.filter((s,i)=>s[1]===k&&dglXiuHas(t,i)).length;return`<span class="${m===7?"full":""}">${esc(X[1])} ${m}／7</span>`}).join("")}</div>
        <p aria-live="polite">${esc(info)}</p>${sel>=0&&!on&&lf>0?`<button type="button" class="btn go" data-x="lit">✦ 點亮${esc(DGL_XIU[sel][0])}宿</button>`:""}</div>`};
  o.addEventListener("click",e=>{const x=e.target.closest("[data-x]"),g=e.target.closest(".dgl-xs-g");try{vibrate(5)}catch(z){}
    if(x){const k=x.dataset.x;if(k==="close"){o.remove();return}if(k==="list"){o.remove();dglXiuList();return}if(k==="lit"&&sel>=0){dglXiuBuy(sel,i=>{sel=i;draw()});return}}
    if(g){sel=+g.dataset.i;draw()}});
  o.addEventListener("keydown",e=>{if(e.key==="Escape"){o.remove();return}const g=e.target.closest&&e.target.closest(".dgl-xs-g");if(g&&(e.key==="Enter"||e.key===" ")){e.preventDefault();sel=+g.dataset.i;draw();const b=o.querySelector('[data-x="lit"]');if(b)b.focus()}});
  draw();document.body.append(o);try{o.querySelector('[data-x="close"]').focus({preventScroll:true})}catch(e){}}
/* 原本四排按鈕的那一頁：11/16 起是滿版星圖頁的「☰ 清單」（讀屏、想用清單的人） */
function dglXiuList(){dglCss();sheet("🌌 二十八宿星圖",b=>{
  const draw=sel=>{const o=dglSt(),t=dglXiuMask(o.t),x=dglXm(),n=dglXiuN(t),ttl=(Math.round(+o.tw)||0)&16,H=DGL_HUMAN;let G=null;try{G=store.get("gsv",null)}catch(e){}const lf=dglXiuLeft(o,G);
    const info=sel>=0&&dglXiuHas(t,sel)?esc(dglXiuLine(sel)):H?"點一顆星：已點亮的看說明，還沒點亮的花星芒點亮。":"點一顆星：已點亮的看說明；打贏星門圍城的一關，就能再點亮一宿。";
    b.innerHTML=`<div class="dgl-cd dgl-xt">${H?`<div class="dgl-cd-h"><b>星芒（藍）</b><span data-dgl="x">${x}／${DGL_XM_MAX}</span></div><div class="dgl-cd-bar dgl-b"><b></b></div>`:`<div class="dgl-cd-h"><b>可以點亮</b><span>${lf} <span>宿</span></span></div>`}
      <p class="muted" style="font-size:13px;margin:4px 2px 0;line-height:1.55">${H?`每點亮一宿花 ${DGL_XIU_COST} 點星芒。`:"星門圍城每第一次打贏一關，就能點亮一宿。"}每點亮一宿，修為 +${DGL_XIU_STAR_XP}；一方七宿點齊，修為 +${DGL_XIANG_XP}，星門圍城再多一項永久效果（${DGL_XIANG.map((x,k)=>x[0]+"："+DGL_XIANG_FXT[k]).join("、")}）；二十八宿全亮，修為 +${DGL_XIU_ALL_XP}，得到稱號「${DGL_XIU_TITLE}」。<br>已點亮 ${n}／${DGL_XIU.length}${ttl?`・🏅 ${DGL_XIU_TITLE}`:""}</p>
      <p class="dgl-xt-info" aria-live="polite">${info}</p>
      ${DGL_XIANG.map((X,k)=>{const L=DGL_XIU.map((s,i)=>[s,i]).filter(([s])=>s[1]===k),m=L.filter(([,i])=>dglXiuHas(t,i)).length;
        return`<div class="dgl-xt-g"><div class="dgl-xt-h"><b>${X[0]}</b><span>${m}／7${m===7?" ✓":""}</span></div><div class="dgl-xt-row">${L.map(([s,i])=>{const on=dglXiuHas(t,i);
          return`<button type="button" class="dgl-xt-s${on?" on":""}${sel===i?" sel":""}" data-i="${i}" aria-label="${s[0]}宿${on?"，已點亮":H?`，點亮要 ${DGL_XIU_COST} 點星芒`:lf?"，可以點亮":"，打贏星門圍城的一關就能點亮"}"><b>${s[0]}</b><small>${on?"✦":H?DGL_XIU_COST+" 星芒":lf?"點亮":"・"}</small></button>`}).join("")}</div></div>`}).join("")}
      <p class="muted" style="font-size:12.5px;margin:10px 2px 0">${H?"星芒從解殘局、主線過關得來。":"星門圍城從觀星臺進去；同一關不同難度只算一次。"}</p></div>`;
    dglPaint();b.querySelectorAll(".dgl-xt-s").forEach(e=>e.onclick=()=>{const i=+e.dataset.i;vibrate(5);if(dglXiuHas(dglSt().t,i))draw(i);else dglXiuBuy(i,draw)})};
  draw(-1)})}
function dglXiuBuy(i,draw){const o=dglSt();let G=null;try{G=store.get("gsv",null)}catch(e){}const R=dglXiuLight(o,i,DGL_HUMAN?null:dglXiuLeft(o,G));
  if(!R.ok){if(R.why==="poor")toast(`✧ 星芒不夠：還差 ${R.need} 點（解殘局、主線過關可以得到）`);else if(R.why==="win")toast("✧ 先去打贏星門圍城的一關，就能點亮這一宿");return}
  store.set("dgl",o);try{vibrate([10,40,10])}catch(e){}draw(i);
  dglXiuSync();
  toast(R.all?`🏅 二十八宿全部點亮！得到稱號「${DGL_XIU_TITLE}」`:R.xiang>=0?`✨ ${DGL_XIANG[R.xiang][0]}七宿點齊了！`:`✦ 點亮${DGL_XIU[i][0]}宿`)}

if(typeof setTop==="function"){const f0=setTop;setTop=function(){const r=f0.apply(this,arguments);try{dglLocSync(null,1)}catch(e){}return r}}   /* 換頁就放／收地點頁的兩條 */
if(typeof meChip==="function"){const f0=meChip;meChip=function(){const r=f0.apply(this,arguments);try{dglChip()}catch(e){}return r}}
if(typeof bhGameEnd==="function"){const f0=bhGameEnd;bhGameEnd=function(st){const r=f0.apply(this,arguments);try{dglBhEnd(st)}catch(e){}return r}}
if(typeof addXP==="function"){const f0=addXP;addXP=function(n,why){const a=Array.prototype.slice.call(arguments);try{if(dglLive()&&+n>0){const B=dglXpBonus(n,DGL.s.r,DGL.fx,dglMx());DGL.fx=B.fx;a[0]=B.n}}catch(e){}let x0=0,gave=true;try{x0=+store.get("xp",0)||0}catch(e){}const r=f0.apply(this,a);try{gave=(+store.get("xp",0)||0)>x0}catch(e){}try{dglXP(why,gave)}catch(e){}return r}}   /* 11/16 ⑦：addXP 自己會擋同一題重複拿；看累計修為有沒有變多，才知道這一筆有沒有真的給 */
if(DGL_ON&&typeof window!=="undefined"){
  addEventListener("xq-result",dglOnResult);   /* 11/16 ⑦：進對局頁（或上一盤結束）不到 DGL_GAME_MIN 就結束的那一盤不回體力（一開局就認輸）；DGL.bt 由 dglTick 在進對局頁時記 */   /* 11/15 開發者選：星門圍城試玩（07bhg 對局中 body.gsv-on）不回定軌力，過關也不回（dglBhEnd 排除 bh:gs） */
  document.addEventListener("change",e=>{const t=e.target;if(!t||t.id!=="dglSw")return;try{vibrate(5)}catch(x){}dglSetOff(!t.checked);
    toast(t.checked?"已打開平日體力：定軌力回滿，在人間會慢慢用掉":"已關閉平日體力：定軌力不扣、不會化墨退場；星芒照常")});
  addEventListener("hashchange",()=>{DGL.done=0;setTimeout(dglTick,700)});
  /* 11/16 ③：切到背景＝記下體力與時間；回來時把離開的那段時間照星槎上的速度補回來（跟重開 App 同一條規則）。在背景時 dglTick 不扣也不回 */
  document.addEventListener("visibilitychange",()=>{const now=Date.now();if(document.hidden){DGL.hid=now;dglKeep()}else{if(DGL.hid&&dglLive()){const ev=dglStep(DGL.s,now-DGL.hid,"ship");if(ev.includes("back"))toast(`✨ 定軌力回到 ${dglU(DGL_BACK,dglMx())}，可以下船了。`)}DGL.hid=0;dglKeep();try{dglPaint()}catch(e){}}DGL.last=now});
  addEventListener("pagehide",()=>{dglKeep()});
  (typeof bgpEvery==="function"?bgpEvery:setInterval)(dglTick,2000)}
