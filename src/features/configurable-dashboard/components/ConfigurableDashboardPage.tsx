import { useMemo } from "react";

import ConfigurableDashboardGrid from "./ConfigurableDashboardGrid";
import { getDefaultDashboardLayout } from "../defaultLayout";

/*
 * NEW configurable Dashboard foundation (Step 1), served at
 * `/dashboard/preview`. Independent from the existing Dashboard at `/`, which
 * remains the fallback/control implementation and is not modified.
 *
 * The hero is intentionally minimal: a title plus one supporting line. This
 * page is a personalized actionable snapshot, not a metrics overview.
 */
export default function ConfigurableDashboardPage() {
  const layout = useMemo(() => getDefaultDashboardLayout(), []);

  return (
    <div className="w-full min-w-0 space-y-6">
      <section aria-labelledby="configurable-dashboard-heading">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent-text">
          Preview
        </p>
        <h1
          id="configurable-dashboard-heading"
          className="mt-1 break-words text-2xl font-bold text-primary md:text-3xl"
        >
          Your Dashboard
        </h1>
        <p className="mt-2 max-w-2xl break-words text-sm text-muted md:text-base">
          A personalized snapshot of your watch life. Widget content arrives in
          later steps — this preview shows the layout foundation.
        </p>
      </section>

      <section aria-label="Dashboard widgets" className="w-full min-w-0">
        <ConfigurableDashboardGrid layout={layout.widgets} />
      </section>
    </div>
  );
}
