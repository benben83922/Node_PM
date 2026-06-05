---
project: Node_PM
doc_type: ModuleSpec
status: draft
phase: planning
priority: high
owner: PM
updated: 2026-06-05
tags: [web-app, tdd, dbc, unit-test, module-spec]
---

# 模組規格與測試案例 (Module Specification & Test Cases) - Node_PM Web App

---

**文件版本 (Document Version):** `v1.0`
**最後更新 (Last Updated):** `2026-06-05`
**主要作者 (Lead Author):** `PM`
**審核者 (Reviewers):** `技術負責人`
**狀態 (Status):** `草稿 (Draft)`
**對應架構文件:** `Web_App_Architecture.md`
**對應 BDD 文件:** `Web_App_BDD.md`
**對應 API 文件:** `Web_App_API_Specification.md`

---

## 目錄 (Table of Contents)

- [目的](#目的)
- [模組 1: `lib/progressCalc.js` — 進度計算](#模組-1-libprogresscalcjs--進度計算)
- [模組 2: `lib/healthCalc.js` — 健康度計算](#模組-2-libhealthcalcjs--健康度計算)
- [模組 3: `lib/sCurveInterpolation.js` — S-Curve 計畫線插值](#模組-3-libscurveinterpolationjs--s-curve-計畫線插值)
- [模組 4: `lib/taskFilters.js` — 任務過濾工具](#模組-4-libtaskfiltersjs--任務過濾工具)
- [模組 5: `components/RoleGuard.jsx` — RBAC 路由守衛](#模組-5-componentsroleguardjsx--rbac-路由守衛)
- [模組 6: `hooks/useAuth.js` — 認證 Hook](#模組-6-hooksuseasthjs--認證-hook)
- [測試執行指南](#測試執行指南)
- [附錄: TDD LLM Prompting Guide](#附錄-tdd-llm-prompting-guide)

---

## 目的

本文件將 `Web_App_BDD.md` 中的高層次 Gherkin Feature 分解到具體的**模組/函式層級**，使用契約式設計（Design by Contract, DbC）定義每個函式的職責邊界，並提供可直接驅動 TDD 實踐的測試案例規格。

**Clean Architecture 層級對應：**

| 層 | 目錄 | 可測試性 | 本文件涵蓋 |
| :--- | :--- | :--- | :--- |
| Domain（純函式） | `src/lib/` | 最高（零依賴，純輸入→輸出） | ✅ 模組 1–4 |
| Application（Hooks） | `src/hooks/` | 中（需 mock Supabase SDK） | ✅ 模組 6 |
| Infrastructure（SDK） | `src/lib/supabaseClient.js` | 低（整合測試） | 由 API Spec 文件涵蓋 |
| Presentation（元件） | `src/components/` `src/pages/` | 中（UI 渲染測試） | ✅ 模組 5 |

---

## 模組 1: `lib/progressCalc.js` — 進度計算

**對應架構文件:** `Web_App_Architecture.md#Domain-Layer`
**對應 BDD Feature:** `Web_App_BDD.md#Feature-10-進度計算`

**模組目的：** 根據任務清單動態計算完成率百分比，為 PM L1 健康度、客戶 L1 圓環、S-Curve 實際線提供底層計算。

---

### 規格 1: `calcProgress(tasks)`

**描述：** 接收任務物件陣列，回傳整數百分比（0–100）。`status === 'Done'` 的任務計為已完成；其他狀態（`Todo`、`Doing`、`Blocked`）計為未完成。

**函式簽名：**
```javascript
// src/lib/progressCalc.js
export function calcProgress(tasks: Task[]): number
```

**契約式設計 (DbC)：**

- **前置條件 (Preconditions)：**
  1. `tasks` 必須為陣列（`Array.isArray(tasks) === true`）
  2. 陣列中每個元素必須含有 `status` 欄位（字串型別）
  3. `tasks` 可為空陣列（長度 0）

- **後置條件 (Postconditions)：**
  1. 回傳值必須為整數（`Number.isInteger(result) === true`）
  2. 回傳值範圍為 `[0, 100]`（inclusive）
  3. 當 `tasks.length === 0` 時，回傳 `0`
  4. 當所有任務 `status === 'Done'` 時，回傳 `100`
  5. 回傳值等於 `Math.round(doneCount / tasks.length * 100)`

- **不變性 (Invariants)：**
  1. 函式不修改輸入陣列（pure function，無副作用）
  2. 函式不依賴外部狀態或日期

**實作參考：**
```javascript
export function calcProgress(tasks) {
  if (!tasks.length) return 0
  const done = tasks.filter(t => t.status === 'Done').length
  return Math.round((done / tasks.length) * 100)
}
```

---

### 測試情境與案例 (Test Scenarios & Cases)

#### 情境 1: 正常路徑 (Happy Path)

- **測試案例 ID:** `TC-PC-001`
- **描述:** 混合狀態任務，計算四捨五入後的完成率
- **對應 BDD Scenario:** `Feature 10, Scenario: 正常完成率計算`
- **測試步驟 (Arrange-Act-Assert):**
  1. **Arrange:** 建立 3 筆任務陣列：`[{status:'Done'}, {status:'Todo'}, {status:'Todo'}]`
  2. **Act:** 呼叫 `calcProgress(tasks)`
  3. **Assert:** 回傳值等於 `33`（`Math.round(1/3*100)`）

---

- **測試案例 ID:** `TC-PC-002`
- **描述:** 所有任務已完成，應回傳 100
- **對應 BDD Scenario:** `Feature 10, Scenario Outline: tasks=3/3`
- **測試步驟:**
  1. **Arrange:** `[{status:'Done'}, {status:'Done'}, {status:'Done'}]`
  2. **Act:** `calcProgress(tasks)`
  3. **Assert:** 回傳值等於 `100`

---

#### 情境 2: 邊界情況 (Edge Case)

- **測試案例 ID:** `TC-PC-003`
- **描述:** 空陣列應回傳 0，避免除以零
- **對應 BDD Scenario:** `Feature 10, Scenario Outline: tasks=0/0`
- **測試步驟:**
  1. **Arrange:** `[]`（空陣列）
  2. **Act:** `calcProgress([])`
  3. **Assert:** 回傳值等於 `0`

---

- **測試案例 ID:** `TC-PC-004`
- **描述:** 無任何完成任務，回傳 0
- **對應 BDD Scenario:** `Feature 10, Scenario Outline: tasks=0/3`
- **測試步驟:**
  1. **Arrange:** `[{status:'Todo'}, {status:'Doing'}, {status:'Blocked'}]`
  2. **Act:** `calcProgress(tasks)`
  3. **Assert:** 回傳值等於 `0`

---

#### 情境 3: 業務規則 (Business Rule)

- **測試案例 ID:** `TC-PC-005`
- **描述:** `Blocked` 狀態不計入完成，確認只有 `Done` 才計數
- **測試步驟:**
  1. **Arrange:** `[{status:'Done'}, {status:'Blocked'}, {status:'Blocked'}]`
  2. **Act:** `calcProgress(tasks)`
  3. **Assert:** 回傳值等於 `33`（`Math.round(1/3*100)`），而非 `100`

---

- **測試案例 ID:** `TC-PC-006`
- **描述:** 純函式特性驗證：呼叫後輸入陣列不被修改
- **測試步驟:**
  1. **Arrange:** `const tasks = [{status:'Done'}, {status:'Todo'}]`
  2. **Act:** `calcProgress(tasks)`
  3. **Assert:** `tasks.length === 2` 且 `tasks[0].status === 'Done'`（陣列未被修改）

---

## 模組 2: `lib/healthCalc.js` — 健康度計算

**對應架構文件:** `Web_App_Architecture.md#Domain-Layer`
**對應 BDD Feature:** `Web_App_BDD.md#Feature-3-PM-L1-專案組合總覽`

**模組目的：** 根據任務清單與今日日期計算專案健康度狀態（`'normal'` / `'warning'` / `'critical'`），用於 PM L1 健康度燈號渲染。

---

### 規格 1: `calcHealth(tasks, today)`

**描述：** 接收任務陣列與今日日期，依照優先序規則回傳健康度狀態字串。Blocked 優先於 overdue 判斷。

**函式簽名：**
```javascript
// src/lib/healthCalc.js
export function calcHealth(tasks: Task[], today?: Date): HealthStatus
// HealthStatus = 'normal' | 'warning' | 'critical'
```

**契約式設計 (DbC)：**

- **前置條件 (Preconditions)：**
  1. `tasks` 必須為陣列
  2. 每個任務元素須含 `status`（字串）、`deadline`（字串 `YYYY-MM-DD` 或 `null`）
  3. `today` 若省略，使用 `new Date()`；測試時必須傳入固定日期以保證冪等性

- **後置條件 (Postconditions)：**
  1. 回傳值必須為 `'normal'`、`'warning'`、`'critical'` 三者之一
  2. 若任何任務 `status === 'Blocked'`，必定回傳 `'critical'`（最高優先）
  3. 若無 Blocked 但有 `deadline < today AND status !== 'Done'`，回傳 `'warning'`
  4. 若無 Blocked 且無 overdue，回傳 `'normal'`
  5. `status === 'Done'` 的任務即使 `deadline` 已過，不計入 overdue

- **不變性 (Invariants)：**
  1. 純函式，不修改輸入陣列
  2. 判斷優先序固定：`critical > warning > normal`

**實作參考：**
```javascript
export function calcHealth(tasks, today = new Date()) {
  const hasBlocked = tasks.some(t => t.status === 'Blocked')
  if (hasBlocked) return 'critical'
  const hasOverdue = tasks.some(t =>
    t.deadline &&
    new Date(t.deadline) < today &&
    t.status !== 'Done'
  )
  if (hasOverdue) return 'warning'
  return 'normal'
}
```

---

### 測試情境與案例 (Test Scenarios & Cases)

> **測試慣例：** 所有含 deadline 的測試案例固定傳入 `today = new Date('2026-06-05')`，避免測試結果隨日期漂移。

#### 情境 1: 正常路徑 (Happy Path) — 三種燈號

- **測試案例 ID:** `TC-HC-001`
- **描述:** 無 Blocked、無 overdue → 🟢 normal
- **對應 BDD Scenario:** `Feature 3, Scenario: 顯示健康度為 🟢 正常的專案`
- **測試步驟:**
  1. **Arrange:** `tasks = [{status:'Todo', deadline:'2026-06-10'}, {status:'Done', deadline:'2026-05-01'}]`，`today = new Date('2026-06-05')`
  2. **Act:** `calcHealth(tasks, today)`
  3. **Assert:** 回傳 `'normal'`

---

- **測試案例 ID:** `TC-HC-002`
- **描述:** 無 Blocked，但有 deadline 已過的未完成任務 → 🟡 warning
- **對應 BDD Scenario:** `Feature 3, Scenario: 顯示健康度為 🟡 注意的專案`
- **測試步驟:**
  1. **Arrange:** `tasks = [{status:'Todo', deadline:'2026-05-01'}, {status:'Todo', deadline:'2026-06-10'}]`，`today = new Date('2026-06-05')`
  2. **Act:** `calcHealth(tasks, today)`
  3. **Assert:** 回傳 `'warning'`

---

- **測試案例 ID:** `TC-HC-003`
- **描述:** 有 Blocked 任務（無論是否有 overdue）→ 🔴 critical
- **對應 BDD Scenario:** `Feature 3, Scenario: 顯示健康度為 🔴 異常的專案`
- **測試步驟:**
  1. **Arrange:** `tasks = [{status:'Blocked', deadline:null}, {status:'Todo', deadline:'2026-06-10'}]`，`today = new Date('2026-06-05')`
  2. **Act:** `calcHealth(tasks, today)`
  3. **Assert:** 回傳 `'critical'`

---

#### 情境 2: 邊界情況 (Edge Case)

- **測試案例 ID:** `TC-HC-004`
- **描述:** 已完成任務即使 deadline 已過，不影響健康度
- **測試步驟:**
  1. **Arrange:** `tasks = [{status:'Done', deadline:'2026-01-01'}]`，`today = new Date('2026-06-05')`（deadline 早於 today 5 個月）
  2. **Act:** `calcHealth(tasks, today)`
  3. **Assert:** 回傳 `'normal'`（Done 任務不計入 overdue）

---

- **測試案例 ID:** `TC-HC-005`
- **描述:** 空陣列 → 回傳 normal（無任何異常）
- **測試步驟:**
  1. **Arrange:** `tasks = []`，`today = new Date('2026-06-05')`
  2. **Act:** `calcHealth([], today)`
  3. **Assert:** 回傳 `'normal'`

---

#### 情境 3: 業務規則 (Business Rule) — Blocked 優先

- **測試案例 ID:** `TC-HC-006`
- **描述:** 同時有 Blocked 和 overdue → critical（Blocked 優先）
- **測試步驟:**
  1. **Arrange:** `tasks = [{status:'Blocked', deadline:null}, {status:'Todo', deadline:'2026-05-01'}]`，`today = new Date('2026-06-05')`
  2. **Act:** `calcHealth(tasks, today)`
  3. **Assert:** 回傳 `'critical'`，而非 `'warning'`

---

- **測試案例 ID:** `TC-HC-007`
- **描述:** `deadline === null` 的未完成任務不計入 overdue
- **測試步驟:**
  1. **Arrange:** `tasks = [{status:'Todo', deadline:null}]`，`today = new Date('2026-06-05')`
  2. **Act:** `calcHealth(tasks, today)`
  3. **Assert:** 回傳 `'normal'`

---

## 模組 3: `lib/sCurveInterpolation.js` — S-Curve 計畫線插值

**對應架構文件:** `Web_App_Architecture.md#Domain-Layer`
**對應 BDD Feature:** `Web_App_BDD.md#Feature-4-PM-L2-專案診斷`

**模組目的：** 利用里程碑的 `planned_date` 進行線性插值，計算任意目標日期的「計畫完成率」，生成 S-Curve 計畫線資料點。

---

### 規格 1: `interpolatePlannedRate(milestones, targetDate)`

**描述：** 給定按 `planned_date` 升冪排列的里程碑陣列（每個里程碑對應特定計畫完成率），以及一個目標日期，使用線性插值計算該日期的計畫完成率。

**業務邏輯假設：**
- 第 `i` 個里程碑達成時，計畫完成率 = `(i / total_milestones) * 100`
- 在里程碑區間內以線性插值計算
- 目標日期早於第一個里程碑 → 回傳 `0`
- 目標日期晚於最後一個里程碑 → 回傳 `100`

**函式簽名：**
```javascript
// src/lib/sCurveInterpolation.js
export function interpolatePlannedRate(
  milestones: Milestone[],  // [{planned_date: 'YYYY-MM-DD', ...}]，已按 planned_date 升冪排序
  targetDate: Date
): number  // 0–100，四捨五入整數
```

**契約式設計 (DbC)：**

- **前置條件 (Preconditions)：**
  1. `milestones` 必須為非空陣列（`milestones.length >= 1`）
  2. 每個里程碑元素必須含 `planned_date`（`YYYY-MM-DD` 字串，非 null）
  3. `milestones` 已按 `planned_date` 升冪排序（呼叫端負責排序）
  4. `targetDate` 必須為有效 `Date` 物件

- **後置條件 (Postconditions)：**
  1. 回傳值為 `[0, 100]` 範圍內的整數
  2. `targetDate <= milestones[0].planned_date` → 回傳 `0`
  3. `targetDate >= milestones[last].planned_date` → 回傳 `100`
  4. 在里程碑 `i` 與 `i+1` 之間的日期，回傳值落在 `[rate_i, rate_{i+1}]` 之間

- **不變性 (Invariants)：**
  1. 純函式，不修改里程碑陣列
  2. 回傳值隨 `targetDate` 單調遞增（或不變）

**實作參考：**
```javascript
export function interpolatePlannedRate(milestones, targetDate) {
  const n = milestones.length
  if (!n) return 0
  const dates = milestones.map(m => new Date(m.planned_date))
  const rates = milestones.map((_, i) => Math.round(((i + 1) / n) * 100))

  if (targetDate <= dates[0]) return 0
  if (targetDate >= dates[n - 1]) return 100

  for (let i = 0; i < n - 1; i++) {
    if (targetDate >= dates[i] && targetDate <= dates[i + 1]) {
      const spanMs = dates[i + 1] - dates[i]
      const elapsedMs = targetDate - dates[i]
      const t = elapsedMs / spanMs
      const startRate = i === 0 ? 0 : rates[i - 1]
      return Math.round(startRate + t * (rates[i] - startRate))
    }
  }
  return 100
}
```

---

### 測試情境與案例 (Test Scenarios & Cases)

#### 情境 1: 正常路徑 (Happy Path)

- **測試案例 ID:** `TC-SC-001`
- **描述:** 目標日期剛好在第一個里程碑日期，回傳第一段完成率
- **測試步驟:**
  1. **Arrange:** `milestones = [{planned_date: '2026-05-10'}, {planned_date: '2026-06-20'}]`（2 個里程碑，各代表 50% / 100%）
  2. **Act:** `interpolatePlannedRate(milestones, new Date('2026-05-10'))`
  3. **Assert:** 回傳 `50`

---

- **測試案例 ID:** `TC-SC-002`
- **描述:** 目標日期在兩個里程碑中間（精確中點），線性插值回傳兩者均值
- **測試步驟:**
  1. **Arrange:** `milestones = [{planned_date: '2026-05-10'}, {planned_date: '2026-05-20'}]`
  2. **Act:** `interpolatePlannedRate(milestones, new Date('2026-05-15'))`（精確中點）
  3. **Assert:** 回傳 `25`（0%~50% 中間 = 25%）

---

#### 情境 2: 邊界情況 (Edge Case)

- **測試案例 ID:** `TC-SC-003`
- **描述:** 目標日期早於所有里程碑 → 回傳 0
- **對應 BDD Scenario:** `Feature 4, Scenario: 顯示 S-Curve 計畫與實際進度`（計畫線起點為 0）
- **測試步驟:**
  1. **Arrange:** `milestones = [{planned_date: '2026-06-10'}]`
  2. **Act:** `interpolatePlannedRate(milestones, new Date('2026-01-01'))`（早於里程碑）
  3. **Assert:** 回傳 `0`

---

- **測試案例 ID:** `TC-SC-004`
- **描述:** 目標日期晚於最後一個里程碑 → 回傳 100
- **測試步驟:**
  1. **Arrange:** `milestones = [{planned_date: '2026-05-10'}, {planned_date: '2026-06-20'}]`
  2. **Act:** `interpolatePlannedRate(milestones, new Date('2026-12-31'))`（晚於最後里程碑）
  3. **Assert:** 回傳 `100`

---

---

## 模組 4: `lib/taskFilters.js` — 任務過濾工具

**對應架構文件:** `Web_App_Architecture.md#Domain-Layer`
**對應 BDD Feature:** `Web_App_BDD.md#Feature-4-PM-L2-專案診斷`

**模組目的：** 提供純函式的任務過濾工具，供 `useProjectDiagnosis` Hook 使用，生成 PM L2 頁面的 Overdue 清單與 Blocked 清單。

---

### 規格 1: `filterOverdueTasks(tasks, today)`

**描述：** 過濾出 `deadline < today AND status !== 'Done'` 的任務，並依 `deadline` 升冪排序（最舊的逾期任務排最前）。

**函式簽名：**
```javascript
export function filterOverdueTasks(tasks: Task[], today: Date): Task[]
```

**契約式設計 (DbC)：**

- **前置條件：**
  1. `tasks` 為陣列，每個元素含 `deadline`（字串 `YYYY-MM-DD` 或 `null`）與 `status`（字串）
  2. `today` 為有效 `Date` 物件（測試時須固定日期）

- **後置條件：**
  1. 回傳陣列中的每個任務必須滿足：`deadline < today AND status !== 'Done'`
  2. 回傳陣列按 `deadline` 升冪排序（最早的排最前）
  3. `deadline === null` 的任務不包含於回傳值
  4. 純函式，不修改輸入陣列

---

### 測試情境與案例

#### 情境 1: 正常路徑

- **測試案例 ID:** `TC-TF-001`
- **描述:** 混合任務中過濾出 overdue，按 deadline 升冪排序
- **對應 BDD Scenario:** `Feature 4, Scenario: 顯示 Overdue 任務清單，按 deadline 升冪`
- **測試步驟:**
  1. **Arrange:**
     ```javascript
     const tasks = [
       { id:1, status:'Todo',    deadline:'2026-06-10' },  // 未過期
       { id:2, status:'Todo',    deadline:'2026-05-01' },  // overdue（較早）
       { id:3, status:'Done',    deadline:'2026-04-01' },  // Done → 排除
       { id:4, status:'Doing',   deadline:'2026-05-20' },  // overdue（較晚）
       { id:5, status:'Todo',    deadline: null         },  // 無 deadline → 排除
     ]
     const today = new Date('2026-06-05')
     ```
  2. **Act:** `filterOverdueTasks(tasks, today)`
  3. **Assert:**
     - 回傳陣列長度為 `2`
     - 第一筆 `id === 2`（deadline: 2026-05-01，較早）
     - 第二筆 `id === 4`（deadline: 2026-05-20，較晚）

---

#### 情境 2: 邊界情況

- **測試案例 ID:** `TC-TF-002`
- **描述:** 無任何 overdue 任務時，回傳空陣列
- **測試步驟:**
  1. **Arrange:** `tasks = [{status:'Todo', deadline:'2026-06-10'}]`，`today = new Date('2026-06-05')`
  2. **Act:** `filterOverdueTasks(tasks, today)`
  3. **Assert:** 回傳 `[]`

---

### 規格 2: `filterBlockedTasks(tasks)`

**描述：** 過濾出 `status === 'Blocked'` 的任務，並依 `updated_at` 降冪排序（最近更新的排最前）。

**函式簽名：**
```javascript
export function filterBlockedTasks(tasks: Task[]): Task[]
```

**契約式設計 (DbC)：**

- **前置條件：**
  1. `tasks` 為陣列，每個元素含 `status`（字串）與 `updated_at`（ISO 8601 字串）

- **後置條件：**
  1. 回傳陣列中所有任務 `status === 'Blocked'`
  2. 回傳陣列按 `updated_at` 降冪排序（最新更新排最前）
  3. 純函式，不修改輸入陣列

---

### 測試情境與案例

#### 情境 1: 正常路徑

- **測試案例 ID:** `TC-TF-003`
- **描述:** 過濾 Blocked 任務，按 updated_at 降冪排序
- **對應 BDD Scenario:** `Feature 4, Scenario: 顯示 Blocked 任務清單，按最近更新降冪`
- **測試步驟:**
  1. **Arrange:**
     ```javascript
     const tasks = [
       { id:1, status:'Blocked', updated_at:'2026-06-01T10:00:00Z' },
       { id:2, status:'Todo',    updated_at:'2026-06-04T09:00:00Z' },  // 排除
       { id:3, status:'Blocked', updated_at:'2026-06-04T15:00:00Z' },
     ]
     ```
  2. **Act:** `filterBlockedTasks(tasks)`
  3. **Assert:**
     - 回傳陣列長度為 `2`
     - 第一筆 `id === 3`（updated_at 較晚）
     - 第二筆 `id === 1`（updated_at 較早）

---

#### 情境 2: 邊界情況

- **測試案例 ID:** `TC-TF-004`
- **描述:** 無任何 Blocked 任務時，回傳空陣列
- **測試步驟:**
  1. **Arrange:** `tasks = [{status:'Todo'}, {status:'Done'}]`
  2. **Act:** `filterBlockedTasks(tasks)`
  3. **Assert:** 回傳 `[]`

---

---

## 模組 5: `components/RoleGuard.jsx` — RBAC 路由守衛

**對應架構文件:** `Web_App_Architecture.md#Presentation-Layer`
**對應 BDD Feature:** `Web_App_BDD.md#Feature-2-RBAC-角色存取控制`

**模組目的：** 前端 UI 層的角色守衛元件，根據當前用戶角色決定是否渲染子內容。與 Supabase RLS 形成雙層防護（RLS 為資料庫層，RoleGuard 為 UI 層）。

---

### 規格 1: `<RoleGuard allowedRoles={[...]}>`

**描述：** 接收允許的角色清單，若當前用戶角色在清單內則渲染 `children`；否則渲染 `fallback`（預設為重導向至 `/forbidden`）。

**元件介面：**
```jsx
// src/components/RoleGuard.jsx
function RoleGuard({
  allowedRoles: string[],     // 允許存取的角色清單，例：['admin', 'developer']
  children: ReactNode,
  fallback?: ReactNode        // 預設：<Navigate to="/forbidden" />
}): ReactNode
```

**依賴：**
- `useAuth()` Hook（取得 `currentRole`）
- React Router DOM `<Navigate>` 元件

**契約式設計 (DbC)：**

- **前置條件：**
  1. `allowedRoles` 為非空字串陣列
  2. `useAuth()` 已提供有效的 `currentRole`（`'admin'` / `'developer'` / `'viewer'`）
  3. 元件須在 `<AuthProvider>` 上下文內使用

- **後置條件：**
  1. 若 `allowedRoles.includes(currentRole)` → 渲染 `children`
  2. 若 `!allowedRoles.includes(currentRole)` → 渲染 `fallback`（預設重導向 `/forbidden`）
  3. 未登入狀態（`currentRole === null`）→ 重導向 `/login`

- **不變性：**
  1. `RoleGuard` 本身不發出任何 API 請求（純 UI 守衛）
  2. 不依賴 `service_role` key（安全原則）

---

### 測試情境與案例

> **測試工具建議：** React Testing Library + Vitest，mock `useAuth` Hook

#### 情境 1: 正常路徑 (Happy Path) — 允許存取

- **測試案例 ID:** `TC-RG-001`
- **描述:** Admin 用戶存取 admin 限定頁面，應渲染 children
- **對應 BDD Scenario:** `Feature 2, Scenario: PM 使用 admin 角色管理專案成員`
- **測試步驟:**
  1. **Arrange:**
     ```jsx
     vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ currentRole: 'admin' }) }))
     const { getByText } = render(
       <RoleGuard allowedRoles={['admin']}>
         <div>Admin Content</div>
       </RoleGuard>
     )
     ```
  2. **Act:** 元件渲染
  3. **Assert:** `getByText('Admin Content')` 存在於 DOM

---

- **測試案例 ID:** `TC-RG-002`
- **描述:** Developer 用戶存取 `['admin','developer']` 允許的頁面，應渲染 children
- **對應 BDD Scenario:** `Feature 2, Scenario: 工程師無法存取成員管理`（驗證允許方向）
- **測試步驟:**
  1. **Arrange:** `currentRole = 'developer'`，`allowedRoles = ['admin', 'developer']`
  2. **Act:** 元件渲染
  3. **Assert:** `getByText('Developer Content')` 存在於 DOM

---

#### 情境 2: 存取被拒 (Access Denied)

- **測試案例 ID:** `TC-RG-003`
- **描述:** Viewer 角色嘗試存取 L3 任務詳情（admin/developer 限定）→ 渲染 fallback
- **對應 BDD Scenario:** `Feature 2, Scenario: 客戶（Viewer）無法存取任務詳情 L3`
- **測試步驟:**
  1. **Arrange:** `currentRole = 'viewer'`，`allowedRoles = ['admin', 'developer']`
  2. **Act:** 元件渲染
  3. **Assert:** `getByText('Admin Content')` 不存在；驗證 `<Navigate to="/forbidden" />` 被渲染（或 location 變為 `/forbidden`）

---

#### 情境 3: 邊界情況 — 未登入

- **測試案例 ID:** `TC-RG-004`
- **描述:** 用戶未登入（`currentRole === null`），存取任何受保護頁面 → 重導向登入頁
- **測試步驟:**
  1. **Arrange:** `currentRole = null`，`allowedRoles = ['admin']`
  2. **Act:** 元件渲染
  3. **Assert:** 驗證重導向至 `/login`（或 `<Navigate to="/login" />` 被渲染）

---

---

## 模組 6: `hooks/useAuth.js` — 認證 Hook

**對應架構文件:** `Web_App_Architecture.md#Application-Layer`
**對應 BDD Feature:** `Web_App_BDD.md#Feature-1-使用者認證`

**模組目的：** 封裝 Supabase Auth 的 session 狀態管理，提供 React 元件層使用的認證資訊（user、currentRole、loading 狀態），並在 `auth.onAuthStateChange` 事件時自動更新。

---

### 規格 1: `useAuth()`

**描述：** React Custom Hook，訂閱 Supabase Auth 狀態變化並同步到 React 狀態。同時從 `project_access` 表讀取用戶角色。

**回傳值：**
```typescript
interface UseAuthReturn {
  user: User | null          // Supabase auth.users 物件
  currentRole: 'admin' | 'developer' | 'viewer' | null
  loading: boolean           // true 表示仍在確認 session
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string) => Promise<void>
  signOut: () => Promise<void>
}
```

**契約式設計 (DbC)：**

- **前置條件：**
  1. Hook 必須在 React 函式元件或另一個 Custom Hook 中呼叫
  2. `supabase` 客戶端必須已正確初始化（`VITE_SUPABASE_URL` 與 `VITE_SUPABASE_ANON_KEY` 設定）

- **後置條件：**
  1. 初始化時（Session 確認前）`loading === true`，`user === null`
  2. Session 確認後 `loading === false`
  3. 已登入時 `user !== null`，`currentRole` 為字串之一
  4. 未登入時 `user === null`，`currentRole === null`
  5. `signInWithGoogle()` 呼叫後，觸發 Supabase OAuth 流程（重導向至 Google）
  6. `signOut()` 呼叫後，`user` 變為 `null`，`currentRole` 變為 `null`

- **不變性：**
  1. `loading` 在 `false` 之前，元件不應渲染受保護內容
  2. `currentRole` 由 `project_access` 表決定，不由前端自行推斷

---

### 測試情境與案例

> **測試工具建議：** Vitest + `@testing-library/react` renderHook，mock `@supabase/supabase-js`

#### 情境 1: 正常路徑 — 已登入用戶

- **測試案例 ID:** `TC-AU-001`
- **描述:** Supabase 回傳有效 session，Hook 正確設定 user 與 currentRole
- **對應 BDD Scenario:** `Feature 1, Scenario: 使用 Google OAuth 成功登入`
- **測試步驟:**
  1. **Arrange:**
     ```javascript
     vi.mock('@supabase/supabase-js', () => ({
       createClient: () => ({
         auth: {
           getSession: () => Promise.resolve({
             data: { session: { user: { id: 'uuid-1', email: 'pm@example.com' } } }
           }),
           onAuthStateChange: (cb) => { cb('SIGNED_IN', { user: { id: 'uuid-1' } }); return { data: { subscription: { unsubscribe: vi.fn() } } } }
         },
         from: () => ({ select: () => ({ eq: () => Promise.resolve({ data: [{ role: 'admin' }] }) }) })
       })
     }))
     ```
  2. **Act:** `const { result } = renderHook(() => useAuth())`
  3. **Assert:**
     - `result.current.loading === false`
     - `result.current.user.email === 'pm@example.com'`
     - `result.current.currentRole === 'admin'`

---

#### 情境 2: 未登入狀態

- **測試案例 ID:** `TC-AU-002`
- **描述:** Supabase 回傳 null session，Hook 設定未登入狀態
- **對應 BDD Scenario:** `Feature 1, Scenario: 未登入用戶被重導向至登入頁`
- **測試步驟:**
  1. **Arrange:** mock `auth.getSession` 回傳 `{ data: { session: null } }`
  2. **Act:** `renderHook(() => useAuth())`
  3. **Assert:**
     - `result.current.loading === false`
     - `result.current.user === null`
     - `result.current.currentRole === null`

---

#### 情境 3: 登出流程

- **測試案例 ID:** `TC-AU-003`
- **描述:** 呼叫 signOut() 後，user 與 currentRole 清空
- **對應 BDD Scenario:** `Feature 1, Scenario: 使用者登出`
- **測試步驟:**
  1. **Arrange:** 初始狀態為已登入（`user !== null`，`currentRole === 'developer'`）
  2. **Act:** `act(() => { result.current.signOut() })`
  3. **Assert:**
     - `result.current.user === null`
     - `result.current.currentRole === null`

---

---

## 測試執行指南

### 環境設定

```bash
# 安裝測試依賴
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom jsdom

# vitest.config.js
export default {
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js']
  }
}
```

### 測試目錄結構

```
src/
├── lib/
│   ├── progressCalc.js
│   ├── healthCalc.js
│   ├── sCurveInterpolation.js
│   └── taskFilters.js
├── hooks/
│   └── useAuth.js
├── components/
│   └── RoleGuard.jsx
└── __tests__/                   ← 與 src 結構對應
    ├── lib/
    │   ├── progressCalc.test.js
    │   ├── healthCalc.test.js
    │   ├── sCurveInterpolation.test.js
    │   └── taskFilters.test.js
    ├── hooks/
    │   └── useAuth.test.js
    └── components/
        └── RoleGuard.test.jsx
```

### 執行測試

```bash
# 執行全部測試
npx vitest run

# Watch 模式（TDD 開發時）
npx vitest

# 顯示覆蓋率報告
npx vitest run --coverage
```

### 測試覆蓋率目標

| 模組 | 目標覆蓋率 | 說明 |
| :--- | :--- | :--- |
| `lib/progressCalc.js` | 100% | 純函式，完整覆蓋邊界 |
| `lib/healthCalc.js` | 100% | 純函式，覆蓋所有燈號分支 |
| `lib/sCurveInterpolation.js` | 95%+ | 覆蓋邊界值與插值中點 |
| `lib/taskFilters.js` | 100% | 純函式，過濾與排序 |
| `components/RoleGuard.jsx` | 90%+ | 涵蓋三角色 × 允許/拒絕 |
| `hooks/useAuth.js` | 80%+ | Mock 整合，覆蓋主要狀態 |

### TDD 開發流程（Red → Green → Refactor）

```
1. 從本文件選擇一個測試案例（例：TC-PC-001）
2. 撰寫會失敗的測試（Red）
3. 撰寫最小實作使測試通過（Green）
4. 重構（不改變行為，保持 Green）
5. 繼續下一個測試案例
```

---

## 附錄: TDD LLM Prompting Guide

以下 Prompt 模板可用於讓 Claude Code 直接生成 TDD 測試或實作：

**生成測試（Red 階段）：**
```
「請根據以下測試案例規格，為我生成一個會失敗的 Vitest 單元測試（使用 describe/it/expect）。

目標函式：calcProgress（在 src/lib/progressCalc.js）
測試案例 ID：TC-PC-001
規格：
- 輸入：[{status:'Done'}, {status:'Todo'}, {status:'Todo'}]
- 預期輸出：33（Math.round(1/3*100)）
- 前置條件：calcProgress 函式目前不存在或尚未實作

請生成測試檔案 src/__tests__/lib/progressCalc.test.js」
```

**生成最小實作（Green 階段）：**
```
「以下是 Vitest 測試（TC-PC-001 到 TC-PC-006），請撰寫 calcProgress 函式的最小實作，
使所有測試通過。函式放在 src/lib/progressCalc.js，使用 ES Module export。
測試內容：[貼上測試檔案內容]」
```

**生成 RoleGuard 元件測試：**
```
「請根據以下規格，使用 React Testing Library 和 Vitest 為 RoleGuard 元件生成測試。
測試案例 TC-RG-003：Viewer 角色嘗試存取 admin/developer 限定頁面應被重導向。
useAuth Hook 需要 vi.mock 模擬，回傳 currentRole = 'viewer'。
測試檔案位置：src/__tests__/components/RoleGuard.test.jsx」
```

---

**文件審核記錄:**

| 日期       | 審核人 | 版本 | 變更摘要 |
| :--------- | :----- | :--- | :------- |
| 2026-06-05 | PM     | v1.0 | 初稿提交 |
