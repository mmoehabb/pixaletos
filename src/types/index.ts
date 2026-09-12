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
  | "move"
  | "pan"
  | "zoom";

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
