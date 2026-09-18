# Darukaa.Earth

A full-stack geospatial data analytics platform for managing and visualizing carbon and
biodiversity projects. Administrators create projects, draw project sites as polygons on an
interactive map, and drill into per-site analytics (vegetation health, carbon stock, biodiversity
index, canopy cover) tracked over time.

Built for the Darukaa.Earth Full-Stack Developer Hackathon Challenge.

## Table of contents

- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Database schema](#database-schema)
- [Local setup](#local-setup)
- [Running tests](#running-tests)
- [Pre-commit hooks](#pre-commit-hooks--code-quality)
- [CI/CD pipeline](#cicd-pipeline)
- [Deployment](#deployment)
- [Data sources](#data-sources)
- [Trade-offs & design decisions](#trade-offs--design-decisions)

## Architecture

```
┌──────────────────┐        HTTPS / JSON         ┌────────────────────┐
│   React SPA       │ ───────────────────────────▶ │   FastAPI backend   │
│   (Vite + TS)      │ ◀─────────────────────────── │   (Python 3.11)     │
│                    │        JWT bearer auth       │                    │
│  - Mapbox GL JS     │                               │  - SQLAlchemy ORM   │
│  - mapbox-gl-draw   │                               │  - GeoAlchemy2      │
│  - Chart.js         │                               │  - python-jose      │
│  - React Router     │                               │  - Alembic          │
└──────────────────┘                               └──────────┬─────────┘
                                                                 │ SQL + PostGIS
                                                                 ▼
                                                     ┌────────────────────┐
                                                     │ PostgreSQL + PostGIS │
                                                     │ users / projects /   │
                                                     │ sites / site_metrics │
                                                     └────────────────────┘
```

**Frontend (`/frontend`)** is a single-page React application. It authenticates against the
backend with JWT, renders projects and sites on a Mapbox GL map, lets an administrator draw new
site polygons with `mapbox-gl-draw`, and charts time-series site metrics with Chart.js.

**Backend (`/backend`)** is a FastAPI service exposing a REST API under `/api`. It handles user
registration/login (JWT), project CRUD, site creation (polygon geometry validated and stored as
native PostGIS geometry), and time-series metrics per site. GeoJSON in/out is converted to/from
PostGIS `Geometry(POLYGON, 4326)` via GeoAlchemy2 + Shapely.

**Database** is PostgreSQL with the PostGIS extension enabled, giving us a proper geometry column
type, spatial indexing capability, and room to grow into real spatial queries (e.g. "which sites
intersect this region") without a schema migration.

Both services are independently containerized (`backend/Dockerfile`, `frontend/Dockerfile`) and
orchestrated locally with `docker-compose.yml`. In production they deploy as two separate
services (Render for the API + Postgres, Vercel for the static frontend) — see
[Deployment](#deployment).

## Tech stack

| Layer          | Choice                                   | Why                                                                                   |
| -------------- | ----------------------------------------- | -------------------------------------------------------------------------------------- |
| Frontend       | React 18 + TypeScript + Vite               | Fast dev server, strict typing catches API/shape mismatches early                       |
| Mapping        | Mapbox GL JS + `@mapbox/mapbox-gl-draw`    | Required by the brief; `mapbox-gl-draw` gives polygon drawing/editing for free          |
| Charting       | Chart.js (`react-chartjs-2`)               | Lightweight, good time-series line charts, simpler than Highcharts' licensing for a demo |
| Backend        | FastAPI (Python 3.11)                      | Async-capable, automatic OpenAPI docs, first-class Pydantic validation                  |
| ORM            | SQLAlchemy 2.0 + GeoAlchemy2               | Typed models, and GeoAlchemy2 is the standard PostGIS integration for SQLAlchemy        |
| Auth           | JWT (`python-jose`) + `passlib[bcrypt]`    | Required by the brief; stateless auth, easy to verify on every request                  |
| Database       | PostgreSQL 16 + PostGIS 3.4                 | Required by the brief; native geometry type + spatial indexing                          |
| Migrations     | Alembic                                    | Standard, hand-reviewed migration for the initial schema (see `backend/alembic/`)       |
| Code quality   | ESLint + Prettier (frontend), Ruff + Black (backend) | Automated formatting & linting, enforced in CI and pre-commit                  |
| Pre-commit     | Husky + lint-staged                        | Required by the brief; blocks badly formatted/linted code from being committed          |
| CI/CD          | GitHub Actions                              | Required by the brief; lints, type-checks, tests, and builds both apps on every push/PR |
| Deployment     | Render (API + Postgres) / Vercel (frontend) | Free tiers, both support auto-deploy from GitHub                                        |

## Database schema

Four tables, defined in `backend/app/models.py` and created by
`backend/alembic/versions/0001_initial_schema.py`:

```
users
├─ id            varchar(36) PK
├─ email          varchar(255) UNIQUE, indexed
├─ full_name      varchar(255)
├─ hashed_password varchar(255)          -- bcrypt hash, never the plaintext
└─ created_at     timestamptz

projects
├─ id            varchar(36) PK
├─ name           varchar(255)
├─ description    text, nullable
├─ project_type   enum('carbon','biodiversity','mixed')
├─ owner_id       varchar(36) FK -> users.id
├─ created_at     timestamptz
└─ updated_at     timestamptz

sites
├─ id             varchar(36) PK
├─ project_id     varchar(36) FK -> projects.id
├─ name            varchar(255)
├─ description     text, nullable
├─ geom            geometry(POLYGON, 4326)   -- PostGIS, WGS84 lon/lat
├─ area_hectares   float                      -- computed server-side from the polygon
└─ created_at      timestamptz

site_metrics
├─ id             varchar(36) PK
├─ site_id        varchar(36) FK -> sites.id
├─ metric_type    enum('ndvi','carbon_stock_tco2e','biodiversity_index','canopy_cover_pct')
├─ recorded_on    date
└─ value          float
```

**Relationships:** one user → many projects (owner); one project → many sites; one site → many
metric readings (long/narrow time-series table, one row per metric per date, rather than a wide
table with a column per metric — this makes it trivial to add new metric types later without a
migration).

**Ownership & isolation:** every project query is scoped to `owner_id == current_user.id`, so
administrators only ever see their own projects/sites (enforced in `backend/app/routers/*.py`,
verified by `tests/test_projects.py::test_projects_are_scoped_to_owner`).

## Local setup

### Option A — Docker Compose (recommended, fastest)

Requires Docker and a free [Mapbox access token](https://account.mapbox.com/access-tokens/).

```bash
git clone <this-repo-url>
cd Darukaa-Earth
echo "VITE_MAPBOX_TOKEN=pk.your-mapbox-token" > .env
docker compose up --build
```

This starts:

- `db` — PostgreSQL 16 + PostGIS on `localhost:5432`
- `backend` — FastAPI on `http://localhost:8000` (auto-runs Alembic migrations on boot)
- `frontend` — the built React app served by nginx on `http://localhost:5173`

Seed demo data (one demo user, one project, two sites with 12 months of simulated metrics):

```bash
docker compose exec backend python -m app.seed
```

Demo login: `demo@darukaa.earth` / `DarukaaDemo123!`

### Option B — Run services natively

**Backend**

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env   # edit DATABASE_URL if needed

# requires a local Postgres with PostGIS; adjust connection details to match .env
alembic upgrade head
python -m app.seed        # optional demo data
uvicorn app.main:app --reload --port 8000
```

**Frontend** (in a second terminal)

```bash
cd frontend
npm install
cp .env.example .env   # set VITE_MAPBOX_TOKEN
npm run dev
```

The app is now at `http://localhost:5173`, talking to the API at `http://localhost:8000`.

### Root-level tooling (pre-commit hooks)

From the repository root, once:

```bash
npm install   # installs husky + lint-staged and wires up .husky/pre-commit
```

## Running tests

```bash
# Backend — requires a running Postgres+PostGIS (docker compose up db is enough)
cd backend
export DATABASE_URL=postgresql://darukaa:darukaa@localhost:5432/darukaa_test
export JWT_SECRET_KEY=test-secret
pytest -q --cov=app

# Frontend
cd frontend
npm run typecheck
npm run lint
npm run build
```

All of the above are exactly what CI runs — see `.github/workflows/ci.yml`.

## Pre-commit hooks & code quality

Two automated layers enforce code quality:

1. **Husky + lint-staged** (`.husky/pre-commit`, `.lintstagedrc.frontend.json`,
   `.lintstagedrc.backend.json`) run on every `git commit`, only against staged files:
   - Frontend `*.ts,*.tsx,*.js,*.jsx` → `prettier --write` then `eslint --fix --max-warnings=0`
   - Frontend `*.css` → `prettier --write`
   - Backend `*.py` → `black` then `ruff check --fix`

   A commit is blocked if a fix can't be auto-applied (e.g. an ESLint error that isn't
   auto-fixable). This requires `backend`'s dev dependencies (`ruff`, `black`) to be installed and
   on `PATH` locally — see [Local setup](#local-setup).

2. **GitHub Actions CI** (below) re-runs the same checks (plus type-checking and the full test
   suite) on every push/PR, so a contributor can't bypass hooks with `--no-verify` and still merge.

## CI/CD pipeline

`.github/workflows/ci.yml` defines two independent jobs that run in parallel on every push and
pull request to `main`:

**`backend`**

1. Spins up a `postgis/postgis:16-3.4` service container (real PostGIS, not a mock).
2. Installs `backend/requirements-dev.txt`.
3. `ruff check app tests` — lint.
4. `black --check app tests` — formatting gate.
5. `alembic upgrade head` — proves the migration applies cleanly to a fresh database.
6. `pytest -q --cov=app` — the full test suite (auth, project CRUD, site/polygon creation,
   ownership isolation) against the real PostGIS instance.

**`frontend`**

1. `npm ci` — deterministic install from `package-lock.json`.
2. `npm run lint` — ESLint, zero warnings allowed.
3. `npm run format:check` — Prettier check (no unformatted files).
4. `npm run build` — `tsc --noEmit` type-check followed by the production Vite build.

`.github/workflows/deploy.yml` runs after `CI` completes successfully on `main` and pings Render's
and Vercel's deploy hooks (if the corresponding repo secrets are configured). In practice, Render
and Vercel both auto-deploy directly from GitHub pushes once connected to the repo, so this
workflow exists to make the "deploy only after CI is green" gate explicit rather than relying on
each platform's own (CI-unaware) auto-deploy.

## Deployment

**Backend + database → Render**, using `render.yaml` (Render "Blueprint"):

1. Push this repo to GitHub and create a new Render Blueprint pointing at it.
2. Render provisions a free PostGIS-enabled Postgres instance and a Docker web service built from
   `backend/Dockerfile`.
3. `JWT_SECRET_KEY` is auto-generated by Render; `DATABASE_URL` is wired automatically from the
   managed database. Update `CORS_ORIGINS` to your actual Vercel URL once you have it.
4. The container's `CMD` runs `alembic upgrade head` before starting `uvicorn`, so every deploy
   migrates the database automatically.

**Frontend → Vercel**, using `frontend/vercel.json`:

1. Import the repo into Vercel, set the project root to `frontend/`.
2. Set environment variables `VITE_API_BASE_URL` (your Render backend URL) and
   `VITE_MAPBOX_TOKEN`.
3. Vercel auto-deploys on every push to `main`.

Both platforms' free tiers are sufficient for this demo. Cold starts on Render's free web service
tier (spins down after inactivity) are a known trade-off — acceptable for a take-home demo, not
for production traffic.

## Data sources

There's no existing carbon/biodiversity monitoring API included in the brief, so site metrics
(NDVI, carbon stock, biodiversity index, canopy cover) are **simulated**: when a site is created,
`backend/app/routers/sites.py::_seed_mock_metrics` deterministically generates 12 months of
plausible values (seasonal sine-wave variation plus a slow upward trend, seeded from the site's
ID so results are stable across reloads). This was the fastest way to get *realistic-looking,
reproducible* time-series data without depending on an external API key (e.g. Sentinel Hub /
Google Earth Engine) that a reviewer wouldn't have credentials for. The demo project's two site
polygons are real coordinates bordering Rajaji National Park, India, chosen only as a plausible,
recognizable location for a reforestation project — not sourced from an actual dataset.

In a production version, `_seed_mock_metrics` would be replaced by a scheduled job pulling NDVI
from a satellite imagery provider and field-survey data for biodiversity counts.

## Trade-offs & design decisions

- **String UUIDs over Postgres-native `UUID` columns.** IDs are generated as Python `uuid4` strings
  and stored as `varchar(36)`, not the Postgres `UUID` type. This avoids a driver-level type-cast
  mismatch between SQLAlchemy's ORM layer and raw Alembic-created columns, and keeps ID handling
  identical across SQLite-based unit tests (if ever added) and Postgres.
- **Chart.js over Highcharts.** The brief allows either. Chart.js is dependency-light, has no
  licensing considerations for commercial use, and its line chart is sufficient for the four
  time-series metrics tracked per site. Highcharts would be preferable for more advanced chart
  types (e.g. combination or annotated charts) if the product grew.
- **Long/narrow `site_metrics` table.** One row per `(site, metric_type, date)` rather than a wide
  table with a column per metric. Slightly more rows, but adding a fifth or sixth metric type
  later is a data change, not a schema migration.
- **JWT in `localStorage`, not an httpOnly cookie.** Simpler to implement for a demo and works
  cleanly across the Vercel/Render cross-origin split without cookie `SameSite`/CORS complications.
  A production system handling sensitive data would move to httpOnly cookies + CSRF protection.
- **Single-container docker-compose bind mount for the backend.** `docker-compose.yml` bind-mounts
  `./backend` into the container for live-reload convenience during local development; the
  production Render deploy uses the built image instead.
- **No refresh tokens.** Access tokens are valid for 24 hours (`JWT_EXPIRE_MINUTES=1440`), which is
  simple and adequate for a demo/reviewer session; a production system would add short-lived
  access tokens plus a refresh flow.
