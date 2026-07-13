# Project Orion - Release Notes

## Watch Log V2 v2.0.0-alpha.5

Development Codename: Project Orion

### Release Status

Alpha Development

### Summary

This alpha release introduces TMDB-powered media search and connects external media discovery to the persistent Watch Log V2 library.

Users can search for TV shows and movies, review TMDB metadata, and add selected media directly to the local IndexedDB library.

### Added

- TMDB API integration
- Authenticated TMDB HTTP client
- TMDB multi-search service
- Typed TMDB API response models
- TV show and movie search
- Filtering of person results from media search
- Search result cards
- Poster support
- Release year display
- TMDB rating display
- Media type badges
- Media overview display
- Missing poster fallback
- TMDB-to-Project Orion media mapping
- Add to Library from search results
- IndexedDB persistence for TMDB media
- Duplicate prevention using TMDB ID and media type
- Library-aware search result states
- Search navigation and active route state

### Technical Notes

TMDB API data is isolated behind the Project Orion TMDB service layer.

External TMDB response models are not stored directly in IndexedDB. Search results are mapped into the internal Project Orion `Media` domain model before persistence.

Media identity for TMDB-backed library entries is determined using the combination of TMDB ID and media type.

The TMDB API token is provided through the local Vite environment configuration and is excluded from Git through the `.gitignore` configuration.

Search state is currently session-only and is cleared when the Search page is refreshed.

### Known Limitations

- Search state is not persisted
- Search pagination is not yet implemented
- Media details pages are not yet implemented
- Episode tracking is not yet implemented
- Backup and restore are not yet implemented
- Cloud synchronization is not yet implemented

### Next Release

v2.0.0-alpha.6 will introduce episode and season tracking.