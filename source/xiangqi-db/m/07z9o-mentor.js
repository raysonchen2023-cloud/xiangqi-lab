/* ===== W89 掌門覆盤（11/24 開發者在 iMac Claude 1 的選單選 Gemini 文案 2「掌門覆盤：角色化的賽後檢討」）=====
   賽後檢討「這盤最關鍵的一步」改由玩家主修門派的掌門講一句；沒拜師的角色由隨行夥伴（首頁小人那位）講。
   評等分三組（另有 w＝整盤沒有明顯錯著時誇一句，q 傳「全盤」）：好（妙著、正著）、慢（穩著、緩著）、錯（失著、敗著）；十派掌門照各自人設與本派棋理各寫一組，中英都有。
   原則：輸棋不嘲諷，是師父指點；錯著的那句最後都把玩家帶回「看看這步該怎麼走」。用現有立繪（data/npc/zm_<派>.webp、data/xs/prev_<角色>.webp），不出新圖。
   前綴 mnt（先 grep 過沒撞名）。10-db.js 關鍵步模式呼叫 mntCard；08b-cpugame.js「這盤沒有明顯的錯著」呼叫 mntSay。 */
const MNT_LINES={
  zm_central:{
    w:["這盤沒丟中炮門的臉：炮、車、馬一路都跟得上。","You did the Central Cannon School proud: cannon, chariot and horse moved together all game."],
    g:["這手「{mv}」走得好！炮架住了，車馬也跟上來了。這壺茶你喝得起。","\"{mv}\" — well played! The cannon is set and the chariot and horse kept up. You've earned this tea."],
    m:["「{mv}」不算錯，就是慢了。炮先到了，車還在家，對方就有時間站穩。","\"{mv}\" isn't wrong, just slow. The cannon arrived but the chariot stayed home, and that gave them time to settle."],
    b:["「{mv}」讓對方有機可乘。炮是架起來了，後面沒人接應。來，看看這一步該怎麼走。","\"{mv}\" let them in. The cannon was set, but nothing came up behind it. Come, let's see what this move should have been."]},
  zm_screen:{
    w:["這盤站得穩、守得住，也反擊得了。屏風馬門有你，我放心。","Steady all game: you held, and you struck back. The Screen Horse School is in good hands."],
    g:["「{mv}」站得穩。雙馬守住了，你才有本錢反擊。","\"{mv}\" stands firm. With both horses holding, you've earned the right to strike back."],
    m:["「{mv}」穩是穩了，可是機會來的時候，你沒伸手。","\"{mv}\" is steady enough, but when the chance came, you didn't reach for it."],
    b:["「{mv}」急了一步，陣腳就鬆了。先別懊惱，我們一起看，這裡該怎麼站。","\"{mv}\" was one step too hasty, and your footing slipped. No need to fret. Let's look together at how to stand here."]},
  zm_palace_horse:{
    w:["整盤刻下來，沒有一刀歪的。這一版可以拿去印了。","Not one crooked cut the whole game. This block is ready for printing."],
    g:["「{mv}」刻得乾淨，炮馬互相照應，一刀不歪。","\"{mv}\" is a clean cut: cannon and horse cover each other, not a line out of place."],
    m:["「{mv}」這一刀淺了些。子沒擋路，但也沒幫上忙。","\"{mv}\" cuts a little shallow. Nothing blocks the way, but nothing helps either."],
    b:["「{mv}」讓自己的子擋了自己的路，一刀錯，整版就歪。不要緊，版可以重刻，來看這步。","With \"{mv}\" your own pieces blocked your own path. One slip and the whole block runs crooked. It's fine, a block can be recut. Let's look at this move."]},
  zm_same_cannon:{
    w:["整盤都比對方快半步，痛快！","Half a step ahead the whole game. That's how it's done!"],
    g:["「{mv}」痛快！你的車馬就是比我先到一步。","\"{mv}\" — that's the spirit! Your chariot and horse got there a step ahead of mine."],
    m:["「{mv}」慢了半步。兩邊都架中炮，差的就是這半步。","\"{mv}\" is half a step slow. When both sides set the central cannon, that half step is everything."],
    b:["「{mv}」這手，讓我搶先了。輸一手不丟人，看清楚了下回就搶回來！來，看這步。","\"{mv}\" let me get ahead. Losing a move is no shame. See it clearly and you'll win it back next time! Come, look at this move."]},
  zm_opposite_cannon:{
    w:["整盤兩翼都顧到了，這齣戲唱得好！","You covered both wings all game. A fine performance!"],
    g:["「{mv}」好！兩翼都顧到了，鼓點換場你也跟得上。","\"{mv}\" — good! You watched both wings and kept up when the drumbeat changed the scene."],
    m:["「{mv}」只盯著中路，另一翼的戲就慢了一拍。","\"{mv}\" only watches the center, and the other wing falls a beat behind."],
    b:["「{mv}」走完，另一翼就空了，對方從那邊上場。別灰心，這齣戲我們再排一次，看這步。","After \"{mv}\" the other wing was empty, and they came on from there. Don't lose heart. Let's rehearse this scene again: look at this move."]},
  zm_pawn:{
    w:["好孩子，整盤都聽得清清楚楚，一句也沒漏。","Good child, you heard every word this game and missed nothing."],
    g:["「{mv}」好孩子，你先聽清了對方，再開口。","\"{mv}\" — good child. You heard them out before you answered."],
    m:["「{mv}」不急是好，可是聽清楚了，也要記得回話呀。","\"{mv}\" — not rushing is good, but once you've heard them, remember to answer."],
    b:["「{mv}」走得太快，還沒聽清對方要往哪裡去。不打緊，老身陪你慢慢看這一步。","\"{mv}\" came too quickly, before you'd heard where they were going. Never mind. Let's look at this move together, slowly."]},
  zm_elephant:{
    w:["整盤陣形安穩，大子也出得及時。這才是飛相門的穩。","A settled formation and timely development all game. That's the Elephant School's kind of steady."],
    g:["「{mv}」陣形安頓了，大子也出來了。穩，不是不動，你懂了。","\"{mv}\": your formation is settled and your big pieces are out. Steady doesn't mean still, and you understand that."],
    m:["「{mv}」穩是穩，大子卻還沒動。陣形安頓好了，就該出子了。","\"{mv}\" is steady, but your big pieces haven't moved. Once the formation is settled, it's time to develop."],
    b:["「{mv}」這一步，陣形露了空。老夫當年也走過，記下來就不會再走。來，看這步該怎麼走。","\"{mv}\" left a gap in your formation. I made that move myself once; write it down and you won't make it again. Come, let's see how this move should go."]},
  zm_horse:{
    w:["整盤馬都跑得順，沒被絆過一次！","Your horses ran free the whole game, never tripped once!"],
    g:["「{mv}」漂亮！馬放出去了，往哪邊都有路。","\"{mv}\" — beautiful! The horse is out, with a road in every direction."],
    m:["「{mv}」馬是出了，可是跑得慢吞吞的，對方都把路堵上了。","\"{mv}\" — the horse is out, but it's dawdling, and they've blocked the road."],
    b:["「{mv}」馬腳被絆住了！沒事沒事，換條路就好。我們一起看，這步該往哪跑。","\"{mv}\" tripped the horse! No harm done, we'll find another road. Let's look together at where it should run."]},
  zm_cross_palace:{
    w:["整盤兩翼平平整整，是一張好紙。","Both wings smooth and even all game. A fine sheet of paper."],
    g:["「{mv}」兩翼都接上了，平平整整，像一張好紙。","\"{mv}\" joins both wings, smooth and even, like a good sheet of paper."],
    m:["「{mv}」這道工序省了一步，紙還能用，就是不夠平。","\"{mv}\" skips a step in the process. The paper's still usable, just not quite flat."],
    b:["「{mv}」走完，一翼太擠、一翼太空，紙就晾歪了。重新抄一張就好，來看這一步。","After \"{mv}\" one wing was crowded and the other empty, and the paper dried crooked. We'll just make a fresh sheet. Let's look at this move."]},
  zm_advisor_corner:{
    w:["整盤估價都準，沒讓對方占到便宜。","Every appraisal was sharp this game; they never got a bargain."],
    g:["「{mv}」估得準，變化留在手裡，價錢由你開。","\"{mv}\" — a sharp appraisal. You kept your options and got to name the price."],
    m:["「{mv}」看貨看得久了點，好價錢就被別人開走了。","\"{mv}\" — you looked at the goods a little too long, and someone else named the good price."],
    b:["「{mv}」太早把底牌亮了，價錢就由對方開。這次是學費，我們看看這步該怎麼出價。","\"{mv}\" showed your hand too early, so they got to name the price. Call it tuition. Let's see how you should have bid on this move."]}};
