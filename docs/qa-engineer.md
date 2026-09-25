# Dedicated QA engineer and independent feature verification

[Index](README.md) · [QA checklist](qa-checklist.md) · [Feature catalogue](features.md) · [TDD](tdd.md) · [Requirement test matrix](test-matrix.md) · [Testing](testing.md) · [Implementation](implementation.md) · [Timeline](timeline.md)

## Role added to the delivery plan

**A dedicated QA engineer owns independent verification of every feature and every enabled route.** Development completion is a handoff to QA, not a claim that the feature works. QA verifies expected behavior, finds failures, reproduces defects, checks fixes and verifies that related functionality still works. This responsibility covers all 90 catalogue capabilities, all 108 requirements, all 78 route patterns and applicable MR01–MR14 mobile criteria.

This document adds the role, workflow, checklist and release gate. It does not hire a person, start an autonomous QA process or report a completed application audit. The execution owner must be assigned at implementation kickoff. An independent human QA engineer or separately assigned QA agent can perform executable checks; actual device, accessibility and provider checks still require the relevant environment and hardware. If that evidence cannot be obtained, the affected result is BLOCKED, not passed.

The [QA checklist](qa-checklist.md) starts with every feature and route **NOT RUN**. Existing source inspection, developer tests and a logged-out visual check do not automatically become independent feature passes. No feature is certified by the creation of this plan.

## Responsibility and independence

| Responsibility | Development engineer | QA engineer | Product/release owner |
|---|---|---|---|
| Expected behavior | Implement documented contract; identify ambiguity | Review examples, roles, edge cases and testability before coding | Resolve material product ambiguity |
| TDD | Write intended red tests, implement, refactor and run suites | Review coverage gaps; add independent acceptance/adversarial cases | Keep scope compatible with required quality gates |
| Candidate handoff | Supply exact build, migrations/config, fixtures, flags and test evidence | Verify readiness and reproduce results independently | Ensure test resources and ownership exist |
| Defects | Diagnose; add failing regression before permanent fix; provide new build | Reproduce, classify, preserve evidence, retest and reopen when needed | Prioritize and decide any explicit scope removal |
| Regression | Maintain unit/integration tests and fix regressions | Run affected plus cross-feature checks against the integrated candidate | Do not equate a feature demo with release approval |
| Release | Provide deployable artifact and recovery instructions | Publish evidence-based GO / NO-GO for exact enabled scope | Own deployment decision within the recorded quality gates |

The author of a production change cannot be its sole QA sign-off. A QA engineer may write tests and fixtures; if they also modify the production behavior, a different reviewer verifies that changed behavior. When only one developer is available, independent review remains explicitly outstanding until a separate reviewer/QA execution is assigned. Developer self-checks remain valuable and visible, but are labelled as such.

QA uses the acceptance documents as the expected-result authority, not the current implementation or a developer's demo. If the app and spec disagree, record the mismatch and its impact. Do not silently change expected behavior to make a test pass. Resolve genuinely ambiguous requirements before giving that case a passing verdict.

## Work starts before implementation

QA participates when each W package is selected: review its F requirements and R routes, identify missing examples, choose the relevant role/device/network matrix, and define user-facing acceptance cases before implementation. Developers still own test-first implementation under [TDD](tdd.md); QA does not replace that responsibility or wait until every screen is finished.

For each feature, QA prepares:

- A complete user journey with explicit expected result and durable outcome.
- Roles and visibility boundaries, including anonymous, ordinary, privileged, guest, removed and wrong-workspace actors as applicable.
- Empty/loading/populated, denied, invalid input, failure/retry and stale/conflict cases.
- Applicable device/viewport, keyboard/touch, accessibility and reduced-motion cases.
- Data/realtime/job/provider effects and the adjacent features most likely to regress.
- Required isolated fixtures, provider sandbox access, physical devices and evidence artifacts.

Use the [108-requirement test matrix](test-matrix.md), [655 concrete cases](acceptance-cases.md) and [phase traceability](delivery-traceability.md) as the starting coverage map; do not treat one happy-path case as full feature verification. The [90-feature checklist](qa-checklist.md) supplies the user-facing completion view and separate route inventory.

## Ready for QA handoff

Development supplies an exact commit and build identifier, test environment URL/config revision, enabled feature flags, relevant F/R/W IDs, migrations, synthetic fixture accounts, expected outcomes and known limitations. Include actual CI run links/results, red/green evidence, coverage/exclusion changes, relevant provider sandbox state and rollback notes. Never put passwords, tokens or private content into committed handoff documents.

