# Delivery traceability: no silent feature or route omissions

[Index](README.md) · [Phase plan](delivery-plan.md) · [Cases](acceptance-cases.md) · [Feature contracts](features.md) · [Route contracts](routes.md) · [QA ledger](qa-checklist.md)

This is a **planned** mapping, not a completion dashboard. The current DM/core-message slice has local automated evidence, while most feature and independent QA entries remain outstanding. Tables cover 90 catalogue capabilities, 108 F requirements and 78 routes. W01–W39 are all accounted for in the phase plan; W20 has no separate implementation allocation, and W18/W19 run continuously. F48 is a traced historical umbrella, not an extra executable capability.

A phase denotes where the primary scoped work is scheduled. A feature with multiple packages closes only after all its applicable package/QA gates, and later integrations must rerun its regression cases. Cross-cutting requirements F04/F40–F45 are never "finished once" while new surfaces can violate them. Every product row also inherits access, responsiveness, accessibility, performance, operations and TDD requirements even when those IDs are not repeated.

## All 90 product capabilities

The numbered product list remains authoritative in [features](features.md#the-actual-product-feature-list). QA item QF uses the same catalogue number. Phase values below are the union of the mapped requirements' primary work, not permission to skip a prerequisite.

| Catalogue / QA | Capability | Requirements | Scheduled phase scope |
|---|---|---|---|
| 1 / QF01 | GitHub sign-in and account access | F01 | P00, P01 |
| 2 / QF02 | Guided onboarding | F56 | P04 |
| 3 / QF03 | Multiple workspaces | F02 | P01 |
| 4 / QF04 | Workspace invitations | F03, F60 | P01, P04 |
| 5 / QF05 | Public channel discovery | F07 | P01, P04 |
| 6 / QF06 | Private channels | F07, F09 | P01, P04 |
| 7 / QF07 | Channel membership management | F08 | P01, P04 |
| 8 / QF08 | Channel information | F09 | P04 |
| 9 / QF09 | Channel archiving | F10 | P03, P04 |
| 10 / QF10 | Restricted posting | F11 | P01, P04 |
| 11 / QF11 | Favorite conversations | F12 | P02, P03 |
| 12 / QF12 | Direct messages | F13 | P03 |
| 13 / QF13 | Group direct messages | F14 | P05 |
| 14 / QF14 | Rich-text messaging | F16 | P01, P03 |
| 15 / QF15 | Reliable sending and retry | F17 | P01, P02 |
| 16 / QF16 | Message editing and deletion | F18 | P01, P03 |
| 17 / QF17 | Threaded replies | F19 | P01, P02 |
| 18 / QF18 | Emoji reactions | F20 | P02, P03 |
| 19 / QF19 | Person mentions | F21 | P01, P03 |
| 20 / QF20 | Message forwarding | F22 | P03 |
| 21 / QF21 | Message links and history jumps | F15, F23 | P01, P02, P04 |
| 22 / QF22 | Unread management | F24, F50 | P02, P04 |
| 23 / QF23 | Recoverable drafts | F25, F53 | P03, P04 |
| 24 / QF24 | Typing indicators | F26 | P01, P02 |
| 25 / QF25 | Scheduled messages | F28 | P03 |
| 26 / QF26 | File attachments | F29 | P03 |
| 27 / QF27 | File preview and download | F30 | P02, P03 |
| 28 / QF28 | Advanced search | F31, F55 | P04 |
| 29 / QF29 | Pinned messages | F32 | P03 |
| 30 / QF30 | Personal saved items | F33, F65 | P03, P04 |
| 31 / QF31 | Activity and notification inbox | F34 | P03 |
| 32 / QF32 | Email and push notifications | F35 | P05 |
| 33 / QF33 | People directory and profiles | F06, F36 | P01, P03 |
| 34 / QF34 | Hide and unhide people | F37 | P03 |
| 35 / QF35 | Presence and personal status | F38, F67 | P02, P03, P04 |
| 36 / QF36 | Keyboard command navigation | F39 | P02, P04 |
| 37 / QF37 | Personal display and composer settings | F41, F58 | P02, P04, recheck every phase |
| 38 / QF38 | Offline reading and queued sending | F46 | P05 |
| 39 / QF39 | Integrations and bots | F47 | P13 |
| 40 / QF40 | Personal workday Home | F49 | P04 |
| 41 / QF41 | Followed-thread inbox | F51 | P04 |
| 42 / QF42 | Global message composition | F53 | P03, P04 |
| 43 / QF43 | Workspace file library | F54 | P03, P04 |
| 44 / QF44 | Mute, quiet hours and notification policy | F57 | P04 |
| 45 / QF45 | Device and session management | F59 | P04 |
| 46 / QF46 | Workspace roles and administration | F05, F61 | P04 |
| 47 / QF47 | Reporting and moderation | F62 | P04 |
| 48 / QF48 | Privacy and data controls | F63 | P04 |
| 49 / QF49 | Personal reminders | F65 | P04 |
| 50 / QF50 | Channel resource collection | F66 | P04 |
| 51 / QF51 | Channel polls | F69 | P08 |
| 52 / QF52 | Voice notes | F70 | P08 |
| 53 / QF53 | Custom workspace emoji | F71 | P08 |
| 54 / QF54 | User groups and group mentions | F72 | P08 |
| 55 / QF55 | Channel templates | F73 | P08 |
| 56 / QF56 | Announcement acknowledgements | F74 | P08 |
| 57 / QF57 | Tasks from messages | F75 | P08 |
| 58 / QF58 | Shared channel notes | F76 | P08 |
| 59 / QF59 | Keyword notification rules | F77 | P08 |
| 60 / QF60 | Saved searches | F78 | P08 |
| 61 / QF61 | Voice calls | F79 | P06 |
| 62 / QF62 | Video calls | F80 | P06 |
| 63 / QF63 | Drop-in huddles | F81 | P06 |
| 64 / QF64 | Screen and application sharing | F82 | P06 |
| 65 / QF65 | Persistent voice rooms | F83 | P06 |
| 66 / QF66 | Stages and town halls | F84 | P10 |
| 67 / QF67 | Meeting and event scheduling | F85 | P07 |
| 68 / QF68 | Recurring meetings | F86 | P07 |
| 69 / QF69 | Calendar connections and availability | F87 | P07 |
| 70 / QF70 | RSVPs and event reminders | F88 | P07 |
| 71 / QF71 | Call history and missed calls | F89 | P06 |
| 72 / QF72 | Live captions | F90 | P09 |
| 73 / QF73 | Meeting recordings | F91 | P09 |
| 74 / QF74 | Transcripts, summaries and action items | F92 | P09 |
| 75 / QF75 | Forum and Q&A channels | F93 | P10 |
| 76 / QF76 | Channel categories and custom sidebar sections | F94 | P10 |
| 77 / QF77 | Custom roles and channel overrides | F95 | P10 |
| 78 / QF78 | Scoped guest access | F96 | P12 |
| 79 / QF79 | Cross-workspace shared channels | F97 | P12 |
| 80 / QF80 | Community onboarding and member screening | F98 | P10 |
| 81 / QF81 | Automated moderation and anti-raid controls | F99 | P10 |
| 82 / QF82 | Slow mode and channel lockdown | F100 | P10 |
| 83 / QF83 | Workflow automations | F101 | P13 |
| 84 / QF84 | App directory and installation management | F102 | P13 |
| 85 / QF85 | Slash commands and webhooks | F103 | P13 |
| 86 / QF86 | Workspace import and migration | F104 | P11 |
| 87 / QF87 | Enterprise sign-in and provisioning | F105 | P11 |
| 88 / QF88 | Mobile and desktop clients | F106 | P14 |
| 89 / QF89 | Localization and optional message translation | F107 | P14 |
| 90 / QF90 | Advanced retention and legal-hold administration | F108 | P11 |

## All 108 requirement mappings

Each executable requirement links directly to its six planned scenario IDs, supplemented by U01–U24 and applicable route/integration cases. [test-matrix](test-matrix.md) owns layer selection and first-test intent; this table owns scheduling traceability.

| Requirement | Behavior | Package owners | Primary phases | Planned acceptance cases |
|---|---|---|---|---|
| F01 | GitHub sign-in/session | W01, W02 | P00, P01 | [TC-F01-01…06](acceptance-cases.md#f01-github-sign-insession) |
| F02 | Workspace create/list/switch | W04 | P01 | [TC-F02-01…06](acceptance-cases.md#f02-workspace-createlistswitch) |
| F03 | Invite-code join | W02, W15 | P01, P04 | [TC-F03-01…06](acceptance-cases.md#f03-invite-code-join) |
| F04 | Tenant and resource authorization | W02, W03 | P01 | [TC-F04-01…06](acceptance-cases.md#f04-tenant-and-resource-authorization) |
| F05 | Workspace administration | W15 | P04 | [TC-F05-01…06](acceptance-cases.md#f05-workspace-administration) |
| F06 | Member directory | W02, W13 | P01, P03 | [TC-F06-01…06](acceptance-cases.md#f06-member-directory) |
| F07 | Public/private channel creation and browsing | W02, W15 | P01, P04 | [TC-F07-01…06](acceptance-cases.md#f07-publicprivate-channel-creation-and-browsing) |
| F08 | Join/leave/add/remove members | W02, W15 | P01, P04 | [TC-F08-01…06](acceptance-cases.md#f08-joinleaveaddremove-members) |
| F09 | Channel metadata and privacy | W15 | P04 | [TC-F09-01…06](acceptance-cases.md#f09-channel-metadata-and-privacy) |
| F10 | Archive/unarchive/delete | W10, W15 | P03, P04 | [TC-F10-01…06](acceptance-cases.md#f10-archiveunarchivedelete) |
| F11 | Posting permissions | W02, W15 | P01, P04 | [TC-F11-01…06](acceptance-cases.md#f11-posting-permissions) |
| F12 | Starred channels | W05, W10 | P02, P03 | [TC-F12-01…06](acceptance-cases.md#f12-starred-channels) |
| F13 | One-to-one DMs | W12 | P03 | [TC-F13-01…06](acceptance-cases.md#f13-one-to-one-dms) |
| F14 | Group DMs | W39 | P05 | [TC-F14-01…07](acceptance-cases.md#f14-group-dms) |
| F15 | Recent/history channel read | W04, W05, W08 | P01, P02 | [TC-F15-01…06](acceptance-cases.md#f15-recenthistory-channel-read) |
| F16 | Rich-text composition | W04, W13 | P01, P03 | [TC-F16-01…06](acceptance-cases.md#f16-rich-text-composition) |
| F17 | Send/pending/retry | W04, W06 | P01, P02 | [TC-F17-01…12](acceptance-cases.md#f17-sendpendingretry) |
| F18 | Edit/delete messages | W04, W10 | P01, P03 | [TC-F18-01…06](acceptance-cases.md#f18-editdelete-messages) |
| F19 | Threads | W04, W06, W08 | P01, P02 | [TC-F19-01…06](acceptance-cases.md#f19-threads) |
| F20 | Emoji reactions | W06, W10 | P02, P03 | [TC-F20-01…06](acceptance-cases.md#f20-emoji-reactions) |
| F21 | Mentions | W04, W11, W13 | P01, P03 | [TC-F21-01…06](acceptance-cases.md#f21-mentions) |
| F22 | Forwarding | W12 | P03 | [TC-F22-01…06](acceptance-cases.md#f22-forwarding) |
| F23 | Message permalinks and jump | W08, W14 | P02, P04 | [TC-F23-01…06](acceptance-cases.md#f23-message-permalinks-and-jump) |
| F24 | Channel unread markers/counts | W05, W06 | P02 | [TC-F24-01…06](acceptance-cases.md#f24-channel-unread-markerscounts) |
| F25 | Drafts | W13 | P03 | [TC-F25-01…06](acceptance-cases.md#f25-drafts) |
| F26 | Typing indicators | W03, W06 | P01, P02 | [TC-F26-01…06](acceptance-cases.md#f26-typing-indicators) |
| F27 | Reconnect and multi-tab | W06 | P02 | [TC-F27-01…06](acceptance-cases.md#f27-reconnect-and-multi-tab) |
| F28 | Scheduled messages | W07 | P03 | [TC-F28-01…06](acceptance-cases.md#f28-scheduled-messages) |
| F29 | Attachment upload | W09 | P03 | [TC-F29-01…06](acceptance-cases.md#f29-attachment-upload) |
| F30 | File/image preview/download | W09, W17 | P02, P03 | [TC-F30-01…06](acceptance-cases.md#f30-fileimage-previewdownload) |
| F31 | Search/filter | W14 | P04 | [TC-F31-01…07](acceptance-cases.md#f31-searchfilter) |
| F32 | Pins | W10 | P03 | [TC-F32-01…06](acceptance-cases.md#f32-pins) |
| F33 | Bookmarks/saved items | W10 | P03 | [TC-F33-01…06](acceptance-cases.md#f33-bookmarkssaved-items) |
| F34 | In-app notifications | W11 | P03 | [TC-F34-01…06](acceptance-cases.md#f34-in-app-notifications) |
| F35 | Email/push delivery | W39 | P05 | [TC-F35-01…06](acceptance-cases.md#f35-emailpush-delivery) |
| F36 | Profiles/edit profile | W13 | P03 | [TC-F36-01…06](acceptance-cases.md#f36-profilesedit-profile) |
| F37 | Hide/unhide users | W13 | P03 | [TC-F37-01…06](acceptance-cases.md#f37-hideunhide-users) |
| F38 | Online/away/offline presence | W06, W13 | P02, P03 | [TC-F38-01…06](acceptance-cases.md#f38-onlineawayoffline-presence) |
| F39 | Search keyboard entry and navigation | W14, W16 | P02, P04 | [TC-F39-01…06](acceptance-cases.md#f39-search-keyboard-entry-and-navigation) |
| F40 | Whole-application mobile responsiveness | W16, W18 | Continuous, P02, recheck every phase | [TC-F40-01…06](acceptance-cases.md#f40-whole-application-mobile-responsiveness) |
| F41 | Themes/tokens/accessibility | W16 | P02, recheck every phase | [TC-F41-01…06](acceptance-cases.md#f41-themestokensaccessibility) |
| F42 | Precision motion | W17 | P02, recheck every phase | [TC-F42-01…07](acceptance-cases.md#f42-precision-motion) |
| F43 | Performance/caching | W05, W08, W14 | P02, P04, recheck every phase | [TC-F43-01…06](acceptance-cases.md#f43-performancecaching) |
| F44 | Automated quality and release verification | W01, W18 | Continuous, P00, recheck every phase | [TC-F44-01…06](acceptance-cases.md#f44-automated-quality-and-release-verification) |
| F45 | Operations/recovery | W19 | Continuous, recheck every phase | [TC-F45-01…06](acceptance-cases.md#f45-operationsrecovery) |
| F46 | Offline read/outbox sync | W39 | P05 | [TC-F46-01…06](acceptance-cases.md#f46-offline-readoutbox-sync) |
| F47 | Integration/API/bot surface | W36 | P13 | [TC-F47-01…06](acceptance-cases.md#f47-integrationapibot-surface) |
| F48 | Advanced-feature umbrella, superseded by detailed scope | W31, W32, W33, W34, W35, W36, W37, W38 | P06, P07, P09, P10, P11, P12, P13, P14 | [Child trace, no dummy test](acceptance-cases.md#f48-advanced-feature-umbrella-superseded-by-detailed-scope) |
| F49 | Personal workspace Home | W22 | P04 | [TC-F49-01…06](acceptance-cases.md#f49-personal-workspace-home) |
| F50 | All-unread inbox | W22 | P04 | [TC-F50-01…06](acceptance-cases.md#f50-all-unread-inbox) |
| F51 | Thread inbox and subscriptions | W22 | P04 | [TC-F51-01…06](acceptance-cases.md#f51-thread-inbox-and-subscriptions) |
| F52 | Direct-message inbox | W12, W22 | P03, P04 | [TC-F52-01…06](acceptance-cases.md#f52-direct-message-inbox) |
| F53 | Draft and send center / global compose | W13, W22 | P03, P04 | [TC-F53-01…06](acceptance-cases.md#f53-draft-and-send-center--global-compose) |
| F54 | Workspace file library | W09, W24 | P03, P04 | [TC-F54-01…06](acceptance-cases.md#f54-workspace-file-library) |
| F55 | Full search destination | W14, W24 | P04 | [TC-F55-01…06](acceptance-cases.md#f55-full-search-destination) |
| F56 | Resumable onboarding and workspace chooser | W21 | P04 | [TC-F56-01…06](acceptance-cases.md#f56-resumable-onboarding-and-workspace-chooser) |
| F57 | Notification policy, mute and quiet hours | W23 | P04 | [TC-F57-01…06](acceptance-cases.md#f57-notification-policy-mute-and-quiet-hours) |
| F58 | Personal appearance/accessibility/composer preferences | W23 | P04 | [TC-F58-01…06](acceptance-cases.md#f58-personal-appearanceaccessibilitycomposer-preferences) |
| F59 | Session/device management and revocation | W23 | P04 | [TC-F59-01…06](acceptance-cases.md#f59-sessiondevice-management-and-revocation) |
| F60 | Invitation lifecycle console | W15, W25 | P04 | [TC-F60-01…06](acceptance-cases.md#f60-invitation-lifecycle-console) |
| F61 | Administrative overview and audit trail | W25 | P04 | [TC-F61-01…06](acceptance-cases.md#f61-administrative-overview-and-audit-trail) |
| F62 | Reporting and moderation cases | W26 | P04 | [TC-F62-01…06](acceptance-cases.md#f62-reporting-and-moderation-cases) |
| F63 | Privacy/data lifecycle and requests | W26 | P04 | [TC-F63-01…06](acceptance-cases.md#f63-privacydata-lifecycle-and-requests) |
| F64 | Help, auth-error and connection recovery | W21 | P04 | [TC-F64-01…06](acceptance-cases.md#f64-help-auth-error-and-connection-recovery) |
| F65 | Later triage and personal reminders | W24, W26 | P04 | [TC-F65-01…06](acceptance-cases.md#f65-later-triage-and-personal-reminders) |
| F66 | Channel resource collection | W24 | P04 | [TC-F66-01…06](acceptance-cases.md#f66-channel-resource-collection) |
| F67 | Expiring status and availability | W23 | P04 | [TC-F67-01…06](acceptance-cases.md#f67-expiring-status-and-availability) |
| F68 | Route, panel and navigation continuity | W21 | P04 | [TC-F68-01…06](acceptance-cases.md#f68-route-panel-and-navigation-continuity) |
| F69 | Channel polls | W27 | P08 | [TC-F69-01…06](acceptance-cases.md#f69-channel-polls) |
| F70 | Voice notes | W28 | P08 | [TC-F70-01…06](acceptance-cases.md#f70-voice-notes) |
| F71 | Custom workspace emoji | W27 | P08 | [TC-F71-01…06](acceptance-cases.md#f71-custom-workspace-emoji) |
| F72 | User groups and group mentions | W29 | P08 | [TC-F72-01…06](acceptance-cases.md#f72-user-groups-and-group-mentions) |
| F73 | Channel templates | W29 | P08 | [TC-F73-01…06](acceptance-cases.md#f73-channel-templates) |
| F74 | Announcement acknowledgements | W29 | P08 | [TC-F74-01…06](acceptance-cases.md#f74-announcement-acknowledgements) |
| F75 | Tasks from messages | W30 | P08 | [TC-F75-01…06](acceptance-cases.md#f75-tasks-from-messages) |
| F76 | Shared channel notes | W30 | P08 | [TC-F76-01…06](acceptance-cases.md#f76-shared-channel-notes) |
| F77 | Keyword notification rules | W27 | P08 | [TC-F77-01…06](acceptance-cases.md#f77-keyword-notification-rules) |
| F78 | Saved searches | W27 | P08 | [TC-F78-01…06](acceptance-cases.md#f78-saved-searches) |
| F79 | Voice calls | W31 | P06 | [TC-F79-01…06](acceptance-cases.md#f79-voice-calls) |
| F80 | Video calls | W31 | P06 | [TC-F80-01…06](acceptance-cases.md#f80-video-calls) |
| F81 | Drop-in huddles | W31 | P06 | [TC-F81-01…06](acceptance-cases.md#f81-drop-in-huddles) |
| F82 | Screen and application sharing | W31 | P06 | [TC-F82-01…06](acceptance-cases.md#f82-screen-and-application-sharing) |
| F83 | Persistent voice rooms | W31 | P06 | [TC-F83-01…06](acceptance-cases.md#f83-persistent-voice-rooms) |
| F84 | Stages and town halls | W34 | P10 | [TC-F84-01…06](acceptance-cases.md#f84-stages-and-town-halls) |
| F85 | Meeting and event scheduling | W32 | P07 | [TC-F85-01…06](acceptance-cases.md#f85-meeting-and-event-scheduling) |
| F86 | Recurring meetings | W32 | P07 | [TC-F86-01…06](acceptance-cases.md#f86-recurring-meetings) |
| F87 | Calendar connections and availability | W32 | P07 | [TC-F87-01…06](acceptance-cases.md#f87-calendar-connections-and-availability) |
| F88 | RSVPs and event reminders | W32 | P07 | [TC-F88-01…06](acceptance-cases.md#f88-rsvps-and-event-reminders) |
| F89 | Call history and missed calls | W31 | P06 | [TC-F89-01…06](acceptance-cases.md#f89-call-history-and-missed-calls) |
| F90 | Live captions | W33 | P09 | [TC-F90-01…06](acceptance-cases.md#f90-live-captions) |
| F91 | Meeting recordings | W33 | P09 | [TC-F91-01…06](acceptance-cases.md#f91-meeting-recordings) |
| F92 | Transcripts, summaries and action items | W33 | P09 | [TC-F92-01…06](acceptance-cases.md#f92-transcripts-summaries-and-action-items) |
| F93 | Forum and Q&A channels | W34 | P10 | [TC-F93-01…06](acceptance-cases.md#f93-forum-and-qa-channels) |
| F94 | Channel categories and custom sidebar sections | W34 | P10 | [TC-F94-01…06](acceptance-cases.md#f94-channel-categories-and-custom-sidebar-sections) |
| F95 | Custom roles and channel overrides | W34 | P10 | [TC-F95-01…06](acceptance-cases.md#f95-custom-roles-and-channel-overrides) |
| F96 | Scoped guest access | W35 | P12 | [TC-F96-01…06](acceptance-cases.md#f96-scoped-guest-access) |
| F97 | Cross-workspace shared channels | W35 | P12 | [TC-F97-01…06](acceptance-cases.md#f97-cross-workspace-shared-channels) |
| F98 | Community onboarding and member screening | W34 | P10 | [TC-F98-01…06](acceptance-cases.md#f98-community-onboarding-and-member-screening) |
| F99 | Automated moderation and anti-raid controls | W34 | P10 | [TC-F99-01…06](acceptance-cases.md#f99-automated-moderation-and-anti-raid-controls) |
| F100 | Slow mode and channel lockdown | W34 | P10 | [TC-F100-01…06](acceptance-cases.md#f100-slow-mode-and-channel-lockdown) |
| F101 | Workflow automations | W36 | P13 | [TC-F101-01…06](acceptance-cases.md#f101-workflow-automations) |
| F102 | App directory and installation management | W36 | P13 | [TC-F102-01…06](acceptance-cases.md#f102-app-directory-and-installation-management) |
| F103 | Slash commands and webhooks | W36 | P13 | [TC-F103-01…06](acceptance-cases.md#f103-slash-commands-and-webhooks) |
| F104 | Workspace import and migration | W37 | P11 | [TC-F104-01…06](acceptance-cases.md#f104-workspace-import-and-migration) |
| F105 | Enterprise sign-in and provisioning | W37 | P11 | [TC-F105-01…06](acceptance-cases.md#f105-enterprise-sign-in-and-provisioning) |
| F106 | Mobile and desktop clients | W38 | P14 | [TC-F106-01…06](acceptance-cases.md#f106-mobile-and-desktop-clients) |
| F107 | Localization and optional message translation | W38 | P14 | [TC-F107-01…06](acceptance-cases.md#f107-localization-and-optional-message-translation) |
| F108 | Advanced retention and legal-hold administration | W37 | P11 | [TC-F108-01…06](acceptance-cases.md#f108-advanced-retention-and-legal-hold-administration) |

## Route delivery and verification

Every route gets `RC-Rnn-01…10` from the [route recipe](acceptance-cases.md#route-case-recipe-for-r01r78), plus its feature-specific cases and QR verdict. Target phases are for the registered canonical pattern; existing legacy screens may be repaired sooner in P00–P03. W21 in P04 owns canonical migration and compatibility. The table schedules routes, not 78 independent engines.

Public privacy/terms R16/R17 require approved content before external release, coordinated in P04; timing is conditional on audience. R52 billing is an explicit unscheduled conditional scope decision because no billing product contract/package has been approved. It must remain absent/server-gated until separately specified, estimated and tested. The 90-feature target does not secretly include subscriptions/payments. Apps R50/R51 are now planned P13 scope, superseding earlier conditional placeholder wording.

| Route / QA | Canonical pattern | Target phase | Later dependency / route-specific note |
|---|---|---|---|
| R01 / QR01 | `/` | P04 | RC recipe + feature contract + applicable MR01–MR14 |
| R02 / QR02 | `/login` | P00 | Actual provider callback verified; B02/B03 are blockers |
| R03 / QR03 | `/auth/error` | P04 | RC recipe + feature contract + applicable MR01–MR14 |
| R04 / QR04 | `/invite/[inviteCode]` | P04 | RC recipe + feature contract + applicable MR01–MR14 |
| R05 / QR05 | `/workspaces` | P04 | RC recipe + feature contract + applicable MR01–MR14 |
| R06 / QR06 | `/create-workspace` | P01 | Transactional owner/default memberships; canonical compatibility in P04 |
| R07 / QR07 | `/onboarding/[step]` | P04 | RC recipe + feature contract + applicable MR01–MR14 |
| R08 / QR08 | `/account/profile` | P04 | RC recipe + feature contract + applicable MR01–MR14 |
| R09 / QR09 | `/account/preferences/[section]` | P04 | Preferences P04; localized/RTL interface P14 |
| R10 / QR10 | `/account/notifications` | P04 | RC recipe + feature contract + applicable MR01–MR14 |
| R11 / QR11 | `/account/security` | P04 | RC recipe + feature contract + applicable MR01–MR14 |
| R12 / QR12 | `/account/privacy` | P04 | RC recipe + feature contract + applicable MR01–MR14 |
| R13 / QR13 | `/help` | P04 | RC recipe + feature contract + applicable MR01–MR14 |
| R14 / QR14 | `/help/shortcuts` | P04 | RC recipe + feature contract + applicable MR01–MR14 |
| R15 / QR15 | `/help/connection` | P04 | RC recipe + feature contract + applicable MR01–MR14 |
| R16 / QR16 | `/privacy` | P04 | Conditional approved policy content before external release |
| R17 / QR17 | `/terms` | P04 | Conditional approved policy content before external release |
| R18 / QR18 | `W` | P04 | RC recipe + feature contract + applicable MR01–MR14 |
| R19 / QR19 | `W/home` | P04 | RC recipe + feature contract + applicable MR01–MR14 |
| R20 / QR20 | `W/activity` | P04 | RC recipe + feature contract + applicable MR01–MR14 |
| R21 / QR21 | `W/unreads` | P04 | RC recipe + feature contract + applicable MR01–MR14 |
| R22 / QR22 | `W/threads` | P04 | RC recipe + feature contract + applicable MR01–MR14 |
| R23 / QR23 | `W/dms` | P04 | RC recipe + feature contract + applicable MR01–MR14 |
| R24 / QR24 | `W/dms/[conversationId]` | P04 | One-to-one P04; group-DM lifecycle P05 |
| R25 / QR25 | `W/compose` | P04 | RC recipe + feature contract + applicable MR01–MR14 |
| R26 / QR26 | `W/drafts` | P04 | RC recipe + feature contract + applicable MR01–MR14 |
| R27 / QR27 | `W/scheduled` | P04 | RC recipe + feature contract + applicable MR01–MR14 |
| R28 / QR28 | `W/later` | P04 | RC recipe + feature contract + applicable MR01–MR14 |
| R29 / QR29 | `W/reminders` | P04 | RC recipe + feature contract + applicable MR01–MR14 |
| R30 / QR30 | `W/channels` | P04 | RC recipe + feature contract + applicable MR01–MR14 |
| R31 / QR31 | `W/channels/[channelId]` | P04 | RC recipe + feature contract + applicable MR01–MR14 |
| R32 / QR32 | `W/channels/[channelId]/details` | P04 | RC recipe + feature contract + applicable MR01–MR14 |
| R33 / QR33 | `W/members` | P04 | RC recipe + feature contract + applicable MR01–MR14 |
| R34 / QR34 | `W/members/[userId]` | P04 | RC recipe + feature contract + applicable MR01–MR14 |
| R35 / QR35 | `W/files` | P04 | RC recipe + feature contract + applicable MR01–MR14 |
| R36 / QR36 | `W/files/[fileId]` | P04 | RC recipe + feature contract + applicable MR01–MR14 |
| R37 / QR37 | `W/search` | P04 | RC recipe + feature contract + applicable MR01–MR14 |
| R38 / QR38 | `W/settings` | P04 | RC recipe + feature contract + applicable MR01–MR14 |
| R39 / QR39 | `W/settings/notifications` | P04 | RC recipe + feature contract + applicable MR01–MR14 |
| R40 / QR40 | `W/admin` | P04 | RC recipe + feature contract + applicable MR01–MR14 |
| R41 / QR41 | `W/admin/members` | P04 | RC recipe + feature contract + applicable MR01–MR14 |
| R42 / QR42 | `W/admin/invitations` | P04 | RC recipe + feature contract + applicable MR01–MR14 |
| R43 / QR43 | `W/admin/channels` | P04 | RC recipe + feature contract + applicable MR01–MR14 |
| R44 / QR44 | `W/admin/permissions` | P04 | Existing roles P04; custom roles/overrides P10 |
| R45 / QR45 | `W/admin/audit-log` | P04 | RC recipe + feature contract + applicable MR01–MR14 |
| R46 / QR46 | `W/admin/reports` | P04 | RC recipe + feature contract + applicable MR01–MR14 |
| R47 / QR47 | `W/admin/data` | P04 | Requests/basic controls P04; advanced retention/hold P11 |
| R48 / QR48 | `W/admin/workspace` | P04 | RC recipe + feature contract + applicable MR01–MR14 |
| R49 / QR49 | `W/requests/[requestId]` | P04 | RC recipe + feature contract + applicable MR01–MR14 |
| R50 / QR50 | `W/apps` | P13 | RC recipe + feature contract + applicable MR01–MR14 |
| R51 / QR51 | `W/apps/[appId]` | P13 | RC recipe + feature contract + applicable MR01–MR14 |
| R52 / QR52 | `W/admin/billing` | Conditional / unscheduled | Requires new product contract, estimate and tests if monetization is selected |
| R53 / QR53 | `W/admin/emoji` | P08 | RC recipe + feature contract + applicable MR01–MR14 |
| R54 / QR54 | `W/admin/user-groups` | P08 | RC recipe + feature contract + applicable MR01–MR14 |
| R55 / QR55 | `W/tasks` | P08 | RC recipe + feature contract + applicable MR01–MR14 |
| R56 / QR56 | `W/tasks/[taskId]` | P08 | RC recipe + feature contract + applicable MR01–MR14 |
| R57 / QR57 | `W/channels/[channelId]/notes` | P08 | RC recipe + feature contract + applicable MR01–MR14 |
| R58 / QR58 | `W/channels/[channelId]/notes/[noteId]` | P08 | RC recipe + feature contract + applicable MR01–MR14 |
| R59 / QR59 | `W/calls` | P06 | Real media proof; role/stage variants regress in P10 |
| R60 / QR60 | `W/calls/[callId]` | P06 | Real media proof; role/stage variants regress in P10 |
| R61 / QR61 | `W/voice` | P06 | Real media proof; role/stage variants regress in P10 |
| R62 / QR62 | `W/voice/[roomId]` | P06 | Real media proof; role/stage variants regress in P10 |
| R63 / QR63 | `W/events` | P07 | Occurrence/calendar contract; privacy and revoked connection cases |
| R64 / QR64 | `W/events/[eventId]` | P07 | Occurrence/calendar contract; privacy and revoked connection cases |
| R65 / QR65 | `/account/connections` | P07 | Occurrence/calendar contract; privacy and revoked connection cases |
| R66 / QR66 | `W/recordings` | P09 | Consent, artifact lineage and current-access grants |
| R67 / QR67 | `W/recordings/[recordingId]` | P09 | Consent, artifact lineage and current-access grants |
| R68 / QR68 | `W/forums` | P10 | RC recipe + feature contract + applicable MR01–MR14 |
| R69 / QR69 | `W/forums/[forumId]` | P10 | RC recipe + feature contract + applicable MR01–MR14 |
| R70 / QR70 | `W/forums/[forumId]/topics/[topicId]` | P10 | RC recipe + feature contract + applicable MR01–MR14 |
| R71 / QR71 | `W/admin/guests` | P12 | Bilateral/guest policy across all derived surfaces |
| R72 / QR72 | `W/admin/shared-channels` | P12 | Bilateral/guest policy across all derived surfaces |
| R73 / QR73 | `W/admin/safety` | P10 | RC recipe + feature contract + applicable MR01–MR14 |
| R74 / QR74 | `W/workflows` | P13 | RC recipe + feature contract + applicable MR01–MR14 |
| R75 / QR75 | `W/workflows/[workflowId]` | P13 | RC recipe + feature contract + applicable MR01–MR14 |
| R76 / QR76 | `W/admin/identity` | P11 | RC recipe + feature contract + applicable MR01–MR14 |
| R77 / QR77 | `W/admin/imports` | P11 | RC recipe + feature contract + applicable MR01–MR14 |
| R78 / QR78 | `W/admin/retention` | P11 | RC recipe + feature contract + applicable MR01–MR14 |

## Coverage reconciliation at every phase exit

Check exact ID sets, not only row counts. Every F requirement must have an owner, phase and case/child trace; every catalogue number must map to at least one F and QF; every R must map to a phase/explicit condition, RC recipe and QR. Review multi-package requirements and continuous security/mobile/test obligations before closing their product rows. A new feature/route/provider modifies this inventory before implementation begins.

Current documentation reconciliation: 90 catalogue rows, 108 requirements, 78 routes, 39 package IDs with W20 superseded, 652 feature scenarios across 107 executable requirements, 24 universal dimensions and 20 cross-domain scenarios. These counts measure planning traceability only. Actual evidence, defects and independent verdicts belong in [QA checklist](qa-checklist.md).
