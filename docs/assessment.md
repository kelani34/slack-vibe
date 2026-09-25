# Current-state assessment

[Documentation index](README.md) · [Feature inventory](features.md) · [Implementation](implementation.md)

Follow-up runtime evidence is recorded separately in [browser-assessment.md](browser-assessment.md): repository/CI inspection, deployed callback rejection and local auth configuration failure. The original A01–A22 source findings below are preserved; [repair-plan.md](repair-plan.md) assigns their failing regressions, phase and closure proof.

## Assessment basis

Inspected commit `13a87c4` on 18 September 2026. The working tree was clean before documentation. The repository has 156 tracked files at this baseline. Inspection covered the Prisma schema, all action modules, auth and Supabase clients, route/layout composition, message/realtime/cache flows, scheduling implementations, editor, search, uploads, sidebar, and representative UI primitives.

The app describes itself as production-grade in page metadata, but the evidence supports **a feature-rich prototype with significant release blockers**. There is no defensible overall completion percentage: screen coverage is high while cross-cutting correctness is substantially unfinished.

### Verification performed

| Check | Result | Interpretation |
|---|---|---|
| `node_modules/.bin/tsc --noEmit --incremental false` | Failed: 4 diagnostics | Local generated Prisma types do not expose notification preference fields used by the app |
| `node_modules/.bin/eslint src scripts next.config.ts` | Failed: 172 findings, 113 errors, 59 warnings | Includes real conditional-hook violations, broad `any`, and effect/state issues |
| Existing local development server | Observed running Next.js 16.1.1 | No server was started or restarted by this assessment |
| Browser at `http://localhost:3000` | Redirected to `/login`; login screen visually inspected | Authenticated screens were reviewed in source, not interactively certified |
| Repository tests/CI/migrations | No committed test suite, CI workflow, or Prisma migration history found in tracked inventory | No regression or reproducible deployment evidence available |
| Production build/load test | Not run | A build could interfere with the running development output; no production latency claim is made |
| Database/RLS/storage/cron configuration | Not inspected live | Source scripts are not proof that policies or jobs are deployed |

Type errors occurred in `src/actions/user.ts:179` and `src/app/(main)/[workspaceSlug]/settings/page.tsx:33,92,93`. The schema already contains these fields. Regenerating the client may resolve the local type mismatch, but the deployed database still needs independent verification. No generation, migration, or database write was performed.

## Existing system

- Next.js 16.1.1 App Router, React 19.2.3, React Compiler enabled, TypeScript strict configuration.
- Auth.js/NextAuth GitHub login, Prisma adapter, JWT session strategy.
- Prisma 7.2.x dependency range with PostgreSQL driver adapter and `pg` pool.
- Supabase browser client for Realtime/Broadcast; service-role upload action for Storage.
- TanStack Query for channel/thread/profile reads and optimistic sends; Zustand for panel state and notification records.
- Tailwind 4, Radix/shadcn-style primitives, locally bundled Geist fonts, Tiptap, Sonner. Both light and dark CSS tokens exist; provider forces dark and disables system preference.
- SQL cron and Edge Function alternatives for scheduled messages. Their deployment and mutual exclusivity are unknown.
- Both npm and Bun lockfiles exist. README remains starter documentation.

## Findings register

Severity is relative to a release to real teams. Source evidence indicates a defect or risk; exploitability against a deployed instance was not tested.

