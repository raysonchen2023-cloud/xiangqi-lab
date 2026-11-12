/* ================= 🤝 合作殘譜（開發者 11/9 選：Gemini 56 號回覆 B 的方案 2「千秋雙打殘譜」、方案 5「大廳暗語傳譜」；設計 story/合作殘譜_同桌與大廳_設計_1109.md） =================
   一、同桌雙打殘譜（COOP_DESK_ON）：同一支手機，紅方一個人、黑方一個人輪流走，兩人合作達成目標（指定棋子到指定格、某種棋子清光、和棋），不是對打；
     有「一人分飾兩角」。題目 COOP_DESK（7 題，每位旅伴一題），tools/coop_verify.js 用正式規則窮舉驗證走得到、最少步數對。
     網址 #/coop（清單）、#/coop/w/<七星代號>（某位旅伴撿到的半張棋譜）、#/coop/d/<題號>（對局）；入口：coopDeskOpen(who)（渡口、旅伴那邊由另一位助手接）、同桌對弈頁動作列「🤝 合作」。
     成績 m_coopDesk {題號:{s:星數,n:最少用幾步,at}}；模式 m_coopMode（"two"／"solo"）。
   二、大廳暗語傳譜（COOP_LOBBY_ON，預設 false；false 時只有測試房 xq_netRoot 能進）：「🧩 殘篇閣」#/coop/lobby，看譜人（A）看得到正解不能動子、只能用暗語 COOP_PHR，
     下棋人（B）能動子不知道正解，3 步內絕殺；真人不夠時小帥 AI 當看譜人；中途離開不罰。網路走 src/net.js 新加的 qSub／qPub（只准 ROOT/q/…）。
     協定核心 coopLobbyCore(io) 不碰畫面，tools/coop_lobby_sim.js 在記憶體裡跑兩個假客戶端（不連真的 MQTT）。
   規則（coopRules）、題目資料、協定核心夾在 COOP-DATA／COOP-CORE 標記中間，給驗證、模擬腳本抽出來跑；改的時候標記要留著。前綴 cpd（同桌）、cpl（大廳） */
const COOP_DESK_ON=true;
const COOP_LOBBY_ON=true;   /* 開發者 11/10 測試房試過：「可以開」 */
/* 殘篇閣開門時段：每天 8:00～21:59、每小時 0～29 分；測試房一律開門 */
const COOP_LOBBY_OPEN={h0:8,h1:21,m0:0,m1:29};
/*COOP-DATA-BEGIN*/
const COOP_WHO={x_martialgirl:{nk:"花兒",pz:"hua"},x_spiritgirl:{nk:"燕子",pz:"yan"},x_bing:{nk:"溪兒",pz:"xi"},x_miaogirl:{nk:"小梅",pz:"mei"},x_swordboy:{nk:"阿轍",pz:"zhe"},x_shi:{nk:"城子",pz:"cheng"},x_shuai:{nk:"庭哥",pz:"ting"}};
/* 同桌題目。fen 只有盤面（紅先）；goal：at＝[棋子,格]都要站到、none＝這些棋子要全部不見、draw＝雙方都沒有車馬炮兵；min＝最少步數（紅黑各算一步）、max＝步數上限；
   sol＝示範解（ICCS，紅黑交替）；gt＝目標的白話；say：intro 開場、win 完成、tip 學到什麼 */
const COOP_DESK=[
  {id:"hua",who:"x_martialgirl",t:"借個炮架",fen:"3k5/9/6c2/4p4/2n6/9/6P2/4C2N1/9/4K4",goal:{at:[["C","e6"],["c","g3"]],none:["p","P"]},min:4,max:8,sol:"h2g4 c5e4 e2e6 g7g3",
    gt:"紅炮打掉黑卒、黑砲打掉紅兵，兩門炮都站上發亮的框",say:{intro:"我在碼頭撿到半張棋譜，上面寫著：「要兩個人從兩邊一起走。」炮要隔一個才打得到——你幫我架，我幫你架！",win:"隔一個，剛剛好！兩門炮都打中了！",tip:"炮吃子要隔一個「炮架」，自己的子、對方的子都可以當架"}},
  {id:"yan",who:"x_spiritgirl",t:"象眼讓一讓",fen:"3k5/5P3/4b4/9/9/9/3p5/4B4/9/4K4",goal:{at:[["B","c4"],["b","g9"]]},min:4,max:8,sol:"f8f9 d3d2 e2c4 e7g9",
    gt:"紅相、黑象都走到發亮的框",say:{intro:"相走田字，田字中間（象眼）被塞住就過不去。你們幫對方把象眼讓開吧！",win:"象眼通了，大家都到家了。",tip:"塞象眼：田字正中間有子，相（象）就不能走"}},
  {id:"xi",who:"x_bing",t:"兵卒讓路過河",fen:"4k4/9/9/9/9/4p4/4P4/9/9/4K4",goal:{at:[["P","e5"],["p","e3"]]},min:6,max:10,sol:"e0e1 e4d4 e3e4 d4d3 e4e5 d3e3",
    gt:"紅兵、黑卒交換著過河，站到發亮的框（不能吃掉對方喔）",say:{intro:"兩個兵卒頭碰頭，誰也過不去……沒過河的兵只能往前走喔！",win:"讓一步，兩邊都過河了！",tip:"兵卒過了河才能橫著走；有時候要先等一手"}},
  {id:"mei",who:"x_miaogirl",t:"雙馬換位",fen:"3k5/9/9/9/2n6/6N2/9/9/9/5K3",goal:{at:[["N","c5"],["n","g4"]]},min:6,max:10,sol:"g4f6 c5d7 f6e4 d7e5 e4c5 e5g4",
    gt:"紅傌、黑馬交換位置",say:{intro:"紅馬和黑馬要交換位置。馬走日，小心別絆到馬腿！",win:"馬走日，換好位置了！",tip:"馬走「日」字，往哪邊跳，那邊緊挨著的一格不能有子（馬腿）"}},
  {id:"zhe",who:"x_swordboy",t:"放下兵器",fen:"4k4/4a4/9/r8/9/R8/9/9/4c4/3AK4",goal:{draw:true},min:5,max:9,sol:"a4a2 a6a2 d0e1 a2d2 e1d2",
    gt:"雙方的車、炮都下場，只剩帥仕將士＝和棋",say:{intro:"直路要走，也要知道什麼時候停。讓雙方的車和砲都下場，下成和棋吧。",win:"大家放下兵器，和棋！",tip:"雙方都沒有車馬炮兵，誰也殺不了誰，就是和棋；帥將不能面對面，吃子要看時機"}},
  {id:"cheng",who:"x_shi",t:"九宮歸位",fen:"5k3/4a4/3a5/9/4P4/9/9/5A3/4A4/3K5",goal:{at:[["K","e0"],["A","d0"],["A","f0"],["k","e9"],["a","d9"],["a","f9"]]},min:8,max:12,sol:"e1f0 f9e9 f2e1 e8f9 d0e0 d7e8 e1d0 e8d9",
    gt:"帥仕、將士都回到開局的位置（發亮的框）",say:{intro:"九宮亂成一團！帥和仕要回原位，將和士也是。仕只能斜著走喔。",win:"九宮整整齊齊，回到原位了！",tip:"仕（士）只在九宮裡斜著走；先讓出位子，別人才進得去"}},
  {id:"ting",who:"x_shuai",t:"將帥不照面",fen:"5k3/9/9/9/2p6/9/9/9/9/3K5",goal:{at:[["K","e0"],["k","e9"]]},min:9,max:13,sol:"d0d1 f9e9 d1d0 c5c4 d0d1 c4d4 d1d0 d4e4 d0e0",
    gt:"帥、將都坐回正中間（發亮的框）",say:{intro:"帥要回到正中間，將也是——可是將帥不能面對面！要有人擋在中間才行。",win:"中間有人擋著，將帥都坐回中路了！",tip:"將帥在同一條直線上、中間沒有子，叫「照面」，不能這樣走"}}];
