# Application status

Status date: 2026-08-09.

Gymmin is now a local-only mobile product. Backend source, auth, synchronization, remote creator jobs, AI credits, billing, remote profile/avatar transport, system status, HTTP clients, and API URL build configuration have been removed.

## Available locally

- workout library/editor, archive, guided execution, active-session recovery and session-only/planned two-exercise supersets;
- history, progress, weekly plan, favorites, achievements and local reminders;
- local settings, creator profiles, display name and private avatar;
- AI create/rewrite through copy/paste only;
- offline workout CSV/XLSX export;
- `.gymmin.json` backup/import, including avatar and backward-compatible profile handling;
- full local data deletion;
- safe bug report email with clipboard fallback;
- PL/EN About, author attribution, privacy and voluntary Buy Me a Coffee link.

## Compatibility retained intentionally

- legacy `gymmin.account.*` and old anonymous namespace readers;
- multi-source selection, validation, copy-first migration, completion marker and interrupted recovery;
- optional legacy sync-shaped fields in parsers only;
- one-time obsolete auth credential cleanup through SecureStore.

These are upgrade/import facilities, not active account storage or product functions.

## Not part of Gymmin

Accounts, login, cloud sync, server storage, remote OpenAI calls, credits/premium, Google Play Billing, backend status and account deletion do not exist in the product.

## Release state

APK/AAB commands are backend-free and release signing fails closed. On 2026-08-09 the normal repository path produced a debug APK, signed arm64 release APK and signed arm64 AAB; the merged release manifest contained neither INTERNET nor Billing. Expo Doctor passed 19/19. Static GitHub Pages privacy documents are ready; Pages must be enabled and the resulting public URL entered in Google Play Console. Physical-device upgrade and data-deletion smoke tests remain mandatory before rollout.
