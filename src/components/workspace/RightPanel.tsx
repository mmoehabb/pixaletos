import React from 'react';
import { Layers, Image as ImageIcon, Sparkles } from 'lucide-react';

export const RightPanel: React.FC = () => {
  return (
    <div className="w-64 flex flex-col border-l border-neutral-700 bg-neutral-800 h-full">
      {/* Tabs */}
      <div className="flex border-b border-neutral-700">
        <button className="flex-1 py-3 px-4 text-sm font-medium border-b-2 border-blue-500 text-white flex items-center justify-center gap-2">
          <Layers size={16} /> Layers
        </button>
        <button className="flex-1 py-3 px-4 text-sm font-medium border-b-2 border-transparent text-neutral-400 hover:text-white flex items-center justify-center gap-2">
          <ImageIcon size={16} /> Assets
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-neutral-300">Layers</h3>
          <button className="text-xs bg-neutral-700 hover:bg-neutral-600 px-2 py-1 rounded text-white">+</button>
        </div>

        {/* Mock Layer */}
        <div className="bg-neutral-700 rounded p-2 flex items-center gap-2 mb-2 border border-blue-500/50">
          <div className="w-8 h-8 bg-white/10 rounded"></div>
          <span className="text-sm text-white flex-1">Layer 1</span>
        </div>
      </div>

      {/* AI Panel Teaser */}
      <div className="h-48 border-t border-neutral-700 p-4 bg-neutral-800/50 flex flex-col">
        <div className="flex items-center gap-2 text-blue-400 mb-2 font-medium">
          <Sparkles size={16} /> AI Orchestrator
        </div>
        <p className="text-xs text-neutral-400 mb-4">Select an area or layer to edit or generate content.</p>
        <div className="mt-auto flex border border-neutral-600 rounded overflow-hidden">
          <input type="text" placeholder="Prompt..." className="bg-neutral-900 text-white text-xs px-2 py-2 flex-1 outline-none" disabled />
          <button className="bg-blue-600 text-white px-3 text-xs font-medium opacity-50 cursor-not-allowed">Ask</button>
        </div>
      </div>
    </div>
  );
};
