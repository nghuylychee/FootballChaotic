# Mắt mới · màn GEAR trên main (2026-11-06)

Agent chỉ xem ảnh gốc + ảnh mờ, không đọc code / tài liệu. Ảnh: `shots/g1` (bước 1, trỏ Grip Socks) · `g1s` (bước 1, trỏ Tactics Board) · `g2` (bước 2) · `g3` (bước 3, bỏ món). Nguyên văn.

**Screen 1 (g1.png): 5-second test**

1) **What it's for.** I think I pick one of three items as a reward and then give it to one of my three players. The header "1 PICK GEAR ▸ 2 Who wears it?" says so, but I only got that on a second look. At first glance the bottom two thirds, with three big player cards and sprites, looks like a character-select or team screen.

2) **Where my eye lands.** First, StepoverSam's big brown hat and white shirt in the centre, together with LONG's red shirt. Second, the red "Already wearing one." box on ROOKIE. Third, the yellow frame on Grip Socks. The "PICK GEAR" header comes only fourth.

3) **What I'd press.** Enter, which should pick Grip Socks and move me to step 2. But the player cards are bigger and look more clickable than the item cards, so with a mouse I might click LONG first, expecting to give him the item.

4) **Grouping.** The three item cards have the same width as the three player cards and sit directly above them. So the screen reads as three columns: Grip Socks+LONG, Tactics Board+StepoverSam, Keeper Gloves+ROOKIE. Each player card is its own unit (rating, stats, sprite, name, slot row). The row of small icons under each name looks like that player's inventory. The top header and "One player wears it" go together. SKIP and the key hints go together at the bottom.

5) **Things I don't understand or don't need yet.**
   - Not understood: "FIG", the "TIKI-TAKA ▲" (what the ▲ means), and "TIKI-TAKA Cores". Also the red target and music-note icons at the top right of two player cards (LONG has none). Also the dashed first slot with a little silhouette, and why some stat numbers are green (75, 81, 73, 69, 77).
   - Not needed for "pick an item": all 18 stat numbers and their bars, plus the school icons.

6) **Confusing, contradictory or bug-like.**
   - "Already wearing one." sits under Keeper Gloves, so I first read it as "ROOKIE already has keeper gloves". In fact it refers to Grip Socks, the item two columns away.
   - That warning shows up in step 1, before I've chosen anyone. Its red error styling makes it look like I did something wrong.
   - The red box covers ROOKIE's SHO and FIG values.
   - The music-note icon overlaps StepoverSam's "DRI 70", cutting off the top of the number.
   - The Grip Socks description is cut off: "keeping it under punches,…".
   - "One player wears it" is jammed against the top edge of the cards, and it repeats "Who wears it?".
   - A faint "YOU" and pitch circles show through behind LONG's card.
   - The selected item card sits a few pixels higher than the other two, so the titles don't line up.

7) **Squint test (g1.squint.png).**
   - What survives: the two sprites (red shirt, orange hat), the red warning bar, the purple header on Keeper Gloves, the orange SWAP tag, and the coloured stat labels as specks.
   - What disappears: the item names, "DRI +6" / "GK +9", the step header, SKIP and "Enter PICK". The yellow frame on Grip Socks is barely there.
   - Is that right? No. The decision is which item, and the items are the weakest thing on screen. The strongest thing is an error message.

8) **Count and deletions.** Roughly 25–30 separate things compete: 3 item cards with 4 parts each; 3 player cards with about 7 parts each; header, subtitle, warning, SWAP, SKIP, key hints; and the map behind. If I had to delete half, I'd remove, in this order:
   - the six-stat grids on the player cards in step 1
   - the target/music icons
   - the dashed silhouette slot
   - "One player wears it"
   - the see-through map
   - the "Already wearing one." box in step 1

**Screen 2 (g1s.png)**
- **What changed:** The yellow frame moved to Tactics Board. ROOKIE lit up and his warning disappeared. Tiny music notes appeared in LONG's and ROOKIE's slot rows. The music-note icons on StepoverSam and ROOKIE turned yellow.
- **Noticed within 2 seconds?** The frame move and ROOKIE brightening, yes. The slot-row previews and the yellow icons, no.
- **What I'm deciding:** still which item.
- **Missing information:** Who uses "TIKI-TAKA Cores"? I'm guessing it's the music-note icon, but nothing says so. LONG's rating stays 71 here, while in step 2 it changes, so the preview behaves differently between steps.
- **Bug:** ROOKIE's red fist icon now covers his "DRI 77".

**Screen 3 (g2.png)**
- **What changed:** "2 Who wears it?" lit up and the other two items dimmed. The whole layout jumped up about 28px. A yellow frame is on LONG, now "72" in green with "DRI 77▲". SKIP became BACK, and "Enter EQUIP / Esc BACK" appeared.
- **Noticed within 2 seconds?** The frame on LONG, yes. The 71→72 and 71→77 changes are small; I had to look for them.
- **What I'm deciding:** who gets Grip Socks.
- **Missing information:** I need to see who gains the most. I only get one preview at a time, by moving around.
- **Confusing:** The ROOKIE warning still points from under Keeper Gloves. Green is now used for "went up" on the rating, but on screen 1 green marked some unexplained stats.

**Screen 4 (g3.png)**
- **What changed:** It's a completely new layout: "StepoverSam / Swap out which one?", Grip Socks in a box at the top, and three big cards for Power Boots, Play Wristband and Hand Wraps.
- **Noticed within 2 seconds?** Yes, instantly.
- **What I'm deciding:** which item he drops.
- **Missing information:**
  - His current stats and what changes (e.g. "SHO −6, DRI +6").
  - Whether the dropped item is gone for good.
  - Any arrow or wording saying "in" vs "out".
- **Confusing:**
  - The key-hint row has gone.
  - Power Boots is preselected; it's the strongest item.
  - The blue tag border on Power Boots could mean either "selected" or a rarity.
  - The map's circles and dashed lines show clearly through the now-emptier panel.

**Is the flow (1 → 3 → 4) cluttered?**

Yes. Three causes stand out:

1. **The six boxes form three columns.** Item cards and player cards have the same width and are stacked directly on top of each other, so they read as pairs. That is why "Already wearing one." seems to belong to Keeper Gloves rather than Grip Socks.
2. **Each player card is dense.** It holds a big rating, a position, six stats in six colours (PAC cyan, SHO orange, PAS yellow, DRI purple, FIG red, GK blue) with bars and extra green numbers, a sprite, a name, a 4-slot row and school icons. That's about 15 items per card, 45 in total, all shown during "PICK GEAR", where none of it is the decision. It also takes most of the screen, pushing the actual choices into a thin strip at the top.
3. **Status signals are scattered and inconsistent.** The yellow frame, dimming, a red error box, an orange "SWAP", green numbers, "▲", tiny previews in 20px slot icons, and icons overlapping stat numbers all compete. Meanwhile the map shows through behind everything, adding a faint "YOU" and circles that belong to another screen.
