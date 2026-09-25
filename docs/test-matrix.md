# Requirement-by-requirement test plan

[Index](README.md) · [TDD policy](tdd.md) · [Features](features.md) · [Scenario catalogue](testing.md) · [Routes](routes.md) · [Mobile](mobile-responsive.md)

The [expanded acceptance catalogue](acceptance-cases.md) adds at least six concrete scenarios for every executable requirement (642 baseline), six additional send/retry scenarios under F17, and additional F14 group-creation retry, F22 destination-state, F13 lazy profile-query, and F42 shared-motion-token/button-feedback cases (655 total), plus U01–U24 operation dimensions, route recipes and X01–X20 integrated scenarios. F48 is a child trace, not a dummy test. [Delivery traceability](delivery-traceability.md) maps these to P00–P14. This matrix retains first-test intent and layer ownership.

## Status and use

[Independent QA](qa-engineer.md) reviews and executes the applicable cases beyond developer self-checks. Record user-feature and route verdicts in [qa-checklist.md](qa-checklist.md), with actual case artifacts linked back here during implementation. Every row remains planned in this documentation round; neither the new QA role nor the existence of this matrix establishes a pass.

**Rows without candidate evidence remain PLANNED.** This matrix maps all 108 F requirement IDs to a first executable behavior, an adverse/concurrent case and required test layers. The active follow-up links current green tests in [testing](testing.md), but no green slice closes its entire requirement row or the independent QA gate. It does not claim one test is enough for a feature: split each acceptance criterion and each meaningful role/state into individual cases. Feature register acceptance, testing.md scenarios and MR01–MR14 remain mandatory additions to these starting cases. F48 is a historical umbrella traced to concrete requirements, not an extra implementation or fake passing test.

Layer codes: **U** pure unit/state/property cases; **C** client component interaction; **I** real database/application integration; **E** running-app browser journeys; **S** real service/policy or provider contract plus sandbox verification; **Q** performance/resilience/operational evidence; **D** physical-device/assistive/native checks. D complements automated tests and never replaces them. All interactive features inherit accessibility, compact-layout and reduced-motion checks even when D is not repeated in their row.

The owner is the implementation package from the feature register. During implementation replace PLANNED with links to actual named test cases and red/green evidence; do not manufacture skipped test files to make the matrix look complete. A disabled future feature stays planned and its exposed endpoints must be gated where they exist. High-risk authorization and data-integrity tests cannot be quarantined to close a feature.

## Coverage matrix

