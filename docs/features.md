# 90 application features and acceptance criteria

[Index](README.md) · [Assessment](assessment.md) · [Application behavior](application-design.md) · [Work packages](implementation.md)

Every catalogue capability is now mapped to implementation phases in [delivery traceability](delivery-traceability.md). Use the [full phase plan](delivery-plan.md) for order and [acceptance cases](acceptance-cases.md) for test-first scenarios; current source coverage below does not imply verified completion.

## The actual product feature list

**The product scope contains 90 distinct user-facing capabilities below.** Navigation groups and engineering workstreams are not the feature count. The numbered catalogue describes what people can do; the F-number register underneath owns implementation coverage and acceptance criteria. Several related F requirements contribute to one capability. Infrastructure, caching, tests and animation are essential quality requirements, but are not counted as extra product features here.

Rows 1–50 make the original product scope explicit. Rows 51–60 add collaboration capabilities; rows 61–90 add calling, meetings, community, automation and enterprise capabilities following the latest direction. **This is a design catalogue, not a claim that 90 features currently work.** “Existing/partial” refers to source paths in the original audit; “Planned” refers to recommended production additions; “Expansion” is future scope beyond that baseline. Full acceptance and remaining work follow the table.

| # | Feature | What a user can actually do | Coverage / requirement |
|---|---|---|---|
| 1 | GitHub sign-in and account access | Sign in, sign out and return to the intended conversation after authentication | Existing/partial · F01 |
| 2 | Guided onboarding | Complete a profile, join or create a workspace and resume an interrupted setup | Planned · F56 |
| 3 | Multiple workspaces | Create a workspace and switch between teams without mixing their conversations | Existing/partial · F02 |
| 4 | Workspace invitations | Invite teammates, accept links and manage expiry, revocation and acceptance | Existing/partial + planned console · F03/F60 |
| 5 | Public channel discovery | Browse topics, search channels and join relevant conversations | Existing/partial · F07 |
| 6 | Private channels | Create invitation-only conversations with access-controlled history and files | Existing/partial · F07/F09 |
| 7 | Channel membership management | Join, leave, invite or remove people according to the channel's permissions | Existing/partial · F08 |
| 8 | Channel information | Maintain a channel's name, topic, description and privacy settings | Existing/partial · F09 |
| 9 | Channel archiving | Archive finished conversations, retain permitted history and restore when needed | Existing/partial · F10 |
| 10 | Restricted posting | Configure who can publish in announcement or controlled channels | Existing/partial · F11 |
| 11 | Favorite conversations | Star important channels for quick access in the sidebar | Existing/partial · F12 |
| 12 | Direct messages | Start and continue a private one-to-one conversation with a teammate | Implemented slice / QA pending · F13 · [DM contract](direct-messages.md) |
| 13 | Group direct messages | Hold small private conversations with several teammates | Core creation/lifecycle slice implemented; participant revisions, privacy extensions and independent QA remain · F14 · [DM contract](direct-messages.md) |
| 14 | Rich-text messaging | Compose formatted messages with links, lists and safe pasted content | Existing/partial · F16 |
| 15 | Reliable sending and retry | See whether a message is pending, sent or failed, and retry without losing text | Existing/partial · F17 |
| 16 | Message editing and deletion | Correct sent content or remove it under an explicit author/admin policy | Existing/partial · F18 |
| 17 | Threaded replies | Discuss a message in a thread while preserving the main conversation context | Existing/partial · F19 |
| 18 | Emoji reactions | Respond quickly and inspect who reacted without sending another message | Existing/partial · F20 |
| 19 | Person mentions | Find a teammate in the composer and direct their attention to a message | Existing/partial · F21 |
| 20 | Message forwarding | Share permitted context into another conversation with clear attribution | Existing/partial · F22 |
| 21 | Message links and history jumps | Link to a specific message and load its surrounding history, including old messages | Existing/partial · F15/F23 |
| 22 | Unread management | See unread conversations, jump to the first unread item and intentionally mark items read | Existing/partial + planned inbox · F24/F50 |
| 23 | Recoverable drafts | Leave unfinished messages, browse drafts and resume the correct channel or thread | Planned · F25/F53 |
| 24 | Typing indicators | See when another participant is composing in the current conversation | Existing/partial · F26 |
| 25 | Scheduled messages | Schedule, inspect, edit, cancel or send a pending message now | Existing/partial · F28 |
| 26 | File attachments | Upload files with progress, cancellation and retry and attach them to a message | Existing/partial · F29 |
| 27 | File preview and download | Preview supported images/files and download items the user may still access | Existing/partial · F30 |
| 28 | Advanced search | Find messages using people, channels, dates and attachment filters | Existing/partial + planned full page · F31/F55 |
| 29 | Pinned messages | Keep important decisions available to everyone who can access a channel | Existing/partial · F32 |
| 30 | Personal saved items | Bookmark messages privately and organize them as pending or completed | Existing/partial + planned triage · F33/F65 |
| 31 | Activity and notification inbox | Review relevant notifications and manage their read state across devices | Existing/partial · F34 |
| 32 | Email and push notifications | Opt into supported external delivery and control the privacy of previews | Expansion · F35 |
| 33 | People directory and profiles | Find teammates, inspect their profile and edit one's own profile | Existing/partial · F06/F36 |
| 34 | Hide and unhide people | Reduce unwanted content with an explicit, reversible personal display preference | Existing/partial · F37 |
| 35 | Presence and personal status | Distinguish online/away state from a person's chosen availability and expiring status | Existing/partial + planned status · F38/F67 |
| 36 | Keyboard command navigation | Find conversations and move around the app using an accessible command interface | Existing/partial · F39 |
| 37 | Personal display and composer settings | Set theme, text/density, reduced motion, timezone and Enter-to-send behavior | Existing/partial + planned settings · F41/F58 |
| 38 | Offline reading and queued sending | Read explicitly retained content offline and reconcile queued work on reconnect | Expansion · F46 |
| 39 | Integrations and bots | Connect approved external tools with scoped, visible permissions | Expansion · F47 |
| 40 | Personal workday Home | Resume recent work and see a bounded summary of items requiring attention | Planned · F49 |
| 41 | Followed-thread inbox | Follow or unfollow discussions and review replies across channels in one place | Planned · F51 |
| 42 | Global message composition | Start a message anywhere, choose its destination and safely retain unfinished work | Planned · F53 |
| 43 | Workspace file library | Browse permitted shared files by conversation, uploader and type | Planned · F54 |
| 44 | Mute, quiet hours and notification policy | Reduce interruptions using account defaults and workspace/channel overrides | Planned · F57 |
| 45 | Device and session management | Inspect active sessions and revoke access from another device | Planned · F59 |
| 46 | Workspace roles and administration | Manage members, ownership and settings and inspect authorized administrative history | Existing/partial + planned audit · F05/F61 |
| 47 | Reporting and moderation | Report accessible content, track a case and resolve it with explicit reviewer authority | Planned maturity · F62 |
| 48 | Privacy and data controls | Request an export or deactivation and manage authorized workspace data policies | Planned maturity · F63 |
| 49 | Personal reminders | Set or snooze a reminder attached to an accessible message or saved item | Planned maturity · F65 |
| 50 | Channel resource collection | Maintain a useful ordered collection of links, messages and files for a channel | Planned · F66 |
| 51 | Channel polls | Ask a structured question, vote and inspect permitted results | New expansion · F69 |
| 52 | Voice notes | Record, preview and send a short audio message with accessible playback | New expansion · F70 |
| 53 | Custom workspace emoji | Add approved team emoji and reuse them in messages and reactions | New expansion · F71 |
| 54 | User groups and group mentions | Maintain groups such as design or support and mention eligible members together | New expansion · F72 |
| 55 | Channel templates | Start a project or team channel with consistent purpose, resources and setup | New expansion · F73 |
| 56 | Announcement acknowledgements | Ask recipients to explicitly acknowledge an important announcement and track responses | New expansion · F74 |
| 57 | Tasks from messages | Turn a conversation into an assigned task with a due date and completion state | New expansion · F75 |
| 58 | Shared channel notes | Write and revise lightweight shared notes linked to their source conversation | New expansion · F76 |
| 59 | Keyword notification rules | Receive controlled alerts for chosen words in conversations one can access | New expansion · F77 |
| 60 | Saved searches | Save and rerun useful filter combinations without retyping them | New expansion · F78 |
| 61 | Voice calls | Call a teammate or group, accept/decline, mute, switch devices and reconnect | Proposed · F79 |
| 62 | Video calls | Upgrade a call to camera video with grid/speaker views and device previews | Proposed · F80 |
| 63 | Drop-in huddles | Start an informal live conversation attached to a text channel or DM | Proposed · F81 |
| 64 | Screen and application sharing | Present a selected screen or window while talking | Proposed · F82 |
| 65 | Persistent voice rooms | Join a named room that remains available between sessions | Proposed · F83 |
| 66 | Stages and town halls | Host a moderated audience session with speakers and a request-to-speak queue | Proposed · F84 |
| 67 | Meeting and event scheduling | Schedule a call, agenda, host, invitees and location in an Events calendar | Proposed · F85 |
| 68 | Recurring meetings | Create a series and edit one occurrence or future meetings | Proposed · F86 |
| 69 | Calendar connections and availability | Connect Google or Microsoft calendars and synchronize opted-in events | Proposed · F87 |
| 70 | RSVPs and event reminders | Accept, decline or tentatively attend and receive timely reminders | Proposed · F88 |
| 71 | Call history and missed calls | Review calls, missed invitations and permitted follow-up context | Proposed · F89 |
| 72 | Live captions | Read live spoken content with speaker labels during a call | Proposed · F90 |
| 73 | Meeting recordings | Request consented recording and replay permitted meetings | Proposed · F91 |
| 74 | Transcripts, summaries and action items | Review a meeting transcript and optional source-linked summary or task suggestions | Proposed · F92 |
| 75 | Forum and Q&A channels | Create titled tagged discussions and mark accepted answers | Proposed · F93 |
| 76 | Channel categories and custom sidebar sections | Organize many channels with shared categories and personal sections | Proposed · F94 |
| 77 | Custom roles and channel overrides | Define capabilities and inspect effective permissions for a person/channel | Proposed · F95 |
| 78 | Scoped guest access | Invite an external collaborator to specific channels for a bounded period | Proposed · F96 |
| 79 | Cross-workspace shared channels | Collaborate across organizations in one deliberately shared conversation | Proposed · F97 |
| 80 | Community onboarding and member screening | Present rules, verification and channel selection before community participation | Proposed · F98 |
| 81 | Automated moderation and anti-raid controls | Configure spam/link/mention rules and review moderation outcomes | Proposed · F99 |
| 82 | Slow mode and channel lockdown | Limit posting frequency or temporarily freeze a busy channel | Proposed · F100 |
| 83 | Workflow automations | Build bounded trigger/form/action workflows for routine team work | Proposed · F101 |
| 84 | App directory and installation management | Discover approved integrations and review/install/revoke their access | Proposed · F102 |
| 85 | Slash commands and webhooks | Invoke approved bot commands and receive signed external events | Proposed · F103 |
| 86 | Workspace import and migration | Preview and import supported exported conversations with identity mapping | Proposed · F104 |
| 87 | Enterprise sign-in and provisioning | Use organization SSO and manage users/groups through SCIM | Proposed · F105 |
| 88 | Mobile and desktop clients | Use dedicated clients with push, deep links and call continuity | Proposed · F106 |
| 89 | Localization and optional message translation | Use a localized interface and request an identified translation of a message | Proposed · F107 |
| 90 | Advanced retention and legal-hold administration | Manage scoped retention, holds and authorized review/export | Proposed · F108 |

