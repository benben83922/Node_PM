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
echo "  NemoClaw + Discord Agent 安裝程式"
echo "  平台：${PLATFORM}"
echo "======================================"
echo ""

# ── Load .env ───────────────────────────────────────────────────────────────────
ENV_FILE="${SCRIPT_DIR}/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "[錯誤] 找不到 .env 設定檔：${ENV_FILE}"
  echo "  請複製 .env.example 並填入正確的設定值。"
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
  INFERENCE_API_KEY
  INFERENCE_BASE_URL
  INFERENCE_MODEL
  DISCORD_SERVER_ID
  DISCORD_USER_ID
  SANDBOX_NAME
  DISCORD_BOT_IMAGE
)

for var in "${REQUIRED_VARS[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    echo "[錯誤] .env 缺少必填欄位：${var}"
    exit 1
  fi
done

# Set defaults for optional vars
SANDBOX_NAME="${SANDBOX_NAME:-my-assistant}"
NEMOCLAW_CONTAINER="${NEMOCLAW_CONTAINER:-openshell-cluster-nemoclaw}"
GPU_FLAG="${GPU_FLAG:---no-gpu}"
INFERENCE_PROVIDER="${INFERENCE_PROVIDER:-compatible-endpoint}"
DISCORD_REQUIRE_MENTION="${DISCORD_REQUIRE_MENTION:-1}"
LOG_LEVEL="${LOG_LEVEL:-info}"

