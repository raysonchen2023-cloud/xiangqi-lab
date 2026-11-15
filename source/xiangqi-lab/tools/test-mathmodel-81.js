// 數學模型：ChatGPT 第四次重評（story/chatgpt_app/數學模型80修正後_三視角重評_2026-11-15.md 第三、四、五節）的改善單＋開發者 11/15 的決定，回歸測試。
//   P1 原始資料格式先驗再轉型（tools/mx-compare.js v3）：重評重現的三個漏洞——s:[null,0,null] 被當成真的 0 分、full:"0" 被當成已評完、缺 aid／g 仍進驗證母體；
//      數字字串一律不收；真正的 0 分要留著；每一項都驗「輸入無效，而且真的沒有進分母」。跟舊分比只用新舊配對的盤。
//   P1 弱項建議多一道放行條件 SK.PICKOK（04-stats.js，SK.PICK 3）：有同段位基準但推論還沒放行時只給描述性提示；沒有基準時（現在所有玩家）畫面一個字都不變。
//   P2 Wilson 區間內部保留完整精度，judge 不受顯示取整影響（tools/sim-phase-pair.js，SIM_VER 3）。
//   開發者決定：本機影子紀錄多存標準開局與提示悔棋（只存本機）；殺棋兩個整點對齊 Lichess、封頂維持 ±2000（MXS v4；整點測試在 test-mathmodel-79.js）；
//      多算三種對照算法（每步平均失分、首選一致率、失誤率）互相對照——只存本機、不送出，離線工具做算法三角對照。
//   文件：預先驗證方案 v1.2、外部公式參考 v2、manifest 的說明。
// 玩家看到的每步準確度、一盤總分、S～D 沒有動；匿名送出的欄位沒有增加（test-mathmodel-79.js 鎖住 25 個欄位）。
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),path=require("path"),vm=require("vm"),os=require("os");
const LAB=path.join(__dirname,".."),DBD=path.join(LAB,"../xiangqi-db"),M=path.join(DBD,"m");
const rd=f=>fs.readFileSync(f,"utf8").replace(/\r\n/g,"\n");
const S=rd(path.join(M,"05-settings.js")),ST=rd(path.join(M,"04-stats.js")),SV=rd(path.join(M,"05b-save.js"));
const C=require("../site/core.js");
const sl=(s,a,b,name)=>{const i=s.indexOf(a),j=s.indexOf(b,i+1);assert.ok(i>=0&&j>i,"找不到 "+(name||a));return s.slice(i,j)};
const SH=sl(S,"function qNow(","\n/* ================= 影子模式","qNow")+"\n"+sl(S,"const MXS={","\nfunction gameReport(","MXS…mxShExport");
const CPA=sl(SV,"const CPA_Q=","\nfunction cpaWatch(","cpaDone");
const MXC=path.join(__dirname,"mx-compare.js"),SIM=path.join(__dirname,"sim-phase-pair.js"),MAN=path.join(__dirname,"mx-manifest.js");
const NO_MXC="沒有 mx-compare.js（離線比較工具只在開發者電腦，公開副本沒有）",NO_SIM="沒有 sim-phase-pair.js（模擬腳本只在開發者電腦，公開副本沒有）",NO_MAN="沒有 mx-manifest.js（版本紀錄工具只在開發者電腦，公開副本沒有）";
const clamp=C.clampV,oldQ=C.gradeLoss,sqI=s=>(9-(+s[1]))*9+(s.charCodeAt(0)-97);   /* 跟 m/00-util.js 的 sqI 同一條 */
function mkRnd(s){return()=>{s=(s*1103515245+12345)%2147483648;return s/2147483648}}
/* 一台假的手機（同 test-mathmodel-79／80）：影子模式＋cpaDone；多給 sqI（首選一致率要用） */
function phone(){const mem={},sent=[];
  const ctx={console,isFinite,esc:x=>String(x),Date,Math,JSON,Uint8Array,sqI,crypto:{getRandomValues:a=>{for(let i=0;i<a.length;i++)a[i]=(i*37+11)%256;return a}},navigator:{webdriver:false},
    store:{get:(k,d)=>k in mem?JSON.parse(JSON.stringify(mem[k])):d,set:(k,v)=>{mem[k]=JSON.parse(JSON.stringify(v))}},DEVMODE:()=>false,fnTest:()=>false,fnDev:()=>"phone",toast(){},
    gameReport:(b,mv)=>({sides:{r:{score:80,grade:["A"],base:80.3},b:{score:80,grade:["A"],base:80.3}},plies:mv})};
  ctx.window=ctx;ctx.XQCore={parseFen:()=>[],START:"s"};ctx.XQNet={shareIRT:x=>sent.push(JSON.parse(JSON.stringify(x)))};ctx.XQ_BUILD="20261115-test";
  vm.createContext(ctx);vm.runInContext(SH+"\n"+CPA+";this.R={MXS,mxWin,mxShMove,mxShSide,mxShadowReport,mxShHtml,cpaDone}",ctx,{filename:"05-settings＋05b-save(片段)"});return{...ctx.R,mem,sent}}
const LV=[{p0:.30,s:[.45,60],m:[.17,220],b:[.08,300,1500]},{p0:.40,s:[.45,40],m:[.11,150],b:[.04,300,1200]},{p0:.55,s:[.42,20],m:[.03,90],b:[0,300,900]}];
/* 假設的一盤；每一步有 f、t 和引擎首選 bm——少掉 0 分的步當成走了首選，其餘首選是另一步 */
function game(rnd,own,P){const ex=mu=>-mu*Math.log(1-rnd()+1e-12),dl=()=>{const u=rnd();return Math.round(u<P.p0?ex(6):u<P.p0+P.s[0]?ex(P.s[1]):u<P.p0+P.s[0]+P.m[0]?ex(P.m[1]):P.b[1]+rnd()*(P.b[2]-P.b[1]))};
  let E=0;const mv=[];for(let i=0;i<own*2;i++){const s=i%2?"b":"r",sg=s==="r"?1:-1,best=sg*E,L=s==="r"?dl():Math.round(rnd()*25),played=best-L;E=sg*played;const loss=Math.max(0,clamp(best)-clamp(played)),br=s==="r"&&L===0&&rnd()<.04;
    mv.push({ply:i+1,by:s,phase:i<20?"open":i<own*1.4?"mid":"end",cn:"",f:0,t:1,bm:L===0?"a9b9":"a9c9",ev:sg*played,bv:sg*best,loss,q:br?"妙著":best===played?"正著":oldQ(loss)})}return mv}
