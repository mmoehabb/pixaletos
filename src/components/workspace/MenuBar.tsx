import { useState, useRef, useEffect } from "react";
import { useAppStore } from "../../store";
import {
  exportToPNG,
  importPNG,
  loadProject,
  saveProject,
} from "../../utils/project";
import { flipImage, rotateImage } from "../../utils/transforms";
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
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={onToggle}
        className={`rounded px-2.5 py-1 transition-colors hover:bg-white/6 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 ${
          isOpen ? "bg-white/6 text-white" : "text-neutral-400"
        }`}
      >
        {label}
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-48 rounded-md border border-white/10 bg-[#191c23] py-1 shadow-lg z-50">
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
  const store = useAppStore();

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
    };

    const apply = (snapshot: typeof before) =>
      useAppStore
        .getState()
        .replaceCanvas(
          snapshot.dimensions,
          cloneLayers(snapshot.layers),
          cloneKeyframes(snapshot.keyframes),
          snapshot.activeLayerId,
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
      onClick: () => exportToPNG(store),
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
    { label: "Cut", shortcut: "Ctrl+X", disabled: true },
    { label: "Copy", shortcut: "Ctrl+C", disabled: true },
    { label: "Paste", shortcut: "Ctrl+V", disabled: true },
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

  const layerItems: MenuItem[] = [
    { label: "New Layer", onClick: store.addLayer },
    { label: "Duplicate Layer", disabled: true },
    { label: "Delete Layer", disabled: true },
    { divider: true },
    { label: "Merge Down", disabled: true },
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
    { label: "Toggle Grid", disabled: true },
  ];

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
    { label: "Edit", items: editItems },
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
    </>
  );
}
