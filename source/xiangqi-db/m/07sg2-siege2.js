/* ---------- 黑洞新規則（開發者 11/16 定案：story/164、165；實作計畫 story/166）：只留星門圍城，每顆子各自體力／攻擊力／防禦力 ----------
   這支只放純規則與電腦對手（不碰畫面、不讀存檔，node 可以直接測）；接到星門圍城的是 07bhg-gatesiege.js。
   盤面照 core.js：board 90 格（r*9+c，r＝0 是黑方底線），紅方大寫、黑方小寫。每顆子的數值存成跟盤面同樣 90 格的陣列，走子時一起搬：
     S＝{b 盤面, h 體力, x 體力上限, a 攻擊力, d 防禦力（被降低後的現值）, g 臨時加防（招式）, ge 臨時加防到第幾回合, i 棋子編號}
     另外可以掛：S.pr＝[[編號,編號]] 結對分擔（雙燕斜護）、S.net＝"r"／"b" 那一方的炮可以隔兩子攻擊（火網標記）、S.ax＝{格:加攻} 這一手的加攻（集火、直路衝鋒）、
       S.bx＝紅方的固定加成（每位角色的天賦）：{a:{棋種:加攻}, d:{棋種:加防}, pawn:兵過河加攻, pal:九宮裡其他子加防, lineB:相護到的再加防, aShare:仕替帥擋的比例}
   攻擊（走到對方子上）：攻擊力 ≥ 對方防禦力 → 扣「攻擊力 − 防禦力的一半」（至少 1）；扣到 0 才吃掉、移進去，沒扣光就停在原地。
     防禦力 > 攻擊力 → 吃不了，對方防禦力降「攻擊力的一半」，停在原地。兩種都用掉這一手。
   護帥：九宮裡或帥上下左右的其他己方子防禦力 ×1.2；帥被攻擊時，上下左右的己方子裡防禦力最高的一顆替它承受一半。兵過河攻擊力 +6。
   勝負：將帥體力歸零＝輸；一般象棋的將死、困斃也算（必須應將、不照面）；不判長將長捉，回合上限沒分勝負＝和。 */
const SG2=(()=>{
  const BASE={R:{hp:26,atk:30,def:14},C:{hp:20,atk:26,def:8},N:{hp:20,atk:22,def:12},B:{hp:16,atk:12,def:18},A:{hp:16,atk:12,def:18},P:{hp:10,atk:14,def:6},K:{hp:60,atk:10,def:16}};
  const GROW={hp:.8,atk:.35,def:.35},TAU=42,PAWN_X=6,GUARD_K=1.2,RND_MAX=60;
  const DIFF={1:{mul:.9,depth:1,nm:"易"},2:{mul:1,depth:2,nm:"中"},3:{mul:1.25,depth:3,nm:"難"}};
  const UPC={},SDC={};for(const c of"KABNRCP"){UPC[c]=c;UPC[c.toLowerCase()]=c;SDC[c]="r";SDC[c.toLowerCase()]="b"}   /* 查表（電腦搜尋時每秒呼叫上百萬次，toUpperCase 太慢） */
  const opp=s=>s==="r"?"b":"r",up=p=>UPC[p]||"",sd=p=>SDC[p]||null,RW=q=>q/9|0,CL=q=>q%9;
  const G=L=>{L=Math.max(1,Math.min(100,+L||1));return(1-Math.exp(-(L-1)/TAU))/(1-Math.exp(-99/TAU))};
  /* 一種棋子在某等級、某倍率下的數值（Lv1→Lv100：體力 ×1.8、攻防 ×1.35，前期長得快） */
  function unit(pc,L,mul){const B=BASE[up(pc)]||BASE.P,g=G(L),m=+mul||1;return{hp:Math.max(1,Math.round(B.hp*(1+GROW.hp*g)*m)),atk:Math.max(1,Math.round(B.atk*(1+GROW.atk*g)*m)),def:Math.max(0,Math.round(B.def*(1+GROW.def*g)*m))}}
  /* 開局：照盤面建每格數值。lvOf(side,PC)＝那一方那種棋子的等級；mulOf(side)＝倍率（對方照難度） */
  const KEYS=["b","h","x","a","d","g","ge","i"];
  function mkState(b,lvOf,mulOf){const S={b:b.slice(),pr:[],net:null,ax:null,nid:0};for(const k of KEYS)if(k!=="b")S[k]=new Array(90).fill(0);
    for(let q=0;q<90;q++)if(b[q])put(S,q,b[q],lvOf(sd(b[q]),up(b[q])),mulOf(sd(b[q])));return S}
  function put(S,q,p,L,mul){const u=unit(p,L,mul);S.b[q]=p;S.h[q]=S.x[q]=u.hp;S.a[q]=u.atk;S.d[q]=u.def;S.g[q]=S.ge[q]=0;S.i[q]=++S.nid;return S.i[q]}
  function clear(S,q){S.b[q]=null;for(const k of KEYS)if(k!=="b")S[k][q]=0}
  function moveCell(S,f,t){for(const k of KEYS){S[k][t]=S[k][f];S[k][f]=k==="b"?null:0}}
  const clone=S=>{const o={pr:S.pr,net:S.net,ax:S.ax,nid:S.nid,bx:S.bx};for(const k of KEYS)o[k]=S[k].slice();return o};
  const sqOf=(S,id)=>id?S.i.indexOf(id):-1;
  const kingOf=(b,side)=>b.indexOf(side==="r"?"K":"k");
  const inPal=(q,side)=>{const r=RW(q),c=CL(q);return c>=3&&c<=5&&(side==="r"?r>=7:r<=2)};
  const crossed=(q,side)=>side==="r"?RW(q)<=4:RW(q)>=5;
  const nb4=q=>{const r=RW(q),c=CL(q),o=[];if(r>0)o.push(q-9);if(r<9)o.push(q+9);if(c>0)o.push(q-1);if(c<8)o.push(q+1);return o};
  /* 被動規則（11/16 開發者選單，雙方都有）：
     士相護線＝站在自己的仕或相照一般走法走得到的格子上，防禦力 +10（仕：九宮裡斜角一格；相：本方半場、田字斜兩格、象眼沒被塞住）；跟護帥的 ×1.2 可以疊。
     集火＝攻擊一顆敵子時，其他照一般走法也吃得到它的己子（連攻擊的那顆最多 3 顆，挑攻擊力高的）攻擊力自動相加、算一次；打死了是攻擊的那顆移進去（玩家選哪顆去走＝選誰進去），沒打死都留原地。招式的「受一次攻擊」不算集火 */
  const LINE_X=10,FOCUS_N=3;
  /* 被誰護住：回 "A"（仕）、"B"（相）或 ""（兩種都有時回 "B"，相護線的天賦才算得到） */
  function lined(S,q){const p=S.b[q];if(!p)return"";const side=sd(p),r=RW(q),c=CL(q);let by="";
    if(!crossed(q,side))for(const[a,d]of[[1,1],[1,-1],[-1,1],[-1,-1]]){const rr=r+2*a,cc=c+2*d;if(rr<0||rr>9||cc<0||cc>8)continue;const x=S.b[rr*9+cc];if(x&&sd(x)===side&&up(x)==="B"&&!S.b[(r+a)*9+c+d])return"B"}
    if(inPal(q,side))for(const[a,d]of[[1,1],[1,-1],[-1,1],[-1,-1]]){const rr=r+a,cc=c+d;if(rr<0||rr>9||cc<0||cc>8)continue;const x=S.b[rr*9+cc];if(x&&sd(x)===side&&up(x)==="A")by="A"}
    return by}
  /* 集火的幫手：照一般走法也吃得到 t 的其他己子（先用位置篩，再看走法），攻擊力高的前 FOCUS_N−1 顆 */
  function support(S,f,t){const side=sd(S.b[f]),tr=RW(t),tc=CL(t),o=[];for(let i=0;i<90;i++){if(i===f)continue;const p=S.b[i];if(!p||sd(p)!==side)continue;const P=up(p),dr=Math.abs(RW(i)-tr),dc=Math.abs(CL(i)-tc);
      if((P==="R"||P==="C"||P==="K")&&dr&&dc)continue;if(P==="N"&&dr+dc!==3)continue;if(P==="P"&&dr+dc!==1)continue;if(P==="A"&&(dr!==1||dc!==1))continue;if(P==="B"&&(dr!==2||dc!==2))continue;
      if(pseudo(S.b,i,S.net).includes(t))o.push(i)}return o.sort((a,b)=>atkAt(S,b)-atkAt(S,a)).slice(0,FOCUS_N-1)}
  /* 實際攻擊力、防禦力（攻擊者在 f；兵過河 +6；護帥 ×1.2；士相護線 +10；招式的臨時加防 g） */
  const bxOf=(S,p)=>S.bx&&sd(p)==="r"?S.bx:null;
  function atkAt(S,f){const p=S.b[f];if(!p)return 0;const B=bxOf(S,p),P=up(p);return S.a[f]+(P==="P"&&crossed(f,sd(p))?(B&&B.pawn||PAWN_X):0)+(B&&B.a&&B.a[P]||0)+(S.ax&&S.ax[f]||0)}
  function defAt(S,q){const p=S.b[q];if(!p)return 0;const side=sd(p),B=bxOf(S,p),P=up(p),ln=lined(S,q),base=Math.max(0,S.d[q])+(S.g[q]||0)+(ln?LINE_X+(ln==="B"&&B&&B.lineB||0):0)+(B&&B.d&&B.d[P]||0)+(B&&B.pal&&P!=="K"&&inPal(q,side)?B.pal:0);if(P==="K")return base;
    const k=kingOf(S.b,side),near=inPal(q,side)||(k>=0&&nb4(k).includes(q));return near?Math.round(base*GUARD_K):base}
  /* 11/17 iMac 第 17、18 項：防禦力現值換成 d 時的實際防禦（含護線、護帥、天賦、招式加防；同 defAt）。攻擊預覽「防 31→13」、資料卡「原本」、打不動的跳字都用它，不改狀態 */
  function defWith(S,q,d){const o=S.d[q];S.d[q]=d;try{return defAt(S,q)}finally{S.d[q]=o}}
  /* 有沒有吃到護帥 ×1.2（資料卡說明用；跟 defAt 同一個判斷） */
  function guarded(S,q){const p=S.b[q];if(!p||up(p)==="K")return false;const side=sd(p),k=kingOf(S.b,side);return inPal(q,side)||(k>=0&&nb4(k).includes(q))}
  /* 試算一次攻擊（不改狀態）：ok＝打得動；dmg＝目標扣多少；share＝{q,dmg} 護帥分擔；kill＝目標會死；down＝打不動時對方防禦降多少；by＝合力的幫手（集火）。solo＝招式打的，不算集火 */
  function calc(S,f,t,solo){const by=solo?[]:support(S,f,t),A=atkAt(S,f)+by.reduce((s,q)=>s+atkAt(S,q),0),D=defAt(S,t);if(A<D)return{ok:false,down:Math.floor(A/2),A,D,kill:false,by};
    let dmg=Math.max(1,Math.round(A-D/2)),share=null;const v=S.b[t];
    const pr=(S.pr||[]).find(x=>x.includes(S.i[t])),pq=pr?sqOf(S,pr[0]===S.i[t]?pr[1]:pr[0]):-1;
    if(pq>=0&&pq!==f&&S.b[pq]&&sd(S.b[pq])===sd(v)&&up(v)!=="K"){const half=Math.floor(dmg/2);share={q:pq,dmg:half};dmg-=half}
    else if(up(v)==="K"){const side=sd(v);let best=-1,bd=-1,bh=-1;for(const q of nb4(t)){if(q===f||!S.b[q]||sd(S.b[q])!==side)continue;const dq=defAt(S,q);if(dq>bd||(dq===bd&&S.h[q]>bh)){best=q;bd=dq;bh=S.h[q]}}
      if(best>=0){const B=bxOf(S,S.b[best]),k=B&&B.aShare&&up(S.b[best])==="A"?B.aShare:.5,half=Math.floor(dmg*k);share={q:best,dmg:half};dmg-=half}}
    return{ok:true,A,D,dmg,share,kill:S.h[t]-dmg<=0,by}}
  /* 走一手（改狀態）：t 空＝走子；t 有敵子＝攻擊。回 {moved, kill, att（有攻擊）, dmg, down, share, shareKill, king（將帥死了：被打死的那一方）} */
  function play(S,f,t){const v=S.b[t];if(!v){moveCell(S,f,t);return{moved:true,att:false}}
    const c=calc(S,f,t),o={att:true,moved:false,kill:false,dmg:0,down:0,share:null,shareKill:false,king:null,ok:c.ok};
    if(!c.ok){S.d[t]=Math.max(0,S.d[t]-c.down);o.down=c.down;return o}
    if(c.share){const q=c.share.q;S.h[q]-=c.share.dmg;o.share={q,dmg:c.share.dmg};if(S.h[q]<=0){o.shareKill=true;clear(S,q)}}
    S.h[t]-=c.dmg;o.dmg=c.dmg;if(S.h[t]<=0){o.kill=true;if(up(v)==="K")o.king=sd(v);clear(S,t);moveCell(S,f,t);o.moved=true}return o}
  /* 這一手攻擊會不會停在原地（給畫面、local.js：沒打死就不移動） */
  const stays=(S,f,t)=>!!S.b[t]&&!calc(S,f,t).kill;
  /* ===== 走法：棋子怎麼走照一般象棋（跟 core.js 的 pseudo 同一套），合不合法照新規則自己判 =====
     core.js 的 legal 以為走到對方子上就是吃掉；這裡沒打死會停原地，所以每一步都真的試走一次再看帥安不安全。
     應將 chk："all"＝一般象棋（走完不能有任何敵子打得到帥）；"lethal"＝走完不能有敵子「一下就打死帥」（帥扛得住的將軍可以不應） */
  const D4=[[1,0],[-1,0],[0,1],[0,-1]],DG=[[1,1],[1,-1],[-1,1],[-1,-1]],NJ=[[-2,-1,-1,0],[-2,1,-1,0],[2,-1,1,0],[2,1,1,0],[-1,-2,0,-1],[1,-2,0,-1],[-1,2,0,1],[1,2,0,1]];
  const inb=(r,c)=>r>=0&&r<10&&c>=0&&c<9;
  function pseudo(b,sq,net){const p=b[sq],r=RW(sq),c=CL(sq),s=sd(p),t=up(p),out=[];
    const add=(rr,cc)=>{if(!inb(rr,cc))return;const q=b[rr*9+cc];if(!q||sd(q)!==s)out.push(rr*9+cc)};
    const pal=(rr,cc)=>cc>=3&&cc<=5&&(s==="r"?rr>=7&&rr<=9:rr>=0&&rr<=2);
    if(t==="K"){for(const[a,d]of D4)if(pal(r+a,c+d))add(r+a,c+d)}
    else if(t==="A"){for(const[a,d]of DG)if(pal(r+a,c+d))add(r+a,c+d)}
    else if(t==="B"){for(const[a,d]of DG){const rr=r+2*a,cc=c+2*d;if(!inb(rr,cc))continue;if(s==="r"?rr<5:rr>4)continue;if(b[(r+a)*9+c+d])continue;add(rr,cc)}}
    else if(t==="N"){for(const[a,d,la,ld]of NJ){const rr=r+a,cc=c+d;if(!inb(rr,cc))continue;if(b[(r+la)*9+c+ld])continue;add(rr,cc)}}
    else if(t==="R"||t==="C"){for(const[a,d]of D4){let rr=r+a,cc=c+d,j=false;while(inb(rr,cc)){const q=b[rr*9+cc];
        if(t==="R"){if(!q)out.push(rr*9+cc);else{if(sd(q)!==s)out.push(rr*9+cc);break}}
        else{if(!j){if(!q)out.push(rr*9+cc);else j=true}else if(q){if(sd(q)!==s)out.push(rr*9+cc);if(net===s&&j===true){j=2;rr+=a;cc+=d;continue}break}}
        rr+=a;cc+=d}}}
    else if(t==="P"){const f=s==="r"?-1:1;add(r+f,c);if(s==="r"?r<=4:r>=5){add(r,c-1);add(r,c+1)}}
    return out}
  function facing(b){const a=b.indexOf("K"),k=b.indexOf("k");if(a<0||k<0||a%9!==k%9)return false;for(let i=k+9;i<a;i+=9)if(b[i])return false;return true}
  /* 帥被誰打得到：回 [{f, kill}] */
  function threats(S,side){const k=kingOf(S.b,side),o=[];if(k<0)return o;const kr=RW(k),kc=CL(k);for(let i=0;i<90;i++){const p=S.b[i];if(!p||sd(p)===side)continue;const P=up(p),dr=Math.abs(RW(i)-kr),dc=Math.abs(CL(i)-kc);   /* 先用位置篩：車炮帥要同一行或列、馬兩格內、兵相鄰；仕相過不了河打不到帥 */
      if(P==="A"||P==="B")continue;if((P==="R"||P==="C"||P==="K")&&dr&&dc)continue;if(P==="N"&&(dr>2||dc>2))continue;if(P==="P"&&dr+dc!==1)continue;if(pseudo(S.b,i,S.net).includes(k))o.push({f:i,kill:calc(S,i,k).kill})}return o}
  function safe(S,side,chk){if(kingOf(S.b,side)<0)return false;if(facing(S.b))return false;const T=threats(S,side);return chk==="all"?!T.length:!T.some(x=>x.kill)}
  let CHK="all";   /* 11/16 開發者選單：照一般象棋，被將軍都要應（帥的體力只會被招式扣、勝負多半是將死／困斃）；"lethal" 留著給模擬對照 */
  function setChk(m){CHK=m==="lethal"?"lethal":"all"}
  /* 試走一步再復原（不整份複製，手機上快很多）：會變的只有起點、終點、終點四周（護帥分擔）和結對的另一顆 */
  function cellsOf(S,f,t){const c=[f,t].concat(nb4(t));for(const x of S.pr||[])for(const id of x){const q=sqOf(S,id);if(q>=0)c.push(q)}return c}
  function snap(S,c){return c.map(q=>KEYS.map(k=>S[k][q]))}
  function back(S,c,v){c.forEach((q,j)=>KEYS.forEach((k,n)=>{S[k][q]=v[j][n]}))}
  function legal(S,side,chk){chk=chk||CHK;const out=[];for(let i=0;i<90;i++){const p=S.b[i];if(!p||sd(p)!==side)continue;for(const t of pseudo(S.b,i,S.net)){const c=cellsOf(S,i,t),v=snap(S,c),o=play(S,i,t),ok=o.king===opp(side)||safe(S,side,chk);back(S,c,v);if(ok)out.push([i,t])}}return out}
  const inCheck=(S,side)=>threats(S,side).length>0;
  /* ===== 電腦對手：照新規則的 alpha-beta（易 1 步、中 2 步、難 3 步） =====
     評估：子力看剩下的體力比例；將帥體力很重；帥旁邊有己子護著加分、帥能走的格越少越不好；攻擊子離對方帥越近越好；被將軍扣分。值越大對 side 越好 */
  const VAL={R:9,C:4.5,N:4,B:2,A:2,P:1,K:0},WIN=1e6;
  function evalS(S,side){let s=0;for(let q=0;q<90;q++){const p=S.b[q];if(!p)continue;const P=up(p),me=sd(p)===side?1:-1,hp=S.x[q]?S.h[q]/S.x[q]:1;
      if(P==="K"){s+=me*(14*hp);let n=0;for(const r of nb4(q))if(S.b[r]&&sd(S.b[r])===sd(p))n++;s+=me*.5*n;s-=me*.35*pseudo(S.b,q).length;continue}
      const v=VAL[P]*(P==="P"&&crossed(q,sd(p))?2:1);s+=me*v*(.55+.45*hp)+me*.04*(atkAt(S,q)+defAt(S,q));
      if(P!=="A"&&P!=="B"){const ek=kingOf(S.b,opp(sd(p)));if(ek>=0)s-=me*.06*(Math.abs(RW(q)-RW(ek))+Math.abs(CL(q)-CL(ek)))}}
    for(const x of threats(S,side))s-=x.kill?6:1.5;for(const x of threats(S,opp(side)))s+=x.kill?3:.8;return s}
  /* 走法排序：會打死將帥的最先、再來打得死的、打得動的、走子 */
  function order(S,L){return L.map(m=>{const v=S.b[m[1]];let k=0;if(v){const c=calc(S,m[0],m[1]);k=c.kill?(up(v)==="K"?1e5:100+VAL[up(v)]*10):c.ok?10+c.dmg:1}return[k,m]}).sort((x,y)=>y[0]-x[0]).map(x=>x[1])}
  /* 搜尋：NODE_MAX 是節點上限、TIME_MAX 是時間上限（手機上一步不要算太久）；超過就丟掉這一層、用上一層算完的結果 */
  const NODE_MAX=40000,TIME_MAX=900;let NODES=0,T_END=0;const STOP={};   /* 另外有時間上限（毫秒）：慢的手機少算一點，不會卡住 */
  function search(S,side,depth,a,b,L){if(++NODES>NODE_MAX||((NODES&127)===0&&Date.now()>T_END))throw STOP;L=L||legal(S,side);if(!L.length)return{v:-WIN+(10-depth),m:null};   /* 沒有合法步＝將死或困斃：輸 */
    if(depth<=0)return{v:evalS(S,side),m:null};let best=-Infinity,bm=null;
    for(const m of order(S,L)){const c=cellsOf(S,m[0],m[1]),sv=snap(S,c),o=play(S,m[0],m[1]);let v;try{if(o.king===opp(side))v=WIN-(10-depth);else v=-search(S,opp(side),depth-1,-b,-a).v}finally{back(S,c,sv)}
      if(v>best){best=v;bm=m}if(v>a)a=v;if(a>=b)break}return{v:best,m:bm}}
  /* 電腦這一手：depth＝1／2／3；rnd＝0～1 的亂數；L＝這一手能走的步（招式定身、不能擒之類先濾掉；沒給就照規則全部）。沒步可走回 null（將死或困斃）
     易（1 步）：只看走完這一步的局面，分數加一點亂數，偶爾選次好的。中、難：一層一層加深，算到節點上限就用上一層的結果 */
  function decide(S,side,depth,rnd,L){rnd=rnd||Math.random;L=L||legal(S,side);if(!L.length)return null;
    const sc1=order(S,L).map(m=>{const T=clone(S),o=play(T,m[0],m[1]);return[o.king===opp(side)?WIN:evalS(T,side)+rnd()*(depth<=1?.6:.05),m]}).sort((x,y)=>y[0]-x[0]);
    let best=sc1[0][1];if(depth<=1)return best;NODES=0;T_END=Date.now()+TIME_MAX;
    for(let d=2;d<=depth;d++){try{const r=search(S,side,d,-Infinity,Infinity,L);if(r.m)best=r.m;if(r.v>=WIN-20)break}catch(e){if(e===STOP)break;throw e}}
    return best}
  return{defWith,guarded,LINE_X,FOCUS_N,lined,support,KEYS,sqOf,pseudo,legal,safe,threats,inCheck,setChk,get CHK(){return CHK},facing,BASE,GROW,DIFF,RND_MAX,PAWN_X,GUARD_K,G,unit,mkState,put,clear,clone,calc,play,stays,atkAt,defAt,inPal,nb4,kingOf,evalS,decide,search,get NODES(){return NODES}}})();
