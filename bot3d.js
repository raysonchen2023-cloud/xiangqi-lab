// 3D 象棋小人（意見回饋 159、161）：圓滾滾的「帥」棋子身體＋頭、手、腳，在畫面上自由走動、做手勢、說話
// - 小人身上有一塊可以點的區域：點到小人不會按到後面的按鈕；可以拖到任何地方，放下就停在那裡（雙擊再出去走走）
// - 300 種動作＝24 種手部動作 × 13 種身體動作組合，每種配一句話；另外有 12 個精修的招牌動作和吃子、將軍的反應
// - 外觀：深色輪廓線（反面外殼）、亮面烤漆、金邊、木紋、三點打光＋背光
(function(){
  const T=window.THREE;if(!T)return;
  const W=124,H=156,TAU=Math.PI*2,PI=Math.PI,ease=p=>p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2,wv=(p,n)=>Math.sin(p*TAU*n),bell=p=>Math.sin(p*PI);
  const store={get(k,d){try{const v=localStorage.getItem("m_"+k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem("m_"+k,JSON.stringify(v))}catch(e){}}};
  // ---------- 貼圖 ----------
  function cv(n,f){const c=document.createElement("canvas");c.width=c.height=n;f(c.getContext("2d"),n);const t=new T.CanvasTexture(c);if(T.SRGBColorSpace)t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;return t}
  const faceTex=ch=>cv(512,(g,n)=>{const h=n/2;
    let gr=g.createRadialGradient(h*.8,h*.7,10,h,h,h);gr.addColorStop(0,"#FFF8E6");gr.addColorStop(.75,"#F2DCAE");gr.addColorStop(1,"#D9B577");g.fillStyle=gr;g.beginPath();g.arc(h,h,h,0,TAU);g.fill();
    g.strokeStyle="#9E1B15";g.lineWidth=16;g.beginPath();g.arc(h,h,h*.8,0,TAU);g.stroke();g.lineWidth=4;g.beginPath();g.arc(h,h,h*.72,0,TAU);g.stroke();
    g.font='900 250px "Noto Serif TC","PMingLiU","Songti TC","SimSun",serif';g.textAlign="center";g.textBaseline="middle";
    g.fillStyle="rgba(90,40,10,.35)";g.fillText(ch,h+5,h+14);g.fillStyle="#B3141B";g.fillText(ch,h,h+8)});
  const woodTex=()=>cv(256,(g,n)=>{g.fillStyle="#B07740";g.fillRect(0,0,n,n);for(let i=0;i<70;i++){g.strokeStyle=`rgba(${60+Math.random()*40|0},${30+Math.random()*20|0},10,${.08+Math.random()*.15})`;g.lineWidth=1+Math.random()*3;
    g.beginPath();const y=Math.random()*n;g.moveTo(0,y);for(let x=0;x<=n;x+=16)g.lineTo(x,y+Math.sin(x/30+i)*4);g.stroke()}});
  // ---------- 造型 ----------
  function build(){
    const bot=new T.Group();
    const P=(c,o)=>new T.MeshPhysicalMaterial(Object.assign({color:c,roughness:.45,metalness:0,clearcoat:.6,clearcoatRoughness:.25},o||{}));
    const INK=new T.MeshBasicMaterial({color:0x3a2010,side:T.BackSide});
    const add=(parent,geo,mat,pos,o)=>{const m=new T.Mesh(geo,mat);if(pos)m.position.set(...pos);parent.add(m);
      if(!(o&&o.noLine)){const l=new T.Mesh(geo,INK);l.scale.setScalar(1+((o&&o.line)||.06));m.add(l)}return m};
    const wood=P("#C08850",{map:woodTex(),roughness:.5,clearcoat:.9}),skin=P("#FBE9CC",{roughness:.6,clearcoat:.15,sheen:.5,sheenColor:new T.Color("#ffd9b0")}),
      red=P("#D02A1F",{clearcoat:1,roughness:.3}),gold=P("#E3B341",{metalness:.75,roughness:.28}),dark=P("#1E120C",{clearcoat:1,roughness:.15}),
      white=new T.MeshBasicMaterial({color:0xffffff}),pink=new T.MeshBasicMaterial({color:0xF59A9A,transparent:true,opacity:.75}),mouthM=P("#7A1A14",{roughness:.6});
    // 身體＝一顆厚棋子＋金邊＋正面「帥」
    const torso=new T.Group();torso.position.y=1.02;bot.add(torso);
    const body=add(torso,new T.CylinderGeometry(.8,.8,.46,64),wood,null,{line:.035});body.rotation.x=PI/2;
    for(const z of[.23,-.23]){const r=new T.Mesh(new T.TorusGeometry(.79,.035,12,64),gold);r.position.z=z;torso.add(r)}
    const face=new T.Mesh(new T.CircleGeometry(.77,64),P("#fff",{map:faceTex("帥"),roughness:.4,clearcoat:.8,toneMapped:false}));face.position.z=.232;torso.add(face);
    // 頭
    const head=new T.Group();head.position.y=.8;torso.add(head);
    add(head,new T.SphereGeometry(.52,40,30),skin,[0,.14,0],{line:.05});
    const eyes=[],mouthG=new T.Group();mouthG.position.set(0,.03,.5);head.add(mouthG);
    for(const s of[-1,1]){const eg=new T.Group();eg.position.set(.18*s,.2,.45);head.add(eg);
      const sc=new T.Mesh(new T.SphereGeometry(.1,20,14),white);sc.scale.set(1,1.15,.5);eg.add(sc);
      const pu=new T.Mesh(new T.SphereGeometry(.072,20,14),dark);pu.position.set(0,-.005,.04);pu.scale.set(1,1.1,.6);eg.add(pu);
      const hl=new T.Mesh(new T.SphereGeometry(.024,8,8),white);hl.position.set(.025,.035,.085);eg.add(hl);
      const br=new T.Mesh(new T.CapsuleGeometry(.018,.09,4,8),dark);br.rotation.z=PI/2-.2*s;br.position.set(0,.15,.02);eg.add(br);eyes.push({g:eg,brow:br});
      const ck=new T.Mesh(new T.CircleGeometry(.075,20),pink);ck.position.set(.31*s,.04,.445);ck.rotation.y=.55*s;head.add(ck)}
    const smile=new T.Mesh(new T.TorusGeometry(.085,.02,8,20,PI),dark);smile.rotation.z=PI;mouthG.add(smile);
    const open=new T.Mesh(new T.SphereGeometry(.07,16,12),mouthM);open.scale.set(1,.8,.4);open.visible=false;mouthG.add(open);
    // 帽子：小紅帽＋金頂
    add(head,new T.CylinderGeometry(.25,.28,.14,40),red,[0,.66,0],{line:.08});add(head,new T.SphereGeometry(.07,16,12),gold,[0,.77,0]);
    // 手
    const arms=[];for(const s of[-1,1]){const sh=new T.Group();sh.position.set(.82*s,.14,0);torso.add(sh);
      add(sh,new T.CapsuleGeometry(.105,.32,8,16),skin,[0,-.27,0],{line:.12});add(sh,new T.SphereGeometry(.15,20,14),skin,[0,-.56,0],{line:.09});arms.push(sh)}
    // 腳
    const legs=[];for(const s of[-1,1]){const hp=new T.Group();hp.position.set(.3*s,.6,0);bot.add(hp);
      add(hp,new T.CapsuleGeometry(.12,.18,8,16),skin,[0,-.2,0],{line:.1});const f=add(hp,new T.SphereGeometry(.17,20,14),red,[0,-.43,.06],{line:.09});f.scale.set(1,.6,1.35);legs.push(hp)}
    return{bot,torso,head,eyes,mouth:{smile,open},arms,legs}}

  // ---------- 招牌動作 ----------
  const R=(B,i,x,y,z)=>{const a=B.arms[i].rotation;if(x!=null)a.x=x;if(y!=null)a.y=y;if(z!=null)a.z=z};
  const ACTS={
    wave:{d:2.2,say:"嗨！",f:(p,B)=>{R(B,1,0,.4*wv(p,3),2.6);B.head.rotation.z=-.12}},
    jump:{d:1.3,say:"耶！",f:(p,B)=>{const h=Math.max(0,Math.sin(p*TAU));B.root.position.y=h*.7;R(B,0,0,0,-2.4*h-.3);R(B,1,0,0,2.4*h+.3);B.legs[0].rotation.x=B.legs[1].rotation.x=-.5*h}},
    cheer:{d:2,say:"好棋！",f:(p,B)=>{R(B,0,0,0,-2.7+.3*wv(p,4));R(B,1,0,0,2.7-.3*wv(p,4));B.root.position.y=Math.abs(wv(p,2))*.25;B.face="open"}},
    dance:{d:3.2,say:"♪ ♫",f:(p,B)=>{const s=wv(p,4);B.root.rotation.z=.18*s;R(B,0,0,0,-1.2-s);R(B,1,0,0,1.2-s);B.legs[0].rotation.x=.5*Math.max(0,s);B.legs[1].rotation.x=.5*Math.max(0,-s);B.head.rotation.z=-.2*s;B.root.position.y=Math.abs(s)*.12}},
    think:{d:2.8,say:"嗯…",f:(p,B)=>{R(B,1,-2.3,-.6,.4);B.head.rotation.z=.22;B.head.rotation.x=-.12+.05*wv(p,2)}},
    bow:{d:2,say:"請多指教",f:(p,B)=>{const k=bell(p);B.torso.rotation.x=.75*k;R(B,0,.4*k);R(B,1,.4*k)}},
    spin:{d:1.6,say:"轉～",f:(p,B)=>{B.root.rotation.y=ease(p)*TAU;R(B,0,0,0,-1.5);R(B,1,0,0,1.5)}},
    clap:{d:2,say:"👏👏",f:(p,B)=>{const k=(wv(p,6)+1)/2;R(B,0,-1.35,.9,-(.15+.5*k));R(B,1,-1.35,-.9,.15+.5*k)}},
    point:{d:2.2,say:"看這裡！",f:(p,B)=>{R(B,1,0,.2*wv(p,2),1.55);B.head.rotation.y=.35}},
    sleep:{d:3.4,say:"Zzz…",f:(p,B)=>{B.head.rotation.z=.4;B.head.rotation.x=.2;B.closed=1;B.root.position.y=-.03*(1+wv(p,2))}},
    shrug:{d:1.8,say:"？",f:(p,B)=>{const k=bell(p);R(B,0,-.8*k,0,-1.1*k-.3);R(B,1,-.8*k,0,1.1*k+.3);B.head.rotation.z=.2*k}},
    flex:{d:2.2,say:"看我的！",f:(p,B)=>{R(B,0,-.3+.25*wv(p,3),0,-1.6);R(B,1,-.3+.25*wv(p,3),0,1.6);B.torso.rotation.x=-.1}},
    shock:{d:1.6,say:"將軍！",f:(p,B)=>{const k=Math.min(1,p*4);B.root.position.y=.5*Math.sin(Math.min(1,p*2)*PI);R(B,0,0,0,-2.9*k);R(B,1,0,0,2.9*k);B.root.rotation.z=.08*wv(p,8)*(1-p);B.face="open"}},
    carry:{d:99,f:(p,B,t)=>{R(B,0,0,0,-2.6);R(B,1,0,0,2.6);B.legs[0].rotation.x=.4*Math.sin(t*9);B.legs[1].rotation.x=-.4*Math.sin(t*9);B.face="open"}}};
  const SIGNATURE=["wave","jump","cheer","dance","think","bow","spin","clap","point","sleep","shrug","flex"];

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
  const LINES=("你好！今天想下哪一盤？|我是小帥，請多指教！|來一盤吧！|今天也要贏喔！|下棋囉～|你回來啦！|我等你好久了|一起變強吧！|休息一下也很好|喝口水再下吧|"+
    "馬走日，別忘了！|象走田，不能過河喔|車走直線最威風|炮要隔一子才能打|兵過河才能橫走|將帥不能見面喔！|士只在九宮裡轉|小心蹩馬腿！|象眼被塞就走不動了|炮沒有砲架打不到|"+
    "車是最強的棋子|一車十子寒！|馬後炮，好殺法！|雙車錯，很難擋|臥槽馬，要小心|鐵門栓，殺氣騰騰|悶宮殺，炮最愛|天地炮，壓力大|重炮殺，兩門炮疊起來|白臉將，借將助攻|"+
    "中炮開局最常見|屏風馬很穩健|仙人指路，先探虛實|飛相局，以靜制動|順炮直車，對攻激烈|列炮，針鋒相對|反宮馬，變化多|過宮炮，出其不意|起馬局，穩紮穩打|士角炮，伏兵一招|"+
    "中炮對屏風馬，經典！|五七炮很有後勁|五八炮，直衝中路|三步虎，快出車|單提馬，左右呼應|鴛鴦炮，少見又有趣|龜背炮，守得緊|半途列炮，敢衝敢拚|巡河車，好位置|騎河車，壓制對方|"+
    "開局要先出大子|別太早動將帥|車要早點出動|馬要往中間跳|炮不要太早換掉|兵卒也很重要|殘局兵貴如金|先手很寶貴|搶到先手就有主動|多子不如多先|"+
    "攻擊前先看防守|別只顧吃子|對方的炮在瞄你喔|這步可以想久一點|先想對方要幹嘛|棄子搶先也是好棋|兌子要算清楚|中路最要緊|九宮附近要小心|保護好你的帥|"+
    "觀棋不語真君子|落子無悔大丈夫|一著不慎，滿盤皆輸|棋高一著，縛手縛腳|當局者迷，旁觀者清|勝不驕，敗不餒|棋如人生|下棋要沉得住氣|慢慢來，比較快|靜下心來看全局|"+
    "好棋！|這步漂亮！|厲害厲害！|我學到了！|妙手！|有大師的味道！|這招我記住了|你進步好多|太強了吧！|穩！|"+
    "加油！|別灰心！|輸了也是經驗|再來一盤就會贏|每盤棋都在進步|錯棋重練很有用|多看大師對局|做做殘局題吧|今天練了嗎？|堅持就是勝利|"+
    "嘿嘿～|哈哈！|嗯哼～|哇！|唷呼～|喔耶！|嗯？|咦？|呼～|啦啦啦～|"+
    "我是棋子，也是你的朋友|我的身體是一顆帥|我的帽子是金頂的|我會跳舞喔|戳我會表演|把我拖到旁邊吧|我不會擋你下棋啦|雙擊我，我就去散步|我在這裡等你|累了，我先睡一下|"+
    "中國象棋有兩千多年歷史|象棋棋盤有九條直線|楚河漢界分兩邊|紅方先走|棋盤上有三十二顆棋子|每邊十六顆子|帥和將是同一個角色|俥和車都是車|傌和馬都是馬|炮和砲都是炮|"+
    "古譜《橘中秘》很經典|《梅花譜》講屏風馬|《適情雅趣》有很多殺法|多看古譜會開竅|胡榮華是傳奇大師|許銀川也很厲害|大師也是一步步練出來的|記譜可以複盤|複盤是進步的秘訣|輸棋最該複盤|"+
    "要不要喝杯茶？|下棋配茶最棒了|今天天氣真好|晚安，明天見|早安！|午安～|吃飽了嗎？|記得伸懶腰|眼睛休息一下|我會一直陪你|"+
    "將軍要先想退路|防守也是進攻|守住中兵很重要|別讓車被困住|車不要走到炮口|馬跳河口很活躍|炮架是關鍵|一子之差也很大|算三步再走|對方剛剛那步有陷阱嗎？|"+
    "殘局要算步數|單車難破士象全|馬兵殘局很微妙|炮兵殘局要耐心|車兵對車很難贏|殘局帥也要出來幫忙|帥走出來也是戰力|和棋也不錯|逼和也算本事|長將不能一直將|"+
    "看我轉圈！|看我跳高！|看我鞠躬！|看我拍手！|看我秀肌肉！|我會划船喔|打鼓咚咚咚|擦擦汗|伸個懶腰～|招招手～|"+
    "你的對手正在想|換你走囉|慢慢想，不急|時間還很多|這盤很精彩|勢均力敵！|紅方有優勢嗎？|黑方要反擊了！|局面複雜喔|關鍵時刻！|"+
    "你今天的手氣不錯|贏了要謙虛喔|輸了要笑一笑|下完記得握手|謝謝你陪我|你是我最好的棋友|下次帶朋友來玩|分享給朋友吧|一起上線對戰！|線上大廳有人喔|"+
    "象棋是智慧的遊戲|動腦讓人年輕|專心的你最帥|你的眼神好認真|思考中的你閃閃發光|我也想學下棋|教教我嘛|我只會走一步|我最會的是賣萌|我會努力變可愛|"+
    "吃！|將軍！|跑掉了！|好險！|差一點！|中計了嗎？|這是陷阱！|反將一軍！|絕殺！|勝利在望！|兵卒過河頂半車|車馬炮配合最強|雙馬飲泉，好漂亮|馬炮爭雄|車炮抽將要小心|大刀剜心！|二鬼拍門|雙炮過河，壓力好大|海底撈月，殘局名招|送佛歸殿|高釣馬，殺著來了|側面虎，要防|拔簧馬，一跳成殺|老卒搜林|小鬼坐龍廷|夾車炮，左右開弓|雙將最難擋|一將一殺|圍魏救趙，好戰術|聲東擊西|先棄後取|捨車保帥|丟卒保車|兵臨城下！|步步為營|穩中求勝|以攻代守|調虎離山|關門打狗|引蛇出洞|窩心馬不太好|空頭炮很兇|當頭炮來囉|河頭馬很靈活|象田要顧好|雙士連環，守得穩|高車保馬|肋道是車的好位置|卒林線很重要|九宮是帥的家|我今天心情很好|陽光好溫暖|下雨天也適合下棋|週末來場大戰吧|你是棋盤上的英雄|輸贏都是好朋友|笑一個嘛|你看起來好專注|我幫你加油打氣|握握手～|想喝珍珠奶茶|來點小點心吧|下完棋去散步|聽點音樂放鬆|今天學了一招新殺法|明天再挑戰大師|我要變成將軍！|我其實很怕炮|車哥最可靠|馬兄跳好遠|小兵立大功|我想當一顆車|象兄守家最認真|士兄每天站崗|炮兄翻山越嶺|帥哥就是我|黑將是我的好兄弟|紅黑一家親|楚河漢界是我家|棋盤是我的遊樂場|讓我想想…|好難喔…|我算不過來了|你比我聰明|這步我不會|教練請指導|看懂了！|原來如此！|我懂了我懂了|再看一次！").split("|");
  const COMBO=[];for(let i=0;i<ARM.length&&COMBO.length<300;i++)for(let j=0;j<BODY.length&&COMBO.length<300;j++)COMBO.push([i,j]);
  const FACES=["smile","open","smile","wink","smile","open"];
  const comboAct=n=>{const[i,j]=COMBO[n],a=ARM[i],b=BODY[j];return{d:2.4,name:a[0]+(b[0]?"＋"+b[0]:""),say:LINES[n%LINES.length],f:(p,B)=>{a[1](p,B);b[1](p,B);B.face=FACES[n%FACES.length]}}};

  function start(){
    const box=document.createElement("div");box.className="xqbot";
    box.style.cssText=`position:fixed;left:0;top:0;width:${W}px;height:${H}px;z-index:900;pointer-events:none;will-change:transform`;
    const hit=document.createElement("div");hit.style.cssText="position:absolute;left:24px;right:24px;top:16px;bottom:4px;pointer-events:auto;touch-action:none;cursor:grab;border-radius:40%";
    const bub=document.createElement("div");bub.style.cssText="position:absolute;left:50%;top:-4px;transform:translate(-50%,-100%);max-width:200px;width:max-content;background:#fffdf7;color:#3a2618;border:2px solid #3a2618;border-radius:14px;padding:4px 10px;font:700 13px/1.35 sans-serif;text-align:center;box-shadow:0 2px 6px #0003;opacity:0;transition:opacity .25s;pointer-events:none";
    box.append(hit,bub);document.body.appendChild(box);
    let rd;try{rd=new T.WebGLRenderer({alpha:true,antialias:true})}catch(e){box.remove();return null}
    rd.setPixelRatio(Math.min(3,window.devicePixelRatio||1));rd.setSize(W,H);rd.domElement.style.cssText="display:block;width:100%;height:100%;pointer-events:none";box.insertBefore(rd.domElement,hit);
    if(T.SRGBColorSpace)rd.outputColorSpace=T.SRGBColorSpace;
    const sc=new T.Scene(),cam=new T.PerspectiveCamera(30,W/H,.1,50);cam.position.set(0,1.5,7.3);cam.lookAt(0,1.18,0);
    sc.add(new T.HemisphereLight(0xfff3e0,0x5a3a22,1.1));
    const key=new T.DirectionalLight(0xfff0dc,1.5);key.position.set(2.5,4,5);sc.add(key);
    const fill=new T.DirectionalLight(0xbcd4ff,.7);fill.position.set(-4,1.5,3);sc.add(fill);
    const rim=new T.DirectionalLight(0xffffff,1.4);rim.position.set(-1,3,-5);sc.add(rim);
    const P=build(),root=new T.Group();root.add(P.bot);sc.add(root);const B=Object.assign(P,{root,closed:0,face:"smile"});
    const shd=new T.Mesh(new T.CircleGeometry(.8,32),new T.MeshBasicMaterial({color:0,transparent:true,opacity:.2}));shd.rotation.x=-PI/2;shd.position.y=.02;sc.add(shd);
    const bounds=()=>({x0:0,x1:innerWidth-W,y0:20,y1:innerHeight-H});
    const sp=store.get("botPos",null);let parked=!!sp,x=sp?sp.x*innerWidth:Math.max(4,innerWidth-W-16),y=sp?sp.y*innerHeight:Math.max(70,innerHeight-H-90);
    let tx=x,ty=y,face=0,act=null,actT=0,next=1.5,bubT=0,stopped=false,last=performance.now(),acc=0,blinkT=2,talk=0,drag=null,lastTap=0,deck=[];
    const say=(s,d)=>{bub.textContent=s;bub.style.opacity=1;bubT=d||2;talk=Math.min(1.2,.25+s.length*.08)};
    const doAct=a=>{if(typeof a==="string")a=ACTS[a];if(!a)return;act=a;actT=0;tx=x;ty=y;if(a.say)say(a.say,Math.max(1.8,Math.min(3,a.d+.3)))};
    // 抽牌：300 種組合＋招牌動作洗牌後輪流出，不會一直重複
    const randAct=()=>{if(!deck.length){deck=[...COMBO.keys(),...SIGNATURE];for(let i=deck.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[deck[i],deck[j]]=[deck[j],deck[i]]}}const k=deck.pop();return typeof k==="number"?comboAct(k):ACTS[k]};
    const wander=()=>{if(parked)return;const b=bounds();tx=b.x0+Math.random()*Math.max(0,b.x1-b.x0);ty=Math.max(70,b.y0)+Math.random()*Math.max(0,b.y1-Math.max(70,b.y0))};
    const reset=()=>{root.position.y=0;root.rotation.set(0,face,0);P.torso.position.y=1.02;P.torso.rotation.set(0,0,0);P.head.rotation.set(0,0,0);B.closed=0;B.face="smile";
      R(B,0,0,0,-.3);R(B,1,0,0,.3);P.legs[0].rotation.set(0,0,0);P.legs[1].rotation.set(0,0,0)};
    function frame(now){if(stopped)return;requestAnimationFrame(frame);if(document.hidden){last=now;return}
      const dt=Math.min(.1,(now-last)/1000);last=now;acc+=dt;if(acc<1/30)return;const t=acc;acc=0;
      reset();const dx=tx-x,dy=ty-y,dist=Math.hypot(dx,dy);
      if(drag){ACTS.carry.f(0,B,now/1000)}
      else if(act){actT+=t;const p=Math.min(1,actT/act.d);act.f(p,B,now/1000);if(p>=1){act=null;next=2+Math.random()*4}}
      else if(dist>2&&!parked){const s=70*t,k=Math.min(1,s/dist);x+=dx*k;y+=dy*k;
        const want=Math.abs(dx)>4?(dx>0?.9:-.9):0;face+=(want-face)*Math.min(1,t*6);root.rotation.y=face;
        const w=Math.sin(now/110);P.legs[0].rotation.x=.6*w;P.legs[1].rotation.x=-.6*w;R(B,0,-.5*w);R(B,1,.5*w);root.position.y=Math.abs(Math.cos(now/110))*.08}
      else{face+=(0-face)*Math.min(1,t*4);root.rotation.y=face;P.torso.position.y=1.02+.015*Math.sin(now/500);
        next-=t;if(next<=0){if(!parked&&Math.random()<.4){wander();next=1}else doAct(randAct())}}
      // 表情：眨眼、閉眼、眨單眼、講話時嘴巴開合
      blinkT-=t;const bl=blinkT<0;if(blinkT<-.12)blinkT=2+Math.random()*3;
      P.eyes.forEach((e,i)=>{e.g.scale.y=B.closed||(B.face==="wink"&&i===1)?.12:bl?.1:1;e.brow.position.y=.15+(B.face==="open"?.03:0)});
      if(talk>0)talk-=t;const mOpen=B.face==="open"||(talk>0&&Math.sin(now/70)>0);P.mouth.open.visible=mOpen;P.mouth.smile.visible=!mOpen;
      if(bubT>0){bubT-=t;if(bubT<=0)bub.style.opacity=0}
      if(!drag){const b=bounds();x=Math.min(Math.max(x,b.x0),Math.max(b.x0,b.x1));y=Math.min(Math.max(y,b.y0),Math.max(b.y0,b.y1))}
      box.style.transform=`translate(${x|0}px,${y|0}px)`;rd.render(sc,cam)}
    requestAnimationFrame(frame);
    // 點／拖小人：事件只給小人，不會穿到後面的按鈕
    const stop=e=>{e.stopPropagation();if(e.cancelable)e.preventDefault()};
    hit.addEventListener("pointerdown",e=>{stop(e);try{hit.setPointerCapture(e.pointerId)}catch(_){}drag={sx:e.clientX,sy:e.clientY,ox:x,oy:y,moved:false};act=null});
    hit.addEventListener("pointermove",e=>{if(!drag)return;stop(e);const dx=e.clientX-drag.sx,dy=e.clientY-drag.sy;if(!drag.moved&&Math.hypot(dx,dy)<6)return;
      if(!drag.moved){drag.moved=true;hit.style.cursor="grabbing";say("哇～飛起來了！",1.5)}x=drag.ox+dx;y=drag.oy+dy;tx=x;ty=y});
    const up=e=>{if(!drag)return;stop(e);const d=drag;drag=null;hit.style.cursor="grab";
      if(d.moved){const b=bounds();x=Math.min(Math.max(x,b.x0),b.x1);y=Math.min(Math.max(y,b.y0),b.y1);tx=x;ty=y;parked=true;store.set("botPos",{x:x/innerWidth,y:y/innerHeight});say("我在這裡等你（點兩下我會去散步）",2.6);next=4;return}
      const now=performance.now();if(now-lastTap<350&&parked){parked=false;store.set("botPos",null);say("出去走走～",1.6);wander();lastTap=0;return}lastTap=now;doAct(randAct())};
    hit.addEventListener("pointerup",up);hit.addEventListener("pointercancel",up);
    for(const ev of["click","dblclick","touchstart","touchend","mousedown","mouseup","contextmenu"])hit.addEventListener(ev,stop,{passive:false});
    const onCall=e=>{const s=e.detail;if(s==="將軍")doAct("shock");else if(s==="吃"){doAct("cheer");say("吃！",1.4)}};
    window.addEventListener("xq-call",onCall);
    const onResize=()=>{const b=bounds();x=Math.min(x,b.x1);y=Math.min(y,b.y1);tx=Math.min(tx,b.x1);ty=Math.min(ty,b.y1)};window.addEventListener("resize",onResize);
    return{act:k=>doAct(typeof k==="number"?comboAct(k):k),say,count:COMBO.length,lines:LINES.length,
      stop(){stopped=true;window.removeEventListener("xq-call",onCall);window.removeEventListener("resize",onResize);try{rd.dispose()}catch(e){}box.remove()}}}
  window.XQBot3D={start,acts:Object.keys(ACTS),combos:COMBO.length,lines:LINES.length};
})();