# ── WSL path warning ────────────────────────────────────────────────────────────
if [[ "$VAULT_PATH" == /mnt/c/* || "$VAULT_PATH" == /mnt/C/* ]]; then
  echo "[警告] VAULT_PATH 使用 Windows 路徑（/mnt/c/...）"
  echo "  建議改用 WSL 原生路徑，例如：/home/$(whoami)/Obsidian_Vault"
  echo "  繼續使用 Windows 路徑可能導致跨系統存取問題。"
  echo ""
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

# ── Install nemoclaw/openshell if missing ───────────────────────────────────────
export PATH="${HOME}/.local/bin:${PATH}"

install_nemoclaw() {
  echo "📦 安裝 NemoClaw CLI..."
  curl -fsSL https://www.nvidia.com/nemoclaw.sh \
    | NEMOCLAW_NON_INTERACTIVE=1 NEMOCLAW_ACCEPT_THIRD_PARTY_SOFTWARE=1 bash
  export PATH="${HOME}/.local/bin:${PATH}"
  echo "✅ NemoClaw 安裝完成。"
}

install_openshell() {
  echo "📦 安裝 openshell CLI..."
  local install_script="${HOME}/.nemoclaw/source/scripts/install-openshell.sh"
  if [[ -f "$install_script" ]]; then
    bash "$install_script"
    export PATH="${HOME}/.local/bin:${PATH}"
    echo "✅ openshell 安裝完成。"
  else
    echo "[警告] 找不到 openshell 安裝腳本，請確認 NemoClaw 已完整安裝。"
  fi
}

if ! command -v nemoclaw &>/dev/null; then
  install_nemoclaw
fi

if ! command -v openshell &>/dev/null; then
  install_openshell
fi

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
    return 1
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
  # NemoClaw sandbox 以 sandbox(uid=998) 執行，需要 o+w 才能寫入 Vault
  chmod -R o+w "${vault}"
  echo "✅ Vault 寫入權限已設定（sandbox 可讀寫）。"
}

# ── Write agent system prompt ───────────────────────────────────────────────────
create_system_prompt() {
  local vault="$1"
  local prompt_file="${vault}/agent_system_prompt.md"
  if [[ -f "$prompt_file" ]]; then
    echo "✅ System prompt 已存在，跳過。"
    return 0
  fi
  echo "📝 建立 agent_system_prompt.md..."
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
  echo "✅ System prompt 已建立。"
}

# ── Fix vault mount on NemoClaw container ───────────────────────────────────────
fix_vault_mount() {
  local vault="$1"
  local container="$NEMOCLAW_CONTAINER"

  if docker inspect "$container" \
      --format '{{range .Mounts}}{{.Source}}{{"\n"}}{{end}}' 2>/dev/null \
      | grep -qF "$vault"; then
    echo "✅ Vault 已掛載至 NemoClaw 容器，跳過。"
    return 0
  fi

  echo "🔧 重新建立 NemoClaw 容器以掛載 Vault..."

  local image
  image=$(docker inspect "$container" --format '{{.Config.Image}}')

  local restart_policy
  restart_policy=$(docker inspect "$container" \
    --format '{{.HostConfig.RestartPolicy.Name}}')

  # Collect existing mounts as -v flags
  local -a mount_flags=()
  while IFS= read -r line; do
    [[ -z "$line" || "$line" == *":/vault"* ]] && continue
    mount_flags+=("-v" "$line")
  done < <(docker inspect "$container" \
    --format '{{range .Mounts}}{{.Source}}:{{.Destination}}{{if .Mode}}:{{.Mode}}{{end}}{{"\n"}}{{end}}')

  # Collect port bindings as -p flags
  local -a port_flags=()
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    # strip leading colon from HostIp when empty
    port_flags+=("-p" "${line#:}")
  done < <(docker inspect "$container" \
    --format '{{range $port, $bindings := .HostConfig.PortBindings}}{{range $bindings}}{{.HostIp}}:{{.HostPort}}:{{$port}}{{"\n"}}{{end}}{{end}}')

  docker stop "$container" 2>/dev/null || true
  docker rm "$container" 2>/dev/null || true

  docker run -d \
    --name "$container" \
    --privileged \
    --restart "${restart_policy:-unless-stopped}" \
    "${mount_flags[@]}" \
    -v "${vault}:/vault" \
    "${port_flags[@]}" \
    "$image"

  echo "⏳ 等待 k3s 節點就緒..."
  local retries=36  # up to 3 minutes
  until docker exec "$container" kubectl get nodes 2>/dev/null | grep -q " Ready"; do
    retries=$((retries - 1))
    if [[ $retries -le 0 ]]; then
      echo "[錯誤] k3s 啟動逾時，請確認容器狀態後重試。"
      exit 1
    fi
    sleep 5
  done
  echo "✅ k3s 節點就緒。"
}

# ── Apply Landlock policy with /vault ───────────────────────────────────────────
apply_vault_policy() {
  local sandbox="$1"
  local tmp_policy
  tmp_policy=$(mktemp /tmp/policy-XXXXXX.yaml)

  cat > "$tmp_policy" <<'POLICY'
version: 1

filesystem_policy:
  include_workdir: true
  read_only:
    - /usr
    - /lib
    - /proc
    - /dev/urandom
    - /app
    - /etc
    - /var/log
  read_write:
    - /tmp
    - /dev/null
    - /vault
    - /sandbox/.openclaw
    - /sandbox/.nemoclaw

landlock:
  compatibility: best_effort

process:
  run_as_user: sandbox
  run_as_group: sandbox

network_policies: {}
POLICY

  echo "🔒 套用 Landlock policy（含 /vault）..."
  local output
  if output=$(openshell policy set "$sandbox" --policy "$tmp_policy" 2>&1); then
    echo "✅ Policy 套用成功。"
    rm -f "$tmp_policy"
    return 0
  fi

  # Live sandbox may have old read_write paths that cannot be removed.
  # Re-apply with those paths kept in the YAML.
  if echo "$output" | grep -q "cannot be removed"; then
    echo "  偵測到現有 sandbox 有舊路徑，加回後重新套用..."
    while IFS= read -r old_path; do
      [[ -z "$old_path" ]] && continue
      # Insert before /sandbox/.openclaw line
      sed -i "s|    - /sandbox/.openclaw|    - \"${old_path}\"\n    - /sandbox/.openclaw|" \
        "$tmp_policy"
    done < <(echo "$output" \
      | grep -oP "path '\K[^']+(?=' cannot be removed)")

    if output=$(openshell policy set "$sandbox" --policy "$tmp_policy" 2>&1); then
      echo "✅ Policy 套用成功（含舊路徑）。"
    else
      echo "[警告] Policy 套用失敗，請手動確認 openshell 狀態："
      echo "  ${output}"
    fi
  else
    echo "[警告] Policy 套用失敗："
    echo "  ${output}"
  fi

  rm -f "$tmp_policy"
}

# ── Restart pod and recover port-forward ────────────────────────────────────────
restart_pod() {
  local sandbox="$1"
  local container="$NEMOCLAW_CONTAINER"

  echo "🔄 重啟 pod 以套用新 Landlock 規則..."
  docker exec "$container" \
    kubectl delete pod "$sandbox" -n openshell 2>/dev/null || true

  echo "⏳ 等待 pod 就緒..."
  local retries=60  # up to 5 minutes
  until docker exec "$container" \
      kubectl get pod "$sandbox" -n openshell 2>/dev/null \
      | grep -q "1/1.*Running"; do
    retries=$((retries - 1))
    if [[ $retries -le 0 ]]; then
      echo "[錯誤] Pod 啟動逾時，請執行：nemoclaw ${sandbox} status"
      exit 1
    fi
    sleep 5
  done
  echo "✅ Pod 已就緒。"

  echo "🔗 恢復 port-forward..."
  nemoclaw "$sandbox" recover 2>/dev/null || true
}

# ── NemoClaw onboard + vault setup ──────────────────────────────────────────────
setup_nemoclaw() {
  local vault="$1"
  local sandbox="$SANDBOX_NAME"

  # Check if sandbox already exists in sandboxes.json
  local sandboxes_file="${HOME}/.nemoclaw/sandboxes.json"
  if [[ -f "$sandboxes_file" ]] \
      && python3 -c "import json,sys; d=json.load(open('${sandboxes_file}')); sys.exit(0 if '${sandbox}' in d.get('sandboxes',{}) else 1)" 2>/dev/null; then
    echo "✅ Sandbox '${sandbox}' 已存在，跳過 onboard。"
  else
    echo "🚀 執行 nemoclaw onboard..."
    # Provider / model / API key / Discord config are passed via env vars,
    # not CLI flags — nemoclaw onboard has no --provider / --model flags.
    COMPATIBLE_API_KEY="${INFERENCE_API_KEY}" \
    NEMOCLAW_PROVIDER="${INFERENCE_PROVIDER}" \
    NEMOCLAW_BASE_URL="${INFERENCE_BASE_URL}" \
    NEMOCLAW_MODEL="${INFERENCE_MODEL}" \
    DISCORD_BOT_TOKEN="${DISCORD_BOT_TOKEN}" \
    DISCORD_SERVER_ID="${DISCORD_SERVER_ID}" \
    DISCORD_USER_ID="${DISCORD_USER_ID}" \
    DISCORD_REQUIRE_MENTION="${DISCORD_REQUIRE_MENTION}" \
    nemoclaw onboard \
      --non-interactive \
      --yes \
      --yes-i-accept-third-party-software \
      ${GPU_FLAG} \
      --name "$sandbox"
    echo "✅ NemoClaw onboard 完成。"
  fi

  fix_vault_mount "$vault"
  apply_vault_policy "$sandbox"
  restart_pod "$sandbox"
}

# ── Main ─────────────────────────────────────────────────────────────────────────
echo "📋 設定摘要："
echo "  Sandbox     : ${SANDBOX_NAME}"
echo "  Vault       : ${VAULT_PATH}"
echo "  Model       : ${INFERENCE_MODEL}"
echo "  Provider    : ${INFERENCE_PROVIDER}"
echo "  Discord 伺服器 : ${DISCORD_SERVER_ID}"
echo "  Discord 用戶   : ${DISCORD_USER_ID}"
echo ""

install_obsidian
create_vault "$VAULT_PATH"
create_system_prompt "$VAULT_PATH"
setup_nemoclaw "$VAULT_PATH"

# ── Pull image and start Discord Bot container ──────────────────────────────────
echo "🐳 啟動 Discord Bot 容器..."
docker compose -f "${SCRIPT_DIR}/docker-compose.yml" pull
docker compose -f "${SCRIPT_DIR}/docker-compose.yml" --env-file "${SCRIPT_DIR}/.env" up -d

# ── Auto-start setup ────────────────────────────────────────────────────────────
setup_autostart_linux() {
  local service_file="/etc/systemd/system/discord-agent.service"
  local docker_bin
  docker_bin=$(which docker)

  sudo tee "$service_file" > /dev/null <<EOF
[Unit]
Description=Discord Agent
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
  sudo systemctl enable discord-agent
  echo "✅ 已設定 systemd 開機自啟"
}

setup_autostart_macos() {
  local plist_path="${HOME}/Library/LaunchAgents/com.discord-agent.plist"
  local docker_bin
  docker_bin=$(which docker)

  mkdir -p "${HOME}/Library/LaunchAgents"

  cat > "$plist_path" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.discord-agent</string>
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
    echo "  請確認 Docker Desktop 已設定「Start Docker Desktop when you log in」"
    ;;
  macos)
    setup_autostart_macos
    ;;
esac

# ── Done ─────────────────────────────────────────────────────────────────────────
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
echo "  查看 NemoClaw 狀態："
echo "  nemoclaw ${SANDBOX_NAME} status"
echo "======================================"
