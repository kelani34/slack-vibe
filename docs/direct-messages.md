# Direct messages: current contract and exploration plan

[Index](README.md) · [Feature register](features.md) · [Collaboration features](collaboration-features.md) · [Calls and meetings](calls-and-meetings.md) · [Routes](routes.md) · [System design](system-design.md) · [Architecture](architecture.md) · [Performance](performance.md) · [Mobile](mobile-responsive.md) · [TDD](tdd.md) · [QA checklist](qa-checklist.md)

## Purpose and status

This is the DM-specific product and engineering contract for F13 one-to-one DMs, F14 group DMs and F52 the DM inbox. It also identifies the DM surfaces that share the general message, notification, file, scheduling, call, mobile and governance contracts. It is the place to decide DM behavior before adding more controls to the conversation header or sidebar.

The current branch contains a verified **core DM implementation slice** covering one-to-one creation, the inbox, bounded group creation and first group lifecycle actions. It does not contain a production-complete DM product. The implementation slice has developer test evidence, while the independent QA ledger remains **NOT RUN**. Every item marked proposed, open or planned below requires a red test, implementation, green test, mobile evidence and independent QA before it can be called complete.

| Area | Current state | Authoritative follow-up |
|---|---|---|
| One-to-one creation | Implemented slice: authenticated workspace members can open one canonical pair conversation; self, outsider and removed-target cases are denied | W12 / F13 / [acceptance cases](acceptance-cases.md#f13-one-to-one-dms) |
| Conversation kind | `ChannelType.DIRECT` migration is applied; legacy `PRIVATE` channels whose names begin with `dm-` remain readable during migration | [decisions](decisions.md) and [system design](system-design.md#current-data-model-and-required-evolution) |
| Sidebar | Implemented slice: DMs are separated into **Direct messages**; one-to-one rows show the peer avatar, while group rows show at least two overlapped, front-to-back layered member avatars and the conversation name | W12, W16 / [design](design.md) |
| Member directory entry | Implemented slice: workspace membership is checked before listing people, and each other member has a preselected **Message** action that reuses canonical DM creation | W12 / F06/F13 |
| Inbox and conversation header/composer | Implemented slice: inbox rows and conversation headers use a peer avatar for one-to-one DMs and a stacked set of at least two member avatars for groups, including the viewer when a group has only two active members; the composer uses `Message <display name>...`, account-scoped local drafts restore/clear per conversation/thread and are purged for the signing-out account, and mobile DM routes expose an accessible Back action; channel star/details controls are hidden | W12, W16 / [routes](routes.md#everyday-workspace-routes) |
| DM inbox | Implemented first slice: access-checked route, participant identity, latest safe preview, unread count, All/Unread filter, stable activity cursor page selected in SQL before page-only detail hydration and New message entry; independent QA and mobile back-state evidence remain open | W22 / F52 / R23 / W05 |
| Group DMs | Implemented creation and first lifecycle slice: bounded member picker, one-to-one convergence, named groups, creator rename, leave and server-side workspace/duplicate/limit validation; group identity and creator rename/leave remain valid at two active participants after a departure. The header's **Add people** action explains that it creates a new conversation generation and that new participants cannot read earlier messages; a database regression proves that boundary. Group-create retries use a persisted client intent UUID plus a private request hash to converge concurrent/lost-response retries and reject changed or cross-creator reuse. Avatar surfaces remain layered for a one-active-member group by pairing the member face with a neutral group marker. In-place participant revisions and broader history/privacy QA remain open | W39 / F14 |
| Calls, meetings and media | Planned; DM entry points must use the shared media controller and consent rules | W31–W33 / [calls and meetings](calls-and-meetings.md) |
| External notifications/offline | Planned bounded opt-in delivery and offline text outbox | W39 / F35/F46 |

The latest complete suite passes **283 automated tests across 61 files**; actor/workspace-scoped timeline/thread/pinned/bookmark keys now cover optimistic send/retry, realtime catch-up and saved-message actions, focused search/DM/avatar/message-access/context runs pass 83 tests across ten files, and current typecheck, production build and lint pass. The profile hover card now defers its member-details query until opened, announces loading, offers retry for initial failure and preserves cached details during refresh failure. Local browser inspection confirms that a group with three active participants visibly stacks multiple avatars in the sidebar and conversation header. The DM tests include stable two-or-more-person avatar stacks in the sidebar, inbox and conversation header, a sidebar integration regression for the stacked group-DM participant pair and a DM inbox route regression for three participant avatars, a two-layer group stack with a truthful count and neutral group marker when only one member remains, single-peer avatars for one-to-one DMs, actor-scoped draft removal on logout, a 26-conversation cursor-page regression proving only selected page details are hydrated, focused-conversation-only message hydration, thread/root cache refresh when a published reply arrives, stable message-send retries, and group-creation retries covering lost responses, concurrent requests, page-remount recovery, changed payloads, cross-creator reuse and private-hash omission, plus a database test proving a newly added member cannot read the prior group's history. The pending group intent is actor/workspace scoped, survives reload in browser storage and is removed after creation or logout. Search navigation now loads a bounded old-message context, routes reply results to the parent thread and provides retry for transient context-load errors. These results cover implementation slices; they do not close all seven F13 cases, F14 in-place participant revisions, broader history/privacy QA, durable offline retries, server-synchronized drafts, route acceptance, physical-device evidence or independent QA.

## What a DM means

A DM is a private conversation whose audience is defined by an explicit participant set, not by a name prefix, a client-supplied channel ID or the fact that a private channel currently has two members.

| Conversation kind | Participants | Identity | History rule | First-release position |
|---|---|---|---|---|
| One-to-one | Exactly two workspace members | The unordered pair plus workspace | The pair's existing conversation is reused | Implemented slice; harden the key and migrate legacy records |
| Group DM | A bounded set of workspace members | Explicit group conversation ID; creation currently allows 3–8 participants including creator; creator can rename or leave, and group actions remain available when a prior departure leaves two active participants | Adding a person creates a declared history boundary; never silently grants old history | Creation/first lifecycle slice implemented; participant revision planned in W39 |
| Private channel | Any permitted membership set | Channel name and channel ID | Channel membership/admin policy | Remains separate from DMs |
| External/shared conversation | Guest or cross-workspace participants under an agreement | Organization-scoped participant grants | Agreement and retention policy determine visibility | Conditional F35/W35 |

The application may continue to use the `Channel` and `ChannelMember` tables for conversations. A separate message table is not justified. If group lifecycle requirements make the existing channel model insufficient, add a narrow conversation-participant revision model after a measured prototype; do not introduce a generic messaging service.

## Current one-to-one behavior

The existing entry points must converge on one server operation: profile, hover card, future global compose and the future DM inbox all call the same `getOrCreateDirectMessage` contract.

1. Resolve the actor from the authenticated session. Never accept the sender as an authority argument.
2. Verify that both the actor and target belong to the requested workspace.
3. Reject self-messaging and foreign/removed targets before reading or creating a conversation.
4. Compute the deterministic pair name from sorted user IDs. Look for an existing `DIRECT` or explicitly recognized legacy `dm-*` pair with exactly two members.
5. Create one `DIRECT` conversation and two memberships when no pair exists. A unique workspace/name constraint plus the retry lookup converges concurrent requests.
6. Load only the other participant's selected identity fields for the sidebar/header/composer. Do not serialize the full member list or private profile fields.
7. Authorize the normal channel route and message operations again. Reaching a DM URL or possessing its ID never grants access.

The current implementation now has a durable `directKey` constraint that cannot be changed by renaming a channel. It still needs an explicit legacy migration report and a decision for what happens when historical data contains more than one ambiguous two-member private channel. Treat those as hardening work, not cosmetic cleanup.

## DM features to explore

The following backlog expands the one-to-one slice into a production-grade DM experience. The IDs are local to this document and do not replace the authoritative F-number catalogue.

| ID | Feature to explore | User outcome | Priority / owner | Main dependency |
|---|---|---|---|---|
| DM01 | Canonical identity and deduplication | Every entry point opens the same pair conversation, even across tabs, devices and retries | P0 / W12 | Direct key migration and F04 |
| DM02 | DM inbox and recents | Find recent DMs, unread DMs, last activity and a reliable “new message” action | P1 / W22 | Cursor summary, read state, R23 |
| DM03 | Group DM creation | Start a small private conversation with a bounded participant set and clear naming | P1 / W39 | Participant policy, F14 |
| DM04 | Participant lifecycle | Add, leave, remove, rejoin or deactivate people without leaking history or orphaning files | P1 / W39 | Versioned membership and retention policy |
| DM05 | Display identity | Show avatar, display name, status and participant count consistently without stale profile data | P1 / W12/W13 | Scoped profile projection |
| DM06 | Read/unread and mark-unread | Keep personal read cursors, unread counts and cross-device state accurate | P1 / W06/W22 | Monotonic cursor and event reconciliation |
| DM07 | Notification policy | Mute, mentions-only, quiet hours and device-specific interruption rules | P1 / W23/W39 | Notification preferences and dedupe |
| DM08 | Presence and typing | Show truthful online/away, last seen and typing state with privacy controls | P1 / W03/W06 | Authenticated realtime identity |
| DM09 | Search and discovery | Search only accessible DM content, people and files with stable filters and pagination | P1 / W14/W24 | Access predicate and search index |
| DM10 | Threads in DMs | Keep side discussions attached to a message without turning the inbox into duplicate conversations | P1 / W04/W08 | Parent/message invariant |
| DM11 | Message controls | Edit, delete, react, forward, pin, bookmark, copy link and report with explicit audience rules | P1 / W10/W12 | Shared message commands |
| DM12 | Attachments and media | Share files, images, previews and downloads through private object grants | P1 / W09/W24 | Signed upload/download lifecycle |
| DM13 | Rich DM content | Use mentions, polls, voice notes, custom emoji and message-linked tasks where enabled | P2 / W27–W30 | Existing message and notification contracts |
| DM14 | Calls and huddles | Start voice/video, accept/decline, reconnect, mute/deafen and leave from a DM | P1 / W31 | Media admission, TURN, device permissions |
| DM15 | Screens and applications | Share a selected screen/window with explicit stop and one-presenter policy | P2 / W31 | Browser/OS capture and call controller |
| DM16 | DM meetings | Schedule a DM-linked event, send reminders, RSVP and join with the same authorization | P2 / W32 | Event model and calendar policy |
| DM17 | Drafts and scheduled DMs | Resume drafts and schedule/edit/cancel a message without exposing prepublication content | P1 / W07/W13/W22 | Author-only storage and idempotent publication |
| DM18 | Offline and reconnect | Read explicitly retained content and queue safe text sends without duplicate publication | P2 / W39 | Encrypted local outbox and mutation resolution |
| DM19 | Deep links and navigation | Open a message/thread/attachment from a notification and return to the originating DM | P1 / W21/W22 | Canonical route helper and panel state |
| DM20 | Mute, block and report | Control unwanted contact and report content without pretending a display filter is security | P1 / W23/W26 | Moderation and privacy policy |
| DM21 | Guests and cross-workspace DMs | Handle external participants only through scoped, expiring grants and explicit disclosure | Conditional / W35 | Shared-channel and retention agreement |
| DM22 | Bots and integrations | Permit identifiable, scoped bot participation with revocation and delivery dedupe | Conditional / W36 | App scopes and signed callbacks |
| DM23 | Retention, export and legal hold | Explain deletion, export, holds and downloaded-copy limits for private conversations | P2 / W37 | Governance and data lifecycle decisions |
| DM24 | Mobile and desktop continuity | Preserve drafts, calls, deep links, keyboard behavior and notification state across devices | P1 / W16/W18/W38 | Shared contracts and real-device QA |
| DM25 | Performance and cost | Open the DM shell quickly, avoid loading every conversation, and keep calls out of cold chat startup | P1 / W05/W18/W31 | Query budgets, lazy media and measured caching |
| DM26 | Abuse and operational visibility | Rate-limit invitations/calls, detect delivery failure and inspect safe audit metadata | P1 / W19/W25/W34 | Rate limits, alerts and audit policy |

## Recommended behavior contracts

### Group DMs and history boundaries

Group avatar data is a distinct projection from the peer names used for display. Keep a visibly layered two-item avatar surface in the sidebar, inbox and conversation header for every group: show participant faces when at least two remain, and pair the sole remaining member's face with a neutral group marker when only one remains. Include the viewing member when a group has two active members so it never collapses to a one-person icon. Keep one-to-one DMs on the single peer avatar. Order peers consistently before the viewer, expose the true active participant count accessibly, and cap visible participant faces at three without changing the announced count.

Start with a bounded v1 of **3–8 participants at creation**, including the creator, unless product research justifies another cap. After participants leave, two or even one may remain; the conversation stays a group because its identity is structural, not inferred from current member count. The cap is a server invariant and is tested one above the limit. A group has an owner or explicit management capability, a generated or user-selected display name, a participant revision and an auditable lifecycle.

Adding a person should create a new conversation generation by default. If the product later permits adding someone to an existing group, the server must record `historyVisibleFrom` (or an equivalent message boundary) and apply it to messages, threads, files, search, notifications, exports and calls. A participant who leaves or is removed loses new access immediately; whether they retain previously visible messages is a documented retention decision, not an accidental result of a stale cache. Rejoining must not restore content that the policy withheld.

Participant writes are versioned. A stale add/remove/rename fails with a conflict that can be retried from the latest participant set. Duplicate IDs, foreign workspace members, removed accounts, self-only groups and over-limit requests fail before any channel, membership, message or notification write. A retry of a successful creation returns the same conversation ID. The client retains a UUID for the exact creation intent in actor/workspace-scoped browser storage; the server persists that UUID under a unique constraint and compares a SHA-256 hash of workspace, authenticated creator, normalized participant set and optional name. A matching retry returns the canonical conversation, including after reload, concurrent requests or a lost response. Reusing the key with changed intent or a different creator returns a conflict and does not reveal the conversation ID. The request hash and mutation key are omitted from ordinary channel reads. The pending key is removed after successful creation and shares the draft namespace so logout purges it; durable offline recovery remains open.

### Delivery, reads and realtime

The interactive send path assigns each intent a stable client mutation UUID. Migration `20260924230000_message_send_idempotency` adds a unique `(userId, clientMutationId)` key and a private request hash. The public send action requires a valid UUID and checks current channel membership before looking up a retry; matching sequential or concurrent sends return the canonical row, changed payload reuse fails, and the row is not replayed after access is revoked. A global Prisma omission keeps the request hash out of message reads. In-page retry retains completed upload descriptors so it does not reupload the same files. Integration and hook tests cover retry identity, one durable row, concurrent races, changed channel/content/thread/schedule/attachment payloads, missing/invalid keys, access revocation, hidden hashes and upload reuse. Durable offline retries, upload finalization/orphan cleanup, idempotency for other message writers, and scheduled publication remain open. The focused conversation listener hydrates only root, unscheduled and non-deleted inserts, suppresses repeated IDs before detail fetch, and owns timeline reconciliation; the sidebar only projects unread counts. A published reply invalidates the exact thread and root-timeline query keys while scheduled/deleted rows are ignored. Component/hook tests cover a same-user event in another tab and both acknowledgement/event orders in cache, but a live two-tab pair and reconnect catch-up remain open.

Read state is personal. Opening a DM marks only messages that were actually visible; marking unread creates a personal attention override without moving another user's cursor backwards. An unread count is a bounded summary, not permission to read content. Membership revocation purges protected Query data, stops subscriptions and rejects renewal.

### Privacy, safety and identity

- A workspace admin does not automatically receive DM bodies. Admin activity, audit and moderation views use explicit capabilities and minimum evidence.
- Profile projections expose only the fields needed for a DM row, header, hover card or notification. Email and provider account data remain private.
- Presence and typing are ephemeral signals with an account/workspace privacy setting, bounded retention and no implication that a person is available to answer.
- Mute/hide is a personal display or notification preference. Block/report behavior requires a separate server policy for new DMs, mentions, calls, files and existing history.
- Every notification, search result, file grant, forwarded message, call token and deep link repeats current conversation access checks.
- Abuse controls cover invite bursts, repeated call ringing, attachment size/type, message rate and report floods. Rate limiting never becomes an alternate privacy policy.

### Calls, meetings and media

DM call buttons reuse the [calls and meetings](calls-and-meetings.md) contract: prejoin device check, explicit ringing, accept/decline/ignore, missed-call outcome, one active microphone session per user, authenticated media grants, TURN fallback, reconnect and revocation. A DM route must not import or initialize the RTC SDK until call intent. A call invite cannot reveal a private DM to a nonparticipant.

Screen sharing, captions, recordings, transcripts and summaries are separate consented capabilities. Recording and transcript artifacts inherit the DM audience intersection and retention policy. Switching device or workspace explicitly transfers or ends the session; it never silently publishes a second microphone or changes conversation scope.

DM-linked events use the event model rather than scheduled-message rows. Calendar OAuth, recurring events, reminders, timezone/DST behavior and cancellation are governed by W32; a meeting URL alone never grants DM access.

### Files, links and offline use

DM files use private storage keys and short-lived authorized download grants. The database stores an object key and ownership/finalization state, not a permanent public URL. A file preview, search result or copied link rechecks the current DM audience. Object cleanup waits for all authorized references and retention rules.

Offline support is opt-in and bounded. Store only the user's explicitly retained data in an encrypted device store; clear it on logout, account switch, revocation or expiry. An offline text outbox keeps the original destination, participant revision and client mutation ID. On reconnect it resolves whether the intent committed before retrying. Do not queue calls, permission changes or arbitrary file URLs as if they were ordinary text sends.

The current composer draft is stored per user in browser `localStorage` and is purged on logout. This is not an encrypted offline store or remote erasure guarantee; encrypted offline drafts/outbox remain planned work.

## Routes and responsive UI

The current compatibility route `/<workspaceSlug>/<channelId>` resolves conversation kind after authorization. Direct messages use a participant-aware header and composer while ordinary channels retain the channel icon, star and details controls. The planned canonical destinations are [R23 `W/dms`](routes.md#everyday-workspace-routes) for the inbox and [R24 `W/dms/[conversationId]`](routes.md#everyday-workspace-routes) for the focused conversation. The migration must preserve existing direct links and never redirect a private DM through a public cacheable route.

Desktop and mobile use the same loader, query keys and mutation contracts. On narrow screens, the DM list is the parent screen and the focused conversation replaces it; Back restores the list and its scroll position. The composer remains above the keyboard and keeps its draft through rotation, call strips, permission prompts and transient errors. The Direct messages section remains discoverable from the five-entry mobile navigation contract; it is not hidden behind an icon with no label.

DM-specific UI states are:

| Surface | Required states |
|---|---|
| DM list | Loading, empty/new-DM prompt, unread filter, stale/disconnected, denied/removed, failed page retry, long-list cursor and keyboard navigation |
| DM row | Avatar fallback, display-name change, presence privacy, unread count, last-activity ordering, muted indicator and removed participant |
| DM header | Peer identity, group participant summary, call actions only when eligible, blocked/removed state, loading identity and accessible Back on mobile |
| Composer | `Message <name>...`, disabled reason, IME-safe send, upload progress, failed/uncertain send recovery, offline queue and scheduled-send state |
| Message timeline | Empty, first-message guidance, bounded history, thread panel, revoked access, deleted/tombstoned content and attachment grant failure |

Motion follows [animation](animation.md): the DM list, stacked participant avatars, unread state, detail transitions, call dock and typing/presence all receive clean, precise feedback with reduced-motion alternatives. Row and avatar changes remain spatially anchored; list reordering must not interrupt someone reading. Call transitions and typing/presence cannot consume main-message layout or block input.

## Data and cache design

The first implementation should extend the existing model rather than introduce a second conversation stack:

| Record | Required DM evolution | Invariant |
|---|---|---|
| `Channel` | `DIRECT` kind plus a server-owned direct key; display name semantics remain separate from channel name | One active one-to-one key per workspace; a null key identifies a group even when participant count changes |
| `ChannelMember` | Participant lifecycle, revision, join/leave/removal timestamps and optional history boundary | Every active participant is a workspace member; revoked access is effective immediately |
| `Message` | Existing publication, parent, edit/delete, mutation and attachment fields | Message visibility is the intersection of current conversation access and publication state |
| `Attachment` | Private object key, upload intent, finalization and retention references | URL is derived from a current grant, never authority |
| `Notification` | Conversation scope, dedupe key, recipient privacy and delivery status | No notification preview outlives source access |
| `CallSession` / event records | Shared media/meeting models from W31/W32 | Media admission is separate from text membership reads but rechecks the same policy |

Use actor/workspace/conversation in every Query key, for example `['dm', workspaceId, conversationId]` and `['dm-inbox', workspaceId, filter]`. The sidebar and inbox receive one bounded summary projection, not a full message page per row. Prefetch the focused DM only on navigation intent. Invalidate or patch the row on message publication, read changes, membership revision and notification policy changes; remove it immediately on lost access.

Do not cache private DM bodies in a shared CDN or unscoped server cache. Short client Query retention can improve navigation speed only when it is scoped to the authenticated actor and cleared on logout/account switch. Measure cache hit rate, SQL count, response bytes, retained rows, event-to-render latency and memory after 50 conversation switches. A 10× claim requires before/after traces and correctness evidence; it is not inferred from a longer stale time.

## TDD and QA plan

The red test is written before each DM change. Integration tests use isolated PostgreSQL and real authorization; component tests cover labels, focus, keyboard/IME, optimistic rollback and mobile replacement states; browser tests cover direct loads, two tabs/devices, Back/Forward and file/call permissions; provider suites cover media and notification contracts. The QA engineer independently runs the same acceptance against the candidate build and records artifacts in [qa-checklist](qa-checklist.md).

| Test group | Minimum cases before closure |
|---|---|
| Identity and creation | Anonymous, expired, self, foreign workspace, removed target, duplicate click, two concurrent creators, legacy ambiguous pair |
| Participant lifecycle | Over-limit, duplicate/foreign member, stale revision, add boundary, leave, remove, rejoin, deactivation and active call during removal |
| Message delivery | Lost acknowledgement, duplicate event, out-of-order edit/reaction, archive/permission change during send, retry with attachment and notification dedupe |
| Privacy | Direct URL without membership, search/count/file/link leakage, admin without DM membership, revoked subscription, logout/account switch and cache purge |
| Attention | Read only visible messages, mark unread, mute/mentions-only, quiet hours, cross-device convergence and notification preview privacy |
| Mobile | 320/375/768 widths, keyboard-open composer, Back restoration, rotation, long names, safe-area, touch target, reduced motion and offline recovery |
| Media | Device denial, busy user, missed call, reconnect, TURN-only path, track cleanup, screen-share stop, consent and artifact revocation |
| Operations | Rate limits, worker retry, migration replay, audit redaction, backup/restore, retention/export and alerting without message-body logs |

Current developer evidence is the 170-test local candidate described above. The group-create retry tests prove same-key sequential/concurrent convergence, lost-response reuse after a component remount, logout cleanup, rejection of changed payload and cross-creator key reuse, and omission of private request data from regular channel results. Component tests cover the one-member group marker with its truthful active count. F13/F14/F52 acceptance cases and all QF/QR entries remain **PLANNED / NOT RUN** until the QA engineer executes them against a named build. A passing unit or integration test does not certify realtime identity, storage ACLs, physical mobile behavior, media providers or production configuration.

## Ordered DM implementation plan

1. **Harden the current one-to-one slice (W12).** The durable pair key, `DIRECT` migration and route/profile/sidebar/header/composer slice are implemented; report and resolve ambiguous legacy records and finish the remaining regression cases.
2. **Finish message safety shared by DMs (W04/W06/W09/W10/W11).** Close publication, retry, read, attachment, notification, search, thread and action policies before adding more DM controls.
3. **Harden the DM inbox and deep-link state (W21/W22).** The first route, cursor summaries, unread/filter states and member picker are implemented; add mobile Back restoration, reliable read transitions, deep-link state and no private preview leaks.
4. **Add notification, presence and personal controls (W03/W06/W23).** Make typing/presence truthful and bounded; add mute, quiet hours, block/report and cross-device convergence.
5. **Complete group DM lifecycle (W39).** Bounded creation, creator rename and leave are implemented; add participant revisions, history boundaries, remove/rejoin, limits, migration and F14 cases first.
6. **Add richer DM composition (W13/W27–W30).** Drafts, scheduling, voice notes, polls, emoji, tasks and notes inherit DM audience checks; each feature can be disabled without exposing its records.
7. **Add calls and DM-linked meetings (W31–W33).** Validate two-person media and device/reconnect behavior before huddles, screens, rooms, recording, captions or calendar integrations.
8. **Add offline, external and governance maturity (W35/W37–W39).** Ship encrypted bounded outbox, external participant agreements, integrations, export/retention and legal-hold behavior only after policy decisions and device/provider evidence.
9. **Run independent QA and performance gates (W18/W19).** Re-run all affected F/R/MR cases, mobile devices, load traces, migration/restore and security checks. A DM release is blocked by an unverified access boundary, duplicate publication, private object leak, lost draft, broken Back path or failed call cleanup.

## Decisions still required

| Decision | Recommended default | Why it matters |
|---|---|---|
| Group size | 8 active participants in v1 | Bounds fanout, inbox summaries and call admission |
| Add-member behavior | New conversation generation with no old-history access | Avoids accidental disclosure and simplifies audit |
| Leave/remove history | Revoke new access immediately; preserve only content the retention policy explicitly permits | Prevents stale caches from deciding privacy |
| DM notifications | Mentions/direct replies by default; per-conversation mute and account quiet hours | Balances attention with predictable delivery |
| Presence | Opt-in visibility with coarse last-seen values; typing can be disabled | Presence is not proof of availability |
| Block/report | Block new contact, mentions, calls and files; preserve report evidence under controlled access | A hide toggle is not a safety boundary |
| Offline retention | Explicit opt-in, encrypted local store, purge on logout/revocation | Private messages must not survive account changes silently |
| Media provider | Managed WebRTC SFU/TURN selected after two-person prototype | Provider behavior, cost and mobile support are unknown |
| External DMs | Require guest/shared-channel agreement and visible external badge | Cross-organization retention and revocation need consent |
| Retention/export | Owner-approved policy with personal export request path | Deletion and downloaded copies cannot be guessed later |

The product owner should resolve these decisions before W39 starts. Until then, the UI should not expose controls whose server semantics are undefined. See [decisions](decisions.md), [security](security.md), [calls and meetings](calls-and-meetings.md) and [production platform](production-platform.md) for the broader contracts.
