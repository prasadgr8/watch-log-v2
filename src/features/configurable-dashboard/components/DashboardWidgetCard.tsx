import { LayoutGrid } from "lucide-react";

import type { ConfigurableDashboardWidgetDefinition } from "../widgetRegistry";

interface DashboardWidgetCardProps {
  widget: ConfigurableDashboardWidgetDefinition;
}

/*
 * Foundation placeholder shell for one dashboard widget. Step 1 renders the
 * title, a neutral placeholder line, and a "coming in a later step" note.
 * No data fetching, statistics, progress values, charts, or actions.
 */
export default function DashboardWidgetCard({ widget }: DashboardWidgetCardProps) {
  return (
    <article
      aria-labelledby={`widget-title-${widget.id}`}
      data-widget-id={widget.id}
      className="flex min-h-32 w-full min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-surface p-4 md:p-5"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          aria-hidden="true"
          className="shrink-0 rounded-lg bg-accent/15 p-1.5 text-accent-text"
        >
          <LayoutGrid className="h-4 w-4" />
        </span>
        <h2
          id={`widget-title-${widget.id}`}
          className="min-w-0 break-words text-base font-semibold text-primary"
        >
          {widget.title}
        </h2>
      </div>

      <p className="mt-3 min-w-0 break-words text-sm text-muted">{widget.description}</p>

      <p className="mt-auto pt-4 text-xs text-muted">
        Widget content arrives in a later step.
      </p>
    </article>
  );
}
