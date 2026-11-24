/* ================= 🏯 開局門派：隨行入派與循序訓練（開發者 11/18「直接用這個開工」：story/開局門派隨行入派循序訓練_Claude整併稿v3_2026-11-18.md）=================
   已加入隊伍的七星各自入派、各自進度：同一時間主修一派（轉修免費、舊進度凍結保留）；課程循序解鎖，完成上一課才開下一課；可回看、可重練。
   每派三階段 22 課（開發者 11/18 追加第二、三階段）：入門 1～6（整併稿第六節的六任務）→ 進階 7～16（同一個開局，對方十種應法各一課）→ 持黑 17～22（紅方六種開局，換你執黑走本派的路）。
   11/18 先開中炮門、起馬門、飛相門，同日補齊其他七派（tools/school/osc-src2.js），十派都開放；黑方應中炮的屏風馬、反宮馬、順炮、列炮四派第 1～16 課執黑、第三階段持紅。
   課程資料 data/opening-school.json（xiangqi-db/tools/school/osc-build.js 用 Pikafish 核驗產生：每一步可接受的著法、對方回應、吃大虧著法的反駁線），進課程頁才下載，不在首頁預載。
   判定：照實際走法與目標（JSON 裡的 ok／bad），不靠按鈕被點過；前兩課可看提示（記「引導通過」）；後四課看示範只記「練過」，要換一個新例子自己走一次才算。
   存檔：osc（跟旅程走，JOURNEY_KEYS）＝{v,m:{角色:{act 主修,s:{派:{cv 課程版本,at 入派時間,g 完成入門時間,l:{課:{p 通過時間,md 方式,d:[獨立完成的例子],pr:[看過示範的例子],cur:{ex,h 用過提示,dm 看過示範}}}}}}}}；
         oscClaim（不跟旅程、整個帳號）＝{課或 grad:派：時間}：修為只在帳號第一次完成時給（每課 +10、完成入門 +40），其他角色、重練、轉派回來都只給紀念紀錄。
   不改黑洞數值、不恢復隊長、不擋一般對局；不用體力、不扣修為；不新增匿名追蹤或上傳。
   路由：#/school＝開局棋路總覽；#/school/<角色>＝這位角色的門派修行頁；#/school/<角色>/<課>＝上課。前綴 osc */

