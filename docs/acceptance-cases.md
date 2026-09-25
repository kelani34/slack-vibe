# Acceptance cases for the complete product

[Index](README.md) · [Delivery phases](delivery-plan.md) · [Execution traceability](delivery-traceability.md) · [Requirement layers](test-matrix.md) · [QA verdicts](qa-checklist.md)

## Status, oracle and fixtures

**656 concrete scenarios are catalogued; independent QA is PLANNED / NOT RUN.** They cover 107 executable F requirements; F48 is the historical umbrella mapped to detailed requirements, not a dummy executable feature. This is the baseline six cases per executable requirement (642), six additional send/retry cases under F17, and additional group-DM intent-retry, forwarding destination-state, lazy profile-query, shared-motion-token, button-press-feedback, same-tab logout-cache, actor-switch cache and workspace-bound profile-cache cases. A small subset now has developer TDD evidence, identified under the relevant features below; that does not count as independent QA or mean every acceptance dimension ran. This catalogue is not a guarantee that every unknown defect is enumerated.

Every scenario has a stable ID in the `TC-Fnn-nn` sequence (the six-case baseline may be extended with additional justified cases). When a scenario contains multiple outcomes or environments, split it into named assertions/data rows (`.a`, `.b`, etc.) with actual fixture/step/expected-result evidence. Six is an organizing convention, not a cap. Apply the universal cases below to **each operation** in a feature; feature-specific statements and the owning detailed spec supply its oracle. No "covered by happy path" shortcut for a different role, API, route or state.

Synthetic fixture vocabulary: workspace A and B; owner/admin/member/outsider/removed member; public/private/archived/selected-poster channels; two members of the same conversation plus an outsider; same actor on two tabs/devices; new/existing account; empty/typical/large histories; pending/published/deleted message and root/reply; future/past/DST dates; private object and expired grant. Later fixtures add guest/bot/shared-channel roles, active/ended room generations, consented/unconsented participants, provider duplicate/stale callback, retention/hold, import provenance and native device lifecycle. Fixtures are disposable only in an explicitly identified test environment.

For a case: establish actor/resource state → act through the real boundary → observe UI/response → assert durable state and absence of prohibited effects → reconcile second client/provider if relevant → record red/green and independent QA. A success toast alone is not a persistence oracle. Absence of an error is not proof of authorization. Deterministic provider stubs exercise errors; actual sandbox/provider tests prove protocol/media delivery. Layer codes match [test-matrix](test-matrix.md); assign each individual test to the narrowest meaningful layer and retain end-to-end coverage of complete workflows.

## Universal operation case matrix

These dimensions are mandatory case-design inputs. Mark genuinely inapplicable dimensions with a reviewed reason; an unimplemented or failing dimension is not inapplicable. Use full allowed/denied policy tables and all legal/illegal state transitions for security and integrity. Pairwise combinations may reduce redundant browser/environment permutations after those invariants are exhaustive; they cannot replace explicit high-risk race tests.

| Dimension | Required variants | Expected invariant |
|---|---|---|
| U01 Identity | Anonymous, authenticated, expired, revoked, wrong account | Only current permitted identity acts; no stale credential or cached bypass |
| U02 Role | Owner/admin/member, outsider/removed; guest/bot/custom role when enabled | Complete allow/deny table enforced at actual server/provider boundary |
| U03 Scope | Same/wrong workspace, channel, conversation, parent and object | No ID substitution, metadata/count leak or cross-resource write |
| U04 Input | Absent/empty/valid, min/max and just outside bounds, malformed/unknown enum | Explicit validation, accessible error, no partial state |
| U05 Text | Whitespace, Unicode, emoji, combining characters, RTL, long word, markup, IME | Correct length/search semantics, inert rendering and no accidental send |
| U06 Resource | Missing, deleted, archived, locked, changed privacy, removed parent | Safe current-access outcome and recoverable navigation |
| U07 Lifecycle | Every permitted transition and every forbidden transition | State machine never enters impossible mixed state |
| U08 Atomicity | Failure before/inside/after commit and between related writes | No unintended partial membership/message/object/notification |
| U09 Idempotency | Double submit, duplicate callback/job, lost acknowledgement, replay | One intended effect or explicit uncertainty; no duplicate publication |
| U10 Concurrency | Two actors/tabs, stale version, edit/delete, revoke/write, cancel/dispatch | Defined winner/conflict; no lost data or restored authority |
| U11 Event order | Ack before/after event, stale/duplicate/missing events, generation change | Deterministic reconciliation against canonical state |
| U12 Network | Slow, offline, drop before/after commit, reconnect, provider timeout | Input retained, retry bounded, uncertain state truthful |
| U13 Cache | Cold/warm, stale content, access change, account switch, logout | Scope identity and invalidation correct; private state not reused |
| U14 Pagination | Empty, one, exact page, next page, equal ordering key, deleted cursor | Stable bounded results without omission/duplication |
| U15 Time | UTC/local, DST gap/overlap, leap/month end, skew, expiry boundary | Stable intended instant/occurrence and consistent eligibility |
| U16 UI state | Initial/loading, empty, populated, pending, success, partial, error, denied | Every enabled action has honest feedback and usable next step |
| U17 Navigation | Direct/deep/legacy link, refresh, Back/Forward, panel close, workspace switch | Valid identity, focus, scroll and draft preserved; safe fallback |
| U18 Accessibility | Keyboard, visible focus, labels, screen reader, contrast, reduced motion | Equivalent operability with no traps or content loss |
| U19 Mobile | 320px/phone/tablet, portrait/landscape, touch, keyboard, safe area, text zoom | MR01–MR14 applicable criteria pass on real devices as required |
| U20 Limits/load | Rate/body/fanout/page/storage/participant limits, typical and large fixtures | Bounded resource usage with explicit graceful refusal |
| U21 Providers | Denied permission, bad signature, stale/replayed callback, revocation/outage | Fail safely with current authority and attributable effect |
| U22 Data lifecycle | Retention, hold, deletion, derived object/search/export/cache, restore | Agreed preservation/deletion without expanding content access |
| U23 Migration/rollout | Old/new rows/client versions, feature disabled, rollback, worker restart | Compatibility, preserved records and secure denial |
| U24 Evidence | Intended red, candidate green, CI discovery, real durable assertion, QA retest | Reproducible proof tied to build/config; no fake pass or secret content |

Before closing a feature, enumerate its operations and map U01–U24 to named case/data rows. Record covered/not-applicable with reasons. The current case catalogue is a complete inventory starting point; this expansion is a Definition-of-Ready and Definition-of-Done obligation, not a claim that all combinations have already been executed or resolved.

## Feature-specific scenarios

### F01: GitHub sign-in/session

Owner: W01, W02. Required layers: I,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F01-01** — Supported provider login returns to an allowed protected destination; the account identity matches the session.
- **TC-F01-02** — User cancels provider consent; login explains cancellation and remains retryable without creating an authenticated session.
- **TC-F01-03** — Forged/replayed callback state and external return URLs are rejected without leaking tokens.
- **TC-F01-04** — Expired/revoked session denies a direct protected request and preserves only a safe return destination.
- **TC-F01-05** — Logout in one tab causes protected caches and live subscriptions to clear in the other tab after session reconciliation.
- **TC-F01-06** — Wrong callback origin/configuration produces diagnosable redacted failure; real local and deployed round trips pass after B02/B03 repair.
- **TC-F01-07** — Selecting Log out clears the current tab's private React Query cache before the session ends, while clearing only the signing-out actor's local drafts.
- Developer evidence: `src/components/nav-user.test.tsx` proves a cached private message and the signing-out actor's draft are cleared before returning to login; another actor's local draft remains. `src/components/session-cache-boundary.test.tsx` proves propagated unauthenticated state clears the cache and navigates to login with the local path preserved, and that actor changes clear cache and refresh the server-rendered route for the new identity. Real two-tab Auth.js broadcast, live subscription teardown and independent QA remain NOT RUN.

### F02: Workspace create/list/switch

Owner: W04. Required layers: I,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F02-01** — Create workspace commits owner, default channels and owner memberships together.
- **TC-F02-02** — Concurrent identical slug creation produces one success and a useful conflict without partial rows.
- **TC-F02-03** — Failure after workspace insertion rolls back memberships/channels and allows safe retry.
- **TC-F02-04** — Workspace switch loads only the actor's target memberships and drops old private cached state.
- **TC-F02-05** — Zero-workspace account is directed to chooser/create without an inaccessible default channel.
- **TC-F02-06** — Last visited channel removed before reload falls back to an accessible destination without revealing its title.
- **TC-F02-07** — A direct authenticated actor change clears the previous actor's in-memory query data before it can be reused under the new identity.
- Developer evidence: `src/components/session-cache-boundary.test.tsx` proves cache retention for the initial authenticated actor and clearing on sign-out and actor change. Full browser account switching and independent QA remain NOT RUN.

### F03: Invite-code join

Owner: W02, W15. Required layers: I,E. State: **DEVELOPER-TESTED SLICE / INDEPENDENT QA NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F03-01** — Valid scoped invitation joins the intended workspace with the intended minimum role.
- **TC-F03-02** — Expired, revoked and exhausted invitations reject acceptance without membership creation.
- **TC-F03-03** — Two simultaneous accepts by the same actor yield one membership and correct usage count.
- **TC-F03-04** — Accept racing revoke follows one transactional winner and does not reinstate a revoked invitation.
- **TC-F03-05** — Invitation acceptance never auto-joins unrelated private channels or accepts a forged role.
- **TC-F03-06** — Logged-out invite flow preserves its intended destination without exposing invite secrets in diagnostics.

### F04: Tenant and resource authorization

Owner: W02, W03. Required layers: I,S,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F04-01** — Enumerated allowed actor/resource operations succeed using current server authority.
- **TC-F04-02** — Foreign workspace and private-channel IDs fail on read, write, search, counts and exported actions.
- **TC-F04-03** — Removed member loses open transport, file renewal and subsequent mutation permission.
- **TC-F04-04** — Prefetch, initial server payload, detail lookup and alternate action cannot bypass denial shown in the UI.
- **TC-F04-05** — Account switch/logout prevents old Query, local-draft and transport state appearing for the new actor.
- **TC-F04-06** — Relationship mismatch among workspace/channel/message/parent/object is rejected atomically.

### F05: Workspace administration

Owner: W15. Required layers: I,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F05-01** — Authorized owner/admin edits permitted workspace fields with audited outcome.
- **TC-F05-02** — Ordinary member cannot change roles, invitations, ownership or workspace identity through direct actions.
- **TC-F05-03** — Last owner cannot leave or be removed without a valid ownership transfer.
- **TC-F05-04** — Concurrent ownership transfer/removal preserves at least one accountable owner.
- **TC-F05-05** — Slug/name conflict or invalid value leaves old identity and links usable.
- **TC-F05-06** — Failed admin write restores controls and displayed state without a false success notification.

### F06: Member directory

