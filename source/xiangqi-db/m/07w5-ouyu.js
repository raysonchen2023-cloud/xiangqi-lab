/* ================= 🧭 偶遇求助角色（開發者 11/9 選 Gemini 57 號四案；設計、台詞、題目驗證 story/偶遇求助角色四案_設計_1109.md，史學顧問 11/10 核過）=================
   渡口（包一層 portWind）、驛站（包一層 yzInn）偶爾站出一位需要幫忙的路人（3D，載不起來改成圖下面一張小卡），點他聽他說，按「好，我幫你」進解題頁 #/ouyu/<誰>/<題號>：
     ds 代書先生（明清、白天、沒下雨）＝照家書棋譜走 3～5 著（紅黑都由玩家動），走完棋形有名字，先生讀出意思；
     hp 節氣商販（唐～清、那一頁真的在下雨／雪：07w7 sw7WxFor）＝只動紅仕相、不吃子，n 步內讓黑方任何子都吃不到花擔那一格（花擔當紅子算）；
     mj 迷糊木匠（明清、17～22 點）＝殘局被風倒退 1～2 步，紅黑都能照走法動（不分先後、不吃子、不能將帥對臉），走回右下角縮圖的樣子；
     gg 老更夫（宋～清＋雲河驛站、19～1 點）＝古譜和局最後 2～3 個紅方著法，黑方照譜應，走到和局終局宣布和棋；
     zf 張三丰（傳說人物，元明，上一盤被電腦將死後）＝開局擺法、他讓一車一馬、你先走，07-legend.js jLevel 的 relay 守城：撐 20 步、不被將死、仕相不能丟。
   出現節奏：停靠滿 3 站才開始；同一頁 30 分鐘抽一次；照 zf→hp→gg→mj→ds 的順序看條件、抽機率，中一位就停；一天最多 2 次、兩次隔 2 小時；連 12 次沒人出現下一次必出；各自的冷卻、每朝上限見 OY_WHO。
   跟 07q-buddy（旅伴闖禍）並存：那個渡口的「！」還沒解完時，偶遇角色不在那個渡口出現（旅伴優先，這次機會不算、不扣保底）；站位避開入口標籤、07w4 主人（.ph4-hit）、旅伴的「！」小卡、七星來訪（.v7）；
     點選只綁在自己的按鈕上（.oy-hit），不用捕獲層，不搶旅伴、走路角色的點選。
   獎勵只用修為（addXP，key 擋重複）和珍品（07-legend relicsData／relicsMine＋07i relicFx，重複照 07v RLD_DUP_XP 換修為）；張三丰回報＝秘境棋友線索 secretClue。不發千秋印。
   題目 data/ouyu/{daishu,huapen,mujiang,genggu}.json（xiangqi-db/tools/ouyu/ 產生並驗證，publish.js 寫進 art/ouyu）。
   存檔 store "ouyu"（05b-save.js JOURNEY_KEYS 的 m_ouyu）＝{g:{d 今天,n 今天幾次,t 上次出現,miss 保底,roll:{頁:時間}},cur 現在站著的那位,ds|hp|mj|gg:{seen:{題號:時間},era:{朝:次數},cd,n,gift},hp.back、hp.tm,zf:{mated,era:{朝:{n,ok}},cd,open}}；張三丰守城進度 store "jRunO"（也在 JOURNEY_KEYS）。
   測試（主控台，只改記憶體、不寫存檔）：oyDev.wx="rain"|"snow"|null 天氣、oyDev.hour=20 時間（幾點）、oyDev.force="gg" 下一次機會必出這一位（不看機率、冷卻、次數）、oyDev.reset() 清存檔；
     oyDev.go("mj","ming") 直接開這一位這一朝的下一題、oyDev.zf("ming") 直接開張三丰；oyDev.check("port","song",{hour:20,wx:null}) 列出這個情境誰符合條件。到某一朝：shipGoTo("song",()=>route())。
   開關 OUYU_ON；前綴 oy */
const OUYU_ON=true;
/* 11/10 開發者「其他 3D 角色這樣放實在很出戲」選 A：渡口、驛站圖上不再站 3D 小人，右上角出現一封求助信（朱印封口），點了才看到這位人物的立繪和請求。
   OY_LETTER=false 就回到 3D 小人的放法 */
const OY_LETTER=true;
const oyImg=(w,mdl)=>{const m=w==="hp"&&mdl==="douhua"?"n_douhua":OY_WHO[w].m;return m.startsWith("a_")?"data/actors/"+m.slice(2)+".webp":"data/npc/"+m.slice(2)+".webp"};
const OY_DAY=864e5,OY_H=36e5;
/* 誰：m＝3D 模型（tripo_app）、ic＝頭上的符號、eras＝出現的朝代、at＝地點（port 渡口、yz 驛站）、p＝機率、cd＝冷卻、max＝同一朝最多幫幾次、xp＝第一次解某題的修為 */
const OY_WHO={
  ds:{nm:"代書先生",m:"n_daishu",pc:"士",ic:"📜",eras:["ming","qing"],at:["yz","port"],p:.2,cd:3*OY_DAY,max:3,xp:15},
  hp:{nm:"賣花的姑娘",m:"n_maihua",pc:"象",ic:"💧",eras:["tang","wudai","song","yuan","ming","qing"],at:["port","yz"],p:.3,cd:2*OY_DAY,max:2,xp:20},
  gg:{nm:"打更的老更夫",m:"n_genggu",pc:"砲",ic:"🏮",eras:["song","yuan","ming","qing","classic"],at:["port","yz"],p:.2,cd:2*OY_DAY,max:2,xp:30},
  mj:{nm:"收工的木匠",m:"n_mujiang",pc:"車",ic:"🔨",eras:["ming","qing"],at:["yz","port"],p:.15,cd:2*OY_DAY,max:3,xp:15},
  zf:{nm:"張三丰",m:"a_zhangsanfeng",pc:"馬",ic:"☯",eras:["yuan","ming"],at:["port","yz"],p:.1,cd:7*OY_DAY,max:3,xp:40}};
const OY_ORDER=["zf","hp","gg","mj","ds"],OY_DAYMAX=2,OY_GAP=2*OY_H,OY_REROLL=30*6e4,OY_PITY=12,OY_DOCK=3;
const OY_HP_TERMS=new Set(["穀雨","清明","芒種","小雪","大雪"]);
/* 珍品緣分（史學顧問 11/10 核定）：""＝那一朝隨機挑一件普通珍品 */
const OY_RELIC={ds:{ming:["ming_yongle","ming_zisha"],qing:["qing_qianlong"]},
  hp:{tang:["tang_changsha"],wudai:["wudai_yuezhou"],song:["song_jianzhan"],yuan:["yuan_gaozu"],ming:[""],qing:["qing_snuff"]},
  mj:{ming:["ming_chair"],qing:[""]},gg:{song:["song_waterclock"],yuan:["yuan_jianyi"],ming:["ming_xuande"],qing:["qing_clock"]}};