QA first confirms the candidate deploys and its required services are healthy in an isolated environment. Missing setup is a named blocker with owner and next action, not an application pass. If development declares a feature ready while core acceptance is absent, QA rejects the handoff with a concrete defect or missing-contract report. Unimplemented roadmap features stay NOT RUN until a release deliberately marks them OUT OF SCOPE.

## Verification procedure for every feature

1. **Establish the baseline.** Record build/config/schema/flags, fixture identities, browser/device and source requirement. Confirm expected result without assuming the existing UI is correct.
2. **Perform the real user journey.** Sign in, navigate or deep-link, perform the action, verify the visible result and durable side effects. For messaging, check the recipient; for scheduling, observe publication; for calls, verify two participants and media; for exports, validate permitted contents.
3. **Check every applicable state.** Empty/loading, invalid inputs, denied access, failed dependency, retry, cancellation, duplicate action, concurrency, stale data and revocation must match the documented behavior.
4. **Check the boundaries independently.** Inspect actual server responses, transport payloads, storage grants and database/job results where relevant. A hidden button or a mocked success response cannot prove authorization or correct persistence.
5. **Check mobile and accessibility.** Apply MR01–MR14 on the promised phone/tablet/browser matrix. Verify touch actions, real keyboard interaction, orientation, focus, screen-reader usability and calls rather than only a resized screenshot.
6. **Run regression around the change.** Review the changed domains and dependent surfaces, run affected automated suites and repeat high-risk journeys on the integrated build. Confirm data remains correct after reload/reconnect/account switch.
7. **Record the verdict.** Link actual evidence, defects and tested configuration. PASS requires all mandatory cases and relevant routes to pass, not a developer assertion or a single attractive screenshot.

QA also performs exploratory sessions around realistic sequences: edit while another user reacts; receive a call during a draft; change channel access while a file is open; reschedule a meeting as reminders claim work; switch accounts after a failed upload. These complement scripted checks and produce reproducible regression cases for developers.

## Required verification gates

| Gate | Required QA evidence | Stop condition |
|---|---|---|
| QG01 Scope and readiness | Feature/requirement/route map, exact candidate and usable isolated fixture | Unassigned owner, ambiguous mandatory behavior or unavailable environment |
| QG02 Expected behavior | Completed end-to-end workflow and durable outcome for each enabled feature | Missing operation, incorrect result, placeholder or misleading success |
| QG03 Permissions and privacy | Negative identities, revoked access and no forbidden response/event/file leakage | Tenant/source disclosure, privilege bypass or stale grant after revocation |
| QG04 Failure and integrity | Retry/cancel/concurrency/network/provider recovery without lost or duplicate intent | Data loss, duplicate publication, broken retry or unsafe partial state |
| QG05 Mobile and accessibility | Applicable MR/device/keyboard/touch/focus/assistive evidence | Essential action unreachable, lost input, blocking reflow/focus issue |
| QG06 Regression and quality | Relevant CI suites, reviewed coverage, affected journeys and visual states | Reproducible regression, missing required tests or unresolved critical flake |
| QG07 Performance and operations | Fixed-fixture budgets, resource cleanup and applicable migration/restore/provider checks | Blocking budget regression, unverified destructive migration or failed recovery |
| QG08 Candidate sign-off | All enabled feature/route verdicts, closed required defects and current evidence | Any enabled item FAIL/BLOCKED/NOT RUN or stale acceptance evidence |

QG01–QG08 apply to a feature where relevant and again to its release candidate. A full-product claim requires all 90 capabilities and their supporting requirements to be verified. An intermediate release can contain a smaller explicitly enabled scope, with the rest listed as OUT OF SCOPE and inaccessible through unintended routes/actions/transports. Do not count OUT OF SCOPE or BLOCKED as passed.

## Verdicts and evidence freshness

| Status | Meaning | Exit |
|---|---|---|
| NOT RUN | No independent execution for this candidate | Assigned QA begins with a usable handoff |
| IN PROGRESS | Some cases run; required coverage incomplete | Complete remaining cases or identify failure/blocker |
| PASS | Required cases passed on the recorded build/config and supported scope | Reassess on a relevant change; retain original run history |
| FAIL | Observed behavior violates required acceptance | Developer fixes; QA retests the defect and affected regression |
| BLOCKED | A prerequisite prevents verification | Named owner resolves environment/account/device/spec dependency |
| OUT OF SCOPE | Explicitly excluded from this particular release | Product scope record plus verified gating; never a full-product pass |