Owner: W02, W13. Required layers: I,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F06-01** — Member directory pages contain only permitted workspace identities and fields.
- **TC-F06-02** — Search for an outsider or private profile field yields no leaked result or count.
- **TC-F06-03** — Equal names and pagination boundaries retain stable ordering and distinct IDs.
- **TC-F06-04** — Removed membership disappears from directory, mention and profile contexts after reconciliation.
- **TC-F06-05** — Empty/error/loading directory states retain navigation and accessible retry.
- **TC-F06-06** — Profile-open action from every listed member targets the correct account at phone and desktop widths.

### F07: Public/private channel creation and browsing

Owner: W02, W15. Required layers: I,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F07-01** — Public and private creation assigns intended privacy, creator membership and posting defaults.
- **TC-F07-02** — Duplicate normalized channel name in a competing create produces a recoverable conflict.
- **TC-F07-03** — Private channel is absent from outsider discovery, search suggestions and counts.
- **TC-F07-04** — Public discovery follows the explicitly decided read-before-join policy at server and UI.
- **TC-F07-05** — Failed channel creation rolls back all membership/template setup and preserves entered fields.
- **TC-F07-06** — Unauthorized creation or cross-workspace initial invitee is denied with no partial channel.

### F08: Join/leave/add/remove members

Owner: W02, W15. Required layers: I,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F08-01** — Permitted join/leave/add/remove updates current membership across open clients.
- **TC-F08-02** — Private self-join and nonmember cross-workspace invitation are denied.
- **TC-F08-03** — Ordinary member cannot remove another actor or bypass owner safeguards through alternate exports.
- **TC-F08-04** — Simultaneous add/remove converges to the committed state without duplicate membership rows.
- **TC-F08-05** — Leaving a channel closes its thread/file/call access and chooses a safe navigation fallback.
- **TC-F08-06** — Failure leaves prior membership visible with retry; a repeated desired-state operation is idempotent.
- Developer evidence: `src/components/channel/members-tab.test.tsx` covers retryable errors for the current-member and add-member lists in both the Members tab and member dialog, plus cached current-member retention after refresh failure. Membership authorization, concurrent add/remove, full lifecycle and independent QA remain NOT RUN.

### F09: Channel metadata and privacy

Owner: W15. Required layers: I,C,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F09-01** — Permitted topic/name/description change updates header, details and directory consistently.
- **TC-F09-02** — Empty/oversize/unsafe values reject with accessible field errors and preserve input.
- **TC-F09-03** — Privacy change re-evaluates discovery, active subscriptions and file/search access.
- **TC-F09-04** — Concurrent stale edits report conflict or the specified version outcome without silent data loss.
- **TC-F09-05** — Unprivileged actor cannot change privacy through direct action even if a dialog remains open.
- **TC-F09-06** — Archived/deleted channel settings follow the declared policy and do not revive it accidentally.

### F10: Archive/unarchive/delete

Owner: W10, W15. Required layers: I,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F10-01** — Archive makes every publication path read-only while preserving authorized history.
- **TC-F10-02** — Unarchive restores only the capabilities allowed by current membership and posting policy.
- **TC-F10-03** — Reply, forward, scheduled publish, upload finalization and bot send cannot bypass archive.
- **TC-F10-04** — Delete/tombstone follows the agreed thread/reference/retention contract without unintended cascades.
- **TC-F10-05** — Concurrent archive/send resolves to a defined committed result with no partial publication.
- **TC-F10-06** — Denied or failed archive/delete restores accurate state and leaves a recoverable navigation path.

### F11: Posting permissions

Owner: W02, W15. Required layers: U,I,S. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F11-01** — Each declared posting mode yields the documented owner/admin/member/selected-user decisions.
- **TC-F11-02** — Selected-user list rejects foreign, removed and duplicate identities.
- **TC-F11-03** — Root, reply, forward, schedule, offline replay and enabled bot paths use the same effective rule.
- **TC-F11-04** — Changing posting rights while composer or call-linked action is open blocks the next forbidden write.
- **TC-F11-05** — Archived or locked channel takes precedence over ordinary posting permission.
- **TC-F11-06** — UI disabled explanation matches server denial and has an accessible route to request access.

### F12: Starred channels

Owner: W05, W10. Required layers: I,C,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F12-01** — Star/unstar desired state updates navigation once and persists across reload.
- **TC-F12-02** — Retrying a star mutation never produces duplicates or flips the requested state.
- **TC-F12-03** — Failed optimistic mutation restores the canonical star state.
- **TC-F12-04** — Lost membership removes private labels from stars and cached navigation.
- **TC-F12-05** — Two tabs changing favorite state converge without route refresh storms.
- **TC-F12-06** — Keyboard and touch controls expose the same action and preserve selected conversation.

### F13: One-to-one DMs

Owner: W12/W22. Required layers: I,E. State: **IMPLEMENTED SLICE / QA NOT RUN**. The current candidate has focused developer coverage for workspace membership, canonical pair creation, idempotent reuse, `DIRECT` persistence and sidebar projection; the full six-case acceptance set remains open. See the [DM contract](direct-messages.md), [phase mapping](delivery-traceability.md) and [QA checklist](qa-checklist.md).

- **TC-F13-01** — Starting a DM creates a distinct conversation with the intended two members.
- **TC-F13-02** — Concurrent same-pair requests return one canonical conversation.
- **TC-F13-03** — An unrelated two-member private channel is never reused or reclassified as that DM.
- **TC-F13-04** — Self/foreign-workspace/removed targets follow explicit policy and cannot broaden access.
- **TC-F13-05** — Profile, hover card, global compose and inbox resume the same DM.
- **TC-F13-06** — Source migration identifies legacy DM evidence explicitly; ambiguous private channels remain preserved.
- **TC-F13-07** — Member hover details are fetched only when opened; loading is announced, initial errors retry, and cached profile details remain visible if refresh fails.

### F14: Group DMs

Owner: W39. Required layers: I,C,E. State: **DEVELOPER-TESTED SLICE / INDEPENDENT QA NOT RUN**. Local tests cover the new-member history boundary, the header notice that explains the new conversation generation, stacked avatar behavior and same-intent retry/conflict paths; the complete feature cases remain open for dedicated QA. See [phase mapping](delivery-traceability.md).

- **TC-F14-01** — Create group DM commits only the approved participant set and explicit history policy.
- **TC-F14-02** — Adding a new participant creates a separate conversation generation; the new member can read new-generation messages but cannot read messages from the prior group's history.
- **TC-F14-03** — Concurrent participant edits use one versioned result without silently losing members.
- **TC-F14-04** — Leave/remove updates inbox, files, notifications and active-call admission consistently; creator rename and leave actions still work when a prior departure leaves two active group participants.
- **TC-F14-05** — Outsider or foreign participant injection fails before any group/message writes.
- **TC-F14-06** — Participant limit and duplicate identity show clear errors without writes; group DMs retain a two-layer avatar surface, using a neutral group marker when one active member remains, while one-to-one DMs show a single peer avatar.
- **TC-F14-07** — A lost or concurrent retry with the same client intent returns one canonical group; changed payload or cross-creator key reuse conflicts without revealing an ID, and request hashes/mutation keys stay out of ordinary channel reads.

### F15: Recent/history channel read

Owner: W04, W05, W08. Required layers: I,E,Q. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F15-01** — Recent page contains only accessible published root messages in deterministic order.
- **TC-F15-02** — Paging equal timestamps and a deleted boundary produces no skipped or duplicate records.
- **TC-F15-03** — Thread replies and scheduled drafts are absent from the root history result.
- **TC-F15-04** — Empty history, exhausted cursor and malformed cursor have distinct safe responses.
- **TC-F15-05** — Membership removal during page fetch prevents private content from entering cache/render.
- **TC-F15-06** — Large fixtures keep query/page/render work bounded and preserve reading position.

### F16: Rich-text composition

Owner: W04, W13. Required layers: C,I,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F16-01** — Rich text round-trips supported marks, lists, links and plain-text extraction.
- **TC-F16-02** — Unsafe paste, malformed HTML, script-like links and system-name markup remain inert.
- **TC-F16-03** — Enter during IME composition never sends unfinished text.
- **TC-F16-04** — Composer formatting shortcuts and mention navigation do not conflict with global shortcuts.
- **TC-F16-05** — Whitespace-only, over-limit and attachment-only content follow explicit validation.
- **TC-F16-06** — Send failure, editor remount and navigation preserve recoverable input with correct focus.

### F17: Send/pending/retry

Owner: W04, W06. Required layers: I,C,E. Local developer tests now cover the optimistic lifecycle, retry identity, event/ack ordering, retry access check, payload conflict, concurrent dedupe and upload reuse. Explicit uncertain-delivery resolution, browser/device execution and independent QA remain **NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F17-01** — Successful intent renders pending then one canonical sent message.
- **TC-F17-02** — Lost acknowledgement followed by retry with the same intent creates one stored message.
- **TC-F17-03** — Acknowledgement and realtime event in either order reconcile one visible record.
- **TC-F17-04** — Explicit server rejection retains text/attachments and displays retryable or final failure accurately.
- **TC-F17-05** — Permission loss or archive before retry prevents publication without discarding recoverable draft.
- **TC-F17-06** — Ambiguous delivery is visibly uncertain until checked; it never invents success or retries with a new identity.
- **TC-F17-07** — Two simultaneous requests with the same user and intent key return one canonical message and trigger one notification fanout.
- **TC-F17-08** — Reusing an intent key with changed channel, content, thread, schedule or attachment payload is rejected without a second message.
- **TC-F17-09** — The same intent cannot be replayed after current channel membership is revoked.
- **TC-F17-10** — Internal request fingerprints are absent from ordinary message reads and action acknowledgements.
- **TC-F17-11** — Retry of a failed in-page send reuses successful upload descriptors and does not upload those files again.
- **TC-F17-12** — Missing or malformed client intent IDs are rejected before creating a user message.

### F18: Edit/delete messages

Owner: W04, W10. Required layers: I,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F18-01** — Author edits within the agreed window and all derived views show the new version.
- **TC-F18-02** — Other-author and expired-window edits are denied at the server.
- **TC-F18-03** — Concurrent stale edit cannot silently overwrite a newer version.
- **TC-F18-04** — Delete produces the agreed tombstone and preserves permitted thread/reference meaning.
- **TC-F18-05** — Pending edit/delete failure reconciles optimistic state without losing edited text.
- **TC-F18-06** — Search, pins, saved previews, notifications and open second tabs invalidate after edit/delete.

### F19: Threads

Owner: W04, W06, W08. Required layers: I,E. State: **DEVELOPER-TESTED SLICE / INDEPENDENT QA NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F19-01** — Reply is stored under the correct accessible root and updates bounded reply count; a published reply refreshes active thread and root timeline caches.
- **TC-F19-02** — Foreign/deleted/invalid parent and wrong-channel root are rejected.
- **TC-F19-03** — Thread pagination stays stable at equal timestamps and deleted reply boundaries.
- **TC-F19-04** — New replies do not force a user reading earlier replies to the bottom.
- **TC-F19-05** — Scheduled replies remain hidden and do not increment public counts before publication.
- **TC-F19-06** — Closing/reopening a thread preserves focus, context and recoverable reply draft on mobile; initial and refresh failures offer retry while retaining cached replies.
- Developer evidence: `src/components/thread-sidebar.test.tsx` verifies a named reply-loading status, retry after an initial query failure, retention of cached replies and retry after a refresh failure, plus exact thread/root invalidation for new published replies. This is component evidence for a narrow slice; pagination, focus/draft/mobile behavior, realtime provider delivery and independent QA remain NOT RUN.

