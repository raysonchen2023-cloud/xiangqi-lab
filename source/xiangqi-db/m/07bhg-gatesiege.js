/* ---------- 黑洞・星門圍城 gate-siege-v1（開發者 11/15：ChatGPT 提案《黑洞塔防重設計_星門圍城》第十二節 A＋《72關、修為招式與AI融合》第 9 節第 1、3、6 關切片、第 11 節 35 招映射）----------
   候選試玩：跟舊版 BHTD v3（07bht-td.js）並存，不覆蓋舊戰局；journey "bh:gs1"～"bh:gs12"（11/15 補第 2、4、5 關、第二章第 7～12 關），td.mode＝"gate-siege-v1"、td.mv＝模式版本。前綴 GSV／gsv（全域先 grep 過沒撞名）。
   分三塊：
   ① GSV＝純規則（不碰畫面；node 測試 xiangqi-lab/tools/test-gate-siege.js 用 vm 直接載這支檔；腳本對照 xiangqi-lab/tools/gate-siege-sim.js 也用同一份）：
      雙方同式傷害 dmg、數值盾池、靈力預算（每回合正向收入上限 10）、回復總量 40%、冷卻、每回合至多一招、紅 8 子＋後備部署、敵 16 子波次預算、預告、合法生成、
      入侵卒、護陣卒、截援、星核同批次結算（雙方同時歸零判和）、八回合無進展判和、七星 35 招（修為 1／6／12／17／23 解鎖、最多帶 4 招）、星樞候選評估 pick。
   ② 畫面（gsv*）：選關卡片 gsvSelect、對局 HUD（#gsvEn、#gsvMe、#gsvOv）、結果視窗；預設平面棋盤，11/15 起可以切 3D 星盤（視角 gsvView、記號的 3D 對位，說明在檔尾 gsvFlat 那一段）。
   ③ 接線：包一層 window.XQ_TD（local.js 只認這個），td.mode 是星門圍城就交給 GSV，其他照舊交給 BHTD。
   入口：黑洞關卡卡片（bhtdSelect）的「🌠 星門圍城」；本機主控台 gsvOpen()。
   存檔鍵 gsv＝{mv:"gate-siege-v1",c:{關:{w,l,d,best,st:[三顆星]}},h:{關:困難版的紀錄，格式同 c},sk:{角色:[招]},last,lastH}，跟舊版三星（bhtd、bhtdDust）分開。舊存檔沒有 h、st：有勝場算 1 星。 */
