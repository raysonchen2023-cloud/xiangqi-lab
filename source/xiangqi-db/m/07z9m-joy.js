/* ================= 🕹 地底迷宮虛擬搖桿（W134；前綴 jhMzJoy，11/26 grep 過沒撞名）=================
   開發者 11/26：「重新設計地底迷宮的方向鍵，太醜了，不直觀也怪怪的」，三種改法裡選「B 虛擬搖桿」。
   原本：地圖下面一條 3×3 小方格，斜俯視時四顆鍵擠到四個角、箭頭改成 ↗↘↙↖，跟畫面上的菱形格子對不起來。
   改成：地圖左下角一個半透明圓盤疊在地圖上（iPad、手機橫放這種橫的畫面放右下，右手拇指順），拇指按住往哪推，角色就往畫面上那個方向走；
     自動對到最近的格子方向（平面版上下左右、斜俯視右上＝北、右下＝東、左下＝南、左上＝西），放開就停在下一格。底下那條方向鈕收起來，地圖多出那一條的高度。
   不變的：
     ・走路照舊用 07z9m-maze.js 的 go()／held：每踏一格＝一回合，按住一直走（搖桿只是另一種按住）；
     ・鍵盤方向鍵照舊（onKey／keys 沒動）；
     ・原本四顆方向鈕留在畫面外（只給旁白、切換控制用），點地面自動走也照舊。
   純計算 jhMzJoyDir 不碰 DOM，測試 xiangqi-lab/tools/test-w134-maze-joy.js 用 vm 跑 */
const JH_MZ_JOY={R:66,KNOB:28,DEAD:16,HYS:.17};   /* R 圓盤半徑、KNOB 拇指鈕半徑、DEAD 中間多少 px 內不算推、HYS 換方向的黏性（弧度，約 10 度）：在兩個方向交界附近抖動時不會一直換 */
/* 推的向量 (dx,dy)（畫面座標，往下為正）→ 方向鍵 u、r、d、l，在中間死區內回 null。
   iso＝斜俯視：四個方向是四個斜角（北＝右上）；prev＝現在的方向，離交界不到 HYS 就維持原方向 */
function jhMzJoyDir(dx,dy,iso,prev){if(!(Math.hypot(dx,dy)>=JH_MZ_JOY.DEAD))return null;
  const C=iso?{u:-Math.PI/4,r:Math.PI/4,d:3*Math.PI/4,l:-3*Math.PI/4}:{u:-Math.PI/2,r:0,d:Math.PI/2,l:Math.PI};
  const a=Math.atan2(dy,dx),dist=k=>{let d=Math.abs(a-C[k])%(2*Math.PI);return d>Math.PI?2*Math.PI-d:d};
  let best=null,bd=9;for(const k of["u","r","d","l"]){const d=dist(k);if(d<bd){bd=d;best=k}}
  if(prev&&prev!==best&&C[prev]!=null&&dist(prev)<Math.PI/4+JH_MZ_JOY.HYS)return prev;
  return best}
