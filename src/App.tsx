import { Toolbar } from "./components/workspace/Toolbar";
import { PixelCanvas } from "./components/workspace/PixelCanvas";
import { RightPanel } from "./components/workspace/RightPanel";
import { useAppStore } from "./store";

function App() {
  const { metadata } = useAppStore();

  return (
    <div className="flex flex-col h-screen w-full bg-neutral-900 text-neutral-200 overflow-hidden font-sans">
      {/* Menu Bar */}
      <header className="h-10 border-b border-neutral-700 bg-neutral-800 flex items-center px-4 justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="font-bold text-white tracking-wide">PIXEL AI</div>
          <nav className="flex gap-1 text-sm">
            <button className="px-3 py-1 hover:bg-neutral-700 rounded text-neutral-300">
              File
            </button>
            <button className="px-3 py-1 hover:bg-neutral-700 rounded text-neutral-300">
              Edit
            </button>
            <button className="px-3 py-1 hover:bg-neutral-700 rounded text-neutral-300">
              Image
            </button>
            <button className="px-3 py-1 hover:bg-neutral-700 rounded text-neutral-300">
              Layer
            </button>
            <button className="px-3 py-1 hover:bg-neutral-700 rounded text-neutral-300">
              View
            </button>
            <button className="px-3 py-1 hover:bg-neutral-700 rounded text-blue-400">
              AI
            </button>
          </nav>
        </div>
        <div className="text-xs text-neutral-500">{metadata.name}</div>
      </header>

      {/* Main Workspace */}
      <main className="flex flex-1 overflow-hidden">
        <Toolbar />
        <div className="flex-1 p-6 relative flex flex-col">
          <PixelCanvas />

          {/* Status Bar */}
          <div className="absolute bottom-0 left-0 right-0 h-8 flex items-center justify-between px-4 text-xs text-neutral-500 bg-neutral-900/80 backdrop-blur">
            <div className="flex gap-4">
              <span>Zoom: 100%</span>
              <span>Pos: 32, 16</span>
            </div>
            <div>Phase 1 Scaffold</div>
          </div>
        </div>
        <RightPanel />
      </main>
    </div>
  );
}

export default App;