/* ===== 純函式（BEGIN osc-core）：不碰畫面、store、時間由呼叫端給；test-osc-school.js 切出來跑 ===== */
const OSC=(()=>{
  const SCH=[
    {id:"central",nm:"中炮門",op:"中炮",say:"炮架中路，還要讓車馬跟上。",tag:["主動"],who:"雷借花、柳老篙"},
    {id:"screen",nm:"屏風馬門",op:"屏風馬",say:"雙馬互相照應，站穩再反擊。",tag:["穩健"],who:"秦長庚、行腳僧"},
    {id:"palace_horse",nm:"反宮馬門",op:"反宮馬",say:"炮馬協調，別讓自己的子互擋。",tag:["穩健","多變"],who:"女扮男裝的書生、背藥箱的女大夫"},
    {id:"same_cannon",nm:"順炮門",op:"順炮",say:"都架中炮，更要比誰出子快。",tag:["主動"],who:"常遇春、少年女將軍"},
    {id:"opposite_cannon",nm:"列炮門",op:"列炮",say:"別只看中路，另一翼也要顧。",tag:["主動","多變"],who:"勾欄的雜劇女伶、西域商隊的姑娘"},
    {id:"pawn",nm:"仙人指路門",op:"仙人指路",say:"先挺一兵，看清對手再展開。",tag:["多變"],who:"步越溪、施耐庵"},
    {id:"elephant",nm:"飛相門",op:"飛相局",say:"先安頓陣形，也要把大子走出來。",tag:["穩健"],who:"田飛燕、點茶的青盞姑娘"},
    {id:"horse",nm:"起馬門",op:"起馬局",say:"先出馬，保留改變方向的餘地。",tag:["多變"],who:"駱躍梅、草原女騎手"},
    {id:"cross_palace",nm:"過宮炮門",op:"過宮炮",say:"炮過宮，兩翼的子也要接得上。",tag:["多變"],who:"王冕、江南才女"},
    {id:"advisor_corner",nm:"仕角炮門",op:"仕角炮",say:"留著變化，下一步看對手。",tag:["穩健","多變"],who:"鐵連城、擺字攤的代書先生"}];
  /* 11/18 開發者「補其他七派的課程」：十派全開（課程都經 tools/school/osc-build.js 引擎核驗） */
  const OPEN=["central","horse","elephant","pawn","cross_palace","advisor_corner","screen","palace_horse","same_cannon","opposite_cannon"];
  /* 黑方應中炮的四派：第 1～16 課執黑，第三階段換邊「持紅」（你執紅，學面對這一派時怎麼應）；其他六派第 1～16 課執紅、第三階段持黑 */
  const BSIDE=["screen","palace_horse","same_cannon","opposite_cannon"],side=sid=>BSIDE.includes(sid)?"b":"r";
  /* 每派 22 課、三階段（開發者 11/18 追加「進階：對方十種應法」「持黑」）：1～6 入門（入門篇、應手篇、實戰篇），7～16 進階篇，17～22 持黑（或持紅）篇；全程循序 */
  const NL=22,LT=["認得起手","把子走出","看懂失誤","對手變了","接住中局","換局再試"];
  const pname=(sid,i)=>i===0?"入門":i===1?"進階":side(sid)==="b"?"持紅":"持黑";
  const stage=(n,sid)=>n<=2?"入門篇":n<=4?"應手篇":n<=6?"實戰篇":n<=16?(side(sid)==="b"?"進階篇・紅方十種走法":"進階篇・對方十種應法"):pname(sid,2)+"篇";
  const PART=[[1,6,"入門"],[7,16,"進階"],[17,22,"持黑"]];
  const BLK=["持黑對中炮","持黑對仙人指路","持黑對飛相","持黑對起馬","持黑對過宮炮","持黑對仕角炮"];
  const TT={central:LT.concat(["對屏風馬","對反宮馬","對順炮","對列炮","對挺卒","對飛象","對單提馬","對過宮炮","對士角炮","對三步虎"],BLK),
    horse:LT.concat(["對挺卒（擋住馬路）","對挺卒（另一邊）","對中炮（同一邊）","對中炮（另一邊）","對跳馬（同一邊）","對跳馬（另一邊）","對飛象","對過宮炮","對士角炮","對邊馬"],BLK),
    elephant:LT.concat(["對中炮（同一邊）","對中炮（另一邊）","對挺卒","對挺卒（另一邊）","對跳馬","對跳馬（另一邊）","對飛象","對過宮炮","對士角炮","對邊馬"],BLK)};
  /* 其他七派（11/18）：課程規格在 tools/school/osc-src2.js */
  {const X10=["對中炮（一）","對中炮（二）","對挺卒（一）","對挺卒（二）","對跳馬（一）","對跳馬（二）","對飛象（一）","對飛象（二）","對士角炮（一）","對士角炮（二）"],
     SYS=["對過河車","對巡河車","對進七兵","對進三兵","對五七炮","對五六炮","對巡河炮","對邊馬","對正馬","對補仕"];
   TT.pawn=LT.concat(["對挺卒","對卒底炮","對中炮（同側）","對中炮（另一側）","對跳馬（同側）","對跳馬（另一側）","對飛象（同側）","對飛象（另一側）","對士角炮","對過宮炮"],BLK);
   TT.cross_palace=LT.concat(X10,BLK);TT.advisor_corner=LT.concat(X10,BLK);
   TT.screen=LT.concat(SYS,["持紅：剛成屏風馬","持紅：屏風馬直車","持紅：屏風馬挺卒","持紅：屏風馬挺另一邊的卒","持紅：屏風馬飛象","持紅：另一邊的屏風馬"]);
   TT.palace_horse=LT.concat(SYS,["持紅：剛成反宮馬","持紅：反宮馬三步成形","持紅：反宮馬挺卒","持紅：雙方挺兵跳馬","持紅：另一邊的反宮馬","持紅：反宮馬飛象"]);
   TT.same_cannon=LT.concat(SYS,["持紅：對方走順炮","持紅：雙方跳馬護中路","持紅：對方出橫車","持紅：雙方出直車","持紅：另一邊的順炮","持紅：對方先跳另一匹馬"]);
   TT.opposite_cannon=LT.concat(SYS,["持紅：對方走列炮","持紅：雙方跳馬護中路","持紅：對方出橫車","持紅：雙方出直車","持紅：另一邊的列炮","持紅：對方先跳另一匹馬"])}
  /* 每課的學習目的（鎖住的課也能看這一句）：1～6 照整併稿第七節 */
  const GOAL={central:["辨認炮居中路的作用","中炮後出馬、開車","找出急著走炮造成的失誤","遇不同的黑方應法，改發展計畫","讓車馬接上中路攻勢","換翼、換走序，選正常發展",
      "雙馬守中卒，比出車速度","對方還在協調，先出子","中兵被看著，先跳馬護住","列炮看中兵，先護住再出車","中卒沒人保護，中炮打中卒","對方求穩，照常出子","正馬護中卒，比出子速度","中卒沒人保護，抓住機會","士角炮護不到中卒，抓住機會","搶先出車，佔住對方要搶的路",
      "後手也架中炮（順炮或列炮），再出子","面對仙人指路，持黑架中炮","面對飛相，持黑架中炮","面對起馬，持黑架中炮","面對過宮炮，持黑架中炮","面對仕角炮，持黑架中炮"],
    horse:["看清起馬與馬腳","用兵路替馬留空間","修正重複跳馬的慢手","根據對方的炮、兵改計畫","選擇活馬，而非原地兜圈","等價的好棋都要能接受",
      "這邊被封，換方向出子","從沒被看住的一邊發展","起馬已護中兵，放心出子","中兵有馬保護，照常出子","雙方起馬，挑一個方向","看清馬腳，讓馬有路","對方求穩，可轉中炮","對方調炮位，搶先發展","保留變化，先出子","邊馬護不到中卒，架中炮",
      "面對中炮，持黑起馬","面對仙人指路，持黑起馬","面對飛相，持黑起馬","面對起馬，持黑也起馬","面對過宮炮，持黑起馬","面對仕角炮，持黑起馬"],
    elephant:["飛相的目的與限制","飛相後把車馬走出來","修正只補士象、不發展","遇主動與緩進兩種應法","找到由穩轉主動的機會","換翼、換走序仍能正常出子",
      "相守中路，再跳馬護兵","穩住中路，再出子","對方慢，你就搶先發展","換方向發展","雙方比出子","陣形穩了就出子","一樣穩，比出子速度","對方調炮位，你先發展","看清方向，先出子","對方馬到邊上，搶先發展",
      "面對中炮，持黑飛象","面對仙人指路，持黑飛象","面對飛相，持黑也飛象","面對起馬，持黑飛象","面對過宮炮，持黑飛象","面對仕角炮，持黑飛象"]};
  {const ERR="看懂一步會吃虧的走法，改走好棋",B6=nm=>["面對中炮，先護中卒再走本派的路",`面對仙人指路，持黑${nm}`,`面對飛相，持黑${nm}`,`面對起馬，持黑${nm}`,`面對過宮炮，持黑${nm}`,`面對仕角炮，持黑${nm}`],
     X10=["中兵被看著，先跳馬護住","先護中兵再出子","對方慢，車馬先出","換方向出子","跳馬、出車接上兩翼","跟上出子","對方求穩，搶先發展","放心出子","看清對方的方向","趁對方調炮先出子"],
     SYS=["先看清車盯著誰","穩住馬，車炮跟上","加快出子","留意那一路的兵卒","看好被炮瞄著的那一路","穩住中路出車炮","看清巡河炮的目標","搶先出子","比出子速度","趁紅方慢一步爭先"];
   GOAL.pawn=["挺兵後看馬路與應手","兵、馬、炮協同發展",ERR,"面對不同應法換計畫","決定何時開路、何時發展","新局面選計畫，不強推過河",
     "兵已開路，車馬跟上","兵被炮瞄著，先處理","中兵被看著，先跳馬護住","先護中兵再出子","照常出子讓子跟上","保留選擇，照局面挑","對方求穩，可轉中炮","對方慢，你就多一步","看清對方方向再出子","趁對方調炮先出子"].concat(B6("挺卒"));
   GOAL.cross_palace=["辨認炮過宮的目的","讓兩翼車馬接得上",ERR,"對手換應法時調整發展","選一個可用的調度點","左右換邊、換走序再考"].concat(X10,B6("過宮炮"));
   GOAL.advisor_corner=["辨認宮角起手的用意","選後續發展方向",ERR,"對方不同應手時決定怎麼發展","處理出子的需求","分清起手來源與本局形成的體系"].concat(X10,B6("仕角炮"));
   GOAL.screen=["對中炮辨認雙馬配置","安排雙馬與其他子協調",ERR,"中炮方改兵路、車路時換應法","守住後找主動發展","換走序仍辨認適用應局"].concat(SYS,["中卒有雙馬保護，比出子","讓車馬往前施壓","跟上出子","看清對方要打開哪一路","趁對方慢一步搶先","另一邊一樣比出子"]);
   GOAL.palace_horse=["辨認炮馬配置","解決子力互擋",ERR,"對方中炮不同後續的應法","從陣形中找出子機會","換走序仍能正常出子"].concat(SYS,["趁對方協調搶先出子","給對方壓力","照常出子","比出子速度","搶先出子","趁對方慢一步搶先"]);
   GOAL.same_cannon=["雙方炮位成立才認順炮","中炮對峙時把車馬走出",ERR,"對手改變出車計畫","在攻守間選一個有效節奏","換走序仍能正常出子"].concat(SYS,["中兵被看著，先護住","中路護好，比出子","看清對方車的去向","讓另一邊的子出來","先護中兵再出子","留意中路的機會"]);
   GOAL.opposite_cannon=["辨認列炮與順炮的差異","看兩翼發展與聯絡",ERR,"面對不同的進攻方向","先解當前威脅再展開","換走序仍能正常出子"].concat(SYS,["中兵被看著，先護住","中路護好，比出子","看清對方車的去向","讓另一邊的子出來","先護中兵再出子","留意中路的機會"])}
  const title=(sid,n)=>(TT[sid]||LT)[n-1]||("第 "+n+" 課");
  /* 七星推薦（不自動入派、不鎖本命子）：整併稿第四節 A */
  const REC={x_swordboy:["central","same_cannon"],x_spiritgirl:["elephant","screen"],x_martialgirl:["central","opposite_cannon"],x_miaogirl:["horse","screen"],
    x_shuai:["pawn","elephant"],x_shi:["advisor_corner","screen"],x_bing:["pawn","horse"]};
  /* 41 位師友的主修／副修（棋風資料；不是玩家的入派）：整併稿第四節 B～E。鍵用 npc:／inn:／secret: 前綴，不讓兩位書生、說書人互撞 */
  const NPC={"inn:tea":["elephant","pawn","賣茶的老婦"],"inn:scholar":["advisor_corner","horse","趕考的書生"],"inn:guard":["same_cannon","central","走鏢的鏢師"],"inn:monk":["screen","elephant","行腳僧"],"inn:teller":["opposite_cannon","cross_palace","說書人"],
    "npc:niao":["elephant","screen","遛鳥的老伯"],"npc:duanjin":["same_cannon","central","練八段錦的大娘"],"npc:douhua":["pawn","advisor_corner","賣豆花的小販"],"npc:fengzheng":["horse","pawn","放風箏的孩子"],"npc:mujiang":["cross_palace","central","收工的木匠"],
    "npc:amah":["screen","elephant","抱孫子的阿嬤"],"npc:daishu":["advisor_corner","palace_horse","擺字攤的代書先生"],"npc:tiaoshui":["pawn","horse","挑水的少年"],"npc:genggu":["opposite_cannon","same_cannon","打更的老更夫"],"npc:maihua":["elephant","cross_palace","賣花的姑娘"],
    "npc:w01_tang_lady":["advisor_corner","palace_horse","長安的牡丹娘子"],"npc:w02_song_tea":["elephant","screen","點茶的青盞姑娘"],"npc:w03_yuan_rider":["horse","screen","草原女騎手"],"npc:w04_ming_scholar":["palace_horse","advisor_corner","女扮男裝的書生"],
    "npc:w05_qing_gege":["cross_palace","opposite_cannon","溜出府看棋的格格"],"npc:w06_swordswoman":["opposite_cannon","central","路過的江湖女俠"],"npc:w07_fisher_girl":["pawn","palace_horse","水鄉漁家女"],"npc:w08_embroider":["screen","elephant","蘇州繡娘"],
    "npc:w09_qin_player":["advisor_corner","elephant","抱琴的女琴師"],"npc:w10_general":["same_cannon","central","少年女將軍"],"npc:w11_yuan_falconer":["horse","pawn","馴鷹少女"],"npc:w12_yuan_merchant":["opposite_cannon","cross_palace","西域商隊的姑娘"],
    "npc:w13_yuan_singer":["opposite_cannon","same_cannon","勾欄的雜劇女伶"],"npc:w14_yuan_porcelain":["elephant","advisor_corner","畫青花的女工"],"npc:w15_yuan_archer":["central","horse","草原女射手"],"npc:w16_ming_poet":["cross_palace","pawn","江南才女"],
    "npc:w17_ming_pipa":["elephant","cross_palace","秦淮琵琶女"],"npc:w18_ming_doctor":["palace_horse","pawn","背藥箱的女大夫"],"npc:w19_ming_teahouse":["pawn","advisor_corner","茶館少東家"],"npc:w20_ming_guard":["screen","same_cannon","女捕快"],
    "secret:liuji":["central","palace_horse","劉伯溫"],"secret:zhangsanfeng":["screen","horse","張三丰"],"secret:shinaian":["pawn","opposite_cannon","施耐庵"],"secret:shenwansan":["elephant","advisor_corner","沈萬三"],"secret:changyuchun":["same_cannon","central","常遇春"],"secret:wangmian":["cross_palace","elephant","王冕"]};
  const sch=id=>SCH.find(s=>s.id===id)||null,isOpen=id=>OPEN.includes(id);
  const lid=(sid,n)=>sid+"_"+String(n).padStart(2,"0");
  const blank=()=>({v:1,m:{}});
  const arr=a=>Array.isArray(a)?a.filter(x=>typeof x==="string").slice(0,20):[];
  /* 讀進來先驗型別：壞欄位丟掉、不認得的角色丟掉；不認得的派、課照留（課程更新時保留舊紀錄） */
  function norm(o,chars){const R=blank();if(!o||typeof o!=="object"||!o.m||typeof o.m!=="object")return R;
    for(const c of chars||[]){const m=o.m[c];if(!m||typeof m!=="object"||!m.s||typeof m.s!=="object")continue;const M={act:"",s:{}};
      for(const sid of Object.keys(m.s)){const s=m.s[sid];if(!/^[a-z_]{2,20}$/.test(sid)||!s||typeof s!=="object")continue;const S={cv:+s.cv||1,at:+s.at||0,l:{}};for(const g of["g","g2","g3"])if(+s[g])S[g]=+s[g];
        if(s.l&&typeof s.l==="object")for(const k of Object.keys(s.l)){const L=s.l[k];if(!/^[a-z_]+_\d\d$/.test(k)||!L||typeof L!=="object")continue;const X={d:arr(L.d),pr:arr(L.pr)};if(L.hg)X.hg=1;
          if(+L.p){X.p=+L.p;X.md=L.md==="guided"?"guided":"solo"}if(L.cur&&typeof L.cur==="object"&&typeof L.cur.ex==="string")X.cur={ex:L.cur.ex,h:L.cur.h?1:0,dm:L.cur.dm?1:0};S.l[k]=X}
        M.s[sid]=S}
      M.act=M.s[m.act]?m.act:"";if(Object.keys(M.s).length)R.m[c]=M}
    return R}
  const rec=(o,c,sid)=>o&&o.m&&o.m[c]&&o.m[c].s&&o.m[c].s[sid]||null;
  const act=(o,c)=>o&&o.m&&o.m[c]&&o.m[c].act||"";
  /* 入派（或轉修）：只開放的派；已有的進度不動，只換主修 */
  function enroll(o,c,sid,now){if(!isOpen(sid))return false;const m=o.m[c]=o.m[c]||{act:"",s:{}};if(!m.s[sid])m.s[sid]={cv:1,at:now||0,l:{}};m.act=sid;return true}
  const passed=(o,c,sid,n)=>{const S=rec(o,c,sid);return!!(S&&S.l[lid(sid,n)]&&S.l[lid(sid,n)].p)};
  /* 第 n 課（1～22）：passed 通過、open 可上、locked 還鎖著（前一課沒過；第 7 課要先完成入門六課、第 17 課要先完成進階十課，都包含在「前一課」裡） */
  function state(o,c,sid,n){if(!rec(o,c,sid)||n<1||n>NL)return"locked";if(passed(o,c,sid,n))return"passed";return n===1||passed(o,c,sid,n-1)?"open":"locked"}
  const count=(o,c,sid,a,b)=>{let k=0;for(let n=a||1;n<=(b||NL);n++)if(passed(o,c,sid,n))k++;return k};
  /* 下一課（第一個還沒過的）；全過＝0 */
  const next=(o,c,sid)=>{for(let n=1;n<=NL;n++)if(!passed(o,c,sid,n))return n;return 0};
  /* 目前在哪一階段：[起,迄,名稱]；全過＝最後一段 */
  const part=(o,c,sid)=>{const x=next(o,c,sid)||NL;return PART.find(p=>x>=p[0]&&x<=p[1])};
  const hash=s=>{let h=7;for(const ch of String(s))h=(h*31+ch.charCodeAt(0))>>>0;return h};
  /* 挑例子：先接著上次那一題；再挑這位角色還沒獨立完成、也還沒看過示範的；不同角色從不同位置開始輪（同門的人題例錯開） */
  function pick(ids,c,L){L=L||{};const d=L.d||[],pr=L.pr||[];if(L.cur&&ids.includes(L.cur.ex))return L.cur.ex;const n=ids.length;if(!n)return"";const st=hash(c)%n,rot=ids.map((_,i)=>ids[(st+i)%n]);
    return rot.find(x=>!d.includes(x)&&!pr.includes(x))||rot.find(x=>!d.includes(x))||rot[0]}
  function lessonRec(o,c,sid,n){const S=rec(o,c,sid);if(!S)return null;const k=lid(sid,n);return S.l[k]=S.l[k]||{d:[],pr:[]}}
  /* 開始（或接著）一個例子：記在 cur，重新整理不會把提示、示範的使用紀錄清掉 */
  function begin(o,c,sid,n,ex){const L=lessonRec(o,c,sid,n);if(!L)return null;if(!L.cur||L.cur.ex!==ex)L.cur={ex,h:0,dm:0};return L.cur}
  function mark(o,c,sid,n,k){const L=lessonRec(o,c,sid,n);if(L&&L.cur)L.cur[k]=1}
  /* 走完一個例子：第 1、2 課看過提示也算（引導通過）；其他課看過示範只記練過、要換新例子。同一個例子不重複算。
     回傳 {ok 這題有沒有算數, pass 這課這次剛通過, need 還差幾題, grad 這次剛完成哪一階段（1 入門、2 進階、3 持黑；0 沒有）} */
  function finish(o,c,sid,n,ex,need,now){const L=lessonRec(o,c,sid,n);if(!L)return null;const cur=L.cur&&L.cur.ex===ex?L.cur:{h:0,dm:0};delete L.cur;
    const was=!!L.p,okEx=n<=2||!cur.dm;
    if(okEx){if(!L.d.includes(ex)){L.d.push(ex);if(cur.h||cur.dm)L.hg=1}}else if(!L.pr.includes(ex))L.pr.push(ex);
    if(!was&&L.d.length>=need){L.p=now||1;L.md=L.hg?"guided":"solo"}
    const S=rec(o,c,sid);let grad=0;PART.forEach((p,i)=>{const k=i?"g"+(i+1):"g";if(!S[k]&&count(o,c,sid,p[0],p[1])>=p[1]-p[0]+1){S[k]=now||1;grad=i+1}});
    return{ok:okEx,pass:!was&&!!L.p,need:Math.max(0,need-L.d.length),grad}}
  /* 帳號層的修為（每課 10、每完成一個階段 40），只發第一次；claim＝oscClaim 物件（會被改） */
  function reward(claim,sid,n,res,now){let xp=0;const k=lid(sid,n);if(res&&res.pass&&!claim[k]){claim[k]=now||1;xp+=10}const g=res&&res.grad?"grad:"+sid+":"+res.grad:"";if(g&&!claim[g]){claim[g]=now||1;xp+=40}return xp}
  /* 本局實際形成的體系（整併稿第九節 4：棋盤頂欄「本局」，跟對手慣用分開）：m＝從標準開局走的 ICCS 著法。
     只看雙方頭幾手；順炮、列炮、屏風馬、反宮馬要雙方配置都成立才標，還不能確定回「佈局中」，看不出來的寫「其他應法」，不硬套名稱 */
  const RED1={h2e2:"中炮",b2e2:"中炮",c3c4:"仙人指路",g3g4:"仙人指路",g0e2:"飛相局",c0e2:"飛相局",h0g2:"起馬局",b0c2:"起馬局",h2d2:"過宮炮",b2f2:"過宮炮",b2d2:"仕角炮",h2f2:"仕角炮"};
  function classify(m){m=m||[];if(!m.length)return"佈局中";const op=RED1[m[0]];if(!op)return m.length>=2?"其他開局":"佈局中";if(op!=="中炮"||m.length<2)return op;
    const sd=m[0][0],b1=m[1],has=u=>m.length>=4&&(m[1]===u||m[3]===u),b2=m[3];
    if(b1==="h7e7"||b1==="b7e7")return b1[0]===sd?"中炮對順炮":"中炮對列炮";
    if(b1==="g6g5"||b1==="c6c5")return"中炮對進卒";if(b1==="c9e7"||b1==="g9e7")return"中炮對飛象";
    if(b1==="h7d7"||b1==="b7f7")return"中炮對過宮炮";if(b1==="h7f7"||b1==="b7d7")return"中炮對士角炮";
    if(b1==="h9g7"||b1==="b9c7"){if(m.length<4)return"中炮・佈局中";
      if(has("h9g7")&&has("b9c7"))return"中炮對屏風馬";if((has("b9c7")&&has("h7f7"))||(has("h9g7")&&has("b7d7")))return"中炮對反宮馬";
      if((has("b9c7")&&has("h9i7"))||(has("h9g7")&&has("b9a7")))return"中炮對單提馬";if((has("h9g7")&&has("h7i7"))||(has("b9c7")&&has("b7a7")))return"中炮對三步虎";
      return b2?"中炮（其他應法）":"中炮・佈局中"}
    return"中炮（其他應法）"}
  /* ===== 十派掌門（開發者 11/18：「請 gemini/tripo 繪製 10 個門派的掌門人，讓玩家除了挑戰自己掌門人，也可以挑戰其他門派的掌門人，列入千秋大百科裡面」「門派掌門人：五男五女」；
     設計稿 story/十派掌門_設計稿_1118.md 開發者選單照稿同意；立繪 data/npc/zm_*.webp 逐張看過定稿）=====
     r0＝起始強度（local.js 的段位強度 rlv：8 業5、9 業6、10 業7、11 業8…15 專2-1）；贏一盤強一段、輸一盤弱一段，浮動範圍 ZB。掌門比門下棋友高一截，不用最上面兩級，不叫宗師 */
  const MST=[
    {id:"zm_central",sid:"central",sec:"same_cannon",nm:"葛青禾",en:"Ge Qinghe",sx:"f",age:36,pc:"車",who:"淮安漕船船戶的女兒，在雲河碼頭開「青禾茶棧」",r0:10,
      say:"炮先到中路，車馬要跟得上，不然就是空架子。",pre:"茶給你斟好了。炮架起來，車馬跟不跟得上，一盤就知道。",win:"炮是先到了，車還在家睡覺呢。下次早點叫醒它。",lose:"好！出子比我還快。這壺茶算我的。"},
    {id:"zm_screen",sid:"screen",sec:"elephant",nm:"溫若蘅",en:"Wen Ruoheng",sx:"f",age:52,pc:"士",who:"鳳陽人，在雲河鎮開女塾，教女童識字、算帳、下棋",r0:10,
      say:"雙馬守住了，才有本錢反擊。",pre:"坐吧。先站穩，再說輸贏。",win:"你急了。站穩的一方，總會等到機會。",lose:"守得住，也攻得進。這一盤，我記下了。"},
    {id:"zm_palace_horse",sid:"palace_horse",sec:"screen",nm:"陶秉衡",en:"Tao Bingheng",sx:"m",age:45,pc:"砲",who:"徽州歙縣刻書坊的刻版師傅，跟著書船來雲河鎮",r0:11,
      say:"炮馬要互相照應，自己的子別擋自己的路。",pre:"刻版跟下棋一樣，一刀錯，整版都歪。慢慢來。",win:"你的子擠成一團了。讓開一步，路就出來。",lose:"子子都有路走。這一版，刻得乾淨。"},
    {id:"zm_same_cannon",sid:"same_cannon",sec:"central",nm:"霍驚瀾",en:"Huo Jinglan",sx:"m",age:29,pc:"卒",who:"淮河鹽船上的護船拳師，船靠雲河鎮就來擺一盤",r0:9,
      say:"都架中炮，就比誰的車馬先到。",pre:"你架中炮，我也架。痛快下一盤！",win:"慢了半步，就差在這裡。再來！",lose:"輸了就是輸了。你的車，比我的快。"},
    {id:"zm_opposite_cannon",sid:"opposite_cannon",sec:"cross_palace",nm:"顏照秋",en:"Yan Zhaoqiu",sx:"f",age:24,pc:"馬",who:"南京崑腔戲班的鼓板師，戲班巡演到泗州就抽空來棋會",r0:9,
      say:"中路以外，另一翼也是戰場。",pre:"鼓點一換，戲就換場。你看得出我從哪邊來嗎？",win:"你只盯著中路，我早換到另一邊了。",lose:"兩翼都被你顧到了！這齣戲，你唱得比我好。"},
    {id:"zm_pawn",sid:"pawn",sec:"horse",nm:"季聽蘭",en:"Ji Tinglan",sx:"f",age:61,pc:"象",who:"揚州鹽商家的老太太，每年重陽坐船來看棋、下棋",r0:11,
      say:"先挺一兵，聽聽對方怎麼回答。",pre:"老身先挺個兵，你慢慢回，不急。",win:"你一開口，老身就聽出你要往哪裡去了。",lose:"好孩子，這回是你先看清了我。"},
    {id:"zm_elephant",sid:"elephant",sec:"advisor_corner",nm:"孟懷瑾",en:"Meng Huaijin",sx:"m",age:66,pc:"將",who:"致仕的縣學教諭，棋會的老規矩多半是他記著",r0:10,
      say:"陣形先安，大子要出；穩，不是不動。",pre:"先把陣形安頓好，再談攻守。請。",win:"你一直補士補象，大子卻沒出來。穩，不是不動啊。",lose:"陣形穩，出子也快。老夫佩服。"},
    {id:"zm_horse",sid:"horse",sec:"pawn",nm:"褚子驍",en:"Chu Zixiao",sx:"m",age:19,pc:"車",who:"運河驛站的馬伕，送公文的空檔就來棋會",r0:9,
      say:"馬先出來，往哪裡走，看清楚再說。",pre:"馬先放出來！你往哪邊，我就往哪邊跑。",win:"你把路堵住了，我就換一條。馬嘛，總有路。",lose:"哇，馬腳被你絆得死死的！再教我一盤！"},
    {id:"zm_cross_palace",sid:"cross_palace",sec:"opposite_cannon",nm:"黎疏桐",en:"Li Shutong",sx:"f",age:42,pc:"卒",who:"涇縣宣紙作坊的坊主，送紙到南北書坊，常在雲河鎮換船",r0:10,
      say:"炮換到另一翼，兩邊的子才接得上。",pre:"造紙講究一道一道工序。下棋也是，先把炮挪好。",win:"你一翼太擠、一翼太空，紙就晾歪了。",lose:"兩翼都接上了，平平整整。好棋。"},
    {id:"zm_advisor_corner",sid:"advisor_corner",sec:"palace_horse",nm:"方硯冰",en:"Fang Yanbing",sx:"m",age:57,pc:"士",who:"雲河鎮「萬寶齋」當鋪的朝奉，估價從不先開口",r0:11,
      say:"先留著變化，看對方怎麼走，再決定路。",pre:"當鋪的規矩：先看貨，再開價。你先請。",win:"你太早把底牌亮出來了，價錢就由我開了。",lose:"嗯，這一手估得準。這回算我看走眼。"}];
  const ZB=[8,15],RNK=["新手","入門1","入門2","入門3","業1","業2","業3","業4","業5","業6","業7","業8","業9","專1-1","專1-2","專2-1","專2-2"];
  const mst=id=>MST.find(m=>m.id===String(id||"").replace(/^inn:/,""))||null;
  /* 誰執紅：黑方應中炮的四派，掌門執黑（玩家執紅）才走得出本派；其他六派掌門執紅 */
  const mside=m=>side(m.sid)==="b"?"b":"r";
  const zmBlank=()=>({adj:{},r:{}});
  function zmNorm(z,chars){const R=zmBlank();if(!z||typeof z!=="object")return R;const ids=MST.map(m=>m.id),int=v=>Math.max(0,Math.round(+v||0));
    if(z.adj&&typeof z.adj==="object")for(const id of ids)if(Number.isInteger(z.adj[id]))R.adj[id]=Math.max(ZB[0],Math.min(ZB[1],z.adj[id]));
    if(z.r&&typeof z.r==="object")for(const c of chars||[]){const x=z.r[c];if(!x||typeof x!=="object")continue;for(const id of ids){const o=x[id];if(!o||typeof o!=="object")continue;(R.r[c]=R.r[c]||{})[id]={n:int(o.n),w:int(o.w),l:int(o.l),d:int(o.d)}}}
    return R}
  const zmRlv=(z,m)=>{const v=z&&z.adj&&z.adj[m.id];return Math.max(ZB[0],Math.min(ZB[1],Number.isInteger(v)?v:m.r0))};
  /* 下完一盤：res＝"w" 玩家贏／"l" 玩家輸／"d" 和；c＝開局時記下的修行角色（中途換隨行不改結算對象）；rl＝這一盤的強度 */
  function zmEnd(z,c,m,res,rl){if(res==="w")z.adj[m.id]=Math.min(ZB[1],rl+1);else if(res==="l")z.adj[m.id]=Math.max(ZB[0],rl-1);
    if(c){const R=z.r[c]=z.r[c]||{},o=R[m.id]=R[m.id]||{n:0,w:0,l:0,d:0};o.n++;o[res]=(o[res]||0)+1}return z}
  const zmRec=(z,c,id)=>z&&z.r&&z.r[c]&&z.r[c][id]||{n:0,w:0,l:0,d:0};
  /* 贏過的掌門（任何一位角色）：大百科「已勝 X／10」 */
  const zmBeaten=z=>MST.filter(m=>Object.values((z&&z.r)||{}).some(R=>R[m.id]&&R[m.id].w>0)).map(m=>m.id);
  /* 修為：整個帳號第一次贏這位掌門 +30；其他角色、再贏都不重給（claim＝oscClaim） */
  function zmReward(claim,m,res,now){if(res!=="w"||claim["zm:"+m.id])return 0;claim["zm:"+m.id]=now||1;return 30}
  return{SCH,OPEN,NL,LT,TT,PART,stage,title,GOAL,side,pname,BSIDE,REC,NPC,sch,isOpen,lid,blank,norm,rec,act,enroll,passed,state,count,next,part,pick,begin,mark,finish,reward,hash,classify,
    MST,ZB,RNK,mst,mside,zmBlank,zmNorm,zmRlv,zmEnd,zmRec,zmBeaten,zmReward}})();
