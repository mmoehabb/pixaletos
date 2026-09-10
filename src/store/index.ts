import { create } from "zustand";
import type { ProjectState } from "../types";

interface AppState extends ProjectState {
  setDimensions: (width: number, height: number) => void;
  // actions will go here
}

export const useAppStore = create<AppState>((set) => ({
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

  setDimensions: (width, height) =>
    set((state) => ({
      dimensions: { width, height },
      metadata: { ...state.metadata, updatedAt: new Date().toISOString() },
    })),
}));
