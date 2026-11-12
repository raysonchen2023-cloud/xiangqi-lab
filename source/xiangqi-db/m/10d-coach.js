/* ================= 🧑‍🏫 教練功能（評比循環第 3 輪「專業象棋教練」P17）=================
   ① 棋譜匯出（P17.2）：檢討頁（10-db.js Viewer 右上 📤）、對局紀錄（04-stats.js histList 最下面「📤 匯出這些對局」）→ pgnSheet。
      PGN＝象棋 PGN（[Game "Chinese Chess"]、[Format "ICCS"]，著法寫成 H2-E2；起始局面不是標準開局才寫 [FEN]），可選把評等和 Pikafish 評語寫成 {註解}；
      純文字＝中文記譜（炮二平五　馬8進7…），每回合一行，附評等。先分享（navigator.share）→ 複製到剪貼簿 → 下載 .pgn／.txt。
      內容只有棋手的顯示名稱，不含玩家 ID、裝置代號；自己的對局不帶對局中的留言（comments），古譜、大師對局才帶書上的批註。
      XQF 是二進位格式（每步要照它的加密規則編碼），目前不做；PGN 是業界通用交換格式，象棋巫師等軟體都讀得到。
   ② 作業（P17 教練用作業最小版）：#/hw＝教練出作業（挑一盞茶殘局、主題訓練題）；#/hw/<編碼>＝學生做作業的清單和成績；
      編碼＝「1」＋base64url（標題|c:殘局題號,q:主題題號…），全部在網址裡，不需要伺服器，也不收集任何資料。
      殘局題借用 07c-canju.js 的解題畫面（#/canju/hw/<編碼>/<第幾題>，設定由 hwXM 給）；主題訓練題用這裡的單步解題畫面（#/hw/<編碼>/<第幾題>）。
      成績只存在這支手機（store "hwRec"＝{編碼:{at,it:{第幾題:{t0,miss 走錯幾次,end,ms,ans 看了答案}}}}，最多留 20 份），學生按「📋 複製成績」自己傳給教練。
   測試：xiangqi-lab/tools/test-coach.js。文件：xiangqi-db/story/93_教練功能.md。 */

/* ---------- ① 棋譜匯出 ---------- */
const PGN_OK=["正著","妙著"];
function pgnRes(r){const s=String(r||"");if(/^(1-0|0-1|1\/2-1\/2|\*)$/.test(s))return s;if(/中止|取消|進行中/.test(s))return"*";
  if(/^[紅红]/.test(s)&&/[勝胜]/.test(s))return"1-0";if(/^黑/.test(s)&&/[勝胜]/.test(s))return"0-1";if(/和/.test(s))return"1/2-1/2";return"*"}
const pgnQ=s=>String(s==null?"":s).replace(/[\r\n]+/g," ").replace(/\\/g,"\\\\").replace(/"/g,'\\"');
const pgnCm=s=>String(s==null?"":s).replace(/[\r\n]+/g," ").replace(/\{/g,"（").replace(/\}/g,"）").trim();
function pgnDate(d){const s=String(d||""),m=/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})/.exec(s);if(m)return m[1]+"."+m[2].padStart(2,"0")+"."+m[3].padStart(2,"0");
  const y=/^(\d{4})/.exec(s);return y?y[1]+".??.??":"????.??.??"}
/* 棋手名稱：「你」換成自己的暱稱；電腦對手照畫面上的叫法（oppTw）；名字裡夾帶的 ID、裝置代號（#abc123、（ID：…））拿掉 */
function pgnName(n){let s=String(n==null?"":n).trim();if(!s)return"";if(s==="你")s=(typeof myName==="function"&&myName())||"我";
  if(typeof oppTw==="function")try{s=oppTw(s)}catch(e){}
  return s.replace(/[（(]\s*(ID|Id|id|裝置|device)[^）)]*[）)]/g,"").replace(/[#＃@][0-9A-Za-z_-]{3,}/g,"").trim()}
function pgnStd(g){const C=window.XQCore;return(g.side||"r")==="r"&&C.fen(g.board,"r").split(" ")[0]===C.START}
/* 一步的註解：評等、不好的棋附 Pikafish 建議、少了幾個兵、走完後的局面、書上的批註 */
function pgnNote(m){const a=[],q=m&&m.q&&m.q!=="—"?m.q:"";if(q)a.push(q);
  if(q&&!PGN_OK.includes(q)){if(m.bc)a.push("Pikafish 建議 "+m.bc);const L=+m.loss;if(isFinite(L)&&L>=30&&L<2000)a.push("差約 "+(L/100).toFixed(1)+" 兵")}
  if(m&&m.ev!=null&&typeof evt==="function")try{const e=evt(m.ev);if(e)a.push("走完後"+e)}catch(e){}
  if(m&&m.note)a.push(m.note);return pgnCm(a.join("；"))}
function pgnBuild(g,o){o=o||{};const C=window.XQCore,side=g.side||"r",H=[["Game","Chinese Chess"],["Event",g.event||g.title||"象棋千秋對局"],["Site","象棋千秋"],["Date",pgnDate(g.date)],["Round","-"],["Red",pgnName(g.red)||"紅方"],["Black",pgnName(g.black)||"黑方"],["Result",pgnRes(g.result)]];
  const ec=/^([A-E]\d\d)\s*(.*)$/.exec(String(g.open||""));if(ec){H.push(["ECCO",ec[1]]);if(ec[2])H.push(["Opening",ec[2]])}else if(g.open)H.push(["Opening",g.open]);
  if(!pgnStd(g))H.push(["FEN",C.fen(g.board,side)+" - - 0 1"]);H.push(["Format","ICCS"]);if(o.cm)H.push(["Annotator","象棋千秋賽後評等（Pikafish）"]);
  const tk=[];if(o.cm&&g.note0)tk.push("{"+pgnCm(g.note0)+"}");pgnMvTk(tk,g.moves||[],side,1,o);
  tk.push(pgnRes(g.result));const L=[];let cur="";for(const t of pgnParen(tk)){if(cur&&(cur+" "+t).length>80){L.push(cur);cur=t}else cur=cur?cur+" "+t:t}if(cur)L.push(cur);
  return H.map(([k,v])=>"["+k+' "'+pgnQ(v)+'"]').join("\n")+"\n\n"+L.join("\n")+"\n"}
/* 第 11 輪 X1：著法記號（含變著）。ms 每一步可以有 alts＝[[變著一的著法…],[變著二…]]（取代這一步的其他走法，裡面還可以再有 alts）；
   照 PGN 標準寫在這一步後面「( … )」，變著從同一個回合數開始（黑方那步寫「3...」），變著後面輪到黑方也補「3...」。o.vars＝false 不寫變著 */
function pgnMvTk(tk,ms,s,n,o){const C=window.XQCore;let cmt=false;
  ms.forEach((m,i)=>{if(s==="r")tk.push(n+".");else if(i===0||cmt)tk.push(n+"...");tk.push(C.iccs(m.f,m.t).toUpperCase().replace(/^(..)/,"$1-"));
    const c=o.cm?pgnNote(m):"";cmt=!!c;if(c)tk.push("{"+c+"}");
    if(o.vars!==false&&m.alts&&m.alts.length)for(const a of m.alts)if(a&&a.length){tk.push("(");pgnMvTk(tk,a,s,n,o);tk.push(")");cmt=true}
    if(s==="b")n++;s=C.opp(s)})}
/* 「(」黏到下一個記號前面、「)」黏到上一個記號後面：(1. C3-C4 H9-G7) */
function pgnParen(tk){const o=[];let op="";for(const t of tk){if(t==="("){op+="(";continue}if(t===")"&&o.length){o[o.length-1]+=")";continue}o.push(op+t);op=""}return o}
/* 有沒有變著 */
function pgnHasAlt(ms){return(ms||[]).some(m=>m&&m.alts&&m.alts.some(a=>a&&a.length))}
/* 變著列成中文記譜，一段一行：「變著 1（第 3 步起，紅方改走）：2. 傌八進七　卒7進1」；變著裡的變著標「1-1」，排在上一層後面。
   ply0＝ms 第一步是全盤第幾步（1 起算），off＝黑先時 1（全盤第一步是黑方）。tag＝每一步後面的評等（pgnTxt 給） */
function pgnTxtVars(ms,ply0,off,lab,tag,out){out=out||[];tag=tag||(()=>"");const RB={r:"紅方",b:"黑方"};
  const at=p=>{const h=p-1+off;return{n:Math.floor(h/2)+1,s:h%2?"b":"r"}};
  let k=0;(ms||[]).forEach((m,i)=>{if(!m||!m.alts)return;for(const a of m.alts){if(!a||!a.length)continue;k++;const p=ply0+i,L=(lab?lab+"-":"")+k,A=at(p);
    out.push("變著 "+L+"（第 "+p+" 步起，"+RB[A.s]+"改走）："+a.map((x,j)=>{const B=at(p+j);return(B.s==="r"?B.n+". ":j===0?B.n+". ……　":"")+x.cn+tag(x)}).join("　"));
    pgnTxtVars(a,p,off,L,tag,out)}});return out}
/* 純文字中文記譜：每回合一行，附評等（不好的棋附 Pikafish 建議） */
function pgnTxt(g,o){o=o||{};const C=window.XQCore,side=g.side||"r",R=pgnRes(g.result),ms=g.moves||[];
  const tag=m=>{if(!o.cm||!m.q||m.q==="—")return"";return"【"+m.q+(!PGN_OK.includes(m.q)&&m.bc?"・建議 "+m.bc:"")+"】"};
  const L=["【"+(g.title||"棋譜")+"】","紅方："+(pgnName(g.red)||"紅方")+"　黑方："+(pgnName(g.black)||"黑方")];
  if(g.event)L.push("賽事："+g.event);if(g.date)L.push("日期："+pgnDate(g.date).replace(/\.\?\?/g,""));if(g.open)L.push("開局："+String(g.open).replace(/^[A-E]\d\d\s*/,""));
  if(!pgnStd(g))L.push("起始局面（FEN）："+C.fen(g.board,side).split(" ")[0]+"（"+(side==="r"?"紅先":"黑先")+"）");
  if(o.cm&&g.note0)L.push("說明："+pgnCm(g.note0));L.push("");
  let i=0,n=1;if(side==="b"&&ms.length){L.push(n+". ……　"+ms[0].cn+tag(ms[0]));i=1;n=2}
  for(;i<ms.length;i+=2,n++){const a=ms[i],b=ms[i+1];L.push(n+". "+a.cn+tag(a)+(b?"　"+b.cn+tag(b):""))}
  if(o.vars!==false&&pgnHasAlt(ms))L.push("","【變著】",...pgnTxtVars(ms,1,side==="b"?1:0,"",tag));   /* 第 11 輪 X1：變著一段一行（匯入 pgnIParse 認得這一塊） */
  L.push("","結果："+(g.result?String(g.result):"未完")+"（"+R+"）","（象棋千秋匯出）");return L.join("\n")+"\n"}
/* 檢討頁、對局紀錄的對局（/db/item 的格式：board、lines、comments…）→ 匯出用的資料；notes:false＝不帶 comments（自己的對局可能是對局中的留言） */
function pgnFromItem(it,o){o=o||{};if(!it||!it.board)return null;const C=window.XQCore,l=(it.lines||[]).find(x=>x.parent==null)||(it.lines||[])[0];if(!l)return null;
  const ms=l.moves||[],cm=it.comments||{},keep=o.notes!==false,side=ms[0]&&it.board[ms[0].f]?C.sideOf(it.board[ms[0].f]):(it.startTurn||"r");
  const date=it.date||(String(it.id||"").match(/^\d{4}-\d\d-\d\d/)||[""])[0]||(it.year?String(it.year):"");
  return{title:it.red||it.black?(pgnName(it.red)||"？")+" 對 "+(pgnName(it.black)||"？"):String(it.title||it.name||""),event:it.event||o.book||"",date,red:it.red,black:it.black,result:it.result,open:it.open,board:it.board,side,
    note0:keep?cm["0_0"]||it.note||"":"",moves:pgnAltsOf(ms.map((m,i)=>({f:m.f,t:m.t,cn:m.cn,q:m.q,loss:m.loss,bc:m.bc,ev:m.ev,note:keep?cm["0_"+(i+1)]||"":""})),it,l.id,{notes:keep})}}
/* 第 11 輪 X1：棋譜裡的分支（/db/item 的 lines：{id, parent, start＝這條第一步是全盤第幾步, moves}，書上的變著、存檔時分出來的支線）接成變著樹，掛在主線 ms 每一步的 alts。
   ms＝主線（lid 那一條從第 1 步到最後，已經整理好評等）；同一步、同一個走法只留一份；主線那一步排第一，其他照 lines 的順序。
   o.notes＝帶書上的批註（comments「線號_第幾步」；自己的對局不帶）；o.free＝檢討頁正在看的「自由走棋／Pikafish 推演」{base 從主線第幾步之後分出去, moves, src 說明}，當成一段變著（評等在 m.g）。
   回傳 ms（每一步多了 alts）；壞資料（不合法、格子不對）那一條就停在那裡 */
function pgnAltsOf(ms,it,lid,o){o=o||{};const C=window.XQCore,Ls=(it&&it.lines)||[],L=new Map(Ls.map(x=>[x.id,x])),cm=(it&&it.comments)||{};
  if(!it||!it.board||!L.has(lid))return ms;
  const seq=(id,p,d)=>{const l=L.get(id);if(!l||d>64)return[];if(p<l.start)return l.parent==null?[]:seq(l.parent,p,d+1);return(l.parent==null?[]:seq(l.parent,l.start-1,d+1)).concat((l.moves||[]).slice(0,p-l.start+1))};
  const owner=(id,p,d)=>{const l=L.get(id);return l&&l.parent!=null&&p<l.start&&d<64?owner(l.parent,p,d+1):id};
  const endP=id=>{const l=L.get(id);return l.start+(l.moves||[]).length-1};
  const root={kids:[]};let n=0;
  const add=(path,src,first)=>{let nd=root,b=it.board.slice();for(let i=0;i<path.length&&n<3000;i++){const m=path[i],f=+m.f,t=+m.t;
      if(!(f>=0&&f<90&&t>=0&&t<90)||!b[f])return;let s;try{s=C.sideOf(b[f]);if(!C.legal(b,s).some(([x,y])=>x===f&&y===t))return}catch(e){return}
      let k=nd.kids.find(x=>x.m.f===f&&x.m.t===t);
      if(!k){const g=m.g||{},nt=src!=null?(o.notes?cm[owner(src,i+1,0)+"_"+(i+1)]||"":""):(i===first&&o.free.src?o.free.src:"");
        k={m:{f,t,cn:m.cn||C.notate(b,f,t),q:m.q||g.q,loss:m.loss,bc:m.bc,ev:m.ev!=null?m.ev:g.ev,note:nt},kids:[]};nd.kids.push(k);n++}
      nd=k;b=C.make(b,f,t)}};
  add(seq(lid,endP(lid),0),lid,-1);for(const l of Ls)if(l.id!==lid)add(seq(l.id,endP(l.id),0),l.id,-1);
  if(o.free&&o.free.moves&&o.free.moves.length&&o.free.base>=0&&o.free.base<ms.length)add(seq(lid,o.free.base,0).concat(o.free.moves),null,o.free.base);
  const chain=k=>{const out=[];let cur=k,alts=[];for(;;){const m=Object.assign({},cur.m);if(alts.length)m.alts=alts.map(chain);out.push(m);if(!cur.kids.length)break;alts=cur.kids.slice(1);cur=cur.kids[0]}return out};
  let nd=root;for(let i=0;i<ms.length&&nd;i++){const m=ms[i],k=nd.kids.find(x=>x.m.f===m.f&&x.m.t===m.t),A=nd.kids.filter(x=>x!==k);
    if(A.length)m.alts=A.map(chain);nd=k}
  return ms}
const pgnFile=s=>String(s||"棋譜").replace(/[\\/:*?"<>|\s]+/g,"_").replace(/^_+|_+$/g,"").slice(0,60)||"棋譜";
/* 送出：mode＝auto（分享→複製→下載）、share、copy、file */
async function pgnOut(text,name,ext,mode){const fn=pgnFile(name)+"."+ext,mime=ext==="pgn"?"application/x-chess-pgn":ext==="csv"?"text/csv":"text/plain";mode=mode||"auto";
  if((mode==="auto"||mode==="share")&&navigator.share){try{let d={title:fn,text};try{const f=new File([text],fn,{type:"text/plain"});if(navigator.canShare&&navigator.canShare({files:[f]}))d={title:fn,files:[f]}}catch(e){}await navigator.share(d);return"share"}catch(e){if(e&&e.name==="AbortError")return"abort"}}
  if(mode==="auto"||mode==="copy"){try{await navigator.clipboard.writeText(text);toast("📋 已複製到剪貼簿，可以直接貼上");return"copy"}catch(e){if(mode==="copy"){try{prompt("複製這段棋譜",text)}catch(x){}return"prompt"}}}
  try{const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type:mime+";charset=utf-8"}));a.download=fn;document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},2000);toast("⬇ 已下載 "+fn);return"file"}catch(e){toast("⚠ 下載失敗："+e.message);return"fail"}}