/* ---------- 星門圍城 v2 對局（mode "gate-siege-v2"）：開局、走子、回合結算、星門援軍、38 招、電腦出步 ----------
   關卡擺法、波次、後備、補給點照 07bhg-gatesiege.js 的 GSV（GSV.lvOf／plan）；這裡不碰畫面，node 測試用 vm 把兩支一起載。
   td.s＝SG2 的狀態（跟 P.board 同步，存檔就靠它：local.js 重建盤面時直接照 td.s，不重放棋譜）。
   回合：紅方走一步＋最多放一招（先後自選），黑方走完＝一回合結束（td.rnd +1）。「這回合」＝until 是現在的 rnd；「兩回合」＝until 是 rnd+1；回合結束時 until < rnd 的拿掉。
   靈力（11/16 開發者：每位角色各自一份，不是全隊共用）：td.sp＝{角色:現有}、td.spMax＝{角色:上限}；只有已加入（不是木棋靈）的角色有。
     上限照那位的等級長（Lv1 50 → Lv100 100，曲線同體力）、開局 20、每回合結束每位 +3；吃掉敵子（含招式打死）＋6 給動手那顆所屬的角色、截援 +6 給站在門上那顆的角色；
     放招扣放招那位的、部署扣那顆後備子所屬角色的。一回合全隊還是最多放一招。 */
