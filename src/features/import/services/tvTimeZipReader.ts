import JSZip from "jszip";

export interface TvTimeZipData {
  zip: JSZip;
  fileNames: string[];
}

export async function readTvTimeZip(file: File): Promise<TvTimeZipData> {
  const zip = await JSZip.loadAsync(file);

  return {
    zip,
    fileNames: Object.keys(zip.files),
  };
}