/* 台詞（設計文件第二～五節，顧問核過；停在哪一朝就不提更晚的事） */
const OY_SAY={
  ds:{in:{ming:"這位小友，可識得棋譜？有位客人託我念家書，信上沒寫字，只寫了幾步棋。勞駕你在盤上替我擺一擺。",qing:"小友留步。這封家書只寫了棋譜，老夫眼花，勞駕你在棋盤上替我走一走，老夫一看棋形就懂了。"},
    again:{ming:"上回那封信，收信的人回信了，還託我帶一句：多謝念信的小友。今天又有一封。",qing:"上回那封家書，老夫謄好寄出去了。今天這封，字更少，只有棋。"},
    read:"「炮二平五」：紅方二路的炮，橫著走到五路。進是往前，退是往後，平是橫著走。黑方的路數，從黑方自己的右手邊數起。",
    tip:["慢著，這一著的子不對——先看第一個字，是哪一顆子？","是這一顆。再看第三個字：進、退，還是平？","老夫替你走一著，你看清楚了。"],
    ok:"這一封我替他謄好了。小友記性好，下回再來幫我念。",gift:"幫了老夫三回，這個你收著。"},
  hp:{in:{"tang|maihua|rain":"雨來了！這籃花要趕著賣，淋了雨就蔫了……你會下棋嗎？","wudai|maihua|rain":"這場雨下得急，花擔子沒地方躲。聽說會下棋的人，最懂得怎麼擋。",
      "song|maihua|rain":"哎呀，雨要下大了！這擔花明早要挑進城叫賣的，淋濕就賣不掉了……你會下棋吧？","yuan|maihua|rain":"雨落下來了！這些花是要送進城裡的，淋壞了可賠不起。",
      "ming|maihua|rain":"雨來了，花擔子得遮一遮！你用棋子幫我搭個棚子好不好？","qing|maihua|rain":"雨來了，花擔子得遮一遮！你用棋子幫我搭個棚子好不好？",
      "ming|douhua|rain":"豆花擔子不能淋雨，雨一落進去，豆花就稀了、涼了！","qing|douhua|rain":"豆花擔子不能淋雨，雨一落進去，豆花就稀了、涼了！",
      "ming|douhua|snow":"雪落下來了！熱豆花要趁熱賣，雪掉進桶裡就涼了。","qing|douhua|snow":"雪落下來了！熱豆花要趁熱賣，雪掉進桶裡就涼了。",snow:"下雪了，花經不起凍……幫我擋一擋好嗎？"},
    rule:"黑色的棋子是雨。你只能動仕和相，不能吃子，擋住每一條打到擔子的路。",
    tip:["雨還是打得到！你看，這一路還通著。","砲要隔一顆子才打得到；馬要先看馬腳。照著淡淡的點，搭兩層棚子試試。","我搭一次給你看。"],
    ok:"棚子搭得真牢！",okSong:"棚子搭得真牢！明天要是天晴，我還在這兒。",back:"昨天多虧你。今天天晴了，這個送你。"},
  mj:{in:{ming:"糟了糟了！一陣風把石桌上的棋子吹亂了，我的刨子還壓在底下……我是輪班進京做工的匠人，回鄉路上順便替驛站修門板，可不能在這兒丟了傢伙。",
      qing:"哎喲，一陣風把客人的棋吹亂了，我的刨子還壓在底下！客人回來要怪我的……你幫我照原樣擺回去？"},
    again:"今天風大，棋子又……唉，你懂的。",gift:{ming:"上回多謝你！我照老樣子做了一把圈椅，你收著。",qing:"上回多謝你！這個你收著，算我的謝禮。"},
    rule:"右下角是客人原本擺的樣子。風把棋子吹動了 {k} 步，你照棋子的走法，把它們走回去。紅的黑的都能動，但不能吃子。",
    tip:["看看右下角的小圖，哪幾顆子站的地方不一樣？","就是這幾顆，閃了吧？","我想起來了，是這樣走的……"],ok:"對了對了！刨子找到了。你這記性，比我的墨斗線還直。"},
  gg:{in:{song:"（梆、梆）小友，借一步說話。剛才有位棋友擺了一盤，硬說我這盤輸定了。我打了一輩子更，可不信這個邪！",yuan:"（梆、梆）夜深了，小友還沒歇？來看看這盤棋，人家說我輸定了。",
      ming:"（梆、梆）一更天了。小友，這盤棋他們都說我輸，你說能不能和？",qing:"（梆、梆）二更天了，小心火燭——小友，借一步說話，這盤棋我不服！",classic:"（梆、梆）雲河上也要打更的。小友，這盤棋你瞧瞧。"},
    again:"上回那盤和得漂亮，那位棋友不服，又擺了一盤。",
    rule:"不能一直將軍，也不能一直捉同一顆子，那樣要判輸。把他殺你的子換掉、或走成下不贏的殘局，就是和。",
    tip:["哎呀，被他殺了……再來一次，先看看他哪顆子最兇。","動這一顆試試。","老頭子走一遍給你看。"],ok:"和了！我就說嘛，老頭子的棋沒那麼容易輸。"},
  zf:{in:{yuan:"貧道路過此地。看你剛才被將死了，來，貧道讓你一車一馬，你撐二十步給我看。",ming:"貧道在山裡走慣了，下棋也慢。你剛輸了一盤吧？貧道收起一車一馬，你撐二十步就好。"},
    note:"張三丰（傳說人物）：傳說他是武當山的道人，生卒年和事蹟多半是後人說的故事。",rule:"你先走。帥不被將死、仕相一個不丟，撐滿二十步。",
    ok:"不急、不搶，你守住了。以柔克剛，就是這個意思。",fail:"你越急，丟得越快。慢慢來。",back:"貧道常在園子後面打坐，有空來找我下一盤。"}};
const OY_ZF_FEN="2bakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR",OY_ZF_AI=[3,4,5,6,7];
const oyDev={wx:undefined,hour:undefined,force:"",reset(){store.set("ouyu",{});return"ouyu 存檔清掉了"},
  go(w,era){const S=oySt(),e=era||"ming";return oyPickPz(w,e,S).then(id=>{if(!id)return"這一位這一朝沒有題目";S.cur={w,era:e,place:"port",pz:id,t:Date.now(),dev:1,mdl:w==="hp"?oyHpWho(e,"rain"):""};oySave(S);location.hash="#/ouyu/"+w+"/"+encodeURIComponent(id);return id})},
  zf(era){const S=oySt();S.cur={w:"zf",era:era||"ming",place:"port",pz:era||"ming",t:Date.now(),dev:1};oySave(S);location.hash="#/ouyu/zf/"+(era||"ming");return"開張三丰"},
  check(place,era,o){o=o||{};const d=new Date();if(o.hour!=null)d.setHours(o.hour,0,0,0);return OY_ORDER.filter(w=>oyCan(w,{place,era,now:d,hour:d.getHours(),wx:o.wx?{t:o.wx}:null,night:o.night!=null?o.night:(d.getHours()>=19||d.getHours()<5)},oySt(),true))},
  state:()=>oySt()};
if(typeof window!=="undefined")window.oyDev=oyDev;
function oySt(){const S=store.get("ouyu",null)||{};for(const k of["g","ds","hp","mj","gg","zf"])if(!S[k]||typeof S[k]!=="object")S[k]={};for(const k of["ds","hp","mj","gg"]){if(!S[k].seen)S[k].seen={};if(!S[k].era)S[k].era={}}if(!S.zf.era)S.zf.era={};if(!S.g.roll)S.g.roll={};return S}
const oySave=S=>store.set("ouyu",S);
const oyDay=d=>{d=d||new Date();return d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate()};
function oyNow(){const d=new Date();if(oyDev.hour!=null)d.setHours(oyDev.hour,30,0,0);return d}
/* 這一頁現在的天氣（跟畫面上的雨雪同一個：07w7 sw7WxFor；玩家在設定關掉場景天氣時當作沒下） */
function oyWx(P){if(oyDev.wx!==undefined)return oyDev.wx?{t:oyDev.wx,a:1}:null;try{if(typeof sw7On==="function"&&!sw7On())return null;const I=P&&P.querySelector(":scope>img"),o=I&&typeof sw7Page==="function"?sw7Page(I.getAttribute("src")||""):null;return o&&typeof sw7WxFor==="function"?sw7WxFor(P,o):null}catch(e){return null}}
function oyNight(d){if(oyDev.hour!=null)return d.getHours()>=19||d.getHours()<5;try{if(typeof sw7HomeNightA==="function"&&typeof sw7SeaNow==="function")return sw7HomeNightA(d,sw7SeaNow())>0}catch(e){}return d.getHours()>=19||d.getHours()<5}
function oyTerm(){try{return typeof sw7Term==="function"?sw7Term():""}catch(e){return""}}
function oyDocks(){try{const D=typeof shipDockList==="function"?shipDockList():null;return(D||(typeof shipDocked==="function"?shipDocked():[])).length}catch(e){return 0}}
const oyHpWho=(era,t)=>(era==="ming"||era==="qing")&&(t==="snow"||Math.random()<.4)?"douhua":"maihua";
/* ---------- 題目 ---------- */
const OY_P={};
function oyData(n){return OY_P[n]||(OY_P[n]=fetch("data/ouyu/"+n+".json").then(r=>{if(!r.ok)throw new Error("題目載入失敗（"+r.status+"）");return r.json()}).catch(e=>{delete OY_P[n];throw e}))}
const OY_FILE={ds:"daishu",hp:"huapen",mj:"mujiang",gg:"genggu"};
/* 這一位、這一朝下一題：照順序挑還沒解過的；都解過了就從能用的裡隨機挑一題（不再給修為） */
function oyPickPz(w,era,S){if(w==="zf")return Promise.resolve(era);return oyData(OY_FILE[w]).then(D=>oyPickFrom(w,era,S,D.items))}
function oyPickFrom(w,era,S,items){const ok=items.filter(q=>!q.eras||q.eras.includes(era==="classic"?"qing":era));if(!ok.length)return"";const seen=S[w].seen||{},fresh=ok.filter(q=>!seen[q.id]);
  if(w==="gg"&&fresh.length){const n=(S.gg.era[era]|0),half=Math.ceil(ok.length/2),pref=fresh.filter(q=>(+q.id.slice(2)>half)===(n>=1));return(pref[0]||fresh[0]).id}
  return(fresh[0]||ok[Math.floor(Math.random()*ok.length)]).id}
