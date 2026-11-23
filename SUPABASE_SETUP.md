# Supabase and Vercel setup

## Supabase

Use a dedicated staging Supabase project for preview deployments. The migration
for the collection view requires PostgreSQL 15 or newer.

For an empty database, run `node scripts/migration-files.js` from the checkout
you intend to deploy. Apply every file printed, in order, using the SQL Editor
or your migration runner. The database tests execute that same inventory and
exercise a real journal save. The three historical scripts come first, followed
by all numbered migrations. PostgreSQL must use UTF-8 with the ICU root collation
(`und-x-icu`) for Unicode journal identity.

For an existing database, verify which historical scripts have already been
applied and start at the first unapplied migration. The historical scripts add
`poster_url`, the `film` enum value and any missing profiles. Apply the newer
numbered migrations once in order. Reapplying the historical scripts after
migration 003 would restore older definitions of the collection view and
fingerprint function.

Enable the email provider in Supabase Auth. Set the Site URL and add the
app origins used for signup confirmation and password recovery to the
redirect allow list. For a hosted test, use disposable test accounts with
mailboxes that can receive the links.

Apply all pending migrations before deploying the matching frontend and API.
Migration 013 updates identity matching for existing and new titles. Migration
014 stores private recommendation comparison results. Both are additive or
replace compatible functions and leave existing journal rows intact. Migration 015 makes media ratings optional, preserves Watchlist artwork, and adds distributed Search and Ratings limits. Deploy the corresponding Discovery handler after migration 015. Only the window-aware refund function can return slots. The previous handler can reserve slots but cannot refund them.

## Vercel environment variables

Set the variables in Vercel for the target environment, using separate Supabase
projects for Preview and Production. Enable Vercel’s system environment variables
so the server can identify the deployment environment. Use the same Supabase
project for its URL, public key and admin key. A preview uses only the
`PREVIEW_SUPABASE_*` settings for Supabase, even if an integration also syncs
the production settings.

| Name | Purpose |
| --- | --- |
| `SUPABASE_URL` | Supabase project URL. |
| `SUPABASE_PUBLISHABLE_KEY` | Browser-safe publishable key. `SUPABASE_ANON_KEY` is supported as a legacy alternative. The key and URL are served by `/api/config`. |
| `SUPABASE_SECRET_KEY` | Server-only Supabase secret key used for account deletion. `SUPABASE_SERVICE_ROLE_KEY` is supported as a legacy alternative. |
| `PREVIEW_SUPABASE_URL` | Staging Supabase project URL. Set only in Preview. |
| `PREVIEW_SUPABASE_ANON_KEY` | Staging publishable key or legacy anon JWT. Set only in Preview. |
| `PREVIEW_SUPABASE_SECRET_KEY` | Staging server-only secret key for account deletion and Discovery quota refunds. Set only in Preview. |
| `ANTHROPIC_API_KEY` | Server-only key for media recommendations. Use distinct keys per environment when available. |
| `DISCOVERY_MODEL` | Optional. Anthropic model id for Discovery. Defaults to `claude-sonnet-4-6`; values that are not a plain model id are ignored. |
| `TMDB_API_KEY` | Film and TV title search. |
| `GOOGLE_BOOKS_API_KEY` | Optional Google Books title search. Open Library provides a fallback. |
| `OMDB_API_KEY` | External film and TV ratings. |
| `RAWG_API_KEY` | Optional existing server-side game lookup. Games are outside the current journal form. |

Keep the server keys in Vercel or an untracked local environment file. Configure
the Anthropic project’s spending limit independently of the app’s per-account
quota of 12 requests per hour. A request that fails because the model provider
failed or timed out, or because all attempted catalogue checks failed, requests a refund of its slot; the refund needs the server secret key, so
it does nothing in Preview until `PREVIEW_SUPABASE_SECRET_KEY` is set.

## Backups and the content security policy

Before applying a migration to production, write a copy of the data outside the
repository:

```
SUPABASE_URL=https://<project>.supabase.co SUPABASE_SECRET_KEY=<secret key> npm run export:data
```

For the backup immediately before migration 014, append `-- --before-014` to the npm command. This checks for the new table and skips it only if PostgREST confirms its absence. Every existing table is still exported.

The file goes to `backups/`, which git ignores. It holds real journal data, so
keep it out of shared folders. The script refuses to run if `backups/` is not
ignored.

`vercel.json` sends a Content-Security-Policy that limits scripts, connections,
fonts and images to the hosts the app uses, and forbids framing, plugins and
base-tag changes. It still allows inline scripts and styles, because the page
uses inline handlers. The browser test serves the same header and fails on any
violation. If a new external host is added, add it to the policy in the same
change.

## Preview checks and promotion

1. Back up the existing database and verify the backup before running pending
   migrations in production. Rehearse the migration order in staging first.
2. Configure Preview variables and deploy the branch against staging. Create two
   disposable accounts. Confirm signup, sign-in, password recovery, title
   search, collection tagging and the Taste Fingerprint.
3. With at least three synthetic entries, request a Claude recommendation, save
   it to Watchlist, and verify the recommendation output. Open More like this,
   confirm each displayed reason cites the chosen entry, and dismiss one pick.
   Check that the dismissed title stays excluded from later requests. Use
   Compare picks to assess five or fewer suggestions from each method. Check that Discovery
   rejects signed-out requests and that the thirteenth request within an hour
   is limited. Use local tests to exercise quota repeatedly without buying
   provider calls.
4. Check that fragrances and wardrobe records follow the same test account to
   a second browser and remain hidden from the other test account. Import
   pre-existing browser data only after verifying which account owns it.
5. Delete one disposable account in Settings. Check that its sign-in and
   database data are removed while the other test account remains usable.
6. Configure the target environment and apply its pending migrations before
   deploying the matching app version. Verify sign-in and Discovery after
   deployment. Keep the hardened database policies in place if reverting the
   frontend. The older frontend cannot call the new authenticated Discovery
   handler without a matching backend rollback and would use browser-only
   Style & Scent storage.

For a local restore rehearsal, pipe the decrypted application JSON into `node scripts/rehearse-restore.js`. Add `--before-014` for a snapshot taken before the comparison table existed. Set `NZ_BACKUP_SHA256` to the source checksum to verify the exact plaintext bytes before import. The utility uses in-memory PostgreSQL, reconstructs Auth IDs as placeholders, and compares restored application rows. Auth passwords and sessions need a separate provider backup.
