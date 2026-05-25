#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "======================================"
echo "  OpenClaw Discord Agent 移除程式"
echo "======================================"
echo ""

# ── Load .env（取得 config dir 與 image 名稱）──────────────────────────────────
ENV_FILE="${SCRIPT_DIR}/.env"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$ENV_FILE"
  set +a
fi

OPENCLAW_IMAGE="${OPENCLAW_IMAGE:-ghcr.io/openclaw/openclaw:2026.5.20}"
OPENCLAW_CONFIG_DIR="${OPENCLAW_CONFIG_DIR:-${HOME}/.openclaw}"

echo "  Config Dir : ${OPENCLAW_CONFIG_DIR}"
echo "  Image      : ${OPENCLAW_IMAGE}"
echo ""

# ── 確認 ────────────────────────────────────────────────────────────────────────
read -r -p "確定要移除 OpenClaw Discord Agent？這將刪除所有設定資料。[y/N] " confirm
if [[ "${confirm,,}" != "y" ]]; then
  echo "已取消。"
  exit 0
fi

echo ""

# ── 1. 停止並移除容器 ────────────────────────────────────────────────────────────
echo "🛑 停止容器..."
docker compose -f "${SCRIPT_DIR}/docker-compose.yml" \
  --env-file "${ENV_FILE}" \
  down 2>/dev/null || \
  docker stop openclaw-discord 2>/dev/null || true
docker rm openclaw-discord 2>/dev/null || true
echo "✅ 容器已停止並移除。"

# ── 2. 移除 Docker Image（詢問）──────────────────────────────────────────────────
read -r -p "是否一併移除 Docker Image？（會需要重新下載才能再次安裝）[y/N] " remove_image
if [[ "${remove_image,,}" == "y" ]]; then
  docker rmi "$OPENCLAW_IMAGE" 2>/dev/null || true
  echo "✅ Docker Image 已移除。"
fi

# ── 3. 移除設定目錄 ──────────────────────────────────────────────────────────────
echo ""
read -r -p "是否刪除 OpenClaw 設定目錄 ${OPENCLAW_CONFIG_DIR}？[y/N] " remove_config
if [[ "${remove_config,,}" == "y" ]]; then
  rm -rf "$OPENCLAW_CONFIG_DIR"
  echo "✅ 設定目錄已刪除：${OPENCLAW_CONFIG_DIR}"
else
  echo "  設定目錄保留：${OPENCLAW_CONFIG_DIR}"
fi

# ── 4. 移除開機自啟 ──────────────────────────────────────────────────────────────
echo ""

# Linux systemd
SERVICE_FILE="/etc/systemd/system/openclaw-discord.service"
if [[ -f "$SERVICE_FILE" ]]; then
  echo "🔧 移除 systemd service..."
  sudo systemctl stop openclaw-discord 2>/dev/null || true
  sudo systemctl disable openclaw-discord 2>/dev/null || true
  sudo rm -f "$SERVICE_FILE"
  sudo systemctl daemon-reload
  echo "✅ systemd service 已移除。"
fi

# macOS launchd
PLIST="${HOME}/Library/LaunchAgents/com.openclaw-discord.plist"
if [[ -f "$PLIST" ]]; then
  echo "🔧 移除 launchd plist..."
  launchctl unload "$PLIST" 2>/dev/null || true
  rm -f "$PLIST"
  echo "✅ launchd plist 已移除。"
fi

echo ""
echo "======================================"
echo "  ✅ 移除完成。"
echo ""
echo "  Vault 和 .env 設定檔保持原樣，未受影響。"
echo "======================================"
