# Project Orion - Roadmap

## Product

Watch Log V2

## Development Codename

Project Orion

## Current Stage

Alpha Development

---

## v2.0.0-alpha.1 - Project Foundation

Status: Completed

- Initial project structure
- Git repository
- GitHub repository
- React setup
- TypeScript setup
- Vite setup

## v2.0.0-alpha.2 - UI Foundation

Status: Completed

- Tailwind CSS
- React Router
- Lucide icons
- Application shell
- Sidebar navigation
- Header
- Dashboard shell
- Feature-based project structure

## v2.0.0-alpha.3 - Data Layer

Status: Completed

- Dexie database configuration
- IndexedDB schema
- TV show data model
- Movie data model
- Episode tracking model
- Settings storage
- Database versioning

## v2.0.0-alpha.4 - Library

Status: Completed

- Persistent media library
- Manual TV show and movie creation
- Watch status selection
- Media deletion
- IndexedDB persistence
- Library component architecture
- Persistent dashboard statistics
- Dashboard media and episode counts

## v2.0.0-alpha.5 - Media Search

Status: Completed

- TMDB API integration
- Typed TMDB service layer
- TV show search
- Movie search
- Media-only result filtering
- Media metadata
- Poster support and missing poster fallback
- Search result cards
- TMDB-to-Project Orion media mapping
- Add to Library from search results
- IndexedDB persistence
- Duplicate prevention using TMDB ID and media type
- Library-aware search result states

## v2.0.0-alpha.6 - Episode and Season Tracking

Status: Completed

- TV show details
- Season catalogue browsing
- TMDB season and episode metadata integration
- Episode metadata synchronization
- IndexedDB episode schema version 2
- Episode watched and unwatched status
- Persistent episode watch state
- Local watch-state preservation during TMDB synchronization
- Watched episode Dashboard statistics
- Watched runtime and watch-hour calculation

## v2.0.0-alpha.7 — Data Layer Test Foundation

Status: Complete

- [x] Configure Vitest
- [x] Configure fake IndexedDB test environment
- [x] Add deterministic database cleanup between tests
- [x] Test media repository persistence and queries
- [x] Test media removal and episode cascade deletion
- [x] Test episode season synchronization
- [x] Test TMDB metadata refresh during episode re-synchronization
- [x] Test preservation of local episode watch state
- [x] Test watched and unwatched transitions
- [x] Test settings repository operations
- [x] Test IndexedDB schema upgrade from version 1 to version 2

## v2.0.0-alpha.8 — Watch History Foundation

Status: Complete

- [x] Define the watch history domain model
- [x] Add manual and import watch event sources
- [x] Add the watch history IndexedDB store
- [x] Upgrade the database schema to version 3
- [x] Backfill existing watched episodes during version 2 to version 3 migration
- [x] Add watch history repository operations
- [x] Order episode watch history by watch timestamp
- [x] Retrieve the latest watch event for an episode
- [x] Persist manual watch events transactionally with episode watch state
- [x] Remove episode watch history transactionally when marking an episode unwatched
- [x] Reject watch-state actions for missing episodes
- [x] Cascade watch history deletion when a TV show is removed
- [x] Add automated watch history and integrity coverage

## v2.0.0-alpha.9 — Continue Watching and Progress

Status: Complete

- [x] Define a derived Continue Watching feature model
- [x] Calculate TV show progress from synchronized regular episodes
- [x] Exclude Season 0 specials from progress calculations
- [x] Exclude shows with no watched regular episodes
- [x] Exclude completed shows
- [x] Select the next unwatched episode using season and episode order
- [x] Derive recent watch activity from cached episode watch timestamps
- [x] Order Continue Watching shows by most recent watch activity
- [x] Add Continue Watching cards to the Dashboard
- [x] Display watched and total episode counts
- [x] Display progress percentage and progress bar
- [x] Display the next episode code and title
- [x] Navigate Continue Watching cards to TV show details
- [x] Add automated Continue Watching service coverage

## v2.0.0-beta.1 — Backup and Recovery

