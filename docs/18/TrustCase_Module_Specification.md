# 模組規格與測試案例 (Module Specification & Test Cases) - TrustCase

---

**文件版本 (Document Version):** `v1.0`
**最後更新 (Last Updated):** `2026-02-01`
**主要作者 (Lead Author):** `開發工程師`
**審核者 (Reviewers):** `技術負責人`
**狀態 (Status):** `草稿 (Draft)`

---

## 目錄 (Table of Contents)

- [模組 1: AuthService](#模組-1-authservice)
- [模組 2: ProjectService](#模組-2-projectservice)
- [模組 3: MilestoneService](#模組-3-milestoneservice)
- [模組 4: EscrowService](#模組-4-escrowservice)
- [模組 5: TierService](#模組-5-tierservice)
- [模組 6: DisputeService](#模組-6-disputeservice)
- [模組 7: AgentService](#模組-7-agentservice)

---

**目的**: 本文件旨在將高層次的 BDD 情境分解到具體的模組或類別層級，定義其詳細規格、測試場景，並使用契約式設計 (Design by Contract, DbC) 來精確定義每個函式的職責邊界。這是最低層級、最精確的規格，直接指導 TDD (測試驅動開發) 的實踐。

---

## 模組 1: AuthService

**對應架構文件**: `TrustCase_Architecture.md#auth-module`
**對應 BDD Feature**: `TrustCase_BDD.md#epic-1-authentication`

---

### 規格 1.1: `register`

**描述 (Description)**: 註冊新使用者帳號，發送驗證郵件。

**函式簽名**:
```typescript
async register(input: RegisterInput): Promise<RegisterResult>

interface RegisterInput {
  email: string;
  password: string;
  role: UserRole;
}

interface RegisterResult {
  user: User;
  verificationToken: string;
}
```

**契約式設計 (Design by Contract, DbC)**:

*   **前置條件 (Preconditions)**:
    1. `email` 必須符合 Email 格式
    2. `email` 不可為空字串
    3. `password` 長度必須 >= 8 個字元
    4. `password` 必須包含大小寫字母和數字
    5. `role` 必須是有效的 `UserRole` 列舉值

*   **後置條件 (Postconditions)**:
    1. 資料庫中存在一筆新的 `User` 記錄
    2. `user.email` 等於輸入的 `email`
    3. `user.passwordHash` 是 `password` 的 bcrypt 雜湊
    4. `user.isVerified` 為 `false`
    5. `user.verifyToken` 不為空
    6. 驗證郵件已加入發送佇列

*   **不變性 (Invariants)**:
    1. 系統中不存在重複的 `email`
    2. `passwordHash` 永遠不等於原始 `password`

---

### 測試情境與案例: `register`

#### 情境 1: 正常路徑 (Happy Path)

*   **測試案例 ID**: `TC-Auth-001`
*   **描述**: 成功使用有效的 Email 和密碼註冊新帳號
*   **測試步驟 (Arrange-Act-Assert)**:
    1. **Arrange**: 準備有效的註冊資料 `{ email: "newuser@example.com", password: "SecurePass123!", role: "BOTH" }`
    2. **Act**: 呼叫 `authService.register(input)`
    3. **Assert**:
        * 驗證回傳的 `user.id` 存在且格式為 `usr_xxx`
        * 驗證 `user.email` 為 `"newuser@example.com"`
        * 驗證 `user.isVerified` 為 `false`
        * 驗證資料庫中存在該使用者
        * 驗證 `emailQueue` 中有一封驗證信

#### 情境 2: 重複 Email (Conflict)

*   **測試案例 ID**: `TC-Auth-002`
*   **描述**: 嘗試使用已存在的 Email 註冊
*   **測試步驟 (Arrange-Act-Assert)**:
    1. **Arrange**: 資料庫中已存在 `email: "existing@example.com"` 的使用者
    2. **Act**: 呼叫 `authService.register({ email: "existing@example.com", ... })`
    3. **Assert**:
        * 預期拋出 `ConflictError`
        * 錯誤碼為 `user_email_exists`

#### 情境 3: 無效 Email 格式 (違反前置條件)

*   **測試案例 ID**: `TC-Auth-003`
*   **描述**: 使用無效的 Email 格式註冊
*   **測試步驟 (Arrange-Act-Assert)**:
    1. **Arrange**: 準備無效的 Email `{ email: "invalid-email", ... }`
    2. **Act**: 呼叫 `authService.register(input)`
    3. **Assert**:
        * 預期拋出 `ValidationError`
        * 錯誤訊息包含 "Email 格式不正確"

#### 情境 4: 密碼太短 (違反前置條件)

*   **測試案例 ID**: `TC-Auth-004`
*   **描述**: 使用少於 8 個字元的密碼註冊
*   **測試步驟 (Arrange-Act-Assert)**:
    1. **Arrange**: 準備短密碼 `{ password: "123", ... }`
    2. **Act**: 呼叫 `authService.register(input)`
    3. **Assert**:
        * 預期拋出 `ValidationError`
        * 錯誤訊息包含 "密碼至少需要 8 個字元"

---

### 規格 1.2: `login`

**描述 (Description)**: 驗證使用者憑證並回傳 JWT Token。

**函式簽名**:
```typescript
async login(input: LoginInput): Promise<LoginResult>

interface LoginInput {
  email: string;
  password: string;
}

interface LoginResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: UserSummary;
}
```

**契約式設計 (Design by Contract, DbC)**:

*   **前置條件 (Preconditions)**:
    1. `email` 不可為空字串
    2. `password` 不可為空字串

*   **後置條件 (Postconditions)**:
    1. 回傳的 `accessToken` 是有效的 JWT，有效期 15 分鐘
    2. 回傳的 `refreshToken` 是有效的 JWT，有效期 7 天
    3. Token 的 payload 包含 `userId` 和 `role`

*   **不變性 (Invariants)**:
    1. 登入失敗不會洩漏使用者是否存在的資訊

---

### 測試情境與案例: `login`

#### 情境 1: 正常路徑 (Happy Path)

*   **測試案例 ID**: `TC-Auth-005`
*   **描述**: 使用正確的帳號密碼成功登入
*   **測試步驟 (Arrange-Act-Assert)**:
    1. **Arrange**: 資料庫中存在已驗證的使用者 `{ email: "user@example.com", passwordHash: bcrypt("password123") }`
    2. **Act**: 呼叫 `authService.login({ email: "user@example.com", password: "password123" })`
    3. **Assert**:
        * 驗證 `accessToken` 可被解碼
        * 驗證 Token payload 包含正確的 `userId`
        * 驗證 `expiresIn` 為 900 (秒)

#### 情境 2: 錯誤密碼 (Authentication Failed)

*   **測試案例 ID**: `TC-Auth-006`
*   **描述**: 使用錯誤的密碼登入
*   **測試步驟 (Arrange-Act-Assert)**:
    1. **Arrange**: 資料庫中存在使用者
    2. **Act**: 呼叫 `authService.login({ email: "user@example.com", password: "wrong-password" })`
    3. **Assert**:
        * 預期拋出 `AuthenticationError`
        * 錯誤碼為 `auth_credentials_invalid`
        * 錯誤訊息為 "Email 或密碼錯誤" (不透露是哪個錯)

#### 情境 3: 未驗證帳號 (Email Not Verified)

*   **測試案例 ID**: `TC-Auth-007`
*   **描述**: 使用未驗證 Email 的帳號登入
*   **測試步驟 (Arrange-Act-Assert)**:
    1. **Arrange**: 資料庫中存在 `isVerified: false` 的使用者
    2. **Act**: 呼叫 `authService.login({ ... })`
    3. **Assert**:
        * 預期拋出 `ForbiddenError`
        * 錯誤碼為 `auth_email_not_verified`

---

### 規格 1.3: `verifyEmail`

**描述 (Description)**: 驗證使用者的 Email 地址。

**函式簽名**:
```typescript
async verifyEmail(token: string): Promise<User>
```

**契約式設計 (Design by Contract, DbC)**:

*   **前置條件 (Preconditions)**:
    1. `token` 不可為空字串
    2. `token` 必須存在於資料庫中
    3. `token` 必須未過期 (24 小時內)

*   **後置條件 (Postconditions)**:
    1. 對應使用者的 `isVerified` 變為 `true`
    2. `verifyToken` 被清空
    3. `verifyExpires` 被清空

---

### 測試情境與案例: `verifyEmail`

#### 情境 1: 正常路徑 (Happy Path)

*   **測試案例 ID**: `TC-Auth-008`
*   **描述**: 使用有效的驗證連結啟用帳號
*   **測試步驟 (Arrange-Act-Assert)**:
    1. **Arrange**: 建立未驗證使用者，取得其 `verifyToken`
    2. **Act**: 呼叫 `authService.verifyEmail(token)`
    3. **Assert**:
        * 驗證回傳 `user.isVerified` 為 `true`
        * 驗證資料庫中該使用者的 `verifyToken` 為 `null`

#### 情境 2: Token 過期 (Expired Token)

*   **測試案例 ID**: `TC-Auth-009`
*   **描述**: 使用過期的驗證連結
*   **測試步驟 (Arrange-Act-Assert)**:
    1. **Arrange**: 建立使用者，設定 `verifyExpires` 為過去時間
    2. **Act**: 呼叫 `authService.verifyEmail(token)`
    3. **Assert**:
        * 預期拋出 `ValidationError`
        * 錯誤訊息包含 "驗證連結已過期"

---

## 模組 2: ProjectService

**對應架構文件**: `TrustCase_Architecture.md#project-module`
**對應 BDD Feature**: `TrustCase_BDD.md#epic-3-milestone-management`

---

### 規格 2.1: `createProject`

**描述 (Description)**: 建立新專案。

**函式簽名**:
```typescript
async createProject(userId: string, input: CreateProjectInput): Promise<Project>

interface CreateProjectInput {
  title: string;
  description?: string;
  type: ProjectType;
  budgetMin: number;
  budgetMax: number;
  deadline?: Date;
  isPoc?: boolean;
}
```

**契約式設計 (Design by Contract, DbC)**:

*   **前置條件 (Preconditions)**:
    1. `userId` 對應的使用者必須存在且已驗證
    2. 使用者角色必須包含 `CLIENT` 或 `BOTH`
    3. `title` 不可為空字串，長度 <= 200
    4. `budgetMin` >= 0
    5. `budgetMax` >= `budgetMin`
    6. `type` 必須是有效的 `ProjectType`

*   **後置條件 (Postconditions)**:
    1. 資料庫中存在新的 `Project` 記錄
    2. `project.clientId` 等於 `userId`
    3. `project.status` 為 `DRAFT`
    4. `project.freelancerId` 為 `null`

*   **不變性 (Invariants)**:
    1. `budgetMax` 永遠 >= `budgetMin`
    2. `status` 只能按照狀態機順序轉換

---

### 測試情境與案例: `createProject`

#### 情境 1: 正常路徑 (Happy Path)

*   **測試案例 ID**: `TC-Proj-001`
*   **描述**: 案主成功建立新專案
*   **測試步驟 (Arrange-Act-Assert)**:
    1. **Arrange**: 建立角色為 `CLIENT` 的已驗證使用者
    2. **Act**: 呼叫 `projectService.createProject(userId, { title: "電商網站", type: "WEB_DEVELOPMENT", budgetMin: 80000, budgetMax: 120000 })`
    3. **Assert**:
        * 驗證 `project.id` 格式為 `prj_xxx`
        * 驗證 `project.title` 為 "電商網站"
        * 驗證 `project.status` 為 `DRAFT`
        * 驗證 `project.clientId` 為 `userId`

#### 情境 2: 權限不足 (Authorization Failed)

*   **測試案例 ID**: `TC-Proj-002`
*   **描述**: 純接案者嘗試建立專案
*   **測試步驟 (Arrange-Act-Assert)**:
    1. **Arrange**: 建立角色為 `FREELANCER` 的使用者
    2. **Act**: 呼叫 `projectService.createProject(userId, { ... })`
    3. **Assert**:
        * 預期拋出 `ForbiddenError`
        * 錯誤碼為 `permission_denied`

#### 情境 3: 預算驗證 (Invalid Budget)

*   **測試案例 ID**: `TC-Proj-003`
*   **描述**: budgetMax 小於 budgetMin
*   **測試步驟 (Arrange-Act-Assert)**:
    1. **Arrange**: 準備 `{ budgetMin: 100000, budgetMax: 50000 }`
    2. **Act**: 呼叫 `projectService.createProject(userId, input)`
    3. **Assert**:
        * 預期拋出 `ValidationError`
        * 錯誤訊息包含 "最高預算不可低於最低預算"

---

### 規格 2.2: `assignFreelancer`

**描述 (Description)**: 將接案者指派至專案。

**函式簽名**:
```typescript
async assignFreelancer(
  projectId: string,
  freelancerId: string,
  proposalData: ProposalData
): Promise<Project>
```

**契約式設計 (Design by Contract, DbC)**:

*   **前置條件 (Preconditions)**:
    1. 專案必須存在
    2. 專案狀態必須為 `SPEC_READY` 或 `NEGOTIATING`
    3. 專案尚未指派接案者 (`freelancerId` 為 null)
    4. 接案者必須存在且角色包含 `FREELANCER`
    5. 接案者不可與案主為同一人

*   **後置條件 (Postconditions)**:
    1. `project.freelancerId` 等於 `freelancerId`
    2. `project.status` 變為 `CONTRACTED`
    3. 專案合約已建立

---

## 模組 3: MilestoneService

**對應架構文件**: `TrustCase_Architecture.md#milestone-module`
**對應 BDD Feature**: `TrustCase_BDD.md#epic-3-milestone-management`

---

### 規格 3.1: `createMilestones`

**描述 (Description)**: 為專案建立里程碑計畫。

**函式簽名**:
```typescript
async createMilestones(
  projectId: string,
  freelancerId: string,
  milestones: CreateMilestoneInput[]
): Promise<Milestone[]>

interface CreateMilestoneInput {
  name: string;
  description?: string;
  order: number;
  weight: number;  // 百分比
  dueDate?: Date;
  acceptanceCriteria: string[];
}
```

**契約式設計 (Design by Contract, DbC)**:

*   **前置條件 (Preconditions)**:
    1. 專案必須存在且狀態允許設定里程碑
    2. `freelancerId` 必須是該專案的接案者或專案尚未指派
    3. `milestones` 陣列不可為空
    4. 所有 `weight` 總和必須等於 100
    5. 每個 `order` 必須唯一且連續
    6. 每個里程碑至少有一個 `acceptanceCriteria`

*   **後置條件 (Postconditions)**:
    1. 資料庫中存在對應數量的 `Milestone` 記錄
    2. 每個 `milestone.amount` = `project.totalAmount * weight / 100`
    3. 每個 `milestone.status` 為 `PENDING`

*   **不變性 (Invariants)**:
    1. 所有里程碑的 `weight` 總和永遠為 100
    2. 所有里程碑的 `amount` 總和永遠等於 `project.totalAmount`

---

### 測試情境與案例: `createMilestones`

#### 情境 1: 正常路徑 (Happy Path)

*   **測試案例 ID**: `TC-Mile-001`
*   **描述**: 成功建立 4 個里程碑
*   **測試步驟 (Arrange-Act-Assert)**:
    1. **Arrange**: 建立 `totalAmount: 100000` 的專案
    2. **Act**: 呼叫 `milestoneService.createMilestones(projectId, freelancerId, [
         { name: "需求確認", order: 1, weight: 10, ... },
         { name: "設計", order: 2, weight: 20, ... },
         { name: "開發", order: 3, weight: 50, ... },
         { name: "上線", order: 4, weight: 20, ... }
       ])`
    3. **Assert**:
        * 驗證回傳 4 個里程碑
        * 驗證 `milestones[0].amount` 為 10000
        * 驗證 `milestones[2].amount` 為 50000
        * 驗證所有 `status` 為 `PENDING`

#### 情境 2: Weight 總和不為 100 (違反前置條件)

*   **測試案例 ID**: `TC-Mile-002`
*   **描述**: 里程碑權重總和不等於 100
*   **測試步驟 (Arrange-Act-Assert)**:
    1. **Arrange**: 準備權重總和為 90 的里程碑
    2. **Act**: 呼叫 `milestoneService.createMilestones(...)`
    3. **Assert**:
        * 預期拋出 `ValidationError`
        * 錯誤訊息包含 "里程碑權重總和必須為 100%"

---

### 規格 3.2: `submitDeliverable`

**描述 (Description)**: 接案者提交里程碑交付物。

**函式簽名**:
```typescript
async submitDeliverable(
  milestoneId: string,
  freelancerId: string,
  deliverables: DeliverableInput[],
  notes?: string
): Promise<Milestone>

interface DeliverableInput {
  type: DeliverableType;
  name: string;
  url?: string;
  fileKey?: string;
}
```

**契約式設計 (Design by Contract, DbC)**:

*   **前置條件 (Preconditions)**:
    1. 里程碑必須存在
    2. `freelancerId` 必須是該專案的接案者
    3. 里程碑狀態必須為 `FUNDED` 或 `IN_PROGRESS` 或 `REVISION_NEEDED`
    4. `deliverables` 陣列不可為空
    5. 每個 deliverable 必須有 `url` 或 `fileKey`

*   **後置條件 (Postconditions)**:
    1. 里程碑狀態變為 `SUBMITTED`
    2. `milestone.submittedAt` 設為當前時間
    3. 資料庫中存在對應的 `Deliverable` 記錄
    4. 檔案的 SHA-256 雜湊已計算並儲存
    5. 案主收到驗收通知

*   **不變性 (Invariants)**:
    1. 提交時間不可晚於截止日期 (用於計算準時率)

---

### 測試情境與案例: `submitDeliverable`

#### 情境 1: 正常路徑 (Happy Path)

*   **測試案例 ID**: `TC-Mile-003`
*   **描述**: 成功提交里程碑交付物
*   **測試步驟 (Arrange-Act-Assert)**:
    1. **Arrange**: 建立狀態為 `FUNDED` 的里程碑
    2. **Act**: 呼叫 `milestoneService.submitDeliverable(milestoneId, freelancerId, [
         { type: "LINK", name: "Figma 設計稿", url: "https://figma.com/..." }
       ])`
    3. **Assert**:
        * 驗證 `milestone.status` 為 `SUBMITTED`
        * 驗證 `milestone.submittedAt` 不為 null
        * 驗證 `deliverables` 長度為 1
        * 驗證通知已發送

#### 情境 2: 狀態不允許提交 (Invalid State)

*   **測試案例 ID**: `TC-Mile-004`
*   **描述**: 嘗試對已驗收的里程碑提交
*   **測試步驟 (Arrange-Act-Assert)**:
    1. **Arrange**: 建立狀態為 `ACCEPTED` 的里程碑
    2. **Act**: 呼叫 `milestoneService.submitDeliverable(...)`
    3. **Assert**:
        * 預期拋出 `BusinessError`
        * 錯誤碼為 `milestone_status_invalid`

---

### 規格 3.3: `acceptMilestone`

**描述 (Description)**: 案主驗收通過里程碑。

**函式簽名**:
```typescript
async acceptMilestone(
  milestoneId: string,
  clientId: string,
  feedback?: string,
  rating?: number
): Promise<AcceptanceResult>

interface AcceptanceResult {
  milestone: Milestone;
  escrow: EscrowTransaction;
  rpEarned: RPCalculation;
}
```

**契約式設計 (Design by Contract, DbC)**:

*   **前置條件 (Preconditions)**:
    1. 里程碑必須存在
    2. `clientId` 必須是該專案的案主
    3. 里程碑狀態必須為 `SUBMITTED`
    4. 里程碑已有託管款項

*   **後置條件 (Postconditions)**:
    1. 里程碑狀態變為 `ACCEPTED`
    2. `milestone.acceptedAt` 設為當前時間
    3. 託管款項狀態變為 `RELEASING`
    4. 接案者的 RP 已計算並更新
    5. 接案者的 KPI 已更新

*   **不變性 (Invariants)**:
    1. 撥款金額 = 託管金額 - 平台服務費

---

### 測試情境與案例: `acceptMilestone`

#### 情境 1: 正常路徑 - 準時一次通過

*   **測試案例 ID**: `TC-Mile-005`
*   **描述**: 案主驗收通過，接案者獲得加成積分
*   **測試步驟 (Arrange-Act-Assert)**:
    1. **Arrange**:
        * 建立 `SUBMITTED` 狀態的里程碑，金額 50000
        * 提交時間早於截止日 3 天
        * `revisionCount` 為 0
    2. **Act**: 呼叫 `milestoneService.acceptMilestone(milestoneId, clientId, "很滿意", 5)`
    3. **Assert**:
        * 驗證 `milestone.status` 為 `ACCEPTED`
        * 驗證 `escrow.status` 為 `RELEASING`
        * 驗證 `escrow.freelancerPayout` 為 45000 (50000 * 0.9)
        * 驗證 `rpEarned.baseRP` 為 35
        * 驗證 `rpEarned.multipliers` 包含 "提前交付" 和 "一次驗收通過"

#### 情境 2: 自動驗收 (逾時)

*   **測試案例 ID**: `TC-Mile-006`
*   **描述**: 案主 7 天未回應，系統自動驗收
*   **測試步驟 (Arrange-Act-Assert)**:
    1. **Arrange**: 建立 `submittedAt` 為 8 天前的里程碑
    2. **Act**: 觸發 `milestoneService.processAutoAcceptance()` 排程任務
    3. **Assert**:
        * 驗證 `milestone.status` 變為 `ACCEPTED`
        * 驗證通知已發送給雙方

---

### 規格 3.4: `requestRevision`

**描述 (Description)**: 案主要求修改里程碑交付物。

**函式簽名**:
```typescript
async requestRevision(
  milestoneId: string,
  clientId: string,
  feedback: string,
  criteriaIds?: string[]
): Promise<Milestone>
```

**契約式設計 (Design by Contract, DbC)**:

*   **前置條件 (Preconditions)**:
    1. 里程碑狀態必須為 `SUBMITTED`
    2. `clientId` 必須是專案案主
    3. `feedback` 不可為空字串
    4. `milestone.revisionCount` < `milestone.maxRevisions`

*   **後置條件 (Postconditions)**:
    1. 里程碑狀態變為 `REVISION_NEEDED`
    2. `milestone.revisionCount` 增加 1
    3. 接案者收到修改通知

---

### 測試情境與案例: `requestRevision`

#### 情境 1: 正常路徑 (Happy Path)

*   **測試案例 ID**: `TC-Mile-007`
*   **描述**: 案主成功要求修改
*   **測試步驟 (Arrange-Act-Assert)**:
    1. **Arrange**: 建立 `SUBMITTED` 狀態，`revisionCount: 0` 的里程碑
    2. **Act**: 呼叫 `milestoneService.requestRevision(milestoneId, clientId, "請調整配色")`
    3. **Assert**:
        * 驗證 `milestone.status` 為 `REVISION_NEEDED`
        * 驗證 `milestone.revisionCount` 為 1

#### 情境 2: 超過修改次數上限 (Business Rule)

*   **測試案例 ID**: `TC-Mile-008`
*   **描述**: 已達修改次數上限仍要求修改
*   **測試步驟 (Arrange-Act-Assert)**:
    1. **Arrange**: 建立 `revisionCount: 2, maxRevisions: 2` 的里程碑
    2. **Act**: 呼叫 `milestoneService.requestRevision(...)`
    3. **Assert**:
        * 預期拋出 `BusinessError`
        * 錯誤碼為 `milestone_revision_exceeded`

---

## 模組 4: EscrowService

**對應架構文件**: `TrustCase_Architecture.md#escrow-module`
**對應 BDD Feature**: `TrustCase_BDD.md#epic-4-escrow-payment`

---

### 規格 4.1: `fundMilestone`

**描述 (Description)**: 案主為里程碑進行託管付款。

**函式簽名**:
```typescript
async fundMilestone(
  milestoneId: string,
  clientId: string,
  paymentMethod: PaymentMethod,
  returnUrl: string
): Promise<FundingResult>

interface FundingResult {
  escrowId: string;
  paymentUrl: string;
  expiresAt: Date;
}
```

**契約式設計 (Design by Contract, DbC)**:

*   **前置條件 (Preconditions)**:
    1. 里程碑必須存在
    2. `clientId` 必須是專案案主
    3. 里程碑狀態必須為 `PENDING`
    4. 里程碑尚未有託管交易

*   **後置條件 (Postconditions)**:
    1. 建立新的 `EscrowTransaction` 記錄，狀態為 `PENDING`
    2. 回傳金流服務商的付款頁面 URL
    3. 付款 URL 有效期為 30 分鐘

---

### 測試情境與案例: `fundMilestone`

#### 情境 1: 正常路徑 (Happy Path)

*   **測試案例 ID**: `TC-Escr-001`
*   **描述**: 成功取得付款頁面 URL
*   **測試步驟 (Arrange-Act-Assert)**:
    1. **Arrange**: 建立 `PENDING` 狀態的里程碑
    2. **Act**: 呼叫 `escrowService.fundMilestone(milestoneId, clientId, "CREDIT_CARD", "https://callback")`
    3. **Assert**:
        * 驗證 `escrowId` 格式為 `esc_xxx`
        * 驗證 `paymentUrl` 包含金流服務商網址
        * 驗證資料庫中存在對應的 `EscrowTransaction`

#### 情境 2: 重複託管 (Already Funded)

*   **測試案例 ID**: `TC-Escr-002`
*   **描述**: 嘗試對已託管的里程碑再次付款
*   **測試步驟 (Arrange-Act-Assert)**:
    1. **Arrange**: 建立已有 `FUNDED` 狀態託管的里程碑
    2. **Act**: 呼叫 `escrowService.fundMilestone(...)`
    3. **Assert**:
        * 預期拋出 `ConflictError`
        * 錯誤碼為 `escrow_already_funded`

---

### 規格 4.2: `handlePaymentCallback`

**描述 (Description)**: 處理金流服務商的付款回調。

**函式簽名**:
```typescript
async handlePaymentCallback(
  providerData: PaymentProviderCallback
): Promise<EscrowTransaction>
```

**契約式設計 (Design by Contract, DbC)**:

*   **前置條件 (Preconditions)**:
    1. `providerData` 簽名驗證必須通過
    2. 對應的 `EscrowTransaction` 必須存在
    3. 交易狀態必須為 `PENDING`

*   **後置條件 (Postconditions)**:
    1. 若付款成功：
        * `escrow.status` 變為 `FUNDED`
        * `escrow.fundedAt` 設為當前時間
        * `milestone.status` 變為 `FUNDED`
        * 接案者收到開工通知
    2. 若付款失敗：
        * `escrow.status` 變為 `FAILED`
        * 案主收到付款失敗通知

---

### 規格 4.3: `releaseEscrow`

**描述 (Description)**: 驗收通過後釋放託管款項給接案者。

**函式簽名**:
```typescript
async releaseEscrow(escrowId: string): Promise<EscrowTransaction>
```

**契約式設計 (Design by Contract, DbC)**:

*   **前置條件 (Preconditions)**:
    1. 託管交易必須存在
    2. `escrow.status` 必須為 `FUNDED`
    3. 對應的里程碑狀態必須為 `ACCEPTED`

*   **後置條件 (Postconditions)**:
    1. 呼叫金流 API 進行撥款
    2. `escrow.status` 變為 `RELEASED`
    3. `escrow.releasedAt` 設為當前時間
    4. 接案者收到撥款通知

---

## 模組 5: TierService

**對應架構文件**: `TrustCase_Architecture.md#tier-module`
**對應 BDD Feature**: `TrustCase_BDD.md#epic-6-gamification-tier`

---

### 規格 5.1: `calculateRP`

**描述 (Description)**: 計算里程碑完成後的積分。

**函式簽名**:
```typescript
calculateRP(
  milestone: Milestone,
  stats: FreelancerStats
): RPCalculation

interface RPCalculation {
  baseRP: number;
  multipliers: { name: string; value: number }[];
  bonuses: { name: string; value: number }[];
  totalRP: number;
}
```

**契約式設計 (Design by Contract, DbC)**:

*   **前置條件 (Preconditions)**:
    1. `milestone.status` 必須為 `ACCEPTED`
    2. `milestone.amount` 必須 > 0

*   **後置條件 (Postconditions)**:
    1. `baseRP` 根據金額區間計算
    2. `multipliers` 乘積上限為 1.5
    3. `totalRP` = floor(baseRP * multiplierProduct) + sum(bonuses)
    4. `totalRP` 上限為 100

*   **不變性 (Invariants)**:
    1. 計算結果永遠為非負整數
    2. 相同輸入永遠產生相同輸出 (純函數)

---

### 測試情境與案例: `calculateRP`

#### 情境 1: 基礎積分計算

*   **測試案例 ID**: `TC-Tier-001`
*   **描述**: 計算不同金額區間的基礎積分
*   **測試步驟 (Arrange-Act-Assert)**:
    ```
    | 金額 (NTD) | 預期 baseRP |
    | 5,000      | 10          |
    | 15,000     | 20          |
    | 50,000     | 35          |
    | 150,000    | 50          |
    | 500,000    | 70          |
    ```

#### 情境 2: 表現乘數計算

*   **測試案例 ID**: `TC-Tier-002`
*   **描述**: 提前交付 + 一次驗收通過的乘數計算
*   **測試步驟 (Arrange-Act-Assert)**:
    1. **Arrange**:
        * 里程碑金額 50000 (baseRP = 35)
        * 提前 5 天交付
        * revisionCount = 0
    2. **Act**: 呼叫 `tierService.calculateRP(milestone, stats)`
    3. **Assert**:
        * 驗證 `multipliers` 包含 `{ name: "提前交付", value: 1.1 }`
        * 驗證 `multipliers` 包含 `{ name: "一次驗收通過", value: 1.2 }`
        * 驗證 `totalRP` = floor(35 * 1.1 * 1.2) = 46

#### 情境 3: 乘數上限

*   **測試案例 ID**: `TC-Tier-003`
*   **描述**: 乘數超過 1.5 時被截斷
*   **測試步驟 (Arrange-Act-Assert)**:
    1. **Arrange**: 所有加成條件都滿足 (1.1 * 1.2 * 1.15 * 1.1 = 1.67)
    2. **Act**: 呼叫 `tierService.calculateRP(milestone, stats)`
    3. **Assert**:
        * 驗證實際使用的乘數為 1.5
        * 驗證 `totalRP` = floor(35 * 1.5) + bonuses

#### 情境 4: 連續完成加成

*   **測試案例 ID**: `TC-Tier-004`
*   **描述**: 連續 5 次完成獲得額外獎勵
*   **測試步驟 (Arrange-Act-Assert)**:
    1. **Arrange**: `stats.currentStreak = 4` (即將完成第 5 次)
    2. **Act**: 呼叫 `tierService.calculateRP(milestone, stats)`
    3. **Assert**:
        * 驗證 `bonuses` 包含 `{ name: "連續 5 次", value: 10 }`

---

### 規格 5.2: `updateStats`

**描述 (Description)**: 更新接案者的統計數據和牌位。

**函式簽名**:
```typescript
async updateStats(
  freelancerId: string,
  rpChange: number,
  milestoneResult: MilestoneResult
): Promise<FreelancerStats>

type MilestoneResult = 'SUCCESS' | 'LATE' | 'FAILED';
```

**契約式設計 (Design by Contract, DbC)**:

*   **前置條件 (Preconditions)**:
    1. 接案者統計記錄必須存在

*   **後置條件 (Postconditions)**:
    1. `stats.ratingPoints` 增加或減少 `rpChange`
    2. `stats.totalMilestones` 增加 1
    3. 若成功且準時：`stats.onTimeMilestones` 增加 1
    4. 若一次驗收通過：`stats.firstPassMilestones` 增加 1
    5. KPI 比率已重新計算
    6. 若達到晉升門檻：觸發晉級賽邏輯

---

### 規格 5.3: `checkPromotion`

**描述 (Description)**: 檢查並處理牌位晉升。

**函式簽名**:
```typescript
async checkPromotion(freelancerId: string): Promise<PromotionResult | null>

interface PromotionResult {
  oldTier: Tier;
  newTier: Tier;
  bonusRP: number;
}
```

**契約式設計 (Design by Contract, DbC)**:

*   **前置條件 (Preconditions)**:
    1. 接案者統計記錄必須存在
    2. `stats.ratingPoints` 必須達到下一牌位門檻

*   **後置條件 (Postconditions)**:
    1. 若符合晉升條件：
        * `stats.tier` 更新為新牌位
        * `stats.ratingPoints` 增加晉升獎勵 (大段位 +50)
    2. 發送晉升通知

---

## 模組 6: DisputeService

**對應架構文件**: `TrustCase_Architecture.md#dispute-module`
**對應 BDD Feature**: `TrustCase_BDD.md#epic-7-dispute-resolution`

---

### 規格 6.1: `openDispute`

**描述 (Description)**: 發起爭議。

**函式簽名**:
```typescript
async openDispute(
  milestoneId: string,
  initiatorId: string,
  input: OpenDisputeInput
): Promise<Dispute>

interface OpenDisputeInput {
  type: DisputeType;
  description: string;
  evidenceIds?: string[];
}
```

**契約式設計 (Design by Contract, DbC)**:

*   **前置條件 (Preconditions)**:
    1. 里程碑必須存在
    2. `initiatorId` 必須是專案參與者 (案主或接案者)
    3. 里程碑狀態必須為 `SUBMITTED` 或 `REVISION_NEEDED` 或 `FUNDED`
    4. 該里程碑不存在進行中的爭議

*   **後置條件 (Postconditions)**:
    1. 建立新的 `Dispute` 記錄，狀態為 `NEGOTIATING`
    2. `negotiationDeadline` 設為 3 天後
    3. 里程碑狀態變為 `DISPUTED`
    4. 託管款項狀態變為 `FROZEN`
    5. 雙方收到爭議通知

---

### 測試情境與案例: `openDispute`

#### 情境 1: 正常路徑 (Happy Path)

*   **測試案例 ID**: `TC-Disp-001`
*   **描述**: 案主成功發起爭議
*   **測試步驟 (Arrange-Act-Assert)**:
    1. **Arrange**: 建立 `SUBMITTED` 狀態的里程碑
    2. **Act**: 呼叫 `disputeService.openDispute(milestoneId, clientId, { type: "DELIVERY_QUALITY", description: "品質不符" })`
    3. **Assert**:
        * 驗證 `dispute.status` 為 `NEGOTIATING`
        * 驗證 `dispute.negotiationDeadline` 為 3 天後
        * 驗證 `milestone.status` 變為 `DISPUTED`
        * 驗證 `escrow.status` 變為 `FROZEN`

#### 情境 2: 重複發起爭議 (Conflict)

*   **測試案例 ID**: `TC-Disp-002`
*   **描述**: 嘗試對已有爭議的里程碑再次發起
*   **測試步驟 (Arrange-Act-Assert)**:
    1. **Arrange**: 里程碑已有 `NEGOTIATING` 狀態的爭議
    2. **Act**: 呼叫 `disputeService.openDispute(...)`
    3. **Assert**:
        * 預期拋出 `ConflictError`
        * 錯誤訊息包含 "已存在進行中的爭議"

---

### 規格 6.2: `resolveDispute`

**描述 (Description)**: 解決爭議。

**函式簽名**:
```typescript
async resolveDispute(
  disputeId: string,
  resolverId: string,
  input: ResolveDisputeInput
): Promise<Dispute>

interface ResolveDisputeInput {
  resolutionType: ResolutionType;
  description: string;
  agreedByBoth?: boolean;
  escrowSplit?: { clientPercent: number; freelancerPercent: number };
}
```

**契約式設計 (Design by Contract, DbC)**:

*   **前置條件 (Preconditions)**:
    1. 爭議必須存在
    2. `resolverId` 必須是爭議當事人或管理員
    3. 爭議狀態必須為 `NEGOTIATING` 或 `PLATFORM_REVIEW`
    4. 若為雙方協議解決：`agreedByBoth` 必須為 `true`

*   **後置條件 (Postconditions)**:
    1. 爭議狀態變為 `RESOLVED`
    2. `dispute.resolvedAt` 設為當前時間
    3. 里程碑狀態根據解決方案更新
    4. 託管款項根據 `escrowSplit` 分配

---

## 模組 7: AgentService

**對應架構文件**: `TrustCase_Architecture.md#llm-agent-service`
**對應 BDD Feature**: `TrustCase_BDD.md#epic-2-requirement-guidance`

---

### 規格 7.1: `detectProjectType`

**描述 (Description)**: 識別專案類型。

**函式簽名**:
```typescript
async detectProjectType(description: string): Promise<TypeDetectionResult>

interface TypeDetectionResult {
  detectedType: ProjectType;
  subType?: string;
  confidence: number;
  message: string;
}
```

**契約式設計 (Design by Contract, DbC)**:

*   **前置條件 (Preconditions)**:
    1. `description` 不可為空字串
    2. `description` 長度 >= 5 個字元

*   **後置條件 (Postconditions)**:
    1. `confidence` 介於 0 和 1 之間
    2. `detectedType` 為有效的 `ProjectType`
    3. `message` 為友善的確認訊息

---

### 測試情境與案例: `detectProjectType`

#### 情境 1: 明確的專案描述

*   **測試案例 ID**: `TC-Agent-001`
*   **描述**: 正確識別電商網站類型
*   **測試步驟 (Arrange-Act-Assert)**:
    1. **Arrange**: 準備描述 "我想做一個賣蛋糕的網站"
    2. **Act**: 呼叫 `agentService.detectProjectType(description)`
    3. **Assert**:
        * 驗證 `detectedType` 為 `WEB_DEVELOPMENT`
        * 驗證 `subType` 為 `E_COMMERCE`
        * 驗證 `confidence` > 0.8

#### 情境 2: 模糊的專案描述

*   **測試案例 ID**: `TC-Agent-002`
*   **描述**: 處理模糊的描述
*   **測試步驟 (Arrange-Act-Assert)**:
    1. **Arrange**: 準備描述 "幫我做一些東西"
    2. **Act**: 呼叫 `agentService.detectProjectType(description)`
    3. **Assert**:
        * 驗證 `confidence` < 0.5
        * 驗證回傳 `message` 詢問更多資訊

---

### 規格 7.2: `processConversation`

**描述 (Description)**: 處理需求引導對話。

**函式簽名**:
```typescript
async processConversation(
  sessionId: string,
  userMessage: string
): Promise<ConversationResponse>

interface ConversationResponse {
  sessionId: string;
  message: string;
  questions?: Question[];
  collectedInfo: Record<string, any>;
  progress: number;
  isComplete: boolean;
}
```

**契約式設計 (Design by Contract, DbC)**:

*   **前置條件 (Preconditions)**:
    1. 若 `sessionId` 存在，對應的 session 狀態必須有效
    2. `userMessage` 不可為空字串

*   **後置條件 (Postconditions)**:
    1. Session 狀態已更新
    2. `collectedInfo` 包含從對話中提取的資訊
    3. `progress` 介於 0 和 1 之間
    4. 若所有必要資訊已收集：`isComplete` 為 `true`

---

### 規格 7.3: `generateSpec`

**描述 (Description)**: 根據對話內容生成 SPEC 文件。

**函式簽名**:
```typescript
async generateSpec(sessionId: string): Promise<Spec>

interface Spec {
  id: string;
  projectOverview: ProjectOverview;
  functionalRequirements: FunctionalRequirement[];
  acceptanceCriteria: AcceptanceCriterion[];
  suggestedMilestones: SuggestedMilestone[];
  generatedAt: Date;
}
```

**契約式設計 (Design by Contract, DbC)**:

*   **前置條件 (Preconditions)**:
    1. Session 必須存在
    2. Session 的 `isComplete` 必須為 `true`

*   **後置條件 (Postconditions)**:
    1. 回傳的 SPEC 包含所有必要欄位
    2. `functionalRequirements` 依優先級排序 (P0 > P1 > P2)
    3. `suggestedMilestones` 的 weight 總和為 100

---

## 附錄 A: 測試覆蓋率目標

| 模組 | 行覆蓋率目標 | 分支覆蓋率目標 |
|:---|:---|:---|
| AuthService | 90% | 85% |
| ProjectService | 85% | 80% |
| MilestoneService | 90% | 85% |
| EscrowService | 95% | 90% |
| TierService | 90% | 85% |
| DisputeService | 85% | 80% |
| AgentService | 80% | 75% |

---

## 附錄 B: 測試資料工廠

```typescript
// 測試資料工廠範例
const TestFactory = {
  createUser: (overrides?: Partial<User>): User => ({
    id: `usr_${cuid()}`,
    email: `test-${Date.now()}@example.com`,
    passwordHash: '$2b$12$...',
    role: 'BOTH',
    isVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  createProject: (overrides?: Partial<Project>): Project => ({
    id: `prj_${cuid()}`,
    title: 'Test Project',
    type: 'WEB_DEVELOPMENT',
    status: 'DRAFT',
    totalAmount: 100000,
    escrowedAmount: 0,
    releasedAmount: 0,
    isPoc: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  createMilestone: (overrides?: Partial<Milestone>): Milestone => ({
    id: `mst_${cuid()}`,
    name: 'Test Milestone',
    order: 1,
    weight: 100,
    amount: 100000,
    status: 'PENDING',
    revisionCount: 0,
    maxRevisions: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),
};
```

---

## 附錄 C: LLM Prompting Guide

使用以下 Prompt 讓 LLM 根據測試案例生成程式碼：

```
請根據以下的測試案例規格，為我生成一個會失敗的 TDD 單元測試。

目標函式：[函式名稱]
測試案例 ID：[TC-XXX-00X]
規格如下：

[貼上測試案例文本]

請使用 Jest 測試框架，並確保測試案例清楚地遵循 Arrange-Act-Assert 模式。
```

---

**文件審核記錄 (Review History):**

| 日期 | 審核人 | 版本 | 變更摘要 |
|:---|:---|:---|:---|
| 2026-02-01 | Tech Lead | v1.0 | 初稿建立 |

---

**文件結束**
