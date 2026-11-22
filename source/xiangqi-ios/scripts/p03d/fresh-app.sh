#!/bin/zsh
# 用法：fresh-app.sh <模擬器UDID> <App.app 路徑> [埠號，預設 47821]
# 抹掉模擬器 → 開機 → 安裝 App → 第一次開啟前預建 localStorage（http://127.0.0.1:47821 的 xq_netRoot="xq_test"）
set -e
U=$1; APP=$2; PORT=${3:-47821}; BID=com.raysonchen.xiangqiqianqiu.dev
xcrun simctl shutdown $U 2>/dev/null || true
xcrun simctl erase $U
xcrun simctl boot $U
xcrun simctl bootstatus $U -b >/dev/null 2>&1
xcrun simctl install $U "$APP"
C=$(xcrun simctl get_app_container $U $BID data)
W="$C/Library/WebKit/$BID/WebsiteData"
/usr/bin/python3 -I - "$W" http 127.0.0.1 $PORT <<'PY'
import sys,os,hashlib,base64,struct,sqlite3
W,scheme,host,port=sys.argv[1:5]
D=os.path.join(W,'Default');os.makedirs(D,exist_ok=True)
sp=os.path.join(D,'salt')
if not os.path.exists(sp): open(sp,'wb').write(os.urandom(8))
salt=open(sp,'rb').read()
o=f"{scheme}://{host}"+(f":{port}" if port else "")
h=base64.urlsafe_b64encode(hashlib.sha256(o.encode()+salt).digest()).decode().rstrip('=')
od=os.path.join(D,h,h);os.makedirs(os.path.join(od,'LocalStorage'),exist_ok=True)
def s8(x): b=x.encode(); return struct.pack('<I',len(b))+b'\x01'+b
one=s8(scheme)+s8(host)+((b'\x01'+struct.pack('<H',int(port))) if port else b'\x00')
open(os.path.join(od,'origin'),'wb').write(one+one)
db=sqlite3.connect(os.path.join(od,'LocalStorage','localstorage.sqlite3'))
db.execute('CREATE TABLE IF NOT EXISTS ItemTable (key TEXT UNIQUE ON CONFLICT REPLACE, value BLOB NOT NULL ON CONFLICT FAIL)')
db.execute('INSERT INTO ItemTable VALUES (?,?)',('xq_netRoot','"xq_test"'.encode('utf-16-le')));db.commit();db.close()
print("seeded",o,h,W)
PY
