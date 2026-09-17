import type { AIProvider, AIEditorContext, AISettings } from "../../types";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
      resolve(imageData.data);
    };
    img.onerror = (err) => reject(new Error(`Failed to load image: ${err}`));

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

const pollEasyDiffusionTask = async (
  endpoint: string,
  taskId: number,
): Promise<string> => {
  const maxAttempts = 120; // 2 minutes max
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const response = await fetch(`${endpoint}/image/stream/${taskId}`);

      if (!response.ok && response.status !== 425) {
        throw new Error(`Failed to stream task: ${response.statusText}`);
      }

      if (response.status === 200) {
        // The stream is ndjson (Newline Delimited JSON).
        // We can read it as text, split by newlines, and parse the last valid JSON object.
        const text = await response.text();
        const lines = text.trim().split("\n");
        let lastValidJson: any = null;

        for (let i = lines.length - 1; i >= 0; i--) {
          try {
            const lineData = JSON.parse(lines[i]);
            if (lineData) {
              lastValidJson = lineData;
              break;
            }
          } catch (e) {
            // ignore parse error on incomplete lines
          }
        }

        if (lastValidJson) {
          if (
            lastValidJson.status === "succeeded" ||
            lastValidJson.status === "completed"
          ) {
            if (lastValidJson.output && lastValidJson.output.length > 0) {
              return lastValidJson.output[0].data; // Assuming Base64 string is returned here. Easy Diffusion returns dataURL format mostly.
            }
          } else if (
            lastValidJson.status === "failed" ||
            lastValidJson.status === "error"
          ) {
            throw new Error(lastValidJson.error || "Task failed");
          }
        }
      }
    } catch (error: any) {
      if (!error.message.includes("425")) {
        console.error("Poll error:", error);
      }
    }

    await delay(1000);
    attempts++;
  }

  throw new Error("Task timed out");
};

