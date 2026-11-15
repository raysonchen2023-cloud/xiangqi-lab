// 黑洞・星門圍城＋車輪戰「真引擎基準」工具 xiangqi-lab/tools/siege-wheel-bench.js 的測試（第 19 輪外部評審改善清單第 8 項，11/15）。
//   不開瀏覽器。真引擎那幾項會在 Node 裡跑 App 自己的網頁版 Pikafish（site/engine/pikafish.wasm），每次啟動約 2～4 秒；引擎載不了就略過（不算通過）。
//   同一個種子跑兩次結果相同、每局輸出欄位齊全、星樞用的是 App 原檔（不是另外寫的一份）、覆寫數值只改記憶體、摘要與倒掛的算法。
// 用法：node --test xiangqi-lab/tools/test-siege-wheel-bench.js
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),path=require("path"),os=require("os"),cp=require("child_process");
const ROOT=path.join(__dirname,"../.."),TOOL=path.join(__dirname,"siege-wheel-bench.js");
const B=require(TOOL),C=require(path.join(ROOT,"xiangqi-lab/site/core.js"));
const rd=p=>fs.readFileSync(path.join(ROOT,p),"utf8");
const TMP=fs.mkdtempSync(path.join(os.tmpdir(),"swb-"));
test.after(()=>{try{fs.rmSync(TMP,{recursive:true,force:true})}catch(e){}});
/* 真的用命令列跑一次（跟開發者重跑的方式一樣）；回 {code,json} */
function cli(name,extra){const out=path.join(TMP,name+".json"),r=cp.spawnSync(process.execPath,[TOOL,"--quiet","--out",out].concat(extra),{encoding:"utf8",timeout:240000});
  return{code:r.status,err:r.stderr,json:r.status===0?JSON.parse(fs.readFileSync(out,"utf8")):null}}
const SMALL=["--mode","all","--lv","1","--ver","normal,hard","--players","greedy,td","--seeds","1"];
let RUN1=null;const run1=()=>RUN1||(RUN1=cli("a",SMALL));

test("載入的是 App 原檔：GSV 十二關＋車輪戰三盤、window.XQ_TD 是 07bhg 包過的那一層", ()=>{const A=B.loadApp();
  assert.deepEqual(Object.keys(A.G.LV).map(Number).sort((a,b)=>a-b),[1,2,3,4,5,6,7,8,9,10,11,12,101,102,103]);
  assert.equal(A.XQ.gsv,1);assert.equal(typeof A.XQ.engine,"function");assert.equal(typeof A.XQ.pick,"function");assert.equal(typeof A.W.step,"function");
  /* 接線真的把星門圍城的盤交給 GSV：開一盤、叫 XQ_TD.engine，拿到的是 GSV.engine 的設定（gsv:1、深度＝關卡的 depth、MultiPV 8） */
  const P={human:"r",start:A.G.startFen(3,C),startTurn:"r",moves:[]};C.stateRebuild(P);P.td=A.XQ.boot({mode:A.G.MODE,lv:3,ch:"x_swordboy",L:1,hard:0},P,C);P.turn="b";
  const cfg=A.XQ.engine(P,C);assert.equal(cfg.gsv,1);assert.equal(cfg.depth,A.G.LV[3].depth);assert.equal(cfg.mpv,8);
  P.td=A.XQ.boot({mode:A.G.MODE,lv:3,ch:"x_swordboy",L:1,hard:1},P,C);assert.equal(A.XQ.engine(P,C).depth,Math.min(4,A.G.LV[3].depth+A.G.HARD.depth),"困難版多想一步")});

test("亂數與種子：同一個字串同一串亂數，不同字串不同", ()=>{const a=B.rng(B.seedOf("siege|3|0|7|星樞")),b=B.rng(B.seedOf("siege|3|0|7|星樞")),c=B.rng(B.seedOf("siege|3|0|8|星樞"));
  const A1=[a(),a(),a()],B1=[b(),b(),b()],C1=[c(),c(),c()];assert.deepEqual(A1,B1);assert.notDeepEqual(A1,C1);for(const v of A1)assert.ok(v>=0&&v<1)});

