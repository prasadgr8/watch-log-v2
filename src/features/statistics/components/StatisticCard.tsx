import type { ReactNode } from "react";
interface StatisticCardProps {
  title: string;
  value: number;
  icon?: ReactNode;
  iconClassName?: string;
}

export default function StatisticCard({
  title,
  value,
  icon,
  iconClassName = "text-slate-400",
}: StatisticCardProps) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-6 shadow-sm transition hover:border-blue-500 hover:shadow-lg">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-slate-400">
            {title}
          </p>

          <h2 className="mt-3 text-4xl font-bold text-white">{value}</h2>
        </div>

        {icon && <div className={iconClassName}>{icon}</div>}
      </div>
    </div>
  );
}
