#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "======================================"
echo "  Obsidian Vault 初始化腳本"
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
if [[ -z "${VAULT_PATH:-}" ]]; then
  echo "[錯誤] .env 缺少必填欄位：VAULT_PATH"
  exit 1
fi

# ── Read submodules.txt ─────────────────────────────────────────────────────────
SUBMODULES_FILE="${SCRIPT_DIR}/submodules.txt"
declare -a SUBMODULE_URLS=()
declare -a SUBMODULE_NAMES=()

if [[ -f "$SUBMODULES_FILE" ]]; then
  while IFS= read -r line || [[ -n "$line" ]]; do
    # 跳過空行與註解
    [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
    url=$(echo "$line" | awk '{print $1}')
    name=$(echo "$line" | awk '{print $2}')
    [[ -z "$name" ]] && name=$(basename "$url" .git)
    SUBMODULE_URLS+=("$url")
    SUBMODULE_NAMES+=("$name")
  done < "$SUBMODULES_FILE"
fi

# ── Print summary ───────────────────────────────────────────────────────────────
echo "📋 設定摘要："
echo "  Vault 路徑 : ${VAULT_PATH}"
if [[ ${#SUBMODULE_URLS[@]} -eq 0 ]]; then
  echo "  Submodule  : 未設定（建立空 vault）"
else
  echo "  Submodule  ："
  for i in "${!SUBMODULE_URLS[@]}"; do
    echo "    - ${SUBMODULE_NAMES[$i]}  ${SUBMODULE_URLS[$i]}"
  done
fi
echo ""

# ── Check git ───────────────────────────────────────────────────────────────────
if ! command -v git &>/dev/null; then
  echo "[錯誤] 找不到 git，請先安裝 git。"
  exit 1
fi

# ── Create vault directory ──────────────────────────────────────────────────────
mkdir -p "${VAULT_PATH}"

# ── Initialize git repo ─────────────────────────────────────────────────────────
if [[ -d "${VAULT_PATH}/.git" ]]; then
  echo "✅ Git repo 已存在，跳過 git init。"
else
  echo "📁 初始化 git repo..."
  git -C "${VAULT_PATH}" init
  echo "✅ Git repo 初始化完成。"
fi

# ── Create .gitignore ───────────────────────────────────────────────────────────
if [[ ! -f "${VAULT_PATH}/.gitignore" ]]; then
  touch "${VAULT_PATH}/.gitignore"
  echo "✅ 建立 .gitignore。"
fi

# ── Create Obsidian config ──────────────────────────────────────────────────────
if [[ -d "${VAULT_PATH}/.obsidian" ]]; then
  echo "✅ Obsidian 設定已存在，跳過。"
else
  echo "📁 建立 Obsidian 基本設定..."
  mkdir -p "${VAULT_PATH}/.obsidian"
  printf '{\n  "legacyEditor": false,\n  "livePreview": true\n}\n' \
    > "${VAULT_PATH}/.obsidian/app.json"
  printf '{\n  "theme": "obsidian"\n}\n' \
    > "${VAULT_PATH}/.obsidian/appearance.json"
  echo "✅ Obsidian 設定建立完成。"
fi

# ── Add submodules with sparse checkout ────────────────────────────────────────
for i in "${!SUBMODULE_URLS[@]}"; do
  url="${SUBMODULE_URLS[$i]}"
  name="${SUBMODULE_NAMES[$i]}"

  if [[ -d "${VAULT_PATH}/${name}/.git" ]] || [[ -f "${VAULT_PATH}/${name}/.git" ]]; then
    echo "✅ Submodule '${name}' 已存在，跳過。"
    continue
  fi

  echo "📦 加入 submodule：${name}  (${url})"
  git -C "${VAULT_PATH}" submodule add "${url}" "${name}"

  echo "🔧 設定稀疏簽出：${name}"
  git -C "${VAULT_PATH}/${name}" sparse-checkout init
  git -C "${VAULT_PATH}/${name}" sparse-checkout set '/**/*.md' '.gitignore'
  echo "✅ ${name} 完成。"
done

# ── Initial commit ──────────────────────────────────────────────────────────────
echo ""
echo "📝 檢查是否有新內容需要 commit..."
git -C "${VAULT_PATH}" add --all 2>/dev/null || true
if git -C "${VAULT_PATH}" diff --cached --quiet 2>/dev/null; then
  echo "✅ 無新內容需要 commit。"
else
  git -C "${VAULT_PATH}" commit -m "init vault"
  echo "✅ 初始 commit 完成。"
fi

echo ""
echo "======================================"
echo "  ✅ Vault 初始化完成！"
echo ""
echo "  Vault 路徑：${VAULT_PATH}"
for i in "${!SUBMODULE_NAMES[@]}"; do
  echo "  專案：${VAULT_PATH}/${SUBMODULE_NAMES[$i]}"
done
echo ""
echo "  開啟 Obsidian > File > Open Vault > 選擇上方路徑"
echo "======================================"