const GSV=(()=>{
  const MODE="gate-siege-v1",MV=1;
  const up=p=>String(p||"").toUpperCase(),sd=p=>p?(p===p.toUpperCase()?"r":"b"):null,RW=s=>s/9|0,CL=s=>s%9,LSQ=(lu,xi)=>(10-xi)*9+(lu-1);
  const PCN={K:"帥",A:"仕",B:"相",N:"傌",R:"俥",C:"炮",P:"兵"},PBN={K:"將",A:"士",B:"象",N:"馬",R:"車",C:"砲",P:"卒"};
  const STD={k:1,a:2,b:2,n:2,r:2,c:2,p:5};
  /* ===== 數值（提案一第五節；全部是待驗證起始值）===== */
  const SP0=35,RG=4,CAP_SP=6,INC_CAP=10;                 /* 我方：開場靈力、每完整回合回復、合法擒子回靈、每回合正向收入上限 */
  const CAPB={P:4,A:6,B:6,N:10,C:10,R:14,K:0};           /* 擒子事件基礎值（看被吃的棋種） */
  const CHK=18,CHK_GAP=2,FOCUS=8,INV=12,INV_PAL=20,INV_MAX=2,GUARD=20;
  const SH_CAP=30,SH_LIFE=2,DEP_COST=20,DEP_MAX=2,ICPT_DRAIN=10,ICPT_GAIN=6,NOPROG=8,HEAL_PCT=.4,ONE_SK=1;
  const DRAIN=8;                                           /* 奪靈馬（提案一 6.3 第 4 關）：合法擒子後再扣你靈力 8，每回合最多一次 */
  const GROW={hp:80,atk:35,def:18},TAU=42;                 /* 等級加成上限（Lv 100）：HP +80%、ATK +35、DEF +18；Lv 20 約 HP +32%、ATK +14、DEF +7（11/15 七星改版：開發者選「放大到跟塔防一樣明顯」，原本只有 +5%／+5／+5；靈力收入不隨等級放大） */
  const G=L=>{L=Math.max(1,Math.min(100,+L||1));return(1-Math.exp(-(L-1)/TAU))/(1-Math.exp(-99/TAU))};
  /* 七星（提案一 5.4）：HP／ATK／DEF／靈力容量；本命子 pc */
  const CH={x_swordboy:{n:"齊轍",nk:"阿轍",pc:"R",hp:105,atk:110,def:20,sp:90},x_spiritgirl:{n:"田飛燕",nk:"燕子",pc:"B",hp:100,atk:95,def:45,sp:100},
    x_martialgirl:{n:"雷借花",nk:"花兒",pc:"C",hp:95,atk:115,def:20,sp:100},x_miaogirl:{n:"駱躍梅",nk:"小梅",pc:"N",hp:95,atk:105,def:25,sp:100},
    x_shuai:{n:"沈方庭",nk:"方庭",pc:"K",hp:90,atk:100,def:30,sp:110},x_shi:{n:"鐵連城",nk:"城子",pc:"A",hp:115,atk:90,def:50,sp:90},x_bing:{n:"步越溪",nk:"溪兒",pc:"P",hp:100,atk:105,def:20,sp:100}};
  function stats(ck,L){const c=CH[ck]||CH.x_swordboy,g=G(L);
    return{ck:CH[ck]?ck:"x_swordboy",n:c.n,nk:c.nk,pc:c.pc,L:Math.max(1,Math.min(100,Math.round(+L||1))),hp:Math.round(c.hp*(1+GROW.hp/100*g)),atk:c.atk+Math.round(GROW.atk*g),def:c.def+Math.round(GROW.def*g),sp:c.sp,sp0:SP0,rg:RG}}
  /* 11/15 七星改版（開發者選單，story/七星各自等級_戰鬥規則草案_1115.md）：每種棋子各用自己角色的等級。
     cfg.sq＝{R:{ck,L},N:…,B,A,K,C,P}（開局設定沒帶就問 07pty-party.js 的 ptySquad()，所以 gsvStart／whlNew／local.js 都不用改；node 測試裡沒有 ptySquad＝舊規則）（還沒加入的是木棋靈：同一位角色的數值、等級＝修為一半）；有 sq 時
     我方擒子／將軍用「動的那顆」的 ATK、我方被擒用「被吃那顆」的 DEF、被將軍／入侵／星樞招用帥的 DEF、元氣上限＝七種的平均；
     11/16 取消隊長：靈力上限、我方攻防也是七種平均，招式傷害看放招那位的攻擊。沒有 sq＝舊規則（整隊一組） */
  const PCS=["R","N","B","A","K","C","P"];
  function squad(S){if(!S||typeof S!=="object")return null;const o={};for(const pc of PCS){const x=S[pc];if(!x||!CH[x.ck])return null;const t=stats(x.ck,x.L);o[pc]={ck:t.ck,L:t.L,atk:t.atk,def:t.def,hp:t.hp,sp:t.sp,wood:x.wood?1:0}}return o}
  const atkR=(td,pc)=>td.sq&&td.sq[pc]?td.sq[pc].atk:td.me.atk,defR=(td,pc)=>td.sq&&td.sq[pc]?td.sq[pc].def:td.me.def;
  /* 同式傷害（提案一 5.1）：未吸收傷害＝max(1, round(基礎 × 攻方ATK/100 × 100/(100+守方DEF)))；基礎 0 就是 0 */
  function dmg(base,atk,def){base=+base||0;if(base<=0)return 0;return Math.max(1,Math.round(base*(+atk||100)/100*100/(100+Math.max(0,+def||0))))}
  /* 盾池吸收：最少 1 是吸收前的規則，盾可以把 HP 損失吸到 0 */
  function absorb(sh,raw){const a=Math.min(Math.max(0,sh&&sh.v||0),raw);return{abs:a,loss:raw-a}}
  /* ===== 關卡（提案二第一章關名；第 1、3、6 關切片，11/15 補第 2、4、5 關＝提案一第七節前五關表）=====
     座標 [路,線]：路 1～9 由左到右（紅方看過去）、線 1＝紅底線…線 10＝黑底線。red＝紅方開場 8 子、res＝後備 8 子（合計＝標準 16 子）；
     dp＝補給點 {id,sq:[路,線],al:允許棋種}；open＝敵開場 [子,路,線,標記]；waves＝{at:第幾回合結束落下,p:[[子,路,線,標記]…]}（開場＋波次＝剛好 16）。
     標記：inv＝入侵卒（停在我方半場：進來那回合預告，下個回合結束還在才扣）、guard＝護陣卒（每顆在場星樞 DEF+20）、drain＝奪靈馬（擒子再扣你 8 靈）。
     esp0＝星樞開場靈力；esk＝星樞會用的招（esh 星樞護盾：目前沒有關卡用、zjhl 卒將號令：第 6 關、pao 隔山星砲：第 5 關）；ph＝分段（星樞 HP 降到 hp 比例就解鎖 esk 那一招，只解鎖、不加兵、不當下打）；
     depth＝星樞候選搜尋深度（提案一第十一節前五關 2、2、3、3、4；第 6 關 3；第二章都是 3，不超過 4，手機上才不會想太久）。
     第二章（第 7～12 關）另外有：esk 的 cqzr 長驅直入、dll 斷路令；guard 也會掛在車上（護陣車，第 10 關）；arep＝星樞不靠將軍走出重複局面（見 repCnt；第一章不寫在關卡資料裡，由下面的 AREP1 一個開關管）。 */
  const RED=[["K",5,1],["A",4,1],["B",3,1],["N",2,1],["R",1,1],["C",2,3],["P",5,4],["P",7,4]],RES=["A","B","N","R","C","P","P","P"];
  const DP=[{id:"左",sq:[1,4],al:"RNCP"},{id:"右",sq:[9,4],al:"RNCP"},{id:"仕",sq:[6,1],al:"A"},{id:"相",sq:[7,1],al:"B"}];
  const LV={
    1:{n:1,nm:"星淵初探",th:"單線守口",hp:100,atk:90,def:10,esp0:25,esk:[],depth:2,rs:10,
      open:[["k",5,10],["a",4,10],["a",6,10],["b",3,10],["b",7,10],["c",8,8],["p",3,6,"inv"],["p",5,7]],
      waves:[{at:2,p:[["p",1,7,"inv"],["p",9,7],["r",9,10]]},{at:5,p:[["n",2,10],["n",8,10],["r",1,10],["c",2,8],["p",7,7,"inv"]]}],
      say:"一顆入侵卒已經逼近河岸——先搶子，還是先守口？",tip:"入侵卒過河後，下一回合結束還在就扣你星核；吃掉它或擋住它"},
    /* 第 2 關（提案一第七節：110／95／20、開場 9、援軍 2、4、7；擺法我設計）：入侵卒左翼先到（開場 c7＋第 2 回合左門）、右翼後到（第 4 回合右門），俥顧不了兩邊 */
    2:{n:2,nm:"墨河微瀾",th:"分兵與回援",hp:110,atk:95,def:20,esp0:25,esk:[],depth:2,rs:12,
      open:[["k",5,10],["a",4,10],["a",6,10],["b",3,10],["b",7,10],["c",8,8],["r",9,10],["p",3,7,"inv"],["p",5,7]],
      waves:[{at:2,p:[["p",1,7,"inv"],["n",2,10]]},{at:4,p:[["p",9,7,"inv"],["n",8,10]]},{at:7,p:[["r",1,10],["c",2,8],["p",7,7]]}],
      say:"左翼先來、右翼後到——俥只有一隻，兩邊怎麼顧？",tip:"兩翼的入侵卒先後到；可以花 20 靈把後備子部署到另一邊的補給點回援"},
    3:{n:3,nm:"星門乍現",th:"拆陣破甲",hp:120,atk:100,def:25,esp0:25,esk:[],depth:3,rs:12,
      open:[["k",5,10],["a",4,10],["a",6,10],["b",3,10],["b",7,10],["n",8,10],["c",2,8],["p",3,7,"guard"],["p",7,7,"guard"]],
      waves:[{at:2,p:[["p",1,7,"inv"],["p",9,7,"inv"]]},{at:4,p:[["r",1,10],["n",2,10]]},{at:6,p:[["r",9,10],["c",8,8],["p",5,7,"inv"]]}],
      say:"兩顆護陣卒讓星樞的防禦 +40——先拆陣，還是算好代價直接強攻？",tip:"護陣卒每顆讓星樞 DEF+20；吃掉一顆，你之後每一擊都更痛"},
    /* 第 4 關（提案一第七節：135／105／30、開場 10、援軍 2、4、6、奪靈馬；擺法我設計）：每一波都是左右兩扇門同時落（第 2 回合兩顆入侵卒在 c7、g7 一起來），擋一門、回援另一門。
       ATK 105→100：11/15 腳本對照 40 種子，105 時第 4 關跟第 5 關一樣難（回援／拆陣都 3/40 勝），降到 100 才是 4 ≤ 5（6/40）；開場 a7、i7 放普通卒，堵住紅俥第一步直衝底線 */
    4:{n:4,nm:"雙門夾道",th:"雙門取捨",hp:135,atk:100,def:30,esp0:25,esk:[],depth:3,rs:14,
      open:[["k",5,10],["a",4,10],["a",6,10],["b",3,10],["b",7,10],["n",2,10,"drain"],["c",8,8],["p",1,7],["p",5,7],["p",9,7]],
      waves:[{at:2,p:[["p",3,7,"inv"],["p",7,7,"inv"]]},{at:4,p:[["r",1,10],["n",8,10]]},{at:6,p:[["r",9,10],["c",2,8]]}],
      say:"兩扇星門同時開，還有一匹奪靈馬——先封哪一門？",tip:"兩門同時來兵：站上一扇門擋住（截援），另一邊回援；別讓奪靈馬吃到子"},
    /* 第 5 關（提案一第七節：150／110／40、開場 10、援軍 2、4、6；60%／30% 解鎖不同預告招；擺法我設計）：先守兩門入侵（第 2 回合 c7、g7）、再拆兩顆護陣（a7、i7），
       星樞掉到 60% 解鎖隔山星砲、30% 再解鎖卒將號令。護陣放 c7、g7 那一版腳本對照 0/20 勝、星樞剩 74%（比第 6 關難很多），改放 a7、i7 */
    5:{n:5,nm:"星樞列陣",th:"三段攻勢",hp:150,atk:110,def:40,esp0:25,esk:[],depth:4,rs:14,ph:[{hp:.6,esk:"pao"},{hp:.3,esk:"zjhl"}],
      open:[["k",5,10],["a",4,10],["a",6,10],["b",3,10],["b",7,10],["c",2,8],["c",8,8],["p",1,7,"guard"],["p",9,7,"guard"],["p",5,7]],
      waves:[{at:2,p:[["p",3,7,"inv"],["p",7,7,"inv"]]},{at:4,p:[["n",2,10],["n",8,10]]},{at:6,p:[["r",1,10],["r",9,10]]}],
      say:"星樞列陣：先守入侵、再拆護陣，星核掉血後會預告大招。",tip:"「隔山星砲」要砲、砲架、目標都不動才打得到：移走目標、拆掉砲架或多擋一子就取消"},
    6:{n:6,nm:"守關・星樞卒將",th:"章末守關",hp:160,atk:105,def:30,esp0:35,esk:["zjhl"],depth:3,rs:14,boss:1,
      open:[["k",5,10],["a",4,10],["a",6,10],["b",3,10],["b",7,10],["c",8,8],["p",3,7,"inv"],["p",7,7,"inv"],["p",1,7,"guard"],["p",9,7,"guard"]],
      waves:[{at:2,p:[["n",2,10],["n",8,10]]},{at:4,p:[["r",1,10],["p",5,7,"inv"]]},{at:6,p:[["r",9,10],["c",2,8]]}],
      say:"星樞卒將坐鎮：兩顆入侵卒在河邊待命、兩顆護陣卒，還會預告「卒將號令」。",tip:"「卒將號令」要靠號令卒留在你的半場；吃掉號令卒就能取消"},
    /* ===== 第二章「俥路調度」第 7～12 關（11/15；章名、關名照提案二第 3 節；提案沒給數值、擺法、敵方招式，都是我設計的候選值）=====
       這一章的星樞招：cqzr 長驅直入（車不動、直路一路空到你的底線才打：擋一子、吃車、車離開原位就取消）、dll 斷路令（你的俥下回合結束還在敵方半場才打：退回來就取消）。
       數值是 11/15 腳本對照（舊 smart Lv1＋Lv23、40 種子、HP×ATK 網格）挑的：每關兩種修為都不是 0 勝、星樞剩 HP 大致一關比一關多；比第 5、6 關的 ATK 低，是因為這一章車來得早、又多了大招。
       第 7 關：第 3 回合一顆車從右門落在 i 路，落下那一刻 i 路一路空到你的底線（落下那次結算就預告）；你的俥在另一邊，前兩回合先調子（或用補給點）去守口。入侵卒第 5 回合才來，只考一件事 */
    7:{n:7,nm:"直路守口",th:"守住直路",hp:120,atk:95,def:25,esp0:35,esk:["cqzr"],depth:3,rs:14,arep:1,
      open:[["k",5,10],["a",4,10],["a",6,10],["b",3,10],["b",7,10],["c",8,8],["n",2,10],["p",1,7],["p",5,7],["p",7,7]],
      waves:[{at:3,p:[["r",9,10]]},{at:5,p:[["p",3,7,"inv"],["n",8,10]]},{at:7,p:[["r",1,10],["c",2,8],["p",9,7,"inv"]]}],
      say:"星樞的車會落在一條空到你底線的直路上，接著預告「長驅直入」——守住那條路的口。",tip:"「長驅直入」要車不動、直路一路空到你的底線才打得到：在那條路上擋一子（補給點也行）、吃掉那顆車就取消"},
    /* 第 8 關：右門的車（長驅直入）和左門的入侵卒同一回合落下（第 2 回合），第 4 回合右邊再來一顆入侵卒——俥只有一隻，要走橫線換翼，另一邊先用便宜的子或補給點頂住。
       試過把車延到第 3 回合、或用第 7 關的開場：舊腳本 0/40 勝，所以留這個擺法（見實作紀錄） */
    8:{n:8,nm:"橫俥回援",th:"橫線調度",hp:125,atk:100,def:25,esp0:35,esk:["cqzr"],depth:3,rs:14,arep:1,
      open:[["k",5,10],["a",4,10],["a",6,10],["b",3,10],["b",7,10],["c",8,8],["n",2,10],["p",5,7],["p",3,7]],
      waves:[{at:2,p:[["r",9,10],["p",1,7,"inv"]]},{at:4,p:[["p",7,7,"inv"],["n",8,10]]},{at:6,p:[["r",1,10],["c",2,8],["p",9,7,"inv"]]}],
      say:"右邊的車要長驅直入、左邊的入侵卒同一回合到——俥只有一隻，走橫線回援。",tip:"俥停在通暢的橫線上，一步就能換到另一翼；另一邊先用便宜的子、或花 20 靈部署到補給點頂住"},
    /* 第 9 關（反例）：兩顆護陣卒引你的俥深入；星樞開場就夠靈力放「斷路令」。吃完要不要馬上退、還是開盾硬吃第二顆，自己算 */
    9:{n:9,nm:"留一道退路",th:"深入要能回來",hp:130,atk:100,def:25,esp0:40,esk:["dll"],depth:3,rs:14,arep:1,
      open:[["k",5,10],["a",4,10],["a",6,10],["b",3,10],["b",7,10],["c",8,8],["p",1,7,"guard"],["p",9,7,"guard"],["p",5,7]],
      waves:[{at:2,p:[["p",3,7,"inv"],["n",2,10]]},{at:4,p:[["p",7,7,"inv"],["n",8,10]]},{at:6,p:[["r",1,10],["r",9,10],["c",2,8]]}],
      say:"護陣卒在等你的俥深入——星樞會預告「斷路令」，進去之前先留一道退路。",tip:"「斷路令」只打回合結束時還在敵方半場的那顆俥：留一步能退回自己半場的路，退回來就取消"},
    /* 第 10 關：護陣車（在場星樞 DEF+20）站在 a8、有象看著，開局就捉你的俥。兌掉＝拆陣＋解除這條路的長驅，但你少一隻俥（後備俥要花 20 靈、一步棋部署）；不兌就要找子接手守口 */
    10:{n:10,nm:"交換要道",th:"兌子的取捨",hp:200,atk:95,def:35,   /* 11/16 全隊招式後腳本第 3 天 0%→90%，開發者選單「先調」→ hp 150→200、def 25→35（試算約 0～40%）；第 11 關同 */
      esp0:35,esk:["cqzr"],depth:3,rs:14,arep:1,
      open:[["k",5,10],["a",4,10],["a",6,10],["b",3,10],["b",7,10],["r",1,8,"guard"],["c",8,8],["p",3,7],["p",5,7],["p",7,7]],
      waves:[{at:2,p:[["p",9,7,"inv"]]},{at:4,p:[["n",2,10],["n",8,10]]},{at:6,p:[["r",9,10],["c",2,8],["p",1,7,"inv"]]}],
      say:"護陣車佔著要道、正捉著你的俥——兌掉它拆陣，還是留著俥另找子守口？",tip:"護陣車在場星樞 DEF+20：用俥兌掉它就拆陣、那條直路也安全了；兌完可以花 20 靈把後備俥部署回來"},
    /* 第 11 關（組合）：長驅直入＋斷路令＋護陣＋入侵。俥只有一隻：守口、拆陣、退路要同一步顧到 */
    11:{n:11,nm:"一俥兩用",th:"一步兩用",hp:200,atk:100,def:35,   /* 11/16 全隊招式後 10%→50%，同上調（試算約 0～30%） */
      esp0:40,esk:["dll","cqzr"],depth:3,rs:14,arep:1,
      open:[["k",5,10],["a",4,10],["a",6,10],["b",3,10],["b",7,10],["c",8,8],["n",2,10],["p",1,7,"guard"],["p",3,7],["p",5,7]],
      waves:[{at:2,p:[["r",9,10],["p",7,7,"inv"]]},{at:4,p:[["r",1,10],["n",8,10]]},{at:6,p:[["c",2,8],["p",9,7,"inv"]]}],
      say:"星樞兩招都會用：俥深入就「斷路令」、直路空了就「長驅直入」——一步要兩用。",tip:"俥沿著自己要守的那條直路進退：進去拆陣、退回來時順手守口，一步做兩件事"},
    /* 第 12 關（章末守關）：兩顆車各躲在一顆護陣卒後面（右邊那顆開場就在，左邊那顆第 4 回合落下；兩顆都開場就在的那一版，腳本 7～13 回合就被將死）。
       拆掉護陣卒＝打開那條直路（長驅直入），俥深入又會被斷路令點名。不加新規則，考這一章學過的 */
    12:{n:12,nm:"守關・斷路營",th:"章末守關",hp:200,atk:100,def:40,   /* 11/15 七星改版：每種棋子各用自己等級後這關變太容易（腳本公平對照第 3 天 3/21→15/21），開發者選單調 hp 170→200、def 30→40（試算第 3 天 4/21、第 8 天 6/21）；story/七星各自等級_平衡對照_1115.md */
      esp0:35,esk:["dll","cqzr"],depth:3,rs:14,arep:1,boss:1,
      open:[["k",5,10],["a",4,10],["a",6,10],["b",3,10],["b",7,10],["r",9,10],["c",8,8],["n",2,10],["p",1,7,"guard"],["p",9,7,"guard"]],
      waves:[{at:2,p:[["p",3,7,"inv"],["p",7,7,"inv"]]},{at:4,p:[["r",1,10],["n",8,10]]},{at:6,p:[["c",2,8],["p",5,7,"inv"]]}],
      say:"斷路營：星樞的車躲在護陣卒後面，拆陣就等於打開一條直路。",tip:"拆掉護陣卒之後那條直路就空了：先安排好誰守口、俥怎麼退，再動手拆陣"},
    /* ===== 星槎序章（11/15 七星改版第二期：第一章之前 9 關，只用已加入的角色；設計書 story/七星陸續加入與各自等級_設計書_1115.md 第七節）=====
       關號 31～39＝A1～A3（只有齊轍）、B1～B3（加駱躍梅）、C1～C3（沈方庭、鐵連城加入後）；code＝畫面上的關名（lvName）。
       pro＝序章：紅方陣容自訂（red，沒有後備、沒有補給點），敵方不用湊滿 16 子（lvCheck 只查不超過標準子數）；沒加入的那種棋子照舊是木棋靈（07pty-party.js ptySquad）。
       win＝另外的過關條件（settle 判）：clr＝盤上那種黑子吃光、星門也沒有還沒落的；wv＝援軍都落下（或被截掉）、盤上沒有入侵卒。將死、星核歸零照舊算贏。
       noprog＝連續幾回合沒進展判和（殘局關追殺要時間，從 8 放寬）。序章開戰帶 noPerpetual（gsvStart）：教學關新手很容易無意間長將、長捉，不判負（星樞那邊照舊有 arep 不長將）。純殘局四關（A2、A3、B2、C2）用 App 的 Pikafish 驗過紅方先走有殺（2、7、5、4 步）。 */
    31:{n:31,code:"A1",pro:1,nm:"直路衝鋒",th:"俥一步到底",hp:60,atk:80,def:0,esp0:0,esk:[],depth:2,rs:10,noprog:14,win:{clr:"p"},
      red:[["R",1,1],["K",4,1]],open:[["k",5,10],["p",3,7],["p",5,7],["p",7,7]],waves:[{at:2,p:[["p",9,7,"inv"]]}],
      say:"只有齊轍一個人——三顆卒還沒過河，第二回合星門還會落一顆。",tip:"俥直走、橫走都能一步到底；沒過河的卒只能往前，從旁邊吃最安全"},
    32:{n:32,code:"A2",pro:1,nm:"帥佔中路",th:"將帥不能照面",hp:60,atk:80,def:0,esp0:0,esk:[],depth:2,rs:10,noprog:14,
      red:[["R",1,5],["K",4,1]],open:[["k",5,8]],waves:[],
      say:"星樞只剩一顆將——把它逼死在九宮裡。",tip:"將帥不能在同一條直線上照面：帥站住一條路，將就不敢過來，俥再把它趕到底"},
    33:{n:33,code:"A3",pro:1,nm:"單車破雙士",th:"必勝殘局",hp:60,atk:80,def:5,esp0:0,esk:[],depth:3,rs:12,noprog:14,
      red:[["R",9,1],["K",4,1]],open:[["k",5,9],["a",4,10],["a",6,10]],waves:[],
      say:"雙士守著九宮——單車也破得了。",tip:"俥先佔中路，逼士離開原位，再配合帥殺"},
    34:{n:34,code:"B1",pro:1,nm:"馬走日字",th:"蹩馬腿",hp:30,atk:80,def:0,esp0:0,esk:[],depth:2,rs:12,noprog:20,win:{clr:"p"},
      red:[["N",3,3],["K",4,1]],open:[["k",5,10],["p",3,7],["p",7,7]],waves:[],   /* 11/15 引擎驗證：原本四顆卒散在兩翼、傌從底線出發、星樞 HP 60，5 局 0 勝；改兩顆卒、傌往前站、HP 30（吃卒、將軍也能打穿），沒進展判和放到 20 回合：Pikafish 3 層 4/6 過關、其餘判和、沒有輸的 */
      say:"兩顆卒守在河口——駱躍梅的傌一顆一顆收。",tip:"傌走日字；傌腳旁邊貼著一顆子就跳不過去（蹩馬腿）"},
    35:{n:35,code:"B2",pro:1,nm:"臥槽馬",th:"俥傌配合",hp:60,atk:80,def:5,esp0:0,esk:[],depth:3,rs:12,noprog:14,
      red:[["R",9,1],["N",2,1],["K",4,1]],open:[["k",5,10],["a",4,10],["a",6,10]],waves:[],
      say:"雙士護著將——俥封線、傌臥槽。",tip:"傌跳到對方將斜前方那一格（臥槽）將軍，俥封住將逃走的那條線"},
    36:{n:36,code:"B3",pro:1,nm:"兩翼回援",th:"一人顧一翼",hp:90,atk:70,def:5,esp0:0,esk:[],depth:2,rs:12,win:{wv:1},
      red:[["R",1,1],["N",8,1],["K",5,1],["A",4,1],["A",6,1]],open:[["k",5,10],["a",5,9],["a",4,10],["b",3,10],["b",7,10]],
      waves:[{at:1,p:[["p",1,7,"inv"],["p",3,7,"inv"]]},{at:3,p:[["p",7,7,"inv"],["p",9,7,"inv"]]},{at:5,p:[["p",5,7,"inv"]]}],
      say:"左右兩扇星門會先後落卒——三波都擋下來。",tip:"俥、傌一人顧一翼：入侵卒過了河、下個回合結束還在才扣血，趕在那之前吃掉"},
    37:{n:37,code:"C1",pro:1,nm:"仕護九宮",th:"先守後攻",hp:80,atk:90,def:10,esp0:0,esk:[],depth:2,rs:12,
      red:[["K",5,1],["A",4,1],["A",6,1],["R",1,1]],open:[["k",4,10],["r",9,9],["p",3,6],["p",7,6]],waves:[],
      say:"一車兩卒直撲九宮——先守住，再反擊。",tip:"仕只在九宮裡斜走一步，貼身護帥；先守住，等俥回防再反擊"},
    38:{n:38,code:"C2",pro:1,nm:"出帥助攻",th:"帥也能進攻",hp:60,atk:80,def:5,esp0:0,esk:[],depth:3,rs:12,noprog:14,
      red:[["K",5,1],["A",5,2],["R",9,1]],open:[["k",5,9],["a",4,10]],waves:[],
      say:"將士縮在九宮——帥也能出來幫忙。",tip:"帥離開中宮佔住肋道，控住將能逃的那條線（明朝站「出帥助攻」）"},
    39:{n:39,code:"C3",pro:1,nm:"攻守兼備",th:"接上第一章",hp:110,atk:80,def:10,esp0:10,esk:[],depth:2,rs:12,
      red:[["K",5,1],["A",4,1],["A",6,1],["R",1,1],["N",2,1]],open:[["k",5,10],["a",4,10],["b",3,10],["c",8,8],["p",5,7]],
      waves:[{at:2,p:[["p",3,7,"inv"]]},{at:4,p:[["p",7,7,"inv"],["p",1,7]]}],
      say:"星樞擺出士、象、砲的小陣，星門還會落卒——攻守都要顧。",tip:"這是第一章之前的最後一關：先處理入侵卒，再用俥傌把星核打穿"}};
  const LVN=Object.keys(LV).map(Number);
  /* 章（選關畫面分章用；11/15 加第二章）：t＝章次、nm＝章名（提案二第 3 節）、lv＝這一章的關 */
  const CHP=[{n:0,t:"序章",nm:"星槎序章",lv:[31,32,33,34,35,36,37,38,39]},{n:1,t:"第一章",nm:"星門入侵",lv:[1,2,3,4,5,6]},{n:2,t:"第二章",nm:"俥路調度",lv:[7,8,9,10,11,12]}];
  /* 第一章的星樞要不要也「不長將」（第二章的 arep）：1＝第 1～6 關也開、0＝不開（第 1～6 關選步回到 11/15 下午的樣子）。
     11/15 開發者用選單決定開：封測玩家不能靠「等星樞自己長將判負」過關。只管 CHP 第一章那六關；車輪戰登記的 101 以後不在裡面，照舊不開 */
  const AREP1=1;
  /* ===== 逐關解鎖、三星、困難版（11/15 開發者為 14 天封測選的三項；修為、星塵、定軌力照舊都不給）=====
     解鎖 lockWhy：第 1 關永遠開；打贏過的關保持開（改版不把老玩家鎖回去）；其他要先破前一關（第 7 關＝破第 6 關）。困難版＝破了這一關的普通版才開。all＝開發者全開。回空字串＝開著，否則回一句原因。
     不在選關裡的盤（車輪戰登記的 101 以後）一律當開著，這一段的東西都不套到它們身上 */
  /* 11/15 七星改版：序章三階段的第一關（31、34、37）看那幾位加入了沒（has＝07pty-party.js 的 ptyHas；沒給＝不看加入，規則測試、模擬用），階段內要破前一關；
     第 1 關要先破序章 C1。改版前已經打過第一、二章任何一關（贏、輸、和都算）的存檔不鎖回去 */
  const PRO_NEED={31:[],34:["x_miaogirl"],37:["x_shuai","x_shi"]},PRO_WHY={34:"駱躍梅加入後開放",37:"沈方庭、鐵連城加入後開放"};
  const lvName=n=>LV[n]&&LV[n].code?"序章 "+LV[n].code:"第 "+n+" 關";
  function lockWhy(P,n,hard,all,has){n=+n;if(all||!LVN.includes(n))return"";const won=k=>!!(P&&P.c&&P.c[k]&&P.c[k].w>0);
    if(hard)return won(n)?"":"先破普通版";if(won(n))return"";
    if(LV[n].pro){const st=n-(n-31)%3;if(has&&(PRO_NEED[st]||[]).some(c=>!has(c)))return PRO_WHY[st];return n===st||won(n-1)?"":`破${lvName(n-1)}開放`}
    if(n===1){const old=!!(P&&P.c)&&Object.keys(P.c).some(k=>+k>=1&&+k<=12&&P.c[k]&&(P.c[k].w||P.c[k].l||P.c[k].d));return old||won(37)?"":"破序章 C1 開放"}
    return won(n-1)?"":`破第 ${n-1} 關開放`}
  /* 三星：第 1 星＝過關；第 2、3 星每關各一個條件（STG），跟那一關的學習點有關。各自累積：某一局過關、而且那一局達成那個條件，那顆星就亮，不用同一局全拿（對新手友善，也多一個回來重打的理由）。
     GOAL 條件種類：t＝卡上那句話、ok(td,盤面,參數)＝這一局有沒有達成（只在過關時算）。td.tl＝這一局的統計（boot 建、move／settle 記）：inv 入侵扣掉的 HP、n 星樞大招打中幾次、drain 被奪走的靈力、lost 被擒的己子（棋種字母串）。
     改版前存下來、還沒打完的盤沒有 td.tl：靠它的條件一律算沒達成 */
  const GOAL={inv0:{t:"入侵沒扣到血",ok:td=>!!td.tl&&td.tl.inv===0},esk0:{t:"星樞大招一次都沒中",ok:td=>!!td.tl&&td.tl.n===0},drain0:{t:"沒被奪靈",ok:td=>!!td.tl&&td.tl.drain===0},
    rook:{t:"俥沒被吃",ok:td=>!!td.tl&&!td.tl.lost.includes("R")},rookOn:{t:"過關時場上有俥",ok:(td,b)=>(b||[]).includes("R")},dep:{t:"部署過後備",ok:td=>td.dep>=1},icpt:{t:"截援一次",ok:td=>td.icpt>=1},
    guard0:{t:"護陣全部拆掉",ok:td=>guards(td)===0},
    /* 入侵卒全部清掉：過關時場上沒有入侵卒，而且入侵卒的援軍都落下過（或被你截掉）——還沒落下的那一顆不算清掉，太早打完拿不到。只看 td 現況，不靠 td.tl */
    invClr:{t:"入侵卒全部清掉",ok:td=>!Object.keys(td.ids).some(q=>tagOf(td,td.ids[q])==="inv")&&!(td.waves||[]).some(w=>w.tag==="inv"&&w.st==="wait")},hp:{t:v=>`剩餘 HP ${v}% 以上`,ok:(td,b,v)=>td.me.hp>0&&td.me.hp*100>=td.me.max*v},
    /* 序章（11/15）：殘局關星樞沒有傷害來源，HP 星一定拿到，改看快不快、靠不靠招 */
    fast:{t:v=>`${v} 回合內過關`,ok:(td,b,v)=>td.rnd<=v},nosk:{t:"不用招也過關",ok:td=>!Object.keys(td.used||{}).length}};
  /* 11/15 開發者用選單決定：第 2 關第 2 星從「部署過後備」（腳本每盤都拿到，太容易）換成「入侵卒全部清掉」（左翼兩顆、右翼一顆都處理掉＝分兵與回援）。
     已經上線過：星照位置存（st[1]），舊條件下亮過的那一顆不會掉，只是之後要再拿就照新條件。困難版同一張表，一起換 */
  const STG={1:[["inv0"],["hp",50]],2:[["invClr"],["inv0"]],3:[["guard0"],["hp",40]],4:[["drain0"],["icpt"]],5:[["guard0"],["esk0"]],6:[["esk0"],["hp",40]],
    7:[["esk0"],["rook"]],8:[["inv0"],["esk0"]],9:[["esk0"],["guard0"]],10:[["guard0"],["rookOn"]],11:[["esk0"],["rook"]],12:[["guard0"],["esk0"]],
    31:[["inv0"],["fast",10]],32:[["fast",4],["nosk"]],33:[["fast",10],["nosk"]],34:[["fast",14],["hp",70]],35:[["fast",8],["nosk"]],36:[["inv0"],["hp",60]],
    37:[["hp",50],["rook"]],38:[["fast",6],["nosk"]],39:[["inv0"],["hp",50]]};
  /* 這一關的三個目標 [{k,v,t}]（第一個固定是過關）；沒有設目標的盤只有過關一個 */
  /* 11/16 開發者「對方 HP 還沒歸 0 為什麼莫名其妙就破關了」（序章 B3）→ 選單選「保留並寫清楚」：序章另外的過關條件（LV.win）寫給玩家看。
     winTxt(n)＝條件本身（沒有就空字串）；winNow(td,盤面)＝對局中的進度那一句（gsvFoeLine 放在上方那一行） */
  function winTxt(n){const W=(LV[n]||{}).win;if(!W)return"";return W.clr?`吃光${PBN[up(W.clr)]}`:W.wv?"援軍都擋下來、入侵卒清光":""}
  function winNow(td,b){const W=td&&td.win;if(!W)return"";const wait=k=>(td.waves||[]).filter(w=>w.st==="wait"&&(!k||w.p===k));
    if(W.clr){const n=(b||[]).filter(x=>x===W.clr).length+wait(W.clr).length;return`過關：吃光${PBN[up(W.clr)]}（還剩 ${n} 顆）`}
    if(W.wv){const wv=new Set(wait().map(w=>w.wv)).size,inv=Object.keys(td.ids).filter(q=>tagOf(td,td.ids[q])==="inv").length;return`過關：擋下援軍（還有 ${wv} 波）、清光入侵卒（場上 ${inv} 顆）`}return""}
  function goals(n){return[{k:"win",t:winTxt(n)?`過關（${winTxt(n)}也算）`:"過關"}].concat((STG[n]||[]).map(([k,v])=>({k,v,t:typeof GOAL[k].t==="function"?GOAL[k].t(v):GOAL[k].t})))}
  /* 這一局過關時拿到哪幾顆 [1,0／1,0／1]；recStars＝紀錄裡已經有的（舊存檔沒有 st：有勝場算 1 星）；兩個照位置取大的就是新的紀錄 */
  function stars(td,b){return goals(td.lv).map((g,i)=>i===0||GOAL[g.k].ok(td,b,g.v)?1:0)}
  function recStars(R,n){const N=goals(n).length;return Array.from({length:N},(x,i)=>R&&Array.isArray(R.st)?(R.st[i]?1:0):(i===0&&R&&R.w>0?1:0))}
  /* 困難版：同一關、同一個擺法和波次，只換星樞這一邊，不加血量。通用 HARD＝多想一步（depth +1，最多 4）、不長將、開場靈力 +15（招放得早）、ATK +10；
     每關再多一樣 HARDX：第 1～4 關多「星樞護盾」（原本做好了沒有關卡用）、第 5 關分段提早到 75%／45%、第 6 關多隔山星砲、第 7～10 關兩個俥路大招都會、第 11、12 關再多星樞護盾。
     lvOf(n,hard)＝這一盤實際用的關卡參數（boot 用；普通版就是 LV[n] 原樣） */
  const HARD={depth:1,esp0:15,atk:10},HARDX={1:{esk:["esh"]},2:{esk:["esh"]},3:{esk:["esh"]},4:{esk:["esh"]},5:{ph:[{hp:.75,esk:"pao"},{hp:.45,esk:"zjhl"}]},6:{esk:["zjhl","pao"]},
    7:{esk:["cqzr","dll"]},8:{esk:["cqzr","dll"]},9:{esk:["dll","cqzr"]},10:{esk:["cqzr","dll"]},11:{esk:["dll","cqzr","esh"]},12:{esk:["dll","cqzr","esh"]},
    31:{},32:{},33:{},34:{},35:{},36:{},37:{},38:{},39:{}};   /* 序章：只套通用的 HARD */
  function lvOf(n,hard){const V=LV[n];if(!V||!hard||!HARDX[n])return V;return Object.assign({},V,{hard:1,arep:1,depth:Math.min(4,V.depth+HARD.depth),esp0:V.esp0+HARD.esp0,atk:V.atk+HARD.atk},HARDX[n])}
  /* 星樞的招（敵方每回合最多一招，也要付靈力、有冷卻） */
  const ESK={esh:{nm:"星樞護盾",cost:20,cd:3,d:"星樞得 20 點護盾，兩回合到期"},zjhl:{nm:"卒將號令",sn:"號令",cost:40,cd:4,base:28,d:"預告一回合：下回合結束時，號令卒還在你的半場，就對你的星核造成基礎 28 傷害；號令卒被吃或不在你的半場就取消"},
    pao:{nm:"隔山星砲",sn:"星砲",cost:40,cd:4,base:30,d:"預告一回合：指定一門砲、砲架和你的一顆子。下回合結束時三顆都還在原線上、中間只隔這一個砲架、砲還能合法吃到它，就對你的星核造成基礎 30 傷害；移走目標、吃掉砲或砲架、多擋一子就取消（不換砲、不換架）"},
    cqzr:{nm:"長驅直入",sn:"長驅",cost:40,cd:4,base:26,keep:.7,d:"預告一回合：指定一顆還沒過河的車和它所在的直路。下回合結束時這顆車還在原位、從它到你的底線整條直路都是空的，就對你的星核造成基礎 26 傷害；在那條直路上擋一子、吃掉這顆車、或車離開原位（被定身也算）就取消（不換車、不換路）"},
    dll:{nm:"斷路令",sn:"斷路",cost:40,cd:4,base:24,d:"預告一回合：指定你一顆在敵方半場的俥。下回合結束時這顆俥還在敵方半場，就對你的星核造成基礎 24 傷害；把俥退回自己的半場就取消（俥被吃也取消，不換目標）"}};
  /* ===== 招式（提案二第 11 節 35 招逐招映射；費用／冷卻是候選值）=====
     tg：要選的目標（每一步一格）；info＝純情報、不占招、不扣費。通用招（g*）每位都有：集火、士相護線、緊急回復；部署 dep 是主要行動。 */
  const SK=[
    {id:"shen1",ch:"x_shuai",lv:1,nm:"重金懸賞",cost:30,cd:4,d:"回復 15（計入每局回復總量）"},
    {id:"shen2",ch:"x_shuai",lv:6,nm:"庭院小息",cost:20,cd:3,d:"回復 8；星樞上一步將軍你就回 12"},
    {id:"shen3",ch:"x_shuai",lv:12,nm:"帥令安軍",cost:20,cd:2,d:"解除己方一子受到的控制（沒有可解除的就不能放、不扣費）"},
    {id:"shen4",ch:"x_shuai",lv:17,nm:"當票回春",cost:30,cd:4,d:"回復 12；放之前 HP 不到一半就回 17"},
    {id:"shen5",ch:"x_shuai",lv:23,nm:"九宮守心",cost:30,cd:5,d:"帥站九宮正中心才能放：之後每回合結束帥還在正中心就回 4，最多 3 次"},
    {id:"tie1",ch:"x_shi",lv:1,nm:"鐵壁銅牆",cost:20,cd:3,d:"星核得 20 點護盾，兩回合到期（盾池上限 30）"},
    {id:"tie2",ch:"x_shi",lv:6,nm:"仕角守門",cost:20,cd:3,d:"兩回合內，己方仕斜角相鄰的空點變成守門點：敵子走進去就定身一回合"},
    {id:"tie3",ch:"x_shi",lv:12,nm:"銅鎖止步",cost:30,cd:4,tg:["foe"],d:"鎖住一顆敵子：它這回合如果走動，就定身兩回合；不動不觸發"},
    {id:"tie4",ch:"x_shi",lv:17,nm:"近侍護帥",cost:30,cd:4,d:"帥斜角相鄰每顆己方仕給 12 點盾，最多 24（共用盾池上限 30）"},
    {id:"tie5",ch:"x_shi",lv:23,nm:"盾陣回靈",cost:0,cd:4,d:"上一回合結算被星樞扣了至少 4 HP，回 6 靈力（占這回合的招、受收入上限）"},
    {id:"bu1",ch:"x_bing",lv:1,nm:"神行百里",cost:30,cd:4,tg:["own","own2"],d:"交換己方兩子位置（換完要合法、不能將帥照面）"},
    {id:"bu2",ch:"x_bing",lv:6,nm:"勇往直前",cost:0,cd:3,d:"上一步是兵往前走，回 6 靈力（占這回合的招、受收入上限）"},
    {id:"bu3",ch:"x_bing",lv:12,nm:"跑腿賺錢",cost:20,cd:5,d:"接下來三回合，兵每往前走一步回復 4，最多 3 次"},
    {id:"bu4",ch:"x_bing",lv:17,nm:"步步為營",cost:15,cd:3,d:"指定兵兩回合內擋一次虛空鎖（這一批星樞沒有虛空鎖，不能放）"},
    {id:"bu5",ch:"x_bing",lv:23,nm:"揚州快步",cost:5,cd:4,d:"兩回合內下一個其他付費招少 15 靈力（最低 10）"},
    {id:"qi1",ch:"x_swordboy",lv:1,nm:"一劍破甲",cost:40,cd:5,tg:["foePAB"],once:1,d:"每局一次：移除一顆敵方卒、士或象（不能移除將；移完要合法）"},
    {id:"qi2",ch:"x_swordboy",lv:6,nm:"直路衝鋒",cost:20,cd:3,d:"上一步是俥走、而且那顆俥現在能合法擒子：基礎「直走格數×2」（最多 10）打星樞"},
    {id:"qi3",ch:"x_swordboy",lv:12,nm:"輪牌護身",cost:20,cd:3,tg:["ownR"],d:"兩回合內，這顆俥被擒時星核少受 10 傷害（俥照常離場）"},
    {id:"qi4",ch:"x_swordboy",lv:17,nm:"認轍尋路",cost:0,cd:0,info:1,d:"標出下一步能擒到己方俥的敵子（情報，不占招、不扣費）"},
    {id:"qi5",ch:"x_swordboy",lv:23,nm:"長街破陣",cost:35,cd:5,tg:["ownR","line"],d:"指定俥的橫線或直線：最近 3 顆非將敵子合成一擊，每顆基礎 6"},
    {id:"tian1",ch:"x_spiritgirl",lv:1,nm:"飛燕還巢",cost:30,cd:4,tg:["ownBig","back"],d:"己方一顆俥、炮或傌回到底線空格（要合法）"},
    {id:"tian2",ch:"x_spiritgirl",lv:6,nm:"青玉護棚",cost:20,cd:4,d:"兩回合內入侵傷害先扣 18 點減傷額度，用完就止"},
    {id:"tian3",ch:"x_spiritgirl",lv:12,nm:"象眼迷煙",cost:20,cd:3,tg:["foeHalf"],d:"己方半場一顆敵子兩回合內不能擒子（還能走）"},
    {id:"tian4",ch:"x_spiritgirl",lv:17,nm:"渡口清茶",cost:20,cd:3,d:"上一步沒有擒子才能放：回復 10"},
    {id:"tian5",ch:"x_spiritgirl",lv:23,nm:"雙燕斜護",cost:30,cd:4,tg:["own","diag"],d:"兩顆斜向相鄰的己子結對：兩回合內一顆被擒，另一顆下次被擒星核少受 10"},
    {id:"lei1",ch:"x_martialgirl",lv:1,nm:"煙火震懾",cost:20,cd:3,tg:["foe"],d:"一顆非將敵子這回合不能動；解除後同一子兩回合內不能再被定身"},
    {id:"lei2",ch:"x_martialgirl",lv:6,nm:"隔子星花",cost:20,cd:3,tg:["foeCan"],d:"己方炮隔一子瞄到的非將敵子：基礎 8 打星樞；炮架是敵子再加 4"},
    {id:"lei3",ch:"x_martialgirl",lv:12,nm:"花火連環",cost:30,cd:4,d:"最多 3 顆破甲標記敵子（炮隔一子瞄到的）合成一擊，每顆基礎 6"},
    {id:"lei4",ch:"x_martialgirl",lv:17,nm:"火網標記",cost:20,cd:3,d:"兩回合內，炮隔兩子瞄到的敵子也算破甲標記（只擴張標記，不讓炮多吃）"},
    {id:"lei5",ch:"x_martialgirl",lv:23,nm:"煙幕護耳",cost:20,cd:3,tg:["ownNK"],d:"己方一子這回合不能被敵子擒（會排空敵方合法步就不能放）"},
    {id:"luo1",ch:"x_miaogirl",lv:1,nm:"回營",cost:50,cd:5,tg:["lost"],once:1,d:"每局一次：同一顆被擒的己子回到原位（原位要空、要合法；不能復活帥）"},
    {id:"luo2",ch:"x_miaogirl",lv:6,nm:"紅馬跳影",cost:20,cd:3,tg:["foeHorse"],d:"己方傌日字（沒蹩腿）的非將敵子：基礎 10 打星樞"},
    {id:"luo3",ch:"x_miaogirl",lv:12,nm:"拐彎避風",cost:20,cd:3,d:"上一步是傌走的：星核得 20 點護盾"},
    {id:"luo4",ch:"x_miaogirl",lv:17,nm:"驛鈴回氣",cost:20,cd:4,d:"回復 6；這局下一次復活己子時再回 10"},
    {id:"luo5",ch:"x_miaogirl",lv:23,nm:"馬腿解圍",cost:20,cd:3,tg:["ownLeg"],d:"己方傌被自己人蹩腿：把蹩腿的子移到己方半場最近的合法空位（只往左右或後方）"},
    {id:"gfocus",ch:"*",lv:1,nm:"集火",cost:30,cd:3,tg:["focus"],gen:1,d:"有兩顆己子能合法擒到的敵子：這回合真的擒下它，基礎 +8"},
    {id:"gguard",ch:"*",lv:1,nm:"士相護線",cost:20,cd:2,tg:["guarded"],gen:1,d:"指定一顆有己方仕或相合法保護的己子：星核得 20 點護盾兩回合"},
    {id:"gheal",ch:"*",lv:1,nm:"緊急回復",cost:40,cd:5,gen:1,max:2,d:"回復 16；每局最多 2 次"}];
  const SKM={};for(const s of SK)SKM[s.id]=s;
  const GEN=SK.filter(s=>s.gen).map(s=>s.id);
  const skOf=(ck,L)=>SK.filter(s=>s.ch===ck&&s.lv<=(+L||1)).map(s=>s.id);
  /* 帶上場的招：只收這位角色已解鎖的，最多 4 招；沒選就帶前 4 招 */
  /* 11/16 開發者「黑洞裡可以用每個人的招式」「不要有隊長這個設定」：有隊伍（sq）時，本命招池＝已加入（不是木棋靈）的每一位、照各自等級已學會的招（通用招照舊另外有），一場最多 4 招不限誰的 */
  const JOIN_ORD=["x_swordboy","x_miaogirl","x_shuai","x_shi","x_spiritgirl","x_bing","x_martialgirl"];   /* 預設招照七星加入順序（跟 07pty-party.js ptyPick 一致，齊轍的先）；SK 表本身照角色分組，順序不同 */
  const skOfSq=sq=>SK.filter(s=>!s.gen&&PCS.some(pc=>sq[pc]&&sq[pc].ck===s.ch&&!sq[pc].wood&&s.lv<=sq[pc].L)).sort((a,b)=>JOIN_ORD.indexOf(a.ch)-JOIN_ORD.indexOf(b.ch)).map(s=>s.id);
  function skPickSq(sq,sk){const ok=skOfSq(sq),a=(Array.isArray(sk)?sk:[]).filter((id,i,A)=>ok.includes(id)&&A.indexOf(id)===i).slice(0,4);return a.length?a:ok.slice(0,4)}
  function skPick(ck,L,sk){const ok=skOf(ck,L),a=(Array.isArray(sk)?sk:[]).filter((id,i,A)=>ok.includes(id)&&A.indexOf(id)===i).slice(0,4);return a.length?a:ok.slice(0,4)}
  /* ===== 盤面工具 ===== */
  const AP=[[7,3],[7,5],[8,4],[9,3],[9,5]],BP=[[9,2],[9,6],[7,0],[7,4],[7,8],[5,2],[5,6]];
  function canStand(p,sq){if(sq<0||sq>89)return false;const s=sd(p),t=up(p),r0=RW(sq),c=CL(sq),r=s==="r"?r0:9-r0;
    if(t==="K")return r>=7&&c>=3&&c<=5;if(t==="A")return AP.some(([a,b])=>a===r&&b===c);if(t==="B")return BP.some(([a,b])=>a===r&&b===c);
    if(t==="P")return r<=4||(r<=6&&c%2===0);return true}
  function facing(b){const a=b.indexOf("K"),k=b.indexOf("k");if(a<0||k<0||a%9!==k%9)return false;for(let i=k+9;i<a;i+=9)if(b[i])return false;return true}
  const inPal=(sq,side)=>{const r=RW(sq),c=CL(sq);return c>=3&&c<=5&&(side==="r"?r>=7:r<=2)};
  const redHalf=sq=>RW(sq)>=5;
  const own=(b,f)=>{const o=[];for(let q=0;q<90;q++)if(b[q]&&sd(b[q])==="r"&&(!f||f(b[q],q)))o.push(q);return o};
  const foe=(b,f)=>{const o=[];for(let q=0;q<90;q++)if(b[q]&&sd(b[q])==="b"&&b[q]!=="k"&&(!f||f(b[q],q)))o.push(q);return o};
  const L_=(b,s,C)=>{try{return C.legal(b,s)}catch(e){return[]}};
  const ck_=(b,s,C)=>{try{return C.inCheck(b,s)}catch(e){return false}};
  /* 招式／部署改完盤面（輪到紅方）要合法：黑方不能被將、不能照面、紅方不能因此被將（本來被將的要解掉才算數就看 needSafe）、紅方還有步 */
  function okMagic(b,C){return!ck_(b,"b",C)&&!facing(b)&&!ck_(b,"r",C)&&L_(b,"r",C).length>0}
  function idAt(td,q){return td.ids[q]||null}
  function sqOfId(td,id){for(const k in td.ids)if(td.ids[k]===id)return +k;return null}
  const tagOf=(td,id)=>id&&td.meta[id]?td.meta[id].tag||"":"";
  function ev(td,o){o.s=++td.seq;o.r=td.rnd+1;td.ev.push(o);if(td.ev.length>40)td.ev.splice(0,td.ev.length-40);return o}
  /* 盤面變化（不是走棋）：記在 P.ed 第 n 手之後；同一個 n 只留一筆、s 存每格最後的樣子；ps＝這一筆之後換手（部署用掉主要行動）。local.js tdRebuild 照這個重放 */
  function edit(P,C,ch,ps){const n=P.moves.length;P.ed=P.ed||[];let e=P.ed.find(x=>x.n===n);if(!e){e={n,s:{}};P.ed.push(e)}
    for(const k in ch){P.board[+k]=ch[k]||null;e.s[k]=ch[k]||null}if(ps){e.ps=1;P.turn=P.turn==="r"?"b":"r"}
    if(P.pos&&P.pos.length)P.pos[P.pos.length-1]=C.fen(P.board,P.turn)}
  /* ===== 關卡資料 → 開局盤面、波次、檢查器 ===== */
  function plan(n){const V=LV[n];if(!V)return null;
    const red=(V.red||RED).map(([p,lu,xi])=>[p,LSQ(lu,xi)]),open=V.open.map(([p,lu,xi,tg])=>[p,LSQ(lu,xi),tg||""]);
    const waves=[];V.waves.forEach((w,wi)=>w.p.forEach(([p,lu,xi,tg],i)=>waves.push({id:"w"+(wi+1)+"_"+(i+1),wv:wi+1,at:w.at,p,sq:LSQ(lu,xi),tag:tg||"",dl:0,st:"wait"})));
    return{red,open,waves,res:(V.res||(V.pro?[]:RES)).slice(),dp:(V.dp||(V.pro?[]:DP)).map(d=>({id:d.id,sq:LSQ(d.sq[0],d.sq[1]),al:d.al}))}}
  function startBoard(n){const pl=plan(n);if(!pl)return null;const b=new Array(90).fill(null);for(const[p,q]of pl.red)b[q]=p;for(const[p,q]of pl.open)b[q]=p;return b}
  function startFen(n,C){const b=startBoard(n);if(!b)throw new Error("星門圍城沒有第 "+n+" 關");return C.fen(b,"r").split(" ")[0]}
  /* 開局＋波次合法檢查（提案一 7「排好後跑標準子數、仕相可達位置、將帥及合法步檢查」）：回傳錯誤清單（空＝通過） */
  function lvCheck(n,C){const err=[],pl=plan(n);if(!pl)return["沒有這一關"];const b=new Array(90).fill(null),cnt={},rc={};
    for(const[p,q]of pl.red){if(b[q])err.push(`紅${PCN[p]}跟別的子重疊（格 ${q}）`);else if(!canStand(p,q))err.push(`紅${PCN[p]}不能站格 ${q}`);b[q]=p;rc[p]=(rc[p]||0)+1}
    for(const p of pl.res)rc[p]=(rc[p]||0)+1;
    const pro=!!LV[n].pro;   /* 序章：紅方陣容、敵方子數都不用湊滿，只查不超過標準 */
    for(const p in STD)if(pro?(rc[up(p)]||0)>STD[p]:(rc[up(p)]||0)!==STD[p])err.push(`紅${PCN[up(p)]}開場＋後備共 ${rc[up(p)]||0} 顆（要${pro?"不超過":"剛好"} ${STD[p]}）`);
    if(!pro&&pl.red.length!==8)err.push(`紅方開場要 8 子，現在 ${pl.red.length}`);
    for(const[p,q]of pl.open){if(b[q])err.push(`${PBN[up(p)]}跟別的子重疊（格 ${q}）`);else if(!canStand(p,q))err.push(`${PBN[up(p)]}不能站格 ${q}`);b[q]=p;cnt[p]=(cnt[p]||0)+1}
    for(const w of pl.waves){cnt[w.p]=(cnt[w.p]||0)+1;if(!canStand(w.p,w.sq))err.push(`星門的${PBN[up(w.p)]}落點不合法（格 ${w.sq}）`);if(b[w.sq])err.push(`星門 ${w.id} 開局就有子（格 ${w.sq}）`);if(redHalf(w.sq))err.push(`星門 ${w.id} 不在敵方半場`)}
    for(const p in STD)if(pro?(cnt[p]||0)>STD[p]:(cnt[p]||0)!==STD[p])err.push(`${PBN[up(p)]}共 ${cnt[p]||0} 顆（開場＋波次要${pro?"不超過":"剛好"} ${STD[p]}）`);
    {const at=new Set(pl.waves.map(w=>w.at+":"+w.sq));if(at.size!==pl.waves.length)err.push("同一回合兩顆援軍落同一格")}
    if(b.indexOf("k")<0||b.indexOf("K")<0)err.push("將帥不齊");if(facing(b))err.push("將帥照面");
    if(ck_(b,"r",C))err.push("開局紅方被將");if(ck_(b,"b",C))err.push("開局黑方被將");if(!L_(b,"r",C).length)err.push("紅方沒有步可走");
    for(const d of pl.dp){if(b[d.sq])err.push(`補給點${d.id}開局有子`);for(const p of d.al)if(!canStand(p,d.sq))err.push(`補給點${d.id}不能站${PCN[p]}`)}
    for(const p of new Set(pl.res))if(!pl.dp.some(d=>d.al.includes(p)&&canStand(p,d.sq)))err.push(`後備${PCN[p]}沒有合適的補給點`);
    return err}
  /* 星門落子合法：格子空、棋種站得住、子數不超、落完不照面、不讓雙方被將（不能落出將軍）、紅方還有步 */
  function spawnOk(b,p,sq,C){if(b[sq])return"門格有子";if(!canStand(p,sq))return"棋種站不住";const n=b.filter(x=>x===p).length;if(n>=STD[p])return"子數超過標準";
    const x=b.slice();x[sq]=p;if(facing(x))return"將帥照面";if(ck_(x,"r",C))return"會落出將軍";if(ck_(x,"b",C))return"黑方會被將";if(!L_(x,"r",C).length)return"紅方會無步可走";return""}
  /* ===== 開局 ===== */
  function core(o){return{hp:o.hp,max:o.hp,atk:o.atk,def:o.def,sp:o.sp0,spMax:o.spMax,sh:{v:0,exp:0},inc:0,lastChk:-9,heal:0,healMax:Math.floor(o.hp*HEAL_PCT),lastLoss:0,dealt:0,taken:0}}
  function boot(cfg,P,C){cfg=cfg||{};const n=+cfg.lv,V=lvOf(n,cfg.hard);if(!V)throw new Error("星門圍城沒有第 "+cfg.lv+" 關");const pl=plan(n),st=stats(cfg.ch,cfg.L),sq=squad((cfg.sq!==undefined?cfg.sq:(typeof ptySquad==="function"?ptySquad():null))),hp0=sq?Math.round(PCS.reduce((a,pc)=>a+sq[pc].hp,0)/PCS.length):st.hp;   /* cfg.hard＝困難版：V 換成 lvOf 的那一組，擺法、波次不變 */
    const avgQ=k=>PCS.reduce((a,pc)=>a+(+sq[pc][k]||0),0)/PCS.length;   /* 11/16 取消隊長：靈力上限、我方攻防＝七種平均（元氣本來就是）；招式傷害在 cast 換成放招那位的攻擊 */
    const td={mode:MODE,mv:MV,lv:n,nm:V.nm,ch:st.ck,cn:st.n,nk:st.nk,L:st.L,rnd:0,seq:0,ev:[],q:[],over:null,
      me:core({hp:hp0,atk:sq?avgQ("atk"):st.atk,def:sq?avgQ("def"):st.def,sp0:SP0,spMax:sq?Math.round(avgQ("sp")):st.sp}),sq,en:core({hp:V.hp,atk:V.atk,def:V.def,sp0:V.esp0,spMax:100}),
      sk:sq?skPickSq(sq,cfg.sk):skPick(st.ck,st.L,cfg.sk),cd:{},cdAt:{},used:{},sk1:-1,res:pl.res.slice(),dep:0,dp:pl.dp,ids:{},meta:{},lost:[],
      waves:pl.waves,arm:{},icpt:0,ctl:{frz:[],noCap:[],noTake:[],trap:null,lock:[],imm:{}},buf:{},fx:null,ecd:{},np:0,last:{r:null,b:null},log:[],rs:V.rs,esk:V.esk.slice(),depth:V.depth,
      phs:(V.ph||[]).map(o=>({hp:o.hp,esk:o.esk})),phn:0,arep:V.arep||(AREP1&&CHP.find(c=>c.n===1).lv.includes(n))?1:0,hard:V.hard?1:0,tl:{inv:0,n:0,drain:0,lost:""},win:V.win||null,noprog:V.noprog||NOPROG};
    let ri=0,bi=0;for(let q=0;q<90;q++){const p=P.board[q];if(!p)continue;const red=sd(p)==="r",id=red?"r"+(++ri):"b"+(++bi);td.ids[q]=id;
      const o=pl.open.find(x=>x[1]===q);td.meta[id]={p,home:q,tag:!red&&o?o[2]:""}}
    ev(td,{k:"start",nm:V.nm});return td}
  /* ===== 共用結算小工具 ===== */
  const defOf=(td,side)=>side==="b"?td.en.def+GUARD*guards(td):defR(td,"K");   /* 我方沒有特定棋子的扣血（被將軍、入侵、星樞招）：帥那一位的 DEF；沒有 sq 時＝整隊 */
  function guards(td){let n=0;for(const q in td.ids){const id=td.ids[q];if(tagOf(td,id)==="guard")n++}return n}
  function queue(td,to,base,why,o){const A=to==="b"?td.me:td.en,raw=dmg(base,o&&o.atk!=null?o.atk:A.atk,o&&o.def!=null?o.def:defOf(td,to));if(o){delete o.def;delete o.atk}const e=Object.assign({to,base,raw,why},o||{});td.q.push(e);return e}
  function heal(td,n,why){const M=td.me,a=Math.max(0,Math.min(n,M.healMax-M.heal,M.max-M.hp));if(a>0){M.hp+=a;M.heal+=a}ev(td,{k:"heal",n:a,want:n,why});return a}
  function spGain(c,n){const a=Math.max(0,Math.min(n,INC_CAP-c.inc,c.spMax-c.sp));c.sp+=a;c.inc+=a;return a}
  function spLeft(c){return Math.max(0,Math.min(INC_CAP-c.inc,c.spMax-c.sp))}
  function shAdd(c,v,R){v=Math.min(SH_CAP,v);if(c.sh.v>0&&R<c.sh.exp&&c.sh.v>=v)return c.sh.v;c.sh={v,exp:R+SH_LIFE};return v}
  const active=(L,R)=>(L||[]).filter(o=>o.until>R);
  /* ===== 走一步（local.js playApply 每一步都叫；黑方走完＝回合結束結算）===== */
  function move(P,m,C){const td=P.td;if(!td||td.mode!==MODE||td.over)return null;const R=td.rnd,f=m.f,t=m.t,id=td.ids[f]||null,vid=td.ids[t]||null,def0=defOf(td,"b");   /* def0：擒子那一擊照擒子前的防禦算（吃護陣卒那一擊還吃得到它的 +20） */
    delete td.ids[f];if(id)td.ids[t]=id;else delete td.ids[t];
    const p=P.board[t],pt=up(p),vp=m.cap?up(m.cap):"";
    if(m.by==="r"){const dist=Math.abs(RW(t)-RW(f))+Math.abs(CL(t)-CL(f));td.last.r={id,p:pt,f,t,dist,cap:!!m.cap,fwd:pt==="P"&&RW(t)<RW(f)};
      if(m.cap){const gtag=tagOf(td,vid),fc=td.fc&&td.fc.r===R&&td.fc.sq===t;td.np=-1;
        const e=queue(td,"b",CAPB[vp]+(fc?FOCUS:0),"cap",{vp,cp:pt,fc:fc?1:0,tag:gtag,def:def0,atk:atkR(td,pt)});ev(td,{k:"cap",by:"r",vp,cp:pt,sq:t,raw:e.raw,fc:e.fc,tag:gtag});
        if(fc)td.fc=null;
        const sg=spGain(td.me,CAP_SP);if(sg)ev(td,{k:"sp",to:"r",n:sg,why:"擒子"});
        if(gtag==="guard")ev(td,{k:"guard",sq:t,def:defOf(td,"b")});if(gtag==="inv")delete td.arm[vid];}
      if(m.ck&&R-td.en.lastChk>=CHK_GAP){td.en.lastChk=R;const e=queue(td,"b",CHK,"chk",{atk:atkR(td,pt)});ev(td,{k:"chk",by:"r",raw:e.raw})}
      const B3=td.buf.bu3;if(B3&&B3.n>0&&R<B3.until&&td.last.r.fwd){B3.n--;heal(td,4,"跑腿賺錢")}
      return null}
    /* 黑方 */
    td.last.b={id,p:pt,f,t,cap:!!m.cap,ck:!!m.ck};
    if(m.cap){td.np=-1;let red=0,why="";const B=td.buf;
      if(B.qi3&&B.qi3.id===vid&&B.qi3.until>R){red+=10;why="輪牌護身";delete B.qi3}
      if(B.pair&&B.pair.until>R){if(B.pair.armed===vid){red+=10;why=why?why+"、雙燕斜護":"雙燕斜護";delete B.pair}else if(B.pair&&(B.pair.a===vid||B.pair.b===vid))B.pair.armed=B.pair.a===vid?B.pair.b:B.pair.a}
      const e=queue(td,"r",CAPB[vp],"cap",{vp,cp:pt,def:defR(td,vp)});if(red){e.cut=Math.min(e.raw,red);e.raw-=e.cut;e.cutWhy=why}
      ev(td,{k:"cap",by:"b",vp,cp:pt,sq:t,raw:e.raw,cut:e.cut||0,cutWhy:why});
      const M=vid&&td.meta[vid];if(M&&vp!=="K")td.lost.push({id:vid,p:M.p,home:M.home});if(td.tl)td.tl.lost+=vp;
      spGain(td.en,CAP_SP);
      if(tagOf(td,id)==="drain"&&td.drR!==R){const n=Math.min(DRAIN,td.me.sp);td.me.sp-=n;td.drR=R;if(td.tl)td.tl.drain+=n;ev(td,{k:"drain",sq:t,n})}}   /* 奪靈馬：真的擒到子才扣，每回合最多一次 */
    if(m.ck&&R-td.me.lastChk>=CHK_GAP){td.me.lastChk=R;const e=queue(td,"r",CHK,"chk");ev(td,{k:"chk",by:"b",raw:e.raw})}
    /* 控制：銅鎖（這回合動了＝定身兩回合）、守門點（走進去＝定身一回合） */
    if(id){const C2=td.ctl;const lk=C2.lock.find(o=>o.id===id&&o.until>R);if(lk&&!((C2.imm[id]||0)>R)){C2.frz.push({id,until:R+3});C2.imm[id]=R+5;ev(td,{k:"ctl",what:"lock",sq:t})}
      if(C2.trap&&C2.trap.until>R&&C2.trap.sqs.includes(t)&&!((C2.imm[id]||0)>R)){C2.frz.push({id,until:R+2});C2.imm[id]=R+4;ev(td,{k:"ctl",what:"trap",sq:t})}
      C2.lock=C2.lock.filter(o=>o.id!==id)}
    if(!td.over)foeSkill(P,C);
    return settle(P,C)}
  /* 星樞的招：每回合最多一招（td.efx＝用過招的回合）。護盾＝星樞走完、這一批結算之前會吃到 8 以上就開 */
  const eOk=(td,k)=>td.esk.includes(k)&&td.en.sp>=ESK[k].cost&&!((td.ecd[k]||0)>0);
  function foeSkill(P,C){const td=P.td,R=td.rnd,E=td.en;if(td.efx===R)return;
    if(eOk(td,"esh")&&E.sh.v<10){const inc=td.q.filter(e=>e.to==="b").reduce((a,e)=>a+e.raw,0);if(inc>=8){E.sp-=ESK.esh.cost;td.ecd.esh=ESK.esh.cd;td.ecdAt=Object.assign({},td.ecdAt,{esh:R});shAdd(E,20,R);td.efx=R;ev(td,{k:"esk",id:"esh",v:E.sh.v})}}}
  /* 預告大招：結算完（下一回合整回合都看得到預告）才宣告；這回合星樞還沒用招、沒有還沒發動的預告（新的不蓋舊的）、靈力夠。照 td.esk 順序挑第一個條件成立的。at＝第幾回合結束發動（下一回合）
     卒將號令：有入侵卒在你的半場當號令卒。隔山星砲：有一門砲現在能合法隔一子吃到你的子（帥除外），挑棋種最大的目標；鎖定砲、砲架、目標三顆子 ID */
  const DECL={zjhl:(P,C)=>{const td=P.td;for(const q in td.ids){const id=td.ids[q];if(tagOf(td,id)==="inv"&&redHalf(+q))return{src:id}}return null},
    pao:(P,C)=>{const td=P.td,b=P.board;let o=null,ov=-1;for(const[f,t]of banMoves(td,b,L_(b,"b",C),true)){if(b[f]!=="c"||!b[t]||sd(b[t])!=="r"||b[t]==="K")continue;const s=scrOf(b,f,t),v=CAPB[up(b[t])];
      if(s!=null&&v>ov){ov=v;o={src:td.ids[f],scr:td.ids[s],tg:td.ids[t]}}}return o&&o.src&&o.scr&&o.tg?o:null},
    /* 長驅直入（第二章）：有一顆還沒過河、沒被定身的車，從它到你的底線整條直路是空的；挑最靠近河的（一樣近取右邊）。鎖定車的 ID 和當時的格 sq0（不換車、不換路）。
       已經過河的車不算（沉到你底線的車前面沒有格子，那就擋不了） */
    cqzr:(P,C)=>{const td=P.td,b=P.board;for(let q=44;q>=0;q--)if(b[q]==="r"&&td.ids[q]&&!frozen(td,td.ids[q])&&laneOpen(b,q))return{src:td.ids[q],sq0:q};return null},
    /* 斷路令（第二章）：你有一顆俥在敵方半場；挑最深入的（一樣深取左邊）。鎖定那顆俥的 ID */
    dll:(P,C)=>{const td=P.td,b=P.board;for(let q=0;q<45;q++)if(b[q]==="R"&&td.ids[q])return{src:td.ids[q]};return null}};
  const frozen=(td,id)=>td.ctl.frz.some(o=>o.id===id&&o.until>td.rnd);
  /* 車 q 到紅方底線（含底線那一格）整條直路都是空的 */
  function laneOpen(b,q){for(let r=RW(q)+1;r<10;r++)if(b[r*9+CL(q)])return false;return true}
  function foeDeclare(P,C,R){const td=P.td,E=td.en;if(td.efx===R||td.fx)return;
    for(const k of td.esk){if(!DECL[k]||!eOk(td,k))continue;const o=DECL[k](P,C);if(!o)continue;
      E.sp-=ESK[k].cost;td.ecd[k]=ESK[k].cd;td.ecdAt=Object.assign({},td.ecdAt,{[k]:td.rnd});td.fx=Object.assign({id:k},o,{at:td.rnd+1,base:ESK[k].base});td.efx=R;
      ev(td,{k:"esk",id:k,sq:sqOfId(td,o.src),at:td.rnd+1});return}}
  /* 砲 f 跟目標 t 同一條線、中間剛好一子：回那一子的格，否則 null */
  function scrOf(b,f,t){if(RW(f)!==RW(t)&&CL(f)!==CL(t))return null;const dr=Math.sign(RW(t)-RW(f)),dc=Math.sign(CL(t)-CL(f));let r=RW(f)+dr,c=CL(f)+dc,s=null,n=0;
    while(r*9+c!==t){if(b[r*9+c]){n++;s=r*9+c}r+=dr;c+=dc}return n===1?s:null}
  /* 預告的大招這次結算會不會打：回打到的格（跳字位置），取消回 null。卒將號令＝號令卒還在你的半場；隔山星砲＝砲、砲架、目標都在、中間只隔這個砲架、砲還能合法吃到目標（沒被定身／迷煙）。C 沒給（畫面舊呼叫）就只看幾何 */
  function fxSq(td,b,C){const F=td.fx;if(!F)return null;const sq=sqOfId(td,F.src);if(sq==null)return null;
    if(F.id==="zjhl")return redHalf(sq)?sq:null;
    if(F.id==="pao"){const s=sqOfId(td,F.scr),t=sqOfId(td,F.tg);if(s==null||t==null||b[sq]!=="c"||!b[t]||sd(b[t])!=="r"||scrOf(b,sq,t)!==s)return null;
      if(C&&!banMoves(td,b,L_(b,"b",C),true).some(([f,x])=>f===sq&&x===t))return null;return t}
    /* 長驅直入＝車還在預告時那一格、沒被定身、直路還是一路空到你的底線（回底線那一格）；斷路令＝那顆俥還在敵方半場（回俥的格） */
    if(F.id==="cqzr")return sq===F.sq0&&b[sq]==="r"&&!frozen(td,F.src)&&laneOpen(b,sq)?81+CL(sq):null;
    if(F.id==="dll")return b[sq]==="R"&&!redHalf(sq)?sq:null;
    return null}
  /* 入侵：這次結算會扣的（已預告、還在我方半場）；pre＝不改狀態，只看（畫面「本輪若不處理」、AI 都用這個） */
  function invHits(td){const H=[];for(const q in td.ids){const id=td.ids[q],sq=+q;if(tagOf(td,id)!=="inv"||!redHalf(sq))continue;if(td.arm[id])H.push({id,sq,base:inPal(sq,"r")?INV_PAL:INV})}
    H.sort((a,b)=>b.base-a.base);return H.slice(0,INV_MAX)}
  /* ===== 回合結算（提案一 4.2 第 5 步：星核傷害、護盾、入侵、靈力，再處理預告過的星門）===== */
  function settle(P,C){const td=P.td,R=td.rnd,b=P.board,M=td.me,E=td.en,hp0=[M.hp,E.hp];
    /* 1. 入侵 */
    for(const h of invHits(td)){const e=queue(td,"r",h.base,"inv",{sq:h.sq});const Q=td.buf.qyhp;if(Q&&Q.until>R&&Q.left>0){const c=Math.min(Q.left,e.raw);Q.left-=c;e.raw-=c;e.cut=c;e.cutWhy="青玉護棚"}}
    for(const q in td.ids){const id=td.ids[q],sq=+q;if(tagOf(td,id)!=="inv")continue;if(redHalf(sq)){if(!td.arm[id]){td.arm[id]=1;ev(td,{k:"warn",sq,raw:dmg(inPal(sq,"r")?INV_PAL:INV,E.atk,defOf(td,"r"))})}}else delete td.arm[id]}
    for(const id in td.arm)if(sqOfId(td,id)==null)delete td.arm[id];
    /* 2. 星樞預告的大招 */
    if(td.fx&&td.fx.at===R+1){const F=td.fx,sq=fxSq(td,b,C);if(sq!=null){const e=queue(td,"r",F.base,"esk",{id:F.id,sq});if(td.tl)td.tl.n++;ev(td,{k:"eskHit",id:F.id,raw:e.raw})}else ev(td,{k:"eskOff",id:F.id});td.fx=null}
    /* 3. 一批套盾、扣 HP */
    const tot={r:0,b:0};for(const e of td.q){const T=e.to==="r"?M:E,A=absorb(T.sh,e.raw);T.sh.v-=A.abs;T.hp-=A.loss;tot[e.to]+=A.loss;if(e.to==="r"){M.taken+=A.loss;E.dealt+=A.loss;if(td.tl&&e.why==="inv")td.tl.inv+=A.loss}else{E.taken+=A.loss;M.dealt+=A.loss}
      ev(td,Object.assign({k:"hit",to:e.to,why:e.why,raw:e.raw,abs:A.abs,loss:A.loss,vp:e.vp,cp:e.cp,cut:e.cut||0,cutWhy:e.cutWhy||"",sq:e.sq},e.why==="esk"?{id:e.id}:{}))}
    td.q=[];M.lastLoss=tot.r;
    /* 九宮守心：帥在九宮正中心就回 4 */
    const H5=td.buf.shen5;if(H5&&H5.n>0){if(b[76]==="K"){H5.n--;heal(td,4,"九宮守心")}else delete td.buf.shen5}
    /* 4. 星核同一批結算 */
    let end=null;const a=M.hp<=0,z=E.hp<=0;
    if(a&&z)end={w:null,why:"雙方星核同一批結算同時歸零，判和"};else if(z)end={w:"r",why:"星樞星核歸零"};else if(a)end={w:"b",why:"我方星核歸零"};
    /* 5. 星門（先落子、延遲、取消） */
    let spawned=0;if(!end)spawned=gates(P,C);
    /* 序章的過關條件（LV.win）：星門落完子再看。clr＝那種黑子吃光、星門也沒有還沒落的；wv＝援軍都落下（或被截掉）、盤上沒有入侵卒 */
    if(!end&&td.win){const W=td.win,left=k=>(td.waves||[]).some(w=>w.st==="wait"&&(!k||w.p===k));
      if(W.clr&&!b.includes(W.clr)&&!left(W.clr))end={w:"r",why:"卒全部清光，過關"};
      else if(W.wv&&!left()&&!Object.keys(td.ids).some(q=>tagOf(td,td.ids[q])==="inv"))end={w:"r",why:"援軍都擋下來、入侵卒清光，過關"}}
    /* 6. 靈力：每完整回合回復（受每回合收入上限）。td.pool＝黑洞車輪戰（07bhw-wheel.js）共用靈力池：我方不在這裡回、收入上限也不在這裡歸零，改由車輪戰的總輪處理 */
    if(!end){if(!td.pool)spGain(M,RG);spGain(E,RG)}
    /* 7. 無進展 */
    const prog=td.np<0||hp0[0]!==M.hp||hp0[1]!==E.hp||spawned>0;td.np=prog?0:td.np+1;
    if(!end&&td.np>=(td.noprog||NOPROG))end={w:null,why:`連續 ${td.noprog||NOPROG} 回合沒有進展，依星門圍城規則判和`};
    /* 8. 冷卻（放招那回合不減）、到期 */
    for(const k in td.cd)if(td.cd[k]>0&&td.cdAt[k]!==R)td.cd[k]--;
    for(const k in td.ecd)if(td.ecd[k]>0&&!(td.ecdAt&&td.ecdAt[k]===R))td.ecd[k]--;
    td.rnd=R+1;if(!td.pool)M.inc=0;E.inc=0;td.fc=null;
    for(const c of[M,E])if(c.sh.v>0&&td.rnd>=c.sh.exp)c.sh={v:0,exp:0};
    const C2=td.ctl;C2.frz=active(C2.frz,td.rnd);C2.noCap=active(C2.noCap,td.rnd);C2.noTake=active(C2.noTake,td.rnd);C2.lock=active(C2.lock,td.rnd);if(C2.trap&&C2.trap.until<=td.rnd)C2.trap=null;
    for(const k of["qi3","qyhp","pair","bu3","disc","net2"]){const o=td.buf[k];if(o&&o.until!=null&&o.until<=td.rnd)delete td.buf[k]}
    /* 分段（第 5 關）：星樞 HP 降到門檻只解鎖下一招（不加兵、不當下打；還沒發動的預告照舊，不被蓋掉） */
    const PH=td.phs||[];if(!end)while((td.phn||0)<PH.length&&E.hp<=E.max*PH[td.phn||0].hp){const o=PH[td.phn||0];td.phn=(td.phn||0)+1;if(!td.esk.includes(o.esk))td.esk.push(o.esk);ev(td,{k:"phase",n:td.phn+1,id:o.esk})}
    if(!end)foeDeclare(P,C,R);
    td.log.push({r:td.rnd,me:M.hp,en:E.hp,msp:M.sp,esp:E.sp,msh:M.sh.v,esh:E.sh.v});if(td.log.length>80)td.log.shift();
    if(end){td.over=end;ev(td,{k:"end",w:end.w,why:end.why});return{end}}return null}
  /* 星門：at＝這回合結束落下的援軍。門格有子＝延遲一次；延遲後又擋住＝取消（紅子擋住才算截援：星樞扣靈力，首次截援回 6 靈）。其他不合法（會落出將軍等）照同一套延遲／取消 */
  function gates(P,C){const td=P.td,R1=td.rnd+1;let n=0;
    for(const w of td.waves){if(w.st!=="wait"||w.at!==R1)continue;const why=spawnOk(P.board,w.p,w.sq,C),blockR=P.board[w.sq]&&sd(P.board[w.sq])==="r";
      if(!why){edit(P,C,{[w.sq]:w.p});const id="b"+(Object.keys(td.meta).filter(k=>k[0]==="b").length+1);td.ids[w.sq]=id;td.meta[id]={p:w.p,home:w.sq,tag:w.tag};w.st="in";n++;ev(td,{k:"spawn",sq:w.sq,p:w.p,tag:w.tag,wid:w.id});continue}
      if(!w.dl){w.dl=1;w.at=R1+1;ev(td,{k:"delay",sq:w.sq,p:w.p,why,wid:w.id});continue}
      w.st="cut";if(blockR){td.icpt++;const d=Math.min(ICPT_DRAIN,td.en.sp);td.en.sp-=d;let g=0;if(td.icpt===1)g=spGain(td.me,ICPT_GAIN);ev(td,{k:"icpt",sq:w.sq,p:w.p,drain:d,gain:g,wid:w.id})}else ev(td,{k:"cancel",sq:w.sq,p:w.p,why,wid:w.id})}
    return n}
  /* 預告：下兩批援軍（同一個落下回合算一批），開局就看得到前兩波 */
  function fore(td){const W=td.waves.filter(w=>w.st==="wait").sort((a,b)=>a.at-b.at),ats=[...new Set(W.map(w=>w.at))].slice(0,2);
    return ats.map(at=>({at,inR:at-td.rnd,ws:W.filter(w=>w.at===at)}))}
  const gateNm=sq=>{const c=CL(sq);return c<=2?"左門":c>=6?"右門":"中門"};
  /* 畫面「本輪若不處理」：已預告的入侵、已預告的大招（不含可能擒子），套目前的盾與減傷額度——跟結算同一個 dmg／absorb */
  function preview(td,b,C){const M=td.me,E=td.en,L=[];for(const h of invHits(td)){let raw=dmg(h.base,E.atk,defOf(td,"r"));const Q=td.buf.qyhp;if(Q&&Q.until>td.rnd)raw=Math.max(0,raw-Q.left);L.push({k:"inv",sq:h.sq,raw})}
    if(td.fx&&td.fx.at===td.rnd+1){const sq=fxSq(td,b,C);if(sq!=null)L.push({k:"esk",id:td.fx.id,sq,raw:dmg(td.fx.base,E.atk,defOf(td,"r"))})}
    const raw=L.reduce((a,x)=>a+x.raw,0),A=absorb(M.sh,raw);return{L,raw,abs:A.abs,loss:A.loss}}
  /* 可能擒子（星樞下一步能吃的己子；會隨你的走法改變，畫面另欄標「可能」） */
  function threats(b,C){const o=[];for(const[f,t]of L_(b,"b",C))if(b[t]&&sd(b[t])==="r"&&!o.includes(t))o.push(t);return o}
  /* ===== 招式：可不可以放（why 回空字串＝可以）、目標、效果 ===== */
  const isMine=(P)=>P.turn===(P.human||"r");
  function costOf(td,id){const S=SKM[id];if(!S)return 0;if(id==="dep")return DEP_COST;let c=S.cost;const D=td.buf.disc;if(D&&D.until>td.rnd&&c>0&&id!=="bu5")c=Math.max(10,c-15);return c}
  const cannonHits=(b,two)=>{const o=[];for(let s=0;s<90;s++){if(b[s]!=="C")continue;for(const[dr,dc]of[[1,0],[-1,0],[0,1],[0,-1]]){let r=RW(s)+dr,c=CL(s)+dc,k=0,scr=null;
    while(r>=0&&r<10&&c>=0&&c<9){const q=r*9+c;if(b[q]){k++;if(k===1)scr=q;else{if(sd(b[q])==="b"&&b[q]!=="k"&&(k===2||(two&&k===3)))o.push({c:s,t:q,scr,k});if(k>=(two?3:2))break}}r+=dr;c+=dc}}}return o};
  const NL=[[-2,-1,-1,0],[-2,1,-1,0],[2,-1,1,0],[2,1,1,0],[-1,-2,0,-1],[1,-2,0,-1],[-1,2,0,1],[1,2,0,1]];
  const horseHits=b=>{const o=[];for(let s=0;s<90;s++){if(b[s]!=="N")continue;for(const[dr,dc,lr,lc]of NL){const r=RW(s)+dr,c=CL(s)+dc,lq=(RW(s)+lr)*9+CL(s)+lc;if(r<0||r>9||c<0||c>8||b[lq])continue;const q=r*9+c;if(b[q]&&sd(b[q])==="b"&&b[q]!=="k")o.push({n:s,t:q})}}return o};
  function legBlocked(b,s){const o=[];for(const[dr,dc,lr,lc]of NL){const r=RW(s)+dr,c=CL(s)+dc;if(r<0||r>9||c<0||c>8)continue;const lq=(RW(s)+lr)*9+CL(s)+lc;if(b[lq]&&sd(b[lq])==="r"&&!o.includes(lq))o.push(lq)}return o}
  function legSpot(b,from,C){const r0=RW(from),c0=CL(from),p=b[from],L=[];for(let q=45;q<90;q++){if(b[q]||RW(q)<r0||(RW(q)===r0&&q===from))continue;if(RW(q)===r0||CL(q)===c0||RW(q)>r0){if(!canStand(p,q))continue;L.push(q)}}
    L.sort((a,b2)=>(Math.abs(RW(a)-r0)+Math.abs(CL(a)-c0))-(Math.abs(RW(b2)-r0)+Math.abs(CL(b2)-c0))||a-b2);for(const q of L){const x=b.slice();x[q]=p;x[from]=null;if(okMagic(x,C))return q}return null}
  const marks=(td,b)=>{const L=cannonHits(b,false).map(x=>x.t);if(td.buf.net2&&td.buf.net2.until>td.rnd)for(const x of cannonHits(b,true))if(x.k===3)L.push(x.t);return[...new Set(L)]};
  const capturers=(b,sq,C)=>{const s=new Set();for(const[f,t]of L_(b,"r",C))if(t===sq)s.add(f);return s};
  function guardedBy(b,sq,C){if(!b[sq]||sd(b[sq])!=="r"||b[sq]==="K")return false;const x=b.slice();x[sq]="p";for(const[f,t]of L_(x,"r",C))if(t===sq&&(x[f]==="A"||x[f]==="B"))return true;return false}
  /* 控制效果不能排空星樞的合法步（提案一第十節）：模擬加上這個控制後，星樞現在的盤面還有沒有步 */
  function foeMovesLeft(td,b,C,add){const ctl=JSON.parse(JSON.stringify(td.ctl));if(add)add(ctl);return banMoves({ctl,ids:td.ids,rnd:td.rnd},b,L_(b,"b",C),true).length>0}
  function targets(P,id,pk,C){const td=P.td,b=P.board,S=SKM[id]||{},step=(S.tg||[])[pk.length];pk=pk||[];
    if(id==="dep"){if(!pk.length)return[];return td.dp.filter(d=>d.al.includes(pk[0])&&depOk(P,pk[0],d.sq,C)==="").map(d=>d.sq)}
    switch(step){
      case"foe":return foe(b,(p,q)=>!(id==="lei1"&&(td.ctl.imm[td.ids[q]]||0)>td.rnd)&&foeMovesLeft(td,b,C,c=>{if(id==="lei1")c.frz.push({id:td.ids[q],until:td.rnd+1})}));
      case"foePAB":return foe(b,p=>"pab".includes(p)).filter(q=>{const x=b.slice();x[q]=null;return okMagic(x,C)});
      case"foeHalf":return foe(b,(p,q)=>redHalf(q)).filter(q=>foeMovesLeft(td,b,C,c=>c.noCap.push({id:td.ids[q],until:td.rnd+2})));
      case"foeCan":return[...new Set(cannonHits(b,false).map(x=>x.t))];
      case"foeHorse":return[...new Set(horseHits(b).map(x=>x.t))];
      case"focus":return foe(b).filter(q=>capturers(b,q,C).size>=2);
      case"own":return own(b,p=>p!=="K"||id==="bu1");
      case"own2":return own(b).filter(q=>q!==pk[0]&&canStand(b[pk[0]],q)&&canStand(b[q],pk[0])&&(()=>{const x=b.slice();x[q]=b[pk[0]];x[pk[0]]=b[q];return okMagic(x,C)})());
      case"ownNK":return own(b,p=>p!=="K").filter(q=>foeMovesLeft(td,b,C,c=>c.noTake.push({id:td.ids[q],until:td.rnd+1})));
      case"diag":return own(b).filter(q=>q!==pk[0]&&Math.abs(RW(q)-RW(pk[0]))===1&&Math.abs(CL(q)-CL(pk[0]))===1);
      case"ownR":return own(b,p=>p==="R");
      case"ownBig":return own(b,p=>"RCN".includes(p)).filter(q=>targets(P,id,[q],C).length>0);
      case"back":{const o=[];for(let q=81;q<90;q++){if(b[q])continue;const x=b.slice();x[q]=b[pk[0]];x[pk[0]]=null;if(okMagic(x,C))o.push(q)}return o}
      case"line":{const r=pk[0],row=lineFoes(b,r,"row"),col=lineFoes(b,r,"col"),o=[];if(row.length)o.push({v:"row",l:`橫線（${row.length} 顆）`});if(col.length)o.push({v:"col",l:`直線（${col.length} 顆）`});return o}
      case"lost":return td.lost.filter(x=>!b[x.home]&&canStand(x.p,x.home)&&(()=>{const y=b.slice();y[x.home]=x.p;return okMagic(y,C)})()).map(x=>x.home);
      case"ownLeg":return own(b,p=>p==="N").filter(q=>legBlocked(b,q).some(l=>legSpot(b,l,C)!=null));
      case"guarded":return own(b).filter(q=>guardedBy(b,q,C));}
    return[]}
  function lineFoes(b,r,dir){const o=[];for(let q=0;q<90;q++){if(!b[q]||sd(b[q])!=="b"||b[q]==="k"||q===r)continue;if(dir==="row"?RW(q)===RW(r):CL(q)===CL(r))o.push(q)}
    return o.sort((a,c)=>Math.abs(a-r)-Math.abs(c-r)).slice(0,3)}
  /* 招式能不能放（回空字串＝可以）；部署另外看 depOk */
  function why(P,id,C){const td=P.td,b=P.board,S=SKM[id];if(!td||td.mode!==MODE)return"這盤不是星門圍城";if(td.over||P.result)return"這局已經結束";if(!isMine(P))return"還沒輪到你";
    if(id==="dep"){if(td.dep>=DEP_MAX)return`每局最多部署 ${DEP_MAX} 次`;if(!td.res.length)return"後備已經用完";if(td.me.sp<DEP_COST)return`靈力不夠（要 ${DEP_COST}）`;
      if(!td.res.some(p=>td.dp.some(d=>d.al.includes(p)&&depOk(P,p,d.sq,C)==="")))return"補給點都不能用（有子擋住或落下會不合法）";return""}
    if(!S)return"沒有這一招";if(!S.gen&&!td.sk.includes(id))return"這場沒帶這一招";
    if(S.info)return"";
    if(td.sk1===td.rnd)return"這回合已經用過一招（每回合最多一招）";
    if((td.cd[id]||0)>0)return`冷卻中（還要 ${td.cd[id]} 回合）`;
    if(S.once&&td.used[id])return"每局只能用一次";if(S.max&&(td.used[id]||0)>=S.max)return`每局最多 ${S.max} 次`;
    const c=costOf(td,id);if(td.me.sp<c)return`靈力不夠（要 ${c}）`;
    const M=td.me,lr=td.last.r,heals={shen1:15,shen2:8,shen4:12,tian4:10,luo4:6,gheal:16};
    if(heals[id]!=null&&M.healMax-M.heal<=0)return"這局的回復總量已經用完（上限最大 HP 的 40%）";
    if(heals[id]!=null&&M.hp>=M.max&&id!=="luo4")return"星核是滿的";
    switch(id){
      case"shen3":return"這一批星樞沒有控制招，沒有可以解除的";
      case"bu4":return"這一批星樞沒有虛空鎖，放了沒有效果";
      case"shen5":return b[76]==="K"?"":"帥要站在九宮正中心";
      case"tie4":return adv(b)?"":"帥的斜角旁邊沒有己方仕";
      case"tie5":if(M.lastLoss<4)return"上一回合結算沒被扣到 4 HP";return spLeft(M)>0?"":"這回合靈力收入已滿，放了回 0";
      case"bu2":if(!(lr&&lr.fwd))return"上一步不是兵往前走";return spLeft(M)>0?"":"這回合靈力收入已滿，放了回 0";
      case"qi2":return qi2Base(td,b,C)?"":"上一步要是俥走、而且那顆俥現在能合法擒子";
      case"tian4":return lr&&lr.cap?"上一步擒了子，靜不下來喝茶":"";
      case"luo3":return lr&&lr.p==="N"?"":"上一步不是傌走的";
      case"lei3":return marks(td,b).length?"":"沒有破甲標記的敵子";
      case"tie2":return trapSqs(b).length?"":"仕的斜角旁邊沒有空點";}
    if(S.tg&&!targets(P,id,[],C).length)return"沒有合適的目標";return""}
  const adv=b=>{const k=b.indexOf("K");if(k<0)return 0;let n=0;for(const[dr,dc]of[[1,1],[1,-1],[-1,1],[-1,-1]]){const r=RW(k)+dr,c=CL(k)+dc;if(r>=0&&r<10&&c>=0&&c<9&&b[r*9+c]==="A")n++}return Math.min(2,n)};
  function trapSqs(b){const o=[];for(let s=0;s<90;s++){if(b[s]!=="A")continue;for(const[dr,dc]of[[1,1],[1,-1],[-1,1],[-1,-1]]){const r=RW(s)+dr,c=CL(s)+dc;if(r<0||r>9||c<0||c>8)continue;const q=r*9+c;if(!b[q]&&!o.includes(q))o.push(q)}}return o}
  function qi2Base(td,b,C){const lr=td.last.r;if(!lr||lr.p!=="R"||!lr.id||td.ids[lr.t]!==lr.id||b[lr.t]!=="R")return 0;if(!L_(b,"r",C).some(([f,t])=>f===lr.t&&b[t]&&sd(b[t])==="b"))return 0;return Math.min(10,2*lr.dist)}
  function depOk(P,p,sq,C){const td=P.td,b=P.board;if(!td.res.includes(p))return"後備沒有這種子";const d=td.dp.find(x=>x.sq===sq);if(!d||!d.al.includes(p))return"這個補給點不收這種子";if(b[sq])return"補給點有子";
    if(!canStand(p,sq))return"這種子站不上這格";const x=b.slice();x[sq]=p;if(facing(x))return"會將帥照面";if(ck_(x,"r",C))return"部署完還被將（主要行動要解將）";if(ck_(x,"b",C))return"部署不能直接將軍";if(!L_(x,"b",C).length)return"部署完星樞無步可走";return""}
  /* 放招（local.js /play/td）：b={k:招,tg:[格…],p:部署棋種}；回傳 {err} 或 {ok,pass}（pass＝部署用掉主要行動，換星樞走） */
  function cast(P,o,C){const td=P.td,id=o&&o.k,S=SKM[id]||{},tg=(o&&o.tg||[]).map(x=>typeof x==="string"&&/^[0-9]+$/.test(x)?+x:x);const w=why(P,id,C);if(w)return{err:w};const R=td.rnd,b=P.board,M=td.me;
    if(id==="dep"){const p=String(o.p||"").toUpperCase(),sq=+tg[0],e=depOk(P,p,sq,C);if(e)return{err:e};M.sp-=DEP_COST;td.dep++;td.res.splice(td.res.indexOf(p),1);
      edit(P,C,{[sq]:p},true);const nid="r"+(Object.keys(td.meta).filter(k=>k[0]==="r").length+1);td.ids[sq]=nid;td.meta[nid]={p,home:sq,tag:""};td.np=-1;td.last.r={id:nid,p,f:sq,t:sq,dist:0,cap:false,fwd:false,dep:1};
      ev(td,{k:"dep",p,sq,cost:DEP_COST});return{ok:1,pass:1}}
    if(S.info)return{ok:1,info:1};
    if(S.tg){const need=S.tg.length;if(tg.length<need)return{err:"還沒選好目標"};for(let i=0;i<need;i++){const T=targets(P,id,tg.slice(0,i),C),v=tg[i];if(!T.some(x=>(typeof x==="object"?x.v:x)===v))return{err:"這個目標不行"}}}
    const c=costOf(td,id);const run=RUN[id];if(!run)return{err:"這一招還沒做"};const a0=M.atk;if(td.sq&&CH[S.ch])M.atk=atkR(td,CH[S.ch].pc);let r;try{r=run({P,td,b,C,R,M,E:td.en},tg)}finally{M.atk=a0}   /* 11/16 全隊招式：招式傷害看放招那位的攻擊 */if(r&&r.err)return r;
    M.sp-=c;if(td.buf.disc&&c>0&&id!=="bu5"&&td.buf.disc.until>R)delete td.buf.disc;td.cd[id]=S.cd;td.cdAt[id]=R;td.sk1=R;td.used[id]=(td.used[id]||0)+1;
    ev(td,Object.assign({k:"skill",id,nm:S.nm,cost:c,tg,ch:S.ch},r||{}));return{ok:1}}
  const RUN={
    shen1:X=>({n:heal(X.td,15,"重金懸賞")}),shen2:X=>({n:heal(X.td,X.td.last.b&&X.td.last.b.ck?12:8,"庭院小息")}),
    shen4:X=>({n:heal(X.td,X.M.hp*2<X.M.max?17:12,"當票回春")}),shen5:X=>{X.td.buf.shen5={n:3};return{}},
    tie1:X=>({sh:shAdd(X.M,20,X.R)}),tie2:X=>{X.td.ctl.trap={sqs:trapSqs(X.b),until:X.R+2};return{sqs:X.td.ctl.trap.sqs}},
    tie3:(X,tg)=>{X.td.ctl.lock.push({id:X.td.ids[tg[0]],until:X.R+1});return{}},
    tie4:X=>({sh:shAdd(X.M,12*adv(X.b),X.R)}),tie5:X=>({sp:spGain(X.M,6)}),
    bu1:(X,tg)=>{const[a,c]=tg,pa=X.b[a],pc=X.b[c],ia=X.td.ids[a],ic=X.td.ids[c];edit(X.P,X.C,{[a]:pc,[c]:pa});X.td.ids[a]=ic;X.td.ids[c]=ia;return{}},
    bu2:X=>({sp:spGain(X.M,6)}),bu3:X=>{X.td.buf.bu3={n:3,until:X.R+3};return{}},
    bu5:X=>{X.td.buf.disc={until:X.R+2};return{}},
    qi1:(X,tg)=>{const q=tg[0],id=X.td.ids[q],t=tagOf(X.td,id);edit(X.P,X.C,{[q]:null});delete X.td.ids[q];delete X.td.arm[id];X.td.np=-1;if(t==="guard")ev(X.td,{k:"guard",sq:q,def:defOf(X.td,"b")});return{rm:q,tag:t}},
    qi2:X=>{const base=qi2Base(X.td,X.b,X.C);const e=queue(X.td,"b",base,"skill",{id:"qi2"});return{raw:e.raw}},
    qi3:(X,tg)=>{X.td.buf.qi3={id:X.td.ids[tg[0]],until:X.R+2};return{}},
    qi5:(X,tg)=>{const L=lineFoes(X.b,tg[0],tg[1]);const e=queue(X.td,"b",6*L.length,"skill",{id:"qi5"});return{raw:e.raw,hit:L}},
    tian1:(X,tg)=>{const[a,q]=tg,p=X.b[a],id=X.td.ids[a];edit(X.P,X.C,{[a]:null,[q]:p});delete X.td.ids[a];if(id)X.td.ids[q]=id;return{}},
    tian2:X=>{X.td.buf.qyhp={left:18,until:X.R+2};return{}},
    tian3:(X,tg)=>{X.td.ctl.noCap.push({id:X.td.ids[tg[0]],until:X.R+2});return{}},
    tian4:X=>({n:heal(X.td,10,"渡口清茶")}),
    tian5:(X,tg)=>{X.td.buf.pair={a:X.td.ids[tg[0]],b:X.td.ids[tg[1]],until:X.R+2,armed:null};return{}},
    lei1:(X,tg)=>{const id=X.td.ids[tg[0]];X.td.ctl.frz.push({id,until:X.R+1});X.td.ctl.imm[id]=X.R+3;return{}},
    lei2:(X,tg)=>{const h=cannonHits(X.b,false).find(x=>x.t===tg[0]);const base=8+(h&&sd(X.b[h.scr])==="b"?4:0);const e=queue(X.td,"b",base,"skill",{id:"lei2"});return{raw:e.raw}},
    lei3:X=>{const L=marks(X.td,X.b).sort((a,c)=>(CAPB[up(X.b[c])]||0)-(CAPB[up(X.b[a])]||0)).slice(0,3);const e=queue(X.td,"b",6*L.length,"skill",{id:"lei3"});return{raw:e.raw,hit:L}},
    lei4:X=>{X.td.buf.net2={until:X.R+2};return{}},
    lei5:(X,tg)=>{X.td.ctl.noTake.push({id:X.td.ids[tg[0]],until:X.R+1});return{}},
    luo1:(X,tg)=>{const q=tg[0],i=X.td.lost.findIndex(x=>x.home===q),L=X.td.lost[i];edit(X.P,X.C,{[q]:L.p});X.td.ids[q]=L.id;X.td.lost.splice(i,1);if(X.td.buf.luo4){delete X.td.buf.luo4;heal(X.td,10,"驛鈴回氣")}return{rev:q}},
    luo2:X=>{const e=queue(X.td,"b",10,"skill",{id:"luo2"});return{raw:e.raw}},
    luo3:X=>({sh:shAdd(X.M,20,X.R)}),luo4:X=>{const n=heal(X.td,6,"驛鈴回氣");X.td.buf.luo4=1;return{n}},
    luo5:(X,tg)=>{const n=tg[0],l=legBlocked(X.b,n).find(q=>legSpot(X.b,q,X.C)!=null),to=legSpot(X.b,l,X.C),p=X.b[l],id=X.td.ids[l];edit(X.P,X.C,{[l]:null,[to]:p});delete X.td.ids[l];if(id)X.td.ids[to]=id;return{mv:[l,to]}},
    gfocus:(X,tg)=>{X.td.fc={sq:tg[0],r:X.R};return{}},gguard:X=>({sh:shAdd(X.M,20,X.R)}),gheal:X=>({n:heal(X.td,16,"緊急回復")})};
  /* 星樞這一步不能走的：定身的子、迷煙裡的子吃子、吃煙幕裡的子。一層一層濾；strict＝濾完沒步就回空（施放檢查用），否則那一層不濾 */
  function banMoves(td,b,A,strict){const R=td.rnd,at=L=>new Set((L||[]).filter(o=>o.until>R).map(o=>{for(const k in td.ids)if(td.ids[k]===o.id)return +k;return null}).filter(x=>x!=null));
    const fz=at(td.ctl.frz),nc=at(td.ctl.noCap),nt=at(td.ctl.noTake);let L=A;
    for(const ok of[([f])=>!fz.has(f),([f,t])=>!(nc.has(f)&&b[t]),([,t])=>!nt.has(t)]){const L2=L.filter(ok);if(L2.length||strict)L=L2}return L}
  /* ===== 星樞選步（提案一第十一節、提案二第 7 節第一階段）：Pikafish 候選＋全部合法步的一步塔防評估，每個候選照真正規則模擬完整回合 =====
     分層：立即勝負 → 能不能閃掉下一回合致命（你一步將死它、或你一步的擒子＋將軍打空它的星核）→ 這一批星核損益＋入侵威脅 → 象棋評分。W＝1 HP 折幾厘兵（暫定 30，待實打調） */
  const W_HP=30,ENG_CLAMP=1500;
  const uSq=(u,i)=>(9-(+u[i+1]))*9+(u.charCodeAt(i)-97);
  const clone=o=>JSON.parse(JSON.stringify(o));
  function engine(P,C){const td=P.td;let sm=null;const A=L_(P.board,P.turn,C),L=banMoves(td,P.board,A);if(L.length&&L.length<A.length)sm=L.map(([f,t])=>C.iccs(f,t));
    return{gsv:1,depth:td.depth||2,mpv:8,err:0,margin:0,sm,b:P.board.slice(),td:clone(td),C,turn:P.turn,rep:td.arep?repCnt(P):null}}
  /* 第二章起（關卡資料 arep:1）：星樞不靠將軍把同一個局面走出第三次（長將判負是它自己輸掉）。rep＝這盤每個局面到現在出現過幾次（P.pos）。第 1～6 關看 AREP1（11/15 開發者決定開）、困難版一律開；車輪戰的盤沒開，選步照舊 */
  function repCnt(P){const o={};for(const f of P.pos||[])o[f]=(o[f]||0)+1;return o}
  function simB(cfg,f,t){const C=cfg.C,P2={board:cfg.b.slice(),turn:"b",td:clone(cfg.td),moves:[],pos:[C.fen(cfg.b,"b")],ed:[],human:"r"};const m=C.stateApply(P2,f,t),r=move(P2,m,C);return{P2,m,end:r&&r.end}}
  /* 下一回合紅方一步能不能讓星樞輸（將死、或擒子＋將軍的一批傷害打空星核）；只看紅方一步，不看紅方的招 */
  function lethalR(P2,C){const b=P2.board,td=P2.td,E=td.en,room=E.hp+E.sh.v;let mate=false,core=false;
    for(const[f,t]of L_(b,"r",C)){const x=C.make(b,f,t),ck=ck_(x,"b",C);let raw=0;if(b[t])raw+=dmg(CAPB[up(b[t])],atkR(td,up(b[f])),defOf(td,"b"));if(ck&&td.rnd-E.lastChk>=CHK_GAP)raw+=dmg(CHK,atkR(td,up(b[f])),defOf(td,"b"));
      if(raw>=room)core=true;if(ck&&!L_(x,"b",C).length){mate=true;break}}return{mate,core}}
  function scoreB(cfg,f,t,v){const C=cfg.C,S=simB(cfg,f,t),td=S.P2.td,M0=cfg.td.me,E0=cfg.td.en;
    if(S.end){if(S.end.w==="b")return 1e7;if(S.end.w==="r")return-1e7;return-2e5}
    if(!L_(S.P2.board,"r",C).length)return 1e7;
    const dR=(M0.hp+M0.sh.v)-(td.me.hp+td.me.sh.v),dB=(E0.hp+E0.sh.v)-(td.en.hp+td.en.sh.v);
    let s=W_HP*(dR-dB)+Math.max(-ENG_CLAMP,Math.min(ENG_CLAMP,v));
    for(const h of invHits(td))s+=W_HP*.7*dmg(h.base,td.en.atk,defOf(td,"r"));
    /* 第二章：自己預告的大招（ESK 有 keep 的，目前只有長驅直入）走完這步條件還成立，算進威脅（星樞才會留著車等它發動）；將軍走出重複局面：第二次扣分、第三次當成快輸（只有 cfg.rep 有給才看） */
    const F=td.fx;if(F&&ESK[F.id]&&ESK[F.id].keep&&fxSq(td,S.P2.board,C)!=null)s+=W_HP*ESK[F.id].keep*dmg(F.base,td.en.atk,defOf(td,"r"));
    if(cfg.rep&&S.m.ck){const n=cfg.rep[S.P2.pos[S.P2.pos.length-1]]||0;if(n>=2)s-=4.5e6;else if(n===1)s-=W_HP*20}
    const L=lethalR(S.P2,C);if(L.mate)s-=5e6;else if(L.core)s-=4e6;return s}
  function pick(r,cfg,rnd){rnd=rnd||Math.random;const C=cfg.C,b=cfg.b,L=(r&&r.lines||[]).filter(x=>x&&x.mv);let A=banMoves(cfg.td,b,L_(b,"b",C));if(!A.length)A=L_(b,"b",C);
    const known=new Map(L.map(x=>[x.mv,x.v])),lo=L.length?Math.min(...L.map(x=>x.v)):0;let best=null,bv=-Infinity;
    for(const[f,t]of A){const u=C.iccs(f,t),v=known.has(u)?known.get(u):lo-80,s=scoreB(cfg,f,t,v)+rnd()*10;if(s>bv){bv=s;best=u}}
    return best||(r&&r.best)}
  /* 給腳本對照、測試用：一步模擬紅方（不改原狀態） */
  function simR(P,f,t,C){const P2={board:P.board.slice(),turn:"r",td:clone(P.td),moves:[],pos:[C.fen(P.board,"r")],ed:[],human:"r"};const m=C.stateApply(P2,f,t);move(P2,m,C);return P2}
  return{MODE,MV,CH,PCS,squad,atkR,defR,LV,LVN,CHP,AREP1,GOAL,STG,HARD,HARDX,goals,stars,recStars,lockWhy,lvName,PRO_NEED,winTxt,winNow,lvOf,SK,SKM,GEN,skOfSq,skPickSq,ESK,PCN,PBN,STD,CAPB,CHK,CHK_GAP,FOCUS,INV,INV_PAL,INV_MAX,GUARD,SH_CAP,SH_LIFE,DEP_COST,DEP_MAX,ICPT_DRAIN,ICPT_GAIN,NOPROG,HEAL_PCT,SP0,RG,CAP_SP,INC_CAP,GROW,W_HP,DRAIN,
    G,stats,dmg,absorb,plan,startBoard,startFen,lvCheck,spawnOk,canStand,facing,boot,move,settle,cast,why,targets,costOf,depOk,skOf,skPick,fore,gateNm,preview,threats,invHits,defOf,guards,fxSq,scrOf,
    cannonHits,horseHits,marks,banMoves,engine,pick,simB,simR,scoreB,lethalR,sqOfId,tagOf,uSq,LSQ,inPal,redHalf}})();
