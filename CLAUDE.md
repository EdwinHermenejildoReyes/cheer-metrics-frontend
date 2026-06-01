# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

Monorepo with two independent git repos:

```
cheer-metrics/
├── cheer-metrics-backend/   # Django REST API
└── cheer-metrics-frontend/  # Next.js App Router
```

## Backend (cheer-metrics-backend)

**Stack:** Python 3.13, Django 5.2, Django REST Framework, SimpleJWT, Djoser, PostgreSQL 17, Gunicorn, Whitenoise

Django settings live in `config/settings.py`; root URLs in `config/urls.py`. All app code is under `apps/`. The project uses `uv` for dependency management (`pyproject.toml` + `uv.lock`).

### Commands

```bash
# Development
python manage.py runserver

# Database
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser

# Tests
python manage.py test
python manage.py test <app_name>        # single app
python manage.py test <app>.<TestClass> # single test class

# Dependencies (use uv, not pip directly)
uv sync
uv add <package>
```

### Django Apps

| App | Responsibility |
|-----|---------------|
| `apps.core` | Custom User model (email-based, no username), `UserRole` choices (judge/athlete/coach), `CookieJWTAuthentication` class, `BaseModel`, `EmailService` |
| `apps.api` | All DRF ViewSets, serializers, permission classes, and URL routers (single entry point for all endpoints) |
| `apps.competitions` | Domain models: Organization, Competition, Division, Gym, Team, Registration, ScoreSheet, JudgeAssignment, Deduction; also contains all scoring constants (`FIELD_MAXIMA`, `DEDUCTION_AMOUNTS`, `SCORING_SYSTEM_CONFIG`) |
| `apps.athletes` | Athlete model, TeamMembership, age calculation and eligible age-group logic |

### Key Patterns

**BaseModel** — All domain models inherit from `apps.core.models.BaseModel`, which provides `created_at`, `updated_at`, `created_by`, `updated_by` (via django-currentuser), `is_active`, and `is_enable`.

**Auth** — JWT stored in httpOnly cookies (`access`, `refresh`). `CookieJWTAuthentication` in `apps.core.authentication` reads the token from the cookie instead of the Authorization header. Never send tokens in response bodies or localStorage. SimpleJWT: 30-min access, 7-day refresh with rotation.

**User approval flow** — After registration users have `is_approved=False` and are redirected to `/pending`. An admin must approve them via `POST /api/v1/users/<id>/approve/` before they can access the app.

**API** — All endpoints are under `/api/v1/`. Djoser handles `/api/v1/auth/` (register, password reset). Custom views handle login, token refresh, logout (cookie management). Default DRF pagination: 25 items/page with `DjangoFilterBackend`.

**Scoring config** — `apps.competitions.models` is the canonical source for scoring: `FIELD_MAXIMA` (max per field), `DEDUCTION_AMOUNTS` (unit penalty per type), and `SCORING_SYSTEM_CONFIG` (which fields are active for each `ScoringSystem`). `Division.suggest_scoring_system(skill_level, age_group, category)` maps a division's attributes to a `ScoringSystem` choice. The frontend mirrors this in `src/lib/scoringConfig.ts` — keep both in sync when changing scoring rules.

**ScoreSheet computed properties** — `ScoreSheet` stores raw field values. All totals are computed properties: `building_total`, `tumbling_total`, `overall_total`, `avg_creativity`, `avg_showmanship`, `cross_sheet_total`, `raw_score`, `scaled_score`, `total_deductions`, `final_score`, `percentage`. Creativity and showmanship are averaged across all three judges, not summed — their effective max contribution to the total is 2.00 each regardless of how many judges scored them.

**Deduction auto-save** — `Deduction.save()` automatically sets `unit_amount` and `total_amount` from `DEDUCTION_AMOUNTS[deduction_type]`. Never set these fields manually.

**Email (dev)** — Mailpit captures outbound email. UI at `http://localhost:8026`; SMTP on port `8025`.

**Media files** — User-uploaded files are served by Nginx at `/media/`. Static files are served by Whitenoise.

**Debugpy** — Available on port `5679` inside Docker for remote Python debugging.

**Local settings** — `config/settings.py` tries `from .local_settings import *` at the end; create `config/local_settings.py` to override settings for local dev without modifying the committed file.

## Frontend (cheer-metrics-frontend)

**Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Redux Toolkit + Redux Saga, React Hook Form + Zod, Axios

Path alias: `@/*` → `src/*`

> **Important:** This Next.js version has breaking changes from older releases. APIs, conventions, and file structure may differ from training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing unfamiliar Next.js code.

### Commands

```bash
npm run dev      # dev server (port 3001 in Docker)
npm run build    # production build
npm run lint     # ESLint
npm test         # tests
```

### Key Patterns

**API calls** — All calls go through the Axios instance in `src/services/api.ts` (`withCredentials: true`). The interceptor in `src/services/interceptor.ts` handles 401s by refreshing the JWT cookie and replaying the queued request. Never use `fetch` for authenticated endpoints.

**Repository layer** — `src/repositories/` wraps all API calls (one file per domain). Add new API methods here, not directly in components.

**State management** — Redux Toolkit + Redux Saga for async flows. Auth state lives in `src/store/auth/slices.ts`; sagas in `src/store/athletes.ts` and `src/store/competitions.ts`. Prefer repositories + local state for simple reads; use Redux for cross-cutting state (auth, complex competition flow).

**Branding** — `src/contexts/BrandingContext.tsx` provides organization colors and logo, consumed by layout components.

**Route groups** — `src/app/(dashboard)/` is the protected layout group for all authenticated pages. Public routes (`/login`, `/register`, `/pending`) live outside this group.

**Score sheets** — Deep route: `/competitions/[id]/divisions/[divisionId]/sheets/[regId]/{building,tumbling,overall,partner-stunt,deducciones}`. Each sheet type is its own page but shares the scoring config from `src/lib/scoringConfig.ts`.

**Server vs. Client Components** — Prefer Server Components by default; use `"use client"` only when interactivity or browser APIs are required.

## Infrastructure

**Docker Compose** orchestrates all services. **Nginx** listens on port **8006** and acts as reverse proxy:
- `/api/*` and `/admin/*` → Django (Gunicorn, 3 workers)
- `/media/*` → uploaded media files
- `/*` → Next.js
- Django static files served by Whitenoise (not Nginx)

### Commands

```bash
docker compose up -d                                    # start all
docker compose down                                     # stop all
docker compose logs -f                                  # stream logs
docker compose logs -f backend                          # backend only
docker compose exec backend python manage.py migrate    # run migrations in container
docker compose exec backend python manage.py createsuperuser
```

## Architecture Overview

```
Browser → Nginx :8006
              ├── /api/, /admin/  → Gunicorn → Django (DRF)
              │                              └── Whitenoise (static)
              ├── /media/         → uploaded files
              └── /*              → Next.js (App Router)

Django ↔ PostgreSQL 17
Mailpit (dev email) :8026
```

- The backend exposes a pure REST API; Django renders no frontend pages.
- Cookie-based JWT means CSRF protection must be active for mutating endpoints (SameSite=Lax).
