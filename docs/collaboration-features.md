# Ten additional collaboration features

[Index](README.md) · [90-feature catalogue](features.md) · [Direct messages](direct-messages.md) · [Routes](routes.md) · [System](system-design.md) · [Design](design.md) · [Implementation](implementation.md) · [Timeline](timeline.md)

## Scope and delivery contract

F69–F78 expand the proposed product beyond messaging completion and production navigation. They are concrete future design scope; no implementation or fresh source audit is claimed. Each is independently deliverable after its dependencies and can be disabled without hiding or deleting existing records. They are P2 expansion, separately estimated as W27–W30. They do not replace the core reliability, privacy, performance or accessibility work.

Use the existing Next.js application, PostgreSQL/Prisma data model, authorized action boundary, Query cache and verified realtime transport. Extend existing domain modules with specific operations; do not add a generic workflow engine, new database or service per feature. Apply the established [security](security.md), [performance](performance.md), [animation](animation.md) and [operations](operations.md) contracts to every feature below.

DM-specific expansion is tracked separately in the [direct-message contract](direct-messages.md). Polls, voice notes, custom emoji, groups, tasks and notes can appear inside a DM only after their source-conversation access, notification and mobile behavior pass that contract; they do not create a second private-message permission path.

## F69: channel polls

**User outcome:** collect an explicit team decision without counting reactions manually. A channel composer action opens a question/options form, with single-choice or multiple-choice mode and optional closing time. Preview clearly states that this first version is an identified-member poll, who may inspect ballots, whether votes can change, and when results appear. Anonymous polls are outside this version.

**Proposed defaults:** 2–10 plain-text options; result totals visible after voting or closure; creator/admin can close early; voters can change a ballot while open. Individual ballots visible only to the voter and poll creator, stated before voting. Closing does not automatically notify everyone again. After the first vote, question/options are immutable; creator can cancel and recreate a materially incorrect poll. Distinguish cancelled and closed in history.

**Model and operations:** `Poll(messageId, question, mode, resultVisibility, closesAt, state, version)`, `PollOption(pollId, ordinal, text)` and one `PollBallot(pollId, userId, optionIds, version)` per voter. Validate selected option ownership and count in the transaction; lock/check lifecycle so a concurrent close cannot accept a late vote. `createPoll` creates the source message and poll atomically using a mutation ID. `setBallot` is a desired-state operation. `closePoll` and `cancelPoll` are retry-safe. Timed closure is enforced at write/read time even if a background cleanup runs late.

**UI and failure behavior:** show compact selectable options inside a message card, keyboard-operable inputs, explicit submit/change-vote button and text counts alongside visual bars. A failed vote restores the prior ballot and retains the proposed selection. Show closed, cancelled, deleted and lost-access states. The poll's numbers must not reflow the timeline while a person is reading. No confetti, animated count-up or reveal delay.

**Access and tests:** posting permission for creation; current channel membership for voting/results; creator/explicit admin permission for closing and permitted ballot detail. Test duplicate submission, simultaneous close/vote, option tampering, multiple-choice limits, denied ballot detail and access revocation. Poll membership is never inferred from a client-supplied workspace ID.

## F70: voice notes

**User outcome:** send a short spoken update when typing is inconvenient. Recording starts only after an explicit composer action and browser permission. Proposed first-release cap: two minutes and 10 MB, both verified server-side. Permission denial leaves text composition available. Show elapsed duration, Stop, Cancel, playback preview, a required editable text summary and Send. The summary is the initial accessible alternative; automatic transcription is separate, unestimated work.

**Model and operations:** reuse private attachment/upload intent records with an explicit audio media kind, verified MIME type, bytes, duration and text summary. Send through the same message mutation and attachment finalization path as other files. The summary and audio are subject to the same source visibility and retention. Never trust filename extension or browser-reported metadata alone. Support a tested browser/codec set with a clear unsupported-format error; do not silently add a transcoding service to the estimate.