/* ================= ③ 接線：local.js 只認 window.XQ_TD。星門圍城的盤交給 GSV，其他（舊版塔防、急襲、練習賽）照舊交給 BHTD ================= */
if(typeof window!=="undefined"&&window.XQ_TD&&!window.XQ_TD.gsv){const O=window.XQ_TD,isG=td=>!!(td&&td.mode===GSV.MODE);
  window.XQ_TD=Object.assign({},O,{gsv:1,
    boot:(c,P,C)=>c&&c.mode===GSV.MODE?GSV.boot(c,P,C):O.boot(c,P,C),
    move:(P,m,C)=>isG(P&&P.td)?GSV.move(P,m,C):O.move(P,m,C),
    cast:(P,b,C)=>isG(P&&P.td)?GSV.cast(P,b,C):O.cast(P,b,C),
    engine:(P,C)=>isG(P&&P.td)?GSV.engine(P,C):O.engine(P,C),
    pick:(r,cfg,rnd)=>cfg&&cfg.gsv?GSV.pick(r,cfg,rnd):O.pick(r,cfg,rnd)})}
/* ================= ② 畫面 ================= */
let GSV_ST=null,GSV_TG=null,GSV_BUSY=false,GSV_SEEN={},GSV_RAF=0,GSV_MK="",GSV_INFO=false,GSV_HK="";
function gsvIs(st){return!!(st&&st.td&&st.td.mode==="gate-siege-v1"&&/^bh:gs/.test(String(st.journey||"")))}   /* function 宣告：07bh、07bht 用 typeof 問，載入順序不影響 */
const gsvC=()=>typeof window!=="undefined"&&window.XQCore;
const gsvMy=st=>!!(st&&!st.result&&st.turn===st.human);
function gsvProg(){let o=null;try{o=store.get("gsv",null)}catch(e){}const P=o&&typeof o==="object"&&o.mv===GSV.MODE?o:{};return Object.assign({mv:GSV.MODE,c:{},h:{},sk:{},g:[]},P,{c:Object.assign({},P.c),h:Object.assign({},P.h),sk:Object.assign({},P.sk),g:Array.isArray(P.g)?P.g:[]})}
/* 開發者全開（驗收後面的關用）：開發者模式（02-shell DEVMODE）或本機 localhost／127.0.0.1 自動全開。主控台 gsvAll(true)＝這一頁強制全開、gsvAll(false)＝強制照玩家的解鎖（在本機要看鎖起來的樣子用這個）、gsvAll(null)＝回自動。
   只放在記憶體，重新整理就回自動；不寫進存檔 */
