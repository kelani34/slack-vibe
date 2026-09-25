# Production route and navigation specification

[Index](README.md) · [Feature register](features.md) · [Direct messages](direct-messages.md) · [Screen design](design.md) · [Application contracts](application-design.md) · [Implementation](implementation.md)

[Route phase mapping](delivery-traceability.md#route-delivery-and-verification) assigns every R01–R78 pattern a phase or explicit conditional decision. The [route case recipe](acceptance-cases.md#route-case-recipe-for-r01r78) applies to every enabled pattern and its parameter/section variants.

## Purpose and scope

The original route map largely reflected existing pages. A complete daily-use messaging product also needs places to resume work, manage attention, retrieve shared material, control personal settings, administer access and recover from failure. This specification adds those destinations and defines their relationship to the conversation surface.

All routes below are **design proposals**, except where marked existing. No route or feature has been implemented in this documentation round. A route count is not a production-readiness measure: security, reliable data and usable states remain release requirements. Optional business/enterprise surfaces stay separate from the recommended production experience and the one-day candidate.

## URL strategy

Proposed canonical workspace namespace: `/w/[workspaceSlug]`. Explicit `/channels/[channelId]` and `/dms/[conversationId]` distinguish conversation kinds without making display names identifiers. The existing root-slug routes remain compatibility entry points during a later migration. A DM can reuse a Channel record with a distinct kind; a URL is not a reason for a second message table. See the [DM contract](direct-messages.md) for the participant, history, notification, mobile and media behavior that R23/R24 must expose.

Account routes use `/account`, onboarding uses `/onboarding`, and support uses `/help`. This avoids indefinitely reserving every new global page name as a forbidden workspace slug. **Do not perform this migration in day one** merely to make URLs prettier. New destinations can be delivered incrementally once their behavior and access rules are verified.

`W` below means `/w/[workspaceSlug]`; it is notation only, not a literal URL segment. Every parameter is validated and authorized. Static names and enumerated `[step]`/`[section]` values are allowlisted; unknown values return a safe not-found result.

## Navigation hierarchy

```text
Global
  Workspace switcher → Workspaces / Create workspace
  Search / quick switcher
  Profile menu → Profile / Preferences / Notifications / Security / Privacy
Workspace
  Home
  Activity
  Threads
  Direct messages
  Channels: starred and joined
  More → All unread / Drafts / Scheduled / Later / Files / People
  Workspace settings
  Administration, when permitted
Support
  Help / Keyboard shortcuts / Connection diagnostics
```

Keep four or five stable primary destinations; secondary destinations sit under More or contextual entry points. Do not turn all route patterns into sidebar items. Allow a small later set of pinned shortcuts only if usage warrants it; do not reorder navigation automatically as unread/draft counts change.

Home summarizes where to resume. Activity lists personal events. All unread lists conversations needing reading. Threads lists followed/participated discussions. These are different views over existing domain data, not four independent copies of messages.

## Route registry

Status: **existing** = route exists today; **evolve** = existing route or component becomes this surface; **new** = destination absent in the assessed inventory. Priority: **P1** = recommended daily-use production scope, **P2** = subsequent maturity, **Conditional** = only for a product/business requirement. P1 does not mean eight-hour delivery.

### Entry, account and support

| ID | Canonical path | Status / priority | Purpose and main action | Access / feature |
|---|---|---|---|---|
| R01 | `/` | Existing / P1 | Restore last accessible context; otherwise workspaces/onboarding | Session-aware; F01/F02/F56 |
| R02 | `/login` | Existing / P1 | GitHub sign-in, reason for expired session, safe return destination | Public; F01 |
| R03 | `/auth/error` | New / P1 | Explain failed/denied sign-in and retry safely | Public, allowlisted reason codes; F64 |
| R04 | `/invite/[inviteCode]` | Existing / P1 | Review minimal invitation context, sign in, join; expired/revoked states | Token capability plus membership rules; F03/F60 |
| R05 | `/workspaces` | New / P1 | List user's workspaces, switch or create; no universal private workspace directory | Account-only; F56 |
| R06 | `/create-workspace` | Existing / P1 | Create workspace and complete initial membership | Signed-in account; F02 |
| R07 | `/onboarding/[step]` | New / P1 | Resume profile → workspace → preferences → finish; optional steps skippable | Account-only, validated steps; F56 |
| R08 | `/account/profile` | Evolve / P1 | Edit identity, avatar, timezone and expiring status | Own account; F36/F67 |
| R09 | `/account/preferences/[section]` | New / P1 | Appearance, accessibility, composer and language/date settings | Own account, validated sections; F58 |
| R10 | `/account/notifications` | Evolve / P1 | Quiet hours, DND and default notification policy; delivery capabilities honestly labeled | Own account; F57 |
| R11 | `/account/security` | New / P1 | Review sessions/devices and revoke access; explain GitHub-managed credentials | Own account, reauthentication for sensitive writes; F59 |
| R12 | `/account/privacy` | New / P2 | Explain data usage, request personal export/deactivation, see request status | Own account; F63 |
| R13 | `/help` | New / P1 | Task-based help and support contact path | Public help; account context optional; F64 |
| R14 | `/help/shortcuts` | New / P1 | Searchable keyboard/editor shortcut reference | Public; F39/F64 |
| R15 | `/help/connection` | New / P1 | Sanitized connection/session/realtime health and safe retry guidance | Own client only; F64 |
| R16 | `/privacy` | New / Conditional | Published privacy information for external users | Public, owner-reviewed content; F63 |
| R17 | `/terms` | New / Conditional | Published service terms where applicable | Public, owner-reviewed content; no invented legal assurances |

Do not add password reset/change-password pages for a GitHub-only product. Account recovery directs users to the identity provider and an explicit support path. Email/password auth, MFA enrollment and SSO configuration require a separate identity decision, not decorative settings forms.

### Everyday workspace routes

| ID | Canonical path | Status / priority | Purpose and main action | Access / feature |
|---|---|---|---|---|
| R18 | `W` | Evolve / P1 | Redirect to workspace Home; explicit conversation links still open directly | Workspace member; F49/F68 |
| R19 | `W/home` | New / P1 | Resume recent conversations, open drafts and see concise attention summary | Personalized membership-scoped projection; F49 |
| R20 | `W/activity` | Evolve / P1 | Mentions, replies, reactions and system events; mark read/filter | Recipient-only plus current resource access; F34 |
| R21 | `W/unreads` | New / P1; implemented slice, QA pending | Cursor-paged unread conversations, jump to earliest unread, explicit per-conversation mark read | Workspace/channel membership required; F50; full route/mobile acceptance remains open |
| R22 | `W/threads` | New / P1 | Followed/participated thread inbox; unread filter and unfollow | Root/source access required; F51 |
| R23 | `W/dms` | New / P1 | Recent one-to-one conversations, unread filter and new DM | Participant-only; F13/F52; [DM contract](direct-messages.md) |
| R24 | `W/dms/[conversationId]` | Evolve / P1 | Read/reply to a direct conversation with peer identity | Validate direct kind and current participation; F13; [DM contract](direct-messages.md) |
| R25 | `W/compose` | New / P1 | Start a message by choosing an allowed channel/person before sending | Scoped recipient discovery and send policy; F16/F53 |
| R26 | `W/drafts` | New / P1 | Resume/discard drafts; show failed/uncertain sends separately | Author-only; F25/F53 |
| R27 | `W/scheduled` | Evolve / P1 | Pending delivery, edit/cancel/send-now, timezone and failure state | Author-only; F28 |
| R28 | `W/later` | Evolve / P1 | Saved messages, in-progress/completed triage; source-aware previews | Personal saved records and current source access; F33/F65 |
| R29 | `W/reminders` | New / P2 | View upcoming/snoozed/completed reminders | Personal reminders; F65 |
| R30 | `W/channels` | Evolve / P1 | Browse/join accessible public channels; joined/archived filters | Workspace member; private discovery excluded; F07 |
| R31 | `W/channels/[channelId]` | Evolve / P1 | Channel timeline with thread/message query state | Channel member, ordinary-channel kind; F15/F19/F23 |
| R32 | `W/channels/[channelId]/details` | Evolve / P1 | About, members, resources and permitted settings tabs | Field/action-level capability checks; F08/F09/F66 |
| R33 | `W/members` | Evolve / P1 | Searchable people directory, roles and availability | Shared workspace projections; F06 |
| R34 | `W/members/[userId]` | Evolve / P1 | Full profile, timezone/status, authorized DM entry | Shared workspace; F36/F67 |
| R35 | `W/files` | New / P1 | Search/filter files by accessible source, type, person and date | Joined-channel/DM visibility predicate; F54 |
| R36 | `W/files/[fileId]` | Evolve / P1 | Authorized preview, provenance, download and open source message | Current message/channel access; F30/F54 |
| R37 | `W/search` | Evolve / P1 | Durable full results with filters and paginated message/file/people scopes | Type-specific permissions; F31/F55 |
| R38 | `W/settings` | Evolve / P1 | Workspace information, personal overrides and role-appropriate admin links | Member view; exclude invitation secrets; F05/F57 |
| R39 | `W/settings/notifications` | New / P1 | Workspace/channel overrides and muted conversation management | Own settings only; F57 |

For R28, “completed” means the user's saved-item triage status, not a team task marked complete. R26 must distinguish a never-submitted draft from a send that may already have committed; resuming an uncertain send first resolves its original client mutation ID.

### Administration and request tracking

| ID | Canonical path | Status / priority | Purpose and main action | Access / feature |
|---|---|---|---|---|
| R40 | `W/admin` | New / P1 | Actionable pending invitations/reports and configuration health | Admin/owner; no private-message activity dashboard; F61 |
| R41 | `W/admin/members` | Evolve / P1 | Role changes, deactivation/removal and owner safeguards | Capability-scoped admin, ownership transfer owner-only; F05 |
| R42 | `W/admin/invitations` | New / P1 | Create/revoke links; pending/expired invitation lifecycle | Invite authority; F60 |
| R43 | `W/admin/channels` | Evolve / P1 | Govern names, archival and membership under policy | Scoped admin metadata; no implicit private-history access; F05/F10 |
| R44 | `W/admin/permissions` | New / P1 | Role capabilities, creation/invite policy and posting defaults | Owner or delegated capability; F05/F11 |
| R45 | `W/admin/audit-log` | New / P2 | Filter consequential administrative events and inspect outcomes | Authorized admin; minimal immutable metadata; F61 |
| R46 | `W/admin/reports` | New / P2 | Review reported messages, take authorized action, track resolution | Designated moderator capability, not automatic private browsing; F62 |
| R47 | `W/admin/data` | New / P2 | Retention policy, export jobs and deletion request governance | Explicit owner/data capability; F63 |
| R48 | `W/admin/workspace` | Evolve / P1 | Workspace identity, ownership transfer, leave/delete safeguards | Owner-sensitive actions; F05 |
| R49 | `W/requests/[requestId]` | New / P2 | Requester-visible status of a report or personal data request | Request owner; moderator notes excluded; F62/F63 |

Role labels alone are insufficient for new moderation/data powers: use explicit capabilities backed by policy and tests.

### Conditional expansion destinations

| ID | Canonical path | Status / priority | Purpose and main action | Access / feature |
|---|---|---|---|---|
| R50 | `W/apps` | New / Conditional | Inspect approved integrations if integration support is chosen | Workspace member; approval controls gated; F47 |
| R51 | `W/apps/[appId]` | New / Conditional | Installation status, scopes, configure/revoke | Installer/admin policy; F47 |
| R52 | `W/admin/billing` | New / Conditional | Plan, invoices and subscription lifecycle if monetization is chosen | Billing authority; separate product specification, F48 |

Conditional routes are not rendered as empty placeholders. Group DMs can extend R23/R24 after F14's privacy and participant-history policy is specified. Calls, canvases, tasks, AI, native apps and enterprise identity remain separately justified product bets.

## Route versus state versus action

| Need | Representation | Reason |
|---|---|---|
| Persistent destination or direct resource link | Path | Refresh, bookmarking, new tab and recovery need a stable address |
| Thread or selected message within conversation | `?thread=…&message=…` | Retains conversation context and existing permalink semantics |
| Activity/unread/thread filter | `?filter=unread`, allowlisted tab values | Useful Back/Forward and shareable view state without extra pages |
| Search | `?q=…&type=messages&in=…&from=…&after=…&before=…` | Serialize validated filters; sanitize telemetry/referrers because queries may be sensitive |
| Channel details tab | `?tab=members`, with allowlisted about/members/resources/settings values | Reuse one details resource; do not make four unrelated CRUD pages |
| Emoji picker, tooltip, reaction menu, formatting toolbar | Local transient state | Not independently useful links |
| Send, delete, join, mark read, revoke, report submission | Authenticated mutation | Never perform writes from GET navigation, redirect or prefetch |
| Error, no results, access denial, offline state | Route-level/component state | Do not create a dedicated URL for every failure and lose the original destination |

Tab values are enumerated alternatives, not free-form strings. Search term URLs are user-visible but must not be copied into general analytics or third-party referrers. Offer a clear-search control and preserve no sensitive excerpts in public metadata.

## Panels with direct-load fallbacks

R32, R34 and R36 may open as a contextual panel when entered from a conversation, and as a full page on direct navigation or narrow screens. Both use the same authorized loader and content component. Prefer ordinary routes plus deliberate presentation state initially; Next.js intercepted/parallel routes are optional, not prerequisites.

Browser Back closes the panel and restores the source location when it was opened from that source; direct navigation gets a clear “Back to channel/files/people” link. Opening a panel never marks a conversation read unless messages were actually visible. Account/admin routes use a dedicated settings layout, not a stack of floating dialogs.

## Essential end-to-end journeys

1. **Start the workday:** `/` restores last context; Home offers unread threads, recent conversations and resumable drafts. Open Activity for personal mentions or All unread for channel catch-up. Home is not a required detour on every visit.
2. **Find and message a teammate:** People → profile → DM, or Direct messages → compose → recipient. All entry points converge on the same unique DM pair and show the same history.
3. **Resume interrupted work:** Drafts → originating channel/thread composer. A removed-channel draft explains lost access without exposing cached history. Failed/uncertain sends resolve their existing intent before retry.
4. **Catch up on discussions:** Threads → unread followed thread → contextual conversation. Follow/unfollow is explicit; participating may follow by default, with a visible preference. Marking a thread unread creates a personal attention override, not a backwards global read cursor.
5. **Retrieve a file:** Files → preview → source message. File and source require the same current access; moving across views does not broaden sharing.
6. **Control interruptions:** Profile menu → notifications → quiet hours; channel menu → mute/mentions-only override. Existing inbox records remain readable while intrusive notifications are paused.
7. **Bring someone into the team:** Admin invitations → scoped expiring invite → join → resumable onboarding. Repeated acceptance is idempotent and revocation wins before membership creation.
8. **Recover from auth or connectivity failure:** preserve safe return destination and user-authored draft; explain session/realtime/network status separately; reauthenticate without replaying an uncertain send as a new intent.
9. **Manage a sensitive change:** owner/admin settings → precise confirmation → durable operation result and audit record; last owner and private-content boundaries stay intact.

## Compatibility and rollout

| Current URL | Proposed canonical destination | Migration rule |
|---|---|---|
| `/[workspaceSlug]` | `W/home` | Preserve explicit last-conversation navigation at `/`; do not redirect direct message links to Home |
| `/[workspaceSlug]/[channelId]` | R31 or R24 | Authorize first and resolve conversation kind; preserve validated `thread`/`message` |
| `/[workspaceSlug]/browse-channels` | `W/channels` | Preserve compatible filters |
| `/[workspaceSlug]/members` | `W/members` | Same member visibility |
| `/[workspaceSlug]/saved-items` | `W/later` | Preserve existing bookmarks during triage schema evolution |
| `/[workspaceSlug]/scheduled` | `W/scheduled` | Author-only drafts and complete worker rules |
| `/[workspaceSlug]/settings` | `W/settings` | Do not redirect ordinary members into admin-only route |
| Existing global login/create/invite | Same route | Avoid unnecessary migration |

Audit existing workspace slugs against new global names (`w`, `account`, `workspaces`, `onboarding`, `help`, `privacy`, `terms`, `auth`). If a legacy workspace occupies one, explicitly migrate its slug with owner communication or choose a non-conflicting rollout. Do not resolve ambiguity by silently pointing a private workspace link to a global page. New slug validation reserves the selected names only after existing collisions are handled.

Begin with temporary authenticated compatibility redirects until destination behavior is verified; choose permanent redirects only after collision and rollback review. Redirect responses must not be shared across users for permission-dependent destinations. Canonical URLs are constructed in one route helper with a narrow concrete contract, not repeated string concatenation across notifications, search, copied links and emails.

## Loading, performance and access contract

Every enabled route participates in [test-first delivery](tdd.md) and [route test traceability](test-matrix.md#route-and-mobile-traceability): write direct-load, authorization, parameter, state and navigation tests before implementing the corresponding behavior. Shared shell tests do not substitute for each resource loader's access checks. Route patterns without an implementation are recorded as planned/absent, never as passing empty tests.

Every enabled R01–R78 pattern must also satisfy the [mobile route-family matrix](mobile-responsive.md#complete-route-family-adaptation) and MR01–MR14. Compact screens use the same canonical resource and access checks, with details replacing the main pane and explicit Back restoration. Width changes must not instantiate a second composer/media client or reset drafts. Record conditional routes as absent rather than silently exempting enabled admin, call or recovery routes from mobile checks.

Each route owns only its first visible data slice. Home requests bounded summaries, not complete messages for every channel. Inboxes and admin tables use cursor pages and server filters. Sidebar counts come from one summary contract; they do not independently poll each destination. Prefetch likely routes on intent with limits, not all sidebar/admin links on every render.

All routes have initial/loading, empty, failed, denied, stale/disconnected and unavailable-resource states where applicable. Filter changes preserve focus and scroll deliberately. Navigation state and keyboard highlights are instant; existing M01–M30 motion applies. No new decorative entrance sequence is needed because the app has more pages.

Route metadata/Open Graph/unfurl previews never contain private content or invitation secrets for unauthenticated callers. Pagination, search suggestions, counts and admin summaries enforce the same visibility predicates as detail pages. A route hidden by capability remains guarded on direct load.

## Additional collaboration destinations: R53–R58

The [ten new collaboration specifications](collaboration-features.md) add six proposed expansion route patterns to the original 52, making **58 at that milestone**; R59–R78 below extend the current total to 78. `W` retains the canonical workspace prefix defined above. These are P2 expansion routes, gated until their underlying features are ready; direct loads must enforce the same capability checks as their entry points.

| ID | Proposed route | Purpose / entry | Access and states | Feature / package |
|---|---|---|---|---|
| R53 | `W/admin/emoji` | Manage custom workspace emoji from administration | Authorized managers; paged list/upload/validation/retirement states; members use the existing picker | F71 / W27 |
| R54 | `W/admin/user-groups` | Manage groups and members from administration | Authorized managers; group detail as selection state, paged members, archived/conflict states; mention suggestions remain capability-filtered | F72 / W29 |
| R55 | `W/tasks` | My tasks and permitted channel tasks | Current source-channel access on every row/count; URL filters for assignee/status/due/channel; empty/overdue/denied states | F75 / W30 |
| R56 | `W/tasks/[taskId]` | Direct task link or contextual detail panel | Authorized detail, independent task state, unavailable source, version conflict; narrow screen uses full page | F75 / W30 |
| R57 | `W/channels/[channelId]/notes` | Channel notes list from channel resources | Channel readers; creation requires edit capability; metadata pages only; archive is read-only | F76 / W30 |
| R58 | `W/channels/[channelId]/notes/[noteId]` | Read/edit a note and inspect revisions | Parent/channel invariant, reader/editor distinction, explicit save/conflict/revision states | F76 / W30 |

Polls, voice notes and acknowledgements use existing conversation message links (R31/R24 as their feature permits). Channel templates live in the R30 creation flow. Keyword rules live at R10 and saved searches at R37. These are real features without separate top-level pages. Tasks may be an optional workspace navigation item; notes are channel-local. Do not crowd the primary sidebar with every feature. All new panels inherit direct-load fallbacks, Back/Forward, focus restoration and access-denied behavior above.

## Calls, meetings and platform destinations: R59–R78

These twenty proposed patterns bring the complete registry to **78**. [Calls and meetings](calls-and-meetings.md) and [production platform](production-platform.md) own behavior and states. Voice/video, huddles, screen sharing and scheduling are part of the full production target. Routes are enabled with their domain contracts, not as empty pages. Existing R50/R51 apps move from hypothetical destinations to planned installation-management surfaces in W36; billing R52 remains conditional.

| ID | Proposed route | Purpose | Access and states | Feature / package |
|---|---|---|---|---|
| R59 | `W/calls` | Recent and missed calls | Participant/source-scoped history; filter/date pagination | F79/F89 / W31 |
| R60 | `W/calls/[callId]` | Prejoin, live call and ended detail | Current join grant; no automatic capture; provider/permission/reconnect states | F79–F82/F89–F92 / W31/W33 |
| R61 | `W/voice` | Persistent rooms directory | Only permitted room names/occupancy; empty/capacity/denied states | F83 / W31 |
| R62 | `W/voice/[roomId]` | Persistent voice room or stage | Explicit Join; audience/speaker grants; source membership and host policy | F83/F84 / W31/W34 |
| R63 | `W/events` | Agenda/calendar and event creation | Bounded date window; visible timezone; create via explicit action/panel | F85/F86/F88 / W32 |
| R64 | `W/events/[eventId]` | Event/occurrence detail and edit | Stable occurrence link; RSVP, cohost, series edit scope and cancelled state | F85–F88 / W32 |
| R65 | `/account/connections` | Calendar and authorized personal connections | Own OAuth scope/status/revoke; secrets server-side | F87 / W32 |
| R66 | `W/recordings` | Permitted recording library | Source and artifact audience intersection; metadata pagination | F91/F92 / W33 |
| R67 | `W/recordings/[recordingId]` | Playback, transcript and summary | Private playback grant; consent/processing/failure/retention states | F91/F92 / W33 |
| R68 | `W/forums` | Forum discovery | Authorized forum channels; filters and empty/create capability | F93 / W34 |
| R69 | `W/forums/[forumId]` | Forum topic list | Conversation-kind invariant; bounded tags/status/topic metadata | F93 / W34 |
| R70 | `W/forums/[forumId]/topics/[topicId]` | Topic, replies and accepted answer | Parent access; draft/locked/removed-answer states; source links | F93 / W34 |
| R71 | `W/admin/guests` | Guest scopes, sponsors and expiry | Guest-manager capability; auditable grants and revoke progress | F96 / W35 |
| R72 | `W/admin/shared-channels` | Cross-organization agreements | Bilateral authority; preview policy; pending/active/disconnected states | F97 / W35 |
| R73 | `W/admin/safety` | Screening, rules, anti-raid and lockdown | Safety capability; dry-run, published version, appeal/case links | F98–F100 / W34 |
| R74 | `W/workflows` | Permitted workflows and creation | Installation/invoking-user access; draft/published/disabled states | F101 / W36 |
| R75 | `W/workflows/[workflowId]` | Workflow editor and run history | Versioned steps, dry-run, scoped attempts; no credential values | F101/F103 / W36 |
| R76 | `W/admin/identity` | SSO/SCIM setup and recovery | Owner identity-management capability; test before enforce | F105 / W37 |
| R77 | `W/admin/imports` | Migration jobs and mapping | Import capability; private source, dry-run, cursor progress/partial failure | F104 / W37 |
| R78 | `W/admin/retention` | Retention, holds and review policy | Separate hold/review capabilities; policy conflicts and audit | F108 / W37 |

Existing R44 owns custom-role editing; R30/R43 own channel categories; R07 owns community screening; R09 owns locale and translation preferences. Scheduled messages remain R27 and personal reminders R29, distinct from Events. Optional navigation adds Calls, Voice, Events and Forums through More or workspace configuration. Only one active media controller exists across route changes; ordinary navigation preserves a compact return/leave dock. Changing account or workspace explicitly resolves the call rather than silently transplanting it.

Forum links authorize both forum kind and topic parent. Call/recording links never grant admission or artifact access by possession alone. The eventId route addresses a stable concrete occurrence; series identity and original occurrence keys remain in the model, with validated selection state for future-series editing. All creation/edit controls have direct-load recovery on their owning route without introducing extra duplicate URL patterns.

## Reference research

The priorities are product recommendations for Slack Vibe, not a claim that every communication product needs every Slack feature. Slack documents [draft continuation](https://slack.com/help/articles/201457107-Send-and-read-messages), [thread organization](https://slack.com/help/articles/115000769927-Use-threads-to-organize-discussions), [quiet hours and DND](https://slack.com/help/articles/214908388-Pause-your-Slack-notifications), and [invitation lifecycle management](https://slack.com/help/articles/360060363633-Manage-pending-invitations-and-invite-links-for-your-workspace). These support the choice to prioritize everyday completion and attention management. The routes, grouping, acceptance criteria and priorities here are this project's own design.
