"""
main.py — NemoClaw Discord Agent + Claude Code CLI Proxy

兩個元件合併在同一支檔案（規格書 7.1 單一檔案原則）：
  1. Flask Proxy（port 8080）：實作 /v1/messages（Anthropic Messages API 格式），
     供 NemoClaw Privacy Router 呼叫；接收請求後以 subprocess 呼叫 claude -p 執行推論。
  2. Discord Bot：監聽 @mention，搜尋 Vault 內容，呼叫 ask_claude() 回答，
     偵測「總結」指令時將本 session 對話摘要寫入 Vault _Conversations/。

並行機制：Flask 在 daemon thread 執行，Discord bot 在主執行緒執行（規格書 7.3）。

啟動方式：
  python main.py
  （接著再執行 nemoclaw my-assistant connect）

必要環境變數：
  DISCORD_TOKEN  — Discord Bot token
  VAULT_PATH     — ObsidianVault 在 WSL2 的路徑（預設 /mnt/c/Users/benben83922/ObsidianVault）
  PROXY_PORT     — Flask Proxy 監聽埠（預設 8080）
"""

import os
import re
import json
import subprocess
import threading
import requests
from datetime import date, datetime
from pathlib import Path

from dotenv import load_dotenv
import discord
from flask import Flask, request, jsonify

load_dotenv(Path(__file__).parent / ".env")

# ── Config ─────────────────────────────────────────────────────────────────────

VAULT_PATH    = Path(os.environ.get("VAULT_PATH", ""))
DISCORD_TOKEN = os.environ.get("DISCORD_TOKEN", "")
PROXY_PORT    = int(os.environ.get("PROXY_PORT", 8081))
OPENCLAW_URL  = os.environ.get("OPENCLAW_URL", "http://host.docker.internal:8080")

# ── In-memory conversation history ────────────────────────────────────────────
# { channel_id: [(role, content), ...] }
# role 為 "user" 或 "assistant"，重啟後清空（規格書 4.2）

_history: dict[int, list[tuple[str, str]]] = {}
_history_lock = threading.Lock()

# ── Vault helpers ──────────────────────────────────────────────────────────────

def scan_projects() -> list[str]:
    """回傳 Vault 第一層含 .md 文件的子資料夾名稱，跳過 _ 開頭的系統資料夾（規格書 5.1）。"""
    if not VAULT_PATH.exists():
        return []
    projects = []
    for entry in sorted(VAULT_PATH.iterdir()):
        if not entry.is_dir():
            continue
        if entry.name.startswith("_"):
            continue
        if any(entry.rglob("*.md")):
            projects.append(entry.name)
    return projects



# ── History helpers ────────────────────────────────────────────────────────────

def get_history(channel_id: int) -> list[tuple[str, str]]:
    with _history_lock:
        return list(_history.get(channel_id, []))


def append_history(channel_id: int, role: str, content: str) -> None:
    with _history_lock:
        _history.setdefault(channel_id, []).append((role, content))


def clear_history(channel_id: int) -> None:
    with _history_lock:
        _history.pop(channel_id, None)

# ── Claude CLI helpers ─────────────────────────────────────────────────────────

def ask_claude(prompt: str) -> str:
    """
    以 subprocess 呼叫 claude -p，回傳答案文字（規格書 7.2 ask_claude）。
    每次呼叫都是新 session；對話記憶由 Proxy 自行從 in-memory history 注入（規格書 6.6）。
    """
    try:
        result = subprocess.run(
            ["claude", "-p", prompt],
            capture_output=True,
            text=True,
            timeout=120,
            cwd=VAULT_PATH
        )
        output = result.stdout.strip()
        if not output and result.stderr:
            return f"[claude error] {result.stderr.strip()}"
        return output
    except subprocess.TimeoutExpired:
        return "[timeout] Claude 回應超時，請再試一次。"
    except FileNotFoundError:
        return "[error] 找不到 claude CLI，請先在 WSL2 執行 claude -p 'hello' 確認已登入。"