const SG2G=(()=>{
  const MODE="gate-siege-v2",MV=2,SP0=20,RG=3,KILL_SP=6,CUT_SP=6,DEP_COST=20,DEP_MAX=2;
  const spMaxOf=L=>Math.round(50+50*SG2.G(L));
  const opp=s=>s==="r"?"b":"r",up=p=>String(p||"").toUpperCase(),sd=p=>p?(p===p.toUpperCase()?"r":"b"):null,RW=q=>q/9|0,CL=q=>q%9;
  const STD={K:1,A:2,B:2,N:2,R:2,C:2,P:5};
  /* ===== 第二期：關卡分組（11/16）=====
     圍城主線 12 關＋急襲 12 個殘陣（關號 13～24，07bhg LV）＝24 關；遠征 6 關跟主線 1～6 同名（主線就是它們的改版）不另外收。
     易中難三組照 node 模擬排（tools/siege2-sim.js：對方等級全部設 8、第 8 天隊伍、玩家 20% 的步失手，照勝和率排），每組 8 關、組內由易到難。
     第四期（11/16）用全部規則（各自靈力、星樞招、被動集火）每關 8 盤重排，開發者選單換成這一版；另一批模擬第 8 天打中：易組 65%、中組 42%、難組 17%。
     畫面上的關名＝組名＋組內第幾關（易 1…難 8）；序章照舊 A1～C3。解鎖照這個順序：序章 C1 → 易 1 → … → 難 8；打贏過的關（含舊規則的紀錄）保持開 */
  const GRP=[{id:"pro",nm:"序章",lv:[31,32,33,34,35,36,37,38,39]},{id:"e",nm:"易",lv:[10,12,18,20,6,16,17,8]},{id:"m",nm:"中",lv:[3,22,15,7,23,5,4,1]},{id:"h",nm:"難",lv:[13,14,2,19,21,24,9,11]}];
  const ORD=GRP.slice(1).reduce((a,g)=>a.concat(g.lv),[]);
  /* 對方等級：序章 1；易組 2～6、中組 6～10、難組 10～14（組內越後面越高）；關卡寫了 elv 就照關卡。第四期跑模擬再調 */
  const ELVM={};GRP.slice(1).forEach((g,gi)=>g.lv.forEach((n,i)=>{ELVM[n]=2+gi*4+Math.round(i*4/7)}));
  const ELV=n=>n>=31&&n<=39?1:ELVM[n]||10;
  const R3=n=>n>=31&&n<=39?14:24;
  const r3Of=(n,d)=>{const V=typeof GSV!=="undefined"&&GSV.LV[n]||{};return(+V.r3||R3(n))+(+d===1?6:0)};   /* 三星的回合數：易多 6 回合 */
  function nameOf(n){const g=GRP.find(x=>x.lv.includes(+n));if(!g)return typeof GSV!=="undefined"?GSV.lvName(n):"第 "+n+" 關";return g.id==="pro"&&typeof GSV!=="undefined"?GSV.lvName(n):g.nm+" "+(g.lv.indexOf(+n)+1)}
  /* 鎖：空字串＝開著。has＝07pty 的 ptyHas（序章看誰加入了）；all＝開發者全開 */
  function lockWhy(P,n,all,has){n=+n;if(all||(typeof GSV!=="undefined"&&!GSV.LVN.includes(n)))return"";const R=P||{};
    const won=k=>!!((R.c&&R.c[k]&&R.c[k].w>0)||(R.h&&R.h[k]&&R.h[k].w>0)||(R.v2&&R.v2[k]&&[1,2,3].some(d=>R.v2[k][d]&&R.v2[k][d].w>0)));
    if(n>=31&&n<=39)return typeof GSV!=="undefined"?GSV.lockWhy(R,n,0,false,has):"";
    if(won(n))return"";const i=ORD.indexOf(n);if(i<0)return"";
    if(i===0){const old=!!R.c&&Object.keys(R.c).some(k=>+k>=1&&+k<=12&&R.c[k]&&(R.c[k].w||R.c[k].l||R.c[k].d));return old||won(37)?"":"破序章 C1 開放"}
    return won(ORD[i-1])?"":"破"+nameOf(ORD[i-1])+" 開放"}
  /* ===== 35 招（story/165 第三節；解鎖等級 1／4／8／12／16；耗靈、冷卻沿用舊表，第四期模擬再調；11/16 開發者選單：拿掉緊急回復，集火、士相護線改成雙方都有的被動規則，見 SG2） =====
     tg：要選的目標（每一步一種）。info＝純情報（不占招、不扣靈）。once＝每局一次 */
  const SK=[
    {id:"shen1",ch:"x_shuai",lv:1,nm:"重金懸賞",cost:30,cd:4,tg:["ownHurt"],d:"一顆己子回 15 體力（可以是帥）"},
    {id:"shen2",ch:"x_shuai",lv:4,nm:"庭院小息",cost:20,cd:3,d:"帥回 8 體力；上一步被將軍就回 12"},
    {id:"shen3",ch:"x_shuai",lv:8,nm:"帥令安軍",cost:20,cd:2,d:"帥兩回合內防禦力 +10"},
    {id:"shen4",ch:"x_shuai",lv:12,nm:"當票回春",cost:30,cd:4,tg:["ownHurt"],d:"一顆己子回 12 體力；那顆不到一半就回 17"},
    {id:"shen5",ch:"x_shuai",lv:16,nm:"九宮守心",cost:30,cd:5,d:"帥站九宮正中心才能放：之後每回合結束帥還在正中心就回 4 體力，最多 3 次"},
    {id:"tie1",ch:"x_shi",lv:1,nm:"鐵壁銅牆",cost:20,cd:3,tg:["own"],d:"一顆己子兩回合內防禦力 +10"},
    {id:"tie2",ch:"x_shi",lv:4,nm:"仕角守門",cost:20,cd:3,d:"兩回合內，己方仕斜角相鄰的空點變成守門點：敵子走進去就定身一回合"},
    {id:"tie3",ch:"x_shi",lv:8,nm:"銅鎖止步",cost:30,cd:4,tg:["foe"],d:"鎖住一顆敵子：它這回合如果動了（走子或攻擊），就定身兩回合"},
    {id:"tie4",ch:"x_shi",lv:12,nm:"近侍護帥",cost:30,cd:4,d:"帥旁邊（上下左右、斜角一格）每顆己方仕讓帥防禦力 +6（最多 +12），兩回合"},
    {id:"tie5",ch:"x_shi",lv:16,nm:"盾陣回靈",cost:0,cd:4,d:"上一回合有己子被扣體力，回 6 靈力"},
    {id:"bu1",ch:"x_bing",lv:1,nm:"神行百里",cost:30,cd:4,tg:["own","own2"],d:"交換己方兩子位置（換完要合法、帥不能被一下打死）"},
    {id:"bu2",ch:"x_bing",lv:4,nm:"勇往直前",cost:0,cd:3,d:"上一步是兵往前走，回 6 靈力"},
    {id:"bu3",ch:"x_bing",lv:8,nm:"跑腿賺錢",cost:20,cd:5,d:"接下來三回合，往前走的那顆兵回 4 體力，最多 3 次"},
    {id:"bu4",ch:"x_bing",lv:12,nm:"步步為營",cost:15,cd:3,tg:["ownP"],d:"一顆兵兩回合內防禦力 +8"},
    {id:"bu5",ch:"x_bing",lv:16,nm:"揚州快步",cost:5,cd:4,d:"兩回合內，下一個其他付費招少 15 靈力（最低 10）"},
    {id:"qi1",ch:"x_swordboy",lv:1,nm:"一劍破甲",cost:40,cd:5,tg:["foe"],once:1,d:"每局一次：一顆非將敵子的防禦力降到 0"},
    {id:"qi2",ch:"x_swordboy",lv:4,nm:"直路衝鋒",cost:20,cd:3,d:"這回合俥攻擊時，攻擊力 +「直走格數×2」（最多 +10）"},
    {id:"qi3",ch:"x_swordboy",lv:8,nm:"輪牌護身",cost:20,cd:3,tg:["ownR"],d:"這顆俥兩回合內防禦力 +10"},
    {id:"qi4",ch:"x_swordboy",lv:12,nm:"認轍尋路",cost:0,cd:0,info:1,d:"標出下一步打得到己方俥的敵子（情報，不占招、不扣靈）"},
    {id:"qi5",ch:"x_swordboy",lv:16,nm:"長街破陣",cost:35,cd:5,tg:["ownR","line"],d:"俥那一線最近 3 顆非將敵子各受一次攻擊（攻擊力打五折，照攻對防；俥不移動）"},
    {id:"tian1",ch:"x_spiritgirl",lv:1,nm:"飛燕還巢",cost:30,cd:4,tg:["ownBig","back"],d:"己方一顆俥、炮或傌回到底線空格（要合法）"},
    {id:"tian2",ch:"x_spiritgirl",lv:4,nm:"青玉護棚",cost:20,cd:4,d:"九宮裡的己子兩回合內防禦力 +8"},
    {id:"tian3",ch:"x_spiritgirl",lv:8,nm:"象眼迷煙",cost:20,cd:3,tg:["foeHalf"],d:"己方半場一顆敵子兩回合內不能攻擊（還能走）"},
    {id:"tian4",ch:"x_spiritgirl",lv:12,nm:"渡口清茶",cost:20,cd:3,tg:["ownHurt"],d:"一顆己子回 10 體力"},
    {id:"tian5",ch:"x_spiritgirl",lv:16,nm:"雙燕斜護",cost:30,cd:4,tg:["own","diag"],d:"斜向相鄰的兩顆己子結對：兩回合內一顆被攻擊，另一顆替它承受一半"},
    {id:"lei1",ch:"x_martialgirl",lv:1,nm:"煙火震懾",cost:20,cd:3,tg:["foeFrz"],d:"一顆非將敵子這回合不能動；之後兩回合內同一顆不能再被定身"},
    {id:"lei2",ch:"x_martialgirl",lv:4,nm:"隔子星花",cost:20,cd:3,tg:["foeCan"],d:"炮隔一子打得到的一顆非將敵子受一次攻擊（照攻對防，炮不移動）"},
    {id:"lei3",ch:"x_martialgirl",lv:8,nm:"花火連環",cost:30,cd:4,d:"炮打得到的最多 3 顆非將敵子防禦力各降 6"},
    {id:"lei4",ch:"x_martialgirl",lv:12,nm:"火網標記",cost:20,cd:3,d:"兩回合內，炮隔兩子也能攻擊"},
    {id:"lei5",ch:"x_martialgirl",lv:16,nm:"煙幕護耳",cost:20,cd:3,tg:["ownNK"],d:"己方一子這回合不會被敵子攻擊"},
    {id:"luo1",ch:"x_miaogirl",lv:1,nm:"回營",cost:50,cd:5,tg:["lost"],once:1,d:"每局一次：一顆被吃掉的己子回到原位，體力一半（原位要空、要合法；不能復活帥）"},
    {id:"luo2",ch:"x_miaogirl",lv:4,nm:"紅馬跳影",cost:20,cd:3,tg:["ownHorse"],d:"選一顆傌：日字跳得到的所有敵子（不含將帥，被蹩腿的方向打不到）各受一次攻擊，攻擊力打六折，照攻對防；傌不移動"},
    {id:"luo3",ch:"x_miaogirl",lv:8,nm:"拐彎避風",cost:20,cd:3,d:"上一步走的是傌：那顆傌兩回合內防禦力 +10"},
    {id:"luo4",ch:"x_miaogirl",lv:12,nm:"驛鈴回氣",cost:20,cd:4,tg:["ownHurt"],d:"一顆己子回 6 體力；這局下一次復活的子再回 10"},
    {id:"luo5",ch:"x_miaogirl",lv:16,nm:"馬腿解圍",cost:20,cd:3,tg:["ownLeg"],d:"己方傌被自己人蹩腿：把蹩腿的子移到己方半場最近的合法空位（只往左右或後方）"}];
  const SKM={};for(const s of SK)SKM[s.id]=s;
  const PCS=["R","N","B","A","K","C","P"],JOIN_ORD=["x_swordboy","x_miaogirl","x_shuai","x_shi","x_spiritgirl","x_bing","x_martialgirl"];
  /* 上場的招：已加入（不是木棋靈）的每一位、照各自等級學會的全部都能用（11/16 開發者：不再限全隊帶 4 招）；照加入順序排。
     那位角色的棋子在盤上都倒了（例如兩顆俥都被吃），那位的招就不能放（開發者選單），回營復活後又能用 */
  const PC_OF={x_swordboy:"R",x_miaogirl:"N",x_spiritgirl:"B",x_shi:"A",x_shuai:"K",x_martialgirl:"C",x_bing:"P"};
  const skOfSq=sq=>SK.filter(s=>!s.gen&&sq&&PCS.some(pc=>sq[pc]&&sq[pc].ck===s.ch&&!sq[pc].wood&&s.lv<=(+sq[pc].L||1))).sort((a,b)=>JOIN_ORD.indexOf(a.ch)-JOIN_ORD.indexOf(b.ch)).map(s=>s.id);
  function skPick(sq){return skOfSq(sq)}
  const lvSq=(sq,pc)=>sq&&sq[pc]?Math.max(1,Math.min(100,+sq[pc].L||1)):1;
  function ev(td,o){o.s=++td.seq;o.r=td.rnd+1;td.ev.push(o);if(td.ev.length>40)td.ev.splice(0,td.ev.length-40);return o}
  const act=(L,R)=>(L||[]).filter(o=>o.until>=R);
  /* ===== 開局 ===== cfg＝{mode, lv, diff(1 易／2 中／3 難), sq(隊伍：{R:{ck,L,wood}…}，沒帶就問 07pty 的 ptySquad), sk} */
  /* ===== 每位角色專屬天賦（11/16 開發者；story/167）：每位 4 個、最多點亮 2 個、星塵全隊共用（bhtdDust.d）、不分層、關卡外免費重置；
     價錢 600／800（每場贏最多 6 星塵，開發者「至少要 100 場以上」）。點亮的存在 store "sg2Tal"＝{角色:[天賦 id]}（05b JOURNEY_KEYS）。
     效果只作用在那位自己；那位還沒加入（木棋靈）就不算 ===== */
  const TALC={
    x_swordboy:[{id:"q_tl",nm:"鐵輪",cost:600,d:"俥的攻擊力 +4"},{id:"q_cq",nm:"長驅",cost:800,d:"俥直走 3 格以上去攻擊，這一下攻擊力 +6"},{id:"q_lz",nm:"輪轉不息",cost:600,d:"俥打死敵子，齊轍再回 6 靈"},{id:"q_sr",nm:"雙刃破甲",cost:800,d:"一劍破甲每局可以用 2 次"}],
    /* 11/16 開發者「寫現在的就好」：天賦說明只寫點亮後的效果，不寫「改…（原本…）」 */
    x_miaogirl:[{id:"l_tx",nm:"踏雪",cost:600,d:"傌的體力 +6"},{id:"l_hm",nm:"回馬槍",cost:800,d:"傌攻擊沒打死時，對方防禦再降 3"},{id:"l_cy",nm:"草原之風",cost:600,d:"駱躍梅每回合多回 2 靈"},{id:"l_sy",nm:"雙影",cost:800,d:"紅馬跳影的攻擊力從六折提高到八折"}],   /* 11/17 測試員 D（P3-4）：「八折」看不出是加成還是懲罰 → 寫出前後（luo2：沒點 .6、點亮 .8） */
    x_shuai:[{id:"s_zz",nm:"坐鎮",cost:600,d:"帥的體力 +15"},{id:"s_dx",nm:"定心",cost:600,d:"上一步被將軍，這一回合帥防禦 +6"},{id:"s_dd",nm:"典當有道",cost:800,d:"沈方庭回體力的招多回 4"},{id:"s_jg",nm:"九宮令",cost:800,d:"九宮裡的其他己子防禦再 +4"}],
    x_shi:[{id:"t_tw",nm:"鐵衛",cost:600,d:"仕的防禦 +5"},{id:"t_hz",nm:"以身護主",cost:800,d:"仕替帥擋傷害時擋三分之二"},{id:"t_sj",nm:"銅鎖加固",cost:600,d:"銅鎖止步的定身多 1 回合"},{id:"t_dz",nm:"盾陣回靈",cost:600,d:"盾陣回靈 10"}],
    x_spiritgirl:[{id:"n_qy",nm:"青玉",cost:600,d:"相的防禦 +5"},{id:"n_sh",nm:"雙燕護線",cost:800,d:"相護到的子（士相護線）防禦再 +5"},{id:"n_dk",nm:"渡口茶香",cost:600,d:"渡口清茶多回 6"},{id:"n_yg",nm:"燕歸",cost:800,d:"飛燕還巢回到底線的子再回 8 體力"}],
    x_martialgirl:[{id:"r_hy",nm:"火藥",cost:600,d:"炮的攻擊力 +4"},{id:"r_cy",nm:"赤焰火網",cost:800,d:"花火連環降防從 6 變 9"},{id:"r_lf",nm:"連發",cost:600,d:"隔子星花冷卻少 1 回合"},{id:"r_jl",nm:"驚雷",cost:800,d:"炮打死敵子，雷借花再回 8 靈"}],
    x_bing:[{id:"b_kt",nm:"快腿",cost:800,d:"兵過河的攻擊加成從 +6 變 +10"},{id:"b_yg",nm:"硬骨",cost:600,d:"兵的體力 +4"},{id:"b_pt",nm:"跑腿賺錢",cost:600,d:"勇往直前回 10 靈"},{id:"b_xh",nm:"星火燎原",cost:800,d:"每有一顆過河的兵，回合結束步越溪回 1 靈（最多 3）"}]};
  const TALM={},TAL_CK={};for(const ck in TALC)for(const t of TALC[ck]){TALM[t.id]=t;TAL_CK[t.id]=ck}
  const TAL_MAX=2;
  /* 整理點亮清單：認得、屬於那位、不重複、每位最多 TAL_MAX 個 */
  function talNorm(o){const r={};if(!o||typeof o!=="object")return r;for(const ck in TALC){const L=(Array.isArray(o[ck])?o[ck]:[]).filter((id,i,A)=>TAL_CK[id]===ck&&A.indexOf(id)===i).slice(0,TAL_MAX);if(L.length)r[ck]=L}return r}
  const talSpent=o=>{let n=0;o=talNorm(o);for(const ck in o)for(const id of o[ck])n+=TALM[id].cost;return n};
  /* 能不能點亮：空字串＝可以。lvNow＝那位的等級：五招都學會（到最後一招的解鎖等級）才能點天賦（11/16 開發者「要把所有個人的招式都學會之後才能點天賦」） */
  const talNeedL=ck=>Math.max(...SK.filter(s=>s.ch===ck).map(s=>s.lv));
  function talWhy(o,id,dust,lvNow){const t=TALM[id];if(!t)return"沒有這個天賦";const ck=TAL_CK[id];if(lvNow!=null&&(+lvNow||0)<talNeedL(ck))return"五招都學會（Lv "+talNeedL(ck)+"）才能點天賦";o=talNorm(o);const L=o[TAL_CK[id]]||[];if(L.includes(id))return"已經點亮了";if(L.length>=TAL_MAX)return"每位最多點亮 "+TAL_MAX+" 個（先重置這位）";
    if((Math.round(+dust)||0)<t.cost)return"星塵不夠（要 "+t.cost+"，現在 "+(Math.round(+dust)||0)+"）";return""}
  const hasT=(td,id)=>{const ck=TAL_CK[id];return!!(ck&&td.tal&&td.tal[ck]&&td.tal[ck].includes(id)&&td.sp&&td.sp[ck]!=null)};
  /* 開局：固定加成寫進 S.bx、體力加到現有的子（之後部署、復活的子也走 talHp） */
  function talApply(td){const S=td.s,bx={a:{},d:{}};if(hasT(td,"q_tl"))bx.a.R=4;if(hasT(td,"r_hy"))bx.a.C=4;if(hasT(td,"t_tw"))bx.d.A=5;if(hasT(td,"n_qy"))bx.d.B=5;
    if(hasT(td,"b_kt"))bx.pawn=10;if(hasT(td,"s_jg"))bx.pal=4;if(hasT(td,"n_sh"))bx.lineB=5;if(hasT(td,"t_hz"))bx.aShare=2/3;S.bx=bx;for(let q=0;q<90;q++)talHp(td,q)}
  function talHp(td,q){const S=td.s,p=S.b[q];if(!p||sd(p)!=="r")return;const n=(up(p)==="K"&&hasT(td,"s_zz")?15:0)+(up(p)==="N"&&hasT(td,"l_tx")?6:0)+(up(p)==="P"&&hasT(td,"b_yg")?4:0);if(n){S.x[q]+=n;S.h[q]+=n}}
  const talOf=cfg=>talNorm(cfg.tal!==undefined?cfg.tal:(()=>{try{return typeof store!=="undefined"?store.get("sg2Tal",null):null}catch(e){return null}})());
  function boot(cfg,P,C){cfg=cfg||{};const n=+cfg.lv,V=typeof GSV!=="undefined"&&GSV.lvOf(n);if(!V)throw new Error("星門圍城沒有第 "+cfg.lv+" 關");
    const diff=V.pro?1:[1,2,3].includes(+cfg.diff)?+cfg.diff:2,D=SG2.DIFF[diff],sq=cfg.sq!==undefined?cfg.sq:(typeof ptySquad==="function"?ptySquad():null),elv=+V.elv||ELV(n),pl=GSV.plan(n);
    const S=SG2.mkState(P.board,(s,pc)=>s==="r"?lvSq(sq,pc):elv,s=>s==="r"?1:D.mul);
    const waves=pl.waves.map(w=>Object.assign({},w));if(diff===3&&waves.length){const last=Math.max(...waves.map(w=>w.wv)),at=Math.max(...waves.map(w=>w.at))+2;   /* 難：最後一波再來一次，晚 2 回合 */
      for(const w of waves.filter(x=>x.wv===last))waves.push(Object.assign({},w,{id:w.id+"x",wv:last+1,at,st:"wait",dl:0}))}
    const home={};for(let q=0;q<90;q++)if(S.i[q])home[S.i[q]]=q;const k=SG2.kingOf(S.b,"r");
    const td={mode:MODE,mv:MV,lv:n,nm:V.nm,diff,dnm:D.nm,depth:D.depth,elv,rnd:0,seq:0,ev:[],over:null,s:S,turn:P.turn||"r",waves,home,lost:[],
      sp:spInit(sq),spMax:spCap(sq),sk:skPick(sq),cd:{},used:{},sk1:-1,res:pl.res.slice(),dp:pl.dp,dep:0,
      ctl:{frz:[],lock:[],noCap:[],noTake:[],trap:null,imm:{}},buf:{},hurt:{r:0,b:0},hurt0:{r:0,b:0},last:{r:null,b:null},kmax:k>=0?S.x[k]:1,r3:r3Of(n,diff),rlim:SG2.RND_MAX,sq:sq||null};
    td.esp=ESP0;td.ecd={};td.elast=-99;td.ecR=-1;
    td.tal=talOf(cfg);talApply(td);if(k>=0)td.kmax=S.x[k];if(+V.sp0>0)for(const c in td.sp)td.sp[c]=Math.min(td.spMax[c],+V.sp0);td.pro=V.pro?1:0;
    {const F=typeof dglXiangFx==="function"?dglXiangFx():null;if(F){if(F.kHp>0&&k>=0){S.x[k]+=F.kHp;td.kmax=S.x[k]}if(F.sp0>0)for(const c in td.sp)td.sp[c]=Math.min(td.spMax[c],td.sp[c]+F.sp0);td.xf=F}}   /* 11/16 二十八宿四象點齊的永久效果（07dgl dglXiangFx）：帥體力、開局靈力；每回合靈力在 roundEnd、過關星塵在結算 */
    ev(td,{k:"start",nm:V.nm,diff});return td}
  /* ===== 合法步（招式的限制：定身的不能動、不能攻擊的不攻擊、受保護的不能打）；全部濾光就照規則全部（不會因為招式變成困斃） ===== */
  function legal(P,C,side){const td=P.td,S=td.s;side=side||P.turn;const L=SG2.legal(S,side);if(side!=="b")return L;const R=td.rnd,c=td.ctl;
    const frz=new Set(act(c.frz,R).map(o=>o.id)),noCap=new Set(act(c.noCap,R).map(o=>o.id)),noTake=new Set(act(c.noTake,R).map(o=>o.id));
    const F=L.filter(([f,t])=>!frz.has(S.i[f])&&!(S.b[t]&&(noCap.has(S.i[f])||noTake.has(S.i[t]))));return F.length?F:L}
  const sync=(P,C)=>{const td=P.td;P.board=td.s.b.slice();P.turn=td.turn;if(P.pos&&P.pos.length)P.pos[P.pos.length-1]=C.fen(P.board,P.turn)};
  function heal(td,q,n,why){const S=td.s;if(q<0||!S.b[q])return 0;const a=Math.max(0,Math.min(n,S.x[q]-S.h[q]));S.h[q]+=a;ev(td,{k:"heal",sq:q,n:a,why});return a}
  function defUp(td,q,n,until){const S=td.s;if(q<0||!S.b[q])return;S.g[q]+=n;S.ge[q]=Math.max(S.ge[q],until)}
  /* 每位角色的靈力池：隊伍裡已加入（不是木棋靈）的才有 */
  function spCap(sq){const o={};for(const pc of PCS){const x=sq&&sq[pc];if(x&&x.ck&&!x.wood)o[x.ck]=spMaxOf(x.L)}return o}
  function spInit(sq){const o={};for(const ck in spCap(sq))o[ck]=SP0;return o}
  const ckOf=(td,pc)=>{const x=td.sq&&td.sq[up(pc)];return x&&x.ck&&!x.wood?x.ck:null};
  const spOf=(td,ck)=>ck&&td.sp&&td.sp[ck]!=null?td.sp[ck]:0;
  function spAdd(td,ck,n){if(!ck||!td.sp||td.sp[ck]==null)return 0;const a=Math.max(0,Math.min(n,td.spMax[ck]-td.sp[ck]));td.sp[ck]+=a;return a}
  /* 招式打一下（攻擊者不移動）：mul＝攻擊力倍率。回 calc 的結果 */
  function hit(td,f,t,mul){const S=td.s,A=SG2.atkAt(S,f);S.ax={[f]:Math.round(A*(mul||1))-A};const c=SG2.calc(S,f,t,true);S.ax=null;const v=S.b[t];
    if(!c.ok){S.d[t]=Math.max(0,S.d[t]-c.down);ev(td,{k:"att",f,t,ok:0,down:c.down,sk:1,D0:c.D,D1:SG2.defAt(S,t),A:c.A});return c}
    if(c.share){S.h[c.share.q]-=c.share.dmg;if(S.h[c.share.q]<=0)gone(td,c.share.q)}
    S.h[t]-=c.dmg;ev(td,{k:"att",f,t,ok:1,dmg:c.dmg,sh:c.share,sk:1});if(S.h[t]<=0){const by=S.b[f];gone(td,t);if(sd(v)==="b"){spAdd(td,ckOf(td,by),KILL_SP);if(up(by)==="C"&&hasT(td,"r_jl"))spAdd(td,"x_martialgirl",8)}}return c}
  /* 一顆子被打死：紅方的記到 lost（回營用），從盤上拿掉 */
  function gone(td,q){const S=td.s,p=S.b[q],id=S.i[q];if(!p)return;if(sd(p)==="r"&&up(p)!=="K"){td.lost.push({id,p,home:td.home[id]});td.lostN=(td.lostN||0)+1}ev(td,{k:"kill",sq:q,p});SG2.clear(S,q)}
  function straight(f,t){if(RW(f)===RW(t))return Math.abs(CL(f)-CL(t));if(CL(f)===CL(t))return Math.abs(RW(f)-RW(t));return 0}
  /* ===== 走一步（local.js playApply 交過來；紅黑都是）===== 回 {m, end} */
  function play(P,f,t,C){const td=P.td,S=td.s,by=P.turn,R=td.rnd,p=S.b[f],v=S.b[t],vid=S.i[t],mid=S.i[f];let cn="";try{cn=C.notate(P.board,f,t)}catch(e){}
    S.ax=null;if(v&&by==="r"){const ax={};if(up(p)==="R"&&hasT(td,"q_cq")&&straight(f,t)>=3)ax[f]=(ax[f]||0)+6;if(td.buf.qi2&&td.buf.qi2.until>=R&&up(p)==="R")ax[f]=(ax[f]||0)+Math.min(10,2*straight(f,t));S.ax=ax}
    const pre=v?SG2.calc(S,f,t):null,shP=pre&&pre.share?{q:pre.share.q,p:S.b[pre.share.q],id:S.i[pre.share.q]}:null;
    const o=SG2.play(S,f,t);S.ax=null;
    if(o.shareKill&&shP&&sd(shP.p)==="r"&&up(shP.p)!=="K"){td.lost.push({id:shP.id,p:shP.p,home:td.home[shP.id]});td.lostN=(td.lostN||0)+1}
    if(o.kill&&sd(v)==="r"&&up(v)!=="K"){td.lost.push({id:vid,p:v,home:td.home[vid]});td.lostN=(td.lostN||0)+1}
    if(o.att&&o.ok)td.hurt[sd(v)]=1;if(o.kill&&by==="r")spAdd(td,ckOf(td,p),KILL_SP);if(o.kill&&by==="b")espAdd(td,KILL_SP);
    if(by==="r"&&o.kill&&up(p)==="R"&&hasT(td,"q_lz"))spAdd(td,"x_swordboy",6);
    if(by==="r"&&o.kill&&up(p)==="C"&&hasT(td,"r_jl"))spAdd(td,"x_martialgirl",8);
    if(by==="r"&&o.att&&!o.kill&&up(p)==="N"&&hasT(td,"l_hm")&&S.b[t]){S.d[t]=Math.max(0,S.d[t]-3);ev(td,{k:"tal",id:"l_hm",sq:t})}
    const m={f,t,by,cn,cap:o.kill?v:null,ck:false,st:o.att&&!o.moved?1:0};if(o.att){m.dmg=o.dmg||0;m.down=o.down||0;if(o.share)m.sh=o.share}
    ev(td,o.att?Object.assign({k:"att",f,t,by,ok:o.ok?1:0,dmg:o.dmg,down:o.down,sh:o.share,kill:o.kill?1:0,p:v},o.ok||!S.b[t]?{}:{D0:pre.D,D1:SG2.defAt(S,t),A:pre.A}):{k:"mv",f,t,by});   /* 11/17 iMac 18：打不動時記下對方實際防禦的前後（D0→D1，含護線、護帥）跟這一下的攻擊力，畫面跳字、資料卡、提示都用同一個數 */
    const at=o.moved?t:f;
    if(by==="r"&&td.buf.bu3&&td.buf.bu3.n>0&&td.buf.bu3.until>=R&&up(p)==="P"&&o.moved&&RW(t)<RW(f)){td.buf.bu3.n--;heal(td,t,4,"跑腿賺錢")}
    if(by==="b"){const c=td.ctl;if(o.moved&&c.trap&&c.trap.until>=R&&c.trap.sqs.includes(t)){c.frz.push({id:mid,until:R+1});ev(td,{k:"trap",sq:t})}
      if(act(c.lock,R).some(x=>x.id===mid)){c.frz.push({id:mid,until:R+(hasT(td,"t_sj")?3:2)});c.lock=c.lock.filter(x=>x.id!==mid);ev(td,{k:"lock",sq:at})}}
    td.last[by]={f,t,p,att:o.att?1:0,moved:o.moved?1:0,ck:0};
    td.turn=opp(by);P.moves.push(m);P.board=S.b.slice();P.turn=td.turn;P.pos=P.pos||[];P.pos.push(C.fen(P.board,P.turn));m.ck=SG2.inCheck(S,P.turn);td.last[by].ck=m.ck?1:0;
    if(by==="b"&&m.ck&&hasT(td,"s_dx")){const k=SG2.kingOf(S.b,"r");defUp(td,k,6,R+1)}
    let end=null;if(o.king)end={w:by,why:"將帥體力歸零"};
    if(!end&&by==="b")end=roundEnd(P,C);
    if(!end){const nx=P.turn;if(!SG2.legal(S,nx).length)end={w:opp(nx),why:SG2.inCheck(S,nx)?"將死":"困斃"}}
    if(end){td.over=end;ev(td,{k:"end",w:end.w,why:end.why})}return{m,end}}
  /* ===== 回合結束（黑方走完）：回靈、到期、九宮守心、星門落子、回合上限 ===== */
  function roundEnd(P,C){const td=P.td,S=td.s;td.rnd++;const R=td.rnd;for(const ck in td.sp)spAdd(td,ck,RG+((td.xf&&td.xf.rg)||0));espAdd(td,ERG);td.hurt0=td.hurt;td.hurt={r:0,b:0};
    for(let q=0;q<90;q++)if(S.g[q]&&S.ge[q]<R){S.g[q]=0;S.ge[q]=0}
    for(const k of["frz","lock","noCap","noTake"])td.ctl[k]=act(td.ctl[k],R);if(td.ctl.trap&&td.ctl.trap.until<R)td.ctl.trap=null;
    for(const k in td.ctl.imm)if(td.ctl.imm[k]<R)delete td.ctl.imm[k];
    for(const k of["fc","qi2","bu3","disc","net","pair"])if(td.buf[k]&&td.buf[k].until<R)delete td.buf[k];
    S.net=td.buf.net?"r":null;S.pr=td.buf.pair?[[td.buf.pair.a,td.buf.pair.b]]:[];
    if(hasT(td,"l_cy"))spAdd(td,"x_miaogirl",2);
    if(hasT(td,"b_xh")){let n=0;for(let q=0;q<45;q++)if(S.b[q]==="P")n++;spAdd(td,"x_bing",Math.min(3,n))}
    const B=td.buf.shen5;if(B&&B.n>0){const k=SG2.kingOf(S.b,"r");if(k===85){B.n--;heal(td,k,4,"九宮守心")}if(B.n<=0)delete td.buf.shen5}
    spawn(P,C);sync(P,C);
    if(R>=td.rlim)return{w:null,why:"打滿 "+td.rlim+" 回合沒分勝負"};return null}
  /* 星門落子：門格有紅子＝截援（這一顆不來了，回 6 靈）；有黑子、會讓紅方沒步、將帥照面＝晚一回合（最多晚 3 回合，再不行就不來） */
  function spawn(P,C){const td=P.td,S=td.s,R=td.rnd;
    for(const w of td.waves){if(w.st!=="wait"||w.at>R)continue;const q=w.sq,x=S.b[q];
      if(x&&sd(x)==="r"){w.st="cut";spAdd(td,ckOf(td,x),CUT_SP);ev(td,{k:"cut",sq:q,p:w.p});continue}
      if(S.b.filter(y=>y===w.p).length>=(STD[up(w.p)]||0)){w.st="gone";continue}
      let bad=!!x;if(!bad){const T=SG2.clone(S);SG2.put(T,q,w.p,td.elv,SG2.DIFF[td.diff].mul);bad=SG2.facing(T.b)||!SG2.legal(T,"r").length}
      if(bad){w.dl=(w.dl||0)+1;w.at=R+1;if(w.dl>3)w.st="gone";continue}
      const id=SG2.put(S,q,w.p,td.elv,SG2.DIFF[td.diff].mul);td.home[id]=q;w.st="down";ev(td,{k:"spawn",sq:q,p:w.p,wv:w.wv})}}
  /* 還沒落的援軍（畫面預告用）：照回合排 */
  const fore=td=>td.waves.filter(w=>w.st==="wait").sort((a,b)=>a.at-b.at);
  /* ===== 招式 ===== */
  const isMine=P=>P.turn===P.human&&!P.result&&!P.td.over;
  function costOf(td,id){if(id==="dep")return DEP_COST;const s=SKM[id];if(!s)return 0;let c=s.cost;const D=td.buf.disc;if(D&&D.until>=td.rnd&&c>0&&id!=="bu5")c=Math.max(10,c-15);return c}
  const own=(S,f)=>{const o=[];for(let q=0;q<90;q++)if(S.b[q]&&sd(S.b[q])==="r"&&(!f||f(S.b[q],q)))o.push(q);return o};
  const foe=(S,f)=>{const o=[];for(let q=0;q<90;q++)if(S.b[q]&&sd(S.b[q])==="b"&&S.b[q]!=="k"&&(!f||f(S.b[q],q)))o.push(q);return o};
  const NL=[[-2,-1,-1,0],[-2,1,-1,0],[2,-1,1,0],[2,1,1,0],[-1,-2,0,-1],[1,-2,0,-1],[-1,2,0,1],[1,2,0,1]];
  function horseT(b,n){const o=[];for(const[dr,dc,lr,lc]of NL){const r=RW(n)+dr,c=CL(n)+dc;if(r<0||r>9||c<0||c>8)continue;if(b[(RW(n)+lr)*9+CL(n)+lc])continue;o.push(r*9+c)}return o}
  const horseFoes=(S,n)=>horseT(S.b,n).filter(q=>S.b[q]&&sd(S.b[q])==="b"&&S.b[q]!=="k");   /* 11/16 開發者選單「紅馬跳影改成日字範圍全打」 */
  function legBlocked(b,n){const o=[];for(const[dr,dc,lr,lc]of NL){const r=RW(n)+dr,c=CL(n)+dc;if(r<0||r>9||c<0||c>8)continue;const lq=(RW(n)+lr)*9+CL(n)+lc;if(b[lq]&&sd(b[lq])==="r"&&!o.includes(lq))o.push(lq)}return o}
  function legSpot(S,from){const r0=RW(from),c0=CL(from),p=S.b[from];let best=null,bd=99;for(let q=45;q<90;q++){if(S.b[q]||q===from)continue;if(RW(q)<r0)continue;if(!GSV.canStand(p,q))continue;
      const T=SG2.clone(S);SG2.play(T,from,q);if(!SG2.safe(T,"r"))continue;const d=Math.abs(RW(q)-r0)+Math.abs(CL(q)-c0);if(d<bd){bd=d;best=q}}return best}
  /* 炮打得到的敵子（隔一子；火網開著隔兩子也算） */
  function straightClear(b,f,t){const dr=Math.sign(RW(t)-RW(f)),dc=Math.sign(CL(t)-CL(f));let q=f+dr*9+dc;while(q!==t){if(b[q])return false;q+=dr*9+dc}return true}
  function canT(S,c){return SG2.pseudo(S.b,c,S.net).filter(q=>S.b[q]&&sd(S.b[q])==="b"&&S.b[q]!=="k"&&!straightClear(S.b,c,q))}
  function lineFoes(S,r,dir){const D={u:[-1,0],d:[1,0],l:[0,-1],r:[0,1]}[dir];if(!D)return[];const o=[];let rr=RW(r)+D[0],cc=CL(r)+D[1];
    while(rr>=0&&rr<10&&cc>=0&&cc<9&&o.length<3){const q=rr*9+cc,p=S.b[q];if(p&&sd(p)==="b"&&p!=="k")o.push(q);rr+=D[0];cc+=D[1]}return o}
  const dirSq=(r,dir)=>{const rr=RW(r),cc=CL(r);return dir==="u"?(rr>0?r-9:-1):dir==="d"?(rr<9?r+9:-1):dir==="l"?(cc>0?r-1:-1):(cc<8?r+1:-1)};
  function guardedBy(S,q){const T=S.b.slice();T[q]="p";for(const a of own(S,p=>/[AB]/.test(p)))if(SG2.pseudo(T,a).includes(q))return true;return false}
  function swapOk(S,a,c){const T=SG2.clone(S);const pa=T.b[a],pc=T.b[c];if(!GSV.canStand(pa,c)||!GSV.canStand(pc,a))return false;
    for(const k of SG2.KEYS){const x=T[k][a];T[k][a]=T[k][c];T[k][c]=x}return SG2.safe(T,"r")&&SG2.legal(T,"r").length>0}
  /* 一招的下一步可以選哪些格：pk＝已經選好的 */
  function targets(P,id,pk,C){const td=P.td,S=td.s,s=SKM[id]||{},R=td.rnd;pk=pk||[];const step=(s.tg||[])[pk.length];
    if(id==="dep")return td.dp.filter(d=>!S.b[d.sq]).map(d=>d.sq);
    switch(step){
      case"own":return own(S);case"ownNK":return own(S,p=>p!=="K");
      case"ownHurt":return own(S,(p,q)=>S.h[q]<S.x[q]);
      case"ownR":return own(S,p=>p==="R");case"ownP":return own(S,p=>p==="P");case"ownBig":return own(S,p=>/[RCN]/.test(p));
      case"own2":return own(S,(p,q)=>q!==pk[0]&&swapOk(S,pk[0],q));
      case"diag":return own(S,(p,q)=>Math.abs(RW(q)-RW(pk[0]))===1&&Math.abs(CL(q)-CL(pk[0]))===1);
      case"back":{const a=pk[0],o=[];for(let q=81;q<90;q++){if(S.b[q]||!GSV.canStand(S.b[a],q))continue;const T=SG2.clone(S);SG2.play(T,a,q);if(SG2.safe(T,"r")&&SG2.legal(T,"r").length)o.push(q)}return o}
      case"line":return["u","d","l","r"].filter(d=>lineFoes(S,pk[0],d).length).map(d=>dirSq(pk[0],d)).filter(q=>q>=0);
      case"foe":return foe(S);case"foeFrz":return foe(S,(p,q)=>!(td.ctl.imm[S.i[q]]>=R));
      case"foeHalf":return foe(S,(p,q)=>RW(q)>=5);
      case"foeCan":{const o=new Set();for(const c of own(S,p=>p==="C"))for(const q of canT(S,c))o.add(q);return[...o]}
      case"ownHorse":return own(S,p=>p==="N").filter(n=>horseFoes(S,n).length);
      case"lost":return td.lost.filter(L=>{if(L.home==null||S.b[L.home])return false;const T=SG2.clone(S);T.b[L.home]=L.p;return SG2.safe(T,"r")}).map(L=>L.home);
      case"ownLeg":return own(S,p=>p==="N").filter(n=>legBlocked(S.b,n).some(l=>legSpot(S,l)!=null));
      default:return[]}}
  /* 放不放得了（空字串＝可以） */
  function why(P,id,C){const td=P.td,s=SKM[id];if(!td||td.mode!==MODE)return"這盤不是星門圍城";const S=td.s,R=td.rnd;if(td.over||P.result)return"這局已經結束";if(!isMine(P))return"還沒輪到你";
    if(id==="dep"){if(!td.res.length)return"沒有後備";if(td.dep>=DEP_MAX)return"這局部署過 "+DEP_MAX+" 次了";if(!td.res.some(p=>spOf(td,ckOf(td,p))>=DEP_COST))return"後備子所屬的夥伴靈力都不到 "+DEP_COST+"（還沒加入的木棋靈不能部署）";if(!targets(P,"dep",[],C).length)return"補給點都有子";return""}
    if(!s)return"沒有這一招";if(!td.sk.includes(id))return"這一招還沒學會";{const pc=PC_OF[s.ch];if(pc&&!S.b.includes(pc))return(typeof GSV!=="undefined"&&GSV.CH[s.ch]?GSV.CH[s.ch].n+"的":"")+(typeof GSV!=="undefined"?GSV.PCN[pc]:pc)+"都倒了，這一招不能放"}if(s.info)return"";
    if(s.once&&(td.used[id]||0)>=(id==="qi1"&&hasT(td,"q_sr")?2:1))return id==="qi1"&&hasT(td,"q_sr")?"每局只能用兩次":"每局只能用一次";if(s.max&&(td.used[id]||0)>=s.max)return"每局最多 "+s.max+" 次";
    if(td.sk1===R)return"這回合已經放過招";if((td.cd[id]==null?-1:td.cd[id])>R)return"冷卻中（還要 "+(td.cd[id]-R)+" 回合）";
    if(spOf(td,s.ch)<costOf(td,id))return(typeof GSV!=="undefined"&&GSV.CH[s.ch]?GSV.CH[s.ch].n:"")+"的靈力不夠（要 "+costOf(td,id)+"，現在 "+spOf(td,s.ch)+"）";
    const k=SG2.kingOf(S.b,"r"),L=td.last.r;
    if(id==="shen2"&&k>=0&&S.h[k]>=S.x[k])return"帥的體力是滿的";
    if(id==="shen5"&&k!==85)return"帥要站在九宮正中心";
    if(id==="tie2"&&!own(S,p=>p==="A").length)return"場上沒有仕";
    if(id==="tie4"&&!own(S,(p,q)=>p==="A"&&near8(q,k)).length)return"帥旁邊沒有仕";
    if(id==="tie5"&&!td.hurt0.r)return"上一回合沒有己子被扣體力";
    if(id==="bu2"&&!(L&&up(L.p)==="P"&&L.moved&&RW(L.t)<RW(L.f)))return"上一步要是兵往前走";
    if(id==="luo3"&&!(L&&up(L.p)==="N"&&S.b[L.moved?L.t:L.f]==="N"))return"上一步要是傌走的";
    if(id==="qi2"&&!own(S,p=>p==="R").length)return"場上沒有俥";
    if(id==="lei3"&&!own(S,p=>p==="C").some(c=>canT(S,c).length))return"炮打不到敵子";
    if(id==="lei4"&&!own(S,p=>p==="C").length)return"場上沒有炮";
    if(id==="tian2"&&!own(S,(p,q)=>SG2.inPal(q,"r")).length)return"九宮裡沒有己子";
    if(s.tg&&!targets(P,id,[],C).length)return"現在沒有可以選的目標";
    return""}
  function cast(P,o,C){const td=P.td,id=o&&o.k,s=SKM[id]||{},tg=(o&&o.tg||[]).map(x=>typeof x==="string"&&/^[0-9]+$/.test(x)?+x:x);const w=why(P,id,C);if(w)return{err:w};const S=td.s,R=td.rnd;
    if(id==="dep"){const p=String(o.p||"").toUpperCase(),q=+tg[0],d=td.dp.find(x=>x.sq===q);if(!td.res.includes(p))return{err:"後備沒有這種子"};if(!d||!d.al.includes(p))return{err:"這個補給點不收這種子"};if(S.b[q])return{err:"補給點有子"};const dck=ckOf(td,p);if(!dck)return{err:"這顆後備子的夥伴還沒加入，不能部署"};if(spOf(td,dck)<DEP_COST)return{err:"靈力不夠（要 "+DEP_COST+"）"};
      const T=SG2.clone(S);SG2.put(T,q,p,lvSq(td.sq,p),1);if(!SG2.safe(T,"r"))return{err:"部署完帥會有危險"};
      const nid=SG2.put(S,q,p,lvSq(td.sq,p),1);talHp(td,q);td.home[nid]=q;td.sp[dck]-=DEP_COST;td.dep++;td.res.splice(td.res.indexOf(p),1);td.turn="b";P.turn="b";P.board=S.b.slice();P.pos=P.pos||[];P.pos.push(C.fen(P.board,P.turn));
      ev(td,{k:"dep",p,sq:q,cost:DEP_COST});return{ok:1,pass:1}}
    if(s.info)return{ok:1,info:1};
    if(s.tg){const need=s.tg.length;if(tg.length<need)return{err:"還沒選好目標"};for(let i=0;i<need;i++)if(!targets(P,id,tg.slice(0,i),C).includes(tg[i]))return{err:"這個目標不行"}}
    const run=RUN[id];if(!run)return{err:"這一招還沒做"};const c=costOf(td,id);
    const r=run({P,td,S,R,C},tg)||{};
    td.sp[s.ch]-=c;const cd0=(s.cd||0)-(id==="lei2"&&hasT(td,"r_lf")?1:0);if(r.pass){const o={ok:1,pass:1};if(r.end)o.end=r.end;delete r.pass;delete r.end;td.cd[id]=R+cd0;td.used[id]=(td.used[id]||0)+1;td.sk1=R;ev(td,Object.assign({k:"skill",id,nm:s.nm,cost:c,tg,ch:s.ch},r));return o}if(td.buf.disc&&id!=="bu5"&&c>0)delete td.buf.disc;td.cd[id]=R+cd0;td.used[id]=(td.used[id]||0)+1;td.sk1=R;sync(P,C);
    ev(td,Object.assign({k:"skill",id,nm:s.nm,cost:c,tg,ch:s.ch},r));
    return{ok:1}}
  const K=X=>SG2.kingOf(X.S.b,"r"),near8=(q,k)=>k>=0&&q!==k&&Math.abs(RW(q)-RW(k))<=1&&Math.abs(CL(q)-CL(k))<=1;
  const RUN={
    shen1:(X,tg)=>({n:heal(X.td,tg[0],15+(hasT(X.td,"s_dd")?4:0),"重金懸賞")}),
    shen2:X=>{const ck=X.td.last.b&&X.td.last.b.ck;return{n:heal(X.td,K(X),(ck?12:8)+(hasT(X.td,"s_dd")?4:0),"庭院小息")}},
    shen3:X=>{defUp(X.td,K(X),10,X.R+1);return{}},
    shen4:(X,tg)=>{const q=tg[0];return{n:heal(X.td,q,(X.S.h[q]*2<X.S.x[q]?17:12)+(hasT(X.td,"s_dd")?4:0),"當票回春")}},
    shen5:X=>{X.td.buf.shen5={n:3};return{}},
    tie1:(X,tg)=>{defUp(X.td,tg[0],10,X.R+1);return{}},
    tie2:X=>{const S=X.S,o=[];for(const a of own(S,p=>p==="A"))for(const[dr,dc]of[[1,1],[1,-1],[-1,1],[-1,-1]]){const r=RW(a)+dr,c=CL(a)+dc;if(r<0||r>9||c<0||c>8)continue;const q=r*9+c;if(!S.b[q]&&!o.includes(q))o.push(q)}
      X.td.ctl.trap={sqs:o,until:X.R+1};return{sqs:o}},
    tie3:(X,tg)=>{X.td.ctl.lock.push({id:X.S.i[tg[0]],until:X.R});return{}},
    tie4:X=>{const k=K(X),n=own(X.S,(p,q)=>p==="A"&&near8(q,k)).length,v=Math.min(12,6*n);defUp(X.td,k,v,X.R+1);return{n:v}},
    tie5:X=>({sp:spAdd(X.td,"x_shi",hasT(X.td,"t_dz")?10:6)}),
    bu1:(X,tg)=>{const[a,c]=tg,S=X.S;for(const k of SG2.KEYS){const x=S[k][a];S[k][a]=S[k][c];S[k][c]=x}return{}},
    bu2:X=>({sp:spAdd(X.td,"x_bing",hasT(X.td,"b_pt")?10:6)}),
    bu3:X=>{X.td.buf.bu3={n:3,until:X.R+2};return{}},
    bu4:(X,tg)=>{defUp(X.td,tg[0],8,X.R+1);return{}},
    bu5:X=>{X.td.buf.disc={until:X.R+1};return{}},
    qi1:(X,tg)=>{const q=tg[0],d0=X.S.d[q];X.S.d[q]=0;return{down:d0}},
    qi2:X=>{X.td.buf.qi2={until:X.R};return{}},
    qi3:(X,tg)=>{defUp(X.td,tg[0],10,X.R+1);return{}},
    qi5:(X,tg)=>{const r=tg[0],dir=["u","d","l","r"].find(d=>dirSq(r,d)===tg[1]),L=lineFoes(X.S,r,dir);for(const q of L)if(X.S.b[q])hit(X.td,r,q,.5);return{hit:L}},
    tian1:(X,tg)=>{SG2.play(X.S,tg[0],tg[1]);if(hasT(X.td,"n_yg"))heal(X.td,tg[1],8,"燕歸");return{}},
    tian2:X=>{const L=own(X.S,(p,q)=>SG2.inPal(q,"r"));for(const q of L)defUp(X.td,q,8,X.R+1);return{hit:L}},
    tian3:(X,tg)=>{X.td.ctl.noCap.push({id:X.S.i[tg[0]],until:X.R+1});return{}},
    tian4:(X,tg)=>({n:heal(X.td,tg[0],10+(hasT(X.td,"n_dk")?6:0),"渡口清茶")}),
    tian5:(X,tg)=>{X.td.buf.pair={a:X.S.i[tg[0]],b:X.S.i[tg[1]],until:X.R+1};X.S.pr=[[X.td.buf.pair.a,X.td.buf.pair.b]];return{}},
    lei1:(X,tg)=>{const id=X.S.i[tg[0]];X.td.ctl.frz.push({id,until:X.R});X.td.ctl.imm[id]=X.R+2;return{}},
    lei2:(X,tg)=>{const t=tg[0],c=own(X.S,p=>p==="C").find(c=>canT(X.S,c).includes(t));hit(X.td,c,t,1);return{f:c}},
    lei3:X=>{const S=X.S,o=new Set();for(const c of own(S,p=>p==="C"))for(const q of canT(S,c))o.add(q);const L=[...o].sort((a,b)=>S.d[b]-S.d[a]).slice(0,3),n=hasT(X.td,"r_cy")?9:6;for(const q of L)S.d[q]=Math.max(0,S.d[q]-n);return{hit:L,n}},
    lei4:X=>{X.td.buf.net={until:X.R+1};X.S.net="r";return{}},
    lei5:(X,tg)=>{X.td.ctl.noTake.push({id:X.S.i[tg[0]],until:X.R});return{}},
    luo1:(X,tg)=>{const q=tg[0],i=X.td.lost.findIndex(L=>L.home===q),L=X.td.lost[i],S=X.S,pc=up(L.p),u=SG2.unit(pc,lvSq(X.td.sq,pc),1);
      S.b[q]=L.p;S.x[q]=u.hp;S.h[q]=Math.max(1,Math.round(u.hp/2));{talHp(X.td,q);S.h[q]=Math.max(1,Math.round(S.x[q]/2))}S.a[q]=u.atk;S.d[q]=u.def;S.g[q]=S.ge[q]=0;S.i[q]=L.id;
      X.td.lost.splice(i,1);if(X.td.buf.luo4){delete X.td.buf.luo4;heal(X.td,q,10,"驛鈴回氣")}return{rev:q}},
    luo2:(X,tg)=>{const n=tg[0],L=horseFoes(X.S,n),mul=hasT(X.td,"l_sy")?.8:.6;for(const q of L)if(X.S.b[q])hit(X.td,n,q,mul);return{f:n,hit:L}},
    luo3:X=>{const L=X.td.last.r,q=L.moved?L.t:L.f;defUp(X.td,q,10,X.R+1);return{sq:q}},
    luo4:(X,tg)=>{X.td.buf.luo4=1;return{n:heal(X.td,tg[0],6,"驛鈴回氣")}},
    luo5:(X,tg)=>{const l=legBlocked(X.S.b,tg[0]).find(q=>legSpot(X.S,q)!=null),to=legSpot(X.S,l);SG2.play(X.S,l,to);return{mv:[l,to]}},
  };
  /* 攻擊預覽（畫面：選了己子後，每個打得到的敵子上標「−扣多少／擊破／打不動」）：跟 play 同一套加攻（直路衝鋒） */
  function pv(P,f,t){const td=P.td,S=td.s,R=td.rnd,p=S.b[f],v=S.b[t];if(!p||!v)return null;const ax={};
    if(sd(p)==="r"){if(td.buf.qi2&&td.buf.qi2.until>=R&&up(p)==="R")ax[f]=(ax[f]||0)+Math.min(10,2*straight(f,t))}
    S.ax=ax;const c=SG2.calc(S,f,t);S.ax=null;
    if(!c.ok){let d=Math.max(0,S.d[t]-c.down);if(sd(p)==="r"&&up(p)==="N"&&hasT(td,"l_hm"))d=Math.max(0,d-3);c.D1=SG2.defWith(S,t,d)}   /* 11/17 iMac 17：打不動的預覽寫「防 現在→打完」，現在＝c.D＝資料卡的防禦（同一個 defAt），打完＝實際會降到多少（含回馬槍） */
    return c}
  /* 這顆子開局（部署、援軍、回營）時的防禦力現值：紅方照那種棋子所屬角色的等級、黑方照關卡等級和難度倍率（同 boot／spawn／put）。資料卡看「被打降了多少」用 */
  function defBase(td,q){const S=td.s,p=S.b[q];if(!p)return 0;return sd(p)==="r"?SG2.unit(p,lvSq(td.sq,up(p)),1).def:SG2.unit(p,td.elv,(SG2.DIFF[td.diff]||SG2.DIFF[2]).mul).def}
  /* ===== 星樞的 3 招（story/169，開發者照准）：一池靈力（開局 20、每回合 +4、吃子 +6、上限 100）；易不放、中最多每 3 回合一招、難每回合可放（照冷卻、靈力）。
     電腦出步之前先看值不值得放，依序：回氣（車馬炮體力不到一半）→ 星落（打得死你一顆子，或扣得到你的俥傌炮）→ 星樞護盾（你下一步打得死它一顆子，或打得到將旁邊的子） ===== */
  const ESP0=20,ERG=4,ESP_MAX=100;
  const ESK={heal:{nm:"回氣",cost:30,cd:4,d:"星樞一顆子回 15 體力"},fall:{nm:"星落",cost:40,cd:3,d:"你的一顆子（不是帥）受一次攻擊：星樞場上最強那顆子的攻擊力 ×0.6，照攻對防"},
    shield:{nm:"星樞護盾",cost:30,cd:3,d:"星樞一顆子（可以是將）防禦 +10，兩回合"}};
  const espAdd=(td,n)=>{const a=Math.max(0,Math.min(n,ESP_MAX-(td.esp||0)));td.esp=(td.esp||0)+a;return a};
  const eReady=(td,id)=>(td.esp||0)>=ESK[id].cost&&!((td.ecd[id]==null?-1:td.ecd[id])>td.rnd);
  function eCast(td,id,q,extra){const R=td.rnd;td.esp-=ESK[id].cost;td.ecd[id]=R+ESK[id].cd;td.elast=R;td.ecR=R;ev(td,Object.assign({k:"esk",id,nm:ESK[id].nm,sq:q},extra||{}))}
  function enemySkill(P,C){const td=P.td,S=td.s,R=td.rnd;if(!td||td.over||P.turn!=="b"||td.ecR===R)return null;if(td.diff===1)return null;if(td.diff===2&&R-(td.elast==null?-99:td.elast)<3)return null;
    const blk=[],red=[];for(let q=0;q<90;q++){const p=S.b[q];if(!p)continue;(sd(p)==="b"?blk:red).push(q)}const VAL={R:9,C:4.5,N:4,B:2,A:2,P:1,K:0};
    if(eReady(td,"heal")){const t=blk.filter(q=>/[RNC]/.test(up(S.b[q]))&&S.h[q]*2<S.x[q]).sort((a,b)=>VAL[up(S.b[b])]-VAL[up(S.b[a])])[0];if(t!=null){const n=heal(td,t,15,"回氣");eCast(td,"heal",t,{n});return"heal"}}
    if(eReady(td,"fall")){const f=blk.filter(q=>S.b[q]!=="k").sort((a,b)=>SG2.atkAt(S,b)-SG2.atkAt(S,a))[0];if(f!=null){const A=SG2.atkAt(S,f);let best=null;
        for(const t of red){if(up(S.b[t])==="K")continue;S.ax={[f]:Math.round(A*.6)-A};const c=SG2.calc(S,f,t,true);S.ax=null;const v=VAL[up(S.b[t])],sc=c.kill?100+v:c.ok&&/[RNC]/.test(up(S.b[t]))?10+v:-1;if(sc>0&&(!best||sc>best.sc))best={t,sc}}
        if(best){eCast(td,"fall",best.t);hit(td,f,best.t,.6);return"fall"}}}
    if(eReady(td,"shield")){const k=SG2.kingOf(S.b,"b");let best=null;for(const t of blk){let thr=false;for(const a of red){if(SG2.pseudo(S.b,a,S.net).includes(t)){const c=SG2.calc(S,a,t);if(c.kill||(k>=0&&SG2.nb4(k).includes(t)&&c.ok)){thr=true;break}}}
        if(thr){const v=VAL[up(S.b[t])]+(S.b[t]==="k"?20:0);if(!best||v>best.v)best={t,v}}}if(best){defUp(td,best.t,10,R+1);eCast(td,"shield",best.t);return"shield"}}
    return null}
  /* ===== 電腦出步（local.js playEngine 交過來；不叫 Pikafish）：星樞先看要不要放招，再出步 ===== */
  function decide(P,C){const td=P.td;if(P.turn==="b"){try{if(enemySkill(P,C))sync(P,C)}catch(e){}}const L=legal(P,C,P.turn);if(!L.length)return null;return SG2.decide(td.s,P.turn,td.depth,Math.random,L)}
  /* 重建盤面（打開 App、切換對局時）：照 td.s，不重放棋譜 */
  function rebuild(P,C){const td=P.td;P.board=td.s.b.slice();P.turn=td.turn;P.pos=[C.fen(P.board,P.turn)];P.repetition=null;return P}
  function check(P){const S=P.td.s;return SG2.inCheck(S,P.turn)?SG2.kingOf(S.b,P.turn):-1}
  /* 三星：★ 贏；★★ 被吃不超過 2 顆子（11/16 開發者選單：照一般象棋都要應將後，帥體力一半幾乎白拿；td.lostN＝這一盤被吃幾顆，回營救回來也照算）；★★★ 在 r3 回合內贏 */
  const LOST2=2;
  function stars(td){const w=td.over&&td.over.w==="r";return[w?1:0,w&&(td.lostN||0)<=LOST2?1:0,w&&td.rnd<td.r3?1:0]}
  const goals=td=>[{t:"打倒敵方將帥（體力歸零或將死）"},{t:"被吃不超過 "+LOST2+" 顆子"},{t:td.r3+" 回合內贏"}];
  return{defBase,ESK,ESP0,ERG,enemySkill,TALC,TALM,TAL_CK,TAL_MAX,talNorm,talSpent,talWhy,talNeedL,PC_OF,GRP,ORD,ELVM,r3Of,nameOf,lockWhy,MODE,MV,SK,SKM,SP0,RG,KILL_SP,CUT_SP,spMaxOf,spOf,ckOf,DEP_COST,DEP_MAX,ELV,R3,skOfSq,skPick,boot,legal,play,roundEnd,spawn,fore,cast,why,targets,costOf,decide,rebuild,check,stars,goals,pv,hit,horseFoes,lineFoes,canT,horseT,legBlocked,legSpot,guardedBy,dirSq}})();
