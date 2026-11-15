// 意見表 1046：數學模型（下棋評分、準確度、段位、百分位、建議先練）照三方審查（story/75_數學模型新算法_三方審查整理.md）第一步＋第二步的回歸測試。
//   必改 1 存檔還原：沒有 bv 的舊存檔，走進殺棋（−29990）還原後不能變成「正著、100 分」；有 bv、沒 bv、紅黑兩方算出來的勝率差都跟直接算一樣。
//   必改 2 殺棋特例：送殺、漏殺直接決定評語並標 mt（審查的兩個例子：+2000 有殺不殺掉到 +900 不能是穩著；−213 走進殺棋不能只算緩著）。
//   必改 3 一盤總分不灌水：輸掉的盤（最後勝率 ≤ 10%，或呼叫端給了勝負）新總分最高 79；模擬「被強電腦慢慢磨輸」輸棋拿 S／A 從 4～10 成降到 1 成以下；畫面的舊分數不受影響。
//   必改 4 參數位置：評語門檻由 k 算出、k 改了門檻跟著改；MXS.ver＝2；calibrate-grades.js 只用最新版本的盤。
//   第一步：K 維持 48／32（不降到 24）、升段馬上／降段有保護；「一般棋友」至少 100 人、「勝過 X%」至少 200 人；建議先練三級信心的說法；快取 talentCache5 → 6。
// 全部用 vm 載入 App 裡真正的程式片段（05-settings、04-stats、src/local.js、src/net.js），不開瀏覽器。
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),path=require("path"),vm=require("vm"),os=require("os"),cp=require("child_process");
const LAB=path.join(__dirname,".."),M=path.join(LAB,"../xiangqi-db/m");
const rd=f=>fs.readFileSync(f,"utf8").replace(/\r\n/g,"\n");
const S=rd(path.join(M,"05-settings.js")),ST=rd(path.join(M,"04-stats.js")),SV=rd(path.join(M,"05b-save.js")),LO=rd(path.join(LAB,"src/local.js")),NE=rd(path.join(LAB,"src/net.js"));
const C=require("../site/core.js");
const sl=(s,a,b,name)=>{const i=s.indexOf(a),j=s.indexOf(b,i+1);assert.ok(i>=0&&j>i,"找不到 "+(name||a));return s.slice(i,j)};
/* 05-settings 的影子模式（qNow＋MXS…mxShHtml） */
const SH=sl(S,"function qNow(","\n/* ================= 影子模式","qNow")+"\n"+sl(S,"const MXS={","\nfunction gameReport(","MXS…mxShHtml");
function loadSh(src){const ctx={console,isFinite,esc:x=>String(x)};vm.createContext(ctx);vm.runInContext((src||SH)+";this.R={MXS,mxWin,mxGradeDw,mxEv,mxShMove,mxShSide,mxShadowReport,mxShHtml}",ctx,{filename:"05-settings(影子模式片段)"});return ctx.R}
const X=loadSh(),W=cp=>X.mxWin(cp),clamp=C.clampV,oldQ=C.gradeLoss;
const mv=(best,played,by,o)=>{const sg=by==="b"?-1:1,loss=Math.max(0,clamp(best)-clamp(played));return{loss,ev:sg*played,by:by||"r",q:best===played?"正著":oldQ(loss),...(o&&o.bv?{bv:sg*best}:{})}};

