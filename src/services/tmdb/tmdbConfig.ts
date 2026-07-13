const tmdbReadAccessToken = import.meta.env.VITE_TMDB_READ_ACCESS_TOKEN;

if (!tmdbReadAccessToken) {
  throw new Error("Missing VITE_TMDB_READ_ACCESS_TOKEN environment variable.");
}

export const tmdbConfig = {
  baseUrl: "https://api.themoviedb.org/3",
  imageBaseUrl: "https://image.tmdb.org/t/p",
  readAccessToken: tmdbReadAccessToken,
} as const;