Each run identifies commit/artifact, schema/config/flag versions, fixtures, device/browser/OS, test cases, expected/actual, evidence, executor and defects. A later build does not inherit PASS automatically. QA performs impact analysis and reruns affected cases; any carried-forward evidence is explicitly tied to unchanged artifacts/contracts and a reviewed reason. Shared authorization/schema/session/media changes trigger broad regression rather than narrow page-only checks. The integrated release candidate always runs the required full enabled-scope suite.

CI may update automated run evidence, but cannot self-approve independent QA or infer that an unrun manual/device case passed. Test retries retain the original failure and flake disposition under [TDD policy](tdd.md). Maintain run history instead of overwriting a failing run with a later success and losing the original defect.

## Defect triage and fix verification

Severity describes impact; priority describes scheduling. Suggested severity scale:

| Severity | Examples | Release treatment |
|---|---|---|
| Critical | Tenant disclosure, credential leak, destructive loss, unauthorized recording | NO-GO; contain/gate affected behavior and verify repair |
| High | Cannot sign in/send/join/leave, broken permissions, duplicate publication, mobile core blocked | NO-GO for affected enabled scope; fix or fully remove that scope |
| Medium | Required secondary flow fails or state is incorrect with a workaround | Feature remains FAIL if acceptance is violated; repair before claiming completion |
| Low | Cosmetic issue with no acceptance/accessibility/functionality violation | Track visibly; QA may pass unaffected required cases with the linked known issue |

Defect lifecycle: reported → reproduced/triaged → in fix → ready for retest → verified closed, or reopened. “Cannot reproduce” requires attempted environment/steps and remaining uncertainty; it is not an automatic closure. One defect record can link multiple failed checklist items. QA verifies the original reproduction, new automated regression, adjacent flows and same mobile/provider conditions on the fixed build.

Required defect fields: identifier, title, severity/priority, F/R/W IDs, environment/build, preconditions, minimal steps, expected/actual, frequency, redacted evidence, impacted data/access, developer owner, regression case, fixed build, QA retest and closure. A developer marks ready for retest; QA closes. Accepted scope changes update requirements explicitly and cannot be disguised as a passing fix.

## Reports and release decision

After each QA run, publish counts of PASS/FAIL/BLOCKED/NOT RUN/OUT OF SCOPE for features and routes separately. Include enabled-scope denominator, outstanding high-impact defects, device/provider coverage, new regressions, resolved fixes and the next named action. Do not combine 90 features and 78 routes into a misleading completion percentage or infer readiness from code coverage alone.

Release sign-off records:

```text
Candidate: exact build/commit, schema/config/flags
QA executor: assigned person/agent identity and review independence
Scope: enabled feature IDs, supporting requirements and routes
Results: per-status counts; linked checklist run and automated suites
Devices/providers: actual versions/environments and remaining limitations
Defects: required fixes closed; known non-blocking issues linked
Recovery: applicable migration/rollback/restore evidence
Verdict: GO or NO-GO, with specific reasons
Release owner: deployment decision recorded separately
```

A QA GO is evidence for that tested candidate and declared scope, not permission to deploy or a guarantee about untested future changes. Deployment follows the existing release workflow. A NO-GO includes a concrete recovery path, not merely “needs more testing.”

## Staffing, schedule and handoff

Plan for a dedicated QA role from W01 onward: acceptance review and fixture design during setup, independent feature verification as slices arrive, retests immediately after fixes, and integrated candidate sign-off before release. Development remains responsible for TDD and feature tests; QA owns independent acceptance and regression completeness. W18 owns shared test infrastructure and orchestration with QA input, not a replacement for an independent reviewer.

The engineer-day estimates in [timeline](timeline.md) remain development/shared-test estimates and do not silently include a newly staffed full-time QA engineer. Budget QA effort separately using case preparation, execution/device/provider runs, motion/reduced-motion review, defect reproduction, fix retest and regression/sign-off. The [phase plan](delivery-plan.md#capacity-and-relative-timeline) supplies a provisional 65–124 independent QA-day allowance, including a 4–8-day final closeout reserve. Measure the first complete messaging slice to replace this allowance with observed throughput and defect/retest effort. Do not divide developer duration by two merely because QA joins the team.

Use the same milestones with two tracks: developers supply tested slices; QA reviews cases ahead of them and verifies ready builds. Start with a maximum of two implementation packages awaiting QA as a planning limit, then adjust to measured throughput. If the queue grows or blockers persist, focus on finishing/retesting instead of declaring more unverified features complete. Critical media/security fixes jump the queue with affected regression preserved.

For the one-day candidate, QA checks the explicitly enabled slice and records the rest as unrun/out of scope. If there is no independent QA execution or required device/provider evidence, report an internal candidate without QA sign-off. Never promise that all 90 features were verified in that timebox.
