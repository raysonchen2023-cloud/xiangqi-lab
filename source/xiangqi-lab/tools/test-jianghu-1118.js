// 開發者 11/18：十州棋館（門派江湖長卷）——「地圖要用環景的，然角色可以在地圖上移動」「現在就做，畫面切到這個長卷也要有淡入淡出的視覺效果，然後第一次進來要有文字描述歡迎光臨來到什麼地方之類的」
//   m/07z9b-jianghu.js：十派駐地座標、道路圖、沿路走的純函式；首頁遠山入口、找地方、開局棋路頁的入口；淡出淡入；第一次的歡迎文字
// 用法：node --test xiangqi-lab/tools/test-jianghu-1118.js
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),path=require("path"),vm=require("vm");
const ROOT=path.join(__dirname,"../..");const rd=p=>fs.readFileSync(path.join(ROOT,p),"utf8");
const JH=rd("xiangqi-db/m/07z9b-jianghu.js"),OS=rd("xiangqi-db/m/07z9-school.js"),SHW=rd("xiangqi-db/m/07w-shipwalk.js");
const load=()=>{const c={};vm.createContext(c);const a=JH.indexOf("const JH_ON"),b=JH.indexOf("/* ---------- 文字");
  vm.runInContext(SHW.slice(SHW.indexOf("const shwPx"),SHW.indexOf("function shwPt"))+SHW.split("\n").find(line=>line.startsWith("function shwInPoly"))+"\n"+JH.slice(a,b)+";this.R={JH_W,JH_H,JH_HOME,JH_SITE,JH_START,JH_FOOTBRIDGE,JH_PLAZAS,jhWalkCfg,jhGround,jhPct,shwPath,shwNear,shwRoute,shwPx,shwInPoly}",c);
  return c.R};
const osc=()=>{const c={};vm.createContext(c);vm.runInContext(OS.slice(OS.indexOf("const OSC=(()=>{"),OS.indexOf("/* ===== END osc-core"))+";this.OSC=OSC",c);return c.OSC};
test("十派每一派都有駐地，座標都在長卷圖裡；牌旗在站點上方",()=>{const R=load(),O=osc();
  assert.equal(JSON.stringify(Object.keys(R.JH_SITE).sort()),JSON.stringify(O.SCH.map(s=>s.id).sort()));
  for(const[k,v]of Object.entries(R.JH_SITE)){for(const p of[v.s,v.f]){assert.ok(p[0]>0&&p[0]<R.JH_W&&p[1]>0&&p[1]<R.JH_H,k+" "+p)}assert.ok(v.f[1]<v.s[1],k+" 牌旗要在站點上方")}
  assert.ok(R.JH_SITE[R.JH_START]);for(const k of["",'p34','l1610'])assert.equal(R.JH_HOME[k].length,2)});
