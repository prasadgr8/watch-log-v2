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
Enhancement and is still planned.

## Future Milestones

Planned or exploratory features include:

- Progressive Web App support
- Offline installation
- Optional Google Drive synchronization
- Advanced statistics and analytics (the basic Statistics Dashboard shipped in v2.0.0-alpha.6.7)
- Dark and light themes
- Responsive mobile experience (responsive/mobile work exists on the unmerged `feature/alpha6-media-editing` workstream; it is not shipped on `main`)
- Additional personal media tracking categories

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

### Deferred

- Replace/Merge conflict outcomes for Phase 3D remain deferred pending explicit product approval.

---

## Planned Milestones

These milestones are planned. They are not completed and are not recorded in
the changelog until shipped.

### v2.0.0-alpha.11 — Statistics Dashboard Enhancement

Next implementation milestone. The alpha.11 number remains assigned to this
milestone; v2.0.0-alpha.12 shipped before it, mirroring the
v2.0.0-alpha.6.7 numbering precedent. Alpha 11 has not shipped and is not
recorded in the changelog.

Enhance the shipped Statistics Dashboard MVP:

- Statistics derived from episodes and watch history (watched episodes, watch hours)
- Automated coverage for the statistics service
- Loading and error states consistent with the Dashboard

Advanced analytics remain deferred in `future-enhhancements.md`.