/* ===== END osc-core ===== */

/* 旅程存檔鍵 m_osc 加在 05b-save.js（JK 集合建立之前，讀入存檔才收得到） */
function oscGet(){let o=null;try{o=OSC.norm(store.get("osc",null),PTY.ORDER)}catch(e){o=OSC.blank()}return o}
function oscSave(o){try{store.set("osc",o)}catch(e){}}
const oscNm=c=>{try{return WX_CHARS[c].n}catch(e){return c}};
const oscTa=c=>{try{return WX_CHARS[c].sx==="f"?"她":"他"}catch(e){return"他"}};
/* 11/18 開發者「英文翻完再發」：英文模式畫面的句子在這裡直接組成英文，不靠翻譯器拆句。
   oscT＝整句查字典（內建＋外掛 data/i18n-en.json：課文、派名、課名、目標、著法），查不到留原文；oscL(中文,英文) 帶變數的句子兩種寫法並列；中文模式完全照舊 */
const oscEn=()=>typeof i18nLang==="function"&&i18nLang()==="en";
const OSC_PC1={帥:"General",將:"General",仕:"Advisor",士:"Advisor",相:"Elephant",象:"Elephant",馬:"Horse",傌:"Horse",車:"Chariot",俥:"Chariot",炮:"Cannon",砲:"Cannon",兵:"Soldier",卒:"Soldier"};   /* 單字棋子不進外掛字典（黑洞頭像圈、星槎棋子章放不下英文），課程的選項在這裡自己對 */
const OSC_EN0={"中炮":"Central Cannon","中炮門":"Central Cannon School","中路以外，另一翼也是戰場。":"Beyond the center, the other wing is a battlefield too.","仕角炮":"Advisor-Corner Cannon","仕角炮門":"Advisor-Corner Cannon School","仙人指路":"Immortal Points the Way","仙人指路門":"Immortal Points the Way School","你一直補士補象，大子卻沒出來。穩，不是不動啊。":"You kept adding advisors and elephants, but your big pieces never came out. Steady isn't the same as still.","你一翼太擠、一翼太空，紙就晾歪了。":"One wing too crowded, the other too empty—like paper hung crooked to dry.","你一開口，老身就聽出你要往哪裡去了。":"The moment you answered, I could hear where you were heading.","你只盯著中路，我早換到另一邊了。":"You only watched the center—I'd already switched sides.","你太早把底牌亮出來了，價錢就由我開了。":"You showed your hand too early, so I got to name the price.","你急了。站穩的一方，總會等到機會。":"You hurried. The side that stands firm always gets its chance.","你把路堵住了，我就換一條。馬嘛，總有路。":"You blocked the road, so I took another. A horse always finds a way.","你架中炮，我也架。痛快下一盤！":"You set up the center cannon, so will I. Let's have a proper game!","你的子擠成一團了。讓開一步，路就出來。":"Your pieces got tangled. Step one aside and the road opens.","先出馬，保留改變方向的餘地。":"Bring out a Horse first and keep room to change direction.","先安頓陣形，也要把大子走出來。":"Settle your formation first, but still bring out the major pieces.","先把陣形安頓好，再談攻守。請。":"Settle your formation first, then we can speak of attack and defense. Please.","先挺一兵，看清對手再展開。":"Advance a Soldier first, read your opponent, then unfold.","先挺一兵，聽聽對方怎麼回答。":"Push one pawn first, and listen to how your opponent answers.","先留著變化，看對方怎麼走，再決定路。":"Keep your options open, watch your opponent's move, then choose your road.","兩翼都接上了，平平整整。好棋。":"Both wings connected, smooth and even. A fine game.","兩翼都被你顧到了！這齣戲，你唱得比我好。":"You covered both wings! You played this scene better than I did.","列炮":"Opposing Cannons","列炮門":"Opposing Cannons School","別只看中路，另一翼也要顧。":"Don't watch only the center; guard the other flank too.","刻版跟下棋一樣，一刀錯，整版都歪。慢慢來。":"Carving a woodblock is like chess—one wrong cut and the whole block is off. Take your time.","劉伯溫":"Liu Bowen","勾欄的雜劇女伶":"Variety-Theater Actress","勾欄的雜劇女伶、西域商隊的姑娘":"Variety-Theater Actress, Caravan Girl","南京崑腔戲班的鼓板師，戲班巡演到泗州就抽空來棋會":"Drum-and-clapper master of a Nanjing Kunqu troupe who visits the chess gathering on tour","反宮馬":"Reverse Palace Horse","反宮馬門":"Reverse Palace Horse School","哇，馬腳被你絆得死死的！再教我一盤！":"Whoa, you tripped up my horses completely! Teach me another game!","嗯，這一手估得準。這回算我看走眼。":"Hm, you valued that move well. This time I misjudged.","坐吧。先站穩，再說輸贏。":"Have a seat. First stand firm; then we'll talk about winning.","女扮男裝的書生":"Scholar in Disguise","女扮男裝的書生、背藥箱的女大夫":"Scholar in Disguise, Lady Doctor","女捕快":"Female Constable","好孩子，這回是你先看清了我。":"Good child—this time you read me first.","好！出子比我還快。這壺茶算我的。":"Well played! You developed faster than I did. This pot of tea is on me.","子子都有路走。這一版，刻得乾淨。":"Every piece had its path. A clean carving.","孟懷瑾":"Meng Huaijin","季聽蘭":"Ji Tinglan","守得住，也攻得進。這一盤，我記下了。":"You held firm and broke through too. I'll remember this game.","少年女將軍":"Young Female General","屏風馬":"Screen Horses","屏風馬門":"Screen Horses School","常遇春":"Chang Yuchun","常遇春、少年女將軍":"Chang Yuchun, Young Female General","張三丰":"Zhang Sanfeng","徽州歙縣刻書坊的刻版師傅，跟著書船來雲河鎮":"A woodblock carver from a Shexian print shop in Huizhou who comes with the book boats","想主動":"Want to attack","想多變":"Want variety","想穩健":"Want to play solid","慢了半步，就差在這裡。再來！":"Half a step too slow—that's all it was. Again!","打更的老更夫":"Old night watchman","抱孫子的阿嬤":"Grandma with Grandbaby","抱琴的女琴師":"Zither Lady","挑水的少年":"Water-Carrying Boy","揚州鹽商家的老太太，每年重陽坐船來看棋、下棋":"Matriarch of a Yangzhou salt-merchant family who sails in every Double Ninth to watch and play","擺字攤的代書先生":"Letter-Writing Scribe","收工的木匠":"Carpenter finishing work","放風箏的孩子":"Kite-Flying Kid","方硯冰":"Fang Yanbing","施耐庵":"Shi Nai'an","柳老篙":"Liu Laogao","步越溪":"Bu Yuexi","步越溪、施耐庵":"Bu Yuexi, Shi Nai'an","水鄉漁家女":"Water-Town Fisher Girl","江南才女":"Jiangnan Poet","沈萬三":"Shen Wansan","涇縣宣紙作坊的坊主，送紙到南北書坊，常在雲河鎮換船":"Owner of a Jingxian xuan paper workshop who often changes boats at Cloud River Town","淮安漕船船戶的女兒，在雲河碼頭開「青禾茶棧」":"A Huai'an canal boatman's daughter who runs the Qinghe Teahouse at the Cloud River Town wharf","淮河鹽船上的護船拳師，船靠雲河鎮就來擺一盤":"A guard on the Huai River salt boats who sets up a game whenever his boat docks at Cloud River Town","溜出府看棋的格格":"Princess Sneaking Out to Watch Chess","溫若蘅":"Wen Ruoheng","炮先到中路，車馬要跟得上，不然就是空架子。":"The cannon reaches the center first—but the chariots and horses must follow, or it's an empty frame.","炮換到另一翼，兩邊的子才接得上。":"Move the cannon to the other wing so both sides can connect.","炮是先到了，車還在家睡覺呢。下次早點叫醒它。":"Your cannon arrived, but your chariot was still asleep at home. Wake it up sooner next time.","炮架中路，還要讓車馬跟上。":"Put the Cannon on the central file, and let the Chariots and Horses follow.","炮過宮，兩翼的子也要接得上。":"The Cannon crosses the palace; pieces on both flanks must keep up.","炮馬協調，別讓自己的子互擋。":"Coordinate Cannon and Horse; don't let your own pieces block each other.","炮馬要互相照應，自己的子別擋自己的路。":"Cannon and horse must support each other—don't let your own pieces block your own road.","王冕":"Wang Mian","王冕、江南才女":"Wang Mian, Jiangnan Poet","田飛燕":"Tian Feiyan","田飛燕、點茶的青盞姑娘":"Tian Feiyan, Tea-Whisking Girl","留著變化，下一步看對手。":"Keep your options open; let the opponent show their plan.","畫青花的女工":"Blue-and-White Painter","當鋪的規矩：先看貨，再開價。你先請。":"A pawnshop's rule: look at the goods before naming a price. After you.","秦淮琵琶女":"Qinhuai Pipa Player","秦長庚":"Qin Changgeng","秦長庚、行腳僧":"Qin Changgeng, Wandering Monk","練八段錦的大娘":"Baduanjin Auntie","老身先挺個兵，你慢慢回，不急。":"Let this old woman push a pawn first. Answer slowly—there's no hurry.","背藥箱的女大夫":"Lady Doctor","致仕的縣學教諭，棋會的老規矩多半是他記著":"A retired county school instructor who remembers most of the gathering's old rules","茶給你斟好了。炮架起來，車馬跟不跟得上，一盤就知道。":"Your tea's poured. Set up your cannon—one game will show if your chariots and horses can keep up.","茶館少東家":"Teahouse Young Boss","草原女射手":"Steppe Archer","草原女騎手":"Steppe Horsewoman","葛青禾":"Ge Qinghe","蘇州繡娘":"Suzhou Embroiderer","行腳僧":"Wandering Monk","褚子驍":"Chu Zixiao","西域商隊的姑娘":"Caravan Girl","說書人":"Storyteller","賣花的姑娘":"Flower girl","賣茶的老婦":"Old Tea Seller","賣豆花的小販":"Tofu pudding vendor","走鏢的鏢師":"Escort Guard","起馬局":"Horse Opening","起馬門":"Horse Opening School","趕考的書生":"Scholar Heading to the Exams","路過的江湖女俠":"Passing Swordswoman","輸了就是輸了。你的車，比我的快。":"A loss is a loss. Your chariot was faster than mine.","造紙講究一道一道工序。下棋也是，先把炮挪好。":"Papermaking goes step by step. So does chess—first put the cannon in its place.","運河驛站的馬伕，送公文的空檔就來棋會":"A groom at the canal post station who drops by between dispatch runs","過宮炮":"Cross-Palace Cannon","過宮炮門":"Cross-Palace Cannon School","遛鳥的老伯":"Bird-Walking Elder","都架中炮，就比誰的車馬先到。":"When both set up the center cannon, it's a race to bring chariots and horses.","都架中炮，更要比誰出子快。":"Both sides set up a Central Cannon, so the race is who develops faster.","鐵連城":"Tie Liancheng","鐵連城、擺字攤的代書先生":"Tie Liancheng, Letter-Writing Scribe","長安的牡丹娘子":"Peony Lady of Chang'an","陣形先安，大子要出；穩，不是不動。":"Settle the formation, bring out the big pieces—steady doesn't mean still.","陣形穩，出子也快。老夫佩服。":"A steady formation and quick development. I'm impressed.","陶秉衡":"Tao Bingheng","雙馬互相照應，站穩再反擊。":"Let both Horses cover each other; stand firm, then strike back.","雙馬守住了，才有本錢反擊。":"Once both horses hold firm, you've earned the right to counterattack.","雲河鎮「萬寶齋」當鋪的朝奉，估價從不先開口":"Appraiser at the Wanbao Pawnshop in Cloud River Town who never names a price first","雷借花":"Lei Jiehua","雷借花、柳老篙":"Lei Jiehua, Liu Laogao","霍驚瀾":"Huo Jinglan","順炮":"Same-Direction Cannons","順炮門":"Same-Direction Cannons School","顏照秋":"Yan Zhaoqiu","飛相局":"Elephant Opening","飛相門":"Elephant Opening School","馬先出來，往哪裡走，看清楚再說。":"Horses out first; decide where to go once you've seen clearly.","馬先放出來！你往哪邊，我就往哪邊跑。":"Let the horses out first! Wherever you go, I'll ride that way.","馴鷹少女":"Falconer Girl","駱躍梅":"Luo Yuemei","駱躍梅、草原女騎手":"Luo Yuemei, Steppe Horsewoman","鳳陽人，在雲河鎮開女塾，教女童識字、算帳、下棋":"From Fengyang; runs a girls' school in Cloud River Town teaching reading, accounts and chess","黎疏桐":"Li Shutong","點茶的青盞姑娘":"Tea-Whisking Girl","鼓點一換，戲就換場。你看得出我從哪邊來嗎？":"When the drumbeat changes, so does the scene. Can you tell which side I'm coming from?","張三豐":"Zhang Sanfeng"};   /* W62：門派英譯內建（gen-osc-en0.js 產生，勿手改）；字典還沒下載也翻得出 */
const oscT=s=>{if(!s||!oscEn())return s;if(OSC_PC1[s])return OSC_PC1[s];if(Object.prototype.hasOwnProperty.call(OSC_EN0,s))return OSC_EN0[s];if(typeof i18nText!=="function")return s;try{const r=i18nText(String(s));return r==null?s:r}catch(e){return s}};   /* W62：門派名詞先查內建 OSC_EN0，外掛字典還沒下載也是英文 */
const oscL=(zh,en)=>oscEn()?en:zh;
const oscNmE=c=>oscT(oscNm(c));
const oscTaE=c=>oscL(oscTa(c),(()=>{try{return WX_CHARS[c].sx==="f"?"her":"him"}catch(e){return"them"}})());
const oscSchE=id=>{const S=OSC.sch(id);if(!S||!oscEn())return S;return{...S,nm:oscT(S.nm),op:oscT(S.op),say:oscT(S.say),who:S.who.split("、").map(oscT).join(", ")}};
const oscPnE=(sid,i)=>oscL(OSC.pname(sid,i),["Basics","Advanced",OSC.side(sid)==="b"?"Playing Red":"Playing Black"][i]);
const oscTitleE=(sid,n)=>{const t=OSC.title(sid,n);return/^第 \d+ 課$/.test(t)?oscL(t,"Lesson "+n):oscT(t)};
const oscGoalE=(sid,n)=>oscT((OSC.GOAL[sid]||[])[n-1]||"");
/* 課程資料一派一檔（data/opening-school/<派>.json，約 120～200 KB）：上哪一派的課才下載哪一派 */
const OSC_DATA={},OSC_LOADING={};
function oscData(sid){if(OSC_DATA[sid])return Promise.resolve(OSC_DATA[sid]);if(OSC_LOADING[sid])return OSC_LOADING[sid];
  return OSC_LOADING[sid]=fetch(`data/opening-school/${sid}.json`).then(r=>{if(!r.ok)throw new Error("課程資料下載失敗");return r.json()}).then(d=>{OSC_DATA[sid]=d;delete OSC_LOADING[sid];return d}).catch(e=>{delete OSC_LOADING[sid];throw new Error("課程資料還沒下載到：連上網路再試一次")})}
