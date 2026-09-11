import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { Application, extend } from "@pixi/react";
import {
  Container,
  Sprite,
  Graphics as PixiGraphics,
  Texture,
  BufferImageSource,
} from "pixi.js";
import { useAppStore } from "../../store";
import type { Command } from "../../types";

extend({ Container, Sprite, Graphics: PixiGraphics });

const CanvasLayer = ({
  data,
  opacity,
  visible,
  dimensions,
  zIndex,
  version,
}: {
  data: Uint8ClampedArray;
  opacity: number;
  visible: boolean;
  dimensions: { width: number; height: number };
  zIndex?: number;
  version?: number;
}) => {
  const textureRef = useRef<Texture | null>(null);
  const [, forceRender] = useState(0);

  useEffect(() => {
    const source = new BufferImageSource({
      resource: data,
      width: dimensions.width,
      height: dimensions.height,
      format: "rgba8unorm",
      scaleMode: "nearest",
    });
    textureRef.current = new Texture({ source });
    forceRender((v) => v + 1);

    return () => {
      if (textureRef.current) textureRef.current.destroy(true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dimensions]); // intentionally avoiding recreating texture just because 'data' instance might swap

  useEffect(() => {
    if (textureRef.current) {
      const source = textureRef.current.source as BufferImageSource;
      source.resource = data;
      source.update();
      forceRender((v) => v + 1);
    }
  }, [data, version]);

  if (!textureRef.current) return null;

  return (
    <pixiSprite
      texture={textureRef.current}
      alpha={opacity}
      visible={visible}
      zIndex={zIndex}
    />
  );
};

const SelectionOverlay = ({
  dimensions,
  selection,
}: {
  dimensions: { width: number; height: number };
  selection: Uint8Array | null;
}) => {
  const draw = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      if (!selection) return;

      // Dim unselected area
      g.beginFill(0x000000, 0.3);
      g.drawRect(0, 0, dimensions.width, dimensions.height);
      g.endFill();

      g.lineStyle(1, 0xffffff, 1);
      let minX = dimensions.width,
        minY = dimensions.height,
        maxX = -1,
        maxY = -1;
      let hasSel = false;
      for (let y = 0; y < dimensions.height; y++) {
        for (let x = 0; x < dimensions.width; x++) {
          if (selection[y * dimensions.width + x]) {
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
            hasSel = true;
          }
        }
      }
      if (hasSel) {
        g.drawRect(minX, minY, maxX - minX + 1, maxY - minY + 1);
      }
    },
    [dimensions, selection],
  );

  return <pixiGraphics draw={draw} zIndex={1000} />;
};

