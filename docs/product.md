# Product specification

[Index](README.md) · [Feature register](features.md) · [Design](design.md) · [Timeline](timeline.md)

## Register

**Product**: an authenticated communication application that serves repeated work. The interface should recede behind reading, composing, finding, and responding.

## Confirmed direction

A dedicated QA engineer must independently verify every feature, check expected behavior and regression impact, and retest fixes. [QA ownership](qa-engineer.md) and the [execution checklist](qa-checklist.md) add this completion gate alongside TDD. Developer completion is not QA approval; no feature is declared working without its actual required evidence. The role is documented now and assigned for execution during implementation.

The entire application must be developed with TDD, with tests throughout every layer. [TDD strategy](tdd.md) and the [requirement test matrix](test-matrix.md) are mandatory implementation contracts. Feature delivery includes automated behavior, negative/failure, integration and applicable mobile/provider evidence; testing is not a later phase. The original assessment was documentation-only; the authorized follow-up is implementing the scoped slices in [delivery-plan](delivery-plan.md) while keeping the unimplemented catalogue explicitly planned.

The full application must be highly mobile responsive. This is a required quality bar across all 90 capabilities as enabled, not a separate optional feature or a promise deferred to native clients. [Mobile responsiveness](mobile-responsive.md) defines measurable phone/tablet behavior and release evidence. Mobile users must be able to complete ordinary member and authorized administrator workflows with equivalent data and access rules.

The user requested an animation-rich interface across the product, with the fine timing, spatial continuity and interaction detail associated with Emil Kowalski's work. Motion is a first-class part of the design system: feature states, transitions, feedback, media and navigation should feel deliberate and polished. Animations must remain fast, interruptible, mobile-smooth, accessible under reduced-motion preferences and subordinate to immediate input, data and focus behavior. The one-day target remains a restricted milestone; the complete motion system is specified in [animation.md](animation.md).

## Purpose and users

