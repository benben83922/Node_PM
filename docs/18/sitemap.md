# TrustCase 平台架構 Sitemap

```
📁 TrustCase 平台架構
│
├── 🌐 Public (未登入)
│   │
│   ├── /home
│   │   ├── 價值主張（發案/接案）
│   │   ├── 成功案例
│   │   └── CTA：立即發案 / 立即接案
│   │
│   ├── /explore
│   │   ├── /projects          # 案件列表（瀏覽）
│   │   │   └── /projects/:id  # 案件詳情（只讀）
│   │   ├── /talents           # 人才列表（公開卡片）
│   │   └── /lobby             # 組隊大廳（只讀）
│   │
│   ├── /pricing               # 費用說明
│   │
│   ├── /rules
│   │   ├── /terms             # 使用條款
│   │   ├── /privacy           # 隱私權
│   │   ├── /escrow-policy     # 托管/退款/爭議規則
│   │   └── /anti-cheat        # 反作弊/刷榜政策
│   │
│   ├── /auth
│   │   ├── /register          # 註冊
│   │   ├── /login             # 登入
│   │   └── /forgot-password   # 忘記密碼
│   │
│   └── /leaderboard
│       ├── /overall           # 全站榜 (前10名)
│       └── /roles             # 角色榜 (FE/BE/UI…)
│
├── 🔐 App (登入後)
│   │
│   ├── /dashboard                     # 首頁=Inbox待辦
│   │   ├── 待辦清單（依角色顯示）
│   │   │   ├── 待投標 / 待回覆 / 待簽約
│   │   │   ├── 待交付 / 待驗收
│   │   │   └── 待請款 / 待放款
│   │   ├── 我的進行中案件快覽
│   │   └── 系統提醒（KYC/付款/收款）
│   │
│   ├── /projects                      # 案件模組
│   │   │
│   │   ├── 📋 [接案者] 找案/任務大廳
│   │   │   ├── /projects/browse       # 案件列表（可投標）
│   │   │   └── /projects/:id          # 案件詳情
│   │   │       ├── 個人投標（Solo Bid）
│   │   │       │   ├── 報價/工期
│   │   │       │   └── 交付方案摘要
│   │   │       ├── 問答/Q&A
│   │   │       └── 收藏/追蹤
│   │   │
│   │   ├── 📝 [業主] 發案
│   │   │   └── /projects/create       # 建立案件 Wizard
│   │   │       ├── Step 1: 基本資料（標題/描述/預算/時程/難度）
│   │   │       ├── Step 2: 交付標準（Acceptance Criteria）
│   │   │       ├── Step 3: 類型設定（Solo / Team）
│   │   │       │   └── Team 要求
│   │   │       │       ├── 角色槽位（Role Slots）
│   │   │       │       ├── 最低牌位/可靠度門檻
│   │   │       │       └── 人數/必要角色
│   │   │       ├── Step 4: 里程碑模板
│   │   │       ├── Step 5: 托管設定（Escrow）
│   │   │       ├── Step 6: POC 設定（選填）
│   │   │       └── 發佈/存草稿
│   │   │
│   │   └── 📂 [業主] 我的案件
│   │       ├── /projects/mine?status=draft        # 草稿
│   │       ├── /projects/mine?status=matching     # 配對中
│   │       ├── /projects/mine?status=contracting  # 待簽約
│   │       ├── /projects/mine?status=active       # 進行中
│   │       ├── /projects/mine?status=review       # 待驗收
│   │       └── /projects/mine?status=completed    # 已結案
│   │
│   ├── /projects/:id/room             # Project Room（成交後）
│   │   ├── /overview                  # 狀態、下一步 CTA
│   │   ├── /candidates                # 候選單位比較
│   │   │   ├── Solo Bids 列表
│   │   │   ├── Team Bids 列表
│   │   │   └── 比較視圖
│   │   ├── /contract                  # 合約
│   │   │   ├── 合約草稿
│   │   │   ├── 簽署流程
│   │   │   └── Escrow 托管啟動
│   │   ├── /milestones                # 里程碑
│   │   │   ├── 交付物上傳
│   │   │   ├── 驗收（通過/退回）
│   │   │   ├── 請款（接案方）
│   │   │   └── 放款（業主）
│   │   ├── /messages                  # 專案討論
│   │   │   ├── 聊天室
│   │   │   └── Thread（按里程碑/主題）
│   │   ├── /changes                   # 變更請求
│   │   │   ├── 變更申請
│   │   │   ├── 影響差異
│   │   │   └── 雙方確認
│   │   ├── /dispute                   # 爭議/仲裁
│   │   │   ├── 發起爭議
│   │   │   ├── 證據上傳
│   │   │   └── 裁決與執行
│   │   └── /settings                  # 專案設定
│   │       ├── 成員/權限
│   │       ├── 成員變更
│   │       ├── 通知設定
│   │       └── 封存/結案
│   │
│   ├── /lobby                         # 組隊大廳（Raid Lobby）
│   │   ├── /lobby/browse              # Lobby 列表
│   │   │   └── 房間卡片
│   │   │       ├── 目標案件資訊
│   │   │       ├── 房主資訊
│   │   │       ├── 缺口角色
│   │   │       ├── 門檻條件
│   │   │       └── CTA：申請/快速加入
│   │   ├── /lobby/:id                 # 房間詳情（Team Room）
│   │   │   ├── 成員名單/角色配置
│   │   │   ├── Role Slots
│   │   │   ├── 申請加入
│   │   │   ├── 房主審核
│   │   │   ├── Ready Check
│   │   │   └── 送出隊伍投標
│   │   └── /lobby/create              # 建房
│   │       ├── 選定目標案件
│   │       ├── 設定角色槽位/門檻
│   │       ├── 分潤規則（Loot Split）
│   │       └── 發佈到 Lobby
│   │
│   ├── /teams                         # 我的隊伍
│   │   ├── /teams?status=forming      # 組隊中
│   │   ├── /teams?status=ready        # 達標可投標
│   │   ├── /teams?status=applied      # 已投標
│   │   ├── /teams?status=shortlisted  # 入選待面試
│   │   ├── /teams?status=selected     # 被選定
│   │   ├── /teams?status=closed       # 已結束
│   │   └── /teams/:id/manage          # 隊伍管理
│   │       ├── 成員/角色/權限
│   │       ├── 門檻調整
│   │       ├── Ready Check
│   │       ├── 投標紀錄
│   │       └── 分潤規則
│   │
│   ├── /talents                       # 人才列表
│   │   └── /talents/:id               # 人才詳情
│   │
│   ├── /messages                      # 訊息中心
│   │   ├── /inbox                     # 收件匣
│   │   ├── /notifications             # 系統通知
│   │   ├── /threads                   # 專案 Thread
│   │   └── /search                    # 搜尋
│   │
│   ├── /finance                       # 金流
│   │   ├── /overview                  # 金流總覽
│   │   ├── /transactions              # 交易紀錄
│   │   ├── /accounts                  # 帳戶設定
│   │   └── /reports                   # 對帳/報表
│   │
│   ├── /profile                       # 我的資料
│   │   ├── /edit                      # 個人資料編輯
│   │   ├── /kyc                       # KYC 驗證
│   │   ├── /stats                     # 戰績
│   │   │   ├── Rank 牌位
│   │   │   ├── MMR/Score
│   │   │   ├── 可靠度指標
│   │   │   └── 案件紀錄
│   │   ├── /leaderboard               # 排行榜
│   │   │   ├── 全站榜
│   │   │   ├── 角色榜
│   │   │   └── 我的排名
│   │   └── /settings                  # 設定
│   │       ├── 通知
│   │       ├── 安全
│   │       ├── 隱私
│   │       └── 可見度
│   │
│   └── /community                     # 社群與資源
│       ├── /mbti                      # MBTI測試
│       ├── /learning                  # 學習資源
│       ├── /social                    # 社群平台
│       └── /knowledge                 # 知識庫
│
└── 🔧 Admin (後台)
    │
    ├── /admin/users                   # 使用者管理
    │   ├── /list                      # 使用者列表
    │   ├── /kyc                       # KYC 審核
    │   └── /permissions               # 權限/RBAC
    │
    ├── /admin/jobs                    # 案件/隊伍管理
    │   ├── /projects                  # 案件管理（檢舉/下架）
    │   ├── /teams                     # 隊伍房間監控
    │   └── /templates                 # 模板管理
    │
    ├── /admin/finance                 # 金流/風控
    │   ├── /monitoring                # 交易監控
    │   ├── /refunds                   # 退款/逆轉
    │   └── /fraud                     # 刷榜/作弊偵測
    │
    └── /admin/disputes                # 爭議處理
        ├── /queue                     # 爭議案件池
        ├── /process                   # 裁決流程
        └── /execute                   # 裁決執行
```

## 結構說明

| 區塊 | 說明 |
|------|------|
| **Public** | 未登入使用者可瀏覽的頁面 |
| **App** | 登入後的主要功能區 |
| **Admin** | 後台管理系統 |

## URL 設計原則

- 狀態篩選使用 query params：`?status=draft`
- 動態路由使用 `:id` 表示
- 巢狀結構反映功能層級關係
