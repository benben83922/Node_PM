# OpenClaw 自然語言查詢｜設計規格書

**版本**：v1.0
**文件類型**：核心功能規格
**前置依賴**：文件規範_YAML設計規格書.md、GitHub同步系統設計規格書.md

---

## 一、功能定位

### 1.1 核心問題

Web App 解決了「預設視圖」的問題——PM 打開 L1 儀表板就能看到全局狀態。但當問題是**臨時的、未預設的**時，Web App 的結構化視圖就不夠用了：

- 「ProjectA 的里程碑託管模組現在依賴哪些後端任務？」
- 「ERD 裡的 Dispute 實體有哪些欄位？」
- 「這個專案的金流整合風險具體是什麼？」

這類問題需要**深入閱讀文件正文**，而不只是查 frontmatter。PM 不可能每次都手動開文件翻找。

### 1.2 解決方案

**OpenClaw** 作為本地知識庫 AI 助手，連接 Obsidian Vault 目錄，讓 PM 能透過常用的通訊頻道（Telegram、Slack 等）用自然語言中文提問，OpenClaw 讀取相關 `.md` 文件後回答。

```
PM 用 Telegram / Slack 提問
        ↓
OpenClaw 收到問題
        ↓
OpenClaw 搜索 ~/ObsidianVault/_Projects/ 目錄
        ↓
讀取相關 .md 文件（frontmatter + 正文）
        ↓
LLM 整理後回答，標明來源文件
```

---

## 二、問題類型分類

### 2.1 可回答的問題類型

| 問題類型 | 範例 | OpenClaw 查找目標 |
| :--- | :--- | :--- |
| **專案進度查詢** | 「ProjectA 現在到哪個 phase 了？」 | 該專案所有文件的 `phase` frontmatter |
| **文件狀態查詢** | 「哪些文件還在草稿？」 | 所有 `status = draft` 的文件 |
| **風險查詢** | 「目前最高風險是什麼？」 | WBS、PRD 中的風險章節 |
| **技術細節查詢** | 「ERD 裡有哪些主要實體？」 | ERD.md 文件正文 |
| **待決問題** | 「哪些 open questions 還沒決定？」 | PRD 的 Open Questions 章節 |
| **任務依賴** | 「里程碑模組依賴哪些後端任務？」 | WBS.md 的依賴關係欄位 |
| **規格查詢** | 「登入 API 的 endpoint 是什麼？」 | API_Specification.md |
| **架構查詢** | 「系統使用什麼技術棧？」 | Architecture.md 的技術選型章節 |

### 2.2 OpenClaw 無法（或不應）回答的問題

| 問題類型 | 原因 | 建議替代方案 |
| :--- | :--- | :--- |
| 即時進度（需工程師更新） | 文件可能還沒同步最新狀態 | 確認 sync.log 後再問 |
| 程式碼層面的 bug | 文件沒有記錄這類資訊 | 直接看 GitHub Issues |
| 未記錄在文件的口頭決策 | 知識庫只有 .md 文件 | 補充進文件後再問 |

---

## 三、System Prompt 設計

### 3.1 基礎 System Prompt（通用版）

```
你是我的專案管理 AI 助理，負責幫助我快速掌握多個並行軟體專案的狀態。

【知識庫結構】
我的所有專案文件儲存在本地目錄 ~/ObsidianVault/_Projects/，
每個子目錄對應一個專案（如 _Projects/ProjectA/、ProjectAlpha/）。
每份 .md 文件頂部含有 YAML Frontmatter，結構如下：
  project: 專案名稱
  doc_type: 文件類型（PRD / ERD / Architecture / WBS / API / BDD 等）
  status: 文件狀態（draft / in-review / approved / deprecated）
  phase: 專案階段（planning / dev / testing / done / blocked）
  priority: 優先度（critical / high / medium / low）
  owner: 負責人
  updated: 最後更新日期

【回答規則】
1. 回答時必須標明資料來源（文件名稱 + updated 日期）
2. 若問題涉及多份文件，依重要性排列說明
3. 全程使用繁體中文
4. 若文件 updated 日期超過 30 天，主動提醒資料可能過時
5. 若在文件中找不到相關資訊，直接告知「文件中無此資訊」，不要猜測

【進度狀態判讀】
- phase = planning → 規劃中，尚未開始開發
- phase = dev → 開發進行中
- phase = testing → 測試階段
- phase = done → 已完成
- phase = blocked → 被阻塞，需要關注

【優先度判讀】
- priority = critical → 最高風險，阻塞其他任務
- priority = high → 需要優先處理
- priority = medium → 正常排程
- priority = low → 可延後處理

【常見問題對應指引】
- 問進度 → 查對應專案所有文件的 phase 欄位
- 問風險 → 找 WBS 或 PRD 中的風險矩陣章節
- 問技術 → 找 Architecture.md 的技術選型區段
- 問 API → 找 API_Specification.md
- 問資料庫 → 找 ERD.md
- 問待辦 → 找 PRD 的 Open Questions 章節
```

### 3.2 回答格式範本

OpenClaw 的回答應遵循以下格式：