let GSV_ALL=null;
function gsvDevAll(){if(GSV_ALL!=null)return GSV_ALL;try{if(typeof DEVMODE==="function"&&DEVMODE())return true}catch(e){}try{return/^(localhost|127\.0\.0\.1)$/.test(location.hostname)}catch(e){return false}}
function gsvAll(v){GSV_ALL=v==null?null:!!v;return gsvDevAll()}
if(typeof window!=="undefined")window.gsvAll=gsvAll;
function gsvCss(){if(document.getElementById("gsvCss"))return;try{if(typeof bhtdCss==="function")bhtdCss()}catch(e){}const s=document.createElement("style");s.id="gsvCss";s.textContent=`
body.gsv-on #acts button[aria-label="悔棋"],body.gsv-on #acts button[aria-label="寶物"],body.gsv-on .xqbot,body.gsv-on .pzoom,body.gsv-on .gpad,body.gsv-on .pkview,body.gsv-on .pk2d,body.gsv-on .pk2d-tip,body.gsv-on .pk3d-back,body.gsv-on #topRight .stm-btn,body.gsv-on #fcmBtn{display:none!important}
body.gsv-on .view.fixed>#pTop,body.gsv-on .view.fixed>#pBot,body.gsv-on .view.fixed>#stat,body.gsv-on .view.fixed>.rule-note,body.gsv-on .view.fixed>.evline,body.gsv-on .view.fixed>#strip,body.gsv-on .view.fixed>#acts{display:none!important}
#gsvEn,#gsvMe{position:fixed;z-index:43;left:0;right:0;font-family:var(--serif);color:#f1e7cf;background:rgba(8,8,24,.95);box-sizing:border-box;padding:4px 8px;user-select:none;-webkit-user-select:none}
#gsvEn{top:var(--bhTop,44px);height:var(--gsvEnH,62px)}#gsvMe{bottom:0;height:calc(var(--gsvMeH,190px) + env(safe-area-inset-bottom,0px));padding-bottom:calc(4px + env(safe-area-inset-bottom,0px))}
body.gsv-on{--gsvEnH:62px;--gsvMeH:190px}
body.gsv-on .view.fixed>#bbox{position:fixed!important;left:0!important;right:0!important;top:calc(var(--bhTop,44px) + var(--gsvEnH))!important;bottom:calc(var(--gsvMeH) + env(safe-area-inset-bottom,0px))!important;width:auto!important;height:auto!important;max-height:none!important;min-height:0!important;margin:0!important;padding:0!important;z-index:40;background:#05060d;overflow:hidden}
body.gsv-on .view.fixed>#bbox>svg{width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;margin:0!important}
.gsv-r{display:flex;align-items:center;gap:6px;min-width:0;min-height:22px;font-size:12px;white-space:nowrap}.gsv-r+.gsv-r{margin-top:3px}
.gsv-nm{flex:none;font-weight:800;color:#FFE08A;font-size:12.5px}.gsv-nm.en{color:#d9b8ff}
.gsv-bar{position:relative;flex:1 1 40%;min-width:70px;height:17px;border-radius:99px;background:rgba(255,255,255,.12);overflow:hidden}
.gsv-bar i{position:absolute;inset:0 auto 0 0;border-radius:99px;transition:width .5s;background:linear-gradient(90deg,#8a1020,#e0483a)}.gsv-bar.en i{background:linear-gradient(90deg,#4a1a7a,#b04ae0)}.gsv-bar.sp{flex:0 1 26%;min-width:56px;height:13px}.gsv-bar.sp i{background:linear-gradient(90deg,#1d5fb8,#6fb8ff)}
.gsv-bar b{position:relative;display:block;text-align:center;font-size:11px;line-height:17px;text-shadow:0 1px 2px #000;font-weight:700}.gsv-bar.sp b{line-height:13px;font-size:10.5px}
.gsv-st{flex:none;font-size:11px;color:#c9bfe8}.gsv-st b{color:#f1e7cf}.gsv-sh{flex:none;font-size:11px;color:#9fd0ff;border:1px solid rgba(111,184,255,.6);border-radius:99px;padding:0 6px}
.gsv-ln{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;color:#d9b8ff}.gsv-ln.hot{color:#ffb4a8}.gsv-ln button{font:inherit;color:inherit;background:transparent;border:0;padding:0;text-decoration:underline dotted;cursor:pointer}
.gsv-fx{color:#ffd0c8;background:rgba(160,20,30,.4);border:1px solid rgba(255,90,80,.7);border-radius:99px;padding:0 7px;font:inherit;cursor:pointer}
.gsv-sks{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-top:4px}.gsv-sks.gen{margin-top:5px}
.gsv-sk{position:relative;font:inherit;color:#f6eedd;background:linear-gradient(180deg,#2c2450,#171433);border:1.5px solid #8f7bd8;border-radius:11px;padding:3px 2px;min-height:44px;cursor:pointer;line-height:1.15;touch-action:manipulation}
.gsv-sks.gen .gsv-sk{background:linear-gradient(180deg,#22304a,#121a2c);border-color:#5f8fc8;min-height:40px}
.gsv-sk b{display:block;font-size:12.5px}.gsv-sk small{font-size:10.5px;color:#9fd0ff}.gsv-sk.off{opacity:.45;filter:grayscale(.7)}.gsv-sk.on{border-color:#FFE08A;box-shadow:0 0 0 2px #FFE08A}
.gsv-tip{position:absolute;left:8px;right:8px;top:-34px;font-size:12.5px;color:#FFE08A;text-align:center;background:rgba(10,10,30,.92);border:1px solid rgba(255,224,138,.6);border-radius:99px;padding:3px 8px;display:flex;gap:8px;justify-content:center;align-items:center}
.gsv-tip button{font:inherit;font-size:12px;color:#f1e7cf;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.3);border-radius:99px;padding:1px 10px;min-height:28px}
#gsvOv{position:fixed;inset:0;pointer-events:none;z-index:42;overflow:hidden}
.gsv-mk{position:absolute;left:0;top:0;transform:translate(-50%,-50%);pointer-events:none;display:flex;align-items:center;justify-content:center;font-family:var(--serif);font-weight:800}
.gsv-mk.gate{width:calc(var(--c)*1.02);height:calc(var(--c)*1.02);border-radius:50%;border:2.5px dashed #b46bff;background:radial-gradient(circle,rgba(120,40,200,.42),rgba(40,10,80,.1) 70%);color:#f0dcff;font-size:12px;flex-direction:column;line-height:1}
.gsv-mk.gate i{font-style:normal;font-size:10.5px}
.gsv-mk.bd{font-size:10.5px;color:#fff;border-radius:6px;padding:0 3px;margin:calc(var(--c)*-.42) 0 0 calc(var(--c)*.42);line-height:1.35}
.gsv-mk.bd.inv{background:#c0281e}.gsv-mk.bd.drain{background:#6a2a9a}.gsv-mk.bd.arm{background:#ff3b30;box-shadow:0 0 8px #ff3b30}.gsv-mk.bd.guard{background:#2b6fd6}.gsv-mk.bd.frz{background:#0d1b4f;border:1px solid #8aa6ff;margin:calc(var(--c)*.42) 0 0 calc(var(--c)*-.42)}.gsv-mk.bd.src{background:#d2601a;margin:calc(var(--c)*.42) 0 0 calc(var(--c)*.42)}
.gsv-mk.ring{width:calc(var(--c)*.96);height:calc(var(--c)*.96);border-radius:50%;border:3px solid #ff3b30;box-shadow:0 0 10px #ff3b30}.gsv-mk.ring.fc{border-color:#FFE08A;box-shadow:0 0 12px #FFB000}.gsv-mk.ring.ifo{border-color:#ff8a1a;border-style:dashed}
.gsv-mk.trap{width:calc(var(--c)*.7);height:calc(var(--c)*.7);border-radius:50%;border:2.5px dotted #ffd36a}
.gsv-mk.dp{width:calc(var(--c)*.8);height:calc(var(--c)*.8);border-radius:8px;border:2px dashed rgba(127,224,255,.7);color:#7fe0ff;font-size:11px}
.gsv-mk.tg{pointer-events:auto;width:calc(var(--c)*.92);height:calc(var(--c)*.92);border-radius:50%;border:3px solid #FFE08A;background:rgba(255,224,138,.2);cursor:pointer;padding:0;animation:gsvTg 1s ease-in-out infinite}
@keyframes gsvTg{50%{box-shadow:0 0 16px 6px rgba(255,224,138,.65)}}
.gsv-rules{font-size:13.5px;line-height:1.7;text-align:left}.gsv-rules li{margin:2px 0}
.modal.gsv-sel{max-height:100dvh;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:none}.modal.gsv-sel::-webkit-scrollbar{display:none}.gsv-card.lk small{display:none}
.gsv-sel .mb{display:contents}.gsv-sel .mb>.btn:first-child{position:sticky;bottom:calc(6px + env(safe-area-inset-bottom,0px));z-index:2;box-shadow:0 -8px 14px rgba(0,0,0,.45);margin-top:10px}
.gsv-sel .box{max-width:min(96vw,560px)}.gsv-cards{display:grid;gap:6px;margin:8px 0}.gsv-card{display:block;width:100%;text-align:left;font:inherit;color:inherit;background:var(--card,#fff);border:2px solid var(--line,#ddd);border-radius:12px;padding:7px 10px;cursor:pointer;min-height:44px}
.gsv-card.on{border-color:#7a3fb0;box-shadow:0 0 0 2px rgba(122,63,176,.25)}.gsv-card small{display:block;font-size:12px;color:var(--muted,#777)}
.gsv-chs{display:flex;gap:6px;margin:8px 0 0}.gsv-chb{flex:1 1 0;min-width:0;font:inherit;font-size:13.5px;color:inherit;background:transparent;border:2px solid var(--line,#ddd);border-radius:99px;padding:4px 6px;min-height:44px;cursor:pointer}.gsv-chb.on{border-color:#7a3fb0;background:rgba(122,63,176,.12);font-weight:700}
.gsv-mds{margin-top:6px}.gsv-mds .gsv-chb{min-height:40px;font-size:13px}.gsv-card.lk{opacity:.55}.gsv-s3{float:right;letter-spacing:1px;color:#b8860b;font-size:14px}.gsv-gl{font-size:12.5px;line-height:1.6;margin:6px 0 2px;text-align:center}.gsv-gl i{font-style:normal;opacity:.6}
.gsv-skl{display:flex;flex-wrap:wrap;gap:6px}.gsv-skl .gsv-skg{flex-basis:100%;margin:6px 0 0;font-size:12.5px;font-weight:700}.gsv-skl .gsv-skg small{font-weight:400;opacity:.7}.gsv-skl label{font-size:12.5px;border:1.5px solid var(--line,#ccc);border-radius:99px;padding:3px 9px;cursor:pointer}.gsv-skl label.on{border-color:#7a3fb0;background:rgba(122,63,176,.12)}.gsv-skl label.lk{opacity:.4}
.bt-sel .bt-card.bt-gsvc{border-style:double;border-width:3px;border-color:#b46bff}
@media (orientation:portrait) and (max-height:700px){body.gsv-on{--gsvMeH:176px}.gsv-sk{min-height:40px}.gsv-sks.gen .gsv-sk{min-height:36px}}
@media (orientation:landscape){body.gsv-on{--gsvEnH:0px;--gsvMeH:0px}
 #gsvEn{top:var(--bhTop,44px);bottom:0;height:auto;width:calc(200px + env(safe-area-inset-left,0px));right:auto;padding-left:calc(8px + env(safe-area-inset-left,0px))}
 #gsvMe{top:var(--bhTop,44px);left:auto;right:0;width:calc(210px + env(safe-area-inset-right,0px));height:auto;padding-right:calc(8px + env(safe-area-inset-right,0px))}
 #gsvEn .gsv-r,#gsvMe .gsv-r{flex-wrap:wrap;white-space:normal}.gsv-ln{flex:1 1 100%}
 .gsv-sks{grid-template-columns:repeat(2,minmax(0,1fr))}.gsv-tip{position:static;margin-bottom:6px;flex-wrap:wrap;border-radius:10px}
 body.gsv-on .view.fixed>#bbox{top:var(--bhTop,44px)!important;bottom:0!important;left:calc(200px + env(safe-area-inset-left,0px))!important;right:calc(210px + env(safe-area-inset-right,0px))!important}}
/* 11/15 星門圍城也能切 3D 星盤：頂欄「👁」視角鈕與小選單（樣式照舊版塔防 #bhtdView／#bhtdViewM）；3D 區裡黑洞自由鏡頭用的鈕（棋距、望遠鏡…）和場名收起來；
   頂欄上「回棋盤模式／去園子下棋（3D）」那顆收起來（有「👁」了；手機「⋯ 更多」裡那顆照樣能按，06-cpu parkBtn→gsvParkBtn）。
   3D 記號：貼地的加 g3（transform-origin 要 0 0，矩陣由 07bht bhtdGnd 算）；lb＝貼地記號的直立文字標籤；tg.hit＝選目標時角色身上的透明點擊區 */
body.gsv-on #topRight button[aria-label="回棋盤模式"],body.gsv-on #topRight button[aria-label="去園子下棋（3D）"],body.gsv-on .gs-ui,body.gsv-on .gs-pop,body.gsv-on .un-ui,body.gsv-on .tele-ui,body.gsv-on #bbox .pkname{display:none!important}
body.gsv-on .view.fixed>#bbox .park3d{border-radius:0!important}
#gsvView{display:inline-flex!important;align-items:center;gap:3px;font:600 12px var(--serif);white-space:nowrap;padding:0 8px!important;min-width:44px}#gsvView small{font-size:11.5px}
#gsvViewM{position:fixed;z-index:9300;top:calc(var(--bhTop,48px) + 4px);right:calc(6px + env(safe-area-inset-right,0px));width:min(250px,80vw);box-sizing:border-box;background:rgba(10,10,30,.96);border:1px solid #E8C77A;border-radius:12px;padding:6px;color:#f1e7cf;font-family:var(--serif);box-shadow:0 8px 20px rgba(0,0,0,.5)}
#gsvViewM button{display:flex;width:100%;align-items:center;gap:8px;font:inherit;font-size:14px;color:inherit;background:transparent;border:0;border-radius:8px;padding:8px;min-height:44px;text-align:left;cursor:pointer}
#gsvViewM button.on{background:rgba(255,224,138,.16);color:#FFE08A;font-weight:700}#gsvViewM button small{margin-left:auto;font-size:11.5px;color:#c9bfe8;font-weight:400}
#gsvViewM p{font-size:12px;color:#c9bfe8;margin:4px 6px 2px;line-height:1.5}
.gsv-mk.g3{transform-origin:0 0}
.gsv-mk.bd.g3h{margin:0;z-index:2;box-shadow:0 1px 3px rgba(0,0,0,.6)}
#gsvOv .bt-mk.gt{font-size:clamp(8px,calc(var(--c)*.34),11px);line-height:1.08;padding:1px 3px;width:1.7em;box-sizing:content-box;white-space:normal;text-align:center;border-radius:6px}
.gsv-mk.lb{font-size:11px;line-height:1.4;padding:0 5px;border-radius:99px;color:#f1e7cf;background:rgba(10,10,30,.82);border:1px solid rgba(255,255,255,.4);white-space:nowrap}.gsv-mk.lb.lbdp{color:#7fe0ff;border-color:rgba(127,224,255,.7)}
.gsv-mk.tg.hit{border:0;background:transparent;animation:none;border-radius:10px}
@media (orientation:portrait){body.gsv-3d .gsv-tip{position:fixed;top:calc(var(--bhTop,44px) + var(--gsvEnH,62px) - 32px);left:8px;right:8px}}
@media (orientation:landscape){body.bh-full.gsv-on .view.fixed:has(>#bbox):has(>#acts)>#bbox{top:var(--bhTop,44px)!important;bottom:0!important;left:calc(200px + env(safe-area-inset-left,0px))!important;right:calc(210px + env(safe-area-inset-right,0px))!important;width:auto!important;height:auto!important}}
@media (prefers-reduced-motion:reduce){.gsv-mk.tg{animation:none}}`;document.head.append(s)}
/* ---------- 選關卡片（黑洞關卡卡片的「🌠 星門圍城」、主控台 gsvOpen()） ---------- */
function gsvCard(){   /* 11/15 開發者試玩後「有挑戰性、沒有那麼無腦獲勝了，可以上線」：開給所有玩家（原本只給開發者） */
  return`<button type="button" class="bt-card bt-gsvc" data-gsv="1" aria-label="星門圍城，兩章共 12 關"><div class="hd"><b>🌠 星門圍城</b></div></button>`}
