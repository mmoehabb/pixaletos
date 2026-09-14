import { create } from "zustand";
import type {
  ProjectState,
  EditorState,
  HistoryState,
  Tool,
  Layer,
  Command,
  AnimationState,
  Keyframe,
  AIState,
  AISettings,
  AIHistoryItem,
} from "../types";

export interface AppState
  extends ProjectState, EditorState, HistoryState, AnimationState, AIState {
  createNewProject: (width?: number, height?: number) => void;
  setDimensions: (width: number, height: number) => void;
  setTool: (tool: Tool) => void;
  setForegroundColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  setBrushSize: (size: number) => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  setSelection: (selection: Uint8Array | null) => void;

  addLayer: () => void;
  removeLayer: (id: string) => void;
  updateLayer: (id: string, updates: Partial<Layer>) => void;
  updateLayerData: (id: string, data: Uint8ClampedArray) => void;
  setActiveLayer: (id: string) => void;
  reorderLayers: (layerIds: string[]) => void;

  executeCommand: (command: Command) => void;
  undo: () => void;
  redo: () => void;

  loadProjectState: (
    metadata: any,
    dimensions: any,
    layers: Layer[],
    keyframes: Keyframe[],
    activeLayerId: string | null,
    fps: number,
  ) => void;
  replaceCanvas: (
    dimensions: ProjectState["dimensions"],
    layers: Layer[],
    keyframes: Keyframe[],
    activeLayerId: string | null,
  ) => void;

  setAISettings: (settings: Partial<AISettings>) => void;
  addAIHistoryItem: (item: Omit<AIHistoryItem, "id" | "timestamp">) => void;
  updateAIHistoryItem: (id: string, updates: Partial<AIHistoryItem>) => void;
  setAskAIDialogOpen: (isOpen: boolean) => void;
  setAISettingsDialogOpen: (isOpen: boolean) => void;
  setAIPreviewResult: (
    result: { data: Uint8ClampedArray; type: string; prompt: string } | null,
  ) => void;

  addKeyframe: () => void;
  duplicateKeyframe: (id: string) => void;
  deleteKeyframe: (id: string) => void;
  selectKeyframe: (id: string) => void;
  updateCurrentKeyframe: () => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setFps: (fps: number) => void;
  setIsTimelineVisible: (isVisible: boolean) => void;
}

const cloneLayers = (layers: Layer[]): Layer[] => {
  return layers.map((layer) => ({
    ...layer,
    id: crypto.randomUUID(),
    data: new Uint8ClampedArray(layer.data),
  }));
};

