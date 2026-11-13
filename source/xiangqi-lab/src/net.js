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
  /* 11/13 Android 三方實測 P1：Android App（Capacitor）網址主機也是 localhost，以前被當成本機開發、強制進測試房，上架後玩家會進不了正式大廳。
     App 裡（UA 有 XQQianqiuApp 或 Capacitor 原生平台）不套用本機網址這一條；模擬器（UA 有 sdk_gphone 等）和自動化瀏覽器照舊只進測試房 */
  try{const h=String(location.hostname||""),ua=typeof navigator!=="undefined"&&navigator.userAgent||"",app=/XQQianqiuApp\//.test(ua)||!!(typeof window!=="undefined"&&window.Capacitor&&typeof window.Capacitor.isNativePlatform==="function"&&window.Capacitor.isNativePlatform());if(ROOT==="xqlab-r7k2q/v1"&&((typeof navigator!=="undefined"&&navigator.webdriver)||/sdk_gphone|Android SDK built for|google_sdk|generic_x86|Emulator/i.test(ua)||(!app&&(/^(localhost|127\.|\[::1\]|192\.168\.|10\.)/.test(h)||/\.localhost$/.test(h)))))ROOT="xqlab-test-local/v1"}catch(e){}
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
  const cupPub=()=>cupKeyP||(cupKeyP=crypto.subtle.importKey("jwk",{kty:"EC",crv:"P-256",x:CUP_KEY.x,y:CUP_KEY.y,ext:true},{name:"ECDSA",namedCurve:"P-256"},false,["verify"]));
  async function cupVerify(msg){try{const x=JSON.parse(msg);if(!x||typeof x.d!=="string"||typeof x.s!=="string"||!(window.crypto&&crypto.subtle))return null;
    const ok=await crypto.subtle.verify({name:"ECDSA",hash:"SHA-256"},await cupPub(),b64u(x.s),new TextEncoder().encode(x.d));return ok?JSON.parse(x.d):null}catch(e){return null}}
  /* 第 9 輪外部評審（Gemini：千秋盃的報名與賽程廣播也要簽名驗證；格式見 tools/cup-key.js，測試 tools/test-cup-sign.js）：
     ① 裁判台的廣播（cup/state 名單賽程成績、cup/hall 擂主碑）：簽名要對；簽的內容 d 要帶 k（跟主題一樣："state"／"hall"）和 rt（跟這支 App 連的大廳 ROOT 一樣），
       擋「把擂主碑貼到名單頻道」「把測試房的公告貼到正式大廳」；d.at（裁判台發布時間）不能比這支手機收過的同一種還舊（記在 localStorage xq_cupSeen，重開 App 也記得）＝擋重放舊賽程；
       名單超過 3 天、擂主碑超過 9 天沒更新＝過期不收（裁判台每 30 分鐘重發一次）。
     ② 裁判台開的對局（g/cup…/s）帶 hs＝裁判台對對局內容的簽名：第一次看到某盤千秋盃，要 hs 驗得過、或裁判台簽過名的名單裡有這盤（gid、紅黑代號都對）才收（sgVet）；
       之後這盤的紅黑代號不能換；「棄擂」判決（result.forfeit）只有裁判台能下，沒有 hs 的不收；名單裡列為千秋盃的 gid，不帶 cup 的狀態也不收（不能拿掉 cup 改當一般對局）。
     ③ 報名、取消、點將（cup/req）用這支手機的對局金鑰簽名（pk＋sg），裁判台驗過才受理（cupReq）。
     驗不過的一律不顯示、不改狀態，記在 CUPBAD（XQNet.cupBad()：sig 簽名不對、scope 頻道或大廳不對、stale 過期、replay 重放、game 對局不是裁判台開的） */
  const CUP_STALE={state:3*864e5,hall:9*864e5},CUPBAD={n:0,sig:0,scope:0,stale:0,replay:0,game:0,act:0,last:null};
  let cupSeenM=null,cupQ=Promise.resolve();
  const cupSeen=()=>{if(!cupSeenM){let v=null;try{v=JSON.parse(localStorage.getItem("xq_cupSeen")||"null")}catch(e){}cupSeenM=v&&typeof v==="object"?v:{}}return cupSeenM};
  function cupBad(k,why){CUPBAD[k]=(CUPBAD[k]||0)+1;CUPBAD.n++;CUPBAD.last={k,why:String(why||""),at:Date.now()};try{emit("cupbad",CUPBAD.last)}catch(e){}}
  async function cupIn(kind,msg){const d=await cupVerify(msg);if(!d||typeof d!=="object")return cupBad("sig",kind+"：裁判台簽名不對");
    if(d.k!==kind||d.rt!==ROOT)return cupBad("scope",kind+"：不是這個頻道或這個大廳的公告");
    const at=+d.at,now=Date.now();if(!isFinite(at)||now-at>CUP_STALE[kind])return cupBad("stale",kind+"：太久沒更新的舊公告");
    const sn=cupSeen(),sk=ROOT+"|"+kind;if(at<(+sn[sk]||0))return cupBad("replay",kind+"：比收過的還舊（重放）");
    if(kind==="state"&&CUP&&d.wk===CUP.wk&&(d.n||0)<(CUP.n||0))return cupBad("replay",kind+"：同一屆、版本比手上的舊");
    sn[sk]=Math.min(at,now);try{localStorage.setItem("xq_cupSeen",JSON.stringify(sn))}catch(e){}
    if(kind==="state")CUP=d;else CUPHALL=d;emit("cup",kind)}
  const hcCup=g=>{const o={};for(const k in g)if(k!=="rev"&&k!=="at"&&k!=="sg"&&k!=="rl"&&k!=="hs")o[k]=g[k];return JSON.stringify(o)};
  async function cupHsOk(x){try{const h=x&&x.hs;if(!h||typeof h!=="object"||typeof h.k!=="string"||!(window.crypto&&crypto.subtle))return false;
    return await crypto.subtle.verify({name:"ECDSA",hash:"SHA-256"},await cupPub(),b64u(h.k),new TextEncoder().encode("xq-cupg1|"+ROOT+"|"+x.gid+"|"+hcCup(x)))}catch(e){return false}}
  const cupGames=()=>{const r=[];try{if(CUP&&CUP.m&&typeof CUP.m==="object")for(const k in CUP.m){const m=CUP.m[k];if(m&&Array.isArray(m.g))for(const z of m.g)if(z&&z.gid)r.push(z)}}catch(e){}return r};
  const cupListed=x=>cupGames().some(z=>z.gid===x.gid&&z.red===x.red.id&&z.black===x.black.id),cupGidKnown=gid=>cupGames().some(z=>z.gid===gid);
  /* 威脅模型 T9（紅藍隊 R01，11/13）：名單裡這盤的那一筆（哪一場 mk、第幾盤 i），裁判台另外寫了雙方報名時驗過的公開金鑰 rpk、bpk 和簽名版本 sv；cupW＝賽事、場次、盤號、加賽、簽名版本（開局後不能換） */
  const cupEntry=gid=>{try{if(CUP&&CUP.m&&typeof CUP.m==="object")for(const k in CUP.m){const m=CUP.m[k];if(m&&Array.isArray(m.g))for(let i=0;i<m.g.length;i++){const z=m.g[i];if(z&&z.gid===gid)return{z,mk:k,i}}}}catch(e){}return null};
  const cupW=c=>JSON.stringify(c&&typeof c==="object"?[String(c.wk),String(c.m),+c.g,!!c.tb,+c.sv||0]:null);
  const cupReqMsg=x=>"xq-cupreq1"+JSON.stringify([ROOT,x.wk,x.t,x.id,x.name,x.pts,x.at,x.pk]);

  // ---------- 很小的 MQTT 3.1.1 用戶端（只用 QoS 0：發布、訂閱、保留訊息、遺囑、心跳） ----------
  function mqtt(url,o){
    const te=new TextEncoder(),td=new TextDecoder();
    const vlen=n=>{const a=[];do{let d=n%128;n=Math.floor(n/128);if(n>0)d|=128;a.push(d)}while(n>0);return a};
    const str=x=>{const b=te.encode(x);return[b.length>>8,b.length&255,...b]};
    const pkt=(h,body)=>new Uint8Array([h,...vlen(body.length),...body]);
    const me={up:false,onup:null,ondown:null,onmsg:null,rtt:null,rttAt:0};let buf=new Uint8Array(0),pid=1,ping=null,ws,pingAt=0;   /* 評比第 12 輪 X11：rtt＝最近一次心跳 PINGREQ→PINGRESP 的來回毫秒（跟伺服器之間的延遲） */
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
        if(t>>4===2){if(b[1]===0){me.up=true;const pg=()=>{if(send(new Uint8Array([0xC0,0])))pingAt=Date.now()};ping=setInterval(pg,o.keepalive*500);pg();
          dog=setInterval(()=>{if(Date.now()-lastRx>o.keepalive*1200){try{ws.close()}catch(e){}me.kill&&me.kill()}},3000);me.onup&&me.onup()}else ws.close()}
        else if(t>>4===3){const tl=(b[0]<<8)|b[1],topic=td.decode(b.subarray(2,2+tl));let p=2+tl;if((t>>1)&3)p+=2;
          try{me.onmsg&&me.onmsg(topic,td.decode(b.subarray(p)),!!(t&1))}catch(err){console.error(err)}}
        else if(t>>4===13){if(pingAt){me.rtt=Date.now()-pingAt;me.rttAt=Date.now();pingAt=0}}}};
    ws.onerror=()=>{};
    /* Android 三方實測 P2-2（11/13）：連線開了 10 秒還沒拿到 CONNACK（網路剛恢復、路由還沒好時常卡住）＝當成連不上，交給重試；以前要等系統的 TCP 逾時 */
    const cto=setTimeout(()=>{if(!me.up&&!downed){try{ws.close()}catch(e){}down()}},o.ctimeout||10000);
    // 手機網路切換時 WebSocket 可能卡住不觸發 close，看門狗直接判定斷線
    let downed=false;const down=()=>{if(downed)return;downed=true;clearTimeout(cto);clearInterval(ping);clearInterval(dog);const was=me.up;me.up=false;me.ondown&&me.ondown(was)};
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
  const isBot=id=>!!(people[id]&&people[id].bot&&people[id].bot.npc)||!!botMem[id]||!!(BOTS_ST&&BOTS_ST.ids.has(id)),tcOf=f=>TCS.includes(+(f&&f.tc))?+f.tc:null,tcOk=f=>isBot(f.id)||tcOf(f)===tcPref();
  let tcWaitAt=0;
  /* 輪到的一方從什麼時候開始算時間：走棋的人會寫 tk；舊版或沒寫的話，用這支手機收到那一步的時間 */
  /* QA P1-2：兩支手機的時鐘可能差很多，所以計時一律用「這支手機收到（或自己走出）這一步的時間」，不用對方手機寫的時間 */
  const effTk=g=>arr.n===g.moves.length?arr.t:g.tk&&g.tkN===g.moves.length?g.tk:(g.at||Date.now());
  const turnAt=g=>arr.n===g.moves.length?arr.t:Date.now();
  /* Android 三方實測 P2-3（11/13）：觀眾剛從大廳進來時，棋鐘比雙方慢約 38 秒（從自己進來那一刻起算），對方走一步才對齊。
     觀眾第一次看到這盤（還沒在看、或換了一盤）而且棋還沒結束：用走棋那方寫的 tk（tkN 要等於步數），但不能比現在晚（他的手機快）、也不能早過這一手最多能用的時間；
     不合理就照舊用現在。只影響觀眾的顯示（下棋的雙方照舊用自己收到的時間，見上面 QA P1-2；觀眾不判超時） */
  const obsTk=(x,g)=>{const now=Date.now();try{const i=me().id,first=!g||g.gid!==x.gid||g.id!==x.id;if(!first||x.result||x.red.id===i||x.black.id===i||typeof x.tk!=="number"||x.tkN!==x.moves.length)return now;
    const s=x.moves.length%2?"b":"r",lim=Math.min(TURN_MS,x.clk&&typeof x.clk[s]==="number"?x.clk[s]:Infinity)+5000;return x.tk<=now&&now-x.tk<=lim?x.tk:now}catch(e){return now}};
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
  /* 評審 P22.5（11/12）積分防謊報：對手的積分是他手機自己報的（在線狀態 pts、邀請／接受的 from.pts、開局狀態裡的 pts），改 localStorage 就能謊報。現在不直接信，先核對（ptsVet）：
       ①範圍 0～PTS_MAX ②不能超過「他報的場數最多拿得到的分數」ptsCap（從 0 分起，前 15 盤每盤最多 +48、之後每盤最多 +32；場數＝在線狀態的 w＋l＋d，或邀請／接受的 n）
       ③開局狀態裡寫的分數，要是最近看過他在線狀態（或邀請）報的某一個分數（ptsSeen 記每人最近 8 個；用「看過的」而不是「最新的」，因為對方記完這盤積分的新在線狀態可能比終局狀態先到）。
     任何一項不過＝「未驗證」：改用保守值（各來源和上限裡最小的；完全查不到場數時不超過自己的分數＝不讓自己多賺）。這盤加減分用保守值算，
       戰績那一筆記 ov:0（未驗證）、op（實際採用的對手分數）、ow（原因）；大廳名單裡他的 pts 換成保守值、原值放 ptsRaw、原因放 ptsUnv（名冊、資料卡的段位跟著變保守）。
     大廳角色（sys/bots 名單上的）不核對（跟角色下的盤本來就不計分）。
     還防不住：改過的 App 連勝負場數一起捏造（場數夠多、分數在上限內）就看不出來；要根治需要伺服器端權威或「每盤雙方簽名終局串成的戰績鏈」（見 architecture.md「目前不保證的事」） */
  const PTS_MAX=3000,ptsCap=n=>48*Math.min(n,15)+32*Math.max(0,n-15),ptsSeen={};
  const gamesOf=x=>{const a=[x&&x.w,x&&x.l,x&&x.d].map(v=>+v);return a.every(v=>Number.isInteger(v)&&v>=0&&v<1e6)?a[0]+a[1]+a[2]:null};
  const botId=id=>!!botMem[id]||!!(BOTS_ST&&BOTS_ST.ids.has(id));
  function ptsNote(id,pts,n){if(!id||!Number.isFinite(+pts))return;const L=ptsSeen[id]||(ptsSeen[id]=[]),p=+pts,k=Number.isInteger(+n)&&+n>=0?+n:null,i=L.findIndex(e=>e.pts===p);
    if(i>=0){if(k!=null)L[i].n=k;L.push(L.splice(i,1)[0])}else L.push({pts:p,n:k});if(L.length>8)L.shift()}
  function ptsVet(id,claim){let c=+claim;const why=[];if(!Number.isFinite(c)||c<0){c=0;why.push("分數格式不對")}
    let v=c;if(v>PTS_MAX){v=PTS_MAX;why.push("超出範圍")}
    if(botId(id))return{pts:Math.round(v),ok:!why.length,why:why.join("、")};
    const L=ptsSeen[id]||[],hit=L.find(e=>e.pts===c),last=L[L.length-1];let n=hit?hit.n:null;
    if(L.length&&!hit){why.push("跟上線狀態不一致");v=Math.min(v,Math.max(0,last.pts));n=last.n}
    if(n==null){why.push("查不到場數");v=Math.min(v,Math.max(0,myPts()))}else if(v>ptsCap(n)){why.push("超過場數拿得到的上限");v=ptsCap(n)}
    return{pts:Math.round(v),ok:!why.length,why:why.join("、")}}
  /* 在線狀態收進名單前：記下他報的分數和場數，超過上限的換成保守值（原值留在 ptsRaw） */
  function ptsPres(x){try{const n=gamesOf(x);ptsNote(x.id,x.pts,n);if(botId(x.id)||!Number.isFinite(+x.pts))return;let p=Math.max(0,+x.pts);const why=[];
    if(p>PTS_MAX){p=PTS_MAX;why.push("超出範圍")}if(n!=null&&p>ptsCap(n)){p=ptsCap(n);why.push("超過場數拿得到的上限")}
    if(why.length){x.ptsRaw=+x.pts;x.pts=p;x.ptsUnv=why.join("、")}}catch(e){}}
  function record(){if(!G||badG.has(G.gid)||sgLegacy(G)||lateNs(G)||G.rules!==RULE_ID||!rcRated(G)||!G.result||G.result.abort||G.result.forfeit||(G.moves.length<2&&!G.result.timeout))return;   // 超時判負一定計分   // 雙方都還沒走就結束：不計分
    const s=side();if(!s)return;const R=rec();if(R.hist.some(h=>h.gid===G.gid&&(!h.rid||h.rid===G.id)))return;   /* 意見回饋 619：「再來一局」沿用同一個 gid，改用 gid＋這盤的 id 判斷有沒有記過，第二盤以後才會記進戰績 */
    const o=s==="r"?G.black:G.red,pp=people[o.id],pv=ptsVet(o.id,o.pts!=null?o.pts:pp?(pp.ptsRaw!=null?pp.ptsRaw:pp.pts):0),op=pv.pts;   /* 評審 P22.5：對手的分數先核對（ptsVet），不過就用保守值 */
    /* 意見回饋 段位失準：原本贏 +20、輸 −15 會停在勝率 43% 那一階、而且越下越高（每盤淨增 5 分）。
       改成等級分的期望勝率：E＝1/(1+10^((對手−自己)/400))，加減＝K×(結果−E)，雙方一加一減會抵銷；前 15 盤 K＝48 比較快定位，之後 K＝32 */
    const res=G.result.w==null?"d":G.result.w===s?"w":"l",E=1/(1+Math.pow(10,(op-R.pts)/400)),K=kOf(R.w+R.l+R.d);
    let d=Math.round(K*((res==="w"?1:res==="d"?.5:0)-E));if(res==="w"&&d<1)d=1;if(res==="l"&&d>-1)d=-1;
    const before=R.pts,rk0=heldIdx(R),pn0=R.pn;R.pts=Math.max(0,R.pts+d);d=R.pts-before;R[res]++;rankHold(R,before);   /* k0、p0：記下這盤之前的顯示段位，萬一棋鐘競逐改判要撤回這筆（unrecord，數值盤查 11/11 P1） */
    R.hist.unshift({gid:G.gid,rid:G.id,opp:o.name,oid:o.id,res,d,k0:rk0,p0:pn0,pts:R.pts,op,ov:pv.ok?1:0,...(pv.ok?{}:{ow:pv.why}),why:G.result.why||"",n:G.moves.length,at:Date.now(),sd:s,me:realNm()||(s==="r"?G.red:G.black).name||"",mv:G.moves.map(([f,t])=>String(f).padStart(2,"0")+String(t).padStart(2,"0")).join("")});R.hist=R.hist.slice(0,100);ls.set("rate",R);pubHist();   /* 意見回饋 619：每盤戰績帶一份棋步（每步 4 個數字，34 步約 136 字），棋譜存檔不見、換手機時還能從這裡補回來 */
    presence();emit("rated",{res,d,pts:R.pts,rank:RANKS[R.rk][0],was:RANKS[rk0][0],ov:pv.ok,ow:pv.why,op})}
  /* ChatGPT 數值盤查 11/11 P1 棋鐘（雙端競逐）：同一盤先記了結果、後來競逐裁決改判（flagTie）時，撤回那一筆積分（加減的分、勝負場數、顯示段位都回到這盤之前） */
  function unrecord(g){if(!g||lateNs(g))return;const R=rec(),i=R.hist.findIndex(h=>h.gid===g.gid&&(!h.rid||h.rid===g.id));if(i<0)return;const h=R.hist[i];
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
  let healT=null,pkHealAt=0;const heal=()=>{if(!cli||!cli.up||selfBan())return;clearTimeout(healT);healT=setTimeout(()=>presence(true),400+Math.random()*1200)};
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
  const prune=()=>{let ch=false;for(const id in people)if(!trk.has(id)){if(people[id]&&people[id].bot&&people[id].bot.npc)botMem[id]=1;delete people[id];ch=true}if(ch)emit("people")};
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
    iSend(to.id,{type:"invite",gid,auto:!!auto,from:{id:m.id,name:m.name,pts:myPts(),n:gamesOf(rec()),tc:tcPref(),rules:RULE_ID,rs:rsPref(),pk:PK||undefined,kv:PK?2:undefined},at:Date.now()});   /* 評比第 13 輪 X2：kv＝2 表示這支手機的連線同步頻道（k）會簽名，對方也是新版的話這盤的 k 一律要簽名。第 14 輪 F2：iSend 先用手機金鑰簽名（sg）再送（見 PIN 區段） */
    clearTimeout(pendT);if(auto)pendT=setTimeout(()=>{if(pending&&pending.gid===gid){pending=null;tryMatch()}},8000);return gid}
  function connect(){if(cli||!want)return;const m=me();
    cli=mqtt(URLS[urlI],{clientId:"xq"+m.id.slice(0,12)+Math.random().toString(36).slice(2,8),keepalive:30,will:{topic:`${ROOT}/u/${m.id}`,payload:"",retain:true},user:MQA.user,pass:MQA.pass});
    /* 回饋 854：連上時不再一律訂整份名單（u/+），改由 syncRoster 看頁面決定；sys/+、cup/+ 用萬用字元合併（專用伺服器每條連線最多 10 個訂閱）。
       30 秒的計時器還在（判對方離線太久），但在線狀態要有變化或滿 30 分鐘才真的送 */
    cli.onup=()=>{const re=everUp;everUp=true;if(downAt)offSum+=Math.max(0,Date.now()-downAt);downAt=0;upAt=Date.now();rosterOn=false;trk.clear();prune();cli.sub([`${ROOT}/i/${m.id}`,`${ROOT}/sys/+`,`${ROOT}/cup/+`,...(cur?gt(cur.gid):[]),...Object.keys(QS).map(k=>`${ROOT}/${k}`)]);syncRoster();presence(true);pubHist();flushIRT();clearInterval(hb);hb=setInterval(()=>{presence();staleCheck()},30000);
      if(dirty&&G){dirty=false;setTimeout(()=>{if(G&&cli&&cli.up)pubGame()},600)}if(cur&&!G)waitGame(cur.gid,false);rxAt=syncAt=Date.now();if(document.hidden&&!bgT)bgWatch();lkUp(re);emit("status")};   /* 評審 P22.1：剛訂閱會收到保留狀態，重抓計時從現在算；在背景連上的，滿 60 秒再下線 */
    cli.onmsg=onMsg;
    cli.ondown=was=>{cli=null;clearInterval(hb);if(!downAt)downAt=Date.now();emit("status");
      clearTimeout(retryT);if(want)retryT=setTimeout(connect,backoff(was))}}
  /* 評審 P22（重連風暴）：以前連不上一律每 3 秒重試、斷線一律 0.8 秒重連；伺服器掛掉時每支手機一分鐘敲 20 次，連上又被踢的話更是不停重連。
     改成：連續失敗（連不上、或連上不到 60 秒又斷）重試間隔加倍 3、6、12、24、48 秒，最多 60 秒，再乘 0.8～1.2 的亂數錯開（伺服器恢復時大家不會同一秒湧進來）；
     穩定連了 60 秒以上才斷的，照舊約 0.8 秒就重連。切回 App、手機說網路恢復（kick）不等間隔，直接連 */
  /* Android 三方實測 P2-2（11/13）：斷網 60 秒、接回網路後要 30.6 秒才連上（棋鐘照扣）。斷線期間重試失敗好幾次，間隔已經長到 24～48 秒；
     網路恢復的那一刻（online 事件）通常路由還沒好，那一次又失敗，就要再等一個長間隔。改成：手機說網路恢復（online 事件，或 2 秒一次看到 navigator.onLine 從 false 變 true）、
     或切回前景時，接下來 20 秒（FAST_WIN）重試間隔固定 1～1.5 秒、失敗次數歸零；過了 20 秒還沒連上才回到原本的加倍間隔（伺服器掛掉時不會一直敲）。測試 tools/test-mp-p2.js */
  let fails=0,upAt=0,fastTill=0,lastOnL=null;const FAST_WIN=20000;
  function netBack(){fastTill=Date.now()+FAST_WIN;fails=0;if(cli&&!cli.up&&cli.kill){cli.kill();return}clearTimeout(retryT);setTimeout(kick,300)}
  const backoff=was=>{if(was&&Date.now()-upAt>=60000)fails=0;if(Date.now()<fastTill){fails++;return Math.round(1000+Math.random()*500)}const d=was&&!fails?800:Math.min(60000,3000*Math.pow(2,Math.min(fails,5)));fails++;return Math.round(d*(0.8+Math.random()*0.4))};
  const W={};   // 一次性查詢保留訊息（例如電腦的新網址）
  /* 合作殘譜（開發者 11/9；m/07q2-coop.js，設計 story/合作殘譜_同桌與大廳_設計_1109.md）：大廳「🧩 殘篇閣」用的通用頻道，只准 ROOT/q/… 底下的主題（q/h、q/r/<rid>/s、q/r/<rid>/e）；
     QS＝主題 → 處理函式清單，重新連上時一起訂回去。舊版 App 不訂 q/，收不到也不受影響；這組 API 發不到 sys、cup、cal、ctl、c/ */
  const QS={},qRel=r=>{if(typeof r!=="string"||!/^q(\/[\w-]{1,40}){1,3}(\/\+)?$/.test(r))throw new Error("殘篇閣主題不合規："+r);return r};
  const qHit=(k,rel)=>k===rel||(k.endsWith("/+")&&rel.startsWith(k.slice(0,-1))&&rel.length>k.length-1&&rel.indexOf("/",k.length-1)<0);
  function onMsg(topic,msg,retain){clkJump();if(W[topic]){W[topic](msg);return}const p=topic.slice(ROOT.length+1).split("/");
    if(p[0]==="q"){const rel=p.join("/");for(const k in QS)if(qHit(k,rel))QS[k].slice().forEach(f=>{try{f(rel,msg,retain)}catch(e){console.error(e)}});return}   /* 合作殘譜 */
    if(p[0]==="sys"&&p[1]==="ver"){try{emit("version",JSON.parse(msg))}catch(e){}return}
    if(p[0]==="sys"&&p[1]==="bots"){try{const x=msg?JSON.parse(msg):null;BOTS_ST=x&&Array.isArray(x.ids)?{up:!!x.up,ids:new Set(x.ids.map(String))}:null}catch(e){BOTS_ST=null}emit("people");return}   /* 回饋 854 */
    if(p[0]==="sys"&&p[1]==="online"){try{const x=msg?JSON.parse(msg):null;ONL=x&&isFinite(x.n)?{n:+x.n,at:+x.at||0}:null}catch(e){ONL=null}emit("people");return}   /* 回饋 854 */
    if(p[0]==="sys"||p[0]==="cup"&&p[1]==="req")return;
    if(p[0]==="cup"&&(p[1]==="state"||p[1]==="hall")){if(!msg)return;const k=p[1];cupQ=cupQ.then(()=>cupIn(k,msg)).catch(e=>console.error(e));return}   /* 第 9 輪評審：照收到的順序一則一則驗（cupIn） */
    if(p[0]==="u"){const id=p[1];if(!rosterOn&&!trk.has(id))return;   /* 回饋 854：名單已經收掉（取消訂閱前就送出來的） */
      if(!msg){delete people[id];if(id===me().id)heal()}
      else{try{const x=JSON.parse(msg);if(x&&x.id===id){if(id===me().id&&PK&&sgPk(x.pk)&&x.pk!==PK&&!selfBan()&&Date.now()-pkHealAt>20000){pkHealAt=Date.now();heal()}   /* 第 14 輪 F2：有人把我的上線狀態換成別把公開金鑰（想讓別人以為那是我）：馬上補回自己的（每 20 秒最多一次） */
          {const o=people[id];if(o&&sgPk(o.pk)&&sgPk(x.pk)&&o.pk!==x.pk)PFLIP[id]={at:Date.now(),a:o.pk,b:x.pk}}   /* 第 14 輪 F2：同一個代號的上線狀態換了公開金鑰（換手機、重裝，或有人冒充）：記下來，10 分鐘內他的邀請不會只顯示「第一次見到」 */
          if(x.v>=2)x.at=Math.min(Date.now(),+x.ts||Date.now());ptsPres(x);people[id]=x;sweep(id,x,retain)}}catch(e){}}   /* 評審 P22.5：ptsPres 記下他報的分數、場數，超過上限的換保守值 */   /* 回饋 854：新版的 at 是「現在＋32 分鐘」給舊版看的，存起來前換回更新時間（資料卡「幾分鐘前更新」用） */
      emit("people");tryMatch();return}
    if(p[0]==="i"){let x;try{x=JSON.parse(msg)}catch(e){return}if(!x||!x.from||typeof x.from!=="object"||!(Math.abs(Date.now()-(+x.at||0))<=IV_WIN))return;   /* 評比第 15 輪 X4 弱網長測抓到：以前只收送出時間在 2 分鐘內的，時間是對方手機的——對方手機慢 2 分鐘以上，他的邀請、接受全被丟掉，永遠開不了局。改成前後 12 小時；重放靠 gid（接受、婉拒要對上手上那則邀請的 gid，邀請同一個 gid 只處理一次，見 iIn） */
      const v=invVet(x);if(!ivN&&!(v&&typeof v.then==="function")){if(v)iIn(x,v);return}   /* 第 14 輪 F2：邀請、接受先驗簽名和金鑰（invVet），過了才照原本的流程（iIn）；不用等驗簽、前面也沒有排隊的，當場處理（跟以前一樣） */
      ivN++;ivIn=ivIn.then(()=>v).then(r=>{if(r)iIn(x,r)}).catch(e=>console.error(e)).then(()=>{ivN--});return}   /* 要驗簽、抓上線狀態的：照收到的順序一則一則來 */
    if(p[0]==="g"&&cur&&p[1]===cur.gid){
      if(p[2]==="s"){if(!msg)return;let x;try{x=JSON.parse(msg)}catch(e){return}if(!x||x.gid!==p[1]||!Array.isArray(x.moves)||!x.red||!x.black)return;
        vq=vq.then(()=>sgVet(x)).then(v=>{if(!cur||cur.gid!==x.gid)return;if(v.ok)gameIn(x,msg);else if(v.soft)sgSoft(x);else sgBad(x,v.why)}).catch(e=>console.error(e))}   /* 評審 P22 對局簽名：先驗簽（照收到的順序一則一則驗），過了才交給 gameIn（原本這裡的那段，含棋規握手的 rcNotice） */
      else if(p[2]==="k")lkIn(msg);   /* 評比第 12 輪 X11：對局的連線同步頻道（見 LINK 區段；舊版 App 不認 k，直接忽略） */
      else if(p[2]==="e"){try{const x=JSON.parse(msg),sid=G&&(x.by==="r"||x.by==="b")?(x.by==="r"?G.red.id:G.black.id):String(x.id||"");   /* 回饋 841：記下是誰傳的（照紅黑方對到對局裡的代號；新版也會附上 id），讀的時候濾掉封鎖的人 */
        emos.push({id:++emoN,by:x.by,sid,e:String(x.e||"").slice(0,12),text:String(x.text||"").slice(0,80),name:sid&&sid===me().id?realNm().slice(0,16):String(x.name||"").slice(0,16),at:Date.now()});   /* 回饋 842：自己的聊天在自己畫面顯示自己取的名字 */
        emos=emos.slice(-40);emit("game")}catch(e){}}}}
  /* 收件匣（原本 onMsg 裡那段）：v＝invVet 的結果（kc 對方金鑰的狀態、iv 邀請／接受有沒有驗過簽名） */
  const IV_WIN=12*3600e3,ivSeen=new Map();
  function iIn(x,v){if(x.type==="invite"){const k=String(x.gid)+"|"+String(x.from.id);if(ivSeen.has(k))return;ivSeen.set(k,1);if(ivSeen.size>300)ivSeen.delete(ivSeen.keys().next().value)}   /* 評比第 15 輪 X4：同一則邀請（gid＋送的人）只處理一次（網路重複送、被重放都一樣）；驗過簽名才記，偽造的搶先送不會擋掉真的 */
    if(v.kc){Object.defineProperty(x,"_kc",{value:v.kc,configurable:true});Object.defineProperty(x,"_iv",{value:!!v.iv,configurable:true});x.ks=v.kc.st}
      if((x.type==="invite"||x.type==="accept")&&x.from.rules!==RULE_ID){
        ruleMismatch();const m=me();cli&&cli.pub(`${ROOT}/i/${x.from.id}`,JSON.stringify({type:"decline",gid:x.gid,from:{id:m.id,name:m.name,rules:RULE_ID,rs:rsPref()},at:Date.now()}));
        if(pending&&pending.gid===x.gid){pending=null;clearTimeout(pendT)}return;}
      if(x.from.bot&&typeof x.from.id==="string")botMem[x.from.id]=1;   /* 回饋 854：角色的邀請會註明 bot（不在大廳頁、沒收名單時也認得出來，不跳「時制不一樣」） */
      if((x.type==="invite"||x.type==="accept")&&!(ptsSeen[x.from.id]&&ptsSeen[x.from.id].length))ptsNote(x.from.id,x.from.pts,x.from.n);   /* 評審 P22.5：邀請裡報的分數只在完全沒看過他的在線狀態時才當來源（有在線狀態就拿來對照，不採信） */
      if(x.type==="invite"&&x.auto){   // 隨機配對來的：還在找就自動接受，不然婉拒
        const m=me();const ok=!!seeking&&!playing()&&!pending&&tcOk(x.from)&&!blk(x.from.id)&&!selfBan();iSend(x.from.id,{type:ok?"accept":"decline",gid:x.gid,from:{id:m.id,name:m.name,pts:myPts(),n:gamesOf(rec()),tc:tcPref(),rules:RULE_ID,rs:rsPref(),pk:ok&&PK||undefined,kv:ok&&PK?2:undefined},at:Date.now()});
        if(ok){sgAccepted(x);seeking=0;G=null;enter(x.gid);waitGame(x.gid,true);emit("matched",{name:x.from.name})}}
      else if(x.type==="invite"){if(blk(x.from.id)||selfBan()){const m=me();cli&&cli.pub(`${ROOT}/i/${x.from.id}`,JSON.stringify({type:"decline",gid:x.gid,from:{id:m.id,name:m.name,pts:myPts(),tc:tcPref(),rules:RULE_ID,rs:rsPref()},at:Date.now()}))}else emit("invite",x)}   /* 回饋 841：封鎖的人送來的邀請，不跳視窗、直接婉拒 */
      else if(x.type==="accept"&&pending&&pending.gid===x.gid){const m=me(),auto=pending.auto;pending=null;clearTimeout(pendT);seeking=0;
        let red={id:m.id,name:m.name,pts:myPts(),pk:PK||undefined},black={id:x.from.id,name:x.from.name,pts:+x.from.pts||0,pk:sgPk(x.from.pk)};if(Math.random()<.5)[red,black]=[black,red];   // 紅黑一律隨機（意見回饋 191）
        const tc=tcPref(),now=Date.now();
        G={rules:RULE_ID,rc:netRc(x.from.rs),gid:x.gid,id:new Date().toISOString().replace(/[:.]/g,"-").slice(0,19),rev:1,red,black,moves:[],result:null,draw:null,at:now,tc,clk:{r:tc*60000,b:tc*60000},tk:now,tkN:0};
        arr={n:0,t:now};myStart=G.gid+"|"+G.id;   /* 11/13（Android 三方實測 P2 之後發現）：開局的這一方以前沒記「這一手從什麼時候起算」（arr），turnAt 一直回「現在」：自己是紅方時每步剩餘停在 3:00、對方合理判超時也不收（分岔）；自己是黑方時紅方不走永遠判不了超時。開局就記；自己是黑方時再照回音（ackTurn）往後挪 */
        sgBind(G,x.from.kv,x);enter(x.gid);pubGame();emit(auto?"matched":"start",{gid:x.gid,name:x.from.name});rcNotice(G)}
      else if(x.type==="decline"&&pending&&pending.gid===x.gid){const auto=pending.auto;pending=null;clearTimeout(pendT);if(auto){nope[x.from.id]=Date.now();tryMatch()}else emit("reply",{ok:false,name:x.from.name})}   /* 回饋 841：記下誰婉拒了隨機配對 */
      else if(x.type==="cancel"&&!blk(x.from.id))emit("cancel",x)}
  /* QA P1-1：公開伺服器上誰都能發對局狀態。自己在下這盤時，只接受合理的下一步：紅黑雙方不變；只多出對方的一步（或對方悔掉他自己的一步），而且整盤棋步都合法；
     判對方贏的結果要站得住（將死等規則判得出來，或自己真的超時）；判和要自己先提和、或規則判和 */
  /* 開發者 11/11（大廳規劃書票 2.2）：對手送來的棋步重演起來不合法（連走兩步、馬走田…）＝擋下、這盤只算友誼賽不計分，通知畫面一次。
     只看「棋步本身不合法」，不看網路延遲造成的少一步、多一步（那些照舊默默忽略，免得誤判） */
  const badG=new Set();
  function badCheck(x){try{if(!x||!G||badG.has(G.gid)||!window.XQ_netCheck)return;const v=window.XQ_netCheck(x.moves,x.rc);if(v&&v.ok)return;badG.add(G.gid);emit("abnormal",{gid:G.gid,why:"illegal"})}catch(e){}}
  const tmOf=g=>g.moves.length%2?"b":"r";
  /* 威脅模型 T4（第 15 輪 X4 找到、高；開發者 11/13 選「現在修」）：改過的 App 簽一份「只改棋鐘」的狀態（把我的鐘改成 1 秒），我的手機以前照收、下一步就判自己超時。
     棋鐘只有三種合法的變法：①走子的人扣自己的鐘、再加 inc（tickMove）；②判超時時把被判的那方存成 0（setResult 的 fz）；③再來一局重設成 tc 分鐘。
     所以對方送來的狀態：我的鐘一毫秒都不能動（只有「判我超時、結果是對方贏」時可以是 0，真的到時間沒有照舊由下面 timeout 那條核對）；
     他自己的鐘只能變少（剛走一步時最多多出 inc）；不能是負的、不是數字；tc、inc 開局後不能改；有棋鐘的盤不能把棋鐘拿掉、沒棋鐘的不能加 */
  function clkOk(a,b,me){if(!a.clk&&!b.clk)return true;if(!a.clk||!b.clk||!me)return false;
    if(+a.tc!==+b.tc||(+a.inc||0)!==(+b.inc||0))return false;
    const o=oppOf(me),A=a.clk,B=b.clk,num=x=>typeof x==="number"&&isFinite(x)&&x>=0;if(!num(B.r)||!num(B.b))return false;
    if(B[me]!==A[me]&&!(B[me]===0&&b.result&&b.result.timeout&&b.result.w===o))return false;
    return B[o]<=A[o]+(b.moves.length===a.moves.length+1?(+b.inc||0):0)+1}
  /* 再來一局：棋鐘要是全新的（雙方都是 tc 分鐘），時制、加秒跟上一盤一樣 */
  function clkFresh(a,b){if(!a.clk&&!b.clk)return true;if(!b.clk)return false;if(a.clk&&(+a.tc!==+b.tc||(+a.inc||0)!==(+b.inc||0)))return false;const f=+b.tc*60000;return f>0&&b.clk.r===f&&b.clk.b===f}
  function okNext(a,b){const me=side();try{
    if(a.rules!==b.rules||rcKey(a)!==rcKey(b))return false;   /* 棋規設定下到一半也不能換 */
    if(gKey(a)===gKey(b))return +a.tc===+b.tc&&(+a.inc||0)===(+b.inc||0);   /* T4：gKey 不含 tc、inc，只改這兩個的不能從這條捷徑過 */   /* 評比第 15 輪 X4 弱網長測抓到：內容一樣、只換更大的 rev 的轉送（例如分岔裁決後對方用 rev＋1 重送贏的那份）。以前已經結束的盤一律不收，兩邊的 rev 從此差 1，下一個動作（再來一局）撞號被當成同 rev 的不同內容，舊局蓋掉新局 */
    if(a.result&&!b.result)return b.red.id===a.black.id&&b.black.id===a.red.id&&!b.moves.length&&clkFresh(a,b);
    if(b.red.id!==a.red.id||b.black.id!==a.black.id||a.result)return false;
    const o=oppOf(me),A=a.moves,B=b.moves,n=Math.min(A.length,B.length);
    for(let i=0;i<n;i++)if(!B[i]||A[i][0]!==B[i][0]||A[i][1]!==B[i][1])return false;
    if(B.length===A.length+1){if(tmOf(a)!==o)return false}
    else if(B.length===A.length-1){if(a.cup||((A.length-1)%2?o!=="b":o!=="r"))return false}   /* 擂台比賽落子無悔 */
    else if(B.length!==A.length)return false;
    if(!clkOk(a,b,me))return false;
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
    const pair=(T,M)=>{if(!T.result||!T.result.timeout||(M.result&&M.result.timeout&&M.result.w!==tmOf(T)))return false;if(T.result.w!==oppOf(tmOf(T)))return false;   /* 評比第 15 輪 X4 弱網長測抓到：M 自己後來也判了超時（A 落子後對方斷線太久、A 判他超時），兩份都是超時、互不承認就永遠分岔（雙方各記一勝）；M 判的是 T 那步之後輪到的人，照樣用 M 那步的 lft 裁決 */
      if(M.moves.length!==T.moves.length+1)return false;for(let i=0;i<T.moves.length;i++)if(!M.moves[i]||!T.moves[i]||M.moves[i][0]!==T.moves[i][0]||M.moves[i][1]!==T.moves[i][1])return false;return true};
    let T=null,M=null;if(pair(a,b)){T=a;M=b}else if(pair(b,a)){T=b;M=a}else return null;
    return typeof M.lft==="number"&&M.lfN===M.moves.length&&M.lft>=FLAG_GRACE?M:T}catch(e){return null}}
  function flagRace(x){const w=flagTie(G,x);if(!w)return false;
    if(w===x){const was=G,before=side(),wasEnd=!!G.result;if(was.result&&JSON.stringify(was.result)!==JSON.stringify(x.result)&&!lateKeep(was,x))unrecord(was);   /* 威脅模型 T11：晚到太久、或同一盤第二次推翻，不撤回已記的勝場（lateKeep） */
      const n=JSON.parse(JSON.stringify(x));n.rev=Math.max(was.rev,x.rev)+1;n.at=Date.now();seenAt=n.at;if(n.moves.length!==was.moves.length)arr={n:n.moves.length,t:n.at};
      G=n;shObs(was);dirty=false;pubGame();if(side()!==before||!!G.result!==wasEnd)presence();record();emit("game")}
    else if(x.rev>=G.rev){const n=JSON.parse(JSON.stringify(G));n.rev=x.rev+1;n.at=Date.now();sgRelay(n,G);G=n;pubGame()}
    else sgFix();   /* 評比第 15 輪 X4：輸的那份 rev 比較小（伺服器上可能被它蓋掉了）：把自己這份重送一次，以前這裡什麼都不做，對方一直拿不到贏的那份 */
    return true}
  /* 威脅模型 T11（紅藍隊 R02 第一步，11/13；重現 rounds/r15/redblue/repro-lft-override.js、測試 tools/test-redblue.js）：
     改過的 App 斷線想多久都可以，回來送一步、自報很大的 lft，flagTie 就推翻對方已經判的超時。flagTie 照舊只看內容裁決（棋盤不分岔），
     但「落子推翻了我判的超時」時，算這步晚到多久：late＝（我收到這步的時間 − 我判超時的時間 − 這段時間我自己斷線的時間）＋他自報的 lft
       ＝從他自稱落子的那一刻（我判超時前 lft 毫秒）到我收到，中間經過多久；網路通的老實玩家只有幾秒，只有落子後斷線的才會很長。
     超過 LATE_WARN（3 分鐘）：記一筆（lateLog、emit "late"；不算進 suspicious，那是簽名驗不過的偽造訊息）。
     超過 LATE_NOSCORE（10 分鐘），或同一盤第二次（以上）被推翻、而且這次他在我判超時以後還連著線（LKH：判超時之後、這步送到 30 秒以前就收過他簽名的同步頻道訊息）：這支手機不撤回已記的勝場（flagRace 不呼叫 unrecord），之後這盤只算友誼賽（lateNs：record、unrecord 都跳過）；
       戰績那一筆記 lk:1、late（秒）。棋照樣接著下（兩邊棋盤一樣），對方手機照他的規則記。代價：落子後斷線超過 10 分鐘的老實玩家，在對方手機上算輸（規則本來就寫斷線也算）。
     判超時的時間：這支手機判的記在 FLAGME（setResult）；重開 App 後查不到就用戰績那一筆的時間。
     「第二次推翻」為什麼要加「連著線」：弱網長測（單邊長時間離線 ×0.2）裡老實的一方同一盤斷線 3 次、每次落子後才斷，晚到 294、344、482 秒，
       只看次數會讓他在對方手機上連輸 2 盤（戰績不一致）；斷線的老實玩家收不到也送不出同步頻道訊息，連著線卻讓這步晚到 30 秒以上才是故意的 */
  const LKH=[];
  /* 開發者 11/13 選「只記在對局紀錄」：晚到推翻（lateKeep）、千秋盃擋下沒有簽名的動作（cupActOk）不跳提示，記在這盤的 NOTES（每盤：晚到幾分鐘、有沒有保留勝場、擋下幾則），
     notes() 給結果視窗（m/09b-preload.js）和存進「真人對局」的紀錄（src/local.js 的 nnote，檢討頁 ℹ 看得到）；有變化 emit "note"。一般對局是空陣列＝不多一行 */
  const NOTES={};
  function noteAdd(g,e){try{if(!g||!g.gid)return;const k=lateK(g),L=NOTES[k]||(NOTES[k]=[]);if(e.k==="act"){const o=L.find(x=>x.k==="act");if(o)o.n++;else L.push({k:"act",n:1})}else L.push(e);
    const ks=Object.keys(NOTES);if(ks.length>30)delete NOTES[ks[0]];emit("note",{gid:g.gid,id:g.id,notes:L.map(x=>Object.assign({},x))})}catch(err){}}
  const notesOf=g=>{const x=g||G;return x&&x.gid&&NOTES[lateK(x)]?NOTES[lateK(x)].map(e=>Object.assign({},e)):[]};
  const LATE_WARN=180000,LATE_NOSCORE=600000,FLAGME={};let offSum=0,LATE=[];
  const offNow=()=>offSum+(cli&&cli.up||!downAt?0:Math.max(0,Date.now()-downAt));
  const LATEG=(()=>{const v=ls.get("lateG",{});return v&&typeof v==="object"&&!Array.isArray(v)?v:{}})();
  const lateK=g=>String(g.gid)+"|"+String(g.id),lateNs=g=>!!(g&&g.gid&&LATEG[lateK(g)]&&LATEG[lateK(g)].ns);
  function lateSave(){const ks=Object.keys(LATEG);if(ks.length>30)ks.sort((a,b)=>(LATEG[a].t||0)-(LATEG[b].t||0)).slice(0,ks.length-30).forEach(k=>{delete LATEG[k]});ls.set("lateG",LATEG)}
  function lateKeep(T,M){try{const s=side();if(!s||!T||!T.result||!T.result.timeout||T.result.w!==s)return false;
    const k=lateK(T),L=LATEG[k]||(LATEG[k]={}),now=Date.now(),f=FLAGME[k],R=rec(),h=R.hist.find(e=>e.gid===T.gid&&(!e.rid||e.rid===T.id));
    const at=f?f.at:h?+h.at:0,off=f?Math.max(0,offNow()-f.off):0,lf=typeof M.lft==="number"&&M.lfN===M.moves.length?Math.max(0,M.lft):0,late=at?Math.max(0,now-at-off)+lf:null;
    const on=!!(f&&LKH.some(t=>t>f.at&&t<now-30000));L.o=(L.o||0)+1;L.t=now;const keep=(L.o>=2&&on)||(late!=null&&late>LATE_NOSCORE);if(keep)L.ns=1;lateSave();
    if(keep&&h){h.lk=1;if(late!=null)h.late=Math.round(late/1000);ls.set("rate",R)}
    if(keep||(late!=null&&late>LATE_WARN)){noteAdd(T,{k:"late",n:late==null?null:Math.max(1,Math.round(late/60000)),keep});LATE.push({at:now,gid:T.gid,late,o:L.o,on,keep});LATE=LATE.slice(-50);emit("late",{gid:T.gid,sec:late==null?null:Math.round(late/1000),o:L.o,keep})}
    return keep}catch(e){return false}}
  /* 影子鐘（T11 第二步，第一版只記錄、不拿來判超時，給之後校準用）：從伺服器回音確認我這步（ackTurn）起，到收到對方那步為止，扣掉網路寬限 SH_GRACE，
     累加成對方的用時 sh；同時記他自己棋鐘扣掉的 cl（前一份的鐘＋inc−這份的鐘）。改過的 App 每步不扣鐘（R02②）時 sh 遠大於 cl。只放在 linkDebug().shadow、shadow() */
  const SH_GRACE=3000,SHEV=[];let shT=null,SHD=null;
  function shObs(prev){try{const s=side();if(!s||!G||!shT||lateK(G)!==shT.k||G.moves.length!==shT.n+1||moverOf(shT.n)===s)return;
    const now=Date.now(),o=oppOf(s),u=Math.max(0,now-shT.t-SH_GRACE),cl=prev&&!prev.result&&prev.clk&&G.clk&&prev.id===G.id&&prev.moves.length===shT.n?Math.max(0,prev.clk[o]+(+G.inc||0)-G.clk[o]):null;shT=null;
    if(!SHD||SHD.k!==lateK(G)){SHD={k:lateK(G),n:0,sh:0,cl:0,ncl:0,max:0};SHEV.length=0}
    SHD.n++;SHD.sh+=u;if(cl!=null){SHD.cl+=cl;SHD.ncl++;SHD.max=Math.max(SHD.max,u-cl)}SHEV.push({at:now,n:G.moves.length,sh:u,cl});if(SHEV.length>20)SHEV.shift()}catch(e){}}
  const shInfo=()=>!G||!SHD||SHD.k!==lateK(G)?{n:0,sh:0,cl:0,ncl:0,max:0,last:[]}:{n:SHD.n,sh:SHD.sh,cl:SHD.cl,ncl:SHD.ncl,max:SHD.max,last:SHEV.slice(-5).map(e=>Object.assign({},e))};
  /* 評審 P22 缺陷 d（tools/test-net-reconnect.js ⑤）：雙方在同一瞬間從同一份各改一次（一邊落子、一邊提和／悔棋／認輸…），兩份 rev 一樣、內容不同。
     以前只收「rev 更大」的，兩端各自忽略對方 → 分岔，3 分鐘後各判對方超時、都記勝場。棋鐘競逐（落子對判超時）照舊由上面的 flagRace 裁決，其餘的在這裡：
     兩端用同一條只看內容的規則選一份：①有結果（終局、認輸、判超時、和棋成立）的優先 ②棋步多的優先（落子贏過提和、悔棋）③都一樣就比內容字串，小的贏。
     輸的一方先檢查贏的那份是不是「從自己改動之前那份（G0）」改出來的合理下一步（okNext，跟平常收對方的狀態同一套），通過才採用；積分被改判先撤回再照新結果記。
     雙方都再用更大的 rev 重送一次（內容一樣），蓋掉伺服器上保留的那份；之後收到彼此那份內容一樣就不理，不會一直重送。觀眾只照規則選、不重送
     11/13（紅藍隊第 1 輪，把長測改成可重現以後抓到；以前要看 WebCrypto 哪一件先算完，偶爾才出現）：①之後多一條「玩家自己做的結果（同意和、認輸、規則判勝）優先於判超時」。
       情境：紅方落子後提和；黑方斷線又連回來、同意和；同一時間紅方的手機看黑方 3 分鐘沒動、判黑方超時，兩份 rev 一樣。以前兩份同樣有結果、棋步一樣多，
       比內容字串剛好選中「判超時」，黑方用自己的鐘核對不收（他還有時間），紅方一直重送、黑方一直當成拼接丟掉，永遠分岔（紅方記勝、黑方記和）。
       改成同意和贏：紅方核對得過（是他自己提的和），兩邊收斂到和棋。判超時對中止（abort）不變，還是比內容字串 */
  let G0=null;
  const gKey=g=>JSON.stringify([g.id||null,g.rules||null,g.red&&g.red.id,g.black&&g.black.id,g.moves||[],g.result||null,g.draw||null,g.clk||null]);
  const gRank=g=>[g.result?1:0,g.result&&!g.result.timeout&&!g.result.abort?1:0,Array.isArray(g.moves)?g.moves.length:0];
  function revPick(a,b){const ra=gRank(a),rb=gRank(b);for(let i=0;i<ra.length;i++)if(ra[i]!==rb[i])return ra[i]>rb[i]?a:b;return gKey(a)<=gKey(b)?a:b}
  /* 11/13（紅藍隊第 1 輪，長測改成可重現後抓到）：rev 撞號但其實接得上。情境：紅方落子後提和（rev n、n＋1），黑方只收到落子、自己也走一步再提和（rev n＋1、n＋2）；
     紅方照上面的規則改用黑方那一步、用 rev n＋2 轉送，剛好跟黑方的「提和」同一個 rev。黑方那份明明是接在紅方手上這份（內容一樣）後面簽的，
     以前紅方卻照 revPick 比字串、又因為 G0 不是那一份而不收，兩邊從此各走各的（另一邊一直當成拼接丟掉，可疑事件幾十則）。
     現在 sgVet 看出「對方簽的前一份雜湊＝我手上這份」時記 _pm，這裡用 okNext 核對過就當成一般的下一步收下 */
  function revTie(x){if(!G||x.gid!==G.gid||gKey(x)===gKey(G))return;const sd=side(),pm=!!(sd&&x._pm&&okNext(G,x));
    if(!pm&&revPick(G,x)===G){if(sd){const n=JSON.parse(JSON.stringify(G));n.rev=x.rev+1;n.at=Date.now();sgRelay(n,G);G=n;pubGame()}return}
    if(!pm&&sd&&!(G0&&G0.gid===x.gid&&G0.rev===x.rev-1&&okNext(G0,x))){badCheck(x);return}
    const was=G,before=sd,wasEnd=!!G.result;if(was.result&&JSON.stringify(was.result)!==JSON.stringify(x.result))unrecord(was);
    const n=JSON.parse(JSON.stringify(x));if(sd)n.rev=x.rev+1;n.at=Date.now();seenAt=n.at;if(n.moves.length!==was.moves.length)arr={n:n.moves.length,t:n.at};
    G=n;G0=null;shObs(was);dirty=false;if(sd)pubGame();if(side()!==before||!!G.result!==wasEnd)presence();record();emit("game")}
  /* ================= SIGN:BEGIN 對局簽名（評審 P22，開發者 11/11「肯定要做」：根治冒充對方認輸；測試 tools/test-net-sign.js） =================
     金鑰：每支手機一把 ECDSA P-256（WebCrypto；私鑰不可匯出），存在 IndexedDB「xqlab-sign」；沒有就產生。公開金鑰（raw 65 位元組、base64url）放在在線狀態、邀請、接受裡。
     綁定：邀請（invite.from.pk）和接受（accept.from.pk）交換公開金鑰；開局那份狀態的紅黑雙方都帶 pk，兩支手機各自把「這盤 gid：代號 → 公開金鑰」記在 BIND（存 localStorage，留最近 30 盤）。
       之後這盤只認這兩把金鑰；狀態裡的 pk 被換掉＝不收（第 14 輪 F2 起，交換時對方的金鑰先過 PIN 區段的檢查：邀請／接受的簽名、跟上線狀態宣告的對照、TOFU 釘選、指紋）。觀眾沒有參與交換：第一次看到簽好名的狀態就記下來，在線狀態裡有公開金鑰的話要對得上。
     簽什麼：每份對局狀態帶 sg＝{s 座位, a 動作, r 這個動作當時的 rev, h 內容雜湊, p 前一份內容雜湊, k 簽名}，簽「xq-act1|gid|id|r|s|a|h|p」。
       內容雜湊 h＝狀態去掉 rev、at、sg、rl 以後的 JSON 做 SHA-256（所以同一份內容換更大的 rev 重送時雜湊不變）。
       只換 rev 重送同一份內容（flagRace、revTie 收斂、補回保留訊息）＝轉送：保留原本動作的 sg，另外加 rl＝{s, r 新 rev, h, k}，簽「xq-rel1|gid|id|r|s|h」。
     驗什麼（sgVet；保留訊息、重連補狀態、觀眾都一樣）：雙方金鑰跟綁定的一樣 → h 對得上內容 → 簽名是 s 那一方的金鑰 → 動作跟座位對得上（authOk：落子是那一步的人簽、
       悔棋是被悔那步的人簽、提和是提的人簽、認輸只能輸的那方簽、同意和要有結果、判自己贏又不是超時或中止的要棋規判得出來）→ r 不等於 rev 的要有座位的轉送簽名
       → 自己在下的這盤、rev 剛好多 1 的新動作，p 要等於手上這份的雜湊（防拼接）。過了才交給原本的 gameIn（okNext、flagRace、revTie 照舊，判超時照舊用自己的棋鐘核對）。
       沒過：不收、記一筆可疑事件（SUS，不跳視窗），自己在下的話把手上最後一份好的原始訊息重送一次（每 5 秒最多一次），蓋掉伺服器上被偽造的保留訊息。
     舊版相容：邀請或接受裡沒有 pk（舊版 App、或這支手機不能用 WebCrypto）＝這盤標成 legacy：照舊規則收發、不驗簽，但這盤**不計積分**（signState() 回 "legacy"，畫面寫「對方版本較舊，無法驗證」）。
       已經綁了金鑰的盤，沒有簽名的狀態一律不收（不能降級）。千秋盃（gid cup… 而且有 cup）由裁判台開局（signState() 回 "cup"）：11/13 起裁判台寫 cup.sv≥1 的盤，玩家每個動作都要簽（見下面 cupActOk，威脅模型 T9）；
       第 9 輪評審起，開局要有裁判台的章（hs）或列在裁判台簽過名的名單裡，紅黑代號綁住不能換，棄擂判決要有裁判台的章（見上面 CUP_KEY 那段）。 */
  const u64=u=>{const a=new Uint8Array(u);let s="";for(let i=0;i<a.length;i++)s+=String.fromCharCode(a[i]);return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")};
  const sgEnc=s=>new TextEncoder().encode(s),sgPk=v=>typeof v==="string"&&/^[A-Za-z0-9_-]{80,100}$/.test(v)?v:undefined;
  let KEY=null,PK=null;
  const keyIo=(db,mode,fn)=>new Promise((ok,no)=>{const t=db.transaction("k",mode),q=fn(t.objectStore("k"));t.oncomplete=()=>ok(q&&q.result);t.onerror=t.onabort=()=>no(t.error)});
  const keyP=(async()=>{try{if(!(window.crypto&&crypto.subtle))return null;let db=null,kp=null;
    try{db=await new Promise((ok,no)=>{const r=indexedDB.open("xqlab-sign",1);r.onupgradeneeded=()=>{try{r.result.createObjectStore("k")}catch(e){}};r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});kp=await keyIo(db,"readonly",s=>s.get("me"))}catch(e){}
    if(!kp||!kp.privateKey||!kp.publicKey){kp=await crypto.subtle.generateKey({name:"ECDSA",namedCurve:"P-256"},false,["sign","verify"]);
      if(db){try{await keyIo(db,"readwrite",s=>s.add(kp,"me"))}catch(e){}try{const k2=await keyIo(db,"readonly",s=>s.get("me"));if(k2&&k2.privateKey&&k2.publicKey)kp=k2}catch(e){}}}
    try{if(db)db.close()}catch(e){}KEY=kp;PK=u64(await crypto.subtle.exportKey("raw",kp.publicKey));fpGet(PK);if(cli&&cli.up)presence(true);return kp}catch(e){return null}})();
  const hcStr=g=>{const o={};for(const k in g)if(k!=="rev"&&k!=="at"&&k!=="sg"&&k!=="rl")o[k]=g[k];return JSON.stringify(o)};
  const sha=async s=>u64(await crypto.subtle.digest("SHA-256",sgEnc(s)));
  const impK={},pubKey=pk=>impK[pk]||(impK[pk]=crypto.subtle.importKey("raw",b64u(pk),{name:"ECDSA",namedCurve:"P-256"},false,["verify"]));
  const sigOk=async(pk,msg,sig)=>{try{return await crypto.subtle.verify({name:"ECDSA",hash:"SHA-256"},await pubKey(pk),b64u(sig),sgEnc(msg))}catch(e){return false}};
  const signS=async msg=>u64(await crypto.subtle.sign({name:"ECDSA",hash:"SHA-256"},KEY.privateKey,sgEnc(msg)));
  const actMsg=(x,e)=>["xq-act1",x.gid,x.id,e.r,e.s,e.a,e.h,e.p||""].join("|"),relMsg=(x,l)=>["xq-rel1",x.gid,x.id,l.r,l.s,l.h].join("|");
  /* 威脅模型 T9：千秋盃玩家動作的簽名多綁大廳 ROOT、賽事 wk、場次 m、盤號 g（序號就是 rev，跟一般對局一樣：e.r 要等於 rev，轉送要有座位的轉送簽名）；裁判台 tools/cup-host.js 用同一套字串驗 */
  const cupC=x=>x&&x.cup&&typeof x.cup==="object"?x.cup:{};
  const cupActMsg=(x,e)=>{const c=cupC(x);return["xq-cupa1",ROOT,c.wk,c.m,c.g,x.gid,x.id,e.r,e.s,e.a,e.h,e.p||""].join("|")},cupRelMsg=(x,l)=>{const c=cupC(x);return["xq-cupr1",ROOT,c.wk,c.m,c.g,x.gid,x.id,l.r,l.s,l.h].join("|")};
  const signedG=g=>!!(g&&g.red&&g.black&&sgPk(g.red.pk)&&sgPk(g.black.pk));
  const BIND=(()=>{const b=ls.get("netBind",{});return b&&typeof b==="object"?b:{}})();
  const bindSet=(gid,v)=>{BIND[gid]=Object.assign({t:Date.now()},v);Object.keys(BIND).sort((a,b)=>(BIND[b].t||0)-(BIND[a].t||0)).slice(30).forEach(k=>{delete BIND[k]});ls.set("netBind",BIND)};
  const sgLegacy=g=>!!(g&&BIND[g.gid]&&BIND[g.gid].legacy);
  /* 接受邀請／開局時綁金鑰：雙方都有公開金鑰＝簽名局，否則舊版局 */
  /* 評比第 13 輪 X2：對方在邀請／接受裡帶 kv≥2（新版，連線同步頻道會簽名）＝綁定多記 kv:2，這盤 k 頻道沒簽名或簽名不對的一律丟掉（見 LINK 區段） */
  const kvOf=v=>+v>=2?{kv:2}:{};
  /* 第 14 輪 F2：綁定多記對方金鑰的狀態 ks（pinned／first／changed／none）、上一把 kw（changed 時）、iv（對方的邀請／接受驗過簽名），然後把對方這把金鑰記進釘選（見 PIN 區段） */
  /* 釘選的時機：對方的邀請／接受有驗過的簽名（證明他手機真的有這把私鑰）＝綁定時就記（pn:1）；沒簽名的（上一版）等收到他簽的第一份對局狀態才記（sgVet） */
  function sgAccepted(x){const fp=sgPk(x.from&&x.from.pk);if(PK&&fp){bindSet(x.gid,Object.assign({k:{[me().id]:PK,[x.from.id]:fp}},kvOf(x.from.kv),ksOf(x.from.id,fp,x),x._iv?{pn:1}:{}));if(x._iv)pinSet(x.from.id,fp,true)}else bindSet(x.gid,{legacy:true})}
  function sgBind(g,kv,x){if(signedG(g)){const o=g.red.id===me().id?g.black:g.red,iv=!!(x&&x._iv);bindSet(g.gid,Object.assign({k:{[g.red.id]:g.red.pk,[g.black.id]:g.black.pk}},kvOf(kv),ksOf(o.id,o.pk,x),iv?{pn:1}:{}));if(iv)pinSet(o.id,o.pk,true)}else bindSet(g.gid,{legacy:true})}
  /* ================= PIN:BEGIN 開局公開金鑰驗證（評比第 14 輪 F2，評審 P22.1、P22.2、P22.5、P31.3、P38.4；測試 tools/test-net-pin.js） =================
     以前：邀請、接受裡的公開金鑰 pk 照單全收——有人搶先用自己的金鑰冒充某個代號送邀請（或搶在本人之前回「接受」），這盤就綁上冒充者的金鑰，看不出來。現在四件事：
     ① 邀請、接受本身簽名：新版送出的 invite／accept 多帶 sg＝手機金鑰簽「xq-inv1|ROOT|收件人代號|JSON[type,gid,auto,at,from]」（from 整包，含 pk、kv、名字、積分、時制、棋規）。
        收到有 sg 的：用 from.pk 驗，驗不過＝丟掉（KEYBAD.sig）。所以「照抄別人上線狀態裡的公開金鑰、冒他的名義送邀請」行不通（沒有他的私鑰簽不出來），內容也不能被改了轉送給別人。
        沒有 sg 的（上一版 X2、更舊、不能用 WebCrypto）照舊收；但這個代號以前送過驗得過的簽名邀請（釘選記了 iv）卻突然不簽了＝降級，丟掉（KEYBAD.down）。
     ② 跟上線狀態宣告的金鑰對照：他（同一個代號）現在的上線狀態裡有公開金鑰、而且跟邀請／接受裡的不一樣＝衝突，丟掉（KEYBAD.conflict）：本人在線上、宣告的是另一把，幾乎一定是冒充。
        這支手機沒在收那個人的上線狀態時（不在大廳頁），先單獨抓一次他保留的上線狀態（peekPres，最多等 1.5 秒）再比。
        自己的上線狀態被別人換成別把金鑰：看到就馬上補回自己的（每 20 秒最多一次）。別人的上線狀態換了金鑰（PFLIP）：10 分鐘內那個代號用其中任一把來邀請，都標「已變更⚠」，不會只顯示「第一次見到」。
     ③ TOFU 釘選：每個對過局的代號 → 公開金鑰記在這支手機（localStorage xq_pkPin，最多 300 人，記第一次、最近一次、對局數、以前那把）。開局時對方的金鑰：
        跟釘選的一樣＝pinned「已釘選」；沒見過＝first「第一次見到」；不一樣＝changed「已變更⚠」（照樣開局：換手機、重裝 App、清網站資料都會換金鑰，只提示），這盤之後釘選改成新的。
        千秋盃另外有 cert「裁判台認證」（見下面）。狀態存在這盤的綁定（BIND[gid].ks），keyInfo() 給畫面（m/07hs-netsig.js 的連線狀態小卡、膠囊的 🔑⚠）。
     ④ 金鑰指紋：SHA-256("xq-fp1|"+公開金鑰) 前 30 位元 → 6 個字（2～9 和去掉 I、O 的英文字母），寫成 ABC-DEF。小卡顯示「對方金鑰指紋」和「我的指紋」，
        兩人當面、電話、或用別的聊天軟體比對：他的「我的指紋」要等於你看到的「對方金鑰指紋」。指紋不放進「複製除錯資訊」。
     擋得住：照抄公開金鑰冒名的邀請、改過內容的邀請、本人在線時用別把金鑰冒充（邀請或搶先接受）、對過局的人被換金鑰（提示 changed）、以前簽過的人被降級成沒簽名。
     擋不住：第一次見面、本人又不在線上（或他的上線狀態也被同時換掉、他的手機還沒補回來）時，冒充者用自己的金鑰冒名——只會顯示「第一次見到」，要靠比對指紋才看得出來；
        指紋 30 位元，有心人花大量運算可以算出一把指紋相同的金鑰（一般電腦約要幾小時到幾天），所以指紋相同是「很可能是本人」不是證明；婉拒、取消、上線狀態本身還是沒簽名（只能搗亂，不能冒充開局）。 */
  const PIN=(()=>{const p=ls.get("pkPin",{});return p&&typeof p==="object"&&!Array.isArray(p)?p:{}})(),PIN_MAX=300,KEYBAD={n:0,sig:0,conflict:0,down:0,last:null},PFLIP={};
  const pinSave=()=>{const ks=Object.keys(PIN);if(ks.length>PIN_MAX)ks.sort((a,b)=>(PIN[a].u||0)-(PIN[b].u||0)).slice(0,ks.length-PIN_MAX).forEach(k=>{delete PIN[k]});ls.set("pkPin",PIN)};
  function pinSet(id,pk,iv){pk=sgPk(pk);if(!id||!pk||id===me().id)return;const p=PIN[id],now=Date.now();fpGet(pk);
    if(p&&p.pk===pk){p.u=now;p.n=(p.n||0)+1;if(iv)p.iv=1}else PIN[id]=Object.assign({pk,t:now,u:now,n:1},iv?{iv:1}:{},p&&sgPk(p.pk)?{was:p.pk}:{});pinSave()}
  const presPk=x=>x&&x.id&&fresh(x,Date.now())?sgPk(x.pk):undefined;
  /* 對方金鑰的狀態：pp＝他的上線狀態（沒給就看名單裡的） */
  function keyCheck(id,pk,pp){pk=sgPk(pk);if(!id||!pk)return{st:"none"};const pin=PIN[id],pres=presPk(pp||people[id]);
    if(pres&&pres!==pk)return{st:"conflict",pk,pres};if(pin&&pin.pk===pk)return{st:"pinned",pk};
    const fl=PFLIP[id];if(fl&&Date.now()-fl.at<600000&&(fl.a===pk||fl.b===pk))return{st:"changed",pk,was:pin&&sgPk(pin.pk)?pin.pk:fl.a===pk?fl.b:fl.a,flip:1};   /* 10 分鐘內他的上線狀態換過金鑰：就算沒對過局也標「已變更」 */
    if(!pin||!sgPk(pin.pk))return{st:"first",pk};return{st:"changed",pk,was:pin.pk}}
  const ksOf=(id,pk,x)=>{const kc=x&&x._kc&&x._kc.pk===pk?x._kc:keyCheck(id,pk);fpGet(pk);if(kc.was)fpGet(kc.was);return Object.assign({ks:kc.st==="conflict"?"changed":kc.st},kc.was?{kw:kc.was}:{},x&&x._iv?{iv:1}:{})};
  const FPA="23456789ABCDEFGHJKLMNPQRSTUVWXYZ",FPC={};
  function fpGet(pk){pk=sgPk(pk);if(!pk)return null;if(Object.prototype.hasOwnProperty.call(FPC,pk))return FPC[pk];FPC[pk]=null;
    try{crypto.subtle.digest("SHA-256",sgEnc("xq-fp1|"+pk)).then(b=>{const u=new Uint8Array(b),v=((u[0]<<24)|(u[1]<<16)|(u[2]<<8)|u[3])>>>0;let s="";for(let i=0;i<6;i++)s+=FPA[(v>>>(27-5*i))&31];FPC[pk]=s.slice(0,3)+"-"+s.slice(3)}).catch(()=>{})}catch(e){}return null}
  function keyBad(k,x,why){KEYBAD[k]=(KEYBAD[k]||0)+1;KEYBAD.n++;KEYBAD.last={k,why,at:Date.now()};try{emit("keybad",{k,why,type:x&&x.type,name:String(x&&x.from&&x.from.name||"").slice(0,16)})}catch(e){}return null}
  const invStr=(x,to)=>"xq-inv1|"+ROOT+"|"+to+"|"+JSON.stringify([x.type,x.gid,!!x.auto,x.at,x.from]);
  /* 送收件匣訊息：帶自己公開金鑰的（邀請、接受）先簽名；照呼叫順序送 */
  let ivQ=Promise.resolve(),ivIn=Promise.resolve(),ivP=0,ivN=0;
  function iSend(to,x){const y=JSON.parse(JSON.stringify(x)),need=!!(KEY&&PK&&y.from&&y.from.pk===PK&&window.crypto&&crypto.subtle),go=()=>cli&&cli.pub(`${ROOT}/i/${to}`,JSON.stringify(y));
    if(!need&&!ivP){go();return}   /* 不用簽（婉拒、沒有金鑰）而且前面沒有排隊的：當場送 */
    ivP++;ivQ=ivQ.then(async()=>{try{if(need)y.sg=await signS(invStr(y,to))}catch(e){}go()}).catch(e=>console.error(e)).then(()=>{ivP--})}
  /* 沒在收那個人的上線狀態：單獨抓一次他保留在伺服器上的（最多等 1.5 秒；名單開著、或本來就有在追的人不用抓） */
  const peekPres=id=>{const t=`${ROOT}/u/${id}`;if(rosterOn||trk.has(id)||W[t]||!(cli&&cli.up))return Promise.resolve(null);
    return new Promise(res=>{let to=null;const done=v=>{clearTimeout(to);delete W[t];try{if(cli&&cli.up&&!rosterOn&&!trk.has(id))cli.unsub([t])}catch(e){}let x=null;try{x=v?JSON.parse(v):null}catch(e){}res(x&&x.id===id?x:null)};
      W[t]=done;to=setTimeout(()=>done(null),1500);cli.sub([t])})};
  /* 收到邀請／接受：回 {kc 對方金鑰的狀態, iv 有沒有驗過簽名}，或 null＝丟掉（KEYBAD 計數、emit keybad）。婉拒、取消照舊不驗。
     沒有公開金鑰的（舊版）、降級的當場就有答案；有公開金鑰的要驗簽、可能要抓上線狀態，回 Promise */
  function invVet(x){if(x.type!=="invite"&&x.type!=="accept")return{};if(x.type==="accept"&&!(pending&&pending.gid===x.gid))return{};   /* 不是回我手上這則邀請的接受：本來就不理，不用驗 */const f=x.from,id=String(f.id||""),pk=sgPk(f.pk),pin=PIN[id];
    if(!id||id===me().id)return null;
    if(pin&&pin.iv&&typeof x.sg!=="string")return keyBad("down",x,"這位棋友以前的邀請都有簽名，這次沒有（可能有人冒充）");
    if(!pk)return{kc:{st:"none"},iv:false};
    return invVetK(x,id,pk)}
  async function invVetK(x,id,pk){let iv=false;if(typeof x.sg==="string"&&window.crypto&&crypto.subtle){if(!(await sigOk(pk,invStr(x,me().id),x.sg)))return keyBad("sig",x,(x.type==="accept"?"接受":"邀請")+"的簽名不對（內容被改過，或冒用別人的公開金鑰）");iv=true}
    let pp=people[id];if(!presPk(pp)){const q=await peekPres(id);if(q)pp=q}
    const kc=keyCheck(id,pk,pp);if(kc.st==="conflict")return keyBad("conflict",x,(x.type==="accept"?"接受":"邀請")+"裡的金鑰跟他上線狀態宣告的不一樣（可能有人冒充）");
    return{kc,iv}}
  /* 這盤對方金鑰的狀態（畫面用）：st＝pinned／first／changed／none、fp 指紋、was 上一把的指紋、mine 我的指紋、cert 裁判台認證、iv 開局的邀請／接受有簽名 */
  function keyInfo(){if(!G||!side())return null;const B=BIND[G.gid]||{},o=oppId(),pk=B.k&&sgPk(B.k[o]),pin=PIN[o];
    const st=B.legacy||!pk?"none":B.ks||(pin&&pin.pk===pk?"pinned":"first");return{st,fp:fpGet(pk),was:B.kw?fpGet(B.kw):null,mine:fpGet(PK),cert:B.ka==="cert",iv:!!B.iv,cup:!!B.cup}}
  /* 千秋盃（評比第 14 輪 F2）：裁判台開局時把雙方報名驗過的公開金鑰寫進對局（red.pk、black.pk，整份蓋裁判台的章 hs）。
     第一次看到這盤、章驗得過＝這兩把是「裁判台認證」的（ka:"cert"）；看到的不是裁判台蓋章的那份（例如中途才進來）＝先用對方上線狀態宣告的、沒有就用釘選的（ka:"tofu"，
     收到第一則驗得過的 k 才記進釘選），之後收到裁判台蓋章的狀態再升級成認證。觀眾也記（用不到）。 */
  function cupKeys(x,hs){const i=me().id,seat=x.red.id===i?"red":x.black.id===i?"black":null,k={};
    if(hs)for(const s of["red","black"]){const p=sgPk(x[s].pk);if(p)k[x[s].id]=p}
    if(hs&&Object.keys(k).length){if(!seat)return{k,ka:"cert"};const o=x[seat==="red"?"black":"red"];return Object.assign({k,ka:"cert"},k[o.id]?ksOf(o.id,k[o.id]):{ks:"none"})}
    if(!seat||!PK)return{};const o=x[seat==="red"?"black":"red"],pin=PIN[o.id],op=presPk(people[o.id])||(pin&&sgPk(pin.pk));
    return Object.assign({k:Object.assign({[i]:PK},op?{[o.id]:op}:{}),ka:"tofu"},op?ksOf(o.id,op):{ks:"none"})}
  /* 千秋盃「裁判台認證」的金鑰（裁判台驗過他報名的簽名）直接記進釘選；tofu 的等收到驗得過的 k 再記（LINK 區段 lkUse） */
  function pinCand(x,B){const i=me().id,o=x.red.id===i?x.black:x.black.id===i?x.red:null;if(!o||!B||!B.k||!B.k[o.id]||B.ka==="tofu")return;pinSet(o.id,B.k[o.id],false)}
  /* ================= PIN:END ================= */
  /* 自己的新動作：清掉抄來的簽名、記下前一份（簽 p 用）；只換 rev 重送：記下來源（沿用原本的簽名） */
  const sgFresh=(n,b)=>{delete n.sg;delete n.rl;delete n.hs;Object.defineProperty(n,"_b",{value:b||null,configurable:true})},sgRelay=(n,src)=>{Object.defineProperty(n,"_s",{value:src,configurable:true})};
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
    if(r&&!r.abort&&!r.timeout&&r.w===s){let v=null;try{v=window.XQ_netCheck?window.XQ_netCheck(x.moves,x.rc):null}catch(err){}if(!(v&&v.ok&&v.res&&v.res.w===s))return false}   /* 評審 P22.5（11/12）：照這盤的棋規 rc 判（跟 okNext 一致）；以前沒帶 rc，臺灣規程原型那種「長將只提示、不判負」的盤，觀眾會收下對手自稱的長將勝 */
    return true}
  /* 還沒綁金鑰的盤（觀眾、或這支手機的綁定紀錄不見了）：從這份狀態推一個綁定，驗過簽名才記下來 */
  function sgBindFrom(x){const i=me().id,seat=x.red.id===i?"red":x.black.id===i?"black":null;
    if(!signedG(x)){for(const k of["red","black"]){const pp=people[x[k].id];if(pp&&sgPk(pp.pk))return null}if(seat&&PK&&sgPk(x[seat==="red"?"black":"red"].pk))return null;return{legacy:true}}
    if(seat&&x[seat].pk!==PK)return null;
    for(const k of["red","black"]){const pp=people[x[k].id];if(pp&&sgPk(pp.pk)&&pp.pk!==x[k].pk)return null}
    const r={k:{[x.red.id]:x.red.pk,[x.black.id]:x.black.pk}};if(seat){const o=x[seat==="red"?"black":"red"];Object.assign(r,ksOf(o.id,o.pk))}return r}
  async function sgVet(x){let B=BIND[x.gid],cand=null;
    if(!B&&(/^cup/.test(String(x.gid))&&x.cup||cupGidKnown(x.gid))){const hs=!!x.cup&&await cupHsOk(x);if(!x.cup||!(hs||cupListed(x))){cupBad("game","千秋盃對局 "+String(x.gid).slice(0,40)+" 不是裁判台開的");return{ok:false,why:"千秋盃對局沒有裁判台簽名"}}const ce=cupEntry(x.gid),zk=!!(ce&&(ce.z.rpk||ce.z.bpk));if(zk&&((ce.z.rpk||null)!==(x.red.pk||null)||(ce.z.bpk||null)!==(x.black.pk||null))){cupBad("game","千秋盃雙方金鑰跟裁判台名單不一樣");return{ok:false,why:"千秋盃雙方金鑰跟裁判台名單不一樣"}}
      cand=Object.assign({cup:true,r:x.red.id,b:x.black.id},cupKeys(x,hs||zk),hs?{sv:+x.cup.sv||0,cw:cupW(x.cup)}:ce?{sv:+ce.z.sv||0,cw:cupW({wk:CUP.wk,m:ce.mk,g:ce.i,tb:ce.z.tb,sv:ce.z.sv})}:{});B=cand}   /* 威脅模型 T9：名單裡有雙方金鑰（rpk、bpk）的，中途才進來也算「裁判台認證」；記下簽名版本 sv 和賽事欄位 cw */   /* 第 9 輪評審：千秋盃對局要裁判台開的（hs 或簽過名的名單裡有），綁住紅黑代號。第 14 輪 F2：順便記雙方公開金鑰（cupKeys，k 頻道簽名用） */
    if(!B){cand=sgBindFrom(x);if(!cand)return{ok:false,why:"金鑰對不上（不是這盤的雙方）"};B=cand}
    if(B.cup){if(B.r&&(x.red.id!==B.r||x.black.id!==B.b)){cupBad("game","千秋盃對陣被換掉");return{ok:false,why:"千秋盃對陣跟裁判台開的不一樣"}}
      if(x.result&&x.result.forfeit&&!(await cupHsOk(x))){cupBad("game","棄擂判決沒有裁判台簽名");return{ok:false,why:"棄擂判決沒有裁判台簽名"}}
      if(!cand&&B.ka!=="cert"&&x.hs&&(x.red.id===me().id||x.black.id===me().id)&&await cupHsOk(x)){const u=cupKeys(x,true);if(u.ka==="cert"){bindSet(x.gid,Object.assign({},B,u,{kv:B.kv},B.cw?{}:{sv:+x.cup.sv||0,cw:cupW(x.cup)}));pinCand(x,BIND[x.gid])}}   /* 第 14 輪 F2：中途才進來的，收到裁判台蓋章的狀態就升級成「裁判台認證」 */
      {const Bn=!cand&&BIND[x.gid]||B;if(Bn.cw&&(!x.cup||cupW(x.cup)!==Bn.cw)){cupBad("act","千秋盃賽事、場次、盤號被換掉");return{ok:false,why:"千秋盃賽事、場次、盤號跟裁判台開的不一樣"}}
        const av=await cupActOk(x,Bn);if(!av.ok){cupBad("act",av.why);noteAdd(x,{k:"act"});return{ok:false,why:av.why}}}   /* 威脅模型 T9：玩家動作簽名（cupActOk） */
      if(cand){bindSet(x.gid,cand);pinCand(x,cand)}return{ok:true,mode:"cup"}}
    if(B.legacy){if(cand)bindSet(x.gid,cand);return{ok:true,mode:"legacy"}}
    if(!(window.crypto&&crypto.subtle))return{ok:false,why:"這個瀏覽器不能驗簽"};
    const e=x.sg;if(!e||typeof e!=="object"||typeof e.k!=="string"||typeof e.h!=="string"||typeof e.r!=="number")return{ok:false,why:"沒有簽名"};
    if(!signedG(x)||!B.k||B.k[x.red.id]!==x.red.pk||B.k[x.black.id]!==x.black.pk)return{ok:false,why:"雙方金鑰跟開局時不一樣"};
    const h=await sha(hcStr(x));if(e.h!==h)return{ok:false,why:"內容跟簽名不符"};
    const pk=e.s==="r"?x.red.pk:e.s==="b"?x.black.pk:null;if(!pk||!(await sigOk(pk,actMsg(x,e),e.k)))return{ok:false,why:"簽名不對"};
    if(!authOk(x,e))return{ok:false,why:"這個動作不是簽名的那一方能做的"};
    if(e.r!==x.rev){const l=x.rl;if(!(e.r<x.rev&&l&&typeof l==="object"&&l.r===x.rev&&l.h===h&&typeof l.k==="string"))return{ok:false,why:"舊訊息重放"};
      const lp=l.s==="r"?x.red.pk:l.s==="b"?x.black.pk:null;if(!lp||!(await sigOk(lp,relMsg(x,l),l.k)))return{ok:false,why:"轉送簽名不對"}}
    else if(G&&G.gid===x.gid&&G.id===x.id&&x.rev===G.rev+1&&G.sg&&side()&&!flagTie(G,x)&&e.p!==(await sha(hcStr(G))))return await spliceWhy(x,e);   /* 評比第 15 輪 X4 弱網長測：兩邊各自往下走了不同步數的分岔（一邊判超時 rev 30，另一邊落子 rev 30＋判超時 rev 31），對方那支的 rev 剛好多 1，以前被當成拼接、永遠收不到；是 flagTie 認得的競逐就交給 flagRace 裁決（簽名照驗） */
    if(G&&G.gid===x.gid&&G.id===x.id&&x.rev===G.rev&&e.r===x.rev&&e.p&&side()&&gKey(x)!==gKey(G)&&e.p===(await sha(hcStr(G))))Object.defineProperty(x,"_pm",{value:1,configurable:true});
    if(cand)bindSet(x.gid,cand);pinLate(x,e);return{ok:true,mode:"signed"}}
  async function spliceWhy(x,e){const why="接在別的局面後面（拼接）";try{for(const r of RING){if(r.gid!==x.gid)continue;let y=null;try{y=JSON.parse(r.s)}catch(err){}if(y&&y.id===x.id&&e.p===(await sha(hcStr(y))))return{ok:false,why}}}catch(err){}LKN.fork++;return{ok:false,why,soft:1}}
  function sgSoft(x){if(G&&x.gid===G.gid){sgFix();lkNeed()}}
  /* 威脅模型 T9（紅藍隊 R01，11/13；測試 tools/test-redblue.js）：千秋盃（裁判台開局時寫 cup.sv≥1 的盤）玩家的落子、認輸、提和、同意和、判超時都要簽名。
     收到一份狀態：①裁判台蓋章的（hs 驗得過：開局、改回、規則判決、判超時、棄擂）照收；
     ②有玩家簽名 sg：用裁判台認證的那一方金鑰驗 cupActMsg（綁 ROOT、賽事 wk、場次 m、盤號 g、gid、id、rev、座位、動作、內容雜湊、前一份雜湊），動作要是那一方能做的（authOk），
       rev 要等於簽名裡的 r（只換 rev 的轉送要有座位的轉送簽名 cupRelMsg）＝舊動作不能重放；自己在下的這盤、rev 剛好多 1 的，前一份雜湊要等於手上這份（防拼接）；
     ③沒有簽名（或簽名是前一個動作留下的）：只有沒有金鑰的座位（虛擬棋客）能做。雙方都有金鑰＝一律不收；有一方是棋客時跟手上這份比（cupBotStep），
       只能多出棋客的棋步、棋客的提和，結果要是棋客做得出來的（棋客認輸、判超時、棋規判得出棋客贏、對方先提和的同意和）；
       手上沒有這盤（觀眾中途才進來）時只擋「沒有簽名的玩家認輸」。中止只有裁判台能下。
     驗不過：不收、記 CUPBAD.act 和可疑事件，正在下的人把真的重送（sgBad、sgFix）。sv 是 0（舊裁判台開的盤）照舊不驗 */
  async function cupActOk(x,B){if(!(B&&B.sv>=1))return{ok:true};
    if(x.hs&&await cupHsOk(x))return{ok:true,by:"host"};
    if(x.result&&x.result.abort)return{ok:false,why:"千秋盃不能由玩家中止"};
    const cert=B.ka==="cert"&&B.k,K={r:cert?sgPk(B.k[x.red.id]):undefined,b:cert?sgPk(B.k[x.black.id]):undefined},e=x.sg;
    if(e&&typeof e==="object"&&(e.s==="r"||e.s==="b")&&K[e.s]&&typeof e.k==="string"&&typeof e.r==="number"&&window.crypto&&crypto.subtle){const h=await sha(hcStr(x));
      if(e.h===h){if(!(await sigOk(K[e.s],cupActMsg(x,e),e.k)))return{ok:false,why:"千秋盃玩家簽名不對（別盤、別的場次，或內容被改過）"};
        if(!authOk(x,e))return{ok:false,why:"千秋盃：這個動作不是簽名的那一方能做的"};
        if(e.r!==x.rev){const l=x.rl;if(!(e.r<x.rev&&l&&typeof l==="object"&&l.r===x.rev&&l.h===h&&K[l.s]&&typeof l.k==="string"&&await sigOk(K[l.s],cupRelMsg(x,l),l.k)))return{ok:false,why:"千秋盃：舊動作重放"}}
        else if(G&&G.gid===x.gid&&G.id===x.id&&x.rev===G.rev+1&&G.sg&&side()&&!flagTie(G,x)&&e.p!==(await sha(hcStr(G))))return{ok:false,why:"千秋盃：接在別的局面後面（拼接）"};
        return{ok:true,by:"sig"}}}
    const kl=["r","b"].filter(s=>!K[s]);if(!kl.length)return{ok:false,why:"千秋盃玩家動作沒有簽名"};if(kl.length===2)return{ok:true,by:"bot"};
    const same=G&&G.gid===x.gid&&G.id===x.id,P=same&&x.rev===G.rev&&G0&&G0.gid===x.gid&&G0.id===x.id&&G0.rev===x.rev-1&&gKey(x)!==gKey(G)?G0:same?G:null;   /* 同一個 rev 各改一次（競逐）：跟改之前那份比 */
    return cupBotStep(P,x,kl[0])}
  function cupBotStep(P,x,k){const r=x.result,bad=why=>({ok:false,why:"千秋盃："+why}),kind=r?(r.abort?"abort":r.timeout?"flag":r.w==null?"drawok":r.w===k?"claim":"resign"):null;
    if(!P){if(kind==="claim"&&!authOk(x,{s:k,a:kind}))return bad("沒有簽名的玩家認輸");return{ok:true,by:"bot"}}
    const A=P.moves,M=x.moves;for(let i=0;i<Math.min(A.length,M.length);i++)if(!M[i]||!A[i]||M[i][0]!==A[i][0]||M[i][1]!==A[i][1])return bad("前面的棋步被改");
    if(x.rev<P.rev&&M.length<=A.length&&(!r||JSON.stringify(r)===JSON.stringify(P.result||null)))return{ok:true,by:"old"};   /* 比手上舊、晚到的（gameIn 本來就不理） */
    if(M.length<A.length)return bad("棋步變少");
    for(let i=A.length;i<M.length;i++)if(moverOf(i)!==k)return bad("玩家的棋步沒有簽名");
    if(x.draw&&x.draw!==k&&x.draw!==P.draw)return bad("玩家的提和沒有簽名");
    if(r&&JSON.stringify(r)!==JSON.stringify(P.result||null)){if(P.result||!authOk(x,{s:k,a:kind}))return bad("結果沒有玩家的簽名");if(kind==="drawok"&&P.draw!==oppOf(k))return bad("對方沒有提和，卻變成同意和棋")}
    return{ok:true,by:"bot"}}
  /* 第 14 輪 F2：還沒記進釘選的（對方的邀請／接受沒簽名、或綁定是從狀態推出來的）：收到驗過的、對方簽的對局狀態才記 */
  function pinLate(x,e){const i=me().id,s=x.red.id===i?"r":x.black.id===i?"b":null,B=BIND[x.gid];if(!s||!B||B.pn||!B.k||B.cup)return;const o=oppOf(s);
    if(!(e.s===o||(e.r!==x.rev&&x.rl&&x.rl.s===o)))return;const oid=o==="r"?x.red.id:x.black.id;B.pn=1;ls.set("netBind",BIND);pinSet(oid,B.k[oid],!!B.iv)}
  /* 送出前蓋章：舊版局、千秋盃照舊送；簽名局沒有金鑰或不是這盤的一方就不送 */
  async function sgSeal(g){const B=BIND[g.gid];if(!B||B.legacy)return JSON.stringify(g);if(B.cup)return cupSeal(g,B);
    const kp=await keyP,i=me().id,s=g.red.id===i?"r":g.black.id===i?"b":null;if(!kp||!s)return null;
    if(!g.sg&&g._s&&g._s.sg&&hcStr(g._s)===hcStr(g))g.sg=g._s.sg;
    const h=await sha(hcStr(g));
    if(!g.sg||g.sg.h!==h){const b=g._b||null,e={v:1,s,a:actOf(b,g,s),r:g.rev,h,p:b?await sha(hcStr(b)):""};e.k=await signS(actMsg(g,e));g.sg=e;delete g.rl}
    else if(g.sg.r!==g.rev&&!(g.rl&&g.rl.r===g.rev&&g.rl.h===h)){const l={s,r:g.rev,h};l.k=await signS(relMsg(g,l));g.rl=l}
    return JSON.stringify(g)}
  /* 威脅模型 T9：千秋盃送出前蓋章。裁判台認證的金鑰是這支手機的才簽（舊盤 sv 0、虛擬棋客的座位、換過手機的照舊送，對方和裁判台會擋）；
     自己的新動作（sgFresh 記了 _b）簽 cupActMsg；只換 rev 的轉送：玩家簽過的加轉送簽名 cupRelMsg，裁判台蓋章的（hs）、棋客沒簽名的原樣送 */
  async function cupSeal(g,B){const kp=await keyP,i=me().id,s=g.red.id===i?"r":g.black.id===i?"b":null;
    if(!(B.sv>=1)||!kp||!s||B.ka!=="cert"||!B.k||B.k[i]!==PK)return JSON.stringify(g);
    const own=Object.prototype.hasOwnProperty.call(g,"_b");if(!own&&g.hs)return JSON.stringify(g);
    if(!g.sg&&g._s&&g._s.sg&&hcStr(g._s)===hcStr(g))g.sg=g._s.sg;const h=await sha(hcStr(g));
    if(own&&!(g.sg&&g.sg.h===h)){const b=g._b||null,e={v:1,s,a:actOf(b,g,s),r:g.rev,h,p:b?await sha(hcStr(b)):""};e.k=await signS(cupActMsg(g,e));g.sg=e;delete g.rl}
    else if(g.sg&&g.sg.h===h&&g.sg.r!==g.rev&&!(g.rl&&g.rl.r===g.rev&&g.rl.h===h)){const l={s,r:g.rev,h};l.k=await signS(cupRelMsg(g,l));g.rl=l}
    return JSON.stringify(g)}
  let vq=Promise.resolve(),sigQ=Promise.resolve(),wire=null,SUS=[],fixAt=0;
  /* 伺服器上這盤保留的不是最新的真訊息（被偽造的蓋掉、或有人重放舊的）：自己在下的話，把手上最後一份好的原始訊息重送一次（每 5 秒最多一次） */
  let fixT=null;
  function sgFix(){if(!(side()&&G&&wire&&wire.gid===G.gid&&cli&&cli.up))return;const w=Date.now()-fixAt;
    if(w>5000){fixAt=Date.now();cli.pub(`${ROOT}/g/${G.gid}/s`,wire.s,true)}else if(!fixT)fixT=setTimeout(()=>{fixT=null;sgFix()},5001-w)}   /* 評審 P22.2 混沌網路實測：5 秒內又看到舊的，以前直接略過（伺服器上可能就停在舊的那份），改成等滿 5 秒再補一次 */
  function sgBad(x,why){SUS.push({at:Date.now(),gid:x.gid,rev:x.rev,why});SUS=SUS.slice(-50);emit("suspicious",{gid:x.gid,why});if(G&&x.gid===G.gid)sgFix()}
  const sgState=()=>{if(!G)return null;const B=BIND[G.gid];return!B?"unknown":B.legacy?"legacy":B.cup?"cup":"signed"};
  /* 驗過的對局狀態（原本 onMsg 裡那段，照舊）：flagRace → 更新的 rev → 同 rev 裁決 → 舊的就補送自己的 */
  /* 評比第 12 輪 X11：via＝"k"（對手直接從連線同步頻道補來的，不代表伺服器有這份：不算回音確認，交給 netHeal 去核對、補到伺服器；比手上舊的直接不理）、
     "gap"（先前跳號暫放、補齊後再套用的）；跳號又接不上手上這份的先放 gapQ，跟對手要中間那幾份（LINK 區段） */
  function gameIn(x,msg,via){const vk=via==="k";rxAt=Date.now();lkHear(x);if(vk&&G&&x.gid===G.gid&&x.rev<G.rev)return;if(G&&x.gid===G.gid&&side()&&flagRace(x))return;
    if(!G||x.rev>G.rev||x.gid!==G.gid){if(G&&x.gid===G.gid&&side()&&!okNext(G,x)){if(x.rev>G.rev+1)gapPut(x,msg);badCheck(x);return}seenAt=Date.now();const before=side(),wasEnd=!!(G&&G.result),pv=G;if(!G||x.gid!==G.gid||x.moves.length!==G.moves.length)arr={n:x.moves.length,t:obsTk(x,G)};G=x;shObs(pv);netAck=vk?null:x;if(vk)pubTry=0;wire={gid:x.gid,rev:x.rev,s:msg};lkRing(x.gid,x.rev,msg);dirty=false;if(side()!==before||!!G.result!==wasEnd)presence();record();emit("game");if(typeof rcNotice==="function")rcNotice(G);gapRun()}
    else if(x.rev===G.rev){if(gKey(x)===gKey(G)&&!vk){ackTurn();netAck=G}revTie(x)}else if(dirty&&G&&x.rev<G.rev)pubGame();else if(G&&x.rev<G.rev&&!sgLegacy(G)){if(side()){netAck=null;pubTry=0}sgFix()}}   /* 收到比手上舊的＝伺服器上留的可能被晚到的舊訊息蓋掉了：補送一次，而且改回「還沒確認」，補送那則也掉了的話 netHeal 會再送。netAck：伺服器轉回來的（含自己送出去的回音）跟手上這份一樣＝伺服器確實收到了 */
  /* ================= SIGN:END ================= */
  /* ================= LINK:BEGIN 連線同步頻道（評比第 12 輪 X11，評審「連線與雲端架構師」P22.1 斷線重連與狀態同步、P22.2 延遲與容錯；測試 tools/test-net-link.js） =================
     對局頻道多一個 g/<對局>/k（不保留）：只有正在下這盤的兩支手機用，觀眾不送不收。舊版 App 訂的是 g/<對局>/+，收到 k 直接忽略（舊版 onMsg 只認 s、e）。
     每則都帶 {v:1, t 種類, id 送的人, ss 這次開 App 的亂數, sq 序號（同一個 ss 內只增不減）, gid}：
       p＝ping：每 15 秒一次；剛連上、剛進這盤時馬上一次（帶 hi:1）。帶 ts（送出時間）、rev、n（步數）、h（局面雜湊＝gKey 的 FNV-1a）
       q＝pong（回 ping）：to、ets（照抄 ping 的 ts：用自己的時鐘算來回，不信對方手機的時間）、rev、n、h
       st＝補狀態：to、list（最多 8 份「原封不動、簽好名的對局狀態字串」）；收到的照 rev 由小到大一份一份走跟 s 頻道一樣的驗簽（sgVet）和規則（gameIn）
       nd＝跟對方要狀態：to、after（我手上的 rev，要比它新的）
     序號：同一個 ss 收過的 sq 再來＝重複，丟掉（LKN.dup）；比收過最大的還小的 p／q＝晚到的舊心跳，丟掉（LKN.old）；st、nd 晚到照收（狀態本身有 rev 把關）。
       對局狀態本身的序號就是 rev：舊的不收、一樣的冪等忽略（同 rev 不同內容走 revTie 裁決）、新的才套用。
     比對：收到 p／q 就拿對方的 rev＋h 跟自己的比。一樣＝同步（syncInfo().ok）。不一樣先等 4 秒再 ping 一次（訊息可能還在路上），同一個不一致看到兩次才補：
       對方落後（rev 比我小，或 rev 一樣、雜湊不同＝同一瞬間各改一次）＝把我有、他沒有的狀態用 st 直接送他；對方超前＝重訂這盤，抓伺服器保留的那份。
       重連後的第一個 ping（hi）對方收到馬上補，不等第二次。
     亂序跳號：自己在下的這盤收到 rev 跳號、又接不上手上這份的（例如漏了對方悔棋那份、接著他又走了一步），先放 gapQ（最多 8 份、30 秒），
       用 nd 跟對方要中間那幾份，補齊後照 rev 由小到大套用。對方是舊版（不回 nd）就跟以前一樣不收。
     延遲：ping 的來回時間（最近 5 次取中位數）；對方是舊版、沒回 pong 時，改用這支手機跟伺服器的心跳來回（mqtt 的 PINGREQ→PINGRESP）。latency()＝{ms, bars 0～4, src "peer"／"server"}。
     對方沒回應：peer()＝{st "ok"／"slow"（30 秒）／"gone"（90 秒）／"self"（是自己斷線）, ms, kpeer, oppTurn, winIn（輪到他時，再幾毫秒會照規則判他超時）, canAbort}。
       新版對手看 k 頻道和他簽的對局狀態多久沒來；舊版對手看他的在線狀態離線多久。只是提示，判負、中止的規則一條都沒改（輪到他超過 3 分鐘照舊判超時、離線 10 分鐘照舊中止）。
       peerAbort()：對方 "gone" 時這支手機可以選「判和（不計分）」＝結果 {w:null, abort:true}，跟現有的「對方離線，對局中止」同一種（舊版、新版都收，不計積分）；千秋盃不行。
     流量：每盤每支手機每 15 秒一則 ping、一則 pong（約 150 位元組）；對方 3 次都沒回（舊版）改成每 60 秒一則。
     ---- 評比第 13 輪 X2（評審 P22.1、P22.2、P22.5、P31.3）：k 頻道簽名、防重放、相容、除錯資料 ----
     簽名：簽名局（BIND 有雙方公開金鑰）的每則 k 訊息（p、q、st、nd）多帶 sg＝用這支手機的對局金鑰（跟對局狀態同一把 ECDSA P-256）簽
       「xq-lk1|ROOT|JSON[v,t,id,ss,sq,gid,ts,to,nc,ets,rev,n,h,hi,after,list]」（沒有的欄位寫 null；簽的內容含大廳 ROOT 和 gid，測試房的訊息貼不進正式大廳、別盤的貼不進這盤）。
       收的一方用開局時綁定的「對方那把」公開金鑰驗（不看訊息裡自稱的金鑰）。v 照舊是 1：上一輪的 App（X11，k 不簽）照樣看得懂，多出來的 sg、nc 它不理。
     要不要強制：對方在邀請／接受裡帶 kv:2（新版）、或這盤已經收過一則驗得過的 k（記在 BIND[gid].kv，存手機裡、重開 App 也算）＝這盤的 k 一律要簽名；
       沒簽名（LKN.nosig）、簽名不對（LKN.bad）一律丟掉。還沒確定時（對方是 X11、或綁定紀錄不見了），沒簽名的照收但標「未驗證」；有簽名但驗不過的不管怎樣都丟。
     未驗證的訊息能做的事有限：可以量延遲（畫面標「未驗證」）、比對局面（不一致時用 st 補簽好名的對局狀態，補來的照樣驗簽）；
       不能更新「對方多久沒回應」（lkHeard，跟「判和（不計分）」有關），對方只發未驗證的 k 時，對方有沒有回應照舊看他的在線狀態（跟最舊版一樣）＝不能因此判對方任何結果。
     防重放（驗過簽名之後才檢查、才記帳，偽造的訊息污染不了序號表）：
       ①序號：同一個 ss 收過的 sq 再來＝重複（LKN.dup）；p／q 序號比收過的最大還小＝晚到的舊心跳（LKN.old）
       ②pong 要回「我這次的 ping」：ping 帶 nc（亂數），pong 照抄；nc 對不上、或已經用過＝重放（LKN.replay）。所以 pong 不看時間，延遲和雙方時鐘差都從 pong 算
       ③其他（p、st、nd）看時間窗：每則帶 ts（對方手機的時間）。還不知道雙方時鐘差＝ts 跟這支手機的時間差 10 分鐘內；知道了（收過 pong）＝換算後差 60 秒內（LKN.win）；
         而且不能比收過最新的那則早 5 秒以上（擋對方舊連線的訊息、App 重開後被重放；最新時間和時鐘差存在手機 xq_lkClk，重開 App 也記得）
       對方「有回應」的時間記在他送出的那一刻（換算成這支手機的時間），不是收到的那一刻：晚到很久的訊息不會讓他看起來比較新。
       對局狀態（s 頻道）只有比手上新的才算對方有回應（以前舊的狀態被重放也算）。
       一次被灌大量假訊息：每 15 秒最多驗 60 則，超過的不驗直接丟（LKN.flood），免得手機忙著驗簽。
     除錯資料 linkDebug()：延遲（最近 10 次、平均、抖動）、雙方 rev／步數／局面雜湊、最近 20 則 k 事件（時間、收／送、種類、序號、驗簽結果、丟掉的原因）、
       這盤重連幾次、對方版本（new 新版有簽名／old-k 上一輪不簽／old 更舊沒有 k／? 還不知道）、計數。裡面沒有金鑰、代號、名字、gid、ss（畫面 m/07hs-netsig.js 再組成可複製的文字）。
     ---- 評比第 14 輪 F2：千秋盃的 k 也簽 ----
     以前千秋盃的綁定沒有雙方公開金鑰（BIND[gid]＝{cup, r, b}），k 一律不簽、全部未驗證。現在綁定多記 k（cupKeys，見 PIN 區段）：裁判台開局時寫進對局、蓋了章的雙方公開金鑰
       （裁判台從報名簽名驗過、綁在代號上的那把＝「裁判台認證」），中途才進來的先用對方上線狀態宣告的（之後收到蓋章的狀態再升級）。所以新版之間千秋盃的 k 跟一般對局一樣簽、一樣驗；
       收到第一則驗得過的就升級成一律要簽（記 kv:2）。裁判台不訂閱 k、不驗也不記（k 不保留、不改變任何結果；裁判台判超時、棄擂只看它自己收到的對局狀態和自己的時鐘）。
       虛擬棋客沒有金鑰也不送 k；對方是上一版（不簽千秋盃的 k）時照舊未驗證。 */
  const LK_PING=15000,LK_SLOW=30000,LK_GONE=90000,LK_WIN0=10*60000,LK_WIN=60000,LK_BACK=5000,LKS=Math.random().toString(36).slice(2,10);
  const LKN={pings:0,pongs:0,dup:0,old:0,stOut:0,stIn:0,nd:0,gap:0,gapFix:0,fork:0,mis:0,fix:0,sigOk:0,unv:0,bad:0,nosig:0,replay:0,win:0,flood:0};
  let lkSq=0,lkK=false,lkKu=false,lkPingAt=0,lkPings=0,lkRtt=[],lkRttH=[],lkRttAt=0,lkHeard=Date.now(),lkOff=0,lkSync=null,lkMis=null,lkGiveAt=0,lkNdAt=0,lkSubAt=0,lkHi=true,lkPS="none",RING=[],gapQ=[];
  let lkNc=[],lkEvs=[],lkRecon=0,lkTsMax=0,lkOffs=null,lkClkG=null,lkQ=Promise.resolve(),lkVq=Promise.resolve(),lkBud={at:0,n:0};
  const lkSeen=new Map(),lkSeenU=new Map();
  const LKF=["v","t","id","ss","sq","gid","ts","to","nc","ets","rev","n","h","hi","after","list"];
  const lkSigStr=x=>"xq-lk1|"+ROOT+"|"+JSON.stringify(LKF.map(k=>x[k]===undefined?null:x[k]));
  /* 這盤能不能簽：簽名局、這支手機的金鑰就是綁定裡自己那把 */
  const lkCan=()=>{try{const B=G&&BIND[G.gid];return!!(B&&B.k&&KEY&&PK&&B.k[me().id]===PK&&window.crypto&&crypto.subtle)}catch(e){return false}};
  /* 最近 20 則 k 事件（除錯畫面用）：d＝in 收／out 送，ok＝true 驗過／false 驗不過／null 沒簽名（未驗證），why＝丟掉的原因（空字串＝收下） */
  function lkEv(d,x,ok,why){lkEvs.push({at:Date.now(),d,t:String(x&&x.t||"?").slice(0,3),sq:Number.isInteger(+(x&&x.sq))?+x.sq:null,ok,why:why||""});if(lkEvs.length>20)lkEvs.shift()}
  /* 對方最新的送出時間、雙方時鐘差：存手機（只存這一盤），App 重開後被重放舊訊息也擋得住 */
  function lkClk(){if(!G||lkClkG===G.gid)return;lkClkG=G.gid;const c=ls.get("lkClk",null);if(c&&c.gid===G.gid){lkTsMax=+c.kt||0;lkOffs=Number.isFinite(c.ko)?+c.ko:null}else{lkTsMax=0;lkOffs=null}}
  const lkClkSave=()=>{if(G)ls.set("lkClk",{gid:G.gid,kt:lkTsMax,ko:lkOffs})};
  const fnv=s=>{let h=0x811c9dc5;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0}return h.toString(16).padStart(8,"0")};
  const posH=g=>g?fnv(gKey(g)):"";
  const oppId=()=>{const s=side();return s?(s==="r"?G.black.id:G.red.id):null};
  function lkReset(){LKH.length=0;lkK=false;lkKu=false;lkPingAt=0;lkPings=0;lkRtt=[];lkRttH=[];lkRttAt=0;lkHeard=Date.now();lkOff=0;lkSync=null;lkMis=null;lkHi=true;RING=[];gapQ=[];lkSeen.clear();lkSeenU.clear();lkNc=[];lkEvs=[];lkRecon=0;lkClkG=null;lkTsMax=0;lkOffs=null}
  /* 重新連上：對方多久沒回應從現在重算（斷線期間收不到不算他的），下一輪馬上 ping（hi）；re＝這是重連（不是開 App 第一次連上），這盤的重連次數加 1 */
  function lkUp(re){lkHeard=Date.now();lkHi=true;lkPingAt=0;lkMis=null;if(re&&cur)lkRecon++}
  /* 送 k 訊息：簽名局先簽（非同步，照呼叫順序送）；每則都帶 ts（自己手機的時間，對方拿來擋重放） */
  function lkSend(o){if(!(cli&&cli.up&&cur&&G&&side()))return false;const m=me(),gid=G.gid,x=Object.assign({v:1,id:m.id,ss:LKS,sq:++lkSq,gid,ts:Date.now()},o),sg=lkCan();lkEv("out",x,sg?true:null,"");
    lkQ=lkQ.then(async()=>{if(sg)x.sg=await signS(lkSigStr(x));if(cli&&cli.up&&cur&&cur.gid===gid)cli.pub(`${ROOT}/g/${gid}/k`,JSON.stringify(x))}).catch(e=>console.error(e));return true}
  const lkMine=()=>({rev:G.rev,n:G.moves.length,h:posH(G)});
  /* ping 帶 nc（亂數）：對方的 pong 要照抄，才算回「我這次的 ping」（防重放；記最近 8 個，用過就刪） */
  function lkPing(){if(!(cli&&cli.up&&cur&&G&&side()))return;const now=Date.now(),nc=Math.random().toString(36).slice(2,10);lkPingAt=now;lkPings++;LKN.pings++;lkNc.push({nc,at:now});if(lkNc.length>8)lkNc.shift();lkSend(Object.assign({t:"p",ts:now,nc},lkHi?{hi:1}:{},lkMine()));lkHi=false}
  /* 最近 8 份這盤的原始狀態字串（收到的、自己送的），給對方補用 */
  function lkRing(gid,rev,s){if(!s||!gid)return;RING=RING.filter(r=>r.gid===gid&&r.rev!==rev);RING.push({gid,rev,s});if(RING.length>8)RING.shift()}
  /* 對方有動靜：他簽的（或他轉送的）對局狀態 */
  /* 評比第 13 輪 X2：只有比手上新的（rev 比較大）才算；舊的狀態被重放不算對方有回應 */
  function lkHear(x){try{const s=side();if(!s||!G||!x||x.gid!==G.gid||!(x.rev>G.rev||(x.rev===G.rev&&gKey(x)!==gKey(G))))return;const o=oppOf(s);if((x.sg&&x.sg.s===o)||(x.rl&&x.rl.s===o))lkHeard=Date.now()}catch(e){}}
  function lkGive(after,tie){const now=Date.now();if(!G||now-lkGiveAt<3000)return;let L=RING.filter(r=>r.gid===G.gid&&(tie?r.rev>=after:r.rev>after)).sort((a,b)=>a.rev-b.rev).slice(-8).map(r=>r.s);
    if(!L.length&&wire&&wire.gid===G.gid&&wire.rev>=after)L=[wire.s];if(!L.length)return;lkGiveAt=now;LKN.stOut++;lkSend({t:"st",to:oppId(),list:L})}
  function lkResub(){const now=Date.now();if(!(cli&&cli.up&&G)||now-lkSubAt<5000)return;lkSubAt=now;syncAt=now;cli.sub(gt(G.gid))}
  function lkNeed(){const now=Date.now();if(!G||now-lkNdAt<3000)return;lkNdAt=now;LKN.nd++;lkSend({t:"nd",to:oppId(),after:G.rev});lkResub()}
  /* 拿對方報的 rev＋雜湊跟自己的比；at1＝馬上補（對方剛重連的 hi），不然同一個不一致要隔 3.5 秒以上看到兩次才補 */
  function lkCmp(x,at1,ver){const m=lkMine(),now=Date.now(),pr=+x.rev,ph=String(x.h||"").slice(0,16),pn=Number.isInteger(+x.n)?+x.n:null;if(!Number.isFinite(pr))return;
    if(pr===m.rev&&ph===m.h){lkSync={ok:true,at:now,rev:m.rev,peer:pr,pn,ph,ver:!!ver};lkMis=null;return}
    lkSync={ok:false,at:lkSync&&!lkSync.ok?lkSync.at:now,rev:m.rev,peer:pr,pn,ph,ver:!!ver};LKN.mis++;
    const k=m.rev+"|"+m.h+"|"+pr+"|"+ph;
    if(!at1&&!(lkMis&&lkMis.k===k&&now-lkMis.at>=3500)){if(!lkMis||lkMis.k!==k)lkMis={k,at:now};lkPingAt=Math.min(lkPingAt,now-LK_PING+4000);return}
    lkMis=null;LKN.fix++;if(pr<=m.rev)lkGive(pr,pr===m.rev);if(pr>=m.rev)lkResub()}
  /* 收到 k 訊息：先驗簽（照收到的順序一則一則驗），再做防重放和原本的處理（lkUse）。rx＝收到的時間（延遲用這個算，不含驗簽的時間） */
  function lkIn(msg){const rx=Date.now();let x;try{x=JSON.parse(msg)}catch(e){return}if(!x||typeof x!=="object"||x.v!==1||!G||x.gid!==G.gid||!side())return;
    const i=me().id;if(x.id===i||x.id!==oppId())return;if(!["p","q","st","nd"].includes(x.t))return;if((x.t!=="p")&&x.to!==i)return;
    if(rx-lkBud.at>LK_PING){lkBud={at:rx,n:0}}if(++lkBud.n>60){LKN.flood++;if(lkBud.n===61)lkEv("in",x,null,"短時間太多訊息，先不驗");return}
    const gid=G.gid;lkVq=lkVq.then(()=>lkVet(x)).then(v=>{if(cur&&G&&G.gid===gid&&side())lkUse(x,v,rx)}).catch(e=>console.error(e))}
  /* 驗簽：用開局時綁定的對方公開金鑰。回 ok＝true 驗過／null 沒簽名、照收但未驗證／false 丟掉（k＝計數的欄位、why＝原因） */
  async function lkVet(x){const B=BIND[x.gid]||{};
    if(B.cup&&B.ka==="tofu"&&B.k&&!B.k[x.id]){const pp=presPk(people[x.id]);if(pp){B.k[x.id]=pp;Object.assign(B,ksOf(x.id,pp));ls.set("netBind",BIND)}}   /* 第 14 輪 F2：千秋盃中途才進來、當時還沒收到對方上線狀態的：收到他的 k 時再拿上線狀態宣告的金鑰來驗 */
    const pk=B.k&&sgPk(B.k[x.id]),req=!!(pk&&B.kv>=2);
    if(typeof x.sg==="string"&&x.sg){if(!pk||!(window.crypto&&crypto.subtle))return{ok:null};return await sigOk(pk,lkSigStr(x),x.sg)?{ok:true}:{ok:false,k:"bad",why:"簽名不對（偽造或被改過）"}}
    return req?{ok:false,k:"nosig",why:"沒有簽名（對方是新版，一定要簽）"}:{ok:null}}
  function lkUse(x,v,rx){if(v.ok===false){LKN[v.k]++;lkEv("in",x,false,v.why);return}
    const ver=v.ok===true,i=me().id,ss=String(x.ss||"").slice(0,16),sq=+x.sq,drop=(k,why)=>{if(k)LKN[k]++;lkEv("in",x,v.ok,why)};
    if(!Number.isInteger(sq))return drop("","序號格式不對");
    const T=ver?lkSeen:lkSeenU,S0=T.get(ss);
    if(S0&&S0.got.has(sq))return drop("dup","重複（這個序號收過了）");
    if(S0&&sq<S0.max&&(x.t==="p"||x.t==="q"))return drop("old","晚到的舊心跳");
    let ni=-1,ts=+x.ts;
    if(ver){lkClk();if(!Number.isFinite(ts))return drop("replay","沒有送出時間");
      if(x.t==="q"){ni=lkNc.findIndex(e=>e.nc===x.nc);if(ni<0)return drop("replay","不是回我這次的 ping（重放）")}
      else{const lim=lkOffs==null?LK_WIN0:LK_WIN;if(Math.abs(ts-(rx+(lkOffs||0)))>lim){drop("win","送出時間不在時間窗內（重放或時鐘差太多）");   /* 簽名對、只是時間對不上的 ping 照樣回 pong（不算他有回應、不比對）：手機時鐘中途被調過的話，對方靠這個 pong 重新學時鐘差 */
          if(x.t==="p"&&typeof x.nc==="string")lkSend(Object.assign({t:"q",to:x.id,ets:ts,nc:x.nc.slice(0,16)},lkMine()));return}
        if(lkTsMax&&ts<lkTsMax-LK_BACK)return drop("replay","比收過最新的那則還舊（重放）")}}
    let S=S0,pe=null;if(!S){S={max:0,got:new Set()};T.set(ss,S);if(T.size>4)T.delete(T.keys().next().value)}
    S.got.add(sq);if(S.got.size>64)S.got.delete(S.got.values().next().value);S.max=Math.max(S.max,sq);
    if(ver){lkK=true;LKN.sigOk++;LKH.push(rx);if(LKH.length>40)LKH.shift();
      if(ni>=0){pe=lkNc.splice(ni,1)[0];lkOffs=ts-(pe.at+rx)/2;if(ts<lkTsMax-LK_WIN)lkTsMax=ts;lkHeard=Math.max(lkHeard,rx)}   /* pong：對方時鐘往回調超過 60 秒的話，最新時間跟著重設 */
      else lkHeard=Math.max(lkHeard,lkOffs==null?rx:Math.min(rx,ts-lkOffs));
      lkTsMax=Math.max(lkTsMax,ts);lkClkSave();const B=BIND[x.gid];if(B&&B.k&&!(B.kv>=2)){B.kv=2;ls.set("netBind",BIND)}
      if(B&&B.ka==="tofu"&&!B.pn&&B.k&&B.k[x.id]){B.pn=1;ls.set("netBind",BIND);pinSet(x.id,B.k[x.id],false)}}   /* 第 14 輪 F2：千秋盃沒有裁判台認證的金鑰，收到第一則驗得過的 k（證明對方手機真的有這把私鑰）才記進釘選 */
    else{lkKu=true;LKN.unv++}
    lkEv("in",x,v.ok,"");const now=rx;
    if(x.t==="p"){lkSend(Object.assign({t:"q",to:x.id,ets:+x.ts||0},typeof x.nc==="string"?{nc:x.nc.slice(0,16)}:{},lkMine()));lkCmp(x,!!x.hi,ver);return}
    if(x.t==="q"){LKN.pongs++;const t0=pe?pe.at:(+x.ets||0),rt=now-t0;   /* 驗過的用自己記的 ping 送出時間；未驗證的照舊用對方照抄的 ets */if(t0&&rt>=0&&rt<60000){lkRtt.push({ms:rt,ver});if(lkRtt.length>5)lkRtt.shift();lkRttH.push(rt);if(lkRttH.length>10)lkRttH.shift();lkRttAt=now}lkCmp(x,false,ver);return}
    if(x.t==="nd"){lkGive(+x.after||0,false);return}
    if(x.t==="st"){if(!Array.isArray(x.list))return;LKN.stIn++;
      const L=x.list.slice(0,8).map(s=>{try{const y=typeof s==="string"?JSON.parse(s):null;return y&&y.gid===G.gid&&Array.isArray(y.moves)&&y.red&&y.black&&Number.isFinite(y.rev)?{y,s}:null}catch(e){return null}}).filter(Boolean).sort((a,b)=>a.y.rev-b.y.rev);
      for(const q of L)vq=vq.then(()=>!cur||!G||cur.gid!==q.y.gid||q.y.rev<G.rev?null:sgVet(q.y)).then(v=>{if(!v||!cur||cur.gid!==q.y.gid)return;if(v.ok)gameIn(q.y,q.s,"k");else if(v.soft)sgSoft(q.y);else sgBad(q.y,v.why)}).catch(e=>console.error(e))}}
  /* 跳號暫放：同一份不重複放；放了就跟對方要中間那幾份 */
  let gapTry=0;
  function gapPut(x,msg){if(!G||x.gid!==G.gid)return;const o=gapQ.find(q=>q.x.rev===x.rev&&gKey(q.x)===gKey(x));if(o)o.at=Date.now();else{gapQ.push({x,msg,at:Date.now()});gapQ.sort((a,b)=>a.x.rev-b.x.rev);if(gapQ.length>8)gapQ.pop();LKN.gap++}lkNeed()}
  /* 手上這份往前進了：拿暫放裡 rev 最小、比手上新的那份再驗一次、再套一次（接得上就繼續往下接） */
  function gapRun(){if(!gapQ.length||!G)return;gapQ=gapQ.filter(q=>q.x.gid===G.gid&&q.x.rev>G.rev);const q=gapQ[0];if(!q)return;
    vq=vq.then(()=>sgVet(q.x)).then(v=>{if(v&&v.ok&&cur&&G&&cur.gid===q.x.gid&&q.x.rev>G.rev){const r0=G.rev;gameIn(q.x,q.msg,"gap");if(G&&G.rev>r0)LKN.gapFix++}}).catch(e=>console.error(e))}
  function peerInfo(){if(!playing())return null;const now=Date.now(),t=toMove(),oppTurn=t!==side();
    const winIn=oppTurn?Math.max(0,Math.min(G.clk?clockLeft(G,t):Infinity,TURN_MS-(now-turnAt(G)))):null;
    if(!(cli&&cli.up))return{st:"self",ms:downAt?now-downAt:0,kpeer:lkK,oppTurn,winIn,canAbort:false};
    const ms=lkK?Math.max(0,now-lkHeard):lkOff?now-lkOff:0,st=ms>=LK_GONE?"gone":ms>=LK_SLOW?"slow":"ok";
    return{st,ms,kpeer:lkK,oppTurn,winIn,canAbort:st==="gone"&&!G.cup}}
  /* ver（評比第 13 輪 X2）：src 是 peer 時，true＝最近幾次的 pong 都驗過簽名；false＝有未驗證的（對方是上一輪的版本，k 不簽），畫面標「未驗證」 */
  function latency(){const now=Date.now();if(!(cli&&cli.up))return{ms:null,bars:0,src:null};let ms=null,src=null,ver=null;
    if(lkRtt.length&&now-lkRttAt<60000){const a=lkRtt.map(e=>e.ms).sort((p,q)=>p-q);ms=a[a.length>>1];src="peer";ver=lkRtt.every(e=>e.ver)}
    if(src==="peer")return{ms,bars:ms<300?4:ms<700?3:ms<1500?2:1,src,ver};
    else if(cli.rtt!=null&&now-(cli.rttAt||0)<60000){ms=cli.rtt;src="server"}
    return{ms,bars:ms==null?null:ms<300?4:ms<700?3:ms<1500?2:1,src}}
  /* 評比第 13 輪 X2 除錯資料（m/07hs-netsig.js 的連線卡片）：只有匿名的統計，沒有金鑰、代號、名字、gid、ss */
  function lkVer(){const B=G&&BIND[G.gid];if(lkK||(B&&B.kv>=2))return"new";if(lkKu)return"old-k";if(lkPings>=3)return"old";return"?"}
  function linkDebug(){if(!G||!side())return null;const L=latency(),H=lkRttH.slice(),m=lkMine(),S=lkSync||{},P=peerInfo();
    const avg=H.length?Math.round(H.reduce((a,b)=>a+b,0)/H.length):null;let jit=null;if(H.length>1){let s=0;for(let i=1;i<H.length;i++)s+=Math.abs(H[i]-H[i-1]);jit=Math.round(s/(H.length-1))}
    return{lat:{ms:L.ms,bars:L.bars,src:L.src,ver:L.ver==null?null:L.ver,last:H,avg,jit,server:cli&&cli.up&&cli.rtt!=null?cli.rtt:null},
      sync:{ok:S.ok==null?null:S.ok,ver:S.ver==null?null:S.ver,at:S.at||0,me:m,peer:S.peer==null?null:{rev:S.peer,n:S.pn==null?null:S.pn,h:S.ph||""}},
      ev:lkEvs.map(e=>Object.assign({},e)),recon:lkRecon,peerVer:lkVer(),sign:sgState(),req:!!(BIND[G.gid]&&BIND[G.gid].kv>=2),peer:P?P.st:null,clk:lkOffs!=null,stats:Object.assign({},LKN),shadow:shInfo(),late:LATE.length,
      key:(()=>{const K=keyInfo();return K?{st:K.st,cert:K.cert,iv:K.iv}:null})()}}   /* 第 14 輪 F2：對方金鑰的狀態（不含指紋；指紋另外從 keyInfo() 拿，只顯示、不複製） */
  function lkTick(){const now=Date.now();
    if(playing()){if(onl(oppId()))lkOff=0;else if(!lkOff)lkOff=now}else lkOff=0;
    if(cur&&G&&side()&&cli&&cli.up&&(!G.result||now-seenAt<60000)){const iv=lkK||lkKu||lkPings<3?LK_PING:4*LK_PING;if(now-lkPingAt>=iv)lkPing()}
    if(gapQ.length)gapQ=gapQ.filter(q=>G&&q.x.gid===G.gid&&q.x.rev>G.rev&&now-q.at<30000);
    if(gapQ.length&&now-lkNdAt>=6000&&gapTry<8){gapTry++;lkNeed()}else if(!gapQ.length)gapTry=0;   /* 評比第 15 輪 X4 弱網長測抓到：跟對方要中間那幾份（nd）或對方補來的（st）掉了，以前不會再要：已經結束的盤沒有 ping、也不重抓，
       離線回來錯過「再來一局」的那支手機就一直停在上一盤。跳號還沒補齊時每 6 秒再要一次（順便重抓保留的那份），最多 8 次 */
    const P=peerInfo(),s=P?P.st:"none";if(s!==lkPS){lkPS=s;emit("peer",P)}}
  /* ================= LINK:END ================= */
  function enter(gid){if(cur&&cur.gid!==gid&&cli&&cli.up)cli.unsub(gt(cur.gid));if(!cur||cur.gid!==gid)lkReset();cur={gid};ls.set("net",cur);emos=[];if(cli&&cli.up)cli.sub(gt(gid));syncRoster();presence()}
  const PL={r:"紅方",b:"黑方"},oppOf=s=>s==="r"?"b":"r";
  // 對方「在這盤」＝在線上，而且他的狀態指著同一盤（已經跑去做別的事就不算）
  const onl=id=>{const x=people[id];return id===me().id?!!(cli&&cli.up):!!(x&&fresh(x,Date.now())&&G&&x.gid===G.gid)};
  function setResult(r,fz){if(!G||G.result)return;if(r&&r.timeout&&side()&&r.w===side())FLAGME[lateK(G)]={at:Date.now(),off:offNow()};const n=JSON.parse(JSON.stringify(G));n.result=r;n.draw=null;if(fz&&n.clk)n.clk[fz]=0;n.rev=G.rev+1;n.at=Date.now();seenAt=n.at;G0=G;sgFresh(n,G);G=n;pubGame();presence();record();emit("game")}
  // 對方離線超過 10 分鐘、棋局也 10 分鐘沒動：自動中止，不再一直掛著「對戰中」
  // 每步限時：輪到的一方超過 3 分鐘沒走（離開、斷線、關掉 App），由等待的一方判他超時負，比賽自動結束並計分
  const TURN_MS=3*60000;
  const toMove=()=>G?(G.moves.length%2?"b":"r"):null;
  /* 評比第 15 輪 X4 弱網長測抓到：自己落子時連線其實已經斷了（看門狗還沒發現，送出去的那步掉了），對方根本收不到，這支手機卻從落子那一刻起算對方的 3 分鐘；
     幾分鐘後連回來，第一件事就是判對方超時（對方一直在線、一步都沒看到）。改成：對方的這一手從「伺服器確認收到我這步」（回音）那一刻起算（ackTurn），
     伺服器還沒確認收到手上這份（netAck 不是 G）時不判對方超時——伺服器沒有，對方也拿不到。平常回音約一個來回（零點幾秒）就到 */
  let ackK="",myStart="";   /* myStart：這一盤是我開的（開局、再來一局），一步都還沒走時，我送出的開局那份的回音也算 */
  function ackTurn(){const s=side();if(!s||!G||G.result||(G.moves.length?moverOf(G.moves.length-1)!==s:s!=="b"||myStart!==G.gid+"|"+G.id)||arr.n!==G.moves.length)return;   /* 一步都還沒走：開局那份也算「我這一方送出的」，我是黑方（輪到對方紅方）時一樣從回音起算 */const k=G.gid+"|"+G.id+"|"+G.moves.length;if(k===ackK)return;ackK=k;arr={n:arr.n,t:Math.max(arr.t,Date.now())};shT={k:lateK(G),n:G.moves.length,t:Date.now()}}
  function timeoutCheck(){if(!G||G.rules!==RULE_ID||!playing()||!cli||!cli.up)return;const t=toMove(),me=side();if(!t||t===me)return;if(netAck!==G)return;
    if(G.clk&&clockLeft(G,t)<=0)return setResult({w:me,timeout:true,why:PL[t]+"時間用完，超時判負"},t);   /* 數值盤查 11/11 P1 棋鐘：判對方鐘上超時時把他的鐘存成 0（fz），跟他自己手機判自己超時（tickMove）存的一樣，兩端狀態才會一字不差；以前存的是他這手開始時的時間，畫面還顯示有剩 */
    if(Date.now()-turnAt(G)>TURN_MS)setResult({w:me,timeout:true,why:PL[t]+"超過 3 分鐘沒走，超時判負"})}
  /* 評審 P22.1／P22.2（11/12，混沌網路實測 tools/test-net-chaos.js 抓到的）：MQTT 只用 QoS 0，伺服器忙或網路抖動時，一則對局狀態可能就這樣不見——
     以前送出去就不管了：自己這步沒到伺服器，雙方乾等，3 分鐘後由對方判超時；對方那步沒送到自己這裡，也是乾等。現在補兩件事：
     ①回音確認：自己有訂這盤的頻道，送出去的狀態伺服器會轉一份回來（gameIn 裡記 netAck）。送出 8 秒還沒看到回音：先讀後寫——單數次先重抓伺服器保留的那份
       （一樣＝其實送到了；比較新＝照規則收；比較舊＝gameIn 會補送），雙數次才原封不動重送（同一個 rev、同一份簽名，對方收到重複的會忽略），
       間隔 8、8、16、16、32、32、60…秒，最多 10 次。收到比手上舊的保留訊息時也改回「還沒確認」，補送那則掉了還會再送。
     ②沒動靜就重抓：這盤還沒結束、20 秒（RESYNC）沒收到任何這盤的狀態，就再訂閱一次這盤的頻道，伺服器會把保留的最新狀態再送一次
       （MQTT 3.1.1：重複訂閱同一個主題要重送保留訊息）；漏掉的、亂序晚到的、被蓋掉的，都照原本的規則（rev、okNext、同 rev 裁決、簽名）補上。
       已經結束的盤，最後一次變動後 5 分鐘內每 60 秒沒動靜也重抓一次；快判對方超時（剩不到 12 秒）前也先重抓一次。
     觀眾只做②。代價：等對方想棋時，每 20 秒多收一份保留狀態（約 1～2 KB） */
  const RESYNC=20000;let netAck=null,pubG=null,pubAt=0,pubTry=0,rxAt=0,syncAt=0;
  function netHeal(){if(!cur||!G||G.gid!==cur.gid||!cli||!cli.up)return;const now=Date.now();
    if(side()&&netAck!==G&&pubTry<10&&now-pubAt>Math.min(60000,8000*Math.pow(2,pubTry>>1))){pubTry++;if(pubTry%2){pubAt=now;syncAt=now;cli.sub(gt(G.gid))}else pubGame();return}   /* 先讀後寫：單數次先重抓保留的那份（一樣＝其實送到了；比較新＝照規則收；比較舊＝gameIn 會補送），雙數次才原封不動重送，免得自己的重送蓋掉對方剛送到的新一步 */
    /* 評比第 15 輪 X4 弱網長測抓到：已經結束的盤，重新連上後 5 分鐘內也照樣每 60 秒沒動靜就重抓（以前只看最後一次變動；離線很久回來時，剛連上收到的那份保留訊息掉了，就再也看不到對方開的「再來一局」） */
    if((G.result?(now-seenAt<5*60000||now-upAt<5*60000)&&now-Math.max(rxAt,syncAt)>3*RESYNC:now-Math.max(rxAt,syncAt)>RESYNC)){syncAt=now;cli.sub(gt(G.gid));return}   /* 已經結束的盤：最後一次變動後 5 分鐘內，每 60 秒沒動靜也重抓（兩邊各自判了不同的結果時，靠這個收到對方那份、照 flagRace 裁決） */
    /* 快要判對方超時前（剩不到 12 秒）再重抓一次：伺服器上其實已經有他那步的話，先收到就不會誤判（不延後判超時的時間點） */
    const t=toMove();if(playing()&&t!==side()&&now-syncAt>10000){const left=Math.min(G.clk?clockLeft(G,t):Infinity,TURN_MS-(now-turnAt(G)));if(left<12000){syncAt=now;cli.sub(gt(G.gid))}}}
  /* 評比第 15 輪 X4（弱網長測：手機時鐘中途被調）：計時都用「這支手機收到的時間」（Date.now），手機時間被往回調（例如自動對時把快了的時鐘調回來）時，
     已經過的時間會少算：對方超時判不下來、自己這步的剩餘時間 lft 也多算（拿來推翻對方合理的超時判決）。用單調的 performance.now() 比對，
     發現牆上時間往回跳 2 秒以上，就把記下的本機時間點一起平移。只補往回調：往前跳跟手機休眠（休眠時 performance.now 可能不走）分不出來，
     補了會讓休眠的人少扣時間，所以往前跳照舊當成時間真的過了（見 threat-model.md「殘餘風險」） */
  let monoD=null;
  function clkJump(){try{if(typeof performance==="undefined"||typeof performance.now!=="function")return;const d=Date.now()-performance.now();if(monoD==null||d>=monoD){monoD=d;return}
    const j=d-monoD;if(j>-2000)return;monoD=d;const sh=v=>v?v+j:v;
    arr.t=sh(arr.t);seenAt=sh(seenAt);rxAt=sh(rxAt);syncAt=sh(syncAt);pubAt=sh(pubAt);upAt=sh(upAt);downAt=sh(downAt);lkHeard=sh(lkHeard);lkPingAt=sh(lkPingAt);lkRttAt=sh(lkRttAt);lkOff=sh(lkOff);
    fixAt=sh(fixAt);lastPAt=sh(lastPAt);tcWaitAt=sh(tcWaitAt);pkHealAt=sh(pkHealAt);lkGiveAt=sh(lkGiveAt);lkNdAt=sh(lkNdAt);lkSubAt=sh(lkSubAt);bgAt=sh(bgAt);if(shT)shT.t=sh(shT.t);for(let i=0;i<LKH.length;i++)LKH[i]=sh(LKH[i]);for(const k in FLAGME)FLAGME[k].at=sh(FLAGME[k].at);
    gapQ.forEach(q=>{q.at=sh(q.at)});lkNc.forEach(e=>{e.at=sh(e.at)});emos.forEach(e=>{e.at=sh(e.at)});for(const k in nope)nope[k]=sh(nope[k]);if(lkOffs!=null){lkOffs-=j;lkClkSave()}}catch(e){}}
  setInterval(()=>{clkJump();timeoutCheck();syncRoster();netHeal();lkTick();try{const ol=typeof navigator!=="undefined"&&navigator.onLine!==false;if(ol&&lastOnL===false&&want&&!(cli&&cli.up))netBack();lastOnL=ol}catch(e){}},2000);   /* 回饋 854：順便看要不要訂、收整份名單 */
  function staleCheck(){if(!playing()||!cli||!cli.up||G.cup)return;   /* 擂台比賽沒有「中止」：斷線的人時間照走 */const o=oppOf(side()),oid=o==="r"?G.red.id:G.black.id;
    if(!onl(oid)&&Date.now()-seenAt>10*60000)setResult({w:null,abort:true,why:"對方離線太久，對局中止"})}
  // 自己離開一盤還沒下完的棋：對方還在線上就算自己認輸；對方已經離線就直接中止
  function endOnLeave(){if(!playing()||G.cup)return;if(G.rules!==RULE_ID)return setResult({w:null,abort:true,why:"棋規版本不同，舊局中止（不計分）"});   /* 擂台比賽離開畫面不算認輸（小朋友常誤觸），回來可以接著下 */const s=side(),o=oppOf(s),oid=o==="r"?G.red.id:G.black.id;
    setResult(onl(oid)&&G.moves.length?{w:o,why:PL[s]+"離開對局"}:{w:null,abort:true,why:onl(oid)?"對局取消":"對方離線，對局中止"})}
  // 接受後 12 秒還沒收到對局（對方剛好關掉 App）：取消，隨機配對的話繼續找
  function waitGame(gid,auto){setTimeout(()=>{if(!cur||cur.gid!==gid||G)return;if(cli&&cli.up)cli.unsub(gt(gid));cur=null;ls.set("net",null);
    if(auto)seeking=Date.now();presence();emit("matchfail",{auto});tryMatch()},12000)}
  /* 評審 P22 對局簽名：先蓋章（sgSeal，非同步）再送；照呼叫的順序送。沒連上馬上標「棋步連上後送出」 */
  function pubGame(){if(!G)return;const g=G;if(g!==pubG){pubG=g;pubTry=0}pubAt=Date.now();if(!(cli&&cli.up))dirty=true;
    sigQ=sigQ.then(()=>sgSeal(g)).then(s=>{if(s==null)return;lkRing(g.gid,g.rev,s);if(cli&&cli.up&&cli.pub(`${ROOT}/g/${g.gid}/s`,s,true)){if(G===g)wire={gid:g.gid,rev:g.rev,s}}else{dirty=true;connect()}}).catch(e=>console.error(e))}
  // 手機切到背景時主動下線（iPhone 背景會斷線），回來再連上
  const kick=()=>{if(!want)return;if(!cli){clearTimeout(retryT);connect()}else if(cli.up)presence()};
  /* 評審 P22.1（11/12）：上面那行註解以前只做了「回來再連上」，「切到背景主動下線」沒做——只靠 iPhone 系統把連線停掉、伺服器 45 秒後照遺囑清在線狀態；
     Android 和電腦的瀏覽器背景常常不斷線，別人一直看到你「在線」，邀請卻沒人回。現在：
     切到背景滿 BG_IDLE（60 秒）＝先清掉自己的在線狀態（送空的保留訊息），再正常斷線（DISCONNECT），別人馬上看到你離線；切回前景（或 pageshow）馬上重連，
     重連後照原本的流程：重新訂閱、補送在線狀態、從保留訊息補同步對局（cli.onup）。
     保守的地方：①正在下的棋（playing）要在背景滿 BG_PLAY（5 分鐘）才下線——短暫切出去看訊息，對方不會看到你離線。斷線本身也不會判輸：
       判超時只看「輪到誰、多久沒走」（輪到你又超過 3 分鐘沒走，不管連沒連著都會被判，這條沒變）；對方離線 10 分鐘以上而且棋局 10 分鐘沒動才中止（不計分）。
     ②還有沒送出去的棋步（dirty）、或在等對方回邀請（pending）：先不下線，30 秒後再看。③背景中別的功能要用網路（例如送意見回饋）照樣會連上，連上後再滿 60 秒才又下線 */
  const BG_IDLE=60000,BG_PLAY=5*60000;let bgT=null,bgAt=0;
  function bgSleep(){bgT=null;if(!document.hidden||!want||!cli||!cli.up)return;const now=Date.now();
    if(dirty||pending){bgT=setTimeout(bgSleep,30000);return}
    if(playing()&&now-bgAt<BG_PLAY){bgT=setTimeout(bgSleep,BG_PLAY-(now-bgAt));return}
    const c=cli,m=me();cli=null;clearInterval(hb);clearTimeout(retryT);downAt=now;lastP="";
    try{if(!selfBan())c.pub(`${ROOT}/u/${m.id}`,"",true)}catch(e){}c.end();emit("status")}
  const bgWatch=()=>{clearTimeout(bgT);bgT=null;if(document.hidden){bgAt=Date.now();bgT=setTimeout(bgSleep,BG_IDLE)}};
  document.addEventListener("visibilitychange",()=>{bgWatch();if(!document.hidden){fastTill=Date.now()+FAST_WIN;kick()}});
  window.addEventListener("online",()=>{if(cli&&cli.kill)cli.kill();netBack()});
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
    /* 第 9 輪評審：報名、取消、點將用這支手機的對局金鑰簽名（pk＋sg，格式見 tools/cup-key.js）；這支手機不能用 WebCrypto＝送不出去（回 false），裁判台不收沒簽名的 */
    cupReq(t){const m=me();if(!CUP||selfBan()||!(window.crypto&&crypto.subtle))return false;const wk=CUP.wk,pts=myPts();
      const go=(k,s)=>{if(cli&&cli.up)cli.pub(`${ROOT}/cup/req`,s);else if(k<6){if(!want){want=true;connect()}setTimeout(()=>go(k+1,s),1500)}};
      keyP.then(async kp=>{if(!kp||!PK){emit("cupreq",{ok:false,why:"這支手機沒辦法簽名"});return}const x={t,wk,id:m.id,name:m.name,pts,at:Date.now(),pk:PK,cv:1};x.sg=await signS(cupReqMsg(x));go(0,JSON.stringify(x))}).catch(e=>console.error(e));return true},
    cupBad:()=>JSON.parse(JSON.stringify(CUPBAD)),
    cupChamp:()=>{const h=CUPHALL&&CUPHALL.list&&CUPHALL.list[0];return h&&Date.now()-h.at<8*864e5?h:null},
    downFor:()=>cli&&cli.up||!downAt?0:Date.now()-downAt,pendingSend:()=>dirty,
    /* 評審 P22 對局簽名：signState＝這盤 "signed"（雙方簽名）／"legacy"（對方版本較舊，無法驗證，不計積分）／"cup"／"unknown"／null；suspicious＝最近 50 筆被擋下的可疑對局訊息（不跳視窗） */
    signState:()=>sgState(),suspicious:()=>SUS.slice(),
    /* 威脅模型 T11：lateLog＝晚到推翻的紀錄（at、gid、late 毫秒、o 第幾次推翻、keep 有沒有保留勝場）；shadow＝這盤對方的影子鐘（只記錄） */
    lateLog:()=>LATE.map(e=>Object.assign({},e)),notes:g=>notesOf(g),shadow:()=>shInfo(),
    /* 評比第 14 輪 F2（PIN 區段）：keyInfo＝這盤對方金鑰的狀態和指紋（連線狀態小卡用）；keyBad＝擋下的可疑邀請／接受計數（sig 簽名不對、conflict 跟上線狀態宣告的不一樣、down 降級） */
    keyInfo,keyBad:()=>JSON.parse(JSON.stringify(KEYBAD)),
    /* 評比第 12 輪 X11（LINK 區段）：latency＝連線延遲與訊號格；peer＝對方有沒有回應；syncInfo＝跟對方的局面比對（rev＋雜湊）；linkStats＝計數（測試、除錯用）；
       peerAbort（"draw"／"leave"）＝對方 90 秒以上沒回應時，判和（不計分）＝中止這盤；回 true＝成立 */
    latency,peer:()=>peerInfo(),syncInfo:()=>G&&side()?Object.assign({kpeer:lkK,ok:null,at:0,rev:G.rev,peer:null},lkSync||{}):null,   /* ok：true 一致／false 對不上／null 還沒比過（對方是舊版就一直是 null） */linkStats:()=>Object.assign({},LKN),linkDebug,   /* 評比第 13 輪 X2：連線除錯卡片的資料 */
    peerAbort(kind){const P=peerInfo();if(!P||!P.canAbort)return false;setResult({w:null,abort:true,why:kind==="leave"?"對方長時間沒回應，離開對局（不計分）":"對方長時間沒回應，判和（不計分）"});return!!(G&&G.result&&G.result.abort)},
    people:()=>{const now=Date.now(),i=me().id,all=Object.values(people).filter(x=>x.id!==i&&fresh(x,now)),bg=new Set(all.filter(x=>x.st==="playing"&&x.gid&&blk(x.id)).map(x=>x.gid));
      return all.filter(x=>!blk(x.id)&&!(x.st==="playing"&&x.gid&&bg.has(x.gid)))},   /* 回饋 841：封鎖的人藏起來；他正在下的那盤也不列（不然對戰卡只剩對手一個人） */
    blocked:id=>blk(id),
    me,active:()=>!!cur,side,game:()=>{const rn=G?realNm():"";if(G!==gvS||rn!==gvN){gvS=G;gvN=rn;gvL=locG(G)}return gvL},gid:()=>cur&&cur.gid,   /* 回饋 842：自己畫面上的對局，自己那一方顯示自己取的名字（對外照舊是稱號） */
    invite(to){seeking=0;return sendInvite(to,false)},
    seek(on){if(on&&selfBan())on=false;if(on&&playing())endOnLeave();if(on&&cur&&!playing()){if(cli&&cli.up)cli.unsub(gt(cur.gid));cur=null;G=null;ls.set("net",null)}seeking=on?Date.now():0;if(!on&&pending&&pending.auto)pending=null;syncRoster();presence();tryMatch();emit("people")},
    seeking:()=>!!seeking,
    seekers(){const now=Date.now(),i=me().id;return Object.values(people).filter(x=>x.st==="seeking"&&x.id!==i&&fresh(x,now)&&!blk(x.id)).length},   /* 回饋 841：不算封鎖的人 */
    cancelInvite(){if(!pending)return;const m=me();cli&&cli.pub(`${ROOT}/i/${pending.to}`,JSON.stringify({type:"cancel",gid:pending.gid,from:{id:m.id,name:m.name},at:Date.now()}));pending=null},
    respond(x,ok){const m=me();if(ok)endOnLeave();iSend(x.from.id,{type:ok?"accept":"decline",gid:x.gid,from:{id:m.id,name:m.name,pts:myPts(),n:gamesOf(rec()),tc:tcPref(),rules:RULE_ID,rs:rsPref(),pk:ok&&PK||undefined,kv:ok&&PK?2:undefined},at:Date.now()});
      if(ok){sgAccepted(x);G=null;enter(x.gid);waitGame(x.gid,false)}},
    watch(gid){endOnLeave();G=null;enter(gid)},
    tc:()=>tcPref(),tcs:TCS,tcOf,isBot,tcOk:f=>tcOk(f),setTc(v){if(TCS.includes(+v)){ls.set("tc",+v);presence();emit("people")}},
    clocks(){return G&&G.clk?{r:clockLeft(G,"r"),b:clockLeft(G,"b")}:null},
    /* 走棋前呼叫：扣掉走的人這步用的時間，從現在開始算對方的 */
    /* ChatGPT 數值盤查 11/11 P1 棋鐘：同一個時間戳 now 先裁決逾時，再扣時、加秒。自己的棋鐘剩餘 ≤ 0 ms＝已經落旗：不落子、不加秒，直接把結果寫成自己超時判負並回 false
       （以前先扣到 0 再加秒，落旗後還能走一步把時間加回來）。及時落子時多記 lft＝落子當下的剩餘時間（棋鐘、每步 3 分鐘取小）和 lfN＝第幾手，給雙端競逐裁決用（flagTie） */
    tickMove(n,sd){if(!n)return true;clkJump();const now=Date.now(),lc=n.clk?n.clk[sd]-(now-effTk(n)):Infinity;
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
    update(fn){if(!G)throw new Error("還在等對局資料，稍等一下");clkJump();const wasEnd=!!G.result,n=JSON.parse(JSON.stringify(G));fn(n);
      if(G.result&&!n.result&&n.id!==G.id&&n.clk&&+n.tc>0){n.clk={r:n.tc*60000,b:n.tc*60000};n.tk=Date.now();n.tkN=0;delete n.lft;delete n.lfN}   /* 評比第 15 輪 X4 弱網長測抓到：「再來一局」（換新的 id、清掉結果）以前沿用上一盤剩下的棋鐘（而且紅黑交換、鐘還照座位），連下幾盤後一開局就有人被判時間用完；新的一盤雙方棋鐘重設成時制 */
      n.rev=G.rev+1;n.at=Date.now();if(n.moves.length!==G.moves.length||n.gid!==G.gid)arr={n:n.moves.length,t:n.at};if(n.id!==G.id||n.gid!==G.gid)myStart=n.gid+"|"+n.id;seenAt=n.at;G0=G;sgFresh(n,G);G=n;pubGame();if(!!G.result!==wasEnd)presence();record();emit("game");return G},
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
