# Security policy

## Reporting a vulnerability

Do not publish exploitable details in a public issue. Send a concise report to `kontakt@gymmin.app` with the affected version, reproduction steps, impact, and any safe supporting material.

Do not include real workout history, health information, Apple/Google credentials, signing keys, tokens, private backups, or other personal data. Gymmin has no bug-bounty program and no guaranteed response time, but reports will be reviewed in good faith.

## Supported version

Only the newest source state and current distributed build are supported. Historical backend documents under `docs/archive/` describe removed systems and are not supported attack surfaces.

## Secrets

The public repository must never contain Android upload keystores, Apple credentials, provisioning profiles, service-account files, personal access tokens, user backups, or private application data. Run `npm run security:secrets` before publishing changes.
