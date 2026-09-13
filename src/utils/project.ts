import { useAppStore } from "../store";
import type { AppState } from "../store";
import { saveAs } from "file-saver";

const MAX_CANVAS_DIMENSION = 4096;
const MAX_CANVAS_PIXELS = MAX_CANVAS_DIMENSION * MAX_CANVAS_DIMENSION;
const MAX_EXPORT_DIMENSION = 16384;
const MAX_EXPORT_PIXELS = 64 * 1024 * 1024;

function isValidCanvasSize(width: unknown, height: unknown): boolean {
  return (
    Number.isInteger(width) &&
    Number.isInteger(height) &&
    typeof width === "number" &&
    typeof height === "number" &&
    width >= 1 &&
    height >= 1 &&
    width <= MAX_CANVAS_DIMENSION &&
    height <= MAX_CANVAS_DIMENSION &&
    width * height <= MAX_CANVAS_PIXELS
  );
}

// Convert Uint8ClampedArray to Base64 string for JSON serialization
function uint8ClampedArrayToBase64(arr: Uint8ClampedArray): string {
  // Encode in chunks: constructing one character at a time is quadratic for
  // larger canvases, while spreading the entire array can exceed call limits.
  const chunkSize = 0x8000;
  const chunks: string[] = [];
  for (let offset = 0; offset < arr.length; offset += chunkSize) {
    chunks.push(
      String.fromCharCode(...arr.subarray(offset, offset + chunkSize)),
    );
  }
  return btoa(chunks.join(""));
}

// Convert Base64 string back to Uint8ClampedArray
function base64ToUint8ClampedArray(base64: string): Uint8ClampedArray {
  const binary_string = atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8ClampedArray(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes;
}

export function saveProject(store: AppState) {
  store.updateCurrentKeyframe();
  const freshStore = useAppStore.getState();

  const serializedKeyframes = freshStore.keyframes.map((kf) => ({
    id: kf.id,
    layers: kf.layers.map((layer) => ({
      ...layer,
      data: uint8ClampedArrayToBase64(layer.data),
    })),
  }));

  const projectData = {
    version: 1,
    metadata: {
      ...freshStore.metadata,
      updatedAt: new Date().toISOString(),
    },
    dimensions: freshStore.dimensions,
    keyframes: serializedKeyframes,
    activeLayerId: freshStore.activeLayerId,
    fps: freshStore.fps,
  };

  const blob = new Blob([JSON.stringify(projectData, null, 2)], {
    type: "application/json",
  });

  const filename = `${store.metadata.name.replace(/[^a-z0-9]/gi, "_").toLowerCase() || "project"}.json`;
  saveAs(blob, filename);
}

export function loadProject(store: AppState) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json,application/json";
  input.onchange = (e) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result as string;
        const projectData = JSON.parse(result);

        // Basic validation
        if (
          projectData.version !== 1 ||
          !Number.isInteger(projectData.dimensions?.width) ||
          !Number.isInteger(projectData.dimensions?.height) ||
          !isValidCanvasSize(
            projectData.dimensions.width,
            projectData.dimensions.height,
          ) ||
          (!Array.isArray(projectData.layers) &&
            !Array.isArray(projectData.keyframes))
        ) {
          throw new Error("Invalid project format");
        }

        const expectedLength =
          projectData.dimensions.width * projectData.dimensions.height * 4;
        const layerIds = new Set<string>();

        // Handle backwards compatibility where we only had layers
        let deserializedKeyframes: any[] = [];
        if (Array.isArray(projectData.keyframes)) {
          deserializedKeyframes = projectData.keyframes.map(
            (kf: Record<string, unknown>) => {
              if (!kf || typeof kf !== "object")
                throw new Error("Invalid keyframe");
              const kfLayers = Array.isArray(kf.layers) ? kf.layers : [];
              return {
                id: String(kf.id || crypto.randomUUID()),
                layers: kfLayers.map((layer: unknown) => {
                  if (!layer || typeof layer !== "object")
                    throw new Error("Invalid layer in keyframe");
                  const savedLayer = layer as Record<string, unknown>;
                  if (typeof savedLayer.data !== "string")
                    throw new Error("Invalid layer data in keyframe");
                  const data = base64ToUint8ClampedArray(savedLayer.data);
                  if (data.length !== expectedLength)
                    throw new Error("Layer data size mismatch in keyframe");
                  return { ...savedLayer, data };
                }),
              };
            },
          );
        }

        let deserializedLayers: any[] = [];
        if (Array.isArray(projectData.layers)) {
          deserializedLayers = projectData.layers.map((layer: unknown) => {
            if (!layer || typeof layer !== "object")
              throw new Error("Invalid layer");
            const savedLayer = layer as Record<string, unknown>;
            if (typeof savedLayer.data !== "string")
              throw new Error("Invalid layer data");
            const data = base64ToUint8ClampedArray(savedLayer.data);
            if (data.length !== expectedLength)
              throw new Error("Layer data size mismatch");
            layerIds.add(String(savedLayer.id));
            return { ...savedLayer, data };
          });
        }

        let finalKeyframes = deserializedKeyframes;
        let finalLayers = deserializedLayers;

        if (finalKeyframes.length === 0 && finalLayers.length > 0) {
          finalKeyframes = [
            {
              id: crypto.randomUUID(),
              layers: finalLayers.map((l) => ({
                ...l,
                data: new Uint8ClampedArray(l.data as Uint8ClampedArray),
              })),
            },
          ];
        } else if (finalKeyframes.length > 0 && finalLayers.length === 0) {
          finalLayers = finalKeyframes[0].layers.map(
            (l: Record<string, unknown>) => ({
              ...l,
              data: new Uint8ClampedArray(l.data as Uint8ClampedArray),
            }),
          );
          finalKeyframes[0].layers.forEach((l: Record<string, unknown>) =>
            layerIds.add(String(l.id)),
          );
        }

        store.loadProjectState(
          {
            name:
              typeof projectData.metadata?.name === "string"
                ? projectData.metadata.name
                : "Untitled Project",
            createdAt:
              projectData.metadata?.createdAt ?? new Date().toISOString(),
            updatedAt:
              projectData.metadata?.updatedAt ?? new Date().toISOString(),
          },
          projectData.dimensions,
          finalLayers,
          finalKeyframes,
          layerIds.has(projectData.activeLayerId)
            ? projectData.activeLayerId
            : (finalLayers[0]?.id ?? null),
          projectData.fps || 12,
        );
      } catch (error) {
        console.error("Failed to load project:", error);
        alert("Failed to load project file.");
      }
    };
    reader.onerror = () => {
      alert("Failed to read project file.");
    };
    reader.readAsText(file);
  };
  input.click();
}

