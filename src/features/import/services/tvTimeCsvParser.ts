import Papa from "papaparse";
import JSZip from "jszip";

export async function parseCsvFromZip<T>(
  zip: JSZip,
  fileName: string,
): Promise<T[]> {
  console.log("Looking for:", fileName);

  const zipEntry = Object.values(zip.files).find(
    (entry) => !entry.dir && entry.name.endsWith(fileName),
  );

  console.log("Matched entry:", zipEntry);

  if (!zipEntry) {
    throw new Error(`CSV file not found: ${fileName}`);
  }

  const csvText = await zipEntry.async("text");

  const result = Papa.parse<T>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  return result.data;
}