/* 殘篇閣的三步殺（紅先、3 步內將死；第一步唯一、2 步內殺不了，tools/coop_verify.js 驗過）。src＝quiz.json 的題號 */
const COOP_LOBBY_PZ=[
  {id:"L1",src:"mg44f78e8d",fen:"3ak2P1/4a1C1C/b8/9/9/9/9/3A5/9/3K2B2",sol:"d0e0 e9f9 h9g9 f9e9 i8i9"},
  {id:"L2",src:"mg5f393c82",fen:"r3k1P2/4a4/1n3a3/4N4/9/9/9/4C4/4p4/2BK5",sol:"g9f9 e9f9 e6g7 f9f8 e2f2"},
  {id:"L3",src:"mg74fd33b3",fen:"2bnka3/4a4/4b4/9/9/2C4p1/8C/8p/9/3AKA3",sol:"c4e4 h4i4 i3g3 d9c7 g3g9"},
  {id:"L4",src:"mgf88a6c8e",fen:"5k2C/4aN3/c3ba3/9/4C4/9/9/9/3pp2p1/5K3",sol:"f8h9 e7g9 h9g7 f9f8 e5f5"},
  {id:"L5",src:"mgfe10ec64",fen:"1P1aka3/9/C7b/9/8R/1c7/9/8p/1p7/5K3",sol:"i5e5 f9e8 a7c7 i2i1 c7c9"},
  {id:"L6",src:"mg614b87ba",fen:"4ka3/3Pa1c2/9/6C2/9/9/9/9/4K4/9",sol:"g6g7 g8g9 g7g8 g9h9 g8g9"},
  {id:"L7",src:"mg17b1f9e6",fen:"3ak4/4aP3/9/9/9/9/4p4/9/4K4/5C3",sol:"f0e0 e3d3 e0a0 d3c3 a0a9"},
  {id:"L8",src:"mg460bf0ba",fen:"2C1ka3/3Pa4/1c7/9/9/9/9/9/4K4/9",sol:"c9c7 b7b8 c7g7 b8c8 g7g9"}];
/* 殘篇閣專用暗語：網路上只送代號，收到清單外的代號一律丟掉 */
const COOP_PHR=[["idk","🤷","我不知道"],["you","👉","換你試試"],["think","🤔","再想一步"],["ok","👍","對了！"],["no","🙅","不對喔"],["near","😮","差一點！"],
  ["pR","🚗","看那輛車"],["pN","🐴","看那隻馬"],["pC","💥","看那門炮"],["pP","🪖","看那個兵"],["pK","👑","看看帥"],["left","⬅","左邊那個"],["right","➡","右邊那個"],
  ["fwd","⬆","往前衝"],["back","⬇","往後退"],["side","↔","橫著走"],["check","⚡","先將軍！"],["take","🍽","吃掉它"],["quiet","🤫","不用吃子"],["wait","⏳","等我一下"],["go","💪","加油"],["yay","🎉","我們做到了"]];
/*COOP-DATA-END*/
/*COOP-CORE-BEGIN*/
/* 規則小工具（同桌、殘篇閣、驗證腳本共用）。C＝XQCore */
function coopRules(C){
  const sqOf=s=>C.parseSq(s),mv=s=>String(s||"").split(" ").filter(Boolean).map(x=>[sqOf(x.slice(0,2)),sqOf(x.slice(2,4))]);
  const replay=(fen,ms)=>{let b=C.parseFen(fen);for(const[f,t]of ms)b=C.make(b,f,t);return b};
  const has=(L,f,t)=>L.some(m=>m[0]===f&&m[1]===t);
  const same=(a,b)=>!!a&&!!b&&a[0]===b[0]&&a[1]===b[1];
  const solOf=pz=>pz._m||(pz._m=mv(pz.sol));
  const onPath=(pz,ms)=>{const s=solOf(pz);return ms.every((m,i)=>same(m,s[i]))};
  /* 同桌：目標 */
  const goalOk=(b,g)=>{if(g.none&&g.none.some(p=>b.includes(p)))return false;if(g.at&&!g.at.every(([p,s])=>b[sqOf(s)]===p))return false;
    if(g.draw&&(C.hasAttackers(b,"r")||C.hasAttackers(b,"b")))return false;return true};
  /* 同桌：目標還有沒有可能（需要的棋子被吃光了就沒希望） */
  const goalAlive=(b,g)=>{if(!g.at)return true;const need={};for(const[p]of g.at)need[p]=(need[p]||0)+1;for(const p in need)if(b.filter(x=>x===p).length<need[p])return false;return true};
  /* 同桌：從這個局面找達成目標的最短走法（合作搜尋，limit＝最多看幾個局面）；回第一步或 null */
  function deskSearch(b0,s0,g,plies,limit){const key=(b,s)=>b.map(x=>x||".").join("")+s;let front=[{b:b0,s:s0,first:null}],n=0;const seen=new Set([key(b0,s0)]);
    for(let d=1;d<=plies;d++){const nx=[];for(const x of front){for(const[f,t]of C.legal(x.b,x.s)){const b=C.make(x.b,f,t),first=x.first||[f,t];if(goalOk(b,g))return first;
          if(++n>limit)return null;const s2=x.s==="r"?"b":"r",k=key(b,s2);if(seen.has(k))continue;seen.add(k);nx.push({b,s:s2,first})}}front=nx;if(!front.length)break}return null}
  /* 殘篇閣：黑方沒棋可走＝紅方殺到了 */
  const win=b=>C.legal(b,"b").length===0;
  const mate1=b=>C.legal(b,"r").filter(([f,t])=>win(C.make(b,f,t)));
  const forced1=b2=>C.legal(b2,"b").every(([f,t])=>mate1(C.make(b2,f,t)).length>0);
  /* 殘篇閣：下棋人走紅方第 k 步（moves＝目前全部棋步）。回 {ok,win,reply,why} */
  function judge(pz,ms,f,t){if(ms.length%2)return{ok:false,why:"turn"};const b=replay(pz.fen,ms);if(!has(C.legal(b,"r"),f,t))return{ok:false,why:"illegal"};
    const k=ms.length/2+1,sol=solOf(pz),b2=C.make(b,f,t);if(win(b2))return{ok:true,win:true};
    const isSol=onPath(pz,ms)&&same(sol[ms.length],[f,t]);
    if(k>=3||!(isSol||(k===2&&forced1(b2))))return{ok:false,why:"wrong"};
    let reply=isSol&&sol[ms.length+1]?sol[ms.length+1]:null;
    if(!reply){const rs=C.legal(b2,"b");reply=rs.find(([g,h])=>!mate1(C.make(b2,g,h)).length)||rs[0]}
    return{ok:true,win:false,reply}}
  /* 殘篇閣：現在這一步的正解（看譜人看的箭頭、小帥的提示） */
  function next(pz,ms){if(ms.length%2)return null;const sol=solOf(pz);if(onPath(pz,ms)&&sol[ms.length])return sol[ms.length];
    const b=replay(pz.fen,ms),m=mate1(b);if(m.length)return m[0];
    if(ms.length===2){for(const x of C.legal(b,"r"))if(forced1(C.make(b,x[0],x[1])))return x}return null}
  /* 殘篇閣：檢查別人送來的棋步是不是都合法（紅黑交替） */
  function okMoves(pz,ms){if(!Array.isArray(ms)||ms.length>12)return false;let b=C.parseFen(pz.fen),s="r";
    for(const m of ms){if(!Array.isArray(m)||m.length!==2||!has(C.legal(b,s),m[0],m[1]))return false;b=C.make(b,m[0],m[1]);s=s==="r"?"b":"r"}return true}
  return{sqOf,mv,replay,has,same,solOf,onPath,goalOk,goalAlive,deskSearch,win,mate1,forced1,judge,next,okMoves}}

/* 殘篇閣協定核心。io＝{C,pz,phr,me()->{id,name},pub(rel,str,retain)->bool,sub(rel,fn(rel,msg,retain))->取消函式,up()->bool,now(),setT(fn,ms),clrT(h),blocked(id),store:{get(k,d),set(k,v)},emit(ev,d),rnd()}
   主題（rel，前面由 net.js 補 ROOT/）：q/h 等人與邀請（不保留）；q/r/<rid>/s 這局狀態（保留，下棋人 B 寫）；q/r/<rid>/e 暗語、心跳、離開（不保留）。
   階段 ph：idle → waiting → inviting → playing → done（詳見設計文件 2-5） */