function played(seed,own,lv,w,o){o=o||{};const P=phone(),mv=game(mkRnd(seed),own,LV[lv]);P.cpaDone({id:"g"+seed,human:"r",result:{w,why:""},moves:mv,kind:"cpu",level:5,cpuRate:{rank:"業2",pts:1234},hintN:o.hint||0,undoN:o.undo||0,...(o.start?{start:"fen"}:{})},1);
  return{X:P.mxShadowReport({plies:mv},w).r,cpu:{...P.sent[0],at:1,aid:"p"+(seed%9),g:"g"+seed},loc:{id:"g"+seed,...P.mem.mxShadow["g"+seed]}}}
const GOOD=n=>Array.from({length:n||24},(_,i)=>played(8000+i,40+(i*9)%60,i%3,["r","b",""][i%3]));

// ====================== P1：原始資料格式先驗再轉型 ======================
test("P1：重評重現的三個漏洞——s:[null,0,null]、full:\"0\"、缺 aid／g，還有數字字串：都有標出來，而且都沒有進驗證母體的分母（有它們、沒有它們，驗證母體每個數字都一樣）",t=>{
  if(!fs.existsSync(MXC))return t.skip(NO_MXC);const X=require(MXC),K=X.loadMXS(),good=GOOD().map(g=>g.cpu),proto={aid:"synthetic",g:"boundary",mx:K.MXS.ver,n:20,full:1,std:1,kind:"cpu",crk:"業2",res:"w",s:[80,1,80],o:[80,1,80],m:[[1,1,0,0,1,0,1,1,0]]};
  const B0=X.summarize(good.map(r=>X.deriveCpu(r,K)),K),one=r=>{const d=X.deriveCpu(r,K),s=X.summarize([d],K);return{d,s}};
  /* 這一筆原型本身是合格的（對照組） */
  const ok=one(proto);assert.equal(ok.s.eligible,1);assert.equal(ok.s.all.score.n,1);
  const CASES=[["null 分數",{...proto,s:[null,0,null]},"schema",/s\[0\]（score）不是數字/],["字串分數",{...proto,s:["80",1,"80"]},"schema",/不是數字/],["full 是字串 \"0\"",{...proto,full:"0"},"schema",/full 不是 0／1/],["full 是 true",{...proto,full:true},"schema",/full 不是 0／1/],
    ["std 是字串",{...proto,std:"1"},"schema",/std 不是 0／1/],["總手數是字串",{...proto,n:"20"},"schema",/n（總手數）不是非負整數/],["總手數是負的",{...proto,n:-4},"schema",/n（總手數）/],["res 不認得",{...proto,res:"x"},"schema",/res 不是/],
    ["m 的一步少一格",{...proto,m:[[1,1,0,0,1,0,1,1]]},"schema",/m 第 1 筆不是 9 格的陣列/],["m 的評估是字串",{...proto,m:[[1,1,"0",0,1,0,1,1,0]]},"schema",/m 第 1 筆的「最佳原值」型別不對/],["m 是空的",{...proto,m:[]},"schema",/m 不是非空陣列/],
    ["舊分是 null",{...proto,o:[null,1,80]},"schema",/o（舊分）/],["缺 aid、g",{...proto,aid:undefined,g:undefined},"noid",null],["aid 是空字串",{...proto,aid:""},"noid",null],["g 是數字",{...proto,g:7},"noid",null]];
  const all=good.map(r=>X.deriveCpu(r,K));
  for(const[nm,r,why,flag]of CASES){const{d,s}=one(r);assert.equal(d.elig.primary,why,nm+"：主要原因");assert.equal(s.eligible,0,nm+"：不能進驗證母體");assert.equal(s.all.score.n,0,nm+"：score 的分母");assert.equal(s.all.base.n,0,nm+"：base 的分母");
    if(why==="schema"){assert.equal(d.elig.valid,false);assert.equal(s.invalid,1);assert.equal(s.describe.all.n,0,nm+"：格式不對的連描述都不進");assert.match(d.flags.join("；"),flag,nm);assert.equal(d.score.how,"na",nm+"：內部物件裡沒有被轉成數字");assert.equal(d.score.v,undefined)}
    else{assert.equal(d.elig.valid,true);assert.equal(s.ineligible,1);assert.equal(s.describe.all.score.n,1,nm+"：缺識別欄位的留在描述");assert.equal(d.aid,null)}
    all.push(X.deriveCpu(r,K))}
  const A=X.summarize(all,K);assert.equal(A.total,24+CASES.length);assert.equal(A.eligible,24);assert.equal(A.invalid,12);assert.equal(A.ineligible,3);assert.deepEqual(A.excluded.primary,{schema:12,noid:3});
  assert.deepEqual(A.verify,B0.verify,"驗證母體不能因為多了這 15 筆而變");assert.deepEqual(A.tri,B0.tri);assert.equal(A.describe.all.n,27);
  const txt=X.report(A,[]);assert.match(txt,/資料無效：格式不對[^|]*\| 12 \| 12 \|/);assert.match(txt,/缺識別欄位[^|]*\| 3 \| 3 \|/);assert.match(txt,/s\[0\]（score）不是數字/);
});
test("P1：真正的 0 分（JSON 數字 0）要留著——跟 null 不一樣；null 不會被轉成 0",t=>{
  if(!fs.existsSync(MXC))return t.skip(NO_MXC);const X=require(MXC),K=X.loadMXS();
  /* 20 步全是大錯：base 0.3、沒有妙著 → raw＝0；重大錯誤上限 69、輸棋上限 79 都比 0 高 → score＝0 是合法的 */
  const m=Array.from({length:20},(_,i)=>[2*i+1,1,0,-1500,1,1500,5,5,0]),zero={aid:"z",g:"zero",mx:K.MXS.ver,n:40,full:1,std:1,hn:0,un:0,kind:"cpu",crk:"新手",res:"l",s:[0,4,.3],o:[0,4,0],m};
  const d=X.deriveCpu(zero,K),s=X.summarize([d],K);assert.deepEqual(d.flags,[]);assert.equal(d.elig.ok,true);assert.equal(d.score.v,0);assert.equal(d.raw.v,0);assert.equal(s.eligible,1);assert.equal(s.all.score.n,1);assert.equal(s.all.score.mean,0);assert.equal(s.all.common,1);
  const nul=X.deriveCpu({...zero,g:"null",s:[null,4,null]},K),s2=X.summarize([d,nul],K);assert.equal(nul.elig.primary,"schema");assert.equal(s2.all.score.n,1,"null 那一筆沒有變成第二個 0 分");assert.equal(s2.invalid,1);
});
test("〔混合〕P1：格式規格寫明不收數字字串；欄位「整個沒有」是不知道（不合納入條件、留在描述），「有但型別不對」是格式不對（資料無效）",t=>{
  if(!fs.existsSync(MXC))return t.skip(NO_MXC);const X=require(MXC),K=X.loadMXS(),proto={aid:"a",g:"g",mx:K.MXS.ver,n:20,full:1,std:1,kind:"cpu",crk:"業2",res:"w",s:[80,1,80],m:[[1,1,0,0,1,0,1,1,0]]};
  const el=r=>{const d=X.deriveCpu(r,K);X.summarize([d],K);return d.elig};
  const{full,...noFull}=proto,{std,...noStd}=proto,{n,...noN}=proto;assert.deepEqual(el(noFull).reasons,["partialU"]);assert.deepEqual(el(noStd).reasons,["stdU"]);assert.deepEqual(el(noN).reasons,["shortU"]);
  for(const r of[noFull,noStd,noN])assert.equal(el(r).valid,true);assert.equal(el({...proto,full:null}).primary,"schema","null 不是「沒有」，是型別不對");
  assert.deepEqual(X.schemaCpu(proto),{errs:[],noId:false});assert.equal(X.schemaCpu(null).errs.length,1);assert.equal(X.schemaCpu([1,2]).errs.length,1);assert.ok(X.schemaCpu({...proto,mx:"4"}).errs.some(e=>/mx/.test(e)));
  const src=rd(MXC);assert.match(src,/數字字串（"80"）一律不收/);assert.match(src,/null 不是 0/);assert.doesNotMatch(sl(src,"function deriveCpu(","\n/* ---------- 資格","deriveCpu"),/\+s\[\d\]|!!r\.|\+r\.n/,"deriveCpu 裡不能再用 +x、!!x 這種轉型");
  /* 版本欄位本身格式不對：不知道是哪一版，另外算，不混進任何版本 */
  const A=X.summarize([X.deriveCpu({...proto,mx:"4"},K),X.deriveCpu(proto,K)],K);assert.equal(A.total,1);assert.deepEqual(A.otherVer,{"版本欄位格式不對":1});
});
test("P1：缺識別欄位的盤沒辦法去重——一筆算一筆、不會互相蓋掉，也不會把有識別欄位的盤擠掉；本機匯出檔整份當同一個人",t=>{
  if(!fs.existsSync(MXC))return t.skip(NO_MXC);const X=require(MXC),K=X.loadMXS(),G=GOOD(6),dir=fs.mkdtempSync(path.join(os.tmpdir(),"mx81-")),L=G.map(g=>JSON.stringify(g.cpu));
  const{aid,g,...anon}=G[0].cpu;L.push(JSON.stringify(anon),JSON.stringify(anon),L[1]);const fc=path.join(dir,"c.jsonl");fs.writeFileSync(fc,L.join("\n")+"\n");
  const R=X.readCpu(fc,K,false),A=X.summarize(R.games,K);assert.equal(R.meta.dup,1,"有識別欄位的重複照樣去掉");assert.equal(R.games.length,8);assert.equal(A.eligible,6);assert.equal(A.excluded.primary.noid,2);
  const P=phone();for(let i=0;i<3;i++)P.cpaDone({id:"L"+i,human:"r",result:{w:"r",why:""},moves:game(mkRnd(50+i),40,LV[1]),kind:"cpu",level:5,cpuRate:{rank:"業2"},hintN:i,undoN:0},1);
  const fl=path.join(dir,"e.json");fs.writeFileSync(fl,JSON.stringify({kind:"xq-mxshadow",fmt:1,n:3,cap:200,mxs:{ver:K.MXS.ver},games:Object.entries(P.mem.mxShadow).map(([id,v])=>({id,...v}))}));const RL=X.readLocal(fl);fs.rmSync(dir,{recursive:true,force:true});
  assert.equal(new Set(RL.games.map(g=>g.aid)).size,1);assert.match(RL.games[0].aid,/^本機匯出#\d+$/);const SL=X.summarize(RL.games,K);assert.equal(SL.eligible,3,"11/15 起的本機紀錄有標準開局與提示悔棋，進得了驗證母體");assert.equal(SL.verify.all.people,1);
  assert.deepEqual(Object.fromEntries(Object.entries(SL.verify.byHint).map(([k,v])=>[k,v.n])),{沒用提示悔棋:1,用過提示或悔棋:2});
});
test("P1：跟舊分比只用新舊配對的盤——沒有舊分的盤照樣在共同有效盤集合裡，但舊分那一列與 score−舊分的盤數另外算、表頭寫清楚",t=>{
  if(!fs.existsSync(MXC))return t.skip(NO_MXC);const X=require(MXC),K=X.loadMXS(),G=GOOD().map((g,i)=>{if(i%4)return g.cpu;const{o,...r}=g.cpu;return r}),A=X.summarize(G.map(r=>X.deriveCpu(r,K)),K),V=A.verify.all;
  assert.equal(A.eligible,24);assert.ok(V.common>=20);const noOld=G.map(r=>X.deriveCpu(r,K)).filter(d=>d.old==null&&["exact","derived"].includes(d.raw.how)&&["exact","derived"].includes(d.s0.how)).length;assert.ok(noOld>=4);
  assert.equal(V.oldPaired,V.common-noOld);assert.equal(V.old.n,V.oldPaired);assert.equal(V.scoreOfPaired.n,V.oldPaired);assert.equal(V.scoreMinusOld.n,V.oldPaired);for(const k of["base","raw","s0","score"])assert.equal(V[k].n,V.common);
  const txt=X.report(A,[]);assert.match(txt,new RegExp(`共同有效 ${V.common} 盤（下表前四列都是這 ${V.common} 盤）；其中有舊總分的 ${V.oldPaired} 盤`));assert.match(txt,/〔新舊配對〕畫面上的舊總分/);assert.match(txt,new RegExp(`新舊配對的 ${V.oldPaired} 盤：score−舊總分`));
});
test("P1：本機匯出檔的格式也先驗——數字字串、少格、型別不對的紀錄是資料無效；g 只有 6 格（11/15 上午存的）照舊是「不知道是不是標準開局」",t=>{
  if(!fs.existsSync(MXC))return t.skip(NO_MXC);const X=require(MXC),K=X.loadMXS(),v=K.MXS.ver,ok={id:"a",v,o:[80,"A"],n:[80,"A"],x:[85,80,"l"],b:84.6,g:[80,40,1,"cpu",5,"業2",1,0,2],a:[35.5,42.5,40,7.5]};
  const e=g=>{const d=X.normLocal(g,"本機匯出#9");X.summarize([d],K);return d};
  const d0=e(ok);assert.deepEqual(d0.elig.reasons,[]);assert.equal(d0.std,true);assert.equal(d0.hint,true);assert.deepEqual(d0.alt,{acpl:35.5,mm:42.5,mmN:40,er:7.5});
  assert.deepEqual(e({...ok,g:ok.g.slice(0,6)}).elig.reasons,["stdU"]);const{g,...noG}=ok;assert.deepEqual(e(noG).elig.reasons,["partialU","shortU","stdU"]);
  for(const[nm,bad]of[["n 是字串",{...ok,n:["80","A"]}],["x 少一格數字",{...ok,x:[85,null,"l"]}],["g 有 7 格",{...ok,g:ok.g.slice(0,7)}],["g 的評完是 true",{...ok,g:[80,40,true,"cpu",5,"業2",1,0,2]}],["g 的標準開局是字串",{...ok,g:[80,40,1,"cpu",5,"業2","1",0,2]}],["a 少一格",{...ok,a:[35.5,42.5,40]}],["b 是字串",{...ok,b:"84.6"}],["終局不認得",{...ok,x:[85,80,"z"]}]]){const d=e(bad);assert.equal(d.elig.primary,"schema",nm);assert.equal(d.score.how,"na",nm)}
  assert.equal(e({...ok,id:""}).elig.primary,"noid");
});

// ====================== P1：弱項建議的放行條件 SK.PICKOK ======================
const SKSRC=sl(ST,"const SK={","\n/* 校正檔（store calib","SK")+"\n"+sl(ST,"const MX_RK=","\n/* 每盤一列","MX_RK…mxTierName")+"\n"+sl(ST,"function mxAxisPt(","\n/* 開發者 11/11「下完一局","mxAxisPt…skillPick");
function loadSk(calib,rank){const mem={calib},ctx={console,isFinite,QZ:{S:.55,MID:7,C:.05},store:{get:(k,d)=>k in mem?mem[k]:d,set:(k,v)=>{mem[k]=v}},window:{}};if(rank)ctx.XQNet=ctx.window.XQNet={rating:()=>({rank})};vm.createContext(ctx);
  vm.runInContext(SKSRC+";this.R={SK,mxCal,skillAxes,mxTotal,skillPick,mxPairSe}",ctx,{filename:"04-stats(五軸片段)"});return ctx.R}
const rowsOf=(T,n)=>T.map((a,j)=>{const pa={},A=[];["open","mid","end"].forEach((k,i)=>{if(a[i]==null){pa[k]=[0,0];return}pa[k]=[a[i]*n,n];for(let q=0;q<n;q++)A.push(a[i])});return{t:1e6-j,hu:0,n:A.length,bad:0,best:0,pa,A}});
const BASE=n=>({ax:{people:n,byRank:{業2:{open:{mu:80,sd:8,n},mid:{mu:80,sd:8,n},end:{mu:80,sd:8,n},stab:{mu:95,sd:5,n}}}}});
const WEAK_END=()=>{const rnd=mkRnd(24);return rowsOf(Array.from({length:60},()=>{const g=(rnd()-.5)*8;return[82+g,81+g+(rnd()-.5)*4,58+g+(rnd()-.5)*4]}),10)};
const SP=sl(ST,"async function skillPentagon(","\n/* 意見回饋 301","skillPentagon");
async function paint(K,A,calib){const box={isConnected:true,innerHTML:"",querySelectorAll:()=>[]},ctx={console,isFinite,store:{get:(k,d)=>k==="calib"&&calib?calib:d,set(){}},SK:K.SK,mxTotal:K.mxTotal,skillPick:K.skillPick,mxCal:K.mxCal,
    skillRows:async()=>({G:[{hu:0}],smN:0}),skillAxes:()=>A,tlIRT:()=>null,setProf(){},penSVG:()=>""};vm.createContext(ctx);vm.runInContext(SP+";this.f=skillPentagon",ctx);await ctx.f(box);return box.innerHTML}
test("〔原始碼〕P1：放行旗標集中在一個常數、預設關——SK.PICKOK＝0；SK.PICK 升到 3；skillPick 只在「有同段位基準」而且「已放行」兩個條件都成立時才回傳 weak／maybe",()=>{
  assert.match(ST,/const SK=\{WIN:150,MIN:30,QMIN:10,HL:15,DEFF:3,SD0:26,PICK:3,PICKOK:0,/);assert.equal((ST.match(/PICKOK:/g)||[]).length,1,"旗標只定義一次");
  const sp=sl(ST,"function skillPick(","\n/* 開發者 11/11「下完一局","skillPick");assert.match(sp,/if\(!\(grp&&SK\.PICKOK\)&&gap>=tm\)return\{soft:lo,/);assert.equal((sp.replace(/\/\*[\s\S]*?\*\//g,"").match(/SK\.PICKOK/g)||[]).length,1,"程式裡只有這一個地方看旗標（註解不算）");
  for(const f of fs.readdirSync(M).filter(f=>/\.js$/.test(f)&&f!=="04-stats.js"))assert.doesNotMatch(rd(path.join(M,f)),/PICKOK/,f+"：別的檔不該碰這個旗標");assert.doesNotMatch(SV,/PICKOK|SK\.PICK/,"沒有存檔、沒有送出");
});
test("P1：有同段位基準、差距很明顯，但推論還沒放行（預設）→ 只回傳描述性的 soft，不回傳 weak／maybe（地圖朱圈只看 weak，所以也不畫）；放行以後同一份資料才是「建議先練」",async()=>{
  const G=WEAK_END(),K0=loadSk(BASE(60),"業2"),A0=K0.skillAxes(G,null),p0=K0.skillPick(A0);assert.equal(K0.SK.PICKOK,0);
  assert.equal(p0.grp,true,"基準在");assert.equal(p0.conf,"soft");assert.equal(p0.lv,"hi");assert.equal(p0.soft.k,"殘局");assert.equal(p0.weak,undefined);assert.equal(p0.maybe,undefined);assert.deepEqual(Object.keys(p0).sort(),["conf","grp","hi","lv","soft","th"]);
  const K1=loadSk(BASE(60),"業2");K1.SK.PICKOK=1;const A1=K1.skillAxes(G,null),p1=K1.skillPick(A1);assert.equal(p1.conf,"hi");assert.equal(p1.weak.k,"殘局");assert.equal(p1.soft,undefined);assert.ok(Math.abs(p1.th-p0.th)<1e-12,"門檻一樣，只差說法");
  /* 畫面：沒放行時是提問、說明「這個比法還在驗證」，沒有「建議先練：」「可能先看：」；「五項怎麼算」也照實寫 */
  const h0=await paint(K0,A0,BASE(60)),top0=h0.split('<div class="skl">')[0];assert.match(top0,/💡 跟同段位比，殘局落後較多（\d+ 分），想練一題嗎？/);assert.match(top0,/這個比法還在驗證，先當參考，還不能說殘局是弱項/);assert.doesNotMatch(top0,/建議先練：|可能先看：/);
  assert.match(h0,/現在有同段位棋友的資料可以比了，但這個比法還在驗證/);assert.doesNotMatch(h0,/，而且是跟同段位棋友比。/);
  const h1=await paint(K1,A1,BASE(60));assert.match(h1.split('<div class="skl">')[0],/🎯 建議先練：殘局/);assert.match(h1,/，而且是跟同段位棋友比/);
  assert.match(rd(path.join(M,"07z2-statmap.js")),/if\(pk&&pk\.weak\)\{/);
});
test("P1：沒有同段位基準（現在所有玩家）——旗標開或關，skillPick 的結果與五邊形整段畫面一個字都不變（400 位假設的玩家，8～60 盤）",async()=>{
  const rnd=mkRnd(81),K0=loadSk(null),K1=loadSk(null);K1.SK.PICKOK=1;const cnt={},key=p=>JSON.stringify([p.conf,p.lv||null,p.none||false,p.even||false,p.grp||false,p.soft?p.soft.k:null,p.weak?p.weak.k:null,p.maybe?p.maybe.k:null,p.hi?p.hi.k:null,p.lo?p.lo.k:null,p.th==null?null:+p.th.toFixed(9)]);
  for(let i=0;i<400;i++){const G=[2,8,20,40,60][i%5],mu=[70+rnd()*20,70+rnd()*20,60+rnd()*30],T=Array.from({length:G},()=>{const g=(rnd()-.5)*16;return[mu[0]+g+(rnd()-.5)*10,mu[1]+g+(rnd()-.5)*10,rnd()<.6?mu[2]+g+(rnd()-.5)*12:null]}),rows=rowsOf(T,10);
    const A0=K0.skillAxes(rows,null),A1=K1.skillAxes(rows,null),p0=K0.skillPick(A0),p1=K1.skillPick(A1);assert.equal(key(p0),key(p1),"第 "+i+" 位");assert.ok(!p0.grp);assert.equal(p0.weak,undefined);assert.equal(p0.maybe,undefined);cnt[p0.conf+(p0.lv?"-"+p0.lv:"")]=(cnt[p0.conf+(p0.lv?"-"+p0.lv:"")]||0)+1;
    if(i%20===0)assert.equal(await paint(K0,A0,null),await paint(K1,A1,null),"第 "+i+" 位的五邊形畫面")}
  assert.ok(cnt["soft-hi"]>=20&&cnt.lo>=20&&cnt.even>=5,"各種說法都有測到："+JSON.stringify(cnt));
  /* 沒有基準時的溫和說法原文沒有動 */
  const G=rowsOf(Array.from({length:40},(_,i)=>[82,80,i%2?58:62]),10),h=await paint(K0,K0.skillAxes(G,null),null);assert.match(h,/💡 最近殘局分數較低（\d+ 分），想練一題嗎？/);assert.match(h,/等有同段位棋友的資料可以比，才會建議先練哪一項/);assert.match(h,/現在還沒有同段位棋友的資料可以比/);
});

// ====================== 開發者決定：對照算法（每步平均失分、首選一致率、失誤率） ======================
const mv1=(best,played,o)=>({ply:1,by:"r",phase:"mid",cn:"",f:0,t:1,ev:played,bv:best,loss:Math.max(0,clamp(best)-clamp(played)),q:"緩著",...(o||{})});
test("對照算法：每步平均失分照 Lichess 的 ACPL——兩邊評估先封在 ±1000 再相減、負的算 0；跟 base 的封頂（±2000）不一樣是刻意的",()=>{
  const P=phone(),cl=(b,p)=>P.mxShMove(mv1(b,p)).cl;assert.equal(P.MXS.alt.cap,1000);assert.equal(P.MXS.alt.err,10);assert.equal(P.MXS.ver,4);
  assert.equal(cl(0,-120),120);assert.equal(cl(300,300),0);assert.equal(cl(100,160),0,"走得比「最佳」還好：算 0，不算負的");assert.equal(cl(1500,900),100,"1500 先封成 1000");assert.equal(cl(1800,1200),0,"兩邊都超過 1000：ACPL 看不到這個失誤");
  assert.ok(P.mxShMove(mv1(1800,1200)).dw>0,"但預期得分尺度（封頂 ±2000）看得到");assert.equal(cl(29990,-29990),2000,"從有殺走到被殺：封頂後最多 2000");assert.equal(cl(-500,-29990),500);
  const r=P.mxShSide({plies:[mv1(0,-120),{...mv1(300,300),ply:3},{...mv1(1500,900),ply:5},{...mv1(100,-50),ply:7}]},"r");assert.equal(r.alt.acpl,Math.round((120+0+100+150)/4*10)/10);
});
test("對照算法：首選一致率只算有記引擎首選的步——走的就是 bm 才算一致；沒有 bm（舊存檔）不算進分母，全部沒有就是 null",()=>{
  const P=phone(),hit=o=>P.mxShMove(mv1(0,-10,o)).hit;assert.equal(hit({bm:"a9b9"}),1);assert.equal(hit({bm:"a9c9"}),0);assert.equal(hit({bm:"b9a9"}),0,"方向反了不算");assert.equal(hit({}),null);assert.equal(hit({bm:""}),null);assert.equal(hit({bm:"zz"}),null);assert.equal(hit({bm:"a9b9",f:undefined}),null);
  assert.equal(sqI("a9"),0);assert.equal(sqI("b9"),1);assert.equal(sqI("a0"),81);
  const pl=[{...mv1(0,0,{bm:"a9b9"}),ply:1},{...mv1(0,-40,{bm:"a9c9"}),ply:3},{...mv1(0,-10,{bm:"a9b9"}),ply:5},{...mv1(0,-10),ply:7}],r=P.mxShSide({plies:pl},"r");assert.equal(r.alt.mmN,3);assert.equal(r.alt.mm,66.7);
  const none=P.mxShSide({plies:[mv1(0,-10),{...mv1(0,-20),ply:3}]},"r");assert.equal(none.alt.mm,null);assert.equal(none.alt.mmN,0);
  /* 影子片段裡沒有 sqI（別的測試的環境）也不會壞：一致率就是 null */
  const ctx={console,isFinite,esc:x=>String(x)};vm.createContext(ctx);vm.runInContext(SH+";this.R={mxShSide}",ctx);assert.equal(ctx.R.mxShSide({plies:pl},"r").alt.mm,null);
});
test("對照算法：失誤率＝每 100 步有幾步是 Lichess 的 Mistake 以上——預期得分掉 ≥ 10%（整點算），或送殺、漏殺被判成失著、敗著；送殺判成緩著的不算",()=>{
  const P=phone(),W=P.mxWin,er=pl=>P.mxShSide({plies:pl.map((m,i)=>({...m,ply:2*i+1}))},"r").alt.er;
  /* 找掉分剛好在 10% 兩邊的整數評估 */
  let lo=0;while(W(0)-W(-(lo+1))<10)lo++;assert.ok(W(0)-W(-lo)<10&&W(0)-W(-(lo+1))>=10);assert.equal(er([mv1(0,-lo),mv1(0,0)]),0);assert.equal(er([mv1(0,-(lo+1)),mv1(0,0)]),50);
  assert.equal(er([mv1(-1500,-29990),mv1(0,0),mv1(0,0),mv1(0,0)]),0,"早就大劣才走進殺棋：Lichess 判 Inaccuracy（緩著），不算失誤");assert.equal(er([mv1(-800,-29990),mv1(0,0),mv1(0,0),mv1(0,0)]),25,"−800 走進殺棋＝失著");
  assert.equal(er([mv1(29990,900),mv1(0,0),mv1(0,0),mv1(0,0)]),25,"有殺沒走、掉到 +900＝失著，就算預期得分只掉一點點");assert.ok(W(29990)-W(900)<10);
});
test("〔混合〕對照算法：只存本機、開發者並列表多一列；匿名那一筆沒有多任何欄位，也沒有引擎首選",()=>{
  const g=played(8100,50,1,"b"),X=g.X;assert.deepEqual(g.loc.a,[X.alt.acpl,X.alt.mm,X.alt.mmN,X.alt.er]);assert.equal(X.alt.mmN,X.n);assert.ok(X.alt.mm>0&&X.alt.mm<100);
  assert.deepEqual(Object.keys(g.cpu).sort(),["aid","at","bl","crk","dev","full","g","hn","hu","kind","lv","m","mx","n","nrk","o","pts","res","rk","s","std","t","un","v","ver","why"]);assert.equal(g.cpu.a,undefined);for(const v of g.cpu.m)assert.equal(v.length,9);assert.equal(g.cpu.mx,4);
  const P=phone(),h=P.mxShHtml({score:80,grade:["A"],base:80,cap:100,cnt:{}},X);assert.match(h,/對照算法/);assert.match(h,new RegExp("每步平均失分 "+String(X.alt.acpl).replace(".","\\.")));assert.match(h,/首選一致率 [\d.]+%/);assert.match(h,/失誤率 [\d.]+／100 步/);assert.match(h,/都用同一個引擎的評估，彼此不獨立；只當交叉參照/);
  assert.match(SV,/a:\[X\.alt\.acpl,X\.alt\.mm,X\.alt\.mmN,X\.alt\.er\]/);assert.match(SV,/st\.start\?0:1,\+st\.hintN\|\|0,\+st\.undoN\|\|0\],a:/,"本機 g 的第 7～9 格：標準開局、提示、悔棋");
  const st=played(8101,40,1,"r",{hint:2,undo:1,start:1});assert.deepEqual(st.loc.g.slice(6),[0,2,1]);assert.deepEqual([st.cpu.std,st.cpu.hn,st.cpu.un],[0,2,1],"跟匿名那一筆同一個算法");
});
test("對照算法：離線工具從匿名的逐步資料重算的每步平均失分、失誤率，跟 App 當時算的一模一樣（200 盤）；截斷的長局不重算；首選一致率匿名資料沒有",t=>{
  if(!fs.existsSync(MXC))return t.skip(NO_MXC);const X=require(MXC),K=X.loadMXS();
  for(let i=0;i<200;i++){const g=played(8200+i,30+(i*7)%90,i%3,["r","b",""][i%3]),d=X.deriveCpu(g.cpu,K);assert.equal(d.alt.acpl,g.X.alt.acpl,"第 "+i+" 盤 acpl");assert.equal(d.alt.er,g.X.alt.er,"第 "+i+" 盤 er");assert.equal(d.alt.mm,null)}
  const lg=played(8500,170,1,"r"),dl=X.deriveCpu(lg.cpu,K);assert.equal(dl.trunc,true);assert.deepEqual(dl.alt,{acpl:null,mm:null,mmN:0,er:null});
  const loc=X.normLocal(lg.loc,"本機匯出#1");assert.equal(loc.alt.acpl,lg.X.alt.acpl,"本機紀錄是 App 的原值，長局也有");assert.equal(loc.alt.mm,lg.X.alt.mm);
});

// ====================== 算法三角對照（離線工具） ======================
test("算法三角對照：等級相關與二次加權 κ 的算法跟手算一樣（含同分、反例）",t=>{
  if(!fs.existsSync(MXC))return t.skip(NO_MXC);const X=require(MXC);
  assert.deepEqual(X.ranks([10,20,20,5]),[2,3.5,3.5,1]);assert.equal(X.spearman([1,2,3,4],[10,20,30,40]),1);assert.equal(X.spearman([1,2,3,4],[4,3,2,1]),-1);assert.ok(Math.abs(X.spearman([1,2,3,4,5],[2,1,4,3,5])-.8)<1e-12);
  assert.ok(Math.abs(X.spearman([1,2,3],[3,1,2])+.5)<1e-12,"重評第四節的反例：合法取值 [3,1,2] 對參照 1、2、3 的相關是 −0.5");assert.equal(X.spearman([1,1,1],[1,2,3]),null);assert.equal(X.spearman([1,2],[1,2]),null);
  assert.deepEqual(X.quint([1,2,3,4,5,6,7,8,9,10]),[0,0,1,1,2,2,3,3,4,4]);assert.equal(X.kappaW([0,1,2,3,4],[0,1,2,3,4],5),1);assert.ok(Math.abs(X.kappaW([0,1,2,3,4],[4,3,2,1,0],5)+1)<1e-12);
  /* 2×2 手算：觀察一致 3/4、期望一致 1/2 → κ＝0.5（兩級時加權 κ＝一般的 κ） */
  assert.ok(Math.abs(X.kappaW([0,0,1,1],[0,1,1,1],2)-.5)<1e-12);
});
test("算法三角對照：判讀規則事先固定——不到 100 盤一律資料不足（相關再高也一樣）；≥0.7 同方向、<0.4 分歧；分歧最大的盤與各組的分歧列得出來；報表寫明「彼此不獨立、不能取代人類評閱」",t=>{
  if(!fs.existsSync(MXC))return t.skip(NO_MXC);const X=require(MXC),K=X.loadMXS(),v=K.MXS.ver;assert.deepEqual({...X.TRI},{minN:100,minPeople:20,mmMin:10,hi:.7,lo:.4,kMin:25});
  const rnd=mkRnd(7),mk=(n,f)=>Array.from({length:n},(_,i)=>{const b=60+rnd()*35,a=f(b,i);return X.normLocal({id:"t"+i,v,o:[80,"A"],n:[Math.round(b),"A"],x:[Math.round(b),Math.round(b),["w","d"][i%2]],b:Math.round(b*10)/10,g:[60+(i%4)*40,40,1,"cpu",5,["新手","業2","業7"][i%3],1,0,0],a},"本機匯出#1")});
  /* 對照算法跟 base 幾乎同序（加一點雜訊） */
  const same=(b)=>[Math.round((100-b)*3+rnd()*6),Math.round(b-20+rnd()*4),40,Math.round((100-b)/4+rnd()*2)];
  const few=X.summarize(mk(60,same),K).tri;assert.equal(few.n,60);assert.ok(few.vs.acpl.rho>.9);assert.equal(few.verdict,"資料不足","60 盤：相關 0.9 以上也是資料不足");assert.deepEqual(few.each,{acpl:"資料不足",mm:"資料不足",er:"資料不足"});
  const A=X.summarize(mk(150,same),K),T=A.tri;assert.equal(T.n,150);for(const k of["acpl","mm","er"]){assert.equal(T.vs[k].n,150);assert.ok(T.vs[k].rho>=.7,k+" ρ "+T.vs[k].rho);assert.ok(T.vs[k].kappa>.6)}assert.equal(T.verdict,"同方向");assert.ok(T.among["acpl~er"].rho>.8);
  /* 首選一致率跟 base 無關、失誤率半相關 → 整體取最差 */
  const mixed=X.summarize(mk(150,(b)=>[Math.round((100-b)*3),Math.round(rnd()*100),40,Math.round((100-b)/4+rnd()*14)]),K).tri;assert.equal(mixed.each.acpl,"同方向");assert.equal(mixed.each.mm,"分歧");assert.ok(["部分一致","同方向"].includes(mixed.each.er));assert.equal(mixed.verdict,"分歧");
  /* 有記首選不到 10 步的盤，首選一致率不算 */
  const thin=X.summarize(mk(150,(b)=>[Math.round((100-b)*3),50,9,Math.round((100-b)/4)]),K).tri;assert.equal(thin.vs.mm.n,0);assert.equal(thin.each.mm,"資料不足");assert.equal(thin.verdict,"同方向","剩下兩種都同方向");
  /* 分歧最大的盤：故意把一盤的 ACPL 弄得跟 base 相反 */
  const G=mk(150,same);G[0].base={v:99,how:"exact"};G[0].alt={acpl:400,mm:5,mmN:40,er:60};const D=X.summarize(G,K).tri;assert.equal(D.top[0].id,"t0");assert.ok(D.top[0].gap>.8);assert.equal(D.top.length,10);
  assert.deepEqual(Object.keys(D.byGroup).sort(),["byEnd","byLen","byRank"]);assert.equal(Object.values(D.byGroup.byEnd).reduce((s,x)=>s+x.n,0),150);assert.ok(D.byGroup.byRank["業1～業5"].rho.acpl!=null);
  const txt=X.report(X.summarize(G,K),[]);assert.match(txt,/## 算法三角對照/);assert.match(txt,/彼此不獨立。一致只代表/);assert.match(txt,/不能取代人類評閱或學習成效的證據/);assert.match(txt,/整體判讀：[^（]+\*\*（不算進任何放行條件）/);assert.match(txt,/分歧最大的盤/);assert.match(txt,/分歧集中在哪一組/);
});
test("算法三角對照：用 App 真正算出來的合成對局跑一次——只用驗證母體；匿名資料沒有首選一致率；匿名碼不到 20 個時整體是資料不足",t=>{
  if(!fs.existsSync(MXC))return t.skip(NO_MXC);const X=require(MXC),K=X.loadMXS(),G=Array.from({length:120},(_,i)=>played(8600+i,30+(i*7)%80,i%3,["r","b",""][i%3])),bad=played(8900,50,1,"r",{start:1});
  const A=X.summarize(G.map(g=>X.deriveCpu(g.cpu,K)).concat(X.deriveCpu(bad.cpu,K)),K),T=A.tri;assert.equal(A.eligible,120);assert.equal(T.n,120,"不合納入條件的那一盤不進對照");assert.equal(T.people,9);
  assert.equal(T.vs.mm.n,0);assert.ok(T.vs.acpl.rho>.5,"同一批著法、同一個引擎評估：ACPL 跟 base 本來就會相關（"+T.vs.acpl.rho+"）");assert.ok(T.vs.er.rho>.3);assert.equal(T.verdict,"資料不足","只有 9 個匿名碼");
  const L=X.summarize(G.map(g=>X.normLocal(g.loc,"本機匯出#1")),K).tri;assert.equal(L.vs.mm.n,120);assert.ok(L.vs.mm.rho>.3);assert.notEqual(L.verdict,"資料不足");
  t.diagnostic(`合成 120 盤：base 對 ACPL ρ ${T.vs.acpl.rho}（κ ${T.vs.acpl.kappa}）、對失誤率 ρ ${T.vs.er.rho}；本機紀錄多一個首選一致率 ρ ${L.vs.mm.rho}；本機整體判讀「${L.verdict}」——合成資料，只驗證工具會算，不是結論`);
});

// ====================== P2：Wilson 精度 ======================
test("〔混合〕P2：judge 用沒有取整的區間——上界 5.02% 顯示成 5.0，但判定是待驗證，不是通過；覆蓋率下界 93.97% 顯示成 94.0，也是待驗證",t=>{
  if(!fs.existsSync(SIM))return t.skip(NO_SIM);const X=require(SIM),r1=v=>+v.toFixed(1);let up=null,dn=null;
  for(let n=1000;n<=6000&&(!up||!dn);n+=1)for(const k of[Math.round(n*.043),Math.round(n*.0435),Math.round(n*.044)]){const w=X.wilson(k,n);if(!up&&w.hi>5&&r1(w.hi)<=5)up=[k,n,w]}
  for(let n=1000;n<=6000&&!dn;n+=1)for(const k of[Math.round(n*.9465),Math.round(n*.947),Math.round(n*.9475)]){const w=X.wilson(k,n);if(w.lo<94&&r1(w.lo)>=94){dn=[k,n,w];break}}
  assert.ok(up&&dn,"找得到取整會改變判定的例子");t.diagnostic(`誤報 ${up[0]}/${up[1]}：上界 ${up[2].hi.toFixed(4)}%（顯示 ${r1(up[2].hi)}）；覆蓋 ${dn[0]}/${dn[1]}：下界 ${dn[2].lo.toFixed(4)}%（顯示 ${r1(dn[2].lo)}）`);
  assert.equal(X.judge(up[2],5,"le"),"待驗證");assert.equal(X.judge({...up[2],hi:r1(up[2].hi)},5,"le"),"通過","先取整再判（SIM_VER 2 的做法）會變成通過");
  assert.equal(X.judge(dn[2],94,"ge"),"待驗證");assert.equal(X.judge({...dn[2],lo:r1(dn[2].lo)},94,"ge"),"通過");
  /* wilson 回完整精度；run 的 ci 也是，rate 才是顯示用的 1 位小數 */
  const w=X.wilson(137,3000);assert.notEqual(w.lo,r1(w.lo));assert.notEqual(w.hi,r1(w.hi));const A=X.loadApp(),r=X.run(A,"x",{rho:.7,pEnd:.6},20,150,3,0);assert.notEqual(r.ci.new.any.hi,r1(r.ci.new.any.hi));assert.equal(r.rate.new.any,r1(r.ci.new.any.p));
  assert.equal(X.SIM_VER,3);const src=rd(SIM);assert.match(src,/return \{ p: 100 \* p, lo: 100 \* Math\.max\(0, c - h\), hi: 100 \* Math\.min\(1, c \+ h\), k, n \}/);assert.match(src,/逐格的 95% 區間不是整張表同時有 95% 的保證/);
});

// ====================== 文件與版本紀錄 ======================
test("〔原始碼〕manifest 的說明寫明它是本機追溯與一致性檢查，不是第三方認證、不是正式站同版證明",t=>{
  if(!fs.existsSync(MAN))return t.skip(NO_MAN);const s=rd(MAN);assert.match(s,/本機追溯與一致性檢查/);assert.match(s,/不是第三方認證/);assert.match(s,/不是「正式站跟本機同版」的證明/);assert.match(s,/不是防竄改/);
  const X=require(MAN);assert.equal(X.PLAN_VER,"v1.2");assert.deepEqual(Object.keys(X.DOCS).sort(),["plan","planV1","planV11","ref"]);
  const j=path.join(__dirname,"mx-manifest.json");if(fs.existsSync(j))assert.match(JSON.parse(rd(j)).note,/不是第三方認證/);
});
test("〔原始碼〕預先驗證方案 v1.2：B1 差 1 級的規則、截點的敏感度與適用範圍、上下界只對單調統計量有效、已決定的事、算法三角對照能回答與不能回答什麼；v1.1、v1 保留",t=>{
  const f=path.join(DBD,"story/數學模型_預先驗證方案_v1.2.md");if(!fs.existsSync(f))return t.skip("沒有 story/數學模型_預先驗證方案_v1.2.md（文件只在開發者電腦，公開副本沒有）");const D=rd(f);
  for(const k of["版本 v1.2","對應 `MXS` v4","差 1 級 → 取較低的那一級","沒有「多數」","第 30、60、90 手各截一次","不能看哪個截點相關最高就改用它","只對「截點以前的著法」成立，不推廣到整盤","不保證盲化","上下界只對「單調」的統計量是界限","全下界／全上界不構成界限","[3,1,2] 相關是 −0.5","數字字串、null 都不收","有識別欄位","新舊配對",
    "只用開發者和認識的測試者下的棋","不新增任何資料收集","代表性有限","## 十、算法三角對照","它能回答什麼","它不能回答什麼","彼此不獨立","不等於測到了真正的棋力","不算進第五節任何一項的通過條件","判讀規則（事先固定","`SK.PICKOK`","| v1.2 | 2026-11-15 |","真人資料仍是 0 盤","不是第三方認證"])assert.ok(D.includes(k),"v1.2 裡要有「"+k+"」");
  assert.doesNotMatch(D,/多數決等級|待開發者決定，沒有就不能做 A、B/);for(const[old,by]of[["數學模型_預先驗證方案_v1.1.md","已由 v1.2 取代"],["數學模型_預先驗證方案_v1.md","已由 v1.1 取代"]]){const p=path.join(DBD,"story",old);if(fs.existsSync(p))assert.ok(rd(p).includes(by),old)}
});
test("〔原始碼〕外部公式參考 v2：殺棋整點寫成跟 Lichess 相同、封頂維持 ±2000；三種對照算法各有定義、固定的出處與適用限制",t=>{
  const f=path.join(DBD,"story/數學模型_外部公式參考.md");if(!fs.existsSync(f))return t.skip("沒有 story/數學模型_外部公式參考.md（文件只在開發者電腦，公開副本沒有）");const D=rd(f);
  for(const k of["版本 v2","`MXS` v4","**相同**（`MXS` v4 起；v3 以前 −700 整點算失著）","**相同**（`MXS` v4 起；v3 以前 +1000 整點算失著）","評估封頂維持 ±2000","## 五、對照算法","modules/analyse/src/main/AccuracyCP.scala","0468854063ae0b73a1f0697e82008ee988ca304c","Intrinsic Chess Ratings","25(1), 834–839","彼此不獨立","不能跟 Lichess 或任何西洋棋的 ACPL 數字比大小","不是他們的 Intrinsic Performance Rating","沒有做「表現等級分」","| v2 | 2026-11-15 |"])assert.ok(D.includes(k),"外部公式參考裡要有「"+k+"」");
  assert.doesNotMatch(D,/\*\*只差在 [−+]\d+ 整點\*\*/,"對照表不該再寫「只差在整點」");
});
