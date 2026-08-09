# ARCHIVED — Backend system status (historical)

This document describes the removed backend architecture and is not part of the supported Gymmin product.

Gymmin exposes a public, user-safe status endpoint:

```http
GET /api/system/status
```

Response:

```json
{
  "kind": "ok",
  "message": null,
  "updatedAt": "2026-07-06T10:00:00Z"
}
```

Supported backend-configured kinds:

- `ok` - no homepage callout.
- `degraded` - online services may be slower or unstable.
- `maintenance` - planned maintenance.
- `update` - short system update in progress.

Mobile also uses `offline` locally when the status request fails because the
server cannot be reached or returns an unusable response.

## Configuration

Set status through appsettings or environment variables:

```json
{
  "SystemStatus": {
    "Kind": "maintenance",
    "MessagePl": "Przerwa techniczna potrwa kilka minut.",
    "MessageEn": "Maintenance should take a few minutes."
  }
}
```

PowerShell example:

```powershell
$env:SystemStatus__Kind = "update"
$env:SystemStatus__MessagePl = "Trwa krotka aktualizacja."
$env:SystemStatus__MessageEn = "A short update is in progress."
```

Invalid `Kind` values fall back to `ok`. The endpoint is public and must not
return infrastructure details, stack traces, exception messages or secrets.

## Mobile behavior

The homepage shows a calm inline callout only when status is not `ok`.

The offline copy explicitly tells the user that local workouts are still safe on
the device. The callout does not block local-first usage. The CTA refreshes the
status manually, while automatic checks are cached briefly to avoid request spam.

Online-only actions are disabled while the status is not `ok`. This includes
AI creator/rewrite actions and Credits/Google Play purchase flows. Mobile shows
a calm app dialog instead of raw network errors such as `Network request failed`.
