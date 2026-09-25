# Implementation plan and work packages

[Index](README.md) · [Feature requirements](features.md) · [Timeline](timeline.md) · [Testing](testing.md)

This is the active implementation handoff following the assessment round. Work is divided by observable outcome. The one-day candidate uses small portions of W01–W06, W16–W19; it does not complete all those packages in a day.

For the complete execution order use [P00–P14](delivery-plan.md), the [all-feature/route mapping](delivery-traceability.md), [concrete acceptance cases](acceptance-cases.md) and [repair ledger](repair-plan.md). Browser failures B02/B03 are W01/W19 authentication-recovery prerequisites. Package estimates below remain the allocation authority; the phase plan counts W18/W19 once as continuous work and W20 zero times.

## Working rules

The delivery team includes a [dedicated independent QA engineer](qa-engineer.md). QA reviews cases before coding, verifies each ready slice on the actual candidate, files reproducible defects, retests fixes and checks related features. Developers own TDD and supply the ready-for-QA packet. A package is not verified complete until relevant [feature/route ledger](qa-checklist.md) entries pass; the implementation author cannot self-approve independent QA. No QA process is running merely because this role is documented.

**Tests first for the whole app.** Follow [TDD strategy](tdd.md) and select the applicable [requirement test-matrix](test-matrix.md) rows before each slice. New behaviors and fixes require a test that fails for the intended reason before production behavior changes; refactors require pre-change characterization. Complete happy, denied, failure, retry/concurrency and mobile cases during the same package. Earlier minimal/discretionary testing language is superseded by the explicit user requirement.

Read the user/project instructions before implementation. Apply Ponytail and TypeScript Anti-Slop: reuse the existing stack, validate external input once, keep internal types precise, and avoid pass-through layers. Do not add abstractions merely to match the folder plan. No broad generated-code cleanup or opportunistic dependency upgrade in the one-day critical path.

For each package: establish a failing scenario or baseline, implement the smallest complete slice, verify, inspect the diff, then update the feature row and assessment status. Preserve existing user data. Schema operations require a staging migration/backup plan; a type regeneration is not a database migration.

## Work-package register

Effort is focused engineer-days for complete package scope, including local verification. Rows are distinct planning allocations; dedicated W18 covers cross-feature regression, not duplicated per-feature checks. Coordination, interruptions and external provider approval can add elapsed time. W20 is excluded from baseline totals.

| Package | Outcome | Features / findings | Dependencies | Effort |
|---|---|---|---|---|
| W01 | Reproducible build and TDD foundation: runners, isolated fixtures, discovery, coverage and blocking CI | F01/F44, A07/A22 | None | 2–4d |
| W02 | Shared authorization and action boundaries | F03–F12/F15–F38 as exposed, A01–A03/A18/A19 | W01 baseline | 2–4d |
| W03 | Verified realtime identity and policies | F04/F26/F27, A04/A12 | W02 | 1–3d |
| W04 | Correct core message path and safe content | F02/F15–F19/F21, A05/A07/A16/A20 | W01/W02 | 2–3d |
| W05 | Query/loading/refresh improvements | F12/F15/F24/F43, A10/A13/A14 | W02/W04 | 1–2d |
| W06 | Realtime reconciliation and read/presence correctness | F17/F19/F20/F24/F26/F27/F38, A10–A12 | W03/W04/W05 | 2–4d |
| W07 | Reliable scheduled delivery | F28, A08/A09 | W02/W04/W06 | 2–4d |
| W08 | Stable large history and deep-link windows | F15/F19/F23/F43, A14/A15 | W04/W06 | 2–3d |
| W09 | Private file lifecycle | F29/F30, A06 | W02/W03 identity decision | 2–4d |
| W10 | Consistent edit/delete/reaction/pin/save semantics | F10/F12/F18/F20/F32/F33, A19/A20 | W02/W04/W06 | 1–2d |
| W11 | Notification correctness and ownership | F21/F34, A08/A19 | W02/W04/W06 | 1–2d |
| W12 | DMs, member-directory entry and forwarding | F06/F13/F22, A17/A21 | W02/W04/W06 | 1.5–3d |
| W13 | Composer, drafts, profile and hide-user completion | F06/F16/F21/F25/F36–F38 | W04/W09 policy | 1.5–3d |
| W14 | Search and command navigation | F23/F31/F39/F43 | W02/W08 | 1.5–3d |
| W15 | Workspace/channel administration | F03/F05/F07–F11, A18/A21 | W02/W10 | 2–4d |
| W16 | Product UI, responsive layout and accessibility | F39–F41, A21 | W04; coordinate each enabled feature | 2–3d |
| W17 | Shared motion system and cross-feature animation quality gates | F30/F42; feature packages own domain transitions | W16 plus relevant feature; motion acceptance tests are part of each package | 4–7d for tokens, primitives, orchestration prototypes and core surfaces; feature-specific work is estimated in its owning package |
| W18 | Shared cross-feature test program: browser/mobile, policy, mutation, performance and recovery gates | F44 | Starts with W01; grows with each feature; release evidence after enabled slices | 5–9d |
| W19 | Deployment, observability and recovery | F45, A22 | W01/W02; coordinate schema changes | 1.5–3d |
| W20 | Historical expansion discovery, now allocated below | F14/F35/F46–F48 | Superseded by W31–W39 | No separate allocation |

