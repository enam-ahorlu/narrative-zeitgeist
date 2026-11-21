# Narrative & Zeitgeist

A personal media journal with a collection, taste insights, recommendations and
a watchlist. Style & Scent adds account-owned fragrance and wardrobe collections,
with suggestions from built-in catalogues.

- [Live app](https://narrative-zeitgeist.vercel.app/)
- [Review fixes, evidence, and release status](REVIEW-FIXES.md)
- [Maintainer handoff and current state](HANDOFF.md)
- [Supabase and Vercel setup](SUPABASE_SETUP.md)
- [Workflow and architecture review](WORKFLOW-REVIEW.md)
- [Review, catalogue sources and verification](REVIEW.md)
- [Staging feedback checklist and recommendation behavior](STAGING-FEEDBACK.md)

The Vercel entry point is `index.html`. The browser uses the bundled Supabase
SDK, the public project configuration from `/api/config`, and the two scripts
in `catalogues/`. `supabase.js` is a vendored copy of supabase-js 2.104.0; update
it by replacing the file and changing this version.

## Run the checks

Use Node 22 or newer.

```sh
npm ci
npm test
npm run test:browser
```

The browser check uses an installed Chrome by default. Set
`NZ_BROWSER_CHANNEL=msedge` for Edge or `NZ_BROWSER_EXECUTABLE` to an installed
Chromium executable. The browser tests use the real app and bundled client
against synthetic responses. The SQL tests execute the schema and migrations in
embedded PostgreSQL with stand-in Supabase roles and claims. The HTTP handler
tests simulate Auth, PostgREST and Anthropic responses. None needs production
credentials.
