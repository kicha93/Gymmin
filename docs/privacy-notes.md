# Privacy implementation notes

- Gymmin stores user data locally in `gymmin.local.v1.*` and private app files; it has no server or account system.
- The avatar is copied to private app storage. AsyncStorage contains only profile metadata and its local path.
- AI prompts are generated locally. Gymmin never sends prompts/responses to OpenAI or another AI service.
- All settings are stored in the same local-only data model and included in `.gymmin.json` backup/import; there is no cross-device synchronization.
- Contact and bug reports only compose `mailto:` messages to `kontakt@gymmin.app`. The user reviews and sends the message in a system email app; the app provides clipboard fallbacks and performs no HTTP submission.
- The bounded bug report excludes workout data, weights, AI content, tokens and former account identifiers.
- Backup/export and clipboard actions occur only after explicit user action.
- Buy Me a Coffee opens `https://buymeacoffee.com/atomicjumpr` externally without identifiers or tracking parameters and grants no benefits.
- “Delete all data” cancels local notifications and removes local records/avatar after migration safety checks.
- Android cloud backup/device transfer is disabled for private data; `INTERNET` and Billing are removed from the merged manifest.
- Canonical static PL/EN policies are in `docs/privacy/` and identify the author as Paweł Kaliszewski.
- Their public mirror contains only these publishable files and is available at `https://kicha93.github.io/gymmin-privacy/` from `kicha93/gymmin-privacy`; PL/EN deletion instructions are published below `/delete-data/` and `/en/delete-data/`.
