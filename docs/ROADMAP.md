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

## v2.0.0-beta.1 - Backup and Recovery

Status: Planned

- JSON export
- JSON import
- Backup validation
- Database migration support

## Future Milestones

Planned or exploratory features include:

- Progressive Web App support
- Offline installation
- Optional Google Drive synchronization
- Statistics and analytics
- Dark and light themes
- Responsive mobile experience
- Additional personal media tracking categories

Future features must be evaluated against the Project Orion product vision before implementation.
