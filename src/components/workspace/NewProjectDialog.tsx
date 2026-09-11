import { useState, type FormEvent } from "react";
import { useAppStore } from "../../store";
import { saveProject } from "../../utils/project";

interface NewProjectDialogProps {
  onClose: () => void;
}

export function NewProjectDialog({ onClose }: NewProjectDialogProps) {
  const store = useAppStore();
  const [width, setWidth] = useState(64);
  const [height, setHeight] = useState(64);
  const isValidSize =
    Number.isInteger(width) &&
    Number.isInteger(height) &&
    width >= 1 &&
    height >= 1 &&
    width <= 4096 &&
    height <= 4096;

  const createProject = (shouldSave: boolean) => {
    if (!isValidSize) return;
    if (shouldSave) saveProject(store);
    store.createNewProject(width, height);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-project-title"
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
    >
      <form
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          createProject(false);
        }}
        className="w-full max-w-sm rounded-lg border border-white/10 bg-[#191c23] p-5 shadow-2xl"
      >
        <h2 id="new-project-title" className="text-lg font-semibold text-white">
          New Project
        </h2>
        <p className="mt-1 text-sm text-neutral-400">
          Choose a canvas size. You can save the current project before starting
          over.
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
              onChange={(event) => setWidth(Number(event.target.value))}
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
              onChange={(event) => setHeight(Number(event.target.value))}
              className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-white"
            />
          </label>
        </div>
        {!isValidSize && (
          <p className="mt-2 text-sm text-red-300">
            Enter whole-number dimensions between 1 and 4096 pixels.
          </p>
        )}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-3 py-1.5 text-sm text-neutral-300 hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isValidSize}
            className="rounded px-3 py-1.5 text-sm text-neutral-300 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Don&apos;t Save
          </button>
          <button
            type="button"
            disabled={!isValidSize}
            onClick={() => createProject(true)}
            className="rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save &amp; New
          </button>
        </div>
      </form>
    </div>
  );
}