function coopLobbyCore(io){
  const C=io.C,R=coopRules(C),PZ=io.pz,PH=new Set(io.phr.map(x=>x[0])),V=1;
  const T={wait:8000,fresh:20000,inv:8000,state:12000,hb:10000,lost:25000,gone:90000,lonely:25000,clean:20000,resume:10*60000,revTries:8,revMs:4*60000,nope:45000};
  const AI={id:"ai",name:"小帥",ai:true};
  const S={ph:"idle",pref:"any",role:null,rid:null,pz:null,st:null,msgs:[],W:{},nope:{},inv:null,heard:0,lost:false,gone:false,waitAt:0,lonely:false,ai:null,dirty:false,sayN:0,local:false,waitSt:0};
  let hallUn=null,roomUn=null,tm=null,lastWait=0,lastHb=0,dead=false,cleanT=null;
  const now=()=>io.now(),me=()=>{const m=io.me();return{id:String(m.id),name:String(m.name||"").slice(0,16)}};
  const emit=(e,d)=>{try{io.emit&&io.emit(e,d)}catch(x){}};
  const J=o=>JSON.stringify(Object.assign({v:V},o,{at:now()}));
  const pzOf=id=>PZ.find(p=>p.id===id)||null;
  const compat=(a,b)=>!(a===b&&a!=="any");
  const roomRel=()=>"q/r/"+S.rid;
  const partner=()=>S.st?(S.role==="A"?S.st.B:S.st.A):null;
  function rolesFor(i,ip,o,op){if(ip==="A"||op==="B")return{A:i,B:o};if(ip==="B"||op==="A")return{A:o,B:i};return i<o?{A:o,B:i}:{A:i,B:o}}
  function pickPz(){const seen=io.store.get("cplSeen",[])||[],left=PZ.filter(p=>!seen.includes(p.id)),L=left.length?left:PZ,p=L[Math.floor(Math.random()*L.length)];
    io.store.set("cplSeen",(left.length?seen:[]).concat([p.id]).slice(-PZ.length+1));return p.id}
  const rid=()=>(io.rnd?io.rnd():Math.random().toString(36).slice(2,10))+now().toString(36);
  /* ---------- 等人、配對 ---------- */
  function hallOn(){if(!hallUn)hallUn=io.sub("q/h",onHall)}
  function hallOff(){if(hallUn){hallUn();hallUn=null}}
  function sendWait(){lastWait=now();io.pub("q/h",J({t:"wait",id:me().id,name:me().name,pref:S.pref}),false)}
  function wait(pref){if(dead)return;S.pref=["A","B","any"].includes(pref)?pref:"any";roomOff();S.ph="waiting";S.role=null;S.st=null;S.inv=null;S.waitAt=now();S.lonely=false;S.W={};hallOn();sendWait();emit("phase")}
  function stop(){if(S.ph==="waiting"||S.ph==="inviting"){io.pub("q/h",J({t:"bye",id:me().id}),false);hallOff();S.inv=null;S.ph="idle";emit("phase")}}
  function tryMatch(){if(S.ph!=="waiting")return;const i=me().id,t=now();
    const c=Object.values(S.W).filter(w=>t-w.at<T.fresh&&w.id!==i&&!io.blocked(w.id)&&compat(S.pref,w.pref)&&!(t-(S.nope[w.id]||0)<T.nope)).sort((a,b)=>a.id<b.id?-1:1);
    if(!c.length||c[0].id<i)return;   /* 代號比我小的人來邀，免得兩邊同時互邀 */
    const o=c[0],r=rid(),pz=pickPz(),rl=rolesFor(i,S.pref,o.id,o.pref);
    S.inv={rid:r,pz,to:o.id,other:{id:o.id,name:o.name},myRole:rl.A===i?"A":"B",at:t};S.ph="inviting";
    io.pub("q/h",J({t:"inv",to:o.id,from:me(),rid:r,pz,role:rl}),false);emit("phase")}
  function onHall(rel,msg){if(dead||!msg)return;let x;try{x=JSON.parse(msg)}catch(e){return}if(!x||x.v!==V||typeof x.t!=="string")return;const i=me().id;
    if(x.t==="wait"){const id=String(x.id||"");if(id&&id!==i&&/^[\w-]{1,40}$/.test(id))S.W[id]={id,name:String(x.name||"").slice(0,16),pref:["A","B","any"].includes(x.pref)?x.pref:"any",at:now()};return}
    if(x.t==="bye"){delete S.W[String(x.id||"")];return}
    if(x.t==="ok"&&x.to!==i){delete S.W[String(x.to||"")];if(x.from)delete S.W[String(x.from.id||"")];return}   /* 別人配好了，從名單拿掉 */
    if(x.to!==i||!x.from||!x.from.id)return;const fid=String(x.from.id),fnm=String(x.from.name||"").slice(0,16);
    if(x.t==="inv"){const r=String(x.rid||""),rl=x.role||{};
      let myRole=rl.A===i&&rl.B===fid?"A":rl.B===i&&rl.A===fid?"B":null;
      const ok=S.ph==="waiting"&&!!myRole&&!io.blocked(fid)&&!!pzOf(x.pz)&&/^[\w-]{4,40}$/.test(r)&&(S.pref==="any"||S.pref===myRole);
      if(!ok){io.pub("q/h",J({t:"no",to:fid,from:me(),rid:r,why:!pzOf(x.pz)?"pz":io.blocked(fid)?"block":"busy"}),false);return}
      io.pub("q/h",J({t:"ok",to:fid,from:me(),rid:r}),false);
      const other={id:fid,name:fnm,ai:false},mine=Object.assign(me(),{ai:false});
      enterRoom(r,x.pz,myRole,myRole==="A"?{A:mine,B:other}:{A:other,B:mine});return}
    if(x.t==="ok"&&S.ph==="inviting"&&S.inv&&x.rid===S.inv.rid&&fid===S.inv.to){const I=S.inv,mine=Object.assign(me(),{ai:false}),other=Object.assign({},I.other,{ai:false});S.inv=null;
      enterRoom(I.rid,I.pz,I.myRole,I.myRole==="A"?{A:mine,B:other}:{A:other,B:mine});return}
    if(x.t==="no"&&S.inv&&x.rid===S.inv.rid&&fid===S.inv.to){S.nope[fid]=now();S.inv=null;S.ph="waiting";emit("phase");return}}
  /* ---------- 進房間、對局 ---------- */
  function roomOff(){if(roomUn){roomUn();roomUn=null}}
  function enterRoom(r,pz,role,ppl,local){hallOff();roomOff();S.ph="playing";S.role=role;S.rid=r;S.pz=pz;S.msgs=[];S.heard=now();S.lost=false;S.gone=false;S.ai=null;S.local=!!local;S.st=null;S.waitSt=now();S.dirty=false;
    if(!S.local){io.store.set("cplCur",{rid:r,role,pz,at:now()});roomUn=io.sub(roomRel()+"/+",onRoom)}
    if(role==="B"){S.st={v:V,rid:r,pz,rev:1,at:now(),A:ppl.A,B:ppl.B,moves:[],tries:0,last:null,start:now(),end:null};pubSt();if(S.st.A.ai)aiInit()}
    emit("phase");emit("state",{})}
  function pubSt(){if(S.local||!S.st)return;S.st.at=now();if(!io.pub(roomRel()+"/s",JSON.stringify(S.st),true))S.dirty=true;else S.dirty=false}
  function commit(){S.st.rev++;pubSt()}
  function validSt(x){const p=pzOf(x.pz);return!!(p&&x.rid===S.rid&&x.pz===S.pz&&x.A&&x.B&&typeof x.A.id==="string"&&typeof x.B.id==="string"&&isFinite(x.rev)&&R.okMoves(p,x.moves)&&isFinite(x.tries))}
  function onRoom(rel,msg){if(dead||!S.rid||rel.indexOf(roomRel()+"/")!==0)return;const kind=rel.slice(roomRel().length+1);
    if(kind==="s"){if(!msg)return;let x;try{x=JSON.parse(msg)}catch(e){return}if(!x||x.v!==V||!validSt(x))return;const i=me().id;
      if(x.A.id!==i&&x.B.id!==i)return;
      if(S.st&&x.rev<=S.st.rev)return;
      const prev=S.st;
      if(S.role==="B"){if(prev&&!(x.end&&!prev.end))return;   /* 我是寫入者：只收看譜人寫的「結束」，或斷線回來時拿回保留狀態 */
        S.st=x;S.heard=now();if(!prev&&x.A.ai&&!x.end)aiInit();emit("state",{prev});if(x.end)finish();return}
      S.st=x;S.heard=now();S.lost=false;
      if(S.role==="A"&&x.A.ai)S.role="W";   /* 小帥已經接手，只能在旁邊看 */
      emit("state",{prev});if(x.end)finish();return}
    if(kind==="e"){let x;try{x=JSON.parse(msg)}catch(e){return}const p=partner();if(!x||x.v!==V||!p||String(x.id||"")!==p.id)return;
      S.heard=now();S.lost=false;
      if(x.t==="say"&&PH.has(x.k))pushMsg(x.by==="A"?"A":"B",x.k,p.name);
      else if(x.t==="bye")partnerGone(true);
      else if(x.t==="rv"&&S.role==="B")reveal();
      return}}
  function pushMsg(by,k,name){S.msgs.push({by,k,name,at:now()});S.msgs=S.msgs.slice(-20);emit("say",{by,k,name})}
  function say(k){if(S.ph!=="playing"&&S.ph!=="done"||!PH.has(k)||S.role==="W")return false;pushMsg(S.role,k,me().name);
    if(!S.local&&!(S.st&&S.st.A.ai&&S.role==="B"))io.pub(roomRel()+"/e",J({t:"say",by:S.role,id:me().id,k,n:++S.sayN}),false);
    if(S.role==="B"&&S.st&&S.st.A.ai)aiEv("say",k);return true}
  function move(f,t){if(S.ph!=="playing"||S.role!=="B"||!S.st||S.st.end)return{ok:false,why:"no"};const p=pzOf(S.pz),r=R.judge(p,S.st.moves,f,t);
    if(r.why==="illegal"||r.why==="turn")return r;
    if(!r.ok){S.st.tries++;S.st.last={f,t,at:now()};commit();emit("state",{tried:true});aiEv("wrong");return r}
    S.st.moves.push([f,t]);S.st.last=null;if(r.win)S.st.end={w:"ok",by:null,at:now()};else S.st.moves.push(r.reply);
    commit();emit("state",{});aiEv(r.win?"win":"right");if(S.st.end)finish();return r}
  const canReveal=()=>!!(S.st&&!S.st.end&&(S.st.tries>=T.revTries||now()-S.st.start>=T.revMs));
  function reveal(){if(!S.st||S.st.end||!canReveal())return false;
    if(S.role==="A"){io.pub(roomRel()+"/e",J({t:"rv",by:"A",id:me().id}),false);return true}
    if(S.role!=="B")return false;const p=pzOf(S.pz);
    for(let k=0;k<4&&!S.st.end;k++){const m=R.next(p,S.st.moves);if(!m)break;const r=R.judge(p,S.st.moves,m[0],m[1]);if(!r.ok)break;S.st.moves.push(m);if(r.win)S.st.end={w:"reveal",by:null,at:now()};else S.st.moves.push(r.reply)}
    if(!S.st.end)S.st.end={w:"reveal",by:null,at:now()};S.st.last=null;commit();emit("state",{});finish();return true}
  function partnerGone(bye){if(S.gone||S.ph!=="playing"||!S.st||S.st.end)return;S.gone=true;
    if(S.role==="B"){emit("gone",{bye});return}
    /* 我是看譜人：下棋人不在了，這局收起來。他是自己按離開的，他會寫 end:quit；90 秒沒聲音才由我寫一次 end:gone */
    const n=JSON.parse(JSON.stringify(S.st));n.end={w:bye?"quit":"gone",by:"B",at:now()};n.rev=S.st.rev+1;S.st=n;if(!bye)pubSt();emit("state",{});finish()}
  function aiTakeOver(){if(S.role!=="B"||!S.st||S.st.end)return false;S.st.A=Object.assign({},AI);S.gone=false;S.lost=false;commit();aiInit();emit("state",{});return true}
  function aiStart(){if(dead)return;if(S.ph==="waiting"||S.ph==="inviting")io.pub("q/h",J({t:"bye",id:me().id}),false);hallOff();
    enterRoom(rid(),pickPz(),"B",{A:Object.assign({},AI),B:Object.assign(me(),{ai:false})},true)}
  function finish(){if(S.ph==="done")return;S.ph="done";if(!S.local){io.store.set("cplCur",null);
      if(S.role==="B"||(S.st&&S.st.end&&S.st.end.w==="gone")){const r=S.rid,L=io.store.get("cplClean",[])||[];if(!L.includes(r))io.store.set("cplClean",L.concat([r]).slice(-10));
        cleanT=io.setT(()=>cleanOne(r),T.clean)}}
    if(S.ai&&S.st&&S.st.end&&S.st.end.w==="ok")aiSay("yay",900);emit("phase")}
  function cleanOne(r){if(io.pub("q/r/"+r+"/s","",true)){const L=(io.store.get("cplClean",[])||[]).filter(x=>x!==r);io.store.set("cplClean",L)}}
  function quit(){if(S.ph==="playing"&&S.st&&!S.local){io.pub(roomRel()+"/e",J({t:"bye",by:S.role,id:me().id}),false);
      if(S.role==="B"&&!S.st.end){S.st.end={w:"quit",by:"B",at:now()};commit();const r=S.rid,L=io.store.get("cplClean",[])||[];io.store.set("cplClean",L.concat([r]).slice(-10));io.setT(()=>cleanOne(r),T.clean)}}
    if(S.ph==="playing"||S.ph==="done"){io.store.set("cplCur",null);roomOff();S.ai=null;S.ph="idle";S.st=null;S.rid=null;emit("phase")}}
  function leave(){if(S.ph==="waiting"||S.ph==="inviting")stop();else quit();dead=true;if(tm!=null)io.clrT(tm);tm=null;hallOff();roomOff()}
  function again(){const ai=S.st&&S.st.A&&S.st.A.ai;quit();if(ai)aiStart();else wait(S.pref)}
  /* 斷線回來：10 分鐘內離開的那一局，重新訂閱、拿保留狀態接著下 */
  function resume(){const c=io.store.get("cplCur",null);if(!c||!c.rid||now()-(+c.at||0)>T.resume||!pzOf(c.pz)||!["A","B"].includes(c.role)){io.store.set("cplCur",null);return false}
    S.ph="playing";S.role=c.role;S.rid=String(c.rid);S.pz=c.pz;S.st=null;S.msgs=[];S.heard=now();S.waitSt=now();S.local=false;S.gone=false;S.lost=false;roomUn=io.sub(roomRel()+"/+",onRoom);emit("phase");return true}
  /* ---------- 小帥 AI 當看譜人（在下棋人的手機上跑，不發網路訊息） ---------- */
  function aiInit(){S.ai={lvl:0,next:now()+6000,q:[]}}
  function aiSay(k,ms){if(S.ai)S.ai.q.push({k,at:now()+(ms||0)})}
  function aiEv(ev,k){if(!S.ai)return;
    if(ev==="right"){S.ai.lvl=0;aiSay("ok",700);S.ai.next=now()+6500}
    else if(ev==="wrong"){aiSay("no",600);S.ai.next=now()+2200}
    else if(ev==="say"&&k==="idk"){S.ai.next=Math.min(S.ai.next,now()+900)}
    else if(ev==="say"&&k==="wait"){S.ai.next=now()+20000}}
  function aiHint(lvl){const p=pzOf(S.pz),m=R.next(p,S.st.moves);if(!m)return"think";const b=R.replay(p.fen,S.st.moves),pc=b[m[0]],U=pc.toUpperCase();
    if(lvl===0)return{R:"pR",N:"pN",C:"pC",P:"pP",K:"pK"}[U]||"think";
    if(lvl===1){const o=[];b.forEach((x,i)=>{if(x===pc&&i!==m[0])o.push(i)});if(!o.length)return"think";const c=m[0]%9;return o.every(i=>i%9>c)?"left":o.every(i=>i%9<c)?"right":"think"}
    if(lvl===2){const fr=m[0]/9|0,tr=m[1]/9|0;return tr<fr?"fwd":tr>fr?"back":"side"}
    const b2=C.make(b,m[0],m[1]);return C.inCheck(b2,"b")?"check":b[m[1]]?"take":"quiet"}
  function aiTick(){const A=S.ai;if(!A||!S.st)return;const t=now();
    while(A.q.length&&A.q[0].at<=t){const x=A.q.shift();pushMsg("A",x.k,AI.name)}
    if(S.st.end||S.ph!=="playing"||S.st.moves.length%2)return;
    if(t>=A.next){pushMsg("A",aiHint(A.lvl),AI.name);A.lvl=Math.min(3,A.lvl+1);A.next=t+12000}}
  /* ---------- 每秒一次：送等人訊息、配對、心跳、看對方還在不在、小帥、補送 ---------- */
  function loop(){if(dead)return;const t=now();
    try{const cl=io.store.get("cplClean",[])||[];if(cl.length&&io.up()&&!cleanT)cl.filter(r=>r!==S.rid).forEach(cleanOne)}catch(e){}
    if(S.ph==="waiting"||S.ph==="inviting"){if(t-lastWait>=T.wait)sendWait();
      if(S.ph==="inviting"&&S.inv&&t-S.inv.at>=T.inv){S.nope[S.inv.to]=t;S.inv=null;S.ph="waiting";emit("phase")}
      tryMatch();if(S.ph==="waiting"&&!S.lonely&&t-S.waitAt>=T.lonely){S.lonely=true;emit("lonely")}}
    if(S.ph==="playing"){
      if(!S.st&&t-S.waitSt>=T.state){roomOff();io.store.set("cplCur",null);S.rid=null;S.ph="idle";emit("phase");emit("nostate")}
      else if(S.st&&!S.local){if(t-lastHb>=T.hb){lastHb=t;io.pub(roomRel()+"/e",J({t:"hb",by:S.role,id:me().id}),false)}
        if(S.dirty&&io.up())pubSt();
        const p=partner();if(p&&!p.ai&&!S.st.end&&S.role!=="W"){const d=t-S.heard,was=S.lost;S.lost=d>T.lost;if(S.lost!==was)emit("lost",{lost:S.lost});if(d>T.gone)partnerGone(false)}}
      aiTick()}
    else if(S.ph==="done")aiTick();
    tm=io.setT(loop,1000)}
  tm=io.setT(loop,1000);
  function view(){const p=S.pz&&pzOf(S.pz),ms=S.st?S.st.moves:[];return{ph:S.ph,role:S.role,pref:S.pref,st:S.st,pz:p,board:p?R.replay(p.fen,ms):null,
    next:p&&S.st&&!S.st.end&&(S.role==="A"||S.role==="W")?R.next(p,ms):null,msgs:S.msgs.slice(),lost:S.lost,gone:S.gone,lonely:S.lonely,canReveal:canReveal(),
    partner:partner(),inv:S.inv,local:S.local,waitFor:S.ph==="waiting"?now()-S.waitAt:0,people:Object.values(S.W).filter(w=>now()-w.at<T.fresh).length}}
  return{wait,stop,move,say,reveal,quit,leave,again,aiStart,aiTakeOver,resume,view,T,_S:S}}