/* ---------- 出現條件 ---------- */
/* ctx＝{place, era, now, hour, wx, night}；loose＝只看朝代、時段、天氣（oyDev.check 用） */
function oyCan(w,c,S,loose){const W=OY_WHO[w];if(!W.eras.includes(c.era)||!W.at.includes(c.place))return false;const h=c.hour;
  if(w==="ds"&&(h<7||h>=17||c.wx))return false;
  if(w==="hp"&&!c.wx)return false;
  if(w==="gg"&&(!(h>=19||h<1)||!c.night||c.era==="classic"&&c.place!=="yz"))return false;
  if(w==="mj"&&(h<17||h>=22))return false;
  if(w==="zf"){const Z=S.zf;if(!Z.mated||Z.mated<(Z.shown||0))return false;const E=Z.era[c.era]||{};if(E.ok||(E.n|0)>=W.max)return false}
  if(loose)return true;
  const now=c.now.getTime(),R=S[w];if(R.cd&&now-R.cd<W.cd)return false;
  if(w!=="zf"&&(R.era[c.era]|0)>=W.max)return false;
  return true}
/* 旅伴闖禍的「！」還沒解完的渡口：先讓旅伴（07q-buddy.js） */
function oyBuddyBusy(place,era){if(place!=="port")return false;try{if(typeof bdOk!=="function"||!bdOk()||typeof bdEvent!=="function")return false;const E=bdEvent(era);if(!E)return false;const R=(bdSt().ev||{})[era];return!(R&&R.done)}catch(e){return false}}
/* 這次機會：回傳 {w, mdl} 或 null；會寫存檔（抽過的時間、保底、今天次數） */
function oyRoll(place,era,P){const S=oySt(),d=oyNow(),now=d.getTime(),day=oyDay(d),key=place+"|"+era,G=S.g;
  if(G.d!==day){G.d=day;G.n=0}
  /* 已經站著、還沒幫完的那位（同一天、同一頁）：照舊站著 */
  if(S.cur&&S.cur.place===place&&S.cur.era===era&&oyDay(new Date(S.cur.t))===day&&!S.cur.done&&!S.cur.no)return{w:S.cur.w,mdl:S.cur.mdl,keep:1};
  if(oyBuddyBusy(place,era))return null;
  const force=oyDev.force;
  if(!force){if(oyDocks()<OY_DOCK)return null;if(G.roll[key]&&now-G.roll[key]<OY_REROLL)return null;if((G.n|0)>=OY_DAYMAX)return null;if(G.t&&now-G.t<OY_GAP)return null}
  G.roll[key]=now;
  const wx=oyWx(P),c={place,era,now:d,hour:d.getHours(),wx,night:oyNight(d)};
  const can=force?[force].filter(w=>OY_WHO[w]):OY_ORDER.filter(w=>oyCan(w,c,S));
  if(!can.length){oySave(S);return null}
  let hit="";
  if(force)hit=force;
  else{const term=oyTerm(),tk=term+"|"+d.getFullYear(),T=S.hp.tm||{};
    for(const w of can){let p=OY_WHO[w].p;
      if(w==="hp"&&OY_HP_TERMS.has(term)){if(T.k!==tk)S.hp.tm={k:tk,c:0,met:0};const M=S.hp.tm;if(!M.met&&M.c>=1)p=1;M.c++}
      if(Math.random()<p){hit=w;break}}
    if(!hit&&(G.miss=(G.miss|0)+1)>=OY_PITY)hit=can[0]}
  if(!hit){oySave(S);return null}
  G.miss=0;G.n=(G.n|0)+1;G.t=now;
  const mdl=hit==="hp"?oyHpWho(era,wx&&wx.t||"rain"):"";if(hit==="hp"&&S.hp.tm)S.hp.tm.met=1;
  S[hit].cd=now;if(hit==="zf")S.zf.shown=now;
  S.cur={w:hit,era,place,t:now,mdl,wx:wx&&wx.t||""};oySave(S);return{w:hit,mdl}}
/* ---------- 畫面上的角色 ---------- */
function oyCss(){if(document.getElementById("oyCss"))return;const s=document.createElement("style");s.id="oyCss";s.textContent=`
.oy3{position:absolute;left:0;top:0;width:0;height:0;z-index:5;pointer-events:none;opacity:0;transition:opacity .5s}.oy3.on{opacity:1}.oy3 canvas{position:absolute;pointer-events:none}
.oy3 .sh{position:absolute;border-radius:50%;background:radial-gradient(rgba(40,28,18,.32),rgba(40,28,18,0) 70%)}
.oy-card.oy-fl{position:absolute;left:50%;top:9%;transform:translateX(-50%);z-index:40;width:min(86%,330px);max-width:none;margin:0;display:flex;align-items:center;gap:8px;text-align:left;box-shadow:0 4px 14px rgba(0,0,0,.28)}
.oy-hit{position:absolute;z-index:150;background:transparent;border:0;padding:0;border-radius:40%;cursor:pointer;-webkit-tap-highlight-color:transparent}
.oy-mk{position:absolute;z-index:151;transform:translate(-50%,-100%);font-size:20px;line-height:1;background:#fbf6ea;border:1.5px solid #3a2618;border-radius:999px;padding:3px 6px;box-shadow:0 2px 6px rgba(0,0,0,.25);pointer-events:none;animation:oyBob 1.6s ease-in-out infinite}
@keyframes oyBob{0%,100%{margin-top:0}50%{margin-top:-4px}}@media (prefers-reduced-motion:reduce){.oy-mk{animation:none}}
.oy-card{display:flex;align-items:center;gap:10px;width:100%;text-align:left}.oy-card .ic{font-size:30px}
.oy-say{display:flex;gap:10px;align-items:flex-start;margin:0 0 10px}.oy-say .ic{font-size:34px;line-height:1}.oy-say p{margin:0;line-height:1.8;font-size:15.5px}
.oy-letter{background:#fbf3df;border:1px solid #d9c49a;border-radius:10px;padding:6px 10px;margin:4px 0;font-family:var(--serif,serif);font-size:17px;letter-spacing:.06em;line-height:1.9}
.oy-letter i{font-style:normal;opacity:.45}.oy-letter b{color:#9a2a1a;text-decoration:underline}
.oy-wrap{position:relative}.oy-ov{position:absolute;pointer-events:none}.oy-ov text{font-size:34px}
.oy-thumb{position:absolute;right:4px;top:calc(100% + 4px);bottom:auto;width:30%;background:rgba(251,246,234,.95);border:1.5px solid #3a2618;border-radius:8px;padding:2px;pointer-events:none;z-index:3}
.oy-thumb small{display:block;text-align:center;font-size:11px;color:#5a4630}
.oy-done{text-align:center;line-height:1.8}
.oy-env{position:absolute;right:3.5%;top:13%;z-index:6;display:flex;flex-direction:column;align-items:center;gap:3px;padding:0;border:0;background:none;cursor:pointer;-webkit-tap-highlight-color:transparent;animation:oyEnv 2.6s ease-in-out infinite}
.oy-env i{position:relative;display:block;width:44px;height:30px;background:linear-gradient(#f8efd9,#efe2c3);border:1.5px solid #6b5132;border-radius:2px;box-shadow:0 3px 8px rgba(0,0,0,.3)}
.oy-env i::before{content:"";position:absolute;left:0;right:0;top:0;height:16px;background:linear-gradient(to bottom right,transparent 49%,#6b5132 50%,transparent 53%),linear-gradient(to bottom left,transparent 49%,#6b5132 50%,transparent 53%);background-size:50% 100%;background-position:left,right;background-repeat:no-repeat}
.oy-env i::after{content:"";position:absolute;left:50%;top:9px;width:13px;height:13px;margin-left:-6.5px;border-radius:50%;background:#a3241a;box-shadow:0 0 0 1.5px #f3e3c2 inset}
.oy-env b{font:800 12.5px/1 var(--kai,var(--serif,serif));color:#3a2618;background:rgba(251,246,234,.92);border:1px solid rgba(107,81,50,.6);border-radius:3px;padding:3px 6px;white-space:nowrap}
.oy-env.oy-in{right:auto;transform-origin:50% 100%;translate:-50% -100%}.oy-env.oy-in i{width:34px;height:23px}.oy-env.oy-in i::before{height:12px}.oy-env.oy-in i::after{top:6px;width:11px;height:11px;margin-left:-5.5px}
@keyframes oyEnv{0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-4px) rotate(2deg)}}@media (prefers-reduced-motion:reduce){.oy-env{animation:none}}
.oy-say img{width:72px;height:auto;flex:none;border-radius:8px;background:#f6eedd}`;document.head.append(s)}
const oyName=(w,mdl)=>w==="hp"&&mdl==="douhua"?"賣豆花的小販":OY_WHO[w].nm;
const oyModel=(w,mdl)=>w==="hp"&&mdl==="douhua"?"n_douhua":OY_WHO[w].m;
const oyBackHash=place=>place==="yz"?"#/journey/inn":"#/port";
function oyCfg(place,k){try{if(place==="port"){if(typeof SHW_PORT==="undefined"||!SHW_PORT[k])return null;const C=shwCfg(SHW_PORT[k],typeof SHW_PSX!=="undefined"?SHW_PSX[k]:null);if(Array.isArray(C.h))C.h=[C.h[0]*SHW_PORT_K,C.h[1],C.h[2]*SHW_PORT_K];return C}
  if(typeof SHW_YZ==="undefined"||!SHW_YZ[k])return null;return Object.assign({},SHW_PG0,SHW_YZ[k])}catch(e){return null}}