/* 接線：local.js 只認 window.XQ_TD。v2 的盤由 SG2G 全權處理（own＝這盤歸 v2 管：local.js 走子、合法步、電腦出步、重建都改問這裡） */
if(typeof window!=="undefined"&&window.XQ_TD&&!window.XQ_TD.sg2){const O=window.XQ_TD,isV=td=>!!(td&&td.mode===SG2G.MODE);
  window.XQ_TD=Object.assign({},O,{sg2:1,own:P=>!!(P&&isV(P.td)),
    boot:(c,P,C)=>c&&c.mode===SG2G.MODE?SG2G.boot(c,P,C):O.boot(c,P,C),
    move:(P,m,C)=>isV(P&&P.td)?null:O.move(P,m,C),
    cast:(P,b,C)=>isV(P&&P.td)?SG2G.cast(P,b,C):O.cast(P,b,C),
    play:(P,f,t,C)=>SG2G.play(P,f,t,C),legal:(P,C)=>SG2G.legal(P,C),check:P=>SG2G.check(P),decide:(P,C)=>SG2G.decide(P,C),rebuild:(S,C)=>SG2G.rebuild(S,C)})}
/* ---------- 星門圍城 v2 畫面（07bhg-gatesiege.js 的 gsvTick／gsvPaint／gsvClick／gsvMarks／gsvEnd／gsvResult 看到 v2 的盤就交過來；容器 #gsvEn／#gsvMe／#gsvOv、視角、3D 記號照舊用 gsv 那一套） ----------
   開發者 11/16 選單：每顆子下方小血條、點子看攻防；選了己子，打得到的敵子上預覽「−扣多少／擊破／打不動」。
   SG2_SEL＝現在選中的己子（照 08b-cpugame.js tap 的同一套規則跟著算，所以平面、3D 都對得上）；SG2_PICK＝最後點的那顆（看攻防） */
