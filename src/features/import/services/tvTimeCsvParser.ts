import Papa from "papaparse";
import JSZip from "jszip";

export async function parseCsvFromZip<T>(
  zip: JSZip,
  fileName: string,
): Promise<T[]> {
  const file = zip.file(fileName);

  if (!file) {
    throw new Error(`CSV file not found: ${fileName}`);
  }

  const csvText = await file.async("text");

  const result = Papa.parse<T>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  return result.data;
}
