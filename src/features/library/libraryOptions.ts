import type { WatchStatus } from "../../types";

export const watchStatusOptions: {
  value: WatchStatus;
  label: string;
}[] = [
  {
    value: "planned",
    label: "Plan to Watch",
  },
  {
    value: "watching",
    label: "Watching",
  },
  {
    value: "completed",
    label: "Completed",
  },
  {
    value: "on-hold",
    label: "On Hold",
  },
  {
    value: "dropped",
    label: "Dropped",
  },
];
