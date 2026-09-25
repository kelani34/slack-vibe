# Full communication platform: community, automation and enterprise

[Index](README.md) · [Feature register](features.md) · [Direct messages](direct-messages.md) · [Calls and meetings](calls-and-meetings.md) · [Security](security.md) · [Routes](routes.md) · [Implementation](implementation.md) · [Timeline](timeline.md)

## Target and boundaries

The product target combines workplace messaging and meetings with community conversation and administration. This document specifies F93–F108 and closes the previously undefined delivery scope for group DMs, external notifications, offline use and integrations. It complements the original source assessment rather than claiming these features already exist. The original small-team release is one milestone, not the definition of the finished product.

Full product does not mean every feature from every competitor. The defined release contracts below intentionally bound each capability. Product parity, unlimited scale, compliance certification, global social discovery, public app monetization and telephone-network calling are not asserted. The original documentation round did not authorize purchases, account connections or app submissions; the active implementation follow-up is limited to the slices recorded in [delivery-plan](delivery-plan.md). The [DM contract](direct-messages.md) owns the participant/history boundary that F14, F35 and F46 must reuse; external delivery or offline storage must not create a second private-conversation authority.

## F93 forum and Q&A channels

Create a forum channel with title/description, allowed tags, posting rules and optional resolved-answer mode. Its home is a paged topic list with title, tags, author, reply count, last activity and unread status; avoid loading every reply. New topic uses the existing safe rich-text composer and attachment policy. A topic is a root conversation with replies and stable source links, not an unrelated message system. Author or a designated moderator can mark an accepted answer, close/reopen and pin an announcement topic. Clearly distinguish accepted answer from an emoji reaction.