// ====================== 必改 1：存檔還原 ======================
test("必改 1：沒有 bv 的舊存檔走進殺棋（均勢 → −29990），還原後是敗著、勝率掉約 50%，不是「正著、100 分」",()=>{
  const m=mv(0,-29990,"r"),x=X.mxShMove(m);
  assert.equal(m.loss,2000);assert.notEqual(x.q,"正著");assert.equal(x.q,"敗著");assert.ok(x.acc<10,"準確度 "+x.acc);
  assert.ok(Math.abs(x.dw-(W(0)-W(-29990)))<1e-9);assert.equal(x.mt,1,"要標送殺");
});
test("必改 1：9 組局面（含 −29990、−2500、−2100），沒 bv 還原、有 bv、黑方視角的勝率差都跟直接算一模一樣",()=>{
  for(const[best,played]of[[0,-29990],[300,-2500],[0,-2100],[-500,-29995],[1500,-29990],[2500,-29990],[-1800,-2600],[200,150],[1200,600]]){
    const want=Math.max(0,W(best)-W(played));
    for(const m of[mv(best,played,"r"),mv(best,played,"r",{bv:1}),mv(best,played,"b"),mv(best,played,"b",{bv:1})]){const x=X.mxShMove(m);assert.ok(Math.abs(x.dw-want)<1e-9,`best ${best} played ${played} ${m.by}${m.bv!=null?" 有 bv":""}：${x.dw} ≠ ${want}`)}}
});
test("必改 1：mxEv 沒有 bv 時，最佳評估＝ev 先夾到 ±2000 再加 loss（不存 dw，一律重算）",()=>{
  assert.deepEqual({...X.mxEv({loss:2000,ev:-29990,by:"r"})},{b:0,p:-29990,bk:0});
  assert.deepEqual({...X.mxEv({loss:2000,ev:29990,by:"b"})},{b:0,p:-29990,bk:0});
  assert.deepEqual({...X.mxEv({loss:300,ev:-500,by:"r",bv:-200})},{b:-200,p:-500,bk:1});
  assert.equal(X.mxEv({loss:50}).eq,1,"不知道是哪一方＝當均勢");
});
test("必改 1：真實引擎資料（xiangqi-db/analysis-cache.json）裡走進殺棋的步，還原後都不是正著、穩著",t=>{
  const F=path.join(LAB,"../xiangqi-db/analysis-cache.json");if(!fs.existsSync(F))return t.skip("沒有 analysis-cache.json");
  const J=JSON.parse(fs.readFileSync(F,"utf8")).grade||{};let n=0;
  for(const[k,v]of Object.entries(J)){if(v.loss==null||v.ev==null)continue;const by=/ w\|/.test(k)?"r":"b",pl=by==="r"?v.ev:-v.ev;if(!(pl<=-20000&&v.loss>0))continue;
    const x=X.mxShMove({loss:v.loss,ev:v.ev,by,q:oldQ(v.loss)});n++;assert.ok(!["正著","穩著"].includes(x.q),`${k}：${x.q}`);assert.equal(x.mt,1)}
  if(!n)t.diagnostic("快取裡沒有走進殺棋的步");
});

// ====================== 必改 2：殺棋特例 ======================
test("必改 2：審查的例子——+2000（有殺）不殺、走完 +900：只看勝率差是穩著，新評語是失著並標漏殺",()=>{
  const pure=X.mxGradeDw(Math.max(0,W(29990)-W(900)));assert.ok(["正著","穩著"].includes(pure),"只看勝率差 "+pure);
  const x=X.mxShMove(mv(29990,900,"r",{bv:1}));assert.equal(x.q,"失著");assert.equal(x.mt,2);assert.equal(x.mh,0);
});
test("必改 2：審查的例子——局面 −213 時走進殺棋：不能只算緩著（是敗著、標送殺）",()=>{
  const x=X.mxShMove(mv(-213,-29990,"r",{bv:1}));assert.equal(x.q,"敗著");assert.equal(x.mt,1);
  const y=X.mxShMove(mv(-213,-29990,"b"));assert.equal(y.q,"敗著",`黑方、沒有 bv：${y.q}`);assert.equal(y.mt,1);
});
test("必改 2：送殺／漏殺分界（Lichess：−700／−1000、+700／+1000）；早就被殺、兩邊都是殺、妙著不套用",()=>{
  const T=[[0,-29990,"敗著",1],[-650,-29990,"敗著",1],[-800,-29990,"失著",1],[-1500,-29990,"緩著",1],[29990,300,"敗著",2],[29990,650,"敗著",2],[29990,900,"失著",2],[29990,2500,"緩著",2],[-29980,-29990,null,0],[29990,29970,null,0]];
  for(const[b,p,q,mt]of T){const x=X.mxShMove(mv(b,p,"r",{bv:1}));assert.equal(x.mt,mt,`${b}→${p} mt`);if(q)assert.equal(x.q,q,`${b}→${p}`)}
  const z=X.mxShMove({loss:300,ev:200,by:"r",q:"妙著"});assert.equal(z.q,"妙著");assert.equal(z.mt,0);
  const h=X.mxShMove({loss:1200,ev:800,by:"r",q:"失著"});assert.equal(h.mt,2);assert.equal(h.mh,1,"沒 bv 的漏殺標推估");
});

