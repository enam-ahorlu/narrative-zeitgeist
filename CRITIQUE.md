# Codebase critique

Snapshot: 21 November 2026, branch `codex/narrative-hardening` at `b2c71d5`.

## Verdict

No rewrite and no framework migration. The architecture (static page, Vercel functions, Supabase with row-level security) fits the app, and the hardening branch fixed most of the real consistency and security problems in the earlier version. A targeted refactor is justified, but it should be incremental and driven by the files being touched. The most valuable work is not restructuring. It is a short list of cheap fixes before production, then guardrails (CI, lint, headers) so the next round of changes stays safe.

## How this was assessed

Checked directly: the 33 unit tests pass; a lint pass (ESLint `no-undef`) over every browser script concatenated in the page's load order; line, function and handler counts; the API handlers, the SQL migrations' grants and function security modes, the escaping used when rendering; and the repo and deploy configuration. Not checked: the hosted staging app (returned 403, preview protection), live production behaviour, and the browser end-to-end suite (needs Chrome, not run here). Findings marked "by configuration" follow from files, not from a live request.

## What is solid

- Discovery verifies the Supabase session, takes a per-account quota in the database, and checks every model suggestion against real catalogues before showing it.
- Ownership is enforced in PostgreSQL. Row-level security is on, public grants are revoked, the workflow functions run as the caller (`security invoker`), and the two `security definer` functions pin `search_path`.
- Multi-step writes (save entry with tags, log from Watchlist, reorder Up Next) are single database commands, which removed the partial-failure bugs described in `WORKFLOW-REVIEW.md`.
- Preview and production are separated, and preview fails closed if it points at production credentials.
- The test suite covers the hard parts: ownership, quota under concurrency, handler responses, journal and Discovery state, and a browser run with two accounts.
- The front end is more internally consistent than its structure suggests. Linting all scripts together finds exactly one undefined identifier (finding 1).

## Findings, most important first

