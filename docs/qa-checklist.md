# Independent QA execution checklist

[Index](README.md) · [QA engineer role](qa-engineer.md) · [Features](features.md) · [Routes](routes.md) · [Requirement tests](test-matrix.md) · [Mobile](mobile-responsive.md)

## Current verification status

**This is the initial independent-QA ledger, not a completed test report.** All 90 feature entries and 78 route entries are NOT RUN. No independent QA executor or candidate build has been assigned in this documentation round. Existing source observations or developer checks are not converted to PASS here. No QA has been hired or run by creating this checklist.

| Inventory | PASS | FAIL | BLOCKED | IN PROGRESS | NOT RUN | OUT OF SCOPE |
|---|---|---|---|---|---|---|
| 90 product features | 0 | 0 | 0 | 0 | 90 | 0 |
| 78 route patterns | 0 | 0 | 0 | 0 | 78 | 0 |

The initial feature/route names are copied from their authoritative catalogues. Keep IDs stable and synchronize scope changes. QF01–QF90 map one-to-one to catalogue numbers; QR01–QR78 map one-to-one to route IDs. A route may support several features, so route passes do not automatically pass feature behaviors.

Entry-point inspection in [browser evidence](browser-assessment.md) found B02 and the initial B03 authentication failures. B06–B09 now verify the local sign-in/return, logout and post-logout protected-route denial cycle, so local authenticated QA can proceed with isolated fixtures; the deployed callback remains blocked. This is separate developer smoke evidence, not an independent full feature run, and the QF/QR counts remain NOT RUN. Use [phase traceability](delivery-traceability.md) and the [expanded case catalogue](acceptance-cases.md) to prepare each run.

## Rules for executing this checklist

