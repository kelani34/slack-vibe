# Contributing to Slack Vibe

[Documentation index](docs/README.md) · [Delivery plan](docs/delivery-plan.md) · [TDD policy](docs/tdd.md) · [Commit and push workflow](docs/contribution-workflow.md)

All work follows the persistent implementation loop in the delivery plan. Pick one dependency-ready vertical slice, cite its feature, route, work-package and mobile IDs, establish the intended failing behavior, implement the smallest complete slice, run focused and affected checks, update evidence, then commit and push the reviewed result.

Use the repository's pinned npm toolchain. Before every pushed commit, run `npm run docs:check` and the focused tests. Runtime changes also require the affected suite, `npm run typecheck`, `npm run lint`, and a production build when route/runtime wiring changes. Never commit credentials, production content, generated build output, browser storage, or unredacted evidence.

Commit messages use the form `type(scope): imperative summary`, with `feat`, `fix`, `test`, `docs`, `refactor`, `perf`, `build`, `ci`, or `chore`. Keep source, migrations, tests, and required contract updates in the same reviewable slice. Use descriptive branch names such as `feature/<topic>`, `fix/<topic>`, `design/<topic>`, `test/<topic>`, or `docs/<topic>`; never include `codex` in a new branch name. Do not force-push shared branches or represent local checks as hosted CI.