const oscLesson=(D,sid,n)=>D&&Array.isArray(D.lessons)&&D.lessons.find(L=>L.n===n)||null;
/* 門派的棋路小圖示（旁邊一定有字，不靠顏色分派） */
const OSC_SYM={central:"M12 3v18M7 12h10",screen:"M5 18l4-10 3 6 3-6 4 10",palace_horse:"M6 7h5v5H6zM13 12l5 5M13 17l5-5",same_cannon:"M8 4v16M16 4v16",opposite_cannon:"M7 4l10 16M17 4L7 20",
  pawn:"M12 20V8M12 4a2 2 0 1 0 .01 0",elephant:"M5 5h14v14H5zM5 12h14M12 5v14",horse:"M6 18l6-12M12 6h6",cross_palace:"M4 12h16M8 8l8 8M16 8l-8 8",advisor_corner:"M6 6h12v12H6zM6 6l4 4"};
const oscSym=id=>`<svg class="osc-sym" viewBox="0 0 24 24" aria-hidden="true"><path d="${OSC_SYM[id]||""}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
function oscCss(){if(document.getElementById("oscCss"))return;const s=document.createElement("style");s.id="oscCss";s.textContent=`
.osc .card{margin-bottom:10px}
.osc h2{font-family:var(--serif);font-size:20px;margin:2px 0 6px}
.osc-sub{color:var(--muted);font-size:14px;line-height:1.6}
.osc-sym{width:26px;height:26px;flex:none;color:var(--accent)}
.osc-sc{display:flex;gap:10px;align-items:flex-start}
.osc-sc .tx{flex:1;min-width:0}
.osc-sc b{font-family:var(--serif);font-size:17px}
.osc-sc .osc-op{font-size:13px;color:var(--muted);margin-left:6px}
.osc-sc p{margin:4px 0;line-height:1.6;font-size:14px}
.osc-tag{display:inline-block;font-size:12px;border:1px solid var(--line);border-radius:10px;padding:0 7px;margin:2px 4px 0 0;color:var(--muted)}
.osc-rec{color:var(--accent);font-weight:700}
.osc-st{margin:12px 0 4px;font-family:var(--serif);font-size:15px}
.osc-l{display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:11px 12px;margin:6px 0;border:1px solid var(--line);border-radius:12px;background:var(--bg);color:var(--ink);font-size:15px}
.osc-l .ic{width:24px;text-align:center;flex:none}
.osc-l .tx{flex:1;min-width:0}
.osc-l small{display:block;color:var(--muted);font-size:13px;line-height:1.5}
.osc-l.lk{opacity:.72}
.osc-l.cur{border:2px solid var(--accent)}
.osc-goal{font-weight:700;margin:10px 0 6px;line-height:1.6}
.osc-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
.osc-row .btn{flex:1 1 140px;margin-top:0;text-align:center}
.osc-f{display:flex;gap:6px;flex-wrap:wrap;margin:4px 0 10px}
.osc-f button{border:1px solid var(--line);background:var(--bg);color:var(--ink);border-radius:16px;padding:6px 12px;font-size:14px}
.osc-f button[aria-pressed="true"]{border-color:var(--accent);color:var(--accent);font-weight:700}
.osc-ch{display:flex;flex-direction:column;gap:8px;padding:6px 12px}
.osc-ch button{text-align:left;padding:10px 12px;border:1px solid var(--line);border-radius:12px;background:var(--bg);color:var(--ink);font-size:15px;line-height:1.5}
.osc-ch button.no{border-color:var(--red);color:var(--red)}
.osc-ch button.yes{border:2px solid var(--accent);font-weight:700}
.osc-top{padding:4px 14px 0}
.view.fixed .osc-note{color:var(--ink);font-size:15px;line-height:1.65;max-height:30vh;overflow:auto}
.osc-who{font-size:13px;color:var(--muted);margin-top:2px}
.osc-badge{font-size:44px;text-align:center;margin:6px 0}
.osc-free{text-align:center;color:var(--muted);font-size:13px;margin:10px 0}
.osc-npc{margin:8px 0;text-align:left}
.osc-zm{display:flex;gap:10px;align-items:flex-start}
.osc-zm img{width:76px;height:102px;object-fit:contain;flex:none}
.osc-zm .tx{flex:1;min-width:0}
.osc-zm b{font-family:var(--serif);font-size:17px}
.osc-zm .osc-op{display:block;margin:2px 0 0;font-size:13px;color:var(--muted)}   /* 11/18 測試員驗 1545（P3）：英文掌門卡名字和頭銜黏成「Fang YanbingMaster of the…」——.osc-op 原本只在門派卡（.osc-sc）有左邊距；掌門卡改成頭銜自己一行 */
.osc-zm p{margin:4px 0;line-height:1.6;font-size:14px}
.osc-zm-mine{border:2px solid var(--accent)}
.osc-bar{font-size:13px;color:var(--muted);text-align:center;padding:2px 10px;line-height:1.5;overflow-wrap:anywhere}
`;document.head.append(s)}

/* ===== 七星卡冊上的一列（07pty-party.js ptyCardHTML 呼叫）===== */
function oscRowHTML(c){try{const o=oscGet(),sid=OSC.act(o,c),S=sid&&oscSchE(sid);
  return`<button type="button" class="pty-row" data-a="osc"><span>${oscL("門派","School")}</span><b>${S?(p=>`${esc(S.nm)}${oscL("・"," · ")}${OSC.next(o,c,sid)?`${oscPnE(sid,OSC.PART.indexOf(p))} ${OSC.count(o,c,sid,p[0],p[1])}${oscL("／","/")}${p[1]-p[0]+1}`:oscL("全部完成","All done")}`)(OSC.part(o,c,sid)):oscL("尚未加入","Not joined")}</b><i aria-hidden="true">›</i></button>`}catch(e){return""}}
/* ===== 棋友小卡上的棋路（整併稿第九節 4）：門派・慣用開局、一句棋理、副修；「學這一派的開局」帶修行角色去入派或繼續修行。
   棋友的門派是棋風資料，不是玩家的入派；下一盤照原本的動線（小卡原本那顆按鈕）。宋以前朝代的棋友加一句：棋路是在星槎石桌學到的今天的下法 ===== */
/* 11/24 開發者：「我希望要現在秘境遇到才能出現在門下棋友那邊 不然都不能看到」——秘境人物要在秘境找到過（jSecrets，secretFind 記的）才列出來；驛站、園子的門人照舊。
   門下棋友出現的地方（掌門小卡、前院清單與打聽提示、前院站位、修行頁的師友）都用這個判斷 */
function oscNpcShown(k){const[kind,id]=String(k||"").split(":");if(kind!=="secret")return true;try{return typeof jSecrets==="function"&&!!jSecrets()[id]}catch(e){return false}}
function oscNpcHTML(key,era){const x=OSC.NPC[key];if(!x)return"";oscCss();const S=oscSchE(x[0]),S2=oscSchE(x[1]);
  const old=era&&typeof ERA_PRE_XQ!=="undefined"&&ERA_PRE_XQ[era];
  return`<div class="osc-npc card osc-sc">${oscSym(S.id)}<div class="tx"><b>${esc(S.nm)}</b><span class="osc-op">${oscL(`慣用${esc(S.op)}・副修${esc(S2.nm)}`,`Plays ${esc(S.op)} · minor: ${esc(S2.nm)}`)}</span><p>${esc(S.say)}</p>${old?`<p class="osc-sub">${oscL("（棋路是在星槎石桌學到的今天的下法）","(Learned today's style at the Star Raft's stone table.)")}</p>`:""}
    <div class="osc-row"><button type="button" class="btn ghost" data-osc-learn="${S.id}">${oscL("🏯 學這一派的開局","🏯 Learn this school's opening")}${OSC.isOpen(S.id)?"":oscL("（準備中）"," (coming soon)")}</button></div></div></div>`}
function oscNpcBind(box){if(!box)return;box.querySelectorAll("[data-osc-learn]").forEach(b=>b.onclick=()=>{try{vibrate(5)}catch(e){}oscLearn(b.dataset.oscLearn)})}
function oscLearn(sid){const S=oscSchE(sid);if(!S)return;if(!OSC.isOpen(sid)){toast(oscL(`${S.nm}的課程還在準備中；現在可以先下一盤，看看${S.op}怎麼走。`,`${S.nm} lessons are still being prepared. Play a game for now and see how the ${S.op} goes.`));return}
  const P=typeof ptyGet==="function"?ptyGet():null,me=P&&P.look;try{closeSheet()}catch(e){}
  if(!me||!PTY.has(P,me)){setTimeout(()=>{location.hash="#/school"},80);return}
  setTimeout(()=>{if(OSC.act(oscGet(),me)===sid)location.hash="#/school/"+me;else oscJoinAsk(me,sid)},120)}
/* 對局頂欄下面一行（08b-cpugame.js 每次重畫叫）：「對手慣用：飛相門」「本局：中炮對屏風馬」分開寫；只在園子、驛站、秘境棋友的對局 */
function oscNpcKey(st){try{if(!st||st.ranked||st.arena)return"";if(st.journey==="park"){const n=typeof parkNpcOf==="function"?parkNpcOf(st):null;return n?"npc:"+n.id:""}
  const j=String(st.journey||"");if(!j.startsWith("inn:"))return"";const id=j.slice(4);if(/^zm_/.test(id)&&OSC.mst(id))return"zm:"+id;return OSC.NPC["inn:"+id]?"inn:"+id:OSC.NPC["secret:"+id]?"secret:"+id:""}catch(e){return""}}
function oscBar(v,st){const top=v&&v.querySelector("#pTop");if(!top)return;let el=v.querySelector("#oscBar");const k=oscNpcKey(st),x=k&&(OSC.NPC[k]||(/^zm:/.test(k)&&(m=>m?[m.sid,m.sec,m.nm]:null)(OSC.mst(k.slice(3)))));
  if(!x){if(el)el.remove();return}oscCss();if(!el){el=document.createElement("div");el.id="oscBar";el.className="osc-bar";top.after(el)}
  let cur="佈局中";try{if(!st.start&&!st.ed)cur=OSC.classify((st.moves||[]).slice(0,4).map(m=>XQCore.iccs(m.f,m.t)));else cur=""}catch(e){}
  const h=oscL(`對手慣用：${esc(OSC.sch(x[0]).nm)}${cur?`<span aria-hidden="true">｜</span>本局：${esc(cur)}`:""}`,`Opponent's style: ${esc(oscT(OSC.sch(x[0]).nm))}${cur?`<span aria-hidden="true"> | </span>This game: ${esc(oscT(cur))}`:""}`);if(el.dataset.h!==h){el.dataset.h=h;el.innerHTML=h}}