| # | Finding | Why it matters | Suggested fix |
| --- | --- | --- | --- |
| 1 | The display-name save in Settings calls an undefined `_sb` client (6 references around `index.html:3934`). It is the only undefined name in the whole front end. | Saving a display name fails. Already listed in the handoff, now confirmed by lint. | Done: now uses `SUPA`, with a browser test covering the save. |
| 2 | `vercel.json` sets `outputDirectory` to `.` and there is no `.vercelignore`, so by configuration the whole repo is served as static files: docs, SQL, tests, `package.json`, the 437 KB prototype and the PDF. | Publishes the schema, internal reviews and test fixtures. No secrets are committed, but this is unnecessary exposure. | Done: a `.vercelignore` now excludes docs, SQL, tests, scripts and the prototype from the deployment. The prototype stays in the repo. Confirm on a deployed URL after the next deploy. |
| 3 | `/api/search` and `/api/ratings` are unauthenticated, allow any origin, and have no rate limit. `ratings` has no length cap on `title`. | Anyone can spend the TMDB, Google Books and OMDb quotas. | Done: both endpoints now require a signed-in session (30 second verification cache), the wildcard CORS header is gone, non-GET requests are refused and input length is capped. |
| 4 | The Discovery quota is reserved before the model call and is not refunded when the provider fails, times out or returns unusable output. A comparison reserves two slots. | A provider hiccup costs the user part of a 12-per-hour allowance. | Reserve then commit, or add a refund function called on non-success paths. |
| 5 | No security headers and no Content-Security-Policy in `vercel.json`. The page has about 61 `innerHTML` sites and 289 inline `onclick` handlers, so a strict CSP cannot be added yet. Escaping with `escHtml` is mostly applied, with gaps: the command palette writes raw input into HTML (`cmdSearch`), and `collection-screen.js:117` puts `poster_url` into a CSS `url()` unescaped. | Low risk today because all content is the signed-in user's own. It becomes real the moment any shared or imported content is shown. | Done: basic headers added in `vercel.json` (frame, content-type, referrer, permissions, HSTS). Still open: introduce one escaping HTML helper and use it everywhere. Move off inline handlers before attempting a strict CSP. |
| 6 | Two Discovery pipelines coexist. The legacy "baseline" path builds its prompt from a fingerprint and titles sent by the browser and allows `max_tokens` of 8192. The grounded path reads history server-side. | The legacy path trusts client-supplied prompt content and costs more per call. Behind auth and quota, so bounded. | Retire the baseline path once the blind comparison has produced a decision. |
| 7 | The model id `claude-sonnet-4-6` is hard-coded in `api/discover.js`. | A model retirement or upgrade needs a code deploy. | Read it from an environment variable with this value as the default. |
| 8 | Every Discovery request reads the whole journal, Watchlist and feedback tables in 500-row pages under one shared 8 second timeout, ordered by `id` with offset paging. | The cost grows with library size, one slow page fails the request, and offset paging can skip or repeat rows if data changes mid-read. Local numbers (`PRODUCT-WORK.md`) show the browser side is cheap, the transfer is the concern. | Measure on a real staging library first, as the handoff says. If needed, move to a database function that returns anchors and exclusion keys. |
| 9 | Front-end structure: 15 classic scripts whose load order is the dependency graph, about 51 top-level mutable globals and 156 functions in the inline script, roughly 1,000 lines of CSS inline, Discovery and Style & Scent orchestration still in `index.html`. | Works and is lint-clean, but there are no real module boundaries, so each future split means guessing at hidden coupling. | Incremental, no build step: move CSS to a file; convert to native ES modules as areas are touched; replace inline handlers with delegated listeners. A framework or bundler is not warranted. |
| 10 | Server code imports from `assets/` (`media-identity`), and several browser files use `typeof module` guards to run in both places. | The browser asset layout is an accidental server dependency. | Move shared code to a `shared/` folder when the module work starts. |
| 11 | Catalogues are arrays of positional strings (8 per fragrance) with photos matched by a normalised name key. About 118 KB of catalogue script loads for every visitor, including before sign-in. Photos are 2.7 MB in git and only 34 of 327 fragrances and 43 of 130 products have one. | Positional rows are easy to corrupt, and the key scheme breaks on any naming drift. | Convert to named fields or JSON, load the catalogues only when Style & Scent opens, keep the photo playbook in `STYLE-CATALOGUE.md`. |
| 12 | Repo hygiene: no CI, no linter, an unversioned vendored `supabase.js` (188 KB, no version comment), a stray `cowork-artifact-meta` script block before `<html>` on line 1 of `index.html`, older root SQL scripts that are unsafe to replay after migration 003, a 437 KB prototype file, and line-ending drift (two files in the Windows folder showed as modified by CRLF alone). | Each is small. Together they are why a real bug (`_sb`) survived a large hardening pass. | Done: `npm run lint` (ESLint `no-undef` over the browser bundle and server files), `.gitattributes` with LF endings, and a CI workflow file ready to move into `.github/workflows/`. Still open: record the SDK version, drop the stray block, drop the prototype. |

## Where the refactor is and is not worth it

Worth doing: findings 1 to 5 and 12 before production, because they are cheap and reduce risk. Findings 6, 7 and 9 as the next improvement pass. Findings 8, 10 and 11 only when measurement or a new feature calls for them.

Not worth doing: a rewrite in a framework, a separate application server, or splitting the inline script further just to reduce line count. The remaining size is orchestration that is tested end to end, and moving it without a reason adds risk without removing any.

## Limits of this review

Static review plus a lint and the unit tests. It did not exercise the hosted apps, real Supabase Auth, real provider calls or the physical-phone experience, so those remain on the open-items list.

## Added after connecting Supabase (read-only checks on production)

- The production database holds real data (1 account, 31 entries, 16 watchlist items, 75 tags) and has only the original six tables. Migrations 003 to 008 have not been applied.
- The `anon` role holds full grants on every public table, and `entries_with_tags` is a security-definer view. A count-only check as `anon` returned all 31 entries through the view (the entries table itself correctly returned 0). Anyone with the public key can read the journal through that view. Migration 003 fixes this. See OPEN-ITEMS P0.
- Supabase's security advisor also reports mutable `search_path` on three functions, `anon` and signed-in execute rights on two security-definer functions, and leaked-password protection switched off. Migration 003 addresses the first three. The last is a dashboard setting.
- Neither Supabase project has a migration history table. Migrations were applied by hand, so the database cannot report which of them it has. Use the Supabase CLI or the connector to record them from now on.
