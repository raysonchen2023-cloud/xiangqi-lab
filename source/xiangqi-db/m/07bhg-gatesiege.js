/* ---------- 黑洞・星門圍城 gate-siege-v1（開發者 11/15：ChatGPT 提案《黑洞塔防重設計_星門圍城》第十二節 A＋《72關、修為招式與AI融合》第 9 節第 1、3、6 關切片、第 11 節 35 招映射）----------
   候選試玩：跟舊版 BHTD v3（07bht-td.js）並存，不覆蓋舊戰局；journey "bh:gs1"～"bh:gs6"（11/15 補第 2、4、5 關），td.mode＝"gate-siege-v1"、td.mv＝模式版本。前綴 GSV／gsv（全域先 grep 過沒撞名）。
   分三塊：
   ① GSV＝純規則（不碰畫面；node 測試 xiangqi-lab/tools/test-gate-siege.js 用 vm 直接載這支檔；腳本對照 xiangqi-lab/tools/gate-siege-sim.js 也用同一份）：
      雙方同式傷害 dmg、數值盾池、靈力預算（每回合正向收入上限 10）、回復總量 40%、冷卻、每回合至多一招、紅 8 子＋後備部署、敵 16 子波次預算、預告、合法生成、
      入侵卒、護陣卒、截援、星核同批次結算（雙方同時歸零判和）、八回合無進展判和、七星 35 招（修為 1／6／12／17／23 解鎖、最多帶 4 招）、星樞候選評估 pick。
   ② 畫面（gsv*）：選關卡片 gsvSelect、對局 HUD（#gsvEn、#gsvMe、#gsvOv）、結果視窗；一律平面棋盤（bhtdFlat 問 gsvIs）。
   ③ 接線：包一層 window.XQ_TD（local.js 只認這個），td.mode 是星門圍城就交給 GSV，其他照舊交給 BHTD。
   入口：黑洞關卡卡片（bhtdSelect）的「🌠 星門圍城」；本機主控台 gsvOpen()。
   存檔鍵 gsv＝{mv:"gate-siege-v1",c:{關:{w,l,d,best}},sk:{角色:[招]}}，跟舊版三星（bhtd、bhtdDust）分開。 */
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
  const GROW={hp:5,atk:5,def:5},TAU=42;                    /* 修為窄幅加成上限：HP +5%、ATK +5、DEF +5（靈力收入不隨等級放大） */
  const G=L=>{L=Math.max(1,Math.min(100,+L||1));return(1-Math.exp(-(L-1)/TAU))/(1-Math.exp(-99/TAU))};
  /* 七星（提案一 5.4）：HP／ATK／DEF／靈力容量；本命子 pc */
  const CH={x_swordboy:{n:"齊轍",nk:"阿轍",pc:"R",hp:105,atk:110,def:20,sp:90},x_spiritgirl:{n:"田飛燕",nk:"燕子",pc:"B",hp:100,atk:95,def:45,sp:100},
    x_martialgirl:{n:"雷借花",nk:"花兒",pc:"C",hp:95,atk:115,def:20,sp:100},x_miaogirl:{n:"駱躍梅",nk:"小梅",pc:"N",hp:95,atk:105,def:25,sp:100},
    x_shuai:{n:"沈方庭",nk:"方庭",pc:"K",hp:90,atk:100,def:30,sp:110},x_shi:{n:"鐵連城",nk:"城子",pc:"A",hp:115,atk:90,def:50,sp:90},x_bing:{n:"步越溪",nk:"溪兒",pc:"P",hp:100,atk:105,def:20,sp:100}};
  function stats(ck,L){const c=CH[ck]||CH.x_swordboy,g=G(L);
    return{ck:CH[ck]?ck:"x_swordboy",n:c.n,nk:c.nk,pc:c.pc,L:Math.max(1,Math.min(100,Math.round(+L||1))),hp:Math.round(c.hp*(1+GROW.hp/100*g)),atk:c.atk+Math.round(GROW.atk*g),def:c.def+Math.round(GROW.def*g),sp:c.sp,sp0:SP0,rg:RG}}
  /* 同式傷害（提案一 5.1）：未吸收傷害＝max(1, round(基礎 × 攻方ATK/100 × 100/(100+守方DEF)))；基礎 0 就是 0 */
  function dmg(base,atk,def){base=+base||0;if(base<=0)return 0;return Math.max(1,Math.round(base*(+atk||100)/100*100/(100+Math.max(0,+def||0))))}
  /* 盾池吸收：最少 1 是吸收前的規則，盾可以把 HP 損失吸到 0 */
  function absorb(sh,raw){const a=Math.min(Math.max(0,sh&&sh.v||0),raw);return{abs:a,loss:raw-a}}
  /* ===== 關卡（提案二第一章關名；第 1、3、6 關切片，11/15 補第 2、4、5 關＝提案一第七節前五關表）=====
     座標 [路,線]：路 1～9 由左到右（紅方看過去）、線 1＝紅底線…線 10＝黑底線。red＝紅方開場 8 子、res＝後備 8 子（合計＝標準 16 子）；
     dp＝補給點 {id,sq:[路,線],al:允許棋種}；open＝敵開場 [子,路,線,標記]；waves＝{at:第幾回合結束落下,p:[[子,路,線,標記]…]}（開場＋波次＝剛好 16）。
     標記：inv＝入侵卒（停在我方半場：進來那回合預告，下個回合結束還在才扣）、guard＝護陣卒（每顆在場星樞 DEF+20）、drain＝奪靈馬（擒子再扣你 8 靈）。
     esp0＝星樞開場靈力；esk＝星樞會用的招（esh 星樞護盾：目前沒有關卡用、zjhl 卒將號令：第 6 關、pao 隔山星砲：第 5 關）；ph＝分段（星樞 HP 降到 hp 比例就解鎖 esk 那一招，只解鎖、不加兵、不當下打）；
     depth＝星樞候選搜尋深度（提案一第十一節前五關 2、2、3、3、4；第 6 關 3）。 */
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
      say:"星樞卒將坐鎮：兩顆入侵卒在河邊待命、兩顆護陣卒，還會預告「卒將號令」。",tip:"「卒將號令」要靠號令卒留在你的半場；吃掉號令卒就能取消"}};
  const LVN=Object.keys(LV).map(Number);
  /* 星樞的招（敵方每回合最多一招，也要付靈力、有冷卻） */
  const ESK={esh:{nm:"星樞護盾",cost:20,cd:3,d:"星樞得 20 點護盾，兩回合到期"},zjhl:{nm:"卒將號令",sn:"號令",cost:40,cd:4,base:28,d:"預告一回合：下回合結束時，號令卒還在你的半場，就對你的星核造成基礎 28 傷害；號令卒被吃或不在你的半場就取消"},
    pao:{nm:"隔山星砲",sn:"星砲",cost:40,cd:4,base:30,d:"預告一回合：指定一門砲、砲架和你的一顆子。下回合結束時三顆都還在原線上、中間只隔這一個砲架、砲還能合法吃到它，就對你的星核造成基礎 30 傷害；移走目標、吃掉砲或砲架、多擋一子就取消（不換砲、不換架）"}};
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
    const red=RED.map(([p,lu,xi])=>[p,LSQ(lu,xi)]),open=V.open.map(([p,lu,xi,tg])=>[p,LSQ(lu,xi),tg||""]);
    const waves=[];V.waves.forEach((w,wi)=>w.p.forEach(([p,lu,xi,tg],i)=>waves.push({id:"w"+(wi+1)+"_"+(i+1),wv:wi+1,at:w.at,p,sq:LSQ(lu,xi),tag:tg||"",dl:0,st:"wait"})));
    return{red,open,waves,res:RES.slice(),dp:DP.map(d=>({id:d.id,sq:LSQ(d.sq[0],d.sq[1]),al:d.al}))}}
  function startBoard(n){const pl=plan(n);if(!pl)return null;const b=new Array(90).fill(null);for(const[p,q]of pl.red)b[q]=p;for(const[p,q]of pl.open)b[q]=p;return b}
  function startFen(n,C){const b=startBoard(n);if(!b)throw new Error("星門圍城沒有第 "+n+" 關");return C.fen(b,"r").split(" ")[0]}
  /* 開局＋波次合法檢查（提案一 7「排好後跑標準子數、仕相可達位置、將帥及合法步檢查」）：回傳錯誤清單（空＝通過） */
  function lvCheck(n,C){const err=[],pl=plan(n);if(!pl)return["沒有這一關"];const b=new Array(90).fill(null),cnt={},rc={};
    for(const[p,q]of pl.red){if(b[q])err.push(`紅${PCN[p]}跟別的子重疊（格 ${q}）`);else if(!canStand(p,q))err.push(`紅${PCN[p]}不能站格 ${q}`);b[q]=p;rc[p]=(rc[p]||0)+1}
    for(const p of pl.res)rc[p]=(rc[p]||0)+1;
    for(const p in STD)if((rc[up(p)]||0)!==STD[p])err.push(`紅${PCN[up(p)]}開場＋後備共 ${rc[up(p)]||0} 顆（要剛好 ${STD[p]}）`);
    if(pl.red.length!==8)err.push(`紅方開場要 8 子，現在 ${pl.red.length}`);
    for(const[p,q]of pl.open){if(b[q])err.push(`${PBN[up(p)]}跟別的子重疊（格 ${q}）`);else if(!canStand(p,q))err.push(`${PBN[up(p)]}不能站格 ${q}`);b[q]=p;cnt[p]=(cnt[p]||0)+1}
    for(const w of pl.waves){cnt[w.p]=(cnt[w.p]||0)+1;if(!canStand(w.p,w.sq))err.push(`星門的${PBN[up(w.p)]}落點不合法（格 ${w.sq}）`);if(b[w.sq])err.push(`星門 ${w.id} 開局就有子（格 ${w.sq}）`);if(redHalf(w.sq))err.push(`星門 ${w.id} 不在敵方半場`)}
    for(const p in STD)if((cnt[p]||0)!==STD[p])err.push(`${PBN[up(p)]}共 ${cnt[p]||0} 顆（開場＋波次要剛好 ${STD[p]}）`);
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
  function boot(cfg,P,C){cfg=cfg||{};const n=+cfg.lv,V=LV[n];if(!V)throw new Error("星門圍城沒有第 "+cfg.lv+" 關");const pl=plan(n),st=stats(cfg.ch,cfg.L);
    const td={mode:MODE,mv:MV,lv:n,nm:V.nm,ch:st.ck,cn:st.n,nk:st.nk,L:st.L,rnd:0,seq:0,ev:[],q:[],over:null,
      me:core({hp:st.hp,atk:st.atk,def:st.def,sp0:SP0,spMax:st.sp}),en:core({hp:V.hp,atk:V.atk,def:V.def,sp0:V.esp0,spMax:100}),
      sk:skPick(st.ck,st.L,cfg.sk),cd:{},cdAt:{},used:{},sk1:-1,res:pl.res.slice(),dep:0,dp:pl.dp,ids:{},meta:{},lost:[],
      waves:pl.waves,arm:{},icpt:0,ctl:{frz:[],noCap:[],noTake:[],trap:null,lock:[],imm:{}},buf:{},fx:null,ecd:{},np:0,last:{r:null,b:null},log:[],rs:V.rs,esk:V.esk.slice(),depth:V.depth,
      phs:(V.ph||[]).map(o=>({hp:o.hp,esk:o.esk})),phn:0};
    let ri=0,bi=0;for(let q=0;q<90;q++){const p=P.board[q];if(!p)continue;const red=sd(p)==="r",id=red?"r"+(++ri):"b"+(++bi);td.ids[q]=id;
      const o=pl.open.find(x=>x[1]===q);td.meta[id]={p,home:q,tag:!red&&o?o[2]:""}}
    ev(td,{k:"start",nm:V.nm});return td}
  /* ===== 共用結算小工具 ===== */
  const defOf=(td,side)=>side==="b"?td.en.def+GUARD*guards(td):td.me.def;
  function guards(td){let n=0;for(const q in td.ids){const id=td.ids[q];if(tagOf(td,id)==="guard")n++}return n}
  function queue(td,to,base,why,o){const A=to==="b"?td.me:td.en,raw=dmg(base,A.atk,o&&o.def!=null?o.def:defOf(td,to));if(o)delete o.def;const e=Object.assign({to,base,raw,why},o||{});td.q.push(e);return e}
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
        const e=queue(td,"b",CAPB[vp]+(fc?FOCUS:0),"cap",{vp,cp:pt,fc:fc?1:0,tag:gtag,def:def0});ev(td,{k:"cap",by:"r",vp,cp:pt,sq:t,raw:e.raw,fc:e.fc,tag:gtag});
        if(fc)td.fc=null;
        const sg=spGain(td.me,CAP_SP);if(sg)ev(td,{k:"sp",to:"r",n:sg,why:"擒子"});
        if(gtag==="guard")ev(td,{k:"guard",sq:t,def:defOf(td,"b")});if(gtag==="inv")delete td.arm[vid];}
      if(m.ck&&R-td.en.lastChk>=CHK_GAP){td.en.lastChk=R;const e=queue(td,"b",CHK,"chk");ev(td,{k:"chk",by:"r",raw:e.raw})}
      const B3=td.buf.bu3;if(B3&&B3.n>0&&R<B3.until&&td.last.r.fwd){B3.n--;heal(td,4,"跑腿賺錢")}
      return null}
    /* 黑方 */
    td.last.b={id,p:pt,f,t,cap:!!m.cap,ck:!!m.ck};
    if(m.cap){td.np=-1;let red=0,why="";const B=td.buf;
      if(B.qi3&&B.qi3.id===vid&&B.qi3.until>R){red+=10;why="輪牌護身";delete B.qi3}
      if(B.pair&&B.pair.until>R){if(B.pair.armed===vid){red+=10;why=why?why+"、雙燕斜護":"雙燕斜護";delete B.pair}else if(B.pair&&(B.pair.a===vid||B.pair.b===vid))B.pair.armed=B.pair.a===vid?B.pair.b:B.pair.a}
      const e=queue(td,"r",CAPB[vp],"cap",{vp,cp:pt});if(red){e.cut=Math.min(e.raw,red);e.raw-=e.cut;e.cutWhy=why}
      ev(td,{k:"cap",by:"b",vp,cp:pt,sq:t,raw:e.raw,cut:e.cut||0,cutWhy:why});
      const M=vid&&td.meta[vid];if(M&&vp!=="K")td.lost.push({id:vid,p:M.p,home:M.home});
      spGain(td.en,CAP_SP);
      if(tagOf(td,id)==="drain"&&td.drR!==R){const n=Math.min(DRAIN,td.me.sp);td.me.sp-=n;td.drR=R;ev(td,{k:"drain",sq:t,n})}}   /* 奪靈馬：真的擒到子才扣，每回合最多一次 */
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
      if(s!=null&&v>ov){ov=v;o={src:td.ids[f],scr:td.ids[s],tg:td.ids[t]}}}return o&&o.src&&o.scr&&o.tg?o:null}};
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
    return null}
  /* 入侵：這次結算會扣的（已預告、還在我方半場）；pre＝不改狀態，只看（畫面「本輪若不處理」、AI 都用這個） */
  function invHits(td){const H=[];for(const q in td.ids){const id=td.ids[q],sq=+q;if(tagOf(td,id)!=="inv"||!redHalf(sq))continue;if(td.arm[id])H.push({id,sq,base:inPal(sq,"r")?INV_PAL:INV})}
    H.sort((a,b)=>b.base-a.base);return H.slice(0,INV_MAX)}
  /* ===== 回合結算（提案一 4.2 第 5 步：星核傷害、護盾、入侵、靈力，再處理預告過的星門）===== */
  function settle(P,C){const td=P.td,R=td.rnd,b=P.board,M=td.me,E=td.en,hp0=[M.hp,E.hp];
    /* 1. 入侵 */
    for(const h of invHits(td)){const e=queue(td,"r",h.base,"inv",{sq:h.sq});const Q=td.buf.qyhp;if(Q&&Q.until>R&&Q.left>0){const c=Math.min(Q.left,e.raw);Q.left-=c;e.raw-=c;e.cut=c;e.cutWhy="青玉護棚"}}
    for(const q in td.ids){const id=td.ids[q],sq=+q;if(tagOf(td,id)!=="inv")continue;if(redHalf(sq)){if(!td.arm[id]){td.arm[id]=1;ev(td,{k:"warn",sq,raw:dmg(inPal(sq,"r")?INV_PAL:INV,E.atk,M.def)})}}else delete td.arm[id]}
    for(const id in td.arm)if(sqOfId(td,id)==null)delete td.arm[id];
    /* 2. 星樞預告的大招 */
    if(td.fx&&td.fx.at===R+1){const F=td.fx,sq=fxSq(td,b,C);if(sq!=null){const e=queue(td,"r",F.base,"esk",{id:F.id,sq});ev(td,{k:"eskHit",id:F.id,raw:e.raw})}else ev(td,{k:"eskOff",id:F.id});td.fx=null}
    /* 3. 一批套盾、扣 HP */
    const tot={r:0,b:0};for(const e of td.q){const T=e.to==="r"?M:E,A=absorb(T.sh,e.raw);T.sh.v-=A.abs;T.hp-=A.loss;tot[e.to]+=A.loss;if(e.to==="r"){M.taken+=A.loss;E.dealt+=A.loss}else{E.taken+=A.loss;M.dealt+=A.loss}
      ev(td,Object.assign({k:"hit",to:e.to,why:e.why,raw:e.raw,abs:A.abs,loss:A.loss,vp:e.vp,cut:e.cut||0,cutWhy:e.cutWhy||"",sq:e.sq},e.why==="esk"?{id:e.id}:{}))}
    td.q=[];M.lastLoss=tot.r;
    /* 九宮守心：帥在九宮正中心就回 4 */
    const H5=td.buf.shen5;if(H5&&H5.n>0){if(b[76]==="K"){H5.n--;heal(td,4,"九宮守心")}else delete td.buf.shen5}
    /* 4. 星核同一批結算 */
    let end=null;const a=M.hp<=0,z=E.hp<=0;
    if(a&&z)end={w:null,why:"雙方星核同一批結算同時歸零，判和"};else if(z)end={w:"r",why:"星樞星核歸零"};else if(a)end={w:"b",why:"我方星核歸零"};
    /* 5. 星門（先落子、延遲、取消） */
    let spawned=0;if(!end)spawned=gates(P,C);
    /* 6. 靈力：每完整回合回復（受每回合收入上限）。td.pool＝黑洞車輪戰（07bhw-wheel.js）共用靈力池：我方不在這裡回、收入上限也不在這裡歸零，改由車輪戰的總輪處理 */
    if(!end){if(!td.pool)spGain(M,RG);spGain(E,RG)}
    /* 7. 無進展 */
    const prog=td.np<0||hp0[0]!==M.hp||hp0[1]!==E.hp||spawned>0;td.np=prog?0:td.np+1;
    if(!end&&td.np>=NOPROG)end={w:null,why:"連續 8 回合沒有進展，依星門圍城規則判和"};
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
  function preview(td,b,C){const M=td.me,E=td.en,L=[];for(const h of invHits(td)){let raw=dmg(h.base,E.atk,M.def);const Q=td.buf.qyhp;if(Q&&Q.until>td.rnd)raw=Math.max(0,raw-Q.left);L.push({k:"inv",sq:h.sq,raw})}
    if(td.fx&&td.fx.at===td.rnd+1){const sq=fxSq(td,b,C);if(sq!=null)L.push({k:"esk",id:td.fx.id,sq,raw:dmg(td.fx.base,E.atk,M.def)})}
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
    const c=costOf(td,id);const run=RUN[id];if(!run)return{err:"這一招還沒做"};const r=run({P,td,b,C,R,M,E:td.en},tg);if(r&&r.err)return r;
    M.sp-=c;if(td.buf.disc&&c>0&&id!=="bu5"&&td.buf.disc.until>R)delete td.buf.disc;td.cd[id]=S.cd;td.cdAt[id]=R;td.sk1=R;td.used[id]=(td.used[id]||0)+1;
    ev(td,Object.assign({k:"skill",id,nm:S.nm,cost:c,tg},r||{}));return{ok:1}}
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
    return{gsv:1,depth:td.depth||2,mpv:8,err:0,margin:0,sm,b:P.board.slice(),td:clone(td),C,turn:P.turn}}
  function simB(cfg,f,t){const C=cfg.C,P2={board:cfg.b.slice(),turn:"b",td:clone(cfg.td),moves:[],pos:[C.fen(cfg.b,"b")],ed:[],human:"r"};const m=C.stateApply(P2,f,t),r=move(P2,m,C);return{P2,m,end:r&&r.end}}
  /* 下一回合紅方一步能不能讓星樞輸（將死、或擒子＋將軍的一批傷害打空星核）；只看紅方一步，不看紅方的招 */
  function lethalR(P2,C){const b=P2.board,td=P2.td,E=td.en,room=E.hp+E.sh.v;let mate=false,core=false;
    for(const[f,t]of L_(b,"r",C)){const x=C.make(b,f,t),ck=ck_(x,"b",C);let raw=0;if(b[t])raw+=dmg(CAPB[up(b[t])],td.me.atk,defOf(td,"b"));if(ck&&td.rnd-E.lastChk>=CHK_GAP)raw+=dmg(CHK,td.me.atk,defOf(td,"b"));
      if(raw>=room)core=true;if(ck&&!L_(x,"b",C).length){mate=true;break}}return{mate,core}}
  function scoreB(cfg,f,t,v){const C=cfg.C,S=simB(cfg,f,t),td=S.P2.td,M0=cfg.td.me,E0=cfg.td.en;
    if(S.end){if(S.end.w==="b")return 1e7;if(S.end.w==="r")return-1e7;return-2e5}
    if(!L_(S.P2.board,"r",C).length)return 1e7;
    const dR=(M0.hp+M0.sh.v)-(td.me.hp+td.me.sh.v),dB=(E0.hp+E0.sh.v)-(td.en.hp+td.en.sh.v);
    let s=W_HP*(dR-dB)+Math.max(-ENG_CLAMP,Math.min(ENG_CLAMP,v));
    for(const h of invHits(td))s+=W_HP*.7*dmg(h.base,td.en.atk,td.me.def);
    const L=lethalR(S.P2,C);if(L.mate)s-=5e6;else if(L.core)s-=4e6;return s}
  function pick(r,cfg,rnd){rnd=rnd||Math.random;const C=cfg.C,b=cfg.b,L=(r&&r.lines||[]).filter(x=>x&&x.mv);let A=banMoves(cfg.td,b,L_(b,"b",C));if(!A.length)A=L_(b,"b",C);
    const known=new Map(L.map(x=>[x.mv,x.v])),lo=L.length?Math.min(...L.map(x=>x.v)):0;let best=null,bv=-Infinity;
    for(const[f,t]of A){const u=C.iccs(f,t),v=known.has(u)?known.get(u):lo-80,s=scoreB(cfg,f,t,v)+rnd()*10;if(s>bv){bv=s;best=u}}
    return best||(r&&r.best)}
  /* 給腳本對照、測試用：一步模擬紅方（不改原狀態） */
  function simR(P,f,t,C){const P2={board:P.board.slice(),turn:"r",td:clone(P.td),moves:[],pos:[C.fen(P.board,"r")],ed:[],human:"r"};const m=C.stateApply(P2,f,t);move(P2,m,C);return P2}
  return{MODE,MV,CH,LV,LVN,SK,SKM,GEN,ESK,PCN,PBN,STD,CAPB,CHK,CHK_GAP,FOCUS,INV,INV_PAL,INV_MAX,GUARD,SH_CAP,SH_LIFE,DEP_COST,DEP_MAX,ICPT_DRAIN,ICPT_GAIN,NOPROG,HEAL_PCT,SP0,RG,CAP_SP,INC_CAP,GROW,W_HP,DRAIN,
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
function gsvProg(){let o=null;try{o=store.get("gsv",null)}catch(e){}const P=o&&typeof o==="object"&&o.mv===GSV.MODE?o:{};return Object.assign({mv:GSV.MODE,c:{},sk:{},g:[]},P,{c:Object.assign({},P.c),sk:Object.assign({},P.sk),g:Array.isArray(P.g)?P.g:[]})}
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
.gsv-sel .box{max-width:min(96vw,560px)}.gsv-cards{display:grid;gap:6px;margin:8px 0}.gsv-card{display:block;width:100%;text-align:left;font:inherit;color:inherit;background:var(--card,#fff);border:2px solid var(--line,#ddd);border-radius:12px;padding:7px 10px;cursor:pointer;min-height:44px}
.gsv-card.on{border-color:#7a3fb0;box-shadow:0 0 0 2px rgba(122,63,176,.25)}.gsv-card small{display:block;font-size:12px;color:var(--muted,#777)}
.gsv-skl{display:flex;flex-wrap:wrap;gap:6px}.gsv-skl label{font-size:12.5px;border:1.5px solid var(--line,#ccc);border-radius:99px;padding:3px 9px;cursor:pointer}.gsv-skl label.on{border-color:#7a3fb0;background:rgba(122,63,176,.12)}.gsv-skl label.lk{opacity:.4}
.bt-sel .bt-card.bt-gsvc{border-style:double;border-width:3px;border-color:#b46bff}
@media (orientation:portrait) and (max-height:700px){body.gsv-on{--gsvMeH:176px}.gsv-sk{min-height:40px}.gsv-sks.gen .gsv-sk{min-height:36px}}
@media (orientation:landscape){body.gsv-on{--gsvEnH:0px;--gsvMeH:0px}
 #gsvEn{top:var(--bhTop,44px);bottom:0;height:auto;width:calc(200px + env(safe-area-inset-left,0px));right:auto;padding-left:calc(8px + env(safe-area-inset-left,0px))}
 #gsvMe{top:var(--bhTop,44px);left:auto;right:0;width:calc(210px + env(safe-area-inset-right,0px));height:auto;padding-right:calc(8px + env(safe-area-inset-right,0px))}
 #gsvEn .gsv-r,#gsvMe .gsv-r{flex-wrap:wrap;white-space:normal}.gsv-ln{flex:1 1 100%}
 .gsv-sks{grid-template-columns:repeat(2,minmax(0,1fr))}.gsv-tip{position:static;margin-bottom:6px;flex-wrap:wrap;border-radius:10px}
 body.gsv-on .view.fixed>#bbox{top:var(--bhTop,44px)!important;bottom:0!important;left:calc(200px + env(safe-area-inset-left,0px))!important;right:calc(210px + env(safe-area-inset-right,0px))!important}}
@media (prefers-reduced-motion:reduce){.gsv-mk.tg{animation:none}}`;document.head.append(s)}
/* ---------- 選關卡片（黑洞關卡卡片的「🌠 星門圍城」、主控台 gsvOpen()） ---------- */
function gsvCard(){   /* 11/15 開發者試玩後「有挑戰性、沒有那麼無腦獲勝了，可以上線」：開給所有玩家（原本只給開發者） */
  return`<button type="button" class="bt-card bt-gsvc" data-gsv="1" aria-label="星門圍城，第 1～6 關"><div class="hd"><b>🌠 星門圍城</b></div></button>`}
const gsvChar=()=>{let c="";try{c=(typeof myChar==="function"&&myChar())||store.get("pChar","")}catch(e){}return GSV.CH[c]?c:"x_swordboy"};
const gsvL=()=>{try{return typeof xpInfo==="function"?xpInfo().L:1}catch(e){return 1}};
function gsvRulesHTML(){return`<ul class="gsv-rules">
<li>雙方各有一顆<b>星核</b>（HP、ATK、DEF、靈力）。棋子照普通象棋走、照常被吃掉離場；真正將死仍然直接贏。</li>
<li>傷害一律同一條算式：基礎 × 攻方 ATK／100 × 100／(100＋守方 DEF)，至少 1；護盾是數值池（上限 30、兩回合到期），盾可以吸到 0。</li>
<li>擒子基礎：卒 4、士象 6、馬砲 10、車 14；真正將軍 18（同一星核兩回合內最多算一次）；集火擒子 +8。</li>
<li><b>入侵卒</b>（標「侵」）進到你的半場會先預告，下個回合結束還在就扣你 12（進你的九宮 20），最多算兩顆。其他子過河不扣血。</li>
<li><b>護陣卒</b>（標「陣」）每顆讓星樞 DEF +20；吃掉就拆掉那 20。</li>
<li><b>奪靈馬</b>（標「奪」）真的擒到你的子時，再扣你 8 靈力（每回合最多一次）。</li>
<li><b>星樞大招</b>一律先預告一回合、寫明取消條件：卒將號令（號令卒被吃或離開你的半場就取消）；隔山星砲（砲、砲架、目標任一顆離開原線、中間多擋一子、或砲不能合法吃到目標，就取消）。有的關卡星樞 HP 掉到 60%、30% 才解鎖新的大招（只解鎖，不加兵、不當下打）。</li>
<li>援軍從星門落下，至少前兩回合就看得到。你的子站在門上擋一次＝延遲；下回合還擋著＝取消（截援：星樞靈力 −10，第一次截援你回 6 靈）。</li>
<li>每回合：可以先放一招（每回合最多一招），再走一步棋，或花 20 靈力把後備子部署到補給點（部署用掉這一步，每局最多 2 次）。</li>
<li>靈力：開場 35、每回合回 4、擒子 +6，每回合收入最多 10。回復總量每局最多最大 HP 的 40%。</li>
<li>回合結束一起結算：<b>雙方星核同一批結算同時歸零＝和局</b>；連續 8 回合沒有進展也判和。</li></ul>`}
function gsvOpen(){gsvSelect(store.get("era","classic"),false)}
if(typeof window!=="undefined")window.gsvOpen=gsvOpen;
function gsvSelect(k,cover){gsvCss();const ck=gsvChar(),L=gsvL(),st=GSV.stats(ck,L),P=gsvProg(),pool=GSV.SK.filter(s=>s.ch===st.ck);let sel=P.last&&GSV.LV[P.last]?P.last:1;
  let pk=GSV.skPick(st.ck,L,P.sk[st.ck]);
  const card=n=>{const V=GSV.LV[n],R=P.c[n]||{},rec=R.w||R.l||R.d?`勝 ${R.w||0}・和 ${R.d||0}・敗 ${R.l||0}`:"還沒打過",best=R.best?`・最佳 ${R.best.rnd} 回合／剩 ${R.best.hp} HP`:"";
    /* 11/15 開發者「每一個關卡字太多，用極簡」：卡上只留關名＋打過的戰績，數值和說明只給讀屏 */
    return`<button type="button" class="gsv-card${n===sel?" on":""}" data-n="${n}" aria-label="${esc(`第 ${n} 關 ${V.nm}（${V.th}），星樞 HP ${V.hp}、ATK ${V.atk}、DEF ${V.def}，推算 ${V.depth} 步，${rec}${best}。${V.say}`)}"><b>第 ${n} 關・${esc(V.nm)}</b>${R.w||R.l||R.d?`<small aria-hidden="true">${R.w?"✓ ":""}${rec}</small>`:""}</button>`};
  const skH=()=>pool.map(s=>`<label class="${pk.includes(s.id)?"on":""}${s.lv>L?" lk":""}" data-id="${s.id}" title="${esc(s.d)}">${s.lv>L?"🔒 Lv"+s.lv+" ":""}${esc(s.nm)}・${s.cost} 靈</label>`).join("");
  const m=modal(`<div class="em">🌠</div><h2>星門圍城</h2><div class="gsv-cards">${GSV.LVN.map(card).join("")}</div><p style="font-size:13px;margin-bottom:2px">招式（最多 4 招）</p><div class="gsv-skl">${skH()}</div>
    <details><summary>星門圍城規則</summary>${gsvRulesHTML()}</details>`,
    [["⚔ 出戰",()=>gsvStart(sel,k,cover,pk)],["‹ 回黑洞關卡",()=>{try{if(typeof bhtdSelect==="function")bhtdSelect(k,cover)}catch(e){}},true]],"prolog gsv-sel");
  if(!m)return;m.addEventListener("click",e=>{const c=e.target.closest(".gsv-card");if(c){sel=+c.dataset.n;try{vibrate(5)}catch(z){}m.querySelector(".gsv-cards").innerHTML=GSV.LVN.map(card).join("");return}
    const l=e.target.closest(".gsv-skl label");if(l){e.preventDefault();const s=GSV.SKM[l.dataset.id];if(s.lv>L){toast(`🔒 修為 Lv ${s.lv} 解鎖「${s.nm}」`);return}
      if(pk.includes(s.id)){if(pk.length>1)pk=pk.filter(x=>x!==s.id)}else if(pk.length<4)pk=pk.concat([s.id]);else{toast("最多帶 4 招");return}m.querySelector(".gsv-skl").innerHTML=skH()}})}
function gsvStart(n,k,cover,sk,force){const C=gsvC();if(!C)return toast("規則程式還沒載好");const V=GSV.LV[n];if(!V)return toast("沒有這一關");
  const ck=gsvChar(),L=gsvL(),P=gsvProg();P.sk[ck]=GSV.skPick(ck,L,sk);P.last=n;store.set("gsv",P);
  const R0=store.get("bhRet",null);store.set("bhRet",{k:k||(R0&&R0.k)||store.get("era","classic"),cover:k?cover!==false:!!(R0&&R0.cover),at:Date.now(),first:false});
  jStart("bh:gs"+n,{human:"r",lx:V.depth,journey:"bh:gs"+n,lv:{fen:GSV.startFen(n,C),turn:"r"},td:{mode:GSV.MODE,lv:n,ch:ck,L,sk:P.sk[ck]}},()=>{const was=/^#\/journey\/play/.test(location.hash);location.hash="#/journey/play";
    if(was)try{window.dispatchEvent(new Event("xq-play"))}catch(e){}setTimeout(()=>toast(`🌠 星門圍城・第 ${n} 關・${V.nm}`),700);setTimeout(()=>toast("✦ 星樞："+V.say),3200)},!!force)}
/* ---------- 對局中（07bh bhTick 叫） ---------- */
function gsvHide(){if(typeof document==="undefined")return;document.body&&document.body.classList.remove("gsv-on");for(const id of["gsvEn","gsvMe","gsvOv"]){const e=document.getElementById(id);if(e)e.remove()}GSV_TG=null;GSV_MK="";GSV_HK=""}
function gsvTick(st){if(typeof document==="undefined")return;if(!gsvIs(st)||!/^#\/journey\/play/.test(location.hash||"")){if(GSV_ST||document.getElementById("gsvMe"))gsvHide();GSV_ST=null;return}
  const fresh=!GSV_ST||GSV_ST.id!==st.id;GSV_ST=st;gsvCss();document.body.classList.add("gsv-on");if(fresh){GSV_TG=null;GSV_INFO=false;GSV_HK=""}
  const bb=document.getElementById("bbox");if(!bb||!bb.parentNode)return;
  let en=document.getElementById("gsvEn");if(!en){en=document.createElement("div");en.id="gsvEn";bb.after(en);en.addEventListener("click",gsvClick);GSV_HK=""}
  let me=document.getElementById("gsvMe");if(!me){me=document.createElement("div");me.id="gsvMe";en.after(me);me.addEventListener("click",gsvClick);GSV_HK=""}
  if(!document.getElementById("gsvOv")){const o=document.createElement("div");o.id="gsvOv";o.innerHTML=`<div class="mks"></div>`;document.body.append(o);o.addEventListener("click",gsvOvClick)}
  if(GSV_TG&&!gsvMy(st))GSV_TG=null;
  gsvPaint();gsvEvents(st);if(!GSV_RAF)GSV_RAF=requestAnimationFrame(gsvFrame)}
const gsvPct=(a,b)=>Math.max(0,Math.min(100,Math.round(a/Math.max(1,b)*100)));
function gsvFoeLine(td){const F=GSV.fore(td);if(!F.length)return`<span>援軍都下來了</span>`;const g=F[0],cnt={};for(const w of g.ws){const k=GSV.gateNm(w.sq)+"・"+GSV.PBN[w.p.toUpperCase()];cnt[k]=(cnt[k]||0)+1}
  return`<button type="button" data-x="fore"><span>下一波</span>：${Object.keys(cnt).map(k=>esc(k)+"×"+cnt[k]).join("、")}・<b>${g.inR}</b> <span>回合後</span></button>`}
function gsvPaint(){const st=GSV_ST,en=document.getElementById("gsvEn"),me=document.getElementById("gsvMe");if(!st||!en||!me)return;const td=st.td,C=gsvC(),M=td.me,E=td.en,my=gsvMy(st);
  const pv=GSV.preview(td,st.board,C),thr=C&&my?GSV.threats(st.board,C).length:0,def=GSV.defOf(td,"b"),g=GSV.guards(td);
  const fx=td.fx?`<button type="button" class="gsv-fx" data-x="fx">⚠ ${esc(GSV.ESK[td.fx.id].nm)}</button>`:"";
  const hk=JSON.stringify([td.seq,st.turn,!!st.result,GSV_TG&&[GSV_TG.id,GSV_TG.pk,GSV_TG.p],GSV_INFO,GSV_BUSY]);if(hk===GSV_HK)return;GSV_HK=hk;
  en.innerHTML=`<div class="gsv-r"><span class="gsv-nm en">星樞</span><div class="gsv-bar en"><i style="width:${gsvPct(E.hp,E.max)}%"></i><b>HP ${Math.max(0,E.hp)}／${E.max}</b></div>
    <span class="gsv-st">DEF <b>${def}</b>${g?`（<span>護陣</span> +${g*GSV.GUARD}）`:""}</span>${E.sh.v?`<span class="gsv-sh">🛡${E.sh.v}</span>`:""}<span class="gsv-st">靈 <b>${E.sp}</b></span></div>
    <div class="gsv-r"><span class="gsv-ln">${gsvFoeLine(td)}</span>${fx}</div>`;
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
/* 盤上記號：星門（倒數）、入侵卒（侵／預告中）、護陣卒（陣）、號令卒（令）、集火目標、守門點、定身、補給點；選目標時是可以點的發光格 */
function gsvMarks(st){const td=st.td,L=[],C=gsvC(),b=st.board;
  for(const g of GSV.fore(td))for(const w of g.ws)L.push({sq:w.sq,k:"gate",t:`門<i>${g.inR}</i>`});
  for(const q in td.ids){const id=td.ids[q],t=GSV.tagOf(td,id),sq=+q;if(t==="inv")L.push({sq,k:"bd "+(td.arm[id]?"arm":"inv"),t:td.arm[id]?"侵!":"侵"});if(t==="guard")L.push({sq,k:"bd guard",t:"陣"});if(t==="drain")L.push({sq,k:"bd drain",t:"奪"})}
  if(td.fx){const F=td.fx,q=GSV.sqOfId(td,F.src);if(q!=null)L.push({sq:q,k:"bd src",t:F.id==="pao"?"砲":"令"});   /* 隔山星砲：砲標「砲」、砲架標「架」、目標畫紅圈 */
    if(F.id==="pao"){const s=GSV.sqOfId(td,F.scr),t=GSV.sqOfId(td,F.tg);if(s!=null)L.push({sq:s,k:"bd src",t:"架"});if(t!=null)L.push({sq:t,k:"ring"})}}
  if(td.fc&&td.fc.r===td.rnd)L.push({sq:td.fc.sq,k:"ring fc"});
  if(td.ctl.trap&&td.ctl.trap.until>td.rnd)for(const q of td.ctl.trap.sqs)L.push({sq:q,k:"trap"});
  for(const o of td.ctl.frz)if(o.until>td.rnd){const q=GSV.sqOfId(td,o.id);if(q!=null)L.push({sq:q,k:"bd frz",t:"定"})}
  for(const h of GSV.invHits(td))L.push({sq:h.sq,k:"ring"});
  if(GSV_INFO&&C){const R=new Set();for(const[f,t]of C.legal(b,"b"))if(b[t]==="R")R.add(f);for(const q of R)L.push({sq:q,k:"ring ifo"})}
  if(GSV_TG&&C&&gsvMy(st)){const T=GSV.targets(st,GSV_TG.id,GSV_TG.id==="dep"?[GSV_TG.p]:GSV_TG.pk,C);for(const x of T)if(typeof x==="number")L.push({sq:x,k:"tg",b:1})}
  else if(gsvMy(st))for(const d of td.dp)if(!b[d.sq])L.push({sq:d.sq,k:"dp",t:"補"});
  return L}
function gsvFrame(){GSV_RAF=0;const st=GSV_ST,o=document.getElementById("gsvOv");if(!st||!o||!gsvIs(st))return;if(!/^#\/journey\/play/.test(location.hash)){gsvHide();return}
  const xy=q=>typeof bhtdXY==="function"?bhtdXY(q):null,L=gsvMarks(st),key=JSON.stringify(L),box=o.querySelector(".mks");
  if(key!==GSV_MK){GSV_MK=key;box.innerHTML=L.map(m=>m.b?`<button type="button" class="gsv-mk ${m.k}" data-sq="${m.sq}" aria-label="目標 ${m.sq}"></button>`:`<div class="gsv-mk ${m.k}" data-sq="${m.sq}">${m.t||""}</div>`).join("")}
  const a=xy(40),c=xy(41),cell=a&&c?Math.max(18,Math.min(90,Math.hypot(c.x-a.x,c.y-a.y))):36;o.style.setProperty("--c",cell+"px");
  for(const el of box.children){const p=xy(+el.dataset.sq);if(!p){el.style.display="none";continue}el.style.display="";el.style.transform=`translate(${p.x}px,${p.y}px) translate(-50%,-50%)`}
  GSV_RAF=requestAnimationFrame(gsvFrame)}
/* 跳字：看 td.ev 新增的事件（拆陣、盾吸收、入侵、截援…都寫原因，不只跳總數） */
function gsvBarXY(id){const e=document.getElementById(id);if(!e)return{x:innerWidth/2,y:innerHeight/2};const r=e.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height*.5}}
function gsvEvents(st){const td=st.td,id=st.id;if(GSV_SEEN[id]==null){GSV_SEEN[id]=td.seq;return}const s0=GSV_SEEN[id];if(td.seq<=s0)return;GSV_SEEN[id]=td.seq;
  td.ev.filter(e=>e.s>s0).forEach((e,i)=>setTimeout(()=>{try{gsvEv(e)}catch(x){}},i*220))}
function gsvEv(e){if(typeof bhtdFloat!=="function")return;const F=(t,p,c)=>bhtdFloat(t,p,c),at=q=>q!=null&&typeof bhtdXY==="function"?bhtdXY(q):null,why={cap:"擒子",chk:"將軍",inv:"入侵",esk:"卒將號令",skill:"招式"};
  if(e.k==="hit"){const p=gsvBarXY(e.to==="b"?"gsvEn":"gsvMe"),nm=e.why==="esk"&&GSV.ESK[e.id]?GSV.ESK[e.id].nm:why[e.why]||"";F(e.abs?`${nm} 盾吸收 ${e.abs}／損血 ${e.loss}`:`${nm} −${e.loss}`,p,e.to==="b"?"dmg":"hurt");return}
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
function gsvEnd(st){if(!gsvIs(st)||!st.result)return;const P=gsvProg(),n=st.td.lv;if(P.g.includes(st.id))return;const R=P.c[n]=Object.assign({w:0,l:0,d:0},P.c[n]),w=st.result.w;
  if(!w)R.d++;else if(w===st.human){R.w++;const b={rnd:st.td.rnd,hp:Math.max(0,st.td.me.hp)};if(!R.best||b.rnd<R.best.rnd||(b.rnd===R.best.rnd&&b.hp>R.best.hp))R.best=b}else R.l++;
  P.g=P.g.concat([st.id]).slice(-20);store.set("gsv",P)}
function gsvResult(st,win,draw0,XPR){gsvCss();const td=st.td,n=td.lv,V=GSV.LV[n]||{},R=store.get("bhRet",null),k=R&&R.k,cv=R&&R.cover,M=td.me,E=td.en,why=st.result.why||"";
  const used=Object.keys(td.used).filter(id=>GSV.SKM[id]).map(id=>GSV.SKM[id].nm+(td.used[id]>1?"×"+td.used[id]:"")).join("、")||"沒有";
  modal(`<div class="em">${win?"✨":draw0?"🤝":"🌀"}</div><h2>${win?"破陣":draw0?"不分勝負":"星門失守"}</h2><p class="muted">${esc(why)}・🌠 星門圍城・第 ${n} 關・${esc(V.nm||td.nm)}</p>
    <p style="font-size:13.5px;text-align:center">打了 <b>${td.rnd}</b> 回合・你造成 <b>${M.dealt}</b>・你受到 <b>${M.taken}</b>・剩 HP ${Math.max(0,M.hp)}／${M.max}・星樞剩 ${Math.max(0,E.hp)}／${E.max}</p>
    <p style="font-size:13px;text-align:center">截援 ${td.icpt} 次・部署 ${td.dep} 次・用過的招：${esc(used)}</p>${!win&&V.tip?`<p class="muted" style="font-size:13px">💡 ${esc(V.tip)}</p>`:""}
    <p class="muted" style="font-size:12px">試玩紀錄只存在星門圍城自己的紀錄裡，不算原本的三星。</p>${XPR||""}`,
    [["↻ 再打一次",()=>gsvStart(n,k,cv,td.sk,true)],["返回選關",()=>gsvSelect(k,cv),true],["再看一下星盤",null,true]],"res")}
/* 平面棋盤：07bht bhtdFlat 問這裡 */
function gsvFlat(st){return gsvIs(st)}