### F20: Emoji reactions

Owner: W06, W10. Required layers: I,C,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F20-01** — Set/unset reaction records one actor/emoji pair and renders correct count.
- **TC-F20-02** — Repeated desired-state requests are idempotent under lost responses.
- **TC-F20-03** — Concurrent reactions by different people never overwrite each other.
- **TC-F20-04** — Unauthorized/deleted-message reaction is denied without leaking actor roster.
- **TC-F20-05** — Reaction picker is keyboard/touch accessible and closes to its trigger.
- **TC-F20-06** — Second-tab edit/delete/reaction events leave timeline and thread counts consistent.

### F21: Mentions

Owner: W04, W11, W13. Required layers: I,C,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F21-01** — Mention picker lists only eligible source-scoped members and inserts stable identity.
- **TC-F21-02** — Forged mention IDs and plain text resembling a mention cannot cause unauthorized notifications.
- **TC-F21-03** — Publication creates one eligible recipient intent despite duplicate mention reasons.
- **TC-F21-04** — Scheduled mention resolves eligibility at publication and never notifies early.
- **TC-F21-05** — Mention query responses finishing out of order cannot restore stale suggestions.
- **TC-F21-06** — IME, arrow keys, Escape and screen-reader labels work without accidental send or focus loss.

### F22: Forwarding

Owner: W12. Required layers: I,E. State: **DEVELOPER-TESTED SLICE / INDEPENDENT QA NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F22-01** — Permitted forward stores safe attribution and intended destination content.
- **TC-F22-02** — Source access is checked even when the client already holds a preview.
- **TC-F22-03** — Destination archive/posting/membership restrictions apply to forward exactly as send.
- **TC-F22-04** — Private-source policy prevents forbidden copying into a broader audience.
- **TC-F22-05** — Repeated submit and interrupted response cannot duplicate the forward.
- **TC-F22-06** — Deleted or changed source before confirmation yields the specified safe result and preserves destination draft.
- **TC-F22-07** — Destination-channel loading, empty, failure and retry states distinguish unavailable data from no eligible destinations and preserve cached choices on refresh failure.
- Developer evidence: `src/components/forward-message-dialog.test.tsx` covers the bounded destination-channel query, loading and empty states, retry after an initial query failure, and keeping a cached destination selectable during a failed refresh. Forward authorization, archive/membership policy, idempotency, source changes and independent QA remain NOT RUN.

### F23: Message permalinks and jump

Owner: W08, W14. Required layers: I,C,E. State: **DEVELOPER-TESTED SLICE / INDEPENDENT QA NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F23-01** — Old root-message permalink loads a bounded context window and highlights the target.
- **TC-F23-02** — Reply permalink opens its correct root/thread context.
- **TC-F23-03** — Deleted/denied/nonexistent targets show safe fallback without stale private excerpt.
- **TC-F23-04** — Legacy and canonical links preserve workspace and message identity.
- **TC-F23-05** — Back/Forward and opening from search/saved/notification restore prior scroll/focus.
- **TC-F23-06** — Target outside loaded history is found without downloading the whole conversation.
- Developer evidence: `tests/integration/message-access.test.ts` verifies an authorized target resolves within a maximum 50-root-message chronological window and a reply returns its parent thread identity; inaccessible, deleted-root, future-scheduled and missing targets return no context. `src/components/message-list.test.tsx` verifies context loading, centered target focus, Return to latest, retry, restoration when the deep-link target clears, and viewport restoration after unmount/remount. `src/components/search-dialog.test.tsx` and `src/components/chat-panel.test.tsx` verify reply routing, no page scroll on result selection, and that Return to latest removes only the message parameter while preserving the thread. These component tests model the navigation state; real browser Back/Forward from search/saved/notification routes, end-to-end thread highlighting, mobile behavior and independent QA remain NOT RUN.

### F24: Channel unread markers/counts

Owner: W05, W06. Required layers: I,E,Q. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F24-01** — Visible focused conversation advances read cursor monotonically for eligible messages.
- **TC-F24-02** — Home preview, background tab and off-screen message do not mark unrelated content read.
- **TC-F24-03** — New message arriving during mark-read leaves the correct unread remainder.
- **TC-F24-04** — Replies, own messages and schedules obey one documented counting policy.
- **TC-F24-05** — Repeated/read events across devices converge without backwards cursor movement.
- **TC-F24-06** — Large workspace unread count uses bounded aggregate work and no cross-channel private labels.

Developer evidence: `batches channel unread counts and counts only unread published root messages` exercises a 50-channel fixture, excludes own messages/replies/future schedules/system/deleted rows and asserts one aggregate query. `marks channel notifications read with a bounded relational update` proves the channel update does not enumerate message IDs and leaves an unrelated private-channel notification unread. Focused integration tests pass; independent QA remains NOT RUN and cursor/multi-tab cases remain open.

### F25: Drafts

Owner: W13. Required layers: C,I,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F25-01** — Draft restores under the same account/workspace/channel/thread key.
- **TC-F25-02** — Navigating between destinations preserves distinct drafts and attachment intents.
- **TC-F25-03** — Send failure retains input; successful confirmed send clears only its submitted draft version.
- **TC-F25-04** — Two-tab edit conflict uses explicit resolution without silently overwriting newer text.
- **TC-F25-05** — Uncertain send remains linked to its original intent rather than replaying as new content.
- **TC-F25-06** — Logout, expiry and opt-in persistence rules prevent private drafts leaking to another account.

### F26: Typing indicators

Owner: W03, W06. Required layers: U,S,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F26-01** — Authorized typing appears only in the selected conversation/thread.
- **TC-F26-02** — Inactivity, blur, leave and disconnect expire the indicator within its defined TTL.
- **TC-F26-03** — Spoofed actor or inaccessible topic event is rejected by actual transport policy.
- **TC-F26-04** — Two devices for one user do not show duplicate or permanently stuck typing.
- **TC-F26-05** — Burst input is bounded/debounced without blocking composition.
- **TC-F26-06** — Reduced motion and assistive copy convey state without announcing every keystroke.

### F27: Reconnect and multi-tab

Owner: W06. Required layers: U,I,S,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F27-01** — Reconnect retrieves missed insert/update/delete events from canonical state.
- **TC-F27-02** — Duplicate and out-of-order events converge without missing or double records.
- **TC-F27-03** — Same-user second tab receives changes made by the first tab.
- **TC-F27-04** — Revocation during disconnect clears inaccessible state before resumed rendering.
- **TC-F27-05** — Unmount/workspace switch cleans old subscriptions and pending callbacks.
- **TC-F27-06** — Visibility changes and connection flapping avoid refresh storms and preserve drafts/scroll.

### F28: Scheduled messages

Owner: W07. Required layers: U,I,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F28-01** — Schedule validates destination, content and intended timezone/instant.
- **TC-F28-02** — No timeline/thread/search/notification/event reveals pending content early.
- **TC-F28-03** — Two workers claiming the same due intent produce one publication and notification set.
- **TC-F28-04** — Cancel, edit, send-now and publish races resolve to one valid terminal outcome.
- **TC-F28-05** — Publisher rechecks membership/posting/archive at delivery and surfaces denied/failed state.
- **TC-F28-06** — Worker crash/retry, past time, DST ambiguity and changed clock preserve stable intent and ordering.

### F29: Attachment upload

Owner: W09. Required layers: I,S,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F29-01** — Authorized upload intent accepts allowed bounded media and finalizes for its intended owner/message.
- **TC-F29-02** — Wrong tenant, object ID, MIME, size or finalization target is rejected.
- **TC-F29-03** — Interrupted/cancelled upload can safely resume or restart without duplicate attachment publication.
- **TC-F29-04** — Failed message send retains usable upload state without exposing orphaned objects.
- **TC-F29-05** — Expired grant, logout and lost membership prevent renewal/finalization.
- **TC-F29-06** — Orphan cleanup and concurrent finalization never delete a committed attachment; server memory remains bounded.

### F30: File/image preview/download

Owner: W09, W17. Required layers: I,S,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F30-01** — Current member previews/downloads a private object with an expiring grant.
- **TC-F30-02** — Expired grant renews only after current-access check.
- **TC-F30-03** — Revoked source prevents further grant renewal and removes private preview state.
- **TC-F30-04** — Unsupported/corrupt media shows safe fallback instead of executing active content.
- **TC-F30-05** — Keyboard/touch close, zoom and download remain usable with focus restoration.
- **TC-F30-06** — Image decode failure, slow network and orientation changes preserve modal bounds and message scroll.

### F31: Search/filter

