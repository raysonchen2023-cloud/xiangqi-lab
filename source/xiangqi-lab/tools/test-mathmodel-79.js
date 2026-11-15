// 數學模型驗證閉環（ChatGPT 第二次重評 story/chatgpt_app/數學模型77修正後_三視角重評_2026-11-15.md 第五節第 2～4 項）的回歸測試。
//   第 2 項 候選資料字典與離線比較：本機 mxShadow 多存 base 與分組用的欄位、開發者模式的自願匯出（不上傳）、匿名 t:"cpu" 的欄位一個都沒有增加；
//           tools/mx-compare.js 讀本機匯出檔與 cpu-games.jsonl——完整盤反推的 raw／s0 跟 App 算的一樣，超過 150 步的長局標「截斷」、不當成完整的盤。
//   第 3 項 外部公式參考：預期得分曲線、每步準確度跟 Lichess（固定的 lila commit，story/數學模型_外部公式參考.md）在幾個點的數值對照；
//           送殺／漏殺分界整點（−700、−1000、+700、+1000）的現行行為與跟 Lichess 的差異；影子模式的註解、開發者頁不再寫「勝率」。
//   第 4 項 階段差異的配對估計與選擇效應：mxPairSe＝Var(A)＋Var(B)−2Cov(A,B)、缺階段的盤、有效盤數（Kish）、t 臨界值、Bonferroni；
//           回傳欄位照舊、沒有同段位基準仍然只給 soft；模擬（tools/sim-phase-pair.js）零差異時整個挑選程序的誤報率。
// 全部用 vm 載入 App 裡真正的程式片段（05-settings、05b-save、04-stats），不開瀏覽器。玩家看到的分數（每步準確度、一盤總分、S～D）這次沒有動。
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),path=require("path"),vm=require("vm"),os=require("os"),cp=require("child_process");
const LAB=path.join(__dirname,".."),DBD=path.join(LAB,"../xiangqi-db"),M=path.join(DBD,"m");
const rd=f=>fs.readFileSync(f,"utf8").replace(/\r\n/g,"\n");
const S=rd(path.join(M,"05-settings.js")),ST=rd(path.join(M,"04-stats.js")),SV=rd(path.join(M,"05b-save.js"));
const C=require("../site/core.js");
const sl=(s,a,b,name)=>{const i=s.indexOf(a),j=s.indexOf(b,i+1);assert.ok(i>=0&&j>i,"找不到 "+(name||a));return s.slice(i,j)};
const SH=sl(S,"function qNow(","\n/* ================= 影子模式","qNow")+"\n"+sl(S,"const MXS={","\nfunction gameReport(","MXS…mxShExport");
const CPA=sl(SV,"const CPA_Q=","\nfunction cpaWatch(","cpaDone");
const MXC=path.join(__dirname,"mx-compare.js"),SIM=path.join(__dirname,"sim-phase-pair.js");
const NO_MXC="沒有 mx-compare.js（離線比較工具只在開發者電腦，公開副本沒有）",NO_SIM="沒有 sim-phase-pair.js（模擬腳本只在開發者電腦，公開副本沒有）";
const clamp=C.clampV,oldQ=C.gradeLoss;
function mkRnd(s){return()=>{s=(s*1103515245+12345)%2147483648;return s/2147483648}}

/* 一台假的手機：影子模式（05-settings）＋對局評分存檔（05b-save 的 cpaDone）放在同一個全域，store、XQNet 都是假的；sent＝匿名送出的每一筆 */
function phone(o){o=o||{};const mem={},sent=[],toasts=[];
  const ctx={console,isFinite,esc:x=>String(x),Date,Math,JSON,Uint8Array,crypto:{getRandomValues:a=>{for(let i=0;i<a.length;i++)a[i]=(i*37+11)%256;return a}},navigator:{webdriver:false},
    store:{get:(k,d)=>k in mem?JSON.parse(JSON.stringify(mem[k])):d,set:(k,v)=>{mem[k]=JSON.parse(JSON.stringify(v))}},DEVMODE:()=>!!o.dev,fnTest:()=>false,fnDev:()=>"phone",toast:t=>toasts.push(t),
    gameReport:(b,mv)=>({sides:{r:{score:80,grade:["A"],base:80.3},b:{score:80,grade:["A"],base:80.3}},plies:mv})};
  ctx.window=ctx;ctx.XQCore={parseFen:()=>[],START:"s"};ctx.XQNet={shareIRT:x=>sent.push(JSON.parse(JSON.stringify(x)))};ctx.XQ_BUILD="20261115-test";
  vm.createContext(ctx);vm.runInContext(SH+"\n"+CPA+";this.R={MXS,mxWin,mxShSide,mxShadowReport,mxShHtml,mxShExportPack,mxShExport,cpaDone}",ctx,{filename:"05-settings＋05b-save(片段)"});
  return{...ctx.R,mem,sent,toasts,ctx}}
/* 假設的一盤：紅方（玩家）每步少掉的分數照段位分布，偶爾一步妙著；黑方是電腦。own＝紅方要走幾步 */
const LV=[{p0:.30,s:[.45,60],m:[.17,220],b:[.08,300,1500]},{p0:.40,s:[.45,40],m:[.11,150],b:[.04,300,1200]},{p0:.55,s:[.42,20],m:[.03,90],b:[0,300,900]}];
function game(rnd,own,P){const ex=mu=>-mu*Math.log(1-rnd()+1e-12),dl=()=>{const u=rnd();return Math.round(u<P.p0?ex(6):u<P.p0+P.s[0]?ex(P.s[1]):u<P.p0+P.s[0]+P.m[0]?ex(P.m[1]):P.b[1]+rnd()*(P.b[2]-P.b[1]))};
  let E=0;const mv=[];for(let i=0;i<own*2;i++){const s=i%2?"b":"r",sg=s==="r"?1:-1,best=sg*E,L=s==="r"?dl():Math.round(rnd()*25),played=best-L;E=sg*played;const loss=Math.max(0,clamp(best)-clamp(played)),br=s==="r"&&L===0&&rnd()<.04;
    mv.push({ply:i+1,by:s,phase:i<20?"open":i<own*1.4?"mid":"end",cn:"",ev:sg*played,bv:sg*best,loss,q:br?"妙著":best===played?"正著":oldQ(loss)})}return mv}