Add explicit conversation kind and `ForumTopic(channelId, rootMessageId, title, status, acceptedReplyId?, version)` plus tag associations. Verify accepted reply belongs to the same topic and is still readable; deletion clears or tombstones the reference according to policy. Search filters include topic/tag/status with normal access predicates. Topic creation, edit and replies pass moderation and slow-mode policy. Tests: private topic/search leaks, stale accepted answers, simultaneous close/reply, deleted root, pagination anchoring and filter URLs. UI states include empty instructions, draft recovery, locked topic, deleted accepted reply and read-only archived channel. [Discord forum reference](https://support.discord.com/hc/en-us/articles/6208479917079-Forum-Channels-FAQ) supports the category; the chosen schema and answer lifecycle are project proposals.

## F94 channel categories and personal organization

Admins define ordered shared channel categories; members create personal sidebar sections and order accessible conversations inside them. Categories organize text, forum and voice destinations without granting access. Personal order is account/workspace state, not a mutation of the shared channel. Drag reorder has keyboard Move up/down and Move to controls; collapsed sections retain unread indicators only from accessible children. Store bounded order/version values, resolve concurrent reorder with version feedback, and remove inaccessible channel references from the rendered list. Admin moving a channel between categories must preview whether any separately configured permission policy changes; a purely visual move does not silently apply new grants. Test multiple devices, removed channels, narrow navigation and hundreds of channels without per-row queries.

## F95 custom roles and channel permission overrides

Roles bundle explicit capabilities such as read, post, manage-channel, manage-members, manage-events, join-voice, publish-audio/video/screen, moderate-room and manage-apps. Keep current owner/admin/member roles as migration defaults. Define deterministic policy: tenant eligibility and explicit suspension/guest expiry are hard gates; resource visibility/membership gates follow; combine role grants; explicit applicable denies override grants; resource allow grants operate only within allowed tenant/resource scope. Per-person deny also wins. Owner administrative recovery does not implicitly reveal private message content.

Role editor at R44 provides an effective-permission preview for a person and resource with reasons. Limit who can grant capabilities; an actor cannot grant privileges they cannot administer. Protect last owner, prevent self-promotion and audit before/after policy revision. Role changes invalidate access summaries and actively evict/restrict media sessions. Do not duplicate policy logic in chat, search, files, forum, notes and RTC token code. Required tests enumerate multiple-role conflicts, guest caps, explicit denies, archived channels, policy-version races and privileged recovery. This is security-sensitive migration work, not a cosmetic badge editor.

## F96 scoped guests and F97 shared channels

Guest invitation specifies sponsor, allowed channels, expiry and permitted features. Guests see only their allowed people/context and cannot enumerate workspace directories, install apps or invite others by default. Their source access still controls files, events, recordings, tasks, notes and search. Expiry denies new actions immediately and triggers session/media revocation; renewal is an audited explicit grant. A channel's guests receive an obvious external badge and organizers see guest presence before sharing or recording. Removing a sponsor requires reassignment or a defined suspension policy.

A shared channel is a bilateral organization agreement, not “make this workspace public.” Both organizations authorize the connection, participants and capabilities. Before activation, show ownership, moderation, retention/export, recording and disconnect rules. A proposed v1 uses one canonical conversation with explicit organization memberships and source-level authorization; no copying every message into two uncontrolled databases. `SharedChannelAgreement`, organization participants and versioned policy bind the conversation. The UI displays organization identity in participants and externally shared labels in composer and files.

On disconnect, stop new cross-organization access and pending deliveries, then apply the pre-agreed history policy. Proposed default revokes live access and retains only authorized audited exports already obtained; do not promise to erase another party's downloaded copies. A stricter retained-copy or regulatory policy requires agreement before enabling the channel. Never choose retention by simply taking the longer organization default. Test unilateral revocation, pending invites, member removal mid-call, file/recording access, bots, exports, notification fanout and disconnect racing a send. Local private links pasted into a shared channel remain inaccessible unless explicitly shared through a permitted workflow.

## F98 community onboarding and screening

Community mode introduces versioned rules, membership approval when configured, verified identity, suggested topics and required safety notices. Pending members have only the onboarding capabilities; completing a client form does not grant membership. Store rule acceptance version/time and approval actor separately. Admins can inspect queues and reasons without receiving unrelated private content. Challenge mechanisms must offer accessible recovery and an appeal route; do not design mandatory inaccessible puzzles.

Invitation controls include expiry/use bounds, join-rate limits and revoke-all-compromised-link action. Screened members choose channels from what they can discover. Public workspace listing/search is excluded until reporting, abuse response and deliberate discoverability policy are ready. Tests include replayed acceptance, updated rules, approval/rejection races, invitation bursts and no-workspace directory leaks. Existing onboarding route R07 is extended, not duplicated.

## F99 automated moderation and F100 slow mode/lockdown

An admin safety console manages bounded text/link/mention rules, join-rate alerts, explicit exemptions and temporary restrictions. First release is deterministic rules with dry-run examples, not a claim of perfect AI detection. Publication evaluates required rules before a message becomes visible. Blocked/quarantined content never reaches channel realtime, search, push or mention delivery. Rule outcome, version and permitted evidence support reviewer decisions and appeal. If a required moderation dependency is unavailable, hold affected new publications with a clear pending/error state; do not silently bypass the rule or label a queued message as sent.

Slow mode stores a server-side minimum interval per resource and subject, applying to topics/replies/forwarding/bot messages according to an explicit published policy. Retries of the same accepted mutation do not consume another interval. Lockdown temporarily denies new posting/joining, with expiry, reason, allowed moderator capabilities and auditable restore. Do not destroy messages to handle a traffic spike. Rate limits are separate from product slow mode and also cover invitations, call ringing and media tokens.

Test publication and rule-edit races, edit-based evasion, encoded links, bulk mentions, cross-tab bypass, duplicate sends, moderator exemptions, expiry and restoration. Keep moderation evidence access and retention separate from ordinary analytics. [Discord AutoMod](https://support.discord.com/hc/en-us/articles/4421274296565-AutoMod-FAQ) demonstrates the relevant product category; this app's rule engine, failure policy and evidence model are proposed here.

## F101 workflows, F102 app directory and F103 commands/webhooks

Workflow v1 is intentionally bounded: triggers are a manual shortcut, submitted form, a scheduled occurrence or an allowed published-message event. Steps collect typed fields, post to an explicitly chosen accessible channel, create a task, request approval or call an installed allowlisted connector. No arbitrary scripts or unrestricted URLs. Builder shows trigger → steps as an accessible ordered editor; a visual canvas is optional. Test run previews intended effects and uses a sandbox target. Published definitions are immutable versions; editing creates a draft. Run history shows pending/running/waiting/failed/cancelled/completed with useful retry context.

`WorkflowDefinition/Version`, `WorkflowRun/StepAttempt` and `AppInstallation` store actor/service principal, scopes, dedupe keys and policy revision. Execute with explicit installation or invoking-user authority, never an implicit all-powerful admin. Recheck authority when delayed work resumes. Side effects use stable idempotency keys; provider ambiguity becomes uncertain/reconcile rather than blind resend. Bound depth, retries, runtime and fanout; prevent a posted message from recursively triggering an infinite workflow. Disable/revoke prevents new work and cancels or safely holds pending steps.

The app directory initially lists curated approved integrations. Installation shows requested scopes, data accessed, channels, operator identity and removal behavior. Tokens are encrypted server-side; secret access is audited without values in logs. Removed installations cannot call actions or receive new events. Store external event subscriptions and renew them explicitly; no automatic marketplace publication or billing is implied.

Slash commands expose typed input and private/public response visibility, with fast acknowledgement for long jobs. Incoming webhooks authenticate, verify signature/timestamp and dedupe event ID. Outgoing delivery validates registered destinations, blocks private/reserved network targets and revalidates DNS/redirects to limit SSRF; retries use bounded backoff and dead-letter visibility. Rotate/revoke secrets. Bots are identifiable actors whose channel grants and posting restrictions are enforced. Tests cover spoofed signatures, replay, revoked scopes, webhook redirects, duplicate delivery, failed approval, workflow loops and cross-tenant resource parameters. [Slack Workflow Builder](https://slack.com/help/articles/17542172840595-Build-a-workflow--Create-a-workflow-in-Slack) informs the category, not the precise implementation.

## F104 import and migration

Start with one documented export format and a bounded dataset, with source timestamps/authors/channels/attachments and permissions represented explicitly. Admin uploads privately, runs a dry-run, maps identities/channels and sees unsupported records before confirming. Imported accounts are historical author identities until verified matching, not auto-created privileged members. Never map solely by unverified display name. Preserve provenance and original IDs in an import manifest.

Jobs stage → validate → map → import → reconcile → completed/partial/failed, with resumable per-batch cursors and dedupe by source export/entity ID. Import never triggers historical mention notifications or scheduled publication. Attachment fetching follows allowlisted/private-transfer policies rather than requesting arbitrary URLs from the server. Rollback removes only records proven created by that import and preserves later user edits; when clean reversal is impossible, present an explicit remediation plan. Test duplicate runs, invalid archives, huge records, missing media, unknown authors and interrupted rollback. More formats and full Slack/Discord history parity require format-specific validation, not a generic promise.

## F105 enterprise identity

Organization identity adds SAML or OIDC through a selected maintained provider/library and SCIM user/group provisioning; protocol implementation from scratch is not proposed. Specify tenant-domain verification, allowed issuers/audiences, claim mapping and JIT creation policy. Never link identities across tenants solely because an email string matches. Changes to domain enforcement and sign-in require an owner recovery path with separately protected break-glass access and an audit event. SCIM create/update/deactivate is retry-safe; deactivation invalidates app sessions, queued work authority, file grants and active media admission.

R76 has connection setup/test/enforce stages, provisioning status and recovery guidance. A test must succeed before enforcement; show which members will lose their previous sign-in route. Existing GitHub authentication remains until a deliberate migration policy applies. Require current provider guidance and security review before implementation. Tests cover issuer confusion, replay, stale group claims, reprovisioned identities, same-email different-tenant accounts, last owner, session revocation and SCIM retries. [Slack SAML guidance](https://slack.com/help/articles/203772216-Set-up-SAML-single-sign-on-for-Slack) is a product reference for SSO/provisioning, not a certification for this app.

## F106 mobile/desktop delivery and F107 localization/translation

Define one shared API/event/permission contract across web and dedicated clients. The initial native delivery estimate assumes a maintained cross-platform approach, focused iOS/Android and macOS/Windows wrappers/clients, and reuse of domain APIs; final framework choice follows RTC/notification/file integration prototypes. No claim that a thin web wrapper provides reliable background calls. OS permissions, push tokens, secure credential storage, deep-link validation, update signing, crash reporting and app-store packaging are explicit work.

Call continuity is an explicit device transfer: connect the receiving device muted, confirm, then release publishing on the previous device; avoid duplicated microphones and acoustic feedback. Mobile background suspension and incoming call integration require OS-specific tests and honest support labels. Reading on another device converges unread state without clearing content that was not seen. Native rollout requires signed builds, update/recovery plans and platform-specific QA; external account provisioning and store review time are not included in engineer-day estimates.

Localization externalizes UI strings, plural rules, dates/timezones, number formatting, sort behavior and RTL layouts. Test text expansion, keyboard shortcuts and mixed-direction message text. Optional message translation is user-initiated, labels source/target and retains original text. Provider selection specifies supported languages, processing region, retention and budget; never send inaccessible messages for translation. Cache only by authorized source/version/target-language/provider version, invalidate on edit/delete/revocation, and distinguish failure from empty translation. Do not treat translated content as an authoritative new message or use it to execute workflow commands.

## F108 retention, holds and review/export

This extends F63's personal/workspace data lifecycle with separately controlled hold and review operations. Policy scope identifies conversation/artifact types, effective date, authorized administrator and precedence. A hold prevents eligible deletion but does not grant its operator ordinary browsing rights. A dedicated review/export capability, audited case and current approved scope control access to held content. UI previews affected scope and conflicts before policy activation; no assertion that selecting a retention duration satisfies a legal regime.

Deletion jobs recheck active holds transactionally before destroying canonical records or artifacts. Track derivatives: thumbnails, indexes, recordings, captions retained as transcripts, summaries, exports, backups and provider copies. Immutable backups may age out on a documented schedule; do not promise instant removal from every backup. Expiring private exports have recipient/scope records and access logs. Shared channels require their bilateral policy rather than whichever local setting was most recently edited. Tests cover hold/deletion races, expiry, revoked reviewer, failed object deletion, restore reapplication and legal-hold access separated from content access. Certification, jurisdiction-specific legal advice and external audits remain separate work.

## Finish the previously unestimated capabilities

| Requirement | Defined first implementation / remaining acceptance | Package |
|---|---|---|
| F14 group DMs | Bounded member count, named/unnamed display, race-safe creation; adding a person creates a new conversation by default so old history is not silently disclosed; explicit leave/removed-member behavior | W39 |
| F35 email/push | Provider selection, consent/device tokens, preview privacy, DND precedence, unsubscribe, deduplicated intent, delivery retry and bounced/expired token cleanup; web push first, native delivery hooks in W38 | W39 |
| F46 offline read/outbox | Explicit device opt-in, bounded IndexedDB cache and queued text sends with stable IDs; stale label, local expiry, account-switch purge, reconnect authorization; uploads wait for online; remote revocation cannot erase an offline copy until reconnect/expiry | W39 |
| F47 integration/API/bots | Covered by scoped installations, signed commands/webhooks and versioned events above; no second catch-all integration project | W36 |
| F48 advanced umbrella | Replaced by specific F79–F108 scopes; retain ID as historical grouping, not an extra counted capability or unbounded estimate | W31–W38 |

F39 keyboard navigation and F41/F58 accessibility remain required across new surfaces, not a separate upsell or product feature count. Workflows, guests, import and custom roles must wait for stable shared access boundaries; they cannot safely be added only as front-end screens.

## System and cache boundaries

Add domain records to the existing application where possible: forum/topic metadata, role/policy revisions, guest grants, shared agreements, moderation rule decisions, workflow installations/runs, import manifests and identity mappings. Durable jobs handle bounded asynchronous work. New external capabilities are media, calendar, speech/translation, notification and identity processors selected per feature. There is no generic reason to split messaging into microservices. [Calls and meetings](calls-and-meetings.md) defines the justified media boundary.

| Data | Cache / loading rule | Invalidation / access rule |
|---|---|---|
| Forums/topics | Cursor metadata pages; replies load on open | Root/reply/moderation changes target affected topic/list; channel policy always filters |
| Sidebar/categories | One authorized summary plus personal order | Policy revision and membership removal invalidate labels/counts |
| Effective permissions | Request-local evaluation; any longer cache keyed by subject/resource/policy revision | Never trust stale permission for a mutation, download or media grant |
| Guests/shared channels | Paged privileged metadata | Expiry/disconnect is a hard gate regardless of UI cache age |
| Moderation config | Versioned bounded rule set | Publish evaluates current enforced version; no old-config bypass |
| Workflows/apps | Metadata first, selected version/run detail on intent | Token/scopes never browser cache; revocation controls in-flight work |
| Import/export/review | Job metadata and expiring private artifact grants | Poll with bounded backoff; no content in global analytics or public URLs |
| Translation | Source/version/language identity in a private cache | Source edit/delete/revocation clears derived result visibility |

Cross-organization caching must use the viewer's organization and shared-agreement revision, not only the host workspace ID. Background processing records its authority and rechecks before delayed effects. Event logs identify internal IDs and error classes without message text, private rule phrases, credentials or transcript data.

## UI, testing and operational deliverables

Every capability follows [TDD](tdd.md) and its [F93–F108 matrix cases](test-matrix.md), with F14/F35/F46/F47 covered by their own rows. Start with denied role/guest/installation authority and lifecycle failure cases before adding the corresponding feature. Workflow retry, import provenance, identity binding, moderation-before-publication and hold/deletion races require real integration tests; no mock-only enterprise readiness claim is accepted.

The [mobile route matrix](mobile-responsive.md#complete-route-family-adaptation) also covers every platform/admin flow. Provide stacked forms, priority-column record rows with full detail, ordered workflow steps and readable effective-permission/consent summaries. Role changes, guest management, import review and retention decisions must remain operable on a phone with all relevant scope and confirmation text visible. Device capability restrictions are explicitly documented; narrow width alone does not justify hiding an authorized workflow.

The shell gains optional Voice, Events and Forums destinations, not thirty permanent links. Administration separates members/guests, permissions, safety, apps/workflows, identity, imports and retention. General members never receive placeholder admin screens. Progressive disclosure keeps the conversation primary; full direct routes exist for restoration and support. Source labels clearly identify external guests, shared organizations, bots, generated summaries and translated content.

Test exact capability boundaries through direct calls as well as UI, plus membership change during queued work. Run multi-organization fixtures for shared channels, spam/join bursts for safety, delayed webhook retries for automations and duplicate batches for import. For native clients, exercise real background transitions, deep links, updates and notification revocation. Per-feature contracts above define acceptance; use [testing](testing.md) for shared accessibility/performance gates.

Operational ownership must exist for each external processor and credential, rate/spend limits, webhook renewal, failed-job recovery, abuse case response, security incidents, deletion/hold reconciliation and signed-client releases. Staged feature enablement, durable audit records, private artifacts and data-preserving rollback are required. Monitoring cannot depend solely on a successful HTTP response when a provider operation is still pending.