// ====================== 必改 3：一盤總分不灌水 ======================
/* 假設的對局：紅方每步損失照段位分布，黑方是強電腦（每步只少 0～15 分）——慢慢被磨輸，每步勝率只掉一點點 */
function mkRnd(s){return()=>{s=(s*1103515245+12345)%2147483648;return s/2147483648}}
const LV={初學:{p0:.30,s:[.45,60],m:[.17,220],b:[.08,300,1500]},"入門～業1":{p0:.40,s:[.45,40],m:[.11,150],b:[.04,300,1200]},業餘中段:{p0:.50,s:[.43,25],m:[.06,100],b:[.01,300,900]}};
function slowGame(P,rnd){const ex=mu=>-mu*Math.log(1-rnd()+1e-12),dl=()=>{const u=rnd();return Math.round(u<P.p0?ex(6):u<P.p0+P.s[0]?ex(P.s[1]):u<P.p0+P.s[0]+P.m[0]?ex(P.m[1]):P.b[1]+rnd()*(P.b[2]-P.b[1]))};
  let E=0;const plies=[];for(let i=0;i<120;i++){const s=i%2?"b":"r",sg=s==="r"?1:-1,best=sg*E,L=s==="r"?dl():Math.round(rnd()*15),played=best-L;E=sg*played;const loss=Math.max(0,clamp(best)-clamp(played));
    plies.push({ply:i+1,by:s,phase:i<20?"open":"mid",cn:"",ev:sg*played,bv:sg*best,loss,q:oldQ(loss)});if(E<=-1800&&rnd()<.15)break}return{plies,E}}
