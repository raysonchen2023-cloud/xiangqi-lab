/* ================= 📱 換手機轉移碼（開發者決定，Gemini 效能審閱 P0-1）=================
   （11/13 起新產生的是 10 碼 v4，見 05b-save.js 的 XFER4 區段；這裡的 8 碼 v2 和 XFER2 的 v3 只留著收舊版 App 的碼）
   舊手機：整份存檔（XQSave.dump）壓縮 → 用 8 碼轉移碼推出 AES-GCM 金鑰加密 → 分段發到 MQTT 留存頻道（頻道名是轉移碼的雜湊，沒有碼找不到）
   新手機：輸入轉移碼 → 收齊 → 解密、解壓 → 確認後取代這支手機的資料 → 刪掉頻道上的資料（一次性）→ 重開
   公開伺服器上只有加密過的資料；30 分鐘後失效 */
/* XFER:BEGIN（評審 P22 缺陷 e、f、g，11/11）：轉移碼的打包、加密、上傳、下載、清除。這一段到 XFER:END 只用 crypto、indexedDB、XQNet、XQSave、slotAll，
   xiangqi-lab/tools/test-xfer.js 直接切出來在 node 跑（往返一致、清除、過期、換新裝置代號）。畫面（xfSend／xfRecv）在 XFER:END 後面。
   e：伺服器上的密文不再只靠舊手機的計時器清——新手機解開後馬上清、碰到過期的也順手清；tools/mqtt-prune.js 也會清 x/ 底下過期或沒有說明的分段。
   f：連棋譜庫一起帶（IndexedDB xqlab 的 games:*：人機對局、真人對局、我的研究、看過的對局），壓縮加密後照樣分段；新手機用合併（同一盤 id 不重複），不刪新手機原有的棋譜。
   g：搬過來的資料改用新手機自己的裝置代號（舊手機留原本的），不帶「正在下哪一盤」和舊代號的刪除請求紀錄，兩支手機不會在大廳共用同一個代號 */
const XF_ABC="ABCDEFGHJKMNPQRSTUVWXYZ23456789",XF_TTL=30*60000,XF_CH=120000,XF_DROP=["xq_net","m_srvDelReq","xq_netBind"];
const xfNorm=c=>String(c||"").toUpperCase().replace(/[^A-Z0-9]/g,"").replace(/[IL]/g,"1").replace(/O/g,"0");
async function xfKeys(code){const te=new TextEncoder(),c=xfNorm(code),h=new Uint8Array(await crypto.subtle.digest("SHA-256",te.encode("xqlab-xfer-id:"+c))),id=[...h.slice(0,10)].map(x=>x.toString(16).padStart(2,"0")).join("");
  const base=await crypto.subtle.importKey("raw",te.encode(c),"PBKDF2",false,["deriveKey"]);
  const key=await crypto.subtle.deriveKey({name:"PBKDF2",salt:te.encode("xqlab-xfer-salt-v1"),iterations:150000,hash:"SHA-256"},base,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
  return{id,key,topic:k=>`${XQNet.root()}/x/${id}/${k}`}}
const xfB64=u=>{let s="";for(let i=0;i<u.length;i+=32768)s+=String.fromCharCode.apply(null,u.subarray(i,i+32768));return btoa(s)},xfUnB64=b=>Uint8Array.from(atob(b),c=>c.charCodeAt(0));
async function xfZip(u,inflate){if(!window.CompressionStream)return u;const s=new Blob([u]).stream().pipeThrough(inflate?new DecompressionStream("gzip"):new CompressionStream("gzip"));return new Uint8Array(await new Response(s).arrayBuffer())}
/* 棋譜庫：跟 src/local.js 的 idb 同一個資料庫（xqlab，第 1 版，kv 表），只讀寫 games:<種類> 這幾個鍵 */
function xfIdb(){return new Promise((ok,no)=>{let r;try{r=indexedDB.open("xqlab",1)}catch(e){return no(e)}r.onupgradeneeded=()=>{try{r.result.createObjectStore("kv")}catch(e){}};r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})}
async function xfGamesAll(){const db=await xfIdb();try{return await new Promise((ok,no)=>{const t=db.transaction("kv","readonly"),s=t.objectStore("kv"),o={},rq=s.getAllKeys();
  rq.onsuccess=()=>{(rq.result||[]).filter(k=>typeof k==="string"&&/^games:\w{1,20}$/.test(k)).forEach(k=>{const g=s.get(k);g.onsuccess=()=>{if(Array.isArray(g.result)&&g.result.length)o[k.slice(6)]=g.result}})};
  t.oncomplete=()=>ok(o);t.onerror=t.onabort=()=>no(t.error||new Error("讀不到棋譜庫"))})}finally{try{db.close()}catch(e){}}}
async function xfGamesPut(G){const ks=Object.keys(G||{}).filter(k=>/^\w{1,20}$/.test(k)&&Array.isArray(G[k]));if(!ks.length)return 0;const db=await xfIdb();let n=0;
  try{await new Promise((ok,no)=>{const t=db.transaction("kv","readwrite"),s=t.objectStore("kv");
    ks.forEach(k=>{const rq=s.get("games:"+k);rq.onsuccess=()=>{const cur=Array.isArray(rq.result)?rq.result:[],seen=new Set(cur.map(g=>g&&g.id).filter(Boolean)),add=G[k].filter(g=>g&&typeof g==="object"&&!(g.id&&seen.has(g.id)));
      add.forEach(g=>{if(g.id)seen.add(g.id)});n+=add.length;if(add.length)s.put(cur.concat(add),"games:"+k)}});
    t.oncomplete=()=>ok();t.onerror=t.onabort=()=>no(t.error||new Error("存不進棋譜庫"))})}finally{try{db.close()}catch(e){}}return n}
/* 清掉伺服器上這組碼的資料（發空的保留訊息）；n＝分段數 */
function xfWipe(K,n){const a=[];for(let i=0;i<n;i++)a.push(XQNet.putRetained(K.topic(i),""));a.push(XQNet.putRetained(K.topic("m"),""));return Promise.all(a)}
/* 舊手機：打包（localStorage＋三格存檔＋棋譜庫）→ 壓縮 → 加密 → 分段上傳。回 {K,exp,n,kb,games}；中途失敗會把已上傳的清掉再丟錯 */
async function xfUpload(code){const K=await xfKeys(code);let games={};try{games=await xfGamesAll()}catch(e){}
  const raw=new TextEncoder().encode(JSON.stringify({v:2,at:Date.now(),data:XQSave.dump(),slots:await slotAll(),games})),zip=await xfZip(raw),iv=crypto.getRandomValues(new Uint8Array(12));
  const enc=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv},K.key,zip)),b64=xfB64(enc),parts=[];for(let i=0;i<b64.length;i+=XF_CH)parts.push(b64.slice(i,i+XF_CH));
  const exp=Date.now()+XF_TTL;if(!await XQNet.putRetained(K.topic("m"),JSON.stringify({v:2,n:parts.length,iv:xfB64(iv),gz:!!window.CompressionStream,exp})))throw new Error("連不上線上伺服器，等一下再試");
  for(let i=0;i<parts.length;i++)if(!await XQNet.putRetained(K.topic(i),parts[i])){xfWipe(K,parts.length);throw new Error("上傳到一半斷線了，請再試一次")}
  return{K,exp,n:parts.length,kb:Math.ceil(b64.length/1024),games:Object.values(games).reduce((a,l)=>a+l.length,0)}}
/* 新手機：下載 → 解密 → 解壓。解開就馬上清掉伺服器上的資料（一次性，不等使用者按確認）；過期的也清。錯誤丟 Error（訊息直接給使用者看） */
async function xfDownload(code,prog){const K=await xfKeys(code),m=await XQNet.getRetained(K.topic("m"),10000);if(!m)throw new Error("找不到這組轉移碼：可能打錯、過期，或已經用過了");
  let M=null;try{M=JSON.parse(m)}catch(e){}if(!M||typeof M.iv!=="string")throw new Error("資料不完整，請在舊手機重新產生轉移碼");const n=Math.max(0,Math.min(500,+M.n|0));
  if(!(+M.exp>0)||Date.now()>+M.exp){await xfWipe(K,n);throw new Error("這組轉移碼已經過期，請在舊手機重新產生")}
  let b64="";for(let i=0;i<n;i++){if(prog)prog(i+1,n);const p=await XQNet.getRetained(K.topic(i),10000);if(!p)throw new Error("資料不完整，請在舊手機重新產生轉移碼");b64+=p}
  let D=null;try{let u=new Uint8Array(await crypto.subtle.decrypt({name:"AES-GCM",iv:xfUnB64(M.iv)},K.key,xfUnB64(b64)));if(M.gz)u=await xfZip(u,true);D=JSON.parse(new TextDecoder().decode(u))}catch(e){throw new Error("解不開：轉移碼不對，或資料已經被換掉了")}
  await xfWipe(K,n);return D}
const xfNewId=()=>(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2)).replace(/[^A-Za-z0-9]/g,"").slice(0,20);
/* 換成新手機自己的裝置代號（跟舊的一樣、或這支還沒有代號就產生一組新的），名字照舊；拿掉只屬於舊手機的鍵 */
function xfLocalize(data,myId){const o=Object.assign({},data||{});let m=null;try{m=JSON.parse(o.xq_me||"null")}catch(e){}const old=m&&m.id||null;
  let id=typeof myId==="string"&&/^[A-Za-z0-9]{3,40}$/.test(myId)?myId:"";if(!id||id===old)id=xfNewId();
  o.xq_me=JSON.stringify(Object.assign({},m&&typeof m==="object"?m:{},{id}));XF_DROP.forEach(k=>{delete o[k]});return{data:o,id,old}}
/* XFER:END */
async function xfSend(){if(!OFF||!window.XQNet||!window.XQSave||!crypto.subtle)return toast("這個瀏覽器不支援轉移碼");
  const code=xf4Code(),shown=code.slice(0,5)+"-"+code.slice(5);   /* 紅藍隊 R03／I5：v4 的 10 碼（xf4Code、xf4Upload 在 05b-save.js 的 XFER4 區段） */
  sheet("📱 產生轉移碼",async b=>{b.innerHTML='<p class="muted">整理資料、加密中…</p>';
    try{const U=await xfUpload(code);
      setTimeout(()=>xfWipe(U.K,U.n),XF_TTL);
      b.innerHTML=`<p>在新手機打開象棋千秋 →「設定 → ⚙ 系統 → 📱 換手機 → 輸入轉移碼」<!-- 意見回饋 607：設定的分頁是「⚙ 系統」 -->，輸入：</p><div style="font:900 34px/1.3 ui-monospace,monospace;letter-spacing:.12em;text-align:center;margin:12px 0;color:var(--accent)">${shown}</div>
        <p class="muted" style="font-size:13px">30 分鐘內有效（到 ${new Date(U.exp).toLocaleTimeString().slice(0,-3)}），新手機收到後就失效。這支手機的資料不會被刪掉。資料大小約 ${U.kb} KB${U.games?`，含 ${U.games} 盤棋譜`:""}。新手機會用它自己的裝置代號，這支手機保留原本的。</p><button class="btn ghost" id="xfX" style="width:100%">作廢這組碼</button>`;
      b.querySelector("#xfX").onclick=()=>{xfWipe(U.K,U.n);toast("這組轉移碼已作廢");closeSheet()}}
    catch(e){b.innerHTML=`<p>⚠ ${esc(e.message||String(e))}</p>`}})}
async function xfRecv(){if(!OFF||!window.XQNet||!window.XQSave||!crypto.subtle)return toast("這個瀏覽器不支援轉移碼");
  sheet("📱 輸入轉移碼",b=>{b.innerHTML='<p>輸入舊手機上顯示的 10 碼（舊版 App 是 8 碼）：</p><input id="xfC" inputmode="text" autocomplete="off" autocapitalize="characters" maxlength="11" placeholder="ABCDE-23456" style="width:100%;font:900 26px ui-monospace,monospace;letter-spacing:.12em;text-align:center;padding:10px;border-radius:12px;border:1px solid var(--line);background:var(--card);color:inherit"><button class="btn" id="xfGo" style="width:100%;margin-top:10px">下載資料</button><p class="muted" id="xfM" style="font-size:13px"></p>';
    const msg=t=>{b.querySelector("#xfM").textContent=t};
    b.querySelector("#xfGo").onclick=async()=>{const code=xfNorm(b.querySelector("#xfC").value);if(code.length!==10&&code.length!==8)return msg("轉移碼是 10 碼（舊版 App 產生的是 8 碼）");msg(code.length===8?"⚠ 舊版 8 碼轉移碼，安全性較低。連線中…":"連線中…");
      let D=null;try{D=await xfDownload(code,(i,n)=>msg(`下載中… ${i}／${n}`))}catch(e){return msg(e&&e.message||"解不開：轉移碼不對，或資料已經被換掉了")}
      const n=Object.keys(D&&D.data||{}).length;if(!n)return msg("收到的資料是空的");const ng=Object.values(D.games||{}).reduce((a,l)=>a+(Array.isArray(l)?l.length:0),0);
      modal(`<div class="em">📱</div><h2>用舊手機的資料取代這支手機？</h2><p class="muted">收到 ${n} 筆資料${ng?`、${ng} 盤棋譜`:""}（${new Date(D.at).toLocaleString()} 產生）。這支手機原本的修為、戰績和設定會被換掉；棋譜是合併，這支手機原有的不會刪。這支手機會保留自己的裝置代號。這組轉移碼已經用掉，取消的話要在舊手機重新產生。</p>${D.xfWarn?`<p class="muted" style="color:var(--warn,#c60)">⚠ ${esc(D.xfWarn)}</p>`:""}`,
        [["取代並重新開啟",async()=>{const L=xfLocalize(D.data,meInfo().id);try{await xfGamesPut(D.games||{})}catch(e){}XQSave.load(L.data,async()=>{try{await slotPutAll(D.slots||{})}catch(e){}location.replace(location.pathname+"#/");setTimeout(()=>location.reload(),80)})}],["取消",null,true]])}})}
/* 意見回饋 491（開發者）：第一次進 App 先選「男生／女生」，再取名字；老玩家更新到這版也會跳一次
   意見回饋 604（開發者）：不再問 Q 版還是真實版，一律用真實 3D（之後可以在「設定 → 角色」改）；名字欄先填好「棋友＋4 位 16 進位」 */
/* 意見回饋 663（開發者 11/6，RPG／第一人稱兩位設計師討論後的規格）：選角改成一次一位、左右滑動。立繪、名字＋棋子、口頭禪泡泡；小故事收在 ⓘ；
   跟手滑動，拖過 25% 或夠快才換；兩端回彈不循環；離螢幕邊 24px 內起手的滑動留給系統返回；箭頭、小圓點、鍵盤 ← → Home End、橫向滾輪都能換 */
function obCarousel(b,L,start,onPick,cur){let i=start,dx=0,drag=null,lastDrag=0;const RM=matchMedia("(prefers-reduced-motion: reduce)").matches;
  b.innerHTML=`<div class="obk" role="region" aria-roledescription="輪播" aria-label="選角色" tabindex="0"><div class="obk-vp"><div class="obk-tr">${L.map((x,j)=>`<div class="obk-sl" data-j="${j}"><div class="obk-im"><img src="${x.img}" alt="${esc(x.n)}" draggable="false">${x.say?`<div class="obk-say">${esc(x.say)}</div>`:""}${cur===x.k?'<span class="obk-cur">目前</span>':""}</div></div>`).join("")}</div><button class="obk-ar l" aria-label="上一位">‹</button><button class="obk-ar r" aria-label="下一位">›</button></div><div class="obk-info"><div class="obk-nm"></div><div class="obk-s"></div><div class="obk-bio" hidden></div></div><div class="obk-dots">${L.map((x,j)=>`<button aria-label="第 ${j+1} 位：${esc(x.n)}" data-j="${j}"></button>`).join("")}</div><div class="obk-live" aria-live="polite"></div><button class="btn obk-go"></button></div>`;
  const vp=b.querySelector(".obk-vp"),tr=b.querySelector(".obk-tr"),sl=[...tr.children],dots=[...b.querySelectorAll(".obk-dots button")],nm=b.querySelector(".obk-nm"),ss=b.querySelector(".obk-s"),bio=b.querySelector(".obk-bio"),go=b.querySelector(".obk-go"),live=b.querySelector(".obk-live"),al=b.querySelector(".obk-ar.l"),ar=b.querySelector(".obk-ar.r");
  const W=()=>sl[0].offsetWidth+8,base=()=>(vp.clientWidth-sl[0].offsetWidth)/2;
  const place=anim=>{tr.style.transition=anim&&!RM?"transform .28s cubic-bezier(.2,.8,.2,1)":"none";tr.style.transform="translateX("+(base()-i*W()+dx)+"px)";sl.forEach((x,j)=>x.classList.toggle("on",j===i))};
  const info=first=>{const x=L[i];nm.innerHTML=(x.pc?'<span class="obk-pc">'+esc(x.pc)+'</span>':"")+"<b>"+esc(x.n)+"</b>"+(x.bio?'<button class="obk-i" aria-label="看故事">ⓘ</button>':"");ss.textContent=x.s;bio.hidden=true;bio.textContent=x.bio||"";
    dots.forEach((d,j)=>d.classList.toggle("on",j===i));al.disabled=i===0;ar.disabled=i===L.length-1;go.textContent=cur?(cur===x.k?"就是這位":"換成"+x.nk):"就選"+x.nk;
    live.textContent="第 "+(i+1)+" 位，共 "+L.length+" 位，"+(x.pc?x.pc+"・":"")+x.n;const ib=nm.querySelector(".obk-i");if(ib)ib.onclick=()=>{bio.hidden=!bio.hidden};
    sl.forEach(z=>{const q=z.querySelector(".obk-say");if(q)q.classList.remove("in")});const say=sl[i].querySelector(".obk-say");if(say)setTimeout(()=>say.classList.add("in"),RM?0:120);
    if(!first){try{if(store.get("capSound",true))withAudio(()=>moveSound0(false))}catch(e){}}};
  const to=j=>{j=Math.max(0,Math.min(L.length-1,j));const ch=j!==i;i=j;dx=0;place(true);if(ch)info(false)};
  al.onclick=()=>to(i-1);ar.onclick=()=>to(i+1);dots.forEach(d=>d.onclick=()=>to(+d.dataset.j));
  sl.forEach((z,j)=>z.onclick=()=>{if(performance.now()-lastDrag<350)return;if(j!==i)to(j)});
  go.onclick=()=>{if(cur&&cur===L[i].k){closeSheet();return}const im=sl[i].querySelector(".obk-im");if(!RM&&im&&im.animate)im.animate([{transform:"scale(1)"},{transform:"scale(1.04)"},{transform:"scale(1)"}],{duration:240});setTimeout(()=>onPick(L[i]),RM?0:240)};
  vp.addEventListener("pointerdown",e=>{if(e.pointerType!=="mouse"&&(e.clientX<24||e.clientX>innerWidth-24))return;if(e.target.closest(".obk-ar"))return;drag={x:e.clientX,y:e.clientY,t:performance.now(),on:false,id:e.pointerId}});
  vp.addEventListener("pointermove",e=>{if(!drag||e.pointerId!==drag.id)return;const mx=e.clientX-drag.x,my=e.clientY-drag.y;
    if(!drag.on){if(Math.abs(mx)>10&&Math.abs(mx)>1.2*Math.abs(my)){drag.on=true;try{vp.setPointerCapture(e.pointerId)}catch(_){}}else{if(Math.abs(my)>10)drag=null;return}}
    let d=mx;if((i===0&&d>0)||(i===L.length-1&&d<0))d=Math.sign(d)*Math.min(60,Math.abs(d)*.3);dx=d;place(false)});
  const up=e=>{if(!drag)return;const on=drag.on,mx=e.clientX-drag.x,v=Math.abs(mx)/Math.max(1,performance.now()-drag.t);drag=null;if(!on)return;lastDrag=performance.now();
    if(Math.abs(mx)>sl[0].offsetWidth*.25||v>=.4)to(i+(mx<0?1:-1));else{dx=0;place(true)}};
  vp.addEventListener("pointerup",up);vp.addEventListener("pointercancel",up);
  let wh=0;vp.addEventListener("wheel",e=>{if(Math.abs(e.deltaX)<=Math.abs(e.deltaY))return;e.preventDefault();wh+=e.deltaX;if(Math.abs(wh)>=50){to(i+(wh>0?1:-1));wh=0}},{passive:false});
  b.querySelector(".obk").onkeydown=e=>{if(e.key==="ArrowLeft")to(i-1);else if(e.key==="ArrowRight")to(i+1);else if(e.key==="Home")to(0);else if(e.key==="End")to(L.length-1);else return;e.preventDefault()};
  requestAnimationFrame(()=>{place(false);info(true)});const rs=()=>{if(!b.isConnected)return removeEventListener("resize",rs);place(false)};addEventListener("resize",rs)}
/* 意見回饋 491／604：第一次進 App 選角色、取名字；663 起選角用上面的滑動元件。從設定或我的頁再次選角時，停在目前的角色、選了就換，不重走取名 */
/* 意見回饋 668：選角搬到開頭畫面（05b-save.js titleScreen），選定就鎖住；這裡只留給舊的呼叫點。開 App 2.5 秒後自動跳選角也拿掉了（開頭畫面接手） */
function onboard(){if(journey())journeyLock();else titleScreen({})}

// ================= 設定：棋盤風格、棋子樣式、走棋顯示 =================
const SAMPLE_FEN0="rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR",SAMPLE_FEN1="rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C2C4/9/RNBAKABNR",SAMPLE_LAST={f:70,t:67};
/* 意見回饋 661：關於頁顯示整包遊戲要多大空間。XQ_SIZES 由 build-site.js 建置時填入（開發中的 m.html 是 null，就不顯示） */
const XQ_SIZES={"pre":397868793,"code":14535256,"eng":51511005,"gm":33668932,"bgm":280488180,"opt":[["比賽對局 1956–2010",21765744],["比賽對局 2011–2014",25596413],["比賽對局 2015–2019",24821916]],"all":892694295,"other":42438056};
const szMB=b=>b>=1073741824?(b/1073741824).toFixed(1)+" GB":Math.max(1,Math.round(b/1048576))+" MB";
function aboutSizes(){const S=XQ_SIZES,bg=typeof preStatRow==="function"?preStatRow():"";if(!S)return bg;const opt=S.opt||[];   /* 意見回饋 662：玩家只看總數，細項只在開發者模式顯示；11/11 ChatGPT 介面報告 P1：開 App 等待畫面不再寫容量，背景下載狀態放這裡（09b preStatRow） */
  return `<div class="row" style="justify-content:space-between"><span class="muted">整包下載</span><b>約 ${szMB(S.all)}</b></div>${bg}
      <div class="row" style="justify-content:space-between"><span class="muted">這支手機已用</span><b id="aUse">計算中…</b></div>${DEVMODE()?`
      <details style="margin:2px 0 4px"><summary class="muted">🛠 下載大小細項（開發者）</summary><div class="muted" style="font-size:12.5px;line-height:1.75">・開 App 時先載好（程式、圖片、音效、字型）：${szMB(S.pre+S.code)}<br>・背景自動下載：棋力引擎 ${szMB(S.eng)}、特級大師對局 ${szMB(S.gm)}<br>・用到時才下載：背景音樂 ${szMB(S.bgm)}、其他圖片 ${szMB(S.other)}${opt.length?`<br>・選購：${opt.map(x=>esc(x[0])+" "+szMB(x[1])).join("、")}`:""}</div></details>`:""}`}
function aboutUsage(el){try{if(!navigator.storage||!navigator.storage.estimate){el.textContent="這個瀏覽器查不到";return}
  navigator.storage.estimate().then(e=>{el.textContent=szMB(e.usage||0)}).catch(()=>{el.textContent="查不到"})}catch(e){el.textContent="查不到"}}
/* 開發者 11/11 選規劃書方案 10：關於與開源授權。非商業計畫、Pikafish GPL-3.0（引擎原始碼與改過的檔案在公開倉庫 pikafish-src/）、
   pikafish.nnue 照 NNUE-License（不得未經許可商用）、其他第三方元件與字型的授權、資料存在哪裡。著作權措辭照 README（不能整包宣告保留一切權利，會跟 GPL 牴觸） */
