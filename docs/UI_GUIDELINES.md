# Project Orion - UI Guidelines

## Product

Watch Log V2

## Design Philosophy

Watch Log V2 is a personal media tracker.

The interface should be:

- Clean
- Fast
- Minimal
- Consistent
- Accessible
- Responsive

The application should prioritize tracking and information clarity over streaming-platform-style visual effects.

## Design System

Project Orion uses Tailwind CSS for application styling.

## Color Direction

### Primary Background

Slate-based dark surfaces.

### Accent

Blue is the primary interactive accent.

### Success

Green represents completed or successful states.

### Warning

Amber represents warning or attention states.

### Error

Red represents destructive actions and errors.

## Layout

The desktop application uses:

- Persistent sidebar navigation
- Application header
- Scrollable main content area

The mobile application uses a responsive navigation drawer (shipped in v2.0.0-alpha.16).

## Spacing

The interface should follow a consistent spacing scale based on Tailwind CSS spacing utilities.

Avoid arbitrary spacing values unless a documented design requirement exists.

## Typography

Typography should provide a clear hierarchy between:

- Application title
- Page title
- Section title
- Card title
- Body text
- Supporting text

## Icons

Project Orion uses Lucide React icons.

Icons should:

- Support the meaning of an action
- Remain visually consistent
- Avoid unnecessary decoration

## Components

Reusable UI components should be created when the same interaction or visual pattern appears in multiple features.

Shipped reusable components include:

- StatisticCard
- MediaCard and MediaListItem
- ProgressBar (also reused by the Dashboard Continue Watching cards)
- ViewModeToggle
- DensityToggle
- ConfirmDialog
- EpisodeList, EpisodeCard, and EpisodeListItem
- BulkActionsToolbar
- AddSelectedToCollectionModal

`EmptyState` remains a planned component; current empty states are rendered inline by each page.

## Responsive Design

The application must support desktop and mobile layouts.

Desktop navigation uses a persistent sidebar.

Mobile navigation uses a responsive drawer (shipped in v2.0.0-alpha.16):

- A labelled hamburger control in the header opens the drawer.
- A labelled close control inside the drawer closes it.
- Activating the backdrop dismisses the drawer.
- Pressing Escape dismisses the drawer.
- Navigating to another route closes the drawer automatically.
- Interactive controls expose visible focus states (through `focus-visible` ring styles).
- Styling uses semantic theme tokens; arbitrary Tailwind widths and colors are not introduced.
- The backdrop is decorative and marked `aria-hidden`.

### Card Density and Responsive Grids

Card grids on Library, Movies, Media Search, TV show Episode cards, the Upcoming page, Smart Collection results, and Dashboard Continue Watching share a single density preference with three `CardDensity` options: `compact`, `comfortable` (default), and `large`.

Density rules:

- Density is a presentation preference, not a data distinction: it changes spacing (`CARD_GAP`), list padding (`LIST_PADDING`), thumbnail sizing (`LIST_THUMBNAIL`), title sizing (`CARD_TITLE_SIZE`), poster sizing, and grid tracks (the shared grid mappings such as `LIBRARY_GRID_COLUMNS` and `DASHBOARD_GRID_COLUMNS`) only.
- All three densities are information-equivalent. Changing density must not hide or remove metadata, indicators, or actions; the same information and controls stay available at every density.
- Each surface persists its density independently through the shared `useDensity` hook (the settings-store pattern shared with `useViewMode`): only an explicit selection is stored, and a missing or invalid value falls back to `comfortable`.

Density control:

- Density selection uses the shared `DensityToggle` component: a `role="group"` container with a meaningful accessible name (for example "Card density", "Episode density", "Continue Watching density").
- The active option is exposed through `aria-pressed`, so the selected state never relies on color alone. Options are native buttons with visible `focus-visible` states, and each carries both an accessible name and a `title`.

Responsive grid behavior:

- Grid responsiveness is CSS-only and driven by the density mapping; no viewport-measurement JavaScript is introduced.
- Library, Movies, Search, Upcoming, and Episode grids use `auto-fill` with density-specific fixed tracks: cards stay content-sized, and unused horizontal space appears only after the final card in a row instead of fractionally stretching cards.
- Dashboard Continue Watching is fluid: below the `lg` breakpoint every density renders a single full-width column, and from `lg` upward each density sets a minimum track width (240px / 320px / 400px) whose tracks share the row width so cards fill the row evenly.

Dashboard Continue Watching:

- Continue Watching reuses the shared density infrastructure and the Library `library-card-density` preference, so the Dashboard honours the same card-density choice as the Library; there is no Dashboard-specific density system.
- Its section header renders the shared `DensityToggle` labelled "Continue Watching density", and its cards follow the same information-equivalence rule as every other card grid.

## Library

The Library supports:

- title search
- filters: media type (TV / Movie), watch status, minimum rating, favorites, genres (accessible multi-select dropdown; empty selection = no genre filtering)
- sorting: title (A-Z / Z-A), date added (recent first), rating, year, progress (ascending/descending)
- view modes: grid and list (persisted)
- empty states: empty library, no results
- selection mode with labeled checkboxes in both grid and list views
- select-all-filtered, clear selection, and exit-selection controls
- bulk actions: set watch status, favorite/unfavorite, add to collection, delete
- confirmation dialogs for single-item and bulk delete

