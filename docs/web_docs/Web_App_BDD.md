---
project: Node_PM
doc_type: BDD
status: draft
phase: planning
priority: high
owner: PM
updated: 2026-06-05
tags: [web-app, bdd, gherkin, dashboard]
---

# 行為驅動情境 (BDD) - Node_PM Web App 團隊進度儀表板

---

**文件版本 (Document Version):** `v1.2`
**最後更新 (Last Updated):** `2026-06-08`
**主要作者 (Lead Author):** `PM、技術負責人`
**審核者 (Reviewers):** `技術負責人`
**狀態 (Status):** `草稿 (Draft)`
**對應 PRD:** `Web_App_PRD.md`

---

## 目錄 (Table of Contents)

- [Feature 1: 使用者認證](#feature-1-使用者認證)
- [Feature 2: 角色型存取控制（RBAC）](#feature-2-角色型存取控制rbac)
- [Feature 3: PM 視圖 — L1 專案組合總覽](#feature-3-pm-視圖--l1-專案組合總覽)
- [Feature 4: PM 視圖 — L2 專案診斷中心](#feature-4-pm-視圖--l2-專案診斷中心)
- [Feature 5: PM 視圖 — L3 任務執行明細](#feature-5-pm-視圖--l3-任務執行明細)
- [Feature 6: 工程師視圖 — L1 個人待辦清單](#feature-6-工程師視圖--l1-個人待辦清單)
- [Feature 7: 工程師視圖 — L2 專案 Kanban](#feature-7-工程師視圖--l2-專案-kanban)
- [Feature 8: 客戶視圖 — L1 交付摘要](#feature-8-客戶視圖--l1-交付摘要)
- [Feature 9: 客戶視圖 — L2 Roadmap 時間軸](#feature-9-客戶視圖--l2-roadmap-時間軸)
- [Feature 10: 進度計算與資料同步](#feature-10-進度計算與資料同步)

---

## Feature 1: 使用者認證

**對應 PRD:** US-001
**說明:** 為三種角色（PM / 工程師 / 客戶）提供安全可靠的身份驗證機制，使用 Supabase Auth。

```gherkin
Feature: 使用者認證

  Background:
    Given 我尚未登入
    And 我在 "/login" 頁面

  @happy-path @smoke-test
  Scenario: PM 使用 Google OAuth 成功登入
    When 我點擊 "使用 Google 帳號登入" 按鈕
    And Google 驗證成功，帳號為 "pm@example.com"
    Then 我應被重新導向至 "/dashboard/pm" 頁面
    And "profiles" 表中自動建立對應 "pm@example.com" 的記錄

  @happy-path
  Scenario: 工程師使用 Email 成功登入
    Given 使用者 "dev@example.com" 已在系統中存在
    When 我輸入 Email 為 "dev@example.com"
    And 我輸入 Password 為正確密碼
    And 我點擊 "登入" 按鈕
    Then 我應被重新導向至 "/dashboard/engineer" 頁面

  @sad-path
  Scenario: 使用錯誤密碼登入失敗
    Given 使用者 "dev@example.com" 已在系統中存在
    When 我輸入 Email 為 "dev@example.com"
    And 我輸入 Password 為錯誤密碼
    And 我點擊 "登入" 按鈕
    Then 我應停留在 "/login" 頁面
    And 我應看到錯誤訊息 "Email 或密碼不正確"

  @sad-path
  Scenario: 未註冊用戶嘗試登入
    When 我輸入 Email 為 "unknown@example.com"
    And 我輸入 Password 為任意密碼
    And 我點擊 "登入" 按鈕
    Then 我應停留在 "/login" 頁面
    And 我應看到錯誤訊息 "Email 或密碼不正確"

  @edge-case
  Scenario Outline: 登入表單輸入驗證
    When 我輸入 Email 為 "<email>"
    And 我輸入 Password 為 "<password>"
    And 我點擊 "登入" 按鈕
    Then 我應看到驗證錯誤訊息 "<message>"

    Examples:
      | email                | password | message             |
      | ""                   | "pass"   | "請輸入 Email"       |
      | "dev@example.com"    | ""       | "請輸入密碼"         |
      | "invalid-email"      | "pass"   | "Email 格式不正確"   |
```

---

## Feature 2: 角色型存取控制（RBAC）

**對應 PRD:** US-002
**說明:** Admin（PM）可管理成員與角色；不同角色只能存取被授權的專案與頁面層級。

```gherkin
Feature: 角色型存取控制（RBAC）

  Background:
    Given "project_access" 表已設定 RLS 政策
    And 使用者 "pm@example.com" 角色為 "admin"
    And 使用者 "dev@example.com" 角色為 "developer"，被分配至 "ProjectA"
    And 使用者 "client@example.com" 角色為 "viewer"，被分配至 "ProjectA"

  @happy-path
  Scenario: Admin 新增成員並指定角色
    Given 我以 "pm@example.com"（admin）身分登入
    When 我進入成員管理頁面
    And 我輸入新成員 Email 為 "newdev@example.com"
    And 我選擇角色為 "developer"
    And 我選擇專案為 "ProjectB"
    And 我點擊 "儲存" 按鈕
    Then "project_access" 表中新增一筆 user_id、project_id、role="developer" 的記錄
    And 成員列表中顯示 "newdev@example.com"

  @happy-path
  Scenario: Admin 變更成員角色
    Given 我以 "pm@example.com"（admin）身分登入
    When 我進入成員管理頁面
    And 我將 "dev@example.com" 的角色從 "developer" 改為 "viewer"
    And 我點擊 "儲存" 按鈕
    Then "project_access" 表中 "dev@example.com" 對應記錄的 role 更新為 "viewer"

  @sad-path
  Scenario: Developer 無法存取未被分配的專案
    Given 我以 "dev@example.com"（developer）身分登入
    When 我嘗試存取 "ProjectB" 的任意頁面
    Then 我應看到 "無存取權限" 的錯誤頁面
    And Supabase RLS 確保 API 查詢不回傳 "ProjectB" 的資料

  @sad-path
  Scenario: Viewer 無法存取 L3 任務明細
    Given 我以 "client@example.com"（viewer）身分登入
    When 我嘗試存取 "/dashboard/client/projects/ProjectA/tasks/M3.1.3"
    Then 我應被重新導向至 "/dashboard/client" 頁面
    And 我應看到提示 "此頁面需要更高權限"

  @sad-path
  Scenario: 非 Admin 無法存取成員管理頁面
    Given 我以 "dev@example.com"（developer）身分登入
    When 我嘗試存取 "/admin/members"
    Then 我應看到 "無存取權限" 的錯誤頁面
```

---

## Feature 3: PM 視圖 — L1 專案組合總覽

**對應 PRD:** US-003
**說明:** PM 登入後的首頁，顯示所有專案的健康度燈號、里程碑倒數，30 秒內掌握全局。

```gherkin
Feature: PM 視圖 — L1 專案組合總覽

  Background:
    Given 我以 "pm@example.com"（admin）身分登入
    And 我在 "/dashboard/pm" 頁面
    And "tasks_sync" 與 "milestones" 表中有 "ProjectA"、"ProjectB" 的資料

  @happy-path @smoke-test
  Scenario: 顯示所有專案的健康度燈號（正常）
    Given "ProjectA" 無 Blocked 任務
    And "ProjectA" 無 overdue 任務（所有 deadline 均在今天之後或無 deadline）
    And "ProjectA" 實際完成率與計畫完成率偏差 ≤ 10%
    When 頁面載入完成
    Then "ProjectA" 的健康度燈號應顯示為 🟢（正常）

  @happy-path
  Scenario: 顯示注意燈號（有 overdue 任務）
    Given "ProjectB" 有 1 筆任務 deadline 早於今天且 status 不為 "Done"
    And "ProjectB" 無 Blocked 任務
    When 頁面載入完成
    Then "ProjectB" 的健康度燈號應顯示為 🟡（注意）

  @happy-path
  Scenario: 顯示異常燈號（有 Blocked 任務）
    Given "ProjectA" 有 1 筆任務 status 為 "Blocked"
    When 頁面載入完成
    Then "ProjectA" 的健康度燈號應顯示為 🔴（異常）

  @happy-path
  Scenario: 顯示本週到期里程碑倒數
    Given "ProjectA" 有一個里程碑 "MVP 上線"，planned_date 為今天後 3 天，is_completed 為 false
    When 頁面載入完成
    Then 頁面顯示里程碑 "MVP 上線" 倒數 "3 天"

  @happy-path
  Scenario: 已完成里程碑不顯示在倒數區塊
    Given "ProjectA" 有一個里程碑 "基礎架構建立"，is_completed 為 true
    When 頁面載入完成
    Then 倒數區塊不顯示 "基礎架構建立"

  @edge-case
  Scenario: 沒有任何專案時顯示空狀態
    Given 目前 "project_access" 中 PM 無任何專案記錄
    When 頁面載入完成
    Then 頁面顯示空狀態提示 "目前尚無專案，請新增專案或聯繫系統管理員"
```

---

## Feature 4: PM 視圖 — L2 專案診斷中心

**對應 PRD:** US-004
**說明:** 點擊任一專案後進入 L2，顯示 S-Curve、Overdue 清單與 Blocked 清單。

```gherkin
Feature: PM 視圖 — L2 專案診斷中心

  Background:
    Given 我以 "pm@example.com"（admin）身分登入
    And "ProjectA" 的 "tasks_sync" 有 10 筆任務，其中 6 筆 status 為 "Done"
    And "ProjectA" 的 "milestones" 有 3 筆記錄

  @happy-path @smoke-test
  Scenario: 顯示 S-Curve（計畫 vs 實際完成率）
    Given "ProjectA" 最早里程碑 planned_date 為 2026-05-01，最晚為 2026-06-30
    And 今天為 2026-06-05
    When 我點擊 "ProjectA" 進入 L2 診斷頁
    Then S-Curve 圖顯示計畫累積完成率曲線
    And S-Curve 圖顯示實際累積完成率曲線（60%）
    And 圖表 X 軸為時間、Y 軸為完成率百分比

  @happy-path
  Scenario: 顯示 Overdue 任務清單（依 deadline 升冪）
    Given "ProjectA" 有以下任務：
      | external_id | title        | status | deadline   |
      | M1.1.1      | 任務 A       | Todo   | 2026-05-20 |
      | M1.1.2      | 任務 B       | Todo   | 2026-05-15 |
      | M1.1.3      | 任務 C       | Done   | 2026-05-10 |
    And 今天為 2026-06-05
    When 我進入 L2 診斷頁
    Then Overdue 清單顯示 "任務 B"（deadline 2026-05-15）排在第一
    And Overdue 清單顯示 "任務 A"（deadline 2026-05-20）排在第二
    And Overdue 清單不顯示 "任務 C"（status 為 Done）

  @happy-path
  Scenario: 顯示 Blocked 任務清單（依 updated_at 降冪）
    Given "ProjectA" 有以下任務：
      | external_id | title   | status   | updated_at              |
      | M2.1.1      | 任務 D  | Blocked  | 2026-06-04T10:00:00Z   |
      | M2.1.2      | 任務 E  | Blocked  | 2026-06-03T08:00:00Z   |
    When 我進入 L2 診斷頁
    Then Blocked 清單顯示 "任務 D" 排在第一（最近更新）
    And Blocked 清單顯示 "任務 E" 排在第二

  @edge-case
  Scenario: 無 Overdue 任務時顯示正常狀態
    Given "ProjectA" 所有任務 deadline 均在未來或已完成
    When 我進入 L2 診斷頁
    Then Overdue 清單顯示 "目前無逾期任務 🎉"

  @edge-case
  Scenario: 里程碑資料不足時 S-Curve 顯示提示
    Given "ProjectA" 的 "milestones" 表為空
    When 我進入 L2 診斷頁
    Then S-Curve 圖區塊顯示 "里程碑資料不足，S-Curve 累積中"
```

---

## Feature 5: PM 視圖 — L3 任務執行明細

**對應 PRD:** US-005
**說明:** 點擊任一任務進入 L3，顯示任務完整屬性。

```gherkin
Feature: PM 視圖 — L3 任務執行明細

  Background:
    Given 我以 "pm@example.com"（admin）身分登入
    And "tasks_sync" 中有任務：
      | external_id | title              | status | assignee_email     | deadline   | priority | yaml_data            |
      | M3.1.3      | 實作付款 API 串接  | Todo   | be@example.com     | 2026-05-10 | high     | {"doc_type":"WBS"}   |

  @happy-path @smoke-test
  Scenario: 查看任務完整屬性
    When 我在 L2 點擊任務 "M3.1.3"
    Then 我進入 L3 任務詳情頁
    And 頁面顯示任務 ID "M3.1.3"
    And 頁面顯示標題 "實作付款 API 串接"
    And 頁面顯示狀態 "Todo"
    And 頁面顯示負責人 Email "be@example.com"
    And 頁面顯示 deadline "2026-05-10"
    And 頁面顯示優先度 "high"
    And 頁面顯示 yaml_data 原始內容

  @edge-case
  Scenario: 任務無 deadline 時顯示 "未設定"
    Given 任務 "M3.1.4" 的 deadline 欄位為 NULL
    When 我點擊任務 "M3.1.4"
    Then deadline 欄位顯示 "未設定"

  @edge-case
  Scenario: 任務無 assignee_email 時顯示 "未指派"
    Given 任務 "M3.1.5" 的 assignee_email 欄位為 NULL
    When 我點擊任務 "M3.1.5"
    Then 負責人欄位顯示 "未指派"
```

---

## Feature 6: 工程師視圖 — L1 個人待辦清單

**對應 PRD:** US-006
**說明:** 工程師登入後看到跨所有被分配專案中屬於自己的未完成任務，依 deadline 排序。

```gherkin
Feature: 工程師視圖 — L1 個人待辦清單

  Background:
    Given 我以 "dev@example.com"（developer）身分登入，被分配至 "ProjectA"、"ProjectB"
    And "tasks_sync" 中：
      | external_id | title   | status | assignee_email   | deadline   | project     |
      | M1.1.1      | 任務 A  | Todo   | dev@example.com  | 2026-06-10 | ProjectA    |
      | M2.1.1      | 任務 B  | Todo   | dev@example.com  | 2026-06-07 | ProjectB    |
      | M1.1.2      | 任務 C  | Done   | dev@example.com  | 2026-06-08 | ProjectA    |
      | M3.1.1      | 任務 D  | Todo   | other@example.com| 2026-06-09 | ProjectA    |

  @happy-path @smoke-test
  Scenario: 顯示跨專案個人未完成任務，依 deadline 升冪排序
    When 頁面載入完成
    Then 個人待辦清單顯示 "任務 B"（deadline 2026-06-07）排在第一
    And 個人待辦清單顯示 "任務 A"（deadline 2026-06-10）排在第二
    And 個人待辦清單不顯示 "任務 C"（status 為 Done）
    And 個人待辦清單不顯示 "任務 D"（assignee 為他人）

  @happy-path
  Scenario: 待辦任務顯示所屬專案名稱
    When 頁面載入完成
    Then "任務 A" 旁顯示所屬專案 "ProjectA"
    And "任務 B" 旁顯示所屬專案 "ProjectB"

  @edge-case
  Scenario: 無 deadline 的任務排在最後
    Given 額外新增任務 "M1.1.3"，assignee 為 dev@example.com，deadline 為 NULL
    When 頁面載入完成
    Then "任務 M1.1.3" 排在所有有 deadline 任務之後

  @edge-case
  Scenario: 所有任務都已完成時顯示慶祝提示
    Given 所有 assignee_email = "dev@example.com" 的任務 status 均為 "Done"
    When 頁面載入完成
    Then 頁面顯示 "今日無待辦任務，太棒了！🎉"
```

---

## Feature 7: 工程師視圖 — L2 專案 Kanban

**對應 PRD:** US-007
**說明:** 工程師點擊任一被分配的專案，查看完整 Kanban 視圖（Todo/Doing/Done/Blocked）。

```gherkin
Feature: 工程師視圖 — L2 專案 Kanban

  Background:
    Given 我以 "dev@example.com"（developer）身分登入，被分配至 "ProjectA"
    And "ProjectA" 的 "tasks_sync" 有以下任務：
      | external_id | title   | status  | assignee_email   | deadline   |
      | M1.1.1      | 任務 A  | Todo    | dev@example.com  | 2026-06-10 |
      | M1.1.2      | 任務 B  | Doing   | dev@example.com  | 2026-06-08 |
      | M1.1.3      | 任務 C  | Done    | dev@example.com  | 2026-06-05 |
      | M1.1.4      | 任務 D  | Blocked | other@example.com| 2026-06-09 |

  @happy-path @smoke-test
  Scenario: 顯示四欄 Kanban（Todo / Doing / Done / Blocked）
    When 我點擊 "ProjectA" 進入 L2
    Then Kanban 顯示四個欄位：Todo、Doing、Done、Blocked
    And "Todo" 欄顯示 "任務 A"
    And "Doing" 欄顯示 "任務 B"
    And "Done" 欄顯示 "任務 C"
    And "Blocked" 欄顯示 "任務 D"

  @happy-path
  Scenario: 任務卡顯示正確欄位
    When 我查看 "任務 A" 的卡片
    Then 卡片顯示任務 ID "M1.1.1"
    And 卡片顯示標題 "任務 A"
    And 卡片顯示負責人 "dev@example.com"
    And 卡片顯示 deadline "2026-06-10"

  @sad-path
  Scenario: Developer 無法存取未被分配的專案 Kanban
    When 我嘗試存取 "ProjectB"（未被分配）的 Kanban 頁面
    Then 我應看到 "無存取權限" 的錯誤頁面
    And API 回傳空資料（RLS 生效）

  @edge-case
  Scenario: 某欄無任務時顯示空欄提示
    Given "ProjectA" 無任何 status 為 "Doing" 的任務
    When 我進入 "ProjectA" 的 L2 Kanban
    Then "Doing" 欄顯示空狀態提示 "目前無進行中的任務"
```

---

## Feature 8: 客戶視圖 — L1 交付摘要

**對應 PRD:** US-009
**說明:** 客戶（Viewer）登入後看到交付摘要：整體完成率圓環與里程碑達成清單。

```gherkin
Feature: 客戶視圖 — L1 交付摘要

  Background:
    Given 我以 "client@example.com"（viewer）身分登入，被分配至 "ProjectA"
    And "ProjectA" 的 "tasks_sync" 有 10 筆任務，其中 4 筆 status 為 "Done"
    And "ProjectA" 的 "milestones" 有以下記錄：
      | milestone_name | planned_date | actual_date | is_completed |
      | 基礎架構建立   | 2026-05-10   | 2026-05-09  | true         |
      | MVP 上線       | 2026-06-20   | NULL        | false        |
      | 正式上線       | 2026-07-15   | NULL        | false        |

  @happy-path @smoke-test
  Scenario: 顯示整體完成率圓環
    When 頁面載入完成
    Then 完成率圓環顯示 "40%"（4 Done / 10 total）
    And 圓環中央顯示數字 "40%"

  @happy-path
  Scenario: 里程碑清單顯示正確狀態
    When 頁面載入完成
    Then 里程碑清單顯示 "基礎架構建立"，標示為已完成，實際完成日 "2026-05-09"
    And 里程碑清單顯示 "MVP 上線"，標示為進行中，計畫完成日 "2026-06-20"
    And 里程碑清單顯示 "正式上線"，標示為尚未開始，計畫完成日 "2026-07-15"

  @sad-path
  Scenario: Viewer 無法看到 L3 任務明細入口
    When 頁面載入完成
    Then 頁面不顯示任何前往 L3 任務明細的連結或按鈕

  @sad-path
  Scenario: Viewer 直接輸入 L3 URL 被攔截
    When 我直接輸入 "/dashboard/client/projects/ProjectA/tasks/M3.1.3"
    Then 我應被重新導向至 "/dashboard/client"
    And 我應看到提示 "此頁面需要更高權限"

  @edge-case
  Scenario: 任務總數為 0 時圓環顯示 "0%"
    Given "ProjectA" 的 "tasks_sync" 無任何資料
    When 頁面載入完成
    Then 完成率圓環顯示 "0%"
    And 圓環下方顯示 "尚無任務資料，請等待同步"
```

---

## Feature 9: 客戶視圖 — L2 Roadmap 時間軸

**對應 PRD:** US-010
**說明:** 客戶點擊專案後查看里程碑的橫軸時間軸與交付順序。

```gherkin
Feature: 客戶視圖 — L2 Roadmap 時間軸

  Background:
    Given 我以 "client@example.com"（viewer）身分登入，被分配至 "ProjectA"
    And "ProjectA" 的 "milestones" 有以下記錄：
      | milestone_name | planned_date | is_completed |
      | 基礎架構建立   | 2026-05-10   | true         |
      | MVP 上線       | 2026-06-20   | false        |
      | 正式上線       | 2026-07-15   | false        |
    And 今天為 2026-06-05

  @happy-path @smoke-test
  Scenario: Roadmap 橫軸依 planned_date 排序顯示里程碑
    When 我點擊 "ProjectA" 進入 L2 Roadmap
    Then Roadmap 橫軸由左至右依序顯示：基礎架構建立（2026-05-10）、MVP 上線（2026-06-20）、正式上線（2026-07-15）

  @happy-path
  Scenario: 已完成里程碑以不同樣式標示
    When 我查看 Roadmap
    Then "基礎架構建立" 顯示已完成樣式（如打勾圖示或灰色）
    And "MVP 上線" 顯示進行中樣式

  @happy-path
  Scenario: 超過計畫日期且未完成的里程碑以紅色標示
    Given "MVP 上線" 的 planned_date 為 2026-06-01（早於今天 2026-06-05）
    And "MVP 上線" 的 is_completed 為 false
    When 我查看 Roadmap
    Then "MVP 上線" 里程碑以紅色標示（逾期未完成）

  @edge-case
  Scenario: 無里程碑時顯示空狀態
    Given "ProjectA" 的 "milestones" 表為空
    When 我點擊 "ProjectA" 進入 L2 Roadmap
    Then 頁面顯示 "尚無里程碑資料"
```

---

## Feature 10: 進度計算與資料同步

**對應 PRD:** US-011
**說明:** 確認進度計算邏輯正確，以及 GitHub Actions 更新後 Web App 正確反映最新資料。

```gherkin
Feature: 進度計算與資料同步

  Background:
    Given Supabase "tasks_sync" 表已啟用 RLS
    And GitHub Actions 已設定 SUPABASE_URL 與 SUPABASE_KEY（service_role）Secrets

  @happy-path @smoke-test
  Scenario: 進度百分比由前端動態計算，不依賴靜態欄位
    Given "ProjectA" 的 "tasks_sync" 有 8 筆任務，其中 5 筆 status 為 "Done"
    When 前端查詢 "ProjectA" 進度
    Then 前端計算結果為 "62.5%"（5 Done / 8 total）
    And "tasks_sync" 表中不存在名為 "progress" 的欄位

  @happy-path
  Scenario: git push 後 Actions 更新 Supabase，Web App 下次載入反映最新資料
    Given "ProjectA/WBS.md" 中有新完成任務 "M4.1.1" 被勾選（- [x]）
    When 工程師執行 "git push" 至 main branch
    And GitHub Actions 在 2 分鐘內完成 Supabase upsert
    And 我重新整理 Web App 頁面
    Then "ProjectA" 的完成率更新，反映最新任務狀態

  @sad-path
  Scenario: GitHub Actions 失敗時 Web App 顯示上次有效資料
    Given GitHub Actions 執行失敗（Supabase 連線逾時）
    When 我在 Web App 查看 "ProjectA" 進度
    Then Web App 顯示上次成功同步的資料（不崩潰、不顯示錯誤頁）
    And GitHub 發送 Actions 失敗通知至 PM Email

  @happy-path
  Scenario: 無 "progress" 靜態欄位確認（Schema 驗證）
    When 查詢 "tasks_sync" 表的欄位清單
    Then 欄位清單不包含 "progress" 欄位
    And 欄位清單包含：id、project_id、external_id、title、status、priority、assignee_email、deadline、yaml_data、updated_at

  @edge-case
  Scenario Outline: 特殊任務數量的進度計算邊界
    Given "tasks_sync" 中 "ProjectX" 的任務狀態如下：<done_count> 筆 Done，<total_count> 筆總計
    When 前端計算進度
    Then 進度顯示 "<expected_pct>"

    Examples:
      | done_count | total_count | expected_pct |
      | 0          | 10          | 0%           |
      | 10         | 10          | 100%         |
      | 0          | 0           | 0%           |
      | 1          | 3           | 33%          |
```

---

## Feature 11: 資料同步新鮮度指示器

**對應 PRD:** US-012
**說明:** PM L1 頁面頂部顯示 Supabase 資料最後更新時間，讓 PM 判斷資料是否可信。

```gherkin
Feature: 資料同步新鮮度指示器

  Background:
    Given 我以 Admin 身份登入
    And 我在 "/pm" 頁面

  @happy-path @smoke-test
  Scenario: 資料新鮮時顯示綠色燈號
    Given "tasks_sync" 中最新 updated_at 距今不超過 2 小時
    Then 頁面頂部顯示綠色燈號（🟢）
    And 顯示格式為「最後同步：YYYY/MM/DD HH:MM」

  @happy-path
  Scenario: 資料超過 2 小時未更新時顯示警告
    Given "tasks_sync" 中最新 updated_at 距今超過 2 小時但未超過 24 小時
    Then 頁面頂部顯示黃色燈號（🟡）
    And 顯示文字「超過 2 小時未更新」

  @sad-path
  Scenario: 資料超過 24 小時未更新時顯示紅色燈號
    Given "tasks_sync" 中最新 updated_at 距今超過 24 小時
    Then 頁面頂部顯示紅色燈號（🔴）
    And 顯示文字「超過 24 小時未更新」

  @edge-case
  Scenario: 無任何同步記錄時顯示灰色狀態
    Given "tasks_sync" 表中無任何資料
    Then 燈號顯示灰色（⚫）
    And 顯示文字「尚無同步記錄」
```

---

## Feature 12: 本週里程碑跨專案匯總面板

**對應 PRD:** US-013
**說明:** PM L1 頂部呈現未來 7 天即將到期的里程碑，跨所有可見專案匯總。

```gherkin
Feature: 本週里程碑跨專案匯總面板

  Background:
    Given 我以 Admin 身份登入
    And 我在 "/pm" 頁面

  @happy-path @smoke-test
  Scenario: 本週有到期里程碑時顯示匯總面板
    Given 以下里程碑 planned_date 在今日起 7 天內且 is_completed = false：
      | 里程碑名稱    | 所屬專案   | planned_date |
      | 後端 API 交付 | 電商平台重構 | 今日 +3 天  |
      | 前端整合上線  | Node_PM    | 今日 +5 天  |
    Then 頁面頂部顯示「本週即將到期里程碑（2 個）」面板
    And 面板中顯示兩筆里程碑，各含里程碑名稱、所屬專案名稱、距到期天數

  @happy-path
  Scenario: 今天到期的里程碑以紅色標示
    Given 一個里程碑 planned_date = 今日且 is_completed = false
    Then 該里程碑顯示文字「今天到期」，以紅色標示

  @edge-case
  Scenario: 本週無到期里程碑時面板不顯示
    Given 所有里程碑的 planned_date 均超過 7 天後，或 is_completed = true
    Then 頁面頂部不顯示本週里程碑面板

  @happy-path
  Scenario: 點擊里程碑導向對應專案 L2 診斷頁
    Given 面板顯示「後端 API 交付」屬於專案 "ProjectA"
    When 我點擊「後端 API 交付」
    Then 我應被導向 "/pm/{ProjectA_id}/milestones"
```

---

## Feature 13: 任務優先度顯示

**對應 PRD:** US-014
**說明:** 在 PM L3 任務清單、工程師 L1 待辦、Kanban 卡片上顯示任務優先度（來自 yaml_data.priority）。

```gherkin
Feature: 任務優先度顯示

  Background:
    Given Supabase "tasks_sync" 中部分任務的 yaml_data 包含 priority 欄位

  @happy-path @smoke-test
  Scenario Outline: 不同優先度以對應色標顯示
    Given 任務 "T-001" 的 yaml_data.priority = "<priority>"
    When PM 或工程師查看包含該任務的清單頁面
    Then 任務旁顯示優先度標籤，顏色為 "<color>"

    Examples:
      | priority | color  |
      | High     | 紅色   |
      | Medium   | 黃色   |
      | Low      | 灰色   |

  @edge-case
  Scenario: yaml_data.priority 為 null 時顯示破折號
    Given 任務 "T-002" 的 yaml_data 為 null 或不含 priority 欄位
    When 查看包含該任務的清單頁面
    Then 優先度欄顯示「—」，不報錯、不顯示空白

  @happy-path
  Scenario: Kanban 卡片有優先度時顯示標籤
    Given 任務 "T-003" 的 yaml_data.priority = "High"
    When 工程師查看 L2 Kanban 頁面
    Then 該任務卡片底部顯示紅色「高」標籤
```

---

## Feature 14: 工程師 L2 Kanban 專案名稱標題

**對應 PRD:** US-015
**說明:** EngineerL2Page 標題顯示真實專案名稱，而非固定文字「專案 Kanban」。

```gherkin
Feature: 工程師 L2 Kanban 專案名稱標題

  Background:
    Given 我以 Developer 或 Admin 身份登入
    And 我進入某個專案的 Kanban 頁面 "/engineer/{projectId}"

  @happy-path @smoke-test
  Scenario: 頁面標題顯示正確的專案名稱
    Given 該 projectId 對應的專案名稱為「電商平台重構」
    Then 頁面標題顯示「電商平台重構 — Kanban」

  @happy-path
  Scenario: 頁面提供返回工程師 L1 的連結
    Then 頁面左上角顯示「← 返回」連結
    When 我點擊「← 返回」
    Then 我應被導向 "/engineer"

  @edge-case
  Scenario: 專案資料載入中時顯示 loading 文字
    Given 網路較慢，projects 查詢尚未完成
    Then 頁面標題顯示「載入中… — Kanban」
    And 不顯示錯誤訊息
```

---

---

## Feature 15: 工程師 L1 時間分組任務清單

**對應 PRD:** US-016
**說明:** 工程師 L1 任務清單依緊急度分為 4 個獨立區塊，空的區塊自動隱藏。

```gherkin
Feature: 工程師 L1 時間分組任務清單

  Background:
    Given 我以 Developer 或 Admin 身份登入
    And 我進入工程師 L1 儀表板 "/engineer"

  @happy-path @smoke-test
  Scenario: 任務按緊急度分為 4 個區塊
    Given 我有以下任務：卡關任務 1 筆、逾期任務 2 筆、本週到期 3 筆、未來任務 1 筆
    Then 頁面由上到下顯示 4 個區塊：「卡關任務」→「逾期任務」→「本週到期」→「之後 / 未排程」
    And 每個區塊標頭右側顯示該區塊任務數量徽章

  @happy-path
  Scenario: 空的區塊自動隱藏
    Given 我無卡關任務，無逾期任務，但有本週到期任務 2 筆
    Then 頁面不顯示「卡關任務」和「逾期任務」區塊
    And 只顯示「本週到期」和「之後 / 未排程」區塊

  @happy-path
  Scenario Outline: 任務依截止日落入正確區塊
    Given 任務截止日為 <deadline>，且非卡關任務
    Then 任務出現在 <section> 區塊

    Examples:
      | deadline       | section       |
      | 昨天（過期）   | 逾期任務      |
      | 今天           | 本週到期      |
      | 今天 + 6 天    | 本週到期      |
      | 今天 + 8 天    | 之後 / 未排程 |
      | 無截止日       | 之後 / 未排程 |
```

---

## Feature 16: 工程師 L1 卡關任務醒目提示

**對應 PRD:** US-017
**說明:** 卡關任務以紅色漸層標頭、pulsing beacon 指示燈、左邊框強調，並在 L1 清單與 L3 詳情顯示卡關原因。

```gherkin
Feature: 工程師 L1 卡關任務醒目提示

  Background:
    Given 我以 Developer 或 Admin 身份登入

  @happy-path @smoke-test
  Scenario: 卡關區塊有醒目的紅色視覺效果
    Given 我有 1 筆卡關任務（yaml_data.blocked = true）
    When 我進入工程師 L1 儀表板
    Then 卡關區塊以紅色漸層標頭顯示，包含 🚨 圖示和「卡關任務 — 無法自行推進」文字
    And 區塊外框為紅色粗邊框

  @happy-path
  Scenario: 每個卡關任務列顯示動態信標
    Given 我有 2 筆卡關任務
    Then 每筆任務列左側有紅色左邊框（4px）
    And 每筆任務標題前有 animate-ping 紅色動態信標指示燈

  @happy-path
  Scenario: 有卡關原因時顯示在標題下方
    Given 任務 "EC-007" 的 yaml_data.reason = "等待廠商提供測試帳號"
    And 該任務為卡關狀態（yaml_data.blocked = true）
    When 我查看工程師 L1 儀表板
    Then 任務 "EC-007" 標題下方顯示「🔒 等待廠商提供測試帳號」

  @happy-path
  Scenario: L3 詳情頁獨立顯示卡關原因
    Given 任務 "EC-007" 的 yaml_data.reason = "等待廠商提供測試帳號"
    When 我進入 "EC-007" 的 L3 詳情頁
    Then 頁面顯示「卡關原因」欄位，內容為「🔒 等待廠商提供測試帳號」
    And 該欄位以紅色背景區塊顯示

  @edge-case
  Scenario: 無卡關原因時不顯示原因欄
    Given 任務 "EC-013" 的 yaml_data.blocked = true，但無 reason 欄位
    When 我查看 L1 清單或 L3 詳情頁
    Then 不顯示「卡關原因」區塊，無空白欄或錯誤訊息
```

---

## Feature 17: 工程師 L1 進行中任務統計卡

**對應 PRD:** US-018
**說明:** 統計區新增「進行中」卡片，改為 4 欄配置，Doing 與 Blocked 任務計數獨立互不重疊。

```gherkin
Feature: 工程師 L1 進行中任務統計卡

  Background:
    Given 我以 Developer 或 Admin 身份登入
    And 我進入工程師 L1 儀表板 "/engineer"

  @happy-path @smoke-test
  Scenario: 統計區顯示 4 張卡片
    Then 頁面頂部顯示 4 張統計卡：「進行中」、「待辦」、「逾期」、「卡關」

  @happy-path
  Scenario: 進行中卡片計數正確且顯示藍色
    Given 我有 2 筆 status = 'Doing' 且非卡關的任務
    Then 「進行中」卡片顯示數字 2，卡片呈藍色背景

  @happy-path
  Scenario: 卡關卡片有 animate-ping 指示燈
    Given 我有 1 筆卡關任務
    Then 「卡關」卡片數字左側顯示 animate-ping 紅色動態燈號
    And 卡片呈紅色背景

  @edge-case
  Scenario: Doing 且卡關的任務只計入卡關不計入進行中
    Given 任務 A 的 status = 'Doing' 且 yaml_data.blocked = true
    Then 「進行中」計數不包含任務 A
    And 「卡關」計數包含任務 A
```

---

## Feature 18: 任務截止日相對天數顯示

**對應 PRD:** US-019
**說明:** 工程師 L1 任務清單的截止日欄改為相對天數（「逾期 N 天」/ 「今天到期！」/ 「N 天後」），由 DeadlineCell 元件封裝。

```gherkin
Feature: 任務截止日相對天數顯示

  Background:
    Given 我以 Developer 或 Admin 身份登入
    And 我進入工程師 L1 儀表板 "/engineer"

  @happy-path @smoke-test
  Scenario Outline: 截止日依相對天數顯示對應文字與顏色
    Given 任務截止日為今天偏移 <offset> 天
    Then 截止日欄顯示 <text>，顏色為 <color>

    Examples:
      | offset | text       | color    |
      | -3     | 逾期 3 天  | 紅色     |
      | 0      | 今天到期！ | 紅色粗體 |
      | 1      | 明天 (1d)  | 橘色     |
      | 5      | 5 天後     | 黃色     |
      | 14     | 14 天後    | 灰色     |

  @edge-case
  Scenario: 無截止日顯示破折號
    Given 任務無截止日（deadline 為 null）
    Then 截止日欄顯示「—」，無報錯
```

---

**文件版本**：v1.2
**最後更新**：2026-06-08
**狀態**：草稿（Draft）