For the ten new features, [collaboration feature design](collaboration-features.md) specifies the user flows, data contracts, permission rules, caching, failure states and tests. [Routes](routes.md) owns destinations; [implementation](implementation.md) and [timeline](timeline.md) own sequencing and estimates. Existing F52 (DM inbox), F64 (help/recovery) and F68 (navigation continuity) support the catalogue rather than inflating its count. F48 is now a historical umbrella resolved by F79–F108; the explicit new capabilities are included in the catalogue without counting that umbrella again.

## Engineering requirement register

This register covers the original baseline, production additions and the newly specified expansion. **Present** means an implementation path exists; **Partial** means known gaps remain; **Absent** means no corresponding implementation was found. **Proposed/unassessed** means newly designed behavior whose implementation coverage has not received a fresh source audit. No row is production-certified.

Day-one labels: **Core** is the minimum candidate, **Conditional** stays enabled only if verified, **Later** is outside the eight-hour target, and **Expansion** requires a separate scope decision. Cross-cutting security gates apply even to a later feature if any of its endpoints remain reachable.

## Access and workspace

| ID | Capability / current source coverage | Remaining acceptance criteria | Day one | Package |
|---|---|---|---|---|
| F01 | GitHub sign-in/session: Present, `auth.ts`, `auth.config.ts`, login and auth route | Sign-in/out, expiry, failed callback, preserved invite destination; no debug secrets; user cache reset on logout | Core | W01, W02 |
| F02 | Workspace create/list/switch: Partial, `workspace.ts`, workspace switcher | Slug validation and conflict; transaction creates owner and default channel memberships; landing chooses authorized channel; switch isolates state | Core | W04 |
| F03 | Invite-code join: Partial, invite route and action | Invalid/already-used membership handled; no accidental private/archived default joins; deliberate link visibility policy; rotation/revocation for baseline | Conditional | W02, W15 |
| F04 | Tenant and resource authorization: Partial, dispersed action checks | All routes/actions/downloads/events enforce workspace and channel scope; no cross-tenant IDs accepted | Core gate | W02, W03 |
| F05 | Workspace administration: Partial, largely disabled settings UI | Authorized rename, role changes, ownership transfer, remove member, leave and delete policy; protect last owner; audit sensitive operations | Later | W15 |
| F06 | Member directory: Present, members route and loader | Paginated scoped directory, deliberate email visibility, profile actions, empty/error states | Conditional | W02, W13 |

