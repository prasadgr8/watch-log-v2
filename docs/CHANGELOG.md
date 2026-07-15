# Changelog

## v2.0.0-alpha.9 — Continue Watching and Progress

### Added

- Added a derived Continue Watching service for eligible TV shows.
- Added TV show episode progress calculation using synchronized regular episodes.
- Added deterministic next-episode selection using season and episode order.
- Added a Continue Watching section to the Dashboard.
- Added watched episode counts, progress percentages, progress bars, and Up Next episode details.
- Added navigation from Continue Watching cards to the existing TV show details page.
- Added automated Continue Watching service coverage.

### Changed

- Continue Watching excludes Season 0 specials from progress and next-episode calculations.
- Continue Watching excludes shows with no watched regular episodes.
- Continue Watching excludes completed shows.
- Continue Watching requires a valid cached watch timestamp for current watch activity.
- Continue Watching items are ordered by most recent watch activity.

### Quality

- Added regression coverage for progress and next-episode calculation.
- Added cross-season next-episode ordering coverage.
- Added Season 0 exclusion coverage.
- Added zero-progress and completed-show exclusion coverage.
- Added missing watch timestamp integrity coverage.
- Added independent multi-show progress and recent-activity ordering coverage.
- Expanded the automated suite to 36 tests across six test files.

## v2.0.0-alpha.8 — Watch History Foundation

### Added

- Added a dedicated watch history domain model with manual and import event sources.
- Added the `watchHistory` IndexedDB store in database schema version 3.
- Added a version 2 to version 3 migration that backfills existing watched episodes into watch history.
- Added a watch history repository for event creation, episode history retrieval, latest-event retrieval, and episode history removal.
- Added automated watch history repository and schema migration coverage.

### Changed

- Updated episode watch actions to persist watch history and cached episode watch state in a single Dexie transaction.
- Updated Mark Unwatched semantics to remove all watch history for the episode and clear its cached watch state.
- Updated TV show deletion to remove related watch history before deleting episodes and media.
- Updated test database cleanup to include the watch history store.

### Quality

- Added regression coverage for watch history ordering and latest-event retrieval.
- Added transactional watch and unwatch integrity coverage.
- Added missing-episode watch-state integrity coverage.
- Added cascade deletion coverage for related watch history while preserving unrelated show data.
- Expanded the automated data-layer suite to 28 tests across five test files.

## v2.0.0-alpha.7 — Data Layer Test Foundation

### Added

- Added Vitest as the automated test runner.
- Added fake-indexeddb for deterministic IndexedDB testing in Node.
- Added isolated database cleanup before and after repository tests.
- Added media repository coverage for persistence, filtering, updates, removal, and episode cascade deletion.
- Added episode repository coverage for season synchronization, TMDB metadata refresh, watch-state preservation, and watched/unwatched transitions.
- Added settings repository coverage for storage, retrieval, overwrite, missing keys, and removal.
- Added IndexedDB schema migration coverage from version 1 to version 2.
- Added `npm test` and `npm run test:watch` scripts.

### Quality

- Added 19 automated data-layer tests across four test suites.
- Verified that TMDB episode metadata re-synchronization preserves local watch history.
- Verified that deleting a TV show removes its related episodes without affecting episodes belonging to other shows.
- Verified that version 1 media, episode watch state, and settings survive the version 2 schema upgrade.

## v2.0.0-alpha.6

### Episode and Season Tracking

- Added TV show details route for persisted Library TV shows
- Added TMDB TV show details and season service operations
- Added typed TMDB TV show, season, and episode response models
- Added TV show details with poster, status, air date, season count, episode count, and overview
- Added season catalogue browsing
- Added TMDB season episode synchronization with IndexedDB
- Added episode metadata including TMDB ID, overview, runtime, still path, air date, and vote average
- Added IndexedDB schema version 2 for TMDB-backed episode metadata
- Added persisted episode typing for records with generated database IDs
- Added watched and unwatched episode state persistence
- Preserved local watch state when synchronizing TMDB episode metadata
- Added episode runtime and air date display
- Added watched episode count to Dashboard statistics
- Added watched runtime calculation for Dashboard watch hours
- Added TV show Library card navigation to TV show details
- Preserved media deletion behaviour without accidental TV details navigation
- Verified episode watch state persists across browser refreshes
- Verified repeated season synchronization does not duplicate episodes
- Verified Dashboard episode and watch-hour statistics reflect watched episodes

## v2.0.0-alpha.5

### Media Search

- Added TMDB API integration for TV show and movie search
- Added authenticated TMDB HTTP client and search service
- Added typed TMDB multi-search response models
- Added filtering of person results from media search
- Added media search result cards with posters, release years, ratings, media type badges, and overviews
- Added TMDB-to-Project Orion media mapping
- Added search result persistence to the IndexedDB library
- Added duplicate prevention using TMDB ID and media type
- Added library-aware search result states
- Added Search navigation and active route state

## v2.0.0-alpha.4

### Project Orion - Library

- Added persistent personal media library
- Added manual TV show and movie creation
- Added watch status selection for library items
- Added persistent media loading from IndexedDB
- Added media deletion with related episode cleanup
- Refactored Library UI into `AddMediaForm` and `MediaCard` components
- Added shared Library watch status options
- Added `PersistedMedia` type for records with generated database IDs
- Updated media model to support manually added media without a TMDB ID
- Added real Dashboard TV show and movie counts from IndexedDB
- Added real Dashboard episode count from the episode repository
- Added Dashboard loading and error states
- Added ESLint flat configuration and TypeScript/React lint tooling
- Verified Library persistence across browser refreshes
- Verified Dashboard counts update after media additions and deletions

## v2.0.0-alpha.3

### Project Orion - Data Layer

- Added TypeScript domain models for media, episodes, and application settings
- Added Dexie database configuration
- Added IndexedDB schema version 1
- Added `media`, `episodes`, and `settings` object stores
- Added compound indexes for media identity and episode lookup
- Added media repository
- Added episode repository
- Added settings repository
- Added explicit database initialization during application startup
- Verified persistent media storage across browser refreshes
- Added Vite client type declarations
- Fixed missing favicon development console error

## v2.0.0-alpha.2

### Project Orion

- React
- TypeScript
- Tailwind CSS
- Routing
- Application Shell
