---
project: Node_PM
doc_type: FeatureSpec
status: draft
phase: planning
priority: high
owner: PM
updated: 2026-06-04
tags: [openclaw, discord, nlq, docker]
---

# OpenClaw Discord Agent｜設計規格書

**版本**：v2.0
**文件類型**：核心功能規格
**前置依賴**：文件規範_YAML設計規格書.md、GitHub同步系統設計規格書.md

---

## 一、功能定位

### 1.1 核心目標

讓 PM 能在 Discord 頻道用口語中文提問，OpenClaw 讀取整個 Obsidian Vault 後回答，無需打開任何文件。

| 問題類型 | 範例 | OpenClaw 查找目標 |
| :--- | :--- | :--- |
| 專案進度 | 「A 專案現在到哪裡了？」 | 該專案所有文件的 `phase` 欄位 |
| 文件狀態 | 「哪些文件還在草稿？」 | `status = draft` |
| 風險查詢 | 「目前最高風險是什麼？」 | WBS/PRD 的風險章節 |
| 技術細節 | 「B 專案的 ERD 有哪些主要實體？」 | ERD.md 內容 |
| 待決事項 | 「哪些問題還沒決定？」 | PRD Open Questions 章節 |
| WBS 任務 | 「金流模組還剩幾個任務，誰負責？」 | WBS.md 的 `- [ ]` 任務行 |

### 1.2 架構概覽

```
Discord ←→ OpenClaw Docker（openclaw-gateway）←→ Vault（/vault）
                        ↓
           OpenAI-compatible API（OpenRouter / Anthropic 等）
```

**單容器設計**：OpenClaw 是全功能的沙盒容器，Discord Bot 透過 `@openclaw/discord` plugin 整合於容器內，不需另起 Python Bot 或 Proxy 服務。

---

## 二、前置需求

| 項目 | 說明 |
| :--- | :--- |
| 作業系統 | Windows + WSL2（Ubuntu 22.04+）或 macOS / Linux |
| Docker | Docker Desktop（WSL2 backend） |
| Discord Bot Token | 從 Discord Developer Portal 建立 |
| API Key | OpenRouter、OpenAI 或其他 OpenAI-compatible 服務 |
| Obsidian Vault | 已建立並同步至本地（`~/Obsidian_Vault/`，WSL 原生路徑） |

---

## 三、系統架構

### 3.1 元件清單

| 元件 | 說明 |
| :--- | :--- |
| **OpenClaw Gateway** | Docker 容器（`ghcr.io/openclaw/openclaw`），負責接收 Discord 訊息、讀取 Vault、呼叫 AI API |
| **`@openclaw/discord` plugin** | 內建 Discord Bot 整合，無需另起服務 |
| **`openclaw.json`** | 主設定檔：model、Discord channel allowlist、gateway 設定 |
| **`AGENTS.md`** | System Prompt，定義 AI 的查詢行為與 Vault 使用方式 |
| **Vault（`/vault`）** | 掛載至容器的 Obsidian Vault，AI 讀取此路徑下所有 `.md` 文件 |

### 3.2 資料流

```
1. PM 在 Discord @mention Bot，輸入問題
2. OpenClaw Gateway 接收訊息
3. Gateway 讀取 /vault 下相關 .md 文件
4. 帶著文件內容呼叫 AI API（OpenRouter / Anthropic）
5. AI 根據 AGENTS.md system prompt + 文件內容生成回答
6. Gateway 將回答透過 Discord 回覆給 PM
```

---

## 四、安裝與設定

### 4.1 設定步驟

**Step 1：取得 Discord Bot Token**

1. 前往 Discord Developer Portal，建立新 Application
2. 進入 Bot 頁面 → Reset Token，複製 Token
3. 開啟 **Message Content Intent**
4. OAuth2 → URL Generator，勾選 `bot`，權限勾選 `Send Messages`、`Read Message History`
5. 用產生的連結將 Bot 邀請至 Discord 伺服器

**Step 2：填寫 `.env`**

```bash
cd openclaw_for_obsidian
cp .env.example .env
# 編輯 .env，填入以下必填欄位：
```

| 欄位 | 說明 |
| :--- | :--- |
| `OPENCLAW_CONFIG_DIR` | OpenClaw 設定目錄（WSL 絕對路徑，例：`/home/user/.openclaw`） |
| `VAULT_PATH` | Obsidian Vault 路徑（WSL 原生路徑，建議 `/home/user/Obsidian_Vault`） |
| `API_KEY` | AI API Key（OpenRouter: `sk-or-v1-...`，OpenAI: `sk-...`） |
| `API_URL` | API 端點（OpenRouter 預設：`https://openrouter.ai/api/v1`） |
| `MODEL` | 模型名稱（例：`anthropic/claude-3.5-sonnet`） |
| `DISCORD_BOT_TOKEN` | Discord Bot Token |
| `DISCORD_SERVER_ID` | Discord 伺服器 ID（右鍵伺服器圖示 > 複製） |
| `DISCORD_USER_ID` | 允許提問的 Discord 用戶 ID |

**Step 3：執行安裝腳本**

```bash
bash setup.sh
```

腳本會依序執行：
1. 安裝 Obsidian（若尚未安裝）
2. 建立 Vault 目錄與基本 Obsidian 設定
3. 產生 `AGENTS.md`（System Prompt）
4. 產生 `openclaw.json`（含 Discord allowlist、model 設定）
5. 拉取 Docker image
6. 安裝 `@openclaw/discord` plugin
7. 啟動 `openclaw-discord` 容器

**Step 4：確認容器啟動**

```bash
docker ps | grep openclaw-discord
docker logs openclaw-discord -f
```

### 4.2 啟動順序

