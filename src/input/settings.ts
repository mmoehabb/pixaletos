import { create } from "zustand";
import { useAppStore } from "../store";
export const actions = [
  "none",
  "pan",
  "eyedropper",
  "eraser",
  "undo",
  "redo",
  "brushIncrease",
  "brushDecrease",
] as const;
export type InputAction = (typeof actions)[number];
export const defaults: Record<string, InputAction> = {
  "pen:2": "pan",
  "pen:5": "eraser",
};
const key = "pixaletos-input-v1";
function load(): Record<string, InputAction> {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    if (value?.version !== 1 || !value.bindings) return { ...defaults };
    return Object.fromEntries(
      Object.entries(value.bindings).filter(
        ([k, v]) =>
          /^(pen:[0-5]|key:.+)$/.test(k) && actions.includes(v as InputAction),
      ),
    ) as Record<string, InputAction>;
  } catch {
    return { ...defaults };
  }
}
export const useInputSettings = create<{
  bindings: Record<string, InputAction>;
  open: boolean;
  setOpen: (open: boolean) => void;
  save: (bindings: Record<string, InputAction>) => void;
}>((set) => ({
  bindings: load(),
  open: false,
  setOpen: (open) => set({ open }),
  save: (bindings) => {
    set({ bindings });
    try {
      localStorage.setItem(key, JSON.stringify({ version: 1, bindings }));
    } catch {
      /* Session settings remain usable. */
    }
  },
}));
export function keyInput(e: KeyboardEvent) {
  return `key:${e.ctrlKey ? "Ctrl+" : ""}${e.metaKey ? "Meta+" : ""}${e.altKey ? "Alt+" : ""}${e.shiftKey ? "Shift+" : ""}${e.code}`;
}
export function runAction(action: InputAction) {
  const s = useAppStore.getState();
  if (action === "undo") s.undo();
  else if (action === "redo") s.redo();
  else if (action === "brushIncrease")
    s.setBrushSize(Math.min(100, s.brushSize + 1));
  else if (action === "brushDecrease")
    s.setBrushSize(Math.max(1, s.brushSize - 1));
  else if (action === "pan" || action === "eraser" || action === "eyedropper")
    s.setTool(action);
}

export interface PressureSettings {
  size: boolean;
  opacity: boolean;
  minimum: number;
  curve: number;
}
export const defaultPressure: PressureSettings = {
  size: false,
  opacity: false,
  minimum: 0.1,
  curve: 1,
};
function readPressure(): PressureSettings {
  try {
    const p = JSON.parse(
      localStorage.getItem("pixaletos-pressure-v1") || "null",
    );
    return {
      size: p?.size === true,
      opacity: p?.opacity === true,
      minimum: Number.isFinite(p?.minimum)
        ? Math.max(0, Math.min(1, p.minimum))
        : 0.1,
      curve: Number.isFinite(p?.curve)
        ? Math.max(0.25, Math.min(4, p.curve))
        : 1,
    };
  } catch {
    return { ...defaultPressure };
  }
}
export const usePressureSettings = create<{
  settings: PressureSettings;
  save: (settings: PressureSettings) => void;
}>((set) => ({
  settings: readPressure(),
  save: (settings) => {
    set({ settings });
    try {
      localStorage.setItem("pixaletos-pressure-v1", JSON.stringify(settings));
    } catch {
      /* Session only. */
    }
  },
}));
export function pressureFactor(pressure: number, settings: PressureSettings) {
  return (
    settings.minimum +
    (1 - settings.minimum) *
      Math.pow(
        Math.max(0, Math.min(1, Number.isFinite(pressure) ? pressure : 1)),
        settings.curve,
      )
  );
}
export function penButton(buttons: number) {
  return buttons & 32
    ? 5
    : buttons & 2
      ? 2
      : buttons & 4
        ? 1
        : buttons & 8
          ? 3
          : buttons & 16
            ? 4
            : buttons & 1
              ? 0
              : -1;
}
