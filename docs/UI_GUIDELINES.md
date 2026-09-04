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
- ConfirmDialog
- EpisodeList, EpisodeCard, and EpisodeListItem

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