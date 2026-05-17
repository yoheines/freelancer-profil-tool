/**
 * Removes markdown code block fences if present.
 * Handles ```json, ```markdown, ```md, and plain ``` fences.
 */

export function trimMarkdownBlock(text: string): string {
  const trimmed = text.trim();
  // Match any fenced code block: ```<language>\n...\n```
  const fenceMatch = trimmed.match(/^```\w*\n([\s\S]*?)\n```$/);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }
  return trimmed;
}
