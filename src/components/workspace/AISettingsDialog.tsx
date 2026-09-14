import React from "react";
import { useAppStore } from "../../store";
import { X } from "lucide-react";

export const AISettingsDialog: React.FC = () => {
  const store = useAppStore();

  if (!store.isAISettingsDialogOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-96 rounded-lg bg-[#252526] p-4 shadow-xl ring-1 ring-white/10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-200">AI Settings</h2>
          <button
            onClick={() => store.setAISettingsDialogOpen(false)}
            className="rounded p-1 hover:bg-white/10 text-gray-400 hover:text-gray-200"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-gray-300">Provider</label>
            <select
              value={store.aiSettings.providerId}
              onChange={(e) =>
                store.setAISettings({ providerId: e.target.value })
              }
              className="w-full rounded bg-[#3c3c3c] px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="mock">Mock Provider (Local)</option>
              <option value="openai" disabled>
                OpenAI / ChatGPT (Coming soon)
              </option>
              <option value="custom" disabled>
                Custom HTTP API (Coming soon)
              </option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-300">API Key</label>
            <input
              type="password"
              placeholder="Enter API key..."
              value={store.aiSettings.apiKey}
              onChange={(e) => store.setAISettings({ apiKey: e.target.value })}
              disabled={store.aiSettings.providerId === "mock"}
              className="w-full rounded bg-[#3c3c3c] px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-300">Custom Endpoint URL</label>
            <input
              type="text"
              placeholder="https://..."
              value={store.aiSettings.customEndpoint}
              onChange={(e) =>
                store.setAISettings({ customEndpoint: e.target.value })
              }
              disabled={store.aiSettings.providerId !== "custom"}
              className="w-full rounded bg-[#3c3c3c] px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={() => store.setAISettingsDialogOpen(false)}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-700 text-white"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
