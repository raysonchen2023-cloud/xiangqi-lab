// 網頁版 Pikafish：在手機瀏覽器裡跑（WebAssembly 多執行緒＋SIMD），不需要電腦也不需要網路
// 搜尋的指令與結果格式跟電腦版 xiangqi-referee.js 的 engine().search() 完全一樣
"use strict";
var XQEngine=(function(){
  const BASE=new URL("./",location.href).href;
  let mod=null,loading=null,waiters=[],q=Promise.resolve(),progress=null;
  const send=c=>mod.ccall("uci_command",null,["string"],[c]);
  function onLine(l){for(const w of waiters.slice())w(l)}
  const until=(pred,onEach)=>new Promise(res=>{const w=l=>{if(onEach)onEach(l);if(pred(l)){waiters=waiters.filter(x=>x!==w);res(l)}};waiters.push(w)});
  // 下載神經網路檔，回報進度（第一次約 48 MB，之後由 service worker 從手機快取拿）
  // 斷線會自動重試 3 次；下載完整後自己存進手機快取（service worker 下次直接從快取拿）
  async function fetchNnue(url){
    try{const c=await caches.open("xqlab-engine"),hit=await c.match(url);if(hit)return new Uint8Array(await hit.arrayBuffer())}catch(e){}
    let last=null;
    for(let i=1;i<=3;i++){try{const bytes=await fetchBytes(url);
        try{const c=await caches.open("xqlab-engine");await c.put(url,new Response(bytes,{headers:{"content-type":"application/octet-stream","content-length":String(bytes.length)}}))}catch(e){}
        return bytes}catch(e){last=e;await new Promise(r=>setTimeout(r,1500*i))}}
    throw new Error("Pikafish 引擎下載失敗（"+(last&&last.message)+"），請確認網路後再試一次")}
  async function fetchBytes(url){
    const r=await fetch(url,{cache:"no-store"});if(!r.ok)throw new Error("下載失敗："+url+"（"+r.status+"）");
    const total=+r.headers.get("content-length")||0;
    if(!r.body||!total)return new Uint8Array(await r.arrayBuffer());
    const reader=r.body.getReader(),chunks=[];let got=0;
    for(;;){const{done,value}=await reader.read();if(done)break;chunks.push(value);got+=value.length;if(progress)progress(got,total)}
    const out=new Uint8Array(got);let o=0;for(const c of chunks){out.set(c,o);o+=c.length}return out}
  function loadScript(src){return new Promise((res,rej)=>{const s=document.createElement("script");s.src=src;s.onload=res;s.onerror=()=>rej(new Error("載入失敗："+src));document.head.append(s)})}
  function load(){
    if(loading)return loading;
    loading=(async()=>{
      if(!self.crossOriginIsolated)throw new Error("瀏覽器還沒開啟多執行緒模式，請把 App 關掉重開一次");
      const nnue=await fetchNnue(BASE+"engine/pikafish.nnue");
      if(!window.PikafishModule)await loadScript(BASE+"engine/pikafish.js");
      mod=await window.PikafishModule({locateFile:f=>BASE+"engine/"+f,mainScriptUrlOrBlob:BASE+"engine/pikafish.js",
        print:onLine,printErr:()=>{},preRun:[m=>m.FS.writeFile("/pikafish.nnue",nnue)]});
      send("uci");await until(l=>l==="uciok");
      const th=Math.max(1,Math.min(4,(navigator.hardwareConcurrency||2)-1));
      send("setoption name Threads value "+th);send("setoption name Hash value 64");
      send("isready");await until(l=>l==="readyok");
      XQEngine.threads=th})();
    loading.catch(()=>{loading=null});return loading}
  // pos：{moves:[ICCS…]}（從開局起算）或 {fen:"<棋盤> w|b"}；lim：{movetime} 或 {depth}
  function search(pos,lim,multipv){
    const job=async()=>{await load();
      send("setoption name MultiPV value "+(multipv||1));
      send(pos.fen?"position fen "+pos.fen+" - - 0 1":"position fen "+XQCore.START+" w - - 0 1"+(pos.moves.length?" moves "+pos.moves.join(" "):""));
      const info=new Map();
      send(lim.movetime?"go movetime "+lim.movetime:"go depth "+lim.depth);
      const best=await until(l=>l.startsWith("bestmove"),l=>{if(!l.startsWith("info ")||!l.includes(" pv "))return;
        const m=l.match(/ multipv (\d+)/),sc=l.match(/ score (cp|mate) (-?\d+)/),pv=l.match(/ pv (.+)$/),dp=l.match(/ depth (\d+)/);if(!sc||!pv)return;
        let v=+sc[2];if(sc[1]==="mate")v=v>0?30000-v:-30000-v;
        const pvs=pv[1].trim().split(/\s+/);
        info.set(m?+m[1]:1,{k:m?+m[1]:1,v,mv:pvs[0],pv:pvs,depth:dp?+dp[1]:null,mate:sc[1]==="mate"?+sc[2]:null})});
      return{best:best.split(/\s+/)[1],lines:[...info.values()].sort((a,b)=>a.k-b.k)}};
    const r=q.then(job);q=r.catch(()=>{});return r}
  return{load,search,get ready(){return!!mod},onProgress(f){progress=f},threads:0};
})();
