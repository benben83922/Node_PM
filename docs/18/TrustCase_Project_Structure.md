# 專案結構指南 (Project Structure Guide) - TrustCase

---

**文件版本 (Document Version):** `v1.0`
**最後更新 (Last Updated):** `2026-02-01`
**主要作者 (Lead Author):** `技術負責人/架構團隊`
**審核者 (Reviewers):** `開發團隊`
**狀態 (Status):** `活躍 (Active)`

---

## 目錄 (Table of Contents)

- [1. 指南目的 (Purpose of This Guide)](#1-指南目的-purpose-of-this-guide)
- [2. 核心設計原則 (Core Design Principles)](#2-核心設計原則-core-design-principles)
- [3. 頂層目錄結構 (Top-Level Directory Structure)](#3-頂層目錄結構-top-level-directory-structure)
- [4. 目錄詳解 (Directory Breakdown)](#4-目錄詳解-directory-breakdown)
  - [4.1 `apps/web/` - Next.js 前端應用](#41-appsweb---nextjs-前端應用)
  - [4.2 `apps/api/` - Node.js API Server](#42-appsapi---nodejs-api-server)
  - [4.3 `apps/agent/` - Python LLM Agent Service](#43-appsagent---python-llm-agent-service)
  - [4.4 `packages/` - 共享套件](#44-packages---共享套件)
  - [4.5 `tests/` - 測試代碼](#45-tests---測試代碼)
  - [4.6 `docs/` - 文檔](#46-docs---文檔)
  - [4.7 `scripts/` - 腳本](#47-scripts---腳本)
  - [4.8 `infra/` - 基礎設施配置](#48-infra---基礎設施配置)
- [5. 文件命名約定 (File Naming Conventions)](#5-文件命名約定-file-naming-conventions)
- [6. 模組對應關係 (Module Mapping)](#6-模組對應關係-module-mapping)
- [7. 演進原則 (Evolution Principles)](#7-演進原則-evolution-principles)
- [附錄 A: 技術棧版本](#附錄-a-技術棧版本)

---

## 1. 指南目的 (Purpose of This Guide)

- 為 **TrustCase 軟體外包履約平台** 提供一個標準化、可擴展且易於理解的目錄和文件結構。
- 確保團隊成員能夠快速定位代碼、配置文件和文檔，降低新成員的上手成本。
- 促進代碼的模塊化和關注點分離，提高可維護性。
- 支援 **Monorepo** 架構下的多服務協作開發。

---

## 2. 核心設計原則 (Core Design Principles)

| 原則 | 說明 |
|:---|:---|
| **Monorepo 架構** | 所有服務（Web、API、Agent）共存於單一倉庫，便於跨服務重構與版本同步。 |
| **按功能組織 (Feature-First)** | 相關功能（如用戶管理、里程碑）放在一起，而非按類型分散（如 controllers、models）。 |
| **Clean Architecture 分層** | 明確分離 Domain、Application、Infrastructure 層，核心業務邏輯不依賴外部框架。 |
| **DDD 限界上下文** | 各 Bounded Context（Identity、Project、Payment、Reputation、Dispute）有清晰邊界。 |
| **配置外部化** | 環境配置與代碼分離，透過 `.env` 和 `configs/` 目錄管理。 |
| **根目錄簡潔** | 根目錄只放專案級別文件，各服務代碼放在 `apps/` 下。 |
| **一致的命名** | 遵循各語言/框架的最佳實踐命名約定。 |

---

## 3. 頂層目錄結構 (Top-Level Directory Structure)

```plaintext
trustcase/
├── .github/                    # GitHub Actions CI/CD 工作流程
│   └── workflows/
│       ├── ci.yml
│       ├── deploy-staging.yml
│       └── deploy-production.yml
├── .husky/                     # Git hooks 配置
├── .vscode/                    # VS Code 編輯器配置
│
├── apps/                       # 應用程式目錄 (Monorepo)
│   ├── web/                    # Next.js 前端應用
│   ├── api/                    # Node.js/Express API Server
│   └── agent/                  # Python/FastAPI LLM Agent Service
│
├── packages/                   # 共享套件
│   ├── shared-types/           # TypeScript 共享類型定義
│   ├── shared-utils/           # 共用工具函式
│   ├── ui/                     # 共用 UI 元件庫
│   └── prisma/                 # Prisma Schema 與 Client
│
├── configs/                    # 環境配置
│   ├── .env.example
│   ├── .env.development
│   ├── .env.staging
│   └── .env.production
│
├── docs/                       # 專案文檔
│   ├── TrustCase_PRD.md
│   ├── TrustCase_BDD.md
│   ├── TrustCase_Architecture.md
│   ├── TrustCase_API_Specification.md
│   ├── TrustCase_Module_Specification.md
│   └── TrustCase_Project_Structure.md
│
├── scripts/                    # 開發與運維腳本
│   ├── setup.sh
│   ├── seed-db.ts
│   ├── migrate.sh
│   └── deploy.sh
│
├── infra/                      # 基礎設施配置
│   ├── docker/
│   │   ├── Dockerfile.api
│   │   ├── Dockerfile.agent
│   │   └── docker-compose.yml
│   ├── k8s/                    # (未來) Kubernetes 配置
│   └── terraform/              # (未來) IaC 配置
│
├── tests/                      # 端對端與整合測試
│   ├── e2e/
│   └── integration/
│
├── .dockerignore
├── .gitignore
├── .eslintrc.js
├── .prettierrc
├── turbo.json                  # Turborepo 配置
├── package.json                # 根 package.json (workspaces)
├── pnpm-workspace.yaml         # pnpm workspace 配置
├── tsconfig.json               # 根 TypeScript 配置
├── LICENSE
└── README.md
```

---

## 4. 目錄詳解 (Directory Breakdown)

### 4.1 `apps/web/` - Next.js 前端應用

前端應用採用 **Next.js 14 App Router** 架構，遵循 Feature-Sliced Design。

```plaintext
apps/web/
├── public/                     # 靜態資源
│   ├── images/
│   └── fonts/
│
├── src/
│   ├── app/                    # App Router 頁面
│   │   ├── (auth)/             # 認證相關頁面群組
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── register/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   │
│   │   ├── (dashboard)/        # 儀表板頁面群組
│   │   │   ├── projects/
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── milestones/
│   │   │   │   │       └── page.tsx
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── profile/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   │
│   │   ├── api/                # API Routes (若需要 BFF)
│   │   │   └── [...proxy]/
│   │   │
│   │   ├── layout.tsx          # Root Layout
│   │   ├── page.tsx            # Landing Page
│   │   └── globals.css
│   │
│   ├── components/             # 共用元件
│   │   ├── ui/                 # 基礎 UI 元件 (shadcn/ui)
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   └── card.tsx
│   │   ├── layout/             # 佈局元件
│   │   │   ├── header.tsx
│   │   │   ├── sidebar.tsx
│   │   │   └── footer.tsx
│   │   └── features/           # 功能元件
│   │       ├── project/
│   │       │   ├── project-card.tsx
│   │       │   └── milestone-timeline.tsx
│   │       ├── escrow/
│   │       │   └── payment-status.tsx
│   │       └── tier/
│   │           └── tier-badge.tsx
│   │
│   ├── hooks/                  # 自定義 Hooks
│   │   ├── use-auth.ts
│   │   ├── use-projects.ts
│   │   └── use-escrow.ts
│   │
│   ├── lib/                    # 工具函式與配置
│   │   ├── api-client.ts       # API 客戶端 (axios/fetch 封裝)
│   │   ├── auth.ts             # 認證相關
│   │   └── utils.ts
│   │
│   ├── stores/                 # 狀態管理 (Zustand)
│   │   ├── auth-store.ts
│   │   └── project-store.ts
│   │
│   └── types/                  # 前端專用類型
│       └── index.ts
│
├── tailwind.config.ts
├── next.config.js
├── tsconfig.json
└── package.json
```

**關鍵設計決策：**

| 決策 | 說明 |
|:---|:---|
| Route Groups `()` | 用於邏輯分組而不影響 URL 結構 |
| Feature Components | 功能相關元件放在 `components/features/` 下 |
| API Client | 統一封裝 API 呼叫，處理 Token 刷新 |
| shadcn/ui | 可客製化的 UI 元件庫 |

---

### 4.2 `apps/api/` - Node.js API Server

後端 API 採用 **Node.js + Express**，遵循 **Clean Architecture** 分層。

```plaintext
apps/api/
├── src/
│   ├── main.ts                 # 應用程式入口點
│   │
│   ├── core/                   # 核心配置與共用邏輯
│   │   ├── config/
│   │   │   ├── index.ts
│   │   │   ├── database.ts
│   │   │   └── redis.ts
│   │   ├── errors/
│   │   │   ├── app-error.ts
│   │   │   └── error-codes.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── error-handler.middleware.ts
│   │   │   ├── rate-limit.middleware.ts
│   │   │   └── validation.middleware.ts
│   │   └── utils/
│   │       ├── logger.ts
│   │       └── id-generator.ts
│   │
│   ├── domain/                 # Domain Layer (核心業務邏輯)
│   │   ├── entities/           # 實體定義
│   │   │   ├── user.entity.ts
│   │   │   ├── project.entity.ts
│   │   │   ├── milestone.entity.ts
│   │   │   ├── escrow.entity.ts
│   │   │   └── dispute.entity.ts
│   │   │
│   │   ├── value-objects/      # 值對象
│   │   │   ├── money.vo.ts
│   │   │   ├── tier-level.vo.ts
│   │   │   └── rating-points.vo.ts
│   │   │
│   │   ├── events/             # 領域事件
│   │   │   ├── milestone-completed.event.ts
│   │   │   ├── payment-released.event.ts
│   │   │   └── dispute-opened.event.ts
│   │   │
│   │   └── repository-interfaces/  # Repository 介面 (抽象)
│   │       ├── user.repository.ts
│   │       ├── project.repository.ts
│   │       └── milestone.repository.ts
│   │
│   ├── application/            # Application Layer (用例/服務)
│   │   ├── auth/
│   │   │   ├── register.usecase.ts
│   │   │   ├── login.usecase.ts
│   │   │   ├── verify-email.usecase.ts
│   │   │   └── auth.dto.ts
│   │   │
│   │   ├── project/
│   │   │   ├── create-project.usecase.ts
│   │   │   ├── assign-freelancer.usecase.ts
│   │   │   └── project.dto.ts
│   │   │
│   │   ├── milestone/
│   │   │   ├── create-milestones.usecase.ts
│   │   │   ├── submit-deliverable.usecase.ts
│   │   │   ├── accept-milestone.usecase.ts
│   │   │   ├── request-revision.usecase.ts
│   │   │   └── milestone.dto.ts
│   │   │
│   │   ├── escrow/
│   │   │   ├── fund-milestone.usecase.ts
│   │   │   ├── release-escrow.usecase.ts
│   │   │   └── escrow.dto.ts
│   │   │
│   │   ├── tier/
│   │   │   ├── calculate-rp.usecase.ts
│   │   │   ├── update-stats.usecase.ts
│   │   │   └── tier.dto.ts
│   │   │
│   │   └── dispute/
│   │       ├── open-dispute.usecase.ts
│   │       ├── resolve-dispute.usecase.ts
│   │       └── dispute.dto.ts
│   │
│   └── infrastructure/         # Infrastructure Layer (外部實現)
│       ├── http/               # HTTP 層 (Controllers/Routes)
│       │   ├── routes/
│       │   │   ├── index.ts
│       │   │   ├── auth.routes.ts
│       │   │   ├── user.routes.ts
│       │   │   ├── project.routes.ts
│       │   │   ├── milestone.routes.ts
│       │   │   ├── escrow.routes.ts
│       │   │   ├── tier.routes.ts
│       │   │   └── dispute.routes.ts
│       │   │
│       │   └── controllers/
│       │       ├── auth.controller.ts
│       │       ├── project.controller.ts
│       │       └── milestone.controller.ts
│       │
│       ├── persistence/        # 資料持久化
│       │   ├── prisma/
│       │   │   └── prisma.client.ts
│       │   └── repositories/
│       │       ├── prisma-user.repository.ts
│       │       ├── prisma-project.repository.ts
│       │       └── prisma-milestone.repository.ts
│       │
│       ├── external/           # 外部服務整合
│       │   ├── payment/
│       │   │   ├── newebpay.gateway.ts
│       │   │   └── payment-gateway.interface.ts
│       │   ├── email/
│       │   │   └── sendgrid.service.ts
│       │   ├── storage/
│       │   │   └── s3.service.ts
│       │   └── llm/
│       │       └── agent-client.ts
│       │
│       └── queue/              # 任務佇列
│           ├── bull.config.ts
│           └── workers/
│               ├── email.worker.ts
│               ├── notification.worker.ts
│               └── auto-accept.worker.ts
│
├── tests/
│   ├── unit/
│   │   ├── application/
│   │   │   └── auth/
│   │   │       └── register.usecase.test.ts
│   │   └── domain/
│   │       └── entities/
│   │           └── milestone.entity.test.ts
│   └── integration/
│       └── http/
│           └── auth.routes.test.ts
│
├── tsconfig.json
├── jest.config.js
└── package.json
```

**Clean Architecture 依賴規則：**

```
┌─────────────────────────────────────────────────────────────┐
│                     Infrastructure Layer                      │
│  (HTTP, Database, External APIs, Queue)                       │
│                           ↓ depends on                        │
├─────────────────────────────────────────────────────────────┤
│                     Application Layer                         │
│  (Use Cases, DTOs, Application Services)                      │
│                           ↓ depends on                        │
├─────────────────────────────────────────────────────────────┤
│                       Domain Layer                            │
│  (Entities, Value Objects, Domain Events, Repository I/F)     │
│                       NO DEPENDENCIES                         │
└─────────────────────────────────────────────────────────────┘
```

---

### 4.3 `apps/agent/` - Python LLM Agent Service

LLM Agent 採用 **Python + FastAPI**，負責需求引導與 SPEC 生成。

```plaintext
apps/agent/
├── src/
│   └── agent/
│       ├── __init__.py
│       ├── main.py             # FastAPI 應用入口
│       │
│       ├── core/
│       │   ├── __init__.py
│       │   ├── config.py       # 配置加載
│       │   └── logging.py      # 日誌配置
│       │
│       ├── api/                # API 路由
│       │   ├── __init__.py
│       │   ├── routes.py
│       │   └── schemas.py      # Pydantic 模型
│       │
│       ├── services/           # 業務邏輯
│       │   ├── __init__.py
│       │   ├── type_detector.py
│       │   ├── conversation_engine.py
│       │   └── spec_generator.py
│       │
│       ├── llm/                # LLM 整合
│       │   ├── __init__.py
│       │   ├── client.py       # Claude API 客戶端
│       │   └── prompts/        # Prompt 模板
│       │       ├── __init__.py
│       │       ├── type_detection.py
│       │       ├── requirement_guidance.py
│       │       └── spec_generation.py
│       │
│       ├── templates/          # 專案類型問題模板
│       │   ├── __init__.py
│       │   ├── web_development.yaml
│       │   ├── app_development.yaml
│       │   └── ui_ux_design.yaml
│       │
│       └── models/             # 資料模型
│           ├── __init__.py
│           ├── conversation.py
│           └── spec.py
│
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   ├── test_type_detector.py
│   ├── test_conversation_engine.py
│   └── test_spec_generator.py
│
├── pyproject.toml
├── requirements.txt
└── Dockerfile
```

---

### 4.4 `packages/` - 共享套件

Monorepo 中的共享套件，供多個應用程式使用。

```plaintext
packages/
├── shared-types/               # 共享 TypeScript 類型
│   ├── src/
│   │   ├── index.ts
│   │   ├── user.ts
│   │   ├── project.ts
│   │   ├── milestone.ts
│   │   ├── escrow.ts
│   │   └── tier.ts
│   ├── tsconfig.json
│   └── package.json
│
├── shared-utils/               # 共用工具函式
│   ├── src/
│   │   ├── index.ts
│   │   ├── date.ts
│   │   ├── currency.ts
│   │   └── validation.ts
│   ├── tsconfig.json
│   └── package.json
│
├── ui/                         # 共用 UI 元件 (可選)
│   ├── src/
│   │   └── ...
│   └── package.json
│
└── prisma/                     # Prisma Schema 與 Client
    ├── schema.prisma
    ├── migrations/
    │   ├── 20260201_init/
    │   │   └── migration.sql
    │   └── ...
    ├── seed.ts
    └── package.json
```

**Prisma Schema 結構（對應 DDD 限界上下文）：**

```prisma
// packages/prisma/schema.prisma

// ============ Identity Context ============
model User { ... }
model Profile { ... }

// ============ Project Context ============
model Project { ... }
model Spec { ... }
model Milestone { ... }
model Deliverable { ... }
model AcceptanceCriteria { ... }

// ============ Payment Context ============
model EscrowTransaction { ... }

// ============ Reputation Context ============
model FreelancerStats { ... }
model RPHistory { ... }

// ============ Dispute Context ============
model Dispute { ... }
model DisputeMessage { ... }
model Evidence { ... }
```

---

### 4.5 `tests/` - 測試代碼

根目錄的 `tests/` 存放跨服務的端對端與整合測試。

```plaintext
tests/
├── e2e/                        # 端對端測試
│   ├── auth.e2e.test.ts        # 認證流程 E2E
│   ├── project-flow.e2e.test.ts # 完整專案流程 E2E
│   ├── escrow-flow.e2e.test.ts # 價金託管流程 E2E
│   └── playwright.config.ts
│
├── integration/                # 跨服務整合測試
│   ├── api-agent.integration.test.ts
│   └── api-payment.integration.test.ts
│
├── fixtures/                   # 測試資料
│   ├── users.json
│   ├── projects.json
│   └── milestones.json
│
└── utils/                      # 測試工具
    ├── test-db.ts
    └── mock-payment.ts
```

---

### 4.6 `docs/` - 文檔

```plaintext
docs/
├── TrustCase_PRD.md                    # 產品需求文件
├── TrustCase_BDD.md                    # BDD 行為規格
├── TrustCase_Architecture.md           # 架構設計文件
├── TrustCase_API_Specification.md      # API 規格
├── TrustCase_Module_Specification.md   # 模組規格與測試案例
├── TrustCase_Project_Structure.md      # 專案結構指南 (本文件)
│
├── adrs/                               # 架構決策記錄
│   ├── ADR-001-monorepo-structure.md
│   ├── ADR-002-clean-architecture.md
│   ├── ADR-003-payment-provider.md
│   └── ADR-004-llm-service-separation.md
│
├── guides/                             # 開發指南
│   ├── getting-started.md
│   ├── coding-standards.md
│   └── deployment-guide.md
│
├── sunny_版本/                         # 原始策略文件
│   └── ...
│
└── images/                             # 文檔圖片
    └── ...
```

---

### 4.7 `scripts/` - 腳本

```plaintext
scripts/
├── setup.sh                    # 初次設置腳本
├── dev.sh                      # 啟動開發環境
├── build.sh                    # 建置所有服務
├── test.sh                     # 執行所有測試
├── lint.sh                     # 執行 Linting
│
├── db/
│   ├── migrate.sh              # 執行資料庫遷移
│   ├── seed.ts                 # 種子資料
│   └── reset.sh                # 重置資料庫
│
└── deploy/
    ├── deploy-staging.sh
    └── deploy-production.sh
```

---

### 4.8 `infra/` - 基礎設施配置

```plaintext
infra/
├── docker/
│   ├── Dockerfile.web          # Next.js 生產 Dockerfile
│   ├── Dockerfile.api          # API Server 生產 Dockerfile
│   ├── Dockerfile.agent        # Agent Service 生產 Dockerfile
│   ├── docker-compose.yml      # 本地開發環境
│   └── docker-compose.prod.yml # 生產環境
│
├── nginx/
│   └── nginx.conf              # Nginx 反向代理配置
│
├── k8s/                        # (未來) Kubernetes 配置
│   ├── base/
│   ├── staging/
│   └── production/
│
└── terraform/                  # (未來) IaC 配置
    └── ...
```

---

## 5. 文件命名約定 (File Naming Conventions)

### 5.1 TypeScript/JavaScript (Next.js, API Server)

| 類型 | 約定 | 範例 |
|:---|:---|:---|
| **React 元件** | `kebab-case.tsx` | `project-card.tsx` |
| **頁面 (App Router)** | `page.tsx` / `layout.tsx` | `app/projects/page.tsx` |
| **Hooks** | `use-{name}.ts` | `use-auth.ts` |
| **工具函式** | `kebab-case.ts` | `api-client.ts` |
| **類型定義** | `{name}.ts` | `user.ts` |
| **Use Cases** | `{action}.usecase.ts` | `create-project.usecase.ts` |
| **Controllers** | `{name}.controller.ts` | `auth.controller.ts` |
| **Routes** | `{name}.routes.ts` | `project.routes.ts` |
| **Entities** | `{name}.entity.ts` | `milestone.entity.ts` |
| **Repositories** | `{prefix}-{name}.repository.ts` | `prisma-user.repository.ts` |
| **測試文件** | `{name}.test.ts` | `register.usecase.test.ts` |
| **E2E 測試** | `{name}.e2e.test.ts` | `auth.e2e.test.ts` |

### 5.2 Python (Agent Service)

| 類型 | 約定 | 範例 |
|:---|:---|:---|
| **模組** | `snake_case.py` | `type_detector.py` |
| **測試文件** | `test_{name}.py` | `test_type_detector.py` |
| **配置文件** | `snake_case.yaml` | `web_development.yaml` |

### 5.3 其他文件

| 類型 | 約定 | 範例 |
|:---|:---|:---|
| **Markdown** | `kebab-case.md` 或 `PascalCase_Name.md` | `getting-started.md` |
| **腳本** | `kebab-case.sh` | `deploy-staging.sh` |
| **環境變數** | `.env.{environment}` | `.env.production` |

---

## 6. 模組對應關係 (Module Mapping)

將架構文件中的模組對應到實際檔案位置：

| 架構模組 | API Server 位置 | 說明 |
|:---|:---|:---|
| **AuthService** | `apps/api/src/application/auth/` | 認證相關 Use Cases |
| **ProjectService** | `apps/api/src/application/project/` | 專案管理 Use Cases |
| **MilestoneService** | `apps/api/src/application/milestone/` | 里程碑管理 Use Cases |
| **EscrowService** | `apps/api/src/application/escrow/` | 價金託管 Use Cases |
| **TierService** | `apps/api/src/application/tier/` | 牌位系統 Use Cases |
| **DisputeService** | `apps/api/src/application/dispute/` | 爭議處理 Use Cases |
| **AgentService** | `apps/agent/src/agent/services/` | LLM 需求引導服務 |

| 限界上下文 | 涵蓋模組 |
|:---|:---|
| **Identity Context** | AuthService, UserService |
| **Project Context** | ProjectService, MilestoneService, AgentService |
| **Payment Context** | EscrowService |
| **Reputation Context** | TierService |
| **Dispute Context** | DisputeService |
| **Notification Context** | NotificationService (跨 Context) |

---

## 7. 演進原則 (Evolution Principles)

1. **本結構是起點，應根據專案發展調整。**

2. **重大變更需記錄 ADR：**
   - 新增/刪除頂層目錄
   - 架構分層變更
   - 新服務引入

3. **保持一致性比遵守特定模式更重要。**

4. **漸進式拆分：**
   - MVP 階段保持模組化單體
   - 隨需求增長可拆分為微服務
   - 先拆分最獨立的服務（如 Agent）

5. **定期審視結構：**
   - 每季度檢視目錄結構是否仍然清晰
   - 功能模組超過 10 個文件考慮再拆分子目錄

---

## 附錄 A: 技術棧版本

| 技術 | 版本 | 說明 |
|:---|:---|:---|
| **Node.js** | 20.x LTS | Runtime |
| **pnpm** | 8.x | 套件管理 (Monorepo) |
| **TypeScript** | 5.x | 型別系統 |
| **Next.js** | 14.x | 前端框架 |
| **React** | 18.x | UI Library |
| **Express** | 4.x | API 框架 |
| **Prisma** | 5.x | ORM |
| **PostgreSQL** | 15.x | 主資料庫 |
| **Redis** | 7.x | 快取與佇列 |
| **BullMQ** | 4.x | 任務佇列 |
| **Python** | 3.11+ | Agent Runtime |
| **FastAPI** | 0.100+ | Agent 框架 |
| **Turborepo** | 1.x | Monorepo 建置工具 |

---

## 附錄 B: 開發環境快速啟動

```bash
# 1. 複製專案
git clone https://github.com/trustcase/trustcase.git
cd trustcase

# 2. 安裝依賴
pnpm install

# 3. 設置環境變數
cp configs/.env.example configs/.env.development

# 4. 啟動資料庫服務
docker-compose -f infra/docker/docker-compose.yml up -d postgres redis

# 5. 執行資料庫遷移
pnpm db:migrate

# 6. 啟動開發伺服器
pnpm dev          # 同時啟動 web + api
# 或分別啟動
pnpm dev:web      # Next.js 前端
pnpm dev:api      # API Server
pnpm dev:agent    # LLM Agent (需 Python 環境)
```

---

**文件審核記錄 (Review History):**

| 日期 | 審核人 | 版本 | 變更摘要 |
|:---|:---|:---|:---|
| 2026-02-01 | 架構團隊 | v1.0 | 初稿建立 |

---

**文件結束**
