---
project: Node_PM
doc_type: FeatureSpec
status: draft
phase: dev
priority: high
owner: PM
updated: 2026-05-15
tags: [discord-agent, proxy, NemoClaw, docker, development-plan]
---

# discord-agent｜重構開發計畫（Bot / Proxy 拆分）

**版本**：v2.0
**最後更新**：2026-05-15
**取代文件**：v1.0（main.py 單檔設計）

---

## 一、背景與動機

原始設計將 Flask Proxy 與 Discord Bot 合併於單一 `main.py`，在 WSL2 native 執行。
本次重構將兩者拆分為獨立程式，並調整各元件的執行環境：

| 元件 | 原本 | 重構後 |
|------|------|--------|
| Discord Bot | WSL2 native（main.py 的一部分） | **Docker 容器**（discord_bot.py） |
| Flask Proxy（claude -p） | WSL2 native（main.py 的一部分） | **WSL2 native**（proxy.py） |
| NemoClaw | 獨立 Docker 容器 | 獨立 Docker 容器（不變） |

**重構理由**：
- Discord Bot 不依賴本地環境，Docker 化後部署更簡單、可移植
- Proxy 必須在 WSL2 執行，才能呼叫 `claude -p`（CLI 只在 WSL2 登入）
- NemoClaw 獨立容器，與 Discord Bot 透過 Docker 橋接網路通訊

---

## 二、目標架構

```
Discord User @bot
       ↓
discord_bot.py（Docker A｜discord-bot）
  - 純 Discord I/O
  - in-memory _history 管理
  - 一般查詢 → POST NemoClaw /v1/messages
  - 總結指令 → POST NemoClaw /summarize（帶 _history）
       ↓ HTTP（nemo-network，以 container name 連線）
NemoClaw（Docker B｜nemoclaw）
  - Vault volume mount（read/write）
  - 自然語言查詢（/v1/messages）
  - 摘要生成 + 寫入 Vault（/summarize）
       ↓ POST /v1/messages → host.docker.internal:8081
proxy.py（WSL2 native）
  - Flask /v1/messages
  - subprocess claude -p
  - systemd service 自動啟動
       ↓
Claude Code CLI（Max 訂閱額度）
```

### 網路設計

| 連線方向 | 方式 | 說明 |
|----------|------|------|
| Discord Bot → NemoClaw | `http://nemoclaw:PORT` | 同 nemo-network，用 container name |
| NemoClaw → Proxy | `http://host.docker.internal:8081` | 穿透回 WSL2 |
| Proxy | `0.0.0.0:8081` | 接受來自 Docker 虛擬網卡的流量 |

---

## 三、元件職責對照

### discord_bot.py（Docker）

**保留自 main.py：**
- `_history` / `get_history()` / `append_history()` / `clear_history()`
- `_detect_project()` / `_PROJECT_BRACKET` / `_SUMMARY_TRIGGERS`
- `on_ready()` / `on_message()` 事件

**修改：**
- `ask_openclaw()` → `ask_nemoclaw()`：目標改為 `NEMOCLAW_URL`（NemoClaw container）
- 總結指令：改 POST `{NEMOCLAW_URL}/summarize`，payload 帶 `history`、`project`、`channel_id`

**移除：**
- `scan_projects()`（交給 NemoClaw）
- `write_summary()`（交給 NemoClaw）
- Flask Proxy 相關（`flask_app`、`proxy_messages()`、`_run_flask()`）
- `ask_claude()`、`_messages_to_prompt()`
- `VAULT_PATH`、`PROXY_PORT` 環境變數

**環境變數（.env）：**
```
DISCORD_TOKEN=
NEMOCLAW_URL=http://nemoclaw:8000
```

---

### proxy.py（WSL2 native）

**保留自 main.py：**
- `ask_claude()` subprocess
- `_messages_to_prompt()`
- `flask_app` + `/v1/messages` endpoint
- `/health` endpoint

**移除：**
- Discord Bot 相關所有代碼
- `_history`、Vault、`scan_projects()`、`write_summary()`
- `ask_openclaw()`、`requests` import

**環境變數（.env）：**
```
PROXY_PORT=8081
VAULT_PATH=/mnt/c/Users/benben83922/ObsidianVault
```

