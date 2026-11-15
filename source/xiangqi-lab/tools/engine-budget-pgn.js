#!/usr/bin/env node
/* 引擎分析預算敏感度：用 App 匯出的 PGN（帶賽後評語）重做一次，並多比一項「手機當時評出的評語 vs 電腦上重評」。EBP_VER 1。
   只在電腦上離線跑：不改 App、不開瀏覽器、不呼叫任何 AI API、不新增任何資料收集。前一支是 tools/engine-budget-check.js（大師對局庫版），
   這支沿用它的引擎載入、節點數預算、classifyRaw、gameReport／mxShadowReport 與 compare，只把棋局換成 PGN。
   PGN＝App 的「📤 匯出」（m/10d-coach.js pgnBuild，勾「帶評語」）：[Format "ICCS"]、著法寫成 H2-E2、每一步後面的 {評語} 是手機當時賽後評等的結果
     （pgnNote：評等；不是正著、妙著才附「Pikafish 建議 X」；少掉 0.3～20 個兵才附「差約 N 兵」；「走完後……」是走完的局面評估）。起始局面不是標準開局才有 [FEN]。
   這支檔會跟原始碼一起公開，所以裡面不放任何真實對局；棋譜檔與逐盤結果（含棋步）請放在不公開的資料夾（--pgn、--out 由使用的人指定）。
   它回答的還是「分析可靠不可靠」，不回答「分數有沒有量到棋力」；「手機像哪一檔」只是拿評語去比哪一檔最接近，不是量到手機真的算了幾個節點
     （手機是 1～4 條執行緒、雜湊表會留著、同一個局面的評等有快取；這裡是單執行緒、每次清雜湊表）。
   用法：
     node xiangqi-lab/tools/engine-budget-pgn.js --stat --pgn 檔.pgn                     只統計：幾盤、幾步、評語字樣、對手類型（不印棋步）
     node xiangqi-lab/tools/engine-budget-pgn.js --run --pgn 檔.pgn --out 資料夾 --app 節點數 [--part 1/2] [--max-min 9] [--tiers quarter,app,high]
         每盤存一個 g###.json（做過的檔位跳過；超過 --max-min 分鐘就把做到哪一手存成 p###.json 然後停，下次接著做）。同一個資料夾之後可以再加檔位。
         --tiers 認得：sixteenth（app÷16）、quarter、app、high、x16（app×16）——每次搜尋前清雜湊表，只差節點數；
                      sixteenthTT、quarterTT、appTT、highTT——對照檔：節點數＝app÷16、app÷4、app、app×4，但搜尋之間不清雜湊表（每盤開始清一次，像 App 那樣留著）。
     node xiangqi-lab/tools/engine-budget-pgn.js --report 資料夾 [--md 檔.md] [--json 檔.json] [--me 名字] [--boot 2000] [--tiers 只用這幾檔出報表]
         --me＝匯出棋譜的人在 [Red]／[Black] 的名字（不給就取出現在最多盤的那個名字）；--boot＝以盤為單位重抽的次數（算區間用，固定種子）。 */
"use strict";
const fs=require("fs"),path=require("path"),vm=require("vm"),crypto=require("crypto");
const ROOT=path.join(__dirname,"..",".."),LAB=path.join(ROOT,"xiangqi-lab"),DBD=path.join(ROOT,"xiangqi-db");
const C=require(path.join(LAB,"site","core.js")),X=require(path.join(__dirname,"engine-budget-check.js"));
/* 檔位：TIERX＝每次搜尋前清雜湊表、只差節點數（跟 engine-budget-check.js 同一套；多了 sixteenth 與 x16）；
   KEEPX＝對照檔：節點數是 app 的幾倍、但搜尋之間「不清」雜湊表（每盤開始清一次、照對局順序評）——App 實際上就是留著的，用來看「留雜湊表」會讓結果往哪邊靠 */
