# Node PM 三角色操作指南

## 角色說明

| 角色 | 身分 | 預設路由 |
|------|------|----------|
| admin | PM / 專案管理員 | `/pm` |
| developer | 工程師 | `/engineer` |
| viewer | 客戶 / 外部關係人 | `/client` |

---

## 登入流程

1. 前往 `https://<your-domain>/login`
2. 選擇登入方式：
   - **Google 帳號**：點擊「以 Google 登入」
   - **Magic Link**：輸入 Email → 收信 → 點擊連結
3. 登入後自動依角色導向對應儀表板

> 注意：Magic Link 每小時上限 3 次。

---

## PM（admin）操作

### L1 — 專案總覽 (`/pm`)

- 選擇專案（右上角下拉）
- 查看整體進度圓環、健康狀態徽章、逾期任務數
- S 曲線顯示計畫 vs. 實際進度
- 卡關任務清單（紅色標示）

### L2 — 里程碑詳情 (`/pm/:projectId/milestones`)

- 各里程碑完成率與倒數天數
- 逾期里程碑以紅色標示

### L3 — 任務清單 (`/pm/:projectId/tasks`)

- 完整任務表格：ID、標題、狀態、負責人、截止日
- 卡關任務列底色為紅色

---

## 工程師（developer）操作

### L1 — 儀表板 (`/engineer`)

- 選擇專案
- KPI 卡片：我的完成率 / 卡關數 / 逾期數
- 全專案燃盡圖（根據所有任務截止日計算）
- 我的任務看板（四欄：待辦 / 進行中 / 完成 / 卡關）

### L2 — 我的任務詳情 (`/engineer/:projectId`)

- 篩選後的個人任務列表

---

## 客戶（viewer）操作

### L1 — 進度報告 (`/client`)

- 選擇專案
- 完成率圓餅圖（Done vs. 未完成）
- 里程碑時間軸（依日期排序，標示剩餘天數）

### L2 — 里程碑詳情 (`/client/:projectId`)

- 里程碑卡片清單，顯示整體進度條

> 客戶角色**無法**存取 L3 任務細節（RLS + RoleGuard 雙層保護）。

---

## 管理員操作（Supabase）

### 新增使用者

1. Supabase Dashboard → Authentication → Users → Invite user
2. 或由使用者自行以 Magic Link / Google 登入

### 設定角色

在 Supabase SQL Editor 執行：

```sql
-- 為使用者指派角色（project_access 表）
INSERT INTO project_access (user_id, project_id, role)
VALUES ('<user-uuid>', '<project-uuid>', 'developer');
-- role: 'admin' | 'developer' | 'viewer'
```

### 更新 WBS 資料

推送包含 `WBS.md` 修改的 commit 至 `main`，GitHub Actions 自動同步至 Supabase。

---

## 常見問題

**Q: 登入後顯示空白頁？**
A: 該帳號尚未在 `project_access` 表設定角色，請聯繫管理員。

**Q: 任務資料未更新？**
A: 確認最近的 push 是否包含 `WBS.md` 變更，並檢查 GitHub Actions 執行狀態。

**Q: Magic Link 收不到信？**
A: 檢查垃圾郵件匣；若已超過每小時 3 次限制，請稍後再試。
