// 終章「七星連珠」（m/07f-ship.js 的 QX_P、QX_WHO）：七顆紅子都要落在交叉點、而且是該兵種從開局原位走得到的位置。
// 11/11 Gemini 架構報告第三項核對時加的（Gemini 推薦的「仕四2」不合法）。處理紀錄：xiangqi-db/story/100_Gemini架構報告處理.md
// 11/12 開發者決定換成不鏡像的擺法，同日再選「換成更像的」（俥九1、相九3、傌七4、帥六3、仕四3、炮三3、兵一4，天樞→搖光），加形狀比對：跟北斗真實星位同形、不是左右鏡像、星序沒有倒過來。
// 用法：node --test xiangqi-lab/tools/test-qixing.js
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),path=require("path"),vm=require("vm");
const C=require("../site/core.js");
const src=fs.readFileSync(path.join(__dirname,"../../xiangqi-db/m/07f-ship.js"),"utf8").replace(/\r\n/g,"\n");
const line=k=>{const l=src.split("\n").find(x=>x.startsWith(k));assert.ok(l,"找不到 "+k);return l};
const ctx={};vm.createContext(ctx);
vm.runInContext([line("const QX_P="),line("const QX_STAR="),line("const QX_X=")].join("\n")+"\nthis.X={QX_P,QX_STAR,QX_X,QX_Y};",ctx);
{const a=src.indexOf("const QX_WHO="),e=src.indexOf("]];",a);vm.runInContext(src.slice(a,e+3)+"\nthis.W=QX_WHO;",ctx)}
const {QX_P,QX_STAR,QX_X,QX_Y}=ctx.X,WHO=ctx.W;
const PC={帥:"K",仕:"A",相:"B",傌:"N",俥:"R",炮:"C",兵:"P"};
/* QX_P＝[由左數第幾條直線 1～9, 由下數第幾條橫線 1～10]（紅方在下）→ 內部格號：紅方視角路數＝10−c，第 0 列在黑方底線 */
const idx=([c,r])=>(10-r)*9+(c-1);
const HOME={K:["e0"],A:["d0","f0"],B:["c0","g0"],N:["b0","h0"],R:["a0","i0"],C:["b2","h2"],P:["a3","c3","e3","g3","i3"]};
function reach(p){   /* 用 core 的 legal() 從開局原位做 BFS（將放原位，四五六路第 7 排擋黑卒防照面） */
  const out=new Set();
  for(const h of HOME[p]){const s0=C.parseSq(h),seen=new Set([s0]),q=[s0];
    while(q.length){const s=q.shift(),b=Array(90).fill(null);b[s]=p;if(p!=="K")b[C.parseSq("e0")]="K";b[C.parseSq("e9")]="k";
      for(const x of["d6","e6","f6"])if(!b[C.parseSq(x)])b[C.parseSq(x)]="p";
      if(p!=="K"&&s===C.parseSq("e0"))continue;
      for(const [f,t] of C.legal(b,"r"))if(f===s&&!seen.has(t)){seen.add(t);q.push(t)}}
    seen.forEach(x=>out.add(x))}
  return out}
/* 北斗七星 J2000 赤經、赤緯（度）：天樞 Dubhe、天璇 Merak、天璣 Phecda、天權 Megrez、玉衡 Alioth、開陽 Mizar、搖光 Alkaid */
const STAR=[[165.9320,61.7510],[165.4603,56.3824],[178.4577,53.6948],[183.8565,57.0326],[193.5073,55.9598],[200.9813,54.9254],[206.8852,49.3133]];
/* 以七星中心做正投影；從地面仰望天空時東在左，所以 x 取負號 */
const SKY=(()=>{const R=Math.PI/180,a0=STAR.reduce((s,x)=>s+x[0],0)/7*R,d0=STAR.reduce((s,x)=>s+x[1],0)/7*R;
  return STAR.map(([a,d])=>{a*=R;d*=R;return[-Math.cos(d)*Math.sin(a-a0),Math.sin(d)*Math.cos(d0)-Math.cos(d)*Math.sin(d0)*Math.cos(a-a0)]})})();
/* Procrustes 正規化殘差（平移、等比縮放、旋轉後；0＝完全同形）。mirror＝先把棋盤左右翻再比 */
function resid(A,B,mirror){const m=P=>P.reduce((s,p)=>[s[0]+p[0]/P.length,s[1]+p[1]/P.length],[0,0]),ca=m(A),cb=m(B);
  let sr=0,si=0,na=0,nb=0;
  for(let i=0;i<A.length;i++){const ax=A[i][0]-ca[0],ay=A[i][1]-ca[1],by=B[i][1]-cb[1],bx=(B[i][0]-cb[0])*(mirror?-1:1);sr+=ax*bx+ay*by;si+=ax*by-ay*bx;na+=ax*ax+ay*ay;nb+=bx*bx+by*by}
  return 1-(sr*sr+si*si)/(na*nb)}