The [90-feature product catalogue](features.md#the-actual-product-feature-list) is the authoritative user-facing scope. The six journeys below summarize how features work together; they are not the feature list. Ten newly proposed features—polls, voice notes, custom emoji, groups, templates, acknowledgement requests, message-linked tasks, shared notes, keyword alerts and saved searches—have complete [collaboration specifications](collaboration-features.md) and separate delivery estimates. They extend the roadmap without being represented as already implemented or included in the one-day candidate.

Slack Vibe helps a team conduct persistent conversations within workspaces, organize them into channels, discuss details in threads, and retrieve previous decisions. The repository establishes this product category. Team size, industry, pricing, external launch audience, and compliance obligations are not confirmed.

Planning assumes a small invited team first. This is a reversible assumption for sizing, not a claim about actual users or an instruction to restrict future market reach. Daily users may move between conversations many times an hour and need keyboard access, retained drafts, clear unread state, and predictable navigation more than decorative effects.

| Persona | Primary job | Cost of failure |
|---|---|---|
| Member | Read updates, send messages, reply, find context | Lost messages, misplaced replies, repeated searching |
| Channel creator | Organize topics and membership | Accidental privacy changes or inaccessible channels |
| Workspace admin | Maintain access and workspace hygiene | Unauthorized access and unclear moderation powers |
| Workspace owner | Accountable administration and continuity | Losing control or deleting shared data unexpectedly |

These are roles already represented or implied by the schema; they are not research-validated personas.

## Product principles

1. **Trust before breadth.** A smaller correct surface is a better day-one result than unreliable features appearing complete.
2. **Reading stays stable.** New messages, image loads, panel changes, and unread updates must preserve the user's place.
3. **Input responds immediately.** Sending can be optimistic, but pending, acknowledged, and failed must be distinguishable.
4. **Privacy follows the content.** Search, files, notifications, pins, links, and realtime obey the same channel access policy.
5. **Daily repetition sets the motion budget.** Keyboard selection, caret movement, channel changes, and returning to cached content should be immediate.
6. **Existing tools first.** Retain the current stack while fixing responsibility boundaries. New infrastructure requires measured need.

## Release definitions

### Day-one restricted candidate

Target a working path through existing GitHub authentication, authorized workspace/channel selection, reading recent messages, text sending, threads if validated, and truthful pending/error states. Retain existing features only where their server and transport boundaries pass verification.

Scheduling, uploads, search, DM creation, forwarding, administration, and notifications may be temporarily omitted from the exposed release if they cannot pass their gates. Omitting a button is insufficient: reads, actions, subscriptions, worker delivery, and direct routes must also be blocked or secured. Keep existing data intact. This is a proposed implementation cut, not a change performed in this round.

If auth-to-realtime access cannot be established, use authenticated, bounded foreground polling for the restricted candidate or keep the candidate internal. Do not call polling instantaneous realtime and do not weaken policies to preserve the appearance of live messaging.

### Complete baseline product

The original assessed baseline covers F01–F45 in [features](features.md), except explicitly deferred expansion rows such as group DMs and email/push. The expanded recommended production experience also includes the P1 portions of F49–F68: workday navigation, attention management, knowledge retrieval, preferences, account control and administrative completion. All retained features require their acceptance criteria or an explicit scope removal. P2 portions and F46–F48 are later/conditional scope, not hidden day-one obligations.

### Production experience beyond the existing screens

The user has requested more routes and the capabilities expected from a mature application. [Production routes](routes.md) now defines a complete journey from onboarding to daily work to administration and recovery. The priorities are Home/resume, Activity, unread and thread inboxes, DMs, drafts, files, durable search, personal notification controls, sessions and invitation management. Moderation, reminders and data lifecycle follow after the dependable daily-use core.

These additions are recommended design scope, not approved deployment or full completion in this round. The original one-day target remains a deliberately smaller candidate; the active follow-up implements only the dependency-ordered slices recorded in the delivery plan. Every enabled destination should use the shared, motion-rich interaction language, while continuous ambient motion remains limited to visible, meaningful activity and navigation stays organized around the user's work.

### Full product target, updated after the calls and meetings request

The target now includes voice/video calls, huddles, screen sharing, persistent voice rooms, stages, scheduled and recurring meetings, calendar sync, captions and consented meeting artifacts. Forums, community safety, custom roles, guests/shared channels, workflows/apps, migration, enterprise identity, dedicated clients, localization and advanced data governance extend that same target. These are explicit F79–F108 requirements in [calls and meetings](calls-and-meetings.md) and [production platform](production-platform.md), with W31–W39 sequencing. Calls and meeting scheduling are core to the full target; they are no longer dismissed as unspecified optional ideas.

The earlier baseline and one-day plan remain intermediate delivery milestones, not a limit on product ambition. The complete catalogue has 90 capabilities. Future implementation may stage features, but must not label an early chat-only milestone the complete Slack/Discord-grade product.

### Outside the defined implementation contracts

Telephone-network/PSTN calling, remote desktop control, public marketplace monetization, billing, unlimited broadcast scale, certification/legal advice and exact parity with every competitor remain outside the bounded contracts. Import initially supports one declared format; workflows use a finite safe step set; native delivery needs a platform prototype. These limits do not remove voice/video, meetings or the other requested capabilities from the design.

## Core journeys

- Join an invited workspace, land in an accessible channel, understand the empty or recent-history state.
- Read from the last meaningful position, compose a message, see immediate local feedback, and observe acknowledgement or a recoverable failure.
- Open a thread from a message, reply without losing channel context, and return to the same scroll position.
- Find a message using search or saved items, open its surrounding history, and understand if access or content has changed.
- Share a file without broadening the channel's audience.
- Adjust channel membership and see effective access change across clients, search, files, and subscriptions.

Route behavior and edge cases are defined in [application design](application-design.md).

## Success criteria

| Area | Release expectation | Evidence owner |
|---|---|---|
| Trust | No cross-workspace/private-resource disclosure in the defined test matrix | Security and testing |
| Message integrity | Retry and duplicate events do not create duplicate durable messages; failure preserves recoverable input | System design |
| Responsiveness | Proposed budgets in performance document met on a fixed fixture and device profile | Performance |
| Usability | Core journey operable by keyboard and on a narrow screen; no dead affordances in enabled scope | Design and testing |
| Reliability | Recovery after reconnect and worker retry is demonstrated | System design and operations |
| Delivery | End-of-day report lists verified functionality, cuts, blockers, and evidence | Timeline |

“10× faster” is a measurement objective for identified bottlenecks, not a universal promise. A 51-query path becoming at most five queries is a valid 10× work-reduction target; claiming all user journeys are 10× faster without timing them is not.

## Tone and anti-references

Use direct, calm, specific copy. Prefer “Message wasn’t sent. Retry” over a generic failure toast, and “Only channel members can view this conversation” over a blank pane. Do not imply a user caused a server failure. Avoid decorative dashboard cards, animated page entrances, bouncing UI, ambiguous icons, custom cursor effects, loading delays added for presentation, and large panels that obscure the conversation on small screens.

Accessibility target is WCAG 2.2 AA for the baseline application, with reduced motion supported from the first delivery. This is a proposed quality target, not a compliance claim. Day-one verification is scoped in [testing](testing.md).
