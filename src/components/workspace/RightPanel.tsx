import React from "react";
import { useAppStore } from "../../store";
import {
  Layers,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Send,
  Loader2,
} from "lucide-react";
import { MockAIProvider } from "../../utils/ai";
import type { Layer } from "../../types";

export const RightPanel: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<"layers" | "ai">("layers");
  const [prompt, setPrompt] = React.useState("");
  const [isProcessing, setIsProcessing] = React.useState(false);
  const store = useAppStore();

  const handleAskAI = async () => {
    if (!prompt.trim()) return;
    setIsProcessing(true);

    try {
      const result = await MockAIProvider.generate(prompt, {
        dimensions: store.dimensions,
      });

      if (result.success && result.data) {
        const newLayer: Layer = {
          id: crypto.randomUUID(),
          name: `AI: ${prompt.slice(0, 15)}...`,
          visible: true,
          opacity: 1,
          data: result.data,
        };

        const currentState = useAppStore.getState();
        const updatedLayers = [...currentState.layers, newLayer];

        const command = {
          name: "AI Quick Generate",
          undo: () => {
            const prevState = useAppStore.getState();
            const restoredLayers = prevState.layers.filter(
              (l) => l.id !== newLayer.id,
            );
            useAppStore.setState({
              layers: restoredLayers,
              activeLayerId:
                restoredLayers[restoredLayers.length - 1]?.id || null,
            });
            useAppStore.getState().updateCurrentKeyframe();
          },
          redo: () => {
            const prevState = useAppStore.getState();
            useAppStore.setState({
              layers: [...prevState.layers, newLayer],
              activeLayerId: newLayer.id,
            });
            useAppStore.getState().updateCurrentKeyframe();
          },
        };

        store.executeCommand(command);
        useAppStore.setState({
          layers: updatedLayers,
          activeLayerId: newLayer.id,
        });
        useAppStore.getState().updateCurrentKeyframe();
        setPrompt("");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const {
    layers,
    activeLayerId,
    addLayer,
    removeLayer,
    updateLayer,
    setActiveLayer,
    reorderLayers,
  } = useAppStore();

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newLayers = [...layers];
    const temp = newLayers[index - 1];
    newLayers[index - 1] = newLayers[index];
    newLayers[index] = temp;
    reorderLayers(newLayers.map((l) => l.id));
  };

  const handleMoveDown = (index: number) => {
    if (index === layers.length - 1) return;
    const newLayers = [...layers];
    const temp = newLayers[index + 1];
    newLayers[index + 1] = newLayers[index];
    newLayers[index] = temp;
    reorderLayers(newLayers.map((l) => l.id));
  };

  return (
    <div className="w-64 bg-neutral-900 border-l border-neutral-800 flex flex-col flex-shrink-0 z-10 text-neutral-300">
      <div className="flex border-b border-neutral-800 bg-neutral-800/50">
        <button
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${
            activeTab === "layers"
              ? "border-indigo-500 text-indigo-300"
              : "border-transparent text-neutral-500 hover:text-neutral-300"
          }`}
          onClick={() => setActiveTab("layers")}
        >
          <Layers size={16} /> Layers
        </button>
        <button
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${
            activeTab === "ai"
              ? "border-purple-500 text-purple-300"
              : "border-transparent text-neutral-500 hover:text-neutral-300"
          }`}
          onClick={() => setActiveTab("ai")}
        >
          <Sparkles size={16} /> Ask AI
        </button>
      </div>

      {activeTab === "layers" ? (
        <>
          <div className="p-3 border-b border-neutral-800 flex justify-end bg-neutral-800/30">
            <button
              onClick={addLayer}
              className="p-1.5 hover:bg-neutral-700 rounded text-neutral-400 hover:text-white transition-colors"
              title="New Layer"
            >
              <Plus size={16} />
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
                      ? "bg-neutral-800 border-neutral-700 text-white"
                      : "hover:bg-neutral-800/50 border-transparent"
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
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveUp(index);
                        }}
                        disabled={index === 0}
                        className="text-neutral-500 hover:text-neutral-300 disabled:opacity-30 p-0.5"
                      >
                        <ChevronUp size={12} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveDown(index);
                        }}
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
        </>
      ) : (
        <div className="flex-1 p-4 flex flex-col space-y-4">
          <p className="text-xs text-neutral-400 leading-relaxed">
            Quickly generate or modify pixels using AI. The result will be added
            as a new layer.
          </p>
          <div className="flex-1">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Generate a wooden shield..."
              disabled={isProcessing}
              className="w-full h-32 rounded bg-neutral-950 border border-neutral-800 p-3 text-sm text-neutral-200 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50 resize-none"
            />
          </div>
          <button
            onClick={handleAskAI}
            disabled={isProcessing || !prompt.trim()}
            className="flex items-center justify-center gap-2 rounded bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            {isProcessing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
            {isProcessing ? "Generating..." : "Generate"}
          </button>

          <button
            onClick={() => store.setAskAIDialogOpen(true)}
            className="text-xs text-purple-400 hover:text-purple-300 text-center mt-4 underline-offset-2 hover:underline"
          >
            Open detailed AI panel
          </button>
        </div>
      )}

      <div className="p-4 border-t border-neutral-800">
        <div className="text-xs text-neutral-500 uppercase tracking-wider mb-2 font-semibold">
          Properties
        </div>
        {activeLayerId && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-400">Opacity</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={layers.find((l) => l.id === activeLayerId)?.opacity ?? 1}
              onChange={(e) =>
                updateLayer(activeLayerId, {
                  opacity: parseFloat(e.target.value),
                })
              }
              className="w-24 accent-indigo-500"
            />
          </div>
        )}
      </div>
    </div>
  );
};
