# Narrative & Zeitgeist review

Baseline [1946a7e](https://github.com/enam-ahorlu/narrative-zeitgeist/commit/1946a7e).

| Work | Acceptance |
| --- | --- |
| Account isolation | Two users can read their own entries and compute their own fingerprints. The view, tag links and RPC enforce ownership in PostgreSQL. |
| Discovery | Validated sessions are required. A database quota applies across Vercel instances. Invalid requests and quota failures never reach Claude. |
| Delete Account | Delete the verified caller through Supabase Auth. Confirm cascades remove app data and report errors accurately. |
| Style & Scent | Fragrance and wardrobe entries are account-owned and available across sessions. Browser-only records require explicit import into the current account. An empty collection stays empty. |
| Catalogues | Expand fragrance and wardrobe product suggestions and check their structure, duplicates and discovery integration. |
| Verification | Run automated database, HTTP handler and browser checks, and record which production integrations need a staging test. |

## Repository inventory

The current checkout contains the same 12 project files as the device copy in
`Desktop/Projects/Narrative and Zeitgeist`, with identical contents after
normalizing line endings. The Git metadata was excluded. The repository includes
the live HTML, prototype, local Supabase browser SDK, SQL scripts, three Vercel
handlers, deployment settings and the fragrance reference PDF. The live HTML
matches the baseline checkout. Hosted data, environment values, provider
credentials and deployment settings must be verified in their respective services.

The baseline also lacks a root README, dependency manifest and automated
checks. This change adds those files, a lockfile, versioned migrations and an
environment configuration reference. No project files were missing from the
GitHub commit relative to the device copy.

## Catalogue changes

- **Fragrances** increased from 267 raw rows to 291 entries after deduplication
  and expansion. The catalogue supports autocomplete and scent Discovery.
  The additions include fresh citrus, skin musks, marine scents, florals and
  gourmands from more houses. Manufacturer note lists informed the entries. Character,
  projection, season and grouping of notes without a published pyramid are
  editorial fields. The seven original sample fragrances are available by
  choice from an empty fragrance collection.
  [Amouage](https://amouage.com/en-uk/products/100ml-guidance),
  [Diptyque](https://us.diptyqueparis.com/en-us/products/eau-de-parfum-orpheon-orphp75c),
  [Lattafa](https://lattafa.com/product/khamrah-qahwa/),
  [Aesop](https://www.aesop.com/library/a-guide-to-fragrance.html),
  [PHLUR](https://phlur.com/products/father-figure-100ml),
  [Essential Parfums](https://www.essentialparfums.com/en/products/discovery-set),
  [Zoologist](https://www.zoologistperfumes.com/products/zoologist-bee-sample),
  [Maison Margiela](https://www.maisonmargiela-fragrances.us/fragrances/replica-eau-de-toilette/replica-lazy-sunday-morning/3614273185820.html)
- **Wardrobe** increased from 50 to 93 suggestions across all nine catalogue
  categories. Add Item now searches the catalogue and pre-fills the category,
  season and pairing field. Suggestions include warm-weather, rainy-weather,
  formal, casual, modest and West African textile options.
- **Other built-in lists** now include more media tags, fragrance and wardrobe
  tags, and title-specific cover colors. Search for films, TV, books, music and
  sports uses external providers. The app has no local title catalogue for
  those formats.

## Data and runtime decisions

- Style & Scent saves individual records under each account. Existing browser
  data remains local until someone explicitly imports it into their account.
  Import keeps existing database records with the same IDs and clears the
  browser source only after a successful write.
- Discovery verifies the Auth user, requests an atomic per-account reservation,
  validates and bounds the data sent to Claude, and checks the response before
  rendering it. The application limit is 12 requests per account per hour.
- Account deletion uses Supabase Auth’s admin API with a server-only key. The
  database cascades deletion to the profile, journal, tags, watchlist, cached
  fingerprint, Discovery quota and Style & Scent records.
  [Supabase deleteUser](https://supabase.com/docs/reference/javascript/auth-admin-deleteuser)

## Verification

- The current public Vercel deployment responded successfully for the landing
  page, the bundled client, sample book, music, film and TV searches, and the
  ratings endpoint. Those checks exercised the baseline deployment.
- Embedded PostgreSQL tests cover ownership, existing cross-owner tag links,
  fingerprint caches, quota and account deletion cascades. A native PostgreSQL
  run across 24 simultaneous connections to the same account accepted 12 and
  limited 12.
- HTTP handler tests use synthetic provider responses and cover session
  validation, quota failures, malformed recommendations, account targeting and
  deployment key handling. Browser tests exercise the real HTML and bundled
  client with synthetic accounts and HTTP responses.
- See [the staging checklist](SUPABASE_SETUP.md#preview-checks-and-promotion)
  for hosted Auth, email and billed Anthropic verification.