/*COOP-CORE-END*/

/* ================= 畫面 ================= */
const COOP_R=window.XQCore?coopRules(XQCore):null;
const coopPhr=k=>COOP_PHR.find(x=>x[0]===k)||["","💬",""];
const coopPzN=id=>COOP_LOBBY_PZ.findIndex(p=>p.id===id)+1;
function coopCSS(){if(document.getElementById("coop-css"))return;const st=document.createElement("style");st.id="coop-css";st.textContent=`
.cpd-pad{padding:12px 14px 24px}
.cpd-hero{display:flex;gap:12px;align-items:flex-end;margin-bottom:12px}
.cpd-hero img{width:84px;height:112px;object-fit:contain;flex:none}
.cpd-hero .bub{flex:1;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:10px 12px;font-size:15px;line-height:1.55;position:relative}
.cpd-hero .bub b{display:block;font-size:13px;color:var(--accent);margin-bottom:2px}
.cpd-modes{display:flex;gap:8px;margin:4px 0 12px}
.cpd-modes button{flex:1;padding:12px 6px;border-radius:12px;border:2px solid var(--line);background:var(--card);font:inherit;font-weight:800;color:var(--ink)}
.cpd-modes button.on{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 14%,var(--card))}
.cpd-item{display:flex;gap:10px;align-items:center;width:100%;text-align:left;font:inherit;color:inherit;margin-bottom:8px;cursor:pointer}
.cpd-item.on{border:2px solid var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 25%,transparent)}
.cpd-item .pc{width:44px;height:44px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;background:#F6E7C8;color:#B3261E;border:2px solid #B3261E}
.cpd-item .tx{flex:1;min-width:0}.cpd-item .tx small{display:block;color:var(--muted);font-size:12.5px;margin-top:2px}
.cpd-item .st{flex:none;font-size:14px;letter-spacing:-2px}
.cpd-goal{font-size:15px;line-height:1.6;text-align:left}
.cpd-goal p{margin:6px 0}
.cpl-door{position:fixed;right:12px;bottom:calc(var(--safeB,0px) + 74px);z-index:30;padding:10px 14px;border-radius:999px;border:2px solid #E2B13C;background:#7A1E14;color:#FFE9A8;font:inherit;font-weight:900;font-size:15px;box-shadow:0 4px 14px #0006;animation:cplGlow 2.4s ease-in-out infinite}
@keyframes cplGlow{0%,100%{box-shadow:0 4px 14px #0006,0 0 0 0 #E2B13C66}50%{box-shadow:0 4px 14px #0006,0 0 0 8px #E2B13C00}}
.cpl-roles{display:grid;gap:10px;margin:10px 0}
.cpl-roles button{display:flex;gap:12px;align-items:center;text-align:left;padding:14px;border-radius:14px;border:2px solid var(--line);background:var(--card);font:inherit;color:var(--ink)}
.cpl-roles button span.i{font-size:30px;flex:none}.cpl-roles button small{display:block;color:var(--muted);font-size:12.5px;margin-top:2px}
.cpl-roles button.on{border-color:var(--accent)}
.cpl-mid{flex:1;min-height:0;overflow:auto;padding:2px 10px 4px}
.cpl-log{font-size:13px;line-height:1.5;color:var(--muted);min-height:20px}
.cpl-log b{color:var(--ink)}
.cpl-quick{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
.cpl-quick button,.cpl-grid button{padding:7px 10px;border-radius:999px;border:1px solid var(--line);background:var(--card);font:inherit;font-size:14px;color:var(--ink)}
.cpl-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.cpl-grid button{border-radius:12px;padding:10px 4px;display:flex;flex-direction:column;align-items:center;gap:2px}
.cpl-grid button span{font-size:22px}
.cpl-bub{position:absolute;left:50%;top:6px;transform:translateX(-50%);z-index:20;max-width:86%;padding:8px 14px;border-radius:16px;background:#FFF8E1;color:#3B2A12;border:2px solid #E2B13C;font-size:16px;font-weight:800;box-shadow:0 3px 10px #0004;pointer-events:none;transition:opacity .3s}
.cpl-bub.b{background:#E8F1FF;border-color:#5B8DEF}
.cpl-sol{font-size:13px;color:var(--muted);text-align:center;padding:0 10px}
`;document.head.append(st)}

