import React from 'react';
import { useAppStore } from '../../store';
import { Layers, Plus, Trash2, Eye, EyeOff, ChevronUp, ChevronDown } from 'lucide-react';

export const RightPanel: React.FC = () => {
  const {
    layers,
    activeLayerId,
    addLayer,
    removeLayer,
    updateLayer,
    setActiveLayer,
    reorderLayers
  } = useAppStore();

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newLayers = [...layers];
    const temp = newLayers[index - 1];
    newLayers[index - 1] = newLayers[index];
    newLayers[index] = temp;
    reorderLayers(newLayers.map(l => l.id));
  };

  const handleMoveDown = (index: number) => {
    if (index === layers.length - 1) return;
    const newLayers = [...layers];
    const temp = newLayers[index + 1];
    newLayers[index + 1] = newLayers[index];
    newLayers[index] = temp;
    reorderLayers(newLayers.map(l => l.id));
  };

  return (
    <div className="w-64 bg-neutral-900 border-l border-neutral-800 flex flex-col flex-shrink-0 z-10 text-neutral-300">
      <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-800/50">
        <div className="flex items-center gap-2 font-medium">
          <Layers size={18} />
          <span>Layers</span>
        </div>
        <button
          onClick={addLayer}
          className="p-1 hover:bg-neutral-700 rounded text-neutral-400 hover:text-white transition-colors"
          title="New Layer"
        >
          <Plus size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {layers.map((layer, index) => {
          const isActive = layer.id === activeLayerId;
          return (
            <div
              key={layer.id}
              className={`flex items-center justify-between p-2 rounded cursor-pointer border ${
                isActive
                  ? 'bg-neutral-800 border-neutral-700 text-white'
                  : 'hover:bg-neutral-800/50 border-transparent'
              }`}
              onClick={() => setActiveLayer(layer.id)}
            >
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    updateLayer(layer.id, { visible: !layer.visible });
                  }}
                  className="text-neutral-500 hover:text-neutral-300"
                >
                  {layer.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
                <span className="text-sm truncate w-24">{layer.name}</span>
              </div>

              <div className="flex items-center gap-1">
                <div className="flex flex-col">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleMoveUp(index); }}
                    disabled={index === 0}
                    className="text-neutral-500 hover:text-neutral-300 disabled:opacity-30 p-0.5"
                  >
                    <ChevronUp size={12} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleMoveDown(index); }}
                    disabled={index === layers.length - 1}
                    className="text-neutral-500 hover:text-neutral-300 disabled:opacity-30 p-0.5"
                  >
                    <ChevronDown size={12} />
                  </button>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (layers.length > 1) removeLayer(layer.id);
                  }}
                  disabled={layers.length <= 1}
                  className="text-neutral-500 hover:text-red-400 disabled:opacity-30 p-1 ml-1"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
        {layers.length === 0 && (
          <div className="p-4 text-center text-neutral-500 text-sm">
            No layers. Click + to add one.
          </div>
        )}
      </div>

      <div className="p-4 border-t border-neutral-800">
        <div className="text-xs text-neutral-500 uppercase tracking-wider mb-2 font-semibold">Properties</div>
        {activeLayerId && (
          <div className="flex items-center justify-between">
             <span className="text-sm text-neutral-400">Opacity</span>
             <input
                type="range"
                min="0" max="1" step="0.01"
                value={layers.find(l => l.id === activeLayerId)?.opacity || 1}
                onChange={(e) => updateLayer(activeLayerId, { opacity: parseFloat(e.target.value) })}
                className="w-24 accent-indigo-500"
             />
          </div>
        )}
      </div>
    </div>
  );
};
