import React, { useState } from "react";
import { useAppStore } from "../../store";
import { MockAIProvider } from "../../utils/ai";
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

  if (!store.isAskAIDialogOpen) return null;

  const handleSubmit = async () => {
    if (!prompt.trim()) return;

    setIsProcessing(true);
    const type = "generate"; // Default for now

    const historyItem = {
      type,
      prompt,
      status: "pending" as const,
    };

    // Create optimistic history item
    store.addAIHistoryItem({ ...historyItem });

    try {
      const result = await MockAIProvider.generate(prompt, {
        dimensions: store.dimensions,
      });

      if (result.success && result.data) {
        // Find optimistic item by prompt to update it (it's the first one in list)
        const recentItem = useAppStore
          .getState()
          .aiHistory.find((i) => i.prompt === prompt && i.status === "pending");

        if (recentItem) {
          store.updateAIHistoryItem(recentItem.id, {
            status: "success",
            result: result.message,
          });
        }

        // Create new layer with generated pattern
        const newLayer: Layer = {
          id: crypto.randomUUID(),
          name: `AI: ${prompt.slice(0, 15)}...`,
          visible: true,
          opacity: 1,
          data: result.data,
        };

        // Get fresh state
        const currentState = useAppStore.getState();
        const updatedLayers = [...currentState.layers, newLayer];

        // Ensure keyframes are updated before applying
        const command = {
          name: "AI Generation",
          undo: () => {
            const prevState = useAppStore.getState();
            // In undo, we replace current layers with one that excludes newLayer
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
    } catch (error: any) {
      const recentItem = useAppStore
        .getState()
        .aiHistory.find((i) => i.prompt === prompt && i.status === "pending");
      if (recentItem) {
        store.updateAIHistoryItem(recentItem.id, {
          status: "error",
          error: error.message || "Failed to generate",
        });
      }
    } finally {
      setIsProcessing(false);
    }
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
          <div className="flex flex-col h-full space-y-4">
            <p className="text-sm text-gray-400">
              Describe what you want to generate or modify. AI will orchestrate
              edits to your current layers and canvas.
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
