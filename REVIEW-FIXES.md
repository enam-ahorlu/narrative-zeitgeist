# Review fixes and verification

The review used GitHub revision `7349421`. This register covers the findings, product suggestions, and release demonstrations from that review. A passing local or CI check means the application passed against test services. Hosted checks have their own status below.

| Review item | Change or decision | Evidence |
| --- | --- | --- |
| Full collection export | Settings downloads a fresh, paginated copy of media and style records for the signed-in account. JSON v2 preserves each journal ID, notes, dates, tags, cover, catalogue identity and year. Owned fragrances and wardrobe items include their details. CSV uses the same membership and includes structured metadata. Missing reads produce a retry message. | The Chrome suite saves a note, logs a track twice, saves both kinds of style item, reloads, and opens both real downloads. It checks IDs, text, year, provider ID, owner and counts. It simulates a failed style read with a warm cache and checks that no download starts. [Export](assets/collection-export.js) · [Browser checks](test/browser.e2e.js) |
| Advertised imports | Removed the inactive Letterboxd, Goodreads, Last.fm, and file import cards. The existing browser-to-account Style & Scent import remains available for eligible data. | [Settings](index.html) · [Legacy import checks](test/style-store.test.js) |
| Fresh installation | Setup and CI use a single ordered inventory. It includes the three historical files followed by every numbered migration. An independent empty-database test installs it, creates a user, calls the current save command and reads the tagged note back as that user. The existing upgrade test still starts with legacy data. | [Setup](SUPABASE_SETUP.md) · [Inventory](scripts/migration-files.js) · [Database tests](test/database.test.js) |
| Operator backups | Added style dismissals and comparison history. The database suite compares the backup inventory with the actual tables in the migrated public schema. A pre-014 mode allows a backup before the comparison table exists. The deployment excludes the backup directory. | [Backup utility](scripts/export-data.js) · [Backup tests](test/export-data.test.js) · [Schema coverage](test/database.test.js) |
| Collection membership | Lists, cards, tag filters, totals, sidebar, onboarding, pagination and exports use the same media-plus-owned-style projection. Wishlisted and tried items keep their existing destinations. The average excludes unrated items and includes a real zero rating. Counts include both new formats. The first-entry prompt waits for both datasets. | [Collection projection and summaries](assets/collection-screen.js) · [Mixed-account and wishlist checks](test/browser.e2e.js) |
| Catalogue outages | A successful lookup can find no eligible title. Failed lookups have a distinct outcome. If all attempted checks fail, Discovery returns a retryable 503 and requests a quota refund. Its message reports whether the refund was confirmed. Partial outages retain verified picks. Two-run comparisons wait for both provider outcomes before accounting for failed slots. | [Verification](lib/grounded-discovery.js) · [API](api/discover.js) · [Empty, partial and full outage checks](test/discovery.test.js) |
| Media identity | Migration 013 normalizes titles and creators with Unicode decomposition, mark removal, punctuation handling and root collation. A missing year in a legacy row no longer defeats fallback matching. Existing entries and deliberate repeats keep their identities. | An authenticated save is compared with the browser decision for accented titles, punctuation, Japanese titles, creators, remakes, provider IDs, and tracks versus albums. [Migration](migrations/013_journal_identity.sql) · [Database cases](test/database.test.js) |
| Keyboard operation | Table and grid titles are native buttons. Opening a title puts focus in its detail view. Closing returns focus to the title, or to search if the item has left the view. | Chrome opens a title with Enter and closes with Escape in both layouts, then checks the focused element. [Renderer](assets/collection-screen.js) · [Browser checks](test/browser.e2e.js) |
| Phone layout | Collection statistics start collapsed at widths up to 768 pixels. A labelled disclosure lets readers reopen them. Desktop retains the expanded strip. | The browser suite checks the collapsed state, taps to expand and collapse, and exercises the existing phone scrolling and width checks. [Phone screenshot with 19 synthetic entries](test/evidence/collection-phone.png) · [Browser checks](test/browser.e2e.js) |
| Recommendation quality across sessions | Revealing a blind comparison saves both sets, the preference, and the three judgments per pick under the account. Ambiguous saves reuse the same ID. **Discover → Compare picks → Past comparisons** summarizes up to 30 completed batches by method, including unfamiliar picks the person would try and picks subsequently logged. | A second browser session reads the saved batches. SQL checks owner isolation and account-deletion cascade. [Comparison UI](assets/discovery-comparison.js) · [Migration 014](migrations/014_comparison_results.sql) |
| Architecture and product decision | Kept the static app, Vercel functions, and transactional PostgreSQL writes. Shared the Collection membership rule and paginated journal reader. Both recommenders remain available while real preference and follow-through evidence accumulates. | Revisit the comparison after several owner-rated batches. The follow-through measure counts appearances in comparison sets matched to later media logs. It cannot establish causation, wearing a garment, or consuming a work outside the journal. |

## Verification record

On 21 November 2026, the Windows checkout passed lint and 57 unit, handler and database checks. The Chrome workflow passed with synthetic accounts and produced the linked 390-pixel phone screenshot. The mixed session contained 19 entries. The two track logs survived reload and export with distinct journal IDs and the same catalogue ID. A separate empty PostgreSQL installation saved its first film with a note, catalogue year, and tag.

## Reproduce the automated checks

From the project root with Node 22 or newer and Chrome installed:

```sh
npm ci
npm run lint
npm test
npm run test:browser
node scripts/migration-files.js
```

The unit and database command also exercises provider responses and quota handling. The browser command uses the real page and bundled Supabase client with synthetic users and upstream services. Set `NZ_SHOTS` to an existing output directory to capture the phone layouts.

## Hosted release status

The documented Vercel staging URL redirected to Vercel SSO. GitHub access was available. This session had no connected staging database credentials, disposable account with test inbox, or physical phone. Hosted sign-in, save and reload, password-recovery mail, physical-device use, and paid recommendation quality remain unverified for these changes.

Before production promotion, back up staging as appropriate, apply pending migrations in inventory order, and use the branch preview with staging. Sign into the disposable account, save a tagged note, reload and compare it with the JSON download. Send a recovery email, follow it in the test inbox, change the disposable password, and sign in again. Run one comparison, record genuine judgments, and reopen Past comparisons in another session. Use the same save and navigation flow on a physical phone. The [setup guide](SUPABASE_SETUP.md) covers production backup and promotion order. The branch requires migrations 013 and 014.
