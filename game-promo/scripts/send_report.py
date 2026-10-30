"""Send a daily report (markdown file) to a Discord webhook.
Usage: python game-promo/scripts/send_report.py <report.md>
Reads DISCORD_WEBHOOK_URL from the environment or from .env in the project root.
"""
import json
import os
import sys
import urllib.request
from pathlib import Path

LIMIT = 1900  # Discord message limit is 2000 characters


def load_webhook():
    url = os.environ.get("DISCORD_WEBHOOK_URL", "").strip()
    if url:
        return url
    env = Path(__file__).resolve().parents[2] / ".env"
    if env.exists():
        for line in env.read_text(encoding="utf-8").splitlines():
            if line.startswith("DISCORD_WEBHOOK_URL="):
                return line.split("=", 1)[1].strip()
    return ""


def main():
    if len(sys.argv) < 2:
        print("usage: send_report.py <report.md>")
        return 1
    url = load_webhook()
    if not url:
        print("DISCORD_WEBHOOK_URL missing - report not sent")
        return 0
    path = sys.argv[1]
    text = Path(path).read_text(encoding="utf-8")
    if len(text) > LIMIT:
        text = text[:LIMIT - 80].rsplit("\n", 1)[0] + f"\n\n(...full report: {path})"
    body = json.dumps({"content": text}).encode("utf-8")
    req = urllib.request.Request(
        url, data=body,
        headers={"Content-Type": "application/json", "User-Agent": "launch-report/1.0"},
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        print("sent, status", resp.status)
    return 0


if __name__ == "__main__":
    sys.exit(main())
