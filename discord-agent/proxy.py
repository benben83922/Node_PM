"""
proxy.py — Groq API Proxy

Flask 服務，實作 /v1/messages（Anthropic Messages API 格式），
供 NemoClaw Privacy Router 透過 host.docker.internal 呼叫。
接收請求後轉換格式呼叫 Groq API，支援 tool_use 與 SSE streaming。

啟動方式：
  python proxy.py

必要環境變數：
  GROQ_API_KEY — Groq API 金鑰
  GROQ_MODEL   — Groq 模型（預設 llama-3.3-70b-versatile）
  PROXY_PORT   — Flask 監聽埠（預設 8081）
"""

import json
import os
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, Response, jsonify, request, stream_with_context
from groq import Groq

load_dotenv(Path(__file__).parent / ".env")

PROXY_PORT   = int(os.environ.get("PROXY_PORT", 8081))
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_MODEL   = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")

groq_client = Groq(api_key=GROQ_API_KEY)

# ── Format conversion: Anthropic ↔ OpenAI/Groq ────────────────────────────────

def _to_openai_messages(messages: list[dict], system: str = "") -> list[dict]:
    result: list[dict] = []
    if system:
        result.append({"role": "system", "content": system})

    for msg in messages:
        role    = msg.get("role", "user")
        content = msg.get("content", "")

        if isinstance(content, str):
            result.append({"role": role, "content": content})
            continue

        text_blocks        = [b for b in content if b.get("type") == "text"]
        tool_use_blocks    = [b for b in content if b.get("type") == "tool_use"]
        tool_result_blocks = [b for b in content if b.get("type") == "tool_result"]

        if tool_use_blocks and role == "assistant":
            tool_calls = [
                {
                    "id": tc["id"],
                    "type": "function",
                    "function": {
                        "name": tc["name"],
                        "arguments": json.dumps(tc.get("input", {})),
                    },
                }
                for tc in tool_use_blocks
            ]
            text = " ".join(b.get("text", "") for b in text_blocks) or None
            result.append({"role": "assistant", "content": text, "tool_calls": tool_calls})

        elif tool_result_blocks and role == "user":
            for tr in tool_result_blocks:
                tr_content = tr.get("content", "")
                if isinstance(tr_content, list):
                    tr_content = "\n".join(
                        b.get("text", "") for b in tr_content if b.get("type") == "text"
                    )
                result.append({
                    "role": "tool",
                    "tool_call_id": tr["tool_use_id"],
                    "content": str(tr_content),
                })

        else:
            text = " ".join(b.get("text", "") for b in text_blocks)
            result.append({"role": role, "content": text})

    return result


def _to_openai_tools(tools: list[dict]) -> list[dict]:
    return [
        {
            "type": "function",
            "function": {
                "name": t["name"],
                "description": t.get("description", ""),
                "parameters": t.get("input_schema", {}),
            },
        }
        for t in tools
    ]


def _build_anthropic_response(groq_resp, msg_id: str, model: str) -> dict:
    choice = groq_resp.choices[0]
    msg    = choice.message

    content: list[dict] = []
    if msg.content:
        content.append({"type": "text", "text": msg.content})

    stop_reason = "end_turn"
    if msg.tool_calls:
        stop_reason = "tool_use"
        for tc in msg.tool_calls:
            try:
                inp = json.loads(tc.function.arguments)
            except (json.JSONDecodeError, TypeError):
                inp = {}
            content.append({
                "type":  "tool_use",
                "id":    tc.id,
                "name":  tc.function.name,
                "input": inp,
            })

    usage = groq_resp.usage
    return {
        "id":            msg_id,
        "type":          "message",
        "role":          "assistant",
        "content":       content,
        "model":         model,
        "stop_reason":   stop_reason,
        "stop_sequence": None,
        "usage": {
            "input_tokens":  usage.prompt_tokens     if usage else 0,
            "output_tokens": usage.completion_tokens if usage else 0,
        },
    }

# ── SSE streaming ──────────────────────────────────────────────────────────────

def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


def _stream_anthropic(msg_id: str, model: str, resp: dict):
    usage   = resp.get("usage", {})
    content = resp.get("content", [])
    stop    = resp.get("stop_reason", "end_turn")

    yield _sse("message_start", {
        "type": "message_start",
        "message": {
            "id": msg_id, "type": "message", "role": "assistant",
            "content": [], "model": model,
            "stop_reason": None, "stop_sequence": None,
            "usage": {"input_tokens": usage.get("input_tokens", 0), "output_tokens": 0},
        },
    })

    for idx, block in enumerate(content):
        if block["type"] == "text":
            yield _sse("content_block_start", {
                "type": "content_block_start", "index": idx,
                "content_block": {"type": "text", "text": ""},
            })
            yield _sse("ping", {"type": "ping"})
            yield _sse("content_block_delta", {
                "type": "content_block_delta", "index": idx,
                "delta": {"type": "text_delta", "text": block["text"]},
            })
            yield _sse("content_block_stop", {"type": "content_block_stop", "index": idx})

        elif block["type"] == "tool_use":
            yield _sse("content_block_start", {
                "type": "content_block_start", "index": idx,
                "content_block": {"type": "tool_use", "id": block["id"], "name": block["name"], "input": {}},
            })
            yield _sse("content_block_delta", {
                "type": "content_block_delta", "index": idx,
                "delta": {"type": "input_json_delta", "partial_json": json.dumps(block.get("input", {}))},
            })
            yield _sse("content_block_stop", {"type": "content_block_stop", "index": idx})

    yield _sse("message_delta", {
        "type":  "message_delta",
        "delta": {"stop_reason": stop, "stop_sequence": None},
        "usage": {"output_tokens": usage.get("output_tokens", 0)},
    })
    yield _sse("message_stop", {"type": "message_stop"})

# ── Flask ──────────────────────────────────────────────────────────────────────

flask_app = Flask(__name__)


@flask_app.post("/v1/messages")
def proxy_messages():
    body     = request.get_json(force=True, silent=True) or {}
    messages = body.get("messages", [])
    system   = body.get("system", "")
    stream   = body.get("stream", False)
    model    = body.get("model", GROQ_MODEL)
    tools    = body.get("tools", [])

    oa_messages = _to_openai_messages(messages, system)
    msg_id      = f"msg_{datetime.now().strftime('%Y%m%d%H%M%S%f')}"

    kwargs: dict = {
        "model":      GROQ_MODEL,
        "messages":   oa_messages,
        "max_tokens": body.get("max_tokens", 4096),
        "temperature": 0,
    }
    if tools:
        kwargs["tools"] = _to_openai_tools(tools)

    try:
        groq_resp = groq_client.chat.completions.create(**kwargs)
    except Exception as exc:
        return jsonify({"type": "error", "error": {"type": "api_error", "message": str(exc)}}), 500

    anthropic_resp = _build_anthropic_response(groq_resp, msg_id, model)

    if stream:
        return Response(
            stream_with_context(_stream_anthropic(msg_id, model, anthropic_resp)),
            mimetype="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    return jsonify(anthropic_resp)


@flask_app.get("/health")
def health():
    return jsonify({"status": "ok"})


def main() -> None:
    if not GROQ_API_KEY:
        print("[WARN] GROQ_API_KEY 未設定，請在 .env 加上 GROQ_API_KEY=gsk_xxx")
    print(f"Proxy 監聽埠：0.0.0.0:{PROXY_PORT}（Groq / {GROQ_MODEL}）")
    flask_app.run(host="0.0.0.0", port=PROXY_PORT, use_reloader=False)


if __name__ == "__main__":
    main()