| ID | Priority | Finding and evidence | Impact | Planned resolution |
|---|---|---|---|---|
| A01 | Blocker | `message.ts` reads such as `getMessages`, `getMessageById`, and `getThreadMessages` authenticate but do not establish channel access; search scopes by workspace slug without membership filtering | Authenticated users can request resources outside their allowed scope through exposed actions | W02; mandatory access predicates on every read |
| A02 | Blocker | `channel-member.ts` add/remove actions lack actor-role checks; join does not reject private channels or require workspace membership; `sendMessage` lacks universal membership and parent/channel checks | Private-channel and cross-workspace integrity is not enforced centrally | W02; permissions and relationship invariants |
| A03 | Blocker | `ChatPanel` hides messages based on a client membership flag, while workspace layout/settings/member routes query workspace data without a consistent membership guard | UI denial does not secure data; workspace metadata and invitation material can be returned too broadly | W02; guard before database projection and serialization |
| A04 | Blocker | Browser Supabase client uses an anonymous key; no verified Auth.js-to-Supabase identity handoff or committed RLS policy set is present | Realtime may fail closed, or deployed permissive policies may expose data; behavior is unknown | W03; prove identity and policies, otherwise gate realtime |
| A05 | Blocker | System messages render with `dangerouslySetInnerHTML`; regular messages use `html-react-parser`; server content validation has no visible sanitization policy | User-controlled rich text, names, descriptions, and forwarding can create unsafe rendering paths | W04; sanitize at input and safe rendering of legacy content |
| A06 | Blocker | Upload action uses service role, accepts file metadata, buffers bytes, and returns a public URL; no workspace binding or size/type policy | File privacy, ownership, abuse limits, and memory use are unresolved | W09; disable until secure or implement private, scoped uploads |
| A07 | Blocker | `next.config.ts` sets `ignoreBuildErrors: true`; conditional hooks follow membership early return in `chat-panel.tsx`; local checks fail | Build success can conceal type failures; membership transitions can break React rendering | W01, W04 |
| A08 | High | Scheduling persists a future message in the same table and sends mention/reply notifications immediately; thread reads do not exclude future messages | Premature disclosure and incorrect scheduled notifications | W07; explicit publication lifecycle |
| A09 | High | SQL scheduler and Edge Function mutate `createdAt` differently; UPDATE handler only patches already-cached rows | Scheduled message may not appear when published; ordering differs by worker | W07, W06; one scheduler and explicit publication event |
| A10 | High | Message subscriptions in sidebar and message list are broad; sidebar dispatches a window event and list also consumes direct events | Duplicate fetches, overlapping event ownership, refresh storms | W06; one owner, scoped authorized events |
| A11 | High | Message INSERT handler ignores every event from the current user and does not reject replies or future messages; own actions only reconcile the sending client | Same-user second tabs miss messages; replies/future rows can enter the channel list | W06; publication filter and mutation identity reconciliation |
| A12 | High | ChatPanel subscribes using `channel_id`/`user_id`, but Prisma models map table names, not these column names | Membership revocation handling is inconsistent with schema | W03, W06; generated event contract and revocation tests |
| A13 | High | `getChannels` performs one count per channel; message arrival and read markers refresh routes; read marking scans all message IDs in a channel for notifications | Query amplification grows with channels and history | W05; batch unread aggregation, bounded relational update |
| A14 | High | Channel page does not prefetch initial messages; client list mounts and fetches afterward; thread query is unbounded; all loaded message rows remain mounted | Load waterfall, memory growth, expensive long-history UI | W05, W08; hydration, cursor pages, bounded rendering |
| A15 | High | Timestamp-only ordering with ID cursor; prepend scroll code contains incomplete branches; thread always scrolls down on changes | Unstable history at equal timestamps and loss of reading position | W08; deterministic ordering and anchor preservation |
| A16 | High | `createWorkspace` creates default channels without creator memberships; workspace landing falls back to any first channel | New owner can land in an access-denied conversation | W04; transactional default memberships and accessible landing |
| A17 | High | DM helper models a DM as a generic two-member PRIVATE channel; profile sidebar DM is a placeholder while hover-card DM calls the helper | Duplicate/racy DMs, private-channel confusion, inconsistent entry points | W12; distinct conversation kind and unique participant pair |
| A18 | Medium | `SELECTED_MEMBERS` exists in schema/types but send permission logic does not enforce it; UI `canPost` does not support it | Setting is not a complete feature and client/server rules diverge | W02, W15; implement consistently or explicitly disable |
| A19 | Medium | Duplicate `leaveChannel` exports have different creator rules; duplicate bookmark loaders return different shapes; notification creation is exported from a `use server` file without an auth check | Conflicting policy and an inappropriate public action boundary | W02, W10; server-only internal write functions and one domain policy |
| A20 | Medium | `deleteMessage` says soft delete but performs hard delete; schema also has `isDeleted`; pins duplicate relation and boolean | Deletion/retention semantics unclear; dependent threads cascade; pin state can diverge | W04, W10; explicit tombstone and pin consistency contracts |
| A21 | Medium | Settings name/slug/delete disabled; invitation copy has no handler; scheduled workspace page lacks cancel action; forward UI is placeholder; presence actions have no callers | Visible product surface overstates implemented behavior | W12–W16; finish or omit affordances |
| A22 | High | No committed migrations/tests/CI found; Sentry dependency without observed integration; root `page.tsx` and `(main)/page.tsx` both map to `/`; sample env omits service-role/app URL requirements | Operational reproducibility and build routing need verification | W01, W18, W19; choose one root route, establish release checks |

### Follow-up implementation evidence