let SG2_SEL=-1,SG2_PICK=-1,SG2_SEEN={};
function sg2Css(){if(typeof document==="undefined"||document.getElementById("sg2Css"))return;const s=document.createElement("style");s.id="sg2Css";s.textContent=`
html[lang^=en] .sg2-ex{margin-left:.3em}
html[lang^=en] .gsv-ln button[data-x="fore"]{white-space:normal;line-height:1.25;padding:4px}
.gsv-mk.hp{width:calc(var(--c)*.74);height:max(3px,calc(var(--c)*.09));margin-top:calc(var(--c)*.5);border-radius:3px;background:rgba(0,0,0,.55);border:1px solid rgba(255,255,255,.55);overflow:hidden;justify-content:flex-start}
.gsv-mk.hp i{display:block;height:100%;background:#3ccf6e}
.gsv-mk.hp.en i{background:#ff5a4a}
.gsv-mk.hp.lo i{background:#ffb000}
.gsv-mk.pv{font-size:11px;line-height:1.3;padding:0 4px;border-radius:6px;color:#fff;margin:0;white-space:nowrap;z-index:2;box-shadow:0 1px 3px rgba(0,0,0,.6)}
.sg2-inf{font-size:12px;line-height:1.35;margin:2px 0 1px;color:#f1e7cf;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:1.35em}.sg2-inf b{color:#FFE08A}
.sg2-skw{overflow-y:auto;margin-top:3px;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
.sg2-skr{display:flex;align-items:stretch;gap:4px;margin-top:3px}.sg2-skr>span{flex:0 0 2.7em;font-size:11px;display:flex;align-items:center;color:#cfc4ee;line-height:1.1}
.sg2-skr .gsv-sk{flex:1 1 0;min-width:0;min-height:38px}.sg2-skr>span{flex-direction:column;align-items:flex-start;justify-content:center}.sg2-sp{display:block;font-size:10px;color:#9fd0ff;margin-top:1px}
@media (orientation:landscape){.sg2-skw{max-height:none}}
.sg2-talc{margin:6px 0 10px}.sg2-tal{display:block;width:100%;text-align:left;font:inherit;color:#f6eedd;background:linear-gradient(180deg,#2c2450,#171433);border:1.5px solid #8f7bd8;border-radius:11px;padding:6px 9px;margin:4px 0;cursor:pointer}
.sg2-tal b{font-size:13.5px}.sg2-tal small{float:right;color:#9fd0ff;font-size:11.5px}.sg2-tal span{display:block;font-size:12px;color:#d9d0ef;margin-top:2px}.sg2-tal.on{border-color:#FFE08A;box-shadow:0 0 0 2px #FFE08A}.sg2-tal.off{opacity:.5}
.sg2-talr{float:right;font:inherit;font-size:11.5px;color:#f1e7cf;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.3);border-radius:99px;padding:1px 9px;cursor:pointer}
.gsv-mk.pv.ok{background:#c0281e}.gsv-mk.pv.kill{background:#ff3b30;box-shadow:0 0 8px #ff3b30}.gsv-mk.pv.no{background:#45506a}
.gsv-ln button[data-x="fore"]{display:block;width:100%;min-height:44px;box-sizing:border-box;padding:2px 4px;text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;touch-action:manipulation}
/* B-7：開局「✦ 星樞：…」、放招的提示（toast）原本在畫面下方，壓住帥的體力、回合數、「規則」和招式 → 對局中不接點選。
   11/17 第二批 N-4：上一批放在棋盤上緣，會疊在敵方底排（象、士、將）→ 改到棋盤外：直式疊在頂欄下方那條敵方資訊（星樞體力、下一波）上，不碰棋盤；
   橫式放在左邊敵方欄下半的空白（左欄只有上面兩三行字）。開局名稱橫幅（01-board openFx 的 .opfx，位置寫在行內）也搬到同樣的地方 */
body.gsv-on .toast{bottom:auto;top:calc(var(--gsvTop,var(--bhTop,44px)) + 4px);left:8px;right:8px;transform:none;width:fit-content;margin:0 auto;max-width:calc(100vw - 16px);font-size:13px;padding:6px 12px;pointer-events:none}
@media (orientation:landscape){body.gsv-on .toast{top:auto;bottom:calc(10px + env(safe-area-inset-bottom,0px));left:calc(6px + env(safe-area-inset-left,0px));right:auto;max-width:188px;margin:0;border-radius:12px}}
body.gsv-on .opfx{top:calc(var(--gsvTop,var(--bhTop,44px)) + var(--gsvEnH,62px) / 2)!important;left:50%!important;font-size:24px!important}
@media (orientation:landscape){body.gsv-on .opfx{top:calc(var(--gsvTop,var(--bhTop,44px)) + (100dvh - var(--gsvTop,var(--bhTop,44px))) * .55)!important;left:calc(100px + env(safe-area-inset-left,0px))!important;font-size:16px!important}}
/* iMac 18：打不動的跳字大一號、淡藍（原本 14px 淡紫一閃就過） */
.bt-fl.sg2no{font-size:17px;color:#bfe0ff}
/* 第 3 輪 P3（測試員 D，English 375×812）：頂欄標題「Star Gate Siege · Prologue A1」被左邊「‹ Back to Star Terrace」、右邊「👁 Flat board」擠到只剩「Star」。
   對局中標題可以換兩行、字小一點（中文一行放得下時照舊一行）；英文窄螢幕（480px 以下）返回鈕只留「‹」、視角鈕只留 👁（文字還在 aria-label／title），讓出位置給關名 */
html body.gsv-on #title{white-space:normal;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;text-overflow:clip;min-width:0;font-size:calc(16px * min(var(--fz,1),1.3));line-height:1.15;letter-spacing:.02em;overflow-wrap:break-word}
@media (max-width:480px){html[lang=en] body.gsv-on #back{font-size:0;padding:0 6px}html[lang=en] body.gsv-on #back b{font-size:28px}html[lang=en] body.gsv-on #gsvView small{display:none}html[lang=en] body.gsv-on #gsvView{min-width:44px;padding:0!important;justify-content:center}}
html:has(body.gsv-v2),html body.gsv-v2,html body.gsv-v2 .app{background:#080914}
html body.gsv-v2 #topbar{background:#101120;color:#fff0cf;border:0;box-shadow:none;min-height:0;
  padding:var(--safeT,0px) calc(6px + env(safe-area-inset-right,0px)) 0 calc(6px + env(safe-area-inset-left,0px))}
html body.gsv-v2 #topbar :is(#back,#gsvView,button){color:inherit;min-height:44px}
html body.gsv-v2 #back{min-width:44px}
body.gsv-v2 :is(#gsvEn,#gsvMe){background:#101120}
body.gsv-v2 #gsvMe .gsv-tip{position:static;margin:0 0 3px;border-radius:8px}
body.gsv-v2 #gsvMe .gsv-tip button{min-width:44px;min-height:44px}
body.gsv-v2 .sg2-guide{font-size:11px;color:#d9cee6;min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis}
body.gsv-v2 #gsvMe .gsv-fx[data-x="rules"]{min-width:44px;min-height:44px;margin-inline-start:auto;padding:0 9px;touch-action:manipulation}
body.gsv-v2 .sg2-skr .gsv-sk{min-height:44px}
body.gsv-v2 .sg2-skr .gsv-sk.off{opacity:1;filter:none;background:#202033;color:#cec4d5;border-color:#55506a}
body.gsv-v2 #gsvMe .sg2-inf{min-height:0}
body.gsv-v2 #gsvMe .sg2-inf:empty{display:none}
body.gsv-v2 #gsvMe .sg2-inf:not(:empty) + .sg2-round .sg2-guide{visibility:hidden}
@media (orientation:portrait){
  html body.gsv-v2{--gsvEnH:var(--sg2EnH,52px)}
  html body.gsv-v2 #gsvEn{height:auto;border-block:1px solid #302942}
  html body.gsv-v2 #gsvMe{height:auto;max-height:38dvh;display:flex;flex-direction:column;border-top:1px solid #302942}
  body.gsv-v2 #gsvMe .sg2-skw{flex:0 1 auto;min-height:0}
  body.gsv-v2 #gsvMe > :not(.sg2-skw){flex:none}
  body.gsv-v2 #gsvMe .sg2-round{margin-top:0;min-height:44px}
  html body.gsv-v2 #view.view.fixed>#bbox{bottom:var(--sg2DockH,120px)!important}
}
@media (orientation:landscape){body.gsv-v2 #gsvMe{overflow-y:auto}}
@media (max-width:480px){
  html body.gsv-v2 #back{font-size:0;padding:0 6px;justify-content:center}
  html body.gsv-v2 #gsvView{min-width:44px;padding:0!important;justify-content:center}
  html body.gsv-v2 #gsvView small{display:none}
}`;document.head.append(s)}
/* 11/17 B-5：棋盤、兩側欄的上緣＝頂欄真正的下緣（頂欄長高、轉向都跟著；07bhg gsvCss 用 --gsvTop） */
let SG2_TOPRO=null;
function sg2TopSync(){if(typeof document==="undefined")return;try{const tb=document.getElementById("topbar");if(!tb)return;const b=Math.round(tb.getBoundingClientRect().bottom),R=document.documentElement;
  if(b>0&&R.style.getPropertyValue("--gsvTop")!==b+"px")R.style.setProperty("--gsvTop",b+"px");if(!SG2_TOPRO&&typeof ResizeObserver==="function"){SG2_TOPRO=new ResizeObserver(()=>sg2TopSync());SG2_TOPRO.observe(tb)}}catch(e){}}
