import { useEffect, useState } from "react";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { BrushControls } from "./components/workspace/BrushControls";
import { Toolbar } from "./components/workspace/Toolbar";
import { PixelCanvas } from "./components/workspace/PixelCanvas";
import { RightPanel } from "./components/workspace/RightPanel";
import { KeyboardShortcuts } from "./components/workspace/KeyboardShortcuts";
import { MenuBar } from "./components/workspace/MenuBar";
import { TimelineDock } from "./components/workspace/TimelineDock";
import { hasUnsavedChanges, markProjectSaved } from "./utils/project";
import { Recovery } from "./components/workspace/Recovery";
import { AskAIDialog } from "./components/workspace/AskAIDialog";
import { useAppStore } from "./store";
import packageJson from "../package.json";

function App() {
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
  const {
    createNewProject,
    layers,
    dimensions,
    metadata,
    zoom,
    currentTool,
    setZoom,
    isTimelineVisible,
    setIsTimelineVisible,
  } = useAppStore();

  useEffect(() => {
    if (layers.length === 0) {
      createNewProject();
      markProjectSaved();
    }
  }, [layers, createNewProject]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges()) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#111318] font-sans text-neutral-200">
      <KeyboardShortcuts />
      <header className="z-20 flex flex-wrap flex-shrink-0 items-center border-b border-white/8 bg-[#191c23] px-2 sm:px-4 shadow-sm">
        <div className="hidden md:flex h-12 mr-4 xl:mr-8 items-center gap-2.5 text-sm font-semibold tracking-tight text-white">
          <span
            aria-hidden="true"
            className="grid h-6 w-6 grid-cols-2 gap-0.5 rounded-md bg-indigo-500 p-1 shadow-[0_0_18px_rgba(99,102,241,0.35)]"
          >
            <span className="rounded-[1px] bg-white" />
            <span className="rounded-[1px] bg-indigo-200" />
            <span className="rounded-[1px] bg-indigo-200" />
            <span className="rounded-[1px] bg-white" />
          </span>
          <span>
            Pixaletos
            <span className="ml-1.5 text-xs text-neutral-400 font-normal">
              v{packageJson.version}
            </span>
          </span>
        </div>
        <MenuBar />
        <BrushControls />
        <div className="ml-auto flex h-12 items-center gap-2">
          <div className="hidden sm:block rounded-full border border-indigo-400/15 bg-indigo-400/8 px-2.5 py-1 text-[11px] font-medium text-indigo-200">
            Pixel editor
          </div>
          <button
            onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
            className="md:hidden flex items-center justify-center rounded p-1.5 text-neutral-400 hover:bg-white/10 hover:text-white"
            aria-label={
              isRightPanelOpen ? "Close right panel" : "Open right panel"
            }
          >
            {isRightPanelOpen ? (
              <PanelRightClose size={18} />
            ) : (
              <PanelRightOpen size={18} />
            )}
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex flex-col-reverse md:flex-row flex-1 overflow-hidden relative">
        <Toolbar />

        <div className="flex-1 flex flex-col relative overflow-hidden bg-neutral-950">
          {layers.length > 0 && <PixelCanvas />}
          {isTimelineVisible && <TimelineDock />}
        </div>

        {/* Right panel overlay for mobile */}
        {isRightPanelOpen && (
          <div
            className="md:hidden absolute inset-0 z-40 bg-black/50"
            onClick={() => setIsRightPanelOpen(false)}
            aria-hidden="true"
          />
        )}
        <div
          className={`absolute inset-y-0 right-0 z-50 transform transition-transform duration-200 ease-in-out md:relative md:transform-none ${
            isRightPanelOpen
              ? "translate-x-0"
              : "translate-x-full md:translate-x-0"
          }`}
        >
          <RightPanel />
        </div>
      </div>

      <AskAIDialog />

      {/* Status Bar */}
      <div className="z-20 flex h-7 flex-shrink-0 items-center justify-between border-t border-white/8 bg-[#191c23] px-3 text-xs text-neutral-400">
        <div className="flex gap-4 items-center">
          <Recovery />
          <input
            aria-label="Project name"
            title="Project name"
            value={metadata.name}
            onChange={(event) =>
              useAppStore.setState((state) => ({
                metadata: {
                  ...state.metadata,
                  name: event.target.value,
                  updatedAt: new Date().toISOString(),
                },
              }))
            }
            className="hidden lg:block w-32 rounded bg-transparent px-1 text-neutral-300 hover:bg-white/10 focus:bg-neutral-800"
          />
          <button
            onClick={() => setIsTimelineVisible(!isTimelineVisible)}
            className={`px-2 py-0.5 rounded transition-colors ${
              isTimelineVisible
                ? "bg-indigo-500/20 text-indigo-300"
                : "hover:bg-white/10 hover:text-white"
            }`}
          >
            Timeline
          </button>
          <div className="w-px h-4 bg-white/10" />
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
