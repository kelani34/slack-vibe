# Test-driven development and build strategy

[Index](README.md) · [Requirement test matrix](test-matrix.md) · [Test scenarios and release gates](testing.md) · [Implementation](implementation.md) · [Commit and push workflow](contribution-workflow.md) · [Timeline](timeline.md) · [Mobile acceptance](mobile-responsive.md)

## Mandatory development policy

**The whole application is developed test-first.** Every implemented feature, bug fix and behavioral change follows red → green → refactor. Tests cover the UI, domain rules, server boundaries, database, policies, integrations, realtime, jobs, mobile layouts, media, migrations and operational recovery. This applies to all 108 requirement IDs, all 78 routes and all 90 user-facing capabilities as implemented. “Tests everywhere” means demonstrable behavior and failure coverage throughout the system, not tests that merely restate private implementation details.

This policy supersedes earlier discretionary or minimal-testing wording in the plan. The requested breadth is explicit: no feature is complete with manual verification alone, tests added as a later phase, or an attractive interface around untested behavior. Manual device/accessibility/provider checks complement automated tests where necessary; they never replace the automatable contract. Existing code is brought under protection incrementally before changing it, with the highest-risk boundaries first.

The original assessment round was documentation only. The authorized implementation follow-up now has Vitest unit/component/integration projects, isolated PostgreSQL setup, Prisma migrations for the DM, W05 query and W04/W39 idempotency slices, and 289 passing local tests in the latest full run (`npm test -- --maxWorkers=1 --testTimeout=15000`) across 61 files. W04 regressions prove that sequential/concurrent message retries return one canonical row, changed payloads cannot reuse a key, access revocation still denies replay, hashes stay private and failed in-page attachment retries reuse completed uploads. W39 regressions prove that group-creation retries converge after a lost response or concurrent request, survive dialog remount, purge on logout and reject changed/cross-creator key reuse. A W06 component regression verifies that a published reply refreshes both the open thread and cached channel timeline while scheduled/deleted rows are ignored. The W22/F50 slice adds an access-checked cursor-paged all-unread query, first-unread deep links, explicit per-channel read controls, empty state and group-DM avatar rendering. The latest W05 tests first failed because channel member and available-member query keys omitted actor/workspace scope, then passed for both the Members tab and dialog after keys and invalidation targets were aligned. The conversation cache TDD slice adds actor/workspace/resource-scoped timeline/thread keys, scoped pin/bookmark keys, channel-only bookmark loading and workspace-revocation coverage for saved rows. The profile access slice first reproduced a member-card disclosure to an authenticated workspace outsider, then verifies requester/target authorization, actor/workspace/target query keys and profile/card cache invalidation. The W05 scheduled-draft slice first failed on actor/workspace/channel/thread key shape, query enablement without an actor and stale channel-membership access after workspace removal; red/green tests now verify cache scope, disabled no-viewer reads, fail-closed membership checks and narrow result projection. A thread component regression also proved parent and reply queries were active without viewer identity; they now stay disabled until the actor is known. The matrix remains the full planned denominator; current green evidence is limited to the slices named in [testing](testing.md), and it is not a production or independent-QA report.

The W06 reconnect-status regressions now cover one bounded active-timeline and sidebar-summary catch-up after a reported subscription interruption, with no extra fetch on the initial connection and no refresh from a disposed subscription. These are deterministic component checks, not proof of real network recovery; the live two-tab/drop/rejoin and provider-policy gates remain open.

Additional D04 test-first evidence: `src/components/channel/members-tab.test.tsx` verifies retryable initial errors for the current-member and add-member queries in both the Members tab and channel-members dialog, plus retention of cached members during a failed refresh.

`src/components/user-hover-card.test.tsx` verifies that member-detail fetching stays disabled until the hover card opens, exposes an accessible loading status and reduced-motion skeleton, retries an initial query error, and keeps cached details visible during a failed background refresh. These tests were run red before implementation and now pass in the focused component suite.

