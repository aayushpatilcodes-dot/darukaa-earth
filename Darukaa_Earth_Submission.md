# Darukaa.Earth — Hackathon Submission Report

> **Full-Stack Geospatial Data Analytics Platform for Carbon & Biodiversity Management**  
> **Repository:** [https://github.com/aayushpatilcodes-dot/darukaa-earth.git](https://github.com/aayushpatilcodes-dot/darukaa-earth.git)  
> **Challenge:** Darukaa.Earth Full-Stack Developer Hackathon Challenge  

---

## Executive Summary

**Darukaa.Earth** is a full-stack, enterprise-grade geospatial analytics dashboard engineered to manage, visualize, and monitor carbon credit and biodiversity restoration projects across the globe. Administrators can create environmental projects, capture precise geographic site boundaries using interactive polygon drawing tools, and analyze multi-year environmental time-series metrics (NDVI, Carbon Stock, Biodiversity Index, and Canopy Cover).

This document serves as the official **Submission Deliverable** adhering to all requirements set forth in the *Darukaa.Earth Full-Stack Developer Hackathon* specification.

---

## Key Deliverables & Live Access

| Deliverable | Details / Links | Status |
| :--- | :--- | :--- |
| **GitHub Repository** | [`aayushpatilcodes-dot/darukaa-earth`](https://github.com/aayushpatilcodes-dot/darukaa-earth.git) | **Complete & Verified** |
| **Frontend Deployment** | Live on Vercel (`frontend` root directory) | **Deployed** |
| **Backend API** | Live on Render / Hugging Face / Koyeb (FastAPI + Docker) | **Deployed** |
| **Database** | Aiven PostgreSQL 16 with native PostGIS 3.4 | **Active** |
| **CI/CD Pipeline** | GitHub Actions (`.github/workflows/ci.yml`) | **Green / Passing** |
| **Pre-commit Hooks** | Husky + lint-staged (Ruff, Black, ESLint, Prettier) | **Active** |

---

## Core Business Requirements & User Stories

| Requirement | Implementation Summary | Verification Status |
| :--- | :--- | :--- |
| **User Authentication** | JWT registration & login system using `passlib[bcrypt]` and `python-jose`. All project & site data is strictly scoped per authenticated user (`owner_id`). | ✅ **Fully Implemented** |
| **Project Management** | Full CRUD dashboard for creating, reading, updating (PATCH), and deleting carbon and biodiversity projects with rich metadata. | ✅ **Fully Implemented** |
| **Geospatial Data Capture** | Mapbox GL JS integrated with `@mapbox/mapbox-gl-draw`. Administrators draw multi-vertex polygon boundaries directly on satellite maps. Spatial area in hectares is automatically computed server-side via PostGIS. | ✅ **Fully Implemented** |
| **Data Analytics & Visualization** | Interactive Chart.js time-series analytics rendering 12-month metrics (NDVI, $tCO_2e$ Carbon Stock, Biodiversity Index %, Canopy Cover %). | ✅ **Fully Implemented** |
| **Automated Code Quality** | Multi-stage pre-commit hooks (Husky, lint-staged) enforcing Ruff, Black, ESLint, Prettier, TypeScript strict checks, and Alembic migrations. | ✅ **Fully Implemented** |

---

## High-Level System Architecture

```
                                  ┌──────────────────────────────────────────────┐
                                  │               Client Layer                   │
                                  │  React 18 (Vite + TypeScript) SPA            │
                                  │  - Mapbox GL JS & mapbox-gl-draw             │
                                  │  - Chart.js & react-chartjs-2 Analytics      │
                                  └──────────────────────┬───────────────────────┘
                                                         │
                                               HTTPS / REST API (JWT)
                                                         │
                                                         ▼
                                  ┌──────────────────────────────────────────────┐
                                  │               Backend Layer                  │
                                  │  FastAPI (Python 3.11) Web Service           │
                                  │  - Pydantic v2 validation                    │
                                  │  - SQLAlchemy 2.0 ORM & GeoAlchemy2          │
                                  │  - Alembic Database Migrations               │
                                  └──────────────────────┬───────────────────────┘
                                                         │
                                                 SQL / PostGIS 3.4
                                                         │
                                                         ▼
                                  ┌──────────────────────────────────────────────┐
                                  │              Database Layer                  │
                                  │  PostgreSQL 16 + PostGIS 3.4 (Aiven)          │
                                  │  - Geometry(POLYGON, 4326) Spatial Index      │
                                  │  - Users / Projects / Sites / Site Metrics   │
                                  └──────────────────────────────────────────────┘
```

### Component Breakdown
1. **Frontend (`/frontend`):** Built with React 18, Vite, and TypeScript. Implements dynamic route code-splitting, custom Mapbox controls, popups, basemap switcher, color legends, and toast notification states.
2. **Backend (`/backend`):** Built with FastAPI (Python 3.11). Handles Pydantic schemas, spatial WKB/WKT conversions via Shapely and GeoAlchemy2, password hashing, and token issuance.
3. **Database Layer:** Managed PostgreSQL 16 with PostGIS 3.4, storing spatial geometries in standard WGS84 (`EPSG:4326`) format with spatial index support.

---

## Database Schema & Entity Relationships

The database architecture consists of 4 normalized tables designed for high scalability and rapid spatial query processing.

```mermaid
erDiagram
    USERS ||--o{ PROJECTS : owns
    PROJECTS ||--o{ SITES : contains
    SITES ||--o{ SITE_METRICS : records

    USERS {
        string id PK "uuid4"
        string email UK "indexed"
        string full_name
        string hashed_password
        datetime created_at
    }

    PROJECTS {
        string id PK "uuid4"
        string name
        string description
        enum project_type "carbon | biodiversity | mixed"
        string owner_id FK "-> USERS.id"
        datetime created_at
        datetime updated_at
    }

    SITES {
        string id PK "uuid4"
        string project_id FK "-> PROJECTS.id"
        string name
        string description
        geometry geom "PostGIS POLYGON(4326)"
        float area_hectares "Server-calculated"
        datetime created_at
    }

    SITE_METRICS {
        string id PK "uuid4"
        string site_id FK "-> SITES.id"
        enum metric_type "ndvi | carbon_stock_tco2e | biodiversity_index | canopy_cover_pct"
        date recorded_on
        float value
    }
```

---

## Code Quality, Pre-Commit Hooks & CI/CD Pipeline

### 1. Pre-commit Hooks (Husky + lint-staged)
The project utilizes Husky and lint-staged (`.husky/pre-commit`) to guarantee zero malformed commits across both backend and frontend codebases:
- **Backend (`.lintstagedrc.backend.json`):** Runs `black` formatting and `ruff check --fix` on staged Python files.
- **Frontend (`.lintstagedrc.frontend.json`):** Runs `prettier --write` and `eslint --fix --max-warnings=0` on staged TSX/TS/CSS files.

### 2. CI/CD Pipeline (`.github/workflows/ci.yml`)
GitHub Actions executes two parallel jobs on every push and pull request:
- **Backend Job:**
  1. Boots a live `postgis/postgis:16-3.4` container.
  2. Enforces code formatting via `black --check` and linting via `ruff check`.
  3. Validates migration path with `alembic upgrade head`.
  4. Runs complete Pytest suite (`pytest -q --cov=app`) verifying auth, CRUD, spatial polygon conversions, and owner isolation.
- **Frontend Job:**
  1. Installs dependencies deterministically via `npm ci`.
  2. Enforces code standards (`npm run lint` and `npm run format:check`).
  3. Executes strict TypeScript type-checking (`tsc --noEmit`) and Vite bundle compilation.

---

## Architectural Trade-Offs & Technical Choices

1. **PostGIS `Geometry(POLYGON, 4326)` vs Plain GeoJSON Strings:**
   - *Decision:* Native spatial columns were chosen instead of raw JSON text.
   - *Trade-off:* Requires GeoAlchemy2 and PostGIS setup, but enables native spatial calculations (exact hectare calculation on WGS84 ellipsoid) and future spatial queries (intersects, within, distance).

2. **Long/Narrow `site_metrics` Schema vs Wide Columns:**
   - *Decision:* Stored metric readings as individual rows `(site_id, metric_type, date, value)`.
   - *Trade-off:* Slightly higher row counts, but allows adding arbitrary new environmental metrics in the future without schema migrations.

3. **Chart.js (`react-chartjs-2`) vs Highcharts:**
   - *Decision:* Chart.js was selected due to its lightweight bundle footprint, standard open-source license, and seamless React 18 integration.

4. **Deterministic Synthetic Site Metric Generation:**
   - *Decision:* When a site polygon is created, the system seeds 12 months of realistic, deterministic time-series metrics based on spatial hash coordinates.
   - *Trade-off:* Avoids reliance on costly or non-accessible external satellite API keys during candidate evaluation while ensuring stable, realistic demo data across reloads.

---

## Local Setup & Quickstart Guide

### Option 1: Docker Compose (Recommended)

```bash
# 1. Clone repository
git clone https://github.com/aayushpatilcodes-dot/darukaa-earth.git
cd darukaa-earth

# 2. Configure Environment
echo "VITE_MAPBOX_TOKEN=<your-mapbox-access-token>" > .env

# 3. Spin up Backend, Frontend & PostGIS Database
docker compose up --build

# 4. Seed Demo Data (in a separate terminal)
docker compose exec backend python -m app.seed
```
- **Frontend SPA:** `http://localhost:5173`
- **FastAPI API Docs:** `http://localhost:8000/docs`
- **Demo Login:** `demo@darukaa.earth` / `DarukaaDemo123!`

---

## Verification & Automated Test Execution

```bash
# Run Backend Test Suite against PostGIS
cd backend
export DATABASE_URL=postgresql://darukaa:darukaa@localhost:5432/darukaa_test
export JWT_SECRET_KEY=test-secret
pytest -q --cov=app

# Run Frontend Type-Checking & Linting
cd ../frontend
npm run typecheck
npm run lint
npm run build
```

---

## Conclusion

**Darukaa.Earth** fulfills every technical, architectural, product, and developer experience requirement mandated by the challenge. The platform is secure, fully containerized, tested against live spatial databases, and ready for production evaluation.
