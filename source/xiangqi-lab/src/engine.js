// 網頁版 Pikafish：在手機瀏覽器裡跑（WebAssembly 多執行緒＋SIMD），不需要電腦也不需要網路
// 搜尋的指令與結果格式跟電腦版 xiangqi-referee.js 的 engine().search() 完全一樣
"use strict";
var XQEngine=(function(){
  const BASE=new URL("./",location.href).href;
  let mod=null,loading=null,waiters=[],q=Promise.resolve(),progress=null;
  const send=c=>mod.ccall("uci_command",null,["string"],[c]);
  function onLine(l){for(const w of waiters.slice())w(l)}
  const until=(pred,onEach)=>new Promise(res=>{const w=l=>{if(onEach)onEach(l);if(pred(l)){waiters=waiters.filter(x=>x!==w);res(l)}};waiters.push(w)});
  /* 開發者 11/12 iPhone 截圖「思考有點久」（星門新手局一直「思考中…」）：引擎沒回 bestmove 時（iOS 把 App 切到背景會停掉引擎的執行緒），
     原本會永遠等，後面所有搜尋也排在它後面卡住，只能重開 App。改成有時限：超時先送 stop 要它交出目前最好的一步，再沒回應就重置引擎、拋錯，
     local.js 的 playEngine 隔幾秒自動重試，重試時重新啟動引擎。TMO 給測試縮短時間用 */
  let TMO=1;
  const untilT=(pred,onEach,ms)=>new Promise((res,rej)=>{const w=l=>{if(onEach)onEach(l);if(pred(l)){clearTimeout(tm);waiters=waiters.filter(x=>x!==w);res(l)}};
    const tm=setTimeout(()=>{waiters=waiters.filter(x=>x!==w);rej(new Error("逾時"))},ms*TMO);waiters.push(w)});
  function reset(){try{if(mod&&mod.PThread&&mod.PThread.terminateAllThreads)mod.PThread.terminateAllThreads()}catch(e){}mod=null;loading=null;waiters=[]}
  // 下載神經網路檔，回報進度（第一次約 48 MB，之後由 service worker 從手機快取拿）
  // 斷線會自動重試 3 次；下載完整後自己存進手機快取（service worker 下次直接從快取拿）
  async function fetchNnue(url){
    try{const c=await caches.open("xqlab-engine"),hit=await c.match(url);if(hit)return new Uint8Array(await hit.arrayBuffer())}catch(e){}
    let last=null;
    for(let i=1;i<=3;i++){try{const bytes=await fetchBytes(url);
        try{const c=await caches.open("xqlab-engine");await c.put(url,new Response(bytes,{headers:{"content-type":"application/octet-stream","content-length":String(bytes.length)}}))}catch(e){}
        return bytes}catch(e){last=e;await new Promise(r=>setTimeout(r,1500*i))}}
    throw new Error("Pikafish 引擎下載失敗（"+(last&&last.message)+"），請確認網路後再試一次")}
  /* 11/13 晚開發者「iPad 卡在第一盤棋，對方一直思考中」：下載卡住（沒有錯誤、也不再收到資料）時原本會永遠等；
     現在 30 秒收不到新資料（沒有長度、只能整包收時給 120 秒）就中斷，交給 fetchNnue 重試 */
  async function fetchBytes(url){
    const ac=typeof AbortController!=="undefined"?new AbortController():null;let wd=null;const kick=ms=>{if(!ac)return;clearTimeout(wd);wd=setTimeout(()=>{try{ac.abort()}catch(e){}},ms*TMO)};
    try{kick(30000);const r=await fetch(url,ac?{cache:"no-store",signal:ac.signal}:{cache:"no-store"});if(!r.ok)throw new Error("下載失敗："+url+"（"+r.status+"）");
      const total=+r.headers.get("content-length")||0;
      if(!r.body||!total){kick(120000);return new Uint8Array(await r.arrayBuffer())}
      const reader=r.body.getReader(),chunks=[];let got=0;
      for(;;){kick(30000);const{done,value}=await reader.read();if(done)break;chunks.push(value);got+=value.length;if(progress)progress(got,total)}
      const out=new Uint8Array(got);let o=0;for(const c of chunks){out.set(c,o);o+=c.length}return out}
    finally{clearTimeout(wd)}}
  function loadScript(src){return new Promise((res,rej)=>{const s=document.createElement("script");s.src=src;s.onload=res;s.onerror=()=>rej(new Error("載入失敗："+src));document.head.append(s)})}
  // 只下載神經網路檔存進手機（App 打開後自動在背景做），同時呼叫只會下載一次
  let nnueP=null;
  function prefetch(){return nnueP||(nnueP=fetchNnue(BASE+"engine/pikafish.nnue").finally(()=>setTimeout(()=>{nnueP=null},0)))}
  let LG=0;   /* 11/13 晚：啟動的編號；abort 之後舊的那次啟動晚到（成功或逾時）都不准動到新的引擎 */
  function load(){
    if(loading)return loading;const my=++LG;
    loading=(async()=>{
      if(!self.crossOriginIsolated)throw new Error("瀏覽器還沒開啟多執行緒模式，請把 App 關掉重開一次");
      const nnue=await prefetch();
      if(!window.PikafishModule)await loadScript(BASE+"engine/pikafish.js");
      /* 11/13 晚：啟動引擎、等 uciok／readyok 原本沒有時限，iPad 卡在這裡就永遠「思考中」；改成各有時限，逾時重置、拋錯讓 local.js 重試 */
      const m=await Promise.race([window.PikafishModule({locateFile:f=>BASE+"engine/"+f,mainScriptUrlOrBlob:BASE+"engine/pikafish.js",
        print:onLine,printErr:()=>{},preRun:[m=>m.FS.writeFile("/pikafish.nnue",nnue)]}),new Promise((_,j)=>setTimeout(()=>j(new Error("電腦棋手啟動太久")),45000*TMO))]);
      if(my!==LG)throw new Error("電腦棋手已重新啟動");mod=m;
      send("uci");await untilT(l=>l==="uciok",null,20000);
      const th=Math.max(1,Math.min(4,(navigator.hardwareConcurrency||2)-1));
      send("setoption name Threads value "+th);send("setoption name Hash value 64");
      send("isready");await untilT(l=>l==="readyok",null,20000);
      XQEngine.threads=th})();
    const L=loading;L.catch(()=>{if(my===LG&&loading===L)reset()});return L}
  /* 11/13 晚：整個重來（local.js 等太久時叫）：停掉引擎、清掉卡住的排隊，下次搜尋重新啟動 */
  function abort(){LG++;reset();q=Promise.resolve();nnueP=null}
  // pos：{moves:[ICCS…]}（從開局起算）或 {fen:"<棋盤> w|b"}；lim：{movetime} 或 {depth}
  function search(pos,lim,multipv){
    const job=async()=>{await load();
      send("setoption name MultiPV value "+(multipv||1));
      send("position fen "+(pos.fen?pos.fen:XQCore.START+" w")+" - - 0 1"+(pos.moves&&pos.moves.length?" moves "+pos.moves.join(" "):""));   /* 11/13：fen 也可以接 moves（章回棋路從殘局開始的盤＝起始局面＋走過的步；以前帶 fen 就不接 moves） */
      const info=new Map();
      send((lim.nodes?"go nodes "+lim.nodes:lim.movetime?"go movetime "+lim.movetime:"go depth "+lim.depth)+(lim.searchmoves&&lim.searchmoves.length?" searchmoves "+lim.searchmoves.join(" "):""));   /* searchmoves：黑洞陣地塔防被定身的子不走（m/07bht-td.js） */   /* nodes：笑面掌櫃「掌櫃真功夫」檔位（訓練循環校準的每步節點數，開發者 11/12） */
      const each=l=>{if(!l.startsWith("info ")||!l.includes(" pv "))return;
        const m=l.match(/ multipv (\d+)/),sc=l.match(/ score (cp|mate) (-?\d+)/),pv=l.match(/ pv (.+)$/),dp=l.match(/ depth (\d+)/);if(!sc||!pv)return;
        let v=+sc[2];if(sc[1]==="mate")v=v>0?30000-v:-30000-v;
        const pvs=pv[1].trim().split(/\s+/);
        info.set(m?+m[1]:1,{k:m?+m[1]:1,v,mv:pvs[0],pv:pvs,depth:dp?+dp[1]:null,mate:sc[1]==="mate"?+sc[2]:null})};
      const isBest=l=>l.startsWith("bestmove");let best;
      try{best=await untilT(isBest,each,lim.movetime?lim.movetime+8000:20000)}
      catch(e){try{send("stop");best=await untilT(isBest,each,3000)}catch(e2){reset();throw new Error("電腦棋手沒有回應，正在重新啟動（幾秒後自動再想一次）")}}
      /* ChatGPT 數值盤查 11/11 P1 引擎空結果：lines 只收「帶 PV 的 info 行」，時間太短或手機太忙時可能一條都沒有（只回 bestmove）。
         多回 nopv＝true 明講「這次沒有評分」，core.js 的 classifyRaw 看到空的 lines 會重查一次、還是空就丟可重試的錯誤，不再拿最佳著的分數頂替成「正著、loss＝0」 */
      return{best:best.split(/\s+/)[1],lines:[...info.values()].sort((a,b)=>a.k-b.k),nopv:!info.size}};
    const r=q.then(job);q=r.catch(()=>{});return r}
  return{load,prefetch,search,abort,get ready(){return!!mod},onProgress(f){progress=f},threads:0,_tmo(x){TMO=x}};
})();