export const useAppStore = create<AppState>((set, get) => ({
  metadata: {
    name: "Untitled Project",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  dimensions: {
    width: 64,
    height: 64,
  },
  layers: [],
  activeLayerId: null,

  currentTool: "pencil",
  foregroundColor: "#000000",
  backgroundColor: "#ffffff",
  brushSize: 1,
  zoom: 1,
  pan: { x: 0, y: 0 },
  selection: null,

  past: [],
  future: [],

  keyframes: [],
  activeKeyframeId: null,
  isPlaying: false,
  fps: 12,
  isTimelineVisible: false,

  aiSettings: {
    providerId: "mock",
    apiKey: "",
    customEndpoint: "",
  },
  aiHistory: [],
  isAskAIDialogOpen: false,
  isAISettingsDialogOpen: false,
  aiPreviewResult: null,

  createNewProject: (width = 64, height = 64) =>
    set(() => {
      const now = new Date().toISOString();
      const layer: Layer = {
        id: crypto.randomUUID(),
        name: "Layer 1",
        visible: true,
        opacity: 1,
        data: new Uint8ClampedArray(width * height * 4),
      };
      const initialKeyframe: Keyframe = {
        id: crypto.randomUUID(),
        layers: cloneLayers([layer]),
      };

      return {
        metadata: {
          name: "Untitled Project",
          createdAt: now,
          updatedAt: now,
        },
        dimensions: { width, height },
        layers: [layer],
        activeLayerId: layer.id,
        selection: null,
        pan: { x: 0, y: 0 },
        past: [],
        future: [],
        keyframes: [initialKeyframe],
        activeKeyframeId: initialKeyframe.id,
      };
    }),

  setDimensions: (width, height) =>
    set((state) => ({
      dimensions: { width, height },
      metadata: { ...state.metadata, updatedAt: new Date().toISOString() },
    })),
  setTool: (tool) => set({ currentTool: tool }),
  setForegroundColor: (color) => set({ foregroundColor: color }),
  setBackgroundColor: (color) => set({ backgroundColor: color }),
  setBrushSize: (size) => set({ brushSize: size }),
  setZoom: (zoom) => set({ zoom }),
  setPan: (pan) => set({ pan }),
  setSelection: (selection) => set({ selection }),

  addLayer: () =>
    set((state) => {
      const newLayer: Layer = {
        id: crypto.randomUUID(),
        name: `Layer ${state.layers.length + 1}`,
        visible: true,
        opacity: 1,
        data: new Uint8ClampedArray(
          state.dimensions.width * state.dimensions.height * 4,
        ),
      };
      return {
        layers: [newLayer, ...state.layers],
        activeLayerId: newLayer.id,
        metadata: { ...state.metadata, updatedAt: new Date().toISOString() },
      };
    }),

  removeLayer: (id) =>
    set((state) => ({
      layers: state.layers.filter((l) => l.id !== id),
      activeLayerId:
        state.activeLayerId === id
          ? state.layers.find((l) => l.id !== id)?.id || null
          : state.activeLayerId,
      metadata: { ...state.metadata, updatedAt: new Date().toISOString() },
    })),

  updateLayer: (id, updates) =>
    set((state) => {
      const newLayers = state.layers.map((l) =>
        l.id === id ? { ...l, ...updates } : l,
      );
      return {
        layers: newLayers,
        metadata: { ...state.metadata, updatedAt: new Date().toISOString() },
      };
    }),

  updateLayerData: (id, data) =>
    set((state) => {
      const newLayers = state.layers.map((l) =>
        l.id === id ? { ...l, data } : l,
      );
      return {
        layers: newLayers,
        metadata: { ...state.metadata, updatedAt: new Date().toISOString() },
      };
    }),

  setActiveLayer: (id) => set({ activeLayerId: id }),

  reorderLayers: (layerIds) =>
    set((state) => {
      const newLayers = layerIds
        .map((id) => state.layers.find((l) => l.id === id))
        .filter((l): l is Layer => !!l);
      return {
        layers: newLayers,
        metadata: { ...state.metadata, updatedAt: new Date().toISOString() },
      };
    }),

  executeCommand: (command) => {
    command.redo();
    set((state) => ({
      past: [...state.past, command],
      future: [],
    }));
  },

  undo: () => {
    const state = get();
    if (state.past.length === 0) return;
    const command = state.past[state.past.length - 1];
    command.undo();
    set((state) => ({
      past: state.past.slice(0, -1),
      future: [command, ...state.future],
    }));
  },

  redo: () => {
    const state = get();
    if (state.future.length === 0) return;
    const command = state.future[0];
    command.redo();
    set((state) => ({
      past: [...state.past, command],
      future: state.future.slice(1),
    }));
  },

  loadProjectState: (
    metadata,
    dimensions,
    layers,
    keyframes,
    activeLayerId,
    fps,
  ) =>
    set({
      metadata,
      dimensions,
      layers,
      keyframes,
      activeLayerId,
      activeKeyframeId: keyframes.length > 0 ? keyframes[0].id : null,
      fps,
      selection: null,
      past: [], // Reset history on load
      future: [],
    }),

  replaceCanvas: (dimensions, layers, keyframes, activeLayerId) =>
    set((state) => ({
      dimensions,
      layers,
      keyframes,
      activeLayerId,
      // A selection mask is dimension-dependent. Keeping the old mask would
      // block drawing outside its former bounds after a resize or rotation.
      selection: null,
      metadata: { ...state.metadata, updatedAt: new Date().toISOString() },
    })),
  addKeyframe: () =>
    set((state) => {
      const newLayers = cloneLayers(state.layers);
      const newKeyframe: Keyframe = {
        id: crypto.randomUUID(),
        layers: newLayers,
      };

      const loadedLayers = cloneLayers(newKeyframe.layers);

      // Determine the matching active layer in the newly cloned array
      // by finding the one at the same index
      const activeLayerIndex = state.layers.findIndex(
        (l) => l.id === state.activeLayerId,
      );
      const nextActiveLayerId =
        activeLayerIndex !== -1
          ? loadedLayers[activeLayerIndex].id
          : loadedLayers[0]?.id || null;

      return {
        keyframes: [...state.keyframes, newKeyframe],
        activeKeyframeId: newKeyframe.id,
        layers: loadedLayers,
        activeLayerId: nextActiveLayerId,
      };
    }),

  duplicateKeyframe: (id) =>
    set((state) => {
      const keyframeToDuplicate = state.keyframes.find((k) => k.id === id);
      if (!keyframeToDuplicate) return state;

      const newKeyframe: Keyframe = {
        id: crypto.randomUUID(),
        layers: cloneLayers(keyframeToDuplicate.layers),
      };

      const index = state.keyframes.findIndex((k) => k.id === id);
      const newKeyframes = [...state.keyframes];
      newKeyframes.splice(index + 1, 0, newKeyframe);

      const loadedLayers = cloneLayers(newKeyframe.layers);
      const activeLayerIndex = state.layers.findIndex(
        (l) => l.id === state.activeLayerId,
      );
      const nextActiveLayerId =
        activeLayerIndex !== -1
          ? loadedLayers[activeLayerIndex].id
          : loadedLayers[0]?.id || null;

      return {
        keyframes: newKeyframes,
        activeKeyframeId: newKeyframe.id,
        layers: loadedLayers,
        activeLayerId: nextActiveLayerId,
      };
    }),

  deleteKeyframe: (id) =>
    set((state) => {
      if (state.keyframes.length <= 1) return state; // Don't delete the last keyframe

      const index = state.keyframes.findIndex((k) => k.id === id);
      const newKeyframes = state.keyframes.filter((k) => k.id !== id);

      let nextActiveId = state.activeKeyframeId;
      let nextLayers = state.layers;
      let nextActiveLayerId = state.activeLayerId;

      if (state.activeKeyframeId === id) {
        const nextKeyframe =
          newKeyframes[Math.min(index, newKeyframes.length - 1)];
        nextActiveId = nextKeyframe.id;
        nextLayers = cloneLayers(nextKeyframe.layers);

        const activeLayerIndex = state.layers.findIndex(
          (l) => l.id === state.activeLayerId,
        );
        nextActiveLayerId =
          activeLayerIndex !== -1 && nextLayers[activeLayerIndex]
            ? nextLayers[activeLayerIndex].id
            : nextLayers[0]?.id || null;
      }

      return {
        keyframes: newKeyframes,
        activeKeyframeId: nextActiveId,
        layers: nextLayers,
        activeLayerId: nextActiveLayerId,
      };
    }),

  selectKeyframe: (id) =>
    set((state) => {
      const keyframe = state.keyframes.find((k) => k.id === id);
      if (!keyframe) return state;

      // When selecting a new keyframe, we first need to save the current canvas state
      // to the previously active keyframe, then load the new one.
      const updatedKeyframes = state.keyframes.map((k) => {
        if (k.id === state.activeKeyframeId) {
          return { ...k, layers: cloneLayers(state.layers) };
        }
        return k;
      });

      const loadedLayers = cloneLayers(keyframe.layers);
      const activeLayerIndex = state.layers.findIndex(
        (l) => l.id === state.activeLayerId,
      );
      const nextActiveLayerId =
        activeLayerIndex !== -1 && loadedLayers[activeLayerIndex]
          ? loadedLayers[activeLayerIndex].id
          : loadedLayers[0]?.id || null;

      return {
        keyframes: updatedKeyframes,
        activeKeyframeId: id,
        layers: loadedLayers,
        activeLayerId: nextActiveLayerId,
      };
    }),

  updateCurrentKeyframe: () =>
    set((state) => {
      if (!state.activeKeyframeId) return state;

      return {
        keyframes: state.keyframes.map((k) =>
          k.id === state.activeKeyframeId
            ? { ...k, layers: cloneLayers(state.layers) }
            : k,
        ),
      };
    }),

  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setFps: (fps) => set({ fps }),
  setIsTimelineVisible: (isTimelineVisible) => set({ isTimelineVisible }),

  setAISettings: (settings) =>
    set((state) => ({ aiSettings: { ...state.aiSettings, ...settings } })),
  addAIHistoryItem: (item) =>
    set((state) => ({
      aiHistory: [
        { ...item, id: crypto.randomUUID(), timestamp: Date.now() },
        ...state.aiHistory,
      ],
    })),
  updateAIHistoryItem: (id, updates) =>
    set((state) => ({
      aiHistory: state.aiHistory.map((item) =>
        item.id === id ? { ...item, ...updates } : item,
      ),
    })),
  setAskAIDialogOpen: (isOpen) => set({ isAskAIDialogOpen: isOpen }),
  setAISettingsDialogOpen: (isOpen) => set({ isAISettingsDialogOpen: isOpen }),
  setAIPreviewResult: (result) => set({ aiPreviewResult: result }),
}));
