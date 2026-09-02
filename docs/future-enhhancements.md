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

- Better duplicate detection
- Resume interrupted imports
- Detailed import reports
- Manual matching for unmatched titles

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

## Advanced Statistics

The Statistics Dashboard is already shipped on `main`: the basic dashboard
shipped in v2.0.0-alpha.6.7 with library overview, rating statistics, watch
status, and progress cards, and v2.0.0-alpha.11 added episode, watch-time,
per-show progress, and recently watched sections derived from episodes and
watch history.

Advanced analytics remain deferred post-MVP work:

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

## Custom Collections

- User-defined lists
- Favorites
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
- Performance optimizations
- Better caching (the service worker now precaches the offline application shell and bounds TMDB image caching as of v2.0.0-alpha.13; broader caching improvements remain deferred here)
- Improved accessibility
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
