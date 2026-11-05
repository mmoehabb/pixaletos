import { useAppStore } from "../../store";

export function BrushControls() {
  const { brushSize, brushOpacity, setBrushSize, setBrushOpacity } =
    useAppStore();

  return (
    <div
      role="group"
      aria-label="Brush settings"
      className="order-last flex w-full min-w-0 items-center gap-4 border-t border-white/8 py-2 xl:order-none xl:ml-6 xl:w-auto xl:gap-6 xl:border-t-0 xl:py-0"
    >
      <label className="flex min-w-0 flex-1 items-center gap-2 text-xs text-neutral-400 xl:flex-none">
        <span>Size</span>
        <input
          type="range"
          min="1"
          max="64"
          step="1"
          value={brushSize}
          onChange={(event) => setBrushSize(Number(event.target.value))}
          aria-label="Brush size"
          aria-valuetext={`${brushSize} pixels`}
          title="Brush size"
          className="h-6 w-0 min-w-0 flex-1 cursor-pointer accent-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 xl:w-28 xl:flex-none"
        />
        <span className="w-9 shrink-0 text-right tabular-nums text-neutral-200">
          {brushSize} px
        </span>
      </label>
      <label className="flex min-w-0 flex-1 items-center gap-2 text-xs text-neutral-400 xl:flex-none">
        <span>Opacity</span>
        <input
          type="range"
          min="1"
          max="100"
          step="1"
          value={brushOpacity}
          onChange={(event) => setBrushOpacity(Number(event.target.value))}
          aria-label="Brush opacity"
          aria-valuetext={`${brushOpacity}%`}
          title="Brush opacity (%)"
          className="h-6 w-0 min-w-0 flex-1 cursor-pointer accent-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 xl:w-28 xl:flex-none"
        />
        <span className="w-9 shrink-0 text-right tabular-nums text-neutral-200">
          {brushOpacity}%
        </span>
      </label>
    </div>
  );
}
