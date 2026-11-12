#!/usr/bin/env node
// AI 象棋五羊盃 — 電腦版自動裁判
// 紅方：OpenAI Codex CLI（ChatGPT 訂閱登入）  黑方：Claude Code CLI（Claude 訂閱登入）
// 用法：node xiangqi-referee.js [--red-model gpt-5.5] [--black-model claude-opus-5-5]
//        [--minutes 60] [--inc 30] [--no-clock] [--effort high] [--port 8765] [--new] [--no-exp] [--lan] [--tunnel]
// 手機連線：--lan 同一個 Wi-Fi 可連；--tunnel 透過 Cloudflare 臨時通道，4G/5G 也能連（要先裝 cloudflared）。
//   兩者都會產生存取碼：外面連進來要用印出的完整網址（含 ?k=）打開一次，之後瀏覽器會記住；電腦本機不用。
// 經驗庫：每局結束後存到 xiangqi-db/games/，雙方各寫賽後心得；下一局的提示詞會帶入過去戰績、同局面的歷史著法和心得。
// 棋譜資料庫：http://localhost:8765/db （適情雅趣 550 局 + 歷屆 AI 對局）
"use strict";
const http=require("http"),{spawn}=require("child_process"),fs=require("fs"),os=require("os"),path=require("path");

// ---------- 參數 ----------
const CFG={redModel:"gpt-5.5",blackModel:"claude-opus-5-5",minutes:60,inc:30,clock:true,effort:"high",port:8765,fresh:false,timeoutMin:30,exp:true,
  file:path.join(process.cwd(),"xiangqi-game.json")};
{const a=process.argv.slice(2);for(let i=0;i<a.length;i++){const k=a[i],v=a[i+1];
  if(k==="--red-model"){CFG.redModel=v;i++}else if(k==="--black-model"){CFG.blackModel=v;i++}
  else if(k==="--minutes"){CFG.minutes=+v;i++}else if(k==="--inc"){CFG.inc=+v;i++}
  else if(k==="--no-clock")CFG.clock=false;else if(k==="--effort"){CFG.effort=v;i++}
  else if(k==="--port"){CFG.port=+v;i++}else if(k==="--new")CFG.fresh=true;
  else if(k==="--timeout"){CFG.timeoutMin=+v;i++}else if(k==="--no-exp")CFG.exp=false;
  else if(k==="--lan")CFG.lan=true;else if(k==="--tunnel")CFG.tunnel=true;else if(k==="--new-key")CFG.newKey=true;
  else if(k==="-h"||k==="--help"){console.log(fs.readFileSync(__filename,"utf8").split("\n").slice(1,5).join("\n"));process.exit(0)}}}
const WORK=fs.mkdtempSync(path.join(os.tmpdir(),"xiangqi-"));
const DB=path.join(__dirname,"xiangqi-db"),GAMES=path.join(DB,"games");
const ENGINE={r:"codex",b:"claude"},ENGINE_NAME={codex:"GPT（Codex）",claude:"Claude"};
const gameId=()=>new Date().toISOString().replace(/[:.]/g,"-").slice(0,19);

// ---------- 手機連線：存取碼 ----------
// 通道網址公開在網路上，所以存取碼比區網版長（18 位元組 ≈ 24 個字元，猜不到）。
// 存取碼存在 xiangqi-db/remote-key.json，重開程式不會換（手機只要更新網址）；加 --new-key 可以換一組新的（舊手機就連不上了）
const KEY=(()=>{if(!CFG.tunnel&&!CFG.lan)return null;const kind=CFG.tunnel?"tunnel":"lan",f=path.join(__dirname,"xiangqi-db","remote-key.json");
  let saved={};try{saved=JSON.parse(fs.readFileSync(f,"utf8"))}catch(e){}
  if(!CFG.newKey&&typeof saved[kind]==="string"&&saved[kind].length>=8)return saved[kind];
  saved[kind]=require("crypto").randomBytes(CFG.tunnel?18:6).toString("base64url");try{fs.writeFileSync(f,JSON.stringify(saved))}catch(e){}return saved[kind]})();
let TUNNEL_URL=null;
// 離線版 App（GitHub Pages）的網址；掃 QR code 會打開它並帶上連線資訊
const APP_URL="https://raysonchen2023-cloud.github.io/xiangqi-lab/",APP_ORIGINS=["https://raysonchen2023-cloud.github.io","http://localhost:8800"];
const sameKey=k=>{if(!KEY||typeof k!=="string"||k.length!==KEY.length)return false;return require("crypto").timingSafeEqual(Buffer.from(k),Buffer.from(KEY))};
// 電腦本機來的連線不用存取碼；經過 Cloudflare 通道來的雖然也是本機位址，但會帶 cf- 標頭，要算外面
function isLocal(req){const a=req.socket.remoteAddress||"";
  return(a==="127.0.0.1"||a==="::1"||a==="::ffff:127.0.0.1")&&!req.headers["cf-connecting-ip"]&&!req.headers["cf-ray"]}
function lanUrls(){const out=[];for(const list of Object.values(os.networkInterfaces()))for(const n of list||[])
  if(n.family==="IPv4"&&!n.internal)out.push(`http://${n.address}:${CFG.port}/m?k=${KEY}`);return out}
// 第一個網址放進 QR code：有通道時是離線版 App（帶連線資訊），其次是電腦上的手機版
function remoteUrls(){const u=[];
  if(TUNNEL_URL){const base=TUNNEL_URL.replace(/\/m\?k=.*$/,"");u.push(`${APP_URL}#connect=${encodeURIComponent(base)}&k=${KEY}`,TUNNEL_URL)}
  if(CFG.lan)u.push(...lanUrls());return u}
// Cloudflare 臨時通道偶爾會斷（程式還在，但網址失效）。每 2 分鐘從外面連自己一次，連續 3 次失敗或 cloudflared 結束就自動重開一條新通道。
let tunnelProc=null,tunnelFails=0,tunnelTimer=null,announced={base:"",at:0};
// 通道網址每次都會換。把新網址公告到 ntfy.sh 的「秘密頻道」（頻道名稱由存取碼算出來，別人猜不到；公告裡只有網址，沒有存取碼），
// 手機 App 連不到時會去這個頻道查新網址，自動換過去，不用重新掃 QR code。ntfy.sh 的公告保留 12 小時，所以每 6 小時再公告一次。
const ANNOUNCE_TOPIC=KEY&&CFG.tunnel?"xqlab-"+require("crypto").createHash("sha256").update("xqlab:"+KEY).digest("hex").slice(0,32):null;
// 另外存一份在線上大廳伺服器的「保留訊息」（不會過期），手機 App 找不到 ntfy 公告時改查這裡
/* 開發者 11/9 換私人伺服器（EMQX）：伺服器和帳密讀 xiangqi-lab/tools/mqtt-config.json（讀不到就照舊 broker.emqx.io）；換伺服器的過渡期兩邊都存一份，還沒更新的舊版 App 也找得到 */
let MQC=null;try{MQC=require(require("path").join(__dirname,"xiangqi-lab","tools","mqtt-config.js")).load([])}catch(e){MQC=null}
const MQ_TARGETS=[MQC&&MQC.username?{url:MQC.url,user:MQC.username,pass:MQC.password}:null,{url:"wss://broker.emqx.io:8084/mqtt",user:"",pass:""}].filter(Boolean);
function mqttRetain(topic,text,T){T=T||MQ_TARGETS[0];return new Promise(ok=>{if(typeof WebSocket!=="function")return ok(false);
  const te=new TextEncoder(),str=x=>{const b=te.encode(x);return[b.length>>8,b.length&255,...b]};
  const vlen=n=>{const a=[];do{let d=n%128;n=Math.floor(n/128);if(n>0)d|=128;a.push(d)}while(n>0);return a};
  const pkt=(h,body)=>new Uint8Array([h,...vlen(body.length),...body]);let ws;
  try{ws=new WebSocket(T.url,["mqtt"])}catch(e){return ok(false)}ws.binaryType="arraybuffer";
  const tm=setTimeout(()=>{try{ws.close()}catch(e){}ok(false)},15000);
  ws.onopen=()=>ws.send(pkt(0x10,[0,4,77,81,84,84,4,T.user?(T.pass?0xC2:0x82):0x02,0,30,...str("xqsrv"+Date.now().toString(36)),...(T.user?str(T.user):[]),...(T.user&&T.pass?str(T.pass):[])]));
  ws.onmessage=e=>{const b=new Uint8Array(e.data);if(b[0]>>4!==2)return;if(b[3]!==0){clearTimeout(tm);ws.close();return ok(false)}
    ws.send(pkt(0x31,[...str(topic),...te.encode(text)]));setTimeout(()=>{try{ws.send(new Uint8Array([0xE0,0]));ws.close()}catch(e){}clearTimeout(tm);ok(true)},800)};
  ws.onerror=()=>{}})}
async function announce(base,force){if(!ANNOUNCE_TOPIC||!base)return;if(!force&&announced.base===base&&Date.now()-announced.at<3*3600e3)return;
  for(const T of MQ_TARGETS)mqttRetain("xqlab-r7k2q/v1/c/"+ANNOUNCE_TOPIC.slice(6),base,T).then(x=>{if(!x)console.error("存網址到大廳伺服器失敗（"+T.url+"，下次再試）")});
  try{const r=await fetch("https://ntfy.sh/"+ANNOUNCE_TOPIC,{method:"POST",body:base,headers:{"Title":"xqlab","Tags":"xqlab"},signal:AbortSignal.timeout(10000)});
    if(r.ok){announced={base,at:Date.now()};console.log("🔁 已把新網址告訴手機 App（不用重新掃 QR code）")}}catch(e){console.error("公告新網址失敗：",e.message)}}
function startTunnel(){
  let p;try{p=spawn("cloudflared",["tunnel","--no-autoupdate","--url",`http://127.0.0.1:${CFG.port}`],{stdio:["ignore","pipe","pipe"]})}
  catch(e){return console.error("無法啟動 cloudflared：",e.message)}
  tunnelProc=p;tunnelFails=0;
  let found=false;const scan=d=>{if(found)return;const m=String(d).match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if(m){found=true;TUNNEL_URL=`${m[0]}/m?k=${KEY}`;const base0=m[0];setTimeout(()=>{if(TUNNEL_URL&&TUNNEL_URL.startsWith(base0))announce(base0)},20000);console.log(`\n📱 手機（4G/5G 或任何網路）打開這個網址，或掃電腦觀戰頁上的 QR code：\n   ${TUNNEL_URL}\n   剛建立時可能要等 10～30 秒才連得上。這個網址等於鑰匙，只給自己的手機用。\n   手機 App 已裝好的話：在 App 裡按 🔗 →「📷 掃描」，掃電腦頁上的 QR code。\n`)}};
  p.stdout.on("data",scan);p.stderr.on("data",scan);
  p.on("error",e=>{tunnelProc=null;console.error(e.code==="ENOENT"?"\n⚠ 找不到 cloudflared。請先安裝（只要一次，不用註冊帳號）：\n   Windows：winget install Cloudflare.cloudflared\n   Mac：brew install cloudflared\n裝好後開一個新的終端機視窗，再執行一次。\n":"cloudflared 錯誤："+e.message)});
  p.on("exit",code=>{if(tunnelProc!==p)return;tunnelProc=null;TUNNEL_URL=null;
    console.error(`\n⚠ Cloudflare 通道斷了（代碼 ${code}），5 秒後自動重開一條（網址會換，手機 App 會自動跟上）。\n`);setTimeout(()=>{if(!tunnelProc)startTunnel()},5000)});
  if(!tunnelTimer){tunnelTimer=setInterval(checkTunnel,120000);setInterval(()=>{if(TUNNEL_URL&&tunnelProc)announce(TUNNEL_URL.replace(/\/m\?k=.*$/,""),true)},3*3600e3);process.on("exit",()=>{try{tunnelProc&&tunnelProc.kill()}catch(e){}})}}
async function checkTunnel(){if(!TUNNEL_URL||!tunnelProc)return;const base=TUNNEL_URL.replace(/\/m\?k=.*$/,"");
  let ok=false;try{const ac=new AbortController(),t=setTimeout(()=>ac.abort(),15000);const r=await fetch(base+"/remote",{headers:{"x-xq-key":KEY},signal:ac.signal});clearTimeout(t);ok=r.ok}catch(e){}
  if(ok){tunnelFails=0;announce(base);return}
  if(++tunnelFails<3)return;
  console.error("\n⚠ 從外面連不到 Cloudflare 通道（連續 3 次），自動重開一條新的…\n");
  const old=tunnelProc;tunnelProc=null;TUNNEL_URL=null;try{old.kill()}catch(e){}startTunnel()}

// ---------- 引擎 ----------
const START="rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR";
const NAMES={r:{K:"帥",A:"仕",B:"相",N:"傌",R:"俥",C:"炮",P:"兵"},b:{K:"將",A:"士",B:"象",N:"馬",R:"車",C:"砲",P:"卒"}};
const CN=["","一","二","三","四","五","六","七","八","九"];
const VAL={K:100,R:9,C:4.5,N:4,B:2,A:2,P:1};
const D4=[[1,0],[-1,0],[0,1],[0,-1]], DG=[[1,1],[1,-1],[-1,1],[-1,-1]];
const NJ=[[-2,-1,-1,0],[-2,1,-1,0],[2,-1,1,0],[2,1,1,0],[-1,-2,0,-1],[1,-2,0,-1],[-1,2,0,1],[1,2,0,1]];
const sideOf=p=>p?(p===p.toUpperCase()?"r":"b"):null;
const opp=s=>s==="r"?"b":"r";
function parseFen(f){const b=Array(90).fill(null);let r=0,c=0;for(const ch of f){if(ch==="/"){r++;c=0}else if(/\d/.test(ch))c+=+ch;else{b[r*9+c]=ch;c++}}return b}
function fen(b,s){const rows=[];for(let r=0;r<10;r++){let row="",e=0;for(let c=0;c<9;c++){const p=b[r*9+c];if(!p)e++;else{if(e){row+=e;e=0}row+=p}}if(e)row+=e;rows.push(row)}return rows.join("/")+" "+(s==="r"?"w":"b")}
const inb=(r,c)=>r>=0&&r<10&&c>=0&&c<9;
function pseudo(b,sq){
  const p=b[sq],r=sq/9|0,c=sq%9,s=sideOf(p),t=p.toUpperCase(),out=[];
  const add=(rr,cc)=>{if(!inb(rr,cc))return;const q=b[rr*9+cc];if(!q||sideOf(q)!==s)out.push(rr*9+cc)};
  const pal=(rr,cc)=>cc>=3&&cc<=5&&(s==="r"?rr>=7&&rr<=9:rr>=0&&rr<=2);
  if(t==="K"){for(const[a,d]of D4)if(pal(r+a,c+d))add(r+a,c+d)}
  else if(t==="A"){for(const[a,d]of DG)if(pal(r+a,c+d))add(r+a,c+d)}
  else if(t==="B"){for(const[a,d]of DG){const rr=r+2*a,cc=c+2*d;if(!inb(rr,cc))continue;if(s==="r"?rr<5:rr>4)continue;if(b[(r+a)*9+c+d])continue;add(rr,cc)}}
  else if(t==="N"){for(const[a,d,la,ld]of NJ){const rr=r+a,cc=c+d;if(!inb(rr,cc))continue;if(b[(r+la)*9+c+ld])continue;add(rr,cc)}}
  else if(t==="R"||t==="C"){for(const[a,d]of D4){let rr=r+a,cc=c+d,jumped=false;while(inb(rr,cc)){const q=b[rr*9+cc];
      if(t==="R"){if(!q)out.push(rr*9+cc);else{if(sideOf(q)!==s)out.push(rr*9+cc);break}}
      else{if(!jumped){if(!q)out.push(rr*9+cc);else jumped=true}else if(q){if(sideOf(q)!==s)out.push(rr*9+cc);break}}
      rr+=a;cc+=d}}}
  else if(t==="P"){const f=s==="r"?-1:1;add(r+f,c);if(s==="r"?r<=4:r>=5){add(r,c-1);add(r,c+1)}}
  return out}
function kingSq(b,s){const k=s==="r"?"K":"k";return b.indexOf(k)}
function facing(b){const a=kingSq(b,"r"),k=kingSq(b,"b");if(a<0||k<0||a%9!==k%9)return false;for(let i=k+9;i<a;i+=9)if(b[i])return false;return true}
function attacked(b,sq,by){for(let i=0;i<90;i++){const p=b[i];if(p&&sideOf(p)===by&&pseudo(b,i).includes(sq))return true}return false}
function inCheck(b,s){const k=kingSq(b,s);return k<0||attacked(b,k,opp(s))}
function make(b,f,t){const n=b.slice();n[t]=n[f];n[f]=null;return n}
function legalOk(b,f,t){const s=sideOf(b[f]);const n=make(b,f,t);return !inCheck(n,s)&&!facing(n)}
function legal(b,s){const out=[];for(let i=0;i<90;i++){const p=b[i];if(p&&sideOf(p)===s)for(const t of pseudo(b,i))if(legalOk(b,i,t))out.push([i,t])}return out}
const sqName=q=>String.fromCharCode(97+q%9)+(9-(q/9|0));
const iccs=(f,t)=>sqName(f)+sqName(t);
function parseSq(s){const c=s.charCodeAt(0)-97,r=9-(+s[1]);return r*9+c}
function notate(b,f,t){
  const p=b[f],s=sideOf(p),T=p.toUpperCase(),fr=f/9|0,fc=f%9,tr=t/9|0,tc=t%9,name=NAMES[s][T];
  const file=c=>s==="r"?9-c:c+1, num=n=>s==="r"?CN[n]:String(n);
  const same=[];for(let r=0;r<10;r++)if(b[r*9+fc]===p)same.push(r);
  let head;
  if(same.length>1&&T!=="K"){const ord=s==="r"?same.sort((x,y)=>x-y):same.sort((x,y)=>y-x);const i=ord.indexOf(fr);
    const pre=ord.length===2?(i?"後":"前"):ord.length===3?["前","中","後"][i]:num(i+1);head=pre+name}
  else head=name+num(file(fc));
  const fwd=s==="r"?fr-tr:tr-fr;let act,dest;
  if(fr===tr){act="平";dest=num(file(tc))}else{act=fwd>0?"進":"退";dest="NBA".includes(T)?num(file(tc)):num(Math.abs(fr-tr))}
  return head+act+dest}