/* ---------- 同桌：入口 ---------- */
function coopWhoKey(who){who=String(who||"");if(COOP_WHO[who])return who;for(const k in COOP_WHO)if(COOP_WHO[k].nk===who||COOP_WHO[k].pz===who)return k;return"x_martialgirl"}
/* 給渡口、旅伴呼叫：who＝七星代號、小名或題號 */
function coopDeskOpen(who){if(!COOP_DESK_ON)return false;location.hash="#/coop/w/"+encodeURIComponent(coopWhoKey(who));return true}
window.coopDeskOpen=coopDeskOpen;
function coopNk(k){try{return(WX_CHARS[k]&&WX_CHARS[k].nk)||COOP_WHO[k].nk}catch(e){return COOP_WHO[k]?COOP_WHO[k].nk:""}}
function coopPcOf(k){try{return(WX_CHARS[k]&&WX_CHARS[k].pc)||""}catch(e){return""}}
/* ---------- 路由：#/coop、#/coop/w/<代號>、#/coop/d/<題號>、#/coop/lobby（02-shell.js route 呼叫） ---------- */
function CoopPage(v,p){coopCSS();p=p||[];
  if(p[0]==="lobby")return CoopLobbyPage(v);
  if(!COOP_DESK_ON){navReplace("#/");return{}}
  if(p[0]==="d")return cpdPlay(v,p[1]);
  return cpdList(v,p[0]==="w"?coopWhoKey(p[1]):"")}
function cpdList(v,who){setTabs(false);setTop("🤝 合作殘譜","#/hub/battle");
  const k=who||"x_martialgirl",P0=COOP_DESK.find(x=>x.who===k)||COOP_DESK[0],done=store.get("coopDesk",{})||{},mode=store.get("coopMode","two");
  const L=[P0].concat(COOP_DESK.filter(x=>x!==P0));
  v.innerHTML=`<div class="cpd-pad">
    <div class="cpd-hero"><img src="data/xs/prev_${esc(k)}.webp" alt="" onerror="this.remove()"><div class="bub"><b>${esc(coopNk(k))}撿到半張棋譜</b>${esc(P0.say.intro)}</div></div>
    <div class="muted" style="font-size:13px;margin-bottom:4px">同一支手機：紅方一個人、黑方一個人輪流走。不是比輸贏，要<b>一起</b>達成棋譜上的目標。</div>
    <div class="cpd-modes"><button data-m="two" class="${mode==="two"?"on":""}">👥 兩個人一起<br><small style="font-weight:400">一人紅、一人黑</small></button><button data-m="solo" class="${mode==="solo"?"on":""}">🙂 一人分飾兩角<br><small style="font-weight:400">紅黑都自己走</small></button></div>
    ${L.map(x=>{const d=done[x.id],pc=coopPcOf(x.who);return`<button class="card cpd-item${x===P0&&who?" on":""}" data-id="${x.id}"><span class="pc">${esc(pc||"棋")}</span><span class="tx"><b>${esc(x.t)}</b>　<span class="muted" style="font-size:12.5px">${esc(coopNk(x.who))}的棋譜</span><small>${esc(x.gt)}・最少 ${x.min} 步</small></span><span class="st">${d?"⭐".repeat(d.s):"☆"}</span></button>`}).join("")}
  </div>`;
  v.querySelectorAll("[data-m]").forEach(b=>b.onclick=()=>{store.set("coopMode",b.dataset.m);v.querySelectorAll("[data-m]").forEach(x=>x.classList.toggle("on",x===b));vibrate(5)});
  v.querySelectorAll("[data-id]").forEach(b=>b.onclick=()=>{vibrate(8);location.hash="#/coop/d/"+b.dataset.id});
  return{}}
