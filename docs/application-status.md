# Application status

Status date: 2026-09-21.

Gymmin is now a local-only mobile product. Backend source, auth, synchronization, remote creator jobs, AI credits, billing, remote profile/avatar transport, system status, HTTP clients, and API URL build configuration have been removed.

## Available locally

- workout library/editor, archive, guided execution, active-session recovery and session-only/planned two-exercise supersets;
- history, a derived Progress Report, weekly plan, favorites, achievements and local reminders; the report supports week, month and 12-week periods, summarizes completed sessions, compares shared exercises with Epley e1RM, detects e1RM records and keeps the existing exercise-level progress list as a drill-down;
- an expandable Home analysis of current-week muscle volume, with completed/projected fractional working sets, front/back anatomy and one shared approximate hypertrophy reference range; its responsive dashboard places the muscle list beside a full-height figure and lets the user temporarily gray individual groups without changing stored data;
- local settings, creator profiles and private avatar; every setting persists in local storage and participates in `.gymmin.json` backup/import rather than sync;
- an always-visible header action for the local profile, with no login/account panel; the Profile dashboard combines the avatar, derived completed-session and active-plan counts, achievements and bug reporting, while intentionally storing no display name;
- a local workout creator available from Workouts and never gated by connectivity or the number of saved workouts; it is not duplicated on Home;
- AI workout creation through copy/paste only; Prompt V4 requires current evidence research, systematic rather than random variation and cross-workout exercise-ID uniqueness. Local review blocks unjustified exact repeats between days while keeping category concentration advisory. Saved-workout AI rewrite has been removed;
- offline workout CSV/XLSX export;
- `.gymmin.json` backup/import, including avatar and backward-compatible profile handling; import normalizes weekly-plan references against the workouts in the backup, and deleting a workout removes it from the live weekly plan;
- full local data deletion;
- local Contact and safe bug-report email flows: both open the system email app, never submit HTTP forms, and provide clipboard fallback;
- PL/EN About, author attribution, privacy and voluntary Buy Me a Coffee link; the support card is the final standalone section below all Settings panels.
- optimized offline exercise media: all 729 canonical exercises are covered by 815 static WebP Q90 runtime images across 736 retained image sets generated reproducibly from non-bundled PNG sources; 79 sets have START/END pairs and 657 have one available image. Video and animated exercise media are excluded.
- a validated catalog of 729 exercises with localized presentation and richer muscle-involvement data; reviewed redundant variants, including explicit resistance-band, alternating, and duplicate weighted/unweighted exercises, are merged into canonical movements through compatibility aliases. Smith-machine and sliding-disc variants remain distinct where the equipment changes the movement.
- an opt-in Advanced Muscle Mode in Preferences; Exercise Detail can show 38 localized anatomical subdivisions generated for canonical exercise IDs, while the default standard view and weekly muscle-volume calculations remain unchanged.
- detailed warm-up stages remain visible as their actual exercises during guided execution; only a truly empty/simple warm-up placeholder receives the compact representation.

## Compatibility retained intentionally

- dormant compatibility readers for pre-release `gymmin.account.*` fixtures; the product runtime does not invoke them;
- multi-source selection, validation, copy-first migration, completion marker and interrupted recovery;
- optional legacy sync-shaped fields in parsers only;
- one-time obsolete auth credential cleanup through SecureStore.

These are upgrade/import facilities, not active account storage or product functions.

## Not part of Gymmin

Accounts, login, cloud sync, server storage, remote OpenAI calls, credits/premium, Google Play Billing, backend status and account deletion do not exist in the product.

## Release state

APK/AAB commands are backend-free and release signing fails closed. The APK one-click path derives release metadata from `app.json`, validates dependencies, Expo, the local-only product, optimized exercise media, the merged Android manifest, package/version metadata, and the signing certificate before publishing to the public GitHub repository. Unsigned iOS IPA builds are available through GitHub Actions and Codemagic; they still require user-side signing and are not App Store builds. Static GitHub Pages privacy documents are published from `kicha93/gymmin-privacy` at `https://kicha93.github.io/gymmin-privacy/`; the URL is configured in Google Play Console. Artifact-specific hashes and manual test evidence belong in a dated release record rather than this product-status document.
