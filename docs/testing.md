# Validation and release gates

[Index](README.md) · [Assessment evidence](assessment.md) · [Feature register](features.md) · [Timeline](timeline.md)

**Mandatory policy:** the whole app follows [test-driven development](tdd.md). Use the [F01–F108 test matrix](test-matrix.md) before implementation. The scenarios below are implemented test-first in their owning work package; this document is not a plan to add tests after the product is built. The latest full run, `npm test`, passed 289 local tests across the unit, component and integration projects and 61 test files; focused search/DM/avatar/message-access/context runs pass all 83 affected tests across ten files. Independent QA and the complete case catalogue remain open. One intervening full-suite attempt timed out in `src/components/direct-message-actions.test.tsx` while renaming a group; the focused file then passed all three tests and the subsequent full run passed all 274 tests. Keep this as a transient flakiness observation until repeated hosted runs remain green.

The current D04 component slices verify accessible thread loading; retries after initial thread, current-member, add-member, forwarding destination and member-hover-card query failures; cached reply/member/channel/profile data during failed refreshes; forwarding loading and empty destination states; and deferred hover-card profile reads until the card opens. B20 rechecks the current local candidate's one-to-one peer avatar/name/composer placeholder and stacked three-person group DM. B21 confirms successful member-card rendering in a populated channel. B22 reconfirms the three-avatar group-DM sidebar/header and composer rendering on the motion-foundation worktree; it does not cover animation timing or reduced-motion emulation. B23 confirms visible keyboard focus on the group DM's Add people action with no layout movement. The D05 contract also covers button press scale/duration, disabled controls, reduced-motion scaling and the focus transition path; physical reduced-motion browser emulation and frame measurement remain open. The new lazy-query and failure-state branches remain component-tested only.

The scheduled-draft cache/access slice is test-first: component tests cover actor/workspace/channel/thread keys and no query without a viewer identity. Integration tests reproduce a stale channel membership after workspace removal, verify that no scheduled content is returned, and ensure successful results omit unrendered user and attachment relations. Ten-second polling cost and publication race behavior are not covered by these cases; W07 owns publication lifecycle tests.

The W05 thread-identity regression confirms both parent-message and reply queries stay disabled while `currentUserId` is unavailable, preventing authenticated results from being cached under the shared fallback actor key.

The [complete case catalogue](acceptance-cases.md), [phase sequence](delivery-plan.md) and [coverage mapping](delivery-traceability.md) connect these gates to every current feature and route. Initial [browser findings](browser-assessment.md) recorded failed deployed and local sign-in; later evidence B06 verified local sign-in. The deployed callback remains unverified, and independent feature QA has not run.

## Verification plan for F69–F78

[Collaboration feature design](collaboration-features.md) owns detailed scenarios. W27–W30 must record evidence for poll close/vote races, emoji retirement and unsafe assets, voice capture denial/retry/cleanup, group fanout and permission changes, atomic template creation, acknowledgement edits and recipient changes, task assignment/timezones, note revision conflicts, keyword mute/dedupe and saved-search reauthorization. Each enabled feature also requires source-revocation checks across cache, direct route, search, notifications and realtime where applicable.

Use isolated database tests for lifecycle/authorization/concurrency and browser tests for media permissions, focus, draft preservation and responsive panels. Compare initial-load/query/send budgets with features enabled; hidden features should introduce no full-content loading. This is a future verification plan, not a claim those tests ran during documentation.

## Full platform validation: F79–F108 and W39