const gsvChar=()=>{let c="";try{c=typeof ptyLook==="function"?ptyLook():((typeof myChar==="function"&&myChar())||store.get("pChar",""))}catch(e){}return GSV.CH[c]?c:"x_swordboy"};   /* 11/15 七星改版：出戰的是隊長（07pty-party.js） */
/* 11/15 七星改版第二期：選關解鎖看誰加入了（序章 B、C 階段）；沒有 07pty-party.js（舊版）就不看 */
const gsvHas=()=>{try{return typeof ptyHas==="function"?ptyHas:null}catch(e){return null}};
const gsvL=c=>{try{if(typeof ptyLv==="function")return ptyLv(c||gsvChar());return typeof xpInfo==="function"?xpInfo().L:1}catch(e){return 1}};   /* 11/15 七星改版：等級看隊長自己的 */
function gsvRulesHTML(){return`<ul class="gsv-rules">
<li>雙方各有一顆<b>星核</b>（HP、ATK、DEF、靈力）。棋子照普通象棋走、照常被吃掉離場；真正將死仍然直接贏。</li>
<li>傷害一律同一條算式：基礎 × 攻方 ATK／100 × 100／(100＋守方 DEF)，至少 1；護盾是數值池（上限 30、兩回合到期），盾可以吸到 0。</li>
<li>擒子基礎：卒 4、士象 6、馬砲 10、車 14；真正將軍 18（同一星核兩回合內最多算一次）；集火擒子 +8。</li>
<li><b>入侵卒</b>（標「侵」）進到你的半場會先預告，下個回合結束還在就扣你 12（進你的九宮 20），最多算兩顆。其他子過河不扣血。</li>
<li><b>護陣卒</b>（標「陣」）每顆讓星樞 DEF +20；吃掉就拆掉那 20。第二章有的關卡是<b>護陣車</b>，一樣標「陣」、一樣 +20。</li>
<li><b>奪靈馬</b>（標「奪」）真的擒到你的子時，再扣你 8 靈力（每回合最多一次）。</li>
<li><b>星樞大招</b>一律先預告一回合、寫明取消條件：卒將號令（號令卒被吃或離開你的半場就取消）；隔山星砲（砲、砲架、目標任一顆離開原線、中間多擋一子、或砲不能合法吃到目標，就取消）。有的關卡星樞 HP 掉到 60%、30% 才解鎖新的大招（只解鎖，不加兵、不當下打）。</li>
<li>第二章的大招：<b>長驅直入</b>（標「驅」的車還沒過河、留在原位，而且從它到你的底線整條直路都是空的才打：在那條路上擋一子、吃掉那顆車、或它離開原位就取消；補給點也能拿來擋）；<b>斷路令</b>（標「斷」的那顆俥，下回合結束還在敵方半場才打：退回自己的半場就取消）。</li>
<li>援軍從星門落下，至少前兩回合就看得到。你的子站在門上擋一次＝延遲；下回合還擋著＝取消（截援：星樞靈力 −10，第一次截援你回 6 靈）。</li>
<li>每回合：可以先放一招（每回合最多一招），再走一步棋，或花 20 靈力把後備子部署到補給點（部署用掉這一步，每局最多 2 次）。</li>
<li>靈力：開場 35、每回合回 4、擒子 +6，每回合收入最多 10。回復總量每局最多最大 HP 的 40%。</li>
<li>回合結束一起結算：<b>雙方星核同一批結算同時歸零＝和局</b>；連續 8 回合沒有進展也判和。</li>
<li>破了前一關才開下一關。每關三顆星：過關一顆，另外兩顆各有一個條件，哪一局達成哪一顆都算，不用同一局全拿。破關後開<b>困難版</b>：擺法一樣，星樞多想一步、不長將、招放得更早更多，紀錄和星另外算。</li></ul>`}
function gsvOpen(){gsvSelect(store.get("era","classic"),false)}
if(typeof window!=="undefined")window.gsvOpen=gsvOpen;
/* 選關分章（11/15 加第二章）：上面一排章的分頁（GSV.CHP），下面只列這一章的六關；每關還是只有「第 n 關・關名」。只組字串、不碰畫面（測試直接叫）。P＝gsvProg()、sel＝選中的關、chp＝正在看的章 */
/* 三顆星那一行（選關視窗開打前、結果視窗都用）：rec＝紀錄裡已經有的 [0／1…]、now＝這一局拿到的（沒有就不給）。★＝有了（這一局拿到的加粗）、☆＝還沒 */
function gsvStarsHTML(n,rec,now){return GSV.goals(n).map((g,i)=>{const t=`<span>${esc(g.t)}</span>`;return now&&now[i]?`<b>★ ${t}</b>`:rec&&rec[i]?`★ ${t}`:`<i>☆ ${t}</i>`}).join("　")}   /* 條件的字自己包一層，英文介面才能整句查字典 */
/* 11/15 逐關解鎖＋三星＋困難版：o.hard＝正在看困難版（紀錄讀 P.h）、o.all＝開發者全開。鎖住的卡只有「🔒 第 n 關・關名」加一句原因；開著的卡多一排星 */
function gsvChapHTML(P,sel,chp,o){o=o||{};const H=GSV.CHP.find(c=>c.n===chp)||GSV.CHP[0],hard=o.hard?1:0,T=(hard?P.h:P.c)||{};
  const card=n=>{const V=GSV.lvOf(n,hard),R=T[n]||{},lk=GSV.lockWhy(P,n,hard,o.all,o.has),S=GSV.recStars(R,n),LN=GSV.lvName(n),rec=R.w||R.l||R.d?`勝 ${R.w||0}・和 ${R.d||0}・敗 ${R.l||0}`:"還沒打過",best=R.best?`・最佳 ${R.best.rnd} 回合／剩 ${R.best.hp} HP`:"";
    if(lk)return`<button type="button" class="gsv-card lk" data-n="${n}" data-lk="${esc(lk)}" aria-disabled="true" aria-label="${esc(`${LN} ${V.nm}，還沒開放：${lk}`)}"><b>🔒 ${esc(LN)}・${esc(V.nm)}</b><small aria-hidden="true">${esc(lk)}</small></button>`;
    /* 11/15 開發者「每一個關卡字太多，用極簡」：卡上只留關名、星數＋打過的戰績，數值和說明只給讀屏 */
    return`<button type="button" class="gsv-card${n===sel?" on":""}" data-n="${n}" aria-label="${esc(`${LN} ${V.nm}${hard?"困難版":""}（${V.th}），${S.filter(Boolean).length} 顆星，星樞 HP ${V.hp}、ATK ${V.atk}、DEF ${V.def}，推算 ${V.depth} 步，${rec}${best}。${V.say}`)}"><b>${esc(LN)}・${esc(V.nm)}</b><span class="gsv-s3" aria-hidden="true">${S.map(x=>x?"★":"☆").join("")}</span>${R.w||R.l||R.d?`<small aria-hidden="true">${R.w?"✓ ":""}${rec}</small>`:""}</button>`};
  return`<div class="gsv-chs" role="tablist">${GSV.CHP.map(c=>`<button type="button" class="gsv-chb${c.n===H.n?" on":""}" role="tab" aria-selected="${c.n===H.n}" data-ch="${c.n}"><span>${esc(c.t)}</span>・<span>${esc(c.nm)}</span></button>`).join("")}</div>
<div class="gsv-chs gsv-mds">${[["普通",0],["困難",1]].map(([t,v])=>`<button type="button" class="gsv-chb gsv-mdb${v===hard?" on":""}" data-md="${v}" aria-pressed="${v===hard}">${t}</button>`).join("")}</div>
<div class="gsv-cards">${H.lv.map(card).join("")}</div><p class="gsv-gl">${esc(GSV.lvName(sel))}${hard?"・困難":""}：${gsvStarsHTML(sel,GSV.recStars(T[sel],sel))}</p>`}
function gsvSelect(k,cover){gsvCss();const ck=gsvChar(),L=gsvL(),st=GSV.stats(ck,L),P=gsvProg(),pool=typeof ptyGroups==="function"?ptyGroups(GSV.SK.filter(s=>!s.gen)):[{c:st.ck,nm:st.n,L,sk:GSV.SK.filter(s=>s.ch===st.ck)}];   /* 11/16 全隊招式：照夥伴分組 */let sel=P.last&&GSV.LV[P.last]?P.last:1;
  const all=gsvDevAll(),has=gsvHas();if(GSV.lockWhy(P,sel,0,all,has))sel=GSV.LVN.find(n=>!GSV.lockWhy(P,n,0,all,has))||GSV.CHP[0].lv[0];let hard=P.lastH&&!GSV.lockWhy(P,sel,1,all)?1:0;   /* 上次打的關現在鎖著（不該發生）就回第 1 關；上次打困難版就停在困難版 */
  let pk=typeof ptyPick==="function"?ptyPick(GSV.SK,P.sk["*"]||P.sk[st.ck]):GSV.skPick(st.ck,L,P.sk[st.ck]),chp=(GSV.CHP.find(c=>c.lv.includes(sel))||GSV.CHP[0]).n;   /* 一開始停在上次打的那一關所在的章 */
  const chH=()=>gsvChapHTML(P,sel,chp,{hard,all,has});
  const skH=()=>pool.map(g=>`<p class="gsv-skg">${esc(g.nm)} <small>Lv ${g.L}</small></p>`+g.sk.map(s=>`<label class="${pk.includes(s.id)?"on":""}${s.lv>g.L?" lk":""}" data-id="${s.id}" title="${esc(s.d)}">${s.lv>g.L?"🔒 Lv"+s.lv+" ":""}${esc(s.nm)}・${s.cost} 靈</label>`).join("")).join("");
  const m=modal(`<div class="em">🌠</div><h2>星門圍城</h2><div class="gsv-chap">${chH()}</div><p style="font-size:13px;margin-bottom:2px">招式（全隊已學會的都能帶，最多 4 招）</p><div class="gsv-skl">${skH()}</div>
    <details><summary>星門圍城規則</summary>${gsvRulesHTML()}</details>`,
    [["⚔ 出戰",()=>gsvStart(sel,k,cover,pk,false,hard)],["‹ 回黑洞關卡",()=>{try{if(typeof bhtdSelect==="function")bhtdSelect(k,cover)}catch(e){}},true]],"prolog gsv-sel");
  if(!m)return;m.addEventListener("click",e=>{const c=e.target.closest(".gsv-card"),md=e.target.closest(".gsv-mdb"),t=md?null:e.target.closest(".gsv-chb");
    /* 普通／困難：選中的這一關還沒破普通版就不能切困難版。鎖住的卡：只說一句原因、不改選。
       換章：選中的關不在這一章就改選這一章第一個開著的關（都鎖著就不改；下面那一行永遠寫著現在選的是第幾關，「出戰」打的就是它） */
    if(md){const v=+md.dataset.md;if(v&&GSV.lockWhy(P,sel,1,all)){toast("🔒 破了這一關的普通版才開困難版");return}hard=v?1:0}
    else if(t){chp=+t.dataset.ch;const H=GSV.CHP.find(x=>x.n===chp),f=H&&!H.lv.includes(sel)?H.lv.find(n=>!GSV.lockWhy(P,n,hard,all,has)):null;if(f)sel=f}
    else if(c){if(c.dataset.lk){toast(`🔒 ${GSV.lvName(+c.dataset.n)}：${c.dataset.lk}`);return}sel=+c.dataset.n}
    if(c||t||md){try{vibrate(5)}catch(z){}m.querySelector(".gsv-chap").innerHTML=chH();return}
    const l=e.target.closest(".gsv-skl label");if(l){e.preventDefault();const s=GSV.SKM[l.dataset.id];{const Lc=typeof ptyLv==="function"?ptyLv(s.ch):L;if(s.lv>Lc){toast(`🔒 ${typeof ptyNm==="function"?ptyNm(s.ch):""} Lv ${s.lv} 解鎖「${s.nm}」`);return}}
      if(pk.includes(s.id)){if(pk.length>1)pk=pk.filter(x=>x!==s.id)}else if(pk.length<4)pk=pk.concat([s.id]);else{toast("最多帶 4 招");return}m.querySelector(".gsv-skl").innerHTML=skH()}})}
