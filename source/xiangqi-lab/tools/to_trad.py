# 意見回饋 508（玩家，開發者核准）：「全面改成繁體字」——App 介面本來就是繁體，但大師對局、全國比賽、古譜、殘局、題庫這些資料是從簡體來源轉來的，
# 賽事名稱、棋手名字、開局名稱、註解都是簡體（例如「全国象棋个人锦标赛」「胡荣华」「中炮过河车」）。
# 建置時把 site/data 裡這些 JSON 的每一個字串（連鍵名一起，棋手名字查生平才對得上）用 OpenCC 的 s2tw（台灣用字）轉成繁體。
# 用法：python xiangqi-lab/tools/to_trad.py <檔案>…（build-site.js 會自動呼叫）
#
# 繁簡校對（2026-11-04）：OpenCC 的詞庫把不少人名、地名當成一般詞轉錯（「于幼华」變「於幼華」、「孙勇征」變「孫勇徵」、
# 「范思远」變「範思遠」、「曹岩磊」變「曹巖磊」……），連 gmbios 的鍵都對不上生平。轉換後再套用下面三層修正：
#   一、FIX：全部字串都套用的整詞修正（錯, 對），處理註解、標題、賽事裡的固定詞。
#   二、NAME_FIX：只在人名欄位套用（red、black、redteam、blackteam、players 名單的 name、gmbios 的鍵與 name）。
#       原則：簡體字本身也是正規繁體字（于余范岳岩梁周游栗芸松冬向征丑胡……）時，人名維持原字，不要轉成另一個字。
#       NAME_KEEP 裡的詞本來就是對的（業餘、師範、龍巖、儀徵……），先保護起來不動。
#   三、人名欄位改過的名字（三個字以上，例如「於幼華」→「于幼華」）自動記下來，再套到同一個檔的對局名稱、賽事、註解，
#       讓同一個人到處寫法一致。兩個字的名字（「於明」「於東」）容易撞到一般文句（「於明代」「位於東邊」），不自動套。
import json, os, re, sys, time
import opencc

CC = opencc.OpenCC("s2tw")
memo = {}

# 一、全部字串都套用的整詞修正（錯, 對）
FIX = [
    ("秘 捲上", "秘 卷上"),  # 橘中秘 卷上（書的卷次，不是捲起來）
    ("》捲上", "》卷上"),
    ("停鍾", "停鐘"),  # 停鐘認負（棋鐘）
    ("鐘少鴻", "鍾少鴻"),  # 「財大钟少鸿」被當成「大鐘」
    ("箇中炮", "個中炮"),  # 擺了個中炮
    ("銀川后勝", "銀川後勝"),
    ("襬上", "擺上"),
    ("柺子馬", "拐子馬"),
    ("倒轉幹戈", "倒轉干戈"),
    ("斃馬僕途", "斃馬仆途"),
    ("鬥機璇璣", "斗機璇璣"),  # 北斗的斗
    ("鉅野", "巨野"),  # 山東巨野縣
    ("鹹安", "咸安"),  # 湖北咸寧咸安區
    ("西鹹", "西咸"),  # 陝西西咸新區
    ("鹹服", "咸服"),
    ("鹹寧", "咸寧"),  # 湖北咸寧市（評比循環第 1 輪：brilliant.json「湖北省鹹寧市」）
    ("鹹陽", "咸陽"),  # 陝西咸陽
    ("馮鹹堅", "馮咸堅"),  # 棋手冯咸坚
    ("千裡", "千里"),  # 殘局名「千里雙龍」「計定千里」「獨行千里」
    ("舍車", "捨車"),
    ("舍炮", "捨炮"),
    ("舍象", "捨象"),
    ("舍兵", "捨兵"),
    ("舍近", "捨近"),
    ("大隻剩", "大只剩"),
    ("髮現", "發現"),  # 「紅发现」被切成「紅髮」
    ("類同于", "類同於"),
    ("裡水棋", "里水棋"),  # 佛山南海里水鎮（「夢裡水鄉」是對的，不能整個「裡水」都換）
    ("(裡水)", "(里水)"),
    ("弗裡施", "弗里施"),
    ("嘎裡", "嘎里"),
    ("納裡杯", "納里杯"),
    ("託羅", "托羅"),
    ("國樑", "國梁"),  # 屠国梁、赵国梁、谭国梁、马国梁
    ("樑山", "梁山"),
    ("鼕鼕", "冬冬"),  # 陈冬冬
    ("朱儁", "朱俊"),  # 朱俊明、朱俊奇、朱俊宁
    ("總彙", "總匯"),  # 名煙總匯
    ("徐彙", "徐匯"),  # 上海徐匯區
    ("楊淩", "楊凌"),  # 陝西楊凌示範區
    ("麼毅", "么毅"),
    ("叶韻", "葉韻"),  # 「叶韵」被當成古音「叶韻」，其實是人名葉韻
    ("駐广", "駐廣"),
    ("孫勇徵", "孫勇征"),
    ("於幼華", "于幼華"),
    ("於紅木", "于紅木"),
]

