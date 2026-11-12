/* ================= 💬 電腦對手的台詞（意見回饋 826 追加，開發者：根據角色的不同說不同的台詞）=================
   3D 園子裡坐在對面的人：開局開口（hi）、他贏了（win）、他輸了（lose）、和棋（draw）各說一句，也用在驛站下完棋的小提示。
   台詞來源（oppTalk 照這個順序認人，跟 08b-cpugame.js 決定對手造型的順序一樣）：
     石桌往事人物 JCHAR（章回棋路對弈關的 lvp.opp、大廳路過的 char:）→ hi／win／lose 照 JCHAR，和棋 OPT_JDRAW
     驛站旅人 INN、秘境棋友 SECRETS（inn:）→ hi 照原本的 say，win／lose／draw 照 OPT_INN／OPT_SEC（原本兩者共用「承讓了，下次再來！」「好棋！佩服。」）
     驛站路過的客人（inn:g.…，07m2-innguest.js）→ 照他原本那一類的台詞；和棋照下面各表，雲河七星用 WX_CHARS 的 draw
     朝代擂主 ARENA（st.arena）→ hi／win／lose 照 ARENA，和棋 OPT_CDRAW
     園子路人 PARK_NPC（park）→ say／win／lose 照原本，和棋 OPT_NDRAW
     章回棋路沒指定對手的對弈關（故事裡的對手是別人，坐在對面的是電腦的造型）→ OPT_STORY（不報名字的中性台詞）
     其他（挑戰電腦、錯棋重練、古戰場讓子對弈）→ 冷面國手 OPT_KM（Pikafish 的造型，回饋 418），不再自稱「Pikafish」
   線上對戰、觀戰的對手可能是真人，台詞照舊（09b-preload.js） */
const OPT_INN={tea:{win:"茶還熱著，這盤老身先收下囉。",lose:"好孩子，下得比老身的茶還順口。",draw:"不輸不贏，正好再續一壺茶。"},
  scholar:{win:"承讓承讓，這盤就當小生溫書了。",lose:"小生佩服，這一手得記進書箱裡。",draw:"和了？那就各自溫書，來日再下。"},
  guard:{win:"鏢車穩穩當當，這盤也送到了！",lose:"好身手！這趟鏢算你劫走了。",draw:"誰也沒劫到誰，鏢車照常上路！"},
  monk:{win:"阿彌陀佛，施主心急了些。",lose:"善哉，施主這一步走得自在。",draw:"和棋也好，不爭就是修行。"},
  teller:{win:"這一回，說書的贏了！明日請早。",lose:"好！這段我要編進下一回書裡。",draw:"勝負未分，且聽下回分解！"}};
const OPT_SEC={liuji:{win:"這一步，我早就算到了。",lose:"棋要先算退路……這回是你算得深。",draw:"誰也沒找到破綻，下回再推演。"},
  zhangsanfeng:{win:"你越用力，輸得越快。",lose:"以柔克剛……今天是你柔得好。",draw:"不爭不搶，和了也好。"},
  shinaian:{win:"這一回故事，結局歸我寫了。",lose:"精彩！這盤我要寫進稿子裡。",draw:"好漢對好漢，這回打成平手。"},
  shenwansan:{win:"這筆買賣，我賺到了。",lose:"捨得才有得，這盤我捨了。",draw:"不賺不賠，生意照做。"},
  changyuchun:{win:"衝就對了！哈哈，贏了！",lose:"好！打仗我不怕，下棋我服你！",draw:"沒分出勝負？下回本將軍再衝！"},
  wangmian:{win:"咦，我贏了？跟畫梅花一樣，隨手而已。",lose:"你下得好，我還是回去畫梅花吧。",draw:"和了。正好，我回去把梅花畫完。"}};
const OPT_CDRAW={classic:"和棋也是棋，老夫再泡一壺茶。",qin:"兩軍對峙，誰也沒退一步。",han:"勢均力敵，改日再運籌。",sanguo:"東風沒來，這把火燒不起來。",weijin:"不輸不贏，正好再飲一杯。",
  nanbei:"無勝無負，心如止水。",sui:"船到半途，風平浪靜。",tang:"長安花開兩朵，這盤平分。",wudai:"這幅畫，留白也好。",song:"茶湯一樣白，這盤平手。",yuan:"兩匹好馬並肩跑，誰也沒輸！",
  ming:"此局，暫且擱置再議。",qing:"哼，和棋……本格格下次一定贏。"};
