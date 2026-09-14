import type { AIEditorContext, AIOperation } from "../../types";

export const resolveAIOperation = (
  prompt: string,
  _context: AIEditorContext,
): AIOperation => {
  const lowerPrompt = prompt.toLowerCase();

  // Simple heuristic for the Mock AI provider
  if (
    lowerPrompt.includes("analyze") ||
    lowerPrompt.includes("describe") ||
    lowerPrompt.includes("what is")
  ) {
    return { type: "analyze", instruction: prompt };
  }

  if (
    lowerPrompt.includes("edit") ||
    lowerPrompt.includes("change") ||
    lowerPrompt.includes("make") ||
    lowerPrompt.includes("turn") ||
    lowerPrompt.includes("add")
  ) {
    return { type: "edit", instruction: prompt };
  }

  // Default to generate
  return { type: "generate", prompt };
};
