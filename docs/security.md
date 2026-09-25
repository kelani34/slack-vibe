# Security, permissions and privacy specification

[Index](README.md) · [Findings A01–A06](assessment.md) · [Direct messages](direct-messages.md) · [System design](system-design.md) · [Release tests](testing.md)

This document specifies application access behavior. It does not certify the deployed service. Live database grants, RLS policies, storage visibility, token configuration, and worker invocation settings remain unverified.

## Permissions for additional collaboration features

The [F69–F78 feature contracts](collaboration-features.md) inherit this document's boundaries. Poll creation requires posting authority; ballot identity is more restricted than aggregate results. Announcement rosters require specific reviewer authority and explicit acknowledgement never substitutes for hidden read tracking. Task assignment and group mentions grant no access. Notes and every revision inherit channel access; archives become read-only. Voice uses private media grants, and custom emoji accepts validated static raster content rather than active SVG/HTML. Group expansion and keyword matching intersect current source access at publication. Saved searches store personal filter intent and always rerun authorized search.

Recheck these boundaries for direct routes, derived counts, cache entries, notification workers, realtime payloads, exports and source deletion. Admin ability to manage emoji/groups does not grant private-message access. Proposed roster visibility and editing capabilities must be settled before enabling their features. Per-feature attack and concurrency scenarios live with the specifications and feed [release testing](testing.md).

