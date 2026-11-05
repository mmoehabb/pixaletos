import { keyInput, runAction, useInputSettings } from "../../input/settings";
import { copySelection, pasteSelection } from "../../utils/clipboard";
import React, { useEffect, useRef } from "react";
import { useAppStore } from "../../store";
import type { Tool, Command } from "../../types";
import { importPNG, loadProject, saveProject } from "../../utils/project";

export const KeyboardShortcuts: React.FC = () => {
  const { setTool, undo, redo, setZoom, zoom, setSelection } = useAppStore();
  const toolBeforePan = useRef<Tool | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        useInputSettings.getState().open ||
        document.querySelector('[aria-modal="true"]')
      )
        return;
      const target = e.target as HTMLElement;
      if (target?.closest("input, textarea, select, [contenteditable=true]"))
        return;
      const mapped = useInputSettings.getState().bindings[keyInput(e)];
      if (mapped) {
        e.preventDefault();
        if (!e.repeat || mapped.startsWith("brush")) runAction(mapped);
        return;
      }
      // Don't trigger shortcuts if user is typing in an input field
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (cmdOrCtrl) {
        if (e.key.toLowerCase() === "z") {
          if (e.shiftKey) {
            redo();
          } else {
            undo();
          }
          e.preventDefault();
          return;
        }

        if (e.key.toLowerCase() === "s") {
          saveProject(useAppStore.getState());
          e.preventDefault();
          return;
        }

        if (e.key.toLowerCase() === "o") {
          loadProject(useAppStore.getState());
          e.preventDefault();
          return;
        }

        if (e.key.toLowerCase() === "i") {
          importPNG(useAppStore.getState());
          e.preventDefault();
          return;
        }

        if (e.key.toLowerCase() === "e") {
          window.dispatchEvent(new Event("pixaletos-export"));
          e.preventDefault();
          return;
        }

        if (e.key.toLowerCase() === "a") {
          if (e.shiftKey) {
            // Deselect all
            setSelection(null);
          } else {
            // Select all
            const { dimensions } = useAppStore.getState();
            const newSelection = new Uint8Array(
              dimensions.width * dimensions.height,
            );
            newSelection.fill(1);
            setSelection(newSelection);
          }
          e.preventDefault();
          return;
        }

        if (e.key === "=" || e.key === "+") {
          setZoom(Math.min(20, zoom + 0.5));
          e.preventDefault();
          return;
        }

        if (e.key === "-") {
          setZoom(Math.max(0.1, zoom - 0.5));
          e.preventDefault();
          return;
        }

        if (["c", "x", "v"].includes(e.key.toLowerCase())) {
          if (e.key.toLowerCase() === "v") pasteSelection();
          else copySelection(e.key.toLowerCase() === "x");
          e.preventDefault();
          return;
        }
      } else {
        if (e.key === "Escape") {
          setSelection(null);
          return;
        }
        // Tool shortcuts
        const toolMap: Record<string, Tool> = {
          p: "pencil",
          e: "eraser",
          f: "fill",
          i: "eyedropper",
          m: "select",
          v: "move",
          r: "rotate",
          l: "line",
          u: "rectangle",
          o: "ellipse",
          h: "pan",
          z: "zoom",
        };

        const key = e.key.toLowerCase();
        if (toolMap[key]) {
          setTool(toolMap[key]);
        }

        // Spacebar panning is temporary, preserving the selected drawing tool.
        if (e.code === "Space" && !e.repeat) {
          toolBeforePan.current = useAppStore.getState().currentTool;
          setTool("pan");
          e.preventDefault();
        }

        if (e.key === "Backspace" || e.key === "Delete") {
          const state = useAppStore.getState();
          const { selection, activeLayerId, layers } = state;

          if (selection && activeLayerId) {
            const activeLayer = layers.find((l) => l.id === activeLayerId);
            if (activeLayer) {
              const oldData = new Uint8ClampedArray(activeLayer.data);
              const newData = new Uint8ClampedArray(activeLayer.data);

              let hasChanges = false;
              for (let i = 0; i < selection.length; i++) {
                if (selection[i] === 1) {
                  const pixelIndex = i * 4;
                  if (newData[pixelIndex + 3] !== 0) {
                    newData[pixelIndex] = 0;
                    newData[pixelIndex + 1] = 0;
                    newData[pixelIndex + 2] = 0;
                    newData[pixelIndex + 3] = 0;
                    hasChanges = true;
                  }
                }
              }

              if (hasChanges) {
                const command: Command = {
                  name: "Erase Selection",
                  undo: () => {
                    useAppStore
                      .getState()
                      .updateLayerData(activeLayerId, oldData);
                  },
                  redo: () => {
                    useAppStore
                      .getState()
                      .updateLayerData(activeLayerId, newData);
                  },
                };
                state.executeCommand(command);
              }
            }
          }
          e.preventDefault();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code !== "Space" || !toolBeforePan.current) return;
      setTool(toolBeforePan.current);
      toolBeforePan.current = null;
      e.preventDefault();
    };

    const restorePan = () => {
      if (toolBeforePan.current) {
        setTool(toolBeforePan.current);
        toolBeforePan.current = null;
      }
    };
    const handleWheel = (e: WheelEvent) => {
      if (
        useInputSettings.getState().open ||
        document.querySelector('[aria-modal="true"]')
      )
        return;
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (cmdOrCtrl) {
        e.preventDefault(); // Prevent browser zoom
        if (e.deltaY < 0) {
          setZoom(Math.min(20, zoom + 0.25));
        } else {
          setZoom(Math.max(0.1, zoom - 0.25));
        }
      }
    };

    window.addEventListener("blur", restorePan);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      window.removeEventListener("blur", restorePan);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("wheel", handleWheel);
    };
  }, [setTool, undo, redo, setZoom, zoom, setSelection]);

  return null;
};
