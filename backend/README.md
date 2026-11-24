# LIBFLOW FastAPI Backend v2

This backend is the server-side API for the LIBFLOW library occupancy and
visit-tracking system.

It is designed against the **current LIBFLOW Supabase schema**:

- `public.library_sessions`
- `public.library_session_events`
- `public.staff`
- `public.daily_visit_totals`

It also uses the database functions already defined by the current schema:

- `student_check_out`
- `expire_overdue_sessions`
- `report_hourly_occupancy`
- `report_daily_totals`
- `report_average_stay`
- `save_daily_total`

## Architecture

```text
Next.js Frontend
       |
       | HTTP / JSON
       v
FastAPI Router
       |
       v
Service Layer
       |
       v
Repository Layer
       |
       v
Supabase PostgreSQL
```

The frontend should not use the Supabase service-role key. The service-role
key belongs only in the FastAPI backend environment.

## Important database alignment

This backend uses the current schema column names:

```text
library_sessions
├── id
├── student_id
├── student_email
├── check_in
├── check_out
├── allotted_minutes
├── zone
├── bag_number
├── visit_reason
└── status
```

Do not mix these with the older pilot names such as:

```text
session_id
check_in_time
session_status
duration_minutes
```

The current database schema is the source of truth.

## Folder Structure

```text
backend/
├── app/
│   ├── __init__.py
│   ├── main.py
│   │
│   ├── core/
│   │   ├── __init__.py
│   │   └── config.py
│   │
│   ├── database/
│   │   ├── __init__.py
│   │   └── supabase.py
│   │
│   └── library/
│       ├── __init__.py
│       ├── common.py
│       ├── repository.py
│       ├── router.py
│       ├── schemas.py
│       └── service.py
│
├── .env.example
├── requirements.txt
└── README.md
```

## Requirements

- Python 3.11+
- Supabase project using the current LIBFLOW schema
- Node/Next.js frontend is separate

## Setup

From the backend directory:

```bash
python -m venv .venv
```

Windows:

```bash
.venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Copy `.env.example` to `.env` and set:

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_ONLY_SERVICE_ROLE_KEY
FRONTEND_URL=http://localhost:3000
API_HOST=0.0.0.0
API_PORT=8000
```

### Security

Never place `SUPABASE_SERVICE_ROLE_KEY` in:

- Next.js `.env.local`
- browser JavaScript
- frontend source files
- GitHub

For the course prototype, the FastAPI server is the trusted database
boundary.

## Run

Run from the directory containing the `app` package:

```bash
uvicorn app.main:app --reload --port 8000
```

If you place this backend under `src/backend`, run from the repository root:

```bash
uvicorn src.backend.app.main:app --reload --port 8000
```

## API Endpoints

Base URL:

```text
http://localhost:8000
```

### System

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | API health check |
| GET | `/library/health` | Library router health check |

### Student / Session

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/library/check-in` | Create a new active library session |
| POST | `/library/check-out/{session_id}` | Check out a specific session |
| POST | `/library/student/check-out` | Student checkout using student ID + email |
| GET | `/library/sessions` | List sessions, optionally filtered by status |
| GET | `/library/sessions/{session_id}` | Get one session |
| GET | `/library/students/{student_id}/sessions` | Get a student's recent session history |

### Occupancy

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/library/occupancy` | Current number of active sessions |

### Overrides / Session Control

| Method | Endpoint | Purpose |
|---|---|---|
| PATCH | `/library/sessions/{session_id}/status` | Change active/exited/expired status |
| POST | `/library/sessions/expire-overdue` | Run database expiry function |

### Bag Check

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/library/bags` | List active sessions with bags |
| PATCH | `/library/sessions/{session_id}/bag` | Assign/change/release a bag number |

The database's partial unique index prevents the same bag number from being
assigned to two active sessions.

### Audit Events

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/library/events` | List audit events |
| GET | `/library/events?session_id=<UUID>` | List events for one session |

The database trigger writes session status events to
`library_session_events`.

### Analytics

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/library/analytics/hourly?date=YYYY-MM-DD` | Hourly occupancy/check-ins |
| GET | `/library/analytics/daily?start=YYYY-MM-DD&end=YYYY-MM-DD` | Daily visit totals |
| GET | `/library/analytics/average-stay?start=YYYY-MM-DD&end=YYYY-MM-DD` | Average completed stay |

### Daily Visit Totals

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/library/daily-totals/{YYYY-MM-DD}` | Save/recalculate one day's visit total |

