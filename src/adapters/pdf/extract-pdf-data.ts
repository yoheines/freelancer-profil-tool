/**
 * Extrahiert ProfilePdfData aus einem bestehenden Run.
 *
 * Liest profile-draft.yaml (strukturiertes YAML) und baut daraus
 * das Datenobjekt für den PDF-Renderer. Kein Regex-Parsing nötig.
 */

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { parse } from "yaml";
import type { ProfilePdfData } from "./profile-pdf-data.js";
import type { ProfileYamlData } from "../../model/draft/profile-draft.js";

const RUNS_DIR = "./runs";

/**
 * Baut ProfilePdfData aus einem bestehenden Run.
 */
export async function extractPdfDataFromRun(runId: string): Promise<ProfilePdfData> {
  const runDir = `${RUNS_DIR}/${runId}`;

  // profile-draft.yaml lesen (neues Format)
  const yamlPath = `${runDir}/profile-draft.yaml`;
  if (!existsSync(yamlPath)) {
    throw new Error(
      `Keine profile-draft.yaml gefunden in ${runDir}. `
      + `Führe zuerst die Pipeline aus (mit --pdf) oder 'freelancer-profil-tool pdf ${runId}'.`,
    );
  }

  const raw = await readFile(yamlPath, "utf-8");
  const data = parse(raw) as ProfileYamlData;

  return {
    name: data.name ?? "",
    title: data.title ?? "",
    tagline: data.tagline ?? data.title ?? "",
    email: data.email ?? "",
    phone: data.phone ?? "",
    location: data.location ?? "",
    availabilityText: data.availabilityText ?? "",
    summary: data.summary ?? "",
    skills: data.skills ?? [],
    projects: (data.projects ?? []).slice(0, 3).map((p) => ({
      title: p.title ?? "",
      client: p.client ?? "",
      branch: p.branch ?? "",
      period: p.period ?? "",
      desc: p.description ?? "",
    })),
    certifications: data.certifications ?? [],
    education: (data.education ?? []).map((e) => ({
      degree: e.degree ?? "",
      institution: e.institution ?? "",
      period: e.period ?? "",
    })),
    languages: (data.languages ?? []).map((l) => ({
      lang: l.lang ?? "",
      level: l.level ?? "",
    })),
  };
}
