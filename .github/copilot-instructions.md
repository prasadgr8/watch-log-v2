WatchLog V2 is an offline-first personal watch-tracking application.

Architecture principles:

- Offline-first
- Local IndexedDB persistence
- No cloud dependency for core functionality
- Repository/service separation
- Preserve existing data integrity
- Avoid unnecessary schema migrations

Development governance:

- Follow AI_ASSISTED_DEVELOPMENT_WORKFLOW.md
- Discovery precedes architecture
- Architecture precedes implementation
- Implementation is performed one controlled step at a time
- Validate every step
- STOP after each implementation step
- Never silently modify roadmap or milestone numbering
- Never implement a feature merely because it was suggested by AI

Product analysis:

- Study existing functionality before suggesting new features
- Avoid duplicate functionality already present
- Distinguish bugs, UX improvements, enhancements and genuinely new features
- Consider the existing roadmap and architecture
- Consider user workflow and discoverability
- Consider accessibility and responsive behavior
- Consider performance and offline behavior