const ABOUT_REPO="https://github.com/raysonchen2023-cloud/xiangqi-lab";
function aboutLicSheet(){const L=(u,t)=>`<a href="${u}" target="_blank" rel="noopener">${t}</a>`,R=ABOUT_REPO+"/blob/main/";
  sheet("📜 關於與開源授權",b=>{b.innerHTML=`<div style="line-height:1.85;font-size:15px">
    <p style="margin:0 0 10px">《象棋千秋》是一個推廣中國象棋的<b>免費、非商業</b>學習計畫：不收費、沒有內購、沒有廣告。</p>
    <p style="margin:0 0 10px">《象棋千秋》© 2026 陳泓昇。程式碼（包括寫在程式裡的介面文字、場景小故事和對白）依 GNU GPL 第 3 版或更新版（GPL-3.0-or-later）授權，原始碼公開：${L(ABOUT_REPO+"/tree/main/source","source/")}、${L(R+"LICENSE","授權全文")}。自製的圖片、音樂、3D 模型和長篇劇情依 CC BY-NC-SA 4.0 授權（${L(R+"LICENSE-ASSETS.md","說明")}）；特級大師小傳和語音檔照原來源的條件。下面這些別人做的元件，照它們各自的授權使用。</p>
    <div class="sec-t" style="margin-top:6px">象棋引擎 Pikafish</div>
    <p style="margin:0 0 6px">電腦下棋和複盤分析用的是開源引擎 Pikafish（版本 Pikafish-2026-09-06），編成 WebAssembly 在手機裡跑，授權是 GNU GPL 第 3 版。</p>
    <p style="margin:0 0 6px">照 GPL 的規定，我們改過的引擎原始碼和建置方法都公開：${L(ABOUT_REPO+"/tree/main/pikafish-src","pikafish-src（改過的檔案＋建置腳本）")}；原版原始碼：${L("https://github.com/official-pikafish/Pikafish","official-pikafish/Pikafish")}；授權全文：${L(R+"LICENSE-Pikafish-GPL3.txt","GPL-3.0")}。</p>
    <p style="margin:0 0 10px">引擎的神經網路權重（pikafish.nnue）照 Pikafish 的 ${L(R+"NNUE-License.md","NNUE 授權")}：只能合法使用、未經許可不得商用。《象棋千秋》不做商業用途。</p>
    <div class="sec-t">其他開源元件</div>
    <ul style="margin:0 0 10px;padding-left:1.2em">
      <li>three.js（3D 園子、立體棋子）— MIT</li>
      <li>opencc-js（繁簡轉換）— MIT（${L(R+"LICENSE-opencc-js.txt","授權全文")}）</li>
      <li>jsQR（換手機時掃 QR 碼）— Apache-2.0</li>
      <li>QRCode.js（產生 QR 碼）— MIT</li>
      <li>朝代字型：芫荽、全字庫正楷體、霞鶩文楷、源流明體、朱雀仿宋、仙人掌明體、源雲明體 — SIL OFL 1.1，只取用到的字、改了內部名稱（${L(R+"data/fonts/LICENSES.md","字型清單與來源")}）</li></ul>
    <div class="sec-t">你的資料存在哪裡</div>
    <p style="margin:0 0 6px">對局紀錄、解題進度、角色、收藏和設定，都存在<b>這支手機</b>的瀏覽器裡，不會上傳到雲端。</p>
    <p style="margin:0 0 6px">會送出去的只有：線上大廳對局時的棋步和名字、你自己寫的意見回饋和檢舉，以及設定頁「隱私」說明寫到的玩家登記（可以關掉）。</p>
    <p style="margin:0 0 8px">想把這支手機裡的資料全部刪掉，按下面這顆按鈕（會確認兩次）；刪掉 App、或在瀏覽器清除這個網站的資料也一樣。刪掉後<b>無法復原</b>；換手機前請先用設定裡的「📱 換手機」把存檔搬過去。</p>
    <button class="btn ghost" id="alWipe" style="width:100%;color:var(--red);border-color:var(--red)">🗑 刪除這支手機的全部資料</button></div>
    <button class="btn" id="alOk" style="width:100%;margin-top:14px">知道了</button>`;b.querySelector("#alOk").onclick=closeSheet;b.querySelector("#alWipe").onclick=()=>{closeSheet();setTimeout(wipeAsk,120)}})}
/* 送審四份說明文件（11/11 評審要「隱私與資料使用、素材與授權、版本與差異、已知限制」，App 內連得到、內容跟實際行為一致）：data/docs/<檔>.md。
   正本在 xiangqi-db/art/docs/（build-site.js 把 art/ 各資料夾整個複製到 site/data/，site/ 每次建置會先清空，所以別只改 site/data/docs/）。
   入口：設定「隱私」卡片最下面的四顆按鈕（xqDocBtns；07s2 小鎖匣搬過去也照樣能點），07s4 文牒的「隱私說明」小卡也接同一組。按鈕只帶 data-xqdoc，點選由 document 上一個委派處理。
   只認簡單 Markdown：# 第一層不顯示（sheet 已有標題）、## 段標題、### 小標、- 或 1. 清單、**粗體**、`字`、[字](https://…)、空行分段；先 esc 再轉，不吃 HTML。
   讀不到（沒網路、檔還沒發布）就直說讀不到。隱私那份最下面接「刪除這支手機的全部資料」（wipeAsk 本身確認兩次）。前綴 xqDoc */
/* 棋規選項（11/11 Gemini 架構報告第一項；註冊表在 core 的 RULESETS，偏好存在 local.js 的 XQ_rulePref）。對局畫面的標示在 00-util.js 的 ruleNote（棋規徽章） */
/* 11/12 臺灣棋規正式版（評比第 9 輪 F4）上線：原型 tw_proto 標 hidden、選單不列；之前選原型的人打開設定頁時改成正式版 tw113 */
const rsDef=()=>(window.XQCore&&XQCore.RULESET_DEFAULT)||"qiqiu_casual",rsCur=()=>{try{let v=window.XQ_rulePref?XQ_rulePref():rsDef();const RS=window.XQCore&&XQCore.RULESETS;if(RS&&RS[v]&&RS[v].hidden&&RS.tw113&&window.XQ_setRulePref)v=XQ_setRulePref("tw113");return v}catch(e){return rsDef()}};
const rsName=id=>{const R=window.XQCore&&XQCore.RULESETS&&XQCore.RULESETS[id];return R?R.name:"千秋休閒規則"};
function rsOpts(){const RS=(window.XQCore&&XQCore.RULESETS)||{},cur=rsCur();return Object.values(RS).filter(R=>!R.hidden).map(R=>`<button data-rs="${esc(R.id)}"${R.id===cur?' class="on"':""}>${esc(R.short||R.name)}${R.status==="prototype"?"（原型）":""}</button>`).join("")}
function rsNote(){const R=window.XQCore&&XQCore.RULESETS&&XQCore.RULESETS[rsCur()];
  if(R&&R.id==="tw113")return'依《中華民國象棋規則》113 年修訂版：長將、長捉要<b>三次循環</b>（同一局面第 4 次出現）仍不變著才判負；雙方長將、雙方長捉、雙方都沒犯例判和；同類子受牽制不能離線仍算長捉；雙方共走 100 著沒吃子判和。<b>可計積分</b>：晉級賽照這一套判；線上要<b>雙方都選這一套</b>才計積分，否則是友誼賽。循環路線不同、同類子換位這兩種 App 判不了，會提醒變著或協議和棋。 <button type="button" class="lk" data-xqdoc="rules">⚖️ 怎麼判</button>';
  if(!R||R.status!=="prototype")return'亞洲棋例（直接捉子）的子集。晉級賽、線上積分都用這一套。 <button type="button" class="lk" data-xqdoc="rules">⚖️ 怎麼判</button>';
  return'⚠ <b>原型，不計積分</b>：只改了「長將、長捉循環到第 3 次先提醒、交雙方協議」這一條；臺灣條文已找到《中華民國象棋規則》113 年修訂版，但原型還沒照條文改判法（差在哪見文件）。只用在之後新開的挑戰電腦（非晉級賽）、同機對下、車輪戰、線上邀請；晉級賽照舊用千秋休閒規則。 <button type="button" class="lk" data-xqdoc="rules">⚖️ 差在哪</button>'}
const XQDOC={privacy:["privacy","🔒 隱私與資料使用"],family:["family","👨‍👩‍👧 家長與兒童模式"],credits:["credits","🎨 素材與授權"],release:["release-notes","🏷 版本與差異"],limits:["limits","⚠️ 已知限制"],evidence:["evidence","✅ 自動測試紀錄"],history:["history","📜 文史考據"],rules:["rules","⚖️ 棋規與裁決"],architecture:["architecture","🌐 連線與資料"],tour:["a11y-tour","🧭 空間導覽"],a11y:["a11y","📋 無障礙證據"],sound:["sound","🔊 音效設計"],ai:["ai-levels","🤖 電腦怎麼下"],funnel:["funnel","📊 新手數字"],foss:["foss","📦 開源對照"],cb:["colorblind","🎨 色弱模式"],blitz:["blitz","⚡ 快棋與預走"],focus:["focus-modes","🎬 純淨與老闆鍵"],daily:["daily","🌏 每日同題"],i18n:["i18n","🌐 英文介面"],android:["android","📱 Android"],support:["support","📮 聯絡與支援"]};   /* 評比第 10 輪 F3：電腦對手透明頁（各級參數＋批次測試，tools/ai-batch.js） */   /* 第 6 輪 F3：音效設計說明（art/docs/sound.md） */   /* 回饋 875（開發者 11/12「盤查類似的 不要換行」）：按鈕字縮到 7 字內，xqDocBtns 一格至少 9em、放不下就自動改一欄，按鈕不換行 */   /* 11/12 無障礙第 5 輪：設定 → ♿ 無障礙「📋 測試與證據」（a11y.md＝92 號稽核報告的副本，開頭是 P16.3～P16.5 怎麼驗證） */   /* 11/12 無障礙第 4 輪 P16.5：給看不到畫面的人在腦中建地圖（11c-a11ysnd.js 的 ? 說明卡、G 鍵也開這份） */
function xqDocBtns(){return`<div class="xqd-g" style="margin-top:10px">${Object.keys(XQDOC).map(k=>`<button type="button" class="btn ghost" data-xqdoc="${k}" style="font-size:13.5px;padding:8px 6px">${XQDOC[k][1]}</button>`).join("")}</div>`}
{const s=document.createElement("style");s.textContent=".xqd-g{display:grid;grid-template-columns:repeat(auto-fit,minmax(9em,1fr));gap:6px}.xqd-g>button{white-space:normal;line-height:1.25;overflow-wrap:anywhere;margin:0;width:auto;min-width:0}";document.head.append(s)}
/* 評比第 8 輪 F2、F5（ChatGPT、Gemini：「公開文件的 Markdown 連結、證據索引原樣顯示」）：相對連結也轉——
   別份說明（rules.md、rules-cases.md…）＝App 內直接打開那一份（data-xqdoc；不在 XQDOC 裡的照網址開新分頁）；evidence/ 的截圖＝圖片（![…](…)）或連結；
   只收安全的相對路徑（英數、%、-、_、.、/，不能有 ..）；#錨點不轉（標題 id 是流水號，對不上） */
