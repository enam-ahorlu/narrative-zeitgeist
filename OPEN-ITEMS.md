# Open items

Snapshot: 21 November 2026, after the production update and the follow-up fixes (production is on the commit `main` points to). Combines the open work in `HANDOFF.md`, the findings in `CRITIQUE.md` and the checks of the Supabase and Vercel projects. Priority is Compulsory (part of the production update) or Suggested (worth doing, not blocking). Update the status column as items close. Everything here should eventually be done.

## Repository and access state

| Item | State |
| --- | --- |
| `main` | Promoted on 21 November 2026 as fast-forwards from `codex/narrative-hardening`. Production deploys from it. |
| `codex/narrative-hardening` | Same commit as `main`. |
| CI | Passing on `66db596` (lint, unit tests, browser tests, whitespace check). Workflow lives in `.github/workflows/ci.yml`. |
| Working folder | On `main`, in step with GitHub, clean. The old CRLF-only stash was verified as line endings only and dropped. |
| Push access for Claude | Working through the Claude GitHub App. |
| Supabase | Connected. Production `narrative-zeitgeist` (`zhchmiqxfyfwykktwfdm`, eu-west-3) and staging `narrative-zeitgeist-staging` (`moqeofhmssypnkztpzma`, eu-west-1). |
| Vercel | Connected and authorized for the `enam-ahorlus-projects` team. |

## Production update, as done

1. Verified backup taken inside the production database (schema `backup_20261121`, row counts match: 31 entries, 75 tags, 211 entry tags, 16 watchlist items, 1 profile).
2. Rehearsed the old frontend (`1946a7e`) against the new schema on staging. It works, so migrations and deploy did not need to happen together.
3. Migrations 003 to 008 applied to production in order and recorded as named migrations. Verified afterwards: `anon` has no privilege on any table, view or function, the view runs as the caller, data matches the backup.
4. Promoted `main`. Verified on the live site: security headers present, `OPEN-ITEMS.md` returns 404, home page loads.
5. Rollback if ever needed: promote the previous production deployment (built from `1946a7e`) in Vercel. Leave the migrations and hardened policies in place. The old frontend cannot call the new Discovery handler.

## Register

