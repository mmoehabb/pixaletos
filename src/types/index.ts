export interface ProjectMetadata {
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  data: Uint8ClampedArray; // RGBA pixel data
}

export interface ProjectState {
  metadata: ProjectMetadata;
  dimensions: {
    width: number;
    height: number;
  };
  layers: Layer[];
  activeLayerId: string | null;
}

export type Tool =
  | "pencil"
  | "eraser"
  | "fill"
  | "line"
  | "rectangle"
  | "ellipse"
  | "eyedropper"
  | "select"
  | "select_brush"
  | "select_magic_wand"
  | "select_lasso"
  | "move"
  | "rotate"
  | "pan"
  | "zoom";

export interface Keyframe {
  id: string;
  layers: Layer[];
}

export interface AnimationState {
  keyframes: Keyframe[];
  activeKeyframeId: string | null;
  isPlaying: boolean;
  fps: number;
  isTimelineVisible: boolean;
}

export interface EditorState {
  currentTool: Tool;
  foregroundColor: string;
  backgroundColor: string;
  brushSize: number;
  zoom: number;
  pan: { x: number; y: number };
  selection: Uint8Array | null;
}

export interface Command {
  name: string;
  undo: () => void;
  redo: () => void;
}

export interface HistoryState {
  past: Command[];
  future: Command[];
}

export interface SerializedLayer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  data: Uint8ClampedArray;
}

export interface AIEditorContext {
  canvas: {
    width: number;
    height: number;
  };
  layers: SerializedLayer[];
  palette: string[];
  selection?: {
    bounds: { x: number; y: number; width: number; height: number };
    mask: Uint8Array;
  };
}

export type AIOperation =
  | { type: "generate"; prompt: string }
  | { type: "edit"; instruction: string }
  | { type: "analyze"; instruction: string }
  | { type: "pixel-manipulation" }
  | { type: "palette" }
  | { type: "resize" };

export interface AIProvider {
  id: string;
  name: string;
  generate: (prompt: string, context: AIEditorContext) => Promise<any>;
  edit: (
    asset: Uint8ClampedArray,
    instruction: string,
    context: AIEditorContext,
  ) => Promise<any>;
  analyze: (asset: Uint8ClampedArray, context: AIEditorContext) => Promise<any>;
}

export interface AISettings {
  providerId: string;
  apiKey: string;
  customEndpoint: string;
  model: string;
}

export interface AIHistoryItem {
  id: string;
  type:
    | "generate"
    | "edit"
    | "analyze"
    | "pixel-manipulation"
    | "palette"
    | "resize";
  prompt: string;
  status: "pending" | "success" | "error";
  timestamp: number;
  result?: any;
  error?: string;
}

export interface AIState {
  aiSettings: AISettings;
  aiHistory: AIHistoryItem[];
  isAskAIDialogOpen: boolean;
  isAISettingsDialogOpen: boolean;
  aiPreviewResult: {
    data: Uint8ClampedArray;
    type: string;
    prompt: string;
  } | null;
}
