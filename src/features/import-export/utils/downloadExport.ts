import type { WatchLogExport } from "../types/export";

export function downloadExport(data: WatchLogExport) {
  const json = JSON.stringify(data, null, 2);

  const blob = new Blob([json], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  const date = new Date().toISOString().split("T")[0];

  link.href = url;
  link.download = `watchlog-backup-${date}.json`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
