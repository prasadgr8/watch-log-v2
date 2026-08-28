# Project Orion - Architecture

## Project Identity

**Product Name:** Watch Log V2
**Development Codename:** Project Orion

Project Orion is the internal development codename for the Watch Log V2 application.

The codename is used for:

- Architecture discussions
- Technical documentation
- Development planning
- Internal milestones
- Experimental features
- GitHub Issues and Projects

The public-facing application name remains **Watch Log V2**.

## Architecture Overview

Architecture documentation for Watch Log V2 will be maintained in this document as Project Orion evolves.

## Continue Watching Projection

Continue Watching is implemented as derived feature state rather than persisted media state.

The Dashboard uses the Continue Watching service, which combines TV show records from the media repository with synchronized episode records from the episode repository.

The projection applies the following eligibility rules:

- the media record must represent a TV show
- the TV show must have persisted regular episodes
- Season 0 specials are excluded
- at least one regular episode must be watched
- the show must not have all regular episodes watched
- a next unwatched regular episode must exist
- current watch activity must have a cached watch timestamp

The next episode is selected after ordering regular episodes by season number and episode number in ascending order.

Progress percentage is derived from the watched regular episode count divided by the total regular episode count and rounded to the nearest whole percentage.

Continue Watching items are ordered by the most recent cached `Episode.watchedAt` timestamp in descending order.

The `Episode.watchedAt` field is used for this current-state projection because it is maintained transactionally with watch history. The watch history repository remains responsible for episode-level historical event access.

Progress, next-episode information, and Continue Watching ordering are not persisted to the `Media` entity.

## Statistics

Statistics are derived at read time from existing persisted data.

- The `Media`, `Episode`, and `WatchHistory` stores remain the only sources of watch-state truth.
- There is no separate statistics IndexedDB store.
- There is no parallel watch-state source of truth; statistics never persist derived values back into domain records.
- Statistics computation sits above the repository/data layer: statistics services are pure derivations over records returned by the existing repositories.
- Statistics remain offline-first; every displayed value is computed from local IndexedDB data.
- The Dashboard and the Statistics page are different projections of the same underlying data. The Dashboard exposes watched-episode counts, watch hours, and Continue Watching progress; the Statistics page exposes library composition, rating, watch-status, and progress aggregates.

## Backup and Recovery

Backup and recovery are application infrastructure concerns implemented outside feature repositories.

The backup service operates directly against the Dexie database because export requires a consistent snapshot across all application stores and restore requires a single atomic multi-store replacement transaction.

### Backup Format

Watch Log V2 uses a versioned JSON backup envelope containing:

- a fixed application backup format identifier
- an independent backup format version
- the IndexedDB schema version at export time
- an ISO-8601 export timestamp
- media records
- episode records
- watch history records
- application settings

Backup format versioning is independent of IndexedDB schema versioning. A change to the database schema does not implicitly redefine the backup wire format.

Application `Date` values are explicitly serialized as ISO-8601 UTC strings. Backup wire types are therefore separate from application domain types.

Persisted numeric IDs are retained in backup data. This preserves the relationships from `Media.id` to `Episode.showId` and from `Episode.id` to `WatchHistory.episodeId`.

### Backup Snapshot

Export reads media, episodes, watch history, and settings within one read transaction.

The transaction defines the backup snapshot boundary across all four stores.

### Backup Validation

Restore input is treated as untrusted runtime data.

Before any replacement transaction starts, the backup validator verifies:

- backup format
- backup format version
- source database schema version
- required store collections
- record field types
- enum values
- positive and non-negative integer constraints
- ISO-8601 UTC timestamps
- duplicate media, episode, and watch-history IDs
- duplicate setting keys
- episode references to existing TV media records
- watch-history references to existing episode records

Validated timestamp strings are hydrated to application `Date` values.

Validation failure occurs before database replacement and therefore leaves current application data untouched.

### Restore Semantics

Backup restore uses replace semantics rather than merge semantics.

A validated restore clears and replaces media, episodes, watch history, and settings within one read-write transaction.

Records are restored using their original persisted IDs.

The logical restore order is media, episodes, watch history, and settings.

If any write fails during the replacement transaction, the transaction is rolled back and the previous database state is preserved.

A valid empty backup intentionally clears all application data.

### Recovery User Experience

The Settings page allows users to export a JSON backup and select a backup for restore.

A selected backup is parsed and validated before a replacement confirmation is displayed.

The confirmation preview shows the backup filename, export timestamp, library item count, episode count, watch-event count, setting count, and backup format version.

The user must explicitly choose to restore and replace current data.

After a successful restore, the application reloads so all feature projections are rebuilt from the restored database state.

Watch Log backup restore is separate from future third-party import pipelines. External imports, including a possible TV Time GDPR import, require source-specific parsing, mapping, reconciliation, and merge semantics rather than backup replace semantics.
