# TrustCase【軟體外包履約平台】專有名詞解釋

## 文件概述

這是 **TrustCase【軟體外包履約平台】** 的期末專題簡介，描述一個為台灣市場設計的軟體外包媒合與履約保障平台。

---

## 專有名詞詳細解釋

### 一、平台與商業概念

#### SPEC 規格書（Software Specification）
軟體規格書，描述一個軟體專案的功能需求、非功能需求、使用者故事、技術限制等的正式文件。在 TrustCase 中，由 AI 引導業主透過訪談自動產出，目的是降低業主與接案者之間的溝通落差。

#### 里程碑制託管付款（Milestone-based Escrow）
- **里程碑（Milestone）**：將專案拆分成多個階段性交付目標，每完成一個階段即進行驗收。
- **託管（Escrow）**：第三方代管資金機制。業主先將款項存入平台託管帳戶，待驗收通過後才撥款給接案者。這樣業主不怕接案者拿錢不做事，接案者也不怕完成後拿不到錢。

#### 遊戲化信譽分級系統（Gamification Reputation System）
將遊戲中的等級與成就機制應用於平台信譽。文件提到 **7 階分級（Bronze → Grandmaster）**，類似於電競遊戲的排位系統。接案者透過完成專案累積分數、升級，讓信譽可視化且具激勵性。

#### 非典型勞動者
指不屬於傳統全職雇用關係的工作者，包括自由接案者（Freelancer）、兼職工作者、約聘人員等。台灣約有 80 萬+ 此類工作者。

#### MVP（Minimum Viable Product）
最小可行性產品。以最少的功能開發出可供真實使用者驗證的產品版本，目的是快速測試市場需求，避免浪費資源。文件中提到 MVP 以 12 週 504 工時為期。

#### 產品–市場適配性（Product-Market Fit, PMF）
指產品滿足市場需求的程度。當產品解決了真實的使用者痛點，且有明確的使用者願意付費，就達到了 PMF。

#### 手續費模型（業主 5% + 接案者 10%）
平台的營收模式，雙邊收費：業主在發包時支付專案金額的 5%，接案者在收到撥款時被扣除 10%。

---

### 二、軟體架構與設計模式

#### Monorepo
單一儲存庫策略，將前端、後端、共用函式庫等多個專案放在同一個 Git 儲存庫中管理。優點是跨專案共享程式碼方便、版本統一、重構容易。

#### pnpm workspaces
**pnpm** 是一個高效的 Node.js 套件管理工具（類似 npm/yarn），透過硬連結（hard link）節省磁碟空間。**Workspaces** 功能讓你在 Monorepo 中管理多個子專案，每個子專案可以有自己的 `package.json`，但共享依賴安裝。

#### Turborepo
由 Vercel 開發的 Monorepo 建構工具，核心功能是**增量建構**和**快取**。只重新建構有變動的部分，大幅加速 CI/CD 流程。搭配 pnpm workspaces 使用是目前業界常見的組合。

#### DDD（Domain-Driven Design）領域驅動設計
一種軟體設計方法論，強調以「業務領域」為核心來組織程式碼。核心概念包括：
- **限界上下文（Bounded Context）**：將系統劃分為多個獨立的業務邊界，每個上下文有自己的模型和語言。文件中劃分了 7 個：
  - **Identity**：身份認證與使用者管理
  - **Project**：專案管理
  - **Payment**：金流支付
  - **Reputation**：信譽評等
  - **Dispute**：爭議調解
  - **Contract**：合約管理
  - **Communication**：通訊溝通

#### Clean Architecture（乾淨架構）
由 Robert C. Martin（Uncle Bob）提出的架構模式，核心原則是**依賴反轉**——外層依賴內層，內層不知道外層的存在。通常分為：
- **Domain 層**：核心業務邏輯（最內層）
- **Use Case 層**：應用程式邏輯
- **Interface Adapters 層**：控制器、呈現器
- **Frameworks 層**：框架、資料庫（最外層）

#### Use Case（使用案例）
在 Clean Architecture 中，Use Case 是應用程式的核心業務操作單元。例如「建立專案」、「驗收里程碑」、「發起爭議」等，每個 Use Case 封裝一個完整的業務流程。

#### Repository Pattern（儲存庫模式）
一種設計模式，在業務邏輯與資料存取之間建立抽象層。業務邏輯只透過 Repository 介面操作資料，不直接碰資料庫。好處是可以隨時替換資料庫實作（例如從 PostgreSQL 換成 MongoDB）而不影響業務邏輯。

#### Domain Events（領域事件）
DDD 中的概念，當某個業務動作發生時發布事件，其他限界上下文可以訂閱並回應。例如「里程碑驗收通過」事件發布後，Payment 上下文自動觸發撥款、Reputation 上下文更新分數。實現跨上下文的**非同步通訊（Asynchronous Communication）**。

---

### 三、前端技術

#### Next.js 14 App Router
- **Next.js**：基於 React 的全端框架，由 Vercel 公司開發。
- **App Router**：Next.js 13 起引入的新路由系統，使用檔案系統為基礎的路由，支援巢狀版面（Nested Layouts）、伺服器元件等。
- **14** 是版本號，帶來了效能改進與穩定性提升。

