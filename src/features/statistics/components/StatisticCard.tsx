import type { ReactNode } from "react";
interface StatisticCardProps {
  title: string;
  value: number | string;
  suffix?: string;
  icon?: ReactNode;
  iconClassName?: string;
}

export default function StatisticCard({
  title,
  value,
  suffix,
  icon,
  iconClassName = "text-muted",
}: StatisticCardProps) {
  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-sm transition hover:border-accent-hover hover:shadow-lg">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-muted">
            {title}
          </p>

          <h2 className="mt-3 text-4xl font-bold text-primary">
            {value}

            {suffix && (
              <span className="ml-1 text-lg font-medium text-muted">
                {suffix}
              </span>
            )}
          </h2>
        </div>

        {icon && <div className={iconClassName}>{icon}</div>}
      </div>
    </div>
  );
}
