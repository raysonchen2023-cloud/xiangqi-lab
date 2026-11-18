// 開發者 11/18：十州棋館（門派江湖長卷）——「地圖要用環景的，然角色可以在地圖上移動」「現在就做，畫面切到這個長卷也要有淡入淡出的視覺效果，然後第一次進來要有文字描述歡迎光臨來到什麼地方之類的」
//   m/07z9b-jianghu.js：十派駐地座標、道路圖、沿路走的純函式；首頁遠山入口、找地方、開局棋路頁的入口；淡出淡入；第一次的歡迎文字
// 用法：node --test xiangqi-lab/tools/test-jianghu-1118.js
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),path=require("path"),vm=require("vm");
const ROOT=path.join(__dirname,"../..");const rd=p=>fs.readFileSync(path.join(ROOT,p),"utf8");
const JH=rd("xiangqi-db/m/07z9b-jianghu.js"),OS=rd("xiangqi-db/m/07z9-school.js");
const load=()=>{const c={};vm.createContext(c);const a=JH.indexOf("const JH_ON"),b=JH.indexOf("/* ---------- 文字");vm.runInContext(JH.slice(a,b)+";this.R={JH_W,JH_H,JH_HOME,JH_SITE,JH_J,JH_E,JH_START,jhNodes,jhPath,jhLen,jhAt}",c);return c.R};
const osc=()=>{const c={};vm.createContext(c);vm.runInContext(OS.slice(OS.indexOf("const OSC=(()=>{"),OS.indexOf("/* ===== END osc-core"))+";this.OSC=OSC",c);return c.OSC};
test("十派每一派都有駐地，座標都在長卷圖裡；牌旗在站點上方",()=>{const R=load(),O=osc();
  assert.equal(JSON.stringify(Object.keys(R.JH_SITE).sort()),JSON.stringify(O.SCH.map(s=>s.id).sort()));
  for(const[k,v]of Object.entries(R.JH_SITE)){for(const p of[v.s,v.f]){assert.ok(p[0]>0&&p[0]<R.JH_W&&p[1]>0&&p[1]<R.JH_H,k+" "+p)}assert.ok(v.f[1]<v.s[1],k+" 牌旗要在站點上方")}
  for(const[k,p]of Object.entries(R.JH_J))assert.ok(p[0]>0&&p[0]<R.JH_W&&p[1]>0&&p[1]<R.JH_H,k);
  assert.ok(R.JH_SITE[R.JH_START]);for(const k of["",'p34','l1610'])assert.equal(R.JH_HOME[k].length,2)});
test("道路圖：每條路接的都是存在的點；從任何駐地都走得到其他九派",()=>{const R=load(),N=R.jhNodes();
  for(const e of R.JH_E.split(" ")){const[a,b]=e.split("-");assert.ok(N[a]&&N[b],e)}
  const S=Object.keys(R.JH_SITE);for(const a of S)for(const b of S){const p=R.jhPath(a,b);assert.ok(p.length>=1,a+"→"+b);assert.deepEqual(p[0],N[a]);assert.deepEqual(p[p.length-1],N[b])}
  assert.ok(R.jhLen(R.jhPath("horse","advisor_corner"))>2000,"徐州到蘇州橫跨長卷")});
test("沿路走：t＝0 在起點、t＝1 在終點，往左走會轉身",()=>{const R=load();const pts=R.jhPath("pawn","elephant");
  const a=R.jhAt(pts,0),b=R.jhAt(pts,1);const near=(q,r)=>Math.abs(q.x-r[0])<.01&&Math.abs(q.y-r[1])<.01;assert.ok(near(a,pts[0]));assert.ok(near(b,pts[pts.length-1]));assert.equal(R.jhAt(pts,.5).dir,-1)});
test("頁面：路由、組版 include、淡出淡入、第一次歡迎文字、入口（首頁遠山、找地方、開局棋路頁）",()=>{
  assert.match(rd("xiangqi-db/m/02-shell.js"),/p\[0\]==="jianghu"&&typeof Jianghu==="function"\)return screen=Jianghu\(v\)/);
  assert.match(rd("xiangqi-db/m.html"),/\/\/#include m\/07z9-school\.js\n\/\/#include m\/07z9b-jianghu\.js/);
  assert.match(JH,/function jhGo\(hash,from\)/);assert.match(JH,/#jhFade\{position:fixed/);assert.match(JH,/store\.get\("jhIntro",0\)/);assert.match(JH,/歡迎來到江淮十州/);
  assert.match(JH,/b\.id="hmJh"/);assert.match(JH,/sh\[4\]\.push\(\[jhL\("十州棋館"/);assert.match(JH,/OscPage=function\(v,c,lk\)/);
  assert.ok(!/\/\/[^\n]*\n/.test(JH.split("\n").filter(l=>!/^\s*\/\//.test(l)).join("\n").replace(/https?:\/\/[^\s"'`]+/g,"")),"一行程式裡不插 // 註解")});
test("圖：art/yunhe/pano.webp 在、大小合理；文字中英並列（不靠外掛字典）",()=>{const p=path.join(ROOT,"xiangqi-db/art/yunhe/pano.webp");
  if(!fs.existsSync(p))return;const n=fs.statSync(p).size;assert.ok(n>300e3&&n<1.6e6,"約 1 MB："+n);
  for(const s of["十州棋館","開始遊歷","看十派總覽"])assert.ok(JH.includes(s),s);for(const s of["Ten Prefectures","Start the journey","See all ten schools"])assert.ok(JH.includes(s),s)});
