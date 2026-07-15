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
