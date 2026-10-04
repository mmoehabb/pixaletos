import React, { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Edit2, X } from "lucide-react";
import { usePalettes } from "../../hooks/usePalettes";
import { useAppStore } from "../../store";

interface PalettePopoverProps {
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
}

export const PalettePopover: React.FC<PalettePopoverProps> = ({
  onClose,
  triggerRef,
}) => {
  const {
    palettes,
    addPalette,
    updatePalette,
    deletePalette,
    addColorToPalette,
    removeColorFromPalette,
  } = usePalettes();

  const { foregroundColor, setForegroundColor, setBackgroundColor } =
    useAppStore();
  const [activePaletteId, setActivePaletteId] = useState<string>("pico-8");
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose, triggerRef]);

  const activePalette =
    palettes.find((p) => p.id === activePaletteId) || palettes[0];
  const safeActivePaletteId = activePalette?.id;

  const handleColorClick = (color: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (e.type === "contextmenu" || e.button === 2) {
      setBackgroundColor(color);
    } else {
      setForegroundColor(color);
    }
  };

  const handleAddPalette = () => {
    const id = addPalette("New Palette", []);
    setActivePaletteId(id);
  };

  const handleSaveName = () => {
    if (activePalette && !activePalette.isDefault) {
      updatePalette(activePalette.id, { name: editName });
    }
    setIsEditingName(false);
  };

  const startEditingName = () => {
    if (activePalette && !activePalette.isDefault) {
      setEditName(activePalette.name);
      setIsEditingName(true);
    }
  };

  if (!activePalette) return null;

  return (
    <div
      ref={popoverRef}
      className="absolute left-full ml-2 bottom-0 md:left-full md:top-auto md:bottom-12 bg-neutral-800 border border-neutral-700 rounded-md shadow-lg p-3 w-64 z-[9999] flex flex-col gap-3"
      style={{
        // Give it a max height and let the colors scroll if there are too many
        maxHeight: "400px",
      }}
    >
      <div className="flex flex-col gap-2">
        <label className="text-xs text-neutral-400 font-medium uppercase tracking-wide">
          Select Palette
        </label>
        <select
          value={safeActivePaletteId}
          onChange={(e) => {
            setActivePaletteId(e.target.value);
            setIsEditingName(false);
          }}
          className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5 text-sm text-neutral-200 outline-none focus:border-indigo-500"
        >
          <optgroup label="Default Palettes">
            {palettes
              .filter((p) => p.isDefault)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </optgroup>
          {palettes.filter((p) => !p.isDefault).length > 0 && (
            <optgroup label="Custom Palettes">
              {palettes
                .filter((p) => !p.isDefault)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </optgroup>
          )}
        </select>
      </div>

      <div className="flex items-center justify-between border-t border-neutral-700 pt-2">
        {isEditingName ? (
          <div className="flex items-center gap-1 w-full">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
              className="flex-1 bg-neutral-900 border border-neutral-600 rounded px-2 py-1 text-sm text-white"
              autoFocus
            />
            <button
              onClick={handleSaveName}
              className="text-indigo-400 hover:text-indigo-300 px-2 text-sm font-medium"
            >
              Save
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 w-full">
            <span className="text-sm font-medium text-neutral-200 truncate flex-1">
              {activePalette.name}
            </span>
            {!activePalette.isDefault && (
              <button
                onClick={startEditingName}
                className="text-neutral-500 hover:text-white p-1 rounded"
                title="Rename Palette"
              >
                <Edit2 size={14} />
              </button>
            )}
            {!activePalette.isDefault && (
              <button
                onClick={() => {
                  if (confirm(`Delete palette "${activePalette.name}"?`)) {
                    deletePalette(activePalette.id);
                  }
                }}
                className="text-neutral-500 hover:text-red-400 p-1 rounded"
                title="Delete Palette"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="overflow-y-auto overflow-x-hidden flex-1 min-h-[100px] border border-neutral-700 rounded bg-neutral-900 p-1.5">
        {activePalette.colors.length === 0 ? (
          <div className="text-xs text-neutral-500 text-center py-4 italic">
            No colors in palette.
          </div>
        ) : (
          <div className="flex flex-wrap gap-1">
            {activePalette.colors.map((color, index) => (
              <div key={`${color}-${index}`} className="relative group">
                <button
                  onClick={(e) => handleColorClick(color, e)}
                  onContextMenu={(e) => handleColorClick(color, e)}
                  className="w-6 h-6 rounded-sm border border-neutral-700 cursor-pointer hover:border-white focus:outline-none"
                  style={{ backgroundColor: color }}
                  title={`${color} (Left click: FG, Right click: BG)`}
                />
                {!activePalette.isDefault && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeColorFromPalette(activePalette.id, index);
                    }}
                    className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    title="Remove color"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 mt-1">
        {!activePalette.isDefault && (
          <button
            onClick={() => addColorToPalette(activePalette.id, foregroundColor)}
            className="w-full flex items-center justify-center gap-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded py-1.5 text-sm transition-colors"
          >
            <Plus size={16} />
            <span>Add Current FG Color</span>
          </button>
        )}
        <button
          onClick={handleAddPalette}
          className="w-full text-xs text-indigo-400 hover:text-indigo-300 py-1 font-medium transition-colors"
        >
          + Create New Palette
        </button>
      </div>
      <div className="text-[10px] text-neutral-500 text-center mt-1">
        Left-click for FG • Right-click for BG
      </div>
    </div>
  );
};