test("覆寫數值 --set／--patch：只改這個程序記憶體裡那一份，不寫回 App 的檔；不合法的擋下來", ()=>{
  const before=B.sources(),A=B.loadApp(),atk0=A.G.LV[3].atk,hard0=A.G.HARD.atk;
  const p=B.parseSet("3.atk=77;LV.8.hp=111;HARD.atk=5;HARDX.3.esk=[]");assert.deepEqual(p,{LV:{3:{atk:77},8:{hp:111}},HARD:{atk:5},HARDX:{3:{esk:[]}}});
  B.applyPatch(A,p);assert.equal(A.G.LV[3].atk,77);assert.equal(A.G.LV[8].hp,111);assert.equal(A.G.lvOf(3,1).atk,77+5);assert.deepEqual(A.G.lvOf(3,1).esk,[]);
  assert.deepEqual(B.sources(),before,"App 的檔沒有被改");
  const A2=B.loadApp();assert.equal(A2.G.LV[3].atk,atk0);assert.equal(A2.G.HARD.atk,hard0,"重新載入就是原本的數值");
  assert.deepEqual(B.mergePatch({LV:{3:{atk:1}},HARD:{atk:2}},{LV:{3:{hp:9}},HARD:{depth:0}}),{LV:{3:{atk:1,hp:9}},HARD:{atk:2,depth:0}});
  assert.throws(()=>B.applyPatch(B.loadApp(),{LV:{99:{hp:1}}}),/沒有第 99 關/);
  assert.throws(()=>B.applyPatch(B.loadApp(),{LV:{3:{open:[["k",5,10]]}}}),/不合法/,"覆寫後的關卡還是要過 GSV.lvCheck");
  assert.throws(()=>B.parseSet("3.atk"),/路徑=值/);assert.throws(()=>B.parseSet("3.atk=abc"),/JSON/)});

test("貪心吃子的下法：能吃就吃基礎值最大的；沒子可吃就不白送子", async()=>{const A=B.loadApp(),PL=B.mkPlayers(A),g=PL.get("greedy");
  const mk=pcs=>{const b=new Array(90).fill(null);for(const[p,lu,xi]of pcs)b[A.G.LSQ(lu,xi)]=p;return{board:b,turn:"r"}};
  /* 紅俥 a1 同時能吃 a5 的卒（4）和 a1 橫線上的車（14）→ 吃車 */
  const P1=mk([["K",5,1],["k",4,10],["R",1,1],["p",1,5],["r",3,1]]);const d1=await g({P:P1,R:B.rng(1)});assert.equal(P1.board[d1.mv[1]],"r");assert.match(d1.why,/吃/);
  /* 沒子可吃：每一步走完都不能讓星樞白吃到俥 */
  const P2=mk([["K",5,1],["k",4,10],["R",1,1],["r",2,10]]);for(let s=1;s<=20;s++){const d=await g({P:P2,R:B.rng(s)});assert.equal(PL.hangLoss(C.make(P2.board,d.mv[0],d.mv[1])),0,"種子 "+s+" 白送了子")}
  /* 開局變化「下法@N」：前 N 個主要行動隨機（不白送子），之後才照原本的下法 */
  const o1=PL.get("greedy@1"),P3=Object.assign(mk([["K",5,1],["k",4,10],["R",1,1],["p",1,5],["r",3,1]]),{moves:[],td:{dep:0}});
  const a=await o1({P:P3,R:B.rng(3)});assert.match(a.why,/開局變化/);assert.equal(PL.hangLoss(C.make(P3.board,a.mv[0],a.mv[1])),0);
  P3.moves=[{by:"r"},{by:"b"}];const b2=await o1({P:P3,R:B.rng(3)});assert.equal(P3.board[b2.mv[1]],"r","第 2 個行動起照貪心吃子");
  P3.moves=[];P3.td.dep=1;assert.match((await o1({P:P3,R:B.rng(3)})).why,/吃/,"部署也算一個主要行動");
  assert.throws(()=>PL.get("td@0"),/1～10/);assert.throws(()=>PL.get("nope@2"),/沒有這種下法/);
  assert.throws(()=>PL.get("nope"),/沒有這種下法/);assert.equal(typeof PL.get("eng4"),"function");assert.equal(typeof PL.get("td"),"function")});

