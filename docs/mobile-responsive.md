# Mobile responsiveness and adaptive application design

[Index](README.md) · [Design](design.md) · [Application](application-design.md) · [Routes](routes.md) · [Calls](calls-and-meetings.md) · [Performance](performance.md) · [Testing](testing.md) · [Implementation](implementation.md)

## Requirement and scope

**The entire enabled application must be highly usable on phones and tablets.** Mobile responsiveness is a release requirement for all 90 product capabilities and all 78 route patterns as they are implemented. It is not a desktop shell made smaller, a chat-only adaptation or work postponed until native clients. F40 owns this cross-cutting requirement; it does not inflate the feature count. Mobile web and dedicated clients F106 are separate deliverables.

Design from the narrowest usable layout outward. Preserve authorized actions, content, form validation and recovery paths at small widths; change presentation rather than silently dropping features. A platform capability genuinely unavailable in a supported browser receives an explicit capability-specific alternative. For example, an unsupported screen-capture browser may receive a shared screen while offering a clear supported-client handoff for presenting. Do not send users to desktop for ordinary administration, scheduling, search or conversation tasks.

This is a specification and focused source assessment, not a claim of implemented responsiveness. No authenticated mobile runtime, real keyboard or physical device was tested in this documentation round. The original source findings remain valid; the findings below extend their mobile-specific interpretation.

## Source evidence and remaining fixes

| Inspected source | Observation | Risk and required work | Owner |
|---|---|---|---|
| [Workspace layout](<../src/app/(main)/[workspaceSlug]/layout.tsx>) | `SidebarInset` uses `h-screen`; nested main uses full height and overflow hiding | Validate dynamic browser chrome/keyboard; establish viewport and scroll ownership, then fix measured occlusion | W16/W18 |
| [App sidebar](../src/components/app-sidebar.tsx) | Notifications request `w-[500px]` at a right-side popover | Replace with constrained content or a full-height mobile destination; verify collision/focus behavior | W16/W22 |
| [Thread sidebar](../src/components/thread-sidebar.tsx) | `w-80` pane alongside conversation; replies effect scrolls to bottom | Replace main pane on compact screens; preserve parent anchor and user reading position across keyboard/new replies | W08/W16 |
| [Channel details](../src/components/channel/channel-details-dialog.tsx) | Fixed `h-[600px]` dialog | Fit available height with one scroll region and always reachable controls; full-page form for complex editing | W15/W16 |
| [File preview](../src/components/file-preview-modal.tsx) | Viewer uses `h-[90vh]` and hidden overflow | Test short landscape/keyboard chrome, fit media and retain close/download controls | W09/W16 |
| [Message item](../src/components/message-item.tsx) | Floating actions use `opacity-0 group-hover:opacity-100`; some controls are 28px | Provide visible touch/keyboard action menu and larger independent hit areas; keep native selection usable | W10/W16 |
| [Mobile hook](../src/hooks/use-mobile.ts) | 768px media query resolved after mount; initial boolean is false | Avoid hydration-time pane duplication, data fetching or focus jumps; layout must not depend only on delayed device state | W16 |

These values are source evidence, not proof each component overflows in every browser. Existing Radix collision handling and the sidebar's mobile sheet are useful foundations. Reuse them and test the composed screen before replacing primitives or adding a responsive framework.

## Layout modes and resizing rules

All dimensions below are CSS pixels and proposed design boundaries. Available component width, text size and viewport height determine whether a split layout actually fits; a device name never determines authorization or behavior.

| Available width | Layout contract | Navigation and detail behavior |
|---|---|---|
| 320–479 | Compact phone; one primary content region | Full-width conversation/detail; scoped navigation; wrap forms and text |
| 480–767 | Large phone or compact tablet; still one primary region by default | Wider content without a squeezed desktop sidebar; drawers/route details as appropriate |
| 768–1199 | Tablet/split-window mode | Optional navigation plus one content pane; contextual detail replaces content unless minimum usable widths fit |
| 1200+ | Desktop multi-pane when content fits | 240–280px navigation, at least 480px conversation and optional 360–420px detail, including borders/gaps |