const OPT_JDRAW={liu_young:"和了？不行，再來一盤！",shen_young:"和了。門關得好，誰也進不來。",agula_young:"馬跑不過去，也沒被追上。再來！",boatman:"船到對岸，誰也沒落水。",scholar:"論理論到最後，平分秋色。",liu_old:"和了。慢慢下，也不錯。"};
const OPT_NDRAW={w01_tang_lady:"牡丹開兩朵，這盤一人一朵。",w02_song_tea:"茶溫剛好，棋也剛好，和了。",w03_yuan_rider:"兩匹馬並著跑，誰也沒輸！",w04_ming_scholar:"平手……小生記下了，下回再請教。",
  w05_qing_gege:"和棋？這盤不算，再來！",w06_swordswoman:"旗鼓相當，江湖再會。",w07_fisher_girl:"魚沒跑，網也沒破，和了！",w08_embroider:"線頭對線頭，這盤剛好收平。",w09_qin_player:"一曲兩人合奏，不分高下。",
  w10_general:"兩軍對壘，鳴金收兵，改日再戰！",w11_yuan_falconer:"鷹在天上看了半天，也分不出輸贏。",w12_yuan_merchant:"不賺不賠，這筆買賣做平了。",w13_yuan_singer:"這齣戲，兩個主角一起謝幕。",
  w14_yuan_porcelain:"一筆一筆，畫成一對了。",w15_yuan_archer:"兩箭都中靶，平手！",w16_ming_poet:"上句下句對得剛好，和了。",w17_ming_pipa:"一曲彈完，餘音不分輸贏。",w18_ming_doctor:"脈象平和，這盤和了。",
  w19_ming_teahouse:"和棋！這壺茶，咱們一人一半。",w20_ming_guard:"人沒抓到，也沒跑掉，算你和。",niao:"畫眉也不知道該替誰叫好。",duanjin:"一來一往，跟打拳一樣，平手！",douhua:"和了？那豆花一人半碗。",
  fengzheng:"和了！我可以去追風箏了嗎？",mujiang:"榫頭對卯眼，剛剛好，和了。",amah:"噓——和了，孫子還睡得好好的。",daishu:"這盤和了，我照實記下。",tiaoshui:"和了！兩桶水一樣重。",genggu:"梆子還沒響，這盤先算平。",maihua:"和了？梅花先插在桌上，下次再說。"};
const OPT_KM={name:"幻影棋客",   /* 11/10 開發者選定：電腦對手改叫「幻影棋客」（原冷面國手） */hi:"坐吧，棋盤已經擺好了。",win:"一步一步，都在算裡。",lose:"……這一手，我沒算到。佩服。",draw:"勢均力敵，和局。"};
const OPT_STORY={hi:"請，該你走了。",win:"這盤是我的，再來吧。",lose:"好棋，這盤你贏了。",draw:"誰也沒贏，和了。"};
/* ---------- 🧮 笑面掌櫃（開發者 11/11 選定，story/97_笑面掌櫃實作.md）----------
   第二位電腦對手：茶肆的半個老闆，棋風取材自公開棋譜的統計（虛構角色，台詞都是自己寫的）。只在練功房、快速對局、盲棋；晉級賽固定幻影棋客（強度校準完成後再開放）。
   對局資料多一欄 opp:"zhanggui"（local.js zgOn；舊存檔沒有＝幻影棋客）。選過的記在 store cpuOpp（"km"／"zhanggui"）。
   台詞：開局 hi（掌櫃執紅）／hiB（掌櫃執黑）、玩家好棋 good、玩家失誤 slip、自己快贏 ahead、自己快輸 behind、和棋 draw、贏 win、輸 lose、過 60 手的持久戰預告 long。
   「客官」不用「客倌」：倌不在朝代字型的字集裡（fonts/charset.txt）。頭像先用文字「掌」字圓章（暖色），之後再決定要不要出圖 */
const OPT_ZG={name:"笑面掌櫃",intro:"和氣生財，精算盈虧，均勢愛兌子的茶肆老闆。",tags:["化繁為簡","後發制人","不戰而守"],
  hi:"客官請坐，我架個中炮陪您玩玩。",hiB:"客官先請，小店照規矩後手奉陪。",good:"算盤打得真精！這子我跟你換了。",slip:"哎呀，這筆帳客官您可是算漏了。",
  ahead:"本錢已厚，接下來就穩穩賺了。",behind:"虧點本沒事，我這店底子還撐得住。",draw:"和氣生財，這盤當作沒輸沒贏吧！",
  win:"承惠承惠，這盤小店賺了一點。",lose:"客官好算計，這筆帳我認了。",long:"客官好耐心，我可是很能撐的。"};
