import { tmdbConfig } from "./tmdbConfig";

interface TmdbRequestOptions {
  query?: Record<string, string | number | boolean | undefined>;
}

export class TmdbRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);

    this.name = "TmdbRequestError";
    this.status = status;
  }
}

export async function tmdbRequest<T>(
  path: string,
  options: TmdbRequestOptions = {},
): Promise<T> {
  const url = new URL(`${tmdbConfig.baseUrl}${path}`);

  Object.entries(options.query ?? {}).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${tmdbConfig.readAccessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new TmdbRequestError(
      `TMDB request failed with status ${response.status}.`,
      response.status,
    );
  }

  return response.json() as Promise<T>;
}
