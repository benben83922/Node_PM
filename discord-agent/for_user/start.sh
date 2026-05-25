#!/bin/bash

# 確保腳本只要遇到任何錯誤就立刻停止執行，防範災情擴大
set -e

echo "=================================================="
echo "🚀 歡迎使用 NemoClaw & Discord Bot 一鍵啟動腳本"
echo "=================================================="

# 1. 檢查並載入 .env 檔案
if [ ! -f .env ]; then
    echo "❌ 錯誤: 找不到 .env 檔案！請先建立並設定它。"
    exit 1
fi
echo "⚙️ 正在載入 .env 設定環境變數..."
# 讀取 .env 並自動 export 成系統環境變數
set -a
source .env
set +a

# 2. 探測 WSL 程式是否在線 (使用 127.0.0.1 戳本地 Port)
echo "🔍 正在探測 WSL 程式 (Port: ${WSL_APP_PORT})..."
until curl -s http://127.0.0.1:${WSL_APP_PORT}/health > /dev/null 2>&1; do
    echo "⏳ WSL 程式尚未就緒或未開啟 /health 路由，3秒後重試..."
    echo "👉 請確保你已經在 WSL 裡執行了模型主程式！"
    sleep 3
done
echo "✅ WSL 程式通訊確認成功！"

# 3. 檢查環境中是否有安裝 nemoclaw CLI
if ! command -v nemoclaw &> /dev/null; then
    echo "⚠️ 系統未偵測到 nemoclaw 工具，正在嘗試透過官方腳本自動安裝..."
    curl -fsSL https://nvidia.com/nemoclaw.sh | bash
fi

# 4. 執行 NemoClaw 自動化 Onboard
echo "📦 正在為 NemoClaw 執行非互動式 Onboard 初始化..."
# 根據 Provider 是否包含自訂 URL 來動態調整 onboard 指令
if [ "${INFERENCE_PROVIDER}" = "anthropic" ]; then
    # 如果走本地模型，額外帶入 --base-url 參數
    nemoclaw onboard \
      --non-interactive -y --yes-i-accept-third-party-software \
      ${GPU_FLAG} \
      --provider="${INFERENCE_PROVIDER}" \
      --model="${INFERENCE_MODEL}" \
      --base-url="${INFERENCE_BASE_URL}"
else
    # 走雲端 NIM，則使用標準參數
    nemoclaw onboard \
      --non-interactive -y --yes-i-accept-third-party-software \
      ${GPU_FLAG} \
      --provider="${INFERENCE_PROVIDER}" \
      --model="${INFERENCE_MODEL}"
fi
echo "🎉 NemoClaw 初始化成功！官方 Docker 服務已在背景正常運作。"

# 5. 啟動 Discord Bot 容器
echo "🤖 正在透過 Docker Compose 啟動 Discord Bot..."
docker compose up -d

echo "=================================================="
echo "✨ 全部服務啟動完畢！"
echo "👉 NemoClaw 正在監聽 WSL Port: ${NEMOCLAW_PORT}"
echo "👉 Discord Bot 容器已在背景運行 (可輸入 'docker compose logs -f' 查看日誌)"
echo "=================================================="
