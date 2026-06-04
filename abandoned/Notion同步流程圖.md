# Notion 同步流程圖

> 來源：`docs/Notion同步規劃_討論彙整.html`
> 架構定案：GitHub 當唯一事實來源 → 正向單向鏡像到 Notion + 受控反向（一檔一主人）
> 燈號：🟢 完全 OK ・ 🟡 可行但有風險（要配防護）・ ⛔ 紅線（別做）

---

## 一、整體架構流程圖

```mermaid
flowchart TB
    GH[("🗂️ GitHub<br/>.md 唯一事實來源")]:::source

    subgraph LOCAL["技術人員（本地）"]
        direction TB
        TA["👨‍💻 技術人員 A/B 本地<br/>改 .md"]:::ok
        OBS["Obsidian-Git<br/>只 pull"]:::ok
        OC["本地 OpenClaw<br/>讀 vault 回 Discord"]:::ok
    end

    NT["🌐 Notion<br/>付費工作區<br/>讀 + 留言"]:::source
    NONTECH["🙋 非技術人員<br/>在 Notion 改內容/任務狀態"]:::warn
    COC["🤖 中央 OpenClaw<br/>反向同步器"]:::warn
    GUARD{{"⚠️ 衝突防呆閘<br/>偵測 &lt;&lt;&lt;&lt;&lt;&lt;&lt;"}}:::warn

    %% 正向：GitHub 出去（全綠）
    GH -->|"pull (單向)"| OBS
    OBS --> OC
    TA -->|"pull --rebase → commit → push"| GH

    GH ==>|"① push 觸發<br/>中央 Action · REST API<br/>martian: md→blocks"| GUARD
    GUARD ==>|"無衝突標記才推"| NT
    GUARD -.->|"含衝突標記 → 拒推"| ALERT["📣 Discord 告警"]:::bad

    %% 反向：Notion 回 GitHub（黃燈）
    NONTECH -->|"② 叫反向同步"| COC
    COC -.->|"只『讀』Notion (API/MCP)"| NT
    COC -->|"③ 重建 frontmatter<br/>按任務ID patch 單行<br/>pull-rebase → push<br/>(git 寫，不直寫 Notion)"| GH

    classDef source fill:#1c2330,stroke:#58a6ff,color:#e6edf3,stroke-width:2px
    classDef ok fill:#0f2417,stroke:#3fb950,color:#d6ffe0
    classDef warn fill:#2a2410,stroke:#d29922,color:#ffe9b8
    classDef bad fill:#2a1414,stroke:#f85149,color:#ffd6d3
```

---

## 二、`authority` 一檔一主人 — 分流決策圖

```mermaid
flowchart TB
    START(["📄 一份 .md 文件"]):::start
    Q1{"是結構化文件嗎？<br/>(WBS / Dataview /<br/>含 inline field / Mermaid)"}:::q

    START --> Q1
    Q1 -->|"是"| TECH["authority: github<br/>🔧 技術文件"]:::tech
    Q1 -->|"否"| Q2{"主要由誰維護內容？"}:::q

    Q2 -->|"技術人員<br/>(規格/架構)"| TECH
    Q2 -->|"非技術人員<br/>(內容/文案)"| CONTENT["authority: notion<br/>📝 內容文件"]:::content

    TECH --> TDIR["✍️ 只在 GitHub 改<br/>(改本地 .md → push)"]:::ok
    TDIR --> TSYNC["GitHub → Notion 單向"]:::ok
    TSYNC --> TLOCK["🔒 Notion 頁面鎖唯讀<br/>(成員只讀 + 留言)"]:::ok

    CONTENT --> CEDIT["✍️ 只在 Notion 改"]:::warn
    CEDIT --> CSYNC["Notion → GitHub 反向<br/>(中央 OpenClaw)"]:::warn
    CSYNC --> CLOCK["技術人員<br/>不在 git 直接改"]:::warn

    TECH -.->|"⛔ 別讓非技術人員<br/>在 Notion 改正文"| X1["💥 整頁反向 → 全壞"]:::bad

    classDef start fill:#1c2330,stroke:#58a6ff,color:#e6edf3,stroke-width:2px
    classDef q fill:#161b22,stroke:#8b949e,color:#e6edf3
    classDef tech fill:#11203a,stroke:#58a6ff,color:#cfe4ff,stroke-width:2px
    classDef content fill:#221a2e,stroke:#a371f7,color:#e7d6ff,stroke-width:2px
    classDef ok fill:#0f2417,stroke:#3fb950,color:#d6ffe0
    classDef warn fill:#2a2410,stroke:#d29922,color:#ffe9b8
    classDef bad fill:#2a1414,stroke:#f85149,color:#ffd6d3
```

