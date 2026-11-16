/* ================= 🌗 觀星臺：今日異象＋自由擺陣（11/16 開發者；前綴 gxd／GXD，全域先 grep 過沒撞名）=================
   入口：觀星臺（07gxt）圭表上的「今日異象」、石棋桌上的「自由擺陣」，各先播一段短過場（07gxt gxtFx "omen"／"free"），播完開這裡的全螢幕畫面。
   定案（story/新手體驗定案_141_兩輪討論.md）：
     今日異象＝每天一個「所有人同一題」的超展開陣容（同一天同一套、隔天換），可以無限重玩；
     自由擺陣＝16 子用點數預算自己擺（一定有帥、己方半場、仕在仕位、相在相位、開局不能將軍、將帥不能照面），電腦同規則按風格擺一陣跟你下。
     11/16 開發者選單「開局前先看到」：按難度鍵＝先抽電腦這盤的陣、整盤預覽（陣名、紅黑各有什麼子），可以「換一種」重抽（一定換風格），按「確定開戰」才開局。
   規則一律問變體引擎 Magellan（xiangqi-lab/src/varengine.js＝XQVar）：主執行緒沒有載 varengine.js，這裡自己開一個 Worker("varengine-worker.js")
     （跟 src/local.js 下棋用的那個分開），postMessage {id,cmd,args} → {id,ok,result}；用 dailySetup（臺灣日期當種子）、validateSetup（規則與錯誤訊息）、
     genSetup（照風格擺）、setupsToFen。畫面關掉就把 worker 收掉。測試（xiangqi-lab/tools/test-gxd-daily-1116.js）把 XQVar 直接放進 vm，gxdCall 就不開 worker。
   對局：石桌往事 jStart，journey＝"gxd:<臺灣日期>"（今日異象）或 "gxd:f<陣容雜湊>"（自由擺陣：同一陣沒下完可以接著下；換一陣＝不同 journey，jStart 會先問那一盤要不要放棄）。
     lv.fen 只留棋盤那一段（local.js 的 parseFen 不認後面的 " w"，帶著會變成 92 格、整個退回標準開局）。
     電腦用 Pikafish 還是 Magellan 由 local.js 自己判斷（子數超過 Pikafish 收的就換 Magellan），這裡不管引擎。
   難度：照幻譜星門 GX_MODES（輕鬆 −2／標準 0／挑戰 +2），基準＝玩家實力 bhLevel()，夾在 1～18。今日異象一律標準（所有人同一題，比成績才公平）。
   接點：07-legend journeyGameEnd（包一層：記成績、給修為）、jName（包一層：對局頁標題）、jBack／jPlace（是 const，07-legend 直接加一段 "gxd:" → 觀星臺）；
     08b 結果視窗（加一行叫 gxdResultModal）；07gx gxParkEx（包一層：3D 星空背景）、gxParkInfo（包一層：點遠方＝這一盤的說明，不是朝代遠景）。
   修為（量級照幻譜星門）：幻譜星門一盤贏拿的是 journeyGameEnd 一般對局的 40（07gx 自己不另給），所以今日異象每天第一次贏「另給 40」
     （addXP 的 key "gxd:<日期>" 擋重複）＝那一盤共 80；自由擺陣只拿一般的 40／15。
   存檔鍵（05b JOURNEY_KEYS 另一行 push）：gxdOmen＝{d 日期, n 盤數, w 贏, best 最快幾回合贏}（只留最新那一天）、
     gxdFree＝{lay 上次擺的陣, m 難度, n 盤數, w 贏, opp 上一盤電腦的陣名}、gxdDone＝結算過的那一盤（同一盤只算一次）。
   點數一律寫「預算」（記憶「開發者視角跟玩家一樣」：畫面上不寫最高額度那類字眼）。 */