const oldScore=ms=>{const n=ms.length,base=ms.reduce((a,m)=>a+100*Math.exp(-m.loss/200),0)/n;let bad=0,blun=0;for(const m of ms){if(m.q==="失著")bad++;if(m.q==="敗著"){bad++;blun++}}const br=bad/n,cap=bad>=6||br>=.2?69:bad>=3||br>=.1?79:blun?89:100;return Math.min(cap,Math.round(base))};
test("必改 3：慢慢輸掉的一盤（每步只少 25 分、最後 −1800）：沒有上限時新總分是 S／A，現在最高 79，cap、fin、lost 寫在結果裡",()=>{
  const plies=[];let E=0;for(let i=0;i<120&&E>-1800;i++){const s=i%2?"b":"r",sg=s==="r"?1:-1,best=sg*E,L=s==="r"?30:0,played=best-L;E=sg*played;plies.push({ply:i+1,by:s,phase:i<20?"open":"mid",cn:"",ev:sg*played,bv:sg*best,loss:L,q:oldQ(L)})}
  const r=X.mxShSide({plies},"r");assert.ok(r.lost);assert.ok(r.fin<=10);assert.equal(r.cap,79);assert.ok(r.score<=79&&r.grade!=="S"&&r.grade!=="A","新總分 "+r.score);
  const Y=loadSh(SH.replace("lose:[10,79]","lose:[-1,100]")),r0=Y.mxShSide({plies},"r");assert.ok(r0.score>=80,"沒有輸棋上限時（之前的算法）："+r0.score);
  const b=X.mxShSide({plies},"b");assert.ok(!b.lost,"贏的那方不受影響");assert.equal(b.cap,100);
});
test("〔混合〕必改 3：知道勝負時（認輸，最後只有 −500）也算輸棋；和棋、贏棋、不給勝負都不套",()=>{
  const plies=[];let E=0;for(let i=0;i<60&&E>-500;i++){const s=i%2?"b":"r",sg=s==="r"?1:-1,best=sg*E,L=s==="r"?25:0,played=best-L;E=sg*played;plies.push({ply:i+1,by:s,phase:"mid",cn:"",ev:sg*played,bv:sg*best,loss:L,q:oldQ(L)})}
  const rep={plies};assert.ok(X.mxShSide(rep,"r").fin>10);assert.equal(X.mxShSide(rep,"r").lost,false);
  assert.equal(X.mxShadowReport(rep,"b").r.lost,true);assert.ok(X.mxShadowReport(rep,"b").r.score<=79);
  assert.equal(X.mxShadowReport(rep,"r").r.lost,false);assert.equal(X.mxShadowReport(rep,"").r.lost,false);assert.equal(X.mxShadowReport(rep).r.lost,false);
  assert.match(SV,/mxShadowReport\(rep,st\.result\.w\|\|""\)/,"05b-save cpaDone 要把勝負帶進去");
});
test("必改 3：模擬被強電腦磨輸（三個段位各 300 盤）：輸棋拿 S／A 在新算法 ≤ 10%，而且每個段位都比之前的影子算法少（之前最多到 100%）",()=>{
  const Y=loadSh(SH.replace("lose:[10,79]","lose:[-1,100]"));
  let top=0;for(const[name,P]of Object.entries(LV)){const rnd=mkRnd(99+name.length);let nL=0,saN=0,saY=0,saO=0;
    for(let g=0;g<300;g++){const{plies,E}=slowGame(P,rnd);if(E>-500)continue;nL++;const rep={plies};
      if(X.mxShadowReport(rep,"b").r.score>=80)saN++;if(Y.mxShSide(rep,"r").score>=80)saY++;if(oldScore(plies.filter(m=>m.by==="r"))>=80)saO++}
    const p=v=>v/Math.max(1,nL);t_log(`${name}：輸 ${nL} 盤，拿 S／A 舊 ${(p(saO)*100).toFixed(0)}%、之前的影子 ${(p(saY)*100).toFixed(0)}%、現在 ${(p(saN)*100).toFixed(0)}%`);
    assert.ok(nL>=200,name+" 輸的盤太少");assert.ok(p(saN)<=.10,`${name} 現在 ${p(saN)}`);assert.ok(p(saN)<p(saY),`${name} 要比之前少`);top=Math.max(top,p(saY))}
  assert.ok(top>=.4,`之前的影子至少一個段位要灌水到 40% 以上（${top}）——不然這個模擬證明不了什麼`);
});
const LOG=[];const t_log=s=>LOG.push(s);test.after(()=>{if(LOG.length)console.log("# "+LOG.join("\n# "))});
test("必改 3：mxShadowReport 不動 rep（畫面的舊分數、評語照舊）；開發者並列表寫出「輸棋」上限",()=>{
  const{plies}=slowGame(LV.初學,mkRnd(5)),rep={plies},before=JSON.stringify(rep),sh=X.mxShadowReport(rep,"b");assert.equal(JSON.stringify(rep),before);
  const R={score:70,grade:["B"],base:70.2,cap:79,cnt:{}},h=X.mxShHtml(R,sh.r);assert.match(h,/輸棋（最後勝率 \d+%）/);assert.match(h,/MXS v2/);assert.match(h,/輸棋局面（勝率 ≤ 10%）最高 79/);
});

