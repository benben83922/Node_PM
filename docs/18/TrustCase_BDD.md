# 行為驅動情境 (BDD) 指南與範本 - TrustCase

---

**文件版本 (Document Version):** `v1.0`
**最後更新 (Last Updated):** `2026-02-01`
**主要作者 (Lead Author):** `技術負責人, 產品經理`
**狀態 (Status):** `活躍 (Active)`

---

## 目錄 (Table of Contents)

- [Ⅰ. BDD 核心原則](#-bdd-核心原則)
- [Ⅱ. Gherkin 語法速查](#-gherkin-語法速查)
- [Ⅲ. Feature Files](#-feature-files)
  - [Epic 1: 使用者身份驗證](#epic-1-使用者身份驗證-authenticationfeature)
  - [Epic 2: LLM Agent 需求引導](#epic-2-llm-agent-需求引導-requirement-guidancefeature)
  - [Epic 3: 動態里程碑管理](#epic-3-動態里程碑管理-milestone-managementfeature)
  - [Epic 4: 價金託管與支付](#epic-4-價金託管與支付-escrow-paymentfeature)
  - [Epic 5: POC 概念驗證](#epic-5-poc-概念驗證-poc-modefeature)
  - [Epic 6: 遊戲化牌位系統](#epic-6-遊戲化牌位系統-gamification-tierfeature)
  - [Epic 7: 風險控管與爭議處理](#epic-7-風險控管與爭議處理-dispute-resolutionfeature)
- [Ⅳ. 最佳實踐](#-最佳實踐)

---

**目的**: 本文件旨在提供 TrustCase 專案的標準化 BDD 情境，確保業務人員、開發者和測試者對「完成」的定義達成共識。每個 Feature 對應 PRD 中的一個 Epic。

---

## Ⅰ. BDD 核心原則

1. **從對話開始**: BDD 不是關於寫測試，而是關於團隊成員（業務、開發、測試）之間的對話，以確保對需求的共同理解。
2. **由外而內**: 我們從使用者與系統的互動（外部行為）開始定義，然後才深入到內部實現。
3. **使用通用語言 (Ubiquitous Language)**: 在 BDD 情境中使用的術語，應與在 PRD 和程式碼中使用的術語保持一致。

### TrustCase 通用語言表

| 術語 | 定義 |
|:---|:---|
| **案主 (Client)** | 發布專案需求並付款的使用者 |
| **接案者 (Freelancer)** | 承接專案並交付成果的使用者 |
| **里程碑 (Milestone)** | 專案中可獨立驗收與付款的階段 |
| **託管 (Escrow)** | 平台代管款項，待驗收通過後撥款 |
| **POC** | Proof of Concept，小規模概念驗證專案 |
| **SPEC** | 結構化需求規格書 |
| **牌位 (Tier)** | 接案者的能力等級（青銅→宗師） |
| **積分 (RP)** | Rating Points，決定牌位的數值 |
| **驗收 (Acceptance)** | 案主確認里程碑交付物符合標準 |

---

## Ⅱ. Gherkin 語法速查

| 關鍵字 | 說明 |
|:---|:---|
| `Feature` | 描述一個高層次的功能，對應 PRD 中的一個 Epic |
| `Scenario` | 描述 Feature 下的一個具體業務場景 |
| `Given` | **(給定)** 場景開始前的初始狀態（Arrange） |
| `When` | **(當)** 使用者執行的具體操作（Act） |
| `Then` | **(那麼)** 系統應有的輸出或結果（Assert） |
| `And`, `But` | 連接多個步驟，提升可讀性 |
| `Background` | 所有 Scenarios 共用的前置條件 |
| `Scenario Outline` | 多組數據的參數化測試 |

---

## Ⅲ. Feature Files

---

### Epic 1: 使用者身份驗證 (`authentication.feature`)

```gherkin
# Feature: 使用者身份驗證
# 目的: 為使用者提供安全可靠的身份驗證機制
# 對應 PRD: TrustCase_PRD.md#epic-1-使用者身份驗證與管理

Feature: User Authentication

  Background:
    Given I am a guest user
    And I am on the homepage

  # ========== 註冊流程 ==========

  @happy-path @smoke-test @US-101
  Scenario: 成功使用 Email 註冊新帳號
    Given I am on the "/register" page
    When I fill in "Email" with "newuser@example.com"
    And I fill in "Password" with "SecurePass123!"
    And I fill in "Confirm Password" with "SecurePass123!"
    And I select "接案者" as my user type
    And I accept the terms of service
    And I press the "註冊" button
    Then I should see a message "驗證信已發送至 newuser@example.com"
    And a verification email should be sent to "newuser@example.com"

  @happy-path @US-101
  Scenario: 點擊驗證連結啟用帳號
    Given I have registered with email "newuser@example.com"
    And I have received a verification email
    When I click the verification link in the email
    Then my account should be activated
    And I should be redirected to the "/onboarding" page
    And I should see a message "帳號已成功啟用！"

  @sad-path @US-101
  Scenario: 使用已存在的 Email 註冊失敗
    Given a user with email "existing@example.com" already exists
    And I am on the "/register" page
    When I fill in "Email" with "existing@example.com"
    And I fill in "Password" with "SecurePass123!"
    And I press the "註冊" button
    Then I should see an error message "此 Email 已被註冊"
    And I should remain on the "/register" page

  @edge-case @US-101
  Scenario Outline: 註冊時的輸入驗證
    Given I am on the "/register" page
    When I fill in "Email" with "<email>"
    And I fill in "Password" with "<password>"
    And I fill in "Confirm Password" with "<confirm>"
    And I press the "註冊" button
    Then I should see a validation error "<message>"

    Examples:
      | email                | password       | confirm        | message                    |
      | ""                   | "Pass123!"     | "Pass123!"     | "Email 為必填欄位"          |
      | "invalid-email"      | "Pass123!"     | "Pass123!"     | "Email 格式不正確"          |
      | "test@example.com"   | "123"          | "123"          | "密碼至少需要 8 個字元"      |
      | "test@example.com"   | "Pass123!"     | "Different1!"  | "兩次密碼輸入不一致"         |

  # ========== 登入流程 ==========

  @happy-path @smoke-test @US-102
  Scenario: 成功登入
    Given the user "user@example.com" exists with password "password123"
    And I am on the "/login" page
    When I fill in "Email" with "user@example.com"
    And I fill in "Password" with "password123"
    And I press the "登入" button
    Then I should be redirected to the "/dashboard" page
    And I should see a message "歡迎回來！"

  @sad-path @US-102
  Scenario: 使用錯誤密碼登入失敗
    Given the user "user@example.com" exists with password "password123"
    And I am on the "/login" page
    When I fill in "Email" with "user@example.com"
    And I fill in "Password" with "wrong-password"
    And I press the "登入" button
    Then I should remain on the "/login" page
    And I should see an error message "Email 或密碼錯誤"

  @sad-path @US-102
  Scenario: 使用未驗證帳號登入失敗
    Given the user "unverified@example.com" exists but is not verified
    And I am on the "/login" page
    When I fill in "Email" with "unverified@example.com"
    And I fill in "Password" with "password123"
    And I press the "登入" button
    Then I should see a message "請先驗證您的 Email"
    And I should see a link to resend verification email

  # ========== 個人檔案 ==========

  @happy-path @US-103
  Scenario: 接案者完善個人檔案
    Given I am logged in as a freelancer "dev@example.com"
    And I am on the "/profile/edit" page
    When I fill in "顯示名稱" with "王小明"
    And I add skill tags "React", "Node.js", "PostgreSQL"
    And I fill in "自我介紹" with "5 年全端開發經驗"
    And I set hourly rate range from "800" to "1500" NTD
    And I upload a portfolio item
    And I press the "儲存" button
    Then my profile should be updated
    And I should see a message "個人檔案已更新"
    And my profile completeness should be "100%"
```

---

### Epic 2: LLM Agent 需求引導 (`requirement-guidance.feature`)

```gherkin
# Feature: LLM Agent 需求引導系統
# 目的: 透過 AI 引導業主清晰表達需求，產出結構化 SPEC
# 對應 PRD: TrustCase_PRD.md#epic-2-llm-agent-需求引導系統

Feature: LLM Agent Requirement Guidance

  Background:
    Given I am logged in as a client "client@example.com"

  # ========== 需求引導對話 ==========

  @happy-path @smoke-test @US-201
  Scenario: 開始需求引導對話並識別專案類型
    Given I am on the "/projects/new" page
    When I enter "我想做一個賣蛋糕的網站" in the requirement input
    And I press "開始引導"
    Then the Agent should identify project type as "網站開發 - 電商"
    And I should see a message "了解！您想做一個蛋糕的線上購物網站"
    And the Agent should start asking structured questions

  @happy-path @US-201
  Scenario: 完成分層問題引導
    Given I have started a requirement guidance session
    And the Agent has identified project type as "網站開發 - 電商"
    When the Agent asks "這個網站的主要目的是什麼？"
    And I answer "線上銷售蛋糕，讓客戶可以直接下單"
    And the Agent asks "目標用戶是誰？"
    And I answer "25-40 歲的女性"
    And the Agent asks "需要會員系統嗎？"
    And I answer "需要，要有訂單記錄查詢"
    Then the Agent should record all my answers
    And the progress indicator should show "Layer 2: 功能需求"

  @happy-path @US-201
  Scenario: 查看已收集資訊與建議補充項目
    Given I have completed the requirement guidance session
    When I reach the summary page
    Then I should see a list of "已收集的資訊"
    And the list should include "專案類型：電商網站"
    And the list should include "目標用戶：25-40 歲女性"
    And I should see a list of "建議補充" items
    And the suggestions should include "金流需求"
    And I should see a button "產出 SPEC"

  # ========== SPEC 產出 ==========

  @happy-path @smoke-test @US-202
  Scenario: 自動產出結構化 SPEC 文件
    Given I have completed the requirement guidance session
    When I press "產出 SPEC"
    Then a SPEC document should be generated
    And the SPEC should contain "專案概述" section
    And the SPEC should contain "功能需求" section with priority labels
    And the SPEC should contain "驗收標準" section
    And the SPEC should contain "建議里程碑" section

  @happy-path @US-202
  Scenario: 匯出 SPEC 為不同格式
    Given a SPEC has been generated for my project
    When I click "匯出" button
    Then I should see options for "Markdown" and "PDF"
    When I select "PDF"
    Then a PDF file should be downloaded

  @happy-path @US-202
  Scenario: 編輯修改產出的 SPEC
    Given a SPEC has been generated for my project
    When I click on the "功能需求" section
    And I add a new requirement "需要支援超商取貨"
    And I press "儲存"
    Then the SPEC should be updated with the new requirement
    And I should see a message "SPEC 已更新"

  # ========== 接案者查看 SPEC ==========

  @happy-path @US-203
  Scenario: 接案者查看案主的 SPEC
    Given I am logged in as a freelancer "dev@example.com"
    And a project "蛋糕電商網站" has a published SPEC
    When I view the project details
    Then I should see the complete SPEC document
    And I should see all functional requirements with priorities
    And I should see the acceptance criteria
    And I should see the suggested milestones

  @happy-path @US-203
  Scenario: 接案者在 SPEC 上提出技術澄清問題
    Given I am viewing a project SPEC
    When I click "提出問題" on the "金流串接" requirement
    And I enter "請問可以接受使用綠界而非 LINE Pay 嗎？原因是申請較快"
    And I press "送出"
    Then my question should be attached to the SPEC
    And the client should receive a notification
    And the question status should be "待回覆"

  @happy-path @US-203
  Scenario: 接案者標註風險或提出替代方案
    Given I am viewing a project SPEC
    When I click "新增備註" on the "物流串接" requirement
    And I select note type "風險提示"
    And I enter "物流 API 需簽訂合約，建議提早處理"
    And I press "送出"
    Then my note should be visible on the SPEC
    And the note should be marked as "風險提示"
```

---

### Epic 3: 動態里程碑管理 (`milestone-management.feature`)

```gherkin
# Feature: 動態里程碑與專案管理
# 目的: 提供靈活且標準化的里程碑管理機制
# 對應 PRD: TrustCase_PRD.md#epic-3-動態里程碑與專案管理

Feature: Dynamic Milestone Management

  Background:
    Given I am logged in as a freelancer "dev@example.com"
    And I am working on project "電商網站開發"

  # ========== 里程碑模板 ==========

  @happy-path @smoke-test @US-301
  Scenario: 根據專案類型選擇里程碑模板
    Given the project type is "網站開發"
    When I go to the milestone setup page
    Then I should see available templates
    And I should see "網站開發 - 標準版 (6 節點)"
    And I should see "網站開發 - 簡化版 (4 節點)"
    When I select "網站開發 - 標準版"
    Then the template should be loaded with 6 milestones
    And each milestone should have default acceptance criteria

  @happy-path @US-301
  Scenario: 調整里程碑節點
    Given I have loaded the "網站開發 - 標準版" template
    When I drag "測試與修正" milestone before "後端開發"
    Then the milestone order should be updated
    When I click "新增節點" after "前端開發"
    And I enter milestone name "API 整合"
    Then a new milestone should be added
    And the escrow percentages should be recalculated

  @happy-path @US-301
  Scenario: 設定每個節點的託管金額比例
    Given I have configured the milestones
    When I set "需求確認" weight to "10%"
    And I set "UI/UX 設計" weight to "20%"
    And I set "前端開發" weight to "25%"
    And I set "後端開發" weight to "25%"
    And I set "測試與修正" weight to "15%"
    And I set "上線部署" weight to "5%"
    Then the total weight should equal "100%"
    And I should see the calculated amount for each milestone

  # ========== 案主確認 ==========

  @happy-path @smoke-test @US-302
  Scenario: 案主審核並確認里程碑規劃
    Given I am logged in as client "client@example.com"
    And freelancer has proposed milestone plan for my project
    When I view the milestone proposal
    Then I should see each milestone with:
      | Field | Example |
      | 名稱 | 需求確認 |
      | 交付物 | 需求規格書 |
      | 驗收標準 | 需求文件雙方確認簽核 |
      | 託管金額 | NT$ 10,000 |
      | 預計時程 | 3-5 天 |
    And I should see the total project amount

  @happy-path @US-302
  Scenario: 雙方確認後鎖定里程碑
    Given I am viewing the milestone proposal
    When I press "確認並簽署"
    And I enter my signature
    Then the milestone plan should be locked
    And neither party can modify it unilaterally
    And the project status should change to "待付款"
    And I should see a message "里程碑已鎖定，請進行首期款項支付"

  @sad-path @US-302
  Scenario: 案主要求修改里程碑
    Given I am viewing the milestone proposal
    When I click "要求修改" on "前端開發" milestone
    And I enter feedback "希望增加 RWD 測試項目"
    And I press "送出"
    Then the proposal status should change to "待修改"
    And the freelancer should receive a notification
    And the milestone should be unlocked for editing

  # ========== 專案儀表板 ==========

  @happy-path @smoke-test @US-303
  Scenario: 在儀表板追蹤專案進度
    Given my project "電商網站" is in progress
    And milestone "UI/UX 設計" is completed
    And milestone "前端開發" is in progress
    When I view the project dashboard
    Then I should see a visual progress bar
    And "UI/UX 設計" should be marked as "已完成"
    And "前端開發" should be marked as "進行中"
    And remaining milestones should be marked as "待開始"

  @happy-path @US-303
  Scenario: 查看專案健康度燈號
    Given my project is in progress
    And milestone "前端開發" is due in 2 days
    And the freelancer has not submitted any updates in 5 days
    When I view the project dashboard
    Then I should see a "黃燈" health indicator
    And I should see a warning "接案者已 5 天未更新進度"

  @edge-case @US-303
  Scenario: 收到逾期預警通知
    Given milestone "前端開發" is due tomorrow
    And the freelancer has not submitted the deliverables
    When the system runs the daily check
    Then both parties should receive a notification
    And the notification should say "里程碑『前端開發』即將於明天到期"
```

---

### Epic 4: 價金託管與支付 (`escrow-payment.feature`)

```gherkin
# Feature: 價金託管與支付
# 目的: 透過里程碑式託管確保雙方權益
# 對應 PRD: TrustCase_PRD.md#epic-4-價金託管與支付

Feature: Escrow Payment System

  # ========== 案主付款 ==========

  @happy-path @smoke-test @US-401
  Scenario: 案主預付里程碑款項至平台託管
    Given I am logged in as client "client@example.com"
    And my project has a confirmed milestone plan
    And the first milestone "需求確認" requires NT$ 10,000
    When I go to the payment page
    And I select "信用卡" as payment method
    And I enter valid credit card information
    And I press "確認付款"
    Then the payment should be processed successfully
    And NT$ 10,000 should be held in escrow
    And I should see a message "款項已託管"
    And the freelancer should receive notification "案主已付款，請開始執行"

  @happy-path @US-401
  Scenario: 查看託管金額狀態
    Given I have paid for multiple milestones
    When I view the project payment status
    Then I should see:
      | Milestone | Amount | Status |
      | 需求確認 | NT$ 10,000 | 已託管 |
      | UI/UX 設計 | NT$ 20,000 | 已託管 |
      | 前端開發 | NT$ 25,000 | 待付款 |

  @sad-path @US-401
  Scenario: 付款失敗處理
    Given I am on the payment page
    When I enter an invalid credit card
    And I press "確認付款"
    Then I should see an error message "付款失敗，請確認卡片資訊"
    And the escrow amount should remain unchanged
    And the project status should remain "待付款"

  # ========== 接案者提交交付物 ==========

  @happy-path @smoke-test @US-403
  Scenario: 接案者提交里程碑交付物
    Given I am logged in as freelancer "dev@example.com"
    And milestone "UI/UX 設計" is in progress
    And the escrow amount is NT$ 20,000
    When I go to the milestone submission page
    And I upload file "design_v1.fig"
    And I add link "https://figma.com/file/xxx"
    And I enter notes "已完成所有頁面設計，請查收"
    And I press "提交驗收"
    Then the milestone status should change to "待驗收"
    And the client should receive notification
    And the submission timestamp should be recorded

  @happy-path @US-403
  Scenario: 系統自動計算檔案雜湊
    Given I am submitting deliverables for a milestone
    When I upload file "source_code.zip"
    Then the system should calculate SHA-256 hash
    And the hash should be displayed as evidence
    And the hash should be stored for dispute resolution

  # ========== 驗收與撥款 ==========

  @happy-path @smoke-test @US-402
  Scenario: 案主驗收通過後自動撥款
    Given I am logged in as client "client@example.com"
    And milestone "UI/UX 設計" is pending my acceptance
    And the escrow amount is NT$ 20,000
    When I review the deliverables
    And I press "驗收通過"
    Then the milestone status should change to "已完成"
    And the escrow should be released
    And the freelancer should receive NT$ 18,000 (after 10% fee)
    And I should see a breakdown:
      | Item | Amount |
      | 託管金額 | NT$ 20,000 |
      | 平台服務費 (10%) | -NT$ 2,000 |
      | 接案者實收 | NT$ 18,000 |

  @happy-path @US-402
  Scenario: 驗收逾期自動視為通過
    Given milestone "UI/UX 設計" was submitted 7 days ago
    And the client has not responded
    When the system runs the daily check
    Then the milestone should be auto-approved
    And the escrow should be released to the freelancer
    And both parties should receive notification
    And the notification should say "驗收逾期，系統已自動通過"

  @sad-path @US-402
  Scenario: 案主要求修改
    Given milestone "UI/UX 設計" is pending my acceptance
    When I review the deliverables
    And I press "要求修改"
    And I enter feedback "首頁 Banner 需調整為圓角設計"
    And I press "送出"
    Then the milestone status should change to "修改中"
    And the freelancer should receive notification with feedback
    And the revision count should increase by 1
    And the escrow should remain held
```

---

### Epic 5: POC 概念驗證 (`poc-mode.feature`)

```gherkin
# Feature: POC 概念驗證模式
# 目的: 提供低風險的試做機制，降低首次合作門檻
# 對應 PRD: TrustCase_PRD.md#epic-5-poc-概念驗證模式

Feature: POC (Proof of Concept) Mode

  Background:
    Given I am logged in as client "client@example.com"
    And I am viewing a proposal from freelancer "dev@example.com"

  # ========== 選擇 POC 模式 ==========

  @happy-path @smoke-test @US-501
  Scenario: 查看並選擇 POC 方案
    Given the proposal includes both POC and full project options
    When I view the proposal
    Then I should see two sections:
      | Section | Details |
      | POC 概念驗證 | 費用：NT$ 15,000 / 時程：7 天 |
      | 正式專案 | 預估費用：NT$ 80,000-100,000 |
    And the POC section should list specific deliverables
    And I should see "POC 費用可 100% 抵扣正式專案"

  @happy-path @US-501
  Scenario: 選擇 POC 模式開始合作
    Given I have reviewed the proposal
    When I click "選擇 POC 模式"
    And I confirm the POC scope and terms
    And I agree to the POC contract
    Then a POC project should be created
    And I should be redirected to the payment page
    And the payment amount should be NT$ 15,000

  @happy-path @US-501
  Scenario: 查看 POC 範圍與交付物
    Given I am viewing the POC proposal
    Then I should see:
      | Field | Content |
      | 驗證目標 | 設計風格、溝通效率 |
      | 交付物 | 首頁 UI 設計（Desktop + Mobile） |
      | 交付物 | 產品列表頁 UI 設計 |
      | 修改次數 | 2 次 |
      | 時程 | 7 個工作天 |

  # ========== POC 轉正式案 ==========

  @happy-path @smoke-test @US-502
  Scenario: POC 滿意後轉為正式專案
    Given POC project has been completed
    And I have approved the POC deliverables
    And the POC fee was NT$ 15,000
    When I click "轉為正式專案"
    Then I should see the full project proposal
    And the proposal should show:
      | Item | Amount |
      | 正式專案總費用 | NT$ 100,000 |
      | POC 抵扣 | -NT$ 15,000 |
      | 應付金額 | NT$ 85,000 |
    And POC deliverables should be marked as M1

  @happy-path @US-502
  Scenario: POC 費用抵扣規則（7 天內）
    Given POC was completed 3 days ago
    And the POC fee was NT$ 15,000
    When I convert to full project
    Then the deduction should be 100%
    And I should pay NT$ 85,000 for the remaining work

  @edge-case @US-502
  Scenario: POC 費用抵扣規則（超過 30 天）
    Given POC was completed 45 days ago
    And the POC fee was NT$ 15,000
    When I convert to full project
    Then the deduction should be 50%
    And the deduction amount should be NT$ 7,500
    And I should pay NT$ 92,500 for the remaining work

  # ========== POC 不滿意結束 ==========

  @happy-path @US-503
  Scenario: POC 不滿意結束合作
    Given POC project has been completed
    And I have reviewed the POC deliverables
    When I click "結束合作"
    And I confirm my decision
    Then the POC should be marked as "完成-不續約"
    And the POC fee should be released to the freelancer
    And I should retain ownership of POC deliverables
    And I should see a message "您保留 90 天內轉正式案的權利"

  @sad-path @US-503
  Scenario: POC 交付物不符合約定
    Given POC project is pending acceptance
    And the deliverables do not match the agreed scope
    When I click "提出爭議"
    And I describe the issue "只交付 1 頁設計，約定是 2 頁"
    And I attach evidence screenshots
    Then a dispute should be opened
    And the POC fee should remain in escrow
    And the dispute process should begin
```

---

### Epic 6: 遊戲化牌位系統 (`gamification-tier.feature`)

```gherkin
# Feature: 遊戲化牌位系統
# 目的: 透過客觀 KPI 建立可信的能力評價機制
# 對應 PRD: TrustCase_PRD.md#epic-6-遊戲化牌位系統

Feature: Gamification Tier System

  # ========== 案主查看牌位 ==========

  @happy-path @smoke-test @US-601
  Scenario: 案主查看接案者的牌位與 KPI
    Given I am logged in as client "client@example.com"
    And freelancer "王小明" has tier "Gold II"
    And freelancer has completed 25 milestones
    When I view the freelancer's profile
    Then I should see the tier badge "Gold II"
    And I should see KPI metrics:
      | Metric | Value |
      | 準時率 | 96% |
      | 一次驗收率 | 88% |
      | 完成里程碑數 | 25 |
      | 專案類型 | 網站開發 (80%), APP 開發 (20%) |

  @happy-path @US-601
  Scenario: 查看 KPI 詳細說明
    Given I am viewing a freelancer's profile
    When I click on "準時率 96%"
    Then I should see a tooltip explaining:
      """
      準時率：在約定截止日期前完成交付的里程碑比例
      計算方式：最近 20 個里程碑的準時交付數 / 20
      等級：優秀 (95-97%)
      """

  # ========== 接案者累積積分 ==========

  @happy-path @smoke-test @US-602
  Scenario: 完成里程碑獲得基礎積分
    Given I am logged in as freelancer "dev@example.com"
    And my current RP is 750 (Gold III)
    And I completed milestone with amount NT$ 50,000
    When the milestone is approved by the client
    Then I should earn base RP of 35
    And my total RP should be 785
    And I should see a notification "獲得 35 RP！"

  @happy-path @US-602
  Scenario: 準時交付獲得加成積分
    Given I completed a milestone
    And I submitted 5 days before deadline
    And the milestone passed acceptance on first try
    When calculating my RP reward
    Then I should get base RP 35
    And I should get "提前交付" multiplier 1.1
    And I should get "一次驗收通過" multiplier 1.2
    And my total earned RP should be 35 * 1.32 = 46

  @happy-path @US-602
  Scenario: 連續完成獲得額外加成
    Given I have completed 4 milestones successfully in a row
    And I just completed the 5th milestone
    When calculating my RP reward
    Then I should get the normal milestone RP
    And I should get "連續 5 次" bonus of 10 RP
    And I should see a notification "連續完成加成 +10 RP！"

  @sad-path @US-602
  Scenario: 逾期交付扣除積分
    Given my current RP is 800
    And I submitted milestone 5 days after deadline
    When calculating my RP change
    Then I should lose 25 RP for "明顯逾期 (4-7 天)"
    And my total RP should be 775
    And my streak count should reset to 0

  # ========== 晉升與降級 ==========

  @happy-path @US-602
  Scenario: 達到門檻進入晉級賽
    Given my current RP is 895 (Gold II)
    And I just earned 10 RP
    And Gold I threshold is 900
    When my RP reaches 905
    Then I should enter "晉級賽" status
    And I should see a message "進入晉級賽！完成 3 個里程碑中的 2 個即可晉升"

  @happy-path @US-602
  Scenario: 晉級賽成功晉升
    Given I am in "晉級賽" status for Gold II to Gold I
    And I have completed 2 milestones successfully out of 3
    Then I should be promoted to Gold I
    And I should receive 50 bonus RP
    And I should see a celebration animation
    And I should see a message "恭喜晉升至 Gold I！"

  # ========== 新手定位賽 ==========

  @happy-path @smoke-test @US-603
  Scenario: 新接案者完成定位賽
    Given I am a new freelancer with no tier
    And I have completed my profile
    When I complete my 5th milestone
    And the 5 milestones have earned me 180 RP (with 1.5x multiplier)
    Then I should be assigned tier "Silver III" (180 RP falls in 375-449 range)
    And I should see a message "定位賽完成！您的牌位是 Silver III"
    And I should exit "定位賽" mode

  @edge-case @US-603
  Scenario: 定位賽最高只能達到 Gold I
    Given I am in placement matches
    And I performed exceptionally in all 5 milestones
    And my calculated RP is 1200
    Then my assigned tier should be capped at Gold I (999 RP)
    And I should see a message "定位賽最高可達 Gold I，繼續努力晉升更高牌位！"
```

---

### Epic 7: 風險控管與爭議處理 (`dispute-resolution.feature`)

```gherkin
# Feature: 風險控管與爭議處理
# 目的: 透過預防機制與公正裁決降低專案風險
# 對應 PRD: TrustCase_PRD.md#epic-7-風險控管與爭議處理

Feature: Risk Control and Dispute Resolution

  # ========== 驗收標準設定 ==========

  @happy-path @smoke-test @US-701
  Scenario: 設定明確的驗收標準
    Given I am setting up milestone "前端開發"
    When I use the acceptance criteria wizard
    Then I should see suggested criteria for "網站開發" type
    And I should be able to select:
      | Category | Criteria |
      | 功能性驗收 | 所有頁面可正常瀏覽 |
      | 功能性驗收 | 表單提交功能正常 |
      | 效能性驗收 | 首頁載入時間 < 3 秒 |
      | 相容性驗收 | Chrome 最新版正常顯示 |

  @happy-path @US-701
  Scenario: AI 檢測模糊語言
    Given I am editing acceptance criteria
    When I enter "介面要美觀"
    Then I should see a warning "此描述過於主觀"
    And I should see a suggestion "建議改為：符合設計稿 90% 以上"
    When I enter "操作要流暢"
    Then I should see a suggestion "建議改為：操作回應時間 < 200ms"

  @happy-path @US-701
  Scenario: 雙方簽署確認驗收標準
    Given I have finalized the acceptance criteria
    When I press "送出給接案者確認"
    And the freelancer reviews and accepts
    And the freelancer signs electronically
    And I sign electronically
    Then the acceptance criteria should be locked
    And neither party can modify unilaterally
    And a timestamp should be recorded

  # ========== 變更請求 ==========

  @happy-path @smoke-test @US-702
  Scenario: 案主提交變更請求
    Given milestone "前端開發" is in progress
    And the original scope is "3 頁面設計"
    When I submit a change request
    And I describe "增加一個購物車頁面"
    And I select reason "行銷需求"
    Then the system should classify it as "中幅變更"
    And the system should suggest "建議另開里程碑"
    And the freelancer should receive notification

  @happy-path @US-702
  Scenario: 接案者回應變更請求
    Given I am logged in as freelancer
    And I received a change request for "增加購物車頁面"
    When I review the request
    And I agree to create a new milestone
    And I propose additional fee NT$ 8,000
    And I propose additional time 3 days
    Then the proposal should be sent to client
    And the change request status should be "待確認"

  @happy-path @US-702
  Scenario: 變更記錄自動留存
    Given a change request has been processed
    When I view the project history
    Then I should see the change request log
    And the log should include:
      | Field | Value |
      | 發起人 | 案主 王小明 |
      | 原始需求 | 3 頁面設計 |
      | 變更內容 | 增加購物車頁面 |
      | 處理方式 | 新增里程碑 |
      | 雙方確認時間 | 2026-01-25 14:30 |

  # ========== 爭議處理 ==========

  @happy-path @smoke-test @US-703
  Scenario: 發起爭議進入協商期
    Given milestone "前端開發" is in dispute
    When I click "提出爭議"
    And I describe the issue
    And I attach evidence
    Then a dispute should be opened
    And the dispute status should be "協商中"
    And both parties should have 3 days to resolve
    And the escrow should remain frozen

  @happy-path @US-703
  Scenario: 協商期內自行解決爭議
    Given a dispute is in "協商中" status
    And we have been negotiating for 2 days
    When both parties reach an agreement
    And I click "爭議已解決"
    And the other party confirms
    Then the dispute should be closed
    And the agreed resolution should be executed
    And the escrow should be released accordingly

  @happy-path @US-703
  Scenario: 協商失敗進入平台審查
    Given a dispute has been in "協商中" for 3 days
    And no resolution has been reached
    When the 3-day period expires
    Then the dispute should escalate to "平台審查"
    And both parties should receive notification
    And a platform reviewer should be assigned

  @edge-case @US-703
  Scenario: 系統自動裁決規則可判定的爭議
    Given a dispute is about "逾期交付"
    And the system has evidence that:
      | Fact | Value |
      | 約定截止日 | 2026-01-20 |
      | 實際提交日 | 2026-01-25 |
      | 逾期天數 | 5 天 |
    When the platform reviews the dispute
    Then the system should auto-determine the outcome
    And the ruling should be "接案者逾期，依合約扣款"
    And the corresponding penalty should be applied

  # ========== 關鍵共識記錄 ==========

  @happy-path @smoke-test @US-704
  Scenario: 記錄線下溝通的關鍵共識
    Given I had an offline discussion with the freelancer
    When I go to "同步線下共識" page
    And I select communication method "Line"
    And I enter date "2026-01-25"
    And I enter summary:
      """
      1. 首頁 Banner 改為 5 張輪播
      2. 新增會員生日優惠功能
      3. 上述變更作為新里程碑，報價 NT$15,000
      """
    And I upload Line chat screenshot
    And I press "送出給對方確認"
    Then the consensus record should be created
    And the freelancer should receive notification

  @happy-path @US-704
  Scenario: 對方確認共識記錄
    Given I am logged in as freelancer
    And I received a consensus record from client
    When I review the record
    And the content matches our discussion
    And I press "確認"
    Then the consensus should be marked as "雙方確認"
    And it should become an official project appendix
    And it should be admissible as evidence in disputes

  @sad-path @US-704
  Scenario: 對方拒絕共識記錄
    Given I received a consensus record
    And the content does not match my understanding
    When I press "有異議"
    And I describe my version of the discussion
    Then the record should be marked as "有爭議"
    And both versions should be saved
    And the client should be notified
```

---

## Ⅳ. 最佳實踐

1. **一個 Scenario 只測一件事**: 保持每個場景的專注性和簡潔性。

2. **使用陳述式而非命令式**: `Then` 應該描述「系統的狀態是什麼」，而不是「系統應該做什麼」。
   - **好的**: `Then I should be redirected to the dashboard`
   - **不好的**: `Then the system redirects me to the dashboard`

3. **避免 UI 細節**: BDD 關注的是「行為」，而不是「實現方式」。
   - **好的**: `When I confirm my order`
   - **不好的**: `When I click the green "Confirm" button with id "btn-confirm"`

4. **從使用者的角度編寫**: 讓非技術人員也能輕鬆讀懂。

5. **使用標籤分類**:
   - `@happy-path`: 正常流程
   - `@sad-path`: 錯誤處理
   - `@edge-case`: 邊界情況
   - `@smoke-test`: 煙霧測試（核心功能）
   - `@US-XXX`: 對應的 User Story ID

---

## LLM Prompting Guide

使用以下 Prompt 讓 LLM 根據 BDD 情境生成程式碼：

```
請根據以下的 BDD 情境，使用 Clean Architecture 和 TDD 方法，
為我生成對應的 Controller、Use Case、Entity 以及一個初步的、
會失敗的單元測試。

情境如下：

[貼上 Gherkin Scenario 文本]
```

---

**文件結束**
