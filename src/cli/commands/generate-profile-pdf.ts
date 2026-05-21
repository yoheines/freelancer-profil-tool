/**
 * `freelancer-profil-tool pdf <run-id>` command.
 * Generiert aus einem bestehenden Run die Profil-PDF (ohne Pipeline-Neulauf).
 */

import { Command } from "commander";
import { extractPdfDataFromRun } from "../../adapters/pdf/extract-pdf-data.js";
import { writeProfilePdf } from "../../adapters/pdf/write-profile-pdf.js";
import { loadAppConfig } from "../../adapters/config/load-app-config.js";

export function createPdfCommand(): Command {
  const command = new Command("pdf")
    .description("Generate PDF from an existing run (without re-running the pipeline)")
    .argument("<run-id>", "Run ID (z. B. 20260517-0ccdb2)")
    .action(async (runId: string) => {
      try {
        console.log(`📄 Generating PDF for run ${runId}...`);

        const config = await loadAppConfig();
        const data = await extractPdfDataFromRun(runId);
        const pdfPath = await writeProfilePdf(`./runs/${runId}`, data, config.pdf?.templatePath);

        console.log(`✅ PDF generated: ${pdfPath}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`❌ PDF generation failed: ${message}`);
        process.exit(1);
      }
    });

  return command;
}