| ID | Item | Priority | Status |
| --- | --- | --- | --- |
| P0 | Close the anon read of `entries_with_tags` and revoke broad `anon` grants on production | Compulsory | Done and verified on production |
| P1 | Production backup, verified | Compulsory | Done (`backup_20261121` schema in production). Q10 covers an extra copy outside the database |
| P2 | Old-frontend-versus-new-schema rehearsal on staging | Compulsory | Done |
| P3 | Hosted staging smoke test with real sign-in: auth and recovery, search, a real paid Discovery request, save and reload, account isolation, deletion, desktop and physical phone | Compulsory | Open, owner action. Needs credentials, a paid request and a physical phone. Repeat the sign-in, save and Discovery checks on production |
| P4 | Production Vercel variables and Anthropic spend limit | Compulsory | Production variables confirmed complete. Open, owner action: add `PREVIEW_SUPABASE_SECRET_KEY` in Vercel Preview (secret Claude does not hold) and set the Anthropic spend limit in the Anthropic console |
| P5 | Apply migrations 003 to 008 to production in order | Compulsory | Done |
| P6 | Promote `main`, verify, record rollback | Compulsory | Done. Signed-in checks remain under P3 |
| P7 | Enable leaked-password protection in Supabase Auth (both projects) | Compulsory | Closed by owner decision (21 Nov 2026): the setting needs the Supabase Pro plan and the organization is on Free. Risk accepted for now. Revisit if the plan is upgraded or the app gains other users |
| B1 | Settings display name uses `SUPA` instead of undefined `_sb`, with a browser test | Compulsory | Done, live |
| B2 | Stop serving repo files: `.vercelignore` | Compulsory | Done, confirmed on production |
| B3 | `/api/search` and `/api/ratings` require a session, no wildcard CORS, method and length checks, with tests | Compulsory | Done, live |
| B4 | Basic security headers in `vercel.json` | Compulsory | Done, confirmed on production |
| B5 | `.gitattributes` for LF line endings | Compulsory | Done |
| B6 | ESLint `no-undef` lint and CI workflow | Suggested | Done, CI passing |
| M1 | Record migrations in a migration history | Suggested | Done. Production records 003 to 010. Staging was backfilled for 003 to 008 and records 009 and 010 |
| N1 | `public.set_updated_at` has no fixed `search_path` (Supabase security advisor warning) | Suggested | Done (migration 009, production and staging). Advisor warning cleared |
| Q1 | Refund or commit-on-success for the Discovery quota | Suggested | Done (migration 009). Provider failures return the slot through a server-only function; a model answer that cannot be used stays charged. Also fixed: a refused second Compare slot now returns the first |
| Q2 | Model id from an environment variable | Suggested | Done. Set `DISCOVERY_MODEL` in Vercel to change it; the default is `claude-sonnet-4-6` and anything that is not a plain model id is ignored |
| Q3 | Retire the baseline Discovery pipeline after the comparison decision | Suggested | Open, blocked on your result. The baseline exists only for "Compare with the original recommender". Whether the original lost is decided by your blind comparisons on your real library (same evidence as Q5), which Claude cannot produce. After you run it, retiring is a small change: remove `normalizeInput`, `normalizeRecommendations`, `buildPrompt` and the baseline button |
| Q4 | Escaping HTML helper, fix `cmdSearch` and the `poster_url` CSS case, then move off inline handlers, then consider a CSP | Suggested | Done except a strict script policy. Escape helpers with tests, palette, tag and related-entry handlers and `poster_url` fixed. A Content-Security-Policy is live (connections only to the app and Supabase, no framing, plugins or base-tag changes, known font, script and image hosts) and the browser test enforces it. Decision: inline scripts stay allowed. A strict script policy needs 335 inline handlers and a 2,500-line inline script rewritten with no real-user test of every button, and the remaining risk is self-inflicted markup in a single-account app. Revisit if the app gains shared content or more users |
| Q5 | Recommendation quality: repeat blind comparisons with a fuller real library, record whether picks are tried, known, convincing | Suggested | Open, owner input needed |
| Q6 | Discovery latency and history cost: inspect live timing, then decide on a database aggregate | Suggested | Open, needs live timing |
| Q7 | Photo coverage (34 of 327 fragrances, 43 of 130 products), Adrian loafers image, rate-limited downloads | Suggested | Deferred by owner |
| Q8 | Catalogue data shape and lazy loading, shared code folder, SDK version note, drop the stray `cowork-artifact-meta` block and the prototype file | Suggested | Done except lazy loading. Stray block and prototype removed, SDK version recorded, `media-identity.js` moved to `shared/` (used by both the page and the server). Decision: catalogues stay eager. They add about 118 KB uncompressed (roughly 25 KB over the wire) and are read synchronously across the Style and Scent code, so lazy loading would touch every reader for a small gain. Revisit if the catalogues grow several times |
| Q9 | Incremental front-end modularisation (CSS file, ES modules), only when touching those areas | Suggested | Standing rule, not a task: split a screen out of `index.html` when changing it. Recent splits (journal, watchlist, insights, style, entry form, escaping) follow it |
| Q10 | Optional extra: a JSON export of production data kept outside the repo, refreshed before each migration | Suggested | Done as a script. `npm run export:data` (see `SUPABASE_SETUP.md`) writes to the git-ignored `backups/` folder. Owner action: run it once with your secret key and before each future migration |
| R1 | Block adding the same work to the collection twice | Compulsory | Done (migration 010, with client check). A new entry for a work already in the collection is refused, by the form and by `save_journal_media` (error 23505). Same work means the same catalogue id, or the same normalised title with no conflicting year or creator, and tracks are kept apart from albums. **Log again** is the deliberate way to repeat and still works. Editing is unaffected. No duplicates existed in production when the rule was added |
| R2 | Discover shows a Retry button while a request is still loading, so it reads as a failure | Suggested | Done. The `hidden` attribute lost to the button's own display rule on every screen; one CSS rule fixes Discover, Collection, Watchlist, Insights, Fragrances and Wardrobe. Browser test checks Retry is hidden while loading and visible after an error |
| R3 | Photo backgrounds on fragrance, wardrobe and search thumbnails clash with the page, in light and dark mode | Suggested | Done. `assets/photo-cutout.js` removes a plain studio background in the browser (edge flood fill, soft edge, 25 of 75 bundled photos), drop shadow in light mode and a soft spotlight in dark mode. Photos with busy backdrops, or from other sites the canvas cannot read, are shown with rounded corners and a soft shadow, no tint and no hard border. The earlier multiply blend (dark hue in light mode) is removed. Unit tests cover the pixel logic |
| R4 | Discover picks for films, shows, books, music and sports never showed a picture | Suggested | Done. The catalogue check already found the poster or cover but dropped it. It now travels with each verified pick (https links only, server-checked) and shows on the hero and grid cards, with the initials as fallback. Test covers the poster link. Only picks that pass the catalogue check carry one |
| R6 | Discover posters showed only the top of the image | Suggested | Done. Posters now fit whole (contain, with a soft shadow) and fade in once loaded |
| R7 | Insights could not scroll; no genres | Suggested | Done. The overview moved inside the scrolling grid. New per-format panels list top genres and tropes with counts and average rating, via `journalTags.groupOf` and `tasteInsights.byFormat`. Unit and browser tests |
| R8 | Collection: the fragrance and wardrobe block covered the whole screen and could not scroll | Suggested | Superseded by R9 (they are now ordinary rows). Earlier fix: The list, cards and scent and style items now sit in one scroll area, so nothing is pinned and no screen space is reserved. Browser test covers it |
| R9 | Wishlisted fragrances and wardrobe items did not appear in the Watchlist; fragrances and wardrobe stood apart from the rest of the app | Suggested | Done. Owned fragrances and wardrobe items are now ordinary rows and cards in the Collection (same filters, sort, search, paging, Fragrance and Wardrobe badges); wishlisted ones are excluded and appear in the Watchlist instead, with Mark as owned and Open. Tried items show only on their own Fragrances screen. Replaces the earlier separate scent and style block (R8). Browser test covers both screens |
| R10 | Owner reported items marked as owned seemed to disappear | Investigate | Production database (checked 13:4x) holds 3 fragrances, all wishlisted, and no owned records, so no owned save reached the database. Could not reproduce: marking owned from Discover, the item form and the Watchlist all persist in the browser test. Watchlist now shows a warning if a save does not go through. Awaiting which button the owner used |
| R11 | Discover: Owned or Tried on a fragrance or wardrobe pick saved a bare record, with no form for rating, tags and notes | Suggested | Done. Owned and Tried now open the same form as the Fragrances and Wardrobe screens, pre-filled from the pick with the chosen status (or the existing record if already saved). Wishlist still saves in one click. Browser test covers the wardrobe path |
| R5 | Insights centred on tags | Suggested | Done. New "Your taste, beyond tags" section: highlight sentences, format mix with average rating, rating spread, pace by quarter, tags that cross formats, tag pairs, release eras (only with 5 or more entries that have a year), highs and lows, repeats. Needs 3 entries. Unit tests plus a browser check. The tag fingerprint, radar and charts are unchanged below it |

## Tidy

Switch the working folder to `main`, pull, and decide on dropping the stash.
