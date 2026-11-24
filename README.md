# Libflow Bag Checks

Libflow is a staff-facing page for reviewing student bag declarations and verifying handoffs at the library exit. The frontend is focused on bag checks; approved library staff sign in before accessing the page.

## Frontend

The Next.js frontend reads library session records from Supabase. Configure `frontend/.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, then run:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000/` (or `/bag-checks`) for the bag-check page. Staff sign in at `/login`; new staff can request access at `/signup`.

The page lists records with declared baggage. Verifying a handoff marks that library session as exited. Apply the SQL scripts in `database/` to the connected Supabase project in timestamp order when setting up a new database.

## Backend API

The optional FastAPI backend implements the bag-claim domain and keeps its development data in memory. Start it from the backend directory:

```powershell
cd backend
pip install -e .
uvicorn app.main:app --reload --port 8000
```

Useful endpoints:

- `GET /health`
- `POST /library/registrations`
- `GET /library/admin/sessions`
- `POST /library/admin/sessions/{session_id}/status`
- `GET /library/admin/bag-claims`
- `POST /library/admin/bag-claims/{session_id}/verify`

The in-memory API state resets when the backend process restarts. The current frontend uses Supabase directly and does not call this optional API.
