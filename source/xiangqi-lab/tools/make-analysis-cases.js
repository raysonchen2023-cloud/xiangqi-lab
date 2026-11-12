#!/usr/bin/env node
// 評比循環第 2 輪（ChatGPT：擴充分析一致性回歸案例庫）：產生 tools/analysis-cases.json。
//   每個案例＝一個真實局面（開局、大師對局中局、殘局殺法題；黑方的殺棋題用紅黑對調的殘局題）＋實際走的一步，
//   用本機 Pikafish 固定深度跑一次 App 真正的 core.js classifyRaw（同一套評等、loss、ev、bv、bmt、pmt、rr），把結果存成快照；
//   之後 tools/test-analysis-cases.js 只讀這個檔，不用再開引擎。
// 用法：node tools/make-analysis-cases.js [--depth 14]
//   要 xiangqi-db/engine/Pikafish-Windows-x86-64-universal.exe（xiangqi-db/tools/levels/engine.js 開引擎）。重跑會覆蓋快照，記得再跑測試、看 analysis-cases.snap.md 的差異。
"use strict";
const fs=require("fs"),path=require("path");
const LAB=path.join(__dirname,".."),DB=path.join(LAB,"../xiangqi-db");
const C=require(path.join(LAB,"site/core.js")),E=require(path.join(DB,"tools/levels/engine.js"));
const argv=process.argv.slice(2),di=argv.indexOf("--depth"),DEPTH=di>=0?+argv[di+1]:14;
const OUT=path.join(__dirname,"analysis-cases.json");
const sq=C.parseSq,mv=u=>[sq(u.slice(0,2)),sq(u.slice(2,4))];
/* 紅黑對調（盤面轉 180 度、大小寫互換）：殘局殺法題幾乎都是紅先，黑方的殺棋案例用對調後的同一題 */
const flip=b=>{const n=Array(90).fill(null);for(let i=0;i<90;i++){const p=b[i];if(p)n[89-i]=p===p.toUpperCase()?p.toLowerCase():p.toUpperCase()}return n};
let CANJU=null,GM=null;
/* from：o＝從開局走的 ICCS 串；cj＝殘局題代號（fl＝紅黑對調）；gm＝大師對局（data/gmgames.json 第幾盤、走到第幾步之前） */
function where(c){
  if(c.o){let b=C.parseFen(C.START);for(const u of c.o){const[f,t]=mv(u);b=C.make(b,f,t)}return{b,s:c.o.length%2?"b":"r",ply:c.o.length+1,lt:c.o.length?mv(c.o[c.o.length-1])[1]:null,src:c.o.length?"開局："+cnLine(c.o):"開局第一步"}}
  if(c.cj){CANJU=CANJU||JSON.parse(fs.readFileSync(path.join(LAB,"site/data/canju/canju-set.json"),"utf8")).items;const it=CANJU.find(x=>x.id===c.cj);if(!it)throw Error("找不到殘局題 "+c.cj);
    let b=C.parseFen(it.fen.split(" ")[0]),s=it.side||"r";if(c.fl){b=flip(b);s=s==="r"?"b":"r"}
    return{b,s,ply:s==="r"?1:2,lt:null,src:`殘局題 ${it.id}（${it.t}${it.kill?"・"+it.kill:""}${it.src&&it.src.book?"・"+it.src.book:""}）${c.fl?"，紅黑對調成黑方走":""}`}}
  if(c.gm!=null){GM=GM||JSON.parse(fs.readFileSync(path.join(LAB,"site/data/gmgames.json"),"utf8")).items;const g=GM[c.gm],ms=g.lines[0].moves.slice(0,c.ply-1);let b=C.parseFen(C.START);for(const[f,t]of ms)b=C.make(b,f,t);
    return{b,s:(c.ply-1)%2?"b":"r",ply:c.ply,lt:ms.length?ms[ms.length-1][1]:null,src:`大師對局：${g.year} 年 ${g.red} 對 ${g.black}（${g.event||""}）第 ${c.ply} 步之前`}}   /* 用 year 不用 date：gmgames.json 有的 date 打錯（余貴燊對胡榮華寫成 1876.6.23） */
  throw Error("案例沒有局面 "+c.id)}
