/* ---------- 黑洞・陣地塔防 v0.1（開發者 11/13 定案：story/新手體驗定案_141_兩輪討論.md 第十～十九節；十八招 story/七星十八招_合併審查.md）----------
   只在黑洞局（journey "bh:td<關>"）生效；序局 bh:xu、其他對局完全不受影響。前綴 bhtd／BHTD（全域先 grep 過沒撞名）。
   分兩塊：
   ① BHTD＝純規則（不碰畫面，node 單元測試 xiangqi-lab/tools/test-bhtd-rules.js 直接載這支檔）：七星數值、關卡、扣元氣、星門波次、九宮星核、炮架火網、陣眼子、招式效果。
      local.js 用 window.XQ_TD 呼叫：boot（開局）、move（每走一步，含星樞）、cast（放招，/play/td）、engine／pick（星樞推算 N 步＋失誤率、定身的子不走）。
      不是走棋的盤面變化（移除敵子、星門落子、換位、瞬移、復活）記在 P.ed（local.js tdRebuild 重放時套上）。
   ② 畫面：關卡卡片 bhtdSelect、元氣／靈力條與 4 顆招式鈕（#bhtdEn、#bhtdMe）、盤上標記（#bhtdOv：陣眼、星門、破甲、定身、小盾、炮線）、
      扣元氣跳字、放招演出（草書招名＋法器共鳴 park3d itemCast＋招式特效，設定「戰鬥演出」bhtdFx）、結果視窗（下一關／重打本關）。
   接點：07bh-blackhole.js 的 bhStart（改開關卡卡片）、bhTick、bhParkEx（守關模型）、bhGameEnd、bhResultModal 呼叫這裡。
   本機試：主控台 bhtdOpen() 直接開關卡卡片。
   11/14 爽度第二批（story/黑洞塔防爽度_Gemini提案與審查_1114.md 第三節）：星塵＋天賦樹（BHTD.TAL、存檔鍵 bhtdDust、選關卡片「🌌 天賦」）、結算再刷（三星、差一點、本局高光、標題評語、
   「返回星盤」＋「↻ 再刷一場」）、星淵急襲（journey "bh:rd"，BHTD.RAID 模板；不給修為）；定軌力用完時黑洞入口關著（bhtdLock 問 07dgl dglBhLock）。測試 xiangqi-lab/tools/test-bhtd-r2.js。 */
