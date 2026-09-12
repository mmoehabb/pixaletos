import React, { useEffect, useRef } from "react";
import { useAppStore } from "../../store";
import type { Tool } from "../../types";
import {
  exportToPNG,
  importPNG,
  loadProject,
  saveProject,
} from "../../utils/project";

export const KeyboardShortcuts: React.FC = () => {
  const { setTool, undo, redo, setZoom, zoom, setSelection } = useAppStore();
  const toolBeforePan = useRef<Tool | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
          exportToPNG(useAppStore.getState());
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

        // Basic copy/paste placeholders (full clipboard integration requires more work)
        if (
          e.key.toLowerCase() === "c" ||
          e.key.toLowerCase() === "x" ||
          e.key.toLowerCase() === "v"
        ) {
          // e.preventDefault();
          // To be implemented in a future iteration
          return;
        }
      } else {
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
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code !== "Space" || !toolBeforePan.current) return;
      setTool(toolBeforePan.current);
      toolBeforePan.current = null;
      e.preventDefault();
    };

    const handleWheel = (e: WheelEvent) => {
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

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("wheel", handleWheel);
    };
  }, [setTool, undo, redo, setZoom, zoom, setSelection]);

  return null;
};