function pgnSheet(G,o){o=o||{};G=(G||[]).filter(g=>g&&g.moves&&g.moves.length);if(!G.length)return toast("這盤還沒有著法可以匯出");
  let fmt=store.get("pgnFmt","pgn")==="txt"?"txt":"pgn",cm=store.get("pgnCm",true)!==false,vars=store.get("pgnVar",true)!==false;const name=o.name||(G.length>1?"象棋千秋_"+G.length+"盤":G[0].title||"棋譜");
  const hasV=G.some(g=>pgnHasAlt(g.moves));   /* 第 11 輪 X1：有變著才出現「附上變著」勾選（store pgnVar，預設附上） */
  sheet("📤 匯出棋譜",b=>{const txt=()=>G.map(g=>fmt==="pgn"?pgnBuild(g,{cm,vars}):pgnTxt(g,{cm,vars})).join("\n");
    const paint=()=>{const t=txt(),ext=fmt==="pgn"?"pgn":"txt";
      b.innerHTML=`<p class="muted" style="margin:0 0 6px">${G.length>1?`共 ${G.length} 盤・`:""}${fmt==="pgn"?"PGN 是象棋軟體通用的棋譜格式（記法 ICCS），象棋巫師等軟體都能打開。":"中文記譜，每回合一行，可以直接貼給教練或棋友。"}</p>
        <div class="opt" style="margin:4px 0 8px"><button data-f="pgn" class="${fmt==="pgn"?"on":""}">PGN（通用格式）</button><button data-f="txt" class="${fmt==="txt"?"on":""}">中文記譜（純文字）</button></div>
        <label style="display:flex;gap:8px;align-items:center;margin:0 0 8px;font-size:14px"><input type="checkbox" id="pxC" ${cm?"checked":""}> 附上評等與 Pikafish 評語</label>${hasV?`<label style="display:flex;gap:8px;align-items:center;margin:0 0 8px;font-size:14px"><input type="checkbox" id="pxV" ${vars?"checked":""}> 附上變著（分支）</label>`:""}
        <textarea readonly id="pxT" aria-label="匯出的棋譜內容" style="width:100%;box-sizing:border-box;height:150px;font:12px/1.5 ui-monospace,monospace;border:1px solid var(--line);border-radius:10px;padding:8px;background:var(--bg);color:inherit"></textarea>
        <div class="opt" style="margin:8px 0 6px">${navigator.share?'<button data-o="share" class="on">📤 分享</button>':""}<button data-o="copy"${navigator.share?"":' class="on"'}>📋 複製</button><button data-o="file">⬇ 下載 .${ext}</button></div>
        <p class="muted" style="font-size:12px;line-height:1.6;margin:4px 0 0">匯出內容只有棋手名稱，不含玩家 ID、裝置代號。${hasV&&!vars?"沒有附上變著，只有目前看的這一條主線。":hasV?(fmt==="pgn"?"主線是目前看的這一條，其他分支用 ( ) 寫成變著（PGN 標準寫法）。":"主線是目前看的這一條，其他分支列在「【變著】」一段一行。"):G.length===1?"這盤只有一條著法（沒有變著）。":""}XQF 是二進位格式，目前不提供；需要的話可以用象棋軟體打開 PGN 再另存。</p>`;
      b.querySelector("#pxT").value=t;
      b.querySelectorAll("[data-f]").forEach(x=>x.onclick=()=>{fmt=x.dataset.f;store.set("pgnFmt",fmt);paint()});
      b.querySelector("#pxC").onchange=e=>{cm=!!e.target.checked;store.set("pgnCm",cm);paint()};
      {const xv=b.querySelector("#pxV");if(xv)xv.onchange=e=>{vars=!!e.target.checked;store.set("pgnVar",vars);paint()}}
      b.querySelectorAll("[data-o]").forEach(x=>x.onclick=()=>{if(typeof vibrate==="function")vibrate(5);pgnOut(t,name,ext,x.dataset.o)})};paint()})}
/* 對局紀錄（04-stats.js histList）：把目前篩出來的對局（最多 100 盤）一起匯出 */
async function pgnExportList(L){L=(L||[]).slice(0,100);if(!L.length)return toast("沒有可以匯出的對局");toast("整理 "+L.length+" 盤棋譜…");const G=[];
  for(const x of L){try{const it=await api("/db/item?c="+encodeURIComponent(x.c)+"&id="+encodeURIComponent(x.id)),g=pgnFromItem(it,{notes:false});if(g&&g.moves.length)G.push(g)}catch(e){}}
  if(!G.length)return toast("讀不到棋譜");const d=new Date(),p=n=>String(n).padStart(2,"0");pgnSheet(G,{name:"象棋千秋_對局"+G.length+"盤_"+d.getFullYear()+p(d.getMonth()+1)+p(d.getDate())})}

/* ---------- ② 教練作業 ---------- */
const HW_MAX=20;
function hwB64(s){const u=new TextEncoder().encode(s);let bin="";for(const c of u)bin+=String.fromCharCode(c);return btoa(bin).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}
function hwEnc(o){const T=String((o&&o.title)||"").replace(/[|\r\n]/g," ").trim().slice(0,40),L=((o&&o.items)||[]).slice(0,HW_MAX).filter(x=>x&&/^[cq]$/.test(x.k)&&/^[A-Za-z0-9_.-]{1,24}$/.test(String(x.id)));
  return"1"+hwB64(T+"|"+L.map(x=>x.k+":"+x.id).join(","))}
function hwDec(code){try{code=String(code||"").trim();if(code[0]!=="1")return null;let s=code.slice(1).replace(/-/g,"+").replace(/_/g,"/");if(/[^A-Za-z0-9+/]/.test(s))return null;while(s.length%4)s+="=";
    const bin=atob(s),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);const t=new TextDecoder("utf-8",{fatal:true}).decode(u),k=t.indexOf("|");if(k<0)return null;
    const items=t.slice(k+1).split(",").filter(Boolean).map(x=>{const m=/^([cq]):([A-Za-z0-9_.-]{1,24})$/.exec(x);return m?{k:m[1],id:m[2]}:null});
    if(!items.length||items.length>30||items.some(x=>!x))return null;return{title:t.slice(0,k),items}}catch(e){return null}}
const hwHref=(code,H,i)=>H.items[i]&&H.items[i].k==="c"?"#/canju/hw/"+code+"/"+i:"#/hw/"+code+"/"+i;
function hwAll(){const A=store.get("hwRec",null);return A&&typeof A==="object"?A:{}}
function hwRec(code){return hwAll()[code]||{it:{}}}
function hwPut(code,f){const A=hwAll(),R=A[code]||{it:{}};R.it=R.it||{};f(R);R.at=Date.now();A[code]=R;
  for(const k of Object.keys(A).sort((a,b)=>(A[b].at||0)-(A[a].at||0)).slice(20))delete A[k];store.set("hwRec",A);return R}
const hwX=(R,i)=>R.it[i]||(R.it[i]={miss:0,t0:Date.now()});
function hwStart(code,i){hwPut(code,R=>{const x=hwX(R,i);if(!x.t0)x.t0=Date.now()})}
function hwMiss(code,i){hwPut(code,R=>{const x=hwX(R,i);if(!x.end)x.miss=(x.miss|0)+1})}
function hwDone(code,i,o){hwPut(code,R=>{const x=hwX(R,i);if(x.end)return;x.end=Date.now();x.ans=o&&o.ans?1:0;x.ms=Math.max(0,x.end-(x.t0||x.end))})}
function hwNextIdx(code,H,from){const R=hwRec(code),N=H.items.length,f=i=>!(R.it[i]&&R.it[i].end);for(let i=from+1;i<N;i++)if(f(i))return i;for(let i=0;i<N;i++)if(i!==from&&f(i))return i;return-1}
function hwTime(ms){const s=Math.round((+ms||0)/1000);if(s>=3600)return"超過 1 小時";return Math.floor(s/60)+":"+String(s%60).padStart(2,"0")}
function hwResTxt(x){if(!x||!x.end)return"還沒做";if(x.ans)return"看了答案"+(x.miss?"（之前試了 "+x.miss+" 次）":"");return"第 "+((x.miss|0)+1)+" 次答對・"+hwTime(x.ms)}
/* 傳給教練的純文字成績（labels＝每題的名稱；name＝學生自己填的名字，選填） */
function hwReport(code,H,labels,name){const R=hwRec(code),N=H.items.length,X=H.items.map((_,i)=>R.it[i]),done=X.filter(x=>x&&x.end).length,first=X.filter(x=>x&&x.end&&!x.ans&&!(x.miss|0)).length,ans=X.filter(x=>x&&x.end&&x.ans).length,tot=X.reduce((a,x)=>a+(x&&x.end?+x.ms||0:0),0);
  const L=["🧑‍🏫 作業成績："+(H.title||"象棋作業")+(name?"（"+String(name).trim().slice(0,20)+"）":""),"完成 "+done+"／"+N+" 題・第一次就答對 "+first+" 題"+(ans?"・看答案 "+ans+" 題":"")+"・總用時 "+hwTime(tot)];
  H.items.forEach((it,i)=>L.push((i+1)+". "+((labels&&labels[i])||(it.k==="c"?"殘局 ":"主題題 ")+it.id)+"："+hwResTxt(X[i])));
  L.push("（象棋千秋・作業代碼 "+code.slice(0,12)+(code.length>12?"…":"")+"）","教練在 App「🧑‍🏫 教練作業 → 收成績」貼上整段就能彙整（下面這行有校驗碼，請不要改）：",hwSign(code,H,name));return L.join("\n")}
/* 每題的名稱（殘局：題型〈出處〉；主題訓練：題名＋主題） */
async function hwLabels(H){const out=H.items.map(x=>(x.k==="c"?"殘局 ":"主題題 ")+x.id);let CD=null,QD=null;
  if(H.items.some(x=>x.k==="c"))CD=await cjData().catch(()=>null);if(H.items.some(x=>x.k==="q"))QD=await api("/quiz/data").catch(()=>null);
  H.items.forEach((x,i)=>{if(x.k==="c"&&CD&&CD.byId[x.id]){const P=CD.byId[x.id];out[i]="殘局・"+P.t+"〈"+((P.src||{}).title||x.id)+"〉"}
    else if(x.k==="q"&&QD){const q=QD.items.find(y=>String(y.id)===x.id);if(q)out[i]="主題・"+((q.tags||[]).slice(0,2).join("、")||"綜合")+"〈"+(q.title||x.id)+"〉"}});return out}
/* 07c-canju.js CanjuPlay 的設定：#/canju/hw/<編碼>/<第幾題>。不送匿名資料（noShare） */
function hwXM(id){const m=/^hw\/([^/]+)\/(\d+)$/.exec(String(id||""));if(!m)return null;const code=m[1],i=+m[2],H=hwDec(code),back="#/hw/"+code;
  if(!H||!H.items[i]||H.items[i].k!=="c")return{err:"作業連結不完整或找不到這一題（請教練重新產生連結）。",back:()=>back};
  const N=H.items.length,nx=()=>hwNextIdx(code,H,i);hwStart(code,i);
  return{id:H.items[i].id,rk:"cjRunHW",back:()=>back,top:"🧑‍🏫 作業",icon:"🧑‍🏫",noShare:true,ans:"看答案這題會記成「看了答案」，確定？",
    head:P=>`<b>🧑‍🏫 ${esc(H.title||"作業")}・第 ${i+1}／${N} 題</b>・${esc(P.t)}・${cjLv(P.d)}　<span class="muted">${esc((P.th||[]).filter(x=>x!=="殺棋"&&x!=="保勝").slice(0,3).join("、"))}</span>`,
    wrong:()=>{hwMiss(code,i);return""},mark:()=>{hwDone(code,i,{ans:0});return null},
    done:(xs,ans)=>{if(ans)hwDone(code,i,{ans:1});return`<p>🧑‍🏫 作業第 ${i+1}／${N} 題：<b>${esc(hwResTxt(hwRec(code).it[i]))}</b></p>`},
    next:()=>{const j=nx();return j>=0?hwHref(code,H,j):back},nextL:()=>{const j=nx();return j>=0?"作業下一題（第 "+(j+1)+" 題）":"看作業成績"}}}
function hwCss(){if(document.getElementById("hw-css"))return;const st=document.createElement("style");st.id="hw-css";st.textContent=`
.hw-wrap{padding:12px 12px 28px;display:flex;flex-direction:column;gap:10px}.hw-wrap .card{margin:0}
.hw-wrap textarea{width:100%;box-sizing:border-box;min-height:130px;font:13px/1.6 var(--sans);border:1px solid var(--line);border-radius:10px;padding:8px;background:var(--bg);color:inherit}
.hw-url{width:100%;box-sizing:border-box;font-size:12px;padding:8px;border:1px solid var(--line);border-radius:10px;background:var(--bg);color:inherit}
.hw-sel{margin:6px 0;padding-left:1.6em;line-height:1.7}.hw-sel button{margin-left:6px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--muted);padding:0 6px}
.hw-wrap .item.on{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 8%,var(--card))}
.hw-chip{display:flex;flex-wrap:wrap;gap:6px}.hw-chip button{font-size:13px;padding:5px 10px;border-radius:999px;border:1px solid var(--line);background:var(--card);color:inherit}.hw-chip button.on{background:var(--accent);color:#fff;border-color:var(--accent)}
.hw-wrap .hw-seg{margin:0}.hw-thc{display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px;font-size:14px}.hw-thc>span{flex:1 1 auto;min-width:0}
.hw-thx,.hw-chip .hw-thx{font-size:13px;min-height:34px;padding:5px 12px;border-radius:999px;border:1px dashed var(--line);background:var(--bg);color:inherit}
.hw-card .tx b,.hw-card .tx span{white-space:normal;overflow:visible;text-overflow:clip}.hw-card .tx .hw-tg{margin-top:1px;opacity:.85}
.hw-card .lb{font-size:20px;min-width:30px}.hw-wrap .hw-card.on .lb{color:var(--accent);font-weight:900}
.hw-bar{position:sticky;bottom:0;z-index:2;margin:0 -12px -28px;padding:10px 12px calc(12px + env(safe-area-inset-bottom,0px));background:linear-gradient(to bottom,transparent,var(--bg) 35%)}.hw-bar .btn{width:100%;background:var(--card)}
.hw-vh{position:absolute!important;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;padding:0}
body:has(.hw-pick) .xqbot{visibility:hidden!important}
`;document.head.append(st)}
/* 路由（02-shell.js）：#/hw → 出作業；#/hw/<編碼> → 作業清單與成績；#/hw/<編碼>/<第幾題> → 做那一題 */
function Homework(v,code,idx){hwCss();if(!code)return HwMake(v);if(code==="grade")return HwGrade(v);if(typeof setTabs==="function")setTabs(false);const H=hwDec(code);
  if(!H){setTop("🧑‍🏫 作業","#/");v.className="view";v.innerHTML='<div class="pad"><div class="card muted" style="line-height:1.8">這個作業連結不完整（可能複製時少了一段）。請教練重新傳一次連結。</div></div>';return{}}
  if(idx!=null&&idx!==""){const i=+idx,it=H.items[i];if(!it){navReplace("#/hw/"+code);return{}}if(it.k==="c"){navReplace("#/canju/hw/"+code+"/"+i);return{}}return HwQuiz(v,code,H,i)}
  setTop("🧑‍🏫 "+(H.title||"作業"),"#/");v.className="view";let labels=null;
  const paint=()=>{const R=hwRec(code),N=H.items.length,X=H.items.map((_,i)=>R.it[i]),done=X.filter(x=>x&&x.end).length,j=hwNextIdx(code,H,-1),nm=store.get("hwName","")||"";
    v.innerHTML=`<div class="hw-wrap"><div class="card"><div class="muted" style="font-size:13px">🧑‍🏫 教練派的作業</div><b style="font-family:var(--serif);font-size:19px">${esc(H.title||"象棋作業")}</b>
        <div class="muted">共 ${N} 題・已完成 ${done} 題・照順序做，做完會記下每題第幾次答對、用了多久</div>
        <button class="btn" id="hwGo" style="width:100%;margin-top:10px">${j<0?"✅ 全部做完了，看下面的成績":done?"▶ 繼續：第 "+(j+1)+" 題":"▶ 開始作業"}</button></div>
      <div class="items" style="padding:0">${H.items.map((it,i)=>`<button class="item" data-i="${i}"><span class="lb">${X[i]&&X[i].end?(X[i].ans?"👁":"✅"):i+1}</span><span class="tx"><b>${esc(labels?labels[i]:(it.k==="c"?"殘局 ":"主題題 ")+it.id)}</b><span>${esc(hwResTxt(X[i]))}</span></span><span class="muted">›</span></button>`).join("")}</div>
      <div class="card"><b>📋 傳成績給教練</b><div class="field" style="margin-top:6px"><label>名字</label><input id="hwNm" maxlength="20" placeholder="選填，只放進複製的文字"></div>
        <textarea readonly id="hwTx" aria-label="成績文字"></textarea><div class="opt" style="margin:8px 0 4px"><button class="on" id="hwCp">📋 複製成績</button>${navigator.share?'<button id="hwSh">📤 分享</button>':""}</div>
        <p class="muted" style="font-size:12px;line-height:1.6;margin:4px 0 0">成績只存在這支手機，App 不會上傳任何資料；複製後自己貼給教練就好。</p>${done?'<button class="cj-skip" id="hwRe" style="margin-top:6px">↺ 清掉這份作業的成績重做</button>':""}</div></div>`;
    const tx=v.querySelector("#hwTx"),ni=v.querySelector("#hwNm"),upd=()=>{tx.value=hwReport(code,H,labels,ni.value)};ni.value=nm;upd();
    ni.oninput=()=>{store.set("hwName",ni.value.slice(0,20));upd()};
    v.querySelector("#hwGo").onclick=()=>{if(j<0)return tx.scrollIntoView({block:"center"});if(typeof vibrate==="function")vibrate(5);location.hash=hwHref(code,H,j)};
    v.querySelectorAll("[data-i]").forEach(b=>b.onclick=()=>{if(typeof vibrate==="function")vibrate(5);location.hash=hwHref(code,H,+b.dataset.i)});
    v.querySelector("#hwCp").onclick=()=>pgnOut(tx.value,"作業成績","txt","copy");{const s=v.querySelector("#hwSh");if(s)s.onclick=()=>pgnOut(tx.value,"作業成績","txt","share")}
    {const r=v.querySelector("#hwRe");if(r)r.onclick=()=>confirmBox("清掉這份作業在這支手機上的成績，從頭再做？",()=>{const A=hwAll();delete A[code];store.set("hwRec",A);store.set("cjRunHW",null);paint()},"清掉重做")}};
  paint();hwLabels(H).then(L=>{labels=L;if(v.isConnected&&location.hash==="#/hw/"+code)paint()}).catch(()=>{});return{}}
