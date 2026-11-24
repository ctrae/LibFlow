# Libflow Bag Checks

Libflow is a staff-facing page for reviewing student bag declarations and verifying handoffs at the library exit. The frontend is focused on bag checks; approved library staff sign in before accessing the page.

## Architecture

```text
TypeScript UI
    -> FastAPI routes
        -> bag-check service (business rules)
            -> Supabase repository (data access)
                -> Supabase Auth and PostgREST
```

The browser uses Supabase Auth for sign-in and sends its short-lived user access token to FastAPI. The backend validates the token and approved staff profile, then uses that same token for Supabase requests so database Row Level Security remains in effect. The publishable key is not a service-role key. UI components do not query or mutate database tables directly; the `libraryApi.ts` module calls the backend API.

## Frontend

Copy `frontend/.env.example` to `frontend/.env.local` and set the Supabase project URL and publishable key. Then run:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000/` (or `/bag-checks`) for the bag-check page. Staff sign in at `/login`; new staff can request access at `/signup`.

## Backend

Copy `backend/.env.example` values into your environment. On PowerShell, set the backend values before starting it:

```powershell
$env:SUPABASE_URL = "https://your-project.supabase.co"
$env:SUPABASE_PUBLISHABLE_KEY = "your-supabase-publishable-key"
$env:FRONTEND_ORIGINS = "http://localhost:3000"
cd backend
python -m pip install -e ".[dev]"
python -m uvicorn app.main:app --reload --port 8000
```

The frontend defaults to `http://localhost:8000`; set `NEXT_PUBLIC_BACKEND_URL` in `frontend/.env.local` if the API runs elsewhere. Apply the SQL scripts in `database/` to the Supabase project in timestamp order before using the app.

The checkout timestamp migration keeps `expires_at` as the planned deadline and only records `check_out_time` for an actual exit.

Bag-check endpoints:

- `GET /library/profile`
- `GET /library/admin/bag-claims`
- `POST /library/admin/bag-claims/{session_id}/verify`
