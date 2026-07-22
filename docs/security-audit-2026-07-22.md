# Security audit - 2026-07-22

## Result

The repository was reviewed after the 2026-07-21 hardening pass. The audit
covered authentication and password recovery, authorization boundaries,
external provider calls, mobile bearer-token handling, input bounds, retained
data, production configuration, Android settings, CI/build scripts, committed
secrets and dependency advisories.

No known critical or high dependency advisory remains. All confirmed
application-level findings described below were fixed during this audit and are
covered by automated tests.

## Findings fixed during the audit

### High - mobile bearer token could follow an external avatar URL

The avatar image source accepted an absolute URL and attached the authenticated
API bearer header to it. A malformed or imported user record could therefore
direct the token to a different origin. Mobile now adds the bearer header only
when the resolved avatar URL has exactly the same origin as the configured API.
External, lookalike and invalid URLs never receive authentication headers.

### High - authentication abuse limits were bypassable by rotating one key

Login and password-reset limits used combined IP/account or IP/token buckets.
An attacker could rotate email addresses or reset tokens to avoid a useful
per-IP ceiling. Login now consumes independent IP and account buckets. Password
reset request and confirmation consume independent IP plus account/token
buckets. Authenticated password changes also have per-user and per-IP limits.
Database storage keeps these counters shared across backend replicas.

### Medium - purchase verification could amplify external requests

An authenticated client could repeatedly trigger Google Play verification. The
endpoint now has independent per-user and per-IP limits. Purchase token and
order-id lengths are bounded consistently in both database and file providers,
preventing oversized payloads from reaching the external validator.

### Medium - provider and internal job errors were exposed

OpenAI non-success response bodies were embedded in exceptions and could reach
logs, persisted job errors and the mobile status response. Provider response
bodies are no longer included in exceptions. Failed creator jobs return a
generic public message while the full exception remains only in server logs.
OpenAI output is also capped through `OpenAI:MaxOutputTokens` (default 12000,
clamped to 1000-32000) to bound cost and response size.

### Medium privacy - completed AI jobs retained sensitive answers indefinitely

Workout-creator jobs can contain health and training-profile answers in request
and result JSON. The production retention worker now removes completed and
failed jobs after `Gymmin:DataRetention:WorkoutCreatorJobDays` (default 90 days,
clamped to 7-365). Queued and processing jobs are not removed.

### Low - registration name exceeded the database contract

Registration accepted a display name longer than the database's 200-character
column. Both storage providers now reject empty names and names over 200
characters before persistence, avoiding a database exception and generic 500.

## Confirmed protections

- Private resources derive identity from the bearer session and enforce resource
  ownership; the legacy user-id header is not an authentication path.
- Session and password-reset tokens use cryptographic randomness and are stored
  server-side only as hashes. Passwords use salted PBKDF2-SHA256.
- Mobile auth tokens use OS SecureStore and are not placed in AsyncStorage.
- Production startup rejects unsafe storage, diagnostics, automatic migrations,
  missing authentication SMTP, development credit grants and incomplete AI
  configuration.
- Request bodies, uploads, collection sizes and abuse-sensitive endpoints are
  bounded. Avatar type, size and magic bytes are checked.
- Android release disables backups and cleartext traffic, requires release
  signing and enables code/resource shrinking.
- No plaintext production secret, private key or release keystore was found in
  the tracked source reviewed by the audit.

## Dependency status

- NuGet vulnerable-package scan: no known vulnerable packages.
- npm audit: 0 critical, 0 high, 11 moderate advisories. The remaining findings
  are the same transitive Expo/Xcode build-tool chain (`uuid` through `xcode`);
  `expo-sharing` adds one directly reported path through that chain. npm proposes
  an incompatible Expo SDK downgrade, so the automated fix was not applied.
  Recheck after each Expo patch and keep the high/critical audit gate enabled.

## Deployment-owned residual risks

- Rate limits depend on the real client address. Production must trust only the
  explicitly configured reverse proxy and must not accept forwarded headers
  directly from the Internet.
- TLS termination, HSTS, certificate renewal, production CORS and the final
  stable HTTPS API hostname must be verified in the deployed environment.
- Database encryption, secret-manager access, log access, backup encryption and
  a tested restore procedure are hosting responsibilities and cannot be proven
  from this repository.
- The generic AI failure response prevents client disclosure, but production
  logs may contain diagnostic exception data and must have restricted access and
  a retention policy.
- Certificate pinning is not enabled. A rooted/compromised device or trusted-CA
  compromise remains outside the current threat model.
- Public release still requires physical-device, Google Play Internal Testing,
  multi-replica, backup/restore and monitoring/alerting smoke tests.

## Verification

- Backend tests: 108 passed.
- Mobile tests: 266 passed across 56 files.
- Mobile typecheck: passed.
- Backend Release build with warnings as errors: passed (0 warnings, 0 errors).
- Expo Doctor: 19/19 checks passed.
- Exercise catalog validation: 964 records, 0 errors, 0 warnings.
- `git diff --check`: passed.
- NuGet vulnerable-package scan: no vulnerable packages.
- npm audit: no high or critical advisories; 11 moderate build-tool advisories
  remain as documented above.
