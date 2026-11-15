# LibFlow

Web-based library management system for the UWI FST Library: QR check-in and check-out, live occupancy monitoring, bag-checks and usage reports.

## Tech stack

- React + TypeScript (built with Vite)
- React Router
- Supabase (PostgreSQL, Row Level Security, realtime)

## Getting started

1. Clone the repo and open the folder.
2. Install packages:
   ```
   npm install
   ```
3. Copy `.env.example` to `.env.local` and fill in the values. Ask the team lead for them privately, and never post them in GitHub or a public chat.
4. Start the app:
   ```
   npm run dev
   ```
5. Open http://localhost:5173/

## Environment variables

| `VITE_SUPABASE_URL` | The Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | The publishable (anon) key. Never use the `service_role` key. |

## Project structure

```
src/
  lib/
    supabaseClient.ts    Supabase connection
    libraryApi.ts        Check-in, check-out and query functions
  pages/
    StudentPortal.tsx    QR check-in form (FR-01)
    OverrideDashboard.tsx  Staff check-out and override (FR-02)
    OperationsPage.tsx   Staff area wrapper
    operations/
      LiveSessions.tsx   Live occupancy (FR-04)
      Analytics.tsx      Reports (FR-03)
      BagChecks.tsx      Bag-checks (FR-05)
```

## Session statuses

`active`, `exited`, `expired`

## Team workflow

- Never commit directly to `main`. Create a branch per issue (`feature/...` or `fix/...`) and open a pull request.
- At least one teammate reviews every PR before it is merged.
- Never commit secrets or `.env.local`.