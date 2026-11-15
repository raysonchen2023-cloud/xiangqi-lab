// 數學模型：ChatGPT 第三次重評（story/chatgpt_app/數學模型79修正後_三視角重評_2026-11-15.md 第三節、第六節）改善單的回歸測試。
//   P1 離線工具的資料資格篩選（tools/mx-compare.js v2）：重評重現的漏洞——重算對不起來的盤（score＝999、base＝80）和沒評完的盤（full:0）仍進分布。
//      現在資料有效性／納入條件／能不能唯一反推三者分開；這裡每一項都驗「警告有出現，而且那一盤確實沒有進統計」，分母逐項核對得起來，比較候選用共同有效盤集合。
//   P1 模擬比例附 Monte Carlo 區間、固定情境與種子、判定規則；序列相關的情境不會被寫成通過（tools/sim-phase-pair.js，SIM_VER 2）。
//   P2 HAC／區塊重抽只在離線模擬裡對照，沒有換進 App。
//   P2 版本與程式雜湊（tools/mx-manifest.js）：建議先練的判斷程序有自己的版本 SK.PICK；程式改了版本沒升會被擋。
//   預先驗證方案 v1.1 的五處補充有寫進文件。
// App 的判斷這一輪沒有改（只多一個版本常數 SK.PICK）；玩家看到的分數、匿名送出的欄位都沒有動。
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),path=require("path"),vm=require("vm"),os=require("os"),cp=require("child_process");
const LAB=path.join(__dirname,".."),DBD=path.join(LAB,"../xiangqi-db"),M=path.join(DBD,"m");
const rd=f=>fs.readFileSync(f,"utf8").replace(/\r\n/g,"\n");
const S=rd(path.join(M,"05-settings.js")),ST=rd(path.join(M,"04-stats.js")),SV=rd(path.join(M,"05b-save.js"));
const C=require("../site/core.js");
const sl=(s,a,b,name)=>{const i=s.indexOf(a),j=s.indexOf(b,i+1);assert.ok(i>=0&&j>i,"找不到 "+(name||a));return s.slice(i,j)};
const SH=sl(S,"function qNow(","\n/* ================= 影子模式","qNow")+"\n"+sl(S,"const MXS={","\nfunction gameReport(","MXS…mxShExport");
const CPA=sl(SV,"const CPA_Q=","\nfunction cpaWatch(","cpaDone");
const MXC=path.join(__dirname,"mx-compare.js"),SIM=path.join(__dirname,"sim-phase-pair.js"),MAN=path.join(__dirname,"mx-manifest.js"),MANJ=path.join(__dirname,"mx-manifest.json");
const NO_MXC="沒有 mx-compare.js（離線比較工具只在開發者電腦，公開副本沒有）",NO_SIM="沒有 sim-phase-pair.js（模擬腳本只在開發者電腦，公開副本沒有）",NO_MAN="沒有 mx-manifest.js／mx-manifest.json（版本紀錄工具只在開發者電腦，公開副本沒有）";
const clamp=C.clampV,oldQ=C.gradeLoss;
function mkRnd(s){return()=>{s=(s*1103515245+12345)%2147483648;return s/2147483648}}
/* 一台假的手機（跟 test-mathmodel-79.js 同一套）：用 App 真正的 cpaDone 產生匿名那一筆 */
function phone(){const mem={},sent=[];
  const ctx={console,isFinite,esc:x=>String(x),Date,Math,JSON,Uint8Array,crypto:{getRandomValues:a=>{for(let i=0;i<a.length;i++)a[i]=(i*37+11)%256;return a}},navigator:{webdriver:false},
    store:{get:(k,d)=>k in mem?JSON.parse(JSON.stringify(mem[k])):d,set:(k,v)=>{mem[k]=JSON.parse(JSON.stringify(v))}},DEVMODE:()=>false,fnTest:()=>false,fnDev:()=>"phone",toast(){},
    gameReport:(b,mv)=>({sides:{r:{score:80,grade:["A"],base:80.3},b:{score:80,grade:["A"],base:80.3}},plies:mv})};
  ctx.window=ctx;ctx.XQCore={parseFen:()=>[],START:"s"};ctx.XQNet={shareIRT:x=>sent.push(JSON.parse(JSON.stringify(x)))};ctx.XQ_BUILD="20261115-test";
  vm.createContext(ctx);vm.runInContext(SH+"\n"+CPA+";this.R={MXS,mxShadowReport,cpaDone}",ctx,{filename:"05-settings＋05b-save(片段)"});return{...ctx.R,mem,sent}}