function crossed(p,sq){const r=sq/9|0;return sideOf(p)==="r"?r<=4:r>=5}
// 分析提示沿用座標配對；勝負裁判另以實體棋子ID重播，不能採信這個差集。
function chasePairs(b,s){
  return new Set([...attackMap(b,b.map((_,i)=>i),s)]
    .filter(([,a])=>!a.exempt&&!a.uncertain).map(([key])=>key))}
function hasAttackers(b,s){return b.some(p=>p&&sideOf(p)===s&&"RNCP".includes(p.toUpperCase()))}

// ChatGPT 接手改善（2026-11-10）：亞洲棋例的可追溯裁判。
// 本版只自動裁定直接捉子；複合交換、同類牽制等未覆蓋棋例明示待核，不能當和局。
const REP_RULES=Object.freeze({id:"asian-direct-v2",name:"亞洲棋例（直接捉子）",occurrences:3});
function captureLegal(b,f,t){return !!b[f]&&!!b[t]&&sideOf(b[f])!==sideOf(b[t])&&pseudo(b,f).includes(t)&&legalOk(b,f,t)}
function attackMap(b,ids,s){
  const a=new Map();
  for(let f=0;f<90;f++)if(b[f]&&sideOf(b[f])===s)for(const t of pseudo(b,f)){
    if(!b[t]||sideOf(b[t])===s||b[t].toUpperCase()==="K"||!legalOk(b,f,t))continue;
    const p=b[f].toUpperCase(),q=b[t].toUpperCase(),n=make(b,f,t);
    const rooted=n.some((x,j)=>x&&sideOf(x)===opp(s)&&captureLegal(n,j,t));
    const exchange=captureLegal(b,t,f);
    // 不以 VAL 的浮點子值推導棋規。亞洲規則的有根車例外僅限馬／炮。
    const exempt=p==="K"||p==="P"||exchange||(rooted&&!(q==="R"&&(p==="N"||p==="C")));
    const uncertain=!exempt&&p===q&&p!=="N";
    a.set(ids[f]+">"+ids[t],{attacker:ids[f],target:ids[t],from:f,to:t,piece:p,victim:q,rooted,exchange,exempt,uncertain});
  }
  return a}
function repetitionTrace(S,from){
  let b=parseFen(S.start||START),ids=b.map((p,i)=>p?i:null),s=S.startTurn||"r",cycleIds=null,identityStable=true;const trace=[];
  for(let i=0;i<S.moves.length;i++){
    if(i===from)cycleIds=ids.slice();
    const m=S.moves[i],before=i>=from?attackMap(b,ids,s):null;
    b=make(b,m.f,m.t);ids=ids.slice();ids[m.t]=ids[m.f];ids[m.f]=null;
    if(i>=from&&fen(b,opp(s))===S.pos[from]&&ids.some((id,j)=>id!==cycleIds[j]))identityStable=false;
    if(i>=from){const after=attackMap(b,ids,s);trace.push({ply:i+1,by:s,check:inCheck(b,opp(s)),
      attacks:[...after].filter(([key])=>!before.has(key)).map(([,a])=>a),board:b,ids});}
    s=opp(s);
  }
  // 只有對手逃子或直接消解該捉，才列入直接長捉；不能把長獻當長捉。
  return {identityStable,trace:trace.map((e,i)=>{const reply=trace[(i+1)%trace.length];return{ply:e.ply,by:e.by,check:e.check,
    attacks:e.attacks.filter(a=>{const f=reply.ids.indexOf(a.attacker),t=reply.ids.indexOf(a.target);
      return f<0||t<0||!captureLegal(reply.board,f,t)})}})}}
/* 從開局重播到第 to 手，記下第 from 手以後每一步是誰走、有沒有將軍（不信任存檔裡的 ck 標記） */
function checksSpan(S,from,to){let b=parseFen(S.start||START),s=S.startTurn||"r";const out=[];for(let i=0;i<to;i++){const m=S.moves[i];b=make(b,m.f,m.t);if(i>=from)out.push({by:s,check:inCheck(b,opp(s))});s=opp(s)}return out}
function repetitionVerdict(S){
  const n=S.moves.length,key=S.pos&&S.pos[n],idx=[];
  if(!key)return null;
  S.pos.forEach((p,i)=>{if(i<=n&&p===key)idx.push(i)});
  if(idx.length<REP_RULES.occurrences)return null;
  const points=idx.slice(-REP_RULES.occurrences),from=points[0],len=points[1]-from;
  const evidence={rules:REP_RULES.id,occurrences:points,fromPly:from+1,toPly:n};
  // 兩段必須是同一完整循環，不混用早先走過的局面或不同長度的路徑。
  const same=points[2]-points[1]===len&&S.moves.slice(from,points[1]).every((m,i)=>{
    const z=S.moves[points[1]+i];return z&&m.f===z.f&&m.t===z.t});
  /* Claude 11/11（開發者選「先修再上線」）：路線不同但某一方兩輪循環裡每步都將軍＝長將，照判；其他路線不同的循環照舊待核 */
  if(!same){const sp=checksSpan(S,from,n),rc=sp.filter(x=>x.by==="r"),bc=sp.filter(x=>x.by==="b"),rC=rc.length>0&&rc.every(x=>x.check),bC=bc.length>0&&bc.every(x=>x.check);
    if(rC&&bC)return{...evidence,w:null,why:"雙方長將，判和"};
    if(rC)return{...evidence,w:"b",why:"紅方長將判負（循環路線不同，但每步都將軍）"};
    if(bC)return{...evidence,w:"r",why:"黑方長將判負（循環路線不同，但每步都將軍）"};
    return{...evidence,pending:true,why:"重複路徑不同，棋例待核；可變著或提和，不自動判和／判負"}}
  const replay=repetitionTrace(S,from),trace=replay.trace;evidence.trace=trace;
  if(!replay.identityStable)return{...evidence,pending:true,why:"同類棋子交換位置的循環待核；可變著或提和，不自動判和／判負"};
  function side(s){
    const ms=trace.filter(m=>m.by===s),check=ms.length>0&&ms.every(m=>m.check);
    let targets=null,uncertain=false;
    for(const m of ms){
      const a=m.check?[]:m.attacks.filter(a=>!a.exempt);
      uncertain=uncertain||a.some(a=>a.uncertain);
      const ts=new Set(a.filter(a=>!a.uncertain).map(a=>a.target));
      targets=targets===null?ts:new Set([...targets].filter(t=>ts.has(t)));
    }
    // 將帥／兵卒本身參與捉同一子時，不能只刪除它的攻擊再誤判其他子的長捉。
    const pawnOrKing=ms.some(m=>m.attacks.some(a=>(a.piece==="K"||a.piece==="P")&&targets&&targets.has(a.target)));
    return{check,chase:!!(targets&&targets.size)&&!pawnOrKing,targets:targets?[...targets]:[],uncertain};
  }
  const r=side("r"),b=side("b");evidence.red=r;evidence.black=b;
  const result=(w,why)=>({...evidence,w,why});
  if(r.check&&b.check)return result(null,"雙方長將，判和");
  if(r.check)return result("b","紅方長將判負");
  if(b.check)return result("r","黑方長將判負");
  if(r.uncertain||b.uncertain)return{...evidence,pending:true,why:"涉及同類子牽制的特殊棋例待核；可變著或提和，不自動判和／判負"};
  if(r.chase&&b.chase)return{...evidence,pending:true,why:"雙方互捉的責任棋例待核；可變著或提和，不自動判和／判負"};
  if(r.chase)return result("b","紅方長捉同一子判負");
  if(b.chase)return result("r","黑方長捉同一子判負");
  return result(null,"亞洲棋例：循環未構成單方長將或直接長捉，判和")}
/* 臺灣棋規正式版（開發者 11/12 評比第 9 輪「F4 可以做嗎」→ 做；選「雙方都選才計分」「100 著自動判和」）
   依《中華民國象棋規則》113 年修訂版（中華民國象棋文化協會 https://www.cccs.org.tw/Page?itemid=18&mid=35 附的 PDF）：
   ・第二章第一節術語「長將／長捉」：循環歸原狀態達三次循環 → 同一局面第 4 次出現才判（千秋休閒規則是第 3 次）
   ・術語「捉」說明一～六：將帥、兵卒攻擊＝閒；不能離線的子攻擊＝閒；同兵種互相攻擊＝閒，被攻擊子不能離線＝捉；
     有真根＝閒、無根＝捉；傌炮仕相攻擊俥不論有根無根都是捉；可互換吃去＝兌（閒）
   ・第二節 C 表 2.2-1：雙方同為長將／長捉／未犯例都判和；一方長將另一方不是＝長將方負；一方長捉另一方未犯例＝長捉方負
   ・棋例總綱 7：長捉同類子未犯例，但該子受牽制不能離線時仍作長捉論；活傌長捉拐腳馬亦犯例
   ・第三章第四節限著：雙方共走 100 著未吃子判和（條文「經裁判審查」，App 沒有裁判，自動判和並寫明） */
const TW_RULES=Object.freeze({id:"tw113-v1",name:"中華民國象棋規則 113 年修訂版",occurrences:4});
function twPinned(b,i){const p=b[i];if(!p)return false;const s=sideOf(p),n=b.slice();n[i]=null;return inCheck(n,s)||facing(n)}   /* 術語「不能離線／位」：這子一離開就會被將或王見王 */
function twCatch(b,f,t){const p=b[f].toUpperCase(),q=b[t].toUpperCase(),s=sideOf(b[f]);
  if(p==="K"||p==="P")return{c:false,why:"將帥兵卒攻擊為閒"};
  if(twPinned(b,f))return{c:false,why:"攻擊子不能離線為閒"};
  if(p===q){if(twPinned(b,t))return{c:true,same:true,why:"同兵種、被攻擊子不能離線為捉"};if(captureLegal(b,t,f))return{c:false,why:"同兵種可以互相攻擊為閒"}}
  if(q==="R"&&"NCAB".includes(p))return{c:true,why:"傌炮仕相攻擊俥不論有根無根皆為捉"};
  if(captureLegal(b,t,f))return{c:false,why:"可互換吃去為兌"};
  const n=make(b,f,t),rooted=n.some((x,j)=>x&&sideOf(x)!==s&&captureLegal(n,j,t));
  return rooted?{c:false,why:"被攻擊子有真根為閒"}:{c:true,same:p===q,why:"被攻擊子無根為捉"}}
function twTrace(S,from){
  let b=parseFen(S.start||START),ids=b.map((p,i)=>p?i:null),s=S.startTurn||"r",cycleIds=null,stable=true;const tr=[];
  for(let i=0;i<S.moves.length;i++){if(i===from)cycleIds=ids.slice();const m=S.moves[i],before=i>=from?attackMap(b,ids,s):null;
    b=make(b,m.f,m.t);ids=ids.slice();ids[m.t]=ids[m.f];ids[m.f]=null;
    if(i>=from&&fen(b,opp(s))===S.pos[from]&&ids.some((id,j)=>id!==cycleIds[j]))stable=false;
    if(i>=from){const after=attackMap(b,ids,s);tr.push({ply:i+1,by:s,check:inCheck(b,opp(s)),board:b,ids,attacks:[...after].filter(([k])=>!before.has(k)).map(([,a])=>a)})}
    s=opp(s)}
  /* 對手這一手化解了（逃子、擋住、吃掉）才算步步捉；跟千秋休閒規則同一個做法 */
  return{stable,trace:tr.map((e,i)=>{const reply=tr[(i+1)%tr.length];return{...e,attacks:e.attacks.filter(a=>{const f=reply.ids.indexOf(a.attacker),t=reply.ids.indexOf(a.target);return f<0||t<0||!captureLegal(reply.board,f,t)})}})}}
function twRepetitionVerdict(S){
  const n=S.moves.length,key=S.pos&&S.pos[n],idx=[];if(!key)return null;
  S.pos.forEach((p,i)=>{if(i<=n&&p===key)idx.push(i)});
  if(idx.length<TW_RULES.occurrences)return null;
  const points=idx.slice(-TW_RULES.occurrences),from=points[0],len=points[1]-from;
  const evidence={rules:TW_RULES.id,ruleset:"tw113",occurrences:points,fromPly:from+1,toPly:n};
  const same=points.every((p,k)=>k===0||p-points[k-1]===len)&&[1,2].every(c=>S.moves.slice(from,points[1]).every((m,i)=>{const z=S.moves[points[c]+i];return z&&m.f===z.f&&m.t===z.t}));
  if(!same){const sp=checksSpan(S,from,n),rc=sp.filter(x=>x.by==="r"),bc=sp.filter(x=>x.by==="b"),rC=rc.length>0&&rc.every(x=>x.check),bC=bc.length>0&&bc.every(x=>x.check);
    if(rC&&bC)return{...evidence,w:null,why:"臺灣棋規：雙方長將，經三次循環仍不變著，判和（表 2.2-1）"};
    if(rC)return{...evidence,w:"b",why:"臺灣棋規：紅方長將，經三次循環仍不變著，判負（棋例總綱 1）"};
    if(bC)return{...evidence,w:"r",why:"臺灣棋規：黑方長將，經三次循環仍不變著，判負（棋例總綱 1）"};
    return{...evidence,pending:true,policy:"prompt_agree",why:"臺灣棋規：循環路線不同，App 無法比對是否「步步」將或捉；請變著，或雙方協議和棋"}}
  const R=twTrace(S,from);
  if(!R.stable)return{...evidence,pending:true,policy:"prompt_agree",why:"臺灣棋規：同類棋子交換位置的循環，App 無法比對；請變著，或雙方協議和棋"};
  const side=s=>{const ms=R.trace.filter(m=>m.by===s),check=ms.length>0&&ms.every(m=>m.check);let targets=null,samePin=false;
    for(const m of ms){const ts=new Set();for(const a of m.check?[]:m.attacks){const k=twCatch(m.board,a.from,a.to);if(k.c){ts.add(a.target);if(k.same)samePin=true}}
      targets=targets===null?ts:new Set([...targets].filter(t=>ts.has(t)))}
    /* 棋例總綱 9：將帥或兵卒聯合他子長捉同一子未犯例 */
    const pk=ms.some(m=>m.attacks.some(a=>(a.piece==="K"||a.piece==="P")&&targets&&targets.has(a.target)));
    const chase=!!(targets&&targets.size)&&!pk;return{check,chase,samePin:chase&&samePin,targets:targets?[...targets]:[]}};
  const r=side("r"),b=side("b"),lv=x=>x.check?2:x.chase?1:0,L=["未犯例","長捉","長將"];
  evidence.red={check:r.check,chase:r.chase,targets:r.targets};evidence.black={check:b.check,chase:b.chase,targets:b.targets};
  const res=(w,why)=>({...evidence,w,why}),R0=lv(r),B0=lv(b),art=x=>x.check?"棋例總綱 1":x.samePin?"棋例總綱 7（同類子受牽制不能離線，仍作長捉論）":"棋例總綱 3";
  if(R0===B0)return res(null,"臺灣棋規：雙方"+L[R0]+"，經三次循環仍不變著，判和（表 2.2-1）");
  if(R0>B0)return res("b","臺灣棋規：紅方"+L[R0]+"，經三次循環仍不變著，判負（"+art(r)+"）");
  return res("r","臺灣棋規：黑方"+L[B0]+"，經三次循環仍不變著，判負（"+art(b)+"）")}

/* 棋規註冊表與棋規設定（開發者 11/11 評比循環 F3「多棋規與臺灣棋規可切換原型」；Gemini 架構報告第一項，查證後實作，見 story/100_Gemini架構報告處理.md）
   真正實作、可以計積分的只有 qiqiu_casual（上面 REP_RULES 的亞洲棋例直接捉子子集＋App 自訂限著）。
   tw_proto 只是原型：資料結構和切換先有；判法只改「規程查得到依據」的那一條——新竹市 114 年市長盃規程寫長將／長捉要「經裁判裁決仍不變著」才判負，
   App 沒有現場裁判，所以循環到第 3 次改成提示、交雙方協議（待核），不自動判；查不到條文的照實標「未查證」，暫時沿用千秋休閒規則，不編條文。
   每盤棋開局時寫一份 rc（ruleConfig），之後改設定也不影響這盤；舊存檔沒有 rc 就補預設 qiqiu_casual。 */
