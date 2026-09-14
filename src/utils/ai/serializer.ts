import type { AppState } from "../../store";
import type { AIEditorContext, SerializedLayer } from "../../types";

export const serializeEditorContext = (state: AppState): AIEditorContext => {
  const serializedLayers: SerializedLayer[] = state.layers.map((layer) => ({
    id: layer.id,
    name: layer.name,
    visible: layer.visible,
    opacity: layer.opacity,
    // We clone the data to ensure the provider doesn't modify state directly
    data: new Uint8ClampedArray(layer.data),
  }));

  // Simple palette extraction: unique hex colors from active layer, limited to a reasonable number
  const palette = new Set<string>();
  const activeLayer = state.layers.find((l) => l.id === state.activeLayerId);
  if (activeLayer) {
    for (let i = 0; i < activeLayer.data.length; i += 4) {
      if (activeLayer.data[i + 3] === 0) continue; // skip transparent
      const hex = `#${activeLayer.data[i].toString(16).padStart(2, "0")}${activeLayer.data[i + 1].toString(16).padStart(2, "0")}${activeLayer.data[i + 2].toString(16).padStart(2, "0")}`;
      palette.add(hex);
      if (palette.size >= 256) break; // Limit palette size
    }
  }

  let selectionObj: AIEditorContext["selection"] | undefined;
  if (state.selection) {
    let minX = state.dimensions.width,
      minY = state.dimensions.height,
      maxX = 0,
      maxY = 0;

    // Find bounds of the selection
    for (let y = 0; y < state.dimensions.height; y++) {
      for (let x = 0; x < state.dimensions.width; x++) {
        const idx = y * state.dimensions.width + x;
        if (state.selection[idx] === 1) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (minX <= maxX && minY <= maxY) {
      selectionObj = {
        bounds: {
          x: minX,
          y: minY,
          width: maxX - minX + 1,
          height: maxY - minY + 1,
        },
        mask: new Uint8Array(state.selection),
      };
    }
  }

  return {
    canvas: {
      width: state.dimensions.width,
      height: state.dimensions.height,
    },
    layers: serializedLayers,
    palette: Array.from(palette),
    selection: selectionObj,
  };
};
