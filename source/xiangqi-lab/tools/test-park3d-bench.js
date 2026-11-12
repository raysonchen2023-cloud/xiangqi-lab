// 〔混合〕評比第 7 輪「3D 技美與場景專家」（P29.1 渲染效能、P29.2 發熱與功耗）：3D 效能量測、動態解析度、省電時黑洞略過鏡像
// 用法：node --test xiangqi-lab/tools/test-park3d-bench.js
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),path=require("path");
const ROOT=path.join(__dirname,"..",".."),rd=f=>fs.readFileSync(path.join(ROOT,f),"utf8").replace(/\r\n/g,"\n");
const PARK3D=rd("xiangqi-lab/src/park3d.js"),CPU=rd("xiangqi-db/m/06-cpu.js");
const cut=(s,a,b)=>{const i=s.indexOf(a);assert.ok(i>=0,"找不到 "+a);const j=s.indexOf(b,i+a.length);assert.ok(j>i,"找不到結尾 "+b);return s.slice(i,j)};

test("〔混合〕效能量測：10 秒鏡頭路徑、平均幀數與最差 1% 照實算", ()=>{
  const src=cut(PARK3D,"let BENCH=null;","function frame(now)");
  /* 用假的 renderer 跑：每格 16ms，其中 1 格 50ms；繪製 20 次、三角形 3000 */
  let yaw=0,tyaw=0,zoom=1,tzoom=1,pitch=.5,tpitch=.5,shown=true;const rdm={info:{autoReset:true,render:{calls:20,triangles:3000}},getPixelRatio:()=>2};
  const K=new Function("rd","TAU","GIANT","EK","W","H","PW","pwPoke","S",src+";return{bench,benchStep,benchRec,get B(){return BENCH}}")(rdm,Math.PI*2,true,"classic",440,560,{on:false},()=>{},{});
  /* 這段程式用到外面的 yaw/tyaw…，用 with 不行，改用全域 */
  assert.ok(src.includes("const bench=(cb,ms)=>{if(BENCH||!shown)return false;rd.info.autoReset=false;"),"量測時關掉 info 自動歸零（一格裡畫好幾次要加總）");
  assert.ok(src.includes("p99=d[Math.floor(d.length*.99)]"),"最差 1%＝第 99 百分位的那一格");
  assert.ok(src.includes("avgFps:Math.round(10000/(avg||16))/10,low1:Math.round(10000/p99)/10"),"平均與最差 1% 換算成幀數");
  assert.ok(src.includes("yaw=tyaw=B.y0+p*TAU"),"鏡頭繞一整圈");assert.ok(src.includes("rd.info.autoReset=true;yaw=tyaw=B.y0;zoom=tzoom=B.z0;pitch=tpitch=B.p0"),"結束還原鏡頭");
  assert.equal(typeof K.bench,"function");
});

test("〔原始碼〕量測接進動畫迴圈；動態解析度；省電時黑洞略過鏡像角色", ()=>{
  assert.ok(PARK3D.includes("if(BENCH)benchStep(now);"),"每格先推進量測的鏡頭");
  assert.ok(PARK3D.includes("const act=!shown||!!BENCH||"),"量測中每格都畫");
  assert.ok(PARK3D.includes("if(BENCH)rd.info.reset();")&&PARK3D.includes("if(BENCH)benchRec(now);"),"每格歸零、畫完（含鏡像）再記");
  assert.ok(PARK3D.includes("bench:(cb,ms)=>bench(cb,ms),setView:setViewF"),"對外給 bench");
  const pw=cut(PARK3D,"const pwFps=now=>{","let BENCH=null;");
  assert.ok(pw.includes("if(a<30&&pr>1){rd.setPixelRatio(Math.max(1,Math.round((pr-.25)*4)/4))"),"低於 30 幀降一級像素倍率（最低 1）");
  assert.ok(pw.includes("if(a>55&&pr<pmax){PW.dhi=(PW.dhi||0)+1;if(PW.dhi>=3)"),"連續 3 次高於 55 幀才升回");
  assert.ok(pw.indexOf("rd.setPixelRatio")<pw.indexOf('localStorage.setItem("xq_pkLowFps"'),"先降解析度，最後才進省電");
  assert.ok(PARK3D.includes("try{if(L.length&&!PW.on){"),"省電時黑洞不畫鏡像角色（棋盤照畫）");
});

test("〔原始碼〕設定頁的「📊 3D 效能量測」：要有 3D 畫面、結果存最近 10 筆、可以複製", ()=>{
  assert.ok(CPU.includes('onclick="pkBench()">📊 3D 效能量測（10 秒）</button>'),"按鈕在省電模式那一格");
  const f=cut(CPU,"function pkBench(){","\n/*");
  assert.ok(f.includes("if(!v||!v.bench){toast("),"沒開 3D 畫面就提示");assert.ok(f.includes('store.set("pkBench",L.slice(0,10))'),"存最近 10 筆");
  assert.ok(f.includes("navigator.clipboard.writeText(t)"),"可以複製結果");
  const txt=new Function("window","navigator",cut(CPU,"function pkBenchTxt(r){","\nfunction pkBench(")+";return pkBenchTxt")({XQ_BUILD:"20261112-1230"},{userAgent:"Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit"});
  const s=txt({scene:"黑洞巨盤",avgFps:52.3,low1:31.2,calls:180,tris:612345,w:440,h:560,pr:2,power:false});
  assert.ok(s.includes("平均 52.3 幀")&&s.includes("最差 1% 31.2 幀")&&s.includes("每格繪製 180 次")&&s.includes("612.3k 三角形")&&s.includes("440×560×2")&&s.includes("iPhone")&&s.includes("20261112-1230"),s);
});
