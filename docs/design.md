# UI and interaction design specification

[Index](README.md) · [Product](product.md) · [Design audit](design-audit.md) · [Direct messages](direct-messages.md) · [Application behavior](application-design.md) · [Animation](animation.md) · [Performance](performance.md)

The [implementation audit](design-audit.md) is the current code-to-spec ledger. It prioritizes token roles, keyboard/touch action visibility, adaptive overlays, loading language, motion infrastructure and route-family reference evidence. This specification owns the intended design contract; the audit records the observed gap and must be refreshed after each design-system slice.

## Direct-message UI contract

The [direct-message contract](direct-messages.md) owns the DM-specific states that sit on top of this shared shell: participant avatar/name, direct-message sidebar grouping, peer-aware composer copy, one-to-one versus group identity, inbox rows, member/history boundaries, calls and mobile replacement navigation. One-to-one DMs show the peer avatar. Group DMs show at least two overlapped, deliberately layered active-member avatars in the sidebar, inbox and header; include the viewer if only two active members remain, retain the full participant count in the accessible label, and keep display names based on peers. The header's **Add people** action names the new conversation generation and explains that the new members cannot read earlier history. Future DM controls must not reintroduce the channel icon, internal `dm-*` label or channel-only star/details actions.

## Design work for the additional ten features

[Collaboration feature design](collaboration-features.md) specifies F69–F78 interaction flows and states. Produce these component/screen designs during implementation:

| Surface | Required design states | Placement |
|---|---|---|
| Poll message | Unvoted, selected, submitting, voted, closed/cancelled, denied and failed | Compact message card; keyboard choices and text results |
| Voice composer/player | Permission denied, recording, preview with summary, uploading/failed, playback/expired access | Existing composer and attachment block; no autoplay |
| Emoji administration | Searchable list, upload validation, duplicate name, replacement, retired fallback | R53 and existing picker; static assets |
| Group administration/mention | Member selection, mention authority, archived group, recipient preview and fanout-limit error | R54 and existing mention picker |
| Template picker | Preset choice, editable preview, private membership review, validation and creation failure | Existing channel creation flow |
| Announcement request | Unacknowledged, acknowledged, edited/requires response, closed, reviewer roster | Message card and bounded detail panel |
| Tasks | My/channel list, assignment, accepted/declined, due/overdue, complete/reopen, unavailable source | R55/R56, source message action |
| Notes | List, read, edit, saving/failed, version conflict, revision compare/restore, archived | R57/R58 and channel resources |
| Keyword rules | Empty/list, add/edit, local test preview, paused, invalid and limit reached | Existing notification settings |
| Saved searches | Save/name, list, edit/remove, unavailable filter and obsolete version | Existing full-search destination |

Validate keyboard, narrow-screen and reduced-motion behavior for each enabled surface. Keep compact message cards visually subordinate to conversation text; move privileged detail into panels. Use existing semantic tokens, error copy and focus conventions. More features must not require more decorative dashboard cards or ten more permanent sidebar items.

## Voice, meetings and community screen design

