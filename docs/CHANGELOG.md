# Changelog

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