## Conversations

| ID | Capability / current source coverage | Remaining acceptance criteria | Day one | Package |
|---|---|---|---|---|
| F07 | Public/private channel creation and browsing: Partial | Workspace membership on discovery/create; only public discovery; private invitation policy; unique names; membership correct after creation | Conditional | W02, W15 |
| F08 | Join/leave/add/remove members: Partial | Actor permissions, target workspace membership, no private self-join, consistent creator/owner rules, session revocation handling | Conditional | W02, W15 |
| F09 | Channel metadata and privacy: Partial, detail/about/settings tabs | Validate every editable field; privacy conversion communicates audience change; only permitted actors; updated state on all clients | Conditional | W15 |
| F10 | Archive/unarchive/delete: Partial | Archived is read-only across all write paths; deletion policy and confirmation; no stale links leaking content; dependent data/storage lifecycle | Later | W10, W15 |
| F11 | Posting permissions: Partial, enum plus client/action checks | Everyone/admin/owner/selected-members share one server policy; selected list management; explicit reply policy; forwarding cannot bypass | Core enforcement; advanced settings later | W02, W15 |
| F12 | Starred channels: Present, star actions/navigation | Authorized idempotent set/unset, unread state equal to normal channels, revocation/archival invalidation | Conditional | W05, W10 |
| F13 | One-to-one DMs: Implemented slice, `DIRECT` kind, profile/hover-card entry with deferred profile-detail query, participant-aware sidebar/header/composer and access tests | Durable pair key independent of display name, legacy ambiguity report/migration, inbox/deep links, complete message/privacy/mobile acceptance and independent QA | P1 follow-up | W12, W22 |
| F14 | Group DMs: Creation and first lifecycle slice implemented with bounded picker, named groups, idempotent client-intent retries, participant-aware header, layered group identity including the one-active-member state, creator rename/leave after membership drops to two active participants, and an Add people notice explaining the new-generation history boundary | Participant-change privacy, bounded membership, naming, limits, remove/rejoin, cross-surface history enforcement, calls, notifications and migration behavior | Full target, phased | W39 |