[Calls and meetings](calls-and-meetings.md#ui-specification-and-motion) owns the full interaction states. Design the following reference screens before implementing their feature: incoming call while composing; prejoin with denied microphone/camera; audio-only call; video grid; screen presentation; reconnecting call; minimized dock; voice-room directory; moderated stage/raised-hand queue; event agenda/calendar; create/series-edit/cancel event; recording processing/player/transcript. A call is a persistent app activity, not a transient modal lost on channel navigation.

Keep media controls labelled and stable, with explicit microphone/camera state and a persistent Leave action. Use restrained neutral surfaces around video, clear speaker emphasis without constant tile rearrangement, and a recording indicator that never depends on hover or animation. Show current timezone on event forms, series-edit scope before save, and call/recording authority before joining or sharing. Narrow screens prioritize stage and essential controls, with participant/thread/caption views as deliberate panels.

[Production platform](production-platform.md) adds forum topic lists, effective-role previews, guest expiry, external-organization labels, rule screening, moderation decisions, workflow version/run history, integration consent, import mapping and identity recovery. Design their empty, busy, denied, conflict and partial-failure states. Optional Voice/Events/Forums navigation is configured per workspace; administration and advanced features do not overwhelm everyday conversation navigation.

## Design direction

**A calm, precise communication workspace for people who use it every day.** A user reads and replies on a laptop in daylight, then checks a conversation on a phone or in lower light later. That scene calls for equally considered light and dark themes, legible content, stable navigation, and immediate interactions. It does not justify forced dark mode or decorative dashboard styling.

The user specifically requested a motion-rich, carefully animated product, taking inspiration from the precise timing and continuity of Emil Kowalski's work. Motion should be present throughout navigation, messaging, panels, calls, scheduling and feature feedback, with detail chosen for each interaction rather than applied as a single generic effect. Every animation must preserve immediate controls, stable reading, interruptibility, mobile performance and an equivalent reduced-motion path; the [motion specification](animation.md) is the shared contract.

This document is a proposed specification, not a rendered redesign. Local browser inspection now covers the login page, authenticated DM inbox/group conversation header, stacked group avatars, and the all-unread page's empty state and sidebar badge. The rest of the authenticated product, final token contrast, animation quality and responsive route families still require visual and device validation.

## Existing assets worth retaining

Geist/Geist Mono are loaded from the pinned local `geist` package through `next/font`; retain them and keep font builds independent of Google Fonts availability. The installed Radix/shadcn-style primitives already provide useful foundations for dialogs, menus, tooltips, focus management, and controls. Tailwind's CSS-variable token setup uses OKLCH, which is a suitable base. Sonner already supports notification feedback; Tiptap supports the actual message composer.

The distinctive quality should come from a coherent conversation surface and exact behavior, not replacement of every library or a new display font.

## Current UI issues and proposed resolution

| Surface | Source observation | Proposed design work | Priority |
|---|---|---|---|
| App shell | Header heights differ; navigation includes incomplete surfaces | One shell geometry; show enabled destinations only; preserve selected conversation | Day one |
| Channel timeline | Centered spinner and incomplete history anchoring | Message-shaped skeleton; stable scroll; explicit unread/new-message controls | Day one |
| Composer | Rich functionality but failure/draft/IME behavior needs completion | Clear pending/error feedback, retained input, accessible toolbar, protected Enter behavior | Day one |
| Message actions | Hover-oriented icons; forwarding placeholder | Keyboard/touch access, labels, only working actions | Day one |
| Thread/profile | Fixed-width panes; competing state stores | One detail surface; mobile replacement; predictable Back and close | Day one core; full later |
| Notifications | 500px popover and alternate sidebar presentation | One responsive activity surface; scope label; list/count states | Later |
| Members | Individual cards per member | Compact directory rows with clear identity/role/actions | Later |
| Search | Filters and results share command UI with asynchronous races | Stable results, visible query state, concise filter chips, keyboard instructions, accessible invalid-query feedback, and distinct loading, unavailable, transient-error/retry and selected-context states | Later |
| Scheduled | Workspace list renders raw content text and lacks cancel | Safe preview, timezone, status and actionable controls | Later |
| Settings | Disabled fields, inactive copy button, delivery preferences without delivery | Separate personal/workspace settings; implement or omit unfulfilled controls | Day-one removal; full later |
| Visual tokens | Hardcoded red/white state classes across components | Semantic unread/error/selection/focus tokens | Day one core |
| Theme | Dark forced, system theme disabled | Retain current theme for day-one scope; complete system/manual preferences later | Later |

## Layout specification

The [mobile specification](mobile-responsive.md) owns compact layout, keyboard/safe-area, touch, route-family and device acceptance rules. Highly responsive mobile web is required for the full product, including calls, meetings and administration. The layout sketches below are summaries; no feature is considered complete from desktop screenshots alone.

### Desktop, at least 1200px

Use a 240–280px navigation column, flexible conversation, and optional 360–420px contextual panel. Suggested default is 256px navigation and 384px detail pane, provided the conversation retains at least 480px usable width. Header height is 52px across primary surfaces. The composer remains fixed within the conversation region, not the browser viewport.

```text
┌──────────────────────┬─────────────────────────────────┬──────────────────────┐
│ Workspace / search   │ Conversation title + context    │ Thread / profile     │
├──────────────────────┼─────────────────────────────────┼──────────────────────┤
│ Starred              │                                 │ Parent / identity    │
│ Channels             │ Stable message timeline         │                      │
│ Direct messages      │ Date and unread markers         │ Contextual content   │
│                      │                                 │                      │
│ Activity / saved     ├─────────────────────────────────┤                      │
│ Profile / settings   │ Composer and delivery state     │ Reply / local action │
└──────────────────────┴─────────────────────────────────┴──────────────────────┘
```

Direct messages appear as their own group only after F13 is implemented correctly. Do not show internal `dm-<timestamp>` names as product labels. Empty navigation groups should be omitted or offer a relevant creation action, not occupy unexplained space.

### Medium screens, 768–1199px

Navigation may collapse to a drawer. Allow a detail pane only if the conversation stays readable; otherwise replace the main view with explicit Back navigation. Do not stack two independently scrolling narrow message columns. A resize handle is optional later; fixed sensible breakpoints are sufficient initially.

### Narrow screens, under 768px

One main surface at a time: conversation, thread, profile or search. Navigation opens in an accessible drawer. Opening a thread preserves the channel anchor for return. Composer respects safe-area insets and the on-screen keyboard; validate `dvh`/resize behavior on actual mobile browsers rather than relying on `h-screen` alone. Popovers use a viewport-constrained width and become sheets/full-height surfaces only when content warrants it.

Minimum supported design viewport: 320px wide. Test 375px, 768px, 1280px and 1440px plus 200% zoom. These are design test sizes, not assumptions about traffic.

## Expanded production screens

The [route registry](routes.md) owns URLs and access. The following screen compositions define what the additional destinations should actually look like and do. Shared shell, typography and motion rules apply to all of them. Prefer clear list rows and consistent filters over a dashboard of cards.

| Screen family | Layout and information hierarchy | Primary interaction | Important states |
|---|---|---|---|
| Home | Quiet greeting/context, recent conversations, unread-thread summary, resumable drafts; at most three bounded sections | Resume a conversation or draft | New member gets channel guidance; no data produces useful next action; one failed section does not blank the whole page |
| Activity | Recipient event list with All/Mentions/Replies/Reactions filters; actor, source, excerpt, time and read state | Open source; mark selected/read | Deleted/denied source has no retained excerpt; failed read mutation restores correct state |
| All unread | Conversation groups with count, first unread excerpt and last activity; optional selected preview | Read next; explicitly mark a conversation read | Viewing overview does not clear all counts; new events do not reorder the focused row |
| Threads | One row per root with channel, parent excerpt, last reply and unread/follow status; selected thread opens detail | Read/reply; follow/unfollow | No followed threads explains participation/following; removal purges thread excerpt |
| DM inbox | Peer avatar/name, latest safe excerpt, draft/unread status and timestamp; selected conversation on desktop | New message or resume DM | Empty recipient search, removed user, blocked membership; no internal channel name shown |
| Drafts/send center | Rows show destination, edited time, safe text preview and explicit Draft/Failed/Uncertain status | Resume; verify uncertain send; discard with recovery protection | Separate draft from pending server delivery; inaccessible destination preserves authored draft without old history |
| Later/reminders | In progress/Completed tabs, source preview, optional due date and snooze control | Open source, complete personal item, remind later | Completion never changes shared message; unavailable source keeps only safe personal metadata |
| Files | Compact list with file type/name/size, author, source and date; filters above; optional thumbnails | Preview or open source message | No results differs from denied/loading; preview errors do not expose permanent object URLs |
| Full search | Sticky search field, filter chips, result-type tabs and paginated rows; optional result preview | Refine query and open context | Stable old results during refresh; explicit syntax/no-results/error; close returns to original conversation |
| Onboarding | One task per step, visible progress, Skip for optional profile/preferences, resume support | Join/create and enter first accessible channel | Interrupted/repeated flow is idempotent; no forced avatar/upload/notification permission |
| Account settings | Left section navigation on desktop, section selector on narrow screens; labeled form rows | Update one settings group | Saved/saving/failed state local to group; danger actions require reauth and specific confirmation |
| Workspace admin | Separate admin shell with members/invitations/channels/policies; actionable overview, filtered data tables | Resolve a pending invitation or governance action | Ordinary member gets safe denied state; no fake utilization metrics or private-message feed |
| Help/recovery | Searchable tasks, concise diagnosis and one actionable next step | Retry connection/sign-in or inspect shortcuts | Distinguish network, expired session and realtime outage; never expose raw secrets in diagnostics |

### Navigation and mobile behavior

Primary desktop destinations are Home, Activity, Threads and DMs alongside the joined/starred channel list. More contains unread, drafts, scheduled, Later, files and people. Search is always reachable through a visible control and shortcut. Account settings live under the profile menu; administration appears only for permitted roles.

On compact primary list screens, use at most five labelled navigation controls: Home, Activity, DMs, Channels and More. Threads remains directly available through More and Home. Focused conversation/detail/form/call screens replace the primary bottom bar with contextual controls, retain header Back/navigation, and never stack navigation below a composer and call toolbar. Details replace the main pane. Follow the state/focus restoration contract in the mobile specification; no swipe-only controls or endless icon rail.

### Reusable page patterns

- **Inbox/list page:** header and count → filter row → bounded list → selected detail. One empty-state action; keyboard focus retained across refresh.
- **Settings page:** section navigation → labeled groups → local save state. Avoid unsaved-change loss; expose whether settings save immediately or explicitly.
- **Admin table:** scope/breadcrumb → filters → records → permission-aware row actions. Bulk operations need scoped selection, preview, per-item outcomes and failure recovery; baseline can omit bulk controls.
- **Detail page/panel:** title and source → content → allowed actions. Direct route and contextual opening share content and authorization.
- **Recovery page:** plain cause → impact on user work → safe next action. Keep the original destination and do not promise that a disconnected send failed.

### Design deliverables for the expanded scope

Before implementing W21–W26, prepare reference states for Home, unread/threads/DM inboxes, drafts, files/search, notifications/preferences, sessions, invitations and one denied/recovery view. Review at desktop and narrow widths. Each includes loading, empty, success, error and revoked-resource behavior where applicable. Use existing M01–M30 transitions; no route entrance animations are added by default.

## Typography and spacing

| Role | Proposed size / line height | Weight and use |
|---|---|---|
| Message body | 14px / 21px desktop; 16px / 24px compact | Regular; readable long threads, user text sizing supported |
| Navigation/control | 13–14px / 20px | Medium only for active/emphasis |
| Author/channel label | 14px / 20px | Semibold; timestamps secondary |
| Metadata | 12px / 16px | Regular; contrast remains readable |
| Section heading | 18px / 24px | Semibold |
| Standalone page heading | 24px / 30px | Semibold; avoid oversized dashboard headings |
| Code | 13px / 20px Geist Mono | Scroll code block within message when necessary |

Use a 4px spacing base with deliberate values: 4/8/12/16/24/32. Dense rows use 8–12px vertical rhythm; major sections use 24px. Message prose should generally remain below 75 characters per line where layout allows, while full-width interaction hit areas remain available. Avoid a card around each message or member.

## Semantic token contract

Keep existing CSS variable names where they already describe the role. Add only roles actually needed: `surface-panel`, `surface-hover`, `selection`, `selection-foreground`, `unread`, `success`, `warning`, `focus-ring`, and pending/error message states. Avoid importing chart colors into communication semantics.

The completed D01 source slice defines `saved`/`saved-surface`, `pinned`/`pinned-surface`, `unread`/`unread-foreground`, `success`/`success-surface`, `warning`/`warning-foreground`/`warning-surface`, `favorite` and `message-target`. They own bookmark/pin and mention presentation, unread badges/dividers, presence, schedule state, starred channels, notification meaning and deep-link highlighting. Automated tests calculate both themes' foreground/surface, badge and icon contrast and reject raw app palette/hex use outside the Recharts adapter's third-party SVG attribute selectors. Dark-theme production-artifact evidence covers the populated favorite, pin, bookmark, reaction and mention states; light visual, forced-colors and independent QA remain open.

Candidate palette for prototyping, not contrast-certified output:

| Role | Light candidate | Dark candidate | Use |
|---|---|---|---|
| App background | `oklch(0.985 0.004 250)` | `oklch(0.18 0.006 250)` | Conversation surface |
| Secondary surface | `oklch(0.96 0.006 250)` | `oklch(0.215 0.008 250)` | Navigation/detail plane |
| Main text | `oklch(0.22 0.01 250)` | `oklch(0.95 0.005 250)` | Content |
| Secondary text | `oklch(0.48 0.015 250)` | `oklch(0.73 0.01 250)` | Time/status/context |
| Border | `oklch(0.88 0.008 250)` | `oklch(0.32 0.01 250)` | Quiet separation |
| Action accent | `oklch(0.50 0.17 260)` | `oklch(0.72 0.13 260)` | Primary action/focus/active link |
| Selection surface | `oklch(0.94 0.025 260)` | `oklch(0.29 0.04 260)` | Selected conversation/result |

The accent is a proposal, not an approved brand identity. Retain restrained neutrals and the current accent during day one unless a measured contrast defect requires correction. Avoid pure white/black surfaces, gradient text, ornamental blur, thick colored side stripes, and arbitrary shadow layers. Semantic error/success colors must have separate text/background pairs verified against both themes.

Radii: 6px controls, 8px floating menus, 10–12px dialogs, full circle avatars/status dots. Elevation is reserved for overlapping surfaces: subtle menu shadow, stronger dialog shadow, one backdrop. Static message rows do not need elevation.

## Component contracts

### Message row

Show author/avatar on the first message of a group, then align subsequent content to the same text column. Grouping must consider sender, date boundary, message type and time gap. Timestamp remains discoverable without hover-only dependence. Selection, mention, search target, pending and failed styles cannot rely on color alone.

Actions are available on hover, keyboard focus and touch through one overflow affordance. Escape closes menus and returns focus. A deleted message has a consistent tombstone; do not animate a long thread collapsing under a reader. Long code, links, filenames, names, emoji and RTL content must not force horizontal page overflow.

### Composer

One main send action, attachment control, and compact formatting affordance. Keep advanced scheduling under the send menu only when enabled. Show upload state per attachment. Visible error belongs to the failed item, with retry/edit/discard choices. Do not clear the only copy of text before send success. Disabled composition includes a concrete reason such as archived channel or insufficient posting permission.

### Navigation

Separate selected, unread and hover states. Unread state combines weight/dot/count with an accessible label. Starred channels do not lose counts because they use a different fetch path. Keyboard navigation should be conventional; implement a roving-tab pattern only where the underlying primitive requires it.

### Dialogs, popovers and sheets

Use inline editing for small topics/descriptions when practical. Dialogs are appropriate for consequential settings and confirmations; contextual menus are anchored to their trigger. All floating surfaces have a defined focus entry/return target, Escape behavior and viewport collision handling. Do not maintain multiple active modal layers for routine actions.

### Search

Ctrl/Cmd+K focuses the input immediately. Highlight movement with arrow keys is instantaneous. Results stay visible while a newer query resolves, with a small status indicator. Filters are removable and expose their effective scope; invalid syntax is explicit. No-results, request-failed, unavailable target and retryable context failure are different states. Search uses explicit 20-result pages with an accessible “Load more results” command row; loading the next page appends in place, preserves current keyboard context, and disables duplicate requests. Query changes discard the old cursor and ignore late pages from the previous query. Selecting a result announces, focuses and centers its target in a bounded context window; reply results open the parent thread. Keep “Return to latest” available while context is shown. Browser Back exits a same-conversation context jump; Forward reopens it. Restore the previous message viewport and focus when returning to a conversation, and keep the deep-link query until the user exits so history remains meaningful. Distinguish a denied/deleted result from a temporary context-load error and provide a retry only for the latter. Respect reduced motion for the scroll transition. Component coverage is not a substitute for live browser/device verification.

### Settings and directory

Settings use labeled rows grouped by purpose. Personal notification/theme preferences must not appear as workspace-wide controls. A member row aligns avatar, identity, role and permitted action in a single scan line. Destructive actions name the affected resource and explain whether data is recoverable.

## Accessibility requirements

Use the [WCAG 2.2 quick reference](https://www.w3.org/WAI/WCAG22/quickref/) to verify the applicable criteria and exceptions. The 44px target below is a usability preference; it is not presented as the AA minimum.

- Target WCAG 2.2 AA; verify keyboard operation, focus visibility, semantic labels and contrast on enabled day-one surfaces.
- Ordinary text contrast ≥4.5:1, large text ≥3:1, essential non-text controls/focus indicators ≥3:1 where applicable. Measure final colors, including disabled/error/selection combinations.
- Aim for 44px touch controls where space permits; never fall below the applicable 24px minimum target requirement without a valid exception.
- Use polite live announcements for meaningful send status and new-message availability, not every typing pulse or bulk history row.
- Rich editor has a label and discoverable shortcuts; toolbar controls expose pressed state. Focus should not jump when a background query completes.
- Prefer document landmarks and headings. Timeline navigation remains usable without relying on visual animation or hover.
- Respect reduced-motion preference plus an eventual in-app setting. All functional information remains available when motion is disabled.

The D02 source pass now inventories app-owned icon Buttons and native icon-only buttons with an AST contract, requires accessible names, and gives shared icon Button/compact Toggle variants a 44px compact-screen target floor. Attachment and topic removal also remain visible on keyboard focus and cannot submit their containing form accidentally. Exact production-artifact evidence at 390×844 confirms the composer and eight expanded formatting controls resolve to 44×44px without horizontal clipping. Keyboard sequence/focus return, screen readers, 320px, zoom, software-keyboard occlusion, physical devices and independent QA remain open.

## Design acceptance and deliverables for implementation

Follow [UI TDD](tdd.md) before implementing each component/flow: tests for labelled actions, state transitions, validation/failure, focus, keyboard/touch and applicable responsive behavior. Pair component assertions with browser/visual tests where real layout matters. Review stable visual baselines intentionally; do not auto-accept screenshot changes. Every interactive app-owned component has direct or containing-feature coverage. Manual design review complements automated evidence and does not substitute for it.

Create a small reference board covering channel normal/loading/empty/failure, pending/failed message, thread open, search, denied/archived state and narrow layout. Capture actual component screenshots rather than speculative full-page art. Review at real speed and with keyboard navigation.

Day one: unify shell heights, fix core overflow, labels/focus, delivery feedback, dead controls and loading state; apply only the minimal motion subset. Later: complete themes, directory/settings/activity/search layouts and the entire component-state matrix. W16 owns layout/tokens; W17 owns motion; each feature owns its own domain-specific copy and states.
