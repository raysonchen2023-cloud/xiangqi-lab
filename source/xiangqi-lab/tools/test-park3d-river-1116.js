// 11/16 開發者兩則（黑洞大棋盤、全局俯視）：「放開手後，棋盤會轉向到錯的一邊」→ 選單選「一律回正面」；「正面的楚河漢界字會重疊，另一面不會」→ 鏡像河界層照仰角淡出。
// 都在 xiangqi-lab/src/park3d.js；不開瀏覽器，把那兩段抽出來算。
// 用法：node --test xiangqi-lab/tools/test-park3d-river-1116.js
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),path=require("path");
const P3=fs.readFileSync(path.join(__dirname,"../src/park3d.js"),"utf8").replace(/\r\n/g,"\n"),PI=Math.PI;

test("放手回正：不管拖到哪裡（含翻過頭頂到盤底），目標仰角一律是正面（相對預設差 2π 的整數倍），不再停在盤底", ()=>{
  const m=P3.match(/const tdElT=(\(\)=>\{[^\n]*?\});/);assert.ok(m,"找得到 tdElT");
  const f=TDOR=>Function("TDC","TDOR","PI","return ("+m[1]+")()")(1,TDOR,PI);
  const w=x=>Math.abs(x-Math.round(x/(2*PI))*2*PI)<1e-9;
  for(const el of[0,.3,-.4,PI*.9,PI,PI*1.2,-PI*1.1,2*PI+.2,3*PI])assert.ok(w(f({el})),"el="+el.toFixed(2)+" → "+f({el}));
  assert.equal(f({el:PI*.95}),0,"在盤底（仰角差約 180°）放手：轉回正面，不是停在盤底");
  assert.equal(Function("TDC","TDOR","PI","return ("+m[1]+")()")(0,{el:2},PI),0,"不是塔防鏡頭就不管");
  assert.ok(!/dB=w\(TDOR\.el-PI\)/.test(P3),"拿掉盤底那個預設");
});

test("鏡像河界層 BRV：仰角 40° 以上不畫（全局俯視不重影）、20° 以下照舊 .95（低角度看倒影時還在），中間漸變；只在 gntMirror 每幀調", ()=>{
  const m=P3.match(/if\(BRV\)\{const a=Math\.atan2\(cam\.position\.y-TOP,Math\.hypot\(cam\.position\.x,cam\.position\.z\)\)\*180\/PI,op=([^;]+);/);assert.ok(m,"找得到仰角淡出");
  const op=a=>Function("a","return "+m[1])(a);
  assert.equal(op(68),0,"全局俯視 68°");assert.equal(op(40),0);assert.equal(op(10),.95);assert.equal(op(20),.95);assert.ok(Math.abs(op(30)-.475)<1e-9);assert.equal(op(-30),.95,"盤底（朝上那面本來就被剔除）");
  assert.match(P3,/const gntMirror=\(\)=>\{if\(!MG\)return;[^\n]*\n[^\n]*\n[^\n]*\n\s*if\(BRV\)\{const a=Math\.atan2/,"放在 gntMirror 開頭");
  assert.match(P3,/BRV\.material\.opacity=op;BRV\.visible=op>0/);
  assert.ok(P3.includes("BRV=new T.Mesh(new T.PlaneGeometry(BW,BH),new T.MeshBasicMaterial({map:rtex,transparent:true,opacity:.95,depthWrite:false,toneMapped:false,side:T.FrontSide}))"),"BRV 本身的定義沒動");
});
