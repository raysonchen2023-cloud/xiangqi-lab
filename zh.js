/* 意見回饋 518（開發者）：繁簡切換。設定 →「文字」選繁體（預設）或簡體。
   繁體：資料大多建置時就轉好了；畫面上只要出現「繁體字集（Big5）裡沒有的純簡體字」，那一段文字就用 OpenCC（opencc-js，MIT）轉成台灣繁體——
         手機裡還留著舊的簡體資料也會當場轉過來。原本就是繁體的字不動（避免「冷面」被改成「冷麵」）。
   簡體：整個畫面用 OpenCC 從台灣繁體轉成簡體。 */
(function(){"use strict";
  const SIMP=new Set("专业丛东丝丢两严丧个临为丽举义乌乐乔习乡书买乱争亏亘亚产亩亲亵亸亿仅从仑仓仪们众会伛伞伟传伡伣伤伥伦伧伪伫佥侠侣侥侦侧侨侩侪侬侭俣俦俨俩俪俫俭债倾偬偻偾偿傤傥傧储傩僞兑兖兰关兴兹养兽冁内冈册写军农冯冲决况冻净凉减凑凛凤凫凭凯击凿刍刘则刚创删别刬刭刹刽刾刿剀剂剐剑剥剧劝办务劢动励劲劳势勋勚匀匦匮区医华协单卖卢卤卧卫却卺厅历厉压厌厍厐厕厢厣厦厨厩厮县叁参叆叇双发变叙叠叶号叹叽吓吕吗启吴呐呒呓呕呖呗员呙呛呜咏咙咛咝咤响哑哒哓哔哕哗哙哜哝哟唛唝唠唡唢唤啓啧啬啭啮啯啰啴啸喷喽喾嗫嗳嘘嘤嘱噜嚣团园囱围囵国图圆圹场块坚坛坜坝坞坟坠垄垅垆垒垦垩垫垭垯垱垲垴埘埙埚堑堕塆墙壮声壳壶壸处备够头夹夺奁奂奋奖奥妆妇妈妩妪妫姗姹娄娅娆娇娈娱娲娴婳婴婵婶媪媭嫒嫔嫱嬀嬷孙学孪宝实宠审宪宫宽宾寝对寻导寿将尔尘尝尧尴尽层屃屉届属屡屦屿岁岂岖岗岘岚岛岽岿峃峄峡峣峤峥峦峯崂崃崄崭嵘嵚嵝巅巩巯币帅师帏帐帜带帧帮帱帻帼幂幺广庆庐庑库应庙庞废庼廪开弃弑张弥弪弯弹强归当录彟彦彨彻径徕忆忧忾态怂怃怄怅怆总怼怿恋恳恶恸恹恺恻恼恽悦悫悬悭悮悯惧惨惩惫惬惭惮惯愠愤愦慑慭懑懒懔戆戋戏戗战戬戯户执扩扪扫扬抚抛抟抠抡抢护报担拟拢拣拥拦拧拨择挚挛挜挝挞挟挠挡挢挣挤挥挦捝捞损捡换捣掳掴掷掸掺掼揽揾揿搀搁搂搄搅携摄摅摆摇摈摊撄撑撵撷撸撺擜擞擡攒敌敚敛敩数斋斓斩断无旧时旷旸昙昼昽显晋晓晔晕晖暂暅暧术杀杂权条来杨杩枞枢枣枥枧枨枪枫枭柠柽栀栅标栈栉栊栋栌栎栏树样栾桠桡桢档桤桥桦桧桨桩桪梦梼梾梿检棁棂椁椝椟椠椢椤椫椭椮楼榄榅榇榈榉榝槚槛槟槠横樯樱橥橱橹橼檩欢欤欧歼殁殇残殒殓殚殡殴毁毂毕毙毡毵毶氇氢氩氲汇汉汤汹沟没沣沤沥沦沧沨沩沪泪泶泷泸泺泻泼泽泾浃浅浆浇浈浉浊测浍济浏浐浑浒浓浔浕涚涛涝涞涟涠涡涢涣涤润涧涨涩渊渌渍渎渐渑渔渖渗温湾湿溁溃溅溆溇滗滚滞滟滠满滢滤滥滦滨滩滪潆潇潋潍潙潜潨潴澛澜濑濒灏灭灯灵灾灿炀炉炜炝点炼炽烁烂烃烛烟烦烧烨烩烫烬热焕焖焘煴爱爲爷牀牍牦牵牺犊状犷犸犹狈狝狞独狭狮狯狰狱狲猃猎猕猡猪猫猬献獭玑玙玚玛玮环现玱玺珐珑珰珲琎琏琐琼瑶瑷瑸璎瓒瓯电画畅畴疖疗疟疠疡疬疭疮疯疱疴痈痉痖痨痪痫瘅瘆瘗瘘瘪瘫瘾瘿癞癣癫皑皱皲盏盐监盖盗盘眍眦眬着睁睐睑瞆瞒瞩矫矶矾矿砀码砖砗砚砜砺砻砾础硁硕硖硗硙硚硵硷碍碛碜碱礼祃祎祢祯祷祸禀禄禅秃秆积称秽秾稆税稣稳穑穞穷窃窍窎窑窜窝窥窦窭竈竖竞笃笋笔笕笺笼笾筚筛筜筝筹筼签筿简箓箦箧箨箩箪箫篑篓篮篯簖籁籴类籼粜粝粤粪粮糁糇糉糍紧絷緼縆繮纟纠纡红纣纤纥约级纨纩纪纫纬纭纮纯纰纱纲纳纴纵纶纷纸纹纺纻纼纽纾线绀绁绂练组绅细织终绉绊绋绌绍绎经绐绑绒结绔绕绖绗绘给绚绛络绝绞统绠绡绢绣绤绥绦继绨绩绪绫绬续绮绯绰绱绲绳维绵绶绷绸绹绺绻综绽绾绿缀缁缂缃缄缅缆缇缈缉缊缋缌缍缎缏缐缑缒缓缔缕编缗缘缙缚缛缜缝缞缟缠缡缢缣缤缥缦缧缨缩缪缫缬缭缮缯缰缱缲缳缴缵罂罗罚罢罴羁羟羣翘翙翚耢耧耸耻聂聋职聍联聩聪肃肠肤肾肿胀胁胆胧胨胪胫胶脉脍脏脐脑脓脔脚脱脶脸腘腭腻腼腽腾膑臜舆舣舰舱舻艰艳艺节芈芗芜芦苁苇苈苋苌苍苎苏茎茏茑茔茕荆荙荚荛荜荝荞荟荠荡荣荤荥荦荧荨荩荪荫荬荭荮药莅莱莲莳莴莶获莸莹莺莼萚萝萤营萦萧萨葱蒀蒇蒉蒋蒌蓝蓟蓠蓣蓥蓦蔷蔹蔺蔼蔿蕰蕲蕴薮藓藴蘖虏虑虚虬虽虾虿蚀蚁蚂蚃蚬蛊蛎蛏蛮蛰蛱蛲蛳蛴蜕蜗蝇蝈蝉蝼蝾螀螨蟏衅衆衔补衬衮袄袅袆袜袭袯装裆裈裢裣裤裥褛褴襕见观觃规觅视觇览觉觊觋觌觍觎觏觐觑觞觯訚詟誉誊讠计订讣认讥讦讧讨让讪讫讬训议讯记讱讲讳讴讵讶讷许讹论讻讼讽设访诀证诂诃评诅识诇诈诉诊诋诌词诎诏诐译诒诓诔试诖诗诘诙诚诛诜话诞诟诠诡询诣诤该详诧诨诩诪诫诬语诮误诰诱诲诳说诵诶请诸诹诺读诼诽课诿谀谁谂调谄谅谆谇谈谉谊谋谌谍谎谏谐谑谒谓谔谕谖谗谘谙谚谛谜谝谞谟谠谡谢谣谤谥谦谧谨谩谪谫谬谭谮谯谰谱谲谳谴谵谶豮贝贞负贠贡财责贤败账货质贩贪贫贬购贮贯贰贱贲贳贴贵贶贷贸费贺贻贼贽贾贿赀赁赂赃资赅赆赇赈赉赊赋赌赍赎赏赐赑赒赓赔赕赖赗赘赙赚赛赜赝赞赟赠赡赢赣赪赵趋趱趸跃跄跞践跶跷跸跹跻踌踪踬踯蹑蹒蹰蹿躏躜躯輼车轧轨轩轪轫转轭轮软轰轱轲轳轴轵轶轷轸轹轺轻轼载轾轿辀辁辂较辄辅辆辇辈辉辊辋辌辍辎辏辐辑辒输辔辕辖辗辘辙辚辞辩辫边辽达迁过迈运还这进远违连迟迩迳迹选逊递逦逻遗遥邓邝邬邮邹邺邻郏郐郑郓郦郧郸酂酝酦酱酽酾酿醖释鉢鉴銮錾钅钆钇针钉钊钋钌钍钎钏钐钑钒钓钔钕钖钗钘钙钚钛钜钝钞钟钠钡钢钣钤钥钦钧钨钩钪钫钬钭钮钯钰钱钲钳钴钵钶钷钸钹钺钻钼钽钾钿铀铁铂铃铄铅铆铇铈铉铊铋铌铍铎铏铐铑铒铓铔铕铖铗铘铙铚铛铜铝铞铟铠铡铢铣铤铥铦铧铨铩铪铫铬铭铮铯铰铱铲铳铴铵银铷铸铹铺铻铼铽链铿销锁锂锃锄锅锆锇锈锉锊锋锌锍锎锏锐锑锒锓锔锕锖锗锘错锚锛锜锝锞锟锠锡锢锣锤锥锦锧锨锩锪锫锬锭键锯锰锱锲锳锴锵锶锷锸锹锺锻锼锽锾锿镀镁镂镃镄镅镆镇镈镉镊镋镌镍镎镏镐镑镒镓镔镕镖镗镘镙镚镛镜镝镞镟镠镡镢镣镤镥镦镧镨镩镪镫镬镭镮镯镰镱镲镳镴镵镶长门闩闪闫闬闭问闯闰闱闲闳间闵闶闷闸闹闺闻闼闽闾闿阀阁阂阃阄阅阆阇阈阉阊阋阌阍阎阏阐阑阒阓阔阕阖阗阘阙阚阛队阳阴阵阶际陆陇陈陉陕陦陧陨险随隐隶隽难雏雠雳雾霁霡霭靓靔静靥鞑鞒鞯鞲韦韧韨韩韪韫韬韵页顶顷顸项顺须顼顽顾顿颀颁颂颃预颅领颇颈颉颊颋颌颍颎颏颐频颒颓颔颕颖颗题颙颚颛颜额颞颟颠颡颢颣颤颥颦颧风飏飐飑飒飓飔飕飖飗飘飙飚飞飨餍饣饤饥饦饧饨饩饪饫饬饭饮饯饰饱饲饳饴饵饶饷饸饹饺饻饼饽饾饿馀馁馂馃馄馅馆馇馈馉馊馋馌馍馎馏馐馑馒馓馔馕马驭驮驯驰驱驲驳驴驵驶驷驸驹驺驻驼驽驾驿骀骁骂骃骄骅骆骇骈骉骊骋验骍骎骏骐骑骒骓骔骕骖骗骘骙骚骛骜骝骞骟骠骡骢骣骤骥骦骧髅髋髌鬓鬶魇魉鮎鱼鱽鱾鱿鲀鲁鲂鲃鲄鲅鲆鲇鲈鲉鲊鲋鲌鲍鲎鲏鲐鲑鲒鲓鲔鲕鲖鲗鲘鲙鲚鲛鲜鲝鲞鲟鲠鲡鲢鲣鲤鲥鲦鲧鲨鲩鲪鲫鲬鲭鲮鲯鲰鲱鲲鲳鲴鲵鲶鲷鲸鲹鲺鲻鲼鲽鲾鲿鳀鳁鳂鳃鳄鳅鳆鳇鳈鳉鳊鳋鳌鳍鳎鳏鳐鳑鳒鳓鳔鳕鳖鳗鳘鳙鳚鳛鳜鳝鳞鳟鳠鳡鳢鳣鳤鸟鸠鸡鸢鸣鸤鸥鸦鸧鸨鸩鸪鸫鸬鸭鸮鸯鸰鸱鸲鸳鸴鸵鸶鸷鸸鸹鸺鸻鸼鸽鸾鸿鹀鹁鹂鹃鹄鹅鹆鹇鹈鹉鹊鹋鹌鹍鹎鹏鹐鹑鹒鹓鹔鹕鹖鹗鹘鹙鹚鹛鹜鹝鹞鹟鹠鹡鹢鹣鹤鹥鹦鹧鹨鹩鹪鹫鹬鹭鹮鹯鹰鹱鹲鹳鹴鹾麦麪麸麹麺麽黄黉黡黩黪黾鼋鼌鼍鼹齐齑齿龀龁龂龃龄龅龆龇龈龉龊龋龌龙龚龛龟鿎鿏鿒鿔㐷㐹㐽㑇㑈㑔㑩㓆㓥㓰㔉㖊㖞㘎㚯㛀㛟㛠㛣㛤㛿㟆㟜㟥㡎㤘㤽㥪㧏㧐㧑㧟㧰㨫㭎㭏㭣㭤㭴㱩㱮㲿㳔㳕㳠㳡㳢㳽㴋㶉㶶㶽㺍㻅㻏㻘䀥䁖䂵䃅䅉䅟䅪䇲䉤䌶䌷䌸䌹䌺䌻䌼䌽䌾䌿䍀䍁䍠䎬䏝䑽䓓䓕䓖䓨䗖䘛䘞䙊䙌䙓䜣䜤䜥䜧䜩䝙䞌䞍䞎䞐䟢䢀䢁䢂䥺䥽䥾䥿䦀䦁䦂䦃䦅䦆䦶䦷䩄䭪䯃䯄䯅䲝䲞䲟䲠䲡䲢䲣䴓䴔䴕䴖䴗䴘䴙䶮"),CJK=/[㐀-鿿]/;
  const mode=()=>{try{return JSON.parse(localStorage.getItem("xq_zhMode"))||"tw"}catch(e){return"tw"}};
  const hasSimp=t=>{for(const ch of t)if(SIMP.has(ch))return true;return false};
  let conv=null,loading=null;
  const load=()=>loading||(loading=new Promise((ok,no)=>{const cn=mode()==="cn",s=document.createElement("script");s.src=cn?"opencc-t2cn.js":"opencc-cn2t.js";
    s.onload=()=>{try{conv=cn?OpenCC.Converter({from:"tw",to:"cn"}):OpenCC.Converter({from:"cn",to:"tw"});ok()}catch(e){no(e)}};s.onerror=no;document.head.append(s)}));
  const SKIP=/^(SCRIPT|STYLE|TEXTAREA|INPUT|SELECT|CODE|CANVAS|SVG)$/i,ATTR=["placeholder","title","aria-label"];
  const need=t=>t&&CJK.test(t)&&(mode()==="cn"||hasSimp(t));
  /* 評比循環第 1 輪（AI 模擬玩家第二輪問題 9：時辰盤「丑」變「醜」、秦站「咸陽」變「鹹陽」）：OpenCC 簡→繁會把本來就是繁體的「丑」轉成「醜」、「咸」轉成「鹹」
     （opencc-cn2t.js 實測 conv("丑")＝醜、conv("咸陽")＝鹹陽）。繁體模式只該動純簡體字，所以轉完長度沒變時，原文是「丑」「咸」的位置一律放回原字 */
  const KEEP=new Set("丑咸"),tw=(t,c)=>{if(mode()==="cn"||c.length!==t.length)return c;let o="";for(let i=0;i<t.length;i++)o+=KEEP.has(t[i])?t[i]:c[i];return o};
  const fixText=n=>{const t=n.nodeValue;if(!need(t))return;if(!conv){pend.add(n);kick();return}const c=tw(t,conv(t));if(c!==t)n.nodeValue=c};
  const walk=n=>{if(n.nodeType===3)return fixText(n);if(n.nodeType!==1||SKIP.test(n.nodeName)||(n.closest&&n.closest("[data-nocc]")))return;
    for(const a of ATTR){const v=n.getAttribute&&n.getAttribute(a);if(v&&need(v)){if(!conv){pend.add(n);kick()}else{const c=tw(v,conv(v));if(c!==v)n.setAttribute(a,c)}}}
    for(let c=n.firstChild;c;c=c.nextSibling)walk(c)};
  const pend=new Set();let kicked=false;
  const kick=()=>{if(kicked)return;kicked=true;load().then(()=>{const L=[...pend];pend.clear();for(const n of L)if(n.isConnected)walk(n);if(mode()==="cn")walk(document.body)}).catch(()=>{kicked=false})};
  const start=()=>{if(mode()==="cn")kick();walk(document.body);
    new MutationObserver(ms=>{for(const m of ms){if(m.type==="characterData")fixText(m.target);else if(m.type==="attributes")walk(m.target);else for(const x of m.addedNodes)walk(x)}})
      .observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:ATTR});
    if(mode()==="cn"){const t0=document.title;load().then(()=>{document.title=conv(t0)}).catch(()=>{})}};
  window.XQ_ZH={mode,set(m){localStorage.setItem("xq_zhMode",JSON.stringify(m==="cn"?"cn":"tw"));location.reload()}};
  if(document.body)start();else document.addEventListener("DOMContentLoaded",start)})();
