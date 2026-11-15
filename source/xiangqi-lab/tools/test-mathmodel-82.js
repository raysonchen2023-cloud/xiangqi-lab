// 數學模型：ChatGPT 第五次重評（story/chatgpt_app/數學模型81修正後_三視角重評_2026-11-15.md 第三、四節）的改善單＋開發者決定的引擎預算敏感度檢查，回歸測試。
//   P2 每一對算法各自算人數與來源（tools/mx-compare.js v4）：重評重現的案例——ACPL 對 base 的 120 盤全部來自同一個人，另外 20 個人只有失誤率，
//      原本整體 21 人就過了人數門檻；現在人數只看那一對自己的盤，一個人的資料標「單人探索」。
//   P2 用語與總結範圍：「同方向／部分一致／分歧」改成探索性的「排序關聯較高／中等／較低」；總結寫「可比較的 k／3 項」，跨玩家與探索分開。
//   文件：預先驗證方案 v1.3（v1.2 凍結不動）、外部公式參考 v3。
//   引擎分析預算敏感度（tools/engine-budget-check.js）：抽樣只跟種子有關、可以中斷續跑、比較兩個預算的統計；這裡用假的評估函式跑 App 真正的 classifyRaw 與賽後報告，不啟動引擎。
// 這一輪沒有改 xiangqi-db/m/ 與 xiangqi-lab/src/ 底下任何檔。
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),path=require("path");
const LAB=path.join(__dirname,".."),DBD=path.join(LAB,"../xiangqi-db");
const rd=f=>fs.readFileSync(f,"utf8").replace(/\r\n/g,"\n");
const MXC=path.join(__dirname,"mx-compare.js"),EBC=path.join(__dirname,"engine-budget-check.js"),MAN=path.join(__dirname,"mx-manifest.js"),MANJ=path.join(__dirname,"mx-manifest.json");
const NO_MXC="沒有 mx-compare.js（離線比較工具只在開發者電腦，公開副本沒有）",NO_EBC="沒有 engine-budget-check.js（引擎預算敏感度工具只在開發者電腦，公開副本沒有）";
function mkRnd(s){return()=>{s=(s*1103515245+12345)%2147483648;return s/2147483648}}
/* 直接給「診斷用」的盤（跟重評的獨立案例同一種寫法）：id、來源、匿名碼、base、三種對照算法 */
const G1=(i,aid,o)=>({id:"s"+i,src:o.src||"cpu",aid,end:["w","l","d"][i%3],plies:60+(i%4)*40,rank:["新手","業2","業7"][i%3],base:{v:o.base,how:"exact"},score:{v:80,how:"exact"},old:null,alt:{acpl:o.acpl==null?null:o.acpl,er:o.er==null?null:o.er,mm:o.mm==null?null:o.mm,mmN:o.mm==null?0:40}});
const KEYS={byEnd:[g=>({w:"贏",l:"輸",d:"和"})[g.end],["贏","輸","和"]]};