/* 棋盤上畫目標：半透明的目標棋子＋框（達成的那格改綠色實線） */
function cpdGhost(svg,list){svg.querySelectorAll(".cpd-ghost").forEach(e=>e.remove());if(!list.length)return;const NS="http://www.w3.org/2000/svg",g=document.createElementNS(NS,"g");g.setAttribute("class","cpd-ghost");g.setAttribute("aria-hidden","true");g.style.pointerEvents="none";
  for(const x of list){const cx=40+(x.sq%9)*60,cy=40+(x.sq/9|0)*60;
    if(x.ch){const t=document.createElementNS(NS,"text");t.setAttribute("x",cx);t.setAttribute("y",cy+11);t.setAttribute("text-anchor","middle");t.setAttribute("font-size","32");t.setAttribute("font-weight","900");t.setAttribute("fill",x.red?"#B3261E":"#222");t.setAttribute("opacity",x.done?"0":".28");t.textContent=x.ch;g.append(t)}
    const c=document.createElementNS(NS,"circle");c.setAttribute("cx",cx);c.setAttribute("cy",cy);c.setAttribute("r","29");c.setAttribute("fill","none");c.setAttribute("stroke",x.done?"#2E9E4F":x.kill?"#C62828":"#E39B0F");c.setAttribute("stroke-width",x.done?"4":"3.5");if(!x.done)c.setAttribute("stroke-dasharray","6 5");g.append(c)}
  svg.append(g)}
function cpdPlay(v,id){const P=COOP_DESK.find(x=>x.id===id);if(!P||!COOP_R){navReplace("#/coop");return{}}const R=COOP_R,C=XQCore,mode=store.get("coopMode","two");
  setTabs(false);gameLayout(v);const bd=Board(i=>tap(i));v.querySelector("#bbox").append(bd.svg);
  let moves=[],sel=-1,hintMv=null,over=false,alive=true;
  const nm=s=>mode==="solo"?(s==="r"?"你（紅方）":"你（黑方）"):(s==="r"?"紅方小夥伴":"黑方小夥伴");
  setTop(`🤝 ${P.t}`,"#/coop",[["🎯",goalBox,"目標"]]);
  v.querySelector("#pTop").innerHTML=playerHTML("b",nm("b"),"一起完成目標");v.querySelector("#pBot").innerHTML=playerHTML("r",nm("r"),"一起完成目標");
  actionBar(v.querySelector("#acts"),[["undo","↶","悔棋",()=>{if(!moves.length)return;moves.pop();over=false;sel=-1;hintMv=null;draw()}],["hint","💡","提示",hint,true],
    ["goal","🎯","目標",goalBox],["reset","↺","重來",()=>{moves=[];over=false;sel=-1;hintMv=null;draw()}]]);
  const turn=()=>moves.length%2?"b":"r",board=()=>R.replay(P.fen,moves);
  function ghosts(b){const L=[];
    if(P.goal.at)for(const[p,s]of P.goal.at){const q=R.sqOf(s),sd=p===p.toUpperCase()?"r":"b";L.push({sq:q,ch:NAMES[sd][p.toUpperCase()],red:sd==="r",done:b[q]===p})}
    if(P.goal.draw)b.forEach((x,i)=>{if(x&&"RNCP".includes(x.toUpperCase()))L.push({sq:i,kill:true})});
    if(P.goal.none)b.forEach((x,i)=>{if(x&&P.goal.none.includes(x)&&!L.some(y=>y.sq===i))L.push({sq:i,kill:true})});
    return L}
  function draw(){if(!alive)return;const b=board(),s=turn(),L=moves.length?moves[moves.length-1]:null,ck=C.inCheck(b,s)?C.kingSq(b,s):-1;
    const tg=sel>=0?C.legal(b,s).filter(([f])=>f===sel).map(([,t])=>t):[];
    bd.draw(b,{last:L?{f:L[0],t:L[1]}:null,sel,targets:tg,check:ck,sugg:hintMv?[{f:hintMv[0],t:hintMv[1]}]:[],flip:false});cpdGhost(bd.svg,ghosts(b));
    const n=moves.length;v.querySelector("#stat").textContent=over?"🎉 完成了！":`${s==="r"?"🔴 紅方":"⚫ 黑方"}（${nm(s)}）走・第 ${n+1}／${P.max} 步`;
    renderStrip(v.querySelector("#strip"),moves.map((m,i)=>{let cn="?";try{cn=C.notate(R.replay(P.fen,moves.slice(0,i)),m[0],m[1])}catch(e){}return{cn,by:i%2?"b":"r"}}),-1)}
  function tap(i){if(over)return;const b=board(),s=turn();
    if(sel>=0&&C.legal(b,s).some(([f,t])=>f===sel&&t===i)){const f=sel;sel=-1;hintMv=null;moves.push([f,i]);vibrate(12);draw();after();return}
    if(b[i]&&sideOf(b[i])!==s&&sel<0){toast(`現在輪到${s==="r"?"紅方":"黑方"}走喔`);return}
    sel=i===sel?-1:C.legal(b,s).some(([f])=>f===i)?i:-1;if(sel>=0)vibrate(5);draw()}
  function after(){const b=board();
    if(R.goalOk(b,P.goal)){over=true;draw();win();return}
    const why=!R.goalAlive(b,P.goal)?"需要的棋子被吃掉了":C.legal(b,turn()).length===0?`${turn()==="r"?"紅方":"黑方"}沒有棋可以走了`:moves.length>=P.max?`${P.max} 步用完了`:"";
    if(why)setTimeout(()=>{if(!alive||over)return;modal(`<h2 style="font-size:19px">差一點！</h2><p>${esc(why)}。悔一步再試試，或從頭來。</p>`,[["↶ 悔一步",()=>{moves.pop();draw()}],["↺ 重來",()=>{moves=[];draw()},true]])},500)}
  function win(){const n=moves.length,s=n<=P.min?3:n<=P.min+2?2:1,D=store.get("coopDesk",{})||{},o=D[P.id];
    if(!o||s>o.s||n<o.n){D[P.id]={s:Math.max(s,o?o.s:0),n:Math.min(n,o?o.n:99),at:Date.now()};store.set("coopDesk",D)}
    setTimeout(()=>{if(!alive)return;modal(`<div style="text-align:center"><img src="data/xs/prev_${esc(P.who)}.webp" alt="" style="height:110px" onerror="this.remove()"><h2 style="font-size:20px;margin:6px 0">${"⭐".repeat(s)}</h2>
      <p style="font-size:16px"><b>${esc(coopNk(P.who))}：</b>「${esc(P.say.win)}」</p><p class="muted">${mode==="solo"?"一人分飾兩角也做到了！":"你們兩個合作完成！"}用了 ${n} 步（最少 ${P.min} 步）</p><p class="muted" style="font-size:13px">💡 ${esc(P.say.tip)}</p></div>`,
      [["下一題",()=>{const i=COOP_DESK.indexOf(P),nx=COOP_DESK[(i+1)%COOP_DESK.length];location.hash="#/coop/d/"+nx.id}],["再玩一次",()=>{moves=[];over=false;draw()},true],["回棋譜清單",()=>upTo("#/coop"),true]])},700)}
  function hint(){if(over)return;const b=board(),sol=R.solOf(P);
    if(R.onPath(P,moves)&&sol[moves.length]){hintMv=sol[moves.length];draw();toast("照藍色箭頭走走看");return}
    const m=R.deskSearch(b,turn(),P.goal,P.max-moves.length,8000);
    if(m){hintMv=m;draw();toast("照藍色箭頭走走看");return}
    let k=0;while(k<moves.length&&R.same(moves[k],sol[k]))k++;
    modal(`<h2 style="font-size:19px">走岔了</h2><p>從這裡不好走到目標。退回最後一個還在正路上的地方（第 ${k} 步），再看提示？</p>`,[["退回正路",()=>{moves=moves.slice(0,k);hintMv=sol[k]||null;draw()}],["先不要",null,true]])}
  function goalBox(){modal(`<div class="cpd-goal"><h2 style="font-size:19px">🎯 棋譜上的目標</h2><p><b>${esc(P.gt)}</b></p><p>最少 ${P.min} 步、最多 ${P.max} 步（紅黑各走一次算兩步）。</p>
    <p class="muted">棋盤上<span style="color:#E39B0F">橘色虛線框</span>＝要去的地方，淡淡的字＝要站上去的棋子；做到了會變<span style="color:#2E9E4F">綠框</span>。${P.goal.draw||P.goal.none?'<span style="color:#C62828">紅圈</span>＝還要下場的棋子。':""}</p>
    <p class="muted">紅黑照規則輪流走，可是要<b>互相讓路</b>，不是互相吃。</p></div>`,[["知道了",null]])}
  draw();if(!store.get("coopGoalSeen",false)){store.set("coopGoalSeen",true);setTimeout(goalBox,400)}
  return{stop(){alive=false}}}
