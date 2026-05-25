"""
discord_bot.py — Discord Bot

監聽 Discord @mention，呼叫 NemoClaw sandbox 內的 OpenClaw agent 回答問題。
對話記憶由 OpenClaw session 管理（session-id = channel_id）。

啟動方式：
  python discord_bot.py
  （或由 Docker 容器啟動）

必要環境變數：
  DISCORD_TOKEN       — Discord Bot token
  NEMOCLAW_CONTAINER  — NemoClaw Docker 容器名稱（預設 openshell-cluster-nemoclaw）
"""

import asyncio
import json
import os
import shlex
import subprocess
from pathlib import Path

from dotenv import load_dotenv
import discord

load_dotenv(Path(__file__).parent / ".env")

DISCORD_TOKEN      = os.environ.get("DISCORD_TOKEN", "")
NEMOCLAW_CONTAINER = os.environ.get("NEMOCLAW_CONTAINER", "openshell-cluster-nemoclaw")
OPENCLAW_CONFIG    = "/sandbox/.openclaw/openclaw.json"
SYSTEM_PROMPT_PATH = "/vault/agent_system_prompt.md"

# ── OpenClaw helpers ───────────────────────────────────────────────────────────

def _read_system_prompt() -> str:
    try:
        result = subprocess.run(
            [
                "docker", "exec", NEMOCLAW_CONTAINER,
                "kubectl", "exec", "-n", "openshell", "my-assistant", "--",
                "cat", SYSTEM_PROMPT_PATH,
            ],
            capture_output=True, text=True, timeout=10,
        )
        return result.stdout.strip()
    except Exception:
        return ""


def ask_openclaw(message: str, session_id: str) -> str:
    system_prompt = _read_system_prompt()
    if system_prompt:
        message = f"{system_prompt}\n\n---\n\n{message}"

    inner_cmd = (
        f"OPENCLAW_CONFIG_PATH={OPENCLAW_CONFIG} "
        f"NODE_EXTRA_CA_CERTS=/etc/openshell-tls/openshell-ca.pem "
        f"SSL_CERT_FILE=/etc/openshell-tls/ca-bundle.pem "
        f"HTTPS_PROXY=http://10.200.0.1:3128 "
        f"NO_PROXY=127.0.0.1,localhost,::1 "
        f"openclaw agent --agent main --json "
        f"-m {shlex.quote(message)} "
        f"--session-id {shlex.quote(session_id)}"
    )
    # PID lookup and nsenter in one shell to avoid TOCTOU race
    outer_cmd = (
        f"pid=$(pgrep -f openclaw-gateway | head -1) && "
        f"[ -n \"$pid\" ] || {{ echo '[error] openclaw-gateway not running' >&2; exit 1; }} && "
        f"nsenter -t \"$pid\" -n -u -i -- "
        f"su sandbox -s /bin/sh -c {shlex.quote(inner_cmd)}"
    )

    try:
        result = subprocess.run(
            [
                "docker", "exec", NEMOCLAW_CONTAINER,
                "kubectl", "exec", "-n", "openshell", "my-assistant", "--",
                "sh", "-c", outer_cmd,
            ],
            capture_output=True, text=True, timeout=120,
        )
        output = result.stdout.strip()
        if not output:
            err = result.stderr.strip()
            return f"[error] OpenClaw 無回應：{err or '未知錯誤'}"

        # openclaw --json may output pretty-printed multi-line JSON; try whole output first
        def _extract_text(data: dict) -> str:
            payloads = data.get("result", {}).get("payloads", [])
            return "\n\n".join(p["text"] for p in payloads if p.get("text", "").strip())

        try:
            data = json.loads(output)
            if data.get("status") == "ok":
                return _extract_text(data)
        except (json.JSONDecodeError, KeyError, IndexError):
            pass

        # fall back to line-by-line in case there's leading noise before a single-line JSON
        for line in reversed(output.splitlines()):
            if not line.strip():
                continue
            try:
                data = json.loads(line)
                if data.get("status") == "ok":
                    return _extract_text(data)
            except (json.JSONDecodeError, KeyError, IndexError):
                continue

        return f"[error] 無法解析 OpenClaw 回應：{output[:500]}"
    except subprocess.TimeoutExpired:
        return "[timeout] OpenClaw 回應超時，請再試一次。"
    except Exception as e:
        return f"[error] 呼叫 OpenClaw 失敗：{e}"


# ── Discord Bot ────────────────────────────────────────────────────────────────

intents = discord.Intents.default()
intents.message_content = True
discord_client = discord.Client(intents=intents)


@discord_client.event
async def on_ready() -> None:
    print(f"Discord Bot 上線：{discord_client.user} (id={discord_client.user.id})")
    print(f"NemoClaw 容器：{NEMOCLAW_CONTAINER}")


@discord_client.event
async def on_message(message: discord.Message) -> None:
    if message.author.bot:
        return
    if discord_client.user not in message.mentions:
        return

    channel_id = message.channel.id

    text = message.content
    for u in message.mentions:
        text = text.replace(f"<@{u.id}>", "").replace(f"<@!{u.id}>", "")
    text = text.strip()

    if not text:
        await message.reply("請問您有什麼問題？")
        return

    loop = asyncio.get_event_loop()

    async with message.channel.typing():
        answer = await loop.run_in_executor(None, ask_openclaw, text, str(channel_id))

    if len(answer) > 1900:
        for i in range(0, len(answer), 1900):
            await message.channel.send(answer[i : i + 1900])
    else:
        await message.reply(answer)


def main() -> None:
    if not DISCORD_TOKEN:
        print("[ERROR] DISCORD_TOKEN 未設定，無法啟動。")
        return
    print(f"NemoClaw 容器：{NEMOCLAW_CONTAINER}")
    discord_client.run(DISCORD_TOKEN)


if __name__ == "__main__":
    main()
