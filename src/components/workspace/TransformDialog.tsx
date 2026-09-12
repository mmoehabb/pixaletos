import { useState, type FormEvent } from "react";
import { useAppStore } from "../../store";
import { resizeCanvas, scaleImage } from "../../utils/transforms";
import type { Command, Layer } from "../../types";

export type TransformMode = "canvas" | "scale" | "crop";

function cloneLayers(layers: Layer[]): Layer[] {
  return layers.map((layer) => ({
    ...layer,
    data: new Uint8ClampedArray(layer.data),
  }));
}

export function TransformDialog({
  mode,
  onClose,
}: {
  mode: TransformMode;
  onClose: () => void;
}) {
  const store = useAppStore();
  const [width, setWidth] = useState(store.dimensions.width);
  const [height, setHeight] = useState(store.dimensions.height);
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const title =
    mode === "canvas"
      ? "Canvas Size"
      : mode === "scale"
        ? "Scale Image"
        : "Crop Image";

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (
      !Number.isInteger(width) ||
      !Number.isInteger(height) ||
      width < 1 ||
      height < 1 ||
      width > 4096 ||
      height > 4096
    )
      return;
    if (
      mode === "crop" &&
      (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0)
    )
      return;
    const before = {
      dimensions: { ...store.dimensions },
      layers: cloneLayers(store.layers),
      activeLayerId: store.activeLayerId,
    };
    const afterLayers =
      mode === "scale"
        ? scaleImage(before.layers, before.dimensions, width, height)
        : resizeCanvas(
            before.layers,
            before.dimensions,
            width,
            height,
            mode === "crop" ? -x : 0,
            mode === "crop" ? -y : 0,
          );
    const after = {
      dimensions: { width, height },
      layers: afterLayers,
      activeLayerId: before.activeLayerId,
    };
    const apply = (snapshot: typeof before) =>
      useAppStore
        .getState()
        .replaceCanvas(
          snapshot.dimensions,
          cloneLayers(snapshot.layers),
          snapshot.activeLayerId,
        );
    const command: Command = {
      name: title,
      undo: () => apply(before),
      redo: () => apply(after),
    };
    store.executeCommand(command);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="transform-title"
    >
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-lg border border-white/10 bg-[#191c23] p-5 shadow-2xl"
      >
        <h2 id="transform-title" className="text-lg font-semibold text-white">
          {title}
        </h2>
        <p className="mt-1 text-sm text-neutral-400">
          {mode === "scale"
            ? "Pixels are scaled with nearest-neighbor sampling."
            : "Transparent pixels fill any newly exposed canvas area."}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="text-sm text-neutral-300">
            Width
            <input
              autoFocus
              type="number"
              min="1"
              max="4096"
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
              className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-white"
            />
          </label>
          <label className="text-sm text-neutral-300">
            Height
            <input
              type="number"
              min="1"
              max="4096"
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
              className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-white"
            />
          </label>
          {mode === "crop" && (
            <>
              <label className="text-sm text-neutral-300">
                Left
                <input
                  type="number"
                  min="0"
                  value={x}
                  onChange={(e) => setX(Number(e.target.value))}
                  className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-white"
                />
              </label>
              <label className="text-sm text-neutral-300">
                Top
                <input
                  type="number"
                  min="0"
                  value={y}
                  onChange={(e) => setY(Number(e.target.value))}
                  className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-white"
                />
              </label>
            </>
          )}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-3 py-1.5 text-sm text-neutral-300 hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Apply
          </button>
        </div>
      </form>
    </div>
  );
}