test("摘要、Wilson 區間、難度倒掛的算法（假資料）", ()=>{
  const mk=(lv,ver,res,en)=>({mode:"siege",lv,name:"關"+lv,ver,player:"td",L:1,result:res,why:res==="win"?"星樞星核歸零":"我方星核歸零",rounds:20,plies:40,ms:100,me:{hp:res==="win"?50:0,max:100},en:{hp:en,max:100},src:{r:{inv:10},b:{cap:5}},foe:{hp:100,atk:90,def:10},engine:{depth:[3]},log:["R a0a4","B h7b7"]});
  const runs=[];for(let i=0;i<10;i++){runs.push(mk(1,"normal",i<8?"win":"loss",i<8?0:20));runs.push(mk(2,"normal","loss",80));runs.push(mk(3,"normal",i<5?"win":"loss",i<5?0:40))}
  /* 第 1 關的 10 局：前 12 個主要行動只有 2 種走法（放招不算），整局棋譜有 3 種 */
  runs.filter(g=>g.lv===1).forEach((g,i)=>{g.log=(i<6?["R a0a4","B h7b7"]:["R a0a5","S qi1(47)","B h7b7"]).concat(i===9?["S gheal"]:[])});
  const S=B.summarize(runs),r=n=>S.siege.find(x=>x.lv===n);assert.equal(r(1).lines12,2);assert.equal(r(1).games,3);assert.equal(r(2).lines12,1);
  assert.equal(r(1).n,10);assert.equal(r(1).win,8);assert.equal(r(1).winPct,80);assert.equal(r(2).winPct,0);assert.equal(r(2).enHpPct,80);assert.equal(r(3).enHpPct,20);assert.equal(r(2).takenBy.inv,10);
  assert.deepEqual(B.wilson(0,0),[0,0]);const w=B.wilson(8,10);assert.ok(w[0]>=44&&w[0]<=50&&w[1]>=94&&w[1]<=97,"8/10 的區間約 49～94："+w);assert.equal(B.wilson(0,40)[0],0);assert.ok(B.wilson(0,40)[1]<=9);
  const inv=B.inversions(S.siege);
  assert.ok(inv.some(x=>x.kind==="win"&&x.lv===2&&x.vs===3&&x.d===50),"第 2 關勝率比第 3 關低 50 點");assert.ok(inv.some(x=>x.kind==="enHp"&&x.lv===2&&x.vs===3&&x.d===60),"第 2 關星樞剩的血比第 3 關多 60 點");
  assert.ok(!inv.some(x=>x.lv===1),"第 1 關最容易，不算倒掛");assert.ok(!inv.some(x=>x.lv===3),"最後一關後面沒有關可以比");
  const md=B.mdReport([{engine:"假的"}],runs);assert.ok(md.includes("不能換算成真人勝率"));assert.ok(md.includes("| 2 關2 | 普通 |"));assert.ok(md.includes("難度倒掛"))});

