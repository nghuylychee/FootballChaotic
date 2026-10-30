---
name: daily-report
description: Write and send the wishlist campaign's daily report for the team. Use at the end of every /launch-day run, and whenever anyone asks for campaign status, progress, results or a summary of what the agents did.
---

# Daily report

Write in Vietnamese; keep platform and metric terms in English (wishlist,
UTM, Short, post, CTR...). Be short and factual. Never invent numbers; write
"chưa có data" instead.

Save to `game-promo/campaign/reports/YYYY-MM-DD.md` using this template:

```
# Day N/30 · YYYY-MM-DD · Phase <Explore|Focus|Launch push>

## Tóm tắt
(3 dòng: tiến độ, điều quan trọng nhất học được, việc quan trọng nhất ngày mai)

## Số liệu
- Wishlists: <total> (finalized <x> / provisional <y>), <+/-> so với hôm qua
- Mục tiêu: <goal> (<percent>%), còn <days> ngày tới release
| Source / medium | Visits 24h | Visits 7d | Wishlists 7d (final) | Rate |
|---|---|---|---|---|

## Hôm nay đã làm
- YouTube: ... (link)
- X: ...
- Reddit: ...
- Outreach: gửi X, reply Y, positive Z

## Học được
- ... (confidence: low/med/high)

## Ngày mai
- Allocation + lý do

## Cần team làm
- Approvals đang chờ: <count> file trong campaign/queue/
- ALERT: ...
- Data thiếu: ...
```

If the run is a DRY RUN: start the title with `[DRY RUN]`, and in
"Hôm nay đã làm" write what each agent WOULD have done with a pointer to
`campaign/dryrun/YYYY-MM-DD_<channel>.md`. Add a section
"## Đánh giá dry run" listing anything that looks wrong or low quality
(wrong subreddit, generic email, broken link format...).

Then send it:
```
python game-promo/scripts/send_report.py game-promo/campaign/reports/YYYY-MM-DD.md
```
If config.report.discord is false or the script says the webhook is missing,
skip sending and add "Report not sent to Discord" under "Cần team làm".