let SG2_DOCKRO=null;
function sg2DockSync(en,me){
  for(const [el,prop] of [[en,"--sg2EnH"],[me,"--sg2DockH"]]){
    const value=Math.ceil(el.getBoundingClientRect().height)+"px",style=document.body.style;
    if(style.getPropertyValue(prop)!==value)style.setProperty(prop,value);
  }
}
function sg2DockObserve(en,me){
  sg2DockSync(en,me);
  if(SG2_DOCKRO||typeof ResizeObserver!=="function")return;
  SG2_DOCKRO=new ResizeObserver(()=>sg2DockSync(en,me));
  SG2_DOCKRO.observe(en);SG2_DOCKRO.observe(me);
}
function sg2DockClear(){
  if(SG2_DOCKRO){SG2_DOCKRO.disconnect();SG2_DOCKRO=null}
  document.body.style.removeProperty("--sg2EnH");
  document.body.style.removeProperty("--sg2DockH");
}
if(typeof window!=="undefined"&&typeof addEventListener==="function")addEventListener("resize",()=>{if(document.body&&document.body.classList.contains("gsv-v2"))sg2TopSync()});
const sg2On=st=>!!(st&&st.td&&typeof SG2G!=="undefined"&&st.td.mode===SG2G.MODE);
/* 08b-cpugame.js 的 tap(i) 一開頭叫（不攔截，只記選了哪顆、點了哪顆） */
function sg2Tap(st,i,sel){if(!sg2On(st))return;if(st.td.s.b[i])SG2_PICK=i;
  if(st.result||st.turn!==st.human||st.thinking){SG2_SEL=-1;return}
  const L=st.legal||[];SG2_SEL=sel>=0&&L.some(([f,t])=>f===sel&&t===i)?-1:i===sel?-1:L.some(([f])=>f===i)?i:-1;GSV_MK="";GSV_HK=""}
const sg2Nm=p=>p?(p===p.toUpperCase()?GSV.PCN:GSV.PBN)[p.toUpperCase()]:"";
const sg2Pct=(a,b)=>Math.max(0,Math.min(100,Math.round(a/Math.max(1,b)*100)));
function sg2Foe(td){const F=SG2G.fore(td);if(!F.length)return`<span>星門沒有援軍了</span>`;const at=F[0].at,g=F.filter(w=>w.at===at),cnt={};
  for(const w of g){const k=GSV.gateNm(w.sq)+"・"+GSV.PBN[w.p.toUpperCase()];cnt[k]=(cnt[k]||0)+1}const n=Math.max(1,at-td.rnd);
  return`<button type="button" data-x="fore"><span>下一波</span>：${Object.keys(cnt).map(k=>esc(k)+"×"+cnt[k]).join("、")}・<b>${n} 回合後</b></button>`}
/* 點到的那顆：體力、攻擊、防禦（含護帥加成、招式加防） */
/* 下方那一行的角色數值（開發者 11/16：選子要走、選招要放的時候都看得到攻防）：
   選招時＝放招那位（名字、本命子的體力／攻擊／防禦、自己的靈力）；選了子或點了子＝那一顆（屬於哪位、體力／攻擊／防禦含加成；己方再寫那位的靈力）；都沒有＝提示 */
function sg2Who(td,pc){const ck=SG2G.ckOf(td,pc);if(!ck)return{ck:null,nm:"木棋靈"};let nm="";try{nm=typeof ptyNm==="function"?ptyNm(ck):""}catch(e){}return{ck,nm:nm||(GSV.CH[ck]?GSV.CH[ck].n:"")}}
/* 11/17 iMac 第 17 項：防禦一律寫 SG2.defAt（＝攻擊預覽、實際扣血用的那個數）；被打降過的寫「原本 N、被打降 M」（原本＝開局防禦換回去算的實際防禦），
   護帥照 SG2.guarded 判斷（原本用「比基礎大」猜，紅方有天賦加防時會誤寫護帥），紅方天賦加的防另外寫 */
function sg2PieceInfo(td,q){const S=td.s,p=S.b[q];if(!p)return"";const red=p===p.toUpperCase(),D=SG2.defAt(S,q),P=p.toUpperCase(),ln=SG2.lined(S,q),ex=[];
  {const d0=typeof SG2G.defBase==="function"?SG2G.defBase(td,q):S.d[q];if(S.d[q]<d0){const full=SG2.defWith(S,q,d0);if(full>D)ex.push("原本 "+full,"被打降 "+(full-D))}}
  if(S.g[q])ex.push("招式 +"+S.g[q]);if(ln)ex.push("士相護線 +"+SG2.LINE_X);
  {const B=red&&S.bx,n=B?(B.d&&B.d[P]||0)+(B.pal&&P!=="K"&&SG2.inPal(q,"r")?B.pal:0)+(ln==="B"&&B.lineB||0):0;if(n)ex.push("天賦 +"+n)}
  if(SG2.guarded(S,q))ex.push("護帥 ×"+SG2.GUARD_K);
  if(p.toUpperCase()==="P"&&SG2.atkAt(S,q)>S.a[q])ex.push("過河 +"+SG2.PAWN_X);
  const W=red?sg2Who(td,p.toUpperCase()):null,sp=W&&W.ck&&td.sp[W.ck]!=null?`・<span>靈</span> <b>${td.sp[W.ck]}</b>／${td.spMax[W.ck]}`:"";
  return`<b>${red?esc(W.nm)+"・":"敵・"}${esc(sg2Nm(p))}</b> <span>體力</span> <b>${Math.max(0,S.h[q])}</b>／${S.x[q]}・<span>攻</span> <b>${SG2.atkAt(S,q)}</b>・<span>防</span> <b>${D}</b>${sp}${ex.length?`<span class="sg2-ex">（${esc(ex.join("、"))}）</span>`:""}`}
function sg2Info(st){const td=st.td,S=td.s;
  if(GSV_TG){const s=SG2G.SKM[GSV_TG.id];if(GSV_TG.id==="dep"&&GSV_TG.p){const W=sg2Who(td,GSV_TG.p),u=SG2.unit(GSV_TG.p,td.sq&&td.sq[GSV_TG.p]?td.sq[GSV_TG.p].L:1,1);
      return`<b>部署 ${esc(W.nm)}・${esc(GSV.PCN[GSV_TG.p])}</b> <span>體力</span> <b>${u.hp}</b>・<span>攻</span> <b>${u.atk}</b>・<span>防</span> <b>${u.def}</b>${W.ck?`・<span>靈</span> <b>${td.sp[W.ck]}</b>／${td.spMax[W.ck]}`:""}`}
    if(s){const pc=SG2G.PC_OF[s.ch],qs=[];for(let q=0;q<90;q++)if(S.b[q]===pc)qs.push(q);const nm=sg2Who(td,pc).nm;
      return`<b>${esc(s.nm)}</b>（${esc(nm)}，${SG2G.costOf(td,s.id)} 靈）：`+(qs.length?qs.map(q=>sg2PieceInfo(td,q)).join("；"):`<span>${esc(GSV.PCN[pc])}都倒了</span>`)}}
  const q=SG2_SEL>=0&&S.b[SG2_SEL]?SG2_SEL:SG2_PICK;if(q<0||!S.b[q])return"";return sg2PieceInfo(td,q)}
/* 11/17 測試員 D（P3-C）：選關、開局提示、結算都寫「星門圍城・序章 A1」，對局頁頂端卻是 08b 照 07-legend jName 寫的「黑洞・星樞棋局」（bh: 開頭一律這樣）。
   星門圍城 v2 的盤（含偏航來的那盤）頂端改寫「星門圍城・關名」（SG2G.nameOf：序章 A1、易 3…）；08b 每次重畫 setTop 會蓋回去，這裡每次畫都補（同 07bht bhtdTitle 的做法），內容一樣就不動 */
function sg2Title(st){if(typeof document==="undefined"||!sg2On(st))return;const t=document.getElementById("title");if(!t)return;const s="星門圍城・"+SG2G.nameOf(st.td.lv);let sp=t.querySelector(".sg2-tt");
  if(!sp||t.childNodes.length!==1||t.firstChild!==sp){t.textContent="";sp=document.createElement("span");sp.className="sg2-tt";t.append(sp)}if(sp.dataset.s!==s){sp.dataset.s=s;sp.textContent=s}}
function sg2Paint(){sg2Css();const st=GSV_ST,en=document.getElementById("gsvEn"),me=document.getElementById("gsvMe");if(!st||!en||!me)return;const td=st.td,S=td.s,C=gsvC(),my=gsvMy(st);sg2TopSync();try{sg2Title(st)}catch(e){}
  const hk=JSON.stringify([td.seq,st.turn,!!st.result,GSV_TG&&[GSV_TG.id,GSV_TG.pk,GSV_TG.p],GSV_BUSY,SG2_PICK,SG2_SEL]);if(hk===GSV_HK)return;GSV_HK=hk;
  const kb=SG2.kingOf(S.b,"b"),kr=SG2.kingOf(S.b,"r"),bar=(q,cls,nm)=>q<0?`<div class="gsv-bar ${cls}"><i style="width:0"></i><b>${nm} 倒下</b></div>`:`<div class="gsv-bar ${cls}"><i style="width:${sg2Pct(S.h[q],S.x[q])}%"></i><b>${nm} <span>體力</span> ${Math.max(0,S.h[q])}／${S.x[q]}</b></div>`;
  en.innerHTML=`<div class="gsv-r"><span class="gsv-nm en">星樞</span>${bar(kb,"en","將")}<span class="gsv-st">${esc(td.dnm)}・Lv <b>${td.elv}</b>${td.diff>1?`・<span>靈</span> <b>${td.esp||0}</b>`:""}</span></div>
    <div class="gsv-r"><span class="gsv-ln">${sg2Foe(td)}</span></div>`;
  const sk=id=>{const s=SG2G.SKM[id],w=C?SG2G.why(st,id,C):"…",cdn=Math.max(0,(td.cd[id]==null?0:td.cd[id])-td.rnd),cost=SG2G.costOf(td,id),on=GSV_TG&&GSV_TG.id===id;
    const lab=id==="dep"?`<b>部署</b><small>${SG2G.DEP_COST} 靈・後備 ${td.res.length}</small>`:`<b>${esc(s.nm)}</b><small>${s.info?(GSV_INFO?"顯示中":"情報"):cdn?`冷卻 ${cdn}`:`${cost} 靈`}</small>`;
    return`<button type="button" class="gsv-sk${w&&!(s&&s.info)?" off":""}${on||(s&&s.info&&GSV_INFO)?" on":""}" data-k="${id}"${w?` data-w="${esc(w)}"`:""} aria-label="${esc((s?s.nm:"部署後備")+"："+(s?s.d:"花 20 靈力把一顆後備子放到補給點，用掉這一步")+(w?"（"+w+"）":""))}">${lab}</button>`};
  const tip=GSV_TG?`<div class="gsv-tip"><span>${GSV_TG.arm?"再點一次同一顆招就放出":GSV_TG.id==="dep"?"點盤上發光的補給點":"點盤上發光的目標"}</span><button type="button" data-x="cancel">取消</button></div>`:"";
  me.innerHTML=`${tip}<div class="gsv-r"><span class="gsv-nm">我方</span>${bar(kr,"","帥")}</div>
    <div class="sg2-inf" aria-live="polite">${sg2Info(st)}</div>
    <div class="gsv-r sg2-round"><span class="gsv-st"><b>第 ${td.rnd+1}／${td.rlim} 回合</b></span><span class="sg2-guide">點棋子看攻防</span>
      <button type="button" class="gsv-fx" data-x="rules" style="background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.3);color:#f1e7cf">規則</button></div>
    <div class="sg2-skw">${sg2SkRows(td.sk,sk,td)}${td.res.length?`<div class="sg2-skr"><span>後備</span>${sk("dep")}</div>`:""}</div>`;sg2DockObserve(en,me)}
/* 招式按角色分行（07pty 的名字；沒有就用 GSV.CH） */
function sg2SkRows(ids,btn,td){const by={};for(const id of ids){const s=SG2G.SKM[id];if(s)(by[s.ch]=by[s.ch]||[]).push(id)}
  const nm=c=>{try{if(typeof ptyNm==="function")return ptyNm(c)}catch(e){}return GSV.CH[c]?GSV.CH[c].n:""};
  return Object.keys(by).map(c=>`<div class="sg2-skr"><span>${esc(nm(c))}${td&&td.sp&&td.sp[c]!=null?`<small class="sg2-sp" aria-label="靈力 ${td.sp[c]}／${td.spMax[c]}">靈 ${td.sp[c]}</small>`:""}</span>${by[c].map(btn).join("")}</div>`).join("")||`<p class="muted" style="font-size:12px;margin:4px 0">還沒有夥伴學會招式</p>`}
function sg2RulesHTML(){return`<ul class="gsv-rules">
  <li><b>每顆子</b>都有自己的體力、攻擊力、防禦力，看那種棋子所屬角色的等級；敵方看關卡和難度。</li>
  <li><b>走到敵子上＝攻擊</b>：攻擊力 ≥ 對方防禦力 → 扣「攻擊力 − 防禦力的一半」；扣到 0 才吃掉、移進去，沒扣光就停在原地。</li>
  <li><b>防禦力比較大</b>就吃不了：對方防禦力降「你攻擊力的一半」，你留在原地。兩種都用掉這一步。</li>
  <li><b>護帥</b>：九宮裡、帥上下左右的己子防禦力 ×1.2；帥被攻擊時，旁邊防禦最高的一顆替它擋一半。帥的體力是一般子的 3 倍。</li>
  <li><b>怎麼贏</b>：敵方將的體力打到 0，或照一般象棋把它將死、困斃。打滿 ${SG2.RND_MAX} 回合沒分勝負＝和。</li>
  <li><b>集火</b>（雙方都有）：攻擊一顆敵子時，其他照一般走法也吃得到它的己子攻擊力自動加上去（最多 3 顆一起），打死了是你走的那顆移進去。</li>
  <li><b>士相護線</b>（雙方都有）：站在自己的仕、相走得到的格子上，防禦力 +${SG2.LINE_X}。</li>
  <li><b>將軍</b>：照一般象棋，被將軍一定要應；應不了（將死）或沒步可走（困斃）就輸。</li>
  <li><b>一回合</b>＝你走一步＋最多放一招（先後自選），星樞走完回合結束。體力、被降的防禦不會自己回，只靠招式。</li>
  <li><b>靈力</b>：每位夥伴各自一份（多少照等級），放招扣放招那位的；每回合每位 +${SG2G.RG}，吃掉子的那位 +${SG2G.KILL_SP}。部署後備花那顆子所屬夥伴的 ${SG2G.DEP_COST}。</li>
  <li><b>星樞的招</b>：中、難的星樞也會放招——回氣（回 15 體力）、星落（打你一顆子）、星樞護盾（防禦 +10）；易不放。</li>
  <li><b>星門</b>：敵方會從星門分波補子；你的子站在門格上就擋掉那一顆（截援，站門那位 +${SG2G.CUT_SP} 靈）。</li></ul>`}
function sg2Click(e){const st=GSV_ST;if(!st)return;const C=gsvC(),x=e.target.closest("[data-x]");if(x){const k=x.dataset.x;try{vibrate(5)}catch(z){}
    if(k==="cancel"){GSV_TG=null;GSV_MK="";GSV_HK="";sg2Paint();return}
    if(k==="rules"){gsvInfo(`<h2 style="font-size:19px">星門圍城規則</h2>${sg2RulesHTML()}`);return}   /* 11/17：規則太長時可以捲、點外面會關（07bhg gsvInfo） */
    if(k==="fore"){const F=SG2G.fore(st.td),by={};for(const w of F)(by[w.at]=by[w.at]||[]).push(w);
      gsvInfo(`<h2 style="font-size:19px">星門預告</h2>${Object.keys(by).map(at=>`<p><b>${Math.max(1,at-st.td.rnd)} 回合後</b>：${by[at].map(w=>esc(GSV.gateNm(w.sq)+"・"+GSV.PBN[w.p.toUpperCase()]+(w.dl?"（延遲過）":""))).join("、")}</p>`).join("")||"<p>星門沒有援軍了</p>"}<p class="muted" style="font-size:12.5px">你的子站在門格上，那一顆就來不了（截援）。</p>`);return}
    return}
  const b=e.target.closest(".gsv-sk");if(!b)return;const id=b.dataset.k,S=SG2G.SKM[id];
  if(S&&S.info){GSV_INFO=!GSV_INFO;GSV_MK="";GSV_HK="";sg2Paint();return}
  if(b.dataset.w){toast("✦ "+b.dataset.w);return}if(GSV_BUSY)return;try{vibrate(8)}catch(z){}
  if(GSV_TG&&GSV_TG.id===id){const arm=GSV_TG.arm;GSV_TG=null;GSV_MK="";GSV_HK="";sg2Paint();if(arm)gsvPlay(id,[]);return}
  if(id==="dep"){const ok=[...new Set(st.td.res)].filter(p=>SG2G.spOf(st.td,SG2G.ckOf(st.td,p))>=SG2G.DEP_COST&&st.td.dp.some(d=>d.al.includes(p)&&!st.td.s.b[d.sq]));if(!ok.length)return toast("補給點都不能用");
    modal(`<h2 style="font-size:19px">部署後備</h2><p class="muted">花那顆子所屬夥伴的 ${SG2G.DEP_COST} 靈力、用掉這一步，選一顆後備子：</p>`,ok.map(p=>[GSV.PCN[p],()=>{GSV_TG={id:"dep",p,pk:[]};GSV_MK="";GSV_HK="";sg2Paint()}]).concat([["取消",null,true]]));return}
  if(!S.tg){GSV_TG={id,pk:[],arm:1};GSV_MK="";GSV_HK="";sg2Paint();toast("✦ "+S.nm+"："+S.d);return}
  GSV_TG={id,pk:[]};GSV_MK="";GSV_HK="";sg2Paint();toast("🎯 "+S.nm+"："+S.d)}
/* 第 3 輪 N3-1（測試員 B，390×844 難 1）：攻擊預覽「防19→13」貼最右一路時是 x 353～410（畫面到 390），跳字「打不動・防 19→13」也貼右緣、蓋住旁邊的炮。
   原因：預覽一律掛在棋子右上（CSS margin 往右 .46 格），跳字以棋子正中為中心（07bht bhtdFloat 只照整個畫面收邊）。
   改法：預覽掛在「往棋盤中間那一側」的上方（右半邊的子掛左上），再收進棋盤框（平面＝棋盤外框、3D＝#bbox）與畫面之內；跳字改用 sg2Float：浮在那顆子上方半格
   （3D 用頭頂位置；太靠上就改到下方），同樣收進棋盤框。07bhg gsvFrame 平面、3D 兩套位置都走 sg2PvXY */
function sg2Box(g3){const W=typeof innerWidth==="number"?innerWidth:0,H=typeof innerHeight==="number"?innerHeight:0;let B={l:0,r:W,t:0,b:H};
  try{const bb=document.getElementById("bbox"),r=bb&&bb.getBoundingClientRect();if(r&&r.width)B={l:Math.max(0,r.left),r:Math.min(W,r.right),t:Math.max(0,r.top),b:Math.min(H,r.bottom)}}catch(e){}
  if(!g3&&typeof bhtdXY==="function"){const a=bhtdXY(0),z=bhtdXY(89),c=bhtdXY(1);if(a&&z&&c){const m=Math.abs(c.x-a.x)*.67;B={l:Math.max(B.l,a.x-m),r:Math.min(B.r,z.x+m),t:Math.max(B.t,a.y-m),b:Math.min(B.b,z.y+m)}}}
  return B}
