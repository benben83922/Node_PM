---
project: Node_PM
doc_type: design_spec
status: draft
phase: planning
priority: high
owner: PM
updated: 2026-05-06
tags: [NemoClaw, OpenClaw, Discord, agent, conversation-memory]
---

# NemoClaw + Discord Agent｜設計規格書

**版本**：v1.0  
**文件類型**：核心功能規格  
**前置依賴**：OpenClaw自然語言查詢設計規格書.md、Obsidian儀表板設計規格書.md

---

## 零、執行環境

### 0.1 平台

| 層級 | 環境 | 說明 |
| :--- | :--- | :--- |
| 作業系統 | Windows + WSL2（Ubuntu 22.04+） | NemoClaw 安裝腳本為 bash，**必須在 WSL2 內執行**，不支援 Windows 原生 |
| 容器 | Docker Desktop（WSL2 backend） | NemoClaw 沙盒依賴 Docker；需在 Docker Desktop 啟用 WSL2 integration |
| Python 環境 | WSL2 內 | `main.py`（Proxy + Discord Bot）在 WSL2 本機執行，沙盒外 |
| Claude Code CLI | WSL2 內 | 需先在 WSL2 登入，確認 `claude -p "test"` 可正常執行 |

### 0.2 安裝前置確認

```
1. Docker Desktop → Settings → Resources → WSL Integration
   → 確認 Ubuntu distro 已勾選啟用

2. 在 WSL2 內確認 Docker 可用：
   docker ps

3. 在 WSL2 內確認 Claude Code CLI 已登入：
   claude -p "hello"
```

### 0.3 安裝步驟

**Step 1：安裝 NemoClaw（含 OpenClaw）**

```bash
curl -fsSL https://www.nvidia.com/nemoclaw.sh | bash
source ~/.bashrc   # 若 PATH 未更新
```

安裝時間約 20–30 分鐘，腳本會自動安裝 Node.js（via nvm）並進入 onboarding wizard。

**Step 2：Onboarding Wizard 設定**

| 項目 | 選擇 |
| :--- | :--- |
| 推論後端 | **Anthropic-compatible endpoint** |
| Base URL | `http://host.docker.internal:8080` |
| Model ID | `claude-sonnet-4-6` |
| Web Search | 依需求 |
| 通訊頻道 | Discord（填入 Bot Token） |
| Network Policy | Balanced（預設） |

**Step 3：OpenClaw Discord 設定**（`~/.openclaw/openclaw.json`）

```json
{
  "channels": {
    "discord": {
      "enabled": true,
      "botToken": "your-discord-bot-token",
      "dmPolicy": "pairing",
      "allowFrom": ["your-discord-user-id"],
      "requireMention": true
    }
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "anthropic-compatible/claude-sonnet-4-6"
      }
    }
  }
}
```

**Step 4：啟動順序**

```bash
# 1. 先啟動 Proxy（沙盒外）
python main.py

# 2. 啟動 NemoClaw 沙盒（含 OpenClaw）
nemoclaw my-assistant connect

# 3. 確認 Dashboard
# http://127.0.0.1:18790/
```

### 0.4 WSL2 已知問題

