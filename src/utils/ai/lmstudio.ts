import OpenAI from "openai";
import type { AIProvider, AIEditorContext, AISettings } from "../../types";

export const createLMStudioProvider = (settings: AISettings): AIProvider => {
  const endpoint = settings.customEndpoint || "http://127.0.0.1:1234/v1";
  const modelName = settings.model || "local-model";

  const client = new OpenAI({
    apiKey: settings.apiKey || "lm-studio",
    baseURL: endpoint,
    dangerouslyAllowBrowser: true,
  });

  return {
    id: "lmstudio",
    name: "LM Studio (Local)",

    generate: async (_prompt: string, _context: AIEditorContext) => {
      return {
        success: false,
        error: "Image generation is not supported by LM Studio.",
      };
    },

    edit: async (
      _asset: Uint8ClampedArray,
      _instruction: string,
      _context: AIEditorContext,
    ) => {
      return {
        success: false,
        error: "Image editing is not supported by LM Studio.",
      };
    },

    analyze: async (asset: Uint8ClampedArray, context: AIEditorContext) => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = context.canvas.width;
        canvas.height = context.canvas.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Failed to get 2D context");

        const clonedData = new Uint8ClampedArray(asset.length);
        for (let i = 0; i < asset.length; i++) clonedData[i] = asset[i];

        const imgData = new ImageData(
          clonedData,
          context.canvas.width,
          context.canvas.height,
        );
        ctx.putImageData(imgData, 0, 0);

        const base64Url = canvas.toDataURL("image/png");

        const response = await client.chat.completions.create({
          model: modelName,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Analyze this pixel art image. Describe what it is, its color palette, and any noticeable features.",
                },
                {
                  type: "image_url",
                  image_url: {
                    url: base64Url,
                  },
                },
              ],
            },
          ],
        });

        return {
          success: true,
          analysis:
            response.choices[0]?.message?.content || "No analysis returned.",
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || "Failed to analyze image via LM Studio",
        };
      }
    },
  };
};