### Added production scope: incremental packages

The original W01–W19 estimates cover the original assessment. The following estimates add the new product surfaces from [routes](routes.md) and F49–F68. They assume those original domain capabilities are complete and reuse their implementation; they do not charge a second time for core DMs, uploads, drafts or search. Ranges remain low-confidence until the first complete vertical slice is measured. Cross-feature verification for these additions is included here rather than assumed free in W18.

| Package | Incremental outcome | Features | Dependencies | Effort |
|---|---|---|---|---|
| W21 | Canonical routes, compatibility, onboarding, workspace chooser and help/recovery | F56/F64/F68 | W01/W02/W04/W16 | 2–4d |
| W22 | Home, unread/thread/DM inboxes and draft/compose center | F49–F53 | W05/W06/W08/W12/W13/W21 | 3–5d |
| W23 | Notification preferences, personal settings, effective session revocation and expiring status | F57–F59/F67 | W02/W03/W11/W13/W16 | 2–4d |
| W24 | File/search destinations, Later triage and channel resource collection | F54/F55/F65 triage/F66 | W09/W10/W14/W21 | 2–4d |
| W25 | Invitation lifecycle console, admin overview and audit UI | F60/F61 | W02/W15/W19/W21 | 2–4d |
| W26 | Moderation cases, data requests and personal reminder lifecycle | F62/F63/F65 reminders | W07/W09/W11/W19/W21/W23/W25 | 3–6d |

W21–W25 total 11–21 additional days and include the audit UI as a small P2 companion to the admin work. W26 is later maturity, 3–6 days. Billing, app marketplace, group-DM policy, identity-provider migration and broad enterprise compliance remain outside these estimates.

#### W21 acceptance and rollback

Introduce canonical link construction and compatibility redirects without creating a second route implementation per screen. Test global/legacy slug collisions, invalid parameters, direct loads, panel fallback and Back/Forward. Onboarding is resumable and optional preferences are skippable. Help diagnostics redact sensitive data. Roll back redirects/navigation separately from content; legacy links and saved drafts must remain usable.

#### W22 acceptance and rollback

Use bounded authorized summary queries; one unread contract feeds Home/navigation/inbox. Add explicit thread subscription and personal attention state. Draft and uncertain-send lists never replay an already-committed message with a new intent. Test live update ordering while focused, role removal and shared-account tabs. Gate a new inbox if faulty without disabling the underlying conversation.

**Current F50 slice (25 September 2026):** `/[workspaceSlug]/unreads` is available on the existing workspace route structure. `getUnreadInbox` requires current workspace membership, filters to current channel membership and eligible published root messages, returns the earliest unread message ID and count, and pages by a bounded actor/workspace-scoped keyset cursor. The page links to that unread message, offers an explicit per-channel mark-read action, displays group-DM participant stacks, and leaves read state unchanged when the overview opens. The sidebar links to the inbox and shows its current projected unread total. PostgreSQL integration tests cover authorization, root-message semantics, count/first-message selection, cross-workspace cursor rejection, membership removal and read boundaries; component tests cover page links, empty state, group avatars, scoped action success/error and sidebar count. The complete F50 acceptance set remains open: live race ordering, error recovery, large data, mobile/keyboard/screen-reader validation and independent QA have not been established. This is a partial work-package result and does not close P04 or W22.

#### W23 acceptance and rollback

Specify notification precedence and persist validated preferences. Add the server-backed session identity/revocation mechanism needed by JWT sessions before showing device controls. Revocation must affect protected requests and realtime reauthorization. Test DND expiry/timezones and OS reduced-motion precedence. Rollback keeps revoked sessions denied; do not restore old stateless acceptance behavior after a security rollout.

#### W24 acceptance and rollback

Promote existing loaders into file/search detail and listing routes with current access predicates. Extend personal saved-item state and channel resources only where their semantics differ. Test private-file counts, query restoration, original-message links and removal after revocation. Rollback removes destination navigation while preserving bookmarks and canonical message/file records.

#### W25 acceptance and rollback

Build lifecycle UI on existing invitation/role operations, adding durable invite state and audit metadata where missing. Test concurrent accept/revoke and bounded usage limits. Audit views expose only permitted metadata; admin summaries do not introduce private-message access. Rollback never re-enables expired/revoked invitations or deletes historical audit evidence.

#### W26 acceptance and rollback

