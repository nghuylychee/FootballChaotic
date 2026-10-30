---
name: utm-links
description: Build, register and interpret Steam store UTM links for the wishlist campaign. Use whenever any agent writes a Steam link anywhere (post, comment, description, email, bio, press kit) or reads Steamworks UTM data. Never write a bare Steam link without this skill.
---

# Steam UTM links

## Format
```
https://store.steampowered.com/app/<APP_ID>/?utm_source=<source>&utm_medium=<medium>&utm_campaign=<campaign>
```
- APP_ID from `game-promo/config.json` -> game.steam_app_id.
- Steam reads only utm_source, utm_medium, utm_campaign. Use all three.
- Lowercase, only a-z 0-9 and hyphens. `Reddit` and `reddit` are different rows.

## What each parameter answers
| param | question | allowed values |
|---|---|---|
| utm_source | which channel? | youtube, x, reddit, creator, discord, email, other |
| utm_medium | which format/placement? | youtube: short, channel-link · x: post, reply-link, comment · reddit: post, comment · creator: email, video-desc · discord: post |
| utm_campaign | which experiment/variant/wave? | e.g. hit-first, gamedev-frame, r-indiegames, wave-1 |

## Rules
- utm_campaign is the VARIANT or WAVE, never one per post. Steam hides
  combinations with too few visits, so per-post codes make data disappear.
  Keep about 10 or fewer active campaigns per source.
- Before using a new campaign value, check `campaign/link_registry.csv` for an
  existing one that means the same thing and reuse it.
- Register every link you place: append a row to `campaign/link_registry.csv`
  (date, channel, post_url, source, medium, campaign, full_link, notes).
- Never shorten links (bit.ly etc.); Reddit and X treat shorteners as spammy.

## Reading Steamworks UTM data
- Wishlist/purchase conversions are final only 4 days after the visit.
  Mark younger data PROVISIONAL and never cut a channel based on it.
- Visits are counted only for users logged in to Steam who allow UTM
  cookies, so real traffic is higher than reported. Compare RATES between
  sources, not absolute totals against other analytics.
- If expected rows are missing, aggregate up (source -> source+medium)
  before concluding anything.
- Key metric: wishlists per tracked visit, by source, then by medium.