```
【問題摘要】你詢問的是 ProjectA 專案的里程碑模組狀態。

【回答】
根據 ProjectA_WBS.md（updated: 2026-02-01）：

里程碑模組（3.4 里程碑託管模組）目前狀態：
- 📌 週期：Week 3-4
- 📋 任務清單：
  - 3.4.1 Milestone 資料模型實作：⬜ 未開始
  - 3.4.2 里程碑 CRUD API：⬜ 未開始
  - 3.4.3 里程碑狀態機：⬜ 未開始
  - 3.4.4 驗收標準強制機制：⬜ 未開始
  - 3.4.5 超時自動處理邏輯：⬜ 未開始

【注意】文件 updated 日期為 2026-02-01，距今已超過 30 天，
實際進度可能已有更新，建議確認工程師端的最新狀態。

【來源】ProjectA_WBS.md（updated: 2026-02-01）
```

---

## 四、測試問題集

### 4.1 標準測試問題（10 題）

在正式使用前，用以下問題測試 OpenClaw 的回答品質：

| # | 問題 | 預期答案來源 | 合格判定 |
| :--- | :--- | :--- | :--- |
| 1 | 「ProjectA 現在到哪個 phase？」 | 所有 ProjectA 文件的 `phase` 欄位 | 回答 `planning` 且標明多份來源 |
| 2 | 「ProjectA 最高風險是什麼？」 | ProjectA_WBS / 策略分析 風險章節 | 提到金流整合（R-01）|
| 3 | 「ERD 有哪些主要實體？」 | ProjectA_ERD.md | 列出至少 5 個實體 |
| 4 | 「哪些文件還是草稿？」 | 所有文件 `status = draft` | 列出全部 draft 文件 |
| 5 | 「登入 API endpoint 是什麼？」 | ProjectA_API_Specification.md | 回答 `POST /api/auth/login` |
| 6 | 「技術棧是什麼？」 | ProjectA_Architecture.md | 提到 Next.js / Node.js / PostgreSQL |
| 7 | 「M1 里程碑什麼時候交付？」 | ProjectA_WBS 里程碑章節 | 回答 Week 2 |
| 8 | 「金流用哪個服務商？」 | Architecture ADR-005 | 回答藍新金流，狀態待驗證 |
| 9 | 「有哪些 open questions 還沒決定？」 | ProjectA_PRD Open Questions 章節 | 列出未決問題清單 |
| 10 | 「系統的北極星指標是什麼？」 | ProjectA_PRD / 策略分析 | 回答核心成效指標 |

### 4.2 合格標準

- 10 題中答對 **9 題以上**（90%）：系統可以正式投入使用
- 答對 **7-8 題**：調整 System Prompt 後重測
- 答對 **6 題以下**：重新設定知識庫目錄路徑，確認文件讀取正常

---

## 五、設定步驟

### 5.1 OpenClaw 知識庫設定

```
# 在 OpenClaw 設定介面中：
知識庫目錄：~/ObsidianVault/
檔案類型：.md
遞迴掃描：開啟
排除目錄：.git/
```

> OpenClaw 索引整個 Vault（含 `_Projects/` 下的專案文件與其他知識文件），可回答跨越專案進度與個人知識庫的問題。

### 5.2 通訊頻道設定

OpenClaw 支援多種頻道，選擇你最常用的一種：

| 頻道 | 適用場景 | 設定複雜度 |
| :--- | :--- | :--- |
| **Telegram Bot** | 隨時隨地提問，手機也能用 | 低 |
| **Slack** | 已在 Slack 工作環境中 | 低 |
| **Discord** | 工程師團隊也在 Discord | 低 |
| **LINE** | 台灣慣用通訊工具 | 中 |
| **本地 CLI** | 只在電腦上使用 | 最低 |

### 5.3 System Prompt 套入

在 OpenClaw 的設定介面中，將第三節的 System Prompt 貼入「角色設定」或「系統指令」欄位。

---

## 六、進階用法

### 6.1 跨專案比較

```
PM 提問：「ProjectA 和 ProjectB 都到 dev phase 了嗎？」

OpenClaw 查詢兩個專案目錄的文件 phase 欄位，
比較後回答：
「ProjectA 目前是 planning phase，ProjectAlpha 已進入 dev phase。」
```

### 6.2 週報生成

```
PM 提問：「幫我整理本週各專案的狀態，用條列式」

OpenClaw 掃描所有專案最近 7 天更新的文件，
整理成週報格式回答。
```

### 6.3 待辦確認

```
PM 提問：「今天我需要優先處理哪些事？」

OpenClaw 查找所有 priority = critical 且 status != approved 的文件，
列出需要立即處理的事項。
```

---

## 七、已知限制

| 限制 | 說明 | 緩解方式 |
| :--- | :--- | :--- |
| **文件同步延遲** | OpenClaw 讀取的是本地 Vault 的狀態，同步延遲取決於 Obsidian Git Plugin（通常 ≤ 1 分鐘） | 確認 Obsidian 已開啟且 Git Plugin 已 pull 到最新版本後再提問 |
| **大型文件可能被截斷** | 超過 context window 的文件只能讀取部分內容 | 把超大文件（如 ERD）按 bounded context 拆分 |
| **口頭決策不在知識庫** | 沒有記錄進 .md 的口頭決策，OpenClaw 不知道 | 養成把重要決策補入文件的習慣 |
| **程式碼內容** | OpenClaw 不讀取 .ts / .py 等程式碼檔案 | 只用於查詢文件層面的資訊 |

---

**文件版本**：v1.0
**最後更新**：2026-04-25
**狀態**：草稿（Draft）
