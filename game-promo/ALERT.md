# STOP: scheduled Shorts went public ~7 hours early (2026-10-29 18:47 GMT+7)

**What happened.** In batch 2 the agent uploaded two Shorts and scheduled them, Visibility › Schedule, time zone "(GMT+07:00) Local Time":
- "Making a football game with no referee 🕹️" (https://youtube.com/shorts/OzodrOmQeJw): set for **Oct 30, 2026 2:00 AM**. Studio's "Video scheduled" dialog confirmed "Your video will be set to public on October 30, 2026 at 2:00 AM".
- "Football, but there's no referee ⚽" (https://youtube.com/shorts/UeddnBn2Oig): set for **Oct 30, 2026 2:40 AM**, also confirmed by the dialog.
Both times, before the confirmation, YouTube showed its standard "We're still checking your content … Come back before your video is published on Oct 30, 2026" notice, which the agent dismissed with "Got it". Right after scheduling (~18:35) the Shorts list showed both as **Scheduled · Oct 30, 2026 · 0 views**, and the re-check a few minutes later showed no notices.

**What the agent saw now (screenshot description).** YouTube Studio › Content › Shorts, sorted by date, at 18:47 GMT+7 on Oct 29 (11:47 UTC; the machine clock was checked against google.com and youtube.com server time and is correct):
- Row 1 "Football, but there's no referee ⚽": Notices "—", Visibility **Public**, Date **Oct 29, 2026 · Published**, Views **242**.
- Row 2 "Making a football game with no referee 🕹️": Notices "—", Visibility **Public**, Date **Oct 29, 2026 · Published**, Views **255**.
- Row 3 "No referee. Just 3v3 street football. ⚽💥" (cycle 1, published directly at ~16:50): Public, 39 views.
No warning, strike or notice was visible on any row.

**Why it matters.** Oct 30 02:00 GMT+7 is Oct 29 19:00 UTC, still 7 hours away at the time of the check, so YouTube did not publish them at the scheduled time. Possible causes the agent can't confirm: Studio published on upload instead of on schedule; the content-check dialog flow changed the visibility; or someone published them by hand. The batch-2 test (EU-evening slot) didn't run as designed: both went out at the same unplanned time (Vietnam evening). They are still comparable with each other, but not as "EU slot" data.

**What the agent did:** stopped the run (analysis-only run, no uploads attempted). Nothing was changed on the channel. **Please check** each video's details page (Visibility history), then remove this section. The agent won't schedule again until this is explained.

**Update 2026-10-30 14:30 GMT+7 (read-only check, next run).**
- **Public publish times.** Read from each video's public page data, fetched without playing it:
  - "Making a football game with no referee 🕹️" went public **2026-10-29 18:25:06** GMT+7.
  - "Football, but there's no referee ⚽" went public **18:25:10**.
  - That is **4 seconds apart**. Their schedules were 40 minutes apart (02:00 and 02:40), so YouTube's scheduler didn't publish them. Two videos going public within seconds of each other looks like one visibility change applied to both, for example selecting both in Studio and setting them to Public, or doing the same in the YouTube Studio app.
- **The agent didn't do it.** Its session log shows its last action that evening at 17:55 GMT+7 (scheduling clip 2, re-checking the list, closing the tab), and nothing between 17:55 and 18:46.
- **Only one account has access.** Settings › Permissions lists only the Owner account.
- **Most likely cause:** someone signed in to the Owner account (any device) switched both to Public at 18:25.
- **Please confirm it was you or a teammate.** If nobody did it, treat it as an account-security issue: check the Google account's recent security activity and signed-in devices.
- The agent keeps this STOP in place, so no scheduling, until you remove this section.

**Update 2026-10-30 ~15:20 GMT+7: owner override in chat.** The owner told the agent to bypass the 24-hour rule and upload 5 new Shorts (2 public right away, 3 scheduled) to reach viewers outside Vietnam. The agent is doing that as batch 3. This one instruction also overrides the 2-clip cap (item 1 below) and this STOP for batch 3. Still open: who switched batch 2 to Public at 18:25 on Oct 29. After uploading, the agent re-checks that the 3 scheduled Shorts are still Scheduled.

---

# ALERT for the channel owner (written by the growth agent, batch 2, 2026-10-29)

Nothing on the channel is broken: no warnings, strikes, limited-reach notices or security prompts were seen. These two items need your attention. The agent did not change any setting.

## 1. Can't read Claude usage limits
The batch rules say to check claude.ai › Settings › Usage in Chrome before each clip. The Chrome extension refuses to open claude.ai ("Navigation to this domain is not allowed"), so usage couldn't be read.
**Effect:** each batch is capped at 2 clips until usage can be read.
**Owner fix:** allow the agent another way to read usage, or remove this rule. Until then, keep the 2-clip cap.

## 2. Geography gate: distribution comes first
Non-Vietnam share of views is under 30% in each of the latest 3 upload groups: Oct 27–28 (2.9%), Oct 18 (0–16%), Oct 2–4 (≈4–9%; one tiny sample excluded). Details in `experiment_log.md` › Cycle 1 › Data snapshot.
Channel settings checked (read-only, 2026-10-29): country of residence **United States**, default video language **English**, title/description language **English**, category Gaming. These are already right, so the cause is elsewhere.
**Effect:** hook test results don't speak for the target audience yet. Batches now test distribution (title/hashtag topic, publish slots).

**Owner-side fixes to consider (your call, the agent won't do these):**
- **Don't seed new Shorts in Vietnamese groups or to Vietnamese friends during the first 48h.** YouTube tests a new Short on viewers similar to its first viewers, so early Vietnamese views pull the rest the same way.
- **Avoid watching our own Shorts repeatedly from our own accounts.** "The real street football" shows 21 unique viewers, a 3:01 average on a 19s clip and 92% desktop watch time. That looks like self-views, and it also feeds the audience model Vietnamese signals.
- **Decide what to do with the real-footballer Shorts** (zlatan vs lukaku, Zaltan in my game, Big shoutout to my forever🐐). They drew Vietnamese football fans, carry real players' likeness, and aren't the game. Unlisting them would stop them shaping who the channel gets recommended to. Their real footage is also an IP risk.
- **Remove `#fifa` from older titles.** It's an unrelated brand and attracts FIFA/FC players searching in Vietnamese.
- "Street football Chaos 🤣" has had 0 views for 11 days while Public, with no notice. Worth a look in Studio.

Remove this file (or the item) once handled. The agent keeps the 2-clip cap while item 1 stands.