**UI and failure behavior:** compact native or accessible standard audio controls, playback speed, duration and summary. Never autoplay or record after navigation; stop tracks when cancelled, unmounted or access is lost. Playback of a second note pauses the first. Failed upload retains the recording in memory for explicit retry while the composer remains open; reload persistence is not promised. A navigation warning is appropriate only while an unsent recording would be lost. Do not draw an always-running decorative waveform.

**Access and tests:** all upload/download grants inherit channel authorization. Test permission denial, microphone unavailable, cap reached, interrupted upload, revoked access, expired media URL refresh, focus/keyboard playback, supported browsers and cleanup of abandoned recordings. Do not log audio content. Optional future transcription requires explicit provider, privacy, cost and failure design.

## F71: custom workspace emoji

**User outcome:** add recognizable team reactions without turning the picker into an unbounded asset gallery. Admins manage names, preview images, upload replacements and retire entries at R53. Members search approved emoji by name in the existing picker. Initial scope is static images only; animated emoji are deliberately excluded from the daily-use motion budget.

**Model and operations:** `WorkspaceEmoji(workspaceId, name, assetId, version, retiredAt, createdBy)`, unique normalized name per workspace. Store a stable emoji ID in structured messages/reactions; retain the name fallback. Process a small raster allowlist into bounded dimensions, with explicit upload byte limits and safe metadata handling. Raw SVG/HTML is not accepted. Replacements increment version and change the asset cache key. Retirement removes an entry from new selection but preserves an accessible placeholder/reference in history; actual storage deletion follows retention.

**UI, access and tests:** existing reaction picker uses a virtualized or paged results section and lazy images. Admin-only management does not imply access to private messages where emoji appear. Test duplicate names, oversize/invalid content, cross-workspace asset lookup, rename/retire historical rendering, interrupted upload and picker keyboard navigation. Search failure retains ordinary Unicode emoji.

## F72: user groups and group mentions

**User outcome:** address a team such as `@design` without mentioning each person individually. R54 lists admin-managed groups, members and who may use the mention. The composer distinguishes a group from a person and previews the number of eligible recipients. Proposed first version: manually managed groups with no external directory sync or dynamic membership rules.

**Model and operations:** `UserGroup(workspaceId, handle, name, mentionPolicy, archivedAt)` and unique `(groupId, userId)` memberships. Structured mentions store the group ID and readable label. Expand membership at actual publication time, including for scheduled messages, intersect with current conversation access, then apply notification preferences. One notification intent per recipient/source/kind even when person and group mentions overlap. Validate the mention-use capability server-side. A proposed 100-recipient cap rejects larger broadcasts with a clear explanation rather than silently truncating recipients; revisit from measured usage.

**UI, access and tests:** public group existence does not reveal private-channel participation; a group mention grants no access. Archived groups cannot be newly mentioned; historical labels stay readable. Test simultaneous membership change, scheduled publication after group changes, inaccessible recipients, archived groups, duplicate person/group mentions, fanout limits and notification mute/DND precedence. Display member count only to authorized workspace users.

## F73: channel templates

**User outcome:** start a project or team space with a useful structure. The create-channel flow offers a small preset list, previews topic, description, resources and optional starter checklist, then lets the creator edit name, privacy and invitees before confirming. First version is product-defined presets, not a general user-authored template builder.

**Model and operations:** store versioned preset definitions in application configuration and record the selected version on channel creation for troubleshooting. Reuse the existing channel transaction with an idempotency key; create authorized membership/resource records together or roll back. Seed plain-text welcome/checklist content owned by the creator. A template never copies private history or automatically grants access to files linked from another channel.

**UI, access and tests:** use an inline list and preview within the existing creation surface, with no extra top-level route. Name conflicts, invalid invitees or resource permissions are shown before retry; preserve form edits. Test duplicate submit, transaction rollback, template version changes, private defaults, name collisions and invalid resources. Templates involving tasks depend on F75; basic presets must work without the task feature.

## F74: announcement acknowledgements