/* 主題訓練清單（07-legend.js Theme）最下面加「開局棋路」 */
function oscThemeAdd(v){const pad=v.querySelector(".pad");if(!pad||pad.querySelector(".osc-theme"))return;
  const d=document.createElement("div");d.className="osc-theme";d.innerHTML=`<div class="sec-t">${oscL("開局門派","Opening Schools")}</div><div class="items" style="padding:0"><button class="item" id="oscTh"><span class="lb">🏯</span><span class="tx"><b>${oscL("開局棋路","Opening Paths")}</b><br><small class="muted">${oscL("七星各自拜師，循序學開局","Each of the Seven Stars joins a school and learns openings step by step")}</small></span><span class="muted">›</span></button></div>`;
  pad.append(d);d.querySelector("#oscTh").onclick=()=>{try{vibrate(5)}catch(e){}location.hash="#/school"}}

/* ===== 入派確認：一個畫面，沒有拜師電影 ===== */
function oscJoinAsk(c,sid,done){const S=oscSchE(sid);if(!S||!OSC.isOpen(sid))return;const o=oscGet(),cur=OSC.act(o,c),had=!!OSC.rec(o,c,sid),nm=oscNmE(c);
  const sw=cur&&cur!==sid?`<p class="osc-sub">${oscL(`${esc(nm)}原本主修${esc(OSC.sch(cur).nm)}：那邊的進度會留著，隨時可以轉回去接著練。`,`${esc(nm)} was in the ${esc(oscSchE(cur).nm)}. That progress is kept; you can switch back any time.`)}</p>`:"";
  modal(`<h2 style="font-size:19px">${oscL(`${esc(nm)}${had?"轉回":"加入"}${esc(S.nm)}`,`${esc(nm)} ${had?"returns to":"joins"} the ${esc(S.nm)}`)}</h2><p>${oscL(`學${esc(S.op)}：${esc(S.say)}`,`Learn the ${esc(S.op)}: ${esc(S.say)}`)}</p>${sw}`,
    [[had?oscL("轉回並繼續修行","Switch back and continue"):oscL("加入並開始第一課","Join and start Lesson 1"),()=>{const o2=oscGet();OSC.enroll(o2,c,sid,Date.now());oscSave(o2);try{vibrate(8)}catch(e){}
      if(!had){location.hash=`#/school/${c}/${OSC.lid(sid,1)}`;return}if(location.hash==="#/school/"+c)done&&done(true);else location.hash="#/school/"+c}],[oscL("再看看","Not yet"),null,true]])}   /* 新入派直接上第一課（進門後第一件事就是下棋）；轉回舊派回修行頁接著練 */

/* ===== 總覽 #/school：十派、三個找法 ===== */
function oscOverview(v){oscCss();setTop(oscL("🏯 開局棋路","🏯 Opening Paths"),"#/theme");setTabs(false);let tag="";
  const P=typeof ptyGet==="function"?ptyGet():null,me=P?P.look:"";
  const draw=()=>{const o=oscGet(),L=OSC.SCH.filter(s=>!tag||s.tag.includes(tag)),open=L.filter(s=>OSC.isOpen(s.id)),soon=L.filter(s=>!OSC.isOpen(s.id)),mn=me?esc(oscNmE(me)):"";
    const card=s0=>{const s=oscSchE(s0.id),on=OSC.isOpen(s.id),mine=me&&OSC.act(o,me)===s.id,rc=me&&OSC.REC[me]&&OSC.REC[me].includes(s.id);
      return`<div class="card osc-sc">${oscSym(s.id)}<div class="tx"><b>${esc(s.nm)}</b><span class="osc-op">${esc(s.op)}</span><p>${esc(s.say)}</p><div class="osc-who">${oscL("代表棋友：","Known players: ")}${esc(s.who)}</div>
        <div>${s.tag.map(t=>`<span class="osc-tag">${esc(oscT("想"+t))}</span>`).join("")}${rc?`<span class="osc-tag osc-rec">${oscL(`${mn}推薦`,`${mn} recommends`)}</span>`:""}</div>
        ${on&&me?`<div class="osc-row"><button class="btn${mine?"":" ghost"}" data-sid="${s.id}">${mine?oscL(`繼續${mn}的修行`,`Continue ${mn}'s training`):oscL(`${mn}加入並練習`,`${mn} joins and practices`)}</button></div>`:on?"":`<p class="osc-sub">${oscL("準備中：課程備妥後才開放入派。","Coming soon: you can join once the lessons are ready.")}</p>`}</div></div>`};
    v.innerHTML=`<div class="pad osc"><p class="osc-sub">${oscL("門派用真實的開局命名。已加入隊伍的七星可以各自拜師、各自練；一般對局不受影響，不用先入派。","Schools are named after real openings. Each of the Seven Stars in your party can join a school and train on their own. Normal games aren't affected, and you don't need to join first.")}</p>
      <div class="osc-f" role="group" aria-label="${oscL("找法","Filter")}">${["","主動","穩健","多變"].map(t=>`<button type="button" data-t="${t}" aria-pressed="${t===tag}">${t?esc(oscT("想"+t)):oscL("全部","All")}</button>`).join("")}</div>
      ${me?`<p class="osc-sub">${oscL(`修行角色：<b>${mn}</b>（首頁隨行的那位；要換人，從🌟 雲河七星卡冊點那位的「門派」）`,`Training: <b>${mn}</b> (your current companion on the home screen; to switch, open 🌟 Cloud River Seven Stars and tap that character's "School")`)}</p>`:`<p class="osc-sub">${oscL("開始旅程、有了隊伍以後才能入派。","Start a journey and form a party before joining a school.")}</p>`}
      ${open.map(card).join("")}${soon.length?`<div class="osc-st">${oscL("準備中","Coming soon")}</div>`+soon.map(card).join(""):""}
      <p class="osc-free">${oscL("門派、棋友的分配是遊戲創作；不代表強弱，也不宣稱歷史人物擅長這套開局。","Schools and their players are game fiction. They don't rank strength or claim that historical figures favored these openings.")}</p></div>`;
    v.querySelectorAll("[data-t]").forEach(b=>b.onclick=()=>{tag=b.dataset.t;draw()});
    v.querySelectorAll("[data-sid]").forEach(b=>b.onclick=()=>{try{vibrate(5)}catch(e){}const sid=b.dataset.sid;if(OSC.act(oscGet(),me)===sid){location.hash="#/school/"+me;return}oscJoinAsk(me,sid,()=>{location.hash="#/school/"+me})})};
  draw();return{}}