const RULESET_DEFAULT="qiqiu_casual";
const RULESETS=Object.freeze({
  qiqiu_casual:Object.freeze({id:"qiqiu_casual",name:"千秋休閒規則",short:"千秋休閒",edition:"2026-11",status:"implemented",rated:true,unresolvedPolicy:"pending_review",
    basis:"亞洲棋例（直接捉子）的子集，循環裁判版本 "+REP_RULES.id+"；60 回合限著是 App 自訂",
    covers:["將死","困斃","長將判負","直接長捉同一子判負","一將一捉判和","閒著循環判和","60 回合未吃子判和","雙方無進攻子力判和","超時判負"],
    pending:["路線不同的循環（不是每步將軍）","同類棋子換位","雙方互捉","同類子牽制"],diffs:[]}),
  tw_proto:Object.freeze({id:"tw_proto",hidden:true,name:"臺灣比賽規程（原型）",short:"臺灣規程・原型",edition:"依比賽規程引用的《中華民國象棋規則》96 年修訂版；條文原文未取得",status:"prototype",rated:false,unresolvedPolicy:"prompt_agree",
    basis:"新竹市 114 年市長盃競賽規程（引用《中華民國象棋規則》96 年修訂版）；條文原文未取得",
    covers:["將死","困斃","雙方無進攻子力判和（沿用，未查證）","60 回合未吃子判和（沿用，未查證）","超時判負（沿用）"],pending:["所有循環：提示後交雙方協議"],
    diffs:[{rule:"長將",tw:"單方長將循環三回合後，經裁判裁決長將方仍不變著判負（規程原文）",app:"第 3 次重複改成提示、交雙方協議，不自動判負",verified:true},
      {rule:"長捉",tw:"長捉無根子循環三回合後，經裁判裁決仍不變著判負（規程原文）",app:"同上",verified:true},
      {rule:"一將一捉、互捉、閒著循環",tw:"未查證",app:"提示、交雙方協議，不自動判和",verified:false},
      {rule:"60 回合限著",tw:"未查證",app:"暫時沿用千秋休閒規則",verified:false},
      {rule:"超時、子力不足",tw:"未查證",app:"暫時沿用千秋休閒規則（時間用完一律判負）",verified:false}]}),
  /* 11/12 正式版：照 113 年修訂版條文自動判；可以計分（線上要雙方都選這一套才計分，net.js netRc；晉級賽可選，local.js） */
  tw113:Object.freeze({id:"tw113",name:"臺灣棋規（中華民國象棋規則 113 年修訂版）",short:"臺灣棋規",edition:"113 年修訂版",status:"implemented",rated:true,unresolvedPolicy:"prompt_agree",
    basis:"《中華民國象棋規則》113 年修訂版（中華民國象棋文化協會），循環裁判版本 "+TW_RULES.id+"；條文 https://www.cccs.org.tw/Page?itemid=18&mid=35",
    covers:["將死","困斃","長將判負（三次循環）","長捉判負（三次循環，術語「捉」說明一～六）","雙方長將／長捉／未犯例判和（表 2.2-1）","同類子受牽制仍作長捉（棋例總綱 7）","100 著未吃子判和（App 代替裁判審查）","雙方無進攻子力判和（App 自訂）","超時判負"],
    pending:["循環路線不同（不是每步將軍）","同類棋子交換位置"],
    diffs:[{rule:"循環判決時機",tw:"三次循環後裁判介入",app:"同一局面第 4 次出現自動判（沒有現場裁判）",verified:true},
      {rule:"自然限著",tw:"雙方共走 100 著未吃子，經裁判員認同後判和",app:"第 100 著自動判和",verified:true},
      {rule:"犯規、違例次數（犯規兩次或違例四次判負）",tw:"現場裁判記錄",app:"App 不讓下出違規著法，不記次數",verified:true}]})});
const RC_MODES=["casual","ranked","puzzle"];
function ruleConfig(id,mode){const R=RULESETS[id]||RULESETS[RULESET_DEFAULT],m=RC_MODES.includes(mode)?mode:"casual";
  return Object.freeze({rulesetId:R.id,edition:R.edition,implementationVersion:REP_RULES.id,mode:m==="ranked"&&!R.rated?"casual":m,unresolvedPolicy:R.unresolvedPolicy})}
/* 讀回的棋規設定一律重新整理：不認得的棋規→預設；原型棋規不能是 ranked（防手改存檔）；implementationVersion 照存檔留著當紀錄（指紋） */
function ruleConfigOf(S){const o=S&&S.rc,R=o&&RULESETS[o.rulesetId];
  if(!R)return ruleConfig(RULESET_DEFAULT,S&&S.ranked?"ranked":S&&S.practice?"puzzle":"casual");
  const m=RC_MODES.includes(o.mode)?o.mode:"casual";
  return Object.freeze({rulesetId:R.id,edition:R.edition,implementationVersion:typeof o.implementationVersion==="string"?o.implementationVersion.slice(0,40):REP_RULES.id,mode:m==="ranked"&&!R.rated?"casual":m,unresolvedPolicy:R.unresolvedPolicy})}
function ruleRated(rc){const R=rc&&RULESETS[rc.rulesetId];return !!R&&R.rated}
/* 依這盤的棋規調整循環裁決。qiqiu_casual（或沒有 rc）原樣；tw_proto 把判負／判和改成待核提示，原本的判決留在 base 供追溯 */
function rulesetVerdict(rep,S){
  if(!rep||rep.pending)return rep;const rc=S&&S.rc;if(!rc||rc.rulesetId!=="tw_proto")return rep;
  const loss=rep.w!=null,who=String(rep.why||"").replace(/判負.*$/,"");
  const{w,...rest}=rep;return{...rest,pending:true,policy:"prompt_agree",ruleset:"tw_proto",base:{w,why:rep.why},
    why:loss?"臺灣規程（原型）："+who+"，規程寫「經裁判裁決仍不變著」才判負；App 沒有現場裁判，先提醒：請變著，或雙方協議和棋":"臺灣規程（原型）：這種循環怎麼判，條文未查證；請變著，或雙方協議和棋"}}
/* 循環預警（預警與判決分離）：輪到 me、眼前局面第二次出現時，模擬「照上一輪再走一圈」，每一步都交給 judgeState 判；
   回傳警告事件 {type,kind:"loss"|"review",side,why,ply,verdict}，或 null（判和、不判、輪不到、這關不判長將長捉）。畫面只照事件顯示，不自己推輸贏 */
function repetitionWarning(st,me){
  if(!st||st.result||!me||st.turn!==me||!st.moves||st.moves.length<4)return null;
  const base={start:st.start||null,startTurn:st.startTurn||"r",moves:st.moves.map(m=>({f:m.f,t:m.t}))};if(st.rc)base.rc=st.rc;
  const S={...base,moves:base.moves.slice()};stateRebuild(S);
  const n=S.moves.length,key=S.pos[n],idx=[];S.pos.forEach((p,i)=>{if(p===key)idx.push(i)});
  const need=st.rc&&st.rc.rulesetId==="tw113"?TW_RULES.occurrences-1:2;if(idx.length!==need)return null;   /* 臺灣棋規正式版第 4 次出現才判，所以第 3 次出現時預警 */
  const cyc=base.moves.slice(idx[need-2],idx[need-1]);let v=null;
  for(let k=1;k<=cyc.length&&!v;k++){const T={...base,moves:base.moves.concat(cyc.slice(0,k))};stateRebuild(T);const j=judgeState(T);if(j)v=j;else if(T.repetition&&T.repetition.pending)v=T.repetition}
  if(!v||(!v.pending&&v.w!==opp(me)))return null;
  if(st.noPerp&&!v.pending&&/長將|長捉|長打/.test(v.why||""))return null;
  return{type:"repetition-warning",kind:v.pending?"review":"loss",side:me,why:v.why||"",ply:n,verdict:v}}


// ---------- 對局狀態 ----------
const PLAYER={r:"紅方",b:"黑方"};
let G,board,turn,positions;
let running=false,child=null,status="等待開始。請在網頁按「開始對局」。",live="",liveSide=null;
function newGame(){G={id:gameId(),engines:{...ENGINE},moves:[],clocks:{r:CFG.minutes*60000,b:CFG.minutes*60000},result:null,started:false,red:CFG.redModel||"Codex 預設",black:CFG.blackModel||"Claude 預設"};rebuild();save()}
function rebuild(){const S={moves:G.moves};stateRebuild(S);G.moves=S.moves;board=S.board;turn=S.turn;positions=S.pos}
function save(){try{fs.writeFileSync(CFG.file,JSON.stringify({...G,moves:G.moves.map(m=>({f:m.f,t:m.t,by:m.by,cm:m.cm,ck:m.ck,ch:m.ch,q:m.q,loss:m.loss,ev:m.ev,bmt:m.bmt,pmt:m.pmt,rr:m.rr,bc:m.bc,bm:m.bm,bp:m.bp}))},null,1))}catch(e){console.error("存檔失敗",e.message)}
  try{fs.writeFileSync(CFG.file.replace(/\.json$/,".txt"),recordText())}catch(e){}}
function load(){try{const d=JSON.parse(fs.readFileSync(CFG.file,"utf8"));G=d;rebuild();return true}catch(e){return false}}
function applyMove(f,t,cm){
  const mover=turn,chB=chasePairs(board,mover);
  const m={f,t,by:mover,cm:cm||""};m.cn=notate(board,f,t);m.cap=board[t];
  board=make(board,f,t);turn=opp(turn);m.ck=inCheck(board,turn);
  const chA=chasePairs(board,mover);m.ch=[...chA].some(x=>!chB.has(x));
  G.moves.push(m);positions.push(fen(board,turn));
  if(CFG.clock)G.clocks[mover]+=CFG.inc*1000;
  judge();save();setImmediate(analyzeGame);
  console.log(`${String(Math.ceil(G.moves.length/2)).padStart(3)}. ${PLAYER[mover]} ${m.cn} (${iccs(f,t)})${m.ck?" 將軍":""}  ${m.cm||""}`)}
function judge(){
  const S={board,turn,moves:G.moves,pos:positions,start:START,startTurn:"r"};
  const r=judgeState(S);G.repetition=S.repetition;if(r)end(r.w,r.why)}
function end(w,why){G.result={w,why,...(G.repetition&&!G.repetition.pending?{adjudication:G.repetition}:{})};running=false;if(child){try{child.kill()}catch(e){}}status=`對局結束：${w?PLAYER[w]+"勝":"和局"}（${why}）`;save();console.log("\n"+status+"\n棋譜已存到 "+CFG.file.replace(/\.json$/,".txt"));
  archive();setTimeout(reflect,300)}
function recordText(){return `AI 象棋五羊盃\n紅方：${G.red}（Codex CLI）  黑方：${G.black}（Claude Code）\n`+(G.result?`結果：${G.result.w?PLAYER[G.result.w]+"勝":"和局"}（${G.result.why}）\n`:"")+"\n"+record()+"\n"}

// ---------- 提示詞 ----------
function boardText(b){let s="    a b c d e f g h i\n";for(let r=0;r<10;r++){s+=(9-r)+"   "+Array.from({length:9},(_,c)=>b[r*9+c]||".").join(" ")+"\n";if(r===4)s+="    ~~~~ 楚河  漢界 ~~~~\n"}return s}
function record(){const out=[];for(let i=0;i<G.moves.length;i+=2){const a=G.moves[i],z=G.moves[i+1];out.push(`${i/2+1}. ${a.cn}(${iccs(a.f,a.t)})`+(z?` ${z.cn}(${iccs(z.f,z.t)})`:""))}return out.join(" ")}
function buildPrompt(s,errNote){
  const lm=legal(board,s),me=s==="r"?"紅方（大寫，先行，在下方）":"黑方（小寫，在上方）";
  const list=lm.map(([f,t])=>{const n=make(board,f,t);return iccs(f,t)+" "+notate(board,f,t)+(positions.includes(fen(n,opp(s)))?" [重複局面]":"")}).join("\n");
  let since=0;for(let i=G.moves.length-1;i>=0;i--){if(G.moves[i].cap)break;since++}
  return `你正在參加正式的中國象棋比賽（棋例採${REP_RULES.name}）。紅方是 ${G.red}，黑方是 ${G.black}。你執${me}。請全力求勝。
這是純粹的下棋任務：不要讀寫檔案、不要執行任何指令，直接思考並回答。

座標採 ICCS：直行 a–i 為紅方視角由左至右，橫列 0–9 由紅方底線（0）到黑方底線（9）。著法格式為「起點終點」，例如 h2e2 = 炮二平五。
棋子代號：K帥/將 A仕/士 B相/象 N傌/馬 R俥/車 C炮/砲 P兵/卒，大寫紅、小寫黑。

目前輪到：${PLAYER[s]}（第 ${Math.floor(G.moves.length/2)+1} 回合）
FEN：${fen(board,s)}
${inCheck(board,s)?"⚠ 你正被將軍。\n":""}
${boardText(board)}
棋譜：${record()||"（尚未行棋）"}
已連續 ${since} 步無吃子（120 步判和）。
${experience(s)}
你的全部合法著法（${lm.length} 步，必須從中選一）：
${list}

規則提醒：採亞洲棋例的直接捉子判定；單方長將、長捉同一子須變著，一將一捉不直接視為長捉；特殊互捉棋例待核，不自動判和／判負；困斃判負。標記 [重複局面] 的著法會回到曾出現的局面。
${errNote?"\n注意："+errNote+"\n":""}
請先分析，最後只輸出一行 JSON，不要其他文字：
{"move":"<ICCS 著法>","comment":"<一句話說明意圖>"}`}
function parseReply(txt,s){
  const lm=legal(board,s),set=new Map(lm.map(([f,t])=>[iccs(f,t),[f,t]]));let cm="";
  const js=[...txt.matchAll(/\{[^{}]*"move"[^{}]*\}/g)].map(x=>x[0]);
  for(let i=js.length-1;i>=0;i--){try{const j=JSON.parse(js[i]);const mv=String(j.move||"").toLowerCase().replace(/[^a-i0-9]/g,"");if(set.has(mv))return{mv:set.get(mv),cm:String(j.comment||"")}}catch(e){}}
  const all=[...txt.toLowerCase().matchAll(/([a-i])\s*([0-9])\s*[-–>]?\s*([a-i])\s*([0-9])/g)].map(x=>x[1]+x[2]+x[3]+x[4]);
  for(let i=all.length-1;i>=0;i--)if(set.has(all[i]))return{mv:set.get(all[i]),cm};
  for(const[f,t]of lm)if(txt.includes(notate(board,f,t)))return{mv:[f,t],cm};
  return{mv:null,bad:all[all.length-1]||txt.trim().slice(-60)}}

// ---------- 經驗庫 ----------
let HC={key:null,games:[]};
function history(){
  let files=[];try{files=fs.readdirSync(GAMES).filter(f=>f.endsWith(".json")).sort()}catch(e){}
  const key=files.map(f=>{try{return f+":"+fs.statSync(path.join(GAMES,f)).mtimeMs}catch(e){return f}}).join("|");
  if(key===HC.key)return HC.games;
  const games=[];
  for(const f of files){try{const g=JSON.parse(fs.readFileSync(path.join(GAMES,f),"utf8"));
    let b=parseFen(START),s="r";const seen=new Map();
    for(const m of g.moves){const k=fen(b,s);if(!seen.has(k))seen.set(k,[]);seen.get(k).push({mv:iccs(m.f,m.t),cn:notate(b,m.f,m.t)});b=make(b,m.f,m.t);s=opp(s)}
    Object.defineProperty(g,"seen",{value:seen,enumerable:false});games.push(g)}catch(e){console.error("讀取經驗庫失敗："+f,e.message)}}
  HC={key,games};return games}
const sideIn=(g,engine)=>((g.engines||ENGINE).r===engine?"r":"b");
const resultFor=(g,s)=>!g.result.w?"和":g.result.w===s?"勝":"負";
function experience(s){
  if(!CFG.exp)return"";
  const me=(G.engines||ENGINE)[s],H=history().filter(g=>g.id!==G.id&&g.result);
  if(!H.length)return"";
  let w=0,l=0,d=0;for(const g of H){const r=resultFor(g,sideIn(g,me));if(r==="勝")w++;else if(r==="負")l++;else d++}
  const key=fen(board,s),agg=new Map();
  for(const g of H){const hits=g.seen.get(key);if(!hits)continue;
    for(const h of hits){const a=agg.get(h.mv)||{cn:h.cn,n:0,w:0,l:0,d:0};a.n++;const r=resultFor(g,s);if(r==="勝")a.w++;else if(r==="負")a.l++;else a.d++;agg.set(h.mv,a)}}
  const lessons=[];
  for(const g of H.slice().reverse()){const ms=sideIn(g,me),L=g.lessons&&g.lessons[ms];
    if(Array.isArray(L))for(const x of L)if(lessons.length<8)lessons.push(`（${g.date||g.id.slice(0,10)} 執${PLAYER[ms]}，${resultFor(g,ms)}）${x}`)}
  let t=`\n【你的經驗庫】你（${ENGINE_NAME[me]}）過去下過 ${H.length} 局：${w} 勝 ${l} 負 ${d} 和。\n`;
  if(agg.size)t+="這個局面在過去對局中出現過，當時輪走方的選擇與該方最終結果：\n"+[...agg].sort((a,b)=>b[1].n-a[1].n).map(([m,a])=>`- ${m} ${a.cn}：${a.n} 次（${a.w} 勝 ${a.l} 負 ${a.d} 和）`).join("\n")+"\n";
  if(lessons.length)t+="你過去的賽後心得（最新在前）：\n"+lessons.map(x=>"- "+x).join("\n")+"\n";
  return t+"經驗只供參考，仍以目前局面的具體計算為準。\n"}
function archive(){
  if(!G.result||!G.moves.length)return;
  try{fs.mkdirSync(GAMES,{recursive:true});if(!G.id)G.id=gameId();if(!G.engines)G.engines={...ENGINE};
    const g={id:G.id,date:G.id.slice(0,10),red:G.red,black:G.black,engines:G.engines,result:G.result,lessons:G.lessons||null,
      moves:G.moves.map(m=>({f:m.f,t:m.t,by:m.by,cm:m.cm,ck:m.ck,q:m.q,loss:m.loss,ev:m.ev,bmt:m.bmt,pmt:m.pmt,rr:m.rr,bc:m.bc,bm:m.bm,bp:m.bp}))};
    fs.writeFileSync(path.join(GAMES,G.id+".json"),JSON.stringify(g,null,1));save()}
  catch(e){console.error("對局存入經驗庫失敗",e.message)}}
let reflecting=false;
async function reflect(){
  if(!CFG.exp||reflecting||!G.result||!G.moves.length||G.lessons)return;
  reflecting=true;G.lessons={};const gid=G.id;
  for(const s of["r","b"]){
    if(G.id!==gid)break;
    status=`賽後檢討：${PLAYER[s]}（${s==="r"?G.red:G.black}）整理心得中…`;liveSide=s;live="";
    const p=`你剛下完一盤中國象棋，你執${PLAYER[s]}。結果：${G.result.w?PLAYER[G.result.w]+"勝":"和局"}（${G.result.why}）。
這是純粹的檢討任務：不要讀寫檔案、不要執行任何指令。
棋譜：${record()}

請檢討這盤棋，寫出 3 到 5 條具體、下一盤用得上的心得（例如開局選擇、哪一步是敗著或好棋、對手的習慣）。每條不超過 60 字。
最後只輸出一行 JSON，不要其他文字：{"lessons":["…","…"]}`;
    try{const txt=await(s==="r"?askRed:askBlack)(p);
      const js=[...txt.matchAll(/\{\s*"lessons"\s*:\s*\[[\s\S]*?\]\s*\}/g)].map(x=>x[0]).pop();
      const arr=js?JSON.parse(js).lessons:null;
      if(Array.isArray(arr)&&G.id===gid)G.lessons[s]=arr.map(String).slice(0,5);else console.error(`${PLAYER[s]}沒有給出可讀的心得`)}
    catch(e){console.error(`${PLAYER[s]}賽後檢討失敗：${e.message.slice(0,200)}`)}}
  if(G.id===gid){liveSide=null;archive();status=`對局結束：${G.result.w?PLAYER[G.result.w]+"勝":"和局"}（${G.result.why}）。賽後心得已存入經驗庫。`;
    console.log("賽後心得已存入經驗庫：\n"+JSON.stringify(G.lessons,null,1))}
  reflecting=false}

