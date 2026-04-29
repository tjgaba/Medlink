# MedLink Dashboard - Public Clinic Triage

MedLink is a public clinic triage platform made of an ASP.NET Core backend, a React admin dashboard, and a Flutter field app. The backend owns authentication, case records, staff assignment, escalation, audit history, payroll/read-only reporting, SignalR notifications, and PostgreSQL persistence.

The React dashboard is intended for admin users. The Flutter app is intended for mobile/field use by admins, doctors, nurses, and paramedics.

## Project Structure

```text
Triage/
  .github/
    workflows/
      ci.yml
  backend/
    HealthcareTriage.sln
    HealthcareTriage.API/
    HealthcareTriage.Application/
    HealthcareTriage.Domain/
    HealthcareTriage.Infrastructure/
    HealthcareTriage.Shared/
    Dockerfile
    docker-compose.yml
  database/
    seed_prompt16.sql
    seed_prompt16_chunk_01_base.sql
    seed_prompt16_chunk_02_cases.sql
    verify_prompt16_counts.sql
  frontend/
    src/
    package.json
    vite.config.js
  flutter/
    lib/
    test/
    android/
    ios/
    web/
    windows/
    pubspec.yaml
  README.md
```

`System-prompt/` contains local planning and assignment reference material. It is intentionally ignored by Git and should not be committed.

## Requirements

- .NET 8 SDK
- Node.js 20+
- Flutter SDK
- PostgreSQL 16 or Docker Desktop
- Git for Windows is useful for the local OpenSSL SMTP fallback configured by the backend

## Quick Start

Start the backend:

```powershell
cd backend
dotnet restore HealthcareTriage.sln
dotnet build HealthcareTriage.sln
dotnet run --project HealthcareTriage.API --launch-profile http
```

The backend listens on `http://localhost:5043` in the local HTTP profile.

Start the React dashboard:

```powershell
cd frontend
npm ci
npm run dev
```

The Vite dev server normally opens on `http://localhost:5173`.

Start the Flutter app:

```powershell
cd flutter
flutter pub get
flutter run -d chrome --dart-define=API_BASE_URL=http://localhost:5043/api
```

For Android emulator runs, the Flutter default API base URL is `http://10.0.2.2:5043/api`.

## Configuration

Backend configuration lives in `backend/HealthcareTriage.API/appsettings.json` and `appsettings.Development.json`.

Important configuration sections:

- `ConnectionStrings:DefaultConnection` for PostgreSQL.
- `Jwt:Key` and `Jwt:TokenLifetimeMinutes` for API authentication.
- `Email:Smtp:*` for escalation email delivery.

Keep real SMTP passwords in local .NET user-secrets, not in committed JSON files:

```powershell
cd backend/HealthcareTriage.API
dotnet user-secrets set "Email:Smtp:Password" "<gmail-app-password>"
```

The React dashboard uses `frontend/.env.example` as its environment template:

```text
VITE_API_BASE_URL=http://localhost:5043/api
```

## CI

The GitHub Action in `.github/workflows/ci.yml` runs on `main` and `master`. It performs:

- Backend restore and Release build.
- Frontend dependency install and production build.
- Flutter dependency install and formatting check.

## Data

The backend applies EF Core migrations automatically in Development. Additional SQL seed scripts are kept under `database/` for larger simulation datasets and verification counts.