/* 沒拜師：隨行夥伴講（{nm} 是他的名字，用同一套說法，不冒充掌門） */
const MNT_PAL={
  w:["這盤下得真好，我在旁邊看得好過癮！","What a game! I loved watching every move."],
  g:["「{mv}」這步走得好！我在旁邊看著都想拍手。","\"{mv}\" — great move! I wanted to clap just watching."],
  m:["「{mv}」也行，不過我覺得好像還有更快的走法。","\"{mv}\" works, but I think there might have been a faster move."],
  b:["「{mv}」走完，對方好像就有機會了。別洩氣，我們一起看看這一步怎麼走比較好。","After \"{mv}\" it looks like they got their chance. Don't be discouraged. Let's look together at a better move here."]};
const MNT_PAL_EN={x_swordboy:"Qi Zhe",x_miaogirl:"Luo Yuemei",x_shuai:"Shen Fangting",x_shi:"Tie Liancheng",x_spiritgirl:"Tian Feiyan",x_bing:"Bu Yuexi",x_martialgirl:"Lei Jiehua"};
const mntGrp=q=>q==="全盤"?"w":["妙著","正著"].includes(q)?"g":["穩著","緩著"].includes(q)?"m":["失著","敗著"].includes(q)?"b":"";
/* 誰來講：目前角色（首頁小人）主修哪派就是那派掌門；沒拜師、門派資料沒載到就是隨行夥伴 */
function mntWho(){try{const P=typeof ptyGet==="function"?ptyGet():null,c=P&&P.look;
    const sid=c&&typeof OSC!=="undefined"&&typeof oscGet==="function"?OSC.act(oscGet(),c):"",m=sid&&OSC.MST?OSC.MST.find(x=>x.sid===sid):null;
    if(m)return{k:"zm",id:m.id,nm:m.nm,en:m.en||m.nm,img:typeof zmImg==="function"?zmImg(m):`data/npc/${m.id}.webp`,
      tt:typeof oscSchE==="function"&&oscSchE(sid)?oscSchE(sid).nm:""};
    const W=c&&typeof WX_CHARS!=="undefined"&&WX_CHARS[c];if(W)return{k:"pal",id:c,nm:W.n,en:MNT_PAL_EN[c]||W.n,img:`data/xs/prev_${c}.webp`,tt:""};
  }catch(e){}return null}