const BHTD=(()=>{
  /* 七星：本命子、初始與 Lv100 的元氣／攻擊倍率／靈力上限（第 147 題 ChatGPT 修正表；開發者選初始元氣 ChatGPT 版、攻擊倍率穩健版）
     def＝防禦倍率（開發者 11/14 新增；越小越硬）：只乘我方「被擒子」「被將軍」扣的元氣，四捨五入、至少扣 1、單次最多 12（defDmg）。
       Lv1 → Lv100 照攻擊同一條成長曲線 G(L)；坦克鐵連城最硬 ×0.90→×0.72，攻擊型步越溪、雷借花稍軟 ×1.00→×0.85，其他照定位在中間
     sp＝靈力上限 [Lv1, Lv100]，spT＝成長型（開發者 11/14「上限拉開＋早晚熟」，spCurve）：avg 平均＝G(L)、early 早熟＝√G(L)、late 晚熟＝((L−1)/99)^1.8
     11/14 晚（1106 上線後）開發者選「數字放大＋回靈隨修為長」：靈力全部 ×SPK（10）；rg＝每回合回靈 [Lv1, Lv100]，跟 sp 同一條 spCurve，四捨五入（星樞沒有每回合回靈，吃子回 ESP_GAIN） */
  const CH={x_swordboy:{k:"qi",n:"齊轍",pc:"R",hp:[56,100],atk:[.92,1.25],sp:[50,70],spT:"avg",rg:[10,15],def:[.97,.82]},x_spiritgirl:{k:"tian",n:"田飛燕",pc:"B",hp:[50,94],atk:[1.08,1.35],sp:[50,80],spT:"early",rg:[10,18],def:[.92,.76]},
    x_martialgirl:{k:"lei",n:"雷借花",pc:"C",hp:[51,90],atk:[1.00,1.42],sp:[50,90],spT:"avg",rg:[10,18],def:[1.00,.85]},x_miaogirl:{k:"luo",n:"駱躍梅",pc:"N",hp:[49,88],atk:[1.05,1.38],sp:[50,80],spT:"avg",rg:[10,18],def:[.95,.80]},
    x_shuai:{k:"shen",n:"沈方庭",pc:"K",hp:[47,86],atk:[1.07,1.34],sp:[60,90],spT:"early",rg:[10,18],def:[.94,.79]},x_shi:{k:"tie",n:"鐵連城",pc:"A",hp:[58,102],atk:[1.04,1.30],sp:[50,60],spT:"late",rg:[10,12],def:[.90,.72]},x_bing:{k:"bu",n:"步越溪",pc:"P",hp:[48,90],atk:[1.12,1.45],sp:[40,90],spT:"late",rg:[10,20],def:[1.00,.85]}};
  const EYE0={K:85,A:86,B:87,N:88,R:89,C:70,P:58};   /* 陣眼子＝主角本命子：帥只有一顆；其他取紅方右手邊那顆（兵取中兵） */
  const PCN={K:"帥",A:"仕",B:"相",N:"傌",R:"俥",C:"炮",P:"兵"},PBN={K:"將",A:"士",B:"象",N:"馬",R:"車",C:"砲",P:"卒"};
  /* 擒子：被吃子基礎 × 吃子者倍率 × 攻擊倍率（陣眼子再 ×1.5），四捨五入，單次最多 12（第 15 節） */
  const CAPB={R:4,C:3,N:2,B:1,A:1,P:1,K:0},CAPM={R:1,C:1.2,N:1.5,B:2,A:2,K:2,P:2.5},CAPMAX=12,EYEK=1.5,VALV={R:9,C:4.5,N:4,B:2,A:2,P:1,K:0},CHK_HIT=5;   /* CHK_HIT＝我方被將軍原本扣幾點（再乘防禦） */
  const up=p=>String(p||"").toUpperCase(),sd=p=>p?(p===p.toUpperCase()?"r":"b"):null,RW=s=>s/9|0,CL=s=>s%9,r2=x=>Math.round(x*100)/100;
  const G=(L,tau)=>{L=Math.max(1,Math.min(100,+L||1));return(1-Math.exp(-(L-1)/tau))/(1-Math.exp(-99/tau))};
  /* 靈力上限成長曲線（11/14）：回傳 0～1；avg＝跟攻擊同一條 G、early＝開根號（前期長得快）、late＝凸曲線 ((L−1)/99)^SP_LATE（前期慢、後期暴衝） */
  const SP_LATE=1.8;
  /* 靈力單位（11/14 晚 ×10）：SPK＝1 個舊單位；CAP_SP＝擒子回靈；ESP_GAIN＝星樞吃子回靈；XM_CAP＝星芒最多換幾點開局靈力（星芒上限 20 × SPK）；ESP_MAX＝星樞靈力上限 */
  const SPK=10,CAP_SP=10,ESP_GAIN=10,XM_CAP=200,ESP_MAX=50;
  function spCurve(t,L,tau){L=Math.max(1,Math.min(100,+L||1));const g=G(L,tau);return t==="early"?Math.sqrt(g):t==="late"?Math.pow((L-1)/99,SP_LATE):g}
  /* 主角數值：數值(L)＝初始＋(Lv100−初始)×G(L)；τ 預設 42（之後照天賦頁 r：42÷√(r÷6%)，限 36～52）；天賦倍率 tal v0.1 固定 1.0（全局乘區，乘元氣與攻擊；防禦是越小越硬，所以除以 tal） */
  function stats(ck,L,o){o=o||{};const c=CH[ck]||CH.x_swordboy,tau=Math.max(36,Math.min(52,+o.tau||42)),tal=Math.max(1,Math.min(1.15,+o.tal||1)),g=G(L,tau),lp=a=>a[0]+(a[1]-a[0])*g;
    return{ck:CH[ck]?ck:"x_swordboy",n:c.n,pc:c.pc,L:Math.max(1,Math.min(100,Math.round(+L||1))),hp:Math.round(lp(c.hp)*tal),atk:r2(lp(c.atk)*tal),def:r2(lp(c.def)/tal),sp:Math.round(c.sp[0]+(c.sp[1]-c.sp[0])*spCurve(c.spT,L,tau)),spRegen:Math.round(c.rg[0]+(c.rg[1]-c.rg[0])*spCurve(c.spT,L,tau)),g:r2(g),tau}}
  /* 防禦（11/14）：原本要扣的 n × 防禦倍率，四捨五入、至少扣 1（n 是 0 就是 0）、單次最多 12。用在我方被擒子、被將軍、星樞三招（卒海過河、引力撕裂、殘卒反星；開發者 11/14 選 B）；過河、九宮、星碎格不套；星樞那邊不套 */
  /* 畫面顯示用（開發者 11/14：不用倍數，改成以 100 為基準、越大越強的數值；內部計算照舊用倍率）：攻擊力＝四捨五入(攻擊倍率×100)、防禦力＝四捨五入(100÷防禦倍率) */
  const atkPt=a=>Math.round((+a>0?+a:1)*100),defPt=d=>Math.round(100/(+d>0?+d:1));
  function defDmg(n,def){n=Math.max(0,Math.round(+n||0));if(!n)return 0;const d=+def>0?+def:1;return Math.min(CAPMAX,Math.max(1,Math.round(n*d)))}
  /* ===== 星域一 6 關（開發者 11/13 第 151 題：每關照關名換開局擺法；座標照 ChatGPT 151 第 2 節，第 1、3 關照草稿 B）=====
     座標：路 1～9（由左到右，紅方看過去）、線 1＝紅底線 … 線 10＝黑底線；格子＝(10−線)×9＋(路−1)。黑方開局只能用標準數量以內的子（Pikafish 限制），開局＋星門＝16 子。
     open＝開局擺的黑子 [子,路,線]；waves＝指定的星門波次 {at:第幾回合結束落下,p:[[子,路,線]…],fake:假門}；auto＝其餘的子自動排成波次（first 第幾回合、every 間隔、pair 左右夾＝一波兩顆、burst 第幾波一口氣落 4 顆、fake 假門）。
     四種小變化（第 151 題選定）：tpl＝星門節奏模板（早壓、左右夾、後援、假門、一口氣落 4 顆）；ps＝星樞性格（保將、搶過河、愛吃子、愛架砲，選步時加權）；
     en＝開局元氣、靈力不對稱 {hp0 星樞開局元氣, sp0 星樞開局靈力}；shard＝星碎格 [路,線]（踩上去扣自己 3 元氣，敵我都算）。
     r3＝三星回合數（11/14 第二批：在 r3 回合內過關拿第三顆星；先用估的，實打後再調）；fsk＝這關星樞會用的棋兵招（卒海過河 zhs、殘卒反星 cfx；守關招牌 引力撕裂 ylsl），zcap＝卒海過河最多扣幾點（第 1～3 關 2、第 4～6 關 3） */
  const LV=[
    {n:1,nm:"星淵初探",hp:28,r3:14,sp0:10,open:[["k",5,10],["a",4,10],["a",6,10],["p",1,7],["p",3,7],["p",5,7],["p",7,7],["p",9,7]],waves:[],auto:{first:5,every:4},
      tpl:"後援",ps:"保將",fsk:["zhs","cfx"],zcap:2,say:"只有將、士和五個卒——先看清楚：過河的子，每回合都在咬你的元氣。",tip:"吃掉過河的卒，可以少扣元氣"},
    {n:2,nm:"墨河微瀾",hp:31,r3:14,sp0:10,open:[["k",5,10],["a",4,10],["a",6,10],["p",1,6],["p",3,6],["p",5,6],["p",7,6],["p",9,6]],waves:[],auto:{first:2,every:3,early:1},
      tpl:"早壓",ps:"搶過河",shard:[[2,6],[8,5]],fsk:["zhs","cfx"],zcap:2,say:"五個卒已經推到河岸——墨河起了波瀾。紫光的星碎格，踩上去會扣自己 3 元氣。",tip:"卒還沒過河前先擋住它"},
    {n:3,nm:"星門乍現",hp:34,r3:16,sp0:10,open:[["k",5,10],["a",4,10],["a",6,10]],waves:[{at:2,p:[["p",1,7]],fake:1},{at:4,p:[["p",9,7]],fake:1},{at:6,p:[["p",3,7]],fake:1},{at:8,p:[["p",7,7]],fake:1},{at:10,p:[["p",5,7]],fake:1}],auto:{first:13,every:3,fake:1},
      tpl:"假門",ps:"愛吃子",fsk:["zhs","cfx"],zcap:2,say:"開局只有將與雙士；卒每 2 回合從星門落下。小心：有一道是假門。",tip:"站上星門可以堵住援軍"},
    {n:4,nm:"雙門夾道",hp:37,r3:16,sp0:10,open:[["k",5,10],["a",4,10],["a",6,10],["p",1,7],["p",9,7]],waves:[{at:2,p:[["p",3,7],["p",7,7]]},{at:4,p:[["p",5,7]]}],auto:{first:7,every:3,pair:1},
      tpl:"左右夾",ps:"搶過河",shard:[[2,5],[5,6],[8,5]],fsk:["zhs","cfx"],zcap:3,say:"左右兩道星門同時開——卒從兩翼夾過來。",tip:"兩翼都要留子守"},
    {n:5,nm:"星樞列陣",hp:40,r3:14,sp0:10,en:{hp0:20,sp0:50},open:[["k",5,10],["a",4,10],["a",6,10],["b",3,10],["b",7,10],["p",1,6],["p",3,6],["p",5,6],["p",7,6],["p",9,6]],waves:[],auto:{first:3,every:4,burst:1},
      tpl:"一口氣落 4 顆",ps:"愛架砲",fsk:["zhs","cfx"],zcap:3,say:"雁行列陣：五卒在河岸，雙象在後。星樞只剩一半元氣，但靈力全滿——小心它的招。",tip:"星樞靈力滿了，先處理預告的那一招"},
    {n:6,nm:"守關・星樞卒將",hp:52,r3:20,sp0:10,en:{sp0:30},boss:{k:"P",s:1.45},open:[["k",5,10],["a",4,10],["a",6,10],["p",1,5],["p",3,5],["p",7,5],["p",5,7],["p",9,7]],waves:[],auto:{first:3,every:4,burst:2},
      tpl:"一口氣落 4 顆",ps:"保將",shard:[[4,6],[6,6],[2,4],[8,4]],fsk:["ylsl","zhs","cfx"],zcap:3,say:"星樞卒將坐鎮九宮，三個卒已經過河——元氣打光，或將死它。",tip:"引力撕裂要扣 5（防禦可減少）：先開護盾或回元氣"}];
  /* ===== 練習賽「星淵試陣」（開發者 11/13 選方案 A：story/黑洞塔防練習賽教學規劃_1113.md；畫面與流程在 07bhtl-tdlearn.js）=====
     fen＝專用開局（紅方七種子各一顆都站在 EYE0，選誰都有陣眼子；多一顆兵給星樞吃）；不補滿 16 子（nofill）；星樞元氣 8、推算 1 步、沒有靈力也不放招（noEsp）；
     我方靈力開局＝上限 −spGap；只帶第 1 招。劇本：紅 red、星樞 blk（local.js 的 lv.mirror 照走）、收尾 fin＝red 最後一步；tg＝第 1 招在 T3 要點的格（ICCS，照順序）。
     7 位 × 各修為都要：第 2 回合結束堵住星門、放招時靈力夠、收尾前星樞剩 1～5、將軍扣 5 打光（xiangqi-lab/tools/test-bhtl.js） */
  const TL={n:0,nm:"星淵試陣",fen:"4k4/9/9/9/9/2p1p4/2P1P4/7C1/9/4KABNR",hp:8,spGap:20,noEsp:1,nofill:1,open:[],waves:[{at:2,p:[["p",9,7]]}],fsk:[],
    red:["e3e4","i0i6","i6e6"],blk:["c4c3","c3d3"],tg:{qi1:["d3"],tian1:["h2","d0"],lei1:["d3"],luo1:["c3"],shen1:[],tie1:[],bu1:["h2","h0"]}};
  const LSQ=(lu,xi)=>(10-xi)*9+(lu-1);
  const STD={k:1,a:2,b:2,n:2,r:2,c:2,p:5},HOME={k:[4],a:[3,5],b:[2,6],n:[1,7],r:[0,8],c:[19,25],p:[31,27,35,29,33]};
  /* 照關卡設定排出 16 子：開局 open、指定波次 waves、剩下的照 auto 自動排（先卒、再馬、砲、象、車）；回傳 {open:[[子,格]…],waves:[{at,ps:[[子,格]…],fake}]} */
  function lvPlan(L){const used={},add=p=>{used[p]=(used[p]||0)+1};const open=L.open.map(([p,lu,xi])=>{add(p);return[p,LSQ(lu,xi)]});
    const W=(L.waves||[]).map(w=>({at:w.at,ps:w.p.map(([p,lu,xi])=>{add(p);return[p,LSQ(lu,xi)]}),fake:!!w.fake})),occ=new Set(open.map(x=>x[1]).concat(...W.map(w=>w.ps.map(x=>x[1])))),rest=[];
    if(!L.nofill)for(const p of["p","n","c","b","a","r"]){let k=STD[p]-(used[p]||0);const H=HOME[p].filter(h=>!occ.has(h)).concat(HOME[p]);for(let i=0;k>0;i++,k--)rest.push([p,H[i%H.length]])}
    const A=L.auto||{};let at=A.first||4,i=0;
    while(rest.length){const n=A.burst!=null&&i===A.burst?4:A.pair?2:1,ps=rest.splice(0,n);W.push({at,ps,fake:!!A.fake});at+=A.early&&i<1?2:(A.every||4);i++}
    W.sort((a,b)=>a.at-b.at);return{open,waves:W}}
  /* 開局合法檢查器（第 151 題）：子數不超、每顆子站在走法可以站的點、沒有重疊、將帥都在、不照面、開局沒有人被將、紅方有步可走；星門波次的子也算進總數（剛好 16） */
  function lvCheck(L,C){const err=[],pl=lvPlan(L),b=C.parseFen(C.START);for(let i=0;i<45;i++)if(sd(b[i])==="b")b[i]=null;const cnt={};
    for(const[p,q]of pl.open){if(q<0||q>89)err.push(`${p} 不在盤上`);else if(b[q])err.push(`${p} 跟別的子重疊（格 ${q}）`);else if(!canStand(p,q))err.push(`${PBN[up(p)]}不能站在格 ${q}`);else b[q]=p;cnt[p]=(cnt[p]||0)+1}
    for(const w of pl.waves)for(const[p,q]of w.ps){cnt[p]=(cnt[p]||0)+1;if(!canStand(p,q)||RW(q)>4)err.push(`星門的${PBN[up(p)]}落點不合法（格 ${q}）`)}
    for(const p in STD)if((cnt[p]||0)!==STD[p])err.push(`${PBN[up(p)]}共 ${cnt[p]||0} 顆（要剛好 ${STD[p]}，開局＋星門＝16）`);
    for(const p in STD){const n=pl.open.filter(x=>x[0]===p).length;if(n>STD[p])err.push(`${PBN[up(p)]}開局超過標準數量`)}
    if(b.indexOf("k")<0)err.push("沒有黑將");if(facing(b))err.push("將帥照面");try{if(C.inCheck(b,"r"))err.push("開局紅方被將");if(C.inCheck(b,"b"))err.push("開局黑方被將（紅方可以直接吃將）");if(!C.legal(b,"r").length)err.push("紅方沒有步可走")}catch(e){err.push("檢查失敗："+e.message)}
    for(const[lu,xi]of L.shard||[]){const q=LSQ(lu,xi);if(b[q])err.push(`星碎格 ${lu}/${xi} 開局有子`)}
    return err}
  /* 星樞推算步數：36 關固定階梯 1→8 步（同一個步數跨好幾關時用失誤率逐關遞減）；再照星槎難度 m_diff 微調 −2／0／+1／+2／+3，最少 1、最多 10 */
  const DADJ=[-2,0,1,2,3];
  function depthOf(n,diff){const real=1+7*(Math.max(1,Math.min(36,+n||1))-1)/35,d0=Math.floor(real+1e-9),fr=real-d0,di=Math.max(1,Math.min(5,+diff||2));
    return{depth:Math.max(1,Math.min(10,d0+DADJ[di-1])),base:d0,err:r2(.05+.3*(1-fr)),mpv:5,margin:300}}
  function startFen(n,C){if(n==="tl")return TL.fen;const pl=lvPlan(LV[n-1]||LV[0]),b=C.parseFen(C.START);for(let i=0;i<90;i++)if(sd(b[i])==="b")b[i]=null;for(const[p,q]of pl.open)b[q]=p;return C.fen(b,"r").split(" ")[0]}
  /* 某種子能不能站在那一格（瞬移、換位、星門落點都照走法可以站的點） */
  const AP=[[7,3],[7,5],[8,4],[9,3],[9,5]],BP=[[9,2],[9,6],[7,0],[7,4],[7,8],[5,2],[5,6]];
  function canStand(p,sq){const s=sd(p),t=up(p),r0=RW(sq),c=CL(sq),r=s==="r"?r0:9-r0;
    if(t==="K")return r>=7&&c>=3&&c<=5;if(t==="A")return AP.some(([a,b])=>a===r&&b===c);if(t==="B")return BP.some(([a,b])=>a===r&&b===c);
    if(t==="P")return r<=4||(r<=6&&c%2===0);return true}
  function facing(b){const a=b.indexOf("K"),k=b.indexOf("k");if(a<0||k<0||a%9!==k%9)return false;for(let i=k+9;i<a;i+=9)if(b[i])return false;return true}
  /* 招式改完盤面（輪到紅方）一定要合法：黑方不能被將（不然紅方可以吃將）、不能王見王、紅方不能自己送將（本來就被將的不算）、紅方還有步可走 */
  function okAfter(b,C,rc0){try{return !C.inCheck(b,"b")&&!facing(b)&&(rc0||!C.inCheck(b,"r"))&&C.legal(b,"r").length>0}catch(e){return false}}
  const sqOf=(td,tag)=>{for(const k in td.pid)if(td.pid[k]===tag)return +k;return null};
  const alive=(td,tag)=>sqOf(td,tag)!=null;
  function ev(td,o){o.s=++td.seq;td.ev.push(o);if(td.ev.length>24)td.ev.splice(0,td.ev.length-24);return o}
  /* 盤面變化：記在 P.ed（第 n 手之後），同時改 P.board、pos 最後一格（重複局面判斷才對） */
  function edit(P,C,ch){const n=P.moves.length;P.ed=P.ed||[];let e=P.ed.find(x=>x.n===n);if(!e){e={n,s:{}};P.ed.push(e)}
    for(const k in ch){P.board[+k]=ch[k]||null;e.s[k]=ch[k]||null}try{if(P.pos&&P.pos.length)P.pos[P.pos.length-1]=C.fen(P.board,P.turn)}catch(x){}}
  /* 炮架火網：紅炮沿四方向，隔一子（two＝火網標記：隔兩子也算）瞄到的非帥將黑子 */
  function netHits(b,two){const out=[];for(let s=0;s<90;s++){if(b[s]!=="C")continue;for(const[dr,dc]of[[1,0],[-1,0],[0,1],[0,-1]]){let r=RW(s)+dr,c=CL(s)+dc;const L=[];
      while(r>=0&&r<10&&c>=0&&c<9){const q=r*9+c;if(b[q])L.push(q);if(L.length>=3)break;r+=dr;c+=dc}
      for(const i of two?[1,2]:[1]){const q=L[i];if(q!=null&&sd(b[q])==="b"&&b[q]!=="k"&&!out.some(x=>x.t===q))out.push({c:s,t:q,scr:L[0]})}}}return out}   /* scr＝炮架（隔子星花用；舊呼叫只用 t） */
  function markNet(td,b,two){for(const h of netHits(b,two)){const tag=td.pid[h.t];if(tag&&!td.pj.includes(tag)){td.pj.push(tag);ev(td,{k:"mark",sq:h.t})}}}
  /* 扣元氣：hitMe 先吃護盾（整次抵消）；hitEn 敵方沒有護盾 */
  function hitMe(td,n,sq,why){n=Math.max(0,Math.round(n));if(!n)return 0;if(td.gd>0){td.gd--;ev(td,{k:"absorb",sq,why});return 0}td.me.hp=Math.max(0,td.me.hp-n);td.taken+=n;td.rf.hurt=1;td.rf.dmg=(td.rf.dmg||0)+n;ev(td,{k:"hit",sd:"r",n,sq,why});return n}
  function hitEn(td,n,sq,why,src,x){n=Math.max(0,Math.round(n));if(!n)return 0;td.en.hp=Math.max(0,td.en.hp-n);td.dealt+=n;ev(td,Object.assign({k:"hit",sd:"b",n,sq,why,src},x||{}));return n}   /* x：演出用的附加欄位（擒子的棋種、弱吃強、連擊） */
  /* 打某一顆黑子造成的扣元氣（招式）：基礎×攻擊倍率，破甲多扣 1（用掉），單次最多 12 */
  function hitPiece(td,sq,base,why){const tag=td.pid[sq],pj=tag&&td.pj.includes(tag);if(pj)pjUse(td,tag);return hitEn(td,Math.min(CAPMAX,Math.round(base*td.me.atk)+(pj?1:0)),sq,why,"sk")}
  /* 用掉破甲：平常打過一次就消失；天賦「赤焰火網」＝用過再留到下一回合結束（共 2 回合，roundEnd 收掉；過期後炮還瞄著會重新標） */
  const hasT=(td,id)=>!!td&&Array.isArray(td.tal)&&td.tal.includes(id);
  function pjUse(td,tag){if(hasT(td,"cyhw")){td.pjT=td.pjT||{};if(td.pjT[tag]==null)td.pjT[tag]=td.rnd+1;return}td.pj=td.pj.filter(x=>x!==tag)}
  /* 不打某一顆子的扣元氣（直路衝鋒）：照樣乘攻擊倍率、上限 12 */
  function hitRaw(td,base,why){return hitEn(td,Math.min(CAPMAX,Math.round(base*td.me.atk)),null,why,"sk")}
  /* 多回合定身：排進 frzQ，roundEnd 清掉 td.frz 之後才推進去（黑方走棋時定的身才不會被當回合清掉） */
  function freezeN(td,tag,n){if(!tag||!(n>0))return;const o=td.frzQ.find(x=>x.tag===tag);if(o)o.n=Math.max(o.n,n);else td.frzQ.push({tag,n})}
  function capDmg(v,c,atk,eye,pj){return Math.min(CAPMAX,Math.round(CAPB[up(v)]*CAPM[up(c)]*(atk||1)*(eye?EYEK:1))+(pj?1:0))}
  /* ===== 連擊（11/14 爽度第一批，story/黑洞塔防爽度_Gemini提案與審查_1114.md；不改象棋規則、一回合照樣 1 招）=====
     comboOf：擒子這一下的連擊加成。base＝原本的擒子扣點（capDmg）；mk＝吃掉的是「這回合先放招標記過」的敵子＝奇謀連擊 ×2（多扣 2、回 1 靈）；
       eye＋pj＝陣眼子吃掉炮架破甲目標＝陣眼貫穿（星樞元氣再多扣 1，第 8 條審查：棋子沒有個別血量，不做濺射）。
       加成後一樣受單次上限 12 限制；原本就超過 12 的（12＋破甲 1）照原本的數字，不因為連擊反而變少。回 {n 扣幾點, sp 多回幾靈, k 連擊種類, bonus 實際多扣}
     chkDmg：紅方將軍扣幾點。上一回合也將軍（prevR＝這回合−1）＝連環逼宮，5 → 7；中斷一回合就回到 5 */
  function comboOf(o){o=o||{};const base=Math.max(0,Math.round(+o.base||0)),mk=!!o.mk,pc=!!(o.eye&&o.pj),bonus=(mk?(o.qx?4:2):0)+(pc?1:0);   /* qx＝天賦「奇謀連鎖」：奇謀連擊再多扣 2（11/14 第二批） */
    const n=bonus?Math.max(base,Math.min(CAPMAX,base+bonus)):base;return{n,sp:mk?CAP_SP:0,k:mk&&pc?"qm+pierce":mk?"qm":pc?"pierce":"",bonus:n-base}}
  function chkDmg(prevR,rnd){const chain=prevR!=null&&prevR===rnd-1;return{n:chain?7:5,chain}}
  function heal(td,n){const a=Math.round(n*td.me.max/50),h0=td.me.hp;td.me.hp=Math.min(td.me.max,td.me.hp+a);ev(td,{k:"heal",n:td.me.hp-h0});return td.me.hp-h0}
  function spAdd(td,n){const s0=td.me.sp;td.me.sp=Math.min(td.me.spMax,td.me.sp+n);if(td.me.sp>s0)ev(td,{k:"sp",n:td.me.sp-s0});return td.me.sp-s0}
  function shAdd(td,sq,v){const tag=td.pid[sq];if(!tag)return;td.sh.push({tag,v,until:td.rnd+3});ev(td,{k:"sh",sq,n:v})}   /* 小盾：最多撐 3 回合 */
  function shTake(td,tag){let v=0;td.sh=td.sh.filter(x=>{if(x.tag===tag&&x.until>=td.rnd){v+=x.v;return false}return x.tag!==tag});return v}
  const ciOk=td=>td.ci.findIndex(x=>x.until==null||x.until>=td.rnd);
  /* ---------- 星門 ---------- */
  function gatePick(b,p,home,avoid){const ok=q=>!b[q]&&!(avoid||[]).includes(q)&&RW(q)<=4&&canStand(p,q);if(ok(home))return home;
    const L=[];for(let q=0;q<45;q++)if(ok(q))L.push(q);L.sort((a,c)=>Math.abs(RW(a)-RW(home))+Math.abs(CL(a)-CL(home))-Math.abs(RW(c)-RW(home))-Math.abs(CL(c)-CL(home))||a-c);return L.length?L[0]:null}
  function gateNext(td,b){if(!td.waves.length){td.gate=null;return}const W=td.waves[0],sq=[];for(const[p,h]of W.ps){const q=gatePick(b,p,h,sq);sq.push(q==null?h:q)}
    let fk=[];if(W.fake){const p0=W.ps[0][0],m=sq.map(q=>RW(q)*9+(8-CL(q))).filter(q=>!b[q]&&!sq.includes(q)&&canStand(p0,q)),alt=m.length?m[0]:gatePick(b,p0,22,sq);if(alt!=null&&!sq.includes(alt))fk=[alt]}   /* 假門：另一道看起來一樣的門（鏡像那一邊），落子時才散掉 */
    td.gate={at:Math.max(W.at,td.rnd+1),p:W.ps.map(x=>x[0]),h:W.ps.map(x=>x[1]),sq,fk,wait:0};ev(td,{k:"gate",sq:sq[0],n:td.gate.at-td.rnd})}
  function gateDrop(P,C){const td=P.td,g=td.gate;if(!g||td.rnd<g.at)return;const b=P.board.slice(),ch={},put=[];let blocked=null;
    for(let i=0;i<g.p.length;i++){const p=g.p[i];let q=g.sq[i];const occ=b[q];
      if(occ&&sd(occ)==="r"&&g.wait<2){blocked=q;break}   /* 紅子站在星門上＝堵住：延一回合（最多堵 2 次，之後改落別格） */
      if(occ||put.includes(q))q=gatePick(b,p,g.h[i],put);
      const ok=t=>!C.inCheck(t,"r")&&!C.inCheck(t,"b")&&!facing(t)&&C.legal(t,"r").length>0,test=()=>{if(q==null)return false;const t=b.slice();t[q]=p;return ok(t)};   /* 11/14：也不落在會讓黑方自己被將的格（例如紅炮的炮架；不然輪到紅方可以吃將） */
      if(!test()){const tried=[q];q=null;for(let k=0;k<45&&q==null;k++){const z=gatePick(b,p,g.h[i],put.concat(tried));if(z==null)break;const t=b.slice();t[z]=p;if(ok(t))q=z;else tried.push(z)}}   /* 不落在會直接將軍的格（落子不偷襲） */
      if(q==null){blocked=g.sq[i];break}b[q]=p;ch[q]=p;put.push(q)}
    if(blocked!=null){g.wait++;g.at=td.rnd+1;ev(td,{k:"block",sq:blocked});return}
    edit(P,C,ch);for(const q of put){td.pid[q]="bw"+(++td.wn);ev(td,{k:"drop",sq:q,p:P.board[q]})}for(const q of g.fk||[])ev(td,{k:"fake",sq:q});td.waves.shift();gateNext(td,P.board)}
  /* ---------- 星樞棋兵招（第 151 題 ChatGPT 溫和版；星域一只有卒的 2 招，第 6 關守關另有招牌「引力撕裂」）：一回合最多 1 招、先預告一回合 ----------
     招式資料表：nm 招名、cost 耗靈、d 說明（{n}＝預估）；預告時 td.fx＝{id,at:哪一回合結束結算,tag:點名的子,est:若不處理預估扣幾點} */
  const FSK={zhs:{nm:"卒海過河",cost:20,d:"下回合結束時，每顆已過河的黑卒再扣你 1 元氣（最多 {c}；防禦可減少，至少扣 1）"},
    cfx:{nm:"殘卒反星",cost:10,d:"點名的卒下回合被吃，你扣 1 元氣（已是最少，防禦減不了；只生效一次）"},   /* 11/13 去重定稿：拿掉「它吃子多扣 1」（跟躍馬突營重複） */
    ylsl:{nm:"引力撕裂",cost:30,d:"下回合結束時，直接扣你 5 元氣（防禦可減少，護盾可以擋）"}};
  const bPawns=b=>{const o=[];for(let q=0;q<90;q++)if(b[q]==="p")o.push(q);return o};
  function foeDecide(P,C){const td=P.td,b=P.board,sp=td.en.sp,F=td.fsk||[],pw=bPawns(b),cr=pw.filter(q=>RW(q)>=5).length;
    if(F.includes("ylsl")&&sp>=FSK.ylsl.cost)return{id:"ylsl",est:defDmg(5,td.me&&td.me.def)};
    if(F.includes("zhs")&&sp>=FSK.zhs.cost&&cr>=2)return{id:"zhs",est:defDmg(Math.min(td.zcap,cr),td.me&&td.me.def)};
    if(F.includes("cfx")&&sp>=FSK.cfx.cost&&pw.length){let A=[];try{A=C.legal(b,"r")}catch(e){}const L=pw.filter(q=>A.some(([,t])=>t===q));   /* 只點名紅方下一步吃得到的卒；沒有就不放 */
      if(L.length){const q=L.sort((x,y)=>RW(y)-RW(x)||x-y)[0];return{id:"cfx",tag:td.pid[q],est:1}}}
    return null}
  /* 預告畫面要標的：red＝受影響的紅子（外框變紅、倒數 1），blk＝亮紅的黑子 */
  function foeMarks(td,b,C){const fx=td&&td.fx;if(!fx)return{red:[],blk:[]};if(fx.id==="ylsl")return{red:[b.indexOf("K")].filter(q=>q>=0),blk:[b.indexOf("k")].filter(q=>q>=0)};
    if(fx.id==="zhs"){const cr=bPawns(b).filter(q=>RW(q)>=5);return{red:[],blk:cr}}
    const q=sqOf(td,fx.tag);if(q==null)return{red:[],blk:[]};let red=[];try{if(C)red=C.legal(b,"r").filter(([,t])=>t===q).map(([f])=>f).filter((f,i,a)=>a.indexOf(f)===i)}catch(e){red=[]}
    return{red,blk:[q]}}   /* 殘卒反星：紅框＝吃得到那顆卒的紅子（吃了扣你 1） */
  function foeEst(td,b){const fx=td&&td.fx;if(!fx)return 0;if(fx.id==="zhs")return td.gd>0?0:defDmg(Math.min(td.zcap,bPawns(b).filter(q=>RW(q)>=5).length),td.me.def);if(fx.id==="ylsl")return td.gd>0?0:defDmg(5,td.me.def);return 1}   /* 11/14 開發者選 B：星樞三招也套防禦，預估照實際扣的算 */
  function foeResolve(td,b){const fx=td.fx;if(!fx||td.rnd<fx.at)return;td.fx=null;td.fxLast=td.rnd;
    if(fx.id==="zhs"){const n=defDmg(Math.min(td.zcap,bPawns(b).filter(q=>RW(q)>=5).length),td.me.def);if(n)hitMe(td,n,null,"卒海過河");else ev(td,{k:"miss",id:fx.id})}   /* 11/14 開發者選 B：星樞三招扣我方也套防禦（先防禦、至少 1、最多 12 → hitMe 裡護盾整次抵消；這三招沒有單顆子的小盾） */
    else if(fx.id==="ylsl")hitMe(td,defDmg(5,td.me.def),b.indexOf("K"),"引力撕裂");
    else if(!fx.used)ev(td,{k:"miss",id:fx.id})}
  /* td v3（11/13 十八招去重定稿）新欄位；舊存檔（v2）讀進來時補預設值。move／roundEnd／engine／why／cast 開頭都叫 */
  const TD3={hot:[],frzQ:[],trap:[],lockW:null,run:null,noCross:-1,noCap:[],noTake:[],pair:[],revB:0,lastR:null,thr:null};
  function tdFix(td){if(td&&td.me&&td.me.def===undefined)td.me.def=stats(td.ch,td.L).def;
    if(td&&td.me&&td.spk===undefined){for(const o of[td.me,td.en])if(o){o.sp=Math.round((+o.sp||0)*SPK);o.spMax=Math.round((+o.spMax||0)*SPK)}td.disc=Math.round((+td.disc||0)*SPK);td.me.spMax=Math.max(td.me.spMax,stats(td.ch,td.L).sp);td.me.spRg=stats(td.ch,td.L).spRegen;td.spk=SPK}   /* 11/14 晚靈力 ×10：舊盤（沒有 spk）的靈力、上限、折扣一起放大，補上每回合回靈 */   /* 11/14 防禦：舊盤（沒有 def）照角色與修為補上 */
    if(td&&td.ckR===undefined){td.cmb=null;td.ckR=-9;td.capR=-9;td.capN=0}   /* 11/14 連擊欄位：舊盤補上（不動版本號） */
    if(td&&td.hi===undefined){td.hi={mx:null,cb:0,ey:0};td.eyeX=(td.lost||[]).filter(o=>o.tag===td.eye).length;td.tal=Array.isArray(td.tal)?td.tal:[];td.r3=td.r3||((LV[td.lv-1]||{}).r3||0);td.hzU=0;td.fmR=-9;td.pjT={}}   /* 11/14 第二批：高光、陣眼被擒次數（三星）、天賦；舊盤補上 */
    if(!td||td.v>=3)return td;for(const k in TD3)if(td[k]===undefined)td[k]=Array.isArray(TD3[k])?[]:TD3[k];td.rf=Object.assign({chk:0,hurt:0,dmg:0,cap:0},td.rf||{});td.v=3;return td}
  /* ---------- 開局 ---------- */
  function boot(cfg,P,C){cfg=cfg||{};const tl=cfg.lv==="tl",rd=!tl&&cfg.raid&&RAIDM[cfg.raid.id]?{id:cfg.raid.id,v:(Math.round(+cfg.raid.v)||0)&3}:null,n=tl||rd?0:Math.max(1,Math.min(LV.length,Math.round(+cfg.lv)||1)),L=tl?TL:rd?raidLv(rd.id,rd.v):LV[n-1],st=stats(cfg.ch,cfg.L,cfg),ai=tl?{depth:1,base:1,err:0,mpv:1,margin:300}:depthOf(rd?RAID_AI:n,cfg.diff),pl=lvPlan(L),E=L.en||{};   /* 練習賽 lv "tl"：td.lv＝0；星淵急襲 cfg.raid＝{id 模板, v 星門變化}：td.lv＝0、td.rd */
    const tal=tl?[]:talValid(cfg.tal),hy=tal.includes("htgy")?TAL_HP:0;   /* 天賦（練習賽照劇本，不帶天賦）：厚土固元＝元氣上限 +8 */
    const pool=SK.filter(s=>s.ch===st.ck&&s.lv<=st.L).map(s=>s.id),sk=tl?pool.filter(id=>SKM[id].lv===1).slice(0,1):(Array.isArray(cfg.sk)?cfg.sk:[]).filter((x,i,a)=>pool.includes(x)&&a.indexOf(x)===i).slice(0,4);
    const td={v:3,spk:SPK,lv:n,nm:L.nm,ch:st.ck,cn:st.n,pc:st.pc,L:st.L,diff:Math.max(1,Math.min(5,+cfg.diff||2)),
      me:{hp:st.hp+hy,max:st.hp+hy,sp:tl?Math.max(0,st.sp-(L.spGap||0)):Math.min(st.sp,(L.sp0||0)+Math.max(0,Math.min(XM_CAP,Math.round(+cfg.xm||0)))+(tal.includes("xhcr")?TAL_SP:0)),spMax:st.sp,spRg:st.spRegen,atk:st.atk,def:st.def},en:{hp:Math.min(L.hp,E.hp0||L.hp),max:L.hp,sp:L.noEsp?0:Math.min(ESP_MAX,E.sp0||0),spMax:L.noEsp?0:ESP_MAX},rnd:0,sk:sk.length?sk:pool.slice(0,4),castR:-1,
      pid:{},eye:"r"+EYE0[st.pc],lost:[],pj:[],frz:[],frzR:[],li:[],sh:[],gd:0,ci:[],seal:0,disc:0,fn2:-1,pf:0,rf:{chk:0,hurt:0,dmg:0,cap:0},
      hot:[],frzQ:[],trap:[],lockW:null,run:null,noCross:-1,noCap:[],noTake:[],pair:[],revB:0,lastR:null,thr:null,cmb:null,ckR:-9,capR:-9,capN:0,   /* 連擊：cmb＝這回合放招標記的敵子 {r,tags}；ckR＝上一次將軍的回合；capR／capN＝連續擒子 */
      waves:pl.waves.map(w=>({at:w.at,ps:w.ps.map(x=>x.slice()),fake:w.fake})),gate:null,wn:0,ev:[],seq:0,ai,boss:L.boss||null,dealt:0,taken:0,
      tpl:L.tpl||"",ps:L.ps||"",fsk:(L.fsk||[]).slice(),zcap:L.zcap||2,shard:(L.shard||[]).map(([a,c])=>LSQ(a,c)),fx:null,fxLast:-1,
      rd,r3:L.r3||0,tal,hi:{mx:null,cb:0,ey:0},eyeX:0,hzU:0,fmR:-9,pjT:{}};   /* 11/14 第二批：rd 急襲、r3 三星回合數、tal 天賦、hi 本局高光（mx 最高一擊、cb 最高連擊、ey 陣眼擒子）、eyeX 陣眼子被擒幾次、hzU 星陣護體用過、fmR 鋒芒畢露這回合用過、pjT 赤焰火網延長的破甲 */
    for(let i=0;i<90;i++)if(P.board[i])td.pid[i]=sd(P.board[i])+i;
    if(!alive(td,td.eye)||P.board[EYE0[st.pc]]!==st.pc){const k=P.board.findIndex(p=>p===st.pc);td.eye=k>=0?"r"+k:"r85"}   /* 11/14 第二批：急襲殘陣的那一格可能站著別的子（例如俥站在傌的原位），要是本命子那一種才算 */
    gateNext(td,P.board);return td}
  /* ---------- 每走一步（local.js playApply 在 stateApply 之後、裁判之前叫） ---------- */
  function move(P,m,C){const td=tdFix(P.td);if(!td||!m)return null;const b=P.board,pc=b[m.t],tf=td.pid[m.f],tv=m.cap?td.pid[m.t]:null;
    delete td.pid[m.f];if(tf)td.pid[m.t]=tf;else delete td.pid[m.t];
    if(m.by==="r"){td.rf={chk:0,hurt:0,dmg:0,cap:0};td.lastR={f:m.f,t:m.t,p:up(pc)};td.thr=null;td.pf=up(pc)==="P"&&RW(m.t)<RW(m.f)?1:0;   /* lastR：直路衝鋒、拐彎避風看上一步誰走的 */
      if(td.run&&td.pf&&td.run.left>0&&td.rnd<td.run.until){td.run.left--;heal(td,4);if(td.run.left<=0)td.run=null}   /* 跑腿賺錢：兵往前走 1 步回 4（最多 3 次） */
      if(m.cap&&sd(m.cap)==="b"){td.rf.cap=1;const pj=tv&&td.pj.includes(tv),eye=!!tf&&tf===td.eye;td.pj=td.pj.filter(x=>x!==tv);if(td.pjT&&tv)delete td.pjT[tv];td.frz=td.frz.filter(x=>x!==tv);
        const mk=!!tv&&!!td.cmb&&td.cmb.r===td.rnd&&td.cmb.tags.includes(tv),cb=comboOf({base:capDmg(m.cap,pc,td.me.atk,eye,pj),eye,pj,mk,qx:hasT(td,"qmls")}),cp=up(pc),vp=up(m.cap),wk=VALV[cp]<VALV[vp];
        td.capN=td.capR===td.rnd-1?(+td.capN||0)+1:1;td.capR=td.rnd;if(mk)td.cmb=null;   /* 連續擒子：連著幾回合都擒到子（演出印章用，不加扣點） */
        hitEn(td,cb.n,m.t,eye?"陣眼擒子":"擒子",null,{cap:1,cp,vp,weak:wk?1:0,eye:eye?1:0,pj:pj?1:0,combo:cb.k,bonus:cb.bonus,streak:td.capN});spAdd(td,CAP_SP+cb.sp);
        if(wk&&hasT(td,"fmbl")&&td.fmR!==td.rnd){td.fmR=td.rnd;spAdd(td,TAL_SP);ev(td,{k:"tal",id:"fmbl",sq:m.t})}   /* 天賦「鋒芒畢露」：以弱克強再回 10 靈（每回合 1 次） */
        {const H=td.hi||(td.hi={mx:null,cb:0,ey:0});if(!H.mx||cb.n>H.mx.n)H.mx={n:cb.n,cp,vp};H.cb=Math.max(H.cb,td.capN);if(eye)H.ey++}   /* 本局高光 */
        if(td.fx&&td.fx.id==="cfx"&&!td.fx.used&&tv&&tv===td.fx.tag){td.fx.used=1;hitMe(td,defDmg(1,td.me.def),m.t,"殘卒反星")}}
      if(m.ck){const ch=chkDmg(td.ckR,td.rnd);td.ckR=td.rnd;hitEn(td,ch.n,b.indexOf("k"),ch.chain?"連環逼宮":"將軍",null,{chk:1,chain:ch.chain?1:0})}if(td.shard&&td.shard.includes(m.t)){ev(td,{k:"shard",sq:m.t});hitMe(td,3,m.t,"星碎格")}}
    else{td.rnd++;if(!(td.seal>=td.rnd))spAdd(td,+td.me.spRg||SPK);   /* 開發者 11/13：每回合回靈（擒子再 +CAP_SP）；11/14 晚：每回合回靈＝stats 的 spRegen（Lv1 都是 10，隨修為長）。陣眼被擒封靈的那一回合不加 */
      if(m.cap&&sd(m.cap)==="r"){
        const sh=tv?shTake(td,tv):0,raw=defDmg(Math.min(CAPMAX,Math.round(CAPB[up(m.cap)]*CAPM[up(pc)])),td.me.def),n=Math.max(0,raw-sh);   /* 順序（11/14 防禦）：先乘防禦（至少 1、最多 12）→ 再扣小盾 → hitMe 裡最後才看護盾（整次抵消） */if(td.en.sp<td.en.spMax){const e0=td.en.sp;td.en.sp=Math.min(td.en.spMax,e0+ESP_GAIN);ev(td,{k:"esp",n:td.en.sp-e0})}
        if(sh)ev(td,{k:"shuse",sq:m.t,n:Math.min(sh,raw)});if(n)hitMe(td,n,m.t,"被擒");
        if(tv)td.lost.push({p:up(m.cap),tag:tv,home:+tv.slice(1)});td.li=td.li.filter(x=>x!==tv);td.frzR=td.frzR.filter(x=>x!==tv);
        if(tv&&tv===td.eye){td.eyeX=(+td.eyeX||0)+1;if(hasT(td,"xzht")&&!td.hzU){td.hzU=1;td.me.sp=Math.max(0,td.me.sp-TAL_EYE_SP);ev(td,{k:"eye2",sq:m.t})}else{td.me.sp=0;td.seal=td.rnd+1;ev(td,{k:"eye",sq:m.t})}}   /* 天賦「星陣護體」：陣眼子第一次被擒只扣 20 靈、不停招 */
        const pi=tv?td.pair.findIndex(o=>o.until>=td.rnd&&(o.a===tv||o.b===tv)):-1;   /* 雙燕斜護：一隻被擒，另一隻下一次被擒不扣（整次小盾） */
        if(pi>=0){const o=td.pair.splice(pi,1)[0],mate=o.a===tv?o.b:o.a,ms=sqOf(td,mate);if(ms!=null){td.sh.push({tag:mate,v:CAPMAX,until:td.rnd+3});ev(td,{k:"sh",sq:ms,n:0,src:"pair"})}}}
      if(tf&&sd(pc)==="b"&&pc!=="k"){
        if(td.trap.some(o=>o.sq===m.t&&o.until>=td.rnd)){freezeN(td,tf,1);ev(td,{k:"frz",sq:m.t,src:"trap"})}   /* 仕角守門：走進守門點 → 定身 1 回合 */
        if(td.lockW&&td.lockW.tag===tf&&td.lockW.at===td.rnd){td.lockW=null;freezeN(td,tf,2);ev(td,{k:"frz",sq:m.t,src:"lock",n:2})}}   /* 銅鎖止步：鎖住的子這回合走了 → 定身 2 回合 */
      if(m.ck){td.rf.chk=1;const i=ciOk(td);if(i>=0){td.ci.splice(i,1);ev(td,{k:"ci",sq:b.indexOf("K")})}else hitMe(td,defDmg(CHK_HIT,td.me.def),b.indexOf("K"),"被將軍")}   /* 被將軍：免將先擋 → 5×防禦 → 護盾 */
      if(td.shard&&td.shard.includes(m.t)){ev(td,{k:"shard",sq:m.t});hitEn(td,3,m.t,"星碎格")}   /* 星碎格：踩上去扣自己 3 元氣（敵我都算） */
      roundEnd(P,C)}
    return endOf(td,m.by)}
  /* 回合結束（星樞走完）：過河扣 1、九宮星核多扣 2（雙方都算）→ 到期 → 炮架火網標破甲 → 星門落子 */
  function roundEnd(P,C){const td=tdFix(P.td),b=P.board;let fm=0,fk=0,fe=0;
    for(let q=0;q<90;q++){const p=b[q];if(!p)continue;const r=RW(q),c=CL(q),pal=c>=3&&c<=5;
      if(sd(p)==="b"&&p!=="k"&&r>=5){fm+=1;if(r>=7&&pal)fk+=2}else if(sd(p)==="r"&&p!=="K"&&r<=4){fe+=1;if(r<=2&&pal)fe+=2}}
    const ncx=td.noCross>=td.rnd;if(ncx&&fm){ev(td,{k:"ncx",n:fm});fm=0}   /* 青玉護棚：只免「過河 1」，九宮星核那 2 照扣 */
    if(fe)hitEn(td,fe,null,"過河");if(fm+fk)hitMe(td,fm+fk,null,fm?"過河":"九宮星核");if(td.fsk)foeResolve(td,b);
    if(hasT(td,"qxgm")&&td.me.hp>0){const k=Math.min(TAL_GM_MAX,Math.floor(own(b,(p,q)=>p!=="K"&&RW(q)<=4).length/2)),h0=td.me.hp;if(k){td.me.hp=Math.min(td.me.max,h0+k);if(td.me.hp>h0){ev(td,{k:"heal",n:td.me.hp-h0});ev(td,{k:"tal",id:"qxgm",n:td.me.hp-h0})}}}   /* 天賦「七星共鳴」（固定不隨機）：每 2 顆過河的己方子回 1 元氣，每回合最多 +2 */
    if(td.pjT)for(const t in td.pjT)if(td.pjT[t]<td.rnd||!alive(td,t)){td.pj=td.pj.filter(x=>x!==t);delete td.pjT[t]}   /* 赤焰火網延長的破甲到期 */
    if(td.noCross>=0&&td.noCross<=td.rnd)td.noCross=-1;
    td.sh=td.sh.filter(x=>x.until>td.rnd&&alive(td,x.tag));td.ci=td.ci.filter(x=>x.until==null||x.until>td.rnd);td.frz=[];
    td.frzQ=td.frzQ.filter(o=>o.n>0&&alive(td,o.tag));for(const o of td.frzQ){if(!td.frz.includes(o.tag))td.frz.push(o.tag);o.n--}td.frzQ=td.frzQ.filter(o=>o.n>0);   /* 多回合定身：清完 frz 才推進去 */
    td.hot=td.hot.filter(h=>{if(b[76]!=="K")return false;if(td.rnd<=h.until)heal(td,4);return td.rnd<h.until});   /* 九宮守心：帥在正中心每回合結束回 4，離開就停 */
    td.trap=td.trap.filter(o=>o.until>td.rnd);td.noCap=td.noCap.filter(o=>o.until>td.rnd&&alive(td,o.tag));td.noTake=td.noTake.filter(o=>o.until>td.rnd&&alive(td,o.tag));
    td.pair=td.pair.filter(o=>o.until>td.rnd);if(td.run&&td.run.until<=td.rnd)td.run=null;if(td.lockW&&td.lockW.at<=td.rnd)td.lockW=null;
    markNet(td,b,td.fn2>=td.rnd);if(td.fn2>=0&&td.fn2<=td.rnd)td.fn2=-1;
    td.pj=td.pj.filter(t=>alive(td,t));gateDrop(P,C);
    if(td.fsk&&!td.fx&&td.fxLast!==td.rnd&&td.en.hp>0){const d=foeDecide(P,C);if(d){td.en.sp-=FSK[d.id].cost;td.fx=Object.assign(d,{at:td.rnd+1});ev(td,{k:"fore",id:d.id})}}}   /* 星樞放招先預告一回合（一回合最多 1 招） */
  function endOf(td,mover){const a=td.me.hp<=0,z=td.en.hp<=0;if(a&&z)return{end:{w:mover,why:mover==="r"?"雙方元氣同時歸零，走棋方勝":"雙方元氣同時歸零，星樞走棋先到"}};
    if(z)return{end:{w:"r",why:"星樞元氣歸零"}};if(a)return{end:{w:"b",why:"元氣耗盡"}};return null}
  /* ---------- 星樞：推算步數、失誤、定身的子不走 ---------- */
  /* 星樞這一步不能走的：定身的子（frz）、迷煙裡的子吃子（noCap）、吃煙幕裡的子（noTake）。一層一層濾，濾完沒步就那一層不濾（沒有別步就照常） */
  function banMoves(td,b,A){const at=L=>new Set(L.filter(o=>o.until>td.rnd).map(o=>sqOf(td,o.tag)).filter(x=>x!=null));
    const fz=new Set(td.frz.map(t=>sqOf(td,t)).filter(x=>x!=null)),nc=at(td.noCap||[]),nt=at(td.noTake||[]);let L=A;
    for(const ok of[([f])=>!fz.has(f),([f,t])=>!(nc.has(f)&&b[t]),([,t])=>!nt.has(t)]){const L2=L.filter(ok);if(L2.length)L=L2}return L}
  function engine(P,C){const td=tdFix(P.td),ai=td.ai||depthOf(td.lv,td.diff);let sm=null;
    if(td.frz.length||(td.noCap&&td.noCap.length)||(td.noTake&&td.noTake.length)){const A=C.legal(P.board,P.turn),L=banMoves(td,P.board,A);if(L.length&&L.length<A.length)sm=L.map(([f,t])=>C.iccs(f,t))}
    return{depth:ai.depth,mpv:ai.mpv||5,err:ai.err,margin:ai.margin||300,sm,ps:td.ps||"",b:P.board.slice()}}
  /* 星樞性格（第 151 題）：在跟最佳著差不到 150 分的候選裡，照性格加權挑——保將（將士象、回家）、搶過河、愛吃子、愛架砲 */
  const uSq=(u,i)=>(9-(+u[i+1]))*9+(u.charCodeAt(i)-97);
  function bNet(b){let n=0;for(let s=0;s<90;s++){if(b[s]!=="c")continue;for(const[dr,dc]of[[1,0],[-1,0],[0,1],[0,-1]]){let r=RW(s)+dr,c=CL(s)+dc,k=0;while(r>=0&&r<10&&c>=0&&c<9){const q=r*9+c;if(b[q]){k++;if(k===2){if(sd(b[q])==="r")n++;break}}r+=dr;c+=dc}}}return n}
  function psBonus(ps,b,u){if(!ps||!b||!u)return 0;const f=uSq(u,0),t=uSq(u,2),p=b[f],cap=b[t];if(!p)return 0;let v=0;
    if(ps==="保將"){if("kab".includes(p))v+=40;if(p!=="p"&&RW(t)<RW(f))v+=25;if(RW(t)>=5&&RW(f)<5)v-=40}
    else if(ps==="搶過河"){if(RW(t)>=5&&RW(f)<5)v+=90;if(p==="p"&&RW(t)>RW(f))v+=40}
    else if(ps==="愛吃子"){if(cap)v+=25*(VALV[up(cap)]||1)+20}
    else if(ps==="愛架砲"){if(p==="c")v+=40;const x=b.slice();x[t]=p;x[f]=null;v+=50*Math.max(0,bNet(x)-bNet(b))}
    return v}
  function pick(r,cfg,rnd){const L=(r&&r.lines||[]).filter(x=>x&&x.mv);if(!L.length)return r.best;rnd=rnd||Math.random;
    if(rnd()<cfg.err){const top=L[0].v,c=L.slice(1).filter(x=>x.v>=top-cfg.margin&&x.v>-20000);if(c.length)return c[Math.floor(rnd()*c.length)].mv}
    if(cfg.ps&&cfg.b&&L.length>1){const top=L[0].v;let best=L[0],bv=-1e9;for(const x of L){if(x.v<top-150||x.v<-20000)continue;const s=x.v+psBonus(cfg.ps,cfg.b,x.mv);if(s>bv){bv=s;best=x}}return best.mv}
    return L[0].mv}
  /* ---------- 招式（v0.1：七位各前 5 招，解鎖修為 1、6、12、17、23；照十八招定稿表） ---------- */
  const own=(b,f)=>{const o=[];for(let q=0;q<90;q++)if(b[q]&&sd(b[q])==="r"&&(!f||f(b[q],q)))o.push(q);return o};
  const foe=(b,f)=>{const o=[];for(let q=0;q<90;q++)if(b[q]&&sd(b[q])==="b"&&b[q]!=="k"&&(!f||f(b[q],q)))o.push(q);return o};
  const rc0=(b,C)=>{try{return C.inCheck(b,"r")}catch(e){return false}};
  const rmOk=(b,q,C)=>{const t=b.slice();t[q]=null;return okAfter(t,C,rc0(b,C))};
  const mvOk=(b,f,t,C)=>{if(b[t]||!canStand(b[f],t))return false;const x=b.slice();x[t]=x[f];x[f]=null;return okAfter(x,C,rc0(b,C))};
  const swOk=(b,a,c,C)=>{if(a===c||!b[a]||!b[c]||up(b[a])===up(b[c])||!canStand(b[a],c)||!canStand(b[c],a))return false;const x=b.slice();x[a]=b[c];x[c]=b[a];return okAfter(x,C,rc0(b,C))};
  const frozenMine=td=>td.frzR.map(t=>sqOf(td,t)).filter(x=>x!=null);
  /* 斜角、上下左右相鄰的格（在盤內） */
  const nbr=(q,D)=>{const o=[];for(const[dr,dc]of D){const r=RW(q)+dr,c=CL(q)+dc;if(r>=0&&r<10&&c>=0&&c<9)o.push(r*9+c)}return o};
  const DG=[[1,1],[1,-1],[-1,1],[-1,-1]],OR=[[1,0],[-1,0],[0,1],[0,-1]];
  /* 仕角守門：己方仕斜角相鄰的空點 */
  function gateSq(b){const o=[];for(let s=0;s<90;s++)if(b[s]==="A")for(const z of nbr(s,DG))if(!b[z]&&!o.includes(z))o.push(z);return o.sort((a,c)=>a-c)}
  /* 近侍護帥：帥斜角相鄰的己方仕幾顆 */
  const kAdv=b=>{const k=b.indexOf("K");return k<0?0:nbr(k,DG).filter(z=>b[z]==="A").length};
  /* 認轍尋路：下一步擒得到己方俥的敵子（來源格去重） */
  function rookThreats(b,C){let A=[];try{A=C.legal(b,"b")}catch(e){return[]}const o=[];for(const[f,t]of A)if(b[t]==="R"&&!o.includes(f))o.push(f);return o.sort((a,c)=>a-c)}
  /* 馬腿解圍：q 是己方子、上下左右相鄰有己方傌（蹩住馬腿）→ 回傳己方半場離 q 最近、合法、而且不是那些傌馬腿的空格（同距離取左上）；沒有＝null */
  function legDest(b,q,C){if(!b[q]||sd(b[q])!=="r")return null;const H=nbr(q,OR).filter(h=>b[h]==="N");if(!H.length)return null;const legs=new Set();for(const h of H)for(const z of nbr(h,OR))legs.add(z);
    const fw=z=>sd(b[q])==="r"?RW(z)<RW(q):RW(z)>RW(q);   /* 開發者 11/13：不往前移（照被移動子那一方的前進方向），只到左右或後方 */
    const D=[];for(let z=45;z<90;z++)if(z!==q&&!b[z]&&!legs.has(z)&&!fw(z))D.push(z);D.sort((a,c)=>Math.abs(RW(a)-RW(q))+Math.abs(CL(a)-CL(q))-Math.abs(RW(c)-RW(q))-Math.abs(CL(c)-CL(q))||a-c);
    for(const z of D)if(mvOk(b,q,z,C))return z;return null}
  const NJ=[[-2,-1],[-2,1],[2,-1],[2,1],[-1,-2],[1,-2],[-1,2],[1,2]];
  function knightHits(b){const o=[];for(let s=0;s<90;s++){if(b[s]!=="N")continue;for(const[dr,dc]of NJ){const r=RW(s)+dr,c=CL(s)+dc;if(r<0||r>9||c<0||c>8)continue;const q=r*9+c;if(b[q]&&sd(b[q])==="b"&&b[q]!=="k"&&!o.includes(q))o.push(q)}}return o}
  const lineFoes=(b,q,o)=>{const L=[];for(let i=0;i<9&&o==="h";i++){const z=RW(q)*9+i;if(b[z]&&sd(b[z])==="b"&&b[z]!=="k")L.push(z)}for(let r=0;r<10&&o==="v";r++){const z=r*9+CL(q);if(b[z]&&sd(b[z])==="b"&&b[z]!=="k")L.push(z)}return L.sort((a,c)=>VALV[up(b[c])]-VALV[up(b[a])]||a-c)};
  const diagMates=(b,q)=>{const o=[];for(const[dr,dc]of[[1,1],[1,-1],[-1,1],[-1,-1]]){const r=RW(q)+dr,c=CL(q)+dc;if(r<0||r>9||c<0||c>8)continue;const z=r*9+c;if(b[z]&&sd(b[z])==="r")o.push(z)}return o};
  function freeze(x,q){const tag=x.td.pid[q];if(tag&&!x.td.frz.includes(tag))x.td.frz.push(tag);ev(x.td,{k:"frz",sq:q,src:"sk"})}
  function unfreeze(x,q){const tag=x.td.pid[q];x.td.frzR=x.td.frzR.filter(t=>t!==tag);ev(x.td,{k:"unfrz",sq:q})}
  /* ===== 招式資料表（開發者 11/13 硬規則「招式不能重複、要招如其名」：第 2～5 招之後照新版定稿替換——只改這張表，一招一筆）=====
     欄位：id、ch（角色）、lv（解鎖修為）、nm（招名）、cost（耗靈）、cls（類別）、d（說明）、
       tg(x,已選)＝下一步可以點的格（或選項 {v,l}），steps＝要點幾步（沒有 tg＝不用選目標），none＝沒有目標時的說明，need(x)＝其他條件（回傳原因字串＝不能放），
       heal＝回元氣招（元氣滿了不能放），cao＝草書招名圖（沒有就用文字），run(x,目標)＝效果。
     x＝{P,td,b:盤面,C:XQCore}；效果一律用上面的共用工具：heal、spAdd、shAdd（小盾）、hitPiece（打某顆子扣元氣，乘攻擊倍率、破甲多 1、上限 12）、freeze（定身）、rm（移除）、tp（瞬移）、edit（改盤面） */
  const SK=[];const S=o=>SK.push(Object.assign({steps:o.tg?1:0,cao:null},o));
  /* 沈方庭（帥）團補師 */
  S({id:"shen1",ch:"x_shuai",lv:1,nm:"重金懸賞",cost:30,cls:"回元氣",d:"回 15 元氣",heal:1,cao:"data/bhtd/cao/cao_x_shen.webp",run:x=>{heal(x.td,15)}});
  S({id:"shen2",ch:"x_shuai",lv:6,nm:"庭院小息",cost:20,cls:"回元氣",d:"回 8；這回合被將軍過，改回 12",heal:1,run:x=>{heal(x.td,x.td.rf.chk?12:8)}});
  S({id:"shen3",ch:"x_shuai",lv:12,nm:"帥令安軍",cost:20,cls:"控制",d:"解除己方 1 子的定身或鎖",tg:x=>frozenMine(x.td),none:"沒有被定身或鎖住的子",run:(x,t)=>unfreeze(x,t[0])});
  S({id:"shen4",ch:"x_shuai",lv:17,nm:"當票回春",cost:30,cls:"回元氣",d:"回 12；己方元氣低於一半再回 5",heal:1,run:x=>{heal(x.td,12+(x.td.me.hp<x.td.me.max/2?5:0))}});
  S({id:"shen5",ch:"x_shuai",lv:23,nm:"九宮守心",cost:30,cls:"回元氣",d:"帥站在九宮正中心才能用：接下來 3 回合，每回合結束回 4（帥離開正中心就停）",heal:1,
    need:x=>x.b[76]==="K"?null:"帥要站在九宮正中心",run:x=>{x.td.hot=[{until:x.td.rnd+3}];ev(x.td,{k:"hot",sq:76})}});   /* 再放一次＝重新算 3 回合，不疊加 */
  /* 鐵連城（仕）坦克 */
  S({id:"tie1",ch:"x_shi",lv:1,nm:"鐵壁銅牆",cost:20,cls:"護盾",d:"護盾：抵消下一次扣元氣",cao:"data/bhtd/cao/cao_x_tie.webp",run:x=>{x.td.gd++;ev(x.td,{k:"gd",n:1})}});
  S({id:"tie2",ch:"x_shi",lv:6,nm:"仕角守門",cost:20,cls:"控制",d:"2 回合內，己方仕斜角相鄰的空點變成「守門點」：敵子走進去就定身 1 回合",
    need:x=>gateSq(x.b).length?null:"仕的斜角沒有空點",run:x=>{const L=gateSq(x.b);for(const q of L)x.td.trap.push({sq:q,until:x.td.rnd+2});ev(x.td,{k:"trap",sq:L})}});
  S({id:"tie3",ch:"x_shi",lv:12,nm:"銅鎖止步",cost:30,cls:"控制",d:"銅鎖扣住敵方 1 顆非帥將子：它下回合如果走動，走完就定身 2 回合（不動就沒事）",tg:x=>foe(x.b),
    run:(x,t)=>{x.td.lockW={tag:x.td.pid[t[0]],at:x.td.rnd+1};ev(x.td,{k:"lock",sq:t[0]})}});
  S({id:"tie4",ch:"x_shi",lv:17,nm:"近侍護帥",cost:30,cls:"護盾",d:"帥的斜角相鄰每有 1 顆己方仕，得 1 層護盾（最多 2 層；一顆都沒有不能用）",
    need:x=>kAdv(x.b)?null:"帥的斜角沒有己方仕",run:x=>{const n=Math.min(2,kAdv(x.b));x.td.gd+=n;ev(x.td,{k:"gd",n})}});
  S({id:"tie5",ch:"x_shi",lv:23,nm:"盾陣回靈",cost:10,cls:"靈力",d:"這回合每被扣 4 元氣，得 10 靈力（最多 30）",need:x=>(x.td.rf.dmg||0)>=4?null:"這回合被扣不到 4 元氣",run:x=>{spAdd(x.td,SPK*Math.min(3,Math.floor(x.td.rf.dmg/4)))}});
  /* 步越溪（兵）輔助成長 */
  S({id:"bu1",ch:"x_bing",lv:1,nm:"神行百里",cost:10,cls:"控制",d:"交換己方 2 子位置（換完要合法）",steps:2,cao:"data/bhtd/cao/cao_x_bu.webp",
    tg:(x,pk)=>{if(!pk.length)return own(x.b,(p,q)=>own(x.b).some(z=>swOk(x.b,q,z,x.C)));return own(x.b).filter(z=>swOk(x.b,pk[0],z,x.C))},none:"沒有可以交換的兩顆子",
    run:(x,t)=>{const b=x.P.board,a=t[0],c=t[1],pa=b[a],pc=b[c],ta=x.td.pid[a],tc=x.td.pid[c];edit(x.P,x.C,{[a]:pc,[c]:pa});x.td.pid[a]=tc;x.td.pid[c]=ta;ev(x.td,{k:"sw",sq:a,t:c,src:"sk"})}});
  S({id:"bu2",ch:"x_bing",lv:6,nm:"勇往直前",cost:10,cls:"靈力",d:"上一回合有己方兵往前走，得 20 靈力",need:x=>x.td.pf?null:"上一步要有兵往前走",run:x=>{spAdd(x.td,2*SPK)}});
  S({id:"bu3",ch:"x_bing",lv:12,nm:"跑腿賺錢",cost:20,cls:"回元氣",d:"3 回合內，己方兵每往前走 1 步回 4（最多 3 次）",run:x=>{x.td.run={left:3,until:x.td.rnd+3};ev(x.td,{k:"run",n:3})}});   /* 元氣滿也能先放；結算在 move() 紅方分支 */
  S({id:"bu4",ch:"x_bing",lv:17,nm:"步步為營",cost:20,cls:"護盾",d:"己方 1 顆兵，下一次虛空鎖鎖不住它",tg:x=>own(x.b,p=>p==="P").filter(q=>!x.td.li.includes(x.td.pid[q])),none:"沒有可以護住的兵",run:(x,t)=>{x.td.li.push(x.td.pid[t[0]]);ev(x.td,{k:"sh",sq:t[0],n:0})}});
  S({id:"bu5",ch:"x_bing",lv:23,nm:"揚州快步",cost:10,cls:"靈力",d:"下一招耗靈 −20（最少 10）",run:x=>{x.td.disc=2*SPK;ev(x.td,{k:"sp",n:0})}});
  /* 齊轍（俥）主攻輸出 */
  S({id:"qi1",ch:"x_swordboy",lv:1,nm:"一劍破甲",cost:40,cls:"攻擊",d:"移除敵方 1 顆兵、仕或相",cao:"data/bhtd/cao/cao_x_qi.webp",tg:x=>foe(x.b,(p,q)=>"pab".includes(p)&&rmOk(x.b,q,x.C)),none:"沒有可以移除的卒、士、象",run:(x,t)=>rm(x,t[0])});
  S({id:"qi2",ch:"x_swordboy",lv:6,nm:"直路衝鋒",cost:20,cls:"攻擊",d:"上一步是己方俥走的才能用：俥直走了幾格，就扣「格數 × 2」（最多 10）",need:x=>x.td.lastR&&x.td.lastR.p==="R"?null:"上一步要是俥走的",
    run:x=>{const r=x.td.lastR,d=Math.abs(RW(r.f)-RW(r.t))+Math.abs(CL(r.f)-CL(r.t));hitRaw(x.td,Math.min(10,d*2),"直路衝鋒")}});
  S({id:"qi3",ch:"x_swordboy",lv:12,nm:"輪牌護身",cost:20,cls:"護盾",d:"己方 1 顆俥得小盾 10",tg:x=>own(x.b,p=>p==="R"),none:"場上沒有俥",run:(x,t)=>shAdd(x.td,t[0],10)});
  S({id:"qi4",ch:"x_swordboy",lv:17,nm:"認轍尋路",cost:10,cls:"輔助",d:"標出下一步能擒到己方俥的所有敵子",need:x=>rookThreats(x.b,x.C).length?null:"現在沒有敵子擒得到俥",
    run:x=>{const L=rookThreats(x.b,x.C);x.td.thr={q:L};ev(x.td,{k:"thr",sq:L})}});   /* 標記留到紅方走下一步（move 清掉） */
  S({id:"qi5",ch:"x_swordboy",lv:23,nm:"長街破陣",cost:30,cls:"團攻",d:"指定一條橫線或直線，最多 3 顆非帥將敵子各扣 6",steps:2,
    tg:(x,pk)=>{if(!pk.length)return foe(x.b);const q=pk[0],h=lineFoes(x.b,q,"h").length,v=lineFoes(x.b,q,"v").length;return[{v:"h",l:`橫線（${Math.min(3,h)} 顆）`,n:h},{v:"v",l:`直線（${Math.min(3,v)} 顆）`,n:v}].filter(o=>o.n>0)},
    run:(x,t)=>{for(const q of lineFoes(x.b,t[0],t[1]).slice(0,3))hitPiece(x.td,q,6,"長街破陣")}});
  /* 田飛燕（相）守護控場 */
  S({id:"tian1",ch:"x_spiritgirl",lv:1,nm:"飛燕還巢",cost:30,cls:"輔助",d:"己方 1 顆大子（俥、炮、傌）瞬移回己方底線空格",steps:2,cao:"data/bhtd/cao/cao_x_tian.webp",
    tg:(x,pk)=>{const D=[81,82,83,84,85,86,87,88,89];if(!pk.length)return own(x.b,(p,q)=>"RNC".includes(p)&&D.some(z=>mvOk(x.b,q,z,x.C)));return D.filter(z=>mvOk(x.b,pk[0],z,x.C))},none:"沒有可以回到底線的大子",run:(x,t)=>tp(x,t[0],t[1])});
  S({id:"tian2",ch:"x_spiritgirl",lv:6,nm:"青玉護棚",cost:20,cls:"團防",d:"2 回合內，敵子過河每回合扣的元氣不算（停進九宮多扣的 2 照扣）",run:x=>{x.td.noCross=x.td.rnd+2;ev(x.td,{k:"ncx",n:0})}});
  S({id:"tian3",ch:"x_spiritgirl",lv:12,nm:"象眼迷煙",cost:20,cls:"控制",d:"己方半場內 1 顆敵子，2 回合內不能吃子（還可以走）",tg:x=>foe(x.b,(p,q)=>RW(q)>=5),none:"己方半場沒有敵子",
    run:(x,t)=>{const tag=x.td.pid[t[0]];x.td.noCap=x.td.noCap.filter(o=>o.tag!==tag);x.td.noCap.push({tag,until:x.td.rnd+2});ev(x.td,{k:"ncap",sq:t[0]})}});
  S({id:"tian4",ch:"x_spiritgirl",lv:17,nm:"渡口清茶",cost:20,cls:"回元氣",d:"回 10；這回合己方擒過子就不能用（要靜下來才喝得了茶）",heal:1,need:x=>x.td.rf.cap?"剛擒過子，靜下來才喝得了茶":null,run:x=>{heal(x.td,10)}});
  S({id:"tian5",ch:"x_spiritgirl",lv:23,nm:"雙燕斜護",cost:30,cls:"團防",d:"指定 2 顆斜向相鄰的己方子結成一對：2 回合內其中一顆被擒，另一顆下一次被擒不扣元氣",steps:2,
    tg:(x,pk)=>{if(!pk.length)return own(x.b,(p,q)=>diagMates(x.b,q).length>0);return diagMates(x.b,pk[0])},none:"沒有斜向相鄰的兩顆子",
    run:(x,t)=>{x.td.pair.push({a:x.td.pid[t[0]],b:x.td.pid[t[1]],until:x.td.rnd+2});ev(x.td,{k:"pair",sq:t[0],t:t[1]})}});
  /* 雷借花（炮）遠程範圍——煙火、火花，不用鎖鏈（開發者 11/13 第 150 題） */
  S({id:"lei1",ch:"x_martialgirl",lv:1,nm:"煙火震懾",cost:20,cls:"控制",d:"敵方 1 顆非帥將子下回合不能動",cao:"data/bhtd/cao/cao_x_lei.webp",tg:x=>foe(x.b),run:(x,t)=>freeze(x,t[0])});
  S({id:"lei2",ch:"x_martialgirl",lv:6,nm:"隔子星花",cost:20,cls:"攻擊",d:"己方炮隔一子瞄到的 1 顆非帥將敵子扣 8；當炮架的那顆如果也是敵子，再扣它 4",tg:x=>netHits(x.b,false).map(h=>h.t),none:"炮隔一子瞄不到敵子",
    run:(x,t)=>{const h=netHits(x.b,false).find(o=>o.t===t[0]),s=h&&h.scr,ps=s!=null?x.b[s]:null;hitPiece(x.td,t[0],8,"隔子星花");if(ps&&sd(ps)==="b"&&ps!=="k")hitPiece(x.td,s,4,"隔子星花")}});
  S({id:"lei3",ch:"x_martialgirl",lv:12,nm:"花火連環",cost:30,cls:"團攻",d:"最多 3 顆破甲敵子各扣 6",need:x=>foe(x.b,(p,q)=>x.td.pj.includes(x.td.pid[q])).length?null:"場上沒有破甲的敵子",
    run:x=>{const L=foe(x.b,(p,q)=>x.td.pj.includes(x.td.pid[q])).sort((a,c)=>VALV[up(x.b[c])]-VALV[up(x.b[a])]).slice(0,3);for(const q of L)hitPiece(x.td,q,6,"花火連環")}});
  S({id:"lei4",ch:"x_martialgirl",lv:17,nm:"火網標記",cost:20,cls:"輔助",d:"2 回合內，炮架火網隔兩子瞄到的敵子也標成破甲",run:x=>{x.td.fn2=x.td.rnd+2;markNet(x.td,x.b,true)}});
  S({id:"lei5",ch:"x_martialgirl",lv:23,nm:"煙幕護耳",cost:20,cls:"護盾",d:"己方 1 子躲進煙幕：下回合敵子不能吃它（沒有別步就照常）",tg:x=>own(x.b,p=>p!=="K"),
    run:(x,t)=>{const tag=x.td.pid[t[0]];x.td.noTake=x.td.noTake.filter(o=>o.tag!==tag);x.td.noTake.push({tag,until:x.td.rnd+1});ev(x.td,{k:"ntk",sq:t[0]})}});
  /* 駱躍梅（傌）遊俠救援 */
  S({id:"luo1",ch:"x_miaogirl",lv:1,nm:"回營",cost:50,cls:"復活",d:"復活己方 1 顆被擒的子，放回原位（原位有子不能用）",cao:"data/bhtd/cao/cao_x_luo.webp",
    tg:x=>x.td.lost.filter(o=>{if(x.b[o.home]||!canStand(o.p,o.home))return false;const t=x.b.slice();t[o.home]=o.p;return okAfter(t,x.C,rc0(x.b,x.C))}).map(o=>o.home).filter((q,i,a)=>a.indexOf(q)===i),none:"沒有能回營的子（原位被佔住、或還沒有子被擒）",
    run:(x,t)=>{const i=x.td.lost.findIndex(o=>o.home===t[0]);if(i<0)return"找不到這顆子";const o=x.td.lost.splice(i,1)[0];edit(x.P,x.C,{[o.home]:o.p});x.td.pid[o.home]=o.tag;ev(x.td,{k:"rev",sq:o.home,src:"sk"});
      if(x.td.revB){x.td.revB=0;heal(x.td,10)}}});   /* 驛鈴回氣：之前放過＝這次復活再回 10（之後做千里回營也要加） */
  S({id:"luo2",ch:"x_miaogirl",lv:6,nm:"紅馬跳影",cost:20,cls:"攻擊",d:"跟己方傌呈日字的 1 顆非帥將敵子：扣 10",tg:x=>knightHits(x.b),none:"傌的日字點上沒有敵子",run:(x,t)=>{hitPiece(x.td,t[0],10,"紅馬跳影")}});
  S({id:"luo3",ch:"x_miaogirl",lv:12,nm:"拐彎避風",cost:20,cls:"護盾",d:"上一步是己方傌走的（拐了彎），得 1 層護盾",need:x=>x.td.lastR&&x.td.lastR.p==="N"?null:"上一步要是傌走的",run:x=>{x.td.gd++;ev(x.td,{k:"gd",n:1})}});
  S({id:"luo4",ch:"x_miaogirl",lv:17,nm:"驛鈴回氣",cost:20,cls:"回元氣",d:"回 6；這場下一次復活己方子時，再回 10",heal:1,run:x=>{heal(x.td,6);x.td.revB=1}});
  S({id:"luo5",ch:"x_miaogirl",lv:23,nm:"馬腿解圍",cost:20,cls:"輔助",d:"己方 1 顆傌被自己人蹩住馬腿時，把蹩腿的那顆己方子瞬移到己方半場最近的合法空位（只往左右或後方，不往前）",
    tg:x=>own(x.b,(p,q)=>legDest(x.b,q,x.C)!=null),none:"沒有被自己人蹩住、又能往左右或後方挪開的傌",run:(x,t)=>{const z=legDest(x.b,t[0],x.C);if(z==null)return"找不到可以移過去的空位";tp(x,t[0],z)}});
  function rm(x,q){const tag=x.td.pid[q];edit(x.P,x.C,{[q]:null});delete x.td.pid[q];x.td.pj=x.td.pj.filter(t=>t!==tag);x.td.frz=x.td.frz.filter(t=>t!==tag);ev(x.td,{k:"rm",sq:q,src:"sk"})}
  function tp(x,f,t){const p=x.P.board[f],tag=x.td.pid[f];edit(x.P,x.C,{[f]:null,[t]:p});delete x.td.pid[f];x.td.pid[t]=tag;ev(x.td,{k:"tp",sq:f,t,src:"sk"})}
  const SKM={};for(const s of SK)SKM[s.id]=s;
  const costOf=(td,id)=>{const s=SKM[id];if(!s)return 99;return td.disc>0?Math.max(SPK,s.cost-td.disc):s.cost};
  const ctx=(P,C)=>({P,td:P.td,b:P.board,C});
  /* 下一步可以點哪些（UI 和 cast 驗證共用）：回傳格子陣列，或長街破陣第二步的 {v,l} 選項 */
  function targets(P,id,pk,C){const s=SKM[id];if(!s||!s.tg)return[];try{return s.tg(ctx(P,C),pk||[])||[]}catch(e){return[]}}
  /* 能不能放（不含「輪到你」，那個 local.js 擋）：回傳 null＝可以，否則是原因 */
  function why(P,id,C){const td=tdFix(P.td),s=SKM[id];if(!td||!s||!td.sk.includes(id))return"這場沒有帶這招";if(td.seal>td.rnd)return"陣眼子被擒，招式停 1 回合";if(td.castR===td.rnd)return"這回合已經放過招了（一回合一招）";
    if(td.me.sp<costOf(td,id))return`靈力不夠（要 ${costOf(td,id)}）`;if(s.heal&&td.me.hp>=td.me.max)return"元氣是滿的";if(s.need){const w=s.need(ctx(P,C));if(w)return w}
    if(s.tg&&!targets(P,id,[],C).length)return s.none||"沒有可以用的目標";return null}
  function cast(P,b,C){const td=tdFix(P.td),id=String(b&&b.k||""),s=SKM[id];if(!s)return{err:"沒有這招"};const w=why(P,id,C);if(w)return{err:w};
    const tg=Array.isArray(b.tg)?b.tg.slice(0,4):[];if(s.tg){if(tg.length<s.steps)return{err:"還沒選好目標"};
      for(let i=0;i<s.steps;i++){const L=targets(P,id,tg.slice(0,i),C),v=tg[i],ok=L.some(o=>o&&typeof o==="object"?o.v===v:o===+v);if(!ok)return{err:"這個目標不能用"};if(typeof L[0]!=="object")tg[i]=+v}}
    const cost=costOf(td,id),d0=td.disc;td.disc=0;const pre=tg.map(v=>typeof v==="number"?td.pid[v]:null),s0=td.seq;const r=s.run(ctx(P,C),tg);if(typeof r==="string"){td.disc=d0;return{err:r}}
    {const tags=pre.concat(td.ev.filter(e=>e.s>s0&&typeof e.sq==="number"&&/^(hit|frz|lock|ncap|mark)$/.test(e.k)).map(e=>td.pid[e.sq])).filter((t,i,a)=>t&&t[0]==="b"&&a.indexOf(t)===i&&alive(td,t));if(tags.length)td.cmb={r:td.rnd,tags}}   /* 奇謀連擊：這招點到、打到、定住的敵子記下來，同一回合走棋吃掉它就連擊 */
    td.me.sp=Math.max(0,td.me.sp-cost);td.castR=td.rnd;ev(td,{k:"cast",id,nm:s.nm});return endOf(td,"r")||{ok:true}}
  /* ===== 11/14 爽度第二批（story/黑洞塔防爽度_Gemini提案與審查_1114.md 第三節「開發者 11/14 選定」，照第二節 Claude 修正版）=====
     不改象棋規則、不改 16 子、單次扣元氣上限 12 照舊；天賦只在黑洞塔防（主線關、星淵急襲）生效，練習賽照劇本不帶，線上與一般對局不經過這支。
     ① 天賦樹 TAL：7 節點 4 層、共 240 星塵；點下一層要上一層至少一個；關卡外免費無限重置（talReset 全退）。
     ② 結算：三星 starsOf、差一點 nearOf、星塵 dustOf、標題評語 gradeOf／GRADE／GSAY、七星「再來一場」AGAIN。
     ③ 星淵急襲 RAID：中局殘陣模板（雙方各 9～11 子，只減子不加子：開局＋星門每種子都不超過標準數量），星樞元氣 RAID_HP；
        raidLv 照星門變化 v（0～3：左右鏡像、換一道門）組成關卡；raidCheck 開局合法檢查、raidSane 不是一開局就必輸必贏（xiangqi-lab/tools/test-bhtd-r2.js 全部模板都驗） */
  const TAL_HP=8,TAL_GM_MAX=2,TAL_SP=10,TAL_EYE_SP=20;   /* TAL_SP＝星火初燃開局靈力、鋒芒畢露回靈；TAL_EYE_SP＝星陣護體只扣多少靈（11/14 晚 ×10） */
  const TAL=[{id:"xhcr",t:1,nm:"星火初燃",cost:20,d:"開局靈力 +10"},{id:"htgy",t:1,nm:"厚土固元",cost:20,d:"元氣上限 +8"},
    {id:"fmbl",t:2,nm:"鋒芒畢露",cost:35,d:"小子吃大子，再回 10 靈力（每回合 1 次）"},{id:"xzht",t:2,nm:"星陣護體",cost:35,d:"陣眼子第一次被吃，靈力不歸零，只扣 20"},
    {id:"qmls",t:3,nm:"奇謀連鎖",cost:40,d:"奇謀連擊再多扣 2（一次最多扣 12）"},{id:"cyhw",t:3,nm:"赤焰火網",cost:40,d:"炮打出的破甲，用過再留 1 回合"},
    {id:"qxgm",t:4,nm:"七星共鳴",cost:50,d:"每 2 顆過河的己方子，回合結束回 1 元氣（每回合最多 2）"}];
  const TALM={};for(const x of TAL)TALM[x.id]=x;const TAL_ALL=TAL.reduce((a,x)=>a+x.cost,0);
  /* 只留合法的節點：認得、不重複、上一層有點亮（由低層往高層檢查，上一層沒了下一層一起拿掉） */
  function talValid(a){const s=new Set(),A=Array.isArray(a)?a:[];for(const t of[1,2,3,4])for(const x of TAL)if(x.t===t&&A.includes(x.id)&&(t===1||TAL.some(y=>y.t===t-1&&s.has(y.id))))s.add(x.id);return TAL.filter(x=>s.has(x.id)).map(x=>x.id)}
  const talSpent=a=>talValid(a).reduce((n,id)=>n+TALM[id].cost,0);
  /* 能不能點亮：null＝可以，不然回原因 */
  function talWhy(a,id,dust){const x=TALM[id];if(!x)return"沒有這個天賦";const v=talValid(a);if(v.includes(id))return"已經點亮了";if(x.t>1&&!TAL.some(y=>y.t===x.t-1&&v.includes(y.id)))return"先點亮上一層的一個天賦";if((Math.round(+dust)||0)<x.cost)return`星塵不夠（要 ${x.cost}）`;return null}
  /* 點亮／全部重置：o＝存檔 bhtdDust 的內容 {d 星塵, t 點亮的節點}，成功直接改 o */
  function talBuy(o,id){o.t=talValid(o.t);const w=talWhy(o.t,id,o.d);if(w)return{ok:false,why:w};o.t=talValid(o.t.concat([id]));o.d=(Math.round(+o.d)||0)-TALM[id].cost;return{ok:true}}
  function talReset(o){const n=talSpent(o.t);o.d=(Math.round(+o.d)||0)+n;o.t=[];return n}
  /* 星塵：主線過關照星數 3／4／6（守關再 +4），首通 +10、第一次三星 +8；星淵急襲照星數 6／8／10（不另給首通）；輸了不給 */
  const DUST={star:[0,3,4,6],boss:4,first:10,s3:8,raid:[0,6,8,10]};
  function dustOf(o){o=o||{};const s=Math.max(0,Math.min(3,Math.round(+o.stars)||0)),P=[];if(!o.win||!s)return{n:0,parts:P};
    if(o.raid)P.push(["急襲",DUST.raid[s]]);else{P.push(["過關",DUST.star[s]+(o.boss?DUST.boss:0)]);if(o.first)P.push(["首通",DUST.first]);if(o.s3&&s===3)P.push(["三星首達",DUST.s3])}
    return{n:P.reduce((a,p)=>a+p[1],0),parts:P}}
  /* 三星：★1 過關、★2 陣眼子沒被吃、★3 在 r3 回合內過關（輸了全灰）；R＝第幾回合過關 */
  const rndOf=td=>(td.rnd|0)+1;
  function starsOf(td,win){const r3=+td.r3||0;return[!!win,!!win&&!(+td.eyeX>0),!!win&&r3>0&&rndOf(td)<=r3]}
  /* 差一點：k＝lose（輸了：星樞還剩 hp）、eye（陣眼子被吃）、rnd（多了 d 回合）、both、""（已經三星）；x＝拿滿三星多拿幾點星塵（o＝dustOf 的旗標） */
  function nearOf(td,win,o){o=o||{};const S=starsOf(td,win);if(!win)return{k:"lose",hp:Math.max(0,td.en.hp),max:td.en.max,x:0};if(S[1]&&S[2])return{k:"",x:0};
    const now=dustOf(Object.assign({},o,{win,stars:S.filter(Boolean).length})).n,all=dustOf(Object.assign({},o,{win,stars:3})).n;
    return{k:!S[1]&&!S[2]?"both":!S[1]?"eye":"rnd",d:Math.max(1,rndOf(td)-(+td.r3||0)),x:all-now}}
  /* 標題：大勝（元氣 ≥35 且三星）、險勝（10 以上）、慘勝（1～9）、落敗（含和局）；評語每級 3 句（第 154 題 Gemini 原句；慘勝那句照審查改，落敗不提化墨退場） */
  const GRADE={big:"星淵大捷・完勝歸來",close:"力克星樞・險中求勝",bare:"殘血破陣・絕處逢生",lose:"星局未竟・重整旗鼓"};
  function gradeOf(win,hp,s3){if(!win)return"lose";hp=+hp||0;if(hp>=35&&s3)return"big";return hp>=10?"close":"bare"}
  const GSAY={big:["兵不血刃，星樞大陣在你面前如入無人之境！","招式與棋路完美契合，這局的節奏堪稱典範。","星門未開便已定局，你對陣眼子的保護無懈可擊。"],
    close:["雖然防線一度吃緊，但關鍵時刻的那步擒子扭轉了乾坤。","有驚無險！若能再早兩步封住星門，這局會更輕鬆。","頂住了星樞的猛攻，這份定力值得再挑戰更高難度！"],
    bare:["差一點就被星樞翻盤了！好在最後一擊精準命中要害。","真是驚心動魄的一局！建議回頭點亮「厚土固元」天賦增加容錯。","贏得極其艱難，但也證明了你絕不輕言放棄的棋風！"],
    lose:["星樞攻勢太猛，別氣餒，點顆天賦再回來討回公道！","這局敵子過河太快，下次試著用炮架火網先削弱他們吧。","勝敗乃兵家常事，點擊重打，剛才的失誤一定能補回來！"]};
  /* 七星「再來一場」（第 154 題 Gemini 原句；雷借花那句說「沒有打雷」，照她怕雷的設定留著） */
  const AGAIN={x_swordboy:"車輪還沒停呢！剛才那條直線我還能衝得更快，再跑一趟！",x_spiritgirl:"渡口的風正順，星河也還亮著，趁現在我們再擺一局吧！",
    x_martialgirl:"嘿嘿，沒有打雷只有滿天星火，這仗打得真痛快，再放一輪！",x_miaogirl:"草原上的雄鷹從不嫌飛得遠，這點風浪算什麼，再來比過！",
    x_shuai:"咳……我氣息還穩得很，剛才那步棋我還有更好的解法，再試一次！",x_shi:"陣腳已穩，護主之責未盡。只要你還要下，我隨時奉陪到底。",x_bing:"別看我個子小，剛才我也立大功啦！快開下一局，我還要往前衝！"};
  /* ---------- 星淵急襲模板：r＝紅方、b＝黑方開局 [子,路,線]（座標同 LV）；w＝星門波次；r3＝三星回合數；ps＝星樞性格 ----------
     紅方七種子各至少一顆（選誰當主角都有陣眼子）；開局各 9～11 子；黑方開局＋星門每種子都不超過標準數量 */
  const RAID_HP=25,RAID_AI=3;   /* 星樞元氣 25；推算步數照塔防第 3 關（前段） */
  const RAID=[
    {id:"r01",nm:"雙炮巡河",ps:"愛架砲",r3:14,r:[["K",5,1],["A",4,1],["A",6,1],["B",3,1],["B",7,1],["N",3,3],["R",1,2],["C",2,3],["C",8,3],["P",3,4],["P",7,4]],
      b:[["k",5,10],["a",4,10],["a",6,10],["b",3,10],["b",7,10],["n",7,8],["r",9,9],["c",2,8],["p",1,7],["p",5,7]],w:[{at:3,p:[["p",9,7]]},{at:6,p:[["c",8,8]]}]},
    {id:"r02",nm:"單車破陣",ps:"搶過河",r3:14,r:[["K",5,1],["A",4,1],["A",6,1],["B",7,1],["B",5,3],["N",7,3],["R",9,1],["C",8,2],["P",1,4],["P",5,4],["P",9,4]],
      b:[["k",5,10],["a",4,10],["a",6,10],["b",7,10],["n",2,8],["n",8,8],["r",1,10],["c",5,8],["p",3,7],["p",7,7]],w:[{at:4,p:[["p",9,7]]}]},
    {id:"r03",nm:"馬炮爭先",ps:"愛吃子",r3:14,r:[["K",5,1],["A",4,1],["A",5,2],["B",3,1],["B",7,1],["N",3,3],["N",7,3],["R",2,2],["C",2,5],["P",3,4],["P",7,4]],
      b:[["k",5,10],["a",5,9],["a",6,10],["b",3,10],["b",5,8],["n",2,8],["n",8,8],["r",9,10],["c",6,8],["p",1,7],["p",9,7]],w:[{at:3,p:[["p",3,7]]}]},
    {id:"r04",nm:"雙車對峙",ps:"保將",r3:16,r:[["K",5,1],["A",4,1],["A",6,1],["B",3,1],["B",5,3],["N",2,3],["R",1,1],["R",9,1],["C",8,3],["P",1,4],["P",9,4]],
      b:[["k",5,10],["a",4,10],["a",6,10],["b",3,10],["b",5,8],["n",8,8],["r",1,10],["r",9,10],["c",2,8],["p",1,7],["p",9,7]],w:[{at:3,p:[["p",3,7]]},{at:6,p:[["p",7,7]]}]},
    {id:"r05",nm:"兵臨城下",ps:"搶過河",r3:12,r:[["K",5,1],["A",4,1],["A",6,1],["B",3,1],["B",7,1],["N",3,3],["R",1,1],["C",8,2],["P",3,6],["P",7,6],["P",5,4]],
      b:[["k",5,10],["a",4,10],["a",6,10],["b",3,10],["b",7,10],["n",2,8],["n",8,8],["r",9,10],["c",7,8],["p",1,7],["p",9,7]],w:[{at:4,p:[["p",5,7]]}]},
    {id:"r06",nm:"九宮危局",ps:"愛吃子",r3:14,r:[["K",5,1],["A",4,1],["A",6,1],["B",5,3],["B",7,1],["N",7,3],["R",9,2],["C",2,3],["C",8,3],["P",3,4],["P",7,4]],
      b:[["k",5,10],["a",4,10],["a",6,10],["b",3,10],["b",7,10],["n",2,8],["r",1,10],["c",8,8],["p",4,5],["p",6,5]],w:[{at:4,p:[["p",5,7]]}]},
    {id:"r07",nm:"單騎救主",ps:"保將",r3:16,r:[["K",4,1],["A",5,2],["A",6,3],["B",3,1],["B",7,1],["N",5,5],["R",8,1],["C",2,2],["P",1,4],["P",5,4]],
      b:[["k",6,10],["a",5,9],["a",4,10],["b",3,10],["b",7,10],["n",7,8],["r",9,10],["c",2,8],["p",1,7],["p",5,7]],w:[{at:3,p:[["p",9,7]]},{at:6,p:[["n",2,10]]}]},
    {id:"r08",nm:"炮鎮中路",ps:"愛架砲",r3:14,r:[["K",5,1],["A",4,1],["A",6,1],["B",3,1],["B",7,1],["N",2,3],["N",8,3],["R",1,1],["C",5,3],["P",3,4],["P",7,4]],
      b:[["k",5,10],["a",4,10],["a",6,10],["b",3,10],["b",7,10],["n",2,8],["r",9,10],["c",8,8],["c",2,7],["p",3,7],["p",7,7]],w:[{at:3,p:[["p",9,7]]}]},
    {id:"r09",nm:"雙馬盤河",ps:"搶過河",r3:14,r:[["K",5,1],["A",4,1],["A",6,1],["B",3,1],["B",7,1],["N",3,5],["N",7,5],["R",9,1],["C",2,2],["P",1,4],["P",5,4]],
      b:[["k",5,10],["a",4,10],["a",6,10],["b",3,10],["b",7,10],["n",3,8],["n",7,8],["r",1,10],["c",8,8],["p",5,7]],w:[{at:3,p:[["p",1,7]]},{at:5,p:[["p",9,7]]}]},
    {id:"r10",nm:"殘局對攻",ps:"愛吃子",r3:12,r:[["K",6,1],["A",5,2],["A",4,1],["B",3,1],["B",5,3],["N",3,3],["R",9,1],["C",1,3],["P",5,4]],
      b:[["k",4,10],["a",5,9],["a",6,10],["b",7,10],["b",5,8],["n",7,8],["r",2,10],["c",8,8],["p",5,7]],w:[{at:3,p:[["p",3,7]]},{at:5,p:[["p",7,7]]},{at:7,p:[["n",2,8]]}]},
    {id:"r11",nm:"左翼突破",ps:"搶過河",r3:14,r:[["K",5,1],["A",4,1],["A",6,1],["B",7,1],["B",5,3],["N",2,3],["R",1,2],["C",8,2],["P",1,4],["P",3,4],["P",9,4]],
      b:[["k",5,10],["a",4,10],["a",6,10],["b",3,10],["b",7,10],["n",7,8],["r",9,10],["c",2,8],["c",8,7],["p",3,7],["p",5,7]],w:[{at:4,p:[["p",1,7]]}]},
    {id:"r12",nm:"星門夾擊",ps:"保將",r3:14,r:[["K",5,1],["A",4,1],["A",6,1],["B",3,1],["B",7,1],["N",7,3],["R",9,2],["C",8,3],["P",3,4],["P",5,4],["P",7,4]],
      b:[["k",5,10],["a",4,10],["a",6,10],["b",3,10],["b",7,10],["n",2,8],["r",1,10],["c",8,8],["p",5,7]],w:[{at:2,p:[["p",1,7],["p",9,7]]},{at:5,p:[["n",8,10]]}]}];
  const RAIDM={};for(const T of RAID)RAIDM[T.id]=T;
  /* 星門變化 v：bit0＝左右鏡像、bit1＝換一道門（往中間挪 2 路，那一格站不了就不挪） */
  function raidWaves(T,v){v=(Math.round(+v)||0)&3;return(T.w||[]).map(w=>({at:w.at,fake:!!w.fake,p:w.p.map(([p,lu,xi])=>{let L=v&1?10-lu:lu;if(v&2){const L2=L+(L<=5?2:-2);if(canStand(p,LSQ(L2,xi)))L=L2}return[p,L,xi]})}))}
  function raidLv(id,v){const T=RAIDM[id]||RAID[0];return{n:0,nm:"星淵急襲・"+T.nm,hp:RAID_HP,sp0:10,open:[],waves:raidWaves(T,v),nofill:1,tpl:"急襲",ps:T.ps||"",fsk:["zhs","cfx"],zcap:2,r3:T.r3}}
  function raidBoard(T,C){const b=new Array(90).fill(null);for(const[p,lu,xi]of T.r.concat(T.b))b[LSQ(lu,xi)]=p;return b}
  function raidFen(id,C){return C.fen(raidBoard(RAIDM[id]||RAID[0],C),"r").split(" ")[0]}
  /* 急襲開局合法檢查（照 lvCheck 的規矩，只減子不加子）：每顆子站得住、不重疊、子數不超過標準（黑方含星門）、雙方各 9～11 子、紅方七種子都有、
     將帥都在、不照面、開局沒有人被將、紅方有步可走；四種星門變化的落點都合法、落下去不會讓黑方自己被將 */
  function raidCheck(T,C){const err=[],b=new Array(90).fill(null),cnt={r:{},b:{}};
    for(const[p,lu,xi]of T.r.concat(T.b)){const q=LSQ(lu,xi),s=sd(p);if(lu<1||lu>9||xi<1||xi>10){err.push(`${p} 不在盤上`);continue}if(b[q])err.push(`格 ${q} 重疊`);else if(!canStand(p,q))err.push(`${s==="r"?PCN[up(p)]:PBN[up(p)]}不能站在 ${lu}/${xi}`);b[q]=p;cnt[s][up(p)]=(cnt[s][up(p)]||0)+1}
    if(T.r.some(x=>sd(x[0])!=="r")||T.b.some(x=>sd(x[0])!=="b"))err.push("紅黑分錯邊");
    for(const w of T.w||[])for(const[p]of w.p)cnt.b[up(p)]=(cnt.b[up(p)]||0)+1;
    for(const s of["r","b"])for(const p in STD){const n=cnt[s][up(p)]||0;if(n>STD[p])err.push(`${s==="r"?"紅":"黑"}${s==="r"?PCN[up(p)]:PBN[up(p)]}共 ${n} 顆（超過 ${STD[p]}）`)}
    for(const p in STD)if(!cnt.r[up(p)])err.push(`紅方沒有${PCN[up(p)]}（選這位主角就沒有陣眼子）`);
    if(T.r.length<9||T.r.length>11||T.b.length<9||T.b.length>11)err.push(`開局子數要各 9～11（紅 ${T.r.length}、黑 ${T.b.length}）`);
    if(b.indexOf("K")<0||b.indexOf("k")<0)err.push("將帥不齊");if(facing(b))err.push("將帥照面");
    try{if(C.inCheck(b,"r"))err.push("開局紅方被將");if(C.inCheck(b,"b"))err.push("開局黑方被將");if(!C.legal(b,"r").length)err.push("紅方沒有步可走")}catch(e){err.push("檢查失敗："+e.message)}
    if(!(+T.r3>0))err.push("沒有三星回合數");
    for(let v=0;v<4;v++)for(const w of raidWaves(T,v))for(const[p,lu,xi]of w.p){const q=LSQ(lu,xi);if(!canStand(p,q)||RW(q)>4)err.push(`星門變化 ${v} 的${PBN[up(p)]}落點不合法（${lu}/${xi}）`);else if(!b[q]){const x=b.slice();x[q]=p;try{if(C.inCheck(x,"b"))err.push(`星門變化 ${v} 落在 ${lu}/${xi} 會讓黑方自己被將`)}catch(e){}}}
    return err}
  /* 不是一開局就必輸／必贏（只用規則、不用引擎）：① 紅方沒有一步將死；② 紅方不管怎麼走，星樞都有一步將死＝必輸；③ 開局就有沒人保護的大子（車、炮、馬）被白吃；
     ④ 子力（車 9、炮 4.5、馬 4、相仕 2、兵 1；黑方含星門）差不超過 RAID_MAT */
  const RAID_MAT=8;
  function raidSane(T,C){const err=[],b=raidBoard(T,C),noMove=(x,s)=>{try{return!C.legal(x,s).length}catch(e){return false}};let R=[];try{R=C.legal(b,"r")}catch(e){return["走法產生失敗"]}
    if(R.some(([f,t])=>noMove(C.make(b,f,t),"b")))err.push("紅方一步就將死");
    if(R.length&&R.every(([f,t])=>{const x=C.make(b,f,t);let B=[];try{B=C.legal(x,"b")}catch(e){}return B.some(([f2,t2])=>noMove(C.make(x,f2,t2),"r"))}))err.push("紅方怎麼走都會被一步將死");
    const free=(s,o)=>{let L=[];try{L=C.legal(b,s)}catch(e){}for(const[f,t]of L){const v=b[t];if(!v||sd(v)!==o||VALV[up(v)]<4)continue;const x=C.make(b,f,t);let back=[];try{back=C.legal(x,o)}catch(e){}if(!back.some(([,t2])=>t2===t))return`${s==="r"?"紅":"黑"}方開局就能白吃${o==="r"?PCN[up(v)]:PBN[up(v)]}（${t}）`}return null};
    for(const s of["r","b"]){const w=free(s,s==="r"?"b":"r");if(w)err.push(w)}
    const mat=L=>L.reduce((a,x)=>a+VALV[up(x[0])],0),mr=mat(T.r),mb=mat(T.b)+mat([].concat(...(T.w||[]).map(w=>w.p)));if(Math.abs(mr-mb)>RAID_MAT)err.push(`子力差太多（紅 ${mr}、黑 ${mb}）`);
    return err}
  return{CH,LV,TL,SK,SKM,EYE0,PCN,PBN,CAPB,CAPM,CAPMAX,CHK_HIT,VALV,FSK,LSQ,comboOf,chkDmg,stats,defDmg,atkPt,defPt,spCurve,SPK,CAP_SP,ESP_GAIN,XM_CAP,ESP_MAX,depthOf,startFen,lvPlan,lvCheck,canStand,boot,move,roundEnd,engine,pick,psBonus,foeDecide,foeMarks,foeEst,targets,why,cast,costOf,capDmg,netHits,sqOf,gatePick,G,tdFix,
    TAL,TALM,TAL_ALL,TAL_HP,TAL_SP,TAL_EYE_SP,talValid,talSpent,talWhy,talBuy,talReset,DUST,dustOf,starsOf,nearOf,rndOf,GRADE,GSAY,gradeOf,AGAIN,RAID,RAIDM,RAID_HP,RAID_AI,RAID_MAT,raidWaves,raidLv,raidFen,raidCheck,raidSane}})();
