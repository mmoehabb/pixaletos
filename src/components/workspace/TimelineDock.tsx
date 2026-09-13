import { useAppStore } from "../../store";
import { useEffect, useRef } from "react";
import { Plus, Copy, Trash2, Play, Pause, Download } from "lucide-react";
import { exportAnimationSpritesheet } from "../../utils/project";

export function TimelineDock() {
  const {
    keyframes,
    activeKeyframeId,
    isPlaying,
    fps,
    addKeyframe,
    duplicateKeyframe,
    deleteKeyframe,
    selectKeyframe,
    setIsPlaying,
    setFps,
  } = useAppStore();

  const playIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isPlaying) {
      if (keyframes.length <= 1) {
        setIsPlaying(false);
        return;
      }

      const delay = 1000 / fps;
      playIntervalRef.current = window.setInterval(() => {
        const currentIndex = keyframes.findIndex(
          (k) => k.id === useAppStore.getState().activeKeyframeId,
        );
        const nextIndex = (currentIndex + 1) % keyframes.length;
        selectKeyframe(keyframes[nextIndex].id);
      }, delay);
    } else {
      if (playIntervalRef.current !== null) {
        window.clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    }

    return () => {
      if (playIntervalRef.current !== null) {
        window.clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    };
  }, [isPlaying, fps, keyframes, selectKeyframe, setIsPlaying]);

  const handleExportSpritesheet = async () => {
    const store = useAppStore.getState();
    exportAnimationSpritesheet(store);
  };

  return (
    <div className="flex h-32 flex-col border-t border-white/8 bg-[#191c23] text-sm text-neutral-200">
      <div className="flex h-8 items-center justify-between border-b border-white/8 px-4 bg-[#232730]">
        <div className="flex items-center gap-4">
          <span className="font-medium text-xs text-neutral-400 uppercase tracking-wider">
            Timeline
          </span>
          <div className="flex items-center gap-2 border-l border-white/8 pl-4">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex h-6 w-6 items-center justify-center rounded hover:bg-white/10"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </button>
            <div className="flex items-center gap-2">
              <label htmlFor="fps" className="text-xs text-neutral-400">
                FPS
              </label>
              <input
                id="fps"
                type="number"
                min="1"
                max="60"
                value={fps}
                onChange={(e) => setFps(Number(e.target.value))}
                className="w-12 rounded border border-white/10 bg-black/20 px-1 text-xs outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={addKeyframe}
            className="flex items-center gap-1 rounded bg-indigo-500/20 px-2 py-1 text-xs text-indigo-300 hover:bg-indigo-500/30"
          >
            <Plus className="h-3 w-3" />
            Add Frame
          </button>
          <button
            onClick={handleExportSpritesheet}
            className="flex items-center gap-1 rounded border border-white/10 px-2 py-1 text-xs hover:bg-white/10"
          >
            <Download className="h-3 w-3" />
            Export Spritesheet
          </button>
        </div>
      </div>

      <div className="flex flex-1 items-center gap-2 overflow-x-auto p-2">
        {keyframes.map((frame, index) => (
          <div
            key={frame.id}
            className={`group relative flex h-20 w-20 flex-shrink-0 cursor-pointer flex-col items-center justify-center rounded border ${
              activeKeyframeId === frame.id
                ? "border-indigo-500 bg-indigo-500/10"
                : "border-white/10 bg-black/20 hover:border-white/20"
            }`}
            onClick={() => selectKeyframe(frame.id)}
          >
            <span className="text-xs text-neutral-500">Frame {index + 1}</span>

            {/* Quick Actions overlay */}
            <div className="absolute top-1 right-1 hidden gap-1 group-hover:flex">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  duplicateKeyframe(frame.id);
                }}
                className="rounded bg-black/60 p-1 hover:bg-black"
                title="Duplicate"
              >
                <Copy className="h-3 w-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteKeyframe(frame.id);
                }}
                disabled={keyframes.length <= 1}
                className="rounded bg-black/60 p-1 hover:bg-red-500 disabled:opacity-50"
                title="Delete"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
