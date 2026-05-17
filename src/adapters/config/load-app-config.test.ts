import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { loadAppConfig } from "./load-app-config.js";

const tempDirs: string[] = [];

async function writeConfigFile(content: string): Promise<string> {
  const tempDir = await mkdtemp(join(tmpdir(), "freelancer-profil-tool-config-"));
  tempDirs.push(tempDir);
  const configPath = join(tempDir, "config.yaml");
  await writeFile(configPath, content, "utf8");
  return configPath;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("loadAppConfig", () => {
  it("should load workspace and llm config from file", async () => {
    const configPath = await writeConfigFile(`workspace:\n  runsDir: ./runs\n  sourcesDir: ./sources\npipeline:\n  projectSelection:\n    targetCount: 7\n  keywordSelection:\n    targetCount: 8\nllm:\n  provider: openai-compatible\n  baseURL: https://example.invalid/v1\n  model: test-model\n  maxTokens: 2048\n  temperature: 0\n`);

    const config = await loadAppConfig(configPath);

    expect(config.workspace.runsDir).toBe("./runs");
    expect(config.workspace.sourcesDir).toBe("./sources");
    expect(config.pipeline.projectSelection.targetCount).toBe(7);
    expect(config.pipeline.keywordSelection.targetCount).toBe(8);
    expect(config.llm.model).toBe("test-model");
  });

  it("should use defaults when config is minimal", async () => {
    const configPath = await writeConfigFile("workspace:\n  runsDir: ./runs\n  sourcesDir: ./sources\n");

    const config = await loadAppConfig(configPath);

    expect(config.workspace.runsDir).toBe("./runs");
    expect(config.pipeline.projectSelection.targetCount).toBe(5);
    expect(config.pipeline.keywordSelection.targetCount).toBe(10);
    expect(config.llm.model).toBe("gpt-4o-mini");
  });
});