/* 站位：路網上的點往右挪一點；不壓到標籤、驛路小圓印、07w4 主人、旅伴的「！」、七星來訪，也不站在 07w4 主人的固定站位、走路角色起點附近 */
function oySpot(P,C,hFr,k){const W=P.clientWidth,Hh=P.clientHeight,q=P.getBoundingClientRect();
  const rs=[...P.querySelectorAll(".shp-spot,.po-sight,.yz-seal,.ph4-hit,.bd-mark,.v7,.yz-more,.shp-cap")].filter(b=>b.offsetParent).map(b=>{const r=b.getBoundingClientRect();return[r.left-q.left-8,r.top-q.top-8,r.right-q.left+8,r.bottom-q.top+8]});
  const H=C.N[C.home]||[50,70],host=(typeof PH4_AT!=="undefined"&&PH4_AT[k])||null,far=([x,y],[a,b],dx,dy)=>Math.abs(x-a)>dx||Math.abs(y-b)>dy;
  const cand=Object.entries(C.N).filter(([n])=>n!==C.home).map(([,p])=>[p[0]+6,p[1]+1]).concat(Object.values(C.N).map(p=>[p[0]-6,p[1]+1]))
    .filter(([x,y])=>x>8&&x<92&&y>40&&y<93&&far([x,y],H,14,6)&&(!host||far([x,y],host,12,8))).sort((a,b)=>b[1]-a[1]);
  const bad=([x,y])=>{const px=x*W/100,py=y*Hh/100,h=hFr(y)*Hh,w=h*.6;return rs.some(([a,b,c2,d])=>!(c2<px-w/2||a>px+w/2||d<py-h||b>py))};
  return cand.find(p=>!bad(p))||null}
/* 3D 小人（照 07w4 ph4Load 的畫法；載不起來就回傳 false，改放小卡） */
async function oyFig(P,C,k,model,pc,box,hit,mk){
  await loadScript(OFF?"three.min.js":"/m/three.min.js");await loadScript((OFF?"bot3d.js":"/m/bot3d.js")+"?v="+encodeURIComponent(window.XQ_BUILD||""));
  const T=window.THREE;if(!T||!window.XQBot3D||!XQBot3D.figure)throw 0;if(!box.isConnected)return;if(typeof shwTripo==="function")await shwTripo();if(!box.isConnected)return;
  if(typeof TRIPO==="undefined"||!TRIPO[model])throw 0;const B=XQBot3D.figure({p:pc,e:k,g:9,glb:`data/tripo_app/${model}.glb`,ring:TRIPO[model]});if(!B.glbP)throw 0;await B.glbP;if(!box.isConnected)return;
  const EL=C.el*Math.PI/180,r=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:"low-power"});r.setPixelRatio(Math.min(2,devicePixelRatio||1));if(T.sRGBEncoding!=null)r.outputEncoding=T.sRGBEncoding;
  const cv=r.domElement,sh=box.querySelector(".sh");box.append(cv);
  const sc=new T.Scene();sc.add(new T.HemisphereLight(0xFFF6E8,0x6A5A48,1.15));const dl=new T.DirectionalLight(0xFFFFFF,.85);dl.position.set(-3,6,5);sc.add(dl);
  const root=new T.Group();root.rotation.order="YXZ";root.add(B.bot);sc.add(root);root.updateMatrixWorld(true);
  const bx=new T.Box3().setFromObject(B.bot),ce=bx.getCenter(new T.Vector3()),hM=(bx.max.y-bx.min.y)||1;B.bot.position.x-=ce.x;B.bot.position.z-=ce.z;B.bot.position.y-=bx.min.y;const by=B.bot.position.y;
  const vh=hM*1.45,cam=new T.OrthographicCamera(-vh*.375,vh*.375,vh/2,-vh/2,hM*.1,hM*20),tg=new T.Vector3(0,hM*.6,0);cam.position.set(0,tg.y+Math.sin(EL)*hM*6,Math.cos(EL)*hM*6);cam.lookAt(tg);cam.updateMatrixWorld(true);
  const ft=new T.Vector3(0,0,0).project(cam),ftF=(1-ft.y)/2,hFr=y=>shwHt(C,y)/(Math.cos(EL)/1.45);
  let at=null,cw=0,ch=0;const fit=()=>{const Iw=P.clientWidth,Ih=P.clientHeight;if(!Ih)return;if(!at){at=oySpot(P,C,hFr,k);if(!at)throw 0}const h=Math.round(hFr(at[1])*Ih),w=Math.round(h*.75);if(h!==ch||w!==cw){ch=h;cw=w;r.setSize(cw,ch)}
    const x=at[0]*Iw/100,y=at[1]*Ih/100;Object.assign(cv.style,{left:(x-cw/2)+"px",top:(y-Math.round(ftF*ch))+"px"});Object.assign(sh.style,{width:Math.round(ch*.34)+"px",height:Math.round(ch*.1)+"px",left:(x-Math.round(ch*.17))+"px",top:(y-Math.round(ch*.05))+"px"});
    const top=y-Math.round(ftF*ch)+ch*.12;Object.assign(hit.style,{display:"",left:(x-cw*.22)+"px",top:top+"px",width:(cw*.44)+"px",height:Math.max(10,y-top)+"px"});Object.assign(mk.style,{left:x+"px",top:(top-2)+"px"})};
  fit();
  const clips=B.mixer&&B.clips||null;let cur=null;const anim=n=>{if(!clips)return;const a=clips[n]||clips.idle;if(!a||a===cur)return;a.reset().fadeIn(.25).play();if(cur)cur.fadeOut(.2);cur=a};anim("idle");
  let vis=true;try{const io=new IntersectionObserver(es=>{vis=es.some(e=>e.isIntersecting)});io.observe(P)}catch(e){}
  if(window.ResizeObserver){const ro=new ResizeObserver(()=>{if(!box.isConnected){ro.disconnect();return}try{fit()}catch(e){}});ro.observe(P)}
  const yaw0=()=>at?Math.max(-.6,Math.min(.6,(50-at[0])*.03)):0;let yawR=yaw0(),last=performance.now(),acc=0,fr=0,waveAt=performance.now()+1500;
  const end=()=>{try{cv.remove()}catch(e){}try{r.dispose();r.forceContextLoss()}catch(e){}};
  const loop=now=>{if(!box.isConnected||!P.isConnected){end();return}requestAnimationFrame(loop);if(document.hidden||!vis){last=now;return}
    if(P.classList.contains("pc-run")||document.querySelector(".walkc")){last=now;return}
    const dt=Math.min(.05,(now-last)/1000);last=now;acc+=dt;
    if(now>=waveAt&&now<waveAt+1800)anim(clips&&clips[SHW_ACT.wave]?SHW_ACT.wave:"wave");else{anim("idle");if(now>=waveAt+1800)waveAt=now+7000+Math.random()*5000}
    yawR+=(yaw0()-yawR)*Math.min(1,dt*4);root.rotation.y=yawR;if(fr++&1)return;if(clips)B.mixer.update(acc);acc=0;B.bot.position.y=by;r.render(sc,cam);if(!box.classList.contains("on"))box.classList.add("on")};
  requestAnimationFrame(loop);return true}