[Calls and meetings](calls-and-meetings.md#tests-rollout-and-operations) owns real browser/device/network tests: ringing races, device denial/removal, TURN-only connection, weak network, active revocation, host leave, duplicate provider callbacks, late-join recording consent, private playback and calendar recurrence/reschedule/cancel races. Measure audio-first join, ordinary chat input during a call and initial-page media payload. Mocked media SDK success is insufficient evidence for release.

[Production platform](production-platform.md) adds role-conflict fixtures, guest expiry, bilateral disconnect, forum answer deletion, moderation-before-publication, workflow idempotency/loop bounds, signed webhook replay/SSRF, import resume/rollback, SSO tenant binding, SCIM deactivation and hold/deletion races. W39 tests added-member group-DM history boundaries, offline stale/revoked state and notification retries. Native QA uses actual OS background, incoming call, push, deep-link and update behavior. These are documented future gates, not tests executed in this assessment.

[Direct messages](direct-messages.md) owns the DM-specific extension: one-to-one pair identity, inbox summaries, group participant revisions, history boundaries, presence/typing, notification privacy, private files, calls, offline outbox, mobile Back behavior and governance. F13, the first F52 inbox slice and bounded F14 creation now have developer-tested implementation evidence; group lifecycle/privacy and independent QA entries remain NOT RUN.

## What has been verified in this round

Static code inspection, local no-emit TypeScript checking, full-repository ESLint checking, and visual inspection of the logged-out login page, authenticated DM inbox/group conversation header, and the unread inbox empty state with its sidebar badge. The implementation follow-up now has Vitest unit/component/integration projects, isolated PostgreSQL setup, auth/build contract checks, workspace membership transaction coverage, a hook-order regression, server-side message access tests, channel membership boundaries, DIRECT one-to-one creation/idempotency and sidebar data coverage, a pair-key migration, a participant/latest-message/unread DM inbox loader and route, validated one-to-one and group recipient creation, same-intent group retry deduplication across lost responses/concurrency and page remounts, logout cleanup, changed-payload and cross-creator conflicts with private-hash omission, a history-boundary test proving new group members cannot read an earlier generation, new-generation behavior when a group gains a participant, group rename/leave lifecycle checks after membership drops to two active participants with one-to-one group-action denials, per-user composer draft restore/clear and logout-purge checks, direct-message and workspace-scoped profile authorization, private search isolation, upload membership/size/type authorization, star/reaction/pin/forward/scheduled-read/edit/send-now authorization, destination posting checks, bookmark privacy filtering, notification access-filtered pagination, unread-count and bounded channel-read updates, optimistic read rollback and duplicate-event suppression, a mark-all-read component check, accessible forwarding and group-action dialogs, a group-add history-boundary disclosure check, a responsive recipient picker check, an access-checked member directory with preselected DM entry, group avatar-stack coverage across sidebar, inbox and header, with a sidebar integration regression asserting the overlapping participant pair and layer order, a DM inbox route regression asserting all three group participants render, and the two-member-after-leave and one-member group-marker cases, focused-conversation-only realtime hydration (the sidebar relay cannot trigger a second detail fetch, duplicate IDs hydrate once, own-user events are accepted in another tab, event/ack order reconciles to one row, and replies/scheduled rows are rejected from root history), published-reply invalidation of thread and root timeline caches, latest-only search results, lazy filter suggestions, stable keyset pagination through deleted boundaries, a tested PostgreSQL trigram query plan, and bounded message-result projection, mobile Back coverage, scheduled cancellation, invite-link copy, a responsive mobile navigation smoke check, fresh-topic loading when the editor reopens, mention-result keyboard selection reset coverage, bounded old-message context retrieval, reply-thread deep links, timeline restore, unavailable versus retryable context errors, message highlight behavior, optimistic send success/failure lifecycle, stable typing-subscription cleanup, proxy/login-matcher coverage, safe return-path validation, login-action redirect coverage, account-menu sign-out with a private Query-cache purge before the Auth.js request, session-boundary cache clearing and login navigation after propagated sign-out, cache clearing and route refresh after actor change, actor-scoped draft cleanup, TC-F36-07 viewer/workspace/target profile and hover-card keys, outsider denial for member-card contact data, disabled member-detail fetching without a viewer identity, and profile/card edit invalidation, actor/workspace scope for channel-member and available-member query keys in both the Members tab and dialog, actor/workspace/channel-scoped timeline, parent-message and thread keys with reconnect invalidation, optimistic send/retry cache reconciliation, and red/green verification that pinning invalidates only the current actor/workspace message prefix, pinned/bookmarked panel keys include actor/workspace/channel, bookmark loaders request one channel, bookmark action invalidation stays in scope, and workspace removal blocks saved rows despite stale channel membership, and allowlist sanitizer unit tests, hostile send/edit/schedule/forward integration tests, safe legacy HTML preview/render tests and safe plain-text system-event write checks. W05 tests cover unread semantics on 50 channels, keyset paging for 26 DM conversations, notification access filtering before pagination, relational notification read updates that preserve unrelated private rows, unread-count projection rules, workspace membership after stale channel-membership rows, minimal search/forward channel projections, and no broad route invalidation for ordinary send/edit/delete/pin/unpin/read, schedule creation/edit/cancel/send-now, channel create/delete/leave, membership/settings, DM create/group rename/leave, profile edit, notification preference updates, invite joins, and workspace creation. The latest full test command, `npm test`, passes 289 unit/component/integration tests across 61 files; typecheck and lint pass locally. The isolated production build (`NEXT_DIST_DIR=.next-check npm run build`) passes for this slice; generated output was removed after verification. PR #6 hosted CI runs [36149667142](https://github.com/kelani34/slack-vibe/actions/runs/36149667142) and [36149672117](https://github.com/kelani34/slack-vibe/actions/runs/36149672117), PR #7 runs [36151023880](https://github.com/kelani34/slack-vibe/actions/runs/36151023880) and [36151029811](https://github.com/kelani34/slack-vibe/actions/runs/36151029811), and PR #8 runs [36151946486](https://github.com/kelani34/slack-vibe/actions/runs/36151946486) and [36151973789](https://github.com/kelani34/slack-vibe/actions/runs/36151973789) passed their configured gates; hosted evidence remains commit-specific. PR #7 at `d777da4a1ead74fe9e214348d9eb99fe90c0cddc` passed latest checks [36151023880](https://github.com/kelani34/slack-vibe/actions/runs/36151023880) and [36151029811](https://github.com/kelani34/slack-vibe/actions/runs/36151029811); PR #9 at `990f76f` passed hosted CI runs [36154871519](https://github.com/kelani34/slack-vibe/actions/runs/36154871519) and [36154907966](https://github.com/kelani34/slack-vibe/actions/runs/36154907966), plus GitGuardian and Vercel checks. PR #10 at `09aa5ca` passed hosted CI runs [36156507989](https://github.com/kelani34/slack-vibe/actions/runs/36156507989) and [36156547919](https://github.com/kelani34/slack-vibe/actions/runs/36156547919), plus GitGuardian and Vercel checks. PR #11 at `23ca9d4` passed hosted CI runs [36158693946](https://github.com/kelani34/slack-vibe/actions/runs/36158693946) and [36158731887](https://github.com/kelani34/slack-vibe/actions/runs/36158731887), plus CodeRabbit, GitGuardian and Vercel checks. Red/green coverage includes actor/workspace timeline and thread scope, reconnect invalidation, scoped pin/bookmark actions and channel-only bookmark loading; a PostgreSQL regression denies saved rows after workspace removal with stale channel membership. The D01 source-wide semantic-token/light-dark contrast contract, D02 source-wide icon-control naming/compact-target contract and D03 source-wide Dialog/Popover/shell/file-preview viewport regressions pass locally. D05 now has a contract test for shared timing/easing/travel/stagger tokens and reduced-motion overrides; it does not cover the full motion catalogue or browser frame performance. Browser evidence B15 verifies the first semantic pin/bookmark roles in the exact dark-theme production artifact, B16 verifies Saved Items and a populated channel after the localhost datasource reached all eight committed migrations, B17 verifies the completed dark-theme state hierarchy, B18 verifies 44×44px named composer/formatting controls at 390×844, and B19 verifies pinned-message popover/PDF preview bounds at 320×568 in that artifact. Full independent QA remains NOT RUN. Local GitHub OAuth is verified for this browser session; the authenticated workspace is reachable.

**F50 unread-inbox TDD evidence:** `getUnreadInbox` integration cases verify current workspace/channel access, eligible published-root semantics, count and earliest-unread target, cursor paging/scope, membership removal and preservation of later unread messages after an earlier read boundary. Page/component cases verify the deep link, empty state, group-DM avatar stack, explicit scoped mark-read success/error and sidebar badge. This is developer evidence for the listed slice; the live concurrent read race, page-level recovery, large-volume behavior, complete mobile/assistive acceptance and independent QA remain open.

**Search TDD evidence:** `src/lib/search-query.test.ts`, `tests/integration/message-access.test.ts` and `src/components/search-dialog.test.tsx` cover invalid dates and enums, empty/duplicate filters, reversed ranges, blank and overlong input; date-only bounds include the full UTC day; invalid input returns an explicit error and no broadened rows; the UI exposes the explanation as an alert. This is developer evidence for TC-F31-03, not independent QA. `getMessageContext` additionally has integration coverage for bounded authorized history, reply-root identity and denied/deleted/future targets; component tests cover result-to-thread routing, centered target focus, returning to latest, retrying a temporary context failure, restoring the latest timeline when the target clears, and restoring viewport after route remount. Live deep-link Back/Forward through search/saved/notification entry points, focus/scroll restoration, mobile behavior and independent QA remain open; B11 is limited to a safe workspace-route history smoke. The opt-in performance project separately seeds 100,000 authorized synthetic messages and validates six query shapes, first-action and warm timings, an eight-request burst, and natural/forced-index plans. Five local runs showed variable selective-query latency and planner choice; see [W14 measurements](performance.md#w14-fixed-fixture-search-benchmark-25-september-2026). These are not production budget results.

**W06 realtime recovery cases:** Component tests prove that an ordinary initial `SUBSCRIBED` status does not trigger a redundant request, repeated `TIMED_OUT`/`CHANNEL_ERROR` statuses coalesce into one active-timeline/sidebar/notification catch-up after recovery, and a disposed subscription cannot refresh after unmount. These tests exercise the status callback contract; actual network interruption, two-browser convergence and provider authorization remain open.

**W04 send-intent cases:** PostgreSQL regressions prove a UUID is required, identical sequential and concurrent requests share one row, changed channel/content/thread/schedule/attachment data cannot reuse an intent key, current membership is still required before a retry can return a row, and internal request hashes are omitted from reads and acknowledgements. The hook regression confirms that the failed optimistic row retains its key and successfully uploaded file descriptors, so an in-page retry sends the same payload without another upload.

Authenticated journeys, realtime policies, worker execution, storage ACLs, production builds, mobile interaction and performance budgets are **unverified**. The tests below specify future acceptance, not results already achieved.

## Test strategy

Use the smallest test level that proves the actual invariant. Test permission queries/transactions with a real isolated PostgreSQL database; mock-only authorization tests are insufficient. Use focused unit tests for filter parsing, stable ordering, event reconciliation and state transitions. Use browser tests for focus, editor behavior, routing, scroll and multi-client interactions. Load tests follow correct permissions and realistic data shape.

The project now has Vitest unit/component/integration projects and isolated PostgreSQL setup for the implementation follow-up. W01 remains responsible for completing the [Vitest/component, real PostgreSQL, Playwright and policy test foundation](tdd.md#proposed-tools-and-responsibility-boundaries), adding browser/device lanes and making discovery/failure/isolation blocking CI evidence. The user explicitly requires TDD throughout; a timebox limits the feature slice rather than permitting skipped tests or implementation-first delivery. W18 grows shared integration and release evidence from the start.

## Fixture design

Create fixtures only in an explicitly isolated test environment. Use synthetic content and generated accounts, never production messages. Two workspaces must have deliberately similar channel names to expose accidental slug/name-based access assumptions.

| Fixture | Shape | Purpose |
|---|---|---|
| Permission fixture | Workspaces A/B; owner, admin, ordinary member, removed member, outsider; public/private/archived channels | Negative access and role checks |
| Small product fixture | 10 channels, 20 users, 1,000 messages, mixed threads/files/reactions | Repeatable core journeys |
| Medium speed fixture | 50 channels, 200 users, 100,000 total messages, one 2,000-message thread | N+1 counts, bounded history and search |
| Stress fixture | 200 channels, 1 million messages, varied attachment sizes; burst up to 20 events/second in observed scope | Capacity exploration after baseline, not a promised supported scale |
| Adversarial fixture | Equal timestamps, missing/deleted targets, future schedules, malformed markup, revoked memberships | Edge and race behavior |

These fixtures are proposed test envelopes, not actual customer volume or existing production measurements.

## Security matrix

| Scenario | Expected result | Features |
|---|---|---|
| Anonymous invokes each public action | Denied or intentionally public minimal output | F01/F04 |
| Workspace B member requests A slug/channel/message | No private data, write or existence leak beyond explicit policy | F04 |
| A member not in private channel requests timeline/thread/pin/search/profile details | Denied with consistent response; private previews absent | F04/F15/F19/F31/F32 |
| Ordinary member adds/removes users or changes privacy through direct action | Rejected unless policy explicitly grants authority | F08/F09/F11 |
| Private channel self-join or cross-workspace target member | Rejected | F07/F08 |
| Reply references another channel's parent | Rejected before insert/notification | F19 |
| Pin supplied with unrelated channel ID | Rejected; no partial boolean/relation mutation | F32 |
| Forward to archived/forbidden destination | Rejected; source privacy rules enforced | F22 |
| Scheduled draft queried through detail/thread/search/events | Author-only until publication | F28 |
| Subscription from anonymous/outsider or after revocation | No unauthorized payload; renewal/catch-up also denied | F04/F26/F27 |
| Forge attachment URL/object ID or MIME/size | Rejected before message attachment finalization | F29/F30 |
| Another recipient's notification read mutation | Rejected; count unchanged | F34 |
| Script/URL/attribute payload in new/edit/system message | Inert output, allowed text preserved | F16/F18 |
| Logout/account switch | No previous-account Query/Zustand/draft/private cache visible | F01/F04/F25 |
| Feature disabled for day one | Direct route/action/transport cannot bypass gating | All cut features |

Inspect event payload arrival, not merely what the browser chooses to render. Inspect serialized server data, not merely whether the final component shows an access-denied message.

## Message and concurrency scenarios

1. Send twice with the same client intent after response loss: one database message, one recipient notification intent, one visible row.
2. Event arrives before acknowledgement, then duplicate event after acknowledgement: canonical row remains single and stable.
3. Same user has two tabs: both receive a send from either tab; own-user events are not globally ignored.
4. Remote reply arrives while channel roots are visible: reply updates parent/thread state without appearing as a root.
5. User reads old history while a new message/image arrives: visible anchor remains stable and new-message indicator updates.
6. Prepend a page with equal timestamps and a deleted boundary row: no duplicate/missing records under the defined cursor contract.
7. Edit and reaction event interleave: a partial edit patch cannot erase newer reaction data or restore an old version.
8. Revoke access during a send: server rejects or follows the documented transaction ordering; subsequent reads/events are denied and cache purged.
9. Reconnect after missing several edits/deletes: current visible state converges through bounded authoritative fetch.
10. Cancel races scheduled publication; two workers claim same due row: exactly one permitted final transition.
11. File upload completes but send fails: retry uses finalized file ownership without duplicate upload; abandoned intent is cleaned later.
12. Read cursor update races a new message: cursor represents actually viewed content and never marks unseen future rows read.

## Product and accessibility scenarios

| Journey | Required checks |
|---|---|
| Create/join | Owner/default membership, duplicate slug, repeat join, expired invite, useful landing |
| Compose | Enter vs Shift+Enter vs IME; mention selection; formatting keys; paste; disabled reason; retryable text |
| Thread/profile | Open, close, Back, direct link, refresh, invalid parent, narrow replacement, focus return |
| Search | Empty/loading/no-results/failure; rapid first-page and next-page races; stable cursor after deleted/edited rows; malformed/cross-query cursor; trigram index plan; filters invalid; old result jump |
| Saved/scheduled | Safe previews, unavailable source, cancel/edit controls only when functional |
| Keyboard | Every enabled control reachable, labels announced, Escape correct, no focus trap outside modal |
| Responsive | 320/375/768/1280/1440 widths, 200% zoom, long content, keyboard-safe composer |
| Motion | OS reduced motion, rapid repeated toggles, navigation mid-exit, no invisible blocking overlays |
| Session | Expiry while composing, logout/account switch, permission change without hard refresh |

Automated accessibility tooling can catch structural issues but cannot certify focus flow, readable motion or editor behavior. Perform manual keyboard and screen-reader checks on the primary journey.

## Performance protocol

1. Freeze commit, fixture, browser, production build, host/database region and network/CPU settings.
2. Instrument action duration, SQL count/time, response bytes, cache hits/misses, event-to-render latency and React commits. Log identifiers/categories rather than message content.
3. Run cold and warm scenarios separately: initial workspace, channel switch, thread open, send, search, history prepend and event burst.
4. Use at least 30 repetitions for an initial directional comparison; use 100+ for a more useful p95 estimate. Record the sample count and spread. Do not treat one trace as an SLO guarantee.
5. Measure rendered rows, retained pages, memory growth and subscription count after switching channels 50 times. Confirm teardown stabilizes resource usage.
6. Repeat the same scenarios after each targeted change. Compare latency and work independently; check error rate and correctness too.
7. Store trace identifiers and a compact results table with baseline/candidate, median/p95, sample count and caveats.

For a one-hour optimization window, a smaller trace comparison is directional only. Record it as such and do not claim a validated 10× universal improvement.

## Release gates

**Independent QA gate:** the [QA engineer](qa-engineer.md) verifies expected behavior, negative/failure cases, mobile and affected regression, then records candidate-specific feature/route results in the [QA checklist](qa-checklist.md). Every enabled item must pass its mandatory acceptance. Unrun or blocked checks cannot be counted as passed; defects return to development for regression-first fixes and independent retest. QG01–QG08 and a recorded GO/NO-GO supplement CI; implementation authors cannot be their sole QA sign-off.

**TDD gate:** required tests exist and pass against the candidate commit, with meaningful pre-change red evidence for new behavior/bug fixes; characterization evidence precedes pure refactors. Changed-module coverage, denied/failure/concurrency cases and F/R/MR traceability meet [TDD policy](tdd.md#coverage-policy). Missing services or zero discovered tests are failures, not green statuses. First-run failures remain visible even if a retry passes. Manual checks supplement automated coverage. Never remove a correct regression or weaken thresholds to ship.

**Mobile gate:** every enabled route records MR01–MR14 evidence from the [mobile verification matrix](mobile-responsive.md#acceptance-matrix-and-release-evidence). Include compact/tablet/breakpoint widths, keyboard-open and landscape, enlarged text, touch and assistive technology, slow network and physical iPhone/Android/tablet checks. Emulation does not replace real keyboards/media/OS behavior. A blocked Send/Leave/auth/access/destructive-confirmation path or lost draft is a release blocker for that surface, even if desktop passes.

### Restricted day-one candidate

- Core type check and production build pass, or delivery is explicitly internal/non-release.
- Enabled behaviors were developed test-first and required automated suites pass; missing test foundation makes this an internal foundation milestone, not a release candidate.
- No new lint errors in touched paths; conditional-hook errors removed from all enabled flows; remaining lint debt disclosed.
- All enabled read/write/transport paths pass access isolation and safe-content tests.
- Core compose/read/send/failure journey and account-cache reset pass.
- Keyboard/narrow/reduced-motion smoke checks pass.
- Cut features have server/route/transport denial, not only absent navigation.
- Deployment destination, environment, rollback and current limitations are recorded. No external release with unresolved tenant/content exposure.

### Complete baseline release

- All retained baseline features meet [feature acceptance](features.md), with no placeholder controls.
- Full type/lint/build pipeline passes under a documented configuration; tests run in CI.
- Every enabled requirement/route has linked passing cases, whole-app coverage ratchet meets the retained release scope and critical policy/state cases are complete; no unowned runtime code or hidden exclusions.
- Multi-client and scheduled/file concurrency scenarios pass.
- Performance budgets are measured or explicitly renegotiated with evidence; no hidden regression.
- Responsive/accessibility and motion catalogue reviewed across enabled surfaces.
- Migration replay, worker idempotency, backup/restore and rollback rehearsal pass.

## Expanded route acceptance matrix

For every R01–R78 destination in [routes](routes.md), record whether it is enabled, conditional or intentionally absent. Do not test an absent conditional billing/app route as a required baseline feature. For enabled destinations verify direct navigation, refresh, Back/Forward, loading, empty, error, account/workspace switch and narrow-screen behavior.

| New invariant | Required scenario |
|---|---|
| Legacy link compatibility | Existing channel/thread/saved/search links reach correct canonical kind and scope; reserved-slug collision resolved deliberately; no private redirect cache shared across users |
| Panel continuity | Profile/file/details opened in context then Back restores source anchor; direct-load URL renders useful full page |
| Attention state | All-unread preview does not mark everything read; personal mark-unread leaves server read cursor monotonic; thread follow/unfollow alters only user's inbox |
| Draft safety | Two tabs edit same draft; lost/revoked destination; uncertain send resolution; no fresh-ID duplicate on resume |
| Preference precedence | Account/workspace/channel rules, DND expiry, timezone/DST and OS reduced-motion preference; inbox preserved while interruptions suppressed |
| Session revocation | Revoke other session and current session; next protected request and realtime renewal fail; current-session reauth works without leaking previous account cache |
| Invitations | Accept/revoke/expire race; usage bounds; role tampering; acceptance by existing member; disabled email resend correctly omitted |
| Retrieval privacy | File/search/home counts and pagination reveal no inaccessible source metadata; expired download grant renews only with current permission |
| Governance | Ordinary member cannot access admin data; moderator can see approved report evidence without gaining channel history; audit payload omits content/secrets |
| Data/reminders | Export entitlement changes mid-job/download; final owner attempts deactivation; source removed before reminder fires; duplicate jobs remain idempotent |
| Recovery | OAuth denied, network down, realtime alone down, session expired while composing; no fabricated successful delivery or credential-filled diagnostics |
| Startup cost | New unused route groups cause no polling or eager full-history requests; primary channel budget remains intact |

## Evidence template

Record `feature/package`, `commit`, `environment`, `fixture`, `command or journey`, `expected`, `actual`, `artifact`, `pass/fail`, and `remaining limitation`. A screenshot proves appearance at one moment, not permission enforcement or message durability. A passing build with ignored types proves neither type safety nor authorization.

PR #12 at `140c52f` passed its two configured CI runs, [36162948439](https://github.com/kelani34/slack-vibe/actions/runs/36162948439) and [36162953441](https://github.com/kelani34/slack-vibe/actions/runs/36162953441), and CodeRabbit, GitGuardian and Vercel reported success. PR #13 at `17b964b` passed hosted CI runs [36163788447](https://github.com/kelani34/slack-vibe/actions/runs/36163788447) and [36163820211](https://github.com/kelani34/slack-vibe/actions/runs/36163820211), plus GitGuardian and Vercel. CodeRabbit reported that review was skipped for this base branch. The PR #13 documentation-sync head `2db5b55` also passed CI runs [36164185027](https://github.com/kelani34/slack-vibe/actions/runs/36164185027) and [36164190403](https://github.com/kelani34/slack-vibe/actions/runs/36164190403), with GitGuardian and Vercel green; CodeRabbit again skipped review. These checks do not substitute for independent QA.

**W05 identity-gate regression, 25 September 2026:** `src/components/message-list.test.tsx` now covers both sides of the contract: the paged private-history query is disabled without `currentUserId` and enabled once an actor is known. The new case first failed with the old `enabled: true` behavior. The focused file passes 12 tests; the full suite passes 286 tests across 61 files, with typecheck, lint, docs check and isolated production build passing. This is developer evidence only; independent QA remains open.

**PR #14 hosted checkpoint, 25 September 2026:** The code head `a31eaf2` passed CI runs [36164846965](https://github.com/kelani34/slack-vibe/actions/runs/36164846965) and [36164887455](https://github.com/kelani34/slack-vibe/actions/runs/36164887455), with GitGuardian and Vercel green. CodeRabbit reported that review was skipped for this base branch. This is hosted developer validation; independent QA remains open.

**W09 image validation, 25 September 2026:** the integration tests first failed because arbitrary bytes labeled `image/png` and active SVG markup were uploaded. The action now rejects both before creating the storage client, while a matching PNG signature is accepted. The focused integration file passes 6 tests. The full suite passes 287 tests across 61 files; typecheck, lint, docs validation and isolated production build pass. The test proves only leading-byte checks for raster images, not full decoding, file scanning or private delivery.

**W09 media-signature follow-up:** the integration test first failed because arbitrary bytes labeled `video/mp4` reached storage. The action now rejects the mismatch before storage access and accepts a matching MP4 file-type box. The focused upload file passes 8 tests; the current full suite passes 289 tests across 61 files. These are prefix checks; full decoding, scanning, private storage and signed delivery remain open.