// ---------- 棋譜資料庫 ----------
function annotate(it){
  const byId=new Map(it.lines.map(l=>[l.id,l])),raw=new Map(it.lines.map(l=>[l.id,l.moves.map(m=>Array.isArray(m)?m:[m.f,m.t])]));
  const seq=(id,ply)=>{const l=byId.get(id);if(!l)return[];if(ply<l.start)return l.parent==null?[]:seq(l.parent,ply);
    return(l.parent==null?[]:seq(l.parent,l.start-1)).concat(raw.get(id).slice(0,ply-l.start+1))};
  for(const l of it.lines){let b=it.board.slice();
    if(l.parent!=null)for(const[f,t]of seq(l.parent,l.start-1))b=make(b,f,t);
    l.moves=raw.get(l.id).map(([f,t])=>{let cn="?";try{if(b[f])cn=notate(b,f,t)}catch(e){}b=make(b,f,t);return{f,t,cn}})}
  return it}
const BOOKCACHE={};
function bookList(){try{return JSON.parse(fs.readFileSync(path.join(DB,"books.json"),"utf8"))}catch(e){return[]}}
function loadBook(key){
  if(BOOKCACHE[key])return BOOKCACHE[key];
  const b=bookList().find(x=>x.key===key);if(!b)return null;
  try{const d=JSON.parse(fs.readFileSync(path.join(DB,key+".json"),"utf8"));d.byId=new Map(d.items.map(x=>[x.id,x]));return BOOKCACHE[key]=d}
  catch(e){return{name:b.name,items:[],error:`讀不到 ${key}.json，請執行 node xiangqi-db/tools/fetch-books.js ${key}`}}}
// 清單只送摘要；點開某一局才送完整棋譜（特級大師對局有幾萬局）
const summary=it=>({id:it.id,no:it.no,label:it.label,part:it.part,title:it.title||(it.red&&it.black?it.red+" 對 "+it.black:""),name:it.name,result:it.result,
  type:it.type,red:it.red,black:it.black,event:it.event,year:it.year,date:it.date,open:it.open});
function fullItem(it){if(!it.board)it.board=parseFen(START);if(!it._an){annotate(it);Object.defineProperty(it,"_an",{value:true})}return it}
function gameItem(g,isLive){
  /* 意見回饋 594：石桌往事有些關從中局開始（g.start＝起始局面、g.startTurn＝誰先走），也要存進對局、算進我的成長 */
  /* ChatGPT 數值盤查 11/11 P1：棋步多帶 bmt、pmt（殺棋訊號，見 classifyRaw），賽後講解才分得出「真的有殺」還是「只是大優」；這個檔裡其他存檔、moveOut 也一起帶 */
  const b0=()=>{try{return g.start?parseFen(g.start):parseFen(START)}catch(e){return parseFen(START)}};const t0=g.startTurn==="b"?1:0;
  let b=b0();const moves=g.moves.map((m,i)=>{const cn=notate(b,m.f,m.t);b=make(b,m.f,m.t);return{f:m.f,t:m.t,cn,q:m.q,loss:m.loss,ev:m.ev,bmt:m.bmt,pmt:m.pmt,rr:m.rr,bc:m.bc,bm:m.bm,bp:m.bp,by:m.by||((i+t0)%2?"b":"r")}});
  const comments={};g.moves.forEach((m,i)=>{if(m.cm)comments["0_"+(i+1)]=PLAYER[m.by]+"："+m.cm});
  return{id:g.id||"current",title:`${g.red} 對 ${g.black}`,red:g.red,black:g.black,year:+String(g.date||g.id||"").slice(0,4)||null,name:(isLive?"【進行中】":"")+(g.date||String(g.id||"").slice(0,10))+"　"+g.red+" 對 "+g.black,
    result:isLive||!g.result?"進行中":(g.result.w?PLAYER[g.result.w]+"勝":"和局")+"（"+g.result.why+"）",
    board:b0(),...(g.start?{start:g.start,startTurn:g.startTurn||"r",mid:1}:{}),...(g.journey?{journey:g.journey}:{}),lines:[{id:0,parent:null,start:1,moves}],comments,lessons:g.lessons||null}}
function aiItems(){
  const out=history().filter(g=>g.result).map(g=>gameItem(g,false));
  if(G.moves.length&&!out.some(x=>x.id===G.id))out.push(gameItem(G,!G.result));
  return out.reverse()}