#### SSR（Server-Side Rendering）伺服器端渲染
頁面在伺服器上先渲染好 HTML，再傳送給瀏覽器。優點是 SEO 友善、首次載入速度快。

#### SSG（Static Site Generation）靜態網站生成
在建構時期就預先產生 HTML 檔案，部署後直接提供靜態檔案。速度最快、成本最低，適合內容不常變動的頁面。

#### SSR/SSG 混合渲染
Next.js 的優勢之一，可以在同一個專案中，根據不同頁面的需求選擇 SSR 或 SSG，兼顧動態需求與效能。

#### React Server Components（RSC）
React 18 引入的新元件類型，在伺服器端執行且不傳送 JavaScript 到瀏覽器。優點是減少客戶端 JS bundle 大小、可直接存取伺服器端資源（如資料庫）。

---

### 四、後端技術

#### Express
Node.js 最流行的 Web 框架，輕量且靈活，提供路由、中介軟體（Middleware）等基礎功能，用於建構 RESTful API。

#### Node.js
基於 Chrome V8 引擎的 JavaScript 執行環境，讓 JavaScript 能在伺服器端運行。特色是**事件驅動**、**非阻塞 I/O**，適合處理高併發的網路應用。

---

### 五、資料庫層

#### PostgreSQL 15
開源的關聯式資料庫管理系統（RDBMS），以嚴格的資料一致性（ACID）、豐富的資料型別、強大的查詢能力著稱。**15** 是版本號。文件提到有 **28 個資料表**涵蓋完整業務模型。

#### Prisma 5 ORM
- **ORM（Object-Relational Mapping）**：物件關聯對映，用程式語言的物件來操作資料庫，不需要手寫 SQL。
- **Prisma**：Node.js/TypeScript 生態系中的現代 ORM 工具，特色是型別安全的查詢、自動生成的客戶端、直覺的 Schema 定義。
- **Schema**：資料庫結構定義（資料表、欄位、關聯等）。
- **Migration**：資料庫遷移，追蹤並管理資料庫結構的版本變更歷程。

#### Redis 7
開源的**記憶體資料結構儲存系統（In-Memory Data Store）**，將資料存在記憶體中，讀寫速度極快（微秒級）。常用於：
- **快取層（Cache Layer）**：暫存頻繁查詢的資料，減少資料庫壓力。
- **Session 儲存**
- **訊息佇列**

#### BullMQ
基於 Redis 的 Node.js **任務佇列（Job Queue）** 函式庫。用於處理耗時的背景任務（如寄送 Email、生成報表、處理付款），將任務放入佇列排隊執行，避免阻塞主要的 API 回應。

---

### 六、AI 代理層

#### FastAPI
Python 的現代高效能 Web 框架，基於型別提示（Type Hints）自動產生 API 文件，支援非同步請求處理。在本專案中負責 AI 相關的服務。

#### Claude API
Anthropic 公司提供的大型語言模型（LLM）API。Claude 是一個 AI 對話模型，本專案用它來驅動引導式需求訪談，透過多輪對話幫助業主釐清需求。

#### LLM（Large Language Model）大型語言模型
經過大量文本資料訓練的深度學習模型，能理解並生成自然語言。例如 Claude、GPT 等。

#### Type Detector → Conversation Engine → SPEC Generator
本專案 AI 代理的三階段流程：
1. **Type Detector**：偵測專案類型（例如：網站、App、系統整合等）
2. **Conversation Engine**：對話引擎，根據專案類型引導業主進行結構化訪談
3. **SPEC Generator**：根據訪談結果自動產出結構化的規格書

---

### 七、金流層

#### 藍新金流 NewebPay
台灣主要的第三方金流服務商之一，提供線上付款整合服務。商家只需對接藍新的 API，即可支援信用卡、ATM 虛擬帳號、超商代碼等多種付款方式。

#### Escrow（託管付款）
第三方資金託管機制。買方先將款項支付給平台（第三方），賣方完成約定的工作並驗收通過後，平台才將款項撥付給賣方。保障交易雙方的權益。

#### ATM 虛擬帳號
由金流系統動態產生的一組銀行帳號，每筆交易對應一個獨立帳號。付款人到 ATM 轉帳至該帳號後，系統自動對帳確認付款。

---

### 八、部署與 DevOps

#### Vercel
專門為前端框架（特別是 Next.js）打造的雲端部署平台，提供自動化 CI/CD、全球 CDN、預覽部署等功能。Push 程式碼即自動建構部署。

#### Railway
雲端應用程式部署平台，支援 Node.js、Python 等多種後端服務的一鍵部署，附帶資料庫託管（PostgreSQL、Redis 等）。適合中小型專案快速上線。

#### CI/CD（Continuous Integration / Continuous Deployment）
- **CI 持續整合**：開發者頻繁將程式碼合併到主分支，每次合併自動執行測試與建構。
- **CD 持續部署**：通過測試後自動部署到正式環境，縮短從開發到上線的時間。