test("十派所有道路的節點都連成同一個步行路網",()=>{
  const R=load(),C=R.jhWalkCfg(R.JH_START),graph=new Map(Object.keys(C.N).map(id=>[id,[]]));
  for(const e of C.E.split(" ")){
    const [a,b]=e.split("-");
    assert.ok(C.N[a]&&C.N[b],e);
    graph.get(a).push(b);graph.get(b).push(a);
    const bridge=R.JH_FOOTBRIDGE.map(p=>R.jhPct(p.slice(0,2)));
    assert.ok(R.shwPx(C,C.N[a],C.N[b])<=65||
      (R.shwPx(C,C.N[a],bridge[0])<1&&R.shwPx(C,C.N[b],bridge[1])<1),"超長路段或漏標轉折點 "+e);
  }
  const pending=[R.JH_START],seen=new Set(pending);
  for(const id of pending)for(const next of graph.get(id))if(!seen.has(next)){seen.add(next);pending.push(next)}
  assert.deepEqual(Object.keys(C.N).filter(id=>!seen.has(id)),[]);
  for(const a of Object.keys(R.JH_SITE))for(const b of Object.keys(R.JH_SITE)){
    const points=R.shwPath(C,a,b);
    assert.equal(points[0],a);assert.equal(points.at(-1),b);
    for(let i=1;i<points.length;i++)assert.ok(graph.get(points[i-1]).includes(points[i]));
  }
  assert.ok(R.shwPath(C,"elephant","central").includes("westBridge"));
  const acrossPavilion=R.shwPath(C,"elephant","pawn");
  assert.ok(acrossPavilion.includes("southBank")&&acrossPavilion.includes("southFork"));
});
test("各區的道路、石階和橋可點；山壁、河面與屋頂不吸附",()=>{
  const R=load(),C=R.jhWalkCfg(R.JH_START);
  for(const [id,road,blocked] of [
    ["elephant",[743,612],[[400,525],[445,755],[513,443],[230,570]]],
    ["screen",[380,1054],[[308,1030],[425,1000],[173,1061]]],
    ["same_cannon",[1400,316],[[1360,202],[1590,350],[1300,380]]],
    ["pawn",[1118,758],[[1100,655],[1000,755],[1308,1090]]],
    ["opposite_cannon",[1902,1015],[[1760,920],[1880,1155]]],
    ["cross_palace",[2152,1147],[[2200,1080],[2300,1170]]],
    ["palace_horse",[2640,1228],[[2650,819],[2630,1275]]],
    ["advisor_corner",[2452,383],[[2450,60],[2415,393]]]
  ]){
    const q=R.jhGround(C,R.jhPct(road));
    assert.ok(q,id+" 道路");
    for(const p of blocked)assert.equal(R.jhGround(C,R.jhPct(p)),null,id+" 障礙 "+p);
  }
});
test("W23 手機點擊：一個指尖內吸到最近的路，太遠的地方不走並原地提示",()=>{
  const R=load(),C=R.jhWalkCfg(R.JH_START);
  assert.match(JH,/const JH_TAP_PX=44;/);
  assert.match(JH,/const q=jhGround\(cfg,p,JH_TAP_PX\*JH_W\/Math\.max\(1,map\.clientWidth\)\);/);
  const tol=44*R.JH_W/1699;   /* 375×812 手機：長卷顯示寬 1699px */
  for(const p of [[445,755],[425,1000],[1360,202],[1100,655],[2650,819],[2415,393]]){
    assert.equal(R.jhGround(C,R.jhPct(p)),null,"沒放寬時不吸附 "+p);
    const q=R.jhGround(C,R.jhPct(p),tol);
    assert.ok(q&&q.d<=tol,"指尖範圍內吸附 "+p);
    assert.ok(R.shwRoute(C,"elephant",q).pts.length>=1,"吸附點在路網上 "+p);
  }
  for(const p of [[513,443],[1590,350],[1000,755],[1308,1090],[1760,920],[2450,60]])
    assert.equal(R.jhGround(C,R.jhPct(p),tol),null,"離路太遠不吸附 "+p);
  assert.match(JH,/e\.target\.closest\?\.\("\.jh-spot,button,a"\)\)return;/);
  assert.match(JH,/if\(q\)\{walkFlat\(\{p:q\.p,e:q\.e\}\);return\}\n    missAt\(p\);/);
  assert.match(JH,/function missAt\(p\)\{[\s\S]*?className="jh-miss"[\s\S]*?setTimeout\(\(\)=>m\.remove\(\),700\)[\s\S]*?vibrate\(8\)/);
  assert.match(JH,/\.jh-miss\{position:absolute;[\s\S]*?pointer-events:none;animation:jhMiss/);
  /* iMac 回報：立體走路模式（.shw.on）由 07w 處理點擊，找不到路也要交回十州原地提示 */
  assert.ok(SHW.includes("const q=S.o.ground?S.o.ground(S,p):shwNear(S.C,p);if(!q){if(S.o.miss)S.o.miss(p);return}"));
  assert.match(JH,/ground:\(_,p\)=>pickGround\(p\),\n      miss:p=>missAt\(p\),/);
});
test("仕角炮門石坪容易點選，隔壁山壁保持禁行",()=>{
  const R=load(),C=R.jhWalkCfg(R.JH_START),p=R.jhPct([2458,325]);
  const q=R.jhGround(C,p);
  assert.ok(q);
  assert.deepEqual(q.p,p,"廣場落點保留玩家點到的確切位置");
  assert.equal(R.jhGround(C,R.jhPct([2390,390])),null);
  assert.ok(R.shwRoute(C,"elephant",q).pts.length>1);
});
test("途中改道仍走路網；路線選擇、門派名帖和跨區移動分開",()=>{
  const R=load(),C=R.jhWalkCfg(R.JH_START);
  const start=R.jhGround(C,R.jhPct([550,636]));
  const goal=R.jhGround(C,R.jhPct([742,613]));
  const route=R.shwRoute(C,start,goal);
  assert.deepEqual(route.pts[0],start.p);assert.deepEqual(route.pts.at(-1),goal.p);
  assert.equal(route.pts.length-1,route.segE.length);
  assert.match(JH,/shwMount\(\{v,cfg,root:map,frame:map,layer:map,sel:".jh-spot"/);
  assert.match(JH,/ground:\(_,p\)=>pickGround\(p\)/);
  assert.doesNotMatch(JH,/搭星槎前往|jh-sailing|canVisit:/);
  assert.doesNotMatch(JH,/jhSail|class="osc-row"/);
  assert.doesNotMatch(JH,/mem="jianghu"/);
});
test("長卷點路面能下山、繞過水榭走到對岸，連續點相鄰路段可改道",()=>{
  const R=load(),C=R.jhWalkCfg(R.JH_START);
  let from="elephant";
  for(const p of [[522,552],[565,632],[703,608],[808,542],[869,290],[559,676],[603,705],[581,817],[718,838],[751,894],[860,981],[1021,956],[1145,742]]){
    const q=R.jhGround(C,R.jhPct(p));
    assert.ok(q,"可以點 "+p);
    assert.ok(R.shwRoute(C,from,q).pts.length>=2,"有走路路線 "+p);
    from=q;
  }
  for(const p of [[650,740],[590,783],[765,714],[445,755],[480,564],[400,525]]){
    assert.equal(R.jhGround(C,R.jhPct(p)),null,"水面或屋頂 "+p);
  }
  const court=R.jhGround(C,R.jhPct([117,1240]));
  assert.ok(court&&R.shwPx(C,C.N.screen,court.p)>40,"屏風馬門可從門前走到石坪一角");
  assert.equal(C.walkRetarget,true);
  assert.match(SHW,/S\.C\.walkRetarget\?shwPx\(S\.C,p,L\.p\)<3:/);
  assert.match(SHW,/["]jianghu:\*["]:false/,"長卷下緣的路面不能被共用隱藏出口攔截");
  assert.match(JH,/characterActions:false/);
  assert.match(JH,/\.jh-spot\{pointer-events:none\}\.jh-spot \.bn\{pointer-events:auto\}/);
});
test("先前照片的落點與本次紅圈可跨區走，經過村落外側步道",()=>{
  const R=load(),C=R.jhWalkCfg(R.JH_START);
  for(const point of [[2457,421],[2719,1143],[1049,455],[1091,476],[1543,928],[1541,962],[1557,991],[1558,1032]]){
    const dest=R.jhGround(C,R.jhPct(point));
    assert.ok(dest,point.join(","));
    assert.ok(R.shwRoute(C,"elephant",dest).pts.length>0);
  }
  const start=R.jhGround(C,R.jhPct([1219,1094]));
  const goal=R.jhGround(C,R.jhPct([1557,991]));
  const via=R.shwRoute(C,start,goal).pts;
  assert.deepEqual(via.at(-1),R.jhPct([1557,991]));
  assert.ok(via.some(p=>R.shwPx(C,p,R.jhPct([1468,1238]))<1), "從聚落下方沿河走，不穿民宅");
  assert.ok(via.some(p=>R.shwPx(C,p,R.jhPct([1546,1176]))<1), "走村東側的橋");
  const longRoad=R.shwPath(C,"same_cannon","opposite_cannon");
  assert.ok(longRoad.length>20,"兩岸經橋面與沿岸道路連通");
  for(const p of [[1010,472],[1047,395],[2250,520],[2580,455],[2732,874],[1589,1085]]){
    assert.equal(R.jhGround(C,R.jhPct(p)),null,"河面或山體 "+p);
  }
  assert.ok(R.jhGround(C,R.jhPct([370,780])),"新木橋橋面可點");
  assert.equal(R.jhGround(C,R.jhPct([402,780])),null,"新木橋旁水面不可點");
  assert.match(JH,/quickEntry:true/);
});
test("十派廣場走到點下的位置，進出與改道都不切出邊界",()=>{
  const R=load(),C=R.jhWalkCfg(R.JH_START);
  assert.equal(C.plazas.length,R.JH_PLAZAS.length);
  assert.equal(new Set(R.JH_PLAZAS.map(([site])=>site)).size,10);
  for(const [i,[site,outline]] of R.JH_PLAZAS.entries()){
    const {poly,port}=C.plazas[i];
    const convex=outline.map(([x,y],j)=>{
      const [a,b]=outline[(j+1)%outline.length],[c,d]=outline[(j+2)%outline.length];
      return Math.sign((a-x)*(d-b)-(b-y)*(c-a));
    });
    assert.equal(new Set(convex).size,1,site+" 必須是凸區");
    assert.ok(R.shwInPoly(poly,C.N[port]),site+" 入口在坪內");
    const center=poly.reduce((p,q)=>[p[0]+q[0]/poly.length,p[1]+q[1]/poly.length],[0,0]);
    const targets=[0,2].map(n=>center.map((v,j)=>(v+poly[n][j])/2));
    const [a,b]=targets.map(p=>{
      const q=R.jhGround(C,p);
      assert.deepEqual(q.p,p,site);
      assert.ok(R.shwRoute(C,site,q).pts.length>=2,site+" 接得回路網");
      return q;
    });
    const route=R.shwRoute(C,a,b);
    assert.equal(route.pts.length,2,site+" 直接在坪內改道");
    assert.deepEqual(route.pts.at(-1),b.p);
  }
  for(const p of [[174,362],[2651,883],[2800,709],[1986,1193],[2548,367],[1492,368],[1448,632],[1511,830]]){
    assert.ok(R.jhGround(C,R.jhPct(p)),"樓梯、橋或沿岸 "+p);
  }
  for(const p of [[80,170],[210,205],[730,736],[1335,386],[1930,1180],[2640,787],[2770,671],[2850,330]]){
    assert.equal(R.jhGround(C,R.jhPct(p)),null,"山／水／屋頂 "+p);
  }
});
test("照片岸路和路肩都可由長卷的左右兩端走到，岸邊水面仍擋路",()=>{
  const R=load(),C=R.jhWalkCfg(R.JH_START);
  for(const p of [[1473,771],[1452,765],[1490,760],[1484,793],[1448,685]]){
    const q=R.jhGround(C,R.jhPct(p));
    assert.ok(q,"岸路落點 "+p);
    assert.ok(R.shwPx(C,q.p,R.jhPct(p))<=32);
    for(const start of ["screen","palace_horse"]){
      const walk=R.shwRoute(C,start,q);
      assert.deepEqual(walk.pts[0],C.N[start]);
      assert.deepEqual(walk.pts.at(-1),q.p);
    }
  }
  for(const p of [[1440,754],[1510,765],[1513,743]])assert.equal(R.jhGround(C,R.jhPct(p)),null,"水面 "+p);
});
test("頁面：路由、組版 include、淡出淡入、第一次歡迎文字、入口（首頁遠山、找地方、開局棋路頁）",()=>{
  assert.match(rd("xiangqi-db/m/02-shell.js"),/p\[0\]==="jianghu"&&typeof Jianghu==="function"\)return screen=Jianghu\(v\)/);
  assert.match(rd("xiangqi-db/m.html"),/\/\/#include m\/07z9-school\.js\n\/\/#include m\/07z9b-jianghu\.js/);
  assert.match(JH,/function jhGo\(hash,from\)/);assert.match(JH,/#jhFade\{position:fixed/);assert.match(JH,/store\.get\("jhIntro",0\)/);assert.match(JH,/歡迎來到江淮十州/);
  assert.match(JH,/b\.id="hmJh"/);assert.match(JH,/sh\[4\]\.push\(\[jhL\("十州棋館"/);assert.match(JH,/OscPage=function\(v,c,lk\)/);
  assert.ok(!/\/\/[^\n]*\n/.test(JH.split("\n").filter(l=>!/^\s*\/\//.test(l)).join("\n").replace(/https?:\/\/[^\s"'`]+/g,"")),"一行程式裡不插 // 註解")});
test("圖：art/yunhe/pano.webp 在、大小合理；文字中英並列（不靠外掛字典）",()=>{const p=path.join(ROOT,"xiangqi-db/art/yunhe/pano.webp");
  if(!fs.existsSync(p))return;const n=fs.statSync(p).size;assert.ok(n>300e3&&n<1.6e6,"約 1 MB："+n);
  for(const s of["十州棋館","開始遊歷","看十派總覽"])assert.ok(JH.includes(s),s);for(const s of["Ten Prefectures","Start the journey","See all ten schools"])assert.ok(JH.includes(s),s)});