**User outcome:** ask for an explicit “Acknowledged” response to an important announcement. Authorized posters opt in on a message and preview the eligible recipient set. Recipients see a compact button. The poster can inspect outstanding acknowledgements in a bounded detail drawer. This is deliberate response tracking, not a hidden read receipt or proof that someone understood the content.

**Model and operations:** `Announcement(messageId, contentVersion, requestedBy, closedAt)`, `AnnouncementRecipient(announcementId, userId)` and `Acknowledgement(announcementId, contentVersion, userId, acknowledgedAt)` with unique keys. Snapshot eligible current channel members at publication. New members are not silently added. Removed members are marked no-longer-eligible in authorized aggregate reporting and cannot receive new reminders. Material edits create a new content version, visibly require renewed acknowledgement and preserve prior response history; the editor must confirm that effect. Retrying acknowledgement is idempotent.

**UI, access and tests:** label “Acknowledged” separately from “Read.” Name lists are available only to the author/explicitly authorized reviewer while they still have source access; ordinary recipients see only their own state and aggregate totals if enabled. No pressure animations or recurring automatic nudges in v1. Test concurrent edit/ack, recipient removal, post-publication join, deleted source, unauthorized roster lookup and repeated acknowledgement. Exporting responses is outside v1.

## F75: tasks from messages

**User outcome:** turn an actionable message into a small accountable task. A message action opens a title, optional description, assignee and due date form with a source link. R55 has My tasks and Channel tasks filters; R56 supports direct linking. The assignee can accept or decline, then complete or reopen. This is a lightweight task list, not a project-management dependency/Gantt system.

**Model and lifecycle:** `Task(workspaceId, channelId, sourceMessageId?, creatorId, assigneeId?, title, description, dueAt?, timeZone, state, version)`. States: unassigned, assigned, accepted, declined, completed, cancelled. Reopening a completed task returns it to accepted when the assignee remains eligible; otherwise unassigned. Declined tasks remain visible to the creator for reassignment. Assignment requires current membership; it grants no new channel access. Assignee controls acceptance/completion, creator or explicit task manager controls reassignment/cancellation, all under current access.

**UI, failure and dependencies:** show explicit source provenance; after source deletion use “Source message unavailable,” keeping the independent task only under its existing channel policy. Access revocation hides both task and cached preview. Preserve form input on validation failure; use a version conflict message on concurrent edits. Reuse the reminder publisher for optional due notices with dedupe and DND rules. Do not add another scheduler. Channel archive blocks task mutations except an explicitly defined admin restore path.

**Tests:** assignment to a removed member, concurrent completion/reassignment, declining, reopening, timezone and daylight-saving due dates, duplicate creation, source deletion, unauthorized task filters/counts and reminder retries. Tasks require W26 reminders only when due notifications are enabled; due-date display alone does not.

## F76: shared channel notes

**User outcome:** maintain a concise team note or decision record next to its conversation. R57 lists notes for one channel; R58 opens a note with author, last update, revision history and source links. Reuse the safe rich-text editor. Proposed v1 uses explicit Save and version conflict detection; simultaneous live cursor collaboration is outside scope.

**Model and operations:** `ChannelNote(channelId, title, body, version, createdBy, updatedBy, deletedAt)` and `NoteRevision(noteId, version, body, actorId, createdAt)`. Updates compare the expected version in a transaction; a conflict returns the latest revision while preserving the user's unsaved text. Restore creates a new revision rather than rewriting history. Restrict title/body sizes. Keep sanitized plain text for authorized search. Retain revisions under the workspace's chosen data policy; do not assume perpetual retention.

**UI and access:** a channel capability controls creation/editing; channel readers can read. Notes never have broader sharing than their channel. Archived channels make notes read-only. On conflict, offer inspect-current, copy-my-text and reload; no silent last-write-wins or invented automatic merge. Restore/delete requires explicit permission and confirmation. Source links validate current access each time; copying a link never creates a sharing grant.