`src/components/forward-message-dialog.test.tsx` verifies accessible loading and empty destination-channel states, initial query failure/retry, and that cached options remain selectable while a refresh error is shown. The dialog's forwarding authorization and idempotency behavior remain separate F22 acceptance work.

The opt-in `test:performance` project is available as `npm run test:performance`. It uses the isolated PostgreSQL setup to create, seed and destroy a synthetic 100,000-message database, checks result correctness, captures the natural query plan and reports warm p50/p95 without a machine-dependent latency assertion. It is intentionally outside the normal test run and hosted CI; production-like latency, query-plan stability and load scenarios remain release work.

## Red, green, refactor for each vertical slice

1. **Define the behavior:** cite F/R/W and applicable MR IDs; write an observable acceptance example, permissions and failure outcome. Identify the lowest useful test layer plus the integration/browser coverage needed for the real boundary.
2. **Red:** write the test before changing application behavior. Run it against the current implementation and confirm it fails for the intended missing/incorrect behavior. An import error, unavailable database, bad fixture or timeout caused by broken setup does not establish the intended red state.
3. **Green:** implement the smallest complete change that satisfies the behavior and preserves access/data invariants. Run the focused test and affected layer suite. Do not broaden expected output or remove an assertion to force green.
4. **Refactor:** improve names and responsibilities while the tests remain green. Re-run affected suites, then the package integration checks. Avoid one interface/mock factory per function just to make isolated testing easier.
5. **Prove the complete slice:** exercise the authorized happy path, denied path, invalid input, recoverable failure and relevant retry/concurrency/mobile states. Link test IDs and results to the requirement; keep unrelated future scope marked planned.
6. **Merge/release only with evidence:** CI runs against the exact candidate commit and required target environment. Record expected red result, green command/result, coverage delta, browser/device evidence and remaining disabled scope. Squashed commits are allowed; separate public red commits are not mandatory, but the before/after evidence must be reviewable.

Pure behavior-preserving refactors first add or identify characterization tests for the current intended contract, then run them before and after. Do not fabricate a failing test by intentionally breaking working behavior. Defect fixes require a genuine failing regression test. When existing behavior is unsafe, characterize its context and write a regression asserting the intended secure behavior; never bless a vulnerability as the permanent expectation.

Test harness/configuration work is bootstrapping: verify discovery, fixtures, isolation, failure reporting and a known behavioral check before feature work. Explicitly demonstrate that a deliberately failing harness probe fails CI, then remove that probe and retain meaningful harness checks. Static type errors, invalid migrations and configuration regressions can use a failing compiler/schema/integration check as their initial executable contract rather than a useless unit assertion.

CI proves the candidate's outcomes; a green run alone cannot prove that tests were authored before implementation. Review the red/green evidence and change history as well as the final suite. Do not claim the process was followed merely because a test file appears in the diff.

## Proposed tools and responsibility boundaries

Pin versions after verifying compatibility with the installed Next.js 16.1.1 / React 19.2.3 / Prisma 7.2 baseline. Do not upgrade the application merely to match current documentation. Choose the authoritative package manager in W01; the repository currently has npm and Bun lockfiles. The tools below are a concrete proposed stack, not installed dependencies.