> 系統層級「雙向」，但每份檔案都是**單向**——衝突機率趨近零。判斷沒把握時預設歸 `authority: github`。

---

## 三、WBS 任務狀態反向同步 — 「外科手術 patch 單行」序列圖

```mermaid
sequenceDiagram
    autonumber
    actor U as 🙋 非技術人員
    participant N as 🌐 Notion DB<br/>(一列一任務)
    participant D as 💬 Discord
    participant OC as 🤖 中央 OpenClaw
    participant ST as 🗃️ state.json<br/>(.notion-sync)
    participant GH as 🗂️ GitHub WBS.md

    U->>N: 改「狀態」下拉 (進行中 → 完成)
    U->>D: 下指令觸發反向同步
    D->>OC: 啟動反向同步器

    Note over OC,N: ① 只『讀』Notion
    OC->>N: API 讀該列：任務ID + 狀態
    N-->>OC: { id: "M3.1.3", status: "done" }

    Note over OC,ST: ② 回音抑制
    OC->>ST: 比對 notion_hash
    alt hash 未變
        ST-->>OC: 跳過（避免無限迴圈）
    else hash 變了
        ST-->>OC: 繼續

        Note over OC,GH: ③ 外科手術，不整頁轉回
        OC->>GH: git pull --rebase
        OC->>OC: 用任務ID「M3.1.3」定位那一行
        OC->>OC: 只翻轉 [ ] → [x]，其他 byte 不動
        OC->>GH: commit + push (git 寫)
        OC->>ST: 更新 md_hash / notion_hash / 時間戳
        OC->>D: 回貼 git diff 確認 (只有 1 行變動)
    end

    Note over OC,N: ⛔ 全程不整頁 notion-to-md<br/>⛔ OpenClaw 絕不直接寫 Notion
```

---

## 四、回音抑制 + 衝突偵測 — 四象限狀態判斷

```mermaid
flowchart TB
    SYNC(["🔄 同步觸發<br/>比對 state.json 雙邊 hash"]):::start
    Q1{"md_hash<br/>變了？"}:::q
    Q2A{"notion_hash<br/>變了？"}:::q
    Q2B{"notion_hash<br/>變了？"}:::q

    SYNC --> Q1
    Q1 -->|"否"| Q2A
    Q1 -->|"是"| Q2B

    Q2A -->|"否"| NOOP["😴 兩邊都沒變<br/>→ 不同步"]:::ok
    Q2A -->|"是"| REV["⬅️ 只 Notion 變<br/>→ 反向 Notion→GitHub"]:::warn
    Q2B -->|"否"| FWD["➡️ 只 GitHub 變<br/>→ 正向 GitHub→Notion"]:::ok
    Q2B -->|"是"| CONFLICT["⚠️ 兩邊都變 = 衝突<br/>依時間戳判贏家<br/>輸家存 xxx.conflict.md 不刪<br/>+ Discord 告警"]:::bad

    classDef start fill:#1c2330,stroke:#58a6ff,color:#e6edf3,stroke-width:2px
    classDef q fill:#161b22,stroke:#8b949e,color:#e6edf3
    classDef ok fill:#0f2417,stroke:#3fb950,color:#d6ffe0
    classDef warn fill:#2a2410,stroke:#d29922,color:#ffe9b8
    classDef bad fill:#2a1414,stroke:#f85149,color:#ffd6d3
```

---

## ⛔ 紅線總表（會壞，別做）

| 別做 | 原因 |
|---|---|
| 結構化文件用整頁 `notion-to-md` 反向 | 整份重序列化 → Dataview/表格/owner/縮排全壞 |
| 讓非技術人員在 Notion 改結構化文件正文 | 同上，這類文件應 GitHub 單向 + Notion 鎖唯讀 |
| 讓 OpenClaw 直接「寫」Notion | 繞過 GitHub，重新製造雙向衝突 |
| 每台本地機器各自推 Notion | 多寫入者搶同一 Notion → 競態 |
| block 級智慧合併 | 雙向同步最大的坑，免費方案無法可靠維護 |
