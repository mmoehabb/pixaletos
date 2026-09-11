import { create } from "zustand";
import type {
  ProjectState,
  EditorState,
  HistoryState,
  Tool,
  Layer,
  Command,
} from "../types";

export interface AppState extends ProjectState, EditorState, HistoryState {
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
    activeLayerId: string | null,
  ) => void;
}

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
    set((state) => ({
      layers: state.layers.map((l) => (l.id === id ? { ...l, ...updates } : l)),
      metadata: { ...state.metadata, updatedAt: new Date().toISOString() },
    })),

  updateLayerData: (id, data) =>
    set((state) => ({
      layers: state.layers.map((l) => (l.id === id ? { ...l, data } : l)),
      metadata: { ...state.metadata, updatedAt: new Date().toISOString() },
    })),

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

  loadProjectState: (metadata, dimensions, layers, activeLayerId) =>
    set({
      metadata,
      dimensions,
      layers,
      activeLayerId,
      past: [], // Reset history on load
      future: [],
    }),
}));