const GXD_XP=40;   /* 今日異象每天第一次贏另給的修為（＝幻譜星門一盤贏的量） */
const GXD_NM={r:{K:"帥",A:"仕",B:"相",N:"傌",R:"俥",C:"炮",P:"兵"},b:{K:"將",A:"士",B:"象",N:"馬",R:"車",C:"砲",P:"卒"}};
const GXD_COST={K:0,A:1,B:2,N:3.5,R:10,C:6,P:.5};   /* 只用來在選子鍵上標分數（照 varengine COST10，11/13 定案）；真正算分、驗證一律問 worker validateSetup（含同類大子超過 4 顆的加價） */
const GXD_OK={K:["d0","e0","f0","d1","e1","f1","d2","e2","f2"],A:["d0","f0","e1","d2","f2"],B:["c0","g0","a2","e2","i2","c4","g4"]};   /* 帥、仕、相能放的格（紅方觀點，跟 varengine A_PTS／B_PTS 一樣）：點選時先擋、標綠點；最後仍以 validateSetup 為準 */
const GXD_STD={a0:"R",b0:"N",c0:"B",d0:"A",e0:"K",f0:"A",g0:"B",h0:"N",i0:"R",b2:"C",h2:"C",a3:"P",c3:"P",e3:"P",g3:"P",i3:"P"};
const GXD_STY=[["standard","標準陣"],["balanced","平衡陣"],["cavalry","騎兵陣"],["cannon","炮陣"],["wall","鐵壁"],["rook","俥陣"],["pawnsea","兵海"],["random","隨機陣"]];   /* 照 varengine STYLES */
const GXD_OPP=["cavalry","cannon","wall","rook","pawnsea","balanced","random"];   /* 電腦每盤抽一種風格（照 varengine STYLE_LIST，定案「電腦同規則按風格擺」） */
const GXD_GND=["taisu","tianyuan","yuxiu","quanxing","gouchen","beichen","ziyuan","yaoguang","kaiyang"];   /* 3D 對戰地面：借幻譜星門的星系地貌（data/gxground），照 journey 雜湊挑一張 */
const GXD_TXT={omen:"圭影所指，今天眾人同下這一局。",free:"黑洞把棋子吸散了，親手把它們排回來。",win:"異象退散，星軌記下了你這一步。",lose:"影子還在圭上，再看一次。",
  hiO:"今天的星象，所有人都下這一盤。",hiF:"你擺你的陣，我照星象回你一陣。"};
