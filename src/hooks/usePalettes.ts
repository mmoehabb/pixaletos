import { useState, useEffect } from "react";
import type { Palette } from "../types";
import { DEFAULT_PALETTES } from "../utils/palettes";

const PALETTES_STORAGE_KEY = "pixalitos_custom_palettes";

export function usePalettes() {
  const [palettes, setPalettes] = useState<Palette[]>([]);

  useEffect(() => {
    // Load custom palettes from localStorage and merge with defaults
    const loadPalettes = () => {
      try {
        const stored = localStorage.getItem(PALETTES_STORAGE_KEY);
        if (stored) {
          const customPalettes: Palette[] = JSON.parse(stored);
          setPalettes([...DEFAULT_PALETTES, ...customPalettes]);
        } else {
          setPalettes([...DEFAULT_PALETTES]);
        }
      } catch (error) {
        console.error("Failed to load custom palettes:", error);
        setPalettes([...DEFAULT_PALETTES]);
      }
    };

    loadPalettes();
  }, []);

  const saveCustomPalettes = (customPalettes: Palette[]) => {
    try {
      localStorage.setItem(
        PALETTES_STORAGE_KEY,
        JSON.stringify(customPalettes),
      );
    } catch (error) {
      console.error("Failed to save custom palettes:", error);
    }
  };

  const addPalette = (name: string, initialColors: string[] = []) => {
    const newPalette: Palette = {
      id: crypto.randomUUID(),
      name,
      colors: initialColors,
    };

    setPalettes((prev) => {
      const customPalettes = prev.filter((p) => !p.isDefault);
      const updatedCustom = [...customPalettes, newPalette];
      saveCustomPalettes(updatedCustom);
      return [...DEFAULT_PALETTES, ...updatedCustom];
    });

    return newPalette.id;
  };

  const updatePalette = (
    id: string,
    updates: Partial<Omit<Palette, "id" | "isDefault">>,
  ) => {
    setPalettes((prev) => {
      const paletteIndex = prev.findIndex((p) => p.id === id);
      if (paletteIndex === -1 || prev[paletteIndex].isDefault) {
        return prev; // Cannot update default palettes or non-existent
      }

      const updatedPalette = { ...prev[paletteIndex], ...updates };
      const customPalettes = prev
        .filter((p) => !p.isDefault)
        .map((p) => (p.id === id ? updatedPalette : p));

      saveCustomPalettes(customPalettes);
      return [...DEFAULT_PALETTES, ...customPalettes];
    });
  };

  const deletePalette = (id: string) => {
    setPalettes((prev) => {
      const palette = prev.find((p) => p.id === id);
      if (!palette || palette.isDefault) {
        return prev; // Cannot delete default palettes
      }

      const customPalettes = prev.filter((p) => !p.isDefault && p.id !== id);
      saveCustomPalettes(customPalettes);
      return [...DEFAULT_PALETTES, ...customPalettes];
    });
  };

  const addColorToPalette = (paletteId: string, color: string) => {
    setPalettes((prev) => {
      const palette = prev.find((p) => p.id === paletteId);
      if (!palette || palette.isDefault) return prev;

      // Avoid adding exact duplicates sequentially, or at all based on preference
      // Here we just allow duplicates but a user might want to avoid them.
      // We will allow it to be simple.
      const newColors = [...palette.colors, color];

      const updatedPalette = { ...palette, colors: newColors };
      const customPalettes = prev
        .filter((p) => !p.isDefault)
        .map((p) => (p.id === paletteId ? updatedPalette : p));

      saveCustomPalettes(customPalettes);
      return [...DEFAULT_PALETTES, ...customPalettes];
    });
  };

  const removeColorFromPalette = (paletteId: string, colorIndex: number) => {
    setPalettes((prev) => {
      const palette = prev.find((p) => p.id === paletteId);
      if (!palette || palette.isDefault) return prev;

      const newColors = [...palette.colors];
      newColors.splice(colorIndex, 1);

      const updatedPalette = { ...palette, colors: newColors };
      const customPalettes = prev
        .filter((p) => !p.isDefault)
        .map((p) => (p.id === paletteId ? updatedPalette : p));

      saveCustomPalettes(customPalettes);
      return [...DEFAULT_PALETTES, ...customPalettes];
    });
  };

  return {
    palettes,
    addPalette,
    updatePalette,
    deletePalette,
    addColorToPalette,
    removeColorFromPalette,
  };
}