function cnLine(us){let b=C.parseFen(C.START);const out=[];us.forEach((u,i)=>{const[f,t]=mv(u);out.push((i%2?"":(i/2+1)+". ")+C.notate(b,f,t));b=C.make(b,f,t)});return out.join(" ")}
/* 案例清單。want＝挑這個案例想涵蓋的情況（測試會檢查真的有涵蓋到）；note＝人寫的局面背景 */
const CASES=[
  {id:"r01",o:[],u:"h2e2",want:["正著","開局","均勢"],note:"開局第一步走中炮，最常見的開局。"},
  {id:"r02",o:[],u:"f0e1",want:["穩著","開局","均勢"],note:"開局第一步補仕，不急的走法，比中炮略慢一點。"},
  {id:"r03",o:[],u:"e3e4",want:["緩著","開局"],note:"開局第一步就挺中兵，太早衝中兵。"},
  {id:"r04",o:[],u:"h2h9",want:["失著","吃子後被吃回","開局"],note:"開局第一步炮打馬：吃得到馬，但對方的車馬上吃回炮。"},
  {id:"r05",o:["h2e2","h7h5"],u:"e2e6",want:["妙著","開局","明顯好"],note:"對方砲8進2 離開了中卒的保護線，炮五進四白吃中卒。"},
  {id:"r06",o:["h2e2","h7h5"],u:"h0g2",want:["失著","錯過白吃","開局"],note:"同一個局面不吃中卒、改跳馬（AI 模擬玩家第二輪問過的那一步）。"},
  {id:"r07",o:["h0g2","b7e7"],u:"i0h0",want:["敗著","可吃回但虧","開局"],note:"俥一平二送到砲口：傌吃得回砲，但俥換砲還是虧。"},
  {id:"r08",o:["h0g2","b7e7"],u:"b2b7",want:["敗著","白送","開局"],note:"炮八進五走到對方砲口，沒有子保護，吃不回來。"},
  {id:"r09",gm:1200,ply:25,u:"b0b2",want:["緩著","明顯好"],note:"大師對局中局，紅方已經領先，這步俥八進二慢了一點。"},
  {id:"r10",gm:1200,ply:25,u:"h4i4",want:["失著","明顯好","評等和局面不同方向"],note:"同一個局面走炮二平一：這步是失著，但走完紅方還是領先——評等和局面是兩件事。"},
  {id:"r11",gm:400,ply:25,u:"f4g6",want:["穩著","吃子","稍好"],note:"大師對局中局，傌四進三吃卒，比最好的走法差一點。"},
  {id:"r12",gm:50,ply:25,u:"c4c9",want:["敗著","將軍被化解","白送"],note:"大師對局中局，俥七進五將軍，但對方車吃俥就化解了。"},
  {id:"r13",gm:3,ply:25,u:"d4d9",want:["敗著","將軍被化解","吃子後被吃回"],note:"大師對局中局，俥六進五吃士將軍，對方馬吃俥，俥換士大虧。"},
  {id:"r14",cj:"lk156",u:"g8g9",want:["正著","殺棋分數","有殺"],note:"殘局殺法題（馬後炮），俥三進一將軍，兩步殺。"},
  {id:"r15",cj:"lk156",u:"g8d8",want:["敗著","錯過殺棋","將軍被化解"],note:"同一題走俥三平六將軍，對方將4平5就躲掉，殺棋沒了。"},
  {id:"r16",cj:"lk156",u:"g8g7",want:["敗著","錯過殺棋","走進殺棋"],note:"同一題不將軍、俥三退一，反而讓對方一步殺。"},
  {id:"r17",cj:"jc002",u:"i8i9",want:["敗著","走進殺棋"],note:"殘局題（一步定勝負），本來局面差不多，兵一進一讓對方雙車連將殺。"},
  {id:"r18",cj:"lk084",u:"b0b8",want:["正著","殺棋分數","有殺"],note:"殘局殺法題（車殺），俥八進八也是殺棋，只是比最快的殺法多兩步，仍算正著。"},
  {id:"b01",o:["h2e2"],u:"h9g7",want:["正著","開局","均勢"],note:"對中炮跳屏風馬，最常見的應法。"},
  {id:"b02",o:["h2e2"],u:"f9e8",want:["穩著","開局"],note:"對中炮先補士，比跳馬慢一點。"},
  {id:"b03",o:["h2e2"],u:"b7b6",want:["緩著","開局"],note:"對中炮砲2進1，慢了。"},
  {id:"b04",o:["h2e2"],u:"c6c5",want:["失著","開局"],note:"對中炮挺3卒，讓紅炮五進四打中卒。"},
  {id:"b05",o:["h2e2"],u:"e6e5",want:["敗著","開局"],note:"對中炮挺中卒，中卒被炮打掉。"},
  {id:"b06",o:["h2e2"],u:"h7h2",want:["敗著","白送","開局"],note:"砲8進5 走到紅炮的砲口，吃不回來。"},
  {id:"b07",o:["c3c4","h7e7","b2a2"],u:"h9g7",want:["失著","錯過白吃","開局"],note:"紅方沒保護中兵，黑方不吃、改跳馬。"},
  {id:"b08",o:["c3c4","h7e7","b2a2"],u:"e7e3",want:["妙著","吃子","明顯好"],note:"同一個局面砲5進4吃中兵，紅方吃不回來，而且其他走法都差很多。"},
  {id:"b09",o:["b2e2","h9g7","h0g2"],u:"i9h9",want:["敗著","可吃回但虧","開局"],note:"車9平8 走到紅炮口：馬吃得回炮，但車換炮還是虧。"},
  {id:"b10",gm:3,ply:36,u:"h7h2",want:["緩著","錯過白吃","大占上風"],note:"大師對局中局，黑方已經大優，車8進5 沒吃馬口的相；這步不算錯，走完還是大占上風。"},
  {id:"b11",gm:3,ply:36,u:"h7h6",want:["敗著","白送"],note:"同一個局面車8進1 走到紅俥口，吃不回來。"},
  {id:"b12",gm:50,ply:36,u:"e6e5",want:["失著","沒處理被捉的子"],note:"大師對局中局，馬已經被炮捉，這步沒逃也沒保護。"},
  {id:"b13",cj:"lk156",fl:1,u:"c1c0",want:["正著","殺棋分數","有殺"],note:"殘局殺法題（紅黑對調），車3進1 將軍，兩步殺。"},
  {id:"b14",cj:"lk156",fl:1,u:"c1f1",want:["敗著","錯過殺棋","將軍被化解"],note:"同一題走車3平6將軍，被帥四平五躲掉。"},
  {id:"b15",cj:"jc002",fl:1,u:"b7b0",want:["妙著","將軍"],note:"殘局題（紅黑對調），只有車2進7將軍能保住局面。"},
  {id:"b16",cj:"jc002",fl:1,u:"b7b6",want:["敗著","走進殺棋"],note:"同一題車2進1，讓對方雙俥連將殺。"}];
