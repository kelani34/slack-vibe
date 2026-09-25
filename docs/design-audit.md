# Design system implementation audit

[Index](README.md) · [Design specification](design.md) · [Animation](animation.md) · [Mobile](mobile-responsive.md) · [Performance](performance.md) · [Implementation](implementation.md)

Audited 25 September 2026 against the current working tree. The scan covered 141 TSX route/component files, including 118 files under `src/components`, the shared theme and editor styles, and a live authenticated group-DM check at desktop and a 390×844 phone viewport. This is developer design evidence, not independent QA or full route acceptance.

## Audit health

| Dimension | Score | Current evidence |
|---|---:|---|
| Accessibility | 2/4 | Radix primitives, semantic labels and focus-ring foundations are present; hover-only message actions and several 28px icon controls still need visible keyboard/touch treatment |
| Performance | 2/4 | Current DM stack motion uses opacity/transform and reduced-motion fallback; route bundle, long-timeline rendering and broad interaction frame budgets remain unmeasured |
| Responsive design | 2/4 | The live group DM reflowed cleanly at 390×844 with replacement navigation and a usable composer; fixed notification/dialog dimensions and `h-screen` shell ownership remain |
| Theming | 2/4 | OKLCH CSS variables and light/dark semantic primitives exist; the scan found 50 hard-coded palette/hex usages across application styles and components |
| Anti-patterns | 4/4 | No gradient text, decorative glass, hero-metric dashboard or ornamental page choreography was found in the audited core communication surfaces |
| **Total** | **12/20** | **Acceptable, with release-significant accessibility, responsive and token work** |

## Anti-pattern verdict

The current product does not read as a generic generated dashboard. The conversation-first shell, restrained surfaces, familiar controls and compact DM identity are appropriate for a daily communication tool. The risk is inconsistency: raw Tailwind palette colors, fixed-size overlays, undersized controls and mixed loading treatments can make otherwise familiar surfaces feel unfinished.

## Priority findings

### P1: Message actions are invisible during keyboard focus

- **Location:** `src/components/message-item.tsx:326` and `src/components/message-item.tsx:338`
- **Category:** Accessibility and responsive interaction
- **Impact:** The action bar starts at zero opacity and becomes visible only through `group-hover`. Its buttons can enter the tab order without the bar becoming visible. Touch users also lack a stable action reveal.
- **Standard:** WCAG 2.1.1 Keyboard and 2.4.7 Focus Visible.
- **Required resolution:** Reveal the action bar for `focus-within`, provide one persistent touch overflow affordance, keep action labels, and test focus entry/return plus compact interaction.

### P1: Activity and channel-detail surfaces use fixed desktop dimensions

- **Location:** `src/components/app-sidebar.tsx:355`, `src/components/channel/channel-details-dialog.tsx:46`
- **Category:** Responsive design
- **Impact:** A 500px activity popover and 600px fixed-height dialog can clip or crowd small viewports, enlarged text and browser chrome.
- **Required resolution:** Use viewport-bounded width/height tokens and the mobile replacement sheet/page contract. Test 320px, 390px, tablet split view and 200% text.

### P1: Icon controls are below the product touch target and some lack explicit names

- **Location:** `src/components/profile-sidebar.tsx:135`, `src/components/profile-sidebar.tsx:147`, `src/components/profile-sidebar.tsx:175`, plus the 28px message action controls
- **Category:** Accessibility and mobile
- **Impact:** Small controls are harder to acquire on touch and an icon without an explicit accessible name can be ambiguous across assistive technology.
- **Required resolution:** Keep the visual icon compact inside a larger hit area, add explicit names, and verify touch spacing and keyboard focus. The 44px design target is a product preference; the applicable WCAG 2.2 minimum and exceptions still govern acceptance.

### P1: Application states bypass semantic design tokens

- **Location:** `src/components/notification-list.tsx:67`, `src/components/message-item.tsx:329`, `src/styles/editor.css:96`
- **Category:** Theming
- **Impact:** Raw yellow, blue, pink, green, red, purple and hex values can drift between light/dark themes and obscure whether color is decorative, categorical or status-bearing.
- **Required resolution:** Define only the needed semantic roles in `globals.css`, migrate state consumers, and verify contrast for text, icon, background, selection and disabled combinations in both themes.

### P2: Loading feedback is inconsistent and sometimes lacks structure

- **Location:** profile, thread and member surfaces use “Loading...” or centered spinners, while notifications use skeletons
- **Category:** Interaction design and perceived performance
- **Impact:** Layout can jump and users receive little indication of what will appear.
- **Required resolution:** Use surface-shaped skeletons for initial content, compact in-place progress for actions, and retained content for background refresh. Do not add artificial delay or route entrance animation.

### P2: Shell height uses the legacy viewport unit

- **Location:** `src/app/(main)/[workspaceSlug]/layout.tsx:63`
- **Category:** Mobile responsive design
- **Impact:** `h-screen` can disagree with dynamic mobile browser chrome and keyboard height.
- **Required resolution:** Adopt the documented dynamic viewport and safe-area contract, then test keyboard-open composition on actual iOS and Android browsers.

### P2: Motion coverage is narrow compared with the specification

- **Location:** `src/app/globals.css:6`
- **Category:** Motion and performance
- **Impact:** The DM avatar stack and message highlight have precise, interruptible transform/opacity motion, but most M01–M30 behaviors remain specified rather than implemented.
- **Required resolution:** Build the shared motion tokens first, then add feature-owned transitions with reduced-motion equivalents and frame evidence. Avoid generic page entrances and layout-property animation.

## Component coverage

| Pattern | Current strength | Required states still to close |
|---|---|---|
| Buttons and form primitives | Shared variants, focus rings, disabled styles | Consistent loading/error naming, touch sizing, contrast audit |
| Conversation and message row | Dense readable layout, pending/error logic, deep-link highlight | Visible keyboard/touch actions, stable long-history visual evidence |
| Composer | Rich editor, attachments, formatting and DM placeholder contract | Keyboard/IME matrix, safe-area/occlusion, per-item failure and upload progress |
| Direct-message identity | One-to-one peer avatar and group stack across sidebar/inbox/header | Large-group overflow rule, presence/status semantics, call state overlays |
| Navigation | Separate Channels, Direct messages and Workspace groups | Compact information hierarchy, feature gating, complete focus/selection matrix |
| Activity and search | Bounded data and distinct query/failure states are being implemented | Responsive destination rather than fixed popover, live Back/Forward/focus evidence |
| Dialogs and panels | Radix focus/escape foundations | Viewport bounds, replacement navigation, collision and nested-surface policy |
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

1. **D01, token roles:** replace state-bearing raw colors with reviewed semantic roles and contrast fixtures.
2. **D02, interaction accessibility:** make message/profile/action controls visible and named across hover, keyboard and touch.
3. **D03, adaptive surfaces:** replace fixed activity/dialog geometry and legacy viewport ownership with bounded desktop and mobile patterns.
4. **D04, state language:** standardize skeleton, empty, progress, error, denied, archived and revoked states.
5. **D05, motion foundation:** implement shared M01–M30 tokens and interruption/reduced-motion rules before expanding animation volume.
6. **D06, route evidence:** capture desktop, phone and tablet references for each enabled route family and link the artifacts to the QA ledger.

## Definition of design done

A surface is design-complete only when its loading, empty, success, error, denied/revoked, disabled and destructive states are defined where applicable; keyboard, touch, screen-reader and responsive behavior are tested; light/dark and reduced-motion modes preserve meaning; performance stays within the published budget; and independent QA records the actual candidate verdict. A polished screenshot alone cannot close the surface.