| Requirement | First test-first behavior | Adverse / concurrency coverage | Layers | Package owner |
|---|---|---|---|---|
| F01 GitHub sign-in/session | Expired session denies protected load while preserving safe return destination | Logout purges account cache; forged callback state fails | I,E | W01, W02 |
| F02 Workspace create/list/switch | Workspace creation atomically creates owner and initial memberships | Duplicate slug and interrupted transaction leave no partial workspace | I,E | W04 |
| F03 Invite-code join | Valid invitation creates only intended membership | Expired/revoked/duplicate acceptance cannot broaden private access | I,E | W02, W15 |
| F04 Tenant and resource authorization | Every protected operation denies a foreign tenant or private resource | Revocation blocks transport payloads, downloads and cache reuse | I,S,E | W02, W03 |
| F05 Workspace administration | Authorized role/ownership change updates effective access | Last owner removal and ordinary-member administration fail | I,E | W15 |
| F06 Member directory | Directory returns only allowed members in bounded pages | Cross-workspace query and profile email policy do not leak | I,E | W02, W13 |
| F07 Public/private channel creation and browsing | Channel creation assigns correct privacy and memberships | Private discovery and conflicting names are handled safely | I,E | W02, W15 |
| F08 Join/leave/add/remove members | Permitted membership change takes effect across clients | Private self-join and cross-workspace invitation fail | I,E | W02, W15 |
| F09 Channel metadata and privacy | Metadata/privacy changes respect the actor capability | Invalid input and concurrent privacy updates preserve prior data | I,C,E | W15 |
| F10 Archive/unarchive/delete | Archived conversations become read-only and can be restored | Alternate reply/forward/upload paths cannot bypass archive | I,E | W10, W15 |
| F11 Posting permissions | Posting policy produces the specified role decisions | Selected-user tampering and archived exceptions fail | U,I,S | W02, W15 |
| F12 Starred channels | Star desired-state mutation updates navigation once | Repeated retries and access removal do not retain private labels | I,C,E | W05, W10 |
| F13 One-to-one DMs | Concurrent one-to-one DM requests resolve the same user pair | Unrelated private channels are never classified as DMs | I,E | W12 |
| F14 Group DMs | Bounded creation, same-intent lost-response/concurrent retries converge, changed or cross-creator key reuse conflicts, private idempotency data is omitted from ordinary reads, group avatar surfaces remain layered with a truthful count (including the one-active-member marker), and groups remain renameable/leaveable at two active participants after a departure | Adding a member cannot disclose earlier private history; one-to-one DMs remain excluded from group-only actions and retain a single peer avatar | I,C,E | W39 |
| F15 Recent/history channel read | Stable cursor returns published roots without gaps or duplicates | Equal timestamps, deleted boundary and future messages handled | I,E,Q | W04, W05, W08 |
| F16 Rich-text composition | Safe rich text and IME composition preserve intended content | Unsafe pasted markup/links are inert; Enter during IME never sends | C,I,E | W04, W13 |
| F17 Send/pending/retry | Valid intent UUID, lost-response retry persists one message and reuses completed uploads | Missing/malformed key, concurrent conflicts, changed payload, revoked membership and duplicate ack/event cannot create or reveal another row | I,C,E | W04, W06 |
| F18 Edit/delete messages | Allowed edit/delete updates timeline and derived references | Other-author edits, expired window and stale versions fail | I,E | W04, W10 |
| F19 Threads | Reply belongs to the selected root; a published reply refreshes active thread rows and the root timeline count | Foreign parent, deleted root and lost-access reply cannot publish; scheduled/deleted realtime rows do not affect public thread state | I,E | W04, W06, W08 |
| F20 Emoji reactions | Desired reaction set/unset stays atomic and renders correct actors | Repeated requests and interleaved edits do not duplicate or erase data | I,C,E | W06, W10 |
| F21 Mentions | Scoped mention selection notifies eligible users after publication | Forged recipients and unpublished messages never notify | I,C,E | W04, W11, W13 |
| F22 Forwarding | Forward validates both source and destination with attribution | Private-source/posting/archive rules cannot be bypassed | I,E | W12 |
| F23 Message permalinks and jump | Old root and reply permalinks load bounded root context and the correct thread | Denied/deleted targets reveal no cached excerpt; transient load errors offer retry; Back/focus and mobile restoration are verified | I,C,E | W08, W14 |
| F24 Channel unread markers/counts | Focused visible reads advance cursor monotonically with correct count | New unseen messages and overview previews do not mark read | I,E,Q | W05, W06 |
| F25 Drafts | Draft restores in the correct account/channel/thread | Failed send and tab conflict do not lose input or replay uncertain send | C,I,E | W13 |
| F26 Typing indicators | Authorized scoped typing expires after inactivity | Spoofed identity, hidden channel and stale timer are rejected | U,S,E | W03, W06 |
| F27 Reconnect and multi-tab | After a reported interruption, `SUBSCRIBED` catches up the active timeline and summaries once; self-user events still hydrate another tab | Missed deletion and revocation purge stale visible state; real network drop/rejoin and multi-tab convergence are verified in a browser | U,I,S,E | W06 |
| F28 Scheduled messages | Two workers publish one authorized scheduled intent | Cancel/publish races, timezone edge and early-read leaks fail | U,I,E | W07 |
| F29 Attachment upload | Authorized bounded upload finalizes against its intended message | Wrong owner/MIME/size, interrupted upload and orphan cleanup covered | I,S,E | W09 |
| F30 File/image preview/download | Current member obtains private expiring preview/download grant | Expiry and revoked membership prevent renewal; viewer closes accessibly | I,S,E | W09, W17 |
| F31 Search/filter | Validated filters return current-access published results with bounded projection and stable actor/workspace/query-bound keyset pages; invalid filters are explained rather than widened; old targets load a bounded context window | Rapid-query/page races, deleted boundaries, invalid syntax/date/cursors, private/future records and unneeded related data are excluded; transient context failures remain retryable; indexed query plans and latency budgets are verified on representative fixtures | U,I,C,E,Q | W05, W14 |
| F32 Pins | Pin attaches to the correct channel and stays consistent after edit | Cross-channel target and revoked pin authority fail atomically | I,E | W10 |
| F33 Bookmarks/saved items | Personal saved state is idempotent and source access is current | Another user cannot read/change saved items; deleted source safe | I,E | W10 |
| F34 In-app notifications | One recipient intent yields coherent paged count and read state | Cross-recipient writes and failed optimistic reads roll back | I,C,E | W11 |
| F35 Email/push delivery | Opted-in notification uses current preference and deduplicated intent | Unsubscribe, expired token, timeout and DND precedence covered | I,S,E | W39 |
| F36 Profiles/edit profile | Profile updates validated fields and visible caches | Unauthorized profile access and unsafe URLs rejected | I,C,E | W13 |
| F37 Hide/unhide users | Hide/unhide applies consistent reversible display semantics | Hidden state never bypasses source authorization or changes another user | U,I,E | W13 |
| F38 Online/away/offline presence | Presence expires correctly across multiple device sessions | Background/disconnected devices cannot remain permanently online | U,S,E | W06, W13 |
| F39 Search keyboard entry and navigation | Command search/navigation supports focus, arrows and Escape | Editor shortcuts and stale results do not steal or misroute focus | C,E | W14, W16 |
| F40 Whole-application mobile responsiveness | Every enabled route passes mobile reflow/touch/context criteria | Keyboard, breakpoint, landscape and enlarged text preserve input/actions | C,E,Q,D | W16/W18 plus each feature package |
| F41 Themes/tokens/accessibility | Theme/focus/labels/contrast and user text settings work across surfaces | Keyboard traps, unlabeled controls and inaccessible reduced states fail | C,E,D | W16 |
| F42 Precision motion | Shared M01–M30 transitions clarify each enabled feature's state change while input and server state remain immediate | Reduced motion, fast reversal, route/unmount cleanup, focus return, stable scroll, mobile frame budgets and visual states pass | C,E,D,Q | W17 plus owning feature packages |
| F43 Performance/caching | Measured query/cache/render budgets pass on fixed cold/warm fixtures | Cross-account cache, unbounded pages and hidden polling regressions fail | I,E,Q | W05, W08, W14 |
| F44 Automated quality and release verification | CI discovers required suites and fails on actual assertion failures | Empty discovery, missing infrastructure and ignored failure cannot pass | I,E,Q | W01, W18 |
| F45 Operations/recovery | Migration/deploy/backup restore yields usable authorized service | Worker restart, bad configuration and rollback preserve records/access | I,S,Q | W19 |
| F46 Offline read/outbox sync | Opt-in bounded offline text outbox reconciles stable mutation identity | Logout, local expiry, revocation on resume and ambiguous send covered | U,I,E,D | W39 |
| F47 Integration/API/bot surface | Scoped bot/API operation and event delivery enforce installation grants | Revoked secrets, replay and cross-tenant target blocked | I,S | W36 |
| F48 Advanced-feature umbrella, superseded by detailed scope | Concrete advanced requirements F79–F108 carry enabled test evidence | Umbrella never closes without linked domain coverage; no dummy test | I,E,S,D | W31–W38 |
| F49 Personal workspace Home | Home composes bounded authorized summaries and resumes context | One summary error does not blank page or leak private counts | I,E,Q | W22 |
| F50 All-unread inbox | Authorized unread page links to first unread and marks only the selected conversation | Overview never clears unread; cross-workspace cursors and removed memberships reveal no rows | I,E | W22; partial developer evidence in `channel-access.test.ts`, unreads route and mark-read component tests; live/device/independent QA open |
| F51 Thread inbox and subscriptions | Follow/unfollow updates one thread row and correct personal unread state | Revoked source removes content; duplicate events do not duplicate rows | I,E | W22 |
| F52 Direct-message inbox | DM inbox shows permitted peer identity and resumes canonical conversation | Removed peer/private-channel misclassification does not leak history | I,E | W22, builds on W12 |
| F53 Draft and send center / global compose | Global compose resumes correct destination and prior send intent | Changed destination, draft conflict and uncertain send preserve intent | C,I,E | W22, builds on W13 |
| F54 Workspace file library | File library filters/paginates only accessible metadata | Hidden file names/counts never appear; source removal invalidates detail | I,E,Q | W24, builds on W09 |
| F55 Full search destination | Search route round-trips filters and Back/Forward correctly | Obsolete result, denied source and malformed filter handled | I,E | W24, builds on W14 |
| F56 Resumable onboarding and workspace chooser | Onboarding resumes idempotently with invite destination intact | Optional steps can be skipped; repeat create does not duplicate membership | I,E | W21 |
| F57 Notification policy, mute and quiet hours | Account/workspace/channel policy and DND expiry resolve correctly | DST boundaries and mute changes affect pending delivery safely | U,I,E | W23 |
| F58 Personal appearance/accessibility/composer preferences | Validated personal preferences apply without altering another account | Unsupported setting and rejected save roll back local preview | U,C,I,E | W23 |
| F59 Session/device management and revocation | Session revocation denies next protected request and media/transport access | Stale JWT or refresh cannot restore revoked authority | I,S,E | W23 |
| F60 Invitation lifecycle console | Invitation states/usage bounds converge under accept/revoke races | Role tampering, expiry and duplicate acceptance fail correctly | I,E | W25, builds on W15 |
| F61 Administrative overview and audit trail | Authorized admin overview and audit show bounded permitted metadata | Ordinary member and private-message disclosure paths denied | I,E | W25 |
| F62 Reporting and moderation cases | Report creates a requester receipt and scoped reviewer case | Duplicate submit and evidence access cannot grant channel history | I,E | W26 |
| F63 Privacy/data lifecycle and requests | Authorized export/deactivation job respects source scope and ownership | Mid-job revocation, last-owner removal and expired download blocked | I,S,E | W26 |
| F64 Help, auth-error and connection recovery | Auth/network/realtime recovery names correct cause and retains draft | Diagnostics omit secrets; retry never manufactures a successful send | C,E | W21 |
| F65 Later triage and personal reminders | Triage/reminder state is personal and due notification idempotent | Snooze/DST/revoked source and duplicate jobs preserve privacy | U,I,E | W24 triage, W26 reminders |
| F66 Channel resource collection | Ordered channel resources retain source permissions | Unsafe external URL and denied linked file cannot broaden access | I,E | W24 |
| F67 Expiring status and availability | Status expires and renders separately from inferred presence | Invalid expiry and multi-device edit conflict resolve coherently | U,I,C | W23 |
| F68 Route, panel and navigation continuity | Canonical/legacy routes preserve kind, focus, scroll and valid selection | Reserved slug and account switch cannot redirect to wrong private source | I,E | W21 |
| F69 Channel polls | Ballot update and close obey one-voter/state rules | Close/vote race, foreign option and hidden ballot details denied | U,I,C,E | W27 |
| F70 Voice notes | Explicit recording previews/sends private audio with text alternative | Permission denial, cap, lost upload and navigation stop tracks safely | C,I,S,E,D | W28 |
| F71 Custom workspace emoji | Managed static emoji has unique name and stable history reference | Unsafe/oversize file and retired/cross-workspace asset handled | I,C,E | W27 |
| F72 User groups and group mentions | Group expansion uses publication-time eligible memberships | Access change, fanout cap and duplicate mention reasons handled | U,I,E | W29 |
| F73 Channel templates | Template preview creates channel/resources atomically and idempotently | Invalid private invitee/name/resource rolls back without history leaks | I,E | W29 |
| F74 Announcement acknowledgements | Explicit acknowledgement binds the correct content version | Concurrent edit/ack, recipient removal and roster disclosure blocked | U,I,E | W29 |
| F75 Tasks from messages | Task assignment/accept/decline/complete follows allowed transitions | Removed assignee, concurrent reopen and due reminder race covered | U,I,E | W30 |
| F76 Shared channel notes | Note save rejects stale version and preserves unsaved text | Private revision fetch, unsafe body and archive mutation denied | I,C,E | W30 |
| F77 Keyword notification rules | Normalized keyword match creates one eligible notification intent | Mute, deleted rule, self-message and unpublished content suppress alerts | U,I,E | W27 |
| F78 Saved searches | Saved filter intent reruns current-access search | Deleted scope cannot silently widen search; parser version recovery tested | U,I,E | W27 |
| F79 Voice calls | Ringing/accept/join/end enforce actor and session transitions | Two-device accept, active revoke, denied microphone and reconnect tested | U,I,S,E,D | W31 |
| F80 Video calls | Explicit camera enable and audio fallback work with bounded subscriptions | Camera denial/unplug and low bandwidth preserve Leave and audio | C,S,E,D,Q | W31 |
| F81 Drop-in huddles | Simultaneous huddle start yields one source-scoped session | Last-leave/reconnect grace and source revocation do not leak admission | I,S,E,D | W31 |
| F82 Screen and application sharing | Explicit screen capture publishes permitted track and stops cleanly | Chooser denial, track end and presenter revoke preserve call controls | C,S,E,D | W31 |
| F83 Persistent voice rooms | Durable voice room uses temporary session generations and join/speak grants | Stale provider event and workspace switch cannot join wrong generation | U,I,S,E,D | W31 |
| F84 Stages and town halls | Audience cannot publish until invited and explicitly accepting | Moderator removal/leave and raised-hand duplication handled | U,I,S,E,D | W34 |
| F85 Meeting and event scheduling | Authorized event schedules concrete occurrence and join policy | Invalid timezone/end time and outsider invite fail without partial event | U,I,E | W32 |
| F86 Recurring meetings | Recurrence exceptions preserve stable occurrences and bounded expansion | DST gap/overlap, month-end and future-only edits tested | U,I,E | W32 |
| F87 Calendar connections and availability | Opted-in calendar mapping syncs versions without feedback loops | OAuth expiry, cursor reset, revoke and forged callback handled | I,S,E | W32 |
| F88 RSVPs and event reminders | RSVP/reminder intent follows current occurrence version and access | Cancel/reschedule racing worker prevents obsolete notification | U,I,E | W32 |
| F89 Call history and missed calls | Call history deduplicates current permitted outcome metadata | Stale callbacks and lost source access do not leak or misclassify calls | I,S,E | W31 |
| F90 Live captions | Disclosed captions show speaker/language and remain ephemeral by default | Processor failure/lag and unsupported language preserve usable call | C,S,E,D | W33 |
| F91 Meeting recordings | All required consent precedes capture; private playback checks audience | Late join, consent withdrawal, partial recorder failure and revoke covered | U,I,S,E,D | W33 |
| F92 Transcripts, summaries and action items | Transcript/summary retains source lineage and confirmed task creation | Prompt injection, inaccessible span, correction and deletion propagate | U,I,S,E | W33 |
| F93 Forum and Q&A channels | Forum topic/tag/accepted answer references same permitted thread | Deleted answer, close/reply race and private search tested | I,E | W34 |
| F94 Channel categories and custom sidebar sections | Personal/category ordering retains access and keyboard alternatives | Cross-device reorder, removed channel and hidden counts handled | C,I,E | W34 |
| F95 Custom roles and channel overrides | Effective capabilities follow explicit role/deny precedence | Self-escalation, multi-role conflict and active-media revoke tested | U,I,S,E | W34 |
| F96 Scoped guest access | Guest sees only scoped resources until expiry | Directory/search leak, sponsor removal and active-session expiry blocked | I,S,E | W35 |
| F97 Cross-workspace shared channels | Bilateral agreement permits only shared conversation scope | Unilateral disconnect racing send/call/export preserves agreed authority | I,S,E | W35 |
| F98 Community onboarding and member screening | Verified rules/approval create only intended membership | Replayed acceptance, new rules and invitation bursts handled | I,E | W34 |
| F99 Automated moderation and anti-raid controls | Enforced rule acts before publication and derivatives | Edit evasion, unavailable required engine and appeal evidence tested | U,I,S,E | W34 |
| F100 Slow mode and channel lockdown | Slow-mode/lockdown enforce server cooldown and expiry across paths | Multi-tab/bot/retry bypass blocked; accepted retry not double charged | U,I,E | W34 |
| F101 Workflow automations | Versioned workflow executes scoped steps once per intent | Loop, revoked authority, uncertain external effect and cancellation tested | U,I,S,E | W36 |
| F102 App directory and installation management | Installation consent binds scopes and revocation stops new access | Missing admin grant, leaked token and pending-job privileges blocked | I,S,E | W36 |
| F103 Slash commands and webhooks | Commands/webhooks verify signature, identity and bounded delivery | Replay, timestamp, redirect/DNS SSRF and cross-tenant event rejected | I,S | W36 |
| F104 Workspace import and migration | Dry-run mapping/import resumes with provenance and no historical alerts | Malformed archive, duplicates, unmapped identity and partial rollback tested | I,S,E | W37 |
| F105 Enterprise sign-in and provisioning | Tenant-bound SSO/SCIM lifecycle preserves explicit identity mapping | Issuer confusion, replay, deactivation and last-owner recovery tested | I,S,E | W37 |
| F106 Mobile and desktop clients | Signed clients preserve deep-link/push/media/account contracts | OS suspension, transfer, token revocation and update failure tested | I,S,E,D | W38 |
| F107 Localization and optional message translation | Localized/RTL UI and requested translation preserve original source | Text expansion, source edit/delete and unsupported provider language handled | U,C,I,S,E,D | W38 |
| F108 Advanced retention and legal-hold administration | Scoped hold blocks deletion without granting content-read capability | Hold/delete race, expired reviewer, restore and derived-artifact cleanup tested | I,S,E | W37 |

