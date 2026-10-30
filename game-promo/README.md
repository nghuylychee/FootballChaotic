# Hệ thống agent 30 ngày kiếm wishlist

> Dự án là gì, mục tiêu, mỗi file làm gì: xem `PROJECT_CONTEXT.md`.

## Cài đặt (1 lần)
1. Copy thư mục `.claude/` và `game-promo/` vào root project (merge với cái đang có).
   File `yt-cycle.md` cũ giữ nguyên, youtube-agent dùng lại nó.
2. Copy `.env.example` thành `.env`, dán Discord webhook URL vào.
   Thêm `.env` vào `.gitignore`.
3. Điền `game-promo/config.json`: `steam_app_id`, `campaign_start`, `release_date`.
4. Điền `game-promo/campaign/press_kit.md`. Agent CHỈ được nói những gì có trong file này.
5. Restart Claude Code (subagent chỉ load khi mở session mới), rồi gõ `/agents` kiểm tra đủ 5 agent.
6. Từ lúc bắt đầu campaign, NGỪNG chạy `/yt-cycle` riêng. `/launch-day` đã bao gồm YouTube.

## Trước khi Steam duyệt page: chạy dry run
`config.json` đang để `"dry_run": true`. Ở chế độ này agent làm mọi bước
(nghiên cứu, đọc luật sub, tìm streamer, soạn bài, soạn email) nhưng KHÔNG
đăng, gửi hay upload gì cả. Những gì nó định làm được ghi vào
`game-promo/campaign/dryrun/`.
- YouTube vẫn chạy `/yt-cycle` riêng như cũ. Trong dry run, youtube-agent
  chỉ lên kế hoạch clip.
- Mỗi ngày đọc folder `dryrun/` và mục "Đánh giá dry run" trong report.
  Thấy chỗ nào dở thì sửa file agent tương ứng.

**Khi Steam duyệt page (chuyển sang chạy thật):**
1. Đặt `"dry_run": false`, điền `campaign_start` và `release_date`.
2. Đặt release date trong Steamworks luôn.
3. Xóa folder `campaign/dryrun/` và các dòng có đánh dấu `[DRY]` trong
   CRM, logs, link_registry.
4. Ngừng chạy `/yt-cycle` riêng.

## Mỗi ngày
- Gõ `/usage` xem còn usage không, rồi gõ `/launch-day`.
- Team (~15 phút):
  - Đọc report trên Discord.
  - Mở `game-promo/campaign/queue/`: đổi `STATUS: PENDING` thành `APPROVED` (sửa text nếu muốn) hoặc `REJECTED`.
  - Có `ALERT.md` thì xử lý. Dòng `BLOCKING:` sẽ chặn mọi agent đăng bài cho tới khi xóa dòng đó.
  - Tự thay đổi gì bằng tay (settings, xóa bài, đổi trailer...) thì ghi vào mục "Owner changes" trong `plan.md`.

## Cấu trúc
.claude/commands/launch-day.md   lệnh chính (orchestrator)
.claude/agents/                  analyst, youtube-agent, x-agent, reddit-agent, outreach-agent
.claude/skills/                  promo-safety, utm-links, daily-report (luật dùng chung)
game-promo/config.json           trần tần suất + kill switch (dashboard chỉnh file này)
game-promo/campaign/             plan, queue duyệt, logs, reports, link_registry, CRM streamer
game-promo/data/                 UTM CSV + metrics hằng ngày
game-promo/scripts/send_report.py  gửi report lên Discord

## Khẩn cấp
Đặt `"kill_switch": true` trong config.json: mọi agent dừng ở lần chạy kế tiếp.
