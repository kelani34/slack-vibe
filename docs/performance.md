# Performance, caching and the 10× improvement plan

[Index](README.md) · [Assessment](assessment.md) · [Direct messages](direct-messages.md) · [Architecture](architecture.md) · [Motion budget](animation.md) · [Measurement protocol](testing.md)

## Performance contract for the additional ten features

The [collaboration cache matrix](collaboration-features.md#shared-system-caching-and-performance-contract) defines read scope, invalidation and loading choices for F69–F78. Preserve existing budgets: poll/acknowledgement cards use aggregates; voter/recipient lists paginate on demand; audio bytes load only for playback; emoji thumbnails load lazily; note lists omit full bodies; revisions and the rich editor load on intent; tasks use indexed filtered pages. Saved searches do not all run on app start. Keyword/group fanout stays outside the send-response critical path with bounded access-aware batches.

Measure feature-disabled versus enabled first-channel load and message-send latency on the same fixture. Product breadth must not add a request waterfall for hidden features or one query per timeline card. Reuse batch summary loaders and targeted events, while keeping viewer-specific ballot/acknowledgement detail separate from shared aggregates. All budgets remain targets until measured.

## Direct-message performance contract

The [DM contract](direct-messages.md#data-and-cache-design) adds a bounded inbox projection and a focused-conversation query, both scoped by actor and workspace. Load at most the first cursor page of DM summaries, include only the peer identity and safe last-activity preview, and fetch message history only for the focused conversation. Do not initialize call/media code, load every DM body, or subscribe one transport per sidebar row during ordinary chat startup. Measure cold/warm DM open, inbox pagination, two-tab event reconciliation, 50 conversation switches, logout cache purge and mobile keyboard-open send latency before claiming a speed improvement.

## Calling, calendar and platform performance

The [media performance plan](calls-and-meetings.md#speed-caching-scale-and-cost-plan) adds intent-loaded RTC code, one call controller, adaptive visible-track subscriptions, audio priority, bounded room caps and explicit network/device fixtures. Media tokens/admission are not shared-cacheable. Voice/video must not increase ordinary channel startup by loading SDKs or streams before intent. Measure chat input responsiveness during calls as well as join latency, reconnect rate, jitter, loss and decode CPU.

Events load bounded date windows; recurring instances are generated only for a rolling horizon. Calendar sync runs through cursor/versioned jobs, not a provider request on every page navigation. Recordings load metadata before media, and transcripts use bounded segments. [Platform cache boundaries](production-platform.md#system-and-cache-boundaries) add policy-versioned permission summaries, paged forums, scoped app/workflow metadata and source-versioned translation. Cross-organization caches include viewer organization and agreement revision. These are measurement targets and design choices, not an unmeasured claim that new media features are ten times faster.

## What 10× means here

No production timing baseline was captured in this assessment. “10× faster” is an ambition to prove on selected expensive paths, not a claim that the existing app is uniformly slow or that a cache will make every action ten times faster.

Track two distinct results: **less work** (queries, bytes, renders, mounted rows) and **less user-visible latency**. Reducing 51 queries to five is over 10× fewer queries; parallel execution and network effects mean wall-clock improvement may differ. Optimistic UI improves feedback latency but does not accelerate database commit or file upload.

## Observed opportunities ranked by return

| Priority | Current path | Proposed change | Expected effect, not measured result | Validation |
|---|---|---|---|---|
| 1 | `getChannels`: 1 channel query + N counts | Batch unread aggregation in a scoped query using each membership read cursor | Replaces the 50 per-channel counts; a local instrumented 50-channel request used four SQL statements total, under the ≤5 target | SQL query count; production plan/timing still required |
| 2 | Broad refreshes after message arrival, read cursor, send, edit, delete, pin/unpin and schedule operations | Apply client-cache and unread-count updates; coalesce focused read-cursor writes | Ordinary message/read/pin and scheduled-message mutations avoid full-route invalidation; settings preference updates and invite joins rely on local state/action redirect | Count requests/SQL per 20-event burst and compare route refreshes |
| 3 | Page shell → client mount → message fetch | Authorized server prefetch/dehydrate initial page; begin after access resolution | Remove one client request waterfall and show useful content earlier | Cold navigation trace |
| 4 | Sidebar unread listener relayed inserts while the focused list also subscribed, and duplicate deliveries fetched details repeatedly | Sidebar owns unread projection; focused list owns hydration; check canonical IDs before fetching and reconcile optimistic/canonical rows | Relay duplication and repeat-ID fetches are removed; same-user events are accepted by other tabs | Component/hook regressions cover cache order and duplicate delivery; live multi-tab burst trace remains |
| 5 | All loaded timeline rows and unbounded thread | Cursor pages and measured virtualization/windowing | 2,000 loaded rows to ~100–200 mounted rows where appropriate | DOM count, scrolling, memory |
| 6 | Mention suggestions repeatedly load channel members | Cache scoped member summaries; filter locally for small channels | Repeated keystrokes reuse one query | Requests per mention session |
| 7 | Sequential upload via server buffer | Signed direct uploads with bounded concurrency | Lower server memory/copy overhead; parallel completion limited by bandwidth | 1/3/5-file trace and memory |
| 8 | Search HTML `contains`, unbounded result retrieval and out-of-order client state | Actor/workspace/query-bound keyset pages, latest-result guard and PostgreSQL `pg_trgm` GIN index for the existing `ILIKE` substring predicate; normalized plain-text projection and scoped cache remain later work | Bounded response transfer; five fixed 100k-message runs recorded selective warm p50 12.08–52.47ms and p95 13.53–121.68ms, with natural GIN selection in two runs | Query-plan test, realistic `EXPLAIN (ANALYZE, BUFFERS)`, cold/warm latency and typing replay |
| 9 | Statically imported editor/dialog modules | Measure chunks; lazy-load edit-only and secondary surfaces | Lower initial parse/execute cost if chunks are material | Production bundle report |
| 10 | Full user/relation payloads, notification inbox loaded then sliced in memory, and channel-history scan for read notifications | Narrow projections, access-filtered bounded page and relational update | Notification app-memory use and read-mark work are bounded by the requested page/update rather than all channel message IDs | Payload size, statement plan and pagination/load fixture |

## Current W05 implementation evidence (updated 25 September 2026)

The original channel unread path issued one count per channel. A 50-channel PostgreSQL regression first observed 50 distinct count calls and then verified the scoped aggregate uses one raw query while preserving the published-root policy: exclude the viewer's own messages, thread replies, future scheduled rows, system events and deleted messages. A temporary local SQL probe recorded four statements for the full regular-channel summary request, including access/context queries; the separate bounded participant projection runs only when direct conversations are present. The four-statement observation meets the current ≤5 target for that regular-channel fixture; it is not a production trace.

The DM inbox now sorts and filters candidate conversations by activity in SQL, applies its stable keyset cursor and page limit before participant/latest-message hydration, and hydrates only the returned IDs. A 26-conversation regression verifies page sizes of 25 and 1, no duplicate next-page item, unread filtering before limit and detail hydration exactly scoped to each page. The message activity index was added in migration `20260924210000_messages_channel_activity_idx`.

The all-unread inbox follows the same bounded-query rule: PostgreSQL aggregates eligible unread root messages per currently accessible conversation, selects the earliest unread target, and applies a scope-bound keyset cursor before page-only DM participant hydration. The UI requests 25 rows at a time. This avoids loading a workspace's message history into application memory and makes response size independent of total history size. No production latency or page-size benchmark has been run for this route. The current slice does not add a new cache: use the existing sidebar projection and route query ownership, then profile before caching. If measured cache work is needed, key by actor/workspace/cursor, patch read/send changes, and drop rows immediately on membership revocation; a shared or long-lived unread cache would risk stale private counts and wrong read state.

Notification retrieval now applies message/channel membership filtering before offset/limit, returns a maximum of 100 rows and calculates the complete accessible unread count in the same SQL request. A PostgreSQL regression places an inaccessible private-message notification above accessible items in activity order and proves it cannot displace them from the requested page. Channel read marking now updates with a membership-scoped relational `EXISTS`; it no longer loads every message ID. Migration `20260924220000_notifications_inbox_indexes` adds user/activity and user/unread indexes.

The command search now accepts results, errors and loading completion only from the latest open query. Component regressions cover first-page races, close cleanup, lazy `from:`/`in:` suggestions, page append without replacement, late-page suppression and accessible validation feedback. The pure parser bounds input to 500 characters and rejects blank input, incomplete/duplicate filters, unsupported enums, invalid timestamps and reversed ranges before database query construction; ISO date-only bounds cover the full UTC calendar day. Search uses actor/workspace/query-bound `(createdAt,id)` keyset cursors; a PostgreSQL test deletes the boundary row and edits an older match between requests without breaking the next page. Invalid and cross-query cursors return an empty page. Migration `20260925010000_message_content_trgm_search_idx` installs `pg_trgm` and adds a GIN `gin_trgm_ops` index for the current parameterized case-insensitive substring query. An `EXPLAIN` regression verifies PostgreSQL can select this index when sequential scans are disabled; this proves operator/index compatibility, not the natural planner choice on a production-sized fixture. Prisma still returns only displayed fields, and a PostgreSQL case verifies unrelated profile/channel fields, attachments and reactions are omitted. Old-message navigation now fetches at most 50 chronological root rows, returns a reply's parent thread ID, restores the cached recent timeline on demand and separates unavailable targets from retryable database failures. These are partial developer evidence for TC-F31-03/04/05/06/07. The search index applies to sanitized stored HTML, not a normalized plain-text projection. Short-query behavior, live browser Back/Forward and focus journeys, scoped result caching, broader latency/load budgets and independent QA remain open. Component tests now cover restoration when the context target clears and when a conversation route remounts.

### W14 fixed-fixture search benchmark, 25 September 2026

`npm run test:performance` creates a disposable PostgreSQL database, applies migrations and seeds 100,000 synthetic messages across 50 authorized channels and 200 users. It verifies six query shapes: selective text, short text, common text, channel filter, author filter and inclusive date range. It records the first action after fixture setup, warmed samples and eight simultaneous selective searches, then captures natural and `enable_seqscan=off` plans. Five runs on Node 22.23.2/macOS/PostgreSQL 17.7 produced selective-term warm p50 values of **12.08–52.47ms** and p95 values of **13.53–121.68ms**; short-term p50 was **43.16–63.63ms**, common-term p50 **44.76–50.25ms**, channel-filter p50 **4.54–7.59ms**, author-filter p50 **4.47–6.64ms**, and date-filter p50 **7.97–12.43ms**. One common-term p95 reached 351ms. Eight concurrent selective requests took **32.14–161.55ms** wall time. The natural plan used the trigram index in two of five runs; three selected a sequential scan over 100,000 rows (46.16–49.09ms in `EXPLAIN ANALYZE`). Natural index plans measured 10.54–17.47ms; forcing the index measured 10.09–12.76ms. All runs reported zero disk reads after fixture creation. The planner's estimated match count varied from 10 to 1,010 while the actual count was 1,000, showing unstable selectivity estimates. An earlier warm-only run measured 12.20ms p50 / 13.67ms p95, but the expanded runs show that it is not a reliable universal baseline. These are synthetic local observations, not production SLOs or a tenfold improvement claim. Real cold process/database behavior, 2,000-message thread skew, production region/network and mobile behavior remain open. The benchmark has no fixed latency gate; correctness assertions and the index-compatibility integration test remain CI checks.

Ordinary message arrival, send, edit, delete, pin/unpin and read no longer invalidate the full route tree. Scheduled-message creation, edit, cancellation and send-now use bounded client queries; channel and DM mutations, profile edits and workspace creation use targeted client refresh or navigation without broad server invalidation. Notification preferences update their local owner and invite acceptance redirects to the joined workspace; integration tests prove neither path triggers broad route invalidation. Sidebar channel summaries select only identity/type/direct key and the current actor's read cursor; participant profiles are fetched only for direct conversations. Search and forwarding destinations select only IDs/names and enforce both workspace and channel membership. Profile, channel-member, and available-member projections carry their required actor/workspace/channel authorization scope. Core timeline, parent-message, and thread keys now include actor/workspace/channel or message identity, shared by timeline reads, context restoration, thread reads, realtime refresh, optimistic send/retry and failed-send cleanup. Message reaction, edit, pin/unpin and delete actions invalidate only the current actor/workspace message prefix; pin and bookmark caches include actor/workspace/channel identity. The conversation pin/bookmark surface now asks the server for only the active channel’s bookmarks instead of loading the user’s entire list and filtering in the browser. Red/green component tests verify timeline/thread key shapes, reconnect invalidation and scoped action invalidation; send-hook regressions seed and observe the scoped cache. These keys prevent a cached private projection from satisfying a differently scoped query; they do not replace server authorization or prove live revocation. Integration tests cover workspace-removal/stale-channel-membership boundaries and narrow projections. The active sidebar projects unread count from eligible root-message events, while the focused conversation owns message detail hydration; a red/green component regression proves the removed window relay cannot make that same insertion fetch twice. A successful visible-channel read clears local unread state, server aggregates reconcile on refresh, and read cursor writes are coalesced for 250 ms. The focused listener suppresses repeated message IDs before hydration with a bounded recent-ID set, and rejects payloads that are not explicitly root, unscheduled and non-deleted; component coverage proves a duplicate payload causes one detail fetch and reply/scheduled rows cause none. Same-tab logout now clears the current React Query cache before Auth.js sign-out, and a session boundary clears on propagated sign-out and navigates that tab to login, while actor changes clear the cache and refresh server-rendered data. Component tests cover the transitions, while real multi-tab broadcast and live subscription teardown remain open. A mounted-shell reconnect/burst trace remains open. Production-build route timings, cold search, payload size, broader mobile performance, concurrent load and `EXPLAIN (ANALYZE, BUFFERS)` for remaining paths are still unmeasured. One local warm 100k-message search result is recorded above; it does not establish a general 10× gain. W05 remains open for remaining broad projections, mounted reconnect/multi-tab duplicate-event verification, cold/warm user-flow measurements and independent QA.

Do not memoize everything or remove server permission checks to chase a timing target. Fix query shape and ownership before adding another cache layer.

## Proposed budgets

Apply these budgets to mobile explicitly, using the [mobile performance fixtures](mobile-responsive.md#mobile-loading-and-performance-budgets). Record real lower-midrange Android results plus iPhone/tablet behavior, cold/warm navigation, keyboard-open composition and chat during calls. Desktop throttling is supplemental evidence, not a substitute. Mount/query only one adaptive view; avoid loading hidden desktop panels, the RTC SDK or admin editors on initial phone chat. Resize/orientation must not trigger duplicate fetch trees or reset caches. Current performance remains unmeasured on physical mobile devices in this documentation round.

Benchmarks use a production build, not dev compilation. Record device/browser/network/app and database regions. Initial reference profile: a contemporary mid-range laptop, 4× CPU slowdown, 10Mbps down/1Mbps up, 100ms RTT; also check an actual mid-range mobile device when available. These are test assumptions, not measured customer demographics.

| Metric | Target | Definition |
|---|---|---|
| Local send feedback | p95 ≤50ms | Send input to pending-row paint, excluding upload completion |
| Warm cached channel switch | p95 ≤150ms | Selection to usable cached timeline/composer; background refresh separate |
| Cold authorized conversation | p75 useful content ≤1.5s, p95 ≤2.5s | Navigation to real message content, under fixed reference conditions |
| Message action | p95 ≤500ms same-region | Request receipt to acknowledged database commit, excluding file bytes |
| Live event delivery | p95 ≤500ms after commit | Commit to remote-client rendered state; polling fallback has a separate ≤5s target |
| Search | p95 server ≤300ms, visible result ≤700ms including debounce/network | Fixed seeded fixture and authorized query |
| Core Web Vitals | p75 LCP ≤2.5s, INP ≤200ms, CLS ≤0.1 | Field metrics when available; lab is provisional |
| Animation | p95 frame work ≤16.7ms at 60Hz; avoid tasks >50ms | Profile actual DOM/render/paint, not just tween callback |
| Channel-summary query count | ≤5 with 50 channels | Whole request including context/access, not one helper in isolation |
| Event amplification | No full route refresh per ordinary message | Count across the full mounted shell |
| Timeline size | Bounded visible rows and retained pages | Initial proposal 100–200 mounted rows with measured overscan; large rows may require fewer |
| Initial JS | Candidate ceiling 250KB gzip for route-specific/shared interactive app code | Measure current baseline first; report framework overhead separately; rebase transparently if unrealistic |

These budgets are acceptance proposals. Do not claim they passed until traces exist. Report cold/warm, median/p95, payload volume and error rate; a mean alone can hide poor repeated-use behavior. The Core Web Vitals row uses the published good-experience thresholds described in [Web Vitals](https://web.dev/articles/vitals); the other latency and resource budgets are project-specific proposals.

## Cache ownership matrix

All client keys include actor identity and workspace where visibility can vary. Message keys use `['messages', actorId, workspaceId, channelId]` for a timeline and append the parent ID for a thread; individual message detail keys use actor/workspace/message identity. Never share server QueryClient instances across requests.

| Data | Location/key | Proposed freshness / retention | Invalidation and privacy |
|---|---|---|---|
| Session/permissions | Request-scoped actor and access result | Deduplicate within request; no shared cross-request permission cache initially | Re-evaluate for every protected operation; logout clears client data |
| Workspace summaries | Query: actor/workspaces | stale 60s; inactive GC 10m | Create/join/leave/role change; exclude invite code from generic summaries |
| Channel summaries | Query: actor/workspace/channels | stale 30s; GC 10m | Membership/archive/rename/star/unread events; authorized reconnect refresh |
| Current timeline pages | Query: actor/workspace/channel/timeline | stale 15–30s plus live updates; GC 5m after inactive | Send/edit/delete/reaction/publication and reconnect; membership purge |
| Older history pages | Same paginated cache, bounded page count | Preserve while reading; revalidate edited/deleted rows | Start at 10 pages cap; anchor-aware eviction; never silently lose selected message |
| Thread pages | Query: actor/workspace/channel/parent/thread; query stays disabled until actor identity is available | stale 15–30s; GC 5m | Replies/edit/delete/reaction and parent access; same canonical message contract; purge on membership revocation |
| Member suggestions | Query: actor/workspace/channel/members | stale 60s; GC 5m | Membership/profile change and revocation; local filtering at small size |
| Profile/hover summary | Query: viewer/workspace/target user/profile | stale 5m; GC 10m | Profile edit invalidates profile and card prefixes; role change and workspace removal require revalidation; server checks viewer and target membership; no cross-viewer/workspace reuse or cross-workspace email leak |
| Pins/bookmarks/stars | Query: actor/workspace and source scope | stale 30–60s; GC 5m | Desired-state mutation updates affected keys; source deletion/revocation purges |
| Notifications/count | Query: actor/workspace/notifications | First bounded page of 20; stale 15s with authorized events; GC 5m | Creation/read/unread/delete and reconnect; no global store surviving account switch; clear on actor/workspace change |
| Search results | Query: actor/workspace/normalized query+filters | stale 15s; GC 2m; small entry cap | Source edit/delete/membership; scope keys and latest-query identity |
| Scheduled drafts | Query: actor/workspace/scheduled | stale 15s; GC 5m | Schedule/edit/cancel/publication; never shared between users |
| DM inbox summaries | Query: actor/workspace/dm-inbox/filter | stale 15–30s; cursor pages of 25; GC 5m | Patch last activity/unread/mute; remove immediately on membership revision; never cache full private bodies in a shared layer |
| Typing/presence | In-memory ephemeral | Typing expiry ~3s; presence expiry separately designed | Channel switch/disconnect/hidden document; no database cache |
| Signed file grants | In memory; key includes object and actor scope | Expire before grant expiry, proposed ≤60s download TTL | Re-authorize renewal; never persist public permanent URLs for private files |
| Static assets/fonts | Browser/CDN hashed asset caching | Immutable versioned assets | Content hash changes on deploy |
| Draft text | Composer state; optional later local persistence | Until send/discard or explicit expiry | Scope by actor/workspace/channel/thread; clear on logout; warn before destructive discard |

Freshness and retention differ: `staleTime` controls when data needs validation; `gcTime` controls removal after inactivity. Neither grants permission. Revocation must remove data from the UI and prevent further protected server reads; five minutes of cache retention is not a five-minute authorization lease.

TanStack's [advanced server rendering guide](https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr) supports request-scoped prefetch/dehydration. This project-specific plan uses it to avoid duplicate initial fetching while retaining one client cache authority.

## Server caching policy

Start with request-local deduplication of actor, workspace access, and repeated record lookups. Do not put personalized message responses behind a shared public CDN cache. Avoid shared caching of invitation codes, permission results, scheduled drafts, or signed URLs.

For a later shared cache of non-sensitive metadata, include complete tenant and visibility inputs, check permission outside the shared cached computation on every request, and define invalidation before enabling it. Prefer short TTL plus explicit mutation invalidation for freshness, never as the only revocation mechanism.

The app has no `cacheComponents` configuration. Next.js's current [caching guide without Cache Components](https://nextjs.org/docs/app/guides/caching-without-cache-components) is relevant to that model. Do not mix examples from different caching models or add `use cache` globally without a version/configuration review. A broad `revalidatePath('/')` call is not equivalent to a documented entity-cache invalidation policy.

## Event-to-cache plan

| Event | Update | Avoid |
|---|---|---|
| Message published | Insert once in eligible visible timeline/thread; update summary/unread; settle matching pending intent | Appending replies to root timeline; refreshing entire route |
| Message edited | Patch canonical row/version in affected loaded views; invalidate matching search results | Overwriting newer version or unrelated pages |
| Message deleted | Tombstone/remove according to policy; update pins/bookmarks/thread counts | Leaving protected preview copies |
| Reaction changed | Update matching message aggregate or refetch one message | Refetching every channel history |
| Membership revoked | Stop subscription, clear all protected scope data, render denied state | Waiting for staleTime or relying on client filter |
| Notification read | Update exact item/count with error-aware rollback | Unconditionally decrementing an already-read item |
| Reconnect | After a Supabase interruption, refetch the active timeline and refresh bounded sidebar/notification summaries once on recovery; component status tests pass | Replaying all historical pages blindly; treating component status simulation as proof of real network recovery |

Coalesce bursts within one render frame or short measured batch window where semantics allow. Do not delay send acknowledgement waiting for a sidebar animation. Deduplicate event-triggered fetches by resource/version before requesting details.

## Database plan

Candidate indexes must be tested with realistic `EXPLAIN (ANALYZE, BUFFERS)` on an isolated fixture, not copied blindly. The current working tree adds the message activity and search trigram indexes plus notification indexes; none has a production-like explain profile yet:

- Message timeline: `(channelId, parentId, publishedAt DESC, id DESC)` with published-only partial predicate where appropriate; transitional schema uses `createdAt`.
- Thread history: `(parentId, publishedAt, id)` for published replies.
- Scheduled work: `(scheduledAt, id)` partial on scheduled status.
- Notification list: `(userId, createdAt DESC, id DESC)`; unread count: `(userId, isRead)`.
- Membership lookups from user side: `(userId, workspaceId)` and `(userId, channelId)` if existing composite unique indexes ordered in the opposite direction do not satisfy plans.
- Search: `messages_content_trgm_idx` uses `pg_trgm`/GIN for the existing substring `ILIKE` semantics. The current index is on sanitized HTML content, not a normalized plain-text column; any later full-text projection/`tsvector` index must preserve search semantics and run an explicit migration/backfill. Keep workspace/channel membership predicates in every query. PostgreSQL recommends GIN for full-text indexing in its [text search index documentation](https://www.postgresql.org/docs/current/textsearch-indexes.html).

Live database indexes may differ from the new migration and must be inspected before release. Preserve parameterization in raw aggregate/search queries; use typed results, not generic `any` conversions.

Unread aggregation must use each member's read cursor, exclude own messages, future/unpublished rows and excluded types per product policy, and decide whether thread replies contribute. Proposed default: channel unread tracks published top-level regular messages; thread replies use thread notifications. Test equal timestamps and concurrent read/send behavior.

## Client rendering and loading plan

- Hydrate the first authorized message page. Stream independent chrome/details behind loading boundaries; do not reveal protected data before authorization finishes.
- Lazy-load profile/details/search/file preview/edit-only editor code when measured useful. Keep the active composer responsive rather than delaying its code unnecessarily.
- Retain Geist via the pinned `geist` package and `next/font`, which bundle font assets with the build instead of fetching from Google Fonts. This removes a remote build dependency and avoids a third-party font request at runtime; measure transferred font bytes and first-render behavior before changing subsets or weights.
- Render message bodies with stable keys and narrow data projections. Measure React commits before introducing memo wrappers; React Compiler does not repair bad data ownership.
- Add dynamic-height virtualization only after pagination/anchors work, with a test for focus, text selection, browser search limitations, media resizing and screen-reader behavior. Do not write a custom virtualizer for the sake of avoiding a justified library.
- Reserve media dimensions; request thumbnails; load full previews on intent; revoke optimistic object URLs on acknowledgement/removal/unmount.
- Cache small mention directories; for large channels use an authorized server typeahead with debounce and cancellation/latest-result protection.
- Prefetch only likely targets on intent, with concurrency and byte limits. Do not prefetch every channel in the workspace.

## Cache and query additions for production destinations

These extend the original cache matrix for [new routes](routes.md). They are proposed starting values to measure, not evidence of performance already achieved.

### Member hover-card query activation

The member hover card uses a viewer/workspace/target-scoped TanStack Query cache (`staleTime` five minutes) and enables its query only while the card is open and a viewer identity is known. This prevents a message list from eagerly requesting profile details for every rendered author and prevents cache reuse across viewers or workspace scopes. Calls without an authenticated viewer ID cannot fetch or cache private member details. The server action checks that both requester and target remain workspace members before returning details. Profile edits invalidate both profile and card prefixes; live membership revocation while an open view remains mounted still needs explicit evidence. Component tests verify lazy loading, scope, retry and retained cached content after a failed background refresh. This reduces query volume and closes a demonstrated authorization leak; it is not a measured page-load or 10× latency claim. Validate request reduction with network traces on a populated conversation and a production build before assigning a quantitative budget.

### Scheduled-draft reads

The channel composer scheduled-message query now keys by actor, workspace, channel and parent thread. It stays disabled until the caller has an actor ID, checks both workspace and channel membership before reading, and selects only ID/channel/content/parent/scheduled time. The previous channel-only membership check allowed a stale channel-membership row to reveal pending content after workspace removal; an integration regression reproduces and closes that boundary. The query remains polled every ten seconds and no production polling/load measurement exists; evaluate visibility-aware polling and schedule-update patching separately.

| Data | Scope / freshness | Update and access policy |
|---|---|---|
| Home summary | Actor/workspace; 15–30s, first 5–10 rows per section | Reuse summary queries; invalidate affected section on send/read/draft changes; no fan-out to every history |
| Unread/thread/DM inbox | Actor/workspace/filter; 15–30s, cursor pages of 25 | Patch stable item and summary; preserve focused row; membership removes items immediately |
| Draft list | Actor/workspace; local reactive state or short-lived authorized server query | Revision-aware writes; separate uncertain outbox status; purge account state on logout |
| File library | Actor/workspace/filters; 30s, 25-row cursor pages | Authorize before count/page; metadata only, thumbnails on visibility, full bytes on preview intent |
| Personal preferences/status | Actor/scope; 60s with mutation patch | No shared public cache; local preview rollback on rejected save; status expiry reflected without reload |
| Sessions and invitations | Actor/capability/workspace where relevant; no long-lived cache | Reauthorize sensitive operation; refresh after revoke/accept; never cache token strings |
| Audit/reports/exports | Authorized actor/scope/filters; 15s or explicit refresh | Bounded cursor pages, minimal metadata; avoid indefinite background polling for closed admin screens |
| Reminder list | Actor/workspace/status; 30s | Mutations and worker state update list; suppress protected source preview after revocation |

The larger navigation must not multiply startup work. Mount only the active destination's query subscriptions. Home and sidebar share summary data; More/admin menus do not prefetch their whole feature trees. Code-split secondary route groups, preserve the current message composer bundle, and compare cold core messaging before/after the new route work. Add a regression budget: idle hidden destinations must issue zero periodic fetches.

## Experiment and rollout order

Use [test-first optimization](tdd.md): define a failing query-count/payload/lifecycle bound or reproducible budget scenario before changing the implementation. Retain correctness/access regression cases while improving speed. Controlled latency/load evidence supplements deterministic PR-level bounds; do not set flaky timing thresholds from one local run. Cache invalidation, account isolation, subscription teardown and page limits require permanent automated tests.

Baseline → authorization/correctness → unread query fix → remove refresh amplification → initial hydration → bundle/row measurement → conditional indexing/virtualization/search/upload changes. Run the same fixture after each change, keep raw traces, and report what became faster and what did not. One-day priorities are the first two performance changes only after the security gate passes.

See [testing](testing.md) for fixture sizes and pass/fail protocol, [timeline](timeline.md) for timeboxes, and [operations](operations.md) for field telemetry.

The W05 client cache audit also gates private root-history and thread queries until actor identity is known, avoiding requests under fallback identities. This reduces premature query work but has not been measured as a latency improvement; record request/query counts and cold/warm timing before making a speed claim. W09 signature checks read at most 12 bytes before upload, but the current server upload still buffers the complete file; direct transfer and 1/3/5-file memory traces remain required. Opening a path-bearing attachment currently requests two signed URLs (inline preview plus forced download), with a 5-minute expiry; no signing latency or batched visible-window projection has been measured. Signed URLs must not be persisted or shared across viewer scopes.

**PR #14 hosted checkpoint, 25 September 2026:** The code head `a31eaf2` passed CI runs [36164846965](https://github.com/kelani34/slack-vibe/actions/runs/36164846965) and [36164887455](https://github.com/kelani34/slack-vibe/actions/runs/36164887455), with GitGuardian and Vercel green. CodeRabbit reported that review was skipped for this base branch. This is hosted developer validation; independent QA remains open.
