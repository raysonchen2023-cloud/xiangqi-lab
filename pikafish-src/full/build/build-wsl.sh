#!/usr/bin/env bash
# 在 WSL（Ubuntu）裡把 Pikafish 編成網頁版（WebAssembly，多執行緒＋SIMD）。
# Windows 的「應用程式控制」會擋 Emscripten 在 Windows 上的編譯器，所以改在 Linux 裡編。
# 用法（在 Windows 終端機）：wsl.exe -d Ubuntu-24.04 -- bash xiangqi-wasm/build-wsl.sh
# 輸出：xiangqi-wasm/out/pikafish.js、pikafish.wasm
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
SRC="$HERE/Pikafish/src"; OUT="$HERE/out"; mkdir -p "$OUT"

# 1. Emscripten（第一次會下載安裝，約 1 GB，裝在 Ubuntu 的家目錄）
if [ ! -d "$HOME/emsdk" ]; then git clone --depth 1 https://github.com/emscripten-core/emsdk.git "$HOME/emsdk"; fi
cd "$HOME/emsdk"
if [ ! -f .emscripten ] || ! ./emsdk list 2>/dev/null | grep -q "INSTALLED.*upstream\|\*.*INSTALLED"; then ./emsdk install latest; fi
./emsdk activate latest >/dev/null
source ./emsdk_env.sh >/dev/null 2>&1
em++ --version | head -1

# 2. 編譯：參數照 Pikafish Makefile 的 ARCH=wasm32，另外加上網頁用的打包選項
cd "$SRC"
mapfile -t SRCS < <(find . \( -path ./universal -o -path ./temp_builds \) -prune -o -name '*.cpp' -print | sort)
echo "編譯 ${#SRCS[@]} 個檔案（大約 2～6 分鐘）…"
start=$(date +%s)
em++ -O3 -DNDEBUG -std=c++17 -fno-exceptions -DIS_64BIT \
  -msse -msse2 -mssse3 -msse4.1 -msimd128 -DUSE_SSE2 -DUSE_SSSE3 -DUSE_SSE41 -DUSE_POPCNT -DUSE_SLOPPY_ATOMICS \
  -pthread -flto \
  "${SRCS[@]}" \
  -o "$OUT/pikafish.js" \
  -sPROXY_TO_PTHREAD -sPTHREAD_POOL_SIZE=6 -sEXIT_RUNTIME=0 \
  -sINITIAL_MEMORY=192MB -sALLOW_MEMORY_GROWTH -sMAXIMUM_MEMORY=2GB -sSTACK_SIZE=3MB -sDEFAULT_PTHREAD_STACK_SIZE=4MB \
  -sMODULARIZE -sEXPORT_NAME=PikafishModule -sENVIRONMENT=web,worker,node \
  -sEXPORTED_FUNCTIONS=_main,_uci_command -sEXPORTED_RUNTIME_METHODS=ccall,FS -sFILESYSTEM=1
echo "BUILD-OK（$(( $(date +%s) - start )) 秒）"
ls -la "$OUT"
