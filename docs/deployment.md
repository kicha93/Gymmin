# Backend deployment

This document describes the production-ready backend configuration for Gymmin.

## Storage modes

Gymmin has two storage layers:

```text
Gymmin:Storage:Provider = File | Database
Gymmin:Storage:DatabaseProvider = SQLite | PostgreSQL
```

Rules:

- `Provider=File` uses JSON files in `backend/Gymmin.Api/App_Data`.
- `Provider=Database` uses EF Core stores.
- `DatabaseProvider=SQLite` is intended for local development and tests.
- `DatabaseProvider=PostgreSQL` is intended for staging/production and local PostgreSQL smoke tests.

## Environment variables

Production should be configured through environment variables or a secret manager.
Do not commit real secrets or production connection strings.

PowerShell example:

```powershell
$env:ASPNETCORE_ENVIRONMENT = "Production"
$env:Gymmin__Storage__Provider = "Database"
$env:Gymmin__Storage__DatabaseProvider = "PostgreSQL"
$env:Gymmin__Storage__ApplyMigrationsOnStartup = "false"
$env:Gymmin__Storage__ImportAppDataOnStartup = "false"
$env:Gymmin__Diagnostics__Enabled = "false"
$env:ConnectionStrings__DefaultConnection = "Host=...;Database=...;Username=...;Password=..."
$env:OPENAI_API_KEY = "..."
$env:Gymmin__AiCredits__InitialGrant = "3"
$env:Gymmin__AiCredits__PlanCost = "1"
$env:Gymmin__AiCredits__RewriteCost = "1"
$env:Gymmin__AiCredits__DevGrantEnabled = "false"
$env:BugReports__Smtp__Host = "..."
$env:BugReports__Smtp__Port = "587"
$env:BugReports__Smtp__Username = "..."
$env:BugReports__Smtp__Password = "..."
$env:BugReports__Smtp__From = "..."
$env:BugReports__Smtp__To = "..."
```

Password reset email can use `Auth:Smtp` values. If they are not set, the backend falls back to `BugReports:Smtp` where supported by the current sender configuration.

## Local PostgreSQL

Start local PostgreSQL:

```powershell
docker compose -f docker-compose.postgres.yml up -d
```

Development connection string:

```text
Host=localhost;Port=5432;Database=gymmin;Username=gymmin;Password=gymmin-dev-password
```

Run the backend with PostgreSQL:

```powershell
$env:ASPNETCORE_ENVIRONMENT = "Development"
$env:Gymmin__Storage__Provider = "Database"
$env:Gymmin__Storage__DatabaseProvider = "PostgreSQL"
$env:ConnectionStrings__DefaultConnection = "Host=localhost;Port=5432;Database=gymmin;Username=gymmin;Password=gymmin-dev-password"
cd backend/Gymmin.Api
dotnet run
```

The password in `docker-compose.postgres.yml` is dev-only.

If Docker is not available but a local PostgreSQL service is already installed,
you can use that service instead. Create a database manually and use the same
environment variables with the service port/user/password. For isolated smoke
tests on a developer machine, a temporary PostgreSQL cluster created with
`initdb` is also acceptable.

The current EF migrations were originally created against the shared SQLite
schema. Gymmin maps `DateTimeOffset`, `Guid` and boolean values through
text/integer-compatible EF converters so the existing `TEXT`/`INTEGER` columns
work consistently on SQLite and PostgreSQL.

## Migrations

Development may use:

```powershell
$env:Gymmin__Storage__ApplyMigrationsOnStartup = "true"
```

Production should keep it disabled:

```powershell
$env:Gymmin__Storage__ApplyMigrationsOnStartup = "false"
```

Run migrations explicitly before starting a production instance:

```powershell
cd backend/Gymmin.Api
dotnet tool restore
dotnet tool run dotnet-ef database update
```

For PostgreSQL migrations, set `Gymmin__Storage__Provider`, `Gymmin__Storage__DatabaseProvider` and `ConnectionStrings__DefaultConnection` before running `dotnet-ef`.

No migration was added for PostgreSQL provider wiring because the EF model did not change in this step.

## Health and diagnostics

`GET /health` stays simple and fast:

```json
{ "status": "ok" }
```

`GET /api/health` includes safe storage information:

```json
{
  "status": "ok",
  "storageProvider": "Database",
  "databaseProvider": "PostgreSQL",
  "database": {
    "configured": true,
    "canConnect": true
  }
}
```

`GET /api/diagnostics` also includes the safe database status. It does not expose connection strings, passwords or API keys.

Diagnostics is available in development/testing. In production it requires explicit `Gymmin:Diagnostics:Enabled=true`, and startup logs a warning if this is enabled.

## Startup validation

The backend fails fast when:

- `Gymmin:Storage:Provider` is not `File` or `Database`,
- `Gymmin:Storage:Provider=Database` and `ConnectionStrings:DefaultConnection` is empty,
- `Gymmin:Storage:DatabaseProvider` is not `SQLite` or `PostgreSQL`.

The backend logs warnings when:

- `ApplyMigrationsOnStartup=true` in Production,
- diagnostics are enabled in Production,
- SMTP settings are incomplete,
- OpenAI API key is missing.

Missing SMTP or OpenAI configuration does not block startup. Affected features fail with their own errors until configured.

## Production checklist

- `ASPNETCORE_ENVIRONMENT=Production`.
- `Gymmin:Storage:Provider=Database`.
- `Gymmin:Storage:DatabaseProvider=PostgreSQL`.
- Production connection string supplied by environment variable or secret manager.
- Migrations run explicitly before app startup.
- `ApplyMigrationsOnStartup=false`.
- SMTP configured for bug reports and password reset.
- OpenAI API key configured if AI creator should work.
- AI credits configured: initial grant, plan/rewrite cost and `DevGrantEnabled=false` in Production.
- Diagnostics disabled or protected.
- HTTPS / reverse proxy configured.
- CORS configured intentionally for the deployed mobile/backend setup.
- Auth rate limiting enabled.
- Logs collected by the hosting platform.
- Database backups configured.
- APK built with the production `ApiBaseUrl`.
- `/health` and `/api/diagnostics` verified after deployment.

## Manual PostgreSQL smoke test

1. Start PostgreSQL:

   ```powershell
   docker compose -f docker-compose.postgres.yml up -d
   ```

2. If Docker is unavailable, use an installed local PostgreSQL instance or a
   temporary local cluster on another port.
3. Set PostgreSQL environment variables.
4. Run `dotnet tool run dotnet-ef database update`.
5. Start the backend.
6. Verify:

   - `GET /health`,
   - `GET /api/health`,
   - register/login,
   - settings PUT/GET,
   - workouts POST/GET,
   - favorite exercises sync,
   - workout sessions sync,
   - auth sessions list,
   - password reset request with SMTP warning/fake configuration behavior.

## TODO

- Choose real hosting.
- Configure production DB backups.
- Add production log aggregation.
- Add external error/crash monitoring.
- Add HTTPS/reverse proxy deployment notes for the selected host.
- Add CI/CD migration step.
- Add optional PostgreSQL smoke test in CI when a stable service container is available.
- Stage 12B: add Google Play Billing, backend receipt validation, purchase restore/pending purchase handling and anti-duplicate purchase crediting.
