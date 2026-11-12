/* 11/12 無障礙第 4 輪（評比循環：無障礙專家、UIUX 專家）
   P16.4 聽覺回饋與空間感：選子、落子、吃子、將軍、走不了、輪到你、對方走完各有不同的提示音；時間剩 1 分、30 秒、10 秒「嗶嗶」，時間到「超時」低音。
     Web Audio StereoPannerNode 照棋子在畫面上的那一路放左右聲道：玩家看出去右邊數來，一路在最右、九路在最左（跟 11b axmPos 念的路數一致），翻轉棋盤跟著翻。
     開關：設定 → 系統 → ♿ 無障礙「🎧 聲音方位與動作提示音」（store axSnd：沒選過＝跟著螢幕報讀模式；勾了／取消＝自己決定）。
     沒開＝一般模式完全照舊（01-board 的 moveSound、sayCall 原封不動）。開了：落子、吃子改播有方位的提示音（取代原本置中的叩聲），喊「吃」「將軍」照舊。
     靜音：「走子音效」「吃子音效」都關＝不響；App 在背景不響；沒有聲音（AC 還沒被點選喚醒）也不硬叫。音量跟原本走棋音效同一級（第 6 輪 F3 起另有「提示音」音量滑桿、靜音、節流，見下面 SXM 段）。
   P21.3 狀態提示與過場回饋（只在螢幕報讀模式）：換頁念「頁面：棋譜」；長時間載入（象棋引擎、資料下載、畫面上的「載入中…」字樣、等圖的水墨畫面）超過 0.8 秒念「載入中…」，好了念「載入完成」。
   P16.5 心智模型：? 鍵說明卡多一顆「🧭 空間導覽」（data/docs/a11y-tour.md，05-settings XQDOC.tour）；G 鍵直接開。
     螢幕報讀模式不畫 3D 園子（focusOn），園子裡能點的東西（石桌、茶杯、燈籠、樹、遠景、對手…）改成「🌳 園子地點清單」按鈕列，點了＝在園子裡點那樣東西（06-cpu parkInfo）。
   測試：xiangqi-lab/tools/test-a11y-audio.js（vm 載入 #AXS-PURE 和 #AXS-CORE 兩段，假的 AudioContext）。前綴 axs（11b 是 axm）
   第 5 輪（Gemini、ChatGPT 101 號建議）：🎼 音效圖鑑（AXS_DEX，九種一列一個＋▶ 試聽、左中右試聽）、將軍／超時改念在 assertive 播報區（axsAlert）、
     主要頁面第一次進來念「本頁地圖」（axsPageMap，W 鍵也念）、開發者模式「🔍 聲音事件紀錄」（axsLogAdd，最近 20 筆）。測試 test-a11y-p16.js */
/* #AXS-PURE-BEGIN：到 #AXS-PURE-END 是不碰畫面、不碰聲音的純函式 */
/* 畫面上的第幾欄（0＝最左）：sq 是棋盤內部格號（0～89，0＝黑方底線最左），flip＝黑方在下 */
function axsCol(sq,flip){return flip?8-sq%9:sq%9}
/* 玩家看出去的第幾路（右邊數來，一路在最右）——跟 axmPos 念的一樣 */
function axsFile(sq,flip){return 9-axsCol(sq,flip)}
/* 立體聲方位：最左一欄 -w、正中間 0、最右一欄 +w（預設 w＝0.8，不整個切到單邊，戴單耳也聽得到） */
function axsPan(sq,flip,w){if(sq==null||!(sq>=0&&sq<=89))return 0;w=w==null?.8:w;return Math.round((axsCol(sq,flip)-4)/4*w*1000)/1000}
/* 每種動作的提示音：w 波形；n＝[頻率 Hz, 開始秒, 長度秒, 相對音量] */
function axsTone(k){const T={
    select:{w:"sine",n:[[880,0,.06,.6]]},
    move:{w:"triangle",n:[[420,0,.09,1]]},
    capture:{w:"triangle",n:[[330,0,.06,1],[196,.06,.14,1]]},
    check:{w:"square",n:[[660,0,.07,.45],[990,.09,.13,.45]]},
    illegal:{w:"square",n:[[208,0,.08,.4],[196,.11,.12,.4]]},
    turn:{w:"sine",n:[[523,0,.08,.7],[784,.1,.14,.7]]},
    opp:{w:"sine",n:[[659,0,.07,.7],[440,.08,.1,.7]]},
    timelow:{w:"sine",n:[[1046,0,.06,.6],[1046,.13,.06,.6]]},
    timeout:{w:"sawtooth",n:[[392,0,.2,.45],[262,.22,.45,.45]]}};return T[k]||null}
const AXS_KINDS=["select","move","capture","check","illegal","turn","opp","timelow","timeout"];
/* 提示音的「長相」（測試用：每種都要不一樣） */
function axsSig(k){const t=axsTone(k);return t?t.w+":"+t.n.map(x=>x[0]+"@"+x[1]).join(","):""}
/* 開不開：pref＝store axSnd（true／false／沒選過 null）；沒選過就跟著螢幕報讀模式 */
function axsSpatialOn(pref,ax){return pref===true||pref===false?pref:!!ax}
/* 靜音：原本的「走子音效」「吃子音效」都關＝不響（get(key, 預設) 照 store.get 的樣子） */
function axsMuted(get){try{return!(get("capSound",true)||get("mvSound",false))}catch(e){return true}}
/* 棋鐘提示音：prev、cur 秒；fired＝這一方已經響過的門檻（Set）。跨過 60／30／10 秒＝timelow，到 0＝timeout，每個門檻只響一次；
   時間變多（下一盤、加秒）就把比現在少的門檻清掉，之後再跨過會再響 */
function axsClockCue(prev,cur,fired){if(prev==null||cur==null||!fired)return null;
  if(cur>prev){for(const t of[...fired])if(t<cur)fired.delete(t);return null}
  let hit=null;for(const t of[60,30,10,0])if(prev>t&&cur<=t&&!fired.has(t)){fired.add(t);hit=t}
  return hit==null?null:{kind:hit===0?"timeout":"timelow",t:hit}}
/* 頁名：頂欄標題去掉前面的圖示；沒有標題或只是 App 名就用網址對照（usePlace） */
function axsPageName(title,hash,place){let t=String(title||"").replace(/\s+/g," ").replace(/^[^\p{L}\p{N}]+/u,"").trim();
  const h=hash||"#/";if(h==="#/"||h==="#"||h==="")return t&&t!=="象棋千秋"?t:"首頁";
  if(!t||t==="象棋千秋"){try{t=place?place(h):""}catch(e){t=""}}return t||"象棋千秋"}