Use CSS media/container queries for layout; reserve JS media detection for actual behavior such as rendering one accessible modal pattern. Breakpoint changes must not create a second composer, duplicate media connection, reset draft, restart uploads or lose the active message anchor. Server-render a stable shell and avoid fetching both mobile and desktop data trees. An iPad in split view can use the compact layout, while a touchscreen laptop still requires touch-accessible controls.

No document-level horizontal scroll at 320px for ordinary content. Wrap long names, URLs, mentions and translated labels. Code, genuine data tables and image/media canvases can have contained two-dimensional interaction when necessary, with an obvious boundary and a usable alternative for key actions. Hiding overflow across the whole page to conceal clipped controls is not a fix. Test reflow and zoom rather than locking the viewport scale. [W3C reflow guidance](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)

## Mobile shell, navigation and state continuity

On primary list destinations use up to five labelled navigation entries: Home, Activity, DMs, Channels and More. More exposes Threads, Calls, Voice, Events, Forums, Drafts, Later, Files and permitted administration without an endless icon rail. Search and workspace switching remain discoverable in the header. Lists restore their selected filters and scroll location when returning from a detail.

Inside a conversation, thread, form, call or other focused detail, the primary bottom bar is replaced by contextual controls. Header Back returns to the owning list or parent conversation; More and the workspace/navigation trigger remain reachable. Do not stack a bottom navigation bar below a composer and an active-call toolbar. An active call uses a compact strip below the header with Return, microphone state and Leave; opening the full call replaces the primary surface while keeping drafts intact.

Use canonical routes and validated panel/query state from [routes](routes.md), not an independent mobile router. Browser/OS Back unwinds a detail or dialog before leaving its source; a directly opened detail has an explicit parent link. A close action restores focus to the original control when it still exists. Route changes do not steal focus back into a composer after the user chose another control. Never capture system edge gestures to invent navigation.

Changing orientation or resizing must preserve selected conversation, unsent text, pending mutation identity, in-progress upload, open thread, media connection and playback position where the platform permits. A call cannot be kept alive by layout promises when the OS suspends the browser; show truthful reconnect/ended state on resume.

## Viewport, keyboard and composer contract

Define one height/scroll owner for the app shell, a header and optional call strip, one scrolling message region, and a composer in the remaining layout. Use `min-width: 0` / `min-height: 0` where flex/grid children must shrink, rather than nested arbitrary fixed heights. Respect top/bottom/side safe-area insets exactly once at shell edges. The keyboard and browser chrome can affect the visual viewport differently; dynamic viewport units alone are not proof that Send remains visible. [MDN viewport behavior](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/CSSOM_view/Viewport_concepts), [safe-area environment values](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/env)

