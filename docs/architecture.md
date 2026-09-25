# Architecture assessment and improvement plan

[Index](README.md) · [System design](system-design.md) · [Implementation](implementation.md)

## Direct-message responsibility

The [DM contract](direct-messages.md) is the detailed boundary for one-to-one, group, inbox, privacy, media, offline and mobile behavior. Keep DM policy in the same workspace/conversation feature layer as channels: a DM route resolves kind and membership, a server command owns pair/participant invariants, and the client renders the authorized projection. Do not let sidebar rows, profile cards, call buttons or notification handlers create their own definition of a DM.

The current one-to-one slice is useful evidence of the target seam: `getOrCreateDirectMessage` owns workspace membership and pair-keyed creation, `getChannels` returns a selected peer projection, and the route derives peer identity for the header and composer. The access-checked R23 inbox now exists. W39 adds intent-keyed group-create retries, a 2+ participant avatar projection, and a fresh-history generation when adding someone; integration coverage proves the new participant cannot fetch messages from the prior group. In-place participant revisions, removal/rejoin policy and the broader file/search/notification/media history boundary remain open. A generic conversation service, duplicate mobile backend or separate DM message store is not justified.

Interactive message sends now also carry a stable client intent through the composer, optimistic cache and server action. PostgreSQL enforces one `(userId, clientMutationId)` row; a private request hash detects payload conflicts and is globally omitted from message reads. The public send action requires a valid UUID, checks current membership before returning a canonical retry result, and reconciles concurrent requests through the unique constraint. The hook preserves uploaded attachment descriptors on its in-page failed row so a retry can reuse them. Other message writers, durable offline recovery and attachment finalization/orphan cleanup need their own completion evidence.

Search remains in the current message-action boundary, with filter syntax isolated in the pure `search-query` parser. Its result contract is a bounded projection and stable `(createdAt,id)` keyset, with a cursor bound to the authenticated actor, workspace and exact query; each page still repeats current membership filtering. The parser rejects unknown filter values, malformed/duplicate filters, invalid/reversed dates, blank input and input over 500 characters. PostgreSQL's `pg_trgm` GIN index supports the current `ILIKE` substring semantics. This is an incremental data/query improvement, not evidence for a separate search service, a normalized plain-text projection or a shared result cache; reconsider those only after representative measurement.

## Additional collaboration feature ownership

The F69–F78 contracts are in [collaboration feature design](collaboration-features.md). Polls and acknowledgement requests belong to message-domain operations; voice notes reuse attachments and composer lifecycle; custom emoji and groups belong to workspace administration; templates extend channel creation; keyword matching extends notification publication; saved searches extend personal search preferences. Tasks and notes are small channel-scoped domain modules with their own lifecycle/version rules. They reuse existing access functions, the transactional database client, route helpers and event transport. Do not put durable records in Zustand or add a service per feature.

Move shared authorization and notification ownership first, then implement W27–W30 on those boundaries. Message cards load aggregates, management pages load authorized detail, and revision/media bodies load on intent. R53–R58 do not require another app shell or independent backend.

## Media, scheduling and platform responsibility changes

F79–F108 expand the architecture described in [calls and meetings](calls-and-meetings.md) and [production platform](production-platform.md). Introduce a media integration at an explicit server boundary for grant issuance, room administration and verified callbacks; use one client call controller above conversation routes for SDK track ownership. Keep durable call/event/history data in existing application domains, not inside media UI components. Add event scheduling as a domain distinct from scheduled-message publication while reusing leases/dedupe and clock conventions.

Role evaluation must become the shared source of effective capabilities before custom roles, guests, shared channels or media grants ship. Notification/automation workers carry explicit authority and recheck on delayed execution. Calendar, identity, speech and translation providers each validate external input once and expose concrete domain operations; a generic provider factory or universal workflow framework is not required. Native clients consume versioned shared contracts rather than copying permission decisions.

The initial application/DB stack is retained. Managed media and selected processors are purposeful integrations for requested features, not a rewrite into microservices. Provider selection and measured limitations determine any further infrastructure.

## Recommendation

Testability follows [mandatory TDD](tdd.md): test pure policy/state logic directly, database invariants against PostgreSQL, and framework/provider boundaries in their real runtime. Extract concrete responsibilities when a test reveals coupled behavior, but do not add mock-only repository interfaces or duplicate mobile/domain implementations. Clocks, external providers and transport events may have narrow controlled boundaries; authorization and transactional behavior remain real in integration tests. A refactor starts with characterization and must preserve the same feature/route tests.