Assign a candidate build, environment/config/schema/flags, synthetic fixture, QA executor and supported device/provider scope to each run. Apply QG01–QG08 from [QA policy](qa-engineer.md#required-verification-gates), the linked F requirements and [test-matrix cases](test-matrix.md). The expected outcome below is only the primary journey; all acceptance, negative/failure/concurrency and applicable mobile cases are also required. Expand each row into actual case records and link them in Evidence/defects.

Use NOT RUN, IN PROGRESS, PASS, FAIL, BLOCKED or OUT OF SCOPE with the definitions in the QA policy. A feature still awaiting implementation remains NOT RUN until the release explicitly excludes it. OUT OF SCOPE requires the release-scope reason and gating evidence. Inaccessible environment/device/provider means BLOCKED. Neither status is a pass or an omission from the full-product inventory.

Do not mark PASS from a screenshot, a developer statement, successful build, mock-only provider result or a sibling route's test. Every PASS links actual case results for its exact candidate and a reviewer. Preserve prior run history when the candidate changes, then reverify affected scope. Recompute counts from the ledger and disclose the enabled-scope denominator in every report.

## Feature verification: QF01–QF90

| QA item | Product feature | Requirements | Primary expected outcome | Verdict | Evidence / defects |
|---|---|---|---|---|---|
| QF01 | GitHub sign-in and account access | F01 | Sign in, sign out and return to the intended conversation after authentication | NOT RUN | B06–B09 are developer browser evidence only; independent expiry/error, denied callback and deployed callback remain |
| QF02 | Guided onboarding | F56 | Complete a profile, join or create a workspace and resume an interrupted setup | NOT RUN | — |
| QF03 | Multiple workspaces | F02 | Create a workspace and switch between teams without mixing their conversations | NOT RUN | — |
| QF04 | Workspace invitations | F03/F60 | Invite teammates, accept links and manage expiry, revocation and acceptance | NOT RUN | — |
| QF05 | Public channel discovery | F07 | Browse topics, search channels and join relevant conversations | NOT RUN | — |
| QF06 | Private channels | F07/F09 | Create invitation-only conversations with access-controlled history and files | NOT RUN | — |
| QF07 | Channel membership management | F08 | Join, leave, invite or remove people according to the channel's permissions | NOT RUN | — |
| QF08 | Channel information | F09 | Maintain a channel's name, topic, description and privacy settings | NOT RUN | — |
| QF09 | Channel archiving | F10 | Archive finished conversations, retain permitted history and restore when needed | NOT RUN | — |
| QF10 | Restricted posting | F11 | Configure who can publish in announcement or controlled channels | NOT RUN | — |
| QF11 | Favorite conversations | F12 | Star important channels for quick access in the sidebar | NOT RUN | — |
| QF12 | Direct messages | F13 | Start and continue a private one-to-one conversation with a teammate | NOT RUN | Developer implementation slice exists; independent QA must run the full [DM contract](direct-messages.md) and F13 cases |
| QF13 | Group direct messages | F14 | Hold small private conversations with several teammates; verify layered group avatars, a truthful count/group marker at one active member and one peer avatar for 1:1 | NOT RUN | Developer tests cover the one-member avatar fallback, idempotent create retries, changed/cross-creator key conflicts, private-key omission, fresh-history generation, creator rename/leave with two active participants after a departure, and one-to-one action denial; independent participant/history/privacy QA remains planned in W39 |
| QF14 | Rich-text messaging | F16 | Compose formatted messages with links, lists and safe pasted content | NOT RUN | — |
| QF15 | Reliable sending and retry | F17 | See whether a message is pending, sent or failed, and retry without losing text | NOT RUN | — |
| QF16 | Message editing and deletion | F18 | Correct sent content or remove it under an explicit author/admin policy | NOT RUN | — |
| QF17 | Threaded replies | F19 | Discuss a message in a thread while preserving the main conversation context | NOT RUN | — |
| QF18 | Emoji reactions | F20 | Respond quickly and inspect who reacted without sending another message | NOT RUN | — |
| QF19 | Person mentions | F21 | Find a teammate in the composer and direct their attention to a message | NOT RUN | — |
| QF20 | Message forwarding | F22 | Share permitted context into another conversation with clear attribution | NOT RUN | Live dialog and integration tests are implementation evidence; independent QA remains |
| QF21 | Message links and history jumps | F15/F23 | Link to a specific message and load its surrounding history, including old messages | NOT RUN | — |
| QF22 | Unread management | F24/F50 | See unread conversations, jump to the first unread item and intentionally mark items read | NOT RUN | — |
| QF23 | Recoverable drafts | F25/F53 | Leave unfinished messages, browse drafts and resume the correct channel or thread | NOT RUN | — |
| QF24 | Typing indicators | F26 | See when another participant is composing in the current conversation | NOT RUN | — |
| QF25 | Scheduled messages | F28 | Schedule, inspect, edit, cancel or send a pending message now | NOT RUN | Scheduled route and cancellation are implementation evidence; edit/send-now and independent QA remain |
| QF26 | File attachments | F29 | Upload files with progress, cancellation and retry and attach them to a message | NOT RUN | Developer integration tests reject SVG and mismatched PNG/MP4 prefixes and accept matching PNG/MP4 headers; private URLs, progress/cancel/retry, full decoding/scanning and independent QA remain unverified |
| QF27 | File preview and download | F30 | Preview supported images/files and download items the user may still access | NOT RUN | — |
| QF28 | Advanced search | F31/F55 | Find messages using people, channels, dates and attachment filters | NOT RUN | — |
| QF29 | Pinned messages | F32 | Keep important decisions available to everyone who can access a channel | NOT RUN | — |
| QF30 | Personal saved items | F33/F65 | Bookmark messages privately and organize them as pending or completed | NOT RUN | — |
| QF31 | Activity and notification inbox | F34 | Review relevant notifications and manage their read state across devices | NOT RUN | — |
| QF32 | Email and push notifications | F35 | Opt into supported external delivery and control the privacy of previews | NOT RUN | — |
| QF33 | People directory and profiles | F06/F36 | Find teammates, inspect their profile and edit one's own profile | NOT RUN | — |
| QF34 | Hide and unhide people | F37 | Reduce unwanted content with an explicit, reversible personal display preference | NOT RUN | — |
| QF35 | Presence and personal status | F38/F67 | Distinguish online/away state from a person's chosen availability and expiring status | NOT RUN | — |
| QF36 | Keyboard command navigation | F39 | Find conversations and move around the app using an accessible command interface | NOT RUN | — |
| QF37 | Personal display and composer settings | F41/F58 | Set theme, text/density, reduced motion, timezone and Enter-to-send behavior | NOT RUN | — |
| QF38 | Offline reading and queued sending | F46 | Read explicitly retained content offline and reconcile queued work on reconnect | NOT RUN | — |
| QF39 | Integrations and bots | F47 | Connect approved external tools with scoped, visible permissions | NOT RUN | — |
| QF40 | Personal workday Home | F49 | Resume recent work and see a bounded summary of items requiring attention | NOT RUN | — |
| QF41 | Followed-thread inbox | F51 | Follow or unfollow discussions and review replies across channels in one place | NOT RUN | — |
| QF42 | Global message composition | F53 | Start a message anywhere, choose its destination and safely retain unfinished work | NOT RUN | — |
| QF43 | Workspace file library | F54 | Browse permitted shared files by conversation, uploader and type | NOT RUN | — |
| QF44 | Mute, quiet hours and notification policy | F57 | Reduce interruptions using account defaults and workspace/channel overrides | NOT RUN | — |
| QF45 | Device and session management | F59 | Inspect active sessions and revoke access from another device | NOT RUN | — |
| QF46 | Workspace roles and administration | F05/F61 | Manage members, ownership and settings and inspect authorized administrative history | NOT RUN | — |
| QF47 | Reporting and moderation | F62 | Report accessible content, track a case and resolve it with explicit reviewer authority | NOT RUN | — |
| QF48 | Privacy and data controls | F63 | Request an export or deactivation and manage authorized workspace data policies | NOT RUN | — |
| QF49 | Personal reminders | F65 | Set or snooze a reminder attached to an accessible message or saved item | NOT RUN | — |
| QF50 | Channel resource collection | F66 | Maintain a useful ordered collection of links, messages and files for a channel | NOT RUN | — |
| QF51 | Channel polls | F69 | Ask a structured question, vote and inspect permitted results | NOT RUN | — |
| QF52 | Voice notes | F70 | Record, preview and send a short audio message with accessible playback | NOT RUN | — |
| QF53 | Custom workspace emoji | F71 | Add approved team emoji and reuse them in messages and reactions | NOT RUN | — |
| QF54 | User groups and group mentions | F72 | Maintain groups such as design or support and mention eligible members together | NOT RUN | — |
| QF55 | Channel templates | F73 | Start a project or team channel with consistent purpose, resources and setup | NOT RUN | — |
| QF56 | Announcement acknowledgements | F74 | Ask recipients to explicitly acknowledge an important announcement and track responses | NOT RUN | — |
| QF57 | Tasks from messages | F75 | Turn a conversation into an assigned task with a due date and completion state | NOT RUN | — |
| QF58 | Shared channel notes | F76 | Write and revise lightweight shared notes linked to their source conversation | NOT RUN | — |
| QF59 | Keyword notification rules | F77 | Receive controlled alerts for chosen words in conversations one can access | NOT RUN | — |
| QF60 | Saved searches | F78 | Save and rerun useful filter combinations without retyping them | NOT RUN | — |
| QF61 | Voice calls | F79 | Call a teammate or group, accept/decline, mute, switch devices and reconnect | NOT RUN | — |
| QF62 | Video calls | F80 | Upgrade a call to camera video with grid/speaker views and device previews | NOT RUN | — |
| QF63 | Drop-in huddles | F81 | Start an informal live conversation attached to a text channel or DM | NOT RUN | — |
| QF64 | Screen and application sharing | F82 | Present a selected screen or window while talking | NOT RUN | — |
| QF65 | Persistent voice rooms | F83 | Join a named room that remains available between sessions | NOT RUN | — |
| QF66 | Stages and town halls | F84 | Host a moderated audience session with speakers and a request-to-speak queue | NOT RUN | — |
| QF67 | Meeting and event scheduling | F85 | Schedule a call, agenda, host, invitees and location in an Events calendar | NOT RUN | — |
| QF68 | Recurring meetings | F86 | Create a series and edit one occurrence or future meetings | NOT RUN | — |
| QF69 | Calendar connections and availability | F87 | Connect Google or Microsoft calendars and synchronize opted-in events | NOT RUN | — |
| QF70 | RSVPs and event reminders | F88 | Accept, decline or tentatively attend and receive timely reminders | NOT RUN | — |
| QF71 | Call history and missed calls | F89 | Review calls, missed invitations and permitted follow-up context | NOT RUN | — |
| QF72 | Live captions | F90 | Read live spoken content with speaker labels during a call | NOT RUN | — |
| QF73 | Meeting recordings | F91 | Request consented recording and replay permitted meetings | NOT RUN | — |
| QF74 | Transcripts, summaries and action items | F92 | Review a meeting transcript and optional source-linked summary or task suggestions | NOT RUN | — |
| QF75 | Forum and Q&A channels | F93 | Create titled tagged discussions and mark accepted answers | NOT RUN | — |
| QF76 | Channel categories and custom sidebar sections | F94 | Organize many channels with shared categories and personal sections | NOT RUN | — |
| QF77 | Custom roles and channel overrides | F95 | Define capabilities and inspect effective permissions for a person/channel | NOT RUN | — |
| QF78 | Scoped guest access | F96 | Invite an external collaborator to specific channels for a bounded period | NOT RUN | — |
| QF79 | Cross-workspace shared channels | F97 | Collaborate across organizations in one deliberately shared conversation | NOT RUN | — |
| QF80 | Community onboarding and member screening | F98 | Present rules, verification and channel selection before community participation | NOT RUN | — |
| QF81 | Automated moderation and anti-raid controls | F99 | Configure spam/link/mention rules and review moderation outcomes | NOT RUN | — |
| QF82 | Slow mode and channel lockdown | F100 | Limit posting frequency or temporarily freeze a busy channel | NOT RUN | — |
| QF83 | Workflow automations | F101 | Build bounded trigger/form/action workflows for routine team work | NOT RUN | — |
| QF84 | App directory and installation management | F102 | Discover approved integrations and review/install/revoke their access | NOT RUN | — |
| QF85 | Slash commands and webhooks | F103 | Invoke approved bot commands and receive signed external events | NOT RUN | — |
| QF86 | Workspace import and migration | F104 | Preview and import supported exported conversations with identity mapping | NOT RUN | — |
| QF87 | Enterprise sign-in and provisioning | F105 | Use organization SSO and manage users/groups through SCIM | NOT RUN | — |
| QF88 | Mobile and desktop clients | F106 | Use dedicated clients with push, deep links and call continuity | NOT RUN | — |
| QF89 | Localization and optional message translation | F107 | Use a localized interface and request an identified translation of a message | NOT RUN | — |
| QF90 | Advanced retention and legal-hold administration | F108 | Manage scoped retention, holds and authorized review/export | NOT RUN | — |

## Route verification: QR01–QR78

Every enabled route requires direct load/refresh, authorized and denied actors, malformed/nonexistent/wrong-parent parameters, empty/loading/populated/error states, Back/Forward and applicable mobile checks. For routes with mutations, validate the real server boundary as well as the UI. `W` denotes `/w/[workspaceSlug]`, as defined in the route registry. Conditional billing/legal/apps availability is a release-scope decision, never an automatic PASS.

| QA item / route | Canonical pattern | Primary route purpose | Verdict | Evidence / defects |
|---|---|---|---|---|
| QR01 / R01 | `/` | Restore last accessible context; otherwise workspaces/onboarding | NOT RUN | — |
| QR02 / R02 | `/login` | GitHub sign-in, reason for expired session, safe return destination | NOT RUN | — |
| QR03 / R03 | `/auth/error` | Explain failed/denied sign-in and retry safely | NOT RUN | — |
| QR04 / R04 | `/invite/[inviteCode]` | Review minimal invitation context, sign in, join; expired/revoked states | NOT RUN | — |
| QR05 / R05 | `/workspaces` | List user's workspaces, switch or create; no universal private workspace directory | NOT RUN | — |
| QR06 / R06 | `/create-workspace` | Create workspace and complete initial membership | NOT RUN | — |
| QR07 / R07 | `/onboarding/[step]` | Resume profile → workspace → preferences → finish; optional steps skippable | NOT RUN | — |
| QR08 / R08 | `/account/profile` | Edit identity, avatar, timezone and expiring status | NOT RUN | — |
| QR09 / R09 | `/account/preferences/[section]` | Appearance, accessibility, composer and language/date settings | NOT RUN | — |
| QR10 / R10 | `/account/notifications` | Quiet hours, DND and default notification policy; delivery capabilities honestly labeled | NOT RUN | — |
| QR11 / R11 | `/account/security` | Review sessions/devices and revoke access; explain GitHub-managed credentials | NOT RUN | — |
| QR12 / R12 | `/account/privacy` | Explain data usage, request personal export/deactivation, see request status | NOT RUN | — |
| QR13 / R13 | `/help` | Task-based help and support contact path | NOT RUN | — |
| QR14 / R14 | `/help/shortcuts` | Searchable keyboard/editor shortcut reference | NOT RUN | — |
| QR15 / R15 | `/help/connection` | Sanitized connection/session/realtime health and safe retry guidance | NOT RUN | — |
| QR16 / R16 | `/privacy` | Published privacy information for external users | NOT RUN | — |
| QR17 / R17 | `/terms` | Published service terms where applicable | NOT RUN | — |
| QR18 / R18 | `W` | Redirect to workspace Home; explicit conversation links still open directly | NOT RUN | — |
| QR19 / R19 | `W/home` | Resume recent conversations, open drafts and see concise attention summary | NOT RUN | — |
| QR20 / R20 | `W/activity` | Mentions, replies, reactions and system events; mark read/filter | NOT RUN | — |
| QR21 / R21 | `W/unreads` | Unread conversations, jump to first unread, explicit mark read | NOT RUN | — |
| QR22 / R22 | `W/threads` | Followed/participated thread inbox; unread filter and unfollow | NOT RUN | — |
| QR23 / R23 | `W/dms` | Recent one-to-one conversations, unread filter and new DM | NOT RUN | — |
| QR24 / R24 | `W/dms/[conversationId]` | Read/reply to a direct conversation with peer identity | NOT RUN | — |
| QR25 / R25 | `W/compose` | Start a message by choosing an allowed channel/person before sending | NOT RUN | — |
| QR26 / R26 | `W/drafts` | Resume/discard drafts; show failed/uncertain sends separately | NOT RUN | — |
| QR27 / R27 | `W/scheduled` | Pending delivery, edit/cancel/send-now, timezone and failure state | NOT RUN | — |
| QR28 / R28 | `W/later` | Saved messages, in-progress/completed triage; source-aware previews | NOT RUN | — |
| QR29 / R29 | `W/reminders` | View upcoming/snoozed/completed reminders | NOT RUN | — |
| QR30 / R30 | `W/channels` | Browse/join accessible public channels; joined/archived filters | NOT RUN | — |
| QR31 / R31 | `W/channels/[channelId]` | Channel timeline with thread/message query state | NOT RUN | — |
| QR32 / R32 | `W/channels/[channelId]/details` | About, members, resources and permitted settings tabs | NOT RUN | — |
| QR33 / R33 | `W/members` | Searchable people directory, roles and availability | NOT RUN | — |
| QR34 / R34 | `W/members/[userId]` | Full profile, timezone/status, authorized DM entry | NOT RUN | — |
| QR35 / R35 | `W/files` | Search/filter files by accessible source, type, person and date | NOT RUN | — |
| QR36 / R36 | `W/files/[fileId]` | Authorized preview, provenance, download and open source message | NOT RUN | — |
| QR37 / R37 | `W/search` | Durable full results with filters and paginated message/file/people scopes | NOT RUN | — |
| QR38 / R38 | `W/settings` | Workspace information, personal overrides and role-appropriate admin links | NOT RUN | — |
| QR39 / R39 | `W/settings/notifications` | Workspace/channel overrides and muted conversation management | NOT RUN | — |
| QR40 / R40 | `W/admin` | Actionable pending invitations/reports and configuration health | NOT RUN | — |
| QR41 / R41 | `W/admin/members` | Role changes, deactivation/removal and owner safeguards | NOT RUN | — |
| QR42 / R42 | `W/admin/invitations` | Create/revoke links; pending/expired invitation lifecycle | NOT RUN | — |
| QR43 / R43 | `W/admin/channels` | Govern names, archival and membership under policy | NOT RUN | — |
| QR44 / R44 | `W/admin/permissions` | Role capabilities, creation/invite policy and posting defaults | NOT RUN | — |
| QR45 / R45 | `W/admin/audit-log` | Filter consequential administrative events and inspect outcomes | NOT RUN | — |
| QR46 / R46 | `W/admin/reports` | Review reported messages, take authorized action, track resolution | NOT RUN | — |
| QR47 / R47 | `W/admin/data` | Retention policy, export jobs and deletion request governance | NOT RUN | — |
| QR48 / R48 | `W/admin/workspace` | Workspace identity, ownership transfer, leave/delete safeguards | NOT RUN | — |
| QR49 / R49 | `W/requests/[requestId]` | Requester-visible status of a report or personal data request | NOT RUN | — |
| QR50 / R50 | `W/apps` | Inspect approved integrations if integration support is chosen | NOT RUN | — |
| QR51 / R51 | `W/apps/[appId]` | Installation status, scopes, configure/revoke | NOT RUN | — |
| QR52 / R52 | `W/admin/billing` | Plan, invoices and subscription lifecycle if monetization is chosen | NOT RUN | — |
| QR53 / R53 | `W/admin/emoji` | Manage custom workspace emoji from administration | NOT RUN | — |
| QR54 / R54 | `W/admin/user-groups` | Manage groups and members from administration | NOT RUN | — |
| QR55 / R55 | `W/tasks` | My tasks and permitted channel tasks | NOT RUN | — |
| QR56 / R56 | `W/tasks/[taskId]` | Direct task link or contextual detail panel | NOT RUN | — |
| QR57 / R57 | `W/channels/[channelId]/notes` | Channel notes list from channel resources | NOT RUN | — |
| QR58 / R58 | `W/channels/[channelId]/notes/[noteId]` | Read/edit a note and inspect revisions | NOT RUN | — |
| QR59 / R59 | `W/calls` | Recent and missed calls | NOT RUN | — |
| QR60 / R60 | `W/calls/[callId]` | Prejoin, live call and ended detail | NOT RUN | — |
| QR61 / R61 | `W/voice` | Persistent rooms directory | NOT RUN | — |
| QR62 / R62 | `W/voice/[roomId]` | Persistent voice room or stage | NOT RUN | — |
| QR63 / R63 | `W/events` | Agenda/calendar and event creation | NOT RUN | — |
| QR64 / R64 | `W/events/[eventId]` | Event/occurrence detail and edit | NOT RUN | — |
| QR65 / R65 | `/account/connections` | Calendar and authorized personal connections | NOT RUN | — |
| QR66 / R66 | `W/recordings` | Permitted recording library | NOT RUN | — |
| QR67 / R67 | `W/recordings/[recordingId]` | Playback, transcript and summary | NOT RUN | — |
| QR68 / R68 | `W/forums` | Forum discovery | NOT RUN | — |
| QR69 / R69 | `W/forums/[forumId]` | Forum topic list | NOT RUN | — |
| QR70 / R70 | `W/forums/[forumId]/topics/[topicId]` | Topic, replies and accepted answer | NOT RUN | — |
| QR71 / R71 | `W/admin/guests` | Guest scopes, sponsors and expiry | NOT RUN | — |
| QR72 / R72 | `W/admin/shared-channels` | Cross-organization agreements | NOT RUN | — |
| QR73 / R73 | `W/admin/safety` | Screening, rules, anti-raid and lockdown | NOT RUN | — |
| QR74 / R74 | `W/workflows` | Permitted workflows and creation | NOT RUN | — |
| QR75 / R75 | `W/workflows/[workflowId]` | Workflow editor and run history | NOT RUN | — |
| QR76 / R76 | `W/admin/identity` | SSO/SCIM setup and recovery | NOT RUN | — |
| QR77 / R77 | `W/admin/imports` | Migration jobs and mapping | NOT RUN | — |
| QR78 / R78 | `W/admin/retention` | Retention, holds and review policy | NOT RUN | — |

## Supporting requirements and cross-feature regression

The catalogue intentionally does not count authorization, caching, tests or operations as extra product features. QA still verifies all applicable F01–F108 rows in [test-matrix](test-matrix.md), including F04/F27/F40–F45/F68 and the other supporting requirements. Record their actual cases with the feature/release run. QG03–QG07 cannot pass merely because every visible feature's happy path passed.

The following cross-feature journeys start NOT RUN and are expanded against each relevant candidate:

| Journey | Expected integrated result | Verdict | Evidence / defects |
|---|---|---|---|
| Join → onboarding → channel → send/thread | Correct membership, safe landing, one durable message and recipient-visible reply | NOT RUN | — |
| Send → search → permalink → saved/file | Current authorized content agrees across all derived surfaces | NOT RUN | — |
| Schedule → worker → notification → edit/cancel | Correct timezone/state, no early disclosure or duplicate intent | NOT RUN | — |
| Draft/upload → incoming call → orientation → resume | Draft and upload preserved, call controls reachable, no duplicate send | NOT RUN | — |
| Invite/role/guest expiry → open chat/file/call | Revocation denies data and removes active media authority everywhere | NOT RUN | — |
| Recurring meeting → calendar sync → RSVP → reminder | Stable occurrence and revision, no sync loop or cancelled notification | NOT RUN | — |
| Call → consent → recording → transcript/task | Capture policy enforced; private artifacts and user-confirmed tasks | NOT RUN | — |
| Shared channel → bot/workflow → disconnect | Explicit bilateral/scoped authority; pending work cannot restore removed access | NOT RUN | — |
| Offline queue → account switch → reconnect | Account isolation, honest stale state and stable send intent | NOT RUN | — |
| Import/retention → hold → export/restore | Provenance and review authority preserved; no forbidden deletion/disclosure | NOT RUN | — |

These integration rows are an additional coverage dimension, not extra product features. A relevant regression reopens affected feature/route verdicts and remains visible until QA verifies the repaired candidate.

## Run and defect references

No execution artifacts or defects are invented in this initial ledger. During QA, use identifiers such as a run ID and defect ID linked to real records; store redacted reports under a clearly identified run location or approved test system. Follow the [QA defect fields and closure workflow](qa-engineer.md#defect-triage-and-fix-verification). Developers mark fixes ready for retest; independent QA closes them after reproduction and adjacent regression pass.