const LV=[{p0:.30,s:[.45,60],m:[.17,220],b:[.08,300,1500]},{p0:.40,s:[.45,40],m:[.11,150],b:[.04,300,1200]},{p0:.55,s:[.42,20],m:[.03,90],b:[0,300,900]}];
function game(rnd,own,P){const ex=mu=>-mu*Math.log(1-rnd()+1e-12),dl=()=>{const u=rnd();return Math.round(u<P.p0?ex(6):u<P.p0+P.s[0]?ex(P.s[1]):u<P.p0+P.s[0]+P.m[0]?ex(P.m[1]):P.b[1]+rnd()*(P.b[2]-P.b[1]))};
  let E=0;const mv=[];for(let i=0;i<own*2;i++){const s=i%2?"b":"r",sg=s==="r"?1:-1,best=sg*E,L=s==="r"?dl():Math.round(rnd()*25),played=best-L;E=sg*played;const loss=Math.max(0,clamp(best)-clamp(played)),br=s==="r"&&L===0&&rnd()<.04;
    mv.push({ply:i+1,by:s,phase:i<20?"open":i<own*1.4?"mid":"end",cn:"",ev:sg*played,bv:sg*best,loss,q:br?"妙著":best===played?"正著":oldQ(loss)})}return mv}
/* 一盤的匿名紀錄＋App 當時算的真值。o：{full, start（有＝不是標準開局）} */
function played(seed,own,lv,w,o){o=o||{};const P=phone(),mv=game(mkRnd(seed),own,LV[lv]);P.cpaDone({id:"g"+seed,human:"r",result:{w,why:""},moves:mv,kind:"cpu",level:5,cpuRate:{rank:"業2",pts:1234},hintN:0,undoN:0,...(o.start?{start:"fen"}:{})},o.full===0?0:1);
  return{X:P.mxShadowReport({plies:mv},w).r,cpu:{...P.sent[0],at:1,aid:"p"+(seed%9),g:"g"+seed},loc:{id:"g"+seed,...P.mem.mxShadow["g"+seed]}}}
const GOOD=()=>Array.from({length:24},(_,i)=>played(7000+i,40+(i*9)%60,i%3,["r","b",""][i%3]));