/* 渡口／驛站頁畫完：抽這次機會，站出來（或晴天回報的賣花姑娘） */
function oyPage(v,k,place){if(!OUYU_ON)return;const P=v&&v.querySelector(".shp-page.cq");if(!P||P.dataset.oy)return;P.dataset.oy="1";
  let r=null;const back=oyBackVisit(P,k,place);if(back)r=back;else r=oyRoll(place,k,P);if(!r)return;oyCss();
  const S=oySt(),w=r.w,nm=r.back?oyName("hp",r.mdl):oyName(w,r.mdl),ic=r.back?"🎁":OY_WHO[w].ic,act=()=>{if(typeof vibrate==="function")vibrate(5);if(r.back)oyBackOpen(r);else oyMeet(w,k,place)};
  const pad=v.querySelector(".pad");let card=null;const addCard=()=>{if(card||!pad||!pad.isConnected)return;card=document.createElement("button");card.type="button";card.className="card oy-card";
    card.innerHTML=`<span class="ic" aria-hidden="true">${ic}</span><span style="flex:1;min-width:0"><b>${esc(nm)}${r.back?"在等你":"好像遇到麻煩了"}</b><br><span class="muted" style="font-size:13px">${r.back?"點這裡聽他說":"點這裡聽聽看，要不要幫忙"}</span></span><span class="muted">›</span>`;
    card.onclick=act;const say=pad.querySelector(".port-say,.bd-card");if(say)say.after(card);else pad.prepend(card);
    requestAnimationFrame(()=>{if(card.isConnected&&!card.offsetParent&&P&&P.isConnected){card.classList.add("oy-fl");P.append(card)}})};   /* 驛站圖下的清單是藏著的（YZ_NOLIST_ON），小卡放進去看不到：改浮在滿版圖下方 */
  if(OY_LETTER){const env=document.createElement("button");env.type="button";env.className="oy-env";env.setAttribute("aria-label",(r.back?nm+"在等你":"有人求助")+"：點開來看");env.innerHTML=`<i aria-hidden="true"></i><b>${r.back?"有人等你":"有人求助"}</b>`;
    env.onclick=e=>{e.stopPropagation();e.preventDefault();act()};let n=0;const put=()=>{if(!P.isConnected)return;if((P.classList.contains("pc-run")||document.querySelector(".walkc"))&&++n<40)return void setTimeout(put,300);
      /* 開發者 11/10「放在場景裡，例如岸邊或樹上，放右上角很怪」：用 3D 小人的站位規則（沿著角色走得到的路、避開入口標籤和其他角色）找一個地上的點，信就擱在那裡；找不到才放右上角 */
      let at=null;try{const C=oyCfg(place,k);if(C)at=oySpot(P,C,()=>.07,k)}catch(x){}
      if(at){env.classList.add("oy-in");env.style.left=at[0]+"%";env.style.top=at[1]+"%"}P.append(env)};setTimeout(put,900);return}
  const C=oyCfg(place,k);if(!C||typeof shwRM==="function"&&shwRM()||typeof XQBot3D==="undefined"&&typeof loadScript!=="function"){addCard();return}
  const box=document.createElement("div");box.className="oy3";box.setAttribute("aria-hidden","true");box.innerHTML='<i class="sh"></i>';
  const hit=document.createElement("button");hit.type="button";hit.className="oy-hit";hit.style.display="none";hit.setAttribute("aria-label",nm+"：點他聽他說");
  const mk=document.createElement("div");mk.className="oy-mk";mk.textContent=ic;mk.setAttribute("aria-hidden","true");
  const before=P.querySelector(".shp-spot,.po-sight");P.insertBefore(box,before&&before.parentNode===P?before:null);P.append(hit,mk);
  hit.onclick=e=>{e.stopPropagation();e.preventDefault();act()};
  /* 等下船過場、步行小卡播完、07w4 主人站好以後再找位置 */
  let n=0;const go=()=>{if(!P.isConnected)return;if((P.classList.contains("pc-run")||document.querySelector(".walkc"))&&++n<40)return void setTimeout(go,300);
    oyFig(P,C,k,r.back?oyModel("hp",r.mdl):oyModel(w,r.mdl),OY_WHO[w].pc,box,hit,mk).catch(()=>{box.remove();hit.remove();mk.remove();addCard()})};
  setTimeout(go,1400)}
/* 晴天回報（賣花姑娘／豆花小販）：同一朝、沒下雨、不是同一天 */
function oyBackVisit(P,k,place){const S=oySt(),B=S.hp.back;if(!B||B.era!==k||oyBuddyBusy(place,k))return null;const d=oyNow();if(oyDay(d)===B.day||oyWx(P))return null;return{w:"hp",mdl:B.mdl,back:1}}
function oyBackOpen(r){const S=oySt(),B=S.hp.back;if(!B)return;const nm=oyName("hp",B.mdl);
  sheet("🎁 "+nm,b=>{b.innerHTML=`${oySayHTML(OY_WHO.hp.ic,nm,OY_SAY.hp.back,OY_LETTER?oyImg("hp",B.mdl):"")}<button class="btn" id="oyOk" style="width:100%">謝謝！</button>`;
    b.querySelector("#oyOk").onclick=()=>{closeSheet();const S2=oySt();delete S2.hp.back;oySave(S2);
      setTimeout(()=>{if(Math.random()<.5)oyRelic(B.era,(OY_RELIC.hp[B.era]||[""]),nm+"送的");else if(typeof addXP==="function")addXP(10,"偶遇回報","ouyu:hpback:"+B.day)},300)}})}
const oySayHTML=(ic,nm,t,img)=>`<div class="oy-say">${img?`<img src="${img}" alt="${esc(nm)}" onerror="this.outerHTML='<span class=ic aria-hidden=true>${ic}</span>'">`:`<span class="ic" aria-hidden="true">${ic}</span>`}<p><b>${esc(nm)}</b>「${esc(t)}」</p></div>`;
/* 點他：說第一句，選要不要幫 */
function oyMeet(w,era,place){const S=oySt(),cur=S.cur||{},nm=oyName(w,cur.mdl),W=OY_WHO[w];
  let line="";if(w==="ds")line=(S.ds.n|0)>=1?OY_SAY.ds.again[era]:OY_SAY.ds.in[era];
  else if(w==="hp")line=OY_SAY.hp.in[era+"|"+(cur.mdl||"maihua")+"|"+(cur.wx||"rain")]||(cur.wx==="snow"?OY_SAY.hp.in.snow:OY_SAY.hp.in[era+"|maihua|rain"])||OY_SAY.hp.in.snow;
  else if(w==="mj")line=(S.mj.n|0)===1&&!S.mj.gift?OY_SAY.mj.gift[era]:(S.mj.n|0)>=1?OY_SAY.mj.again:OY_SAY.mj.in[era];
  else if(w==="gg")line=(S.gg.era[era]|0)>=1?OY_SAY.gg.again:OY_SAY.gg.in[era];
  else line=OY_SAY.zf.in[era];
  const gift=w==="mj"&&(S.mj.n|0)===1&&!S.mj.gift;
  oyPickPz(w,era,S).then(id=>{if(!id)return toast(nm+"今天沒什麼事，謝謝你。");
    sheet(W.ic+" "+nm,b=>{b.innerHTML=`${oySayHTML(W.ic,nm,line,OY_LETTER?oyImg(w,cur.mdl):"")}${w==="zf"?`<p class="muted" style="font-size:13px;margin:-4px 0 8px">${esc(OY_SAY.zf.note)}</p>`:""}
      <button class="btn" id="oyGo" style="width:100%">${gift?"謝謝！我也來幫你":"好，我幫你"}</button><button class="btn ghost" id="oyNo" style="width:100%;margin-top:8px">下次再說</button>`;
      b.querySelector("#oyGo").onclick=()=>{closeSheet();const S2=oySt();S2.cur=Object.assign({},S2.cur||{},{w,era,place,pz:id,t:(S2.cur&&S2.cur.t)||Date.now()});if(w==="zf")S2.zf.open=era;oySave(S2);
        const nav=()=>{location.hash="#/ouyu/"+w+"/"+encodeURIComponent(id)};if(gift){const S3=oySt();S3.mj.gift=Date.now();oySave(S3);oyRelic(era,OY_RELIC.mj[era]||[""],"木匠送的").then(()=>setTimeout(nav,400))}else setTimeout(nav,250)};
      b.querySelector("#oyNo").onclick=()=>{closeSheet();const S2=oySt();if(S2.cur)S2.cur.no=1;oySave(S2)}})}).catch(e=>toast(e&&e.message||"題目載入失敗"))}