const mntIsEn=()=>typeof oscEn==="function"?oscEn():typeof i18nLang==="function"&&i18nLang()==="en";
/* 一句話：q＝評等（妙著…敗著），mv＝那一步的棋譜寫法；回 {who, text} 或 null */
function mntSay(q,mv,who){const W=who||mntWho(),G=mntGrp(q);if(!W||!G)return null;const L=(W.k==="zm"&&MNT_LINES[W.id]||MNT_PAL)[G],en=mntIsEn();
  let t=L[en?1:0];t=mv?t.split("{mv}").join(mv):t.replace(/^「\{mv\}」|^"\{mv\}"\s*(—\s*)?/,"").replace(/^[，、]/,"");
  return{who:W,text:t.charAt(0).toUpperCase()+t.slice(1)}}
/* 關鍵步模式的對話卡：立繪＋名字＋一句話；el＝說明框，卡放在它上面（同一個父元素裡只放一張） */
function mntCard(el,q,mv){if(!el||!el.parentNode)return;let c=el.parentNode.querySelector(".mnt-card");const S=mntSay(q,mv);
  if(!S){if(c)c.remove();return}
  if(!c){c=document.createElement("div");c.className="mnt-card";el.parentNode.insertBefore(c,el)}
  const en=mntIsEn(),nm=en?S.who.en:S.who.nm,role=S.who.k==="zm"?(en?"Your master":"掌門")+(S.who.tt?"・"+S.who.tt:""):(en?"Your companion":"夥伴");
  c.style.cssText="display:flex;gap:10px;align-items:flex-start;margin:6px 0 8px;padding:8px 10px;border:1px solid var(--line,#d9cdb4);border-radius:12px;background:var(--card,#fffaf0)";
  c.innerHTML=`<img src="${esc(S.who.img)}" alt="" style="width:52px;height:52px;flex:none;border-radius:50%;object-fit:cover;object-position:top;background:#eee" onerror="this.remove()">`+
    `<div style="min-width:0"><b style="font-size:14px">${esc(nm)}</b><span class="muted" style="font-size:12px;margin-left:6px">${esc(role)}</span>`+
    `<div style="font-size:15px;line-height:1.5;margin-top:2px">${esc(S.text)}</div></div>`}
