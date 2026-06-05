# 生產部署 Runbook (WBS 6.0)

**適用版本：** Node_PM Web App v1.x  
**預計部署日：** 2026-07-10

---

## 前置條件清單（全部 ✅ 才可繼續）

- [ ] M4 里程碑通過（三角色儀表板完整 + 33 個單元測試全過）
- [ ] RLS 驗收 15 情境全部通過（`supabase/migrations/003_rls_acceptance_tests.sql`）
- [ ] `scripts/security_check.sh` 4 項全部 PASS
- [ ] `npm audit` 無 high/critical 漏洞
- [ ] Vercel Preview Deploy 已通過 Lighthouse（LCP < 2.5s, CLS < 0.1）

---

## 步驟 1：設定 GitHub Repository Secrets (3.2.1)

前往：**GitHub Repo → Settings → Secrets and variables → Actions → New repository secret**

| Secret 名稱 | 值來源 |
|-------------|--------|
| `SUPABASE_URL` | Supabase Dashboard → Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API → service_role key |
| `E2E_ADMIN_EMAIL` | 測試用 admin 帳號 email |
| `E2E_ADMIN_PASSWORD` | 測試用 admin 帳號密碼 |
| `E2E_DEV_EMAIL` | 測試用 developer 帳號 email |
| `E2E_DEV_PASSWORD` | 測試用 developer 帳號密碼 |
| `E2E_VIEWER_EMAIL` | 測試用 viewer 帳號 email |
| `E2E_VIEWER_PASSWORD` | 測試用 viewer 帳號密碼 |

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY` 絕對不能出現在任何 git 追蹤的檔案中。

---

## 步驟 2：設定 Google OAuth (3.1.6)

1. 前往 [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. 建立 OAuth 2.0 Client ID（Web application）
3. Authorized redirect URIs 新增：
   - `https://<your-supabase-project>.supabase.co/auth/v1/callback`
   - `http://localhost:5173/auth/v1/callback`（開發用）
4. 複製 Client ID 和 Client Secret
5. 前往 Supabase Dashboard → Authentication → Providers → Google
6. 貼上 Client ID 和 Client Secret → Enable → Save

---

## 步驟 3：連接 Vercel (3.3.4 / 3.3.5)

1. 前往 [vercel.com](https://vercel.com) → New Project
2. Import Git Repository → 選擇 `Node_PM` repo
3. Root Directory 設為 `web`
4. Environment Variables 新增（Production + Preview）：

   | 變數名稱 | 值 |
   |----------|-----|
   | `VITE_SUPABASE_URL` | Supabase Project URL |
   | `VITE_SUPABASE_ANON_KEY` | Supabase anon key（公開安全） |

5. Deploy → 等待首次部署完成
6. 確認 Custom Domain（可選）：Vercel → Settings → Domains

---

## 步驟 4：三角色整合測試 (4.2.8)

確認以下三條路徑完整走過：

**Admin（PM）：**
- [ ] 以 admin 帳號 Google 登入 → 自動導向 `/pm`
- [ ] 選擇專案 → 看到進度圓環、健康狀態、S 曲線
- [ ] 切換到 `/pm/:id/milestones` 和 `/pm/:id/tasks`

**Developer（工程師）：**
- [ ] 以 developer 帳號登入 → 自動導向 `/engineer`
- [ ] 看到個人任務看板和燃盡圖
- [ ] 嘗試前往 `/pm` → 確認導向 `/forbidden`

**Viewer（客戶）：**
- [ ] 以 viewer 帳號 Magic Link 登入 → 自動導向 `/client`
- [ ] 看到完成率圓餅圖和里程碑時間軸
- [ ] 嘗試前往 `/pm` 和 `/engineer` → 確認導向 `/forbidden`

---

## 步驟 5：RLS 驗收 (5.3.1 / 5.3.4)

在 Supabase SQL Editor 執行 `supabase/migrations/003_rls_acceptance_tests.sql` 中的 15 個測試情境。

驗收標準：
- TC-RLS-001 至 TC-RLS-013：每個情境結果符合 SQL 檔案中的 `-- Expected:` 說明
- TC-RLS-014 至 TC-RLS-015：匿名查詢回傳 0 rows

---

## 步驟 6：效能驗收 (5.4.1 / 5.4.3)

1. 在 Vercel Preview URL 執行 Lighthouse（Chrome DevTools → Lighthouse 或 PageSpeed Insights）
2. 目標指標：

   | 指標 | 目標 |
   |------|------|
   | LCP | < 2.5s |
   | CLS | < 0.1 |
   | TBT | < 300ms |

3. 大資料量測試：在 Supabase 插入 1,000 筆任務、50 個里程碑，確認 S 曲線頁面渲染 < 3s

---

## 步驟 7：Production 部署 (6.2.3)

```bash
git checkout main
git pull origin main
git push origin main   # 觸發 Vercel 自動部署
```

等待 Vercel Dashboard 顯示部署成功 → 前往正式 URL 確認。

---

## 步驟 8：啟用監控 (6.3)

1. **Vercel Analytics**：Vercel → Project → Analytics → Enable Speed Insights
2. **Supabase Logs**：Supabase Dashboard → Logs → 確認 Auth Log 和 Postgres Log 可查
3. **Supabase Backup**：Supabase Dashboard → Database → Backups → 確認 PITR 已啟用

---

## 緊急回滾程序 (6.3.4)

如發現生產環境異常：

1. **Vercel 回滾（< 30 秒）**：
   - Vercel Dashboard → Deployments → 選擇上一個成功部署 → Promote to Production

2. **Supabase 資料庫回滾**：
   - Supabase Dashboard → Database → Backups → Point in Time Recovery

---

## 部署後確認清單

- [ ] 生產 URL HTTPS 強制重導
- [ ] `/login` 頁面 Google OAuth 按鈕可點擊
- [ ] Magic Link 信件正常送達
- [ ] 所有三個角色的儀表板在正式環境正常顯示資料
- [ ] Vercel Analytics 顯示流量
- [ ] `scripts/security_check.sh` 在正式環境 CI 通過

**部署完成後更新 WBS：** 6.0 所有任務標記 ✅，整體進度 → 100%