/* 珍品：ids 裡挑還沒收的（""＝那一朝隨機一件普通珍品）；都有了＝重複，照 07v 換修為 */
async function oyRelic(era,ids,from){try{if(typeof relicsData!=="function"||typeof relicsMine!=="function")return false;const R=await relicsData(),mine=relicsMine(),own=(e,id)=>(mine[e]||[]).includes(id),eraOf=id=>String(id).split("_")[0];
  let pick=null;for(const id of ids){if(id){const e=eraOf(id),it=(R[e]||[]).find(x=>x.id===id);if(it&&!own(e,id)){pick={e,it};break}}else{const L=(R[era]||[]).filter(x=>x.rarity==="common"&&!own(era,x.id));if(L.length){pick={e:era,it:L[Math.floor(Math.random()*L.length)]};break}}}
  if(!pick){const id=ids.find(Boolean),e=id?eraOf(id):era,it=id?(R[e]||[]).find(x=>x.id===id):((R[era]||[]).find(x=>x.rarity==="common"));if(!it)return false;
    const xp=(typeof RLD_DUP_XP!=="undefined"&&RLD_DUP_XP[it.rarity])||15,en=typeof relicEra==="function"?relicEra(e):e;
    if(typeof relicFx==="function")await relicFx(e,it,{from:`${from}${en}的珍品`,cnt:`已經收藏過了・化為修為 +${xp}`,dup:1});if(typeof addXP==="function")addXP(xp,"珍品重複","ouyu:dup:"+oyDay()+":"+it.id);return false}
  const{e,it}=pick;mine[e]=(mine[e]||[]).concat(it.id);store.set("relics",mine);store.set("relicAt",Date.now());if(typeof vibrate==="function")vibrate([15,30,15,30,40]);
  const en=typeof relicEra==="function"?relicEra(e):e,N=(R[e]||[]).length;if(typeof relicFx==="function")await relicFx(e,it,{from:`${from}${en}的珍品`,cnt:`${en}的珍品 ${mine[e].length}／${N}`});else toast("🏺 得到一件珍品："+it.name);return true}catch(x){return false}}
/* ---------- 解題頁 #/ouyu/<誰>/<題號> ---------- */
const OY_FW="０１２３４５６７８９",oyFull=s=>s.replace(/[0-9]/g,d=>OY_FW[+d]);
/* 只看棋子走法（不管輪到誰、不管送將），木匠題用；規則跟 core.js 一樣 */
function oyPseudo(b,q){const C=window.XQCore,p=b[q],r=q/9|0,c=q%9,s=C.sideOf(p),t=p.toUpperCase(),out=[],inb=(rr,cc)=>rr>=0&&rr<10&&cc>=0&&cc<9;
  const add=(rr,cc)=>{if(!inb(rr,cc))return;const x=b[rr*9+cc];if(!x||C.sideOf(x)!==s)out.push(rr*9+cc)},pal=(rr,cc)=>cc>=3&&cc<=5&&(s==="r"?rr>=7&&rr<=9:rr>=0&&rr<=2);
  const D4=[[1,0],[-1,0],[0,1],[0,-1]],DG=[[1,1],[1,-1],[-1,1],[-1,-1]],NJ=[[-2,-1,-1,0],[-2,1,-1,0],[2,-1,1,0],[2,1,1,0],[-1,-2,0,-1],[1,-2,0,-1],[-1,2,0,1],[1,2,0,1]];
  if(t==="K"){for(const[a,d]of D4)if(pal(r+a,c+d))add(r+a,c+d)}
  else if(t==="A"){for(const[a,d]of DG)if(pal(r+a,c+d))add(r+a,c+d)}
  else if(t==="B"){for(const[a,d]of DG){const rr=r+2*a,cc=c+2*d;if(!inb(rr,cc))continue;if(s==="r"?rr<5:rr>4)continue;if(b[(r+a)*9+c+d])continue;add(rr,cc)}}
  else if(t==="N"){for(const[a,d,la,ld]of NJ){const rr=r+a,cc=c+d;if(!inb(rr,cc))continue;if(b[(r+la)*9+c+ld])continue;add(rr,cc)}}
  else if(t==="R"||t==="C"){for(const[a,d]of D4){let rr=r+a,cc=c+d,j=false;while(inb(rr,cc)){const x=b[rr*9+cc];
      if(t==="R"){if(!x)out.push(rr*9+cc);else{if(C.sideOf(x)!==s)out.push(rr*9+cc);break}}else{if(!j){if(!x)out.push(rr*9+cc);else j=true}else if(x){if(C.sideOf(x)!==s)out.push(rr*9+cc);break}}rr+=a;cc+=d}}}
  else if(t==="P"){const f=s==="r"?-1:1;add(r+f,c);if(s==="r"?r<=4:r>=5){add(r,c-1);add(r,c+1)}}
  return out}
function oyFacing(b){const C=window.XQCore,a=C.kingSq(b,"r"),k=C.kingSq(b,"b");if(a<0||k<0||a%9!==k%9)return false;for(let i=k+9;i<a;i+=9)if(b[i])return false;return true}
/* 木匠題能走的著法：任一顆子照走法走到空格，走完不能將帥對臉 */
function oyFreeMoves(b,from){const C=window.XQCore;return oyPseudo(b,from).filter(t=>!b[t]&&!oyFacing(C.make(b,from,t)))}
/* 花擔：黑方吃不吃得到 pot（pot 當一顆紅子） */
function oyRainHitters(b,pot){const C=window.XQCore,n=b.slice();if(!n[pot])n[pot]="P";return C.legal(n,"b").filter(([f,t])=>t===pot).map(([f])=>f)}
function OuyuPage(v,parts){const w=parts[0],id=decodeURIComponent(parts[1]||""),S=oySt(),cur=S.cur||{},W=OY_WHO[w];
  const era=cur.w===w&&cur.pz===id?cur.era:w==="zf"&&S.zf.open===id?id:"",place=cur.place||"port",back=oyBackHash(place);
  if(!OUYU_ON||!W||!era){setTop("🧭 偶遇",back);v.innerHTML=`<div class="pad"><div class="card muted">這位客人已經走了。下次在渡口、驛站遇到再幫他吧。<br><a href="${back}">回去</a></div></div>`;return{}}
  if(w==="zf")return oyZf(v,era,place);
  oyCss();const nm=oyName(w,cur.mdl);setTop(W.ic+" "+nm,back);if(typeof setTabs==="function")setTabs(false);
  v.className="view fixed";v.innerHTML=`<div class="cj-top" id="oyH"></div><div class="boardbox oy-wrap" id="bbox"></div><div class="status" id="oyS"></div><div class="note cj-note" id="oyN"></div><div style="flex:1"></div><div class="actions" id="oyA"></div>`;
  const $=q=>v.querySelector(q),stat=t=>{const e=$("#oyS");if(e)e.textContent=t},note=t=>{const e=$("#oyN");if(e)e.textContent=t||""};
  oyData(OY_FILE[w]).then(D=>{const Q=D.items.find(x=>x.id===id);if(!Q){v.className="view";v.innerHTML=`<div class="pad"><div class="card muted">找不到這一題（題庫可能更新了）。<br><a href="${back}">回去</a></div></div>`;return}
    const ctx={v,$,stat,note,w,era,place,back,nm,Q,cur};if(w==="ds")oyDs(ctx);else if(w==="hp")oyHp(ctx);else if(w==="mj")oyMj(ctx);else if(w==="gg")oyGg(ctx)})
    .catch(e=>{v.className="view";v.innerHTML=`<div class="pad"><div class="card muted">${esc(e&&e.message||"題目載入失敗")}<br><a href="${back}">回去</a></div></div>`});return{}}
/* 解開：記存檔、給修為、說謝謝；extra()＝角色另外送的東西 */
function oyWin(c,say,extra,why){const S=oySt(),w=c.w,R=S[w],first=!R.seen[c.Q.id];R.seen[c.Q.id]=Date.now();R.era[c.era]=(R.era[c.era]|0)+1;R.n=(R.n|0)+1;if(S.cur&&S.cur.pz===c.Q.id)S.cur.done=1;
  if(w==="hp")S.hp.back={era:c.era,mdl:(c.cur.mdl||"maihua"),day:oyDay(oyNow())};oySave(S);
  const xp=OY_WHO[w].xp+(w==="mj"&&c.Q.k===2?5:0);if(first&&typeof addXP==="function")setTimeout(()=>addXP(xp,"偶遇幫忙","ouyu:"+w+":"+c.Q.id),900);
  if(typeof vibrate==="function")vibrate([15,30,15]);
  const box=c.$("#oyA");c.note(why||"");c.stat("✔ 幫上忙了！");
  setTimeout(()=>{if(!c.v.isConnected)return;modal(`<div class="em">${OY_WHO[w].ic}</div><h2>${esc(c.nm)}</h2><div class="oy-done"><p>「${esc(say)}」</p>${why?`<p class="muted" style="font-size:14px">${esc(why)}</p>`:""}${first?`<p>✨ 修為 +${xp}</p>`:'<p class="muted">這一題以前解過了，這次不加修為。</p>'}</div>`,[["回去",()=>{if(extra)extra().then(()=>goUp(c.back));else goUp(c.back)}]])},900);
  if(box)actionBar(box,[["bk","↩","回去",()=>goUp(c.back),true]])}