/* 主題訓練題（quiz.json）：一步定答案；走錯可以一直再試（記走錯幾次），也可以看答案 */
function HwQuiz(v,code,H,i){const it=H.items[i],N=H.items.length,C=window.XQCore,back="#/hw/"+code;
  setTop("🧑‍🏫 作業・第 "+(i+1)+"／"+N+" 題",back);v.className="view fixed";
  v.innerHTML='<div class="status" id="qh" style="margin-top:6px"></div><div class="boardbox" id="bbox"></div><div class="status" id="stat"></div><div class="note" id="note" style="white-space:pre-wrap"></div><div style="flex:1"></div><div class="actions" id="acts"></div>';
  const g=s=>v.querySelector(s);let q=null,board=null,sel=-1,done=false,tm=null;const bd=Board(x=>tap(x));g("#bbox").append(bd.svg);
  api("/quiz/data").then(D=>{if(!v.isConnected)return;q=(D.items||[]).find(x=>String(x.id)===it.id);
    if(!q){g("#note").textContent="找不到這一題（題庫可能更新了），先跳過吧。";actionBar(g("#acts"),[["list","☰","作業清單",()=>{location.hash=back},true]]);return}
    board=q.board.split(",").map(x=>x||null);hwStart(code,i);const r=hwRec(code).it[i];
    g("#qh").innerHTML=`<b>${esc(H.title||"作業")}・第 ${i+1}／${N} 題</b>・🧠 ${esc((q.tags||[]).join("、")||"綜合")}　<span class="muted">${esc(q.rank||"")}</span>`;
    if(r&&r.end){done=true;fin(q.f,q.t,false)}else show()}).catch(e=>{g("#note").textContent="⚠ "+e.message});
  function draw(o){bd.draw(o&&o.board||board,{flip:q.side==="b",sel,targets:sel>=0?C.legal(board,q.side).filter(([f])=>f===sel).map(x=>x[1]):[],...(o||{})})}
  function show(){sel=-1;const r=hwRec(code).it[i]||{};g("#stat").textContent=`${PLAYER[q.side]}走，找出最好的一步`;g("#note").textContent=r.miss?`已經試了 ${r.miss} 次，再想想。`:"";
    actionBar(g("#acts"),[["list","☰","作業清單",()=>{location.hash=back}],["ans","👁","看答案",reveal]]);draw()}
  function tap(x){if(done||!q)return;const L=C.legal(board,q.side);if(sel>=0&&L.some(([f,t])=>f===sel&&t===x)){const f=sel;sel=-1;return judge(f,x)}
    sel=L.some(([f])=>f===x)?x:-1;if(sel>=0&&typeof vibrate==="function")vibrate(5);draw()}
  function judge(f,t){const nb=C.make(board,f,t),o=C.opp(q.side),same=f===q.f&&t===q.t,mate=C.inCheck(nb,o)&&!C.legal(nb,o).length;
    if(!same&&!mate){hwMiss(code,i);if(typeof vibrate==="function")vibrate([20,40,20]);const r=hwRec(code).it[i]||{};done=true;draw({board:nb,last:{f,t},sel:-1,targets:[]});
      g("#stat").textContent=`✘ ${C.notate(board,f,t)} 不是這步`;g("#note").textContent=`再想想（已經試了 ${r.miss} 次）。`;clearTimeout(tm);tm=setTimeout(()=>{if(v.isConnected&&q){done=false;show()}},1100);return}
    done=true;hwDone(code,i,{ans:0});if(typeof vibrate==="function")vibrate(15);fin(f,t,!same)}
  function reveal(){if(done)return;confirmBox("看答案這題會記成「看了答案」，確定？",()=>{done=true;hwDone(code,i,{ans:1});fin(q.f,q.t,false)},"看答案")}
  function fin(f,t,alt){const r=hwRec(code).it[i]||{},mine=C.notate(board,f,t);draw({board:C.make(board,f,t),last:{f,t},sel:-1,targets:[]});
    g("#stat").textContent=r.ans?"👁 答案在棋盤上":"✔ 答對了！"+hwResTxt(r);
    g("#note").textContent=(alt?`你走的「${mine}」直接將死，也算對！題目原本的答案是 ${q.cn}。\n`:"")+`正解：${q.cn}${q.mate?`，${q.mate} 步內殺棋`:""}\nPikafish 的後續：${(q.pv||[]).join(" ")}`;
    if(typeof pvStepper==="function")pvStepper(g("#note"),bd,board,q.pv||[],{draw:{flip:q.side==="b"},start:alt?0:1});   /* 開發者 11/12：後續可以一步一步看 */
    const j=hwNextIdx(code,H,i);actionBar(g("#acts"),[["list","☰","作業清單",()=>{location.hash=back}],["next","›",j>=0?"下一題（第 "+(j+1)+" 題）":"看作業成績",()=>{location.hash=j>=0?hwHref(code,H,j):back},true]])}
  return{stop(){clearTimeout(tm)}}}
/* ---------- 11/11 ChatGPT 介面報告 P1（story/99_ChatGPT介面報告處理.md）：選題卡、篩選收合、選取狀態、查看已選、出作業／收成績同層切換 ----------
   題卡：第 1 行篇名（殘局＝題庫 src.title，古譜加〈〉；大師對局、星槎石桌照原字；缺篇名用題目原有的名字），第 2 行「《書名》 · 題型 · 難度」，
   第 3 行是其他能區分的戰術標籤（已經篩選的主題、殺棋、保勝不重複寫）。主題訓練題：第 1 行題名，第 2 行「來源 · 段位」。
   整張卡是切換按鈕（aria-pressed），未選「＋」、已選「✓」＋底色；螢幕報讀念「篇名，已加入／未加入」；切換時 aria-live 播「已選 N／20 題」；重畫後焦點回到同一個控制項（data-fk）。
   密集選題時把小帥（.xqbot）收起來：CSS body:has(.hw-pick)＋06-cpu.js 的 botVis，離開這頁（stop）恢復。 */
const HW_SEG=[["make","出作業","#/hw"],["grade","收成績","#/hw/grade"]];
let HW_SEG_FOCUS=false;
function hwSegHTML(cur){return`<div class="lib-seg hw-seg" role="group" aria-label="教練工具">${HW_SEG.map(([k,l])=>`<button type="button" data-seg="${k}" class="${k===cur?"on":""}" aria-pressed="${k===cur}">${l}</button>`).join("")}</div>`}
function hwSegBind(v,cur){v.querySelectorAll("[data-seg]").forEach(b=>b.onclick=()=>{const S=HW_SEG.find(x=>x[0]===b.dataset.seg);if(!S||S[0]===cur)return;HW_SEG_FOCUS=true;if(typeof navReplace==="function")navReplace(S[2]);else location.hash=S[2]});
  if(HW_SEG_FOCUS){HW_SEG_FOCUS=false;const b=v.querySelector(`[data-seg="${cur}"]`);if(b)try{b.focus({preventScroll:true})}catch(e){}}}
/* 一題的卡片文字；x＝{k,id}，P＝題庫裡那一題（殘局 canju-set.json 的 item、主題題 quiz.json 的 item），th＝目前篩選的主題 */
function hwCardInfo(x,P,th){th=th||"";const keep=t=>t&&t!==th&&t!=="殺棋"&&t!=="保勝",T=s=>String(s==null?"":s).trim();
  if(x.k==="c"){if(!P)return{name:"殘局 "+x.id,sub:"",tags:[]};const s=P.src||{},ti=T(s.title),plain=s.book==="特級大師對局"||s.book==="星槎石桌";
    const name=ti?(plain?ti:"〈"+ti+"〉"):T(P.title)||T(P.name)||(P.t?P.t+" "+x.id:"殘局 "+x.id);
    const lv=P.d!=null&&typeof cjLv==="function"?cjLv(P.d):"";
    return{name,sub:[s.book?"《"+s.book+"》":"",s.book==="特級大師對局"&&s.year?T(s.year):"",T(P.t),lv].filter(Boolean).join(" · "),tags:(P.th||[]).filter(keep).slice(0,3)}}
  if(!P)return{name:"主題題 "+x.id,sub:"",tags:[]};
  return{name:T(P.title)||"主題題 "+x.id,sub:[T(P.src),T(P.rank)].filter(Boolean).join(" · "),tags:(P.tags||[]).filter(keep).slice(0,3)}}
/* 加入／取消一題：回傳新的清單，on＝現在是不是選著，full＝滿了加不進去 */
function hwToggle(items,k,id,max){const L=(items||[]).slice(),n=L.findIndex(x=>x.k===k&&x.id===id);max=max||HW_MAX;
  if(n>=0){L.splice(n,1);return{items:L,on:false,full:false}}if(L.length>=max)return{items:L,on:false,full:true};L.push({k,id});return{items:L,on:true,full:false}}