Owner: W14. Required layers: U,I,C,E,Q. State: **DEVELOPER-TESTED SLICE / INDEPENDENT QA NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F31-01** — Typed filters for people/channel/date/files produce the specified current-access results.
- **TC-F31-02** — Private, future and removed content never appears in results or counts.
- **TC-F31-03** — Malformed syntax/date displays validation instead of silently widening the query.
- **TC-F31-04** — Out-of-order search responses cannot replace results for the latest query.
- **TC-F31-05** — Stable paginated results handle edited/deleted records and old-message jump.
- **TC-F31-06** — Representative indexed query fixtures satisfy agreed latency/scan budgets with correct results.
- **TC-F31-07** — Search rows return only the displayed message fields and author/channel names; attachment, reaction and unrelated profile/channel data are not loaded.
- Developer evidence: `src/lib/search-query.test.ts` covers supported filters, malformed/incomplete and duplicate filters, unsupported `has:`/`is:` values, bad/reversed dates, blank input and the 500-character bound. `tests/integration/message-access.test.ts` proves invalid filters return a validation error with no broadened rows, date-only bounds include the full UTC day, a query/actor/workspace-bound keyset remains usable after its boundary row is deleted and an older match is edited, malformed/cross-query cursors are rejected, the result projection is bounded, the old-context query respects current access/visibility, and `EXPLAIN` can select `messages_content_trgm_idx`. `src/components/search-dialog.test.tsx`, `src/components/chat-panel.test.tsx` and `src/components/message-list.test.tsx` cover validation feedback, latest-query/page races, reply thread routing, bounded context display, return to latest and transient-load retry. Opt-in `npm run test:performance` seeds 100,000 messages, 50 channels and 200 users in a disposable database and records six query shapes, warm p50/p95, an eight-request burst and natural/forced plans; five local runs show variable latency and planner choice. See [W14 measurements](performance.md#w14-fixed-fixture-search-benchmark-25-september-2026). These are synthetic local measurements, not independent QA or a production budget pass. These are partial developer checks for TC-F31-03/04/05/06/07; the feature and route ledger remains NOT RUN pending independent QA. HTML-to-plain-text matching, production cold/short/common/filter/concurrent load, deep-link Back/focus behavior and remaining F31 cases stay open.

### F32: Pins

Owner: W10. Required layers: I,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F32-01** — Pin action associates the message with its actual channel and one consistent pin state.
- **TC-F32-02** — Cross-channel target or unauthorized actor is denied.
- **TC-F32-03** — Retry and concurrent pin/unpin settle to desired state without duplicate relation.
- **TC-F32-04** — Edited pinned message updates previews; deleted source gets agreed tombstone/removal.
- **TC-F32-05** — Lost access clears pinned content from panels and resources.
- **TC-F32-06** — Pin list empty/error/large state remains bounded and keyboard/touch navigable.

### F33: Bookmarks/saved items

Owner: W10. Required layers: I,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F33-01** — Save/unsave is private to the actor and idempotent.
- **TC-F33-02** — Another actor cannot enumerate, read or mutate saved items.
- **TC-F33-03** — Deleted source leaves useful safe metadata according to policy.
- **TC-F33-04** — Revoked source removes content previews even if the personal reference remains.
- **TC-F33-05** — Second tab and failed optimistic mutation reconcile desired saved state.
- **TC-F33-06** — Saved-item jump resolves correct channel/thread context with navigation restoration.

### F34: In-app notifications

Owner: W11. Required layers: I,C,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F34-01** — One eligible publication creates one recipient notification with correct workspace/source.
- **TC-F34-02** — Duplicate worker/event/reaction processing does not duplicate notification intent.
- **TC-F34-03** — Recipient read/unread change updates paged list and badge consistently.
- **TC-F34-04** — Returned error and thrown failure both roll back optimistic read state.
- **TC-F34-05** — Other recipient/tenant record mutation is denied.
- **TC-F34-06** — Deleted/revoked source opens a safe explanation and reveals no stale private excerpt.

Developer evidence: `filters notification access before pagination and reads only one bounded page` verifies inaccessible private-message notifications are filtered before the requested page, visible unread totals span the full accessible set, only one SQL page query runs and returned previews stay in authorized scope. Notification mark-read has a separate bounded relational update regression. Read rollback and recipient privacy have existing component/integration coverage; full notification policy, cross-device behavior and independent QA remain open.

### F35: Email/push delivery

Owner: W39. Required layers: I,S,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F35-01** — Explicitly opted-in recipient receives supported email/push intent once.
- **TC-F35-02** — Muted/quiet-hours/unsubscribed policy is applied at delivery time with documented precedence.
- **TC-F35-03** — Expired device token and provider error are visible, bounded and safely retried.
- **TC-F35-04** — Timeout after provider acceptance does not blindly create duplicate delivery.
- **TC-F35-05** — Lock-screen preview respects user privacy; logout invalidates account-specific device delivery.
- **TC-F35-06** — Notification tap validates current access and opens correct canonical destination on each supported platform.

### F36: Profiles/edit profile

Owner: W13. Required layers: I,C,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F36-01** — Actor updates allowed profile fields and related avatar/name caches.
- **TC-F36-02** — Another account cannot modify profile through direct action.
- **TC-F36-03** — Unsafe avatar URL, invalid timezone and oversized text reject with retained input.
- **TC-F36-04** — Upload failure leaves prior avatar and profile intact.
- **TC-F36-05** — Profile field visibility respects workspace/directory policy.
- **TC-F36-06** — Concurrent profile edits reconcile or report conflict and stay usable on phone keyboard.
- **TC-F36-07** — A member profile opened in another workspace cannot reuse a profile response cached under a different workspace authorization scope.
- Developer evidence: `src/components/profile-sidebar.test.tsx` proves the member-profile Query key includes the authorizing workspace ID. Cross-workspace permission revocation and independent QA remain NOT RUN.

### F37: Hide/unhide users

Owner: W13. Required layers: U,I,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F37-01** — Hide/unhide is reversible and scoped to the requesting account.
- **TC-F37-02** — Hidden content displays consistently across timeline/thread/search under the chosen display policy.
- **TC-F37-03** — Hiding someone never alters source access, notifications policy or membership implicitly.
- **TC-F37-04** — Another actor cannot read or change the user's hidden list.
- **TC-F37-05** — Removed/deleted account entries do not break management UI.
- **TC-F37-06** — Retry, second-tab sync and server failure preserve accurate hidden state.

### F38: Online/away/offline presence

Owner: W06, W13. Required layers: U,S,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F38-01** — Multiple device presence aggregates to the declared online/away/offline state.
- **TC-F38-02** — Disconnected/background device expires and cannot keep user online forever.
- **TC-F38-03** — Explicit status is displayed separately from inferred presence.
- **TC-F38-04** — Unauthorized topic cannot reveal private presence beyond its policy.
- **TC-F38-05** — Out-of-order heartbeat/leave events do not overwrite newer device liveness.
- **TC-F38-06** — Rapid workspace switch cleans old presence and preserves correct current account identity.

### F39: Search keyboard entry and navigation

Owner: W14, W16. Required layers: C,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F39-01** — Command interface opens, filters and navigates using documented shortcuts.
- **TC-F39-02** — Arrow/Enter/Escape interaction restores focus and selects current result.
- **TC-F39-03** — Editor/IME/input shortcuts are not stolen by global handlers.
- **TC-F39-04** — Denied/stale command result is revalidated before navigation.
- **TC-F39-05** — No-results/loading/failure states have accessible labels and useful recovery.
- **TC-F39-06** — Keyboard-only navigation and touch alternative reach the same primary actions.

### F40: Whole-application mobile responsiveness

Owner: W16/W18 plus each feature package. Required layers: C,E,Q,D. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F40-01** — Every enabled route reflows at 320px, phone, tablet and desktop without lost controls.
- **TC-F40-02** — On-screen keyboard/safe areas keep composer, submit and call Leave visible.
- **TC-F40-03** — Touch-only users can reach actions otherwise exposed on hover and have usable target sizes.
- **TC-F40-04** — Text zoom, landscape, long content and locale expansion avoid clipped essential actions.
- **TC-F40-05** — Breakpoint changes preserve draft, selected conversation, focus and scroll.
- **TC-F40-06** — Physical iPhone/Android execution covers permissions, media interruption, keyboard and slow-network recovery beyond emulation.

### F41: Themes/tokens/accessibility

Owner: W16. Required layers: C,E,D. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F41-01** — Light/dark/system preference produces correct semantic tokens and readable states.
- **TC-F41-02** — Focus order, visible focus, labels and keyboard interaction work across enabled components.
- **TC-F41-03** — Contrast and non-color status cues remain adequate for text/icons/errors.
- **TC-F41-04** — Screen reader can understand channel/thread/form/dialog updates without duplicate announcements.
- **TC-F41-05** — Reduced-motion/zoom/text-size preferences survive route changes and never disable content.
- **TC-F41-06** — Dialogs/menus avoid trapped or lost focus, including failure, dismissal and nested state.

### F42: Precision motion

Owner: W17. Required layers: C,E,D. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F42-01** — Every applicable M01–M30 behavior has a visible, precise transition for its enabled feature and lands on the state dictated by server/domain behavior.
- **TC-F42-02** — OS reduced motion removes displacement/stagger while preserving clear state feedback, control discoverability and focus.
- **TC-F42-03** — Rapid open/close/reversal interrupts from the current visual state, cleans timers/tweens and leaves no invisible overlay.
- **TC-F42-04** — Navigation/unmount stops scoped animations and restores focus to a valid target without leaking work into the next route.
- **TC-F42-05** — Incoming messages, unread movement, DM participant changes and history prepend preserve reading position; intentional new-row/avatar feedback does not reorder content under the reader.
- **TC-F42-06** — Representative animations pass measured 60fps/mobile frame and input budgets; animated and reduced-motion visual states are reviewed at normal and slow playback.
- **TC-F42-07** — Shared timing/easing/distance tokens drive existing motion consumers, and reduced-motion overrides remove duration, stagger and travel without removing the resulting state.
- **TC-F42-08** — Enabled shared buttons give a brief 0.98 press response without delaying visible keyboard focus; disabled buttons do not depress, and reduced motion removes the scale change.

### F43: Performance/caching

Owner: W05, W08, W14. Required layers: I,E,Q. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F43-01** — Cold and warm load measurements use the same fixture and separate cache state.
- **TC-F43-02** — Unread/search/history queries meet bounded request/query/page budgets with correct outputs.
- **TC-F43-03** — Actor/workspace cache keys scope profile and channel-member projections; permission invalidation prevents stale private reuse.
- **TC-F43-04** — Heavy editor/media routes load on demand without delaying required interaction.
- **TC-F43-05** — Reconnect/background behavior avoids duplicate refresh and invisible polling amplification.
- **TC-F43-06** — Performance regression fixture reports distribution, errors and before/after; a 10x claim applies only to measured operation.

### F44: Automated quality and release verification

Owner: W01, W18. Required layers: I,E,Q. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F44-01** — Required unit/component/integration/browser suites are discovered and actually execute.
- **TC-F44-02** — An intentionally failing assertion fails CI and blocks readiness.
- **TC-F44-03** — Missing database/provider fixture and empty test discovery cannot report green.
- **TC-F44-04** — Changed-source coverage includes untested owned files and discloses exclusions.
- **TC-F44-05** — Red/green evidence is tied to meaningful behavior and candidate commit; refactors preserve characterization.
- **TC-F44-06** — Flake/retry/quarantine policy cannot hide critical failures, and independent QA remains distinct from developer tests.

### F45: Operations/recovery

Owner: W19. Required layers: I,S,Q. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F45-01** — Documented clean deploy starts app and workers with validated redacted configuration.
- **TC-F45-02** — Compatible migration succeeds on representative data and preserves current access.
- **TC-F45-03** — Backup restore produces usable data and enforces current permissions.
- **TC-F45-04** — Worker crash/restart and duplicated delivery recover without record loss.
- **TC-F45-05** — Rollback disables new actions/jobs while preserving compatible records and denial policies.
- **TC-F45-06** — Error/queue/latency alerts reach the responsible operator with actionable context and no private message/token logging.

### F46: Offline read/outbox sync

Owner: W39. Required layers: U,I,E,D. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F46-01** — Opt-in offline retention exposes only the bounded authorized snapshot with clear freshness.
- **TC-F46-02** — Text outbox keeps a stable mutation ID across restart/reconnect.
- **TC-F46-03** — Reconnect reauthorizes each pending item before sending and does not leak revoked content.
- **TC-F46-04** — Ambiguous prior send checks canonical status instead of creating a second intent.
- **TC-F46-05** — Logout/account switch/local expiry purges scoped data and cancels unauthorized replay.
- **TC-F46-06** — Storage quota, eviction, corrupted entry and connection flapping surface recoverable state without silent data loss.

### F47: Integration/API/bot surface

Owner: W36. Required layers: I,S. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F47-01** — Installed bot/API operation uses the installation's current scoped actor authority.
- **TC-F47-02** — Cross-tenant destination or missing scope denies read/write without partial effect.
- **TC-F47-03** — Revoked installation/secret stops queued and future work.
- **TC-F47-04** — Inbound signature/replay and outbound delivery idempotency contracts pass.
- **TC-F47-05** — Rate/posting/archive restrictions apply to bot actions as they do to the declared role.
- **TC-F47-06** — Audit and error history attribute effects without exposing integration credentials.

### F48: Advanced-feature umbrella, superseded by detailed scope

Owner: W31–W38. Required layers: I,E,S,D. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

This superseded umbrella has no independent dummy test. Trace the detailed F79–F108 cases and their packages, plus the separately allocated earlier expansions F14/F35/F46/F47. Its administrative closure requires evidence that every enabled child contract is covered; it cannot add a fake PASS to case totals.

### F49: Personal workspace Home

Owner: W22. Required layers: I,E,Q. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F49-01** — Home loads bounded authorized summaries and resume destinations.
- **TC-F49-02** — Empty workspace/account state offers valid next action without fake content.
- **TC-F49-03** — One failing summary retains usable remaining sections with localized retry.
- **TC-F49-04** — Home previews do not mark underlying conversations read.
- **TC-F49-05** — Permission/content changes remove stale summaries and private counts.
- **TC-F49-06** — Phone layout, keyboard navigation and resume focus/scroll remain predictable.

### F50: All-unread inbox

Owner: W22. Required layers: I,E. State: **DEVELOPER-TESTED SLICE / INDEPENDENT QA NOT RUN**. The current slice has PostgreSQL coverage for authorized root unread selection/count, first-unread choice, cursor paging and cross-workspace cursor rejection; route/component coverage for deep links, empty state, group avatars, scoped mark-read and action failure; and access-removal coverage. This does not close F50. Large-page behavior, live visibility/read races, live update recovery, full keyboard/screen-reader/mobile acceptance and independent QA remain open. See [phase mapping](delivery-traceability.md) and [testing](testing.md).

- **TC-F50-01** — Unread inbox groups correct accessible conversations and jumps to first unread.
- **TC-F50-02** — Explicit mark-read affects only selected documented scope.
- **TC-F50-03** — Overview viewing or background refresh never clears unrelated unread state.
- **TC-F50-04** — New message racing mark-read remains unread if outside the read boundary. A database regression verifies a later message remains unread after the prior boundary is marked; a truly concurrent live race remains unverified.
- **TC-F50-05** — Removed channel disappears with no leaked count/title.
- **TC-F50-06** — Empty/error/large inbox supports bounded paging and accessible per-row actions. Empty state, 25-row query paging and action failure are covered; error-boundary recovery, large-volume behavior and complete assistive/mobile checks remain open.

### F51: Thread inbox and subscriptions

Owner: W22. Required layers: I,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F51-01** — Follow/unfollow persists one personal thread subscription.
- **TC-F51-02** — New accessible replies update one inbox row and correct unread state.
- **TC-F51-03** — Participation/automatic-follow policy and explicit opt-out follow the declared rule.
- **TC-F51-04** — Removed source or deleted root gives safe fallback without cached private body.
- **TC-F51-05** — Duplicate/reordered events do not duplicate thread entries.
- **TC-F51-06** — Direct jump and Back restore source/root/reply context across phone and desktop.

### F52: Direct-message inbox

Owner: W22, builds on W12. Required layers: I,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F52-01** — DM inbox lists only canonical conversations belonging to current actor.
- **TC-F52-02** — Concurrent creation and incoming first message produce one row.
- **TC-F52-03** — Unrelated private channels never masquerade as DMs.
- **TC-F52-04** — Unread/last activity and peer identity reconcile across devices.
- **TC-F52-05** — Removed/inaccessible conversation clears previews and handles direct links safely.
- **TC-F52-06** — Search/empty/error/phone layout lets the user start or resume the correct DM.

Developer evidence: `loads only the requested DM cursor page before hydrating conversation details` seeds 26 conversations, verifies a stable 25+1 activity cursor, unread filtering before pagination, no duplicates across pages and hydration restricted to page IDs. Independent QA and remaining multi-device, removed-participant and responsive acceptance remain NOT RUN.

### F53: Draft and send center / global compose

Owner: W22, builds on W13. Required layers: C,I,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F53-01** — Global compose selects a valid destination and resumes its corresponding draft.
- **TC-F53-02** — Changing destination cannot accidentally send text/files into the prior conversation.
- **TC-F53-03** — Draft center separates pending/failed/uncertain intents and supports safe continuation.
- **TC-F53-04** — Lost destination access preserves recoverable text without unauthorized publication.
- **TC-F53-05** — Tab conflict and duplicate submit keep one committed intent.
- **TC-F53-06** — Keyboard/touch destination picker, cancel and return preserve originating focus/context.

### F54: Workspace file library

Owner: W24, builds on W09. Required layers: I,E,Q. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F54-01** — File library pages and filters only accessible finalized metadata.
- **TC-F54-02** — Hidden file names, previews, counts and uploader details never leak.
- **TC-F54-03** — Source removal/revocation updates library and detail coherently.
- **TC-F54-04** — Wrong file ID or expired download shows safe retry/denial.
- **TC-F54-05** — Large/empty/error results are bounded and usable on phone.
- **TC-F54-06** — Opening original message resolves current authorized context instead of stale source URL.

### F55: Full search destination

Owner: W24, builds on W14. Required layers: I,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F55-01** — Search URL encodes supported filter state and survives direct load/refresh.
- **TC-F55-02** — Back/Forward restores query, result context and scroll.
- **TC-F55-03** — Malformed/obsolete filter schema presents recoverable validation.
- **TC-F55-04** — Search result lost access before open does not render cached private content.
- **TC-F55-05** — Pagination and result updates remain stable across rapid query changes.
- **TC-F55-06** — Mobile filter controls and keyboard result navigation expose every supported filter.

### F56: Resumable onboarding and workspace chooser

Owner: W21. Required layers: I,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F56-01** — First-run onboarding resumes the last valid step without duplicate work.
- **TC-F56-02** — Invite destination survives sign-in and optional profile/preferences steps.
- **TC-F56-03** — Skipping optional step still yields a usable authorized workspace.
- **TC-F56-04** — Repeated create/join or network retry remains idempotent.
- **TC-F56-05** — Returning user chooses accessible workspace; removed workspace is excluded.
- **TC-F56-06** — Invalid step, interrupted session and phone keyboard show useful recovery without losing permitted input.

### F57: Notification policy, mute and quiet hours

Owner: W23. Required layers: U,I,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F57-01** — Account/workspace/channel settings resolve according to explicit notification precedence.
- **TC-F57-02** — Quiet-hours/DND boundaries work through timezone and DST changes.
- **TC-F57-03** — Mute change before queued delivery suppresses ineligible notification.
- **TC-F57-04** — Expired temporary DND resumes according to current policy.
- **TC-F57-05** — Rejected preference save restores canonical setting and exposes retry.
- **TC-F57-06** — Unsupported email/push capability is truthfully labeled and cannot pretend delivery is enabled.

### F58: Personal appearance/accessibility/composer preferences

Owner: W23. Required layers: U,C,I,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F58-01** — Actor changes appearance/accessibility/composer preferences and sees accurate persisted state.
- **TC-F58-02** — Invalid/unsupported setting is rejected without corrupting other preferences.
- **TC-F58-03** — Server failure rolls back preview and preserves useful edited intent.
- **TC-F58-04** — Account switch does not reuse previous person's theme/composer-private settings incorrectly.
- **TC-F58-05** — OS reduced-motion precedence and explicit Enter-to-send behave as specified.
- **TC-F58-06** — Cross-device updates, locale/date changes and text-density changes preserve accessible layouts.

### F59: Session/device management and revocation

Owner: W23. Required layers: I,S,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F59-01** — Session inventory displays safe device/session metadata for current account.
- **TC-F59-02** — Revoke-one denies that session's next protected request while retaining permitted current session.
- **TC-F59-03** — Revoke-all and logout terminate current realtime/media authority as defined.
- **TC-F59-04** — Old JWT/refresh cannot resurrect revoked session identity.
- **TC-F59-05** — Another user cannot enumerate/revoke sessions by forged ID.
- **TC-F59-06** — Failed revocation is shown as failure; UI cannot claim an active device was disconnected without proof.

### F60: Invitation lifecycle console

Owner: W25, builds on W15. Required layers: I,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F60-01** — Authorized actor creates invitation with bounded role, usage and expiry.
- **TC-F60-02** — Pending/accepted/expired/revoked state is accurate and auditable.
- **TC-F60-03** — Accept/revoke race has one committed outcome and correct usage.
- **TC-F60-04** — Repeated creation/acceptance does not inflate memberships or usage.
- **TC-F60-05** — Invitation copy/rotation controls work with keyboard/touch and safe clipboard feedback.
- **TC-F60-06** — Ordinary/foreign actor cannot inspect invite material or broaden its grant.

### F61: Administrative overview and audit trail

Owner: W25. Required layers: I,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F61-01** — Admin overview composes bounded permitted configuration and pending work.
- **TC-F61-02** — Audit filters/pagination show stable consequential events and outcomes.
- **TC-F61-03** — Ordinary member cannot read admin-only metadata through direct routes/actions.
- **TC-F61-04** — Admin access never implicitly grants private DM/channel content.
- **TC-F61-05** — Failed/concurrent write has accurate audit attribution and status without secrets.
- **TC-F61-06** — Empty/error/mobile audit views retain filter state and accessible inspection.

### F62: Reporting and moderation cases

Owner: W26. Required layers: I,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F62-01** — Report submits once and returns requester-visible receipt.
- **TC-F62-02** — Reviewer sees only the evidence scope authorized for that case.
- **TC-F62-03** — Duplicate submit, deleted message and revoked source produce defined safe state.
- **TC-F62-04** — Moderation action requires current role and records reason/outcome.
- **TC-F62-05** — Appeal/reopen/resolve transitions preserve history and cannot silently erase evidence.
- **TC-F62-06** — Requester cannot inspect another person's report or infer private reviewer material.

### F63: Privacy/data lifecycle and requests

Owner: W26. Required layers: I,S,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F63-01** — Eligible requester exports only permitted personal/workspace data under declared policy.
- **TC-F63-02** — Privilege change during job rechecks access before producing or granting artifact.
- **TC-F63-03** — Expired/revoked download grant cannot be renewed by an ineligible actor.
- **TC-F63-04** — Deactivation/deletion respects ownership, hold and retention safeguards.
- **TC-F63-05** — Retry/cancel/failed export preserves request status and bounded job effects.
- **TC-F63-06** — Last-owner and cross-request ID cases deny without private data or account loss.

### F64: Help, auth-error and connection recovery

Owner: W21. Required layers: C,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F64-01** — Auth failure displays allowlisted reason and safe retry/return path.
- **TC-F64-02** — Connection diagnostics distinguish session, network and live-update failure without tokens/content.
- **TC-F64-03** — Retry after uncertain send checks original intent rather than manufacturing success.
- **TC-F64-04** — Offline/error help remains reachable with keyboard and phone layouts.
- **TC-F64-05** — Help links/shortcut copy match actual enabled behavior and have no dead affordances.
- **TC-F64-06** — Unexpected diagnostic/provider text is escaped and never treated as executable instructions.

### F65: Later triage and personal reminders

Owner: W24 triage, W26 reminders. Required layers: U,I,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F65-01** — Saved item moves through personal pending/completed triage without changing source.
- **TC-F65-02** — Reminder creation uses a valid future instant and explicit timezone.
- **TC-F65-03** — Snooze/cancel/due races resolve one current notification intent.
- **TC-F65-04** — Removed/deleted source suppresses content leak and explains inaccessible target.
- **TC-F65-05** — Duplicate worker/reconnect event does not duplicate reminder.
- **TC-F65-06** — Another actor cannot read/change triage/reminder; phone and keyboard controls remain usable.

### F66: Channel resource collection

Owner: W24. Required layers: I,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F66-01** — Authorized channel resource collection contains ordered permitted links/files/notes.
- **TC-F66-02** — Unsafe external URL and foreign private object injection are rejected.
- **TC-F66-03** — Source revocation updates resource previews and counts.
- **TC-F66-04** — Concurrent reorder/add/remove preserves stable intended order or reports conflict.
- **TC-F66-05** — Deleted source has agreed safe fallback without dangling private preview.
- **TC-F66-06** — Empty/error/large collection and mobile keyboard reorder remain operable.

### F67: Expiring status and availability

Owner: W23. Required layers: U,I,C. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F67-01** — Custom status saves text/emoji and explicit expiry separately from presence.
- **TC-F67-02** — Expiry clears status at the correct instant across device timezones.
- **TC-F67-03** — Invalid/past/unsupported expiry receives useful validation.
- **TC-F67-04** — Concurrent multi-device status edits reconcile according to version policy.
- **TC-F67-05** — Removed account/source visibility prevents status leaking outside allowed audience.
- **TC-F67-06** — Display distinguishes explicit availability from inferred online/away state for assistive technology.

### F68: Route, panel and navigation continuity

Owner: W21. Required layers: I,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F68-01** — Canonical and legacy URL identify the same authorized resource.
- **TC-F68-02** — Reserved/global slug cannot be mistaken for a workspace route.
- **TC-F68-03** — Direct load/refresh opens correct full-page fallback for contextual panel.
- **TC-F68-04** — Back/Forward restores permitted selection, draft, focus and scroll.
- **TC-F68-05** — Account/workspace switch clears stale panel and prevents wrong-tenant navigation.
- **TC-F68-06** — Malformed/nonexistent/wrong-parent parameters deny safely and preserve valid recovery destination.

### F69: Channel polls

Owner: W27. Required layers: U,I,C,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F69-01** — Eligible voter submits one ballot respecting single/multiple-choice rule.
- **TC-F69-02** — Changing ballot obeys open/closed policy with accurate aggregate.
- **TC-F69-03** — Close/vote race commits a valid final state without counting a late vote twice.
- **TC-F69-04** — Foreign option/poll/workspace injection is rejected.
- **TC-F69-05** — Anonymous/hidden-voter policy hides identities in API, UI and exports where specified.
- **TC-F69-06** — Deleted/edited poll, empty results and mobile/keyboard voting have usable truthful states.

### F70: Voice notes

Owner: W28. Required layers: C,I,S,E,D. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F70-01** — Explicit microphone capture records within allowed duration/size and offers preview before send.
- **TC-F70-02** — Permission denial/missing device gives recovery and keeps composer text.
- **TC-F70-03** — Cancel/navigation/unmount stops every capture track and releases resources.
- **TC-F70-04** — Interrupted upload retries private attachment safely without recording or sending twice.
- **TC-F70-05** — Authorized playback supports pause/seek and text alternative/label under specified accessibility contract.
- **TC-F70-06** — Unsupported codec, corrupt audio and source revocation show fallback without public media exposure.

### F71: Custom workspace emoji

Owner: W27. Required layers: I,C,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F71-01** — Authorized administrator uploads allowed static emoji with unique normalized name.
- **TC-F71-02** — Duplicate name and invalid/oversize/unsafe image are rejected.
- **TC-F71-03** — Retirement preserves historical fallback and removes new selection as specified.
- **TC-F71-04** — Cross-workspace asset reference cannot expose private emoji object.
- **TC-F71-05** — Picker/search/reaction integration works with keyboard, touch and reduced motion.
- **TC-F71-06** — Failed upload/rename/delete reconciles catalog without orphaning valid historical references.

### F72: User groups and group mentions

Owner: W29. Required layers: U,I,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F72-01** — Permitted administrator maintains scoped group membership.
- **TC-F72-02** — Group mention expands eligible members at publication under current source access.
- **TC-F72-03** — Scheduled mention handles removed/new group members according to publication-time policy.
- **TC-F72-04** — Duplicate person/group/keyword reasons dedupe recipient notification.
- **TC-F72-05** — Unauthorized group edit, foreign member and fanout over limit are rejected.
- **TC-F72-06** — Group deletion/rename preserves historical display without retaining obsolete grant or alert behavior.

### F73: Channel templates

Owner: W29. Required layers: I,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F73-01** — Fixed template preview accurately shows channel/resources to be created.
- **TC-F73-02** — Create commits valid channel, members and resources atomically.
- **TC-F73-03** — Invalid invitee/name/private resource rolls back whole creation.
- **TC-F73-04** — Repeated submit after lost response returns the original created channel.
- **TC-F73-05** — Template never copies hidden history or grants broader access than the actor can assign.
- **TC-F73-06** — Optional task seeding is gated until task contract exists; failed seeding cannot report full template success.

### F74: Announcement acknowledgements

Owner: W29. Required layers: U,I,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F74-01** — Explicit acknowledge records actor and exact announcement content version.
- **TC-F74-02** — Repeated acknowledgement is idempotent.
- **TC-F74-03** — Edit requiring acknowledgement invalidates prior-version completion visibly.
- **TC-F74-04** — Edit/ack race cannot attach acknowledgement to unseen content version.
- **TC-F74-05** — Removed/ineligible recipient cannot acknowledge or inspect restricted roster.
- **TC-F74-06** — Author/moderator views show only permitted completion metadata and accessible reminder action.

### F75: Tasks from messages

Owner: W30. Required layers: U,I,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F75-01** — Permitted actor creates a task linked to accessible source with valid assignee.
- **TC-F75-02** — Accept/decline/complete/reopen follow declared transition and authority rules.
- **TC-F75-03** — Concurrent versioned changes do not silently overwrite assignment/state.
- **TC-F75-04** — Removed assignee/source produces safe reassignment/fallback without content leak.
- **TC-F75-05** — Due reminder rechecks access and dedupes cancel/reschedule races.
- **TC-F75-06** — Direct task route, filters and mobile form preserve source context and unsaved edits.

### F76: Shared channel notes

Owner: W30. Required layers: I,C,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F76-01** — Authorized explicit save writes a new note version and retains source scope.
- **TC-F76-02** — Stale version save is rejected while preserving local unsaved text.
- **TC-F76-03** — Revision view/restore requires current note access and produces audited new version.
- **TC-F76-04** — Unsafe rich text and external links remain inert.
- **TC-F76-05** — Archive/delete/source removal blocks prohibited mutation and clears derived previews.
- **TC-F76-06** — Phone keyboard, long note, failed save and navigation warning provide safe recovery without implying live coediting.

### F77: Keyword notification rules

Owner: W27. Required layers: U,I,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F77-01** — Normalized keyword rule matches only eligible published source content.
- **TC-F77-02** — Muted/quiet/self-message/deleted rule suppression follows notification policy.
- **TC-F77-03** — Duplicate mention/group/keyword matches create one recipient intent where defined.
- **TC-F77-04** — Scheduled content matches only at publication with current rule/access.
- **TC-F77-05** — Pathological input and excessive rule count remain bounded off send critical path.
- **TC-F77-06** — Rule edit/delete race does not send obsolete private alerts after revocation.

### F78: Saved searches

Owner: W27. Required layers: U,I,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F78-01** — Saved search persists filter intent and reruns with current access.
- **TC-F78-02** — Deleted/inaccessible scope cannot silently widen saved search.
- **TC-F78-03** — Parser version change produces explicit recovery or migrated equivalent semantics.
- **TC-F78-04** — Rename/delete/reorder affects only actor's saved searches.
- **TC-F78-05** — Rapid rerun and stale results do not restore older query state.
- **TC-F78-06** — Empty/error/direct navigation/mobile controls preserve expected filter and result context.

### F79: Voice calls

Owner: W31. Required layers: U,I,S,E,D. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F79-01** — Authorized caller rings intended peers and accept establishes real two-way audio.
- **TC-F79-02** — Two devices accept concurrently; only defined accepted session wins.
- **TC-F79-03** — Decline, timeout, busy, cancel-before-answer and late answer reach correct terminal states.
- **TC-F79-04** — Denied/unplugged mic and network reconnection preserve usable controls and truthful media status.
- **TC-F79-05** — Membership/session revocation actively evicts and rejects token renewal.
- **TC-F79-06** — Leave/end/last participant release tracks and durable history converges despite duplicate callbacks.

### F80: Video calls

Owner: W31. Required layers: C,S,E,D,Q. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F80-01** — Explicit camera enable publishes video only after granted capture and permitted join.
- **TC-F80-02** — Denied/missing/unplugged camera retains audio and clear recovery.
- **TC-F80-03** — Device switching replaces tracks cleanly without accidental double capture.
- **TC-F80-04** — Low bandwidth/subscription limits degrade video while preserving audio and Leave.
- **TC-F80-05** — Background/foreground and orientation changes maintain usable mobile layout.
- **TC-F80-06** — Stop camera, leave, revoke and route teardown end capture and show correct peer state.

### F81: Drop-in huddles

Owner: W31. Required layers: I,S,E,D. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F81-01** — Concurrent huddle start resolves one active source-scoped session.
- **TC-F81-02** — Eligible member joins/leaves without an invite while current source permission holds.
- **TC-F81-03** — Source removal/archive policy rechecks admission and active participation.
- **TC-F81-04** — Last-leave/reconnect grace does not create ghost or duplicate huddles.
- **TC-F81-05** — Duplicate/out-of-order provider callbacks cannot resurrect ended session.
- **TC-F81-06** — Huddle strip follows navigation with accessible join/leave and no lost composer state.

### F82: Screen and application sharing

Owner: W31. Required layers: C,S,E,D. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F82-01** — Explicit user choice starts permitted screen/application track in an active call.
- **TC-F82-02** — Cancelled/denied chooser leaves call alive without claiming sharing.
- **TC-F82-03** — Native track-ended event stops publishing and updates all peers.
- **TC-F82-04** — Presenter revocation or leaving ends screen capture and access immediately.
- **TC-F82-05** — Multiple-presenter policy and rapid start/stop do not leave orphan tracks.
- **TC-F82-06** — Mobile unsupported capture is labeled while permitted viewing and call controls remain usable.

### F83: Persistent voice rooms

Owner: W31. Required layers: U,I,S,E,D. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F83-01** — Persistent room record creates a temporary authorized session generation on join.
- **TC-F83-02** — Join/listen/speak grants are distinct and checked on actual media tokens.
- **TC-F83-03** — Stale callback/token from prior generation cannot affect or enter new session.
- **TC-F83-04** — Concurrent first joins create one active room session.
- **TC-F83-05** — Permission removal/room archive stops admission and actively revokes affected participants.
- **TC-F83-06** — Directory occupancy and mobile room navigation reflect live state without leaking private room metadata.

### F84: Stages and town halls

Owner: W34. Required layers: U,I,S,E,D. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F84-01** — Audience joins stage in listen-only mode and cannot publish arbitrary track.
- **TC-F84-02** — Raise/lower hand is idempotent and moderator queue remains consistent.
- **TC-F84-03** — Invitation to speak requires explicit user acceptance and current publish grant.
- **TC-F84-04** — Moderator removes speaker or member loses role; media publishing ceases.
- **TC-F84-05** — Host departure/reconnect/end follows declared ownership policy without orphan stage.
- **TC-F84-06** — Phone/keyboard/assistive controls distinguish listen, request, invited and speaking states clearly.

### F85: Meeting and event scheduling

Owner: W32. Required layers: U,I,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F85-01** — Authorized organizer creates event with valid title, timezone, audience and end after start.
- **TC-F85-02** — Invalid time/audience/source fails without partial event/reminder rows.
- **TC-F85-03** — Edit/cancel updates one stable occurrence identity and join destination.
- **TC-F85-04** — Removed organizer/attendee policy prevents unauthorized future join.
- **TC-F85-05** — Event detail direct link rechecks current access and displays correct local time.
- **TC-F85-06** — Empty/error/calendar-list/mobile form preserve entered values and clear conflict feedback.

### F86: Recurring meetings

Owner: W32. Required layers: U,I,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F86-01** — Recurrence produces bounded stable occurrence IDs in declared timezone.
- **TC-F86-02** — DST nonexistent and repeated local times follow documented selection policy.
- **TC-F86-03** — Month-end, leap day and termination/count limits produce expected occurrences.
- **TC-F86-04** — Single-occurrence edit/cancel preserves other occurrence identities.
- **TC-F86-05** — Future-series edit separates old/past events and cancels obsolete reminders.
- **TC-F86-06** — Duplicate expansion/job and timezone/rule changes cannot create overlapping duplicate occurrence records.

### F87: Calendar connections and availability

Owner: W32. Required layers: I,S,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F87-01** — Opted-in connection binds correct provider account and permitted calendar scopes.
- **TC-F87-02** — Expired/revoked OAuth connection stops sync and presents reconnection safely.
- **TC-F87-03** — Provider callback replay/cross-account binding and forged state are denied.
- **TC-F87-04** — Incremental sync cursor reset rebuilds bounded state without duplicate events.
- **TC-F87-05** — Bidirectional version mapping avoids echo loops and stale overwrite.
- **TC-F87-06** — Free/busy and external event content respect visibility; disconnect removes future authority without exposing credentials.

### F88: RSVPs and event reminders

Owner: W32. Required layers: U,I,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F88-01** — Eligible attendee RSVP updates one occurrence-specific response.
- **TC-F88-02** — Repeated/concurrent RSVP resolves current state without duplicate notifications.
- **TC-F88-03** — Reminder uses current occurrence version, audience and preferences.
- **TC-F88-04** — Cancel/reschedule racing dispatch suppresses obsolete reminder intent.
- **TC-F88-05** — Removed attendee and expired source receive no private event preview.
- **TC-F88-06** — Timezone/DND/provider retry and notification-tap path preserve correct occurrence and join authorization.

### F89: Call history and missed calls

Owner: W31. Required layers: I,S,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F89-01** — Completed/missed/declined call history records correct source and outcome once.
- **TC-F89-02** — Duplicate/late provider callbacks cannot downgrade a terminal outcome.
- **TC-F89-03** — User sees only allowed participant/outcome metadata.
- **TC-F89-04** — Revoked source hides private title/participants and denies detail access.
- **TC-F89-05** — Call-back creates a new authorized session rather than reviving an ended one.
- **TC-F89-06** — Empty/error/paged history and mobile missed-call action remain accessible.

### F90: Live captions

Owner: W33. Required layers: C,S,E,D. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F90-01** — Caption activation clearly discloses processing and selected supported language.
- **TC-F90-02** — Speaker attribution and partial/final caption updates preserve readable order.
- **TC-F90-03** — Processor failure/lag leaves audio/call controls usable with honest status.
- **TC-F90-04** — Unsupported language and encryption/privacy mode show explicit unavailable state.
- **TC-F90-05** — Captions remain ephemeral unless separately authorized artifact policy applies.
- **TC-F90-06** — Phone/zoom/screen-reader caption layout does not obscure speakers or Leave and handles late join.

### F91: Meeting recordings

Owner: W33. Required layers: U,I,S,E,D. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F91-01** — Capture begins only after every required participant consent is recorded.
- **TC-F91-02** — Late join follows consent gate before that participant is captured.
- **TC-F91-03** — Decline/withdrawal stops or excludes capture according to explicit implemented policy.
- **TC-F91-04** — Duplicate callbacks/partial recorder failure produce truthful artifact state without public object.
- **TC-F91-05** — Playback/download requires current permitted audience and expiring grant.
- **TC-F91-06** — Deletion/retention/hold and source revocation propagate to recording, previews and derived artifacts.

### F92: Transcripts, summaries and action items

Owner: W33. Required layers: U,I,S,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F92-01** — Transcript preserves source, speaker/time provenance and correction lineage.
- **TC-F92-02** — Summary links to permitted evidence and represents uncertainty without invented confirmed action.
- **TC-F92-03** — Task suggestion requires explicit authorized confirmation and dedupes repeated confirmation.
- **TC-F92-04** — Embedded hostile transcript instructions cannot execute tools or override system/data policy.
- **TC-F92-05** — Source correction/deletion/revocation invalidates stale transcript/summary/search projections.
- **TC-F92-06** — Processor timeout, unsupported language and partial artifact provide useful retry/status without broadening audience.

### F93: Forum and Q&A channels

Owner: W34. Required layers: I,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F93-01** — Permitted forum topic/reply/tag operations retain conversation source access.
- **TC-F93-02** — Accepted answer belongs to the same eligible topic and authorized selection policy.
- **TC-F93-03** — Deleted answer/closed topic has defined status and no dangling success state.
- **TC-F93-04** — Close/reply race commits only permitted state.
- **TC-F93-05** — Private topic content never appears in search/counts to outsider.
- **TC-F93-06** — Paged/mobile/keyboard topic list, filter and direct answer jump preserve context.

### F94: Channel categories and custom sidebar sections

Owner: W34. Required layers: C,I,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F94-01** — Permitted category and personal section ordering persist with stable identities.
- **TC-F94-02** — Personal ordering does not mutate workspace-wide category state.
- **TC-F94-03** — Cross-device reorder conflict resolves without losing channels.
- **TC-F94-04** — Removed/inaccessible channel disappears without private title/count leakage.
- **TC-F94-05** — Keyboard move controls provide equivalent result to drag interaction.
- **TC-F94-06** — Empty/long/collapsed mobile navigation keeps selected conversation discoverable.

### F95: Custom roles and channel overrides

Owner: W34. Required layers: U,I,S,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F95-01** — Effective capabilities follow documented role/override/explicit-deny precedence.
- **TC-F95-02** — Role administrator cannot grant capability beyond own allowed grant set or self-escalate.
- **TC-F95-03** — Multiple roles and inherited channel overrides produce exhaustive policy-table outcomes.
- **TC-F95-04** — Migration from existing roles preserves required denial and ownership.
- **TC-F95-05** — Role change revokes open media/transport/file operations as well as future requests.
- **TC-F95-06** — Last-owner/guest/bot/shared-channel combinations pass real server and service enforcement tests.

### F96: Scoped guest access

Owner: W35. Required layers: I,S,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F96-01** — Sponsored guest sees only explicitly scoped channels/resources.
- **TC-F96-02** — Guest cannot discover unrelated directory/search/count/mention/profile information.
- **TC-F96-03** — Expiry while connected stops requests, media and grant renewal.
- **TC-F96-04** — Sponsor removal or scope reduction re-evaluates guest authority immediately.
- **TC-F96-05** — Invitation resend/retry cannot create broader or indefinite guest grant.
- **TC-F96-06** — Guest UX explains denied/expired access and preserves safe account exit without leaking source names.

### F97: Cross-workspace shared channels

Owner: W35. Required layers: I,S,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F97-01** — Bilateral agreement activates only the intended shared channel and capability intersection.
- **TC-F97-02** — One side cannot invite/grant/export beyond the other's accepted rules.
- **TC-F97-03** — Disconnect or policy change racing send/upload/call yields defined authorized outcome.
- **TC-F97-04** — Search, notifications, files, notes/tasks and recordings apply shared audience consistently.
- **TC-F97-05** — Retention/export/ownership after disconnect follow recorded agreement with preserved audit.
- **TC-F97-06** — Two workspaces with asymmetric roles and simultaneous changes never widen authority through stale cache or queued work.

### F98: Community onboarding and member screening

Owner: W34. Required layers: I,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F98-01** — New community member acknowledges current rules and required screening before access.
- **TC-F98-02** — Rejected/pending application receives safe state without channel content.
- **TC-F98-03** — Replay of prior rules version cannot bypass renewed acceptance policy.
- **TC-F98-04** — Invitation burst/duplicate application is bounded and idempotent.
- **TC-F98-05** — Moderator approval/revoke race creates one valid membership result.
- **TC-F98-06** — Accessible phone/keyboard onboarding preserves input and makes approval requirements clear.

### F99: Automated moderation and anti-raid controls

Owner: W34. Required layers: U,I,S,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F99-01** — Enabled rule evaluates content before publication and derived notifications.
- **TC-F99-02** — Edit/forward/bot/import policies prevent bypass through alternate permitted paths.
- **TC-F99-03** — Required engine failure follows declared fail-closed/review policy with truthful retry.
- **TC-F99-04** — False positive has bounded appeal/reviewer evidence without unrelated private access.
- **TC-F99-05** — Raid thresholds apply consistently across concurrent actors and windows.
- **TC-F99-06** — Rule update/replay and moderation audit preserve accountable outcome without logging prohibited private content.

### F100: Slow mode and channel lockdown

Owner: W34. Required layers: U,I,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F100-01** — Server enforces cooldown for eligible new publication under slow mode.
- **TC-F100-02** — Multi-tab/concurrent request cannot bypass atomic cooldown.
- **TC-F100-03** — Retry of already accepted intent is not charged as a second new send.
- **TC-F100-04** — Lockdown applies to roots/replies/forwards/bots/schedules/offline replay under declared policy.
- **TC-F100-05** — Expiry/unlock/role-exemption race uses current effective rule.
- **TC-F100-06** — UI accurately shows cooldown/denial and preserves text with keyboard/touch accessible recovery.

### F101: Workflow automations

Owner: W36. Required layers: U,I,S,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F101-01** — Versioned workflow runs permitted bounded trigger/condition/action chain.
- **TC-F101-02** — Duplicate trigger results in one execution intent and idempotent supported effects.
- **TC-F101-03** — Loop/fanout/time limits stop runaway work with visible outcome.
- **TC-F101-04** — Scope/role/installation revoked while waiting prevents unauthorized later step.
- **TC-F101-05** — Timeout after external effect records uncertainty and avoids unsafe automatic duplicate.
- **TC-F101-06** — Cancel/retry/partial success preserves step history, secrets redaction and current authority checks.

### F102: App directory and installation management

Owner: W36. Required layers: I,S,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F102-01** — Curated app detail shows accurate scopes, provider and installation state.
- **TC-F102-02** — Only authorized installer approves the selected scoped installation.
- **TC-F102-03** — Missing/admin-forbidden scope rejects installation without partial access.
- **TC-F102-04** — Revoke/rotate disconnects future and queued access and records outcome.
- **TC-F102-05** — App config direct route cannot reveal another workspace installation secrets.
- **TC-F102-06** — Failed connect/reconnect and mobile form states are truthful and recoverable.

### F103: Slash commands and webhooks

Owner: W36. Required layers: I,S. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F103-01** — Signed inbound webhook validates signature, timestamp, tenant and installation.
- **TC-F103-02** — Replay, malformed body, stale timestamp and wrong secret reject before effects.
- **TC-F103-03** — Slash command checks current actor/source permissions and gives bounded response.
- **TC-F103-04** — Outbound destination rejects forbidden address/redirect/DNS-rebinding test cases.
- **TC-F103-05** — Retries use event identity and bounded backoff; uncertain effect is visible.
- **TC-F103-06** — Rate/body limits and secret rotation preserve service availability and audit attribution.

### F104: Workspace import and migration

Owner: W37. Required layers: I,S,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F104-01** — Dry-run validates declared format, provenance and identity/channel mapping without content writes.
- **TC-F104-02** — Malformed/oversize/archive-path attack input is rejected or quarantined safely.
- **TC-F104-03** — Resumable import dedupes objects after interruption using stable provenance.
- **TC-F104-04** — Unmapped/ambiguous users never gain unauthorized identity or ownership.
- **TC-F104-05** — Historical content creates no live mention/push/workflow fanout unless explicitly allowed.
- **TC-F104-06** — Partial failure/recovery preserves prior valid data and current access; rollback does not delete unrelated user work.

### F105: Enterprise sign-in and provisioning

Owner: W37. Required layers: I,S,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F105-01** — Selected SSO integration binds correct issuer/tenant/subject to intended account.
- **TC-F105-02** — Wrong issuer/audience, replay and unintended account-link attempt fail.
- **TC-F105-03** — SCIM create/update/deactivate is idempotent and scoped to correct tenant.
- **TC-F105-04** — Deactivation revokes sessions/media and queued privileges promptly.
- **TC-F105-05** — Last-owner/break-glass recovery follows explicit audited policy.
- **TC-F105-06** — Provider outage/metadata change and expired provisioning credential produce useful safe failure without fallback bypass.

### F106: Mobile and desktop clients

Owner: W38. Required layers: I,S,E,D. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F106-01** — Signed supported client authenticates, opens canonical deep links and preserves source authorization.
- **TC-F106-02** — Push from closed/background client opens correct account/destination after current-access check.
- **TC-F106-03** — OS suspension/resume and device transfer reconcile drafts/outbox/call state.
- **TC-F106-04** — Mic/camera/notification permission denial or later revoke leaves usable fallback.
- **TC-F106-05** — Logout clears scoped credentials/cache; old token cannot recover access.
- **TC-F106-06** — Interrupted update, unsupported version and offline startup provide safe recovery on actual target devices.

### F107: Localization and optional message translation

Owner: W38. Required layers: U,C,I,S,E,D. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F107-01** — Chosen locales render full UI with correct plural/date/number/timezone semantics.
- **TC-F107-02** — RTL and expanded text preserve navigation, icons where directional and input readability.
- **TC-F107-03** — User explicitly requests translation and original source remains accessible and identified.
- **TC-F107-04** — Translation uses permitted processor/source audience and is cached by source version/language.
- **TC-F107-05** — Source edit/delete/revocation invalidates translated derivatives.
- **TC-F107-06** — Unsupported language/provider failure falls back to original without mislabeling success or losing composer text.

### F108: Advanced retention and legal-hold administration

Owner: W37. Required layers: I,S,E. State: **PLANNED / NOT RUN**. See [phase mapping](delivery-traceability.md).

- **TC-F108-01** — Authorized policy/hold change is scoped, versioned and audited.
- **TC-F108-02** — Active hold prevents deletion of eligible content and required derivatives.
- **TC-F108-03** — Hold/delete/expiry race has one safe transactional outcome.
- **TC-F108-04** — Hold/reviewer role never implicitly grants unrelated content-read authority.
- **TC-F108-05** — Recording/transcript/export/search/object cleanup follows policy and current hold state.
- **TC-F108-06** — Backup restore/reviewer expiry/policy rollback preserves retained records and blocks forbidden disclosure or deletion.

## Route case recipe for R01–R78

The [route execution mapping](delivery-traceability.md#route-delivery-and-verification) lists all 78 routes and their first target phase; [routes](routes.md) specifies each route's access and parameters. For every enabled route instantiate `RC-Rnn-01…10` below with actual values and expected copy/destination. These are recipes, not 780 executed tests. Conditional routes stay unimplemented/OUT OF SCOPE only with a recorded decision; do not manufacture a placeholder page to pass a test.

1. Authorized direct load and refresh resolve the same resource and correct canonical URL.
2. Anonymous/expired session follows the specified public or protected path and safe return behavior.
3. Wrong-role/tenant/parent and removed access deny without source metadata or cached content.
4. Malformed/nonexistent/deleted parameters yield defined validation/not-found/fallback without crash.
5. Empty/loading/populated/partial/error states have truthful usable UI and bounded retry.
6. Primary action persists its intended result; rejected or ambiguous action preserves input and truthful state.
7. Back/Forward, legacy link, modal/panel close and account/workspace switch preserve valid focus/scroll/draft.
8. Keyboard/screen-reader/zoom/reduced-motion checks verify real operability and labels.
9. Phone/tablet/landscape/keyboard-open states pass applicable MR criteria and device checks.
10. Cache/realtime update and relevant performance budgets pass without private stale state or duplicate work.

Parameterized sections/steps must enumerate supported values, not just the parent pattern: onboarding profile/workspace/preferences/finish; account appearance/accessibility/composer/language; channel details about/members/resources/settings; each resource type and parent relationship. New routes or operation variants are added to inventory before implementation and receive the same recipe.

## Cross-domain regression scenarios

These integration scenarios supplement the ten journeys already in [QA checklist](qa-checklist.md). All are **PLANNED / NOT RUN** and exercise shared failure boundaries that per-feature happy paths can miss.

| ID | Scenario and expected end-to-end outcome |
|---|---|
| X01 | Revoke member with channel, thread, search, saved preview, file viewer and call open: all future reads/grants/media access stop, cached private content is cleared and navigation remains usable |
| X02 | Schedule message mentioning person/group/keyword with attachment, then change membership/mute/archive before due time: publication-time policy decides one outcome and no early or ineligible notification leaks |
| X03 | Lose send acknowledgement, go offline, reopen on another device, reconnect and receive duplicate events: one intent/message, coherent pending state, unread and notification counts |
| X04 | Edit/delete a source used by pins, saved items, search, task, note, forward and notification: each derivative follows its explicit snapshot/reference policy and never gains access |
| X05 | Cancel/reschedule recurring meeting while calendar sync and reminder dispatch run: stable occurrences, no echo loop/obsolete reminder, current join admission |
| X06 | Guest expires during shared-channel call with screen share and recording: active media authority removed, required capture/consent behavior enforced and artifact audience remains scoped |
| X07 | Apply retention hold while recording/transcript cleanup/export jobs run: protected artifacts preserved, unrelated data follows policy and reviewer gains no implicit read authority |
| X08 | Revoke integration while workflow step waits after uncertain external result: no new unauthorized effect, uncertainty remains visible and retry cannot duplicate non-idempotent action |
| X09 | Import historical messages with mentions, attachments, threads and unknown users: bounded resumable mapping, no live notification/workflow fanout and no accidental identity/ownership grant |
| X10 | SCIM deactivates user with offline outbox, push token and active call: sessions/media/queued effects revoked and resume purges content before replay |
| X11 | Break network during upload, submit template/task/note and then change mobile orientation: no partial duplicate entities, preserved edits, usable retry and correct private object cleanup |
| X12 | Switch accounts from a push/deep link with another account's draft and cached search: correct account selection, no wrong-tenant content or unintended send |
| X13 | Role/slow-mode/moderation policy changes during bot send, scheduled publish and offline replay: shared posting authority wins; retries are not charged as new accepted actions |
| X14 | Two people vote/acknowledge/save an edited announcement/poll at closure: versioned results and notifications agree; no stale acknowledgement presented as current |
| X15 | Restore backup and replay jobs/provider callbacks against newer policy state: deduplication, session revocation, holds and source access remain effective |
| X16 | Screen-reader user with reduced motion and enlarged text navigates thread, task, meeting and call while disconnected: essential feedback, focus and Leave/retry actions remain available |
| X17 | Rapid workspace changes with many channels/history and active media: no old subscriptions, redundant route refresh, leaked identity or unbounded editor/media/render memory |
| X18 | Translation/summary processor receives hostile content then source is deleted: no instructions executed, derived state invalidated and no unauthorized task/integration effect |
| X19 | Feature flag rollback during in-flight job/mutation and mixed old/new clients: compatible reads, current denial, no lost records or silently re-enabled unsafe endpoint |
| X20 | Exhaust provider quota or hit database/storage limit during a normal workday: bounded backoff, visible degraded capability, preserved messages/drafts and actionable redacted alerts |

## Required evidence before closure

Store exact case ID and assertion/data variants, F/R/W/MR mapping, actor/fixture/environment, reproduction steps, expected and observed values, actual test path/command, red and green commits, candidate build/schema/config/flags, browser/device/provider, coverage diff, sanitized artifacts and independent QA executor/verdict. Record defects and retest impact. The [QA ledger](qa-checklist.md) is still NOT RUN; these documents do not run the cases.

A new defect adds a regression first, even if it falls outside the initial six feature scenarios. A new route, operation, provider, role, data state or platform updates the case/traceability inventory. This is how scope remains complete as the system evolves; literal certainty about every possible failure is not a defensible release claim.