/* 載入提示的狀態機：S＝{since,said,label}；busy 現在有沒有在載入；label 是「載入」或「象棋引擎下載」這種動詞片語。
   超過 ms（預設 800）還在載入才念「…中…」，好了念「…完成」；很快就好的不念 */
function axsLoadStep(S,busy,now,label,ms){ms=ms==null?800:ms;
  if(busy){if(!S.since){S.since=now;S.said=false;S.label=label||"載入"}else if(label&&!S.said)S.label=label;
    if(!S.said&&now-S.since>=ms){S.said=true;return S.label+"中…"}return""}
  if(!S.since)return"";const said=S.said,lb=S.label||"載入";S.since=0;S.said=false;return said?lb+"完成":""}
/* 園子地點清單：E＝06-cpu PARK_INFO 那一朝（{_:[朝代,年代], table:[名字,介紹], …}）；照園子裡由近到遠排，附上在哪裡 */
function axsPlaces(E){const W=[["mate","你這一側","你的角色"],["table","正中間，下棋的桌子",null],["cup","桌上",null],["opp","桌子對面","對手"],["stool","桌子左右兩邊",null],
    ["bench","對手後面",null],["lantern","左右兩邊的立柱上",null],["tree1","園子裡",null],["tree2","園子裡",null],["bg","遠方的風景",null]],o=[];E=E||{};
  for(const[k,where,nm]of W){const n=nm||(E[k]&&E[k][0]);if(n)o.push({k,name:n,where})}return o}
/* 第 5 輪 P16.4 音效圖鑑：[種類, 名稱, 聲音長怎樣, 代表什麼]，每格 15 字內。聲音那格照上面 axsTone 的實際音色寫：
   幾個音（一聲／兩聲）、高低（≥800Hz 高、350～800 中、<300 低沉）、往上／往下（第二聲比第一聲高或低一成以上）、
   波形用字（sine＝清亮／嗶、triangle＝柔和、square＝刺耳／嗡嗡、sawtooth＝粗啞）；test-a11y-p16.js 逐條核對 */
const AXS_DEX=[["select","選子","清亮高音，短短一聲","選起一顆棋子"],["move","落子","柔和中音，短短一聲","棋子落下了"],["capture","吃子","柔和兩聲，由中往下沉","吃掉一顆棋子"],
  ["check","將軍","刺耳兩聲，往上揚","帥或將被攻擊"],["illegal","走不了","低沉嗡嗡兩聲","這裡不能走"],["turn","輪到你","清亮兩聲，往上揚","對方走完，輪到你"],
  ["opp","對方走完","清亮兩聲，往下落","對手剛走了一步"],["timelow","時間快到","很高的嗶嗶兩聲","剩1分、30秒、10秒時"],["timeout","超時","粗啞兩聲往下，尾音拉長","時間用完了"]];
