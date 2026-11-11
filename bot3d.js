// 3D 象棋小人（意見回饋 159、161）：圓滾滾的「帥」棋子身體＋頭、手、腳，在畫面上自由走動、做手勢、說話
// - 小人身上有一塊可以點的區域：點到小人不會按到後面的按鈕；可以拖到任何地方，放下就停在那裡（雙擊再出去走走）
// - 300 種動作＝24 種手部動作 × 13 種身體動作組合，每種配一句話；另外有 12 個精修的招牌動作和吃子、將軍的反應
// - 外觀：深色輪廓線（反面外殼）、亮面烤漆、金邊、木紋、三點打光＋背光
(function(){
  const T=window.THREE;if(!T)return;
  const W0=124,H0=156,TAU=Math.PI*2,PI=Math.PI,ease=p=>p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2,wv=(p,n)=>Math.sin(p*TAU*n),bell=p=>Math.sin(p*PI);
  const store={get(k,d){try{const v=localStorage.getItem("m_"+k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem("m_"+k,JSON.stringify(v))}catch(e){}}};
  // ---------- 貼圖 ----------
  function cv(n,f){const c=document.createElement("canvas");c.width=c.height=n;f(c.getContext("2d"),n);const t=new T.CanvasTexture(c);if(T.SRGBColorSpace)t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;return t}
  // 朝代造型（意見回饋 163）：身體漆色、邊框、字色、帽子、鞋子；正面的「帥」用該朝代的字體（App 已下載的朝代字形）
  const TH={
    classic:{body:"#C08850",tex:1,rim:"#E3B341",ring:"#9E1B15",ink:"#B3141B",hat:"cap",hc:"#D02A1F",shoe:"#D02A1F"},
    qin:{body:"#2B2420",rim:"#B98A45",ring:"#C42A22",ink:"#C42A22",hat:"mian",hc:"#151515",shoe:"#151515"},
    han:{body:"#8E1F17",rim:"#1A1210",ring:"#1A1210",ink:"#9A2F20",hat:"jinxian",hc:"#1a1a1a",shoe:"#1a1210"},
    sanguo:{body:"#5E6B73",metal:1,rim:"#C9973F",ring:"#2F5D7C",ink:"#B5381F",hat:"helmet",hc:"#6c747c",shoe:"#3a3f44"},
    weijin:{body:"#7FA06A",rim:"#3E5A2E",ring:"#4E6B3A",ink:"#B3261E",hat:"scholar",hc:"#3c4a3a",shoe:"#3c4a3a"},
    nanbei:{body:"#C9A877",rim:"#2F6F6A",ring:"#2F6F6A",ink:"#A8321F",hat:"lotus",hc:"#E3B341",shoe:"#7a4a2a"},
    sui:{body:"#9DB3C2",rim:"#22394A",ring:"#22394A",ink:"#B3261E",hat:"sui",hc:"#1d2a33",shoe:"#22394A"},
    tang:{body:"#D98E2E",tex:1,rim:"#2E7D5B",ring:"#2E7D5B",ink:"#8E1010",hat:"futou",hc:"#1a1a1a",shoe:"#2E7D5B"},
    wudai:{body:"#23395B",rim:"#C9A24A",ring:"#C9A24A",ink:"#B3141B",hat:"wudai",hc:"#1b2740",shoe:"#C9A24A"},
    song:{body:"#9CC5B3",rim:"#3E7F6E",ring:"#3E7F6E",ink:"#B3141B",hat:"zhanjiao",hc:"#1a1a1a",shoe:"#3E7F6E"},
    yuan:{body:"#F4F6FA",rim:"#2456A6",ring:"#2456A6",ink:"#2456A6",hat:"fur",hc:"#2456A6",shoe:"#2456A6"},
    ming:{body:"#B3261E",rim:"#F2C14E",ring:"#B3261E",ink:"#B3261E",hat:"wusha",hc:"#151515",shoe:"#151515"},
    qing:{body:"#5A2E1A",tex:1,rim:"#F2D27A",ring:"#C8102E",ink:"#C8102E",hat:"qing",hc:"#2a1a12",shoe:"#2a1a12"}};
  // 官階（意見回饋 171）：電腦段位（積分挑戰）新手～專2 → 九品～一品；各朝代官服顏色依史制，頂戴寶石、腰帶、補子、笏板依品級
  const grade=()=>{let p=0;try{p=(JSON.parse(localStorage.getItem("xq_cpuRate")||"null")||{}).pts||0}catch(e){}
    return p>=1500?1:p>=1150?2:p>=1000?3:p>=800?4:p>=600?5:p>=400?6:p>=200?7:p>=100?8:9};
  const GN="〇一二三四五六七八九";
  const RK=g=>window.RANKT?window.RANKT(eraK(),g):GN[g]+"品官";   /* 意見回饋 495：官階照朝代換稱號（秦軍功爵、漢秩石、三國以後九品） */
  const C={zi:"#5B2A86",fei:"#A3211A",qfei:"#C8473B",lv:"#2E6B3F",qlv:"#5C9A5A",qing:"#1F4E8C",qqing:"#5B8FC7",hei:"#1E1A18",shiqing:"#1F2A44"};
  const ROBE={   // 1~9 品的官服顏色
    qin:g=>g<=3?"#3a2a4a":g<=6?"#1f3a3a":"#1E1A18",                       // 秦尚黑，高官綬帶偏紫、中級偏青
    han:g=>g<=3?"#4a1f5a":g<=6?"#1f4a4a":"#2a1a14",                       // 漢：紫綬、青綬、黑綬
    sanguo:g=>g<=3?"#C9A24A":g<=6?"#C0C6CC":"#5E6B73",                    // 三國：金甲、銀甲、鐵甲
    weijin:g=>g<=3?C.zi:g<=5?C.fei:C.lv, nanbei:g=>g<=3?C.zi:g<=5?C.fei:C.lv, sui:g=>g<=5?C.zi:g<=7?C.fei:C.lv,
    tang:g=>[C.zi,C.zi,C.zi,C.fei,C.qfei,C.lv,C.qlv,C.qing,C.qqing][g-1], wudai:g=>[C.zi,C.zi,C.zi,C.fei,C.qfei,C.lv,C.qlv,C.qing,C.qqing][g-1],
    song:g=>g<=4?C.zi:g<=6?C.fei:C.lv, yuan:g=>g<=5?C.zi:g<=7?C.fei:C.lv, ming:g=>g<=4?C.fei:g<=7?C.qing:C.lv, qing:()=>C.shiqing};
  const BEAD=["#D0021B","#E8573A","#1F5BD6","#2A3F8F","#E8F4FF","#F4F1E8","#E3B341","#C9A24A","#B8B8B8"];    // 清代頂戴：紅寶石、珊瑚、藍寶石、青金石、水晶、硨磲、素金、陰紋金、陽紋金
  const BELT=["#E8EFE6","#8A5A3A","#E3B341","#D4A640","#D8DDE3","#B9C0C8","#B9C0C8","#2A2420","#2A2420"];    // 明代腰帶：玉、犀、金花、素金、銀花、素銀、烏角
  const BUZI="鶴雞雀雁鷴鷺鶒鸝鶉";   // 明清文官補子：仙鶴、錦雞、孔雀、雲雁、白鷴、鷺鷥、鸂鶒、黃鸝、鵪鶉
  const plaqueTex=(ch,bg,fg)=>cv(128,(g,n)=>{g.fillStyle=bg;g.fillRect(0,0,n,n);g.strokeStyle=fg;g.lineWidth=8;g.strokeRect(6,6,n-12,n-12);
    g.fillStyle=fg;g.font='900 76px "Noto Serif TC","PMingLiU","Songti TC",serif';g.textAlign="center";g.textBaseline="middle";g.fillText(ch,n/2,n/2+5)});
  // 小人的身體可以換成其他棋子（意見回饋 193）：紅方 帥仕相俥傌炮兵、黑方 將士象車馬砲卒；名字跟著變成「小X」
  const BP=()=>{const c=store.get("botPiece","帥");return typeof c==="string"&&c.length===1&&"帥仕相俥傌炮兵將士象車馬砲卒".includes(c)?c:"帥"};
  const BLACK=c=>"將士象車馬砲卒".includes(c),BNAME=()=>"小"+({俥:"車",傌:"馬",砲:"炮"}[BP()]||BP())+(store.get("pSex","m")==="f"?"妹":"");
  let PCO=null;const PC=()=>PCO||BP();
  const eraK=()=>{const k=store.get("era","classic");return TH[k]?k:"classic"};
  const faceTex=(ch,th,k)=>cv(512,(g,n)=>{const h=n/2;
    let gr=g.createRadialGradient(h*.8,h*.7,10,h,h,h);gr.addColorStop(0,"#FFF8E6");gr.addColorStop(.75,"#F2DCAE");gr.addColorStop(1,"#D9B577");g.fillStyle=gr;g.beginPath();g.arc(h,h,h,0,TAU);g.fill();
    g.strokeStyle=th.ring;g.lineWidth=16;g.beginPath();g.arc(h,h,h*.8,0,TAU);g.stroke();g.lineWidth=4;g.beginPath();g.arc(h,h,h*.72,0,TAU);g.stroke();
    const gp=typeof GLY!=="undefined"&&GLY[k]&&GLY[k][ch];
    if(gp&&window.Path2D){const P2=new Path2D(gp),sc=2.9;g.save();g.translate(h-50*sc+5,h-50*sc+8);g.scale(sc,sc);g.fillStyle="rgba(90,40,10,.35)";g.fill(P2);g.restore();
      g.save();g.translate(h-50*sc,h-50*sc);g.scale(sc,sc);g.fillStyle=th.ink;g.fill(P2);g.strokeStyle=th.ink;g.lineWidth=1.8;g.lineJoin="round";g.stroke(P2);g.restore();return}
    g.font='900 250px "Noto Serif TC","PMingLiU","Songti TC","SimSun",serif';g.textAlign="center";g.textBaseline="middle";
    g.fillStyle="rgba(90,40,10,.35)";g.fillText(ch,h+5,h+14);g.fillStyle=th.ink;g.fillText(ch,h,h+8)});
  const woodTex=()=>cv(256,(g,n)=>{g.fillStyle="#B07740";g.fillRect(0,0,n,n);for(let i=0;i<70;i++){g.strokeStyle=`rgba(${60+Math.random()*40|0},${30+Math.random()*20|0},10,${.08+Math.random()*.15})`;g.lineWidth=1+Math.random()*3;
    g.beginPath();const y=Math.random()*n;g.moveTo(0,y);for(let x=0;x<=n;x+=16)g.lineTo(x,y+Math.sin(x/30+i)*4);g.stroke()}});
  // ---------- 造型 ----------
  /* 意見回饋 425：nv＝園子路人的外觀（hat 帽子／頭髮樣式、hc 帽子或頭髮顏色、robe 衣服顏色、band 頭帶顏色、acc 髮簪／花的顏色、shoe 鞋子）；路人沒有官階的寶石、補子、笏板 */
  function build(k,gr,nv){let th=TH[k]||TH.classic;gr=gr||grade();if(nv)th=Object.assign({},th,{hat:nv.hat||"cap",hc:nv.hc||"#3a2a1e",shoe:nv.shoe||"#3a2a1e",top:nv.top,pin:nv.pin,band2:nv.band2});const robe=nv?nv.robe||th.body:ROBE[k]?ROBE[k](gr):null;
    const bot=new T.Group();
    const P=(c,o)=>new T.MeshPhysicalMaterial(Object.assign({color:c,roughness:.45,metalness:0,clearcoat:.6,clearcoatRoughness:.25},o||{}));
    const INK=new T.MeshBasicMaterial({color:0x3a2010,side:T.BackSide});
    const add=(parent,geo,mat,pos,o)=>{const m=new T.Mesh(geo,mat);if(pos)m.position.set(...pos);parent.add(m);
      if(!(o&&o.noLine)){const l=new T.Mesh(geo,INK);l.scale.setScalar(1+((o&&o.line)||.06));m.add(l)}return m};
    const metalRobe=k==="sanguo"&&!nv;
    const wood=robe?P(robe,{metalness:metalRobe?.6:0,roughness:metalRobe?.3:.5,clearcoat:.9}):P(th.body,Object.assign(th.tex?{map:woodTex()}:{},th.metal?{metalness:.55}:{},{roughness:th.metal?.35:.5,clearcoat:.9})),skin=P(nv&&nv.skin||"#FBE9CC",{roughness:.6,clearcoat:.15,sheen:.5,sheenColor:new T.Color("#ffd9b0")}),
      red=P(th.shoe,{clearcoat:1,roughness:.3}),hatM=P(th.hc,{clearcoat:1,roughness:.3}),gold=P(th.rim,{metalness:.75,roughness:.28}),bead=P("#E3B341",{metalness:.75,roughness:.28}),dark=P("#1E120C",{clearcoat:1,roughness:.15}),
      white=new T.MeshBasicMaterial({color:0xffffff}),pink=new T.MeshBasicMaterial({color:0xF59A9A,transparent:true,opacity:.75}),mouthM=P("#7A1A14",{roughness:.6});
    // 身體＝一顆厚棋子＋金邊＋正面「帥」
    const torso=new T.Group();torso.position.y=1.02;bot.add(torso);
    const body=add(torso,new T.CylinderGeometry(.8,.8,.46,64),wood,null,{line:.035});body.rotation.x=PI/2;
    for(const z of[.23,-.23]){const r=new T.Mesh(new T.TorusGeometry(.79,.035,12,64),gold);r.position.z=z;torso.add(r)}
    const face=new T.Mesh(new T.CircleGeometry(.64,64),P("#fff",{map:faceTex(PC(),BLACK(PC())?Object.assign({},th,{ink:"#1A1410"}):th,k),roughness:.4,clearcoat:.8,toneMapped:false}));face.position.z=.232;torso.add(face);
    // 頭
    const head=new T.Group();head.position.y=.8;torso.add(head);
    add(head,new T.SphereGeometry(.52,40,30),skin,[0,.14,0],{line:.05});
    const eyes=[],mouthG=new T.Group();mouthG.position.set(0,.03,.5);head.add(mouthG);
    for(const s of[-1,1]){const eg=new T.Group();eg.position.set(.18*s,.2,.45);head.add(eg);
      const sc=new T.Mesh(new T.SphereGeometry(.1,20,14),white);sc.scale.set(1,1.15,.5);eg.add(sc);
      const pu=new T.Mesh(new T.SphereGeometry(.072,20,14),dark);pu.position.set(0,-.005,.04);pu.scale.set(1,1.1,.6);eg.add(pu);
      const hl=new T.Mesh(new T.SphereGeometry(.024,8,8),white);hl.position.set(.025,.035,.085);eg.add(hl);
      const br=new T.Mesh(new T.CapsuleGeometry(.018,.09,4,8),dark);br.rotation.z=PI/2;br.position.set(0,.15,.02);eg.add(br);eyes.push({g:eg,brow:br,s});
      const ck=new T.Mesh(new T.CircleGeometry(.075,20),pink);ck.position.set(.31*s,.04,.445);ck.rotation.y=.55*s;head.add(ck)}
    const smile=new T.Mesh(new T.TorusGeometry(.085,.02,8,20,PI),dark);smile.rotation.z=PI;mouthG.add(smile);
    const open=new T.Mesh(new T.SphereGeometry(.07,16,12),mouthM);open.scale.set(1,.8,.4);open.visible=false;mouthG.add(open);
    const tear=new T.Mesh(new T.SphereGeometry(.045,12,10),new T.MeshPhysicalMaterial({color:0x7fc4ff,transparent:true,opacity:.85,clearcoat:1,roughness:.05}));tear.scale.set(.7,1,.6);tear.visible=false;head.add(tear);
    // 帽子：各朝代不同（放在自己的群組，脫帽動作用）
    const hatG=new T.Group();head.add(hatG);
    const Cy=(rt,rb,h,m,pos,o)=>add(hatG,new T.CylinderGeometry(rt,rb,h,40),m,pos,o||{line:.08}),Sp=(r,m,pos,sc,o)=>{const x=add(hatG,new T.SphereGeometry(r,20,14),m,pos,o);if(sc)x.scale.set(...sc);return x},
      Bx=(w,h,d,m,pos,o)=>add(hatG,new T.BoxGeometry(w,h,d),m,pos,o||{line:.04}),redM=P("#C8102E",{clearcoat:1,roughness:.3});
    switch(th.hat){
      case"mian":{   /* QA P3-4：冕冠原本只是一片平的黑板，從後上方看像破面。改成有厚度的綖板（上黑下紅、金邊、前低後高），前後各垂一排旒珠，加一根橫穿的金笄 */
        Cy(.2,.22,.16,hatM,[0,.68,0]);const pl=new T.Group();pl.position.set(0,.8,0);pl.rotation.x=.12;hatG.add(pl);
        const top=add(pl,new T.BoxGeometry(.95,.05,.52),hatM,[0,.025,0],{line:.04}),und=add(pl,new T.BoxGeometry(.93,.03,.5),redM,[0,-.015,0],{noLine:1});
        for(const z of[.265,-.265])add(pl,new T.BoxGeometry(.97,.03,.025),gold,[0,.035,z],{noLine:1});for(const x of[.485,-.485])add(pl,new T.BoxGeometry(.025,.03,.55),gold,[x,.035,0],{noLine:1});
        for(const z of[.25,-.25])for(let x=-.4;x<=.41;x+=.1){const n=z>0?4:3;for(let k=0;k<n;k++)add(pl,new T.SphereGeometry(.026,12,10),bead,[x,-.06-k*.06,z],{noLine:1})}
        const pin=add(hatG,new T.CylinderGeometry(.018,.018,.62,12),gold,[0,.67,0],{noLine:1});pin.rotation.z=PI/2;break}
      case"jinxian":{Cy(.3,.33,.1,hatM,[0,.62,0]);const b=Bx(.14,.34,.44,hatM,[0,.8,-.02]);b.rotation.x=-.45;break}
      case"helmet":{add(hatG,new T.SphereGeometry(.57,32,16,0,TAU,0,PI/2),P(th.hc,{metalness:.6,roughness:.35}),[0,.18,0],{line:.04});
        add(hatG,new T.TorusGeometry(.56,.035,10,40),bead,[0,.2,0],{noLine:1}).rotation.x=PI/2;Cy(.02,.06,.22,bead,[0,.85,0]);Sp(.1,redM,[0,1,0],[1,1.3,1]);break}
      case"scholar":Sp(.5,hatM,[0,.42,-.03],[1,.6,1.02],{line:.04});Sp(.14,hatM,[0,.78,-.05]);for(const s of[-1,1]){const r=Bx(.06,.4,.02,hatM,[.12*s,.45,-.5]);r.rotation.z=.15*s}break;
      case"lotus":Cy(.22,.25,.08,bead,[0,.64,0]);for(let i=0;i<8;i++){const a=i/8*TAU,c=add(hatG,new T.ConeGeometry(.07,.22,10),bead,[Math.cos(a)*.17,.75,Math.sin(a)*.17],{noLine:1});c.rotation.z=-Math.cos(a)*.35;c.rotation.x=Math.sin(a)*.35}Sp(.06,redM,[0,.82,0]);break;
      case"sui":Cy(.3,.3,.18,hatM,[0,.66,0]);add(hatG,new T.TorusGeometry(.3,.025,8,40),bead,[0,.62,0],{noLine:1}).rotation.x=PI/2;break;
      case"futou":Sp(.42,hatM,[0,.56,-.02],[1,.62,1],{line:.04});Sp(.16,hatM,[0,.82,-.05]);for(const s of[-1,1]){const t=add(hatG,new T.CapsuleGeometry(.04,.36,4,8),hatM,[.14*s,.38,-.48]);t.rotation.x=.3}break;
      case"wudai":Cy(.26,.3,.16,hatM,[0,.66,0]);Sp(.07,P("#ffffff",{clearcoat:1,roughness:.1}),[0,.78,0]);break;
      case"zhanjiao":Cy(.3,.32,.22,hatM,[0,.68,0]);Bx(1.9,.03,.06,hatM,[0,.7,-.12]);break;
      case"fur":add(hatG,new T.TorusGeometry(.38,.11,12,40),P("#7a5230",{roughness:.9,clearcoat:0}),[0,.58,0],{noLine:1}).rotation.x=PI/2;Cy(.28,.36,.22,hatM,[0,.72,0]);Sp(.07,redM,[0,.86,0]);break;
      case"wusha":Cy(.3,.33,.24,hatM,[0,.68,0]);Sp(.2,hatM,[0,.82,-.12]);for(const s of[-1,1])Sp(.25,hatM,[.52*s,.74,-.14],[1,.5,.12],{line:.08});break;
      case"qing":Cy(.42,.5,.08,hatM,[0,.58,0]);Cy(.08,.34,.2,redM,[0,.72,0]);Sp(.07,bead,[0,.86,0]);break;
      /* 意見回饋 425：路人的頭髮、頭巾、方巾（頭的球心在 y .14、半徑 .52；頭髮蓋住頭頂、前緣往後翹，不擋眉毛） */
      case"hair":case"bun":case"buns":case"flower":{const hair=add(hatG,new T.SphereGeometry(.55,32,16,0,TAU,0,PI*.4),hatM,[0,.15,-.04],{line:.03});hair.rotation.x=-.42;
        if(th.hat==="bun")Sp(.19,hatM,[0,.66,-.3]);
        if(th.hat==="buns")for(const s of[-1,1])Sp(.14,hatM,[.27*s,.72,-.04]);
        if(th.hat==="flower"){for(const s of[-1,1]){const b=add(hatG,new T.CapsuleGeometry(.06,.42,4,8),hatM,[.36*s,-.12,-.3],{line:.08});b.rotation.z=.12*s}
          const fl=P(nv&&nv.acc||"#F07AA0",{clearcoat:.8,roughness:.4});for(let i=0;i<5;i++){const a=i/5*TAU;Sp(.06,fl,[.34+Math.cos(a)*.07,.52+Math.sin(a)*.07,.22],null,{noLine:1})}Sp(.045,P("#F2D27A"),[.34,.52,.25],null,{noLine:1})}
        if(nv&&nv.acc&&th.hat==="bun"){const pin=add(hatG,new T.CapsuleGeometry(.025,.5,4,8),P(nv.acc,{roughness:.5}),[0,.7,-.32],{line:.1});pin.rotation.z=PI/2-.3}break}
      /* 意見回饋 471（開發者：照畫好的頭像做 3D）：少年阿古拉——白色毛皮帽、耳邊兩條辮子 */
      case"agula":case"qfur":{const fur=P("#F6F3EC",{roughness:.95,clearcoat:0,sheen:1,sheenColor:new T.Color("#ffffff")}),hairM=P("#1E1A16",{roughness:.55,clearcoat:.4});
        const bh=add(hatG,new T.SphereGeometry(.5,32,20),hairM,[0,.12,-.1],{noLine:1});bh.scale.set(1.03,.95,.78);   /* 帽子下、頭兩側和後面的黑髮 */
        add(hatG,new T.SphereGeometry(.5,32,16,0,TAU,0,PI*.5),fur,[0,.52,-.03],{line:.03}).scale.set(1,.8,1);
        const rim=add(hatG,new T.TorusGeometry(.5,.12,14,48),fur,[0,.55,-.02],{line:.04});rim.rotation.x=PI/2-.1;
        for(let i=0;i<40;i++){const a=i/40*TAU,r=.62+Math.random()*.03;Sp(.055+Math.random()*.03,fur,[Math.cos(a)*r,.56+Math.random()*.05-Math.sin(a)*.05,Math.sin(a)*r-.02],null,{noLine:1})}
        for(let i=0;i<34;i++){const u=Math.random()*TAU,v=.15+Math.random()*1.1;Sp(.06+Math.random()*.03,fur,[Math.cos(u)*.46*Math.sin(v),.54+Math.cos(v)*.32,Math.sin(u)*.46*Math.sin(v)-.03],null,{noLine:1})}
        for(let i=0;i<5;i++)Sp(.04,fur,[(Math.random()-.5)*.12,.93+i*.012,(Math.random()-.5)*.1],null,{noLine:1});
        for(const s of[-1,1]){for(let j=0;j<6;j++)Sp(.058-.005*j,hairM,[.5*s,.06-j*.085,.04],[1,1.2,1],{line:.12});Sp(.035,redM,[.5*s,-.46,.04],null,{noLine:1})}
        break}
      /* 意見回饋 471：照每個角色畫好的頭像配的帽子／髮型（CUS 造型表） */
      case"douli":{const st=add(hatG,new T.ConeGeometry(.9,.36,40,1,true),P(th.hc,{roughness:.8,clearcoat:.1,side:T.DoubleSide}),[0,.74,0],{line:.03});Sp(.05,P(th.hc),[0,.93,0],null,{noLine:1});break}
      case"furcap":{add(hatG,new T.TorusGeometry(.5,.14,14,48),P(th.hc,{roughness:.95,clearcoat:0}),[0,.5,0],{line:.04}).rotation.x=PI/2-.08;add(hatG,new T.SphereGeometry(.46,32,16,0,TAU,0,PI*.5),P(th.top||"#5A2E1E",{roughness:.7}),[0,.5,-.02],{line:.03}).scale.set(1,.75,1);break}
      case"furtop":{const fur=P("#F6F3EC",{roughness:.95,clearcoat:0});add(hatG,new T.SphereGeometry(.46,32,16,0,TAU,0,PI*.5),P(th.hc,{roughness:.5,clearcoat:.4}),[0,.52,-.02],{line:.03}).scale.set(1,.95,1);
        add(hatG,new T.TorusGeometry(.5,.13,14,48),fur,[0,.52,0],{line:.04}).rotation.x=PI/2-.08;Sp(.07,redM,[0,.98,0]);break}
      case"bandana":{Sp(.53,hatM,[0,.3,-.03],[1.02,.72,1.02],{line:.04});Sp(.1,hatM,[.36,.4,-.36]);for(const k of[0,1]){const t=Bx(.1,.32,.03,hatM,[.42+k*.06,.24,-.42]);t.rotation.z=.6+k*.4}break}
      case"kerchief":{const kc=add(hatG,new T.SphereGeometry(.57,32,16,0,TAU,0,PI*.56),hatM,[0,.16,-.05],{line:.04});kc.rotation.x=-.55;const tri=add(hatG,new T.ConeGeometry(.32,.5,3),hatM,[0,-.05,-.5],{line:.05});tri.rotation.x=PI;Sp(.07,hatM,[0,-.36,.4]);break}
      case"topknot":{const hair=add(hatG,new T.SphereGeometry(.55,32,16,0,TAU,0,PI*.42),hatM,[0,.15,-.04],{line:.03});hair.rotation.x=-.36;Sp(.16,hatM,[0,.78,-.08]);if(th.pin)add(hatG,new T.CapsuleGeometry(.018,.4,4,8),P(th.pin,{metalness:.5,roughness:.3}),[0,.8,-.08],{noLine:1}).rotation.z=PI/2;break}
      case"felt":Cy(.44,.5,.42,hatM,[0,.62,-.02]);Sp(.44,hatM,[0,.82,-.02],[1,.25,1],{noLine:1});break;
      case"sunhat":{Cy(.95,.98,.04,hatM,[0,.56,0],{line:.03});Sp(.4,hatM,[0,.56,-.02],[1,.6,1]);if(th.band2)add(hatG,new T.TorusGeometry(.4,.04,8,40),P(th.band2),[0,.62,0],{noLine:1}).rotation.x=PI/2;break}
      case"liangba":{const hair=add(hatG,new T.SphereGeometry(.55,32,16,0,TAU,0,PI*.42),hatM,[0,.15,-.04],{line:.03});hair.rotation.x=-.36;Bx(1.1,.24,.18,hatM,[0,.82,-.1]);
        const fl=P("#F07AA0",{clearcoat:.8,roughness:.4});for(const x of[-.42,.42])for(let i=0;i<5;i++){const a=i/5*TAU;Sp(.055,fl,[x+Math.cos(a)*.06,.86+Math.sin(a)*.06,.0],null,{noLine:1})}break}
      case"none":break;
      case"scarf":Sp(.5,hatM,[0,.42,-.04],[1.04,.6,1.04],{line:.04});Sp(.11,hatM,[0,.42,-.52]);for(const s of[-1,1]){const t=Bx(.09,.3,.025,hatM,[.08*s,.24,-.55]);t.rotation.z=.25*s}break;
      case"fangjin":Bx(.66,.28,.66,hatM,[0,.68,-.03]);Bx(.7,.06,.7,hatM,[0,.56,-.03]);break;
      default:Cy(.25,.28,.14,hatM,[0,.66,0]);Sp(.07,bead,[0,.77,0])}
    /* 路人的頭帶（練功的大娘、挑水的少年） */
    if(nv&&nv.band){const bm=P(nv.band,{clearcoat:.6,roughness:.5}),bd=add(hatG,new T.TorusGeometry(.48,.04,10,48),bm,[0,.36,0],{noLine:1});bd.rotation.x=PI/2-.32;
      for(const s of[-1,1]){const t=Bx(.08,.32,.025,bm,[.07*s,.3,-.5]);t.rotation.z=.3*s}}
    // 官階：帽前寶石（頂戴色）
    if(!nv){const gm=P(BEAD[gr-1],{metalness:gr>=7?.8:.1,roughness:.12,clearcoat:1,transmission:gr===5?.6:0,transparent:gr===5,opacity:gr===5?.85:1});
      const set=add(hatG,new T.TorusGeometry(.085,.022,8,20),bead,[0,.6,.44],{noLine:1});set.rotation.x=-.25;add(hatG,new T.SphereGeometry(.07,16,12),gm,[0,.6,.47],{line:.12});
      if(k==="qing"&&gr<=3){const f=add(hatG,new T.ConeGeometry(.09,.6,12),P("#2E7D6B",{clearcoat:1,roughness:.3}),[0,.85,-.32],{noLine:1});f.rotation.x=-1.0;f.scale.z=.35;
        add(hatG,new T.SphereGeometry(.06,12,10),P("#1F5BD6",{clearcoat:1}),[0,1.05,-.55],{noLine:1})}}
    // 官階：腰帶＋牌子（明清是補子鳥名，其他朝代寫品級）
    if(nv)add(torso,new T.BoxGeometry(1.42,.1,.06),P(nv.belt||"#3a2a1e",{roughness:.6,clearcoat:.3}),[0,-.46,.25],{line:.08});
    else{const bm=P(BELT[gr-1],{metalness:gr===3||gr===4?.7:.1,roughness:.3,clearcoat:1});const belt=add(torso,new T.BoxGeometry(1.42,.11,.06),bm,[0,-.46,.25],{line:.08});
      const isBz=k==="ming"||k==="qing",pl=new T.Mesh(new T.PlaneGeometry(.3,.3),P("#fff",{map:plaqueTex(isBz?BUZI[gr-1]:GN[gr],isBz?"#24345a":"#7a1a14","#F2D27A"),roughness:.4,clearcoat:.6,toneMapped:false}));
      pl.position.set(0,-.46,.29);torso.add(pl)}
    // 手
    const arms=[];for(const s of[-1,1]){const sh=new T.Group();sh.position.set(.82*s,.14,0);torso.add(sh);
      add(sh,new T.CapsuleGeometry(.105,.32,8,16),skin,[0,-.27,0],{line:.12});add(sh,new T.SphereGeometry(.15,20,14),skin,[0,-.56,0],{line:.09});
      if(s===1&&!nv){const hu=add(sh,new T.BoxGeometry(.09,.5,.025),P(gr<=5?"#F2EAD6":"#8A6A44",{roughness:.35,clearcoat:.8}),[0,-.62,.16],{line:.1});hu.rotation.x=-.35}   // 笏板：五品以上象牙、六品以下木
      arms.push(sh)}
    // 腳
    const legs=[];for(const s of[-1,1]){const hp=new T.Group();hp.position.set(.3*s,.6,0);bot.add(hp);
      add(hp,new T.CapsuleGeometry(.12,.18,8,16),skin,[0,-.2,0],{line:.1});const f=add(hp,new T.SphereGeometry(.17,20,14),red,[0,-.43,.06],{line:.09});f.scale.set(1,.6,1.35);legs.push(hp)}
    if(nv&&nv.cus&&typeof nv.cus==="object")try{cusApply(nv.cus,{bot,torso,head,hatG,eyes,arms,legs,P,add,mouthG})}catch(e){}
    return{bot,torso,head,hat:hatG,eyes,mouth:{smile,open},tear,arms,legs}}

  /* 意見回饋 471：71 位角色的 Q 版造型表（照 data/journey、people、champ、actors、npc 的立繪配的）。j 故事人物、p 人物表、c 擂主、a 驛站旅人／秘境棋友、n 園子路人 */
  const CUS={"j:agula_young":{"hat":"qfur","hair":"#1E1A16","hs":"braids","brow":"thick","ring":"#C9953E","sl":"#1B3E78","gl":"#FFFFFF","lg":"#2A3F66","sk":"#1B3E78","trim":"#FFFFFF","belt":"#7A4A24","buckle":1,"strap":1,"shoe":"#1E1A16"},"j:boatman":{"hat":"douli","hc":"#C9A86A","hair":"#D8D6D0","beard":"goatee","bc":"#E8E6E0","glasses":1,"skin":"#F2D2B0","ring":"#C9953E","sl":"#8A9AA6","gl":"#FFFFFF","sk":"#8A9AA6","belt":"#6A5A4A","prop":"pipe","prop2":"gourd"},"j:liu_old":{"hat":"topknot","hc":"#E8E6E0","hair":"#E8E6E0","hs":"long","beard":"long","bc":"#EDEBE6","brow":"white","ring":"#C9953E","sl":"#9AA4A8","gl":"#FFFFFF","sk":"#9AA4A8","prop2":"umbrella","shoe":"#3A3A3A"},"j:liu_young":{"hat":"bandana","hc":"#2F5D8A","hair":"#1E1A16","brow":"thick","skin":"#F2C9A0","ring":"#C9953E","sl":"#8A7A6A","gl":"#9A8A6A","lg":"#8A7A62","prop":"pole","shoe":"#B08A5A"},"j:scholar":{"hat":"fangjin","hc":"#151515","hair":"#1E1A16","glasses":1,"ring":"#C9953E","sl":"#F5F3EE","gl":"#FFFFFF","sk":"#F0F0F5","lg":"#6A4E9A","prop":"fan"},"j:shen_young":{"hat":"hair","hc":"#1E1A16","ring":"#C9953E","sl":"#F5F3EE","sk":"#8FB3B0","prop":"towel","prop2":"broom"},"p:agula":{"hat":"qfur","hair":"#E8E6E0","beard":"full","bc":"#E8E6E0","brow":"white","skin":"#E89A86","ring":"#A8A070","sl":"#C9C2B0","gl":"#FFFFFF","sk":"#3E6FA8","belt":"#7A4A24"},"p:b1p_aji":{"hat":"hair","hc":"#1E1A16","hair":"#1E1A16","hs":"braid1","skin":"#F2C9A0","ring":"#9A6A3A","sl":"#7A8FA8","gl":"#8A7A62","lg":"#5A3A2A","sash":"#C9A86A","prop":"piece","shoe":"#B08A5A"},"p:b1p_bateer":{"hat":"furcap","hc":"#2A2622","top":"#5A2E1E","beard":"goatee","mus":1,"bc":"#3A3A3A","brow":"angry","ring":"#9A6A3A","sl":"#5A3A26","gl":"#6A5A4A","sk":"#5A3A26","belt":"#4A2A18","buckle":1,"prop":"whip","prop2":"sword","shoe":"#1E1A16"},"p:b1p_changyuchun":{"hat":"topknot","hc":"#1E1A16","beard":"full","bc":"#1E1A16","brow":"angry","ring":"#9A6A3A","armor":"#8A9098","sl":"#8E2A22","gl":"#6A5A4A","sk":"#8E2A22","prop":"drum","prop2":"helmet","shoe":"#1E1A16"},"p:b1p_chenbo":{"hat":"topknot","hc":"#3A3A3A","band":"#2A2A2A","beard":"goatee","bc":"#8A8A8A","ring":"#9A6A3A","sl":"#3A5A7A","gl":"#8A7A62","lg":"#3A4A5A","belt":"#6A4A2A","prop":"axe"},"p:b1p_fangtingtao":{"hat":"topknot","hc":"#9A9A9A","ring":"#9A6A3A","sl":"#E8DCC8","sk":"#2A2A2A","belt":"#1E1A16","sash":"#1E1A16","prop":"hammer","prop2":"fan"},"p:b1p_gegu":{"hat":"topknot","hc":"#1E1A16","ring":"#9A6A3A","lg":"#5A6A7A","prop":"drum"},"p:b1p_huolang":{"hat":"sunhat","hc":"#4A3A2A","skin":"#C9A080","ring":"#6A5A4A","sl":"#6A6A5A","gl":"#8A7A62","lg":"#5A5A4A","sash":"#8A7A5A","prop":"pole","prop2":"drum"},"p:b1p_jiabanbu":{"hat":"topknot","hc":"#1E1A16","ring":"#9A6A3A","sl":"#9A948A","lg":"#2A2A2A","sk":"#9A948A","prop":"scroll"},"p:b1p_jiabanbu_old":{"hat":"hair","hc":"#E8E6E0","brow":"white","ring":"#9A6A3A","sl":"#7A7468","gl":"#8A7A62","lg":"#9A9A8A","prop":"potato"},"p:b1p_jiayizhuo":{"hat":"topknot","hc":"#1E1A16","ring":"#9A6A3A","sl":"#7A8FA8","gl":"#8A7A62","lg":"#6A7A8A","prop":"piece"},"p:b1p_jingyin":{"hat":"hair","hc":"#E8E6E0","ring":"#9A6A3A","sl":"#8A8A7A","lg":"#B8B8B0","prop":"bowl"},"p:b1p_laohan":{"hat":"bandana","hc":"#6A4A2A","skin":"#F2C9A0","ring":"#9A6A3A","sl":"#C84A2A","ap":"#F0EDE6","lg":"#E8E2D4","prop":"broom"},"p:b1p_lata_daoren":{"hat":"topknot","hc":"#2A2A2A","hair":"#2A2A2A","hs":"long","beard":"full","bc":"#1E1A16","ring":"#9A6A3A","sl":"#C8C8C0","sk":"#C8C8C0","sash":"#9A8A6A","prop":"bowl","prop2":"gourd"},"p:b1p_liubowen":{"hat":"fangjin","hc":"#151515","beard":"long","bc":"#D8D6D0","brow":"white","ring":"#9A6A3A","sl":"#8E2A22","sk":"#8E2A22","belt":"#4A2A18","prop":"scroll"},"p:b1p_qianwandou":{"hat":"sui","hc":"#4A1E1E","ring":"#9A6A3A","sl":"#D8A030","lg":"#4A2A2A","belt":"#4A2A18","prop":"abacus"},"p:b1p_qianwandou_old":{"hat":"hair","hc":"#E8E6E0","brow":"white","ring":"#9A6A3A","sl":"#C8A04A","prop":"pole","prop2":"basket"},"p:b1p_qianxiaoman":{"hat":"hair","hc":"#1E1A16","hair":"#1E1A16","hs":"buns2","ring":"#9A6A3A","sl":"#C8A04A","ap":"#F0EDE6","sash":"#6A8AB0","prop":"abacus","prop2":"piece"},"p:b1p_qinchanggeng":{"hat":"topknot","hc":"#1E1A16","beard":"long","bc":"#1E1A16","ring":"#9A6A3A","sl":"#6A6A6A","sk":"#3A4A6A","sash":"#1E1A16","prop":"piece","prop2":"book"},"p:b1p_shenwansan":{"hat":"fangjin","hc":"#151515","ring":"#9A6A3A","sl":"#2F4A9A","sk":"#2F4A9A","trim":"#E3B341","belt":"#F5F3EE","beads":"#C8A040"},"p:b1p_shinaian":{"hat":"fangjin","hc":"#151515","beard":"goatee","bc":"#D8D6D0","brow":"white","ring":"#9A6A3A","sl":"#4A4E56","sk":"#4A4E56","sash":"#1E1A16","prop":"book"},"p:b1p_wangbo":{"hat":"topknot","hc":"#9A9A9A","ring":"#9A6A3A","sl":"#C88A3A","sk":"#9A948A","belt":"#4A2A18","prop":"palmfan","prop2":"letter"},"p:b1p_wangmian":{"hat":"topknot","hc":"#E8E6E0","hair":"#E8E6E0","beard":"goatee","bc":"#E8E6E0","ring":"#9A6A3A","sl":"#E8E4D8","sk":"#E8E4D8","sash":"#B8A070","prop":"plum","prop2":"brush"},"p:b1p_wulan":{"hat":"qfur","ring":"#9A6A3A","sl":"#B8322A","sk":"#B8322A","belt":"#2A1E14","lg":"#1E1A16","shoe":"#1E1A16"},"p:b1p_yutoupo":{"hat":"kerchief","hc":"#3A5A8A","brow":"white","skin":"#F2D8C0","ring":"#9A6A3A","sl":"#5A4A3A","ap":"#E8E2D4","sk":"#2A3A5A","prop":"potato"},"p:b1p_zhaoshoutian":{"hat":"topknot","hc":"#1E1A16","band":"#7A2A2A","brow":"angry","ring":"#9A6A3A","sl":"#8A8270","lg":"#6A6658","belt":"#6A4A2A","prop":"cane"},"p:liulaogao":{"hat":"douli","hc":"#C9A86A","skin":"#A8724A","ring":"#A07A50","sl":"#7A5A3A","lg":"#8A7A6A","prop":"pole"},"p:qinxiaohe":{"hat":"hair","hc":"#1E1A16","hair":"#1E1A16","hs":"braids","tie":"#6A8AB0","ring":"#A07A50","sl":"#6A8AB0","sk":"#6A8AB0","prop":"planks"},"p:shen":{"hat":"hair","hc":"#E8E6E0","beard":"goatee","bc":"#E8E6E0","glasses":1,"brow":"white","ring":"#A07A50","sl":"#3E5A86","sk":"#3E5A86","prop":"cup"},"p:zhou":{"hat":"fangjin","hc":"#151515","glasses":1,"beard":"long","bc":"#F0EEE8","brow":"white","ring":"#A07A50","sl":"#3E9A96","sk":"#3E9A96","gl":"#FFFFFF","prop":"scroll"},"p:zhu":{"hat":"hair","hc":"#6A6A6A","ring":"#A07A50","sl":"#8A8A88","sash":"#B3141B","gl":"#FFFFFF","prop":"staff"},"c:classic":{"hat":"bandana","hc":"#8A9098","glasses":1,"beard":"long","bc":"#F0EEE8","brow":"white","ring":"#C9953E","sl":"#C8C8C0","sk":"#C8C8C0","gl":"#FFFFFF"},"c:qin":{"hat":"topknot","hc":"#2A1E14","skin":"#A8724A","beard":"goatee","mus":1,"bc":"#1E1A16","armor":"#2A2A2A","ring":"#C9953E","sl":"#2A2A2A","sk":"#5A3A8A","gl":"#FFFFFF"},"c:han":{"hat":"jinxian","hc":"#151515","beard":"goatee","mus":1,"bc":"#1E1A16","ring":"#C9953E","sl":"#8E2A22","sk":"#5A3A8A","sash":"#B3141B","gl":"#FFFFFF"},"c:sanguo":{"hat":"helmet","hc":"#8A9098","beard":"full","bc":"#5A3A2A","skin":"#E07060","brow":"angry","armor":"#8A9098","ring":"#C9953E","sl":"#8E2A22","sk":"#8E2A22","gl":"#FFFFFF"},"c:weijin":{"hat":"topknot","hc":"#8A7A6A","band":"#D8C8A8","hair":"#8A7A6A","hs":"long","ring":"#C9953E","sl":"#F5F3EE","sk":"#F5F3EE","gl":"#FFFFFF"},"c:nanbei":{"hat":"none","beads":"#4A2A1E","ring":"#C9953E","sl":"#C8902A","sk":"#C8902A","gl":"#FFFFFF"},"c:sui":{"hat":"douli","hc":"#C9A86A","skin":"#C88050","beard":"goatee","bc":"#D8D6D0","ring":"#C9953E","sl":"#6A8AA8","sk":"#2A2A2A","sash":"#6A8AA8","gl":"#FFFFFF"},"c:tang":{"hat":"wusha","hc":"#151515","glasses":1,"ring":"#C9953E","sl":"#D8642A","sk":"#D8642A","gl":"#FFFFFF"},"c:wudai":{"hat":"wusha","hc":"#151515","beard":"goatee","bc":"#E8E6E0","brow":"white","ring":"#C9953E","sl":"#F5F3EE","sk":"#3A5A7A","gl":"#FFFFFF"},"c:song":{"hat":"fangjin","hc":"#151515","skin":"#F4F4F8","col":"#7ACAD8","ring":"#C9953E","sl":"#F5F3EE","sk":"#7ACAD8","gl":"#FFFFFF"},"c:yuan":{"hat":"furtop","hc":"#3E6FA8","beard":"full","bc":"#8A8A8A","ring":"#C9953E","sl":"#3E6FA8","sk":"#F0F0F5","trim":"#3E6FA8","belt":"#1E1A16","buckle":1,"gl":"#FFFFFF"},"c:ming":{"hat":"wusha","hc":"#151515","glasses":1,"beard":"long","bc":"#E8E6E0","brow":"white","ring":"#C9953E","sl":"#B8322A","sk":"#B8322A","gl":"#FFFFFF"},"c:qing":{"hat":"liangba","hc":"#1E1A16","ring":"#C9953E","sl":"#B88AD0","sk":"#8A5AB0","col":"#C8A0E0","gl":"#F5E8D8"},"a:guard":{"hat":"bandana","hc":"#C8322A","brow":"angry","ring":"#A07A50","sl":"#5A4A3A","lg":"#5A4A3A","belt":"#6A4A2A","buckle":1,"prop":"sword","prop2":"sword"},"a:monk":{"hat":"none","beads":"#6A3A1E","ring":"#A07A50","sl":"#C8902A","sk":"#C8902A","prop":"bowl"},"a:scholar":{"hat":"scarf","hc":"#2A2A2A","ring":"#A07A50","sl":"#A8C0D8","sk":"#A8C0D8","prop":"fan","prop2":"basket"},"a:tea":{"hat":"kerchief","hc":"#3A5A8A","brow":"white","ring":"#A07A50","sl":"#2A3A5A","sk":"#2A3A5A","prop":"teapot","prop2":"cup"},"a:teller":{"hat":"sui","hc":"#1E1A16","ring":"#6A4A2A","sl":"#6A4A8A","sk":"#6A4A8A","prop":"hammer","prop2":"fan"},"a:zhangsanfeng":{"hat":"topknot","hc":"#3A3A3A","hair":"#3A3A3A","hs":"long","beard":"full","bc":"#2A2A2A","ring":"#A07A50","sl":"#C8C8C0","sk":"#C8C8C0","sash":"#9A8A6A","prop":"bowl","prop2":"gourd"},"n:amah":{"hat":"topknot","hc":"#E8E6E0","pin":"#8A5A2B","brow":"white","ring":"#A87A48","sl":"#8A3A5A","lg":"#5A4A4A","prop":"baby"},"n:daishu":{"hat":"fangjin","hc":"#151515","beard":"goatee","bc":"#1E1A16","ring":"#A87A48","sl":"#2F4A8A","sk":"#2F4A8A","prop":"brush","prop2":"letter"},"n:douhua":{"hat":"scarf","hc":"#C8B08A","ring":"#A87A48","sl":"#C8B08A","ap":"#F0EDE6","prop":"bowl","prop2":"towel"},"n:duanjin":{"hat":"topknot","hc":"#9A9A9A","band":"#C8322A","ring":"#A87A48","sl":"#C8322A","lg":"#C8322A"},"n:fengzheng":{"hat":"hair","hc":"#1E1A16","hair":"#1E1A16","hs":"buns2","ring":"#A87A48","sl":"#3E7ACA","lg":"#3A4A6A","prop":"kite"},"n:genggu":{"hat":"felt","hc":"#6A6A6A","beard":"goatee","bc":"#8A8A8A","ring":"#A87A48","sl":"#6A6A6A","sk":"#6A6A6A","prop":"lantern","prop2":"staff"},"n:maihua":{"hat":"sunhat","hc":"#D8B880","band2":"#8A6AC8","hair":"#3A2A1E","hs":"braids","tie":"#F07AA0","ring":"#A87A48","sl":"#F0A0B8","prop":"flowers"},"n:mujiang":{"hat":"fangjin","hc":"#6A4A3A","brow":"angry","ring":"#A87A48","sl":"#8A6A4A","lg":"#6A5A4A","prop":"planks"},"n:niao":{"hat":"scarf","hc":"#6A4A3A","beard":"full","bc":"#E8E6E0","brow":"white","ring":"#A87A48","sl":"#7A6A5A","sk":"#7A6A5A","prop2":"cage"},"n:tiaoshui":{"hat":"scarf","hc":"#4A5A6A","skin":"#8A5A3A","ring":"#A87A48","sl":"#4A6A8A","lg":"#4A6A8A","prop":"pole"},"a:changyuchun":{"hat":"topknot","hc":"#1E1A16","beard":"full","bc":"#1E1A16","brow":"angry","ring":"#9A6A3A","armor":"#8A9098","sl":"#8E2A22","gl":"#6A5A4A","sk":"#8E2A22","prop":"drum","prop2":"helmet","shoe":"#1E1A16"},"a:liuji":{"hat":"fangjin","hc":"#151515","beard":"long","bc":"#D8D6D0","brow":"white","ring":"#9A6A3A","sl":"#8E2A22","sk":"#8E2A22","belt":"#4A2A18","prop":"scroll"},"a:shenwansan":{"hat":"fangjin","hc":"#151515","ring":"#9A6A3A","sl":"#2F4A9A","sk":"#2F4A9A","trim":"#E3B341","belt":"#F5F3EE","beads":"#C8A040"},"a:shinaian":{"hat":"fangjin","hc":"#151515","beard":"goatee","bc":"#D8D6D0","brow":"white","ring":"#9A6A3A","sl":"#4A4E56","sk":"#4A4E56","sash":"#1E1A16","prop":"book"},"a:wangmian":{"hat":"topknot","hc":"#E8E6E0","hair":"#E8E6E0","beard":"goatee","bc":"#E8E6E0","ring":"#9A6A3A","sl":"#E8E4D8","sk":"#E8E4D8","sash":"#B8A070","prop":"plum","prop2":"brush"},"agula":{"hat":"qfur","hair":"#1E1A16","hs":"braids","brow":"thick","ring":"#C9953E","sl":"#1B3E78","gl":"#FFFFFF","lg":"#2A3F66","sk":"#1B3E78","trim":"#FFFFFF","belt":"#7A4A24","buckle":1,"strap":1,"shoe":"#1E1A16"},"n:w01_tang_lady":{"ring":"#A87A48","gl":"#FFFFFF","hat":"topknot","hc":"#1E1A16","pin":"#E3B341","sl":"#C8322A","sk":"#C8322A","trim":"#E3B341","prop":"palmfan"},"n:w02_song_tea":{"ring":"#A87A48","gl":"#FFFFFF","hat":"topknot","hc":"#1E1A16","pin":"#D8E8E0","sl":"#9CC8D8","sk":"#F0EDE6","prop":"cup"},"n:w03_yuan_rider":{"ring":"#A87A48","gl":"#FFFFFF","hat":"hair","hc":"#1E1A16","hair":"#1E1A16","hs":"braids","band":"#C8C8C8","sl":"#2456A6","sk":"#2456A6","trim":"#C8322A","belt":"#5A3A1E","buckle":1,"prop":"whip","shoe":"#1E1A16"},"n:w04_ming_scholar":{"ring":"#A87A48","gl":"#FFFFFF","hat":"fangjin","hc":"#151515","sl":"#B8A0D8","sk":"#B8A0D8","prop":"book","prop2":"fan"},"n:w05_qing_gege":{"ring":"#A87A48","gl":"#F5E8D8","hat":"liangba","hc":"#1E1A16","sl":"#F0B8C8","sk":"#F0B8C8","col":"#E8A0B8"},"n:w06_swordswoman":{"ring":"#A87A48","gl":"#FFFFFF","hat":"topknot","hc":"#1E1A16","band":"#C8322A","sl":"#1E1A16","sk":"#1E1A16","sash":"#C8322A","prop":"sword","prop2":"piece"},"n:w07_fisher_girl":{"ring":"#A87A48","gl":"#FFFFFF","hat":"douli","hc":"#C9A86A","hair":"#1E1A16","hs":"braid1","sl":"#3E5A8A","lg":"#3E5A8A","prop":"basket","shoe":"#B08A5A"},"n:w08_embroider":{"ring":"#A87A48","gl":"#FFFFFF","hat":"topknot","hc":"#1E1A16","sl":"#E8B860","sk":"#C8B8D8","prop":"drum"},"n:w09_qin_player":{"ring":"#A87A48","gl":"#FFFFFF","hat":"topknot","hc":"#1E1A16","hair":"#1E1A16","hs":"long","sl":"#F5F3EE","sk":"#F5F3EE","sash":"#6A6A6A","prop":"scroll"},"n:w10_general":{"ring":"#A87A48","gl":"#FFFFFF","hat":"helmet","hc":"#9AA0A8","armor":"#B8C0C8","sl":"#8E2A22","sk":"#8E2A22","prop":"sword","shoe":"#1E1A16"},"n:w11_yuan_falconer":{"ring":"#A87A48","gl":"#FFFFFF","hat":"qfur","hair":"#1E1A16","hs":"braids","sl":"#8E2A22","sk":"#8E2A22","belt":"#5A3A1E","buckle":1,"prop":"piece","shoe":"#1E1A16"},"n:w12_yuan_merchant":{"ring":"#A87A48","gl":"#FFFFFF","hat":"kerchief","hc":"#E8DCC8","sl":"#2456A6","sk":"#2456A6","sash":"#C8A040","prop":"book"},"n:w13_yuan_singer":{"ring":"#A87A48","gl":"#FFFFFF","hat":"topknot","hc":"#1E1A16","pin":"#F07AA0","sl":"#F0A0B8","sk":"#F5F3EE","prop":"fan"},"n:w14_yuan_porcelain":{"ring":"#A87A48","gl":"#FFFFFF","hat":"bandana","hc":"#2F4A8A","sl":"#2F4A8A","ap":"#C8B890","prop":"cup"},"n:w15_yuan_archer":{"ring":"#A87A48","gl":"#FFFFFF","hat":"hair","hc":"#1E1A16","hair":"#1E1A16","hs":"braids","band":"#C8C8C8","sl":"#6A4A2A","sk":"#6A4A2A","belt":"#3A2A1E","prop":"staff","shoe":"#1E1A16"},"n:w16_ming_poet":{"ring":"#A87A48","gl":"#FFFFFF","hat":"topknot","hc":"#1E1A16","pin":"#F0F0F0","sl":"#F0C0C8","sk":"#E8A0B0","prop":"brush","prop2":"letter"},"n:w17_ming_pipa":{"ring":"#A87A48","gl":"#FFFFFF","hat":"topknot","hc":"#1E1A16","pin":"#E3B341","sl":"#F5F3EE","sk":"#C8B8D8","prop":"drum"},"n:w18_ming_doctor":{"ring":"#A87A48","gl":"#FFFFFF","hat":"kerchief","hc":"#C8C0B0","sl":"#7A8FA8","ap":"#F5F3EE","prop":"basket"},"n:w19_ming_teahouse":{"ring":"#A87A48","gl":"#FFFFFF","hat":"hair","hc":"#1E1A16","hair":"#1E1A16","hs":"buns2","band":"#C8322A","sl":"#E8B860","sk":"#F5F3EE","prop":"teapot"},"n:w20_ming_guard":{"ring":"#A87A48","gl":"#FFFFFF","hat":"sui","hc":"#1E1A16","sl":"#B8322A","sk":"#B8322A","belt":"#1E1A16","buckle":1,"prop":"sword","shoe":"#1E1A16"},"me:girl":{"hat":"buns","hc":"#1E1A16","band":"#C8322A","hair":"#1E1A16","gl":"#FFFFFF","shoe":"#B3141B"}};
  /* 意見回饋 471（開發者：遊戲角色照畫好的頭像做成 Q 版 3D）：CUS 造型表的零件
     hair 髮色＋hs 髮型（braids 兩條辮子、braid1 後面一條、long 披肩長髮、buns2 頭頂兩個小髻、side 兩鬢）、beard 鬍子（goatee 山羊鬍、long 長鬚、full 絡腮鬍、mus 八字鬍）＋bc 顏色、
     brow 眉毛（thick 粗、white 白）、glasses 圓眼鏡、sl 袖子、gl 手套（沒有就是手）、lg 褲子、sk 袍擺＋trim 浪花邊、ap 圍裙、buckle 銀扣、strap 垂帶、sash 腰巾、armor 盔甲、col 領子、beads 佛珠、
     prop／prop2 右手／左手拿的東西 */
  function cusApply(C,K){const{bot,torso,head,hatG,eyes,arms,legs,P,add}=K,M=(c,o)=>P(c,Object.assign({roughness:.6,clearcoat:.2},o||{}));
    const hairM=C.hair?M(C.hair,{roughness:.5,clearcoat:.4}):null,hs=C.hs||"";
    if(hairM&&hs!=="bald"){const bh=add(head,new T.SphereGeometry(.5,32,20),hairM,[0,.12,-.1],{noLine:1});bh.scale.set(1.03,.95,.8)}
    if(hairM){if(/braids/.test(hs))for(const s of[-1,1]){for(let j=0;j<6;j++)add(head,new T.SphereGeometry(.058-.005*j,14,10),hairM,[.5*s,.06-j*.085,.04],{line:.12}).scale.set(1,1.2,1);add(head,new T.SphereGeometry(.035,10,8),M(C.tie||"#B3141B"),[.5*s,-.46,.04],{noLine:1})}
      if(/braid1/.test(hs))for(let j=0;j<7;j++)add(head,new T.SphereGeometry(.07-.005*j,14,10),hairM,[0,-.05-j*.1,-.5-j*.02],{line:.1});
      if(/long/.test(hs)){const l=add(head,new T.CapsuleGeometry(.36,.5,8,16),hairM,[0,-.25,-.32],{line:.04});l.scale.set(1.15,1,.45)}
      if(/buns2/.test(hs))for(const s of[-1,1])add(head,new T.SphereGeometry(.13,16,12),hairM,[.3*s,.72,-.05],{line:.06});
      if(/side/.test(hs))for(const s of[-1,1])add(head,new T.CapsuleGeometry(.05,.3,4,8),hairM,[.5*s,-.05,.12],{line:.1})}
    if(C.beard){const bm=M(C.bc||"#EDEBE6",{roughness:.8,clearcoat:0});
      if(C.beard==="goatee"){const b=add(head,new T.ConeGeometry(.11,.32,16),bm,[0,-.3,.44],{line:.08});b.rotation.x=PI+.25}
      if(C.beard==="long"){const b=add(head,new T.ConeGeometry(.2,.72,18),bm,[0,-.5,.4],{line:.06});b.rotation.x=PI+.3}
      if(C.beard==="full"){const b=add(head,new T.SphereGeometry(.5,32,16,0,TAU,PI*.64,PI*.36),bm,[0,.12,.04],{noLine:1});b.scale.set(1.08,1.05,1.08);const c=add(head,new T.ConeGeometry(.26,.42,18),bm,[0,-.42,.32],{line:.05});c.rotation.x=PI+.35}
      if(C.beard==="long"||C.beard==="full"||C.beard==="mus"||C.mus)for(const s of[-1,1]){const m=add(head,new T.CapsuleGeometry(.03,.17,4,8),bm,[.1*s,-.02,.52],{line:.12});m.rotation.z=PI/2+.5*s}}
    for(const e of eyes){if(C.brow==="thick"){e.brow.scale.set(1.25,1.9,1);e.brow.rotation.z=PI/2-.22*e.s;e.brow.position.y=.16}
      if(C.brow==="white"){e.brow.material=M("#E8E6E0");e.brow.scale.set(1.3,1.5,1)}
      if(C.brow==="angry"){e.brow.scale.set(1.2,1.6,1);e.brow.rotation.z=PI/2+.35*e.s}}
    if(C.glasses){const gm=M("#2A2A2A",{metalness:.4,roughness:.3});for(const s of[-1,1])add(head,new T.TorusGeometry(.12,.016,8,28),gm,[.18*s,.2,.5],{noLine:1});add(head,new T.CylinderGeometry(.012,.012,.12,8),gm,[0,.22,.53],{noLine:1}).rotation.z=PI/2}
    const sl=C.sl?M(C.sl):null,gl=C.gl?M(C.gl,{roughness:.5}):null;for(const sh of arms){const[a,h]=sh.children;if(a&&sl)a.material=sl;if(h&&gl)h.material=gl}
    if(C.lg)for(const hp of legs){const[l]=hp.children;if(l)l.material=M(C.lg)}
    if(C.sk){const sk=add(bot,new T.CylinderGeometry(.62,.8,.28,48,1,true),M(C.sk,{side:T.DoubleSide}),[0,.3,-.04],{line:.03});sk.scale.z=.45;
      if(C.trim)for(let i=0;i<7;i++){const a=PI*.15+i/6*PI*.7,w=add(bot,new T.TorusGeometry(.1,.025,6,16,PI),M(C.trim),[Math.cos(a)*.78,.19,(-Math.sin(a)*.78)*.45+.02],{noLine:1});w.rotation.y=PI/2-a}}
    if(C.ap)add(torso,new T.BoxGeometry(.62,.5,.03),M(C.ap),[0,-.74,.27],{line:.06});
    const silver=M("#D8DCE2",{metalness:.8,roughness:.25}),leather=M(C.belt||"#7A4A24");
    if(C.buckle){add(torso,new T.BoxGeometry(.18,.14,.04),silver,[0,-.46,.29],{line:.08});add(torso,new T.BoxGeometry(.1,.07,.05),leather,[0,-.46,.3],{noLine:1})}
    if(C.strap){const st=add(torso,new T.BoxGeometry(.08,.42,.03),leather,[.3,-.68,.28],{line:.1});st.rotation.z=-.08;for(let i=0;i<3;i++)add(torso,new T.SphereGeometry(.018,8,6),silver,[.3,-.55-i*.11,.3],{noLine:1})}
    if(C.sash)for(const s of[-1,1]){const t=add(torso,new T.BoxGeometry(.09,.38,.025),M(C.sash),[.08*s,-.66,.29],{line:.1});t.rotation.z=.12*s}
    if(C.armor){const am=M(C.armor,{metalness:.6,roughness:.35});for(const s of[-1,1]){const p=add(torso,new T.SphereGeometry(.26,20,12,0,TAU,0,PI*.5),am,[.78*s,.18,0],{line:.05});p.rotation.z=-.5*s;p.scale.set(1,.7,1.1)}}
    if(C.col)add(torso,new T.TorusGeometry(.3,.07,10,32),M(C.col),[0,.74,.05],{line:.06}).rotation.x=PI/2;
    if(C.beads){const bm=M(C.beads,{roughness:.4,clearcoat:.8});for(let i=0;i<16;i++){const a=PI*.05+i/15*PI*.9;add(torso,new T.SphereGeometry(.045,10,8),bm,[Math.cos(a)*.42,.62-Math.sin(a)*.32,.3],{noLine:1})}}
    for(const[p,arm]of[[C.prop,arms[1]],[C.prop2,arms[0]]])if(p&&arm){const g=new T.Group();g.position.set(0,-.6,.12);arm.add(g);PROP(p,g,M,add)}}
  /* 手上拿的東西（掛在手的位置；長的東西斜放） */
  function PROP(p,g,M,add){const wood=M("#8A5A2B"),bam=M("#B9A15A"),dark=M("#2A1E14"),paper=M("#F2EAD6");
    const cyl=(r,h,m,pos,rx,rz)=>{const x=add(g,new T.CylinderGeometry(r,r,h,12),m,pos,{line:.08});if(rx)x.rotation.x=rx;if(rz)x.rotation.z=rz;return x};
    switch(p){case"pole":cyl(.03,2.4,bam,[0,.3,0],0,.5);break;
      case"staff":case"cane":cyl(.035,1.5,wood,[0,.2,.05]);break;
      case"broom":cyl(.03,1.4,bam,[0,.35,0]);{const b=add(g,new T.ConeGeometry(.16,.4,12),M("#C9A14A"),[0,-.45,0],{line:.06})}break;
      case"fan":{const f=add(g,new T.CylinderGeometry(.34,.34,.02,24,1,false,0,PI*.8),paper,[0,.12,.05],{line:.06});f.rotation.x=PI/2;f.rotation.z=.4}break;
      case"palmfan":{const f=add(g,new T.CircleGeometry(.3,20),M("#C9A060",{side:T.DoubleSide}),[0,.25,.05],{line:.05});cyl(.02,.3,wood,[0,-.05,.05])}break;
      case"umbrella":{cyl(.025,1.3,wood,[0,.25,0],0,-.2);const u=add(g,new T.ConeGeometry(.13,.8,10),M("#D8B860"),[.08,.5,0],{line:.06});u.rotation.z=-.2}break;
      case"pipe":cyl(.02,.5,wood,[0,.1,.1],1.2);break;
      case"gourd":add(g,new T.SphereGeometry(.12,14,10),M("#C08A3A"),[0,-.05,0],{line:.08});add(g,new T.SphereGeometry(.08,14,10),M("#C08A3A"),[0,.12,0],{line:.08});break;
      case"bowl":add(g,new T.SphereGeometry(.15,16,8,0,TAU,PI/2,PI/2),M("#E8E2D4",{side:T.DoubleSide}),[0,.14,.05],{line:.06});break;
      case"teapot":add(g,new T.SphereGeometry(.16,16,12),M("#6A4A3A"),[0,.05,.08],{line:.06});cyl(.03,.2,M("#6A4A3A"),[.17,.08,.08],0,-.9);break;
      case"book":add(g,new T.BoxGeometry(.3,.38,.08),M("#2F4A6B"),[0,.05,.08],{line:.06});break;
      case"scroll":{cyl(.05,.5,paper,[0,.05,.08],0,PI/2);for(const x of[-.27,.27])cyl(.03,.12,wood,[x,.05,.08],0,PI/2)}break;
      case"brush":cyl(.02,.45,wood,[0,.2,.05]);add(g,new T.ConeGeometry(.04,.12,10),dark,[0,-.05,.05],{noLine:1}).rotation.x=PI;break;
      case"hammer":cyl(.025,.6,wood,[0,.25,0]);add(g,new T.BoxGeometry(.3,.16,.16),wood,[0,.58,0],{line:.06});break;
      case"axe":cyl(.03,1,wood,[0,.3,0],0,.9);add(g,new T.BoxGeometry(.06,.3,.24),M("#9AA0A8",{metalness:.7}),[.38,.62,0],{line:.06});break;
      case"whip":cyl(.02,.4,wood,[0,.1,0]);add(g,new T.TorusGeometry(.18,.012,6,24),dark,[0,-.25,0],{noLine:1});break;
      case"drum":{const d=add(g,new T.CylinderGeometry(.22,.22,.12,24),M("#EDE3CC"),[0,.3,.05],{line:.05});d.rotation.x=PI/2}break;
      case"basket":add(g,new T.CylinderGeometry(.24,.18,.24,16,1,true),M("#C9A060",{side:T.DoubleSide}),[0,-.1,.12],{line:.05});break;
      case"flowers":add(g,new T.CylinderGeometry(.2,.15,.2,14,1,true),M("#C9A060",{side:T.DoubleSide}),[0,-.05,.12],{line:.05});for(let i=0;i<6;i++)add(g,new T.SphereGeometry(.06,10,8),M(i%2?"#F07AA0":"#F7C6D6"),[(Math.random()-.5)*.28,.1+Math.random()*.08,.12+(Math.random()-.5)*.15],{noLine:1});break;
      case"cage":{add(g,new T.CylinderGeometry(.2,.2,.36,12,1,true),M("#C9A060",{wireframe:true}),[0,-.2,0],{noLine:1});add(g,new T.SphereGeometry(.07,10,8),M("#8A6A3A"),[0,-.22,0],{noLine:1});cyl(.02,.14,wood,[0,.04,0])}break;
      case"kite":{const k=add(g,new T.ConeGeometry(.3,.5,4),M("#2F5D8A",{side:T.DoubleSide}),[-.1,.1,.15],{line:.05});k.scale.z=.12;k.rotation.z=PI/2}break;
      case"abacus":add(g,new T.BoxGeometry(.42,.26,.05),dark,[0,.1,.1],{line:.06});for(let i=0;i<5;i++)add(g,new T.SphereGeometry(.03,8,6),M("#8A5A2B"),[-.16+i*.08,.1,.14],{noLine:1});break;
      case"lantern":cyl(.015,.2,wood,[0,0,0]);add(g,new T.SphereGeometry(.16,14,10),M("#F2D27A",{emissive:new T.Color("#7a5a10")}),[0,-.22,0],{line:.06}).scale.y=1.2;break;
      case"towel":add(g,new T.BoxGeometry(.16,.5,.03),M("#F5F3EE"),[0,.5,-.1],{line:.06});break;
      case"sword":cyl(.03,1.1,M("#6A5A4A"),[0,.35,-.1],0,.15);break;
      case"piece":add(g,new T.CylinderGeometry(.1,.1,.06,20),M("#E8C98A"),[0,.05,.1],{line:.08}).rotation.x=PI/2;break;
      case"helmet":add(g,new T.SphereGeometry(.2,16,10,0,TAU,0,PI*.55),M("#8A9098",{metalness:.6}),[0,0,.08],{line:.05});break;
      case"letter":add(g,new T.BoxGeometry(.28,.2,.01),paper,[0,.08,.1],{line:.06});break;
      case"baby":add(g,new T.SphereGeometry(.22,16,12),M("#D88AA8"),[0,.1,.15],{line:.05}).scale.set(1.3,.9,.9);add(g,new T.SphereGeometry(.11,14,10),M("#FBE9CC"),[.2,.18,.2],{line:.06});break;
      case"incense":cyl(.012,.5,M("#8A3A2A"),[0,.25,.05]);break;
      case"potato":add(g,new T.SphereGeometry(.1,12,10),M("#B5552A"),[0,.05,.1],{line:.06}).scale.set(1.4,.9,.9);break;
      case"planks":add(g,new T.BoxGeometry(.4,.5,.08),wood,[0,0,.15],{line:.05});break;
      case"plum":cyl(.015,.5,dark,[0,.2,.05],0,.4);for(let i=0;i<5;i++)add(g,new T.SphereGeometry(.035,8,6),M("#F7C6D6"),[-.05+i*.04,.25+i*.05,.06],{noLine:1});break;
      case"cup":add(g,new T.CylinderGeometry(.08,.06,.1,14),M("#F5F3EE"),[0,.05,.1],{line:.08});break}}

  /* 意見回饋 471（開發者：Q 版／真實 3D 讓玩家切換）：真實 3D＝Tripo 照立繪做的模型（data/tripo_app/*.glb）。
     先照常做 Q 版（模型還沒下載好之前看得到人），模型到了就把 Q 版藏起來、換成模型：跟 Q 版一樣高、腳踩在同一個地方；
     立繪身上寫字的白色圓，Tripo 做成一個洞，這裡在同一個位置補一塊寫著擅長棋子的圓牌（用 Q 版身上那塊的貼圖） */
  /* 意見回饋 549：小帥、小帥妹的真實 3D 模型肚子上是一塊空白圓牌，這裡寫上選的棋子（其他角色的圓牌位置不準，照 503 不貼）。
     ME_RING＝在正面圖上量的圓牌中心（u 從左、v 從上，模型寬高的比例）和半徑（模型寬的比例） */
  const ME_RING={me_boy:{u:.5,v:.625,r:.2},me_girl:{u:.497,v:.62,r:.2}};
  /* 意見回饋 555：其他角色的圓牌位置（正面圖上自動找、人工看過的 69 個模型，data/tripo_app/ring3d.json），表上沒有的模型不寫字 */
  let R3=null;try{fetch("data/tripo_app/ring3d.json").then(r=>r.ok?r.json():null).then(j=>{R3=j}).catch(()=>{})}catch(e){}
  /* 意見回饋 577（開發者：身上的帥字好醜，顏色、字體都重新規劃）：之前是紅字直接貼在模型深褐色的圓牌上（對比差、看起來偏粉）。
     改成一整面棋子：米白象牙底＋外圈深紅粗環、內圈細環，字用傳統棋子的字形（經典那套）、深紅色，下面一層淡淡的刻痕影子，像真的刻出來的棋子 */
  const glyTex=(ch,k)=>cv(512,(g,n)=>{const h=n/2,red="帥仕相俥傌炮兵".includes(ch),ink=red?"#A3140E":"#1E1A16",sh=red?"rgba(110,20,10,.28)":"rgba(0,0,0,.25)",gp=typeof GLY!=="undefined"&&((GLY.classic&&GLY.classic[ch])||(GLY[k]&&GLY[k][ch]));
    let gr=g.createRadialGradient(h*.8,h*.72,n*.02,h,h,h);gr.addColorStop(0,"#FFF9EC");gr.addColorStop(.72,"#F4E3C1");gr.addColorStop(1,"#DDBE86");g.fillStyle=gr;g.beginPath();g.arc(h,h,h*.99,0,Math.PI*2);g.fill();
    g.strokeStyle="rgba(120,80,30,.55)";g.lineWidth=n*.012;g.beginPath();g.arc(h,h,h*.975,0,Math.PI*2);g.stroke();
    g.strokeStyle=ink;g.lineWidth=n*.034;g.beginPath();g.arc(h,h,h*.83,0,Math.PI*2);g.stroke();g.lineWidth=n*.009;g.beginPath();g.arc(h,h,h*.745,0,Math.PI*2);g.stroke();
    if(gp&&window.Path2D){const P2=new Path2D(gp),sc=2.75;for(const[dx,dy,c]of[[3,5,sh],[0,0,ink]]){g.save();g.translate(h-50*sc+dx,h-50*sc+dy);g.scale(sc,sc);g.fillStyle=c;g.fill(P2);if(c===ink){g.strokeStyle=ink;g.lineWidth=1.2;g.lineJoin="round";g.stroke(P2)}g.restore()}return}
    g.font='900 236px "Noto Serif TC","Songti TC","PMingLiU","SimSun",serif';g.textAlign="center";g.textBaseline="middle";g.fillStyle=sh;g.fillText(ch,h+3,h+14);g.fillStyle=ink;g.fillText(ch,h,h+9)});
  const GLB_ANIM_OF={wave:"wave_goodbye_01",hattip:"wave_goodbye_01",point:"wave_goodbye_01",bow:"bow",gongshou:"bow",taichi:"bow",cheer:"cheer",win:"cheer",jump:"cheer",clap:"cheer",flex:"cheer",laugh:"cheer",kick:"cheer"};   /* 小人的動作 → Tripo 動畫名稱 */
  /* 開發者 11/6（雲河七星的膚色「還是太深，跟 Gemini 完全不同」）：七位武俠角色（x_ 開頭的模型）改用「手繪上色」材質。
     顏色直接照貼圖（貼圖的皮膚、腮紅已對齊 2D 定稿），只加一點固定方向（從看的人右上前方）的柔和明暗；不吃場景燈光和色調映射。
     原因：同一張貼圖，在石桌園子（ACES 色調映射＋暖色太陽）臉會壓成深橘褐色，桌面小人（畫布沒有 sRGB 輸出）又過曝偏黃，人物檢視又是另一個樣子；
     改成這樣以後三個地方看到的臉色都一樣、都跟 2D 定稿一樣。找不到要換的程式片段（three.js 改版）就照原本的光照，不會壞掉 */
  const PAINT_C=new WeakMap(),PAINT_L="vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;";
  function paintMat(o){let m=PAINT_C.get(o);if(m)return m;m=new T.MeshLambertMaterial({map:o.map,side:o.side,transparent:o.transparent,opacity:o.opacity,alphaTest:o.alphaTest});m.name="xqPaint";
    m.onBeforeCompile=s=>{const f=s.fragmentShader;if(!f.includes(PAINT_L)||!f.includes("#include <encodings_fragment>"))return;
      s.fragmentShader=f.replace(PAINT_L,"vec3 outgoingLight = diffuseColor.rgb * ( .62 + .38 * smoothstep( -.3, .75, dot( normal, normalize( vec3( .35, .55, .75 ) ) ) ) );").replace("#include <tonemapping_fragment>","").replace("#include <encodings_fragment>","gl_FragColor = LinearTosRGB( gl_FragColor );")};
    m.customProgramCacheKey=()=>"xqPaint";PAINT_C.set(o,m);return m}
  /* 開發者 11/8（Gemini 評估：真實 3D 小人跟水墨背景、水墨插畫割裂）：試做「水墨」材質，預設關，開發者看過對照圖再決定。
     A＝卡通色塊：三階明暗（最亮那階就是貼圖原色），光從看的人右上前方（跟 paintMat 一樣，各場景臉色一致），外加反面外殼（inverted hull）畫墨線；
     B＝A 再降一點飽和、疊紙紋、輪廓邊緣往宣紙色暈開，墨線粗細和濃淡有變化。
     墨線用反面外殼不用後處理：每個模型多畫一次（只算頂點、片段很省），不用另外的整張畫面緩衝；手機上比較順。
     外殼沿「同位置頂點平均」的法線往外推（貼圖接縫處法線不同也不會裂開），粗細照螢幕像素算、最多不超過身高的 1.1%（遠處小人不會糊成一團）；
     外殼的深度往後退身高的 3%（只改深度、不改位置），眼窩、腮紅、衣褶這些凹處的外殼就藏在身體後面，不會在臉上冒出多的線，外輪廓照樣畫得出來。
     B 的紙色只加在亮的地方（頭髮、墨色衣服保持黑，不會變灰）。
     切換：網址加 ?toon=a／?toon=b／?toon=off（記在 m_toon3d），或主控台 XQTOON("a"|"b"|"")；原本的寫實材質留著，切回 off 就換回來 */
  const TOON_C=new WeakMap(),TOON_M0=new WeakMap(),TOON_H=new WeakSet(),TOON_R=[];let TOON=(()=>{try{const q=(location.search+"&"+(location.hash.split("?")[1]||"")).match(/[?&]toon=(\w+)/);if(q){const v=/^[ab]$/.test(q[1])?q[1]:"";store.set("toon3d",v);return v}}catch(e){}const v=store.get("toon3d","a");return v==="a"||v==="b"?v:""})();   /* 開發者 11/8 選定 A（卡通色塊＋墨線）為預設；?toon=off 可切回寫實 */
  const TOON_F="float xqH(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}\nfloat xqN(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(xqH(i),xqH(i+vec2(1.,0.)),f.x),mix(xqH(i+vec2(0.,1.)),xqH(i+vec2(1.,1.)),f.x),f.y);}\n";
  const TOON_L="float xqD = dot( normal, normalize( vec3( .35, .55, .75 ) ) );\n"+
    "#ifdef XQ_TOON_B\n"+
    "vec3 outgoingLight = diffuseColor.rgb * ( .78 + .11 * smoothstep( -.2, -.1, xqD ) + .11 * smoothstep( .26, .36, xqD ) );\n"+
    "vec3 xqP = vec3( .86, .79, .64 );\n"+
    "float xqY = dot( outgoingLight, vec3( .2126, .7152, .0722 ) ); float xqK = smoothstep( .02, .35, xqY ); outgoingLight = mix( mix( vec3( xqY ), outgoingLight, .94 ), xqP, .08 * xqK );\n"+
    "float xqG = xqN( gl_FragCoord.xy * .45 ) * .55 + xqN( gl_FragCoord.xy * 1.7 ) * .45;\n"+
    "outgoingLight *= .975 + .05 * xqG;\n"+
    "float xqR = 1. - abs( dot( normal, geometry.viewDir ) );\n"+
    "outgoingLight = mix( outgoingLight, xqP, ( .1 + .2 * xqK ) * smoothstep( .8, 1.02, xqR + ( xqG - .5 ) * .2 ) );\n"+
    "#else\n"+
    "vec3 outgoingLight = diffuseColor.rgb * ( .70 + .15 * smoothstep( -.16, -.10, xqD ) + .15 * smoothstep( .28, .34, xqD ) );\n"+
    "#endif\n";
  function toonMat(o,mode){let c=TOON_C.get(o);if(!c)TOON_C.set(o,c={});if(c[mode])return c[mode];
    const m=new T.MeshLambertMaterial({map:o.map||null,color:o.color&&o.name!=="xqPaint"?o.color.clone():0xffffff,side:o.side,transparent:o.transparent,opacity:o.opacity,alphaTest:o.alphaTest,vertexColors:!!o.vertexColors});m.name="xqToon"+mode;
    if(mode==="b")m.defines={XQ_TOON_B:""};
    m.onBeforeCompile=s=>{const f=s.fragmentShader;if(!f.includes(PAINT_L)||!f.includes("#include <encodings_fragment>"))return;
      s.fragmentShader=f.replace("#include <common>","#include <common>\n"+TOON_F).replace(PAINT_L,TOON_L).replace("#include <tonemapping_fragment>","").replace("#include <encodings_fragment>","gl_FragColor = LinearTosRGB( gl_FragColor );")};
    m.customProgramCacheKey=()=>"xqToon"+mode;c[mode]=m;return m}
  /* 外殼法線：同一個位置的頂點（貼圖接縫會把一個點拆成好幾個）法線取平均，存成 xqON；同一個模型的複製品共用，只算一次 */
  function toonGeo(geo){if(geo.userData.xqON!==undefined)return geo.userData.xqON;geo.userData.xqON=false;
    try{const p=geo.attributes.position,n=geo.attributes.normal;if(!p||!n)return false;const N=p.count,acc=new Map(),key=new Array(N),out=new Float32Array(N*3);
      for(let i=0;i<N;i++){const k=Math.round(p.getX(i)*2e4)+","+Math.round(p.getY(i)*2e4)+","+Math.round(p.getZ(i)*2e4);key[i]=k;let a=acc.get(k);if(!a)acc.set(k,a=[0,0,0]);a[0]+=n.getX(i);a[1]+=n.getY(i);a[2]+=n.getZ(i)}
      for(let i=0;i<N;i++){const a=acc.get(key[i]),l=Math.hypot(a[0],a[1],a[2])||1;out[i*3]=a[0]/l;out[i*3+1]=a[1]/l;out[i*3+2]=a[2]/l}
      geo.setAttribute("xqON",new T.BufferAttribute(out,3));if(!geo.boundingBox)geo.computeBoundingBox();const bb=geo.boundingBox;geo.userData.xqON=Math.max(bb.max.y-bb.min.y,bb.max.x-bb.min.x,bb.max.z-bb.min.z)||1}catch(e){}
    return geo.userData.xqON}
  const HULL_V="#include <common>\n#include <skinning_pars_vertex>\nattribute vec3 xqON;\nuniform float uW;\nuniform float uMax;\nuniform float uBias;\nuniform float uGH;\nuniform float uVar;\n"+
    "void main(){\nvec3 objectNormal = xqON;\n#include <skinbase_vertex>\n#include <skinnormal_vertex>\n#include <begin_vertex>\n#include <skinning_vertex>\n#include <project_vertex>\n"+
    "vec3 vn = normalize( normalMatrix * objectNormal );\nfloat k = projectionMatrix[ 2 ][ 3 ] < -.5 ? -mvPosition.z : 1.;\n"+
    "float t = position.y / uGH * 23. + position.x / uGH * 9. + position.z / uGH * 5.;\nfloat w = min( uW * k, uMax ) * ( 1. - uVar + uVar * 1.6 * ( .5 + .5 * sin( t ) ) );\n"+
    "mvPosition.xyz += vn * w;\ngl_Position = projectionMatrix * mvPosition;\n"+
    "vec4 xqB = projectionMatrix * vec4( mvPosition.xy, mvPosition.z - uBias, 1. );\ngl_Position.z = xqB.z / xqB.w * gl_Position.w;\n}";
  const HULL_FR="uniform vec3 uInk;\nuniform float uVar;\n"+TOON_F+"void main(){\nfloat g = xqN( gl_FragCoord.xy * .6 );\ngl_FragColor = vec4( mix( uInk, uInk + vec3( .22, .2, .17 ), uVar * g * 1.3 ), 1. );\n}";
  function toonHull(m,mode,O){O=O||{};const gh=toonGeo(m.geometry);if(!gh)return null;
    const mat=new T.ShaderMaterial({uniforms:{uW:{value:0},uMax:{value:0},uBias:{value:0},uGH:{value:gh},uVar:{value:mode==="b"?.45:0},uInk:{value:mode==="b"?new T.Vector3(.2,.16,.13):new T.Vector3(.13,.09,.07)}},vertexShader:HULL_V,fragmentShader:HULL_FR,side:T.BackSide});mat.name="xqHull";
    const h=m.isSkinnedMesh?new T.SkinnedMesh(m.geometry,mat):new T.Mesh(m.geometry,mat);if(m.isSkinnedMesh){h.bindMode=m.bindMode;h.bind(m.skeleton,m.bindMatrix)}
    h.name="xqHull";TOON_H.add(h);h.raycast=()=>{};h.castShadow=false;h.receiveShadow=false;h.frustumCulled=m.frustumCulled;const PX=mode==="b"?2.3:1.7;
    h.onBeforeRender=(r,s,cam)=>{try{const el=r.domElement,ch=el.clientHeight||el.height||1,u=mat.uniforms;
      u.uW.value=cam.isPerspectiveCamera?PX*2*Math.tan(cam.fov*Math.PI/360)/(cam.zoom||1)/ch:PX*(cam.top-cam.bottom)/(cam.zoom||1)/ch;const S=h.matrixWorld.getMaxScaleOnAxis(),H=gh*S;u.uMax.value=O.max!=null?O.max*S:H*.011;u.uBias.value=O.bias!=null?O.bias*S:H*.03}catch(e){}};
    return h}
  function toonApply(g,mode){const ms=[];g.traverse(m=>{if(m.isMesh&&!TOON_H.has(m))ms.push(m)});
    for(const m of ms){if(!TOON_M0.has(m))TOON_M0.set(m,m.material);const o=TOON_M0.get(m);
      for(const c of m.children.filter(c=>TOON_H.has(c)))m.remove(c);
      if(!mode||!o||Array.isArray(o)){m.material=o;continue}
      m.material=toonMat(o,mode);if(!o.transparent){const h=toonHull(m,mode);if(h)m.add(h)}}}
  window.XQTOON=v=>{if(v===undefined)return TOON;TOON=v==="a"||v==="b"?v:"";store.set("toon3d",TOON);
    for(let i=TOON_R.length-1;i>=0;i--){const g=TOON_R[i].deref?TOON_R[i].deref():TOON_R[i];if(!g){TOON_R.splice(i,1);continue}try{toonApply(g,TOON)}catch(e){}}
    for(const f of TOON_KIT.lis.slice())try{f(TOON)}catch(e){}return TOON};
  /* 開發者 11/8（畫風盤點第 3 條）：園子的道具（park3d.js）借用同一套墨線外殼；XQTOON 切換時通知園子（lis） */
  const TOON_KIT=window.XQTOON_KIT={hull:(m,O)=>toonHull(m,"a",O),isHull:o=>TOON_H.has(o),lis:[]};
  function toonReg(g){TOON_R.push(window.WeakRef?new WeakRef(g):g);if(TOON)try{toonApply(g,TOON)}catch(e){}}
  /* 意見回饋 819（開發者：駱躍梅的皮帶看起來歪歪的）：雲河七星共用的 Tripo 待機動作（idle，15.37 秒一圈），第 0 秒那格上半身往一邊側傾約 4.6 度（頭反向扶正），
     我的角色頁、人物檢視（fig3d）不播動作，一直停在這一格，腰帶和帶扣就斜斜的、帽子卻是正的。待機是無縫循環，把整段循環往後挪到上半身最正的那一刻（13.6 秒：側傾不到 1 度、頭正、只微微轉頭），
     reset() 回到開頭也是正的姿勢；有在播動作的地方（走路角色、桌面小人）只是循環的起點不同，動作本身沒變。每段動作只挪一次（XQGLB_ANIM 快取共用） */
  const IDLE_T0=13.6;
  function idleShift(cl){if(!cl||cl.name!=="idle"||cl.xqT0!=null)return;cl.xqT0=0;const D=cl.duration,t0=cl.tracks.length?cl.tracks[0].times[0]:0,P=D-t0;if(!(P>IDLE_T0-t0+.5)||!(IDLE_T0>t0))return;
    for(const tr of cl.tracks){const tm=tr.times,n=tm.length;if(n<2||Math.abs(tm[0]-t0)>1e-3||Math.abs(tm[n-1]-D)>1e-3||tr.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline||tr.getInterpolation()!==T.InterpolateLinear&&!(tr.getInterpolation()===T.InterpolateDiscrete&&n===2))return}   /* 每條軌都是同一段完整循環（Tripo 從第 1 格 1/30 秒開始，最後一格＝第一格）、線性內插才挪；只有兩格的「階梯」軌（不動的骨頭）整段都是第一格的值，挪了一樣 */
    for(const tr of cl.tracks){const tm=tr.times,vs=tr.values,n=tm.length,k=vs.length/n;if(tr.getInterpolation()===T.InterpolateDiscrete){const v2=new vs.constructor(k*2);v2.set(vs.subarray(0,k));v2.set(vs.subarray(0,k),k);tr.times=new Float32Array([0,P]);tr.values=v2;continue}const vS=Array.from(tr.createInterpolant().evaluate(IDLE_T0)),K=[[0,vS]];
      for(let i=0;i<n-1;i++){if(Math.abs(tm[i]-IDLE_T0)<1e-4)continue;K.push([(tm[i]-IDLE_T0+P)%P,Array.from(vs.subarray(i*k,i*k+k))])}
      K.sort((x,y)=>x[0]-y[0]);K.push([P,vS]);const T3=new Float32Array(K.length),V3=new vs.constructor(K.length*k);K.forEach(([t,v],i)=>{T3[i]=t;V3.set(v,i*k)});tr.times=T3;tr.values=V3}
    cl.duration=P;cl.xqT0=IDLE_T0}
  function attachGLB(B,o){if(!window.XQGLB)return;const meId=(String(o.glb||"").match(/\/(\w+)\.glb/)||[])[1],meCh=PC(),meK=eraK();const box0=new T.Box3().setFromObject(B.bot),h0=box0.max.y-box0.min.y,y0=box0.min.y;
    const face=B.torso.children.find(m=>m.isMesh&&m.geometry&&m.geometry.type==="CircleGeometry");
    B.glbP=window.XQGLB(o.glb).catch(()=>window.XQGLB(o.glb)).then(sc=>{if(!sc)throw new Error("empty");   /* 意見回饋 505：失敗自動重試一次；結果交給畫面顯示「載入中／失敗」 */const g=sc.clone(true);B.glbRoot=g;try{const rb=new T.Box3().setFromObject(g);B.glbRaw={min:rb.min.clone(),max:rb.max.clone()}}catch(e){}g.rotation.y=-Math.PI/2;g.updateMatrixWorld(true);   /* 意見回饋 679：點角色身上的物件，用模型原本的範圍換算位置（glbRoot、glbRaw） */
      /* 開發者 11/5：武俠角色的模型有 Tripo 綁的骨架和動作（待機、走路、揮手、歡呼、鞠躬）。clone 不會把骨架接到複製的骨頭上，照骨頭名字重接；
         先擺成待機的第一格（沒有每格更新動畫的畫面，也不會停在張開手臂的骨架原始姿勢） */
      {const clips=(window.XQGLB_ANIM||{})[o.glb]||[];if(clips.length){try{const bn={};g.traverse(n=>{if(n.isBone)bn[n.name]=n});
        g.traverse(m=>{if(m.isSkinnedMesh&&m.skeleton){const sk=m.skeleton;m.bind(new T.Skeleton(sk.bones.map(b=>bn[b.name]||b),sk.boneInverses),m.bindMatrix)}});
        for(const cl of clips)idleShift(cl);B.mixer=new T.AnimationMixer(g);B.clips={};for(const cl of clips)B.clips[cl.name]=B.mixer.clipAction(cl);B.animCur="idle";if(B.clips.idle)B.clips.idle.play();B.mixer.update(0);g.updateMatrixWorld(true)}catch(e){B.mixer=null}}}   /* 意見回饋 503：Tripo 的模型臉朝 +X（側面），轉 90 度讓臉朝前；之前圓牌朝前、模型朝側面，看起來圓牌浮在身體旁邊 */
      const bb=new T.Box3().setFromObject(g),sz=bb.getSize(new T.Vector3()),c=bb.getCenter(new T.Vector3());if(!(sz.y>0))return;
      const hold=new T.Group();hold.name="glb";g.position.set(-c.x,-bb.min.y,-c.z);hold.add(g);hold.scale.setScalar(h0/sz.y);hold.position.y=y0;
      g.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true}});
      if(/^x_/.test(meId||""))g.traverse(m=>{if(m.isMesh&&m.material&&m.material.map)m.material=paintMat(m.material)});   /* 開發者 11/6：雲河七星用手繪上色材質（見 paintMat） */
      toonReg(g);   /* 開發者 11/8：水墨材質試做（預設關，見 toonMat） */
      /* 意見回饋 503：圓牌的位置是從 2D 立繪換算的，套在 Tripo 模型上會偏（蓋到臉、浮在身體前面），真實版就不另外貼圓牌，看模型本身 */
      if(false&&o.ring&&o.ring.r&&face){const R=o.ring,rad=R.r*sz.x*.95,m=face.material.clone();m.side=T.DoubleSide;
        const d=new T.Mesh(new T.CircleGeometry(rad,48),m),px=bb.min.x+R.u*sz.x,py=bb.max.y-R.v*sz.y;
        /* 圓牌貼在模型表面：從正前方打一條射線，碰到的地方再往前一點（不浮在空中、也不埋進身體） */
        let pz=bb.max.z;try{const hit=new T.Raycaster(new T.Vector3(px,py,bb.max.z+sz.z+1),new T.Vector3(0,0,-1)).intersectObject(g,true)[0];if(hit)pz=hit.point.z}catch(e){}
        d.position.set(px-c.x,py-bb.min.y,pz-c.z+sz.y*.004);hold.add(d)}
      const R3e=meId&&!ME_RING[meId]&&R3&&Array.isArray(R3[meId])?{u:R3[meId][0],v:R3[meId][1],r:R3[meId][2]*.85,z:R3[meId][3],back:R3[meId][4]===1}:null;
      if(meId&&(ME_RING[meId]||R3e)){try{const R=ME_RING[meId]||R3e,rad=R.r*sz.x*.9,px=R.back?bb.max.x-R.u*sz.x:bb.min.x+R.u*sz.x,py=bb.max.y-R.v*sz.y;
        /* 意見回饋 564：有些圓牌是凹下去的碟形（明朝擂主），只量圓心的深度會被邊緣擋住、字看起來殘缺；在圓牌上量九個點，取最靠前的深度 */
        let pz=-1e9;const rc=new T.Raycaster();for(const[dx,dy]of[[0,0],[.75,0],[-.75,0],[0,.75],[0,-.75],[.53,.53],[-.53,.53],[.53,-.53],[-.53,-.53]]){rc.set(new T.Vector3(px+dx*rad,py+dy*rad,R.back?bb.min.z-sz.z-1:bb.max.z+sz.z+1),new T.Vector3(0,0,R.back?1:-1));const hit=rc.intersectObject(g,true)[0];const hz=hit?(R.back?-hit.point.z:hit.point.z):-1e9;if(hz>pz)pz=hz}if(pz<-1e8)pz=R.back?-bb.min.z:bb.max.z;if(R.back)pz=-pz;   /* 開發者 11/6：齊轍的棋子揹在背後，圓牌貼在背面（ring3d.json 第 5 個值＝1） */if(R.z!=null)pz=bb.min.z+R.z*sz.z;   /* 意見回饋 665：少年阿古拉手上捧著棋盤，打點量到的是棋盤表面，圓片浮在胸口前面、一轉就偏到旁邊；ring3d.json 第 4 個值是校正量到的圓面深度 */
        const d=new T.Mesh(new T.CircleGeometry(rad,48),new T.MeshBasicMaterial({map:glyTex(meCh,meK),color:0xEDE6D8,transparent:true,depthWrite:false,toneMapped:false}));d.name="meGly";{const _p=new T.Vector3(),_n=new T.Vector3(),_v=new T.Vector3();d.onBeforeRender=(rn,s2,cam)=>{try{d.getWorldPosition(_p);_n.set(0,0,1).transformDirection(d.matrixWorld);_v.copy(cam.position).sub(_p).normalize();d.material.opacity=Math.max(0,Math.min(1,(_n.dot(_v)-.3)/.3))}catch(e){}}}   /* 584：轉到側面時字面淡掉，不會看到一片紙浮在身上 */   /* 577：整面棋子、不受燈光影響（背光時不會變成深褐），顏色稍微壓暗一點才不會比身體亮太多 */
        d.position.set(px-c.x,py-bb.min.y,pz-c.z+(R.back?-1:1)*sz.y*.006);if(R.back)d.rotation.y=Math.PI;hold.add(d)}catch(e){}}
      for(const ch of B.bot.children)ch.visible=false;B.bot.add(hold);B.glb=hold;return true});B.glbP.catch(()=>{})}

  // ---------- 招牌動作 ----------
  const lie=(p,B)=>{const L=p<.15?ease(p/.15):p>.85?ease((1-p)/.15):1;B.root.rotation.z=PI/2*L;B.root.position.x=1.2*L;B.root.position.y=.8*L};
  const R=(B,i,x,y,z)=>{const a=B.arms[i].rotation;if(x!=null)a.x=x;if(y!=null)a.y=y;if(z!=null)a.z=z};
  const ACTS={
    wave:{d:2.2,say:"嗨！",f:(p,B)=>{R(B,1,0,.4*wv(p,3),2.6);B.head.rotation.z=-.12}},
    jump:{d:1.3,say:"耶！",f:(p,B)=>{const h=Math.max(0,Math.sin(p*TAU));B.root.position.y=h*.7;R(B,0,0,0,-2.4*h-.3);R(B,1,0,0,2.4*h+.3);B.legs[0].rotation.x=B.legs[1].rotation.x=-.5*h}},
    cheer:{d:2,say:"好棋！",f:(p,B)=>{R(B,0,0,0,-2.7+.3*wv(p,4));R(B,1,0,0,2.7-.3*wv(p,4));B.root.position.y=Math.abs(wv(p,2))*.25;B.face="open"}},
    dance:{d:3.2,say:"♪ ♫",f:(p,B)=>{const s=wv(p,4);B.root.rotation.z=.18*s;R(B,0,0,0,-1.2-s);R(B,1,0,0,1.2-s);B.legs[0].rotation.x=.5*Math.max(0,s);B.legs[1].rotation.x=.5*Math.max(0,-s);B.head.rotation.z=-.2*s;B.root.position.y=Math.abs(s)*.12}},
    think:{d:2.8,say:"嗯…",f:(p,B)=>{R(B,1,-2.3,-.6,.4);B.head.rotation.z=.22;B.head.rotation.x=-.12+.05*wv(p,2)}},
    bow:{d:2,say:"請多指教",f:(p,B)=>{const k=bell(p);B.torso.rotation.x=.75*k;R(B,0,.4*k);R(B,1,.4*k)}},
    spin:{d:1.6,say:"轉～",f:(p,B)=>{B.root.rotation.y=ease(p)*TAU;R(B,0,0,0,-1.5);R(B,1,0,0,1.5)}},
    clap:{d:2,say:"好！好！",f:(p,B)=>{const k=(wv(p,6)+1)/2;R(B,0,-1.35,.9,-(.15+.5*k));R(B,1,-1.35,-.9,.15+.5*k)}},
    point:{d:2.2,say:"看這裡！",f:(p,B)=>{R(B,1,0,.2*wv(p,2),1.55);B.head.rotation.y=.35}},
    sleep:{d:3.4,say:"Zzz…",f:(p,B)=>{B.head.rotation.z=.4;B.head.rotation.x=.2;B.closed=1;B.root.position.y=-.03*(1+wv(p,2))}},
    shrug:{d:1.8,say:"？",f:(p,B)=>{const k=bell(p);R(B,0,-.8*k,0,-1.1*k-.3);R(B,1,-.8*k,0,1.1*k+.3);B.head.rotation.z=.2*k}},
    flex:{d:2.2,say:"看我的！",f:(p,B)=>{R(B,0,-.3+.25*wv(p,3),0,-1.6);R(B,1,-.3+.25*wv(p,3),0,1.6);B.torso.rotation.x=-.1}},
    shock:{d:1.6,say:"將軍！",f:(p,B)=>{const k=Math.min(1,p*4);B.root.position.y=.5*Math.sin(Math.min(1,p*2)*PI);R(B,0,0,0,-2.9*k);R(B,1,0,0,2.9*k);B.root.rotation.z=.08*wv(p,8)*(1-p);B.face="open"}},
    // 意見回饋 248：勝負動畫各 5 秒。贏＝連跳、中段轉一圈、雙手歡呼；輸＝垂頭、搖頭、雙手下垂、掉淚；和＝拱手點頭
    win:{d:5,f:(p,B)=>{const h=Math.abs(wv(p,4.5));B.root.position.y=h*.5;R(B,0,0,.3*wv(p,9),-2.7);R(B,1,0,.3*wv(p,9),2.7);if(p>.4&&p<.65)B.root.rotation.y=ease((p-.4)/.25)*TAU;B.face="happy"}},
    lose:{d:5,f:(p,B)=>{B.head.rotation.x=.35;B.head.rotation.y=p<.75?.32*wv(p,4):0;B.torso.rotation.x=.12;R(B,0,.15,0,-.08);R(B,1,.15,0,.08);B.root.rotation.z=.05*wv(p,1.5);B.face="sad"}},
    draw:{d:5,f:(p,B)=>{const k=bell(Math.min(1,p*1.6)),n=p>.6?Math.max(0,wv(p,3)):0;R(B,0,-1.3*k,.5*k,-.35-.3*k);R(B,1,-1.3*k,-.5*k,.35+.3*k);B.head.rotation.x=.3*k+.15*n;B.torso.rotation.x=.15*k;B.face="smile"}},
    // 躺著的動作（意見回饋 165）：側躺在地上，頭在左、腳在右；開頭和結尾慢慢躺下、起身
    nap:{d:4.4,say:"躺一下…Zzz",f:(p,B)=>{lie(p,B);B.closed=1;B.torso.scale.y=1+.03*Math.sin(p*TAU*3)}},
    kick:{d:3.6,say:"躺著翹腳好舒服～",f:(p,B)=>{lie(p,B);B.legs[0].rotation.x=.7*wv(p,5);B.legs[1].rotation.x=-.7*wv(p,5);B.face="happy"}},
    roll:{d:3,say:"滾來滾去～",f:(p,B)=>{B.root.rotation.z=ease(p)*TAU;B.root.position.y=.85*bell(p);B.face="open"}},
    prop:{d:4,say:"撐著頭想棋…",f:(p,B)=>{lie(p,B);R(B,1,0,0,2.6);R(B,0,.3,0,-.4);B.head.rotation.z=-.2}},
    liewave:{d:3.4,say:"躺著跟你揮揮手",f:(p,B)=>{lie(p,B);R(B,0,0,.4*wv(p,3),-2.4)}},
    laugh:{d:3.2,say:"哈哈哈哈！",f:(p,B)=>{lie(p,B);B.root.rotation.z+=.15*wv(p,6);B.legs[0].rotation.x=.5*wv(p,6);B.legs[1].rotation.x=-.5*wv(p,6);B.face="happy"}},
    // ===== 意見回饋 177：脫帽打招呼＋10 種動作、倒立、伏地挺身、20 種舞步 =====
    hattip:{d:2.6,say:"拱手作揖",f:(p,B)=>{const k=bell(p);R(B,1,-.3*k,0,2.75*Math.min(1,p*3)*(p<.85?1:(1-p)/.15));B.hat.position.set(.25*k,.35*k,.1*k);B.hat.rotation.z=-.5*k;B.torso.rotation.x=.25*k;B.face="happy"}},
    gongshou:{d:2.4,say:"有禮了！",f:(p,B)=>{const k=bell(p);R(B,0,-1.45,.95,-.15);R(B,1,-1.45,-.95,.15);B.torso.rotation.x=.35*Math.max(0,wv(p,2));B.face="smile"}},
    heart:{d:2.4,say:"拱手",f:(p,B)=>{R(B,0,0,.2,-2.5);R(B,1,0,-.2,2.5);B.head.rotation.z=.15*wv(p,2);B.face="happy"}},
    kiss:{d:2.2,say:"妙！",f:(p,B)=>{const k=p<.5?p*2:1;R(B,1,-2.2*(1-k)-.6*k,0,.3+.9*k);B.head.rotation.z=-.15;B.face="wink"}},
    lookout:{d:2.8,say:"讓我看看遠方…",f:(p,B)=>{R(B,1,-2.5,-.5,.6);B.head.rotation.y=.6*wv(p,1);B.root.position.y+=.08*bell(p)}},
    taichi:{d:4,say:"打一套太極",f:(p,B)=>{const a=p*TAU;R(B,0,-1+.6*Math.sin(a),0,-.6-.5*Math.cos(a));R(B,1,-1+.6*Math.sin(a+PI),0,.6+.5*Math.cos(a+PI));B.root.position.y-=.08;B.torso.rotation.y=.25*Math.sin(a)}},
    scratch:{d:2.2,say:"好癢…",f:(p,B)=>{R(B,1,-.4,.3,2.4+.2*wv(p,10));B.head.rotation.z=.25;B.face="wink"}},
    belly:{d:2.4,say:"吃飽了～",f:(p,B)=>{R(B,0,-.9,.6+.2*wv(p,3),-.3);R(B,1,-.9,-.6-.2*wv(p,3),.3);B.torso.rotation.x=-.12;B.face="happy"}},
    knock:{d:2,say:"咚咚，想一想",f:(p,B)=>{R(B,1,-.6,0,2.5+.25*Math.max(0,wv(p,5)));B.closed=Math.max(0,wv(p,5))>.5?1:0}},
    stretch:{d:3,say:"伸個懶腰～",f:(p,B)=>{const s=wv(p,2);B.root.rotation.z=.3*s;R(B,0,0,0,-2.9);R(B,1,0,0,2.9);B.legs[0].rotation.z=-.2;B.legs[1].rotation.z=.2}},
    thumbs2:{d:2,say:"好棋！好棋！",f:(p,B)=>{const k=bell(p);R(B,0,-1.2*k,0,-.8);R(B,1,-1.2*k,0,.8);B.root.position.y+=.1*k;B.face="happy"}},
    headstand:{d:4.4,say:"看我倒立！",f:(p,B)=>{const L=p<.2?ease(p/.2):p>.8?ease((1-p)/.2):1;B.root.rotation.z=PI*L;B.root.position.y=2.78*L;
      R(B,0,0,0,-1.5);R(B,1,0,0,1.5);B.legs[0].rotation.x=.35*wv(p,3)*L;B.legs[1].rotation.x=-.35*wv(p,3)*L;B.root.rotation.z+=.05*wv(p,4)*L;B.face="open"}},
    pushup:{d:4.6,say:"紮馬步，一、二…",f:(p,B)=>{const L=p<.15?ease(p/.15):p>.85?ease((1-p)/.15):1;B.bot.rotation.y=PI/2*L;B.root.rotation.z=-PI/2*L;B.root.position.x=-1.05*L;
      const up=(Math.cos(p*TAU*4)+1)/2;B.root.position.y=(.5+.35*up)*L;R(B,0,-PI/2*L,0,-.15);R(B,1,-PI/2*L,0,.15);B.face=up>.5?"smile":"open"}},
    d_tap:{d:3.4,say:"♪ ♫",f:(p,B)=>{const s=wv(p,10);B.legs[0].rotation.x=.5*Math.max(0,s);B.legs[1].rotation.x=.5*Math.max(0,-s);R(B,0,.3*s,0,-.5);R(B,1,-.3*s,0,.5);B.root.position.y+=.04*Math.abs(s)}},
    d_ballet:{d:3.4,say:"♪ ♫",f:(p,B)=>{B.root.position.y+=.14;R(B,0,0,0,-2.6+.2*wv(p,2));R(B,1,0,0,2.6-.2*wv(p,2));B.root.rotation.y=ease(p)*TAU;B.legs[1].rotation.x=-.9*bell(p);B.face="happy"}},
    d_jazz:{d:3.4,say:"♪ ♫",f:(p,B)=>{const s=wv(p,4);R(B,0,-.3,.35*wv(p,8),-1.4);R(B,1,-.3,-.35*wv(p,8),1.4);B.root.rotation.z=.12*s;B.head.rotation.z=-.15*s;B.face="open"}},
    d_robot:{d:3.4,say:"♪ ♫",f:(p,B)=>{const q=Math.floor(p*8)%4;R(B,0,q%2?-1.57:0,0,q<2?-1.57:-.3);R(B,1,q%2?0:-1.57,0,q<2?.3:1.57);B.head.rotation.y=[0,.5,0,-.5][q]}},
    d_moon:{d:3.4,say:"♪ ♫",f:(p,B)=>{const s=wv(p,4);B.root.rotation.y=.9;B.root.position.x=.8-1.6*p;B.legs[0].rotation.x=.4*s;B.legs[1].rotation.x=-.4*s;R(B,0,.3*s,0,-.3);R(B,1,-.3*s,0,.3)}},
    d_swing:{d:3.4,say:"♪ ♫",f:(p,B)=>{const s=wv(p,3);B.root.rotation.z=.25*s;R(B,0,0,0,-1.2+.8*s);R(B,1,0,0,1.2+.8*s);B.root.position.y+=.08*Math.abs(s)}},
    d_chacha:{d:3.4,say:"♪ ♫",f:(p,B)=>{const q=(p*6)%1,st=q<.75?Math.sin(q/.75*PI*3):0;B.legs[0].rotation.x=.4*Math.max(0,st);B.legs[1].rotation.x=.4*Math.max(0,-st);B.root.rotation.z=.12*st;R(B,0,-.4,0,-.9);R(B,1,-.4,0,.9)}},
    d_waltz:{d:3.4,say:"♪ ♫",f:(p,B)=>{B.root.rotation.y=ease(p)*TAU*1.5;R(B,0,-.9,0,-1.2);R(B,1,-.3,0,1.6);B.root.position.y+=.06*Math.abs(wv(p,3));B.face="happy"}},
    d_twist:{d:3.4,say:"♪ ♫",f:(p,B)=>{const s=wv(p,6);B.torso.rotation.y=.6*s;B.root.position.y-=.1;R(B,0,-.6,0,-.6-.3*s);R(B,1,-.6,0,.6-.3*s)}},
    d_horse:{d:3.4,say:"♪ ♫",f:(p,B)=>{const s=wv(p,6);R(B,0,-1.4,.6,-.2);R(B,1,-1.4+.6*Math.max(0,s),-.6,.2);B.legs[0].rotation.x=.5*Math.max(0,s);B.legs[1].rotation.x=.5*Math.max(0,-s);B.root.position.y+=.15*Math.abs(s);B.face="open"}},
    d_hula:{d:3.4,say:"♪ ♫",f:(p,B)=>{const s=wv(p,3);B.root.rotation.z=.15*s;R(B,0,-1.3,.5*s,-1);R(B,1,-1.3,.5*s,1);B.head.rotation.z=-.1*s}},
    d_yangge:{d:3.4,say:"♪ ♫",f:(p,B)=>{const s=wv(p,4);R(B,0,0,0,-.6-1.6*Math.max(0,s));R(B,1,0,0,.6+1.6*Math.max(0,-s));B.legs[0].rotation.x=.3*s;B.legs[1].rotation.x=-.3*s;B.face="happy"}},
    d_wave:{d:3.4,say:"♪ ♫",f:(p,B)=>{R(B,0,0,0,-1.5-.6*Math.sin(p*TAU*3));R(B,1,0,0,1.5-.6*Math.sin(p*TAU*3+1.5));B.root.position.y+=.08*Math.sin(p*TAU*3+.75);B.head.rotation.z=.15*Math.sin(p*TAU*3)}},
    d_disco:{d:3.4,say:"♪ ♫",f:(p,B)=>{const q=Math.floor(p*6)%2;R(B,1,0,0,q?2.6:.4);R(B,0,0,0,q?-.4:-2.6);B.root.rotation.z=q?.12:-.12;B.face="open"}},
    d_cancan:{d:3.4,say:"♪ ♫",f:(p,B)=>{const s=wv(p,4);B.legs[0].rotation.x=-1.2*Math.max(0,s);B.legs[1].rotation.x=-1.2*Math.max(0,-s);R(B,0,0,0,-1.6);R(B,1,0,0,1.6);B.root.position.y+=.1*Math.abs(s);B.face="happy"}},
    d_penguin:{d:3.4,say:"♪ ♫",f:(p,B)=>{const s=wv(p,6);B.root.rotation.z=.15*s;R(B,0,0,0,-.45-.25*Math.max(0,s));R(B,1,0,0,.45+.25*Math.max(0,-s));B.legs[0].rotation.z=-.15;B.legs[1].rotation.z=.15}},
    d_clapdance:{d:3.4,say:"♪ ♫",f:(p,B)=>{const q=(p*4)%1;if(q<.5){const k=(Math.sin(q*TAU*4)+1)/2;R(B,0,0,.4,-(2.6-.4*k));R(B,1,0,-.4,2.6-.4*k)}else{R(B,0,-.4,0,-.25);R(B,1,-.4,0,.25);B.root.position.y-=.12}}},
    d_freeze:{d:3.4,say:"♪ ♫",f:(p,B)=>{const q=Math.min(3,Math.floor(p*4));const P=[[-2.6,.3,.4],[-.3,1.6,-.3],[-1.6,2.6,.3],[-.8,.8,0]][q];R(B,0,0,0,P[0]);R(B,1,0,0,P[1]);B.root.rotation.z=P[2]*.3;B.face=q%2?"open":"happy"}},
    d_top:{d:3.4,say:"♪ ♫",f:(p,B)=>{B.root.rotation.y=ease(p)*TAU*3;R(B,0,0,0,-1.5);R(B,1,0,0,1.5);B.root.position.y+=.1*bell(p);B.face="open"}},
    d_jacks:{d:3.4,say:"♪ ♫",f:(p,B)=>{const s=Math.abs(wv(p,4));R(B,0,0,0,-.3-2.4*s);R(B,1,0,0,.3+2.4*s);B.legs[0].rotation.z=-.35*s;B.legs[1].rotation.z=.35*s;B.root.position.y+=.25*s}},
    carry:{d:99,f:(p,B,t)=>{R(B,0,0,0,-2.6);R(B,1,0,0,2.6);B.legs[0].rotation.x=.4*Math.sin(t*9);B.legs[1].rotation.x=-.4*Math.sin(t*9);B.face="open"}}};
  const SIGNATURE=["wave","jump","cheer","dance","think","bow","spin","clap","point","sleep","shrug","flex","nap","kick","roll","prop","liewave","laugh","hattip","gongshou","heart","kiss","lookout","taichi","scratch","belly","knock","stretch","thumbs2","headstand","pushup","d_tap","d_ballet","d_jazz","d_robot","d_moon","d_swing","d_chacha","d_waltz","d_twist","d_horse","d_hula","d_yangge","d_wave","d_disco","d_cancan","d_penguin","d_clapdance","d_freeze","d_top","d_jacks"];

  // ---------- 300 種組合動作：手部 × 身體 ----------
  const ARM=[
    ["揮右手",(p,B)=>R(B,1,0,.4*wv(p,3),2.6)],["揮左手",(p,B)=>R(B,0,0,.4*wv(p,3),-2.6)],["雙手揮",(p,B)=>{R(B,0,0,0,-2.5+.4*wv(p,3));R(B,1,0,0,2.5-.4*wv(p,3))}],
    ["舉左手",(p,B)=>R(B,0,0,0,-3*bell(p))],["高舉雙手",(p,B)=>{R(B,0,0,0,-3*bell(p));R(B,1,0,0,3*bell(p))}],["拍手",(p,B)=>{const k=(wv(p,5)+1)/2;R(B,0,-1.35,.9,-(.15+.5*k));R(B,1,-1.35,-.9,.15+.5*k)}],
    ["指前方",(p,B)=>R(B,1,-1.5*bell(p),0,.3)],["指天",(p,B)=>R(B,1,0,0,2.9*bell(p))],["叉腰",(p,B)=>{R(B,0,0,0,-.9);R(B,1,0,0,.9)}],
    ["抱胸",(p,B)=>{R(B,0,-1.2,.9,-.2);R(B,1,-1.1,-.9,.2)}],["敬禮",(p,B)=>R(B,1,-.4,-.6,2.3*bell(p))],["托下巴",(p,B)=>R(B,1,-2.3,-.6,.4)],
    ["拍翅膀",(p,B)=>{const k=wv(p,5)*.6;R(B,0,0,0,-1.2+k);R(B,1,0,0,1.2-k)}],["出拳",(p,B)=>{R(B,1,-1.5*Math.max(0,wv(p,3)),0,.3);R(B,0,-1.5*Math.max(0,-wv(p,3)),0,-.3)}],
    ["張開雙手",(p,B)=>{R(B,0,-.9,0,-1.4*bell(p));R(B,1,-.9,0,1.4*bell(p))}],["搖手指",(p,B)=>R(B,1,-1.6,.5*wv(p,4),.5)],["比讚",(p,B)=>R(B,1,-1.2*bell(p),0,.8)],
    ["抓頭",(p,B)=>R(B,1,-.6,0,2.6+.15*wv(p,5))],["揉眼睛",(p,B)=>{R(B,0,-2.4,.5+.2*wv(p,4),-.4);B.closed=1}],["划船",(p,B)=>{const k=wv(p,2);R(B,0,-1+k*.6,0,-.4);R(B,1,-1+k*.6,0,.4)}],
    ["打鼓",(p,B)=>{R(B,0,-1.1-.5*Math.max(0,wv(p,4)),0,-.3);R(B,1,-1.1-.5*Math.max(0,-wv(p,4)),0,.3)}],["擦汗",(p,B)=>R(B,1,-.3,.4*wv(p,3),2.5)],
    ["伸懶腰",(p,B)=>{const k=bell(p);R(B,0,0,0,-2.9*k);R(B,1,0,0,2.9*k);B.root.position.y+=.1*k}],["招手",(p,B)=>R(B,1,-1.3-.5*Math.max(0,wv(p,3)),0,.5)]];
  const BODY=[
    ["",()=>{}],["彈跳",(p,B)=>{B.root.position.y+=Math.abs(wv(p,2))*.35}],["搖擺",(p,B)=>{B.root.rotation.z=.15*wv(p,2)}],["點頭",(p,B)=>{B.head.rotation.x=.25*Math.max(0,wv(p,3))}],
    ["搖頭",(p,B)=>{B.head.rotation.y=.4*wv(p,3)}],["歪頭",(p,B)=>{B.head.rotation.z=.3*bell(p)}],["轉身",(p,B)=>{B.root.rotation.y=PI*bell(p)}],["蹲下",(p,B)=>{B.root.position.y-=.18*bell(p);B.legs[0].rotation.z=-.3*bell(p);B.legs[1].rotation.z=.3*bell(p)}],
    ["踮腳",(p,B)=>{B.root.position.y+=.12*bell(p)}],["扭腰",(p,B)=>{B.torso.rotation.y=.4*wv(p,2)}],["前傾",(p,B)=>{B.torso.rotation.x=.3*bell(p)}],["後仰",(p,B)=>{B.torso.rotation.x=-.25*bell(p)}],
    ["踏步",(p,B)=>{const s=wv(p,4);B.legs[0].rotation.x=.6*Math.max(0,s);B.legs[1].rotation.x=.6*Math.max(0,-s);B.root.position.y+=.05*Math.abs(s)}]];
  const LINES=("公園裡有 13 位朝代擂主等你挑戰！按 🏯|打贏擂主，那一朝的千秋印會亮一邊喔|打贏 13 位擂主，就是十三朝棋王！|長安棋王說他沒輸過，要不要去試試？|去公園下棋吧！按右上角的🌳|公園有 13 個朝代的風景喔|換個地方下？按🌳到公園去|在公園裡可以 360 度轉頭看風景|公園裡的桌椅、燈籠都能點來看介紹|"+   // 意見回饋 241：提醒玩家可以去公園下棋
    "你好！今天想下哪一盤？|我是小帥，請多指教！|來一盤吧！|今天也要贏喔！|下棋囉～|你回來啦！|我等你好久了|一起變強吧！|休息一下也很好|喝口水再下吧|"+
    "馬走日，別忘了！|象走田，不能過河喔|車走直線最威風|炮要隔一子才能打|兵過河才能橫走|將帥不能見面喔！|士只在九宮裡轉|小心蹩馬腿！|象眼被塞就走不動了|炮沒有砲架打不到|"+
    "車是最強的棋子|一車十子寒！|馬後炮，好殺法！|雙車錯，很難擋|臥槽馬，要小心|鐵門栓，殺氣騰騰|悶宮殺，炮最愛|天地炮，壓力大|重炮殺，兩門炮疊起來|白臉將，借將助攻|"+
    "中炮開局最常見|屏風馬很穩健|仙人指路，先探虛實|飛相局，以靜制動|順炮直車，對攻激烈|列炮，針鋒相對|反宮馬，變化多|過宮炮，出其不意|起馬局，穩紮穩打|士角炮，伏兵一招|"+
    "中炮對屏風馬，經典！|五七炮很有後勁|五八炮，直衝中路|三步虎，快出車|單提馬，左右呼應|鴛鴦炮，少見又有趣|龜背炮，守得緊|半途列炮，敢衝敢拚|巡河車，好位置|騎河車，壓制對方|"+
    "開局要先出大子|別太早動將帥|車要早點出動|馬要往中間跳|炮不要太早換掉|兵卒也很重要|殘局兵貴如金|先手很寶貴|搶到先手就有主動|多子不如多先|"+
    "攻擊前先看防守|別只顧吃子|對方的炮在瞄你喔|這步可以想久一點|先想對方要幹嘛|棄子搶先也是好棋|兌子要算清楚|中路最要緊|九宮附近要小心|保護好你的帥|"+
    "觀棋不語真君子|落子無悔大丈夫|一著不慎，滿盤皆輸|棋高一著，縛手縛腳|當局者迷，旁觀者清|勝不驕，敗不餒|棋如人生|下棋要沉得住氣|慢慢來，比較快|靜下心來看全局|"+
    "好棋！|這步漂亮！|厲害厲害！|我學到了！|妙著！|有大師的味道！|這招我記住了|你進步好多|太強了吧！|穩！|"+
    "加油！|別灰心！|輸了也是經驗|再來一盤就會贏|每盤棋都在進步|錯棋重練很有用|多看大師對局|做做殘局題吧|今天練了嗎？|堅持就是勝利|"+
    "嘿嘿～|哈哈！|嗯哼～|哇！|唷呼～|喔耶！|嗯？|咦？|呼～|啦啦啦～|"+
    "我是棋子，也是你的朋友|我的身體是一顆帥|我的帽子是金頂的|我會跳舞喔|戳我會表演|把我拖到旁邊吧|我不會擋你下棋啦|雙擊我，我就去散步|我在這裡等你|累了，我先睡一下|"+
    "中國象棋有兩千多年歷史|象棋棋盤有九條直線|楚河漢界分兩邊|紅方先走|棋盤上有三十二顆棋子|每邊十六顆子|帥和將是同一個角色|俥和車都是車|傌和馬都是馬|炮和砲都是炮|"+
    "古譜《橘中秘》很經典|《梅花譜》講屏風馬|《適情雅趣》有很多殺法|多看古譜會開竅|胡榮華是傳奇大師|許銀川也很厲害|大師也是一步步練出來的|記譜可以複盤|複盤是進步的秘訣|輸棋最該複盤|"+
    "要不要喝杯茶？|下棋配茶最棒了|今天天氣真好|晚安，明天見|早安！|午安～|吃飽了嗎？|記得伸懶腰|眼睛休息一下|我會一直陪你|"+
    "將軍要先想退路|防守也是進攻|守住中兵很重要|別讓車被困住|車不要走到炮口|馬跳河口很活躍|炮架是關鍵|一子之差也很大|算三步再走|對方剛剛那步有陷阱嗎？|"+
    "殘局要算步數|單車難破士象全|馬兵殘局很微妙|炮兵殘局要耐心|車兵對車很難贏|殘局帥也要出來幫忙|帥走出來也是戰力|長將不能一直將|"+
    "看我轉圈！|看我跳高！|看我鞠躬！|看我拍手！|看我秀肌肉！|我會划船喔|打鼓咚咚咚|擦擦汗|伸個懶腰～|招招手～|"+
    "你的對手正在想|換你走囉|慢慢想，不急|時間還很多|這盤很精彩|勢均力敵！|紅方有優勢嗎？|黑方要反擊了！|局面複雜喔|關鍵時刻！|"+
    "你今天的手氣不錯|贏了要謙虛喔|輸了要笑一笑|下完記得握手|謝謝你陪我|你是我最好的棋友|下次帶朋友來玩|分享給朋友吧|一起上線對戰！|線上大廳有人喔|"+
    "象棋是智慧的遊戲|動腦讓人年輕|專心的你最帥|你的眼神好認真|思考中的你閃閃發光|我也想學下棋|教教我嘛|我只會走一步|我最會的是賣萌|我會努力變可愛|"+
    "吃！|將軍！|跑掉了！|好險！|差一點！|中計了嗎？|這是陷阱！|反將一軍！|絕殺！|勝利在望！|兵卒過河頂半車|車馬炮配合最強|雙馬飲泉，好漂亮|馬炮爭雄|車炮抽將要小心|大刀剜心！|二鬼拍門|雙炮過河，壓力好大|海底撈月，殘局名招|送佛歸殿|高釣馬，殺著來了|側面虎，要防|拔簧馬，一跳成殺|老卒搜林|小鬼坐龍廷|夾車炮，左右開弓|雙將最難擋|一將一殺|圍魏救趙，好戰術|聲東擊西|先棄後取|捨車保帥|丟卒保車|兵臨城下！|步步為營|穩中求勝|以攻代守|調虎離山|關門打狗|引蛇出洞|窩心馬不太好|空頭炮很兇|當頭炮來囉|河頭馬很靈活|象田要顧好|雙士連環，守得穩|高車保馬|肋道是車的好位置|卒林線很重要|九宮是帥的家|我今天心情很好|陽光好溫暖|下雨天也適合下棋|週末來場大戰吧|你是棋盤上的英雄|輸贏都是好朋友|笑一個嘛|你看起來好專注|我幫你加油打氣|握握手～|想喝珍珠奶茶|來點小點心吧|下完棋去散步|聽點音樂放鬆|今天學了一招新殺法|明天再挑戰大師|我要變成將軍！|我其實很怕炮|車哥最可靠|馬兄跳好遠|小兵立大功|我想當一顆車|象兄守家最認真|士兄每天站崗|炮兄翻山越嶺|帥哥就是我|黑將是我的好兄弟|紅黑一家親|楚河漢界是我家|棋盤是我的遊樂場|讓我想想…|好難喔…|我算不過來了|你比我聰明|這步我不會|教練請指導|看懂了！|原來如此！|我懂了我懂了|再看一次！").split("|");
  // 意見回饋 165：再加 500 句（棋諺、記譜、朝代、功能、閒聊＋App 裡的術語和特級大師資料自動產生），用「看過的不再出現」避免重複
  const EXTRA="寧失一子，不失一先|三步不出車，棋已輸一半|馬跳窩心，不死也昏|馬踏八方，炮打隔山|車不立險地|有車殺無車|開局炮強，殘局馬強|殘局炮要歸家|先手不可輕易丟|搶先一步，天地寬|兵貴神速|謀定而後動|知己知彼，百戰百勝|退一步海闊天空|舉棋不定，不如不下|起手無回大丈夫|棋逢對手，將遇良才|旗鼓相當，好看！|運籌帷幄，決勝千里|調兵遣將中…|以退為進|欲擒故縱|圍點打援|投鼠忌器|臨危不亂|背水一戰！|破釜沉舟！|置之死地而後生|出其不意，攻其不備|兵不厭詐|一鼓作氣|勢如破竹|步步緊逼|穩紮穩打|後發制人|避實擊虛|以逸待勞|打草驚蛇可不好|順手牽羊也算一招|將計就計|中炮開局最常見|跳馬護住中兵|車要早點出動|挺兵可以讓馬活起來|飛相讓陣形更穩|補士加強防守|屏風馬攻守兼備|過宮炮也是好開局|橫車出得快|仙人指路，先探虛實|記譜要先說棋子再說位置|紅方用中文數字記譜|黑方用阿拉伯數字記譜|「進」是往前，「退」是往後|「平」是橫著走|同一條線兩個一樣的子，用前後區分|記住記譜，看古譜就不怕|複盤從第一步開始|每一步都有它的理由|好棋要記下來|楚河漢界的故事來自楚漢相爭|項羽和劉邦以鴻溝為界|所以棋盤中間叫楚河漢界|秦朝統一了文字和度量衡|漢朝的漆器紅黑配色很漂亮|三國時代英雄輩出|赤壁之戰，以少勝多|魏晉名士愛清談|竹林七賢很瀟灑|南北朝的石窟好壯觀|隋朝開鑿了大運河|唐朝已經有象棋的記載|盛唐的三彩好華麗|五代十國很亂|宋代象棋規則慢慢定型|宋朝的瓷器很雅致|元朝的青花瓷好有名|明朝出了《橘中秘》|《適情雅趣》也是明代古譜|清初的《梅花譜》講屏風馬|我現在穿這個朝代的衣服|換個朝代，我也換造型|你喜歡哪個朝代？|我最喜歡宋朝的展腳幞頭|明朝的烏紗帽帥不帥？|清朝的官帽有紅纓|秦朝的冕冠有珠簾|三國的戰盔好威風|唐朝的幞頭有兩條飄帶|元朝的皮帽好保暖|今天練一題殘局吧|棋力測驗可以看你現在的程度|錯棋重練幫你記住教訓|古譜裡有很多寶藏|大師對局可以學思路|觀戰也能學到東西|線上大廳可以找人下|設定裡可以換朝代棋盤|走棋音效有十種喔|語音可以選男聲女聲|你可以把我拖到角落|我可以調大小喔|設定裡可以關掉我|我會在你贏的時候跳舞|輸了我會陪你難過一下|和棋我就聳聳肩|吃子的時候我會歡呼|將軍的時候我會嚇一跳|點我一下我就表演|點兩下我就去散步|早點休息，明天再戰|下棋不要熬夜喔|起來走一走吧|喝水時間到！|今天也辛苦了|你笑起來真好看|有你陪我真開心|我們是最佳拍檔|一起加油！|今天比昨天更強了|我在偷看你的棋|我猜你下一步走車|讓我猜猜你的計畫|這盤我看好你|對方好像慌了|穩住，我們能贏|冷靜，先看全局|別急著吃子|先把子力出動|把車開出來吧|你的馬好靈活|你的炮架得真好|你的車好有氣勢|你的兵在衝鋒了|你的士象守得好|你的帥很安全|對方的將有點危險|對方的車被困住了|對方少了一個子|局面越來越好了|我是第一次當棋子小人|做棋子也是很辛苦的|站在棋盤上腳好痠|我想去河對面看看|小兵過河後好自由|我不能過河，因為我是帥|帥只能待在九宮|九宮就是我的小房間|出了九宮我會迷路|我和士是好朋友|象棋有紅黑兩方|紅方先走是規矩|紅方的字和黑方不一樣|帥對將，仕對士|相對象，俥對車|傌對馬，炮對砲|兵對卒|三十二顆子，各有各的本事|最弱的兵也能將死對方|每顆子都很重要|沒有不能輸的棋手|大師也會輸棋|輸棋的時候最能學到東西|贏棋也要檢討|好的對手是最好的老師|多和比你強的人下|也可以和電腦練習|每天一盤，進步一點|下棋讓腦袋更靈活|保持好奇心|這個開局我好像看過|這是書上的變化|這步有點冷門|這步很有創意|你走出新招了！|這步值得記下來|這是陷阱，小心！|看起來是送子，其實是妙著|有時候不走也是一種走法|等著，等對方犯錯|今天的運氣站在你這邊|手感不錯喔|有點累就休息|心靜才能下好棋|深呼吸，再下一步|別想太多，相信直覺|也別太衝動|三思而後行|眼觀四路，耳聽八方|顧好後方|你知道嗎？象棋盤有九十個交叉點|棋子都是走在交叉點上|河界上沒有格線|九宮裡有斜線|士和帥只能在九宮|象不能過河|馬會被蹩腳|象會被塞眼|炮翻山要剛好隔一個|車可以一口氣走到底|兵在自己這邊只能往前|過了河才能左右走|兵永遠不能後退|所以兵一去不回頭|帥和將不能面對面|中間有子擋著才可以|這叫做對面笑的規則|長將是不允許的|長捉也不行喔|不能一直重複同一招|哈囉～|在嗎？|我來了！|嘿，看這邊|想我了嗎？|我剛剛在睡覺|伸個懶腰再出發|今天也很有精神|我充飽電了|準備好了！|哇，好精彩|哎呀！|好可惜|差一點點|這樣也行！|原來還有這招|學到了學到了|太神了吧|我看傻眼了|給你一百分！|你是天才吧|你是怎麼想到的？|再來一次給我看|我要拜你為師|師父請受我一拜|徒兒記住了|大師風範！|這就是實力|穩穩的勝利|完美的一盤|我最怕對方的雙車|對方的炮好可怕|小心對方的馬|那個卒有點煩|黑方在偷偷佈局|紅方要主動出擊|攻守要平衡|有攻有守才厲害|只攻不守會被偷襲|只守不攻贏不了|一盤棋就像一場旅行|每一步都是新的風景|輸贏是結果，過程更重要|享受下棋的樂趣|棋盤上見真章|下棋看人品|勝不驕，敗不餒，再來！|今天的你比昨天更好|謝謝你陪我下棋|明天見，棋友！|開局三要：出子、佔位、顧中|子力要協調|別讓棋子擠在一起|車馬炮要互相照應|活子比死子重要|子力位置比數量重要|攻擊要集中力量|防守要先補弱點|弱點就是對方的目標|找到對方的弱點|中局是最精彩的時候|殘局要比耐心|算清楚再兌子|多兌子對多子的一方有利|少子就要想辦法搶攻|形勢不好就穩住|形勢好就簡化|別在優勢時大意|劣勢也有翻盤機會|堅持到最後一步|這步棋很有大局觀|你看得好遠|你是不是偷偷練過？|這招連我都沒想到|再一步就成殺了|小心對方反撲|守住這一波就贏了|現在要果斷|機會來了！|不要放過這個機會".split("|");
  let ALL=LINES.concat(EXTRA);
  const cut=(t,n)=>{t=String(t||"").split("。")[0];return t.length>n?t.slice(0,n-1)+"…":t};
  (async()=>{try{const t=await fetch("data/terms.json").then(r=>r.json());for(const x of t.items||[])ALL.push(`術語小教室：「${x.n}」——${cut(x.d,40)}`)}catch(e){}
    try{const b=await fetch("data/gmbios.json").then(r=>r.json());for(const x of Array.isArray(b)?b:Object.values(b)){if(!x||!x.zh||/撤銷/.test(x.bio||"")||x.revoked)continue;
      if(x.gm)ALL.push(`你知道嗎？${x.zh}在 ${x.gm} 年獲授特級大師`);if(x.titles&&x.titles[0])ALL.push(`${x.zh}拿過「${cut(x.titles[0],26)}」`);
      if(x.from)ALL.push(`${x.zh}：${cut(x.from,24)}`);if(x.style)ALL.push(`${x.zh}的棋風：${cut(x.style,26)}`)}}catch(e){}})();
  // 意見回饋 252：公園阿伯下棋的有趣故事（1001 則，data/qa/park-tales.txt，一行一則）：平常講話大約每 3 句穿插 1 則，講過的記住，全部講完才重來
  let TALES=[];fetch("data/qa/park-tales.txt").then(r=>r.ok?r.text():"").then(t=>{TALES=t.split(String.fromCharCode(10)).map(x=>x.trim()).filter(Boolean)}).catch(()=>{});
  const nextTale=()=>{let seen=new Set(store.get("botTaleSeen",[]));let pool=[];for(let i=0;i<TALES.length;i++)if(!seen.has(i))pool.push(i);
    if(!pool.length){seen=new Set();pool=TALES.map((_,i)=>i)}const i=pool[Math.random()*pool.length|0];seen.add(i);store.set("botTaleSeen",[...seen]);return TALES[i]};
  const nextLine=()=>{if(TALES.length&&Math.random()<1/3)return nextTale();let seen=new Set(store.get("botSeen",[]));let pool=[];for(let i=0;i<ALL.length;i++)if(!seen.has(i))pool.push(i);
    if(!pool.length){seen=new Set();pool=ALL.map((_,i)=>i)}const i=pool[Math.random()*pool.length|0];seen.add(i);store.set("botSeen",[...seen]);return ALL[i]};
  let hintN=0;const HINTS=["長按我，可以問我象棋問題喔！","有問題嗎？長按我就好～","長按我：開局、殺法、棋手、棋譜都可以問"];
  const COMBO=[];for(let i=0;i<ARM.length&&COMBO.length<300;i++)for(let j=0;j<BODY.length&&COMBO.length<300;j++)COMBO.push([i,j]);
  const FACES=["smile","open","smile","wink","smile","open"];
  const comboAct=n=>{const[i,j]=COMBO[n],a=ARM[i],b=BODY[j];return{d:2.4,k:"c"+n,name:a[0]+(b[0]?"＋"+b[0]:""),get say(){return ++hintN%9===0?HINTS[(hintN/9|0)%HINTS.length]:nextLine()},f:(p,B)=>{a[1](p,B);b[1](p,B);B.face=FACES[n%FACES.length]}}};

  /* 意見回饋 367、369：經典朝代的小帥換成 Gemini 手繪版（data/xs/：24 個姿勢＋8 張走路圖，xs.json 記每張身體圓面的位置，貼玩家選的棋子字）；
     其他朝代的手繪服裝還沒畫，先用 3D 版。每個 3D 動作對到最接近的手繪姿勢，跳舞類的兩張輪流換 */
  for(const k in ACTS)ACTS[k].k=k;
  const XS_MAP={wave:"wave",jump:"jump",cheer:"cheer",think:"think",bow:"bow",clap:"clap",point:"point",sleep:"sleep",shrug:"shrug",flex:"flex",shock:"surprise",lose:"sad",draw:"gongshou",nap:"sleep",
    roll:"jump",prop:"point",liewave:"wave",laugh:"laugh",hattip:"hattip",gongshou:"gongshou",heart:"heart",kiss:"heart",lookout:"think",scratch:"think",belly:"laugh",knock:"point",stretch:"cheer",
    thumbs2:"thumbs",headstand:"jump",pushup:"flex",carry:"surprise"};
  const XS_DUO={dance:["dance1","dance2"],spin:["dance1","dance2"],kick:["dance1","jump"],taichi:["dance2","gongshou"],win:["cheer","jump"]};
  const XS_COMBO=["wave","clap","point","thumbs","heart","hattip","gongshou","fan_open","fan_closed","tea","laugh","flex","dance1","dance2","cheer","think","bow","thumbs"];
  const xsPose=(a,now)=>{if(!a||!a.k)return"xs_idle";const k=a.k;if(k[0]==="c"&&/^c\d+$/.test(k))return"xs_"+XS_COMBO[+k.slice(1)%XS_COMBO.length];
    const duo=XS_DUO[k]||(/^d_/.test(k)?["dance1","dance2"]:null);if(duo)return"xs_"+duo[Math.floor(now/380)%2];return"xs_"+(XS_MAP[k]||"idle")};
  /* 意見回饋 492（開發者）：畫面上的小人要跟玩家在「選你的角色」選的一樣——男生＝小帥、女生＝小帥妹；Q 版用手繪動作圖，真實版用 Tripo 做的 3D 模型 */
  const meSex=()=>store.get("pSex","m")==="f"?"f":"m",meReal=()=>store.get("pStyle","q")==="real";
  let TRIPO_META=null;const tripoMeta=()=>TRIPO_META||(TRIPO_META=fetch("data/tripo_app/tripo.json").then(r=>r.ok?r.json():{}).catch(()=>({})));
  const girlNV=()=>{const C=CUS["me:girl"]||{};return{hat:C.hat,hc:C.hc,robe:C.ring,band:C.band,shoe:C.shoe,belt:C.belt,skin:C.skin,top:C.top,pin:C.pin,band2:C.band2,cus:C}};
  const buildMe=(k,gr)=>{const B=build(k,gr,meSex()==="f"?girlNV():null);
    /* 開發者 11/5：選了武俠角色（pChar），用那位的 Tripo 模型 */
    const ch=(()=>{const c=store.get("pChar","");return /^x_/.test(c||"")?c:""})();
    if(meReal()||ch){const id=ch||(meSex()==="f"?"me_girl":"me_boy");tripoMeta().then(M=>{if(M&&M[id])attachGLB(B,{glb:"data/tripo_app/"+id+".glb",ring:M[id]})})}return B};
  function start(){let SC=Math.min(2,Math.max(.6,+store.get("botSize",.7)||1)),W=W0*SC,H=H0*SC,curK=eraK(),curP=BP();
    const box=document.createElement("div");box.className="xqbot";
    box.style.cssText=`position:fixed;left:0;top:0;width:${W}px;height:${H}px;z-index:900;pointer-events:none;will-change:transform;transition:opacity .2s`;
    const hit=document.createElement("div");hit.style.cssText="position:absolute;left:19%;right:19%;top:10%;bottom:3%;pointer-events:auto;touch-action:none;cursor:grab;border-radius:40%;-webkit-touch-callout:none;-webkit-user-select:none;user-select:none";
    const bub=document.createElement("div");bub.style.cssText="position:absolute;left:50%;top:-4px;transform:translate(-50%,-100%);max-width:230px;width:max-content;background:#fffdf7;color:#3a2618;border:2px solid #3a2618;border-radius:14px;padding:4px 10px;font:700 13px/1.35 sans-serif;text-align:center;box-shadow:0 2px 6px #0003;opacity:0;transition:opacity .25s;pointer-events:none";
    box.append(hit,bub);document.body.appendChild(box);
    let rd;try{rd=new T.WebGLRenderer({alpha:true,antialias:true})}catch(e){box.remove();return null}
    rd.setPixelRatio(Math.min(3,window.devicePixelRatio||1));rd.setSize(W,H);rd.domElement.style.cssText="display:block;width:100%;height:100%;pointer-events:none";box.insertBefore(rd.domElement,hit);
    if(T.SRGBColorSpace)rd.outputColorSpace=T.SRGBColorSpace;
    const XS={meta:null,ims:{},on:false,cur:"",wrap:null,img:null,gly:null,sex:null,sets:{}};
    {const w=document.createElement("div");w.style.cssText="position:absolute;inset:0;display:none;pointer-events:none";const im=document.createElement("img");im.alt="";im.draggable=false;
      im.style.cssText="position:absolute;left:50%;bottom:2%;height:96%;transform:translateX(-50%);transform-origin:50% 100%;pointer-events:none;-webkit-user-select:none;user-select:none";
      const gl=document.createElement("div");gl.style.cssText="position:absolute;display:flex;align-items:center;justify-content:center;border-radius:50%;background:#F7EFDD;font-family:'Noto Serif TC','Songti TC',serif;font-weight:900;pointer-events:none;line-height:1";
      w.append(im,gl);box.insertBefore(w,hit);XS.wrap=w;XS.img=im;XS.gly=gl;
}
    const xsLoad=()=>{const sx=meSex();if(XS.sex===sx)return;XS.sex=sx;const set=XS.sets[sx];if(set&&set.meta){XS.meta=set.meta;XS.ims=set.ims;xsMode();return}
      XS.meta=null;XS.ims={};xsMode();if(set)return;const S=XS.sets[sx]={meta:null,ims:{}},dir=sx==="f"?"data/xs/girl/":"data/xs/";
      fetch(dir+"xs.json").then(r=>r.ok?r.json():null).then(m=>{if(!m||stopped)return;let n=0;const names=Object.keys(m.poses);
        for(const k of names){const i=new Image();i.decoding="async";i.onload=()=>{if(++n===names.length){S.meta=m;if(XS.sex===sx){XS.meta=m;XS.ims=S.ims;xsMode()}}};i.onerror=()=>{delete XS.sets[sx]};i.src=dir+k+".webp";S.ims[k]=i}}).catch(()=>{delete XS.sets[sx];if(XS.sex===sx)XS.sex=null})};   /* 意見回饋 497：抓不到就下次再抓，不要卡在舊的樣子 */
    const xsMode=()=>{const on=!!XS.meta&&!meReal();   /* 意見回饋 384：每個朝代都用手繪版（各朝代的手繪服裝畫好以前，先穿經典的） */XS.on=on;XS.wrap.style.display=on?"":"none";rd.domElement.style.visibility=on?"hidden":"";XS.cur=""};
    const xsDraw=(pose,bob,flip)=>{const m=XS.meta;if(!m.poses[pose]||!XS.ims[pose])pose="xs_idle";const bz=box.clientWidth+"x"+box.clientHeight+"|"+BP();if(bz!==XS.bz){XS.bz=bz;XS.cur=""}   /* 意見回饋 539：換了棋子（例如選「車」）也要馬上重寫身上的字 */   /* 意見回饋 533：小人變大變小（設定裡調大小、版面改變）時，身上的字也要重新對準圓面，不能停在舊位置 */if(pose!==XS.cur){XS.cur=pose;XS.img.src=XS.ims[pose].src;
        const f=m.poses[pose],ih=box.clientHeight*.96,iw=ih*m.w/m.h,left=(box.clientWidth-iw)/2,top=box.clientHeight*.98-ih,R=f.r*iw*.82,ch=BP();
        Object.assign(XS.gly.style,{left:(left+f.cx*iw-R)+"px",top:(top+f.cy*ih-R)+"px",width:2*R+"px",height:2*R+"px",fontSize:(R*1.25)+"px",color:"帥仕相俥傌炮兵".includes(ch)?"#C8102E":"#1E1A16"});XS.gly.textContent=ch}
      const tf=`translateY(${(-bob).toFixed(1)}px)`;XS.img.style.transform="translateX(-50%) "+tf+(flip?" scaleX(-1)":"");XS.gly.style.transform=tf};
    const sc=new T.Scene(),cam=new T.PerspectiveCamera(30,W/H,.1,50);cam.position.set(0,1.5,7.3);cam.lookAt(0,1.18,0);
    sc.add(new T.HemisphereLight(0xfff3e0,0x5a3a22,1.1));
    const key=new T.DirectionalLight(0xfff0dc,1.5);key.position.set(2.5,4,5);sc.add(key);
    const fill=new T.DirectionalLight(0xbcd4ff,.7);fill.position.set(-4,1.5,3);sc.add(fill);
    const rim=new T.DirectionalLight(0xffffff,1.4);rim.position.set(-1,3,-5);sc.add(rim);
    const P=buildMe(curK,grade()),root=new T.Group();root.add(P.bot);sc.add(root);const B=Object.assign(P,{root,closed:0,face:"smile"});
    const shd=new T.Mesh(new T.CircleGeometry(.8,32),new T.MeshBasicMaterial({color:0,transparent:true,opacity:.2}));shd.rotation.x=-PI/2;shd.position.y=.02;sc.add(shd);
    const bounds=()=>({x0:0,x1:innerWidth-W,y0:20,y1:innerHeight-H});
    const sp=store.get("botPos",null);let parked=!!sp,x=sp?sp.x*innerWidth:Math.max(4,innerWidth-W-16),y=sp?sp.y*innerHeight:Math.max(70,innerHeight-H-90);
    let quietT=0,tx=x,ty=y,face=0,act=null,actT=0,next=1.5,bubT=0,stopped=false,last=performance.now(),acc=0,blinkT=2,talk=0,drag=null,taps=0,tapT=0,deck=[],boardMode=false,boardDrag=false,sheetMode=false;
    /* 11/11 模擬玩家問題 2（AI 模擬玩家 5/5 都被小帥擋到）：小帥和泡泡不能蓋到可點的東西、棋盤、說明文字。
       KO＝「禁區」清單（畫面座標的長方形，每 0.5 秒量一次，見 koScan）；小帥站的位置、泡泡放哪一邊都用它算重疊面積。
       hid＝找不到空位、暫時藏起來（點擊穿過去）；dim＝玩家自己拖到這裡（這一頁照放）但蓋到東西＝變淡、點擊穿過去；szK＝空位不夠時縮小（0.6 倍）貼到角落；
       dodge＝正在快步閃開（停放的小帥也會走）；userHold＝玩家在這一頁拖放過，換頁才再自動閃。quietTxt＝畫面上有說明文字或棋盤（冷知識、將軍等自動台詞不冒泡泡） */
    let KO=[],quietTxt=false,hid=false,dim=false,szK=1,dodge=false,userHold=false;
    const KO_C='button,a[href],input,select,textarea,label,summary,.chip,.btn,[role=button],[onclick],.shp-spot,.shp-hs,.po-sight,[data-hs],#sndPill,#topbar,#acts,#pTop,#pBot,h1,h2,h3',
      KO_B='#bbox,.boardbox,svg[viewBox="0 0 560 620"]',KO_T='.note,.lsn-note,.card,.status,#stat,.evline,.modal .box,#sheet,.sheet,p,.muted,.cr-sec,[data-bot-avoid]';   /* KO_C 只當禁區；KO_B（棋盤）、KO_T（說明文字）也當禁區，而且畫面上有它們＝安靜（自動台詞不冒泡泡）。標題列的 h1 放 KO_C，不然每頁都算安靜 */
    const koVis=e=>{try{if(e.checkVisibility)return e.checkVisibility({opacityProperty:true,visibilityProperty:true});const s=getComputedStyle(e);return s.visibility!=="hidden"&&s.opacity!=="0"}catch(_){return true}};   /* 舊版 Safari 沒有 checkVisibility：只看自己的 visibility／opacity */
    const bVis=()=>{try{return box.checkVisibility?box.checkVisibility({visibilityProperty:true}):getComputedStyle(box).visibility!=="hidden"}catch(_){return true}};
    const koScan=()=>{const vw=innerWidth,vh=innerHeight,A=vw*vh,o=[];let q=false;
      const add=(sel,k)=>{let L;try{L=document.querySelectorAll(sel)}catch(_){return}for(const e of L){if(e.closest(".xqbot"))continue;const r=e.getBoundingClientRect();if(r.width<2||r.height<2||r.right<=0||r.bottom<=0||r.left>=vw||r.top>=vh)continue;
        const l=Math.max(0,r.left),t=Math.max(0,r.top),R=Math.min(vw,r.right),B=Math.min(vh,r.bottom);if(k==="c"&&(R-l)*(B-t)>A*.6)continue;if(!koVis(e))continue;o.push([l-4,t-4,R+4,B+4]);if(k!=="c")q=true}};   /* 可點的東西超過畫面 6 成（整頁的點擊層）不算禁區，不然永遠沒地方站 */
      add(KO_B,"b");add(KO_T,"t");add(KO_C,"c");KO=o;quietTxt=q};
    const koCost=(l,t,r,b)=>{let c=0;for(const q of KO){const ix=Math.min(r,q[2])-Math.max(l,q[0]),iy=Math.min(b,q[3])-Math.max(t,q[1]);if(ix>0&&iy>0)c+=ix*iy}return c};
    const bodyCost=(bx,by,w,h)=>koCost(bx+w*.19,by+h*.08,bx+w*.81,by+h*.98);   /* 小人身體大約佔框的中間 62%、上面留 8% */
    // 泡泡不超出畫面左右（小帥站在邊邊時往內移）；小帥會走動，所以泡泡顯示期間每幾格重新算
    /* 11/11 問題 2：泡泡依序試 頭上、頭上偏左／偏右、身體左邊、右邊、腳下，挑第一個不蓋到禁區的；都蓋到就挑蓋得最少的（c＝重疊面積） */
    let bubDx=0,bubDy=0,fitN=0;
    const bubPlace=()=>{const bw=bub.offsetWidth,bh=bub.offsetHeight,vw=innerWidth,vh=innerHeight;if(!bw||!bh)return{dx:0,dy:0,c:0};let best=null;
      for(const[d0,dy]of[[0,0],[-bw/3,0],[bw/3,0],[-(W*.32+bw/2),bh+H*.25],[W*.32+bw/2,bh+H*.25],[0,bh+H+8]]){const L=Math.max(6,Math.min(vw-6-bw,x+W/2+d0-bw/2)),T=y-4-bh+dy;if(T<4||T+bh>vh-4)continue;
        const c=koCost(L,T,L+bw,T+bh),dx=L+bw/2-(x+W/2);if(!best||c<best.c)best={dx,dy,c};if(!c)break}
      return best||{dx:0,dy:0,c:1e9}};
    const fitBub=()=>{try{const p=bubPlace();if(Math.abs(p.dx-bubDx)>.5||Math.abs(p.dy-bubDy)>.5){bubDx=p.dx;bubDy=p.dy;bub.style.transform=`translate(calc(-50% + ${Math.round(p.dx)}px),calc(-100% + ${Math.round(p.dy)}px))`}return p}catch(e){return{c:0}}};
    /* auto：1＝自己冒的話（閒聊、冷知識、將軍／吃子反應）——畫面上有說明文字、棋盤，或泡泡放哪都會蓋到東西，就不冒；2＝勝負、第一次打招呼——只看泡泡放不放得下。
       ext＝別的模組叫 BOT.say（提示、問答、提醒）：一定要讓玩家看到；小帥正暫時藏起來時改用 toast。回傳有沒有真的說出來 */
    const say=(s,d,lbl,auto,ext)=>{s=String(s).replace(/小帥/g,BNAME()).replace("身體是一顆帥","身體是一顆"+BP());const vis=bVis();
      if(auto){if(!vis)koScan();if(auto===1&&(boardMode||quietTxt))return false;if(vis&&hid)return false}
      if(vis&&hid&&ext){try{if(typeof toast==="function")toast(s)}catch(e){}if(!lbl)try{window.dispatchEvent(new CustomEvent("xq-bot-said",{detail:s}))}catch(e){}return true}
      const old=bub.textContent;bub.textContent=s;const p=vis?fitBub():{c:0};if(auto&&p.c>0){bub.textContent=old;if(bubT>0)fitBub();return false}
      bub.style.opacity=1;bubT=d||2;talk=Math.min(1.2,.25+s.length*.08);if(!lbl)try{window.dispatchEvent(new CustomEvent("xq-bot-said",{detail:s}))}catch(e){}return true};   /* 回饋 804：動作本身的小標（♪ 舞名、嗨！之類）只在小帥自己的泡泡閃一下，不送出 xq-bot-said（走路角色的泡泡、問答記錄只收真正的話：提示、棋語、冷知識） */
    const doAct=(a,auto)=>{if(typeof a==="string")a=ACTS[a];if(!a)return;act=a;actT=0;tx=x;ty=y;dodge=false;const lbl=!(Object.getOwnPropertyDescriptor(a,"say")||{}).get,w=auto===1&&(boardMode||quietTxt||hid)?null:a.say;   /* 不會冒泡泡時先不抽台詞，冷知識不會白白用掉 */if(w)say(w,w.length>26?Math.min(10,w.length*.17+.8):Math.max(1.8,Math.min(6,w.length*.16+.6,a.d+3)),lbl,auto)};
    // 抽牌：300 種組合＋招牌動作洗牌後輪流出，不會一直重複
    const randAct=()=>{if(!deck.length){deck=[...COMBO.keys(),...SIGNATURE];for(let i=deck.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[deck[i],deck[j]]=[deck[j],deck[i]]}}const k=deck.pop();return typeof k==="number"?comboAct(k):ACTS[k]};
    const wander=()=>{if(parked||boardMode||sheetMode||hid)return;const L=spots(W,H);if(!L.length)return;const f=L[Math.random()*L.length|0];tx=f[0];ty=f[1]};   /* 11/11 問題 2：散步只挑不蓋到禁區的地方 */
    /* 不蓋到禁區的站位（框左上角）：整個畫面每隔 1/3 個小人掃一遍 */
    const spots=(w,h)=>{const vw=innerWidth,vh=innerHeight,x1=Math.max(0,vw-w),y0=20,y1=Math.max(y0,vh-h),sx=Math.max(12,w/3),sy=Math.max(12,h/3),P=[];
      for(let yy=y1;yy>=y0;yy-=sy)for(let xx=x1;xx>=0;xx-=sx)if(!bodyCost(xx,yy,w,h))P.push([xx,yy]);for(const p of[[0,y1],[x1,y0],[0,y0]])if(!bodyCost(p[0],p[1],w,h))P.push(p);return P};
    const nearest=(L,px,py)=>{let b=null,bd=1e18;for(const p of L){const d=(p[0]-px)*(p[0]-px)+(p[1]-py)*(p[1]-py);if(d<bd){bd=d;b=p}}return b};
    const reset=()=>{root.position.y=0;root.position.x=0;P.bot.rotation.set(0,0,0);P.hat.position.set(0,0,0);P.hat.rotation.set(0,0,0);P.torso.scale.y=1;root.rotation.set(0,face,0);P.torso.position.y=1.02;P.torso.rotation.set(0,0,0);P.head.rotation.set(0,0,0);B.closed=0;B.face="smile";
      R(B,0,0,0,-.3);R(B,1,0,0,.3);P.legs[0].rotation.set(0,0,0);P.legs[1].rotation.set(0,0,0)};
    function frame(now){if(stopped)return;requestAnimationFrame(frame);if(document.hidden){last=now;return}
      const dt=Math.min(.1,(now-last)/1000);last=now;acc+=dt;if(acc<1/30)return;const t=acc;acc=0;
      reset();const dx=tx-x,dy=ty-y,dist=Math.hypot(dx,dy);let walking=false;if(dist<=2)dodge=false;
      if(drag){ACTS.carry.f(0,B,now/1000)}
      else if(act){actT+=t;const p=Math.min(1,actT/act.d);act.f(p,B,now/1000);if(p>=1){act=null;next=2+Math.random()*4}}
      else if(dist>2&&(!parked||boardMode||sheetMode||celeb||dodge)){walking=true;const s=(celeb?900:sheetMode||dodge?480:70)*t,k=Math.min(1,s/dist);x+=dx*k;y+=dy*k;
        const want=Math.abs(dx)>4?(dx>0?.9:-.9):0;face+=(want-face)*Math.min(1,t*6);root.rotation.y=face;
        const w=Math.sin(now/110);P.legs[0].rotation.x=.6*w;P.legs[1].rotation.x=-.6*w;R(B,0,-.5*w);R(B,1,.5*w);root.position.y=Math.abs(Math.cos(now/110))*.08}
      else{face+=(0-face)*Math.min(1,t*4);root.rotation.y=face;P.torso.position.y=1.02+.015*Math.sin(now/500);
        next-=t;if(next<=0){if(!parked&&Math.random()<.4){wander();next=1}else if(now<quietT)next=2;else doAct(randAct(),1)}}
      // 表情：眨眼、閉眼、眨單眼、講話時嘴巴開合
      blinkT-=t;const bl=blinkT<0;if(blinkT<-.12)blinkT=2+Math.random()*3;
      const F=B.face;P.eyes.forEach((e,i)=>{e.g.scale.y=B.closed||F==="happy"||(F==="wink"&&i===1)?.12:bl?.1:1;e.brow.position.y=.15+(F==="open"||F==="happy"?.03:0);
        e.brow.rotation.z=PI/2+(F==="sad"?-.45*e.s:0)});
      if(talk>0)talk-=t;const mOpen=F==="open"||F==="happy"||(F!=="sad"&&F!=="flat"&&talk>0&&Math.sin(now/70)>0);P.mouth.open.visible=mOpen;P.mouth.smile.visible=!mOpen;
      P.mouth.smile.rotation.z=F==="sad"?0:PI;P.mouth.smile.scale.y=F==="flat"?.2:1;P.mouth.smile.position.y=F==="sad"?-.06:0;
      P.tear.visible=F==="sad";if(F==="sad"){const k=(now/1400)%1;P.tear.position.set(-.2,.1-.32*k,.47);P.tear.material.opacity=.85*(1-k*.6)}
      if(bubT>0){bubT-=t;if(bubT<=0)bub.style.opacity=0;else if((++fitN&1)===0)fitBub()}
      if(!drag){const b=bounds();x=Math.min(Math.max(x,b.x0),Math.max(b.x0,b.x1));y=Math.min(Math.max(y,b.y0),Math.max(b.y0,b.y1))}
      box.style.transform=`translate(${x|0}px,${y|0}px)`;
      if(B.mixer&&!XS.on){const k0=drag?"idle":act?(GLB_ANIM_OF[act.k]||(/^d_|dance|spin/.test(act.k)?"cheer":"wave_goodbye_01")):walking?"walk":"idle",k=B.clips[k0]?k0:"idle";   /* 武俠角色：照小人正在做的事換動畫 */
        if(B.animCur!==k&&B.clips[k]){const n=B.clips[k];n.reset().fadeIn(.25).play();const o0=B.clips[B.animCur];if(o0)o0.fadeOut(.25);B.animCur=k}B.mixer.update(t)}
      if(XS.on){const pose=drag?"xs_surprise":act?xsPose(act,now):walking?"walk_"+(1+Math.floor(now/120)%8):"xs_idle",bob=act?Math.abs(Math.sin(actT*7))*H*.03:walking?0:Math.sin(now/500)*H*.006;xsDraw(pose,bob,false)}else rd.render(sc,cam)}
    requestAnimationFrame(frame);
    if(!store.get("botHint",false)){setTimeout(()=>{if(!stopped){doAct("wave",2);if(say(window.XQ_MELINE&&window.XQ_MELINE("me")?"嗨！我是"+window.XQ_MELINE("me")+"。長按我，可以問小帥任何象棋問題！":"嗨！我是小帥。長按我，可以問我任何象棋問題！",5,0,2))store.set("botHint",true)}},1800)}   /* 11/11 問題 2：泡泡放不下（畫面滿是說明、按鈕）就先不打招呼，下次開 App 再說 */
    // 點／拖小人：事件只給小人，不會穿到後面的按鈕
    const stop=e=>{e.stopPropagation();if(e.cancelable)e.preventDefault()};
    hit.addEventListener("pointerdown",e=>{stop(e);try{hit.setPointerCapture(e.pointerId)}catch(_){}drag={sx:e.clientX,sy:e.clientY,ox:x,oy:y,moved:false,touch:e.pointerType==="touch"};act=null;
      // 長按＝問問題（意見回饋 169）
      const d0=drag;d0.lp=setTimeout(()=>{if(drag===d0&&!d0.moved){d0.long=true;doAct("think");say("你想問什麼？",2);try{navigator.vibrate&&navigator.vibrate(15)}catch(_){}try{window.dispatchEvent(new CustomEvent("xq-bot-ask"))}catch(_){}}},500)});
    hit.addEventListener("pointermove",e=>{if(!drag)return;stop(e);const dx=e.clientX-drag.sx,dy=e.clientY-drag.sy;if(!drag.moved&&Math.hypot(dx,dy)<(drag.touch?10:6))return;
      if(!drag.moved){drag.moved=true;clearTimeout(drag.lp);hit.style.cursor="grabbing";say("哇～飛起來了！",1.5)}x=drag.ox+dx;y=drag.oy+dy;tx=x;ty=y});
    // iPhone 長按時系統會先送 pointercancel（意見回饋 173）：還沒拖動就不當成放開，等手指真的離開（touchend）
    const up=e=>{if(!drag)return;if(e.type==="pointercancel"&&!drag.moved)return;stop(e);const d=drag;drag=null;hit.style.cursor="grab";clearTimeout(d.lp);if(d.long)return;
      if(d.moved&&boardMode){const b=bounds();x=Math.min(Math.max(x,b.x0),b.x1);y=Math.min(Math.max(y,b.y0),b.y1);tx=x;ty=y;boardDrag=true;say("好，我待在這裡看",1.8);next=4;return}
      if(d.moved){const b=bounds();x=Math.min(Math.max(x,b.x0),b.x1);y=Math.min(Math.max(y,b.y0),b.y1);tx=x;ty=y;parked=true;userHold=true;store.set("botPos",{x:x/innerWidth,y:y/innerHeight});say("我在這裡等你（點兩下我會去散步）",2.6);next=4;return}
      // 點一下＝表演、點兩下＝去散步（停放時）；長按＝問問題
      taps++;clearTimeout(tapT);tapT=setTimeout(()=>{const n=taps;taps=0;
        if(n>=3){doAct("bow");say("我先去休息囉～",1.4);setTimeout(()=>{try{window.dispatchEvent(new CustomEvent("xq-bot-hide"))}catch(e){}},900);return}   /* 意見回饋 401：點三下隱藏小帥 */
        if(n>=2&&parked){parked=false;store.set("botPos",null);say("出去走走～",1.6);wander()}
        else doAct(randAct())},380)};
    hit.addEventListener("pointerup",up);hit.addEventListener("pointercancel",up);
    /* 意見回饋 383：兩指捏合放大縮小小帥——一指按住小帥，另一指放在畫面任何地方，張開／捏合（0.6～2 倍，會記住） */
    const pts=new Map();let pinch=null;
    hit.addEventListener("pointerdown",e=>{pts.set(e.pointerId,{x:e.clientX,y:e.clientY})});
    const pDown=e=>{if(!pts.size||pts.has(e.pointerId))return;pts.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pts.size===2&&!pinch){const[a,b]=[...pts.values()];
        pinch={d:Math.max(20,Math.hypot(a.x-b.x,a.y-b.y)),s:SC};if(drag){clearTimeout(drag.lp);drag=null}e.preventDefault()}};
    const pMove=e=>{const q=pts.get(e.pointerId);if(!q)return;q.x=e.clientX;q.y=e.clientY;if(!pinch||pts.size<2)return;e.preventDefault();const[a,b]=[...pts.values()];
        const v=Math.min(2,Math.max(.6,pinch.s*Math.max(20,Math.hypot(a.x-b.x,a.y-b.y))/pinch.d));if(Math.abs(v-SC)>.02){setScale(v)}};
    const pUp=e=>{if(!pts.delete(e.pointerId))return;if(pinch&&pts.size<2){pinch=null;pts.clear();say("這樣大小剛好！",1.4)}};
    window.addEventListener("pointerdown",pDown,{capture:true,passive:false});window.addEventListener("pointermove",pMove,{capture:true,passive:false});
    window.addEventListener("pointerup",pUp,true);window.addEventListener("pointercancel",pUp,true);
    for(const ev of["click","dblclick","touchstart","mousedown","mouseup","contextmenu","selectstart"])hit.addEventListener(ev,stop,{passive:false});
    hit.addEventListener("touchend",e=>{stop(e);if(drag)up(e)},{passive:false});hit.addEventListener("touchcancel",e=>{if(drag&&!drag.moved&&!drag.long){clearTimeout(drag.lp);drag=null}},{passive:true});
    const onCall=e=>{const s=e.detail;if(s==="將軍")doAct("shock",1);else if(s==="吃"){doAct("cheer",1);say("吃！",1.4,0,1)}};   /* 11/11 問題 2：將軍、吃子是對局中自動冒的話：有棋盤就只做動作、不冒泡泡 */
    window.addEventListener("xq-call",onCall);
    // 勝負：贏了開心跳、輸了難過掉眼淚、和棋聳聳肩
    const pick=a=>a[Math.random()*a.length|0],ML=k=>{try{return window.XQ_MELINE?window.XQ_MELINE(k):null}catch(e){return null}};   /* 意見回饋 668：扮演雲河七星時，贏輸和說自己的台詞 */
    const onResult=e=>{const r=e.detail;quietT=performance.now()+20000;setTimeout(()=>{if(r==="win"){doAct("win",2);say(ML("win")||pick(["我們贏了！🏆","太厲害了！","勝利！耶～","你是冠軍！","贏啦贏啦！"]),5,0,2)}
      else if(r==="lose"){doAct("lose",2);say(ML("lose")||pick(["嗚嗚…輸了","好可惜…","沒關係，再來一盤！","下次一定贏！","我陪你複盤吧"]),5,0,2)}
      else{doAct("draw",2);say(ML("draw")||pick(["和棋～勢均力敵","握手言和！","平分秋色","不分勝負！"]),5,0,2)}},400)};
    window.addEventListener("xq-result",onResult);
    // 有棋盤的畫面（看棋譜、對戰、練習）：自動走到右下角，不擋棋盤（意見回饋 168）；在這個畫面拖過就照使用者放的位置
    const bigBoard=()=>{let best=null;for(const e of document.querySelectorAll(KO_B)){if(e.closest(".xqbot"))continue;const r=e.getBoundingClientRect();
      if(r.width>220&&r.bottom>40&&r.top<innerHeight-40&&(!best||r.width>best.width))best=r}return best};
    // 有對話框（意見回饋、問小帥…）打開時：閃到對話框上方；上面空間不夠就先躲起來（意見回饋 177）
    const sheetRect=()=>{const e=document.querySelector("#sheet,.modal .box");if(!e)return null;const r=e.getBoundingClientRect();return r.height&&r.top<innerHeight-30?r:null};
    /* QA P2-2：小帥常蓋住按鈕、棋盤、對話框。
       11/11 模擬玩家問題 2 改寫（原本只抽查身上 5 個點底下是不是按鈕，點到的若是透明的上層、說明文字、平面棋盤的棋子層就當成空地，所以會站在棋盤、實驗說明、練功房標籤上）：
       改用禁區長方形（koScan）算整個身體的重疊面積。每 0.5 秒：想站的地方（停放位置／有棋盤時的右下角／正要走去的點）不蓋到禁區就照舊；
       蓋到了就快步走到最近的空位；整張畫面都沒有空位就縮成 0.6 倍、貼到離右下角最近的空位；還是沒有就暫時藏起來（點擊穿過去），有空位了再出現。
       玩家在這一頁自己拖過去放的（userHold、boardDrag）照放，只是蓋到東西時變淡、點擊穿過去，換頁後才再自動閃。 */
    let dodgeN=0;
    const baseK=()=>boardMode?.6:1;
    const setK=k=>{if(k===szK)return;szK=k;shrink=baseK()*k;applySize()};
    const dodgeTick=()=>{if(!bVis()){hid=false;dim=false;return}koScan();if(drag)return;
      if(userHold||boardDrag){hid=false;dim=bodyCost(x,y,W,H)>0;return}dim=false;
      const k0=baseK(),w0=W0*SC*k0,h0=H0*SC*k0,vw=innerWidth,vh=innerHeight;let want=null;
      if(boardMode)want=[vw-w0-2,vh-h0-64];else if(parked){const p=store.get("botPos",null);if(p)want=[p.x*vw,p.y*vh]}
      if(!want)want=Math.hypot(tx-x,ty-y)>2?[tx,ty]:[x,y];
      want=[Math.min(Math.max(0,want[0]),Math.max(0,vw-w0)),Math.min(Math.max(20,want[1]),Math.max(20,vh-h0))];
      let k=1,p=null;
      if(!bodyCost(want[0],want[1],w0,h0))p=want;
      else{const L=spots(w0,h0);if(L.length)p=nearest(L,want[0],want[1]);else{const L2=spots(w0*.6,h0*.6);if(L2.length){k=.6;p=nearest(L2,vw,vh)}}}
      if(!p){if(!hid){hid=true;bub.style.opacity=0;bubT=0}return}
      const was=hid;hid=false;setK(k);
      if(was){x=tx=p[0];y=ty=p[1];dodge=false;return}   /* 藏著的時候直接換位置，不要從禁區上走過去 */
      if(Math.hypot(p[0]-tx,p[1]-ty)>2){tx=p[0];ty=p[1];dodge=Math.hypot(p[0]-x,p[1]-y)>2;if(dodge&&!celeb)act=null}};
    const isModal=()=>!!document.querySelector(".modal .box");
    const boardT=setInterval(()=>{if(celeb)return;const sr=sheetRect();
      if(sr){sheetMode=true;act=null;if(isModal()||sr.top-6<H+40){box.style.opacity="0";hit.style.pointerEvents="none"}else{box.style.opacity="";hit.style.pointerEvents="auto";if(!drag){tx=bounds().x1-4;ty=Math.max(0,sr.top-H)}}return}
      if(sheetMode){sheetMode=false;box.style.opacity="";hit.style.pointerEvents="auto";if(!boardMode){if(parked){const p=store.get("botPos",null);if(p){tx=p.x*innerWidth;ty=p.y*innerHeight}}else wander()}}
      const r=bigBoard();
      if(r&&!boardMode){boardMode=true;boardDrag=false;act=null;shrink=.6*szK;applySize()}
      else if(!r&&boardMode){boardMode=false;boardDrag=false;shrink=szK;applySize();box.style.opacity="";if(parked){const p=store.get("botPos",null);if(p){tx=p.x*innerWidth;ty=p.y*innerHeight}}else wander()}
      if(!(++dodgeN&1))dodgeTick();
      hit.style.pointerEvents=hid||dim?"none":"auto";
      box.style.opacity=hid?"0":dim?(boardMode?".2":".25"):boardMode&&!(act||drag||bubT>0)?".45":""},250);
    const onHash=()=>{userHold=false;boardDrag=false;bub.style.opacity=0;bubT=0};window.addEventListener("hashchange",onHash);   /* 11/11：換頁就收起泡泡（首頁的冷知識原本會跟到對局頁、蓋在工具列上） */
    // 換朝代：重做造型（字形還沒下載就先下載，好了再換一次）
    const rebuild=()=>{curK=eraK();curP=BP();root.remove(B.bot);Object.assign(B,buildMe(curK,grade()),{glb:null});root.add(B.bot);try{xsLoad();xsMode()}catch(e){}};
    // 升官慶祝（意見回饋 236）：小帥放大走到畫面正中央，金光、彩帶、「升官」字樣，約 5 秒後回原位
    let celeb=0;
    const celebrate=(g,from)=>{if(celeb)return;celeb=1;
      if(!document.getElementById("xqcelebcss")){const st=document.createElement("style");st.id="xqcelebcss";st.textContent=`
.xqc{position:fixed;inset:0;z-index:899;pointer-events:none;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding-top:12vh;background:radial-gradient(circle at 50% 55%,rgba(255,236,170,.55),rgba(40,20,5,.35) 70%);animation:xqcIn .4s ease-out both}
.xqc.out{animation:xqcOut .5s ease-in forwards}@keyframes xqcIn{from{opacity:0}}@keyframes xqcOut{to{opacity:0}}
.xqc .rays{position:absolute;left:50%;top:55%;width:160vmax;height:160vmax;margin:-80vmax 0 0 -80vmax;background:repeating-conic-gradient(rgba(255,214,90,.28) 0 7deg,transparent 7deg 18deg);animation:xqcSpin 9s linear infinite;mask:radial-gradient(circle,#000 10%,transparent 60%);-webkit-mask:radial-gradient(circle,#000 10%,transparent 60%)}
@keyframes xqcSpin{to{transform:rotate(360deg)}}
.xqc .ttl{position:relative;font:900 clamp(40px,13vw,72px)/1.1 "Noto Serif TC","PMingLiU",serif;color:#FFE38A;letter-spacing:.12em;text-shadow:0 2px 0 #8a4b00,0 0 18px rgba(255,180,40,.9),0 6px 18px rgba(0,0,0,.45);animation:xqcPop .7s cubic-bezier(.2,1.6,.4,1) both}
.xqc .sub{position:relative;margin-top:10px;font:700 clamp(17px,5vw,24px)/1.4 "Noto Sans TC",sans-serif;color:#fff;text-shadow:0 2px 8px rgba(0,0,0,.6);animation:xqcPop .7s .25s cubic-bezier(.2,1.6,.4,1) both}
.xqc .sub b{color:#FFE38A;font-size:1.25em}@keyframes xqcPop{from{opacity:0;transform:scale(.3)}}
.xqc i{position:absolute;top:-4vh;width:9px;height:15px;border-radius:2px;animation:xqcFall linear forwards}
@keyframes xqcFall{to{transform:translate(var(--dx),112vh) rotate(var(--r))}}`;document.head.append(st)}
      const ov=document.createElement("div");ov.className="xqc";ov.innerHTML=`<div class="rays"></div><div class="ttl">升　官</div><div class="sub">${RK(from)} → <b>${RK(g)}</b></div>`;
      const cols=["#E8B923","#D7263D","#2F9E5A","#2D6CDF","#F28C28","#fff"];for(let i=0;i<70;i++){const c=document.createElement("i");c.style.cssText=`left:${Math.random()*100}vw;background:${cols[i%6]};--dx:${(Math.random()-.5)*30}vw;--r:${(Math.random()-.5)*1440}deg;animation-duration:${2.6+Math.random()*2.2}s;animation-delay:${Math.random()*1.6}s`;ov.append(c)}
      document.body.append(ov);const vis=box.style.visibility,ps={x,y,parked},op=box.style.opacity;box.style.visibility="visible";box.style.opacity="";hit.style.pointerEvents="none";
      shrink=2;applySize();tx=Math.max(0,(innerWidth-W)/2);ty=Math.max(20,innerHeight*.56-H/2);act=null;
      try{navigator.vibrate&&navigator.vibrate([60,40,60,40,120])}catch(e){}
      setTimeout(()=>{doAct("cheer");say(`升官了！我現在是${RK(g)}！`,4.2)},350);setTimeout(()=>doAct("jump"),2300);setTimeout(()=>doAct("cheer"),3400);   // 勝利動作改成 5 秒後太長，升官慶祝（約 5 秒）最後一段改用歡呼
      setTimeout(()=>{ov.classList.add("out");setTimeout(()=>ov.remove(),520);shrink=(boardMode?.6:1)*szK;applySize();celeb=0;box.style.visibility=vis;box.style.opacity=op;hit.style.pointerEvents="auto";
        if(ps.parked){tx=ps.x;ty=ps.y}else wander()},5200)};
    let curG=grade(),curL=meSex()+meReal();xsLoad();
    const onLook=()=>{if(meSex()+meReal()!==curL){curL=meSex()+meReal();XS.cur="";rebuild()}else{XS.sex=null;xsLoad()}};window.addEventListener("xq-look",onLook);   /* 意見回饋 497：選完角色馬上換，不等計時器 */
    const eraT=setInterval(()=>{const g=grade();if(g!==curG){const up=g<curG,from=curG;curG=g;rebuild();if(up)celebrate(g,from);else{doAct("shrug");say(`降成${RK(g)}了…再加油！`,3.2)}}
      if(meSex()+meReal()!==curL){curL=meSex()+meReal();XS.cur="";rebuild()}
      if(eraK()!==curK||BP()!==curP){rebuild();if(typeof needGly==="function")needGly(curK,()=>{if(!stopped)rebuild()})}},1500);
    if(typeof needGly==="function"&&!(typeof GLY!=="undefined"&&GLY[curK]))needGly(curK,()=>{if(!stopped)rebuild()});
    let shrink=1;const applySize=()=>{const k=SC*shrink;W=W0*k;H=H0*k;box.style.width=W+"px";box.style.height=H+"px";rd.setSize(W,H)};
    const setScale=v=>{SC=Math.min(2,Math.max(.6,+v||1));store.set("botSize",SC);applySize();XS.cur=""};
    const onResize=()=>{const b=bounds();x=Math.min(x,b.x1);y=Math.min(y,b.y1);tx=Math.min(tx,b.x1);ty=Math.min(ty,b.y1)};window.addEventListener("resize",onResize);
    return{act:k=>doAct(typeof k==="number"?comboAct(k):k),say:(s,d,o)=>say(s,d,false,o&&o.auto?1:0,true),setScale,   /* 11/11 問題 2：BOT.say(字, 秒, {auto:1})＝這句是對局中的閒話，有說明文字或棋盤時就不冒 */rebuild,count:COMBO.length,lines:LINES.length,
      stop(){stopped=true;window.removeEventListener("pointerdown",pDown,true);window.removeEventListener("pointermove",pMove,true);window.removeEventListener("pointerup",pUp,true);window.removeEventListener("pointercancel",pUp,true);clearInterval(eraT);clearInterval(boardT);window.removeEventListener("xq-look",onLook);window.removeEventListener("xq-call",onCall);window.removeEventListener("xq-result",onResult);window.removeEventListener("resize",onResize);window.removeEventListener("hashchange",onHash);try{rd.dispose()}catch(e){}box.remove()}}}
  // 瘦長版（公園 3D 棋盤的 Pikafish）：身體窄、高，手腳往內收，戴圓眼鏡
  function thinify(B,noGlass){const tz=B.torso;tz.children.forEach(o=>{if(o===B.head||B.arms.includes(o))return;o.scale.x*=.6;o.scale.y*=1.18;o.position.y*=1.18});
    B.arms.forEach(a=>{a.position.x*=.62;a.scale.set(.85,1.1,.85)});B.legs.forEach(l=>{l.position.x*=.7;l.scale.set(.8,1.25,.8)});B.head.scale.set(.88,1.02,.9);B.head.position.y+=.08;tz.position.y+=.1;
    if(noGlass)return;const fr=new T.MeshPhysicalMaterial({color:0x1A1A1A,metalness:.6,roughness:.25,clearcoat:1}),gl=new T.MeshPhysicalMaterial({color:0xBFE3FF,transparent:true,opacity:.28,roughness:.05,clearcoat:1});
    for(const s of[-1,1]){const r=new T.Mesh(new T.TorusGeometry(.14,.022,10,28),fr);r.position.set(.19*s,.13,.5);B.head.add(r);const g=new T.Mesh(new T.CircleGeometry(.13,24),gl);g.position.set(.19*s,.13,.505);B.head.add(g)}
    const br=new T.Mesh(new T.CylinderGeometry(.015,.015,.12,8),fr);br.rotation.z=PI/2;br.position.set(0,.14,.51);B.head.add(br)}
  /* 意見回饋 418：第二款 Pikafish「冷面國手」（開發者從 6 版定裝照選的第 3 版）——頭髮梳得一絲不亂、頭頂玉簪髮髻、臉旁兩縷鬢髮，
     黑色寬袖配白色衣襬（像一顆黑子加一顆白子），右手兩指拈著一枚棋子；眉毛壓低、嘴角收平，一看就不是來亂的。不戴眼鏡 */
  function wolongify(B){const P=(c,o)=>new T.MeshPhysicalMaterial(Object.assign({color:c,roughness:.55,metalness:0,clearcoat:.35},o||{})),ink=new T.MeshBasicMaterial({color:0x2a1a10,side:T.BackSide});
    const add=(par,geo,m,pos,lw)=>{const x=new T.Mesh(geo,m);if(pos)x.position.set(...pos);par.add(x);if(lw){const l=new T.Mesh(geo,ink);l.scale.setScalar(1+lw);x.add(l)}return x};
    const BK=P("#17161A",{clearcoat:.6,roughness:.4}),WH=P("#F5F3EE"),H=P("#121010",{roughness:.45,clearcoat:.4}),JD=P("#9CCFBF",{clearcoat:1,roughness:.15}),WD=P("#C08850",{clearcoat:.8,roughness:.35});
    B.hat.children.forEach(c=>c.visible=false);B.stern=true;
    const isPhys=o=>o.isMesh&&o.material&&o.material.isMeshPhysicalMaterial;
    /* 黑色寬袖（手套留白）、白色褲腳；拿掉右手的笏板 */
    B.arms.forEach(a=>a.children.forEach(o=>{if(!isPhys(o))return;if(o.geometry.type==="BoxGeometry")o.visible=false;else if(o.geometry.type==="CapsuleGeometry")o.material=BK}));
    B.legs.forEach(l=>l.children.forEach(o=>{if(isPhys(o))o.material=o.geometry.type==="CapsuleGeometry"?WH:BK}));
    /* 腰帶黑色、拿掉品級牌 */
    B.torso.children.forEach(o=>{if(!o.isMesh)return;if(o.geometry.type==="BoxGeometry")o.material=BK;else if(o.geometry.type==="PlaneGeometry")o.visible=false});
    /* 頭髮全部往後梳：頭頂到後腦一片殼，額頭露出來 */
    const hair=add(B.head,new T.SphereGeometry(.555,36,20,0,Math.PI*2,0,Math.PI*.46),H,[0,.17,-.04],.03);hair.rotation.x=-.72;
    /* 頭頂髮髻＋玉簪 */
    add(B.head,new T.SphereGeometry(.15,20,14),H,[0,.74,-.12],.05).scale.set(1,.85,1);
    const pin=add(B.head,new T.CylinderGeometry(.018,.018,.5,10),JD,[0,.76,-.12]);pin.rotation.z=Math.PI/2;
    /* 臉旁兩縷鬢髮 */
    for(const sd of[-1,1]){const lock=add(B.head,new T.CapsuleGeometry(.035,.3,4,8),H,[.43*sd,.05,.2],.05);lock.rotation.z=-.12*sd}
    /* 右手兩指拈一枚棋子 */
    const pc=add(B.arms[1],new T.CylinderGeometry(.12,.12,.06,24),WD,[0,-.72,.14],.06);pc.rotation.x=Math.PI/2-.3;
    add(B.arms[1],new T.CircleGeometry(.085,20),WH,[0,-.72+.0,.177]).rotation.x=-.3}
  // 公園 3D 棋盤（意見回饋 212）要讓小帥坐在對面：給一個獨立的小帥模型和表情設定
  const faceApply=(P,F,blink,mOpen)=>{P.eyes.forEach((e,i)=>{e.g.scale.y=(P.stern&&F==="happy")?.7:F==="happy"||(F==="wink"&&i===1)?.12:blink?.1:1;e.brow.position.y=.15+(F==="open"||F==="happy"?.03:0);e.brow.rotation.z=PI/2+(F==="sad"?-.45*e.s:0)+(P.stern&&F!=="sad"?.28*e.s:0)});
    const o=P.stern?F==="open"&&!mOpen?false:!!mOpen:(mOpen||F==="open"||F==="happy");P.mouth.open.visible=o;P.mouth.smile.visible=!o;P.mouth.smile.rotation.z=F==="sad"?0:PI;P.mouth.smile.scale.y=F==="flat"||(P.stern&&F!=="happy")?.2:P.stern?.45:1;P.mouth.smile.position.y=F==="sad"?-.06:0;P.tear.visible=F==="sad"};
  window.XQBot3D={start,acts:Object.keys(ACTS),combos:COMBO.length,lines:LINES.length,figure:o=>{o=o||{};PCO=typeof o.p==="string"&&o.p.length===1&&"帥仕相俥傌炮兵將士象車馬砲卒".includes(o.p)?o.p:null;
    try{const B=build(TH[o.e]?o.e:eraK(),o.g>=1&&o.g<=9?o.g:grade(),(C=>o.npc||C?{hat:C&&C.hat||o.hat,hc:C&&C.hc||o.hc,robe:C&&C.ring||o.robe,band:C&&C.band||o.band,acc:o.acc,shoe:C&&C.shoe||o.shoe,belt:C&&C.belt||o.belt,skin:C&&C.skin,top:C&&C.top,pin:C&&C.pin,band2:C&&C.band2,cus:C}:null)(typeof o.cus==="string"?CUS[o.cus]:o.cus));if(o.thin)thinify(B,!!o.wl);if(o.wl)wolongify(B);if(o.glb)attachGLB(B,o);return B}finally{PCO=null}},faceApply,name:()=>BNAME()};
})();