/** Decode a PNG into editor-native RGBA pixels and make it the current project. */
export function importPNG(store: AppState) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/png";
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      try {
        if (!isValidCanvasSize(image.naturalWidth, image.naturalHeight)) {
          throw new Error("Image dimensions exceed the supported canvas size");
        }
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) throw new Error("Canvas is unavailable");
        context.imageSmoothingEnabled = false;
        context.drawImage(image, 0, 0);
        const data = new Uint8ClampedArray(
          context.getImageData(0, 0, canvas.width, canvas.height).data,
        );
        const now = new Date().toISOString();
        const layerId = crypto.randomUUID();
        const newLayers = [
          {
            id: layerId,
            name: "Imported image",
            visible: true,
            opacity: 1,
            data,
          },
        ];
        store.loadProjectState(
          {
            name: file.name.replace(/\.png$/i, "") || "Imported image",
            createdAt: now,
            updatedAt: now,
          },
          { width: canvas.width, height: canvas.height },
          newLayers,
          [
            {
              id: crypto.randomUUID(),
              layers: newLayers.map((l) => ({
                ...l,
                data: new Uint8ClampedArray(l.data as Uint8ClampedArray),
              })),
            },
          ],
          layerId,
          12,
        );
      } catch (error) {
        console.error("Failed to import PNG:", error);
        alert("Could not import this PNG file.");
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      alert("Could not decode this PNG file.");
    };
    image.src = objectUrl;
  };
  input.click();
}

