#!/usr/bin/env bash
# 釘版本重建 Pikafish 網頁版，用來核對發布出去的 engine/pikafish.wasm、pikafish.js（第 13 輪 F2）
# 跟 build-wsl.sh 的差別：Emscripten 釘 6.0.13（不裝 latest）、檢查上游 commit 和 uci.cpp 雜湊、
#   固定排序語系和 __DATE__（SOURCE_DATE_EPOCH）、編到另一個資料夾（不碰原本的 out/）、留完整紀錄。
# 用法（Linux／WSL）：
#   bash build-pinned.sh <Pikafish 上游根目錄> <改過的 uci.cpp> <輸出資料夾>
#   例：wsl.exe -d Ubuntu-24.04 -- bash <專案根目錄>/xiangqi-wasm/build-pinned.sh \
#         <專案根目錄>/xiangqi-wasm/Pikafish <專案根目錄>/xiangqi-wasm/Pikafish/src/uci.cpp /tmp/pf-rebuild
# 輸出：<輸出資料夾>/pikafish.js、pikafish.wasm、build.log、SHA256SUMS
# 本機已有 emsdk 6.0.13 就直接用；沒有才會下載安裝（約 1 GB，要連網）。
set -euo pipefail
EMSDK_VER="6.0.13"
PF_TAG="Pikafish-2026-09-06"
PF_COMMIT="4c17cee11f888ae1d48a9494f2e2239f019f0a1f"
UCI_SHA256="149644b9781bbc7c3c8422ba9406ceaa20db1fad2d384ea96d0d8189ef20be5e"
# 原版是 2026-10-30 編的，Pikafish 的版本字串會用到 __DATE__；固定成那一天，重編才可能逐位元相同
export SOURCE_DATE_EPOCH="${SOURCE_DATE_EPOCH:-1793361600}"
export LC_ALL=C
PF="${1:?要給 Pikafish 上游根目錄}"; UCI="${2:?要給改過的 uci.cpp}"; OUT="${3:?要給輸出資料夾}"
EMSDK_DIR="${EMSDK_DIR:-$HOME/emsdk}"
mkdir -p "$OUT"; LOG="$OUT/build.log"; : > "$LOG"
say(){ echo "$*" | tee -a "$LOG"; }

say "== Pikafish 釘版本重建 $(date -u +%Y-%m-%dT%H:%M:%SZ)"
# 1. 上游原始碼：commit 要對
got="$(git -c safe.directory='*' -C "$PF" rev-parse HEAD 2>/dev/null || echo '?')"
say "上游 $PF_TAG commit：要 $PF_COMMIT，實際 $got"
[ "$got" = "$PF_COMMIT" ] || { say "✘ 上游 commit 不對"; exit 1; }
# 2. 改過的 uci.cpp：雜湊要對
got="$(sha256sum "$UCI" | cut -d' ' -f1)"
say "uci.cpp SHA-256：要 $UCI_SHA256，實際 $got"
[ "$got" = "$UCI_SHA256" ] || { say "✘ uci.cpp 不是發布用的那一份"; exit 1; }
# 3. Emscripten：釘 6.0.13
cur="$(cat "$EMSDK_DIR/upstream/emscripten/emscripten-version.txt" 2>/dev/null || echo none)"
if [ "${cur%-git}" != "$EMSDK_VER" ]; then
  say "本機 Emscripten 是 $cur，下載安裝 $EMSDK_VER（約 1 GB）"
  [ -d "$EMSDK_DIR" ] || git clone https://github.com/emscripten-core/emsdk.git "$EMSDK_DIR"
  (cd "$EMSDK_DIR" && ./emsdk install "$EMSDK_VER" && ./emsdk activate "$EMSDK_VER")
fi
# shellcheck disable=SC1091
source "$EMSDK_DIR/emsdk_env.sh" >/dev/null 2>&1
say "Emscripten：$(cat "$EMSDK_DIR/upstream/emscripten/emscripten-version.txt")（$(cat "$EMSDK_DIR/upstream/.emsdk_version" 2>/dev/null || echo '?')）"
say "$(em++ --version | head -1)"
say "$("$EMSDK_DIR/upstream/bin/clang" --version | head -1)"
say "SOURCE_DATE_EPOCH=$SOURCE_DATE_EPOCH（$(date -u -d "@$SOURCE_DATE_EPOCH" +%Y-%m-%d)）LC_ALL=$LC_ALL"
# 4. 複製一份乾淨的 src、換上 uci.cpp（不動上游檢出）
WORK="$OUT/work"; rm -rf "$WORK"; mkdir -p "$WORK"; cp -r "$PF/src" "$WORK/src"; cp "$UCI" "$WORK/src/uci.cpp"
cd "$WORK/src"
mapfile -t SRCS < <(find . \( -path ./universal -o -path ./temp_builds \) -prune -o -name '*.cpp' -print | sort)
say "編譯 ${#SRCS[@]} 個檔案：${SRCS[*]}"
FLAGS=(-O3 -DNDEBUG -std=c++17 -fno-exceptions -DIS_64BIT
  -msse -msse2 -mssse3 -msse4.1 -msimd128 -DUSE_SSE2 -DUSE_SSSE3 -DUSE_SSE41 -DUSE_POPCNT -DUSE_SLOPPY_ATOMICS
  -pthread -flto)
LINK=(-sPROXY_TO_PTHREAD -sPTHREAD_POOL_SIZE=6 -sEXIT_RUNTIME=0
  -sINITIAL_MEMORY=192MB -sALLOW_MEMORY_GROWTH -sMAXIMUM_MEMORY=2GB -sSTACK_SIZE=3MB -sDEFAULT_PTHREAD_STACK_SIZE=4MB
  -sMODULARIZE -sEXPORT_NAME=PikafishModule -sENVIRONMENT=web,worker,node
  -sEXPORTED_FUNCTIONS=_main,_uci_command -sEXPORTED_RUNTIME_METHODS=ccall,FS -sFILESYSTEM=1)
say "編譯旗標：${FLAGS[*]}"
say "連結旗標：${LINK[*]}"
start=$(date +%s)
em++ "${FLAGS[@]}" "${SRCS[@]}" -o "$OUT/pikafish.js" "${LINK[@]}" 2>&1 | tee -a "$LOG"
say "BUILD-OK（$(( $(date +%s) - start )) 秒）"
cd "$OUT"; rm -rf "$WORK"
sha256sum pikafish.js pikafish.wasm | tee SHA256SUMS | tee -a "$LOG"