function axsName(k){const d=AXS_DEX.find(x=>x[0]===k);return d?d[1]:String(k||"")}
/* 聲音設定旁的說明（40 字內）。寫成 function：直接打開設定頁時 route() 比這個檔早跑，const 還沒初始化會出錯 */
function axsNote(){return"以左右聲像提示棋子在第幾路，不同動作不同音色；可先試聽。"}
/* 聲音事件紀錄的一行：「吃子／第 3 路／偏右／已播放」；沒有格子（輪到你、時間）＝置中 */
function axsLogLine(e){e=e||{};const p=+e.pan||0,dir=Math.abs(p)<.05?"置中":p<0?"偏左":"偏右";return[axsName(e.kind),e.file?"第 "+e.file+" 路":"",dir,e.st||""].filter(Boolean).join("／")}
function axsHms(t){const d=new Date(+t||0),z=n=>String(n).padStart(2,"0");return z(d.getHours())+":"+z(d.getMinutes())+":"+z(d.getSeconds())}
/* 第 5 輪 P16.5 本頁地圖（只給螢幕報讀：換頁時第一次念、W 鍵也念）；方位照 art/docs/a11y-tour.md。沒有地圖的頁回 "" */
function axsPageMap(hash){const h=String(hash||"#/").split("?")[0];
  if(h==="#/"||h==="#"||h==="")return"本頁地圖：楚河渡口棋鎮。上方正中間河上是雲河星槎；左上左岸是對戰（茶肆），右上右岸是學習；左邊中段是今日推薦；正中間橋上的石桌是身邊同桌；最下面是快速對局；底部導覽列由左到右是首頁、線上、棋譜、設定。";
  if(h==="#/hub/battle")return"本頁地圖：你站在茶樓的天井。正中間的八仙桌是線上對戰（大廳）；左下方的桌子是挑戰電腦；左邊最下面放棋盒的桌子是同桌對弈；二樓左邊廂房是車輪戰，二樓中間說書台是千秋盃。";
  if(h==="#/lobby")return"本頁地圖：上面是大廳的圖，正中間是隨機配對，右上是名冊，左邊是 AI 對戰；圖下面由上到下是千秋盃、正在對戰的棋局、線上棋友名單。";
  if(h==="#/hub/learn")return"本頁地圖：你站在書院前院，越往上越深。下方左邊是象棋規則、右邊是新手訓練營；中段有一盞茶殘局、錯棋重練、主題訓練，左邊牆上是我的戰績；正中間講台是棋力測驗，右上是我的開局；最裡面是棋譜庫，再往上是猜著法。";
  if(h==="#/db")return"本頁地圖：棋譜庫是一間書房。左上是特級大師；右上是比賽對局，右邊中段是大師對局；下方正中間是繼續研究，右下是我的對局。";
  if(/^#\/(cpu|arena|pvp|journey\/play|redo\/play)(\/|$)/.test(h))return"本頁地圖：你坐在石桌前，棋盤在正中間，對手在對面。由上到下：對手的名牌和棋鐘、棋盤、你的名牌和棋鐘、狀態列、走過的著法；最下面一排是動作按鈕。按 B 到棋盤。";
  return""}
/* #AXS-PURE-END */
/* #SXM-PURE-BEGIN：第 6 輪 F3（評比 P24.1／P24.2／P24.4、ChatGPT 第 5 輪第 8 項）音量分類、靜音、提示音節流、長聽舒適的數字、音效圖鑑的音源與材質。
   不碰畫面、不碰聲音；test-sound-mix.js 直接執行。都寫成 function（不用 const）：直接打開設定頁時 route() 比這個檔早跑。
   接線（匯流排）在 01-board 的 SXM-BUS 段；文件 art/docs/sound.md 的數字照抄這裡，改了要一起改 */
/* 四類：[代號, 名稱, 預設 %]。bgm＝背景音樂與過場鼓聲；piece＝落子、吃子、將軍「鏘」、開局鼓鑼；cue＝聲音方位與動作提示音；voice＝語音報「吃」「將軍」 */
function sxmCats(){return[["bgm","背景音樂與鼓聲",80],["piece","棋子音效",100],["cue","提示音",80],["voice","語音報棋",100]]}
/* 舒適性：bgmMax 背景音樂 100% 時的播放器音量（原本固定 0.55）；cueMax 提示音每個音的峰值（原本 0.42）；attack 淡入秒；floor 淡出到的增益（-80 dB）；
   lp／lpQ 提示音低通；lim 提示音限幅器；maxHz 提示音基頻上限；ramp 拉滑桿換音量的時間常數（秒）；gap 同一種提示音最短間隔（毫秒），gaps 特例；burst／win＝一秒內最多幾個提示音 */
function sxmK(){return{bgmMax:.55,cueMax:.42,attack:.008,floor:.0001,lp:3800,lpQ:.7,lim:{threshold:-12,knee:6,ratio:12,attack:.003,release:.15},maxHz:1100,ramp:.015,gap:250,gaps:{illegal:600,check:1500},burst:6,win:1000}}
function sxmPct(x,d){if(x==null||x==="")return d;x=Math.round(+x);return isFinite(x)?Math.max(0,Math.min(100,x)):d}
/* store sndMix：{v:{bgm:80,…}, m:{bgm:false,…}, all:false}；壞掉、缺的照預設 */
function sxmNorm(mix){mix=mix&&typeof mix==="object"?mix:{};const v=mix.v&&typeof mix.v==="object"?mix.v:{},m=mix.m&&typeof mix.m==="object"?mix.m:{},o={v:{},m:{},all:mix.all===true};
  for(const[k,,d]of sxmCats()){o.v[k]=sxmPct(v[k],d);o.m[k]=m[k]===true}return o}
/* 百分比 → 增益：平方曲線（50%＝0.25≈-12 dB、80%＝0.64≈-3.9 dB），比直線接近耳朵聽到的大小；這一類靜音、全部靜音＝0；不認得的類別＝1（不受控） */
function sxmLevel(mix,cat){const M=sxmNorm(mix);if(M.all)return 0;if(!(cat in M.v))return 1;if(M.m[cat])return 0;const p=M.v[cat]/100;return Math.round(p*p*1000)/1000}
function sxmDb(g){return g>0?Math.round(20*Math.log10(g)*10)/10+" dB":"靜音"}
/* 拉滑桿：設定百分比；拉到大於 0 就順便解除這一類的靜音 */
function sxmSetVol(mix,cat,pct){const M=sxmNorm(mix);if(cat in M.v){M.v[cat]=sxmPct(pct,M.v[cat]);if(M.v[cat]>0)M.m[cat]=false}return M}
/* 靜音鍵：cat＝"all" 是全部靜音；on 不給＝切換 */
function sxmMute(mix,cat,on){const M=sxmNorm(mix);if(cat==="all")M.all=on==null?!M.all:!!on;else if(cat in M.m)M.m[cat]=on==null?!M.m[cat]:!!on;return M}
function sxmBgmVol(mix){return Math.round(sxmK().bgmMax*sxmLevel(mix,"bgm")*1000)/1000}
/* 提示音每個音實際的最大增益＝cueMax × 類別增益（axsTone 每個音的相對音量都 ≤ 1） */
function sxmCuePeak(mix){return Math.round(sxmK().cueMax*sxmLevel(mix,"cue")*1000)/1000}
/* 畫面上那一格的字：「80%」「靜音」「全部靜音中」 */
function sxmTxt(mix,cat){const M=sxmNorm(mix);return M.all?"全部靜音中":M.m[cat]?"靜音":M.v[cat]+"%"}
/* 節流：S＝{last:{種類:毫秒}, win:[最近一秒播過的時間]}。同一種在間隔內只響一次（預設 250ms；走不了 600ms、將軍 1500ms），
   所有提示音加起來一秒最多 6 個；回傳 true＝可以響（同時記下來）。時間倒退（換了時鐘）當作沒響過 */
function sxmGapOf(kind){const K=sxmK();return Object.prototype.hasOwnProperty.call(K.gaps,kind)?K.gaps[kind]:K.gap}
function sxmThrottle(S,kind,now,gap){if(!S)return true;const K=sxmK();if(!S.last||typeof S.last!=="object")S.last={};S.win=(Array.isArray(S.win)?S.win:[]).filter(t=>now>=t&&now-t<K.win);
  gap=gap==null?sxmGapOf(kind):gap;const t=S.last[kind];if(t!=null&&now>=t&&now-t<gap)return false;if(S.win.length>=K.burst)return false;
  S.last[kind]=now;S.win.push(now);return true}
/* 淡入淡出：一個音的包絡 [[秒, 增益]…]：從 floor 開始、attack 秒線性升到 v、指數降回 floor（第 d 秒）。11c axsPlay 照這個排 */
function sxmEnv(v,d){const K=sxmK();return[[0,K.floor],[K.attack,v],[Math.max(d,Math.round((K.attack+.01)*1e6)/1e6),K.floor]]}
/* 音效圖鑑的「音源」：照 axsTone 實際的波形與頻率產生（不手寫，改了音色這裡跟著變） */
function sxmWave(w){return{sine:"正弦波",triangle:"三角波",square:"方波",sawtooth:"鋸齒波"}[w]||w}
function sxmSrc(k){const T=typeof axsTone==="function"?axsTone(k):null;if(!T)return"";const f=T.n.map(x=>x[0]);
  return"合成"+sxmWave(T.w)+" "+(f.every(x=>x===f[0])?f[0]+"Hz"+(f.length>1?" ×"+f.length:""):f.join("→")+"Hz")}
/* 聽感比喻（主觀，給沒看過波形的人想像；提示音都是程式合成，不是實物錄音） */
function sxmFeel(k){return{select:"像輕敲小磬",move:"像輕點木魚",capture:"像兩下悶鼓",check:"像急促的銅鈴",illegal:"像低沉的嗡嗡聲",turn:"像門鈴叮咚往上",opp:"像門鈴叮咚往下",timelow:"像電子錶嗶嗶",timeout:"像粗啞的號角"}[k]||""}
/* 左右聲像對第幾路：[[路, 聲像]…]，畫面最左（九路）到最右（一路），紅方視角不翻轉 */
function sxmPanRow(){const o=[];for(let c=0;c<9;c++)o.push([axsFile(81+c,false),axsPan(81+c,false)]);return o}
/* 棋子落子的材質（🔔 棋子聲 的選單）：即時合成兩種＋預先合成的音檔；全部是程式合成的仿材質聲，不是實物錄音（art/docs/credits.md 第七項） */
function sxmPieceMats(){const L=[["實木（即時合成）","木子 380Hz 共鳴、木棋盤 180／290Hz 低頻咚聲；吃子降到 300Hz、咚聲加重"],["輕敲（即時合成）","三角波 420Hz 往下滑＋1600Hz 碰撞雜音；吃子 260Hz＋180Hz 兩下"]];
  let n=[];try{if(typeof SFX_SET!=="undefined")n=SFX_SET.map(x=>x[1])}catch(e){}if(n.length)L.push(["預先合成的音檔 "+n.length+" 種",n.join("、")+"（走子、吃子、變化各一檔）"]);return L}
/* 音效圖鑑下半部：聲像對路數、棋子材質、其他類的音源 */
function sxmDexMore(){const Z="一二三四五六七八九",P=sxmPanRow().map(([f,p])=>Z[f-1]+"路 "+(p>0?"+":"")+p).join("・"),S='class="muted" style="margin:0 0 8px;line-height:1.7"';
  return`<div class="sec-t" style="margin-top:14px">聲像對第幾路</div><p ${S}>聲像（-1 最左、+1 最右）＝（畫面第幾欄 − 4）÷ 4 × 0.8，每一路差 0.2，最邊邊只到 ±0.8，戴單耳也聽得到：${P}。</p>`
    +`<div class="sec-t" style="margin-top:14px">棋子落子的材質</div><p ${S}>落子、吃子在 設定 → 聲音「棋子聲」選，全部是程式合成的仿材質聲，不是實物錄音：</p><ul style="margin:0 0 8px;padding-left:1.3em;line-height:1.7">${sxmPieceMats().map(([n,d])=>`<li><b>${n}</b>　<span class="muted">${d}</span></li>`).join("")}</ul>`
    +`<div class="sec-t" style="margin-top:14px">其他聲音</div><ul style="margin:0;padding-left:1.3em;line-height:1.7"><li><b>將軍「鏘」</b>　<span class="muted">合成方波 880→1320Hz，過 3800Hz 低通，1.5 秒內只響一次</span></li><li><b>語音報棋</b>　<span class="muted">「吃！」「將軍！」，Windows 內建語音合成錄成的音檔，男聲、女聲</span></li><li><b>背景音樂</b>　<span class="muted">每個朝代的古風曲，AI（Lyria）生成，不是真人演奏</span></li></ul>`}
/* #SXM-PURE-END */
/* #AXS-CORE-BEGIN：要用到 store、AC（01-board 的 AudioContext）、withAudio，測試用假的換進去 */
var AXS_S;
function axsSt(){return AXS_S||(AXS_S={clk:{},fired:{},load:{since:0,said:false,label:""},tasks:new Map(),tn:0,pg:0,log:[],maps:new Set()})}
/* 第 5 輪：聲音事件紀錄（開發者模式看得到，最近 20 筆）。file＝第幾路（0＝沒有格子，置中） */
function axsLogAdd(kind,file,pan,st){const S=axsSt();S.log.push({t:Date.now(),kind,file:file||0,pan:+pan||0,st});while(S.log.length>20)S.log.shift()}
function axsPref(){try{const v=store.get("axSnd",null);return v===true||v===false?v:null}catch(e){return null}}
function axsOn(){let ax=false;try{ax=typeof axmOn==="function"&&axmOn()}catch(e){}return axsSpatialOn(axsPref(),ax)}
function axsMutedNow(){try{return axsMuted((k,d)=>store.get(k,d))}catch(e){return true}}
/* 真的發聲：每個音一顆振盪器＋包絡，全部接到總音量，再接立體聲方位（瀏覽器沒有 StereoPanner 就置中）。
   第 6 輪 F3：方位後面接 01-board 的「提示音」匯流排（音量滑桿＋3800Hz 低通＋限幅器）；峰值 sxmK().cueMax、包絡 sxmEnv（8ms 淡入、指數淡出到 -80 dB）。沒載入 sxm（舊測試）就照原本直接接喇叭 */
function axsPlay(T,pan,delay){if(typeof AC==="undefined"||!AC||!T)return null;const t0=AC.currentTime+.02+(delay||0),dst=typeof sxmDst==="function"?sxmDst("cue"):AC.destination;let out=dst,p=null;
  if(pan&&AC.createStereoPanner){p=AC.createStereoPanner();p.pan.value=pan;p.connect(dst);out=p}
  const g0=AC.createGain();g0.gain.value=typeof sxmK==="function"?sxmK().cueMax:.42;g0.connect(out);
  for(const[f,at,d,v]of T.n){const o=AC.createOscillator(),g=AC.createGain(),E=typeof sxmEnv==="function"?sxmEnv(v,d):[[0,.0001],[.008,v],[d,.0001]];o.type=T.w;o.frequency.setValueAtTime(f,t0+at);
    g.gain.setValueAtTime(E[0][1],t0+at+E[0][0]);g.gain.linearRampToValueAtTime(E[1][1],t0+at+E[1][0]);g.gain.exponentialRampToValueAtTime(E[2][1],t0+at+E[2][0]);
    o.connect(g);g.connect(g0);o.start(t0+at);o.stop(t0+at+d+.03)}
  return p}
/* 播一種提示音。sq＞＝0 就照那一格放左右；回傳 true＝有接手（開著、沒靜音） */
function axsCue(kind,sq,flip,delay){const T=axsTone(kind);if(!T)return false;const has=sq!=null&&sq>=0&&sq<=89,pan=has?axsPan(sq,flip):0,file=has?axsFile(sq,flip):0;let st="已播放";
  if(!axsOn())st="沒播（提示音沒開）";else if(axsMutedNow())st="沒播（走子、吃子音效都關）";else{try{if(typeof document!=="undefined"&&document.hidden)st="沒播（App 在背景）"}catch(e){}}
  if(st==="已播放")st=axsGate(kind);
  axsLogAdd(kind,file,pan,st);if(st!=="已播放")return false;
  try{withAudio(()=>axsPlay(T,pan,delay))}catch(e){}return true}
/* 第 6 輪 F3：提示音音量 0／靜音／全部靜音、或太密（sxmThrottle：同一種 250ms 內只響一次，走不了 600ms、將軍 1500ms，一秒最多 6 個）就不播。
   沒載入 sxm（舊測試只跑 AXS 兩段）＝照播 */
function axsGate(kind){try{if(typeof sxmGain==="function"&&!sxmGain("cue"))return"沒播（提示音靜音）";
    if(typeof sxmThrottle==="function"&&typeof sxmThr==="function"&&!sxmThrottle(sxmThr(),kind,sxmNow()))return"沒播（太密，略過）"}catch(e){}return"已播放"}
/* 第 5 輪 音效圖鑑的 ▶ 試聽：使用者自己按的，所以「提示音沒開」也播；「走子音效、吃子音效」都關（App 內的靜音）就不播、說原因。sq＝畫面格號（左中右試聽用），不翻轉 */
function axsPreview(kind,sq){try{unlockAudio()}catch(e){}const T=axsTone(kind);if(!T)return false;const has=sq!=null&&sq>=0&&sq<=89,pan=has?axsPan(sq,false):0,file=has?axsFile(sq,false):0;
  if(axsMutedNow()){axsLogAdd(kind,file,pan,"沒播（走子、吃子音效都關）");try{toast("走子音效、吃子音效都關著，提示音不會響（設定 → 聲音）")}catch(e){}try{axSay("走子音效、吃子音效都關著，提示音不會響")}catch(e){}return false}
  if(typeof sxmGain==="function"&&!sxmGain("cue")){axsLogAdd(kind,file,pan,"沒播（提示音靜音）");try{toast("提示音靜音中（設定 → 聲音 →「提示音」）")}catch(e){}try{axSay("提示音靜音中")}catch(e){}return false}   /* 第 6 輪 F3 */
  axsLogAdd(kind,file,pan,"試聽");try{withAudio(()=>axsPlay(T,pan,0))}catch(e){}return true}
/* 01-board 走完一步叫這個（取代 moveSound）：自己走＝落子／吃子；對方走＝「對方走完」（吃了再加吃子聲）；將軍在被將的那一格響；輪到你＝置中上行兩聲。
   o：{to, flip, cap, side 走的那方, me 玩家那方（看棋譜＝null）, ck 被將的格子（沒有＝-1）, board}。回傳 false＝沒開，照原本的 moveSound */
function axsMove(o){if(!o||!axsOn()||axsMutedNow()||(typeof sxmGain==="function"&&!sxmGain("cue")))return false;   /* 第 6 輪 F3：提示音靜音＝交回一般落子聲 */
  const mine=!o.me||o.side===o.me;let d=0;
  if(mine)axsCue(o.cap?"capture":"move",o.to,o.flip,0);
  else{axsCue("opp",o.to,o.flip,0);if(o.cap){d=.16;axsCue("capture",o.to,o.flip,d)}}
  let mate=false;if(o.ck>=0){d+=.2;axsCue("check",o.ck,o.flip,d);try{mate=!!(o.board&&typeof XQCore!=="undefined"&&XQCore.legal&&XQCore.legal(o.board,o.board[o.ck]==="K"?"r":"b").length===0)}catch(e){}}
  if(o.me&&!mine&&!mate)axsCue("turn",-1,o.flip,d+.34);
  return true}
/* 點了不能走的地方：已選子、點的不是可走的點、不是自己另一顆子、也不是同一顆（取消） */
function axsTapCue(sq,b,o,flip){try{o=o||{};if(!(o.sel>=0)||sq<0||sq===o.sel||!b||!b[o.sel])return false;if((o.targets||[]).includes(sq))return false;
    if(b[sq]&&typeof sideOf==="function"&&sideOf(b[sq])===sideOf(b[o.sel]))return false;return axsCue("illegal",sq,flip)}catch(e){return false}}
/* 棋鐘：pBot＝你（60／30／10 秒、超時），pTop＝對手（只響超時） */
function axsClockTick(id,sec){const S=axsSt(),f=S.fired[id]||(S.fired[id]=new Set()),c=axsClockCue(S.clk[id],sec,f);S.clk[id]=sec;
  if(!c||(id!=="pBot"&&c.kind!=="timeout"))return null;axsCue(c.kind,-1,false);return c}
/* 別的模組可以報長時間的工作：axsBusy("象棋引擎下載", promise) */
function axsBusy(label,p){if(!p||typeof p.then!=="function")return p;const S=axsSt(),id=++S.tn;S.tasks.set(id,label||"載入");
  const done=()=>{S.tasks.delete(id)};p.then(done,done);return p}
/* #AXS-CORE-END */
/* ---------- 以下接到畫面 ---------- */
/* 設定 → 系統 → ♿ 無障礙 裡的一列（11b axmSetRows 呼叫） */
/* 第 5 輪：說明改成 40 字內（axsNote），細節（九種聲音、音量、靜音鍵）移到「🎼 音效圖鑑」；開發者模式多一顆「🔍 聲音事件紀錄」。按鈕至少 44px 高 */
function axsSetRow(){const on=axsOn(),pf=axsPref(),B='style="width:auto;margin:0;padding:6px 12px;font-size:13.5px;min-height:44px"';let dev=false;try{dev=typeof DEVMODE==="function"&&!!DEVMODE()}catch(e){}
  return`<label class="row" style="justify-content:space-between;padding:8px 2px;gap:10px"><span style="min-width:0"><b>🎧 聲音方位與動作提示音</b><br><span class="muted" style="font-size:12.5px">${axsNote()}${pf==null?"（現在跟著螢幕報讀模式）":""}</span></span><input type="checkbox" class="sw" id="axsSw"${on?" checked":""} aria-label="聲音方位與動作提示音"></label>`
    +`<div class="row" style="gap:8px;flex-wrap:wrap;padding:2px 2px 8px"><button type="button" class="btn ghost" id="axsTry" ${B}>🔈 試聽左右</button><button type="button" class="btn ghost axs-dx" ${B}>🎼 音效圖鑑</button><button type="button" class="btn ghost" data-xqdoc="tour" ${B}>🧭 空間導覽</button>${dev?`<button type="button" class="btn ghost axs-lg" ${B}>🔍 聲音事件紀錄</button>`:""}</div>`}
/* 第 5 輪 P16.4 音效圖鑑：九種提示音一列一個（名稱、代表什麼、聲音長怎樣、▶ 試聽），下面左／中／右試聽 */
function axsDexSheet(){const P='style="width:auto;margin:0;padding:6px 14px;min-height:44px;min-width:44px"';
  sheet("🎼 音效圖鑑",b=>{b.innerHTML=`<p class="muted" style="margin:0 0 8px;line-height:1.7">九種動作各有一個聲音，按 ▶ 試聽（要你按下才會播放）。音量在 設定 → 聲音「提示音」滑桿調，也能單獨靜音或「🔇 全部靜音」；iPhone 靜音鍵打開時仍會響。同一種提示音太密會略過（250 毫秒內只響一次）。</p>`
    +`<ul style="list-style:none;margin:0;padding:0;display:grid;gap:6px">${AXS_DEX.map(([k,n,s,m])=>`<li class="card row" style="margin:0;padding:8px 10px;gap:10px;justify-content:space-between"><span style="min-width:0;line-height:1.6"><b>${n}</b>　${m}<br><span class="muted" style="font-size:13px">${s}</span>${typeof sxmSrc==="function"?`<br><span class="muted" style="font-size:12.5px">${sxmSrc(k)}・${sxmFeel(k)}</span>`:""}</span><button type="button" class="btn ghost" data-axsdx="${k}" aria-label="試聽：${n}" ${P}>▶</button></li>`).join("")}</ul>`
    +`<div class="sec-t" style="margin-top:14px">左右方位</div><p class="muted" style="margin:0 0 8px;line-height:1.7">聲音只分左右，用左右聲像提示棋子在第幾路，不是 3D 環繞：一路在畫面最右、九路在最左。翻轉棋盤（你執黑）時，同一顆棋子的聲音左右對調。戴耳機最清楚。</p>`
    +`<div class="row" style="gap:8px;flex-wrap:wrap"><button type="button" class="btn ghost" data-axspn="81" aria-label="試聽左邊：九路" ${P}>◀ 左・九路</button><button type="button" class="btn ghost" data-axspn="85" aria-label="試聽中間：五路" ${P}>● 中・五路</button><button type="button" class="btn ghost" data-axspn="89" aria-label="試聽右邊：一路" ${P}>右・一路 ▶</button></div>`
    +(typeof sxmDexMore==="function"?sxmDexMore():"")})}
/* 第 5 輪 開發者模式的「聲音事件紀錄」：最近 20 筆，新的在上（給評審截圖驗證；一般玩家看不到按鈕） */
function axsLogSheet(){const L=axsSt().log.slice().reverse();
  sheet("🔍 聲音事件紀錄（開發者）",b=>{b.innerHTML=`<p class="muted" style="margin:0 0 8px;line-height:1.7">最近 20 個提示音事件，新的在上：哪一種、第幾路、偏左偏右、有沒有播出來。</p>`
    +(L.length?`<ol style="margin:0;padding-left:1.4em;line-height:1.9">${L.map(e=>`<li><span class="muted" style="font-variant-numeric:tabular-nums">${axsHms(e.t)}</span>　${esc(axsLogLine(e))}</li>`).join("")}</ol>`:'<div class="card muted" style="line-height:1.7">還沒有紀錄。打開「🎧 聲音方位與動作提示音」下一盤棋，或在音效圖鑑按 ▶ 試聽。</div>')})}
/* 第 5 輪 P16.4 文字備援：將軍、超時這種要馬上知道的，念在 assertive 的播報區（插話）；其他照 01-board axSay（polite） */
function axsAlert(t){if(!t||!document.body)return;let r=document.getElementById("axAlert");
  if(!r){r=document.createElement("div");r.id="axAlert";r.className="ax-sr";r.setAttribute("role","alert");r.setAttribute("aria-live","assertive");r.setAttribute("aria-atomic","true");document.body.append(r)}
  r.textContent="";setTimeout(()=>{r.textContent=t},50)}
/* 試聽：左邊一路走子、正中間選子、右邊吃子、輪到你 */
function axsDemo(){try{unlockAudio()}catch(e){}if(axsMutedNow()){try{toast("走子音效、吃子音效都關著，提示音不會響（設定 → 聲音）")}catch(e){}return}
  const on=axsOn();if(!on){try{toast("先打開「聲音方位與動作提示音」")}catch(e){}return}
  axsCue("move",81,false,0);axsCue("select",85,false,.45);axsCue("capture",89,false,.9);axsCue("turn",-1,false,1.45);
  try{axSay("左邊九路落子、中間選子、右邊一路吃子、輪到你")}catch(e){}}
document.addEventListener("change",e=>{const t=e.target;if(!t||t.id!=="axsSw")return;store.set("axSnd",!!t.checked);
  try{toast(t.checked?"🎧 聲音方位與提示音：開":"🎧 聲音方位與提示音：關")}catch(x){}if(t.checked)setTimeout(axsDemo,50)});
document.addEventListener("click",e=>{const b=e.target&&e.target.closest&&e.target.closest("#axsTry,.axs-pk,[data-axspk],.axs-dx,.axs-lg,[data-axsdx],[data-axspn]");if(!b)return;
  if(b.id==="axsTry"){axsDemo();return}if(b.classList.contains("axs-pk")){axsParkSheet();return}
  if(b.classList.contains("axs-dx")){axsDexSheet();return}if(b.classList.contains("axs-lg")){axsLogSheet();return}
  if(b.dataset.axsdx){axsPreview(b.dataset.axsdx,85);return}if(b.dataset.axspn){axsPreview("move",+b.dataset.axspn);return}
  const k=b.dataset.axspk;try{closeSheet()}catch(x){}setTimeout(()=>{try{parkInfo(k)}catch(x){}},150)});
/* 園子地點清單（螢幕報讀模式不畫 3D 園子；06-cpu parkInfo 就是在園子裡點東西時跳的那張卡） */
function axsParkSheet(){let era="classic",E={};try{era=store.get("era","classic");E=(typeof PARK_INFO!=="undefined"&&(PARK_INFO[era]||PARK_INFO.classic))||{}}catch(e){}
  const L=axsPlaces(E),en=E._?E._[0]:"";
  sheet("🌳 園子地點清單",b=>{b.innerHTML=`<p class="muted" style="margin:0 0 8px;line-height:1.7">${en?esc(en)+"的園子。":""}3D 園子在螢幕報讀模式不畫出來，園子裡能點的東西都列在這裡，照由近到遠排；點一項＝在園子裡點那樣東西。棋盤就在「正中間的桌子」上。</p>`
    +`<div style="display:grid;gap:6px">${L.map(x=>`<button type="button" class="btn ghost" data-axspk="${esc(x.k)}" style="margin:0;text-align:left;justify-content:flex-start"><b>${esc(x.name)}</b>　<span class="muted" style="font-size:13px">${esc(x.where)}</span></button>`).join("")}</div>`})}
/* 遊戲頁（會有 3D 園子的那幾頁）在「讀出盤面」前面補一顆只給螢幕報讀、鍵盤用的「園子地點清單」 */
function axsParkBtn(){if(!axmOn())return;const h=location.hash||"";if(!/^#\/(cpu|arena|pvp|journey\/play|redo\/play)(\/|$)/.test(h))return;
  let pk=true;try{pk=store.get("park3d",typeof pkDef3d==="function"?pkDef3d():true)}catch(e){}if(!pk)return;
  const rb=document.querySelector("#view .ax-rb");if(!rb||(rb.previousElementSibling&&rb.previousElementSibling.classList.contains("axs-pk")))return;
  const b=document.createElement("button");b.type="button";b.className="ax-sr axs-pk";b.textContent="🌳 園子地點清單";rb.before(b)}
/* ? 鍵的說明卡（11b 的 ? 鍵叫這個）：鍵盤說明＋空間導覽＋（遊戲頁）園子地點清單 */
function axsHelp(){const g=/^#\/(cpu|arena|pvp|journey\/play|redo\/play)(\/|$)/.test(location.hash||"");
  sheet("♿ 鍵盤與螢幕報讀說明",b=>{b.innerHTML=`<ul style="margin:0 0 10px;padding-left:1.3em;line-height:1.8"><li>B 跳到棋盤，方向鍵移動，Enter 或空白鍵選子，再按一次落子</li><li>R 讀出整個盤面，S 讀狀態和棋鐘，M 讀上一步</li><li>W 我在哪裡：目前頁面、焦點、輪到誰、選了哪顆、上一步，再加本頁地圖</li><li>G 打開空間導覽（首頁、對戰、學習、棋譜庫、園子在哪裡、怎麼走過去）</li><li>Tab 移到其他按鈕，Esc 關掉卡片</li></ul>`
    +`<div style="display:grid;gap:6px"><button type="button" class="btn" data-xqdoc="tour" style="margin:0">🧭 空間導覽</button>${g?'<button type="button" class="btn ghost axs-pk" style="margin:0">🌳 園子地點清單</button>':""}</div>`})}
document.addEventListener("keydown",e=>{if(!axmOn()||e.ctrlKey||e.metaKey||e.altKey||e.defaultPrevented)return;const t=e.target;if(t&&(t.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)))return;
  if(e.key==="g"||e.key==="G"){e.preventDefault();try{xqDocSheet("tour")}catch(x){}}});
/* P21.3 換頁念頁名（螢幕報讀模式）：等新頁畫好（0.5 秒）讀頂欄標題 */
addEventListener("hashchange",()=>{if(!axmOn())return;const S=axsSt(),n=++S.pg;setTimeout(()=>{if(n!==S.pg||!axmOn())return;let nm="";
  try{const ti=document.getElementById("title");nm=axsPageName(ti?ti.textContent:"",location.hash,typeof usePlace==="function"?usePlace:null)}catch(e){}
  const mp=axsPageMap(location.hash),one=mp&&!S.maps.has(mp);if(one)S.maps.add(mp);   /* 第 5 輪 P16.5：主要頁面第一次進來多念「本頁地圖」，之後按 W 再聽 */
  if(nm)try{axSay("頁面："+nm+(one?"。"+mp:""))}catch(e){}},500)});
/* P21.3 長時間載入：象棋引擎（XQEngine 在別的 script，晚一點才有就晚一點包）、等圖的水墨畫面（#preov）、畫面上短短的「載入中…／讀取中…／下載中…」 */
function axsWrapEngine(){const X=window.XQEngine;if(!X||X._axs)return;X._axs=1;const o={load:X.load,prefetch:X.prefetch,search:X.search};
  if(o.prefetch)X.prefetch=function(){const p=o.prefetch.apply(this,arguments);return X.ready?p:axsBusy("象棋引擎下載",p)};
  if(o.load)X.load=function(){const p=o.load.apply(this,arguments);return X.ready?p:axsBusy("象棋引擎載入",p)};
  if(o.search&&o.load)X.search=function(){if(!X.ready)try{axsBusy("象棋引擎載入",o.load.call(X).catch(()=>{}))}catch(e){}return o.search.apply(this,arguments)}}
const AXS_XP="//text()[(contains(.,'載入中') or contains(.,'讀取中') or contains(.,'下載中')) and string-length(normalize-space(.))<=30 and not(ancestor::script) and not(ancestor::style) and not(ancestor::*[@id='axLive']) and not(ancestor::*[@aria-hidden='true'])]";
function axsDomBusy(){if(document.getElementById("preov"))return"載入";try{const r=document.evaluate(AXS_XP,document.body,null,7,null);
    for(let i=0;i<Math.min(r.snapshotLength,12);i++){const n=r.snapshotItem(i),el=n.parentElement;if(el&&el.getClientRects().length)return/下載中/.test(n.nodeValue)?"下載":"載入"}}catch(e){}return""}
setInterval(()=>{try{axsWrapEngine()}catch(e){}if(document.hidden)return;
  if(axsOn())for(const id of["pBot","pTop"]){const c=document.querySelector("#"+id+" .clk");if(!c){const S=axsSt();delete S.clk[id];continue}
    let s=null;try{s=axmClockSec(c.textContent)}catch(e){}axsClockTick(id,s)}
  if(!axmOn())return;try{axsParkBtn()}catch(e){}},1000);
setInterval(()=>{if(document.hidden||!axmOn())return;const S=axsSt(),tk=[...S.tasks.values()],dm=tk.length?"":axsDomBusy(),busy=!!(tk.length||dm);
  const say=axsLoadStep(S.load,busy,Date.now(),tk[0]||dm||"載入");if(say)try{axSay(say)}catch(e){}},400);
/* ---------- 第 6 輪 F3：設定 → 聲音 的音量分類（四條滑桿、各自靜音、全部靜音）；05-settings 畫完聲音頁叫 sxmMount(v) ----------
   放進聲音頁三張卡片：🔔 棋子聲（#snd）放「全部靜音」＋棋子音效＋提示音＋圖鑑、文件按鈕；🎵 語音報棋（#snd2）放語音；🕯 氛圍（#snd3）放背景音樂與鼓聲。
   設定房間三個入口（07s2 SM_EP 整段搬 #snd／#snd2／#snd3）打開的面板各自看得到自己那類。樣式用 JS 注入（#sxmCss），不動 m.css */
function sxmCss(){if(document.getElementById("sxmCss"))return;const s=document.createElement("style");s.id="sxmCss";
  s.textContent=".sxm-top{padding:4px 0 10px;border-bottom:1px solid var(--line);margin-bottom:2px}.sxm-bot{border-top:1px solid var(--line);padding-top:4px}"
    +".sxm-hd{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:4px 0}.btn.sxm-all{width:auto;margin:0;min-height:44px;padding:6px 12px;font-size:13.5px;white-space:nowrap;flex:none}"
    +".sxm-r{padding:6px 0}.sxm-h{display:flex;justify-content:space-between;align-items:baseline;gap:8px}.sxm-n{flex:none;font-variant-numeric:tabular-nums;font-size:13px;opacity:.75;white-space:nowrap}"
    +".sxm-c{display:flex;align-items:center;gap:8px}.sxm-s{flex:1;min-width:0;height:44px;margin:0;accent-color:var(--accent,#B3261E)}.sxm-mu .sxm-s{opacity:.45}"
    +".sxm-m{flex:none;width:44px;height:44px;margin:0;padding:0;border-radius:12px;border:1.5px solid var(--line);background:var(--card);color:inherit;font-size:18px;line-height:1}"
    +".sxm-m[aria-pressed=true]{border-color:var(--accent,#B3261E);background:color-mix(in srgb,var(--accent,#B3261E) 14%,var(--card))}.sxm-d{font-size:12.5px;line-height:1.5}"
    +".sxm-lk{display:flex;gap:8px;flex-wrap:wrap;padding:8px 0 4px}.sxm-lk .btn{width:auto;margin:0;min-height:44px;padding:6px 12px;font-size:13.5px;white-space:nowrap}";document.head.append(s)}
/* 一條滑桿：名稱、目前多少、0～100（每格 5）、旁邊 🔊／🔇 靜音鍵（44px），下面一行小字說包含哪些聲音 */
function sxmRow(cat){const c=sxmCats().find(x=>x[0]===cat);if(!c)return"";const M=sxmNorm(sxmMix()),t=sxmTxt(M,cat),ic={bgm:"🎵",piece:"♟",cue:"🎧",voice:"🗣"}[cat],
    d={bgm:"朝代古風曲、過場鼓聲",piece:"落子、吃子、將軍「鏘」、開局鼓鑼",cue:"聲音方位與動作提示音（🎧 開了才有）",voice:"「吃！」「將軍！」"}[cat];
  return`<div class="sxm-r${M.m[cat]||M.all?" sxm-mu":""}" data-sxm="${cat}"><div class="sxm-h"><label for="sxmS-${cat}"><b>${ic} ${c[1]}</b></label><span class="sxm-n">${t}</span></div>`
    +`<div class="sxm-c"><input type="range" id="sxmS-${cat}" class="sxm-s" min="0" max="100" step="5" value="${M.v[cat]}" aria-valuetext="${t}"><button type="button" class="sxm-m" aria-pressed="${M.m[cat]}" aria-label="${c[1]}靜音">${M.m[cat]?"🔇":"🔊"}</button></div>`
    +`<div class="sxm-d muted">${d}</div></div>`}
function sxmAllBtn(){const M=sxmNorm(sxmMix());return`<button type="button" class="btn ghost sxm-all" aria-pressed="${M.all}">${M.all?"🔊 恢復全部聲音":"🔇 全部靜音"}</button>`}
function sxmMount(v){try{if(!v||!v.querySelector)return;sxmCss();
  const blk=(cls,html)=>{const d=document.createElement("div");d.className="sxm-x "+cls;d.innerHTML=html;return d};
  const clr=c=>{c.querySelectorAll(":scope>.sxm-x").forEach(x=>x.remove());return c};
  {const c=v.querySelector("#snd");if(c){clr(c).prepend(blk("sxm-top",`<div class="sxm-hd"><b>音量</b>${sxmAllBtn()}</div>`+sxmRow("piece")+sxmRow("cue")));
    c.append(blk("sxm-bot",`<div class="sxm-lk"><button type="button" class="btn ghost axs-dx">🎼 音效圖鑑</button><button type="button" class="btn ghost" data-xqdoc="sound">🔊 音效設計</button></div>`))}}
  {const c=v.querySelector("#snd2");if(c)clr(c).append(blk("sxm-bot",sxmRow("voice")))}
  {const c=v.querySelector("#snd3");if(c){const b=blk("sxm-bot",sxmRow("bgm")),l=c.querySelector('[data-t="bgm"]'),r=l&&l.closest("label");clr(c);if(r&&r.parentNode===c)r.after(b);else c.append(b)}}}catch(e){}}
/* 畫面上所有滑桿、靜音鍵跟著存檔更新（同一頁、設定房間面板都可能開著） */
function sxmSync(){const M=sxmNorm(sxmMix());
  document.querySelectorAll(".sxm-r").forEach(r=>{const c=r.dataset.sxm;if(!(c in M.v))return;const t=sxmTxt(M,c),s=r.querySelector(".sxm-s"),b=r.querySelector(".sxm-m"),n=r.querySelector(".sxm-n");
    if(s){if(document.activeElement!==s)s.value=M.v[c];s.setAttribute("aria-valuetext",t)}if(n)n.textContent=t;if(b){b.setAttribute("aria-pressed",String(M.m[c]));b.textContent=M.m[c]?"🔇":"🔊"}r.classList.toggle("sxm-mu",M.m[c]||M.all)});
  document.querySelectorAll(".sxm-all").forEach(b=>{b.setAttribute("aria-pressed",String(M.all));b.textContent=M.all?"🔊 恢復全部聲音":"🔇 全部靜音"})}
/* 放開滑桿、解除靜音時試聽那一類 */
function sxmTry(cat){try{unlockAudio()}catch(e){}if(sxmAllOff()||!sxmGain(cat))return;
  if(cat==="piece"){withAudio(()=>moveSound0(false));return}
  if(cat==="cue"){axsPreview("move",85);return}
  if(cat==="voice"){if(store.get("voiceCall",true))sayCall("將軍");else try{toast("語音報子關著（上面選男聲或女聲才會念）")}catch(e){}return}
  if(cat==="bgm"&&!store.get("bgm",true))try{toast("背景音樂開關關著，打開才會播")}catch(e){}}
document.addEventListener("input",e=>{const s=e.target;if(!s||!s.classList||!s.classList.contains("sxm-s"))return;const r=s.closest(".sxm-r");if(!r)return;
  store.set("sndMix",sxmSetVol(sxmMix(),r.dataset.sxm,s.value));sxmApply();sxmSync()});
document.addEventListener("change",e=>{const s=e.target;if(!s||!s.classList||!s.classList.contains("sxm-s"))return;const r=s.closest(".sxm-r");if(r)sxmTry(r.dataset.sxm)});
document.addEventListener("click",e=>{const b=e.target&&e.target.closest&&e.target.closest(".sxm-m,.sxm-all");if(!b)return;
  const all=b.classList.contains("sxm-all"),r=b.closest(".sxm-r"),cat=all?"all":r&&r.dataset.sxm;if(!cat)return;
  const M=sxmMute(sxmMix(),cat);store.set("sndMix",M);try{unlockAudio()}catch(x){}sxmApply();sxmSync();try{vibrate(5)}catch(x){}
  const on=all?M.all:M.m[cat],t=(all?"全部聲音":(sxmCats().find(c=>c[0]===cat)||[])[1])+(on?"：靜音":"：恢復");try{toast((on?"🔇 ":"🔊 ")+t)}catch(x){}try{axSay(t)}catch(x){}
  if(!on&&!all)sxmTry(cat)});