/* 幻影棋客的介紹卡（選對手用；名字和四句台詞照 OPT_KM） */
const OPT_KM_CARD={intro:"水墨裡走出來的幻影，算得精、下得準，強弱隨你調。",tags:["精準計算","強弱可調","冷靜不語"]};
const zgIs=st=>!!(st&&st.opp==="zhanggui"&&!st.ranked&&!st.practice&&!st.journey&&!st.arena);
const cpuOppName=st=>String(st&&st.journey||"").startsWith("gx:")?"🌌 "+((typeof gxGet==="function"&&gxGet(String(st.journey).slice(3))||{}).t||"第十四顆・鏡像"):String(st&&st.journey||"").startsWith("bh:")?"🌀 星樞":zgIs(st)?OPT_ZG.name:OPT_KM.name;   /* 黑洞星盤的對手是星樞（不是幻影棋客） */
const cpuOppPref=()=>store.get("cpuOpp","km")==="zhanggui"?"zhanggui":"km";
/* /play/new 要多帶的參數：晉級賽不帶（local.js 也會擋） */
const zgArg=(opp,ranked,zx)=>!ranked&&opp==="zhanggui"?{opp:"zhanggui",...(zx?{zgx:true}:{})}:{};
/* 「掌櫃真功夫」檔位（開發者 11/12）：訓練循環校準的強度（local.js ZG_X_NODES），只對笑面掌櫃、只在練功房與快速對局；選過記在 store zgX。
   開發者指定：App 裡不寫真實棋手的名字、不寫勝率數字 */
const ZG_X={name:"掌櫃真功夫",short:"真",desc:"掌櫃拿出真本事：強度照公開大師對局的勝率校準過，不跟著等級變。"};
const zgXOn=opp=>opp==="zhanggui"&&!!store.get("zgX",false);
/* 3D 園子裡的掌櫃：沒有立繪，用程式畫的小人（幞頭、褐色袍），身上照舊是帥／將；cus 用 k: 開頭，oppLine 不會拿擂主的台詞頂替 */
const ZG_LOOK=side=>({cus:"k:zg",p:side==="r"?"帥":"將",e:store.get("era","classic"),g:9,npc:OPT_ZG.name,about:OPT_ZG.intro,hat:"futou",hc:"#3a2a1e",robe:"#9A5B2C"});
function zgCss(){if(document.getElementById("zgCss"))return;const s=document.createElement("style");s.id="zgCss";s.textContent=`
.player .av.zg-av,.zg-stamp{background:radial-gradient(circle at 35% 30%,#f7d98a,#d0843a 62%,#93461a);color:#5a1806;border:2px solid #8a3e12;font-family:var(--kai,var(--serif,serif));font-weight:900}
.zg-stamp{display:inline-flex;align-items:center;justify-content:center;border-radius:50%;width:44px;height:44px;font-size:24px;flex:none;box-shadow:0 1px 4px rgba(0,0,0,.25)}
.zg-opps{display:grid;gap:10px}.zg-opp{display:flex;gap:12px;align-items:flex-start;text-align:left;width:100%;padding:10px 12px;border-radius:10px;border:1px solid var(--line);background:var(--card,#fff);font:inherit;color:inherit;cursor:pointer}
.zg-opp.on{border-color:#8a1e12;box-shadow:0 0 0 2px rgba(138,30,18,.25)}.zg-opp[disabled]{opacity:.55;cursor:default}
.zg-opp .zg-km{background:#2a2a2a;color:#eee;border-color:#555}.zg-opp b{font-size:16px}.zg-opp p{margin:2px 0 4px;font-size:13.5px;line-height:1.5}
.zg-opp>span:last-child{flex:1;min-width:0}.zg-opp .zg-hd{display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px}.zg-opp .zg-kind{font-style:normal;font-size:12px;padding:0 7px;border-radius:9px;border:1px solid var(--line);color:var(--muted);white-space:nowrap}
.zg-opp.on{background:color-mix(in srgb,#8a1e12 7%,var(--card,#fff))}.zg-more{margin-top:8px;font-size:13px;line-height:1.7}.zg-more summary{cursor:pointer;color:var(--muted)}.zg-more p{margin:4px 0 0}
.zg-opp .zg-tags{display:flex;flex-wrap:wrap;gap:4px}.zg-opp .zg-tags i{font-style:normal;font-size:12px;padding:1px 7px;border-radius:9px;background:rgba(138,30,18,.1);color:#8a1e12}
.zg-opp small{display:block;margin-top:4px;color:var(--muted);font-size:12.5px}`;document.head.append(s)}
/* 平面棋盤的對手列：掌櫃的頭像換成「掌」字圓章（playerHTML 產生的第一個 .av） */
const zgAvHTML=h=>String(h).replace(/^<div class="av ([rb])">[^<]*/,'<div class="av $1 zg-av" aria-label="笑面掌櫃">掌');
/* 11/11 ChatGPT 介面報告 P2（story/99_ChatGPT介面報告處理.md）：選對手卡＝名字＋「電腦對手」類型標示＋一句選擇理由＋一個最有區別的標籤；
   完整介紹（intro＋三個棋風標籤）收在卡片下面的「兩位的完整介紹」。各入口（雅間 zgOppSheet、練功房新局、快速對局、晉級賽新局）都用這一張。
   不寫真實棋手、模擬勝率、真人段位。key＝卡片上留的那一個標籤：幻影棋客「冷靜不語」（掌櫃會開口、他不會）、掌櫃「化繁為簡」（均勢愛兌子） */
