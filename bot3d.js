// 3D 象棋小人（意見回饋 159）：圓滾滾的「帥」棋子身體＋頭、手、腳，在畫面上自由走動、做手勢
// 畫布只有小人那麼大（跟著小人移動），不擋後面的按鈕；點小人會做一個動作；吃子、將軍時有反應
(function(){
  const T=window.THREE;if(!T)return;
  const W=120,H=150,TAU=Math.PI*2,ease=p=>p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2,wave=(p,n)=>Math.sin(p*TAU*n);
  function faceTex(ch){const c=document.createElement("canvas");c.width=c.height=256;const g=c.getContext("2d");
    const gr=g.createRadialGradient(110,100,20,128,128,128);gr.addColorStop(0,"#FFF4DC");gr.addColorStop(1,"#E9CC98");
    g.fillStyle=gr;g.beginPath();g.arc(128,128,128,0,TAU);g.fill();
    g.strokeStyle="#B3141B";g.lineWidth=10;g.beginPath();g.arc(128,128,100,0,TAU);g.stroke();
    g.fillStyle="#B3141B";g.font='900 130px "Noto Serif TC","PMingLiU","Songti TC",serif';g.textAlign="center";g.textBaseline="middle";g.fillText(ch,128,136);
    const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace||t.colorSpace;return t}
  function build(){
    const bot=new T.Group(),M=(c,o)=>new T.MeshStandardMaterial(Object.assign({color:c,roughness:.55,metalness:.02},o||{}));
    const wood=M("#B9844E",{roughness:.7}),skin=M("#F6E6C8"),red=M("#C4261D"),dark=M("#2A1A12"),pink=M("#F29B9B",{roughness:.9});
    // 身體＝一顆厚棋子（平面朝前），正面寫「帥」
    const body=new T.Mesh(new T.CylinderGeometry(.78,.78,.44,48),wood);body.rotation.x=Math.PI/2;
    const face=new T.Mesh(new T.CircleGeometry(.76,48),M("#fff",{map:faceTex("帥"),roughness:.5}));face.position.z=.222;
    const torso=new T.Group();torso.position.y=1.02;torso.add(body,face);bot.add(torso);
    // 頭
    const head=new T.Group();head.position.y=.78;torso.add(head);
    const skull=new T.Mesh(new T.SphereGeometry(.5,32,24),skin);skull.position.y=.12;head.add(skull);
    const eyes=[];for(const s of[-1,1]){const e=new T.Mesh(new T.SphereGeometry(.075,16,12),dark);e.position.set(.17*s,.18,.45);head.add(e);eyes.push(e);
      const hl=new T.Mesh(new T.SphereGeometry(.025,8,8),M("#fff"));hl.position.set(.02,.03,.06);e.add(hl);
      const ck=new T.Mesh(new T.SphereGeometry(.08,12,8),pink);ck.scale.set(1,.55,.4);ck.position.set(.29*s,.03,.4);head.add(ck)}
    const mouth=new T.Mesh(new T.TorusGeometry(.09,.022,8,16,Math.PI),dark);mouth.rotation.z=Math.PI;mouth.position.set(0,.02,.48);head.add(mouth);
    const cap=new T.Mesh(new T.CylinderGeometry(.24,.26,.12,32),red);cap.position.y=.62;head.add(cap);
    const knob=new T.Mesh(new T.SphereGeometry(.07,12,8),M("#E8B84A",{metalness:.4}));knob.position.y=.72;head.add(knob);
    // 手：肩膀關節 → 手臂 → 手掌
    const arms=[];for(const s of[-1,1]){const sh=new T.Group();sh.position.set(.8*s,.12,0);torso.add(sh);
      const a=new T.Mesh(new T.CapsuleGeometry(.1,.34,6,12),skin);a.position.y=-.27;sh.add(a);
      const hd=new T.Mesh(new T.SphereGeometry(.15,16,12),skin);hd.position.y=-.56;sh.add(hd);arms.push(sh)}
    // 腳：髖關節 → 腿 → 鞋
    const legs=[];for(const s of[-1,1]){const hp=new T.Group();hp.position.set(.3*s,.62,0);bot.add(hp);
      const l=new T.Mesh(new T.CapsuleGeometry(.12,.2,6,12),skin);l.position.y=-.2;hp.add(l);
      const f=new T.Mesh(new T.SphereGeometry(.17,16,12),red);f.scale.set(1,.6,1.35);f.position.set(0,-.43,.06);hp.add(f);legs.push(hp)}
    return{bot,torso,head,eyes,mouth,arms,legs}}

  // 動作：d＝秒數、say＝泡泡文字、f(p,B)＝依進度 p(0~1) 擺姿勢
  const ACTS={
    wave:{d:2.2,say:"嗨！",f:(p,B)=>{B.arms[1].rotation.z=2.6;B.arms[1].rotation.x=0;B.arms[1].rotation.y=.4*wave(p,3);B.head.rotation.z=-.12}},
    jump:{d:1.3,say:"耶！",f:(p,B)=>{const h=Math.max(0,Math.sin(p*Math.PI*2));B.root.position.y=h*.7;B.arms[0].rotation.z=-2.4*h-.3;B.arms[1].rotation.z=2.4*h+.3;B.legs[0].rotation.x=-.5*h;B.legs[1].rotation.x=-.5*h}},
    cheer:{d:2,say:"好棋！",f:(p,B)=>{B.arms[0].rotation.z=-2.7+.3*wave(p,4);B.arms[1].rotation.z=2.7-.3*wave(p,4);B.root.position.y=Math.abs(wave(p,2))*.25}},
    dance:{d:3.2,say:"♪ ♫",f:(p,B)=>{const s=wave(p,4);B.root.rotation.z=.18*s;B.arms[0].rotation.z=-1.2-1*s;B.arms[1].rotation.z=1.2-1*s;B.legs[0].rotation.x=.5*Math.max(0,s);B.legs[1].rotation.x=.5*Math.max(0,-s);B.head.rotation.z=-.2*s;B.root.position.y=Math.abs(s)*.12}},
    think:{d:2.8,say:"嗯…",f:(p,B)=>{B.arms[1].rotation.z=.4;B.arms[1].rotation.x=-2.3;B.arms[1].rotation.y=-.6;B.head.rotation.z=.22;B.head.rotation.x=-.12+.05*wave(p,2)}},
    bow:{d:2,say:"請多指教",f:(p,B)=>{const k=Math.sin(p*Math.PI);B.torso.rotation.x=.75*k;B.arms[0].rotation.x=.4*k;B.arms[1].rotation.x=.4*k}},
    spin:{d:1.6,say:"轉～",f:(p,B)=>{B.root.rotation.y=ease(p)*TAU;B.arms[0].rotation.z=-1.5;B.arms[1].rotation.z=1.5}},
    clap:{d:2,say:"👏👏",f:(p,B)=>{const k=(wave(p,6)+1)/2;for(const[i,s]of[[0,-1],[1,1]]){B.arms[i].rotation.x=-1.35;B.arms[i].rotation.z=s*(.15+.5*k);B.arms[i].rotation.y=-s*.9}}},
    point:{d:2.2,say:"看這裡！",f:(p,B)=>{B.arms[1].rotation.z=1.55;B.arms[1].rotation.y=.2*wave(p,2);B.head.rotation.y=.35}},
    sleep:{d:3.4,say:"Zzz…",f:(p,B)=>{B.head.rotation.z=.4;B.head.rotation.x=.2;B.closed=1;B.root.position.y=-.03*(1+wave(p,2));B.arms[0].rotation.z=-.15;B.arms[1].rotation.z=.15}},
    shrug:{d:1.8,say:"？",f:(p,B)=>{const k=Math.sin(p*Math.PI);B.arms[0].rotation.z=-1.1*k-.3;B.arms[1].rotation.z=1.1*k+.3;B.arms[0].rotation.x=B.arms[1].rotation.x=-.8*k;B.head.rotation.z=.2*k}},
    flex:{d:2.2,say:"看我的！",f:(p,B)=>{for(const[i,s]of[[0,-1],[1,1]]){B.arms[i].rotation.z=s*1.6;B.arms[i].rotation.x=-.3+.25*wave(p,3)}B.torso.rotation.x=-.1}},
    shock:{d:1.6,say:"將軍！",f:(p,B)=>{const k=Math.min(1,p*4);B.root.position.y=.5*Math.sin(Math.min(1,p*2)*Math.PI);B.arms[0].rotation.z=-2.9*k;B.arms[1].rotation.z=2.9*k;B.root.rotation.z=.08*wave(p,8)*(1-p)}}};
  const IDLE_ACTS=["wave","jump","cheer","dance","think","bow","spin","clap","point","sleep","shrug","flex"];

  function start(){
    const box=document.createElement("div");box.className="xqbot";
    box.style.cssText=`position:fixed;left:0;top:0;width:${W}px;height:${H}px;z-index:40;pointer-events:none;will-change:transform`;
    const bub=document.createElement("div");bub.style.cssText="position:absolute;left:50%;top:-6px;transform:translate(-50%,-100%);background:#fff;color:#3a2618;border:1.5px solid #3a2618;border-radius:12px;padding:3px 9px;font:700 13px sans-serif;white-space:nowrap;opacity:0;transition:opacity .25s";
    box.appendChild(bub);document.body.appendChild(box);
    let rd;try{rd=new T.WebGLRenderer({alpha:true,antialias:true})}catch(e){box.remove();return null}
    rd.setPixelRatio(Math.min(2,window.devicePixelRatio||1));rd.setSize(W,H);rd.domElement.style.cssText="display:block;width:100%;height:100%";box.insertBefore(rd.domElement,bub);
    if(T.SRGBColorSpace)rd.outputColorSpace=T.SRGBColorSpace;
    const sc=new T.Scene(),cam=new T.PerspectiveCamera(30,W/H,.1,50);cam.position.set(0,1.45,7.2);cam.lookAt(0,1.15,0);
    sc.add(new T.HemisphereLight(0xfff6e6,0x6b4a2e,1.3));const dl=new T.DirectionalLight(0xffffff,1.6);dl.position.set(2,4,5);sc.add(dl);
    const P=build(),root=new T.Group();root.add(P.bot);sc.add(root);const B=Object.assign(P,{root,closed:0});
    const sh=new T.Mesh(new T.CircleGeometry(.75,32),new T.MeshBasicMaterial({color:0,transparent:true,opacity:.18}));sh.rotation.x=-Math.PI/2;sh.position.y=.02;sc.add(sh);
    // 位置（畫面座標）
    const bounds=()=>({x0:4,x1:innerWidth-W-4,y0:70,y1:innerHeight-H-70});
    let x=Math.max(4,innerWidth-W-16),y=Math.max(70,innerHeight-H-90),tx=x,ty=y,face=0,act=null,actT=0,next=1.5,bubT=0,stopped=false,last=performance.now(),acc=0,blinkT=2;
    const say=(s,d)=>{bub.textContent=s;bub.style.opacity=1;bubT=d||1.8};
    const doAct=k=>{const a=ACTS[k];if(!a)return;act=a;actT=0;tx=x;ty=y;if(a.say)say(a.say,Math.min(2.4,a.d))};
    const wander=()=>{const b=bounds();tx=b.x0+Math.random()*Math.max(0,b.x1-b.x0);ty=b.y0+Math.random()*Math.max(0,b.y1-b.y0)};
    const reset=()=>{root.position.y=0;P.torso.position.y=1.02;root.rotation.set(0,face,0);P.torso.rotation.set(0,0,0);P.head.rotation.set(0,0,0);B.closed=0;
      P.arms[0].rotation.set(0,0,-.3);P.arms[1].rotation.set(0,0,.3);P.legs[0].rotation.set(0,0,0);P.legs[1].rotation.set(0,0,0)};
    function frame(now){if(stopped)return;requestAnimationFrame(frame);if(document.hidden){last=now;return}
      const dt=Math.min(.1,(now-last)/1000);last=now;acc+=dt;if(acc<1/30)return;const t=acc;acc=0;
      reset();const dx=tx-x,dy=ty-y,dist=Math.hypot(dx,dy);
      if(act){actT+=t;const p=Math.min(1,actT/act.d);act.f(p,B);if(p>=1){act=null;next=2+Math.random()*4}}
      else if(dist>2){const sp=70*t,k=Math.min(1,sp/dist);x+=dx*k;y+=dy*k;
        const want=Math.abs(dx)>4?(dx>0?.9:-.9):0;face+=(want-face)*Math.min(1,t*6);root.rotation.y=face;
        const w=Math.sin(now/110);P.legs[0].rotation.x=.6*w;P.legs[1].rotation.x=-.6*w;P.arms[0].rotation.x=-.5*w;P.arms[1].rotation.x=.5*w;root.position.y=Math.abs(Math.cos(now/110))*.08}
      else{face+=(0-face)*Math.min(1,t*4);root.rotation.y=face;P.torso.position.y=1.02+.015*Math.sin(now/500);
        next-=t;if(next<=0){if(Math.random()<.45){wander();next=1}else doAct(IDLE_ACTS[Math.random()*IDLE_ACTS.length|0])}}
      blinkT-=t;const bl=blinkT<0?1:0;if(blinkT<-.12)blinkT=2+Math.random()*3;for(const e of P.eyes)e.scale.y=B.closed?.15:bl?.1:1;
      if(bubT>0){bubT-=t;if(bubT<=0)bub.style.opacity=0}
      const b=bounds();x=Math.min(Math.max(x,b.x0),Math.max(b.x0,b.x1));y=Math.min(Math.max(y,b.y0),Math.max(b.y0,b.y1));
      box.style.transform=`translate(${x|0}px,${y|0}px)`;rd.render(sc,cam)}
    requestAnimationFrame(frame);
    // 點到小人：做一個動作（不攔截點擊，後面的按鈕照常可以按）
    const tap=e=>{const r=box.getBoundingClientRect(),px=e.clientX,py=e.clientY;if(px<r.left+20||px>r.right-20||py<r.top+15||py>r.bottom)return;
      doAct(IDLE_ACTS[Math.random()*IDLE_ACTS.length|0])};
    document.addEventListener("pointerdown",tap,true);
    const onCall=e=>{const s=e.detail;if(s==="將軍")doAct("shock");else if(s==="吃"){doAct("cheer");say("吃！",1.4)}};
    window.addEventListener("xq-call",onCall);
    return{act:doAct,say,stop(){stopped=true;document.removeEventListener("pointerdown",tap,true);window.removeEventListener("xq-call",onCall);try{rd.dispose()}catch(e){}box.remove()}}}
  window.XQBot3D={start,acts:Object.keys(ACTS)};
})();