**Tests:** two concurrent saves, unauthorized revision fetch, unsafe pasted content, deleted/archived channel, restore producing a new version, search invalidation and note pagination. Revision lists show metadata first; load a revision body only on demand.

## F77: keyword notification rules

**User outcome:** get attention for selected terms without following every conversation. Notification settings provide add/edit/pause/delete and a local test phrase. Proposed limit: 20 rules per member, 2–80 characters each. Initial matching is case-insensitive, Unicode-normalized plain substring matching with an optional channel scope. Explain this explicitly; regex and AI semantic matching are outside v1.

**Model and publication:** `NotificationKeyword(userId, workspaceId, phrase, channelId?, enabled)`. Match sanitized plain text only when a message is first published, not on drafts, poll option changes, edits or attachment bytes. Recipients must already have source access; group/person/keyword matches collapse to one notification record with combined reason codes. Own messages do not alert their author. Quiet hours suppress external interruptions while eligible inbox records remain; a muted conversation suppresses keyword-only alerts. Explicit account notification settings can disable the rule.

**Performance, privacy and tests:** match in a bounded notification worker after canonical publication, not in the send-response critical path. Start with channel-scoped candidate rules and batch recipient/access checks; measure before adding indexing or a matching service. Never emit a private keyword or message excerpt to analytics. Test punctuation/case/Unicode behavior, overlapping rules, mute/DND, scheduled messages, dedupe, revoked access and rule deletion during a queued job. Test mode never sends notifications to anyone.

## F78: saved searches

**User outcome:** save a repeatedly useful search such as messages from a teammate in a project channel. From R37, Save search asks for a personal name and displays the effective filters. The same page lists, renames, removes and reruns saved searches. No new top-level sidebar section is needed.

**Model and operations:** `SavedSearch(userId, workspaceId, name, filterVersion, filterAst, createdAt, updatedAt)`. Persist normalized, validated filter intent; do not store result snippets, counts or content. Every execution runs the current search authorization and pagination path. Deleted users/channels become explicit unavailable filters rather than silently broadening the search. Filter version migration is explicit; unsupported filters open an editable recovery state.

**UI, access and tests:** use a compact saved-search panel and ordinary keyboard navigation. Names and query strings can themselves be sensitive; keep them personal, omit from public metadata and remove local query state at logout. Proposed cap: 50 per member/workspace. Test cross-user lookup, cross-workspace channel IDs, lost source access, parser-version changes, stale-result races, duplicate clicks and Back/Forward. Automated saved-search alerts are not part of this feature; keyword alerts own notification behavior.

## Shared system, caching and performance contract

The entity names above are proposed logical records, not a migration committed by this assessment. Each receives explicit foreign keys, uniqueness constraints, bounded inputs and indexes for the authorized query paths. Do not duplicate workspace IDs on every child solely for convenience; when stored, enforce consistency with the parent. Use canonical source-channel access for poll, announcement, voice, task and note content. Shared content writes and personal preferences remain separate operations.

| Feature | Read/cache scope | Mutation and invalidation | Budget / loading choice |
|---|---|---|---|
| Poll | Workspace/channel/poll; viewer-specific ballot detail separate from aggregate | Ballot/close event invalidates one poll summary and viewer ballot | No voter-list hydration in channel feed; paged creator drilldown |
| Voice | Source attachment metadata; short-lived authorized media URL | Finalize invalidates source message; revoke invalidates access and playback | Fetch audio bytes on playback intent; no feed-wide audio preload |
| Emoji | Workspace/version catalogue, bounded pages | Manage event invalidates catalogue; versioned asset URL | Lazy picker assets; static decoded thumbnails only |
| Groups | Workspace and authorized group detail | Membership/archive invalidates group/picker; publication rechecks authority | Bounded suggestions; no group roster per timeline message |
| Templates | Small versioned product configuration | Channel creation invalidates accessible channel list/resources | No new network waterfall for fixed presets |
| Acknowledgements | Source announcement summary; own response separated from privileged roster | Ack/version event invalidates source summary and permitted report | Aggregate first, cursor-page recipient list on demand |
| Tasks | Account/workspace/filter list plus authorized task detail | Versioned update invalidates affected personal/channel lists | Cursor pagination and indexed assignee/state/due queries |
| Notes | Channel/list metadata plus note/version; revision body on demand | Save/restore/delete invalidates note/list/search projection | Lazy editor; never fetch all note bodies in resources tab |
| Keywords | Account/workspace/rules | Rule change invalidates personal preferences and worker rule snapshot | Worker performs bounded batches; no per-user queries in send path |
| Saved searches | Account/workspace/filter-version | Personal CRUD invalidates own list | Run only selected search; no background execution of every saved query |

