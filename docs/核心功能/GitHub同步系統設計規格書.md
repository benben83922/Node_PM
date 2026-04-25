# GitHub 同步系統｜設計規格書

**版本**：v1.0
**文件類型**：核心功能規格
**依賴**：本地環境具備 `git` 指令、`crontab` 或 Task Scheduler（Windows）

---

## 一、功能定位

### 1.1 核心問題

PM 使用 Claude Code 產出 `.md` 文件後，透過 `git push` 推送到 GitHub 供工程師使用。但 PM 本地的 Obsidian Vault 不會自動更新——工程師修改文件並推送後，PM 端必須手動 `git pull` 才能看到最新版本。

這導致 Obsidian 儀表板的資料是**過時的**，違背了「打開就看到最新狀態」的設計目標。

### 1.2 解決方案：自動 Pull 機制

建立一個**定時自動執行 `git pull` 的腳本**，每 1 分鐘掃描 `_Projects/` 目錄下所有 Git repo，有更新就拉取，讓 Obsidian Vault 始終保持與 GitHub 一致。

```
GitHub（遠端）
    ↓  cron 每 1 分鐘觸發
sync_vault.sh 執行 git pull
    ↓
~/ObsidianVault/_Projects/（本地 Vault 更新）
    ↓
Obsidian Dataview 自動重新查詢渲染
```

---

## 二、目錄結構設計

### 2.1 初始化設定

每個專案目錄對應一個 GitHub repo：

```bash
# 初次設定：clone 所有專案到 Vault
cd ~/ObsidianVault/_Projects/

git clone https://github.com/your-org/project-a.git ProjectA
git clone https://github.com/your-org/project-alpha.git ProjectAlpha
git clone https://github.com/your-org/project-beta.git ProjectBeta
```

執行後的目錄結構：

```
~/ObsidianVault/_Projects/
  ├── _Projects/ProjectA/
  │   ├── .git/          ← Git metadata
  │   ├── PRD.md
  │   ├── ERD.md
  │   └── ...
  ├── ProjectAlpha/
  │   ├── .git/
  │   └── ...
  └── ProjectBeta/
      ├── .git/
      └── ...
```

---

## 三、同步腳本（推薦方案）

### 3.1 腳本內容

建立 `~/scripts/sync_vault.sh`：

```bash
#!/bin/bash

# ================================
# Obsidian Vault 自動同步腳本
# ================================

VAULT_DIR="$HOME/ObsidianVault/_Projects"
LOG_FILE="$HOME/scripts/sync.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$TIMESTAMP] 開始同步..." >> "$LOG_FILE"

# 掃描所有含 .git 的子目錄
for dir in "$VAULT_DIR"/*/; do
  if [ -d "$dir/.git" ]; then
    project=$(basename "$dir")

    # 檢查網路連線（避免離線時報錯）
    if git -C "$dir" fetch --dry-run 2>/dev/null; then
      result=$(git -C "$dir" pull origin main 2>&1)

      if echo "$result" | grep -q "Already up to date"; then
        echo "[$TIMESTAMP] $project: 無更新" >> "$LOG_FILE"
      else
        echo "[$TIMESTAMP] $project: ✅ 已更新" >> "$LOG_FILE"
        echo "$result" >> "$LOG_FILE"
      fi
    else
      echo "[$TIMESTAMP] $project: ⚠️ 網路不可用，跳過" >> "$LOG_FILE"
    fi
  fi
done

echo "[$TIMESTAMP] 同步完成" >> "$LOG_FILE"
echo "---" >> "$LOG_FILE"
```

### 3.2 設定執行權限

```bash
chmod +x ~/scripts/sync_vault.sh

# 手動測試
bash ~/scripts/sync_vault.sh

# 確認 log 是否正常輸出
cat ~/scripts/sync.log
```

---

## 四、排程設定

### 4.1 macOS / Linux（crontab）

```bash
# 開啟 crontab 編輯器
crontab -e

# 加入以下一行（每 1 分鐘執行）
*/1 * * * * bash ~/scripts/sync_vault.sh >> ~/scripts/sync.log 2>&1
```

**確認 cron 是否運行**：

```bash
# 查看 crontab 清單
crontab -l

# 查看最近 log
tail -20 ~/scripts/sync.log
```

### 4.2 Windows（Task Scheduler）

1. 開啟「工作排程器」（Task Scheduler）
2. 建立基本工作 → 名稱：`Obsidian Vault Sync`
3. 觸發程序：每日，重複間隔每 1 分鐘
4. 動作：啟動程式 → `bash.exe`，引數：`~/scripts/sync_vault.sh`

### 4.3 排程頻率選擇

| 頻率 | 適用場景 | 延遲 |
| :--- | :--- | :--- |
| **每 1 分鐘（推薦）** | 日常 PM 工作，平衡即時性與資源消耗 | ≤ 10 分鐘 |
| 每 5 分鐘 | 需要更即時的同步 | ≤ 5 分鐘 |
| 每 1 分鐘 | 非常頻繁的文件更新場景 | ≤ 1 分鐘 |
| 每 30 分鐘 | 資源受限，不需要即時 | ≤ 30 分鐘 |

