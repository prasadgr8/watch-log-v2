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