/* 中心 (x,y)、半寬 hw、半高 hh 的方塊收進 B；B 比方塊還窄就置中 */
const sg2Fit=(x,y,hw,hh,B)=>({x:B.r-B.l<2*hw?(B.l+B.r)/2:Math.max(B.l+hw,Math.min(B.r-hw,x)),y:B.b-B.t<2*hh?(B.t+B.b)/2:Math.max(B.t+hh,Math.min(B.b-hh,y))});
/* 預覽標籤的中心：p＝那一格（平面）／腳下（3D）的螢幕座標；在棋盤右半邊掛左上、左半邊掛右上（往中間），再收進 B */
function sg2PvXY(p,cell,w,h,B){const s=p.x>(B.l+B.r)/2?-1:1;return sg2Fit(p.x+s*cell*.46,p.y-cell*.42,w/2+1,h/2+1,B)}
/* 跳字：浮在那顆子上方（不蓋左右相鄰的子），收進棋盤框；動畫照 07bht 的 .bt-fl（往上飄、放大到 1.15 倍） */
function sg2Float(t,q,cls){if(typeof document==="undefined"||q==null||typeof bhtdXY!=="function")return false;let g3=false,p=null,cell=36;
  try{g3=typeof gsv3d==="function"&&gsv3d();const a=bhtdXY(40),c=bhtdXY(41);if(a&&c)cell=Math.max(18,Math.min(90,Math.hypot(c.x-a.x,c.y-a.y)));if(g3&&PARK&&PARK.v&&PARK.v.headOf)p=PARK.v.headOf(q)}catch(e){}if(!p)p=bhtdXY(q);if(!p)return false;
  const d=document.createElement("div");d.className="bt-fl "+(cls||"");d.textContent=t;d.style.left=p.x+"px";d.style.top=p.y+"px";document.body.append(d);
  try{const w=d.offsetWidth*1.15,h=d.offsetHeight*1.15,B=sg2Box(g3);let y=p.y-cell*(g3?.3:.58);if(y-h<B.t)y=p.y+cell*.58;const P=sg2Fit(p.x,y,w/2+2,h/2,B);d.style.left=P.x+"px";d.style.top=P.y+"px"}catch(e){}
  setTimeout(()=>d.remove(),1400);return true}
/* 盤上記號：每顆子的小血條、星門倒數、定身／鎖／迷煙／煙幕、守門點、集火、選目標的發光格、補給點、選了己子時的攻擊預覽 */
function sg2Marks(st){const td=st.td,S=td.s,L=[],C=gsvC(),my=gsvMy(st),R=td.rnd;
  for(let q=0;q<90;q++){const p=S.b[q];if(!p)continue;const red=p===p.toUpperCase(),pc=sg2Pct(S.h[q],S.x[q]);L.push({sq:q,k:"hp "+(red?"me":"en")+(pc<34?" lo":""),t:`<i style="width:${pc}%"></i>`})}
  const F=SG2G.fore(td),firstAt={};for(const w of F)if(firstAt[w.sq]==null)firstAt[w.sq]=w.at;for(const q in firstAt)L.push({sq:+q,k:"gate",t:`門<i>${Math.max(1,firstAt[q]-R)}</i>`});
  const byId=id=>SG2.sqOf(S,id),tag=(arr,t,k)=>{for(const o of arr||[])if(o.until>=R){const q=byId(o.id);if(q>=0)L.push({sq:q,k:"bd "+k,t})}};
  tag(td.ctl.frz,"定","frz");tag(td.ctl.lock,"鎖","frz");tag(td.ctl.noCap,"迷","frz");tag(td.ctl.noTake,"護","guard");
  if(td.ctl.trap&&td.ctl.trap.until>=R)for(const q of td.ctl.trap.sqs)L.push({sq:q,k:"trap"});
  if(td.buf.fc&&td.buf.fc.until>=R){const q=byId(td.buf.fc.id);if(q>=0)L.push({sq:q,k:"ring fc"})}
  if(GSV_INFO){const T=SG2.clone(S);for(let f=0;f<90;f++)if(T.b[f]&&T.b[f]!=="k"&&T.b[f]===T.b[f].toLowerCase())for(const t of SG2.pseudo(T.b,f,T.net))if(T.b[t]==="R")L.push({sq:f,k:"ring ifo"})}
  if(GSV_TG&&C&&my){const T=SG2G.targets(st,GSV_TG.id,GSV_TG.id==="dep"?[GSV_TG.p]:GSV_TG.pk,C);for(const x of T)if(typeof x==="number")L.push({sq:x,k:"tg",b:1});
  }
  else if(my){if(td.res.length)for(const d of td.dp)if(!S.b[d.sq])L.push({sq:d.sq,k:"dp",t:"補"});
    if(SG2_SEL>=0&&S.b[SG2_SEL]&&S.b[SG2_SEL]===S.b[SG2_SEL].toUpperCase())for(const[f,t]of st.legal||[]){if(f!==SG2_SEL||!S.b[t])continue;const c=SG2G.pv(st,f,t);if(!c)continue;
      L.push({sq:t,k:"pv "+(c.kill?"kill":c.ok?"ok":"no"),t:(c.by&&c.by.length?"合力":"")+(c.kill?"擊破":c.ok?"−"+c.dmg:"防"+c.D+"→"+(c.D1!=null?c.D1:Math.max(0,c.D-c.down)))})}}   /* 11/17 iMac 17：打不動寫「防 現在→打完」（現在＝資料卡的防禦），不再只寫「防−攻擊力的一半」 */
  return L}
/* 跳字：td.ev 新增的事件 */
function sg2Events(st){const td=st.td,id=st.id;if(SG2_SEEN[id]==null){SG2_SEEN[id]=td.seq;return}const s0=SG2_SEEN[id];if(td.seq<=s0)return;SG2_SEEN[id]=td.seq;
  const N=td.ev.filter(e=>e.s>s0);N.forEach((e,i)=>setTimeout(()=>{try{sg2Ev(e)}catch(x){}},i*220));
  {const a=N.filter(e=>e.k==="att"&&e.by==="r"&&!e.kill&&e.p&&td.s.b[e.t]===e.p).pop();if(a&&SG2_SEL<0&&SG2_PICK!==a.t){SG2_PICK=a.t;GSV_HK="";try{sg2Paint()}catch(x){}}}}   /* 11/17 iMac 18：攻擊沒打死（打不動、扣了血）就把下方資料卡換成被打的那顆，防禦、體力的新數字馬上看得到 */
/* 序章：第一次攻擊沒打死、第一次打不動時，跳一句說明（每一盤各一次） */
let SG2_HINT={};
/* 11/17 iMac 18：打不動也跳一句短提示：哪一顆、防禦從多少降到多少、這一手用掉了；數字跟跳字、資料卡同一個（e.D0→e.D1）。
   每盤只跳前 SG2_DOWN_N 次（序章第一次是教學句，也算一次）；之後只有跳字「打不動・防 D0→D1」和資料卡更新，不再跳提示（太吵） */
const SG2_DOWN_N=2;
function sg2DownMsg(e){const nm=sg2Nm(e.p);return e.D0!=null?"打不動："+(nm?"敵・"+nm+" ":"")+"防禦 "+e.D0+"→"+e.D1+"，這一手用掉了":"打不動：對方防禦降 "+e.down+"，這一手用掉了"}
function sg2ProHint(e){const st=GSV_ST;if(!st||!st.td||e.k!=="att"||e.by!=="r")return;const H=SG2_HINT[st.id]=SG2_HINT[st.id]||{};
  if(!e.ok){if((H.dn||0)>=SG2_DOWN_N)return;H.dn=(H.dn||0)+1}
  if(!e.ok&&!st.td.pro){setTimeout(()=>toast(sg2DownMsg(e)),400);return}if(!st.td.pro)return;
  if(!e.ok&&!H.down){H.down=1;setTimeout(()=>toast(e.D0!=null?"🛡 打不動：對方防禦 "+e.D0+" 比你的攻擊力 "+e.A+" 高，打不進去，它的防禦降到 "+e.D1+"。"+(e.A>=e.D1?"再打一次就打得穿":"多打幾次就打得穿"):"🛡 打不動：對方防禦比你的攻擊力高，所以它的防禦降了 "+e.down+"。再打一次就打得穿"),600)}
  else if(!e.ok){setTimeout(()=>toast(sg2DownMsg(e)),400)}
  else if(e.ok&&!e.kill&&!H.stay){H.stay=1;setTimeout(()=>toast("⚔ 扣了 "+e.dmg+" 體力，但沒打死：攻擊的子停在原地，不會移進去"),600)}}
function sg2Ev(e){try{sg2ProHint(e)}catch(x){}if(typeof bhtdFloat!=="function")return;const at=q=>q!=null&&typeof bhtdXY==="function"&&bhtdXY(q)?{q}:null,F=(t,p,c)=>p&&p.q!=null?(sg2Float(t,p.q,c)||bhtdFloat(t,bhtdXY(p.q),c)):bhtdFloat(t,p,c);   /* 第 3 輪 N3-1：落在棋子上的跳字都走 sg2Float（浮在子上方、收進棋盤框） */
  if(e.k==="att"){const mine=e.by?e.by==="r":true;if(!e.ok){try{if(typeof bhtdFx==="function")bhtdFx("ring",e.t)}catch(x){}const tx=e.D0!=null?`打不動・防 ${e.D0}→${e.D1}`:`打不動・防 −${e.down}`;return F(tx,at(e.t),"info sg2no")}   /* 11/17 iMac 18：打不動也要看得到——被打的子閃一圈、跳字大一號寫防禦前後（同資料卡） */F(e.kill?"擊破！":`−${e.dmg}`,at(e.t),mine?"dmg":"hurt");if(e.sh&&e.sh.dmg)F(`護帥 −${e.sh.dmg}`,at(e.sh.q),mine?"dmg":"hurt");return}
  if(e.k==="spawn")return F("援軍",at(e.sq),"info");if(e.k==="cut")return F("截援！+"+SG2G.CUT_SP+" 靈",at(e.sq),"sp");
  if(e.k==="dep")return F(`部署${GSV.PCN[e.p]}`,at(e.sq),"info");if(e.k==="heal"&&e.n)return F(`+${e.n}`,at(e.sq)||gsvBarXY("gsvMe"),"heal");
  if(e.k==="skill")return F(e.nm,gsvBarXY("gsvMe"),"info");if(e.k==="esk")return F("⚠ 星樞："+e.nm,at(e.sq)||gsvBarXY("gsvEn"),"hurt");if(e.k==="trap")return F("守門：定身一回合",at(e.sq),"info");if(e.k==="lock")return F("銅鎖：定身兩回合",at(e.sq),"info")}
/* 舊版（v1：星核）還沒下完的盤：規則改版了，接不下去 */
function sg2Old(st){const me=document.getElementById("gsvMe"),en=document.getElementById("gsvEn");if(en)en.innerHTML="";if(!me)return;const R=store.get("bhRet",null);
  me.innerHTML=`<div class="gsv-tip"><span>黑洞規則改版了（每顆子有自己的體力、攻防），這一盤沒辦法接著下。</span><button type="button" id="sg2OldGo">回選關</button></div>`;
  const b=me.querySelector("#sg2OldGo");if(b)b.onclick=()=>gsvSelect(R&&R.k||store.get("era","classic"),!!(R&&R.cover))}
/* ---------- 結算：存檔鍵 gsv 的 v2＝{關:{難度:{w,l,d,st:[三顆星],best:{rnd,hp}}}}（舊的 c、h 不動） ---------- */
const SG2_XP=[0,20,40,60],SG2_DUST=[0,3,4,6];
/* 這一盤的獎勵（sg2End、sg2Result 都叫；同一盤只發一次，記在 bhtdDust.la／g 跟 07bht 同一套）：回 {xp, dust, total}
   11/17 開發者選單：序章 9 關（LV[n].pro）重打不給星塵，只有第一次破關給；易／中／難正式關照舊每場贏都給（天賦 600～800、「至少 100 場」的節奏） */
function sg2Award(st){const td=st&&st.td;if(!sg2On(st)||!st.result)return null;let D=null;try{D=typeof bhtdDust==="function"?bhtdDust():null}catch(e){}if(!D)return null;
  if(D.la&&D.la.id===st.id)return D.la;const win=st.result.w===st.human,ns=win?SG2G.stars(td).filter(Boolean).length:0,P=gsvProg(),R=((P.v2||{})[td.lv]||{})[td.diff]||{};
  const first=win&&!(R.w>(D.g.includes(st.id)?1:0)),xp=first?SG2_XP[td.diff]||0:0,pro=!!(GSV.LV[td.lv]&&GSV.LV[td.lv].pro),dust=win&&(first||!pro)?(SG2_DUST[ns]||0)+((typeof dglXiangFx==="function"&&dglXiangFx().dust)||0):0,done=D.g.includes(st.id);
  if(!done){D.d+=dust;D.g=D.g.concat([st.id]).slice(-20);try{if(xp&&typeof addXP==="function")addXP(xp,"星門圍城","gs2:"+td.lv+":"+td.diff)}catch(e){}}
  const A={id:st.id,win,xp,dust,total:D.d,first};D.la=A;try{store.set("bhtdDust",D)}catch(e){}return A}
function sg2End(st){if(!sg2On(st)||!st.result)return;try{sg2Award(st)}catch(e){console.warn("[sg2]",e)}const P=gsvProg();if(P.g.includes(st.id))return;const td=st.td,n=td.lv,d=td.diff;P.v2=Object.assign({},P.v2);P.v2[n]=Object.assign({},P.v2[n]);
  const R=P.v2[n][d]=Object.assign({w:0,l:0,d:0,st:[0,0,0]},P.v2[n][d]),w=st.result.w;
  if(!w)R.d++;else if(w===st.human){const s=SG2G.stars(td);R.st=R.st.map((x,i)=>x||s[i]?1:0);R.w++;const k=SG2.kingOf(td.s.b,"r"),b={rnd:td.rnd,hp:k>=0?td.s.h[k]:0};if(!R.best||b.rnd<R.best.rnd||(b.rnd===R.best.rnd&&b.hp>R.best.hp))R.best=b}else R.l++;
  {const T=d===3?P.h:P.c,O=T[n]=Object.assign({w:0,l:0,d:0},T[n]);if(!w)O.d++;else if(w===st.human)O.w++;else O.l++}   /* 舊的逐關解鎖（GSV.lockWhy）照 c／h 的勝場算：易、中記在 c，難記在 h；第二期改選關時再換 */
  P.g=P.g.concat([st.id]).slice(-20);store.set("gsv",P)}
function sg2Result(st,win,draw0,XPR){gsvCss();const td=st.td,n=td.lv,V=GSV.LV[n]||{},R=store.get("bhRet",null),k=R&&R.k,cv=R&&R.cover,why=st.result.why||"",S=td.s;
  const used=Object.keys(td.used).filter(id=>SG2G.SKM[id]).map(id=>SG2G.SKM[id].nm+(td.used[id]>1?"×"+td.used[id]:"")).join("、")||"沒有";
  const P=gsvProg(),rec=((P.v2||{})[n]||{})[td.diff],now=win?SG2G.stars(td):[0,0,0],have=[0,1,2].map(i=>now[i]||(rec&&rec.st&&rec.st[i])?1:0);
  const G=SG2G.goals(td).map((g,i)=>now[i]?`<b>★ <span>${esc(g.t)}</span></b>`:have[i]?`★ <span>${esc(g.t)}</span>`:`<i>☆ <span>${esc(g.t)}</span></i>`).join("　");
  const kr=SG2.kingOf(S.b,"r"),kb=SG2.kingOf(S.b,"b"),hp=q=>q<0?"倒下":Math.max(0,S.h[q])+"／"+S.x[q];
  let AW=null;try{AW=sg2Award(st)}catch(e){}const awH=AW&&(AW.xp||AW.dust)?`<p style="font-size:13.5px;text-align:center">${AW.xp?`✨ 第一次破這一關（${esc(td.dnm)}）：首勝獎勵修為 +${AW.xp}（下面的成長列另含闖關星）　`:""}${AW.dust?`🌌 星塵 +${AW.dust}（共 ${AW.total}）`:""}</p>`:"";
  modal(`<div class="em">${win?"✨":draw0?"🤝":"🌀"}</div><h2>${win?"破陣":draw0?"不分勝負":"星門失守"}</h2><p class="muted">${esc(why)}・🌠 星門圍城・${esc(SG2G.nameOf(n))}・${esc(V.nm||td.nm)}（${esc(td.dnm)}）</p>
    <p class="gsv-gl">${G}</p>${awH}
    <p style="font-size:13.5px;text-align:center"><b>打了 ${sg2Rnds(st)} 回合</b><span class="sg2-ex">・帥 ${hp(kr)}・敵將 ${hp(kb)}</span></p>
    <p style="font-size:13px;text-align:center">部署 ${td.dep} 次・用過的招：${esc(used)}</p>${!win&&V.tip?`<p class="muted" style="font-size:13px">💡 ${esc(V.tip)}</p>`:""}
${XPR||""}`,
    sg2ResDrift(k,cv)?[["⛵ 星槎回航",sg2ResHome],["↻ 再打一次",()=>gsvStart(n,k,cv,td.sk,true,0,td.diff),true],["再看一下星盤",null,true]]
      :[["↻ 再打一次",()=>gsvStart(n,k,cv,td.sk,true,0,td.diff)],["返回選關",()=>gsvSelect(k,cv),true],["再看一下星盤",null,true]],"res")}
/* 11/17 iPhone 模擬器測試（全新玩家第一次偏航打完序章 A1）：結果視窗只有「再打一次／返回選關」，按返回選關打開序章 A1～C3 的關卡列表，主線下一步（回星槎去漢朝）反而找不到。
   起航途中偏航來的這一盤（sessionStorage bhDrift，07sg2 sg2Drift 設、選關出戰清掉；有目的站 bhRet.k、要補停靠 bhRet.cover）：主按鈕改「⛵ 星槎回航」＝07bh bhReturn
   （回星槎頁、補跑那一站的停靠封面和加入夥伴），「再打一次」留著當次要鈕；從觀星臺選關進來的照舊「再打一次／返回選關」 */
/* 11/17 iPhone 模擬器第 11 項：結算寫「打了 2 回合」，對局時頂端已經是「第 3 回合」——td.rnd 是「走完的回合」（黑方走完才 +1），紅方這一手就分勝負（將死、打倒將）時那一回合還沒算進去。
   結算顯示「分勝負那一回合是第幾回合」＝對局時頂端最後看到的數字；黑方走完、回合結束後才判的（打滿回合、紅方沒步可走）td.rnd 已經 +1，照舊。只改顯示，星星、最佳紀錄照舊用 td.rnd */
function sg2Rnds(st){const td=st&&st.td;if(!td)return 0;const L=st.moves||[],m=L[L.length-1],R=+td.rnd||0;if(!m)return R;const mid=m.by==="r"||(m.by==="b"&&td.over&&td.over.why==="將帥體力歸零");return mid?Math.min(R+1,+td.rlim||R+1):R}
function sg2ResDrift(k,cv){let d=false;try{d=sessionStorage.getItem("bhDrift")==="1"}catch(e){}return d&&!!k&&!!cv}
function sg2ResHome(){try{sessionStorage.removeItem("bhDrift")}catch(e){}if(typeof bhReturn==="function")bhReturn();else location.hash="#/adventure"}

/* ---------- 第二期：選關（序章／易／中／難四組，每一關再選易中難）、解鎖、偏航、舊玩法的盤 ----------
   07bhg 的 gsvSelect 看到 SG2G 就交給 sg2Select；gsvStart 的鎖改問 SG2G.lockWhy。存檔照舊是 gsv（v2＝{關:{難度:{w,l,d,st,best}}}）。 */