## Messaging

| ID | Capability / current source coverage | Remaining acceptance criteria | Day one | Package |
|---|---|---|---|---|
| F15 | Recent/history channel read: Partial, 50-row pages | Auth before data, published roots only, stable total ordering, accurate cursor, loading/error/empty states, bounded pages | Core | W04, W05, W08 |
| F16 | Rich-text composition: Present, Tiptap | Allowed formatting, safe links, paste sanitization, IME-safe Enter, keyboard toolbar, editor focus retention | Core text subset | W04, W13 |
| F17 | Send/pending/retry: Partial; stable intent UUID, actor/key uniqueness, conflict detection and in-page upload reuse are implemented | Complete typed acknowledgement/error state, preserve recoverable draft through reload/offline use and verify multi-client recovery; durable offline retry and full publication lifecycle remain open | Core | W04, W06 |
| F18 | Edit/delete messages: Partial | Enforce author/window/admin policy, sanitized edits, consistent tombstone/retention decision, threads/pins/search reflect change | Conditional | W04, W10 |
| F19 | Threads: Partial; parent/reply queries use actor/workspace-scoped keys and wait for a known viewer identity before fetching | Parent belongs to channel and is published; bounded replies; realtime updates/deletes/reactions; stable scroll; correct reply count; live revocation and independent QA | Conditional core | W04, W05, W06, W08 |
| F20 | Emoji reactions: Present | Access checks, atomic/idempotent desired-state mutation, duplicates reconciled, keyboard action, count/actor correctness | Conditional | W06, W10 |
| F21 | Mentions: Partial | Scoped member suggestions cached, valid recipient IDs, no arbitrary HTML attributes as authority, deduplicated notification after publication | Conditional | W04, W11, W13 |
| F22 | Forwarding: Partial, server helper and placeholder UI | Source and destination access, destination posting permission, safe attribution, deliberate attachment and private-source policy | Later | W12 |
| F23 | Message permalinks and jump: Partial; bounded old-message root context, reply parent/thread identity, centered target focus, latest-timeline restoration, deep-link exit and per-conversation viewport restoration have component tests | Real browser Back/Forward from search/saved/notification, end-to-end reply highlight, older-page traversal, mobile behavior and independent QA | Conditional recent-only; full later | W08, W14 |
| F24 | Channel unread markers/counts: Partial; batched published-root aggregate has a 50-channel PostgreSQL regression | Same published-message predicate as timeline, visible/focused read cursor, no premature mark-read, multi-tab convergence | Core correctness; richer UX later | W05, W06 |
| F25 | Drafts: Absent as durable draft capability | Per account/workspace/channel/thread, restore after navigation/reload under explicit policy, clear on confirmed send/logout, no accidental resend | Later | W13 |
| F26 | Typing indicators: Present, broadcast with timeout | Authorized channel and thread scope, throttle, stale expiry, no offscreen loops, no spoofed identity from arbitrary payload | Conditional | W03, W06 |
| F27 | Reconnect and multi-tab: Partial; after a reported Supabase interruption the active timeline and sidebar/notification summaries now perform one bounded catch-up | Self events accepted on other tabs, actual network drop/rejoin, duplicate/out-of-order handling and a clear stale/reconnecting label | Core gate for live mode | W06 |
| F28 | Scheduled messages: Partial; current channel list now keys by actor/workspace/channel/thread, requires current workspace and channel membership, and returns only rendered fields | Author-only pending visibility, publish-time permission, claim/retry/dedupe, schedule/edit/cancel races, timezone correctness, notification at delivery, workspace page query scope | Later; gate existing paths | W05, W07 |

## Knowledge, files and notifications

