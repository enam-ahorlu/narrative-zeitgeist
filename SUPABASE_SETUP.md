# Supabase and Vercel setup

## Supabase

Use a dedicated staging Supabase project for preview deployments. The migration
for the collection view requires PostgreSQL 15 or newer.

For an empty database, apply these scripts in the listed order using the SQL
Editor or your migration runner.

1. `supabase_schema.sql`
2. `supabase_migration.sql`
3. `supabase_migration_fix.sql`
4. `migrations/003_account_isolation.sql`
5. `migrations/004_discovery_quota.sql`
6. `migrations/005_style_items.sql`

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

## Vercel environment variables

Set the variables in Vercel for the target environment, using separate Supabase
projects and Anthropic keys for Preview and Production. Use the same Supabase
project for its URL, public key and admin key.

| Name | Purpose |
| --- | --- |
| `SUPABASE_URL` | Supabase project URL. |
| `SUPABASE_ANON_KEY` | Browser-safe publishable key or legacy anon JWT. This and the URL are served by `/api/config`. |
| `SUPABASE_SECRET_KEY` | Server-only Supabase secret key used for account deletion. `SUPABASE_SERVICE_ROLE_KEY` is supported as a legacy alternative. |
| `ANTHROPIC_API_KEY` | Server-only key for media recommendations. Requests include the taste fingerprint, selected tab and up to 100 journal or watchlist titles. |
| `TMDB_API_KEY` | Film and TV title search. |
| `GOOGLE_BOOKS_API_KEY` | Optional Google Books title search. Open Library provides a fallback. |
| `OMDB_API_KEY` | External film and TV ratings. |
| `RAWG_API_KEY` | Optional existing server-side game lookup. Games are outside the current journal form. |

Keep the server keys in Vercel or an untracked local environment file. Configure
the Anthropic project’s spending limit independently of the app’s per-account
quota of 12 requests per hour.

## Preview checks and promotion

1. Back up the existing database and verify the backup before running pending
   migrations in production. Rehearse the migration order in staging first.
2. Configure Preview variables and deploy the branch against staging. Create two
   disposable accounts. Confirm signup, sign-in, password recovery, title
   search, collection tagging and the Taste Fingerprint.
3. With at least three synthetic entries, request a Claude recommendation, save
   it to Watchlist, and verify the recommendation output. Check that Discovery
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
