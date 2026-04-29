# GitHub 同步系統｜設計規格書

**版本**：v1.1
**文件類型**：核心功能規格
**依賴**：Obsidian 已安裝、Git 已安裝、GitHub repo 已建立

---

## 一、功能定位

### 1.1 核心問題

PM 與工程師透過 GitHub 協作，所有 `.md` 文件的最新版本存在 GitHub 上。但每位成員的本地 Obsidian Vault 不會自動更新——若無同步機制，成員看到的永遠是舊版文件。

### 1.2 解決方案：Obsidian Git 外掛

採用 **Obsidian Git 外掛**（社群外掛）作為同步機制，讓每位成員在 Obsidian 內完成 Git 操作，無需使用 Terminal 或額外腳本。

外掛在 Obsidian 開啟時，每隔固定間隔自動執行 `git pull`，確保 Vault 與 GitHub 保持一致。

```
GitHub（遠端最新文件）
    ↓  Obsidian Git 外掛自動 pull（每 1 分鐘）
本地 Obsidian Vault（自動更新）
    ↓
Dataview 重新渲染儀表板
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
  ├── ProjectA/
  │   ├── .git/
  │   ├── PRD.md
  │   ├── ERD.md
  │   └── WBS.md
  ├── ProjectAlpha/
  │   ├── .git/
  │   └── ...
  └── ProjectBeta/
      ├── .git/
      └── ...
```

---

## 三、Obsidian Git 外掛設定

### 3.1 安裝步驟（每位成員執行一次）

1. 開啟 Obsidian → **Settings** → **Community Plugins**
2. 關閉 Safe Mode（若尚未關閉）
3. 搜尋 **Obsidian Git** → 安裝 → 啟用

### 3.2 外掛設定

開啟外掛設定（Settings → Obsidian Git）：

| 設定項目 | 建議值 | 說明 |
| :--- | :--- | :--- |
| **Auto pull interval (minutes)** | `1` | 每 1 分鐘自動 pull |
| **Pull on startup** | 開啟 | 開啟 Obsidian 時立即 pull |
| **Auto push interval** | `0`（停用）或依需求 | 純讀取成員設為 0 |
| **Commit message** | `vault backup: {{date}}` | 自動 commit 訊息格式 |

### 3.3 各角色設定差異

| 角色 | Auto pull | Auto push | 說明 |
| :--- | :--- | :--- | :--- |
| **PM** | 開啟 | 開啟 | 主要維護者，需更新 frontmatter |
| **工程師** | 開啟 | 視情況 | 主要讀取，偶爾更新 WBS checkbox |
| **其他成員** | 開啟 | 關閉 | 純讀取 |

---

## 四、Push 前 Merge 流程

採用「先 pull merge，再 push」的標準工作流，大幅降低衝突風險：

```
本地修改
  ↓
Obsidian Git 自動 pull（merge 遠端最新變更）
  ↓
若有衝突 → 手動解決後 commit
若無衝突 → 自動 merge commit
  ↓
push 到 GitHub
```

**衝突發生機率分析**：

Git 以行（line）為單位比對差異，只有「兩人同時修改同一行」才需手動解衝突。本系統的分工天然避開高衝突情境：

| 成員 | 主要寫入行為 | 衝突風險 |
| :--- | :--- | :--- |
| Claude Code | 產出新文件、大幅修改文件內容 | 低（產出後立即 push） |
| PM | 更新 frontmatter（status/phase）、WBS checkbox | 低 |
| 工程師 / 其他 | 主要讀取，偶爾更新自己負責的 checkbox | 極低 |

---

## 五、新增專案時的操作流程

```bash
# Step 1：Clone 新專案到 Vault
cd ~/ObsidianVault/_Projects/
git clone https://github.com/your-org/new-project.git NewProject

# Step 2：確認 .git 目錄存在
ls -la NewProject/

# Step 3：在 Obsidian 中重新整理 Vault
# Ctrl+Shift+P → 搜尋 "Reload Vault"
# 外掛會自動偵測新目錄並納入同步範圍
```

---

## 六、已知限制

| 限制 | 說明 | 緩解方式 |
| :--- | :--- | :--- |
| **Obsidian 需開啟** | 外掛只在 Obsidian 執行時運作，關閉後不同步 | 開啟 Obsidian 時立即執行一次 pull，補齊離線期間更新 |
| **SSH 認證** | 若 repo 為 private，需設定 SSH Key | 見下方 SSH 設定說明 |
| **衝突需手動解** | 同一行同時被修改時需人工介入 | 依照分工規則，實務上極少發生 |

---

## 七、SSH Key 設定（Private Repo 必要）

```bash
# 生成 SSH Key
ssh-keygen -t ed25519 -C "your-email@example.com"

# 複製公鑰
cat ~/.ssh/id_ed25519.pub

# 貼到 GitHub → Settings → SSH and GPG Keys → New SSH Key

# 測試連線
ssh -T git@github.com

# 更新現有 repo 使用 SSH（而非 HTTPS）
git -C ~/ObsidianVault/_Projects/ProjectA remote set-url origin git@github.com:your-org/project-a.git
```

---

**文件版本**：v1.1
**最後更新**：2026-04-29
**狀態**：草稿（Draft）