/* hard＝困難版（第 6 個參數，11/15 加；前五個照舊）。鎖住的關不開（主控台直接叫也一樣，只跳一句原因）；開發者全開時不擋。
   journey 困難版是 "bh:gs<n>h"：還是 bh:gs 開頭，不給修為、不回定軌力那幾處照樣認得 */
function gsvStart(n,k,cover,sk,force,hard){const C=gsvC();if(!C)return toast("規則程式還沒載好");hard=hard?1:0;const V=GSV.lvOf(n,hard);if(!V)return toast("沒有這一關");
  let ck=gsvChar(),L=gsvL();const P=gsvProg(),lk=GSV.lockWhy(P,n,hard,gsvDevAll(),gsvHas());if(lk)return toast(`🔒 ${GSV.lvName(n)}${hard?"困難版":""}：${lk}`);
  P.sk["*"]=typeof ptyPick==="function"?ptyPick(GSV.SK,sk):GSV.skPick(ck,L,sk);   /* 11/16 取消隊長：存全隊那一份；畫面上的名字、頭像＝首頁小人（ck） */P.last=n;P.lastH=hard;store.set("gsv",P);const J="bh:gs"+n+(hard?"h":"");
  const R0=store.get("bhRet",null);store.set("bhRet",{k:k||(R0&&R0.k)||store.get("era","classic"),cover:k?cover!==false:!!(R0&&R0.cover),at:Date.now(),first:false});
  jStart(J,{human:"r",lx:V.depth,journey:J,lv:Object.assign({fen:GSV.startFen(n,C),turn:"r"},V.pro?{noPerpetual:true}:{}),td:{mode:GSV.MODE,lv:n,ch:ck,L,sk:P.sk["*"],hard}},()=>{const was=/^#\/journey\/play/.test(location.hash);location.hash="#/journey/play";
    if(was)try{window.dispatchEvent(new Event("xq-play"))}catch(e){}setTimeout(()=>toast(`🌠 星門圍城・${GSV.lvName(n)}・${V.nm}${hard?"（困難版）":""}`),700);{const ws=typeof ptyWoodSay==="function"?ptyWoodSay(GSV.plan(n).red.map(x=>String(x[0]).toUpperCase())):"";if(ws)setTimeout(()=>toast(ws),5200)}setTimeout(()=>toast("✦ 星樞："+V.say),3200);if(GSV.winTxt(n))setTimeout(()=>toast(`🎯 這一關不用打穿星核：${GSV.winTxt(n)}就過關`),4400)},!!force)}