/* ===== 修行頁 #/school/<角色> ===== */
function oscHome(v,c){oscCss();const P=typeof ptyGet==="function"?ptyGet():null;setTabs(false);
  if(!P||!PTY.ORDER.includes(c)){navReplace("#/school");return{}}
  if(!PTY.has(P,c)){setTop(oscL("🏯 門派修行","🏯 School Training"),"#/school");v.innerHTML=`<div class="pad osc"><div class="card"><h2>${esc(oscNmE(c))}</h2><p>${oscL("加入隊伍後可入派。","Can join a school after joining your party.")}</p></div><button class="btn ghost" onclick="location.hash='#/school'">${oscL("回開局棋路","Back to Opening Paths")}</button></div>`;return{}}
  const draw=()=>{const o=oscGet(),sid=OSC.act(o,c),nm=oscNmE(c),look=P.look===c;
    if(!sid){setTop(oscL(`🏯 ${nm}的門派`,`🏯 ${nm}'s School`),"#/school");const rc=OSC.REC[c]||[];
      v.innerHTML=`<div class="pad osc"><div class="card"><h2>${oscL(`${esc(nm)}・門派：尚未加入`,`${esc(nm)} · School: not joined`)}</h2><p class="osc-sub">${oscL("選一個門派，接著就是第一個棋盤任務。不用考試、不花修為；以後也能免費轉修，進度會留著。","Pick a school and go straight to the first board task. No test and no XP cost; you can switch for free later and your progress is kept.")}</p></div>
        ${OSC.SCH.filter(s=>OSC.isOpen(s.id)).map(s0=>{const s=oscSchE(s0.id);return`<div class="card osc-sc">${oscSym(s.id)}<div class="tx"><b>${esc(s.nm)}</b><span class="osc-op">${esc(s.op)}</span><p>${esc(s.say)}</p>${rc.includes(s.id)?`<span class="osc-tag osc-rec">${oscL(`推薦（${rc[0]===s.id?"主修":"副修"}）`,`Recommended (${rc[0]===s.id?"main":"minor"})`)}</span>`:""}
          <div class="osc-row"><button class="btn ghost" data-sid="${s.id}">${oscL(`選${esc(s.nm)}`,`Choose ${esc(s.nm)}`)}</button></div></div></div>`}).join("")}
        <p class="osc-sub">${oscL(`推薦只是${esc(oscTa(c))}的教學偏好；本命子不限制門派，十派都能選。`,`The recommendation is just ${(()=>{try{return WX_CHARS[c].sx==="f"?"her":"his"}catch(e){return"their"}})()} teaching preference; a character's signature piece doesn't limit the choice. Any of the ten schools is open.`)}</p></div>`;
      v.querySelectorAll("[data-sid]").forEach(b=>b.onclick=()=>{try{vibrate(5)}catch(e){}oscJoinAsk(c,b.dataset.sid,draw)});return}
    const S=oscSchE(sid),R=OSC.rec(o,c,sid),nx=OSC.next(o,c,sid),G=n=>oscGoalE(sid,n),D=oscL("・"," · ");setTop(oscL(`🏯 ${nm}的${S.nm}修行`,S.nm),"#/school");
    let h=`<div class="pad osc"><div class="card osc-sc">${oscSym(sid)}<div class="tx"><h2>${esc(S.nm)}</h2><p class="osc-sub">${esc(S.op)}${D}${esc(S.say)}</p>${["g","g2","g3"].filter(k=>R[k]).map((k,i)=>`<p><b>🏮 ${oscL(`${esc(nm)}已完成本派${OSC.pname(sid,i)}`,`${esc(nm)} completed this school's ${oscPnE(sid,i)}`)}</b></p>`).join("")}</div></div>`;
    for(const[a,z,pn]of OSC.PART){const open=OSC.state(o,c,sid,a)!=="locked",bs=OSC.side(sid)==="b";h+=`<div class="osc-st">${pn==="入門"?oscL("第一階段・入門","Stage 1 · Basics"):pn==="進階"?(bs?oscL("第二階段・進階：紅方十種走法","Stage 2 · Advanced: ten Red tries"):oscL("第二階段・進階：對方十種應法","Stage 2 · Advanced: ten replies by the opponent")):oscL("第三階段・"+OSC.pname(sid,2),"Stage 3 · "+oscPnE(sid,2))}${oscL(`（${OSC.count(o,c,sid,a,z)}／${z-a+1}）`,` (${OSC.count(o,c,sid,a,z)}/${z-a+1})`)}</div>`;
      if(!open){h+=`<p class="osc-sub">🔒 ${pn==="進階"?(bs?oscL("完成入門六課後開放：同一派的局面，紅方換十種走法，各自怎麼應對。","Opens after the six Basics lessons: the same school's position, with Red trying ten different moves, and how to answer each."):oscL("完成入門六課後開放：同一個開局，對方換十種應法，各自怎麼應對。","Opens after the six Basics lessons: the same opening, with ten different replies by the opponent, and how to handle each.")):(bs?oscL("入門和進階都完成後開放：換你執紅，學面對這一派時怎麼應。","Opens after Basics and Advanced: you play Red and learn how to face this school."):oscL("入門和進階都完成後開放：換你執黑，面對紅方六種開局，走本派的路。","Opens after Basics and Advanced: you play Black against six Red openings and follow your school's path."))}</p>`;continue}
      for(let n=a;n<=z;n++){if(n===a||OSC.stage(n,sid)!==OSC.stage(n-1,sid))if(pn==="入門")h+=`<div class="osc-sub">${esc(oscT(OSC.stage(n,sid)))}</div>`;const st=OSC.state(o,c,sid,n),cur=n===nx;
        h+=`<button type="button" class="osc-l${st==="locked"?" lk":""}${cur?" cur":""}" data-n="${n}" ${st==="locked"?'aria-disabled="true"':""}><span class="ic">${st==="passed"?"✓":st==="open"?"▶":"🔒"}</span><span class="tx">${n}${oscL("　"," ")}${esc(oscTitleE(sid,n))}<small>${esc(G(n))}${st==="passed"?oscL("・可以回看、重練"," · review or redo any time"):st==="locked"?oscL("・完成上一課才開"," · opens after the previous lesson"):""}</small></span></button>`}}
    h+=nx?`<p class="osc-goal">${oscL("這次目標：","Current goal: ")}${esc(G(nx))}</p><button class="btn" id="oscGo">${OSC.count(o,c,sid)||(R.l[OSC.lid(sid,nx)]||{}).cur?oscL("繼續這一課","Continue this lesson"):oscL("開始第一課","Start Lesson 1")}${oscL("：",": ")}${esc(oscTitleE(sid,nx))}</button>`:`<p class="osc-goal">${oscL(`三個階段 ${OSC.NL} 課都完成了。任何一課都能回去重練。`,`All ${OSC.NL} lessons in the three stages are done. You can redo any lesson.`)}</p>`;
    const mates=Object.entries(OSC.NPC).filter(([k,x])=>x[0]===sid&&oscNpcShown(k)).map(([k,x])=>x[2]).filter(n=>!OSC.sch(sid).who.includes(n)).slice(0,4);
    h+=`<div class="osc-row">${look?"":`<button class="btn ghost" id="oscLook">${oscL(`帶${esc(oscTa(c))}去拜師（設為隨行）`,`Take ${esc(oscTaE(c))} to train (set as companion)`)}</button>`}<button class="btn ghost" id="oscSw">${oscL("轉修其他派","Switch school")}</button></div>
      <p class="osc-sub">${oscL(`師友：${esc(S.who)}${mates.length?`，以及${esc(mates.join("、"))}`:""}。基礎課隨時能上，不用等棋友出現。`,`Fellow players: ${esc(S.who)}${mates.length?`, and ${esc(mates.map(oscT).join(", "))}`:""}. Lessons are open any time; no need to wait for them to show up.`)}</p>
      ${zmHomeHTML(c,sid)}
      <p class="osc-free">${oscL("修行不花體力、不扣修為；錯了退回重想就好。","Training costs no stamina or XP. If you go wrong, just step back and rethink.")}</p></div>`;
    v.innerHTML=h;const go=n=>{try{vibrate(5)}catch(e){}location.hash=`#/school/${c}/${OSC.lid(sid,n)}`};
    v.querySelectorAll("[data-zm]").forEach(b=>b.onclick=()=>{try{vibrate(5)}catch(e){}const m=OSC.mst(b.dataset.zm);if(m)zmStart(m,c)});   /* 十派掌門：用這一頁的角色挑戰 */
    {const za=v.querySelector("#oscZmAll");if(za)za.onclick=()=>{try{vibrate(5)}catch(e){}location.hash="#/school/masters"}}
    v.querySelectorAll(".osc-l").forEach(b=>b.onclick=()=>{const n=+b.dataset.n,st=OSC.state(oscGet(),c,sid,n);if(st==="locked"){toast(oscL(`先完成第 ${n-1} 課，這一課才會打開。這一課練：${G(n)}`,`Finish Lesson ${n-1} to open this one. This lesson: ${G(n)}`));return}go(n)});
    const g=v.querySelector("#oscGo");if(g)g.onclick=()=>go(nx);
    const lk=v.querySelector("#oscLook");if(lk)lk.onclick=()=>{if(typeof ptySetLook==="function"&&ptySetLook(c)){toast(oscL(nm+"現在跟著你",nm+" is now with you"));draw()}};
    v.querySelector("#oscSw").onclick=()=>oscSwitch(c,draw)};
  draw();return{}}
function oscSwitch(c,done){if(typeof sheet!=="function")return;const o=oscGet(),cur=OSC.act(o,c);
  sheet(oscL("轉修其他派","Switch school"),b=>{b.innerHTML=`<p class="osc-sub">${oscL("同一時間主修一派。轉過去免費，原本的進度凍結保留，回來接著練。","One main school at a time. Switching is free; your old progress is kept, so you can come back and continue.")}</p>`+OSC.SCH.map(s0=>{const s=oscSchE(s0.id),on=OSC.isOpen(s.id),R=OSC.rec(o,c,s.id);
      return`<button type="button" class="osc-l${on?"":" lk"}" data-sid="${s.id}"${on&&s.id!==cur?"":' aria-disabled="true"'}>${oscSym(s.id)}<span class="tx">${esc(s.nm)}${s.id===cur?oscL("（主修中）"," (current)"):""}<small>${on?R?oscL(`進度 ${OSC.count(o,c,s.id)}／${OSC.NL}`,`Progress ${OSC.count(o,c,s.id)}/${OSC.NL}`):oscL("還沒練過","Not started"):oscL("準備中","Coming soon")}</small></span></button>`}).join("");
    b.querySelectorAll("[data-sid]").forEach(x=>x.onclick=()=>{const sid=x.dataset.sid;if(!OSC.isOpen(sid)||sid===cur)return;closeSheet();setTimeout(()=>oscJoinAsk(c,sid,done),80)})})}

