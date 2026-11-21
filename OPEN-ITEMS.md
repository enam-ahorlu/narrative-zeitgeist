# Open items

Snapshot: 21 November 2026. Combines the open work in `HANDOFF.md`, the findings in `CRITIQUE.md` and read-only checks of the Supabase projects. Priority is Compulsory (must happen before or as part of the production update) or Suggested (worth doing, not blocking). Update the status column as items close. Everything here should eventually be done.

## Repository and access state

| Item | State |
| --- | --- |
| `main` | At `1946a7e` (26 May). Production deploys from it. |
| `codex/narrative-hardening` | Hardening work plus the fixes below. `main` is an ancestor, so promotion is a fast-forward. |
| Working folder | On the hardening branch. A stash holds two CRLF-only changes from the old state. |
| Push access for Claude | Not yet. Claude's GitHub access to this repo is read-only. Install the Claude GitHub App on the repo: https://github.com/apps/claude/installations/select_target (choose `enam-ahorlu/narrative-zeitgeist`, grant read and write on contents and pull requests), then Claude retries the attach with push access. |
| Supabase | Connected. Projects visible: production `narrative-zeitgeist` (`zhchmiqxfyfwykktwfdm`, eu-west-3) and `narrative-zeitgeist-staging` (`moqeofhmssypnkztpzma`, eu-west-1). Nothing has been written to either. |
| Vercel | Connected but not authorized for the team scope. Open the single-use approval link Claude provides in chat (expires after 10 minutes), approve, and Claude retries. |
| CI workflow | Claude cannot write inside `.github`. Copy `scripts/ci-workflow.yml` to `.github/workflows/ci.yml`. |

## What the Supabase check found

- Production holds real data (1 account, 31 entries, 16 watchlist items, 75 tags) and only the original six tables. Migrations 003 to 008 are not applied. Staging has the full set.
- Anyone holding the public key can read all 31 production entries through the `entries_with_tags` view, which runs with its creator's permissions and so bypasses row-level security. The `anon` role also holds full grants on every table. The tables themselves return nothing to `anon`, because row-level security blocks them.
- Neither project has a migration history table, so applied migrations cannot be listed from the database.

## Production update, in order

1. **Contain the exposure (P0).** Apply the part of migration 003 that makes `entries_with_tags` run as the caller and revokes `anon`, or all of 003. Needs your go-ahead, a backup first, and a check that the live app still works afterwards.
2. **Back up.** Take a verified backup (Supabase dashboard backups or an export). Production has real data. Claude can also write a JSON export of the six tables into the working folder as an extra copy if you want it.
3. **Rehearse.** On staging, run the old frontend (`1946a7e`) against the full schema to see whether migration 003 breaks it. This decides whether migrations and deploy must happen together.
4. **Configure Production in Vercel** (variables listed in `SUPABASE_SETUP.md`) and set the Anthropic spend limit.
5. **Apply migrations 003 to 008** to production in order, recording each as a named migration.
6. **Promote** with `git push origin codex/narrative-hardening:main` (fast-forward), after the staging smoke test passes.
7. **Verify** sign-in, save and reload, Discovery, Style & Scent, and account deletion with a disposable account. Confirm the repo files are no longer served by requesting one of them on the deployed URL.
8. **Rollback:** promote the previous Vercel deployment. Leave migrations and hardened policies in place. The old frontend cannot call the new Discovery handler.
9. **Tidy:** switch the working folder to `main`, pull, and drop the stash.

## Register

| ID | Item | Priority | Status |
| --- | --- | --- | --- |
| P0 | Close the anon read of `entries_with_tags` and revoke broad `anon` grants on production (migration 003 or its view and grant part) | Compulsory, urgent | Open, needs your go-ahead |
| P1 | Production backup, verified | Compulsory | Open |
| P2 | Old-frontend-versus-new-schema rehearsal on staging | Compulsory | Open |
| P3 | Hosted staging smoke test: auth and recovery, search, a real paid Discovery request, save and reload, account isolation, deletion, desktop and physical phone | Compulsory | Open |
| P4 | Production Vercel variables and Anthropic spend limit | Compulsory | Open, needs Vercel approval |
| P5 | Apply migrations 003 to 008 to production in order | Compulsory | Open |
| P6 | Promote `main`, verify, record rollback | Compulsory | Open |
| P7 | Enable leaked-password protection in Supabase Auth (dashboard setting, both projects) | Compulsory | Open |
| B1 | Settings display name uses `SUPA` instead of undefined `_sb`, with a browser test | Compulsory | Done (committed on the branch) |
| B2 | Stop serving repo files: `.vercelignore` | Compulsory | Done in code. Confirm on a deployed URL (P6 step 7) |
| B3 | `/api/search` and `/api/ratings` require a session, no wildcard CORS, method and length checks, with tests | Compulsory | Done |
| B4 | Basic security headers in `vercel.json` | Compulsory | Done. Confirm in a deployed response |
| B5 | `.gitattributes` for LF line endings | Compulsory | Done |
| B6 | ESLint `no-undef` lint (`npm run lint`), plus CI workflow | Suggested | Lint done. Move `scripts/ci-workflow.yml` to `.github/workflows/ci.yml` |
| M1 | Record migrations in a migration history (Supabase CLI or connector) so each project can report what it has | Suggested | Open |
| Q1 | Refund or commit-on-success for the Discovery quota | Suggested | Open |
| Q2 | Model id from an environment variable | Suggested | Open |
| Q3 | Retire the baseline Discovery pipeline after the comparison decision | Suggested | Open |
| Q4 | Escaping HTML helper, fix `cmdSearch` and the `poster_url` CSS case, then move off inline handlers, then consider a CSP | Suggested | Open |
| Q5 | Recommendation quality: repeat blind comparisons with a fuller real library, record whether picks are tried, known, convincing | Suggested | Open |
| Q6 | Discovery latency and history cost: inspect live timing, then decide on a database aggregate | Suggested | Open |
| Q7 | Photo coverage (34 of 327 fragrances, 43 of 130 products), Adrian loafers image, rate-limited downloads. Broad expansion deferred by owner | Suggested | Open |
| Q8 | Catalogue data shape and lazy loading, shared code folder, SDK version note, drop the stray `cowork-artifact-meta` block and the prototype file | Suggested | Open |
| Q9 | Incremental front-end modularisation (CSS file, ES modules), only when touching those areas | Suggested | Open |
| Q10 | Optional extra: a JSON export of production data kept outside the repo, refreshed before each migration | Suggested | Open |
