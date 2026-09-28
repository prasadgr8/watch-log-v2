import { version as packageVersion } from "../../package.json";

/*
 * Application version boundary.
 *
 * The authoritative source is the `version` field in the repository
 * `package.json`. It is imported rather than duplicated so this value can
 * never drift from the declared package version. The value is inlined into the
 * application bundle at build time, so reading it requires no network request,
 * no persistence, and no database access.
 */
export const APP_VERSION: string = packageVersion;
