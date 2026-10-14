import React, { useState, useRef, useEffect } from "react";
import {
  Pencil,
  Eraser,
  Droplets,
  Zap,
  PaintBucket,
  MousePointer2,
  Wand2,
  Brush,
  LassoSelect,
  Move,
  RotateCw,
  ZoomIn,
  Hand,
  Square,
  Circle,
  Minus,
  Pipette,
  ArrowRightLeft,
  Palette as PaletteIcon,
  Sparkles,
} from "lucide-react";
import { useAppStore } from "../../store";
import type { Tool } from "../../types";
import { PalettePopover } from "./PalettePopover";
import { SketchPicker } from "react-color";
import type { RGBColor } from "react-color";

interface ToolButtonProps {
  tool: Tool;
  icon: React.ReactNode;
  label: string;
}

const ToolButton: React.FC<
  ToolButtonProps & {
    isActive: boolean;
    onClick: () => void;
    onContextMenu?: (e: React.MouseEvent) => void;
  }
> = ({ icon, label, isActive, onClick, onContextMenu }) => {
  return (
    <button
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`p-2 rounded-md mb-1 transition-colors relative ${
        isActive
          ? "bg-indigo-600 text-white"
          : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
      }`}
      title={label}
    >
      {icon}
    </button>
  );
};