test("真引擎：同一個種子用命令列跑兩次，每一局的結果完全相同（只有耗時不比）", {timeout:300000}, t=>{const a=run1();if(a.code===2){t.skip("這個環境 Pikafish 在 Node 載不起來："+a.err.trim());return}
  assert.equal(a.code,0,a.err);const b=cli("b",SMALL);assert.equal(b.code,0,b.err);
  assert.equal(a.json.runs.length,6,"第 1 關 × 普通／困難 × 兩種下法 4 局＋車輪戰兩種下法 2 場");
  assert.deepEqual(a.json.runs.map(B.stable),b.json.runs.map(B.stable));
  assert.deepEqual(a.json.meta.sources,b.json.meta.sources);
  /* 換一個種子，棋譜就不一樣（不是寫死的） */
  const c=cli("c",["--mode","siege","--lv","1","--ver","normal","--players","greedy","--seeds","1","--seed0","2"]);assert.equal(c.code,0,c.err);
  assert.notDeepEqual(c.json.runs[0].log,a.json.runs.find(g=>g.mode==="siege"&&g.player==="greedy"&&g.ver==="normal").log)});

test("真引擎：每一局的輸出欄位齊全（關卡、版本、種子、下法、引擎設定、開局、步數、回合、耗時、結局與原因、棋譜）", {timeout:300000}, t=>{const a=run1();if(a.code===2){t.skip("這個環境 Pikafish 在 Node 載不起來");return}
  assert.equal(a.code,0,a.err);const J=a.json,M=J.meta;
  assert.equal(M.schema,B.SCHEMA);assert.equal(M.tool,B.TOOL);assert.ok(M.note.includes("不能換算成真人勝率"));assert.match(M.engine,/Pikafish/);assert.equal(M.engineCfg.threads,1);assert.equal(M.engineCfg.hash,16);assert.equal(M.patch,null);
  assert.ok(M.cmd.includes("--seeds 1"));assert.deepEqual(M.args.players,["greedy","td"]);
  for(const f of["xiangqi-db/m/07bhg-gatesiege.js","xiangqi-db/m/07bhw-wheel.js","xiangqi-db/m/07bht-td.js","xiangqi-lab/site/core.js","xiangqi-lab/site/engine/pikafish.wasm","xiangqi-lab/site/engine/pikafish.nnue"])assert.match(M.sources[f],/^[0-9a-f]{16}$/,f);
  const A=B.loadApp();
  for(const g of J.runs){for(const k of B.RUN_KEYS[g.mode])assert.ok(g[k]!==undefined,g.id+" 少了欄位 "+k);
    assert.ok(["win","loss","draw","cut"].includes(g.result),g.id);assert.ok(typeof g.why==="string"&&g.why.length>0);assert.ok(g.plies>0&&g.rounds>0&&g.ms>=0);assert.ok(g.log.length>=g.plies,"棋譜每一步都有記");
    assert.equal(g.engine.threads,1);assert.equal(g.engine.mpv,8);assert.equal(g.engine.nopv,0,"引擎每次都有回評分");assert.ok(g.engine.searches>0);assert.ok(g.sk.length>=1);
    if(g.mode==="siege"){const V=A.G.lvOf(g.lv,g.hard);assert.equal(g.foe.hp,V.hp);assert.equal(g.foe.atk,V.atk);assert.deepEqual(g.engine.depth,[V.depth],"搜尋深度＝這一關（這個版本）的 depth");
      assert.equal(g.open.fen,A.G.startFen(g.lv,C)+" w");assert.equal(g.open.waves.length,A.G.LV[g.lv].waves.length);assert.equal(g.result==="win",g.w==="r");assert.equal(g.result==="win",Array.isArray(g.stars));
      assert.ok(g.me.max>0&&g.en.max===V.hp)}
    else{assert.equal(g.boards.length,3);assert.equal(g.need,2);assert.equal(g.open.boards.length,3);assert.deepEqual(g.boards.map(b=>b.lv),[101,102,103]);
      const w=g.boards.filter(b=>b.result==="win").length;assert.equal(g.tally.w,w);if(!g.cut)assert.equal(g.win,w>=2,"三盤拿兩勝才算過關");
      if(!g.cut)assert.ok(w>=2||w+g.boards.filter(b=>b.result==="open").length<2,"跑到 WHL 自己判定結束（拿到兩勝，或已經不可能）");
      assert.deepEqual(Object.keys(g.engine.via),["eng／eng"],"星樞每一步都是引擎＋GSV.pick，沒有走逾時退路");assert.equal(g.plies,g.boards.reduce((s,b)=>s+b.plies,0))}}
  assert.equal(J.summary.siege.length,4);assert.equal(J.summary.wheel.length,2);assert.ok(Array.isArray(J.inversions))});

