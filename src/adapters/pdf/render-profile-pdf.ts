/**
 * PDF profile renderer.
 *
 * Lädt das HTML-Handlebars-Template, injiziert die Profildaten
 * und rendert via Playwright ein A4-PDF.
 * Sämtliche Layout-Logik liegt im Template – kein HTML in TypeScript.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";
import Handlebars from "handlebars";
import type { ProfilePdfData } from "./profile-pdf-data.js";

// ── Konstanten ──────────────────────────────────────────────
const DEFAULT_TEMPLATE_PATH = resolve("pdf-templates/profil-template.html");
const PORTRAIT_SOURCE = resolve("pdf-templates/assets/portrait.png");

// ── Handlebars-Helper ───────────────────────────────────────

/**
 * Bedingung: Block nur rendern, wenn das Array nicht leer ist.
 */
Handlebars.registerHelper("ifPositive", function (this: unknown, value: unknown[], options: Handlebars.HelperOptions) {
  if (Array.isArray(value) && value.length > 0) {
    return options.fn(this);
  }
  return options.inverse(this);
});

/**
 * Array-Elemente mit einem Trennzeichen verbinden.
 */
Handlebars.registerHelper("join", function (array: unknown[], separator: string) {
  if (!Array.isArray(array)) return "";
  return array.join(separator);
});

// ── Hauptfunktion ───────────────────────────────────────────

export interface RenderPdfOptions {
  /** Pfad für die Ausgabe-PDF-Datei */
  outputPath: string;
  /** Profildaten zum Einfügen */
  data: ProfilePdfData;
  /** Optional: Pfad zu einem eigenen Portrait-Bild (überschreibt Standard) */
  portraitPath?: string;
  /** Pfad zum HTML-Template (Default: pdf-templates/profil-template.html) */
  templatePath?: string;
}

/**
 * Rendert ein A4-PDF aus dem HTML-Template + Profildaten.
 * Liest das Template, kompiliert es mit Handlebars, injiziert Daten
 * und exportiert via Playwright als PDF.
 */
export async function renderProfilePdf(options: RenderPdfOptions): Promise<string> {
  const { outputPath, data, portraitPath, templatePath } = options;

  // ── Template lesen & kompilieren ────────────────────────
  const resolvedTemplate = templatePath ? resolve(templatePath) : DEFAULT_TEMPLATE_PATH;
  const templateSource = await readFile(resolvedTemplate, "utf-8");
  const compile = Handlebars.compile(templateSource);

  // ── Portrait-Pfad ───────────────────────────────────────
  const portraitSrc = portraitPath ?? PORTRAIT_SOURCE;
  const absolutePortrait = resolve(portraitSrc);
  const portraitFileUrl = absolutePortrait.startsWith("/")
    ? `file://${absolutePortrait}`
    : absolutePortrait;

  // ── Daten injizieren (Template escaped automatisch) ─────
  const html = compile({
    ...data,
    portraitPath: portraitFileUrl,
  });

  // ── Temporäre HTML-Datei schreiben ──────────────────────
  const tmpDir = resolve("runs/.tmp-pdf");
  await mkdir(tmpDir, { recursive: true });
  const tmpHtml = resolve(tmpDir, "profil-render.html");
  await writeFile(tmpHtml, html, "utf-8");

  // ── Playwright: PDF rendern ─────────────────────────────
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();

    await page.goto(`file://${tmpHtml}`, {
      waitUntil: "networkidle",
    });

    await page.waitForLoadState("networkidle");

    await page.pdf({
      path: outputPath,
      width: "210mm",
      height: "297mm",
      printBackground: true,
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
      preferCSSPageSize: true,
    });

    console.log(`  PDF generated: ${outputPath}`);
  } finally {
    await browser.close();
  }

  return outputPath;
}