export const Toolbar: React.FC = () => {
  const {
    currentTool,
    setTool,
    foregroundColor,
    backgroundColor,
    brushSize,
    brushOpacity,
    pixelPerfect,
    setForegroundColor,
    setBackgroundColor,
    setBrushSize,
    setBrushOpacity,
    setPixelPerfect,
  } = useAppStore();

  const [selectMenuOpen, setSelectMenuOpen] = useState(false);
  const selectMenuRef = useRef<HTMLDivElement>(null);
  const [lastSelectTool, setLastSelectTool] = useState<Tool>("select");

  const [paletteOpen, setPaletteOpen] = useState(false);
  const paletteTriggerRef = useRef<HTMLButtonElement>(
    null as unknown as HTMLButtonElement,
  );

  const [fgPickerOpen, setFgPickerOpen] = useState(false);
  const [bgPickerOpen, setBgPickerOpen] = useState(false);

  const rgbaToHex8 = (rgba: RGBColor) => {
    const toHex = (c: number) => {
      const hex = Math.round(c).toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };
    const a = rgba.a !== undefined ? Math.round(rgba.a * 255) : 255;
    return `#${toHex(rgba.r)}${toHex(rgba.g)}${toHex(rgba.b)}${toHex(a)}`;
  };

  const hexToRgba = (hex: string): RGBColor => {
    const result =
      /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i.exec(hex);
    if (!result) return { r: 0, g: 0, b: 0, a: 1 };
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
      a: result[4] ? parseInt(result[4], 16) / 255 : 1,
    };
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        selectMenuRef.current &&
        !selectMenuRef.current.contains(event.target as Node)
      ) {
        setSelectMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const renderTool = (tool: Tool, icon: React.ReactNode, label: string) => (
    <ToolButton
      tool={tool}
      icon={icon}
      label={label}
      isActive={currentTool === tool}
      onClick={() => setTool(tool)}
    />
  );

  const renderSelectTool = () => {
    let icon = <MousePointer2 size={20} />;
    let label = "Select (M)";
    let toolToActivate = lastSelectTool;

    if (
      currentTool === "select" ||
      currentTool === "select_brush" ||
      currentTool === "select_magic_wand" ||
      currentTool === "select_lasso"
    ) {
      toolToActivate = currentTool;
    }

    if (toolToActivate === "select_brush") {
      icon = <Brush size={20} />;
      label = "Brush Select";
    } else if (toolToActivate === "select_magic_wand") {
      icon = <Wand2 size={20} />;
      label = "Magic Wand Select";
    } else if (toolToActivate === "select_lasso") {
      icon = <LassoSelect size={20} />;
      label = "Lasso Select";
    }

    return (
      <div className="relative" ref={selectMenuRef}>
        <ToolButton
          tool={toolToActivate}
          icon={icon}
          label={label + " (Right click for more)"}
          isActive={
            currentTool === "select" ||
            currentTool === "select_brush" ||
            currentTool === "select_magic_wand" ||
            currentTool === "select_lasso"
          }
          onClick={() => setTool(toolToActivate)}
          onContextMenu={(e) => {
            e.preventDefault();
            setSelectMenuOpen(!selectMenuOpen);
          }}
        />
        {selectMenuOpen && (
          <div className="absolute left-full top-0 ml-2 bg-neutral-800 border border-neutral-700 rounded-md shadow-lg py-1 w-48 z-50">
            <button
              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-neutral-700 ${lastSelectTool === "select" ? "text-indigo-400" : "text-neutral-200"}`}
              onClick={() => {
                setLastSelectTool("select");
                setTool("select");
                setSelectMenuOpen(false);
              }}
            >
              <MousePointer2 size={16} /> Rectangular Select
            </button>
            <button
              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-neutral-700 ${lastSelectTool === "select_brush" ? "text-indigo-400" : "text-neutral-200"}`}
              onClick={() => {
                setLastSelectTool("select_brush");
                setTool("select_brush");
                setSelectMenuOpen(false);
              }}
            >
              <Brush size={16} /> Brush Select
            </button>
            <button
              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-neutral-700 ${lastSelectTool === "select_magic_wand" ? "text-indigo-400" : "text-neutral-200"}`}
              onClick={() => {
                setLastSelectTool("select_magic_wand");
                setTool("select_magic_wand");
                setSelectMenuOpen(false);
              }}
            >
              <Wand2 size={16} /> Magic Wand Select
            </button>
            <button
              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-neutral-700 ${lastSelectTool === "select_lasso" ? "text-indigo-400" : "text-neutral-200"}`}
              onClick={() => {
                setLastSelectTool("select_lasso");
                setTool("select_lasso");
                setSelectMenuOpen(false);
              }}
            >
              <LassoSelect size={16} /> Lasso Select
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full flex-row overflow-x-auto border-t md:w-16 bg-neutral-900 md:border-r md:border-t-0 border-neutral-800 flex md:flex-col items-center md:py-4 px-2 md:px-0 py-2 flex-shrink-0 z-50 md:overflow-y-visible no-scrollbar md:overflow-x-visible">
      <div className="flex md:flex-col items-center md:items-stretch gap-1 md:gap-0 md:mb-4 w-auto md:w-full md:px-2 flex-shrink-0">
        {renderSelectTool()}
        {renderTool("move", <Move size={20} />, "Move (V)")}
        {renderTool("rotate", <RotateCw size={20} />, "Rotate (R)")}
      </div>

      <div className="flex flex-row md:flex-col items-center gap-2 md:gap-2 mx-2 md:mx-0 md:mb-4 flex-shrink-0">
        <label className="flex flex-row md:flex-col items-center gap-2 md:gap-1 text-[10px] font-medium uppercase tracking-wide text-neutral-500">
          <span className="hidden md:inline">Size</span>
          <input
            type="number"
            min="1"
            max="64"
            value={brushSize}
            onChange={(event) =>
              setBrushSize(
                Math.max(1, Math.min(64, Number(event.target.value) || 1)),
              )
            }
            className="w-10 rounded border border-neutral-700 bg-neutral-800 px-1 py-0.5 text-center text-xs text-neutral-200 outline-none focus:border-indigo-500"
            title="Brush size"
          />
        </label>
        <label className="flex flex-row md:flex-col items-center gap-2 md:gap-1 text-[10px] font-medium uppercase tracking-wide text-neutral-500">
          <span className="hidden md:inline">Opacity</span>
          <input
            type="number"
            min="1"
            max="100"
            value={brushOpacity}
            onChange={(event) =>
              setBrushOpacity(
                Math.max(1, Math.min(100, Number(event.target.value) || 1)),
              )
            }
            className="w-10 rounded border border-neutral-700 bg-neutral-800 px-1 py-0.5 text-center text-xs text-neutral-200 outline-none focus:border-indigo-500"
            title="Brush opacity (%)"
          />
        </label>

        <button
          onClick={() => setPixelPerfect(!pixelPerfect)}
          className={`p-1.5 rounded transition-colors flex items-center justify-center ${
            pixelPerfect
              ? "bg-indigo-600 text-white"
              : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
          }`}
          title={`Pixel Perfect: ${pixelPerfect ? "On" : "Off"}`}
        >
          <Sparkles size={16} />
        </button>
      </div>

      <div className="w-px h-8 md:w-10 md:h-px bg-neutral-800 mx-2 md:mx-0 md:mb-4 flex-shrink-0" />

      <div className="flex md:flex-col items-center md:items-stretch gap-1 md:gap-0 md:mb-4 w-auto md:w-full md:px-2 flex-shrink-0">
        {renderTool("pencil", <Pencil size={20} />, "Pencil (P)")}
        {renderTool("eraser", <Eraser size={20} />, "Eraser (E)")}
        {renderTool("blur", <Droplets size={20} />, "Blur")}
        {renderTool("sharpen", <Zap size={20} />, "Sharpen")}
        {renderTool("fill", <PaintBucket size={20} />, "Fill (F)")}
        {renderTool("eyedropper", <Pipette size={20} />, "Eyedropper (I)")}
      </div>

      <div className="w-px h-8 md:w-10 md:h-px bg-neutral-800 mx-2 md:mx-0 md:mb-4 flex-shrink-0" />

      <div className="flex md:flex-col items-center md:items-stretch gap-1 md:gap-0 md:mb-4 w-auto md:w-full md:px-2 flex-shrink-0">
        {renderTool("line", <Minus size={20} />, "Line (L)")}
        {renderTool("rectangle", <Square size={20} />, "Rectangle (U)")}
        {renderTool("ellipse", <Circle size={20} />, "Ellipse (O)")}
      </div>

      <div className="w-px h-8 md:w-10 md:h-px bg-neutral-800 mx-2 md:mx-0 md:mb-4 flex-shrink-0" />

      <div className="flex md:flex-col items-center md:items-stretch gap-1 md:gap-0 md:mb-4 w-auto md:w-full md:px-2 flex-shrink-0">
        {renderTool("pan", <Hand size={20} />, "Pan (H)")}
        {renderTool("zoom", <ZoomIn size={20} />, "Zoom (Z)")}
      </div>

      <div className="ml-auto md:mt-auto md:ml-0 flex flex-row md:flex-col items-center gap-3 md:mb-2 px-2 md:px-0 flex-shrink-0 relative">
        <button
          ref={paletteTriggerRef}
          onClick={() => setPaletteOpen(!paletteOpen)}
          className={`p-2 rounded-md transition-colors ${
            paletteOpen
              ? "bg-indigo-600 text-white"
              : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
          }`}
          title="Color Palettes"
        >
          <PaletteIcon size={20} />
        </button>

        {paletteOpen && (
          <PalettePopover
            onClose={() => setPaletteOpen(false)}
            triggerRef={paletteTriggerRef}
          />
        )}

        <div className="relative w-8 h-8">
          <div
            onClick={() => setBgPickerOpen(!bgPickerOpen)}
            className="absolute bottom-0 right-0 w-6 h-6 p-0 border border-neutral-700 rounded cursor-pointer shadow-sm"
            style={{ backgroundColor: backgroundColor }}
            title="Background Color"
          />
          {bgPickerOpen && (
            <div className="absolute left-full bottom-0 ml-4 z-[60]">
              <div
                className="fixed inset-0"
                onClick={() => setBgPickerOpen(false)}
              />
              <div className="relative">
                <SketchPicker
                  color={hexToRgba(backgroundColor)}
                  onChange={(color) =>
                    setBackgroundColor(rgbaToHex8(color.rgb))
                  }
                  disableAlpha={false}
                />
              </div>
            </div>
          )}

          <div
            onClick={() => setFgPickerOpen(!fgPickerOpen)}
            className="absolute top-0 left-0 w-6 h-6 p-0 border border-neutral-700 rounded cursor-pointer shadow-sm z-10"
            style={{ backgroundColor: foregroundColor }}
            title="Foreground Color"
          />
          {fgPickerOpen && (
            <div className="absolute left-full bottom-0 ml-4 z-[60]">
              <div
                className="fixed inset-0"
                onClick={() => setFgPickerOpen(false)}
              />
              <div className="relative">
                <SketchPicker
                  color={hexToRgba(foregroundColor)}
                  onChange={(color) =>
                    setForegroundColor(rgbaToHex8(color.rgb))
                  }
                  disableAlpha={false}
                />
              </div>
            </div>
          )}
        </div>
        <button
          onClick={() => {
            const temp = foregroundColor;
            setForegroundColor(backgroundColor);
            setBackgroundColor(temp);
          }}
          className="text-neutral-500 hover:text-white transition-colors"
          title="Swap Colors"
        >
          <ArrowRightLeft size={14} />
        </button>
      </div>
    </div>
  );
};