Define moderator evidence visibility and data-export entitlement before implementing queues/forms. Use bounded background jobs, expiring download grants, idempotent reminders and requester-only status. Test report duplicate submission, export privilege changes, deletion/ownership safeguards and reminders after source removal. Pause jobs and gate new submissions on rollback; preserve request state. Destructive retention/deletion execution requires a separately settled product policy.

## Package details

### W01: checks and build

Continue hardening the TDD harness in [tdd.md](tdd.md): verify disposable database identity, synthetic fixtures, required-test discovery, hosted CI failure propagation and a complete-source coverage inventory. The Vitest unit/component/integration projects and isolated PostgreSQL test setup already exist. Every slice starts with an observable failing behavior test; type/lint/build diagnostics remain separate checks, not substitutes for tests. No feature behavior is exempt from red → green → refactor.

**Current evidence:** the latest complete Vitest unit/component/integration run passed 257 tests across 57 files; focused search/DM/avatar/message-access/context tests pass 83 cases across 10 files, and current typecheck, production build and lint pass. GitHub Actions run [36129226838](https://github.com/kelani34/slack-vibe/actions/runs/36129226838) passed every configured gate on hosted baseline commit `0d02ee0`; deliberate hosted failure propagation remains open. The deprecated Next.js 16 middleware convention is migrated to `src/proxy.ts`; tests cover protected-route redirects, matcher behavior, safe same-origin return-path handoff, allowlisted auth-error feedback, authenticated login callback redirects, the account-menu sign-out action and actor-scoped local draft cleanup on logout. Local browser evidence B07–B09 verifies sign-in return, logout and post-logout protected-route denial. Full-repository lint is locally clean (initial baseline: 84 errors and 32 warnings); W01 remains open until expiry/provider-error recovery is independently checked and deliberate test failure propagation is demonstrated.

Inspect both lockfiles and choose one package-manager authority based on repository practice; document it rather than casually deleting a lockfile. Regenerate Prisma against the committed schema and verify the four observed preference errors. Fix one canonical `/` route owner. Repair conditional hooks in ChatPanel and any analogous enabled path. Remove `ignoreBuildErrors` only when the genuine type check is green. Run a production build in an output/worktree arrangement that does not disrupt the active dev server.

Acceptance: reproducible install/generate/typecheck/build, no conditional-hook error on membership transitions, captured lint baseline with no hidden failures. Full package includes resolving lint failures or making narrowly justified rule decisions, not broad disabling. Rollback: code/config reversion; no data migration is required for client regeneration alone.

### W02: access boundary

Inventory every exported action and route query. Establish actor/workspace/channel/message access functions or predicates where they embody shared policy. Apply [security matrix](security.md) across alternate paths, not just the main timeline. Move `createNotification` to a server-only internal module. Validate target-user membership, parent/channel/pin relationships, posting modes and archive rules. Replace full user/workspace payloads with intentional projections.

Day-one cut: explicitly deny incomplete features at the public server boundary and their routes/transports. Acceptance: two-workspace/private-channel negative matrix passes; a hidden button is never considered sufficient. Rollback must preserve denial behavior; never restore an unsafe public endpoint just to restore a feature.

### W03: realtime access proof

Inspect actual grants, policies, token/session identities, publication tables and storage policies in an authorized test environment. Test authenticated and anonymous browser clients. Align schema column names. Choose identity integration and keep service role private. Capture membership removal behavior on an already-open subscription, including token/topic refresh. If this cannot pass in its day-one timebox, disable the insecure transport and use the documented internal polling fallback.

Acceptance: inaccessible payloads never arrive, including scheduled drafts, profiles and reactions. Reconnect and expiry are exercised. Rollback: feature-gate transport off; retain authorized reads. Do not weaken RLS for a demo.

### W04: core correctness

Fix workspace creator memberships transactionally. Define one typed public message shape and use it for initial history, send acknowledgement and detail reads. Sanitize content and render system events safely. Enforce root/thread relationships and published-only eligibility. Introduce a stable send intent and unique dedupe constraint through a reviewed migration where feasible. Fix editor pending/error behavior and preserve recoverable user input.

Acceptance: owner reaches a usable channel; unauthorized sends fail; retries and acknowledgement/event race produce one message; script-like content renders inertly; no message loss after explicit failure. If idempotency cannot be safely completed in the one-day slice, disable automatic retries and classify ambiguous sends for verification rather than claiming delivery correctness. Rollback: compatible application code plus retained dedupe constraint; do not drop user data.

**Current W04 progress, 24 September 2026:** Interactive sends now receive a client-generated UUID that stays on the failed optimistic row and is reused by Retry. Migration `20260924230000_message_send_idempotency` adds the actor/key uniqueness constraint and payload hash; the action requires a valid key, checks membership before replay lookup, returns one canonical message for sequential and concurrent identical requests, rejects changed payloads and keeps the hash out of read results. The hook retains successful attachment uploads across an in-page retry. Red/green PostgreSQL cases cover retries, concurrency, changed channel/content/thread/schedule/attachment payloads, missing/invalid keys, access revocation and hash privacy; a component hook case covers key and upload reuse. Other message writers still need separate idempotency review. Full W04 is still open for canonical message-shape cleanup, scheduled publication, durable offline recovery, complete upload finalization/cleanup and independent QA.

### W05: high-return speed

Record request/SQL count, replace per-channel unread counts with one scoped aggregate, stop full-route refresh on ordinary message/read updates, and narrow projections. Hydrate the first authorized page only after the cache contract is stable. Replace notification history scans with access-filtered bounded page queries and relational read updates.

Acceptance: same-fixture query counts and traces improve, counts remain correct for schedules/replies/own messages, cold and warm timings reported separately. Rollback: switch to the prior authorized query path if aggregation semantics fail; never cache incorrect counts to mask it.

**Current W05 progress, 24 September 2026:** Channel unread counts now use one actor-scoped aggregate instead of one count per channel; a 50-channel PostgreSQL fixture verifies published root-only semantics and its test asserts one aggregate call. A local instrumented run observed four SQL statements for that channel-summary request. The DM inbox now selects its stable activity cursor page in SQL before hydrating details for only that page. Notification inbox loading filters message/channel access before pagination, returns only the requested page and a total visible unread count in one SQL query, and caps requests at 100 rows. Marking one channel's notifications read uses one membership-scoped relational update instead of loading every message ID. Ordinary message arrival, send, edit, delete, pin/unpin and read no longer invalidate the full route tree; scheduled-message creation, edit, cancel and send-now use bounded client queries; channel and DM mutations, profile edits and workspace creation use targeted client refresh or navigation without broad server invalidation. Notification preferences persist without route invalidation, and joining an invite relies on the successful action redirect instead of refreshing invite/workspace route trees. Focused read-cursor writes are coalesced over a 250 ms quiet window. `getChannels` selects sidebar columns plus only the viewer's read cursor, requires workspace and channel membership, and loads participant/profile rows only for direct channels; search and forwarding destination lists select only channel IDs/names. A stale channel-membership row cannot bypass workspace removal. The sidebar maintains local unread counts while the focused conversation subscription exclusively owns timeline hydration; a bounded 500-ID seen set suppresses repeated inserts before detail fetch and releases failed fetches for retry. Component regressions first failed on the old relay and duplicate same-subscription delivery, then passed with one fetch per ID. Migration `20260924210000_messages_channel_activity_idx` adds the message activity index; `20260924220000_notifications_inbox_indexes` adds actor-scoped activity and unread indexes. TDD covers 26 DM summaries across two cursor pages, notification filtering before pagination, updates that preserve unrelated private rows, unread projection rules, workspace-membership revocation, narrow picker/sidebar projections, single-owner event hydration, invite membership and preference persistence without broad invalidation. These are local developer checks; no production p95 or cold/warm latency profile has been captured, and they do not prove a 10× wall-clock improvement.

**W05 search update, 25 September 2026:** The command-search client now ignores results, errors and loading completion from superseded or closed queries. Member suggestions load only for `from:`, channel suggestions only for `in:`, and plain text does not fetch either list. Prisma search results select only message ID/channel ID/content/time and author/channel names; a PostgreSQL case proves attachment, reaction, email and full channel fields are not returned. Red/green evidence covers TC-F31-04 and the projection portion of TC-F31-07; indexed plain-text search, scoped result caching and latency measurements remain open.

Search suggestions now fetch only the member list for `from:` or channel list for `in:`; opening or using plain text search does not fetch either list. Component tests cover both filter branches and the zero-extra-context-fetch plain text path. No suggestion-result cache or indexed plain-text query has been added.

**Remaining W05 work:** finish remaining cache contracts; audit profile/member/search/starred-item list projections; exercise the new status-based catch-up under real network loss and multi-tab load; trace first-page hydration and mounted-shell burst behavior; run production-build cold/warm timing and `EXPLAIN (ANALYZE, BUFFERS)` on fixed seeded fixtures; establish payload, request and query budgets; and verify cache invalidation after account switch, membership removal and concurrent read changes. W05 stays open until those measurements and independent QA are recorded.

### W06: event and cache coherence

Remove duplicate window relay/direct handling, establish one event owner, dedupe before hydration, accept own-user remote events, distinguish roots/replies/publication, and reconcile updates/deletes/reactions across views. Add reconnect catch-up, visibility-aware read marking and ephemeral typing scope. Presence requires multi-device/expiry semantics rather than setting a database field ONLINE forever.

**Current W06 progress, 24 September 2026:** The AppSidebar-to-window message relay is removed; the focused MessageList owns timeline detail hydration while AppSidebar updates unread summaries. A bounded 500-ID seen set suppresses repeated INSERTs before fetch and releases IDs on fetch failure. The list now rejects inserts that are not explicitly root, unscheduled and non-deleted, preventing replies and scheduled drafts from appearing as root history. A published-reply listener invalidates only the exact thread and channel timeline query keys, so duplicate prefix invalidation does not trigger redundant refreshes; scheduled and soft-deleted rows are ignored. After Supabase reports a timeout, channel error or close, a later successful subscription now triggers one active-timeline refetch plus sidebar and notification summary recovery; ordinary initial connection does not fetch again, repeated failures coalesce, and disposed subscriptions ignore late callbacks. Red/green component/hook tests cover relay removal, duplicate ID delivery, replies and scheduled rows, same-user second-tab event acceptance, thread/root cache invalidation, event/ack reconciliation and reconnect-status recovery. A component regression proves a second tab accepts the viewer's own event; a hook regression proves an event-before-ack race removes the optimistic duplicate, while an acknowledgement-before-event cache check skips detail hydration. Still open: actual browser two-tab/drop/rejoin evidence, live cross-view behavior beyond these targeted cache keys, UPDATE/DELETE/reaction ordering under an outage, event authorization and live membership revocation.

Acceptance: two tabs/two accounts, lost connection, out-of-order/duplicate event, permission removal and publication tests pass. Rollback: disable live mode and use the bounded authorized fallback while preserving send acknowledgements.

### W07: scheduled publication

Choose one worker and explicit publication lifecycle; migrate existing rows safely. Add claim, publish-time authorization, cancel/send-now race control, deduplicated notifications, attempts/failure visibility and timezone validation. Complete workspace schedule actions and safe preview.

Acceptance: no pre-delivery leaks through timeline/thread/search/events/notifications; repeated worker invocation produces one publication; cancelled or revoked work is not sent. Rollback: pause the publisher, retain pending rows, report delayed delivery; never mass-publish drafts to clear a queue.

### W08: history and context

Use total ordering and explicit cursor response; paginate threads; implement target-message context windows; preserve anchors through prepend/media/edit/delete. Add measured windowing/virtualization only after these invariants pass, preserving keyboard focus and selection.

Acceptance: thousands of fixture messages, equal timestamps, deleted cursors, old permalinks and large attachments produce no missing/duplicate rows or forced bottom scroll. Rollback: bounded paginated non-virtual list remains available.

### W09: files

Unify upload entry points. Implement authorized intents, private storage grants, bounded direct transfer, metadata verification, attachment finalization, renewal and orphan cleanup. Decide allowed file types and scanning policy before enabling arbitrary uploads. Replace canonical public URLs with object references using a staged migration.

Acceptance: failed send retains usable upload intent; cross-channel object injection fails; revoked/expired download grants cannot be renewed; memory does not scale as the sum of all uploaded buffers in the app server. Rollback: disable uploads, keep authorized existing downloads if safe, preserve objects.

### W10: message actions and personal references

Consolidate bookmark loaders and leave semantics. Choose tombstone behavior, preserve child thread meaning, maintain pin consistency, make reactions/bookmarks/stars retry-safe, and invalidate every affected view. Verify role changes and deleted sources.

Acceptance: channel, thread, saved, pinned and search representations agree; no stale private previews; repeated desired-state writes are idempotent. Rollback: remove incomplete controls and deny their actions while maintaining reads.

### W11: notifications

Move records/counts to Query; add workspace/channel context, dedupe keys and bounded pagination. Create notifications only for accessible published resources. Unify returned-error and thrown-error handling so optimistic read changes can recover. Keep deleted-resource copy useful without leaking removed content. Do not show email/push promises without delivery support.

Acceptance: repeated send/reaction/worker events do not duplicate notification intent; read failures reconcile; recipient cannot alter another recipient's records. Rollback: gate activity feature without interrupting canonical messages.

### W12: conversations and forwarding

Add distinct conversation kind and unique DM pair key. Audit legacy private channels before classifying any as DM; two members alone is insufficient proof. Wire hover-card, profile and inbox entry points to the same operation. Forwarding validates source access, destination membership/posting rules and the private-source policy; use safe structured attribution. The current implementation slice has landed the `DIRECT` enum/migration, pair-keyed one-to-one creation, participant-aware sidebar/header/composer, the access-checked inbox with unread/cursor views, bounded one-to-one/group recipient creation, and creator rename/leave controls that identify groups by their null `directKey` rather than current participant count. Integration tests verify a group remains manageable at two active members after a departure and that one-to-one conversations remain excluded from group-only actions. Use the [DM contract](direct-messages.md) for ambiguity migration, participant revisions/history, privacy and mobile work.

Acceptance: concurrent DM requests return the same channel; private group channels are never reused as DMs; forward cannot bypass archive/posting rules. Rollback: gate DM creation/forwarding, preserve existing conversation records.

### W13: everyday composition and identity

Add scoped draft handling, IME and mention keyboard correctness, cached member suggestions, safe profile edits and hidden-user management. Ensure sender/avatar fields update without full reload. Do not add durable local private-content persistence without a logout/revocation policy.

Acceptance: navigation and failed sends do not lose draft text; suggestion requests are bounded; hidden-user behavior agrees across enabled surfaces. Rollback: retain in-memory draft capability and safe default display.

### W14: search

Correct access and stale-result races first, then complete the search projection and old-message jump. The current slice binds keyset cursors to actor/workspace/query, uses `(createdAt,id)` seek pagination so a deleted boundary does not break later pages, appends pages in the dialog and rejects stale next-page responses. The pure typed-filter parser enforces a 500-character bound, allowlisted filters, one occurrence per filter, strict ISO dates with timezone-qualified timestamps, valid ordered ranges and inclusive UTC calendar-day bounds; invalid input returns an accessible validation message before database query construction. Migration `20260925010000_message_content_trgm_search_idx` adds a `pg_trgm` GIN index for the existing case-insensitive substring predicate, with an `EXPLAIN` integration regression. Selecting an old result now retrieves at most 50 authorized chronological root messages, opens the parent thread for replies, focuses and scrolls to the target and can restore the prior timeline. A transient context query failure has a distinct retry path; denied/deleted/future targets remain neutral. The opt-in `npm run test:performance` seeds 100,000 messages and measures selective, short, common, channel, author and date search plus an eight-client burst. Five local runs show selective-query warm p50 between 12.08ms and 52.47ms and natural GIN plan selection in two runs; see [performance evidence](performance.md#w14-fixed-fixture-search-benchmark-25-september-2026). The `message` query remains in browser history until the user exits. Same-conversation Back restores the latest timeline; Forward reopens the target; Return to latest clears only `message` and preserves `thread`. A bounded per-tab viewport map stores scroll/focus by actor/workspace/conversation without message content. Component regressions cover target removal and route remount; live deep-link Back/Forward, focus/scroll restoration and mobile QA remain open. This indexes sanitized stored HTML; normalized plain-text search, query caching and independent QA remain open. Keep command selection immediate and accessible.

Acceptance: inaccessible/future messages never appear; rapid typing cannot restore older results; filters are explicit; target jump resolves without loading all history. Rollback: secure bounded substring search may remain if it meets scale requirements.

### W15: administration

Implement truthful invite copy/rotation, owner safeguards, scoped role changes, metadata validation, selected-poster management, archive/privacy transitions, member removal and deletion policy. Make administrative capabilities explicit; audit consequential writes. Do not expose workspace deletion until recovery/retention semantics are agreed.

Acceptance: role matrix tested, last owner preserved, existing sessions lose effective access, invalid privacy changes fail atomically. Rollback: read-only settings plus server denial of incomplete mutations.

### W16 and W17: UI and motion

Apply [design](design.md) to the enabled features: shell geometry, state vocabulary, mobile details, focus/labels and no dead controls. Apply [animation](animation.md) as a shared system plus feature-owned transitions, each with TDD coverage. Prototype and profile coordinated motion before selecting any runtime; the one-day restricted slice uses only the motion behaviors required by its enabled surfaces.

**Current W16 evidence:** D01 now defines measured light/dark saved, pinned, unread, success, warning, favorite and message-target roles across messaging, notifications, presence, scheduling and navigation; its contract calculates applicable text/icon/badge contrast and rejects raw app-owned palette bypasses source-wide. D02 exposes message actions to keyboard and compact touch users, inventories accessible names for every app-owned icon Button and native icon-only button, and enforces 44px compact targets through shared Button/Toggle variants; exact-artifact evidence covers the composer and formatting toolbar at 390×844. D03 gives the workspace, shared Dialog/Popover primitives, Activity, channel details and file preview dynamic viewport bounds; exact-artifact evidence covers a 320×568 pinned-message popover and PDF preview. D04 now applies reduced-motion-aware skeleton states to profile, thread and channel-member loading; retryable profile, thread, current-member, add-member and forwarding destination query errors; cached-content retention; and forwarding loading/empty feedback, with component evidence. The remaining route-state inventory and browser/independent QA are open. The [design audit](design-audit.md) keeps the remaining light/forced-color, keyboard/focus, assistive-technology, tablet, device, zoom and independent-QA work open.

Acceptance: keyboard/narrow/zoom/reduced-motion core journeys pass; no motion delay or scroll jump; every enabled control has useful states. Rollback: static transitions and simpler layout retain all functionality.

### W18: regression evidence

W18 begins during W01 and continues through every package. Own shared CI lanes, real-service policy verification, multi-client/device fixtures, coverage reporting, targeted mutation checks and restore/load orchestration. Individual feature tests remain in their feature estimates; W18 is shared infrastructure and cross-feature proof, not duplicated authoring or an end-of-project testing phase. Its range is revised to 5–9 days; provider/device availability remains an external constraint.

Create tests around high-risk invariants rather than mirrors of implementation. Start with real isolated database permission/send tests, then browser journeys for focus/scroll/multi-tab. Add CI scripts and retain reproducible fixtures/traces. No tests may target a production database by default.

Acceptance: [release gates](testing.md) are repeatable and failures visible. Rollback: a failing release is held; test removal is not a rollback strategy.

### W19: deployability

Choose package manager, runtime/provider and regions; document environment variables without secrets. Establish migrations, worker deployment ownership, private storage policies, secret rotation, logs/metrics, backup/restore and rollback. Verify Sentry or another existing-compatible error sink is actually wired before relying on it.

Acceptance: staging deploy from documented steps, smoke tests, authenticated worker, successful restore exercise before broader release, operator-visible errors without message-content logging. Rollback: previous compatible app build and paused new worker; use forward fixes for destructive schema mistakes.

### W20: expansion

Historical discovery placeholder. The latest user request now scopes these capabilities: W39 covers group DMs, external notifications and bounded offline use; W36 covers integrations; W31–W38 cover calls, meetings, meeting AI, clients and enterprise features. Their documents and incremental estimates supersede this placeholder without double-counting W20.

## Additional collaboration packages

F69–F78 are specified in [collaboration feature design](collaboration-features.md). These allocations include UI, data migration, feature-level permission/concurrency tests, performance checks and cross-feature integration. They assume the listed earlier dependencies work; they do not re-estimate those foundations. Ranges are low-confidence planning estimates, not measured velocity.

| Package | Outcome / features | Dependencies | Incremental effort |
|---|---|---|---|
| W27 | Polls F69, static custom emoji F71, keyword rules F77, saved searches F78 | W04/W06/W09/W10/W11/W14/W23; W15 for emoji administration | 6–10d |
| W28 | Record, preview, upload and play accessible voice notes F70 | W04/W09/W13/W16; approved supported-browser/codec matrix | 3–5d |
| W29 | Groups F72, fixed channel templates F73, announcement acknowledgements F74 | W04/W06/W11/W15/W25; template task seeding waits for W30 | 5–9d |
| W30 | Message-linked tasks F75 and versioned channel notes F76 | W08/W14/W21/W24; W26 when task reminder delivery is enabled | 7–12d |

**W27 sequence and acceptance:** saved searches → static emoji → polls → keyword matching. Demonstrate current-access search on saved filters, historical retired-emoji fallback, concurrent vote/close behavior and deduplicated alerts outside the send critical path. Rollback by feature-level write gates; preserve ballots, personal rules and saved filters. Never fall back to unscoped search or public emoji storage merely to keep a picker working.

**W28 sequence and acceptance:** tested capture/codec prototype → existing private attachment integration → accessible playback → failure and cleanup checks. Verify permission denial, device changes, duration/size limits, cancelled capture cleanup and upload retry with no lost composer text. Rollback removes new recording while preserving authorized playback of existing recordings. Automatic transcription and transcoding services are not included.

**W29 sequence and acceptance:** group membership and mention authority → bounded publication fanout → fixed templates → versioned acknowledgement flow. Verify role changes, membership snapshots, scheduled group mentions, duplicate notification reasons and edits requiring re-acknowledgement. Rollback stops new group fanout/template creation/acknowledgement requests independently; historical messages remain readable without stale permission grants.

**W30 sequence and acceptance:** task lifecycle and direct routes → source access/reminders → notes, explicit-save conflicts and revisions → search/resource integration. Verify denied task assignment, due-date timezone behavior, source removal, concurrent edits and authorized revision restoration. Rollback freezes writes and pauses new reminder jobs; preserve task/note records and revisions. Live coediting and a project-management engine are excluded.

Group DMs, email/push and offline use remain separate from W27–W30; their implementation allocation is now W39, and integrations use W36. The [DM contract](direct-messages.md) owns the participant/history boundary, notification privacy, offline outbox and DM-specific QA sequence.

## Full communication platform packages

The user has explicitly requested voice/video and production-grade Slack/Discord breadth. [Calls and meetings](calls-and-meetings.md) and [production platform](production-platform.md) are the acceptance contracts for these packages. W20's catch-all discovery is superseded for the now-defined features; it is not a second implementation allocation.

| Package | Outcome | Requirements | Dependencies | Incremental effort |
|---|---|---|---|---|
| W31 | Voice/video, huddles, screen share, persistent rooms and call history | F79–F83/F89 | W02/W03/W06/W12/W19; RTC provider validation | 12–22d |
| W32 | Events, recurring meetings, calendar sync and RSVP/reminders | F85–F88 | W31 join model; W11/W23/W26 job foundation; calendar provider setup | 6–10d |
| W33 | Live captions, consented recording and transcript/summary artifacts | F90–F92 | W31/W09/W26; speech/recording processors and privacy mode decision | 8–16d |
| W34 | Forums, categories, roles, screened communities, safety and stages | F84/F93–F95/F98–F100 | W02/W08/W15/W25; W31 for stage transport | 8–14d |
| W35 | Scoped guests and bilateral shared channels | F96/F97 | W34 access policy; W09/W11/W31/W37 retention policy alignment | 8–16d |
| W36 | Bounded workflows, app installation and commands/webhooks | F47/F101–F103 | W11/W15/W19/W25; authority/job contracts | 10–18d |
| W37 | Bounded import, SSO/SCIM and retention/hold administration | F104/F105/F108 | W02/W19/W25/W26; selected identity provider and retention policy | 12–24d |
| W38 | Initial dedicated clients, localization and optional translation | F106/F107 | Stable W31 media and W39 notification/API contracts; native/provider prototype | 15–30d |
| W39 | Group DMs, external notifications and bounded offline text outbox | F14/F35/F46 | W06/W11/W12/W13/W23; device privacy/storage policy | 14–26d |

**Current W39 progress, 24 September 2026:** Group creation now requires a client intent UUID and persists it with a private hash of the authenticated creator, workspace, normalized participant set and display name. A unique constraint plus reconciliation returns one canonical group after a concurrent or lost-response retry; changed intent and cross-creator reuse conflict, and ordinary Prisma reads omit both private fields. The client persists the exact pending request key in the actor/workspace-scoped draft namespace, reuses it after remount/reload, removes it after success and purges it on logout. Adding someone creates a new conversation generation; a PostgreSQL regression confirms the new participant can read the new generation but receives no messages from the prior group's history. Group avatars keep a two-layer surface at one active member using a neutral group marker and a truthful active count. Focused database and component regressions pass. In-place participant revisions, broader lifecycle/privacy QA, independent QA, external delivery and encrypted offline outbox remain open. The full local candidate passes 173 tests across 45 files, typecheck, lint and production build.

W31 first validates provider admission/revocation and two-person audio, then adds video/share, rooms/huddles and history. Gate each step on device/network and actual media tests. W32 starts with app-owned events and calendar export, then recurrence and opted-in provider synchronization; cancellation/reschedule tests precede external reminders. W33 is a separate consent/data-processing release, not a toggle silently enabled with calls.

W34 migrates permissions before enabling community joins or stages. W35 requires an agreed shared-channel data policy; its dependency on W37 is the retention policy contract, not completion of SSO/import tooling. W36 implements a bounded set of workflow steps and a curated app list, not a general script runtime or public marketplace. W37's import estimate covers one declared format and initial identity-provider integration, not every enterprise migration scenario.

W39 can start after its messaging dependencies in parallel with the RTC program when staffing permits; it must precede native notification completion in W38. W38's estimate is preliminary and assumes reuse of one cross-platform approach, existing APIs and modest first-client functionality. Replace it after platform/media prototypes. Store review, legal/compliance review, procurement, provider approvals and certification are external elapsed time, excluded from these engineering ranges.

Each package includes feature-specific migration, UI, permission/failure tests and integration verification. Rollback gates new actions, stops affected queued work and preserves records; revocation remains enforced even while a feature UI is disabled. Do not start implementation in this documentation round.

## Handoff checklist

Supply QA with the exact candidate build/config/schema/flags, F/R/W/MR mapping, isolated fixture access, expected outcomes, CI/red-green artifacts and known limitations without committing credentials. QA returns PASS/FAIL/BLOCKED evidence and defect links, then independently retests the fixed build and regression scope. Assign the executor before verification begins and preserve run history; no inferred or inherited PASS without impact review.

Include the applicable matrix cases, intended red result, passing candidate-commit evidence, coverage/exclusion diff and relevant CI/provider/device runs. A package cannot close when its implementation works only manually or tests are promised later. Bootstrap/state that is still untested remains explicitly incomplete.

Every task cites the applicable [MR01–MR14 mobile criteria](mobile-responsive.md#acceptance-matrix-and-release-evidence), includes compact/tablet reference states and records mobile failure-path evidence. W16 owns the shared shell/touch/viewport foundation, W08/W13 the scroll/composer behavior, W18 cross-route physical-device validation, and each feature package its own adaptive screens. W38 is dedicated clients, not the owner of all mobile responsiveness. Existing estimates must be revisited after the device audit; do not duplicate responsive effort or treat it as free final polish.

Each implementation task should cite feature IDs, findings addressed, data migration, permission impact, cache events, UI/motion rows, test scenarios and rollback. Update [timeline](timeline.md) from actual evidence after each milestone. Do not start unrequested expansion work; continue only within the active user-authorized implementation scope.
