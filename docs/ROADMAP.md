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

### Not yet shipped (side branch only)

The following work exists on the unmerged `feature/alpha6-media-editing`
workstream and must not be treated as shipped on `main`:

- Phase 3B — Import Plan / Dry-Run Architecture: implementation exists on the side branch (read-only planning separated from execution)
- Phase 3C — Real Import Preview: implementation exists on the side branch (real dry-run preview replacing the basic validation preview)
- Phase 3D — Conflict Resolution: implementation exists on the side branch (show-level review/select/skip); Replace/Merge outcomes remain deferred
- Phase 3E — Safe Import Execution: partially implemented on the side branch (import outcome classification); EPISODE_EXISTS / EPISODE_MISSING reconciliation semantics remain unfinished
- Phase 3F — Import Progress & Results: partially implemented on the side branch (import progress reporting); the full result summary remains open
- Phase 3G — Import History: not implemented
- Phase 3H — Full Import Test Coverage: not implemented

The detailed import roadmap for these phases is maintained on the
`feature/alpha6-media-editing` workstream and will be reconciled into this
document when that work lands on `main`.

---

## Planned Milestones

These milestones are planned. They are not completed and are not recorded in
the changelog until shipped.

### v2.0.0-alpha.10 — Safe Import Execution

Next implementation milestone. Purpose: complete the remaining safe import
execution and reconciliation work:

- Episode-level reconciliation for EPISODE_EXISTS and EPISODE_MISSING scenarios
- Explicit partial-failure behavior for import execution
- Preservation of local watch state during import reconciliation
- Landing the unmerged Phase 3B–3F import work from `feature/alpha6-media-editing` onto `main`

Replace/Merge conflict outcomes remain deferred pending explicit product
approval.

### v2.0.0-alpha.11 — Statistics Dashboard Enhancement

Enhance the shipped Statistics Dashboard MVP:

- Statistics derived from episodes and watch history (watched episodes, watch hours)
- Automated coverage for the statistics service
- Loading and error states consistent with the Dashboard

Advanced analytics remain deferred in `future-enhhancements.md`.

### v2.0.0-alpha.12 — Import History & Coverage

- Persistent import history (Phase 3G)
- Expanded import test coverage (Phase 3H)