// ---------- 呼叫 CLI ----------
const WIN=process.platform==="win32";
const q=s=>WIN&&/[\s"&|<>^]/.test(s)?'"'+s.replace(/"/g,'\\"')+'"':s;
// track=false：給分析講解用，不影響對局中的 child 與「思考中」畫面
function run(cmd,args,input,track=true){return new Promise((res,rej)=>{
  let p;try{p=spawn(cmd,WIN?args.map(q):args,{shell:WIN,cwd:WORK,env:process.env})}catch(e){return rej(new Error(`無法執行 ${cmd}：${e.message}`))}
  if(track)child=p;let out="",err="";
  const feed=d=>{if(!track)return;live+=d;if(live.length>6000)live=live.slice(-6000)};
  p.stdout.on("data",d=>{out+=d;feed(d)});p.stderr.on("data",d=>{err+=d;feed(d)});
  const to=setTimeout(()=>{try{p.kill()}catch(e){}},CFG.timeoutMin*60000);
  p.on("error",e=>{clearTimeout(to);if(track)child=null;rej(new Error(e.code==="ENOENT"?`找不到指令「${cmd}」，請確認已安裝並在 PATH 中。`:`${cmd} 執行錯誤：${e.message}`))});
  p.on("close",code=>{clearTimeout(to);if(track)child=null;if(code===0)res(out);else rej(new Error(`${cmd} 結束碼 ${code}。${(err||out).trim().slice(-600)}`))});
  p.stdin.on("error",()=>{});p.stdin.end(input)})}
async function askRed(prompt,track=true){
  const outFile=path.join(WORK,"red-"+Date.now()+"-"+Math.random().toString(36).slice(2,8)+".txt");
  const args=["exec","--skip-git-repo-check","--sandbox","read-only","--color","never"];
  if(CFG.redModel)args.push("-m",CFG.redModel);
  if(CFG.effort)args.push("-c","model_reasoning_effort="+CFG.effort);
  args.push("-o",outFile,"-");
  const out=await run("codex",args,prompt,track);
  try{const t=fs.readFileSync(outFile,"utf8");fs.unlinkSync(outFile);return t}catch(e){return out}}
async function askBlack(prompt,track=true){
  const args=["-p","--output-format","text"];
  if(CFG.blackModel)args.push("--model",CFG.blackModel);
  return run("claude",args,prompt,track)}

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function loop(){
  for(;;){
    if(!running||G.result){await sleep(300);continue}
    const s=turn;let err="",done=false;
    for(let attempt=1;attempt<=3&&running&&!G.result;attempt++){
      liveSide=s;live="";status=`${PLAYER[s]}（${s==="r"?G.red:G.black}）思考中，第 ${attempt}/3 次機會…`;
      let txt;
      try{txt=await(s==="r"?askRed:askBlack)(buildPrompt(s,err))}
      catch(e){if(!running||G.result)break;running=false;status="⚠ "+e.message+" 對局已暫停，修正後在網頁按「繼續」。";console.error(status);break}
      if(!running||G.result||turn!==s)break;
      const r=parseReply(txt,s);
      if(r.mv){applyMove(r.mv[0],r.mv[1],r.cm);done=true;break}
      err=`你上一次的回覆「${r.bad}」不是合法著法。請務必從合法著法清單中選一步，並依格式輸出。`;
      console.log(`  ${PLAYER[s]}給出不合法回覆（${r.bad}），第 ${attempt} 次`)}
    liveSide=null;
    if(!done&&running&&!G.result)end(opp(s),`${PLAYER[s]}連續三次未給出合法著法，判負`);
    if(!G.result&&running)status=`輪到${PLAYER[turn]}`;
  }}
let last=Date.now();
setInterval(()=>{const now=Date.now(),dt=now-last;last=now;
  if(running&&!G.result&&CFG.clock){G.clocks[turn]-=dt;if(G.clocks[turn]<=0){G.clocks[turn]=0;end(opp(turn),`${PLAYER[turn]}超時判負`)}}},250);

// ---------- 人機對戰（Pikafish） ----------
const PLAYDIR=path.join(DB,"play-games"),PLAYREC=path.join(DB,"play-record.json"),PLAYSTATE=path.join(DB,"play-current.json");
const LEVELS=[
// 「深度」= 引擎往後算幾步（紅黑各走一次算 2 步）
  {n:1,name:"入門",desc:"只算自己這 1 步，常常亂走",depth:1,multipv:10,margin:600},
  {n:2,name:"新手",desc:"往後算 2 步（1 回合），會漏子",depth:2,multipv:8,margin:300},
  {n:3,name:"業餘初段",desc:"往後算 4 步（2 回合），偶有失誤",depth:4,multipv:6,margin:150},
  {n:4,name:"業餘高段",desc:"往後算 6 步（3 回合），小失誤",depth:6,multipv:4,margin:70},
  {n:5,name:"棋協大師",desc:"往後算 9 步（約 4～5 回合），很少失誤",depth:9,multipv:3,margin:30},
  {n:6,name:"特級大師",desc:"每步想 0.5 秒（約算 15～20 步），不放水",movetime:500},
  {n:7,name:"職業頂尖",desc:"每步想 2 秒（約算 20～25 步）",movetime:2000},
  {n:8,name:"全力",desc:"每步想 6 秒（約算 25 步以上），人類幾乎贏不了",movetime:6000}];
const ENGDIR=path.join(DB,"engine");
const ENGEXE=path.join(ENGDIR,WIN?"Pikafish-Windows-x86-64-universal.exe":process.platform==="darwin"?"Pikafish-MacOS-universal":"Pikafish-Linux-x86-64-universal");
let eng=null;
function engine(){
  if(eng)return eng;
  if(!fs.existsSync(ENGEXE))throw new Error("找不到 Pikafish 引擎："+ENGEXE);
  const p=spawn(ENGEXE,[],{cwd:ENGDIR});
  let buf="",waiters=[];
  p.stdout.on("data",d=>{buf+=d;let i;while((i=buf.indexOf("\n"))>=0){const line=buf.slice(0,i).trim();buf=buf.slice(i+1);for(const w of waiters.slice())w(line)}});
  p.on("exit",()=>{if(eng&&eng.p===p)eng=null});p.on("error",e=>console.error("Pikafish 無法啟動：",e.message));
  p.stdin.on("error",()=>{});
  const send=s=>p.stdin.write(s+"\n");
  const until=(pred,onLine)=>new Promise(res=>{const w=line=>{if(onLine)onLine(line);if(pred(line)){waiters=waiters.filter(x=>x!==w);res(line)}};waiters.push(w)});
  const ready=(async()=>{send("uci");await until(l=>l==="uciok");
    send("setoption name Threads value "+Math.max(1,Math.min(4,os.cpus().length-2)));send("setoption name Hash value 128");
    send("isready");await until(l=>l==="readyok")})();
  let q=Promise.resolve();
  // pos：{moves:[ICCS…]}（從開局起算，引擎知道重複局面）或 {fen:"<棋盤> w|b"}（任意局面）
  eng={p,search(pos,lim,multipv){
    const job=async()=>{await ready;
      send("setoption name MultiPV value "+(multipv||1));
      send(pos.fen?"position fen "+pos.fen+" - - 0 1":"position fen "+START+" w - - 0 1"+(pos.moves.length?" moves "+pos.moves.join(" "):""));
      const info=new Map();
      send(lim.movetime?"go movetime "+lim.movetime:"go depth "+lim.depth);
      const best=await until(l=>l.startsWith("bestmove"),l=>{if(!l.startsWith("info ")||!l.includes(" pv "))return;
        const m=l.match(/ multipv (\d+)/),sc=l.match(/ score (cp|mate) (-?\d+)/),pv=l.match(/ pv (.+)$/),dp=l.match(/ depth (\d+)/);if(!sc||!pv)return;
        let v=+sc[2];if(sc[1]==="mate")v=v>0?30000-v:-30000-v;
        const pvs=pv[1].trim().split(/\s+/);
        info.set(m?+m[1]:1,{k:m?+m[1]:1,v,mv:pvs[0],pv:pvs,depth:dp?+dp[1]:null,mate:sc[1]==="mate"?+sc[2]:null})});
      return{best:best.split(/\s+/)[1],lines:[...info.values()].sort((a,b)=>a.k-b.k),nopv:!info.size}};   /* ChatGPT 數值盤查 11/11 P1：nopv＝這次搜尋一條帶 PV 的 info 都沒收到（lines 是空的），classifyRaw 不能拿它當評分，要重試；跟 src/engine.js 同一個欄位 */
    const r=q.then(job);q=r.catch(()=>{});return r}};
  return eng}

let P=null,playBusy=false,playMsg="";
function playNew(human,level){P={id:gameId(),human,level,moves:[],result:null,eval:null,hint:null};playRebuild();playSave()}
function playRebuild(){stateRebuild(P)}
function playSave(){try{fs.mkdirSync(DB,{recursive:true});
  fs.writeFileSync(PLAYSTATE,JSON.stringify({id:P.id,human:P.human,level:P.level,result:P.result,moves:P.moves.map(m=>({f:m.f,t:m.t,by:m.by,q:m.q,loss:m.loss,ev:m.ev,bmt:m.bmt,pmt:m.pmt,rr:m.rr,bc:m.bc,bm:m.bm,bp:m.bp}))}))}catch(e){}}
function ensureP(){if(P)return;try{P=JSON.parse(fs.readFileSync(PLAYSTATE,"utf8"));P.hint=null;playRebuild()}catch(e){playNew("r",3)}setImmediate(playEngine)}
function playRecord(){try{return JSON.parse(fs.readFileSync(PLAYREC,"utf8"))}catch(e){return{}}}
function playApply(f,t){stateApply(P,f,t);P.hint=null;playJudge();playSave();setImmediate(analyzePlay)}
// 人機對戰、真人對戰共用的走子與裁判（S 有 board、turn、pos、moves）
function stateApply(S,f,t){
  S.repetition=null;const mover=S.turn,chB=chasePairs(S.board,mover);
  const m={f,t,by:mover};m.cn=notate(S.board,f,t);m.cap=S.board[t];
  S.board=make(S.board,f,t);S.turn=opp(S.turn);S.pos.push(fen(S.board,S.turn));m.ck=inCheck(S.board,S.turn);
  m.ch=[...chasePairs(S.board,mover)].some(x=>!chB.has(x));
  S.moves.push(m);return m}
// 從頭重放（載入存檔或悔棋後），保留已算好的評等
function stateRebuild(S){const old=S.moves||[];S.moves=[];S.board=parseFen(S.start||START);S.turn=S.startTurn||"r";S.pos=[fen(S.board,S.turn)];
  for(const o of old){const m=stateApply(S,o.f,o.t);for(const k of["q","loss","ev","bv","bmt","pmt","rr","bc","bm","bp"])if(o[k]!==undefined)m[k]=o[k]}S.repetition=rulesetVerdict(repetitionVerdict(S),S)}   /* bv：開發者 11/11 影子模式，見 classifyRaw；bmt、pmt：ChatGPT 數值盤查 11/11 殺棋訊號（走方視角），見 classifyRaw */
function judgeState(S){
  const n=S.moves.length;S.repetition=null;if(!n)return null;
  const mover=S.moves[n-1].by,other=opp(mover);
  if(legal(S.board,other).length===0)return{w:mover,why:inCheck(S.board,other)?"將死":"困斃"};
  // 長將／長捉先於自然限著，不能以未吃子和局覆蓋違例。
  const tw=S.rc&&S.rc.rulesetId==="tw113",rep=tw?twRepetitionVerdict(S):rulesetVerdict(repetitionVerdict(S),S);S.repetition=rep;   /* 臺灣棋規正式版另一套循環裁判（第 4 次出現才判） */   /* rulesetVerdict：依這盤的棋規（S.rc）調整；沒有 rc＝千秋休閒規則，原樣 */
  if(rep){if(rep.pending)return null;return{w:rep.w,why:rep.why,adjudication:rep}}
  if(!hasAttackers(S.board,"r")&&!hasAttackers(S.board,"b"))return{w:null,why:"雙方均無進攻子力"};
  let since=0;for(let i=n-1;i>=0;i--){if(S.moves[i].cap)break;since++}
  if(tw&&since>=100)return{w:null,why:"臺灣棋規：自然限著，雙方共走 100 著未吃子，判和（第三章第四節；App 代替裁判審查）"};
  if(since>=120)return{w:null,why:"遊戲自然限著：60 回合未吃子"};
  return null}
function playJudge(){const r=judgeState(P);if(r)playEnd(r.w,r.why)}
function playEnd(w,why){
  P.result={w,why,...(P.repetition&&!P.repetition.pending?{adjudication:P.repetition}:{})};
  const rec=playRecord(),L=rec[P.level]||(rec[P.level]={w:0,l:0,d:0});
  if(!w)L.d++;else if(w===P.human)L.w++;else L.l++;
  try{fs.writeFileSync(PLAYREC,JSON.stringify(rec,null,1));fs.mkdirSync(PLAYDIR,{recursive:true});
    fs.writeFileSync(path.join(PLAYDIR,P.id+".json"),JSON.stringify({id:P.id,date:P.id.slice(0,10),level:P.level,human:P.human,result:P.result,
      moves:P.moves.map(m=>({f:m.f,t:m.t,by:m.by,q:m.q,loss:m.loss,ev:m.ev,bmt:m.bmt,pmt:m.pmt,rr:m.rr,bc:m.bc,bm:m.bm,bp:m.bp}))},null,1))}
  catch(e){console.error("人機對局存檔失敗",e.message)}
  playSave()}
const ucis=()=>P.moves.map(m=>iccs(m.f,m.t));
// 低等級：在「跟最佳著法差距不到 margin 分」的候選裡隨機挑一步
function pickMove(r,lv){
  if(!lv.margin||r.lines.length<2)return r.best;
  const top=r.lines[0].v,c=r.lines.filter(x=>x.v>=top-lv.margin);
  return c[Math.floor(Math.random()*c.length)].mv}
async function playEngine(){
  if(!P||P.result||P.turn===P.human||playBusy)return;
  playBusy=true;const id=P.id,n=P.moves.length,lv=LEVELS[P.level-1]||LEVELS[2];
  try{const r=await engine().search({moves:ucis()},lv.movetime?{movetime:lv.movetime}:{depth:lv.depth},lv.multipv||1);
    if(!P||P.id!==id||P.moves.length!==n||P.result)return;
    const mv=pickMove(r,lv),f=parseSq(mv.slice(0,2)),t=parseSq(mv.slice(2,4));
    if(!legal(P.board,P.turn).some(([a,b])=>a===f&&b===t))throw new Error("引擎給出不合法著法 "+mv);
    playApply(f,t);playMsg=""}
  catch(e){playMsg="⚠ "+e.message;console.error("Pikafish：",e.message)}
  finally{playBusy=false;setImmediate(playEngine)}}
async function playHint(){
  const r=await engine().search({moves:ucis()},{movetime:1500},1),f=parseSq(r.best.slice(0,2)),t=parseSq(r.best.slice(2,4));
  P.hint={f,t,cn:notate(P.board,f,t)};return P.hint}
function playUndo(){
  if(playBusy)throw new Error("引擎思考中，等它走完再悔棋");
  if(!P.moves.length)return;
  while(P.moves.length){const m=P.moves.pop();if(m.by===P.human)break}
  P.result=null;P.hint=null;playRebuild();playSave();setImmediate(playEngine)}
function playState(){ensureP();
  return{rules:REP_RULES,repetition:P.repetition||null,board:P.board,turn:P.turn,human:P.human,level:P.level,levels:LEVELS.map(l=>({n:l.n,name:l.name,desc:l.desc})),record:playRecord(),
    moves:P.moves.map(moveOut),result:P.result,thinking:playBusy&&P.turn!==P.human,msg:playMsg,eval:lastEv(P.moves),hint:P.hint,
    legal:!P.result&&P.turn===P.human?legal(P.board,P.turn):[],check:!P.result&&inCheck(P.board,P.turn)?kingSq(P.board,P.turn):-1,engine:fs.existsSync(ENGEXE)}}
function playItems(){
  let files=[];try{files=fs.readdirSync(PLAYDIR).filter(f=>f.endsWith(".json")).sort().reverse()}catch(e){}
  return files.map(f=>{try{const g=JSON.parse(fs.readFileSync(path.join(PLAYDIR,f),"utf8")),lv=LEVELS[g.level-1]||{name:"?"},bot="Pikafish 第"+g.level+"級「"+lv.name+"」";
    return gameItem({...g,red:g.human==="r"?"你":bot,black:g.human==="b"?"你":bot},false)}catch(e){return null}}).filter(Boolean)}

// ---------- 真人對戰（同一台電腦輪流走，或開兩個視窗同步） ----------
const PVPDIR=path.join(DB,"pvp-games"),PVPSTATE=path.join(DB,"pvp-current.json");
const TCS={"10+5":{min:10,inc:5},"20+10":{min:20,inc:10},"60+30":{min:60,inc:30}};
let V=null;
const nameOf=(s,d)=>String(s||"").replace(/[<>]/g,"").trim().slice(0,20)||d;
function pvpNew(o){const tc=TCS[o.tc]||null;
  V={id:gameId(),red:nameOf(o.red,"紅方"),black:nameOf(o.black,"黑方"),tcKey:tc?o.tc:"none",tc,clocks:tc?{r:tc.min*60000,b:tc.min*60000}:null,tick:null,draw:null,moves:[],result:null};
  stateRebuild(V);pvpSave()}
function pvpSave(){try{fs.mkdirSync(DB,{recursive:true});
  fs.writeFileSync(PVPSTATE,JSON.stringify({id:V.id,red:V.red,black:V.black,tcKey:V.tcKey,tc:V.tc,clocks:V.clocks,result:V.result,
    moves:V.moves.map(m=>({f:m.f,t:m.t,by:m.by,q:m.q,loss:m.loss,ev:m.ev,bmt:m.bmt,pmt:m.pmt,rr:m.rr,bc:m.bc,bm:m.bm,bp:m.bp}))}))}catch(e){}}
function ensureV(){if(V)return;try{V=JSON.parse(fs.readFileSync(PVPSTATE,"utf8"));V.tick=null;V.draw=null;stateRebuild(V)}catch(e){pvpNew({})}}
// 計時：紅方走完第一步後才開始；V.tick 是輪走方開始思考的時間（重開程式後暫停，下一步走完再繼續）
const pvpLeft=s=>!V.clocks?null:V.clocks[s]-(V.tick!=null&&V.turn===s&&!V.result?Date.now()-V.tick:0);
function pvpClock(){if(!V||!V.tc||V.result||V.tick==null)return;if(pvpLeft(V.turn)<=0){V.clocks[V.turn]=0;const s=V.turn;V.tick=null;pvpEnd(opp(s),PLAYER[s]+"超時判負")}}
setInterval(pvpClock,250);
function pvpMove(f,t){
  if(V.tc&&V.tick!=null){V.clocks[V.turn]=pvpLeft(V.turn)+V.tc.inc*1000}
  stateApply(V,f,t);V.draw=null;V.tick=V.tc?Date.now():null;
  const r=judgeState(V);if(r)pvpEnd(r.w,r.why);pvpSave();setImmediate(analyzePvp)}
function pvpEnd(w,why){
  if(V.tick!=null&&V.clocks)V.clocks[V.turn]=Math.max(0,pvpLeft(V.turn));
  V.result={w,why,...(V.repetition&&!V.repetition.pending?{adjudication:V.repetition}:{})};V.tick=null;V.draw=null;
  try{fs.mkdirSync(PVPDIR,{recursive:true});fs.writeFileSync(path.join(PVPDIR,V.id+".json"),JSON.stringify({id:V.id,date:V.id.slice(0,10),red:V.red,black:V.black,tc:V.tcKey,result:V.result,
    moves:V.moves.map(m=>({f:m.f,t:m.t,by:m.by,q:m.q,loss:m.loss,ev:m.ev,bmt:m.bmt,pmt:m.pmt,rr:m.rr,bc:m.bc,bm:m.bm,bp:m.bp}))},null,1))}catch(e){console.error("真人對局存檔失敗",e.message)}
  pvpSave()}
// 連線對戰：每支手機定時回報自己坐哪一方，10 秒內有回報就算在線
const PVP_SEEN={r:0,b:0},PVP_WHO={r:"",b:""};
// ---------- 誰連進來：手機每個請求都帶 x-xq-dev（裝置代號，隨機產生）和 x-xq-name（使用者自取的名字） ----------
const CLIENTS=new Map();
function devKind(ua){ua=String(ua||"");return/iPad/.test(ua)?"iPad":/iPhone/.test(ua)?"iPhone":/Android/.test(ua)?"Android":/Windows/.test(ua)?"Windows":/Mac OS/.test(ua)?"Mac":"其他"}
function clientIp(req){return String(req.headers["cf-connecting-ip"]||req.socket.remoteAddress||"").replace(/^::ffff:/,"")}
function seeClient(req){const dev=String(req.headers["x-xq-dev"]||"");if(!/^[A-Za-z0-9_-]{6,40}$/.test(dev))return null;
  let name="";try{name=decodeURIComponent(String(req.headers["x-xq-name"]||"")).replace(/[\u0000-\u001f<>]/g,"").trim().slice(0,16)}catch(e){}
  const now=Date.now(),ip=clientIp(req),old=CLIENTS.get(dev),c=old||{dev,first:now,n:0};
  const fresh=!old||now-old.last>10*60000,renamed=old&&name&&old.name&&old.name!==name;
  Object.assign(c,{name:name||c.name||"",ip,kind:(dev.match(/-(iPhone|iPad|Android|Windows|Mac)$/)||[])[1]||devKind(req.headers["user-agent"]),via:req.headers["cf-ray"]?"通道":isLocal(req)?"本機":"區網",last:now});c.n++;CLIENTS.set(dev,c);
  if(fresh)console.log(`👤 ${c.name||"（還沒取名）"} 連進來了：${c.kind}，IP ${ip}（${c.via}）`);
  else if(renamed)console.log(`👤 ${old.name} 改名為 ${name}`);
  return c}
function clientList(){const now=Date.now();return[...CLIENTS.values()].filter(c=>now-c.last<5*60000).sort((a,b)=>b.last-a.last)
  .map(c=>({name:c.name||"（未取名）",ip:c.ip,kind:c.kind,via:c.via,first:c.first,last:c.last,ago:Math.round((now-c.last)/1000),dev:c.dev.slice(0,4)}))}
// 連線對戰的表情訊息（只留最近 20 則、1 分鐘內的）
let PVP_EMO=[],pvpEmoN=0;
const pvpOnline=()=>({r:Date.now()-PVP_SEEN.r<10000,b:Date.now()-PVP_SEEN.b<10000});
function pvpUndo(seat){
  if(V.result)throw new Error("這局已經結束，不能悔棋");if(!V.moves.length)return;
  // 連線對戰：只能收回自己剛走的那步（對方還沒走之前）
  if(seat&&V.moves[V.moves.length-1].by!==seat)throw new Error("對方已經走了，不能悔棋");
  if(V.tc&&V.tick!=null)V.clocks[V.turn]=pvpLeft(V.turn);
  V.moves.pop();stateRebuild(V);V.draw=null;V.tick=V.tc&&V.moves.length?Date.now():null;pvpSave()}
function pvpState(){ensureV();
  return{rules:REP_RULES,repetition:V.repetition||null,id:V.id,red:V.red,black:V.black,board:V.board,turn:V.turn,moves:V.moves.map(moveOut),result:V.result,draw:V.draw,tcKey:V.tcKey,
    clocks:V.clocks?{r:pvpLeft("r"),b:pvpLeft("b")}:null,running:V.tick!=null,
    legal:V.result?[]:legal(V.board,V.turn),check:!V.result&&inCheck(V.board,V.turn)?kingSq(V.board,V.turn):-1,eval:lastEv(V.moves),engine:fs.existsSync(ENGEXE),online:pvpOnline(),who:PVP_WHO,emotes:PVP_EMO.filter(x=>Date.now()-x.at<60000)}}
function pvpItems(){
  let files=[];try{files=fs.readdirSync(PVPDIR).filter(f=>f.endsWith(".json")).sort().reverse()}catch(e){}
  return files.map(f=>{try{return gameItem(JSON.parse(fs.readFileSync(path.join(PVPDIR,f),"utf8")),false)}catch(e){return null}}).filter(Boolean)}

// ---------- 引擎分析：優勢評估與每步評等 ----------
// 評等依「這步比引擎最佳著法少了多少分」（1 分 = 0.01 兵，走方視角）：
//   妙著：就是引擎最佳著法，而且第二好的著法差 150 分以上（只有這步最好）
//   正著：引擎最佳著法，或跟最佳著法差不到 10 分
//   穩著：差 10～40 分　緩著：差 40～100 分　失著：差 100～300 分　敗著：差 300 分以上
const ANALYZE_MS=400;
const clampV=v=>Math.max(-2000,Math.min(2000,v));const gradeLoss=l=>l<30?"正著":l<=60?"穩著":l<=150?"緩著":l<=400?"失著":"敗著";   /* 開發者 11/6（第二裁判：同一個 Pikafish 深算 2258 步對照）：手機只算 0.4 秒，分數本身就會跳 20～30 分，舊的 10／40／100／300 分界線比雜訊還細；放寬成 30／60／150／400，跟深算的一致率 83%→90% */const qName=q=>({"妙手":"妙著","正手":"正著","優著":"穩著","良著":"緩著","錯著":"失著","露著":"敗著"})[q]||q;   /* 開發者 11/6（意見回饋 659）：評語改用傳統棋評用語；舊存檔、舊快取裡的舊名字讀取時翻成新的 */
const fenOf=(b,s)=>fen(b,s);
async function evalPos(b,s,ms,multipv){
  if(!legal(b,s).length)return{lines:[],dead:true};
  return engine().search({fen:fenOf(b,s)},{movetime:ms||ANALYZE_MS},multipv||1)}
// ---- 分析快取：依「局面＋著法」記住評等、依局面記住引擎分析，下次直接拿，不用重算 ----
const ANCACHE_FILE=path.join(DB,"analysis-cache.json");
let ANC=null,ancTimer=null;
function anc(){if(!ANC){try{ANC=JSON.parse(fs.readFileSync(ANCACHE_FILE,"utf8"))}catch(e){ANC={}}ANC.grade=ANC.grade||{};ANC.engine=ANC.engine||{}}return ANC}
function ancSave(){clearTimeout(ancTimer);ancTimer=setTimeout(()=>{try{fs.mkdirSync(DB,{recursive:true});fs.writeFileSync(ANCACHE_FILE+".tmp",JSON.stringify(ANC));fs.renameSync(ANCACHE_FILE+".tmp",ANCACHE_FILE)}catch(e){console.error("分析快取存檔失敗",e.message)}},1500)}
/* ChatGPT 數值盤查 11/11 P1 引擎空結果（舊快取）：舊版第二次查詢缺 PV 時會把「不是最佳著、loss＝0」寫成正著。這種快取分不出是真的零損失還是舊的回退值，
   所以不整批清掉，只把「不是最佳著、loss＝0、又沒有新版 bmt 欄位」的那筆當成可疑、重評一次（重評失敗就照舊用快取，不會比原本差） */
const gradeSuspect=(c,f,t)=>!!c&&c.loss===0&&!!c.bm&&c.bm!==iccs(f,t)&&c.bmt===undefined;
async function classify(b,s,f,t){
  const k=fenOf(b,s)+"|"+iccs(f,t),c=anc().grade[k];if(c&&!gradeSuspect(c,f,t))return c;
  let r;try{r=await classifyRaw(b,s,f,t)}catch(e){if(c)return c;throw e}
  if(r){ANC.grade[k]=r;ancSave()}return r||c||null}
async function classifyRaw(b,s,f,t,ms,lt){   /* lt：對方上一步落在哪一格（判斷「回吃」，可省略） */
  let r=await evalPos(b,s,ms,2);if(r.dead)return null;
  /* ChatGPT 數值盤查 11/11 P1 引擎空結果（第一查）：走之前的局面不是終局、卻一條 PV 都沒有時，舊版回 null，analyzeList 就把這步寫成「—」、之後永遠不再評。
     比照第二查：先用兩倍時間重查一次，還是空就丟可重試的錯誤（e.retry），這步保持「未評」（tools/test-clock-pv.js 驗收） */
  if(!(r.lines&&r.lines.length))r=await evalPos(b,s,(ms||ANALYZE_MS)*2,2);
  if(r.dead)return null;
  if(!(r.lines&&r.lines.length)){const e=new Error("Pikafish 沒有算出這個局面（缺 PV），這步先不評，稍後自動再評");e.retry=true;e.code="XQ_NO_PV";throw e}
  const best=r.lines[0],second=r.lines[1],mv=iccs(f,t);
  /* ChatGPT 評審 11/11（失著的具體後果）：第二查（走完這步的局面）引擎給對方的最佳回應 l，用規則算出它吃不吃子、將不將軍，存成 rr，賽後才說得出「這手讓對方下一手可以吃你的車」。
     rr＝{m 對方最佳回應 ICCS, c 中文記譜, x 吃到走方的哪顆子（棋盤字元，沒吃子＝null）, k 這手是不是將軍走方, mt 對方幾步內將死走方（沒有＝null）}；
     走的就是最佳著、走完就終局、或引擎給的著法在規則上不合法＝null（不猜）；舊存檔、舊快取沒有 rr（undefined） */
  const reply=(a,os,l)=>{try{const u=l&&l.mv;if(!/^[a-i]\d[a-i]\d$/.test(u||""))return null;const rf=parseSq(u.slice(0,2)),rt=parseSq(u.slice(2,4));
    if(!legal(a,os).some(([x,y])=>x===rf&&y===rt))return null;const x=a[rt]&&sideOf(a[rt])===s?a[rt]:null;
    return{m:u,c:notate(a,rf,rt),x,k:inCheck(make(a,rf,rt),s),mt:l.mate!=null&&l.mate>0?l.mate:null}}catch(e){return null}};
  let played,pmt,rr=null;
  if(best.mv===mv){played=best.v;pmt=best.mate}
  else{const after=make(b,f,t);let r2=await evalPos(after,opp(s),ms,1);
    /* ChatGPT 數值盤查 11/11 P1 引擎空結果：第二次查詢（走完這步的局面）不是終局、卻沒有任何 PV（lines 空）時，舊版拿最佳著的分數頂替，
       變成「正著、loss＝0、ev＝最佳分」。改成：先用兩倍時間重查一次；還是沒有 PV 就丟出可重試的錯誤（e.retry），這步保持「未評」，下次分析再補。
       真正沒有合法著的終局（r2.dead）照原本分支：走這步的一方把對方將死或困斃＝30000 */
    if(!r2.dead&&!(r2.lines&&r2.lines.length))r2=await evalPos(after,opp(s),(ms||ANALYZE_MS)*2,1);
    if(r2.dead){played=30000;pmt=1}
    else if(r2.lines&&r2.lines.length){played=-r2.lines[0].v;const m2=r2.lines[0].mate;pmt=m2==null?null:m2<0?1-m2:-m2;rr=reply(after,opp(s),r2.lines[0])}
    else{const e=new Error("Pikafish 沒有算出這步走完的局面（缺 PV），這步先不評，稍後自動再評");e.retry=true;e.code="XQ_NO_PV";throw e}}
  const loss=Math.max(0,clampV(best.v)-clampV(played)),gap=second?clampV(best.v)-clampV(second.v):0;
  let q;
  if(best.mv===mv)q=gap>=200&&Math.abs(best.v)<1500&&!inCheck(b,s)&&!(b[t]&&lt===t)?"妙著":"正著";   /* 妙著：唯一好棋差距 200 分以上，而且不是應將、不是被迫回吃 */
  else q=gradeLoss(loss);
  const bf=parseSq(best.mv.slice(0,2)),bt=parseSq(best.mv.slice(2,4));
  /* 開發者 11/11 照三方審查（影子模式）：多回傳 bv＝最佳著法評估的原值（紅方視角、沒夾 ±2000），q、loss 完全照舊。
     loss 是兩邊都夾到 ±2000 才相減，最佳著法若是殺棋（±29990 左右）原值會不見——新算法判「漏殺」、匿名對局資料校正殺棋分界要用原值 */
  /* ChatGPT 數值盤查 11/11 P1 優勢被報為殺棋：保留引擎的殺棋訊號，一律「走這步的一方」視角（跟 ev、bv 的紅方視角不同）：
     bmt＝最佳著法的殺棋步數（正＝走方 N 步殺對方、負＝走方被殺、null＝沒有殺棋）；pmt＝實際這步走完的殺棋步數（同樣正負；這步直接將死或困斃對方＝1）。
     新版一定有這兩個欄位（沒有殺棋就是 null），舊存檔、舊快取沒有（undefined）；q、loss、ev、bv 完全照舊 */
  return{q,loss,gap,ev:s==="r"?played:-played,bv:s==="r"?best.v:-best.v,bmt:best.mate==null?null:best.mate,pmt:pmt==null?null:pmt,rr,bc:notate(b,bf,bt),bm:best.mv,bp:(best.pv||[]).slice(0,3)}}   // bp：Pikafish 建議的前 3 步（賽後在棋盤上畫箭頭）
// 每一步評估後的紅方視角分數 → 給優勢條用
const evText=v=>v==null?"":Math.abs(v)>=20000?(v>0?"紅方":"黑方")+"有殺":Math.abs(v)<30?"均勢":(v>0?"紅方":"黑方")+"優 "+(Math.abs(v)/100).toFixed(1);
// 依序分析一盤棋裡還沒評等的步（moves[i] 是第 i 步，positions[i] 是走這步之前的 FEN）
async function analyzeList(getMoves,getPos,onDone){
  for(let i=0;;i++){const ms=getMoves();if(i>=ms.length)break;const m=ms[i];if(m.q)continue;
    const [bs,sd]=getPos(i).split(" ");let r;try{r=await classify(parseFen(bs),sd==="w"?"r":"b",m.f,m.t)}catch(e){if(e&&e.retry)continue;throw e}   /* ChatGPT 數值盤查 11/11 P1：缺 PV＝這步先留著未評（不寫「—」），往下評別步，下次分析再補 */
    if(getMoves()[i]!==m)return false;if(r)Object.assign(m,r);else m.q="—";onDone()}
  return true}
let anBusy=false,anAgain=false;
async function analyzeGame(){
  if(!fs.existsSync(ENGEXE))return;if(anBusy){anAgain=true;return}anBusy=true;
  try{do{anAgain=false;await analyzeList(()=>G.moves,i=>positions[i],save)}while(anAgain)}
  catch(e){console.error("對局分析失敗：",e.message)}finally{anBusy=false}}
let vaBusy=false,vaAgain=false;
async function analyzePvp(){
  if(!V||!fs.existsSync(ENGEXE))return;if(vaBusy){vaAgain=true;return}vaBusy=true;
  try{do{vaAgain=false;await analyzeList(()=>V.moves,i=>V.pos[i],pvpSave)}while(vaAgain)}
  catch(e){console.error("真人對局分析失敗：",e.message)}finally{vaBusy=false}}
let paBusy=false,paAgain=false;
async function analyzePlay(){
  if(!P||!fs.existsSync(ENGEXE))return;if(paBusy){paAgain=true;return}paBusy=true;
  try{do{paAgain=false;await analyzeList(()=>P.moves,i=>P.pos[i],playSave)}while(paAgain)}
  catch(e){console.error("人機對局分析失敗：",e.message)}finally{paBusy=false}}
const moveOut=m=>({f:m.f,t:m.t,by:m.by,cn:m.cn,ck:m.ck,q:m.q,loss:m.loss,ev:m.ev,bmt:m.bmt,pmt:m.pmt,rr:m.rr,bc:m.bc,bm:m.bm,bp:m.bp});
const lastEv=ms=>{for(let i=ms.length-1;i>=0;i--)if(ms[i].ev!=null)return{v:ms[i].ev,ply:i+1};return null};
// 任意局面（棋譜資料庫的自由走棋）
function checkBoard(b,s){
  if(!Array.isArray(b)||b.length!==90||!b.every(p=>p===null||/^[KABNRCPkabnrcp]$/.test(p)))throw new Error("棋盤資料不對");
  if(kingSq(b,"r")<0||kingSq(b,"b")<0)throw new Error("棋盤上要有帥和將");if(s!=="r"&&s!=="b")throw new Error("輪走方不對")}
// 把一串 ICCS 著法逐步走出來，每步標出「吃子、將軍、捉子、將死」：讓人看懂引擎的變化在埋什麼伏筆
function lineInfo(b,s,ucis){const out=[];let bd=b.slice(),sd=s;
  for(const u of(ucis||[]).slice(0,40)){const f=parseSq(String(u).slice(0,2)),t=parseSq(String(u).slice(2,4));
    if(!bd[f]||sideOf(bd[f])!==sd||!legal(bd,sd).some(([x,y])=>x===f&&y===t))break;
    const cn=notate(bd,f,t),cap=bd[t],before=chasePairs(bd,sd),nb=make(bd,f,t),tags=[],o=opp(sd);
    if(cap)tags.push("吃"+NAMES[sideOf(cap)][cap.toUpperCase()]);
    const ck=inCheck(nb,o);if(ck)tags.push("將軍");
    const chased=[...new Set([...chasePairs(nb,sd)].filter(x=>!before.has(x)).map(x=>+x.split(">")[1]))].map(q=>NAMES[sideOf(nb[q])][nb[q].toUpperCase()]);
    if(chased.length)tags.push("捉"+chased.join("、"));
    if(!legal(nb,o).length)tags.push(ck?"將死":"困斃");
    out.push({f,t,cn,by:sd,ck,tags});bd=nb;sd=o}
  return out}
// ---- 我的研究：把推演過的變化存成棋譜 ----
const STUDYDIR=path.join(DB,"study");
function studyItems(){let files=[];try{files=fs.readdirSync(STUDYDIR).filter(f=>f.endsWith(".json")).sort().reverse()}catch(e){}
  return files.map(f=>{try{const g=JSON.parse(fs.readFileSync(path.join(STUDYDIR,f),"utf8"));
    return fullItem({id:g.id,title:g.title,name:g.title,result:"研究",type:g.src||"",year:+String(g.id).slice(0,4)||null,
      board:g.board,lines:[{id:0,parent:null,start:1,moves:g.moves}],comments:g.comments||{}})}catch(e){return null}}).filter(Boolean)}
function studySave(b){checkBoard(b.board,b.side);
  const mv=(Array.isArray(b.moves)?b.moves:[]).slice(0,200).map(m=>[+m[0],+m[1]]);
  let bd=b.board.slice(),sd=b.side;for(const[f,t]of mv){if(!legal(bd,sd).some(([x,y])=>x===f&&y===t))throw new Error("變化裡有不合法的著法");bd=make(bd,f,t);sd=opp(sd)}
  if(!mv.length)throw new Error("沒有著法可以存");
  const id=gameId()+"-"+Math.random().toString(36).slice(2,6),comments={};
  for(const[k,v]of Object.entries(b.comments||{}))if(/^0_\d+$/.test(k))comments[k]=String(v).slice(0,500);
  fs.mkdirSync(STUDYDIR,{recursive:true});
  const g={id,title:String(b.title||"我的研究").slice(0,80),src:String(b.src||"").slice(0,120),board:b.board,moves:mv,comments};
  fs.writeFileSync(path.join(STUDYDIR,id+".json"),JSON.stringify(g,null,1));return{id}}
function pvText(b,s,pv){const out=[];let bb=b.slice();for(const u of pv.slice(0,30)){const f=parseSq(u.slice(0,2)),t=parseSq(u.slice(2,4));
  if(!bb[f]||!legal(bb,sideOf(bb[f])).some(([x,y])=>x===f&&y===t))break;out.push(notate(bb,f,t));bb=make(bb,f,t)}return out}
async function explain(b,s,who,lines,history){
  const lt=lines.map((l,i)=>`${i+1}. ${l.cn}（${evText(l.vr)}）變化：${l.pv.join(" ")}`).join("\n");
  const p=`你是中國象棋教練。請用繁體中文講解下面這個局面，給正在研究棋譜的學生看。
這是純粹的講解任務：不要讀寫檔案、不要執行任何指令。

輪到：${PLAYER[s]}
FEN：${fenOf(b,s)}
${boardText(b)}
${history?"這局到目前為止的著法："+history+"\n":""}
Pikafish 引擎（目前最強的象棋引擎）認為最好的幾步（分數是紅方視角）：
${lt||"（無合法著法）"}

請說明：1) 目前雙方的形勢與關鍵；2) 引擎第一選擇的意圖，和其他選擇差在哪裡；3) 這個局面要注意的戰術或陷阱。300 字以內。`;
  const txt=await(who==="gpt"?askRed:askBlack)(p,false);return txt.trim()}

// ---------- 觀戰網頁 ----------
function state(){return{id:G.id,board,turn,result:G.result,running,started:G.started,status,live:liveSide?live.slice(-3000):"",liveSide,clock:CFG.clock,clocks:G.clocks,red:G.red,black:G.black,
  check:!G.result&&inCheck(board,turn)?kingSq(board,turn):-1,ev:lastEv(G.moves),engine:fs.existsSync(ENGEXE),
  moves:G.moves.map(m=>({...moveOut(m),ic:iccs(m.f,m.t),cm:m.cm}))}}
const server=http.createServer(async(req,res)=>{
  const send=(code,type,body)=>{res.writeHead(code,{"content-type":type+"; charset=utf-8","cache-control":"no-store"});res.end(body)};
  const json=(o,code)=>send(code||200,"application/json",JSON.stringify(o));
  const body=()=>new Promise(r=>{let s="";req.on("data",d=>s+=d);req.on("end",()=>{try{r(JSON.parse(s||"{}"))}catch(e){r({})}})});
  // GitHub Pages 上的離線版 App 連進來：允許跨站請求，存取碼放在 x-xq-key 標頭
  if(APP_ORIGINS.includes(req.headers.origin)){res.setHeader("Access-Control-Allow-Origin",req.headers.origin);res.setHeader("Vary","Origin");
    res.setHeader("Access-Control-Allow-Headers","content-type,x-xq-key,x-xq-dev,x-xq-name,x-xq-kind");res.setHeader("Access-Control-Allow-Methods","GET,POST,OPTIONS");
    res.setHeader("Access-Control-Expose-Headers","content-length");res.setHeader("Access-Control-Max-Age","600")}
  if(req.method==="OPTIONS"){res.writeHead(204);return res.end()}
  // 外面（手機、通道）連進來要有存取碼：網址帶 ?k= 的話，存成 cookie 再轉回乾淨的網址
  if(KEY&&!isLocal(req)&&!sameKey(req.headers["x-xq-key"])){
    const u=new URL(req.url,"http://x"),ck=(req.headers.cookie||"").match(/(?:^|;\s*)xqk=([^;]+)/);
    if(sameKey(u.searchParams.get("k"))){u.searchParams.delete("k");
      res.writeHead(302,{"set-cookie":`xqk=${KEY}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`+(req.headers["cf-ray"]?"; Secure":""),location:u.pathname+(u.search||"")});return res.end()}
    if(!ck||!sameKey(ck[1]))return send(403,"text/plain","需要存取碼：請用電腦終端機印出的完整網址（含 ?k=）打開，或掃觀戰頁上的 QR code。")}
  const me=seeClient(req);
  if(req.method==="GET"&&req.url==="/clients")return json({list:clientList(),me:me?me.dev.slice(0,4):null});
  // 能走到這裡的人，不是電腦本機就是已經有存取碼的人，所以都可以看到 QR code
  if(req.method==="GET"&&req.url==="/remote")return json({urls:remoteUrls(),tunnel:CFG.tunnel,lan:CFG.lan});
  // 手機 App 版
  if(req.method==="GET"&&(req.url==="/m"||req.url==="/m/")){try{return send(200,"text/html",require(path.join(DB,"tools","mhtml.js")).assemble())}catch(e){return send(500,"text/plain","找不到 xiangqi-db/m.html")}}
  if(req.method==="GET"&&req.url==="/m/manifest.json")return send(200,"application/manifest+json",JSON.stringify({name:"象棋研究室",short_name:"象棋研究室",start_url:"/m",scope:"/",display:"standalone",
    orientation:"portrait",background_color:"#3B2A1A",theme_color:"#3B2A1A",icons:[{src:"/m/icon-180.png",sizes:"180x180",type:"image/png"},{src:"/m/icon-512.png",sizes:"512x512",type:"image/png",purpose:"any maskable"},{src:"/m/icon.svg",sizes:"any",type:"image/svg+xml"}]}));
  if(req.method==="GET"&&(req.url==="/quiz/data"||req.url==="/terms/data")){try{return send(200,"application/json",fs.readFileSync(path.join(DB,req.url.slice(1,-5)+".json"),"utf8"))}catch(e){return json({error:"還沒產生題庫，請執行 node xiangqi-db/tools/build-"+req.url.slice(1,-5)+".js"},404)}}
  if(req.method==="GET"&&req.url==="/jsQR.min.js"){try{return send(200,"text/javascript",fs.readFileSync(path.join(DB,"jsQR.min.js"),"utf8"))}catch(e){return send(404,"text/plain","")}}
  if(req.method==="GET"&&req.url==="/qrcode.min.js"){try{return send(200,"text/javascript",fs.readFileSync(path.join(DB,"qrcode.min.js"),"utf8"))}catch(e){return send(404,"text/plain","")}}
  if(req.method==="GET"&&/^\/m\/icon-(180|512)\.png$/.test(req.url)){try{const f=path.join(DB,req.url.slice(3));res.writeHead(200,{"content-type":"image/png","content-length":fs.statSync(f).size});return fs.createReadStream(f).pipe(res)}catch(e){return send(404,"text/plain","")}}
  if(req.method==="GET"&&req.url==="/m/icon.svg")return send(200,"image/svg+xml",`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="110" fill="#3B2A1A"/><circle cx="256" cy="256" r="178" fill="#F8ECD4" stroke="#B3261E" stroke-width="18"/><circle cx="256" cy="256" r="146" fill="none" stroke="#B3261E" stroke-width="6"/><text x="256" y="318" text-anchor="middle" font-family="serif" font-weight="900" font-size="190" fill="#B3261E">帥</text></svg>`);
  if(req.method==="GET"&&req.url==="/remote.js"){try{return send(200,"text/javascript",fs.readFileSync(path.join(DB,"remote.js"),"utf8"))}catch(e){return send(404,"text/plain","")}}
  if(req.method==="POST"&&req.url.startsWith("/an/"))try{
    const b=await body();
    // 一次查很多局面有沒有快取：grade 是「FEN|著法」，engine 是 FEN（只查，不會算）
    if(req.url==="/an/lookup"){const C=anc(),g={},e={};
      for(const k of(Array.isArray(b.grade)?b.grade:[]).slice(0,5000))if(C.grade[k])g[k]=C.grade[k];
      for(const k of(Array.isArray(b.engine)?b.engine:[]).slice(0,500))if(C.engine[k])e[k]=C.engine[k];
      return json({grade:g,engine:e})}
    checkBoard(b.board,b.side);const sg=b.side==="r"?1:-1;
    // /an/legal：回傳合法著法；如果帶 f、t，就先走這步再回傳新局面
    if(req.url==="/an/legal"){let bd=b.board,sd=b.side,cn=null;
      if(b.f!=null){const f=+b.f,t=+b.t;if(!legal(bd,sd).some(([x,y])=>x===f&&y===t))return json({error:"這步不合法"},400);cn=notate(bd,f,t);bd=make(bd,f,t);sd=opp(sd)}
      return json({board:bd,side:sd,cn,legal:legal(bd,sd),check:inCheck(bd,sd)?kingSq(bd,sd):-1})}
    if(req.url==="/an/engine"){const ms=Math.max(200,Math.min(10000,+b.ms||1500)),n=Math.max(1,Math.min(5,+b.multipv||3)),k=fenOf(b.board,b.side);
      const c=anc().engine[k];if(c&&!b.fresh&&c.ms>=ms&&c.multipv>=n)return json({...c,cached:true});   // 之前分析過、而且至少一樣仔細
      const r=await evalPos(b.board,b.side,ms,n);if(r.dead)return json({lines:[],dead:true});
      const out={ms,multipv:n,at:new Date().toISOString(),lines:r.lines.map(l=>({mv:l.mv,vr:sg*l.v,mate:l.mate==null?null:sg*l.mate,depth:l.depth,cn:pvText(b.board,b.side,[l.mv])[0]||l.mv,pv:pvText(b.board,b.side,l.pv),pvm:l.pv.slice(0,30)}))};
      ANC.engine[k]=out;ancSave();return json(out)}
    if(req.url==="/an/line")return json({moves:lineInfo(b.board,b.side,b.moves)});
    if(req.url==="/an/study-save")return json(studySave(b));
    if(req.url==="/an/classify"){const f=+b.f,t=+b.t;if(!legal(b.board,b.side).some(([x,y])=>x===f&&y===t))return json({error:"這步不合法"},400);
      return json(await classify(b.board,b.side,f,t)||{q:"—"})}
    if(req.url==="/an/explain"){const lines=(Array.isArray(b.lines)?b.lines:[]).slice(0,5).map(l=>({cn:String(l.cn||"").slice(0,12),vr:+l.vr||0,pv:(Array.isArray(l.pv)?l.pv:[]).slice(0,10).map(x=>String(x).slice(0,12))}));
      return json({text:await explain(b.board,b.side,b.who==="gpt"?"gpt":"claude",lines,String(b.history||"").slice(0,2000))})}
    return send(404,"text/plain","not found")}
  catch(e){return json({error:e.message},500)}
  if(req.url==="/pvp"||req.url.startsWith("/pvp/"))try{
    if(req.method==="GET"&&req.url==="/pvp"){try{return send(200,"text/html",fs.readFileSync(path.join(DB,"pvp.html"),"utf8"))}catch(e){return send(500,"text/plain","找不到 xiangqi-db/pvp.html")}}
    if(req.method==="GET"&&req.url.startsWith("/pvp/state")){const seat=new URL(req.url,"http://x").searchParams.get("seat");if(seat==="r"||seat==="b"){PVP_SEEN[seat]=Date.now();if(me&&me.name)PVP_WHO[seat]=me.name}return json(pvpState())}
    if(req.method==="POST"){const b=await body();ensureV();const side=b.side==="b"?"b":"r",seat=b.seat==="r"||b.seat==="b"?b.seat:null;
      if(seat){PVP_SEEN[seat]=Date.now();if(me&&me.name)PVP_WHO[seat]=me.name}
      if(req.url==="/pvp/new"){pvpNew(b);PVP_EMO=[];return json(pvpState())}
      if(req.url==="/pvp/emote"){const e=String(b.e||"");if(!/^[a-z0-9]{1,12}$/.test(e))return json({error:"沒有這個表情"},400);
        PVP_EMO.push({id:++pvpEmoN,by:seat||V.turn,e,at:Date.now()});PVP_EMO=PVP_EMO.slice(-20);return json(pvpState())}
      if(req.url==="/pvp/move"){const f=+b.f,t=+b.t;
        if(V.result)return json({error:"這局已經結束"},400);
        if(seat&&seat!==V.turn)return json({error:`還沒輪到你（你執${PLAYER[seat]}）`},400);
        if(!legal(V.board,V.turn).some(([x,y])=>x===f&&y===t))return json({error:"這步不合法"},400);
        pvpMove(f,t);return json(pvpState())}
      if(req.url==="/pvp/undo"){pvpUndo(seat);return json(pvpState())}
      if(req.url==="/pvp/draw"){if(V.result)return json({error:"這局已經結束"},400);
        if(V.draw&&V.draw!==side)pvpEnd(null,"雙方同意和棋");else V.draw=V.draw===side?null:side;return json(pvpState())}
      if(req.url==="/pvp/resign"){if(!V.result)pvpEnd(opp(side),PLAYER[side]+"認輸");return json(pvpState())}}
    return send(404,"text/plain","not found")}
  catch(e){return json({error:e.message},500)}
  if(req.url==="/play"||req.url.startsWith("/play/"))try{
    if(req.method==="GET"&&req.url==="/play"){try{return send(200,"text/html",fs.readFileSync(path.join(DB,"play.html"),"utf8"))}catch(e){return send(500,"text/plain","找不到 xiangqi-db/play.html")}}
    if(req.method==="GET"&&req.url==="/play/state")return json(playState());
    if(req.method==="POST"){const b=await body();ensureP();
      if(req.url==="/play/new"){playNew(b.human==="b"?"b":"r",Math.max(1,Math.min(LEVELS.length,Math.round(+b.level)||3)));playMsg="";setImmediate(playEngine);return json(playState())}
      if(req.url==="/play/move"){const f=+b.f,t=+b.t;
        if(P.result)return json({error:"這局已經結束"},400);
        if(P.turn!==P.human)return json({error:"還沒輪到你"},400);
        if(!legal(P.board,P.turn).some(([x,y])=>x===f&&y===t))return json({error:"這步不合法"},400);
        playApply(f,t);setImmediate(playEngine);return json(playState())}
      if(req.url==="/play/undo"){playUndo();return json(playState())}
      if(req.url==="/play/hint"){if(P.result||P.turn!==P.human)return json({error:"現在不能提示"},400);await playHint();return json(playState())}
      if(req.url==="/play/resign"){if(!P.result)playEnd(opp(P.human),"你認輸");return json(playState())}}
    return send(404,"text/plain","not found")}
  catch(e){return json({error:e.message},500)}
  if(req.method==="GET"&&req.url==="/")return send(200,"text/html",PAGE);
  if(req.method==="GET"&&(req.url==="/db"||req.url==="/db/")){try{return send(200,"text/html",fs.readFileSync(path.join(DB,"viewer.html"),"utf8"))}catch(e){return send(500,"text/plain; charset=utf-8","找不到 xiangqi-db/viewer.html")}}
  // 離線版 App 同步用：整個資料夾的原始檔
  if(req.method==="GET"&&req.url.startsWith("/db/raw?")){const c=new URL(req.url,"http://x").searchParams.get("c");
    if(!bookList().some(b=>b.key===c))return send(404,"application/json",JSON.stringify({error:"沒有這個資料夾"}));
    const f=path.join(DB,c+".json");res.writeHead(200,{"content-type":"application/json; charset=utf-8","content-length":fs.statSync(f).size,"cache-control":"no-store"});
    return fs.createReadStream(f).pipe(res)}
  if(req.method==="GET"&&req.url==="/db/books")return send(200,"application/json",JSON.stringify(
    bookList().map(b=>({key:b.key,name:b.name,count:(loadBook(b.key)||{items:[]}).items.length}))
      .concat([{key:"ai",name:"AI 對局",count:aiItems().length},{key:"play",name:"人機對局",count:playItems().length},{key:"pvp",name:"真人對局",count:pvpItems().length},{key:"study",name:"我的研究",count:studyItems().length}])));
  if(req.method==="GET"&&req.url.startsWith("/db/items")){let c=new URL(req.url,"http://x").searchParams.get("c");if(c==="shiqing")c="shiqingyaqu";
    if(c==="ai")return send(200,"application/json",JSON.stringify({name:"AI 對局",note:"AI 之間的對局，每局結束後自動存入經驗庫；進行中的對局會即時加入。",items:aiItems().map(summary)}));
    if(c==="play")return send(200,"application/json",JSON.stringify({name:"人機對局",note:"你和 Pikafish 的對局，每局結束後自動存檔。",items:playItems().map(summary)}));
    if(c==="pvp")return send(200,"application/json",JSON.stringify({name:"真人對局",note:"雙人對戰頁面下的對局，每局結束後自動存檔。",items:pvpItems().map(summary)}));
    if(c==="study")return send(200,"application/json",JSON.stringify({name:"我的研究",note:"推演 Pikafish 變化後按「💾 存成棋譜」存下來的研究。",items:studyItems().map(summary)}));
    const d=loadBook(c);if(!d)return send(404,"text/plain","no such collection");
    return send(200,"application/json",JSON.stringify({name:d.name,book:d.book,source:d.source,error:d.error,players:d.players||null,items:d.items.map(summary)}))}
  if(req.method==="GET"&&req.url.startsWith("/db/item?")){const u=new URL(req.url,"http://x"),c=u.searchParams.get("c"),id=u.searchParams.get("id");
    let it=null;if(c==="ai")it=aiItems().find(x=>x.id===id);else if(c==="play")it=playItems().find(x=>x.id===id);else if(c==="pvp")it=pvpItems().find(x=>x.id===id);else if(c==="study")it=studyItems().find(x=>x.id===id);
    else{const d=loadBook(c==="shiqing"?"shiqingyaqu":c);it=d&&d.byId&&d.byId.get(id);if(it)it=fullItem(it)}
    return it?send(200,"application/json",JSON.stringify(it)):send(404,"application/json",JSON.stringify({error:"找不到這一局"}))}
  if(req.method==="GET"&&req.url==="/db/exp")return send(200,"text/plain",`目前局面輪到${PLAYER[turn]}。下一步給${PLAYER[turn]}的經驗庫內容：\n`+(experience(turn)||"（經驗庫還沒有已結束的對局）"));
  if(req.method==="GET"&&req.url==="/state")return send(200,"application/json",JSON.stringify(state()));
  if(req.method==="POST"&&req.url==="/start"){if(!G.result){G.started=true;running=true;last=Date.now();status=`輪到${PLAYER[turn]}`;save()}return send(200,"application/json","{}")}
  if(req.method==="POST"&&req.url==="/pause"){running=false;if(child){try{child.kill()}catch(e){}}status="對局已暫停。按「繼續」接著下。";save();return send(200,"application/json","{}")}
  if(req.method==="POST"&&req.url==="/new"){running=false;if(child){try{child.kill()}catch(e){}}newGame();status="新局已就緒。按「開始對局」。";return send(200,"application/json","{}")}
  send(404,"text/plain","not found")});
const PAGE="<!doctype html>\n<html lang=\"zh-Hant\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n<title>AI 象棋五羊盃</title>\n<link rel=\"stylesheet\" href=\"https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&family=Noto+Serif+TC:wght@600;900&family=JetBrains+Mono:wght@400;600&display=swap\">\n<style>\n:root{--bg:#E8EBE4;--panel:#F6F7F3;--ink:#1D231F;--muted:#5E6A62;--line:#CBD2C8;--red:#B3261E;--blk:#1B1F1C;--wood:#E3BC7E;--grid:#5B3B1C;--piece:#F7EBD3;--accent:#2F6B4F;--warn:#9A5B00;--hl:#2F6B4F55;\n--serif:\"Noto Serif TC\",\"Songti TC\",\"SimSun\",serif;--sans:\"Noto Sans TC\",\"PingFang TC\",\"Microsoft JhengHei\",system-ui,sans-serif;--mono:\"JetBrains Mono\",ui-monospace,Menlo,Consolas,monospace}\n@media (prefers-color-scheme:dark){:root{--bg:#121614;--panel:#1B201D;--ink:#E5E9E3;--muted:#9AA69E;--line:#2E3631;--red:#E0574B;--blk:#151816;--wood:#B98C52;--grid:#3A2410;--piece:#EFE0C2;--accent:#6FBF95;--warn:#E3A34A;--hl:#6FBF9555;color-scheme:dark}}\n*{box-sizing:border-box}[hidden]{display:none!important}\nbody{margin:0;background:var(--bg);color:var(--ink);font-family:var(--sans);font-size:14px;line-height:1.55;padding:18px 16px 40px}\n.wrap{max-width:1120px;margin:0 auto;display:flex;flex-direction:column;gap:16px}\nh1{font-family:var(--serif);font-weight:900;font-size:clamp(24px,4vw,34px);margin:0;letter-spacing:.04em}\nheader p{margin:2px 0 0;color:var(--muted)}\n.main{display:grid;grid-template-columns:minmax(0,600px) minmax(0,1fr);gap:20px;align-items:start}\n@media (max-width:900px){.main{grid-template-columns:minmax(0,1fr)}}\n.col{display:flex;flex-direction:column;gap:12px;min-width:0}\n.players{display:grid;grid-template-columns:1fr 1fr;gap:10px}\n.pl{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:10px 12px;display:flex;justify-content:space-between;align-items:center;gap:8px;min-width:0}\n.pl.on{outline:2px solid var(--accent);outline-offset:-1px}.pl .who{min-width:0}\n.side{font-family:var(--serif);font-weight:900;font-size:16px}.pl.r .side{color:var(--red)}\n.name{color:var(--muted);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.clock{font-family:var(--mono);font-size:20px;font-variant-numeric:tabular-nums;font-weight:600}.clock.low{color:var(--red)}\nsvg{width:100%;height:auto;display:block}\n.status{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:10px 12px;font-weight:500}\n.status.warn{color:var(--warn)}.status.end{border-color:var(--accent)}\n.btns{display:flex;flex-wrap:wrap;gap:8px;align-items:center}\nbutton{font:inherit;color:inherit;border:1px solid var(--line);background:var(--panel);border-radius:8px;padding:7px 12px;cursor:pointer}\nbutton.pri{background:var(--accent);border-color:var(--accent);color:var(--bg);font-weight:700}button:disabled{opacity:.45;cursor:default}\n.card{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:8px;min-width:0}\n.card h2{font-family:var(--serif);font-size:16px;margin:0;font-weight:900}.card h2 small{font-family:var(--sans);font-weight:400;color:var(--muted);font-size:12px;margin-left:6px}\n.think{font-family:var(--mono);font-size:12px;white-space:pre-wrap;max-height:220px;overflow:auto;color:var(--muted);background:var(--bg);border-radius:8px;padding:8px;border:1px solid var(--line)}\n.rec{max-height:380px;overflow:auto}.rec table{width:100%;border-collapse:collapse}\n.rec td{padding:3px 6px;border-bottom:1px solid var(--line);vertical-align:top}.rec td:first-child{color:var(--muted);width:2.5em;text-align:right}\n.mv{font-family:var(--serif);font-weight:600;font-size:15px}.ic{font-family:var(--mono);font-size:11px;color:var(--muted)}td.r .mv{color:var(--red)}\n.cm{font-size:12px;color:var(--muted)}.note{font-size:12px;color:var(--muted)}\n.rec td.r,.rec td.b{cursor:pointer}.rec td.r:hover,.rec td.b:hover{background:var(--bg)}.rec td.sel,.rec td.sel:hover{background:var(--hl)}\n.nav{display:flex;gap:6px;align-items:center;flex-wrap:wrap}.nav button{padding:4px 10px}\n.review{background:var(--panel);border:1px dashed var(--accent);border-radius:10px;padding:8px 12px;font-size:13px}\n.evbar{width:16px;flex:none;border-radius:8px;background:var(--blk);overflow:hidden;border:1px solid var(--line);display:flex;flex-direction:column-reverse}.evbar div{width:100%;background:var(--red);height:50%;transition:height .5s}\n.boardwrap{display:flex;gap:8px;align-items:stretch;min-width:0}.boardwrap svg{flex:1;min-width:0}\n.review{max-height:4.6em;overflow:auto}\n@media (min-width:900px) and (min-height:520px){html,body{height:100%}body{padding:10px 14px;overflow:hidden}.wrap{max-width:none;height:100%;gap:6px}\nh1{font-size:24px}header{display:flex;align-items:baseline;gap:12px}header p{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}\n.main{flex:1;min-height:0;align-items:stretch;gap:14px;grid-template-columns:min(calc((100vh - 250px) * 0.9032 + 24px),56vw) minmax(320px,1fr)}\n.main>.col{min-height:0;overflow:hidden}.col{gap:8px}.boardwrap{flex:1;min-height:0}.pl{padding:6px 10px}.status{padding:6px 10px}\n.think{max-height:28vh}.rec-card{flex:1;min-height:0}.rec{max-height:none;flex:1;min-height:0}}\n/* ---- 手機版：上面是雙方時鐘與棋盤，下面思考過程與棋譜自己捲動 ---- */\n@media (max-width:760px){\nhtml,body{height:100%;overflow:hidden}body{padding:0;font-size:15px}\n.wrap{height:100vh;height:100dvh;max-width:none;gap:0}\nheader{display:flex;align-items:center;gap:8px;padding:6px 8px;border-bottom:1px solid var(--line);overflow-x:auto;white-space:nowrap;scrollbar-width:none}\nheader::-webkit-scrollbar{display:none}\nh1{font-size:16px}header p{font-size:13px;margin:0}\n.main{display:flex!important;flex-direction:column;align-items:stretch!important;flex:1;min-height:0;gap:0}\n.main>*{min-width:0;max-width:100vw}\n.main>.col:first-child{flex:none;padding:4px 8px;gap:4px;overflow:visible}\n.players{gap:6px}.pl{padding:4px 8px}.clock{font-size:17px}.side{font-size:14px}\n.boardwrap{height:min(calc((100vw - 40px) * 1.107),calc(100dvh - 330px));min-height:200px;justify-content:center}\n.boardwrap svg{flex:none;height:100%;width:auto}\n.status{padding:4px 8px;font-size:13px}.review{font-size:12px;max-height:3.2em}\n.btns button{padding:6px 10px}\n.main>.col:last-child{flex:1;min-height:0;overflow:auto;padding:6px 8px 14px;border-top:1px solid var(--line)}\n.rec{max-height:none}.rec-card{flex:none}.think{max-height:30vh}\n}\n</style></head><body>\n<div class=\"wrap\">\n<header><h1>AI 象棋五羊盃</h1><p>紅方 GPT（Codex CLI）先行，黑方 Claude（Claude Code）後走。依亞洲棋例裁判。 <a href='/db' target='_blank' style='color:var(--accent);font-weight:700'>📚 棋譜資料庫</a> <a href='/play' target='_blank' style='color:var(--accent);font-weight:700'>♟ 挑戰 Pikafish</a> <a href='/pvp' target='_blank' style='color:var(--accent);font-weight:700'>👥 雙人對戰</a></p></header>\n<div class=\"main\">\n <div class=\"col\">\n  <div class=\"players\">\n   <div class=\"pl r\" id=\"plR\"><div class=\"who\"><div class=\"side\">紅方</div><div class=\"name\" id=\"nmR\"></div></div><div class=\"clock\" id=\"clkR\"></div></div>\n   <div class=\"pl b\" id=\"plB\"><div class=\"who\"><div class=\"side\">黑方</div><div class=\"name\" id=\"nmB\"></div></div><div class=\"clock\" id=\"clkB\"></div></div>\n  </div>\n  <div class='boardwrap'><div class='evbar' title='優勢條：紅色越高代表紅方越優'><div id='evFill'></div></div><svg id=\"board\" viewBox=\"0 0 560 620\" role=\"img\" aria-label=\"中國象棋棋盤\"></svg></div><div class='note' id='evText'></div>\n  <div class=\"status\" id=\"status\">連線中…</div>\n  <div class='review' id='review' hidden></div>\n  <div class=\"btns\">\n   <button class=\"pri\" id=\"bStart\">開始對局</button><button id=\"bPause\">暫停</button><button id=\"bCopy\">複製棋譜</button><button id=\"bNew\">新局</button>\n   <span id=\"confirmNew\" hidden><span class=\"note\">放棄目前對局？</span> <button id=\"bNewYes\">確定</button> <button id=\"bNewNo\">取消</button></span>\n  </div>\n </div>\n <div class=\"col\">\n  <div class=\"card\" id=\"thinkCard\" hidden><h2 id=\"thinkTitle\">思考中</h2><div class=\"think\" id=\"think\"></div></div>\n  <div class='card' id='remoteCard' hidden><h2>📱 手機連線</h2><div style='display:flex;gap:12px;align-items:center'><div id='qr' style='background:#fff;padding:6px;border-radius:6px;flex:none'></div><div style='min-width:0'><div class='note' id='rurl' style='word-break:break-all;font-family:var(--mono)'></div><div class='note'>用手機相機掃 QR code。這個網址等於鑰匙，只給自己的手機用；重開程式網址會換。</div><div class='note' id='who' style='margin-top:6px;color:var(--ink,inherit)'></div></div></div></div>\n  <div class=\"card rec-card\"><h2>棋譜 <small id=\"recInfo\"></small></h2><div class='nav'><button id='nFirst' title='開局（Home）'>⏮</button><button id='nPrev' title='上一步（←）'>◀ 上一步</button><button id='nNext' title='下一步（→）'>下一步 ▶</button><button id='nLast' title='回到最新（End）'>⏭ 最新</button><span class='note'>點棋譜任一步可回顧</span></div><div class=\"rec\" id=\"recBox\"><table><tbody id=\"rec\"></tbody></table></div><div class=\"cm\" id=\"lastCm\"></div></div>\n  <div class=\"card note\">終端機視窗要保持開著。棋譜會自動存成 xiangqi-game.txt，關掉程式後再執行會接著下。</div>\n </div>\n</div></div>\n<script>\nconst NAMES={r:{K:\"帥\",A:\"仕\",B:\"相\",N:\"傌\",R:\"俥\",C:\"炮\",P:\"兵\"},b:{K:\"將\",A:\"士\",B:\"象\",N:\"馬\",R:\"車\",C:\"砲\",P:\"卒\"}};\nconst CN=[\"\",\"一\",\"二\",\"三\",\"四\",\"五\",\"六\",\"七\",\"八\",\"九\"],PLAYER={r:\"紅方\",b:\"黑方\"};\nconst $=id=>document.getElementById(id),NS=\"http://www.w3.org/2000/svg\",X0=40,Y0=40,S=60,px=c=>X0+c*S,py=r=>Y0+r*S;\nconst sideOf=p=>p?(p===p.toUpperCase()?\"r\":\"b\"):null;\nfunction el(t,a,txt){const e=document.createElementNS(NS,t);for(const k in a)e.setAttribute(k,a[k]);if(txt!=null)e.textContent=txt;return e}\nlet S0=null,lastKey=\"\",view=null;\nconst QC={'妙著':'#C27C0E','正著':'var(--accent)','穩著':'#3A7BD5','緩著':'var(--muted)','失著':'#D9822B','敗著':'var(--red)'};\nconst evt=v=>Math.abs(v)>=20000?(v>0?'紅方':'黑方')+'有殺':Math.abs(v)<30?'均勢':(v>0?'紅方':'黑方')+'優 '+(Math.abs(v)/100).toFixed(1);\nconst qTip=m=>m.q==='正著'||m.q==='妙著'?'與 Pikafish 最佳著法相同':'比 Pikafish 最佳著法少 '+m.loss+' 分；引擎建議 '+m.bc;\nconst START='rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR';\nfunction parseFen(f){const b=Array(90).fill(null);let r=0,c=0;for(const ch of f){if(ch==='/'){r++;c=0}else if(ch>='0'&&ch<='9')c+=+ch;else{b[r*9+c]=ch;c++}}return b}\nfunction vs(st){if(view===null||view>=st.moves.length)return st;const b=parseFen(START);for(let i=0;i<view;i++){const m=st.moves[i];b[m.t]=b[m.f];b[m.f]=null}const ms=st.moves.slice(0,view),m=ms[ms.length-1];return{board:b,moves:ms,check:m&&m.ck?b.indexOf(m.by==='r'?'k':'K'):-1}}\nfunction setView(n){view=(n===null||!S0||n>=S0.moves.length)?null:Math.max(0,n);if(S0)render(S0)}\nfunction draw(st){\n  const svg=$(\"board\");svg.innerHTML=\"\";\n  svg.append(el(\"rect\",{x:0,y:0,width:560,height:620,rx:10,fill:\"var(--wood)\"}));\n  svg.append(el(\"rect\",{x:X0-8,y:Y0-8,width:8*S+16,height:9*S+16,fill:\"none\",stroke:\"var(--grid)\",\"stroke-width\":3}));\n  const g=el(\"g\",{stroke:\"var(--grid)\",\"stroke-width\":1.4,fill:\"none\"});\n  for(let r=0;r<10;r++)g.append(el(\"line\",{x1:px(0),y1:py(r),x2:px(8),y2:py(r)}));\n  for(let c=0;c<9;c++){if(c===0||c===8)g.append(el(\"line\",{x1:px(c),y1:py(0),x2:px(c),y2:py(9)}));else{g.append(el(\"line\",{x1:px(c),y1:py(0),x2:px(c),y2:py(4)}));g.append(el(\"line\",{x1:px(c),y1:py(5),x2:px(c),y2:py(9)}))}}\n  for(const r0 of[0,7]){g.append(el(\"line\",{x1:px(3),y1:py(r0),x2:px(5),y2:py(r0+2)}));g.append(el(\"line\",{x1:px(5),y1:py(r0),x2:px(3),y2:py(r0+2)}))}\n  svg.append(g);\n  svg.append(el(\"text\",{x:px(2),y:py(4.5)+10,\"text-anchor\":\"middle\",\"font-family\":\"var(--serif)\",\"font-size\":28,fill:\"var(--grid)\",\"font-weight\":900},\"楚 河\"));\n  svg.append(el(\"text\",{x:px(6),y:py(4.5)+10,\"text-anchor\":\"middle\",\"font-family\":\"var(--serif)\",\"font-size\":28,fill:\"var(--grid)\",\"font-weight\":900},\"漢 界\"));\n  const lab=el(\"g\",{\"font-family\":\"var(--mono)\",\"font-size\":11,fill:\"var(--grid)\",\"text-anchor\":\"middle\"});\n  for(let c=0;c<9;c++){lab.append(el(\"text\",{x:px(c),y:16},String(c+1)));lab.append(el(\"text\",{x:px(c),y:612},CN[9-c]))}svg.append(lab);\n  const lm=st.moves[st.moves.length-1];\n  if(lm)for(const q of[lm.f,lm.t])svg.append(el(\"rect\",{x:px(q%9)-28,y:py(q/9|0)-28,width:56,height:56,rx:6,fill:\"var(--hl)\"}));\n  st.board.forEach((p,i)=>{if(!p)return;const s=sideOf(p),r=i/9|0,c=i%9,col=s===\"r\"?\"var(--red)\":\"var(--blk)\";\n    svg.append(el(\"circle\",{cx:px(c),cy:py(r)+2,r:26,fill:\"#00000033\"}));\n    svg.append(el(\"circle\",{cx:px(c),cy:py(r),r:26,fill:\"var(--piece)\",stroke:col,\"stroke-width\":2}));\n    svg.append(el(\"circle\",{cx:px(c),cy:py(r),r:21,fill:\"none\",stroke:col,\"stroke-width\":1}));\n    svg.append(el(\"text\",{x:px(c),y:py(r)+9,\"text-anchor\":\"middle\",\"font-family\":\"var(--serif)\",\"font-weight\":900,\"font-size\":26,fill:col},NAMES[s][p.toUpperCase()]))});\n  if(st.check>=0)svg.append(el(\"circle\",{cx:px(st.check%9),cy:py(st.check/9|0),r:29,fill:\"none\",stroke:\"var(--red)\",\"stroke-width\":3,\"stroke-dasharray\":\"6 4\"}));\n}\nconst fmt=ms=>{ms=Math.max(0,ms);const t=Math.ceil(ms/1000),h=Math.floor(t/3600),m=Math.floor(t%3600/60),s=t%60;return(h?h+\":\"+String(m).padStart(2,\"0\"):String(m).padStart(2,\"0\"))+\":\"+String(s).padStart(2,\"0\")};\nfunction record(st){const o=[];for(let i=0;i<st.moves.length;i+=2){const a=st.moves[i],z=st.moves[i+1];o.push((i/2+1)+\". \"+a.cn+(z?\" \"+z.cn:\"\"))}return o.join(\" \")}\nfunction render(st){\n  S0=st;if(view!==null&&view>=st.moves.length)view=null;const key=st.moves.length+\"|\"+st.check+\"|\"+view+\"|\"+st.moves.filter(m=>m.q).length;if(key!==lastKey){draw(vs(st));lastKey=key;\n    const tb=$(\"rec\");tb.innerHTML=\"\";\n    for(let i=0;i<st.moves.length;i+=2){const tr=document.createElement(\"tr\");const td0=document.createElement(\"td\");td0.textContent=i/2+1;tr.append(td0);\n      for(const[k,m]of[[i,st.moves[i]],[i+1,st.moves[i+1]]]){const td=document.createElement(\"td\");if(m){td.className=m.by+(view===k+1?' sel':'');td.title=m.cm||\"\";td.onclick=()=>setView(k+1);const a=document.createElement(\"div\");a.className=\"mv\";a.textContent=m.cn+(m.ck?\" 將\":\"\");const b=document.createElement(\"div\");b.className=\"ic\";b.textContent=m.ic;if(m.q&&m.q!=='—'){const qq=document.createElement('span');qq.textContent=' '+m.q;qq.style.color=QC[m.q]||'';qq.style.fontWeight='700';qq.style.fontFamily='var(--sans)';td.title=(m.cm?m.cm+'\\n':'')+qTip(m);b.append(qq)}td.append(a,b)}tr.append(td)}tb.append(tr)}\n    if(view===null)$(\"recBox\").scrollTop=1e9;else{const sl=$('rec').querySelector('.sel');if(sl){const bx=$('recBox'),r=sl.getBoundingClientRect(),q=bx.getBoundingClientRect();if(r.top<q.top)bx.scrollTop-=q.top-r.top+4;else if(r.bottom>q.bottom)bx.scrollTop+=r.bottom-q.bottom+4}}$(\"recInfo\").textContent=Math.ceil(st.moves.length/2)+\" 回合\";\n    $(\"lastCm\").textContent=lm(st)}\n  $(\"nmR\").textContent=st.red;$(\"nmB\").textContent=st.black;\n  for(const s of[\"r\",\"b\"]){const e=$(s===\"r\"?\"clkR\":\"clkB\");e.textContent=st.clock?fmt(st.clocks[s]):\"--:--\";e.classList.toggle(\"low\",st.clock&&st.clocks[s]<60000)}\n  $(\"plR\").classList.toggle(\"on\",!st.result&&st.turn===\"r\");$(\"plB\").classList.toggle(\"on\",!st.result&&st.turn===\"b\");\n  const ss=$(\"status\");ss.textContent=st.status;ss.classList.toggle(\"warn\",st.status.startsWith(\"⚠\"));ss.classList.toggle(\"end\",!!st.result);\n  const evm=view!==null&&view>0&&st.moves[view-1].ev!=null?{v:st.moves[view-1].ev,ply:view}:(view===0?null:st.ev);$('evFill').style.height=(evm?50+50*Math.tanh(evm.v/600):50)+'%';\n  $('evText').textContent=evm?'優勢條（Pikafish 評估第 '+evm.ply+' 步後）：'+evt(evm.v):(st.engine?'優勢條：等待 Pikafish 分析…':'優勢條：找不到 Pikafish 引擎');\n  const rv=$('review');if(view===null)rv.hidden=true;else{rv.hidden=false;const vm=st.moves[view-1];rv.textContent=(view===0?'回顧中：開局局面':'回顧中：第 '+Math.ceil(view/2)+' 回合 '+PLAYER[vm.by]+' '+vm.cn+(vm.q&&vm.q!=='—'?'【'+vm.q+'，'+qTip(vm)+'】':'')+(vm.cm?' — '+vm.cm:''))+(st.result?'':'（對局仍在進行，按「⏭ 最新」回到即時畫面）')}\n  $(\"thinkCard\").hidden=!st.liveSide;if(st.liveSide){$(\"thinkTitle\").textContent=PLAYER[st.liveSide]+\" 思考中（CLI 輸出）\";const t=$(\"think\");const atEnd=t.scrollTop+t.clientHeight>=t.scrollHeight-20;t.textContent=st.live||\"Thinking...\";if(atEnd)t.scrollTop=1e9}\n  $(\"bStart\").textContent=st.started?\"繼續\":\"開始對局\";$(\"bStart\").disabled=st.running||!!st.result;$(\"bPause\").disabled=!st.running;\n}\nfunction lm(st){const m=st.moves[st.moves.length-1];return m&&m.cm?PLAYER[m.by]+\"：\"+m.cm:\"\"}\nasync function poll(){try{const r=await fetch(\"/state\");render(await r.json())}catch(e){$(\"status\").textContent=\"⚠ 連不到裁判程式，請確認終端機裡的程式還在執行。\"}setTimeout(poll,1000)}\nconst post=u=>fetch(u,{method:\"POST\"}).then(()=>fetch(\"/state\")).then(r=>r.json()).then(render).catch(()=>{});\n$(\"bStart\").onclick=()=>post(\"/start\");$(\"bPause\").onclick=()=>post(\"/pause\");\n$(\"bNew\").onclick=()=>{$(\"confirmNew\").hidden=false};$(\"bNewNo\").onclick=()=>{$(\"confirmNew\").hidden=true};\n$(\"bNewYes\").onclick=()=>{$(\"confirmNew\").hidden=true;view=null;lastKey=\"\";post(\"/new\")};\n$('nFirst').onclick=()=>setView(0);$('nPrev').onclick=()=>{if(S0)setView((view===null?S0.moves.length:view)-1)};$('nNext').onclick=()=>{if(view!==null)setView(view+1)};$('nLast').onclick=()=>setView(null);\ndocument.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'){e.preventDefault();$('nPrev').click()}else if(e.key==='ArrowRight'){e.preventDefault();$('nNext').click()}else if(e.key==='Home')setView(0);else if(e.key==='End')setView(null)});\n$(\"bCopy\").onclick=async e=>{if(!S0)return;const b=e.currentTarget,o=b.textContent;const txt=\"AI 象棋五羊盃\\n紅方：\"+S0.red+\"　黑方：\"+S0.black+\"\\n\"+(S0.result?\"結果：\"+(S0.result.w?PLAYER[S0.result.w]+\"勝\":\"和局\")+\"（\"+S0.result.why+\"）\\n\":\"\")+\"\\n\"+record(S0);\n  try{await navigator.clipboard.writeText(txt);b.textContent=\"已複製\"}catch(x){b.textContent=\"複製失敗\"}setTimeout(()=>b.textContent=o,1500)};\nlet qrShown='';\nfunction who(){fetch('/clients').then(r=>r.json()).then(d=>{const e=$('who');if(!e)return;const l=(d.list||[]).filter(c=>c.via!=='本機');e.textContent=l.length?'👥 目前連線：'+l.map(c=>c.name+'（'+c.kind+'，'+c.ip+(c.ago>20?'，'+Math.round(c.ago/60)+' 分前':'')+'）').join('、'):'👥 目前沒有手機連線'}).catch(()=>{})}\nsetInterval(who,5000);who();\nfunction remote(n){fetch('/remote').then(r=>r.json()).then(d=>{const u=(d.urls||[])[0];if(u&&u!==qrShown){qrShown=u;$('remoteCard').hidden=false;$('rurl').textContent=d.urls.join('\\n');\n  const draw=()=>{$('qr').innerHTML='';new QRCode($('qr'),{text:u,width:132,height:132,correctLevel:QRCode.CorrectLevel.M})};\n  if(window.QRCode)draw();else{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';s.onload=draw;s.onerror=()=>{$('qr').textContent='（QR code 載入失敗，請直接用網址）'};document.head.append(s)}}\n  if((d.tunnel&&!(d.urls||[]).some(x=>x.startsWith('https')))&&n<60)setTimeout(()=>remote(n+1),3000)}).catch(()=>{})}\nremote(0);\npoll();\n</script><script src=\"/remote.js\" defer></script></body></html>\n";

if(CFG.fresh||!load())newGame();else{if(!G.engines)G.engines={...ENGINE};if(!G.id)G.id=gameId();if(G.result&&!fs.existsSync(path.join(GAMES,(G.id||"")+".json")))archive()}
if(G.moves.length||G.result)status=G.result?`對局已結束：${G.result.w?PLAYER[G.result.w]+"勝":"和局"}（${G.result.why}）`:`已載入進行中的對局（${G.moves.length} 步）。按「繼續」。`;
server.listen(CFG.port,CFG.lan?"0.0.0.0":"127.0.0.1",()=>{
  if(CFG.lan)console.log(`\n📱 同一個 Wi-Fi 的手機打開（或掃觀戰頁上的 QR code）：\n${lanUrls().map(u=>"   "+u).join("\n")||"   （找不到區網位址）"}\n   第一次連線時 Windows 可能會問要不要允許 Node.js 通過防火牆，請選「允許」（私人網路）。`);
  if(CFG.tunnel)startTunnel();
  console.log(`\nAI 象棋五羊盃 — 自動裁判已啟動`);
  console.log(`紅方：${G.red}（codex exec）   黑方：${G.black}（claude -p）`);
  console.log(`計時：${CFG.clock?`每方 ${CFG.minutes} 分 + 每步 ${CFG.inc} 秒`:"關閉"}`);
  setTimeout(analyzeGame,1000);
  console.log(`經驗庫：${CFG.exp?`開啟，已有 ${history().filter(g=>g.result).length} 局`:"關閉"}`);
  console.log(`\n在瀏覽器打開觀戰：http://localhost:${CFG.port}\n棋譜資料庫：http://localhost:${CFG.port}/db\n挑戰 Pikafish：http://localhost:${CFG.port}/play\n雙人對戰：http://localhost:${CFG.port}/pvp\n`)});
server.on("error",e=>{console.error(e.code==="EADDRINUSE"?`連接埠 ${CFG.port} 已被占用，請加上 --port 8766 之類的參數。`:e.message);process.exit(1)});
process.on("SIGINT",()=>{if(child){try{child.kill()}catch(e){}}if(eng){try{eng.p.kill()}catch(e){}}
  if(ANC){try{fs.writeFileSync(ANCACHE_FILE,JSON.stringify(ANC))}catch(e){}}save();console.log("\n已存檔，下次執行會接著下。");process.exit(0)});
loop();
