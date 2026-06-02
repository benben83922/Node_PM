# API 設計規範 (API Design Specification) - TrustCase Platform API

---

**文件版本 (Document Version):** `v1.0.0`

**最後更新 (Last Updated):** `2026-02-01`

**主要作者/設計師 (Lead Author/Designer):** `Tech Lead`

**審核者 (Reviewers):** `API 設計委員會、架構團隊、前端開發團隊`

**狀態 (Status):** `草稿 (Draft)`

**相關文檔:** `TrustCase_Architecture.md`, `TrustCase_PRD.md`

**OpenAPI 定義文件:** `/api/openapi.yaml` (待產出)

---

## 目錄 (Table of Contents)

1. [引言 (Introduction)](#1-引言-introduction)
2. [設計原則與約定 (Design Principles and Conventions)](#2-設計原則與約定-design-principles-and-conventions)
3. [認證與授權 (Authentication and Authorization)](#3-認證與授權-authentication-and-authorization)
4. [通用 API 行為 (Common API Behaviors)](#4-通用-api-行為-common-api-behaviors)
5. [錯誤處理 (Error Handling)](#5-錯誤處理-error-handling)
6. [安全性考量 (Security Considerations)](#6-安全性考量-security-considerations)
7. [API 端點詳述 (API Endpoint Definitions)](#7-api-端點詳述-api-endpoint-definitions)
8. [資料模型定義 (Data Models / Schema Definitions)](#8-資料模型定義-data-models--schema-definitions)
9. [API 生命週期與版本控制 (API Lifecycle and Versioning)](#9-api-生命週期與版本控制-api-lifecycle-and-versioning)
10. [附錄 (Appendix)](#10-附錄-appendix)

---

## 1. 引言 (Introduction)

### 1.1 目的 (Purpose)

本文件為 TrustCase 軟體外包履約平台的 API 消費者和實現者提供一個統一、明確、易於遵循的接口契約。涵蓋認證、專案管理、里程碑、價金託管、牌位系統等核心功能。

### 1.2 目標讀者 (Target Audience)

- 前端開發者 (Next.js Web App)
- 行動端開發者 (未來 App)
- 第三方整合開發者
- QA 測試工程師
- API 實現者

### 1.3 快速入門 (Quick Start)

**第 1 步: 註冊並登入獲取 Token**

```bash
# 註冊
curl --request POST \
  --url https://api.trustcase.tw/v1/auth/register \
  --header 'Content-Type: application/json' \
  --data '{
    "email": "developer@example.com",
    "password": "SecurePass123!",
    "role": "BOTH"
  }'

# 登入
curl --request POST \
  --url https://api.trustcase.tw/v1/auth/login \
  --header 'Content-Type: application/json' \
  --data '{
    "email": "developer@example.com",
    "password": "SecurePass123!"
  }'
```

**第 2 步: 使用 Token 發送請求**

```bash
curl --request GET \
  --url https://api.trustcase.tw/v1/users/me \
  --header 'Authorization: Bearer YOUR_ACCESS_TOKEN'
```

**預期回應:**

```json
{
  "id": "usr_cuid123456",
  "email": "developer@example.com",
  "role": "BOTH",
  "is_verified": true,
  "created_at": "2026-02-01T10:00:00Z"
}
```

---

## 2. 設計原則與約定 (Design Principles and Conventions)

### 2.1 API 風格 (API Style)

- **風格:** RESTful
- **核心原則:**
  - 資源導向設計
  - 無狀態 (Stateless)
  - 標準 HTTP 方法 (GET, POST, PUT, PATCH, DELETE)
  - 可預測的 URL 結構

### 2.2 基本 URL (Base URL)

| 環境 | Base URL |
|:---|:---|
| **生產環境** | `https://api.trustcase.tw/v1` |
| **預備環境** | `https://staging-api.trustcase.tw/v1` |
| **開發環境** | `http://localhost:3001/v1` |

### 2.3 請求與回應格式 (Request and Response Formats)

- **格式:** `application/json` (UTF-8 編碼)
- **必要 Headers:**
  - `Content-Type: application/json`
  - `Accept: application/json`

### 2.4 標準 HTTP Headers

**請求 Headers:**

| Header | 必填 | 說明 |
|:---|:---|:---|
| `Authorization` | 是* | Bearer Token (除公開端點外) |
| `Content-Type` | 是 | `application/json` |
| `Accept` | 是 | `application/json` |
| `X-Request-ID` | 否 | 唯一請求 ID (UUID)，用於追蹤 |
| `Accept-Language` | 否 | 回應語言 (`zh-TW`, `en-US`) |
| `Idempotency-Key` | 否 | 冪等性金鑰 (用於 POST/PUT/PATCH) |

**回應 Headers:**

| Header | 說明 |
|:---|:---|
| `X-Request-ID` | 請求追蹤 ID |
| `RateLimit-Limit` | 速率限制上限 |
| `RateLimit-Remaining` | 剩餘請求次數 |
| `RateLimit-Reset` | 限制重置時間 (Unix timestamp) |

### 2.5 命名約定 (Naming Conventions)

| 元素 | 約定 | 範例 |
|:---|:---|:---|
| **資源路徑** | 小寫、連字符、複數 | `/projects`, `/user-profiles` |
| **查詢參數** | snake_case | `page_size`, `sort_by` |
| **JSON 欄位** | snake_case | `created_at`, `user_id` |
| **資源 ID** | 前綴 + cuid | `usr_abc123`, `prj_xyz789` |

### 2.6 ID 前綴對照表

| 資源 | 前綴 | 範例 |
|:---|:---|:---|
| User | `usr_` | `usr_clv2abc123` |
| Project | `prj_` | `prj_clv2def456` |
| Milestone | `mst_` | `mst_clv2ghi789` |
| Escrow | `esc_` | `esc_clv2jkl012` |
| Dispute | `dsp_` | `dsp_clv2mno345` |
| Deliverable | `dlv_` | `dlv_clv2pqr678` |

### 2.7 日期與時間格式 (Date and Time Formats)

- **標準格式:** ISO 8601 (UTC)
- **範例:** `2026-02-01T10:30:00Z`
- **僅日期:** `2026-02-01`

---

## 3. 認證與授權 (Authentication and Authorization)

### 3.1 認證機制 (Authentication Mechanism)

**機制:** JWT (JSON Web Token) Bearer Token

**Token 結構:**

| Token 類型 | 有效期 | 用途 |
|:---|:---|:---|
| Access Token | 15 分鐘 | API 請求認證 |
| Refresh Token | 7 天 | 刷新 Access Token |

**Token 傳遞方式:**

```
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Token 刷新流程:**

```bash
curl --request POST \
  --url https://api.trustcase.tw/v1/auth/refresh \
  --header 'Content-Type: application/json' \
  --data '{
    "refresh_token": "your_refresh_token"
  }'
```

### 3.2 授權模型 (Authorization Model)

**基於角色的訪問控制 (RBAC):**

| 角色 | 說明 | 權限 |
|:---|:---|:---|
| `CLIENT` | 案主 | 發布專案、付款、驗收 |
| `FREELANCER` | 接案者 | 報價、交付、收款 |
| `BOTH` | 雙重身份 | 案主 + 接案者權限 |
| `ADMIN` | 管理員 | 爭議處理、用戶管理 |

**資源級權限:**

- 專案相關操作需驗證用戶是該專案的參與者
- 里程碑操作需驗證用戶對應的角色權限
- 爭議處理需驗證用戶是爭議當事人或管理員

---

## 4. 通用 API 行為 (Common API Behaviors)

### 4.1 分頁 (Pagination)

**策略:** 游標分頁 (Cursor-based Pagination)

**查詢參數:**

| 參數 | 類型 | 預設值 | 說明 |
|:---|:---|:---|:---|
| `limit` | integer | 20 | 每頁數量 (最大 100) |
| `cursor` | string | - | 分頁游標 |
| `direction` | string | `next` | `next` 或 `prev` |

**回應結構:**

```json
{
  "data": [...],
  "pagination": {
    "has_more": true,
    "next_cursor": "curs_abc123",
    "prev_cursor": null,
    "total_count": 156
  }
}
```

### 4.2 排序 (Sorting)

**查詢參數:** `sort_by`

**格式:**
- 升序: `sort_by=created_at`
- 降序: `sort_by=-created_at`
- 多欄位: `sort_by=-created_at,title`

### 4.3 過濾 (Filtering)

**直接欄位過濾:**

```
GET /projects?status=IN_PROGRESS&type=WEB_DEVELOPMENT
```

**範圍過濾:**

```
GET /projects?created_at[gte]=2026-01-01&created_at[lte]=2026-01-31
GET /projects?total_amount[gte]=50000
```

**支援的操作符:**

| 操作符 | 說明 | 範例 |
|:---|:---|:---|
| `eq` | 等於 (預設) | `status=ACTIVE` |
| `ne` | 不等於 | `status[ne]=CANCELLED` |
| `gt` | 大於 | `amount[gt]=10000` |
| `gte` | 大於等於 | `created_at[gte]=2026-01-01` |
| `lt` | 小於 | `amount[lt]=100000` |
| `lte` | 小於等於 | `due_date[lte]=2026-03-01` |
| `in` | 包含於 | `status[in]=ACTIVE,PENDING` |

### 4.4 部分回應 (Partial Responses)

**查詢參數:** `fields`

```
GET /projects/prj_123?fields=id,title,status,client.email
```

### 4.5 關聯擴展 (Expanding Related Objects)

**查詢參數:** `expand`

```
GET /projects/prj_123?expand=client,freelancer,milestones
GET /milestones/mst_123?expand=deliverables,escrow_transaction
```

### 4.6 冪等性 (Idempotency)

**Header:** `Idempotency-Key`

- 對於 POST, PUT, PATCH 請求建議提供
- 有效期: 24 小時
- 相同 Key 在有效期內返回相同結果

```bash
curl --request POST \
  --url https://api.trustcase.tw/v1/escrow/fund \
  --header 'Authorization: Bearer TOKEN' \
  --header 'Idempotency-Key: unique-key-uuid-123' \
  --data '{...}'
```

---

## 5. 錯誤處理 (Error Handling)

### 5.1 標準錯誤回應格式 (Standard Error Response Format)

```json
{
  "error": {
    "type": "invalid_request_error",
    "code": "validation_failed",
    "message": "請求參數驗證失敗",
    "details": [
      {
        "field": "email",
        "message": "Email 格式不正確"
      },
      {
        "field": "password",
        "message": "密碼至少需要 8 個字元"
      }
    ],
    "request_id": "req_abc123xyz"
  }
}
```

### 5.2 錯誤類型 (Error Types)

| Type | 說明 |
|:---|:---|
| `authentication_error` | 認證失敗 |
| `authorization_error` | 權限不足 |
| `invalid_request_error` | 請求參數錯誤 |
| `resource_not_found_error` | 資源不存在 |
| `conflict_error` | 資源衝突 |
| `rate_limit_error` | 超出速率限制 |
| `api_error` | 伺服器內部錯誤 |

### 5.3 通用 HTTP 狀態碼

| 狀態碼 | 說明 | 使用場景 |
|:---|:---|:---|
| `200` | OK | 成功取得或更新資源 |
| `201` | Created | 成功建立資源 |
| `204` | No Content | 成功刪除資源 |
| `400` | Bad Request | 請求參數錯誤 |
| `401` | Unauthorized | 未提供或無效的認證 |
| `403` | Forbidden | 權限不足 |
| `404` | Not Found | 資源不存在 |
| `409` | Conflict | 資源衝突 (如重複建立) |
| `422` | Unprocessable Entity | 業務邏輯錯誤 |
| `429` | Too Many Requests | 超出速率限制 |
| `500` | Internal Server Error | 伺服器錯誤 |

### 5.4 錯誤碼字典 (Error Code Dictionary)

#### 認證相關

| Code | HTTP | 說明 |
|:---|:---|:---|
| `auth_token_missing` | 401 | 未提供 Authorization header |
| `auth_token_invalid` | 401 | Token 格式錯誤或簽名無效 |
| `auth_token_expired` | 401 | Token 已過期 |
| `auth_credentials_invalid` | 401 | Email 或密碼錯誤 |
| `auth_email_not_verified` | 403 | Email 尚未驗證 |

#### 使用者相關

| Code | HTTP | 說明 |
|:---|:---|:---|
| `user_not_found` | 404 | 使用者不存在 |
| `user_email_exists` | 409 | Email 已被註冊 |
| `user_profile_incomplete` | 422 | 個人檔案不完整 |

#### 專案相關

| Code | HTTP | 說明 |
|:---|:---|:---|
| `project_not_found` | 404 | 專案不存在 |
| `project_status_invalid` | 422 | 專案狀態不允許此操作 |
| `project_not_participant` | 403 | 非專案參與者 |

#### 里程碑相關

| Code | HTTP | 說明 |
|:---|:---|:---|
| `milestone_not_found` | 404 | 里程碑不存在 |
| `milestone_status_invalid` | 422 | 里程碑狀態不允許此操作 |
| `milestone_not_funded` | 422 | 里程碑尚未託管款項 |
| `milestone_revision_exceeded` | 422 | 超過修改次數上限 |

#### 付款相關

| Code | HTTP | 說明 |
|:---|:---|:---|
| `escrow_payment_failed` | 422 | 付款失敗 |
| `escrow_insufficient_funds` | 422 | 餘額不足 |
| `escrow_already_funded` | 409 | 已完成託管 |
| `escrow_already_released` | 409 | 已完成撥款 |

---

## 6. 安全性考量 (Security Considerations)

### 6.1 傳輸層安全 (TLS)

- 所有 API 端點強制使用 HTTPS (TLS 1.2+)
- HTTP 請求自動重導向至 HTTPS

### 6.2 HTTP 安全 Headers

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'
```

### 6.3 速率限制 (Rate Limiting)

| 端點類型 | 限制 | 時間窗口 |
|:---|:---|:---|
| 認證相關 | 10 次 | 1 分鐘 |
| 一般 API | 100 次 | 1 分鐘 |
| 上傳相關 | 20 次 | 1 分鐘 |

**回應 Headers:**

```
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 1706788800
```

### 6.4 敏感資料處理

- 密碼使用 bcrypt 單向雜湊 (cost factor 12)
- 銀行帳戶等敏感資料 AES-256 加密儲存
- 檔案上傳使用 SHA-256 雜湊驗證
- 日誌中自動遮蔽敏感欄位

---

## 7. API 端點詳述 (API Endpoint Definitions)

### 7.1 認證 (Authentication)

#### `POST /auth/register`

**說明:** 註冊新帳號

**請求體:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "role": "BOTH"
}
```

**成功回應 (201 Created):**

```json
{
  "id": "usr_clv2abc123",
  "email": "user@example.com",
  "role": "BOTH",
  "is_verified": false,
  "message": "驗證信已發送至 user@example.com"
}
```

---

#### `POST /auth/login`

**說明:** 登入取得 Token

**請求體:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**成功回應 (200 OK):**

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 900,
  "user": {
    "id": "usr_clv2abc123",
    "email": "user@example.com",
    "role": "BOTH"
  }
}
```

---

#### `POST /auth/refresh`

**說明:** 刷新 Access Token

**請求體:**

```json
{
  "refresh_token": "eyJhbGciOiJSUzI1NiIs..."
}
```

**成功回應 (200 OK):**

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 900
}
```

---

#### `POST /auth/verify`

**說明:** 驗證 Email

**請求體:**

```json
{
  "token": "verification_token_from_email"
}
```

**成功回應 (200 OK):**

```json
{
  "message": "Email 驗證成功",
  "user": {
    "id": "usr_clv2abc123",
    "is_verified": true
  }
}
```

---

### 7.2 使用者 (Users)

#### `GET /users/me`

**說明:** 取得當前登入使用者資訊

**授權:** 需要認證

**成功回應 (200 OK):**

```json
{
  "id": "usr_clv2abc123",
  "email": "user@example.com",
  "role": "BOTH",
  "is_verified": true,
  "profile": {
    "display_name": "王小明",
    "avatar_url": "https://...",
    "bio": "5 年全端開發經驗"
  },
  "freelancer_stats": {
    "tier": "GOLD_II",
    "rating_points": 850,
    "on_time_rate": 0.96,
    "first_pass_rate": 0.88,
    "total_milestones": 25
  },
  "created_at": "2026-01-15T08:00:00Z"
}
```

---

#### `PATCH /users/me`

**說明:** 更新當前使用者資訊

**授權:** 需要認證

**請求體:**

```json
{
  "profile": {
    "display_name": "王小明",
    "bio": "6 年全端開發經驗",
    "skills": ["React", "Node.js", "PostgreSQL"],
    "hourly_rate_min": 800,
    "hourly_rate_max": 1500
  }
}
```

**成功回應 (200 OK):** 返回更新後的使用者資訊

---

#### `GET /users/{user_id}`

**說明:** 取得指定使用者公開資訊

**授權:** 需要認證

**路徑參數:**

| 參數 | 類型 | 說明 |
|:---|:---|:---|
| `user_id` | string | 使用者 ID |

**成功回應 (200 OK):**

```json
{
  "id": "usr_clv2abc123",
  "profile": {
    "display_name": "王小明",
    "avatar_url": "https://...",
    "bio": "5 年全端開發經驗",
    "skills": ["React", "Node.js"]
  },
  "freelancer_stats": {
    "tier": "GOLD_II",
    "on_time_rate": 0.96,
    "first_pass_rate": 0.88,
    "total_milestones": 25
  }
}
```

---

### 7.3 專案 (Projects)

#### `POST /projects`

**說明:** 建立新專案

**授權:** 需要認證 (CLIENT 或 BOTH)

**請求體:**

```json
{
  "title": "電商網站開發",
  "description": "需要開發一個蛋糕電商網站",
  "type": "WEB_DEVELOPMENT",
  "budget_min": 80000,
  "budget_max": 120000,
  "deadline": "2026-05-01",
  "is_poc": false
}
```

**成功回應 (201 Created):**

```json
{
  "id": "prj_clv2def456",
  "title": "電商網站開發",
  "status": "DRAFT",
  "type": "WEB_DEVELOPMENT",
  "client_id": "usr_clv2abc123",
  "created_at": "2026-02-01T10:00:00Z"
}
```

---

#### `GET /projects`

**說明:** 列出專案

**授權:** 需要認證

**查詢參數:**

| 參數 | 類型 | 說明 |
|:---|:---|:---|
| `role` | string | `client` 或 `freelancer` (篩選身份) |
| `status` | string | 專案狀態過濾 |
| `type` | string | 專案類型過濾 |
| `limit` | integer | 每頁數量 |
| `cursor` | string | 分頁游標 |

**成功回應 (200 OK):**

```json
{
  "data": [
    {
      "id": "prj_clv2def456",
      "title": "電商網站開發",
      "status": "IN_PROGRESS",
      "type": "WEB_DEVELOPMENT",
      "total_amount": 100000,
      "progress": 0.4,
      "client": {
        "id": "usr_abc",
        "display_name": "甜蜜烘焙坊"
      },
      "freelancer": {
        "id": "usr_xyz",
        "display_name": "王小明",
        "tier": "GOLD_II"
      }
    }
  ],
  "pagination": {
    "has_more": true,
    "next_cursor": "curs_abc123",
    "total_count": 15
  }
}
```

---

#### `GET /projects/{project_id}`

**說明:** 取得專案詳情

**授權:** 需要認證 (專案參與者)

**查詢參數:**

| 參數 | 類型 | 說明 |
|:---|:---|:---|
| `expand` | string | 擴展關聯資源 (`spec`, `milestones`, `disputes`) |

**成功回應 (200 OK):**

```json
{
  "id": "prj_clv2def456",
  "title": "電商網站開發",
  "description": "...",
  "status": "IN_PROGRESS",
  "type": "WEB_DEVELOPMENT",
  "total_amount": 100000,
  "escrowed_amount": 40000,
  "released_amount": 20000,
  "client": { "id": "usr_abc", "display_name": "甜蜜烘焙坊" },
  "freelancer": { "id": "usr_xyz", "display_name": "王小明" },
  "spec": { ... },
  "milestones": [ ... ],
  "created_at": "2026-02-01T10:00:00Z",
  "updated_at": "2026-02-15T14:30:00Z"
}
```

---

### 7.4 LLM Agent (需求引導)

#### `POST /agent/detect-type`

**說明:** 識別專案類型

**授權:** 需要認證

**請求體:**

```json
{
  "description": "我想做一個賣蛋糕的網站"
}
```

**成功回應 (200 OK):**

```json
{
  "detected_type": "WEB_DEVELOPMENT",
  "sub_type": "E_COMMERCE",
  "confidence": 0.95,
  "message": "您想做一個蛋糕的線上購物網站"
}
```

---

#### `POST /agent/conversation`

**說明:** 需求引導對話

**授權:** 需要認證

**請求體:**

```json
{
  "session_id": "sess_abc123",
  "message": "需要會員系統，可以查看訂單記錄"
}
```

**成功回應 (200 OK):**

```json
{
  "session_id": "sess_abc123",
  "response": {
    "message": "了解，需要會員系統。請問需要支援哪些付款方式？",
    "questions": [
      {
        "id": "q_payment",
        "text": "需要支援哪些付款方式？",
        "type": "multiple_choice",
        "options": ["信用卡", "LINE Pay", "銀行轉帳", "超商代碼"]
      }
    ],
    "collected_info": {
      "member_system": true,
      "member_features": ["訂單記錄查詢"]
    }
  },
  "progress": 0.45,
  "current_layer": 2
}
```

---

#### `POST /agent/generate-spec`

**說明:** 生成 SPEC 文件

**授權:** 需要認證

**請求體:**

```json
{
  "session_id": "sess_abc123"
}
```

**成功回應 (200 OK):**

```json
{
  "spec_id": "spc_xyz789",
  "project_overview": {
    "title": "蛋糕電商網站",
    "type": "WEB_DEVELOPMENT",
    "budget_range": { "min": 80000, "max": 120000 }
  },
  "functional_requirements": [
    {
      "id": "fr_001",
      "category": "前台功能",
      "name": "商品展示",
      "description": "分類瀏覽、搜尋、篩選",
      "priority": "P0"
    }
  ],
  "acceptance_criteria": [...],
  "suggested_milestones": [...],
  "generated_at": "2026-02-01T11:00:00Z"
}
```

---

### 7.5 里程碑 (Milestones)

#### `POST /projects/{project_id}/milestones`

**說明:** 建立里程碑

**授權:** 需要認證 (FREELANCER)

**請求體:**

```json
{
  "milestones": [
    {
      "name": "需求確認",
      "description": "確認需求規格",
      "order": 1,
      "weight": 10,
      "due_date": "2026-02-10",
      "acceptance_criteria": [
        "需求文件雙方確認簽核",
        "功能清單明確列出"
      ]
    },
    {
      "name": "UI/UX 設計",
      "description": "完成所有頁面設計",
      "order": 2,
      "weight": 20,
      "due_date": "2026-02-20",
      "acceptance_criteria": [
        "所有頁面線框圖完成",
        "視覺稿經案主確認"
      ]
    }
  ]
}
```

**成功回應 (201 Created):**

```json
{
  "project_id": "prj_clv2def456",
  "milestones": [
    {
      "id": "mst_001",
      "name": "需求確認",
      "order": 1,
      "weight": 10,
      "amount": 10000,
      "status": "PENDING"
    },
    {
      "id": "mst_002",
      "name": "UI/UX 設計",
      "order": 2,
      "weight": 20,
      "amount": 20000,
      "status": "PENDING"
    }
  ],
  "total_amount": 100000
}
```

---

#### `POST /milestones/{milestone_id}/submit`

**說明:** 提交里程碑交付物

**授權:** 需要認證 (FREELANCER)

**請求體:**

```json
{
  "deliverables": [
    {
      "type": "LINK",
      "name": "Figma 設計稿",
      "url": "https://figma.com/file/xxx"
    },
    {
      "type": "FILE",
      "name": "設計說明文件",
      "file_key": "uploaded_file_key"
    }
  ],
  "notes": "已完成所有頁面設計，請查收"
}
```

**成功回應 (200 OK):**

```json
{
  "id": "mst_002",
  "status": "SUBMITTED",
  "submitted_at": "2026-02-18T15:00:00Z",
  "deliverables": [
    {
      "id": "dlv_001",
      "type": "LINK",
      "name": "Figma 設計稿",
      "url": "https://figma.com/file/xxx"
    },
    {
      "id": "dlv_002",
      "type": "FILE",
      "name": "設計說明文件",
      "file_hash": "sha256_abc123..."
    }
  ],
  "review_deadline": "2026-02-21T15:00:00Z"
}
```

---

#### `POST /milestones/{milestone_id}/accept`

**說明:** 驗收通過里程碑

**授權:** 需要認證 (CLIENT)

**請求體:**

```json
{
  "feedback": "設計符合預期，非常滿意",
  "rating": 5
}
```

**成功回應 (200 OK):**

```json
{
  "id": "mst_002",
  "status": "ACCEPTED",
  "accepted_at": "2026-02-19T10:00:00Z",
  "escrow": {
    "status": "RELEASING",
    "amount": 20000,
    "platform_fee": 2000,
    "freelancer_payout": 18000
  },
  "rp_earned": {
    "base": 20,
    "multipliers": [
      { "name": "提前交付", "value": 1.1 },
      { "name": "一次驗收通過", "value": 1.2 }
    ],
    "total": 26
  }
}
```

---

#### `POST /milestones/{milestone_id}/request-revision`

**說明:** 要求修改

**授權:** 需要認證 (CLIENT)

**請求體:**

```json
{
  "feedback": "首頁 Banner 需調整為圓角設計",
  "criteria_ids": ["crit_001"]
}
```

**成功回應 (200 OK):**

```json
{
  "id": "mst_002",
  "status": "REVISION_NEEDED",
  "revision_count": 1,
  "max_revisions": 2,
  "feedback": "首頁 Banner 需調整為圓角設計"
}
```

---

### 7.6 價金託管 (Escrow)

#### `POST /escrow/fund`

**說明:** 託管付款

**授權:** 需要認證 (CLIENT)

**請求體:**

```json
{
  "milestone_id": "mst_001",
  "payment_method": "CREDIT_CARD",
  "return_url": "https://trustcase.tw/payment/callback"
}
```

**成功回應 (200 OK):**

```json
{
  "escrow_id": "esc_abc123",
  "milestone_id": "mst_001",
  "amount": 10000,
  "status": "PENDING",
  "payment_url": "https://payment.newebpay.com/...",
  "expires_at": "2026-02-01T11:30:00Z"
}
```

---

#### `GET /escrow/{escrow_id}`

**說明:** 查詢託管狀態

**授權:** 需要認證 (專案參與者)

**成功回應 (200 OK):**

```json
{
  "id": "esc_abc123",
  "milestone_id": "mst_001",
  "amount": 10000,
  "platform_fee": 1000,
  "freelancer_payout": 9000,
  "status": "FUNDED",
  "funded_at": "2026-02-01T11:00:00Z",
  "released_at": null
}
```

---

### 7.7 牌位系統 (Tier)

#### `GET /tiers/stats`

**說明:** 取得當前用戶的牌位統計

**授權:** 需要認證 (FREELANCER)

**成功回應 (200 OK):**

```json
{
  "user_id": "usr_xyz",
  "tier": "GOLD_II",
  "rating_points": 850,
  "next_tier": "GOLD_I",
  "points_to_next": 50,
  "kpis": {
    "on_time_rate": 0.96,
    "first_pass_rate": 0.88,
    "total_milestones": 25,
    "current_streak": 8
  },
  "is_in_placement": false,
  "promotion_status": null
}
```

---

#### `GET /tiers/history`

**說明:** 取得積分變動歷史

**授權:** 需要認證 (FREELANCER)

**查詢參數:**

| 參數 | 類型 | 說明 |
|:---|:---|:---|
| `limit` | integer | 每頁數量 |
| `cursor` | string | 分頁游標 |

**成功回應 (200 OK):**

```json
{
  "data": [
    {
      "id": "rph_001",
      "type": "MILESTONE_COMPLETED",
      "rp_change": 26,
      "rp_after": 850,
      "details": {
        "milestone_id": "mst_002",
        "base_rp": 20,
        "multipliers": [
          { "name": "提前交付", "value": 1.1 }
        ]
      },
      "created_at": "2026-02-19T10:00:00Z"
    }
  ],
  "pagination": {
    "has_more": true,
    "next_cursor": "curs_xyz"
  }
}
```

---

### 7.8 爭議處理 (Disputes)

#### `POST /disputes`

**說明:** 發起爭議

**授權:** 需要認證 (專案參與者)

**請求體:**

```json
{
  "milestone_id": "mst_003",
  "type": "DELIVERY_QUALITY",
  "description": "交付物品質不符合驗收標準",
  "evidence_ids": ["evd_001", "evd_002"]
}
```

**成功回應 (201 Created):**

```json
{
  "id": "dsp_abc123",
  "milestone_id": "mst_003",
  "status": "NEGOTIATING",
  "type": "DELIVERY_QUALITY",
  "initiated_by": "usr_client",
  "negotiation_deadline": "2026-02-22T10:00:00Z",
  "created_at": "2026-02-19T10:00:00Z"
}
```

---

#### `POST /disputes/{dispute_id}/messages`

**說明:** 在爭議中發送訊息

**授權:** 需要認證 (爭議當事人)

**請求體:**

```json
{
  "content": "我們可以討論一下具體哪些部分不符合預期",
  "attachments": []
}
```

**成功回應 (201 Created):**

```json
{
  "id": "msg_001",
  "dispute_id": "dsp_abc123",
  "sender_id": "usr_freelancer",
  "content": "我們可以討論一下具體哪些部分不符合預期",
  "created_at": "2026-02-19T11:00:00Z"
}
```

---

#### `POST /disputes/{dispute_id}/resolve`

**說明:** 解決爭議

**授權:** 需要認證 (爭議當事人或 ADMIN)

**請求體:**

```json
{
  "resolution_type": "MUTUAL_AGREEMENT",
  "description": "雙方同意接案者補充缺失的功能",
  "agreed_by_both": true
}
```

**成功回應 (200 OK):**

```json
{
  "id": "dsp_abc123",
  "status": "RESOLVED",
  "resolution_type": "MUTUAL_AGREEMENT",
  "resolved_at": "2026-02-20T15:00:00Z"
}
```

---

### 7.9 POC 模式

#### `POST /projects/{project_id}/convert-to-full`

**說明:** 將 POC 轉為正式專案

**授權:** 需要認證 (CLIENT)

**請求體:**

```json
{
  "full_project_proposal": {
    "total_amount": 100000,
    "milestones": [...]
  }
}
```

**成功回應 (201 Created):**

```json
{
  "poc_project_id": "prj_poc123",
  "full_project_id": "prj_full456",
  "poc_fee": 15000,
  "deduction_amount": 15000,
  "deduction_rate": 1.0,
  "amount_due": 85000,
  "message": "正式專案已建立，POC 費用已全額抵扣"
}
```

---

### 7.10 檔案上傳

#### `POST /uploads/request`

**說明:** 請求上傳 URL (Presigned URL)

**授權:** 需要認證

**請求體:**

```json
{
  "filename": "design_v1.fig",
  "content_type": "application/octet-stream",
  "size": 5242880
}
```

**成功回應 (200 OK):**

```json
{
  "file_key": "uploads/usr_xyz/2026/02/design_v1.fig",
  "upload_url": "https://s3.amazonaws.com/trustcase-uploads/...",
  "expires_at": "2026-02-01T11:30:00Z"
}
```

---

## 8. 資料模型定義 (Data Models / Schema Definitions)

### 8.1 User

```json
{
  "id": "string (usr_...)",
  "email": "string (email format)",
  "role": "enum (CLIENT, FREELANCER, BOTH, ADMIN)",
  "is_verified": "boolean",
  "profile": "Profile | null",
  "freelancer_stats": "FreelancerStats | null",
  "created_at": "string (date-time)",
  "updated_at": "string (date-time)"
}
```

### 8.2 Profile

```json
{
  "display_name": "string",
  "avatar_url": "string | null",
  "bio": "string | null",
  "skills": "string[]",
  "hourly_rate_min": "number | null",
  "hourly_rate_max": "number | null",
  "portfolio_items": "PortfolioItem[]"
}
```

### 8.3 FreelancerStats

```json
{
  "tier": "enum (BRONZE_IV ... GRANDMASTER)",
  "rating_points": "integer",
  "on_time_rate": "number (0-1)",
  "first_pass_rate": "number (0-1)",
  "total_milestones": "integer",
  "current_streak": "integer",
  "is_in_placement": "boolean"
}
```

### 8.4 Project

```json
{
  "id": "string (prj_...)",
  "title": "string",
  "description": "string | null",
  "type": "enum (WEB_DEVELOPMENT, APP_DEVELOPMENT, ...)",
  "status": "enum (DRAFT, SPEC_READY, ...)",
  "client_id": "string",
  "freelancer_id": "string | null",
  "total_amount": "number",
  "escrowed_amount": "number",
  "released_amount": "number",
  "is_poc": "boolean",
  "parent_project_id": "string | null",
  "created_at": "string (date-time)",
  "updated_at": "string (date-time)"
}
```

### 8.5 Milestone

```json
{
  "id": "string (mst_...)",
  "project_id": "string",
  "name": "string",
  "description": "string | null",
  "order": "integer",
  "weight": "number (percentage)",
  "amount": "number",
  "status": "enum (PENDING, FUNDED, IN_PROGRESS, ...)",
  "due_date": "string (date) | null",
  "submitted_at": "string (date-time) | null",
  "accepted_at": "string (date-time) | null",
  "revision_count": "integer",
  "max_revisions": "integer",
  "deliverables": "Deliverable[]",
  "acceptance_criteria": "AcceptanceCriterion[]"
}
```

### 8.6 EscrowTransaction

```json
{
  "id": "string (esc_...)",
  "milestone_id": "string",
  "amount": "number",
  "platform_fee": "number",
  "freelancer_payout": "number",
  "status": "enum (PENDING, FUNDED, RELEASING, RELEASED, ...)",
  "payment_provider": "string",
  "provider_txn_id": "string | null",
  "funded_at": "string (date-time) | null",
  "released_at": "string (date-time) | null"
}
```

### 8.7 Dispute

```json
{
  "id": "string (dsp_...)",
  "milestone_id": "string",
  "type": "enum (DELIVERY_QUALITY, LATE_DELIVERY, PAYMENT, ...)",
  "status": "enum (NEGOTIATING, PLATFORM_REVIEW, ARBITRATION, RESOLVED)",
  "initiated_by": "string",
  "description": "string",
  "resolution_type": "enum | null",
  "resolution_description": "string | null",
  "negotiation_deadline": "string (date-time)",
  "resolved_at": "string (date-time) | null",
  "created_at": "string (date-time)"
}
```

---

## 9. API 生命週期與版本控制 (API Lifecycle and Versioning)

### 9.1 API 生命週期階段

| 階段 | 說明 | 穩定性 |
|:---|:---|:---|
| **Design** | 設計審查中 | - |
| **Development** | 內部開發測試 | 不穩定 |
| **Beta** | 公開測試 | 較穩定 |
| **GA** | 正式發布 | 穩定 |
| **Deprecated** | 已棄用 | 維護中 |
| **Decommissioned** | 已停用 | 不可用 |

### 9.2 版本控制策略

**策略:** URL 路徑版本控制

- 當前版本: `/v1/...`
- 未來版本: `/v2/...`

**向後兼容變更 (不變更版本號):**
- 增加新的 API 端點
- 增加新的可選請求參數
- 增加新的回應欄位

**破壞性變更 (需增加版本號):**
- 刪除或重命名端點
- 刪除或重命名欄位
- 修改欄位類型
- 增加必填參數

### 9.3 API 棄用策略

當舊版本需要棄用時：

1. **提前 6 個月通知**
2. **通知方式:**
   - 文檔更新
   - HTTP Header: `Deprecation: true`
   - 開發者郵件通知
3. **提供遷移指南**
4. **棄用後維持 3 個月唯讀存取**

---

## 10. 附錄 (Appendix)

### 10.1 完整 cURL 範例

#### 完整的專案建立流程

```bash
# 1. 註冊
curl -X POST https://api.trustcase.tw/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"client@example.com","password":"Pass123!","role":"CLIENT"}'

# 2. 登入
curl -X POST https://api.trustcase.tw/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"client@example.com","password":"Pass123!"}' \
  | jq -r '.access_token' > token.txt

# 3. 開始需求引導
curl -X POST https://api.trustcase.tw/v1/agent/detect-type \
  -H "Authorization: Bearer $(cat token.txt)" \
  -H "Content-Type: application/json" \
  -d '{"description":"我想做一個賣蛋糕的網站"}'

# 4. 建立專案
curl -X POST https://api.trustcase.tw/v1/projects \
  -H "Authorization: Bearer $(cat token.txt)" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "蛋糕電商網站",
    "type": "WEB_DEVELOPMENT",
    "budget_min": 80000,
    "budget_max": 120000
  }'
```

### 10.2 Webhook 事件 (未來支援)

| 事件 | 說明 |
|:---|:---|
| `project.created` | 專案建立 |
| `milestone.submitted` | 里程碑提交 |
| `milestone.accepted` | 里程碑驗收通過 |
| `escrow.funded` | 託管完成 |
| `escrow.released` | 撥款完成 |
| `dispute.opened` | 爭議開啟 |
| `dispute.resolved` | 爭議解決 |
| `tier.promoted` | 牌位晉升 |

### 10.3 SDK (未來支援)

| 語言 | 套件名稱 | 狀態 |
|:---|:---|:---|
| JavaScript/TypeScript | `@trustcase/sdk` | 規劃中 |
| Python | `trustcase-python` | 規劃中 |

---

**文件審核記錄 (Review History):**

| 日期 | 審核人 | 版本 | 變更摘要 |
|:---|:---|:---|:---|
| 2026-02-01 | Tech Lead | v1.0 | 初稿建立 |

---

**文件結束**
