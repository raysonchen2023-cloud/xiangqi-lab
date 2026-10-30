// 線上大廳：不用電腦，手機之間透過公開的 MQTT 伺服器（免費、免註冊）互相看到在線、送對戰邀請、下棋、觀戰。
// 傳的只有名字、裝置代號和棋步；公開伺服器任何人都可能看到這些內容，所以不要放秘密。
// 主題（topic）規劃：
//   ROOT/u/<我的代號>     在線狀態（保留訊息；斷線時伺服器自動清掉＝遺囑）
//   ROOT/i/<我的代號>     收件匣：邀請、接受、拒絕、取消
//   ROOT/g/<對局代號>/s   對局狀態（保留訊息，晚進來的觀眾也拿得到完整棋譜）
//   ROOT/g/<對局代號>/e   表情（不保留）
"use strict";
var XQNet=(function(){
  const URLS=["wss://broker.emqx.io:8084/mqtt","wss://broker.hivemq.com:8884/mqtt"];
  const ROOT="xqlab-r7k2q/v1",ALIVE=150000;

  // ---------- 很小的 MQTT 3.1.1 用戶端（只用 QoS 0：發布、訂閱、保留訊息、遺囑、心跳） ----------
  function mqtt(url,o){
    const te=new TextEncoder(),td=new TextDecoder();
    const vlen=n=>{const a=[];do{let d=n%128;n=Math.floor(n/128);if(n>0)d|=128;a.push(d)}while(n>0);return a};
    const str=x=>{const b=te.encode(x);return[b.length>>8,b.length&255,...b]};
    const pkt=(h,body)=>new Uint8Array([h,...vlen(body.length),...body]);
    const me={up:false,onup:null,ondown:null,onmsg:null};let buf=new Uint8Array(0),pid=1,ping=null,ws;
    try{ws=new WebSocket(url,["mqtt"])}catch(e){setTimeout(()=>me.ondown&&me.ondown(false),0);return me}
    ws.binaryType="arraybuffer";
    const send=p=>{try{if(ws.readyState===1)ws.send(p)}catch(e){}};
    ws.onopen=()=>{const w=o.will;let fl=0x02;if(w)fl|=0x04|(w.retain?0x20:0);
      const body=[0,4,77,81,84,84,4,fl,o.keepalive>>8,o.keepalive&255,...str(o.clientId)];
      if(w){body.push(...str(w.topic));const p=te.encode(w.payload||"");body.push(p.length>>8,p.length&255,...p)}
      send(pkt(0x10,body))};
    ws.onmessage=e=>{const d=new Uint8Array(e.data),nb=new Uint8Array(buf.length+d.length);nb.set(buf);nb.set(d,buf.length);buf=nb;
      for(;;){if(buf.length<2)return;let mul=1,n=0,i=1,c;do{if(i>=buf.length)return;c=buf[i++];n+=(c&127)*mul;mul*=128}while(c&128);
        if(buf.length<i+n)return;const t=buf[0],b=buf.slice(i,i+n);buf=buf.slice(i+n);
        if(t>>4===2){if(b[1]===0){me.up=true;ping=setInterval(()=>send(new Uint8Array([0xC0,0])),o.keepalive*800);me.onup&&me.onup()}else ws.close()}
        else if(t>>4===3){const tl=(b[0]<<8)|b[1],topic=td.decode(b.subarray(2,2+tl));let p=2+tl;if((t>>1)&3)p+=2;
          try{me.onmsg&&me.onmsg(topic,td.decode(b.subarray(p)),!!(t&1))}catch(err){console.error(err)}}}};
    ws.onerror=()=>{};
    ws.onclose=()=>{clearInterval(ping);const was=me.up;me.up=false;me.ondown&&me.ondown(was)};
    me.pub=(topic,s,retain)=>send(pkt(0x30|(retain?1:0),[...str(topic),...te.encode(s)]));
    me.sub=ts=>{send(pkt(0x82,[pid>>8,pid&255,...ts.flatMap(t=>[...str(t),0])]));pid=pid%60000+1};
    me.unsub=ts=>{send(pkt(0xA2,[pid>>8,pid&255,...ts.flatMap(t=>str(t))]));pid=pid%60000+1};
    me.end=()=>{me.ondown=null;send(new Uint8Array([0xE0,0]));try{ws.close()}catch(e){}};
    return me}

  // ---------- 大廳 ----------
  const ls={get(k,d){try{const v=localStorage.getItem("xq_"+k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem("xq_"+k,JSON.stringify(v))}catch(e){}}};
  const me=()=>{const m=window.meInfo?meInfo():{id:"anon"+Math.random().toString(36).slice(2,8),name:""};return{id:m.id,name:m.name||("棋友"+m.id.slice(0,4))}};
  let cli=null,want=false,urlI=0,everUp=false,hb=null,retryT=null,people={},pending=null,G=null,emos=[],emoN=0,seeking=0,pendT=null;
  let cur=ls.get("net",null);   // 目前在哪一盤：{gid}；自己是紅、黑還是觀眾，看對局狀態裡的代號
  const L={};const on=(ev,f)=>{(L[ev]=L[ev]||[]).push(f);return()=>{L[ev]=L[ev].filter(x=>x!==f)}};const emit=(ev,d)=>(L[ev]||[]).forEach(f=>{try{f(d)}catch(e){console.error(e)}});
  const gt=gid=>[`${ROOT}/g/${gid}/s`,`${ROOT}/g/${gid}/e`];
  const side=()=>{if(!G)return null;const i=me().id;return G.red.id===i?"r":G.black.id===i?"b":null};
  function presence(){if(!cli||!cli.up)return;const m=me(),sd=side();
    cli.pub(`${ROOT}/u/${m.id}`,JSON.stringify({id:m.id,name:m.name,st:cur?(sd?"playing":"watching"):seeking?"seeking":"idle",gid:cur&&cur.gid||null,at:Date.now()}),true)}
  // 隨機配對：大家都把狀態設成 seeking；代號最小的人去邀請下一位，被邀請的人自動接受（避免兩邊同時互邀）
  function tryMatch(){if(!seeking||pending||cur||!cli||!cli.up)return;const i=me().id,now=Date.now();
    const c=Object.values(people).filter(x=>x.st==="seeking"&&x.id!==i&&now-x.at<ALIVE).sort((a,b)=>a.id<b.id?-1:1);
    if(!c.length||c[0].id<i)return;   // 有人代號比我小：等他來邀請
    sendInvite(c[0],true)}
  function sendInvite(to,auto){const m=me(),gid=Math.random().toString(36).slice(2,10)+Date.now().toString(36);pending={gid,to:to.id,name:to.name,auto};
    cli&&cli.pub(`${ROOT}/i/${to.id}`,JSON.stringify({type:"invite",gid,auto:!!auto,from:{id:m.id,name:m.name},at:Date.now()}));
    clearTimeout(pendT);if(auto)pendT=setTimeout(()=>{if(pending&&pending.gid===gid){pending=null;tryMatch()}},8000);return gid}
  function connect(){if(cli||!want||document.hidden)return;const m=me();
    cli=mqtt(URLS[urlI],{clientId:"xq"+m.id.slice(0,12)+Math.random().toString(36).slice(2,8),keepalive:30,will:{topic:`${ROOT}/u/${m.id}`,payload:"",retain:true}});
    cli.onup=()=>{everUp=true;cli.sub([`${ROOT}/u/+`,`${ROOT}/i/${m.id}`,...(cur?gt(cur.gid):[])]);presence();clearInterval(hb);hb=setInterval(presence,45000);emit("status")};
    cli.onmsg=onMsg;
    cli.ondown=was=>{cli=null;clearInterval(hb);if(!was&&!everUp)urlI=(urlI+1)%URLS.length;emit("status");
      clearTimeout(retryT);if(want)retryT=setTimeout(connect,was?1500:4000)}}
  function onMsg(topic,msg){const p=topic.slice(ROOT.length+1).split("/");
    if(p[0]==="u"){if(!msg)delete people[p[1]];else{try{const x=JSON.parse(msg);if(x&&x.id===p[1])people[p[1]]=x}catch(e){}}emit("people");tryMatch();return}
    if(p[0]==="i"){let x;try{x=JSON.parse(msg)}catch(e){return}if(!x||!x.from||Date.now()-(x.at||0)>120000)return;
      if(x.type==="invite"&&x.auto){   // 隨機配對來的：還在找就自動接受，不然婉拒
        const m=me();const ok=!!seeking&&!cur&&!pending;cli&&cli.pub(`${ROOT}/i/${x.from.id}`,JSON.stringify({type:ok?"accept":"decline",gid:x.gid,from:{id:m.id,name:m.name},at:Date.now()}));
        if(ok){seeking=0;G=null;enter(x.gid);emit("matched",{name:x.from.name})}}
      else if(x.type==="invite")emit("invite",x);
      else if(x.type==="accept"&&pending&&pending.gid===x.gid){const m=me(),auto=pending.auto;pending=null;clearTimeout(pendT);seeking=0;
        let red={id:m.id,name:m.name},black={id:x.from.id,name:x.from.name};if(auto&&Math.random()<.5)[red,black]=[black,red];   // 隨機配對：紅黑也隨機
        G={gid:x.gid,id:new Date().toISOString().replace(/[:.]/g,"-").slice(0,19),rev:1,red,black,moves:[],result:null,draw:null,at:Date.now()};
        enter(x.gid);pubGame();emit(auto?"matched":"start",{gid:x.gid,name:x.from.name})}
      else if(x.type==="decline"&&pending&&pending.gid===x.gid){const auto=pending.auto;pending=null;clearTimeout(pendT);if(auto)tryMatch();else emit("reply",{ok:false,name:x.from.name})}
      else if(x.type==="cancel")emit("cancel",x);
      return}
    if(p[0]==="g"&&cur&&p[1]===cur.gid){
      if(p[2]==="s"){if(!msg)return;let x;try{x=JSON.parse(msg)}catch(e){return}if(!G||x.rev>G.rev||x.gid!==G.gid){const before=side();G=x;if(side()!==before)presence();emit("game")}}
      else if(p[2]==="e"){try{const x=JSON.parse(msg);emos.push({id:++emoN,by:x.by,e:String(x.e||"").slice(0,12),at:Date.now()});emos=emos.slice(-20);emit("game")}catch(e){}}}}
  function enter(gid){if(cur&&cur.gid!==gid&&cli&&cli.up)cli.unsub(gt(cur.gid));cur={gid};ls.set("net",cur);emos=[];if(cli&&cli.up)cli.sub(gt(gid));presence()}
  function pubGame(){if(cli&&cli.up&&G)cli.pub(`${ROOT}/g/${G.gid}/s`,JSON.stringify(G),true)}
  // 手機切到背景時主動下線（iPhone 背景會斷線），回來再連上
  document.addEventListener("visibilitychange",()=>{if(document.hidden){if(cli){const c=cli;cli=null;clearInterval(hb);if(c.up)c.pub(`${ROOT}/u/${me().id}`,"",true);setTimeout(()=>c.end(),150)}}else connect()});

  return{
    on,start(){want=true;connect()},refresh:()=>presence(),
    status:()=>cli&&cli.up?"up":want?"connecting":"off",
    people:()=>{const now=Date.now(),i=me().id;return Object.values(people).filter(x=>x.id!==i&&now-x.at<ALIVE)},
    me,active:()=>!!cur,side,game:()=>G,gid:()=>cur&&cur.gid,
    invite(to){seeking=0;return sendInvite(to,false)},
    seek(on){seeking=on?Date.now():0;if(!on&&pending&&pending.auto)pending=null;presence();tryMatch();emit("people")},
    seeking:()=>!!seeking,
    seekers(){const now=Date.now(),i=me().id;return Object.values(people).filter(x=>x.st==="seeking"&&x.id!==i&&now-x.at<ALIVE).length},
    cancelInvite(){if(!pending)return;const m=me();cli&&cli.pub(`${ROOT}/i/${pending.to}`,JSON.stringify({type:"cancel",gid:pending.gid,from:{id:m.id,name:m.name},at:Date.now()}));pending=null},
    respond(x,ok){const m=me();cli&&cli.pub(`${ROOT}/i/${x.from.id}`,JSON.stringify({type:ok?"accept":"decline",gid:x.gid,from:{id:m.id,name:m.name},at:Date.now()}));
      if(ok){G=null;enter(x.gid)}},
    watch(gid){G=null;enter(gid)},
    leave(){if(cur&&cli&&cli.up)cli.unsub(gt(cur.gid));cur=null;G=null;ls.set("net",null);presence()},
    // 對局有變化：發布新狀態（rev 越大越新）
    update(fn){if(!G)throw new Error("還在等對局資料，稍等一下");const n=JSON.parse(JSON.stringify(G));fn(n);n.rev=G.rev+1;n.at=Date.now();G=n;pubGame();emit("game");return G},
    emote(by,e){if(cli&&cli.up&&cur)cli.pub(`${ROOT}/g/${cur.gid}/e`,JSON.stringify({by,e}))},
    emotes:()=>emos.filter(x=>Date.now()-x.at<60000),
    watchers(){if(!cur)return 0;const now=Date.now();return Object.values(people).filter(x=>x.gid===cur.gid&&x.st==="watching"&&now-x.at<ALIVE).length},
    isOn(id){const x=people[id];return id===me().id?!!(cli&&cli.up):!!(x&&Date.now()-x.at<ALIVE)}}})();