# 二、只在人名欄位套用（錯, 對）
NAME_FIELDS = {"red", "black", "redteam", "blackteam"}
NAME_KEY_FILES = {"gmbios.json"}  # 這些檔的最外層鍵和裡面的 name 都是棋手名字
NAME_FIX = [
    ("東昇", "東升"),  # 李东升、唐东升（原本就寫「昇」的李旭昇、尹昇不動）
    ("幹志明", "干志明"),
    ("於", "于"),
    ("餘", "余"),
    ("範", "范"),
    ("嶽", "岳"),
    ("巖", "岩"),
    ("樑", "梁"),
    ("儁", "俊"),
    ("鼕", "冬"),
    ("嚮", "向"),
    ("髮", "發"),
    ("週", "周"),
    ("徵", "征"),
    ("鬍", "胡"),
    ("慄", "栗"),
    ("蕓", "芸"),
    ("淩", "凌"),
    ("鹹", "咸"),
    ("遊", "游"),
    ("鬆", "松"),
    ("醜", "丑"),
    ("託", "托"),
    ("裡", "里"),
    ("鐘", "鍾"),
    ("廕", "蔭"),
    ("佔", "占"),  # 任占国、占齐红
    ("鬱", "郁"),  # 郁胜金
    ("塗", "涂"),  # 涂世明（地名「當塗」不動）
    ("夥", "伙"),  # 郑伙添
    ("闢", "辟"),
    ("麼", "么"),
    ("叶", "葉"),
    ("广", "廣"),
]
NAME_KEEP = ["於氏", "業餘", "新餘", "餘姚", "餘干", "師範", "示範", "模範", "龍巖", "儀徵", "魏徵", "仙遊", "旅遊", "遊戲", "遊樂", "橋樑", "晨鐘", "分鐘", "當塗", "塗覆"]
NAME_HIT = set(a[0] for a, _ in NAME_FIX)


def fix_all(t):
    for a, b in FIX:
        if a in t:
            t = t.replace(a, b)
    return t


def fix_name(t):
    if not NAME_HIT.intersection(t):
        return t
    keep = [k for k in NAME_KEEP if k in t]
    for i, k in enumerate(keep):
        t = t.replace(k, f"\0{i}\0")
    for a, b in NAME_FIX:
        if a in t:
            t = t.replace(a, b)
    for i, k in enumerate(keep):
        t = t.replace(f"\0{i}\0", k)
    return t


def tr(s):
    if not s or s.isascii():
        return s
    r = memo.get(s)
    if r is None:
        r = memo[s] = fix_all(CC.convert(s))
    return r


class Conv:
    """一個檔一份：先轉人名欄位、記下改過的名字，再轉其他字串時把這些名字一起改正。"""

    def __init__(self, name_keys=False):
        self.name_keys = name_keys
        self.learned = {}
        self.rx = None
        self.memo2 = {}

    def name(self, s):
        if not s or s.isascii():
            return s
        t = tr(s)
        u = fix_name(t)
        if u != t and len(t) >= 3:
            self.learned[t] = u
        return u

    def collect(self, x, fld=None, parent=None, top=True):
        # 第一輪：只看人名欄位
        if isinstance(x, list):
            for v in x:
                self.collect(v, fld, parent, False)
        elif isinstance(x, dict):
            for k, v in x.items():
                if top and self.name_keys:
                    self.name(k)
                if isinstance(v, str):
                    if k in NAME_FIELDS or (k == "name" and (fld == "players" or (self.name_keys and parent is None and not top))):
                        self.name(v)
                else:
                    self.collect(v, k, fld if not top else None, False)
        if top and self.learned:
            ks = sorted(self.learned, key=len, reverse=True)
            self.rx = re.compile("|".join(map(re.escape, ks)))

    def other(self, s):
        t = tr(s)
        if self.rx is None or not t or t.isascii():
            return t
        r = self.memo2.get(t)
        if r is None:
            r = self.memo2[t] = self.rx.sub(lambda m: self.learned[m.group(0)], t)
        return r

    def walk(self, x, fld=None, parent=None, top=True):
        if isinstance(x, str):
            return self.other(x)
        if isinstance(x, list):
            return [self.walk(v, fld, parent, False) for v in x]
        if isinstance(x, dict):
            out = {}
            for k, v in x.items():
                nk = self.name(k) if (top and self.name_keys) else self.other(k)
                if isinstance(v, str) and (k in NAME_FIELDS or (k == "name" and (fld == "players" or (self.name_keys and parent is None and not top)))):
                    out[nk] = self.name(v)
                else:
                    out[nk] = self.walk(v, k, fld if not top else None, False)
            return out
        return x


def walk(x, name_keys=False):
    c = Conv(name_keys)
    c.collect(x)
    return c.walk(x)


if __name__ == "__main__":
    for f in sys.argv[1:]:
        t0 = time.time()
        try:
            d = json.load(open(f, encoding="utf-8"))
        except Exception as e:
            print(f"  {f}：讀不到（{e}）")
            continue
        json.dump(walk(d, os.path.basename(f) in NAME_KEY_FILES), open(f, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
        print(f"  {f}：轉成繁體（{time.time() - t0:.1f} 秒）")