// ====================== P1：離線工具的資料資格篩選 ======================
test("P1：重評重現的案例——score＝999、base＝80 的紀錄：工具標「不一致」，而且任何統計都沒有算進去（有它、沒有它，驗證母體的每一個數字都一樣）",t=>{
  if(!fs.existsSync(MXC))return t.skip(NO_MXC);const X=require(MXC),K=X.loadMXS(),good=GOOD().map(g=>g.cpu);
  const bad={aid:"synthetic",g:"inconsistent",mx:K.MXS.ver,n:20,full:1,std:1,kind:"cpu",crk:"業2",res:"w",s:[999,0,80],o:[80,1,80],m:[[1,1,0,0,1,0,1,1,0]]};
  const d=X.deriveCpu(bad,K);assert.ok(d.flags.some(f=>/^不一致/.test(f)),"要有不一致的警告");
  const A=X.summarize(good.map(r=>X.deriveCpu(r,K)).concat(d),K),B=X.summarize(good.map(r=>X.deriveCpu(r,K)),K);
  assert.equal(A.total,25);assert.equal(A.invalid,1);assert.equal(A.eligible,24);assert.deepEqual(A.verify,B.verify,"驗證母體不能因為多了這一盤而變");assert.deepEqual(A.describe,B.describe,"描述也不能算進無效的盤");
  assert.ok(A.verify.all.score.max<=100&&A.describe.all.score.max<=100);assert.equal(A.verify.all.score.n,A.verify.all.common);
  /* 重評的獨立檢查腳本看的三個數字：incons＝1，而 score.n 不能再是 1、平均不能再是 999 */
  const only=X.summarize([X.deriveCpu(bad,K)],K);assert.equal(only.incons,1);assert.equal(only.all.score.n,0);assert.equal(only.all.score.mean,undefined);assert.equal(only.all.base.n,0);
  assert.deepEqual(A.bad.map(u=>u.id),["synthetic/inconsistent"]);assert.ok(A.bad[0].reasons.includes("invalid")&&A.bad[0].reasons.includes("incons"));assert.equal(A.excluded.primary.invalid,1);
  const txt=X.report(A,[]);assert.match(txt,/資料無效 \*\*1\*\* 盤（任何統計都不進）/);assert.match(txt,/## 資料無效的盤（1 盤；任何統計都沒有算進去）/);assert.match(txt,/synthetic\/inconsistent/);
});
test("P1：重評重現的案例——full:0（我方沒有每一步都評完）的紀錄：標出來，而且不計入驗證母體的 base.n、score.n；只在「描述」那一段出現",t=>{
  if(!fs.existsSync(MXC))return t.skip(NO_MXC);const X=require(MXC),K=X.loadMXS();
  const p=X.normLocal({id:"synthetic-partial",v:K.MXS.ver,o:[80,"A"],n:[80,"A"],x:[80,80,"w"],b:80,g:[80,40,0,"cpu",5,"業2"]}),P=X.summarize([p],K);
  assert.equal(P.partial,1);assert.equal(P.all.base.n,0);assert.equal(P.all.score.n,0);   /* 重評的獨立檢查腳本看的三個數字 */
  assert.equal(P.eligible,0);assert.equal(P.verify.all.n,0);assert.equal(P.verify.all.base.n,0);assert.equal(P.verify.all.score.n,0);assert.equal(P.excluded.primary.partial,1);assert.equal(P.describe.all.score.n,1,"資料本身有效，描述段看得到");
  const g=played(7100,50,1,"r",{full:0}),d=X.deriveCpu(g.cpu,K);assert.equal(g.cpu.full,0);assert.match(d.flags.join("；"),/full:0/);
  const good=GOOD().map(r=>X.deriveCpu(r.cpu,K)),A=X.summarize(good.concat(d),K),B=X.summarize(good,K);
  assert.equal(A.total,25);assert.equal(A.invalid,0);assert.equal(A.ineligible,1);assert.equal(A.eligible,24);assert.deepEqual(A.verify,B.verify);assert.equal(A.describe.all.score.n,B.describe.all.score.n+1);assert.deepEqual(A.excluded.primary,{partial:1});
});
test("P1：納入條件照預先方案——總手數不到 20、不是標準開局、不知道的（本機紀錄沒有存）都不進驗證母體；每盤只算一個主要原因，加起來＝這個版本的盤 − 驗證母體",t=>{
  if(!fs.existsSync(MXC))return t.skip(NO_MXC);const X=require(MXC),K=X.loadMXS(),G=GOOD();
  const short=played(7200,8,1,"r"),nonstd=played(7201,50,1,"b",{start:1}),both=played(7202,8,2,"",{start:1,full:0});assert.equal(short.cpu.n,16);assert.equal(nonstd.cpu.std,0);
  /* 11/15 開發者決定本機紀錄多存標準開局與提示悔棋（g 9 格）：新的本機紀錄進得了驗證母體；g 只有 6 格的（11/15 上午存的）仍然不知道是不是標準開局 */
  const loc=G.slice(0,3).map(g=>X.normLocal(g.loc)).concat(X.normLocal({...G[3].loc,id:"six",g:G[3].loc.g.slice(0,6)})),old=X.normLocal({id:"OLD",v:K.MXS.ver,o:[70,"B"],n:[75,"B"],x:[88,80,"l"],at:5});
  const all=G.map(g=>X.deriveCpu(g.cpu,K)).concat([short,nonstd,both].map(g=>X.deriveCpu(g.cpu,K)),loc,old),A=X.summarize(all,K);
  assert.equal(A.total,32);assert.equal(A.eligible,27);assert.equal(A.invalid,0);assert.equal(A.ineligible,5);
  assert.deepEqual(A.excluded.primary,{partial:1,partialU:1,short:1,nonstd:1,stdU:1});assert.equal(Object.values(A.excluded.primary).reduce((a,b)=>a+b,0),A.total-A.eligible,"分母核對得起來");
  assert.equal(A.excluded.any.short,2,"同一盤可以有好幾個原因");assert.equal(A.excluded.any.nonstd,2);assert.equal(A.excluded.any.stdU,2);assert.equal(A.excluded.any.shortU,1);
  assert.equal(A.verify.bySrc.local.n,3,"g 有 9 格的本機紀錄進驗證母體；6 格的和舊紀錄不進");assert.equal(A.describe.bySrc.local.n,5);assert.equal(A.describe.all.n,32);
  assert.deepEqual({...X.RULES},{minPlies:20,needFull:true,needStd:true,needId:true});assert.doesNotMatch(rd(MXC),/--min-plies|--allow|--no-std/,"納入條件不能用命令列參數放寬");
  const e=X.eligibility(X.deriveCpu(short.cpu,K),K);assert.equal(e.valid,true);assert.equal(e.ok,false);assert.equal(e.primary,"short");
});
test("P1：資料有效性——大小順序不對（raw＜score、s0＜score）、不是輸的盤 s0≠score、分數不是 0～100 的整數、缺分數，都算資料無效",t=>{
  if(!fs.existsSync(MXC))return t.skip(NO_MXC);const X=require(MXC),K=X.loadMXS(),v=K.MXS.ver,L=(id,n,x,b)=>X.normLocal({id,v,o:[80,"A"],n:[n,"A"],x,b,g:[80,40,1,"cpu",5,"業2"]});
  const T=[["rawLow",L("a",85,[80,85,"w"],80)],["s0Low",L("b",85,[90,80,"l"],80)],["winS0",L("c",80,[90,85,"w"],88)],["frac",L("d",80.5,[90,80.5,"w"],88)],["neg",L("e",-3,[-3,-3,"l"],10)],["base200",L("f",80,[90,80,"w"],200)],["raw120",L("g",80,[120,80,"w"],90)]];
  for(const[nm,g]of T){const e=X.eligibility(g,K);assert.equal(e.valid,false,nm);assert.equal(e.primary,"invalid",nm)}
  const miss=X.eligibility(X.normLocal({id:"m",v,x:[80,80,"w"],g:[80,40,1,"cpu",5,"業2"]}),K);assert.equal(miss.primary,"schema","缺新總分＝格式不對（工具 v3 先驗格式）");assert.equal(miss.valid,false);
  const ok=X.eligibility(L("ok",79,[88,85,"l"],87.6),K);assert.equal(ok.valid,true);assert.deepEqual(ok.reasons,["stdU"],"數值沒問題；本機紀錄只差不知道是不是標準開局");
  const S1=X.summarize(T.map(x=>x[1]),K);assert.equal(S1.invalid,7);assert.equal(S1.readable,0);assert.equal(S1.describe.all.n,0);assert.equal(S1.bad.length,7);
});
test("P1：截斷的長局按分數欄位分開——score、base 是原值，合資格就進驗證母體；raw、s0 反推不出唯一值的只留範圍、不進共同有效盤集合，並報排除率與上下界敏感度",t=>{
  if(!fs.existsSync(MXC))return t.skip(NO_MXC);const X=require(MXC),K=X.loadMXS(),G=GOOD(),LG=Array.from({length:12},(_,i)=>played(7300+i,170,i%3,["b","r",""][i%3]));
  const all=G.concat(LG),D=all.map(g=>X.deriveCpu(g.cpu,K)),A=X.summarize(D,K),V=A.verify.all;
  assert.equal(A.eligible,36,"長局沒有因為截斷被排除");assert.equal(A.trunc.n,12);assert.equal(A.trunc.eligible,12);assert.equal(V.own.score,36);assert.equal(V.own.base,36);assert.ok(V.own.raw<36&&A.trunc.rawSure<12,"有的長局 raw 只有範圍");
  const com=D.filter(g=>["exact","derived"].includes(g.raw.how)&&["exact","derived"].includes(g.s0.how)).length;assert.equal(V.common,com);assert.ok(com<36);
  for(const k of["base","raw","s0","score","old"])assert.equal(V[k].n,com,k+"：表裡每一列都是共同有效的那一批");assert.equal(V.rawMinusS0.n,com);assert.equal(V.s0MinusScore.n,com);
  /* 敏感度：合資格的盤全部算進來，App 真正的平均一定落在下界、上界之間 */
  const mean=k=>all.reduce((s,g)=>s+g.X[k],0)/all.length;for(const k of["raw","s0"]){assert.equal(V.sens[k].n,36);assert.ok(V.sens[k].lo<=mean(k)+.005&&mean(k)<=V.sens[k].hi+.005,`${k}：真正的平均 ${mean(k)} 要在 ${V.sens[k].lo}～${V.sens[k].hi} 裡`)}
  assert.ok(V.sens.raw.hi>V.sens.raw.lo);
  /* 排除率：反推不出唯一值的集中在長局，不是隨機的 */
  const un=g=>!["exact","derived"].includes(g.raw.how)||!["exact","derived"].includes(g.s0.how),rt=a=>a.filter(un).length/a.length;assert.ok(rt(D.filter(g=>g.trunc))>rt(D.filter(g=>!g.trunc))+.2,"截斷的長局反推不出唯一值的比例高很多");assert.ok(A.exclRate.byLen["121 手以上"].unsure>=1);assert.equal(A.exclRate.all.eligible,36);assert.equal(A.exclRate.all.unsure,36-com);assert.equal(A.exclRate.all.common,com);
  const txt=X.report(A,[]);assert.match(txt,/## 排除率（反推不出唯一值不是隨機缺漏/);assert.match(txt,/共同有效 \d+ 盤（下表前四列都是這 \d+ 盤）；其中有舊總分的 \d+ 盤/);assert.match(txt,/敏感度（合資格的 36 盤全部算進來/);assert.match(txt,new RegExp("驗證母體 36 盤"));
});
test("P1：整支工具跑一次（命令列）——報表先核對分母、再列驗證母體與描述；無效與未評完的盤有警告而且沒有進驗證母體",t=>{
  if(!fs.existsSync(MXC))return t.skip(NO_MXC);const dir=fs.mkdtempSync(path.join(os.tmpdir(),"mx80-")),K=require(MXC).loadMXS(),L=GOOD().map(g=>JSON.stringify(g.cpu));
  L.push(JSON.stringify({aid:"synthetic",g:"inconsistent",mx:K.MXS.ver,n:20,full:1,std:1,kind:"cpu",crk:"業2",res:"w",s:[999,0,80],o:[80,1,80],m:[[1,1,0,0,1,0,1,1,0]]}));L.push(JSON.stringify(played(7400,50,1,"r",{full:0}).cpu));
  const fc=path.join(dir,"cpu.jsonl"),fo=path.join(dir,"o.json");fs.writeFileSync(fc,L.join("\n")+"\n");const so=cp.execFileSync(process.execPath,[MXC,"--cpu",fc,"--json",fo],{encoding:"utf8"}),J=JSON.parse(fs.readFileSync(fo,"utf8")).summary;fs.rmSync(dir,{recursive:true,force:true});
  assert.equal(J.toolVer,3);assert.equal(J.total,26);assert.equal(J.invalid,1);assert.equal(J.ineligible,1);assert.equal(J.eligible,24);assert.ok(J.verify.all.score.max<=100);assert.equal(J.verify.all.n,24);
  assert.match(so,/這個版本 \*\*26\*\* 盤/);assert.match(so,/\*\*驗證母體 24 盤\*\*/);assert.match(so,/資料無效：分數超出範圍或大小順序不對 \| 1 \|/);assert.match(so,/我方沒有每一步都評完（full:0） \| 1 \|/);assert.match(so,/\| 合計 \| 2（＝26−24） \|/);assert.match(so,/不是驗證母體，不能拿來比較候選/);
});

// ====================== P1／P2：模擬（區間、固定情境、判定、HAC／區塊重抽對照） ======================
test("P1：比例的 Monte Carlo 區間（Wilson）與判定規則——區間整個在目標以內才算通過；跨過目標是待驗證，不是通過",t=>{
  if(!fs.existsSync(SIM))return t.skip(NO_SIM);const X=require(SIM),w=X.wilson(200,4000);assert.ok(Math.abs(w.p-5)<1e-9);assert.ok(Math.abs(w.lo-4.4)<.06&&Math.abs(w.hi-5.7)<.06,JSON.stringify(w));assert.equal(X.wilson(0,0),null);assert.ok(X.wilson(0,300).lo<1e-9);
  assert.equal(X.judge(X.wilson(120,4000),5,"le"),"通過");assert.equal(X.judge(w,5,"le"),"待驗證");assert.equal(X.judge(X.wilson(330,4000),5,"le"),"未通過");
  assert.equal(X.judge(X.wilson(3840,4000),94,"ge"),"通過");assert.equal(X.judge(X.wilson(3770,4000),94,"ge"),"待驗證");assert.equal(X.judge(X.wilson(3680,4000),94,"ge"),"未通過");
  assert.equal(X.worst(["通過","待驗證","通過"]),"待驗證");assert.equal(X.worst(["通過","未通過","待驗證"]),"未通過");assert.deepEqual({...X.JUDGE},{hi:5,any:10,cov:94});
});
test("P1：情境、種子、樣本數固定——15 個情境（含 φ＝0.3／0.5／0.7、缺階段、盤數不均、進步趨勢）、盤數 10／20／40／80；種子由情境序號與盤數決定",t=>{
  if(!fs.existsSync(SIM))return t.skip(NO_SIM);const X=require(SIM);
  assert.deepEqual(X.SCEN.map(s=>s.id),["N0","N+","N-","MISS","UNEV","AR3","AR5","AR7","TREND","E35","E70","E70r0","E70r-","E70AR5","OPEN"]);assert.deepEqual(Array.from(X.GS),[10,20,40,80]);
  assert.deepEqual(X.SCEN.filter(s=>s.serial).map(s=>s.S.phi),[.3,.5,.7,.5]);assert.equal(X.SCEN.find(s=>s.id==="UNEV").S.uneven,1);assert.equal(X.SCEN.find(s=>s.id==="TREND").S.trend,.6);
  assert.equal(X.seedOf(0,0),20261115);assert.equal(X.seedOf(7,3),20261188);assert.equal(X.SIM_VER,3);assert.equal(X.HAC_L,2);assert.equal(X.BLOCK,3);
  const src=rd(SIM);assert.match(src,/REPS = \+opt\("--reps", QUICK \? 300 : 4000\)/);assert.match(src,/BREPS = \+opt\("--boot", QUICK \? 60 : 1000\)/);
  /* 同一個種子重跑，數字一模一樣 */
  const A=X.loadApp(),a=X.run(A,"x",X.SCEN[1].S,20,120,X.seedOf(1,1),10),b=X.run(A,"x",X.SCEN[1].S,20,120,X.seedOf(1,1),10);assert.deepEqual(a.ci,b.ci);assert.deepEqual(a.pairs,b.pairs);
});
test("P1：每個比例都帶區間；五種判斷（之前／App／HAC／整盤重抽／區塊重抽）用同一批假設的玩家；App 的那一欄就是 04-stats.js 真正的 skillPick",t=>{
  if(!fs.existsSync(SIM))return t.skip(NO_SIM);const X=require(SIM),A=X.loadApp(),r=X.run(A,"殘局較差",{rho:.7,pEnd:.6,delta:{end:.7}},40,300,5,40);
  for(const m of["new","old","hac"]){assert.equal(r.rate[m].n,300);for(const k of["hi","any","missHi","missAny","wrongHi"]){const c=r.ci[m][k];assert.ok(c.lo<=c.p+1e-9&&c.p<=c.hi+1e-9&&c.n===300,`${m}.${k}`);assert.equal(r.rate[m][k],+c.p.toFixed(1),"rate 是顯示用的（小數 1 位），ci 保留完整精度")}}
  for(const m of["boot","block"]){assert.equal(r.rate[m].n,40);assert.ok(r.ci[m].missHi.hi-r.ci[m].missHi.lo>r.ci.new.missHi.hi-r.ci.new.missHi.lo,"樣本少的區間比較寬")}
  for(const p of Object.values(r.pairs)){for(const k of["covNewCi","covOldCi","covHacCi"])assert.ok(p[k].lo<=p[k].p&&p[k].p<=p[k].hi);assert.ok(p.floorPct>=0&&p.floorPct<=100)}
  assert.equal(r.verdict.hi,null,"有真正差異的情境不判誤報");assert.ok(["通過","待驗證","未通過"].includes(r.verdict.cov));
  /* App 那一欄：直接拿同一位玩家的五軸呼叫 skillPick，跟模擬裡記的分類一樣 */
  const rows=X.player(X.mkRnd(9),40,{rho:.7,pEnd:.6}),ax=A.skillAxes(rows,null),pk=A.skillPick(ax);assert.equal(X.say(pk).cat,pk.soft?"soft-"+pk.lv:pk.conf==="even"?"even":"lo");assert.equal(A.SK.PICK,3);
});
test("P2：HAC 只換變異那一項——滯後 0 時跟 App 的配對標準誤一模一樣；盤與盤正相關（φ＝0.7）時平均比配對的大，每盤獨立時差不多",t=>{
  if(!fs.existsSync(SIM))return t.skip(NO_SIM);const X=require(SIM),A=X.loadApp();
  const ratio=(Sc,seed)=>{const rnd=X.mkRnd(seed);let s=0,n=0,same=0;for(let i=0;i<300;i++){const rows=X.player(rnd,80,Sc),ax=A.skillAxes(rows,null),o=ax[0],m=ax[1],P=A.mxPairSe(o,m,false);if(!P.pair)continue;
      const H0=X.hacPairSe(A,o,m,80,0),H2=X.hacPairSe(A,o,m,80,2);if(Math.abs(H0.se-P.se)<1e-9)same++;s+=H2.se/P.se;n++}return{r:s/n,n,same}};
  const ar=ratio({rho:.7,pEnd:.6,phi:.7},3),ind=ratio({rho:.7,pEnd:.6},4);assert.equal(ar.same,ar.n,"滯後 0＝App 的配對估計");assert.equal(ind.same,ind.n);
  assert.ok(ar.r>1.02,`φ＝0.7 時 HAC÷配對 平均 ${ar.r}`);assert.ok(Math.abs(ind.r-1)<.02,`每盤獨立時 ${ind.r}`);t.diagnostic(`HAC（滯後 2）÷配對標準誤：φ＝0.7 平均 ${ar.r.toFixed(3)}、每盤獨立 ${ind.r.toFixed(3)}`);
});
test("P1：序列相關不會被寫成通過——φ＝0.7、40 盤（600 位假設的玩家）App 的誤報與覆蓋率照規則都不是「通過」；每盤獨立、正共變異的情境誤報是「通過」",t=>{
  if(!fs.existsSync(SIM))return t.skip(NO_SIM);const X=require(SIM),A=X.loadApp(),ar=X.run(A,"AR7",X.SCEN[7].S,40,600,X.seedOf(7,2),0),ok=X.run(A,"N+",X.SCEN[1].S,40,600,X.seedOf(1,2),0);
  t.diagnostic(`φ＝0.7、40 盤：hi ${ar.ci.new.hi.p}%（${ar.ci.new.hi.lo}～${ar.ci.new.hi.hi}）→ ${ar.verdict.hi}；覆蓋率 → ${ar.verdict.cov}｜每盤獨立：hi ${ok.ci.new.hi.p}%（${ok.ci.new.hi.lo}～${ok.ci.new.hi.hi}）→ ${ok.verdict.hi}`);
  assert.notEqual(ar.verdict.hi,"通過");assert.notEqual(ar.verdict.cov,"通過");assert.ok(ar.ci.new.hi.p>ok.ci.new.hi.p);assert.equal(ok.verdict.hi,"通過");assert.equal(ok.verdict.any,"通過");
  const src=rd(SIM);assert.match(src,/=== "未通過" \? "未通過" : "待驗證"/,"序列相關整組的結論只有未通過或待驗證");
  /* HAC 在 φ＝0.7 也沒有把誤報壓回 5%（所以沒有換進 App） */
  assert.notEqual(X.judge(ar.ci.hac.hi,5,"le"),"通過");
});
test("〔原始碼〕P2：HAC、重抽、區塊重抽只在離線模擬裡；App 的 skillPick 仍然是配對估計＋Bonferroni＋t（這一輪沒有換）",()=>{
  const sp=sl(ST,"function skillPick(","\n/* 開發者 11/11「下完一局","skillPick");assert.match(sp,/mxPairSe\(lo,hi,grp\)/);assert.match(sp,/MX_ZC\[ok\.length\*\(ok\.length-1\)\/2\]/);
  for(const f of fs.readdirSync(M).filter(f=>/\.js$/.test(f)))assert.doesNotMatch(rd(path.join(M,f)),/hacPairSe|bootPick|hacPick/,f+" 不該有離線對照用的函式");
});

// ====================== P2：版本與程式雜湊 ======================
test("P2：建議先練的判斷程序有自己的版本 SK.PICK（現在 3），跟 MXS.ver（4）分開；只存在程式裡，沒有送出、沒有存檔",()=>{
  assert.match(ST,/const SK=\{WIN:150,MIN:30,QMIN:10,HL:15,DEFF:3,SD0:26,PICK:3,PICKOK:0,/);const cM={};vm.createContext(cM);vm.runInContext(sl(S,"const MXS={","\nfunction mxAccDw(","MXS")+";this.v=MXS.ver",cM);assert.equal(cM.v,4);
  assert.doesNotMatch(SV,/SK\.PICK|PICK/,"05b-save.js（存檔、匿名送出）沒有用到");for(const f of fs.readdirSync(M).filter(f=>/\.js$/.test(f)&&f!=="04-stats.js"))assert.doesNotMatch(rd(path.join(M,f)),/SK\.PICK/,f);
});
test("P2：版本紀錄跟現在的程式、文件一致（tools/mx-manifest.json）；程式改了而版本沒升、或版本升了紀錄沒更新，都會被擋下；只改註解不算",t=>{
  if(!fs.existsSync(MAN)||!fs.existsSync(MANJ))return t.skip(NO_MAN);const X=require(MAN),now=X.compute(),rec=JSON.parse(rd(MANJ));
  assert.deepEqual(X.diff(now,rec),[],"程式或文件跟 mx-manifest.json 不一致："+X.diff(now,rec).map(d=>d.msg).join("；"));
  assert.equal(rec.mxs.ver,4);assert.equal(rec.pick.ver,3);assert.equal(rec.compare.ver,3);assert.equal(rec.sim.ver,3);assert.equal(rec.docs.planVer,"v1.2");assert.match(rec.docs.plan.file,/預先驗證方案_v1\.2\.md$/);for(const k of["mxs","pick","compare","sim"])assert.match(rec[k].sha,/^[0-9a-f]{64}$/);
  assert.deepEqual(rec.pick.sk,{WIN:150,MIN:30,QMIN:10,HL:15,DEFF:3,SD0:26,PICK:3,PICKOK:0});
  /* 改了 skillPick 的一個數字（8 分的分界 → 9），版本沒動 → 擋 */
  const a="conf:th>(grp?.8:8)?\"lo\":\"even\"";assert.ok(ST.includes(a));const d1=X.diff(X.compute({stats:ST.replace(a,"conf:th>(grp?.8:9)?\"lo\":\"even\"")}),rec);assert.equal(d1.length,1);assert.equal(d1[0].part,"pick");assert.equal(d1[0].kind,"code");
  /* 改了半衰期（SK 的常數）也算 */
  const d2=X.diff(X.compute({stats:ST.replace("HL:15,","HL:20,")}),rec);assert.equal(d2[0].part,"pick");assert.equal(d2[0].kind,"code");
  /* 版本升了、紀錄還沒更新 → 也擋，但訊息不同 */
  const d3=X.diff(X.compute({stats:ST.replace("PICK:3,","PICK:4,").replace(a,"conf:th>(grp?.8:9)?\"lo\":\"even\"")}),rec);assert.equal(d3[0].kind,"stale");
  /* 只加一行註解：不算 */
  assert.deepEqual(X.diff(X.compute({stats:ST.replace("function skillPick(A){","/* 只是註解 */\nfunction skillPick(A){")}),rec),[]);
  /* 影子公式那一段改了數字（妙著獎勵）而 MXS.ver 沒升 → 擋 */
  const d4=X.diff(X.compute({settings:S.replace("bonus:[2,6]}","bonus:[2,8]}")}),rec);assert.equal(d4[0].part,"mxs");assert.equal(d4[0].kind,"code");
});

// ====================== P1：預先驗證方案 v1.1 ======================
test("〔原始碼〕P1：預先驗證方案 v1.1 補了重評指出的五處——三種結果與 5～8 灰區、ρ／κ 的用途理由與量表、等頻分箱、反推缺漏不是隨機、盲評的資料路徑與洩漏；修訂紀錄有 v1.1；v1 保留",t=>{
  const f=path.join(DBD,"story/數學模型_預先驗證方案_v1.1.md"),f1=path.join(DBD,"story/數學模型_預先驗證方案_v1.md");if(!fs.existsSync(f))return t.skip("沒有 story/數學模型_預先驗證方案_v1.1.md（文件只在開發者電腦，公開副本沒有）");const D=rd(f);
  for(const k of["版本 v1.1","通過、不通過、資料不足","「沒有觸發失敗條件」不等於通過","待修","等頻 10 箱","等寬 10 箱","ICC(2,k)","非劣性界限 −0.05","不能證明什麼","固定截點","完整棋譜不能保證不洩漏勝負","匿名資料 `t:\"cpu\"` 沒有棋譜","反推不出唯一值不是隨機缺漏","上下界敏感度","共同有效盤集合","只能更新**影子模型**","| v1.1 | 2026-11-15 |","真人資料仍是 0 盤"])assert.ok(D.includes(k),"v1.1 裡要有「"+k+"」");
  assert.match(D,/## 九、需要開發者決定或安排的事/);assert.match(D,/盲評用的棋譜來源與同意/);assert.match(D,/外部評閱者/);assert.match(D,/小範圍試行/);
  if(fs.existsSync(f1))assert.match(rd(f1),/已由 v1\.1 取代/);
});