| ID | Capability / current source coverage | Remaining acceptance criteria | Day one | Package |
|---|---|---|---|---|
| F29 | Attachment upload: Partial | Size/type/count policy, workspace/channel ownership, private storage, progress/cancel/retry, finalize validation and orphan cleanup | Later unless secured | W09 |
| F30 | File/image preview/download: Present UI, partial system | Authorized short-lived download, safe display type, bounded image dimensions, responsive viewer, focus return, expired-link recovery | Later unless secured | W09, W17 |
| F31 | Search/filter: Partial; latest-response guard, lazy suggestions, actor/workspace/query-bound keyset pagination, appended result pages, bounded query parsing, explicit invalid-filter/date errors, inclusive UTC date-only bounds, PostgreSQL trigram substring index, bounded old-message context/retry and viewport restoration have developer evidence; a 100k-message synthetic warm benchmark is recorded | Membership-scoped published content; HTML-to-plain-text search behavior; real browser Back/Forward and focus evidence; scoped result cache; cold/short/common-filter/concurrent latency and scan budgets; independent QA | Later unless secured | W14; W05 speed work |
| F32 | Pins: Partial, relation plus `isPinned` | Same-channel invariant, deliberate pin authority, atomic consistency, safe revocation, accessible pinned-message navigation | Conditional | W10 |
| F33 | Bookmarks/saved items: Partial, two loaders | One return contract, personal ownership, current-access filtering, workspace scope, paginated list and state synchronized across views | Conditional | W10 |
| F34 | In-app notifications: Partial; access-filtered page and unread count share one SQL query, and channel read uses a relational update | Workspace-aware view, actor/resource privacy, dedupe, read rollback, cursor pagination, deleted-resource fallback, unread count consistency, broader retention and preference behavior | Later unless secured | W05, W11 |
| F35 | Email/push delivery: Absent delivery, preference fields/UI present | Delivery provider, consent, preference enforcement, unsubscribe, retries, browser permission UX, notification privacy | Full target; hide controls until delivery works | W39 |

## Identity, interface and platform

| ID | Capability / current source coverage | Remaining acceptance criteria | Day one | Package |
|---|---|---|---|---|
| F36 | Profiles/edit profile: Present; profile and hover-card reads now require requester and target workspace membership, and caches are keyed by viewer/workspace/target | Input/URL validation, avatar privacy, live revocation while a profile is open, and independent QA | Conditional | W05, W13 |
| F37 | Hide/unhide users: Partial | Consistent history/search/thread/notification semantics; explain hidden content; recoverable management UI; never treated as authorization | Later | W13 |
| F38 | Online/away/offline presence: Partial fields/actions, no observed callers | Multi-device expiry, background-tab policy, privacy and no misleading persistent ONLINE default | Later | W06, W13 |
| F39 | Search keyboard entry and navigation: Partial | Ctrl/Cmd+K, focus/escape behavior, list navigation without animation delay, editor shortcuts do not conflict | Conditional | W14, W16 |
| F40 | Whole-application mobile responsiveness: Partial; focused source risks documented | Every enabled route passes MR01–MR14: 320px reflow, keyboard/safe-area composition, touch/keyboard parity, state retention, mobile admin/calls and real-device performance/accessibility evidence | Mandatory for every enabled feature, including day-one core | W16/W18 plus each feature package |
| F41 | Themes/tokens/accessibility: Partial, base tokens and dark-only provider | Semantic states, focus, contrast, labels, system/manual theme, 200% zoom and touch targets | Core focus/labels; themes later | W16 |
| F42 | Precision motion: Partial primitive transitions | Implement the motion-rich M01–M30 system across every enabled surface; feature-owned state transitions; interruptibility, focus/cleanup, reduced-motion equivalents, mobile frame budgets and motion regression checks | Core subset in P02; full cross-feature coverage is mandatory as each feature ships | W17 plus owning feature packages |
| F43 | Performance/caching: Partial, Query with 60s stale time | Measured baseline, cache matrix, budgets, no broad refresh storms, query/DOM bounds | Core highest-yield subset | W05, W08, W14 |
| F44 | Whole-application TDD and automated quality: Absent configured test foundation | Mandatory red/green/refactor; F01–F108 test mapping; unit/component/real-DB/API/policy/provider/browser/mobile/migration/performance tests; coverage ratchet, blocking CI and regression-first fixes | Mandatory for every implemented behavior and release | W01/W18 plus every feature package |
| F45 | Operations/recovery: Partial setup scripts | Migrations, environment schema, monitoring, restore rehearsal, cron ownership, worker auth, least-privilege credentials | Core deployment gate; full later | W19 |
| F46 | Offline read/outbox sync: Absent | Encryption/storage policy, account isolation, revocation, conflict resolution, attachment quotas, stale-data indication | Full target, phased | W39 |
| F47 | Integration/API/bot surface: Absent | Scoped tokens, explicit send authority, rate limits, webhook verification, event versioning; detailed in F102/F103 | Full target, phased | W36 |
| F48 | Advanced-feature umbrella, superseded by detailed scope | Calls, meetings, AI meeting follow-up, identity, clients and governance are specified as F79–F108; not an extra counted feature | Full target, phased | W31–W38 |

## Additional production product requirements

Added following the request for a broader production application design. These rows distinguish missing product destinations from existing functionality they reuse. **Proposed** means unimplemented scope, not a fresh runtime audit. Routes R01–R78 are authoritative in [routes](routes.md). P1 means recommended production experience; P2 means later maturity. Neither expands the eight-hour candidate automatically.