const hwLive=(n,max)=>"已選 "+n+"／"+(max||HW_MAX)+" 題";
/* 重畫後要把焦點放回哪個控制項：want 依序找第一個還在畫面上的（has(key)） */
function hwFkPick(want,has){for(const k of want||[])if(k!=null&&k!==""&&has(k))return k;return null}
/* 主題篩選列的狀態：open＝展開全部主題；沒選主題＝「全部」＋「選主題」；選了主題＝「雙車錯 · 26 題　更換」＋清除 */
function hwThView(th,open,n){if(open)return{mode:"open"};if(th)return{mode:"picked",text:th+" · "+n+" 題"};return{mode:"none"}}
/* 出作業：挑一盞茶殘局（可依主題篩選）或主題訓練題，最多 20 題；選好的存在 store "hwDraft"，換頁回來還在（排序也在） */
function HwMake(v){setTop("🧑‍🏫 教練作業","#/canju");if(typeof setTabs==="function")setTabs(false);v.className="view";v.innerHTML='<div class="pad muted">題庫載入中…</div>';
  const Dr=Object.assign({title:"",items:[],src:"c",th:"",lim:40},store.get("hwDraft",null)||{});Dr.lim=40;const save=()=>store.set("hwDraft",{title:Dr.title,items:Dr.items,src:Dr.src,th:Dr.th});
  if(typeof botVis==="function")botVis(false);let open=false;
  Promise.all([typeof cjData==="function"?cjData().catch(()=>null):null,api("/quiz/data").catch(()=>null)]).then(([CD,QD])=>{if(!v.isConnected)return;
    const QM=new Map(((QD&&QD.items)||[]).map(q=>[String(q.id),q])),find=x=>x.k==="c"?CD&&CD.byId[x.id]:QM.get(x.id);
    const lab=x=>{const I=hwCardInfo(x,find(x),"");return I.name+(I.sub?"（"+I.sub+"）":"")};
    const has=(k,id)=>Dr.items.some(x=>x.k===k&&x.id===id);
    const chips=()=>{if(Dr.src==="c"){const G=(CD&&CD.thGroups)||[],by=(CD&&CD.byTheme)||{};return G.map(([g,L])=>L.filter(t=>by[t]).map(t=>[t,by[t]])).flat()}
      const c={};for(const q of (QD&&QD.items)||[])for(const t of q.tags||[])c[t]=(c[t]||0)+1;return(typeof THEMES!=="undefined"?THEMES.map(x=>x[0]):Object.keys(c)).filter(t=>c[t]).map(t=>[t,c[t]])};
    const pool=()=>Dr.src==="c"?((CD&&CD.items)||[]).filter(P=>!Dr.th||(P.th||[]).includes(Dr.th)).slice().sort((a,b)=>a.d-b.d).map(P=>({k:"c",id:P.id,...hwCardInfo({k:"c",id:P.id},P,Dr.th)}))
      :((QD&&QD.items)||[]).filter(q=>!Dr.th||(q.tags||[]).includes(Dr.th)).slice().sort((a,b)=>(a.tier||0)-(b.tier||0)).map(q=>({k:"q",id:String(q.id),...hwCardInfo({k:"q",id:String(q.id)},q,Dr.th)}));
    v.innerHTML=`<div class="hw-wrap hw-pick">${hwSegHTML("make")}<div id="hwBody" style="display:contents"></div><div class="hw-vh" id="hwLive" aria-live="polite"></div></div>`;
    hwSegBind(v,"make");
    const body=v.querySelector("#hwBody"),live=v.querySelector("#hwLive"),say=t=>{live.textContent="";setTimeout(()=>{if(live.isConnected)live.textContent=t},60)};
    const fkEl=k=>{try{return body.querySelector(`[data-fk="${window.CSS&&CSS.escape?CSS.escape(k):k}"]`)}catch(e){return null}};
    const paint=want=>{const a=document.activeElement,cur=a&&body.contains(a)&&a.dataset?a.dataset.fk:"",y=v.scrollTop,P=pool(),C2=chips(),N=Dr.items.length,TV=hwThView(Dr.th,open,P.length);
      const chip=([t,n])=>`<button type="button" data-th="${esc(t)}" data-fk="th:${esc(t)}" class="${Dr.th===t?"on":""}" aria-pressed="${Dr.th===t}">${esc(t)} <small>${n}</small></button>`;
      const thRow=TV.mode==="open"?`<div class="hw-chip" id="hwThG" role="group" aria-label="選主題（Esc 收起）"><button type="button" data-th="" data-fk="th:" class="${Dr.th?"":"on"}" aria-pressed="${!Dr.th}">全部</button>${C2.map(chip).join("")}<button type="button" class="hw-thx" id="hwThC" data-fk="thclose" aria-expanded="true">收起 ▴</button></div>`
        :TV.mode==="picked"?`<div class="hw-thc"><span>主題：<b>${esc(TV.text)}</b></span><button type="button" class="hw-thx" id="hwThX" data-fk="thx" aria-expanded="false">更換</button><button type="button" class="hw-thx" id="hwThClr" data-fk="thclr" aria-label="清除主題，看全部題目">✕ 清除</button></div>`
        :`<div class="hw-chip"><button type="button" data-th="" data-fk="th:" class="on" aria-pressed="true">全部</button><button type="button" class="hw-thx" id="hwThO" data-fk="thopen" aria-expanded="false">選主題 ▾</button></div>`;
      body.innerHTML=`<div class="card"><b>挑題目組成一份作業</b><div class="muted" style="font-size:13px;line-height:1.7;margin-top:4px">學生打開連結就照順序做；做完畫面會顯示每題第幾次答對、用了多久，可以「複製成績」傳回給你，再到「收成績」彙整。題號都編在網址裡，不需要伺服器，也不收集任何資料。</div>
          <div class="field" style="margin-top:8px"><label for="hwTi">名稱</label><input id="hwTi" data-fk="ti" maxlength="40" placeholder="例如：第 3 週・馬後炮"></div></div>
        <div class="card" id="hwSelCard"><b id="hwSelH" tabindex="-1" data-fk="selh">已選 ${N}／${HW_MAX} 題</b>${N?`<ol class="hw-sel">${Dr.items.map((x,k)=>`<li>${esc(lab(x))}<button type="button" data-up="${k}" data-fk="up:${k}" aria-label="第 ${k+1} 題往前移"${k?"":" disabled"}>↑</button><button type="button" data-rm="${k}" data-fk="rm:${k}" aria-label="移除第 ${k+1} 題">✕</button></li>`).join("")}</ol>`:'<p class="muted" style="margin:6px 0">從下面點題卡加進來。</p>'}
          <button class="btn" id="hwMk" data-fk="mk" style="width:100%"${N?"":" disabled"}>🔗 產生作業連結</button><div id="hwOut"></div></div>
        <div class="opt" style="margin:0"><button type="button" data-src="c" data-fk="src:c" class="${Dr.src==="c"?"on":""}" aria-pressed="${Dr.src==="c"}">🍵 一盞茶殘局</button><button type="button" data-src="q" data-fk="src:q" class="${Dr.src==="q"?"on":""}" aria-pressed="${Dr.src==="q"}">🧠 主題訓練題</button></div>
        ${thRow}
        <div class="muted" style="font-size:13px">${Dr.th&&TV.mode!=="open"?"":P.length+" 題・"}由易到難・點題卡加入或取消</div>
        <div class="items hw-cards" style="padding:0">${P.slice(0,Dr.lim).map(x=>{const on=has(x.k,x.id),key=x.k+":"+x.id,did="hwd-"+x.k+"-"+x.id;
          return`<button type="button" class="item hw-card${on?" on":""}" data-add="${esc(key)}" data-fk="add:${esc(key)}" aria-pressed="${on}" aria-label="${esc(x.name)}，${on?"已加入":"未加入"}" aria-describedby="${esc(did)}${x.tags.length?" "+esc(did)+"-t":""}"><span class="lb" aria-hidden="true">${on?"✓":"＋"}</span><span class="tx"><b>${esc(x.name)}</b><span id="${esc(did)}">${esc(x.sub)}</span>${x.tags.length?`<span class="hw-tg" id="${esc(did)}-t">${esc(x.tags.join("、"))}</span>`:""}</span></button>`}).join("")}</div>
        ${P.length>Dr.lim?`<button class="btn ghost" id="hwMore" data-fk="more">再顯示 40 題（還有 ${P.length-Dr.lim} 題）</button>`:""}
        ${N?`<div class="hw-bar"><button type="button" class="btn ghost" id="hwSeeSel" data-fk="see">查看已選（${N}）・排序與產生連結</button></div>`:""}`;
      v.scrollTop=y;
      const ti=body.querySelector("#hwTi");ti.value=Dr.title;ti.oninput=()=>{Dr.title=ti.value;save()};
      body.querySelectorAll("[data-src]").forEach(b=>b.onclick=()=>{if(Dr.src===b.dataset.src)return;Dr.src=b.dataset.src;Dr.th="";Dr.lim=40;open=false;save();paint(["src:"+Dr.src])});
      body.querySelectorAll("[data-th]").forEach(b=>b.onclick=()=>{Dr.th=b.dataset.th;Dr.lim=40;open=false;save();paint(Dr.th?["thx"]:["thopen"])});
      {const o=body.querySelector("#hwThO");if(o)o.onclick=()=>{open=true;paint(["th:"+Dr.th,"th:"])}}
      {const o=body.querySelector("#hwThX");if(o)o.onclick=()=>{open=true;paint(["th:"+Dr.th,"th:"])}}
      {const o=body.querySelector("#hwThC");if(o)o.onclick=()=>{open=false;paint([Dr.th?"thx":"thopen"])}}
      {const o=body.querySelector("#hwThClr");if(o)o.onclick=()=>{Dr.th="";Dr.lim=40;open=false;save();paint(["thopen"])}}
      {const g=body.querySelector("#hwThG");if(g)g.onkeydown=e=>{if(e.key==="Escape"){e.preventDefault();open=false;paint([Dr.th?"thx":"thopen"])}}}
      body.querySelectorAll("[data-add]").forEach(b=>b.onclick=()=>{const s=b.dataset.add,i=s.indexOf(":"),k=s.slice(0,i),id=s.slice(i+1),R=hwToggle(Dr.items,k,id,HW_MAX);
        if(R.full){toast("一份作業最多 "+HW_MAX+" 題");say("已經滿了："+hwLive(Dr.items.length));return}
        Dr.items=R.items;if(typeof vibrate==="function")vibrate(5);save();paint(["add:"+s]);say((R.on?"已加入":"已取消")+"，"+hwLive(Dr.items.length))});
      body.querySelectorAll("[data-rm]").forEach(b=>b.onclick=()=>{const k=+b.dataset.rm;Dr.items.splice(k,1);save();paint(["rm:"+Math.min(k,Dr.items.length-1),"selh"]);say("已移除，"+hwLive(Dr.items.length))});
      body.querySelectorAll("[data-up]").forEach(b=>b.onclick=()=>{const k=+b.dataset.up;if(k>0){const t=Dr.items[k-1];Dr.items[k-1]=Dr.items[k];Dr.items[k]=t;save();paint([k-1>0?"up:"+(k-1):"rm:0"]);say("移到第 "+k+" 題")}});
      {const m=body.querySelector("#hwMore");if(m)m.onclick=()=>{const nx=P[Dr.lim];Dr.lim+=40;paint(nx?["add:"+nx.k+":"+nx.id]:[])}}
      {const s=body.querySelector("#hwSeeSel");if(s)s.onclick=()=>{const c=body.querySelector("#hwSelCard"),h=body.querySelector("#hwSelH");if(c)c.scrollIntoView({block:"start",behavior:"smooth"});if(h)try{h.focus({preventScroll:true})}catch(e){}}}
      body.querySelector("#hwMk").onclick=()=>{if(!Dr.items.length)return;const code=hwEnc({title:Dr.title,items:Dr.items}),url=location.href.split("#")[0]+"#/hw/"+code,o=body.querySelector("#hwOut");
        o.innerHTML=`<p class="muted" style="font-size:13px;margin:10px 0 4px">把這個連結傳給學生（${Dr.items.length} 題）：</p><input class="hw-url" readonly id="hwU" aria-label="作業連結"><div class="opt" style="margin:8px 0 0"><button class="on" id="hwUc">📋 複製連結</button>${navigator.share?'<button id="hwUs">📤 分享</button>':""}<button id="hwUt">▶ 自己先試做</button></div>`;
        const u=o.querySelector("#hwU");u.value=url;u.onclick=()=>u.select();
        o.querySelector("#hwUc").onclick=async()=>{try{await navigator.clipboard.writeText(url);toast("已複製作業連結")}catch(e){try{prompt("複製這個連結",url)}catch(x){}}};
        {const s=o.querySelector("#hwUs");if(s)s.onclick=()=>{navigator.share({title:Dr.title||"象棋作業",text:(Dr.title||"象棋作業")+"（"+Dr.items.length+" 題）",url}).catch(()=>{})}}
        o.querySelector("#hwUt").onclick=()=>{location.hash="#/hw/"+code}};
      const k=hwFkPick([...(want||[]),cur],x=>!!fkEl(x));if(k){const el=fkEl(k);if(el&&el!==document.activeElement)try{el.focus({preventScroll:true})}catch(e){}}};
    if(!CD&&!QD){v.innerHTML='<div class="pad"><div class="card muted">題庫還沒下載，連上網路再打開一次。</div></div>';return}if(!CD&&Dr.src==="c")Dr.src="q";if(!QD&&Dr.src==="q")Dr.src="c";paint()});
  return{stop(){if(typeof botVis==="function")botVis(true)}}}

/* ================= 評比循環第 4 輪（ChatGPT：P17.2、P01.3、P13.2、P05.8）=================
   ③ 棋譜匯入：棋譜庫「📥 匯入棋譜」（10-db.js Library）→ pgnISheet。貼文字或選 .pgn／.txt（UTF-8、GB18030、Big5 自動判斷），一次可以好幾盤。
      著法：ICCS（H2-E2、h2e2）、WXF（C2.5、H8+7、+R.3／R+.3 前後）、中文（炮二平五、马８进７、前炮進一；繁簡、全形數字都可以）；[FEN] 從任意局面開始；
      {註解}、【評等】保留在該步；(變著) 略過；每步用規則驗證，不合法就停在那一步（err：第 N 步「…」不合法＋原因）。
      存成「我的研究」（/an/study-save，local.js 和 xiangqi-referee.js 原本就有），不算戰績、不影響段位；棋手、賽事、日期、結果寫在第 0 步的說明。
   ④ 局面還原：#/pos＝輸入 FEN 或在棋盤上擺子（fenChk 驗證：帥將各一、子數、仕相兵的位置、帥將照面、不該走的一方正被將軍…）；
      「📖 開檢討頁」＝#/db/tmp/pos（10-db.js Viewer 讀 store "posTmp"，可以點棋子改走、🔍 請電腦分析、💾 存成棋譜）；
      「🤖 和電腦下」＝#/pos/play（這裡的小對局，用 /an/engine 選電腦的著法；練習用，不算戰績、不進對局紀錄）。檢討頁 ℹ 也能從任一步接過來。
   ⑤ 成績簽章：學生的「📋 複製成績」最後一行＝XQHW1.<base64url(JSON)>.<CRC32 base36>（作業編號、名字、日期、每題 [做完,走錯幾次,秒數,看答案]），
      教練 #/hw/grade 貼上（可以好幾位一起）→ hwVerify 驗校驗碼 → 彙整表（學生並排、哪題最多人錯）→ 匯出 CSV。全部在手機上算，不上傳。 */

/* ---------- ③ 棋譜匯入 ---------- */
const PGN_PC={帥:"K",帅:"K",將:"K",将:"K",仕:"A",士:"A",相:"B",象:"B",傌:"N",馬:"N",马:"N",俥:"R",車:"R",车:"R",炮:"C",砲:"C",包:"C",兵:"P",卒:"P"};
const PGN_WX={K:"K",A:"A",E:"B",B:"B",H:"N",N:"N",R:"R",C:"C",P:"P"},PGN_NUM={一:1,二:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9},PGN_OP={進:"+",进:"+","+":"+",退:"-","-":"-",平:"=",".":"=","=":"="};
const PGN_FMT={i:"ICCS",w:"WXF",c:"中文記譜"};
const pgnIDig=s=>String(s).replace(/[０-９]/g,c=>String.fromCharCode(c.charCodeAt(0)-65248));
const pgnIN=x=>x==null||x===""?"":String(PGN_NUM[x]||x);
/* 中文或 WXF 著法 → 比對用的鍵（C2=5、N8+7、fC+1 前炮進一、#1P+1 一兵進一）；認不得回 "" */
function pgnIKey(s){s=pgnIDig(s).replace(/\s+/g,"");let m=/^([前後后中一二三四五1-5])?([帥帅將将仕士相象傌馬马俥車车炮砲包兵卒])([一二三四五六七八九1-9])?([進进退平])([一二三四五六七八九1-9])$/.exec(s);
  if(m){if(!!m[1]===!!m[3])return"";const pre=m[1]?({前:"f",後:"b",后:"b",中:"m"}[m[1]]||"#"+pgnIN(m[1])):"";return pre+PGN_PC[m[2]]+pgnIN(m[3])+PGN_OP[m[4]]+pgnIN(m[5])}
  if((m=/^([KAEBHNRCP])([1-9])([+\-.=])([1-9])$/i.exec(s)))return PGN_WX[m[1].toUpperCase()]+m[2]+PGN_OP[m[3]]+m[4];
  if((m=/^([+\-])([KAEBHNRCP])([+\-.=])([1-9])$/i.exec(s))||(m=/^([KAEBHNRCP])([+\-])([+\-.=])([1-9])$/i.exec(s))){const a=/[+\-]/.test(m[1])?m[1]:m[2],p=/[+\-]/.test(m[1])?m[2]:m[1];return(a==="+"?"f":"b")+PGN_WX[p.toUpperCase()]+PGN_OP[m[3]]+m[4]}
  return""}
const PGN_RX=/(\s+)|([A-Ia-i][0-9]-?[A-Ia-i][0-9])(?![0-9])|([+\-][KAEBHNRCPkaebhnrcp][+\-.=][1-9]|[KAEBHNRCPkaebhnrcp][1-9+\-][+\-.=][1-9])(?![0-9])|([前後后中一二三四五1-5]?[帥帅將将仕士相象傌馬马俥車车炮砲包兵卒][一二三四五六七八九1-9]?[進进退平][一二三四五六七八九1-9])|(1-0|0-1|1\/2-1\/2|½-½|\*)|(\d+\s*[.．、]+)|(\$\d+|[!?]+|…+|[.．。、，,;；:：|\-—_~=]+)|([\s\S])/y;
const PGN_END=/^[紅红黑]?[方先]?([勝胜負负]|和棋?|和局)$|^(完|終|终|結束|结束|未完|中止)$/;
function pgnIScan(s,T){const rx=new RegExp(PGN_RX.source,"y");let junk="";
  const flush=()=>{const j=junk.trim(),k=j.replace(/[（(][^）)]*[）)]/g,"").trim();if(k&&/[A-Za-z㐀-鿿]/.test(k)&&!PGN_END.test(k))T.push({k:"x",v:j});junk=""};
  for(let m;rx.lastIndex<s.length&&(m=rx.exec(s));){if(m[8]!=null){junk+=m[8];continue}flush();if(m[1]!=null)continue;
    if(m[2])T.push({k:"m",t:"i",v:m[2]});else if(m[3])T.push({k:"m",t:"w",v:m[3]});else if(m[4])T.push({k:"m",t:"c",v:m[4]});else if(m[5])T.push({k:"r",v:m[5]==="½-½"?"1/2-1/2":m[5]})}
  flush()}
/* 著法區切成記號：{註解}、【評等】→ 註解；(變著) → 「(」「)」記號（第 11 輪 X1 起讀成變著樹）；其他交給 pgnIScan */
function pgnITok(body){const T=[],n=body.length;let i=0,buf="";const flush=()=>{if(buf)pgnIScan(buf,T);buf=""};
  while(i<n){const ch=body[i];
    if(ch==="{"||ch==="【"){flush();const j=body.indexOf(ch==="{"?"}":"】",i+1),e=j<0?n:j;T.push({k:"c",v:body.slice(i+1,e).replace(/\s+/g," ").trim()});i=e+1;continue}
    if(ch==="("||ch===")"){flush();T.push({k:ch});i++;continue}   /* 第 11 輪 X1：變著的括號變成記號，pgnIGame 讀成變著樹（原本整段略過） */
    buf+=ch;i++}
  flush();return T}
