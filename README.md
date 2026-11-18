# Libflow

Libflow is a library occupancy and visit-tracking system for the FST Library. It records student visits, baggage information, zone status, session duration, and movement history so library staff can monitor occupancy and manage exits from a simple operations dashboard.

## Current Pilot Features

- QR-friendly student registration page at `/students`
- Student registration with:
  - Full name
  - `@mymona.uwi.edu` email validation
  - Student ID number
  - Visit duration of 15, 30, 45, or 60 minutes
  - Baggage information
- Four-character access code for students
- Student status page with remaining time, zone, status, and baggage details
- Admin dashboard with occupancy and recent activity
- Live session page at `/live-sessions`
- Bag check page at `/bags`
- Analytics page at `/analytics`
- Security override dashboard at `/overrides`
- Main dashboard QR code linking to the student registration page
- Expiry detection based on `expires_at`
- Admin alerts for sessions whose time has ended
- Automatic refresh of admin session data every 30 seconds
- Direct Supabase reads and writes from the frontend
- GSAP landing animation on the main dashboard

## Architecture

```text
Student phone
    |
    | QR code -> /student
    v
Next.js frontend
    |
    | Supabase browser client
    v
Supabase PostgreSQL
    |
    +-- library_sessions
    +-- library_session_events

Library staff
    |
    +-- / dashboard
    +-- /overrides
    +-- /live-sessions
    +-- /bag-checks
    +-- /analytics
```

The primary pilot data path is direct browser-to-Supabase access. The FastAPI service under `src/backend` contains a matching in-memory library API for development and future server-side processing, but the current frontend does not depend on it.

## Requirements

- Node.js 18 or newer
- npm
- Python 3.11 or newer for the optional FastAPI service
- A Supabase project

## Frontend Setup

Install dependencies:

```powershell
cd src/frontend
npm install
```

Create or update `src/frontend/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_STUDENT_URL=http://localhost:3000/student
```

The publishable key is safe to expose to the browser when Row Level Security policies are configured correctly. Never put a Supabase service-role key in `.env.local`, frontend code, or a public repository.

## Supabase Database Setup

The frontend expects two tables:

- `public.library_sessions`
- `public.library_session_events`

<<<<<<< HEAD
Run the first two migrations in the Supabase Dashboard:
=======
Run this migration in the Supabase Dashboard:
>>>>>>> skl/main

1. Open the Supabase project connected to `NEXT_PUBLIC_SUPABASE_URL`.
2. Go to **SQL Editor**.
3. Create a new query.
<<<<<<< HEAD
4. Run `202609200001_library_tracking.sql` and `202611140001_library_tracking_frontend_schema.sql` in timestamp order.
5. Refresh the frontend.
=======
4. Copy the contents of [supabase/migrations/202609200001_library_tracking.sql](supabase/migrations/202609200001_library_tracking.sql).
5. Run the query.
6. Refresh the frontend.
>>>>>>> skl/main

If the migration has not been applied, the application displays an error similar to:

```text
The library tables are not installed in Supabase yet.
```

<<<<<<< HEAD
The migrations create and align:
=======
The migration creates:
>>>>>>> skl/main

- UUID-backed library sessions
- Unique four-character access codes
- Duration constraints for 15, 30, 45, and 60 minutes
- Expiry timestamps
- Session event history
- Indexes for access-code, time, status, and zone queries
- Initial pilot Row Level Security policies

<<<<<<< HEAD
If you already ran only `202609200001_library_tracking.sql`, also run
`202611140001_library_tracking_frontend_schema.sql`. The original SQL creates
the initial tables; the follow-up migration adds the columns and event table
expected by the current frontend without deleting existing session data.

After those migrations, confirm that `libflowadmin@gmail.com` exists in the
project's Supabase Auth users, then run
`202611150001_user_registration_and_staff_approval.sql` in the SQL Editor. The
migration promotes that account to Head Librarian, links student visits to
`public.users`, creates pending staff profiles after staff signup, and limits
staff data access to approved accounts. It reports a clear error if that Auth
account does not exist.

