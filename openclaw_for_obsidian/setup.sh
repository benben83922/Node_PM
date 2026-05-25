#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Platform detection ──────────────────────────────────────────────────────────
detect_platform() {
  if grep -qEi "(microsoft|wsl)" /proc/version 2>/dev/null; then
    echo "wsl"
  elif [[ "$(uname)" == "Darwin" ]]; then
    echo "macos"
  else
    echo "linux"
  fi
}

PLATFORM=$(detect_platform)

echo "======================================"
echo "  OpenClaw + Discord Agent 安裝程式"
echo "  平台：${PLATFORM}"
echo "======================================"
echo ""

# ── Load .env ───────────────────────────────────────────────────────────────────
ENV_FILE="${SCRIPT_DIR}/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "[錯誤] 找不到 .env 設定檔：${ENV_FILE}"
  echo "  請複製 .env.example 並填入正確的設定值："
  echo "    cp .env.example .env"
  exit 1
fi
set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a

# ── Validate required fields ────────────────────────────────────────────────────
REQUIRED_VARS=(
  DISCORD_BOT_TOKEN
  VAULT_PATH
  API_KEY
  API_URL
  MODEL
  DISCORD_SERVER_ID
  DISCORD_USER_ID
  OPENCLAW_CONFIG_DIR
)

for var in "${REQUIRED_VARS[@]}"; do
  val="${!var:-}"
  if [[ -z "${val// }" ]]; then
    echo "[錯誤] .env 缺少必填欄位或值為空白：${var}"
    exit 1
  fi
done

# Set defaults for optional vars
OPENCLAW_IMAGE="${OPENCLAW_IMAGE:-ghcr.io/openclaw/openclaw:2026.5.20}"
API_URL="${API_URL:-https://openrouter.ai/api/v1}"
DISCORD_REQUIRE_MENTION="${DISCORD_REQUIRE_MENTION:-1}"
LOG_LEVEL="${LOG_LEVEL:-info}"

