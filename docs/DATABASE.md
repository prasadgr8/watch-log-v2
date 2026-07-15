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

## Backup and Recovery

Project Orion will support:

- JSON export
- JSON import
- Backup validation
- Schema version detection

Backup and restore functionality will be implemented before the stable v2.0.0 release.

## Data Access Architecture

Application features should not access Dexie tables directly.

Database access is managed through repository modules.

Current repositories include:

- `mediaRepository`
- `episodeRepository`
- `settingsRepository`

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

Repository tests run against the shared Dexie database instance in a Node test environment backed by fake-indexeddb. The media, episodes, and settings stores are cleared before and after each test to provide deterministic test isolation.

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

Season synchronization tests enforce an important data ownership rule: provider metadata may be refreshed from TMDB, but user-owned watch state must be preserved.

The migration test verifies that legacy media, episodes, watched state, and settings survive the version 1 to version 2 schema upgrade and that the version 2 episode indexes are available.