export function exportAnimationSpritesheet(store: AppState) {
  store.updateCurrentKeyframe();
  const { dimensions, keyframes } = useAppStore.getState();
  if (!keyframes || keyframes.length === 0) return;

  const frameWidth = dimensions.width;
  const frameHeight = dimensions.height;
  const columns = keyframes.length;

  const canvas = document.createElement("canvas");
  canvas.width = frameWidth * columns;
  canvas.height = frameHeight;
  const ctx = canvas.getContext("2d");

  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  keyframes.forEach((keyframe, index) => {
    const xOffset = index * frameWidth;

    // Draw layers from bottom to top (assuming layers array is top-to-bottom, reverse it)
    for (let i = keyframe.layers.length - 1; i >= 0; i--) {
      const layer = keyframe.layers[i];
      if (!layer.visible || layer.opacity === 0) continue;

      const imageData = new ImageData(
        new Uint8ClampedArray(layer.data),
        frameWidth,
        frameHeight,
      );

      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = frameWidth;
      tempCanvas.height = frameHeight;
      const tempCtx = tempCanvas.getContext("2d");
      if (!tempCtx) continue;

      tempCtx.putImageData(imageData, 0, 0);

      ctx.globalAlpha = layer.opacity;
      ctx.drawImage(tempCanvas, xOffset, 0);
    }
    ctx.globalAlpha = 1;
  });

  canvas.toBlob((blob) => {
    if (blob) {
      const filename = `${store.metadata.name.replace(/[^a-z0-9]/gi, "_").toLowerCase() || "animation"}_spritesheet.png`;
      saveAs(blob, filename);
    }
  }, "image/png");
}

export function exportToPNG(store: AppState, scale: number = 1) {
  const { dimensions, layers } = store;
  if (!Number.isInteger(scale) || scale < 1 || scale > 64) {
    throw new Error("PNG export scale must be a whole number between 1 and 64");
  }
  if (
    dimensions.width * scale > MAX_EXPORT_DIMENSION ||
    dimensions.height * scale > MAX_EXPORT_DIMENSION ||
    dimensions.width * scale * dimensions.height * scale > MAX_EXPORT_PIXELS
  ) {
    throw new Error("Scaled PNG dimensions exceed the export limit");
  }

  // Create an offscreen canvas with original dimensions
  const canvas = document.createElement("canvas");
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    console.error("Failed to get 2d context for export");
    return;
  }

  // Clear with transparency
  ctx.clearRect(0, 0, dimensions.width, dimensions.height);

  // Draw layers from bottom to top (assuming layers array is top-to-bottom, reverse it)
  // Wait, in store it says: layers: [newLayer, ...state.layers], so index 0 is top
  // Let's iterate in reverse
  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i];
    if (!layer.visible || layer.opacity === 0) continue;

    // Create ImageData from Uint8ClampedArray
    // Since TS has some quirks with ArrayBuffer vs SharedArrayBuffer in some environments,
    // we cast through any to fix type checking for ImageDataArray.
    const imageData = new ImageData(
      new Uint8ClampedArray(layer.data),
      dimensions.width,
      dimensions.height,
    );

    // Create a temporary canvas to draw this layer
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = dimensions.width;
    tempCanvas.height = dimensions.height;
    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) continue;

    tempCtx.putImageData(imageData, 0, 0);

    // Draw temp canvas onto main canvas with globalAlpha
    ctx.globalAlpha = layer.opacity;
    ctx.drawImage(tempCanvas, 0, 0);
  }
  ctx.globalAlpha = 1;

  // If scaling is needed (e.g. scale = 4 for nearest-neighbor 4x scaling)
  let finalCanvas = canvas;
  if (scale !== 1) {
    const scaledCanvas = document.createElement("canvas");
    scaledCanvas.width = dimensions.width * scale;
    scaledCanvas.height = dimensions.height * scale;
    const scaledCtx = scaledCanvas.getContext("2d");

    if (scaledCtx) {
      scaledCtx.imageSmoothingEnabled = false; // Nearest-neighbor scaling
      scaledCtx.drawImage(
        canvas,
        0,
        0,
        scaledCanvas.width,
        scaledCanvas.height,
      );
      finalCanvas = scaledCanvas;
    }
  }

  // Download as PNG
  finalCanvas.toBlob((blob) => {
    if (blob) {
      const filename = `${store.metadata.name.replace(/[^a-z0-9]/gi, "_").toLowerCase() || "export"}.png`;
      saveAs(blob, filename);
    }
  }, "image/png");
}