### Staff

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/library/staff` | List staff allowlist |
| POST | `/library/staff` | Add staff member |
| DELETE | `/library/staff/{user_id}` | Remove staff member |

Staff endpoints are included for the course prototype. Production access
must be protected with authenticated role checks.

## Example Requests

### Check in

```http
POST /library/check-in
Content-Type: application/json
```

```json
{
  "student_id": "123456789",
  "student_email": "student@mymona.uwi.edu",
  "allotted_minutes": 60,
  "zone": "Main",
  "bag_number": "B012",
  "visit_reason": "Study"
}
```

Example response:

```json
{
  "session_id": "UUID",
  "student_id": "123456789",
  "check_in": "2026-11-24T19:00:00+00:00",
  "expires_at": "2026-11-24T20:00:00+00:00",
  "status": "active"
}
```

### Check out

```http
POST /library/check-out/SESSION_UUID
```

### Student checkout

```http
POST /library/student/check-out
Content-Type: application/json
```

```json
{
  "student_id": "123456789",
  "student_email": "student@mymona.uwi.edu"
}
```

### Current occupancy

```http
GET /library/occupancy
```

Example:

```json
{
  "occupancy": 17
}
```

### Get active sessions

```http
GET /library/sessions?status=active
```

### Override a session

```http
PATCH /library/sessions/SESSION_UUID/status
Content-Type: application/json
```

```json
{
  "status": "exited"
}
```

### Get active bags

```http
GET /library/bags
```

### Assign a bag

```http
PATCH /library/sessions/SESSION_UUID/bag
Content-Type: application/json
```

```json
{
  "bag_number": "B012"
}
```

To release the bag from an active session:

```json
{
  "bag_number": null
}
```

### Hourly analytics

```http
GET /library/analytics/hourly?date=2026-11-24
```

### Daily analytics

```http
GET /library/analytics/daily?start=2026-11-01&end=2026-11-24
```

### Average stay

```http
GET /library/analytics/average-stay?start=2026-11-01&end=2026-11-24
```

### Save daily total

```http
POST /library/daily-totals/2026-11-24
```

### Audit events

```http
GET /library/events?session_id=SESSION_UUID
```

## Validation

The API validates:

- Student ID is exactly 9 digits.
- Student email uses `@mymona.uwi.edu`.
- Duration is 15, 30, 45, or 60 minutes.
- Zone is `Main` or `Basement`.
- Status is `active`, `exited`, or `expired`.
- Visit reason is at most 100 characters.

The database remains the final integrity layer with its constraints and
unique indexes.

## Database Responsibilities

The current Supabase schema remains responsible for:

- session persistence
- one active session per student
- one active bag per bag number
- session status constraints
- checkout/check-in timestamps
- audit event trigger
- staff allowlist
- RLS and database privileges
- student checkout function
- overdue expiry function
- hourly occupancy reporting
- daily reporting
- average-stay reporting
- saved daily totals
- Supabase Realtime

The FastAPI service exposes these capabilities to the frontend through a
single API boundary.

## Testing

Start the server:

```bash
uvicorn app.main:app --reload --port 8000
```

Open FastAPI's interactive documentation:

```text
http://localhost:8000/docs
```

Use `/health` first.

Then test in this order:

1. `POST /library/check-in`
2. `GET /library/occupancy`
3. `GET /library/sessions?status=active`
4. `GET /library/sessions/{session_id}`
5. `GET /library/bags`
6. `GET /library/events`
7. `POST /library/check-out/{session_id}`
8. `GET /library/occupancy`
9. `GET /library/analytics/daily`
10. `GET /library/analytics/average-stay`

Do not use real student information for testing.

## Frontend Integration

Once the frontend is migrated to FastAPI, replace direct Supabase
browser-client calls for application operations with HTTP calls to this API.

Example:

```text
StudentPortal
    |
    | POST /library/check-in
    v
FastAPI
    |
    | Supabase service-role connection
    v
library_sessions
```

The frontend should receive the session UUID from the check-in response and
use that UUID to identify the current session.

## Important prototype limitation

This backend is designed to be the team's course-project server boundary.
The `.env` service-role key gives the backend broad database access.

Before production:

- add proper authentication
- identify the logged-in staff member
- enforce staff/head-librarian authorization server-side
- validate student identity through a trusted identity source
- add rate limiting
- add CSRF/authentication protections appropriate to deployment
- restrict CORS to the deployed frontend
- move scheduled expiry to a controlled worker/cron job
- add automated integration tests
