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
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#111318] font-sans text-neutral-200">
      <KeyboardShortcuts />
      <header className="z-20 flex h-12 flex-shrink-0 items-center border-b border-white/8 bg-[#191c23] px-4 shadow-sm">
        <div className="mr-8 flex items-center gap-2.5 text-sm font-semibold tracking-tight text-white">
          <span
            aria-hidden="true"
            className="grid h-6 w-6 grid-cols-2 gap-0.5 rounded-md bg-indigo-500 p-1 shadow-[0_0_18px_rgba(99,102,241,0.35)]"
          >
            <span className="rounded-[1px] bg-white" />
            <span className="rounded-[1px] bg-indigo-200" />
            <span className="rounded-[1px] bg-indigo-200" />
            <span className="rounded-[1px] bg-white" />
          </span>
          <span>Pixaletos</span>
        </div>
        <nav
          aria-label="Application menu"
          className="flex gap-1 text-sm text-neutral-400"
        >
          {["File", "Edit", "Image", "Layer", "View"].map((item) => (
            <button
              key={item}
              className="rounded px-2.5 py-1 transition-colors hover:bg-white/6 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
            >
              {item}
            </button>
          ))}
        </nav>
        <div className="ml-auto rounded-full border border-indigo-400/15 bg-indigo-400/8 px-2.5 py-1 text-[11px] font-medium text-indigo-200">
          Pixel editor
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        <Toolbar />

        <div className="flex-1 flex flex-col relative overflow-hidden bg-neutral-950">
          <PixelCanvas />
        </div>

        <RightPanel />
      </div>

      {/* Status Bar */}
      <div className="z-20 flex h-7 flex-shrink-0 items-center justify-between border-t border-white/8 bg-[#191c23] px-3 text-xs text-neutral-400">
        <div className="flex gap-4">
          <span>
            Tool:{" "}
            <span className="capitalize text-neutral-100">{currentTool}</span>
          </span>
          <span>
            Size: {dimensions.width}x{dimensions.height}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            aria-label="Zoom out"
            onClick={() => setZoom(Math.max(0.1, zoom - 0.5))}
            className="flex cursor-pointer items-center justify-center rounded px-2 py-1 transition-colors hover:bg-white/6 hover:text-white"
          >
            -
          </button>
          <span className="w-12 px-2 text-center text-neutral-100">
            {Math.round(zoom * 100)}%
          </span>
          <button
            aria-label="Zoom in"
            onClick={() => setZoom(Math.min(20, zoom + 0.5))}
            className="flex cursor-pointer items-center justify-center rounded px-2 py-1 transition-colors hover:bg-white/6 hover:text-white"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