// ====================== P2：每一對算法各自算人數與來源 ======================
test("P2：重評重現的案例——ACPL 對 base 的 120 盤全來自同一個匿名碼、另外 20 個匿名碼只有失誤率：ACPL 那一對是 1 人，標「單人探索」，不能借別人的人數算成跨玩家",t=>{
  if(!fs.existsSync(MXC))return t.skip(NO_MXC);const X=require(MXC);
  const G=Array.from({length:120},(_,i)=>G1(i,"one-player",{base:40+i/4,acpl:200-i})).concat(Array.from({length:20},(_,i)=>G1(i+120,"other-"+i,{base:70+i/4,er:20-i/2}))),T=X.triangulate(G,{});
  assert.equal(T.people,21,"整體看是 21 人");assert.equal(T.vs.acpl.n,120);assert.equal(T.vs.acpl.people,1,"但 ACPL 這一對只有 1 人");assert.deepEqual(T.vs.acpl.src,{cpu:120,local:0});assert.deepEqual(T.vs.acpl.perPerson,{min:120,med:120,max:120,topPct:100});
  assert.equal(T.vs.er.n,20);assert.equal(T.vs.er.people,20);assert.equal(T.vs.mm.n,0);assert.equal(T.vs.mm.people,0);
  assert.equal(T.read.acpl.scope,"單人探索");assert.equal(T.each.acpl,"〔單人探索〕排序關聯較高");assert.equal(T.each.er,"資料不足","20 盤不到 100 盤");assert.equal(T.each.mm,"資料不足");
  assert.deepEqual(T.summary,{comparable:1,of:3,cross:{n:0,lowest:null},explore:{n:1,lowest:"排序關聯較高",single:1}});assert.equal(T.verdict,"可比較的 1／3 項：單人或少數人探索 1 項，其中最低的是「排序關聯較高」（不能說成跨玩家的結果）");assert.doesNotMatch(T.verdict,/跨玩家 \d+ 項/);
});
test("P2：人數門檻只看那一對自己的盤——同一批資料裡，一對 25 人算跨玩家，另一對只有 3 人標「少數人探索：3 人」，第三對是單一本機檔標「單人探索」",t=>{
  if(!fs.existsSync(MXC))return t.skip(NO_MXC);const X=require(MXC),rnd=mkRnd(5),G=[];
  for(let i=0;i<150;i++){const b=50+rnd()*45;G.push(G1(i,"a"+(i%25),{base:b,acpl:(100-b)*3+rnd()*5}))}            /* ACPL：25 個匿名碼各 6 盤 */
  for(let i=0;i<120;i++){const b=50+rnd()*45;G.push(G1(200+i,"b"+(i%3),{base:b,er:(100-b)/4+rnd()*9}))}            /* 失誤率：只有 3 個匿名碼 */
  for(let i=0;i<110;i++){const b=50+rnd()*45;G.push(G1(400+i,"本機匯出#1",{src:"local",base:b,mm:rnd()*100}))}     /* 首選一致率：一份本機檔，而且跟 base 無關 */
  const T=X.triangulate(G,KEYS);assert.equal(T.people,29);
  assert.deepEqual([T.vs.acpl.n,T.vs.acpl.people,T.vs.er.n,T.vs.er.people,T.vs.mm.n,T.vs.mm.people],[150,25,120,3,110,1]);assert.deepEqual(T.vs.mm.src,{cpu:0,local:110});assert.deepEqual(T.vs.acpl.perPerson,{min:6,med:6,max:6,topPct:4});assert.equal(T.vs.er.perPerson.max,40);
  assert.equal(T.each.acpl,"排序關聯較高");assert.match(T.each.er,/^〔少數人探索：3 人〕排序關聯(中等|較高)$/);assert.equal(T.each.mm,"〔單人探索〕排序關聯較低");
  assert.deepEqual(T.summary.cross,{n:1,lowest:"排序關聯較高"});assert.equal(T.summary.explore.n,2);assert.equal(T.summary.explore.lowest,"排序關聯較低");assert.equal(T.summary.explore.single,1);assert.equal(T.summary.comparable,3);
  assert.equal(T.verdict,"可比較的 3／3 項：跨玩家 1 項，其中最低的是「排序關聯較高」；單人或少數人探索 2 項，其中最低的是「排序關聯較低」（不能說成跨玩家的結果）");
  /* 19 人還不算跨玩家、20 人才算（分流數字，不是保證） */
  const mk=n=>X.triangulate(Array.from({length:120},(_,i)=>G1(i,"p"+(i%n),{base:40+i/3,acpl:300-i})),{}).read.acpl;assert.equal(mk(19).scope,"少數人探索");assert.equal(mk(20).scope,"跨玩家");assert.equal(mk(1).scope,"單人探索");
  assert.equal(T.byGroup.byEnd["贏"].people>0,true);assert.ok(T.top.every(u=>"aid" in u));
});
test("P2：readPair 的規格——盤數不到 100 或算不出相關＝資料不足（不看人數）；標籤只有三級，門檻 0.7／0.4 的整點歸屬固定",t=>{
  if(!fs.existsSync(MXC))return t.skip(NO_MXC);const X=require(MXC),r=(n,rho,people)=>X.readPair({n,rho,people});
  assert.deepEqual([...X.TRI_LV],["排序關聯較高","排序關聯中等","排序關聯較低"]);assert.deepEqual({...X.TRI},{minN:100,minPeople:20,mmMin:10,hi:.7,lo:.4,kMin:25},"分流數字沒有動（不靠調高它們補效度）");
  assert.deepEqual(r(99,.95,50),{ok:false,level:null,scope:null,label:"資料不足"});assert.equal(r(100,null,50).label,"資料不足");
  assert.equal(r(100,.7,20).label,"排序關聯較高");assert.equal(r(100,.6999,20).label,"排序關聯中等");assert.equal(r(100,.4,20).label,"排序關聯中等");assert.equal(r(100,.3999,20).label,"排序關聯較低");assert.equal(r(100,-.2,20).label,"排序關聯較低");
  assert.equal(r(500,.9,19).label,"〔少數人探索：19 人〕排序關聯較高");assert.equal(r(500,.9,1).label,"〔單人探索〕排序關聯較高");assert.equal(r(500,.1,2).label,"〔少數人探索：2 人〕排序關聯較低");
});
test("〔混合〕P2：報表每一對列盤數、人數與來源；標題與說明寫明是探索性的分流標籤、不是合格線，沒有「同方向／分歧／整體判讀」這些字",t=>{
  if(!fs.existsSync(MXC))return t.skip(NO_MXC);const X=require(MXC),K=X.loadMXS(),v=K.MXS.ver,rnd=mkRnd(9);
  const mk=(n,tag)=>Array.from({length:n},(_,i)=>{const b=60+rnd()*35;return X.normLocal({id:tag+i,v,o:[80,"A"],n:[Math.round(b),"A"],x:[Math.round(b),Math.round(b),["w","d"][i%2]],b:Math.round(b*10)/10,g:[80,40,1,"cpu",5,"業2",1,0,0],a:[Math.round((100-b)*3),Math.round(b-20),40,Math.round((100-b)/4)]},tag)});
  const S=X.summarize(mk(130,"本機匯出#1"),K),txt=X.report(S,[]);assert.equal(S.toolVer,4);
  assert.match(txt,/## 算法之間的排序比較（探索性的分流標籤，不是合格線）/);assert.match(txt,/\| base 對上 \| 這一對的盤數 \| 這一對的人數與來源 \|/);assert.match(txt,/\| 每步平均失分 ACPL \| 130 \| 1 人（匿名 0 盤、本機 130 盤；每人 130～130 盤，最多的一人佔 100%） \|[^|]+\|[^|]+\| 〔單人探索〕排序關聯較高 \|/);
  assert.match(txt,/不是準確度，不是棋力已經驗證/);assert.match(txt,/關聯較低也不代表哪個算法失效/);assert.match(txt,/100 盤不等於 100 個獨立玩家/);assert.match(txt,/證明不了絕對分數、S～D 或公平性/);assert.match(txt,/總結（只看盤數足夠的項目；跨玩家與探索分開）：可比較的 3／3 項：單人或少數人探索 3 項/);
  assert.doesNotMatch(txt,/同方向|部分一致|整體判讀|算法三角對照/);assert.doesNotMatch(txt,/分歧/,"不用「分歧」當標籤");
  const src=rd(MXC);assert.match(src,/const MXC_VER = 4;/);assert.match(src,/人數門檻按每一對自己的資料算/);assert.match(src,/不要求三項都有才總結/);
});

// ====================== 文件 ======================
test("〔原始碼〕預先驗證方案 v1.3：三類證據分開、分流數字不是通過條件、mm 的名稱、便利樣本、總結的精確規格、併入開發者決定；v1.2 凍結不動（雜湊跟紀錄一樣）",t=>{
  const f=path.join(DBD,"story/數學模型_預先驗證方案_v1.3.md");if(!fs.existsSync(f))return t.skip("沒有 story/數學模型_預先驗證方案_v1.3.md（文件只在開發者電腦，公開副本沒有）");const D=rd(f);
  for(const k of["版本 v1.3","## 零、三類證據，不要混在一起","①單元與邊界測試","②算法間比較","③外部效度","**①②做得再多，都不能取代③。**","## 十、算法之間的排序比較","探索性的分流數字，不是通過條件、不是合格線","不靠把它們調高（0.8、0.9）來補效度","100 盤不等於 100 個獨立玩家","五等分的 κ 只比相對分組","把所有人的分數都平移 20 分",
    "關聯較低不代表哪個算法失效","那一對自己的人數","〔單人探索〕","可比較的 k／3 項","不要求三項都有才總結","程式、報表標題、這一節三邊一致","不是「Regan 棋力」、不是 IPR、不是反作弊的證據","沒有重現","不是重現他們整套研究","便利樣本","也不為了這批樣本降低門檻","暫時不找","等有評閱者再一起定稿","不做。盲評只用開發者和測試者的棋","等真的要切換時再決定","維持門檻 th > 8 分","等有同段位基準資料再訂","開發者自己看","這一版之後不再送 ChatGPT 重評","| v1.3 | 2026-11-15 |","真人資料仍是 0 盤","engine-budget-check.js"])assert.ok(D.includes(k),"v1.3 裡要有「"+k+"」");
  /* 第五節的門檻與失敗條件沒有被順手改掉 */
  for(const k of["\\|偏差\\| ≤ 3，而且 95% 區間整個在 ±5 以內","Δρ 的區間下界 > −0.05，而且 ρ(候選) 的區間下界 ≥ 0.4","10. 資料無效的盤 > 2% 而查不出原因。"])assert.ok(D.includes(k.replace(/\\\\/g,"\\")),"第五節原文還在："+k);
  assert.doesNotMatch(D.replace(/\| v1\.[23] \| 2026-11-15 \|[^\n]*/g,""),/算法三角對照|同方向|部分一致/,"v1.3 正文不再用舊名稱（修訂紀錄裡 v1.2、v1.3 那兩列講的是改了什麼）");
  if(fs.existsSync(MAN)&&fs.existsSync(MANJ)){const X=require(MAN),rec=JSON.parse(rd(MANJ)),now=X.compute();assert.equal(rec.docs.planVer,"v1.3");assert.equal(now.docs.planV12.sha,rec.docs.planV12.sha);assert.doesNotMatch(rd(path.join(DBD,"story/數學模型_預先驗證方案_v1.2.md")),/已由 v1\.3 取代/,"v1.2 已凍結，沒有回頭加註")}
});

// ====================== 引擎分析預算敏感度（工具本身；不啟動引擎） ======================
const item=(id,n,o)=>({id,name:id,result:(o&&o.result)||"紅勝",board:(o&&o.board)||null,lines:[{moves:Array.from({length:n},()=>[0,0])}]});
test("預算敏感度：抽棋局只跟種子與盤數有關——同樣的種子抽到同一批、不同種子不一樣；只抽標準開局、有勝負和、主線 40～120 手的盤",t=>{
  if(!fs.existsSync(EBC))return t.skip(NO_EBC);const X=require(EBC),items=[];
  for(let i=0;i<300;i++)items.push(item("g"+i,30+(i*7)%120,{result:["紅勝","黑勝","和局","未知"][i%4],board:i%10===0?"fen":null}));
  const ok=items.filter(X.eligible);assert.ok(ok.length>50&&ok.length<300);for(const g of ok){assert.equal(g.board,null);assert.notEqual(g.result,"未知");assert.ok(g.lines[0].moves.length>=40&&g.lines[0].moves.length<=120)}
  assert.equal(X.eligible(item("x",39)),false);assert.equal(X.eligible(item("x",40)),true);assert.equal(X.eligible(item("x",120)),true);assert.equal(X.eligible(item("x",121)),false);assert.equal(X.eligible({id:"x"}),false);
  const a=X.sample(items,20,7),b=X.sample(items,20,7),c=X.sample(items,20,8);assert.equal(a.pool,ok.length);assert.equal(a.games.length,20);assert.deepEqual(a.games.map(g=>g.id),b.games.map(g=>g.id));assert.notDeepEqual(a.games.map(g=>g.id),c.games.map(g=>g.id));assert.equal(new Set(a.games.map(g=>g.id)).size,20);
  assert.equal(X.sample(items,9999,7).games.length,ok.length,"要的比有的多：全拿，不重複");assert.deepEqual([X.winnerOf({result:"紅勝"}),X.winnerOf({result:"黑勝"}),X.winnerOf({result:"和局"})],["r","b",""]);assert.deepEqual({...X.TIERS},{quarter:.25,app:1,high:4});
});
/* 一盤真的合法的棋（從標準開局隨機走），配一個假的評估函式：分數只跟局面與「預算」有關，預算越高雜訊越小 */
function fakeGame(seed,plies){const C=require("../site/core.js"),rnd=mkRnd(seed);let b=C.parseFen(C.START),s="r";const mv=[];for(let i=0;i<plies;i++){const L=C.legal(b,s);if(!L.length)break;const[f,t]=L[Math.floor(rnd()*L.length)];mv.push([f,t]);b=C.make(b,f,t);s=C.opp(s)}return{id:"fake"+seed,name:"合成",result:"和局",board:null,lines:[{moves:mv}]}}
function fakeEval(noise){const C=require("../site/core.js"),h=s=>{let x=2166136261;for(let i=0;i<s.length;i++){x^=s.charCodeAt(i);x=Math.imul(x,16777619)}return(x>>>0)/4294967296};
  return async(b,s,ms,mpv)=>{const L=C.legal(b,s);if(!L.length)return{lines:[],dead:true};const fen=C.fen(b,s),sc=L.map(([f,t])=>{const mvs=C.iccs(f,t);return{mv:mvs,v:Math.round((h(fen+mvs)-.5)*300+(h(fen+mvs+"n")-.5)*noise)}}).sort((p,q)=>q.v-p.v).slice(0,mpv||1);
    return{lines:sc.map((x,i)=>({k:i+1,v:x.v,mv:x.mv,pv:[x.mv],depth:10,mate:null})),nodes:1000,depth:10}}}
test("預算敏感度：用 App 真正的 classifyRaw 與賽後報告算一盤（假的評估函式，不啟動引擎）——每一步有評語、首選、殺棋欄位，雙方各有舊總分、影子 base／score、三種對照算法；中斷續跑的結果跟一次跑完一模一樣",async t=>{
  if(!fs.existsSync(EBC))return t.skip(NO_EBC);const X=require(EBC),A=X.loadReport(),g=fakeGame(3,60),ev=fakeEval(0);assert.equal(g.lines[0].moves.length,60);
  const full=await X.analyzeGame(g,ev,A);assert.equal(full.moves.length,60);assert.equal(full.partial,undefined);
  for(const m of full.moves){assert.ok(["妙著","正著","穩著","緩著","失著","敗著"].includes(m.q));assert.match(m.bm,/^[a-i]\d[a-i]\d$/);assert.ok(m.hit===0||m.hit===1);assert.ok("bmt" in m&&"pmt" in m);assert.ok(m.loss>=0)}
  for(const k of["r","b"]){const s=full.sides[k];assert.equal(s.n,30);assert.ok(s.old>=0&&s.old<=100);assert.ok("SABCD".includes(s.oldG)&&"SABCD".includes(s.grade));assert.ok(s.base>0&&s.base<=100);assert.ok(s.acpl>=0&&s.er>=0&&s.mm>=0&&s.mm<=100);assert.equal(s.labels.length,30)}
  assert.ok(full.searches>=60&&full.searches<=120,"每一步 1～2 次搜尋："+full.searches);assert.equal(A.MXS.ver,4);
  /* 做到一半時間到 → 回 partial；拿 partial 接著做 → 跟一次跑完相同（搜尋次數也一樣） */
  let calls=0;const slow=async(...a)=>{calls++;return ev(...a)},p1=await X.analyzeGame(g,slow,A,{deadline:Date.now()-1});assert.ok(p1.partial);assert.equal(p1.partial.moves.length,0);assert.equal(calls,0);
  let n=0;const stopAt=async(...a)=>{n++;return ev(...a)},dl={get deadline(){return n>=25?Date.now()-1:Date.now()+1e6}},p2=await X.analyzeGame(g,stopAt,A,dl);assert.ok(p2.partial&&p2.partial.moves.length>10&&p2.partial.moves.length<60);
  const rest=await X.analyzeGame(g,ev,A,{resume:JSON.parse(JSON.stringify(p2.partial))});assert.deepEqual(rest.moves,full.moves);assert.deepEqual(rest.sides,full.sides);assert.equal(rest.searches,full.searches);
});
test("預算敏感度：compare——同一個預算比自己，全部相同、沒有換級；評估有雜訊的「低預算」比沒有雜訊的「高預算」，評語相同的比例下降、分數差與換級數得出來；報表列設定、每一步、每一方與最不穩定的盤",async t=>{
  if(!fs.existsSync(EBC))return t.skip(NO_EBC);const X=require(EBC),A=X.loadReport(),games=[];
  for(let i=0;i<6;i++){const g=fakeGame(20+i,50+i*4),lo=await X.analyzeGame(g,fakeEval(260),A),hi=await X.analyzeGame(g,fakeEval(0),A);games.push({i,id:g.id,name:g.name,result:g.result,plies:g.lines[0].moves.length,tiers:{app:lo,high:hi}})}
  const same=X.compare(games,"high","high");assert.equal(same.ply.labelSame,100);assert.equal(same.ply.bestSame,100);assert.equal(same.side.oldFlip,0);assert.equal(same.side.gradeFlip,0);assert.equal(same.side.base.max,0);assert.equal(same.ply.bmtDiff,0);assert.equal(same.sides,12);assert.equal(same.games,6);
  const c=X.compare(games,"app","high");assert.equal(c.sides,12);assert.equal(c.ply.n,games.reduce((s,g)=>s+g.plies,0));assert.ok(c.ply.labelSame<95,"評語相同 "+c.ply.labelSame+"%");assert.ok(c.ply.bestSame<95);assert.ok(c.side.old.meanAbs>0&&c.side.base.meanAbs>0);assert.ok(c.side.old.max>=c.side.old.p90&&c.side.old.p90>=c.side.old.med);
  assert.equal(c.side.oldFlipN,c.unstable.length?games.flatMap(g=>["r","b"].map(k=>g.tiers.app.sides[k].oldG!==g.tiers.high.sides[k].oldG)).filter(Boolean).length:0);assert.equal(c.unstable.length,10);assert.ok(Math.max(Math.abs(c.unstable[0].dOld),Math.abs(c.unstable[0].dScore))>=Math.max(Math.abs(c.unstable[9].dOld),Math.abs(c.unstable[9].dScore)),"照分數差由大到小排");
  assert.ok(c.ply.trans.length>0&&c.ply.trans[0][1]>=c.ply.trans[c.ply.trans.length-1][1]);
  const R=X.report(games,{seed:1,games:6,pool:99,app:1000,tiers:["app","high"],mxs:4,sha:{"a":"b"},settingsSha:"c"});assert.equal(R.done,6);assert.equal(R.pairs.length,1);
  for(const k of[/# 引擎分析預算敏感度：結果/,/三檔都跑完的 \*\*6 盤\*\*/,/app（1000 節點）、app×4（4000 節點）/,/Threads 1、Hash 16 MB、每次搜尋前 ucinewgame/,/## 每一步（相鄰兩檔比/,/的失著、敗著：低預算標了 \d+ 步、高預算標了 \d+ 步/,/各方分數的排序穩不穩（等級相關）/,/## 每一方的一盤分數/,/## 最不穩定的 10 個一方（app → high）/,/## 檔案雜湊（SHA-256）/])assert.match(R.md,k);
  /* 還沒跑完的盤不進報表 */
  const R2=X.report(games.concat({i:9,id:"half",plies:50,tiers:{app:games[0].tiers.app}}),{seed:1,games:7,pool:99,app:1000,tiers:["app","high"],mxs:4});assert.equal(R2.done,6);
});
test("〔原始碼〕預算敏感度工具只讀 App 的檔、用節點數當預算、不送任何東西；結果文件寫明它只檢查分析可靠性",t=>{
  if(!fs.existsSync(EBC))return t.skip(NO_EBC);const s=rd(EBC);assert.match(s,/const EBC_VER=1,THREADS=1,HASH=16,MIN_PLY=40,MAX_PLY=120,TIERS=\{quarter:\.25,app:1,high:4\}/);assert.match(s,/send\("ucinewgame"\);await ask\("isready"/);assert.match(s,/lim\.nodes\?"go nodes "\+lim\.nodes/);
  assert.doesNotMatch(s,/fetch\(|https?:\/\/|XQNet|shareIRT|writeFileSync\([^)]*(MDIR|"m")/,"不連網、不寫 App 的檔");assert.match(s,/它不回答「分數有沒有量到棋力」/);
  const f=path.join(DBD,"story/數學模型_引擎預算敏感度_1115.md");if(!fs.existsSync(f))return;const D=rd(f);for(const k of["怎麼重跑","節點","Threads 1","種子 20261115","只檢查分析可靠性","不代替人類效度","大師對局不代表一般玩家","pikafish.nnue","最不穩定"])assert.ok(D.includes(k),"結果文件裡要有「"+k+"」");
});