const EBP_VER=1,TIERX={sixteenth:1/16,quarter:.25,app:1,high:4,x16:16},KEEPX={sixteenthTT:1/16,quarterTT:.25,appTT:1,highTT:4},ORDER=["sixteenth","quarter","app","high","x16","sixteenthTT","quarterTT","appTT","highTT"],MULT=t=>t in KEEPX?KEEPX[t]:TIERX[t],QS=["妙著","正著","穩著","緩著","失著","敗著"],BOOT_SEED=20261115;
const qt=(a,p)=>{if(!a.length)return null;const s=a.slice().sort((x,y)=>x-y),h=(s.length-1)*p,i=Math.floor(h);return s[i]+(h-i)*(s[Math.min(s.length-1,i+1)]-s[i])};
const r1=v=>v==null?null:Math.round(v*10)/10,r2=v=>v==null?null:Math.round(v*100)/100,mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null,pct=(k,n)=>n?r1(100*k/n):null;
const shaS=s=>crypto.createHash("sha256").update(s,"utf8").digest("hex");
/* ---------- 讀 PGN（只認 App 匯出的這種：ICCS 著法、{評語}、( 變著 ) 跳過） ---------- */
function pgnUnq(s){return s.replace(/\\(["\\])/g,"$1")}
function parsePgn(text){
  const T=String(text||"").replace(/^\uFEFF/,"").replace(/\r\n?/g,"\n"),games=[];let cur=null,body=[];
  const flush=()=>{if(cur){cur.body=body.join(" ");games.push(cur)}cur=null;body=[]};
  for(const line of T.split("\n")){const m=/^\s*\[([A-Za-z0-9_]+)\s+"((?:[^"\\]|\\.)*)"\]\s*$/.exec(line);
    if(m&&!(cur&&body.length&&/\{[^}]*$/.test(body.join(" ")))){if(m[1]==="Game"||(cur&&body.length)){flush()}if(!cur)cur={tags:{}};cur.tags[m[1]]=pgnUnq(m[2])}
    else if(line.trim()){if(!cur)cur={tags:{}};body.push(line.trim())}}
  flush();return games.map((g,i)=>readGame(g,i))}
/* 一盤：著法文字 → [{f,t,u:"h2e2",c:"評語原文"}]；不合規則的著法＝這盤記 err（之後的著法不收） */
function readGame(g,i){const tags=g.tags,out={i,tags,event:tags.Event||"",red:tags.Red||"",black:tags.Black||"",res:tags.Result||"*",fen:tags.FEN||null,moves:[],err:null};
  let b,s;try{if(out.fen){const p=out.fen.trim().split(/\s+/);b=C.parseFen(p[0]);s=p[1]==="b"?"b":"r";if(b.length!==90||C.kingSq(b,"r")<0||C.kingSq(b,"b")<0)throw new Error("FEN 不完整")}else{b=C.parseFen(C.START);s="r"}}catch(e){out.err="FEN 讀不懂";return out}
  out.start=b.slice();out.startTurn=s;out.std=!out.fen||(s==="r"&&out.fen.trim().split(/\s+/)[0]===C.START);
  const S=g.body||"",re=/\{([^}]*)\}|(\()|(\))|([A-Ia-i]\d)-?([A-Ia-i]\d)|(1-0|0-1|1\/2-1\/2|\*)|\d+\.(?:\.\.)?|\S+/g;let m,depth=0,last=null;
  while((m=re.exec(S))){
    if(m[1]!==undefined){if(depth===0){if(last&&last.c==null)last.c=m[1].trim();else if(!last)out.note0=m[1].trim()}continue}
    if(m[2]){depth++;continue}if(m[3]){depth=Math.max(0,depth-1);continue}if(depth>0)continue;
    if(m[4]){if(out.err)continue;const u=(m[4]+m[5]).toLowerCase(),f=C.parseSq(u.slice(0,2)),t=C.parseSq(u.slice(2,4));
      if(!b[f]||C.sideOf(b[f])!==s||!C.legal(b,s).some(([x,y])=>x===f&&y===t)){out.err="第 "+(out.moves.length+1)+" 步不合規則";continue}
      last={f,t,u,by:s,c:null};out.moves.push(last);b=C.make(b,f,t);s=C.opp(s);continue}
    if(m[6]){out.resTok=m[6];continue}}
  out.result=out.res==="1-0"?"紅勝":out.res==="0-1"?"黑勝":out.res==="1/2-1/2"?"和局":"未完";return out}
/* 一步的評語 → {q 評等, bc 建議著法（中文記譜）, lossP 差幾個兵, evs「走完後」那一段, ev 還原的大概分數（紅方視角）, mate 有殺（1 紅、-1 黑）, rest 其他段}；沒有評語＝null */
function parseNote(c){if(c==null||!String(c).trim())return null;const P=String(c).split("；").map(x=>x.trim()).filter(Boolean),o={raw:String(c).trim(),q:null,bc:null,lossP:null,evs:null,ev:null,mate:0,rest:[]};
  P.forEach((p,k)=>{let m;if(k===0&&QS.includes(C.qName(p))){o.q=C.qName(p);return}
    if((m=/^Pikafish 建議\s*(\S+)$/.exec(p))){o.bc=m[1];return}if((m=/^差約\s*([0-9.]+)\s*兵$/.exec(p))){o.lossP=+m[1];return}
    if(/^走完後/.test(p)){o.evs=p.slice(3);Object.assign(o,evOf(o.evs));return}o.rest.push(p)});return o}
/* 「紅方大占上風，約領先 4.4 個兵」→ 大概的分數（evt 的反函式；半個兵＝50、領先非常多＝2000、均勢＝0） */
function evOf(s){const sd=/^紅方/.test(s)?1:/^黑方/.test(s)?-1:0;if(/有殺/.test(s))return{ev:null,mate:sd};if(/^均勢/.test(s))return{ev:0,mate:0};
  if(/領先非常多/.test(s))return{ev:sd*2000,mate:0};if(/半個兵/.test(s))return{ev:sd*50,mate:0};const m=/約領先\s*([0-9.]+)\s*個兵/.exec(s);return{ev:m?sd*Math.round(+m[1]*100):null,mate:0}}
/* ---------- App 產生評語的原程式（m/10d-coach.js pgnNote、m/00-util.js evt；原檔唯讀，用 vm 載入那幾行） ---------- */
function loadNote(){const U=fs.readFileSync(path.join(DBD,"m","00-util.js"),"utf8").replace(/\r\n/g,"\n"),K=fs.readFileSync(path.join(DBD,"m","10d-coach.js"),"utf8").replace(/\r\n/g,"\n");
  const cut=(S,a,b,nm)=>{const i=S.indexOf(a),j=S.indexOf(b,i+1);if(i<0||j<i)throw new Error("找不到 "+nm);return S.slice(i,j)};
  const src=[cut(U,"const evt=(v,s)=>","\n/* 評比循環第 1 輪","00-util.js 的 evt"),cut(U,"function pawnN(cp)","\n","00-util.js 的 pawnN"),cut(K,"const PGN_OK=","\n","10d-coach.js 的 PGN_OK"),cut(K,"const pgnCm=","\n","10d-coach.js 的 pgnCm"),cut(K,"function pgnNote(m)","\nfunction pgnBuild","10d-coach.js 的 pgnNote")].join("\n");
  const ctx={isFinite,Math,String};vm.createContext(ctx);vm.runInContext(src+";this.R={evt,pgnNote}",ctx,{filename:"App 的 pgnNote＋evt"});return{...ctx.R,sha:shaS(src)}}
/* ---------- 對手類型（看 [Red]／[Black] 裡 App 自己的叫法） ---------- */
function oppKind(name){const s=String(name||""),story=/石桌往事/.test(s),m=/第\s*(\d+)\s*級/.exec(s);
  if(/晉級賽/.test(s))return{kind:"晉級賽",lv:null,story};if(m)return{kind:(story?"石桌往事・":"")+"幻影棋客第 "+m[1]+" 級",lv:+m[1],story};if(story)return{kind:"石桌往事（其他）",lv:null,story};
  return{kind:"其他對手（大廳棋友等）",lv:null,story:false}}
function whoIsMe(games,me){if(me)return me;const n={};for(const g of games)for(const k of[g.red,g.black])if(k)n[k]=(n[k]||0)+1;return Object.entries(n).sort((a,b)=>b[1]-a[1]).map(x=>x[0])[0]||""}
/* ---------- --stat：只印統計 ---------- */
function stat(games){const L=[],q={},ok=games.filter(g=>!g.err),kinds={};let n=0,noNote=0,sug=0,loss=0,evs=0,mate=0,rest=0;
  for(const g of ok)for(const m of g.moves){n++;const p=parseNote(m.c);if(!p||!p.q){noNote++;const k=p?"（沒有評等字樣）":"（沒有評語）";q[k]=(q[k]||0)+1;continue}q[p.q]=(q[p.q]||0)+1;if(p.bc)sug++;if(p.lossP!=null)loss++;if(p.evs)evs++;if(p.mate)mate++;if(p.rest.length)rest++}
  const me=whoIsMe(ok);for(const g of ok){const k=oppKind(g.red===me?g.black:g.red).kind;kinds[k]=kinds[k]||{g:0,n:0};kinds[k].g++;kinds[k].n+=g.moves.length}
  L.push(`棋局 ${games.length} 盤（讀得懂的 ${ok.length} 盤；有 [FEN] 的 ${ok.filter(g=>g.fen).length} 盤，其中起始局面其實是標準開局的 ${ok.filter(g=>g.fen&&g.std).length} 盤）；共 ${n} 步`);
  for(const g of games)if(g.err)L.push(`  第 ${g.i+1} 盤讀不懂：${g.err}`);
  L.push("評等字樣："+Object.entries(q).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k} ${v}`).join("、"));
  L.push(`有「Pikafish 建議」的 ${sug} 步、有「差約 N 兵」的 ${loss} 步、有「走完後」的 ${evs} 步（其中有殺 ${mate} 步）、還有其他段落的 ${rest} 步、沒有評語或評等的 ${noNote} 步`);
  L.push("手數：最短 "+Math.min(...ok.map(g=>g.moves.length))+"、中位數 "+qt(ok.map(g=>g.moves.length),.5)+"、最長 "+Math.max(...ok.map(g=>g.moves.length))+"；結果："+["紅勝","黑勝","和局","未完"].map(k=>k+" "+ok.filter(g=>g.result===k).length).join("、"));
  L.push("對手類型（盤／步）："+Object.entries(kinds).sort((a,b)=>b[1].g-a[1].g).map(([k,v])=>`${k} ${v.g}／${v.n}`).join("、"));return L.join("\n")}
/* ---------- --run：逐盤、逐檔重評（引擎與評等都用 engine-budget-check.js 的） ---------- */
const EDIR=path.join(LAB,"site","engine"),shaF=f=>crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex");
function metaSha(){const o={};for(const f of["pikafish.js","pikafish.wasm","pikafish.nnue"])o["xiangqi-lab/site/engine/"+f]=shaF(path.join(EDIR,f));o["xiangqi-lab/site/core.js"]=shaF(path.join(LAB,"site","core.js"));return o}
/* PGN 的一盤 → engine-budget-check.js analyzeGame 要的樣子 */
const asItem=g=>({id:"p"+String(g.i+1).padStart(3,"0"),name:g.event,result:g.result,start:g.fen?g.start:null,startTurn:g.startTurn,lines:[{moves:g.moves.map(m=>[m.f,m.t])}]});
const runnable=g=>!g.err&&g.moves.length>0&&["紅勝","黑勝","和局"].includes(g.result);
async function run(o){
  const text=fs.readFileSync(o.pgn,"utf8"),games=parsePgn(text),dir=o.out,t0=Date.now(),deadline=t0+o.maxMs,A=X.loadReport(),cf=path.join(dir,"config.json");fs.mkdirSync(dir,{recursive:true});
  for(const t of o.tiers)if(!ORDER.includes(t))throw new Error("不認得的檔位："+t);
  const sortT=a=>ORDER.filter(t=>a.includes(t)),old=fs.existsSync(cf)?JSON.parse(fs.readFileSync(cf,"utf8")):null;
  if(old&&(old.app!==o.app||old.pgnSha!==shaS(text)))throw new Error("這個資料夾是別的棋譜或別的 --app 跑的，請換一個 --out");
  /* 同一個資料夾可以之後再加檔位（已經做好的檔位不重做）：config.json 的 tiers＝做過的全部檔位 */
  if(!old||sortT([...old.tiers,...o.tiers]).length!==old.tiers.length)fs.writeFileSync(cf,JSON.stringify({ver:EBP_VER,ebc:X.EBC_VER,app:o.app,tiers:sortT([...(old?old.tiers:[]),...o.tiers]),games:games.length,pgnSha:shaS(text),threads:1,hash:16,mxs:A.MXS.ver,node:process.version,sha:metaSha(),settingsSha:A.sha,noteSha:loadNote().sha},null,1));
  const need=o.tiers.some(t=>t in TIERX),needK=o.tiers.some(t=>t in KEEPX),E=need?o.engine||await X.newEngine():null,EK=needK?o.engineKeep||await X.newEngine({keepHash:true}):null;let did=0,stopped=false;
  for(let gi=0;gi<games.length&&!stopped;gi++){if(gi%o.pn!==o.pi-1)continue;const g=games[gi],nm=String(gi).padStart(3,"0"),fp=path.join(dir,"g"+nm+".json"),pp=path.join(dir,"p"+nm+".json");if(Date.now()>deadline)break;
    const base={i:gi,id:"p"+String(gi+1).padStart(3,"0"),name:g.event,red:g.red,black:g.black,date:g.tags.Date||"",res:g.res,result:g.result,plies:g.moves.length,fen:g.fen,std:g.std,startTurn:g.startTurn||"r",phone:g.moves.map(m=>m.c),mv:g.moves.map(m=>m.u)};
    if(!runnable(g)){if(!fs.existsSync(fp))fs.writeFileSync(fp,JSON.stringify({...base,skip:g.err||(g.moves.length?"沒有勝負和的結果":"沒有著法"),tiers:{}}));continue}
    /* g###.json＝做完的盤（之後加檔位就補進同一個檔）；p###.json＝正在做的盤（已經做完的檔位＋正在做的那一檔做到第幾手） */
    const fin=fs.existsSync(fp)?JSON.parse(fs.readFileSync(fp,"utf8")):null;if(fin&&o.tiers.every(t=>fin.tiers[t]))continue;
    const it=asItem(g),out=fs.existsSync(pp)?JSON.parse(fs.readFileSync(pp,"utf8")):fin?{...fin,cur:null}:{...base,tiers:{},cur:null};
    for(const t of o.tiers){if(out.tiers[t])continue;let r;
      if(t in KEEPX){await EK.newGame();r=await X.analyzeGame(it,X.evalWith(EK,o.app*MULT(t)),A,{})}   /* 留雜湊表的檔位整盤一口氣做完（雜湊表的內容跟做到哪裡有關，不能中斷續跑） */
      else r=await X.analyzeGame(it,X.evalWith(E,o.app*MULT(t)),A,{resume:out.cur&&out.cur.tier===t?out.cur.partial:null,deadline});
      if(r.partial){out.cur={tier:t,partial:r.partial};fs.writeFileSync(pp,JSON.stringify(out));console.log(`part ${o.pi}/${o.pn}：第 ${gi} 盤做到 ${t} 第 ${r.partial.moves.length}／${out.plies} 手，時間到，先存起來`);stopped=true;break}
      out.tiers[t]=r;out.cur=null;fs.writeFileSync(pp,JSON.stringify(out))}
    if(stopped)break;delete out.cur;const T2={};for(const t of ORDER)if(out.tiers[t])T2[t]=out.tiers[t];out.tiers=T2;fs.writeFileSync(fp,JSON.stringify(out));try{fs.unlinkSync(pp)}catch(e){}did++;console.log(`part ${o.pi}/${o.pn}：第 ${gi} 盤（${out.plies} 手）完成，${Math.round((Date.now()-t0)/1000)} 秒`)}
  if(E&&!o.engine)E.close();if(EK&&!o.engineKeep)EK.close();console.log(`part ${o.pi}/${o.pn} 這次做完 ${did} 盤`+(stopped?"（還沒全部做完）":""));return{did,stopped}}
/* ---------- --report：① 預算敏感度（同 engine-budget-check.js 的 compare）② 手機評語 vs 電腦各檔 ③ 分組 ---------- */
const OKQ=q=>q==="正著"||q==="妙著",BIG=q=>q==="失著"||q==="敗著",TN={sixteenth:"app÷16",quarter:"app÷4",app:"app",high:"app×4",x16:"app×16",sixteenthTT:"app÷16＋留雜湊表",quarterTT:"app÷4＋留雜湊表",appTT:"app＋留雜湊表",highTT:"app×4＋留雜湊表"};
/* 11/6 以前的版本用舊分界線（差 0.1／0.4／1／3 個兵），存檔裡的評等字樣沒有跟著改（App 畫面上會照「少幾分」重算，匯出的 PGN 沒有）。
   看得出來的特徵：評等跟「差約 N 兵」對不上現在的分界線，或不是正著卻沒有「差約」（差不到 0.3 兵；敗著「差很多」不算）。整盤有一步這樣＝這盤是舊分界線評的 */
function oldStyle(notes){return notes.some(p=>{if(!p||!p.q||OKQ(p.q))return false;if(p.lossP==null)return p.q!=="敗著";const v=Math.round(p.lossP*100);return![C.gradeLoss(v-5),C.gradeLoss(v),C.gradeLoss(v+5)].includes(p.q)})}
/* 舊分界線的評等照「差約 N 兵」換成現在的分界線（只有一位小數，剛好在分界線上的步會有一點誤差；舊版妙著的條件比較寬，照舊留著） */
const normOld=p=>!p||!p.q?null:p.q==="妙著"?"妙著":p.lossP!=null?C.gradeLoss(Math.round(p.lossP*100)):"正著";
/* 一盤一方的評級上限（m/05-settings.js gameReport 的 cap：失著＋敗著 6 步或兩成以上最高 C（69）、3 步或一成以上最高 B（79）、有敗著最高 A（89）） */
function capOf(qs){const n=qs.length,blun=qs.filter(q=>q==="敗著").length,bad=qs.filter(BIG).length,br=n?bad/n:0;return bad>=6||br>=.2?69:bad>=3||br>=.1?79:blun?89:100}
const evCat=s=>s==null?null:/有殺/.test(s)?s.slice(0,2)+"有殺":/^均勢/.test(s)?"均勢":s.split("，")[0];
const kindGroup=(k,std)=>!std?"殘局或中局開始（有 [FEN]）":k.kind==="晉級賽"?"晉級賽":k.lv==null?"其他對手（大廳棋友等）":(k.story?"石桌往事・":"")+"幻影棋客第 "+(k.lv<=3?"1～3":"4 以上")+" 級";
function loadRun(dir){const cfg=JSON.parse(fs.readFileSync(path.join(dir,"config.json"),"utf8")),games=fs.readdirSync(dir).filter(f=>/^g\d+\.json$/.test(f)).sort().map(f=>JSON.parse(fs.readFileSync(path.join(dir,f),"utf8")));return{cfg,games}}
/* 每一步一列：手機的評語（ph）＋電腦每一檔的結果（T[檔]，另外用 App 的 pgnNote 寫成同樣格式的評語 note 再讀回來 pn，才能逐欄比） */
function rowsOf(games,tiers,me,N){const rows=[];me=whoIsMe(games,me);
  for(const g of games){if(g.skip||!tiers.every(t=>g.tiers[t]))continue;let b=g.fen?C.parseFen(g.fen.trim().split(/\s+/)[0]):C.parseFen(C.START),s=g.startTurn||"r";
    const notes=(g.phone||[]).map(parseNote),old=oldStyle(notes),k=oppKind(g.red===me?g.black:g.red),grp=kindGroup(k,g.std);
    for(let i=0;i<g.plies;i++){const m0=g.tiers[tiers[0]].moves[i];if(!m0)break;const ph=notes[i]&&notes[i].q?notes[i]:null,T={};
      for(const t of tiers){const m=g.tiers[t].moves[i],bc=C.notate(b,C.parseSq(m.bm.slice(0,2)),C.parseSq(m.bm.slice(2,4))),note=N.pgnNote({q:m.q,bc,loss:m.loss,ev:m.ev});T[t]={q:m.q,hit:m.hit,bm:m.bm,bc,loss:m.loss,ev:m.ev,note,pn:parseNote(note)}}
      rows.push({gi:g.i,i,by:s,u:C.iccs(m0.f,m0.t),mine:(s==="r"?g.red:g.black)===me,grp,std:!!g.std,old,ph,pq:ph?(old?normOld(ph):ph.q):null,T});b=C.make(b,m0.f,m0.t);s=C.opp(s)}}
  return{rows,me}}
/* 手機 vs 電腦某一檔（rows＝有手機評等的步） */
function phoneVs(rows,t){const R=rows.filter(r=>r.pq),o={n:R.length,same:0,off2:0,noteSame:0,conf:{},sug:{both:0,bothSame:0,phoneOnly:0,pcOnly:0,neither:0},known:0,knownSame:0,lossBoth:[],lossPhoneOnly:0,lossPcOnly:0,evCatSame:0,evN:0,evDiff:[],mateDiff:0,mateAny:0,big:{phone:0,pc:0,both:0}};
  for(const r of R){const p=r.ph,x=r.T[t],c=x.pn;if(r.pq===x.q)o.same++;if(Math.abs(QS.indexOf(r.pq)-QS.indexOf(x.q))>=2)o.off2++;if(p.raw===x.note)o.noteSame++;(o.conf[r.pq]=o.conf[r.pq]||{})[x.q]=(o.conf[r.pq][x.q]||0)+1;
    const ps=!OKQ(r.pq),cs=!OKQ(x.q);if(ps&&cs){o.sug.both++;if(p.bc&&p.bc===x.bc)o.sug.bothSame++}else if(ps)o.sug.phoneOnly++;else if(cs)o.sug.pcOnly++;else o.sug.neither++;
    /* 手機的首選只在兩種情形看得出來：有「Pikafish 建議 X」（首選＝X）、妙著（首選＝走的這步）；正著可能是首選、也可能只是差不到 0.3 兵，看不出來 */
    if(p.bc){o.known++;if(p.bc===x.bc)o.knownSame++}else if(p.q==="妙著"){o.known++;if(x.hit)o.knownSame++}
    if(p.lossP!=null&&c.lossP!=null)o.lossBoth.push(Math.abs(p.lossP-c.lossP));else if(p.lossP!=null)o.lossPhoneOnly++;else if(c.lossP!=null)o.lossPcOnly++;
    if(p.evs!=null&&c.evs!=null){o.evN++;if(evCat(p.evs)===evCat(c.evs))o.evCatSame++;if(p.mate||c.mate)o.mateAny++;if(p.mate!==c.mate)o.mateDiff++;else if(!p.mate&&p.ev!=null&&c.ev!=null)o.evDiff.push(Math.abs(p.ev-c.ev)/100)}
    if(BIG(r.pq))o.big.phone++;if(BIG(x.q))o.big.pc++;if(BIG(r.pq)&&BIG(x.q))o.big.both++}
  return{...o,samePct:pct(o.same,o.n),off2Pct:pct(o.off2,o.n),notePct:pct(o.noteSame,o.n),knownPct:pct(o.knownSame,o.known),sugSamePct:pct(o.sug.bothSame,o.sug.both),okAgreePct:pct(o.sug.both+o.sug.neither,o.n),
    loss:{n:o.lossBoth.length,med:r2(qt(o.lossBoth,.5)),mean:r2(mean(o.lossBoth)),p90:r2(qt(o.lossBoth,.9))},evCatPct:pct(o.evCatSame,o.evN),ev:{n:o.evDiff.length,med:r2(qt(o.evDiff,.5)),mean:r2(mean(o.evDiff)),p90:r2(qt(o.evDiff,.9))},lossBoth:undefined,evDiff:undefined}}
/* 兩兩「評語相同 %」的矩陣（手機＋各檔，同一批步）；key＝怎麼取一步的評語 */
function agreeMatrix(rows,tiers,key){const R=rows.filter(r=>r.pq),names=["phone",...tiers],get=(r,k)=>key==="note"?(k==="phone"?r.ph.raw:r.T[k].note):(k==="phone"?r.pq:r.T[k].q),M={};
  for(const a of names){M[a]={};for(const b of names)M[a][b]=pct(R.filter(r=>get(r,a)===get(r,b)).length,R.length)}return{n:R.length,names,M}}
/* 以盤為單位重抽（同一盤的步不獨立）：每一檔「跟手機評語相同的比例」與兩檔之差的 95% 區間；固定種子 */
function bootAgree(rows,tiers,B,key){const R=rows.filter(r=>r.pq),by=new Map(),get=(r,k)=>key==="note"?r.T[k].note:r.T[k].q,ph=r=>key==="note"?r.ph.raw:r.pq;
  for(const r of R){let g=by.get(r.gi);if(!g){g={n:0,k:{}};for(const t of tiers)g.k[t]=0;by.set(r.gi,g)}g.n++;for(const t of tiers)if(ph(r)===get(r,t))g.k[t]++}
  const G=[...by.values()],rnd=X.rng(BOOT_SEED),S={},D={},pairs=[];for(const t of tiers)S[t]=[];for(let i=0;i<tiers.length;i++)for(let j=i+1;j<tiers.length;j++){pairs.push([tiers[i],tiers[j]]);D[tiers[i]+">"+tiers[j]]=[]}
  for(let b=0;b<B;b++){let n=0;const k={};for(const t of tiers)k[t]=0;for(let i=0;i<G.length;i++){const g=G[Math.floor(rnd()*G.length)];n+=g.n;for(const t of tiers)k[t]+=g.k[t]}
    if(!n)continue;for(const t of tiers)S[t].push(100*k[t]/n);for(const[a,c]of pairs)D[a+">"+c].push(100*(k[a]-k[c])/n)}
  const ci=a=>[r1(qt(a,.025)),r1(qt(a,.975))],out={games:G.length,n:R.length,B,tier:{},diff:{}};for(const t of tiers)out.tier[t]={pct:pct(G.reduce((s,g)=>s+g.k[t],0),R.length),ci:ci(S[t])};
  for(const[a,c]of pairs){const d=D[a+">"+c];out.diff[a+">"+c]={d:r1(mean(G.map(g=>g.k[a]-g.k[c]))*G.length*100/Math.max(1,R.length)),ci:ci(d),pPos:pct(d.filter(x=>x>0).length,d.length)}}return out}
/* 各檔評語不全相同的步：手機跟哪一檔一樣 */
function splitVotes(rows,tiers){const R=rows.filter(r=>r.pq&&new Set(tiers.map(t=>r.T[t].q)).size>1),o={n:R.length,with:{},only:{},none:0};for(const t of tiers){o.with[t]=0;o.only[t]=0}
  for(const r of R){const hit=tiers.filter(t=>r.T[t].q===r.pq);if(!hit.length)o.none++;for(const t of hit)o.with[t]++;if(hit.length===1)o.only[hit[0]]++}return o}
/* 每一方的評級上限（手機那一方每一步都有評等、至少 minN 步才比） */
function capCompare(rows,tiers,minN){const by=new Map();for(const r of rows){const k=r.gi+r.by;if(!by.has(k))by.set(k,[]);by.get(k).push(r)}const o={sides:0,same:{},looser:{},stricter:{}};for(const t of tiers){o.same[t]=0;o.looser[t]=0;o.stricter[t]=0}
  for(const R of by.values()){if(R.length<minN||R.some(r=>!r.pq))continue;o.sides++;const pc=capOf(R.map(r=>r.pq));for(const t of tiers){const c=capOf(R.map(r=>r.T[t].q));if(c===pc)o.same[t]++;else if(pc>c)o.looser[t]++;else o.stricter[t]++}}return o}
/* X.compare 要的樣子；minSide＝一方至少幾步才算進「每一方」的統計（太短的盤一步就定生死） */
function forCompare(games,tiers,minSide){return games.filter(g=>!g.skip&&tiers.every(t=>g.tiers[t])).map(g=>{const T={};for(const t of tiers){const x=g.tiers[t],sides={};for(const k of["r","b"])sides[k]=x.sides[k]&&x.sides[k].n>=(minSide||1)?x.sides[k]:null;T[t]={...x,sides}}return{id:g.id,name:g.name,plies:g.plies,result:g.result,tiers:T}})}
/* 同一個局面走同一步、前面的盤已經出現過（而且有手機評語）的步數 */
function dupCount(games){const S=new Set();let dup=0;for(const g of games){let b=g.fen?C.parseFen(g.fen.trim().split(/\s+/)[0]):C.parseFen(C.START),s=g.startTurn||"r";
    for(let i=0;i<g.plies;i++){const u=g.mv[i],k=C.fen(b,s)+"|"+u;if(parseNote(g.phone[i])){if(S.has(k))dup++;else S.add(k)}b=C.make(b,C.parseSq(u.slice(0,2)),C.parseSq(u.slice(2,4)));s=C.opp(s)}}return dup}
function report(dir,o){o=o||{};const{cfg,games}=loadRun(dir),tiers=ORDER.filter(t=>cfg.tiers.includes(t)&&(!o.tiers||o.tiers.includes(t))),bud=tiers.filter(t=>t in TIERX),N=loadNote(),L=[],P=s=>L.push(s),f=v=>v==null?"—":v,B=o.boot||2000,MIN=10;
  const done=games.filter(g=>!g.skip&&tiers.every(t=>g.tiers[t])),skip=games.filter(g=>g.skip),{rows,me}=rowsOf(games,tiers,o.me,N),nodes=t=>Math.round(cfg.app*MULT(t)),tn=t=>TN[t]+"（"+nodes(t)+" 節點）";
  const pairsOf=T=>{const p=[];for(let i=0;i+1<T.length;i++)p.push([T[i],T[i+1]]);if(T.includes("quarter")&&T.includes("high"))p.push(["quarter","high"]);return p};
  const out={ver:EBP_VER,cfg,games:games.length,done:done.length,skip:skip.length,plies:rows.length,budget:{},phone:{},groups:{}};
  P(`# 引擎分析預算敏感度（PGN 版）：結果（EBP_VER ${EBP_VER}）`);P("");
  P(`- 棋局：PGN 裡 ${cfg.games} 盤；重評完的 **${done.length} 盤**（${rows.length} 步）；沒評的 ${skip.length} 盤${skip.length?"（"+skip.map(g=>"第 "+(g.i+1)+" 盤："+g.skip).join("；")+"）":""}。標準開局 ${done.filter(g=>g.std).length} 盤（${rows.filter(r=>r.std).length} 步）、有 [FEN] 的 ${done.filter(g=>!g.std).length} 盤（${rows.filter(r=>!r.std).length} 步）。`);
  P(`- 手數：最短 ${Math.min(...done.map(g=>g.plies))}、中位數 ${qt(done.map(g=>g.plies),.5)}、最長 ${Math.max(...done.map(g=>g.plies))}；不到 10 手的 ${done.filter(g=>g.plies<10).length} 盤。`);
  P(`- 預算（每個局面的節點數）：${tiers.map(tn).join("、")}。app＝--app 給的數字（電腦上「go movetime ${C.ANALYZE_MS}」大約算到的節點數）。`);
  P(`- 引擎設定：Threads ${cfg.threads}、Hash ${cfg.hash} MB、每次搜尋前 ucinewgame（清雜湊表）；Node ${cfg.node}。影子模式 MXS v${cfg.mxs}。`+(tiers.some(t=>t in KEEPX)?"「留雜湊表」的檔位是對照用：節點數一樣，但只在每盤開始清一次雜湊表、照對局順序一步一步評（App 實際上雜湊表是留著的），不算進第一節的預算比較。":""));
  for(const t of tiers){const G=done.map(g=>g.tiers[t]);P(`- ${tn(t)}：搜尋 ${G.reduce((s,x)=>s+x.searches,0)} 次、搜尋深度的中位數（各盤中位數的中位數）${f(r1(qt(G.map(x=>x.depthMed).filter(x=>x!=null),.5)))}、耗時 ${r1(G.reduce((s,x)=>s+x.ms,0)/60000)} 分鐘`)}
  /* ① 預算敏感度 */
  const sets=[["全部",done],["標準開局",done.filter(g=>g.std)],["有 [FEN]",done.filter(g=>!g.std)]];
  P("");P("## 一、預算敏感度（電腦上各檔互比）");
  for(const[nm,G]of sets){if(!G.length)continue;const cs=pairsOf(bud).map(([a,b])=>X.compare(forCompare(G,bud,1),a,b)),cm=pairsOf(bud).map(([a,b])=>X.compare(forCompare(G,bud,MIN),a,b));out.budget[nm]={all:cs,min:cm};
    P("");P(`### ${nm}（${G.length} 盤、${G.reduce((s,g)=>s+g.plies,0)} 步）`);P("| 比較 | 步數 | 評語相同 % | 評語差兩級以上 % | 引擎首選相同 % | 走的是首選 %（低→高） | 少掉的分數差：中位數／90 分位（差 ≥30 分的 %） | 失著、敗著：兩邊都標／只有低／只有高 | 有殺棋訊號的步 | 殺棋標記不一致（最佳著／走完） |");P("|---|---|---|---|---|---|---|---|---|---|");
    for(const c of cs)P(`| ${TN[c.lo]} → ${TN[c.hi]} | ${c.ply.n} | ${c.ply.labelSame} | ${c.ply.label2} | ${c.ply.bestSame} | ${c.ply.hit[0]} → ${c.ply.hit[1]} | ${c.ply.dLoss.med}／${c.ply.dLoss.p90}（${c.ply.dLoss.over30}） | ${c.ply.big.both}／${c.ply.big.onlyLo}／${c.ply.big.onlyHi} | ${c.ply.mateAny} | ${c.ply.bmtDiff}／${c.ply.pmtDiff} |`);
    for(const c of cs)P(`- ${TN[c.lo]} → ${TN[c.hi]} 最常見的評語變動：${c.ply.trans.map(([k,v])=>`${k} ${v} 步`).join("、")||"沒有"}`);
    for(const[lab,cc]of[["每一方（全部）",cs],[`每一方（那一方至少 ${MIN} 步）`,cm]]){if(!cc[0].sides)continue;P("");P(`**${lab}**（差＝高預算 − 低預算）`);P("| 比較 | 幾個一方 | 畫面的舊總分：平均差／平均絕對差／90 分位／最大 | 舊評級換級 %（幾方；差兩級以上 %） | 影子 base：平均絕對差／90 分位／最大 | 影子 score：平均絕對差／最大 | 影子評級換級 %（幾方） | 首選一致率平均絕對差 | 排序（等級相關）：舊總分／影子 base |");P("|---|---|---|---|---|---|---|---|---|");
      for(const c of cc){const s=c.side;P(`| ${TN[c.lo]} → ${TN[c.hi]} | ${c.sides} | ${s.old.mean}／${s.old.meanAbs}／${s.old.p90}／${s.old.max} | ${s.oldFlip}（${s.oldFlipN}；${s.oldFlip2}） | ${s.base.meanAbs}／${s.base.p90}／${s.base.max} | ${s.score.meanAbs}／${s.score.max} | ${s.gradeFlip}（${s.gradeFlipN}） | ${s.mm.meanAbs} | ${f(s.rho.old)}／${f(s.rho.base)} |`)}}}
  /* 留雜湊表的對照檔互比（比較接近 App 實際的跑法）：只列全部盤 */
  const keep=tiers.filter(t=>t in KEEPX);
  if(keep.length>=2){const kp=[];for(let i=0;i+1<keep.length;i++)kp.push([keep[i],keep[i+1]]);const cs=kp.map(([a,b])=>X.compare(forCompare(done,keep,1),a,b)),cm=kp.map(([a,b])=>X.compare(forCompare(done,keep,MIN),a,b));out.budget["留雜湊表"]={all:cs,min:cm};
    P("");P(`### 留雜湊表的對照檔互比（全部 ${done.length} 盤、${rows.length} 步）`);P("| 比較 | 步數 | 評語相同 % | 評語差兩級以上 % | 引擎首選相同 % | 失著、敗著：兩邊都標／只有低／只有高 | 殺棋標記不一致（最佳著／走完） | 一方至少 "+MIN+" 步的幾個一方 | 舊總分：平均絕對差／90 分位／最大 | 舊評級換級 %（幾方） | 影子 base 平均絕對差／最大 | 影子評級換級 %（幾方） |");P("|---|---|---|---|---|---|---|---|---|---|---|---|");
    cs.forEach((c,i)=>{const s=cm[i].side;P(`| ${TN[c.lo]} → ${TN[c.hi]} | ${c.ply.n} | ${c.ply.labelSame} | ${c.ply.label2} | ${c.ply.bestSame} | ${c.ply.big.both}／${c.ply.big.onlyLo}／${c.ply.big.onlyHi} | ${c.ply.bmtDiff}／${c.ply.pmtDiff} | ${cm[i].sides} | ${s.old.meanAbs}／${s.old.p90}／${s.old.max} | ${s.oldFlip}（${s.oldFlipN}） | ${s.base.meanAbs}／${s.base.max} | ${s.gradeFlip}（${s.gradeFlipN}） |`)});
    for(const c of cs)P(`- ${TN[c.lo]} → ${TN[c.hi]} 最常見的評語變動：${c.ply.trans.map(([k,v])=>`${k} ${v} 步`).join("、")||"沒有"}`);
    /* 同樣的節點數，留不留雜湊表差多少 */
    const same=keep.filter(t=>tiers.includes(t.replace(/TT$/,""))).map(t=>X.compare(forCompare(done,[t.replace(/TT$/,""),t],1),t.replace(/TT$/,""),t));out.budget["留不留"]=same;
    if(same.length)P("- 同樣的節點數，清雜湊表 vs 留雜湊表的評語相同 %："+same.map(c=>`${TN[c.lo]} ${c.ply.labelSame}%（引擎首選相同 ${c.ply.bestSame}%）`).join("、"))}
  /* ② 手機 vs 電腦 */
  const withPh=rows.filter(r=>r.pq),main=withPh.filter(r=>!r.old),oldN=withPh.filter(r=>r.old).length,oldG=new Set(withPh.filter(r=>r.old).map(r=>r.gi)).size;
  P("");P("## 二、手機當時的評語 vs 電腦重評");
  P(`- 匯出棋譜的人（出現在最多盤的名字）下的步 ${rows.filter(r=>r.mine).length} 步、對手的步 ${rows.filter(r=>!r.mine).length} 步。`);
  P(`- 有手機評等的步 ${withPh.length} 步；沒有評語（手機還沒評到）的 ${rows.length-withPh.length} 步不比。其中 ${oldG} 盤（${oldN} 步）是 11/6 以前的舊分界線評的（評等跟「差約 N 兵」對不上現在的分界線），**主表不算這幾盤**，剩 **${main.length} 步**（${new Set(main.map(r=>r.gi)).size} 盤）；把它們照「差約」換成現在的分界線一起算的數字列在表後。`);
  const dup=dupCount(done);
  P(`- 同一個局面走同一步、在別盤已經出現過的有 ${dup} 步（App 對同一個局面的評等有快取，這些步的手機評語是抄第一次的；電腦重評每次都清雜湊表，同一個局面結果也一樣）。`);
  const PV={};for(const t of tiers)PV[t]=phoneVs(main,t);out.phone.vs=PV;
  P("");P("| 手機 vs | 步數 | 評等相同 % | 評等差兩級以上 % | 整段評語一字不差 % | 「是不是正著、妙著」相同 % | 兩邊都有建議時，建議同一步 %（步數） | 手機首選看得出來的步，電腦首選相同 %（步數） | 「差約 N 兵」兩邊都有：差的中位數／平均／90 分位（步數）；只有手機有／只有電腦有 | 走完後的形勢說法相同 % | 走完後分數差（個兵）：中位數／平均／90 分位 | 有殺標記不一致（有殺的步） | 失著、敗著：兩邊都標／只有手機／只有電腦 |");P("|---|---|---|---|---|---|---|---|---|---|---|---|---|");
  for(const t of tiers){const v=PV[t];P(`| ${tn(t)} | ${v.n} | ${v.samePct} | ${v.off2Pct} | ${v.notePct} | ${v.okAgreePct} | ${v.sugSamePct}（${v.sug.both}） | ${v.knownPct}（${v.known}） | ${v.loss.med}／${v.loss.mean}／${v.loss.p90}（${v.loss.n}）；${v.lossPhoneOnly}／${v.lossPcOnly} | ${v.evCatPct} | ${v.ev.med}／${v.ev.mean}／${v.ev.p90} | ${v.mateDiff}（${v.mateAny}） | ${v.big.both}／${v.big.phone-v.big.both}／${v.big.pc-v.big.both} |`)}
  const AM=agreeMatrix(main,tiers,"q"),AN=agreeMatrix(main,tiers,"note");out.phone.matrix={q:AM,note:AN};const nm2=k=>k==="phone"?"手機":TN[k];
  for(const[ttl,M]of[["評等相同 %（兩兩比，同一批 "+AM.n+" 步）",AM],["整段評語一字不差 %（兩兩比）",AN]]){P("");P("**"+ttl+"**");P("| | "+M.names.map(nm2).join(" | ")+" |");P("|---|"+M.names.map(()=>"---").join("|")+"|");for(const a of M.names)P(`| ${nm2(a)} | ${M.names.map(b=>a===b?"—":M.M[a][b]).join(" | ")} |`)}
  const BA=bootAgree(main,tiers,B,"q"),BN=bootAgree(main,tiers,B,"note"),SV=splitVotes(main,bud);out.phone.boot={q:BA,note:BN};out.phone.split=SV;
  P("");P(`**手機比較像哪一檔**（以盤為單位重抽 ${B} 次的 95% 區間；${BA.games} 盤、${BA.n} 步；種子 ${BOOT_SEED}）`);
  P("- 評等相同："+tiers.map(t=>`${TN[t]} ${BA.tier[t].pct}%（${BA.tier[t].ci[0]}～${BA.tier[t].ci[1]}）`).join("、"));
  P("- 整段評語一字不差："+tiers.map(t=>`${TN[t]} ${BN.tier[t].pct}%（${BN.tier[t].ci[0]}～${BN.tier[t].ci[1]}）`).join("、"));
  /* 最像的那一檔 vs 其他每一檔：差幾個百分點、區間含不含 0 */
  for(const[lab,BB]of[["評等相同",BA],["一字不差",BN]]){const best=tiers.slice().sort((a,b)=>BB.tier[b].pct-BB.tier[a].pct)[0];BB.best=best;
    for(const t of tiers){if(t===best)continue;const fw=BB.diff[best+">"+t],bw=BB.diff[t+">"+best],d=fw?fw.d:-bw.d,ci=fw?fw.ci:[-bw.ci[1],-bw.ci[0]],pp=fw?fw.pPos:r1(100-bw.pPos);P(`- ${lab}的比例，最高的 ${TN[best]} 減 ${TN[t]}：${r1(d)} 個百分點（95% 區間 ${r1(ci[0])}～${r1(ci[1])}；重抽裡 ${TN[best]} 比較高的佔 ${pp}%）`)}}
  P(`- 只差節點數的那幾檔評等不全相同的 ${SV.n} 步裡，手機跟各檔一樣的步數：${bud.map(t=>`${TN[t]} ${SV.with[t]}（只跟它一樣 ${SV.only[t]}）`).join("、")}；跟哪一檔都不一樣 ${SV.none} 步。`);
  for(const t of tiers){const cf=PV[t].conf;P("");P(`**混淆表：手機（列）× ${tn(t)}（欄）**`);P("| 手機＼電腦 | "+QS.join(" | ")+" | 合計 |");P("|---|"+QS.map(()=>"---").join("|")+"|---|");for(const a of QS){const row=cf[a]||{},sum=QS.reduce((s,b)=>s+(row[b]||0),0);if(sum)P(`| ${a} | ${QS.map(b=>row[b]||0).join(" | ")} | ${sum} |`)}P(`| 合計 | ${QS.map(b=>QS.reduce((s,a)=>s+((cf[a]||{})[b]||0),0)).join(" | ")} | ${PV[t].n} |`)}
  const CC=capCompare(main,tiers,MIN);out.phone.cap=CC;P("");P(`**一盤一方的評級上限**（只看失著、敗著的步數；手機那一方每一步都有評等、至少 ${MIN} 步的 ${CC.sides} 個一方）：${tiers.map(t=>`${TN[t]} 相同 ${CC.same[t]}（手機比較寬 ${CC.looser[t]}、手機比較嚴 ${CC.stricter[t]}）`).join("、")}。手機的總分沒辦法從評語精確還原（正著只知道差不到 0.3 兵），所以只比上限。`);
  if(oldN){const all=withPh;P("");P(`**把舊分界線的 ${oldG} 盤（${oldN} 步）也算進來**（照「差約」換成現在的分界線；共 ${all.length} 步）：評等相同 `+tiers.map(t=>`${TN[t]} ${phoneVs(all,t).samePct}%`).join("、")+"。");out.phone.withOld={};for(const t of tiers)out.phone.withOld[t]=phoneVs(all,t).samePct}
  /* ③ 分組 */
  P("");P("## 三、分組看");
  const groups=[["對局類型",r=>r.grp],["哪一方",r=>r.mine?"匯出的人自己下的步":"對手（電腦）下的步"],["手機說走完後的形勢",r=>!r.ph||(!r.ph.mate&&r.ph.ev==null)?null:r.ph.mate||Math.abs(r.ph.ev)>=2000?"有殺或領先非常多":Math.abs(r.ph.ev)>=300?"大占上風（3 個兵以上）":Math.abs(r.ph.ev)>=150?"明顯好（1.5～3 個兵）":"均勢或稍好（不到 1.5 個兵）"],["手數",r=>null]];
  const plyOf={};for(const g of done)plyOf[g.i]=g.plies;groups[3][1]=r=>plyOf[r.gi]<10?"不到 10 手的盤":plyOf[r.gi]<40?"10～39 手的盤":"40 手以上的盤";
  for(const[gn,fn]of groups){const by=new Map();for(const r of rows){const k=fn(r);if(k==null)continue;if(!by.has(k))by.set(k,[]);by.get(k).push(r)}out.groups[gn]={};
    P("");P(`### 依${gn}`);P(`| ${gn} | 盤 | 步 | 電腦各檔互比的評語相同 %：${pairsOf(bud).map(([a,b])=>TN[a]+"→"+TN[b]).join("／")} | 有手機評等的步（主表口徑） | 手機 vs 各檔評等相同 %：${tiers.map(t=>TN[t]).join("／")} | 手機 vs 各檔一字不差 %：${tiers.map(t=>TN[t]).join("／")} |`);P("|---|---|---|---|---|---|---|");
    for(const[k,R]of[...by.entries()].sort((a,b)=>b[1].length-a[1].length)){const pc=pairsOf(bud).map(([a,b])=>pct(R.filter(r=>r.T[a].q===r.T[b].q).length,R.length)),M=R.filter(r=>r.pq&&!r.old),pv=tiers.map(t=>M.length?phoneVs(M,t):null);
      out.groups[gn][k]={games:new Set(R.map(r=>r.gi)).size,n:R.length,pc,phoneN:M.length,phone:pv.map(v=>v&&v.samePct),note:pv.map(v=>v&&v.notePct)};
      P(`| ${k}${R.length<100?"（樣本太少）":""} | ${new Set(R.map(r=>r.gi)).size} | ${R.length} | ${pc.map(f).join("／")} | ${M.length} | ${pv.map(v=>v?v.samePct:"—").join("／")} | ${pv.map(v=>v?v.notePct:"—").join("／")} |`)}}
  P("");P("## 檔案雜湊（SHA-256）");for(const[k,v]of Object.entries(cfg.sha||{}))P(`- \`${k}\`：\`${v}\``);P(`- \`xiangqi-db/m/05-settings.js\` 的 GRADES…gameReport 那一段：\`${cfg.settingsSha}\``);P(`- App 產生評語的那幾行（\`m/10d-coach.js\` pgnNote、\`m/00-util.js\` evt）：\`${cfg.noteSha}\``);P(`- PGN 檔：\`${cfg.pgnSha}\``);
  return{md:L.join("\n"),out,rows,me}}
module.exports={EBP_VER,TIERX,KEEPX,ORDER,parsePgn,readGame,parseNote,evOf,loadNote,oppKind,whoIsMe,stat,asItem,runnable,run,oldStyle,normOld,capOf,evCat,kindGroup,loadRun,rowsOf,phoneVs,agreeMatrix,bootAgree,splitVotes,capCompare,forCompare,report};
if(require.main===module){const argv=process.argv.slice(2),opt=(k,d)=>{const i=argv.indexOf(k);return i>=0?argv[i+1]:d},has=k=>argv.includes(k);
  (async()=>{
    if(has("--stat")){console.log(stat(parsePgn(fs.readFileSync(path.resolve(opt("--pgn")),"utf8"))));return}
    if(has("--run")&&opt("--pgn")&&opt("--out")&&opt("--app")){const[pi,pn]=String(opt("--part","1/1")).split("/").map(Number);
      await run({pgn:path.resolve(opt("--pgn")),out:path.resolve(opt("--out")),app:+opt("--app"),tiers:String(opt("--tiers","quarter,app,high")).split(","),pi,pn,maxMs:+opt("--max-min",9)*60000});return}
    if(has("--report")&&opt("--report")){const R=report(path.resolve(opt("--report")),{me:opt("--me"),boot:+opt("--boot",2000),tiers:opt("--tiers")?String(opt("--tiers")).split(","):null});console.log(R.md);if(opt("--md"))fs.writeFileSync(path.resolve(opt("--md")),R.md+"\n");if(opt("--json"))fs.writeFileSync(path.resolve(opt("--json")),JSON.stringify(R.out,null,1));return}
    console.error("用法見檔頭");process.exitCode=1})().then(()=>process.exit(process.exitCode||0),e=>{console.error(e);process.exit(1)})}   /* 引擎的 wasm 會讓事件迴圈一直活著，跑完要自己結束 */
