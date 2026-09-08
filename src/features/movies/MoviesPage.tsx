import LibraryPage from "../library/LibraryPage";

/*
 * Movies page — scopes the existing Library to movies only.
 * Reuses all Library filtering, sorting, and bulk-action infrastructure
 * via the lockedMediaType prop. No duplication of Library logic.
 */
export default function MoviesPage() {
  return <LibraryPage lockedMediaType="movie" />;
}
