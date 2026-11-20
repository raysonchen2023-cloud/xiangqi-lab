// 意見回饋 878（開發者 11/12）：「1.雲跑到地面了 2.下雨的範圍太小，不合理」（經典世界 苑中・石桌）
// 檢查 xiangqi-lab/src/park3d.js：飄雲改在石台外的山谷、雲底高過山坡；雨雪鋪到山坡、篷子底下不生、落到各自位置的地面才重來
// 用法：node --test xiangqi-lab/tools/test-park-weather.js
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),path=require("path");
const P3=fs.readFileSync(path.join(__dirname,"..","src","park3d.js"),"utf8");
const line=k=>{const i=P3.indexOf(k);assert.ok(i>=0,"找不到 "+k);return P3.slice(i,P3.indexOf("\n",i))};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const{HILL_P,hillY}=new Function("clamp",line("const HILL_P=")+"\n"+line("const hillY=")+"\nreturn{HILL_P,hillY};")(clamp);
const TR=21,FL=-6.6;

test("山坡剖面：石台上是平地，往外一路變低，接點跟剖面資料一致",()=>{
  assert.equal(hillY(0,TR,FL),FL);assert.equal(hillY(TR,TR,FL),FL);
  for(const[a,b]of HILL_P.slice(1))assert.ok(Math.abs(hillY(TR+a,TR,FL)-(FL+b))<1e-9,"r="+(TR+a));
  let prev=FL;for(let r=TR;r<TR+130;r+=.5){const y=hillY(r,TR,FL);assert.ok(y<=prev+1e-9,"r="+r+" 不能往上");prev=y}});

test("〔行為〕飄雲：一朵都不會坐在石台或山坡上（雲底高過下面的山坡，且在石台外）",()=>{
  /* 照 park3d 的公式抽 2000 朵 */
  const L=line("const r=(X.TR||21)+20+Math.random()*40");
  assert.ok(L.includes("lo=hillY(r,X.TR||21,GY)+sz*.35+1.2"));
  for(let k=0;k<2000;k++){const r=TR+20+Math.random()*40,sz=10+Math.random()*10,lo=hillY(r,TR,FL)+sz*.35+1.2,hi=Math.max(lo+1,FL+2.5),y=lo+Math.random()*(hi-lo);
    assert.ok(r>TR+15,"雲在石台外");assert.ok(y-sz*.35>hillY(r,TR,FL)+1,"雲底高過山坡 r="+r.toFixed(1))}
  assert.ok(!P3.includes("const r=21+Math.random()*8,y=GY+.5+Math.random()*3"),"舊的（坐在石台邊）拿掉了")});

test("〔行為〕雨雪：範圍蓋到山坡；雨能落到篷頂；鏡頭縮小後雨區加寬加高",()=>{
  const start=P3.indexOf("const BX=snow?");
  const source=P3.slice(start,P3.indexOf("/* 地面：",start));
  const CANO={x:12.5*.9,z:18.5*.9,y:16},cam={position:{x:0,y:23,z:40}};
  const run=new Function("snow","MOB","RM","A","FL","CANO","hillY","TR","EK","cam",
    source+`const pos=new Float32Array(N*6);
    function place(){const [x,z,y]=spot();pos[0]=x;pos[2]=z;GYS[0]=y;pos[1]=(y+rainCeiling)/2}
    return{spot,place,fitRain,rainFloor,get distance(){return rainScale},get ceiling(){return rainCeiling},pos,GYS}`);
  for(const snow of [true,false]){
    const {spot,rainFloor}=run(snow,true,false,1,FL,CANO,hillY,TR,"classic",cam);
    let far=0,roof=0;
    for(let i=0;i<2000;i++){const[x,z,gy]=spot(),under=Math.abs(x)<CANO.x&&Math.abs(z)<CANO.z;
      if(under)roof++;assert.equal(rainFloor(x,z,gy),under?CANO.y:gy);
      const r=Math.hypot(x,z);if(r>TR)far++;assert.equal(gy,hillY(r,TR,FL))}
    assert.ok(far>1100);assert.ok(snow?roof===0:roof>150);
  }
  const rain=run(false,true,false,1,FL,CANO,hillY,TR,"classic",cam);
  rain.place();
  const [x,,z]=rain.pos;
  cam.position={x:0,y:150,z:180};
  rain.fitRain();
  assert.ok(rain.ceiling>cam.position.y);
  assert.ok(rain.distance>4);
  assert.ok(Math.abs(rain.pos[0]-x*rain.distance)<.001);
  assert.ok(Math.abs(rain.pos[2]-z*rain.distance)<.001);
  assert.ok(Math.abs((rain.pos[1]-rain.GYS[0])/(rain.ceiling-rain.GYS[0])-.5)<.001);
});

test("〔原始碼〕雨雪重生改用每滴自己的地面高度 GYS，舊的固定 Y0 拿掉；山坡模型用同一份剖面",()=>{
  assert.match(P3,/pos\[j\+1\]<rainFloor\(pos\[j\],pos\[j\+2\],GYS\[i\]\)/);
  assert.match(P3,/pos\[j\+1\]<GYS\[i\]/);
  assert.ok(!/\bY0\b/.test(P3));
  assert.ok(P3.includes("HILL_P.map(([a,b])=>[TR+a,FL+b])"));
  assert.ok(P3.includes("buildFurn(EK,E,{sc,M,GY,FL,TR,"))});
