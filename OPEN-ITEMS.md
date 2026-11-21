# Open items

Snapshot: 21 November 2026, after the production update. Combines the open work in `HANDOFF.md`, the findings in `CRITIQUE.md` and the checks of the Supabase and Vercel projects. Priority is Compulsory (part of the production update) or Suggested (worth doing, not blocking). Update the status column as items close. Everything here should eventually be done.

## Repository and access state

| Item | State |
| --- | --- |
| `main` | At `66db596`, promoted on 21 November 2026 as a fast-forward from `codex/narrative-hardening`. Production deployed from it and is live. |
| `codex/narrative-hardening` | Same commit as `main`. |
| CI | Passing on `66db596` (lint, unit tests, browser tests, whitespace check). Workflow lives in `.github/workflows/ci.yml`. |
| Working folder | Needs a sync to `main` (see Tidy). A stash holds two CRLF-only changes from the old state. |
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
| P7 | Enable leaked-password protection in Supabase Auth (both projects) | Compulsory | Open, owner action (dashboard setting, plan dependent) |
| B1 | Settings display name uses `SUPA` instead of undefined `_sb`, with a browser test | Compulsory | Done, live |
| B2 | Stop serving repo files: `.vercelignore` | Compulsory | Done, confirmed on production |
| B3 | `/api/search` and `/api/ratings` require a session, no wildcard CORS, method and length checks, with tests | Compulsory | Done, live |
| B4 | Basic security headers in `vercel.json` | Compulsory | Done, confirmed on production |
| B5 | `.gitattributes` for LF line endings | Compulsory | Done |
| B6 | ESLint `no-undef` lint and CI workflow | Suggested | Done, CI passing |
| M1 | Record migrations in a migration history | Suggested | Done for production (003 to 008 recorded). Staging backfill optional |
| N1 | `public.set_updated_at` has no fixed `search_path` (Supabase security advisor warning) | Suggested | Open |
| Q1 | Refund or commit-on-success for the Discovery quota | Suggested | Open |
| Q2 | Model id from an environment variable | Suggested | Open |
| Q3 | Retire the baseline Discovery pipeline after the comparison decision | Suggested | Open, needs owner decision (it backs the Compare picks feature) |
| Q4 | Escaping HTML helper, fix `cmdSearch` and the `poster_url` CSS case, then move off inline handlers, then consider a CSP | Suggested | Open |
| Q5 | Recommendation quality: repeat blind comparisons with a fuller real library, record whether picks are tried, known, convincing | Suggested | Open, owner input needed |
| Q6 | Discovery latency and history cost: inspect live timing, then decide on a database aggregate | Suggested | Open, needs live timing |
| Q7 | Photo coverage (34 of 327 fragrances, 43 of 130 products), Adrian loafers image, rate-limited downloads | Suggested | Deferred by owner |
| Q8 | Catalogue data shape and lazy loading, shared code folder, SDK version note, drop the stray `cowork-artifact-meta` block and the prototype file | Suggested | Open |
| Q9 | Incremental front-end modularisation (CSS file, ES modules), only when touching those areas | Suggested | Open |
| Q10 | Optional extra: a JSON export of production data kept outside the repo, refreshed before each migration | Suggested | Open |

## Tidy

Switch the working folder to `main`, pull, and decide on dropping the stash.