def ask_openclaw(prompt: str) -> str:
    """
    透過 HTTP 呼叫 OpenClaw，由 OpenClaw 負責讀 Vault 並呼叫 Anthropic API。
    OpenClaw 若設定 Privacy Router 則會反呼叫本服務的 Flask Proxy（/v1/messages）。
    """
    try:
        resp = requests.post(
            f"{OPENCLAW_URL}/v1/messages",
            json={
                "model": "claude-sonnet-4-6",
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 4096,
            },
            timeout=120,
        )
        resp.raise_for_status()
        return resp.json()["content"][0]["text"]
    except requests.exceptions.Timeout:
        return "[timeout] OpenClaw 回應超時，請再試一次。"
    except Exception as e:
        return f"[error] 呼叫 OpenClaw 失敗：{e}"


def write_summary(channel_id: int, project: str | None) -> str:
    """
    從 in-memory history 產生摘要，寫入 Vault _Conversations/（規格書 3.3、4.3）。
    僅在用戶主動觸發時呼叫。
    """
    history = get_history(channel_id)
    if not history:
        return "目前沒有對話記錄可以總結。"

    conversation = "\n".join(
        f"{'用戶' if role == 'user' else 'AI'}: {content}"
        for role, content in history
    )
    prompt = (
        "以下是一段 Discord 討論記錄，請用繁體中文生成一份簡潔的討論摘要，"
        "包含主要問題、重要結論與待辦事項（若有）：\n\n" + conversation
    )
    summary_text = ask_openclaw(prompt)

    today = date.today().isoformat()
    target_project = project or (scan_projects() or ["General"])[0]
    conv_dir = VAULT_PATH / target_project / "_Conversations"
    conv_dir.mkdir(parents=True, exist_ok=True)

    output_path = conv_dir / f"discord-{today}.md"
    output_path.write_text(
        f"---\n"
        f"title: Discord 討論摘要 - {today}\n"
        f"doc_type: conversation_summary\n"
        f"project: {target_project}\n"
        f"channel: {channel_id}\n"
        f"updated: {today}\n"
        f"---\n\n"
        f"## {today} 討論摘要\n\n"
        f"{summary_text}\n",
        encoding="utf-8",
    )
    return f"已寫入 Obsidian：`{target_project}/_Conversations/discord-{today}.md`"

# ── Flask Proxy ────────────────────────────────────────────────────────────────

flask_app = Flask(__name__)


def _messages_to_prompt(messages: list[dict], system: str = "") -> str:
    """
    將 Anthropic Messages API 的 messages 陣列轉為單一 prompt 字串，
    傳給 claude -p（規格書 6.3：Privacy Router 使用 Anthropic-compatible 格式）。
    """
    parts: list[str] = []
    if system:
        parts.append(f"System: {system}")
    for msg in messages:
        role    = msg.get("role", "user")
        content = msg.get("content", "")
        if isinstance(content, list):
            content = " ".join(
                block.get("text", "")
                for block in content
                if block.get("type") == "text"
            )
        label = "Human" if role == "user" else "Assistant"
        parts.append(f"{label}: {content}")
    parts.append("Assistant:")
    return "\n\n".join(parts)


@flask_app.post("/v1/messages")
def proxy_messages():
    """
    Anthropic Messages API Proxy（規格書 6.3）。
    NemoClaw Privacy Router 發送 POST /v1/messages，Proxy 呼叫 claude -p 後回傳相同格式。
    必須 listen 0.0.0.0 才能讓 Docker 容器透過 host.docker.internal 連入（規格書 6.4）。
    """
    body     = request.get_json(force=True, silent=True) or {}
    messages = body.get("messages", [])
    system   = body.get("system", "")

    prompt = _messages_to_prompt(messages, system)
    answer = ask_claude(prompt)

    return jsonify({
        "id":            f"msg_{datetime.now().strftime('%Y%m%d%H%M%S%f')}",
        "type":          "message",
        "role":          "assistant",
        "content":       [{"type": "text", "text": answer}],
        "model":         "claude-sonnet-4-6",
        "stop_reason":   "end_turn",
        "stop_sequence": None,
        "usage":         {"input_tokens": 0, "output_tokens": 0},
    })


