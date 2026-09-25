# Operations and deployment design

[Index](README.md) · [System design](system-design.md) · [Security](security.md) · [Testing](testing.md)

No infrastructure was changed or deployed during this assessment. This runbook is the remaining implementation specification. The hosting provider, actual database region/plan, storage policies, deployed cron and production configuration are unknown.

## Operations impact of F69–F78

The [collaboration delivery contract](collaboration-features.md#delivery-verification-and-operations) adds metrics, data lifecycle and rollback requirements. Reuse existing background ownership for due reminders and bounded notification matching; do not create another scheduler for tasks. Monitor audio orphan bytes, notification fanout/lag, reminder failures, note conflicts and poll failures without recording private content. Include ballots, acknowledgements, tasks, note revisions and audio in authorized export/deletion/retention design. Feature gates can stop new writes independently while retaining safe historical reads. No operational change is made in this documentation round.

## Media, scheduling and full platform operations

[Calls and meetings](calls-and-meetings.md) adds a media provider, TURN/regional connectivity, room reconciliation, active-access revocation, calendar synchronization and optional recording/speech processing. Establish credentials, quota/spend caps, processor/data-region decisions, join-failure dashboards and terminate-room/stop-recorder runbooks before release. Provider outage must leave messaging available and explain live-call unavailability. Existing active calls should survive an ordinary app UI rollout where compatible.

[Production platform](production-platform.md) adds OAuth/SSO secret rotation, webhook renewal, workflow/import job recovery, moderation/appeal operations, hold-aware deletion and signed native-client distribution. Monitor authority/revocation failures, stale calendar cursors, stuck recordings, failed consent transitions, queue lag and per-workspace costs without logging content. Backups and restore rehearsals include event identities, job dedupe state and derivative artifact policies. External processors need named operational owners; no service, credential or deployment was created in this round.

## Environment model

Provide the [dedicated QA engineer](qa-engineer.md) a reproducible isolated candidate with build/config/schema/flag identity, synthetic roles and controlled provider sandboxes. Record independent QA sign-off before the release decision; a deployment owner does not turn missing QA into a pass. Any post-deploy smoke checks must use explicitly authorized safe synthetic actions and record the deployed artifact. Infrastructure or provider changes invalidate affected prior evidence and require re-verification.

Operational changes are subject to [TDD](tdd.md): executable configuration rejection, migration/upgrade, restart/idempotency, backup/restore and rollback checks precede rollout. All destructive tests use verified disposable environments and credentials. CI failure, missing services or empty test discovery must block the relevant release lane. Keep test artifact secrets/content out of logs; passing application tests do not substitute for an actual restore rehearsal.

Use separate local/development, staging and production databases, storage buckets and auth callbacks. Staging needs isolated synthetic team data and at least two accounts for permission/realtime tests. Never run setup scripts that alter publications or cron against an unidentified database.

Choose one lockfile/package manager and pin supported runtime versions. README currently mentions several package managers while the repository contains both npm and Bun lockfiles. Verify install and Prisma generation with the selected tool in a clean environment before calling setup reproducible.

## Configuration inventory

| Variable / configuration | Purpose | Classification / remaining work |
|---|---|---|
| `DATABASE_URL` | Runtime PostgreSQL connection used by Prisma/pg | Secret; pooled connection configuration and connection budget |
| `DIRECT_URL` | Direct database connection, referenced by example env | Secret; inspect Prisma config and migration routing before use |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser/service project address | Public configuration, environment-specific |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser project key | Public client key; safety depends on grants/policies, not secrecy |
| `SUPABASE_SERVICE_ROLE_KEY` | Server upload/admin access | Secret; missing from example env; never client-bundled or logged |
| `AUTH_SECRET` | Auth.js session protection | Secret; strong generation and rotation plan |
| `AUTH_URL` | Auth callback origin | Correct per environment; verify proxy/host behavior |
| `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` | GitHub OAuth application | Provider config and secret; callbacks registered per environment |
| `NEXT_PUBLIC_APP_URL` | Invite origin currently used by settings | Public; missing from example env; no localhost fallback in production |
| Worker environment | Supabase URL/service secret or DB role | Separate privilege and invocation authentication; choose one publisher |
| Error monitoring config | Sentry dependency exists | Integration/DSN/sampling/scrubbing not established; configure only after choosing sink |

Validate required variables at startup/build/runtime boundaries appropriate to their usage. Fail clearly when a required secret is absent, without printing its value. Maintain an example file with placeholders only. Do not infer that a missing sample entry means the user's actual environment lacks the variable.

## Database and migration ownership

No committed Prisma migration history was found. W19 must establish a baseline matching the existing database before introducing migrations. Do not run an initial destructive migration over existing data. Capture schema, grants, RLS policies, indexes, publication membership, storage policies and scheduled-job definitions as versioned infrastructure artifacts where practical.

For each change: inspect current state → back up → apply additive migration in staging → backfill in bounded batches → verify counts/invariants → deploy compatible application → switch reads/writes → remove old columns only in a later release. A reversible UI change does not make a destructive schema operation reversible.

Candidate changes requiring this process include publication status/time, client mutation ID, notification scope/dedupe, private object references, DM identity/read cursors/indexes, and the `pg_trgm` extension plus `messages_content_trgm_idx`. Before applying the search-index migration to a populated database, confirm extension-install privileges and database support, measure the table/index size, rehearse migration duration and write impact on a production-like staging copy, verify the index with `pg_indexes` and representative `EXPLAIN (ANALYZE, BUFFERS)`, and document the rollback/rebuild procedure. The current migration uses ordinary `CREATE INDEX`, which blocks writes while the index is built; schedule its rollout accordingly or replace it with a separately reviewed online-index strategy supported by the chosen Prisma migration version. Do not run it against production from this task.

## Connection and regional design

Place application execution close to the database where the deployment platform allows it. Measure cross-region RTT before blaming React for slow actions. Set `pg` pool size and idle/connect timeouts to the actual hosting concurrency and database connection budget. The current module creates a Pool before resolving the development Prisma singleton; review ownership so development reloads do not create unnecessary pools.

Distinguish runtime pooling from direct migration connections. Verify prepared-statement/adapter behavior for the actual pooler mode using official provider/runtime guidance during implementation, rather than assuming a sample connection string guarantees compatibility.

## Deployment checklist

1. Select exact revision and document enabled feature gates and outstanding limitations.
2. Install reproducibly; generate Prisma; run type/lint/test/build under release configuration.
3. Apply compatible migrations to staging; verify policies and anonymous/outsider denial.
4. Deploy application and exactly one scheduled publisher if scheduling is enabled.
5. Verify storage bucket privacy and object access with positive and negative accounts.
6. Exercise login, authorized read/send, second-client update, revoke access, logout, and failed-send recovery.
7. Confirm monitoring receives a synthetic non-sensitive error and health counters.
8. Check rollback compatibility and backup availability before production promotion.
9. Promote only when authorized in the implementation session and release gates pass; observe error and latency changes.

## Scheduler ownership

Record the chosen runtime, job name, trigger interval, maximum batch size, lease/lock semantics, timeout, retry policy and owner. Disable the alternate implementation only through a controlled deployment change. Verify no duplicate cron is still invoking the same publication logic.

Authenticated invocation is mandatory. CORS headers do not authenticate an Edge Function. Platform JWT verification/configuration must be inspected, and internal worker requests need an explicit trusted identity. Keep worker privileges limited to its required tables and operations where possible.

Alert on oldest overdue schedule, failed attempts, repeated claims and job last-success age. An empty batch is not an error. A publish-time membership denial is a user-visible terminal state, not an infinite transient retry.

## Observability plan

| Signal | Why | Initial response |
|---|---|---|
| Action error rate and p95 duration by operation | Distinguish slow DB, validation and authorization | Inspect sanitized trace and query timings |
| DB query count/time per conversation request | Catch N+1 and refresh regressions | Compare W05 baseline |
| Realtime connection status/subscription count | Detect reconnect loops and leaks | Reauthorize/refetch, inspect ownership |
| Commit-to-visible message latency | Measures actual remote experience | Separate provider/network/client delays |
| Send dedupe conflicts/uncertain outcomes | Delivery integrity | Lookup intent and inspect retry path |
| Scheduled backlog age/failure counts | Delayed or broken publication | Pause/recover chosen worker safely |
| Upload failures/orphan object growth | Storage lifecycle health | Inspect grant/finalization/cleanup paths |
| Client long tasks/INP/CLS/error events | Rendering and interaction health | Reproduce fixed scenario |
| Authorization-denied rate spikes | Possible abuse or broken policy rollout | Validate expected product activity before alert escalation |

Do not log content, OAuth credentials, private URLs, cookies, invitation codes or full user records. Apply sampling and retention appropriate to the environment. The installed Sentry package is only a dependency until instrumentation and scrubbing are verified.

## Recovery playbooks

### Unsafe data exposure

Disable the affected route/action/transport feature, revoke exposed credentials if any, preserve sanitized evidence, identify affected scope and perform incident handling appropriate to actual deployment/users. Do not make the bucket/table public to work around a failing read. Restore only after negative access tests pass.

### Realtime outage

Keep server actions authoritative. Show reconnecting status; use bounded authorized foreground refresh for a degraded mode. On recovery, refetch visible messages and summaries before marking live. Do not replay a client's pending sends with fresh IDs automatically.

### Scheduled publisher failure

Pause duplicate or faulty trigger, retain pending records, inspect claim/failure state, repair idempotently and publish only still-authorized work. Report delayed delivery to authors. Never blindly clear all `scheduledAt` fields.

### Storage failure

Stop new grants if authorization/finalization is broken; preserve local draft text and finalized upload references. Retry transfer/finalization independently. Cleanup jobs must have a grace period and reference checks.

### Bad deployment or schema migration

Roll back application code only if schema remains compatible. Prefer forward corrective migrations after a schema change; restoring a backup may discard newer messages and requires an explicit incident decision. Rehearse restore into an isolated environment before promising recovery objectives.

## Proposed reliability objectives

For the complete baseline, target 99.5% monthly availability for core read/send, recovery point ≤24h and recovery time ≤4h as initial planning objectives. These are not currently achieved or contractually offered. Provider backup/PITR capability, cost and restore tests must validate them. For the one-day internal candidate, document manual recovery and backup status honestly rather than claiming an SLA.

## Operator handoff

For the expanded [production routes](routes.md), add operational ownership for session revocation, invitation expiry, audit persistence, reminder execution and data-request artifacts. Monitor revocation failures, oldest pending export/report, expired artifacts awaiting cleanup and reminder dedupe failures. Admin UI is not an operational control plane for database secrets or infrastructure credentials. Jobs must be paused independently without disabling ordinary read/send; an export failure must not destabilize messaging.

Help/connection diagnostics expose only the current client's safe health state. Public status information, if later introduced, is a separate sanitized publication; never render raw internal logs or queue payloads to explain downtime.

Maintain exact deployment commands, revision, environment names, migration versions, worker trigger, feature gates, dashboard links, rollback path and named operator. Keep secret values out of documentation. The end-of-day handoff must distinguish “configured in repository,” “deployed,” and “verified functioning.”
