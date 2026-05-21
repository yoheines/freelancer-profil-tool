/**
 * Schreibt die generierte Profil-PDF in das Run-Verzeichnis.
 * Konsistent mit writeRunArtifacts.ts (writeProfileDraft, …).
 */

import { renderProfilePdf } from "./render-profile-pdf.js";
import type { ProfilePdfData } from "./profile-pdf-data.js";

/**
 * Erzeugt die Profil-PDF im Run-Verzeichnis.
 *
 * @param runDir       - z. B. runs/20260517-0ccdb2
 * @param data         - aufbereitete Profildaten
 * @param templatePath - Pfad zum HTML-Template (optional, Default aus Config)
 * @param portraitPath - Pfad zum Portrait-Bild (optional)
 * @returns            - Pfad zur erzeugten PDF-Datei
 */
export async function writeProfilePdf(
  runDir: string,
  data: ProfilePdfData,
  templatePath?: string,
  portraitPath?: string,
): Promise<string> {
  const outputPath = `${runDir}/profile-draft.pdf`;

  await renderProfilePdf({
    outputPath,
    data,
    templatePath,
    portraitPath,
  });

  return outputPath;
}
