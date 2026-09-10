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
  // data representing the layer's pixels will go here
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

export interface AIProvider {
  id: string;
  name: string;
  generate: (prompt: string, context: any) => Promise<any>;
  edit: (asset: any, instruction: string, context: any) => Promise<any>;
  analyze: (asset: any, context: any) => Promise<any>;
}
