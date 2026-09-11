import type { AppState } from "../store";
import { saveAs } from "file-saver";

// Convert Uint8ClampedArray to Base64 string for JSON serialization
function uint8ClampedArrayToBase64(arr: Uint8ClampedArray): string {
  // Convert to standard array or Buffer if in Node. In browser, we can use btoa.
  // We need to convert it to a string chunk by chunk to avoid maximum call stack size exceeded
  let binary = "";
  const len = arr.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(arr[i]);
  }
  return btoa(binary);
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
  const serializedLayers = store.layers.map((layer) => ({
    ...layer,
    data: uint8ClampedArrayToBase64(layer.data),
  }));

  const projectData = {
    version: 1,
    metadata: {
      ...store.metadata,
      updatedAt: new Date().toISOString(),
    },
    dimensions: store.dimensions,
    layers: serializedLayers,
    activeLayerId: store.activeLayerId,
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
  input.accept = ".json";
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
        if (!projectData.dimensions || !projectData.layers) {
          throw new Error("Invalid project format");
        }

        const deserializedLayers = projectData.layers.map((layer: any) => ({
          ...layer,
          data: base64ToUint8ClampedArray(layer.data),
        }));

        store.setDimensions(
          projectData.dimensions.width,
          projectData.dimensions.height,
        );

        // Reset layers manually in the store, we need a way to completely overwrite state
        // Let's use the methods available or we'll need to add a reset function to store.

        // Let's implement a clean way to load by doing it manually using store methods
        // First, clear all existing layers
        store.layers.forEach((l) => store.removeLayer(l.id));

        // Store doesn't have a batch set method for project load, we need to add it or do it carefully
        // For now, let's just add one layer so the app doesn't crash, and we'll implement a proper store update
        // We will modify the store to add a `loadProjectState` method in a moment.

        // For now:
        store.loadProjectState(
          projectData.metadata,
          projectData.dimensions,
          deserializedLayers,
          projectData.activeLayerId,
        );
      } catch (error) {
        console.error("Failed to load project:", error);
        alert("Failed to load project file.");
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

export function exportToPNG(store: AppState, scale: number = 1) {
  const { dimensions, layers } = store;

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
      new Uint8ClampedArray(layer.data) as any,
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
