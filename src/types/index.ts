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

export interface AIProvider {
  id: string;
  name: string;
  generate: (prompt: string, context: any) => Promise<any>;
  edit: (asset: any, instruction: string, context: any) => Promise<any>;
  analyze: (asset: any, context: any) => Promise<any>;
}

export interface AISettings {
  providerId: string;
  apiKey: string;
  customEndpoint: string;
}

export interface AIHistoryItem {
  id: string;
  type: "generate" | "edit" | "analyze";
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
}
