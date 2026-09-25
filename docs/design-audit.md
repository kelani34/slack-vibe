# Design system implementation audit

[Index](README.md) · [Design specification](design.md) · [Animation](animation.md) · [Mobile](mobile-responsive.md) · [Performance](performance.md) · [Implementation](implementation.md)

Audited 25 September 2026 against the current working tree. The scan covered 141 TSX route/component files, including 118 files under `src/components`, the shared theme/editor styles, live authenticated desktop and 390×844 message/DM checks, and exact production overlay checks at 320×568. This is developer design evidence, not independent QA or full route acceptance.

## Audit health

| Dimension | Score | Current evidence |
|---|---:|---|
| Accessibility | 3/4 | App-owned icon controls now have source-enforced names, keyboard-visible actions and 44px compact targets through shared Button/Toggle rules; assistive-technology and physical-device acceptance remain open |
| Performance | 2/4 | Current DM stack motion uses opacity/transform and reduced-motion fallback; route bundle, long-timeline rendering and broad interaction frame budgets remain unmeasured |
| Responsive design | 3/4 | The shell and shared Dialog/Popover primitives use dynamic viewport bounds; exact-artifact checks cover overlays at 320×568 and DM/composer states at 390×844, while tablet/zoom/keyboard/device acceptance stays open |
| Theming | 3/4 | All app-owned state presentation now uses measured light/dark semantic roles; the only excluded literals are third-party SVG selector values in the Recharts adapter, while light-theme visual and independent QA remain open |
| Anti-patterns | 4/4 | No gradient text, decorative glass, hero-metric dashboard or ornamental page choreography was found in the audited core communication surfaces |
| **Total** | **15/20** | **Good source foundations, with release-significant device, zoom, visual-evidence, assistive-technology and state-system validation still open** |

## Anti-pattern verdict

The current product does not read as a generic generated dashboard. The conversation-first shell, restrained surfaces, familiar controls and compact DM identity are appropriate for a daily communication tool. The remaining risk is inconsistency in loading/state treatments and the overlays, viewport combinations and assistive/device journeys that have not yet received implementation or acceptance evidence.

## Priority findings

### P1: Message-action access — implemented, browser and QA evidence open

- **Location:** `src/components/message-item.tsx:326` and `src/components/message-item.tsx:338`
- **Category:** Accessibility and responsive interaction
- **Original impact:** The action bar started at zero opacity and became visible only through `group-hover`. Its buttons could enter the tab order without the bar becoming visible. Touch users also lacked a stable action reveal.
- **Standard:** WCAG 2.1.1 Keyboard and 2.4.7 Focus Visible.
- **Implemented slice:** The toolbar now has an explicit accessible name, reveals through `focus-within`, stays visible on compact layouts, exposes one visually quiet 44px overflow control, and moves reaction plus secondary compact actions into its menu. Component regression evidence covers the semantic toolbar, focus-visible class contract, compact visibility and target sizing; B13 verifies the menu and nested reaction picker at 390×844. Browser keyboard traversal, screen-reader output and physical touch-device QA remain open.

### P1: Adaptive overlay dimensions — source implementation complete, device QA open

- **Location:** `src/components/app-sidebar.tsx:355`, `src/components/channel/channel-details-dialog.tsx:46`
- **Category:** Responsive design
- **Original impact:** A 500px activity popover and 600px fixed-height dialog could clip or crowd small viewports, enlarged text and browser chrome.
- **Implemented source:** Activity uses viewport-bounded width/height and opens above its compact trigger; channel details uses dynamic viewport dimensions and an accessible description. Shared Dialog and Popover primitives now cap height to `100dvh - 2rem`, popovers cap width to `100vw - 2rem`, and overflow stays reachable. File preview owns the same dynamic margins instead of `90vh`. Contract tests cover those primitive guarantees; B14 verifies Activity/channel details at 390×844, and B19 measures a pinned-message popover plus PDF preview fully inside 320×568.
- **Remaining evidence:** Verify focus entry/return and Escape through nested surfaces, 200%/400% zoom, software-keyboard occlusion, short landscape, tablet split view, physical iOS/Android and independent QA. Complex mobile settings may still justify a routed or sheet presentation after those checks.

### P1: Icon control naming and touch size — source implementation complete, device QA open

