import { InputSettingsDialog } from "./InputSettingsDialog";
import { useInputSettings } from "../../input/settings";
import { copySelection, pasteSelection } from "../../utils/clipboard";
import { useState, useRef, useEffect } from "react";
import { useAppStore } from "../../store";
import {
  exportToPNG,
  importPNG,
  loadProject,
  saveProject,
} from "../../utils/project";
import { flipImage, rotateImage, resizeCanvas } from "../../utils/transforms";
import { TransformDialog, type TransformMode } from "./TransformDialog";
import { NewProjectDialog } from "./NewProjectDialog";
import { SpritesheetDialog } from "./SpritesheetDialog";
import { AISettingsDialog } from "./AISettingsDialog";
import type { Command, Layer } from "../../types";

interface MenuItem {
  label?: string;
  onClick?: () => void;
  shortcut?: string;
  divider?: boolean;
  disabled?: boolean;
}

interface MenuDropdownProps {
  label: string;
  items: MenuItem[];
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

function MenuDropdown({
  label,
  items,
  isOpen,
  onToggle,
  onClose,
}: MenuDropdownProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={onToggle}
        className={`rounded px-2.5 py-1 transition-colors hover:bg-white/6 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 ${
          isOpen ? "bg-white/6 text-white" : "text-neutral-400"
        }`}
      >
        {label}
      </button>

      {isOpen && (
        <div
          className={`absolute top-full mt-1 w-48 rounded-md border border-white/10 bg-[#191c23] py-1 shadow-lg z-50 ${label === "AI" || label === "View" || label === "Help" ? "right-0 sm:left-0 sm:right-auto" : "left-0"}`}
        >
          {items.map((item, index) => {
            if (item.divider) {
              return (
                <div key={`div-${index}`} className="my-1 h-px bg-white/10" />
              );
            }
            return (
              <button
                key={item.label}
                disabled={item.disabled}
                onClick={() => {
                  if (item.disabled) return;
                  item.onClick?.();
                  onClose();
                }}
                className="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm text-neutral-300 hover:bg-indigo-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-neutral-300"
              >
                <span>{item.label}</span>
                {item.shortcut && (
                  <span className="text-xs opacity-60">{item.shortcut}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function MenuBar() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [transformMode, setTransformMode] = useState<TransformMode | null>(
    null,
  );
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false);
  const [isSpritesheetDialogOpen, setIsSpritesheetDialogOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [exportScale, setExportScale] = useState(1);
  const [exportError, setExportError] = useState("");
  const store = useAppStore();

  useEffect(() => {
    const openExport = () => setExportOpen(true);
    window.addEventListener("pixaletos-export", openExport);
    return () => window.removeEventListener("pixaletos-export", openExport);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const cloneLayers = (layers: Layer[]) =>
    layers.map((layer) => ({
      ...layer,
      data: new Uint8ClampedArray(layer.data),
    }));
  const cloneKeyframes = (keyframes: any[]) =>
    keyframes.map((kf) => ({
      ...kf,
      layers: cloneLayers(kf.layers),
    }));

  const applyTransform = (
    name: string,
    transformFn: (
      layers: Layer[],
      dimensions: typeof store.dimensions,
    ) => { layers: Layer[]; dimensions: typeof store.dimensions },
  ) => {
    store.updateCurrentKeyframe();
    const freshStore = useAppStore.getState();

    const before = {
      dimensions: { ...freshStore.dimensions },
      layers: cloneLayers(freshStore.layers),
      keyframes: cloneKeyframes(freshStore.keyframes),
      activeLayerId: freshStore.activeLayerId,
      activeKeyframeId: freshStore.activeKeyframeId,
    };

    const afterKeyframes = before.keyframes.map((kf) => {
      const result = transformFn(kf.layers, before.dimensions);
      return { ...kf, layers: result.layers };
    });

    // Evaluate the dimensions from the first transform (they should all be the same)
    const { dimensions: afterDimensions } = transformFn(
      before.keyframes[0].layers,
      before.dimensions,
    );

    const activeKf =
      afterKeyframes.find((k) => k.id === freshStore.activeKeyframeId) ||
      afterKeyframes[0];
    const afterLayers = activeKf ? cloneLayers(activeKf.layers) : [];

    const after = {
      dimensions: afterDimensions,
      layers: afterLayers,
      keyframes: afterKeyframes,
      activeLayerId: freshStore.activeLayerId,
      activeKeyframeId: freshStore.activeKeyframeId,
    };

    const apply = (snapshot: typeof before) =>
      useAppStore
        .getState()
        .replaceCanvas(
          snapshot.dimensions,
          cloneLayers(snapshot.layers),
          cloneKeyframes(snapshot.keyframes),
          snapshot.activeLayerId,
          snapshot.activeKeyframeId,
        );

    store.executeCommand({
      name,
      undo: () => apply(before),
      redo: () => apply(after),
    } satisfies Command);
  };

  const handleToggle = (menuName: string) => {
    setOpenMenu(openMenu === menuName ? null : menuName);
  };

  const fileItems: MenuItem[] = [
    {
      label: "New Project",
      onClick: () => setIsNewProjectDialogOpen(true),
    },
    { divider: true },
    {
      label: "Import PNG...",
      shortcut: "Ctrl+I",
      onClick: () => importPNG(store),
    },
    {
      label: "Open Project...",
      shortcut: "Ctrl+O",
      onClick: () => loadProject(store),
    },
    {
      label: "Save Project",
      shortcut: "Ctrl+S",
      onClick: () => saveProject(store),
    },
    { divider: true },
    {
      label: "Export as PNG",
      shortcut: "Ctrl+E",
      onClick: () => setExportOpen(true),
    },
    {
      label: "Export Spritesheet...",
      onClick: () => setIsSpritesheetDialogOpen(true),
    },
  ];

  const editItems: MenuItem[] = [
    { label: "Undo", shortcut: "Ctrl+Z", onClick: store.undo },
    { label: "Redo", shortcut: "Ctrl+Shift+Z", onClick: store.redo },
    { divider: true },
    { label: "Cut", shortcut: "Ctrl+X", onClick: () => copySelection(true) },
    { label: "Copy", shortcut: "Ctrl+C", onClick: () => copySelection() },
    { label: "Paste", shortcut: "Ctrl+V", onClick: pasteSelection },
  ];

  const imageItems: MenuItem[] = [
    {
      label: "Canvas Size...",
      onClick: () => setTransformMode("canvas"),
    },
    { label: "Resize...", onClick: () => setTransformMode("scale") },
    { divider: true },
    { label: "Crop...", onClick: () => setTransformMode("crop") },
    {
      label: "Crop to Selection",
      disabled: !store.selection?.some(Boolean),
      onClick: () => {
        const { selection, dimensions } = useAppStore.getState();
        if (!selection) return;
        let left = dimensions.width,
          top = dimensions.height,
          right = -1,
          bottom = -1;
        for (let y = 0; y < dimensions.height; y++)
          for (let x = 0; x < dimensions.width; x++)
            if (selection[y * dimensions.width + x]) {
              left = Math.min(left, x);
              right = Math.max(right, x);
              top = Math.min(top, y);
              bottom = Math.max(bottom, y);
            }
        if (right < left || bottom < top) return;
        const width = right - left + 1,
          height = bottom - top + 1;
        applyTransform("Crop to selection", (layers, dims) => ({
          layers: resizeCanvas(layers, dims, width, height, -left, -top),
          dimensions: { width, height },
        }));
      },
    },
    {
      label: "Rotate 90° Clockwise",
      onClick: () => {
        applyTransform("Rotate clockwise", (layers, dims) =>
          rotateImage(layers, dims, true),
        );
      },
    },
    {
      label: "Rotate 90° Counterclockwise",
      onClick: () => {
        applyTransform("Rotate counterclockwise", (layers, dims) =>
          rotateImage(layers, dims, false),
        );
      },
    },
    {
      label: "Flip Horizontal",
      onClick: () =>
        applyTransform("Flip horizontal", (layers, dims) => ({
          layers: flipImage(layers, dims, true),
          dimensions: dims,
        })),
    },
    {
      label: "Flip Vertical",
      onClick: () =>
        applyTransform("Flip vertical", (layers, dims) => ({
          layers: flipImage(layers, dims, false),
          dimensions: dims,
        })),
    },
  ];

  const activeLayerIndex = store.activeLayerId
    ? store.layers.findIndex((l) => l.id === store.activeLayerId)
    : -1;
  const canMergeDown =
    activeLayerIndex !== -1 && activeLayerIndex < store.layers.length - 1;
  const canDeleteLayer = store.layers.length > 1;

  const layerItems: MenuItem[] = [
    { label: "New Layer", onClick: store.addLayer },
    {
      label: "Duplicate Layer",
      disabled: !store.activeLayerId,
      onClick: () => {
        if (store.activeLayerId) store.duplicateLayer(store.activeLayerId);
      },
    },
    {
      label: "Delete Layer",
      disabled: !store.activeLayerId || !canDeleteLayer,
      onClick: () => {
        if (store.activeLayerId) store.removeLayer(store.activeLayerId);
      },
    },
    { divider: true },
    {
      label: "Merge Down",
      disabled: !store.activeLayerId || !canMergeDown,
      onClick: () => {
        if (store.activeLayerId) store.mergeDownLayer(store.activeLayerId);
      },
    },
  ];

  const viewItems: MenuItem[] = [
    {
      label: "Zoom In",
      shortcut: "Ctrl++",
      onClick: () => store.setZoom(Math.min(20, store.zoom + 0.5)),
    },
    {
      label: "Zoom Out",
      shortcut: "Ctrl+-",
      onClick: () => store.setZoom(Math.max(0.1, store.zoom - 0.5)),
    },
    { label: "Reset Zoom", onClick: () => store.setZoom(1) },
    { divider: true },
    {
      label: store.showGrid ? "Hide Grid" : "Show Grid",
      onClick: () => store.setShowGrid(!store.showGrid),
    },
    {
      label: isFullscreen ? "Exit Full Screen" : "Full Screen",
      onClick: toggleFullscreen,
    },
  ];

  viewItems.push(
    { divider: true },
    { label: "Keyboard Shortcuts...", onClick: () => setHelpOpen(true) },
  );

  const aiItems: MenuItem[] = [
    { label: "Ask AI...", onClick: () => store.setAskAIDialogOpen(true) },
    { divider: true },
    {
      label: "Settings...",
      onClick: () => store.setAISettingsDialogOpen(true),
    },
  ];

  const menus = [
    { label: "File", items: fileItems },
    {
      label: "Edit",
      items: [
        ...editItems,
        {
          label: "Tablet & Input...",
          onClick: () => useInputSettings.getState().setOpen(true),
        },
      ],
    },
    { label: "Image", items: imageItems },
    { label: "Layer", items: layerItems },
    { label: "View", items: viewItems },
    { label: "AI", items: aiItems },
  ];

  return (
    <>
      <nav aria-label="Application menu" className="flex gap-1 text-sm">
        {menus.map((menu) => (
          <MenuDropdown
            key={menu.label}
            label={menu.label}
            items={menu.items}
            isOpen={openMenu === menu.label}
            onToggle={() => handleToggle(menu.label)}
            onClose={() => setOpenMenu(null)}
          />
        ))}
      </nav>
      {helpOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="help-title"
          className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4"
        >
          <div className="w-full max-w-md rounded-lg border border-white/10 bg-[#191c23] p-5 shadow-xl">
            <h2 id="help-title" className="text-lg font-semibold text-white">
              Keyboard shortcuts
            </h2>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-sm text-neutral-300">
              <dt>Undo / Redo</dt>
              <dd>Ctrl/⌘ Z / Shift Z</dd>
              <dt>Save / Open</dt>
              <dd>Ctrl/⌘ S / O</dd>
              <dt>Export / Import PNG</dt>
              <dd>Ctrl/⌘ E / I</dd>
              <dt>Copy / Cut / Paste</dt>
              <dd>Ctrl/⌘ C / X / V</dd>
              <dt>Select all / Deselect</dt>
              <dd>Ctrl/⌘ A / Escape</dd>
              <dt>Pencil / Eraser / Fill</dt>
              <dd>P / E / F</dd>
              <dt>Move / Select / Pan</dt>
              <dd>V / M / H or Space</dd>
              <dt>Line / Rectangle / Ellipse</dt>
              <dd>L / U / O</dd>
              <dt>Eyedropper / Zoom</dt>
              <dd>I / Z</dd>
            </dl>
            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setHelpOpen(false)}
                className="rounded bg-indigo-600 px-3 py-2 text-sm text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {exportOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="export-title"
          className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4"
        >
          <form
            className="w-full max-w-sm rounded-lg border border-white/10 bg-[#191c23] p-5 shadow-xl"
            onSubmit={(event) => {
              event.preventDefault();
              try {
                exportToPNG(useAppStore.getState(), exportScale);
                setExportOpen(false);
                setExportError("");
              } catch (error) {
                setExportError(
                  error instanceof Error ? error.message : "Export failed",
                );
              }
            }}
          >
            <h2 id="export-title" className="text-lg font-semibold text-white">
              Export PNG
            </h2>
            <p className="mt-1 text-sm text-neutral-400">
              Transparent background, with crisp nearest-neighbor scaling.
            </p>
            <label className="mt-4 block text-sm">
              Scale{" "}
              <input
                type="number"
                min="1"
                max="64"
                step="1"
                value={exportScale}
                onChange={(e) => setExportScale(Number(e.target.value))}
                className="ml-3 w-20 rounded border border-neutral-700 bg-neutral-900 px-2 py-1"
              />
            </label>
            <p className="mt-2 text-sm text-neutral-400">
              Output: {store.dimensions.width * exportScale} ×{" "}
              {store.dimensions.height * exportScale} pixels
            </p>
            {exportError && (
              <p role="alert" className="mt-2 text-sm text-red-300">
                {exportError}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="rounded px-3 py-2 hover:bg-white/10"
                onClick={() => setExportOpen(false)}
              >
                Cancel
              </button>
              <button className="rounded bg-indigo-600 px-3 py-2 text-white">
                Export
              </button>
            </div>
          </form>
        </div>
      )}
      {transformMode && (
        <TransformDialog
          mode={transformMode}
          onClose={() => setTransformMode(null)}
        />
      )}
      {isNewProjectDialogOpen && (
        <NewProjectDialog onClose={() => setIsNewProjectDialogOpen(false)} />
      )}
      {isSpritesheetDialogOpen && (
        <SpritesheetDialog onClose={() => setIsSpritesheetDialogOpen(false)} />
      )}
      <AISettingsDialog />
      <InputSettingsDialog />
    </>
  );
}
