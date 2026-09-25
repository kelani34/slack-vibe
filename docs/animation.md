# Motion and animation specification

[Index](README.md) · [Design](design.md) · [Direct messages](direct-messages.md) · [Performance](performance.md) · [Testing](testing.md)

## Direct-message motion coverage

[Direct messages](direct-messages.md) applies this catalogue to the DM list, focused conversation, stacked participant avatars, typing/presence, notification badges, mobile Back transitions and call dock. The list uses precise row entrance, selection, unread and participant-change feedback while keeping peer identity and ordering stable when someone is reading. Group avatar stacks use a short, spatially anchored join/leave transition; the screen reader still receives the complete participant list immediately. Group creation, add-member boundaries, block/report and call consent remain usable with reduced motion and never wait for an exit animation before focus or authorization changes take effect.

## Motion coverage for new collaboration features

F69–F78 reuse M01–M30 timing and behavior; their [UI contract](collaboration-features.md#ui-and-motion-contract) describes the component-level motion. Poll choices acknowledge selection with a compact check/fill transition; newly revealed aggregate results enter together without number-counting delay. Tasks animate completion and reassignment status in place. Notes animate panel entry and save/conflict feedback without moving text under the editor. Custom emoji can use a deliberate hover/press response while remaining static in ordinary conversation. Voice recording animates its live meter only while recording is visible, with factual elapsed time, permission status and no automatic playback. Groups, templates, keywords and saved searches use carefully staged menus, selection feedback and validation transitions while keyboard highlights update immediately.

## Calling and calendar motion rules

[Call screen design](calls-and-meetings.md#ui-specification-and-motion) includes immediate mute/camera/keyboard response plus crisp call entry, dock expansion, tile join/leave, screen-share takeover, speaker emphasis, raised-hand queue, caption arrival and reconnection transitions. Tile movement should be coordinated and stable rather than reactive jitter; a speaker indicator can transition without changing participant order. Caption lines, recording state and connection warnings remain readable without animation, and recording/microphone status always has persistent text/icon semantics. Calendar views, event confirmation, moderation and admin flows inherit the same motion language; motion makes the state transition legible without hiding dates, consent or authority.

## Direction and source interpretation

Motion is subject to [TDD](tdd.md): write reduced-motion, interruption, final-state, focus and cleanup assertions before adding behavior. Use controlled clocks for deterministic transitions and real browser checks for blocking overlays/layout effects. Visual baselines are reviewed changes; avoid asserting every intermediate animation frame or internal tween call when the contract is operability and continuity.

On phones/tablets, follow [mobile continuity requirements](mobile-responsive.md): orientation, keyboard and breakpoint changes preserve reading/input state. Animate navigation sheets, bottom composers, call docks, stacked-avatar changes and media-panel transitions with the same spatial origins as desktop, adapted to touch-sized geometry. Never animate viewport height, scroll anchors or composer position to imitate keyboard movement. Touch response must feel immediate on the slow-device fixture; remove per-frame layout work and reduce travel/overlap before reducing intentional motion coverage.

The user's direction is a **motion-rich product with clean, precise animation across the app**. The specification therefore covers every major surface and the transitions between its meaningful states. The target is high craft and high coverage: motion clarifies identity, hierarchy, action and continuity. It should feel responsive rather than noisy; no sequence delays reading, keyboard input, permission changes or media controls.

Emil Kowalski's [You Don't Need Animations](https://emilkowal.ski/ui/you-dont-need-animations) emphasizes purpose, frequency and responsiveness. Apply that here through instant keyboard selection and short, non-blocking feedback. His [Good vs Great Animations](https://emilkowal.ski/ui/good-vs-great-animations) informs trigger-relative origins and deliberate easing. The exact values below are project proposals, not copied source requirements.

## Motion rules

1. State changes immediately; motion may explain that state, never delay it.
2. Repeated actions use a quicker, smaller version of the same visual language. Channel switches, cached data, caret movement, keyboard highlighting and pagination remain immediate, with only a short, non-blocking content-continuity transition where it improves orientation.
3. Every enter/exit pair has a consistent spatial origin. Menus originate at their trigger, sheets at their edge, contextual panels at their own side.
4. New input interrupts existing motion from its current visual position. Do not queue repeated toggles or restart from an obsolete starting point.
5. Transform/opacity are preferred. Avoid per-frame width/height/padding/layout animation and large blur effects.
6. Finite motion is broadly used for important state changes. Infinite motion is reserved for meaningful, visible activity such as live recording or typing; stop when hidden, offscreen, reduced-motion, or no longer relevant.
7. Motion never controls server acknowledgement, authorization, focus correctness or data deletion.

## Token proposals

| Token | Value | Use |
|---|---|---|
| `motion-instant` | 0ms | Keyboard selection, cached content, read markers |
| `motion-press` | 90ms | Tactile pointer/touch press response |
| `motion-fast` | 120–140ms | Hover, tooltip, icon and count feedback |
| `motion-standard` | 160–190ms | Menu/dialog enter and compact state changes |
| `motion-panel` | 210–240ms | Context panel, thread or mobile sheet enter |
| `motion-emphasis` | 240–280ms | Coordinated media, avatar-stack and larger state changes |
| `motion-exit` | 110–150ms | Dismissal, faster than entry |
| `ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | Small entering surfaces |
| `ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | User-triggered movement between positions |
| Small travel | 2–4px | Menus/tooltips/feedback |
| Panel travel | 8–12px | Contextual panel, not entire app |
| Press scale | 0.98 | Pointer button feedback only; no text blur from large scale |

### D05 foundation implementation

The duration, easing, travel and short-stagger values above are available as shared CSS custom properties in `src/app/globals.css`. The existing group-DM avatar stack and message-target highlight consume these tokens. Shared Button surfaces also give a 90ms, 0.98-scale active press and a 130ms release; their transform, text and fill animate while border and focus-ring changes remain immediate. Under `prefers-reduced-motion: reduce`, shared duration, delay and travel become zero and the press scale becomes 1; the message target retains a static outline so the location cue remains visible. A design-token contract verifies the values, reduced-motion overrides and consumers. Browser evidence [B22](browser-assessment.md) verifies the group-DM surface, and [B23](browser-assessment.md) confirms a visible keyboard focus ring without layout movement; neither measures press timing or emulates reduced motion. This is the motion foundation only: it does not mean M01–M30 or feature-level interruption/cleanup behavior is implemented.

Avoid uncontrolled bounce and elastic overshoot. A damped spring-like settle may be used for a meaningful object or media transition when it is interruptible and does not make text or controls wobble. Under reduced motion, remove displacement and choreography; preserve the state change with an instant update, short opacity/color transition or static equivalent. Do not stretch a simple transition to 300–500ms for polish.

## Interaction catalogue

Every row defines intended behavior when that feature is enabled. Day one only applies rows for the exposed scope; later features do not justify shipping inactive animation code.

| ID | Interaction | Trigger and normal motion | Reduced motion / interruption / constraint |
|---|---|---|---|
| M01 | Initial shell load | Shell paints immediately; nav, header and first content settle in a short overlapping 20ms stagger, ≤180ms total | Same final state, no stagger; never delay usable content |
| M02 | Workspace switch | Selection responds immediately; clear old private data at the scope boundary, then animate the new shell/content state in place | Cancel old requests/subscriptions; never crossfade another workspace's private data |
| M03 | Channel switch | Cached timeline is usable immediately; message surface uses a 120–160ms opacity/4px continuity transition; show a shaped skeleton only on miss | Same data timing; no full-page slide or wait for motion |
| M04 | Navigation hover | 100–120ms background/text transition | Instant; keyboard selection always instant |
| M05 | Pointer button press | Scale 1→0.98, 80ms, release 120ms | Color/pressed state only; release outside cancels |
| M06 | Focus ring | Immediate visible focus | Always immediate; never animate away keyboard focus |
| M07 | Menu/popover | Opacity + scale 0.97→1, 150–180ms from trigger origin; nested menu transitions share the origin | No travel; reverse from current visual state |
| M08 | Tooltip | Initial dwell around 400ms; 110–130ms fade, 2–3px travel; content swap fades without resetting exploration | No travel; subsequent tooltip changes in the same exploration are immediate |
| M09 | Dialog | 170–190ms opacity/scale 0.98→1; backdrop fades independently; confirmation state transitions in place | Instant or short opacity; focus moves without waiting |
| M10 | Mobile navigation sheet | Translate from edge with opacity, 200–230ms; selected destination and sheet transition remain one interaction | Immediate or opacity only; preserve Escape/back behavior and focus trap |
| M11 | Thread open/close | Detail pane fades + 8–12px travel, 190–220ms; close reverses from its current state | No travel; opening never steals main scroll position |
| M12 | Profile/thread replacement | Immediate content state; optional 100ms opacity | No sequential exit-then-enter delay; Back restores context |
| M13 | Submit message | Pending row appears immediately with a 120–160ms opacity/4px settle; attachment chips enter in a short sequence | Instant state; never animate historical rows or change acknowledgement timing |
| M14 | Remote message arrival | New row enters with a 100–140ms fade/3px rise when at the bottom; new-message affordance animates when reading history | No list movement while reading history; the control receives the feedback instead |
| M15 | Acknowledgement | Pending/sent state morphs in place with a 120–150ms icon and color transition | Instant; stable row key and geometry |
| M16 | Failed send / retry | Inline error/status fades and settles in place over 140–180ms; retry feedback confirms the same intent | Instant state; retry reuses intent and preserves focus |
| M17 | Edit message | Editor and saved-state indicators transition in place over 120–160ms; preserve content geometry where possible | Preserve caret and scroll; cancel restores prior content without a height tween |
| M18 | Delete message | Tombstone fades in and content fades out over 120–160ms; anchor restoration controls any layout change | Static final state or brief opacity; no dramatic collapse |
| M19 | Reaction | Count/selected state updates immediately; selected emoji gets a tight 130–170ms fill/scale settle | Instant; no confetti, uncontrolled overshoot or repeated bouncing |
| M20 | Bookmark/star/pin | Icon fill/shape and confirmation color transition over 120–160ms; pinned state appears in context | Instant; rollback reflects server rejection accurately |
| M21 | Typing | Reserved-height indicator enters in 120ms; subtle low-amplitude dots/opacity cycle while active | Static text or dots; stop on expiry/background; do not announce each cycle |
| M22 | New-message/unread badge | Count changes immediately with a brief 120–150ms scale/color transition; no layout shift | Instant; stable badge geometry |
| M23 | Jump to message | After row is mounted, scroll if user requested; highlight fades once over ~700ms | Instant scroll and static brief highlight; never wait fixed 500/600ms for loading |
| M24 | Older-history prepend | No entry animation; restore anchor | Same; layout stability is the visual quality |
| M25 | Search/filter results | Keyboard highlight is immediate; retained results crossfade into the new result set over 100–140ms; matched terms receive restrained emphasis | Instant; cancel stale result application |
| M26 | Upload progress | Real-byte progress interpolates smoothly over 100–160ms; preview-ready state transitions when confirmed | Immediate values; no fake progress or perpetual loop after failure |
| M27 | Attachment preview | Viewer opacity/scale enter in 170–210ms; optional thumbnail-to-viewer shared transition after profiling; focus returns on exit | Fade/instant; no large image zoom across viewport by default |
| M28 | Toast | Spatially consistent 150–180ms entrance and 110–140ms exit; distinct icon/text states; deduplicate | Minimal opacity; errors also exist near affected content |
| M29 | Form validation/save | Inline message, field border and button status transition over 120–160ms; success acknowledgement settles in place | Instant; no shaking field or moving target |
| M30 | Theme/reconnect/skeleton | Theme color transition is 140–180ms; reconnect status enters clearly; skeleton uses a subtle moving shimmer while loading | Static skeleton/no displacement; stop motion when loading ends or tab is hidden |

## Expanded-route motion coverage

The additional [production destinations](routes.md) reuse the existing catalogue. Home and inboxes use M01/M03/M22/M24; search/files use M25–M27; settings/admin use M07/M09/M29; reconnect/help uses M30. Cards, counters, list selection, calendar events, role changes and workflow run states receive appropriate state feedback without changing their underlying action timing. Table keyboard selection and navigation remain instant. New data does not reorder rows under a reader. Pending jobs expose factual status; visible live activity may animate, but no offscreen or completed job runs a decorative loop.

## Implementation technology decision

Use existing CSS transitions, `tw-animate-css`, Radix state attributes and Sonner for simple, frequent transitions. Prototype a scoped timeline engine for complex sequences such as call-stage changes, shared-element attachment previews and coordinated avatar stacks; GSAP with `@gsap/react` is the current candidate because it supports interruptible, scoped timelines. Measure bundle size and low-end mobile frame time before choosing it. Do not spread a JavaScript runtime across components that need only CSS state transitions.

If later measured requirements need coordinated, interruptible multi-element timelines, evaluate GSAP with `@gsap/react` as the preferred JavaScript candidate. Keep it scoped to that interaction and lazy-loaded if meaningful to the bundle. Use refs and lifecycle cleanup; GSAP's [React guidance](https://gsap.com/resources/React/) describes its scoped `useGSAP`/context pattern. Installing GSAP is not part of this assessment and not a day-one task.

Avoid running CSS and JS animation on the same transform. Do not use ScrollTrigger or scroll-smoothing on the conversation timeline: native scrolling, virtualized anchors and user reading position take precedence. A height-changing panel should settle layout once and animate a child transform/opacity rather than continuously reflowing all message rows.

## Lifecycle and accessibility contract

Read `prefers-reduced-motion` at the component/style boundary. A future app setting can reduce further, never override an OS request for less motion with more motion. Do not depend solely on setting CSS duration to zero when JS timers still delay unmount/focus.

Menu/dialog primitives remain responsible for focus and inertness. Opacity zero is not sufficient to hide interactive controls from pointer or keyboard input. On exit, remove/inert the surface according to the primitive contract and restore focus to a surviving logical trigger.

Cancel timers, animation frames and tweens on unmount/scope change. Rapidly open/close a pane five times and ensure it lands in the final requested state with no invisible overlay. Unread/typing indicators should not cause repeated screen-reader announcements.

## Performance and review checklist

- Profile send + new remote message + open thread under the reference CPU/network profile.
- Keep frame work within [performance budgets](performance.md); no animation-induced long task above 50ms in the tested sequence.
- Animate visible elements only; historical message loads are static. Do not promote every row with `will-change`.
- Verify no cumulative layout shift from reserved media/typing space; inspect actual paint/layout costs.
- Review at normal speed first, then slow playback to catch origin/exit mismatches. Pass only if daily repetition remains comfortable.
- Test reduced motion, keyboard-only, touch, rapid repeated actions, reconnect, and navigation during an exit.

Motion completion is evidence-based: broad coverage of meaningful feature states, precise timing and spatial continuity, immediate task response, correct interruption, accessible reduced-motion behavior and no mobile frame or loading regression. Coverage is expected; adding movement with no explanatory or interaction value is not.
