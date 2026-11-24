# LIBFLOW

LIBFLOW is a library occupancy and visit-tracking project. This repository
contains a Next.js frontend, a FastAPI backend, and the Supabase database
schema.

## Project structure

```text
LibFlow/
├── backend/
│   ├── app/
│   │   ├── core/config.py
│   │   ├── database/supabase.py
│   │   └── library/
│   │       ├── repository.py
│   │       ├── router.py
│   │       ├── schemas.py
│   │       └── service.py
│   ├── main.py
│   └── README.md
├── database/
│   ├── README.md
│   └── schema.sql
└── frontend/
    ├── app/
    │   ├── check-in/
    │   ├── live-sessions/
    │   ├── login/
    │   └── student/
    ├── lib/
    ├── types/
    └── package.json
```

## Architecture layers and integration status

The backend has recognizable presentation, business-logic, and data-access
layers. This describes the current code organization; it is **not yet a strict
Clean Architecture implementation**.

### Backend layer mapping

| Layer | Current files | Responsibility and current boundary |
|---|---|---|
| Presentation / API | `backend/app/library/router.py`, `backend/app/library/schemas.py` | FastAPI routes, HTTP parameters, and request/response validation. |
| Application / business logic | `backend/app/library/service.py` | Library operations and business rules. It currently imports FastAPI exceptions and API schemas, so it is still coupled to the presentation framework. |
| Persistence adapter | `backend/app/library/repository.py` | Reads and writes library data through Supabase. It is a concrete implementation, not an implementation of a separate repository port yet. |
| Infrastructure | `backend/app/database/supabase.py`, `backend/app/core/config.py` | Creates the Supabase client and loads configuration. |
| Application bootstrap | `backend/main.py` and dependency providers in `router.py` | Creates the FastAPI app and connects routes. Some dependency wiring still lives in the router. |
| Domain | No separate domain package yet | Domain rules currently live in the service, while request/response shapes are in API schemas. |

The runtime request flow is:

```text
HTTP request
  → Presentation: router.py + schemas.py
  → Application: service.py
  → Persistence adapter: repository.py
  → Infrastructure: Supabase client
  → Supabase PostgreSQL
```

### Frontend layer mapping

| Layer | Current files | Current responsibility |
|---|---|---|
| Presentation | `frontend/app/` | Next.js routes and page UI. |
| Data access | `frontend/lib/` | Supabase browser client and frontend data helpers. |
| Shared types | `frontend/types/` | TypeScript data shapes used by the UI. |
| Application / domain | No distinct layer yet | Use cases and domain rules are not separated into dedicated layers. |

The frontend currently has its own Supabase browser client. It is **not yet
fully integrated with the FastAPI API**. Some frontend helpers still query
legacy database column names such as `session_id` and `session_status`; the
current schema and backend use `id` and `status`. The `/check-in` page currently
validates and displays form data in the browser rather than creating a database
session. Treat this as a work in progress when testing the frontend and backend
together.

The backend uses the current tables `library_sessions`,
`library_session_events`, `staff`, and `daily_visit_totals`, along with the
database functions defined in `database/schema.sql`.

## Requirements

- Node.js supported by the installed Next.js version
- pnpm 10.6.3 (the frontend declares this package manager)
- Python 3.11 or later
- A Supabase project for database-backed functionality

## Database setup

If the project database has not already been initialized, review
[`database/schema.sql`](database/schema.sql) and apply it to the correct
Supabase project using the Supabase SQL Editor. Coordinate with the team before
changing a shared database. The script creates the tables, constraints,
policies, triggers, and functions used by the backend.

## Frontend setup

From the repository root:

```powershell
cd frontend
pnpm install
```

Create `frontend/.env.local` with the Supabase project URL and an anon/publishable
key:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_OR_PUBLISHABLE_KEY
```

Never put the Supabase service-role key in the frontend or any `NEXT_PUBLIC_`
variable.

Start the development server:

```powershell
pnpm dev
```

The frontend is available at <http://localhost:3000>. Current routes include:

- `/check-in` — student check-in form
- `/student` — student session page
- `/live-sessions` — occupancy page
- `/login` — staff login

Available frontend checks:

```powershell
pnpm lint
pnpm build
```

## Backend setup

From the repository root:

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install fastapi "uvicorn[standard]" supabase "pydantic-settings[dotenv]" email-validator
```

The repository does not currently contain a tracked Python dependency manifest,
so the install command above is unpinned. A `requirements.txt` or `pyproject.toml`
should be added to make backend setup reproducible.

Create `backend/.env`:

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_ONLY_SERVICE_ROLE_KEY
FRONTEND_URL=http://localhost:3000
API_HOST=0.0.0.0
API_PORT=8000
```

Keep the service-role key private. Do not commit `backend/.env`, place the key
in frontend configuration, or share it in team chat.

Run the API from the `backend` directory:

```powershell
uvicorn main:app --reload --port 8000
```

- Health check: <http://localhost:8000/health>
- Interactive API documentation: <http://localhost:8000/docs>

The backend README is in [`backend/README.md`](backend/README.md).

## API areas

The FastAPI backend currently provides endpoints for:

- Student check-in and checkout
- Session lookup and history
- Occupancy and bag tracking
- Session status updates and audit events
- Hourly, daily, and average-stay analytics
- Staff allowlist management

Staff endpoints are documented as prototype functionality and should not be
exposed in production without server-side authentication and authorization.