Mobile and desktop share canonical routes, authorization, data loaders, query keys and message/media controllers. [Adaptive UI contracts](mobile-responsive.md) change presentation using available width and capability checks; they do not create a second mobile backend or copied business logic. Keep one live composer/controller and one active query tree across breakpoint changes. Prefer CSS/container queries for layout, with narrow viewport/capability integrations only where device evidence requires them. Screen size is never an authorization signal.

Keep the current stack and deployment shape. The main issue is responsibility placement: authorization is scattered, UI components own transport side effects, and the same data lives in several incompatible shapes. Improve these seams before moving large numbers of files.

For the one-day target, create only boundaries needed to fix correctness. The complete folder plan below is a later destination, not a prerequisite or an instruction to perform a wholesale rewrite.

## Layer assessment

| Layer | Current responsibility | Problem | Target responsibility |
|---|---|---|---|
| Routes/layouts | Authentication, direct Prisma queries, initial chrome | Membership/projection policy repeated or missing; messages fetched later | Resolve route parameters; call authorized loaders; hydrate initial client data |
| `src/actions` | Reads, writes, validation, notifications, revalidation | Broad public boundary and duplicate policy; internal notification writer exported as action | Thin public functions: session, boundary validation, feature command/query |
| Feature server logic | Mostly embedded in actions/pages | Difficult to reuse consistent rules | Plain server-only functions for real policy/query/transaction behavior |
| UI components | Display, fetching, realtime, cache updates, scroll, editing | Large components have multiple unrelated reasons to change | View rendering and local interaction; use feature hooks for data lifecycle |
| Client Query cache | Messages/threads/profiles | Different result shapes and unscoped identity; broad invalidation | One contract per entity/read shape; scoped keys and targeted invalidation |
| Zustand | Panels plus fetched notifications | UI and server state mixed; optimistic error divergence | Ephemeral UI state only unless a concrete exception is documented |
| Supabase modules | Anonymous/browser, cookie/server, service-role/admin | Identity strategy and privilege boundaries unclear | Explicit browser transport identity; admin client server-only; purpose-specific use |
| Worker/setup scripts | Two publishers and manual realtime config | No single deploy owner or reproducible policy/migration state | One publisher, versioned migrations and environment-specific runbook |
| Design primitives | Extensive UI inventory | Token/state consistency not reflected across product views | Retain useful primitives; standardize actual product usage |

## Proposed organization

```text
src/
  app/                         # route composition and loading/error boundaries
  actions/                     # thin public Server Action entry points
  features/
    workspace/                 # summaries, membership and channel policy
    messaging/                 # message reads/commands, cache and timeline UI
    notifications/             # scoped notification reads and internal creation
    files/                     # upload authorization, finalization and download
    search/                    # filter parsing, authorized query and results UI
  lib/
    auth/                      # actor resolution and common access predicates
    prisma.ts                  # database client/pool ownership
    supabase/                  # browser transport and server-only admin integration
  components/
    ui/                        # existing shared accessible primitives
    app-shell/                 # navigation, workspace switcher, detail surface
  stores/                      # transient panel state only
```

Do not create empty folders or compulsory `service/repository/controller` files for each feature. A feature can start as one module. Split query and command files only when code size or lifecycle makes that useful. Types derive from precise selections where possible; a different public projection is justified when it removes secrets or changes semantics.

## Concrete responsibility moves