export const createEasyDiffusionProvider = (
  settings: AISettings,
): AIProvider => {
  const endpoint = (settings.customEndpoint || "http://127.0.0.1:9000").replace(
    /\/$/,
    "",
  );
  const modelName = settings.model || "sd-v1-4";

  return {
    id: "easydiffusion",
    name: "Easy Diffusion (Local)",

    generate: async (prompt: string, context: AIEditorContext) => {
      try {
        let width = context.canvas.width;
        let height = context.canvas.height;

        // EasyDiffusion/SD requires dimensions to be multiples of 64
        const targetWidth = Math.ceil(width / 64) * 64 || 512;
        const targetHeight = Math.ceil(height / 64) * 64 || 512;

        const requestBody = {
          prompt: prompt,
          negative_prompt: "",
          width: targetWidth,
          height: targetHeight,
          num_outputs: 1,
          num_inference_steps: 25,
          guidance_scale: 7.5,
          use_stable_diffusion_model: modelName,
          show_only_filtered_image: true,
          output_format: "png",
        };

        const res = await fetch(`${endpoint}/render`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`API Error ${res.status}: ${errText}`);
        }

        const data = await res.json();
        const taskId = data.task;

        if (!taskId) throw new Error("No task ID returned");

        const resultBase64Url = await pollEasyDiffusionTask(endpoint, taskId);

        const pixelData = await imageToPixelData(
          resultBase64Url,
          context.canvas.width,
          context.canvas.height,
        );

        // Apply selection mask if exists
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
          error: error.message || "Failed to generate image via Easy Diffusion",
        };
      }
    },

    edit: async (
      asset: Uint8ClampedArray,
      instruction: string,
      context: AIEditorContext,
    ) => {
      try {
        let width = context.canvas.width;
        let height = context.canvas.height;

        const targetWidth = Math.ceil(width / 64) * 64 || 512;
        const targetHeight = Math.ceil(height / 64) * 64 || 512;

        // Convert asset to base64 Data URL
        const assetCanvas = document.createElement("canvas");
        assetCanvas.width = width;
        assetCanvas.height = height;
        const assetCtx = assetCanvas.getContext("2d");
        if (!assetCtx) throw new Error("Could not get context");

        const clonedData = new Uint8ClampedArray(asset.length);
        for (let i = 0; i < asset.length; i++) clonedData[i] = asset[i];

        const imgData = new ImageData(clonedData, width, height);
        assetCtx.putImageData(imgData, 0, 0);

        // Scale to SD dimensions
        const upCanvas = document.createElement("canvas");
        upCanvas.width = targetWidth;
        upCanvas.height = targetHeight;
        const upCtx = upCanvas.getContext("2d");
        if (!upCtx) throw new Error("Could not get context");
        upCtx.imageSmoothingEnabled = false;
        upCtx.drawImage(assetCanvas, 0, 0, targetWidth, targetHeight);

        const initImageDataUrl = upCanvas.toDataURL("image/png");

        const requestBody: any = {
          prompt: instruction,
          negative_prompt: "",
          width: targetWidth,
          height: targetHeight,
          num_outputs: 1,
          num_inference_steps: 25,
          guidance_scale: 7.5,
          use_stable_diffusion_model: modelName,
          show_only_filtered_image: true,
          output_format: "png",
          init_image: initImageDataUrl,
          prompt_strength: 0.5, // Default strength for edits
        };

        // Prepare mask if selection exists
        if (context.selection) {
          const maskCanvas = document.createElement("canvas");
          maskCanvas.width = width;
          maskCanvas.height = height;
          const mCtx = maskCanvas.getContext("2d");
          if (!mCtx) throw new Error("No ctx");

          const mData = new Uint8ClampedArray(width * height * 4);
          for (let i = 0; i < context.selection.mask.length; i++) {
            const isSelected = context.selection.mask[i] === 1;
            const pIdx = i * 4;
            // Easy Diffusion mask: White (255) means area to modify (transparent in our context = editable)
            // Black (0) means area to keep (opaque in our context = not editable)
            // Note: Easy diffusion UI actually accepts masks where black is inpaint, white is preserve. Let's verify standard:
            // In SD usually white is inpaint area. Wait, the easydiffusion API uses a standard image.
            // We'll set alpha mask. Actually let's use Grayscale: 255 for selected (editable), 0 for unselected.
            const val = isSelected ? 255 : 0;
            mData[pIdx] = val;
            mData[pIdx + 1] = val;
            mData[pIdx + 2] = val;
            mData[pIdx + 3] = 255;
          }
          const mImgData = new ImageData(mData, width, height);
          mCtx.putImageData(mImgData, 0, 0);

          const mUpCanvas = document.createElement("canvas");
          mUpCanvas.width = targetWidth;
          mUpCanvas.height = targetHeight;
          const mUpCtx = mUpCanvas.getContext("2d");
          if (mUpCtx) {
            mUpCtx.imageSmoothingEnabled = false;
            mUpCtx.drawImage(maskCanvas, 0, 0, targetWidth, targetHeight);
            requestBody.mask = mUpCanvas.toDataURL("image/png");
          }
        }

        const res = await fetch(`${endpoint}/render`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`API Error ${res.status}: ${errText}`);
        }

        const data = await res.json();
        const taskId = data.task;

        if (!taskId) throw new Error("No task ID returned");

        const resultBase64Url = await pollEasyDiffusionTask(endpoint, taskId);

        const editedPixelData = await imageToPixelData(
          resultBase64Url,
          width,
          height,
        );

        const finalData = new Uint8ClampedArray(asset.length);
        for (let i = 0; i < finalData.length; i++) finalData[i] = asset[i];

        if (context.selection) {
          const mask = context.selection.mask;
          for (let i = 0; i < mask.length; i++) {
            if (mask[i] === 1) {
              const pIdx = i * 4;
              finalData[pIdx] = editedPixelData[pIdx];
              finalData[pIdx + 1] = editedPixelData[pIdx + 1];
              finalData[pIdx + 2] = editedPixelData[pIdx + 2];
              finalData[pIdx + 3] = editedPixelData[pIdx + 3];
            }
          }
        } else {
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
          error: error.message || "Failed to edit image via Easy Diffusion",
        };
      }
    },

    analyze: async (_asset: Uint8ClampedArray, _context: AIEditorContext) => {
      // Easy Diffusion does not have an image analysis / vision endpoint
      return {
        success: false,
        error: "Image analysis is not supported by Easy Diffusion.",
      };
    },
  };
};