### Pilot Security Warning

The first migration contains permissive pilot policies for compatibility. Apply the latest user/approval migration to replace them with approved-staff policies and narrowly scoped student registration/status RPCs.
=======
### Pilot Security Warning

The initial migration permits anonymous insert, read, update, and event logging so the QR workflow can operate without authentication. This is suitable only for early testing. Before production, replace these policies with controlled access using Supabase Auth, server-side routes, or trusted Edge Functions. In particular, anonymous users must not be allowed to update arbitrary student sessions.
>>>>>>> skl/main

## Run the Frontend

```powershell
cd src/frontend
npm run dev
```

Open:

- http://localhost:3000/ for the staff overview
- http://localhost:3000/student for student registration
- http://localhost:3000/overrides for staff status changes
<<<<<<< HEAD
- http://localhost:3000/login for staff sign-in
- http://localhost:3000/signup to request a staff account
- http://localhost:3000/admin/users for Head Librarian approvals
=======
>>>>>>> skl/main

If environment variables are changed while Next.js is running, restart the dev server so the new values are bundled into the browser client.

## Frontend Commands

Run these from `src/frontend`:

```powershell
npm run dev       # Start the development server
npm run build     # Create a production build
npm run start     # Serve the production build
npm run lint      # Run ESLint
npm run test      # Run Vitest tests
```

## Optional FastAPI Service

The backend is located at `src/backend` and exposes a library router at `/library`. Its current session store is in memory and resets whenever the process restarts. The frontend pilot uses Supabase directly instead.

Install backend dependencies from the backend directory using your preferred Python environment. With dependencies installed, start FastAPI from the repository root with:

```powershell
uvicorn src.backend.app.main:app --reload --port 8000
```

Useful endpoints in the optional service:

- `GET /health`
- `POST /library/registrations`
- `GET /library/students/{short_code}`
- `GET /library/admin/sessions`
- `POST /library/admin/sessions/{session_id}/status`
- `GET /library/admin/notifications`

## Data Model

### `library_sessions`

| Column | Purpose |
| --- | --- |
| `id` | UUID identifying one visit/session instance |
| `name` | Student name |
| `email` | Student email, restricted to `@mymona.uwi.edu` by the pilot check constraint |
| `student_id` | Student's institutional ID |
| `short_code` | Four-character code shown to the student |
| `duration_minutes` | 15, 30, 45, or 60 |
| `baggage_info` | Bag description or `No bag declared` |
| `zone` | `Main section` or `Basement` |
| `status` | `active`, `exited`, or `expired` |
| `created_at` | Registration time |
| `expires_at` | Calculated time limit |
| `updated_at` | Last status update |

### `library_session_events`

This is the append-only movement log. Each registration or admin status change creates an event containing:

- Session UUID
- Event type
- Zone
- Timestamp

A student can register multiple visits in one day. Each visit is a separate row linked to its own UUID, while the student's institutional ID can be used to group their historical records.

<<<<<<< HEAD
### `users` and staff approval

Student registrations create or update a `Student` row in `public.users` and link each visit through `library_sessions.user_id`. Staff signup creates a `LibraryStaff` Auth account and a matching pending user row; successful staff sign-ins update `last_login_at`. Only the bootstrapped Head Librarian can approve staff accounts at `/admin/users`; staff tools and session updates require an approved account.

=======
>>>>>>> skl/main
## Typical Workflow

### Student

1. Scan the QR code displayed at the library entrance.
2. Open `/student`.
3. Enter name, institutional email, ID number, duration, and baggage details.
4. Submit the registration.
5. Keep the generated four-character access code.
6. Use the student status page to check remaining time and baggage information.

### Security or Library Staff

