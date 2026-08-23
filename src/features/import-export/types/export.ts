import type { Media } from "../../../types/media";

export interface WatchLogExport {
  application: "Watch Log V2";
  formatVersion: 1;
  exportedAt: string;

  data: {
    media: Media[];
  };
}