### Media Card and List Presentation

Both `MediaCard` and `MediaListItem` share the same presentation contract:

- Poster artwork loads with `loading="lazy"` and `decoding="async"`. On load error, the application falls back to a decorative type icon (TV or Film).
- Release year is derived locally from `firstAirDate` (TV) or `releaseDate` (movie) and omitted when unavailable.
- User rating is rendered only when set above zero.
- A notes-present indicator (StickyNote icon with screen-reader text "Has notes") appears for non-blank notes.
- TV shows display watched/total episode counts and a shared `ProgressBar` when progress is known. Movies never show a progress bar.
- Grid view uses the shared density-driven card grid (see "Card Density and Responsive Grids"); list view uses stacked rows.
- The title links to the details route; selection checkboxes and quick actions (favorite, edit, delete) remain outside the link so they never trigger navigation.

### Selection Mode

- Entering selection mode renders a native checkbox with a meaningful `aria-label` (e.g. `Select ${media.title}`) on every media card and list item. The label is unique per item.
- The selected count is announced through `role="status"`.
- "Select all" selects exactly the current filtered and sorted result set, not the full library.
- Selection clears automatically when the visible result set changes through search, filters, or sorting. Switching between grid and list view preserves the selection.

### Bulk Actions Toolbar

- The toolbar renders only while selection mode is active and shows the selected count plus the bulk actions.
- Every action button carries a visible label; icon-only controls are not introduced.
- Action buttons are disabled when nothing is selected or while a bulk operation is running (`disabled:cursor-wait disabled:opacity-50`).
- The status control is a labeled `<select>` with a placeholder option ("Set status…") that resets after each change.
- The delete button uses the danger hover convention (`hover:bg-danger/10 hover:text-danger`).

### Delete Confirmations

- Both single-item delete and bulk delete require explicit confirmation through `ConfirmDialog`.
- The confirmation description warns that deleting TV shows also deletes their episodes and watch history, and that the action cannot be undone.
- Escape and backdrop dismissal are guarded by the busy state so a running operation cannot be cancelled.

### Collection-Selection Modal

- The bulk add-to-collection modal follows the established dialog conventions: `role="dialog"` with `aria-modal`, an accessible name and description, Escape and backdrop cancellation while no operation is running, initial focus on the search control, and focus restoration on close.
- Each collection row exposes a labelled "Add" control.
- An empty state is shown when no collections match the search.

## Movies

The Movies page (`/movies`) presents the Library scoped to movies only. It reuses the Library filter bar, sorting, grid/list view modes, empty states, selection mode, and bulk actions. The media-type filter is not shown because the page is movie-scoped, and the empty state is worded in terms of movies.

### Movie Details

The movie details page (`/library/movie/:mediaId`) shows:

- poster (or the established missing-poster fallback) and title
- release year/date
- watch status badge
- user rating (when set)
- watched date (when set)
- notes (when set)
- TMDB overview (when enrichment is available)

A "Back to Movies" link returns to `/movies`. While showing saved data offline, an offline notice is announced through `role="status"`. Load failures are announced through `role="alert"` and include the back link.

### Movie Card and List Navigation

- In both grid and list presentations, movies link to the movie details route; TV shows continue to link to TV show details.
- Selection checkboxes and card/list action controls remain outside the link, so entering selection mode, toggling selection, and using quick actions never navigate.

### Watched-Date Editing

- The shared edit modal (`EditMediaModal`) shows a watched-date field only for completed movies.
- The field starts from the stored watched date; changing it replaces the date on save.
- A Clear control removes the watched date.
- Leaving the field untouched preserves the existing watched date.
- The modal follows the established dialog conventions (`role="dialog"` with `aria-modal`, accessible name and description, Escape and backdrop cancellation, initial focus, and focus restoration).

## Theme Support

Dark mode is the initial application theme.

The light theme foundation shipped in v2.0.0-alpha.6.7.

Theme implementation should use centralized application theme configuration.

## Accessibility

Interactive elements should:

- Be keyboard accessible
- Provide visible focus states (through `focus-visible` ring styles)
- Use meaningful labels
- Maintain sufficient contrast
- Avoid relying only on color to communicate state

Established accessibility conventions:

- Modals use `role="dialog"` with `aria-modal`, an accessible name and description, Escape and backdrop cancellation while no operation is running, initial focus inside the dialog, and focus restoration on close (`ConfirmDialog` and the Edit Progress modal).
- Page content is reachable through a keyboard-only "Skip to content" link that targets a stable, focusable `main` landmark.
- Progress bars expose `role="progressbar"` with accessible names and value attributes through the shared `ProgressBar` component.
- Asynchronous status text (such as the online/offline indicator) is announced through `role="status"`.
- Decorative icons that have no behavior are marked `aria-hidden` and do not present interactive affordances.