import React from 'react';
import { MousePointer2, Pencil, Eraser, PaintBucket, Square, Circle } from 'lucide-react';

export const Toolbar: React.FC = () => {
  return (
    <div className="w-16 flex flex-col items-center gap-2 border-r border-neutral-700 bg-neutral-800 py-4">
      <button className="p-2 rounded bg-neutral-700 text-white hover:bg-neutral-600 mb-4" title="Select">
        <MousePointer2 size={20} />
      </button>
      <button className="p-2 rounded text-neutral-400 hover:bg-neutral-700 hover:text-white" title="Pencil">
        <Pencil size={20} />
      </button>
      <button className="p-2 rounded text-neutral-400 hover:bg-neutral-700 hover:text-white" title="Eraser">
        <Eraser size={20} />
      </button>
      <button className="p-2 rounded text-neutral-400 hover:bg-neutral-700 hover:text-white" title="Fill">
        <PaintBucket size={20} />
      </button>
      <div className="w-10 h-[1px] bg-neutral-700 my-2"></div>
      <button className="p-2 rounded text-neutral-400 hover:bg-neutral-700 hover:text-white" title="Rectangle">
        <Square size={20} />
      </button>
      <button className="p-2 rounded text-neutral-400 hover:bg-neutral-700 hover:text-white" title="Ellipse">
        <Circle size={20} />
      </button>
    </div>
  );
};
