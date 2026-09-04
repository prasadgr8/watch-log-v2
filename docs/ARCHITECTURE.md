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

## PWA and Offline Architecture

Watch Log V2 ships as a Progressive Web App. The service worker is generated at build time by `vite-plugin-pwa` (Workbox `generateSW` mode) and is registered with the `autoUpdate` strategy, so when a new version is deployed the updated precache is activated automatically without a manual update prompt.

### Static Shell and Navigation Fallback

The build precaches the static application shell: JavaScript, CSS, HTML, icons, and the web app manifest. The manifest declares a stable application identity (`id: "/"`).

SPA navigations use `navigateFallback: "/index.html"`, so client-side routes are served from the precached application shell when the network is unavailable.

### Runtime Caching

Runtime caching is intentionally narrow:

- Only public TMDB image responses from `image.tmdb.org` are runtime-cached, using a CacheFirst strategy.
- The `tmdb-images` cache is bounded to 150 entries with a 30-day expiration and only caches successful image responses.
- TMDB API JSON responses are not runtime-cached. API requests always go to the network and are never served from Cache Storage.

### Route-Level Code Splitting

Page-level routes (Dashboard, Library, TV show details, Search, Statistics, and Settings) are loaded through `React.lazy` inside a `Suspense` boundary that shows a muted "Loading..." fallback. The application shell — layout, sidebar, and header — remains eagerly loaded.

Every emitted route and shared chunk is covered by the Workbox `globPatterns` precache, so lazily loaded routes work offline exactly like the application shell, and deep links keep resolving through the `/index.html` navigation fallback.

### Local-First TV Details and Season Loading

TV show details and season episodes load offline-first through the TV show details service, with IndexedDB as the source for saved data:

- Saved media, derived season summaries, and locally persisted episodes are read from IndexedDB and rendered first, so offline use is never blocked.
- When the user is online, a TMDB refresh runs afterward and the UI is updated with the synchronized episodes when it succeeds.
- Season synchronization continues to preserve locally owned watch state.
- If the TMDB refresh fails, the already displayed local episodes are retained and no error replaces them.
- When a season has no saved episodes and the user is offline, the page shows a friendly notice asking to go online.

While saved data is shown, the TV show details page displays an offline notice with a retry control, and the header reflects the browser's online status with an "Offline — showing saved data" message.

## Responsive Navigation

Navigation adapts at the responsive breakpoint (Tailwind `md`, 768px):

Desktop (768px and up):

- Persistent sidebar navigation, unchanged by the mobile drawer.

Below the breakpoint:

- The header owns the hamburger action: a labelled button opens the drawer.
- `AppLayout` owns the mobile navigation open/closed state as transient React UI state; it is not persisted to IndexedDB.
- `Sidebar` renders the mobile drawer and the backdrop.
- The labelled close control inside the drawer closes it.
- Activating the backdrop closes the drawer; the backdrop is decorative and excluded from the accessibility tree.
- Pressing Escape closes the drawer; a document-level keydown listener is attached only while the drawer is open and is removed on cleanup.
- Navigating to another route closes the drawer automatically.
- While closed, the drawer and backdrop are not rendered, so they are removed from the layout, the tab order, and the accessibility tree, and the desktop sidebar remains a static block column.

Accessibility:

- The hamburger and close controls are labelled buttons with visible `focus-visible` keyboard indicators.
- The drawer keeps exactly one `nav` landmark, and the shell keeps exactly one `main` landmark.

## Library

### Data Flow

```
IndexedDB → mediaRepository.getAll() → LibraryPage state →
filterLibrary() → sortLibrary() → visibleMedia → MediaCard/MediaListItem
```

### Implementation Notes

- All media loads into memory; there is no pagination or virtualization.
- Filtering and sorting happen in-memory at the UI level.
- Search matches against the `title` field only.
- The `createdAt` timestamp supports "recently added" sorting.

### Capabilities

- title search through `filterLibrary()`
- media type filter (TV / Movie / All)
- watch status filter
- sorting by title (A-Z / Z-A), date added (recent first), and rating
- grid and list view modes with persisted preference
- empty library and no-results states

### Known Issue

- Year sorting is currently non-functional and returns unsorted results.

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
- The Dashboard and the Statistics page are different projections of the same underlying data. The Dashboard exposes watched-episode counts, watch hours, and Continue Watching progress; the Statistics page exposes library composition, rating, watch-status, and progress aggregates together with episode totals and watched percentages, watch-time totals derived from watched episode runtime, per-show and per-season progress, recently watched activity with first and last watch dates, and the raw watch-history event count.

The Statistics page is loaded through a read-only statistics facade that calls `mediaRepository.getAll()`, `episodeRepository.getAll()`, and `watchHistoryRepository.count()` once in parallel per page view. Per-show progress and recently watched activity derive from the `Episode` watch-state cache (the hybrid model), while the `WatchHistory` store contributes the raw event count; re-watching or importing an episode can create multiple events for one episode without altering progress aggregates.

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
