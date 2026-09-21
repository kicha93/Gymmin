# Contributing

Gymmin is maintained by Paweł Kaliszewski. The repository is public for review and project development, but it is not offered under an open-source contribution license. Opening an issue or pull request does not grant a license to reuse the project.

Before proposing a change:

1. keep the mobile runtime local-only;
2. do not add accounts, backend transport, analytics, billing or remote AI calls without an explicit product decision;
3. preserve canonical exercise IDs and compatibility aliases;
4. update documentation with behavior changes;
5. run `npm run docs:validate`, `npm --prefix apps/mobile run test`, `npm --prefix apps/mobile run typecheck`, and `git diff --check`;
6. never commit secrets, user data, signing material or generated build artifacts.

Large product or catalog changes should be discussed before implementation. By submitting a contribution, the author confirms that they have the right to submit it and allows the project owner to review and incorporate it under separately agreed terms.
