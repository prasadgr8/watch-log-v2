import JSZip from "jszip";

export async function readTvTimeZip(file: File) {
  const zip = await JSZip.loadAsync(file);

  return Object.keys(zip.files);
}
