---
project: Node_PM
doc_type: WBS
status: in-review
phase: dev
priority: high
owner: PM
admin_email: benben83922@gmail.com
updated: 2026-06-11
tags: [node-pm, infrastructure]
team:
  PM:
    email: benben83922@gmail.com
  TL:
    email: techlead@example.com
  BE:
    email: backend@example.com
  FE:
    email: frontend@example.com
---

# Node_PM — WBS 開發計畫

## 里程碑

| milestone_id | milestone_name | planned_date | actual_date | status |
| :--- | :--- | :--- | :--- | :--- |
| M1 | YAML 規範 + GitHub 同步建立 | 2026-06-15 | | 進行中 |
| M2 | Obsidian 知識庫完成 | 2026-06-20 | | 未開始 |
| M3 | OpenClaw Discord Agent 啟動 | 2026-06-25 | | 未開始 |
| M4 | GitHub Actions + Supabase 管道上線 | 2026-06-30 | | 進行中 |
| M5 | Web App 部署完成 | 2026-07-14 | | 進行中 |

---

## Phase 0 — 規範建立

### YAML Frontmatter 規範

- [x] M1.1 定義 8 個核心 Frontmatter 欄位 [owner:: PM:Ben]
- [x] M1.2 撰寫 YAML 設計規格書 [owner:: PM:Ben]
- [ ] M1.3 更新 CLAUDE.md，加入 Frontmatter 產出規則 [owner:: PM:Ben] #2026-06-15

### WBS 格式規範

- [x] M1.4 定義 WBS 任務格式（`- [ ]` + owner + deadline） [owner:: PM:Ben]
- [x] M1.5 定義里程碑表格格式 [owner:: PM:Ben]

---

## Phase 1 — GitHub → Obsidian 同步

- [ ] M2.1 建立 Obsidian Vault 目錄結構 [owner:: PM:Ben] #2026-06-18
- [ ] M2.2 安裝並設定 Obsidian Git Plugin（auto pull 每 1 分鐘） [owner:: PM:Ben] #2026-06-18
- [ ] M2.3 驗證 git push 後 1 分鐘內 Vault 自動更新 [owner:: TL:Tech Lead] #2026-06-20

---

## Phase 2 — Obsidian 知識庫

- [ ] M3.1 安裝 Dataview Plugin [owner:: PM:Ben] #2026-06-22
- [ ] M3.2 安裝 Kanban Plugin [owner:: PM:Ben] #2026-06-22
- [ ] M3.3 安裝 Templater Plugin [owner:: PM:Ben] #2026-06-22
- [ ] M3.4 確認 Mermaid 渲染正常 [owner:: TL:Tech Lead] #2026-06-23
- [ ] M3.5 建立各專案 _Dashboard.md 範本 [owner:: PM:Ben] #2026-06-25

---

## Phase 3 — OpenClaw Discord Agent

- [x] M4.1 準備 openclaw_for_obsidian 安裝腳本 [owner:: BE:Backend]
- [ ] M4.2 執行 setup.sh 啟動 OpenClaw Docker 容器 [owner:: BE:Backend] #2026-06-26
- [ ] M4.3 設定 Discord Bot Token 與 Server ID [owner:: BE:Backend] #2026-06-26
- [ ] M4.4 測試自然語言查詢（「Node_PM 目前進度？」） [owner:: PM:Ben] #2026-06-28

---

## Phase 4 — GitHub Actions + Supabase 資料管道

- [x] M5.1 撰寫 sync_wbs_to_supabase.py 解析腳本 [owner:: BE:Backend]
- [x] M5.2 撰寫 wbs_sync.yml GitHub Actions Workflow [owner:: BE:Backend]
- [x] M5.3 建立 wbs_sync_reusable.yml（Reusable Workflow） [owner:: BE:Backend]
- [ ] M5.4 在 Supabase 執行 001–007 Migration [owner:: BE:Backend] #2026-06-30
- [ ] M5.5 設定 GitHub Secrets（SUPABASE_URL、SUPABASE_SERVICE_ROLE_KEY） [owner:: TL:Tech Lead] #2026-06-30
- [ ] M5.6 驗證 push WBS.md 後 Supabase 資料正確更新 [owner:: BE:Backend] #2026-07-01

---

## Phase 5 — Web App 儀表板

- [x] M6.1 建立 React + Vite 專案結構 [owner:: FE:Frontend]
- [x] M6.2 實作三角色路由（PM / Engineer / Client） [owner:: FE:Frontend]
- [x] M6.3 實作 Supabase Auth + RoleGuard [owner:: FE:Frontend]
- [x] M6.4 實作 PM 儀表板元件（L1/L2/L3） [owner:: FE:Frontend]
- [x] M6.5 實作 Engineer 儀表板元件 [owner:: FE:Frontend]
- [x] M6.6 實作 Client 儀表板元件 [owner:: FE:Frontend]
- [ ] M6.7 設定 Vercel 部署（連接 GitHub repo） [owner:: TL:Tech Lead] #2026-07-07
- [ ] M6.8 設定 Vercel 環境變數（VITE_SUPABASE_URL、VITE_SUPABASE_ANON_KEY） [owner:: TL:Tech Lead] #2026-07-07
- [ ] M6.9 三角色登入端對端測試 [owner:: FE:Frontend] #2026-07-10
- [ ] M6.10 執行 security_check.sh 並通過所有檢查 [owner:: TL:Tech Lead] #2026-07-12