const GXD_MEM={};   /* 這次開 App 算過的今日陣容（日期 → dailySetup 結果） */
/* ---------- 純計算（不碰 DOM；測試用 vm 跑）---------- */
const gxdDate=t=>new Date((t==null?Date.now():+t)+8*3600e3).toISOString().slice(0,10);   /* 臺灣日期（跟 varengine taiwanDate 同一個算法，全世界同一天同一題） */
const gxdKind=j=>{const s=String(j||"");return/^gxd:\d{4}-\d\d-\d\d$/.test(s)?"omen":/^gxd:f/.test(s)?"free":null};
const gxdIs=st=>!!st&&!!gxdKind(st.journey);
const gxdFen=f=>String(f||"").trim().split(/\s+/)[0];
function gxdHash(s){let h=2166136261;s=String(s);for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
const gxdFreeId=fen=>"gxd:f"+gxdHash(gxdFen(fen)).toString(36);
const gxdModes=()=>typeof GX_MODES!=="undefined"&&Array.isArray(GX_MODES)?GX_MODES:[["easy","輕鬆",-2],["std","標準",0],["hard","挑戰",2]];
const gxdModeName=m=>(gxdModes().find(x=>x[0]===m)||gxdModes()[1])[1];
function gxdLx(m,base){if(base==null){try{base=typeof bhLevel==="function"?bhLevel():8}catch(e){base=8}}const d=(gxdModes().find(x=>x[0]===m)||[0,0,0])[2]||0;return Math.max(1,Math.min(18,Math.round((+base||8)+d)))}
/* jStart 的參數：玩家執紅、紅先；lx＝細分 1～18 級 */
const gxdArgs=(fen,lx,j)=>({human:"r",lx,journey:j,lv:{fen:gxdFen(fen),turn:"r"}});
const gxdPcs=s=>{const p=s&&s.pieces?s.pieces:s||{};if(Array.isArray(p)){const o={};for(const x of p)if(typeof x==="string")o[x.slice(1)]=x[0];return o}return p};
function gxdCompTxt(s,side){const P=gxdPcs(s),c={};for(const k in P)c[P[k]]=(c[P[k]]||0)+1;return["R","N","C","A","B","P"].filter(t=>c[t]).map(t=>GXD_NM[side][t]+" "+c[t]).join("・")}
/* 擺陣點一格：tool＝K A B N R C P 或 x（拿掉）。回 {L 新的陣, msg 擋下來的原因} */
function gxdTap(L0,sq,tool){const L=Object.assign({},L0),cur=L[sq];
  if(tool==="x"){if(cur==="K")return{L:L0,msg:"帥不能拿掉；選「帥」再點別格可以搬動它"};delete L[sq];return{L}}
  if(tool==="K"){if(!GXD_OK.K.includes(sq))return{L:L0,msg:"帥要擺在九宮內"};if(cur==="K")return{L};for(const k in L)if(L[k]==="K")delete L[k];L[sq]="K";return{L}}
  if(cur==="K")return{L:L0,msg:"這格是帥；要搬動帥，先選「帥」"};
  if(cur===tool){delete L[sq];return{L}}
  if(GXD_OK[tool]&&!GXD_OK[tool].includes(sq))return{L:L0,msg:tool==="A"?"仕只能擺在九宮的五個仕位（綠點）":"相只能擺在己方七個相位（綠點）"};
  if(!cur&&Object.keys(L).length>=16)return{L:L0,msg:"已經 16 子了，先拿掉一顆"};
  L[sq]=tool;return{L}}
/* 今日成績：只留最新那一天 */
function gxdOmenRec(date){const R=store.get("gxdOmen",null);return R&&R.d===date?R:{d:date,n:0,w:0,best:0}}
const gxdRecTxt=R=>!R||!R.n?"今天還沒下過這一盤":`今天下了 ${R.n} 盤、贏 ${R.w} 盤${R.best?`；最快 ${R.best} 回合破解`:""}`;
const gxdXpGot=date=>{try{return!!(store.get("xpKeys",{})||{})["gxd:"+date]}catch(e){return false}};
function gxdFreeGet(){const F=store.get("gxdFree",null);return F&&typeof F==="object"?F:{}}
/* ---------- 規則引擎（Magellan）：自己的 worker ---------- */
let GXD_W=null,GXD_SEQ=0;const GXD_CB=new Map();
function gxdWorker(){if(GXD_W)return GXD_W;const w=new Worker("varengine-worker.js");
  w.onmessage=e=>{const d=e.data||{},cb=GXD_CB.get(d.id);if(cb){GXD_CB.delete(d.id);cb(d)}};
  w.onerror=()=>{for(const[,cb]of GXD_CB)cb({ok:false,error:"規則引擎載入失敗"});GXD_CB.clear();if(GXD_W===w)GXD_W=null};GXD_W=w;return w}
function gxdCall(cmd,...a){
  if(typeof XQVar!=="undefined"&&XQVar&&typeof XQVar[cmd]==="function"){try{return Promise.resolve(XQVar[cmd](...a))}catch(e){return Promise.reject(e)}}   /* 主執行緒有 XQVar（測試）就直接算 */
  return new Promise((res,rej)=>{let w;try{w=gxdWorker()}catch(e){rej(e);return}const id=++GXD_SEQ,tm=setTimeout(()=>{if(GXD_CB.delete(id))rej(new Error("規則引擎沒有回應"))},15000);
    GXD_CB.set(id,d=>{clearTimeout(tm);if(d.ok)res(d.result);else rej(new Error(d.error||"規則引擎出錯"))});w.postMessage({id,cmd,args:a})})}
function gxdWorkerEnd(){try{if(GXD_W)GXD_W.terminate()}catch(e){}GXD_W=null;for(const[,cb]of GXD_CB)cb({ok:false,error:"已關閉"});GXD_CB.clear()}
const gxdDaily=date=>GXD_MEM[date]?Promise.resolve(GXD_MEM[date]):gxdCall("dailySetup",date).then(D=>{if(D&&D.fen)GXD_MEM[date]=D;return D});
/* 電腦照風格擺黑方（避開將軍、照面），雙方一起再驗一次；回 {black, fen, sty} 或 null。avoid＝這次不要抽到的風格（「換一種」用：一定換一種風格） */
async function gxdOppSetup(L,rnd,avoid){rnd=rnd||Math.random;const red={side:"r",pieces:L},S=GXD_OPP.filter(s=>s!==avoid);
  for(let i=0;i<4;i++){const sty=S[Math.floor(rnd()*S.length)];try{const b=await gxdCall("genSetup",sty,{side:"b",against:red}),v=await gxdCall("validateSetup",{red,black:b});
      if(v&&v.ok){const fen=await gxdCall("setupsToFen",red,b,"r");if(fen)return{black:b,fen,sty}}}catch(e){}}
  return null}
/* ---------- 開局 ---------- */
function gxdOmenGo(D){const j="gxd:"+D.date,b=gxdArgs(D.fen,gxdLx("std"),j),nm=String(D.title||"").replace(/^今日異象：/,"");try{store.set("park3d",true)}catch(e){}
  jStart(j,b,()=>{location.hash="#/journey/play";setTimeout(()=>toast("🌗 今日異象："+nm),600)},false)}
/* 11/16 開發者選單「開局前先看到」：按開戰＝先抽電腦這盤的陣（gxdFreePick）給玩家看，可以「換一種」重抽，按「確定開戰」才開局（gxdFreeStart） */
async function gxdFreePick(L,avoid){const v=await gxdCall("validateSetup",{side:"r",pieces:L});if(!v||!v.ok){toast((v&&v.errors&&v.errors[0])||"陣還沒擺好");return null}
  const O=await gxdOppSetup(L,null,avoid);if(!O)toast("電腦這次擺不出陣，再按一次");return O}
function gxdFreeStart(L,m,O,close){if(!O||!O.fen)return false;
  const F=gxdFreeGet();F.lay=Object.assign({},L);F.m=m;F.opp=O.black.name||"";store.set("gxdFree",F);
  const j=gxdFreeId(O.fen),b=gxdArgs(O.fen,gxdLx(m),j);if(close)close();try{store.set("park3d",true)}catch(e){}
  jStart(j,b,()=>{location.hash="#/journey/play";setTimeout(()=>toast("🀄 電腦擺了「"+(O.black.name||"一陣")+"」"),600)},false);return true}
/* 結果視窗的「再一盤」：同一個局面（st.start）、同一級（st.level 已是細分 1～18 級）；今日異象跨過午夜＝換今天的題 */
function gxdAgain(st){const k=gxdKind(st.journey);
  if(k==="omen"&&String(st.journey).slice(4)!==gxdDate()){toast("🌗 今天的異象換了");location.hash="#/guanxing";setTimeout(()=>gxdOmen(),400);return}
  if(!st.start){location.hash="#/guanxing";setTimeout(()=>k==="free"?gxdFree():gxdOmen(),400);return}
  jStart(st.journey,{human:"r",lx:st.level,journey:st.journey,lv:{fen:gxdFen(st.start),turn:"r"}},()=>{location.hash="#/journey/play"},true)}
/* ---------- 結算（同一盤只算一次）---------- */
function gxdSettle(st,forced){if(!gxdIs(st)||!st.id)return null;const D=store.get("gxdDone",null)||{};if(D.id===st.id)return D.r;
  const res=st.result;if(!res&&!forced)return null;const me=st.human||"r",k=gxdKind(st.journey),won=forced?forced==="win":!!(res&&res.w===me),lost=forced?forced==="lose":!!(res&&res.w&&res.w!==me);
  const r={k,won,lost,draw:!won&&!lost,rounds:Math.ceil((st.moves||[]).length/2)};
  if(k==="omen"){const date=String(st.journey).slice(4),S=store.get("gxdOmen",null);
    if(won){r.first=!gxdXpGot(date);try{if(typeof addXP==="function")addXP(GXD_XP,"今日異象","gxd:"+date)}catch(e){}}
    if(!(S&&S.d>date)){const R=gxdOmenRec(date);R.n++;if(won){R.w++;R.best=R.best?Math.min(R.best,r.rounds):r.rounds}store.set("gxdOmen",R)}}   /* 午夜前開、午夜後才下完的舊題：修為照給，成績不蓋掉今天的 */
  else{const F=gxdFreeGet();F.n=(F.n||0)+1;if(won)F.w=(F.w||0)+1;store.set("gxdFree",F)}
  store.set("gxdDone",{id:st.id,r});return r}
/* 08b 結果視窗（石桌往事分支叫） */
function gxdResultModal(st,win,draw0,XPR){const r=gxdSettle(st)||{won:win,k:gxdKind(st.journey)},k=r.k||gxdKind(st.journey),why=esc((st.result&&st.result.why)||""),home=["回觀星臺",()=>{location.hash="#/guanxing"},true];
  if(k==="omen"){const R=gxdOmenRec(String(st.journey).slice(4));
    modal(`<div class="em">${win?"✨":draw0?"🤝":"🌗"}</div><h2>${win?"異象已破":draw0?"和局":"異象未解"}</h2><p class="muted">${why}・🌗 今日異象（不計積分、不扣分）</p>`+
      `<p class="pl-say">✦ ${esc(win?GXD_TXT.win:GXD_TXT.lose)}</p>`+(r.first?`<p style="font-weight:900;margin:6px 0 0">🎁 今天第一次破解：另得 ${GXD_XP} 修為</p>`:"")+`<p class="muted" style="margin:6px 0 0">${esc(gxdRecTxt(R))}</p>`+(XPR||""),
      [[win?"再玩一次":"再挑戰一次",()=>gxdAgain(st)],home],"res");return}
  const F=gxdFreeGet();
  modal(`<div class="em">${win?"🏆":draw0?"🤝":"💪"}</div><h2>${win?"陣成而勝":draw0?"和局":"這一陣輸了"}</h2><p class="muted">${why}・🀄 自由擺陣・${esc(gxdModeName(F.m))}（不計積分、不扣分）</p>`+
    (F.opp?`<p style="margin:6px 0 0">電腦這盤擺的是「${esc(F.opp)}」。</p>`:"")+`<p class="muted" style="margin:6px 0 0">自由擺陣一共下了 ${F.n||0} 盤、贏 ${F.w||0} 盤</p>`+(XPR||""),
    [["同一陣再下",()=>gxdAgain(st)],["重新擺陣",()=>{location.hash="#/guanxing";setTimeout(()=>gxdFree(),400)}],home],"res")}
/* ---------- 3D：星空背景、點遠方的說明 ---------- */
function gxdParkEx(st){if(!gxdIs(st))return null;const k=gxdKind(st.journey),om=k==="omen",nm=om?"今日異象":"自由擺陣";
  return{bg:"data/park/blackhole_360.webp",ground:"data/gxground/"+GXD_GND[gxdHash(st.journey)%GXD_GND.length]+".webp",indoor:true,era:"classic",bgName:"🔭 觀星臺・"+nm,gxd:{k},oppHello:om?GXD_TXT.hiO:GXD_TXT.hiF,quietMate:true,watchers:[],crowd:null,
    gate:{img:["data/guanxing/gx_tai_w.webp"],icon:om?"🌗":"🀄",title:nm,sub:om?GXD_TXT.omen:GXD_TXT.free,bg:"#05060d",quiet:true}}}
function gxdParkInfo(k){let x=null;try{x=typeof PARK!=="undefined"&&PARK&&PARK.last&&PARK.last.ex&&PARK.last.ex.gxd||null}catch(e){}
  if(!x||!(k==="bg"||/^(pano|map):/.test(String(k))))return false;const om=x.k==="omen";
  sheet(om?"🌗 今日異象":"🀄 自由擺陣",b=>{b.innerHTML=`<div class="muted" style="margin:-4px 0 8px">觀星臺・天頂黑洞後面的星空</div><p style="line-height:1.8;margin:0;font-size:16px">${esc(om?"今天的異象所有人同一盤：陣容照圭表上的星象排好，隔天換一套。走法跟一般象棋一樣，將死對方就贏，可以一直重來。":"你親手擺的陣，電腦也照同樣的點數預算、按一種風格擺一陣。走法跟一般象棋一樣，將死對方就贏。")}</p>`});return true}
/* ---------- 畫面 ---------- */
function gxdCss(){if(document.getElementById("gxdCss"))return;const s=document.createElement("style");s.id="gxdCss";s.textContent=`
.gxd-ov{position:fixed;inset:0;z-index:9500;background:radial-gradient(ellipse at 50% 0,#1b1838,#05060d 70%) #05060d;color:#f1e7cf;display:flex;flex-direction:column;overflow:auto;-webkit-overflow-scrolling:touch}
.gxd-top{display:flex;align-items:center;gap:8px;padding:max(10px,env(safe-area-inset-top)) 12px 6px}.gxd-top b{flex:1;font:900 18px/1.3 var(--serif,serif);color:#ffe08a}
.gxd-x{border:1.5px solid #6b5a33;background:rgba(20,16,12,.6);color:#f1e7cf;border-radius:999px;padding:0;min-width:44px;min-height:44px;display:inline-flex;align-items:center;justify-content:center;font:800 20px/1 inherit}
.gxd-say{margin:0 14px 8px;font:700 14px/1.5 var(--serif,serif);color:#d9cfb6}
.gxd-bd{display:grid;grid-template-columns:repeat(9,1fr);width:min(calc(100vw - 32px),430px);margin:0 auto;box-sizing:border-box;background:#d9c08a;border:2px solid #6b5a33;border-radius:8px;padding:3px}
.gxd-c{position:relative;aspect-ratio:1;border:0;padding:0;margin:0;color:inherit;font:inherit;background:linear-gradient(#7a6338,#7a6338) center/1.2px 100% no-repeat,linear-gradient(#7a6338,#7a6338) center/100% 1.2px no-repeat}
button.gxd-c{cursor:pointer;-webkit-tap-highlight-color:transparent}
.gxd-c.ok::after{content:"";position:absolute;left:50%;top:50%;width:28%;height:28%;transform:translate(-50%,-50%);border-radius:50%;background:rgba(40,150,90,.6)}
.gxd-p{position:absolute;inset:6%;border-radius:50%;display:flex;align-items:center;justify-content:center;font:900 clamp(14px,4.8vw,22px)/1 var(--serif,serif);background:#f6e7c4;border:2px solid currentColor;box-shadow:0 1px 2px rgba(0,0,0,.45)}
.gxd-p.r{color:#b3261e}.gxd-p.b{color:#1f2b46}
.gxd-rv{grid-column:1/-1;text-align:center;font:800 12px/1.8 var(--serif,serif);color:#6b5a33;letter-spacing:.4em}
.gxd-card{margin:10px 12px max(14px,env(safe-area-inset-bottom));padding:12px 14px;border-radius:14px;background:rgba(30,26,40,.92);border:1.5px solid #4b3f6b}
.gxd-card h3{margin:0 0 4px;font:900 18px/1.3 var(--serif,serif);color:#ffe08a}.gxd-card p{margin:4px 0;font-size:14.5px;line-height:1.6}
.gxd-mut{color:#a99f88!important;font-size:13px!important}.gxd-sum{font:800 15px/1.5 var(--serif,serif)!important;color:#ffe08a}
.gxd-btns{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.gxd-btns button{flex:1 1 28%;min-width:84px;min-height:44px;padding:9px 0;border-radius:11px;font:900 16px/1.1 var(--serif,serif);border:1.5px solid #b58cff;background:#7a2bb5;color:#fff}
.gxd-btns button[disabled]{opacity:.45}.gxd-btns button.alt{background:transparent;color:#f1e7cf;border-color:#6b5a33}.gxd-btns small{display:block;font-size:11px;opacity:.8;font-weight:700}
.gxd-pal{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}.gxd-pal button{min-width:44px;min-height:44px;padding:4px 8px;border-radius:10px;border:1.5px solid #6b5a33;background:rgba(20,16,12,.6);color:#f1e7cf;font:800 16px/1.15 var(--serif,serif)}
.gxd-pal button small{display:block;font-size:11px;opacity:.8}.gxd-pal button.on{border-color:#ffe08a;box-shadow:0 0 0 2px rgba(255,224,138,.6);color:#ffe08a}
.gxd-chips{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 6px}.gxd-chips button{min-height:36px;padding:4px 11px;border-radius:999px;border:1.5px solid #4b3f6b;background:transparent;color:#d9cfb6;font:700 13.5px/1 var(--serif,serif)}
.gxd-err{color:#ffb4a8;font-size:13px;line-height:1.55;margin:4px 0;padding-left:1.2em}`;document.head.append(s)}
/* 棋盤：full＝十排（今日陣容預覽）；half＝紅方半場五排（擺陣）；edit＝每格是按鈕；ok＝標綠點的格 */
function gxdBoard(red,black,o){o=o||{};const R=gxdPcs(red),B=gxdPcs(black),ranks=o.half?[4,3,2,1,0]:[9,8,7,6,5,4,3,2,1,0],rv=`<div class="gxd-rv" aria-hidden="true">楚河　漢界</div>`;let h=o.half?rv:"";
  for(const k of ranks){if(!o.half&&k===4)h+=rv;
    for(let f=0;f<9;f++){const sq="abcdefghi"[f]+k,t=R[sq],u=B[sq],sd=t?"r":u?"b":"",nm=sd?GXD_NM[sd][t||u]:"",ok=o.ok&&!t&&o.ok.includes(sq)?" ok":"",inner=sd?`<span class="gxd-p ${sd}">${nm}</span>`:"";
      h+=o.edit?`<button type="button" class="gxd-c${ok}" data-sq="${sq}" aria-label="${sq}${nm?"，"+nm:"，空"}">${inner}</button>`:`<div class="gxd-c">${inner}</div>`}}
  return`<div class="gxd-bd"${o.edit?"":` role="img" aria-label="${esc(o.label||"陣容")}"`}>${h}</div>`}
/* 全螢幕外框（照幻譜星門的星空樣式）：右上 ✕、換頁就收掉、收掉時一起關 worker */
function gxdOv(title,label){gxdCss();vibrate(8);const old=document.querySelector(".gxd-ov");if(old&&old._close)old._close();
  const ov=document.createElement("div");ov.className="gxd-ov";ov.setAttribute("role","dialog");ov.setAttribute("aria-label",label);
  ov.innerHTML=`<div class="gxd-top"><b>${esc(title)}</b><button class="gxd-x" type="button" aria-label="${esc("離開"+label)}">✕</button></div><div class="gxd-body"></div>`;
  const h0=location.hash,onH=()=>{if(location.hash!==h0)close()},close=()=>{removeEventListener("hashchange",onH);ov.remove();gxdWorkerEnd()};
  ov._close=close;addEventListener("hashchange",onH);ov.querySelector(".gxd-x").onclick=()=>{vibrate(5);close()};document.body.append(ov);return{ov,body:ov.querySelector(".gxd-body"),close}}
/* 今日異象：當天陣容卡（陣名、紅黑各是什麼、今天的成績）＋「開始」 */
async function gxdOmen(){const date=gxdDate(),{ov,body,close}=gxdOv("🌗 今日異象","今日異象");
  body.innerHTML=`<p class="gxd-say">✦ ${esc(GXD_TXT.omen)}</p><p class="gxd-say">星象推演中…</p>`;
  let D=null;try{D=await gxdDaily(date)}catch(e){}if(!ov.isConnected)return;
  if(!D||!D.fen){body.innerHTML=`<p class="gxd-say">✦ 今天的星象還看不清楚，稍後再來。</p>`;return}
  const R=gxdOmenRec(date),nm=String(D.title||"").replace(/^今日異象：/,"");
  body.innerHTML=`<p class="gxd-say">✦ ${esc(GXD_TXT.omen)}</p>`+gxdBoard(D.red,D.black,{label:"今日陣容："+nm})+
    `<div class="gxd-card"><h3>${esc(nm)}</h3><p>你執紅・${esc(D.red.name||"")}：${esc(gxdCompTxt(D.red,"r"))}</p><p>電腦執黑・${esc(D.black.name||"")}：${esc(gxdCompTxt(D.black,"b"))}</p>`+
    `<p class="gxd-mut">${esc(gxdRecTxt(R))}</p><p class="gxd-mut">${gxdXpGot(date)?"今天的破解獎勵拿過了，可以繼續練":`今天第一次贏，另得 ${GXD_XP} 修為`}・不計積分、不扣分・明天換一套</p>`+
    `<div class="gxd-btns"><button type="button" class="gxd-go">開始</button></div></div>`;
  body.querySelector(".gxd-go").onclick=()=>{vibrate(5);close();gxdOmenGo(D)}}
/* 自由擺陣：紅方半場點選擺子、點數預算、照風格一鍵擺、三檔難度 */
function gxdFree(){const{ov,body,close}=gxdOv("🀄 自由擺陣","自由擺陣"),F0=gxdFreeGet();
  let L=Object.assign({},F0.lay&&typeof F0.lay==="object"&&Object.keys(F0.lay).length?F0.lay:GXD_STD),tool="P",seq=0,V=null,busy=false;
  body.innerHTML=`<div class="gxd-ed"><p class="gxd-say">✦ ${esc(GXD_TXT.free)}</p><div class="gxd-bw"></div><div class="gxd-card"><p class="gxd-sum" aria-live="polite"></p>`+
    `<div class="gxd-pal" role="group" aria-label="選一種棋子，再點棋盤">${["K","A","B","N","R","C","P"].map(t=>`<button type="button" data-t="${t}" aria-label="${GXD_NM.r[t]}${t==="K"?"，搬動":"，"+GXD_COST[t]+" 分"}">${GXD_NM.r[t]}<small>${t==="K"?"搬動":GXD_COST[t]+" 分"}</small></button>`).join("")}<button type="button" data-t="x" aria-label="拿掉">✕<small>拿掉</small></button></div>`+
    `<ul class="gxd-err"></ul><p class="gxd-mut">一鍵照風格擺（擺完還能自己改）：</p><div class="gxd-chips">${GXD_STY.map(([k,n])=>`<button type="button" data-s="${k}">${esc(n)}</button>`).join("")}<button type="button" data-s="clear">清空</button></div>`+
    `<p class="gxd-mut">16 子、一定有帥；仕、相只能放綠點。電腦用同樣的點數預算，每盤抽一種風格擺陣。不計積分、不扣分。</p>`+
    `<div class="gxd-btns">${gxdModes().map(([k,l,d])=>`<button type="button" data-m="${k}" aria-label="${esc(l)}：電腦${d?(d>0?"強":"弱")+Math.abs(d)+"級":"跟你差不多"}">${esc(l)}<small>${d?(d>0?"電腦強 ":"電腦弱 ")+Math.abs(d)+" 級":"跟你差不多"}</small></button>`).join("")}</div></div></div><div class="gxd-pv" hidden></div>`;   /* gxd-ed＝擺陣；gxd-pv＝開局前先看電腦這盤的陣（11/16 開發者選單） */
  const bw=body.querySelector(".gxd-bw"),sum=body.querySelector(".gxd-sum"),err=body.querySelector(".gxd-err"),mb=[...body.querySelectorAll("[data-m]")];
  const save=()=>{const F=gxdFreeGet();F.lay=Object.assign({},L);store.set("gxdFree",F)};
  const drawB=()=>{bw.innerHTML=gxdBoard({pieces:L},null,{half:true,edit:true,ok:GXD_OK[tool]});body.querySelectorAll("[data-t]").forEach(b=>{b.classList.toggle("on",b.dataset.t===tool);b.setAttribute("aria-pressed",b.dataset.t===tool?"true":"false")})};
  const check=()=>{const my=++seq,n=Object.keys(L).length;V=null;mb.forEach(b=>b.disabled=true);sum.textContent=`已擺 ${n}／16 子・點數計算中…`;
    gxdCall("validateSetup",{side:"r",pieces:L}).then(v=>{if(my!==seq||!ov.isConnected)return;V=v;
      sum.textContent=`已擺 ${n}／16 子・用了 ${v.cost&&v.cost.r!=null?v.cost.r:"?"} 分（預算 ${v.budget} 分）${v.ok?"・可以開戰":""}`;
      err.innerHTML=(v.errors||[]).slice(0,4).map(e=>`<li>${esc(e)}</li>`).join("");mb.forEach(b=>b.disabled=!v.ok||busy)}).catch(()=>{if(my!==seq||!ov.isConnected)return;sum.textContent="規則引擎載入失敗，稍後再試"})};
  bw.onclick=e=>{const c=e.target.closest("[data-sq]");if(!c)return;const r=gxdTap(L,c.dataset.sq,tool);if(r.msg){toast(r.msg);return}vibrate(5);L=r.L;save();drawB();check()};
  body.querySelectorAll("[data-t]").forEach(b=>b.onclick=()=>{vibrate(5);tool=b.dataset.t;drawB()});
  body.querySelectorAll("[data-s]").forEach(b=>b.onclick=()=>{vibrate(5);const s=b.dataset.s;if(s==="clear"){L={e0:"K"};save();drawB();check();return}
    gxdCall("genSetup",s,{side:"r"}).then(x=>{if(!ov.isConnected)return;L=Object.assign({},gxdPcs(x));save();drawB();check();toast("照「"+(x.name||"")+"」擺好了，可以再自己改")}).catch(()=>toast("這種風格這次擺不出來，換一種試試"))});
  mb.forEach(b=>b.onclick=async()=>{if(b.disabled||busy)return;if(!V||!V.ok){toast((V&&V.errors&&V.errors[0])||"陣還沒擺好");return}vibrate(5);busy=true;mb.forEach(x=>x.disabled=true);sum.textContent="電腦擺陣中…";
    let O=null;try{O=await gxdFreePick(L)}catch(e){toast("規則引擎載入失敗，稍後再試")}busy=false;if(!ov.isConnected)return;if(O)showPv(b.dataset.m,O);else check()});
  /* 開局前先看到：陣名、紅黑各有什麼子、整盤預覽；「換一種」一定換一種風格重抽，「回去改陣」回擺陣畫面，「確定開戰」才 jStart */
  const ed=body.querySelector(".gxd-ed"),pv=body.querySelector(".gxd-pv");
  const showPv=(m,O)=>{ed.hidden=true;pv.hidden=false;const nm=O.black.name||"一陣";
    pv.innerHTML=`<p class="gxd-say">✦ 電腦照星象回了一陣，先看清楚再開戰。</p>`+gxdBoard({pieces:L},O.black,{label:"這一盤：你的陣對電腦的"+nm})+
      `<div class="gxd-card"><h3>電腦擺「${esc(nm)}」</h3><p>你執紅：${esc(gxdCompTxt({pieces:L},"r"))}</p><p>電腦執黑・${esc(nm)}：${esc(gxdCompTxt(O.black,"b"))}</p><p class="gxd-mut">難度：${esc(gxdModeName(m))}・不計積分、不扣分</p>`+
      `<div class="gxd-btns"><button type="button" data-pv="go">確定開戰</button><button type="button" class="alt" data-pv="re">換一種</button><button type="button" class="alt" data-pv="bk">回去改陣</button></div></div>`;
    try{ov.scrollTop=0}catch(e){}const pb=[...pv.querySelectorAll("[data-pv]")];
    pv.querySelector('[data-pv="go"]').onclick=()=>{if(busy)return;vibrate(5);gxdFreeStart(L,m,O,close)};
    pv.querySelector('[data-pv="bk"]').onclick=()=>{if(busy)return;vibrate(5);pv.hidden=true;pv.innerHTML="";ed.hidden=false;check()};
    pv.querySelector('[data-pv="re"]').onclick=async()=>{if(busy)return;vibrate(5);busy=true;pb.forEach(x=>x.disabled=true);let O2=null;try{O2=await gxdFreePick(L,O.sty)}catch(e){toast("規則引擎載入失敗，稍後再試")}
      busy=false;if(!ov.isConnected)return;if(O2)showPv(m,O2);else pb.forEach(x=>x.disabled=false)}};
  drawB();check()}
/* ---------- 接到既有流程 ---------- */
if(typeof journeyGameEnd==="function"){const f0=journeyGameEnd;journeyGameEnd=function(st){const r=f0.apply(this,arguments);try{if(st&&st.result&&gxdIs(st))gxdSettle(st)}catch(e){}return r}}   /* 07-legend：一般修為照給，這裡記成績、今日異象第一次贏另給 */
if(typeof jName==="function"){const f1=jName;jName=function(j){const k=gxdKind(j);if(k)return k==="omen"?"觀星臺・今日異象":"觀星臺・自由擺陣";return f1.apply(this,arguments)}}
if(typeof gxParkEx==="function"){const f2=gxParkEx;gxParkEx=function(st){const r=f2.apply(this,arguments);if(r)return r;try{return gxdParkEx(st)}catch(e){return null}}}
if(typeof gxParkInfo==="function"){const f3=gxParkInfo;gxParkInfo=function(k){try{if(gxdParkInfo(k))return true}catch(e){}return f3.apply(this,arguments)}}