export const PixelCanvas: React.FC = () => {
  const {
    dimensions,
    layers,
    zoom,
    pan,
    currentTool,
    setPan,
    activeLayerId,
    foregroundColor,
    brushSize,
    executeCommand,
    updateLayerData,
    selection,
    setSelection,
    setForegroundColor,
    setZoom,
  } = useAppStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);

  const lastPanPosition = useRef<{ x: number; y: number } | null>(null);
  const startDrawPos = useRef<{ x: number; y: number } | null>(null);
  const lastDrawPos = useRef<{ x: number; y: number } | null>(null);

  const previewDataRef = useRef<Uint8ClampedArray>(
    new Uint8ClampedArray(dimensions.width * dimensions.height * 4),
  );
  const [previewDataVersion, setPreviewDataVersion] = useState(0);

  // Update previewData array size when dimensions change
  useEffect(() => {
    previewDataRef.current = new Uint8ClampedArray(
      dimensions.width * dimensions.height * 4,
    );
    // Don't call setState here to avoid cascading renders warning, just wait for next interaction
    // setPreviewDataVersion(v => v + 1);
  }, [dimensions]);

  // We will directly mutate layer.data in pencil/eraser to be fast, but we will keep track of diffs
  const strokeDiff = useRef<
    Map<
      number,
      {
        oldColor: { r: number; g: number; b: number; a: number };
        newColor: { r: number; g: number; b: number; a: number };
      }
    >
  >(new Map());

  const canvasRef = useRef<HTMLDivElement>(null);

  // Keep a resized, rotated, or imported canvas visible and centred. The
  // previous one-time fit left an altered canvas using stale viewport offsets.
  useEffect(() => {
    if (containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const padding = 60; // Leave some space around the canvas
      const availableWidth = containerRect.width - padding;
      const availableHeight = containerRect.height - padding;

      const zoomX = availableWidth / dimensions.width;
      const zoomY = availableHeight / dimensions.height;
      const initialZoom = Math.max(0.1, Math.floor(Math.min(zoomX, zoomY))); // Integer zoom is usually nicer for pixel art

      setZoom(initialZoom);

      // Position the unscaled canvas center at the workspace center. With the
      // transform origin below set to the canvas center, this keeps the canvas
      // centered at every zoom level and makes that center the zoom pivot.
      const panX = (containerRect.width - dimensions.width) / 2;
      const panY = (containerRect.height - dimensions.height) / 2;
      setPan({ x: panX, y: panY });
    }
  }, [dimensions.width, dimensions.height, setZoom, setPan]);

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
          a: 255,
        }
      : { r: 0, g: 0, b: 0, a: 255 };
  };

  const getPixel = (data: Uint8ClampedArray, x: number, y: number) => {
    if (x < 0 || x >= dimensions.width || y < 0 || y >= dimensions.height)
      return { r: 0, g: 0, b: 0, a: 0 };
    const i = (y * dimensions.width + x) * 4;
    return { r: data[i], g: data[i + 1], b: data[i + 2], a: data[i + 3] };
  };

  // Selection masks are tied to canvas dimensions. Treat a stale mask as no
  // selection, rather than silently rejecting every newly added pixel.
  const hasValidSelection =
    selection?.length === dimensions.width * dimensions.height;

  const drawPixel = (
    data: Uint8ClampedArray,
    x: number,
    y: number,
    color: { r: number; g: number; b: number; a: number },
    trackDiff: boolean = true,
  ) => {
    if (x < 0 || x >= dimensions.width || y < 0 || y >= dimensions.height)
      return;
    if (hasValidSelection && !selection[y * dimensions.width + x]) return;

    const i = (y * dimensions.width + x) * 4;
    const oldR = data[i],
      oldG = data[i + 1],
      oldB = data[i + 2],
      oldA = data[i + 3];

    if (
      oldR === color.r &&
      oldG === color.g &&
      oldB === color.b &&
      oldA === color.a
    )
      return;

    if (trackDiff) {
      if (!strokeDiff.current.has(i)) {
        strokeDiff.current.set(i, {
          oldColor: { r: oldR, g: oldG, b: oldB, a: oldA },
          newColor: color,
        });
      } else {
        strokeDiff.current.get(i)!.newColor = color;
      }
    }

    data[i] = color.r;
    data[i + 1] = color.g;
    data[i + 2] = color.b;
    data[i + 3] = color.a;
  };

  const drawLine = (
    data: Uint8ClampedArray,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    color: { r: number; g: number; b: number; a: number },
    trackDiff: boolean = true,
  ) => {
    const dx = Math.abs(x1 - x0),
      dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1,
      sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    while (true) {
      drawPixel(data, x0, y0, color, trackDiff);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }
  };

  /** Draw a square pixel-art brush centered on a canvas pixel. */
  const drawBrush = (
    data: Uint8ClampedArray,
    x: number,
    y: number,
    color: { r: number; g: number; b: number; a: number },
  ) => {
    const start = -Math.floor((brushSize - 1) / 2);
    const end = start + brushSize - 1;
    for (let offsetY = start; offsetY <= end; offsetY++) {
      for (let offsetX = start; offsetX <= end; offsetX++) {
        drawPixel(data, x + offsetX, y + offsetY, color, true);
      }
    }
  };

  /** Interpolate brush stamps so rapid pointer movements never leave gaps. */
  const drawBrushLine = (
    data: Uint8ClampedArray,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    color: { r: number; g: number; b: number; a: number },
  ) => {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      drawBrush(data, x0, y0, color);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }
  };

  const drawRect = (
    data: Uint8ClampedArray,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    color: { r: number; g: number; b: number; a: number },
    trackDiff: boolean = true,
  ) => {
    const minX = Math.min(x0, x1),
      maxX = Math.max(x0, x1);
    const minY = Math.min(y0, y1),
      maxY = Math.max(y0, y1);
    for (let x = minX; x <= maxX; x++) {
      drawPixel(data, x, minY, color, trackDiff);
      drawPixel(data, x, maxY, color, trackDiff);
    }
    for (let y = minY; y <= maxY; y++) {
      drawPixel(data, minX, y, color, trackDiff);
      drawPixel(data, maxX, y, color, trackDiff);
    }
  };

  const drawEllipse = (
    data: Uint8ClampedArray,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    color: { r: number; g: number; b: number; a: number },
    trackDiff: boolean = true,
  ) => {
    let a = Math.abs(x1 - x0),
      b = Math.abs(y1 - y0),
      b1 = b & 1;
    let dx = 4 * (1 - a) * b * b,
      dy = 4 * (b1 + 1) * a * a;
    let err = dx + dy + b1 * a * a,
      e2;
    if (x0 > x1) {
      x0 = x1;
      x1 += a;
    }
    if (y0 > y1) y0 = y1;
    y0 += (b + 1) >> 1;
    y1 = y0 - b1;
    a *= 8 * a;
    b1 = 8 * b * b;
    do {
      drawPixel(data, x1, y0, color, trackDiff);
      drawPixel(data, x0, y0, color, trackDiff);
      drawPixel(data, x0, y1, color, trackDiff);
      drawPixel(data, x1, y1, color, trackDiff);
      e2 = 2 * err;
      if (e2 <= dy) {
        y0++;
        y1--;
        err += dy += a;
      }
      if (e2 >= dx || 2 * err > dy) {
        x0++;
        x1--;
        err += dx += b1;
      }
    } while (x0 <= x1);
    while (y0 - y1 < b) {
      drawPixel(data, x0 - 1, y0, color, trackDiff);
      drawPixel(data, x1 + 1, y0++, color, trackDiff);
      drawPixel(data, x0 - 1, y1, color, trackDiff);
      drawPixel(data, x1 + 1, y1--, color, trackDiff);
    }
  };

  const floodFill = (
    data: Uint8ClampedArray,
    startX: number,
    startY: number,
    color: { r: number; g: number; b: number; a: number },
    trackDiff: boolean = true,
  ) => {
    const targetColor = getPixel(data, startX, startY);
    if (
      targetColor.r === color.r &&
      targetColor.g === color.g &&
      targetColor.b === color.b &&
      targetColor.a === color.a
    )
      return;

    const match = (x: number, y: number) => {
      if (hasValidSelection && !selection[y * dimensions.width + x])
        return false;
      const p = getPixel(data, x, y);
      return (
        p.r === targetColor.r &&
        p.g === targetColor.g &&
        p.b === targetColor.b &&
        p.a === targetColor.a
      );
    };

    const stack = [[startX, startY]];
    while (stack.length) {
      const [x, y] = stack.pop()!;
      if (
        x >= 0 &&
        x < dimensions.width &&
        y >= 0 &&
        y < dimensions.height &&
        match(x, y)
      ) {
        drawPixel(data, x, y, color, trackDiff);
        stack.push([x + 1, y]);
        stack.push([x - 1, y]);
        stack.push([x, y + 1]);
        stack.push([x, y - 1]);
      }
    }
  };

  const rgbToHex = (r: number, g: number, b: number) => {
    return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  };

  const getCanvasCoords = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const xScreen = e.clientX - rect.left;
    const yScreen = e.clientY - rect.top;
    const x = Math.floor(xScreen / zoom);
    const y = Math.floor(yScreen / zoom);
    return { x, y };
  };

  const commitDrawing = (
    layerId: string,
    diffEntries: [number, { oldColor: any; newColor: any }][],
  ) => {
    if (diffEntries.length === 0) return;

    const command: Command = {
      name: `Tool: ${currentTool}`,
      undo: () => {
        const state = useAppStore.getState();
        const layer = state.layers.find((l) => l.id === layerId);
        if (!layer) return;
        const newData = new Uint8ClampedArray(layer.data);
        for (const [i, diff] of diffEntries) {
          newData[i] = diff.oldColor.r;
          newData[i + 1] = diff.oldColor.g;
          newData[i + 2] = diff.oldColor.b;
          newData[i + 3] = diff.oldColor.a;
        }
        state.updateLayerData(layerId, newData);
      },
      redo: () => {
        const state = useAppStore.getState();
        const layer = state.layers.find((l) => l.id === layerId);
        if (!layer) return;
        const newData = new Uint8ClampedArray(layer.data);
        for (const [i, diff] of diffEntries) {
          newData[i] = diff.newColor.r;
          newData[i + 1] = diff.newColor.g;
          newData[i + 2] = diff.newColor.b;
          newData[i + 3] = diff.newColor.a;
        }
        state.updateLayerData(layerId, newData);
      },
    };
    executeCommand(command);
  };

  const applyPreviewToLayer = (layerId: string) => {
    const layer = layers.find((l) => l.id === layerId);
    if (!layer) return;

    // We didn't mutate the actual layer yet for these tools, so we do it now, track diffs, and commit
    const color = hexToRgb(foregroundColor);
    if (startDrawPos.current && lastDrawPos.current) {
      if (currentTool === "line") {
        drawLine(
          layer.data,
          startDrawPos.current.x,
          startDrawPos.current.y,
          lastDrawPos.current.x,
          lastDrawPos.current.y,
          color,
          true,
        );
      } else if (currentTool === "rectangle") {
        drawRect(
          layer.data,
          startDrawPos.current.x,
          startDrawPos.current.y,
          lastDrawPos.current.x,
          lastDrawPos.current.y,
          color,
          true,
        );
      } else if (currentTool === "ellipse") {
        drawEllipse(
          layer.data,
          startDrawPos.current.x,
          startDrawPos.current.y,
          lastDrawPos.current.x,
          lastDrawPos.current.y,
          color,
          true,
        );
      }
    }

    const diffEntries = Array.from(strokeDiff.current.entries());

    // Re-create the array to trigger state update
    const newData = new Uint8ClampedArray(layer.data);
    updateLayerData(layerId, newData);

    commitDrawing(layerId, diffEntries);
    strokeDiff.current.clear();
    previewDataRef.current.fill(0);
    setPreviewDataVersion((v) => v + 1);
  };

  // Move Tool state
  const movedSelectionData = useRef<Uint8Array | null>(null); // Store original selected pixels before move
  const originalLayerData = useRef<Uint8ClampedArray | null>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button === 1 || currentTool === "pan") {
      setIsPanning(true);
      lastPanPosition.current = { x: e.clientX, y: e.clientY };
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    if (e.button !== 0) return;

    if (currentTool === "zoom") {
      if (e.altKey) {
        setZoom(Math.max(0.1, zoom - 0.5));
      } else {
        setZoom(Math.min(20, zoom + 0.5));
      }
      return;
    }

    const { x, y } = getCanvasCoords(e);

    if (currentTool === "eyedropper") {
      const topVisibleLayer = [...layers].find(
        (l) => l.visible && getPixel(l.data, x, y).a > 0,
      );
      if (topVisibleLayer) {
        const p = getPixel(topVisibleLayer.data, x, y);
        setForegroundColor(rgbToHex(p.r, p.g, p.b));
      }
      return;
    }

    if (currentTool === "select") {
      setIsDrawing(true);
      startDrawPos.current = { x, y };
      lastDrawPos.current = { x, y };
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    if (!activeLayerId) return;
    const layer = layers.find((l) => l.id === activeLayerId);
    if (!layer || !layer.visible) return;

    // A pointer interaction owns exactly one history diff. This also prevents a
    // cancelled interaction from leaking pixels into the following command.
    strokeDiff.current.clear();

    if (currentTool === "move" && selection) {
      setIsDrawing(true);
      startDrawPos.current = { x, y };
      lastDrawPos.current = { x, y };
      e.currentTarget.setPointerCapture(e.pointerId);

      // Save original layer state and extract the selection
      originalLayerData.current = new Uint8ClampedArray(layer.data);
      movedSelectionData.current = new Uint8Array(
        dimensions.width * dimensions.height,
      );
      movedSelectionData.current.set(selection);

      // Erase selected pixels from the active layer's current state temporarily
      for (let i = 0; i < selection.length; i++) {
        if (selection[i]) {
          const pxIdx = i * 4;
          // record diff for clearing
          if (!strokeDiff.current.has(pxIdx)) {
            strokeDiff.current.set(pxIdx, {
              oldColor: {
                r: layer.data[pxIdx],
                g: layer.data[pxIdx + 1],
                b: layer.data[pxIdx + 2],
                a: layer.data[pxIdx + 3],
              },
              newColor: { r: 0, g: 0, b: 0, a: 0 },
            });
          }
          layer.data[pxIdx] = 0;
          layer.data[pxIdx + 1] = 0;
          layer.data[pxIdx + 2] = 0;
          layer.data[pxIdx + 3] = 0;
        }
      }
      updateLayerData(activeLayerId, new Uint8ClampedArray(layer.data));
      return;
    }

    setIsDrawing(true);
    e.currentTarget.setPointerCapture(e.pointerId);

    startDrawPos.current = { x, y };
    lastDrawPos.current = { x, y };

    const color =
      currentTool === "eraser"
        ? { r: 0, g: 0, b: 0, a: 0 }
        : hexToRgb(foregroundColor);

    if (currentTool === "pencil" || currentTool === "eraser") {
      drawBrush(layer.data, x, y, color);
      updateLayerData(activeLayerId, new Uint8ClampedArray(layer.data));
    } else if (currentTool === "fill") {
      floodFill(layer.data, x, y, color, true);
      updateLayerData(activeLayerId, new Uint8ClampedArray(layer.data));
      const diffEntries = Array.from(strokeDiff.current.entries());
      commitDrawing(activeLayerId, diffEntries);
      strokeDiff.current.clear();
      setIsDrawing(false);
    } else if (["line", "rectangle", "ellipse"].includes(currentTool)) {
      // preview uses a separate transparent overlay to not corrupt history
      previewDataRef.current.fill(0);
      setPreviewDataVersion((v) => v + 1);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isPanning && lastPanPosition.current) {
      const dx = e.clientX - lastPanPosition.current.x;
      const dy = e.clientY - lastPanPosition.current.y;
      setPan({ x: pan.x + dx, y: pan.y + dy });
      lastPanPosition.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (!isDrawing || !lastDrawPos.current) return;
    const { x, y } = getCanvasCoords(e);
    const prev = lastDrawPos.current;

    if (x === prev.x && y === prev.y) return;

    if (currentTool === "select") {
      lastDrawPos.current = { x, y };
      return;
    }

    if (!activeLayerId) return;
    const layer = layers.find((l) => l.id === activeLayerId);
    if (!layer || !layer.visible) return;

    if (
      currentTool === "move" &&
      selection &&
      originalLayerData.current &&
      startDrawPos.current
    ) {
      lastDrawPos.current = { x, y };
      const dx = x - startDrawPos.current.x;
      const dy = y - startDrawPos.current.y;

      // Draw the moved selection to previewData
      previewDataRef.current.fill(0);
      for (let py = 0; py < dimensions.height; py++) {
        for (let px = 0; px < dimensions.width; px++) {
          if (
            movedSelectionData.current &&
            movedSelectionData.current[py * dimensions.width + px]
          ) {
            const srcIdx = (py * dimensions.width + px) * 4;
            const destX = px + dx;
            const destY = py + dy;
            if (
              destX >= 0 &&
              destX < dimensions.width &&
              destY >= 0 &&
              destY < dimensions.height
            ) {
              const destIdx = (destY * dimensions.width + destX) * 4;
              previewDataRef.current[destIdx] =
                originalLayerData.current[srcIdx];
              previewDataRef.current[destIdx + 1] =
                originalLayerData.current[srcIdx + 1];
              previewDataRef.current[destIdx + 2] =
                originalLayerData.current[srcIdx + 2];
              previewDataRef.current[destIdx + 3] =
                originalLayerData.current[srcIdx + 3];
            }
          }
        }
      }
      setPreviewDataVersion((v) => v + 1);
      return;
    }

    const color =
      currentTool === "eraser"
        ? { r: 0, g: 0, b: 0, a: 0 }
        : hexToRgb(foregroundColor);

    if (currentTool === "pencil" || currentTool === "eraser") {
      drawBrushLine(layer.data, prev.x, prev.y, x, y, color);
      updateLayerData(activeLayerId, new Uint8ClampedArray(layer.data));
      lastDrawPos.current = { x, y };
    } else if (
      ["line", "rectangle", "ellipse"].includes(currentTool) &&
      startDrawPos.current
    ) {
      previewDataRef.current.fill(0);
      if (currentTool === "line")
        drawLine(
          previewDataRef.current,
          startDrawPos.current.x,
          startDrawPos.current.y,
          x,
          y,
          color,
          false,
        );
      if (currentTool === "rectangle")
        drawRect(
          previewDataRef.current,
          startDrawPos.current.x,
          startDrawPos.current.y,
          x,
          y,
          color,
          false,
        );
      if (currentTool === "ellipse")
        drawEllipse(
          previewDataRef.current,
          startDrawPos.current.x,
          startDrawPos.current.y,
          x,
          y,
          color,
          false,
        );
      lastDrawPos.current = { x, y };
      setPreviewDataVersion((v) => v + 1);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isPanning) {
      setIsPanning(false);
      lastPanPosition.current = null;
      e.currentTarget.releasePointerCapture(e.pointerId);
      return;
    }

    if (isDrawing) {
      setIsDrawing(false);
      e.currentTarget.releasePointerCapture(e.pointerId);

      if (
        currentTool === "select" &&
        startDrawPos.current &&
        lastDrawPos.current
      ) {
        const startX = Math.min(startDrawPos.current.x, lastDrawPos.current.x);
        const startY = Math.min(startDrawPos.current.y, lastDrawPos.current.y);
        const endX = Math.max(startDrawPos.current.x, lastDrawPos.current.x);
        const endY = Math.max(startDrawPos.current.y, lastDrawPos.current.y);

        const newSelection = new Uint8Array(
          dimensions.width * dimensions.height,
        );
        for (
          let j = Math.max(0, startY);
          j <= Math.min(dimensions.height - 1, endY);
          j++
        ) {
          for (
            let i = Math.max(0, startX);
            i <= Math.min(dimensions.width - 1, endX);
            i++
          ) {
            newSelection[j * dimensions.width + i] = 1;
          }
        }

        if (e.shiftKey && selection) {
          for (let i = 0; i < newSelection.length; i++)
            newSelection[i] = newSelection[i] || selection[i];
        } else if (e.altKey && selection) {
          for (let i = 0; i < newSelection.length; i++)
            newSelection[i] = selection[i] && !newSelection[i] ? 1 : 0;
        }

        setSelection(newSelection);
        return;
      }

      if (!activeLayerId) return;

      if (
        currentTool === "move" &&
        selection &&
        startDrawPos.current &&
        lastDrawPos.current &&
        originalLayerData.current
      ) {
        const dx = lastDrawPos.current.x - startDrawPos.current.x;
        const dy = lastDrawPos.current.y - startDrawPos.current.y;

        const layer = layers.find((l) => l.id === activeLayerId);
        if (layer) {
          // Clicking a selection without dragging must not clear its pixels.
          if (dx === 0 && dy === 0) {
            updateLayerData(
              activeLayerId,
              new Uint8ClampedArray(originalLayerData.current),
            );
            strokeDiff.current.clear();
            originalLayerData.current = null;
            movedSelectionData.current = null;
            return;
          }

          // Apply preview data to layer
          for (let i = 0; i < previewDataRef.current.length; i += 4) {
            if (previewDataRef.current[i + 3] > 0) {
              // If preview has pixel
              const pxIdx = i;
              // Track new pixel
              if (!strokeDiff.current.has(pxIdx)) {
                strokeDiff.current.set(pxIdx, {
                  oldColor: {
                    r: layer.data[pxIdx],
                    g: layer.data[pxIdx + 1],
                    b: layer.data[pxIdx + 2],
                    a: layer.data[pxIdx + 3],
                  },
                  newColor: {
                    r: previewDataRef.current[pxIdx],
                    g: previewDataRef.current[pxIdx + 1],
                    b: previewDataRef.current[pxIdx + 2],
                    a: previewDataRef.current[pxIdx + 3],
                  },
                });
              } else {
                strokeDiff.current.get(pxIdx)!.newColor = {
                  r: previewDataRef.current[pxIdx],
                  g: previewDataRef.current[pxIdx + 1],
                  b: previewDataRef.current[pxIdx + 2],
                  a: previewDataRef.current[pxIdx + 3],
                };
              }
              layer.data[pxIdx] = previewDataRef.current[pxIdx];
              layer.data[pxIdx + 1] = previewDataRef.current[pxIdx + 1];
              layer.data[pxIdx + 2] = previewDataRef.current[pxIdx + 2];
              layer.data[pxIdx + 3] = previewDataRef.current[pxIdx + 3];
            }
          }

          // Shift the selection bits
          const newSelection = new Uint8Array(
            dimensions.width * dimensions.height,
          );
          for (let py = 0; py < dimensions.height; py++) {
            for (let px = 0; px < dimensions.width; px++) {
              if (
                movedSelectionData.current &&
                movedSelectionData.current[py * dimensions.width + px]
              ) {
                const destX = px + dx;
                const destY = py + dy;
                if (
                  destX >= 0 &&
                  destX < dimensions.width &&
                  destY >= 0 &&
                  destY < dimensions.height
                ) {
                  newSelection[destY * dimensions.width + destX] = 1;
                }
              }
            }
          }
          setSelection(newSelection);

          updateLayerData(activeLayerId, new Uint8ClampedArray(layer.data));
          commitDrawing(
            activeLayerId,
            Array.from(strokeDiff.current.entries()),
          );

          strokeDiff.current.clear();
          previewDataRef.current.fill(0);
          setPreviewDataVersion((v) => v + 1);

          originalLayerData.current = null;
          movedSelectionData.current = null;
        }
        return;
      }

      if (currentTool === "pencil" || currentTool === "eraser") {
        const diffEntries = Array.from(strokeDiff.current.entries());
        commitDrawing(activeLayerId, diffEntries);
        strokeDiff.current.clear();
      } else if (["line", "rectangle", "ellipse"].includes(currentTool)) {
        applyPreviewToLayer(activeLayerId);
      }
    }
  };

  const previewLayer = useMemo(() => {
    return (
      <CanvasLayer
        data={previewDataRef.current}
        opacity={1}
        visible={true}
        dimensions={dimensions}
        zIndex={layers.length}
        version={previewDataVersion}
      />
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dimensions, layers.length, previewDataVersion]);

  return (
    <div
      ref={containerRef}
      className="flex items-center justify-center w-full h-full bg-neutral-900 rounded-md overflow-hidden p-4 relative select-none touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        aria-label="Pixel canvas"
        className="absolute left-0 top-0 rounded-sm shadow-[0_12px_36px_rgba(0,0,0,0.35)]"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "center",
          width: dimensions.width,
          height: dimensions.height,
          imageRendering: "pixelated",
          // This pattern is intentionally rendered behind the transparent Pixi
          // canvas so empty pixels remain visually distinct from white pixels.
          backgroundColor: "#cbd3df",
          backgroundSize: "8px 8px",
          backgroundImage:
            "conic-gradient(#eef2f7 25%, #cbd3df 0 50%, #eef2f7 0 75%, #cbd3df 0)",
          cursor:
            currentTool === "pan"
              ? isPanning
                ? "grabbing"
                : "grab"
              : currentTool === "eyedropper"
                ? "crosshair"
                : "crosshair",
        }}
      >
        <div ref={canvasRef} className="w-full h-full pointer-events-none">
          {/* Pixi initializes its renderer and GPU textures at a specific size.
              Remount on dimension changes so resized pixel buffers never reach
              a renderer created for the old dimensions. */}
          <Application
            key={`${dimensions.width}x${dimensions.height}`}
            backgroundAlpha={0}
            width={dimensions.width}
            height={dimensions.height}
            antialias={false}
            resolution={1}
          >
            <pixiContainer>
              {[...layers].reverse().map((layer, index) => (
                <CanvasLayer
                  key={layer.id}
                  data={layer.data}
                  opacity={layer.opacity}
                  visible={layer.visible}
                  dimensions={dimensions}
                  zIndex={index}
                />
              ))}

              {/* Preview layer for drawing shapes / moving */}
              {previewLayer}

              <SelectionOverlay dimensions={dimensions} selection={selection} />
            </pixiContainer>
          </Application>
        </div>
      </div>
    </div>
  );
};