| ID | Capability / proposed scope | Acceptance criteria beyond existing features | Priority / routes | Package |
|---|---|---|---|---|
| F49 | Personal workspace Home | Bounded recent/attention/draft summaries; resume direct context; no generic KPI dashboard or hidden-channel previews | P1, R18/R19 | W22 |
| F50 | All-unread inbox | **Implemented slice:** authorized unread conversations, earliest unread jump, explicit per-conversation mark-read, 25-row keyset paging and sidebar count. **Still planned:** visibility-aware live read boundary, personal unread override semantics, complete failure/large-inbox behavior, mobile/accessibility acceptance and independent QA | P1, R21 | W22 |
| F51 | Thread inbox and subscriptions | Follow/unfollow, participated/followed/unread filters; dedupe thread rows; current source access; configurable follow-on-participation | P1, R22 | W22 |
| F52 | Direct-message inbox | Recent/unread DMs with peer names; stable SQL activity cursor page and page-only detail hydration are implemented; consistent new-DM entry; no ordinary two-member private-channel confusion | P1, R23/R24 | W05, W22, builds on W12 |
| F53 | Draft and send center / global compose | Author-only draft list, recipient picker, origin thread; distinguish pending/failed/uncertain; resume original intent safely; draft sync conflict policy | P1, R25/R26 | W22, builds on W13 |
| F54 | Workspace file library | Authorized file metadata index, filters/cursors, source provenance, direct preview and expiring downloads; no private file-name/count leak | P1, R35/R36 | W24, builds on W09 |
| F55 | Full search destination | URL filters and typed result categories; command-search handoff; pagination, Back/Forward and older-message context; private search telemetry suppressed | P1, R37 | W24, builds on W14 |
| F56 | Resumable onboarding and workspace chooser | Skippable profile/preferences, idempotent completion, useful no-workspace state, invite continuation and safe last-context restore | P1, R05/R07 | W21 |
| F57 | Notification policy, mute and quiet hours | Account defaults, workspace/channel overrides, explicit DND expiry, timezone-aware schedule, precedence shown; preserve inbox records while pausing interruptions | P1, R10/R39 | W23 |
| F58 | Personal appearance/accessibility/composer preferences | System/manual theme, density/text sizing, reduced motion, Enter behavior, locale/timezone; account scope and validation; no unsupported settings | P1, R09 | W23 |
| F59 | Session/device management and revocation | Current and other sessions distinguished, approximate activity honestly labeled, revoke effective on server and realtime, reauthentication and safe logout; no fabricated password controls | P1, R11 | W23 |
| F60 | Invitation lifecycle console | Pending/expired/revoked/accepted states, expiry/use bounds, resend only if email delivery exists, race-safe acceptance and rotation, auditable grants | P1, R04/R42 | W25, builds on W15 |
| F61 | Administrative overview and audit trail | Actionable configuration summary without private content; immutable actor/action/target/outcome events, bounded filters and restricted access | P1 overview, P2 audit UI; R40/R45 | W25 |
| F62 | Reporting and moderation cases | Report from permitted content, requester receipt, explicit reviewer capability, least-disclosure evidence snapshot, resolution/reopen policy, audit action | P2, R46/R49 | W26 |
| F63 | Privacy/data lifecycle and requests | Personal export/deactivation and workspace retention/export policy separately authorized; ownership transfer gate; scoped expiring export artifact; job status/cancel/failure/expiry | P2, R12/R47/R49; conditional R16/R17 | W26 |
| F64 | Help, auth-error and connection recovery | Safe reason codes, original destination retained, accessible help/shortcuts, separate network/session/realtime diagnosis; no secrets in copied diagnostics | P1, R03/R13–R15 | W21 |
| F65 | Later triage and personal reminders | Saved-item status independent of source message; snooze/due/completed model; timezone-aware idempotent reminder; revoked source produces no preview | P1 triage R28, P2 reminders R29 | W24 triage, W26 reminders |
| F66 | Channel resource collection | Pinned internal messages/files and validated external links; order/edit policy, source-aware previews, safe external navigation; no implicit new sharing grant | P1, R32 resources tab | W24 |
| F67 | Expiring status and availability | User-set status/expiry and timezone displayed distinctly from inferred presence; edit/clear status across surfaces; no false promise of availability | P1, R08/R34 | W23 |
| F68 | Route, panel and navigation continuity | Canonical/legacy links, kind/access checks, direct-load fallback, account/workspace reset, Back/Forward, scroll/focus restoration, reserved-slug collision migration | P1, cross-route | W21 |

Recommended production scope consists of original retained baseline features plus these P1 additions. P2 items are specified for sequencing, not represented as already required enterprise capabilities. F14/F35/F46 are now bounded full-target work in W39; F47 is covered by W36 and F48 by the specific new requirements. Each new feature reuses original permissions, delivery, file and cache contracts rather than inventing a parallel subsystem.

## New collaboration requirements

These are concrete proposed features, not additional day-one obligations. All are priority **P2 expansion** pending sequencing after the recommended production experience. Their complete contracts are in [collaboration feature design](collaboration-features.md); estimates are incremental, not included in W01–W26.

