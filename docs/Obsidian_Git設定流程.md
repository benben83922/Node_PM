---
project: Node_PM
doc_type: Other
status: draft
phase: planning
priority: high
owner: PM
updated: 2026-05-06
tags: [obsidian, git-submodule, sparse-checkout, sync, local-first]
---

# Obsidian Vault 設定流程｜Local-First 多專案管理

**版本**：v1.0  
**文件類型**：設定流程指南  
**前置依賴**：GitHub同步系統設計規格書.md、Obsidian儀表板設計規格書.md

**目標**：在 Obsidian 中以 Local-First 方式管理多個獨立 GitHub 專案，側邊欄僅顯示 `.md` 筆記，並維持每分鐘自動同步。

---

## 架構設計原則

```
GitHub Repos（各自獨立）
        ↓  git submodule
Obsidian Vault 根目錄（父儲存庫）
        ↓  sparse-checkout（僅 .md）
Obsidian 側邊欄：只見筆記，不見程式碼
        ↓  Obsidian Git Plugin（auto pull 1 分鐘）
PM 端永遠同步到最新文件
```

**為何用 submodule 而非直接 clone？**  
每個專案 Repo 保持獨立版控，Vault 只是「聚合視圖」。開發者繼續在自己的 Repo 工作，PM 端自動接收最新 `.md`。

---

## 階段一：建立 Vault 根目錄父儲存庫

Obsidian Git 套件需偵測到根目錄的 `.git` 資料夾才能運作。

```bash
# 進入 Obsidian Vault 根目錄
cd ~/ObsidianVault

# 初始化父儲存庫
git init
```

接著將每個獨立專案加入為 submodule：

```bash
# 語法：git submodule add <遠端倉庫網址> <本地資料夾名稱>
git submodule add https://github.com/your-org/project-a ProjectA
git submodule add https://github.com/your-org/project-b ProjectB
git submodule add https://github.com/your-org/node-pm Node_PM
```

完成後目錄結構：

```
~/ObsidianVault/
├── .git/
├── .gitmodules
├── ProjectA/          ← submodule（指向 ProjectA Repo）
├── ProjectB/          ← submodule（指向 ProjectB Repo）
└── Node_PM/           ← submodule（指向 Node_PM Repo）
```

---

## 階段二：設定稀疏檢出（Sparse Checkout）

讓 Obsidian 側邊欄**只顯示 `.md` 檔案**，過濾掉所有程式碼、設定檔等。

**一次性對所有 submodule 套用：**

```bash
# 進入每個 submodule，開啟稀疏檢出並設定只顯示 .md 與必要 Git 設定檔
git submodule foreach 'git sparse-checkout init --cone && git sparse-checkout set "/**/*.md" ".gitignore" ".gitmodules"'

# 套用生效
git submodule foreach 'git sparse-checkout reapply'
```

**驗證：**

```bash
# 進入任一 submodule 確認只剩 .md 相關檔案
cd ProjectA
ls
# 應只見到 .md 文件，不見 .py/.js/.env 等程式碼
```

---

## 階段三：Obsidian Git 套件設定

在 Obsidian 中：`Settings → Community Plugins → Obsidian Git → Options`

### Advanced 區塊（最重要）

| 設定項 | 值 | 說明 |
| :--- | :--- | :--- |
| `Update submodules` | **On** | 必須開啟，否則套件不會抓 submodule 內的變動 |

> 設定完成後點擊下方 **`Reload`** 按鈕，確認出現「Git is ready」字樣。

### Backup 區塊（自動同步）

| 設定項 | 值 | 說明 |
| :--- | :--- | :--- |
| `Auto pull interval (minutes)` | `1` | 每 1 分鐘自動 pull |
| `Pull updates on startup` | **On** | 啟動時立即補齊離線期間的更新 |

### Miscellaneous 區塊（減少干擾）

| 設定項 | 值 | 說明 |
| :--- | :--- | :--- |
| `Disable informative notifications` | **On** | 關閉每分鐘同步的彈窗通知 |
| `Hide notifications for no changes` | **On** | 無更新時不顯示通知 |

---

## 階段四：雙軌工作流

設定完成後，同一個 Repo 在本機有兩個獨立資料夾，各司其職：

| 資料夾 | 內容 | 設定 | 使用情境 |
| :--- | :--- | :--- | :--- |
| **開發資料夾**（如 `~/Projects/ProjectA`） | 所有檔案（.py/.js/.env/.md...） | 完整 Clone | 撰寫程式碼、執行專案 |
| **Obsidian Vault**（如 `~/ObsidianVault/ProjectA`） | 僅 `.md` 檔案 | Sparse Checkout | 查看文件、建立雙向連結、Dataview 查詢 |

### 日常工作流程

```
工程師/PM 在開發資料夾修改 .md 或程式碼
        ↓
git push → GitHub
        ↓
Obsidian Git Plugin 每 1 分鐘 auto pull
        ↓
Obsidian Vault 自動更新（只拉 .md，忽略程式碼）
        ↓
PM 在 Obsidian 看到最新文件，無需手動操作
```

---

## 驗收標準

| 項目 | 驗收條件 |
| :--- | :--- |
| Submodule 設定 | `git submodule status` 顯示所有 submodule 已初始化（無 `-` 前綴） |
| 稀疏檢出 | Obsidian 側邊欄中各專案資料夾只顯示 `.md` 文件 |
| 自動同步 | git push 後，Obsidian Vault 在 1 分鐘內自動更新對應 `.md` |
| 無干擾通知 | 同步時無彈窗打斷 |
| 獨立工作流 | 開發資料夾（完整 Clone）與 Vault（Sparse）各自獨立，互不干擾 |

---

**文件版本**：v1.0  
**最後更新**：2026-05-06  
**狀態**：草稿（Draft）
