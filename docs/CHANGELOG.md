# Changelog

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
