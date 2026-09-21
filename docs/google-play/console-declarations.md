# Google Play Console declarations — Gymmin 1.0

Status basis: 2026-09-21. This records the submitted local-only basis, but is not a substitute for reading the exact wording shown by Play Console. Answers must be rechecked whenever the product or dependencies change.

## App setup

- App or game: **App**
- Pricing: **Free**
- Package: `com.gymmin.app`
- Category: **Health & Fitness**
- App access: **All functionality is available without special access, an account, or login credentials**
- Ads: **No, the app does not contain ads**

## Data safety basis

Current architecture facts:

- workouts, sessions, history, weekly plan, favorites, settings, achievements, reminders, creator profiles, profile, and avatar stay in private local storage;
- Gymmin has no account, backend, analytics, advertising SDK, remote crash reporting, or background synchronization;
- Gymmin performs no runtime HTTP request and the release manifest has no `INTERNET` permission;
- backup/export happens only after an explicit user action and creates a local file selected or shared by the user;
- Report Bug and Contact prepare a bounded message locally and hand it to an external email client; the user reviews and explicitly sends it;
- AI workout creation uses local prompt generation and explicit copy/paste to an external service selected by the user; saved-workout AI rewrite is not part of the product;
- Buy Me a Coffee and privacy links are explicit external intents and receive no Gymmin user data from the app.

Likely form outcome: **the app does not collect or share user data automatically**. Verify the current Play Console definitions and exemptions for user-initiated transfers before submitting; do not copy this sentence without reviewing the live form.

## Health apps declaration

- Declare workout planning/tracking and fitness functionality truthfully under the available **activity and fitness / fitness** category.
- Gymmin is not a medical device, does not diagnose or treat conditions, and does not access Health Connect.
- Store listing and in-app articles retain an educational/non-medical disclaimer.

## Target audience and content

- Choose only age groups that match the intended audience.
- Do not include children merely to broaden reach; doing so can trigger Families requirements.
- Complete the IARC content-rating questionnaire based on the actual training and educational content.

## Other declarations

- News app: **No**
- Government app: **No**
- Financial features: **No**
- Account creation: **No**
- Account deletion URL: **Not applicable because the app has no accounts**
- Local data deletion instructions: publish `docs/privacy/delete-data/` and provide the public URL where Play Console offers an appropriate field.

## Reviewer notes

Suggested note:

> Gymmin is a local-only workout planner and log. It requires no account and has no backend. All core functionality is immediately available. The app contains no ads, subscriptions, paid digital features, analytics, or remote AI calls. Bug reports are sent only after the user explicitly confirms an email in their external mail application.

## Voluntary support risk

The external Buy Me a Coffee action grants no content, feature, badge, credit, or other benefit. Before production submission, recheck the current Payments policy and consider omitting the active link from the Play-distributed build if Play review guidance remains ambiguous for personal tips.
