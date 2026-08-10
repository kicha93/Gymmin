# Application status

Status date: 2026-08-10.

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
- optimized offline exercise media: 64 static START/END pairs use WebP Q90 runtime assets generated reproducibly from non-bundled PNG sources; the supplied MP4 remains unchanged.

## Compatibility retained intentionally

- legacy `gymmin.account.*` and old anonymous namespace readers;
- multi-source selection, validation, copy-first migration, completion marker and interrupted recovery;
- optional legacy sync-shaped fields in parsers only;
- one-time obsolete auth credential cleanup through SecureStore.

These are upgrade/import facilities, not active account storage or product functions.

## Not part of Gymmin

Accounts, login, cloud sync, server storage, remote OpenAI calls, credits/premium, Google Play Billing, backend status and account deletion do not exist in the product.

## Release state

APK/AAB commands are backend-free and release signing fails closed. The legacy vc1 to local-only RC vc2 upgrade and the Balanced WebP sample both passed on a physical Android device. Static GitHub Pages privacy documents are ready; Pages must be enabled and the resulting public URL entered in Google Play Console. The remaining manual scenarios retain their explicit status in the release checklist.
