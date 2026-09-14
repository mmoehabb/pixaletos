import type { AIProvider } from "../types";

// Simulate network delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Generate a simple checkerboard pattern to simulate an AI generated/edited image
const generatePattern = (width: number, height: number): Uint8ClampedArray => {
  const data = new Uint8ClampedArray(width * height * 4);
  const cellSize = 8;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      const isChecker =
        Math.floor(x / cellSize) % 2 === Math.floor(y / cellSize) % 2;

      // Purple checkerboard pattern for visibility
      data[idx] = isChecker ? 128 : 200; // R
      data[idx + 1] = isChecker ? 0 : 100; // G
      data[idx + 2] = isChecker ? 128 : 255; // B
      data[idx + 3] = 255; // A
    }
  }

  return data;
};

export const MockAIProvider: AIProvider = {
  id: "mock",
  name: "Mock Provider (Local)",

  generate: async (prompt, context) => {
    await delay(1500); // 1.5s delay

    // In a real scenario, context would contain dimensions
    // For the mock, we'll assume a default 64x64 if not provided
    const width = context?.dimensions?.width || 64;
    const height = context?.dimensions?.height || 64;

    return {
      success: true,
      data: generatePattern(width, height),
      message: `Generated pattern for prompt: "${prompt}"`,
    };
  },

  edit: async (_asset, instruction, context) => {
    await delay(2000); // 2s delay

    const width = context?.dimensions?.width || 64;
    const height = context?.dimensions?.height || 64;

    return {
      success: true,
      data: generatePattern(width, height),
      message: `Edited asset based on: "${instruction}"`,
    };
  },

  analyze: async (_asset, _context) => {
    await delay(1000); // 1s delay

    return {
      success: true,
      analysis: "This appears to be a pixel art sprite with a limited palette.",
    };
  },
};
