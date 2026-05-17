import { describe, it, expect } from "vitest";
import { trimMarkdownBlock } from "./trim-markdown-block.js";

describe("trimMarkdownBlock", () => {
  it("should remove ```markdown fences", () => {
    const input = "```markdown\nHello world\n```";
    expect(trimMarkdownBlock(input)).toBe("Hello world");
  });

  it("should remove ```md fences", () => {
    const input = "```md\nHello world\n```";
    expect(trimMarkdownBlock(input)).toBe("Hello world");
  });

  it("should remove plain ``` fences", () => {
    const input = "```\nHello world\n```";
    expect(trimMarkdownBlock(input)).toBe("Hello world");
  });

  it("should return plain text unchanged", () => {
    const input = "Hello world";
    expect(trimMarkdownBlock(input)).toBe("Hello world");
  });
});