/* 橫的畫面（iPad 橫放、手機橫放）放右下，直的放左下 */
const jhMzJoySide=(w,h)=>w>h&&w>=600?"r":"l";
function jhMzJoyCss(){if(typeof document==="undefined"||document.getElementById("jhMzJoyCss"))return;const s=document.createElement("style");s.id="jhMzJoyCss";s.textContent=`
.jh-mz.joy .jh-mz-pad{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;border:0}
.jh-mz-joy{position:absolute;bottom:calc(18px + env(safe-area-inset-bottom));left:18px;width:${JH_MZ_JOY.R*2}px;height:${JH_MZ_JOY.R*2}px;border-radius:50%;z-index:3;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;
  background:rgba(20,15,10,.38);border:1.5px solid rgba(233,223,201,.42);box-shadow:inset 0 0 0 7px rgba(233,223,201,.06)}
.jh-mz-joy.r{left:auto;right:18px}
.jh-mz-joy i{position:absolute;left:50%;top:50%;width:0;height:0;margin:-7px 0 0 -7px;border:7px solid transparent;border-bottom:9px solid rgba(233,223,201,.5);transform-origin:7px 7px;transition:border-bottom-color .12s}
.jh-mz-joy i.on{border-bottom-color:#e8b75a}
.jh-mz-joy b{position:absolute;left:50%;top:50%;width:${JH_MZ_JOY.KNOB*2}px;height:${JH_MZ_JOY.KNOB*2}px;margin:-${JH_MZ_JOY.KNOB}px 0 0 -${JH_MZ_JOY.KNOB}px;border-radius:50%;
  background:rgba(233,223,201,.82);border:2px solid #e8b75a;box-shadow:0 2px 6px rgba(0,0,0,.45);transition:transform .14s ease-out;will-change:transform}
.jh-mz-joy.drag b{transition:none}
@media (prefers-reduced-motion:reduce){.jh-mz-joy b,.jh-mz-joy i{transition:none}}`;document.head.append(s)}
/* 掛到迷宮頁：v＝#view；o.iso()＝現在是不是斜俯視；o.go(k)＝開始往 k 走（換方向也叫）；o.stop()＝放開 */
function jhMzJoy(v,o){try{const mz=v&&v.querySelector(".jh-mz"),box=v&&v.querySelector(".jh-mz-cv");if(!mz||!box)return null;jhMzJoyCss();mz.classList.add("joy");
  const J=document.createElement("div");J.className="jh-mz-joy";J.setAttribute("aria-hidden","true");   /* 旁白、切換控制用原本那四顆方向鈕（還在，只是收到畫面外） */
  const ARW={};for(const k of["u","r","d","l"]){const e=document.createElement("i");ARW[k]=e;J.append(e)}
  const knob=document.createElement("b");J.append(knob);box.append(J);
  const R=JH_MZ_JOY.R,KN=JH_MZ_JOY.KNOB,place=()=>{J.classList.toggle("r",jhMzJoySide(innerWidth,innerHeight)==="r")};
  /* 四個小三角形：平面版指上下左右、斜俯視轉到四個斜角，指的就是那個方向會走去的畫面方向 */
  const arrows=()=>{const iso=!!o.iso(),A=iso?{u:45,r:135,d:225,l:315}:{u:0,r:90,d:180,l:270};for(const k in ARW)ARW[k].style.transform=`rotate(${A[k]}deg) translateY(-${R-17}px)`};
  let pid=null,cur=null;const lit=k=>{for(const q in ARW)ARW[q].classList.toggle("on",q===k)};
  const at=e=>{const r=J.getBoundingClientRect();let dx=e.clientX-(r.left+R),dy=e.clientY-(r.top+R);const d=Math.hypot(dx,dy),m=R-KN+6;if(d>m){dx=dx/d*m;dy=dy/d*m}
    knob.style.transform=`translate(${dx}px,${dy}px)`;const k=jhMzJoyDir(dx,dy,!!o.iso(),cur);if(k!==cur){cur=k;lit(k);if(k)o.go(k);else o.stop()}};
  const end=()=>{pid=null;J.classList.remove("drag");knob.style.transform="";if(cur){cur=null;lit(null);o.stop()}};
  J.addEventListener("pointerdown",e=>{e.preventDefault();e.stopPropagation();pid=e.pointerId;try{J.setPointerCapture(pid)}catch(_){}J.classList.add("drag");arrows();at(e)});
  J.addEventListener("pointermove",e=>{if(e.pointerId===pid)at(e)});
  for(const n of["pointerup","pointercancel","lostpointercapture"])J.addEventListener(n,e=>{if(e.pointerId===pid)end()});
  J.addEventListener("contextmenu",e=>e.preventDefault());
  place();arrows();const onRs=()=>{if(!J.isConnected){removeEventListener("resize",onRs);return}place()};addEventListener("resize",onRs);
  return{el:J,arrows,end}}catch(e){return null}}
