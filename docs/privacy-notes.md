# Privacy implementation notes

- Gymmin stores user data locally in `gymmin.local.v1.*` and private app files; it has no server or account system.
- The avatar is copied to private app storage. AsyncStorage contains only profile metadata and its local path.
- AI prompts are generated locally. Gymmin never sends prompts/responses to OpenAI or another AI service.
- Bug reports are composed locally and sent only when the user chooses an email app. The bounded report excludes workout data, AI content, tokens and former account identifiers.
- Backup/export and clipboard actions occur only after explicit user action.
- Buy Me a Coffee opens `https://buymeacoffee.com/atomicjumpr` externally without identifiers or tracking parameters and grants no benefits.
- “Delete all data” cancels local notifications and removes local records/avatar after migration safety checks.
- Android cloud backup/device transfer is disabled for private data; `INTERNET` and Billing are removed from the merged manifest.
- Static PL/EN public policies are in `docs/privacy/` and identify the author as Paweł Kaliszewski.
