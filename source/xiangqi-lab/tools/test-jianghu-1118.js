// 開發者 11/18：十州棋館（門派江湖長卷）——「地圖要用環景的，然角色可以在地圖上移動」「現在就做，畫面切到這個長卷也要有淡入淡出的視覺效果，然後第一次進來要有文字描述歡迎光臨來到什麼地方之類的」
//   m/07z9b-jianghu.js：十派駐地座標、道路圖、沿路走的純函式；首頁遠山入口、找地方、開局棋路頁的入口；淡出淡入；第一次的歡迎文字
// 用法：node --test xiangqi-lab/tools/test-jianghu-1118.js
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),path=require("path"),vm=require("vm");
const ROOT=path.join(__dirname,"../..");const rd=p=>fs.readFileSync(path.join(ROOT,p),"utf8");
const JH=rd("xiangqi-db/m/07z9b-jianghu.js"),OS=rd("xiangqi-db/m/07z9-school.js"),SHW=rd("xiangqi-db/m/07w-shipwalk.js");
const load=()=>{const c={};vm.createContext(c);const a=JH.indexOf("const JH_ON"),b=JH.indexOf("/* ---------- 文字");
  vm.runInContext(SHW.slice(SHW.indexOf("const shwPx"),SHW.indexOf("function shwPt"))+SHW.split("\n").find(line=>line.startsWith("function shwInPoly"))+"\n"+JH.slice(a,b)+";this.R={JH_W,JH_H,JH_HOME,JH_SITE,JH_START,jhWalkCfg,jhGround,jhPct,jhArea,shwPath,shwNear,shwRoute,shwPx}",c);
  return c.R};
const osc=()=>{const c={};vm.createContext(c);vm.runInContext(OS.slice(OS.indexOf("const OSC=(()=>{"),OS.indexOf("/* ===== END osc-core"))+";this.OSC=OSC",c);return c.OSC};
test("十派每一派都有駐地，座標都在長卷圖裡；牌旗在站點上方",()=>{const R=load(),O=osc();
  assert.equal(JSON.stringify(Object.keys(R.JH_SITE).sort()),JSON.stringify(O.SCH.map(s=>s.id).sort()));
  for(const[k,v]of Object.entries(R.JH_SITE)){for(const p of[v.s,v.f]){assert.ok(p[0]>0&&p[0]<R.JH_W&&p[1]>0&&p[1]<R.JH_H,k+" "+p)}assert.ok(v.f[1]<v.s[1],k+" 牌旗要在站點上方")}
  assert.ok(R.JH_SITE[R.JH_START]);for(const k of["",'p34','l1610'])assert.equal(R.JH_HOME[k].length,2)});
test("同一走路區域只沿標定路段走；隔山隔水沒有直線退路",()=>{
  const R=load(),C=R.jhWalkCfg(R.JH_START);
  const edges=new Set(C.E.split(" ").map(e=>e.split("-").sort().join("-")));
  for(const e of C.E.split(" ")){
    const [a,b]=e.split("-");
    assert.ok(C.N[a]&&C.N[b]&&C.area[a]===C.area[b],e);
    assert.ok(R.shwPx(C,C.N[a],C.N[b])<=65,"超長路段或漏標轉折點 "+e);
  }
  for(const a of Object.keys(C.N))for(const b of Object.keys(R.JH_SITE)){
    const points=R.shwPath(C,a,b);
    if(C.area[a]!==C.area[b]){
      assert.equal(points.length,0,a+" → "+b);
      continue;
    }
    assert.equal(points[0],a);assert.equal(points.at(-1),b);
    for(let i=1;i<points.length;i++)assert.ok(edges.has([points[i-1],points[i]].sort().join("-")));
  }
  const acrossBridge=R.shwPath(C,"elephant","central");
  assert.ok(acrossBridge.includes("westBridge"));
  assert.equal(R.shwRoute(C,"elephant","palace_horse").pts.length,0);
});
test("各區的道路、石階和橋可點；山壁、河面、屋頂與未連通的路不吸附",()=>{
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
    const q=R.jhGround(C,id,R.jhPct(road));
    assert.ok(q,id+" 道路");
    for(const p of blocked)assert.equal(R.jhGround(C,id,R.jhPct(p)),null,id+" 障礙 "+p);
    assert.equal(R.jhGround(C,id,R.jhPct(R.JH_SITE[id==="elephant"?"screen":"horse"].s)),null,id+" 隔區");
  }
});
test("仕角炮門石坪容易點選，隔壁山壁與另一區的石坪保持禁行",()=>{
  const R=load(),C=R.jhWalkCfg(R.JH_START),p=R.jhPct([2458,325]);
  assert.ok(R.shwNear(C,p).d>18,"石坪測點要在原路段的點選範圍外");
  const q=R.jhGround(C,"advisor_corner",p);
  assert.ok(q);
  assert.ok(R.shwNear(C,q.p).d<1);
  assert.equal(R.jhGround(C,"advisor_corner",R.jhPct([2390,390])),null);
  assert.equal(R.jhGround(C,"elephant",p),null);
});
test("途中改道仍走路網；路線選擇、門派名帖和跨區移動分開",()=>{
  const R=load(),C=R.jhWalkCfg(R.JH_START);
  const start=R.jhGround(C,"elephant",R.jhPct([550,636]));
  const goal=R.jhGround(C,start,R.jhPct([742,613]));
  const route=R.shwRoute(C,start,goal);
  assert.deepEqual(route.pts[0],start.p);assert.deepEqual(route.pts.at(-1),goal.p);
  assert.equal(route.pts.length-1,route.segE.length);
  assert.match(JH,/shwMount\(\{v,cfg,root:map,frame:map,layer:map,sel:".jh-spot"/);
  assert.match(JH,/ground:\(state,p\)=>ground\(state.at,p\)/);
  assert.match(JH,/sail\(b.dataset.sid\)/);
  assert.match(JH,/if\(arrival\)jhSheet\(arrival\)/);
  assert.doesNotMatch(JH,/jhSail|class="osc-row"/);
  assert.doesNotMatch(JH,/mem="jianghu"/);
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
