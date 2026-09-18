/**
 * TMDB watch-provider (streaming availability) response contracts.
 *
 * These types describe the raw TMDB watch-provider responses that the A26.3
 * TMDB availability service and adapter consume. They stay TMDB-specific on
 * purpose and are kept separate from the provider-neutral availability domain
 * types, so the availability domain never sees a TMDB response object.
 *
 * Response contracts only: no request logic, no mapping into domain models,
 * and no monetization semantics live here.
 *
 * Source: https://developer.themoviedb.org/reference/movie-watch-providers
 * Source: https://developer.themoviedb.org/reference/tv-series-watch-providers
 */

/** A single streaming/viewing provider within a region result block. */
export interface TmdbWatchProvider {
  /** Relative TMDB image path; the image base URL is added at render time. */
  logo_path: string;
  provider_id: number;
  provider_name: string;
  display_priority: number;
}

/**
 * Watch-provider data for one region key (`results[region]`).
 *
 * `link` is the TMDB watch page for the title in that region. The access-type
 * arrays are optional: TMDB omits a key entirely when the title has no
 * offerings of that access type in the region.
 */
export interface TmdbWatchProviderRegionResult {
  link: string;
  flatrate?: TmdbWatchProvider[];
  free?: TmdbWatchProvider[];
  ads?: TmdbWatchProvider[];
  rent?: TmdbWatchProvider[];
  buy?: TmdbWatchProvider[];
}

/**
 * Top-level TMDB watch-provider response for a movie or TV title.
 *
 * `results` is keyed by ISO 3166-1 alpha-2 region code and is intentionally
 * unconstrained: TMDB may return a different set of regions per title, while
 * the caller selects the requested region explicitly.
 */
export interface TmdbWatchProvidersResponse {
  id: number;
  results: Record<string, TmdbWatchProviderRegionResult>;
}
