# MedLink Backend

The backend is an ASP.NET Core 8 Web API using EF Core Code First with PostgreSQL. It handles JWT authentication, role checks, triage cases, assignment, delegation, fatigue/cooldown decisions, ETA, audit logs, payroll reporting, SignalR notifications, escalation email, and resilience/error handling.

## Solution Structure

```text
backend/
  HealthcareTriage.sln
  HealthcareTriage.API/
    Controllers/
    DTOs/
    Hubs/
    Middleware/
    Program.cs
    appsettings.json
    appsettings.Development.json
  HealthcareTriage.Application/
    Assignment/
    Audit/
    Authentication/
    Compliance/
    Delegation/
    DependencyInjection/
    ETA/
    Fatigue/
    Notifications/
    Payroll/
    Resilience/
  HealthcareTriage.Domain/
    Entities/
    Enums/
  HealthcareTriage.Infrastructure/
    Audit/
    Authentication/
    Delegation/
    DependencyInjection/
    Notifications/
    Payroll/
    Persistence/
      Configurations/
      Migrations/
  HealthcareTriage.Shared/
  Dockerfile
  docker-compose.yml
```

## Projects

- `HealthcareTriage.API` exposes HTTP controllers, SignalR hubs, DTO contracts, middleware, Swagger, CORS, JWT auth, and app startup.
- `HealthcareTriage.Application` contains feature services and interfaces for core workflow behavior.
- `HealthcareTriage.Domain` contains entities and enums used by the business model.
- `HealthcareTriage.Infrastructure` contains EF Core persistence, service implementations, SMTP delivery, auth persistence, and migrations.
- `HealthcareTriage.Shared` is reserved for shared cross-layer types when needed.

## Run Locally

```powershell
dotnet restore HealthcareTriage.sln
dotnet build HealthcareTriage.sln
dotnet run --project HealthcareTriage.API --launch-profile http
```

Local HTTP runs on:

```text
http://localhost:5043
```

Swagger is enabled in Development.

## Database

The default local connection string points to PostgreSQL:

```text
Host=localhost;Port=5432;Database=healthcare_triage;Username=postgres;Password=postgres
```

In Development, `Program.cs` calls `Database.Migrate()`, so EF Core migrations are applied when the API starts.

To run PostgreSQL and the API with Docker Compose:

```powershell
docker compose up --build
```

The Compose API port is `8080`; the local `dotnet run` profile uses `5043`.

## Secrets

Do not commit real SMTP credentials or production JWT keys. Use local .NET user-secrets for private values:

```powershell
cd HealthcareTriage.API
dotnet user-secrets set "Email:Smtp:Password" "<gmail-app-password>"
dotnet user-secrets set "Jwt:Key" "<long-local-development-secret>"
```

## Main API Areas

- `AuthController` handles login and registration.
- `CasesController` handles triage cases, profile updates, status transitions, cancellation, completion, and escalation.
- `StaffController` handles staff directory, staff updates, and workload/case history views.
- `DelegationController` handles delegation requests and approvals.
- `PayrollController` exposes read-only payroll tracking.
- `EtaController` exposes ETA calculations.
- `NotificationsHub` broadcasts live dashboard/mobile updates through SignalR.

