# ARCHIVED — Security audit - 2026-07-21

## Scope

The review covered backend authentication and public endpoints, request limits,
avatar uploads, production configuration, mobile credential storage and
transport, repository secrets, Android release settings, build scripts,
GitHub Actions and current npm/NuGet advisories.

## Fixed during the audit

- Production `GET /api/health` now returns only `status=ok` or
  `status=not_ready`. Storage provider, database engine and schema details remain
  available in non-production diagnostics, but are no longer exposed publicly in
  Production. A production integration test prevents regression.
- The two current high-severity npm advisories in transitive build tooling
  (`brace-expansion` and `shell-quote`) were removed with compatible patch-level
  lockfile updates. `npm audit --audit-level=high` passes.
- Every external action in `production-gate.yml` is pinned to an immutable commit
  SHA. Workflow permissions remain read-only and checkout does not persist Git
  credentials.
- The GitHub Release one-click APK script now accepts only an HTTPS backend URL.
  Local developer build helpers remain separate.

## Confirmed protections

- Private API routes derive identity only from a bearer session; the former
  user-id header fallback is absent.
- Session and reset tokens are generated from 256 bits of cryptographic random
  data and stored server-side only as SHA-256 hashes. Passwords use salted
  PBKDF2-SHA256 and comparisons are constant-time.
- Mobile bearer tokens are stored in SecureStore with device-only accessibility;
  the legacy AsyncStorage token is migrated and removed.
- Production startup fails for unsafe diagnostics, automatic migrations, missing
  authentication SMTP, missing required AI configuration, development credit
  grants, non-current schema and (by default) non-PostgreSQL storage.
- Request sizes, upload size/type/magic bytes, collection counts and abuse rates
  are bounded. Database mode shares abuse counters between replicas.
- Android release disables backups, excludes legacy external-storage and overlay
  permissions, requires a non-debug signing key, and enables minification/resource
  shrinking.
- No committed plaintext production secret, private key or release keystore was
  found in the reviewed tree. NuGet reports no known vulnerable packages.

## Accepted and deployment-owned risks

- `npm audit` still reports 10 moderate advisories through Expo's Xcode/config
  toolchain (`uuid` via `xcode`). npm proposes a breaking and invalid Expo
  downgrade from SDK 57 to 46; it was intentionally not applied. The affected
  packages are build-time tooling, not request handling in the installed Android
  application. Recheck on every Expo patch.
- Cloudflare/ngrok endpoints are suitable for private test APKs only. Public
  release must use the stable production HTTPS hostname.
- Certificate pinning is not enabled. TLS termination, HSTS, certificate renewal
  and trusted-proxy configuration must be verified on the deployed environment.
- Final release still requires backup/restore, multi-replica, physical-device and
  Google Play Internal Testing smoke tests plus production monitoring/crash
  reporting.

## Verification

- Backend tests: 106 passed.
- Mobile tests: 251 passed across 51 files.
- Mobile typecheck: passed.
- NuGet vulnerable-package scan: no vulnerable packages.
- npm audit gate: no high or critical vulnerabilities; 10 moderate build-tool
  advisories remain as documented above.