// ====================== 必改 4：參數位置、版本 ======================
test("必改 4：評語門檻由 k 算出（k＝0.00368208 時跟 30／60／150／400 分逐點對齊）；把 k 改成 0.005，門檻自動跟著變",()=>{
  assert.equal(X.MXS.ver,2);assert.deepEqual(Array.from(X.MXS.lose),[10,79]);
  assert.deepEqual(Array.from(X.MXS.th,t=>+t.toFixed(2)),[2.76,5.5,13.47,31.35]);
  for(const[i,c]of X.MXS.cp.entries()){assert.equal(X.mxGradeDw(W(c-1)-50),["正著","穩著","緩著","失著"][i]);assert.notEqual(X.mxGradeDw(W(c+2)-50),["正著","穩著","緩著","失著"][i])}
  const Y=loadSh(SH.replace("k:0.00368208,","k:0.005,"));assert.equal(Y.MXS.k,0.005);
  Y.MXS.th.forEach((t,i)=>assert.ok(Math.abs(t-(Y.mxWin(Y.MXS.cp[i])-50))<1e-12));assert.ok(Y.MXS.th[0]>X.MXS.th[0]);
});
test("必改 4：calibrate-grades.js 只用最新 MXS 版本的盤（v1、v2 的新總分算法不同，不混算）",t=>{
  if(!fs.existsSync(path.join(__dirname,"calibrate-grades.js")))return t.skip("沒有 calibrate-grades.js（校正工具只在開發者電腦，公開副本沒有）");
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"cg1046-")),f=path.join(dir,"cpu.jsonl"),out=path.join(dir,"fit.json"),L=[];
  for(let i=0;i<60;i++){const v=i<30?1:2,o=60+i%40,s=o+(v===1?9:2);L.push(JSON.stringify({aid:"p"+(i%25),g:"g"+i,mx:v,full:1,res:i%3?"w":"l",crk:"業3",o:[o,0,o],s:[s,0,s]}))}
  fs.writeFileSync(f,L.join("\n")+"\n");const so=cp.execFileSync(process.execPath,[path.join(__dirname,"calibrate-grades.js"),f,out],{encoding:"utf8"});
  assert.match(so,/只用 MXS v2 的 30 盤/);assert.match(so,/讀到 30 盤/);fs.rmSync(dir,{recursive:true,force:true});
});