安裝完成後，日常啟動只需確認 Docker Desktop 已啟動，容器設定 `restart: unless-stopped` 會自動恢復。

---

## 五、System Prompt（AGENTS.md）

`AGENTS.md` 存放於 `OPENCLAW_CONFIG_DIR/workspace/AGENTS.md`，定義 AI 的行為準則。

### 5.1 基礎 System Prompt

```markdown
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
```

### 5.2 PM 工作情境補充（WBS 查詢）

在 `AGENTS.md` 末尾加入以下說明以支援 WBS 任務查詢：

```markdown
WBS 任務格式：
- 未完成任務以 "- [ ]" 開頭
- 已完成任務以 "- [x]" 開頭
- 任務 ID 格式：M{模組}.{子模組}.{序號}（例：M3.1.2）
- 負責人以 [owner:: 角色:姓名] 格式標記（例：[owner:: BE:張後端]）
- 截止日期以 #YYYY-MM-DD 標記

回答任務進度問題時，請同時提供：完成數/總數、最近到期的未完成任務。
```

---

## 六、`openclaw.json` 設定說明

`setup.sh` 自動生成，主要結構如下：

```json
{
  "gateway": {
    "mode": "local",
    "port": 18789,
    "bind": "lan",
    "auth": { "mode": "token", "token": "<自動生成>" }
  },
  "agents": {
    "defaults": { "model": "custom/<MODEL>" }
  },
  "models": {
    "mode": "merge",
    "providers": {
      "custom": {
        "baseUrl": "<API_URL>",
        "apiKey": "<API_KEY>",
        "models": [{ "id": "<MODEL>", "api": "openai-completions", "contextWindow": 128000 }]
      }
    }
  },
  "channels": {
    "discord": {
      "groupPolicy": "allowlist",
      "guilds": {
        "<DISCORD_SERVER_ID>": {
          "requireMention": true,
          "users": ["<DISCORD_USER_ID>"]
        }
      },
      "dmPolicy": "allowlist",
      "allowFrom": ["<DISCORD_USER_ID>"]
    }
  }
}
```

**安全設計**：`groupPolicy: allowlist` + `users` 白名單，確保只有指定用戶能觸發 Bot 回覆。

---

## 七、常用管理指令

```bash
# 查看容器狀態
docker ps | grep openclaw-discord

# 即時查看 log
docker logs openclaw-discord -f

# 停止
docker compose -f openclaw_for_obsidian/docker-compose.yml --env-file openclaw_for_obsidian/.env down

# 重新啟動
docker compose -f openclaw_for_obsidian/docker-compose.yml --env-file openclaw_for_obsidian/.env up -d

# 移除（保留 Vault）
bash openclaw_for_obsidian/uninstall.sh
```

---

## 八、驗收標準

### 8.1 標準問題集（Phase 3 驗收）

| 問題 | 查找目標 | 預期回答形式 |
| :--- | :--- | :--- |
| 「X 專案目前到哪個 phase？」 | 對應 WBS.md 的 `phase` frontmatter | 明確說出 phase 名稱 |
| 「哪些文件還在草稿狀態？」 | 所有 `status: draft` 的文件 | 條列文件名稱與所屬專案 |
| 「目前最高風險是什麼？」 | PRD / WBS 風險章節 | 條列前三大風險 |
| 「B 專案的 ERD 有哪些主要實體？」 | ERD.md 正文 | 條列實體名稱 |
| 「哪些 Open Questions 還沒決定？」 | PRD Open Questions 章節 | 條列待決事項 |
| 「X 專案的 WBS 還剩幾個任務？」 | WBS.md 的 `- [ ]` 數量 | 數字 + 列出未完成任務 |
| 「有哪些任務是張後端負責的？」 | 所有 WBS.md 中含 `[owner:: BE:張後端]` 的行 | 按專案分組列出 |
| 「這週有哪些任務的 deadline 到期？」 | WBS.md 中 `#YYYY-MM-DD` 落在本週的任務 | 條列 + 負責人 |
| 「哪個模組的任務最多還沒完成？」 | WBS.md 各模組 `- [ ]` 統計 | 排名 + 數量 |
| 「目前哪些文件在 in-review 狀態？」 | 所有 `status: in-review` 的文件 | 條列文件名稱 |

**驗收標準**：10 題中答對 9 題以上（準確率 ≥ 90%）

### 8.2 實作步驟

| 步驟 | 工作項目 | 驗收標準 |
| :--- | :--- | :--- |
| **Step 1** | 填寫 `.env`，執行 `setup.sh` | 容器正常啟動，`docker ps` 可見 `openclaw-discord` |
| **Step 2** | Discord 邀請 Bot 至伺服器，確認 Bot 上線 | Discord 伺服器成員列表中 Bot 顯示在線 |
| **Step 3** | 更新 `AGENTS.md`，加入 WBS 任務格式說明 | 用 `docker logs` 確認 AGENTS.md 已載入 |
| **Step 4** | 執行 10 題標準問題集 | 答對 9 題以上 |

---

## 九、已知限制

| 限制 | 說明 |
| :--- | :--- |
| **API 依賴** | OpenClaw 的推論需呼叫外部 API（OpenRouter / Anthropic），非完全離線 |
| **VAULT_PATH 建議使用 WSL 原生路徑** | 使用 `/mnt/c/...` 等 Windows 路徑可能導致跨系統存取問題 |
| **@mention 才回應** | `requireMention: true` 時，需 @Bot 才觸發，避免頻道雜訊 |
| **中文解析品質** | 取決於所選模型，建議使用 Claude 3.5 Sonnet 以上版本 |

---

**文件版本**：v2.0
**最後更新**：2026-06-04
**狀態**：草稿（Draft）
