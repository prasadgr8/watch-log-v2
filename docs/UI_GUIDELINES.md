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

The mobile application will use responsive navigation.

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

Planned reusable components include:

- StatCard
- MediaCard
- ProgressBar
- EmptyState
- EpisodeRow
- SeasonAccordion
- SearchResult
- Dialog

## Responsive Design

The application must support desktop and mobile layouts.

Desktop navigation uses a sidebar.

Mobile navigation will use a responsive drawer or equivalent compact navigation pattern.

## Theme Support

Dark mode is the initial application theme.

The light theme foundation shipped in v2.0.0-alpha.6.7.

Theme implementation should use centralized application theme configuration.

## Accessibility

Interactive elements should:

- Be keyboard accessible
- Provide visible focus states
- Use meaningful labels
- Maintain sufficient contrast
- Avoid relying only on color to communicate state