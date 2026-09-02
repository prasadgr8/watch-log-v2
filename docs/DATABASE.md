# Project Orion - Database

## Overview

Watch Log V2 is designed as an offline-first personal media tracking application.

Project Orion uses IndexedDB as the browser-based persistent data store and Dexie as the IndexedDB abstraction layer.

## Database Technology

- IndexedDB
- Dexie
- TypeScript

## Design Goals

The database layer must be:

- Offline-first
- Fast
- Type-safe
- Versioned
- Migration-friendly
- Exportable
- Importable
- Ready for future optional cloud synchronization

## Planned Data Model

### TV Shows

Stores TV show metadata and user tracking information.

Planned fields include:

- id
- tmdbId
- title
- overview
- posterPath
- firstAirDate
- status
- userStatus
- rating
- createdAt
- updatedAt

### Movies

Stores movie metadata and user tracking information.

Planned fields include:

- id
- tmdbId
- title
- overview
- posterPath
- releaseDate
- userStatus
- rating
- watchedAt
- createdAt
- updatedAt

### Episodes

Stores synchronized TV episode metadata and local episode-level watch progress.

Current fields include:

- id
- showId
- tmdbId
- seasonNumber
- episodeNumber
- title
- overview
- runtime
- stillPath
- airDate
- voteAverage
- watched
- watchedAt
- createdAt
- updatedAt

Episode metadata may be synchronized from TMDB.

Local watch state is owned by Watch Log V2 and must be preserved when TMDB metadata is synchronized.

### Settings

Stores local application preferences.

Planned settings include:

- theme
- application preferences
- backup metadata
- synchronization preferences

## Database Versioning

Database schema changes must use Dexie database versions.

Schema changes must not silently destroy existing user data.

Future schema migrations will be documented in this file.

## Data Ownership

User watch data is stored locally in the browser using IndexedDB.

The application must clearly communicate where user data is stored.

Future cloud synchronization must be optional.

IndexedDB and Dexie remain the authoritative local store for user and watch data. The PWA service worker uses the browser's separate Cache Storage area only for static PWA assets (the precached application shell) and public TMDB images from `image.tmdb.org`.

Personal watch data is not placed into the service-worker cache. Library records, watch state, watch history, settings, and import history continue to live exclusively in the IndexedDB stores documented in this file.

## Backup and Recovery

Project Orion supports:

- JSON backup export
- JSON backup restore with replace semantics
- Backup validation
- Schema version detection

Backup and recovery shipped in v2.0.0-beta.1. The backup envelope contains the `media`, `episodes`, `watchHistory`, and `settings` stores. The `importHistory` store is intentionally excluded from the backup envelope because import history is a diagnostic log of import runs, not user watch-state data. Backup validation accepts the current database schema version 4 as well as the previous version 3, so backups exported before import history existed remain restorable.

## Data Access Architecture

Application features should not access Dexie tables directly.

Database access is managed through repository modules.

Current repositories include:

- `mediaRepository`
- `episodeRepository`
- `settingsRepository`
- `watchHistoryRepository`
- `importHistoryRepository`

The intended data access flow is:

`UI and Features -> Repositories -> Dexie -> IndexedDB`

This separation keeps persistence logic outside React components and provides a centralized location for database operations.

## Initial Schema Verification

IndexedDB schema version 1 was verified during the v2.0.0-alpha.3 development milestone.

The following object stores were successfully created:

- `media`
- `episodes`
- `settings`

The media repository was verified by inserting a temporary TV show record, refreshing the browser, and confirming that the record remained available in IndexedDB.

The temporary verification record and startup verification code were removed after successful validation.

## Schema Version 2

IndexedDB schema version 2 was introduced during the v2.0.0-alpha.6 development milestone.

The episode store was extended to support TMDB-backed episode metadata.

The episode schema includes:

- `tmdbId`
- `[showId+tmdbId]`

The existing episode identity index remains:

- `[showId+seasonNumber+episodeNumber]`

Schema version 1 remains declared so existing databases can migrate to version 2 without silently destroying local user data.

## Library Persistence Verification

The media repository was integrated with the Library during the v2.0.0-alpha.4 development milestone.

The Library was verified to:

- Load persisted media from IndexedDB
- Add manually entered TV shows and movies
- Preserve media across browser refreshes
- Delete media from IndexedDB
- Remove related episode records when deleting media
- Refresh the Library UI after persistence operations

Manually added media may not have a TMDB identifier. The `tmdbId` field is therefore optional until media is associated with TMDB metadata.

Persisted Library records use the `PersistedMedia` type when the application requires a generated numeric database ID.

## Episode Synchronization

TV show season metadata is retrieved from TMDB and mapped to the Project Orion episode domain model.

Episode persistence is managed through `episodeRepository`.

The `synchronizeSeason` repository operation synchronizes incoming TMDB episode metadata with the local IndexedDB episode store.

When an existing episode is synchronized, local user-owned state is preserved:

- Database ID
- Watched status
- Watched timestamp
- Created timestamp

Incoming TMDB metadata may update the remaining episode metadata fields.

This separation prevents a TMDB metadata refresh from resetting local watch history.

Season synchronization is performed inside a Dexie read-write transaction.

Episodes are currently reconciled by local show ID, season number, and episode number.

## Dashboard Statistics

