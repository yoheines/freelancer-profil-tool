import { trimMarkdownBlock } from "../../../shared/text/trim-markdown-block.js";

export function normalizeProfileHook(raw: string): string {
  return trimMarkdownBlock(raw).trim();
}