Status: Complete

- [x] Define a versioned Watch Log V2 backup format
- [x] Export media, episodes, watch history, and settings
- [x] Create a transactionally consistent database snapshot
- [x] Serialize application date fields to ISO-8601 timestamps
- [x] Preserve persisted IDs and record relationships
- [x] Validate backup format and version
- [x] Validate the source database schema version
- [x] Validate backup records at runtime
- [x] Reject invalid ISO timestamps
- [x] Reject duplicate primary keys and setting keys
- [x] Validate media-to-episode relationships
- [x] Validate episode-to-watch-history relationships
- [x] Hydrate backup timestamps to application Date values
- [x] Implement atomic replace restore
- [x] Preserve current data when backup validation fails
- [x] Roll back the complete replacement when restore fails
- [x] Support restoring a valid empty backup
- [x] Add backup controls to Settings
- [x] Add restore file validation and backup preview
- [x] Add explicit replace-data confirmation
- [x] Verify browser backup and recovery round trip
- [x] Add automated backup and recovery coverage

## v2.0.0-alpha.6.7 — Media Editing, Statistics Dashboard, Theme and Import Foundation

Status: Complete (shipped on `main` via squash merge commit `ec2364d`, PR #71)

- Alpha 6 media editing workflow with an edit media modal
- Bulk and smart watch status actions
- Statistics Dashboard MVP: Library Overview, Rating Statistics, Watch Status, and Progress cards
- Derived library statistics service and reusable StatisticCard component
- Light theme foundation with semantic theme tokens across features
- Export service foundation with typed export contract and download utility
- TV Time import foundation: ZIP reading, CSV parsing, validation, matching, episode import, watched-episode import, timezone conversion
- TV Time import preview and import workflow in Settings
- PWA application icons and assets
- Prettier formatting configuration

Numbered 6.7 because it completes the Alpha 6 media editing workstream; the
v2.0.0-alpha.7 number remains assigned to the Data Layer Test Foundation.

## v2.0.0-alpha.10 — Safe Import Execution

Status: Complete (shipped on `main` via squash merge commit `933d166`, PR #73)

- Read-only import planning separated from execution: ZIP reading, CSV parsing, validation, timezone resolution, candidate building, TMDB matching, and watched-episode planning never mutate IndexedDB
- Real dry-run import preview in Settings replacing the basic validation preview
- TMDB match ranking with ambiguity detection and explicit use/skip match resolutions
- Single mutation boundary for import execution with per-show rollback when episode synchronization fails
- Watched-episode outcome classification with explicit imported, already-watched, missing, skipped, and failed counters
- Explicit partial-failure behavior with local watch state preserved during import
- Real-work import progress reporting for the shows and watched-episodes phases
- Automated plan, execution, rollback, outcome, and progress coverage

## v2.0.0-alpha.12 — Import History & Coverage

Status: Complete (shipped on `main` via squash merge commit `d0cab3c`, PR #75)

- Persistent import history: the `importHistory` IndexedDB store in database schema version 4
- Import history repository for add, get-by-id, newest-first list, count, and clear operations
- Import history record building from the import plan and execution result with completed/partial/failed status derivation and an error message only for failed runs
- Best-effort history persistence that never fails or blocks an import and never masks an import error
- Import History section and list in Settings showing each run's outcome, summary counters, timezone, and duration
- Phase 3H expanded end-to-end import coverage: completed, partial, and failed history persistence; skipped and unmatched shows; EPISODE_MISSING; re-import idempotency with a second history record; newest-first ordering; local watch-state preservation; timezone persistence; Date hydration on read-back; and history-write failure isolation
- Backup validation accepts database schema version 4 and pre-importHistory version 3 backups

Numbered alpha.12 per the planned milestone; it shipped before
v2.0.0-alpha.11, which remains assigned to the Statistics Dashboard
Enhancement and has since shipped.

## v2.0.0-alpha.11 — Statistics Dashboard Enhancement

Status: Complete (shipped on `main` via squash merge commit `1879894`, PR #77)

- Statistics derived from episodes and watch history: episode totals, watched and unwatched counts, and watched percentages with Season 0 handling
- Watch-time statistics from watched episode runtime, including watched hours and a null-safe average per watched episode
- Per-show and per-season progress classification (completed, partially watched, unwatched, without episodes) with Season 0 specials excluded from regular progress
- Recently watched episodes with first and last watch dates, derived from the episode watch-state cache per the documented Continue Watching convention, plus a raw watch-history event count
- Read-only statistics facade that loads media, episodes, and the watch-history count once; no separate statistics store and no writes back to domain records
- New repository reads: `episodeRepository.getAll()` and `watchHistoryRepository.count()`
- Reworked Statistics page with Episodes, Watch Time, TV Progress, and Recently Watched sections
- Loading placeholders and an error alert consistent with the Dashboard
- New ProgressBar, ShowProgressTable, and RecentlyWatchedList components styled with semantic theme tokens and accessible progress attributes
- 30 new statistics service tests plus repository and theme coverage

Advanced analytics remain deferred in `future-enhhancements.md`.

## v2.0.0-alpha.13 — PWA & Offline Hardening

Status: Complete (shipped)

- PWA service worker generated at build time by `vite-plugin-pwa` (Workbox `generateSW` mode)
- `autoUpdate` service-worker registration so updated precaches activate without a manual update prompt
- Precached static application shell with SPA navigation fallback to `/index.html`
- Stable web app manifest identity (`id: "/"`)
- Bounded runtime caching for public TMDB images only: CacheFirst strategy, `tmdb-images` cache, 150 entries, 30-day expiration
- TMDB API JSON responses are not runtime-cached
- Local-first TV show details loading from IndexedDB, including derived season summaries from saved episodes when TMDB is unreachable
- Local-first season episode loading: saved episodes render first and an online TMDB refresh runs afterward; `synchronizeSeason` continues to preserve local watch state
- TMDB refresh failures retain the already displayed local episodes instead of surfacing an error
- Offline notice with retry on TV show details while saved data is shown
- Header offline status indicator backed by a new `useOnlineStatus` hook
- Service coverage for offline and online details/season loading plus PWA configuration assertions (17 tests)

## v2.0.0-alpha.14 — Production Hardening & UX Quality

Status: Complete (shipped)

- Edit Progress modal hardened with dialog semantics, Escape and backdrop cancellation guarded by the save state, initial focus, and focus restoration
- Visible `focus-visible` keyboard indicators across the sidebar and header navigation and the theme toggle, with hover styling preserved
- Keyboard-accessible "Skip to content" link targeting a stable, focusable `main` landmark
- Header online/offline status announced through `role="status"`
- Header notification bell made explicitly decorative (`aria-hidden`) because notifications do not exist
- Dashboard Continue Watching progress bars reuse the accessible Statistics `ProgressBar`, exposing `role="progressbar"` with value attributes and a per-show accessible name
- Page-level routes load through `React.lazy` with a Suspense fallback; the application shell stays eager and every emitted chunk remains precached by the PWA service worker
- Initial JavaScript chunk reduced from 633.41 kB (gzip 188.66 kB) to 398.35 kB (gzip 127.09 kB) without raising Vite's chunk warning threshold
- 40 source-assertion accessibility and route-splitting regression tests added across four focused suites

## v2.0.0-alpha.16 — Mobile Navigation

Status: Complete (shipped on `main` via squash merge commit `f3be6bd`, PR #87)

- Responsive mobile navigation drawer
- Hamburger/open navigation control in the header
- Labelled mobile close control inside the drawer
- Backdrop dismissal
- Escape-key dismissal
- Route-change auto-close
- Responsive header and content layout adjustments
- Mobile navigation integrated with the Alpha 14 accessibility work (skip link, `role="status"` announcements, decorative bell, and keyboard-visible focus indicators preserved)
- Mobile navigation regression coverage (8 dedicated tests; layout accessibility coverage updated for the additional labelled header button)

## Future Milestones

Planned or exploratory features include:

- Offline installation (install prompts remain out of scope; the offline application shell itself shipped in v2.0.0-alpha.13)
- Optional Google Drive synchronization
- Advanced statistics and analytics, such as watch-history trends, time-series visualizations, and charts (the shipped Statistics Dashboard provides the library, episode, watch-time, progress, and recently-watched views as of v2.0.0-alpha.11)
- Additional personal media tracking categories

Progressive Web App support (the service worker, offline application shell,
bounded TMDB image caching, and local-first details/season loading) shipped in
v2.0.0-alpha.13 and is no longer a future milestone. Dark and light themes
shipped with the light theme foundation in v2.0.0-alpha.6.7; deeper theme
customization remains a future idea in `future-enhhancements.md`.

Future features must be evaluated against the Project Orion product vision before implementation.

---

## TV Time Import Status

### Shipped on main

A TV Time GDPR ZIP import foundation shipped in v2.0.0-alpha.6.7:

- ZIP reading
- CSV parsing
- Required-file validation
- TV-show matching
- Episode import
- Watched-episode import
- TV Time timezone conversion
- Import preview and import workflow in Settings

The remaining import phases shipped on `main` as follows:

- Phase 3B — Import Plan / Dry-Run Architecture: shipped in v2.0.0-alpha.10 (PR #73); read-only planning separated from execution
- Phase 3C — Real Import Preview: shipped in v2.0.0-alpha.10 (PR #73); real dry-run preview replacing the basic validation preview
- Phase 3D — Conflict Resolution: show-level review/select/skip shipped in v2.0.0-alpha.10 (PR #73)
- Phase 3E — Safe Import Execution: shipped in v2.0.0-alpha.10 (PR #73); single mutation boundary, per-show rollback, partial-failure behavior, and EPISODE_MISSING / already-watched reconciliation with local watch-state preservation
- Phase 3F — Import Progress & Results: shipped in v2.0.0-alpha.10 (PR #73); real progress reporting and the full set of outcome counters
- Phase 3G — Import History: shipped in v2.0.0-alpha.12 (PR #75); persistent import history in the `importHistory` store, database schema version 4
- Phase 3H — Full Import Test Coverage: shipped in v2.0.0-alpha.12 (PR #75); expanded end-to-end import coverage

The Alpha 15 import refinements shipped on `main` as follows:

- v2.0.0-alpha.15.1 — Duplicate detection hardening (PR #83)
- v2.0.0-alpha.15.2 — Manual matching for unmatched titles (PR #84)
- v2.0.0-alpha.15.3 — Detailed per-show import reports (PR #85)
- v2.0.0-alpha.15.4 — Resume interrupted imports: evaluated as NO-GO and deferred (requires persistent import-run/checkpoint state)
- v2.0.0-alpha.15.5 — Retry-from-start failure UX with the Retry Import control (PR #86)

### Deferred

- Replace/Merge conflict outcomes for Phase 3D remain deferred pending explicit product approval.

---

## Current Implementation Status

*Reconciled with verified implementation on September 4, 2026.*

Status markers: ✅ Implemented · ⚠️ Known defect · ❌ Not implemented · ⏸️ Deferred · 🔮 Future

### Library

The Library page supports:

- ✅ Title search through `filterLibrary()`
- ✅ Media type filter (TV/Movie)
- ✅ Watch status filter
- ✅ Title sorting (A-Z / Z-A)
- ✅ Date/recent sorting (by `createdAt`)
- ✅ Rating sorting
- ✅ Empty library state
- ✅ No-results state
- ✅ Grid/list view with persisted preference

### Known Issues

- ⚠️ Year sorting is currently non-functional (returns unsorted results)

### Gaps

The following Library capabilities are not yet implemented:

- ❌ Rating filter
- ❌ Progress-based sorting
- ❌ Genre filtering (requires schema extension)
- ❌ Custom collections

---

## Planned Milestones

No further milestones are currently defined. The most recently shipped
milestone is v2.0.0-alpha.16. Exploratory work is tracked under Future
Milestones above and in `future-enhhancements.md`.
