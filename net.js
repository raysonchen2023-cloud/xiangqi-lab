// 線上大廳：不用電腦，手機之間透過公開的 MQTT 伺服器（免費、免註冊）互相看到在線、送對戰邀請、下棋、觀戰。
// 傳的只有名字、裝置代號和棋步；公開伺服器任何人都可能看到這些內容，所以不要放秘密。
// 主題（topic）規劃：
//   ROOT/u/<我的代號>     在線狀態（保留訊息；斷線時伺服器自動清掉＝遺囑）
//   ROOT/i/<我的代號>     收件匣：邀請、接受、拒絕、取消
//   ROOT/g/<對局代號>/s   對局狀態（保留訊息，晚進來的觀眾也拿得到完整棋譜）
//   ROOT/g/<對局代號>/e   表情（不保留）
//   ROOT/sys/bots         開發者電腦上的大廳角色（lobby-bots.js）在不在線、有哪些代號（保留；那條連線斷了伺服器會自動改成「不在線」＝遺囑）
//   ROOT/sys/online       大廳角色程式數的在線人數（保留；首頁「N 人在線上」用，不用為了數人頭去收整份名單）
"use strict";
var XQNet=(function(){
  // ChatGPT：新局必須雙方使用相同裁判，避免一端判和、一端判負。
  const RULE_ID=XQCore.REP_RULES.id;
  const ruleMismatch=()=>window.dispatchEvent(new CustomEvent("xq-rules-mismatch"));
  /* 11/11 Gemini 架構報告第一項（棋規設定 ruleConfig）：邀請、接受都多帶 rs＝自己設定的棋規（沒帶＝舊版，當成千秋休閒規則）。
     裁判版本 rules 不同照舊婉拒；裁判版本相同、棋規不同或用了原型棋規＝照樣開局，但這盤只算友誼賽（G.rc.mode＝casual）、不計積分；雙方都是千秋休閒規則＝ranked，跟以前一樣計分 */
  const RS0=XQCore.RULESET_DEFAULT||"qiqiu_casual",rsPref=()=>{try{const v=window.XQ_rulePref?window.XQ_rulePref():RS0;return XQCore.RULESETS&&XQCore.RULESETS[v]?v:RS0}catch(e){return RS0}};
  const netRc=peer=>{const a=rsPref(),b=XQCore.RULESETS&&XQCore.RULESETS[peer]?peer:RS0;if(!XQCore.ruleConfig)return null;return a===b?XQCore.ruleConfig(a,"ranked"):XQCore.ruleConfig(RS0,"casual")};
  const rcKey=g=>g&&g.rc?String(g.rc.rulesetId)+"|"+String(g.rc.mode):"";
  const rcRated=g=>!g||!g.rc||!!(XQCore.ruleRated&&XQCore.ruleRated(g.rc)&&g.rc.mode==="ranked");
  const rcSaid=new Set();function rcNotice(g){try{if(!g||!g.rc||rcRated(g)||!side()||rcSaid.has(g.gid+"|"+g.id))return;rcSaid.add(g.gid+"|"+g.id);emit("friendly",{gid:g.gid,rc:g.rc})}catch(e){}}
  /* 回饋 854（開發者 11/9：專用 MQTT 伺服器、降流量）：伺服器網址和帳密集中在 MQ，搬到專用伺服器時只改這裡（電腦上的程式讀 tools/mqtt-config.json）。
     帳密會跟著 App 程式公開，所以這裡只能放「權限最小」的帳號（只准用 xqlab-… 開頭的頻道）。
     測試房間（xq_netRoot 有設）可以在 localStorage 的 xq_mqtt 放 {"url":"wss://…","user":"…","pass":"…"}，先用測試房間試新伺服器；正式大廳不看 xq_mqtt */
  /* host 留空＝照舊用公開伺服器 broker.emqx.io；填了 host（EMQX Serverless 總覽頁的 Address，例如 xxxxxxxx.ala.us-east-1.emqxsl.com）就連 wss://host:port/path。user／pass 放給 App 用的那組帳號（xqapp） */
  const MQ={host:"d23f1132.ala.asia-southeast1.emqxsl.com",port:8084,path:"/mqtt",user:"xqapp",pass:"xqapp12345678"};   /* 開發者 11/9「可以切換私人伺服器了」：EMQX Serverless（xiangqi-lobby，新加坡）；xqapp 是公開帳號，權限只准 +/v1/…（不能發 sys、cup/state、cup/hall、cal、ctl/ack、c/） */
  const URLS=[MQ.host?"wss://"+MQ.host+":"+MQ.port+MQ.path:"wss://broker.emqx.io:8084/mqtt"];
  let ROOT="xqlab-r7k2q/v1";try{const v=localStorage.getItem("xq_netRoot");let r=null;try{r=JSON.parse(v||"null")}catch(e){r=v}   /* 11/12：測試房設成沒引號的字串（例如 xq_test）以前會 JSON 解析失敗、默默連到正式大廳（棋友a3d9）；沒引號也當測試房 */
  if(r&&/^[\w-]{3,40}$/.test(r))ROOT="xqlab-test-"+r+"/v1"}catch(e){}
  /* 開發者 11/12「嚴格禁止電腦虛擬測試玩家跑到正式大廳」：本機網址（localhost、127.x、[::1]、*.localhost、區網 192.168／10.x）或自動化瀏覽器（navigator.webdriver），
     不管 xq_netRoot 怎麼設，一律只進測試房 xqlab-test-local；正式大廳只有正式站上的真人（大廳棋友程式 lobby-bots 是 Node 直接連，不經過這裡） */
  try{const h=String(location.hostname||"");if(ROOT==="xqlab-r7k2q/v1"&&(/^(localhost|127\.|\[::1\]|192\.168\.|10\.)/.test(h)||/\.localhost$/.test(h)||(typeof navigator!=="undefined"&&navigator.webdriver)))ROOT="xqlab-test-local/v1"}catch(e){}
  const MQA={user:MQ.user,pass:MQ.pass};
  if(/^xqlab-test-/.test(ROOT))try{const t=JSON.parse(localStorage.getItem("xq_mqtt")||"null");if(t&&typeof t.url==="string"&&/^wss?:\/\/[\w.:\[\]-]+(\/[\w./-]*)?$/.test(t.url)){URLS[0]=t.url;MQA.user=String(t.user||"");MQA.pass=String(t.pass||"")}}catch(e){}
  const ALIVE=150000;
  /* 回饋 854：在線狀態改成「有變化才送」。新版（v:2）只在上線、換狀態時送，另外每 30 分鐘補送一次（REFRESH，防伺服器漏掉遺囑留下幽靈玩家）；
     斷線時伺服器照遺囑清掉。新版看新版：用 ts（送出時間）算，65 分鐘（ALIVE2）沒更新就不算在線。
     舊版 App 還是用 at 算 150 秒內才算在線，所以新版把 at 寫成「現在＋32 分鐘」（AHEAD），舊版就會一直看得到，直到遺囑清掉或 32 分鐘沒補送；
     舊版每 30 秒送的在線狀態（沒有 v）新版照舊用 at 算 150 秒 */
  const PV=2,REFRESH=30*60000,AHEAD=32*60000,ALIVE2=65*60000,LINGER=3*60000;
  /* 意見回饋 635（開發者：每週擂台大賽）：千秋盃由開發者電腦上的裁判台（tools/cup-host.js）主辦；報名名單、籤表、賽果都由裁判台簽名後放在 cup/state，
     App 只認簽名對得上的那一份（公開伺服器誰都能發訊息，沒簽名就能偽造冠軍）。這裡只放公鑰，私鑰只在開發者電腦 */
  const CUP_KEY=/^xqlab-test-/.test(ROOT)?{x:"AdIvuWHACyopyR4QKZPcwXRj-CwjFPRGKhdtTRUD7iE",y:"gixRZI_bD2-G1VJBK8pTVUf--TjFwr2o08PhCvTzR3o"}:{x:"AFFHksP_gHhR6T8pWVfhfnO5NuvpRGyjDQFgdjPGlO8",y:"JYvXhSoW71HnDaFZpMroP6kuJy6ILXWRnJTrqBYGXIs"};
  let CUP=null,CUPHALL=null,cupKeyP=null;
  const b64u=t=>{t=String(t).replace(/-/g,"+").replace(/_/g,"/");while(t.length%4)t+="=";const r=atob(t),u=new Uint8Array(r.length);for(let i=0;i<r.length;i++)u[i]=r.charCodeAt(i);return u};
  async function cupVerify(msg){try{const x=JSON.parse(msg);if(!x||typeof x.d!=="string"||typeof x.s!=="string"||!(window.crypto&&crypto.subtle))return null;
    cupKeyP=cupKeyP||crypto.subtle.importKey("jwk",{kty:"EC",crv:"P-256",x:CUP_KEY.x,y:CUP_KEY.y,ext:true},{name:"ECDSA",namedCurve:"P-256"},false,["verify"]);
    const ok=await crypto.subtle.verify({name:"ECDSA",hash:"SHA-256"},await cupKeyP,b64u(x.s),new TextEncoder().encode(x.d));return ok?JSON.parse(x.d):null}catch(e){return null}}

  // ---------- 很小的 MQTT 3.1.1 用戶端（只用 QoS 0：發布、訂閱、保留訊息、遺囑、心跳） ----------
  function mqtt(url,o){
    const te=new TextEncoder(),td=new TextDecoder();
    const vlen=n=>{const a=[];do{let d=n%128;n=Math.floor(n/128);if(n>0)d|=128;a.push(d)}while(n>0);return a};
    const str=x=>{const b=te.encode(x);return[b.length>>8,b.length&255,...b]};
    const pkt=(h,body)=>new Uint8Array([h,...vlen(body.length),...body]);
    const me={up:false,onup:null,ondown:null,onmsg:null};let buf=new Uint8Array(0),pid=1,ping=null,ws;
    try{ws=new WebSocket(url,["mqtt"])}catch(e){setTimeout(()=>me.ondown&&me.ondown(false),0);return me}
    ws.binaryType="arraybuffer";
    let lastRx=Date.now(),dog=null;
    const send=p=>{try{if(ws.readyState===1){ws.send(p);return true}}catch(e){}return false};
    ws.onopen=()=>{const w=o.will;let fl=0x02;if(w)fl|=0x04|(w.retain?0x20:0);if(o.user)fl|=0x80|(o.pass?0x40:0);   /* 回饋 854：專用伺服器要帳密 */
      const body=[0,4,77,81,84,84,4,fl,o.keepalive>>8,o.keepalive&255,...str(o.clientId)];
      if(w){body.push(...str(w.topic));const p=te.encode(w.payload||"");body.push(p.length>>8,p.length&255,...p)}
      if(o.user){body.push(...str(o.user));if(o.pass)body.push(...str(o.pass))}
      send(pkt(0x10,body))};
    ws.onmessage=e=>{if(downed)return;lastRx=Date.now();const d=new Uint8Array(e.data),nb=new Uint8Array(buf.length+d.length);nb.set(buf);nb.set(d,buf.length);buf=nb;
      for(;;){if(buf.length<2)return;let mul=1,n=0,i=1,c;do{if(i>=buf.length)return;c=buf[i++];n+=(c&127)*mul;mul*=128}while(c&128);
        if(buf.length<i+n)return;const t=buf[0],b=buf.slice(i,i+n);buf=buf.slice(i+n);
        if(t>>4===2){if(b[1]===0){me.up=true;ping=setInterval(()=>send(new Uint8Array([0xC0,0])),o.keepalive*500);
          dog=setInterval(()=>{if(Date.now()-lastRx>o.keepalive*1200){try{ws.close()}catch(e){}me.kill&&me.kill()}},3000);me.onup&&me.onup()}else ws.close()}
        else if(t>>4===3){const tl=(b[0]<<8)|b[1],topic=td.decode(b.subarray(2,2+tl));let p=2+tl;if((t>>1)&3)p+=2;
          try{me.onmsg&&me.onmsg(topic,td.decode(b.subarray(p)),!!(t&1))}catch(err){console.error(err)}}}};
    ws.onerror=()=>{};
    // 手機網路切換時 WebSocket 可能卡住不觸發 close，看門狗直接判定斷線
    let downed=false;const down=()=>{if(downed)return;downed=true;clearInterval(ping);clearInterval(dog);const was=me.up;me.up=false;me.ondown&&me.ondown(was)};
    /* 評審 P22 重連測試（tools/test-net-reconnect.js）：kill（網路恢復事件、看門狗）也要真的關掉舊連線，不然舊的 WebSocket 若其實還活著，收到的訊息會再處理一次（同一則邀請跳兩次） */
    ws.onclose=down;me.kill=()=>{try{ws.close()}catch(e){}down()};
    me.pub=(topic,s,retain)=>me.up&&send(pkt(0x30|(retain?1:0),[...str(topic),...te.encode(s)]));
    me.sub=ts=>{send(pkt(0x82,[pid>>8,pid&255,...ts.flatMap(t=>[...str(t),0])]));pid=pid%60000+1};
    me.unsub=ts=>{send(pkt(0xA2,[pid>>8,pid&255,...ts.flatMap(t=>str(t))]));pid=pid%60000+1};
    me.end=()=>{me.ondown=null;send(new Uint8Array([0xE0,0]));try{ws.close()}catch(e){}};
    return me}

  // ---------- 大廳 ----------
  const ls={get(k,d){try{const v=localStorage.getItem("xq_"+k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem("xq_"+k,JSON.stringify(v))}catch(e){}}};
  /* 回饋 842（兒童模式名字用稱號）：對外送出去的名字（在線狀態、邀請、對局、聊天、戰績摘要、千秋盃報名）先問 m/07x4-lobbysafe.js 的 XQ_PUBNAME：
     選「稱號」時回系統給的稱號（例如「長安小棋童」），選「我取的名字」回空字串＝照舊用自取的名字。存檔裡的名字（xq_me）不動；
     自己畫面上看到的對局（game()、fetchGame()）和自己的聊天，換回自己取的名字（realNm） */
  const pubNm=m=>{try{return typeof window.XQ_PUBNAME==="function"?String(window.XQ_PUBNAME(m)||"").slice(0,16):""}catch(e){return""}};
  const me=()=>{const m=window.meInfo?meInfo():{id:"anon"+Math.random().toString(36).slice(2,8),name:""};return{id:m.id,name:pubNm(m)||m.name||("棋友"+m.id.slice(0,4))}};
  const realNm=()=>{let m=null;try{m=window.meInfo?meInfo():null}catch(e){}return m&&m.name||me().name};
  const locG=g=>{if(!g||!g.red||!g.black)return g;const i=me().id,rn=realNm();let o=g;for(const k of["red","black"])if(o[k].id===i&&rn&&o[k].name!==rn){if(o===g)o=Object.assign({},g);o[k]=Object.assign({},o[k],{name:rn})}return o};
  let gvS=null,gvN="",gvL=null;
  /* 回饋 841（開發者 11/9 選：大廳檢舉封鎖）：封鎖名單存在這支手機（m/07x4-lobbysafe.js 的 XQ_BLOCKED）。被封鎖的人：people() 裡藏起來（名冊、燈籠、觀戰清單都讀這個）、
     邀請自動婉拒、隨機配對跳過他、對局裡他的表情和聊天不顯示（chatLog／emotes 讀的時候濾掉，封鎖前收到的也一起藏） */
  const blk=id=>{try{return!!id&&typeof window.XQ_BLOCKED==="function"&&!!window.XQ_BLOCKED(id)}catch(e){return false}};
  /* 回饋 841：隨機配對被婉拒（對方封鎖我、或對方剛好在忙）的人，45 秒內先不再邀他，免得一直互丟邀請 */
  const nope={};
  /* 回饋 852（停權名單）：停權名單上的別人，m/07x4-lobbysafe.js 的 XQ_BLOCKED 已經一起擋（名冊、燈籠、觀戰、配對、邀請、聊天、表情）；
     XQ_BANNED 只看停權名單（千秋盃報名名單藏起來用）；自己被停權（XQ_SELFBANNED）：不公開在線狀態和戰績摘要（清掉保留的在線狀態）、
     不能邀請、隨機配對、報名千秋盃、傳表情，別人的邀請一律婉拒。轉移碼、匿名答題、意見回饋通知照常 */
  const ban=id=>{try{return!!id&&typeof window.XQ_BANNED==="function"&&!!window.XQ_BANNED(id)}catch(e){return false}};
  const selfBan=()=>{try{return typeof window.XQ_SELFBANNED==="function"&&!!window.XQ_SELFBANNED()}catch(e){return false}};
  /* 回饋 851：選「稱號」的人（XQ_PUBNAME 有回東西）對外不送城市 */
  const titled=()=>{try{return!!pubNm(window.meInfo?meInfo():{})}catch(e){return false}};
  /* 回饋 850（線上聊天只能用快捷語）：收到的文字只顯示快捷語清單裡的原句（m/07x4-lobbysafe.js 的 XQ_CHAT_OK 對 EMOTES）；舊版送來的自由文字不顯示 */
  const chatOk=t=>{try{return typeof window.XQ_CHAT_OK==="function"?!!window.XQ_CHAT_OK(t):true}catch(e){return false}};
  let cupS=null,cupF=null;
  let cli=null,want=false,urlI=0,everUp=false,hb=null,retryT=null,people={},pending=null,G=null,emos=[],emoN=0,seeking=0,pendT=null,dirty=false,downAt=0,arr={n:-1,t:0};
  /* 回饋 854：BOTS_ST＝sys/bots（大廳角色程式在不在線、角色代號）；那條連線斷了，角色們一起當作離線（角色共用一條連線，沒有各自的遺囑）。
     ONL＝sys/online 的在線人數。botMem：看過的角色（名單收掉後，邀請時還認得出是角色） */
  let BOTS_ST=null,ONL=null;const botMem={};
  const fresh=(x,now)=>!!x&&!(BOTS_ST&&!BOTS_ST.up&&BOTS_ST.ids.has(x.id))&&(x.v>=2&&x.ts?now-x.ts<ALIVE2:now-x.at<ALIVE);
  /* 意見回饋 282：時制（每方幾分鐘）。自己選的存在手機裡，沒選＝15 分；雙方不同取比較短的 */
  /* 意見回饋 328：預設每方 30 分鐘；兩個真人的時制要一樣才能開局（大廳的角色會配合對方） */
  const TCS=[5,10,15,20,30],tcPref=()=>{const v=+ls.get("tc",30);return TCS.includes(v)?v:30};
  /* 意見回饋 336：大廳拿掉時制選單，以前自己選過的一律回到預設 30 分鐘（之後只在邀請時講好再改） */
  try{if(+ls.get("tcV",0)<2){ls.set("tc",30);ls.set("tcV",2)}}catch(e){}
  const isBot=id=>!!(people[id]&&people[id].bot)||!!botMem[id]||!!(BOTS_ST&&BOTS_ST.ids.has(id)),tcOf=f=>TCS.includes(+(f&&f.tc))?+f.tc:null,tcOk=f=>isBot(f.id)||tcOf(f)===tcPref();
  let tcWaitAt=0;
  /* 輪到的一方從什麼時候開始算時間：走棋的人會寫 tk；舊版或沒寫的話，用這支手機收到那一步的時間 */
  /* QA P1-2：兩支手機的時鐘可能差很多，所以計時一律用「這支手機收到（或自己走出）這一步的時間」，不用對方手機寫的時間 */
  const effTk=g=>arr.n===g.moves.length?arr.t:g.tk&&g.tkN===g.moves.length?g.tk:(g.at||Date.now());
  const turnAt=g=>arr.n===g.moves.length?arr.t:Date.now();
  let seenAt=Date.now();
  const clockLeft=(g,s)=>!g||!g.clk?null:g.clk[s]-(!g.result&&(g.moves.length%2?"b":"r")===s?Date.now()-effTk(g):0);
  let cur=ls.get("net",null);   // 目前在哪一盤：{gid}；自己是紅、黑還是觀眾，看對局狀態裡的代號
  const L={};const on=(ev,f)=>{(L[ev]=L[ev]||[]).push(f);return()=>{L[ev]=L[ev].filter(x=>x!==f)}};const emit=(ev,d)=>(L[ev]||[]).forEach(f=>{try{f(d)}catch(e){console.error(e)}});
  const gt=gid=>[`${ROOT}/g/${gid}/+`];   /* 回饋 854：對局狀態 s 和表情 e 合成一個訂閱（專用伺服器每條連線最多 10 個訂閱） */
  const side=()=>{if(!G)return null;const i=me().id;return G.red.id===i?"r":G.black.id===i?"b":null};
  const playing=()=>!!(cur&&G&&!G.result&&side());   // 真的在下一盤還沒結束的棋
  // ---------- 線上積分：從 0 分開始，贏加分、輸扣分；對手段位越高，贏得越多、輸得越少 ----------
  const RANKS=[["新手",0],["入門1",50],["入門2",100],["入門3",150],["業1",200],["業2",300],["業3",400],["業4",500],["業5",600],["業6",700],["業7",800],["業8",900],["業9",1000],["專1-1",1150],["專1-2",1300],["專2-1",1500],["專2-2",1700]];
  const rankIdx=p=>{let i=0;for(let k=0;k<RANKS.length;k++)if((p||0)>=RANKS[k][1])i=k;return i};
  const rankOf=p=>RANKS[rankIdx(p)][0];
  /* 數學修正 11/11（審查 5-C）：線上段位也加遲滯（跟 src/local.js 的 rankHold 同一段邏輯）：升段馬上升、降段要掉到本段下限再減半個段寬且升段後至少 3 盤；
     K 值：開發者 11/11 照三方審查維持 48（<15 盤）／32（之後），不降到 24（K＝24 讓進步的孩子升段慢 40～60%）。Elo K=32 的穩態標準差約 53 分，比入門段寬 50 大，所以遲滯是必要的。
     模擬（mathfix2/sim/review-rank.js，有回復力的 Elo、業2 附近）：每 100 盤段位變動 15→3.4 次，顯示段位平均比積分段位高約 0.25 段。
     別人看到你的段位是用你的積分算的（rankOf），跟你自己看到的遲滯段位偶爾會差一段，先接受 */
  const rankHold=(R,before)=>{const n=(R.w||0)+(R.l||0)+(R.d||0);if(R.rk==null||!RANKS[R.rk])R.rk=rankIdx(before!=null?before:R.pts);const i=rankIdx(R.pts);
    if(i>R.rk){R.rk=i;R.pn=n}else if(i<R.rk){const lo=RANKS[R.rk][1],w=(RANKS[R.rk+1]?RANKS[R.rk+1][1]:lo+200)-lo;if(R.pts<lo-w/2&&n-(R.pn||0)>=3)R.rk=i}return R.rk};
  const heldIdx=R=>R.rk!=null&&RANKS[R.rk]?R.rk:rankIdx(R.pts),kOf=n=>n<15?48:32;
  const rec=()=>ls.get("rate",null)||{pts:0,w:0,l:0,d:0,hist:[]};
  const myPts=()=>rec().pts;
  function record(){if(!G||badG.has(G.gid)||sgLegacy(G)||G.rules!==RULE_ID||!rcRated(G)||!G.result||G.result.abort||G.result.forfeit||(G.moves.length<2&&!G.result.timeout))return;   // 超時判負一定計分   // 雙方都還沒走就結束：不計分
    const s=side();if(!s)return;const R=rec();if(R.hist.some(h=>h.gid===G.gid&&(!h.rid||h.rid===G.id)))return;   /* 意見回饋 619：「再來一局」沿用同一個 gid，改用 gid＋這盤的 id 判斷有沒有記過，第二盤以後才會記進戰績 */
    const o=s==="r"?G.black:G.red,op=o.pts!=null?o.pts:(people[o.id]&&people[o.id].pts)||0;
    /* 意見回饋 段位失準：原本贏 +20、輸 −15 會停在勝率 43% 那一階、而且越下越高（每盤淨增 5 分）。
       改成等級分的期望勝率：E＝1/(1+10^((對手−自己)/400))，加減＝K×(結果−E)，雙方一加一減會抵銷；前 15 盤 K＝48 比較快定位，之後 K＝32 */
    const res=G.result.w==null?"d":G.result.w===s?"w":"l",E=1/(1+Math.pow(10,(op-R.pts)/400)),K=kOf(R.w+R.l+R.d);
    let d=Math.round(K*((res==="w"?1:res==="d"?.5:0)-E));if(res==="w"&&d<1)d=1;if(res==="l"&&d>-1)d=-1;
    const before=R.pts,rk0=heldIdx(R),pn0=R.pn;R.pts=Math.max(0,R.pts+d);d=R.pts-before;R[res]++;rankHold(R,before);   /* k0、p0：記下這盤之前的顯示段位，萬一棋鐘競逐改判要撤回這筆（unrecord，數值盤查 11/11 P1） */
    R.hist.unshift({gid:G.gid,rid:G.id,opp:o.name,oid:o.id,res,d,k0:rk0,p0:pn0,pts:R.pts,why:G.result.why||"",n:G.moves.length,at:Date.now(),sd:s,me:realNm()||(s==="r"?G.red:G.black).name||"",mv:G.moves.map(([f,t])=>String(f).padStart(2,"0")+String(t).padStart(2,"0")).join("")});R.hist=R.hist.slice(0,100);ls.set("rate",R);pubHist();   /* 意見回饋 619：每盤戰績帶一份棋步（每步 4 個數字，34 步約 136 字），棋譜存檔不見、換手機時還能從這裡補回來 */
    presence();emit("rated",{res,d,pts:R.pts,rank:RANKS[R.rk][0],was:RANKS[rk0][0]})}
  /* ChatGPT 數值盤查 11/11 P1 棋鐘（雙端競逐）：同一盤先記了結果、後來競逐裁決改判（flagTie）時，撤回那一筆積分（加減的分、勝負場數、顯示段位都回到這盤之前） */
  function unrecord(g){if(!g)return;const R=rec(),i=R.hist.findIndex(h=>h.gid===g.gid&&(!h.rid||h.rid===g.id));if(i<0)return;const h=R.hist[i];
    R.pts=Math.max(0,R.pts-(+h.d||0));if(R[h.res]>0)R[h.res]--;if(h.k0!=null&&RANKS[h.k0]){R.rk=h.k0;R.pn=h.p0}R.hist.splice(i,1);ls.set("rate",R);pubHist()}
  /* 意見回饋 283：把自己最近 30 盤的摘要公開放在大廳（保留訊息），別人點你的資料卡就能看你的線上棋譜和戰績分析 */
  function pubHist(){if(!cli||!cli.up||selfBan())return;const m=me(),R=rec();   /* 回饋 852：停權中不公開戰績摘要 */
    cli.pub(`${ROOT}/h/${m.id}`,JSON.stringify({v:1,id:m.id,name:m.name,at:Date.now(),list:R.hist.slice(0,30).map(h=>({gid:h.gid,id:h.rid,opp:h.opp,oid:h.oid,res:h.res,why:h.why,n:h.n,at:h.at,sd:h.sd||null})),prof:(()=>{try{return typeof window.XQ_prof==="function"?window.XQ_prof():null}catch(e){return null}})()}),true)}   /* 意見回饋 307：附上自己的戰力五角形和天賦摘要 */
  /* 意見回饋 301：匿名答題結果（題號、對錯、秒數，沒有名字和代號）送到大廳的 irt 頻道，開發者電腦收集後校正題目難度 */
  /* 11/11 隱私文件盤點：家長關掉線上大廳（07x4 把它當成 XQ_SELFBANNED）時，匿名資料（卡關、對局評分、作答…）也不送、不排隊——設定頁說明早就這樣寫 */
  /* 資料保留期限（開發者 11/11）：「📈 匿名送出學習進度」關掉時（05b-save.js 的 window.XQ_ANON_OK 回 false），新手流程、作答、成長曲線不排隊也不送；排隊中的也在送出前再擋一次 */
  const anonOk=x=>{try{return typeof window.XQ_ANON_OK!=="function"||!!window.XQ_ANON_OK(x)}catch(e){return true}};
  /* 評審 P22 重連測試：一則一則送到一半又斷線時，還沒送出去的放回排隊（以前清掉排隊後才慢慢送，斷在中間的就不見了）；下次連上再補送，已經換上新連線的話馬上補送 */
  function flushIRT(){if(!cli||!cli.up||selfBan())return;const q=ls.get("irtQ",[]).filter(anonOk);if(!q.length){ls.set("irtQ",[]);return}const c=cli;q.forEach((x,k)=>setTimeout(()=>{if(!(c.up&&c.pub(`${ROOT}/irt`,JSON.stringify(x)))&&anonOk(x)){const r=ls.get("irtQ",[]);r.push(x);ls.set("irtQ",r.slice(-20));if(cli&&cli!==c&&cli.up)flushIRT()}},k*150));ls.set("irtQ",[])}   /* 回饋 854：一則一則隔開送（專用伺服器每條連線每秒最多收 10 則） */
  /* 回饋 854：有變化才送。內容（不含時間）跟上次一樣、同一條連線、還不到 30 分鐘，就不送；force＝一定送（剛連上、被別人的遺囑清掉） */
  let lastP="",lastPAt=0,lastPCli=null;
  function presence(force){if(!cli||!cli.up)return;const m=me(),sd=side(),now=Date.now();
    if(selfBan()){if(force||lastP!=="ban"||lastPCli!==cli){lastP="ban";lastPCli=cli;cli.pub(`${ROOT}/u/${m.id}`,"",true)}return}   /* 回饋 852：停權中不出現在大廳（清掉以前留在伺服器上的在線狀態） */
    const o={id:m.id,name:m.name,st:cur&&!(G&&G.result)?(sd?"playing":"watching"):seeking?"seeking":"idle",gid:cur&&cur.gid||null,pts:myPts(),tc:tcPref(),w:rec().w,l:rec().l,d:rec().d,kind:typeof MY_KIND!=="undefined"?MY_KIND:"",city:typeof MY_CITY!=="undefined"&&!titled()?MY_CITY:"",bot:typeof window.XQ_BOTLOOK==="function"?window.XQ_BOTLOOK():null,title:typeof window.XQ_TITLE==="function"?window.XQ_TITLE():"",pk:PK||undefined};   /* 評審 P22 對局簽名：公開金鑰（觀眾核對用） */
    const k=JSON.stringify(o);if(!force&&k===lastP&&cli===lastPCli&&now-lastPAt<REFRESH)return;lastP=k;lastPAt=now;lastPCli=cli;
    o.v=PV;o.ts=now;o.at=now+AHEAD;cli.pub(`${ROOT}/u/${m.id}`,JSON.stringify(o),true)}
  /* 回饋 854：自己的在線狀態被清掉（換網路時舊連線的遺囑晚一步才發、或別人誤清）：還連著就馬上補送 */
  let healT=null;const heal=()=>{if(!cli||!cli.up||selfBan())return;clearTimeout(healT);healT=setTimeout(()=>presence(true),400+Math.random()*1200)};
  /* 回饋 854：伺服器上留了 6 小時以上沒更新的在線狀態（幽靈玩家）：剛訂閱時收到的保留訊息才清，每人只清一次（對方如果其實還在，他會自己補送） */
  const swept={};
  function sweep(id,x,retain){if(!retain||swept[id]||id===me().id)return;const t=x.v>=2?+x.ts:+x.at;if(!(Date.now()-t>6*3600e3))return;swept[id]=1;
    setTimeout(()=>{const y=people[id];if(cli&&cli.up&&y&&(y.v>=2?+y.ts:+y.at)===t)cli.pub(`${ROOT}/u/${id}`,"",true)},2000+Math.random()*8000)}
  /* 回饋 854：整份在線名單（u/+）只在要列出在線玩家的頁面訂閱：線上大廳（含名冊、燈籠地圖、隨機配對）、千秋盃、線上對局頁（對手在不在、誰在觀戰）；
     正在找對手、等對方回邀請時也要。離開這些頁再留 3 分鐘（LINGER，來回切頁不用重抓整份名單）。
     其他頁只訂自己和手上這盤雙方的在線狀態（u/<代號>），邀請（i/<自己>）和自己的對局照收 */
  const ROSTER_PG=/^#\/(lobby|cup)(\/|$)/;
  let rosterOn=false,rosterTill=0,rosterHold=0;const trk=new Set();
  const rosterNeed=()=>{const h=String(location.hash||"");return ROSTER_PG.test(h)||(/^#\/pvp(\/|$)/.test(h)&&!!cur)||!!seeking||!!pending||Date.now()<rosterHold};
  const prune=()=>{let ch=false;for(const id in people)if(!trk.has(id)){if(people[id]&&people[id].bot)botMem[id]=1;delete people[id];ch=true}if(ch)emit("people")};
  /* 收著整份名單時，自己和對手的個別訂閱就收掉（u/+ 已經包含），省訂閱數；先訂新的再退舊的，中間不漏訊息 */
  function syncRoster(){if(!cli||!cli.up)return;const now=Date.now();if(rosterNeed())rosterTill=now+LINGER;const w=now<rosterTill;
    const need=new Set();if(!w){need.add(me().id);if(cur&&G){need.add(G.red.id);need.add(G.black.id)}}
    const add=[...need].filter(i=>!trk.has(i)),rm=[...trk].filter(i=>!need.has(i));
    if(add.length){add.forEach(i=>trk.add(i));cli.sub(add.map(i=>`${ROOT}/u/${i}`))}
    let ch=false;if(w&&!rosterOn){rosterOn=true;prune();cli.sub([`${ROOT}/u/+`])}else if(!w&&rosterOn){rosterOn=false;cli.unsub([`${ROOT}/u/+`]);ch=true}
    if(rm.length){rm.forEach(i=>trk.delete(i));cli.unsub(rm.map(i=>`${ROOT}/u/${i}`));ch=true}
    if(ch&&!rosterOn)prune()}
  window.addEventListener("hashchange",()=>setTimeout(syncRoster,0));
  // 隨機配對：大家都把狀態設成 seeking；代號最小的人去邀請下一位，被邀請的人自動接受（避免兩邊同時互邀）
  function tryMatch(){if(!seeking||pending||playing()||!cli||!cli.up||selfBan())return;const i=me().id,now=Date.now();
    const all=Object.values(people).filter(x=>x.st==="seeking"&&x.id!==i&&fresh(x,now)&&!blk(x.id)),c=all.filter(x=>tcOk(x)&&!(now-(nope[x.id]||0)<45000)).sort((a,b)=>a.id<b.id?-1:1);   /* 回饋 841：配對跳過封鎖的人、剛婉拒過的人 */
    if(!c.length&&all.length&&now-tcWaitAt>60000){tcWaitAt=now;emit("tcwait",{list:all.map(x=>({name:x.name,tc:tcOf(x)})),tc:tcPref()})}
    if(!c.length||c[0].id<i)return;   // 有人代號比我小：等他來邀請
    sendInvite(c[0],true)}
  function sendInvite(to,auto){if(selfBan())return null;const m=me(),   /* 回饋 852：停權中不能邀請 */gid=Math.random().toString(36).slice(2,10)+Date.now().toString(36);pending={gid,to:to.id,name:to.name,auto};
    cli&&cli.pub(`${ROOT}/i/${to.id}`,JSON.stringify({type:"invite",gid,auto:!!auto,from:{id:m.id,name:m.name,pts:myPts(),tc:tcPref(),rules:RULE_ID,rs:rsPref(),pk:PK||undefined},at:Date.now()}));
    clearTimeout(pendT);if(auto)pendT=setTimeout(()=>{if(pending&&pending.gid===gid){pending=null;tryMatch()}},8000);return gid}
  function connect(){if(cli||!want)return;const m=me();
    cli=mqtt(URLS[urlI],{clientId:"xq"+m.id.slice(0,12)+Math.random().toString(36).slice(2,8),keepalive:30,will:{topic:`${ROOT}/u/${m.id}`,payload:"",retain:true},user:MQA.user,pass:MQA.pass});
    /* 回饋 854：連上時不再一律訂整份名單（u/+），改由 syncRoster 看頁面決定；sys/+、cup/+ 用萬用字元合併（專用伺服器每條連線最多 10 個訂閱）。
       30 秒的計時器還在（判對方離線太久），但在線狀態要有變化或滿 30 分鐘才真的送 */
    cli.onup=()=>{everUp=true;downAt=0;upAt=Date.now();rosterOn=false;trk.clear();prune();cli.sub([`${ROOT}/i/${m.id}`,`${ROOT}/sys/+`,`${ROOT}/cup/+`,...(cur?gt(cur.gid):[]),...Object.keys(QS).map(k=>`${ROOT}/${k}`)]);syncRoster();presence(true);pubHist();flushIRT();clearInterval(hb);hb=setInterval(()=>{presence();staleCheck()},30000);
      if(dirty&&G){dirty=false;setTimeout(()=>{if(G&&cli&&cli.up)pubGame()},600)}if(cur&&!G)waitGame(cur.gid,false);emit("status")};
    cli.onmsg=onMsg;
    cli.ondown=was=>{cli=null;clearInterval(hb);if(!downAt)downAt=Date.now();emit("status");
      clearTimeout(retryT);if(want)retryT=setTimeout(connect,backoff(was))}}
  /* 評審 P22（重連風暴）：以前連不上一律每 3 秒重試、斷線一律 0.8 秒重連；伺服器掛掉時每支手機一分鐘敲 20 次，連上又被踢的話更是不停重連。
     改成：連續失敗（連不上、或連上不到 60 秒又斷）重試間隔加倍 3、6、12、24、48 秒，最多 60 秒，再乘 0.8～1.2 的亂數錯開（伺服器恢復時大家不會同一秒湧進來）；
     穩定連了 60 秒以上才斷的，照舊約 0.8 秒就重連。切回 App、手機說網路恢復（kick）不等間隔，直接連 */
  let fails=0,upAt=0;
  const backoff=was=>{if(was&&Date.now()-upAt>=60000)fails=0;const d=was&&!fails?800:Math.min(60000,3000*Math.pow(2,Math.min(fails,5)));fails++;return Math.round(d*(0.8+Math.random()*0.4))};
  const W={};   // 一次性查詢保留訊息（例如電腦的新網址）
  /* 合作殘譜（開發者 11/9；m/07q2-coop.js，設計 story/合作殘譜_同桌與大廳_設計_1109.md）：大廳「🧩 殘篇閣」用的通用頻道，只准 ROOT/q/… 底下的主題（q/h、q/r/<rid>/s、q/r/<rid>/e）；
     QS＝主題 → 處理函式清單，重新連上時一起訂回去。舊版 App 不訂 q/，收不到也不受影響；這組 API 發不到 sys、cup、cal、ctl、c/ */
  const QS={},qRel=r=>{if(typeof r!=="string"||!/^q(\/[\w-]{1,40}){1,3}(\/\+)?$/.test(r))throw new Error("殘篇閣主題不合規："+r);return r};
  const qHit=(k,rel)=>k===rel||(k.endsWith("/+")&&rel.startsWith(k.slice(0,-1))&&rel.length>k.length-1&&rel.indexOf("/",k.length-1)<0);
  function onMsg(topic,msg,retain){if(W[topic]){W[topic](msg);return}const p=topic.slice(ROOT.length+1).split("/");
    if(p[0]==="q"){const rel=p.join("/");for(const k in QS)if(qHit(k,rel))QS[k].slice().forEach(f=>{try{f(rel,msg,retain)}catch(e){console.error(e)}});return}   /* 合作殘譜 */
    if(p[0]==="sys"&&p[1]==="ver"){try{emit("version",JSON.parse(msg))}catch(e){}return}
    if(p[0]==="sys"&&p[1]==="bots"){try{const x=msg?JSON.parse(msg):null;BOTS_ST=x&&Array.isArray(x.ids)?{up:!!x.up,ids:new Set(x.ids.map(String))}:null}catch(e){BOTS_ST=null}emit("people");return}   /* 回饋 854 */
    if(p[0]==="sys"&&p[1]==="online"){try{const x=msg?JSON.parse(msg):null;ONL=x&&isFinite(x.n)?{n:+x.n,at:+x.at||0}:null}catch(e){ONL=null}emit("people");return}   /* 回饋 854 */
    if(p[0]==="sys"||p[0]==="cup"&&p[1]==="req")return;
    if(p[0]==="cup"&&(p[1]==="state"||p[1]==="hall")){if(!msg)return;cupVerify(msg).then(d=>{if(!d)return;if(p[1]==="state"){if(CUP&&d.wk===CUP.wk&&(d.n||0)<(CUP.n||0))return;CUP=d}else CUPHALL=d;emit("cup",p[1])});return}
    if(p[0]==="u"){const id=p[1];if(!rosterOn&&!trk.has(id))return;   /* 回饋 854：名單已經收掉（取消訂閱前就送出來的） */
      if(!msg){delete people[id];if(id===me().id)heal()}
      else{try{const x=JSON.parse(msg);if(x&&x.id===id){if(x.v>=2)x.at=Math.min(Date.now(),+x.ts||Date.now());people[id]=x;sweep(id,x,retain)}}catch(e){}}   /* 回饋 854：新版的 at 是「現在＋32 分鐘」給舊版看的，存起來前換回更新時間（資料卡「幾分鐘前更新」用） */
      emit("people");tryMatch();return}
    if(p[0]==="i"){let x;try{x=JSON.parse(msg)}catch(e){return}if(!x||!x.from||Date.now()-(x.at||0)>120000)return;
      if((x.type==="invite"||x.type==="accept")&&x.from.rules!==RULE_ID){
        ruleMismatch();const m=me();cli&&cli.pub(`${ROOT}/i/${x.from.id}`,JSON.stringify({type:"decline",gid:x.gid,from:{id:m.id,name:m.name,rules:RULE_ID,rs:rsPref()},at:Date.now()}));
        if(pending&&pending.gid===x.gid){pending=null;clearTimeout(pendT)}return;}
      if(x.from.bot&&typeof x.from.id==="string")botMem[x.from.id]=1;   /* 回饋 854：角色的邀請會註明 bot（不在大廳頁、沒收名單時也認得出來，不跳「時制不一樣」） */
      if(x.type==="invite"&&x.auto){   // 隨機配對來的：還在找就自動接受，不然婉拒
        const m=me();const ok=!!seeking&&!playing()&&!pending&&tcOk(x.from)&&!blk(x.from.id)&&!selfBan();cli&&cli.pub(`${ROOT}/i/${x.from.id}`,JSON.stringify({type:ok?"accept":"decline",gid:x.gid,from:{id:m.id,name:m.name,pts:myPts(),tc:tcPref(),rules:RULE_ID,rs:rsPref(),pk:ok&&PK||undefined},at:Date.now()}));
        if(ok){sgAccepted(x);seeking=0;G=null;enter(x.gid);waitGame(x.gid,true);emit("matched",{name:x.from.name})}}
      else if(x.type==="invite"){if(blk(x.from.id)||selfBan()){const m=me();cli&&cli.pub(`${ROOT}/i/${x.from.id}`,JSON.stringify({type:"decline",gid:x.gid,from:{id:m.id,name:m.name,pts:myPts(),tc:tcPref(),rules:RULE_ID,rs:rsPref()},at:Date.now()}))}else emit("invite",x)}   /* 回饋 841：封鎖的人送來的邀請，不跳視窗、直接婉拒 */
      else if(x.type==="accept"&&pending&&pending.gid===x.gid){const m=me(),auto=pending.auto;pending=null;clearTimeout(pendT);seeking=0;
        let red={id:m.id,name:m.name,pts:myPts(),pk:PK||undefined},black={id:x.from.id,name:x.from.name,pts:+x.from.pts||0,pk:sgPk(x.from.pk)};if(Math.random()<.5)[red,black]=[black,red];   // 紅黑一律隨機（意見回饋 191）
        const tc=tcPref(),now=Date.now();
        G={rules:RULE_ID,rc:netRc(x.from.rs),gid:x.gid,id:new Date().toISOString().replace(/[:.]/g,"-").slice(0,19),rev:1,red,black,moves:[],result:null,draw:null,at:now,tc,clk:{r:tc*60000,b:tc*60000},tk:now,tkN:0};
        sgBind(G);enter(x.gid);pubGame();emit(auto?"matched":"start",{gid:x.gid,name:x.from.name});rcNotice(G)}
      else if(x.type==="decline"&&pending&&pending.gid===x.gid){const auto=pending.auto;pending=null;clearTimeout(pendT);if(auto){nope[x.from.id]=Date.now();tryMatch()}else emit("reply",{ok:false,name:x.from.name})}   /* 回饋 841：記下誰婉拒了隨機配對 */
      else if(x.type==="cancel"&&!blk(x.from.id))emit("cancel",x);
      return}
    if(p[0]==="g"&&cur&&p[1]===cur.gid){
      if(p[2]==="s"){if(!msg)return;let x;try{x=JSON.parse(msg)}catch(e){return}if(!x||x.gid!==p[1]||!Array.isArray(x.moves)||!x.red||!x.black)return;
        vq=vq.then(()=>sgVet(x)).then(v=>{if(!cur||cur.gid!==x.gid)return;if(v.ok)gameIn(x,msg);else sgBad(x,v.why)}).catch(e=>console.error(e))}   /* 評審 P22 對局簽名：先驗簽（照收到的順序一則一則驗），過了才交給 gameIn（原本這裡的那段，含棋規握手的 rcNotice） */
      else if(p[2]==="e"){try{const x=JSON.parse(msg),sid=G&&(x.by==="r"||x.by==="b")?(x.by==="r"?G.red.id:G.black.id):String(x.id||"");   /* 回饋 841：記下是誰傳的（照紅黑方對到對局裡的代號；新版也會附上 id），讀的時候濾掉封鎖的人 */
        emos.push({id:++emoN,by:x.by,sid,e:String(x.e||"").slice(0,12),text:String(x.text||"").slice(0,80),name:sid&&sid===me().id?realNm().slice(0,16):String(x.name||"").slice(0,16),at:Date.now()});   /* 回饋 842：自己的聊天在自己畫面顯示自己取的名字 */
        emos=emos.slice(-40);emit("game")}catch(e){}}}}
  /* QA P1-1：公開伺服器上誰都能發對局狀態。自己在下這盤時，只接受合理的下一步：紅黑雙方不變；只多出對方的一步（或對方悔掉他自己的一步），而且整盤棋步都合法；
     判對方贏的結果要站得住（將死等規則判得出來，或自己真的超時）；判和要自己先提和、或規則判和 */
  /* 開發者 11/11（大廳規劃書票 2.2）：對手送來的棋步重演起來不合法（連走兩步、馬走田…）＝擋下、這盤只算友誼賽不計分，通知畫面一次。
     只看「棋步本身不合法」，不看網路延遲造成的少一步、多一步（那些照舊默默忽略，免得誤判） */
  const badG=new Set();
  function badCheck(x){try{if(!x||!G||badG.has(G.gid)||!window.XQ_netCheck)return;const v=window.XQ_netCheck(x.moves,x.rc);if(v&&v.ok)return;badG.add(G.gid);emit("abnormal",{gid:G.gid,why:"illegal"})}catch(e){}}
  const tmOf=g=>g.moves.length%2?"b":"r";
  function okNext(a,b){const me=side();try{
    if(a.rules!==b.rules||rcKey(a)!==rcKey(b))return false;   /* 棋規設定下到一半也不能換 */
    if(a.result&&!b.result)return b.red.id===a.black.id&&b.black.id===a.red.id&&!b.moves.length;
    if(b.red.id!==a.red.id||b.black.id!==a.black.id||a.result)return false;
    const o=oppOf(me),A=a.moves,B=b.moves,n=Math.min(A.length,B.length);
    for(let i=0;i<n;i++)if(!B[i]||A[i][0]!==B[i][0]||A[i][1]!==B[i][1])return false;
    if(B.length===A.length+1){if(tmOf(a)!==o)return false}
    else if(B.length===A.length-1){if(a.cup||((A.length-1)%2?o!=="b":o!=="r"))return false}   /* 擂台比賽落子無悔 */
    else if(B.length!==A.length)return false;
    const v=window.XQ_netCheck?window.XQ_netCheck(B,b.rc):{ok:true,res:null};if(!v||!v.ok)return false;
    if(!b.result)return true;const w=b.result.w;
    if(w===me||b.result.abort)return true;
    if(v.res&&v.res.w===w)return true;
    if(w===null)return a.draw===me;
    if(b.result.timeout&&tmOf(a)===me){const c=a.clk?clockLeft(a,me):Infinity;return Math.min(c,TURN_MS-(Date.now()-turnAt(a)))<FLAG_GRACE}
    return false}catch(e){return false}}
  /* ChatGPT 數值盤查 11/11 P1 棋鐘（線上雙端競逐）：輪到 A 走、A 在最後一刻落子（M），同時 B 的手機判 A 超時（T）——兩邊各自把 rev 加 1 送出，
     舊版看到「rev 一樣」就各自忽略對方，結果 A 以為棋還在下、B 以為贏了，伺服器上留的是後到的那份。
     現在兩端用同一條規則裁決，只看兩份狀態的內容（不看各自手機的時鐘），所以兩端一定選同一份：
       M 是 A 自己記下的「落子當下的剩餘時間」lft（tickMove 寫的，取棋鐘剩餘和每步 3 分鐘剩餘的較小者；lfN＝它屬於第幾手）。
       lft ≥ FLAG_GRACE（5 秒，跟 okNext 承認對方判超時的寬限同一個數）＝A 確實還有時間，B 的時鐘慢太多 → 落子 M 算數；
       否則（只剩不到 5 秒、或舊版沒寫 lft）＝落旗優先 → 超時 T 算數。
     選完以後輸的一方改用贏的那份，再用更大的 rev 重送一次，蓋掉伺服器上留的那份；已經記過的積分如果被改判，先撤回（unrecord）再照新結果記。
     兩端都要是這個版本才保證一致（舊版仍是各自忽略） */
  const FLAG_GRACE=5000;
  function flagTie(a,b){try{if(!a||!b||a.gid!==b.gid||a.id!==b.id||a.rules!==b.rules)return null;
    const pair=(T,M)=>{if(!T.result||!T.result.timeout||(M.result&&M.result.timeout))return false;if(T.result.w!==oppOf(tmOf(T)))return false;
      if(M.moves.length!==T.moves.length+1)return false;for(let i=0;i<T.moves.length;i++)if(!M.moves[i]||!T.moves[i]||M.moves[i][0]!==T.moves[i][0]||M.moves[i][1]!==T.moves[i][1])return false;return true};
    let T=null,M=null;if(pair(a,b)){T=a;M=b}else if(pair(b,a)){T=b;M=a}else return null;
    return typeof M.lft==="number"&&M.lfN===M.moves.length&&M.lft>=FLAG_GRACE?M:T}catch(e){return null}}
  function flagRace(x){const w=flagTie(G,x);if(!w)return false;
    if(w===x){const was=G,before=side(),wasEnd=!!G.result;if(was.result&&JSON.stringify(was.result)!==JSON.stringify(x.result))unrecord(was);
      const n=JSON.parse(JSON.stringify(x));n.rev=Math.max(was.rev,x.rev)+1;n.at=Date.now();seenAt=n.at;if(n.moves.length!==was.moves.length)arr={n:n.moves.length,t:n.at};
      G=n;dirty=false;pubGame();if(side()!==before||!!G.result!==wasEnd)presence();record();emit("game")}
    else if(x.rev>=G.rev){const n=JSON.parse(JSON.stringify(G));n.rev=x.rev+1;n.at=Date.now();sgRelay(n,G);G=n;pubGame()}
    return true}
  /* 評審 P22 缺陷 d（tools/test-net-reconnect.js ⑤）：雙方在同一瞬間從同一份各改一次（一邊落子、一邊提和／悔棋／認輸…），兩份 rev 一樣、內容不同。
     以前只收「rev 更大」的，兩端各自忽略對方 → 分岔，3 分鐘後各判對方超時、都記勝場。棋鐘競逐（落子對判超時）照舊由上面的 flagRace 裁決，其餘的在這裡：
     兩端用同一條只看內容的規則選一份：①有結果（終局、認輸、判超時、和棋成立）的優先 ②棋步多的優先（落子贏過提和、悔棋）③都一樣就比內容字串，小的贏。
     輸的一方先檢查贏的那份是不是「從自己改動之前那份（G0）」改出來的合理下一步（okNext，跟平常收對方的狀態同一套），通過才採用；積分被改判先撤回再照新結果記。
     雙方都再用更大的 rev 重送一次（內容一樣），蓋掉伺服器上保留的那份；之後收到彼此那份內容一樣就不理，不會一直重送。觀眾只照規則選、不重送 */
  let G0=null;
  const gKey=g=>JSON.stringify([g.id||null,g.rules||null,g.red&&g.red.id,g.black&&g.black.id,g.moves||[],g.result||null,g.draw||null,g.clk||null]);
  const gRank=g=>[g.result?1:0,Array.isArray(g.moves)?g.moves.length:0];
  function revPick(a,b){const ra=gRank(a),rb=gRank(b);for(let i=0;i<ra.length;i++)if(ra[i]!==rb[i])return ra[i]>rb[i]?a:b;return gKey(a)<=gKey(b)?a:b}
  function revTie(x){if(!G||x.gid!==G.gid||gKey(x)===gKey(G))return;const sd=side();
    if(revPick(G,x)===G){if(sd){const n=JSON.parse(JSON.stringify(G));n.rev=x.rev+1;n.at=Date.now();sgRelay(n,G);G=n;pubGame()}return}
    if(sd&&!(G0&&G0.gid===x.gid&&G0.rev===x.rev-1&&okNext(G0,x))){badCheck(x);return}
    const was=G,before=sd,wasEnd=!!G.result;if(was.result&&JSON.stringify(was.result)!==JSON.stringify(x.result))unrecord(was);
    const n=JSON.parse(JSON.stringify(x));if(sd)n.rev=x.rev+1;n.at=Date.now();seenAt=n.at;if(n.moves.length!==was.moves.length)arr={n:n.moves.length,t:n.at};
    G=n;G0=null;dirty=false;if(sd)pubGame();if(side()!==before||!!G.result!==wasEnd)presence();record();emit("game")}
  /* ================= SIGN:BEGIN 對局簽名（評審 P22，開發者 11/11「肯定要做」：根治冒充對方認輸；測試 tools/test-net-sign.js） =================
     金鑰：每支手機一把 ECDSA P-256（WebCrypto；私鑰不可匯出），存在 IndexedDB「xqlab-sign」；沒有就產生。公開金鑰（raw 65 位元組、base64url）放在在線狀態、邀請、接受裡。
     綁定：邀請（invite.from.pk）和接受（accept.from.pk）交換公開金鑰；開局那份狀態的紅黑雙方都帶 pk，兩支手機各自把「這盤 gid：代號 → 公開金鑰」記在 BIND（存 localStorage，留最近 30 盤）。
       之後這盤只認這兩把金鑰；狀態裡的 pk 被換掉＝不收。觀眾沒有參與交換：第一次看到簽好名的狀態就記下來，在線狀態裡有公開金鑰的話要對得上。
     簽什麼：每份對局狀態帶 sg＝{s 座位, a 動作, r 這個動作當時的 rev, h 內容雜湊, p 前一份內容雜湊, k 簽名}，簽「xq-act1|gid|id|r|s|a|h|p」。
       內容雜湊 h＝狀態去掉 rev、at、sg、rl 以後的 JSON 做 SHA-256（所以同一份內容換更大的 rev 重送時雜湊不變）。
       只換 rev 重送同一份內容（flagRace、revTie 收斂、補回保留訊息）＝轉送：保留原本動作的 sg，另外加 rl＝{s, r 新 rev, h, k}，簽「xq-rel1|gid|id|r|s|h」。
     驗什麼（sgVet；保留訊息、重連補狀態、觀眾都一樣）：雙方金鑰跟綁定的一樣 → h 對得上內容 → 簽名是 s 那一方的金鑰 → 動作跟座位對得上（authOk：落子是那一步的人簽、
       悔棋是被悔那步的人簽、提和是提的人簽、認輸只能輸的那方簽、同意和要有結果、判自己贏又不是超時或中止的要棋規判得出來）→ r 不等於 rev 的要有座位的轉送簽名
       → 自己在下的這盤、rev 剛好多 1 的新動作，p 要等於手上這份的雜湊（防拼接）。過了才交給原本的 gameIn（okNext、flagRace、revTie 照舊，判超時照舊用自己的棋鐘核對）。
       沒過：不收、記一筆可疑事件（SUS，不跳視窗），自己在下的話把手上最後一份好的原始訊息重送一次（每 5 秒最多一次），蓋掉伺服器上被偽造的保留訊息。
     舊版相容：邀請或接受裡沒有 pk（舊版 App、或這支手機不能用 WebCrypto）＝這盤標成 legacy：照舊規則收發、不驗簽，但這盤**不計積分**（signState() 回 "legacy"，畫面寫「對方版本較舊，無法驗證」）。
       已經綁了金鑰的盤，沒有簽名的狀態一律不收（不能降級）。千秋盃（gid cup… 而且有 cup）由裁判台開局、目前還不簽，照舊收、照舊計分（signState() 回 "cup"）。 */
  const u64=u=>{const a=new Uint8Array(u);let s="";for(let i=0;i<a.length;i++)s+=String.fromCharCode(a[i]);return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")};
  const sgEnc=s=>new TextEncoder().encode(s),sgPk=v=>typeof v==="string"&&/^[A-Za-z0-9_-]{80,100}$/.test(v)?v:undefined;
  let KEY=null,PK=null;
  const keyIo=(db,mode,fn)=>new Promise((ok,no)=>{const t=db.transaction("k",mode),q=fn(t.objectStore("k"));t.oncomplete=()=>ok(q&&q.result);t.onerror=t.onabort=()=>no(t.error)});
  const keyP=(async()=>{try{if(!(window.crypto&&crypto.subtle))return null;let db=null,kp=null;
    try{db=await new Promise((ok,no)=>{const r=indexedDB.open("xqlab-sign",1);r.onupgradeneeded=()=>{try{r.result.createObjectStore("k")}catch(e){}};r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});kp=await keyIo(db,"readonly",s=>s.get("me"))}catch(e){}
    if(!kp||!kp.privateKey||!kp.publicKey){kp=await crypto.subtle.generateKey({name:"ECDSA",namedCurve:"P-256"},false,["sign","verify"]);
      if(db){try{await keyIo(db,"readwrite",s=>s.add(kp,"me"))}catch(e){}try{const k2=await keyIo(db,"readonly",s=>s.get("me"));if(k2&&k2.privateKey&&k2.publicKey)kp=k2}catch(e){}}}
    try{if(db)db.close()}catch(e){}KEY=kp;PK=u64(await crypto.subtle.exportKey("raw",kp.publicKey));if(cli&&cli.up)presence(true);return kp}catch(e){return null}})();
  const hcStr=g=>{const o={};for(const k in g)if(k!=="rev"&&k!=="at"&&k!=="sg"&&k!=="rl")o[k]=g[k];return JSON.stringify(o)};
  const sha=async s=>u64(await crypto.subtle.digest("SHA-256",sgEnc(s)));
  const impK={},pubKey=pk=>impK[pk]||(impK[pk]=crypto.subtle.importKey("raw",b64u(pk),{name:"ECDSA",namedCurve:"P-256"},false,["verify"]));
  const sigOk=async(pk,msg,sig)=>{try{return await crypto.subtle.verify({name:"ECDSA",hash:"SHA-256"},await pubKey(pk),b64u(sig),sgEnc(msg))}catch(e){return false}};
  const signS=async msg=>u64(await crypto.subtle.sign({name:"ECDSA",hash:"SHA-256"},KEY.privateKey,sgEnc(msg)));
  const actMsg=(x,e)=>["xq-act1",x.gid,x.id,e.r,e.s,e.a,e.h,e.p||""].join("|"),relMsg=(x,l)=>["xq-rel1",x.gid,x.id,l.r,l.s,l.h].join("|");
  const signedG=g=>!!(g&&g.red&&g.black&&sgPk(g.red.pk)&&sgPk(g.black.pk));
  const BIND=(()=>{const b=ls.get("netBind",{});return b&&typeof b==="object"?b:{}})();
  const bindSet=(gid,v)=>{BIND[gid]=Object.assign({t:Date.now()},v);Object.keys(BIND).sort((a,b)=>(BIND[b].t||0)-(BIND[a].t||0)).slice(30).forEach(k=>{delete BIND[k]});ls.set("netBind",BIND)};
  const sgLegacy=g=>!!(g&&BIND[g.gid]&&BIND[g.gid].legacy);
  /* 接受邀請／開局時綁金鑰：雙方都有公開金鑰＝簽名局，否則舊版局 */
  function sgAccepted(x){const fp=sgPk(x.from&&x.from.pk);if(PK&&fp)bindSet(x.gid,{k:{[me().id]:PK,[x.from.id]:fp}});else bindSet(x.gid,{legacy:true})}
  function sgBind(g){if(signedG(g))bindSet(g.gid,{k:{[g.red.id]:g.red.pk,[g.black.id]:g.black.pk}});else bindSet(g.gid,{legacy:true})}
  /* 自己的新動作：清掉抄來的簽名、記下前一份（簽 p 用）；只換 rev 重送：記下來源（沿用原本的簽名） */
  const sgFresh=(n,b)=>{delete n.sg;delete n.rl;Object.defineProperty(n,"_b",{value:b||null,configurable:true})},sgRelay=(n,src)=>{Object.defineProperty(n,"_s",{value:src,configurable:true})};
  const moverOf=i=>i%2?"b":"r",ACTS=new Set(["start","rematch","move","undo","draw","drawok","resign","flag","abort","claim","sync"]);
  function actOf(b,g,s){if(!b)return"start";if(g.id!==b.id)return"rematch";const L=g.moves.length,K=b.moves.length,r=g.result;
    if(L>K)return"move";if(r&&!b.result)return r.abort?"abort":r.timeout?"flag":r.w==null?"drawok":r.w===s?"claim":"resign";if(L<K)return"undo";if((g.draw||null)!==(b.draw||null))return"draw";return"sync"}
  function authOk(x,e){const s=e.s,r=x.result,n=x.moves.length,A=e.a;if((s!=="r"&&s!=="b")||!ACTS.has(A))return false;
    if((A==="start"||A==="rematch")&&(r||n))return false;
    if(A==="move"&&!(n>0&&moverOf(n-1)===s))return false;
    if(A==="undo"&&moverOf(n)!==s)return false;
    if(A==="draw"&&x.draw!=null&&x.draw!==s)return false;
    if(A==="resign"&&!(r&&r.w===oppOf(s)&&!r.timeout&&!r.abort))return false;
    if(A==="drawok"&&!(r&&r.w==null&&!r.abort))return false;
    if(A==="flag"&&!(r&&r.timeout))return false;
    if(A==="abort"&&!(r&&r.abort))return false;
    if(A==="claim"&&!r)return false;
    if(r&&!r.abort&&!r.timeout&&r.w===s){let v=null;try{v=window.XQ_netCheck?window.XQ_netCheck(x.moves):null}catch(err){}if(!(v&&v.ok&&v.res&&v.res.w===s))return false}
    return true}
  /* 還沒綁金鑰的盤（觀眾、或這支手機的綁定紀錄不見了）：從這份狀態推一個綁定，驗過簽名才記下來 */
  function sgBindFrom(x){const i=me().id,seat=x.red.id===i?"red":x.black.id===i?"black":null;
    if(/^cup/.test(String(x.gid))&&x.cup)return{cup:true};
    if(!signedG(x)){for(const k of["red","black"]){const pp=people[x[k].id];if(pp&&sgPk(pp.pk))return null}if(seat&&PK&&sgPk(x[seat==="red"?"black":"red"].pk))return null;return{legacy:true}}
    if(seat&&x[seat].pk!==PK)return null;
    for(const k of["red","black"]){const pp=people[x[k].id];if(pp&&sgPk(pp.pk)&&pp.pk!==x[k].pk)return null}
    return{k:{[x.red.id]:x.red.pk,[x.black.id]:x.black.pk}}}
  async function sgVet(x){let B=BIND[x.gid],cand=null;if(!B){cand=sgBindFrom(x);if(!cand)return{ok:false,why:"金鑰對不上（不是這盤的雙方）"};B=cand}
    if(B.legacy||B.cup){if(cand)bindSet(x.gid,cand);return{ok:true,mode:B.cup?"cup":"legacy"}}
    if(!(window.crypto&&crypto.subtle))return{ok:false,why:"這個瀏覽器不能驗簽"};
    const e=x.sg;if(!e||typeof e!=="object"||typeof e.k!=="string"||typeof e.h!=="string"||typeof e.r!=="number")return{ok:false,why:"沒有簽名"};
    if(!signedG(x)||!B.k||B.k[x.red.id]!==x.red.pk||B.k[x.black.id]!==x.black.pk)return{ok:false,why:"雙方金鑰跟開局時不一樣"};
    const h=await sha(hcStr(x));if(e.h!==h)return{ok:false,why:"內容跟簽名不符"};
    const pk=e.s==="r"?x.red.pk:e.s==="b"?x.black.pk:null;if(!pk||!(await sigOk(pk,actMsg(x,e),e.k)))return{ok:false,why:"簽名不對"};
    if(!authOk(x,e))return{ok:false,why:"這個動作不是簽名的那一方能做的"};
    if(e.r!==x.rev){const l=x.rl;if(!(e.r<x.rev&&l&&typeof l==="object"&&l.r===x.rev&&l.h===h&&typeof l.k==="string"))return{ok:false,why:"舊訊息重放"};
      const lp=l.s==="r"?x.red.pk:l.s==="b"?x.black.pk:null;if(!lp||!(await sigOk(lp,relMsg(x,l),l.k)))return{ok:false,why:"轉送簽名不對"}}
    else if(G&&G.gid===x.gid&&G.id===x.id&&x.rev===G.rev+1&&G.sg&&side()&&e.p!==(await sha(hcStr(G))))return{ok:false,why:"接在別的局面後面（拼接）"};
    if(cand)bindSet(x.gid,cand);return{ok:true,mode:"signed"}}
  /* 送出前蓋章：舊版局、千秋盃照舊送；簽名局沒有金鑰或不是這盤的一方就不送 */
  async function sgSeal(g){const B=BIND[g.gid];if(!B||B.legacy||B.cup)return JSON.stringify(g);
    const kp=await keyP,i=me().id,s=g.red.id===i?"r":g.black.id===i?"b":null;if(!kp||!s)return null;
    if(!g.sg&&g._s&&g._s.sg&&hcStr(g._s)===hcStr(g))g.sg=g._s.sg;
    const h=await sha(hcStr(g));
    if(!g.sg||g.sg.h!==h){const b=g._b||null,e={v:1,s,a:actOf(b,g,s),r:g.rev,h,p:b?await sha(hcStr(b)):""};e.k=await signS(actMsg(g,e));g.sg=e;delete g.rl}
    else if(g.sg.r!==g.rev&&!(g.rl&&g.rl.r===g.rev&&g.rl.h===h)){const l={s,r:g.rev,h};l.k=await signS(relMsg(g,l));g.rl=l}
    return JSON.stringify(g)}
  let vq=Promise.resolve(),sigQ=Promise.resolve(),wire=null,SUS=[],fixAt=0;
  /* 伺服器上這盤保留的不是最新的真訊息（被偽造的蓋掉、或有人重放舊的）：自己在下的話，把手上最後一份好的原始訊息重送一次（每 5 秒最多一次） */
  function sgFix(){if(side()&&G&&wire&&wire.gid===G.gid&&cli&&cli.up&&Date.now()-fixAt>5000){fixAt=Date.now();cli.pub(`${ROOT}/g/${G.gid}/s`,wire.s,true)}}
  function sgBad(x,why){SUS.push({at:Date.now(),gid:x.gid,rev:x.rev,why});SUS=SUS.slice(-50);emit("suspicious",{gid:x.gid,why});if(G&&x.gid===G.gid)sgFix()}
  const sgState=()=>{if(!G)return null;const B=BIND[G.gid];return!B?"unknown":B.legacy?"legacy":B.cup?"cup":"signed"};
  /* 驗過的對局狀態（原本 onMsg 裡那段，照舊）：flagRace → 更新的 rev → 同 rev 裁決 → 舊的就補送自己的 */
  function gameIn(x,msg){if(G&&x.gid===G.gid&&side()&&flagRace(x))return;
    if(!G||x.rev>G.rev||x.gid!==G.gid){if(G&&x.gid===G.gid&&side()&&!okNext(G,x)){badCheck(x);return}seenAt=Date.now();const before=side(),wasEnd=!!(G&&G.result);if(!G||x.gid!==G.gid||x.moves.length!==G.moves.length)arr={n:x.moves.length,t:Date.now()};G=x;wire={gid:x.gid,rev:x.rev,s:msg};dirty=false;if(side()!==before||!!G.result!==wasEnd)presence();record();emit("game");if(typeof rcNotice==="function")rcNotice(G)}
    else if(x.rev===G.rev)revTie(x);else if(dirty&&G&&x.rev<G.rev)pubGame();else if(G&&x.rev<G.rev&&!sgLegacy(G))sgFix()}
  /* ================= SIGN:END ================= */
  function enter(gid){if(cur&&cur.gid!==gid&&cli&&cli.up)cli.unsub(gt(cur.gid));cur={gid};ls.set("net",cur);emos=[];if(cli&&cli.up)cli.sub(gt(gid));syncRoster();presence()}
  const PL={r:"紅方",b:"黑方"},oppOf=s=>s==="r"?"b":"r";
  // 對方「在這盤」＝在線上，而且他的狀態指著同一盤（已經跑去做別的事就不算）
  const onl=id=>{const x=people[id];return id===me().id?!!(cli&&cli.up):!!(x&&fresh(x,Date.now())&&G&&x.gid===G.gid)};
  function setResult(r,fz){if(!G||G.result)return;const n=JSON.parse(JSON.stringify(G));n.result=r;n.draw=null;if(fz&&n.clk)n.clk[fz]=0;n.rev=G.rev+1;n.at=Date.now();seenAt=n.at;G0=G;sgFresh(n,G);G=n;pubGame();presence();record();emit("game")}
  // 對方離線超過 10 分鐘、棋局也 10 分鐘沒動：自動中止，不再一直掛著「對戰中」
  // 每步限時：輪到的一方超過 3 分鐘沒走（離開、斷線、關掉 App），由等待的一方判他超時負，比賽自動結束並計分
  const TURN_MS=3*60000;
  const toMove=()=>G?(G.moves.length%2?"b":"r"):null;
  function timeoutCheck(){if(!G||G.rules!==RULE_ID||!playing()||!cli||!cli.up)return;const t=toMove(),me=side();if(!t||t===me)return;
    if(G.clk&&clockLeft(G,t)<=0)return setResult({w:me,timeout:true,why:PL[t]+"時間用完，超時判負"},t);   /* 數值盤查 11/11 P1 棋鐘：判對方鐘上超時時把他的鐘存成 0（fz），跟他自己手機判自己超時（tickMove）存的一樣，兩端狀態才會一字不差；以前存的是他這手開始時的時間，畫面還顯示有剩 */
    if(Date.now()-turnAt(G)>TURN_MS)setResult({w:me,timeout:true,why:PL[t]+"超過 3 分鐘沒走，超時判負"})}
  setInterval(()=>{timeoutCheck();syncRoster()},2000);   /* 回饋 854：順便看要不要訂、收整份名單 */
  function staleCheck(){if(!playing()||!cli||!cli.up||G.cup)return;   /* 擂台比賽沒有「中止」：斷線的人時間照走 */const o=oppOf(side()),oid=o==="r"?G.red.id:G.black.id;
    if(!onl(oid)&&Date.now()-seenAt>10*60000)setResult({w:null,abort:true,why:"對方離線太久，對局中止"})}
  // 自己離開一盤還沒下完的棋：對方還在線上就算自己認輸；對方已經離線就直接中止
  function endOnLeave(){if(!playing()||G.cup)return;if(G.rules!==RULE_ID)return setResult({w:null,abort:true,why:"棋規版本不同，舊局中止（不計分）"});   /* 擂台比賽離開畫面不算認輸（小朋友常誤觸），回來可以接著下 */const s=side(),o=oppOf(s),oid=o==="r"?G.red.id:G.black.id;
    setResult(onl(oid)&&G.moves.length?{w:o,why:PL[s]+"離開對局"}:{w:null,abort:true,why:onl(oid)?"對局取消":"對方離線，對局中止"})}
  // 接受後 12 秒還沒收到對局（對方剛好關掉 App）：取消，隨機配對的話繼續找
  function waitGame(gid,auto){setTimeout(()=>{if(!cur||cur.gid!==gid||G)return;if(cli&&cli.up)cli.unsub(gt(gid));cur=null;ls.set("net",null);
    if(auto)seeking=Date.now();presence();emit("matchfail",{auto});tryMatch()},12000)}
  /* 評審 P22 對局簽名：先蓋章（sgSeal，非同步）再送；照呼叫的順序送。沒連上馬上標「棋步連上後送出」 */
  function pubGame(){if(!G)return;const g=G;if(!(cli&&cli.up))dirty=true;
    sigQ=sigQ.then(()=>sgSeal(g)).then(s=>{if(s==null)return;if(cli&&cli.up&&cli.pub(`${ROOT}/g/${g.gid}/s`,s,true)){if(G===g)wire={gid:g.gid,rev:g.rev,s}}else{dirty=true;connect()}}).catch(e=>console.error(e))}
  // 手機切到背景時主動下線（iPhone 背景會斷線），回來再連上
  const kick=()=>{if(!want)return;if(!cli){clearTimeout(retryT);connect()}else if(cli.up)presence()};
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)kick()});
  window.addEventListener("online",()=>{if(cli&&cli.kill)cli.kill();setTimeout(kick,300)});
  window.addEventListener("pageshow",kick);

  return{
    on,start(){want=true;connect()},
    root:()=>ROOT,
    putRetained(topic,s){return new Promise(res=>{let k=0;const go=()=>{if(cli&&cli.up){cli.pub(topic,s,true);res(true)}else if(k++<25){if(!want){want=true;connect()}setTimeout(go,400)}else res(false)};go()})},
    getRetained(topic,ms){return new Promise(res=>{let t=null,g=null;const done=v=>{clearTimeout(t);clearTimeout(g);delete W[topic];try{if(cli&&cli.up)cli.unsub([topic])}catch(e){}res(v||null)};
      t=setTimeout(()=>done(null),ms||8000);W[topic]=done;if(!want){want=true;connect()}const go=()=>{if(cli&&cli.up)cli.sub([topic]);else g=setTimeout(go,400)};go()})},refresh:()=>presence(),
    /* 從伺服器抓回某一盤保留的最後狀態（補存漏掉的棋譜，意見回饋 280） */
    shareIRT(x){if(selfBan()||!anonOk(x))return;const q=ls.get("irtQ",[]);q.push({...x,at:Date.now()});ls.set("irtQ",q.slice(-20));flushIRT()},
    /* v5 改善單 R05：玩家關掉匿名開關時，手機裡已排隊、還沒送出的那一類一起丟掉（t＝"stk" 卡關訊號、"cpu" 對局評分），關掉後一包都不再送。
       資料保留期限（11/11）：t 也可以是函式（拿到排隊的那一筆，回 true 就丟）；「📈 匿名送出學習進度」用 05b-save.js 的 lrnAnonType 一次丟掉新手流程、作答、成長曲線 */
    dropIRT(t){const q=ls.get("irtQ",[]),f=typeof t==="function"?t:(x=>x.t===t);ls.set("irtQ",q.filter(x=>{if(!x)return true;try{return!f(x)}catch(e){return true}}))},
    /* 意見回饋 307：公開戰力摘要、開發者的重置指令、後台每天校正好的參數（題目難度、各段位成長參數） */
    pubProf:()=>pubHist(),
    ctl(o){return!!(cli&&cli.up&&cli.pub(`${ROOT}/ctl`,JSON.stringify(o)))},
    ctlAck(ms){return this.getRetained(`${ROOT}/ctl/ack`,ms||4000)},
    calib(ms){return this.getRetained(`${ROOT}/cal`,ms||8000)},
    fetchHist(id,ms){return this.getRetained(`${ROOT}/h/${id}`,ms||5000).then(s=>{try{const x=s&&JSON.parse(s);return x&&x.id===id&&Array.isArray(x.list)?x:null}catch(e){return null}})},
    fetchGame(gid,ms){return this.getRetained(`${ROOT}/g/${gid}/s`,ms||6000).then(s=>{try{const x=s&&JSON.parse(s);return x&&x.gid===gid?locG(x):null}catch(e){return null}})},   /* 回饋 842：補存的棋譜裡自己那一方寫自己取的名字 */
    status:()=>cli&&cli.up?"up":want?"connecting":"off",
    /* 千秋盃：裁判台簽過名的本週狀態、歷屆擂主；報名、取消、報到送到 cup/req（裁判台收下後更新名單） */
    cup:()=>{if(CUP!==cupS){cupS=CUP;cupF=CUP&&Array.isArray(CUP.reg)&&CUP.reg.some(r=>r&&ban(r.id))?Object.assign({},CUP,{reg:CUP.reg.filter(r=>!(r&&ban(r.id)))}):CUP}return cupF},cupHall:()=>CUPHALL,   /* 回饋 852：千秋盃報名名單藏起停權的人（裁判台 tools/cup-host.js 也會擋他報名） */
    cupReq(t){const m=me();if(!CUP||selfBan())return false;const go=k=>{if(cli&&cli.up)cli.pub(`${ROOT}/cup/req`,JSON.stringify({t,wk:CUP.wk,id:m.id,name:m.name,pts:myPts(),at:Date.now()}));else if(k<6){if(!want){want=true;connect()}setTimeout(()=>go(k+1),1500)}};go(0);return true},
    cupChamp:()=>{const h=CUPHALL&&CUPHALL.list&&CUPHALL.list[0];return h&&Date.now()-h.at<8*864e5?h:null},
    downFor:()=>cli&&cli.up||!downAt?0:Date.now()-downAt,pendingSend:()=>dirty,
    /* 評審 P22 對局簽名：signState＝這盤 "signed"（雙方簽名）／"legacy"（對方版本較舊，無法驗證，不計積分）／"cup"／"unknown"／null；suspicious＝最近 50 筆被擋下的可疑對局訊息（不跳視窗） */
    signState:()=>sgState(),suspicious:()=>SUS.slice(),
    people:()=>{const now=Date.now(),i=me().id,all=Object.values(people).filter(x=>x.id!==i&&fresh(x,now)),bg=new Set(all.filter(x=>x.st==="playing"&&x.gid&&blk(x.id)).map(x=>x.gid));
      return all.filter(x=>!blk(x.id)&&!(x.st==="playing"&&x.gid&&bg.has(x.gid)))},   /* 回饋 841：封鎖的人藏起來；他正在下的那盤也不列（不然對戰卡只剩對手一個人） */
    blocked:id=>blk(id),
    me,active:()=>!!cur,side,game:()=>{const rn=G?realNm():"";if(G!==gvS||rn!==gvN){gvS=G;gvN=rn;gvL=locG(G)}return gvL},gid:()=>cur&&cur.gid,   /* 回饋 842：自己畫面上的對局，自己那一方顯示自己取的名字（對外照舊是稱號） */
    invite(to){seeking=0;return sendInvite(to,false)},
    seek(on){if(on&&selfBan())on=false;if(on&&playing())endOnLeave();if(on&&cur&&!playing()){if(cli&&cli.up)cli.unsub(gt(cur.gid));cur=null;G=null;ls.set("net",null)}seeking=on?Date.now():0;if(!on&&pending&&pending.auto)pending=null;syncRoster();presence();tryMatch();emit("people")},
    seeking:()=>!!seeking,
    seekers(){const now=Date.now(),i=me().id;return Object.values(people).filter(x=>x.st==="seeking"&&x.id!==i&&fresh(x,now)&&!blk(x.id)).length},   /* 回饋 841：不算封鎖的人 */
    cancelInvite(){if(!pending)return;const m=me();cli&&cli.pub(`${ROOT}/i/${pending.to}`,JSON.stringify({type:"cancel",gid:pending.gid,from:{id:m.id,name:m.name},at:Date.now()}));pending=null},
    respond(x,ok){const m=me();if(ok)endOnLeave();cli&&cli.pub(`${ROOT}/i/${x.from.id}`,JSON.stringify({type:ok?"accept":"decline",gid:x.gid,from:{id:m.id,name:m.name,pts:myPts(),tc:tcPref(),rules:RULE_ID,rs:rsPref(),pk:ok&&PK||undefined},at:Date.now()}));
      if(ok){sgAccepted(x);G=null;enter(x.gid);waitGame(x.gid,false)}},
    watch(gid){endOnLeave();G=null;enter(gid)},
    tc:()=>tcPref(),tcs:TCS,tcOf,isBot,tcOk:f=>tcOk(f),setTc(v){if(TCS.includes(+v)){ls.set("tc",+v);presence();emit("people")}},
    clocks(){return G&&G.clk?{r:clockLeft(G,"r"),b:clockLeft(G,"b")}:null},
    /* 走棋前呼叫：扣掉走的人這步用的時間，從現在開始算對方的 */
    /* ChatGPT 數值盤查 11/11 P1 棋鐘：同一個時間戳 now 先裁決逾時，再扣時、加秒。自己的棋鐘剩餘 ≤ 0 ms＝已經落旗：不落子、不加秒，直接把結果寫成自己超時判負並回 false
       （以前先扣到 0 再加秒，落旗後還能走一步把時間加回來）。及時落子時多記 lft＝落子當下的剩餘時間（棋鐘、每步 3 分鐘取小）和 lfN＝第幾手，給雙端競逐裁決用（flagTie） */
    tickMove(n,sd){if(!n)return true;const now=Date.now(),lc=n.clk?n.clk[sd]-(now-effTk(n)):Infinity;
      if(n.clk&&lc<=0){n.clk[sd]=0;n.result={w:oppOf(sd),timeout:true,why:PL[sd]+"時間用完，超時判負"};n.draw=null;return false}
      n.lft=Math.round(Math.min(lc,TURN_MS-(now-(arr.n===n.moves.length?arr.t:now))));n.lfN=n.moves.length+1;
      if(n.clk){n.clk[sd]=lc+(+n.inc||0);n.tk=now;n.tkN=n.moves.length+1}return true},   /* inc：每走一步加幾毫秒（擂台比賽每步加 5 秒） */
    turnLeft(){if(!G||G.result)return null;return Math.max(0,TURN_MS-(Date.now()-turnAt(G)))},
    // 公園 3D 棋盤：對手的小帥造型（棋子、朝代、官階），對手在大廳廣播的
    oppBot(){if(!G||!side())return null;const o=oppOf(side()),x=people[o==="r"?G.red.id:G.black.id];return x&&x.bot||null},
    // 觀戰時：某一方玩家的小帥造型（公園裡對面坐的是遠端那一方，意見回饋 258）
    playerBot(sd){if(!G)return null;const x=people[sd==="r"?G.red.id:G.black.id];return x&&x.bot||null},
    oppOnline(){if(!G||!side())return false;const o=oppOf(side());return onl(o==="r"?G.red.id:G.black.id)},
    leave(){endOnLeave();if(cur&&cli&&cli.up)cli.unsub(gt(cur.gid));cur=null;G=null;ls.set("net",null);presence()},
    /* 開發者 11/11 選「刪除本機資料按鈕」：刪資料前，把伺服器上保留的戰績摘要和在線狀態清掉（送空的保留訊息） */
    forget(){try{if(cli&&cli.up){const m=me();cli.pub(`${ROOT}/h/${m.id}`,"",true);cli.pub(`${ROOT}/u/${m.id}`,"",true);return true}}catch(e){}return false},
    // 對局有變化：發布新狀態（rev 越大越新）
    update(fn){if(!G)throw new Error("還在等對局資料，稍等一下");const wasEnd=!!G.result,n=JSON.parse(JSON.stringify(G));fn(n);n.rev=G.rev+1;n.at=Date.now();if(n.moves.length!==G.moves.length||n.gid!==G.gid)arr={n:n.moves.length,t:n.at};seenAt=n.at;G0=G;sgFresh(n,G);G=n;pubGame();if(!!G.result!==wasEnd)presence();record();emit("game");return G},
    rating(){const R=rec(),i=heldIdx(R),nx=RANKS[i+1];return{pts:R.pts,rank:RANKS[i][0],w:R.w,l:R.l,d:R.d,next:nx?nx[0]:null,toNext:nx?nx[1]-R.pts:0,lo:RANKS[i][1],hi:nx?nx[1]:null,hist:R.hist}},
    rankOf,ranks:()=>RANKS.slice(),
    playing,finished:()=>!!(cur&&G&&G.result),
    // 有人送出意見回饋：通知開發者電腦上的監看程式（只送類型和時間，不送內容）
    bell(o){const go=k=>{if(cli&&cli.up)cli.pub(`${ROOT}/fb`,JSON.stringify({...o,at:Date.now()}));else if(k<5){if(!want){want=true;connect()}setTimeout(()=>go(k+1),2000)}};go(0)},
    emote(by,e){if(cli&&cli.up&&cur&&!selfBan())cli.pub(`${ROOT}/g/${cur.gid}/e`,JSON.stringify({by,e,id:me().id}))},   /* 回饋 841：附上自己的代號，對方才封鎖得到 */
    say(by,text){text=String(text||"").trim().slice(0,80);if(!text)return;if(!chatOk(text))throw new Error("線上對局只能用快捷語聊天");if(selfBan())return;   /* 回饋 850、852 */if(!(cli&&cli.up&&cur))throw new Error("網路斷線中，等一下再傳");cli.pub(`${ROOT}/g/${cur.gid}/e`,JSON.stringify({by,text,name:me().name,id:me().id}))},
    chatLog:()=>emos.filter(x=>(x.text?chatOk(x.text):!!x.e)&&!blk(x.sid)),chatOf:id=>emos.filter(x=>(x.text||x.e)&&x.sid===id),   /* 回饋 850：chatLog 只留快捷語（文字是清單原句、或表情代號）；chatOf 給檢舉用，舊版的自由文字也留著當證據 */   /* 回饋 841：chatOf 給檢舉附上他說過的話（封鎖了也拿得到） */
    emotes:()=>emos.filter(x=>Date.now()-x.at<60000&&!blk(x.sid)&&(!x.text||chatOk(x.text))),   /* 回饋 850：不是快捷語原句的文字不顯示 */   /* 回饋 841：封鎖的人的表情、聊天不顯示 */
    // 公園 3D 棋盤：正在觀戰這盤棋的人（最多 8 位）和他們的小帥造型
    watcherBots(){if(!cur)return[];const now=Date.now(),i=me().id;return Object.values(people).filter(x=>x.id!==i&&x.gid===cur.gid&&x.st==="watching"&&fresh(x,now)&&!blk(x.id)).slice(0,8).map(x=>({id:x.id,bot:x.bot||null}))},
    watchers(){if(!cur)return 0;const now=Date.now();return Object.values(people).filter(x=>x.gid===cur.gid&&x.st==="watching"&&fresh(x,now)).length},
    isOn(id){const x=people[id];return id===me().id?!!(cli&&cli.up):!!(x&&fresh(x,Date.now()))},
    /* 回饋 854：首頁的「N 人在線上」。收著整份名單就照名單數；沒收名單時用大廳角色程式算的人數（sys/online，扣掉自己）；都沒有就回 null（首頁改寫「線上大廳」） */
    onlineCount(){if(rosterOn)return this.people().length;if(ONL&&BOTS_ST&&BOTS_ST.up)return Math.max(0,ONL.n-(cli&&cli.up&&!selfBan()?1:0));return null},
    /* 回饋 854：其他頁面臨時要整份名單時呼叫（ms 毫秒內都收著，預設 3 分鐘）；名單頁本身不用呼叫 */
    roster(ms){rosterHold=Date.now()+(ms>0?ms:LINGER);syncRoster()},rosterOn:()=>rosterOn,
    /* 合作殘譜（m/07q2-coop.js）：rel 只准 q/… 開頭。qSub 回傳取消訂閱的函式；qPub 回 true／false（沒連上就是 false，呼叫的人自己補送） */
    qSub(rel,fn){qRel(rel);const L=QS[rel]=QS[rel]||[];L.push(fn);if(L.length===1&&cli&&cli.up)cli.sub([`${ROOT}/${rel}`]);if(!want){want=true;connect()}
      return()=>{const M=QS[rel];if(!M)return;const i=M.indexOf(fn);if(i>=0)M.splice(i,1);if(!M.length){delete QS[rel];if(cli&&cli.up)cli.unsub([`${ROOT}/${rel}`])}}},
    qPub(rel,s,retain){qRel(rel);if(/\+/.test(rel))return false;return!!(cli&&cli.up&&cli.pub(`${ROOT}/${rel}`,String(s),!!retain))},
    qUp:()=>!!(cli&&cli.up)}})();
