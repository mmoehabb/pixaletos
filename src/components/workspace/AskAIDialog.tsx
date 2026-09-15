import React, { useState } from "react";
import { useAppStore } from "../../store";
import {
  getActiveProvider,
  serializeEditorContext,
  resolveAIOperation,
  normalizePixelArt,
} from "../../utils/ai";
import { Check, X as XIcon } from "lucide-react";
import {
  X,
  Send,
  History,
  Sparkles,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import type { Layer } from "../../types";

export const AskAIDialog: React.FC = () => {
  const store = useAppStore();
  const [prompt, setPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<"ask" | "history">("ask");
  const [previewResult, setPreviewResult] = useState<{
    data: Uint8ClampedArray;
    type: string;
    prompt: string;
  } | null>(null);

  if (!store.isAskAIDialogOpen) return null;

  const handleSubmit = async () => {
    if (!prompt.trim()) return;

    setIsProcessing(true);
    setPreviewResult(null);

    // 1. Serialize editor context
    const currentState = useAppStore.getState();
    const context = serializeEditorContext(currentState);

    // 2. Resolve AI Operation type
    const operation = resolveAIOperation(prompt, context);

    const historyItem = {
      type: operation.type as "generate" | "edit" | "analyze",
      prompt,
      status: "pending" as const,
    };

    // Create optimistic history item
    store.addAIHistoryItem({ ...historyItem });

    try {
      let result;
      const activeProvider = getActiveProvider();

      // 3. Call the appropriate provider method
      if (operation.type === "generate") {
        result = await activeProvider.generate(prompt, context);
      } else if (operation.type === "edit") {
        const activeLayer = currentState.layers.find(
          (l) => l.id === currentState.activeLayerId,
        );
        if (!activeLayer) throw new Error("No active layer to edit");
        result = await activeProvider.edit(
          activeLayer.data,
          operation.instruction,
          context,
        );
      } else if (operation.type === "analyze") {
        const activeLayer = currentState.layers.find(
          (l) => l.id === currentState.activeLayerId,
        );
        if (!activeLayer) throw new Error("No active layer to analyze");
        result = await activeProvider.analyze(activeLayer.data, context);
      } else {
        throw new Error("Unsupported operation type");
      }

      if (result.success && result.data) {
        // Find optimistic item by prompt to update it
        const recentItem = useAppStore
          .getState()
          .aiHistory.find((i) => i.prompt === prompt && i.status === "pending");

        if (recentItem) {
          store.updateAIHistoryItem(recentItem.id, {
            status: "success",
            result: result.message,
          });
        }

        // 4. Normalize the pixel art
        const normalizedData = normalizePixelArt(
          result.data,
          { width: context.canvas.width, height: context.canvas.height },
          { width: context.canvas.width, height: context.canvas.height },
          context.palette,
        );

        // 5. Show diff/preview instead of applying immediately
        setPreviewResult({
          data: normalizedData,
          type: operation.type,
          prompt,
        });
        setPrompt("");
      } else if (result.success && operation.type === "analyze") {
        const recentItem = useAppStore
          .getState()
          .aiHistory.find((i) => i.prompt === prompt && i.status === "pending");

        if (recentItem) {
          store.updateAIHistoryItem(recentItem.id, {
            status: "success",
            result: result.analysis,
          });
        }
        setPrompt("");
      } else if (!result.success) {
        const recentItem = useAppStore
          .getState()
          .aiHistory.find((i) => i.prompt === prompt && i.status === "pending");
        if (recentItem) {
          store.updateAIHistoryItem(recentItem.id, {
            status: "error",
            error: result.error || "Failed to process request",
          });
        }
      }
    } catch (error: any) {
      const recentItem = useAppStore
        .getState()
        .aiHistory.find((i) => i.prompt === prompt && i.status === "pending");
      if (recentItem) {
        store.updateAIHistoryItem(recentItem.id, {
          status: "error",
          error: error.message || "Failed to process request",
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const acceptPreview = () => {
    if (!previewResult) return;

    const currentState = useAppStore.getState();
    let command;

    if (previewResult.type === "generate") {
      const newLayer: Layer = {
        id: crypto.randomUUID(),
        name: `AI: ${previewResult.prompt.slice(0, 15)}...`,
        visible: true,
        opacity: 1,
        data: previewResult.data,
      };
      const updatedLayers = [...currentState.layers, newLayer];

      command = {
        name: "AI Generation",
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
    } else if (previewResult.type === "edit") {
      const activeLayerIndex = currentState.layers.findIndex(
        (l) => l.id === currentState.activeLayerId,
      );
      if (activeLayerIndex === -1) return;

      const originalData = new Uint8ClampedArray(
        currentState.layers[activeLayerIndex].data,
      );
      const newData = new Uint8ClampedArray(previewResult.data);
      const layerId = currentState.layers[activeLayerIndex].id;

      command = {
        name: "AI Edit",
        undo: () => {
          const state = useAppStore.getState();
          const layers = [...state.layers];
          const idx = layers.findIndex((l) => l.id === layerId);
          if (idx !== -1) {
            layers[idx] = { ...layers[idx], data: originalData };
            useAppStore.setState({ layers });
            useAppStore.getState().updateCurrentKeyframe();
          }
        },
        redo: () => {
          const state = useAppStore.getState();
          const layers = [...state.layers];
          const idx = layers.findIndex((l) => l.id === layerId);
          if (idx !== -1) {
            layers[idx] = { ...layers[idx], data: newData };
            useAppStore.setState({ layers });
            useAppStore.getState().updateCurrentKeyframe();
          }
        },
      };

      store.executeCommand(command);
      const updatedLayers = [...currentState.layers];
      updatedLayers[activeLayerIndex] = {
        ...updatedLayers[activeLayerIndex],
        data: newData,
      };
      useAppStore.setState({ layers: updatedLayers });
      useAppStore.getState().updateCurrentKeyframe();
    }

    setPreviewResult(null);
  };

  const rejectPreview = () => {
    setPreviewResult(null);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-96 flex-col border-l border-white/10 bg-[#252526] shadow-2xl transition-transform duration-300">
      <div className="flex items-center justify-between border-b border-white/10 p-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-200">
          <Sparkles size={18} className="text-purple-400" /> Ask AI
        </h2>
        <button
          onClick={() => store.setAskAIDialogOpen(false)}
          className="rounded p-1 hover:bg-white/10 text-gray-400 hover:text-gray-200"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex gap-4 border-b border-white/10 px-4">
        <button
          className={`py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "ask"
              ? "border-purple-500 text-purple-400"
              : "border-transparent text-gray-400 hover:text-gray-200"
          }`}
          onClick={() => setActiveTab("ask")}
        >
          <Sparkles size={14} className="inline mr-1" /> Request
        </button>
        <button
          className={`py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "history"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-gray-400 hover:text-gray-200"
          }`}
          onClick={() => setActiveTab("history")}
        >
          <History size={14} className="inline mr-1" /> History
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col">
        {activeTab === "ask" ? (
          previewResult ? (
            <div className="flex flex-col h-full space-y-4">
              <div className="flex-1 bg-[#1e1e1e] border border-white/10 rounded flex flex-col items-center justify-center p-4">
                <Sparkles size={32} className="text-purple-400 mb-4" />
                <h3 className="text-gray-200 font-medium mb-2">
                  Review AI Changes
                </h3>
                <p className="text-gray-400 text-sm text-center mb-4">
                  The AI has proposed modifications based on your request.
                </p>

                <div className="w-full aspect-square bg-[#111] rounded border border-white/10 mb-4 overflow-hidden flex items-center justify-center relative shadow-inner">
                  <div
                    className="pixelated w-full h-full"
                    style={{
                      backgroundImage: `url("data:image/png;base64,${(() => {
                        if (!previewResult) return "";
                        const canvas = document.createElement("canvas");
                        canvas.width = store.dimensions.width;
                        canvas.height = store.dimensions.height;
                        const ctx = canvas.getContext("2d");
                        if (!ctx) return "";
                        const clonedArr = new Uint8ClampedArray(
                          previewResult.data.length,
                        );
                        for (let i = 0; i < clonedArr.length; i++)
                          clonedArr[i] = previewResult.data[i];
                        const imgData = new ImageData(
                          clonedArr as any,
                          store.dimensions.width,
                          store.dimensions.height,
                        );
                        ctx.putImageData(imgData, 0, 0);
                        return canvas.toDataURL().split(",")[1];
                      })()}")`,
                      backgroundSize: "contain",
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "center",
                      imageRendering: "pixelated",
                    }}
                  />
                </div>

                <div className="flex gap-4 mt-auto">
                  <button
                    onClick={rejectPreview}
                    className="flex items-center gap-2 px-4 py-2 rounded bg-gray-700 text-gray-200 hover:bg-gray-600 transition-colors"
                  >
                    <XIcon size={16} /> Reject
                  </button>
                  <button
                    onClick={acceptPreview}
                    className="flex items-center gap-2 px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-700 transition-colors"
                  >
                    <Check size={16} /> Accept
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full space-y-4">
              <p className="text-sm text-gray-400">
                Describe what you want to generate or modify. AI will
                orchestrate edits to your current layers and canvas.
              </p>

              <div className="flex-1">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. Turn this into a fire-element sword..."
                  disabled={isProcessing}
                  className="w-full h-32 rounded bg-[#1e1e1e] p-3 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50 resize-none border border-white/10"
                />
              </div>

              <div className="mt-auto pt-4 flex gap-2">
                <button
                  onClick={handleSubmit}
                  disabled={isProcessing || !prompt.trim()}
                  className="flex flex-1 items-center justify-center gap-2 rounded bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                  {isProcessing ? "Processing..." : "Generate"}
                </button>
              </div>
            </div>
          )
        ) : (
          <div className="space-y-4">
            {store.aiHistory.length === 0 ? (
              <div className="text-center text-sm text-gray-500 py-8">
                No history yet. Try generating something!
              </div>
            ) : (
              store.aiHistory.map((item) => (
                <div
                  key={item.id}
                  className="rounded bg-[#1e1e1e] p-3 border border-white/5 space-y-2"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      {item.type}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        item.status === "success"
                          ? "bg-green-500/20 text-green-400"
                          : item.status === "error"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-blue-500/20 text-blue-400 animate-pulse"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-200">{item.prompt}</p>
                  {item.status === "success" && (
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <ImageIcon size={12} /> Generated as new layer
                    </div>
                  )}
                  {item.error && (
                    <p className="text-xs text-red-400">{item.error}</p>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