All user-bound caches reset on logout/account switch and lose content when access changes. Never cache private data by resource ID alone in a shared server cache. Optimistic feedback must reconcile against a server version. Canonical mutation results are sufficient for the initiating view; avoid combining a targeted patch with blanket route refresh and full-workspace invalidation.

## UI and motion contract

Keep the existing conversation shell. Polls, voice notes and announcements use compact message blocks; tasks and notes use contextual links and durable pages. Custom emoji/groups live in administration; notification rules and saved searches live in their existing settings/search surfaces. Do not add ten permanent sidebar items simply because there are ten new capabilities.

Each feature must cover idle/loading, empty, submitting, confirmed, failed, conflict, read-only and lost-access states as applicable. Mobile detail pages replace side panels; all actions are keyboard operable and preserve focus. Use shared motion tokens, semantic controls and visible labels. Give poll results, task completion, acknowledgement changes, voice capture/player states, group/avatar changes, note saving and conflicts precise transitions that communicate the state change; never animate counts repeatedly, sweep waveforms offscreen or delay keyboard feedback. Every state also has a reduced-motion equivalent.

## Delivery, verification and operations

Apply [TDD](tdd.md) to every F69–F78 requirement using its [test-matrix row](test-matrix.md). Ballot close/vote, note revision, acknowledgement edit and task assignment races are written as executable failing cases before their implementation. UI tests cover input recovery, access loss and mobile interaction in the same feature slice. Verification at the end confirms the integrated result; it is not when test authoring begins.

1. W27 adds bounded interaction/preference features: polls, static emoji, keywords and saved searches.
2. W28 adds voice notes only after private-file lifecycle verification and browser recording tests.
3. W29 adds group mentions, fixed templates and announcement acknowledgements after role and notification policies are stable.
4. W30 adds tasks and notes after route, source-access and revision/due-date semantics are ready.

For each package, test source revocation across direct load, search, notification, cached view and realtime. Exercise retry/concurrency with a real isolated database; use browser checks for capture, focus, composer preservation and responsive panels. Verify bounded queries and initial payloads with the same fixtures as [testing](testing.md). No feature is complete from its happy path alone.

Operational metrics: feature action success/latency, poll-close errors, orphan audio bytes, upload failure by non-sensitive error class, notification fanout/dedupe/lag, task reminder lag and note conflict rate. Do not label logs with content, keywords, note bodies or full search terms. Use existing migration/backup/restore processes; add these records and objects to export/deletion/retention policy deliberately. Feature rollback disables new writes and preserves authorized reads where safe; never delete collaboration data merely to hide a broken control.

## Explicit exclusions and decisions before implementation

The defaults in this document are proposed design decisions, not confirmations from the user: poll identity/result visibility, audio caps/codecs, emoji upload limits, group fanout cap, acknowledgement reporting permissions, task assignment authority, note editing authority/retention, keyword semantics and saved-search limits. Validate them during implementation planning where they affect privacy or supported workflows. They do not block completing the present documentation task.

Excluded from these estimates: anonymous/confidential voting, audio transcription/transcoding infrastructure, animated emoji, directory-synced groups, arbitrary workflow builders, acknowledgement exports, project management dependencies, live coediting/CRDTs, semantic alerts and scheduled search digests. Group DMs, integrations, offline sync and email/push remain distinct earlier expansions, not secretly delivered by these packages.
