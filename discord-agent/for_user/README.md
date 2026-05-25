# Discord Agent 安裝說明

## 前置需求

安裝前請確認以下項目已完成：

- **Docker Desktop** 已安裝並啟動
  - 下載：https://docs.docker.com/get-docker/
- 你的 **Discord Bot Token**（從 Discord Developer Portal 取得）
- 你的 **Obsidian Vault 資料夾路徑**

---

## 安裝步驟

### Windows

> 需要先安裝 WSL2（Windows Subsystem for Linux）。  
> 若尚未安裝，請在 PowerShell 執行：`wsl --install`，重啟後再繼續。

1. 雙擊 `setup.bat`
2. 依照畫面提示填入設定

---

### Mac

1. 雙擊 `setup.command`
2. 若出現「無法打開，因為無法確認開發者身份」，請：
   - 前往**系統設定 → 隱私權與安全性**，點選「仍然開啟」
   - 或在終端機執行：`xattr -d com.apple.quarantine setup.command`
3. 依照畫面提示填入設定

---

### Linux

1. 開啟終端機，進入此資料夾
2. 執行：
   ```bash
   chmod +x setup.sh && ./setup.sh
   ```
3. 依照畫面提示填入設定

---

## 安裝過程會詢問三件事

| 問題 | 說明 | 範例 |
|------|------|------|
| Discord Bot Token | 從 Discord Developer Portal 取得 | `MTExxx...` |
| Obsidian Vault 路徑 | Vault 資料夾的完整路徑 | Windows：`/mnt/c/Users/你的帳號/ObsidianVault` |
| Port | 服務監聽的 Port，直接 Enter 使用預設 | 預設 `8080` |

---

## 安裝完成後

安裝成功後畫面會顯示：

```
  ✅ 服務已啟動

  OpenClaw 連線 URL：
  http://host.docker.internal:8080

  Health check：
  http://localhost:8080/health
```

將 **OpenClaw 連線 URL** 填入 OpenClaw 設定即可。

電腦重新啟動後服務會**自動恢復**，不需要重新執行安裝程式。

---

## 常見問題

**Q：出現「Docker daemon 未啟動」**  
A：請先開啟 Docker Desktop，等待它完全啟動後再執行。

**Q：出現「找不到路徑」**  
A：請確認 Obsidian Vault 路徑正確。Windows 使用者需使用 WSL 路徑格式，例如 `C:\Users\帳號\ObsidianVault` 要改寫成 `/mnt/c/Users/帳號/ObsidianVault`。

**Q：想修改 Token 或路徑**  
A：重新執行安裝程式，輸入新的設定即可覆蓋。
