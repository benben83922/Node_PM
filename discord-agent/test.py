import subprocess
import sys


class NemoClawFinalAPI:
    def __init__(self, container_id="d18c529dff2e"):
        self.container_id = container_id
        self.pod_name = "my-assistant"

    def run_task(self, prompt):
        # 這裡我們補上 --session-id 以滿足 OpenClaw 的要求
        cmd = [
            "docker",
            "exec",
            self.container_id,
            "kubectl",
            "exec",
            "-n",
            "openshell",
            self.pod_name,
            "--",
            "openclaw",
            "agent",
            "--message",
            prompt,
            "--session-id",
            "python-api-session",
        ]

        print(f"--- 正在啟動 OpenClaw 任務 ---")
        try:
            # 使用 Popen 以便即時顯示 Agent 的思考過程（例如啟動瀏覽器、抓取中...）
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                encoding="utf-8",
            )

            full_output = []
            for line in process.stdout:
                # Agent 執行時會印出大量的進度資訊
                print(f" > {line.strip()}")
                full_output.append(line)

            process.wait()
            return "".join(full_output)
        except Exception as e:
            return f"發生異常: {str(e)}"


# --- 執行真正的爬取任務 ---
api = NemoClawFinalAPI()
# 讓它執行你需要的任務
api.run_task("幫我抓取 https://www.nvidia.com 並給出三個主要產品的總結")