Dashboard statistics use repository aggregate operations rather than direct Dexie table access.

Current statistics include:

- TV show count from `mediaRepository.countByType("tv")`
- Movie count from `mediaRepository.countByType("movie")`
- Watched episode count from `episodeRepository.countWatched()`
- Watched runtime from `episodeRepository.getWatchedRuntimeMinutes()`

Dashboard watch hours are calculated from the runtime metadata of watched episodes.

Episodes without runtime metadata contribute zero minutes to the watched runtime total.

Runtime minutes are converted to hours and displayed with one decimal place.

## Automated Data Layer Testing

The IndexedDB data layer is tested with Vitest and fake-indexeddb.

Repository tests run against the shared Dexie database instance in a Node test environment backed by fake-indexeddb. The media, episodes, watch history, import history, and settings stores are cleared before and after each test to provide deterministic test isolation.

Automated coverage includes:

- media persistence, retrieval, updates, and filtering
- media removal and related episode cascade deletion
- episode ordering by episode number
- season episode synchronization
- TMDB metadata refresh during re-synchronization
- preservation of local episode identity and watch state during re-synchronization
- watched and unwatched episode transitions
- settings storage, retrieval, overwrite, and removal
- IndexedDB schema migration from version 1 to version 2
- episode retrieval across all shows via the episode repository read-all query
- watch-history event counting via the watch-history repository

Season synchronization tests enforce an important data ownership rule: provider metadata may be refreshed from TMDB, but user-owned watch state must be preserved.

The migration test verifies that legacy media, episodes, watched state, and settings survive the version 1 to version 2 schema upgrade and that the version 2 episode indexes are available.

## Watch History

Database schema version 3 introduces a dedicated `watchHistory` store.

A watch history record represents a watch event for an episode:

- `id` — generated local watch event identifier
- `episodeId` — local episode identifier
- `watchedAt` — timestamp of the watch event
- `source` — event origin, currently `manual` or `import`
- `createdAt` — timestamp when the event was persisted locally

The watch history store uses the following indexes:

- `episodeId`
- `watchedAt`
- `source`
- `[episodeId+watchedAt]`

### Hybrid Watch-State Model

Watch Log V2 uses a hybrid watch-state model.

`watchHistory` owns individual watch events and provides the historical event record. The `Episode` entity retains `watched` and `watchedAt` as cached current-state fields for efficient UI and aggregate queries.

When an episode is marked watched, a manual watch history event is created and the episode cache is updated in the same Dexie transaction.

When an episode is marked unwatched, all watch history events for that episode are removed and the episode cache is cleared in the same transaction. In the current application semantics, Mark Unwatched means that the episode is considered not watched.

### Version 2 to Version 3 Migration

The version 3 schema adds the `watchHistory` store.

During upgrade from version 2, existing episodes with `watched` set to `true`, a defined `watchedAt`, and a persisted episode ID are backfilled into watch history.

Each backfilled event preserves the existing episode watch timestamp and uses `manual` as its source. This is valid for pre-version-3 Watch Log V2 data because watch actions before the watch history foundation were manual application actions.

Unwatched episodes are not backfilled.

### Referential Integrity

Watch-state changes are transactional across the `episodes` and `watchHistory` stores.

TV show deletion is transactional across `media`, `episodes`, and `watchHistory`. Related episode IDs are resolved first, related watch history is deleted, then the episodes and media record are removed.

This prevents orphan watch history records for deleted episodes while preserving data belonging to unrelated shows.

## Import History

Database schema version 4 introduces a dedicated `importHistory` store.

An import history record is a diagnostic log entry describing one TV Time import run:

- `id` — generated local import history identifier
- `provider` — import source identity, currently `tv-time`
- `sourceFileName` — name of the imported ZIP file
- `timezone` — resolved export timezone used to interpret watched timestamps
- `status` — `completed`, `partial`, or `failed`
- `startedAt` — timestamp when the import run started
- `completedAt` — timestamp when the import run finished
- `durationMs` — wall-clock duration of the execution phase
- `totalShows`, `newShows`, `existingShows`, `unmatchedShows`, `plannedWatchedEpisodes`, `warnings` — import plan context
- `importedShows`, `skippedShows`, `failedShows`, `importedWatchedEpisodes`, `alreadyWatchedEpisodes`, `missingWatchedEpisodes`, `skippedWatchedEpisodes`, `failedWatchedEpisodes` — execution outcome counters
- `errorMessage` — present only when the status is `failed`

The import history store uses the following indexes:

- `startedAt`
- `completedAt`
- `status`
- `provider`

### Metadata-Only Semantics

Import history is a diagnostic log, not a watch-state source of truth. It stores no foreign keys into `media`, `episodes`, or `watchHistory`, and its counters are summary metadata. The `Media`, `Episode`, and `WatchHistory` stores remain the only sources of watch-state truth.

History persistence is best-effort: a failed history write is logged and never fails or blocks the import itself.

### Version 3 to Version 4 Migration

The version 4 schema adds the `importHistory` store. The migration is additive: it creates the empty store and changes no existing records, so version 3 data requires no backfill.

### Backup Exclusion

The `importHistory` store is intentionally excluded from the backup envelope. Backups continue to contain only `media`, `episodes`, `watchHistory`, and `settings`. Backup validation accepts database schema version 4 as well as version 3, so backups exported before import history existed remain restorable.