---

### NemoClaw（Docker B）

- 掛載 Vault（volume mount，read + write）
- 處理一般查詢（`/v1/messages`）
- 處理總結請求（`/summarize`）：生成摘要 + 寫入 `{VAULT_PATH}/{project}/_Conversations/discord-{date}.md`
- 推論後端設定指向 `http://host.docker.internal:8081`

---

## 四、實作任務

### Task 1｜建立 proxy.py

從 `main.py` 提取 Flask Proxy 部分，獨立為 `discord-agent/proxy.py`。

**保留的函式：**
- `ask_claude(prompt: str) -> str`
- `_messages_to_prompt(messages, system) -> str`
- `proxy_messages()` (`POST /v1/messages`)
- `health()` (`GET /health`)
- `main()` → 直接執行 `flask_app.run(host="0.0.0.0", port=PROXY_PORT)`

**驗收**：`python proxy.py` 啟動後，`curl http://localhost:8081/health` 回傳 `{"status": "ok"}`

---

### Task 2｜建立 discord_bot.py

從 `main.py` 提取 Discord Bot 部分，獨立為 `discord-agent/discord_bot.py`。

**新增 `ask_nemoclaw()`：**

```python
NEMOCLAW_URL = os.environ.get("NEMOCLAW_URL", "http://nemoclaw:8000")

def ask_nemoclaw(prompt: str) -> str:
    try:
        resp = requests.post(
            f"{NEMOCLAW_URL}/v1/messages",
            json={
                "model": "claude-sonnet-4-6",
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 4096,
            },
            timeout=120,
        )
        resp.raise_for_status()
        return resp.json()["content"][0]["text"]
    except requests.exceptions.Timeout:
        return "[timeout] NemoClaw 回應超時，請再試一次。"
    except Exception as e:
        return f"[error] 呼叫 NemoClaw 失敗：{e}"
```

**總結指令改寫（原 `write_summary()` 拆出）：**

```python
def request_summary(channel_id: int, project: str | None) -> str:
    history = get_history(channel_id)
    if not history:
        return "目前沒有對話記錄可以總結。"
    try:
        resp = requests.post(
            f"{NEMOCLAW_URL}/summarize",
            json={
                "channel_id": channel_id,
                "project": project,
                "history": [{"role": r, "content": c} for r, c in history],
            },
            timeout=120,
        )
        resp.raise_for_status()
        return resp.json().get("message", "摘要已寫入 Vault。")
    except Exception as e:
        return f"[error] 摘要請求失敗：{e}"
```

**驗收**：Docker 啟動後，Discord @bot 收到回應（非 error 訊息）

---

### Task 3｜拆分 requirements.txt

| 檔案 | 套件 |
|------|------|
| `requirements.txt`（Discord Bot Docker 用） | `discord.py>=2.3.0`, `python-dotenv>=1.0.0`, `requests>=2.31.0` |
| `requirements-proxy.txt`（WSL2 proxy.py 用） | `flask>=3.0.0`, `python-dotenv>=1.0.0` |

**驗收**：兩個環境分別 `pip install` 無錯誤

---

### Task 4｜更新 Dockerfile

將 `Dockerfile` 改指向 `discord_bot.py`：

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY discord_bot.py .
CMD ["python", "discord_bot.py"]
```

**驗收**：`docker build -t discord-bot .` 成功

---

### Task 5｜更新 docker-compose.yml

`for_user/docker-compose.yml` 改為：

```yaml
services:
  discord-bot:
    image: benben83922/discord-bot:latest
    container_name: discord-bot
    restart: unless-stopped
    networks:
      - nemo-network
    environment:
      - DISCORD_TOKEN=${DISCORD_TOKEN}
      - NEMOCLAW_URL=http://nemoclaw:8000

  nemoclaw:
    image: nemoclaw-image:latest
    container_name: nemoclaw
    restart: unless-stopped
    networks:
      - nemo-network
    extra_hosts:
      - "host.docker.internal:host-gateway"
    volumes:
      - ${VAULT_PATH}:/vault
    environment:
      - WSL_PROXY_URL=http://host.docker.internal:8081

networks:
  nemo-network:
    driver: bridge
