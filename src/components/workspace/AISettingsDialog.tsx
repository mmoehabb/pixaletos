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
              onChange={(e) => {
                const newProviderId = e.target.value;
                let newModel = store.aiSettings.model;
                let newEndpoint = store.aiSettings.customEndpoint;

                if (newProviderId === "easydiffusion") {
                  newModel = "sd-v1-4";
                } else if (newProviderId === "openai") {
                  newModel = "dall-e-3";
                } else if (newProviderId === "lmstudio") {
                  newModel = "local-model";
                  newEndpoint = "http://127.0.0.1:1234/v1";
                }

                store.setAISettings({
                  providerId: newProviderId,
                  model: newModel,
                  customEndpoint: newEndpoint,
                });
              }}
              className="w-full rounded bg-[#3c3c3c] px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="mock">Mock Provider (Local)</option>
              <option value="openai">OpenAI / ChatGPT</option>
              <option value="custom">
                Custom HTTP API (OpenAI Compatible)
              </option>
              <option value="easydiffusion">Easy Diffusion (Local)</option>
              <option value="lmstudio">LM Studio (Local)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-300">Model Name</label>
            <input
              type="text"
              placeholder={
                store.aiSettings.providerId === "easydiffusion"
                  ? "e.g. sd-v1-4"
                  : store.aiSettings.providerId === "lmstudio"
                    ? "e.g. local-model"
                    : "e.g. dall-e-3"
              }
              value={store.aiSettings.model}
              onChange={(e) => store.setAISettings({ model: e.target.value })}
              disabled={store.aiSettings.providerId === "mock"}
              className="w-full rounded bg-[#3c3c3c] px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-300">API Key</label>
            <input
              type="password"
              placeholder="Enter API key..."
              value={store.aiSettings.apiKey}
              onChange={(e) => store.setAISettings({ apiKey: e.target.value })}
              disabled={
                store.aiSettings.providerId === "mock" ||
                store.aiSettings.providerId === "easydiffusion" ||
                store.aiSettings.providerId === "lmstudio"
              }
              className="w-full rounded bg-[#3c3c3c] px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-300">Custom Endpoint URL</label>
            <input
              type="text"
              placeholder={
                store.aiSettings.providerId === "easydiffusion"
                  ? "http://127.0.0.1:9000"
                  : store.aiSettings.providerId === "lmstudio"
                    ? "http://127.0.0.1:1234/v1"
                    : "https://..."
              }
              value={store.aiSettings.customEndpoint}
              onChange={(e) =>
                store.setAISettings({ customEndpoint: e.target.value })
              }
              disabled={
                store.aiSettings.providerId !== "custom" &&
                store.aiSettings.providerId !== "easydiffusion" &&
                store.aiSettings.providerId !== "lmstudio"
              }
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
