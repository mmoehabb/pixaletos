import React from 'react';
import {
  Pencil, Eraser, PaintBucket,
  MousePointer2, Move, ZoomIn, Hand,
  Square, Circle, Minus, Pipette
} from 'lucide-react';
import { useAppStore } from '../../store';
import type { Tool } from '../../types';

interface ToolButtonProps {
  tool: Tool;
  icon: React.ReactNode;
  label: string;
}

const ToolButton: React.FC<ToolButtonProps & { isActive: boolean, onClick: () => void }> = ({ icon, label, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`p-2 rounded-md mb-1 transition-colors ${
        isActive ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
      }`}
      title={label}
    >
      {icon}
    </button>
  );
};

export const Toolbar: React.FC = () => {
  const { currentTool, setTool, foregroundColor, backgroundColor, setForegroundColor, setBackgroundColor } = useAppStore();

  const renderTool = (tool: Tool, icon: React.ReactNode, label: string) => (
    <ToolButton
      tool={tool}
      icon={icon}
      label={label}
      isActive={currentTool === tool}
      onClick={() => setTool(tool)}
    />
  );

  return (
    <div className="w-16 bg-neutral-900 border-r border-neutral-800 flex flex-col items-center py-4 flex-shrink-0 z-10">
      <div className="flex flex-col mb-4 w-full px-2">
        {renderTool("select", <MousePointer2 size={20} />, "Select (M)")}
        {renderTool("move", <Move size={20} />, "Move (V)")}
      </div>

      <div className="w-10 h-px bg-neutral-800 mb-4" />

      <div className="flex flex-col mb-4 w-full px-2">
        {renderTool("pencil", <Pencil size={20} />, "Pencil (P)")}
        {renderTool("eraser", <Eraser size={20} />, "Eraser (E)")}
        {renderTool("fill", <PaintBucket size={20} />, "Fill (F)")}
        {renderTool("eyedropper", <Pipette size={20} />, "Eyedropper (I)")}
      </div>

      <div className="w-10 h-px bg-neutral-800 mb-4" />

      <div className="flex flex-col mb-4 w-full px-2">
        {renderTool("line", <Minus size={20} />, "Line (L)")}
        {renderTool("rectangle", <Square size={20} />, "Rectangle (R)")}
        {renderTool("ellipse", <Circle size={20} />, "Ellipse (O)")}
      </div>

      <div className="w-10 h-px bg-neutral-800 mb-4" />

      <div className="flex flex-col mb-4 w-full px-2">
        {renderTool("pan", <Hand size={20} />, "Pan (H)")}
        {renderTool("zoom", <ZoomIn size={20} />, "Zoom (Z)")}
      </div>

      <div className="mt-auto flex flex-col items-center gap-2">
        <div className="relative w-8 h-8">
           <input
              type="color"
              value={backgroundColor}
              onChange={(e) => setBackgroundColor(e.target.value)}
              className="absolute bottom-0 right-0 w-6 h-6 p-0 border-0 rounded cursor-pointer shadow-sm"
              style={{ backgroundColor: backgroundColor }}
              title="Background Color"
           />
           <input
              type="color"
              value={foregroundColor}
              onChange={(e) => setForegroundColor(e.target.value)}
              className="absolute top-0 left-0 w-6 h-6 p-0 border-0 rounded cursor-pointer border border-neutral-700 shadow-sm"
              style={{ backgroundColor: foregroundColor }}
              title="Foreground Color"
           />
        </div>
      </div>
    </div>
  );
};
