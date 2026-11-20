# Workflow and architecture review

The current app can stay on static Vercel hosting, with Vercel functions for
provider calls and Supabase for Auth and journal state. A frontend framework or
separate application server would add migration cost without fixing the
consistency problems below.

| Area | Finding | Decision and acceptance |
| --- | --- | --- |
| Entry and tags | Editing deletes the old links before it knows whether replacement tags were saved. | A single authenticated database command saves the entry and its tags. A failure leaves the previous record intact. |
| Watchlist to Collection | The entry and Watchlist update run separately, and an archive failure is hidden. | Log and archive in the same transaction. A retry of a new form reuses its ID. |
| Watchlist saves | Search and cards have separate handlers and only check the browser cache for duplicates. | Use one save path and deduplicate active items in the database command. Preserve historical rows. |
| Tag management | Merge ignores errors from some steps. Removing a tag in Settings can leave old filters and insights visible. | Merge in one database command. Refresh related views after a confirmed change. |
| Collection | Both layouts are fully rebuilt. Filters read truncated tags from the DOM, Matches compares a label to an enum, and pagination is fixed markup. | Filter complete records, then render one page of the active layout. Keep counts based on the filtered data. |
| Watchlist priority and order | Reorder arrows only move DOM nodes and their effect disappears on reload. | Use explicit Up Next and Maybe priorities and consistent sorting. Manual cross-device ordering needs a separate product decision. |
| Insights | Recomputing the fingerprint immediately reads it back from the cache, and the timeline fetches a truncated second copy of journal data. | Render the computed snapshot directly. Build the timeline from the account journal already loaded. |
| Style & Scent | Discovery Details routes away and repeats prefill logic. Some saved tags and occasions have no matching edit control. | Open details in place and preserve values when editing. Use the same catalogue defaults for quick and detailed saves. |
| Search and Discovery | Older title-search results can replace newer ones. Recommendations exclude archived Watchlist rows even after the journal entry is removed. | Ignore obsolete searches. Exclude active Watchlist items, journal entries, and explicit dismissals. |

## Boundaries for the next pass

- **Browser** owns the form draft, active tab, sort and pagination. Keep network
  calls behind feature workflows and pass records into renderers.
- **Supabase** owns account data and transactions that change related records.
  The new functions run with caller permissions and the existing row-level
  policies. Deploy migration 007 before the matching frontend.
- **Vercel** owns provider credentials, media lookups, and Discovery verification.
  The old and new recommenders share a comparison feature. Keep both until
  the comparison has enough feedback to support a decision.
- **Separate decisions** include how to distinguish remakes or same-titled
  works across providers, whether to allow repeated journal logs of one work,
  how to record durable ordering within Up Next, and how to represent different
  kinds of consumption such as singles versus albums. Existing Watchlist and
  dismissal behavior uses titles within a format, so upgrading identity
  requires a compatibility and backfill plan.

## Remaining decisions and scale checks

1. **Catalogue identity.** Decide which provider IDs identify a distinct work,
   whether editions or remakes should be grouped, and whether a rewatch or
   reread should create another entry. The normalized-title comparison can
   collapse legitimately different works. New Watchlist saves retain the
   available provider ID to support a future migration.
2. **Recommendation feedback.** For You samples positively rated works and
   filters explicit dismissals. A low rating excludes that work from the
   favorites sample. It does not teach the recommender which characteristics
   to avoid. Decide whether to add that behavior and how to compare it using
   the existing blind comparison before changing the ranking.
3. **Collection size and latency.** The browser now renders at most ten media
   entries per page, but still loads the full account journal for local
   filtering and insights. Discovery independently reads the full exclusion
   history while generating a new batch. Measure account sizes, payloads,
   and provider latency before adding server-side search, incremental
   retrieval, or cached candidate pools.
4. **Browser structure.** Screen-level state remains in the static
   application script. Extract Collection, Watchlist, Discovery and Style
   behind clear interfaces in small steps, leaving the integration tests
   in place to catch regressions. Keep the static deployment while this
   boundary changes.