| ID | Capability / coverage | Remaining acceptance criteria | Destination | Package |
|---|---|---|---|---|
| F69 | Channel polls · Proposed/unassessed | Authorized creation/voting; one current ballot per member; atomic close; clear result visibility and vote-change policy; accessible results | Channel/thread message card R31/R24 | W27 |
| F70 | Voice notes · Proposed/unassessed | User-initiated recording and permission recovery; preview/cancel; duration/size limits; private upload; no autoplay; accessible text alternative; retry preserves recording | Composer and message attachment R31/R24 | W28 |
| F71 | Custom workspace emoji · Proposed/unassessed | Admin-managed static image/name allowlist; unique names; sanitized assets; stable reference after retirement; workspace isolation and picker loading bounds | R53; existing composer/reaction picker | W27 |
| F72 | User groups and group mentions · Proposed/unassessed | Authorized group lifecycle and membership; expand recipients at publication; intersect current source access and mute policy; cap fanout; auditable restricted-group use | R54; existing mention picker | W29 |
| F73 | Channel templates · Proposed/unassessed | Versioned preset, preview and editable settings; idempotent atomic creation; validate private visibility/membership; seed no unrelated historical content | R30 create-channel flow | W29 |
| F74 | Announcement acknowledgements · Proposed/unassessed | Explicit acknowledgement distinct from reading; recipient snapshot intersected with access; content version/re-ack policy; bounded author report; no implicit read tracking | Message card R31 and detail drawer | W29 |
| F75 | Tasks from messages · Proposed/unassessed | Create/assign/accept or decline; due/complete/reopen; current-access check; independent task state; source-revocation handling; timezone-safe reminders | R55/R56; message action | W30 |
| F76 | Shared channel notes · Proposed/unassessed | Authorized rich text, version conflict detection, revision history, explicit edit authority, search projection, archive/delete policy, source links | R57/R58; R32 resources | W30 |
| F77 | Keyword notification rules · Proposed/unassessed | Personal bounded rules; documented text matching; publish-time access checks; dedupe with mentions; precedence with DND/mute; test rule without notifying others | R10; existing Activity R20 | W27 |
| F78 | Saved searches · Proposed/unassessed | Personal name and normalized filter AST; no stored result content; run through current authorization; edit/delete; missing-filter recovery | R37 saved-search panel | W27 |

## Calls, meetings and the full communication platform

The latest direction explicitly includes production-grade Slack/Discord-style communication. F79–F108 make those capabilities concrete. **Core target** means essential to that full product target, including voice/video, huddles, screen sharing and meeting scheduling; **Full target** sequences the broader community and enterprise capabilities. Both are future implementation, not a claim of day-one completion. Earlier broad exclusions of calls/meetings are superseded.

[Calls and meetings](calls-and-meetings.md) owns F79–F92, with stage behavior F84 also tied to community roles. [Production platform](production-platform.md) owns F93–F108 and closes previously unestimated foundations F14/F35/F46/F47. All following rows are proposed; the narrow source check found no RTC provider or meeting engine in package.json/src/prisma, but is not a new complete runtime audit.