1. Open `/overrides`.
2. Find the student by name, ID suffix, or access code.
3. Set the student's zone to Main section or Basement.
<<<<<<< HEAD
4. Set the state to Active, Exited, or Expired.
=======
4. Set the state to Inside, Exited, Waiting, or Expired.
>>>>>>> skl/main
5. Use `/bags` to verify and close held baggage claims.
6. Use `/analytics` to review traffic by time range.

## Expiry Behavior

<<<<<<< HEAD
The frontend derives an expired state when `expires_at` is in the past and the session has not been exited. This means alerts can appear without a background staff. The override page refreshes its session list every 30 seconds, and the student countdown refreshes on the same interval.

For production, add a scheduled Supabase job, Edge Function, or server staff if expired status must be persisted in the database rather than derived at read time.
=======
The frontend derives an expired state when `expires_at` is in the past and the session has not been exited. This means alerts can appear without a background worker. The override page refreshes its session list every 30 seconds, and the student countdown refreshes on the same interval.

For production, add a scheduled Supabase job, Edge Function, or server worker if expired status must be persisted in the database rather than derived at read time.
>>>>>>> skl/main

## Project Structure

```text
Libflow/
├── README.md
├── supabase/
│   └── migrations/
<<<<<<< HEAD
│       ├── 202609200001_library_tracking.sql
│       ├── 202611140001_library_tracking_frontend_schema.sql
│       └── 202611150001_user_registration_and_staff_approval.sql
=======
│       └── 202609200001_library_tracking.sql
>>>>>>> skl/main
└── src/
    ├── frontend/
    │   ├── src/app/
    │   │   ├── page.tsx
    │   │   ├── student/page.tsx
    │   │   ├── overrides/page.tsx
    │   │   ├── live-sessions/page.tsx
    │   │   ├── bag-checks/page.tsx
    │   │   └── analytics/page.tsx
    │   ├── src/components/
    │   │   ├── Lander.tsx
    │   │   ├── StudentPortal.tsx
    │   │   ├── OverrideDashboard.tsx
    │   │   └── OperationsPage.tsx
    │   └── src/lib/
    │       └── libraryApi.ts
    └── backend/
        └── app/
            ├── main.py
            └── library/router.py
```

## Troubleshooting

### `Failed to fetch`

- Confirm the Supabase URL is correct.
- Confirm the browser is using the current `.env.local` values.
- Restart `npm run dev` after changing environment variables.
- Confirm the Supabase project is reachable.
- Check the browser console for the hostname being requested.

### `library_sessions` does not exist

<<<<<<< HEAD
Run all SQL files in `supabase/migrations/` in timestamp order in the Supabase SQL Editor. A frontend build cannot create database tables automatically. If only the original migration was run, apply the follow-up schema migration as well.
=======
Run the migration in the Supabase SQL Editor. A frontend build cannot create database tables automatically.
>>>>>>> skl/main

### Student registration does not appear for staff

- Confirm the registration returned successfully.
- Confirm the migration and anonymous pilot policies were applied.
- Refresh `/overrides` or wait for its 30-second polling interval.
- Check the Supabase Table Editor for the new row.

### Historical analytics are empty

Analytics are calculated from actual `library_sessions.created_at` records. The project does not generate historical visits automatically. Register real test visits or seed the table with approved test data.

## Roadmap

- Replace open pilot RLS policies with staff/student permissions.
- Persist role-aware staff access through Supabase Auth.
- Add a separate student identity table and deduplicate student profiles by institutional ID.
- Add database-backed staff approval for stays longer than 60 minutes.
- Add a proper baggage claim table and claim-code validation.
- Add scheduled expiry processing and notifications.
- Add real QR code generation hosted by the application instead of the external QR image endpoint.
- Add device/event ingestion for RFID, NFC, barcode, or turnstile readers.
- Add automated tests for session state transitions, expiry, policies, and analytics.
