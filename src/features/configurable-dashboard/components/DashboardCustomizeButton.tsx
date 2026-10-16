import { LayoutGrid } from "lucide-react";

interface DashboardCustomizeButtonProps {
  onClick: () => void;
}

/**
 * Small, unobtrusive widgets/grid-style icon button that opens the dashboard
 * customization UI. Mirrors the established WatchLog header button pattern:
 * native <button>, accessible name via aria-label, exact tooltip via title,
 * decorative icon hidden from assistive technology, keyboard focusable with a
 * visible focus-visible ring.
 */
export default function DashboardCustomizeButton({
  onClick,
}: DashboardCustomizeButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Customize Dashboard"
      title="Customize Dashboard"
      aria-haspopup="dialog"
      className="shrink-0 cursor-pointer rounded-md p-1 text-primary transition hover:bg-surface-hover hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-hover/40"
    >
      <LayoutGrid aria-hidden="true" className="h-4 w-4" />
    </button>
  );
}