| ID | Capability / coverage | Acceptance criteria | Target / routes | Package |
|---|---|---|---|---|
| F79 | Voice calls · Proposed | Authenticated ringing and join; race-safe accept/end; busy/missed states; device recovery; current membership and kick enforcement | Core target · R59/R60 | W31 |
| F80 | Video calls · Proposed | Explicit camera consent; audio-only fallback; bounded video subscriptions; stable tile/focus layout; browser coverage | Core target · R60 | W31 |
| F81 | Drop-in huddles · Proposed | One active huddle per source; source-scoped join and thread; last-leaver cleanup; no automatic capture | Core target · R31/R24/R60 | W31 |
| F82 | Screen and application sharing · Proposed | Explicit browser chooser; stop/share-ended recovery; presenter authority; bandwidth adaptation; no remote control by implication | Core target · R60/R62 | W31 |
| F83 | Persistent voice rooms · Proposed | Durable room plus separate sessions; join/speak grants; mute/deafen/push-to-talk; occupancy and reconnect accuracy | Full target · R61/R62 | W31 |
| F84 | Stages and town halls · Proposed | Audience cannot publish; moderator promotion/kick; capacity limits; accessible hand queue; event integration | Full target · R62/R64 | W34 |
| F85 | Meeting and event scheduling · Proposed | Timezone-explicit start/end; current-access invitations; durable occurrence ID; edit/cancel; secure join and host policy | Core target · R63/R64 | W32 |
| F86 | Recurring meetings · Proposed | Named timezone and DST rules; bounded occurrence expansion; exceptions/cancellation; stable occurrence identities | Core target · R63/R64 | W32 |
| F87 | Calendar connections and availability · Proposed | Least-privilege OAuth; encrypted tokens; event mapping; renewal/cursor recovery; no feedback loops or private-title leakage | Core target · R65/R64 | W32 |
| F88 | RSVPs and event reminders · Proposed | Idempotent responses; channel-access recheck; event-versioned reminders; cancel suppression; timezone and notification policy | Core target · R64/R20 | W32 |
| F89 | Call history and missed calls · Proposed | Participant-scoped metadata; deduplicated missed state; duration reconciled; no implied recording; safe rejoin/callback | Core target · R59/R60 | W31 |
| F90 | Live captions · Proposed | Visible processing disclosure; language support; lag/error state; ephemeral by default; independent from retained transcript | Full target · R60/R62 | W33 |
| F91 | Meeting recordings · Proposed | Explicit per-session consent; late-join gate; recording indicator; stop/failure; private storage and retention; authorized playback | Full target · R66/R67 | W33 |
| F92 | Transcripts, summaries and action items · Proposed | Consent and lineage; corrections; generation failure; no automatic task creation; source access and deletion propagate | Full target · R67/R56 | W33 |
| F93 | Forum and Q&A channels · Proposed | Channel kind and tag policy; paged topics; thread reuse; resolved/reopen states; moderation and access-aware search | Full target · R68/R69/R70 | W34 |
| F94 | Channel categories and custom sidebar sections · Proposed | Personal order independent of admin categories; keyboard reorder; inherited visibility re-evaluated; no hidden counts | Full target · R30/R43 | W34 |
| F95 | Custom roles and channel overrides · Proposed | Deterministic deny/allow precedence; no self escalation; preview impacts; last-owner protection; revision/audit | Full target · R44 | W34 |
| F96 | Scoped guest access · Proposed | Explicit scope/expiry; no full directory visibility; revoke sessions/media; source-limited search/files; audited renewal | Full target · R71/R42 | W35 |
| F97 | Cross-workspace shared channels · Proposed | Bilateral approval; participant organization labels; common retention/disconnect policy; no workspace-wide sharing | Full target · R72/R31 | W35 |
| F98 | Community onboarding and member screening · Proposed | Rules version acceptance; verified identity; least-privilege pending state; accessible challenge/recovery; no public directory by default | Full target · R07/R73 | W34 |
| F99 | Automated moderation and anti-raid controls · Proposed | Pre-publication decision; bounded rules; appeals/evidence policy; join-rate controls; audit; explicit degraded mode | Full target · R73/R46 | W34 |
| F100 | Slow mode and channel lockdown · Proposed | Server-enforced cooldown; exemptions by capability; threads/edits/bots covered; expiry; clear retry time; auditable restore | Full target · R32/R73 | W34 |
| F101 | Workflow automations · Proposed | Versioned definition; actor/scopes; dry-run; idempotent execution; retry/cancel; loop limits; run history | Full target · R74/R75 | W36 |
| F102 | App directory and installation management · Proposed | Admin consent; scoped installation; private credentials; approval/revocation; no implied public marketplace publishing | Full target · R50/R51 | W36 |
| F103 | Slash commands and webhooks · Proposed | Signature/replay validation; input schema; rate/timeout limits; scoped bot identity; secret rotation; SSRF-safe outbound delivery | Full target · R51/R75 | W36 |
| F104 | Workspace import and migration · Proposed | Dry-run manifest; bounded format; no implicit permission grants; resumable jobs; dedupe; unmapped authors; rollback provenance | Full target · R77 | W37 |
| F105 | Enterprise sign-in and provisioning · Proposed | Tenant identity binding; issuer validation; session revocation; JIT policy; SCIM idempotency; break-glass recovery | Full target · R76/R11 | W37 |
| F106 | Mobile and desktop clients · Proposed | Shared contracts; explicit OS permissions; secure credentials; updates; background limitations; device handoff; release matrix | Full target · Existing app routes + native surfaces | W38 |
| F107 | Localization and optional message translation · Proposed | Locale/date/plural/RTL support; source preserved; opt-in processing; language error state; version-aware private cache | Full target · R09/R31/R24 | W38 |
| F108 | Advanced retention and legal-hold administration · Proposed | Separate hold capability; no ordinary admin content bypass; precedence and expiry; audit; deletion/export reconciliation | Full target · R78/R47 | W37 |

## Completeness rules

Independent QA must verify the feature under [QG01–QG08](qa-engineer.md#required-verification-gates) and record a passing candidate-specific [QF/QR checklist](qa-checklist.md) result after all mandatory cases pass. Developer tests and demos alone do not close a feature. FAIL, BLOCKED, NOT RUN and OUT OF SCOPE are distinct from PASS; fixes require QA reproduction/retest and affected regression checks.

Every implemented requirement follows [TDD](tdd.md) and links actual passing cases in the [test matrix](test-matrix.md). No feature, defect fix or behavior change closes with “tests later”; new behavior/regressions require pre-change failure evidence, and pure refactors require existing-contract evidence. Test selection spans observable behavior and real boundaries rather than private implementation details.

A feature cannot close with desktop-only evidence. [Mobile acceptance MR01–MR14](mobile-responsive.md#acceptance-matrix-and-release-evidence) applies to its enabled routes and failure/recovery states. Browser-specific hardware limitations must have explicit tested alternatives; they do not waive ordinary mobile workflows. Native-client F106 does not replace responsive mobile-web F40.

A feature is complete only when its happy path and its empty, loading, denied, failed, stale, and concurrent states are specified and verified where applicable. Its data must be accessible only through the security policy; its Query keys and invalidations must follow [performance](performance.md); its interactions must follow [design](design.md) and [animation](animation.md).

Closing a feature requires a reference to an implementation change and a recorded test result. For a deliberately omitted feature, record both the user-visible omission and how the backend/transport is prevented from bypassing the cut. Unimplemented expansion features do not block the baseline release.
