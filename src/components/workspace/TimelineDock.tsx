import { useAppStore } from "../../store";
import { useEffect, useRef } from "react";
import { Plus, Copy, Trash2, Play, Pause, Download } from "lucide-react";
import type { Layer } from "../../types";
import { exportAnimationSpritesheet } from "../../utils/project";

function FrameThumbnail({
  layers,
  width,
  height,
}: {
  layers: Layer[];
  width: number;
  height: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, width, height);
    for (const layer of [...layers].reverse()) {
      if (!layer.visible || !layer.opacity) continue;
      const temp = document.createElement("canvas");
      temp.width = width;
      temp.height = height;
      const target = temp.getContext("2d");
      if (!target) continue;
      target.putImageData(
        new ImageData(new Uint8ClampedArray(layer.data), width, height),
        0,
        0,
      );
      ctx.globalAlpha = layer.opacity;
      ctx.drawImage(temp, 0, 0);
    }
    ctx.globalAlpha = 1;
  }, [layers, width, height]);
  return (
    <canvas
      ref={ref}
      width={width}
      height={height}
      aria-hidden="true"
      className="h-12 w-12 object-contain"
      style={{
        imageRendering: "pixelated",
        backgroundImage:
          "conic-gradient(#aaa 25%, #eee 0 50%, #aaa 0 75%, #eee 0)",
        backgroundSize: "8px 8px",
      }}
    />
  );
}

export function TimelineDock() {
  const {
    keyframes,
    layers,
    dimensions,
    activeKeyframeId,
    isPlaying,
    isOnionSkin,
    setIsOnionSkin,
    moveKeyframe,
    fps,
    addKeyframe,
    duplicateKeyframe,
    deleteKeyframe,
    selectKeyframe,
    setIsPlaying,
    setFps,
  } = useAppStore();

  const playIntervalRef = useRef<number | null>(null);
  const draggedFrame = useRef<string | null>(null);

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
      <div className="flex h-8 items-center justify-between gap-4 overflow-x-auto whitespace-nowrap border-b border-white/8 px-4 bg-[#232730]">
        <div className="flex flex-shrink-0 items-center gap-4">
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
            <button
              type="button"
              aria-pressed={isOnionSkin}
              onClick={() => setIsOnionSkin(!isOnionSkin)}
              className={`rounded px-2 py-1 text-xs ${isOnionSkin ? "bg-indigo-500/30 text-indigo-200" : "hover:bg-white/10"}`}
            >
              Onion skin
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
                onChange={(e) =>
                  setFps(Math.max(1, Math.min(60, Number(e.target.value) || 1)))
                }
                className="w-12 rounded border border-white/10 bg-black/20 px-1 text-xs outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          <button
            onClick={() => addKeyframe(false)}
            className="flex items-center gap-1 rounded bg-indigo-500/20 px-2 py-1 text-xs text-indigo-300 hover:bg-indigo-500/30"
          >
            <Plus className="h-3 w-3" />
            Add Frame
          </button>
          <button
            onClick={() => addKeyframe(true)}
            className="rounded border border-white/10 px-2 py-1 text-xs hover:bg-white/10"
          >
            Blank Frame
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
            draggable
            onDragStart={() => {
              draggedFrame.current = frame.id;
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              if (draggedFrame.current)
                moveKeyframe(draggedFrame.current, index);
              draggedFrame.current = null;
            }}
            className={`group relative flex h-20 w-20 flex-shrink-0 cursor-pointer flex-col items-center justify-center rounded border ${
              activeKeyframeId === frame.id
                ? "border-indigo-500 bg-indigo-500/10"
                : "border-white/10 bg-black/20 hover:border-white/20"
            }`}
            onClick={() => selectKeyframe(frame.id)}
          >
            <FrameThumbnail
              layers={activeKeyframeId === frame.id ? layers : frame.layers}
              width={dimensions.width}
              height={dimensions.height}
            />
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