if(typeof window!=="undefined")window.XQ_TD=BHTD;
/* ================= ② 畫面 ================= */
const BHTD_ON=true;   /* false＝黑洞照舊下一般象棋（bhStart 不開關卡卡片） */
const BHTD_FXN={full:"完整",lite:"簡化",off:"關閉"};
let BHTD_ST=null,BHTD_BUSY=false,BHTD_TG=null,BHTD_RAF=0,BHTD_MK="",BHTD_SEEN={},BHTD_HK="";
/* ===== 11/14 黑洞塔防爽度第一批（story/黑洞塔防爽度_Gemini提案與審查_1114.md；開發者 11/14 選定第一批）=====
   ① 一鍵三段視角（頂欄右上「👁」）：全局俯視 68°（預設）／臨陣斜角 48°／純淨平面 2D；存檔鍵 bhtdView，記住玩家的選擇。
      3D 兩種＝park3d 固定鏡頭（ex.tdCam，不能拖曳轉、不能捏合；拖曳改成拿棋子）；平面＝08b render 照 bhtlFlat→bhtdFlat 當 PARK_OFF（不改玩家的 park3d 設定）。
   ② 手機直拿滿版（平板、電腦橫向也用橫拿版面）：極簡頂欄＋對峙資訊列（#bhtdEn）＋滿寬棋盤（#bbox 固定定位）＋招式列 4 顆＋輔助列（提示、取消選取、⋯）；橫拿：左資訊、中棋盤、右招式 2×2（絕招固定右下）。
   ③ 落子：park3d 改成投影後最近交叉點＋吸附（遠端也至少 60px 可點）、拖曳時棋子浮在手指上方 45px、放開不合法 200ms 彈回；選中子底光、落點水墨點、可吃紅準星（疊在 #bhtdOv）。
      放招兩段式：點招 → 盤上高亮目標 → 點目標；不用選目標的招「再點一次」才放。電腦思考時可以先預選下一手的子（只高亮、不送出，輪到你自動選起來）。
   ④ 打擊演出三版（設定「戰鬥演出：完整／簡化／關閉」；系統開了減少動態一律走「關閉」那版）：一般擒子、以弱克強（停格 90ms＋微震 3px）、連續擒子印章、將軍（紅墨波紋＋邊緣淡紅暗角 ≤25%）、
      放絕招（鏡頭推近 15%＋草書 1.2 秒）、打倒魔王；不准全螢幕白閃、同屏粒子 ≤15。 */