/* ===== 上課 #/school/<角色>/<課> ===== */
function oscPlay(v,c,lk){oscCss();if(typeof lsnCss==="function")lsnCss();setTabs(false);const C=window.XQCore,m=/^([a-z_]+)_(\d\d)$/.exec(lk||""),sid=m&&m[1],n=m?+m[2]:0,BK="#/school/"+c;
  const o0=oscGet();if(!C||!m||!OSC.rec(o0,c,sid)||OSC.state(o0,c,sid,n)==="locked"){navReplace(BK);return{}}
  const H0=location.hash,here=()=>v.isConnected&&location.hash===H0,q=s=>v.querySelector(s),S=oscSchE(sid),nm=oscNmE(c),title=oscL(`第 ${n} 課・${OSC.title(sid,n)}`,`Lesson ${n} · ${oscTitleE(sid,n)}`);
  setTop(oscL(`🏯 ${nm}・${S.nm}`,S.nm),BK);   /* 11/18 測試員驗 1545（P3）：英文標題「🏯 Qi Zhe · Advisor-Corner Cannon School」在手機折兩行、下緣被頂欄切掉（圖示把第一行撐高）；英文這頁和修行頁標題只放派名、不帶圖示，中文照舊 */ const st={tok:0,fast:false};let D=null,LS=null,ex=null;
  const PE={K:"General",A:"Advisor",B:"Elephant",N:"Horse",R:"Chariot",C:"Cannon",P:"Soldier"},pc=(sd,x)=>oscL(C.NAMES[sd][x],PE[x]||"piece"),mv=s=>oscT(s);
  v.className="view";v.innerHTML=`<div class="pad osc"><p class="osc-sub">${oscL("課程載入中…","Loading lesson…")}</p></div>`;
  oscData(sid).then(d=>{if(!here())return;D=d;LS=oscLesson(D,sid,n);if(!LS||!LS.ex.length)throw new Error(oscL("這一課的資料還沒準備好","This lesson's data isn't ready yet"));start()}).catch(e=>{if(!here())return;v.innerHTML=`<div class="pad osc"><div class="card"><p>${esc(oscT(e.message))}</p></div><button class="btn ghost" id="oscB">${oscL("回修行頁","Back to training")}</button></div>`;q("#oscB").onclick=()=>goUp(BK)});
  function start(){const o=oscGet(),L=(OSC.rec(o,c,sid).l||{})[lk]||{},id=OSC.pick(LS.ex.map(x=>x.id),c,L);ex=LS.ex.find(x=>x.id===id);OSC.begin(o,c,sid,n,id);oscSave(o);run()}
  const flag=k=>{const o=oscGet();OSC.mark(o,c,sid,n,k);oscSave(o)};
  const curOf=()=>{const L=((OSC.rec(oscGet(),c,sid)||{}).l||{})[lk];return L&&L.cur||{h:0,dm:0}};
  function run(){st.tok++;let b=C.parseFen(C.START.split(" ")[0]),me="r";for(const u of ex.pre||[]){const[f,t]=lsnSq(u);b=C.make(b,f,t);me=C.opp(me)}
    const b0=b,side=me,flip=side==="b";let node=ex.root,sel=-1,busy=false,last=null,over=[],nodeB=b;
    v.className="view fixed";v.innerHTML=`<div class="cj-top osc-top"><b>${esc(title)}${side==="b"?oscL("・你執黑"," · you play Black"):""}</b><div class="lsn-say">${esc(oscT(ex.say||""))}</div></div><div class="boardbox" id="oscBd"></div><div class="status" id="oscS"></div><div class="note cj-note osc-note" id="oscN"></div><div id="oscC"></div><div style="flex:1"></div><div class="actions" id="oscA"></div>`;
    const bd=Board(x=>tap(x));q("#oscBd").append(bd.svg);
    const stat=t=>{const e=q("#oscS");if(e)e.textContent=t},note=t=>{const e=q("#oscN");if(e)e.textContent=t||""},acts=a=>{const e=q("#oscA");if(e)actionBar(e,a)},chBox=h=>{const e=q("#oscC");if(e)e.innerHTML=h||""};
    const ck=bb=>C.inCheck(bb,"r")?C.kingSq(bb,"r"):C.inCheck(bb,"b")?C.kingSq(bb,"b"):-1;
    const draw=bb=>{bb=bb||b;bd.draw(bb,{flip,sel,last,check:ck(bb),targets:node&&node.k==="mv"&&sel>=0&&!busy?C.legal(bb,side).filter(([f])=>f===sel).map(x=>x[1]):[]});if(typeof lsnArrows==="function")lsnArrows(bd.svg,over,flip)};
    const help=()=>n<=2?[["hint","💡",oscL("提示","Hint"),hint]]:[["demo","👁",oscL("示範","Show me"),demo]];
    const yourMove=()=>oscL("換你走","Your move"),Q=N=>oscT(N.q),acL=a=>a.map(([x,me])=>oscL((me?"你 ":"對方 ")+mv(x),(me?"you ":"opponent ")+mv(x))).join(oscL("，",", "));
    function enter(N){node=N;sel=-1;busy=false;over=[];chBox("");nodeB=b;
      if(!N){finish();return}
      if(N.k==="ch"){stat(oscL("想一想","Think it over"));note(Q(N));acts([]);draw();chBox(`<div class="osc-ch">${N.o.map((x,i)=>`<button type="button" data-i="${i}">${esc(oscT(x[0]))}</button>`).join("")}</div>`);
        v.querySelectorAll(".osc-ch button").forEach(btn=>btn.onclick=()=>{const x=N.o[+btn.dataset.i];try{vibrate(5)}catch(e){}if(x[1]){btn.classList.add("yes");note(`✔ ${x[2]?oscT(x[2]):oscL("對。","Right.")}`);v.querySelectorAll(".osc-ch button").forEach(z=>z.disabled=true);acts([["go","›",oscL("繼續","Continue"),()=>enter(N.n),true]])}
          else{btn.classList.add("no");note(`✘ ${x[2]?oscT(x[2]):oscL("再想想。","Think again.")}\n${Q(N)}`)}});return}
      if(N.k==="err"){stat(oscL("常見錯法","Common mistake"));busy=true;const[f,t]=lsnSq(N.bad),cn=mv(C.notate(b,f,t)),acc=[];note(oscL(`先看一步常見的錯著：「${cn}」`,`First, a common mistake: "${cn}"`));acts([]);
        const after=()=>oscL(`錯著「${cn}」之後：${acL(acc)}`,`After the mistake "${cn}": ${acL(acc)}`);   /* 11/18 測試員驗 1545（P3）：後續原本整串標「對方：馬7進5 炮八平五 馬2進3」，裡面混了自己的著法；改成每步標誰走（lsnPlay 的 i：錯著是 1，偶數＝對方、奇數＝自己；acc 存 [著法, 是不是自己]，acL 加上誰走） */
        const bb0=b;lsnPlay(st,[N.bad].concat(N.l||[]),bb0,(bb,mv1,tx,cap,i)=>{b=bb;last=mv1;draw();if(i>1){acc.push([tx,i%2===1]);note(after())}},()=>{if(!here())return;
          note(`${after()}${N.x?"\n"+oscL(`你的${pc(side,N.x)}丟了。`,`You lose your ${pc(side,N.x)}.`):""}\n${oscT(N.w)}`);acts([["back","↩",oscL("回到錯著前，換你改","Go back and fix it"),()=>{b=bb0;last=null;enter(N.n)},true]])});return}
      stat(yourMove());note(Q(N));acts(help());draw()}
    function tap(x){if(busy||!node||node.k!=="mv")return;const Lg=C.legal(b,side);if(sel>=0&&Lg.some(([f,t])=>f===sel&&t===x)){const u=C.iccs(sel,x);sel=-1;return move(u)}
      const mine=x>=0&&!!b[x]&&C.sideOf(b[x])===side;if(sel>=0&&!mine&&typeof lsnWhyNot==="function"){const w=lsnWhyNot(b,sel,x);if(w){sel=-1;draw();note(`✋ ${oscT(w)}\n${Q(node)}`);return}}
      sel=Lg.some(([f])=>f===x)?x:-1;if(sel>=0)try{vibrate(5)}catch(e){}draw()}
    function move(u,auto){const N=node,[f,t]=lsnSq(u),cn=mv(C.notate(b,f,t)),ok=N.ok[u];over=[];
      if(ok){busy=true;b=C.make(b,f,t);last={f,t};stat(auto?oscL("👁 示範：","👁 Demo: ")+cn:"✔ "+cn);note(auto?oscL(`這一步可以走「${cn}」。`,`You can play "${cn}" here.`):oscL("好棋。","Good move."));acts([]);draw();
        if(!ok.r){setTimeout(()=>{if(here())enter(ok.n||null)},700);return}
        setTimeout(()=>{if(!here())return;const[f2,t2]=lsnSq(ok.r),c2=mv(C.notate(b,f2,t2));b=C.make(b,f2,t2);last={f:f2,t:t2};draw();note(oscL(`對方走「${c2}」。`,`The opponent plays "${c2}".`));setTimeout(()=>{if(here())enter(ok.n||null)},900)},800);return}
      const bad=N.bad&&N.bad[u];
      if(bad){busy=true;const bb0=b,acc=[],hurt=bad.x?oscL("這步會丟子。接下來：","This move loses material. What follows: "):oscL("這步不好：對方接下來佔到便宜，你的位置變差、出子變慢。接下來：","Not a good move: the opponent gets the upper hand and your development slows. What follows: ");   /* 11/24 Pikafish 盤整 P2：37% 的吃虧著反駁線沒丟子，原本一律說「會吃虧」；沒丟子（x 空）換說法 */stat("✘ "+cn);note(hurt);acts([]);try{vibrate([20,40,20])}catch(e){}
        lsnPlay(st,[u].concat(bad.l||[]),bb0,(bb,mv1,tx,cap,i)=>{b=bb;last=mv1;draw();if(i>1){acc.push([tx,i%2===1]);note(hurt+acL(acc))}},()=>{if(!here())return;
          note(`${hurt}${acL(acc)}${bad.x?"\n"+oscL(`你的${pc(side,bad.x)}被吃掉了。`,`Your ${pc(side,bad.x)} gets captured.`):""}\n${Q(N)}`);acts([["back","↩",oscL("退回重想","Take it back"),()=>{b=bb0;last=null;busy=false;stat(yourMove());note(Q(N));acts(help());draw()},true]].concat(help()))});return}
      stat("✋ "+cn);note(`${N.no?oscT(N.no):oscL("這步不是這一課要練的。","That's not the move this lesson is practicing.")}\n${Q(N)}`);try{vibrate([10,30,10])}catch(e){}draw()}
    function hint(){if(busy||!node||node.k!=="mv")return;flag("h");over=[{f:lsnSq(node.h)[0],t:lsnSq(node.h)[1],c:"#2E7D32"}];sel=-1;stat(oscL("💡 提示","💡 Hint"));note(`${oscL("💡 可以試試箭頭這一步（不只這一步，符合目標的好棋都算）。","💡 Try the move shown by the arrow (other good moves that fit the goal also count).")}\n${Q(node)}`);draw()}
    function demo(){if(busy||!node||node.k!=="mv")return;flag("dm");move(node.h,true)}
    function finish(){const o=oscGet(),cur=curOf(),res=OSC.finish(o,c,sid,n,ex.id,LS.need,Date.now());oscSave(o);if(!res)return;
      let xp=0;try{const cl=store.get("oscClaim",{})||{};xp=OSC.reward(cl,sid,n,res,Date.now());store.set("oscClaim",cl)}catch(e){}
      if(xp&&typeof addXP==="function")try{addXP(xp,res.grad?oscL("門派入門","School stage complete"):oscL("門派修行","School training"))}catch(e){}
      v.className="view";const R=OSC.rec(o,c,sid),L=R.l[lk]||{},nx=OSC.next(o,c,sid),bs=OSC.side(sid)==="b";let h;
      if(res.grad)h=`<div class="osc-badge" aria-hidden="true">🏮</div><h2>${oscL(`${esc(nm)}完成${esc(S.nm)}${OSC.pname(sid,res.grad-1)}`,`${esc(nm)} completed ${esc(S.nm)} ${oscPnE(sid,res.grad-1)}`)}</h2><p>${oscL(`${["六課",bs?"紅方十種走法":"對方十種應法",OSC.pname(sid,2)+"六課"][res.grad-1]}都親手走完了。這是${esc(nm)}自己的紀錄，會記在卡冊上。${res.grad===1?"接著開放第二階段：對方換十種應法。":res.grad===2?(bs?"接著開放第三階段：換你執紅。":"接著開放第三階段：換你執黑。"):""}`,`You played through ${["all six lessons",bs?"all ten Red tries":"all ten replies by the opponent","all six "+oscPnE(sid,2)+" lessons"][res.grad-1]} yourself. This is ${esc(nm)}'s own record and goes on the character card. ${res.grad===1?"Stage 2 is now open: ten different replies by the opponent.":res.grad===2?(bs?"Stage 3 is now open: you play Red.":"Stage 3 is now open: you play Black."):""}`)}</p>`;
      else if(res.pass)h=`<h2>${oscL(`✓ ${esc(title)}完成`,`✓ ${esc(title)} complete`)}</h2><p>${L.md==="guided"?oscL("跟著提示完成（引導通過）。","Completed with hints (guided pass). "):oscL("自己走完。","Completed on your own. ")}${nx?oscL(`下一課：${esc(OSC.title(sid,nx))}。`,`Next: ${esc(oscTitleE(sid,nx))}.`):""}</p>`;
      else if(!res.ok)h=oscL(`<h2>👁 這題算練過</h2><p>看過示範，這一題不算獨立完成。換一個新例子，自己走一次。</p>`,`<h2>👁 Counted as practice</h2><p>You watched the demo, so this one doesn't count as done on your own. Try a new example by yourself.</p>`);
      else if(res.need)h=oscL(`<h2>這題完成</h2><p>這一課要完成 ${LS.need} 個不同的例子，還差 ${res.need} 個。</p>`,`<h2>Example complete</h2><p>This lesson needs ${LS.need} different examples; ${res.need} to go.</p>`);
      else h=oscL(`<h2>✓ 重練完成</h2><p>這一課之前已經通過，這次是複習。</p>`,`<h2>✓ Review complete</h2><p>You'd already passed this lesson; this was a review.</p>`);
      const more=!res.pass&&!res.grad&&(res.need||!res.ok);
      v.innerHTML=`<div class="pad osc"><div class="card">${h}${xp?`<p class="osc-sub">${oscL(`修為 +${xp}（帳號第一次完成才給）`,`XP +${xp} (only the first time on this account)`)}</p>`:""}</div>
        ${more?`<button class="btn" id="oscNext">${res.ok?oscL("下一個例子","Next example"):oscL("換一題","Try another")} ›</button>`:nx&&nx!==n?`<button class="btn" id="oscNL">${oscL(`下一課：${esc(OSC.title(sid,nx))}`,`Next: ${esc(oscTitleE(sid,nx))}`)} ›</button>`:""}
        <button class="btn ghost" id="oscBk">${oscL("回修行頁","Back to training")}</button></div>`;
      const a=q("#oscNext");if(a)a.onclick=()=>start();const b2=q("#oscNL");if(b2)b2.onclick=()=>navReplace(`#/school/${c}/${OSC.lid(sid,nx)}`);q("#oscBk").onclick=()=>goUp(BK)}
    enter(ex.root)}
  return{stop(){st.tok++}}}