/* ---------- 對局中（07bh bhTick 叫） ---------- */
function gsvHide(){if(typeof document==="undefined")return;document.body&&document.body.classList.remove("gsv-on","gsv-3d");for(const id of["gsvEn","gsvMe","gsvOv","gsvView"]){const e=document.getElementById(id);if(e)e.remove()}GSV_TG=null;GSV_MK="";GSV_HK="";GSV_P3=0;try{gsvViewMenu(false)}catch(e){}}   /* 11/15：頂欄「👁」視角鈕、視角小選單一起收 */
function gsvTick(st){if(typeof document==="undefined")return;if(!gsvIs(st)||!/^#\/journey\/play/.test(location.hash||"")){if(GSV_ST||document.getElementById("gsvMe"))gsvHide();GSV_ST=null;return}
  const fresh=!GSV_ST||GSV_ST.id!==st.id;GSV_ST=st;gsvCss();document.body.classList.add("gsv-on");if(fresh){GSV_TG=null;GSV_INFO=false;GSV_HK=""}
  const bb=document.getElementById("bbox");if(!bb||!bb.parentNode)return;
  let en=document.getElementById("gsvEn");if(!en){en=document.createElement("div");en.id="gsvEn";bb.after(en);en.addEventListener("click",gsvClick);GSV_HK=""}
  let me=document.getElementById("gsvMe");if(!me){me=document.createElement("div");me.id="gsvMe";en.after(me);me.addEventListener("click",gsvClick);GSV_HK=""}
  if(!document.getElementById("gsvOv")){const o=document.createElement("div");o.id="gsvOv";o.innerHTML=`<div class="mks"></div>`;document.body.append(o);o.addEventListener("click",gsvOvClick)}
  if(GSV_TG&&!gsvMy(st))GSV_TG=null;
  gsvPaint();gsvEvents(st);try{gsvViewUi()}catch(e){console.warn("[gsv]",e)}if(!GSV_RAF)GSV_RAF=requestAnimationFrame(gsvFrame)}   /* 11/15：頂欄右上「👁」視角鈕（全局俯視／臨陣斜角／純淨平面） */
const gsvPct=(a,b)=>Math.max(0,Math.min(100,Math.round(a/Math.max(1,b)*100)));
function gsvFoeLine(td,b){const F=GSV.fore(td),wn=GSV.winNow(td,b),W=wn?`<span class="gsv-win">${esc(wn)}</span>`:"";if(!F.length)return W||`<span>援軍都下來了</span>`;   /* 11/16 序章另外的過關條件：進度放最前面 */const g=F[0],cnt={};for(const w of g.ws){const k=GSV.gateNm(w.sq)+"・"+GSV.PBN[w.p.toUpperCase()];cnt[k]=(cnt[k]||0)+1}
  return W+(W?"・":"")+`<button type="button" data-x="fore"><span>下一波</span>：${Object.keys(cnt).map(k=>esc(k)+"×"+cnt[k]).join("、")}・<b>${g.inR}</b> <span>回合後</span></button>`}
function gsvPaint(){const st=GSV_ST,en=document.getElementById("gsvEn"),me=document.getElementById("gsvMe");if(!st||!en||!me)return;const td=st.td,C=gsvC(),M=td.me,E=td.en,my=gsvMy(st);
  const pv=GSV.preview(td,st.board,C),thr=C&&my?GSV.threats(st.board,C).length:0,def=GSV.defOf(td,"b"),g=GSV.guards(td);
  const fx=td.fx?`<button type="button" class="gsv-fx" data-x="fx">⚠ ${esc(GSV.ESK[td.fx.id].nm)}</button>`:"";
  const hk=JSON.stringify([td.seq,st.turn,!!st.result,GSV_TG&&[GSV_TG.id,GSV_TG.pk,GSV_TG.p],GSV_INFO,GSV_BUSY]);if(hk===GSV_HK)return;GSV_HK=hk;
  en.innerHTML=`<div class="gsv-r"><span class="gsv-nm en">星樞</span><div class="gsv-bar en"><i style="width:${gsvPct(E.hp,E.max)}%"></i><b>HP ${Math.max(0,E.hp)}／${E.max}</b></div>
    <span class="gsv-st">DEF <b>${def}</b>${g?`（<span>護陣</span> +${g*GSV.GUARD}）`:""}</span>${E.sh.v?`<span class="gsv-sh">🛡${E.sh.v}</span>`:""}<span class="gsv-st">靈 <b>${E.sp}</b></span></div>
    <div class="gsv-r"><span class="gsv-ln">${gsvFoeLine(td,st.board)}</span>${fx}</div>`;
  const sk=id=>{const S=GSV.SKM[id],w=C?GSV.why(st,id,C):"…",cd=td.cd[id]||0,cost=GSV.costOf(td,id),on=GSV_TG&&GSV_TG.id===id;
    const lab=id==="dep"?`<b>部署</b><small>${GSV.DEP_COST} 靈・後備 ${td.res.length}</small>`:`<b>${esc(S.nm)}</b><small>${S.info?(GSV_INFO?"顯示中":"情報"):cd?`冷卻 ${cd}`:`${cost} 靈`}</small>`;
    return`<button type="button" class="gsv-sk${w&&!(S&&S.info)?" off":""}${on||(S&&S.info&&GSV_INFO)?" on":""}" data-k="${id}"${w?` data-w="${esc(w)}"`:""} aria-label="${esc((S?S.nm:"部署後備")+"："+(S?S.d:"花 20 靈力把一顆後備子放到補給點，用掉這一步")+(w?"（"+w+"）":""))}">${lab}</button>`};
  const tip=GSV_TG?`<div class="gsv-tip"><span>${GSV_TG.arm?"再點一次同一顆招就放出":GSV_TG.id==="dep"?"點盤上發光的補給點":"點盤上發光的目標"}</span><button type="button" data-x="cancel">取消</button></div>`:"";
  me.innerHTML=`${tip}<div class="gsv-r"><span class="gsv-nm">${esc(td.cn)}</span><div class="gsv-bar"><i style="width:${gsvPct(M.hp,M.max)}%"></i><b>HP ${Math.max(0,M.hp)}／${M.max}</b></div>
      <div class="gsv-bar sp"><i style="width:${gsvPct(M.sp,M.spMax)}%"></i><b>靈 ${M.sp}／${M.spMax}</b></div>${M.sh.v?`<span class="gsv-sh">🛡${M.sh.v}</span>`:""}<span class="gsv-st">ATK <b>${M.atk}</b>・DEF <b>${M.def}</b></span></div>
    <div class="gsv-r"><span class="gsv-st"><span>第</span> <b>${td.rnd+1}</b> <span>回合</span></span><span class="gsv-ln${pv.loss?" hot":""}">${pv.raw?`<span>本輪若不處理</span>：${pv.L.map(x=>(x.k==="inv"?"入侵":(GSV.ESK[x.id]||{}).sn||"大招")+" −"+x.raw).join("、")}${pv.abs?`（<span>盾吸收</span> ${pv.abs}／<span>損血</span> ${pv.loss}）`:""}`:`<span>本輪沒有確定的扣血</span>`}${thr?`・<span>可能擒子</span> ${thr} <span>處</span>`:""}</span>
      <button type="button" class="gsv-fx" data-x="rules" style="background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.3);color:#f1e7cf">規則</button></div>
    <div class="gsv-sks">${td.sk.map(sk).join("")}</div><div class="gsv-sks gen">${GSV.GEN.map(sk).join("")}${sk("dep")}</div>`}
function gsvClick(e){const st=GSV_ST;if(!st)return;const x=e.target.closest("[data-x]");if(x){const k=x.dataset.x;try{vibrate(5)}catch(z){}
    if(k==="cancel"){GSV_TG=null;GSV_MK="";GSV_HK="";gsvPaint();return}
    if(k==="rules"){modal(`<h2 style="font-size:19px">星門圍城規則</h2>${gsvRulesHTML()}`,[["知道了",null]]);return}
    if(k==="fore"){const F=GSV.fore(st.td);modal(`<h2 style="font-size:19px">星門預告</h2>${F.map(g=>`<p><b>${g.inR} 回合後</b>（第 ${g.at} 回合結束）：${g.ws.map(w=>esc(GSV.gateNm(w.sq)+"・"+GSV.PBN[w.p.toUpperCase()]+(w.tag==="inv"?"（入侵）":"")+(w.dl?"（已延遲一次）":""))).join("、")}</p>`).join("")||"<p>援軍都下來了</p>"}<p class="muted" style="font-size:12.5px">站上門格可以擋住：擋一次延遲，延遲後又擋住就取消（截援）。</p>`,[["知道了",null]]);return}
    if(k==="fx"){const F=st.td.fx,S=F&&GSV.ESK[F.id];if(S)toast(`⚠ 星樞「${S.nm}」：${S.d}`);return}return}
  const b=e.target.closest(".gsv-sk");if(!b)return;const id=b.dataset.k,S=GSV.SKM[id];
  if(S&&S.info){GSV_INFO=!GSV_INFO;GSV_MK="";GSV_HK="";gsvPaint();return}
  if(b.dataset.w){toast("✦ "+b.dataset.w);return}if(GSV_BUSY)return;try{vibrate(8)}catch(z){}
  if(GSV_TG&&GSV_TG.id===id){const arm=GSV_TG.arm;GSV_TG=null;GSV_MK="";GSV_HK="";gsvPaint();if(arm)gsvPlay(id,[]);return}
  if(id==="dep"){const C=gsvC(),ok=[...new Set(st.td.res)].filter(p=>GSV.targets(st,"dep",[p],C).length);if(!ok.length)return toast("補給點都不能用");
    modal(`<h2 style="font-size:19px">部署後備</h2><p class="muted">花 ${GSV.DEP_COST} 靈力、用掉這一步，選一顆後備子：</p>`,ok.map(p=>[GSV.PCN[p],()=>{GSV_TG={id:"dep",p,pk:[]};GSV_MK="";GSV_HK="";gsvPaint()}]).concat([["取消",null,true]]));return}
  if(!S.tg){GSV_TG={id,pk:[],arm:1};GSV_MK="";GSV_HK="";gsvPaint();toast("✦ "+S.nm+"："+S.d);return}
  GSV_TG={id,pk:[]};GSV_MK="";GSV_HK="";gsvPaint();toast("🎯 "+S.nm+"："+S.d)}
function gsvOvClick(e){const b=e.target.closest(".gsv-mk.tg");if(!b||!GSV_TG||!GSV_ST)return;e.stopPropagation();try{vibrate(8)}catch(z){}const T=GSV_TG,C=gsvC();T.pk.push(+b.dataset.sq);
  if(T.id==="dep"){GSV_TG=null;GSV_MK="";GSV_HK="";gsvPaint();gsvPlay("dep",T.pk,T.p);return}
  const S=GSV.SKM[T.id],need=(S.tg||[]).length;if(T.pk.length>=need){GSV_TG=null;GSV_MK="";GSV_HK="";gsvPaint();gsvPlay(T.id,T.pk);return}
  const L=GSV.targets(GSV_ST,T.id,T.pk,C);if(L.length&&typeof L[0]==="object"){GSV_TG=null;GSV_MK="";GSV_HK="";gsvPaint();modal(`<h2 style="font-size:19px">${esc(S.nm)}</h2><p class="muted">打哪一條線？</p>`,L.map(o=>[o.l,()=>gsvPlay(T.id,T.pk.concat([o.v]))]).concat([["取消",null,true]]));return}
  if(!L.length){GSV_TG=null;toast("沒有可以配對的目標")}GSV_MK="";GSV_HK="";gsvPaint()}
function gsvPlay(id,tg,p){if(GSV_BUSY)return;GSV_BUSY=true;GSV_HK="";gsvPaint();api("/play/td",{k:id,tg,p}).catch(e=>toast(e.message)).finally(()=>{GSV_BUSY=false;GSV_HK="";gsvPaint()})}
/* 盤上記號：星門（倒數）、入侵卒（侵／預告中）、護陣卒／護陣車（陣）、號令卒（令）、長驅直入的車（驅）、斷路令點名的俥（斷）、集火目標、守門點、定身、補給點；選目標時是可以點的發光格 */
function gsvMarks(st){const td=st.td,L=[],C=gsvC(),b=st.board;
  for(const g of GSV.fore(td))for(const w of g.ws)L.push({sq:w.sq,k:"gate",t:`門<i>${g.inR}</i>`});
  for(const q in td.ids){const id=td.ids[q],t=GSV.tagOf(td,id),sq=+q;if(t==="inv")L.push({sq,k:"bd "+(td.arm[id]?"arm":"inv"),t:td.arm[id]?"侵!":"侵"});if(t==="guard")L.push({sq,k:"bd guard",t:"陣"});if(t==="drain")L.push({sq,k:"bd drain",t:"奪"})}
  if(td.fx){const F=td.fx,q=GSV.sqOfId(td,F.src);if(q!=null)L.push({sq:q,k:"bd src",t:({pao:"砲",cqzr:"驅",dll:"斷"})[F.id]||"令"});   /* 隔山星砲：砲標「砲」、砲架標「架」、目標畫紅圈 */
    if(F.id==="pao"){const s=GSV.sqOfId(td,F.scr),t=GSV.sqOfId(td,F.tg);if(s!=null)L.push({sq:s,k:"bd src",t:"架"});if(t!=null)L.push({sq:t,k:"ring"})}
    /* 第二章：長驅直入＝車標「驅」、那條直路在你底線的口畫紅圈；斷路令＝被點名的俥標「斷」加紅圈。條件已經不成立（擋住了、退回來了）就不畫圈 */
    if(F.id==="cqzr"||F.id==="dll"){const t=GSV.fxSq(td,b,C);if(t!=null)L.push({sq:t,k:"ring"})}}
  if(td.fc&&td.fc.r===td.rnd)L.push({sq:td.fc.sq,k:"ring fc"});
  if(td.ctl.trap&&td.ctl.trap.until>td.rnd)for(const q of td.ctl.trap.sqs)L.push({sq:q,k:"trap"});
  for(const o of td.ctl.frz)if(o.until>td.rnd){const q=GSV.sqOfId(td,o.id);if(q!=null)L.push({sq:q,k:"bd frz",t:"定"})}
  for(const h of GSV.invHits(td))L.push({sq:h.sq,k:"ring"});
  if(GSV_INFO&&C){const R=new Set();for(const[f,t]of C.legal(b,"b"))if(b[t]==="R")R.add(f);for(const q of R)L.push({sq:q,k:"ring ifo"})}
  if(GSV_TG&&C&&gsvMy(st)){const T=GSV.targets(st,GSV_TG.id,GSV_TG.id==="dep"?[GSV_TG.p]:GSV_TG.pk,C);for(const x of T)if(typeof x==="number")L.push({sq:x,k:"tg",b:1})}
  else if(gsvMy(st))for(const d of td.dp)if(!b[d.sq])L.push({sq:d.sq,k:"dp",t:"補"});
  return L}
function gsvFrame(){GSV_RAF=0;const st=GSV_ST,o=document.getElementById("gsvOv");if(!st||!o||!gsvIs(st))return;if(!/^#\/journey\/play/.test(location.hash)){gsvHide();return}
  if((++GSV_FN%60)===0)setTimeout(()=>{try{if(!document.body.classList.contains("gsv-on"))return;gsvVwFix();if(!document.getElementById("gsvView"))gsvViewUi()}catch(e){}},0);   /* 每秒：3D 開不起來就退回平面；頂欄重畫把「👁」清掉了就補回去。排到這一格之後才做：gsvVwFix 會叫對局頁重畫（→gsvTick），在這裡面直接叫會多排一條 gsvFrame */
  /* 11/15 3D 星盤（park3d 畫在 #bbox）：記號換成 3D 那一份（gsvMk3），塔防鏡頭開著才疊選中底光、落點、準星、頭頂漢字牌；平面棋盤照原本的畫法 */
  const xy=q=>typeof bhtdXY==="function"?bhtdXY(q):null,g3=gsv3d(),pv=g3?PARK.v:null,tc=!!(pv&&pv.tdCam&&pv.tdCam());let L=gsvMarks(st);
  {const B=document.body;if(B&&B.classList.contains("gsv-3d")!==g3)B.classList.toggle("gsv-3d",g3)}   /* body.gsv-3d：3D 專用的版面（選目標的提示條搬到上面那條 HUD，不蓋棋盤底線） */
  if(g3){const po=(!st.result&&tc&&PARK.last&&PARK.last.o)||{};L=gsvMk3(L,st.board,{sel:po.sel>=0?po.sel:-1,targets:po.targets,pnm:tc&&!!pv.headOf})}
  const key=(g3?"3":"")+JSON.stringify(L),box=o.querySelector(".mks");
  if(key!==GSV_MK){GSV_MK=key;box.innerHTML=L.map(m=>{const c=(m.c==="bt"?"bt-mk ":"gsv-mk ")+m.k;return m.b?`<button type="button" class="${c}" data-sq="${m.sq}"${m.h?` tabindex="-1" aria-hidden="true"`:` aria-label="目標 ${m.sq}"`}></button>`:`<div class="${c}" data-sq="${m.sq}">${m.t||""}</div>`}).join("")}
  const a=xy(40),c=xy(41),cell=a&&c?Math.max(18,Math.min(90,Math.hypot(c.x-a.x,c.y-a.y))):36;o.style.setProperty("--c",cell+"px");
  for(const el of box.children){const q=+el.dataset.sq,kd=g3?gsvMkKind(el.className):"",p=kd==="head"?pv.headOf(q):xy(q);if(!p){el.style.display="none";continue}el.style.display="";
    if(!g3){el.style.transform=`translate(${p.x}px,${p.y}px) translate(-50%,-50%)`;continue}
    const M=kd==="gnd"&&typeof bhtdGnd==="function"?bhtdGnd(q,p,cell):null,P3=gsvPos3(kd,el.className,p,cell,M,pv.headOf&&(el.classList.contains("hit")||el.classList.contains("bd")&&st.board[q])?pv.headOf(q):null);
    el.classList.toggle("g3",!!P3.m);el.classList.toggle("g3h",!!P3.hd);if(P3.w){el.style.width=P3.w+"px";el.style.height=P3.h+"px"}
    el.style.transform=`translate(${P3.x}px,${P3.y}px)`+(P3.m?` matrix(${P3.m})`:"")+" translate(-50%,-50%)"}
  GSV_RAF=requestAnimationFrame(gsvFrame)}
/* 跳字：看 td.ev 新增的事件（拆陣、盾吸收、入侵、截援…都寫原因，不只跳總數） */
function gsvBarXY(id){const e=document.getElementById(id);if(!e)return{x:innerWidth/2,y:innerHeight/2};const r=e.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height*.5}}
function gsvEvents(st){const td=st.td,id=st.id;if(GSV_SEEN[id]==null){GSV_SEEN[id]=td.seq;return}const s0=GSV_SEEN[id];if(td.seq<=s0)return;GSV_SEEN[id]=td.seq;
  td.ev.filter(e=>e.s>s0).forEach((e,i)=>setTimeout(()=>{try{gsvEv(e)}catch(x){}},i*220))}
function gsvEv(e){if(typeof bhtdFloat!=="function")return;const F=(t,p,c)=>bhtdFloat(t,p,c),at=q=>q!=null&&typeof bhtdXY==="function"?bhtdXY(q):null,why={cap:"擒子",chk:"將軍",inv:"入侵",esk:"卒將號令",skill:"招式"};
  if(e.k==="hit"){const p=gsvBarXY(e.to==="b"?"gsvEn":"gsvMe"),nm=e.why==="esk"&&GSV.ESK[e.id]?GSV.ESK[e.id].nm:why[e.why]||"";const av=e.why==="cap"&&typeof ptyAv==="function"?ptyAv(e.to==="b"?e.cp:e.vp):null;bhtdFloat(e.abs?`${nm} 盾吸收 ${e.abs}／損血 ${e.loss}`:`${nm} −${e.loss}`,p,e.to==="b"?"dmg":"hurt",null,av);return}   /* 11/15 七星改版：擒子跳字旁是吃子那顆（我方打）或被吃那顆（我方挨打）的頭像 */
  if(e.k==="guard")return F(`拆陣 DEF−${GSV.GUARD}`,at(e.sq)||gsvBarXY("gsvEn"),"info");
  if(e.k==="warn")return F(`入侵預告：下回合 −${e.raw}`,at(e.sq),"hurt");
  if(e.k==="spawn")return F(e.tag==="inv"?"援軍・入侵卒":"援軍",at(e.sq),"info");
  if(e.k==="delay")return F("星門延遲",at(e.sq),"info");if(e.k==="cancel")return F("援軍取消",at(e.sq),"info");
  if(e.k==="icpt")return F(`截援！星樞靈力 −${e.drain}${e.gain?`、你 +${e.gain}`:""}`,at(e.sq),"sp");
  if(e.k==="dep")return F(`部署${GSV.PCN[e.p]}`,at(e.sq),"info");
  if(e.k==="heal"&&e.n)return F(`+${e.n}`,gsvBarXY("gsvMe"),"heal");
  if(e.k==="skill")return F(e.nm,gsvBarXY("gsvMe"),"info");
  const enm=GSV.ESK[e.id]?GSV.ESK[e.id].nm:"";
  if(e.k==="esk")return F(e.id==="esh"?`星樞護盾 ${e.v}`:"⚠ 星樞預告："+enm,gsvBarXY("gsvEn"),"info");
  if(e.k==="eskOff")return F(enm+"取消",gsvBarXY("gsvEn"),"info");
  if(e.k==="phase")return F("✦ 星樞解鎖："+enm,gsvBarXY("gsvEn"),"info");
  if(e.k==="drain")return F(`奪靈 −${e.n} 靈`,gsvBarXY("gsvMe"),"hurt");
  if(e.k==="ctl")return F(e.what==="lock"?"銅鎖：定身兩回合":"守門：定身一回合",at(e.sq),"info")}
/* ---------- 結算（07bh bhGameEnd、bhResultModal 叫）：新模式自己的紀錄（存檔鍵 gsv），不碰舊版三星、星塵 ---------- */
/* 11/15：困難版（td.hard）記在 P.h、普通版記在 P.c，互不相干；過關時把這一局拿到的星併進紀錄（各自累積，拿過的不會掉） */
function gsvEnd(st){if(!gsvIs(st)||!st.result)return;const P=gsvProg(),n=st.td.lv,T=st.td.hard?P.h:P.c;if(P.g.includes(st.id))return;const R=T[n]=Object.assign({w:0,l:0,d:0},T[n]),w=st.result.w;
  if(!w)R.d++;else if(w===st.human){const S0=GSV.recStars(R,n),S1=GSV.stars(st.td,st.board);R.st=S0.map((x,i)=>x||S1[i]?1:0);R.w++;const b={rnd:st.td.rnd,hp:Math.max(0,st.td.me.hp)};if(!R.best||b.rnd<R.best.rnd||(b.rnd===R.best.rnd&&b.hp>R.best.hp))R.best=b}else R.l++;
  P.g=P.g.concat([st.id]).slice(-20);store.set("gsv",P)}
function gsvResult(st,win,draw0,XPR){gsvCss();const td=st.td,n=td.lv,V=GSV.LV[n]||{},R=store.get("bhRet",null),k=R&&R.k,cv=R&&R.cover,M=td.me,E=td.en,why=st.result.why||"";
  const used=Object.keys(td.used).filter(id=>GSV.SKM[id]).map(id=>GSV.SKM[id].nm+(td.used[id]>1?"×"+td.used[id]:"")).join("、")||"沒有";
  /* 三顆星：紀錄裡有的（gsvEnd 存的）＋這一局過關拿到的（不管 gsvEnd 先叫後叫都對）。下一關剛開：多一句 */
  const P=gsvProg(),hd=td.hard?1:0,now=win?GSV.stars(td,st.board):null,rec=GSV.recStars((hd?P.h:P.c)[n],n).map((x,i)=>x||(now&&now[i])?1:0),nx=win&&!hd&&GSV.LVN.includes(n)&&((P.c[n]||{}).w||0)<=1?(()=>{   /* 11/16：列出「這一局之前鎖著、贏了以後開了」的關（照 lockWhy 和誰加入了），用 lvName；不再寫死 n+1 */
    const has=gsvHas(),R0=P.c[n]||{},at=o=>Object.assign({},P,{c:Object.assign({},P.c,{[n]:Object.assign({},R0,o)})}),P0=at({w:0,l:Math.max(1,R0.l||0)}),P1=at({w:Math.max(1,R0.w||0)});   /* P0＝這一關打過但沒贏（「打過主線」那條照舊成立，只差勝負） */
    const op=GSV.LVN.filter(k=>k!==n&&GSV.lockWhy(P0,k,0,false,has)&&!GSV.lockWhy(P1,k,0,false,has)).map(k=>GSV.lvName(k));
    return`<p style="font-size:13px;text-align:center">🔓 ${op.length?op.join("、")+"、":""}這一關的困難版開放了</p>`})():"";
  modal(`<div class="em">${win?"✨":draw0?"🤝":"🌀"}</div><h2>${win?"破陣":draw0?"不分勝負":"星門失守"}</h2><p class="muted">${esc(why)}・🌠 星門圍城・${esc(GSV.lvName(n))}・${esc(V.nm||td.nm)}${hd?"（困難版）":""}</p>
    <p class="gsv-gl">${gsvStarsHTML(n,rec,now)}</p>${nx}
    <p style="font-size:13.5px;text-align:center">打了 <b>${td.rnd}</b> 回合・你造成 <b>${M.dealt}</b>・你受到 <b>${M.taken}</b>・剩 HP ${Math.max(0,M.hp)}／${M.max}・星樞剩 ${Math.max(0,E.hp)}／${E.max}</p>
    <p style="font-size:13px;text-align:center">截援 ${td.icpt} 次・部署 ${td.dep} 次・用過的招：${esc(used)}</p>${!win&&V.tip?`<p class="muted" style="font-size:13px">💡 ${esc(V.tip)}</p>`:""}
${XPR||""}`,
    [["↻ 再打一次",()=>gsvStart(n,k,cv,td.sk,true,hd)],["返回選關",()=>gsvSelect(k,cv),true],["再看一下星盤",null,true]],"res")}
/* ---------- 11/15 星門圍城也能切 3D 星盤（開發者：「星門圍城也可以切換成 3D 模式，像星淵對戰那樣」）----------
   視角三種跟舊版塔防同一套（07bht BHTD_VW：全局俯視／臨陣斜角／純淨平面；頂欄右上「👁」點一下換下一種＋小選單），存檔鍵 gsvView 自己記：沒選過＝平面（星門圍城的預設不變），不跟舊版的 bhtdView 連動。
   3D＝黑洞巨盤＋park3d 塔防固定鏡頭（07bht bhtdParkEx 問 gsvParkEx）：一指拖空白繞整球、兩指縮放、放手回正、腳下光環、敵方描邊都是 park3d 開了塔防鏡頭就有的。
   盤上記號照類名分三種（gsvMkKind）：圈、框、可點的目標貼平在盤面（07bht bhtdGnd），徽章和文字直立，漢字牌貼在頭頂（park3d headOf）；座標一律走 07bht bhtdXY。
   頂欄「去園子下棋（3D）／回棋盤模式」那顆（手機收在「⋯ 更多」）：06-cpu parkBtn 一開頭問 gsvParkBtn，星門圍城對局中＝切到 3D／回平面。
   3D 開不起來（裝置不支援、載入失敗：06-cpu parkDraw 會把 park3d 關掉）→ 視角存回平面，照平面棋盤下。車輪戰（07bhw）不走這裡，照舊平面。 */
let GSV_P3=0,GSV_V3="top",GSV_VMT=0,GSV_FN=0;   /* P3＝這盤已經要過 3D（park3d 開著）；V3＝上一次用的 3D 視角（「更多」那顆切回 3D 用）；VMT＝視角小選單的計時；FN＝gsvFrame 數格 */
const gsvVwOk=v=>v==="top"||v==="tilt"||v==="flat";
function gsvVwNorm(v,foc){return gsvVwOk(v)&&!foc?v:"flat"}   /* 存的值 → 這盤真正用的視角：沒存過、不認得、專注棋盤／螢幕報讀模式（focusOn）＝平面 */
function gsvVwNext(v){return({top:"tilt",tilt:"flat",flat:"top"})[v]||"top"}   /* 「👁」點一下的順序跟舊版塔防一樣 */
function gsvParkTo(v,last){return v==="flat"?(last==="tilt"?"tilt":"top"):"flat"}   /* 「更多」那顆：平面 → 上一次的 3D 視角（沒有就全局俯視）；已經在 3D → 回平面 */
function gsvP3Step(v,p3,asked){return v==="flat"||p3===true?null:asked?(p3===false?"fail":null):"ask"}   /* 要 3D 時怎麼動 park3d：ask＝第一次，把它打開；fail＝開過卻被關掉（3D 開不起來）；null＝不用動 */
const gsvVw=()=>{let v="flat",f=false;try{v=store.get("gsvView","flat")}catch(e){}try{f=typeof focusOn==="function"&&!!focusOn()}catch(e){}return gsvVwNorm(v,f)};
function gsvP3Sync(){const v=gsvVw();if(v==="flat"){GSV_P3=0;return v}GSV_V3=v;let p=null;try{p=store.get("park3d",null)}catch(e){}const s=gsvP3Step(v,p,GSV_P3);
  if(s==="ask"){try{store.set("park3d",true)}catch(e){}GSV_P3=1}else if(s==="fail"){GSV_P3=0;try{store.set("gsvView","flat")}catch(e){}return"flat"}else if(p===true)GSV_P3=1;return v}
/* 平面棋盤：07bht bhtdFlat 問這裡（08b render 一開頭、頂欄還沒畫）；選了 3D 就在這裡先把 park3d 打開 */
function gsvFlat(st){if(!gsvIs(st))return false;try{return gsvP3Sync()==="flat"}catch(e){return true}}   /* 出錯（這支還沒載完就被問到）＝平面 */
function gsvParkEx(st){if(!gsvIs(st))return{bhBoss:null,tdCam:null};let v="flat";try{v=gsvP3Sync()}catch(e){}return{bhBoss:null,tdCam:v==="flat"?null:v,tdFx:typeof bhtdFxLv==="function"?bhtdFxLv():2}}
function gsv3d(){try{return typeof bhtd3d==="function"&&!!bhtd3d()}catch(e){return false}}
function gsvSetView(v){if(!gsvVwOk(v)||v===gsvVw())return;
  if(v!=="flat")try{if(typeof focusOn==="function"&&focusOn()){const fb=!!store.get("focusBoard",false);if(fb)store.set("focusBoard",false);
      if(focusOn()){if(fb)store.set("focusBoard",true);toast("純淨畫面、螢幕報讀模式用平面棋盤");return}if(typeof focusApply==="function")focusApply()}}catch(e){}   /* 照 06-cpu parkBtn：專注棋盤模式開著又要 3D＝把專注模式關掉；純淨畫面、螢幕報讀還開著就不切（那兩種一律平面） */
  try{store.set("gsvView",v);if(v!=="flat"){store.set("park3d",true);GSV_P3=1;GSV_V3=v}}catch(e){}
  try{if(v!=="flat"&&typeof PARK!=="undefined"&&PARK&&PARK.v&&PARK.v.setTdCam)PARK.v.setTdCam(v,typeof bhtdFxLv==="function"?bhtdFxLv():2)}catch(e){}
  GSV_MK="";try{if(typeof window!=="undefined"&&window.cgPlay&&window.cgPlay.rr)window.cgPlay.rr()}catch(e){}gsvViewUi()}   /* 平面↔3D：08b 重畫（PARK_OFF 照 bhtlFlat→bhtdFlat→gsvFlat），頂欄那顆的字也跟著換 */
function gsvVwFix(){if(gsvVw()==="flat"||gsvP3Sync()!=="flat")return;GSV_MK="";gsvViewUi();try{if(typeof window!=="undefined"&&window.cgPlay&&window.cgPlay.rr)window.cgPlay.rr()}catch(e){}}   /* gsvFrame 每秒查一次：3D 載入失敗是事後才把 park3d 關掉的，那時沒有人重畫 */
function gsvParkBtn(){const st=GSV_ST;if(!st||!gsvIs(st)||typeof document==="undefined"||!document.body||!document.body.classList.contains("gsv-on"))return false;
  const to=gsvParkTo(gsvVw(),GSV_V3),go=()=>{try{gsvSetView(to);if(gsvVw()===to)toast(to==="flat"?"回到平面棋盤":"🌀 3D 星盤（右上 👁 換視角）")}catch(e){console.warn("[gsv]",e)}};try{vibrate(8)}catch(e){}
  /* 11/15 實機：從「⋯ 更多」那張卡片按的時候，卡片在瀏覽器歷史多墊了一層（00-util sheet 的 xqSheet），當下就重畫頂欄會把返回鍵算成「回這一頁自己」（字變成「回園子對局」、按了不動）——等卡片關掉、那一層退掉再切 */
  let inSheet=false;try{inSheet=!!(history.state&&history.state.xqSheet)}catch(e){}if(inSheet)setTimeout(go,320);else go();return true}
function gsvViewUi(){if(typeof document==="undefined"||typeof BHTD_VW==="undefined")return;const tr=document.getElementById("topRight");if(!tr)return;let b=document.getElementById("gsvView");
  if(!b){b=document.createElement("button");b.type="button";b.id="gsvView";b.className="ib";b.addEventListener("click",e=>{e.stopPropagation();try{vibrate(5)}catch(z){}gsvSetView(gsvVwNext(gsvVw()));gsvViewMenu(true)});tr.prepend(b)}
  const v=gsvVw();if(b.dataset.v!==v){b.dataset.v=v;b.innerHTML=`<span aria-hidden="true">👁</span><small>${BHTD_VW[v]}</small>`;b.setAttribute("aria-label","視角："+BHTD_VW[v]+"（點一下換下一種）");b.title="視角："+BHTD_VW[v]}}
function gsvViewOut(e){const t=e.target;if(t&&t.closest&&(t.closest("#gsvViewM")||t.closest("#gsvView")))return;gsvViewMenu(false)}
function gsvViewMenu(show){if(typeof document==="undefined")return;let m=document.getElementById("gsvViewM");clearTimeout(GSV_VMT);if(!show){if(m)m.remove();removeEventListener("pointerdown",gsvViewOut,true);return}
  if(!m){m=document.createElement("div");m.id="gsvViewM";m.setAttribute("role","menu");m.setAttribute("aria-label","視角");document.body.append(m);
    m.addEventListener("click",e=>{const b=e.target.closest("[data-v]");if(!b)return;e.stopPropagation();try{vibrate(5)}catch(z){}gsvSetView(b.dataset.v);gsvViewMenu(false)});setTimeout(()=>addEventListener("pointerdown",gsvViewOut,true),0)}
  const v=gsvVw();let port=false;try{port=matchMedia("(orientation:portrait)").matches}catch(e){}
  m.innerHTML=Object.keys(BHTD_VW).map(k=>`<button type="button" role="menuitemradio" aria-checked="${k===v}" data-v="${k}" class="${k===v?"on":""}">${k===v?"●":"○"} ${BHTD_VW[k]}<small>${BHTD_VWD[k]}</small></button>`).join("")+(port?"<p>📱 手機轉成橫向，星盤會更大</p>":"");
  GSV_VMT=setTimeout(()=>gsvViewMenu(false),6000)}
/* 3D 星盤上的記號（純函式，node 測試 test-gate-siege-3d.js）。gsvMkKind(類名)：head＝棋子頭頂（漢字牌 pnm）；up＝直立（徽章 bd、文字標籤 lb／gt、選目標的直立點擊區 hit）；
   gnd＝貼平在盤面（星門 gate、紅圈 ring、守門點 trap、補給點 dp、可點的目標 tg，還有舊版塔防的選中底光 selg、落點 ink、準星 aim）。
   不認得的類名一律直立：之後新加的記號，圈狀的沿用 ring／gate／trap／dp 這幾個類名就會貼地，徽章用 bd 就直立，不用改這裡 */
const GSV_GND=/\b(gate|ring|trap|dp|tg|selg|ink|aim)\b/;
function gsvMkKind(k){k=String(k||"");return/\bpnm\b/.test(k)?"head":/\b(bd|lb|gt|hit)\b/.test(k)?"up":GSV_GND.test(k)?"gnd":"up"}
const gsvMkTx=t=>String(t||"").replace(/<i>/g," ").replace(/<[^>]*>/g,"").trim();
/* gsvMk3(平面記號, 盤面, o)：換成 3D 用的一份。貼地的記號不放字（會被透視壓扁）：字另起一塊直立標籤（星門用舊版塔防的「門 N」gt，其他用 lb）；
   可點的目標在有棋子的格多一塊直立的透明點擊區（hit：從腳到頭，點在角色身上也算；排在貼地目標圈的下面，圈優先）；
   o.sel／o.targets＝選中子底光、落點水墨點、可吃紅準星（塔防鏡頭下 park3d 不畫自己的綠點紅圈）；o.pnm＝每顆子頭頂一塊漢字牌。這幾種直接用舊版塔防的類名與樣式（c:"bt"＝bt-mk）。
   疊放順序：貼地圈 → 直立點擊區 → 貼地目標鈕 → 直立徽章與標籤 → 漢字牌 */
function gsvMk3(L,b,o){o=o||{};b=b||[];const G=[],H=[],B=[],U=[],P=[];
  if(o.sel>=0){G.push({sq:o.sel,k:"selg",c:"bt"});for(const t of o.targets||[])G.push({sq:t,k:b[t]?"aim":"ink",c:"bt"})}
  for(const m of L||[]){const kd=gsvMkKind(m.k);if(kd!=="gnd"){(kd==="head"?P:U).push(m);continue}
    if(m.b){B.push(m);if(b[m.sq])H.push({sq:m.sq,k:"tg hit",b:1,h:1});continue}
    const t=gsvMkTx(m.t);G.push(t?Object.assign({},m,{t:""}):m);if(t)U.push(/\bgate\b/.test(m.k)?{sq:m.sq,k:"gt",c:"bt",t}:{sq:m.sq,k:"lb lb"+String(m.k).split(" ")[0],t})}
  if(o.pnm)for(let q=0;q<90;q++){const p=b[q];if(!p)continue;const r=p===p.toUpperCase();P.push({sq:q,k:"pnm "+(r?"r":"b"),c:"bt",t:(r?GSV.PCN[p]:GSV.PBN[p.toUpperCase()])||""})}
  return G.concat(H,B,U,P)}
/* 一個記號在 3D 星盤上放哪（純函式）：kd＝gsvMkKind；p＝那一格（腳下）的螢幕座標；M＝bhtdGnd 算的貼地矩陣（算不出來就直立）；head＝頭頂的螢幕座標（只有 hit 用）。
   回 {x,y}，貼地多 m（CSS matrix），直立點擊區多 w、h（px）；「門 N」照舊版塔防抬高 .62 格 */
function gsvPos3(kd,cls,p,cell,M,head){cls=String(cls||"");if(kd==="gnd"&&M)return{x:p.x,y:p.y,m:M};
  if(/\bbd\b/.test(cls)&&head)return{x:head.x+cell*.55,y:head.y-cell*.5,hd:1};   /* 11/15 實機：徽章放腳邊會被角色和漢字牌擋掉一半（侵、侵!）——那一格有棋子就掛在頭頂漢字牌的右上角（hd＝不要再套腳邊的偏移） */
  if(/\bhit\b/.test(cls)&&head)return{x:(p.x+head.x)/2,y:(p.y+head.y)/2,w:cell*.7,h:Math.max(cell*.5,Math.hypot(head.x-p.x,head.y-p.y))};
  return{x:p.x,y:p.y-(/\bgt\b/.test(cls)?cell*.62:0)}}

