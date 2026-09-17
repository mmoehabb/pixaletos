import { useAppStore } from "../../store";
import type { AIProvider } from "../../types";
import { MockAIProvider } from "./provider";
import { createOpenAIProvider } from "./openai";
import { createEasyDiffusionProvider } from "./easydiffusion";
import { createLMStudioProvider } from "./lmstudio";

export const getActiveProvider = (): AIProvider => {
  const store = useAppStore.getState();
  const settings = store.aiSettings;

  if (settings.providerId === "mock") {
    return MockAIProvider;
  }

  if (settings.providerId === "openai" || settings.providerId === "custom") {
    return createOpenAIProvider(settings);
  }

  if (settings.providerId === "easydiffusion") {
    return createEasyDiffusionProvider(settings);
  }

  if (settings.providerId === "lmstudio") {
    return createLMStudioProvider(settings);
  }

  // Fallback to mock
  return MockAIProvider;
};