## Required expansion of each row

For each operation, enumerate authorized actor, outsider, removed member, wrong tenant and relevant admin/guest/bot roles. Add valid/invalid/absent input, missing/deleted/archived resource, loading/empty/success/error UI, stale/duplicate/out-of-order events and concurrent mutation cases where applicable. Mark an inapplicable dimension with a reason in the case plan, not a skipped assertion. Test both the real server boundary and the visible UI when the behavior spans them.

## Route and mobile traceability

Every enabled R01–R78 pattern gets a record containing its F IDs, fixture actors, direct-load/refresh/Back behavior, happy/empty/denied/failed states, applicable MR IDs, browser/device set and actual test file/case links. Parameterized patterns must include authorized, malformed, nonexistent and wrong-parent/tenant parameters. Optional billing R52 remains absent unless implemented; no empty passing page test substitutes for scope.

The [mobile route-family matrix](mobile-responsive.md#complete-route-family-adaptation) is the inventory boundary. Add tests before constructing each route state, including forms with keyboard open, touch action access and context preservation. No route is marked verified solely because it is a sibling of a tested page or uses the same shell.

## Example evidence record

```text
Requirement: F17
Routes: R31, R24 where enabled
Package: W04/W06
Behavior: retry after lost acknowledgement persists one message
Tests: actual integration and browser case paths, populated during implementation
Red: command + pre-change commit + expected assertion failure
Green: command + candidate commit + passing result artifact
Database: isolated fixture/run identifier; no credentials
Mobile: applicable MR checks + viewport/device evidence
Coverage: changed-module metrics and uncovered-line review
State: PLANNED until those results exist
```

Do not log real message content, tokens or customer media in evidence. Record discovered gaps as remaining work rather than silently broadening exclusions or modifying acceptance to fit current code.
