# LVS Logistics · fleet compliance

Fleet document compliance for lorry/truck operators. Tracks insurance, fitness,
permit, PUC, road tax and registration expiry across the whole fleet and shows —
in one screen — what needs action today.

Next.js (App Router) · TypeScript · Tailwind · shadcn-style UI · Supabase
(Postgres + Auth + Storage) · Lucide.

## Setup

1. **Install**

   ```bash
   npm install
   ```

2. **Environment** — copy `.env.example` to `.env.local` and fill in your
   Supabase project values (Project Settings → API).

   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=      # server only, never NEXT_PUBLIC_
   ```

3. **Database** — in the Supabase SQL editor run, in order:

   - `supabase/schema.sql` — tables, indexes, RLS, triggers, storage bucket,
     `renew_document()`, `generate_document_notifications()`
   - `supabase/demo_data.sql` — `seed_demo_data()` / `remove_demo_data()`
   - `supabase/migration_2026_09_09.sql` — only for databases created before
     09 Sep 2026 (CLL Insurance, permit types removed, optional expiry)

   Signing up creates the user's fleet, the nine default document types and
   notification preferences automatically (trigger on `auth.users`).

4. **Run**

   ```bash
   npm run dev
   ```

   Sign up, then Settings → *Load demo data* for 20 vehicles with a realistic
   mix of valid, expiring and expired documents.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run check` | Self-check for the expiry/compliance engine |

Product name lives in `APP_NAME` in `src/lib/utils.ts`; the logo files are
`public/logo.png` (full lockup) and `public/logo-mark.png` (sidebar/app icon).

## How it works

**Status is never stored.** `src/lib/status.ts` derives it from the expiry date:
expired (< 0 days), critical (0–7), warning (8–30), upcoming (31–60), valid
(> 60), and `no_expiry` for types where `document_types.requires_expiry` is
false (Registration Certificate). Every table, badge, report and notification calls the same two
functions — `getDocumentStatus()` and `getDaysRemaining()`.

**Compliance** (`src/lib/compliance.ts`) = required document types held with a
non-expired document ÷ required types, plus the worst status across the
vehicle's documents.

**Renewals never overwrite.** `renew_document()` marks the old row
`is_current = false`, inserts the new one linked by `previous_document_id`, and
writes a `document_history` row, so the previous number, expiry and file stay
visible on the vehicle page.

**Files** live in the private `documents` storage bucket at
`{fleet_id}/{vehicle_id}/{uuid}.{ext}`; Postgres stores only the path. Viewing
uses short-lived signed URLs. PDF/JPG/PNG only, 10 MB cap, enforced client-side,
in the server action and on the bucket.

**Notifications**: `generate_document_notifications()` writes idempotent in-app
rows at 60/30/15/7/1/0 days before expiry (deduped by
`(document_id, threshold_days, channel)`). The `channel` column and
`notification_preferences` are already in place, so an email/SMS/WhatsApp job
can fan out from the same rows without a schema change.

**Security**: RLS on every table, scoped through `owns_fleet(fleet_id)`; storage
objects scoped by the fleet-id folder; middleware protects every route outside
`/login`, `/signup`, `/auth`. The service-role key is never read by client code.

## Structure

```
src/
  app/(auth)/         login, signup
  app/(app)/          dashboard, vehicles, documents, actions, drivers,
                      reports, settings, search, vehicles/import
  components/         domain components + components/ui primitives
  lib/                status engine, compliance, queries, csv, validations
  server/             server actions (auth, fleet, documents, notifications)
supabase/             schema.sql, demo_data.sql
```
