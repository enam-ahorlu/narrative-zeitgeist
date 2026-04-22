# Supabase Setup — Narrative & Zeitgeist

Step-by-step guide to creating your Supabase project and wiring up the schema.

---

## Step 1 — Create a Supabase project

1. Go to [https://supabase.com](https://supabase.com) and sign in (or create a free account).
2. Click **New project**.
3. Fill in:
   - **Name:** `narrative-zeitgeist`
   - **Database password:** pick something strong and save it somewhere safe
   - **Region:** choose the one closest to you (e.g. `West EU` or your nearest)
4. Click **Create new project** and wait ~1 minute for provisioning.

---

## Step 2 — Run the schema SQL

1. In your Supabase project, go to **SQL Editor** (left sidebar).
2. Click **New query**.
3. Open the file `supabase_schema.sql` (it's in this same folder).
4. Copy the entire contents and paste it into the SQL editor.
5. Click **Run** (or press `Ctrl+Enter` / `Cmd+Enter`).

You should see a success message. The following will have been created:

| Object | Type | Purpose |
|--------|------|---------|
| `profiles` | Table | App-level user info, auto-created on signup |
| `entries` | Table | Shows, books, matches, music the user logs |
| `tags` | Table | User-owned labels |
| `entry_tags` | Table | Junction: entries ↔ tags |
| `user_fingerprints` | Table | Cached taste profile JSON |
| `watchlist` | Table | Saved recommendations |
| `entries_with_tags` | View | Entries + their tags in one query |
| `compute_fingerprint()` | Function | Calculates & caches the taste profile |
| RLS policies | Security | Each user can only see their own data |

---

## Step 3 — Enable Email Auth

1. Go to **Authentication → Providers** in the left sidebar.
2. Make sure **Email** is enabled (it is by default).
3. For now, leave **Confirm email** turned **off** — this lets you sign up and log in instantly without needing to verify your email. You can turn it on later before a real public launch.

---

## Step 4 — Grab your API keys

You'll need two values from your project. Go to **Project Settings → API**:

| Key | Where to find it | What it's for |
|-----|-----------------|---------------|
| **Project URL** | `https://xxxx.supabase.co` | The base URL for all API calls |
| **anon / public key** | Long JWT string under "Project API keys" | Safe to use in frontend code |

Copy both. You'll paste them into the app in the next step.

> ⚠️ Never share or commit your **service_role** key — that one bypasses all RLS and has full database access. The `anon` key is the safe frontend one.

---

## Step 5 — Verify the setup (optional but recommended)

In the **SQL Editor**, run this quick sanity check:

```sql
-- Should return 6 tables + 1 view
select table_name, table_type
from information_schema.tables
where table_schema = 'public'
order by table_name;

-- Should return the compute_fingerprint function
select routine_name
from information_schema.routines
where routine_schema = 'public';
```

---

## What's next

Once you have the Project URL and anon key ready, the next step is wiring Supabase into the existing prototype HTML file:

1. Add the Supabase JS SDK via CDN (one `<script>` tag)
2. Replace the fake `enterApp()` login with real `supabase.auth.signInWithPassword()`
3. Make the "Add Entry" modal call `supabase.from('entries').insert(...)`
4. Read entries from `supabase.from('entries_with_tags').select(...)` instead of hardcoded HTML

The design won't change at all — we're just replacing the mock JS with real database calls.