/* 同桌對弈頁（同一支手機輪流下時）動作列加「🤝 合作」 */
if(typeof PvpGame==="function"){const f0=PvpGame;PvpGame=function(v){const r=f0.apply(this,arguments);try{if(COOP_DESK_ON&&!(OFF&&window.XQNet&&XQNet.active())&&!store.get("pvpSeat",null)){const a=v.querySelector("#acts");
    if(a&&!a.querySelector(".cpd-pvp")){const b=document.createElement("button");b.className="cpd-pvp";b.innerHTML='<span class="ic" aria-hidden="true">🤝</span>合作';b.setAttribute("aria-label","合作殘譜");b.onclick=()=>{vibrate(8);location.hash="#/coop"};a.append(b)}}}catch(e){}return r}}

/* ---------- 殘篇閣 ---------- */
const cplTestRoom=()=>{try{return!!(window.XQNet&&XQNet.root&&/^xqlab-test-/.test(XQNet.root()))}catch(e){return false}};
const cplAllowed=()=>!!(OFF&&window.XQNet&&XQNet.qSub&&(COOP_LOBBY_ON||cplTestRoom()));
function coopOpenNow(d){if(cplTestRoom())return true;d=d||new Date();const h=d.getHours(),m=d.getMinutes(),O=COOP_LOBBY_OPEN;return h>=O.h0&&h<=O.h1&&m>=O.m0&&m<=O.m1}
window.coopOpenNow=coopOpenNow;
/* 大廳畫面右下角的燈籠鈕（開門時才有） */
if(typeof Lobby==="function"){const f0=Lobby;Lobby=function(v){const r=f0.apply(this,arguments);try{cplDoor(v)}catch(e){}return r}}
function cplDoor(v){if(!cplAllowed())return;coopCSS();const H=location.hash;
  const put=()=>{if(!v.isConnected||location.hash!==H){clearInterval(iv);return}const on=coopOpenNow(),b=v.querySelector(".cpl-door");
    if(on&&!b){const x=document.createElement("button");x.className="cpl-door";x.textContent="🧩 殘篇閣開門了";x.onclick=()=>{vibrate(8);location.hash="#/coop/lobby"};v.append(x)}else if(!on&&b)b.remove()};
  const iv=setInterval(put,5000);put()}
function cplIo(emit){return{C:XQCore,pz:COOP_LOBBY_PZ,phr:COOP_PHR,me:()=>XQNet.me(),pub:(rel,s,ret)=>XQNet.qPub(rel,s,ret),sub:(rel,fn)=>XQNet.qSub(rel,fn),up:()=>XQNet.qUp(),
  now:()=>Date.now(),setT:(f,ms)=>setTimeout(f,ms),clrT:h=>clearTimeout(h),blocked:id=>{try{return XQNet.blocked(id)}catch(e){return false}},
  store:{get:(k,d)=>store.get(k,d),set:(k,v)=>store.set(k,v)},emit,rnd:()=>Math.random().toString(36).slice(2,10)}}
