import { Link } from "react-router-dom";

import { Import, Check } from "lucide-react";

import {
  getQuickActions,
  type QuickAction,
} from "../services/quickActionsWidgetService";

/* Quick Actions contains task shortcuts; Library and Discover remain in the
 * primary navigation instead of being duplicated here. */

const ICON_BY_ACTION: Record<QuickAction["id"], React.ElementType> = {
  "mark-watched": Check,
  import: Import,
};

export default function QuickActionsWidget() {
  const actions = getQuickActions();

  return (
    <div className="space-y-3">
      <ul aria-label="Quick actions" className="grid grid-cols-2 gap-3">
        {actions.map((action) => {
          const Icon = ICON_BY_ACTION[action.id];
          return (
            <li key={action.id}>
              <Link
                to={action.route}
                aria-label={action.ariaLabel}
                className="flex min-w-0 flex-col items-center gap-1.5 rounded-lg border border-border bg-surface p-3 text-center transition hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-hover/40"
              >
                <Icon aria-hidden="true" className="mx-auto h-5 w-5 text-accent-text" />
                <p className="text-xs font-medium text-primary">{action.label}</p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