/* 小棋盤：Board＋上面一層畫雨線、花擔、提示的 SVG */
function oyBoard(c,onTap){const bd=Board(x=>onTap(x));const bb=c.$("#bbox");bb.append(bd.svg);const ns="http://www.w3.org/2000/svg",ov=document.createElementNS(ns,"svg");ov.setAttribute("class","oy-ov");ov.setAttribute("viewBox","0 0 560 620");ov.setAttribute("aria-hidden","true");bb.append(ov);
  const fit=()=>{Object.assign(ov.style,{left:bd.svg.offsetLeft+"px",top:bd.svg.offsetTop+"px",width:bd.svg.offsetWidth+"px",height:bd.svg.offsetHeight+"px"})};
  if(window.ResizeObserver){const ro=new ResizeObserver(()=>{if(!bb.isConnected){ro.disconnect();return}fit()});ro.observe(bb)}setTimeout(fit,0);
  const XY=i=>[40+(i%9)*60,40+(i/9|0)*60];return{bd,ov,XY,fit}}
/* 代書：照譜走，紅黑都由玩家動 */
function oyDs(c){const C=window.XQCore,Q=c.Q;let b=C.parseFen(C.START),turn="r",j=0,sel=-1,mist=0,hk=null,busy=false,last=null;
  const letter=()=>{c.$("#oyH").innerHTML=`<b>📜 家書棋譜</b>・照信上走，紅黑兩邊都由你動<div class="oy-letter">${Q.pu.map((t,i)=>i<j?`<i>${esc(t)}</i>`:i===j?`<b>${esc(t)}</b>`:esc(t)).join("　")}</div>`};
  const {bd}=oyBoard(c,x=>tap(x));const draw=o=>bd.draw(b,{sel,last,targets:sel>=0?C.legal(b,turn).filter(([f])=>f===sel).map(z=>z[1]):[],...(hk?{hint:hk}:{}),...(o||{})});
  const show=()=>{letter();c.stat(`第 ${j+1}／${Q.pu.length} 著・${turn==="r"?"紅方":"黑方"}`);draw()};
  const exp=()=>{const u=Q.iccs[j];return[C.parseSq(u.slice(0,2)),C.parseSq(u.slice(2,4))]};
  const step=(f,t)=>{b=C.make(b,f,t);last={f,t};turn=turn==="r"?"b":"r";j++;hk=null;sel=-1;if(j>=Q.pu.length)return fin();show()};
  function tap(x){if(busy||j>=Q.pu.length)return;const L=C.legal(b,turn);if(sel>=0&&L.some(([f,t])=>f===sel&&t===x)){const[ef,et]=exp();if(sel===ef&&x===et){if(typeof vibrate==="function")vibrate(12);return step(sel,x)}
      mist++;if(typeof vibrate==="function")vibrate([20,40,20]);const k=Math.min(3,mist);c.note("💬 "+c.nm+"："+OY_SAY.ds.tip[k-1]);sel=-1;
      if(k===2)hk=[ef];if(k>=3){hk=[ef,et];busy=true;setTimeout(()=>{busy=false;if(c.v.isConnected)step(ef,et)},900)}draw();return}
    sel=L.some(([f])=>f===x)?x:-1;draw()}
  function fin(){busy=true;letter();const sq=Q.shape.map(([s])=>C.parseSq(s));bd.draw(b,{last,hint:sq});c.stat("棋形出來了！");
    const S=oySt(),gift=(S.ds.n|0)+1===3&&!S.ds.gift;
    oyWin(c,`這叫「${Q.name}」。${Q.say.replace(/^[^。]*。/,"")}　${OY_SAY.ds.ok}`,gift?()=>{const S2=oySt();S2.ds.gift=Date.now();oySave(S2);toast("💬 "+c.nm+"："+OY_SAY.ds.gift);return oyRelic(c.era,OY_RELIC.ds[c.era]||[""],"代書先生送的")}:null,Q.look)}
  c.note(OY_SAY.ds.read);actionBar(c.$("#oyA"),[["re","↺","從頭擺",()=>{b=C.parseFen(C.START);turn="r";j=0;sel=-1;hk=null;last=null;busy=false;show()}]]);show()}
/* 花擔避雨：只動紅仕相、不吃子；畫出還打得到花擔的雨線 */
function oyHp(c){const C=window.XQCore,Q=c.Q,pot=C.parseSq(Q.pot),b0=C.parseFen(Q.fen);let b=b0.slice(),n=0,sel=-1,fails=0,hk=null,busy=false,last=null;const icon=c.cur.mdl==="douhua"?"🥣":"💐";
  c.$("#oyH").innerHTML=`<b>${icon} 搭棚子避雨</b>・最多 ${Q.n} 步<div class="muted" style="font-size:13.5px;line-height:1.6">${esc(OY_SAY.hp.rule)}</div>`;
  const B=oyBoard(c,x=>tap(x)),ns="http://www.w3.org/2000/svg";
  const withPot=x=>{const m=x.slice();m[pot]="P";return m};
  const lines=()=>{B.ov.innerHTML="";const[px,py]=B.XY(pot);const hs=oyRainHitters(b,pot);
    for(const f of hs){const[x,y]=B.XY(f),l=document.createElementNS(ns,"line");Object.entries({x1:x,y1:y,x2:px,y2:py,stroke:"#3d6f9e","stroke-width":6,"stroke-dasharray":"10 8","stroke-linecap":"round",opacity:.7}).forEach(([a,v])=>l.setAttribute(a,v));B.ov.append(l)}
    const t=document.createElementNS(ns,"text");t.setAttribute("x",px);t.setAttribute("y",py+12);t.setAttribute("text-anchor","middle");t.textContent=icon;B.ov.append(t);return hs};
  const mv=()=>C.legal(withPot(b),"r").filter(([f,t])=>"AB".includes(b[f])&&!b[t]&&t!==pot);
  const draw=()=>{B.bd.draw(b,{sel,last,targets:sel>=0?mv().filter(([f])=>f===sel).map(z=>z[1]):[],...(hk?{hint:hk}:{})});B.fit();return lines()};
  const show=()=>{const hs=draw();c.stat(`走了 ${n}／${Q.n} 步・還有 ${hs.length} 路雨打得到`)};
  const reset=()=>{b=b0.slice();n=0;sel=-1;last=null;busy=false;show()};
  function tap(x){if(busy)return;const L=mv();if(sel>=0&&L.some(([f,t])=>f===sel&&t===x)){b=C.make(b,sel,x);last={f:sel,t:x};sel=-1;n++;if(typeof vibrate==="function")vibrate(10);const hs=draw();
      if(!hs.length){busy=true;c.stat("✔ 雨都擋住了！");return oyWin(c,c.era==="song"&&c.cur.mdl!=="douhua"?OY_SAY.hp.okSong:OY_SAY.hp.ok,null,Q.why)}
      if(n>=Q.n){fails++;busy=true;const k=Math.min(3,fails);c.note("💬 "+c.nm+"："+OY_SAY.hp.tip[k-1]+(k===1?"\n💡 "+Q.tip:""));if(k===2)hk=Q.roof.map(s=>C.parseSq(s));
        if(k>=3){setTimeout(()=>{if(!c.v.isConnected)return;b=b0.slice();n=0;last=null;let i=0;const one=()=>{if(!c.v.isConnected)return;if(i>=Q.sol.length){busy=false;c.note("就是這樣搭的。換你自己搭一次！");setTimeout(reset,1600);return}const u=Q.sol[i++],f=C.parseSq(u.slice(0,2)),t=C.parseSq(u.slice(2,4));b=C.make(b,f,t);last={f,t};draw();setTimeout(one,800)};draw();setTimeout(one,700)},1200);return}
        setTimeout(reset,1700)}else c.stat(`走了 ${n}／${Q.n} 步・還有 ${hs.length} 路雨打得到`);return}
    sel=L.some(([f])=>f===x)?x:-1;draw()}
  c.note("💡 "+Q.tip);actionBar(c.$("#oyA"),[["re","↺","重來",reset]]);show()}