@flask_app.get("/health")
def health():
    return jsonify({"status": "ok", "vault": str(VAULT_PATH), "projects": scan_projects()})


def _run_flask() -> None:
    flask_app.run(host="0.0.0.0", port=PROXY_PORT, use_reloader=False)

# ── Discord Bot ────────────────────────────────────────────────────────────────

_SUMMARY_TRIGGERS = {"總結", "幫我總結", "summarize", "總結今天的討論", "幫我總結今天"}
_PROJECT_BRACKET  = re.compile(r"【(.+?)】|「(.+?)」|\[(.+?)\]")


def _detect_project(text: str, projects: list[str]) -> str | None:
    """從文字中嘗試識別明確提及的專案名稱。"""
    m = _PROJECT_BRACKET.search(text)
    if m:
        name = next(g for g in m.groups() if g)
        if name in projects:
            return name
    for p in projects:
        if p.lower() in text.lower():
            return p
    return None


intents = discord.Intents.default()
intents.message_content = True
discord_client = discord.Client(intents=intents)


@discord_client.event
async def on_ready() -> None:
    print(f"Discord Bot 上線：{discord_client.user} (id={discord_client.user.id})")
    print(f"Vault 專案：{scan_projects() or '（尚未找到）'}")


@discord_client.event
async def on_message(message: discord.Message) -> None:
    if message.author.bot:
        return
    if discord_client.user not in message.mentions:
        return

    channel_id = message.channel.id

    # 移除 @mention tag
    text = message.content
    for u in message.mentions:
        text = text.replace(f"<@{u.id}>", "").replace(f"<@!{u.id}>", "")
    text = text.strip()

    if not text:
        await message.reply("請問您有什麼問題？")
        return

    # ── 總結指令（規格書 3.3）────────────────────────────────────────────────
    if any(trigger in text for trigger in _SUMMARY_TRIGGERS):
        projects = scan_projects()
        project  = _detect_project(text, projects)
        async with message.channel.typing():
            reply = write_summary(channel_id, project)
        await message.reply(reply)
        return

    # ── 一般查詢
    history      = get_history(channel_id)
    history_text = ""
    if history:
        recent       = history[-6:]
        history_text = "\n".join(
            f"{'用戶' if r == 'user' else 'AI'}: {c}" for r, c in recent
        )
        history_text = f"## 對話歷史\n{history_text}\n\n"

    prompt = f"{history_text}## 用戶問題\n{text}"

    async with message.channel.typing():
        answer = ask_openclaw(prompt)

    append_history(channel_id, "user", text)
    append_history(channel_id, "assistant", answer)

    # Discord 單則訊息上限 2000 字元
    if len(answer) > 1900:
        for i in range(0, len(answer), 1900):
            await message.channel.send(answer[i : i + 1900])
    else:
        await message.reply(answer)

# ── Entry point ────────────────────────────────────────────────────────────────

def main() -> None:
    print(f"Vault 路徑    : {VAULT_PATH}")
    print(f"Proxy 監聽埠  : 0.0.0.0:{PROXY_PORT}")
    print(f"Vault 專案    : {scan_projects() or '（尚未找到）'}")

    if not DISCORD_TOKEN:
        print("[WARNING] DISCORD_TOKEN 未設定，僅啟動 Flask Proxy（Discord Bot 停用）。")
        _run_flask()
        return

    # Flask 在 daemon thread 執行，Discord bot 在主執行緒執行（規格書 7.3）
    flask_thread = threading.Thread(target=_run_flask, daemon=True, name="flask-proxy")
    flask_thread.start()

    discord_client.run(DISCORD_TOKEN)


if __name__ == "__main__":
    main()
