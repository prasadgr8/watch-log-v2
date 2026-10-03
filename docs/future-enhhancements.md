# Watch Log V2 -- Future Enhancements

This document captures ideas intentionally deferred until after the MVP.
The goal is to keep the MVP focused on delivering a reliable,
offline-first media tracker with TV Time migration and TVDB-powered
metadata.

## Guiding Principle

**MVP first. Enhancements later.**

Only features that directly help users migrate, manage, and track their
media library belong in the MVP. Everything below is considered
post-MVP.

---

# High Priority (Post-MVP)

## Optional Cloud Sync

- Sync across multiple devices
- Conflict resolution
- Offline-first synchronization
- Optional user account

## Android Enhancements

- Home screen widgets
- Share-to-Watch Log integration
- Notification improvements
- Background synchronization

## Import Improvements

- Resume interrupted imports

True checkpoint/resume remains deferred: safe interruption recovery would
require persistent import-run/checkpoint state and additional
architecture/schema work beyond the current import pipeline. The shipped
Alpha 15.5 retry-from-start failure UX re-runs a failed import from the
beginning; it is not checkpoint/resume.

The following import improvements shipped and are no longer future work:

- Better duplicate detection (shipped in v2.0.0-alpha.15.1)
- Manual matching for unmatched titles (shipped in v2.0.0-alpha.15.2)
- Detailed import reports (shipped in v2.0.0-alpha.15.3)

---

# Medium Priority

## AI Features

- Personalized recommendations
- Continue Watching suggestions
- Smart collection generation
- Viewing insights

## Calendar & Reminders

- Upcoming episode calendar
- Release reminders
- Watch reminders

## Streaming Availability

Basic provider-backed streaming availability is no longer future work. Alpha 26 shipped a TMDB-backed, region-aware availability path using a provider-neutral domain, application-level availability service, and shared "Where to watch" presentation on Movie Details and TV Details.

The following remain future work:

- Additional availability providers
- Availability result persistence or caching
- Background polling or proactive availability refresh
- Availability-driven notifications and reminders
- Broader integrations built on availability data

The shipped availability feature intentionally does not persist availability results in IndexedDB and does not introduce background polling or notifications.

## Advanced Statistics

The Statistics Dashboard is already shipped on `main`: the basic dashboard
shipped in v2.0.0-alpha.6.7 with library overview, rating statistics, watch
status, and progress cards, and v2.0.0-alpha.11 added episode, watch-time,
per-show progress, and recently watched sections derived from episodes and
watch history.

A27 Step 1 and Step 2 have since shipped the history-derived analytics foundation
on `main`:

- A27 Step 1 (PR #138) added read-only historical `WatchHistory` access
  (`getAll()` and half-open `getRange(from, to)`) and the pure analytics domain
  types (`AnalyticsPeriod`, `WatchActivityEvent`, `WatchActivityBucket`,
  `WatchActivityTimeline`), together with pure watch-period primitives using
  local-calendar semantics, ISO-8601 Monday weeks, and deterministic DST-safe
  civil-date arithmetic. No analytics persistence, schema change, or analytics
  store was introduced.
- A27 Step 2 (PR #139) added pure `WatchHistory`-derived activity aggregation
  (`activeDayCount`, `eventsPerActiveDay`, `sourceEventCounts`, `firstWatchedAt`,
  `lastWatchedAt`, `mostActivePeriod`, and timeline aggregation) behind the
  `ViewingActivitySummary` shape, made event ordering a deterministic total order
  (`watchedAt` → `episodeId` → persisted `id`), and added the read-only
  `watchActivityService` (one `getAll()` read per request; no writes, no network,
  no clock dependency, no UI).

This is a foundation only. No Statistics UI consumes `WatchActivity` yet. The
history-derived `firstWatchedAt` / `lastWatchedAt` values are also distinct from
the current-state `statisticsService.recentActivity` values (`firstWatchDate` /
`lastWatchDate`), which derive from the `Episode` watch-state cache rather than
from recorded `WatchHistory` events.

The following advanced analytics capabilities remain deferred post-MVP work; the
A27 foundation provides the aggregation layer they would build on, but none of
the user-facing capabilities below exist yet:

- Watch-history trends
- Time-series analytics
- Richer visualizations and charts
- Rating distributions
- Most-watched analytics
- Yearly watch reports
- Genre trends
- Runtime statistics
- Completion analytics
- Network/platform breakdown
- Rewatch counts
- Completion history
- Movie watch history

`WatchHistory` is not an immutable or complete viewing ledger: marking an episode
unwatched deletes its history rows (see the Watch History section of
`docs/DATABASE.md`), manual re-watching does not create another event, TV Time
import can collapse duplicate/re-watch activity, and `watchHistory` is
episode-based so movies are not represented. Rewatch counts, completion history,
and movie watch history are therefore future work rather than already-derivable
values.

## Custom Collections

*Note: User-defined lists shipped in v2.0.0-alpha.17.3 as Custom Collections (create, rename, delete, add/remove media, persistent memberships). This section covers organization features that remain future work.*

*Basic bulk Library management shipped in v2.0.0-alpha.21: multi-select in grid/list views, bulk watch-status changes, bulk favorite/unfavorite, bulk add-to-collection, and bulk delete with confirmation. This section covers organization features that remain future work.*

- Smart filters
- Collection sharing (optional)

---

# Low Priority

## Multi-provider Metadata

- Replace provider-specific identifiers with a provider abstraction
- Support additional metadata providers in the future

## TV Time-specific Data

These are intentionally excluded from the MVP: - Comments -
Emotions/Reactions - Badges - Notifications - Recommendations -
Friends/Social graph - Device information - Other TV Time-specific
metadata

---

# Long-term Ideas

- Multi-user profiles
- Web companion improvements
- Optional plugin architecture
- Public API
- Browser extension
- Desktop packaging
- Additional import sources (subject to licensing)

---

# Technical Improvements

- Expanded automated tests
- Performance optimizations (route-level code splitting with lazy page routes shipped in v2.0.0-alpha.14; further optimizations remain deferred here)
- Better caching (the service worker now precaches the offline application shell and bounds TMDB image caching as of v2.0.0-alpha.13; broader caching improvements remain deferred here)
- Improved accessibility (dialog, keyboard focus, skip link, landmark, and progress-bar accessibility shipped in v2.0.0-alpha.14; further accessibility work remains deferred here)
- Internationalization
- Theme customization

---

# Extract the search logic into a reusable service.

Your SearchPage currently contains business logic like:

const response = await tmdbSearchService.searchMedia(...)

I think, over time, we should extract that into a reusable service.

Something like:

searchMediaByTitle()

Importer
│
▼
SearchService
▲
│
SearchPage

But...

⚠️ Not now.

This is exactly the kind of improvement we agreed belongs after the skeleton is complete.

The current implementation is perfectly fine for the MVP.

---

One thing I'd like to improve before TVI-008

Right now, your findBestTvdbMatch() is doing two responsibilities:

Finding a match.
Saving to the library.

According to our Single Responsibility Principle, eventually it should only do this:

Candidate
│
▼
Return Media

and the import workflow will be responsible for saving it.

However...

Let's apply our own decision framework:

Question Answer
Improves MVP? ❌
Helps TV Time migration? ❌
Improves maintainability? ✅
Can it wait? ✅

Decision: Move this to future-enhancements.md.

For the MVP, your current implementation is perfectly acceptable because it gets us to a working importer faster.
--------------------

One thing we should NOT do yet

Don't add:

Progress bars
Cancellation
Retry logic
Parallel imports
Batch processing

Those are all good ideas, but they belong in future-enhancements.md.

---

# Backlog Management

When evaluating a new feature, ask:

1.  Does it improve the MVP?
2.  Does it help users migrate from TV Time?
3.  Does it improve maintainability?
4.  Can it wait until after release?

If the answer to (4) is Yes, place it in this document rather than the
active roadmap.


---

# Canonical Future Feature Inventory

This section is the planning inventory for future WatchLog capabilities. It is not an implementation commitment by itself. Each capability must still pass the repository's discovery, architecture, planning, authorization, validation, and delivery gates before implementation.

## Feature Audit Status

The repository audit classifies Workstreams 1–5 as **shipped foundations with future extensions**. Workstreams 6–13 remain future capabilities in the audited main tree.

| Workstream | Status |
| --- | --- |
| 1. Advanced Viewing Intelligence | Shipped foundation, including the A27 Step 1 / Step 2 history-derived analytics foundation; future advanced intelligence |
| 2. Release Radar & Calendar | Shipped foundation; future calendar/radar extensions |
| 3. Streaming Availability Ecosystem | Shipped foundation; future provider expansion and **My Providers** |
| 4. Library Organization & Personalization | Shipped foundation; future personalization including **Personal Journal** |
| 5. Data Portability & Migration | Shipped foundation; future portability and migration extensions |
| 6. Cross-Device Synchronization | Future |
| 7. Automatic Scrobbling | Future |
| 8. People & Content Tracking | Future |
| 9. Spoiler-Safe Experience | Future |
| 10. Anime / Complex Episode Ordering | Future |
| 11. Local / Optional AI | Future |
| 12. Cross-Media Library | Future |
| 13. Private Social | Future / major architecture expansion |

These classifications are documentation status only; each future capability still requires its own discovery, architecture, authorization, implementation, validation, and delivery gates.

## Workstream 1 — Advanced Viewing Intelligence

Shipped foundation: Continue Watching, watch progress, the Statistics Dashboard,
and the A27 Step 1 / Step 2 history-derived analytics layer (historical
`WatchHistory` repository reads, the pure `src/domain/analytics/` domain, and
`watchActivityService`).

Future scope includes deeper viewing analytics, trends, historical insights, and other derived intelligence beyond the current Statistics Dashboard; no Statistics UI consumes the A27 `WatchActivity` layer yet.

## Workstream 2 — Release Radar & Calendar

Future scope includes release calendars, upcoming-release organization, and personalized release-radar experiences.

## Workstream 3 — Streaming Availability Ecosystem

Future scope includes broader provider coverage and the **My Providers** preference model. Availability remains provider-adapted and provider-neutral at the domain boundary; availability is distinct from watch scrobbling.

## Workstream 4 — Library Organization & Personalization

Future scope includes richer library organization and personalization, including the **Personal Journal**, advanced collection behavior, and related personal metadata experiences.

## Workstream 5 — Data Portability & Migration

Future scope includes additional import/export formats, migration paths, and data portability improvements while preserving the local data model as the source of truth.

## Workstream 6 — Cross-Device Synchronization

Future scope includes optional synchronization across user devices. Sync is architecturally distinct from backup/export and must not turn the core application into a cloud-dependent product.

## Workstream 7 — Automatic Scrobbling

Future scope includes automatic watch-progress detection and integrations that record viewing activity in external services. Scrobbling is distinct from both streaming availability and cross-device synchronization.

## Workstream 8 — People & Content Tracking

Future scope includes actor/person tracking, related-content navigation, and people-centric library discovery.

## Workstream 9 — Spoiler-Safe Experience

Future scope includes spoiler-aware presentation and controls that protect unseen content while retaining useful discovery and tracking workflows.

## Workstream 10 — Anime / Complex Episode Ordering

Future scope includes alternate episode orders and domain rules needed for anime and other media with non-trivial episode sequencing.

## Workstream 11 — Local / Optional AI

Future scope includes optional local or user-enabled AI capabilities such as natural-language search and assistance. AI is an optional enhancement and must not become a required dependency for core WatchLog operation.

## Workstream 12 — Cross-Media Library

Future scope includes possible expansion beyond TV and movies into additional media domains such as books, podcasts, or music. Each media domain requires separate domain analysis before implementation.

## Workstream 13 — Private Social

Future scope includes optional private social capabilities. This is a major architectural expansion requiring explicit analysis of identity, accounts, authentication, authorization, backend services, privacy, and data ownership.

## Planning Boundaries

The following distinctions are mandatory planning boundaries:

- Backup is not Sync.
- Streaming Availability is not Scrobbling.
- Scrobbling is not Sync.
- AI is not a core dependency.
- Cross-media support is not an extension of the existing TV/movie domain without dedicated domain analysis.
- Private Social is not a local-only feature and requires explicit architecture review before any implementation.

## Suggested Future Sequencing

The future workstreams are currently sequenced conceptually as:

1. Local Intelligence
2. Release Experience
3. Data Portability
4. Availability Expansion
5. Complex Tracking
6. External Tracking
7. Cross-Device
8. People & Spoilers
9. Optional AI
10. Cross Media
11. Private Social

This is an architectural planning sequence, not a release prediction or authorization to implement the listed workstreams.