/* 木匠：紅黑都能照走法動、不吃子，k 步走回 A */
function oyMj(c){const C=window.XQCore,Q=c.Q,A=C.parseFen(Q.a),b0=C.parseFen(Q.b),FEN=x=>C.fen(x,"r").split(" ")[0];let b=b0.slice(),n=0,sel=-1,fails=0,hk=null,busy=false,last=null;
  c.$("#oyH").innerHTML=`<b>🔨 照原樣擺回去</b>・風吹動了 ${Q.k} 步<div class="muted" style="font-size:13.5px;line-height:1.6">${esc(OY_SAY.mj.rule.replace("{k}",Q.k))}</div>`;
  const B=oyBoard(c,x=>tap(x));const th=document.createElement("div");th.className="oy-thumb";const tb=Board();th.append(tb.svg);th.insertAdjacentHTML("beforeend","<small>客人原本擺的</small>");c.$("#bbox").append(th);tb.draw(A,{});
  const draw=()=>{B.bd.draw(b,{sel,last,targets:sel>=0?oyFreeMoves(b,sel):[],...(hk?{hint:hk}:{})})};
  const show=()=>{draw();c.stat(`走了 ${n}／${Q.k} 步`)};const reset=()=>{b=b0.slice();n=0;sel=-1;last=null;busy=false;show()};
  function tap(x){if(busy)return;if(sel>=0&&oyFreeMoves(b,sel).includes(x)){b=C.make(b,sel,x);last={f:sel,t:x};sel=-1;n++;if(typeof vibrate==="function")vibrate(10);draw();
      if(FEN(b)===FEN(A)){busy=true;return oyWin(c,OY_SAY.mj.ok,null,"殘局出處："+Q.src)}
      if(n>=Q.k){fails++;busy=true;const k=Math.min(3,fails);c.note("💬 "+c.nm+"："+OY_SAY.mj.tip[k-1]);if(k===2)hk=Q.blown.map(p=>C.parseSq(p[1]));
        if(k>=3){setTimeout(()=>{if(!c.v.isConnected)return;b=b0.slice();n=0;last=null;hk=null;let i=0;const one=()=>{if(!c.v.isConnected)return;if(i>=Q.sol.length){c.note("就是這樣。換你自己擺一次！");setTimeout(reset,1600);return}const u=Q.sol[i++],f=C.parseSq(u.slice(0,2)),t=C.parseSq(u.slice(2,4));b=C.make(b,f,t);last={f,t};draw();setTimeout(one,900)};draw();setTimeout(one,700)},1200);return}
        setTimeout(reset,1700)}else c.stat(`走了 ${n}／${Q.k} 步`);return}
    sel=b[x]?x:-1;draw()}
  actionBar(c.$("#oyA"),[["re","↺","重來",reset]]);show()}
/* 老更夫：紅方照守和的著法走，黑方照古譜應；走錯演一遍黑方怎麼贏，再退回 */
function oyGg(c){const C=window.XQCore,Q=c.Q,b0=C.parseFen(Q.fen);let b=b0.slice(),j=0,sel=-1,mist=0,hk=null,busy=false,last=null;
  c.$("#oyH").innerHTML=`<b>🏮 守和！還有 ${Q.k} 步</b><div class="muted" style="font-size:13.5px;line-height:1.6">${esc(OY_SAY.gg.rule)}</div>`;
  const B=oyBoard(c,x=>tap(x));const ck=x=>C.inCheck(x,"r")?C.kingSq(x,"r"):C.inCheck(x,"b")?C.kingSq(x,"b"):-1;
  const draw=o=>B.bd.draw(o&&o.board||b,{sel,last,check:ck(o&&o.board||b),targets:sel>=0?C.legal(b,"r").filter(([f])=>f===sel).map(z=>z[1]):[],...(hk?{hint:hk}:{}),...(o||{})});
  const show=()=>{c.stat(`紅方走・第 ${j+1}／${Q.k} 步`);draw()};const sqs=u=>[C.parseSq(u.slice(0,2)),C.parseSq(u.slice(2,4))];
  function tap(x){if(busy||j>=Q.k)return;const L=C.legal(b,"r");if(sel>=0&&L.some(([f,t])=>f===sel&&t===x)){const u=C.iccs(sel,x),St=Q.steps[j],book=Q.ics[j*2],lastStep=j===Q.k-1;sel=-1;
      if(u===book||lastStep&&St.ok.includes(u)){b=C.make(b,...sqs(u));last={f:sqs(u)[0],t:sqs(u)[1]};hk=null;if(typeof vibrate==="function")vibrate(12);
        if(lastStep){busy=true;draw();return oyWin(c,OY_SAY.gg.ok,c.era!=="classic"&&!(oySt().gg.gift||{})[c.era]?()=>{const S=oySt();S.gg.gift=Object.assign({},S.gg.gift,{[c.era]:1});oySave(S);return Math.random()<.6?oyRelic(c.era,OY_RELIC.gg[c.era]||[""],"打更路上撿到"):Promise.resolve(false)}:null,"和局的道理："+Q.why)}
        busy=true;draw();c.stat("✔ 守住這一步");setTimeout(()=>{if(!c.v.isConnected)return;const r=Q.ics[j*2+1];const[f2,t2]=sqs(r);c.note("對方應："+oyFull(C.notate(b,f2,t2)));b=C.make(b,f2,t2);last={f:f2,t:t2};j++;busy=false;show()},600);return}
      mist++;busy=true;if(typeof vibrate==="function")vibrate([20,40,20]);const bad=(St.bad.find(z=>z[0]===u)||[u,""]),seq=[u].concat((bad[1].match(/.{4}/g)||[]).slice(0,6));let bb=b,i=0;const save=b;
      const k=Math.min(3,mist);c.note("💬 "+c.nm+"："+OY_SAY.gg.tip[k-1]);
      const one=()=>{if(!c.v.isConnected)return;if(i>=seq.length){setTimeout(()=>{b=save;busy=false;if(k===2)hk=[sqs(book)[0]];if(k>=3)hk=sqs(book);show()},900);return}const[f,t]=sqs(seq[i++]);if(!bb[f]){i=seq.length;return one()}bb=C.make(bb,f,t);draw({board:bb,last:{f,t},sel:-1,targets:[]});setTimeout(one,650)};one();return}
    sel=L.some(([f])=>f===x)?x:-1;draw()}
  c.note("同一盤棋要是黑方先走，黑方馬上就能殺你——所以每一步都要守住。");show()}
/* 張三丰：jLevel 的 relay 守城，你先走 */
function oyZf(v,era,place){const back=oyBackHash(place),dn=typeof diffNow==="function"?diffNow():2,ai=OY_ZF_AI[Math.max(0,Math.min(4,dn-1))];
  const G={name:"張三丰讓一車一馬",intro:OY_SAY.zf.note,skill:"不急、不搶：先護住帥，仕、相連在一起",pass:OY_SAY.zf.rule,star3:"一次就撐過、不用提示",rules:{maxMistakes3:0,maxMistakes2:1},
    steps:[{t:"relay",say:OY_SAY.zf.in[era]||"",start:{fen:OY_ZF_FEN,turn:"r"},human:"r",segs:[{who:"you",name:"你",n:20,keep:["A","B"],opp:{ai},hint:"撐過 20 步：帥不被將死，仕、相一顆都不能丟。",fail:OY_SAY.zf.fail}]}],
    outro:OY_SAY.zf.ok};
  jLevel(v,{id:"oy:zf:"+era+":"+dn,name:"張三丰（傳說人物）"},{G,rk:"jRunO",icon:"☯",back,title:`${typeof eraLabel==="function"?eraLabel(era):era}・張三丰讓一車一馬`,
    done:stars=>{oyZfDone(era);return stars},line:()=>"",get next(){return["回去",()=>goUp(back)]}})}
function oyZfDone(era){const S=oySt(),E=S.zf.era[era]||(S.zf.era[era]={n:0});const first=!E.ok;E.ok=Date.now();E.n=(E.n|0)+1;if(S.cur&&S.cur.w==="zf")S.cur.done=1;oySave(S);
  if(first&&typeof addXP==="function")setTimeout(()=>addXP(OY_WHO.zf.xp,"張三丰","ouyu:zf:"+era),600);
  try{const id="zhangsanfeng";if(typeof jSecrets==="function"&&!jSecrets()[id]&&typeof SECRETS!=="undefined"&&SECRETS.some(x=>x.id===id)){const C2=store.get("secretClue",{})||{};if(!C2[id]){C2[id]=Date.now();store.set("secretClue",C2);setTimeout(()=>toast("☯ 張三丰："+OY_SAY.zf.back),1800)}}}catch(e){}}
/* 上一盤跟電腦下被將死：記下來，張三丰才會出現（包一層 07-legend.js journeyGameEnd，08b 對局頁結束時呼叫；練習、和棋、贏棋不算） */
function oyGameEnd(st){try{if(!OUYU_ON||!st||!st.result||!st.result.w||st.practice)return;if(st.result.w!==st.human&&/將死/.test(st.result.why||"")){const S=oySt();S.zf.mated=Date.now();oySave(S)}}catch(e){}}
if(typeof journeyGameEnd==="function"){const oyJe0=journeyGameEnd;journeyGameEnd=function(st){const r=oyJe0.apply(this,arguments);oyGameEnd(st);return r}}
if(typeof portWind==="function"){const oyPw0=portWind;portWind=function(v,k){const r=oyPw0.apply(this,arguments);try{oyPage(v,k,"port")}catch(e){console.warn(e)}return r}}
if(typeof yzInn==="function"){const oyYz0=yzInn;yzInn=function(v,k){const r=oyYz0.apply(this,arguments);try{oyPage(v,k,"yz")}catch(e){console.warn(e)}return r}}