| Layer | Proposed tools / environment | What must be proven |
|---|---|---|
| Pure domain/unit | Vitest, deterministic clocks and input fixtures | Parsing, state transitions, permission precedence, cursor/order logic, recurrence and event reconciliation |
| React client components | Vitest + React Testing Library + user-event, DOM environment | Labelled controls, forms, visible errors, optimistic rollback, keyboard/IME and callback outcomes |
| Database/action integration | Same runner with isolated real PostgreSQL, actual Prisma migrations/client | Transactions, uniqueness, tenancy predicates, idempotency, worker claims, deletion and races |
| Application/runtime integration | Running production-mode Next app and authenticated HTTP/browser clients | Route/Server Action boundaries, session propagation, serialization, redirects and real wiring |
| Browser end-to-end | Playwright: Chromium, WebKit and Firefox projects | Core journeys, navigation, multi-client realtime, uploads, UI access denial and state retention |
| Mobile/responsive/accessibility | Playwright viewport/interaction checks, axe integration, physical devices and screen readers | MR01–MR14, focus, touch targets, keyboard occlusion, reflow and actual OS behavior |
| Provider contracts | Local deterministic request/event fixtures plus isolated provider sandbox suites | Signed callbacks, grant shape, timeout/retry/revocation and upstream compatibility |
| Database/security policy | Dedicated isolated Supabase/real service policy setup where applicable | RLS, subscriptions and storage access using anonymous/member/outsider identities, never only service-role clients |
| Performance/resilience | Browser traces, SQL instrumentation and a bounded load runner selected in W18 | Query/payload bounds, cache behavior, concurrency, reconnect and memory/resource cleanup |
| Migration/recovery/operations | Isolated deployment/DB/storage fixtures and scripted probes | Fresh/upgrade migration, backup/restore, worker restart, configuration rejection and rollback |

Next.js's Vitest guide recommends browser-level coverage for async Server Components rather than pretending a DOM unit harness renders their full runtime. Keep pure loaders/policies testable while exercising their actual route wiring in Next. [Next.js testing guidance](https://nextjs.org/docs/app/guides/testing/vitest)