- **Location:** `src/components/profile-sidebar.tsx:135`, `src/components/profile-sidebar.tsx:147`, `src/components/profile-sidebar.tsx:175`, plus the 28px message action controls
- **Category:** Accessibility and mobile
- **Original impact:** Small controls were harder to acquire on touch and profile icon controls had no explicit accessible names.
- **Implemented source:** A TypeScript-AST contract inventories every app-owned icon `Button` and native icon-only `button`, rejecting controls without an explicit or rendered accessible name. Shared icon Button variants and the compact Toggle variant enforce a 44px minimum at compact breakpoints even when a consumer keeps a smaller visual icon. The repair names thread/preview/profile, notification, composer, scheduling and star controls; attachment/topic removal is keyboard-visible, explicitly named and non-submitting. B18 verifies all composer and formatting controls at 44×44px in the exact 390×844 production artifact without horizontal clipping.
- **Remaining evidence:** Run real keyboard order/focus-return, VoiceOver/TalkBack or equivalent screen-reader output, switch/voice-control targeting, 320px/zoom/keyboard-open and physical-device QA. The 44px design target is a product preference; the applicable WCAG 2.2 minimum and exceptions still govern acceptance.

### P1: Application states bypass semantic design tokens — source implementation complete, visual/QA evidence open

- **Location:** `src/components/notification-list.tsx:67`, `src/components/message-item.tsx:329`, `src/styles/editor.css:96`
- **Category:** Theming
- **Original impact:** Raw yellow, blue, pink, green, red, purple and hex values could drift between light/dark themes and obscure whether color was decorative, categorical or status-bearing.
- **Implemented source:** `saved`, `pinned`, `unread`, `success`, `warning`, `favorite` and `message-target` roles now own bookmarks/pins, editor mentions, unread badges/dividers, presence, scheduled state, starred channels and deep-link highlighting. Notification icons reuse those roles plus existing destructive, muted and primary semantics instead of a decorative rainbow. The contract scans all app-owned TS/TSX/CSS, rejects raw palette/hex bypasses, and calculates light/dark contrast for text, icon and badge pairs. Saved/pinned remain above 7:1; the new shared pairs meet their 4.5:1 text or 3:1 icon thresholds.
- **Remaining evidence:** Complete light-theme visual review, selection/disabled/focus combination review, forced-colors checks and independent QA. The Recharts adapter retains literal `#ccc`/`#fff` selectors because they target SVG attributes emitted by that library; they are not app palette values and should change only with an adapter-specific test.

### P2: Loading feedback is inconsistent and sometimes lacks structure

- **Location:** profile, thread and member surfaces use “Loading...” or centered spinners, while notifications use skeletons
- **Category:** Interaction design and perceived performance
- **Impact:** Layout can jump and users receive little indication of what will appear.
- **Implemented slice, 25 September 2026:** Profile, thread reply, and channel-member loading now use content-shaped skeletons inside named `role="status"` regions. Shared skeletons pulse only when motion is allowed. Profile, thread, current-member, add-member, and forwarding destination-channel query failures now use alerts with explicit retry actions; stale profile/reply/member/channel-option content stays usable when a background refresh fails. Forwarding also announces loading and an empty destination list. Component tests assert accessible states, content shapes, reduced-motion behavior, retry, and retained content.
- **Remaining:** Inventory empty/denied/archived/revoked surfaces and action progress, then apply retryable error states to remaining query-backed surfaces. Do not add artificial delay or route entrance animation. Independent QA remains NOT RUN.

### P2: Shell height uses the dynamic viewport — implementation complete, device QA open

- **Location:** `src/app/(main)/[workspaceSlug]/layout.tsx:63`
- **Category:** Mobile responsive design
- **Original impact:** `h-screen` could disagree with dynamic mobile browser chrome and keyboard height.
- **Implemented slice:** The workspace shell now owns `h-dvh min-h-0`, with a component regression that rejects `h-screen`. Keyboard-open composition and safe-area behavior still require actual iOS/Android evidence and independent QA.

### P2: Motion coverage is narrow compared with the specification

- **Location:** `src/app/globals.css:6`
- **Category:** Motion and performance
- **Impact:** The DM avatar stack and message highlight have precise, interruptible transform/opacity motion, but most M01–M30 behaviors remain specified rather than implemented.
- **Implemented foundation, 25 September 2026:** Shared duration, easing, travel and stagger tokens now drive the existing avatar-stack and message-highlight animations. Reduced-motion overrides set duration, stagger and travel tokens to zero while preserving static highlight focus feedback.
- **Remaining:** Migrate feature-owned transitions to the shared system, then verify interruption, lifecycle cleanup, reduced-motion visuals and mobile frame/input budgets. Do not infer broad motion coverage from the token foundation. Avoid generic page entrances and layout-property animation.

## Component coverage

