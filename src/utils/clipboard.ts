import { useAppStore } from "../store";
import type { Layer } from "../types";

let clipboard: {
  width: number;
  height: number;
  data: Uint8ClampedArray;
} | null = null;

export function copySelection(cut = false) {
  const state = useAppStore.getState();
  const layer = state.layers.find((item) => item.id === state.activeLayerId);
  if (!layer) return;
  const data = new Uint8ClampedArray(layer.data.length);
  const remaining = new Uint8ClampedArray(layer.data);
  for (let i = 0; i < state.dimensions.width * state.dimensions.height; i++) {
    if (!state.selection || state.selection[i]) {
      data.set(layer.data.subarray(i * 4, i * 4 + 4), i * 4);
      if (cut) remaining.fill(0, i * 4, i * 4 + 4);
    }
  }
  clipboard = { ...state.dimensions, data };
  if (cut) {
    const original = new Uint8ClampedArray(layer.data);
    const id = layer.id;
    state.executeCommand({
      name: "Cut Selection",
      undo: () => useAppStore.getState().updateLayerData(id, original),
      redo: () => useAppStore.getState().updateLayerData(id, remaining),
    });
  }
}

export function pasteSelection() {
  if (!clipboard) return;
  const state = useAppStore.getState();
  const frameId = state.activeKeyframeId;
  const data = new Uint8ClampedArray(
    state.dimensions.width * state.dimensions.height * 4,
  );
  for (
    let y = 0;
    y < Math.min(clipboard.height, state.dimensions.height);
    y++
  ) {
    for (
      let x = 0;
      x < Math.min(clipboard.width, state.dimensions.width);
      x++
    ) {
      const source = (y * clipboard.width + x) * 4;
      data.set(
        clipboard.data.subarray(source, source + 4),
        (y * state.dimensions.width + x) * 4,
      );
    }
  }
  const layer: Layer = {
    id: crypto.randomUUID(),
    name: "Pasted selection",
    visible: true,
    opacity: 1,
    data,
  };
  const originalData = new Uint8ClampedArray(data);
  const priorActive = state.activeLayerId;
  const selectFrame = () => {
    if (frameId) useAppStore.getState().selectKeyframe(frameId);
  };
  state.executeCommand({
    name: "Paste Selection",
    undo: () => {
      selectFrame();
      useAppStore.setState((current) => ({
        layers: current.layers.filter((item) => item.id !== layer.id),
        activeLayerId: priorActive,
      }));
    },
    redo: () => {
      selectFrame();
      useAppStore.setState((current) => ({
        layers: [
          { ...layer, data: new Uint8ClampedArray(originalData) },
          ...current.layers.filter((item) => item.id !== layer.id),
        ],
        activeLayerId: layer.id,
      }));
    },
  });
}