Use semantic roles/labels and observable outcomes for UI tests. Avoid internal component state assertions, long CSS/XPath selectors and massive snapshots. Small snapshots are appropriate for stable structured contracts or intentional visual baselines, with substantive assertions alongside them. [Testing Library principles](https://testing-library.com/docs/guiding-principles/), [Playwright best practices](https://playwright.dev/docs/best-practices)

## Test layout and command contract

Proposed placement, to create during implementation only:

```text
src/**/<behavior>.test.ts              # pure logic near its owner
src/**/<component>.test.tsx           # client component behavior
tests/integration/                   # DB, action and runtime integration
tests/contracts/                     # provider protocol/event contracts
tests/e2e/                           # desktop + mobile route journeys
tests/policies/                      # RLS/storage/realtime identity checks
tests/performance/                   # reproducible bounded load/trace scenarios
tests/migrations/                    # upgrade and preservation assertions
tests/fixtures/                      # synthetic factories; no production content
tests/support/                       # small shared setup, not a generic framework
```

Current commands are `test` (the default Vitest projects), `test:unit`, `test:component`, `test:integration`, `test:coverage` and the opt-in `test:performance`. `.github/workflows/ci.yml` runs the three default test projects, Prisma generation, typecheck, production build and full lint. PR #6 hosted CI runs [36149667142](https://github.com/kelani34/slack-vibe/actions/runs/36149667142) and [36149672117](https://github.com/kelani34/slack-vibe/actions/runs/36149672117) passed. PR #7 at `d777da4a1ead74fe9e214348d9eb99fe90c0cddc` passed runs [36151023880](https://github.com/kelani34/slack-vibe/actions/runs/36151023880) and [36151029811](https://github.com/kelani34/slack-vibe/actions/runs/36151029811). PR #8 at `ebdd2e96e6488b3b05e11c4192b10b0b5dec5945` passed [36151946486](https://github.com/kelani34/slack-vibe/actions/runs/36151946486) and [36151973789](https://github.com/kelani34/slack-vibe/actions/runs/36151973789), plus security and Vercel checks. PR #9 at `990f76f` passed hosted CI runs [36154871519](https://github.com/kelani34/slack-vibe/actions/runs/36154871519) and [36154907966](https://github.com/kelani34/slack-vibe/actions/runs/36154907966), plus GitGuardian and Vercel checks. PR #10 at `09aa5ca` passed hosted CI runs [36156507989](https://github.com/kelani34/slack-vibe/actions/runs/36156507989) and [36156547919](https://github.com/kelani34/slack-vibe/actions/runs/36156547919), plus GitGuardian and Vercel checks. The full-repository lint baseline is clean locally, down from 84 errors and 32 warnings. Deliberate failure-propagation proof and future `test:contracts`, `test:policies`, `test:e2e`, `test:mobile`, `test:a11y` and `test:migrations` lanes remain open until implemented and verified.

## Isolation, determinism and test data

Use synthetic workspace A/B fixtures from [testing](testing.md). Allocate a unique database/schema and storage/realtime namespace per concurrent worker when the adapter supports it; otherwise serialize a clearly identified suite. Reset through an explicit disposable-environment contract with a test-only credential allowlist and environment identity check. A variable whose name contains “test” is not sufficient protection against a production connection. Never run destructive cleanup against ambient production credentials.

Apply real migrations to integration databases. Test fresh install and upgrade from a representative prior schema with existing synthetic data. Use real foreign keys, indexes and uniqueness constraints. Unit mocking Prisma cannot prove an actual race or SQL visibility rule. External processes/connections require separate transactions; an enclosing test transaction alone cannot isolate a worker that opens its own connection.

Factories create realistic minimal valid records with explicit roles and source relationships. Seed randomness when generating cases and retain the seed on failure. Inject a clock into domain scheduling logic when needed, use fake timers in pure/component tests, and keep real transport tests on bounded observable deadlines. No arbitrary sleep replaces waiting for a concrete state or event. Use synchronization barriers to deliberately interleave two DB operations in race tests rather than hoping a timing loop races.

Authentication tests exercise real session validation against an isolated identity fixture. Provider login may be controlled in a separate test environment, but no publicly reachable production “test login” or auth bypass is permitted. Browser storage state is per actor/worker and treated as a secret artifact. Stubs for third parties reproduce documented success/error/ambiguous outcomes; the app's own access and transactional layer remains real in integration tests.

## Coverage policy

**Mandatory behavior coverage:** every enabled F requirement and R route has linked tests, every changed behavior has red/green evidence, and every documented security/lifecycle decision has its allow/deny or valid/invalid transition cases. Every interactive app-owned component has behavior/state tests directly or through a named containing feature suite. A static presentational wrapper may be exercised by its parent rather than a redundant test file; it is still inside coverage inventory. Generated/vendor code is not application test ownership, but customized primitives and their integration are.

Proposed initial quantitative gates, adopted for implementation planning:

- New/changed owned runtime modules: at least **95% statement/line/function coverage and 90% branch coverage**, measured over the relevant executable modules, plus review of uncovered lines. Changed modules are tested as a whole, not only imported happy-path lines.
- Auth/access, publication/idempotency, consent, scheduler claims and destructive lifecycle modules: **100% enumerated policy cases and state transitions**, with 100% measurable branch coverage where the instrumented runner supports it. Test explicit denied and fail-closed behavior; percentage alone never establishes security.
- Entire retained application at full-target release: at least **90% statement/line/function and 85% branch coverage** of instrumentable app-owned code, with no unowned/unclassified runtime file and no missing critical behavior tests. Existing legacy baseline is measured in W01 and ratchets upward on every touched module.
- Framework-rendered or native/media execution not included reliably in unit instrumentation has explicit browser/provider/device evidence. Report each coverage domain separately; do not invent a blended percentage or claim uninstrumented server code was covered by a client report.

Configure coverage inclusion over all relevant source files, including untouched/unimported files, and review exclusions in code review. Only generated artifacts, dependency code and justified non-runtime declarations are excluded by class; adding a broad exclusion to pass a gate is prohibited. No blanket exclusion of actions, routes, workers or components. Coverage configuration changes receive the same review as a test change. Vitest supports explicit include/exclude configuration; use that to make gaps visible. [Vitest coverage guide](https://vitest.dev/guide/coverage.html)

Add targeted mutation checks for authorization predicates, dedupe keys, schedule comparisons, consent and role precedence after the initial suite is stable. A surviving meaningful mutation is an uncovered behavior to fix, not a reason to increase snapshot count. Mutation runs need not block every local TDD iteration; affected critical mutations and release candidates must have evidence. Equivalent/unreachable mutations require documented reasoning, not silent blanket ignores.

## CI, merge and release lanes

| Lane | Trigger / blocking policy | Checks and artifacts |
|---|---|---|
| Local red/green | Every behavior slice | Focused failing/passing test, then relevant suite; short output tied to F/R/W IDs |
| Fast PR | Every code/config/test change, blocking | Type/lint, unit/component, changed-module coverage, deterministic provider contracts, test discovery; JUnit/coverage artifacts |
| Real integration PR | DB/action/policy/realtime/job changes and shared security changes, blocking | Real migrations/DB constraints, allow/deny roles, transactions/races and required local service policies |
| Browser PR | Every affected enabled route/component plus core smoke, blocking | Desktop and compact happy/error flows, direct-load access, keyboard, visual/a11y assertions; trace on failure |
| Cross-browser/mobile | Relevant platform changes and release candidate, blocking for enabled support | Chromium/WebKit/Firefox, responsive matrix and documented physical-device checks |
| Provider staging | Integration changes and release candidate, blocking for that enabled integration | Real isolated media/storage/realtime/calendar/identity behavior and credential/config checks |
| Scheduled depth | Broad regression, mutation, load, restore and long-session suites | Surface regressions with owners; unresolved relevant failures block next release; schedule only during implementation |
| Release candidate | Exact deployable commit and environment, blocking | Full enabled-feature traceability, critical suites, migrations/rollback/restore, mobile/media, performance and no unresolved critical flakes |

Change selection can shorten PR feedback only with an explicit dependency map; shared access/schema/session changes trigger broad suites. Full enabled-feature regression runs on the release candidate even if a PR selector missed a dependency. Build once and test the deployable artifact for runtime suites. Do not allow `ignoreBuildErrors`, `continue-on-error`, empty test discovery or unavailable required services to produce a release-ready status.

Fork/untrusted PRs run without production/provider credentials. Secret-backed suites run only in a trusted environment with scoped disposable resources. Artifact uploads redact tokens, invitations, private data and media; retention is bounded. CI logs identify the failing contract without exposing synthetic auth secrets.

Retries may collect diagnostics, but first-run failure is retained as a flaky result and is not silently counted as healthy. Critical and newly changed tests cannot be quarantined to ship. Noncritical quarantine requires an owner, issue, short expiry, visible status and replacement coverage where behavior remains enabled; expired quarantine fails the gate. A relevant unresolved failure blocks release or the feature is fully gated off. [Playwright retry classifications](https://playwright.dev/docs/test-retries)

## Special suites that cannot be omitted

**Realtime:** two users and two tabs, event-before-ack, duplicate/out-of-order events, disconnect/resume, permission removal, no private payload received, bounded subscription teardown. Inspect transport payloads and durable records, not only visible rows.

**Scheduling:** real worker claims and cancellation races, repeat invocation, clock boundaries, DST/recurrence exceptions, publish-time authority, delayed provider responses and exactly one durable intent. An external timeout after delivery is uncertain, not permission to issue a new intent.

**Calls/media:** deterministic call state/grant tests first; real provider/browser tests for media join, TURN-only connectivity, device denial, track cleanup and active eviction. Fake media streams can drive automation but physical routing/background/consent remain device gates. No RTC-mock-only release.

**Mobile/design/motion:** MR01–MR14, focus/touch actions, empty/error/denied states, responsive screenshots with reviewed baselines, reduced motion, rapid interruption and keyboard-open real-device checks. Fixed fixtures remove time/randomness from images. Do not auto-accept changed screenshots to turn a pipeline green.

**Security and content:** serialized response/subscription/storage tests, role/property matrices, cross-tenant IDs, safe rich text and upload metadata, OAuth/SSO binding, SSRF-safe delivery, revocation across caches and derivatives. User content in transcripts/notes/imports is untrusted input.

**Recovery/operations:** interrupted migrations/jobs, restore access policy, paused/restarted workers, failed media processor, expired calendar cursor, workflow loop/cancellation, export/hold deletion races and signed native update/deep-link checks. A backup existing is not a passing restore test.

**Performance:** first write the budget/query-bound regression and capture the failing baseline before optimizing. Check unchanged correctness and access simultaneously. Keep noisy latency tests on controlled fixtures with sample counts; stable query counts, payload/page bounds and cleanup assertions can run on every affected PR. Never mock away the work whose performance is being claimed.

## Adoption plan for the current repository

1. W01 establishes pinned runner projects, isolated DB fixtures, fail-on-error scripts/CI, baseline coverage and the first meaningful component plus real DB tests. Reproduce the existing type/lint failures separately; do not call their resolution test coverage.
2. W02/W03 begin with red tenant/resource/transport tests against current code before access repairs. Gate unsafe features while these remain unresolved.
3. W04 uses a complete red-to-green messaging slice: outsider denied, valid send persisted, lost-response retry does not duplicate, pending/failure UI retains text, two clients converge.
4. Each following W package picks its requirement-matrix rows, writes tests before implementation and adds migration/contract/mobile coverage during the same slice. UI work is not deferred behind all backend work; each slice proves the user flow end to end.
5. W18 starts alongside W01 to grow shared CI/reporting, cross-feature regression, mutation/performance and recovery suites. It is not a final sprint in which all missing tests are written.
6. The full-target release closes every enabled matrix row and route record. A planned future row is visibly unimplemented and backend-gated where appropriate, not represented by a skipped empty test.

For a bug: reproduce → failing regression at the responsible boundary → repair → regression plus adjacent suite → browser/provider reproduction when required. For an incident: retain a synthetic minimized reproduction without customer data, then add the regression before the permanent fix. Test repairs require diagnosis of the incorrect expectation or flaky setup; a failing correct regression is an application defect.

## Review checklist and evidence

The [dedicated QA engineer](qa-engineer.md) independently verifies the resulting feature and its affected regression scope. Developers still own red/green/refactor and correct automated tests; QA reviews gaps, adds acceptance/adversarial checks, reproduces defects and verifies fixes. The [QA checklist](qa-checklist.md) cannot be marked PASS solely from the implementation author's green run. If QA modifies production behavior, another reviewer signs off that change.

Reviewers require the F/R/W/MR mapping, intended red result, green command/commit, relevant negative/concurrency cases, migrations/policy impact, coverage/exclusion diff, browser/device evidence and release flag state. Test assertions must fail if the intended behavior is removed. Update [test-matrix](test-matrix.md), [testing](testing.md) and feature status together as implementation proceeds. Never invent test paths, green CI links or successful runs for an unimplemented planned state.

The user requires TDD throughout. Earlier minimal-testing advice does not justify omitting tests, nor does a deadline justify writing implementation first. Reduce the enabled slice if needed; retain test-first delivery and mandatory gates.

The follow-on W05 timeline regression first observed the root-history query enabled under the shared `anonymous` cache key with no viewer ID. `MessageList` now enables that paged query only when the current actor is known; a companion assertion keeps it enabled for an identified actor. The static-message path remains unchanged.

W09 red/green cases reproduced two metadata-trust failures in the upload action: non-image bytes labeled `image/png` and active SVG content labeled as an image. The action now rejects those cases before storage access and checks the first 12 bytes for supported raster signatures. A matching PNG header remains accepted. This slice does not close private storage, non-image content validation or object ownership.
