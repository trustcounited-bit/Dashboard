# Review Network Dashboard

Operations dashboard for managing review supply across multiple suppliers and reviewers. Built on Next.js 14 (App Router), Supabase (Postgres + Auth + RLS), and Tailwind CSS.

This is the **complete operational build** — every page has real forms, real queries, and full UX. You can run a full day's operations end-to-end inside the dashboard.

---

## What's included

### Authentication & access control
- **Login / Signup** with `?invite=CODE` for supplier signups
- **Email confirmation** handler at `/auth/confirm`
- **Role-based middleware** routes admins to `/admin/*` and suppliers to `/supplier/*` automatically
- **Row-Level Security** on every business table — suppliers only ever see their own data; admins see everything
- Sign-out route at `/auth/signout`

### Admin (10 pages)
| Page | What it does |
|---|---|
| **Dashboard** (`/admin/dashboard`) | Live operational counts — overdue, due today, completions to record, drops to check |
| **Clients** (`/admin/clients`) | List + add form. Platform/status enums enforced. Status cycle button (active → paused → archived). |
| **Suppliers** (`/admin/suppliers`) | List with invite codes shown inline, copy-to-clipboard signup link, add form |
| **Orders** (`/admin/orders`) | List using `order_progress` view; new-order form (no supplier pre-assignment); links to detail |
| **Order detail** (`/admin/orders/[id]`) | Summary cards, progress bar, full schedule table, status controls per review |
| **Today** (`/admin/today`) | **Dispatch flow.** Multi-select overdue + due-today reviews. Pick a supplier. WhatsApp message preview with copy button. Two actions: assign-to-supplier and mark-dispatched. |
| **Completions** (`/admin/completions`) | Entry form with **live eligibility validation** against `check_reviewer_eligibility` RPC. Surfaces all 4 violation types (cap reached, duplicate business, too soon, etc.) with friendly labels. "Save anyway" override for admin discretion. |
| **Reviewers** (`/admin/reviewers`) | Read-only view across all suppliers. Filter chips: by supplier, at_cap, near_cap, inactive. Color-coded capacity bars. |
| **Drops** (`/admin/drops`) | Two queues: 20-day check queue (status=posted, posted ≥ 20d ago) + dropped queue. Mark Live / Mark Dropped with notes. All writes go to `drop_check_log`. |
| **Analytics** (`/admin/analytics`) | Top-level stats (orders, posted, drop rate, in-flight) + supplier performance table sorted by posted count, drop rate color-coded. |

### Supplier (4 pages)
| Page | What it does |
|---|---|
| **Dashboard** (`/supplier/dashboard`) | RLS-scoped: their queue size, completion-ready count, reviewer pool stats |
| **Today** (`/supplier/today`) | Their assigned/dispatched reviews. Expandable rows with inline completion form per review. Same eligibility validation as admin completions. |
| **Reviewers** (`/supplier/reviewers`) | Manages their own reviewer pool. Add / edit / set status. Platform multi-select, capacity, account age, notes. Filter chips: available, at_cap, inactive. |
| **History** (`/supplier/history`) | Their completed (posted) reviews, drop-check status visible inline. Read-only, ordered by posted_date desc. |

---

## Deploy in 6 steps

### 1. Get your Supabase anon key

Supabase project → **Project Settings** → **API Keys** → copy the **anon / publishable** key (starts with `eyJ...` or `sb_publishable_...`).

### 2. Push to GitHub

```bash
cd /path/to/extracted/dashboard
git init
git add .
git commit -m "Initial commit"
gh repo create review-dashboard --private --source=. --push
# or use the GitHub UI to create the repo and push
```

### 3. Deploy to Vercel

- Vercel → **Add New** → **Project** → import the GitHub repo
- Framework: **Next.js** (auto-detected)
- Add environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL` = `https://ckgtfjdhslkbujjczwlu.supabase.co`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (paste the anon key)
- Click **Deploy**

### 4. Tell Supabase about your Vercel domain

After Vercel gives you a URL like `review-dashboard.vercel.app`:

