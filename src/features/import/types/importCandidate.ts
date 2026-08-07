export interface ImportCandidate {
  // TV Time information
  tvTimeShowId: string;
  title: string;

  // User library
  followed: boolean;
  episodesSeen: number;

  // User state
  favorite: boolean;
  watchStatus: "planned" | "watching" | "completed";

  // Filled after TVDB matching
  tvdbId?: number;
}