```

**驗收**：`docker compose up -d` 後，`docker compose ps` 兩個服務均顯示 `running`

---

### Task 6｜確認 NemoClaw /summarize 端點

NemoClaw 需要支援 `/summarize` 端點（接收 `history`、`project`、`channel_id`，寫入 Vault 並回傳確認訊息）。

**排查項目：**
1. 確認 NemoClaw 是否原生支援自訂 HTTP 端點
2. 若不支援，評估在 NemoClaw 旁邊加入 sidecar service（小型 FastAPI/Flask，掛載同一個 Vault volume）
3. 確認 NemoClaw container 對 `/vault` 的寫入權限

**暫定 sidecar 方案**（若 NemoClaw 不支援自訂端點）：

```yaml
  vault-writer:
    build: ./vault-writer
    container_name: vault-writer
    networks:
      - nemo-network
    volumes:
      - ${VAULT_PATH}:/vault
    environment:
      - NEMOCLAW_URL=http://nemoclaw:8000
```

`vault-writer` 是一支小型 FastAPI，負責：
- 接收 `/summarize` 請求
- 呼叫 NemoClaw 生成摘要文字
- 寫入 `/vault/{project}/_Conversations/discord-{date}.md`
- 回傳確認訊息給 Discord Bot

若採用此方案，`discord_bot.py` 的 `NEMOCLAW_URL` 改指向 `vault-writer` 的 `/summarize`，一般查詢仍直接打 NemoClaw。

**驗收**：觸發「總結」後，Vault 內出現對應 `.md` 檔案

---

### Task 7｜設定 proxy.py systemd service

`/etc/systemd/system/discord-proxy.service`：

```ini
[Unit]
Description=Claude Proxy (claude -p Flask wrapper)
After=network.target

[Service]
Type=simple
User=benben83922
WorkingDirectory=/home/benben83922/Node_PM/discord-agent
ExecStart=/usr/bin/python3 proxy.py
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable discord-proxy
sudo systemctl start discord-proxy
```

**驗收**：`systemctl status discord-proxy` 顯示 `active (running)`

---

## 五、驗收標準（完整系統）

| 項目 | 驗收標準 |
|------|---------|
| **Proxy 啟動** | `systemctl status discord-proxy` → `active (running)`；`/health` 回傳 200 |
| **Docker 啟動** | `docker compose ps` → discord-bot、nemoclaw 均 `running` |
| **網路連通** | NemoClaw container 內 `curl http://host.docker.internal:8081/health` 回傳 200 |
| **基本查詢** | Discord @bot「Node_PM 現在到哪個 phase？」→ 收到正確答案 |
| **推論路由** | Proxy log 出現 `POST /v1/messages`（確認 NemoClaw 打到 Proxy） |
| **總結功能** | Discord @bot「幫我總結今天的討論」→ Vault 出現 `_Conversations/discord-{date}.md` |
| **自動啟動** | 重開機後，`discord-proxy` service 自動啟動，不需手動執行 |

---

## 六、啟動順序

```bash
# Step 1：啟動 Proxy（WSL2）
# 若已設 systemd service，開機自動啟動；手動啟動：
python3 /home/benben83922/Node_PM/discord-agent/proxy.py

# Step 2：啟動 Discord Bot + NemoClaw
cd /home/benben83922/Node_PM/discord-agent/for_user
docker compose up -d

# Step 3：確認
systemctl status discord-proxy
docker compose ps
docker compose logs -f discord-bot
```

> ⚠️ **順序重要**：Proxy 必須先起來，NemoClaw 啟動時才能成功連接推論後端。

---

## 七、待解決問題

| 問題 | 狀態 | 影響 |
|------|------|------|
| NemoClaw 是否支援 `/summarize` 自訂端點 | **待確認**（Task 6 核心問題） | 影響是否需要 sidecar vault-writer service |
| NemoClaw container 對掛載 Vault 的寫入權限 | 待測試 | 影響摘要寫入功能 |
| NemoClaw 推論後端設定（Privacy Router 指向 `host.docker.internal:8081`） | 待驗證 | 影響 Proxy 是否收到請求 |

---

**文件版本**：v2.0
**最後更新**：2026-05-15
**狀態**：草稿（Draft）
