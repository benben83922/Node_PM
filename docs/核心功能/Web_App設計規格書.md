---
project: Node_PM
doc_type: FeatureSpec
status: draft
phase: planning
priority: high
owner: PM
updated: 2026-05-06
tags: [web-app, react, dashboard]
---

# Web App｜設計規格書

**版本**：v1.0
**文件類型**：核心功能規格
**前置依賴**：Supabase_Schema設計規格書.md

---

## 一、功能定位

Web App 是本系統對外的**團隊共用進度儀表板**，讓 PM、工程師、客戶三種角色在瀏覽器中查看各自所需的專案進度資訊，資料來源為 Supabase。

| 工具 | 定位 | 對象 |
| :--- | :--- | :--- |
| **Obsidian** | 個人知識庫（開發文件、知識文件閱讀與連結） | PM 個人 |
| **Web App** | 團隊共用進度儀表板 | PM、工程師、客戶 |

兩者定位不同，互不取代。

---

## 二、技術棧

| 分類 | 選用技術 | 選擇理由 |
| :--- | :--- | :--- |
| **前端框架** | React | 生態成熟，Supabase SDK 完整支援 |
| **資料來源** | Supabase（PostgreSQL + RLS） | 即時訂閱、RBAC、Auth 一體整合 |
| **即時更新** | Supabase Realtime | GitHub Actions 寫入後前端自動刷新 |
| **認證** | Supabase Auth（Google OAuth + Email） | 方便外部客戶用 Google 帳號登入 |
| **部署** | Vercel | 與 GitHub 整合，push 自動部署 |
| **圖表** | Recharts | React 生態，支援 S-Curve / CFD / 燃盡圖 |

---

## 三、三角色 Dashboard 設計

### 3.1 PM（管理者視角）

核心邏輯：異常管理與資源調度。

| 層級 | 頁面名稱 | 核心元件 | 資料來源 |
| :--- | :--- | :--- | :--- |
| **L1** | 專案組合總覽 | 健康度燈號、資源負載熱力圖、本週里程碑倒數 | `projects` + `tasks_sync` 聚合 |
| **L2** | 專案診斷 | S-Curve（計畫 vs 實際）、CFD 累積流量圖、Blockers 清單 | `tasks_sync` + `milestones` |
| **L3** | 任務執行明細 | 任務屬性、負責人、deadline、原始 YAML | `tasks_sync` 單筆 |

**健康度燈號邏輯**：

| 燈號 | 條件 |
| :--- | :--- |
| 🟢 正常 | 無 Blocked 任務，無 overdue deadline |
| 🟡 注意 | 有 overdue 任務，或完成率落後計畫 10% 以內 |
| 🔴 異常 | 有 Blocked 任務，或完成率落後計畫超過 10% |

### 3.2 工程師（執行視角）

核心邏輯：減少雜訊，專注於「流動」。

| 層級 | 頁面名稱 | 核心元件 | 資料來源 |
| :--- | :--- | :--- | :--- |
| **L1** | 今日戰場 | 跨專案個人待辦清單、Sprint 燃盡圖 | `tasks_sync WHERE assignee_email = me` |
| **L2** | 技術上下文 | 專案 Kanban 視圖、關聯文件連結 | `tasks_sync` + `projects` |
| **L3** | 任務詳情 | 任務描述、deadline、關聯 WBS 路徑 | `tasks_sync` 單筆 |

### 3.3 客戶（價值視角）

核心邏輯：確定感與里程碑達成率。

| 層級 | 頁面名稱 | 核心元件 | 資料來源 |
| :--- | :--- | :--- | :--- |
| **L1** | 交付摘要 | 里程碑時間軸、功能完成率圓環、AI 週報摘要 | `milestones` + `tasks_sync` 聚合 |
| **L2** | 功能路徑圖 | Roadmap 時間軸、預計 Demo 日期、風險說明 | `milestones` |

---

## 四、RBAC 實作

### 4.1 角色權限矩陣

| 角色 | 可見專案 | 可見層級 | 寫入權限 |
| :--- | :--- | :--- | :--- |
| **Admin（PM）** | 所有專案 | L1、L2、L3（完整） | 可管理成員與角色 |
| **Developer（工程師）** | 被分配的專案 | L1、L2、L3（技術） | 無（唯讀） |
| **Viewer（客戶）** | 被分配的專案 | L1、L2（摘要） | 無（唯讀） |

### 4.2 登入流程

```
使用者進入 Web App
    ↓
Supabase Auth（Google OAuth 或 Email）
    ↓
auth.users UUID 對應 profiles 表
    ↓
查詢 project_access 取得可存取專案與角色
    ↓
依角色渲染對應 Dashboard
```

---

## 五、即時更新設計

使用 Supabase Realtime 訂閱，GitHub Actions 寫入後前端自動刷新：

```javascript
const subscription = supabase
  .channel('tasks-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'tasks_sync',
    filter: `project_id=eq.${projectId}`
  }, () => refreshDashboard())
  .subscribe();
```

---

## 六、進度計算邏輯

Web App 從 `tasks_sync` 動態計算，不依賴靜態欄位：

```javascript
async function getProjectProgress(projectId) {
  const { data } = await supabase
    .from('tasks_sync')
    .select('status')
    .eq('project_id', projectId);
  const total = data.length;
  const done = data.filter(t => t.status === 'Done').length;
  return total > 0 ? Math.round((done / total) * 100) : 0;
}
```

---

**文件版本**：v1.0
**最後更新**：2026-05-06
**狀態**：草稿（Draft）
