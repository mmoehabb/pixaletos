import { create } from "zustand";

export type ReferenceViewMode = "image" | "canvas";
export type CameraScaleMode = "fit" | "1:1";

export interface OverlayPosition {
  x: number;
  y: number;
}

export interface OverlaySize {
  width: number;
  height: number;
}

export const REFERENCE_VIEW_MIN_WIDTH = 220;
export const REFERENCE_VIEW_MIN_HEIGHT = 180;
export const REFERENCE_VIEW_HEADER_HEIGHT = 34;

const STORAGE_KEY = "pixaletos-reference-view-v1";

interface PersistedReferencePrefs {
  isOpen?: boolean;
  isMinimized?: boolean;
  mode?: ReferenceViewMode;
  position?: OverlayPosition;
  size?: OverlaySize;
  opacity?: number;
  imagePixelated?: boolean;
  imageFlipX?: boolean;
  cameraScaleMode?: CameraScaleMode;
  showViewportRect?: boolean;
}

function loadPrefs(): PersistedReferencePrefs {
  try {
    if (typeof localStorage === "undefined") return {};
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function savePrefs(prefs: PersistedReferencePrefs) {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* Session state remains usable even if storage is unavailable. */
  }
}

export function clampOverlayRect(
  position: OverlayPosition,
  size: OverlaySize,
  bounds: { width: number; height: number },
  minimized = false,
): { position: OverlayPosition; size: OverlaySize } {
  const maxW = Math.max(REFERENCE_VIEW_MIN_WIDTH, bounds.width);
  const maxH = Math.max(REFERENCE_VIEW_MIN_HEIGHT, bounds.height);

  const width = Math.max(REFERENCE_VIEW_MIN_WIDTH, Math.min(size.width, maxW));
  const height = Math.max(
    REFERENCE_VIEW_MIN_HEIGHT,
    Math.min(size.height, maxH),
  );

  const effectiveHeight = minimized ? REFERENCE_VIEW_HEADER_HEIGHT : height;
  const maxX = Math.max(0, bounds.width - width);
  const maxY = Math.max(0, bounds.height - effectiveHeight);

  return {
    position: {
      x: Math.max(0, Math.min(position.x, maxX)),
      y: Math.max(0, Math.min(position.y, maxY)),
    },
    size: { width, height },
  };
}

export function computeCameraViewportRect(
  pan: { x: number; y: number },
  zoom: number,
  dimensions: { width: number; height: number },
  viewportSize: { width: number; height: number },
): { x: number; y: number; width: number; height: number } | null {
  if (
    zoom <= 0 ||
    dimensions.width <= 0 ||
    dimensions.height <= 0 ||
    viewportSize.width <= 0 ||
    viewportSize.height <= 0
  ) {
    return null;
  }

  const canvasLeft = pan.x + (dimensions.width * (1 - zoom)) / 2;
  const canvasTop = pan.y + (dimensions.height * (1 - zoom)) / 2;

  return {
    x: -canvasLeft / zoom,
    y: -canvasTop / zoom,
    width: viewportSize.width / zoom,
    height: viewportSize.height / zoom,
  };
}

export interface ReferenceViewState {
  isOpen: boolean;
  isMinimized: boolean;
  mode: ReferenceViewMode;
  position: OverlayPosition;
  size: OverlaySize;
  opacity: number;

  // Session-only external image state
  imageUrl: string | null;
  imageName: string | null;
  imageNaturalSize: { width: number; height: number } | null;
  imageZoom: number;
  imagePan: { x: number; y: number };
  imagePixelated: boolean;
  imageFlipX: boolean;
  isPickingColor: boolean;

  // Canvas camera state
  cameraScaleMode: CameraScaleMode;
  showViewportRect: boolean;
  canvasViewportSize: { width: number; height: number };

  setOpen: (isOpen: boolean) => void;
  toggleOpen: () => void;
  setMinimized: (isMinimized: boolean) => void;
  toggleMinimized: () => void;
  setMode: (mode: ReferenceViewMode) => void;
  setPosition: (position: OverlayPosition) => void;
  setSize: (size: OverlaySize) => void;
  setRect: (position: OverlayPosition, size: OverlaySize) => void;
  setOpacity: (opacity: number) => void;

  setImage: (file: Blob, name?: string) => void;
  setImageNaturalSize: (size: { width: number; height: number } | null) => void;
  clearImage: () => void;
  setImageZoom: (zoom: number) => void;
  setImagePan: (pan: { x: number; y: number }) => void;
  resetImageView: () => void;
  setImagePixelated: (pixelated: boolean) => void;
  setImageFlipX: (flipX: boolean) => void;
  setIsPickingColor: (picking: boolean) => void;

  setCameraScaleMode: (mode: CameraScaleMode) => void;
  setShowViewportRect: (show: boolean) => void;
  setCanvasViewportSize: (size: { width: number; height: number }) => void;
}

const initialPrefs = loadPrefs();

const persistableSlice = (s: ReferenceViewState): PersistedReferencePrefs => ({
  isOpen: s.isOpen,
  isMinimized: s.isMinimized,
  mode: s.mode,
  position: s.position,
  size: s.size,
  opacity: s.opacity,
  imagePixelated: s.imagePixelated,
  imageFlipX: s.imageFlipX,
  cameraScaleMode: s.cameraScaleMode,
  showViewportRect: s.showViewportRect,
});

export const useReferenceViewStore = create<ReferenceViewState>((set, get) => ({
  isOpen: initialPrefs.isOpen ?? false,
  isMinimized: initialPrefs.isMinimized ?? false,
  mode: initialPrefs.mode === "canvas" ? "canvas" : "image",
  position: initialPrefs.position ?? { x: 16, y: 16 },
  size: initialPrefs.size ?? { width: 280, height: 260 },
  opacity:
    typeof initialPrefs.opacity === "number"
      ? Math.max(0.3, Math.min(1, initialPrefs.opacity))
      : 1,

  imageUrl: null,
  imageName: null,
  imageNaturalSize: null,
  imageZoom: 1,
  imagePan: { x: 0, y: 0 },
  imagePixelated: initialPrefs.imagePixelated ?? false,
  imageFlipX: initialPrefs.imageFlipX ?? false,
  isPickingColor: false,

  cameraScaleMode: initialPrefs.cameraScaleMode === "1:1" ? "1:1" : "fit",
  showViewportRect: initialPrefs.showViewportRect ?? true,
  canvasViewportSize: { width: 0, height: 0 },

  setOpen: (isOpen) => {
    set({ isOpen });
    savePrefs(persistableSlice(get()));
  },
  toggleOpen: () => {
    set((s) => ({ isOpen: !s.isOpen }));
    savePrefs(persistableSlice(get()));
  },
  setMinimized: (isMinimized) => {
    set({ isMinimized });
    savePrefs(persistableSlice(get()));
  },
  toggleMinimized: () => {
    set((s) => ({ isMinimized: !s.isMinimized }));
    savePrefs(persistableSlice(get()));
  },
  setMode: (mode) => {
    set({ mode, isPickingColor: false });
    savePrefs(persistableSlice(get()));
  },
  setPosition: (position) => {
    set({ position });
    savePrefs(persistableSlice(get()));
  },
  setSize: (size) => {
    set({
      size: {
        width: Math.max(REFERENCE_VIEW_MIN_WIDTH, size.width),
        height: Math.max(REFERENCE_VIEW_MIN_HEIGHT, size.height),
      },
    });
    savePrefs(persistableSlice(get()));
  },
  setRect: (position, size) => {
    set({
      position,
      size: {
        width: Math.max(REFERENCE_VIEW_MIN_WIDTH, size.width),
        height: Math.max(REFERENCE_VIEW_MIN_HEIGHT, size.height),
      },
    });
    savePrefs(persistableSlice(get()));
  },
  setOpacity: (opacity) => {
    set({ opacity: Math.max(0.3, Math.min(1, opacity)) });
    savePrefs(persistableSlice(get()));
  },

  setImage: (file, name) => {
    const prevUrl = get().imageUrl;
    if (prevUrl && typeof URL !== "undefined" && URL.revokeObjectURL) {
      URL.revokeObjectURL(prevUrl);
    }
    const url =
      typeof URL !== "undefined" && URL.createObjectURL
        ? URL.createObjectURL(file)
        : "";
    set({
      imageUrl: url,
      imageName: name || (file instanceof File ? file.name : "Reference image"),
      imageNaturalSize: null,
      imageZoom: 1,
      imagePan: { x: 0, y: 0 },
      isPickingColor: false,
    });
  },
  setImageNaturalSize: (imageNaturalSize) => set({ imageNaturalSize }),
  clearImage: () => {
    const prevUrl = get().imageUrl;
    if (prevUrl && typeof URL !== "undefined" && URL.revokeObjectURL) {
      URL.revokeObjectURL(prevUrl);
    }
    set({
      imageUrl: null,
      imageName: null,
      imageNaturalSize: null,
      imageZoom: 1,
      imagePan: { x: 0, y: 0 },
      isPickingColor: false,
    });
  },
  setImageZoom: (imageZoom) =>
    set({ imageZoom: Math.max(0.1, Math.min(20, imageZoom)) }),
  setImagePan: (imagePan) => set({ imagePan }),
  resetImageView: () => set({ imageZoom: 1, imagePan: { x: 0, y: 0 } }),
  setImagePixelated: (imagePixelated) => {
    set({ imagePixelated });
    savePrefs(persistableSlice(get()));
  },
  setImageFlipX: (imageFlipX) => {
    set({ imageFlipX });
    savePrefs(persistableSlice(get()));
  },
  setIsPickingColor: (isPickingColor) => set({ isPickingColor }),

  setCameraScaleMode: (cameraScaleMode) => {
    set({ cameraScaleMode });
    savePrefs(persistableSlice(get()));
  },
  setShowViewportRect: (showViewportRect) => {
    set({ showViewportRect });
    savePrefs(persistableSlice(get()));
  },
  setCanvasViewportSize: (canvasViewportSize) => set({ canvasViewportSize }),
}));