const ZG_CARD={kind:"電腦對手",km:{why:"想調整難度，選這位。",key:"冷靜不語"},zhanggui:{why:"想練耐心找破綻，和掌櫃下一盤。",key:"化繁為簡"},
  rankNote:"笑面掌櫃的強度校準完成後再開放晉級賽・可在練功房對弈"};
/* 一張卡的文字（測試用）：{name,kind,why,key,note,on,dis,label} */
function zgCardOf(k,cur,ranked){const zg=k==="zhanggui",dis=!!ranked&&zg,on=!dis&&(ranked?k==="km":cur===k),nm=zg?OPT_ZG.name:OPT_KM.name,C=ZG_CARD[zg?"zhanggui":"km"];
  return{k:zg?"zhanggui":"km",name:nm,kind:ZG_CARD.kind,why:C.why,key:C.key,note:dis?ZG_CARD.rankNote:"",on,dis,label:nm+"，"+ZG_CARD.kind+"，"+(dis?"晉級賽暫不開放":on?"已選":"未選")}}
/* 選對手的兩張卡；ranked＝晉級賽（掌櫃那張不能選，註明之後才開放、可在練功房對弈）。aria-pressed＋aria-label 念「名字，電腦對手，已選／未選」，理由用 aria-describedby */
function zgOppHTML(cur,ranked){zgCss();const one=(k,av)=>{const c=zgCardOf(k,cur,ranked);
    return`<button type="button" class="zg-opp${c.on?" on":""}" data-opp="${c.k}"${c.dis?" disabled":""}${ranked?" data-rk=\"1\"":""} aria-pressed="${c.on}" aria-label="${esc(c.label)}" aria-describedby="zgw-${c.k}${c.note?" zgn-"+c.k:""}">${av}<span><span class="zg-hd"><b>${esc(c.name)}${c.on?"　✔":""}</b><em class="zg-kind">${esc(c.kind)}</em></span><p id="zgw-${c.k}">${esc(c.why)}</p><span class="zg-tags"><i>${esc(c.key)}</i></span>${c.note?`<small id="zgn-${c.k}">${esc(c.note)}</small>`:""}</span></button>`};
  const more=(nm,C)=>`<p><b>${esc(nm)}</b>：${esc(C.intro)}<br><span class="muted">${C.tags.map(esc).join("・")}</span></p>`;
  return`<div class="zg-opps">${one("km",'<span class="zg-stamp zg-km" aria-hidden="true">幻</span>')}${one("zhanggui",'<span class="zg-stamp" aria-hidden="true">掌</span>')}</div><details class="zg-more"><summary>兩位的完整介紹</summary>${more(OPT_KM.name,OPT_KM_CARD)}${more(OPT_ZG.name,OPT_ZG)}</details>`}
/* 卡片綁點選：選了就記 cpuOpp，回呼 done(opp)；晉級賽的卡（data-rk）不改練功房記住的對手 */
function zgOppBind(box,done){box.querySelectorAll("[data-opp]").forEach(x=>x.onclick=e=>{e.stopPropagation();if(x.disabled)return;vibrate(5);if(!x.dataset.rk)store.set("cpuOpp",x.dataset.opp);done&&done(x.dataset.opp)})}
function zgOppSheet(ranked,done){sheet("👤 選對手",b=>{b.innerHTML=(ranked?'<p class="muted" style="margin:0 0 10px;font-size:13.5px">晉級賽的對手固定是幻影棋客；笑面掌櫃的強度校準完成後再開放晉級賽。想跟掌櫃下，請到練功房。</p>':'<p class="muted" style="margin:0 0 10px;font-size:13.5px">兩位的強弱都照你選的級數；不同的是下棋的習慣。</p>')+zgOppHTML(cpuOppPref(),ranked);
  zgOppBind(b,o=>{closeSheet();done&&done(o)})})}
