import type { AIProvider, AIEditorContext } from "../../types";

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

  generate: async (prompt: string, context: AIEditorContext) => {
    await delay(1500); // 1.5s delay

    const width = context.canvas.width;
    const height = context.canvas.height;

    const basePattern = generatePattern(width, height);

    // Respect selection if provided
    if (context.selection) {
      const mask = context.selection.mask;
      for (let i = 0; i < mask.length; i++) {
        if (mask[i] === 0) {
          // make non-selected area transparent
          const pIdx = i * 4;
          basePattern[pIdx + 3] = 0;
        }
      }
    }

    return {
      success: true,
      data: basePattern,
      message: `Generated pattern for prompt: "${prompt}"`,
    };
  },

  edit: async (
    asset: Uint8ClampedArray,
    instruction: string,
    context: AIEditorContext,
  ) => {
    await delay(2000); // 2s delay

    const width = context.canvas.width;
    const height = context.canvas.height;

    const basePattern = generatePattern(width, height);
    const editedData = new Uint8ClampedArray(asset);

    // Apply checkerboard over existing asset, respecting selection
    if (context.selection) {
      const mask = context.selection.mask;
      for (let i = 0; i < mask.length; i++) {
        if (mask[i] === 1) {
          const pIdx = i * 4;
          editedData[pIdx] = basePattern[pIdx];
          editedData[pIdx + 1] = basePattern[pIdx + 1];
          editedData[pIdx + 2] = basePattern[pIdx + 2];
          editedData[pIdx + 3] = basePattern[pIdx + 3];
        }
      }
    } else {
      // if no selection, just overwrite entire layer
      for (let i = 0; i < editedData.length; i++) {
        editedData[i] = basePattern[i];
      }
    }

    return {
      success: true,
      data: editedData,
      message: `Edited asset based on: "${instruction}"`,
    };
  },

  analyze: async (_asset: Uint8ClampedArray, _context: AIEditorContext) => {
    await delay(1000); // 1s delay

    return {
      success: true,
      analysis: "This appears to be a pixel art sprite with a limited palette.",
    };
  },
};