- Supabase → **Authentication** → **URL Configuration**
  - **Site URL**: `https://review-dashboard.vercel.app`
  - **Redirect URLs**: add `https://review-dashboard.vercel.app/auth/confirm` and `https://review-dashboard.vercel.app/**`

### 5. Create your admin user

- On the live site, go to `/login` → switch to **Sign up**
- Use `raghavbansal.co@gmail.com`, set a password, complete email confirmation
- In Supabase SQL editor, promote yourself:

```sql
update public.profiles set role = 'admin' where email = 'raghavbansal.co@gmail.com';
```

- Sign out, sign back in. You'll land on `/admin/dashboard`.

### 6. Onboard your first supplier

- `/admin/suppliers` → **+ Add supplier**
- Fill in name, contact info, save
- The list now shows that supplier's invite code and a copyable signup link
- Send the link to your supplier — they sign up at `/login?invite=CODE` and are auto-linked

---

## Day-to-day operations

**Every morning** (admin):
1. `/admin/today` — see what's due and overdue, multi-select by supplier, copy the WhatsApp text, send it
2. Click **Mark dispatched** to log the send

**Throughout the day** (supplier):
- `/supplier/today` — their queue. They open a review, fill in reviewer + posted URL, save. Eligibility is checked live.

**End of day** (admin):
- `/admin/completions` — record any completions suppliers reported via WhatsApp/voice
- Same eligibility checks; "Save anyway" if you want to override

**Weekly** (admin):
- `/admin/drops` — clear the 20-day check queue. Auto-replacement runs when you mark a review dropped.
- `/admin/analytics` — supplier performance, drop rates by supplier

---

## Database

Your Supabase project (`ckgtfjdhslkbujjczwlu`) is already configured with:
- 8 business tables with RLS policies
- 8 triggers (review code generation, schedule explosion, drop replacement, invite codes, reviewer caps)
- 12 functions including `check_reviewer_eligibility(reviewer_id, client_id, review_date)`
- Views: `reviewer_cap_status`, `order_progress`

Two migrations were applied during the build:
- `add_profiles_rls_policies` — added 4 policies on `profiles` (self-read, admin/exec read-all, admin update-all, self-update-safe). Without this, the previous build couldn't read the user's own role and middleware bounced everyone in a redirect loop.
- `add_order_progress_view` — created `order_progress` view for the orders list

---

## Stack notes

- **Next.js 14** App Router, server components everywhere a form action or query lives
- **Server actions** for all writes (no client-side mutations) — `revalidatePath` + `redirect` with `?ok=` / `?error=` URL params
- **Eligibility flow**: action redirects with `?error=eligibility:CODE` → page parses → shows friendly warning → form re-submits with hidden `force=1` for "Save anyway"
- **Supabase clients**: `lib/supabase/client.ts` (browser), `lib/supabase/server.ts` (RSC + cookies), `lib/supabase/middleware.ts` (session updater + role routing)
- **Auth helpers** in `lib/auth.ts`: `requireUser()`, `requireAdminOrExec()`, `requireSupplier()` — return typed `CurrentUser` with role + supplier link
- All pages set `export const dynamic = 'force-dynamic'` since they read auth/user data
- No client-side data libraries (no SWR, no React Query) — Server Components + revalidation handle everything

---

## Local development

```bash
npm install
cp .env.local.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
# → http://localhost:3000
```

Build verification:

```bash
npx tsc --noEmit   # type check (passes clean)
npx next build     # production build (20 routes, middleware ~81 kB)
```

---

## What's NOT in this build

To keep this honest about scope:

- **No notifications.** Suppliers don't get pinged when a review is assigned — you still send WhatsApp manually. The dispatch page formats the message; you copy and paste.
- **No file uploads / proof screenshots.** Drop checks are based on URL + status + your notes, not visual evidence.
- **No bulk import.** Adding 100 reviewers at once means 100 form submits. CSV import is a Phase 3 nice-to-have.
- **No reviewer login.** Reviewers exist as records owned by suppliers; only admins, executives, and suppliers log in.
- **No financial tracking.** Order revenue, supplier payouts, and reviewer payments are all out of scope.

These are all reasonable next-phase additions if and when they become real bottlenecks.
