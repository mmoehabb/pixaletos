import { useEffect } from "react";
import { Toolbar } from "./components/workspace/Toolbar";
import { PixelCanvas } from "./components/workspace/PixelCanvas";
import { RightPanel } from "./components/workspace/RightPanel";
import { KeyboardShortcuts } from "./components/workspace/KeyboardShortcuts";
import { useAppStore } from "./store";

function App() {
  const { addLayer, layers, dimensions, zoom, currentTool, setZoom } =
    useAppStore();

  useEffect(() => {
    if (layers.length === 0) {
      addLayer();
    }
  }, [layers, addLayer]);

  return (
    <div className="flex flex-col h-screen w-screen bg-neutral-950 overflow-hidden text-neutral-200 font-sans">
      <KeyboardShortcuts />
      {/* Top Menu Bar placeholder */}
      <div className="h-10 bg-neutral-900 border-b border-neutral-800 flex items-center px-4 flex-shrink-0 z-20">
        <div className="font-semibold text-indigo-400 tracking-wide text-sm mr-8">
          PIXEL AI
        </div>
        <div className="flex gap-4 text-sm text-neutral-400">
          <button className="hover:text-white transition-colors">File</button>
          <button className="hover:text-white transition-colors">Edit</button>
          <button className="hover:text-white transition-colors">Image</button>
          <button className="hover:text-white transition-colors">Layer</button>
          <button className="hover:text-white transition-colors">View</button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        <Toolbar />

        <div className="flex-1 flex flex-col relative overflow-hidden bg-neutral-950">
          <PixelCanvas />
        </div>

        <RightPanel />
      </div>

      {/* Status Bar */}
      <div className="h-6 bg-indigo-950 border-t border-indigo-900 flex items-center px-3 justify-between text-xs text-indigo-300 flex-shrink-0 z-20">
        <div className="flex gap-4">
          <span>
            Tool: <span className="text-white capitalize">{currentTool}</span>
          </span>
          <span>
            Size: {dimensions.width}x{dimensions.height}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom(Math.max(0.1, zoom - 0.5))}
            className="hover:text-white"
          >
            -
          </button>
          <span className="w-12 text-center text-white">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(Math.min(20, zoom + 0.5))}
            className="hover:text-white"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