/* 照目前局面找出這個記號是哪一步；找不到回 {err:原因} */
function pgnIMove(b,s,t,strict){const C=window.XQCore,L=C.legal(b,s),side=PLAYER[s],ck=C.inCheck(b,s)?"（現在正被將軍）":"";
  const other=k=>{try{return C.legal(b,C.opp(s)).some(([f,to])=>k(f,to))}catch(e){return false}},hint=`；這步看起來是${PLAYER[C.opp(s)]}的棋，可能前面少了或多了一步`;
  if(t.t==="i"){const u=t.v.replace("-","").toLowerCase(),f=C.parseSq(u.slice(0,2)),to=C.parseSq(u.slice(2,4)),p=b[f],U=u.slice(0,2).toUpperCase();
    if(L.some(([x,y])=>x===f&&y===to))return{f,t:to};
    if(!p)return{err:`${U} 這格沒有棋子`};if(C.sideOf(p)!==s)return{err:`輪到${side}走，${U} 是${PLAYER[C.sideOf(p)]}的${C.NAMES[C.sideOf(p)][p.toUpperCase()]}`+(other((x,y)=>x===f&&y===to)?hint:"")};
    return{err:`${side}的${C.NAMES[s][p.toUpperCase()]}照規則不能這樣走${ck}`}}
  const k=pgnIKey(t.v);if(!k)return{err:"看不懂這個記法"};
  if(strict&&t.t==="c"){const cn=/[一二三四五六七八九]$/.test(pgnIDig(t.v));if(cn!==(s==="r"))return{err:`這是${cn?"紅方":"黑方"}的寫法（紅方用中文數字、黑方用阿拉伯數字），可是輪到${side}走；可能前面少了或多了一步`}}
  const hit=L.filter(([f,to])=>pgnIKey(C.notate(b,f,to))===k);
  if(hit.length===1)return{f:hit[0][0],t:hit[0][1]};if(hit.length>1)return{err:`有 ${hit.length} 種走法都可以寫成這樣，看不出是哪一步`};
  const T=k.replace(/^(f|b|m|#\d)/,"")[0];if(!b.some(p=>p&&C.sideOf(p)===s&&p.toUpperCase()===T))return{err:`輪到${side}走，可是${side}沒有${C.NAMES[s][T]}`+(other((f,to)=>pgnIKey(C.notate(b,f,to))===k)?hint:"")};
  return{err:`輪到${side}走，${side}照規則走不出這步${ck}`+(other((f,to)=>pgnIKey(C.notate(b,f,to))===k)?hint:"")}}
const PGN_RES={"1-0":"紅方勝","0-1":"黑方勝","1/2-1/2":"和局"};
/* 一盤：H＝PGN 標頭、M＝中文記譜的抬頭（【標題】、紅方：、起始局面（FEN）：…）、T＝記號 */
function pgnIGame(H,M,T){const C=window.XQCore,tx=x=>String(x==null?"":x).trim(),red=tx(H.Red||M.red),black=tx(H.Black||M.black);
  const mr=/[（(](1-0|0-1|1\/2-1\/2|\*)[）)]\s*$/.exec(M.result||"");let res=/^(1-0|0-1|1\/2-1\/2)$/.test(H.Result||"")?H.Result:mr&&mr[1]!=="*"?mr[1]:"";
  const G={title:"",red,black,event:tx(H.Event||M.event),date:tx(H.Date||M.date).replace(/(\.\?\?)+$/,"").replace(/^\?\?\?\?$/,""),open:tx(H.Opening||M.open),result:"",res:"",fen0:"",board:null,side:"r",moves:[],note0:"",err:null,vars:0,varBad:0,fmt:""};
  let fs=tx(H.FEN);if(!fs&&M.fen){const fm=/^(\S+?)\s*(?:[（(]([紅红黑])先[）)])?\s*$/.exec(M.fen);if(fm)fs=fm[1]+" "+(fm[2]==="黑"?"b":"w")}
  let b,s;if(fs){const k=fenChk(fs);if(!k.ok){G.err={n:0,tok:fs,msg:"起始局面（FEN）不對："+k.errs.join("；")}}else{b=k.board;s=k.side;if(s!=="r"||C.fen(b,s).split(" ")[0]!==C.START)G.fen0=C.fen(b,s)}}
  else{b=C.parseFen(C.START);s="r"}
  const n0=[],fc={i:0,w:0,c:0},cz=T.filter(t=>t.k==="m"&&t.t==="c").map(t=>pgnIDig(t.v)),strict=cz.some(x=>/[一二三四五六七八九]$/.test(x))&&cz.some(x=>/[1-9]$/.test(x));if(M.note)n0.push(M.note);
  if(!G.err){G.board=b.slice();G.side=s;
    /* 第 11 輪 X1 變著樹：st＝一層一層的變著（st[0]＝主線）。「(」接在某一步後面＝那一步的其他走法：從那一步走之前的局面（pb、ps）開始讀；
       「)」收起來掛到那一步的 alts。變著裡看不懂、不合法的著法：那段變著停在前一步（記 varBad），不影響主線；還沒有著法就出現的「((」整段略過。G.vars＝最外層變著幾段 */
    const st=[{seq:G.moves,main:true}],close=F=>{if(!F.dead&&F.seq.length)(F.up.alts||(F.up.alts=[])).push(F.seq)};
    for(const t of T){const F=st[st.length-1];if(t.k==="r"){if(st.length===1&&!res&&PGN_RES[t.v])res=t.v;continue}if(G.err)continue;
      if(t.k==="("){if(st.length===1)G.vars++;if(F.dead||F.stop||!F.seq.length){st.push({dead:true,seq:[]});continue}st.push({seq:[],b:F.pb,s:F.ps,up:F.seq[F.seq.length-1],pre:""});continue}
      if(t.k===")"){if(st.length>1)close(st.pop());continue}
      if(!F.main){if(F.dead||F.stop)continue;
        if(t.k==="c"){if(!t.v)continue;const m=F.seq[F.seq.length-1];if(m)m.note=m.note?m.note+" "+t.v:t.v;else F.pre=F.pre?F.pre+" "+t.v:t.v;continue}
        const mv=t.k==="m"?pgnIMove(F.b,F.s,t,false):{err:1};if(mv.err){F.stop=true;G.varBad++;continue}
        F.pb=F.b;F.ps=F.s;F.seq.push({f:mv.f,t:mv.t,cn:C.notate(F.b,mv.f,mv.t),note:F.pre||""});F.pre="";F.b=C.make(F.b,mv.f,mv.t);F.s=C.opp(F.s);continue}
      if(t.k==="c"){if(!t.v)continue;const m=G.moves[G.moves.length-1];if(m)m.note=m.note?m.note+" "+t.v:t.v;else n0.push(t.v);continue}
      const n=G.moves.length+1,rd=G.side==="r"?Math.ceil(n/2):Math.floor(n/2)+1,at=`第 ${n} 步（第 ${rd} 回合${PLAYER[s]}）`;
      if(t.k==="x"){G.err={n,tok:t.v,msg:`${at}「${t.v}」看不懂：不是 ICCS（H2-E2）、WXF（C2.5）或中文記譜（炮二平五）`};continue}
      const mv=pgnIMove(b,s,t,strict);if(mv.err){G.err={n,tok:t.v,msg:`${at}「${t.v}」不合法：${mv.err}`};continue}
      fc[t.t]++;st[0].pb=b;st[0].ps=s;G.moves.push({f:mv.f,t:mv.t,cn:C.notate(b,mv.f,mv.t),note:""});b=C.make(b,mv.f,mv.t);s=C.opp(s)}
    while(st.length>1)close(st.pop())}   /* 沒收尾的「(」：讀到的變著照樣掛上 */
  G.note0=n0.join("\n");G.res=res;const rt=tx(M.result).replace(/\s*[（(](1-0|0-1|1\/2-1\/2|\*)[）)]\s*$/,"");G.result=rt&&!/^(未完|\*)$/.test(rt)?rt:PGN_RES[res]||"";
  const top=Object.keys(fc).sort((x,y)=>fc[y]-fc[x])[0];G.fmt=fc[top]?PGN_FMT[top]:"";
  G.title=tx(M.title)||(red||black?(red||"？")+" 對 "+(black||"？"):G.event||"匯入的棋譜");return G}
/* 整段文字 → 好幾盤。新的一盤：PGN 標頭（前一盤已經有著法）、【標題】、紅方：…；沒有標頭的，結果記號（1-0…）後面又有著法也算新的一盤 */
function pgnIParse(text){text=pgnIDig(String(text==null?"":text).replace(/^﻿/,"").replace(/\r\n?/g,"\n"));
  const B=[];let g=null;const neu=()=>{g={H:{},M:{},body:""};B.push(g)},busy=()=>!!g&&/\S/.test(g.body);
  for(const ln of text.split("\n")){const t=ln.trim();let m;
    /* 第 11 輪 X1：中文記譜的「【變著】」一段（pgnTxt 匯出的）：一行一段，收在 g.V，讀完主線再接上（pgnITxtVars）；別的字出現就結束這一段 */
    if(t==="【變著】"){if(g)g.vm=true;continue}
    if(g&&g.vm){if(!t)continue;if((m=/^變著\s*(\d+(?:-\d+)*)\s*（第\s*(\d+)\s*步起[^）]*）[：:]\s*(.*)$/.exec(t))){(g.V||(g.V=[])).push({lab:m[1],ply:+m[2],tx:m[3]});continue}g.vm=false}
    if((m=/^\[(\w+)\s+"((?:[^"\\]|\\.)*)"\s*\]$/.exec(t))){if(!g||busy())neu();g.H[m[1]]=m[2].replace(/\\(.)/g,"$1");continue}
    if((m=/^【([^】]+)】$/.exec(t))){if(!g||busy()||g.M.title)neu();g.M.title=m[1].trim();continue}
    if((m=/^[紅红]方[：:]\s*(.*)$/.exec(t))){if(!g||busy())neu();const a=m[1].split(/\s*黑方[：:]\s*/);g.M.red=a[0].trim();if(a.length>1)g.M.black=a[1].trim();continue}
    if((m=/^黑方[：:]\s*(.*)$/.exec(t))){if(!g||busy())neu();g.M.black=m[1].trim();continue}
    if((m=/^(賽事|赛事|日期|開局|开局|說明|说明|結果|结果|起始局面(?:（FEN）|\(FEN\))?)[：:]\s*(.*)$/.exec(t))){const rs=/^(結果|结果)$/.test(m[1]);if(!g||(busy()&&!rs))neu();
      g.M[{賽事:"event",赛事:"event",日期:"date",開局:"open",开局:"open",說明:"note",说明:"note",結果:"result",结果:"result"}[m[1]]||"fen"]=m[2].trim();if(rs)g.done=true;continue}
    if(/^（[^（）]*）$/.test(t)&&!/[進进退平]/.test(t))continue;
    if(!g||g.done&&/\S/.test(t))neu();g.body+=ln+"\n"}
  const out=[];for(const x of B){const T=pgnITok(x.body);let seg=[],first=true;
    const push=()=>{if(first||seg.some(t=>t.k==="m"||t.k==="x")){const G=pgnIGame(first?x.H:{},first?x.M:{},seg);if(first&&x.V)pgnITxtVars(G,x.V);out.push(G)}first=false;seg=[]};
    let d=0;for(const t of T){seg.push(t);if(t.k==="(")d++;else if(t.k===")")d=Math.max(0,d-1);else if(t.k==="r"&&!d)push()}if(seg.length||first)push()}   /* 變著裡的結果記號不算一盤結束 */
  return out.filter(G=>G.moves.length||G.err||G.fen0)}
/* 第 11 輪 X1：把中文記譜「【變著】」的每一行接回變著樹。V＝[{lab:"1-2", ply 全盤第幾步起, tx 著法}]；lab 去掉最後一段＝上一層（沒有＝主線）。
   從上一層那一步走之前的局面照規則一步一步讀（pgnIMove），讀不懂、不合法就停在前一步；整行一步都讀不到、找不到上一層＝略過（varBad） */
function pgnITxtVars(G,V){if(!G||G.err||!G.board||!V||!V.length)return G;const C=window.XQCore,map={};
  for(const v of V){const up=v.lab.includes("-")?v.lab.replace(/-\d+$/,""):"",P=up?map[up]:{seq:G.moves,ply:1,b:G.board,s:G.side},i=P?v.ply-P.ply:-1;
    if(!P||!(i>=0&&i<P.seq.length)){G.varBad++;continue}
    let b=P.b.slice(),s=P.s;for(let j=0;j<i;j++){b=C.make(b,P.seq[j].f,P.seq[j].t);s=C.opp(s)}
    const b0=b.slice(),s0=s,seq=[];let bad=false;
    for(const t of pgnITok(v.tx)){if(t.k==="c"){const m=seq[seq.length-1];if(m&&t.v)m.note=m.note?m.note+" "+t.v:t.v;continue}if(t.k!=="m"&&t.k!=="x")continue;
      const mv=t.k==="m"?pgnIMove(b,s,t,false):{err:1};if(mv.err){bad=true;break}seq.push({f:mv.f,t:mv.t,cn:C.notate(b,mv.f,mv.t),note:""});b=C.make(b,mv.f,mv.t);s=C.opp(s)}
    if(bad)G.varBad++;if(!seq.length)continue;const at=P.seq[i];(at.alts||(at.alts=[])).push(seq);map[v.lab]={seq,ply:v.ply,b:b0,s:s0};if(!up)G.vars++}
  return G}
/* 存成「我的研究」（/an/study-save）：最多 200 步；棋手、賽事、日期、結果、起始局面寫在第 0 步的說明，{註解} 寫在那一步 */
function pgnIStudy(G,upto){const n=Math.min(upto==null?G.moves.length:upto,G.moves.length,200),cm={};
  const head=[G.red||G.black?"紅方："+(G.red||"—")+"　黑方："+(G.black||"—"):"",G.event?"賽事："+G.event:"",G.date?"日期："+G.date:"",G.open?"開局："+G.open:"",
    G.result?"結果："+G.result+(G.res?"（"+G.res+"）":""):"",G.fen0?"起始局面（FEN）："+G.fen0:"",
    pgnHasAlt(G.moves)?"變著（「我的研究」只存主線，變著抄在這裡）：\n"+pgnTxtVars(G.moves,1,G.side==="b"?1:0,"").join("\n"):"",G.note0].filter(Boolean).join("\n");   /* 第 11 輪 X1 */
  if(head)cm["0_0"]=head;G.moves.slice(0,n).forEach((m,i)=>{if(m.note)cm["0_"+(i+1)]=m.note});
  return{board:G.board.slice(),side:G.side,moves:G.moves.slice(0,n).map(m=>[m.f,m.t]),title:String(G.title||"匯入的棋譜").slice(0,80),src:"📥 匯入"+(G.fmt?"・"+G.fmt:""),comments:cm}}
/* 讀檔：UTF-8 → GB18030 → Big5（大陸、臺灣的象棋軟體常存成 GBK／Big5） */
async function pgnIFile(f){const buf=await f.arrayBuffer();for(const enc of["utf-8","gb18030","big5"]){try{return new TextDecoder(enc,{fatal:true}).decode(buf)}catch(e){}}return new TextDecoder("utf-8").decode(buf)}
function pgnISheet(onSaved){sheet("📥 匯入棋譜",b=>{
  b.innerHTML=`<p class="muted" style="margin:0 0 6px;font-size:13px;line-height:1.7">貼上棋譜，或選一個 .pgn／.txt 檔，一次可以好幾盤。著法可以寫 ICCS（H2-E2）、WXF（C2.5）或中文（炮二平五　馬8進7）；有 [FEN] 就從那個局面開始，{註解}會留在那一步，( ) 裡的變著抄在開頭說明。<br>匯入的棋譜存到「我的研究」，不算戰績、不影響段位；打開後可以請電腦分析、點棋子從任一步改走。</p>
    <textarea id="piT" aria-label="貼上棋譜" spellcheck="false" placeholder="[Red &quot;紅方棋手&quot;]&#10;[Black &quot;黑方棋手&quot;]&#10;1. H2-E2 H9-G7 2. H0-G2 {註解} I9-H9 *" style="width:100%;box-sizing:border-box;height:140px;font:12px/1.5 ui-monospace,monospace;border:1px solid var(--line);border-radius:10px;padding:8px;background:var(--bg);color:inherit"></textarea>
    <div class="opt" style="margin:8px 0"><button class="on" id="piGo">🔍 讀取棋譜</button><button id="piF">📂 選檔（.pgn／.txt）</button></div>
    <input type="file" id="piFile" accept=".pgn,.txt,text/plain,application/x-chess-pgn" hidden><div id="piR" aria-live="polite"></div>`;
  const ta=b.querySelector("#piT"),R=b.querySelector("#piR"),fi=b.querySelector("#piFile");
  b.querySelector("#piF").onclick=()=>fi.click();b.querySelector("#piGo").onclick=()=>run();
  fi.onchange=async()=>{const f=fi.files&&fi.files[0];if(!f)return;if(f.size>3e6)return toast("檔案太大（超過 3 MB）");try{ta.value=await pgnIFile(f);run()}catch(e){toast("讀不了這個檔："+e.message)}};
  function run(){let G=[];try{G=pgnIParse(ta.value)}catch(e){R.innerHTML=`<p style="color:var(--red)">⚠ 讀取失敗：${esc(e.message)}</p>`;return}
    if(!G.length){R.innerHTML='<p class="muted">沒有找到棋譜。請確認貼的是 PGN 或中文記譜（例如「炮二平五　馬8進7」）。</p>';return}
    if(G.length>50){toast("一次最多匯入 50 盤，先讀前 50 盤");G=G.slice(0,50)}
    const saved={},ok=i=>G[i].moves.length&&!G[i].err&&!saved[i];
    const save=async i=>{try{const r=await api("/an/study-save",pgnIStudy(G[i]));saved[i]=r&&r.id||"?";if(typeof onSaved==="function")try{onSaved()}catch(e){}return true}catch(e){toast("⚠ "+e.message);return false}};
    const paint=()=>{const left=G.map((_,i)=>i).filter(ok);
      R.innerHTML=`<p class="muted" style="margin:4px 0">找到 ${G.length} 盤${G.some(g=>g.err)?"，有 "+G.filter(g=>g.err).length+" 盤中途有問題":""}。</p>`+(left.length>1?`<button class="btn" id="piAll" style="width:100%">💾 全部存到我的研究（${left.length} 盤）</button>`:"")
        +G.map((g,i)=>`<div class="card" style="margin:8px 0"><b>${esc(g.title)}</b><div class="muted" style="font-size:13px;line-height:1.6">${g.moves.length} 步${g.fmt?"・"+g.fmt:""}${g.fen0?"・從自訂局面開始（"+(g.side==="b"?"黑先":"紅先")+"）":""}${g.result?"・"+esc(g.result):""}${g.event?"・"+esc(g.event):""}${g.vars?"・"+g.vars+" 段變著（存到我的研究只留主線，變著抄在開頭說明）":""}${g.varBad?"・"+g.varBad+" 段變著有讀不懂的著法，停在前一步":""}${g.moves.length>200?"・超過 200 步，只存前 200 步":""}${g.moves.some(m=>m.note)||g.note0?"・有註解":""}</div>
          ${g.err?`<div style="color:var(--red);font-size:14px;line-height:1.6;margin-top:4px">⚠ ${esc(g.err.msg)}</div>`:""}
          <div class="opt" style="margin:6px 0 0">${saved[i]?`<button class="on" data-op="${i}">📖 打開（已存）</button>`:g.moves.length?`<button class="on" data-sv="${i}">💾 ${g.err?"只存前 "+g.moves.length+" 步":"存到我的研究"}</button>`:""}${!saved[i]&&g.board&&!g.moves.length?`<button data-pos="${i}">♟ 用這個局面</button>`:""}</div></div>`).join("");
      {const a=R.querySelector("#piAll");if(a)a.onclick=async()=>{a.disabled=true;let n=0;for(const i of left)if(await save(i))n++;toast("💾 已存 "+n+" 盤到「我的研究」");paint()}}
      R.querySelectorAll("[data-sv]").forEach(x=>x.onclick=async()=>{x.disabled=true;if(await save(+x.dataset.sv))toast("💾 已存到「我的研究」");paint()});
      R.querySelectorAll("[data-op]").forEach(x=>x.onclick=()=>{const id=saved[+x.dataset.op];closeSheet();location.hash="#/db/study/"+encodeURIComponent(id)});
      R.querySelectorAll("[data-pos]").forEach(x=>x.onclick=()=>{const g=G[+x.dataset.pos];closeSheet();posRGo(g.board,g.side,"edit")})};
    paint()}})}

/* ---------- ④ 局面還原：FEN 驗證、擺子、開檢討頁、和電腦下 ---------- */
const FEN_MAX={K:1,A:2,B:2,N:2,R:2,C:2,P:5};
/* 回 {ok,errs,warns,board,side,fen}；board 只在 10 列、每列 9 格都對的時候才有 */
function fenChk(str){const C=window.XQCore,errs=[],warns=[];const s=pgnIDig(String(str==null?"":str)).replace(/^﻿/,"").trim();
  if(!s)return{ok:false,errs:["沒有輸入 FEN"],warns};const parts=s.split(/\s+/),rows=parts[0].split("/");
  if(rows.length!==10)return{ok:false,errs:[`FEN 要有 10 列（用 / 分開），現在是 ${rows.length} 列`],warns};
  const b=[];rows.forEach((row,r)=>{let n=0;for(const ch of row){if(/[1-9]/.test(ch)){n+=+ch;for(let k=0;k<+ch;k++)b.push(null)}
      else if(/[kabnrcpehKABNRCPEH]/.test(ch)){n++;b.push({e:"b",h:"n",E:"B",H:"N"}[ch]||ch)}else{errs.push(`第 ${r+1} 列有看不懂的字「${ch}」（只能用 KABNRCP、kabnrcp 和數字 1-9）`);return}}
    if(n!==9)errs.push(`第 ${r+1} 列（由上往下數）有 ${n} 格，應該是 9 格`)});
  if(errs.length||b.length!==90)return{ok:false,errs:errs.length?errs:["棋盤格數不對"],warns};
  const sd=(parts[1]||"").toLowerCase();let side="r";if(!sd)warns.push("沒寫輪到誰走，當作紅先");else if(sd==="b")side="b";else if(sd!=="w"&&sd!=="r")errs.push(`輪走方「${parts[1]}」看不懂（w＝紅先、b＝黑先）`);
  const nm=(sdx,T)=>C.NAMES[sdx][T],at=i=>String.fromCharCode(65+i%9)+(9-(i/9|0)),cnt={r:{},b:{}};
  b.forEach((p,i)=>{if(!p)return;const x=C.sideOf(p),T=p.toUpperCase(),r=i/9|0,c=i%9;cnt[x][T]=(cnt[x][T]||0)+1;const R=x==="r"?9-r:r;
    if(T==="K"&&!(R<=2&&c>=3&&c<=5))errs.push(`${PLAYER[x]}的${nm(x,"K")}在 ${at(i)}，不在自己的九宮裡`);
    if(T==="A"&&!((R===0||R===2)&&(c===3||c===5)||R===1&&c===4))errs.push(`${PLAYER[x]}的${nm(x,"A")}在 ${at(i)}，${nm(x,"A")}只能在九宮的斜線上`);
    if(T==="B"&&!([0,4].includes(R)&&[2,6].includes(c)||R===2&&[0,4,8].includes(c)))errs.push(`${PLAYER[x]}的${nm(x,"B")}在 ${at(i)}，${nm(x,"B")}只能在自己這邊的七個象眼位置`);
    if(T==="P"&&(R<=2||R<=4&&c%2))errs.push(`${PLAYER[x]}的${nm(x,"P")}在 ${at(i)}，${nm(x,"P")}${R<=2?"不會退回自己的底線附近":"還沒過河，只會在原來的直線上"}`)});
  for(const x of["r","b"])for(const T of Object.keys(FEN_MAX)){const n=cnt[x][T]||0;if(T==="K"&&!n)errs.push(`${PLAYER[x]}沒有${nm(x,"K")}（帥、將各要 1 個）`);else if(n>FEN_MAX[T])errs.push(`${PLAYER[x]}有 ${n} 個${nm(x,T)}，最多只能 ${FEN_MAX[T]} 個`)}
  if(!errs.length){const K=b.indexOf("K"),k=b.indexOf("k");if(K%9===k%9){let clear=true;for(let i=k+9;i<K;i+=9)if(b[i]){clear=false;break}if(clear)errs.push("帥和將照面（同一條直線、中間沒有棋子），規則不允許")}}
  if(!errs.length){const o=C.opp(side);if(C.inCheck(b,o))errs.push(`輪到${PLAYER[side]}走，可是${PLAYER[o]}的${nm(o,"K")}正被將軍——上一步${PLAYER[o]}不可能讓自己被將。請檢查是不是輪錯人`);
    else if(!C.legal(b,side).length)warns.push(`輪到${PLAYER[side]}走，可是已經${C.inCheck(b,side)?"被將死":"無子可動（困斃）"}了`)}
  return{ok:!errs.length,errs,warns,board:b,side,fen:C.fen(b,side)}}
/* 檢討頁用的暫存棋譜（10-db.js Viewer c==="tmp"） */
function posRItem(board,side,moves,title,note){const C=window.XQCore;let b=board.slice();const ms=(moves||[]).map(([f,t])=>{const cn=C.notate(b,f,t);b=C.make(b,f,t);return{f,t,cn}});
  return{id:"pos",title:title||"局面還原",name:title||"局面還原",board:board.slice(),startTurn:side,lines:[{id:0,parent:null,start:1,moves:ms}],comments:{"0_0":note||"局面還原・起始局面（FEN）："+C.fen(board,side)+"\n點棋子可以自己走；按 🔍 請電腦分析。"},result:""}}
function posRTmp(){const it=store.get("posTmp",null);return it&&it.board&&it.lines?Promise.resolve(it):Promise.reject(new Error("局面還原的資料不見了，請回「♟ 局面還原」重新擺一次"))}
const posRNav=h=>{if(location.hash===h){if(typeof route==="function")route()}else location.hash=h};
/* 11/11 ChatGPT 介面報告 P2（story/99）：三條入口（棋譜庫、檢討頁 ℹ、分享網址 #/pos?fen=…）都要顯示預期局面和輪到哪一方，返回回到原本的研究。
   posRFrom＝從哪一頁進來（store "posRFrom"＝{h,at}）；局面還原、和電腦下的返回鍵照它，6 小時內有效，否則回棋譜庫 */
const PGN_TOOLS=[{id:"libImp",nm:"📥 匯入棋譜",ex:"我有整盤棋譜"},{id:"libPos",nm:"♟ 局面還原",ex:"我只有一個局面"}];
function posRFromSet(h){h=String(h||"");if(!/^#\//.test(h)||/^#\/pos(\/|\?|$)/.test(h)||/^#\/db\/tmp\//.test(h))return false;store.set("posRFrom",{h,at:Date.now()});return true}
function posRBack(F,now){return F&&typeof F.h==="string"&&/^#\//.test(F.h)&&!/^#\/pos(\/|\?|$)/.test(F.h)&&!/^#\/db\/tmp\//.test(F.h)&&(now||Date.now())-(+F.at||0)<6*36e5?F.h:"#/db"}
/* 分享網址：#/pos?fen=<FEN>（FEN 用 encodeURIComponent，斜線不會被路由切開）；沒編碼的也認得 */
function posRQuery(hash){const m=/^#\/pos\?(.*)$/.exec(String(hash||""));if(!m)return null;let q=m[1],fen=null;
  try{fen=new URLSearchParams(q).get("fen")}catch(e){}if(fen==null){const k=/(?:^|&)fen=([^&]*)/.exec(q);if(k)try{fen=decodeURIComponent(k[1])}catch(e){fen=k[1]}}
  fen=fen==null?"":String(fen).trim();return fen||null}
const posRShareUrl=(base,fen)=>String(base||"").split("#")[0]+"#/pos?fen="+encodeURIComponent(String(fen||""));
/* mode：view＝開檢討頁、play＝和電腦下、edit＝回擺子畫面改 */
function posRGo(board,side,mode,moves,title){const C=window.XQCore,fen=C.fen(board,side);posRFromSet(location.hash);
  if(mode==="edit"){store.set("posRDraft",{fen});return posRNav("#/pos")}
  const k=fenChk(fen);if(!k.ok)return toast("⚠ 這個局面不合規則："+k.errs[0]);
  if(mode==="play"){if(!/^#\/pos(\/|\?|$)/.test(location.hash))store.set("posRDraft",{fen});store.set("posRGame",{fen0:fen,human:side,lv:store.get("posRLv",1),mv:[]});return posRNav("#/pos/play")}
  store.set("posTmp",posRItem(board,side,moves,title));posRNav("#/db/tmp/pos")}
function posRCss(){if(document.getElementById("posr-css"))return;const st=document.createElement("style");st.id="posr-css";st.textContent=`
.pr-wrap{padding:10px 12px 28px;display:flex;flex-direction:column;gap:10px}.pr-wrap .card{margin:0}.pr-wrap .opt{margin:0}
.pr-wrap textarea{width:100%;box-sizing:border-box;font:12px/1.5 ui-monospace,monospace;border:1px solid var(--line);border-radius:10px;padding:8px;background:var(--bg);color:inherit}
.pr-bd{width:100%;max-width:440px;margin:0 auto}.pr-bd svg{width:100%;height:auto;display:block}
.pr-pal{display:flex;flex-wrap:wrap;gap:5px;justify-content:center}.pr-pal button{min-width:40px;height:40px;border-radius:999px;border:1px solid var(--line);background:var(--card);font:700 18px var(--serif,serif);color:inherit;padding:0 8px}
.pr-pal button.r{color:var(--red,#b22)}.pr-pal button.on{outline:3px solid var(--accent);outline-offset:1px}.pr-pal button.t{font:600 13px var(--sans)}
.pr-err{color:var(--red,#b22);font-size:14px;line-height:1.6;margin:6px 0 0;padding-left:1.2em}.pr-ok{color:var(--accent);font-size:14px;margin:6px 0 0}
`;document.head.append(st)}
function PosRestore(v,sub){posRCss();if(typeof setTabs==="function")setTabs(false);if(sub==="play")return PosRPlay(v);
  setTop("♟ 局面還原",posRBack(store.get("posRFrom",null)));v.className="view";const C=window.XQCore,D=store.get("posRDraft",null)||{},QF=posRQuery(location.hash);
  const QK=QF?fenChk(QF):null,shared=!!(QK&&QK.board);let mine=!shared;   /* 分享來的局面：先不蓋掉自己存的擺子草稿，動了才算自己的 */
  let ck=shared?QK:fenChk(D.fen||C.START+" w");if(!ck.board)ck=fenChk(C.START+" w");let b=ck.board.slice(),side=ck.side,tool="",sel=-1,flip=shared&&ck.side==="b";
  v.innerHTML=`<div class="pr-wrap"><div class="card"><b>輸入 FEN，或在下面的棋盤上擺子</b><div class="muted" style="font-size:13px;line-height:1.6;margin:2px 0 6px">FEN 例：<code style="word-break:break-all">rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w</code>（大寫＝紅、小寫＝黑，w＝紅先、b＝黑先）</div>
      <textarea id="prF" rows="2" spellcheck="false" aria-label="FEN"></textarea><div class="opt" style="margin-top:6px"><button class="on" id="prA">套用這個 FEN</button><button id="prC">📋 複製 FEN</button><button id="prSh">🔗 分享這個局面</button></div><div id="prE" aria-live="polite"></div></div>
    ${shared?`<div class="card" id="prQ" role="status"><b>🔗 別人分享的局面</b><div style="font-size:14px;line-height:1.7;margin-top:2px">輪到<b>${PLAYER[ck.side]}</b>走${ck.side==="b"?"（棋盤已翻轉，黑方在下面）":""}。${ck.ok?"可以直接請電腦分析，或從這裡和電腦下。":"這個局面有地方不合規則，見上面的說明。"}</div>${D.fen&&D.fen!==ck.fen?'<button class="btn ghost" id="prMine" style="width:100%;margin-top:8px">↺ 換回我上次擺的局面</button>':""}</div>`:QF?'<div class="card" role="alert" style="color:var(--red,#b22)">分享網址裡的局面讀不懂，先顯示你上次擺的局面。</div>':""}
    <div class="pr-bd" id="prB"></div><div class="pr-pal" id="prP"></div>
    <div class="opt" style="justify-content:center"><button data-sd="r">紅先</button><button data-sd="b">黑先</button><button id="prS">標準開局</button><button id="prX">清空（留帥將）</button><button id="prFl">⇅ 翻轉</button></div>
    <div class="card"><button class="btn" id="prV" style="width:100%">📖 開檢討頁・請電腦分析</button><button class="btn ghost" id="prG" style="width:100%;margin-top:8px">🤖 和電腦從這個局面下</button>
      <p class="muted" style="font-size:12px;line-height:1.6;margin:8px 0 0">和電腦下是練習：不算戰績、不影響段位。擺子：先點下面的棋子再點棋盤；選「✋ 移動」可以點一顆棋子再點目的地；點同一種棋子在同一格會拿掉。</p></div></div>`;
  const ta=v.querySelector("#prF"),E=v.querySelector("#prE"),bd=Board(i=>tap(i));v.querySelector("#prB").append(bd.svg);
  const pal=v.querySelector("#prP"),TOOLS=[["","✋ 移動"],..."KABNRCP".split("").map(p=>[p,C.NAMES.r[p]]),..."kabnrcp".split("").map(p=>[p,C.NAMES.b[p.toUpperCase()]]),["x","🧽 擦掉"]];
  function upd(keepText,edit){const fen=C.fen(b,side);if(!keepText)ta.value=fen;ck=fenChk(fen);if(edit)mine=true;if(mine)store.set("posRDraft",{fen});
    E.innerHTML=ck.errs.length?`<ul class="pr-err">${ck.errs.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:`<p class="pr-ok">✔ 局面合法・輪到${PLAYER[side]}走${ck.warns.length?"<br><span class=\"muted\">"+esc(ck.warns.join("；"))+"</span>":""}</p>`;
    v.querySelectorAll("[data-sd]").forEach(x=>x.classList.toggle("on",x.dataset.sd===side));v.querySelector("#prV").disabled=v.querySelector("#prG").disabled=!ck.ok;
    pal.innerHTML=TOOLS.map(([k,l])=>`<button data-t="${k}" class="${k===tool?"on ":""}${k&&k!=="x"&&C.sideOf(k)==="r"?"r":k===""||k==="x"?"t":""}" aria-label="${k===""||k==="x"?l:(C.sideOf(k)==="r"?"紅":"黑")+l}">${l}</button>`).join("");
    pal.querySelectorAll("[data-t]").forEach(x=>x.onclick=()=>{tool=x.dataset.t;sel=-1;upd(true)});
    bd.draw(b,{flip,sel,targets:[],check:ck.ok&&C.inCheck(b,side)?b.indexOf(side==="r"?"K":"k"):-1})}
  function tap(i){if(tool==="x")b[i]=null;else if(tool){if(b[i]===tool)b[i]=null;else{if(/^[kK]$/.test(tool))for(let k=0;k<90;k++)if(b[k]===tool)b[k]=null;b[i]=tool}}
    else if(sel<0){if(b[i])sel=i}else{if(i!==sel){b[i]=b[sel];b[sel]=null}sel=-1}if(typeof vibrate==="function")vibrate(5);upd(false,true)}
  v.querySelector("#prA").onclick=()=>{const k=fenChk(ta.value);if(!k.board){E.innerHTML=`<ul class="pr-err">${k.errs.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`;return}b=k.board.slice();side=k.side;sel=-1;upd(false,true)};
  v.querySelector("#prC").onclick=()=>pgnOut(C.fen(b,side),"FEN","txt","copy");
  v.querySelector("#prSh").onclick=()=>{const u=posRShareUrl(location.href,C.fen(b,side));if(navigator.share)navigator.share({title:"象棋局面",text:"輪到"+PLAYER[side]+"走",url:u}).catch(()=>{});else pgnOut(u,"局面網址","txt","copy")};
  {const m=v.querySelector("#prMine");if(m)m.onclick=()=>{const k=fenChk(D.fen);if(!k.board)return;b=k.board.slice();side=k.side;sel=-1;flip=false;mine=true;m.closest(".card").remove();upd()}}
  v.querySelectorAll("[data-sd]").forEach(x=>x.onclick=()=>{side=x.dataset.sd;upd(false,true)});
  v.querySelector("#prS").onclick=()=>{b=C.parseFen(C.START);side="r";sel=-1;upd(false,true)};
  v.querySelector("#prX").onclick=()=>{const K0=b.indexOf("K"),k0=b.indexOf("k"),K=K0>=0?K0:85;let k=k0>=0?k0:4;if(K%9===k%9)k=k%9===4?k-1:k-k%9+4;b=b.map(()=>null);b[K]="K";b[k]="k";sel=-1;upd(false,true)};
  v.querySelector("#prFl").onclick=()=>{flip=!flip;upd(true)};
  v.querySelector("#prV").onclick=()=>{if(ck.ok)posRGo(b,side,"view")};v.querySelector("#prG").onclick=()=>{if(ck.ok)posRGo(b,side,"play")};
  upd();return{}}
/* 和電腦下（練習）：電腦用 /an/engine 選著法；入門＝從前幾條裡挑差不多好的、高手＝最好的那步 */
const POSR_LV=[{nm:"入門",ms:150,n:4,gap:250},{nm:"中等",ms:500,n:3,gap:60},{nm:"高手",ms:1500,n:1,gap:0}];
function posRPick(lines,s,L){const C=window.XQCore,c=[];for(const l of lines||[]){const u=String(l&&l.mv||"");if(!/^[a-i]\d[a-i]\d$/.test(u))continue;c.push({f:C.parseSq(u.slice(0,2)),t:C.parseSq(u.slice(2,4)),v:(s==="r"?1:-1)*(+l.vr||0)})}
  if(!c.length)return null;const best=Math.max(...c.map(x=>x.v)),ok=c.filter(x=>x.v>=best-(L&&L.gap||0)),x=ok[Math.floor(Math.random()*ok.length)];return[x.f,x.t]}
function PosRPlay(v){const C=window.XQCore,G=store.get("posRGame",null),F=store.get("posRFrom",null);setTop("🤖 從局面和電腦下",F&&posRBack(F)!=="#/db"&&/^#\/db\//.test(F.h)?posRBack(F):"#/pos");
  const k0=G&&G.fen0?fenChk(G.fen0):null;if(!k0||!k0.ok){v.className="view";v.innerHTML='<div class="pad"><div class="card muted" style="line-height:1.8">還沒有局面（或局面不合規則）。先到「♟ 局面還原」擺一個。</div></div>';return{}}
  G.mv=(G.mv||[]).filter(m=>Array.isArray(m)&&m.length===2);G.lv=Math.max(0,Math.min(2,G.lv|0));if(G.human!=="b")G.human="r";
  v.className="view fixed";v.innerHTML='<div class="status" id="ppH" style="margin-top:6px"></div><div class="boardbox" id="bbox"></div><div class="status" id="stat"></div><div class="note" id="note"></div><div style="flex:1"></div><div class="actions" id="acts"></div>';
  const g=s=>v.querySelector(s);let sel=-1,busy=false,alive=true,tm=null;const bd=Board(i=>tap(i));g("#bbox").append(bd.svg);
  const pos=()=>{let b=k0.board.slice(),s=k0.side;for(const[f,t]of G.mv){b=C.make(b,f,t);s=C.opp(s)}return{b,s}},save=()=>store.set("posRGame",G);
  const over=P=>C.legal(P.b,P.s).length?null:{lose:P.s,mate:C.inCheck(P.b,P.s)};
  function paint(){const P=pos(),E=over(P),lm=G.mv[G.mv.length-1],L=E||busy||P.s!==G.human?[]:C.legal(P.b,P.s);
    bd.draw(P.b,{flip:G.human==="b",last:lm?{f:lm[0],t:lm[1]}:null,sel,targets:sel>=0?L.filter(([f])=>f===sel).map(x=>x[1]):[],check:C.inCheck(P.b,P.s)?P.b.indexOf(P.s==="r"?"K":"k"):-1});
    g("#ppH").innerHTML=`你執<b>${PLAYER[G.human]}</b><button class="pill" id="ppSw" style="margin-left:4px;padding:2px 10px">⇄ 換邊</button>・電腦：${POSR_LV.map((x,i)=>`<button class="pill${i===G.lv?" on":""}" data-lv="${i}" style="margin-left:4px;padding:2px 10px">${x.nm}</button>`).join("")}`;
    g("#ppH").querySelectorAll("[data-lv]").forEach(x=>x.onclick=()=>{G.lv=+x.dataset.lv;store.set("posRLv",G.lv);save();paint()});
    g("#ppSw").onclick=()=>{if(busy)return;G.human=C.opp(G.human);sel=-1;save();paint();clearTimeout(tm);tm=setTimeout(cpu,250)};
    g("#stat").textContent=E?(E.lose===G.human?"😣 你輸了":"🎉 你贏了")+"（"+PLAYER[E.lose]+(E.mate?"被將死":"無子可動")+"）":busy?"電腦思考中…":P.s===G.human?`輪到你（${PLAYER[G.human]}）走・第 ${G.mv.length+1} 步`:"輪到電腦走";
    let b=k0.board.slice();const cn=G.mv.map(([f,t])=>{const x=C.notate(b,f,t);b=C.make(b,f,t);return x});
    g("#note").textContent=cn.length?cn.map((x,i)=>(i+1)+"."+x).join("　"):"從還原的局面開始。這是練習：不算戰績、不影響段位、不判長將。"}
  async function cpu(){const P=pos();if(!alive||busy||P.s===G.human||over(P))return;busy=true;paint();let mv=null;
    try{const L=POSR_LV[G.lv],d=await api("/an/engine",{board:P.b,side:P.s,ms:L.ms,multipv:L.n});mv=posRPick(d&&d.lines,P.s,L)}catch(e){}
    if(!alive)return;const LL=C.legal(P.b,P.s);if(!mv||!LL.some(([f,t])=>f===mv[0]&&t===mv[1])){mv=null;if(LL.length){const x=LL[Math.floor(Math.random()*LL.length)];mv=[x[0],x[1]];toast("電腦分析沒有回應，這步先隨便走")}}
    busy=false;if(mv){G.mv.push(mv);save()}paint()}
  function tap(x){const P=pos();if(busy||over(P)||P.s!==G.human)return;const L=C.legal(P.b,P.s);
    if(sel>=0&&L.some(([f,t])=>f===sel&&t===x)){G.mv.push([sel,x]);sel=-1;save();if(typeof vibrate==="function")vibrate(12);paint();clearTimeout(tm);tm=setTimeout(cpu,250);return}
    sel=L.some(([f])=>f===x)?x:-1;if(sel>=0&&typeof vibrate==="function")vibrate(5);paint()}
  const undo=()=>{if(busy||!G.mv.length)return;G.mv.pop();while(G.mv.length&&pos().s!==G.human)G.mv.pop();sel=-1;save();paint();if(pos().s!==G.human){clearTimeout(tm);tm=setTimeout(cpu,250)}};
  const study=()=>{if(!G.mv.length)return toast("還沒有著法可以存");api("/an/study-save",{board:k0.board,side:k0.side,moves:G.mv,title:"局面還原・和電腦下",src:"♟ 局面還原",comments:{"0_0":"起始局面（FEN）："+G.fen0}}).then(()=>toast("💾 已存到「我的研究」")).catch(e=>toast("⚠ "+e.message))};
  actionBar(g("#acts"),[["undo","↶","悔棋",undo],["view","📖","檢討這盤",()=>posRGo(k0.board,k0.side,"view",G.mv,"局面還原・和電腦下")],["save","💾","存棋譜",study],["re","⟲","重來",()=>{if(busy)return;G.mv=[];sel=-1;save();paint();clearTimeout(tm);tm=setTimeout(cpu,250)}],["edit","♟","改局面",()=>posRGo(k0.board,k0.side,"edit")]]);
  paint();if(pos().s!==G.human)tm=setTimeout(cpu,300);return{stop(){alive=false;clearTimeout(tm)}}}

/* ---------- ⑤ 成績簽章與教練彙整 ---------- */
const HW_CRC_T=(()=>{const T=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;T.push(c>>>0)}return T})();
function hwCrc(s){let c=0xFFFFFFFF;for(const x of new TextEncoder().encode(String(s)))c=HW_CRC_T[(c^x)&255]^(c>>>8);return((c^0xFFFFFFFF)>>>0).toString(36).padStart(7,"0")}
function hwB64d(s){s=String(s||"").replace(/-/g,"+").replace(/_/g,"/");if(/[^A-Za-z0-9+/]/.test(s))throw new Error("壞掉的編碼");while(s.length%4)s+="=";
  const bin=atob(s),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return new TextDecoder("utf-8",{fatal:true}).decode(u)}
/* 學生這份作業的簽章行：XQHW1.<資料>.<校驗碼>；r＝每題 [做完 1/0, 走錯幾次, 用了幾秒, 看答案 1/0] */
function hwSign(code,H,name){const R=hwRec(code),r=H.items.map((_,i)=>{const x=R.it&&R.it[i]||{};return[x.end?1:0,x.miss|0,x.end?Math.round((+x.ms||0)/1000):0,x.end&&x.ans?1:0]});
  const d=new Date(R.at||Date.now()),p=n=>String(n).padStart(2,"0"),j=hwB64(JSON.stringify({v:1,c:code,n:String(name||"").trim().slice(0,20),d:d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate()),r}));
  return"XQHW1."+j+"."+hwCrc(j)}
/* 教練貼上的文字 → {ok:[每份成績], bad:[{k 第幾份, why}]}；可以一次貼好幾位 */
function hwVerify(text){const s=String(text||""),ok=[],bad=[],rx=/XQHW1\.([A-Za-z0-9_\-\s]+)\.([0-9a-z]{7})(?![0-9A-Za-z])/g;let m,k=0;
  while((m=rx.exec(s))){k++;const j=m[1].replace(/\s+/g,"");if(hwCrc(j)!==m[2]){bad.push({k,why:"校驗碼對不上（成績被改過，或複製時少了一段）"});continue}
    let o=null;try{o=JSON.parse(hwB64d(j))}catch(e){}
    if(!o||o.v!==1||typeof o.c!=="string"||!Array.isArray(o.r)){bad.push({k,why:"格式看不懂（可能是別的版本）"});continue}
    const H=hwDec(o.c);if(!H||H.items.length!==o.r.length||!o.r.every(x=>Array.isArray(x)&&x.length===4&&x.every(n=>Number.isInteger(n)&&n>=0))){bad.push({k,why:"作業編號和題數對不上"});continue}
    ok.push({code:o.c,title:H.title,name:String(o.n||"").slice(0,20),d:String(o.d||"").slice(0,10),r:o.r,sig:m[2]})}
  if(!k&&/作業成績/.test(s))bad.push({k:0,why:"只有文字、沒有簽章那一行：請學生更新 App，按「📋 複製成績」整段傳來"});
  return{ok,bad}}
/* 彙整表：同一份作業、學生並排（同名字的以後貼的為準）；每題算「沒有一次答對」（第 2 次以後才對、看答案）幾人＝wrong，最多的列在 worst */
/* 評比第 6 輪（ChatGPT 改善清單第 7 項、第 7 輪計畫 F2）：錯因分類＋弱點追蹤。
   錯因只用學生傳來的四個數字（做完、走錯幾次、用時、看答案）判斷，不猜學生在想什麼：
   一次就對（3 分鐘內）／想很久（一次對但超過 3 分鐘）／計算不穩（第 2～3 次才對）／多次試錯（第 4 次以後才對）／不會解（看答案）／沒做完 */
const HW_CAUSE=[["slow","想很久","一次就對，但超過 3 分鐘：會，還不熟"],["shaky","計算不穩","第 2～3 次才答對：方向對，算得不夠深或漏看一步"],["guess","多次試錯","第 4 次以後才答對：比較像在猜，建議回頭看這個主題的基本型"],["stuck","不會解","看了答案：這個主題還沒學會"],["undone","沒做完","打開過但沒有答對、也沒看答案"]];
function hwCause(y){const[dn,mi,sec,an]=y||[0,0,0,0];if(!dn)return mi?{k:"undone",t:"沒做完"}:{k:"none",t:"沒做"};if(an)return{k:"stuck",t:"不會解"};if(mi>=3)return{k:"guess",t:"多次試錯"};if(mi>=1)return{k:"shaky",t:"計算不穩"};if(sec>180)return{k:"slow",t:"想很久"};return{k:"ok",t:"一次就對"}}
/* 題目的主題：hwLabels 的「殘局・短殺〈…〉」「主題・將軍、殺棋〈…〉」取第一個主題；還沒讀到標題就只分殘局／主題題 */
function hwTheme(label,it){const m=/^(?:殘局|主題)・([^〈、]+)/.exec(String(label||""));return m?m[1].trim():(it&&it.k==="c"?"殘局":"主題題")}
const hwBad=k=>k==="shaky"||k==="guess"||k==="stuck"||k==="undone";
/* 弱點追蹤：這支手機收過的所有作業（store hwGrades），同名字的學生合在一起；每人做了幾題、一次就對的比例、各錯因幾次、最弱的兩個主題（錯的比例高的先） */
function hwWeak(A,labelsBy){const st={};
  for(const code of Object.keys(A||{})){const H=hwDec(code);if(!H)continue;const L=labelsBy&&labelsBy[code]||[];
    for(const x of Object.values(A[code].st||{})){const nm=x.name||"（沒寫名字）",S=st[nm]||(st[nm]={nm,hw:0,n:0,first:0,c:{},th:{}});S.hw++;
      H.items.forEach((it,i)=>{const c=hwCause(x.r&&x.r[i]);if(c.k==="none")return;const th=hwTheme(L[i],it),T=S.th[th]||(S.th[th]={n:0,bad:0});S.n++;T.n++;
        if(c.k==="ok"||c.k==="slow")S.first++;S.c[c.k]=(S.c[c.k]||0)+1;if(hwBad(c.k))T.bad++})}}
  return Object.values(st).map(S=>({nm:S.nm,hw:S.hw,n:S.n,first:S.first,c:S.c,rate:S.n?Math.round(S.first*100/S.n):0,
    weak:Object.entries(S.th).filter(([,T])=>T.bad>0).sort((a,b)=>b[1].bad/b[1].n-a[1].bad/a[1].n||b[1].bad-a[1].bad||(a[0]<b[0]?-1:1)).slice(0,2).map(([k,T])=>({th:k,bad:T.bad,n:T.n}))})).sort((a,b)=>a.rate-b.rate||(a.nm<b.nm?-1:1))}
function hwGradeTab(recs,H,labels){const S=[],by={};for(const x of recs){const nm=x.name||"（沒寫名字）"+x.sig.slice(0,4);if(nm in by)S[by[nm]]={...x,nm};else{by[nm]=S.length;S.push({...x,nm})}}
  const cell=y=>{const[dn,mi,sec,an]=y||[0,0,0,0],c=hwCause(y);if(!dn)return{t:mi?"沒做完（試了 "+mi+" 次）":"沒做",k:"no",s:null,c};if(an)return{t:"看答案",k:"ans",s:sec,c};return{t:"第 "+(mi+1)+" 次答對",k:mi?"late":"first",n:mi+1,s:sec,c}};
  const rows=H.items.map((it,i)=>{const C=S.map(x=>cell(x.r[i])),label=labels&&labels[i]||(it.k==="c"?"殘局 ":"主題題 ")+it.id;return{i,label,th:hwTheme(labels&&labels[i],it),cells:C,first:C.filter(c=>c.k==="first").length,wrong:C.filter(c=>c.k==="late"||c.k==="ans").length,undone:C.filter(c=>c.k==="no").length}});
  const mx=Math.max(0,...rows.map(r=>r.wrong)),worst=mx?rows.filter(r=>r.wrong===mx).map(r=>r.i):[];
  const tot=S.map(x=>({done:x.r.filter(y=>y[0]).length,first:x.r.filter(y=>y[0]&&!y[3]&&!y[1]).length,ans:x.r.filter(y=>y[0]&&y[3]).length,s:x.r.reduce((a,y)=>a+(y[0]?y[2]:0),0)}));
  /* 這份作業的錯因統計（全班）、各主題幾人次沒一次答對 */
  const causes={},thm={};rows.forEach(r=>r.cells.forEach(c=>{if(c.c.k==="none")return;causes[c.c.k]=(causes[c.c.k]||0)+1;const T=thm[r.th]||(thm[r.th]={th:r.th,n:0,bad:0});T.n++;if(hwBad(c.c.k))T.bad++}));
  const themes=Object.values(thm).sort((a,b)=>b.bad/b.n-a.bad/a.n||b.bad-a.bad);
  return{title:H.title||"象棋作業",students:S.map(x=>x.nm),dates:S.map(x=>x.d),rows,worst,tot,causes,themes}}
function hwCsv(T){const q=x=>{let s=String(x==null?"":x);if(/^[=+\-@]/.test(s))s="'"+s;return/[",\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s};
  const L=[["學生","日期","完成題數","第一次就答對","看答案","總用時（秒）",...T.rows.flatMap(r=>["第"+(r.i+1)+"題 "+r.label,"第"+(r.i+1)+"題 用時（秒）","第"+(r.i+1)+"題 錯因"])]];
  T.students.forEach((nm,k)=>{const t=T.tot[k];L.push([nm,T.dates[k],t.done,t.first,t.ans,t.s,...T.rows.flatMap(r=>[r.cells[k].t,r.cells[k].s==null?"":r.cells[k].s,r.cells[k].c?r.cells[k].c.t:""])])});
  L.push(["（沒有一次答對的人數）","","","","","",...T.rows.flatMap(r=>[r.wrong,"",""])],["（沒做的人數）","","","","","",...T.rows.flatMap(r=>[r.undone,"",""])]);
  /* 第 6 輪改善：錯因統計與各主題弱點，接在表格下面（空一行） */
  if(T.causes&&T.themes){L.push([],["錯因","人次","說明"]);for(const[k,t,d]of HW_CAUSE)L.push([t,T.causes[k]||0,d]);L.push([],["主題","沒一次答對（人次）","做過（人次）"]);for(const x of T.themes)L.push([x.th,x.bad,x.n])}
  return"﻿"+L.map(r=>r.map(q).join(",")).join("\r\n")+"\r\n"}
function hwGAll(){const A=store.get("hwGrades",null);return A&&typeof A==="object"?A:{}}
/* 教練：#/hw/grade 貼上學生成績 → 彙整表、匯出 CSV（成績只存在這支手機的 store "hwGrades"，最多 20 份作業）。
   11/11 ChatGPT 介面報告 P1：跟 #/hw 出作業是同一層的兩個分段（hwSegHTML，「出作業｜收成績」用 navReplace 切換，不多一層返回）；返回都回殘局頁 */
function HwGrade(v){setTop("🧑‍🏫 教練作業","#/canju");if(typeof setTabs==="function")setTabs(false);v.className="view";let cur=store.get("hwGCur",""),labels={};
  const css=document.getElementById("hwg-css")||document.head.appendChild(Object.assign(document.createElement("style"),{id:"hwg-css",textContent:`.hw-tw{overflow-x:auto;-webkit-overflow-scrolling:touch}.hw-tab{border-collapse:collapse;font-size:13px;min-width:100%}.hw-tab th,.hw-tab td{border:1px solid var(--line);padding:5px 6px;text-align:center;white-space:nowrap}.hw-tab th:first-child,.hw-tab td:first-child{text-align:left;white-space:normal;min-width:7em;position:sticky;left:0;background:var(--card)}.hw-tab .first{color:var(--accent);font-weight:700}.hw-tab .late{color:#b7791f}.hw-tab .ans{color:var(--red,#b22)}.hw-tab .no{color:var(--muted)}.hw-tab tr.worst td{background:color-mix(in srgb,var(--red,#b22) 10%,var(--card))}.hw-tab small{display:block;color:var(--muted);font-size:11px}`}));
  const paint=()=>{const A=hwGAll(),codes=Object.keys(A).sort((a,b)=>(A[b].at||0)-(A[a].at||0));if(!A[cur])cur=codes[0]||"";
    v.innerHTML=`<div class="hw-wrap">${hwSegHTML("grade")}<div class="card"><b>貼上學生傳來的成績</b><div class="muted" style="font-size:13px;line-height:1.7;margin:4px 0 6px">學生在作業頁按「📋 複製成績」傳給你的整段文字，可以好幾位一起貼。App 會檢查每份的校驗碼（被改過會標出來）；成績只存在這支手機，不會上傳。</div>
        <textarea id="hgT" aria-label="貼上成績" placeholder="🧑‍🏫 作業成績：…&#10;…&#10;XQHW1.……"></textarea><div class="opt" style="margin:8px 0 0"><button class="on" id="hgGo">📥 匯入</button></div><div id="hgM" aria-live="polite"></div></div>
      ${codes.length>1?`<div class="hw-chip">${codes.map(c=>`<button data-c="${esc(c)}" class="${c===cur?"on":""}">${esc(A[c].title||"作業")} <small>${Object.keys(A[c].st||{}).length} 人</small></button>`).join("")}</div>`:""}<div id="hgB"></div></div>`;
    hwSegBind(v,"grade");const ta=v.querySelector("#hgT"),M=v.querySelector("#hgM");
    v.querySelector("#hgGo").onclick=()=>{const R=hwVerify(ta.value);if(!R.ok.length&&!R.bad.length){M.innerHTML='<p class="muted">沒有找到成績。請貼學生「📋 複製成績」的整段文字（最後一行是 XQHW1. 開頭）。</p>';return}
      const A2=hwGAll();for(const x of R.ok){const E=A2[x.code]||(A2[x.code]={title:x.title,st:{}});E.at=Date.now();E.st[x.name||"（沒寫名字）"+x.sig.slice(0,4)]={name:x.name,d:x.d,r:x.r,sig:x.sig};cur=x.code}
      for(const k of Object.keys(A2).sort((a,b)=>(A2[b].at||0)-(A2[a].at||0)).slice(20))delete A2[k];store.set("hwGrades",A2);store.set("hwGCur",cur);paint();
      const M2=v.querySelector("#hgM");M2.innerHTML=(R.ok.length?`<p class="pr-ok" style="color:var(--accent)">✔ 讀到 ${R.ok.length} 份成績</p>`:"")+(R.bad.length?`<ul style="color:var(--red,#b22);font-size:14px;line-height:1.6;padding-left:1.2em;margin:6px 0 0">${R.bad.map(x=>`<li>${x.k?"第 "+x.k+" 份：":""}${esc(x.why)}</li>`).join("")}</ul>`:"")};
    v.querySelectorAll("[data-c]").forEach(x=>x.onclick=()=>{cur=x.dataset.c;store.set("hwGCur",cur);paint()});
    const box=v.querySelector("#hgB");if(!cur){box.innerHTML='<div class="card muted" style="line-height:1.8">還沒有成績。學生做完作業後，請他按「📋 複製成績」把整段傳給你，貼到上面。</div>';return}
    const H=hwDec(cur);if(!H){box.innerHTML='<div class="card muted">這份作業的編號壞掉了。</div>';return}
    const recs=Object.values(A[cur].st||{}),T=hwGradeTab(recs,H,labels[cur]),cls={first:"first",late:"late",ans:"ans",no:"no"};
    box.innerHTML=`<div class="card"><b>🧑‍🏫 ${esc(T.title)}</b><div class="muted" style="font-size:13px">${T.students.length} 位學生・${H.items.length} 題${T.worst.length?"・⚠ 最多人沒一次答對：第 "+T.worst.map(i=>i+1).join("、")+" 題（"+T.rows[T.worst[0]].wrong+" 人）":""}</div>
      <div class="hw-tw" style="margin-top:8px"><table class="hw-tab"><thead><tr><th>題目</th>${T.students.map((n,k)=>`<th>${esc(n)}<small>${esc(T.dates[k])}</small></th>`).join("")}<th>沒一次答對</th></tr></thead><tbody>
        ${T.rows.map(r=>`<tr class="${T.worst.includes(r.i)?"worst":""}"><td>${r.i+1}. ${esc(r.label)}${T.worst.includes(r.i)?" ⚠":""}</td>${r.cells.map(c=>`<td class="${cls[c.k]}">${c.k==="first"?"✅ 一次對":c.k==="late"?"✔ 第 "+c.n+" 次":c.k==="ans"?"👁 看答案":esc(c.t)}${c.s!=null?`<small>${hwTime(c.s*1000)}</small>`:""}${c.c&&(hwBad(c.c.k)||c.c.k==="slow")?`<small>${esc(c.c.t)}</small>`:""}</td>`).join("")}<td><b>${r.wrong}</b>${r.undone?`<small>沒做 ${r.undone}</small>`:""}</td></tr>`).join("")}
        <tr><td>完成</td>${T.tot.map(t=>`<td>${t.done}／${H.items.length}</td>`).join("")}<td></td></tr><tr><td>第一次就答對</td>${T.tot.map(t=>`<td>${t.first}</td>`).join("")}<td></td></tr>
        <tr><td>看答案</td>${T.tot.map(t=>`<td>${t.ans}</td>`).join("")}<td></td></tr><tr><td>總用時</td>${T.tot.map(t=>`<td>${hwTime(t.s*1000)}</td>`).join("")}<td></td></tr></tbody></table></div>
      <div class="opt" style="margin:10px 0 0"><button class="on" id="hgCsv">⬇ 匯出 CSV</button><button id="hgCp">📋 複製 CSV</button><button id="hgDel">🗑 清掉這份</button></div>
      <p class="muted" style="font-size:12px;line-height:1.6;margin:6px 0 0">「沒一次答對」＝第 2 次以後才答對，或看了答案；沒做的另外算。CSV 可以用 Excel、Google 試算表打開。</p></div>
      ${(()=>{const W=hwWeak(A,labels),cs=HW_CAUSE.filter(([k])=>T.causes[k]);   /* 第 6 輪改善：錯因分類＋弱點追蹤（只用學生傳來的成績算，不上傳） */
        return`<div class="card"><b>🔎 錯因與弱點</b>
        <div class="muted" style="font-size:13px;line-height:1.7;margin:4px 0 6px">錯因只看「走錯幾次、用時、有沒有看答案」，不猜學生在想什麼。</div>
        ${cs.length?`<ul style="margin:0 0 8px;padding-left:1.2em;line-height:1.7;font-size:14px">${cs.map(([k,t,d])=>`<li><b>${esc(t)}</b> ${T.causes[k]} 人次<small class="muted" style="display:block;font-size:12px">${esc(d)}</small></li>`).join("")}</ul>`:'<p class="muted" style="font-size:14px">這份作業大家都一次就對。</p>'}
        ${T.themes.some(x=>x.bad)?`<div style="font-size:14px;margin:4px 0"><b>這份作業最弱的主題</b>：${T.themes.filter(x=>x.bad).slice(0,3).map(x=>esc(x.th)+" "+x.bad+"／"+x.n+" 人次").join("、")}</div>`:""}
        ${W.length?`<div style="font-size:14px;margin:10px 0 4px"><b>📈 每位學生的弱點（這支手機收過的 ${Object.keys(A).length} 份作業合計）</b></div>
        <div class="hw-tw"><table class="hw-tab"><thead><tr><th>學生</th><th>作業</th><th>題數</th><th>一次就對</th><th>最弱的主題</th></tr></thead><tbody>
        ${W.map(w=>`<tr><td>${esc(w.nm)}</td><td>${w.hw}</td><td>${w.n}</td><td>${w.rate}%</td><td style="white-space:normal;text-align:left">${w.weak.length?w.weak.map(x=>esc(x.th)+"（錯 "+x.bad+"／"+x.n+"）").join("、"):"—"}</td></tr>`).join("")}</tbody></table></div>`:""}</div>`})()}`;
    const csv=()=>hwCsv(T),fn="作業成績_"+(T.title||"作業");
    box.querySelector("#hgCsv").onclick=()=>pgnOut(csv(),fn,"csv","file");box.querySelector("#hgCp").onclick=()=>pgnOut(csv().replace(/^﻿/,""),fn,"csv","copy");
    box.querySelector("#hgDel").onclick=()=>confirmBox("清掉這份作業在這支手機上的所有學生成績？",()=>{const A3=hwGAll();delete A3[cur];store.set("hwGrades",A3);cur="";paint()},"清掉");
    if(!labels[cur]){const c0=cur;hwLabels(H).then(L=>{labels[c0]=L;if(v.isConnected&&location.hash==="#/hw/grade"&&cur===c0)paint()}).catch(()=>{labels[c0]=null})}
    else{const miss=codes.filter(c=>!(c in labels));if(miss.length)Promise.all(miss.map(c=>{const H2=hwDec(c);return H2?hwLabels(H2).then(L=>{labels[c]=L}).catch(()=>{labels[c]=null}):(labels[c]=null)})).then(()=>{if(v.isConnected&&location.hash==="#/hw/grade")paint()})}};   /* 弱點追蹤要每份作業的題目主題 */
  paint();return{}}