const BHTD_VW={top:"全局俯視",tilt:"臨陣斜角",flat:"純淨平面"},BHTD_VWD={top:"68° 看全盤",tilt:"48° 看立體",flat:"2D 平面棋盤"};
let BHTD_PRE=null,BHTD_HINT=null,BHTD_LIVE={},BHTD_VMT=0;   /* PRE＝電腦思考時預選的子 {id,n,sq}；HINT＝提示高亮 {f,t,until}；LIVE＝這次看過還沒下完的盤（打倒魔王演出只播一次） */
const bhtdView=()=>{let v="top";try{v=store.get("bhtdView","top")}catch(e){}return BHTD_VW[v]?v:"top"};
function bhtdFlat(st){return bhtdIs(st)&&bhtdView()==="flat"}   /* 07bhtl bhtlFlat 問這裡：選了純淨平面＝這盤用平面棋盤 */
const bhtdRM=()=>{try{return matchMedia("(prefers-reduced-motion: reduce)").matches}catch(e){return false}};
const bhtdFxLv=()=>bhtdRM()?0:({full:2,lite:1,off:0})[bhtdFxMode()];   /* 2 完整、1 簡化、0 關閉或減少動態 */
const bhtdIs=st=>!!(st&&st.td&&typeof bhIs==="function"&&bhIs(st));
/* 11/13 開發者：塔防局黑子還沒全上場，盤面評語「紅方大占上風，約領先 N 個兵」會誤導。00-util 的 evt／evLink 先問這裡：正在下（或剛下完）塔防局、畫面在對局頁＝不講評語。
   用 function 宣告（00-util 用 typeof 檢查，載入順序不影響）；BHTD_ST 是 let，載入前被叫到會丟錯，包 try */