// ====================== 第一步：段位 K、升段保護 ======================
function loadRank(src,name){const ctx={};vm.createContext(ctx);vm.runInContext(sl(src,"const RANKS=","\n","RANKS")+"\n"+sl(src,"const rankIdx=","\n","rankIdx")+"\n"+sl(src,"const rankHold=","\n  /*",name+" rankHold")+";this.R={RANKS,rankIdx,rankHold,heldIdx,kOf}",ctx,{filename:name});return ctx.R}
for(const[name,src]of[["src/local.js",LO],["src/net.js",NE]])test(`〔混合〕第一步：${name} 的 K 值維持前 15 盤 48、之後 32（不降到 24），積分公式照舊`,()=>{
  const R=loadRank(src,name);assert.equal(R.kOf(0),48);assert.equal(R.kOf(14),48);assert.equal(R.kOf(15),32);assert.equal(R.kOf(30),32);assert.equal(R.kOf(500),32);
  for(let n=0;n<1000;n++)assert.notEqual(R.kOf(n),24);
  assert.match(src,/K=kOf\(/,"等級分用 kOf 算");
});
test("第一步：升段馬上升；降段要掉到下限再減半個段寬、而且升段後至少下滿 3 盤（local.js、net.js 同一段）",()=>{
  for(const[name,src]of[["src/local.js",LO],["src/net.js",NE]]){const{RANKS,rankIdx,rankHold}=loadRank(src,name),i2=RANKS.findIndex(r=>r[0]==="業2"),lo=RANKS[i2][1],w=RANKS[i2+1][1]-lo;
    const R={pts:lo-5,w:20,l:20,d:0};rankHold(R,R.pts);assert.equal(R.rk,i2-1);
    R.pts=lo+3;R.w++;rankHold(R,lo-5);assert.equal(R.rk,i2,name+" 升段要馬上");
    R.pts=lo-w/2-1;R.l++;rankHold(R,lo+3);assert.equal(R.rk,i2,name+" 升段後不到 3 盤不降");
    R.l+=2;rankHold(R,R.pts);assert.equal(R.rk,rankIdx(R.pts),name+" 滿 3 盤、掉過半個段寬才降");
    const Q={pts:lo+10,w:30,l:30,d:0,rk:i2,pn:0};Q.pts=lo-w/2+5;Q.l++;rankHold(Q,lo+10);assert.equal(Q.rk,i2,name+" 只比下限低一點不降")}
});

// ====================== 第一步：百分位門控、建議先練三級信心、快取升版 ======================
const SKSRC=sl(ST,"const SK={","\n/* 校正檔（store calib","SK")+"\n"+sl(ST,"const MX_RK=","\n/* 每盤一列","MX_RK…mxTierName")+"\n"+sl(ST,"function mxAxisPt(","\n/* 開發者 11/11「下完一局","mxAxisPt…skillPick");
function loadSk(calib){const mem={calib},ctx={console,isFinite,QZ:{S:.55,MID:7,C:.05},store:{get:(k,d)=>k in mem?mem[k]:d,set:(k,v)=>{mem[k]=v}},window:{}};vm.createContext(ctx);
  vm.runInContext(SKSRC+";this.R={SK,mxCal,mxPct,mxTierName,mxAxisPt,skillAxes,mxTotal,skillPick}",ctx,{filename:"04-stats(五軸片段)"});return ctx.R}
test("〔混合〕第一步：「一般棋友」的先驗至少 100 人才用（99 人＝暫用假設）；「勝過 X%」的分位表至少 200 人",()=>{
  const Q=Array.from({length:19},(_,i)=>-3+i*.3);
  assert.equal(loadSk({tal:{people:99}}).mxCal().tal,null);assert.ok(loadSk({tal:{people:100}}).mxCal().tal);
  assert.equal(loadSk({thQ:Q,irtPeople:199}).mxCal().thQ,null);assert.ok(loadSk({thQ:Q,irtPeople:200}).mxCal().thQ);
  assert.equal(loadSk({tal:{people:199,lrQ:Q}}).mxCal().lrQ,null);assert.ok(loadSk({tal:{people:200,lrQ:Q}}).mxCal().lrQ);
  assert.match(ST,/CT=CAL&&CAL\.tal&&CAL\.tal\.people>=100\?CAL\.tal:null/,"talentReport 的一般棋友跟 mxCal 同一個 100 人門檻");
  assert.match(ST,/calOK\?"一般棋友":"一般棋友（暫用假設）"/);
});
test("第一步：殺法軸沒有 ≥200 人的分位表時顯示段位名（不是「勝過 0%」）；有表才寫「勝過 X%」",()=>{
  const IR={殺戰:{th:-3,n:12}},a0=loadSk(null).skillAxes([],IR).find(a=>a.k==="殺法");assert.equal(a0.est,true);assert.match(a0.txt,/^約/);assert.doesNotMatch(a0.txt,/勝過/);
  const Q=Array.from({length:19},(_,i)=>-3.5+i*.35),a1=loadSk({thQ:Q,irtPeople:250}).skillAxes([],IR).find(a=>a.k==="殺法");assert.match(a1.txt,/^勝過\d+%$/);assert.ok(a1.v>0);
});
const ax=(m,se,o)=>({k:o.k,v:Math.round(m),m,se,n:200,g:20,u:"步",key:o.key,ok:true,z:null,zse:null,go:["#/x","去練"]});
const axes=(o,mi,e,se)=>[ax(o,se,{k:"開局",key:"open"}),ax(mi,se,{k:"中局",key:"mid"}),ax(e,se,{k:"殘局",key:"end"}),{k:"殺法",v:null,txt:"",est:true,n:0,g:0,u:"題",pct:1,ok:false,go:["#/quiz","棋力測驗"]},{...ax(90,1,{k:"穩定",key:"stab"}),best:60}];
test("第一步：建議先練三級信心——差距 ≥2 個標準誤＝hi、1.64～2＝mid、不到 1.64 且門檻還寬＝lo、資料夠又差不多＝even、樣本不夠＝lo",()=>{
  const K=loadSk(null);
  const hi=K.skillPick(axes(80,78,60,2));assert.equal(hi.conf,"hi");assert.equal(hi.weak.k,"殘局");
  const mid=K.skillPick(axes(80,79,72,3));assert.equal(mid.conf,"mid");assert.equal(mid.maybe.k,"殘局");assert.equal(mid.weak,undefined,"中信心不回傳 weak（地圖朱圈只畫高信心）");
  const lo=K.skillPick(axes(80,79,78,3));assert.equal(lo.conf,"lo");assert.ok(lo.even);
  const ev=K.skillPick(axes(80,79.5,79,1));assert.equal(ev.conf,"even");
  const A=axes(80,79,60,2);A[1].ok=false;A[2].ok=false;const no=K.skillPick(A);assert.equal(no.conf,"lo");assert.ok(no.none);
});
test("第一步：五邊形的三級說法——「🎯 建議先練」「🔎 可能先看」「📋 資料還少，先多下幾盤」，資料夠又差不多才說「差不多」",async()=>{
  const SP=sl(ST,"async function skillPentagon(","\n/* 意見回饋 301","skillPentagon");
  async function paint(A){const K=loadSk(null),box={isConnected:true,innerHTML:"",querySelectorAll:()=>[]};const ctx={console,isFinite,store:{get:(k,d)=>d,set(){}},SK:K.SK,mxTotal:K.mxTotal,skillPick:K.skillPick,mxCal:K.mxCal,
      skillRows:async()=>({G:[{hu:0}],smN:0}),skillAxes:()=>A,tlIRT:()=>null,setProf(){},penSVG:()=>""};vm.createContext(ctx);vm.runInContext(SP+";this.f=skillPentagon",ctx);await ctx.f(box);return box.innerHTML.split('<div class="skl">')[0]}   /* 只看上面的建議那段（「五項怎麼算」說明裡三種說法都有寫） */
  const h1=await paint(axes(80,78,60,2));assert.match(h1,/🎯 建議先練：殘局/);assert.doesNotMatch(h1,/可能先看|資料還少/);
  const h2=await paint(axes(80,79,72,3));assert.match(h2,/🔎 可能先看：殘局/);assert.doesNotMatch(h2,/建議先練：/);
  const h3=await paint(axes(80,79,78,3));assert.match(h3,/📋 資料還少，先多下幾盤/);assert.doesNotMatch(h3,/建議先練：|可能先看：/);
  const h4=await paint(axes(80,79.5,79,1));assert.match(h4,/差不多/);assert.doesNotMatch(h4,/資料還少|建議先練：|可能先看：/);
});
test("第一步：真的五軸（skillAxes 從每盤的列算）——殘局一直差 20 分、40 盤＝建議先練殘局；只有 2 盤＝不給建議",()=>{
  const K=loadSk(null),row=(i,e)=>({t:1e6-i,hu:0,n:30,bad:2,best:15,pa:{open:[10*82,10],mid:[12*80,12],end:[8*e,8]},A:[...Array(10).fill(82),...Array(12).fill(80),...Array(8).fill(e)]});
  const G=Array.from({length:40},(_,i)=>row(i,i%2?58:62)),p=K.skillPick(K.skillAxes(G,null));assert.equal(p.conf,"hi");assert.equal(p.weak.k,"殘局");
  const p2=K.skillPick(K.skillAxes(G.slice(0,2),null));assert.notEqual(p2.conf,"hi");
});
test("〔原始碼〕第一步：五邊形、成長頁的快取 talentCache5 → talentCache6（必改 7），舊的 talentCache5 刪掉",()=>{
  assert.doesNotMatch(ST,/store\.(get|set)\("talentCache5"/);
  assert.match(ST,/const cache=store\.get\("talentCache6",\{\}\)/);assert.match(ST,/store\.set\("talentCache6",cache\)/);assert.match(ST,/const TC5=store\.get\("talentCache6",\{\}\)/);
  assert.match(ST,/localStorage\.removeItem\("m_talentCache5"\)/);
});