/* 對局中掌櫃開口：玩家走出妙著（good）、失著／敗著（slip）、掌櫃評分領先 ≥ 300（ahead）、落後 ≤ −300（behind）、過 60 手（long，每盤一次）。
   每種最多 2 次（ahead、behind、long 一次），兩句之間至少隔 6 手；3D 園子開著就讓他在園子裡說，不然用小提示。說過的記在 store zgSaid（只留目前這盤） */
function zgWatch(st,say,inPark){if(!zgIs(st)||st.result||!st.id)return;let S=store.get("zgSaid",null);if(!S||S.id!==st.id)S={id:st.id,c:{},at:-99,h:-1};
  const n=st.moves.length,bot=st.human==="r"?"b":"r",cap={hi:1,good:2,slip:2,ahead:1,behind:1,long:1};let k=null;
  if(!inPark&&n<=1&&!S.c.hi)k="hi";   /* 平面棋盤開局也打個招呼（3D 園子本來就會說 oppTalk 的 hi） */
  if(!k&&n>60&&!S.c.long)k="long";
  if(!k){for(let i=n-1;i>=Math.max(0,n-2);i--){const m=st.moves[i];if(m&&m.by===st.human&&m.q&&i>S.h){S.h=i;k=m.q==="妙著"?"good":/^(失著|敗著)$/.test(m.q)?"slip":null;break}}}
  if(!k&&st.eval&&st.eval.v!=null){const v=bot==="r"?st.eval.v:-st.eval.v;k=v>=300?"ahead":v<=-300?"behind":null}
  if(!k||(S.c[k]||0)>=cap[k]||(k!=="long"&&n-S.at<6)){store.set("zgSaid",S);return}
  S.c[k]=(S.c[k]||0)+1;S.at=n;store.set("zgSaid",S);try{say(k==="hi"?(bot==="r"?OPT_ZG.hi:OPT_ZG.hiB):OPT_ZG[k],k)}catch(e){}}
const optQ=s=>String(s||"").replace(/^「|」$/g,"");
/* 驛站旅人、秘境棋友的四句（x＝INN／SECRETS 那一位） */
function innTalk(x){if(!x)return null;const L=OPT_INN[x.id]||OPT_SEC[x.id]||{win:"承讓了，下次再來！",lose:"好棋！佩服。",draw:"和了，下次再來。"};return{hi:optQ(x.say),...L}}
/* 這盤坐在對面的人說的話；jk＝石桌往事人物代號（08b 的 JOPP），n＝園子路人（parkNpcOf） */
function oppTalk(st,jk,n){if(!st)return OPT_KM;const j=String(st.journey||"");
  if(jk&&JCHAR[jk]){const J=JCHAR[jk];return{hi:J.hi,win:J.win,lose:J.lose,draw:OPT_JDRAW[jk]||OPT_STORY.draw}}
  {const a=innActor(j);if(a)return innTalk(a)}
  {const g=typeof igAct==="function"?igAct(j):null;if(g)return{hi:g.hi,win:g.win,lose:g.lose,draw:g.draw||OPT_STORY.draw}}
  if(st.arena&&ARENA[st.arena]){const A=ARENA[st.arena];return{hi:A.hi,win:A.win,lose:A.lose,draw:OPT_CDRAW[st.arena]||OPT_STORY.draw}}
  if(n)return{hi:n.say,win:n.win,lose:n.lose,draw:OPT_NDRAW[n.id]||OPT_STORY.draw};
  if(j&&j!=="park"&&!/^(inn|char|bt):/.test(j))return OPT_STORY;
  if(zgIs(st))return{...OPT_ZG,hi:st.human==="r"?OPT_ZG.hiB:OPT_ZG.hi};   /* 笑面掌櫃：他執紅說「架個中炮」，執黑換一句 */
  return OPT_KM}
/* 這盤的石桌往事人物代號（跟 08b-cpugame.js 的 JOPP 同一個判斷：章回棋路的 lvp.opp，或大廳路過的 char:） */
function optJk(st){let L=null;try{L=typeof lvPlayOf==="function"?lvPlayOf(st):null}catch(e){}const k=(L&&L.lvp&&L.lvp.opp)||(String(st&&st.journey||"").startsWith("char:")?st.journey.slice(5):null);return k&&JCHAR[k]?k:null}
