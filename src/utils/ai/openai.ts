import OpenAI from "openai";
import type { AIProvider, AIEditorContext, AISettings } from "../../types";

// Helper to convert base64 image or url to Uint8ClampedArray matching target dimensions
const imageToPixelData = (
  imageUrlOrBase64: string,
  targetWidth: number,
  targetHeight: number,
): Promise<Uint8ClampedArray> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get 2D context"));
        return;
      }
      // Draw and scale down using nearest-neighbor to preserve pixel art style
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
      resolve(imageData.data);
    };
    img.onerror = (err) => reject(new Error(`Failed to load image: ${err}`));

    // Ensure base64 string has proper prefix if it doesn't already (OpenAI usually returns b64_json without data prefix)
    if (
      !imageUrlOrBase64.startsWith("http") &&
      !imageUrlOrBase64.startsWith("data:")
    ) {
      img.src = `data:image/png;base64,${imageUrlOrBase64}`;
    } else {
      img.src = imageUrlOrBase64;
    }
  });
};

export const createOpenAIProvider = (settings: AISettings): AIProvider => {
  // Use custom endpoint if provided and selected, otherwise default to OpenAI
  const baseURL =
    settings.providerId === "custom" && settings.customEndpoint
      ? settings.customEndpoint
      : undefined;

  const openai = new OpenAI({
    apiKey: settings.apiKey,
    baseURL,
    dangerouslyAllowBrowser: true, // We are running purely in the browser for this editor
  });

  const model = settings.model || "dall-e-3";

  return {
    id: settings.providerId,
    name: settings.providerId === "openai" ? "OpenAI" : "Custom HTTP API",

    generate: async (prompt: string, context: AIEditorContext) => {
      try {
        const response = await openai.images.generate({
          model: model,
          prompt: `Create pixel art of: ${prompt}. Clean, crisp pixel art, simple background, suitable for a sprite, game asset style.`,
          n: 1,
          size: "1024x1024", // Standard size, we will scale down
          response_format: "b64_json",
        });

        const b64 = response.data?.[0]?.b64_json;
        if (!b64) throw new Error("No image data returned from API");

        const pixelData = await imageToPixelData(
          b64,
          context.canvas.width,
          context.canvas.height,
        );

        // If there's a selection, mask out unselected pixels
        if (context.selection) {
          const mask = context.selection.mask;
          for (let i = 0; i < mask.length; i++) {
            if (mask[i] === 0) {
              const pIdx = i * 4;
              pixelData[pIdx + 3] = 0; // Make transparent
            }
          }
        }

        return {
          success: true,
          data: pixelData,
          message: `Generated image for prompt: "${prompt}"`,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || "Failed to generate image",
        };
      }
    },

    edit: async (
      asset: Uint8ClampedArray,
      instruction: string,
      context: AIEditorContext,
    ) => {
      try {
        // DALL-E image editing usually expects 256, 512 or 1024 square images.
        // For best results we scale up our canvas, send it, and scale back.
        // However, standard openAI endpoints accept standard resolutions. We'll send the raw image if the provider supports it,
        // but for simplicity we'll create a 512x512 image here.

        const upscaleSize = 512;

        // 1. Create a 512x512 upscaled version of our asset
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = context.canvas.width;
        tempCanvas.height = context.canvas.height;
        const tempCtx = tempCanvas.getContext("2d");
        if (!tempCtx) throw new Error("Could not get context");

        const clonedData = new Uint8ClampedArray(asset.length);
        for (let i = 0; i < asset.length; i++) clonedData[i] = asset[i];

        const imgData = new ImageData(
          clonedData,
          context.canvas.width,
          context.canvas.height,
        );
        tempCtx.putImageData(imgData, 0, 0);

        const upscaleCanvas = document.createElement("canvas");
        upscaleCanvas.width = upscaleSize;
        upscaleCanvas.height = upscaleSize;
        const upCtx = upscaleCanvas.getContext("2d");
        if (!upCtx) throw new Error("Could not get upscale context");
        upCtx.imageSmoothingEnabled = false;
        upCtx.drawImage(tempCanvas, 0, 0, upscaleSize, upscaleSize);

        // Convert upscaled to file
        const upscaledBlob = await new Promise<Blob>((resolve, reject) => {
          upscaleCanvas.toBlob((b) => {
            if (b) resolve(b);
            else reject(new Error("blob fail"));
          }, "image/png");
        });
        const imageFile = new File([upscaledBlob], "image.png", {
          type: "image/png",
        });

        // 2. Prepare mask (if selection exists, use it; otherwise the whole image is editable)
        let maskFile: File | undefined;
        if (context.selection) {
          const maskCanvas = document.createElement("canvas");
          maskCanvas.width = context.canvas.width;
          maskCanvas.height = context.canvas.height;
          const mCtx = maskCanvas.getContext("2d");
          if (!mCtx) throw new Error("No ctx");

          const mData = new Uint8ClampedArray(
            context.canvas.width * context.canvas.height * 4,
          );
          for (let i = 0; i < context.selection.mask.length; i++) {
            const isSelected = context.selection.mask[i] === 1;
            const pIdx = i * 4;
            if (isSelected) {
              // transparent = editable
              mData[pIdx + 3] = 0;
            } else {
              // opaque = not editable
              mData[pIdx] = 0;
              mData[pIdx + 1] = 0;
              mData[pIdx + 2] = 0;
              mData[pIdx + 3] = 255;
            }
          }
          const mImgData = new ImageData(
            mData,
            context.canvas.width,
            context.canvas.height,
          );
          mCtx.putImageData(mImgData, 0, 0);

          const mUpscaleCanvas = document.createElement("canvas");
          mUpscaleCanvas.width = upscaleSize;
          mUpscaleCanvas.height = upscaleSize;
          const mUpCtx = mUpscaleCanvas.getContext("2d");
          if (mUpCtx) {
            mUpCtx.imageSmoothingEnabled = false;
            mUpCtx.drawImage(maskCanvas, 0, 0, upscaleSize, upscaleSize);
            const mBlob = await new Promise<Blob>((res, rej) =>
              mUpscaleCanvas.toBlob(
                (b) => (b ? res(b) : rej("err")),
                "image/png",
              ),
            );
            maskFile = new File([mBlob], "mask.png", { type: "image/png" });
          }
        }

        // 3. Call API
        const response = await openai.images.edit({
          image: imageFile,
          mask: maskFile,
          prompt: `Pixel art style, keeping the existing pixel art structure. ${instruction}`,
          n: 1,
          size: "512x512", // match upscaled size
          response_format: "b64_json",
        });

        const b64 = response.data?.[0]?.b64_json;
        if (!b64) throw new Error("No image data returned");

        // 4. Downscale back to original canvas size
        const editedPixelData = await imageToPixelData(
          b64,
          context.canvas.width,
          context.canvas.height,
        );

        // 5. If there's a selection, explicitly stitch the edited pixels inside the selection mask
        // with the original pixels outside the mask, to be perfectly safe.
        const finalData = new Uint8ClampedArray(asset.length);
        for (let i = 0; i < finalData.length; i++) finalData[i] = asset[i];

        if (context.selection) {
          const mask = context.selection.mask;
          for (let i = 0; i < mask.length; i++) {
            if (mask[i] === 1) {
              // 1 = selected
              const pIdx = i * 4;
              finalData[pIdx] = editedPixelData[pIdx];
              finalData[pIdx + 1] = editedPixelData[pIdx + 1];
              finalData[pIdx + 2] = editedPixelData[pIdx + 2];
              finalData[pIdx + 3] = editedPixelData[pIdx + 3];
            }
          }
        } else {
          // Replace everything
          for (let i = 0; i < editedPixelData.length; i++) {
            finalData[i] = editedPixelData[i];
          }
        }

        return {
          success: true,
          data: finalData,
          message: `Edited asset based on: "${instruction}"`,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || "Failed to edit image",
        };
      }
    },

    analyze: async (asset: Uint8ClampedArray, context: AIEditorContext) => {
      try {
        // Convert to base64 to send to vision model
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

        const response = await openai.chat.completions.create({
          model: model === "dall-e-3" ? "gpt-4o" : model, // Fallback to gpt-4o if they configured dall-e-3 (dalle doesn't do text/vision)
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
          error: error.message || "Failed to analyze image",
        };
      }
    },
  };
};