/* 舊玩法（遠征、急襲、練習賽、舊規則的星門圍城）還沒下完的盤：07bht bhtdTick 叫，畫一條提示（回 true＝這邊處理了） */
function sg2Retired(st){if(typeof document==="undefined"||!st||!st.td||sg2On(st))return false;const bb=document.getElementById("bbox");if(!bb||!bb.parentNode)return true;
  let el=document.getElementById("sg2Ret");if(!el){el=document.createElement("div");el.id="sg2Ret";el.className="gsv-tip";el.style.margin="8px auto";el.style.maxWidth="560px";bb.after(el)}
  el.innerHTML=`<span>黑洞改版了：現在只有星門圍城，每顆子都有自己的體力、攻防。這一盤是舊玩法，沒辦法接著下。</span><button type="button" id="sg2RetGo">去星門圍城</button>`;
  const b=el.querySelector("#sg2RetGo");if(b)b.onclick=()=>{el.remove();const R=store.get("bhRet",null);gsvSelect(R&&R.k||store.get("era","classic"),!!(R&&R.cover))};return true}
/* 偏航：打過序章 C1（或改版前打過主線）才直接開一場；開哪一關＝已開放的主線關裡隨機一關、難度中 */
/* 11/16 開發者選單「第一次起航必定偏航」：主線還沒有開放的關（新玩家）＝直接打序章裡第一個開著、還沒贏過的關（A1），難度照序章固定易 */
function sg2ProNext(P){const has=gsvHas(),won=n=>!!((P.c&&P.c[n]&&P.c[n].w>0)||(P.v2&&P.v2[n]&&[1,2,3].some(d=>P.v2[n][d]&&P.v2[n][d].w>0)));
  return SG2G.GRP[0].lv.find(n=>!won(n)&&!SG2G.lockWhy(P,n,false,has))}
function sg2DriftOk(){try{const P=gsvProg();return SG2G.ORD.some(n=>!SG2G.lockWhy(P,n,false,null))||sg2ProNext(P)!=null}catch(e){return false}}
function sg2Drift(k,cover){if(!sg2DriftOk())return false;try{sessionStorage.setItem("bhDrift","1")}catch(e){}   /* 11/16 偏航急襲記號：07bh bhSgBase 放墨潮湧兵；從選關出戰清掉 */const P=gsvProg(),L=SG2G.ORD.filter(n=>!SG2G.lockWhy(P,n,false,null));
  if(!L.length){const n=sg2ProNext(P);if(n==null)return false;gsvStart(n,k,cover,null,true,0,1);return true}
  const n=L[Math.floor(Math.random()*L.length)];gsvStart(n,k,cover,(P.sk&&P.sk["*"])||null,true,0,2);return true}
const sg2Rec=(P,n,d)=>((P.v2||{})[n]||{})[d]||{};
function sg2CardHTML(P,n,d,sel,o){const V=GSV.LV[n],R=sg2Rec(P,n,d),lk=SG2G.lockWhy(P,n,o.all,o.has),LN=SG2G.nameOf(n),st=R.st||[0,0,0],rec=R.w||R.l||R.d?`勝 ${R.w||0}・和 ${R.d||0}・敗 ${R.l||0}`:"";
  if(lk)return`<button type="button" class="gsv-card lk" data-n="${n}" data-lk="${esc(lk)}" aria-disabled="true" aria-label="${esc(`${LN} ${V.nm}，還沒開放：${lk}`)}"><b>🔒 ${esc(LN)}・${esc(V.nm)}</b><small aria-hidden="true">${esc(lk)}</small></button>`;
  return`<button type="button" class="gsv-card${n===sel?" on":""}" data-n="${n}" aria-label="${esc(`${LN} ${V.nm}（${V.th||""}），${SG2.DIFF[d].nm}：${st.filter(Boolean).length} 顆星${rec?"，"+rec:""}。${V.say||""}`)}"><b>${esc(LN)}・${esc(V.nm)}</b><span class="gsv-s3" aria-hidden="true">${st.map(x=>x?"★":"☆").join("")}</span>${rec?`<small aria-hidden="true">${R.w?"✓ ":""}${rec}</small>`:""}</button>`}
/* 11/17 測試員 B（B-2）：序章一律打「易」（出戰本來就照這樣開），選關卡片的紀錄、星星、目標列卻照上次選的難度（預設中）查，打過的序章關還是 ☆☆☆、目標寫「（中）14 回合內」。
   選關畫面每一關都用「這一關實際會開的難度」：序章＝易，其他照玩家選的 */
const sg2DOf=(n,d)=>GSV.LV[n]&&GSV.LV[n].pro?1:d;
function sg2Select(k,cover){gsvCss();const P=gsvProg(),all=gsvDevAll(),has=gsvHas(),o={all,has};
  let sel=P.last&&GSV.LV[P.last]?P.last:SG2G.GRP[0].lv[0];if(SG2G.lockWhy(P,sel,all,has))sel=SG2G.GRP.flatMap(g=>g.lv).find(n=>!SG2G.lockWhy(P,n,all,has))||SG2G.GRP[0].lv[0];
  let d=[1,2,3].includes(+P.lastD)?+P.lastD:2,grp=(SG2G.GRP.find(g=>g.lv.includes(sel))||SG2G.GRP[0]).id;
  const pool=typeof ptyGroups==="function"?ptyGroups(SG2G.SK):[];
  const G=()=>SG2G.GRP.find(g=>g.id===grp)||SG2G.GRP[0];
  const chH=()=>{const g=G(),V=GSV.LV[sel]||{},ds=sg2DOf(sel,d),R=sg2Rec(P,sel,ds);
    return`<div class="gsv-chs" role="tablist">${SG2G.GRP.map(x=>`<button type="button" class="gsv-chb${x.id===grp?" on":""}" role="tab" aria-selected="${x.id===grp}" data-g="${x.id}">${esc(x.nm)}</button>`).join("")}</div>
<div class="gsv-cards">${g.lv.map(n=>sg2CardHTML(P,n,sg2DOf(n,d),sel,o)).join("")}</div>
<div class="gsv-chs gsv-mds"${GSV.LV[sel]&&GSV.LV[sel].pro?' style="display:none"':""}>${[1,2,3].map(v=>`<button type="button" class="gsv-chb gsv-mdb${v===d?" on":""}" data-d="${v}" aria-pressed="${v===d}">${SG2.DIFF[v].nm}</button>`).join("")}</div>
<p class="gsv-gl">${esc(SG2G.nameOf(sel))}・${esc(V.nm||"")}（${SG2.DIFF[ds].nm}）：${SG2G.goals({r3:SG2G.r3Of(sel,ds)}).map((x,i)=>(R.st&&R.st[i]?"★ ":"☆ ")+`<span>${esc(x.t)}</span>`).join("　")}</p>
<p class="muted" style="font-size:12.5px;margin:2px 0">${esc(SG2.DIFF[ds].nm==="易"?"易：對方數值 ×0.9、電腦只看 1 步":SG2.DIFF[ds].nm==="中"?"中：對方數值照關卡、電腦看 2 步":"難：對方數值 ×1.25、電腦看 3 步，星門多一波")}</p>`};
  const skH=()=>pool.length?pool.map(g=>`<p class="gsv-skg">${esc(g.nm)} <small>Lv ${g.L}</small></p>`+g.sk.map(s=>`<label class="${s.lv>g.L?"lk":"on"}" data-id="${s.id}" title="${esc(s.d)}">${s.lv>g.L?"🔒 Lv"+s.lv+" ":""}${esc(s.nm)}・${s.cost} 靈</label>`).join("")).join(""):`<p class="muted">還沒有夥伴學會招式</p>`;
  const m=modal(`<div class="em">🌠</div><h2>星門圍城</h2><div class="gsv-chap">${chH()}</div><p style="font-size:13px;margin-bottom:2px">招式（每位夥伴學會的都能用，一回合放一招；那位的棋子都倒了就不能放）</p><div class="gsv-skl">${skH()}</div>
    <button type="button" class="gsv-chb" data-tal="1" style="margin:6px 0">🌌 天賦（已點亮 ${sg2TalCount()}）</button>
    <details><summary>星門圍城規則</summary>${sg2RulesHTML()}</details>`,
    [["⚔ 出戰",()=>{try{sessionStorage.removeItem("bhDrift")}catch(e){}const Q=gsvProg();Q.lastD=d;store.set("gsv",Q);gsvStart(sel,k,cover,null,false,0,sg2DOf(sel,d))}],[typeof gxtBackLb==="function"?gxtBackLb():"⛵ 星槎回航",null,true]],"prolog gsv-sel");
  if(!m)return;m.addEventListener("click",e=>{if(e.target.closest("[data-tal]")){try{vibrate(5)}catch(z){}m.remove();sg2TalSheet(()=>sg2Select(k,cover),"‹ 回選關");return}
    const c=e.target.closest(".gsv-card"),dd=e.target.closest("[data-d]"),t=dd?null:e.target.closest("[data-g]");
    if(dd)d=+dd.dataset.d;
    else if(t){grp=t.dataset.g;const g=G();if(!g.lv.includes(sel)){const f=g.lv.find(n=>!SG2G.lockWhy(P,n,all,has));if(f)sel=f}}
    else if(c){if(c.dataset.lk){toast(`🔒 ${SG2G.nameOf(+c.dataset.n)}：${c.dataset.lk}`);return}sel=+c.dataset.n}
    if(c||t||dd){try{vibrate(5)}catch(z){}m.querySelector(".gsv-chap").innerHTML=chH();return}
    const l=e.target.closest(".gsv-skl label");if(l){e.preventDefault();const s=SG2G.SKM[l.dataset.id];if(!s)return;const Lc=typeof ptyLv==="function"?ptyLv(s.ch):1;
      toast(s.lv>Lc?`🔒 ${typeof ptyNm==="function"?ptyNm(s.ch):""} Lv ${s.lv} 解鎖「${s.nm}」`:`✦ ${s.nm}：${s.d}`)}})}

/* ---------- 每位角色專屬天賦（story/167）：天賦頁、舊天賦退星塵 ----------
   存檔 "sg2Tal"＝{角色:[天賦 id]}；星塵照舊在 bhtdDust.d（全隊共用）。舊的全隊天賦樹（bhtdDust.t）第一次打開這裡時全部退回星塵（照舊的免費重置），之後不再讀。 */
function sg2TalGet(){let o=null;try{o=store.get("sg2Tal",null)}catch(e){}if(!o||typeof o!=="object"){o={};try{const D=store.get("bhtdDust",null);
    if(D&&Array.isArray(D.t)&&D.t.length&&typeof BHTD!=="undefined"&&BHTD.talReset){const n=BHTD.talReset(D);store.set("bhtdDust",D);if(n)setTimeout(()=>toast("🌌 天賦改成每位各自的了：舊天賦退回星塵 "+n),400)}}catch(e){}try{store.set("sg2Tal",o)}catch(e){}}
  return SG2G.talNorm(o)}
const sg2Dust=()=>{try{return typeof bhtdDust==="function"?bhtdDust().d:0}catch(e){return 0}};
function sg2DustAdd(n){try{const D=store.get("bhtdDust",null)||{};D.d=Math.max(0,(Math.round(+D.d)||0)+n);store.set("bhtdDust",D)}catch(e){}}
function sg2TalMembers(){const L=[];try{for(const ck in SG2G.TALC){const has=typeof ptyHas==="function"?ptyHas(ck):true;if(has)L.push({ck,L:typeof ptyLv==="function"?ptyLv(ck):1,nm:typeof ptyNm==="function"?ptyNm(ck):(GSV.CH[ck]?GSV.CH[ck].n:ck)})}}catch(e){}return L}
const sg2TalCount=()=>{const o=sg2TalGet();let n=0;for(const ck in o)n+=o[ck].length;return n};
/* 天賦頁：back＝關掉後回哪裡（選關、卡冊、角色卡），backL＝返回鈕的字
   11/16 開發者（天賦頁截圖）「這一頁的排版你重新設計，有夠亂七八糟」：原本是彈窗裡置中的一串字（深紫按鈕的樣式被彈窗的按鈕樣式蓋掉）。
   改成跟雲河七星卡冊一樣的底部面板：最上面一張摘要（星塵大字＋兩行規則）；每位夥伴一張卡＝小頭像、名字、Lv，右邊狀態（🔒 Lv N 解鎖／已點亮 n／2）、重置；
   only＝只看這一位（11/16 開發者「點某個角色的天賦 只會出現那個角色的天賦描述 不是顯示所有的」：角色卡、卡冊每張卡的「天賦」傳這位；卡冊最上面、選關的天賦照舊看全隊）；
   天賦一列一個：左邊名稱＋效果（靠左，效果小一號淡一點），右邊價錢膠囊或「★ 已點亮」；還沒解鎖、星塵不夠的整列淡掉，點了說原因。點亮前的確認照舊 */
function sg2tCss(){if(document.getElementById("sg2tCss"))return;const s=document.createElement("style");s.id="sg2tCss";s.textContent=`
.sg2t-sum{display:flex;align-items:center;gap:12px;padding:10px 12px;margin:0 0 12px;border:1px solid var(--line,#d8cfbf);border-radius:12px;background:var(--card,#fffaf0)}
.sg2t-sum .d{display:flex;flex-direction:column;align-items:center;min-width:64px;flex:none}.sg2t-sum .d b{font-size:26px;line-height:1.1;font-variant-numeric:tabular-nums}.sg2t-sum .d small{font-size:12px;color:var(--muted,#6b6257)}
.sg2t-sum ul{margin:0;padding:0 0 0 12px;border-left:1px solid var(--line,#d8cfbf);list-style:none;font-size:13px;line-height:1.65;color:var(--muted,#6b6257)}
.sg2t-c{margin:0 0 12px;border:1px solid var(--line,#d8cfbf);border-radius:12px;background:var(--card,#fffaf0);overflow:hidden}
.sg2t-h{display:flex;align-items:center;gap:10px;padding:10px 12px}
.sg2t-h img{width:40px;height:40px;border-radius:8px;object-fit:cover;object-position:top;background:rgba(128,110,80,.12);flex:none}
.sg2t-h .n{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sg2t-h .n b{font-size:16px}.sg2t-h .n small{margin-left:6px;font-size:13px;color:var(--muted,#6b6257)}
.sg2t-tag{flex:none;font-size:12.5px;padding:2px 9px;border-radius:99px;background:rgba(128,110,80,.14);color:var(--muted,#6b6257);white-space:nowrap}.sg2t-tag.ok{background:#f3e3b5;color:#5a4300}
.sg2t-r{flex:none;min-height:32px;font:inherit;font-size:12.5px;padding:2px 10px;border-radius:99px;border:1px solid var(--line,#d8cfbf);background:none;color:inherit;cursor:pointer}
.sg2t-t{display:flex;align-items:center;gap:10px;width:100%;min-height:56px;margin:0;padding:9px 12px;border:0;border-top:1px solid var(--line,#d8cfbf);border-radius:0;background:none;box-shadow:none;color:inherit;font:inherit;text-align:left;cursor:pointer}
.sg2t-t .x{flex:1;min-width:0}.sg2t-t .x b{display:block;font-size:15px;line-height:1.35}.sg2t-t .x span{display:block;margin-top:1px;font-size:13px;line-height:1.5;color:var(--muted,#6b6257)}
.sg2t-t .p{flex:none;font-size:12.5px;padding:3px 10px;border-radius:99px;border:1px solid #c9a24a;color:#7a5a12;white-space:nowrap;font-variant-numeric:tabular-nums}
.sg2t-t.on .p{background:#f3e3b5;border-color:#f3e3b5;color:#5a4300}.sg2t-t.on .x b{color:#a06a00}
.sg2t-t.off .x,.sg2t-t.off .p{opacity:.5}.sg2t-t:focus-visible{outline:3px solid #E8C77A;outline-offset:-3px}
.sg2t-back{width:100%;margin-top:2px}`;document.head.append(s)}
function sg2TalSheet(back,backL,only){gsvCss();sg2tCss();const H=()=>{const o=sg2TalGet(),d=sg2Dust(),ms=sg2TalMembers().filter(m=>!only||m.ck===only);
    return`<div class="sg2t-sum"><div class="d"><b>${d}</b><small>星塵</small></div><ul><li>全隊共用；每位最多點亮 ${SG2G.TAL_MAX} 個</li><li>五招都學會才能點；關卡外可以免費重置</li></ul></div>`+
      (ms.length?ms.map(m=>{const lit=o[m.ck]||[],need=SG2G.talNeedL(m.ck),ok=m.L>=need;
        const tag=ok?`<span class="sg2t-tag ok">已點亮 ${lit.length}／${SG2G.TAL_MAX}</span>`:`<span class="sg2t-tag">🔒 Lv ${need} 解鎖</span>`;
        return`<section class="sg2t-c"><div class="sg2t-h"><img src="data/xs/prev_${m.ck}.webp" alt="" onerror="this.remove()"><span class="n"><b>${esc(m.nm)}</b><small>Lv ${m.L}</small></span>${tag}${lit.length?`<button type="button" class="sg2t-r" data-r="${m.ck}">重置</button>`:""}</div>`+
          SG2G.TALC[m.ck].map(t=>{const on=lit.includes(t.id),w=on?"":SG2G.talWhy(o,t.id,d,m.L);
            return`<button type="button" class="sg2t-t${on?" on":w?" off":""}" data-t="${t.id}"${w?` data-w="${esc(w)}"`:""} aria-label="${esc(t.nm+"："+t.d+"，"+(on?"已點亮":w||t.cost+" 星塵"))}"><span class="x"><b>${esc(t.nm)}</b><span>${esc(t.d)}</span></span><span class="p">${on?"★ 已點亮":t.cost+" 星塵"}</span></button>`}).join("")+`</section>`}).join(""):`<p class="muted">還沒有夥伴加入</p>`)+
      `<button type="button" class="btn sg2t-back" data-back="1">${esc(backL||"‹ 返回")}</button>`};
  const again=()=>sg2TalSheet(back,backL,only),one=only&&sg2TalMembers().find(m=>m.ck===only);
  sheet(one?"🌌 "+one.nm+"的天賦":"🌌 天賦",b=>{b.innerHTML=H();
    b.addEventListener("click",e=>{
      if(e.target.closest("[data-back]")){closeSheet();if(back)setTimeout(back,60);return}
      const r=e.target.closest("[data-r]");if(r){const o=sg2TalGet(),L=o[r.dataset.r]||[],n=L.reduce((a,id)=>a+SG2G.TALM[id].cost,0);delete o[r.dataset.r];store.set("sg2Tal",o);sg2DustAdd(n);try{vibrate(5)}catch(z){}toast("🌌 退回星塵 "+n);b.innerHTML=H();return}
      const bt=e.target.closest("[data-t]");if(!bt)return;if(bt.classList.contains("on"))return;if(bt.dataset.w){toast("✦ "+bt.dataset.w);return}
      const id=bt.dataset.t,t=SG2G.TALM[id],ck=SG2G.TAL_CK[id],o=sg2TalGet(),mm=sg2TalMembers().find(x=>x.ck===ck),w=SG2G.talWhy(o,id,sg2Dust(),mm?mm.L:0);if(w){toast("✦ "+w);return}
      closeSheet();
      setTimeout(()=>modal(`<h2 style="font-size:19px">點亮「${esc(t.nm)}」？</h2><p>${esc(t.d)}</p><p class="muted">花 ${t.cost} 星塵（現在 ${sg2Dust()}）。關卡外可以免費重置、星塵全數退回。</p>`,
        [["點亮",()=>{const o2=sg2TalGet();if(SG2G.talWhy(o2,id,sg2Dust(),mm?mm.L:0))return again();o2[ck]=(o2[ck]||[]).concat([id]);store.set("sg2Tal",o2);sg2DustAdd(-t.cost);try{vibrate([10,30,10])}catch(z){}toast("🌌 點亮「"+t.nm+"」");again()}],["先不要",again,true]]),200)})})}