| Current source | Destination / responsibility | Why and migration constraint |
|---|---|---|
| `actions/message.ts` reads | Messaging server query functions | Share authorization and selection with initial server hydration; keep existing action signatures temporarily |
| `actions/message.ts` writes | Messaging commands + thin actions | One send/edit/delete policy, validation and transaction per command |
| `actions/message-actions.ts` | Relevant messaging/bookmark/pin commands | Deduplicate bookmark contracts; enforce source/channel relationships |
| `actions/notification.ts:createNotification` | Server-only notification module | Prevent internal actor/recipient writes from becoming a callable action; test action manifest/public imports |
| `actions/channel.ts` and `channel-member.ts:leaveChannel` | One channel membership command, including direct/group participant lifecycle | Choose one creator/owner rule, direct pair/group history policy and replace all callers, not only one UI |
| Workspace/page direct Prisma reads | Workspace and conversation loaders | Reuse scoped summaries; prevent full workspace object/invite-code serialization |
| `app-sidebar.tsx` event handlers | Sidebar owns summary-level unread, membership and notification signals | Per-message window relay is removed; extract a broader workspace hook only if multiple views need the same signal |
| `message-list.tsx` event/cache logic | Focused conversation owns timeline hydration and visible-row cache updates | Bounded ID dedupe, root/publication guards, same-user ack/event cache reconciliation and targeted thread/root invalidation are covered locally; prove live cross-view behavior before extracting a coordinator |
| `thread-sidebar.tsx` subscription | Same messaging event owner | Exact-key published-reply refresh is covered locally; parent, reply edit/delete/reaction consistency remains open |
| `notification-store.ts` records | Query queries/mutations | Shared invalidation and rollback behavior; retain only open/closed view state |
| Profile/thread stores and URL effects | One explicit panel-state contract | Avoid conflicting URL/store ownership and stale state across workspaces |
| `upload.ts` and legacy `file-upload.tsx` | One file lifecycle | Avoid server-role and anonymous upload paths with different policies |
| SQL + Edge scheduled implementations | One owned publisher | Same ordering, notification, retry and access semantics |

## Dependency rules

- UI may import public action entry points and client-safe contracts, not Prisma/admin clients/server-only query modules.
- Server feature modules may use Prisma and explicit internal functions from another feature when there is a real domain operation. Avoid circular imports through action barrels.
- Public actions validate untrusted arguments once. Internal typed code should not repeatedly turn data into `unknown` or generic records.
- Session actor IDs come from authentication, not action arguments. Workspace/channel IDs remain untrusted selectors until access is proven.
- Realtime payloads are an external boundary. Validate the required discriminant/version/IDs and map them to known event types once.
- Shared primitives own focus and generic visual states; product features own domain copy and permissions.

## Incremental migration sequence

1. **Establish checks and policy seam.** Fix genuine hook violations and stale generated types; create shared access functions only for repeated meaningful authorization.
2. **Choose a single message contract.** Define public author fields and message page shape; make initial read, action acknowledgement, realtime fetch, and thread results compatible.
3. **Centralize event ownership.** Preserve observed behavior with regression tests, then remove duplicate subscriptions/relay and broad route refreshes.
4. **Consolidate data ownership.** Move notification data into Query; scope every cache key to actor/workspace where relevant.
5. **Move files opportunistically.** Relocate a feature when changing it; update imports and remove compatibility wrappers once all callers migrate.
6. **Separate background effects.** Establish one scheduling publisher; introduce outbox work only where durability/fan-out requires it.

## What should remain simple

No generic event bus, custom caching framework, service locator, repository interface with one implementation, or duplicate DTO for every layer. Use PostgreSQL before adding a search cluster. Use existing Radix/CSS animation capabilities for common feedback. Use a single database transaction instead of an eventual-consistency pipeline when both operations are local and bounded.

## Decision triggers for larger architecture

| Change | Only reconsider when |
|---|---|
| Redis/distributed cache | Database traces show repeated expensive shared reads after query/index fixes, with a clear invalidation contract |
| External search | PostgreSQL cannot meet measured search latency/relevance at target volume |
| Dedicated queue | Durable background work volume, retries or scheduling accuracy exceed a bounded database worker |
| Separate realtime gateway | Verified Supabase identity/policy/throughput requirements cannot be met economically or correctly |
| Microservice extraction | Independent ownership/deployment/load demands justify the operational burden |

## Route expansion boundaries

The [production route map](routes.md) adds navigation, not a new service for every destination. Home/attention inboxes compose authorized feature queries; files/search reuse existing domain loaders; account/admin layouts separate presentation and capability checks. Extend existing feature folders for subscriptions, preferences, invitations and personal triage. Create a dedicated module only for a real new lifecycle such as session revocation, moderation or data requests.

Keep canonical route construction in one small concrete helper and reuse detail content between routed panels and direct loads. Do not duplicate `MessageList`, file preview or profile components for each new page. Migration of legacy URLs is separately reversible from feature/data rollout. W21 owns routing; W22–W26 own added behavior and tests.

## Architecture acceptance

An implementer can trace “send message” from UI to action, access policy, transaction, acknowledgement, event, and cache update without encountering duplicate authorities. A negative permission test fails at the server before data retrieval. A realtime edit updates channel, thread, and detail views predictably. Each feature's Query key and invalidation rules are discoverable next to its data functions. These outcomes matter more than matching the exact directory tree.
