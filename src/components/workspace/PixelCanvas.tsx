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
import type { Command, Tool } from "../../types";

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
  zoom,
  currentTool,
  rotatePivot,
}: {
  dimensions: { width: number; height: number };
  selection: Uint8Array | null;
  zoom: number;
  currentTool: Tool;
  rotatePivot: { x: number; y: number } | null;
}) => {
  const draw = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      if (!selection) return;

      let hasSel = false;
      for (let i = 0; i < selection.length; i++) {
        if (selection[i]) {
          hasSel = true;
          break;
        }
      }

      if (!hasSel) {
        g.beginFill(0x000000, 0.6);
        g.drawRect(0, 0, dimensions.width, dimensions.height);
        g.endFill();
        return;
      }

      // Draw dimming for unselected pixels using horizontal spans to optimize
      g.beginFill(0x000000, 0.6);
      for (let y = 0; y < dimensions.height; y++) {
        let spanStartX = -1;
        for (let x = 0; x < dimensions.width; x++) {
          const isSelected = selection[y * dimensions.width + x];
          if (!isSelected) {
            if (spanStartX === -1) {
              spanStartX = x;
            }
          } else {
            if (spanStartX !== -1) {
              g.drawRect(spanStartX, y, x - spanStartX, 1);
              spanStartX = -1;
            }
          }
        }
        if (spanStartX !== -1) {
          g.drawRect(spanStartX, y, dimensions.width - spanStartX, 1);
        }
      }
      g.endFill();

      // Draw borders around selected pixels (1 screen pixel thick)
      g.lineStyle(1 / zoom, 0xffffff, 0.8);

      const isSel = (x: number, y: number) => {
        if (x < 0 || x >= dimensions.width || y < 0 || y >= dimensions.height)
          return false;
        return selection[y * dimensions.width + x] === 1;
      };

      for (let y = 0; y < dimensions.height; y++) {
        for (let x = 0; x < dimensions.width; x++) {
          if (selection[y * dimensions.width + x]) {
            // Check top
            if (!isSel(x, y - 1)) {
              g.moveTo(x, y);
              g.lineTo(x + 1, y);
            }
            // Check bottom
            if (!isSel(x, y + 1)) {
              g.moveTo(x, y + 1);
              g.lineTo(x + 1, y + 1);
            }
            // Check left
            if (!isSel(x - 1, y)) {
              g.moveTo(x, y);
              g.lineTo(x, y + 1);
            }
            // Check right
            if (!isSel(x + 1, y)) {
              g.moveTo(x + 1, y);
              g.lineTo(x + 1, y + 1);
            }
          }
        }
      }

      if (currentTool === "rotate") {
        let minX = dimensions.width,
          minY = dimensions.height,
          maxX = -1,
          maxY = -1;
        for (let py = 0; py < dimensions.height; py++) {
          for (let px = 0; px < dimensions.width; px++) {
            if (selection[py * dimensions.width + px]) {
              if (px < minX) minX = px;
              if (py < minY) minY = py;
              if (px > maxX) maxX = px;
              if (py > maxY) maxY = py;
            }
          }
        }

        if (minX <= maxX && minY <= maxY) {
          // Draw bounding box
          g.beginFill(0x000000, 0); // Transparent fill so it doesn't pick up the next fill
          g.lineStyle(1 / zoom, 0x00ff00, 0.8);
          g.drawRect(minX, minY, maxX - minX + 1, maxY - minY + 1);
          g.endFill();

          // Draw rotation handle
          const handleX = maxX + 0.5; // Offset to edge
          const handleY = minY - 0.5;
          g.beginFill(0xffffff);
          g.lineStyle(1 / zoom, 0x00ff00, 1);
          g.drawCircle(handleX, handleY, 3 / zoom);
          g.endFill();

          // Draw pivot
          const pivot = rotatePivot || {
            x: (minX + maxX) / 2,
            y: (minY + maxY) / 2,
          };
          g.lineStyle(1.5 / zoom, 0xff0000, 1);
          g.moveTo(pivot.x - 3 / zoom, pivot.y);
          g.lineTo(pivot.x + 3 / zoom, pivot.y);
          g.moveTo(pivot.x, pivot.y - 3 / zoom);
          g.lineTo(pivot.x, pivot.y + 3 / zoom);
        }
      }
    },
    [dimensions, selection, zoom, currentTool, rotatePivot],
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
    isPlaying,
  } = useAppStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [activeSelection, setActiveSelection] = useState<Uint8Array | null>(
    null,
  );

  const lastPanPosition = useRef<{ x: number; y: number } | null>(null);
  const startDrawPos = useRef<{ x: number; y: number } | null>(null);
  const lastDrawPos = useRef<{ x: number; y: number } | null>(null);

  const previewDataRef = useRef<Uint8ClampedArray>(
    new Uint8ClampedArray(dimensions.width * dimensions.height * 4),
  );
  const [previewDataVersion, setPreviewDataVersion] = useState(0);

  // Update previewData array size when dimensions change
  const expectedLength = dimensions.width * dimensions.height * 4;
  if (previewDataRef.current.length !== expectedLength) {
    previewDataRef.current = new Uint8ClampedArray(expectedLength);
  }

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

  useEffect(() => {
    // Reset pivot when selection clears or tool changes
    if (!selection) {
      rotatePivot.current = null;
    }
  }, [selection, currentTool]);

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

  const drawSelectionPixel = (mask: Uint8Array, x: number, y: number) => {
    if (x < 0 || x >= dimensions.width || y < 0 || y >= dimensions.height)
      return;
    mask[y * dimensions.width + x] = 1;
  };

  const drawSelectionBrush = (mask: Uint8Array, x: number, y: number) => {
    const start = -Math.floor((brushSize - 1) / 2);
    const end = start + brushSize - 1;
    for (let offsetY = start; offsetY <= end; offsetY++) {
      for (let offsetX = start; offsetX <= end; offsetX++) {
        drawSelectionPixel(mask, x + offsetX, y + offsetY);
      }
    }
  };

  const drawSelectionBrushLine = (
    mask: Uint8Array,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
  ) => {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      drawSelectionBrush(mask, x0, y0);
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

  const drawPixel = (
    data: Uint8ClampedArray,
    x: number,
    y: number,
    color: { r: number; g: number; b: number; a: number },
    trackDiff: boolean = true,
    ignoreSelection: boolean = false,
  ) => {
    if (x < 0 || x >= dimensions.width || y < 0 || y >= dimensions.height)
      return;
    if (
      !ignoreSelection &&
      hasValidSelection &&
      !selection[y * dimensions.width + x]
    )
      return;

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
    ignoreSelection: boolean = false,
  ) => {
    const dx = Math.abs(x1 - x0),
      dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1,
      sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    while (true) {
      drawPixel(data, x0, y0, color, trackDiff, ignoreSelection);
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

  const selectionFloodFill = (
    data: Uint8ClampedArray,
    startX: number,
    startY: number,
    mask: Uint8Array,
  ) => {
    const targetColor = getPixel(data, startX, startY);

    const match = (x: number, y: number) => {
      if (mask[y * dimensions.width + x]) return false;
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
        mask[y * dimensions.width + x] = 1;
        stack.push([x + 1, y]);
        stack.push([x - 1, y]);
        stack.push([x, y + 1]);
        stack.push([x, y - 1]);
      }
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

  // Move / Rotate Tool state
  const movedSelectionData = useRef<Uint8Array | null>(null); // Store original selected pixels before move/rotate
  const originalLayerData = useRef<Uint8ClampedArray | null>(null);

  // Rotate Tool state
  const rotatePivot = useRef<{ x: number; y: number } | null>(null);
  const rotateAngle = useRef<number>(0); // in radians
  const isDraggingRotateHandle = useRef<boolean>(false);
  const isDraggingPivot = useRef<boolean>(false);
  // Lasso Tool State
  const lassoPoints = useRef<{ x: number; y: number }[]>([]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isPlaying) return;
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

    if (
      currentTool === "select" ||
      currentTool === "select_brush" ||
      currentTool === "select_magic_wand" ||
      currentTool === "select_lasso"
    ) {
      setIsDrawing(true);
      startDrawPos.current = { x, y };
      lastDrawPos.current = { x, y };
      e.currentTarget.setPointerCapture(e.pointerId);

      if (currentTool === "select_lasso") {
        lassoPoints.current = [{ x, y }];
      } else if (currentTool === "select_brush") {
        const newSelection = new Uint8Array(
          dimensions.width * dimensions.height,
        );
        drawSelectionBrush(newSelection, x, y);
        setActiveSelection(newSelection);
      } else if (currentTool === "select_magic_wand") {
        if (!activeLayerId) return;
        const layer = layers.find((l) => l.id === activeLayerId);
        if (!layer || !layer.visible) return;

        const newSelection = new Uint8Array(
          dimensions.width * dimensions.height,
        );
        selectionFloodFill(layer.data, x, y, newSelection);
        setActiveSelection(newSelection);
      }
      return;
    }

    if (!activeLayerId) return;
    const layer = layers.find((l) => l.id === activeLayerId);
    if (!layer || !layer.visible) return;

    // A pointer interaction owns exactly one history diff. This also prevents a
    // cancelled interaction from leaking pixels into the following command.
    strokeDiff.current.clear();

    if ((currentTool === "move" || currentTool === "rotate") && selection) {
      setIsDrawing(true);
      startDrawPos.current = { x, y };
      lastDrawPos.current = { x, y };
      e.currentTarget.setPointerCapture(e.pointerId);

      if (currentTool === "rotate") {
        // Calculate bounding box for rotation pivot if not set
        if (!rotatePivot.current) {
          let minX = dimensions.width,
            minY = dimensions.height,
            maxX = -1,
            maxY = -1;
          for (let py = 0; py < dimensions.height; py++) {
            for (let px = 0; px < dimensions.width; px++) {
              if (selection[py * dimensions.width + px]) {
                if (px < minX) minX = px;
                if (py < minY) minY = py;
                if (px > maxX) maxX = px;
                if (py > maxY) maxY = py;
              }
            }
          }
          if (minX <= maxX && minY <= maxY) {
            rotatePivot.current = {
              x: Math.floor((minX + maxX) / 2),
              y: Math.floor((minY + maxY) / 2),
            };
          } else {
            rotatePivot.current = { x: 0, y: 0 };
          }
        }

        rotateAngle.current = 0;
        isDraggingRotateHandle.current = false;
        isDraggingPivot.current = false;

        // Determine if clicking on the pivot handle or the rotate handle
        // These coords should correspond to how they are drawn in SelectionOverlay
        // Pivot handle is at rotatePivot.current
        const pivotDx = x - rotatePivot.current.x;
        const pivotDy = y - rotatePivot.current.y;
        if (Math.sqrt(pivotDx * pivotDx + pivotDy * pivotDy) <= 2) {
          // Allow some slack
          isDraggingPivot.current = true;
        } else {
          // Find bounding box for rotation handle
          let minX = dimensions.width,
            minY = dimensions.height,
            maxX = -1,
            maxY = -1;
          for (let py = 0; py < dimensions.height; py++) {
            for (let px = 0; px < dimensions.width; px++) {
              if (selection[py * dimensions.width + px]) {
                if (px < minX) minX = px;
                if (py < minY) minY = py;
                if (px > maxX) maxX = px;
                if (py > maxY) maxY = py;
              }
            }
          }
          const handleX = maxX;
          const handleY = minY;
          const handleDx = x - handleX;
          const handleDy = y - handleY;
          if (Math.sqrt(handleDx * handleDx + handleDy * handleDy) <= 3) {
            isDraggingRotateHandle.current = true;
          } else {
            // Also allow dragging anywhere else to just move it
            originalLayerData.current = new Uint8ClampedArray(layer.data);
            movedSelectionData.current = new Uint8Array(
              dimensions.width * dimensions.height,
            );
            movedSelectionData.current.set(selection);

            // Revert back to move tool logic if not interacting with handles directly
            isDraggingRotateHandle.current = false;
            // Hacky but works to allow moving while rotate tool is active but not clicking handle
          }
        }
      }

      if (
        currentTool === "move" ||
        isDraggingRotateHandle.current ||
        (currentTool === "rotate" && !isDraggingPivot.current)
      ) {
        // Save original layer state and extract the selection (if not already done above)
        if (!originalLayerData.current) {
          originalLayerData.current = new Uint8ClampedArray(layer.data);
        }
        if (!movedSelectionData.current) {
          movedSelectionData.current = new Uint8Array(
            dimensions.width * dimensions.height,
          );
          movedSelectionData.current.set(selection);
        }

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
      }
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
    if (isPlaying && isPanning) return;
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

    if (
      currentTool === "select" ||
      currentTool === "select_brush" ||
      currentTool === "select_magic_wand" ||
      currentTool === "select_lasso"
    ) {
      if (currentTool === "select") {
        lastDrawPos.current = { x, y };

        if (startDrawPos.current) {
          const startX = Math.min(
            startDrawPos.current.x,
            lastDrawPos.current.x,
          );
          const startY = Math.min(
            startDrawPos.current.y,
            lastDrawPos.current.y,
          );
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

          setActiveSelection(newSelection);
        }
      } else if (currentTool === "select_brush") {
        if (activeSelection) {
          const newSelection = new Uint8Array(activeSelection);
          drawSelectionBrushLine(newSelection, prev.x, prev.y, x, y);
          lastDrawPos.current = { x, y };
          setActiveSelection(newSelection);
        } else {
          const newSelection = new Uint8Array(
            dimensions.width * dimensions.height,
          );
          drawSelectionBrushLine(newSelection, prev.x, prev.y, x, y);
          lastDrawPos.current = { x, y };
          setActiveSelection(newSelection);
        }
      } else if (currentTool === "select_lasso") {
        lassoPoints.current.push({ x, y });
        lastDrawPos.current = { x, y };

        // Draw lasso preview line
        previewDataRef.current.fill(0);
        for (let i = 1; i < lassoPoints.current.length; i++) {
          const p1 = lassoPoints.current[i - 1];
          const p2 = lassoPoints.current[i];
          drawLine(
            previewDataRef.current,
            p1.x,
            p1.y,
            p2.x,
            p2.y,
            { r: 128, g: 128, b: 255, a: 255 },
            false,
            true, // ignore selection when drawing the preview
          );
        }
        setPreviewDataVersion((v) => v + 1);
      }
      return;
    }

    if (!activeLayerId) return;
    const layer = layers.find((l) => l.id === activeLayerId);
    if (!layer || !layer.visible) return;

    if (
      (currentTool === "move" || currentTool === "rotate") &&
      selection &&
      originalLayerData.current &&
      startDrawPos.current
    ) {
      if (currentTool === "rotate") {
        if (isDraggingPivot.current) {
          rotatePivot.current = { x, y };
          // Force a re-render to update the overlay
          setPreviewDataVersion((v) => v + 1);
          return;
        }

        if (isDraggingRotateHandle.current && rotatePivot.current) {
          lastDrawPos.current = { x, y };
          const pivot = rotatePivot.current;
          const startAngle = Math.atan2(
            startDrawPos.current.y - pivot.y,
            startDrawPos.current.x - pivot.x,
          );
          const currentAngle = Math.atan2(y - pivot.y, x - pivot.x);
          rotateAngle.current = currentAngle - startAngle;

          const cosA = Math.cos(rotateAngle.current);
          const sinA = Math.sin(rotateAngle.current);

          previewDataRef.current.fill(0);

          // Use reverse mapping to avoid holes in rotated image
          if (movedSelectionData.current && originalLayerData.current) {
            for (let py = 0; py < dimensions.height; py++) {
              for (let px = 0; px < dimensions.width; px++) {
                const destRelX = px - pivot.x;
                const destRelY = py - pivot.y;

                const srcRelX = destRelX * cosA + destRelY * sinA;
                const srcRelY = -destRelX * sinA + destRelY * cosA;

                const srcX = Math.round(srcRelX + pivot.x);
                const srcY = Math.round(srcRelY + pivot.y);

                if (
                  srcX >= 0 &&
                  srcX < dimensions.width &&
                  srcY >= 0 &&
                  srcY < dimensions.height
                ) {
                  if (
                    movedSelectionData.current[srcY * dimensions.width + srcX]
                  ) {
                    const srcIdx = (srcY * dimensions.width + srcX) * 4;
                    const destIdx = (py * dimensions.width + px) * 4;
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
          }
          setPreviewDataVersion((v) => v + 1);
        }
        return;
      }

      if (
        currentTool === "move" ||
        (currentTool === "rotate" &&
          !isDraggingPivot.current &&
          !isDraggingRotateHandle.current)
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
    if (isPlaying && !isPanning) return;
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
        (currentTool === "select" ||
          currentTool === "select_brush" ||
          currentTool === "select_magic_wand" ||
          currentTool === "select_lasso") &&
        startDrawPos.current &&
        lastDrawPos.current
      ) {
        if (currentTool === "select") {
          const startX = Math.min(
            startDrawPos.current.x,
            lastDrawPos.current.x,
          );
          const startY = Math.min(
            startDrawPos.current.y,
            lastDrawPos.current.y,
          );
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
        } else if (
          currentTool === "select_brush" ||
          currentTool === "select_magic_wand" ||
          currentTool === "select_lasso"
        ) {
          let selectionToApply = activeSelection;

          if (
            currentTool === "select_lasso" &&
            lassoPoints.current.length > 2
          ) {
            const newSelection = new Uint8Array(
              dimensions.width * dimensions.height,
            );

            // Bounding box optimization
            let minX = dimensions.width,
              minY = dimensions.height,
              maxX = 0,
              maxY = 0;
            for (const p of lassoPoints.current) {
              if (p.x < minX) minX = p.x;
              if (p.y < minY) minY = p.y;
              if (p.x > maxX) maxX = p.x;
              if (p.y > maxY) maxY = p.y;
            }
            minX = Math.max(0, minX);
            minY = Math.max(0, minY);
            maxX = Math.min(dimensions.width - 1, maxX);
            maxY = Math.min(dimensions.height - 1, maxY);

            // Point-in-polygon algorithm
            for (let y = minY; y <= maxY; y++) {
              for (let x = minX; x <= maxX; x++) {
                let inside = false;
                for (
                  let i = 0, j = lassoPoints.current.length - 1;
                  i < lassoPoints.current.length;
                  j = i++
                ) {
                  const xi = lassoPoints.current[i].x,
                    yi = lassoPoints.current[i].y;
                  const xj = lassoPoints.current[j].x,
                    yj = lassoPoints.current[j].y;

                  const intersect =
                    yi > y !== yj > y &&
                    x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
                  if (intersect) inside = !inside;
                }
                if (inside) {
                  newSelection[y * dimensions.width + x] = 1;
                }
              }
            }
            selectionToApply = newSelection;
            previewDataRef.current.fill(0);
            setPreviewDataVersion((v) => v + 1);
            lassoPoints.current = [];
          } else if (currentTool === "select_lasso") {
            previewDataRef.current.fill(0);
            setPreviewDataVersion((v) => v + 1);
            lassoPoints.current = [];
            selectionToApply = null;
          }

          if (selectionToApply) {
            let finalSelection = new Uint8Array(selectionToApply);
            if (e.shiftKey && selection) {
              for (let i = 0; i < finalSelection.length; i++)
                finalSelection[i] = finalSelection[i] || selection[i];
            } else if (e.altKey && selection) {
              for (let i = 0; i < finalSelection.length; i++)
                finalSelection[i] = selection[i] && !finalSelection[i] ? 1 : 0;
            }
            setSelection(finalSelection);
          }
        }

        setActiveSelection(null);
        return;
      }

      if (!activeLayerId) return;

      if (
        (currentTool === "move" || currentTool === "rotate") &&
        selection &&
        startDrawPos.current &&
        lastDrawPos.current &&
        originalLayerData.current
      ) {
        const layer = layers.find((l) => l.id === activeLayerId);

        if (currentTool === "rotate") {
          isDraggingPivot.current = false;
          // Note: if user dragged but not via rotate handle or pivot, it will behave as a move
          // and fall through to the move tool block below, except we need to let it.
          // Let's add a check if they were dragging the handle.
          if (isDraggingRotateHandle.current) {
            isDraggingRotateHandle.current = false;
            if (layer) {
              if (rotateAngle.current === 0) {
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

              // Rotate the selection bits
              const newSelection = new Uint8Array(
                dimensions.width * dimensions.height,
              );
              const cosA = Math.cos(rotateAngle.current);
              const sinA = Math.sin(rotateAngle.current);
              const pivot = rotatePivot.current;

              if (pivot) {
                for (let py = 0; py < dimensions.height; py++) {
                  for (let px = 0; px < dimensions.width; px++) {
                    // dest is (px, py)
                    const destRelX = px - pivot.x;
                    const destRelY = py - pivot.y;

                    const srcRelX = destRelX * cosA + destRelY * sinA;
                    const srcRelY = -destRelX * sinA + destRelY * cosA;

                    const srcX = Math.round(srcRelX + pivot.x);
                    const srcY = Math.round(srcRelY + pivot.y);

                    if (
                      srcX >= 0 &&
                      srcX < dimensions.width &&
                      srcY >= 0 &&
                      srcY < dimensions.height
                    ) {
                      if (
                        movedSelectionData.current &&
                        movedSelectionData.current[
                          srcY * dimensions.width + srcX
                        ]
                      ) {
                        newSelection[py * dimensions.width + px] = 1;
                      }
                    }
                  }
                }
                setSelection(newSelection);
              }

              updateLayerData(activeLayerId, new Uint8ClampedArray(layer.data));
              const diffEntries = Array.from(strokeDiff.current.entries());
              commitDrawing(activeLayerId, diffEntries);
              strokeDiff.current.clear();
              originalLayerData.current = null;
              movedSelectionData.current = null;

              previewDataRef.current.fill(0);
              setPreviewDataVersion((v) => v + 1);
            }
            return;
          }
        }

        const dx = lastDrawPos.current.x - startDrawPos.current.x;
        const dy = lastDrawPos.current.y - startDrawPos.current.y;

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
      className="flex items-center justify-center w-full h-full bg-neutral-900 rounded-md overflow-hidden p-1 sm:p-4 relative select-none touch-none"
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

              <SelectionOverlay
                dimensions={dimensions}
                zoom={zoom}
                selection={activeSelection || selection}
                currentTool={currentTool}
                rotatePivot={rotatePivot.current}
              />
            </pixiContainer>
          </Application>
        </div>
      </div>

      {isPlaying && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur pointer-events-none">
          Playing Animation...
        </div>
      )}
    </div>
  );
};
