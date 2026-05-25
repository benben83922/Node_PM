# OpenClaw Discord Agent for Obsidian

在 Discord 上與 AI 對話，AI 可以直接讀寫你的 Obsidian Vault。

---

## 系統架構

```
Discord ←→ OpenClaw (Docker) ←→ Obsidian Vault (WSL)
```

- OpenClaw 在 WSL 的 Docker 容器中運行
- 容器掛載你的 Vault 路徑，AI 可讀寫所有 Markdown 檔案
- 你在 Discord 頻道 @mention Bot，Bot 根據 Vault 內容回覆

---

## 前置需求

| 項目 | 說明 |
| :--- | :--- |
| Windows 11 | 需要 WSLg 支援 GUI（執行 Obsidian）|
| WSL2（Ubuntu） | 腳本在此環境執行 |
| Docker Desktop | 需開啟 WSL2 Integration |
| Discord Bot Token | 從 Discord Developer Portal 建立 |
| API Key | OpenRouter、OpenAI 或其他 OpenAI 相容服務 |

---

## 安裝步驟

### 1. 取得 Discord Bot Token

1. 前往 [Discord Developer Portal](https://discord.com/developers/applications)
2. 建立新 Application → 進入 **Bot** 頁面
3. 點選 **Reset Token** 複製 Token
4. 在 **Privileged Gateway Intents** 開啟：
   - Message Content Intent
5. 進入 **OAuth2 → URL Generator**，勾選 `bot`，權限勾選 `Send Messages`、`Read Message History`
6. 用產生的連結將 Bot 邀請至你的 Discord 伺服器

---

### 2. 填寫設定檔

在 WSL 終端機中，進入本資料夾，複製範本並填入設定：

```bash
cp .env.example .env
nano .env
```

各欄位說明：

```bash
# OpenClaw 設定目錄（存放 AI Agent 設定，必須是 WSL 原生路徑）
OPENCLAW_CONFIG_DIR=/home/你的帳號/.openclaw

# Obsidian Vault 路徑（WSL 原生路徑）
VAULT_PATH=/home/你的帳號/Obsidian_Vault

# API 金鑰（OpenRouter 範例：sk-or-v1-xxxxx）
API_KEY=sk-or-v1-xxxxx

# API 端點（OpenRouter 預設值如下，其他服務請自行修改）
API_URL=https://openrouter.ai/api/v1

# 使用的 AI 模型名稱
MODEL=anthropic/claude-3.5-sonnet

# Discord Bot Token
DISCORD_BOT_TOKEN=MTU...

# Discord 伺服器 ID（右鍵伺服器圖示 > 複製伺服器 ID）
DISCORD_SERVER_ID=123456789012345678

# 你的 Discord 用戶 ID（右鍵個人頭像 > 複製用戶 ID）
DISCORD_USER_ID=123456789012345678

# Bot 是否需要 @mention 才回應（1 = 需要，0 = 不需要）
DISCORD_REQUIRE_MENTION=1
```

---

### 3. （選填）設定 Vault 專案來源

如果你有 Git 托管的筆記或專案，可以在 `submodules.txt` 填入，安裝時會自動 clone 並設定稀疏簽出（只取 `.md` 檔案）：

```
# 格式：<Git URL> [資料夾名稱（選填）]
https://github.com/your-account/your-notes.git
https://github.com/your-account/project-alpha.git  alpha
```

不需要的話，清空檔案或保留預設即可。

---

### 4. 執行安裝

```bash
bash setup.sh
```

這個步驟會：
1. 安裝 Obsidian（若尚未安裝）
2. 建立 Vault 目錄與 Obsidian 基本設定
3. 建立 AI Agent 的 System Prompt（`AGENTS.md`）
4. 產生 OpenClaw 設定（`openclaw.json`）
5. 拉取 Docker 映像
6. 安裝 Discord 插件
7. 啟動容器

---

### 5. （選填）初始化 Vault git repo

如果你想用 git 管理 Vault，或需要掛載 `submodules.txt` 中的專案：

```bash
bash setup_vault.sh
```

這個步驟會：
- 初始化 git repo
- 加入 `submodules.txt` 中的專案（如有填寫）

容器已在運行，修改會即時反映。

安裝完成後，Bot 會自動上線。

---

### 6. 開啟 Obsidian

```bash
obsidian &
```

在 Obsidian 中：`File > Open Vault`，選擇你設定的 `VAULT_PATH`。

---

## 使用方式

在 Discord 中，於已邀請 Bot 的伺服器內：

- **`@Bot 你的問題`**：Bot 會讀取 Vault 內容後回覆
- Bot 可以查詢、整理、比較 Vault 中任何 Markdown 檔案的內容

---

## 常用管理指令

```bash
# 查看容器狀態
docker ps | grep openclaw-discord

# 查看容器 log
docker logs openclaw-discord -f

# 停止
docker compose -f docker-compose.yml --env-file .env down

# 重新啟動
docker compose -f docker-compose.yml --env-file .env up -d
```

---

## 移除

```bash
bash uninstall.sh
```

會依序詢問是否刪除容器、Docker Image、設定目錄，Vault 本身不受影響。
