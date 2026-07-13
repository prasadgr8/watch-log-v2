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

Stores episode-level watch progress.

Planned fields include:

- id
- showId
- seasonNumber
- episodeNumber
- title
- watched
- watchedAt
- createdAt
- updatedAt

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

## Dashboard Statistics

Dashboard statistics use repository aggregate operations rather than direct Dexie table access.

Current statistics include:

- TV show count from `mediaRepository.countByType("tv")`
- Movie count from `mediaRepository.countByType("movie")`
- Episode count from `episodeRepository.count()`

Watch hours remain `0` until episode runtime and watched-duration data are available for a truthful calculation.