function CoopLobbyPage(v){setTabs(false);setTop("🧩 殘篇閣","#/lobby");
  const msg=t=>{v.innerHTML=`<div class="cpd-pad"><div class="card">${t}</div></div>`;return{}};
  if(!OFF||!window.XQNet||!XQNet.qSub)return msg("殘篇閣要用安裝在手機上的 App（線上大廳）才進得去。");
  if(!cplAllowed())return msg("🧩 殘篇閣還在整修，過幾天再來看看！");
  try{if(typeof fmNetOff==="function"&&fmNetOff()&&typeof lbsParentOffPage==="function")return lbsParentOffPage(v)}catch(e){}
  try{if(typeof window.XQ_SELFBANNED==="function"&&window.XQ_SELFBANNED())return msg("現在不能進殘篇閣。")}catch(e){}
  XQNet.start();
  let core=null,alive=true,shown=0,pumpT=null,bubT=null,lastPh="",bd=null,sel=-1,lastLog=0;
  core=coopLobbyCore(cplIo((ev,d)=>{if(!alive)return;
    if(ev==="phase"){paint();return}
    if(ev==="state"){if(d&&d.tried&&core.view().role==="B")toast("殘篇上好像不是這樣走……聽聽看譜人的暗語");if(core.view().ph==="playing"||core.view().ph==="done")pump();return}
    if(ev==="say"){bubble(d);logPaint();return}
    if(ev==="lonely"){const V=core.view();if(V.pref!=="A"){toast("現在沒有其他人，請小帥 AI 來看譜！");core.aiStart()}else paint();return}
    if(ev==="lost"){statPaint();return}
    if(ev==="gone"){goneBox(d);return}
    if(ev==="nostate"){toast("搭檔沒有接上，再找一次");paint()}}));
  if(!core.resume())lastPh="";
  function bubble(d){const m=coopPhr(d.k),box=v.querySelector("#bbox");if(!box)return;let b=v.querySelector(".cpl-bub");if(!b){b=document.createElement("div");b.className="cpl-bub";box.style.position="relative";box.append(b)}
    b.className="cpl-bub"+(d.by==="B"?" b":"");b.textContent=`${d.by==="A"?"📜":"♟"} ${d.name||""}：${m[1]} ${m[2]}`;b.style.opacity="1";clearTimeout(bubT);bubT=setTimeout(()=>{b.style.opacity="0"},3200);vibrate(6)}
  function goneBox(d){modal(`<h2 style="font-size:19px">${d&&d.bye?"看譜人先走了":"看譜人好像斷線了"}</h2><p>沒關係，不會扣分。要請小帥 AI 接手看譜嗎？</p>`,[["請小帥接手",()=>core.aiTakeOver()],["我也先離開",()=>{core.quit();paint()},true]])}
  /* 依階段重畫整頁 */
  function paint(){if(!alive)return;const V=core.view();
    if(V.ph==="playing"||V.ph==="done"){if(lastPh!=="playing"){lastPh="playing";playLayout()}if(V.ph==="done")doneBox();statPaint();pump();return}
    lastPh=V.ph;bd=null;shown=0;v.className="view";
    if(V.ph==="idle"){v.innerHTML=`<div class="cpd-pad"><div class="card" style="margin-bottom:10px"><b>🧩 合力補全殘篇</b><p style="margin:6px 0 0;line-height:1.6">一張殘篇要兩個人合力才補得完：<br>📜 <b>看譜人</b>看得到正解，可是不能動棋子，只能用暗語提示；<br>♟ <b>下棋人</b>可以動棋子，可是看不到正解。<br>目標：<b>3 步之內將死黑方</b>。不計分，隨時可以離開。</p></div>
      <div class="cpl-roles"><button data-r="A"><span class="i">📜</span><span><b>我想當看譜人</b><small>看正解、用暗語提示</small></span></button><button data-r="B"><span class="i">♟</span><span><b>我想當下棋人</b><small>聽暗語、動棋子</small></span></button><button data-r="any"><span class="i">🎲</span><span><b>都可以</b><small>看搭檔需要什麼</small></span></button></div>
      <button class="btn ghost" id="ai">🤖 跟小帥 AI 一起玩（小帥看譜、我下棋）</button>${cplTestRoom()?'<p class="muted" style="font-size:12px;margin-top:10px">🧪 測試房</p>':""}</div>`;
      v.querySelectorAll("[data-r]").forEach(b=>b.onclick=()=>{vibrate(8);core.wait(b.dataset.r)});v.querySelector("#ai").onclick=()=>core.aiStart();return}
    if(V.ph==="waiting"||V.ph==="inviting"){const RN={A:"📜 看譜人",B:"♟ 下棋人",any:"🎲 都可以"};
      v.innerHTML=`<div class="cpd-pad"><div class="card" style="text-align:center"><div style="font-size:34px">🏮</div><b>${V.ph==="inviting"?"找到一位搭檔，正在打招呼…":"正在找搭檔…"}</b>
        <p class="muted" style="margin:6px 0">我選：${RN[V.pref]}${V.people?`・殘篇閣裡還有 ${V.people} 人`:""}</p>${V.lonely&&V.pref==="A"?'<p>現在沒有下棋人。要不要換你下棋、小帥看譜？</p>':'<p class="muted" style="font-size:13px">等一下沒人來，小帥 AI 會來當看譜人</p>'}
        <button class="btn" id="ai">🤖 跟小帥 AI 一起玩</button><button class="btn ghost" id="cx">取消</button></div></div>`;
      v.querySelector("#ai").onclick=()=>core.aiStart();v.querySelector("#cx").onclick=()=>core.stop()}}
  function playLayout(){gameLayout(v);bd=Board(i=>tap(i));v.querySelector("#bbox").append(bd.svg);shown=0;sel=-1;
    const mid=v.querySelector("#strip").nextElementSibling;mid.className="cpl-mid";mid.style.flex="1";mid.innerHTML='<div class="cpl-log" id="clog"></div><div class="cpl-quick" id="cq"></div>';
    const V=core.view(),isA=V.role==="A";
    const q=isA?["pR","pN","pC","pP","left","right","fwd","side","check","ok","no","think"]:["idk","you","wait","think","ok","go"];
    mid.querySelector("#cq").innerHTML=q.map(k=>{const m=coopPhr(k);return`<button data-k="${k}">${m[1]} ${esc(m[2])}</button>`}).join("")+'<button data-more="1">💬 更多…</button>';
    mid.querySelectorAll("[data-k]").forEach(b=>b.onclick=()=>{vibrate(6);core.say(b.dataset.k)});mid.querySelector("[data-more]").onclick=phrSheet;
    const items=[["say","💬","暗語",phrSheet]];if(isA)items.push(["sol","📜","正解",solBox]);items.push(["rv","📖","揭曉",()=>{const W=core.view();if(!W.canReveal){toast("試滿 8 次、或下了 4 分鐘以後才能揭曉");return}confirmBox("揭曉正解？這局會算「練習完成」",()=>core.reveal(),"揭曉")}]);
    items.push(["quit","🏳","離開",()=>confirmBox("離開這張殘篇？不會扣分",()=>{core.quit();paint()},"離開")]);actionBar(v.querySelector("#acts"),items)}
  function phrSheet(){sheet("💬 暗語",b=>{b.innerHTML=`<p class="muted" style="font-size:12.5px;margin:0 0 8px">殘篇閣只能用暗語，看譜人不能直接說答案喔</p><div class="cpl-grid">${COOP_PHR.map(([k,i,t])=>`<button data-k="${k}"><span>${i}</span>${esc(t)}</button>`).join("")}</div>`;
    b.querySelectorAll("[data-k]").forEach(x=>x.onclick=()=>{closeSheet();core.say(x.dataset.k)})})}
  function solBox(){const V=core.view();if(!V.pz)return;const R=COOP_R,sol=R.solOf(V.pz);let b=XQCore.parseFen(V.pz.fen);const cn=sol.map(([f,t],i)=>{const s=XQCore.notate(b,f,t);b=XQCore.make(b,f,t);return(i%2?"黑 ":"紅 ")+s});
    modal(`<h2 style="font-size:19px">📜 殘篇上的正解</h2><p style="line-height:1.8">${cn.map(esc).join("<br>")}</p><p class="muted" style="font-size:13px">不能直接說答案，只能用暗語讓下棋人自己想到！（黑方由電腦照殘篇應著）</p>`,[["知道了",null]])}
  function logPaint(){const el=v.querySelector("#clog");if(!el)return;const V=core.view();el.innerHTML=V.msgs.slice(-3).map(x=>{const m=coopPhr(x.k);return`<div><b>${x.by==="A"?"📜":"♟"} ${esc(x.name||"")}</b>：${m[1]} ${esc(m[2])}</div>`}).join("")||'<div>還沒有人說話</div>'}
  function statPaint(){const st=v.querySelector("#stat");if(!st)return;const V=core.view(),S=V.st;if(!S){st.textContent="⏳ 等搭檔的棋盤…";return}
    const k=Math.min(3,Math.floor(S.moves.length/2)+1),pn=V.partner?V.partner.name:"";
    let t=V.role==="B"?`♟ 你是下棋人：3 步內將死黑方（第 ${k}／3 步）・試了 ${S.tries} 次`:V.role==="A"?`📜 你是看譜人：藍色箭頭是正解，用暗語提示 ${pn}`:"👀 小帥已經接手看譜，你在旁邊看";
    if(V.lost)t="🔌 搭檔好像斷線了，等他一下…";if(S.end)t={ok:"🎉 殘篇補全了！",reveal:"📖 正解揭曉",quit:"搭檔先走了，沒關係",gone:"搭檔離開了，這局先收起來"}[S.end.w]||"結束";
    st.textContent=t;
    const pt=v.querySelector("#pTop"),pb=v.querySelector("#pBot");if(pt&&pb){pt.innerHTML=playerHTML("b","黑方（電腦照殘篇應著）","");pb.innerHTML=playerHTML("r",`${S.B.name}（下棋人）`,`看譜人：${S.A.ai?"🤖 小帥":S.A.name}`)}}
  /* 新的棋步一步一步放出來（紅方走完停一下再放黑方應著） */
  function pump(){clearTimeout(pumpT);const V=core.view();if(!bd||!V.st)return drawB();const n=V.st.moves.length;if(shown>n)shown=n;if(shown<n){shown++;drawB();pumpT=setTimeout(pump,650)}else drawB();logPaint();statPaint()}
  function drawB(){if(!bd)return;const V=core.view(),S=V.st;if(!S||!V.pz){return}const C=XQCore,ms=S.moves.slice(0,shown),b=COOP_R.replay(V.pz.fen,ms),s=ms.length%2?"b":"r",L=ms[ms.length-1];
    const ck=C.inCheck(b,s)?C.kingSq(b,s):-1,tg=V.role==="B"&&sel>=0&&!S.end?C.legal(b,"r").filter(([f])=>f===sel).map(([,t])=>t):[];
    const nx=(V.role==="A"||V.role==="W")&&shown===S.moves.length?V.next:null,tr=V.role!=="B"&&S.last&&shown===S.moves.length?[S.last.f,S.last.t]:[];
    bd.draw(b,{last:L?{f:L[0],t:L[1]}:null,sel:V.role==="B"?sel:-1,targets:tg,check:ck,fx:true,sugg:nx?[{f:nx[0],t:nx[1]}]:[],hint:tr,flip:false});
    if(V.role!=="B"&&S.last&&shown===S.moves.length){const el=v.querySelector("#clog");try{const cn=C.notate(b,S.last.f,S.last.t);if(el&&S.tries!==lastLog){lastLog=S.tries;toast(`下棋人剛剛試了：${cn} ✗`)}}catch(e){}}}
  function tap(i){const V=core.view(),S=V.st;if(!S||S.end)return;if(V.role!=="B"){toast(V.role==="A"?"你是看譜人，只能用暗語提示喔":"你在旁邊看");return}
    if(shown<S.moves.length||S.moves.length%2)return;const b=V.board;
    if(sel>=0&&XQCore.legal(b,"r").some(([f,t])=>f===sel&&t===i)){const f=sel;sel=-1;vibrate(12);const r=core.move(f,i);if(!r.ok&&r.why==="wrong")drawB();return}
    sel=i===sel?-1:XQCore.legal(b,"r").some(([f])=>f===i)?i:-1;if(sel>=0)vibrate(5);drawB()}
  let doneShown=false;
  function doneBox(){if(doneShown)return;doneShown=true;const V=core.view(),S=V.st;if(!S||!S.end)return;const w=S.end.w,said=V.msgs.length;
    setTimeout(()=>{if(!alive)return;const head={ok:"🎉 你們合力補全了殘篇！",reveal:"📖 正解揭曉，練習完成",quit:"搭檔先走了",gone:"搭檔離開了"}[w]||"結束";
      modal(`<div style="text-align:center"><h2 style="font-size:20px">${head}</h2><p class="muted">殘篇第 ${coopPzN(S.pz)} 卷・試了 ${S.tries} 次・說了 ${said} 句暗語</p>${w==="quit"||w==="gone"?'<p>沒關係，不會扣分。</p>':""}</div>`,
        [[S.A.ai||w==="quit"||w==="gone"?"🔁 再一題":"🔁 再找搭檔",()=>{doneShown=false;lastPh="";core.again();paint()}],["🏮 回大廳",()=>{location.hash="#/lobby"},true]])},w==="ok"?1400:500)}
  paint();
  return{stop(){alive=false;clearTimeout(pumpT);clearTimeout(bubT);try{core.leave()}catch(e){}}}}
