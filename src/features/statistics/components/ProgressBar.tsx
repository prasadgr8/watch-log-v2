interface ProgressBarProps {
  value: number;
  label: string;
}

/* Reusable progress bar styled exclusively through semantic theme tokens. */
export default function ProgressBar({ value, label }: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={clampedValue}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-2 overflow-hidden rounded-full bg-surface-elevated"
    >
      <div
        className="h-full rounded-full bg-accent-hover transition-all"
        style={{ width: `${clampedValue}%` }}
      />
    </div>
  );
}