global.evalPos=null;
(async()=>{
  const eng=await E.open({threads:1}),memo=new Map();
  /* core.js 的 classifyRaw 要外部提供 evalPos(盤面, 走方, 毫秒, MultiPV)：這裡改成固定深度、單執行緒、每次搜尋前清空雜湊表（ucinewgame），同一個局面每次跑結果一樣；App 是手機上 0.4 秒 */
  global.evalPos=async(b,s,ms,mpv)=>{if(!C.legal(b,s).length)return{lines:[],dead:true};const k=C.fen(b,s)+"|"+(mpv||1);if(memo.has(k))return memo.get(k);
    eng.send("ucinewgame");const r=await eng.analyse(C.fen(b,s),s,{depth:DEPTH,multipv:mpv||1}),o={lines:r.lines,best:r.best};memo.set(k,o);return o};
  const out=[];
  for(const c of CASES){const P=where(c),u=c.u,[f,t]=mv(u);   /* 紅黑對調的題目，u 已經是對調後盤面上的著法 */
    if(!P.b[f]||C.sideOf(P.b[f])!==P.s||!C.legal(P.b,P.s).some(([x,y])=>x===f&&y===t))throw Error(c.id+"：著法 "+u+" 不合法");
    const r=await C.classifyRaw(P.b,P.s,f,t,undefined,P.lt==null?undefined:P.lt);
    const g={q:r.q,loss:r.loss,gap:r.gap,ev:r.ev,bv:r.bv,bmt:r.bmt,pmt:r.pmt,rr:r.rr,bc:r.bc,bm:r.bm,bp:r.bp};
    out.push({id:c.id,by:P.s,ply:P.ply,fen:C.fen(P.b,P.s),mv:u,cn:C.notate(P.b,f,t),lt:P.lt,src:P.src,want:c.want,note:c.note,g});
    console.log(c.id,C.notate(P.b,f,t),g.q,"loss",g.loss,"ev",g.ev,"bmt",g.bmt,"pmt",g.pmt,g.rr?"rr "+g.rr.c:"")}
  fs.writeFileSync(OUT,JSON.stringify({made:new Date().toISOString().slice(0,10),engine:"Pikafish（xiangqi-db/engine）",depth:DEPTH,
    note:"g＝core.js classifyRaw 的回傳（q 評等、loss 比最佳少幾分、gap 跟第二好差幾分、ev 走完紅方視角分數、bv 最佳著原值、bmt／pmt 殺棋步數（走方視角）、rr 對方最佳回應、bc／bm 建議著）；固定深度跑一次的快照，測試不再開引擎",
    cases:out},null,1)+"\n");
  console.log("寫好",OUT,out.length,"個案例");eng.close();process.exit(0)})().catch(e=>{console.error(e);process.exit(1)});
