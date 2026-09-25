# Slack Vibe

Slack Vibe is a production-oriented team communication application built with Next.js, React, Prisma/PostgreSQL, Supabase and Auth.js. The current working branch contains an active TDD implementation program for secure messaging, direct and group conversations, search, unread workflows, mobile responsiveness, precise motion, performance and the broader Slack/Discord-grade roadmap.

The full scope is intentionally explicit. The product catalogue contains 90 capabilities, 108 requirements and 78 route patterns, including voice/video calls, meetings, scheduling, collaboration tools, community/platform features and dedicated-client planning. Partial implementation is never represented as complete.

## Start here

- [Documentation index](docs/README.md): source map for every specification.
- [Delivery plan](docs/delivery-plan.md): P00–P14 sequence and persistent implementation loop.
- [Design specification](docs/design.md) and [implementation audit](docs/design-audit.md): intended UI system and observed gaps.
- [TDD policy](docs/tdd.md): required red, green, refactor and release evidence.
- [Commit and push workflow](docs/contribution-workflow.md): branch, commit, gate and remote-verification rules.
- [QA checklist](docs/qa-checklist.md): independent feature and route verdict ledger.

## Local development

Use Node 22.23.2 and npm 10.9.8.

```bash
npm ci
npm run db:generate
npm run dev
```

The application expects the environment variables documented by the configuration and operations specifications. Do not use production data for local or automated tests.

## Verification

```bash
npm run docs:check
npm test -- --maxWorkers=1 --testTimeout=15000
npm run typecheck
npm run lint
npm run build
```

`npm run test:performance` is an opt-in disposable 100,000-message PostgreSQL benchmark. Its local results are observational and do not establish production latency or a whole-application speedup.

## Current evidence boundary

Local unit, component and integration checks, typecheck, lint and a production build have passed for the current working candidate. GitHub Actions run [36122872110](https://github.com/kelani34/slack-vibe/actions/runs/36122872110) passed against baseline commit `e4d07b8`; hosted evidence remains commit-specific, and the independent QA ledger remains NOT RUN. See [browser evidence](docs/browser-assessment.md), [testing](docs/testing.md) and [the delivery ledger](docs/delivery-plan.md) for exact evidence and open gates.