Start with CSS layout and dynamic viewport sizing plus sensible fallbacks. If supported-device tests reveal occlusion, use a narrow, cleaned-up VisualViewport integration for the affected shell rather than per-component resize hacks. Distinguish pinch zoom from keyboard appearance; do not counteract zoom or infer keyboard state solely from any height change. VirtualKeyboard API support is feature-detected progressive enhancement, not required for the app to work. [VisualViewport](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport), [VirtualKeyboard API](https://developer.mozilla.org/en-US/docs/Web/API/VirtualKeyboard_API)

Composer requirements:

- Text, attachment button and Send stay reachable above the keyboard, including landscape and expanded multiline input. Collapse optional formatting into a labelled menu before hiding content or shrinking hit targets.
- Use a 16px default for editable text controls on compact screens; allow user text enlargement and browser zoom. Message body defaults to 16px/24px on compact screens, adjusting density through explicit preferences rather than reducing legibility.
- On a touch software keyboard, Enter inserts a newline by default; explicit Send sends. A user-configured physical-keyboard Enter preference remains available and IME composition must never accidentally submit.
- Grow the editor only within a bounded share of available height; when very short, allow its text region to scroll while Send and Close remain accessible. Do not leave the entire conversation trapped behind an expanding editor.
- Keep mentions, emoji and attachment choices within the visual viewport. Opening them cannot discard selection or text. File pickers and camera permission denial return to the same draft.
- Preserve the visible message anchor when the keyboard opens/closes; only remain at bottom if the user was already following the latest message. New replies and image decoding do not force readers to the bottom.
- Sending clears input only according to acknowledged/optimistic recovery rules; rotate, background/resume and network failure never create a second send intent.

## Touch, keyboard and accessibility

Adopt **44×44px minimum product hit areas for standalone touch controls**, with 48px preferred for primary Send, Join, Leave and destructive-confirmation buttons. Icons can be visually smaller inside the hit area. Space adjacent controls so expanded hit areas never overlap. Inline prose links remain readable and follow the accessibility exceptions; do not inflate every word into a button. This product target is stricter than WCAG 2.2 AA's 24px target-size rule and its exceptions. [W3C target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)

Every hover action also has an explicit touch and keyboard path. Messages expose a More actions control; long press may be an additional shortcut, never the only way to reply/react/edit. Preserve text selection and system copy menus. Dragging sidebar entries, workflow steps or attachments requires equivalent Move up/down/choose controls. Swipes are optional and must not cause irreversible actions or interfere with browser Back.

Dialogs/sheets have one active modal layer, clear title/close, bounded scrolling, focus containment and focus return. Form labels stay visible, errors sit near fields, and validation scrolls/focuses the first invalid field without hiding it behind fixed chrome. Permission prompts, reauthentication, offline status and call consent remain understandable to VoiceOver/TalkBack. Respect reduced motion, increased text size, landscape and an external keyboard. Never disable pinch zoom, force portrait orientation or use color/movement alone for microphone/recording state.

## Complete route-family adaptation

Every route pattern must record its own enabled/absent status and mobile result; this grouping prevents entire product areas being forgotten.

| Routes | Surface family | Compact-screen design and mandatory scenario |
|---|---|---|
| R01–R07 | Landing, sign-in, invitations, workspaces, onboarding | One form/step, readable invite scope, OAuth return preserves destination; keyboard-open errors and expired invite |
| R08–R17 | Account, notifications, security/privacy, help/legal | Section list → detail; stacked labelled controls; quiet-hours picker, session revoke and recovery with enlarged text |
| R18–R30 | Home, inboxes, DMs, compose, drafts, scheduled, Later, channels | Paged rows, wrapping filter chips, explicit selection; draft resume, unread jump and schedule edit with keyboard |
| R31–R34 | Channel conversation, details, people and profiles | One content view at a time; thread/profile replaces conversation; preserve source scroll, member actions and posting controls |
| R35–R37 | Files and search | List → preview/result context; fit media without distorting; filters in a labelled panel; old-message jump and file retry |
| R38–R49 | Workspace settings, admin, cases and requests | Prioritized record rows plus detail, not tiny tables; all fields available; bulk selection/confirmation/partial failure and denied access |
| R50–R58 | Apps, optional billing, emoji/groups, tasks and notes | Installation scopes readable before consent; task form and note conflict use full-page detail; unimplemented billing remains absent |
| R59–R62 | Calls, huddles, voice and stages | Prejoin → stable controls; primary stage plus bounded participant strip; denied devices, interrupted call, audience role and leave |
| R63–R67 | Events, calendar connections and recordings | Agenda is phone default; date/series/timezone edit in stacked form; OAuth return, consent, playback/transcript tabs |
| R68–R70 | Forums and topics | Compact topic rows, accessible tags and compose; accepted-answer jump, lock state and retained draft |
| R71–R78 | Guests, shared channels, safety, workflows, identity, imports, retention | Progressive forms, ordered step editor and effective-permission summaries; dry-run/approval, progress, conflict and irreversible-action review |

Admin tables may show priority columns as labelled rows with full detail available on tap. Keep selection checkboxes and bulk-action scope visible; never hide an action only because its desktop column was removed. A genuine wide comparison table may scroll inside its region, but ordinary member management should not require two-dimensional panning. On a phone, workflow building uses an ordered step list rather than a shrunken node canvas. Events use agenda/day detail instead of squeezing a seven-column week grid into 320px.

## Calls and media on constrained screens

Use one presentation/speaker stage and a capped participant strip, not desktop gallery density. Controls for mute, camera, More and Leave remain reachable in portrait/landscape and with captions open. Limit visible camera subscriptions based on actual rendered area and device/network capability; stop offscreen video decoding where supported while preserving required audio. Keep recording/consent and connection state visible when other chrome collapses. Do not require hover for speaker selection, participant moderation or captions.

Microphone/camera/share capabilities depend on browser and OS, not viewport width. Feature-detect, test and document the supported matrix. If presentation capture is unavailable, explain that limitation while keeping receive/audio/video functionality where supported. Foreground web calling and native background incoming-call behavior are different promises. W38 must verify native OS integration; a responsive web page alone cannot guarantee background media or system call notifications.

Voice notes preserve cancel/stop and summary input without a decorative waveform taking over the screen. Image preview supports fit-to-screen and native-compatible zoom; retain an explicit close/download path. Video and recordings never autoplay on entering a list. Caption and transcript font size follow user preferences; changing layout preserves playback when feasible.

## Mobile loading and performance budgets

The [performance plan](performance.md) remains authoritative for data/cache ownership. Mobile adds constrained-device verification; serving fewer pixels is not sufficient if the app still loads every hidden feature.

| Area | Required behavior / proposed gate |
|---|---|
| Initial conversation | No RTC, admin editor, recording player or hidden desktop pane code/data on the critical path; requested first page bounded |
| Navigation | One active destination subscription; no parallel mobile/desktop query trees; return uses authorized cache and preserves position |
| Core web metrics | Target p75 LCP ≤2.5s, INP ≤200ms, CLS ≤0.1 on supported real-user mobile traffic; laboratory runs are separate evidence |
| Slow-network fixture | Cold and warm journeys using a recorded 1.6 Mbps down / 750 Kbps up / 150 ms RTT profile; lower-midrange Android plus CPU-throttled desktop reference |
| Images/files | Responsive thumbnails, reserved dimensions, lazy previews; no original multi-megabyte images just to show a small attachment tile |
| Call coexistence | Chat input stays responsive during an 8-person call fixture; bandwidth adaptation favors audio and shared content |
| Background/resume | No promise of continuous timers; reconcile access, unread and delivery intent on resume; no duplicate notifications or sends |
| Memory/data | Bounded history pages, closed-view cleanup, object URL/track disposal and no unbounded prefetch; record heap growth over repeated navigation |

These are proposed gates, not measured results. Publish compressed JS/transfer sizes, request counts, long tasks and device/browser/version with traces, then set explicit bundle ceilings from the first baseline. Do not invent a current kilobyte budget or claim a 10× speedup. Data-saving preferences may reduce media quality and speculative fetches, but must not remove authorized core workflows. Browser network information APIs are optional signals; use safe defaults when unavailable.

## Acceptance matrix and release evidence

The [QA engineer](qa-engineer.md) owns independent confirmation of the applicable MR cases, using actual device/browser evidence rather than inheriting a developer screenshot. Link results and mobile defects to the feature/route entries in [qa-checklist.md](qa-checklist.md). Missing physical-device or assistive-technology access is a named blocker; it cannot be marked passed by emulation alone. After a fix, QA repeats the original mobile reproduction and adjacent navigation/composer/call checks.

| ID | Required pass condition |
|---|---|
| MR01 | Enabled route reflows at 320px; ordinary page has no horizontal overflow or clipped essential controls |
| MR02 | 767/768 and 1199/1200 transitions preserve draft, scroll, selected detail and pending action without duplicate mounts/subscriptions |
| MR03 | Software keyboard, browser bar expansion and safe areas never obscure active input, Send, Close, Join or Leave |
| MR04 | Every hover/drag/swipe interaction has a discoverable touch/keyboard equivalent; standalone touch hit areas meet product target |
| MR05 | Thread/profile/file/task/note detail and Back restore correct source focus/context on direct and contextual navigation |
| MR06 | Orientation, text enlargement, 200% text sizing and 400% desktop zoom/reflow remain usable; zoom is not disabled |
| MR07 | Core send, retry, upload and scheduling preserve user input across permission, network and validation failures |
| MR08 | Phone calls/rooms expose device/consent/reconnect/leave states; browser limitations are truthful and capability-specific |
| MR09 | Admin, invitation, privacy, workflow, import and governance actions can be completed on mobile without hidden required fields |
| MR10 | VoiceOver/TalkBack and external keyboard can navigate, compose, open/close detail and act on errors without focus traps |
| MR11 | Slow-network/CPU fixtures and real-device core performance evidence meet agreed budgets or block the affected rollout |
| MR12 | Account switch, revocation and background resume purge/reconcile private cache and preserve correct send identity |
| MR13 | Localization, RTL and long unbroken content preserve layout, action labels and logical focus order |
| MR14 | Conditional/absent routes are explicitly recorded; every enabled R01–R78 pattern has coverage, not merely a screenshot of Home |

Required automated widths: 320, 360, 390, 430, 600, 768, 820, 1024, 1280 and 1440px; test breakpoint neighbors and a short landscape viewport such as 844×390. Include loading, empty, populated, error, denied and selected-detail states on each enabled route family. Use fixtures with long names/URLs, 1,000+ message histories, large text, many channels, multiple timezones and localized strings. Avoid screenshot-only checks: assert action reachability, state preservation and absence of page overflow.

Required physical coverage: iPhone Safari, Android Chrome on a lower-midrange device, and a tablet in portrait/landscape/split view. At release, record current and previous supported major OS/browser versions rather than assuming a permanent version list. If installed-web-app mode is offered, test it separately. Device emulation does not validate the actual software keyboard, permission prompts, audio routing, app switching or OS suspension. Test at least one screen reader per mobile OS and a hardware keyboard on tablet.

Evidence record: route/feature IDs, device/OS/browser, CSS viewport, orientation/text scale, keyboard state, network, steps, expected/actual, screenshot or short capture, trace and blocker owner. A mobile defect affecting Send, Leave, auth, access, destructive confirmation or data preservation blocks release of that surface. Cosmetic issues are prioritized separately; passing desktop checks cannot waive a mobile blocker.

## Implementation sequencing and estimate treatment

All adaptive work follows [TDD](tdd.md). Write the relevant MR behavior/layout assertion before its fix, then prove it across compact/tablet breakpoints and the applicable device checks. The requirement [test matrix](test-matrix.md) maps feature-level cases; route evidence retains its own MR references. Keyboard, focus, touch and orientation bugs receive permanent regressions wherever automatable, plus physical checks for behavior emulation cannot reproduce. A mobile screenshot by itself is not test coverage.

W16 owns responsive shell, layout modes, touch primitives, modal/form sizing and viewport/composer foundation. W08 owns scroll anchors. W13 owns keyboard/IME/draft correctness. W17 owns responsive motion tokens and reduced-motion adaptations. W18 owns route/device regression and physical verification. W21–W39 each own mobile behavior and feature-specific motion for their new surface; W31–W33 specifically own phone media/event/artifact flows. W38 remains dedicated clients, not an excuse to postpone mobile web.

Sequence: inspect/measure core phone journey → fix shell and single-pane navigation → keyboard/composer and message actions → detail/list/form patterns → apply per-feature → device/network/accessibility verification. Produce 390px and 820px reference states alongside desktop for each feature; include 320px and keyboard-open acceptance before closure. Do not ship a feature as complete and schedule its mobile adaptation as a later polish task.

The existing plan already allocates responsive/UI work to W16, per-feature packages and W18. This specification strengthens their acceptance criteria and does not add a duplicate implementation package or arbitrary day estimate. Existing ranges remain low-confidence: re-estimate those packages from the device audit and measured fixes before committing to dates. The one-day candidate must pass its mobile core or remain a documented internal candidate; the full feature set is phased without weakening mobile requirements.