| Pattern | Current strength | Required states still to close |
|---|---|---|
| Buttons and form primitives | Shared variants, focus rings, source-enforced icon names and compact touch sizing | Consistent loading/error announcements, keyboard/assistive-device evidence, contrast audit |
| Conversation and message row | Dense readable layout, pending/error logic, deep-link highlight | Visible keyboard/touch actions, stable long-history visual evidence |
| Composer | Rich editor, attachments, formatting and DM placeholder contract | Keyboard/IME matrix, safe-area/occlusion, per-item failure and upload progress |
| Direct-message identity | One-to-one peer avatar and group stack across sidebar/inbox/header | Large-group overflow rule, presence/status semantics, call state overlays |
| Navigation | Separate Channels, Direct messages and Workspace groups | Compact information hierarchy, feature gating, complete focus/selection matrix |
| Activity and search | Bounded data and distinct query/failure states are being implemented | Responsive destination rather than fixed popover, live Back/Forward/focus evidence |
| Dialogs and panels | Radix focus/escape foundations plus source-wide dynamic viewport bounds | Replacement navigation, collision/focus return, zoom/keyboard and nested-surface evidence |
| Empty/loading/error | DM/unread empty states and notification skeleton exist | Shared language and complete route-family state matrix |

## Full design coverage matrix

No feature family is exempt from the shared design, mobile, motion, speed and accessibility rules.

| Route or feature family | Owning product specification | Design obligations | Delivery owner |
|---|---|---|---|
| Authentication, onboarding and recovery | [Application design](application-design.md), [Routes](routes.md) | Clear return target, provider/error states, narrow layout, no dead destination | W01/W21 |
| Workspace, channels and administration | [Application design](application-design.md), [Security](security.md) | Shell geometry, member/role states, destructive clarity, denied/archived states | W15/W21/W25 |
| Messages, threads and history | [System design](system-design.md), [Animation](animation.md) | Stable reading, message states, thread replacement, anchor/focus continuity | W04/W08/W17 |
| Direct and group messages | [Direct messages](direct-messages.md) | Participant identity, stacked avatars, generation/history disclosure, mobile Back | W22/W39 |
| Search, saved, unread and activity | [Routes](routes.md), [Performance](performance.md) | Attention hierarchy, bounded result states, Back/Forward, loading and cache truth | W14/W22/W24 |
| Files, drafts and scheduled work | [Application design](application-design.md), [Security](security.md) | Progress/failure, preview privacy, uncertain send, timezone and recovery | W09/W12/W13/W24 |
| Preferences, account and sessions | [Routes](routes.md), [Production platform](production-platform.md) | Personal/workspace scope, revocation, device/session clarity | W23/W26 |
| Polls, voice notes, tasks and notes | [Collaboration features](collaboration-features.md) | Compact message-native surfaces, explicit authority and failure states | W27–W30 |
| Calls, rooms, stages and meetings | [Calls and meetings](calls-and-meetings.md) | Persistent call activity, device/permission/reconnect states, consent and captions | W31–W35 |
| Forums, guests, moderation and workflows | [Production platform](production-platform.md) | Role/external labels, queues, conflicts, partial failure and audit clarity | W34/W36/W37 |
| Native clients, localization and governance | [Production platform](production-platform.md), [Mobile](mobile-responsive.md) | OS lifecycle, text expansion, RTL, retention/export/deletion status | W37/W38 |

## Implementation order

1. **D01, token roles — source implementation complete:** app-owned state colors use semantic roles with source-wide raw-color rejection and light/dark contrast fixtures; light visual, forced-colors and independent-QA evidence remain.
2. **D02, interaction accessibility — source implementation complete:** app-owned icon controls have source-wide naming and shared compact-target contracts, plus exact-artifact phone evidence; keyboard, assistive-technology, physical-device and independent-QA evidence remain.
3. **D03, adaptive surfaces — source implementation complete:** shell, Dialog, Popover, Activity, channel details and file preview use dynamic viewport bounds with 320×568 and 390×844 exact-artifact evidence; tablet, zoom, keyboard, focus-return, physical-device and independent-QA evidence stay open.
4. **D04, state language — in progress:** profile, thread, channel-member and member-hover-card loading use accessible, surface-shaped states with reduced-motion behavior; profile, thread, both channel-member queries, forwarding destination lookup and hover-card profile reads have retry paths, preserving cached content during failed refreshes. Hover-card detail queries wait until open to avoid unused per-author requests. Cross-route empty/progress/error/denied/archived/revoked consistency remains open.
5. **D05, motion foundation — token layer implemented:** shared timing/easing/travel/stagger variables, reduced-motion overrides, avatar/highlight consumers and shared-button press feedback are in place; M01–M30 feature adoption, interruption, cleanup and frame evidence remain open.
6. **D06, route evidence:** capture desktop, phone and tablet references for each enabled route family and link the artifacts to the QA ledger.

## Definition of design done

A surface is design-complete only when its loading, empty, success, error, denied/revoked, disabled and destructive states are defined where applicable; keyboard, touch, screen-reader and responsive behavior are tested; light/dark and reduced-motion modes preserve meaning; performance stays within the published budget; and independent QA records the actual candidate verdict. A polished screenshot alone cannot close the surface.