test("真引擎：--set 覆寫真的進到對局裡（星樞 HP 改成 5，一吃子就過關），紀錄裡留著覆寫內容", {timeout:300000}, t=>{const a=run1();if(a.code===2){t.skip("這個環境 Pikafish 在 Node 載不起來");return}
  const c=cli("p",["--mode","siege","--lv","1","--ver","normal","--players","td","--seeds","2","--set","LV.1.hp=5"]);assert.equal(c.code,0,c.err);
  assert.deepEqual(c.json.meta.patch,{LV:{1:{hp:5}}});for(const g of c.json.runs){assert.equal(g.foe.hp,5);assert.equal(g.en.max,5)}
  assert.ok(c.json.runs.some(g=>g.result==="win"),"HP 5 的星樞至少贏得了一盤");
  assert.equal(B.loadApp().G.LV[1].hp,100,"App 的檔沒有被改")});

test("--report：把資料夾裡的結果合併出總表（同一局不重複算）", {timeout:300000}, t=>{const a=run1();if(a.code===2){t.skip("這個環境 Pikafish 在 Node 載不起來");return}
  const dir=path.join(TMP,"rep");fs.mkdirSync(dir,{recursive:true});fs.copyFileSync(path.join(TMP,"a.json"),path.join(dir,"x.json"));fs.copyFileSync(path.join(TMP,"a.json"),path.join(dir,"y.json"));fs.writeFileSync(path.join(dir,"z.json"),"{\"other\":1}");
  const md=path.join(dir,"out.md"),all=path.join(dir,"all.json.txt"),r=cp.spawnSync(process.execPath,[TOOL,"--quiet","--report",dir,"--md",md,"--out",all],{encoding:"utf8"});assert.equal(r.status,0,r.stderr);
  const J=JSON.parse(fs.readFileSync(all,"utf8"));assert.equal(J.runs.length,6,"兩個檔是同一批，合併後還是 6 局");const T=fs.readFileSync(md,"utf8");
  assert.ok(T.includes("## 星門圍城"));assert.ok(T.includes("## 車輪戰"));assert.ok(T.includes("不能換算成真人勝率"));assert.ok(T.includes("| 1 星淵初探 | 困難 |"))});

test("〔原始碼〕工具沒有另外寫一份星樞：載的是 m/ 底下三支原檔、選步只透過 XQ_TD／WHL.step；每局紀錄的說明與 testkinds 登記", ()=>{const S=fs.readFileSync(TOOL,"utf8");
  for(const f of["07bht-td.js","07bhg-gatesiege.js","07bhw-wheel.js"])assert.ok(S.includes('"'+f+'"'),f);
  assert.ok(S.includes("XQ.engine(P,C)")&&S.includes("XQ.pick(r,TD,rndB)")&&S.includes("XQ.move(P,")&&S.includes("W.step(()=>M,Q,C,"));
  for(const k of["function scoreB","function lethalR","function settle(","function foeDeclare"])assert.ok(!S.includes(k),"工具裡不該有自己的 "+k);
  assert.ok(!/puppeteer|playwright|chrome|fetch\(|https?:/i.test(S),"不開瀏覽器、不連網路");
  assert.ok(rd("xiangqi-lab/tools/testkinds.js").includes('"test-siege-wheel-bench.js"'))});