| 問題 | 是否影響本專案 | 處理方式 |
| :--- | :--- | :--- |
| GPU 偵測失敗（Issue #208） | ❌ 不影響（使用 Claude Code CLI，不需要 GPU） | 忽略 |
| TLS 憑證 bug（Issue #333） | ⚠️ 可能影響安裝 | 若安裝失敗，手動用 OpenSSL 建 X.509 v3 憑證 |
| 自動安裝腳本部分步驟失敗 | ⚠️ 可能需要手動補 | 參考 [advenboost 安裝指南](https://advenboost.com/nemoclaw-install/) |

---

## 一、功能定位

### 1.1 核心問題

原始 OpenClaw 設計透過 Telegram / Slack 提問，但缺乏：

- **沙盒隔離**：OpenClaw 直接執行在本機，無網路與檔案系統隔離
- **對話記憶**：每次提問無歷史上下文，無法連續追問
- **對話留存**：問答不會回寫進 Obsidian Vault，知識無法累積

### 1.2 解決方案

以 **NemoClaw（NVIDIA）** 作為 Docker 沙盒，把 OpenClaw 關在隔離環境中執行；以 **Discord Bot** 作為通訊介面；用戶主動要求時，由 Proxy 將摘要寫入 Obsidian Vault 各專案的 `_Conversations/` 資料夾。

---

## 二、系統元件

| 元件 | 角色 | 執行位置 |
| :--- | :--- | :--- |
| **Discord Bot** | 接收用戶 @mention、回傳答案 | 沙盒外（本機） |
| **NemoClaw** | Docker 沙盒，隔離 OpenClaw 執行環境 | 本機 Docker |
| **OpenClaw** | AI Agent，讀取 Vault、執行語意 routing、回答問題 | 沙盒內 |
| **NemoClaw Privacy Router** | 把 OpenClaw 的推論請求導向 Claude Code CLI Proxy | 沙盒內 |
| **Claude Code CLI Proxy** | 本機 HTTP server，接收推論請求並轉給 `claude -p` 執行 | 沙盒外（本機） |
| **Claude Code CLI** | 執行推論，使用 Claude Max 訂閱額度 | 本機 |
| **Obsidian Vault** | 知識來源 + 對話記錄儲存，掛載進沙盒 | 本機（掛載） |

---

## 三、完整流程

### 3.1 啟動流程

```
NemoClaw 啟動
    ↓
掛載 /mnt/c/Users/{帳號}/ObsidianVault → /vault（沙盒內，讀寫）
    ↓
OpenClaw 啟動
    ↓
掃描 /vault/ 一層子資料夾 → 建立專案清單
（跳過不含 .md 文件的資料夾）
    ↓
專案清單注入 system prompt
    ↓
Privacy Router 設定：推論請求 → Claude Code CLI Proxy（http://host.docker.internal:8080）
    ↓
OpenClaw 就緒，監聽 http://localhost:3000
```

### 3.2 一般查詢流程

```
Discord User @bot 問問題
        ↓
Discord Bot（沙盒外）
        ↓  HTTP POST /query + channel_id
── NemoClaw 沙盒邊界 ────────────────────────────────
        ↓
OpenClaw 收到問題
        ↓
Privacy Router → Claude API：對照專案清單，這題屬於哪個專案？
        ↓
    ┌─ 判斷明確（ProjectA）
    │       ↓
    │   讀取 /vault/ProjectA/**/*.md
    │       ↓
    │   Privacy Router → Claude API：根據內容回答
    │       ↓
    │   回傳答案（不寫入 Vault）
    │
    └─ 判斷不確定（無法對應單一專案）
            ↓
        回傳「請問是哪個專案？」
            ↓
        等待用戶回覆後重新進入查詢流程
── NemoClaw 沙盒邊界 ────────────────────────────────
        ↓
Discord Bot 回傳答案給用戶
        ↓
Proxy 將本輪 Q&A 存入記憶體（in-memory history）
```

### 3.3 摘要寫入流程

僅在用戶主動觸發時執行：

```
Discord User @bot 幫我總結今天的討論
        ↓
Proxy 從記憶體取出本 session 完整對話
        ↓
呼叫 claude -p：根據對話生成繁體中文摘要
        ↓
寫入 /mnt/c/.../ObsidianVault/{ProjectA}/_Conversations/discord-{date}.md
        ↓
Discord Bot 回傳「已寫入 Obsidian」
```

---

## 四、Obsidian Vault 結構

### 4.1 資料夾規範

OpenClaw 啟動時掃描 `/vault/` 第一層子資料夾，每個子資料夾視為一個專案：

```
C:\Users\{帳號}\ObsidianVault\        （Windows 實體位置）
/mnt/c/Users/{帳號}/ObsidianVault/    （WSL2 路徑）
/vault/                                （沙盒內掛載路徑）
├── ProjectA/
│   ├── _Conversations/          ← 摘要（用戶觸發，Proxy 寫入）
│   │   └── discord-2026-05-06.md
│   └── *.md                     ← 專案知識文件（OpenClaw 唯讀）
├── ProjectB/
│   ├── _Conversations/
│   └── *.md
└── ...
```

### 4.2 對話記憶機制

| 類型 | 儲存位置 | 觸發時機 | 說明 |
| :--- | :--- | :--- | :--- |
| **Session 對話** | 記憶體（`main.py` 內） | 每輪自動 | 用於維持本次對話上下文，重啟後清空 |
| **摘要** | Obsidian Vault `_Conversations/` | 用戶主動觸發 | 用戶說「幫我總結今天的討論」時寫入 |

### 4.3 摘要文件格式

```markdown
---
title: Discord 討論摘要 - {date}
doc_type: conversation_summary
project: ProjectA
channel: {channel_id}
updated: {date}
---

## {date} 討論摘要

{Claude 生成的繁體中文摘要內容}
```

### 4.4 掛載設定

```yaml
volumes:
  - /mnt/c/Users/{帳號}/ObsidianVault:/vault   # 讀寫，摘要寫入需要寫入權限
```

Vault 位於 Windows 檔案系統，透過 WSL2 的 `/mnt/c/` 路徑掛載。寫入僅在用戶主動請求摘要時發生，頻率低，Windows NTFS 跨界寫入的效能問題可接受。

---

## 五、專案路由設計

### 5.1 自動掃描機制

OpenClaw 啟動時自動掃描 `/vault/` 一層子資料夾，建立專案清單並注入 system prompt：

```
可用的專案資料夾：
- ProjectA：（根據資料夾內 .md frontmatter 的 project 欄位自動帶入描述）
- ProjectB：...
- Node_PM：...
```

掃描規則：
- 只掃描第一層子資料夾（不遞迴）
- 跳過不含 `.md` 文件的資料夾
- 跳過以 `_` 開頭的系統資料夾（如 `_Conversations`、`_Templates`）

### 5.2 路由判斷規則

| 情況 | 處理方式 |
| :--- | :--- |
| 問題明確對應單一專案 | 直接讀取該專案資料夾，回答後記錄 |
| 問題無法判斷屬於哪個專案 | 回傳「請問是哪個專案？」，等用戶確認 |
| 問題跨多個專案（如比較） | 分別讀取各專案資料夾，整合回答 |

---

## 六、推論後端設定

### 6.1 方案選擇

採用 **Claude Code CLI Proxy** 方案，以 Claude Max 訂閱額度作為推論後端，不需要額外的 Anthropic API key。

```
OpenClaw（沙盒內）
    ↓  HTTP POST
Claude Code CLI Proxy（沙盒外，本機）
    ↓  subprocess: claude -p "..."
Claude Code CLI（使用 Max 訂閱額度）
    ↓
回答回傳給 OpenClaw
```

### 6.2 元件對照更新

| 原設計 | 實際採用 |
| :--- | :--- |
| NemoClaw Privacy Router → Anthropic API | NemoClaw Privacy Router → Claude Code CLI Proxy（本機 HTTP server） |
| 需要 Anthropic API key | 使用 Claude Max 訂閱，無需額外 API key |

### 6.3 NemoClaw Privacy Router 設定

```yaml
inference:
  provider: anthropic-compatible
  endpoint: http://host.docker.internal:8080
  model: claude-sonnet-4-6
```

NemoClaw 選用 **Anthropic-compatible** 後，會對 `{endpoint}/v1/messages` 發送請求（Anthropic Messages API 格式）。因此 Proxy 必須實作 `/v1/messages` endpoint，不是任意路徑。

`host.docker.internal` 是 Docker Desktop 提供的特殊 DNS，讓沙盒內的容器能找到 WSL2 host 上執行的 Proxy。

### 6.4 Proxy 網路設定要求

Proxy 必須 listen `0.0.0.0`，否則 Docker 容器的請求會被擋：

```python
app.run(host="0.0.0.0", port=8080)   # ✅ 接受所有來源
# app.run(port=8080)                  # ❌ 預設只 listen 127.0.0.1
```

### 6.5 Claude Code CLI 登入前提

`claude -p` 執行時依賴 WSL2 本機的 auth token。**在啟動 Proxy 前，確認已在 WSL2 執行過 `claude` 並完成登入。**

```bash
claude -p "hello"   # 應回傳正常答案，不出現登入提示
```

### 6.6 限制

- 每次呼叫 `claude -p` 會啟動新 session，對話記憶需由 Proxy 自行管理（從記憶體讀取本 session 歷史後注入 prompt）
- 回應速度略慢於直接呼叫 API（subprocess 啟動開銷）

---

## 七、實作檔案結構

### 7.1 單一檔案原則

Discord Bot 與 Claude Code CLI Proxy 合併為一支 `main.py`，不拆分。規模不需要多檔案，單一入口點更容易啟動與維護。

### 7.2 main.py 模組結構

```
main.py
├── search_vault()       ← 關鍵字搜尋 Vault，回傳相關段落
├── get_history()        ← 從記憶體取出本 session 對話歷史
├── append_history()     ← 將本輪 Q&A 存入記憶體
├── write_summary()      ← 呼叫 claude -p 生成摘要並寫入 Vault
├── ask_claude()         ← subprocess 呼叫 claude -p，回傳答案
├── Flask app            ← /query endpoint，供 OpenClaw 呼叫
├── Discord client       ← 接收 @mention；偵測「總結」指令 → write_summary()
└── main()               ← 以 threading 同時啟動 Flask 與 Discord bot
```

### 7.3 並行機制

Flask 和 Discord bot 各自需要長駐的事件迴圈，採用 **threading** 解決：

- Flask → 背景執行緒
- Discord bot → 主執行緒

兩者共用同一份 `search_vault()`、`get_history()`、`append_history()`、`ask_claude()` 函式。

### 7.4 啟動方式

```bash
# Step 1：先啟動 Proxy + Discord Bot（沙盒外）
python main.py

# Step 2：啟動 NemoClaw 沙盒
nemoclaw my-assistant connect
```

**順序重要**：Proxy 必須先起來，NemoClaw 啟動時才能成功連接推論後端。

---

## 八、已知限制

| 限制 | 說明 | 緩解方式 |
| :--- | :--- | :--- |
| **Claude Code CLI Proxy 為額外元件** | 沙盒外需要常駐一個 HTTP server 轉接請求給 `claude -p` | 與 Discord Bot 一起啟動，納入啟動流程 |
| **對話無法跨日期搜尋** | 對話記錄按日期分檔，跨日查詢需手動翻找 | 後續可加入 Dataview query 整合 |
| **摘要寫入路徑確認** | Proxy（WSL2）寫入 `/mnt/c/...`，需確認掛載路徑正確才能在 Obsidian 看到 | 首次觸發摘要後確認 `_Conversations/` 有出現在 Obsidian |
| **NemoClaw 目前為 Alpha** | 功能可能有變動，安裝腳本以官方最新版為準 | 以 GitHub 官方文件為準，本規格書為設計意圖而非安裝指令 |
| **Proxy 必須 listen 0.0.0.0** | Docker 容器無法連接只 listen 127.0.0.1 的 server | `app.run(host="0.0.0.0", port=8080)` |
| **Claude Code CLI 需登入** | Proxy 啟動前需確認 WSL2 內已完成 `claude` 登入 | 執行 `claude -p "hello"` 確認無登入提示 |
| **WSL2 TLS 憑證 bug** | NemoClaw onboarding 可能因憑證問題失敗 | 手動用 OpenSSL 建 X.509 v3 憑證（Issue #333）|

---

## 九、開機自動啟動

### 9.1 啟動順序與依賴

```
Windows 開機 → 用戶登入
    ↓
[Windows] Docker Desktop 自動啟動
    ↓
[Windows] Task Scheduler 喚醒 WSL2
    ↓
[WSL2 systemd] openclaw-gateway.service   （After: docker.socket）
    ↓
[WSL2 systemd] nemoclaw-sandbox.service   （After: openclaw-gateway.service）
    ↓
[WSL2 systemd] discord-agent.service      （After: nemoclaw-sandbox.service）
```

### 9.2 Windows 端設定

**Step 1：Docker Desktop 登入自動啟動**

```
Docker Desktop → Settings → General
→ 勾選「Start Docker Desktop when you log in to your computer」
```

**Step 2：Task Scheduler 喚醒 WSL2**

```
工作排程器 → 建立基本工作
  觸發器：登入時
  動作：啟動程式
    程式：wsl.exe
    引數：-e sleep 1
```

`wsl.exe -e sleep 1` 會喚醒 WSL2 並讓 systemd 接管，之後三個服務依序自動啟動。

### 9.3 WSL2 systemd 設定

**前置：確認 WSL2 已啟用 systemd**

`/etc/wsl.conf`：
```ini
[boot]
systemd=true
```

修改後需重啟 WSL2：`wsl --shutdown`，再重新開啟。

**三個 systemd service 檔案：**

`/etc/systemd/system/openclaw-gateway.service`
```ini
[Unit]
Description=OpenClaw Gateway
After=docker.socket
Requires=docker.socket

[Service]
Type=simple
User={你的帳號}
WorkingDirectory=/home/{你的帳號}
ExecStart=/usr/local/bin/openclaw gateway start
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

`/etc/systemd/system/nemoclaw-sandbox.service`
```ini
[Unit]
Description=NemoClaw Sandbox
After=openclaw-gateway.service
Requires=openclaw-gateway.service

[Service]
Type=oneshot
RemainAfterExit=yes
User={你的帳號}
ExecStart=/usr/local/bin/nemoclaw my-assistant recover
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

`/etc/systemd/system/discord-agent.service`
```ini
[Unit]
Description=Discord Agent (Proxy + Bot)
After=nemoclaw-sandbox.service
Requires=nemoclaw-sandbox.service

[Service]
Type=simple
User={你的帳號}
WorkingDirectory=/home/{你的帳號}/Node_PM/discord-agent
ExecStart=/usr/bin/python3 main.py
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

**啟用三個服務：**

```bash
sudo systemctl daemon-reload
sudo systemctl enable openclaw-gateway nemoclaw-sandbox discord-agent
```

### 9.4 服務管理常用指令

```bash
# 狀態查看
sudo systemctl status openclaw-gateway
sudo systemctl status nemoclaw-sandbox
sudo systemctl status discord-agent

# Log 查看
sudo journalctl -u discord-agent -f        # 即時
sudo journalctl -u discord-agent --since today

# 手動重啟
sudo systemctl restart discord-agent
```

### 9.5 已知注意事項

| 項目 | 說明 |
| :--- | :--- |
| `nemoclaw recover` 為冪等指令 | 沙盒已在線時執行也安全，不會重複建立 |
| `nemoclaw connect` 不可用於服務 | 互動式 SSH，會阻塞 systemd，改用 `recover` |
| Docker Desktop 必須先完全就緒 | Task Scheduler 的 WSL2 喚醒時間可依需求延後（引數改 `sleep 10`）|
| `main.py` 路徑需填絕對路徑 | systemd 不繼承 shell 的 PATH 與工作目錄 |

---

**文件版本**：v1.1  
**最後更新**：2026-05-06  
**狀態**：草稿（Draft）
