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
| `apps.core` | Custom User model (email-based, no username), `UserRole` choices (`org_admin/judge/athlete/coach`), `CookieJWTAuthentication` class, `BaseModel`, `PlatformSettings` (singleton branding colors, `.load()` returns pk=1) |
| `apps.api` | All DRF ViewSets, serializers, permission classes, and URL routers (single entry point for all endpoints) |
| `apps.competitions` | Domain models: Organization, Competition, Division, Gym, Team, Registration, RegistrationStaff, ScoreSheet, JudgeAssignment, Deduction, FanPackage, FanPackageLine, GymInvoice, AthleteInvoiceLine, TeamInvoiceLine, HeroImage, RegistrationToken; all scoring constants (`FIELD_MAXIMA`, `DEDUCTION_AMOUNTS`, `SCORING_SYSTEM_CONFIG`) |
| `apps.athletes` | Athlete model, TeamMembership, age calculation and eligible age-group logic |

### Key Patterns

**BaseModel** — All domain models inherit from `apps.core.models.BaseModel`, which provides `created_at`, `updated_at`, `created_by`, `updated_by` (via django-currentuser), `is_active`, and `is_enable`.

**Auth** — JWT stored in httpOnly cookies (`access`, `refresh`). `CookieJWTAuthentication` in `apps.core.authentication` reads the token from the cookie instead of the Authorization header. Never send tokens in response bodies or localStorage. SimpleJWT: 30-min access, 7-day refresh with rotation.

**User approval flow** — After registration users have `is_approved=False` and are redirected to `/pending`. An admin must approve them via `POST /api/v1/users/<id>/approve/` before they can access the app.

**API** — All endpoints are under `/api/v1/`. Djoser handles `/api/v1/auth/` (register, password reset). Custom views (not Djoser) handle `/api/v1/auth/login/`, `/api/v1/auth/token/refresh/`, and `/api/v1/auth/logout/` for cookie management. Default DRF pagination: 25 items/page with `DjangoFilterBackend`.