The A01–A22 register above describes the inspected `13a87c4` baseline, not every later working-tree change. The current follow-up adds an allowlist-based message HTML sanitizer at send/edit/scheduled-edit/forward writes and sanitizes timeline, system-message, scheduled, notification, pin/bookmark and DM preview reads. Rich-message forwarding escapes author attribution; mention identities are checked against channel membership on those write paths. New user-controlled system-event details are normalized to safe plain text. Component and PostgreSQL integration tests cover malicious legacy content and new writes. A05 remains open until independent QA validates every sink against the candidate, historical mention identity is reviewed, all message writers/renderers are confirmed, and production-facing evidence is recorded. W05 now partially repairs A13 through batched channel unread counts, SQL-paged DM summaries, access-filtered notification paging, relational channel-notification read updates and targeted client refreshes for profile/workspace creation; only scoped settings/invite invalidations remain to audit alongside measured production query/latency proof. See [rich-text safety](security.md#rich-text-safety), [performance evidence](performance.md#current-w05-implementation-evidence-24-september-2026) and [repair plan](repair-plan.md).

## Other implementation observations

Search is a case-insensitive substring query over stored HTML, capped at 20 results with no continuation. It can return private-channel results without a membership predicate. UI requests can finish out of order because state is updated from whichever promise resolves last. Invalid date filters are silently ignored. These require access and correctness fixes before replacing the search engine.

The editor retrieves channel membership during mention suggestions, rather than reusing a scoped cache. The send hook uploads attachments sequentially. It creates optimistic object URLs without a visible matching cleanup in that hook. Rich-text editor code is statically imported by every message-item module, even though only an edited row needs an editor. Bundle impact is a hypothesis until measured.

Notification data lives in Zustand separately from Query. Notification actions often return errors rather than throwing, while optimistic store updates only handle thrown failures. Mark-read state can therefore remain optimistic after rejection. Notifications are account-scoped in current storage and loading, although presented inside a workspace sidebar.

## UI assessment and limits

The observed login screen is a restrained dark centered panel with a GitHub sign-in button. It has a straightforward hierarchy and no visible onboarding explanation beyond sign-in. That observation does not establish keyboard, mobile, contrast, loading, or OAuth error behavior.

Source inspection shows inconsistent header heights (`h-12` and `h-14`), fixed-width thread/profile surfaces, a 500px notification popover, per-screen hardcoded semantic colors, spinner-based channel loading, and overlapping navigation/panel state. These are specific candidates for the [design backlog](design.md), not claims that all responsive layouts were viewed.

## Scope consequence

The biggest improvement in one day comes from narrowing the exposed surface, fixing the shared permission boundary, repairing the core conversation path, and removing a small number of costly operations. A large directory reorganization, a new motion library, a full-text-search rollout, and a full scheduling redesign do not belong on that day's critical path.

See [security](security.md) for the release boundary and [timeline](timeline.md) for the point at which unfinished work must become an explicit cut or no-go decision.

## Source navigation

These links support direct follow-up at the assessed revision; line positions may move during implementation.

| Evidence area | Source files |
|---|---|
| Data model and constraints | [Prisma schema](../prisma/schema.prisma) |
| Auth/session and build behavior | [Auth configuration](../src/auth.config.ts), [Auth initialization](../src/auth.ts), [Next configuration](../next.config.ts), [TypeScript configuration](../tsconfig.json) |
| Message reads/send/schedule/search | [Message actions](../src/actions/message.ts) |
| Reactions/bookmarks/pins/forwarding | [Message ancillary actions](../src/actions/message-actions.ts) |
| Channel permissions/unread/DM helper | [Channel actions](../src/actions/channel.ts), [Membership actions](../src/actions/channel-member.ts) |
| Workspace onboarding/invites | [Workspace actions](../src/actions/workspace.ts) |
| Profile/presence | [User actions](../src/actions/user.ts), [Profile sidebar](../src/components/profile-sidebar.tsx), [Hover card](../src/components/user-hover-card.tsx) |
| Notifications | [Notification actions](../src/actions/notification.ts), [Notification store](../src/stores/notification-store.ts) |
| Event ownership/refresh/scroll | [App sidebar](../src/components/app-sidebar.tsx), [Message list](../src/components/message-list.tsx), [Thread sidebar](../src/components/thread-sidebar.tsx), [Chat panel](../src/components/chat-panel.tsx) |
| Optimism/editor/rendering | [Send hook](../src/hooks/use-send-message.ts), [Message item](../src/components/message-item.tsx), [Rich-text editor](../src/components/rich-text-editor.tsx) |
| Files | [Upload action](../src/actions/upload.ts), [Legacy upload component](../src/components/file-upload.tsx), [Preview](../src/components/file-preview-modal.tsx) |
| Runtime/data integrations | [Prisma client](../src/lib/prisma.ts), [Browser Supabase client](../src/lib/supabase/client.ts), [Admin client](../src/lib/supabase/admin.ts) |
| Scheduling alternatives | [SQL scheduler](../scripts/setup-scheduled-messages.sql), [Edge publisher](../supabase/functions/process-scheduled-messages/index.ts) |
| Realtime setup | [Publication setup](../scripts/setup-realtime.ts), [Inspection script](../src/scripts/enable-realtime.ts) |
| Visual foundations | [Global tokens](../src/app/globals.css), [Providers](../src/components/providers.tsx), [Package inventory](../package.json) |