For DM-specific privacy, use the [direct-message contract](direct-messages.md#recommended-behavior-contracts): one-to-one pair identity, group participant/history revisions, removed-member behavior, block/report, private object grants, call admission, offline purge and retention/export. The current `DIRECT` slice proves membership checks and selected peer projections; it does not certify legacy migration, group history, storage ACLs, realtime topic identity or independent QA.

## Calls, cross-organization access and platform security

[Calls and meetings](calls-and-meetings.md) requires authenticated join grants, source admission, server-enforced publish capabilities and active eviction when membership is revoked. Short token expiry alone is not ongoing revocation. Provider callbacks are authenticated/deduplicated; raw provider room IDs never establish authority. Microphone/camera capture is explicit, recording is consented and late joins are gated. Distinguish transport encryption from E2EE and disclose any caption/transcription processor.

[Production platform](production-platform.md) defines role precedence, guest expiry, bilateral sharing, workflow principals, OAuth/SSO identity binding, SSRF-safe webhooks, moderation-before-publication and hold/review separation. Every new derivative, including transcript, summary, forum result, offline copy and import artifact, needs an explicit visibility/retention policy. Revocation cannot instantly erase an offline or previously downloaded copy; product copy and policy must be truthful about that limit.

## Non-negotiable release boundary

Write failing tests for each missing deny/allow rule before repairing or extending access behavior. [TDD policy](tdd.md) requires real action/database/RLS/storage/realtime tests with anonymous, member, removed, outsider and privileged identities. Assert absence of data at the response/event/grant boundary, not only a hidden UI. Every security incident or bypass receives a regression case; mocks, coverage percentages and passing happy paths alone cannot close a permission requirement.

Authentication answers who is calling; authorization answers whether they may access this workspace, channel, message, file or administrative operation. Every public action and server-rendered read must answer both. UI visibility, opaque IDs, route middleware, and a Supabase subscription filter do not replace authorization.

Exported Server Actions must be treated as callable endpoints. The internal notification creator should move out of the `use server` action module into a server-only module. Next.js documents this endpoint/security model in its [data security guide](https://nextjs.org/docs/app/guides/data-security).

## Proposed role policy

Public means discoverable within the workspace, not visible on the public internet. For this baseline, joining is required to read full channel history, matching the current ChatPanel membership intent. Discovery exposes only approved summary fields. Admin role does not implicitly grant private-message visibility.

| Operation | Workspace member | Channel member | Creator | Workspace admin/owner |
|---|---|---|---|---|
| List workspace summary | Own workspaces only | Same | Same | Same |
| Discover public channel | Yes, within own workspace | Yes | Yes | Yes |
| Discover private channel / DM | Only if participant | Yes | If participant | Only if participant |
| Read history/thread/file/search excerpt | Must also be channel member | Yes | If member | If member |
| Join public channel | Yes, if not archived | Idempotent | Idempotent | Yes |
| Join private channel | No self-join | Already joined | May invite within workspace | May administer membership under explicit policy |
| Add/remove channel member | No | No by default | Yes, subject to owner rules | Yes, with audit; no silent private-content read grant |
| Send/reply/react | Must also be channel member | Subject to posting/archive policy | Same | Same policy with defined role allowance |
| Edit own message | If still member | Within 30 minutes of publication, current rule retained provisionally | Same | Same author rule |
| Delete/moderate message | Own message, if member | Own | Own unless admin | Allowed moderation, audited |
| Edit topic/description | No | Yes, if active channel | Yes | Yes if authorized member |
| Rename/privacy/archive channel | No | No | Yes | Yes |
| Delete channel | No | No | Only if also admin/owner | Yes, confirmed and audited |
| Pin/unpin | No | Yes, proposed collaborative policy | Yes | Yes if member |
| Bookmark/star | Personal references to readable resources | Yes | Same | Same |
| Schedule | Same as sending | Permission rechecked at publication | Same | Same |
| Workspace roles/invite rotation | No | No | No extra workspace authority | Admin except owner transfer/delete reserved to owner |
| Transfer owner/delete workspace | No | No | No | Owner only; cannot remove final owner accidentally |

Creator is a channel role, not a bypass around workspace membership. Define whether the creator can leave after ownership transfer; consolidate the two current leave implementations before shipping that flow. Existing reply exemption from posting permission is inconsistent with a simple policy: proposed default is that posting restrictions apply to replies too. Any exception needs a documented product decision.

## Required authorization predicates

- Resolve a valid session actor.
- Resolve workspace by requested slug/ID; require actor membership before returning its metadata or invite code.
- Resolve channel constrained to workspace; require channel membership for content reads and applicable mutations.
- Resolve message through the authorized channel relation, not a separate unscoped ID lookup.
- For threads, compare parent channel and publication status. For pins, compare referenced message and channel. For DM creation, verify both users' workspace membership.
- For notifications, only the recipient can update state; resource previews obey current source access.
- For user details, require shared workspace context and project only approved fields. Decide email visibility explicitly.
- For scheduled drafts, author-only access until publication, regardless of ordinary channel membership.

Use scoped database predicates where possible so unauthorized rows are not fetched and then accidentally serialized. Return a consistent unavailable response where revealing resource existence would disclose private membership.

## Input and output policy

Proposed initial limits, to be validated with actual product usage:

| Input | Limit and treatment |
|---|---|
| Channel name | Existing lowercase/dashes convention, 1–80 characters, unique within workspace |
| Workspace name/slug | Trim and bound length; slug normalization must be explicit and collision-safe |
| Message content | At most 20,000 visible characters and 100KB serialized content; require text or finalized attachment |
| Topic/description | Bound topic count/length and description length; render system-event values as text |
| Attachments | Initial candidate: at most 5 files/message, 10MB/file, and 25MB/message; validate stored bytes/type |
| Pagination | Default 50 messages, hard maximum 100; bounded search/member/notification pages |
| Search | At most 500 characters, nonblank query, allowlisted filters and strict ISO date ranges; malformed/unsupported input returns validation and never broadens; bounded page size; parameterized SQL; every page rechecks actor/workspace/channel membership; cursors are bound to actor/workspace/query and are never authorization tokens |
| Schedule time | Valid future instant within proposed 90-day horizon; explicit timezone display |
| Reaction | Allowlisted emoji representation with bounded length |
| Profile URLs | Allow `https` and intentional `http` where needed; reject dangerous schemes and oversized values |

Limits are proposed application policy, not limits provided automatically by Next.js or Supabase. Choose infrastructure limits consistently with the upload design.

Authentication return destinations accept only a single-leading-slash local path, preserve its query, and reject absolute hosts, protocol-relative values, repeated parameters and backslashes that URL parsers can normalize into a host. Invalid values fall back to `/`; the provider callback still requires its own state/PKCE validation and environment-specific registration.

The login page maps only known Auth.js errors to user-facing text; unknown and repeated values use a generic message rather than reflecting the query string. Configuration detail, provider response text, tokens and callback parameters must remain in sanitized server diagnostics, never the UI.

The account-menu sign-out control removes only the current actor's `slack-vibe:draft:<userId>:` localStorage entries, then uses Auth.js's CSRF-protected client sign-out operation and a full navigation to the public login route so in-memory account-scoped client state is discarded. Storage failure does not block ending the server session. A component test verifies that another actor's drafts and unrelated preferences remain untouched. Local browser evidence B08 confirms the former session is rejected by a protected route after logout; independent QA and expiry behavior remain open.

### Rich-text safety

Tiptap client output is untrusted because callers can submit arbitrary action arguments. The current implementation follow-up uses [`sanitize-html`](../src/lib/message-html.ts) with an explicit tag/attribute allowlist and `http`, `https`, `mailto` and `tel` URL schemes; protocol-relative links are rejected and `_blank` links receive `noopener noreferrer`. Syntactically valid mention metadata is preserved only when the referenced user belongs to the destination channel on send, edit, scheduled-edit and forward writes. Active markup is also stripped at read/render time so old rows cannot reach React parsing unsanitized.

The timeline and system-message renderer, scheduled-message preview, notification preview, pinned/bookmarked preview and DM inbox summary now use the sanitizer or sanitized plain-text extraction. New system-event writes normalize names, descriptions and topics to safe plain text; converting the event model to structured records remains a future architecture improvement. The only remaining `dangerouslySetInnerHTML` in app source is the chart component's generated style block, not message data. TDD coverage exercises executable tags/attributes, unsafe URLs, mention metadata, forwarding attribution, new sends/edits/scheduled edits, system-event writes and affected previews. This is developer evidence, not independent QA: A05 remains open for candidate-wide verification, legacy mention identity review and any historical-data backfill decision.

Do not assume historical content is safe merely because new writes are normalized. Test links, images, SVG, malformed markup, mention attributes and encoded URL schemes with adversarial inputs.

## Realtime and identity proof

The current Auth.js JWT session does not automatically establish a Supabase-authenticated browser. W03 must choose and test an integration supported by the installed stack: an explicitly supported third-party identity/token configuration, a correctly implemented short-lived token bridge, or an auth migration with its own cost. Never expose a service-role credential to make subscriptions work.

Supabase's [third-party auth overview](https://supabase.com/docs/guides/auth/third-party/overview) is the starting point for checking supported token configurations. A custom bridge is an engineering decision requiring issuance, expiry, revocation, audience/claim checks, and tests; it is not assumed compatible by this assessment.

Postgres Changes uses table access/RLS; private Broadcast/Presence uses Realtime topic authorization. Consult both [Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes) and [Realtime authorization](https://supabase.com/docs/guides/realtime/authorization). Test anonymous clients, unrelated workspace users, removed members, expired tokens, and already-open subscriptions. Delete payload/filter behavior must be verified rather than assumed to match inserts.

For the one-day candidate, if this proof fails, disable insecure subscriptions and sensitive broadcast paths. A bounded authenticated polling fallback can keep an internal core usable. Do not deploy anonymous table reads as a shortcut.

## File privacy and abuse controls

Private-channel files must not be placed behind permanent public URLs. Private object keys are scoped to workspace/channel and upload intent. A server authorizes a short-lived upload or download grant and validates finalized object ownership. The service role bypasses ordinary policies and is therefore a server-only trust boundary; Supabase documents this in [Storage access control](https://supabase.com/docs/guides/storage/security/access-control).

**Current W09 evidence:** the server now rejects SVG and checks the leading signature bytes for supported raster image types before uploading; red/green integration cases cover a PNG mismatch, an SVG payload and a matching PNG header. This is only a prefix check for image uploads. The bucket still returns permanent public URLs, the browser profile-avatar upload still bypasses the server action, other media/document bytes are not inspected, and the server buffers the complete file. A06 remains open.

Declared MIME/name/size are untrusted. Validate object bytes/metadata and prevent executable inline previews. Use image/document allowlists, safe download disposition, and limits before allocating whole buffers. Broader arbitrary-file sharing requires a scanning/quarantine decision. Log object IDs and error categories rather than private file contents or signed URLs.

## Abuse, privacy and retention

- Rate-limit sends, searches, joins, invitations, uploads, and worker triggers by authenticated actor and appropriate workspace scope. Exact rates should come from observed workload; proposed starting send limit is 30 requests/minute/user with a small burst, tested against normal usage.
- Do not log message bodies, auth tokens, invitation codes, or signed file URLs. Keep correlation IDs and duration/result categories.
- Disable unconditional Auth.js debug logging outside local development.
- A hidden user is a display preference. It does not revoke their access or prevent delivery.
- Proposed deletion behavior is a message tombstone with body/attachment visibility removed; physical retention duration needs an explicit owner decision before public release. Do not promise compliance or legal retention behavior without requirements.
- Cached data already downloaded cannot be remotely guaranteed erased. Application logout/revocation should clear its own in-memory/persisted caches and prevent future reads.

## Additional route and product permissions

The [new route registry](routes.md) requires these checks in addition to the original matrix:

- Home/unread/thread/DM/file/search indexes apply source visibility before aggregation, pagination and count generation. An inaccessible filename, result count or thread excerpt is still disclosure.
- Session revocation requires account ownership and recent authentication for sensitive changes; revoke actual server acceptance and realtime credentials, not merely a displayed device row. Avoid collecting precise location for cosmetic device labels.
- Invitations bind maximum role, expiry and usage limits server-side. A user cannot change an invite form payload to grant an owner/admin role. Expiry/revocation and acceptance race in one transaction.
- Audit viewers have explicit permission. Administrative summaries contain actionable metadata, not private conversation transcripts or employee-surveillance statistics.
- Report submission explains that a bounded content snapshot may become visible to designated reviewers. Reporting does not grant reviewers open-ended browsing of that private channel. Define evidence retention and reviewer capabilities before enabling reports.
- Account data export, workspace export, retention change and account deactivation are separate capabilities. Prevent self-deactivation of the final owner until ownership is transferred. Downloads are private, short-lived and reauthorized.
- Public error/help/legal routes disclose no private workspace names, invitation secrets, stack traces or environment variables. Safe error codes map to user-readable copy.
- GET navigation, canonical redirects, prefetched pages and link previews never join a workspace, mark everything read, revoke a session or execute an administrative change.

## Acceptance gate

The negative tests in [testing](testing.md) must fail closed across actions, server pages, search, subscriptions and downloads. A secure UI with an unguarded alternate action does not pass. If a feature is cut for day one, verify direct invocation and deep links cannot reach its unsafe backend path.