const xqDocKey=f=>{for(const k in XQDOC)if(XQDOC[k][0]+".md"===f)return k;return null};
const xqDocRel=u=>/^[\w%.\-\/]+(#[^\s"'<>&]*)?$/.test(u)&&!/\.\./.test(u)&&!/^\//.test(u);
function xqDocLink(t,u){if(/^https:\/\//.test(u))return`<a href="${u}" target="_blank" rel="noopener">${t}</a>`;if(!xqDocRel(u))return t;
  const f=u.split("#")[0],k=/\.md$/.test(f)&&!f.includes("/")?xqDocKey(f):null;
  return k?`<button type="button" class="lk" data-xqdoc="${k}">${t}</button>`:`<a href="data/docs/${u}" target="_blank" rel="noopener">${t}</a>`}
function xqDocIn(s){return provDoc(esc(s)).replace(/\*\*([^*]+)\*\*/g,"<b>$1</b>").replace(/`([^`]+)`/g,"<code>$1</code>")
  .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g,(m,t,u)=>xqDocRel(u)&&/\.(png|jpe?g|webp|gif)$/i.test(u)?`<img src="data/docs/${u}" alt="${t}" loading="lazy" decoding="async" style="display:block;max-width:100%;height:auto;margin:6px 0;border-radius:6px;border:1px solid var(--line)">`:/^https:\/\//.test(u)?`<a href="${u}" target="_blank" rel="noopener">🖼 ${t||"圖片"}</a>`:t)
  .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,(m,t,u)=>xqDocLink(t,u))}
/* 11/12 無障礙第 5 輪 P16.5：文件改成真的標題階層——# ＝h1（卡片標題已經寫了，所以只給螢幕報讀）、## ＝h2（每一段包成 section，讀螢幕可以用標題、地標跳）、### ＝h3；
   | 表格 | 轉成 table（th scope=col，窄螢幕在表格裡左右捲，不會整頁橫捲）；> 引言照一般段落 */
let xqDocN=0;
function xqDocTbl(rows){const cell=r=>r.replace(/^\||\|$/g,"").split("|").map(c=>c.trim()),R=rows.filter(r=>!/^\|[\s:|-]+\|$/.test(r)).map(cell);if(!R.length)return"";const[h,...b]=R;
  return`<div style="overflow-x:auto;margin:0 0 10px"><table class="xqd-tb"><thead><tr>${h.map(c=>`<th scope="col">${xqDocIn(c)}</th>`).join("")}</tr></thead><tbody>${b.map(r=>`<tr>${r.map(c=>`<td>${xqDocIn(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`}
function xqDocHtml(md){const out=[];let ls=null,pa=[],tb=null,sec=false,fc=null;
  const fp=()=>{if(pa.length){out.push(`<p style="margin:0 0 8px">${xqDocIn(pa.join(""))}</p>`);pa=[]}},fl=()=>{if(ls){out.push(`<${ls.t} style="margin:0 0 10px;padding-left:1.3em">${ls.a.join("")}</${ls.t}>`);ls=null}},ft=()=>{if(tb){out.push(xqDocTbl(tb));tb=null}};
  for(const raw of String(md||"").split(/\r?\n/)){const l=raw.trim();let m;
    /* 評比第 8 輪 F5：``` 程式碼區塊原樣等寬顯示（窄螢幕在框裡左右捲）；--- 分隔線畫成線 */
    if(/^```/.test(l)){if(fc){out.push(`<pre class="xqd-pre" style="overflow-x:auto;margin:0 0 10px;padding:8px 10px;border-radius:6px;background:rgba(0,0,0,.05);font-size:13px;line-height:1.5"><code>${esc(fc.join("\n"))}</code></pre>`);fc=null}else{fp();fl();ft();fc=[]}continue}
    if(fc){fc.push(raw.replace(/\s+$/,""));continue}
    if(/^(-{3,}|\*{3,}|_{3,})$/.test(l)){fp();fl();ft();out.push('<hr style="border:0;border-top:1px solid var(--line);margin:12px 0">');continue}
    if(!l){fp();fl();ft();continue}
    if(/^\|.*\|$/.test(l)){fp();fl();(tb=tb||[]).push(l);continue}
    ft();
    if((m=/^(#{1,3})\s+(.*)$/.exec(l))){fp();fl();const n=m[1].length,id="xqd"+(++xqDocN);
      if(n===1)out.push(`<h1 class="ax-sr" id="${id}">${xqDocIn(m[2])}</h1>`);
      else if(n===2){if(sec)out.push("</section>");sec=true;out.push(`<section aria-labelledby="${id}"><h2 class="sec-t xqd-h2" id="${id}">${xqDocIn(m[2])}</h2>`)}
      else out.push(`<h3 class="xqd-h3" id="${id}">${xqDocIn(m[2])}</h3>`);continue}
    if((m=/^(?:([-*])|\d+\.)\s+(.*)$/.exec(l))){fp();const t=m[1]?"ul":"ol";if(ls&&ls.t!==t)fl();(ls=ls||{t,a:[]}).a.push(`<li style="margin-bottom:4px">${xqDocIn(m[2])}</li>`);continue}
    if((m=/^>\s?(.*)$/.exec(l))){fl();pa.push(m[1]);continue}
    fl();pa.push(l)}
  if(fc)out.push(`<pre class="xqd-pre" style="overflow-x:auto;margin:0 0 10px"><code>${esc(fc.join("\n"))}</code></pre>`);   /* 沒收尾的 ``` 也照樣顯示 */
  fp();fl();ft();if(sec)out.push("</section>");return out.join("")}
function xqDocSheet(k){const d=XQDOC[k];if(!d)return;
  sheet(d[1],b=>{b.innerHTML='<div class="muted" style="padding:14px 0;text-align:center">讀取中…</div>';
    fetch("data/docs/"+d[0]+".md?v="+encodeURIComponent(window.XQ_BUILD||"")).then(r=>r.ok?r.text():"").catch(()=>"").then(t=>{if(!b.isConnected)return;
      b.innerHTML=(t&&!/^\s*</.test(t)?`<article class="xqdoc" style="line-height:1.8;font-size:15px">${xqDocHtml(t)}</article>`:'<div class="card muted" style="line-height:1.7">現在讀不到這份說明（可能沒有網路）。連上網路後再打開一次。</div>')
        +(k==="privacy"&&typeof wipeAsk==="function"?'<button type="button" class="btn ghost" id="xqDocWipe" style="width:100%;margin-top:12px;color:var(--red);border-color:var(--red)">🗑 刪除這支手機的全部資料</button>':"")
        +'<button type="button" class="btn" id="xqDocOk" style="width:100%;margin-top:12px">知道了</button>';
      b.querySelector("#xqDocOk").onclick=closeSheet;const w=b.querySelector("#xqDocWipe");if(w)w.onclick=()=>{closeSheet();setTimeout(wipeAsk,120)}})})}
document.addEventListener("click",e=>{const x=e.target&&e.target.closest&&e.target.closest("[data-xqdoc]");if(!x)return;e.preventDefault();try{vibrate(5)}catch(err){}xqDocSheet(x.dataset.xqdoc)});
/* 開發者 11/11 選「刪除本機資料按鈕」（規劃書 A04）：兩次確認後，清掉這個 App 存在手機裡的東西再重開。
   只清自己的鍵（m_、xq_ 開頭）和三個資料庫的內容，不動同一個網址底下別的網頁的資料；下載過的棋譜庫、引擎、圖片不是個人資料，留著不用重抓。
   資料庫用「打開、清空每一張表」而不是整個刪掉——App 自己還開著連線，整個刪會被擋住；清完把寫入關掉再重開，免得離開頁面時的自動存檔又寫回去 */
function wipeAsk(){
  if(window.XQNet&&XQNet.playing&&XQNet.playing())return modal(`<div class="em">⏳</div><h2>對局還在進行</h2><p>線上對局下完（或認輸）之後，才能刪除資料。</p>`,[["好",null]]);
  modal(`<div class="em">🗑</div><h2>刪除這支手機的全部資料？</h2><p>會刪掉：全部對局紀錄和棋譜、解題和故事進度、每一格存檔、角色與收藏、設定、暱稱和線上積分。</p><p class="muted" style="font-size:13px">只刪這支手機裡的。已經送出的意見回饋、檢舉和玩家登記，還有別人手機上留著的對局紀錄，這裡刪不到；伺服器上的請先用設定 → 隱私「🗑 申請刪除我在伺服器上的資料」（刪掉手機資料後裝置代號會換新，就對不到了）。下載過的棋譜庫和引擎會留著，不用重新下載。</p>`,[["下一步",()=>setTimeout(wipeAsk2,120)],["不要刪",null,true]])}
function wipeAsk2(){modal(`<div class="em">⚠️</div><h2>真的要刪除嗎？</h2><p><b>刪掉就救不回來。</b></p><p class="muted" style="font-size:13px">想留著，先按「不要刪」，到設定用「📱 換手機」把存檔搬到別支手機。</p>`,[["🗑 全部刪除",wipeAllData],["不要刪",null,true]])}
/* v5 改善單 R06：原本完成、出錯、被擋、逾時都走同一個結束，失敗了 App 照樣重開、看起來像刪好了。
   改成回報每個資料庫的結果 st：done 清空了、empty 本來就沒有表、none 本來就沒有這個資料庫、error 清的時候出錯、blocked 被別的連線擋住、timeout 超過 ms 毫秒沒回應 */
function wipeDb(n,ms){return new Promise(res=>{let done=false,fresh=false;const fin=(st,msg)=>{if(!done){done=true;res({n,st,msg:msg||""})}};setTimeout(()=>fin("timeout"),ms||4000);
  try{const q=indexedDB.open(n);q.onupgradeneeded=()=>{fresh=true;try{q.transaction.abort()}catch(e){}};   /* 本來就沒有這個資料庫：取消建立，不留空殼 */
    q.onerror=()=>fin(fresh?"none":"error",q.error&&q.error.name);q.onblocked=()=>fin("blocked");
    q.onsuccess=()=>{const db=q.result;try{const names=[...db.objectStoreNames];if(!names.length){db.close();return fin("empty")}
      const tx=db.transaction(names,"readwrite");names.forEach(s=>tx.objectStore(s).clear());
      tx.oncomplete=()=>{try{db.close()}catch(e){}fin("done")};tx.onerror=tx.onabort=()=>{try{db.close()}catch(e){}fin("error",tx.error&&tx.error.name)}}catch(e){try{db.close()}catch(_){}fin("error",e.name)}}}catch(e){fin("error",e.name)}})}
const WIPE_NAME={"xqlab":"對局紀錄和棋譜","xqlab-save":"目前的進度","xqlab-slots":"存檔格"},WIPE_WHY={error:"刪的時候出錯",blocked:"被另一個開著的 App 分頁擋住",timeout:"手機太久沒回應"};
async function wipeAllData(){toast("正在刪除這支手機的資料…");
  try{window.XQNet&&XQNet.forget&&XQNet.forget()}catch(e){}await new Promise(r=>setTimeout(r,500));   /* 伺服器上保留的在線狀態、戰績摘要先清掉 */
  try{Storage.prototype.setItem=function(){}}catch(e){}
  for(const S of[localStorage,sessionStorage])try{Object.keys(S).filter(k=>/^(m_|xq|rsAsked|rsBoot|btAt|pq_)/.test(k)).forEach(k=>S.removeItem(k))}catch(e){}
  const R=[];for(const n of["xqlab","xqlab-save","xqlab-slots"])R.push(await wipeDb(n));
  /* R06：有任何一個沒刪成，就不要重開假裝刪好了；講清楚哪一份、為什麼，可以再試一次（文字設定已經清掉，再試只會補刪資料庫） */
  const bad=R.filter(r=>!/^(done|empty|none)$/.test(r.st));
  if(bad.length)return modal(`<div class="em">⚠️</div><h2>有些資料還沒刪掉</h2><p>${bad.map(r=>`・${esc(WIPE_NAME[r.n]||r.n)}：${esc(WIPE_WHY[r.st]||r.st)}`).join("<br>")}</p><p class="muted" style="font-size:13px">先把其他開著這個 App 的分頁或視窗關掉，再按「再試一次」。</p>`,[["🗑 再試一次",wipeAllData],["先這樣",()=>{try{history.replaceState(null,"",location.pathname+"#/")}catch(e){}location.reload()},true]]);
  try{IDBObjectStore.prototype.put=IDBObjectStore.prototype.add=function(){throw new Error("資料刪除中")}}catch(e){}
  try{history.replaceState(null,"",location.pathname+"#/")}catch(e){}location.reload()}
/* 意見回饋 531：檢查更新（設定 → 系統 → 關於） */
async function updCheck(b){b.disabled=true;b.textContent="檢查中…";const r=window.XQ_checkUpdate?await XQ_checkUpdate():{};
  if(!r.n){b.textContent="沒有網路";b.disabled=false;return}if(r.a===r.n){b.textContent="✓ 已是最新版";return}b.textContent="下載新版中…";setTimeout(()=>location.reload(),6000)}
/* 回饋 846（開發者 11/9 選：字級放大）：App 內字級 小／標準／大／特大＝0.9／1／1.15／1.3 倍。
   html 上掛 data-fz 和 --fz（標準就拿掉 data-fz，畫面跟以前一模一樣）；m.css 照 --fz 放大面板、卡片、對局文字、小說、設定頁、頂欄標題，
   滿版圖上的金框標籤只跟著放大一半（--fzL：0.95／1／1.075／1.15），免得壓到別的標籤；棋盤上的棋子字不跟著變 */
const FZ_STEPS=[["s","小",.9],["n","標準",1],["l","大",1.15],["xl","特大",1.3],["xxl","超大",1.6],["max","最大",2]];   /* 11/12 無障礙（P16 低視力）：多「超大 1.6」「最大 2.0」 */
/* 11/12 開發者：手機字級調大，App 自動跟著。沒動過開關、也沒在 App 裡自己選過字級，就算開著；選了字級或關掉開關就照玩家的 */
function fzSysOn(){const v=store.get("fzSys",null);return v==null?store.get("fontSize",null)==null:!!v}
function fzApply(){const r=document.documentElement;let k=store.get("fontSize","n"),z=(FZ_STEPS.find(x=>x[0]===k)||FZ_STEPS[1])[2];
  if(fzSysOn()&&typeof axmSysFz==="function"){const q=axmSysFz();if(q){k=q[0];z=q[1]}}   /* 11/12 無障礙：跟著系統字級（11b-a11y.js） */
  if(z===1){delete r.dataset.fz;r.style.removeProperty("--fz");r.style.removeProperty("--fzL")}else{r.dataset.fz=k;r.style.setProperty("--fz",String(z));r.style.setProperty("--fzL",String(Math.round((1+(z-1)/2)*1000)/1000))}setTimeout(()=>{try{fzFit()}catch(e){}},60)}
fzApply();
/* 回饋 846（開發者 11/9 選：字級放大）：滿版圖上的金框標籤放大後，有的本來就貼得很近（375 寬的設定房間、驛站、棋譜庫、錯棋重練），會疊到。
   fzFit 每一頁量一次：先暫時用標準大小量（.fz-base），再量放大後；放大後疊到別的標籤或出口、標準時沒疊到的，那幾個標籤加 fz-no 不放大。
   換頁（畫面有新節點）、轉向、圖載入完都會重量；最多每 0.4 秒一次。角色（shw-me）和它頭上的提示不算出口 */
/* 11/12 開發者 iPhone 實測（自動跟著系統字級、放到 2 倍）：貼邊的標籤（官階、棋子聲）放大後被畫面左右邊切掉。
   fzPull 把放大後超出圖框的標籤往內推回來（用 margin 推，因為 translate 已被港口視差 07n、角色讓位 07w 拿去用），推完再檢查疊到 */
function fzUnpull(e){e.classList.remove("fz-sh");e.style.marginLeft="";e.style.marginTop=""}
function fzPull(L,P){const pr=P.getBoundingClientRect(),l=Math.max(pr.left,0)+2,rr=Math.min(pr.right,innerWidth)-2,t=pr.top+2,b=pr.bottom-2,H=!!(P.dataset&&P.dataset.hmc);
  L.forEach(e=>{if(H){e.classList.remove("fz-sh");e.style.marginTop=""}else fzUnpull(e);const q=e.getBoundingClientRect(),dx=H?0:q.left<l?l-q.left:q.right>rr?rr-q.right:0,dy=q.top<t?t-q.top:q.bottom>b?b-q.bottom:0;
    if(Math.abs(dx)>=1||Math.abs(dy)>=1){e.classList.add("fz-sh");if(!H)e.style.marginLeft=Math.round(dx)+"px";e.style.marginTop=Math.round(dy)+"px"}})}   /* hspx 開發者 11/13「今日推薦還是會左右抖一下」：首頁的左右貼邊只歸 07z hmClamp 管（它在頁面上標 data-hmc）；這裡、07t3 r07Push、07f shpFit 看到 data-hmc 就不碰左右，不再互相蓋來蓋去 */
/* 評比第 5 輪（截圖 B10、Gemini 改善清單第 1 項）：440 寬的練功房，段位牌在標準字級就被畫面左邊切掉。場景圖比畫面寬時，貼邊的標籤一律推回看得到的範圍（不只放大字級時）；標準字級只推回、不縮字 */
function fzFit(){const r=document.documentElement;if(!["l","xl","xxl","max"].includes(r.dataset.fz)){document.querySelectorAll(".fz-no").forEach(e=>e.classList.remove("fz-no"));
    document.querySelectorAll(".shp-page").forEach(P=>{const L=[...P.querySelectorAll(".shp-spot,.shp-hs")].filter(e=>e.getClientRects().length);if(L.length)fzPull(L,P)});return}
  const LS=".shp-spot,.shp-hs",sep=(a,b)=>Math.max(Math.max(a.left,b.left)-Math.min(a.right,b.right),Math.max(a.top,b.top)-Math.min(a.bottom,b.bottom));   /* 兩個框的間隔（負的＝疊到）；放大後間隔不到 2px、又比標準字級時更近，就算疊到 */
  document.querySelectorAll(".shp-page").forEach(P=>{const L=[...P.querySelectorAll(LS)].filter(e=>e.getClientRects().length);if(!L.length)return;
    const O=[...P.querySelectorAll("button,a,[role=button]")].filter(e=>!e.matches(LS+",.po-sight,.shw-me,.shw-hint")&&!e.closest(LS+",.shw-me")&&e.getClientRects().length),all=L.concat(O);
    L.forEach(e=>{e.classList.remove("fz-no");fzUnpull(e)});P.classList.add("fz-base");const b0=new Map(all.map(e=>[e,e.getBoundingClientRect()]));P.classList.remove("fz-base");
    for(let n=0;n<5;n++){fzPull(L,P);let ch=false;const R=new Map(all.map(e=>[e,e.getBoundingClientRect()]));
      L.forEach((A,i)=>{for(const B of L.slice(i+1).concat(O)){const s=sep(R.get(A),R.get(B));if(s<2&&s<sep(b0.get(A),b0.get(B))-.5)for(const x of[A,B])if(L.includes(x)&&!x.classList.contains("fz-no")){x.classList.add("fz-no");ch=true}}});
      if(!ch)break}
    fzPull(L,P)})}
{let t=0;const go=()=>{if(t)return;t=setTimeout(()=>{t=0;try{fzFit()}catch(e){}},400)};
  new MutationObserver(go).observe(document.documentElement,{childList:true,subtree:true});addEventListener("resize",go);
  document.addEventListener("load",e=>{if(e.target&&e.target.tagName==="IMG"&&e.target.closest&&e.target.closest(".shp-page"))go()},true)}
/* 回饋 848（色盲高對比）：高對比棋子打開時 html 掛 data-hicon，m.css 給只靠顏色的地方（朱紅推薦標籤、底欄目前那一格）加形狀 */
function hcApply(){document.documentElement.toggleAttribute("data-hicon",!!store.get("hiCon",false))}
hcApply();
/* 開發者 11/11 選「專注棋盤模式」（規劃書 D08）：開了以後，下棋一律用平面棋盤（朝代擂台仍在園子 3D，回饋 319），
   不放開局卷軸、吃子水墨字，有棋盤的頁面把到處走的小帥收起來；將軍字樣、勝負畫面照舊（各有自己的開關） */
function focusOn(){try{return!!store.get("focusBoard",false)||!!store.get("axMode",false)}catch(e){return false}}   /* 11/12 無障礙：螢幕報讀與鍵盤模式也一律平面棋盤、收起裝飾 */
function focusApply(){document.documentElement.toggleAttribute("data-focus",focusOn())}
focusApply();document.head.appendChild(Object.assign(document.createElement("style"),{textContent:"html[data-focus]:has(#bbox) .xqbot{display:none!important}"}));
function Settings(v){
  setTop(typeof i18nT==="function"?i18nT("set.title","設定"):"設定",false,[...(OFF&&DEVMODE()?[["📋",openFbAdmin,"意見回饋管理"]]:[]),...(typeof i18nSheet==="function"?[["🌐",i18nSheet,"語言 Language"]]:[])]);   /* 評比第 14 輪 F1：頂欄 🌐 選語言（繁體／簡體／English，07i18n.js），看不懂中文的人也找得到 */   /* 意見回饋 570：意見回饋管理放設定頁右上角 */setTabs(true,"#/settings");
  // 設定分成四個分頁，一次只看一類（意見回饋 141）
  let stab=store.get("setTab","look");if(stab==="play")stab="look";   /* 意見回饋 526：分頁改成 角色／棋盤／聲音／系統，原本的「走棋」併進「棋盤」 */
  v.innerHTML=`<div class="pad home">
    <div class="st-tabs" id="sgTabs" style="position:static;margin:4px 0 10px">${[["bot","🙂","角色"],["look","♟","棋盤"],["sound","🔊","聲音"],["more","⚙","系統"]].map(([k,e,l])=>`<button data-k="${k}" data-i18n="set.tab.${k}"><i class="tic" data-ic="t_${k}">${e}</i> ${l}</button>`).join("")}</div>
    <div data-pane="look">
    <div class="card" style="padding:10px"><div id="pv" style="max-width:300px;margin:0 auto"></div>
      <div class="opt" id="tbb" style="justify-content:center;margin-top:8px"><!-- 意見回饋 620：「示範一步」跟「走一步」重複，只留走一步（會照設定播特效和音效） -->${[["mv","♟ 走一步"],["cap","💥 吃子"],["ck","⚔ 將軍"],["op","🚩 開局動畫"]].map(([k,l])=>`<button data-tst="${k}">${l}</button>`).join("")}</div></div>   <!-- 意見回饋 537：預覽和測試併成一個棋盤；547：小字提示都拿掉 -->
    <div class="sec-t">棋盤的朝代樣式</div><p class="muted" style="font-size:12.5px;margin:0 2px 6px">只換棋盤和棋子的樣子；要去別的朝代，請到雲河星槎。</p><div class="eragrid erasw" id="era"></div>
    <div class="sec-t">棋盤風格</div>
    <label class="row" style="display:none"><span><b>3D 園子棋盤</b></span><input type="checkbox" class="sw" id="p3d"></label>   <!-- 意見回饋 488；672（開發者 11/6）：3D 園子棋盤、對手形象、棋子樣式不給玩家選，照目前的設定 -->
    <div class="thgrid thsw" id="th"></div>
    <div class="sec-t" style="display:none">對手形象</div><div class="opt" id="ol" style="display:none"></div>
    <div class="sec-t" style="display:none">棋子樣式</div><div class="opt" id="ps" style="display:none"></div>
    <details class="card" style="padding:10px 12px;margin-top:14px"><summary style="font-weight:700;cursor:pointer" data-i18n="set.more">⚙ 更多設定</summary>   <!-- 意見回饋 576（開發者）：只留「更多設定」，後面的說明拿掉 -->   <!-- 意見回饋 537：不常改的收在這裡 -->
    <div class="sec-t">深淺色</div><div class="opt" id="pt"></div><p class="muted" id="ptN" style="display:none"></p>${typeof sw7SetRow==="function"?sw7SetRow():""}
    <div class="sec-t" data-i18n="set.font">字體</div><div class="opt" id="ftM"></div>
    <div class="sec-t" id="fzT" data-i18n="set.fontSize">字級</div><div class="opt" id="fzM" role="group" aria-labelledby="fzT"></div><p class="muted" id="fzN" style="font-size:12.5px;margin:4px 2px 0">面板、對局文字、小說都跟著放大；棋盤上的棋子不變。</p>${typeof axmFzSysRow==="function"?axmFzSysRow():""}   <!-- 回饋 846（開發者 11/9 選：字級放大）；11/12 無障礙：跟著系統字級 -->
    <div class="sec-t" data-i18n="set.lang">文字</div><div class="opt" id="zhO" data-nocc>${[["tw","繁體中文"],["cn","简体中文"],["en","English"]].map(([k,l])=>`<button data-zh="${k}"${(typeof i18nCur==="function"?i18nCur():((window.XQ_ZH&&XQ_ZH.mode())||"tw"))===k?' class="on"':""}>${l}</button>`).join("")}</div>   <!-- 意見回饋 518：繁簡切換（zh.js） -->
    <div class="sec-t" data-i18n="set.rules">棋規</div><div class="opt" id="rsO">${rsOpts()}</div><p class="muted" id="rsN" style="font-size:12.5px;margin:4px 2px 0;line-height:1.6">${rsNote()}</p><div class="sec-t" data-i18n="set.pace">電腦下棋節奏</div><div class="opt" id="paceO">${[["real","擬真"],["fast","快速"]].map(([k,l])=>`<button data-pace="${k}"${store.get("cpuPace","real")===k?' class="on"':""}>${l}</button>`).join("")}</div><p class="muted" style="font-size:12.5px;margin:4px 2px 0;line-height:1.6">擬真：照局面難易決定想多久——開局 1～2 秒、一般 2～5 秒、難局最多 8 秒，只有一兩步可走時 1 秒內，像真人在想。快速：每步 1 秒左右。</p><label class="row" style="justify-content:space-between;padding:8px 2px"><span><b>⚡ 快棋模式</b><br><span class="muted" style="font-size:12.5px">動畫縮到最短、略過吃子／將軍／開局特效，電腦用快速節奏</span></span><input type="checkbox" class="sw" id="blitzSw" aria-label="快棋模式"></label>   <!-- 第 12 輪 F3：07pm-premove.js 監聽 #blitzSw -->
    <label class="row" style="justify-content:space-between;padding:8px 2px"><span><b>⏳ 預走</b><br><span class="muted" style="font-size:12.5px">電腦或對方還在想時，先點棋子和落點排好下一步，輪到你就自動走（平面、3D 園子、線上對局都可以）</span></span><input type="checkbox" class="sw" id="premoveSw" aria-label="預走"></label>   <!-- 第 12 輪 F3：07pm-premove.js 監聽 #premoveSw -->
    <label class="row" style="justify-content:space-between;padding:8px 2px"><span><b>🫲 左撇子單手模式</b><br><span class="muted" style="font-size:12.5px">返回、更多、關閉鍵移到左下角，方便左手拇指按；棋盤和文字方向不變</span></span><input type="checkbox" class="sw" id="leftySw" aria-label="左撇子單手模式"></label>   <!-- 第 12 輪：07lh-lefty.js 監聽 #leftySw（存檔、套用、提示都在模組裡） -->
    <label class="row" style="justify-content:space-between;padding:8px 2px"><span><b>🎬 純淨畫面</b><br><span class="muted" style="font-size:12.5px">對局只留棋盤、名字、棋鐘和著法，適合直播、截圖（Esc 或右上角 ✕ 還原）</span></span><input type="checkbox" class="sw" id="cleanSw" aria-label="純淨畫面"></label>   <!-- 第 12 輪：07fm-focus.js 監聽 #cleanSw（存檔、套用、提示都在模組裡） -->
    <label class="row" style="justify-content:space-between;padding:8px 2px"><span><b>🙈 老闆鍵</b><br><span class="muted" style="font-size:12.5px">電腦連按兩下 Esc、手機三指點一下，畫面換成試算表並靜音</span></span><input type="checkbox" class="sw" id="bossSw" aria-label="老闆鍵"></label>   <!-- 第 12 輪：07fm-focus.js 監聽 #bossSw（存檔、套用、提示都在模組裡） -->
    <label class="row" style="justify-content:space-between;padding:8px 2px"><span><b>📳 震動回饋</b><br><span class="muted" style="font-size:12.5px">落子、吃子、將軍、點錯時手機震一下（Android 有效；iPhone 的瀏覽器不支援震動）</span></span><input type="checkbox" class="sw" id="hapSw" aria-label="震動回饋"></label>   <!-- 第 11 輪 F4 電腦下棋節奏（local.js THINKPACE 讀 m_cpuPace）、X2 震動回饋（07hp-haptics.js 讀 haptic）；開關集中在設定頁由主控加 -->   <!-- 11/11 Gemini 架構報告第一項（評比循環 F3）：棋規選項，預設千秋休閒規則；原型清楚標示、不計積分 -->
    <label class="row" style="justify-content:space-between;padding:8px 2px"><span><b>高對比棋子</b><br><span class="muted" style="font-size:12.5px">黑子反白、提示加形狀，色弱也分得清</span></span><input type="checkbox" class="sw" id="hiCon" aria-label="高對比棋子（色弱也分得清）"></label>   <!-- 回饋 848（色盲高對比） -->
    <label class="row" style="justify-content:space-between;padding:8px 2px"><span><b>🎨 色弱模式</b><br><span class="muted" style="font-size:12.5px">黑子加黑環、上一步改朱橘加外框、評語和長條加符號；紅綠色弱也分得清，3D 園子也套用</span></span><input type="checkbox" class="sw" id="cbSw" aria-label="色弱模式"></label>   <!-- 第 11 輪 F3：07cb-colorblind.js 讀 cbMode -->
    ${typeof shpTiltRow==="function"?shpTiltRow():""}   <!-- 第 14 輪 X2：「📱 傾斜手機看景深」，07f-ship.js 產生整列並監聽 #shpTiltSw -->
    <label class="row" style="justify-content:space-between;padding:8px 2px"><span><b>專注棋盤模式</b><br><span class="muted" style="font-size:12.5px">下棋時只留平面棋盤：收起 3D 園子、開局卷軸、吃子水墨字和小帥（朝代擂台除外）</span></span><input type="checkbox" class="sw" id="focB" aria-label="專注棋盤模式（下棋時收起背景動畫與裝飾）"></label>   <!-- 開發者 11/11 選（規劃書 D08） -->${typeof pkPwRow==="function"?pkPwRow():""}${typeof chdFormRow==="function"?chdFormRow():""}
    <div class="sec-t" data-i18n="set.moveFx">走棋顯示與特效</div><div class="card sgc" id="mv"></div></details></div>
    <div data-pane="sound">   <!-- 意見回饋 541：聲音頁分成三張卡片：棋子聲、語音、氛圍 -->
      <div class="sec-t" style="margin-top:4px" data-i18n="set.sndPiece">${ETIMG("t_sound","","♟")} 棋子聲</div><div class="card sgc" id="snd"></div>
      <div class="sec-t" data-i18n="set.sndVoice">${ETIMG("t_play","","🗣")} 語音報子</div><div class="card sgc" id="snd2"></div>
      <div class="sec-t" data-i18n="set.sndAmb">${ETIMG("arena","","🥁")} 氛圍</div><div class="card sgc" id="snd3"></div></div>
    <div data-pane="bot">
    <div class="sec-t" style="margin-top:4px" data-i18n="set.myChar">我的角色</div><div class="card row" style="gap:10px;align-items:center;margin-bottom:6px">   <!-- 意見回饋 506：精簡成一張小卡；522：跟官階、棋子、顯示放在同一個「角色」分頁 -->
      <img id="meFig" role="button" aria-label="看我的 3D 角色" src="${meImg()}" ${meImgTag(myStyle(),mySex())} alt="" style="width:46px;height:58px;object-fit:contain;flex:none;cursor:pointer" onerror="this.remove()">
      <div style="flex:1;min-width:0"><b>${esc(meName())}</b>   <!-- 意見回饋 668：選雲河七星的人也顯示對的名字 -->   <!-- 開發者 11/4：只寫「小帥Q版」或「小帥」，不寫「真實版」 --><br><span class="muted" style="font-size:13px">${esc(myName()||"還沒取名字")}</span></div>
      <button class="pill" id="obAgain">💾 存檔</button>${typeof DIFF!=="undefined"&&journey()?`<button class="pill" id="dfPick">🎚 ${esc(diffOf().n)}</button>`:""}   <!-- 意見回饋 675：航行難度，隨時可換 -->   <!-- 意見回饋 668：角色選定就鎖住，這裡改成存檔與讀檔 --><button class="pill" id="nmLook">改名</button></div>
    <a class="card row" href="#/weekly" style="gap:10px;align-items:center;margin-bottom:6px;color:inherit;text-decoration:none"><span style="font-size:24px">👨‍👩‍👧</span><span style="flex:1;min-width:0"><b>本週學習週報</b><br><span class="muted" style="font-size:13px">最近 7 天學了什麼，可以存成圖片給家長看</span></span><span class="muted">›</span></a>   <!-- 開發者 11/8 核准：家長學習週報（m/04c-weekly.js） -->
    ${(()=>{let p=0;try{p=(JSON.parse(localStorage.getItem("xq_cpuRate")||"null")||{}).pts||0}catch(e){}
      const TH=[1500,1150,1000,800,600,400,200,100,0],g=TH.findIndex(t=>p>=t)+1,lo=TH[g-1],hi=g>1?TH[g-2]:null,pc=hi?Math.round((p-lo)/(hi-lo)*100):100,ZH="〇一二三四五六七八九";
      return`<div class="sec-t">官階</div><div class="card" style="text-align:center"><div style="font-size:13px" class="muted"><span class="botN">${BOTN()}</span>目前的官階</div><div style="font-size:26px;font-weight:900;margin:2px 0">🏛 ${RANKT(store.get("era","classic"),g)}</div>
        <div class="muted" style="font-size:13px">電腦段位積分 ${p} 分${hi?`・再 ${hi-p} 分升${RANKT(store.get("era","classic"),g-1)}`:`・已經是最高的${RANKT(store.get("era","classic"),1)}`}</div>
        <div style="height:8px;border-radius:5px;background:var(--line);margin:10px 4px 4px;overflow:hidden"><div style="height:100%;width:${pc}%;background:var(--accent,#B3261E)"></div></div>
        <div class="muted" style="font-size:12px">到「挑戰電腦 → 🥇 晉級賽」贏棋升段，<span class="botN">${BOTN()}</span>就跟著升官（${RANKT(store.get("era","classic"),9)} → ${RANKT(store.get("era","classic"),1)}），官服、頂戴、腰帶都會換${RANK_NOTE[store.get("era","classic")]?`<br>${RANK_NOTE[store.get("era","classic")]}`:""}</div></div>`})()}
      <div class="sec-t">${myChar()?"本命棋子":"換一顆棋子"}</div><div class="card"><!-- 意見回饋 596：拿掉這段小字說明 -->
        ${myChar()?`<div class="row" style="gap:10px;align-items:center;margin:4px 0"><span class="bpc on" style="display:inline-flex;align-items:center;justify-content:center;color:#B3261E;flex:none;width:44px">${esc(botPc())}</span><span style="flex:1;font-size:14px">🔒 ${esc(meName())}就是「${esc(botPc())}」——雲河七星的棋子跟著角色，這段旅程不能換。</span></div>`:[["紅方","帥仕相俥傌炮兵"],["黑方","將士象車馬砲卒"]].map(([t,cs])=>`<div class="row" style="gap:6px;margin:6px 0;align-items:center"><span class="muted" style="font-size:12px;width:34px">${t}</span>${[...cs].map(c=>`<button data-bp="${c}" class="bpc${botPc()===c?" on":""}" style="color:${t==="紅方"?"#B3261E":"#1A1410"}">${c}</button>`).join("")}</div>`).join("")}
        <style>.bpc{flex:1;aspect-ratio:1;max-width:44px;border-radius:50%;border:2px solid var(--line);background:radial-gradient(circle at 40% 35%,#FFF8E6,#EBD3A0);font:900 19px/1 "Noto Serif TC",serif;padding:0}.bpc.on{border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 30%,transparent)}</style></div>
      <div class="sec-t" data-i18n="set.display">顯示</div><div class="card">
        <label class="row" style="justify-content:space-between"><span><b>顯示 3D 象棋小人</b><br><span class="muted">圓滾滾的棋子小人，跟著朝代換造型</span></span><input type="checkbox" class="sw" id="botT" ${botOn()?"checked":""}></label>
        <div style="border-top:1px solid var(--line);margin:8px 0"></div>
        <div class="row" style="gap:10px"><b style="white-space:nowrap">大小</b><input type="range" id="botSz" min="0.6" max="2" step="0.05" value="${store.get("botSize",.7)}" style="flex:1"><b id="botSzV" style="width:46px;text-align:right">${Math.round(store.get("botSize",.7)*100)}%</b></div></div>
      <details class="card" style="padding:10px 12px;margin-top:12px"><summary style="font-weight:700;cursor:pointer">怎麼跟<span class="botN">${BOTN()}</span>互動</summary><div class="gst" style="margin-top:8px"><div><i>👆</i><b>點一下</b><span>表演一個動作</span></div><div><i>✌️</i><b>點兩下</b><span>出去散步（停放時）</span></div><div><i>✋</i><b>長按</b><span>問<span>${ASKN()}</span>問題</span></div><div><i>🤏</i><b>拖動</b><span>放到任何地方</span></div><div><i>👆</i><b>點三下</b><span>鞠躬，先藏起來</span></div><p class="muted">藏起來之後，打開上面的「顯示 3D 象棋小人」就會回來</p></div></details>
      <div class="row" style="gap:8px;margin-top:10px"><button class="btn" id="askB" style="flex:1">💬 問<span>${ASKN()}</span></button><button class="btn ghost" id="botHome" style="flex:1">↩ 回到預設位置</button></div>
      ${typeof epSetHTML==="function"?epSetHTML():""}</div>   <!-- 開發者 11/8：🎐 旅途插曲的開關（07t-episodes.js） -->
    <div data-pane="more">${typeof axmSetRows==="function"?axmSetRows():""}   <!-- 11/12 無障礙：♿ 螢幕報讀與鍵盤模式、高對比主題 -->   <!-- 意見回饋 523：「我的名字」「顯示我的城市」拿掉（名字在角色分頁改，城市一律照網路位置自動顯示）；「其他」改名「系統」 -->
    <div class="sec-t" style="margin-top:4px" data-i18n="set.support">支援</div><div class="items" style="padding:0">
      <button class="item" id="fb"><span class="lb">${ETIMG("feedback","","💬")}</span><span class="tx"><b>意見回饋</b><span>回報錯誤、想要的功能</span></span><span class="muted">›</span></button><button class="item" id="fxh"><span class="lb">${ETIMG("o_fixes","","🛠")}</span><span class="tx"><b>修正紀錄</b><span>你回報、已經修好的問題</span></span><span class="muted">›</span></button>${OFF&&!isStandalone()?`<button class="item" id="a2h"><span class="lb">📲</span><span class="tx"><b>加到主畫面</b><span>從主畫面點圖示打開：全螢幕、沒網路也能下棋</span></span><span class="muted">›</span></button>`:""}
      <button class="item" id="sh"><span class="lb">${ETIMG("share","","📤")}</span><span class="tx"><b>分享給朋友</b><span>QR code・LINE</span></span><span class="muted">›</span></button></div>
    <div class="sec-t" data-i18n="set.about">關於</div><div class="card" id="about" style="line-height:1.9">
      <div class="row" style="justify-content:space-between"><span class="muted">App</span><b>象棋千秋</b></div>
      <div class="row" style="justify-content:space-between"><span class="muted">開發者</span><b>hungshengc</b></div>
      <div class="row" style="justify-content:space-between;align-items:center"><span class="muted">版本</span><span class="row" style="gap:8px;align-items:center"><b>${esc(window.XQ_BUILD&&!/__BUILD__/.test(window.XQ_BUILD)?window.XQ_BUILD:"開發中")}</b>${OFF?'<button class="pill" id="aUpd">檢查更新</button>':""}</span></div>   <!-- 意見回饋 531：系統更新從首頁搬到這裡 -->
      ${aboutSizes()}   <!-- 意見回饋 661：整包大小、這支手機已用多少 -->
      <button class="btn ghost" id="aLic" style="width:100%;margin-top:8px">📜 關於與開源授權</button>   <!-- 開發者 11/11 選規劃書方案 10 -->
      ${DEVMODE()?`<details style="margin-top:4px"><summary class="muted">${/* 意見回饋 355：開發者模式才看得到 */""}🛠 用了哪些語言寫的（開發者）</summary>
        <table class="st-lv" style="font-size:13px;margin-top:6px"><tr><th>語言</th><th>用在哪裡</th></tr>
        <tr><td>JavaScript</td><td>App 主程式、離線的對局和棋譜資料庫、線上大廳、3D 園子（three.js）</td></tr>
        <tr><td>HTML／CSS</td><td>所有畫面的版面、顏色、動畫</td></tr>
        <tr><td>C++ → WebAssembly</td><td>Pikafish 象棋引擎，編成 WebAssembly 在手機的瀏覽器裡跑</td></tr>
        <tr><td>Node.js（JavaScript）</td><td>建置網站、大廳 32 位常駐角色、出題、妙棋搜尋、難度校正</td></tr>
        <tr><td>Python</td><td>Gemini 出圖、棋譜資料整理</td></tr>
        <tr><td>PowerShell</td><td>Windows 上的啟動和出圖腳本</td></tr>
        <tr><td>Google Apps Script</td><td>意見回饋管理頁（接 Google 表單和試算表）</td></tr>
        <tr><td>JSON</td><td>棋譜、題庫、故事、朝代資料</td></tr></table>
        <div class="muted" style="font-size:12px;margin-top:4px">線上大廳用 MQTT 通訊協定連線；Pikafish 的神經網路權重另外下載。</div></details>`:""}</div>
    ${OFF?'<div class="sec-t">隱私</div><div class="card muted" style="font-size:13.5px;line-height:1.7">'+'App 每 7 天（或名字、段位改變時）會把你在大廳顯示的名字（用「稱號」就是稱號）、裝置代號（這支手機固定的一組隨機碼）、線上段位、使用時間摘要（總時間和最常待的地方）、App 版本、手機種類和螢幕大小送到開發者的 Google 表單，方便查問題、校正難度；不會送棋譜或存檔。另外會匿名記下你在哪一頁停很久、哪裡點了沒反應、哪個走法看不懂（每次開 App 換一組亂數，不含名字和裝置代號），用來改善不好懂的地方。跟電腦下完一盤，也會匿名送出這盤你每一步的評估分數和評語、總分、電腦級數、你的段位（用 App 自己產生的匿名碼，不含名字、裝置代號、棋譜和存檔），用來校正評分方式。做測驗、殘局、讀譜的對錯和秒數、新手引導走到哪一步、成長曲線，也會匿名送出（不含名字和裝置代號），用來校正題目難度、改善新手引導。卡住的地方保留 90 天，對局評分和學習進度保留一年，過期就刪；關掉開關後，手機裡還沒送出的也一起丟掉。意見回饋和檢舉在處理完後保留一年（有停權的保留到停權結束），玩家登記在最後一次登記後保留一年；線上大廳的戰績摘要 90 天沒更新就清，對局棋譜保留 30 天。你可以用下面的開關關掉；家長關閉線上大廳時也不會送。你按「意見回饋」或「檢舉」時，會另外送出你寫的內容和附的截圖（檢舉還會附對方最近的快捷語）。App 不會用網路位置查你在哪裡；線上大廳要不要顯示城市，由你在下面自己選（預設不顯示；用「稱號」的人一律不顯示）。'+'<label style="display:flex;align-items:center;gap:8px;margin-top:8px;color:var(--ink,inherit)"><span style="flex:1">📨 送出玩家登記給開發者</span><input type="checkbox" class="sw" id="repS" aria-label="送出玩家登記給開發者"></label>'+'<label style="display:flex;align-items:center;gap:8px;margin-top:8px;color:var(--ink,inherit)"><span style="flex:1">📍 匿名記錄卡住的地方</span><input type="checkbox" class="sw" id="stkS" aria-label="匿名記錄卡住的地方"></label>'+'<label style="display:flex;align-items:center;gap:8px;margin-top:8px;color:var(--ink,inherit)"><span style="flex:1">📊 匿名送出對局評分（校正分數用）</span><input type="checkbox" class="sw" id="cpaS" aria-label="匿名送出對局評分"></label>'+'<label style="display:flex;align-items:center;gap:8px;margin-top:8px;color:var(--ink,inherit)"><span style="flex:1">📈 匿名送出學習進度（新手引導、作答、成長曲線）</span><input type="checkbox" class="sw" id="lrnS" aria-label="匿名送出學習進度"></label>'+'<label style="display:flex;align-items:center;gap:8px;margin-top:8px;color:var(--ink,inherit)"><span style="flex:1">🏙 大廳顯示我的城市</span><select id="myCityS" style="font:inherit;padding:4px 6px;border-radius:8px">'+[["","不顯示"],...CITY_ZH.map(([,z])=>[z,z])].map(([v,l])=>'<option value="'+v+'"'+(String(store.get("myCity","")||"").replace(/^台北$/,"臺北")===v?" selected":"")+'>'+l+'</option>').join("")+'</select></label>'+'<button type="button" class="btn ghost" id="srvDelB" style="width:100%;margin-top:10px;font-size:13.5px">🗑 申請刪除我在伺服器上的資料</button><div id="srvDelSt" style="font-size:12.5px;margin-top:4px">'+esc(srvDelLine())+'</div>'+'<label class="row" style="justify-content:space-between;padding:8px 0;margin-top:6px"><span><b>🩺 每天自動送匿名健康摘要</b><br><span class="muted" style="font-size:12.5px">預設關。打開後每天最多一次，把錯誤次數、卡頓、啟動時間、App 版本、裝置類型送給開發者；不含名字、裝置代號、棋譜、存檔</span></span><input type="checkbox" class="sw" id="teleSw" aria-label="每天自動送匿名健康摘要"></label>'+'<button type="button" class="btn ghost" id="healB" style="width:100%;margin-top:10px;font-size:13.5px">📊 本機使用與健康紀錄</button>'+xqDocBtns()+'</div>':''}
    ${OFF?'<div class="sec-t">進階</div><div class="card"><label class="row" style="justify-content:space-between"><span><b>開發者模式</b><br><span class="muted">一般玩家不用打開。打開後才會顯示連線電腦、AI 對戰等開發者功能</span></span><input type="checkbox" class="sw" id="dm"></label></div>'
      +(DEVMODE()?'<div class="items" style="padding:0;margin-top:8px"><button class="item" id="fa"><span class="lb">📋</span><span class="tx"><b>意見回饋管理</b><span>看所有回饋和截圖，決定玩家的回饋要不要修</span></span><span class="muted">›</span></button><button class="item" id="cn"><span class="lb">🖥</span><span class="tx"><b>連線到開發者的電腦</b><span>看 AI 對戰、同步大師棋譜</span></span><span class="muted">›</span></button><button class="item" id="dvt"><span class="lb">🧪</span><span class="tx"><b>開發者測試台</b><span>不用等機率：直接掉進黑洞、叫出小黑洞／星門、開任一星系、重設黑洞篇進度</span></span><span class="muted">›</span></button><button class="item" id="rb"><span class="lb">🔄</span><span class="tx"><b>重置虛擬玩家</b><span>32 位棋友的積分、戰績、練習紀錄歸零；舊資料留在電腦上</span></span><span class="muted">›</span></button></div>':""):""}${OFF?'<div class="sec-t">📱 換手機</div><div class="card"><div class="row" style="gap:8px;flex-wrap:nowrap"><button class="btn" id="xfOut" style="flex:1;min-width:0;margin:0;white-space:nowrap;padding-left:6px;padding-right:6px">📤 舊手機產生碼</button><button class="btn ghost" id="xfIn" style="flex:1;min-width:0;margin:0;white-space:nowrap;padding-left:6px;padding-right:6px">📥 新手機輸入碼</button></div></div>':""}</div></div>`;
  let tbRefresh=()=>{};
  const showTab=()=>{if(stab==="look")tbRefresh();v.querySelectorAll("#sgTabs button").forEach(b=>b.classList.toggle("on",b.dataset.k===stab));v.querySelectorAll("[data-pane]").forEach(x=>x.hidden=x.dataset.pane!==stab)};
  v.querySelectorAll("#sgTabs button").forEach(b=>b.onclick=()=>{vibrate(5);stab=b.dataset.k;store.set("setTab",stab);showTab()});showTab();
  // 測試特效與音效（意見回饋）：用真的走棋流程（Board.draw 的 fresh＋fx）播放，所以會照設定開關
  const b0=parseFen(SAMPLE_FEN0),b1=parseFen(SAMPLE_FEN1),pv=Board(null);v.querySelector("#pv").append(pv.svg);   /* 意見回饋 537：預覽和測試特效用同一個棋盤 */
  {const tb=pv,S0=parseFen(START);let tbLast=b1;
    // 換了外觀（棋盤、棋子、朝代）後切回來，用目前外觀重畫最後的盤面（意見回饋 145）
    tbRefresh=()=>tb.draw(tbLast,{anim:false,last:tbLast===b1?SAMPLE_LAST:null});
    const mvb=(b,f,t)=>{const n=b.slice();n[t]=n[f];n[f]=null;return n};
    // 將軍用的簡單盤面：黑將、雙士；紅帥；紅俥從左邊橫走到中路將軍
    const CK=Array(90).fill(null);CK[4]="k";CK[3]="a";CK[5]="a";CK[85]="K";CK[72]="R";CK[33]="p";CK[60]="P";
    const play=(pre,f,t,ck)=>{unlockAudio();tb.draw(pre,{anim:false});tbLast=mvb(pre,f,t);setTimeout(()=>tb.draw(tbLast,{last:{f,t},fx:true,check:ck==null?-1:ck}),80)};
    v.querySelectorAll("[data-tst]").forEach(x=>x.onclick=()=>{vibrate(5);const k=x.dataset.tst;
      if(k==="mv")play(S0,70,67);                          // 炮二平五
      else if(k==="cap")play(mvb(S0,70,67),67,31);         // 中炮打中卒（兵當炮架）
      else if(k==="ck")play(CK,72,76,4);                   // 俥平到中路將軍
      else{unlockAudio();tb.draw(mvb(S0,70,67),{last:{f:70,t:67}});setTimeout(()=>openFx(tb.svg,"中炮","紅方開局"),150)}})}
  // 打開開發者模式要登入（關閉不用）
  const dm=v.querySelector("#dm");if(dm){dm.checked=DEVMODE();dm.onchange=()=>{
    if(!dm.checked){store.set("devMode",false);toast("已關閉開發者模式");return route()}
    dm.checked=false;devLogin(()=>{store.set("devMode",true);toast("已打開開發者模式");route()})}}
  const show=animate=>{if(animate){pv.draw(b0,{anim:false});setTimeout(()=>pv.draw(b1,{last:SAMPLE_LAST}),250)}else pv.draw(b1,{last:SAMPLE_LAST,anim:false})};
  (v.querySelector("#replay")||{}).onclick=()=>show(true);
  const th=v.querySelector("#th");
  const paint=()=>{const cur=store.get("boardTheme","wood3d"),ps=store.get("pieceStyle","3d");th.innerHTML="";
    for(const[k,name]of BOARD_THEMES){const b=document.createElement("button");b.className=k===cur?"on":"";const bd=Board(null);bd.draw(b1,{last:SAMPLE_LAST,theme:k,anim:false,arrow:false});
      b.append(bd.svg);const s=document.createElement("span");s.textContent=name;b.append(s);
      b.onclick=()=>{vibrate(5);store.set("boardTheme",k);paint();show(true)};th.append(b)}
    /* 意見回饋 537：棋盤風格也左右滑動，停在中間的那張就套用 */
    {const on=th.querySelector(".on");th._quiet=true;if(on)th.scrollLeft=Math.max(0,on.offsetLeft-12);setTimeout(()=>{th._quiet=false},250);
      th.onscroll=()=>{return;if(th._quiet)return;clearTimeout(th._t);th._t=setTimeout(()=>{const mid=th.scrollLeft+th.clientWidth/2;let best=null,bd=1e9,i=0;const ks=BOARD_THEMES.map(x=>x[0]);for(const x of th.children){const d=Math.abs(x.offsetLeft+x.offsetWidth/2-mid);if(d<bd){bd=d;best=i}i++}if(best!=null&&ks[best]!==store.get("boardTheme","wood3d"))th.children[best].click()},170)}}
    {const xo=v.querySelector("#xfOut"),xi=v.querySelector("#xfIn");if(xo)xo.onclick=()=>{vibrate(5);xfSend()};if(xi)xi.onclick=()=>{vibrate(5);xfRecv()}}
    /* 意見回饋 574（開發者）：外觀頁的 3D 園子棋盤、對手形象、棋子樣式拿掉 emoji */
    /* 意見回饋 442、456（開發者）：對手形象可以選——3D 立體小人（跟小帥一樣是立體的，每個人帽子、衣服不同）或畫好的立繪 */
    {const ol=v.querySelector("#ol");if(ol){const cur=store.get("oppLook","real");ol.innerHTML=[["3d","Q 版 3D"],["real","真實 3D"],["art","畫好的立繪"]].map(([k,l])=>`<button data-ol="${k}" class="${cur===k?"on":""}">${l}</button>`).join("");
      ol.querySelectorAll("[data-ol]").forEach(x=>x.onclick=()=>{vibrate(5);store.set("oppLook",x.dataset.ol);paint()})}}
    {const oa=v.querySelector("#obAgain");if(oa)oa.onclick=()=>{vibrate(5);saveSheet()}}{const dp=v.querySelector("#dfPick");if(dp)dp.onclick=()=>{vibrate(5);diffSheet(()=>{dp.textContent="🎚 "+diffOf().n})}}   /* 意見回饋 668 */
    v.querySelectorAll("[data-rs]").forEach(b=>b.onclick=()=>{vibrate(5);if(!window.XQ_setRulePref){toast("這個版本還不能切換棋規");return}const id=XQ_setRulePref(b.dataset.rs);
      v.querySelectorAll("[data-rs]").forEach(x=>x.classList.toggle("on",x.dataset.rs===id));const n=v.querySelector("#rsN");if(n)n.innerHTML=rsNote();
      toast(id===rsDef()?"⚖️ 已換回千秋休閒規則":"⚖️ 已換成"+rsName(id)+"：之後新開的自由對局才用，不計積分")});
    {v.querySelectorAll("[data-zh]").forEach(b=>b.onclick=()=>{vibrate(5);if(typeof i18nPick==="function")return i18nPick(b.dataset.zh);if(!window.XQ_ZH){toast("這個版本還不能切換");return}if(XQ_ZH.mode()===b.dataset.zh)return;toast(b.dataset.zh==="cn"?"切换成简体中文…":"切換成繁體中文…");setTimeout(()=>XQ_ZH.set(b.dataset.zh),300)})}
    {const mf=v.querySelector("#meFig");if(mf)mf.onclick=()=>{vibrate(5);figView(myLook()||{p:botPc(),e:store.get("era","classic"),g:9},"🙂 "+meName(),`<p class="muted" style="font-size:13.5px;margin:0">${esc(myName()||"還沒取名字")}・園子裡的你、線上對手看到的你都是這個樣子</p>${typeof wxBornLine==="function"?ageLine(wxBornLine()):""}`,[["關閉",()=>closeSheet(),true]],mf.src)}}   /* 意見回饋 534：點角色小卡上的小帥／小帥妹，跳出 3D 模型 */
    {const nl=v.querySelector("#nmLook");if(nl)nl.onclick=()=>{vibrate(5);nameSheet(false)};
     /* 意見回饋 519／520：從線上大廳按「改名」過來，直接捲到改名字的地方、亮一下，再打開改名視窗 */
     if(store.get("setFocus","")==="name"&&nl){store.set("setFocus","");setTimeout(()=>{const c=nl.closest(".card");c.scrollIntoView({block:"center",behavior:"smooth"});c.style.transition="box-shadow .3s";c.style.boxShadow="0 0 0 3px var(--accent,#B3261E)";setTimeout(()=>{c.style.boxShadow="";nameSheet(false)},700)},120)}}   /* 意見回饋 498：改名字只放在外觀這裡 */
    {const p3=v.querySelector("#p3d");if(p3){p3.checked=!!store.get("park3d",typeof pkDef3d==="function"?pkDef3d():true);p3.onchange=()=>{vibrate(5);store.set("park3d",p3.checked);toast(p3.checked?"下棋時會在 3D 園子裡":"下棋時用平面棋盤")}}}
    if(typeof chdFormBind==="function")chdFormBind(v);   /* 意見回饋 774 本命化形開關（07q-chardiff.js） */
    {v.querySelectorAll("[data-pace]").forEach(b=>b.onclick=()=>{vibrate(5);store.set("cpuPace",b.dataset.pace);v.querySelectorAll("[data-pace]").forEach(x=>x.classList.toggle("on",x===b))});const hp=v.querySelector("#hapSw");if(hp)hp.checked=store.get("haptic",true)!==false;const bz=v.querySelector("#blitzSw");if(bz)bz.checked=!!store.get("blitz",false);const pm=v.querySelector("#premoveSw");if(pm)pm.checked=store.get("premove",true)!==false;const lf=v.querySelector("#leftySw");if(lf)lf.checked=!!store.get("lefty",false);const cu=v.querySelector("#cleanSw");if(cu)cu.checked=!!store.get("cleanUI",false);const bk=v.querySelector("#bossSw");if(bk)bk.checked=store.get("bossKey",true)!==false}   /* 第 11 輪 F4 電腦下棋節奏、X2 震動回饋（勾選後的存檔、試震由 07hp-haptics.js 監聽 #hapSw） */
    {const cb=v.querySelector("#cbSw");if(cb){cb.checked=!!store.get("cbMode",false);cb.onchange=()=>{vibrate(5);store.set("cbMode",cb.checked);if(typeof cbApply==="function")cbApply();toast(cb.checked?"已打開色弱模式":"已關閉色弱模式")}}}   /* 第 11 輪 F3 色弱模式 */
    {const hcI=v.querySelector("#hiCon");if(hcI){hcI.checked=!!store.get("hiCon",false);hcI.onchange=()=>{store.set("hiCon",hcI.checked);hcApply();/* 回饋 848（色盲高對比） */vibrate(5);try{if(PARK){PARK.v.destroy();PARK=null}}catch(e){}show(true)}}}
    {const fbI=v.querySelector("#focB");if(fbI){fbI.checked=focusOn();fbI.onchange=()=>{store.set("focusBoard",fbI.checked);focusApply();vibrate(5);toast(fbI.checked?"已開啟「專注棋盤模式」，隱藏背景動畫與裝飾。":"已關閉專注棋盤模式")}}}
    v.querySelector("#ps").innerHTML=[["classic","傳統"],["solid","實心"],["3d","立體"]].map(([k,l])=>`<button data-p="${k}" class="${ps===k?"on":""}">${l}</button>`).join("");
    v.querySelectorAll("[data-p]").forEach(x=>x.onclick=()=>{store.set("pieceStyle",x.dataset.p);paint();show(false)});
    const pt=store.get("pageTheme","auto");v.querySelector("#pt").innerHTML=[["auto","跟著手機"],["light","☀ 淺色"],["dark","🌙 深色"]].map(([k,l])=>`<button data-m="${k}" class="${pt===k?"on":""}">${l}</button>`).join("");
    v.querySelectorAll("[data-m]").forEach(x=>x.onclick=()=>{const k=x.dataset.m;store.set("pageTheme",k);if(k==="auto")delete document.documentElement.dataset.theme;else document.documentElement.dataset.theme=k;paint()});
    /* 意見回饋 611：字體跟著朝代（每個朝代一套書法或刻本字）或跟著手機（手機內建字體） */
    {const fm=store.get("fontMode","era"),fb=v.querySelector("#ftM");if(fb){fb.innerHTML=[["era","跟著朝代"],["sys","跟著手機"]].map(([k,l])=>`<button data-ft="${k}" class="${fm===k?"on":""}">${l}</button>`).join("");
      fb.querySelectorAll("[data-ft]").forEach(x=>x.onclick=()=>{store.set("fontMode",x.dataset.ft);fontModeApply();paint()})}}
    /* 回饋 846（開發者 11/9 選：字級放大）：四個按鈕，按了馬上套用（不用重開） */
    {const fz=v.querySelector("#fzM");if(fz){const pf=()=>{const cur=store.get("fontSize","n");fz.innerHTML=FZ_STEPS.map(([k,l,z])=>`<button data-fz="${k}" class="${cur===k?"on":""}" aria-pressed="${cur===k}" style="font-size:${Math.round(15*z)}px">${l}</button>`).join("");
        fz.querySelectorAll("[data-fz]").forEach(x=>x.onclick=()=>{vibrate(5);store.set("fontSize",x.dataset.fz);fzApply();pf();const tip=typeof axmFzTip==="function"?axmFzTip(x.dataset.fz):"";toast(tip||"字級："+x.textContent);if(tip)try{axSay(tip)}catch(e){}})};pf()}}   /* 11/12 無障礙第 5 輪：放大字級時提示「較擠的地方會換行或捲動」（toast＋螢幕報讀，不在畫面留字） */
    const ce=store.get("boardEra",null)==null?"":store.get("boardEra");v.querySelector("#ptN").textContent=curEra()?"朝代風格有自己的配色；選「經典」才會用到深淺色":"";
    v.querySelector("#era").innerHTML=`<button data-e="" class="${ce===""?"on":""} cl" style="--b:#3B2A1A;--g:#F3EDE2;--t:#E2D6C3;--a:#B5452B;--i:#2A1F15"><i></i><b>⛵ 跟著星槎</b><small>停靠哪一朝就用哪一朝</small></button>`+ERAS.map(e=>{const c=e.c,st=c?`--b:${c.bar};--bi:${c.barink};--g:${c.bg};--cd:${c.card};--t:${c.trim};--a:${c.accent};--i:${c.ink};background-image:${eraMotif(e.m,c.ink,e.dark?.09:.07)}`:"--b:#3B2A1A;--g:#F3EDE2;--t:#E2D6C3;--a:#B5452B;--i:#2A1F15";
      const lk=eraLocked(e.k);return`<button data-e="${e.k}" class="${ce===e.k?"on":""}${c?"":" cl"}${lk?" elk":""}" style="${st}"><i style="${c?`background-image:${eraMotif(e.m,c.barink,.3)}`:""}"></i><b>${esc(e.n)}</b><small>${lk?"🔒 星槎還沒停靠":esc(e.s)}</small></button>`}).join("");   /* 意見回饋 673：還沒解鎖的朝代鎖住 */
    v.querySelectorAll("[data-e]").forEach(x=>x.onclick=()=>{const k=x.dataset.e;if(k===ce)return;if(k&&eraLocked(k)){vibrate(8);toast(eraLockMsg(k));return}vibrate(5);store.set("boardEra",k||null);
      if(k!=="classic"&&store.get("boardTheme","wood3d")!=="auto"){store.set("boardTheme","auto");toast("棋盤也換成這個朝代的配色（可在下面改回）")}paint();show(true)});
    /* 意見回饋 535：滑到中間停住的那張就套用；畫面重畫後把選中的那張捲回中間 */
    {const ew=v.querySelector("#era"),on=ew&&ew.querySelector(".on");if(ew){ew._quiet=true;if(on)ew.scrollLeft=Math.max(0,on.offsetLeft-12);setTimeout(()=>{ew._quiet=false},250);
      ew.onscroll=()=>{return;if(ew._quiet)return;clearTimeout(ew._t);ew._t=setTimeout(()=>{const mid=ew.scrollLeft+ew.clientWidth/2;let best=null,bd=1e9;for(const x of ew.querySelectorAll("[data-e]")){const d=Math.abs(x.offsetLeft+x.offsetWidth/2-mid);if(d<bd){bd=d;best=x}}if(best&&best.dataset.e!==store.get("era","classic"))best.click()},170)}}}
    const tg=(k,label,sub)=>`<label class="row" style="justify-content:space-between;padding:6px 0"><span><b>${label}</b><br><span class="muted">${sub}</span></span><input type="checkbox" class="sw" data-t="${k}" ${store.get(k,k!=="mvSound"&&k!=="mvConfirm")?"checked":""}></label>`;
    v.querySelector("#mv").innerHTML=tg("mvArrow","箭頭","從原來位置畫箭頭指到新位置")+'<div style="border-top:1px solid var(--line)"></div>'+tg("mvAnim","動畫","棋子滑過去，被吃的棋子淡出")+'<div style="border-top:1px solid var(--line)"></div>'+tg("mvConfirm","落子前再確認","點了落點（或拖過去放下）先標出來，同一點再點一次才走，不怕手滑點錯")+'<div style="border-top:1px solid var(--line)"></div>'+tg("capSound","吃子音效","吃子時重重「啪」一聲、將軍時「鏘」一聲")+'<div style="border-top:1px solid var(--line)"></div>'+tg("gateDrum","🥁 過場鼓聲","進園子、上擂台、千秋穿梭時，敲一段那個朝代戰場上的鼓和鑼")+'<div style="border-top:1px solid var(--line)"></div>'+tg("bgm","🎵 背景音樂","")+'<div style="border-top:1px solid var(--line)"></div>'+`<div style="padding:6px 0" id="vcRow"><b>語音報「吃」「將軍」</b><br><span class="muted">吃子喊「吃！」、將軍喊「將軍！」；點一下可以試聽；可調語速</span><div class="st-res" style="margin:8px 0 0">${[["off","關"],["m","男聲"],["f","女聲"]].map(([k,l])=>`<button data-vc="${k}" class="${(store.get("voiceCall",true)?store.get("voiceSex","m"):"off")===k?"on":""}">${l}</button>`).join("")}</div><div class="st-res" style="margin:8px 0 0;align-items:center"><span class="muted" style="font-size:13px">語速</span>${[["s","慢"],["n","中"],["f","快"]].map(([k,l])=>`<button data-vr="${k}" class="${store.get("voiceRate","n")===k?"on":""}">${l}</button>`).join("")}</div></div>`+'<div style="border-top:1px solid var(--line)"></div>'+sndPicker()+'<div style="border-top:1px solid var(--line)"></div>'+tg("ckFx","將軍特效","被將軍或將對方軍時，棋盤上蓋「將軍！」字樣")+'<div style="border-top:1px solid var(--line)"></div>'+tg("capFx","吃子特效","吃子時被吃的那格蓋一個水墨「吃」字")+'<div style="border-top:1px solid var(--line)"></div>'+'<div style="border-top:1px solid var(--line)"></div>'+tg("voiceMove","🎤 聲控走棋","下棋時右上角多一個 🎤，按下去說「馬八進七」「炮二平五」就會走"+(vcOK()?"":"（這個瀏覽器不支援語音辨識）"))+'<div style="border-top:1px solid var(--line)"></div>'+tg("opFx","開局名稱動畫","走出中炮、仙人指路、屏風馬…時，棋盤上展開卷軸寫出開局名");
    {const mvB=v.querySelector("#mv"),sdB=v.querySelector("#snd");sdB.innerHTML="";mvB.querySelectorAll(":scope>div[style*='border-top']").forEach(x=>x.remove());
      const st=mvB.querySelector("#sndSt");if(st)sdB.append(st.parentElement);
      {const x=mvB.querySelector('[data-t="capSound"]');if(x)sdB.append(x.closest("label"))}
      {const vr=mvB.querySelector("#vcRow"),s2=v.querySelector("#snd2");if(vr&&s2)s2.append(vr)}
      {const s3=v.querySelector("#snd3");for(const k of["gateDrum","bgm"]){const x=mvB.querySelector(`[data-t="${k}"]`);if(x&&s3)s3.append(x.closest("label"))}
        if(s3){const nw=document.createElement("div");nw.id="bgmNow";nw.style.cssText="display:none;align-items:center;gap:8px;padding:0 2px 8px;font-size:13.5px;opacity:.8";s3.append(nw);bgmNow();if(DEVMODE()){const dg=document.createElement("div");dg.style.cssText="padding:0 2px 8px;font-size:12px;opacity:.75;word-break:break-all";dg.innerHTML=`<span id="bgmDg"></span> <button class="btn ghost" id="bgmTest" style="width:auto;margin:4px 0 0;padding:3px 10px;font-size:12.5px">▶ 測試背景音樂</button>`;s3.append(dg);const up=()=>{const e=dg.querySelector("#bgmDg");if(e)e.textContent="🛠 "+bgmDiag()};up();dg.querySelector("#bgmTest").onclick=()=>{if(BGM.a&&BGM.a.paused){BGM.a=null;BGM.src=""}bgmSync();setTimeout(up,300);setTimeout(up,1500);setTimeout(up,4000)}}}}
      [...sdB.children].slice(1).forEach(x=>x.style.borderTop="1px solid var(--line)")}
    if(typeof sxmMount==="function")sxmMount(v);   /* 第 6 輪 F3：三張聲音卡片加音量分類（滑桿、靜音、全部靜音，11c-a11ysnd.js） */
    v.querySelectorAll("[data-vc]").forEach(x=>x.onclick=()=>{const k=x.dataset.vc;v.querySelectorAll("[data-vc]").forEach(y=>y.classList.toggle("on",y===x));
      store.set("voiceCall",k!=="off");if(k!=="off"){store.set("voiceSex",k);pickVoice();primeVoice();unlockAudio();loadVc().then(()=>{sayCall("將軍");setTimeout(()=>sayCall("吃"),1100)})}});
    v.querySelectorAll("[data-vr]").forEach(x=>x.onclick=()=>{store.set("voiceRate",x.dataset.vr);v.querySelectorAll("[data-vr]").forEach(y=>y.classList.toggle("on",y===x));
      if(!store.get("voiceCall",true))return;primeVoice();unlockAudio();loadVc().then(()=>{sayCall("將軍");setTimeout(()=>sayCall("吃"),1100)})});
    {const so=v.querySelector("#sndOn");if(so)so.onchange=()=>{store.set("mvSound",so.checked);v.querySelector("#sndBox").classList.toggle("sp-off",!so.checked);const k=store.get("sndStyle","wood");v.querySelectorAll("[data-snd]").forEach(y=>y.classList.toggle("on",so.checked&&y.dataset.snd===k));if(so.checked){unlockAudio();(/^s\d\d$/.test(k)?loadSfx(k):Promise.resolve()).then(()=>withAudio(()=>moveSound0(false)))}}}
    {const ss=v.querySelector("#sndSel"),st=v.querySelector("#sndTry"),tryS=k=>{unlockAudio();(/^s\d\d$/.test(k)?loadSfx(k):Promise.resolve()).then(()=>{withAudio(()=>moveSound0(false));setTimeout(()=>withAudio(()=>moveSound0(true)),550)})};
      if(ss)ss.onchange=()=>{const k=ss.value;store.set("mvSound",true);store.set("sndStyle",k);{const so=v.querySelector("#sndOn");if(so)so.checked=true;const bx=v.querySelector("#sndBox");if(bx)bx.classList.remove("sp-off")}tryS(k)};
      if(st)st.onclick=()=>{vibrate(5);tryS(ss?ss.value:store.get("sndStyle","wood"))}}
    v.querySelectorAll("[data-snd]").forEach(x=>x.onclick=()=>{const k=x.dataset.snd;store.set("mvSound",k!=="off");{const so=v.querySelector("#sndOn");if(so)so.checked=true;const bx=v.querySelector("#sndBox");if(bx)bx.classList.remove("sp-off")}if(k==="off"){v.querySelectorAll("[data-snd]").forEach(y=>y.classList.toggle("on",y===x));return}store.set("sndStyle",k);v.querySelectorAll("[data-snd]").forEach(y=>y.classList.toggle("on",y===x));unlockAudio();(/^s\d\d$/.test(k)?loadSfx(k):Promise.resolve()).then(()=>{withAudio(()=>moveSound0(false));setTimeout(()=>withAudio(()=>moveSound0(true)),550)})});
    v.querySelectorAll("[data-t]").forEach(x=>x.onchange=()=>{store.set(x.dataset.t,x.checked);if(x.checked&&(x.dataset.t==="mvSound"||x.dataset.t==="capSound")){unlockAudio();moveSound(x.dataset.t==="capSound")}if(x.checked&&x.dataset.t==="voiceCall"){primeVoice();setTimeout(()=>sayCall("將軍"),150)}show(true)});
    {const ns=v.querySelector("#nmS");if(ns)ns.textContent=myName()||"還沒取名字"}show(false)};
  v.querySelectorAll("[data-bp]").forEach(x=>x.onclick=()=>{store.set("botPiece",x.dataset.bp);v.querySelectorAll("[data-bp]").forEach(y=>y.classList.toggle("on",y===x));vibrate(5);
    if(BOT&&BOT.rebuild){BOT.rebuild();setTimeout(()=>{if(BOT&&BOT.say)BOT.say(`我現在是${BOTN()}了！`,3)},200)}toast(`小人換成「${x.dataset.bp}」，名字叫${BOTN()}`);try{meImgRefresh()}catch(e){}v.querySelectorAll(".botN").forEach(y=>y.textContent=BOTN())});
  /* 意見回饋 307：開發者重置虛擬玩家——用這支手機跟電腦配對時拿到的存取碼簽名，電腦上的虛擬玩家程式驗過簽名才會重置 */
  {const rb=v.querySelector("#rb");if(rb)rb.onclick=()=>confirmBox("把 32 位虛擬玩家的積分、戰績、練習紀錄全部歸零？舊資料會整份存在電腦上，不會丟。",async()=>{
    const r=window.XQ&&XQ.remoteInfo&&XQ.remoteInfo();if(!r||!r.key)return toast("這支手機要先用「連線到開發者的電腦」配對過，才能送出重置");
    if(!window.XQNet||!XQNet.ctl||!crypto.subtle)return toast("這個版本不支援");
    try{const at=Date.now(),n=Math.random().toString(36).slice(2,12),te=new TextEncoder(),k=await crypto.subtle.importKey("raw",te.encode(r.key),{name:"HMAC",hash:"SHA-256"},false,["sign"]),
      sig=[...new Uint8Array(await crypto.subtle.sign("HMAC",k,te.encode(`reset|${at}|${n}`)))].map(x=>x.toString(16).padStart(2,"0")).join("");
      if(!XQNet.ctl({cmd:"reset",at,n,sig}))return toast("還沒連上大廳，等一下再試");toast("已送出，等電腦回覆…");
      for(let i=0;i<8;i++){await new Promise(z=>setTimeout(z,2000));let x=null;try{x=JSON.parse(await XQNet.ctlAck(3000))}catch(e){}
        if(x&&x.n===n){toast(x.ok?`✅ 已重置 ${x.bots} 位虛擬玩家（舊資料存在電腦：${x.arch}）`:"❌ "+x.why,5000);return}}
      toast("電腦沒有回覆：虛擬玩家的程式可能沒在跑")}catch(e){toast(e.message)}},"重置")}
  {const ab=v.querySelector("#askB");if(ab)ab.onclick=()=>askSheet();const bh=v.querySelector("#botHome");if(bh)bh.onclick=()=>{store.set("botPos",null);if(BOT){BOT.stop();BOT=null}syncBot();toast("小帥回到預設位置了")}}{const bt=v.querySelector("#botT");if(bt)bt.onchange=()=>{store.set("bot3d",bt.checked);syncBot();if(bt.checked)toast("小人出來了！點它會表演")};const sz=v.querySelector("#botSz"),szv=v.querySelector("#botSzV");if(sz)sz.oninput=()=>{store.set("botSize",+sz.value);szv.textContent=Math.round(sz.value*100)+"%";if(BOT&&BOT.setScale)BOT.setScale(+sz.value)}}{const sk=v.querySelector("#stkS");if(sk){sk.checked=!store.get("stkOff",false);sk.onchange=()=>{store.set("stkOff",!sk.checked);if(!sk.checked){try{XQNet.dropIRT("stk")}catch(e){}try{STK.p=[];STK.e=[]}catch(e){}}vibrate(5);toast(sk.checked?"會匿名記錄卡住的地方":"不再記錄卡住的地方")}}}   /* 卡關訊號開關（開發者 11/11 核准，預設開） */
  {const ca=v.querySelector("#cpaS");if(ca){ca.checked=!store.get("cpuAnonOff",false);ca.onchange=()=>{store.set("cpuAnonOff",!ca.checked);if(!ca.checked)try{XQNet.dropIRT("cpu")}catch(e){}vibrate(5);toast(ca.checked?"跟電腦下完會匿名送出對局評分":"不再送出對局評分")}}}   /* 對局評分開關（開發者 11/11 照三方審查開始收 t:"cpu"，預設開；另開一個、不跟卡關訊號共用，理由寫在 05b-save.js 的 cpa 段） */
  {const lr=v.querySelector("#lrnS");if(lr){lr.checked=!store.get("learnAnonOff",false);lr.onchange=()=>{store.set("learnAnonOff",!lr.checked);if(!lr.checked)try{XQNet.dropIRT(lrnAnonType)}catch(e){}vibrate(5);toast(lr.checked?"會匿名送出學習進度":"不再送出學習進度")}}}{const sd=v.querySelector("#srvDelB");if(sd)sd.onclick=()=>{vibrate(5);srvDelAsk()};const hb=v.querySelector("#healB");if(hb)hb.onclick=()=>{vibrate(5);if(typeof healShow==="function")healShow()};const tl=v.querySelector("#teleSw");if(tl){tl.checked=!!store.get("teleOptIn",false);tl.onchange=()=>{vibrate(5);store.set("teleOptIn",tl.checked);if(!tl.checked&&typeof tlmDrop==="function")tlmDrop();toast(tl.checked?"已打開：每天最多送一次匿名健康摘要（卡頓與錯誤統計）":"已關閉：還沒送出的也一起丟掉")}}   /* 第 11 輪 X3：可選的匿名回報（05d-telemetry.js 讀 teleOptIn，預設關） */}   /* 學習進度開關、申請刪除伺服器資料（開發者 11/11 核准資料保留期限；lrnAnon* 在 05b-save.js，srvDel* 在本檔「申請刪除伺服器資料」段） */
  {const rp=v.querySelector("#repS");if(rp){rp.checked=!store.get("repOff",false);rp.onchange=()=>{store.set("repOff",!rp.checked);vibrate(5);toast(rp.checked?"會送玩家登記給開發者":"不再送玩家登記")}}}{const cs=v.querySelector("#myCityS");if(cs)cs.onchange=()=>{store.set("myCity",cs.value);fetchCity();if(window.XQNet&&XQNet.refresh)XQNet.refresh();toast(cs.value?"大廳會顯示「"+cs.value+"」":"大廳不顯示城市")}}(v.querySelector("#nm")||{}).onclick=()=>{vibrate(5);stab="look";store.set("setTab","look");showTab();setTimeout(()=>{const x=v.querySelector("#nmLook");if(x)x.scrollIntoView({block:"center",behavior:"smooth"})},60)};   /* 意見回饋 498：名字只在「外觀 → 我的角色」改 */(v.querySelector("#fb")||{}).onclick=()=>feedbackSheet();{const au=v.querySelector("#aUpd");if(au)au.onclick=()=>{vibrate(5);updCheck(au)}}{const al=v.querySelector("#aLic");if(al)al.onclick=()=>{vibrate(5);aboutLicSheet()}}{const ue=v.querySelector("#aUse");if(ue)aboutUsage(ue)}{const ft=v.querySelector("#fbTop");if(ft)ft.onclick=()=>{vibrate(5);feedbackSheet()}}{const fx=v.querySelector("#fxh");if(fx)fx.onclick=()=>fixHistory()}{const a2=v.querySelector("#a2h");if(a2)a2.onclick=()=>{vibrate(5);installGuide(true)}}(v.querySelector("#sh")||{}).onclick=shareSheet;const cn=v.querySelector("#cn");if(cn)cn.onclick=connectSheet;const fa=v.querySelector("#fa");if(fa)fa.onclick=()=>location.hash="#/fbadmin";{const dv=v.querySelector("#dvt");if(dv)dv.onclick=()=>{if(typeof dvtSheet==="function")dvtSheet()}}if(typeof epSetBind==="function")epSetBind(v);
  paint();return{}}

/* ---------- 申請刪除伺服器資料（開發者 11/11 核准資料保留期限；開發者怎麼處理見 xiangqi-db/story/91_資料保留期限與清理.md） ----------
   設定 → 隱私「🗑 申請刪除我在伺服器上的資料」：確認後用意見回饋同一條路（sendRecord → Google 表單）送一筆類型「🗑 刪除請求」，
   內容最前面寫請求編號 [D-月日-四碼]（四碼字表跟檢舉編號 R-… 一樣，去掉 0 O 1 I L），再寫裝置代號（meInfo().id，試算表「線上ID」欄也是它，開發者照它篩選）。
   同時 XQNet.forget() 清掉自己在線上大廳的在線狀態和戰績摘要（沒連上大廳就清不到，內容裡寫明，請開發者用 mqtt-prune.js --id 清）；對局棋譜由開發者清。
   也順手關掉「📨 送出玩家登記」（store repOff），不然 7 天後又會送新的登記。手機記住請求（store srvDelReq，最多 10 筆：編號、時間、st q 排隊中／sent 已從手機送出、forgot），顯示在按鈕下面。
   匿名資料（卡關、對局評分、學習進度）沒有名字和裝置代號、對不到人，照實說不需要也沒辦法刪。
   這一段到「申請刪除伺服器資料：以上」為止只用 store、meInfo、sendRecord、XQNet、crypto，xiangqi-lab/tools/test-retention.js 直接切出來測（modal、toast、esc 只在按鈕流程用） */
const SRV_DEL_ABC="23456789ABCDEFGHJKMNPQRSTUVWXYZ",SRV_DEL_RE=/^D-\d{4}-[2-9A-HJKMNP-Z]{4}$/;
function srvDelRid(d,rnd){d=d||new Date();const p=n=>String(n).padStart(2,"0");
  const r=rnd||(()=>{try{const a=new Uint8Array(1);for(let k=0;k<64;k++){crypto.getRandomValues(a);if(a[0]<248)return a[0]%31}}catch(e){}return Math.floor(Math.random()*31)});
  let s="";for(let i=0;i<4;i++)s+=SRV_DEL_ABC[((r()%31)+31)%31];return"D-"+p(d.getMonth()+1)+p(d.getDate())+"-"+s}
function srvDelTw(t){return new Date(+t+8*3600e3).toISOString().slice(0,16).replace("T"," ")}
function srvDelRec(id,rid,at,forgot,ver,role){return{type:"🗑 刪除請求",text:["["+rid+"] 🗑 申請刪除伺服器上的資料","裝置代號："+id,"請求編號："+rid,"時間："+srvDelTw(at)+"（臺灣時間）",
  "要刪：這個裝置代號送過的意見回饋、檢舉、玩家登記；線上大廳的戰績摘要和對局棋譜","上線狀態和戰績摘要："+(forgot?"手機已經自己清掉":"手機沒連上大廳、沒清到，請開發者清")].join("\n"),contact:"",id,name:"",rank:"",ver:ver||"",dev:"",page:"",role:role||"玩家",rid}}   /* rid 不在表單欄位裡、不會送出；帶著是讓 07x4 包的 postForm 在沒網路時丟錯（sendBeacon 沒網路也回 true），這筆才會進 fbQueue 排隊，也拿來在 fbQueue 認出是哪一筆 */
function srvDelList(){const L=store.get("srvDelReq",[]);return Array.isArray(L)?L.filter(x=>x&&typeof x.rid==="string"&&SRV_DEL_RE.test(x.rid)):[]}
function srvDelState(x){if(!x)return"";if(x.st==="sent")return"sent";const q=store.get("fbQueue",[])||[];return q.some(r=>r&&(r.rid===x.rid||String(r.text||"").indexOf("["+x.rid+"]")===0))?"q":"sent"}
function srvDelLine(){const x=srvDelList().slice(-1)[0];if(!x)return"";return"上次申請："+x.rid+"（"+srvDelTw(x.at)+"，"+(srvDelState(x)==="sent"?"✅ 已從手機送出":"📮 排隊中，有網路時自動送出")+"），開發者會在 30 天內處理"}
async function srvDelSend(now){now=now||Date.now();const id=meInfo().id,have=new Set(srvDelList().map(x=>x.rid));let rid=srvDelRid(new Date(now));for(let k=0;k<20&&have.has(rid);k++)rid=srvDelRid(new Date(now));
  let forgot=false;try{forgot=!!(window.XQNet&&XQNet.forget&&XQNet.forget())}catch(e){}
  try{store.set("repOff",true)}catch(e){}
  const role=typeof DEVMODE==="function"&&DEVMODE()?"開發者":"玩家",ver=String(window.XQ_BUILD||"").slice(0,20);
  store.set("srvDelReq",srvDelList().concat({rid,at:now,st:"q",forgot}).slice(-10));
  const ok=await sendRecord(srvDelRec(id,rid,now,forgot,ver,role));
  if(ok){const L=srvDelList(),x=L.find(q=>q.rid===rid);if(x){x.st="sent";store.set("srvDelReq",L)}}
  return{rid,id,ok,forgot}}
/* ---------- 申請刪除伺服器資料：以上 ---------- */
function srvDelAsk(){modal(`<div class="em">🗑</div><h2>申請刪除伺服器上的資料？</h2><p style="text-align:left">開發者收到後會刪掉：</p><ul style="text-align:left;margin:0 0 8px;padding-left:1.3em;font-size:14px;line-height:1.6"><li>意見回饋試算表裡，這支手機送過的意見回饋、檢舉和玩家登記（用裝置代號找）</li><li>線上大廳伺服器上你的戰績摘要和對局棋譜（上線狀態和戰績摘要，手機現在就先清）</li></ul><p class="muted" style="font-size:13px;text-align:left">匿名資料（卡住的地方、對局評分、學習進度）沒有名字和裝置代號，對不到你，所以不需要、也沒辦法刪，會照期限自動刪掉。這筆刪除請求本身會留一年，當作處理紀錄。別人手機上存的對局紀錄刪不到。手機裡的進度不會動（要刪請用隱私說明最下面的「刪除這支手機的全部資料」）。送出後也會關掉「📨 送出玩家登記」。</p>`,[["送出申請",()=>setTimeout(srvDelGo,120)],["先不要",null,true]])}
async function srvDelGo(){let r;try{r=await srvDelSend()}catch(e){return toast("送不出去："+(e&&e.message||e))}
  const s=document.getElementById("srvDelSt");if(s)s.textContent=srvDelLine();const rp=document.getElementById("repS");if(rp)rp.checked=false;
  modal(`<div class="em">📨</div><h2>已申請刪除</h2><p>請求編號：<b>${esc(r.rid)}</b></p><p>${r.ok?"已經從手機送出。":"現在沒網路，先排在手機裡，有網路時會自動送出。"}開發者會在 30 天內處理。</p><p class="muted" style="font-size:13px;text-align:left">${r.forgot?"線上大廳的上線狀態和戰績摘要，手機已經先清掉了。":"現在沒連上線上大廳，戰績摘要會由開發者一起清。"}之後再進線上大廳下棋，會產生新的戰績摘要。玩家登記已經關掉（設定 → 隱私可以再打開）。編號會記在設定 → 隱私這個按鈕下面。</p>`,[["好",null]])}

// ================= 意見回饋：存到 Google 表單（沒網路先存在手機，之後自動補送） =================
// 表單的「formResponse」網址和每一題的 entry 代號；空的時候回饋先存在手機佇列裡
const FEEDBACK_FORM={action:"https://docs.google.com/forms/d/e/1FAIpQLScxK1rQLe70m7lcNg1Ay-mWOhp-pgcRrlHB7KAXYShiLjqyfA/formResponse",
  entries:{type:"entry.878459997",text:"entry.19788072",contact:"entry.1564431672",id:"entry.1681425457",name:"entry.1153998021",rank:"entry.1077510185",ver:"entry.1173886447",dev:"entry.1485904009",page:"entry.954611964",img:"entry.706229975",role:"entry.478148566"}};
// 截圖：縮小成 JPEG 文字（表單一格最多約 3 萬字），開發者看得清楚畫面就好
function shrinkImage(file){return new Promise((ok,no)=>{const u=URL.createObjectURL(file),im=new Image();
  im.onload=()=>{URL.revokeObjectURL(u);const cv=document.createElement("canvas"),cx=cv.getContext("2d");
    for(const[side,q]of[[1100,.5],[960,.42],[860,.36],[780,.32],[720,.28],[640,.25],[560,.22],[480,.2]])   // 先降畫質、最後才縮小，字比較看得清楚
      {const k=Math.min(1,side/Math.max(im.width,im.height));
      cv.width=Math.round(im.width*k);cv.height=Math.round(im.height*k);cx.fillStyle="#fff";cx.fillRect(0,0,cv.width,cv.height);cx.drawImage(im,0,0,cv.width,cv.height);
      const d=cv.toDataURL("image/jpeg",q);if(d.length<=30000)return ok(d)}
    no(new Error("圖片太大，請換一張或先裁切"))};
  im.onerror=()=>{URL.revokeObjectURL(u);no(new Error("讀不到這張圖片"))};im.src=u})}
async function feedbackInfo(){const m=meInfo(),r=window.XQNet&&XQNet.rating?XQNet.rating():null;
  return{id:m.id||"",name:m.name||"",rank:r?`${r.rank} ${r.pts}分（${r.w}勝${r.l}負${r.d}和）`:"",ver:(A=>{const run=window.XQ_BUILD&&!/__/.test(XQ_BUILD)?XQ_BUILD:"";return run&&A&&A!==run?`${run}（已下載 ${A}，換頁後套用）`:(A||run)})(await appVer())||"",
    dev:(MY_KIND||"其他")+((matchMedia("(display-mode: standalone)").matches||navigator.standalone)?"・主畫面App":"・瀏覽器")+`・${innerWidth}x${innerHeight}`+(DEVMODE()&&typeof bgmDiag==="function"?"・"+bgmDiag():""),page:location.hash||"#/",role:DEVMODE()?"開發者":"玩家"}}
async function postForm(rec){const F=FEEDBACK_FORM;if(!F.action)throw new Error("表單還沒設定");
  const body=new URLSearchParams();for(const k in F.entries)if(F.entries[k]&&rec[k]!=null)body.append(F.entries[k],String(rec[k]).slice(0,k==="img"?31000:k==="text"?45000:2000));
  // 用 sendBeacon「送出就好、不等回覆」：App 為了跑 Pikafish 開了嚴格的跨網域模式，fetch 讀不到 Google 的回覆會被當成失敗（其實已經送到），造成重複送出
  if(navigator.sendBeacon){if(navigator.sendBeacon(F.action,body))return;}
  try{await fetch(F.action,{method:"POST",mode:"no-cors",body})}catch(e){if(!navigator.onLine)throw e}}   // 有網路時，讀不到回覆不算失敗
async function flushFeedback(){const q=store.get("fbQueue",[]);if(!q.length||!FEEDBACK_FORM.action||!navigator.onLine)return;const left=[];
  for(const r of q){try{await postForm(r);if(r.type&&!/玩家/.test(r.type)&&window.XQNet&&XQNet.bell)XQNet.bell({type:r.type,img:!!r.img,role:r.role||""})}catch(e){left.push(r)}}store.set("fbQueue",left)}
async function sendRecord(rec){try{await postForm(rec);if(rec.type&&!/玩家/.test(rec.type)&&window.XQNet&&XQNet.bell)XQNet.bell({type:rec.type,img:!!rec.img,role:rec.role||""});return true}catch(e){const q=store.get("fbQueue",[]);q.push(rec);store.set("fbQueue",q.slice(-30));return false}}
// 走棋音效選單（意見回饋 199、200）：開關＋分組卡片
function sndPicker(){const on=store.get("mvSound",false),cur=store.get("sndStyle","wood");
  const G=[["合成",[["wood","實木"],["soft","輕敲"]]],["經典 01–10",SFX_SET.slice(0,10)],["園子擬音",SFX_SET.slice(10)]];
  const card=([k,l])=>`<button data-snd="${k}" class="sp-c${on&&cur===k?" on":""}"><span>${l}</span><i>▶</i></button>`;
  return`<style>.sp-h{display:flex;justify-content:space-between;align-items:center;gap:10px}.sp-g{font-size:12px;font-weight:700;opacity:.6;margin:12px 0 6px}
    .sp-l{display:grid;grid-template-columns:1fr 1fr;gap:6px}.sp-off .sp-l{opacity:.45}
    .sp-c{display:flex;align-items:center;gap:6px;padding:9px 10px;border:1.5px solid var(--line);border-radius:12px;background:var(--card);color:inherit;font:inherit;font-size:14px;text-align:left;min-width:0}
    .sp-c span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sp-c i{font-style:normal;font-size:10px;opacity:.4}
    .sp-c em{font-style:normal;font-size:11px;font-weight:700;padding:1px 5px;border-radius:6px;background:var(--line);font-variant-numeric:tabular-nums}
    .sp-c.on{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 12%,var(--card));font-weight:700}.sp-c.on i{opacity:1;color:var(--accent)}</style>
    <div style="padding:6px 0" class="${on?"":"sp-off"}" id="sndBox"><label class="sp-h"><span><b>走棋音效</b><br><span class="muted">棋子落下的聲音，從下面的選單挑一種，選了會先試聽（先走子、再吃子）</span></span><input type="checkbox" class="sw" id="sndOn" ${on?"checked":""}></label>
    <div class="row" id="sndSt" style="gap:8px;margin-top:10px;align-items:center"><select id="sndSel" aria-label="走棋音效" style="flex:1;min-width:0;font:inherit;font-size:15px;padding:10px;border-radius:12px;border:1.5px solid var(--line);background:var(--card);color:inherit">${G.map(([t,L])=>`<optgroup label="${t}">${L.map(([k,l])=>`<option value="${k}"${cur===k?" selected":""}>${String(l).replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim()}</option>`).join("")}</optgroup>`).join("")}</select><button class="pill" id="sndTry">▶ 試聽</button></div></div>`}   /* 意見回饋 538：走棋音效改成下拉選單 */
// 修正通知（意見回饋 203）：data/fixes.json 列出已修好的回饋（只放線上 ID 的雜湊，不放玩家原文）；
// 玩家打開 App 會看到自己回報、已修好的問題；開發者看到每一次的修正回報。設定 → 其他 →「修正紀錄」可以再看
async function fixHash(id){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode("xqfix:"+id));return[...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,"0")).join("").slice(0,12)}
async function myFixes(){let d;try{d=await fetch("data/fixes.json?v="+encodeURIComponent(window.XQ_BUILD||"")).then(r=>r.json())}catch(e){return null}
  const dev=DEVMODE(),id=meInfo().id||"",h=id?await fixHash(id):"";return{dev,items:(d.items||[]).filter(x=>!x.no&&(dev||(h&&x.h===h))).sort((a,b)=>b.r-a.r)}}
function fixList(items,dev){const fmtV=v=>v?v.replace(/^(\d{4})(\d\d)(\d\d)-(\d\d)(\d\d)$/,"$2/$3 $4:$5"):"";
  return items.length?items.map(x=>`<div class="card" style="margin-bottom:8px"><div class="row" style="justify-content:space-between;gap:6px;flex-wrap:wrap"><b>${esc(x.ty||"")}${dev?`<span class="muted" style="font-weight:400;font-size:12px">　第 ${x.r} 列</span>`:""}</b><span class="muted" style="font-size:12px">${esc(x.at||"")} 回報</span></div>
    ${x.q?`<div class="muted" style="font-size:13px;margin:4px 0;white-space:pre-wrap;max-height:4.5em;overflow:hidden">「${esc(x.q)}」</div>`:""}
    <div style="font-size:14px;margin-top:6px;white-space:pre-wrap;word-break:break-word">✅ ${esc(x.n||"已修正")}</div>${x.v?`<div class="muted" style="font-size:11px;margin-top:4px">版本 ${esc(fmtV(x.v))}</div>`:""}</div>`).join(""):'<div class="card muted" style="text-align:center">還沒有修正紀錄</div>'}
async function fixHistory(){const F=await myFixes();if(!F)return toast("讀不到修正紀錄");sheet(F.dev?"🛠 修正紀錄（全部）":"🛠 我回報的問題",b=>{b.innerHTML=`<p class="muted" style="margin-top:0">${F.dev?"每一次修正的回報，最新的在最上面。":"你透過「意見回饋」回報、已經修好的問題。"}</p>`+fixList(F.items,F.dev)})}
let FIX_P=null;async function checkFixes(){FIX_P=FIX_P||myFixes();const F=await FIX_P;if(document.querySelector(".modal,#sheet"))return setTimeout(checkFixes,1500);FIX_P=null;if(!F||!F.items.length)return;
  let seen=store.get("fixSeen",null);
  if(seen===null){if(F.dev){const top=F.items.map(x=>x.v).sort().pop();seen=F.items.filter(x=>x.v!==top).map(x=>x.r)}else seen=[]}
  const S=new Set(seen),news=F.items.filter(x=>!S.has(x.r));store.set("fixSeen",F.items.map(x=>x.r));if(!news.length)return;
  modal(`<div class="em">🛠</div><h2>${F.dev?`有 ${news.length} 項新的修正`:news.length>1?`你回報的 ${news.length} 個問題修好了`:"你回報的問題修好了"}</h2>
    <div style="text-align:left;max-height:46vh;overflow:auto;margin:8px 0">${fixList(news.slice(0,30),F.dev)}</div>${F.dev?"":'<p class="muted" style="font-size:12px">謝謝你的回饋！</p>'}`,[["知道了",null],["全部修正紀錄",()=>fixHistory(),true]],"keep")}   /* 意見回饋 607：修正通知換頁也不關 */
setTimeout(()=>{if(OFF)checkFixes()},800);   // 意見回饋 211：更新完一打開就跳，不要等
function feedbackSheet(){let type="🐞 錯誤";
  sheet("💬 意見回饋",b=>{b.innerHTML=`<style>
    .fbw{display:flex;flex-direction:column;gap:14px}.fbw .lead{margin:0;font-size:13px}
    .fbt{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
    .fbt button{display:flex;flex-direction:column;align-items:center;gap:2px;padding:10px 4px;border:1.5px solid var(--line);border-radius:14px;background:var(--card);color:inherit;font:inherit}
    .fbt button b{font-size:15px}.fbt button small{font-size:11px;opacity:.65}.fbt button i{font-style:normal;font-size:22px;line-height:1.1}
    .fbt button.on{border-color:var(--accent,#2e6b4a);background:color-mix(in srgb,var(--accent,#2e6b4a) 12%,var(--card));box-shadow:0 0 0 2px color-mix(in srgb,var(--accent,#2e6b4a) 25%,transparent)}
    .fbbox{position:relative}.fbbox textarea{width:100%;min-height:128px;padding:12px 12px 24px;border:1px solid var(--line);border-radius:14px;background:var(--card);color:inherit;font:inherit;font-size:16px;resize:vertical;-webkit-user-select:text;user-select:text}
    .fbbox .cnt{position:absolute;right:12px;bottom:8px;font-size:11px;opacity:.5}
    .fbl{font-size:12px;font-weight:700;opacity:.7;margin:0 0 6px 2px}
    .fba{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .fba label{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1.5px dashed var(--line);border-radius:14px;cursor:pointer;background:var(--card)}
    .fba label i{font-style:normal;font-size:22px}.fba label span{display:flex;flex-direction:column;line-height:1.25;min-width:0}.fba label small{font-size:11px;opacity:.6}
    .fbc{display:flex;flex-wrap:wrap;gap:8px}.fbc:empty{display:none}
    .fbc .fch{display:inline-flex;align-items:center;gap:6px;max-width:100%;padding:6px 6px 6px 10px;border:1px solid var(--line);border-radius:999px;font-size:12px;background:var(--card)}
    .fbc .fch em{font-style:normal;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:170px}
    .fbc .fch a,.fbc button{border:0;background:var(--line);color:inherit;border-radius:50%;width:22px;height:22px;line-height:22px;text-align:center;padding:0;text-decoration:none;flex:none}
    .fbw input#fc{width:100%;padding:11px 12px;border:1px solid var(--line);border-radius:14px;background:var(--card);color:inherit;font-size:16px}
    .fbn{font-size:11px;opacity:.6;margin:0;line-height:1.5}.fbw #go{width:100%;padding:13px;font-size:16px}
    </style><div class="fbw">
    <p class="muted lead">遇到問題或想要新功能，都可以寫在這裡，開發者會看到。</p>
    <div><div class="fbl">類型</div><div class="fbt" id="ty">${[["🐞 錯誤","🐞","錯誤","東西壞了","f_bug"],["💡 建議","💡","建議","想要新功能","f_idea"],["💬 其他","💬","其他","想說的話","f_other"]].map(([t,ic,n,h,ik])=>`<button data-y="${t}" class="${t===type?"on":""}"><i>${ETIMG(ik,"",ic)}</i><b>${n}</b><small>${h}</small></button>`).join("")}</div></div>
    <div><div class="fbl">內容</div><div class="fbbox"><textarea id="fx" maxlength="1500" placeholder="例如：在哪個畫面、按了什麼、發生什麼事；或是希望增加的功能"></textarea><span class="cnt" id="fxn">0／1500</span></div></div>
    <div><div class="fbl">附件（選填）</div><div class="fba">
      <label><i>${ETIMG("f_shot","","📷")}</i><span><b>截圖</b><small>最多 4 張</small></span><input type="file" id="fi" accept="image/*" multiple hidden></label>
      <label><i>${ETIMG("f_file","","📎")}</i><span><b>檔案</b><small>程式碼、文字檔</small></span><input type="file" id="ff" accept=".txt,.js,.mjs,.ts,.py,.json,.md,.csv,.html,.htm,.css,.log,.xml,.yml,.yaml,.sh,.pgn,.fen,text/*" multiple hidden></label></div>
      <div class="fbc" id="fps" style="margin-top:8px"></div><div class="fbc" id="ffl" style="margin-top:8px"></div></div>
    <div><div class="fbl">聯絡方式（選填）</div><input id="fc" maxlength="80" placeholder="例如 LINE ID，方便回覆你"></div>
    <button class="btn" id="go">${ETIMG("f_send","","")} 送出</button>
    <p class="fbn">會一起附上：你的線上 ID、名字、段位、App 版本、裝置類型和目前畫面，方便找問題。</p></div>`;
    {const fx=b.querySelector("#fx"),fxn=b.querySelector("#fxn");fx.addEventListener("input",()=>fxn.textContent=fx.value.length+"／1500")}
    // 截圖可以一次選多張（最多 4 張）；表單一格只放得下一張，第 2 張起各送一筆「第 N 張截圖」接在後面
    const MAXI=4;let imgs=[];const fi=b.querySelector("#fi"),fps=b.querySelector("#fps");
    // 附加檔案（意見回饋 195）：文字類檔案最多 3 個、每個 200KB；送出時每 4 萬字切一段，當作額外的回饋列送出
    let atts=[];const ff=b.querySelector("#ff"),ffl=b.querySelector("#ffl");
    const paintF=()=>{ffl.innerHTML=atts.map((a,i)=>`<span class="fch">📎 <em>${esc(a.name)}</em><span class="muted">${(a.text.length/1000).toFixed(1)}k 字</span><a href="#" data-fx="${i}" aria-label="移除">✕</a></span>`).join("");ffl.querySelectorAll("[data-fx]").forEach(x=>x.onclick=e=>{e.preventDefault();atts.splice(+x.dataset.fx,1);paintF()})};
    ff.onchange=async()=>{const fs=[...(ff.files||[])];ff.value="";for(const f of fs){if(atts.length>=3){toast("最多 3 個檔案");break}if(f.size>200*1024){toast(`${f.name} 超過 200KB`);continue}
      try{atts.push({name:f.name,text:await f.text()})}catch(e){toast("讀不到 "+f.name)}}paintF()};
    const paintI=()=>{fps.innerHTML=imgs.map((d,i)=>`<span style="position:relative;display:inline-block"><img src="${d}" alt="" style="height:72px;max-width:96px;border-radius:8px;border:1px solid var(--line);display:block"><button data-x="${i}" class="pill" style="position:absolute;top:-8px;right:-8px;padding:0 7px;line-height:22px">✕</button></span>`).join("");
      fps.querySelectorAll("[data-x]").forEach(x=>x.onclick=()=>{imgs.splice(+x.dataset.x,1);paintI()})};
    fi.onchange=async()=>{const fs=[...(fi.files||[])];fi.value="";if(!fs.length)return;if(imgs.length+fs.length>MAXI)toast(`最多 ${MAXI} 張，只取前面幾張`);
      for(const f of fs.slice(0,MAXI-imgs.length)){try{imgs.push(await shrinkImage(f))}catch(e){toast(e.message)}}paintI()};
    b.querySelectorAll("[data-y]").forEach(x=>x.onclick=()=>{type=x.dataset.y;b.querySelectorAll("[data-y]").forEach(y=>y.classList.toggle("on",y===x))});
    b.querySelector("#go").onclick=async e=>{const t=b.querySelector("#fx").value.trim();if(t.length<2)return toast("請先寫下內容");e.target.disabled=true;e.target.textContent="送出中…";
      const info=await feedbackInfo(),contact=b.querySelector("#fc").value.trim(),N=imgs.length;
      // 意見回饋 205：附件直接接在同一列的內容後面；超過一格放得下的（約 4.4 萬字）才分到下一列
      const full=t+atts.map(a=>`

📎 附件 ${a.name}
`+a.text).join(""),CAP=44000,more=[];for(let k=CAP;k<full.length;k+=40000)more.push(full.slice(k,k+40000));
      try{const L=store.get("fbMine",[])||[];L.push({at:Date.now(),ty:type,t:String(t||"").slice(0,80)});store.set("fbMine",L.slice(-60))}catch(e){}   /* 修好回信要引用「你上次告訴我們」：寄出時在這支手機記一份（只存本機） */
      let ok=await sendRecord(Object.assign({},info,{type,text:full.slice(0,CAP),contact,img:imgs[0]||""}));
      for(let i=1;i<N;i++)ok=(await sendRecord(Object.assign({},info,{type,text:`（接上一則的第 ${i+1}/${N} 張截圖）${t.slice(0,60)}`,contact,img:imgs[i]})))&&ok;
      for(let k=0;k<more.length;k++)ok=(await sendRecord(Object.assign({},info,{type,text:`📎 附件續（第 ${k+2}/${more.length+1} 段，接上一則：${t.slice(0,40)}）
`+more[k],contact,img:""})))&&ok;closeSheet();toast(ok?"✅ 已送出，謝謝你的回饋！":"已存在手機裡，有網路時會自動送出")}})}
/* 意見回饋 708（開發者）：記這支手機用了多久、在哪些地方待最久（只算畫面開著的時間），跟著玩家登記一起送，表單「內容」欄寫成「總共用了 3 小時・最常待：雲河星槎 1 小時、園子對局 40 分、殘局 20 分」 */
const USE_NAME=[["#/ship/read","雲河七星閱讀"],["#/ship","雲河星槎"],["#/journey/play","園子對局"],["#/journey/inn","驛站"],["#/journey/park","千秋石枰"],["#/journey","章回棋路"],["#/adventure","雲河星槎"],["#/port","渡口"],["#/arena","擂台"],["#/canju","殘局"],["#/cpu","挑戰電腦"],["#/lobby","線上對戰"],["#/play","對局"],["#/db","棋譜"],["#/quiz","測驗"],["#/guess","猜著法"],["#/settings","設定"],["#/me","我的角色"],["#/shelf","書架"],["#/stats","戰績"],["#/openings","開局"],["#/redo","錯棋重練"],["#/terms","規則"]];
const usePlace=h=>{h=h||"#/";if(h==="#/"||h==="#")return"首頁";for(const[p,n]of USE_NAME)if(h===p||h.startsWith(p+"/"))return n;return h.split("/")[1]||"首頁"};
let useT=Date.now(),useH=location.hash;
function useTick(){const now=Date.now(),dt=Math.min(now-useT,60000);useT=now;if(document.hidden||dt<=0)return;try{const S=store.get("useStat",null)||{t:0,p:{}};S.t=(S.t||0)+dt;S.p=S.p||{};const k=usePlace(useH);S.p[k]=(S.p[k]||0)+dt;store.set("useStat",S)}catch(e){}
  try{const D=store.get("useDay",null)||{},d=localDay();D[d]=(D[d]||0)+dt;const ks=Object.keys(D).sort();while(ks.length>60)delete D[ks.shift()];store.set("useDay",D)}catch(e){}}   /* 學習週報（開發者 11/8 核准）：每天畫面開著幾毫秒，留 60 天；useStat 只有總數，沒辦法算「這一週」 */
setInterval(useTick,15000);addEventListener("hashchange",()=>{useTick();useH=location.hash});document.addEventListener("visibilitychange",()=>{if(document.hidden)useTick();else useT=Date.now()});
const useFmt=ms=>{const m=Math.round(ms/60000);return m>=60?`${Math.floor(m/60)} 小時${m%60?` ${m%60} 分`:""}`:`${m} 分`};
function useSummary(){const S=store.get("useStat",null);if(!S||!S.t)return"";const P={...(S.p||{})};if(P.ship){P["雲河星槎"]=(P["雲河星槎"]||0)+P.ship;delete P.ship}   /* 意見回饋 724：星槎新頁（#/ship/...）以前記成 ship，併進雲河星槎 */
  const top=Object.entries(P).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k,v])=>`${k} ${useFmt(v)}`);return`總共用了 ${useFmt(S.t)}・最常待：${top.join("、")}`}
// 線上 ID 登記：名字或段位有變、或超過 7 天，就送一筆「玩家」紀錄到同一個表單（意見回饋 708：多用了 30 分鐘以上、距離上次超過一天也送，時間才跟得上）
async function reportPlayer(){if(!OFF||!FEEDBACK_FORM.action)return;if(navigator.webdriver)return;if(typeof fnTest==="function"&&fnTest())return;   /* 11/12：Claude 在內建瀏覽器設了測試房（xq_netRoot）拍截圖，還是送出玩家登記「棋友28AB」被當成真人；設了測試房或本機就不送 */   /* 意見回饋 652：自動化測試（Playwright 等）開的 App 不送玩家登記，名單才分得清真人 */if(/^(localhost|127\.|\[::1\])/.test(location.hostname))return;   /* 電腦本機測試不送玩家紀錄（第 502、504 列是測試時誤送的） */if(store.get("repOff",false)||(typeof fmNetOff==="function"&&fmNetOff()))return;   /* 上架隱私整理 11/10：玩家可以在設定關掉登記，家長關掉線上大廳時也不送 */const i=await feedbackInfo();try{const pn=typeof window.XQ_PUBNAME==="function"?window.XQ_PUBNAME(meInfo()):"";if(pn)i.name=pn}catch(e){}i.page="";   /* 登記只送大廳對外的名字（選稱號就是稱號），不送玩家自取的名字，也不送目前在哪一頁 */const key=i.id+"|"+i.name+"|"+i.rank.split(" ")[0],last=store.get("playerRep",null);
  const ut=((store.get("useStat",null)||{}).t)||0;if(last&&last.k===key&&Date.now()-last.at<7*864e5&&!(Date.now()-last.at>864e5&&ut-(last.u||0)>=18e5))return;
  if(await sendRecord(Object.assign(i,{type:"👤 玩家",text:useSummary(),contact:""})))store.set("playerRep",{k:key,at:Date.now(),u:ut})}
setTimeout(()=>{flushFeedback();reportPlayer()},8000);window.addEventListener("online",()=>setTimeout(flushFeedback,2000));

// ================= 意見回饋管理（開發者）：打開 Google 上的管理頁 =================
function FbAdmin(v){setTop("意見回饋管理","#/settings");setTabs(false);
  v.innerHTML=`<div class="pad home"><div class="card" style="text-align:center;padding:22px 16px"><div style="font-size:44px">📋</div>
    <h2 style="font-family:var(--serif);margin:6px 0">意見回饋管理</h2>
    <p class="muted" style="line-height:1.7">在 Google 上打開管理頁，看所有回饋和截圖。<br>玩家寫的回饋按「✅ 核准修正」後 Claude 才會修；開發者寫的 Claude 會直接修。<br>第一次打開如果要求登入，請登入你的 Google 帳號（只有你的帳號打得開）。</p>
    <button class="btn" id="go">打開意見回饋管理</button></div></div>`;
  (v.querySelector("#go")||{}).onclick=openFbAdmin;return{}}

// 遊戲畫面共用：棋盤＋上下玩家條＋狀態＋著法條＋動作列
function gameLayout(v){
  v.className="view fixed";
  v.innerHTML=`<div class="player" id="pTop"></div><div class="evline"><div id="evf"></div></div><div class="boardbox" id="bbox"></div>
   <div class="player" id="pBot"></div><div class="status" id="stat"></div><div class="strip" id="strip"></div><div style="flex:1"></div><div class="actions" id="acts"></div>`;}
/* 開發者 11/11 選 ChatGPT UI 報告 UI-01：手機橫放（高度不到 600px）時，對局畫面原本照直式上下排，棋盤被擠成每格約 11px 的小圖。
   改成左右兩欄：左邊整個高度給棋盤（寬＝高×560/615，最多佔畫面 62%），右邊依序放玩家、狀態、棋譜、工具列，右欄自己可以捲。
   只認 gameLayout 畫出來的對局頁（裡面有 #bbox 和 #acts）；直式、平板、電腦都不受影響 */
(()=>{try{const s=document.createElement("style");s.id="glLand";s.textContent=`@media (orientation:landscape) and (max-height:600px){
.view.fixed:has(>#bbox):has(>#acts){display:grid;grid-template-columns:min(62vw,calc((100dvh - 64px) * 560 / 615)) minmax(0,1fr);grid-template-rows:repeat(12,min-content) 1fr;grid-auto-rows:min-content;column-gap:4px;overflow-y:auto;padding-left:env(safe-area-inset-left);padding-right:env(safe-area-inset-right)}
.view.fixed:has(>#bbox):has(>#acts)>*{grid-column:2;min-width:0}
.view.fixed:has(>#bbox):has(>#acts)>#bbox{grid-column:1;grid-row:1/-1;position:sticky!important;top:0;align-self:start;height:calc(100dvh - 64px - env(safe-area-inset-bottom,0px));max-height:100%;min-height:0;padding:2px 2px 2px 6px;box-sizing:border-box}
.view.fixed:has(>#bbox):has(>#acts)>#bbox svg{height:100%;width:auto;max-width:100%;max-height:100%}
.view.fixed:has(>#bbox):has(>#acts)>#bbox canvas{max-width:100%;max-height:100%}
.view.fixed:has(>#bbox):has(>#acts)>.evline{margin:4px 8px}
.view.fixed:has(>#bbox):has(>#acts)>.actions{position:sticky;bottom:0;flex-wrap:wrap;background:var(--bg)}}`;document.head.append(s)}catch(e){}})();
/* 開發者 11/6：選了雲河七星的玩家，對局下方的頭像寫自己的本命子、放自己的角色（原本一律寫帥／將） */
function playerHTML(side,name,sub,clock){let pc=side==="r"?"帥":"將",im="";try{const c=myChar(),C=c&&WX_CHARS[c];if(C&&name===meName()){const R2B={帥:"將",仕:"士",相:"象",俥:"車",傌:"馬",炮:"砲",兵:"卒"},B2R={};for(const k in R2B)B2R[R2B[k]]=k;pc=side==="r"?(B2R[C.pc]||C.pc):(R2B[C.pc]||C.pc);im=`<img src="data/xs/prev_${c}.webp" alt="" onerror="this.remove()">`}}catch(e){}return`<div class="av ${side}${im?" npc":""}">${esc(pc)}${im}</div><div class="nm"><b>${esc(name)}</b><span>${esc(sub||"")}</span></div>${clock!=null?`<div class="clk">${clock}</div>`:""}`}
function renderStrip(box,moves,curIdx,onPick){
  const key=moves.map(m=>m.cn+(m.q||"")).join()+"|"+curIdx;if(box.dataset.k===key)return;box.dataset.k=key;box.innerHTML="";
  moves.forEach((m,i)=>{const c=document.createElement("button");c.className="chip "+(m.by||(i%2?"b":"r"))+(i===curIdx?" on":"");
    c.innerHTML=`<span class="n">${i+1}</span>${esc(m.cn)}${m.q&&m.q!=="—"?`<span class="q" style="color:${QC[m.q]}">${m.q}</span>`:""}`;if(onPick)c.onclick=()=>onPick(i);box.append(c)});
  const on=box.children[curIdx<0?box.children.length-1:curIdx];if(on)box.scrollLeft=on.offsetLeft-box.clientWidth/2+on.offsetWidth/2;else box.scrollLeft=box.scrollWidth}
function actionBar(box,items){box.innerHTML="";const out={};for(const[id,icon,label,fn,pri]of items){const b=document.createElement("button");if(pri)b.className="pri";
  b.innerHTML=`<span class="ic" aria-hidden="true">${icon}</span>${label}`;b.setAttribute("aria-label",String(label).replace(/<[^>]*>/g,""));b.onclick=()=>{vibrate(8);fn()};
  if(/（剩 0）/.test(String(label))){b.disabled=true;b.title="用完了"}   /* 11/11 AI 模擬玩家報告問題 7：提示棋、悔棋符這類寫著「（剩 0）」的按鈕直接停用，不讓人按了才說沒有 */
  box.append(b);out[id]=b}return out}   /* Gemini 評估 11/8（介面圖示化）：圖示按鈕一律有 aria-label */

// ================= 賽後報告：準確度、開局／中局／殘局分數、S～D 評級、Pikafish 講解 =================
// 每步準確度＝100×e^(−損失/200)（損失＝比引擎最佳著法少幾分，1 兵＝100 分）；
// 大優時的失誤也照算（不再打折），跟失著／敗著的標記一致。
// 總分＝平均準確度＋妙著加分（每個 +2，最多 +6），再依失著／敗著設上限：
//   有敗著最高 A（89）；失著＋敗著 ≥3 步或 ≥10% 最高 B（79）；≥6 步或 ≥20% 最高 C（69）。
// 評級 S≥90、A≥80、B≥70、C≥60、D<60。
// 階段：前 20 步（各走 10 回合）是開局；雙方車馬炮合計剩 6 個以下起算殘局；其他是中局。
const GRADES=[["S",90,"#7B3FBF","幾乎跟引擎同步，這盤下得非常漂亮"],["A",80,"#2F6B4F","下得很穩，只有少數不夠精確的地方"],["B",70,"#3A7BD5","整體不錯，但有幾步把優勢讓了出去"],
  ["C",60,"#D9822B","有明顯的失誤，算棋還要再仔細一點"],["D",0,"#C0392B","失誤偏多，建議多做殺法和殘局練習"]];
const gradeFor=x=>GRADES.find(g=>x>=g[1]);
const rnd=n=>Math.ceil(n/2);
/* 開發者 11/6（第二裁判：同一個 Pikafish 深算對照）：評語分界線放寬成 正著<30／穩著≤60／緩著≤150／失著≤400／敗著>400 分；存檔裡舊的評語照「少幾分」重算（妙著照舊） */
function qNow(m){if(!m||!m.q)return m&&m.q;const q0=({"妙手":"妙著","正手":"正著","優著":"穩著","良著":"緩著","錯著":"失著","露著":"敗著"})[m.q]||m.q;if(m.loss==null||q0==="妙著"||q0==="—")return q0;const l=m.loss;return l<30?"正著":l<=60?"穩著":l<=150?"緩著":l<=400?"失著":"敗著"}
/* ================= 影子模式：勝率尺度的新算法（開發者 11/11 照三方審查「新算法修好必改後走影子模式」） =================
   畫面一律顯示舊算法（qNow／gameReport／talk／reportSheet 的分數、評語、評級一個字都沒改）；新算法只在背景算：
   ・mxShadowReport(rep)：拿 gameReport 的結果再算一份新的每步勝率損失、評語、一盤總分、評級，不動 rep。
   ・05b-save.js 的 cpa*：跟電腦下完一盤，新舊總分存在 store "mxShadow"（最近 200 盤），並匿名送 t:"cpu"（設定 → 隱私可關）。
   ・開發者模式：賽後報告最下面多一塊「🛠 新算法（影子模式）」並列新舊（reportSheet），孩子看不到。
   三方審查（story/75_數學模型新算法_三方審查整理.md）的上線前必改 1～4 都在這一段：
   ①存檔還原 bug：沒有 bv（最佳著法評估原值）時，最佳評估＝ev「先夾到 ±2000」再加 loss（loss 本來就是兩邊夾過才相減）；不存 dw、一律重算（k 改了不會留下過時的 dw）。
   ②殺棋特例（Lichess lila modules/tree/src/main/Advice.scala 的 MateAdvice 分界）：走進對方的強制殺棋、錯過自己的強制殺棋直接決定評語，另外標「送殺」「漏殺」。
   ③一盤總分不沿用舊門檻：Lichess 的合成（依局勢波動加權的平均、調和平均各半，lila AccuracyPercent.scala），上限規則改看「勝率掉 ≥ capDw% 的步數」，
     S／A／B／C 門檻放在 MXS.gr，等影子資料（≥100 人、≥1000 盤）用分位對應重訂（tools/calibrate-grades.js）。
   ④k、評語門檻集中在 MXS：門檻 th 由 k 和均勢 cp 分界算出來，k 改了門檻自動跟著改；改了任何一個數字就把 MXS.ver 加 1（匿名資料帶著版本）。
   core.js（xiangqi-referee.js 的 classifyRaw）只多回傳 bv，評語照舊；新算法全部在這裡。 */
const MXS={ver:1,
  k:0.00368208,          /* 勝率曲線斜率 Win%(cp)＝100／(1＋e^(−k·cp))：先沿用 Lichess（lichess.org/page/accuracy）；之後用 t:"cpu" 真人對局分段位擬合（tools/calibrate-wdl.js），不可用引擎自對局（Pikafish 自己的曲線 +150 就 96%，會灌水） */
  cp:[30,60,150,400],    /* 均勢時的評語分界（開發者 11/6 深算驗證過的 cp）；th＝Win%(cp)−50 由 k 算出（下一行） */
  mate:20000,            /* |評估| ≥ 這個＝有殺（engine.js 把 mate n 換成 ±(30000−n)；跟 evText 同一個分界） */
  walk:[-700,-1000],     /* 走進對方殺棋：走之前（最佳著法）的評估 > −700 → 敗著；−1000～−700 → 失著；更差 → 緩著 */
  miss:[700,1000],       /* 錯過自己的殺棋：走完的評估 ≤ 700 → 敗著；700～1000 → 失著；> 1000 → 緩著 */
  hm:.5,                 /* 一盤準確度＝(1−hm)·波動加權平均＋hm·調和平均（Lichess 各半） */
  win:[2,8],wt:[.5,12],  /* 波動權重：視窗＝總手數/10 夾在 2～8；視窗內勝率的標準差夾在 0.5～12（Lichess） */
  capDw:10,              /* 上限規則看「勝率掉 ≥ 10%」的步數（Claude 複審 #4 修法 (b)），送殺、漏殺判成失著／敗著的也算 */
  cap:{n:[3,6],r:[.1,.2],v:[79,69],blun:89},   /* 上限結構照舊：≥3 步或 ≥10% 最高 79、≥6 步或 ≥20% 最高 69、有敗著最高 89——數字待分位對應 */
  gr:[90,80,70,60],      /* S／A／B／C 門檻：暫用舊的，待校正 */
  bonus:[2,6]};          /* 妙著每個 +2、最多 +6（照舊） */
MXS.th=MXS.cp.map(c=>mxWin(c)-50);   /* 均勢時跟 cp 分界逐點對齊（k＝0.00368208 時 2.758／5.502／13.47／31.35%）；mxWin、mxClamp 都是 function 宣告（會提升），這一行在載入時就能算 */
function mxClamp(v){return Math.max(-2000,Math.min(2000,+v||0))}
function mxWin(cp){return 100/(1+Math.exp(-MXS.k*mxClamp(cp)))}
function mxAccDw(dw){return Math.max(0,Math.min(100,103.1668*Math.exp(-0.04354*Math.max(0,+dw||0))-3.1669))}   /* Lichess 每步準確度（沒加 +1 的不確定加分，跟 Lichess 的差別寫在合併說明.md） */
function mxGradeDw(dw){const t=MXS.th;return dw<t[0]?"正著":dw<=t[1]?"穩著":dw<=t[2]?"緩著":dw<=t[3]?"失著":"敗著"}
/* 一步的最佳、實際評估（走的那一方視角）：b 最佳著法、p 實際走完；bk＝b 是原值（有 bv）還是還原的；eq＝不知道是哪一方或沒有 ev，只能當均勢（b＝loss、p＝0） */
function mxEv(m){if(!m||m.loss==null||!isFinite(+m.loss))return null;const l=Math.max(0,+m.loss),sg=m.by==="r"?1:m.by==="b"?-1:0;
  if(!sg||m.ev==null||!isFinite(+m.ev))return{b:l,p:0,bk:0,eq:1};const p=sg*(+m.ev);
  if(m.bv!=null&&isFinite(+m.bv))return{b:sg*(+m.bv),p,bk:1};
  return{b:mxClamp(p)+l,p,bk:0}}   /* ←必改①：ev 先夾到 ±2000 再加 loss（Claude 複審 §4-1：用沒夾的 ev，走進殺棋 −29990 會被還原成「正著、100 分」） */
/* 一步的新評語。mt：0 沒事、1 送殺（走進對方的強制殺棋）、2 漏殺（有殺沒走）；mh＝漏殺是推估的（舊存檔沒有 bv，只知道最佳 ≥ 2000，比照 talk 的 1900 分界） */
function mxShMove(m){const q0=qNow(m);if(!q0||q0==="—")return null;const e=mxEv(m);if(!e)return null;
  const dw=Math.max(0,mxWin(e.b)-mxWin(e.p)),M=MXS.mate;let q=q0==="妙著"?"妙著":mxGradeDw(dw),mt=0,mh=0;
  if(q0!=="妙著"&&!e.eq){
    if(e.p<=-M&&(e.bk?e.b>-M:e.b>-2000)){mt=1;q=e.b>MXS.walk[0]?"敗著":e.b>MXS.walk[1]?"失著":"緩著"}   /* 走之前還沒被殺（沒 bv 時：夾過的最佳 > −2000） */
    else if(e.p<M&&(e.bk?e.b>=M:e.b>=2000&&e.p<1900)){mt=2;mh=e.bk?0:1;q=e.p<=MXS.miss[0]?"敗著":e.p<=MXS.miss[1]?"失著":"緩著"}}
  return{b:e.b,p:e.p,bk:e.bk,dw,acc:mxAccDw(dw),q0,q,mt,mh}}
/* 一方的新總分（rep＝gameReport 的結果；照 rep.plies 的 phase、by、ply） */
function mxShSide(rep,s){const P=rep&&rep.plies||[],X=[];for(const m of P){if(m.by!==s)continue;const x=mxShMove(m);if(x)X.push({m,x})}if(!X.length)return null;
  const W=[50];let last=50;for(const m of P){if(m.ev!=null&&isFinite(+m.ev))last=mxWin(+m.ev);W.push(last)}   /* 每一手走完的勝率（紅方視角），第 0 個＝開局前；沒評到的手沿用上一手 */
  const ws=Math.max(MXS.win[0],Math.min(MXS.win[1],Math.floor(P.length/10))),sdv=a=>{const u=a.reduce((x,y)=>x+y,0)/a.length;return Math.sqrt(a.reduce((x,y)=>x+(y-u)**2,0)/a.length)},win=[];
  for(let i=0;i<Math.min(ws,W.length)-2;i++)win.push(W.slice(0,ws));for(let i=0;i+ws<=W.length;i++)win.push(W.slice(i,i+ws));if(W.length<ws)win.push(W.slice());
  const wOf=ply=>{const a=win[ply-1];return a?Math.max(MXS.wt[0],Math.min(MXS.wt[1],sdv(a))):1};
  let sw=0,sa=0,sh=0;const cnt={},ph={};for(const{m,x}of X){const w=wOf(m.ply);sw+=w;sa+=w*x.acc;sh+=1/Math.max(1,x.acc);cnt[x.q]=(cnt[x.q]||0)+1;const o=ph[m.phase]||(ph[m.phase]={s:0,n:0});o.s+=x.acc;o.n++}   /* 調和平均的每一步至少算 1 分（0 分會讓調和平均變 0） */
  const wm=sa/sw,hmean=X.length/sh,base=(1-MXS.hm)*wm+MXS.hm*hmean,C=MXS.cap,bonus=Math.min(MXS.bonus[1],MXS.bonus[0]*(cnt["妙著"]||0)),
    bad=X.filter(({x})=>x.dw>=MXS.capDw||x.q==="失著"||x.q==="敗著").length,blun=cnt["敗著"]||0,br=bad/X.length,
    cap=bad>=C.n[1]||br>=C.r[1]?C.v[1]:bad>=C.n[0]||br>=C.r[0]?C.v[0]:blun?C.blun:100,score=Math.min(cap,Math.round(base+bonus)),gi=MXS.gr.findIndex(g=>score>=g);
  return{score,grade:"SABCD"[gi<0?4:gi],base,wm,hmean,bonus,cap,cnt,n:X.length,bk:X.filter(({x})=>x.bk).length,
    ph:Object.fromEntries(Object.entries(ph).map(([k,o])=>[k,{score:Math.round(o.s/o.n),n:o.n}])),
    mv:X.map(({m,x})=>({ply:m.ply,cn:m.cn,ph:m.phase,loss:m.loss,...x}))}}
function mxShadowReport(rep){return{ver:MXS.ver,r:mxShSide(rep,"r"),b:mxShSide(rep,"b")}}
/* 開發者模式才看得到：賽後報告並列新舊（三方審查：新舊兩個數字不給孩子看，會困惑） */
function mxShHtml(R,X){if(!X||!R||R.score==null)return"";const QS=["妙著","正著","穩著","緩著","失著","敗著"],df=X.mv.filter(v=>v.q!==v.q0||v.mt);
  return`<details style="margin-top:12px"><summary class="muted">🛠 新算法（影子模式，只有開發者看得到）</summary>
    <table class="ttab" style="margin-top:6px"><tr><th></th><th>畫面（舊）</th><th>影子（新）</th></tr>
    <tr><td>總分</td><td>${R.score}（${R.grade[0]}）</td><td>${X.score}（${X.grade}）</td></tr>
    <tr><td>準確度</td><td>${R.base.toFixed(1)}</td><td>${X.base.toFixed(1)}<br><small class="muted" style="font-weight:400">波動加權 ${X.wm.toFixed(1)}・調和 ${X.hmean.toFixed(1)}</small></td></tr>
    <tr><td>上限</td><td>${R.cap}</td><td>${X.cap}</td></tr>${QS.map(q=>`<tr><td>${q}</td><td>${R.cnt[q]||0}</td><td>${X.cnt[q]||0}</td></tr>`).join("")}</table>
    ${df.length?`<div class="muted" style="font-size:12.5px;line-height:1.6;margin-top:6px">評語不一樣的步：${df.slice(0,30).map(v=>`第 ${v.ply} 手 ${esc(v.cn||"")} ${v.q0}→${v.q}（勝率 −${v.dw.toFixed(1)}%${v.mt===1?"・送殺":v.mt===2?"・漏殺"+(v.mh?"（推估）":""):""}）`).join("；")}</div>`:""}
    <p class="muted" style="font-size:12px;margin:6px 0 0">MXS v${MXS.ver}：k＝${MXS.k}、評語門檻 ${MXS.th.map(t=>t.toFixed(2)).join("／")}%、殺棋分界 ${MXS.walk.join("／")}・${MXS.miss.join("／")}、S／A／B／C ${MXS.gr.join("／")}（都還沒用真人資料校正）${X.bk<X.n?`；${X.n-X.bk} 步沒有最佳評估原值（舊存檔或舊快取），用 ev 夾值＋loss 還原`:""}</p></details>`}
function gameReport(board0,moves){
  moves=(moves||[]).map(m=>m&&m.q&&m.loss!=null&&qNow(m)!==m.q?{...m,q:qNow(m)}:m);
  const b=board0.slice(),out={r:null,b:null},plies=[];let endFrom=null;
  /* 意見回饋 594：石桌往事從中局開始的那盤沒有「開局」——只有從標準開局擺起的對局，前 20 步才算開局 */
  const std=(()=>{try{const S=XQCore.parseFen(XQCore.START);return S.every((p,i)=>(p||null)===(board0[i]||null))}catch(e){return true}})();
  moves.forEach((m,i)=>{const cap=b[m.t];b[m.t]=b[m.f];b[m.f]=null;
    const big=b.filter(p=>p&&"RNCrnc".includes(p)).length;if(endFrom==null&&big<=6)endFrom=i+1;
    plies.push({...m,ply:i+1,cap,phase:endFrom!=null?"end":i<20&&std?"open":"mid"})});
  for(const s of["r","b"]){const mine=plies.filter(m=>m.by===s),graded=mine.filter(m=>m.loss!=null&&m.q&&m.q!=="—");
    const sg=s==="r"?1:-1,cnt={};for(const m of graded)cnt[m.q]=(cnt[m.q]||0)+1;
    const acc=m=>100*Math.exp(-m.loss/200);
    const avg=a=>a.length?a.reduce((x,m)=>x+acc(m),0)/a.length:null;
    const ph={};for(const k of["open","mid","end"]){const a=graded.filter(m=>m.phase===k);ph[k]=a.length?{score:Math.round(avg(a)),n:a.length}:null}
    const base=avg(graded),bonus=Math.min(6,2*(cnt["妙著"]||0)),blun=cnt["敗著"]||0,bad=(cnt["失著"]||0)+blun,br=graded.length?bad/graded.length:0,
      cap=bad>=6||br>=.2?69:bad>=3||br>=.1?79:blun?89:100,score=base==null?null:Math.min(cap,Math.round(base+bonus));
    const checks=mine.filter(m=>m.ck).length,caps=mine.filter(m=>m.cap).length;
    const style=!mine.length?"":checks>=mine.length*.15||caps>=mine.length*.35?"🔥 攻殺型":(cnt["失著"]||0)+(cnt["敗著"]||0)===0&&(score||0)>=75?"🛡 穩健型":"⚖ 均衡型";
    out[s]={score,grade:score==null?null:gradeFor(score),base,bonus,cap,phases:ph,cnt,n:mine.length,graded:graded.length,style,talk:talk(s,plies,graded,ph,score)}}
  return{sides:out,plies,endFrom,complete:plies.every(m=>m.q)}}
/* ChatGPT 數值盤查 11/11 P1：一步的殺棋訊號（走這步的一方視角）。回 {b：最佳著法是不是殺棋, p：實際這步走完是不是殺棋}；
   新存檔看 bmt／pmt（core.js classifyRaw），今天稍早的存檔看 bv＋ev 原值（≥ MXS.mate＝有殺，跟影子模式、evText 同一個分界）；兩種都沒有的舊存檔回 null，不推定 */
function talkMate(m){if(!m)return null;if(m.bmt!==undefined)return{b:m.bmt!=null&&m.bmt>0,p:m.pmt!=null&&m.pmt>0};
  const sg=m.by==="r"?1:m.by==="b"?-1:0;if(sg&&m.bv!=null&&isFinite(+m.bv)&&m.ev!=null&&isFinite(+m.ev))return{b:sg*(+m.bv)>=MXS.mate,p:sg*(+m.ev)>=MXS.mate};return null}
// 講解：只用 Pikafish 的評估數字整理出來，不是抄別人的講評
function talk(s,plies,graded,ph,score){if(score==null)return[];const sg=s==="r"?1:-1,T=[];
  T.push({t:"總評",x:gradeFor(score)[3]+"。"});
  const PN={open:"開局",mid:"中局",end:"殘局"},have=Object.entries(ph).filter(([,v])=>v&&v.n>=3);
  if(have.length>=2){have.sort((a,b)=>b[1].score-a[1].score);const hi=have[0],lo=have[have.length-1];
    T.push({t:"階段",x:hi[1].score-lo[1].score<5?`各階段表現差不多（${have.map(([k,v])=>PN[k]+" "+v.score).join("、")}），很平均。`
      :`${PN[hi[0]]}最好（${hi[1].score} 分），${PN[lo[0]]}最需要加強（${lo[1].score} 分）。`+(lo[0]==="open"?"可以多看開局譜，熟悉前十回合的常見走法。":lo[0]==="end"?"殘局要算得更細，建議多練古典殘局譜。":"中局要多注意對方的威脅再出手。")})}
  // 優勢易手：局勢從這方有利（≥1.5 兵）變成不利，或反過來
  let lead=0;for(const m of plies){if(m.ev==null)continue;const v=sg*m.ev,now=v>=150?1:v<=-150?-1:0;
    if(now&&lead&&now!==lead)T.push({t:now>0?"翻盤":"被翻盤",ply:m.ply,x:`第 ${rnd(m.ply)} 回合${m.by===s?"你":"對方"}走${m.cn}之後，局勢${now>0?"轉成你有利":"變成對方有利"}（${evt(m.ev)}）。`});
    if(now)lead=now}
  // 最大失誤：錯過殺棋、敗著、失著
  const bad=graded.filter(m=>m.q==="失著"||m.q==="敗著").sort((a,b)=>b.loss-a.loss).slice(0,3);
  /* ChatGPT 數值盤查 11/11 P1 優勢被報為殺棋：以前用「走完後分數＋損失 ≥ 1900」推定原本有殺，最佳普通分 +1950、實走 +1450 也會說「這時已經有殺棋」。
     改成只看引擎的殺棋訊號 talkMate(m)：新存檔有 bmt／pmt（core.js classifyRaw，走方視角）；今天稍早的存檔有 bv（最佳評估原值，跟影子模式 mxEv 同一個欄位、同一個殺棋分界 MXS.mate）。
     有訊號：最佳著法是殺棋、實際這步不是 → 「錯過殺棋」。沒有訊號的舊存檔：原本會被推定成殺棋的那種（最佳 ≥ 1900、走完 < 1900）改說「錯失明顯優勢」，不再說有殺 */
  for(const m of bad){const after=sg*(m.ev||0),best=after+m.loss,ms=talkMate(m),missMate=!!ms&&ms.b&&!ms.p,bigLead=!ms&&best>=1900&&after<1900;
    /* 評比循環第 1 輪：兵數用 pawnAbout（00-util.js，跟著法條泡泡、關鍵一步同一個換算）；「走完之後…」改用 evLink，講清楚這是走完整盤誰好、不是這步的評等 */
    const lk=evLink(m.ev,m.by||s);T.push({t:missMate?"錯過殺棋":bigLead?"錯失明顯優勢":m.q,ply:m.ply,bad:1,x:`第 ${rnd(m.ply)} 回合 ${m.cn}：${missMate?"這時已經有殺棋":(bigLead?"這時原本有明顯優勢，":"")+"這步比最好的走法"+lossAbout(m.loss)}`+(m.bc?`，Pikafish 建議 ${m.bc}`:"")+(lk?`；${lk}`:"")+"。"})}
  for(const m of graded.filter(m=>m.q==="妙著").slice(0,3))T.push({t:"妙著",ply:m.ply,good:1,x:`第 ${rnd(m.ply)} 回合 ${m.cn}：其他走法都至少少了 2 個兵的價值，只有這步最好。`});   /* 評比循環第 1 輪：跟 core.js 妙著的分界（第二好差 200 分以上）一致，原本寫 1.5 兵 */
  if(!bad.length&&graded.length>=10)T.push({t:"亮點",x:"整盤沒有失著或敗著，防守很紮實。"});
  return T.sort((a,b)=>(a.ply||0)-(b.ply||0))}
// 報告畫面（底部選單）。opts：{title, side:預設看哪一方, names:{r,b}, goto(ply)}
function reportSheet(rep,opts){let s=opts.side||"r";
  const SH=(()=>{try{return typeof DEVMODE==="function"&&DEVMODE()?mxShadowReport(rep):null}catch(e){return null}})();   /* 開發者 11/11 影子模式：只有開發者模式算、最下面並列新舊（mxShHtml）；一般玩家的畫面完全照舊 */
  sheet(opts.title||"賽後報告",b=>{const paint=()=>{const R=rep.sides[s],nm=opts.names||{r:"紅方",b:"黑方"};
    const PN=[["open","開局"],["mid","中局"],["end","殘局"]],QS=["妙著","正著","穩著","緩著","失著","敗著"];
    b.innerHTML=(opts.note?`<p class="muted" style="font-size:12.5px;margin:0 0 8px;line-height:1.6">${esc(opts.note)}<br>每一手的分數是 Pikafish 短時間思考的估計，局面複雜時可能會變；想看得更深，在那一步按 🔍 分析。</p>`:"")+`<div class="opt">${["r","b"].map(x=>`<button data-sd="${x}" class="${x===s?"on":""}">${x==="r"?"🔴":"⚫"} ${esc(nm[x])}</button>`).join("")}</div>`+
      (R.score==null?`<p class="muted">${(rep.plies||[]).length<10?`這盤只走了 ${(rep.plies||[]).length} 步，步數太少，無法分析。`:"這一方還沒有評等過的著法。"}</p>`:`
      <div class="rp-top"><div class="rp-g" style="background:${R.grade[2]}">${R.grade[0]}</div><div><div class="rp-s">${R.score}<small> 分</small></div>
        <div class="muted">準確度 ${R.base.toFixed(1)}${R.bonus?`＋妙著 ${R.bonus}`:""}${R.cap<100&&R.base+R.bonus>R.cap?`・因失著／敗著最高 ${R.cap}`:""}・${R.style}</div></div></div>
      ${rep.complete?"":`<p class="muted">⚠ 還有 ${rep.plies.filter(m=>!m.q).length} 步沒評等，分數暫時不完整</p>`}
      <div class="rp-ph">${PN.map(([k,l])=>{const p=R.phases[k];return`<div><span>${l}</span><b>${p?p.score:"—"}</b><i style="width:${p?p.score:0}%;background:${p?gradeFor(p.score)[2]:"transparent"}"></i><small class="muted">${p?p.n+" 步・"+gradeFor(p.score)[0]:"沒走到"}</small></div>`}).join("")}</div>
      <div class="rp-q">${QS.map(q=>`<span style="color:${QC[q]}"><b>${R.cnt[q]||0}</b>${q}</span>`).join("")}</div>
      <div class="sec-t" style="margin-left:0">電腦分析（Pikafish）講解</div>
      ${R.talk.map(t=>`<div class="rp-t${t.bad?" bad":t.good?" good":""}"${t.ply?` data-p="${t.ply}"`:""}><b>${esc(t.t)}</b>${esc(t.x)}${t.ply&&opts.goto?'<span class="go">看這步 ›</span>':""}${t.bad&&t.ply&&opts.retry&&opts.retry.side===s?`<div style="margin-top:7px"><button class="pill" data-re="${t.ply}" style="font-weight:800">↻ 從這步再下一次</button></div>`:""}</div>`).join("")}
      <p class="muted" style="font-size:12px;margin-top:12px">評級：S≥90、A≥80、B≥70、C≥60、D&lt;60。每步準確度依「比 Pikafish 最佳著法少幾分」換算（大優時的失誤也照算），再加妙著分。有敗著最高 A；失著＋敗著 3 步以上（或 10%）最高 B；6 步以上（或 20%）最高 C。開局＝前 10 回合；殘局＝雙方車馬炮合計剩 6 個以下。</p>${SH?mxShHtml(R,SH[s]):""}`);
    b.querySelectorAll("[data-sd]").forEach(x=>x.onclick=()=>{s=x.dataset.sd;paint()});
    if(opts.goto)b.querySelectorAll("[data-p]").forEach(x=>x.onclick=()=>{closeSheet();opts.goto(+x.dataset.p)});
    if(opts.retry)b.querySelectorAll("[data-re]").forEach(x=>x.onclick=e=>{e.stopPropagation();vibrate(8);opts.retry.go(+x.dataset.re)})};paint()})}
/* 開發者 11/11 選「複盤錯著重下」（規劃書 D01）：看完報告，在失著／敗著那一條直接按「↻ 從這步再下一次」，從那一步之前的局面跟電腦（第 16 級）重下，
   不用回首頁再去「錯棋重練」找。開局方式、題目代號（對局／第幾步）跟錯棋重練（04-stats.js 的 start）一樣，所以練會了那邊也會打勾、照樣排複習 */
/* ChatGPT 改善單 T01（開發者 11/11 核准）：主流程的「從這步重下」也走這裡——o.lx＝用原本那盤的難度（沒給才照舊第 16 級）；o.t01＝主流程的記號（回哪一頁、難度、棋理），
   存進練習那盤的 practice.t01（local.js 原樣保存），練習頁的標題、返回、結算視窗才知道要接回主流程。練習一樣不算戰績、不算段位、不進對局紀錄（local.js playEnd 遇到 practice 直接 return） */
async function rpRetry(o,ply){const m=o.moves[ply-1];if(!m)return;
  const go=async()=>{try{const pre={moves:o.moves.slice(0,ply-1).map(m=>({f:m.f,t:m.t,q:m.q,loss:m.loss,ev:m.ev,bc:m.bc,bm:m.bm,bp:m.bp})),
      info:{key:o.c+"/"+o.id+"/"+ply,ply,cn:m.cn,q:m.q,loss:m.loss,bc:m.bc||"",opp:o.opp||"",date:String(o.id).slice(0,10),...(o.t01?{t01:o.t01}:{})}};
    await api("/play/new",{human:o.side,lx:o.lx||16,pre});closeSheet();toast(`↻ 回到第 ${ply} 步之前，換一步試試看`);if(location.hash==="#/redo/play")route();else location.hash="#/redo/play"}catch(e){toast(e.message)}};
  let s=null;try{s=await api("/play/state")}catch(e){}
  if(s&&s.ranked&&!s.result&&s.moves.length>=2)confirmBox("晉級賽還沒下完，開始練習會算輸，確定？",go,"開始練習");
  else if(s&&!s.ranked&&!s.practice&&!s.result&&s.moves.length>=2)confirmBox("挑戰電腦還有一盤沒下完，開始練習會蓋掉它，確定？",go,"開始練習");else go()}
/* ================= ChatGPT 改善單 T01＋G01（開發者 11/11 核准）：一條完整主流程（前綴 mfl＝main flow）=================
   首頁「快下一盤」→ 下完（或中途離開再「▶ 接著下」）→ 結算視窗「🔎 看懂這盤最關鍵的一步」→ 檢討頁停在那一步之前（10-db.js 的關鍵步模式）
   →「↻ 從這步重下」（rpRetry，同一個難度、練習模式、不算段位）或「🧠 練一題同樣的棋理」（G01：07-legend.js jPuzzle 的示範模式，#/theme/<棋理>/try）。
   領獎、角色對話、故事都不是必經；示範練習不記正確率、不加修為、不算段位和「我的棋力」。
   store：mflKey＝最關鍵的一步 {c,id,ply,side,lx,cn,q,loss,bc,bm,at}（檢討頁看到這一盤就進關鍵步模式）；mflDemo＝示範練習從哪來 {tag,back,at} */
/* 最關鍵的一步：我方有評等的著法裡少最多分（loss 最大）的那一步，同分取前面的；少不到 30 分（正著、妙著）不算錯著。
   評語照 qNow（跟賽後報告、錯棋重練同一套分界）。回 {b:{ply 第幾步,cn,q,loss,bc,bm}｜null, all 我方每步都評完了沒, n 評好幾步, need 我方共幾步} */
function mflPick(moves,side){let b=null,all=true,n=0,need=0;
  (moves||[]).forEach((m,i)=>{if(!m||m.by!==side)return;need++;const q=qNow(m);if(!q){all=false;return}if(q==="—")return;n++;const l=+m.loss;
    if(!isFinite(l)||l<30||q==="妙著"||q==="正著")return;if(!b||l>b.loss)b={ply:i+1,cn:m.cn||"",q,loss:l,bc:m.bc||"",bm:m.bm||"",rr:m.rr,bmt:m.bmt}});   /* rr、bmt：失著的具體後果（mflRisk） */
  return{b,all,n,need}}
/* ChatGPT 評審 11/11（失著的具體後果）：一句「這手讓對方……」。只看 Pikafish 的分析線——core.js classifyRaw 存的 rr＝這步走完後對方的最佳回應
   {m ICCS, c 中文記譜, x 吃到哪顆子, k 是否將軍, mt 對方幾步內將死}；沒有 rr（舊存檔、走的就是最佳著）或那一手沒吃子、沒將軍、沒殺棋就回 ""，不猜。
   b0（可省略）＝走這步之前的盤面、m＝實際走的 {f,t}：有給就用規則（XQCore.legal／make／inCheck）重算一次，那手不合法就不說，吃子、將軍以盤面為準。
   side＝走這步的一方（玩家）；g＝這步的評等 {rr,bmt}。順序：將死 → 吃子（子名照紅黑：俥／車…）→ 將軍。最佳著也是被殺（bmt＜0）就不怪這步、不說將死 */
function mflRisk(b0,side,m,g){try{const C=window.XQCore,R=g&&g.rr;if(!C||!R||typeof R!=="object"||(side!=="r"&&side!=="b")||!/^[a-i]\d[a-i]\d$/.test(String(R.m||"")))return"";
  const os=side==="r"?"b":"r";let x=R.x||null,k=!!R.k,c=String(R.c||"").slice(0,12);
  if(b0&&m&&b0[m.f]){if(C.sideOf(b0[m.f])!==side)return"";const a=C.make(b0,m.f,m.t),rf=C.parseSq(R.m.slice(0,2)),rt=C.parseSq(R.m.slice(2,4));
    if(!C.legal(a,os).some(([p,q])=>p===rf&&q===rt))return"";x=a[rt]&&C.sideOf(a[rt])===side?a[rt]:null;k=C.inCheck(C.make(a,rf,rt),side);c=C.notate(a,rf,rt)}
  const W=c?`（${c}）`:"",mt=Math.round(+R.mt);
  if(mt>=1&&mt<=50&&!(g.bmt!=null&&g.bmt<0))return mt===1?`這手讓對方下一手就能將死你${W}。`:`這手讓對方 ${mt} 步內就能將死你${c?`，從「${c}」開始`:""}。`;
  if(x&&!/[kK]/.test(x)&&C.sideOf(x)===side)return`這手讓對方下一手可以吃你的${C.NAMES[side][x.toUpperCase()]}${W}。`;
  if(k)return`這手讓對方下一手可以將軍你${W}。`;return""}catch(e){return""}}
/* 一句白話的「為什麼」＋對應的棋理（THEMES 的名字；看不出來回 null，由呼叫的人用 weakTheme 補）。
   b0＝走這步之前的盤面、side＝誰走、m＝實際走的 {f,t,cn}、g＝這步的評等 {q,loss,ev,bv,bmt,pmt,bc,bm}。
   只用 XQCore 現成的規則函式（legal／make／inCheck／VAL／NAMES）看盤面，不另做規則引擎；順序：錯過殺棋 → 走進殺棋 → 白送子／沒處理對方的捉子 → 錯過吃子 → 錯過捉雙 → 錯過將軍 → 照評等說少幾兵 */
function mflWhy(b0,side,m,g){const C=window.XQCore;g=g||{};if(!C||!b0||!m||!b0[m.f])return{say:"",tag:null};
  try{const os=side==="r"?"b":"r",sg=side==="r"?1:-1,V=x=>x?(C.VAL[x.toUpperCase()]||0):0,N=x=>x?C.NAMES[C.sideOf(x)][x.toUpperCase()]:"",
      bm=g.bm&&/^[a-i]\d[a-i]\d$/.test(g.bm)?{f:sqI(g.bm.slice(0,2)),t:sqI(g.bm.slice(2,4))}:g.bc?bcMove(b0,side,g.bc):null,
      okB=!!(bm&&b0[bm.f]&&C.sideOf(b0[bm.f])===side&&!(bm.f===m.f&&bm.t===m.t)),bcn=okB?C.notate(b0,bm.f,bm.t):(g.bc||""),SAY=s=>bcn?s:"",after=C.make(b0,m.f,m.t),loss=+g.loss||0,
      /* 對方（s）在盤面 bd 上吃哪一顆子最划算：吃完我方換得回來就扣掉吃子那顆的價值；淨賺 ≥ 1.5（比一個兵多）才算 */
      lose=(bd,s)=>{let w=null;for(const[f,t]of C.legal(bd,s)){const p=bd[t];if(!p||C.sideOf(p)===s||/[kK]/.test(p))continue;const nb=C.make(bd,f,t),re=C.legal(nb,C.opp(s)).some(x=>x[1]===t),gain=re?V(p)-V(bd[f]):V(p);
        if(gain>=1.5&&(!w||gain>w.gain))w={f,t,gain,pc:p,by:bd[f],re}}return w};   /* re：我方吃得回來（評比循環第 1 輪：吃得回來就不能說「換不回來，等於白送」） */
    const ms=typeof talkMate==="function"?talkMate({...g,by:side}):null;
    if(ms&&ms.b&&!ms.p)return{say:`這時你已經有殺棋${bcn?`：從「${bcn}」開始一路將下去就能贏`:""}，這步讓對方逃掉了。`,tag:"殺棋"};
    const walk=g.pmt!==undefined?(g.pmt!=null&&g.pmt<0&&!(g.bmt!=null&&g.bmt<0)):(g.ev!=null&&sg*g.ev<=-MXS.mate&&(g.bv!=null?sg*g.bv>-MXS.mate:mxClamp(sg*g.ev)+loss>-2000));
    if(walk)return{say:"走完這步，對方就有一套連續將軍的殺法。走之前先看看：對方下一步能不能將你？",tag:"殺棋"};
    /* 評比循環第 1 輪（AI 模擬玩家第二輪問題 6：「你換不回來，等於白送」但傌其實能吃回砲）：
       ① 吃得回來（re）就改說「吃回來也虧」，只有規則上真的吃不回來才說「換不回來」；
       ② 有分析線（g.rr＝core.js 存的「這步走完對方的最佳回應」）時，對方最佳回應要正好吃在那一格才講這一段，吃子的那顆子也照分析線；
          分析線說對方最好是別的走法（或 rr＝null），就不講白送（後面的 mflRisk 會照分析線講）。舊存檔沒有 rr（undefined）才只看規則 */
    if(loss>=100){let L1=lose(after,os);const R=g.rr;
      if(L1&&R!==undefined){const ok=!!R&&typeof R==="object"&&/^[a-i]\d[a-i]\d$/.test(String(R.m||""));const rf=ok?sqI(R.m.slice(0,2)):-1,rt=ok?sqI(R.m.slice(2,4)):-1;
        if(!ok||rt!==L1.t||!after[rf]||C.sideOf(after[rf])!==os||!C.legal(after,os).some(([x,y])=>x===rf&&y===rt))L1=null;
        else{const nb=C.make(after,rf,rt);L1={...L1,f:rf,by:after[rf],re:C.legal(nb,side).some(x=>x[1]===rt)}}}
      if(L1){const L0=lose(b0,os),X=N(L1.pc),Y=N(L1.by);
      if(L0&&L0.t===L1.t&&L1.t!==m.t)return{say:L1.re?`對方本來就在捉你的「${X}」，這步沒有先處理；被對方的「${Y}」吃掉，你就算吃回來也虧。`:`對方本來就在捉你的「${X}」，這步沒有先處理（逃開或保護），讓對方的「${Y}」白白吃掉。`,tag:null};
      /* 評比循環第 2 輪（分析一致性案例庫）：這步自己先吃了對方的子（炮二進七打馬、俥吃士將軍），被吃回去不能說「換不回來，等於白送」——把吃到的子一起算：差不多就說換子，差很多才說虧 */
      const c0=b0[m.t];if(L1.t===m.t&&c0&&C.sideOf(c0)===os){const Z=N(c0),net=(L1.re?V(L1.pc)-V(L1.by):V(L1.pc))-V(c0);
        return{say:net<1.5?`你的「${X}」吃掉對方的「${Z}」，但對方的「${Y}」會吃回來${L1.re?"、你再吃回去":""}：子力差不多，只是換完的局面不如${bcn?`「${bcn}」`:"最好的走法"}。`:`你的「${X}」吃掉對方的「${Z}」，但對方的「${Y}」${L1.re?"吃掉它，你再吃回來也虧":"吃得到它，你又換不回來"}：拿「${X}」換「${Z}」，虧了。`,tag:null}}
      if(L1.t===m.t)return{say:L1.re?`你走過去的「${X}」，對方的「${Y}」吃得到；你雖然能吃回它，但「${X}」比「${Y}」值錢，換了還是虧。`:`你走過去的「${X}」，對方的「${Y}」吃得到，而且你換不回來，等於白送。`,tag:null};
      return{say:L1.re?`這步走完，你的「${X}」保護不夠：對方的「${Y}」吃掉它，你吃回來也虧。`:`這步走完，你的「${X}」沒人保護了，對方的「${Y}」可以吃掉它。`,tag:null}}}
    if(okB){const cap=b0[bm.t],ab=C.make(b0,bm.f,bm.t),chk=C.inCheck(ab,os),
        fork=C.legal(ab,side).filter(([f,t])=>f===bm.t&&ab[t]&&C.sideOf(ab[t])===os&&!/[kK]/.test(ab[t])&&V(ab[t])>=4).map(([,t])=>ab[t]);   /* 捉的是車馬炮（將帥另外看 chk） */
      /* 評比循環第 1 輪（AI 模擬玩家第二輪：「傌二進三」被標失著，是錯過了白吃中卒）：建議著吃的是兵卒、這步又少了 1.5 兵以上，也講出來；對方吃不回來就說「白吃」 */
      const free=cap&&!C.legal(ab,os).some(x=>x[1]===bm.t);   /* 評比循環第 2 輪：穩著（loss ≤ 60，泡泡說「只比最好的走法差一點點」）不講錯過吃子，免得兩句打架 */
      if(cap&&C.sideOf(cap)===os&&loss>60&&((V(cap)>=2&&V(cap)>V(b0[m.t])+1)||(V(cap)>V(b0[m.t])&&loss>=150)))return{say:`Pikafish 建議的「${bcn}」可以${free?"白吃":"吃掉"}對方的「${N(cap)}」${free?"（對方吃不回來）":""}，這步錯過了。`,tag:chk?"將軍":null};
      if(fork.length>=2||(chk&&fork.length>=1))return{say:`Pikafish 建議的「${bcn}」一步同時威脅對方的${chk?"將（將軍）和":""}「${N(fork[0])}」${fork[1]?`和「${N(fork[1])}」`:""}，對方只能顧一邊（捉雙）。`,tag:"捉雙"};
      if(chk)return{say:`Pikafish 建議的「${bcn}」是將軍，先逼對方應將，你就能掌握主動。`,tag:"將軍"}}
    const lk=evLink(g.ev,side);   /* gen：這句只是「少幾個兵＋走完誰好」，關鍵一步那頁已經有同一句，不再重複（10-db mkNote） */
    return{say:SAY(`這步比 Pikafish 建議的「${bcn}」${lossAbout(loss)}`)+(bcn&&lk?`；${lk}`:"")+(bcn?"。":""),tag:null,gen:1}}catch(e){return{say:"",tag:null}}}
/* G01 示範練習：記下從哪一頁來（回去用），換到 #/theme/<棋理>/try（07-legend.js Theme 認得 /try＝示範模式：先看棋理和古譜例子、親手走一步、看回饋、再換一題） */
function mflDemo(tag,back){const T=typeof THEMES!=="undefined"&&THEMES.some(x=>x[0]===tag)?tag:(typeof weakTheme==="function"?weakTheme():"將軍");
  store.set("mflDemo",{tag:T,back:back||location.hash||"#/",at:Date.now()});vibrate(5);location.hash="#/theme/"+encodeURIComponent(T)+"/try"}
function mflDemoBack(){const d=store.get("mflDemo",null);return d&&d.back&&!/^#\/theme\//.test(d.back)?d.back:"#/"}
/* 主流程的「再下一盤快局」：桌上或收著還有一盤沒下完的挑戰電腦，就接那盤（不開新局蓋掉它，積分局也不會被算輸）；沒有才開一盤不算段位的新局，用 lx 那一級。
   跟首頁大按鈕一樣記 sessionStorage xqFromHome（07y hbFromHome：橋上快局、不放晉級賽分頁、返回回首頁） */
async function mflQuick(human,lx){let st=null;try{st=await api("/play/state")}catch(e){}
  const cur=!!(st&&st.kind==="cpu"&&!st.result&&(st.moves||[]).length),oc=!cur&&st&&(st.others||[]).some(z=>z&&z.kind==="cpu"&&z.n);
  try{if(oc)await api("/play/switch",{kind:"cpu"});else if(!cur)await api("/play/new",{human:human==="b"?"b":"r",lx:Math.max(1,Math.min(18,+lx||3)),ranked:false})}catch(e){toast(e.message);return}
  if(cur||oc)toast("♟ 你還有一盤沒下完，先接著下");try{sessionStorage.setItem("xqFromHome","1")}catch(e){}if(location.hash==="#/cpu")route();else location.hash="#/cpu"}
/* 開發者 11/11 選「離線提示」（規劃書 A01）：手機確定沒有網路時，頂部列掛一顆「📴 離線」小牌（每一頁都看得到，不蓋住畫面），點了說明哪些照常能用、哪些要等網路；
   線上大廳直接寫「目前沒有網路」而不是一直「連線中…」；網路回來自動收掉。只認 navigator.onLine===false——它說「有網路」不一定真的通，那種情況大廳照舊顯示連線中 */
function offNow(){try{return navigator.onLine===false}catch(e){return false}}
function offInfo(){modal(`<div class="em">📴</div><h2>目前沒有網路</h2><p style="text-align:left"><b>照常可以用：</b>跟電腦下棋、殘局和各種題目、石桌往事、複盤，還有下載過的棋譜庫。</p><p style="text-align:left"><b>要等有網路：</b>線上對戰・觀戰、千秋盃、意見回饋、換手機、檢查新版，以及還沒下載過的棋譜和圖片。</p><p class="muted" style="font-size:13px">網路回來後，這個牌子會自己消失。</p>`,[["知道了",null]])}
function offChip(){try{let c=document.getElementById("offChip");if(!offNow()){if(c)c.remove();return}if(c)return;const tr=document.getElementById("topRight");if(!tr)return;
  c=document.createElement("button");c.id="offChip";c.type="button";c.setAttribute("aria-label","目前沒有網路，點一下看哪些功能可以用");c.textContent="📴 離線";
  c.style.cssText="flex:none;border:1.5px solid currentColor;border-radius:999px;background:rgba(0,0,0,.18);color:inherit;font:800 12px/1 inherit;padding:6px 9px;margin-right:2px;white-space:nowrap;cursor:pointer";
  c.onclick=()=>{try{vibrate(5)}catch(e){}offInfo()};tr.before(c)}catch(e){}}
function offRefresh(){try{if(location.hash.startsWith("#/lobby")&&!document.querySelector(".modal,#sheet"))route()}catch(e){}}
addEventListener("offline",()=>{offChip();try{toast("📴 沒有網路了：跟電腦下棋、做題照常，線上對戰要等網路回來")}catch(e){}offRefresh()});
addEventListener("online",()=>{const had=!!document.getElementById("offChip");offChip();if(had)try{toast("✅ 網路回來了")}catch(e){}offRefresh()});
setTimeout(offChip,1200);
