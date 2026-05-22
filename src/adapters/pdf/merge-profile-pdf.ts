/**
 * Hängt ein statisches Appendix-PDF an ein generiertes Profil-PDF an.
 * Beispiel: Vollständiger CV, Zertifikatsmappen, Referenzschreiben.
 */

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { PDFDocument } from "pdf-lib";

/**
 * Hängt das Appendix-PDF an das Profil-PDF an (überschreibt die Quelldatei).
 *
 * @param profilePdfPath - Pfad zum generierten Profil-PDF (wird überschrieben)
 * @param appendixPdfPath - Pfad zum statischen Appendix-PDF
 * @returns true wenn ein Appendix angehängt wurde, false wenn nicht (Appendix existiert nicht)
 */
export async function appendPdfToProfile(
  profilePdfPath: string,
  appendixPdfPath: string,
): Promise<boolean> {
  if (!existsSync(appendixPdfPath)) {
    return false;
  }

  const profileBytes = await readFile(profilePdfPath);
  const appendixBytes = await readFile(appendixPdfPath);

  const profileDoc = await PDFDocument.load(profileBytes);
  const appendixDoc = await PDFDocument.load(appendixBytes);

  const appendixPages = await profileDoc.copyPages(appendixDoc, appendixDoc.getPageIndices());
  for (const page of appendixPages) {
    profileDoc.addPage(page);
  }

  const mergedBytes = await profileDoc.save();
  await writeFile(profilePdfPath, mergedBytes);

  return true;
}
