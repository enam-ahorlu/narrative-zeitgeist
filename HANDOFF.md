# Narrative & Zeitgeist maintainer handoff

Snapshot dated November 21, 2026. This handoff covers the hardening and catalogue work on `codex/narrative-hardening`. Use the code and numbered migrations on that branch when a historical design note differs from current behavior.

## Start here

| Item | Current state |
| --- | --- |
| Repository | [enam-ahorlu/narrative-zeitgeist](https://github.com/enam-ahorlu/narrative-zeitgeist) |
| Working branch | [codex/narrative-hardening](https://github.com/enam-ahorlu/narrative-zeitgeist/tree/codex/narrative-hardening) |
| Staging app | [Vercel preview](https://narrative-zeitgeist-git-codex-narr-7a13b2-enam-ahorlus-projects.vercel.app/). It uses the dedicated `narrative-zeitgeist-staging` Supabase project. The tested application revision is `394fe4b`. Later documentation commits leave that application code intact. |
| Production app | [Live app](https://narrative-zeitgeist.vercel.app/). GitHub reported `1946a7e` as the latest production deployment at the time of this handoff. The hardening branch awaits production promotion. |
| User data | Supabase stores hosted accounts and journal data. Check project identity in the service dashboards before making changes. Preview and production have separate accounts and records. |
| Repository inventory | The original device copy and initial GitHub version matched across the 12 project files reviewed, ignoring line endings and Git metadata. GitHub now has the newer hardening work on the branch above. Vercel variables, provider credentials, and live Supabase records are managed in their services. |

A new maintainer should start with this file, the [setup and migration guide](SUPABASE_SETUP.md), and the [catalogue checklist](STYLE-CATALOGUE.md). Read the branch history for the original change boundaries. The end of this file lists the concrete release and verification work still open.

## Product workflows

- **Collection.** Log completed films, TV shows, books, matches, music albums, and individual tracks. Catalogue search can prefill identifying details and artwork. Entries have ratings, dates, notes, and tags. List and grid views filter full records before sorting and paging. Logging a work again copies its identifying details into a new entry with its own rating, date, and notes. New-entry forms reset after use.
- **Tags.** Search by format or alias, then by tag. Tags may belong to one format, several, or all formats. Settings can merge or remove tags. Existing personal tags are supported. Entries and their tag links save in one authenticated database command.
- **Watchlist.** Media picks can be saved from search or Discovery. Maybe and Up Next are editable priorities. Up Next manual order persists across devices. Logging a Watchlist item can save the entry and archive the Watchlist row in the same transaction. Dismissals suppress future eligible picks. Legacy rows without priority appear under Maybe.
- **Insights.** Taste Fingerprint uses journal ratings and tags, and the timeline uses the journal already loaded. Fragrances and wardrobe have their own account-derived summary for status, recurring scent notes/houses and wardrobe categories/styles. Insights export and charts are implemented in the screen module.
- **Discovery.** For You, Hidden Gems and New releases recommend across eligible tastes or the selected format. More like this uses the one chosen entry and offers a clear action. Refresh rotates the eligible sample. Retry keeps the requested batch position. Saving and dismissing remove that pick from visible cached results. The All view has separate media and Style & Scent sections so each can recover independently.
- **Style & Scent.** Wardrobe includes clothing, footwear, jewelry, bags and accessories. Discover Style supports category filtering and brand/model search. Fragrance entries can be Owned, Wishlisted or Tried. Wardrobe supports Owned and Wishlisted. Quick saves use the same product fields as Details. Personal HTTPS image URLs persist with saved items. Old browser-only Style & Scent data can be explicitly imported. The seven sample fragrances are opt-in.
- **Design and mobile.** Theme, accent and density controls persist and affect the app. The hardening branch checked Collection, Discovery, Watchlist, Insights, entry forms, Style & Scent and settings at narrow phone widths through the browser suite. Hosted verification on a physical phone remains a release check.

## Architecture and code map

```
Browser (static Vercel page)
  index.html + assets/*.js + catalogues/*.js
    |-- Supabase Auth and account-scoped PostgREST/RPC
    |-- Vercel public runtime config
    |-- Vercel search / ratings / authenticated Discovery
    |-- Vercel verified account-deletion endpoint
  Vercel functions --> external catalogues and Anthropic
  Supabase --> PostgreSQL tables, views, functions, and row-level security
```

The deployed frontend is a static page with classic scripts. There is no frontend framework or bundling step. Keep script dependencies ordered in the page head. The HTML prototype is a historical design reference. The bundled `supabase.js` is the browser SDK. Chart.js is fetched from a versioned CDN with an integrity hash. `vercel.json` sets static output and a 60-second ceiling for Discovery.

| Area | Start with |
| --- | --- |
| App shell, CSS, navigation, auth, the remaining Discovery and Style & Scent screen orchestration | [index.html](index.html) |
| Collection, Watchlist, Insights renderers and controls | [collection-screen.js](assets/collection-screen.js), [watchlist-screen.js](assets/watchlist-screen.js), [insights-screen.js](assets/insights-screen.js) |
| Form state, validation, autocomplete and saves | [entry-form.js](assets/entry-form.js), [style-forms.js](assets/style-forms.js) |
| Paging, request status, rendering selectors | [journal-data.js](assets/journal-data.js), [journal-view.js](assets/journal-view.js) |
| Per-account style persistence and local ranking | [style-store.js](assets/style-store.js), [style-recommendations.js](assets/style-recommendations.js) |
| Media identity, batch cache, and comparison UI | [media-identity.js](assets/media-identity.js), [discovery-session.js](assets/discovery-session.js), [discovery-comparison.js](assets/discovery-comparison.js) |
| Discovery API, authenticated history, prompting and verification | [api/discover.js](api/discover.js), [lib/grounded-discovery.js](lib/grounded-discovery.js) |
| Search and external ratings | [api/search.js](api/search.js), [lib/media-catalogue.js](lib/media-catalogue.js), [api/ratings.js](api/ratings.js) |
| Public config, environment isolation, and account deletion | [api/config.js](api/config.js), [lib/supabase-server.js](lib/supabase-server.js), [api/delete-account.js](api/delete-account.js) |
| Catalogue records, photos, links and tag taxonomy | [fragrances.js](catalogues/fragrances.js), [wardrobe.js](catalogues/wardrobe.js), [tags.js](catalogues/tags.js), and `catalogues/photos/` |

Browser state owns drafts, navigation, filters and view caches. Supabase owns durable account state and atomic writes. Provider secrets and media verification live in Vercel server-side code. Media search uses TMDB for films and TV, Google Books with Open Library fallback for books, iTunes for music, TheSportsDB for matches, and OMDb for optional film and TV ratings. An optional RAWG route exists, while games are outside the journal form.

## Persistence, auth, and deployment

| Data | Where it lives |
| --- | --- |
| Accounts and settings | Supabase Auth and `profiles`. Appearance preferences use browser storage. Password resets go through Auth email. |
| Entries and tags | `entries`, `tags`, `entry_tags`, and the `entries_with_tags` security-invoker view. Media metadata can store provider, ID, kind, release year and creator. Older title-only rows remain readable. |
| Watchlist and recommendation decisions | `watchlist`, `discovery_feedback`, and `discovery_catalogue_feedback`. Queue order is stored on Watchlist rows. Match by catalogue identity where possible and keep legacy title matches conservative. |
| Insights | `user_fingerprints` and `compute_fingerprint`. Style summaries are derived client-side from account-owned rows. |
| Style and scent | `style_items` keyed by account, kind and item ID. JSON details include descriptive fields and optional personal photo URL. Legacy local import preserves a same-ID server record and clears browser data after success. |
| Request quota | Private `nz_private.discovery_quota`. The authenticated reservation RPC caps each account at 12 slots per hour. PostgreSQL serializes reservations on the account row. |

Supabase row-level security scopes journal and style records to their owner. The account deletion handler verifies the signed-in caller before using the server-side admin key, and foreign-key cascades remove owned application data. Keep the project URL and its public and admin keys together. Preview uses the `PREVIEW_SUPABASE_*` variables and fails closed if credentials are missing or it points at production. The public config response exposes the URL and publishable key. Use the environment-variable names in [SUPABASE_SETUP.md](SUPABASE_SETUP.md). Keep actual secret values in Vercel or an untracked local environment file.

The SQL order is the three root schema/migration files, then migrations 003 through 008. Migration 003 hardens account isolation and the fingerprint view. Migration 004 adds the quota, 005 adds account-owned Style & Scent, 006 adds Discovery feedback, 007 adds atomic journal and watchlist commands, and 008 adds catalogue identity, queue positions and related media commands. Migration 008 was applied to staging earlier in the work and exercised in a staging rollback-only check. Check the current production schema before promoting and apply only missing migrations in sequence. Replaying root scripts after 003 can restore older definitions. This latest photo and handoff update adds no schema migration.

Authenticated workflow code uses `save_journal_media`, `save_watchlist_media`, `dismiss_watchlist_media`, and `save_up_next_order` from 008, with atomic operations from 007 underneath where applicable. Mutation retries reuse draft IDs. Sign-out clears account-scoped state, cached cards and pending ownership checks. If rolling back production, use a compatible frontend and API pair and keep the hardened policies in place. A very old frontend uses browser-only Style & Scent and cannot call the new authenticated Discovery handler on its own.

## How recommendations work

1. The Browser requests a Discovery mode, optional format and starting entry. The server verifies the bearer session and reads paginated account history. Journal notes stay outside the model prompt.
2. For broad Discovery, the server selects up to three distinct works rated at least 7/10 per relevant format. A selected More like this seed may have any rating. The prompt includes titles, ratings, dates and bounded tags. Eligible broad runs may include a small sample of works rated 4/10 or below. Specific-seed runs omit that low-rating signal.
3. Known journal entries, active Watchlist items, dismissals and recently shown items inform exclusions. Claude generates candidates and reasons. The server checks the returned titles against provider catalogues, rejects unusable or known picks and balances formats across the result batch. Approximate matches are weaker when old rows lack provider, year and creator metadata.
4. The browser caches per-view batches for up to 30 minutes within the signed-in session. Refresh rotates the eligible sample and uses recent exclusions. Retry preserves the round. Positive and dismiss actions update the visible batches. Media and catalogue retries have independent request status.
5. Close match, Shared taste and Explore are descriptions of editorial/tag overlap. Close match requires a strong anchor and at least two suggested shared tags. Catalogue presence is checked. The label describes affinity without estimating the chance of enjoyment.
6. The Compare picks UI supports a blind comparison with the original method and a controlled comparison of low-rating context. Low-rating comparison needs a 4-or-below and a 7-or-above in the same format. Both lists use the same snapshot, anchors, model and verification. Shared candidates are excluded and each format contributes evenly, up to five per set. A two-run comparison can consume two quota slots.

`api/discover.js` configures the model as `claude-sonnet-4-6` at this snapshot and budgets provider time inside the Vercel limit. The **Latest media request timing** detail exposes history, model and catalogue verification phases. Keep the billed-provider settings and Anthropic spend limits separate from the in-app quota. For quality work, gather several blind comparison batches and record whether the user would try the picks, already knows them and finds the explanation convincing. Automated checks verify data flow and exclusions. Personal relevance still requires real feedback.

Style & Scent ranking is local to the browser and uses the app’s own product lists. Fragrance profiles use notes, character, seasons, projection, houses and the signal from status and ratings. Wardrobe uses tags, seasons, occasions and category balance. Saved products are filtered out from suggestions. Entry pickers still include generic wardrobe logging options. Changing product images alone can affect cold-start ordering because photographed products receive a preference in that view.

## Catalogue and photo maintenance

| Catalogue | Entries | Artwork in app |
| --- | ---: | ---: |
| Named wardrobe products | 130 | 43 |
| Fragrances | 327 | 34 |

The wardrobe entry picker retains 93 additional generic choices. The exact photo key is normalized product name plus maker or fragrance house. Keep editions or concentrations separate. A catalogue photo is used when a saved product identity matches, unless the user supplied their own image URL. Current sources are credited Wikimedia Commons files and one RISD Museum open-access image. Two original fragrance photos still use their Wikimedia URLs. New manufacturer Product page links expose official photos without bundling those assets. Photos continue to be added before more named products.

For the next photo pass, follow the [photo sourcing playbook](STYLE-CATALOGUE.md#photo-sourcing-playbook). Keep a link, creator, usage license, model or concentration, and any changes to each bundled image. Save small WebP derivatives with a stable basename. Use accurate alternate text for packaging or a detail crop. Leave the existing initials fallback for missing images. The gallery of product-page links can grow independently of in-app photo coverage.

## Checks, known limits, and release sequence

Run from the repository with Node 22 or newer.

```sh
npm ci
npm test
npm run test:browser
git diff --check
```

The browser suite uses installed Chrome by default. Set `NZ_BROWSER_CHANNEL=msedge` for Edge or `NZ_BROWSER_EXECUTABLE` to a Chromium executable. The 33 automated tests and desktop/mobile browser suite passed for application revision `394fe4b`. The test suite covers catalogue identity, photos, embedded PostgreSQL ownership and transactions, quota, API responses, journal and Discovery state, recommendation rules, and Style & Scent persistence. The browser suite runs the actual page and Supabase SDK with synthetic accounts, network responses and image assets. It covers keyboard and touch flows, account switching, quick saves, and independent retries. The hosted release checks cover Anthropic, email delivery, and the production database separately. There is no tracked GitHub Actions workflow at this snapshot.

| Open work | What to verify |
| --- | --- |
| Hosted staging smoke test | Use a disposable staging login on desktop and a physical phone. Verify auth/password recovery if the release calls for it, catalogue search, a real paid Discovery request, save/reload, Style & Scent isolation across accounts, and account deletion using disposable data. Staging signup was exercised earlier. The latest browser tests use synthetic services. |
| Production promotion | Confirm current schema and verified database backup, rehearse restore and migration order, configure production credentials, promote a reviewed matching revision, verify auth/saves/Discovery, and record rollback. The current production revision is old. Follow the [release checklist](SUPABASE_SETUP.md#preview-checks-and-promotion). |
| Recommendation quality and latency | Run repeat blind comparisons with a fuller real library at modest volume. Inspect live history, model and verification timing before changing the storage or retrieval model. The [local benchmark](PRODUCT-WORK.md#measurements-and-verification) measured transfer sizes and browser filtering on synthetic libraries. |
| Photo coverage | Continue matching existing products by exact model, colorway or concentration. Several file downloads remain rate-limited and the Adrian loafers still need a reusable exact image. Official photo links are a fallback. Broader named-product expansion is deferred by the owner. |
| Settings display name | Static review found that the Save handler still refers to an undeclared legacy `_sb` client. Account settings use `SUPA` elsewhere. Verify the repair through a saved display-name change and reload. |
| Refactor scope | The requested Collection, Watchlist and Insights renderer split and shared retry pass is complete. The page still coordinates routing, auth, and some Discovery/Style & Scent presentation. Use measured needs to decide any future split. |

## History and continuation

| Branch milestones | Work covered |
| --- | --- |
| `48f2292`, `07c86c5`, `643b6b9` | Account isolation, migration and setup, secured quota and deletion, initial catalogue expansion, catalogue-grounded recommendations and provider latency budget. |
| `2507d11` through `c721486` | Tag and staging feedback, atomic writes, journal UI/data/session separation and account-owned Style & Scent. |
| `ac6cc7b`, `8197caa`, `18d62df`, `9838a31` | Catalogue identity, repeat logs, individual tracks, persistent Up Next, low-rating comparison, narrow-phone workflows, screen-rendering split and unified retries. |
| `98326d4`, `659709a`, `394fe4b` | Specific style products, photo sources and credits, style category browsing and artwork, 120-product target exceeded, another photo pass and this handoff. |

For a new chat, share this file and identify `enam-ahorlu/narrative-zeitgeist` on `codex/narrative-hardening`. Ask the next maintainer to check the current branch and deployments, continue from the open work above, and keep writes to staging until a production release is explicitly authorized. See [REVIEW.md](REVIEW.md), [WORKFLOW-REVIEW.md](WORKFLOW-REVIEW.md), [STAGING-FEEDBACK.md](STAGING-FEEDBACK.md), and [PRODUCT-WORK.md](PRODUCT-WORK.md) for the original evidence and decisions.