function bhtdMuteEv(){try{return!!(BHTD_ST&&bhtdIs(BHTD_ST))&&typeof location!=="undefined"&&/^#\/journey\/play/.test(location.hash||"")}catch(e){return false}}
const bhtdC=()=>typeof window!=="undefined"&&window.XQCore;
function bhtdProg(){const P=store.get("bhtd",null);return P&&typeof P==="object"?Object.assign({c:{},w:{},l:{},sk:{}},P):{c:{},w:{},l:{},sk:{}}}   /* 存檔鍵 bhtd：破過哪幾關、各關輸贏次數、每位角色帶哪 4 招（05b JOURNEY_KEYS） */
const bhtdFxMode=()=>{const v=store.get("bhtdFx","full");return BHTD_FXN[v]?v:"full"};   /* 設定「戰鬥演出」（存檔鍵 bhtdFx）：完整＝草書 1.2 秒＋法器＋打擊演出；簡化＝草書 0.8 秒、少停格；關閉＝不播草書與震動，只留文字（11/14） */
const bhtdChar=()=>{let c="";try{c=(typeof myChar==="function"&&myChar())||store.get("pChar","")}catch(e){}return BHTD.CH[c]?c:"x_swordboy"};
const bhtdL=()=>{try{return typeof xpInfo==="function"?xpInfo().L:1}catch(e){return 1}};
const bhtdDiff=()=>{try{return typeof diffNow==="function"?diffNow():2}catch(e){return 2}};
const bhtdOpenLv=(P,n)=>n===1||!!P.c[n-1];
/* 關卡卡片上的小變化標籤（第 151 題）：星門節奏、星樞性格、開局不對稱、星碎格、星樞會用的招 */
/* 卡片上的精簡版（開發者 11/13：說明跨整張卡、最多兩行）：只留關鍵字「後援・保將・卒海過河」；完整句子放 aria-label */
function bhtdTagsShort(V){const t=[];if(V.tpl)t.push(V.tpl);if(V.ps)t.push(V.ps);if(V.en&&V.en.hp0)t.push("星樞半血");if(V.en&&V.en.sp0)t.push("開局 "+V.en.sp0+" 靈");if(V.shard&&V.shard.length)t.push("星碎格×"+V.shard.length);
  if(V.fsk&&V.fsk.length)for(const k of V.fsk)if(BHTD.FSK[k])t.push(BHTD.FSK[k].nm);return t}
function bhtdTags(V){const t=[];if(V.tpl)t.push("星門："+V.tpl);if(V.ps)t.push("星樞性格："+V.ps);if(V.en&&(V.en.hp0||V.en.sp0))t.push((V.en.hp0?"星樞半血":"")+(V.en.sp0?(V.en.hp0?"、":"星樞")+"開局 "+V.en.sp0+" 靈":""));if(V.shard&&V.shard.length)t.push("星碎格 "+V.shard.length+" 格");
  if(V.fsk&&V.fsk.length)t.push("星樞招："+V.fsk.map(k=>BHTD.FSK[k].nm).join("、"));return t}
const bhtdKid=()=>{try{return typeof fmKid==="function"&&!!fmKid()}catch(e){return false}};
function bhtdCss(){if(document.getElementById("bhtdCss"))return;const s=document.createElement("style");s.id="bhtdCss";s.textContent=`
body.bhtd-on #acts button[aria-label="悔棋"],body.bhtd-on #acts button[aria-label="寶物"]{display:none!important}
#bhtdEn,#bhtdMe{font-family:var(--serif);color:#f1e7cf;background:rgba(10,10,30,.86);border-radius:12px;padding:5px 9px;margin:4px 8px;box-sizing:border-box;user-select:none;-webkit-user-select:none}
.bt-ttl{display:flex;align-items:baseline;gap:8px;font-size:12.5px;white-space:nowrap;overflow:hidden;margin-bottom:3px}.bt-ttl b{color:#FFE08A}.bt-ttl small{color:#c9bfe8}
.bt-r1,.bt-r2{display:flex;align-items:center;gap:6px;min-width:0;min-height:22px}.bt-r2{margin-top:4px}
.bt-av{flex:none;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-style:normal;font-weight:800;font-size:12.5px;line-height:1;box-sizing:border-box}
.bt-av.en{color:#FFE6A3;background:radial-gradient(circle at 40% 35%,#3a2f6a,#120f2a);border:1.5px solid #b46bff}.bt-av.me{color:#B3121F;background:radial-gradient(circle at 40% 35%,#fff6dd,#e9cf95);border:1.5px solid #FFE08A}
.bt-bar{position:relative;flex:0 0 44%;height:18px;border-radius:99px;background:rgba(255,255,255,.12);overflow:hidden}
.bt-r2>.bt-bar{flex-shrink:1;min-width:100px}   /* 11/14：自己的元氣條可以縮，靈力條＋攻擊力／防禦力小字在手機直拿一排放得下 */
.bt-bar i{position:absolute;inset:0 auto 0 0;border-radius:99px;transition:width .5s;background:linear-gradient(90deg,#8a1020,#e0483a)}
.bt-bar.en i{background:linear-gradient(90deg,#4a1a7a,#b04ae0)}
.bt-bar b{position:relative;display:block;text-align:center;font-size:11.5px;line-height:18px;text-shadow:0 1px 2px #000;font-weight:700;white-space:nowrap;overflow:hidden}
.bt-ln{flex:1;min-width:0;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#d9b8ff}
.bt-ln button{font:inherit;font-size:12px;color:#ffd0c8;background:rgba(160,20,30,.4);border:1px solid rgba(255,90,80,.7);border-radius:99px;padding:1px 8px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer}
.bt-think{display:inline-block;padding:1px 10px;border-radius:99px;color:#f0e6ff;background:linear-gradient(90deg,rgba(120,80,200,.18),rgba(190,150,255,.6),rgba(120,80,200,.18));background-size:200% 100%;animation:btThink 1.4s linear infinite}
@keyframes btThink{to{background-position:-200% 0}}
.bt-gate{color:#d9b8ff}
.bt-sp,.bt-esp{position:relative;flex:0 0 66px;height:15px;border-radius:99px;overflow:hidden;box-sizing:border-box;background:rgba(111,184,255,.14);border:1px solid rgba(111,184,255,.6)}.bt-sp>i,.bt-esp>i{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,#2f6fd6,#7cc4ff);transition:width .35s}.bt-sp>b,.bt-esp>b{position:relative;display:block;text-align:center;font:700 10.5px/13px var(--serif);color:#fff;text-shadow:0 0 3px #000,0 0 2px #000;font-variant-numeric:tabular-nums;white-space:nowrap}   /* 11/14 晚：靈力 ×10 後改成藍條＋數字（不再一顆一顆圓點） */
.bt-st{flex:1;min-width:0;font-size:11.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.bt-rnd{flex:none;font-size:11px;color:#c9bfe8}.bt-ad{flex:none;font-size:10px;line-height:1.15;color:#c9bfe8;text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
.bt-sks{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:5px}
.bt-sk{position:relative;font:inherit;color:#f6eedd;background:linear-gradient(180deg,#2c2450,#171433);border:1.5px solid #8f7bd8;border-radius:12px;padding:4px 2px;min-height:48px;cursor:pointer;line-height:1.15;touch-action:manipulation}
.bt-sk b{display:block;font-size:13px;letter-spacing:.04em}.bt-sk small{font-size:10.5px;color:#9fd0ff}
.bt-sk.off{opacity:.42;filter:grayscale(.7)}.bt-sk.on{border-color:#FFE08A;box-shadow:0 0 10px #FFE08A}
.bt-sk.ult{border-color:#E8C77A;background:linear-gradient(180deg,#4a3418,#1d1430)}.bt-sk.ult::after{content:"絕";position:absolute;top:-7px;right:-3px;font-size:10.5px;font-weight:800;color:#2a1a06;background:#FFE08A;border-radius:99px;padding:0 5px;line-height:16px}
.bt-sk.arm{border-color:#FFE08A;box-shadow:0 0 0 2px #FFE08A,0 0 14px #FFB000;animation:btArm 1s ease-in-out infinite}@keyframes btArm{50%{box-shadow:0 0 0 2px #FFE08A,0 0 22px #FFB000}}
.bt-sk.pulse{animation:btArm .5s ease-in-out 3}
.bt-aux{display:flex;align-items:center;gap:6px;margin-top:6px}.bt-aux button{flex:1;font:inherit;font-size:13.5px;color:#f1e7cf;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.28);border-radius:12px;min-height:44px;cursor:pointer;touch-action:manipulation}.bt-aux button.bt-more{flex:0 0 52px}
.bt-tip{font-size:12.5px;color:#FFE08A;margin-top:4px;display:flex;gap:8px;align-items:center;justify-content:center}.bt-tip button{font:inherit;font-size:12px;color:#f1e7cf;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.3);border-radius:99px;padding:3px 12px;min-height:30px}
body.bhtd-on #topRight button[aria-label="回棋盤模式"],body.bhtd-on #topRight button[aria-label="去園子下棋（3D）"],body.bhtd-on .xqbot,body.bhtd-on .pzoom,body.bhtd-on .gpad,body.bhtd-on .pkview,body.bhtd-on .pk2d,body.bhtd-on .pk2d-tip,body.bhtd-on .gs-ui,body.bhtd-on .gs-pop,body.bhtd-on .un-ui,body.bhtd-on .tele-ui,body.bhtd-on .pk3d-back{display:none!important}
#bhtdView{display:inline-flex!important;align-items:center;gap:3px;font:600 12px var(--serif);white-space:nowrap;padding:0 8px!important;min-width:44px}#bhtdView small{font-size:11.5px}
#bhtdViewM{position:fixed;z-index:9300;top:calc(var(--bhTop,48px) + 4px);right:calc(6px + env(safe-area-inset-right,0px));width:min(250px,80vw);box-sizing:border-box;background:rgba(10,10,30,.96);border:1px solid #E8C77A;border-radius:12px;padding:6px;color:#f1e7cf;font-family:var(--serif);box-shadow:0 8px 20px rgba(0,0,0,.5)}
#bhtdViewM button{display:flex;width:100%;align-items:center;gap:8px;font:inherit;font-size:14px;color:inherit;background:transparent;border:0;border-radius:8px;padding:8px;min-height:44px;text-align:left;cursor:pointer}
#bhtdViewM button.on{background:rgba(255,224,138,.16);color:#FFE08A;font-weight:700}#bhtdViewM button small{margin-left:auto;font-size:11.5px;color:#c9bfe8;font-weight:400}
#bhtdViewM p{font-size:12px;color:#c9bfe8;margin:4px 6px 2px;line-height:1.5}
@media (orientation:portrait){
body.bhtd-on{--btMeH:132px}
body.bhtd-on #topbar{min-height:40px!important;padding-top:calc(1px + env(safe-area-inset-top,0px))!important;padding-bottom:1px!important}
body.bhtd-on #topbar #back{height:38px;min-height:38px}body.bhtd-on #topbar h1{font-size:15px}
body.bhtd-on #topRight .stm-btn,body.bhtd-on #fcmBtn{display:none!important}
body.bhtd-on .view.fixed>#pTop,body.bhtd-on .view.fixed>#pBot,body.bhtd-on .view.fixed>#stat,body.bhtd-on .view.fixed>.rule-note,body.bhtd-on .view.fixed>.evline,body.bhtd-on .view.fixed>#strip,body.bhtd-on .view.fixed>#acts{display:none!important}
body.bhtd-on #bhtdEn{position:fixed;z-index:43;left:0;right:0;top:var(--bhTop,44px);height:56px;margin:0;border-radius:0;padding:4px 8px;background:rgba(8,8,24,.95)}
body.bhtd-on #bhtdEn .bt-ttl{display:none}
body.bhtd-on .view.fixed>#bbox{position:fixed!important;left:0!important;right:0!important;top:calc(var(--bhTop,44px) + 56px)!important;bottom:calc(var(--btMeH) + env(safe-area-inset-bottom,0px))!important;width:auto!important;height:auto!important;max-height:none!important;min-height:0!important;margin:0!important;padding:0!important;z-index:40;background:#05060d;border-radius:0!important;overflow:hidden;align-self:stretch!important;justify-self:stretch!important}
body.bhtd-on .view.fixed>#bbox .park3d{border-radius:0!important}
body.bhtd-on .view.fixed>#bbox>svg{width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;margin:0!important}
body.bhtd-on #bhtdMe{position:fixed;z-index:43;left:0;right:0;bottom:0;margin:0;border-radius:0;padding:6px 8px calc(6px + env(safe-area-inset-bottom,0px));background:rgba(8,8,24,.95)}
body.bhtd-on #bhtdMe>.bt-sks,body.bhtd-on #bhtdMe>.bt-aux{max-width:560px;margin-left:auto;margin-right:auto}
body.bhtd-on .bt-sks{grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:0}body.bhtd-on .bt-sk{height:68px}
body.bhtd-on #bhtdMe .bt-tip{position:absolute;left:8px;right:8px;top:-38px;margin:0;padding:3px 8px;border-radius:99px;background:rgba(10,10,30,.92);border:1px solid rgba(255,224,138,.6)}}
@media (orientation:portrait) and (max-height:700px){body.bhtd-on{--btMeH:116px}body.bhtd-on .bt-sk{height:58px}body.bhtd-on .bt-aux button{min-height:40px}body.bhtd-on #bhtdEn{height:54px;padding-top:3px}body.bhtd-on .view.fixed>#bbox{top:calc(var(--bhTop,44px) + 54px)!important}}
@media (orientation:landscape){
body.bhtd-on #topbar{min-height:40px!important;padding-top:1px!important;padding-bottom:1px!important}body.bhtd-on #topbar #back{height:38px;min-height:38px}body.bhtd-on #topRight .stm-btn,body.bhtd-on #fcmBtn{display:none!important}
body.bh-full.bhtd-on #pTop,body.bh-full.bhtd-on #pBot,body.bh-full.bhtd-on #stat,body.bh-full.bhtd-on #acts,body.bh-full.bhtd-on .view.fixed>.rule-note,body.bh-full.bhtd-on .view.fixed>.evline,body.bh-full.bhtd-on .view.fixed>#strip{display:none!important}
body.bh-full.bhtd-on .view.fixed:has(>#bbox):has(>#acts)>#bbox,body.bh-full.bhtd-on .view.fixed>#bbox{position:fixed!important;top:var(--bhTop,44px)!important;bottom:0!important;left:calc(184px + env(safe-area-inset-left,0px))!important;right:calc(176px + env(safe-area-inset-right,0px))!important;width:auto!important;height:auto!important;max-height:none!important;margin:0!important;padding:0!important;z-index:40;background:#05060d;align-self:stretch!important;justify-self:stretch!important}
body.bh-full.bhtd-on .view.fixed>#bbox>svg{width:100%!important;height:100%!important;max-width:none!important;max-height:none!important}
body.bh-full.bhtd-on #bhtdEn{position:fixed;z-index:43;top:var(--bhTop,44px);bottom:0;left:0;width:calc(184px + env(safe-area-inset-left,0px));margin:0;border-radius:0;padding:6px 8px 6px calc(8px + env(safe-area-inset-left,0px));overflow-y:auto;background:rgba(8,8,24,.95)}
body.bh-full.bhtd-on #bhtdEn .bt-ttl{flex-direction:column;gap:0;white-space:normal}
body.bh-full.bhtd-on #bhtdEn .bt-r1,body.bh-full.bhtd-on #bhtdEn .bt-r2{flex-wrap:wrap;row-gap:5px;margin-top:8px}body.bh-full.bhtd-on #bhtdEn .bt-bar{flex:1 1 0}
body.bh-full.bhtd-on #bhtdEn .bt-ln,body.bh-full.bhtd-on #bhtdEn .bt-st{flex:1 1 100%;white-space:normal}
body.bh-full.bhtd-on #bhtdMe{position:fixed;z-index:43;top:var(--bhTop,44px);bottom:0;right:0;width:calc(176px + env(safe-area-inset-right,0px));margin:0;border-radius:0;padding:6px calc(6px + env(safe-area-inset-right,0px)) 6px 6px;display:flex;flex-direction:column;justify-content:flex-end;background:rgba(8,8,24,.95)}
body.bh-full.bhtd-on .bt-sks{grid-template-columns:repeat(2,76px);gap:6px;justify-content:center;margin:0}body.bh-full.bhtd-on .bt-sk{height:76px}
body.bh-full.bhtd-on .bt-aux{flex-wrap:wrap;gap:5px}body.bh-full.bhtd-on .bt-aux button{min-height:40px;font-size:12.5px}body.bh-full.bhtd-on #bhtdMe .bt-tip{flex-wrap:wrap;margin:0 0 6px}}
#bhtdOv{position:fixed;inset:0;pointer-events:none;z-index:42;overflow:hidden}
body.bhtd-tg #bhtlTip{pointer-events:none;opacity:.35}
#bhtdOv svg{position:absolute;inset:0;width:100%;height:100%}
.bt-mk{position:absolute;left:0;top:0;transform:translate(-50%,-50%);pointer-events:none;display:flex;align-items:center;justify-content:center;font-family:var(--serif);will-change:transform}
.bt-mk.eye{width:calc(var(--c)*.95);height:calc(var(--c)*.95);border-radius:50%;border:2px solid rgba(255,224,138,.9);box-shadow:0 0 14px 4px rgba(255,214,120,.55),inset 0 0 10px rgba(255,214,120,.5);animation:btEye 2s ease-in-out infinite}
.bt-mk.eye::after{content:"✦";position:absolute;top:-1.1em;font-size:14px;color:#FFE08A;text-shadow:0 0 6px #FFB000}
@keyframes btEye{50%{box-shadow:0 0 22px 8px rgba(255,214,120,.75),inset 0 0 14px rgba(255,214,120,.7)}}
.bt-mk.gate{width:calc(var(--c)*1.05);height:calc(var(--c)*1.05);color:#f0dcff;flex-direction:column}
.bt-mk.gate::before{content:"";position:absolute;inset:0;border-radius:50%;border:2.5px dashed #b46bff;background:radial-gradient(circle,rgba(120,40,200,.45),rgba(40,10,80,.15) 70%);animation:btGate 3s linear infinite}
.bt-mk.gate b,.bt-mk.gate i{position:relative}.bt-mk.gate b{font-size:14px;line-height:1}.bt-mk.gate i{font-style:normal;font-size:11px}
@keyframes btGate{to{transform:rotate(360deg)}}
/* 11/13 開發者截圖「主角的金環很違和、門跑到盤外」：門原本整個元素在轉（動畫的 transform 蓋掉 bhtdFrame 寫的位置，門被釘在左上角）；改成只有 ::before 的虛線圈在轉。
   3D 盤（g3）：地面類記號照盤面透視貼平（bhtdGnd 算的 matrix，transform-origin 要 0 0），金環不再像貼紙浮在角色身上、拿掉 ✦；門的數字另起直立小標籤 gt；3D 區頂端重複的「黑洞・星樞棋局」場名（.pkname）在塔防局藏起來，免得擋到最遠那一排 */
.bt-mk.g3{transform-origin:0 0}.bt-mk.eye.g3::after{display:none}.bt-mk.eye.g3{border-width:3px;background:radial-gradient(circle,rgba(255,214,120,.38),rgba(255,214,120,0) 72%)}
.bt-mk.gt{font-size:12px;font-weight:800;color:#f3e6ff;background:rgba(60,16,110,.88);border:1px solid #b46bff;border-radius:99px;padding:1px 7px;white-space:nowrap;box-shadow:0 0 8px rgba(180,107,255,.7)}
body.bhtd-on #bbox .pkname{display:none!important}
.bt-mk.pj{font-size:11px;font-weight:700;color:#fff;background:#d2601a;border-radius:6px;padding:0 3px;margin:calc(var(--c)*-.42) 0 0 calc(var(--c)*.42);box-shadow:0 0 6px #ff9a3c}
.bt-mk.frz{width:calc(var(--c)*1.15);height:calc(var(--c)*1.15);border-radius:50%;box-shadow:0 0 0 1.5px rgba(255,255,255,.95),0 0 8px 2px rgba(8,18,60,.6)}
.bt-mk.frz::before{content:"";position:absolute;inset:0;border-radius:50%;background:repeating-conic-gradient(#0d1b4f 0deg 10deg,#8aa6ff 10deg 12deg,#0d1b4f 12deg 22deg,#f2f5ff 22deg 30deg);-webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 6px),#000 calc(100% - 5.5px));mask:radial-gradient(farthest-side,transparent calc(100% - 6px),#000 calc(100% - 5.5px))}
.bt-mk.frz::after{content:"";position:absolute;inset:6px;border-radius:50%;box-shadow:0 0 0 1.5px rgba(255,255,255,.9)}
.bt-mk.frz i{position:absolute;right:-5px;bottom:-5px;z-index:1;min-width:17px;height:17px;box-sizing:border-box;padding:0 3px;border-radius:99px;background:#0d1b4f;border:1.5px solid #fff;color:#fff;font:700 11px/14px sans-serif;font-style:normal;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.6)}
.bt-mk.sh{font-size:10.5px;font-weight:700;color:#e8f4ff;background:#2b6fd6;border-radius:6px;padding:0 3px;margin:calc(var(--c)*-.42) calc(var(--c)*.42) 0 0}
.bt-mk.shard{width:calc(var(--c)*.8);height:calc(var(--c)*.8);border-radius:8px;transform:translate(-50%,-50%) rotate(45deg);background:radial-gradient(circle,rgba(200,110,255,.55),rgba(120,40,200,.15) 70%);box-shadow:0 0 12px 3px rgba(190,100,255,.6);border:1.5px solid rgba(230,180,255,.8)}
.bt-mk.fr{width:calc(var(--c)*.95);height:calc(var(--c)*.95);border-radius:50%;border:3px solid #ff3b30;box-shadow:0 0 12px #ff3b30;animation:btEye 1.2s ease-in-out infinite}
.bt-mk.fr i{position:absolute;top:-.9em;right:-.2em;font-style:normal;font-weight:800;font-size:13px;color:#fff;background:#d71920;border-radius:99px;min-width:1.3em;text-align:center}
.bt-mk.trap{width:calc(var(--c)*.8);height:calc(var(--c)*.8);border-radius:50%;border:2.5px dotted #ffd36a;background:radial-gradient(circle,rgba(255,211,106,.38),rgba(255,211,106,0) 72%)}
.bt-mk.thr{width:calc(var(--c)*.95);height:calc(var(--c)*.95);border-radius:50%;border:3px solid #ff8a1a;box-shadow:0 0 12px #ff8a1a;animation:btEye 1.2s ease-in-out infinite}
.bt-mk.bd{font-size:10.5px;font-weight:700;color:#fff;border-radius:6px;padding:0 3px}.bt-mk.bd.nc{background:#5d5d72;box-shadow:0 0 6px #c9c9e0;margin:calc(var(--c)*.42) 0 0 calc(var(--c)*.42)}.bt-mk.bd.nt{background:#2f7d6b;box-shadow:0 0 6px #8fe0c8;margin:calc(var(--c)*.42) calc(var(--c)*.42) 0 0}
.bt-mk.fb{width:calc(var(--c)*.9);height:calc(var(--c)*.9);border-radius:50%;background:radial-gradient(circle,rgba(255,60,40,.45),rgba(255,60,40,0) 70%);box-shadow:0 0 14px 4px rgba(255,70,50,.55)}
.bt-fore{margin-top:3px;font-size:12px;line-height:1.45;color:#ffd0c8;background:rgba(160,20,30,.35);border:1px solid rgba(255,90,80,.6);border-radius:8px;padding:3px 7px;white-space:normal}.bt-fore b{color:#fff}.bt-fore .kid{color:#ffe08a}
.bt-esp{display:inline-block;flex:0 0 58px;width:58px;margin-left:6px;vertical-align:middle;background:rgba(197,140,255,.14);border-color:rgba(197,140,255,.6)}.bt-esp>i{background:linear-gradient(90deg,#8a2fc0,#d08cff)}
.bt-mk.tg{pointer-events:auto;width:calc(var(--c)*.9);height:calc(var(--c)*.9);border-radius:50%;border:3px solid #FFE08A;background:rgba(255,224,138,.18);cursor:pointer;animation:btTg 1s ease-in-out infinite;padding:0}
@keyframes btTg{50%{box-shadow:0 0 16px 6px rgba(255,224,138,.65)}}
.bt-mk.tg.pk{border-color:#7fe0ff;background:rgba(127,224,255,.3)}
.bt-fl{position:fixed;z-index:44;pointer-events:none;transform:translate(-50%,-50%);font-family:var(--serif);font-weight:800;white-space:nowrap;text-shadow:0 2px 6px #000,0 0 2px #000;animation:btFl 1.3s ease-out forwards}
.bt-fl.dmg{color:#FFD36A}.bt-fl.hurt{color:#ff6a5a}.bt-fl.heal{color:#8ff0a4}.bt-fl.sp{color:#8fd0ff}.bt-fl.info{color:#e9dcff;font-size:14px}
@keyframes btFl{0%{opacity:0;transform:translate(-50%,-30%) scale(.6)}15%{opacity:1;transform:translate(-50%,-60%) scale(1.15)}100%{opacity:0;transform:translate(-50%,-160%) scale(1)}}
.bt-fx{position:fixed;z-index:43;pointer-events:none;transform:translate(-50%,-50%);animation:btFx .8s ease-out forwards}
.bt-fx img{width:100%;height:100%}.bt-fx.gold img{filter:hue-rotate(140deg) saturate(1.6) brightness(1.15)}
.bt-fx.smoke{border-radius:50%;background:radial-gradient(circle,rgba(235,235,235,.85),rgba(160,160,170,.4) 45%,rgba(120,120,130,0) 70%)}
.bt-fx.smoke::after{content:"✦ ✧ ✦";position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#ffd77a;font-size:13px;letter-spacing:4px;text-shadow:0 0 6px #ff9a3c}
.bt-fx.ring{border-radius:50%;border:3px solid #6fb8ff;box-shadow:0 0 14px #3d8bff}.bt-fx.spark{border-radius:50%;background:radial-gradient(circle,#fff,#ffe08a 30%,rgba(255,224,138,0) 70%)}
@keyframes btFx{0%{opacity:0;transform:translate(-50%,-50%) scale(.4)}25%{opacity:1}100%{opacity:0;transform:translate(-50%,-50%) scale(1.5)}}
#bhtdCast{position:fixed;inset:0;z-index:9500;display:flex;align-items:center;justify-content:center;cursor:pointer;background:transparent}
#bhtdCast.out{opacity:0;transition:opacity .3s}
.bt-cao{position:relative;height:min(78vh,560px);aspect-ratio:400/717;animation:btInk 2.5s linear forwards;pointer-events:none}
.bt-cao .pp{position:absolute;inset:-6% -18%;border-radius:18px;background:radial-gradient(ellipse at 50% 50%,rgba(246,238,220,.94),rgba(236,224,196,.85) 60%,rgba(236,224,196,0) 78%);animation:btPp .25s ease-out}
.bt-cao .ink{position:absolute;inset:0;animation:btWrite 2.5s linear forwards;display:flex;align-items:center;justify-content:center}
.bt-cao img{width:100%;height:100%;object-fit:contain}
.prolog .box img.eic{width:1.3em;height:1.3em;display:inline-block;margin:0 .05em;vertical-align:-.28em}
.bt-cao .tx{writing-mode:vertical-rl;font-family:"XQ twkai","XQ wenkai",var(--serif);font-size:min(13vh,96px);font-weight:700;color:#1a1424;letter-spacing:.05em;text-shadow:0 0 1px #1a1424}
.bt-cao .who{position:absolute;left:50%;bottom:-1.8em;transform:translateX(-50%);white-space:nowrap;font-size:14px;color:#FFE6A8;text-shadow:0 1px 6px #000}
@keyframes btWrite{0%{clip-path:inset(0 0 100% 0)}40%,100%{clip-path:inset(0 0 0 0)}}
@keyframes btInk{0%,80%{opacity:1;filter:none;transform:scale(1)}100%{opacity:0;filter:blur(8px);transform:scale(1.12)}}
@keyframes btPp{from{opacity:0}}
.bt-flash{font-family:"XQ twkai","XQ wenkai",var(--serif);font-size:34px;font-weight:700;color:#FFE6A8;background:rgba(10,10,30,.8);border:1px solid #E8C77A;border-radius:14px;padding:10px 26px;animation:btFlash .5s ease-out forwards;pointer-events:none}
@keyframes btFlash{0%{opacity:0;transform:scale(.8)}30%{opacity:1;transform:scale(1)}100%{opacity:0}}
.modal.bt-sel,.modal.bt-res{overflow-y:auto;align-items:flex-start;overscroll-behavior:contain}.modal.bt-sel>.box,.modal.bt-res>.box{margin:auto 0}   /* 11/14 第二批實看：卡片比畫面高時上下被切掉、捲不到（預設字級沒有 html[data-fz] 那條捲動規則）；改成可以捲、放得下時照樣置中 */
.bt-sel .box{max-width:min(96vw,560px)}@media (min-width:900px){.bt-sel .box{max-width:min(92vw,760px)}}
.bt-sel .bt-cards{display:grid;grid-template-columns:1fr;gap:6px;margin:8px 0}@media (min-width:900px){.bt-sel .bt-cards{grid-template-columns:repeat(2,1fr)}}
.bt-sel .bt-card{position:relative;display:block;width:100%;min-height:44px;font:inherit;text-align:left;color:inherit;background:var(--card,#fff);border:2px solid var(--line,#ddd);border-radius:12px;padding:7px 10px 8px;cursor:pointer;line-height:1.4}
.bt-sel .bt-card .hd{display:flex;flex-wrap:wrap;align-items:baseline;column-gap:8px;padding-right:78px}.bt-sel .bt-card .hd small{font-size:11.5px;color:var(--muted,#777)}.bt-sel .bt-card .hd b{font-size:14.5px}
.bt-sel .bt-card .st{font-size:12px;font-weight:700;color:#7a3fb0;white-space:nowrap}
.bt-sel .bt-card .tg{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;margin-top:2px;font-size:12px;line-height:1.45;color:#8a4a10}
.bt-sel .bt-card .ok{position:absolute;top:6px;right:8px;font-size:11.5px;font-weight:800;line-height:1.5;padding:0 7px;border-radius:99px;background:rgba(122,63,176,.12);color:#7a3fb0;white-space:nowrap}
.bt-sel .bt-card.done .ok{background:rgba(47,138,58,.14);color:#2f8a3a}.bt-sel .bt-card.lock .ok{background:rgba(127,127,127,.15);color:var(--muted,#777)}
.bt-sel .bt-card.on{border-color:#7a3fb0;box-shadow:0 0 0 2px rgba(122,63,176,.25)}.bt-sel .bt-card.lock{opacity:.5}
.bt-dust{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:6px 0 2px;font-size:13.5px}.bt-dust b{font-size:16px;color:#7a3fb0}
.bt-dust .btn{width:auto;flex:none;margin:0;padding:8px 14px;min-height:44px;font-size:14px}
.bt-sel .bt-card.bt-rdc{border-style:dashed;border-color:#b46bff}.bt-sel .bt-card.bt-rdc .hd b{color:#7a3fb0}
.bt-tal .box{max-width:min(96vw,560px)}
.bt-tier{margin:8px 0 0;text-align:left}.bt-tier>small{display:block;font-size:12px;font-weight:700;color:var(--muted,#777);margin:0 2px 4px}
.bt-trow{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:6px}
.bt-tn{display:flex;flex-direction:column;align-items:flex-start;gap:2px;min-height:64px;font:inherit;text-align:left;color:inherit;background:var(--card,#fff);border:2px solid var(--line,#ddd);border-radius:12px;padding:6px 9px;cursor:pointer;line-height:1.35}
.bt-tn b{font-size:14.5px}.bt-tn small{font-size:12.5px;color:var(--muted,#666)}.bt-tn i{font-style:normal;font-size:12px;font-weight:800;color:#7a3fb0;margin-top:auto}
.bt-tn.on{border-color:#c99a2e;background:linear-gradient(180deg,rgba(255,224,138,.28),rgba(255,224,138,.08))}.bt-tn.on i{color:#8a6410}
.bt-tn.lk{opacity:.5}.bt-tn.poor i{color:var(--muted,#777)}
.bt-trule{font-size:12.5px;line-height:1.6;color:var(--muted,#666);text-align:left;margin:6px 0 0}
.bt-stars{display:flex;justify-content:center;gap:10px;margin:2px 0 6px}
.bt-st1{display:flex;flex-direction:column;align-items:center;min-width:76px;font-size:12px;line-height:1.3}.bt-st1>b{font-size:30px;line-height:1.1;color:#e0a81c;text-shadow:0 1px 0 #7a5208}.bt-st1 small b{font-size:12px}
.bt-st1.off>b{color:#b9b4aa;text-shadow:none}.bt-st1.off{color:var(--muted,#888)}
.bt-near{font-size:13px;font-weight:700;color:#a35a00;margin:2px 0 6px;text-align:center}
.bt-dl{font-size:14px;text-align:center;margin:4px 0}.bt-dl b{font-size:17px;color:#7a3fb0}.bt-dl small{color:var(--muted,#777)}
.bt-hl{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:6px 0}
.bt-hl>span{display:flex;flex-direction:column;align-items:center;gap:1px;padding:5px 2px;border-radius:12px;background:color-mix(in srgb,currentColor 6%,transparent);font-size:12px;text-align:center}.bt-hl b{font-size:19px;line-height:1.15}.bt-hl i{font-style:normal;font-size:11.5px;color:var(--muted,#777)}
.bt-say{font-size:14px;text-align:center;margin:6px 0}
.modal.bt-res .mb .btn.bt-nx{flex:1 1 100%;order:0}
.modal.bt-res .mb .btn.bt-back{flex:0 0 calc(36% - 4px);order:1;white-space:normal}
.modal.bt-res .mb .btn.bt-again{flex:1 1 calc(62% - 4px);order:2;font-size:16px;padding:12px 6px}
.modal.bt-res .mb .btn.bt-look{flex:1 1 100%;order:3;min-height:44px;font-size:13px;font-weight:600;border:0;background:transparent;opacity:.85}
.bt-me{font-size:13px;margin:4px 0}.bt-sklist{display:flex;flex-wrap:wrap;gap:5px;margin:4px 0}
.bt-sklist label{font-size:12.5px;border:1.5px solid var(--line,#ccc);border-radius:99px;padding:3px 9px;cursor:pointer}.bt-sklist label.on{border-color:#7a3fb0;background:rgba(122,63,176,.12)}.bt-sklist label.lk{opacity:.4}
.bt-sklist input{display:none}
.bt-seg{display:inline-flex;gap:4px}.bt-seg button{font:inherit;font-size:12.5px;border:1.5px solid var(--line,#ccc);background:transparent;color:inherit;border-radius:99px;padding:3px 10px;cursor:pointer}.bt-seg button.on{border-color:#7a3fb0;background:rgba(122,63,176,.15);font-weight:700}
.bt-rule{font-size:12.5px;line-height:1.7;text-align:left}
.bt-mk.selg{width:calc(var(--c)*1.2);height:calc(var(--c)*1.2);border-radius:50%;background:radial-gradient(circle,rgba(255,224,138,0) 34%,rgba(255,224,138,.7) 46%,rgba(255,190,80,.35) 56%,rgba(255,190,80,0) 72%)}
.bt-mk.ink{width:calc(var(--c)*.34);height:calc(var(--c)*.34);border-radius:50%;background:radial-gradient(circle at 42% 38%,#4a4466,#0b0a14 68%);box-shadow:0 0 0 2px rgba(244,236,216,.9),0 0 8px rgba(0,0,0,.7)}
.bt-mk.aim{width:calc(var(--c)*1.02);height:calc(var(--c)*1.02);border-radius:50%;border:3px solid #ff3b30;box-shadow:0 0 10px #ff3b30,inset 0 0 8px rgba(255,59,48,.5);box-sizing:border-box}
.bt-mk.aim::before,.bt-mk.aim::after{content:"";position:absolute;left:50%;top:-14%;bottom:-14%;width:3px;margin-left:-1.5px;background:linear-gradient(#ff3b30 0 24%,transparent 24% 76%,#ff3b30 76%)}.bt-mk.aim::after{transform:rotate(90deg)}
.bt-mk.pre{width:calc(var(--c)*1.05);height:calc(var(--c)*1.05);border-radius:50%;border:3px dashed #FFE08A;box-shadow:0 0 12px rgba(255,224,138,.7);box-sizing:border-box}
.bt-mk.hf,.bt-mk.ht{width:calc(var(--c)*1.05);height:calc(var(--c)*1.05);border-radius:50%;border:3px solid #7CFFB0;box-shadow:0 0 14px #7CFFB0;box-sizing:border-box;animation:btEye 1s ease-in-out infinite}.bt-mk.ht{border-style:dashed}
.bt-fl.cap{color:#fff;font-size:24px;animation:btCap .9s ease-out forwards}@keyframes btCap{0%{opacity:0;transform:translate(-50%,-50%)}15%{opacity:1}100%{opacity:0;transform:translate(-50%,calc(-50% - 30px))}}
.bt-fl.big{font-size:36px;color:#FFD36A;text-shadow:0 0 10px #FF9A00,0 2px 6px #000;animation:btBig 1.15s ease-out forwards}.bt-fl.big.l1{animation-duration:1s}
@keyframes btBig{0%{opacity:0;transform:translate(-50%,-50%) scale(.6)}16%{opacity:1;transform:translate(-50%,-50%) scale(1.3)}30%{transform:translate(-50%,-50%) scale(1)}80%{opacity:1;transform:translate(-50%,-80%)}100%{opacity:0;transform:translate(-50%,-95%)}}
.bt-fl.big.qm{font-size:26px;color:#FFE6A8}.bt-fl.big.ck{color:#ff8a7a;text-shadow:0 0 10px #c0281e,0 2px 6px #000}
.bt-fl.wk0{color:#b3121f;font-size:22px;font-weight:900;text-shadow:0 0 3px #fff,0 0 6px #fff;animation:btStatic 1.2s linear forwards}
.bt-fl.st0{animation:btStatic .6s linear forwards}.bt-fl.ck0{color:#ff6a5a;font-size:17px;animation-duration:1.4s}
@keyframes btStatic{0%{opacity:0}20%,70%{opacity:1}100%{opacity:0}}
.bt-stamp{position:fixed;z-index:44;right:12px;top:34%;pointer-events:none;font-family:"XQ twkai","XQ wenkai",var(--serif);font-size:28px;font-weight:900;line-height:1.05;color:#fff4ee;background:#c0281e;border:3px double #ffe2c8;border-radius:8px;padding:8px 6px;writing-mode:vertical-rl;letter-spacing:.08em;box-shadow:0 4px 12px rgba(0,0,0,.45);transform:rotate(-6deg);animation:btStampIn .32s ease-out,btStampOut .4s ease-in 1.3s forwards}
.bt-stamp.s1{animation:btStampOut .4s ease-in 1.3s forwards}
@keyframes btStampIn{from{transform:translateX(130%) rotate(-6deg)}}@keyframes btStampOut{to{opacity:0}}
.bt-vig{position:fixed;inset:0;z-index:42;pointer-events:none;background:radial-gradient(ellipse at center,rgba(200,20,20,0) 55%,rgba(200,20,20,.25) 100%);animation:btVig .75s ease-out forwards}@keyframes btVig{0%{opacity:0}25%{opacity:1}100%{opacity:0}}
.bt-fx.rip{border-radius:50%;border:4px solid rgba(190,16,28,.9);box-shadow:0 0 12px rgba(190,16,28,.6)}
.bt-fx.ckf{border-radius:50%;border:3px solid #ff3b30;box-shadow:0 0 10px #ff3b30;animation:btBlink .5s ease-out forwards}@keyframes btBlink{0%,100%{opacity:0}40%{opacity:1}}
.bt-fx.ckd{border-radius:50%;border:4px dashed #d71920;animation:btStatic 1.4s linear forwards}
.bt-fx.dot{border-radius:50%;background:#15121f;box-shadow:0 0 4px rgba(255,214,120,.6);animation:btDot .9s ease-out forwards}
@keyframes btDot{0%{opacity:1;transform:translate(-50%,-50%)}100%{opacity:0;transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) scale(.4)}}
.bt-ban{position:fixed;z-index:9450;left:50%;top:40%;transform:translate(-50%,-50%);pointer-events:none;font-family:"XQ twkai","XQ wenkai",var(--serif);font-size:min(10vw,46px);font-weight:900;color:#FFE08A;text-shadow:0 0 14px #FF9A00,0 3px 8px #000;white-space:nowrap;animation:btBan 1.8s ease-out forwards}
.bt-ban.l1{animation:btBan1 1.4s ease-out forwards}.bt-ban.l0{animation:btStatic 1.8s linear forwards}
@keyframes btBan{0%{opacity:0;transform:translate(-50%,-50%) scale(.6)}15%{opacity:1;transform:translate(-50%,-50%) scale(1.15)}30%{transform:translate(-50%,-50%) scale(1)}80%{opacity:1}100%{opacity:0}}@keyframes btBan1{0%{opacity:0}20%,75%{opacity:1}100%{opacity:0}}
.bt-shake{animation:btShake .12s linear 1}@keyframes btShake{25%{transform:translateY(-3px)}75%{transform:translateY(3px)}}
@media (prefers-reduced-motion:reduce){.bt-mk.eye,.bt-mk.gate,.bt-mk.tg,.bt-mk.thr,.bt-mk.hf,.bt-mk.ht,.bt-think,.bt-sk.arm,.bt-sk.pulse{animation:none}.bt-fl,.bt-fl.big,.bt-fl.cap{animation:btStatic 1s linear forwards}.bt-stamp{animation:btStampOut .4s ease-in 1.3s forwards}.bt-cao,.bt-cao .ink{animation-duration:.01s}.bt-shake{animation:none}}`;   /* 減少動態：跳字不飄不放大，只淡入淡出（原本 .01 秒等於看不到） */document.head.append(s)}
/* ---------- 關卡卡片（bhStart 叫：接受棋局、按「入局」之後） ---------- */
function bhtdSelect(k,cover){if(typeof bhtlNeed==="function"&&bhtlNeed()){bhtlOffer(k,cover);return}   /* 第一次進塔防：先問要不要下練習賽（07bhtl-tdlearn.js） */
  const opt=arguments[2]||{},BL=typeof gxtBackLb==="function"?gxtBackLb():"⛵ 星槎回航";   /* opt.after＝從結果視窗「返回星盤」回來：「之後再來」改成回航鍵 */
  bhtdCss();const ck=bhtdChar(),L=bhtdL(),st=BHTD.stats(ck,L),diff=bhtdDiff(),P=bhtdProg(),D=bhtdDust(),pool=BHTD.SK.filter(s=>s.ch===st.ck),un=pool.filter(s=>s.lv<=L),rdOk=bhtdRdOpen(P);
  let sel=1;for(let n=1;n<=BHTD.LV.length;n++)if(bhtdOpenLv(P,n))sel=n;if(P.last&&bhtdOpenLv(P,P.last)&&!P.c[P.last])sel=P.last;if(opt.rd&&rdOk)sel="rd";
  let pk=((P.sk||{})[st.ck]||[]).filter(id=>un.some(s=>s.id===id)).slice(0,4);if(!pk.length)pk=un.slice(0,4).map(s=>s.id);
  const card=n=>{const V=BHTD.LV[n-1],ai=BHTD.depthOf(n,diff),op=bhtdOpenLv(P,n),dn=!!P.c[n],s3=Math.max(0,Math.min(3,+D.s[n]||0));
    const hp=(V.en&&V.en.hp0?V.en.hp0+"／":"")+V.hp,ok=op?(dn?(s3?"★".repeat(s3)+"☆".repeat(3-s3):"✓ 已破陣"):"可挑戰"):"🔒 未解鎖";   /* 開發者 11/13：關名、推算步數、元氣一行；說明跨整張卡最多兩行；狀態在右上角（11/14 第二批：破過的關改成最佳星數） */
    const okL=op?(dn?(s3?`最佳 ${s3} 星`:"已破陣"):"可挑戰"):"未解鎖";
    return`<button type="button" class="bt-card${n===sel?" on":""}${op?"":" lock"}${dn?" done":""}" data-n="${n}" aria-label="${esc(`第 ${n} 關 ${V.nm}，${okL}${op?"":"（先破上一關）"}，星樞推算 ${ai.depth} 步，星樞元氣 ${hp}；${bhtdTags(V).join("；")}`)}"><span class="hd"><small>第 ${n} 關</small><b>${esc(V.nm)}</b><span class="st">推算 ${ai.depth} 步・元氣 ${hp}</span></span><small class="tg">${esc(bhtdTagsShort(V).join("・"))}</small><small class="ok" aria-hidden="true">${ok}</small></button>`};
  /* 星淵急襲卡（破第 1 關才開）：中局殘陣、3～5 分鐘、星塵照表現 */
  const rcard=()=>{const ai=BHTD.depthOf(BHTD.RAID_AI,diff),dr=BHTD.DUST.raid;
    return`<button type="button" class="bt-card bt-rdc${sel==="rd"?" on":""}${rdOk?"":" lock"}" data-n="rd" aria-label="${esc(`星淵急襲，${rdOk?"可挑戰":"未解鎖（先破第 1 關）"}，中局殘陣，3～5 分鐘，星樞推算 ${ai.depth} 步，星樞元氣 ${BHTD.RAID_HP}，星塵 ${dr[1]}～${dr[3]}`)}"><span class="hd"><small>⚡</small><b>星淵急襲</b><span class="st">推算 ${ai.depth} 步・元氣 ${BHTD.RAID_HP}</span></span><small class="tg">${esc(`中局殘陣・3～5 分鐘・星塵 ${dr[1]}～${dr[3]}`)}</small><small class="ok" aria-hidden="true">${rdOk?"⚡ "+D.r.w:"🔒 未解鎖"}</small></button>`};
  const cards=()=>BHTD.LV.map(V=>card(V.n)).join("")+rcard();
  const skHTML=()=>pool.map(s=>`<label class="${pk.includes(s.id)?"on":""}${s.lv>L?" lk":""}" data-id="${s.id}" title="${esc(s.d)}">${s.lv>L?"🔒 Lv"+s.lv+" ":""}${esc(s.nm)}・${s.cost} 靈</label>`).join("");
  const eyeN=BHTD.PCN[st.pc],fx=bhtdFxMode(),tn=D.t.length;
  const later=opt.after?[BL,()=>{try{bhReturn()}catch(e){}},true]:["之後再來",()=>{try{bhMus(null);if(cover!==false&&k&&typeof shipDockCover==="function")shipDockCover(k,()=>{})}catch(e){}},true];
  const m=modal(`<div class="em">🌀</div><h2>星淵遠征・星域一</h2>
    <p class="bt-me">陣眼：<b>${esc(st.n)}</b>（Lv ${st.L}）・元氣 <b>${st.hp}</b>・靈力上限 <b>${st.sp}</b>・每回合回靈 <b>${st.spRegen}</b>・攻擊力 <b>${BHTD.atkPt(st.atk)}</b>・防禦力 <b>${BHTD.defPt(st.def)}</b>・陣眼子＝發星光的${eyeN}</p>
    <div class="bt-dust"><span>✦ <span>星塵</span> <b>${D.d}</b>${tn?` ・<span>天賦</span> <b>${tn}</b>／${BHTD.TAL.length}`:""}</span><button type="button" class="btn ghost" data-tb="1">🌌 天賦</button></div>
    ${typeof bhtlCard==="function"?bhtlCard():""}<div class="bt-cards">${cards()}</div>
    <p class="bt-me" style="margin-bottom:0">帶上場的招式（最多 4 招）：</p><div class="bt-sklist">${skHTML()}</div>
    <p class="bt-me">戰鬥演出：<span class="bt-seg">${Object.keys(BHTD_FXN).map(x=>`<button type="button" data-fx="${x}" class="${x===fx?"on":""}">${BHTD_FXN[x]}</button>`).join("")}</span></p>
    <details class="bt-rule"><summary>陣地規則</summary>雙方各有元氣（紅條）。星樞的子過河後，每回合每顆扣你 1 元氣，停進你的九宮再多扣 2；你的子過河也一樣扣星樞。被將軍扣 5。你的子被吃、被將軍，還有星樞招式扣你的元氣，都會被你的防禦力減少（至少扣 1）；過河、九宮、星碎格照原本扣。擒子扣對方元氣（越弱的子吃越強的子扣得越多，一次最多 12），還 +10 靈力；每回合也會自動回靈力（修為越高回越多）。<br>炮隔一子瞄到的敵子會「破甲」，下次打它多扣 1。紫墨星門會在預告的格子落下星樞的援軍，站上去可以堵住。<br>發星光的是陣眼子：用它吃子扣元氣 ×1.5；它被吃，靈力全散、招式停 1 回合。<br>一回合放一招，放招不佔走棋。將死或把星樞元氣打光都算贏；你的元氣歸零就輸，可以重打本關。<br>過關得星塵：三星是過關、陣眼子沒被吃、在規定回合內過關。星塵拿去點天賦（只在黑洞有用）。${typeof bhtlCard==="function"?`<br><button type="button" class="btn ghost" data-tl="1">▶ 再玩一次練習賽</button>`:""}</details>`,
    [["⚔ 出戰",()=>{if(sel==="rd")bhtdRaid(k,cover,pk);else bhtdStart(sel,k,cover,pk)}],later],"prolog bt-sel");
  if(!m)return;const paint=()=>{m.querySelector(".bt-cards").innerHTML=cards();m.querySelector(".bt-sklist").innerHTML=skHTML()};
  m.addEventListener("click",e=>{const tl=e.target.closest("[data-tl]");if(tl&&typeof bhtlStart==="function"){vibrate(5);m.remove();bhtlStart(k,cover);return}   /* 練習賽卡、規則裡的「再玩一次練習賽」 */
    if(e.target.closest("[data-tb]")){vibrate(5);m.remove();bhtdTal(()=>bhtdSelect(k,cover,Object.assign({},opt,{rd:sel==="rd"})));return}   /* 🌌 天賦：看完回到這張卡 */
    const c=e.target.closest(".bt-card");if(c){if(c.dataset.n==="rd"){if(!rdOk){toast("🔒 先破第 1 關，才開星淵急襲");return}vibrate(5);sel="rd";paint();return}
      const n=+c.dataset.n;if(!bhtdOpenLv(P,n)){toast("🔒 先破第 "+(n-1)+" 關");return}vibrate(5);sel=n;paint();return}
    const l=e.target.closest(".bt-sklist label");if(l){const id=l.dataset.id,s=BHTD.SKM[id];if(s.lv>L){toast(`🔒 修為 Lv ${s.lv} 解鎖「${s.nm}」`);return}e.preventDefault();vibrate(5);if(pk.includes(id)){if(pk.length>1)pk=pk.filter(x=>x!==id)}else if(pk.length<4)pk.push(id);else toast("一場最多帶 4 招");paint();return}
    const f=e.target.closest("[data-fx]");if(f){store.set("bhtdFx",f.dataset.fx);m.querySelectorAll("[data-fx]").forEach(x=>x.classList.toggle("on",x===f))}})}
function bhtdOpen(){const lk=bhtdLock();if(lk){toast("🌫 "+lk);return}bhtdSelect(store.get("era","classic"),false)}   /* 本機試玩：主控台 bhtdOpen()；觀星臺渾儀也走這裡（定軌力用完＝黑洞入口關著） */
if(typeof window!=="undefined")window.bhtdOpen=bhtdOpen;
/* 開發者 11/13（實打驗收）：同一關有沒下完的塔防盤，卡片上換了招再按出戰 → 先問「接著下舊盤」還是「開新盤（用新選的招）」；招沒變＝直接接著下。
   how：未給＝先查；"go"＝照常（沒有同關舊盤）；"old"＝接舊盤（不再扣星芒）；"new"＝丟掉舊盤、用新選的招開新盤。q＝結果視窗「再刷一場」：不播關卡開場的長台詞 */
const bhtdSkKey=a=>(Array.isArray(a)?a.slice():[]).sort().join(",");
/* 天賦「星火初燃」開局多給的靈力（星芒換靈力時先算進去，免得多扣星芒） */
const bhtdTalSp=t=>BHTD.talValid(t).includes("xhcr")?BHTD.TAL_SP:0;
function bhtdStart(n,k,cover,sk,how,q){const C=bhtdC();if(!C)return toast("規則程式還沒載好");
  if(how!=="old"){const lk=bhtdLock();if(lk){toast("🌫 "+lk);return}}   /* 11/14：定軌力用完＝黑洞入口關著（接著下沒下完的那盤照常） */
  if(!how){api("/play/state").then(st=>{const td=st&&st.td,same=td&&st.journey==="bh:td"+n&&!st.result&&st.moves&&st.moves.length;
      if(!same)return bhtdStart(n,k,cover,sk,"go");if(bhtdSkKey(td.sk)===bhtdSkKey(sk))return bhtdStart(n,k,cover,sk,"old");
      const nm=a=>a.map(id=>BHTD.SKM[id]?BHTD.SKM[id].nm:id).join("、");
      modal(`<div class="em">🌀</div><h2>第 ${n} 關還有一盤沒下完</h2><p class="muted">那一盤下到第 ${td.rnd+1} 回合，帶的是：${esc(nm(td.sk))}。</p><p class="muted">剛剛選的是：${esc(nm(sk))}。</p>`,
        [["▶ 接著下舊盤",()=>bhtdStart(n,k,cover,sk,"old")],["⚔ 開新盤（用新選的招）",()=>bhtdStart(n,k,cover,sk,"new")],["取消",null,true]])}).catch(()=>bhtdStart(n,k,cover,sk,"go"));return}
  const ck=bhtdChar(),L=bhtdL(),diff=bhtdDiff(),ai=BHTD.depthOf(n,diff),P=bhtdProg(),tal=bhtdDust().t;   /* tal：點亮的天賦（只在黑洞塔防生效，boot 的 cfg.tal） */
  P.sk[ck]=sk;P.last=n;store.set("bhtd",P);try{bhPreload()}catch(e){}
  const R0=store.get("bhRet",null);store.set("bhRet",{k:k||(R0&&R0.k)||store.get("era","classic"),cover:k?cover!==false:!!(R0&&R0.cover),at:Date.now(),first:!((+store.get("bhCount",0)||0)>0)});store.set("park3d",true);
  let xm=0;try{if(how!=="old"&&typeof dglXmTake==="function"){const st0=BHTD.stats(ck,L);xm=dglXmTake(Math.min(st0.sp,(BHTD.LV[n-1].sp0||0)+bhtdTalSp(tal)),st0.sp,BHTD.SPK)}}catch(e){xm=0}   /* 開發者 11/13 平日體力：身上的星芒帶進來當開局靈力，用掉的扣掉（m/07dgl-stamina.js；boot 的 cfg.xm）；11/14 晚：1 點星芒＝SPK 點靈力，xm 是換到的靈力點數 */
  jStart("bh:td"+n,{human:"r",lx:Math.min(18,ai.depth),journey:"bh:td"+n,lv:{fen:BHTD.startFen(n,C),turn:"r"},td:{lv:n,ch:ck,L,diff,sk,xm,tal}},()=>{const was=/^#\/journey\/play/.test(location.hash);location.hash="#/journey/play";
    if(was)try{window.dispatchEvent(new Event("xq-play"))}catch(e){}if(xm)setTimeout(()=>toast(`✦ 帶進 ${Math.ceil(xm/BHTD.SPK)} 點星芒，開局靈力 +${xm}`),q?2400:6200);
    setTimeout(()=>{try{bhBell()}catch(e){}toast(`✦ 第 ${n} 關・${BHTD.LV[n-1].nm}——星樞推算 ${ai.depth} 步`)},q?300:900);if(!q)setTimeout(()=>toast("✦ 星樞："+BHTD.LV[n-1].say),3600)},how==="new")}   /* "new"＝jStart 第 4 個參數 force：不接舊盤 */
/* ---------- 11/14 第二批：星淵急襲（3～5 分鐘的中局殘陣；每場從 BHTD.RAID 隨機抽一組＋星門變化；星塵照表現 6～10、不給修為）---------- */
let BHTD_RDL="";   /* 上一場抽到的模板（再刷不連抽同一組） */
const bhtdRdOpen=P=>!!(P&&P.c&&P.c[1]);   /* 破第 1 關才開 */
function bhtdRaid(k,cover,sk,q){const C=bhtdC();if(!C)return toast("規則程式還沒載好");const lk=bhtdLock();if(lk){toast("🌫 "+lk);return}
  const ck=bhtdChar(),L=bhtdL(),diff=bhtdDiff(),ai=BHTD.depthOf(BHTD.RAID_AI,diff),P=bhtdProg(),tal=bhtdDust().t,pool=BHTD.RAID.filter(T=>T.id!==BHTD_RDL),T=pool[Math.floor(Math.random()*pool.length)]||BHTD.RAID[0],v=Math.floor(Math.random()*4);
  BHTD_RDL=T.id;if(Array.isArray(sk)&&sk.length){P.sk[ck]=sk;store.set("bhtd",P)}try{bhPreload()}catch(e){}
  const R0=store.get("bhRet",null);store.set("bhRet",{k:k||(R0&&R0.k)||store.get("era","classic"),cover:k?cover!==false:!!(R0&&R0.cover),at:Date.now(),first:!((+store.get("bhCount",0)||0)>0)});store.set("park3d",true);
  let xm=0;try{if(typeof dglXmTake==="function"){const st0=BHTD.stats(ck,L);xm=dglXmTake(Math.min(st0.sp,BHTD.SPK+bhtdTalSp(tal)),st0.sp,BHTD.SPK)}}catch(e){xm=0}
  jStart("bh:rd",{human:"r",lx:Math.min(18,ai.depth),journey:"bh:rd",lv:{fen:BHTD.raidFen(T.id,C),turn:"r"},td:{raid:{id:T.id,v},ch:ck,L,diff,sk,xm,tal}},()=>{const was=/^#\/journey\/play/.test(location.hash);location.hash="#/journey/play";
    if(was)try{window.dispatchEvent(new Event("xq-play"))}catch(e){}if(xm)setTimeout(()=>toast(`✦ 帶進 ${Math.ceil(xm/BHTD.SPK)} 點星芒，開局靈力 +${xm}`),2400);
    setTimeout(()=>{try{bhBell()}catch(e){}toast(`⚡ 星淵急襲・${T.nm}——星樞元氣 ${BHTD.RAID_HP}`)},q?300:900)},true)}
/* ---------- 11/14 第二批：星塵與天賦（存檔鍵 bhtdDust，05b JOURNEY_KEYS）----------
   d＝星塵、t＝點亮的天賦、s＝各關最佳星數、r＝急襲 {n 場數, w 勝場}、g＝發過星塵的盤（最近 20 盤，重新整理不重發）、la＝上一盤的結算（結果視窗重開照樣顯示） */
function bhtdDust(){let o=null;try{o=store.get("bhtdDust",null)}catch(e){}const D=o&&typeof o==="object"?o:{};
  return{d:Math.max(0,Math.round(+D.d)||0),t:BHTD.talValid(D.t),s:D.s&&typeof D.s==="object"?D.s:{},r:Object.assign({n:0,w:0},D.r&&typeof D.r==="object"?D.r:{}),g:Array.isArray(D.g)?D.g.slice(-20):[],la:D.la&&typeof D.la==="object"?D.la:null}}
/* 定軌力用完（07dgl dglBhLock）＝黑洞入口關著：回一句短說明；設定關掉平日體力的人一律不擋 */
function bhtdLock(){try{return typeof dglBhLock==="function"&&dglBhLock()?(typeof dglBhLockMsg==="function"?dglBhLockMsg():"定軌力用完了，黑洞入口先關著"):""}catch(e){return""}}
/* 結算星塵（bhtdEnd、bhtdResult 都叫；同一盤只發一次）：三星、星塵、差一點、累計 */
function bhtdAward(st){const td=st&&st.td;if(!td||!st.result||st.journey==="bh:tl")return null;const D=bhtdDust();if(D.la&&D.la.id===st.id)return D.la;
  const win=st.result.w===st.human,S=BHTD.starsOf(td,win),ns=S.filter(Boolean).length,rd=!!td.rd,n=td.lv,P=bhtdProg(),best=Math.max(0,+D.s[n]||0),boss=!rd&&!!(BHTD.LV[n-1]||{}).boss;
  const fl={raid:rd,boss,first:!rd&&win&&!P.c[n],s3:!rd&&best<3},du=BHTD.dustOf(Object.assign({win,stars:ns},fl)),near=BHTD.nearOf(td,win,fl),done=D.g.includes(st.id);
  if(!done){D.d+=du.n;if(!rd&&ns>best)D.s[n]=ns;if(rd){D.r.n++;if(win)D.r.w++}D.g=D.g.concat([st.id]).slice(-20)}
  const A={id:st.id,win,S,dust:du,near,total:D.d,rd,n,r3:+td.r3||0};D.la=A;try{store.set("bhtdDust",D)}catch(e){}return A}
/* 天賦樹（選關卡片「🌌 天賦」）：4 層 7 個，點亮花星塵；下一層要上一層至少一個；關卡外免費全部重置。back＝回選關卡片 */
function bhtdTal(back){bhtdCss();
  const body=()=>{const D=bhtdDust(),sp=BHTD.talSpent(D.t);
    const node=x=>{const on=D.t.includes(x.id),w=on?"":BHTD.talWhy(D.t,x.id,D.d),lk=!on&&w==="先點亮上一層的一個天賦";
      return`<button type="button" class="bt-tn${on?" on":lk?" lk":w?" poor":""}" data-tal="${x.id}" aria-label="${esc(`${x.nm}，${x.d}，${on?"已點亮":`星塵 ${x.cost}`}${w&&!on?"，"+w:""}`)}"><b>${on?"✦ ":lk?"🔒 ":""}${esc(x.nm)}</b><small>${esc(x.d)}</small><i>${on?"已點亮":`<span>星塵</span> ${x.cost}`}</i></button>`};
    return`<p class="bt-dust" style="justify-content:center"><span>✦ <span>星塵</span> <b>${D.d}</b> ・<span>已用</span> <b>${sp}</b>／${BHTD.TAL_ALL}</span></p>`+
      [1,2,3,4].map(t=>`<div class="bt-tier"><small>第 ${t} 層</small><div class="bt-trow">${BHTD.TAL.filter(x=>x.t===t).map(node).join("")}</div></div>`).join("")+
      `<p class="bt-trule">要點下一層，先點亮上一層的一個。<br>天賦只在黑洞有用，線上和一般對局不受影響。<br>不在對局裡時，可以免費全部重置，星塵全退。</p>`};
  const m=modal(`<div class="em">🌌</div><h2>星塵天賦</h2><div class="bt-talb">${body()}</div>`,
    [["‹ 回選關",()=>{if(back)back()}],["↺ 全部重置（星塵全退）",()=>{const D=bhtdDust(),n=BHTD.talReset(D);store.set("bhtdDust",D);toast(n?`↺ 天賦全部重置，退回 ${n} 星塵`:"還沒有點亮的天賦");bhtdTal(back)},true]],"prolog bt-sel bt-tal");
  if(!m)return;m.addEventListener("click",e=>{const b=e.target.closest("[data-tal]");if(!b)return;const id=b.dataset.tal,x=BHTD.TALM[id],D=bhtdDust();if(!x)return;
    if(D.t.includes(id)){toast(`✦ ${x.nm}：${x.d}`);return}const r=BHTD.talBuy(D,id);if(!r.ok){toast("✧ "+r.why);return}
    store.set("bhtdDust",D);try{vibrate([10,40,10])}catch(z){}toast(`✦ 點亮「${x.nm}」：${x.d}`);m.querySelector(".bt-talb").innerHTML=body()})}
/* ---------- 對局中（bhTick 叫） ---------- */
function bhtdHide(){if(typeof document==="undefined")return;document.body&&document.body.classList.remove("bhtd-on","bhtd-tg");for(const id of["bhtdEn","bhtdMe","bhtdOv","bhtdView","bhtdViewM"]){const e=document.getElementById(id);if(e)e.remove()}BHTD_TG=null;BHTD_PRE=null;BHTD_HINT=null;BHTD_MK="";BHTD_HK="";if(BHTD_RAF){cancelAnimationFrame(BHTD_RAF);BHTD_RAF=0}if(typeof bhtlHide==="function")bhtlHide()}
function bhtdTick(st){if(typeof document==="undefined")return;if(!bhtdIs(st)){if(BHTD_ST||document.getElementById("bhtdMe"))bhtdHide();BHTD_ST=null;return}
  const fresh=!BHTD_ST||BHTD_ST.id!==st.id;BHTD_ST=st;bhtdCss();document.body.classList.add("bhtd-on");if(fresh){BHTD_TG=null;BHTD_HK=""}
  const bb=document.getElementById("bbox");if(!bb||!bb.parentNode)return;
  let en=document.getElementById("bhtdEn");if(!en){en=document.createElement("div");en.id="bhtdEn";const pt=document.getElementById("pTop");(pt||bb).after(en);en.addEventListener("click",bhtdEnClick)}
  let me=document.getElementById("bhtdMe");if(!me){me=document.createElement("div");me.id="bhtdMe";bb.after(me);me.addEventListener("click",bhtdHudClick);BHTD_HK=""}   /* 11/13 實打驗收：對局頁重畫把舊的 #bhtdMe 拿掉、新建的是空的，BHTD_HK 還記著舊內容就不重畫 → 第一盤招式鈕整排空白到走第一步 */
  if(!document.getElementById("bhtdOv")){const o=document.createElement("div");o.id="bhtdOv";o.innerHTML=`<svg aria-hidden="true"></svg><div class="mks"></div>`;document.body.append(o);o.addEventListener("click",bhtdOvClick)}
  if(BHTD_TG&&!bhtdMyTurn(st)){BHTD_TG=null;BHTD_MK=""}   /* 換手了：選到一半的招收掉 */
  bhtdHudPaint();bhtdEvents(st);try{bhtdViewUi(st);bhtdTitle(st);bhtdPreTick(st);bhtdWinTick(st)}catch(e){console.warn("[bhtd]",e)}if(!BHTD_RAF)BHTD_RAF=requestAnimationFrame(bhtdFrame);if(typeof bhtlTick==="function")bhtlTick(st)}   /* 練習賽旁白、聚光燈、進階機制第一次的提示（07bhtl-tdlearn.js） */
const bhtdMyTurn=st=>!!st&&!st.result&&st.turn===st.human&&!st.thinking;
function bhtdPv(st){return{td:st.td,board:st.board.slice(),moves:st.moves||[],pos:[],human:st.human,turn:st.turn}}
/* 絕招：這場帶的招裡耗靈最多的那招（一樣多取解鎖修為高的）；固定排在最後（直拿最右、橫拿 2×2 右下） */
function bhtdUlt(td){let u=null;for(const id of td.sk||[]){const S=BHTD.SKM[id];if(!S)continue;const U=u&&BHTD.SKM[u];if(!U||S.cost>U.cost||(S.cost===U.cost&&S.lv>U.lv))u=id}return(td.sk||[]).length>1?u:null}
function bhtdHudPaint(){const st=BHTD_ST,en=document.getElementById("bhtdEn"),me=document.getElementById("bhtdMe");if(!st||!en||!me)return;const td=st.td,C=bhtdC(),Pv=bhtdPv(st),V=BHTD.LV[td.lv-1]||{};
  const g=td.gate,gl=g?(g.at-td.rnd<=0?"本回合結束落下":`${g.at-td.rnd} 回合後落下 ${g.p.length} 子`):"星門已盡";
  /* 11/14：舊版兩行式（標題＋星樞元氣＋星門＋預告卡）換成對峙資訊列（上排星樞、下排自己） */
  const myT=bhtdMyTurn(st),fx=td.fx&&!st.result?BHTD.FSK[td.fx.id]:null,gn=g?Math.max(0,g.at-td.rnd):0;
  const line=!st.result&&!myT?`<span class="bt-think">星樞推演中…</span>`:fx?`<button type="button" data-x="fore">⚠ ${esc(fx.nm)}・預估 −${BHTD.foeEst(td,st.board)}</button>`:`<span class="bt-gate">✦ ${g?(gn<=0?"星門本回合落子":`星門 ${gn} 回合後落 ${g.p.length} 子`):"星門已盡"}</span>`;
  const esp=td.en.spMax?`<span class="bt-esp" title="星樞靈力 ${td.en.sp}／${td.en.spMax}"><i style="width:${Math.round(100*td.en.sp/Math.max(1,td.en.spMax))}%"></i><b><span class="ax-sr">星樞靈力 </span>${td.en.sp}／${td.en.spMax}</b></span>`:"";
  const ci0=(td.ci||[]).length,eyeOk0=BHTD.sqOf(td,td.eye)!=null,sts=`${td.gd?"🛡×"+td.gd:""}${ci0?" 🛡將":""}${td.disc?" ⚡−"+td.disc:""}${(td.hot||[]).length?" 守心":""}${td.noCross>=td.rnd?" 護棚":""}${td.run?" 跑腿×"+td.run.left:""}${td.revB?" 驛鈴":""}${td.seal>td.rnd?" ⛓停招":""}${eyeOk0?"":" ✧陣眼失"}`;
  const eh=`<div class="bt-ttl"><b>${esc(bhtdName(td))}</b><small>星樞推算 ${td.ai?td.ai.depth:1} 步・第 ${td.rnd+1} 回合</small></div>
<div class="bt-r1"><i class="bt-av en" aria-hidden="true">${td.boss?"卒":"將"}</i><div class="bt-bar en"><i style="width:${Math.round(100*td.en.hp/Math.max(1,td.en.max))}%"></i><b>${td.boss?"星樞卒將":"星樞"} ${td.en.hp}／${td.en.max}</b></div>${esp}<div class="bt-ln" aria-live="polite">${line}</div></div>
<div class="bt-r2"><i class="bt-av me" aria-hidden="true">${BHTD.PCN[td.pc]||"帥"}</i><div class="bt-bar me"><i style="width:${Math.round(100*td.me.hp/Math.max(1,td.me.max))}%"></i><b>${esc(td.cn)} ${td.me.hp}／${td.me.max}</b></div><div class="bt-sp" title="靈力 ${td.me.sp}／${td.me.spMax}・每回合回 ${+td.me.spRg||BHTD.SPK}"><i style="width:${Math.round(100*td.me.sp/Math.max(1,td.me.spMax))}%"></i><b><span class="ax-sr">靈力 </span>${td.me.sp}／${td.me.spMax}</b></div><span class="bt-st">${sts}</span><small class="bt-ad" title="攻擊力 ${BHTD.atkPt(td.me.atk)}・防禦力 ${BHTD.defPt(td.me.def)}"><span>攻擊力</span> ${BHTD.atkPt(td.me.atk)}<br><span>防禦力</span> ${BHTD.defPt(td.me.def)}</small><small class="bt-rnd">第 ${td.rnd+1} 回</small></div>`;
  if(en.dataset.h!==eh){en.dataset.h=eh;en.innerHTML=eh}
  document.body.classList.toggle("bhtd-tg",!!BHTD_TG);   /* 11/13 實打驗收：選目標時，進階機制小卡（#bhtlTip）蓋在最上面兩排，點不到底下的目標格 → 選目標期間變半透明、點得穿 */
  const my=bhtdMyTurn(st),ci=(td.ci||[]).length,eyeOk=BHTD.sqOf(td,td.eye)!=null;let sks="",tip="";
  if(BHTD_TG){const S=BHTD.SKM[BHTD_TG.id];tip=`<div class="bt-tip">${BHTD_TG.arm?`✦ 再點一次「${esc(S.nm)}」放出`:`🎯 ${esc(S.nm)}：${BHTD_TG.pk.length&&S.steps>1?"再選第 2 個":"點盤上發光的格"}`}<button type="button" data-x="cancel">取消</button></div>`}
  const ult=bhtdUlt(td),ord=td.sk.filter(id=>id!==ult).concat(ult?[ult]:[]);
  if(!st.result)sks=`<div class="bt-sks">${ord.map(id=>{const S=BHTD.SKM[id];if(!S)return"";const w=!my?(st.turn!==st.human?"等星樞走完":"請稍候"):BHTD_BUSY?"演出中":C?BHTD.why(Pv,id,C):"";const c=BHTD.costOf(td,id),arm=BHTD_TG&&BHTD_TG.id===id;
    return`<button type="button" class="bt-sk${w?" off":""}${id===ult?" ult":""}${arm?" arm":""}" data-k="${id}" data-w="${esc(w||"")}" aria-label="${esc(S.nm)}${id===ult?"（絕招）":""}，耗 ${c} 靈力${w?"，"+esc(w):""}"><b>${esc(S.nm)}</b><small>${c} 靈</small></button>`}).join("")}</div>`;
  sks+=`<div class="bt-aux"><button type="button" data-x="hint">💡 提示</button><button type="button" data-x="desel">✕ 取消選取</button><button type="button" class="bt-more" data-x="more" aria-label="更多：認輸、重開本關、戰鬥演出">⋯</button></div>`;
  const mh=`${tip}${sks}`;   /* 11/14：自己的元氣、靈力搬到上面的對峙資訊列；這裡只剩招式列與輔助列 */
  if(BHTD_HK!==mh){BHTD_HK=mh;me.innerHTML=mh}}
/* 星樞預告卡（第 151 題）：招名、效果、「若不處理預估扣幾點」；兒童模式多一行建議 */
function bhtdForeHTML(st){const td=st.td,fx=td.fx;if(!fx||st.result)return"";const F=BHTD.FSK[fx.id];if(!F)return"";const est=BHTD.foeEst(td,st.board);
  const kid=bhtdKid()?(fx.id==="zhs"?"建議：吃掉過河的卒，或擋住它們":fx.id==="cfx"?"建議：先別吃那顆發紅光的卒，或先開護盾":"建議：先開護盾或回元氣"):"";
  return`<div class="bt-fore">⚠ 星樞預告：<b>${esc(F.nm)}</b>（下回合結束發動）・${esc(F.d.replace("{c}",td.zcap))}<br>若不處理，預估扣你 <b>${est}</b> 元氣${kid?`<br><span class="kid">💡 ${esc(kid)}</span>`:""}</div>`}
function bhtdHudClick(e){const x=e.target.closest("[data-x]");if(x&&x.dataset.x==="cancel"){BHTD_TG=null;BHTD_MK="";bhtdHudPaint();return}
  if(x&&x.dataset.x==="hint"){vibrate(5);bhtdHint();return}if(x&&x.dataset.x==="desel"){vibrate(5);bhtdDesel();return}if(x&&x.dataset.x==="more"){vibrate(5);bhtdMore();return}
  const b=e.target.closest(".bt-sk");if(!b)return;const w=b.dataset.w;if(w){toast("✦ "+w);return}vibrate(8);bhtdUse(b.dataset.k)}
function bhtdUse(id){const st=BHTD_ST,S=BHTD.SKM[id],C=bhtdC();if(!st||!S||!C||BHTD_BUSY)return;
  if(BHTD_TG&&BHTD_TG.id===id){const arm=BHTD_TG.arm;BHTD_TG=null;BHTD_MK="";bhtdHudPaint();if(arm)bhtdPlay(id,[]);return}   /* 11/14 兩段式：再點同一顆＝放出（不用選目標的招）或取消選目標 */
  if(typeof bhtlCastOk==="function"&&!bhtlCastOk(st))return;const w=BHTD.why(bhtdPv(st),id,C);if(w)return toast("✦ "+w);
  if(!S.tg){if(typeof bhtlIs==="function"&&bhtlIs(st))return bhtdPlay(id,[]);BHTD_TG={id,pk:[],arm:1};BHTD_MK="";bhtdHudPaint();return}   /* 練習賽照舊一點就放 */BHTD_TG={id,pk:[]};BHTD_MK="";bhtdHudPaint();toast("🎯 "+S.nm+"："+S.d)}
/* 選目標：點盤上的發光格（#bhtdOv 的按鈕）；長街破陣第二步選橫線／直線 */
function bhtdOvClick(e){const b=e.target.closest(".bt-mk.tg");if(!b||!BHTD_TG||!BHTD_ST)return;e.stopPropagation();vibrate(8);const T=BHTD_TG,S=BHTD.SKM[T.id];T.pk.push(+b.dataset.sq);bhtdNextPick(T,S)}
function bhtdNextPick(T,S){const C=bhtdC();if(T.pk.length>=S.steps){BHTD_TG=null;BHTD_MK="";bhtdHudPaint();bhtdPlay(T.id,T.pk.slice());return}
  const L=BHTD.targets(bhtdPv(BHTD_ST),T.id,T.pk,C);if(L.length&&typeof L[0]==="object"){BHTD_TG=null;BHTD_MK="";bhtdHudPaint();
    modal(`<h2 style="font-size:19px">${esc(S.nm)}</h2><p class="muted">打哪一條線？</p>`,L.map(o=>[o.l,()=>bhtdPlay(T.id,T.pk.concat([o.v]))]).concat([["取消",null,true]]));return}
  if(!L.length){BHTD_TG=null;BHTD_MK="";bhtdHudPaint();toast("沒有可以配對的目標");return}BHTD_MK="";bhtdHudPaint()}
/* 格子 → 螢幕座標：3D 巨盤用 park3d screenOf；平面棋盤照 01-board 的 SVG（560×620、格距 60、邊 40） */
/* 3D 盤（park3d 畫在 #bbox）時，地面類記號貼平在盤面：用相鄰兩格的投影當透視的 x、z 單位向量，組成 CSS matrix（元素 1 個 --c 寬＝盤面 1 格） */
const BHTD_GND=/\b(eye|gate|shard|fb|fr|tg|trap|thr|frz|selg|ink|aim|pre|hf|ht)\b/;   /* 11/14：選中子底光、落點水墨點、可吃紅準星、預選、提示也貼地 */   /* frz：3D 盤上定身鎖鏈圈貼地（剩幾回合的小數字跟著貼地） */
function bhtd3d(){try{const bb=document.getElementById("bbox");return!!(typeof PARK!=="undefined"&&PARK&&PARK.v&&PARK.host===bb&&PARK.v.el&&PARK.v.el.isConnected&&PARK.v.el.style.display!=="none"&&PARK.v.screenOf)}catch(e){return false}}
function bhtdGnd(q,p,cell){const c=q%9,r=q/9|0,sx=c<8?1:-1,sz=r<9?1:-1,a=bhtdXY(q+sx),b=bhtdXY(q+9*sz);if(!a||!b||!cell)return null;
  const M=[(a.x-p.x)*sx/cell,(a.y-p.y)*sx/cell,(b.x-p.x)*sz/cell,(b.y-p.y)*sz/cell,0,0];return M.every(Number.isFinite)?M.map(n=>+n.toFixed(4)).join(","):null}
function bhtdXY(sq){try{const bb=document.getElementById("bbox");if(typeof PARK!=="undefined"&&PARK&&PARK.v&&PARK.host===bb&&PARK.v.el&&PARK.v.el.isConnected&&PARK.v.el.style.display!=="none"&&PARK.v.screenOf)return PARK.v.screenOf(sq);
    const sv=bb&&bb.querySelector("svg");if(!sv)return null;const r=sv.getBoundingClientRect();if(!r.width)return null;const k=Math.min(r.width/560,r.height/620),ox=r.left+(r.width-560*k)/2,oy=r.top+(r.height-620*k)/2;return{x:ox+(40+sq%9*60)*k,y:oy+(40+(sq/9|0)*60)*k}}catch(e){return null}}
function bhtdMarks(st){const td=st.td,L=[],C=bhtdC(),b=st.board;
  /* 11/14 塔防固定鏡頭（3D）：選中子底光、合法落點水墨點、可吃處紅準星環（park3d 不畫它自己的綠點紅圈）；平面棋盤照 01-board 原本的畫法 */
  try{if(!st.result&&typeof PARK!=="undefined"&&PARK&&PARK.last&&PARK.v&&PARK.v.tdCam&&PARK.v.tdCam()&&bhtd3d()){const o=PARK.last.o||{};if(o.sel>=0){L.push({k:"selg",sq:o.sel});for(const t of o.targets||[])L.push({k:b[t]?"aim":"ink",sq:t})}}}catch(e){}
  if(BHTD_PRE&&BHTD_PRE.id===st.id&&!st.result&&!bhtdMyTurn(st))L.push({k:"pre",sq:BHTD_PRE.sq});
  if(BHTD_HINT){if(Date.now()<BHTD_HINT.until&&!st.result){L.push({k:"hf",sq:BHTD_HINT.f});if(BHTD_HINT.t!=null)L.push({k:"ht",sq:BHTD_HINT.t})}else BHTD_HINT=null}
  if(BHTD_TG){const T=BHTD_TG;for(const q of T.pk)L.push({k:"tg pk",sq:q});const S=BHTD.SKM[T.id],cand=C?BHTD.targets(bhtdPv(st),T.id,T.pk,C):[];if(cand.length&&typeof cand[0]!=="object")for(const q of cand)if(!T.pk.includes(q)&&(typeof bhtlTgOk!=="function"||bhtlTgOk(st,T,q)))L.push({k:"tg",sq:q,b:1})}   /* 練習賽：只亮教學指定的目標 */
  const eye=BHTD.sqOf(td,td.eye);if(eye!=null)L.push({k:"eye",sq:eye});
  if(td.gate&&!st.result){const n=Math.max(0,td.gate.at-td.rnd),g3=bhtd3d();td.gate.sq.concat(td.gate.fk||[]).forEach(q=>{if(g3){L.push({k:"gate",sq:q});L.push({k:"gt",sq:q,t:`門 ${n}`})}else L.push({k:"gate",sq:q,t:`<b>門</b><i>${n}</i>`})})}   /* 假門跟真門畫得一樣；3D 盤上圈貼地、數字另起直立標籤 */
  for(const q of td.shard||[])if(!b[q])L.push({k:"shard",sq:q});
  if(td.fx&&!st.result){const F=BHTD.foeMarks(td,b,C);for(const q of F.blk)L.push({k:"fb",sq:q});for(const q of F.red)L.push({k:"fr",sq:q,t:"<i>1</i>"})}
  /* 11/13 十八招去重定稿的盤上標記：守門點（仕角守門）、擒得到俥的敵子（認轍尋路）、迷煙不能吃子、煙幕藏身、銅鎖、雙燕結對 */
  if(!st.result){for(const o of td.trap||[])L.push({k:"trap",sq:o.sq});if(td.thr&&td.thr.q)for(const q of td.thr.q)if(b[q])L.push({k:"thr",sq:q})}
  const badge=(tag,k,t)=>{const q=BHTD.sqOf(td,tag);if(q!=null)L.push({k:"bd "+k,sq:q,t})};
  for(const o of td.noCap||[])if(o.until>td.rnd)badge(o.tag,"nc","迷");for(const o of td.noTake||[])if(o.until>td.rnd)badge(o.tag,"nt","藏");
  if(td.lockW)badge(td.lockW.tag,"nc","鎖");for(const o of td.pair||[]){badge(o.a,"nt","燕");badge(o.b,"nt","燕")}
  for(const t of td.pj){const q=BHTD.sqOf(td,t);if(q!=null)L.push({k:"pj",sq:q,t:"破"})}
  for(const t of td.frz){const q=BHTD.sqOf(td,t);if(q==null)continue;const o=(td.frzQ||[]).find(x=>x.tag===t),n=1+(o?o.n:0);L.push({k:"frz",sq:q,t:`<i>${n}</i>`})}   /* 定身：深藍鎖鏈圈＋還要停幾回合（這回合 1＋排隊的；開發者 11/13 換掉 💨） */
  const shv={};for(const s of td.sh){const q=BHTD.sqOf(td,s.tag);if(q!=null)shv[q]=(shv[q]||0)+s.v}for(const q in shv)L.push({k:"sh",sq:+q,t:"盾"+shv[q]});
  return L}
function bhtdFrame(){BHTD_RAF=0;const st=BHTD_ST,o=document.getElementById("bhtdOv");if(!st||!o||!bhtdIs(st))return;
  if(!/^#\/journey\/play/.test(location.hash)){bhtdHide();return}
  const L=bhtdMarks(st),key=JSON.stringify(L),box=o.querySelector(".mks");if(key!==BHTD_MK){BHTD_MK=key;box.innerHTML=L.map(m=>m.b?`<button type="button" class="bt-mk ${m.k}" data-sq="${m.sq}" aria-label="目標 ${m.sq}"></button>`:`<div class="bt-mk ${m.k}" data-sq="${m.sq}">${m.t||""}</div>`).join("")}
  const a=bhtdXY(40),c=bhtdXY(41),cell=a&&c?Math.max(18,Math.min(90,Math.hypot(c.x-a.x,c.y-a.y))):36;o.style.setProperty("--c",cell+"px");
  const g3=bhtd3d();for(const el of box.children){const q=+el.dataset.sq,p=bhtdXY(q);if(!p){el.style.display="none";continue}el.style.display="";
    const M=g3&&BHTD_GND.test(el.className)?bhtdGnd(q,p,cell):null,up=el.classList.contains("gt")?cell*.62:0;el.classList.toggle("g3",!!M);
    el.style.transform=`translate(${p.x}px,${p.y-up}px)`+(M?` matrix(${M})`:"")+" translate(-50%,-50%)"+(!M&&el.classList.contains("shard")?" rotate(45deg)":"")}
  /* 炮線：紅炮隔一子瞄到的敵子（回合結束就會破甲），淡橘虛線 */
  {const sv=o.querySelector("svg");let h="";if(!st.result&&st.turn===st.human)for(const z of BHTD.netHits(st.board,(st.td.fn2|0)>=st.td.rnd)){const p=bhtdXY(z.c),q=bhtdXY(z.t);if(p&&q)h+=`<line x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}" stroke="rgba(255,154,60,.75)" stroke-width="2.5" stroke-dasharray="7 6"/>`}if(sv.dataset.h!==h){sv.dataset.h=h;sv.innerHTML=h}}
  BHTD_RAF=requestAnimationFrame(bhtdFrame)}
/* ---------- 扣元氣跳字、招式特效（看 td.ev 新增的事件） ---------- */
function bhtdBarXY(id){const e=document.getElementById(id);if(!e)return{x:innerWidth/2,y:innerHeight/2};const r=e.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height*.35}}
function bhtdFloat(t,p,cls,fs){if(!p)return;const d=document.createElement("div");d.className="bt-fl "+(cls||"");d.textContent=t;d.style.left=p.x+"px";d.style.top=p.y+"px";if(fs)d.style.fontSize=fs+"px";document.body.append(d);try{const w=d.offsetWidth*1.15/2+8,W=innerWidth;if(w*2<W)d.style.left=Math.max(w,Math.min(W-w,p.x))+"px"}catch(e){}   /* 11/13 實打：a9 的「銅鎖：敢動就定身」被切掉一半 → 靠邊往內收（1.15＝動畫最大放大） */setTimeout(()=>d.remove(),1400)}
function bhtdFx(kind,sq,o){const p=bhtdXY(sq);if(!p)return;if(document.querySelectorAll(".bt-fx").length>=15)return;   /* 同屏粒子最多 15 顆 */const a=bhtdXY(40),c=bhtdXY(41),cell=a&&c?Math.hypot(c.x-a.x,c.y-a.y):40,d=document.createElement("div");d.className="bt-fx "+kind;const s=cell*({ring:1,rip:1.5,ckf:1.15,ckd:1.15,dot:.22})[kind]||cell*1.8;if(o&&o.dx!=null){d.style.setProperty("--dx",o.dx+"px");d.style.setProperty("--dy",o.dy+"px")}
  d.style.cssText+=`left:${p.x}px;top:${p.y}px;width:${s}px;height:${s}px`;if(kind==="gold")d.innerHTML=`<img src="data/bhtd/fx/burst.webp" alt="" onerror="this.remove()">`;if(kind==="ink")d.innerHTML=`<img src="data/bhtd/fx/ink_splash.webp" alt="" onerror="this.remove()">`;
  document.body.append(d);setTimeout(()=>d.remove(),900)}
function bhtdEvents(st){const td=st.td,id=st.id;if(BHTD_SEEN[id]==null){BHTD_SEEN[id]=td.seq;return}const s0=BHTD_SEEN[id];if(td.seq<=s0)return;BHTD_SEEN[id]=td.seq;
  td.ev.filter(e=>e.s>s0).forEach((e,i)=>setTimeout(()=>{try{bhtdEv(e,st)}catch(x){}try{if(typeof bhtlTip==="function")bhtlTip(e,st)}catch(x){}},i*160))}   /* bhtlTip：進階機制第一次出現跳一句（07bhtl-tdlearn.js） */
function bhtdEv(e,st){const at=q=>q!=null?bhtdXY(q):null;
  if(e.k==="hit"&&e.sd==="b"&&e.cap){bhtdCapFx(e);return}if(e.k==="hit"&&e.sd==="b"&&e.chk){bhtdChkFx(e);return}   /* 11/14 擒子、將軍：打擊演出三版 */
  if(e.k==="hit"&&e.sd==="b"){bhtdFloat("−"+e.n,at(e.sq)||bhtdBarXY("bhtdEn"),"dmg",Math.min(48,18+e.n*2.2));if(e.src==="sk"&&e.sq!=null)bhtdFx("gold",e.sq);if(e.why==="過河"||e.why==="將軍")bhtdFloat(e.why+" −"+e.n,bhtdBarXY("bhtdEn"),"info")}
  else if(e.k==="hit"&&e.sd==="r"){bhtdFloat((e.why==="過河"?"防線受壓 ":/^(九宮星核|卒海過河|引力撕裂|殘卒反星|星碎格)$/.test(e.why||"")?e.why+" ":"")+"−"+e.n,   /* 11/14 跳字：敵子過河扣我方＝「防線受壓 −1」 *//^(過河|九宮星核|卒海過河|引力撕裂)$/.test(e.why||"")?bhtdBarXY("bhtdMe"):at(e.sq)||bhtdBarXY("bhtdMe"),"hurt",Math.min(40,16+e.n*2));if(e.why==="被將軍")bhtdFloat("被將軍 −5",bhtdBarXY("bhtdMe"),"info")}
  else if(e.k==="trap"||e.k==="thr"){for(const q of e.sq||[])bhtdFx(e.k==="trap"?"ring":"spark",q);bhtdFloat(e.k==="trap"?"仕角守門 "+(e.sq||[]).length+" 點":"認轍：追俥的敵子 "+(e.sq||[]).length+" 顆",bhtdBarXY("bhtdMe"),"info",15)}   /* sq 是陣列，不能走下面的 at() */
  else if(e.k==="lock"){bhtdFx("ring",e.sq);bhtdFloat("銅鎖：敢動就定身",at(e.sq),"info",15)}
  else if(e.k==="ncap"){bhtdFx("smoke",e.sq);bhtdFloat("迷煙：不能吃子",at(e.sq),"info",15)}
  else if(e.k==="ntk"){bhtdFx("smoke",e.sq);bhtdFloat("煙幕藏身",at(e.sq),"sp",16)}
  else if(e.k==="pair"){bhtdFx("ring",e.sq);bhtdFx("ring",e.t);bhtdFloat("雙燕結對",at(e.sq),"sp",16)}
  else if(e.k==="hot")bhtdFloat("九宮守心",bhtdBarXY("bhtdMe"),"heal",18);
  else if(e.k==="run")bhtdFloat("跑腿 ×"+e.n,bhtdBarXY("bhtdMe"),"heal",18);
  else if(e.k==="ncx")bhtdFloat(e.n?"青玉護棚 擋過河 "+e.n:"青玉護棚",bhtdBarXY("bhtdMe"),"sp",18);
  else if(e.k==="heal"&&e.n)bhtdFloat("+"+e.n+" 元氣",bhtdBarXY("bhtdMe"),"heal",24);
  else if(e.k==="sp"&&e.n)bhtdFloat("+"+e.n+" 靈力",bhtdBarXY("bhtdMe"),"sp",18);
  else if(e.k==="absorb")bhtdFloat("🛡 護盾抵消",bhtdBarXY("bhtdMe"),"sp",18);
  else if(e.k==="ci")bhtdFloat("🛡 守住將軍",bhtdBarXY("bhtdMe"),"sp",18);
  else if(e.k==="gd")bhtdFloat("🛡",bhtdBarXY("bhtdMe"),"sp",30);
  else if(e.k==="shuse")bhtdFloat("盾擋 "+e.n,at(e.sq),"sp",18);
  else if(e.k==="sh"){if(e.sq!=null)bhtdFx("ring",e.sq);if(e.n)bhtdFloat("盾 +"+e.n,at(e.sq),"sp",16);else if(e.src==="pair")bhtdFloat("雙燕接護",at(e.sq),"sp",16)}
  else if(e.k==="frz"){if(e.sq!=null)bhtdFx("smoke",e.sq);bhtdFloat(e.n>1?"定身 "+e.n+" 回合":"定身",at(e.sq),"info")}
  else if(e.k==="mark")bhtdFloat("破甲",at(e.sq),"dmg",15);
  else if(e.k==="drop"){if(e.sq!=null)bhtdFx("ink",e.sq);bhtdFloat("星門落子",at(e.sq),"info");try{bhBell()}catch(x){}}
  else if(e.k==="block")bhtdFloat("堵住星門！",at(e.sq),"heal",18);
  else if(e.k==="shard"){bhtdFx("smoke",e.sq);bhtdFloat("星碎格 −3",at(e.sq),"info",18)}
  else if(e.k==="esp")bhtdFloat("星樞 +"+(e.n||BHTD.ESP_GAIN)+" 靈",bhtdBarXY("bhtdEn"),"info",14);
  else if(e.k==="fore"){const F=BHTD.FSK[e.id];if(F){toast("⚠ 星樞預告："+F.nm+"——下回合結束發動");try{bhBell()}catch(x){}}}
  else if(e.k==="fake"){bhtdFx("smoke",e.sq);bhtdFloat("假門散了",at(e.sq),"info",15)}
  else if(e.k==="miss"){const F=BHTD.FSK[e.id];if(F)bhtdFloat(F.nm+" 落空",bhtdBarXY("bhtdEn"),"heal",16)}
  else if(e.k==="eye2"){toast("✧ 星陣護體：陣眼子被擒，只散 "+BHTD.TAL_EYE_SP+" 靈力");vibrate([20,40,20]);bhtdFloat("星陣護體",bhtdBarXY("bhtdMe"),"sp",18)}   /* 11/14 第二批天賦 */
  else if(e.k==="tal"){const T=BHTD.TALM[e.id];if(T)bhtdFloat(T.nm,e.id==="qxgm"?bhtdBarXY("bhtdMe"):(e.sq!=null&&bhtdXY(e.sq))||bhtdBarXY("bhtdMe"),e.id==="qxgm"?"heal":"sp",16)}
  else if(e.k==="eye"){toast("✧ 陣眼子被擒！靈力散盡，招式停 1 回合");vibrate([20,40,20]);bhtdFloat("陣眼受損・靈力歸零",bhtdBarXY("bhtdEn"),"hurt",20)}
  else if(e.k==="rm"){if(e.sq!=null)bhtdFx("ink",e.sq);bhtdFloat("破",at(e.sq),"dmg",30)}
  else if(e.k==="tp"||e.k==="sw"||e.k==="rev"){if(e.sq!=null)bhtdFx("spark",e.sq);if(e.t!=null)bhtdFx("spark",e.t);if(e.k==="rev")bhtdFloat("回營",at(e.sq),"heal",20)}}
/* ---------- 放招演出：草書招名（寫出 1 秒→停 1 秒→化墨 0.5 秒）＋法器共鳴（park3d itemCast）→ 生效；點一下畫面＝直接結算 ---------- */
function bhtdPlay(id,tg){const st=BHTD_ST,S=BHTD.SKM[id];if(!st||!S||BHTD_BUSY)return;const td=st.td,mode=bhtdFxMode();BHTD_BUSY=true;BHTD_HK="";bhtdHudPaint();
  let fired=false,ih=null,closed=false;const ov=document.createElement("div");ov.id="bhtdCast";ov.setAttribute("role","presentation");document.body.append(ov);
  const close=()=>{if(closed)return;closed=true;ov.classList.add("out");setTimeout(()=>ov.remove(),320)};
  const fire=()=>{if(fired)return;fired=true;close();api("/play/td",{k:id,tg}).catch(e=>toast(e.message)).finally(()=>{BHTD_BUSY=false;BHTD_HK="";bhtdHudPaint()})};
  ov.addEventListener("pointerdown",e=>{e.preventDefault();e.stopPropagation();if(ih)try{ih.skip()}catch(x){}fire()});
  try{vibrate([8,30,8])}catch(e){}const LV=bhtdFxLv(),ult=id===bhtdUlt(td),tq=(tg||[]).filter(q=>typeof q==="number");
  if(LV===0){ov.innerHTML=`<div class="bt-flash" style="animation:none">${esc(S.nm)}</div>`;setTimeout(fire,350);return}   /* 關閉／減少動態：跳過草書與角色動作，招名靜態一下就生效 */
  if(LV===1){ov.innerHTML=`<div class="bt-cao" style="animation-duration:.8s"><div class="pp"></div><div class="ink" style="animation-duration:.8s">${S.cao?`<img src="${esc(S.cao)}" alt="${esc(S.nm)}">`:`<span class="tx">${esc(S.nm)}</span>`}</div><div class="who">${esc(td.cn)}・${esc(S.nm)}</div></div>`;
    const im1=ov.querySelector(".ink img");if(im1)im1.onerror=()=>{im1.replaceWith(Object.assign(document.createElement("span"),{className:"tx",textContent:S.nm}))};
    setTimeout(()=>{fire();for(const q of tq)bhtdFx("spark",q)},800);return}   /* 簡化：不拉鏡頭、不播法器，草書 0.8 秒＋目標格光效 */
  if(mode==="full"){ov.innerHTML=`<div class="bt-cao" style="animation-duration:1.2s"><div class="pp"></div><div class="ink" style="animation-duration:1.2s">${S.cao?`<img src="${esc(S.cao)}" alt="${esc(S.nm)}">`:`<span class="tx">${esc(S.nm)}</span>`}</div><div class="who">${esc(td.cn)}・${esc(S.nm)}</div></div>`;
    const im=ov.querySelector(".ink img");if(im)im.onerror=()=>{im.replaceWith(Object.assign(document.createElement("span"),{className:"tx",textContent:S.nm}))}}
  const lead=mode==="full"?1.2:.5,eye=BHTD.sqOf(td,td.eye),   /* 11/14：草書 2.5 秒縮成 1.2 秒 */k=(BHTD.CH[td.ch]||{}).pc||"K",sq=eye!=null?eye:st.board.indexOf(k)>=0?st.board.indexOf(k):st.board.indexOf("K");
  try{const bb=document.getElementById("bbox");if(typeof PARK!=="undefined"&&PARK&&PARK.v&&PARK.host===bb&&PARK.v.itemCast&&PARK.v.el&&PARK.v.el.style.display!=="none")ih=PARK.v.itemCast({sq,K:k,spin:Math.max(.2,lead-.3),act:fire,done:()=>{}})}catch(e){ih=null}
  if(ult&&sq>=0)try{const bb=document.getElementById("bbox");if(typeof PARK!=="undefined"&&PARK&&PARK.v&&PARK.host===bb&&PARK.v.tdPush){PARK.v.tdPush(sq,1100);PARK.v.act(sq,"cheer",1600)}}catch(e){}   /* 放絕招：鏡頭往陣眼子推近 15%、角色歡呼 */
  setTimeout(()=>{if(!ih)fire();else if(mode==="full")close()},lead*1000);setTimeout(fire,lead*1000+1800)}   /* 物件沒載到、2D 棋盤：草書播完就生效；保險：最晚 lead＋1.8 秒一定生效 */
/* ---------- 結算（11/14 第二批：三星、差一點、本局高光、標題評語、星塵、「↻ 再刷一場」）---------- */
function bhtdEnd(st){if(!st||!st.td||!st.result)return;try{bhtdAward(st)}catch(e){console.warn("[bhtd]",e)}if(st.td.rd)return;   /* 先算星塵（要看是不是第一次過關），急襲不記關卡進度 */
  const P=bhtdProg(),n=st.td.lv,win=st.result.w===st.human;if(win){if(!P.c[n])P.c[n]=Date.now();P.w[n]=(P.w[n]||0)+1}else P.l[n]=(P.l[n]||0)+1;store.set("bhtd",P)}
/* 07-legend journeyGameEnd 問：星淵急襲不給修為（只給星塵） */
function bhtdNoXp(st){return!!(st&&st.td&&st.td.rd&&String(st.journey||"")==="bh:rd")}
const bhtdName=td=>td.lv?`第 ${td.lv} 關・${td.nm}`:td.rd?td.nm:"練習賽・"+td.nm;
/* 本局高光：最高一擊（哪顆吃哪顆）、最高連擊（連續擒子）、陣眼子擒子數 */
function bhtdHiHTML(td){const H=td.hi||{},mx=H.mx;
  return`<div class="bt-hl"><span><small>最高一擊</small><b>${mx?"−"+mx.n:"—"}</b>${mx?`<i>${BHTD.PCN[mx.cp]||""}吃${BHTD.PBN[mx.vp]||""}</i>`:""}</span><span><small>最高連擊</small><b>${H.cb>1?"×"+H.cb:H.cb?"×1":"—"}</b></span><span><small>陣眼擒子</small><b>${+H.ey||0}</b></span></div>`}
/* 差一點：一行提示（再少幾回合、陣眼子別被吃、星樞還剩多少元氣——輸的時候星樞剩不到三成才講，不然不算「差一點」） */
const BHTD_NEAR=.3;
function bhtdNearTxt(N){if(!N||!N.k)return"";if(N.k==="lose")return!(N.hp>0&&N.hp<=Math.ceil((+N.max||N.hp)*BHTD_NEAR))?"":`差一點！星樞只剩 ${N.hp} 元氣，打光就過關`;
  if(N.k==="rnd")return`差一點！再少 ${N.d} 回合就三星，額外 +${N.x} 星塵`;if(N.k==="eye")return`差一點！陣眼子別被吃，就能三星，額外 +${N.x} 星塵`;return`差一點！陣眼子別被吃、再少 ${N.d} 回合，就能三星，額外 +${N.x} 星塵`}
function bhtdResult(st,win,draw0,XPR){const td=st.td,rd=!!td.rd,n=td.lv,V=rd?{}:(BHTD.LV[n-1]||{}),nx=rd?null:BHTD.LV[n],R=store.get("bhRet",null),k=R&&R.k,cv=R&&R.cover,sk=td.sk;
  bhtdCss();const why=st.result.why||"",tip=win?"":(V.tip?V.tip+"。":"")+(/元氣/.test(why)?"敵子過河、停進九宮都在扣你的元氣：先把過河的子吃掉，站上紫墨星門也能堵住援軍。":/將死|困斃/.test(why)?"先保帥：九宮旁邊留住仕、相，別讓星樞的車馬直衝進來。":"");   /* 11/13：原本少一層括號，「關卡提示＋true」一律變成真值、永遠只顯示第一句 */
  const A=bhtdAward(st)||{S:[!!win,false,false],dust:{n:0,parts:[]},near:null,total:bhtdDust().d,r3:+td.r3||0},S=A.S,g=BHTD.gradeOf(win,td.me.hp,S[0]&&S[1]&&S[2]),say=BHTD.GSAY[g][Math.floor(Math.random()*3)],all=!rd&&win&&!nx;
  const lab=[["過關",""],["陣眼子沒被吃",""],[A.r3?`<b>${A.r3}</b> <span>回合內</span>`:"限時過關",""]];
  const stars=`<div class="bt-stars" role="img" aria-label="${esc(`${S.filter(Boolean).length} 星`)}">${S.map((on,i)=>`<span class="bt-st1${on?"":" off"}"><b aria-hidden="true">${on?"★":"☆"}</b><small>${i===2?lab[i][0]:`<span>${lab[i][0]}</span>`}</small></span>`).join("")}</div>`;
  const nt=bhtdNearTxt(A.near),du=A.dust||{n:0,parts:[]},dl=`<p class="bt-dl">✦ <span>星塵</span> <b>+${du.n}</b>${du.parts.length>1?` <small>（${du.parts.map(p=>`<span>${p[0]}</span> +${p[1]}`).join("・")}）</small>`:""} ・<span>共</span> <b>${A.total}</b></p>`;
  const ag=BHTD.AGAIN[td.ch]||"",cn=(BHTD.CH[td.ch]||{}).n||td.cn||"";
  const m=modal(`<div class="em">${win?"✨":draw0?"🤝":"🌀"}</div><h2>${esc(BHTD.GRADE[g])}</h2><p class="muted">${esc(why)}・🌀 ${esc(rd?td.nm:`第 ${n} 關・${V.nm||td.nm}`)}</p>${stars}${nt?`<p class="bt-near">${esc(nt)}</p>`:""}${dl}${bhtdHiHTML(td)}
    <p style="font-size:13.5px;text-align:center">扣掉星樞元氣 <b>${td.dealt}</b>・你被扣 <b>${td.taken}</b>・剩餘元氣 ${td.me.hp}／${td.me.max}</p><p class="bt-say">${esc(say)}</p>${tip?`<p class="muted" style="font-size:13px">💡 ${esc(tip)}</p>`:""}${all?`<p class="pl-say">✦ 星樞：「星域一……竟被你們踏平了。更深的星淵，還在後頭。」</p>`:""}${ag?`<p class="pl-say"><b>${esc(cn)}</b>：「${esc(ag)}」</p>`:""}${rd?"":XPR||""}`,
    [...(win&&nx?[[`下一關：${nx.nm} ›`,()=>bhtdStart(n+1,k,cv,sk),"bt-nx"]]:[]),["返回星盤",()=>bhtdSelect(k,cv,{after:1,rd}),"bt-back"],["↻ 再刷一場（＋星塵）",()=>{if(rd)bhtdRaid(k,cv,sk,1);else bhtdStart(n,k,cv,sk,"new",1)}],["再看一下星盤",null,"bt-look"]],"res bt-res");
  if(!m)return;const b=m.querySelectorAll(".mb .btn");if(b.length>=2)b[b.length-2].classList.add("bt-again")}   /* modal 的第三格字串會加 ghost；主色的再刷鈕另外補上 bt-again（寬、排在右邊） */
/* 3D：第 6 關守關＝黑將換成星樞卒（xs_zu）、放大 1.45 倍（park3d ex.bhBoss） */
function bhtdParkEx(st){if(!bhtdIs(st))return{bhBoss:null,tdCam:null};const v=bhtdView();return{bhBoss:st.td.boss||null,tdCam:v==="flat"?null:v,tdFx:bhtdFxLv()}}   /* 11/14：固定鏡頭（全局俯視／臨陣斜角）、打擊演出等級 */
/* ---------- 11/14 對峙資訊列：點「⚠ 預告」看完整說明 ---------- */
function bhtdEnClick(e){const x=e.target.closest("[data-x]"),st=BHTD_ST;if(!x||!st)return;if(x.dataset.x==="fore"){const td=st.td,F=td.fx&&BHTD.FSK[td.fx.id];if(!F)return;vibrate(5);
  toast(`⚠ 星樞預告「${F.nm}」（下回合結束發動）：${F.d.replace("{c}",td.zcap)}・若不處理，預估扣你 ${BHTD.foeEst(td,st.board)} 元氣`)}}
/* ---------- 11/14 一鍵三段視角：頂欄右上「👁」點一下換下一種（全局俯視 → 臨陣斜角 → 純淨平面），同時彈出小選單可以直接點；選單最後一行是轉橫向的靜態提示 ---------- */
function bhtdViewUi(st){if(typeof document==="undefined")return;const tr=document.getElementById("topRight");if(!tr)return;let b=document.getElementById("bhtdView");
  if(st&&typeof bhtlIs==="function"&&bhtlIs(st)){if(b)b.remove();return}   /* 練習賽整盤平面，不給換視角 */
  if(!b){b=document.createElement("button");b.type="button";b.id="bhtdView";b.className="ib";b.addEventListener("click",e=>{e.stopPropagation();vibrate(5);bhtdSetView(({top:"tilt",tilt:"flat",flat:"top"})[bhtdView()]);bhtdViewMenu(true)});tr.prepend(b)}
  const v=bhtdView();if(b.dataset.v!==v){b.dataset.v=v;b.innerHTML=`<span aria-hidden="true">👁</span><small>${BHTD_VW[v]}</small>`;b.setAttribute("aria-label","視角："+BHTD_VW[v]+"（點一下換下一種）");b.title="視角："+BHTD_VW[v]}}
function bhtdViewOut(e){const t=e.target;if(t&&t.closest&&(t.closest("#bhtdViewM")||t.closest("#bhtdView")))return;bhtdViewMenu(false)}
function bhtdViewMenu(show){let m=document.getElementById("bhtdViewM");clearTimeout(BHTD_VMT);if(!show){if(m)m.remove();removeEventListener("pointerdown",bhtdViewOut,true);return}
  if(!m){m=document.createElement("div");m.id="bhtdViewM";m.setAttribute("role","menu");m.setAttribute("aria-label","視角");document.body.append(m);
    m.addEventListener("click",e=>{const b=e.target.closest("[data-v]");if(!b)return;e.stopPropagation();vibrate(5);bhtdSetView(b.dataset.v);bhtdViewMenu(false)});setTimeout(()=>addEventListener("pointerdown",bhtdViewOut,true),0)}
  const v=bhtdView();let port=false;try{port=matchMedia("(orientation:portrait)").matches}catch(e){}
  m.innerHTML=Object.keys(BHTD_VW).map(k=>`<button type="button" role="menuitemradio" aria-checked="${k===v}" data-v="${k}" class="${k===v?"on":""}">${k===v?"●":"○"} ${BHTD_VW[k]}<small>${BHTD_VWD[k]}</small></button>`).join("")+(port?"<p>📱 手機轉成橫向，星盤會更大</p>":"");
  BHTD_VMT=setTimeout(()=>bhtdViewMenu(false),6000)}
function bhtdSetView(v){if(!BHTD_VW[v]||v===bhtdView())return;try{store.set("bhtdView",v);if(v!=="flat")store.set("park3d",true)}catch(e){}
  try{if(v!=="flat"&&typeof PARK!=="undefined"&&PARK&&PARK.v&&PARK.v.setTdCam)PARK.v.setTdCam(v,bhtdFxLv())}catch(e){}
  BHTD_MK="";try{if(typeof window!=="undefined"&&window.cgPlay&&cgPlay.rr)cgPlay.rr()}catch(e){}bhtdViewUi()}   /* 平面↔3D：08b 重畫（PARK_OFF 照 bhtlFlat→bhtdFlat） */
/* 頂欄標題換成關卡名（極簡頂欄；對峙列不再放標題） */
function bhtdTitle(st){const t=document.getElementById("title");if(!t||!st||!st.td)return;const td=st.td,s=" "+bhtdName(td);let sp=t.querySelector(".bt-tt");
  if(!sp){for(const n of t.childNodes)if(n.nodeType===3)n.nodeValue="";sp=document.createElement("span");sp.className="bt-tt";t.append(sp)}if(sp.dataset.s!==s){sp.dataset.s=s;sp.textContent=s}}
/* ---------- 11/14 電腦思考時預選下一手（只高亮、不送出）：07pm pmvTap 一開頭問這裡（塔防局不排預走）；輪到你時自動選起那顆子（08b cgPlay.tap） ---------- */
function bhtdPmv(st,me,i,ex){if(!bhtdIs(st)||st.result)return null;const p=st.board&&st.board[i],mine=!!p&&(p===p.toUpperCase()?"r":"b")===me;
  BHTD_PRE=mine&&!(BHTD_PRE&&BHTD_PRE.id===st.id&&BHTD_PRE.sq===i)?{id:st.id,n:(st.moves||[]).length,sq:i}:null;
  try{if(typeof pmvSt==="function"){const S=pmvSt();S.q=null;S.sel=null}}catch(e){}if(BHTD_PRE)vibrate(5);BHTD_MK="";try{if(ex&&ex.redraw)ex.redraw()}catch(e){}return true}
function bhtdPreTick(st){const P=BHTD_PRE;if(!P)return;if(P.id!==st.id||st.result){BHTD_PRE=null;return}
  if(bhtdMyTurn(st)&&(st.moves||[]).length>P.n){BHTD_PRE=null;const q=P.sq;if(st.board[q]&&(st.legal||[]).some(([f])=>f===q))setTimeout(()=>{try{if(window.cgPlay&&cgPlay.sel()<0)cgPlay.tap(q)}catch(e){}},0)}}
/* ---------- 11/14 輔助列：提示、取消選取、⋯（沒有「回合結束」：象棋走一步就換手） ---------- */
function bhtdDesel(){let did=false;if(BHTD_TG){BHTD_TG=null;did=true}if(BHTD_PRE){BHTD_PRE=null;did=true}if(BHTD_HINT){BHTD_HINT=null;did=true}BHTD_MK="";
  try{const s=window.cgPlay&&cgPlay.sel?cgPlay.sel():-1;if(s>=0){cgPlay.tap(s);did=true}}catch(e){}bhtdHudPaint();if(!did)toast("目前沒有選取")}
/* 提示（不用提示棋、不問引擎）：照塔防規則挑一件最該做的事——能擒子就挑扣最多的（過河子優先）→ 星樞預告 → 星門快落子就去堵 → 有招可放 → 一般建議；起點終點綠框亮 3.5 秒 */
function bhtdHint(){const st=BHTD_ST;if(!st||st.result)return;const td=st.td,b=st.board;if(!bhtdMyTurn(st))return toast("💡 等星樞走完，再幫你看");
  const show=(f,t,msg)=>{BHTD_HINT={f,t,until:Date.now()+3500};BHTD_MK="";toast("💡 "+msg)},nm=p=>p===p.toUpperCase()?BHTD.PCN[p]:BHTD.PBN[p.toUpperCase()];let best=null;
  for(const[f,t]of st.legal||[]){const v=b[t];if(!v||v===v.toUpperCase()||!b[f])continue;const eye=td.pid[f]===td.eye,pj=td.pj.includes(td.pid[t]),d=BHTD.capDmg(v,b[f],td.me.atk,eye,pj),cr=(t/9|0)>=5?3:0;if(!best||d+cr>best.sc)best={f,t,d,sc:d+cr,cr}}
  if(best)return show(best.f,best.t,`${nm(b[best.f])}吃${nm(b[best.t])}：扣星樞 ${best.d} 元氣${best.cr?"，還少一顆咬你的過河子":""}`);
  if(td.fx){const F=BHTD.FSK[td.fx.id];if(F)return toast(`💡 星樞預告「${F.nm}」：${F.d.replace("{c}",td.zcap)}`)}
  if(td.gate&&td.gate.at-td.rnd<=1){const m=(st.legal||[]).find(([,t])=>td.gate.sq.includes(t));if(m)return show(m[0],m[1],"站上星門，把援軍堵住")}
  const C=bhtdC(),id=C&&td.sk.find(x=>!BHTD.why(bhtdPv(st),x,C));if(id){const S=BHTD.SKM[id],bt=document.querySelector(`#bhtdMe .bt-sk[data-k="${id}"]`);if(bt){bt.classList.remove("pulse");void bt.offsetWidth;bt.classList.add("pulse")}return toast(`💡 靈力夠了，可以放「${S.nm}」：${S.d}`)}
  toast("💡 先護好陣眼子；敵子過河、停進九宮都會扣你的元氣")}
/* ⋯：戰鬥演出、視角、認輸、重開本關（直拿時底下的動作列收起來了） */
function bhtdMore(){const st=BHTD_ST;if(!st)return;const td=st.td,n=td.lv,R=store.get("bhRet",null),fx=bhtdFxMode(),vw=bhtdView();
  const seg=(O,k,cur)=>`<span class="bt-seg">${Object.keys(O).map(x=>`<button type="button" data-${k}="${x}" class="${x===cur?"on":""}">${O[x]}</button>`).join("")}</span>`;
  const resign=()=>{const b=[...document.querySelectorAll("#acts button")].find(x=>/認輸|Resign/.test((x.getAttribute("aria-label")||"")+x.textContent));if(b)b.click();else api("/play/resign").catch(e=>toast(e.message))};
  const again=()=>modal(`<h2 style="font-size:19px">重開第 ${n} 關？</h2><p class="muted">這一盤會放掉，用同樣的招重新開局。</p>`,[["↻ 重開",()=>bhtdStart(n,R&&R.k,R?R.cover!==false:false,td.sk,"new")],["取消",null,true]]);
  const m=modal(`<div class="em">🌀</div><h2 style="font-size:19px">${esc(td.lv?`第 ${td.lv} 關・${td.nm}`:td.nm)}</h2><p class="bt-me">戰鬥演出：${seg(BHTD_FXN,"fx",fx)}</p><p class="bt-me">視角：${seg(BHTD_VW,"vw",vw)}</p>`,
    [...(st.result?[]:[["🏳 認輸",resign]]),...(n&&!st.result?[["↻ 重開本關",again]]:[]),...(td.rd&&!st.result?[["↻ 換一場急襲",()=>bhtdRaid(R&&R.k,R?R.cover!==false:false,td.sk,1)]]:[]),[st.result?"關閉":"繼續下棋",null,true]]   /* 「戰鬥演出：關閉」也叫關閉，收視窗的鈕改叫繼續下棋 */,"prolog bt-sel");
  if(!m)return;m.addEventListener("click",e=>{const f=e.target.closest("[data-fx]");if(f){vibrate(5);store.set("bhtdFx",f.dataset.fx);m.querySelectorAll("[data-fx]").forEach(x=>x.classList.toggle("on",x===f));
      try{if(typeof PARK!=="undefined"&&PARK&&PARK.v&&PARK.v.setTdCam&&PARK.v.tdCam())PARK.v.setTdCam(PARK.v.tdCam(),bhtdFxLv())}catch(_){}return}
    const v=e.target.closest("[data-vw]");if(v){bhtdSetView(v.dataset.vw);m.querySelectorAll("[data-vw]").forEach(x=>x.classList.toggle("on",x===v))}})}
/* ---------- 11/14 打擊演出三版（bhtdFxLv：2 完整、1 簡化、0 關閉／減少動態）；不准全螢幕白閃、同屏粒子 ≤15（bhtdFx 擋） ---------- */
function bhtdStop(ms){try{const bb=document.getElementById("bbox");if(typeof PARK!=="undefined"&&PARK&&PARK.v&&PARK.host===bb&&PARK.v.hitStop)PARK.v.hitStop(ms)}catch(e){}}   /* 停格：3D 動畫停 ms 毫秒 */
function bhtdShake(){const bb=document.getElementById("bbox");if(!bb)return;bb.classList.remove("bt-shake");void bb.offsetWidth;bb.classList.add("bt-shake");setTimeout(()=>bb.classList.remove("bt-shake"),170)}   /* 上下微震 3px、120ms */
function bhtdTone(fr,dur,drum){try{if(typeof withAudio!=="function"||typeof AC==="undefined"||!AC||typeof sxmDst!=="function")return;withAudio(()=>{const t=AC.currentTime+.01,o=AC.createOscillator(),g=AC.createGain();o.type=drum?"sine":"triangle";
  o.frequency.setValueAtTime(fr,t);if(drum)o.frequency.exponentialRampToValueAtTime(fr*.5,t+dur);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(drum?.5:.18,t+.012);g.gain.exponentialRampToValueAtTime(.0008,t+dur);o.connect(g);g.connect(sxmDst("piece"));o.start(t);o.stop(t+dur+.05)})}catch(e){}}
function bhtdVig(){const d=document.createElement("div");d.className="bt-vig";d.setAttribute("aria-hidden","true");document.body.append(d);setTimeout(()=>d.remove(),800)}   /* 邊緣淡紅暗角（最濃 25%） */
function bhtdInk(sq,n){for(let i=0;i<n;i++){const a=i/n*Math.PI*2+Math.random()*.5,r=30+Math.random()*26;bhtdFx("dot",sq,{dx:Math.round(Math.cos(a)*r),dy:Math.round(Math.sin(a)*r)})}}   /* 墨點炸開 */
const BHTD_CN=["","一","二","三","四","五","六","七","八","九","十"];
function bhtdStamp(n,L){if(!L){bhtdFloat("連續擒子 ×"+n,bhtdBarXY("bhtdEn"),"st0",18);return}document.querySelectorAll(".bt-stamp").forEach(x=>x.remove());
  const d=document.createElement("div");d.className="bt-stamp"+(L===1?" s1":"");d.textContent=(BHTD_CN[Math.min(10,n)]||n)+"連斬";d.setAttribute("aria-hidden","true");document.body.append(d);setTimeout(()=>d.remove(),1800);if(L>=2)bhtdTone([523,659,784][Math.min(2,n-2)],.35)}   /* 朱紅印章，音階 C5→E5→G5 */
/* 擒子：一般「擒敵 −3」、以弱克強、陣眼神威、破甲貫穿、陣眼貫穿；奇謀連擊 ×2 另跳一行；連續擒子蓋印章（跳字照第 154 題 Gemini 文案） */
function bhtdCapFx(e){const L=bhtdFxLv(),p=(e.sq!=null&&bhtdXY(e.sq))||bhtdBarXY("bhtdEn"),pc=!!e.combo&&e.combo.indexOf("pierce")>=0,lab=e.weak?"以弱克強！":pc?"陣眼貫穿！":e.eye?"陣眼神威！":e.pj?"破甲貫穿！":"",t=(lab||"擒敵 ")+"−"+e.n;
  if(e.weak){if(L>=2){bhtdStop(90);bhtdShake();if(e.sq!=null){bhtdFx("gold",e.sq);bhtdInk(e.sq,6)}bhtdFloat(t,p,"big")}else if(L===1){bhtdStop(40);bhtdFloat(t,p,"big l1")}else bhtdFloat("−"+e.n+"（弱克強）",p,"wk0")}
  else if(lab)bhtdFloat(t,p,L?"dmg":"dmg st0",L?Math.min(34,22+e.n*1.2):22);
  else bhtdFloat(t,p,L?"cap":"cap st0");
  if(e.combo&&e.combo.indexOf("qm")>=0)setTimeout(()=>bhtdFloat("奇謀連擊 ×2",{x:p.x,y:p.y-46},L?"big qm":"dmg st0",L?null:18),L?240:0);
  if(e.streak>=2)setTimeout(()=>bhtdStamp(e.streak,L),L?380:0)}
/* 將軍：完整＝敵將腳下紅墨波紋＋邊緣淡紅暗角＋低沉鼓聲；簡化＝紅框閃一次；關閉＝粗紅虛線框＋「將軍（扣 5 元氣）」 */
function bhtdChkFx(e){const L=bhtdFxLv(),k=e.sq,p=(k!=null&&k>=0&&bhtdXY(k))||bhtdBarXY("bhtdEn"),t=(e.chain?"連環逼宮！":"將軍 ")+"−"+e.n;
  if(L>=2){if(k>=0){bhtdFx("rip",k);setTimeout(()=>bhtdFx("rip",k),180)}bhtdVig();bhtdTone(110,.45,1);bhtdFloat(t,p,e.chain?"big ck":"dmg",28)}
  else if(L===1){if(k>=0)bhtdFx("ckf",k);bhtdFloat(t,p,"dmg",26)}
  else{if(k>=0)bhtdFx("ckd",k);bhtdFloat(e.chain?"連環逼宮（扣 7 元氣）":"將軍（扣 5 元氣）",p,"st0 ck0")}}
/* 打倒魔王／破陣：這次看著它下完才播（重新整理打開已經下完的盤不播）；完整＝停格 150ms＋墨點散開＋金字橫幅（七星歡呼由 park3d 照結果播）；簡化＝橫幅淡入淡出；關閉＝靜態橫幅 */
function bhtdWinTick(st){const id=st.id;if(!st.result){BHTD_LIVE[id]=1;return}if(BHTD_LIVE[id]!==1)return;BHTD_LIVE[id]=2;if(st.result.w===st.human&&!(typeof bhtlIs==="function"&&bhtlIs(st)))setTimeout(()=>bhtdWinFx(st),250)}
function bhtdWinFx(st){const L=bhtdFxLv(),td=st.td,k=(st.board||[]).indexOf("k"),why=String(st.result&&st.result.why||""),t=td.boss?"打倒星樞卒將！":/元氣/.test(why)?"星樞潰散！":"破陣！";
  if(L>=2){bhtdStop(150);if(k>=0)bhtdInk(k,12)}const d=document.createElement("div");d.className="bt-ban"+(L===1?" l1":L===0?" l0":"");d.textContent=t;d.setAttribute("role","status");document.body.append(d);setTimeout(()=>d.remove(),1900)}
/* 平面棋盤拖曳（01-board）：塔防局棋子浮在手指上方 45px、放開照浮起那顆的位置找落點；px＝回螢幕像素，不然回棋盤座標（SVG 單位） */
function bhtdLift(svg,px){try{if(typeof document==="undefined"||!document.body.classList.contains("bhtd-on"))return px?0:14;if(px)return 45;const m=svg.getScreenCTM();return m&&m.a?45/m.a:14}catch(e){return px?0:14}}
/* 設定「角色」分頁：🌀 黑洞戰鬥演出 */
function bhtdSetMount(v){const pane=v&&v.querySelector&&v.querySelector('[data-pane="bot"]');if(!pane||pane.querySelector("#bhtdSet"))return;bhtdCss();
  const t=document.createElement("div");t.className="sec-t";t.textContent="🌀 黑洞戰鬥演出";const c=document.createElement("div");c.className="card";c.id="bhtdSet";
  const paint=()=>{const fx=bhtdFxMode();c.innerHTML=`<div class="bt-seg">${Object.keys(BHTD_FXN).map(x=>`<button type="button" data-fx="${x}" class="${x===fx?"on":""}">${BHTD_FXN[x]}</button>`).join("")}</div><p class="muted" style="font-size:12.5px;margin:6px 0 0">完整＝草書招名 1.2 秒＋法器共鳴＋擒子停格、微震；簡化＝草書 0.8 秒、少停格；關閉＝不播草書與震動，只留文字。手機設了「減少動態」一律用「關閉」這一版。放招演出中點一下畫面也能直接結算。</p>`};
  paint();c.addEventListener("click",e=>{const b=e.target.closest("[data-fx]");if(!b)return;vibrate(5);store.set("bhtdFx",b.dataset.fx);paint()});pane.append(t,c)}
if(typeof Settings==="function"){const f0=Settings;Settings=function(v){const r=f0.apply(this,arguments);try{bhtdSetMount(v)}catch(e){console.error(e)}return r}}
if(typeof window!=="undefined")addEventListener("hashchange",()=>{if(!/^#\/journey\/play/.test(location.hash))bhtdHide()});