# ── WSL path warning ────────────────────────────────────────────────────────────
if [[ "$VAULT_PATH" == /mnt/c/* || "$VAULT_PATH" == /mnt/C/* ]]; then
  echo "[警告] VAULT_PATH 使用 Windows 路徑（/mnt/c/...）"
  echo "  建議改用 WSL 原生路徑，例如：/home/$(whoami)/Obsidian_Vault"
  echo "  繼續使用 Windows 路徑可能導致跨系統存取問題。"
  echo ""
fi

if [[ "$OPENCLAW_CONFIG_DIR" == /mnt/* || "$OPENCLAW_CONFIG_DIR" == "~"* ]]; then
  echo "[錯誤] OPENCLAW_CONFIG_DIR 必須是 WSL 原生絕對路徑（例如 /home/user/.openclaw）"
  echo "  不能使用 /mnt/c/... 或 ~ 縮寫。"
  exit 1
fi

# ── Check Docker ────────────────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  echo "[錯誤] 找不到 Docker，請先安裝 Docker Desktop："
  echo "  https://docs.docker.com/get-docker/"
  exit 1
fi

if ! docker info &>/dev/null 2>&1; then
  echo "[錯誤] Docker daemon 未啟動，請先啟動 Docker Desktop。"
  exit 1
fi

echo "✅ Docker 環境正常。"
echo ""

# ── Check required tools ────────────────────────────────────────────────────────
if ! command -v curl &>/dev/null; then
  echo "[錯誤] 找不到 curl，請先安裝：sudo apt-get install -y curl"
  exit 1
fi

if ! command -v openssl &>/dev/null; then
  echo "[錯誤] 找不到 openssl，請先安裝：sudo apt-get install -y openssl"
  exit 1
fi

# ── Detect Docker Compose command ───────────────────────────────────────────────
if docker compose version &>/dev/null 2>&1; then
  DOCKER_COMPOSE="docker compose"
elif command -v docker-compose &>/dev/null; then
  DOCKER_COMPOSE="docker-compose"
else
  echo "[錯誤] 找不到 Docker Compose，請升級 Docker 或執行：sudo apt-get install -y docker-compose"
  exit 1
fi

# ── Export host uid/gid for container user mapping ──────────────────────────────
DOCKER_UID=$(id -u)
DOCKER_GID=$(id -g)
export DOCKER_UID DOCKER_GID

# ── Install Obsidian (WSL / Linux) ──────────────────────────────────────────────
install_obsidian() {
  if dpkg -l obsidian &>/dev/null 2>&1 || [[ -f /opt/Obsidian/obsidian ]]; then
    echo "✅ Obsidian 已安裝，跳過。"
    return 0
  fi

  echo "📦 安裝 Obsidian..."
  local tmp_dir
  tmp_dir=$(mktemp -d)
  local deb_url
  deb_url=$(curl -fsSL "https://api.github.com/repos/obsidianmd/obsidian-releases/releases/latest" \
    | grep -o '"browser_download_url": "[^"]*\.deb"' \
    | grep -vi arm \
    | head -1 \
    | cut -d'"' -f4)

  if [[ -z "$deb_url" ]]; then
    echo "[警告] 無法取得 Obsidian 下載連結，請手動安裝。"
    rm -rf "$tmp_dir"
    return 0
  fi

  echo "  下載：${deb_url}"
  curl -fsSL -o "${tmp_dir}/obsidian.deb" "$deb_url"
  sudo dpkg -i "${tmp_dir}/obsidian.deb" 2>/dev/null || sudo apt-get install -f -y
  rm -rf "$tmp_dir"
  echo "✅ Obsidian 安裝完成。"
}

# ── Create vault with minimal Obsidian config ───────────────────────────────────
create_vault() {
  local vault="$1"
  if [[ -d "${vault}/.obsidian" ]]; then
    echo "✅ Vault 已存在：${vault}"
  else
    echo "📁 建立 Vault：${vault}"
    mkdir -p "${vault}/.obsidian"
    printf '{\n  "legacyEditor": false,\n  "livePreview": true\n}\n' \
      > "${vault}/.obsidian/app.json"
    printf '{\n  "theme": "obsidian"\n}\n' \
      > "${vault}/.obsidian/appearance.json"
    echo "✅ Vault 建立完成。"
  fi
  # 確保容器內 node user (uid=1000) 有讀寫權限（忽略無法修改的個別檔案）
  chmod -R o+w "${vault}" 2>/dev/null || true
  echo "✅ Vault 寫入權限已設定。"
}

# ── Write agent system prompt to OpenClaw workspace ────────────────────────────
create_system_prompt() {
  local workspace="${OPENCLAW_CONFIG_DIR}/workspace"
  local prompt_file="${workspace}/AGENTS.md"
  mkdir -p "$workspace"

  if [[ -f "$prompt_file" ]]; then
    echo "✅ System prompt (AGENTS.md) 已存在，跳過。"
    return 0
  fi

  echo "📝 建立 AGENTS.md..."
  cat > "$prompt_file" <<'PROMPT'
你是一個基於用戶 Obsidian Vault 的個人知識助理。

每次回答問題前，你必須：
1. 先用 find 列出 /vault 目錄下的所有 markdown 檔案
2. 用 cat 讀取與問題相關的檔案內容
3. 根據 /vault 中的實際內容回答問題
4. 如果 /vault 中沒有相關資訊，明確告知用戶，但仍可根據自身知識補充
5. 在沒有明確說明要不要修改時，不要亂改，要徵得用戶同意
6. 每個資料夾視為一個獨立專案

Vault 路徑：/vault
你有完整的 shell 執行權限，可以自由讀取 /vault 下的所有檔案。
PROMPT
  echo "✅ AGENTS.md 建立完成。"
}

# ── Setup OpenClaw config directory and openclaw.json ──────────────────────────
setup_openclaw_config() {
  local config_dir="$1"

  echo "📁 建立 OpenClaw 設定目錄..."
  mkdir -p \
    "${config_dir}/identity" \
    "${config_dir}/devices" \
    "${config_dir}/agents/main/agent" \
    "${config_dir}/agents/main/sessions" \
    "${config_dir}/workspace/skills"

  # OpenClaw runtime .env（gateway 設定，與 for_obsidian/.env 分開）
  local oc_env="${config_dir}/.env"
  if [[ ! -f "$oc_env" ]]; then
    cat > "$oc_env" <<EOF
OPENCLAW_IMAGE=${OPENCLAW_IMAGE}
OPENCLAW_CONFIG_DIR=/home/node/.openclaw
OPENCLAW_WORKSPACE_DIR=/home/node/.openclaw/workspace
OPENCLAW_GATEWAY_BIND=loopback
OPENCLAW_GATEWAY_PORT=18789
OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=true
EOF
    chmod 600 "$oc_env"
    echo "✅ OpenClaw runtime .env 寫入完成。"
  fi

  local oc_json="${config_dir}/openclaw.json"
  if [[ -f "$oc_json" ]]; then
    echo "✅ openclaw.json 已存在，跳過。"
    return 0
  fi

  echo "📝 產生 openclaw.json..."
  local require_mention
  [[ "${DISCORD_REQUIRE_MENTION:-1}" == "1" ]] && require_mention="true" || require_mention="false"
  local gateway_token
  gateway_token=$(openssl rand -hex 32)

  cat > "$oc_json" <<EOF
{
  "gateway": {
    "mode": "local",
    "port": 18789,
    "bind": "loopback",
    "auth": {
      "mode": "token",
      "token": "${gateway_token}"
    },
    "controlUi": {
      "allowedOrigins": [
        "http://127.0.0.1:18789",
        "http://localhost:18789"
      ]
    }
  },
  "agents": {
    "defaults": {
      "model": "custom/${MODEL}"
    }
  },
  "models": {
    "mode": "merge",
    "providers": {
      "custom": {
        "baseUrl": "${API_URL}",
        "apiKey": "${API_KEY}",
        "models": [
          {
            "id": "${MODEL}",
            "name": "Custom Model",
            "api": "openai-completions",
            "input": ["text"],
            "contextWindow": 128000
          }
        ]
      }
    }
  },
  "channels": {
    "discord": {
      "groupPolicy": "allowlist",
      "guilds": {
        "${DISCORD_SERVER_ID}": {
          "requireMention": ${require_mention},
          "users": ["${DISCORD_USER_ID}"]
        }
      },
      "dmPolicy": "allowlist",
      "allowFrom": ["${DISCORD_USER_ID}"],
      "accounts": {
        "default": {}
      }
    }
  }
}
EOF
  echo "✅ openclaw.json 產生完成。"
}

# ── Fix container directory permissions ────────────────────────────────────────
fix_permissions() {
  echo "🔧 修正容器目錄權限..."
  # WSL native path: host uid (1000) == container node uid (1000), so chown is
  # unnecessary. Just ensure all dirs are traversable by the container user.
  find "${OPENCLAW_CONFIG_DIR}" -type d -exec chmod 755 {} \; 2>/dev/null || true
  echo "✅ 權限修正完成。"
}

# ── Install Discord plugin ──────────────────────────────────────────────────────
install_plugins() {
  echo "🔌 安裝 Discord 插件..."
  $DOCKER_COMPOSE -f "${SCRIPT_DIR}/docker-compose.yml" \
    --env-file "${ENV_FILE}" \
    run --rm --no-deps \
    openclaw-gateway \
    openclaw plugins install --force @openclaw/discord
  echo "✅ Discord 插件安裝完成。"
}

# ── Autostart setup ────────────────────────────────────────────────────────────
setup_autostart_linux() {
  local service_file="/etc/systemd/system/openclaw-discord.service"
  local docker_bin
  docker_bin=$(which docker)

  sudo tee "$service_file" > /dev/null <<EOF
[Unit]
Description=OpenClaw Discord Agent
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=${SCRIPT_DIR}
ExecStart=${docker_bin} compose -f ${SCRIPT_DIR}/docker-compose.yml --env-file ${SCRIPT_DIR}/.env up -d
ExecStop=${docker_bin} compose -f ${SCRIPT_DIR}/docker-compose.yml down

[Install]
WantedBy=multi-user.target
EOF

  sudo systemctl daemon-reload
  sudo systemctl enable openclaw-discord
  echo "✅ 已設定 systemd 開機自啟（openclaw-discord.service）"
}

setup_autostart_macos() {
  local plist_path="${HOME}/Library/LaunchAgents/com.openclaw-discord.plist"
  local docker_bin
  docker_bin=$(which docker)

  mkdir -p "${HOME}/Library/LaunchAgents"
  cat > "$plist_path" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.openclaw-discord</string>
    <key>ProgramArguments</key>
    <array>
        <string>${docker_bin}</string>
        <string>compose</string>
        <string>-f</string>
        <string>${SCRIPT_DIR}/docker-compose.yml</string>
        <string>--env-file</string>
        <string>${SCRIPT_DIR}/.env</string>
        <string>up</string>
        <string>-d</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <false/>
</dict>
</plist>
EOF

  launchctl load "$plist_path"
  echo "✅ 已設定 launchd 開機自啟"
}

# ── Main ────────────────────────────────────────────────────────────────────────
echo "📋 設定摘要："
echo "  Config Dir     : ${OPENCLAW_CONFIG_DIR}"
echo "  Vault          : ${VAULT_PATH}"
echo "  Model          : ${MODEL}"
echo "  API URL        : ${API_URL}"
echo "  Discord 伺服器  : ${DISCORD_SERVER_ID}"
echo "  Discord 用戶    : ${DISCORD_USER_ID}"
echo "  @mention 才回應 : ${DISCORD_REQUIRE_MENTION}"
echo ""

install_obsidian
create_vault "$VAULT_PATH"
create_system_prompt
setup_openclaw_config "$OPENCLAW_CONFIG_DIR"

echo "🐳 拉取 OpenClaw 映像..."
$DOCKER_COMPOSE -f "${SCRIPT_DIR}/docker-compose.yml" --env-file "${ENV_FILE}" pull
echo "✅ 映像準備完成。"
echo ""

fix_permissions
install_plugins

echo ""
echo "🐳 啟動 OpenClaw Discord Agent..."
$DOCKER_COMPOSE -f "${SCRIPT_DIR}/docker-compose.yml" --env-file "${ENV_FILE}" up -d
echo "✅ 容器已啟動。"
echo ""

case "$PLATFORM" in
  linux)
    if command -v systemctl &>/dev/null; then
      setup_autostart_linux
    else
      echo "[提示] 未偵測到 systemd，開機自啟請手動設定。"
      echo "  容器已設定 restart=unless-stopped，Docker daemon 重啟後會自動恢復。"
    fi
    ;;
  wsl)
    echo "✅ WSL 環境：容器已設定 restart=unless-stopped"
    echo "  請確認 Docker Desktop 已開啟「Start Docker Desktop when you log in」"
    ;;
  macos)
    setup_autostart_macos
    ;;
esac

echo ""
echo "======================================"
echo "  ✅ 安裝完成！"
echo ""
echo "  Discord Bot 已上線。"
echo "  在 Discord 中 @mention Bot 即可開始對話。"
echo ""
echo "  Vault 路徑：${VAULT_PATH}"
echo "  開啟 Obsidian > File > Open Vault > 選擇上方路徑"
echo ""
echo "  查看容器狀態："
echo "  docker ps | grep openclaw-discord"
echo "======================================"