---

## 五、進階方案：即時同步（Webhook）

當需要 git push 後「立即」同步到 Obsidian 時，可設定 GitHub Actions + 本地 Webhook。

### 5.1 架構

```
git push → GitHub
    ↓
GitHub Actions 觸發
    ↓
呼叫本地 Webhook（透過 ngrok 暴露）
    ↓
本地 webhook server 執行 git pull
    ↓
Obsidian 立即更新（< 1 分鐘）
```

### 5.2 本地 Webhook Server（Python）

建立 `~/scripts/webhook_server.py`：

```python
from http.server import HTTPServer, BaseHTTPRequestHandler
import subprocess
import json
import hmac
import hashlib
import os

SECRET = os.environ.get('GITHUB_WEBHOOK_SECRET', '').encode()
VAULT_DIR = os.path.expanduser('~/ObsidianVault/_Projects')

class WebhookHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        # 驗證 GitHub Webhook 簽名
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)

        signature = self.headers.get('X-Hub-Signature-256', '')
        expected = 'sha256=' + hmac.new(SECRET, body, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected):
            self.send_response(403)
            self.end_headers()
            return

        # 解析 repo 名稱並執行 pull
        payload = json.loads(body)
        repo_name = payload.get('repository', {}).get('name', '')
        project_dir = os.path.join(VAULT_DIR, repo_name)

        if os.path.isdir(os.path.join(project_dir, '.git')):
            subprocess.run(['git', '-C', project_dir, 'pull', 'origin', 'main'])
            print(f'[Webhook] {repo_name} 已同步')

        self.send_response(200)
        self.end_headers()

    def log_message(self, format, *args):
        pass  # 靜默 HTTP log

if __name__ == '__main__':
    server = HTTPServer(('localhost', 9000), WebhookHandler)
    print('Webhook server 啟動於 http://localhost:9000')
    server.serve_forever()
```

### 5.3 設定 ngrok 暴露本地端口

```bash
# 安裝 ngrok（一次性）
brew install ngrok  # macOS

# 啟動 ngrok
ngrok http 9000

# 將 ngrok 輸出的 HTTPS URL 設定到 GitHub repo 的 Webhooks
# Settings → Webhooks → Add webhook
```

**注意**：Webhook 方案需要保持 Python server 和 ngrok 持續運行，複雜度較高。**一般情況下建議使用 Cron Pull 即可。**

---

## 六、新增專案時的操作流程

當 PM 開始管理一個新專案時：

```bash
# Step 1：Clone 新專案到 Vault
cd ~/ObsidianVault/_Projects/
git clone https://github.com/your-org/new-project.git NewProject

# Step 2：確認目錄結構
ls -la NewProject/  # 應該看到 .git/ 目錄

# Step 3：手動執行一次同步確認
bash ~/scripts/sync_vault.sh

# Step 4：完成，之後 cron 會自動處理
```

---

## 七、疑難排解

### 7.1 常見問題

| 問題 | 原因 | 解決方式 |
| :--- | :--- | :--- |
| Obsidian 沒有更新 | cron 沒有執行 | `crontab -l` 確認排程存在；`cat ~/scripts/sync.log` 確認有執行記錄 |
| git pull 需要輸入密碼 | SSH 沒有設定好 | 設定 SSH key 並加入 GitHub（見 7.2） |
| log 顯示 fetch 失敗 | 網路不通 | 確認 VPN 或網路連線 |
| 特定 repo pull 失敗 | 本地有未 commit 的變更 | `git -C ~/ObsidianVault/_Projects/ProjectX status` 確認狀態 |

### 7.2 設定免密碼 Git（SSH Key）

```bash
# 生成 SSH key
ssh-keygen -t ed25519 -C "your-email@example.com"

# 複製公鑰
cat ~/.ssh/id_ed25519.pub

# 貼到 GitHub → Settings → SSH and GPG keys → New SSH key

# 測試連線
ssh -T git@github.com

# 更新現有 repo 使用 SSH（而非 HTTPS）
git -C ~/ObsidianVault/_Projects/ProjectA remote set-url origin git@github.com:your-org/project-a.git
```

### 7.3 Log 查看指令

```bash
# 查看最後 20 行 log
tail -20 ~/scripts/sync.log

# 即時監控 log
tail -f ~/scripts/sync.log

# 查看今天的 log
grep "$(date '+%Y-%m-%d')" ~/scripts/sync.log
```

---

## 八、安全性考量

| 風險 | 說明 | 緩解措施 |
| :--- | :--- | :--- |
| **私密文件外洩** | 若 GitHub repo 是 private，clone 時需要認證 | 使用 SSH key 認證，不在腳本中硬編碼密碼 |
| **Webhook Secret** | Webhook 方案需要保護 secret | 從環境變數讀取，不寫入程式碼 |
| **本地 Log 機敏內容** | sync.log 可能含有 repo 路徑 | 確保 log 檔案不被 git track（加入 `.gitignore`） |

---

**文件版本**：v1.0
**最後更新**：2026-04-25
**狀態**：草稿（Draft）
