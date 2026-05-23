import type { ProfileSkill, ProjectSkill, ProjectSkillInput } from "../../model/input/job-posting-input.js";

type SkillLike = ProjectSkillInput | ProfileSkill | null | undefined;

export function extractSkillName(skill: SkillLike): string | undefined {
  if (typeof skill === "string") {
    const normalized = skill.trim();
    return normalized.length > 0 ? normalized : undefined;
  }

  if (skill && typeof skill.name === "string") {
    const normalized = skill.name.trim();
    return normalized.length > 0 ? normalized : undefined;
  }

  return undefined;
}

export function normalizeSkillNames(skills?: SkillLike[]): string[] {
  if (!skills || skills.length === 0) {
    return [];
  }

  const names: string[] = [];

  for (const skill of skills) {
    const name = extractSkillName(skill);
    if (name) {
      names.push(name);
    }
  }

  return names;
}

export function serializeProjectSkillsForPrompt(skills?: ProjectSkillInput[]): ProjectSkill[] {
  if (!skills || skills.length === 0) {
    return [];
  }

  const serialized: ProjectSkill[] = [];

  for (const skill of skills) {
    if (typeof skill === "string") {
      const name = extractSkillName(skill);
      if (name) {
        serialized.push({ name });
      }
      continue;
    }

    const name = extractSkillName(skill);
    if (!name) {
      continue;
    }

    const context = typeof skill.context === "string" ? skill.context.trim() : undefined;
    serialized.push(context ? { name, context } : { name });
  }

  return serialized;
}