/* 路由（02-shell.js）：#/school、#/school/<角色>、#/school/<角色>/<課> */
function oscRoute(v,c,lk){if(!c)return oscOverview(v);if(c==="masters")return oscMasters(v);if(!lk)return oscHome(v,c);return oscPlay(v,c,lk)}
/* 英文模式：外掛字典（人名、課文）比畫面晚到時（開 App 直接停在門派頁，路由比 07i18n 的頂層程式還早跑），字典到了（07i18n 發 xq-i18n-ext）就照英文重畫一次 */
function OscPage(v,c,lk){let r=oscRoute(v,c,lk),ready=false;try{ready=!oscEn()||(typeof I18N_EXN!=="undefined"&&I18N_EXN>0)}catch(e){}if(ready)return r;
  const H0=location.hash;let dead=false;const re=()=>{document.removeEventListener("xq-i18n-ext",re);if(dead||!v.isConnected||location.hash!==H0)return;if(r&&r.stop)r.stop();r=oscRoute(v,c,lk)};
  document.addEventListener("xq-i18n-ext",re);return{stop(){dead=true;document.removeEventListener("xq-i18n-ext",re);if(r&&r.stop)r.stop()}}}

/* ===== 十派掌門：挑戰、對局頭像、結算（設計稿 story/十派掌門_設計稿_1118.md 第五節）=====
   對局走驛站那條路：journey＝"inn:zm_<派>"。頭像 innAnyAct、再下一盤 igAgainArgs、結算 igGameEnd（07m2-innguest.js）各加一行轉來這裡；
   開局表與出表後的棋風在 xiangqi-lab/src/local.js（NPC_SCH 的 inn:zm_*）。
   存檔：zm（跟旅程走，JOURNEY_KEYS）＝{adj 各掌門目前強度, r:{角色:{掌門:{n,w,l,d}}}}；zmCur＝這一盤是誰、強度、哪位角色（開局時記，中途換隨行也不改）。
   修為：帳號第一次贏這位掌門 +30（oscClaim 的 zm:<id>），不加戰力 */
function zmGet(){try{return OSC.zmNorm(store.get("zm",null),PTY.ORDER)}catch(e){return OSC.zmBlank()}}
const zmImg=m=>`data/npc/${m.id}.webp`;
/* look：3D 場景照園子棋友那一套（06-cpu NPC_LOOK）：有 n_zm_<派> 模型就用 3D，沒有就用 data/npc/zm_<派>.webp 立繪；不走驛站旅人的 data/actors/（掌門沒有那裡的圖） */
function zmAct(j){const m=OSC.mst(j);if(!m||!/^inn:zm_/.test(String(j||"")))return null;
  return{id:m.id,name:m.nm,ic:"🏯",pc:m.pc,img:zmImg(m),say:m.pre,win:m.win,lose:m.lose,zm:1,look:side=>{const L=typeof NPC_LOOK==="function"?NPC_LOOK({id:m.id,name:m.nm,say:m.pre,pc:m.pc},side):null;return L&&ZM_GCH[m.sid]?{...L,gch:ZM_GCH[m.sid],gred:OSC.mside(m)==="r"}:L}}}
/* 11/18 開發者選「掌門胸前圓牌印上門派字」：派名第一個字；掌門執紅＝紅字、執黑＝黑字。立繪已用 tools/zm_disc_char.py 印上同一個字，3D 模型由 bot3d.js 照 ring3d.json 的圓牌位置貼上（figure 的 gch／gred） */
const ZM_GCH={central:"中",screen:"屏",palace_horse:"反",same_cannon:"順",opposite_cannon:"列",pawn:"仙",elephant:"飛",horse:"起",cross_palace:"過",advisor_corner:"仕"};
const zmLv=rl=>Math.max(1,Math.min(6,1+Math.floor(rl/3)));
function zmArgs(m,rl,dx){const ms=OSC.mside(m);return{human:ms==="r"?"b":"r",level:zmLv(rl),rlv:rl,journey:"inn:"+m.id,...(dx!=null?{dx}:{})}}
const zmSay=(m,s)=>oscL(`🏯 ${m.nm}：「${s}」`,`🏯 ${m.en}: "${oscT(s)}"`);
function zmStart(m,c0){const P=typeof ptyGet==="function"?ptyGet():null,c=c0||(P&&P.look);if(!c||!P||!PTY.has(P,c)){toast(oscL("要先有修行角色：已加入隊伍的七星才能挑戰","You need a training character first: only Seven Stars in your party can challenge"));return}
  const rl=OSC.zmRlv(zmGet(),m);store.set("zmCur",{id:m.id,rl,c});
  if(typeof jhRetHere==="function")jhRetHere("inn:"+m.id);   /* W80：從十州棋館、門內頁、門派修行頁挑戰掌門，返回鍵回原來那一頁（原本借用驛站的對局，回驛站） */
  jStart("inn:"+m.id,zmArgs(m,rl),()=>{location.hash="#/journey/play";setTimeout(()=>toast(zmSay(m,m.pre)),500)})}
/* 再下一盤：同一位掌門、調整後的強度、同一位修行角色 */
function zmAgainArgs(j,dx){const m=zmAct(j)&&OSC.mst(j);if(!m)return null;const C=store.get("zmCur",null),rl=OSC.zmRlv(zmGet(),m);
  store.set("zmCur",{id:m.id,rl,c:C&&C.id===m.id&&C.c?C.c:(typeof ptyLook==="function"?ptyLook():"")});return zmArgs(m,rl,dx)}
/* 下完：照開局時記下的角色記戰績、調強度、帳號第一次贏給修為；回傳 true＝是掌門的盤（igGameEnd 就不再往下） */
function zmGameEnd(st,P){const m=zmAct(P&&P.id)&&OSC.mst(P.id);if(!m||!st||!st.result)return false;
  const C=store.get("zmCur",null),rl=C&&C.id===m.id&&Number.isInteger(C.rl)?C.rl:OSC.zmRlv(zmGet(),m),c=C&&C.id===m.id&&C.c?C.c:"";
  const res=st.result.w===st.human?"w":st.result.w?"l":"d",z=zmGet();OSC.zmEnd(z,c,m,res,rl);store.set("zm",z);
  let xp=0;try{const cl=store.get("oscClaim",{})||{};xp=OSC.zmReward(cl,m,res,Date.now());store.set("oscClaim",cl)}catch(e){}if(xp&&typeof addXP==="function")try{addXP(xp,oscL("十派掌門","Ten School Masters"),"zm:"+st.id)}catch(e){}
  setTimeout(()=>{try{toast(zmSay(m,res==="w"?m.lose:res==="l"?m.win:"這盤和得好，改天再分高下。"))}catch(e){}},1500);return true}
function zmCardHTML(m,z,c,mine){const S=oscSchE(m.sid),R=c?OSC.zmRec(z,c,m.id):null,rl=OSC.zmRlv(z,m),ms=OSC.mside(m),rk=esc(oscT(OSC.RNK[rl]||"")),cn=c?esc(oscNmE(c)):"";
  return`<div class="card osc-zm${mine?" osc-zm-mine":""}"><img src="${zmImg(m)}" alt="" onerror="this.remove()"><div class="tx">
    <b>${esc(oscL(m.nm,m.en))}</b><span class="osc-op">${oscL(`${esc(S.nm)}掌門・慣用${esc(S.op)}`,`Master of the ${esc(S.nm)} · plays ${esc(S.op)}`)}</span>${mine?`<span class="osc-tag osc-rec">${oscL("你的掌門","Your master")}</span>`:""}
    <p class="osc-sub">${oscL(`${esc(m.who)}（${m.age} 歲）`,`${esc(oscT(m.who))} (age ${m.age})`)}</p><p>${oscL(`「${esc(m.say)}」`,`"${esc(oscT(m.say))}"`)}</p>
    <p class="osc-sub">${oscL(`掌門執${ms==="r"?"紅、你執黑":"黑、你執紅"}・目前強度 ${rk}${R&&R.n?`・${cn}下過 ${R.n} 盤：勝 ${R.w}・和 ${R.d}・負 ${R.l}`:""}`,`Master plays ${ms==="r"?"Red, you play Black":"Black, you play Red"} · current strength ${rk}${R&&R.n?` · ${cn} played ${R.n}: won ${R.w} · drew ${R.d} · lost ${R.l}`:""}`)}</p>
    <div class="osc-row"><button class="btn${mine?"":" ghost"}" data-zm="${m.id}">${oscL(`🏯 挑戰${esc(m.nm)}`,`🏯 Challenge ${esc(m.en)}`)}</button></div></div></div>`}
/* 十派掌門頁 #/school/masters：修行角色＝首頁隨行的那位；自家掌門排第一 */
function oscMasters(v){oscCss();setTop(oscL("🏯 十派掌門","🏯 Ten School Masters"),"#/school");setTabs(false);
  const draw=()=>{const P=typeof ptyGet==="function"?ptyGet():null,c=P&&PTY.has(P,P.look)?P.look:"",o=oscGet(),my=c?OSC.act(o,c):"",z=zmGet(),beat=OSC.zmBeaten(z).length,cn=c?esc(oscNmE(c)):"";
    const L=OSC.MST.slice().sort((a,b)=>(b.sid===my)-(a.sid===my));
    v.innerHTML=`<div class="pad osc"><p class="osc-sub">${oscL(`雲河棋會十派各有一位掌門，比門下棋友高一截；贏一盤他下次強一段，輸一盤弱一段。已勝 ${beat}／10 位。每位掌門第一次被你贏，修為 +30（整個帳號只給一次；順風時更多）。`,`Each of the Cloud River Chess Club's ten schools has a master, a step above its players. Win and the master gets one level stronger next time; lose and they get one level weaker. Beaten: ${beat}/10. Your first win against each master gives XP +30 (once per account; more with a fair wind).`)}</p>
      ${c?`<p class="osc-sub">${oscL(`挑戰的角色：<b>${cn}</b>${my?`（${esc(OSC.sch(my).nm)}）`:"（還沒入派也能挑戰）"}；戰績照角色分開記。要換人，先在🌟 雲河七星卡冊把那位設為隨行。`,`Challenger: <b>${cn}</b>${my?` (${esc(oscSchE(my).nm)})`:" (you can challenge before joining a school)"}. Records are kept per character. To switch, set another character as your companion in 🌟 Cloud River Seven Stars.`)}</p>`:`<p class="osc-sub">${oscL("開始旅程、有了隊伍以後才能挑戰。","Start a journey and form a party before challenging.")}</p>`}
      ${L.map(m=>zmCardHTML(m,z,c,m.sid===my)).join("")}<p class="osc-free">${oscL("掌門與門派是遊戲創作；「掌門」是帶頭教棋的人，不代表天下最強。","Masters and schools are game fiction. A \"master\" is the one who leads the teaching, not the strongest player in the world.")}</p></div>`;
    v.querySelectorAll("[data-zm]").forEach(b=>b.onclick=()=>{try{vibrate(5)}catch(e){}const m=OSC.mst(b.dataset.zm);if(m)zmStart(m)})};
  draw();return{}}
/* 修行頁上的自家掌門一區（oscHome 呼叫） */
function zmHomeHTML(c,sid){const m=OSC.MST.find(x=>x.sid===sid);if(!m)return"";return`<div class="osc-st">${oscL("十派掌門","Ten School Masters")}</div>${zmCardHTML(m,zmGet(),c,true)}<button class="btn ghost" id="oscZmAll">${oscL("也挑戰其他九派的掌門 ›","Challenge the other nine masters too ›")}</button>`}
/* 千秋大百科（07i-codex.js 的 CODEX）加一類：大百科的字照全站翻譯器翻（字典有這幾句） */
try{if(typeof CODEX!=="undefined"&&Array.isArray(CODEX)&&!CODEX.some(x=>x.id==="zm"))CODEX.push({id:"zm",g:"book",ic:"🏯",nm:"十派掌門",
  say:"雲河棋會十派各有一位掌門。任何一位已加入隊伍的七星都能挑戰；每位掌門第一次被你贏，修為 +30（順風時更多）。",v:()=>{const x=OSC.zmBeaten(zmGet()).length;return{x,y:OSC.MST.length,u:oscL("位","masters"),s:oscL(`贏過 ${x} 位掌門`,`Beat ${x} masters`)}},go:()=>{location.hash="#/school/masters"}})}catch(e){}