const stOf=(id,mv,w)=>({id,human:"r",result:{w,why:w==="b"?"你認輸":""},moves:mv,kind:"cpu",level:5,cpuRate:{rank:"業2",pts:1234},hintN:0,undoN:0});
const CPU_KEYS=["aid","bl","crk","dev","full","g","hn","hu","kind","lv","m","mx","n","nrk","o","pts","res","rk","s","std","t","un","v","ver","why"];

// ====================== 第 2 項：本機紀錄、匯出、匿名欄位不變 ======================
test("第 2 項：下完一盤，本機 mxShadow 存 raw／s0／score／終局，另外多存 base（小數 1 位）與分組用的 g＝[總手數, 我方步數, 評完, 種類, 級數, 段位]",()=>{
  const P=phone(),mv=game(mkRnd(3),40,LV[1]);P.cpaDone(stOf("g1",mv,"b"),1);
  const X=P.mxShadowReport({plies:mv},"b").r,rec=P.mem.mxShadow.g1;
  assert.deepEqual(rec.n,[X.score,X.grade]);assert.deepEqual(rec.x,[X.raw,X.s0,"l"]);assert.equal(rec.v,P.MXS.ver);assert.equal(rec.b,Math.round(X.base*10)/10);
  assert.deepEqual(rec.g,[80,X.n,1,"cpu",5,"業2"]);assert.deepEqual(rec.o,[80,"A"]);
});
test("第 2 項：匿名送出的 t:\"cpu\" 欄位一個都沒有增加（跟 11/15 以前同一份清單）；raw、s0、本機多存的 b／g 都沒有送出去；逐步資料最多 150 步",()=>{
  const P=phone(),mv=game(mkRnd(4),170,LV[1]);P.cpaDone(stOf("g2",mv,"r"),1);assert.equal(P.sent.length,1);const x=P.sent[0];
  assert.deepEqual(Object.keys(x).sort(),CPU_KEYS,"匿名欄位清單變了");assert.equal(x.m.length,150);assert.equal(x.n,340);assert.equal(x.s.length,3);assert.equal(x.o.length,3);
  for(const v of x.m)assert.equal(v.length,9,"每一步 9 個數字");
  assert.match(SV,/m:X\.mv\.slice\(0,150\)/,"截斷長度寫在 05b-save.js");
});
test("第 2 項：自願匯出只在開發者模式——不是開發者模式按了什麼都不做；匯出的內容＝本機 mxShadow＋MXS 常數，沒有走 XQNet",()=>{
  const P=phone({dev:0});P.cpaDone(stOf("g3",game(mkRnd(5),30,LV[0]),""),1);const n0=P.sent.length;
  P.ctx.document={createElement(){throw new Error("不該建立下載連結")}};P.mxShExport("file");assert.equal(P.toasts.length,0);
  const D=phone({dev:1});D.cpaDone(stOf("g4",game(mkRnd(6),30,LV[0]),"r"),1);D.cpaDone(stOf("g5",game(mkRnd(7),30,LV[2]),"b"),1);
  const pk=D.mxShExportPack();assert.equal(pk.kind,"xq-mxshadow");assert.equal(pk.fmt,1);assert.equal(pk.n,2);assert.equal(pk.cap,200);assert.equal(pk.mxs.ver,D.MXS.ver);assert.deepEqual(Array.from(pk.games,g=>g.id),["g4","g5"]);
  let saved=null,copied=null;D.ctx.URL={createObjectURL:b=>{saved=b;return"blob:x"},revokeObjectURL(){}};D.ctx.Blob=function(a){this.text=a.join("")};D.ctx.setTimeout=()=>{};
  D.ctx.document={createElement:()=>({style:{},click(){},remove(){}}),body:{append(){}}};D.ctx.navigator.clipboard={writeText:t=>{copied=t;return Promise.resolve()}};
  D.mxShExport("file");assert.ok(saved&&JSON.parse(saved.text).games.length===2);assert.match(D.toasts[0],/沒有上傳/);D.mxShExport("copy");assert.equal(JSON.parse(copied).n,2);
  assert.equal(D.sent.length,0,"開發者模式本來就不送匿名資料，匯出也不送");assert.equal(P.sent.length,n0);
  const h=D.mxShHtml({score:80,grade:["A"],base:80,cap:100,cnt:{}},D.mxShadowReport({plies:game(mkRnd(8),30,LV[1])}).r);assert.match(h,/data-mxexp="file"/);assert.match(h,/data-mxexp="copy"/);assert.match(h,/不上傳/);
});
test("〔原始碼〕第 2 項：匯出鈕只接在開發者模式才畫的影子區塊（reportSheet 只有 DEVMODE 才算 SH、才呼叫 mxShHtml）；mxShExport 裡沒有任何送出",()=>{
  assert.match(S,/const SH=\(\(\)=>\{try\{return typeof DEVMODE==="function"&&DEVMODE\(\)\?mxShadowReport\(rep\):null/);assert.match(S,/\$\{SH\?mxShHtml\(R,SH\[s\]\):""\}/);
  const ex=sl(S,"function mxShExportPack(","\nfunction gameReport(","mxShExport");assert.doesNotMatch(ex,/XQNet|shareIRT|fetch\(|sendBeacon|XMLHttpRequest/);assert.match(ex,/if\(!\(typeof DEVMODE==="function"&&DEVMODE\(\)\)\)return/);
});

// ====================== 第 2 項：離線比較工具 mx-compare.js ======================
/* 用真的 cpaDone 產生「本機紀錄」和「匿名那一筆」，真值＝App 當時算的 X */
function played(seed,own,lv,w){const P=phone(),mv=game(mkRnd(seed),own,LV[lv]);P.cpaDone(stOf("g"+seed,mv,w),1);return{X:P.mxShadowReport({plies:mv},w).r,cpu:{...P.sent[0],at:1},loc:{id:"g"+seed,...P.mem.mxShadow["g"+seed]},P}}
test("第 2 項：完整盤（40～120 步，贏／輸／和各 150 盤）——從匿名資料反推的 raw、s0 範圍一定包住 App 算的值；標「確定」的要一模一樣；沒有一盤對不起來",t=>{
  if(!fs.existsSync(MXC))return t.skip(NO_MXC);const X=require(MXC),K=X.loadMXS();let n=0,sure={raw:0,s0:0},lostCap=0,edge=0;
  for(let i=0;i<450;i++){const w=["r","b",""][i%3],g=played(1000+i,40+(i*7)%81,i%3===1?2:(i>>1)%3,w),d=X.deriveCpu(g.cpu,K);n++;
    assert.equal(d.trunc,false);assert.equal(d.score.v,g.X.score);assert.equal(d.end,w==="r"?"w":w==="b"?"l":"d");assert.equal(d.base.v,Math.round(g.X.base*10)/10);
    assert.ok(!d.flags.some(f=>/不一致/.test(f)),`第 ${i} 盤：${d.flags.join("；")}`);
    for(const k of["raw","s0"]){assert.ok(d[k].lo<=g.X[k]&&g.X[k]<=d[k].hi,`第 ${i} 盤 ${k}：App ${g.X[k]}，反推 ${d[k].lo}～${d[k].hi}`);const eg=d.flags.some(f=>/分界附近/.test(f));   /* 有一步掉分正好在 capDw 分界附近（送出來的評估是整數，分不出算不算重大錯誤）：重大錯誤上限有兩種可能，標「只有範圍」 */
      assert.ok(eg||d[k].hi-d[k].lo<=1,`完整盤 ${k} 最多差 1（base 只有小數 1 位）：${d[k].lo}～${d[k].hi}`);if(eg&&k==="raw")edge++;
      if(d[k].how==="derived"){assert.equal(d[k].v,g.X[k]);sure[k]++}else assert.equal(d[k].how,d[k].hi-d[k].lo>1?"bound":"approx")}
    if(g.X.lost&&g.X.s0>g.X.score)lostCap++}
  assert.ok(lostCap>=10,`要有被輸棋上限壓到的盤（s0＞score）才測得到反推：${lostCap}`);assert.ok(sure.s0/n>=.9&&sure.raw/n>=.85,`確定的比例 raw ${sure.raw}/${n}、s0 ${sure.s0}/${n}`);
  t.diagnostic(`450 盤：raw 確定 ${sure.raw}、s0 確定 ${sure.s0}，其餘標 ±1 或只有範圍（${edge} 盤有一步正好在 capDw 分界附近）；s0＞score 的輸棋 ${lostCap} 盤`);
});
test("第 2 項：超過截斷長度的長局（我方 170 步，只送前 150 步）標「截斷」——獎勵、重大錯誤上限只給範圍，App 的值落在範圍裡；剛好 150 步的盤不算截斷",t=>{
  if(!fs.existsSync(MXC))return t.skip(NO_MXC);const X=require(MXC),K=X.loadMXS();let bound=0,n=0;
  for(let i=0;i<120;i++){const w=["r","b",""][i%3],g=played(5000+i,170,i%3,w),d=X.deriveCpu(g.cpu,K);n++;assert.equal(g.cpu.m.length,150);assert.equal(d.trunc,true);assert.match(d.flags.join("；"),/截斷：逐步資料只有前 150 步/);
    assert.equal(d.score.v,g.X.score);for(const k of["raw","s0"])assert.ok(d[k].lo<=g.X[k]&&g.X[k]<=d[k].hi,`長局第 ${i} 盤 ${k}：App ${g.X[k]}，範圍 ${d[k].lo}～${d[k].hi}`);
    assert.ok(!d.flags.some(f=>/不一致/.test(f)),d.flags.join("；"));for(const k of["raw","s0"])assert.ok(["derived","bound"].includes(d[k].how),"截斷的盤不標 ±1："+d[k].how);if(d.raw.how==="bound"||d.s0.how==="bound")bound++;
    if(w!=="b"){assert.equal(d.s0.how,"derived","不是輸的盤 s0＝score，截斷也確定");assert.equal(d.s0.v,g.X.s0)}}
  assert.ok(bound>=10,`長局裡要有反推不出唯一值的盤：${bound}/${n}`);
  const e=played(77,150,1,"r"),de=X.deriveCpu(e.cpu,K);assert.equal(e.cpu.m.length,150);assert.equal(e.cpu.n,300);assert.equal(de.trunc,false,"總手數 300、我方最多 150 步＝沒有截斷");
  /* 被截掉的那一段有妙著、有大錯：只看前 150 步會算錯，所以不能當成完整的盤 */
  const P=phone(),mv=game(mkRnd(9),170,LV[2]);for(const m of mv)if(m.by==="r"&&m.ply>300){if(m.ply%4===1){m.loss=0;m.q="妙著";m.bv=m.ev}}
  P.cpaDone(stOf("gx",mv,"r"),1);const Xr=P.mxShadowReport({plies:mv},"r").r,d=X.deriveCpu({...P.sent[0]},K);assert.ok(Xr.bonus>0);assert.ok(d.bonus[1]>=Xr.bonus&&d.bonus[0]<=Xr.bonus);assert.ok(d.raw.lo<=Xr.raw&&Xr.raw<=d.raw.hi);
});
test("第 2 項：本機匯出檔讀進來都是原值；11/15 以前的舊紀錄（沒有 b、g）base、局長、段位標未知，不補造",t=>{
  if(!fs.existsSync(MXC))return t.skip(NO_MXC);const X=require(MXC),D=phone({dev:1}),want={};
  for(let i=0;i<6;i++){const w=["r","b",""][i%3],mv=game(mkRnd(60+i),35+i*10,LV[i%3]);D.cpaDone(stOf("L"+i,mv,w),1);want["L"+i]=D.mxShadowReport({plies:mv},w).r}
  const mem=D.mem.mxShadow;mem.OLD={o:[70,"B"],n:[75,"B"],x:[88,80,"l"],v:D.MXS.ver,at:5};
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"mx79a-")),f=path.join(dir,"exp.json");fs.writeFileSync(f,JSON.stringify(D.mxShExportPack()));const R=X.readLocal(f);fs.rmSync(dir,{recursive:true,force:true});
  assert.equal(R.games.length,7);for(const g of R.games){if(g.id==="OLD")continue;const w=want[g.id];assert.deepEqual([g.raw.v,g.s0.v,g.score.v,g.end],[w.raw,w.s0,w.score,w.end]);assert.equal(g.raw.how,"exact");assert.equal(g.base.v,Math.round(w.base*10)/10);assert.equal(g.rank,"業2");assert.ok(g.plies>0)}
  const o=R.games.find(g=>g.id==="OLD");assert.equal(o.base.how,"na");assert.equal(o.plies,null);assert.equal(o.rank,null);assert.deepEqual([o.raw.v,o.s0.v,o.score.v],[88,80,75]);assert.match(o.flags[0],/舊紀錄/);
  assert.throws(()=>{const d2=fs.mkdtempSync(path.join(os.tmpdir(),"mx79b-")),g=path.join(d2,"x.json");fs.writeFileSync(g,'{"kind":"xqsave"}');try{X.readLocal(g)}finally{fs.rmSync(d2,{recursive:true,force:true})}},/不是影子紀錄匯出檔/);
});
test("第 2 項：整支工具跑一次（本機匯出檔＋cpu-games.jsonl）——按終局、段位、局長分組；截斷的長局、別的 MXS 版本、測試資料都沒有混進分布",t=>{
  if(!fs.existsSync(MXC))return t.skip(NO_MXC);const dir=fs.mkdtempSync(path.join(os.tmpdir(),"mx79c-")),D=phone({dev:1}),L=[];
  for(let i=0;i<5;i++)D.cpaDone(stOf("L"+i,game(mkRnd(200+i),30+i*12,LV[i%3]),["r","b",""][i%3]),1);
  for(let i=0;i<30;i++){const g=played(300+i,40+(i*11)%70,i%3,["r","b",""][i%3]);L.push(JSON.stringify({...g.cpu,aid:"p"+(i%7),g:"g"+i,crk:["新手","業2","業7"][i%3]}))}
  const lg=[played(401,170,2,"b"),played(402,170,0,"b"),played(403,170,1,"b")].map((g,i)=>({...g.cpu,aid:"p9",g:"long"+i}));for(const x of lg)L.push(JSON.stringify(x));
  L.push(JSON.stringify({...played(404,50,1,"r").cpu,aid:"p1",g:"oldver",mx:2}));L.push(JSON.stringify({...played(405,50,1,"r").cpu,aid:"p1",g:"tst",test:1}));L.push(L[0]);L.push("{壞掉的一行");
  const fl=path.join(dir,"exp.json"),fc=path.join(dir,"cpu.jsonl"),fo=path.join(dir,"out.json");fs.writeFileSync(fl,JSON.stringify(D.mxShExportPack()));fs.writeFileSync(fc,L.join("\n")+"\n");
  const so=cp.execFileSync(process.execPath,[MXC,"--local",fl,"--cpu",fc,"--json",fo],{encoding:"utf8"}),J=JSON.parse(fs.readFileSync(fo,"utf8")).summary;fs.rmSync(dir,{recursive:true,force:true});
  assert.equal(J.n,38,"5 本機＋30＋3 長局");assert.deepEqual(J.otherVer,{v2:1});assert.equal(J.trunc,3);assert.equal(J.incons,0);
  assert.match(so,/略過 測試 1、重複 1、盲棋 0、壞行 1/);assert.match(so,/逐步資料被截斷（超過 150 步的長局）：3 盤/);assert.match(so,/## 按終局/);assert.match(so,/## 按段位/);assert.match(so,/## 按局長（總手數）/);assert.match(so,/### 121 手以上/);assert.match(so,/截斷：逐步資料只有前 150 步/);
  assert.deepEqual(Object.keys(J.byEnd).sort(),["和","贏","輸"].sort());assert.ok(J.byRank["入門以下"]&&J.byRank["業1～業5"]&&J.byRank["業6 以上"]);assert.equal(J.bySrc.local.n,5);assert.equal(J.bySrc.cpu.n,33);
  for(const id of["p9/long0","p9/long1","p9/long2"])assert.ok(J.unsure.some(u=>u.id===id&&u.trunc),id+" 要列在「無法精確重算」");
  assert.equal(J.all.raw.n,J.n-J.all.unsure.raw,"不確定的盤沒有算進 raw 的分布");assert.ok(J.all.unsure.raw>=1);assert.ok(J.all.rawMinusS0.mean>=0&&J.all.s0MinusScore.mean>=0,"raw ≥ s0 ≥ score");
  assert.ok(J.byEnd["贏"].s0MinusScore.max===0&&J.byEnd["和"].s0MinusScore.max===0,"贏、和的盤沒有輸棋上限，s0＝score");
});

// ====================== 第 3 項：外部公式參考（Lichess 固定版本）與邊界 ======================
const X0=phone(),W=c=>X0.mxWin(c);
/* 照固定版本的原始碼寫的對照式（scalachess eval.scala WinPercent、lila AccuracyPercent.scala、Advice.scala；commit 與檔案雜湊在 story/數學模型_外部公式參考.md） */
const LI={win:c=>50+50*(2/(1+Math.exp(-0.00368208*Math.max(-1000,Math.min(1000,c))))-1),acc:d=>d<=0?100:Math.max(0,Math.min(100,103.1668100711649*Math.exp(-0.04354415386753951*d)-3.166924740191411+1)),
  mateCreated:prev=>prev<-999?"緩著":prev<-700?"失著":"敗著",mateLost:next=>next>999?"緩著":next>700?"失著":"敗著"};
test("第 3 項：預期得分曲線在 ±1000 分以內跟 Lichess 的 Win% 逐點相同（0、±100、±300、±700、±1000）；超過 1000 分是本案自訂（Lichess 封在 ±1000，本案封在 ±2000）",()=>{
  const REF={0:50,100:59.1026,300:75.1126,700:92.9397,1000:97.5447,"-100":40.8974,"-300":24.8874,"-700":7.0603,"-1000":2.4553};
  for(const[c,v]of Object.entries(REF)){assert.ok(Math.abs(W(+c)-LI.win(+c))<1e-9,`cp ${c}`);assert.equal(+W(+c).toFixed(4),v,`cp ${c} 的數值`)}
  assert.equal(+LI.win(1500).toFixed(4),97.5447);assert.ok(W(1500)>99.5&&W(1500)<99.7,"本案 1500 分約 99.6%，Lichess 97.5%");assert.equal(W(2500),W(2000));assert.equal(W(29990),W(2000),"殺棋也封在 ±2000（Lichess 是 ±1000）");
  assert.ok(Math.abs(W(700)+W(-700)-100)<1e-9,"對稱：cp＝0 固定 50%（沒有截距）");
});
test("第 3 項：每步準確度＝Lichess 的式子少 +1（不確定加分）——掉 0.5、5、10、20、40、60% 時都正好差 1 分（常數取到小數 4 位，誤差 < 0.01）；完全沒掉分時 Lichess 100、本案 99.9999",()=>{
  const a0=X0.mxShSide({plies:[{ply:1,by:"r",phase:"mid",cn:"",ev:0,bv:0,loss:0,q:"正著"}]},"r").mv[0].acc;assert.ok(Math.abs(a0-99.9999)<1e-9);
  const src=sl(S,"function mxAccDw(","\n","mxAccDw");assert.match(src,/103\.1668\*Math\.exp\(-0\.04354\*/);assert.match(src,/-3\.1669\)/);
  const mine=d=>Math.max(0,Math.min(100,103.1668*Math.exp(-0.04354*d)-3.1669));
  for(const[d,ref]of[[.5,98.778],[5,80.8153],[10,64.5798],[20,41.0168],[40,15.909],[60,5.3993]]){assert.equal(+LI.acc(d).toFixed(4),ref);assert.ok(Math.abs(LI.acc(d)-1-mine(d))<.01,`掉 ${d}%：Lichess ${LI.acc(d)}、本案 ${mine(d)}`)}
  /* 真的從 App 的函式走一遍：均勢走成 −100（掉 9.1026%） */
  const x=X0.mxShSide({plies:[{ply:1,by:"r",phase:"mid",cn:"",ev:-100,bv:0,loss:100,q:"緩著"}]},"r").mv[0];assert.ok(Math.abs(x.dw-9.1026)<1e-3);assert.ok(Math.abs(x.acc-(LI.acc(x.dw)-1))<.01);
});
const mvM=(best,played)=>({loss:Math.max(0,clamp(best)-clamp(played)),ev:played,bv:best,by:"r",q:"失著"});
test("第 3 項：送殺分界整點（走之前的評估 −699／−700／−701／−999／−1000／−1001）——現行行為固定下來；跟 Lichess 只差在 −700 整點（Lichess 敗著、本案失著）",()=>{
  const got={},dif=[];for(const b of[-699,-700,-701,-999,-1000,-1001]){const x=X0.mxShSide({plies:[{ply:1,phase:"mid",cn:"",...mvM(b,-29990)}]},"r").mv[0];assert.equal(x.mt,1);got[b]=x.q;if(x.q!==LI.mateCreated(b))dif.push(b)}
  assert.deepEqual(got,{"-699":"敗著","-700":"失著","-701":"失著","-999":"失著","-1000":"緩著","-1001":"緩著"});assert.deepEqual(dif,[-700]);
});
test("第 3 項：漏殺分界整點（走完的評估 +699／+700／+701／+999／+1000／+1001）——現行行為固定下來；跟 Lichess 只差在 +1000 整點（Lichess 緩著、本案失著）",()=>{
  const got={},dif=[];for(const p of[699,700,701,999,1000,1001]){const x=X0.mxShSide({plies:[{ply:1,phase:"mid",cn:"",...mvM(29990,p)}]},"r").mv[0];assert.equal(x.mt,2);got[p]=x.q;if(x.q!==LI.mateLost(p))dif.push(p)}
  assert.deepEqual(got,{699:"敗著",700:"敗著",701:"失著",999:"失著",1000:"失著",1001:"緩著"});assert.deepEqual(dif,[1000]);
  assert.deepEqual([Array.from(X0.MXS.walk),Array.from(X0.MXS.miss)],[[-700,-1000],[700,1000]]);assert.equal(X0.MXS.ver,3,"這次沒有改 MXS 的任何數字或算法，版本不變");
});
test("〔混合〕第 3 項：影子模式的註解和開發者頁不再寫「勝率」，統一成預期得分；玩家畫面其他功能的「勝率」（戰績）沒有動",()=>{
  const blk=sl(S,"/* ================= 影子模式","\nfunction gameReport(","影子模式整段");assert.doesNotMatch(blk,/勝率/);assert.match(blk,/預期得分＝P\(勝\)＋0\.5×P\(和\)|「預期得分」＝P\(勝\)＋0\.5×P\(和\)/);
  assert.doesNotMatch(sl(SV,"/* ---------- 跟電腦下完一盤的匿名評分資料","\nconst CPA_Q=","cpa 說明"),/勝率/);
  const mv=game(mkRnd(12),40,LV[0]),P=phone(),h=P.mxShHtml({score:70,grade:["B"],base:70,cap:100,cnt:{}},P.mxShadowReport({plies:mv},"b").r);assert.doesNotMatch(h,/勝率/);assert.match(h,/預期得分 −\d/);
  assert.match(ST,/\["勝率",N\?Math\.round\(p\.w\*100\/N/,"戰績頁的勝率（真的贏幾成）照舊");assert.match(ST,/<span>總勝率<\/span>/);
});
test("〔原始碼〕第 3 項：外部公式參考文件寫著固定的 commit、檔案路徑與 blob 雜湊、取用日期，逐條列自訂差異",t=>{
  const f=path.join(DBD,"story/數學模型_外部公式參考.md");if(!fs.existsSync(f))return t.skip("沒有 story/數學模型_外部公式參考.md（文件只在開發者電腦，公開副本沒有）");const D=rd(f);
  for(const k of["4a427ef69b93816aac87e0df59b44f38ea2e49fe","modules/analyse/src/main/AccuracyPercent.scala","a46b4e6d9d80a100c2a617db8bbc558bcec918d5","modules/tree/src/main/Advice.scala","f853e1e941f4ec1c3f02320438ee22f7d5ffb40b","e318e5ed9218140b37c344796592b18955d0e04d","2026-11-15","AGPL"])assert.ok(D.includes(k),"文件裡要有 "+k);
  for(const k of["+1","−700","+1000","±1000","±2000","妙著","輸棋"])assert.ok(D.includes(k),"自訂差異要提到 "+k);
});

// ====================== 第 4 項：階段差異的配對估計與選擇效應 ======================
const SKSRC=sl(ST,"const SK={","\n/* 校正檔（store calib","SK")+"\n"+sl(ST,"const MX_RK=","\n/* 每盤一列","MX_RK…mxTierName")+"\n"+sl(ST,"function mxAxisPt(","\n/* 開發者 11/11「下完一局","mxAxisPt…skillPick");
function loadSk(calib,rank){const mem={calib},ctx={console,isFinite,QZ:{S:.55,MID:7,C:.05},store:{get:(k,d)=>k in mem?mem[k]:d,set:(k,v)=>{mem[k]=v}},window:{}};if(rank)ctx.XQNet=ctx.window.XQNet={rating:()=>({rank})};vm.createContext(ctx);
  vm.runInContext(SKSRC+";this.R={SK,mxCal,mxAxisPt,skillAxes,mxTotal,skillPick,mxPairSe,mxTcrit,MX_ZC}",ctx,{filename:"04-stats(五軸片段)"});return ctx.R}
const K=loadSk(null),LAM=Math.pow(.5,1/15);
/* 每盤三個階段的平均準確度 [開局, 中局, 殘局]（null＝這盤沒走到），每階段 n 步 */
const rowsOf=(T,n)=>T.map((a,j)=>{const pa={},A=[];["open","mid","end"].forEach((k,i)=>{if(a[i]==null){pa[k]=[0,0];return}pa[k]=[a[i]*n,n];for(let q=0;q<n;q++)A.push(a[i])});return{t:1e6-j,hu:0,n:A.length,bad:0,best:0,pa,A}});
/* 不靠 App 的程式另外算一次：W_j＝λ^j·n、u_j＝W_j(ā_j−m)／ΣW */
function byHand(T,n,a,b){const inf=i=>{let sw=0,sx=0;T.forEach((r,j)=>{if(r[i]!=null){const w=LAM**j*n;sw+=w;sx+=w*r[i]}});const m=sx/sw;let q=0;const u=T.map((r,j)=>{if(r[i]==null)return 0;const w=LAM**j*n;q+=w*w;return w*(r[i]-m)/sw});return{m,u,ne:sw*sw/q}};
  const A=inf(a),B=inf(b);let va=0,vb=0,cv=0;A.u.forEach((x,j)=>{va+=x*x;vb+=B.u[j]*B.u[j];cv+=x*B.u[j]});return{d:A.m-B.m,va,vb,cv,ne:Math.min(A.ne,B.ne)}}
test("第 4 項：配對估計 Var(A−B)＝Var(A)＋Var(B)−2Cov(A,B)——跟另外手算的一樣；正共變異時比「兩個標準誤平方相加」小，負共變異時比較大",()=>{
  const rnd=mkRnd(21),mk=sign=>Array.from({length:30},()=>{const g=(rnd()-.5)*40,e=(rnd()-.5)*6;return[75+g+e,70+(rnd()-.5)*30,75+sign*g-e]}),NS=400;   /* 每階段 400 步：步與步起伏的下限夠小，看得到配對那一項 */
  for(const[sign,name]of[[1,"正"],[-1,"負"]]){const T=mk(sign),A=K.skillAxes(rowsOf(T,NS),null),o=A[0],e=A[2],P=K.mxPairSe(o,e,false),H=byHand(T,NS,0,2),ind=Math.sqrt(o.se**2+e.se**2);
    assert.ok(P.pair);assert.ok(Math.abs(P.ne-H.ne)<1e-9);assert.ok(Math.abs(P.se-Math.sqrt((H.va+H.vb-2*H.cv)*H.ne/(H.ne-1)))<1e-9,name+"共變異：跟手算不一樣");
    assert.ok(Math.abs(P.r-H.cv/Math.sqrt(H.va*H.vb))<1e-9);assert.equal(P.nb,30);
    if(sign>0){assert.ok(P.r>.8);assert.ok(P.se<.5*ind,`正共變異：配對 ${P.se} 應該遠小於相加 ${ind}`)}else{assert.ok(P.r<-.8);assert.ok(P.se>1.2*ind,`負共變異：配對 ${P.se} 應該大於相加 ${ind}`)}}
});
test("第 4 項：缺某一階段的盤只進那一軸自己的變異、不進共變異；兩軸有一軸不到 4 盤就退回原本的相加；各軸畫面上的 ± 算法沒有動",()=>{
  const rnd=mkRnd(22),T=Array.from({length:24},(_,j)=>{const g=(rnd()-.5)*30;return[78+g,72+(rnd()-.5)*20,j%3===0?null:70+g+(rnd()-.5)*8]}),A=K.skillAxes(rowsOf(T,400),null),P=K.mxPairSe(A[0],A[2],false),H=byHand(T,400,0,2);
  assert.equal(P.nb,16,"24 盤裡 8 盤沒有殘局");assert.ok(Math.abs(P.se-Math.sqrt((H.va+H.vb-2*H.cv)*H.ne/(H.ne-1)))<1e-9);assert.equal(A[2].g,16);assert.equal(A[0].g,24);
  const few=K.skillAxes(rowsOf(T.map((r,j)=>[r[0],r[1],j<3?70:null]),12),null),Q=K.mxPairSe(few[0],few[2],false);assert.equal(Q.pair,false);assert.ok(Math.abs(Q.se-Math.sqrt(few[0].se**2+few[2].se**2))<1e-12);
  /* se 照舊：max(模型值, 群集估計)，沒有因為多了 iu／ne／sm 而變 */
  for(const a of A.slice(0,3)){let s=0;for(const[,u]of a.iu)s+=u*u;assert.ok(Math.abs(a.se-Math.max(a.sm,Math.sqrt(s)))<1e-9,a.k+" 的 se")}
  const flat=K.skillAxes(rowsOf(Array.from({length:20},()=>[80,80,80]),10),null),F=K.mxPairSe(flat[0],flat[2],false);assert.ok(Math.abs(F.se-Math.sqrt(flat[0].sm**2+flat[2].sm**2))<1e-9,"盤與盤完全一樣時不會變成 0：不低於步與步起伏的模型值");
});
test("第 4 項：有效盤數（Kish）——半衰期 15 盤、20 盤每盤步數一樣 ≈ 18.69（重評報告的數字），不是 20；越舊的盤權重越小",()=>{
  const A=K.skillAxes(rowsOf(Array.from({length:20},(_,j)=>[80+j%3,75,70]),10),null);assert.ok(Math.abs(A[0].ne-18.6917)<1e-3,"ne＝"+A[0].ne);assert.equal(A[0].g,20);
  const B=K.skillAxes(rowsOf(Array.from({length:150},(_,j)=>[80+j%3,75,70]),10),null);assert.ok(B[0].ne>40&&B[0].ne<43.3,"150 盤也只有約 43 盤的份量："+B[0].ne);
});
test("第 4 項：t 臨界值（Cornish–Fisher）跟精確值對照——df 9 以上差 < 0.005、df 4 差 < 0.08；df 無限大＝常態值；Bonferroni 的常態值 3 組 2.394／2.128、6 組 2.638／2.394",()=>{
  const EX=[[9,1.96,2.262],[9,2.394,2.933],[9,2.638,3.364],[19,1.96,2.093],[19,2.394,2.625],[19,2.128,2.294],[19,2.638,2.944],[30,2.394,2.536]];for(const[df,z,t]of EX)assert.ok(Math.abs(K.mxTcrit(z,df)-t)<.005,`df ${df} z ${z}：${K.mxTcrit(z,df)} ≠ ${t}`);
  for(const[z,t]of[[1.96,2.776],[2.394,3.961],[2.638,4.851]])assert.ok(Math.abs(K.mxTcrit(z,4)-t)<.08);assert.equal(K.mxTcrit(2.394,Infinity),2.394);assert.equal(K.mxTcrit(1.96,0),1.96);assert.ok(K.mxTcrit(1.96,5)>K.mxTcrit(1.96,50));
  assert.deepEqual(JSON.parse(JSON.stringify(K.MX_ZC)),{1:[1.96,1.645],3:[2.394,2.128],6:[2.638,2.394]});
});
const ax=(m,se,o)=>({k:o.k,v:Math.round(m),m,se,n:200,g:20,u:"步",key:o.key,ok:true,z:null,zse:null,go:["#/x","去練"]});
const axes=(o,mi,e,se)=>[ax(o,se,{k:"開局",key:"open"}),ax(mi,se,{k:"中局",key:"mid"}),ax(e,se,{k:"殘局",key:"end"}),{k:"殺法",v:null,txt:"",est:true,n:0,g:0,u:"題",pct:1,ok:false,go:["#/quiz","棋力測驗"]},{...ax(90,1,{k:"穩定",key:"stab"}),best:60}];
test("第 4 項：選擇效應——三項裡挑最高最低（3 組比較）的門檻比只有兩項（1 組）高；原本固定的 2 個標準誤是「只比一組、盤數無限多」的值",()=>{
  const se=3,ind=Math.sqrt(2)*se,p3=K.skillPick(axes(80,79,70,se));assert.ok(Math.abs(p3.th-K.mxTcrit(2.394,19)*ind)<1e-9);assert.ok(p3.th>2*ind);
  const A2=axes(80,79,70,se);A2[1].ok=false;const p2=K.skillPick(A2);assert.ok(Math.abs(p2.th-K.mxTcrit(1.96,19)*ind)<1e-9);assert.ok(p2.th<p3.th);
  /* 差 10 分、標準誤 4.24：只比兩項時超過門檻（soft・hi），三項裡挑出來的就只算 mid */
  assert.equal(p2.lv,"hi");assert.equal(p3.lv,"mid");assert.equal(p3.conf,"soft");
  const p9=K.skillPick(axes(80,79,72,se));assert.equal(p9.soft,undefined,"差 8 分（1.89 個標準誤）：原本落在 1.64～2 會說可能先看，現在不到修正後的門檻");assert.ok(p9.even);
});
test("第 4 項：回傳欄位照舊（weak／maybe／soft／even／conf／th／grp／lv／lo／hi／none）；沒有同段位基準時差距再大也只回傳 soft，不回傳 weak／maybe",()=>{
  const rnd=mkRnd(23),G=rowsOf(Array.from({length:60},()=>{const g=(rnd()-.5)*10;return[85+g,80+g+(rnd()-.5)*6,50+g+(rnd()-.5)*6]}),10),p=K.skillPick(K.skillAxes(G,null));
  assert.deepEqual(Object.keys(p).sort(),["conf","grp","hi","lv","soft","th"]);assert.equal(p.conf,"soft");assert.equal(p.lv,"hi");assert.equal(p.soft.k,"殘局");assert.equal(p.hi.k,"開局");assert.equal(p.grp,false);assert.equal(p.weak,undefined);assert.equal(p.maybe,undefined);
  const e=K.skillPick(K.skillAxes(rowsOf(Array.from({length:60},()=>[80+(rnd()-.5)*4,80+(rnd()-.5)*4,80+(rnd()-.5)*4]),10),null));assert.deepEqual(Object.keys(e).sort(),["conf","even","grp","hi","lo","th"]);assert.ok(["even","lo"].includes(e.conf));
  assert.deepEqual({...K.skillPick([])},{none:true,conf:"lo"});
});
test("第 4 項：有同段位基準（z 尺度、四軸 6 組）才回傳 weak／maybe；門檻加上基準平均數自己的誤差（1／人數）",()=>{
  const B=n=>({mu:80,sd:8,n}),mk=n=>loadSk({ax:{people:n,byRank:{業2:{open:B(n),mid:B(n),end:B(n),stab:{mu:95,sd:5,n}}}}},"業2"),rnd=mkRnd(24);
  const T=Array.from({length:60},()=>{const g=(rnd()-.5)*8;return[82+g,81+g+(rnd()-.5)*4,58+g+(rnd()-.5)*4]}),G=rowsOf(T,10);
  const K30=mk(30),A=K30.skillAxes(G,null),p=K30.skillPick(A);assert.equal(p.grp,true);assert.equal(p.conf,"hi");assert.equal(p.weak.k,"殘局");assert.equal(p.soft,undefined);
  const lo=p.weak,hi=p.hi,P30=K30.mxPairSe(lo,hi,true),K500=mk(500),A5=K500.skillAxes(G,null),p5=K500.skillPick(A5),P500=K500.mxPairSe(p5.weak,p5.hi,true);
  assert.ok(Math.abs(P30.se**2-P500.se**2-(2/30-2/500))<1e-9,"基準 30 人比 500 人多出 2／30−2／500 的變異");assert.ok(p.th>p5.th);assert.ok(Math.abs(p.th-K30.mxTcrit(2.638,P30.ne-1)*P30.se)<1e-9,"四軸＝6 組比較");
});
test("第 4 項：模擬（tools/sim-phase-pair.js，三個階段真的一樣、40 盤、600 位假設的玩家）——整個挑選程序說出 hi 的比例 ≤ 5%、hi 或 mid ≤ 10%，都比原本低；事先指定一組的 95% 區間覆蓋率 ≥ 93%",t=>{
  if(!fs.existsSync(SIM))return t.skip(NO_SIM);const X=require(SIM),A=X.loadApp();
  for(const[name,Sc,seed]of[["獨立",{rho:0,pEnd:.6},11],["正共變異",{rho:.7,pEnd:.6},12],["負共變異",{rho:-.4,pEnd:.6},13]]){const r=X.run(A,name,Sc,40,600,seed,0);
    t.diagnostic(`${name}：hi 原本 ${r.rate.old.hi}% → ${r.rate.new.hi}%；hi 或 mid 原本 ${r.rate.old.any}% → ${r.rate.new.any}%；開局−殘局覆蓋率 原本 ${r.pairs["open-end"].covOld}% → ${r.pairs["open-end"].covNew}%`);
    assert.ok(r.rate.new.hi<=5,`${name} hi ${r.rate.new.hi}%`);assert.ok(r.rate.new.any<=10,`${name} hi 或 mid ${r.rate.new.any}%`);assert.ok(r.rate.new.hi<r.rate.old.hi&&r.rate.new.any<r.rate.old.any);
    for(const k of["open-end","mid-end","open-mid"])assert.ok(r.pairs[k].covNew>=93,`${name} ${k} 覆蓋率 ${r.pairs[k].covNew}%`)}
});
test("第 4 項：模擬（殘局真的差 8.6 分、40 盤、ρ＝+0.7）——還是抓得到一半以上（漏報 < 50%），而且幾乎不會以 hi 指錯階段（< 1%）；10 盤時幾乎都說資料還少",t=>{
  if(!fs.existsSync(SIM))return t.skip(NO_SIM);const X=require(SIM),A=X.loadApp(),r=X.run(A,"殘局較差",{rho:.7,pEnd:.6,delta:{end:.7}},40,600,31,0),s=X.run(A,"殘局較差",{rho:.7,pEnd:.6,delta:{end:.7}},10,600,32,0);
  t.diagnostic(`40 盤：漏報 hi 原本 ${r.rate.old.missHi}% → ${r.rate.new.missHi}%，指錯 ${r.rate.new.wrongHi}%；10 盤：漏報 ${s.rate.old.missHi}% → ${s.rate.new.missHi}%，資料還少 ${s.cat.old.lo}% → ${s.cat.new.lo}%`);
  assert.ok(r.rate.new.missHi<50);assert.ok(r.rate.new.wrongHi<1);assert.ok(r.rate.new.missHi>r.rate.old.missHi,"修正選擇效應的代價：漏報比原本多（如果沒有變多，模擬或修正有問題）");assert.ok(s.cat.new.lo>80);
});
test("〔原始碼〕第 4 項：skillPick 用配對估計和修正後的臨界值，不再有固定的 2·√(se²＋se²)、1.64；畫面程式（07z2-statmap）照舊只看 weak",()=>{
  const sp=sl(ST,"function skillPick(","\n/* 開發者 11/11「下完一局","skillPick");assert.match(sp,/mxPairSe\(lo,hi,grp\)/);assert.match(sp,/MX_ZC\[ok\.length\*\(ok\.length-1\)\/2\]/);assert.doesNotMatch(sp,/1\.64\*se|th=2\*se/);
  assert.match(sp,/if\(!grp&&gap>=tm\)return\{soft:lo,hi,th,grp,conf:"soft",lv:gap>=th\?"hi":"mid"\}/);assert.match(rd(path.join(M,"07z2-statmap.js")),/if\(pk&&pk\.weak\)\{/);
});