test("七顆紅子：兵種剛好帥仕相傌俥炮兵各一，位置不重疊",()=>{
  assert.equal(QX_P.length,7);assert.equal(WHO.length,7);
  assert.deepEqual(Array.from(WHO,w=>String(w[2])).sort(),Object.keys(PC).sort());
  assert.equal(new Set(QX_P.map(idx)).size,7)});
test("每顆都在棋盤交叉點上（直線 1～9、橫線 1～10 的整數），畫的位置跟棋盤線同一組座標",()=>{
  for(const [c,r] of QX_P){assert.ok(Number.isInteger(c)&&c>=1&&c<=9&&Number.isInteger(r)&&r>=1&&r<=10,[c,r].join(","));
    assert.equal((QX_X(c)-QX_X(1))%8,0);assert.equal((QX_Y(r)-QX_Y(10))%8,0)}});
test("每顆都是該兵種從開局原位走得到的合法位置（仕只能在四1、六1、五2、四3、六3；兵沒過河只能在一三五七九路的 4、5 排）",()=>{
  QX_P.forEach((p,i)=>{const k=PC[WHO[i][2]];assert.ok(reach(k).has(idx(p)),`${WHO[i][2]} 在 [${p}] 走不到`)});
  assert.equal(reach("A").size,5);assert.ok(!reach("A").has(idx([6,2])),"仕四2（Gemini 原推薦）不合法")});
test("11/12 開發者決定的擺法：天樞→搖光＝俥九1、相九3、傌七4、帥六3、仕四3、炮三3、兵一4（紅方視角路數＝10−c）；旅伴跟著自己的子",()=>{
  assert.deepEqual(Array.from(QX_STAR),["天樞","天璇","天璣","天權","玉衡","開陽","搖光"]);
  const CN="〇一二三四五六七八九",got=QX_P.map(([c,r],i)=>WHO[i][2]+CN[10-c]+r).join("、");
  assert.equal(got,"俥九1、相九3、傌七4、帥六3、仕四3、炮三3、兵一4");
  const who={俥:"阿轍",相:"燕子",傌:"小梅",帥:"方庭",仕:"城子",炮:"花兒",兵:"溪兒"};
  for(const w of WHO){assert.equal(w[1],who[w[2]],w[2]+" 的旅伴");assert.ok(String(w[3]).includes(w[2]),w[1]+" 的台詞講的是自己的子")}});
test("形狀跟北斗真實星位同形（不鏡像）：殘差小、左右翻過來明顯變差、星序倒過來也變差",()=>{
  const P=QX_P.map(([c,r])=>[c,r]),ok=resid(SKY,P,false),mir=resid(SKY,P,true),rev=resid(SKY,P.slice().reverse(),false);
  assert.ok(ok<0.01,"不鏡像殘差 "+ok.toFixed(4));
  assert.ok(mir>0.2&&mir>ok*5,"左右翻過來反而更像（擺成鏡像了）："+mir.toFixed(4)+" 對 "+ok.toFixed(4));
  assert.ok(rev>ok*2,"星序倒過來反而更像（天樞、搖光對調了）："+rev.toFixed(4)+" 對 "+ok.toFixed(4));
  const B=[[1,5],[1,3],[4,3],[5,4],[6,3],[8,3],[9,1]];   /* 11/10 B 案：鏡像，留著當反例 */
  assert.ok(resid(SKY,B,true)<resid(SKY,B,false),"B 案應該是鏡像")});
test("金線一筆畫：斗（天樞→天璇→天璣→天權→天樞）是凸四邊形不打結，斗柄從天權接出、往斗外面走",()=>{
  const P=QX_P,cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
  const bowl=[0,1,2,3].map(i=>P[i]),sg=bowl.map((p,i)=>Math.sign(cr(p,bowl[(i+1)%4],bowl[(i+2)%4])));
  assert.ok(sg.every(s=>s!==0&&s===sg[0]),"斗不是凸四邊形："+sg.join(","));
  const cen=bowl.reduce((s,p)=>[s[0]+p[0]/4,s[1]+p[1]/4],[0,0]),d=p=>Math.hypot(p[0]-cen[0],p[1]-cen[1]);
  assert.ok(d(P[4])<d(P[5])&&d(P[5])<d(P[6]),"斗柄玉衡→開陽→搖光要越來越遠離斗");
  assert.ok(Math.min(...[0,1,2].map(i=>Math.hypot(P[i][0]-P[4][0],P[i][1]-P[4][1])))>Math.hypot(P[3][0]-P[4][0],P[3][1]-P[4][1]),"玉衡要最靠近天權（斗柄從天權接出）")});