**Permission classes** — `apps.api.permissions` defines four classes: `IsApproved` (rejects unapproved accounts — applied as default on most ViewSets), `IsStaffOrOrgAdmin` (allows `is_staff=True` or `role=org_admin`), `IsOwnerOrAdmin` (allows admins or the object's `created_by` user), and `IsActiveJudgeForCompetition`. Judge access is determined by `JudgeAssignment.access_from` / `access_until` timestamps when set; falls back to `Competition.is_active` when both are null. The canonical logic is `_is_judge_access_active()` in `apps/api/permissions.py`.

**Multi-tenancy** — `User.organization` is a FK to `Organization`. The `_org_id(user)` helper in `apps/api/views.py` returns `None` for `is_staff` users (they see all data) and `user.organization_id` for everyone else; ViewSet querysets filter by this. When adding new ViewSets, apply the same `_org_id` scoping to `get_queryset()`.

**Sheet mode** — `Competition.sheet_mode` (`grupal` | `individual`) controls which judge sheet tabs are shown. `grupal` shows `building`, `tumbling`, `overall`, `rangos`, `deducciones`, `deductions_only`, and `safety_rules`; `individual` shows `partner_stunt`, `building_difficulty`, `building_execution`, `tumbling_difficulty`, and `tumbling_execution`. These groupings are defined in `src/types/competitions.ts` as `GRUPAL_SHEET_TYPES` / `INDIVIDUAL_SHEET_TYPES`. The `JudgeAssignment.sheet_type` field ties a judge to a specific `SheetType` choice. When adding new sheet types, update both `SheetType` choices in `apps/competitions/models.py` and both frontend constants.

**ScoreSheet auto-creation** — A post-save signal in `apps/competitions/signals.py` automatically calls `ScoreSheet.objects.get_or_create(registration=instance)` whenever a `Registration` transitions to `confirmed` status. Never create ScoreSheets manually for confirmed registrations.

**Billing** — `Competition.team_fee` (flat per team), `Division.athlete_fee` (per athlete), `Competition.multi_team_discount` (per-athlete discount for athletes competing in 2+ teams), and `Competition.require_payment` (blocks score saving if `GymInvoice.paid` is false) form the billing model. `GymInvoice.generate(competition, gym)` computes line items (`AthleteInvoiceLine`, `TeamInvoiceLine`) from memberships and team registrations. Frontend billing pages: `/competitions/[id]/billing` (all gyms) and `/competitions/[id]/billing/[gymId]` (single gym invoice).

**Public registration wizard** — `/registro?token=...` is a public multi-step form (no auth) that lets coaches self-register a team. It validates a `RegistrationToken` via `GET /api/v1/wizard/validate/?token=...` then creates gym, team, and athlete records through the `wizard/` endpoints. Admins issue tokens from `/competitions/[id]/tokens` (managed via `registration-tokens/` API).

**Scoring config** — `apps.competitions.models` is the canonical source for scoring: `FIELD_MAXIMA` (max per field), `DEDUCTION_AMOUNTS` (unit penalty per type), and `SCORING_SYSTEM_CONFIG` (which fields are active for each `ScoringSystem`). `Division.suggest_scoring_system(skill_level, age_group, category)` maps a division's attributes to a `ScoringSystem` choice. The frontend mirrors this in `src/lib/scoringConfig.ts` — keep both in sync when changing scoring rules.

**ScoreSheet computed properties** — `ScoreSheet` stores raw field values. All totals are computed properties: `building_total`, `tumbling_total`, `overall_total`, `avg_creativity`, `avg_showmanship`, `cross_sheet_total`, `raw_score`, `scaled_score`, `total_deductions`, `final_score`, `percentage`. Creativity and showmanship are averaged across all three judges, not summed — their effective max contribution to the total is 2.00 each regardless of how many judges scored them. The scoring formula is: `final_score = (raw_score + bonus) × multiplier − total_deductions`.

**Competition.is_active** — Overrides `BaseModel.is_active` with custom deadline logic: active until `end_datetime` if set, otherwise until midnight UTC of the day after `date`. Do not rely on the inherited `is_active` field for competitions.

**Deduction auto-save** — `Deduction.save()` automatically sets `unit_amount` and `total_amount` from `DEDUCTION_AMOUNTS[deduction_type]`. Never set these fields manually.

**CSV registration import** — `apps/competitions/importer.py` parses a CSV or XLSX (+ optional ZIP with photos named by athlete CI/cédula) and upserts Gyms, Athletes, Teams, Registrations, and TeamMemberships in per-row atomic transactions. Full command syntax:

```bash
python manage.py import_inscripcion <file> --competition <id> [--fotos-zip <path>] [--dry-run]
python manage.py mark_all_paid --competition <id>   # mark all GymInvoices as paid
```

`tools/generate_inscripcion_template.py` generates a blank CSV template for the import format; a pre-built copy lives at `templates/plantilla_inscripcion.csv` in the repo root. Also triggerable from the frontend page at `/competitions/[id]/import`. Each error row is skipped and accumulated in the result; the import never aborts mid-file unless the competition is not found.

**Scheduler / rest validator** — `apps/competitions/scheduler.py` checks that athletes competing in multiple teams have at least `MIN_REST_GAP = 3` performance slots between appearances. Returns `RestConflict` dataclass instances. The public `/schedule` page (outside the dashboard group) renders the running order and surfaces these conflicts.

**Email (dev)** — Mailpit captures outbound email. UI at `http://localhost:8026`; SMTP on port `8025`.

**Media files** — User-uploaded files are served by Nginx at `/media/`. Static files are served by Whitenoise.

**Debugpy** — Available on port `5679` inside Docker for remote Python debugging.

**Local settings** — `config/settings.py` tries `from .local_settings import *` at the end; create `config/local_settings.py` to override settings for local dev without modifying the committed file.

## Frontend (cheer-metrics-frontend)

**Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Redux Toolkit, React Hook Form + Zod, Axios

Path alias: `@/*` → `src/*`

> **Important:** This Next.js version has breaking changes from older releases. APIs, conventions, and file structure may differ from training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing unfamiliar Next.js code.

### Commands

```bash
npm run dev      # dev server (port 3001 in Docker)
npm run build    # production build
npm run lint     # ESLint
```

### Environment Variables

```
NEXT_PUBLIC_MAIN_API_URL=http://localhost:8006/api/v1/
NEXT_PUBLIC_WEB_URL=http://localhost:3000/
```

### Key Patterns

**API calls** — All calls go through the Axios instance in `src/services/api.ts` (`withCredentials: true`). The interceptor in `src/services/interceptor.ts` handles 401s by refreshing the JWT cookie and replaying the queued request. Never use `fetch` for authenticated endpoints.

**Repository layer** — `src/repositories/` wraps all API calls (one file per domain). Add new API methods here, not directly in components.

**State management** — Redux Toolkit + Redux Saga for global state. The saga middleware is wired in `src/core/store.ts` with `src/core/rootSaga.ts` (currently a stub `yield all([])`). Currently only auth state is implemented (`src/store/auth/slices.ts`). Prefer repositories + local state for simple reads; use Redux for cross-cutting state (auth, complex competition flow).

**Domain types** — `src/types/` is the canonical frontend type source: `competitions.ts` defines `SheetType`, `JudgeAssignment`, `SheetMode`, the `GRUPAL_SHEET_TYPES` / `INDIVIDUAL_SHEET_TYPES` grouping constants, and all enum-like union types (`AgeGroup`, `SkillLevel`, `DeductionType`, etc.); `athletes.ts` defines `Athlete` and `TeamMembership`; `settings.ts` defines `PlatformSettings`. Import types from here rather than redefining them.

**Judge access (frontend)** — `src/hooks/useJudge.ts` combines Redux auth state and `judge_assignments` into convenience helpers: `isAdmin`, `isJudge`, `canViewSheet(competitionId, sheetType)`, `canViewCompetition(competitionId)`, `sheetTypesForCompetition(competitionId)`. Use this hook instead of reading assignments directly from the Redux store.

**Construction tables** — `src/lib/constructionTable.ts` encodes the UCA Ecuador "Tabla de Cantidad en Construcción" rules: `getConstructionGroups(athleteCount)` returns building group thresholds, `getGymGroups(athleteCount)` returns gymnastics group thresholds, and `getCoedStyleGroups(maleCount, skillLevel)` returns Coed-specific style groups. Score sheet pages use these to display the applicable limits to judges.

**Branding** — `src/contexts/BrandingContext.tsx` provides organization colors and logo; `src/contexts/PlatformSettingsContext.tsx` provides global platform palette (`PlatformSettings`). Both are consumed by layout components and loaded in the root layout.

**Route groups** — `src/app/(dashboard)/` is the protected layout group for all authenticated pages. Public routes (`/login`, `/register`, `/pending`) live outside this group.

**Score sheets** — Deep route: `/competitions/[id]/divisions/[divisionId]/sheets/[regId]/<type>`. Group-mode types: `building`, `tumbling`, `overall`, `partner-stunt`, `deducciones`, `rangos`, `iasf-building`, `iasf-tumbling`, `iasf-overall`. Individual-mode split-judge types: `building-difficulty`, `building-execution`, `tumbling-difficulty`, `tumbling-execution`, `safety-rules`, `deductions-only`. Each type is its own page sharing `src/lib/scoringConfig.ts`. Print views live in `src/components/print/`.

**Backstage** — `/competitions/[id]/backstage` is a dashboard-only page for performance check-in: it shows all confirmed registrations with athlete count and performance order, letting staff verify team size against `Registration.athlete_count`.

**Public routes** — `/` (landing with `HeroCarousel`), `/schedule` (running order), `/registro` (self-registration wizard, token-gated), and `/results/[regId]` (public score result for a registration) live outside `(dashboard)/` and require no authentication.

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

## Reference Docs

`docs/regulatory-analysis.md` and `docs/scoring-analysis.md` in the repo root contain detailed UCA Ecuador / IASF rule analysis. Consult them before modifying scoring logic or adding new skill levels / scoring systems.
