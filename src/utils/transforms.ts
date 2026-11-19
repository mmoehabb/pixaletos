import type { Layer, ProjectState } from "../types";

type Dimensions = ProjectState["dimensions"];

function createData(width: number, height: number) {
  return new Uint8ClampedArray(width * height * 4);
}

function copyPixel(
  source: Uint8ClampedArray,
  sourceIndex: number,
  target: Uint8ClampedArray,
  targetIndex: number,
) {
  target[targetIndex] = source[sourceIndex];
  target[targetIndex + 1] = source[sourceIndex + 1];
  target[targetIndex + 2] = source[sourceIndex + 2];
  target[targetIndex + 3] = source[sourceIndex + 3];
}

function mapLayers(
  layers: Layer[],
  transform: (data: Uint8ClampedArray) => Uint8ClampedArray,
): Layer[] {
  return layers.map((layer) => ({ ...layer, data: transform(layer.data) }));
}

export function resizeCanvas(
  layers: Layer[],
  oldSize: Dimensions,
  width: number,
  height: number,
  offsetX = 0,
  offsetY = 0,
) {
  return mapLayers(layers, (source) => {
    const target = createData(width, height);
    for (let y = 0; y < oldSize.height; y++)
      for (let x = 0; x < oldSize.width; x++) {
        const destinationX = x + offsetX,
          destinationY = y + offsetY;
        if (
          destinationX >= 0 &&
          destinationX < width &&
          destinationY >= 0 &&
          destinationY < height
        )
          copyPixel(
            source,
            (y * oldSize.width + x) * 4,
            target,
            (destinationY * width + destinationX) * 4,
          );
      }
    return target;
  });
}

export function scaleImage(
  layers: Layer[],
  oldSize: Dimensions,
  width: number,
  height: number,
) {
  return mapLayers(layers, (source) => {
    const target = createData(width, height);
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const sourceX = Math.min(
          oldSize.width - 1,
          Math.floor((x * oldSize.width) / width),
        );
        const sourceY = Math.min(
          oldSize.height - 1,
          Math.floor((y * oldSize.height) / height),
        );
        copyPixel(
          source,
          (sourceY * oldSize.width + sourceX) * 4,
          target,
          (y * width + x) * 4,
        );
      }
    return target;
  });
}

export function flipImage(
  layers: Layer[],
  size: Dimensions,
  horizontal: boolean,
) {
  return mapLayers(layers, (source) => {
    const target = createData(size.width, size.height);
    for (let y = 0; y < size.height; y++)
      for (let x = 0; x < size.width; x++) {
        const sourceX = horizontal ? size.width - 1 - x : x;
        const sourceY = horizontal ? y : size.height - 1 - y;
        copyPixel(
          source,
          (sourceY * size.width + sourceX) * 4,
          target,
          (y * size.width + x) * 4,
        );
      }
    return target;
  });
}

export function rotateImage(
  layers: Layer[],
  size: Dimensions,
  clockwise: boolean,
) {
  const resultSize = { width: size.height, height: size.width };
  return {
    dimensions: resultSize,
    layers: mapLayers(layers, (source) => {
      const target = createData(resultSize.width, resultSize.height);
      for (let y = 0; y < size.height; y++)
        for (let x = 0; x < size.width; x++) {
          const destinationX = clockwise ? size.height - 1 - y : y;
          const destinationY = clockwise ? x : size.width - 1 - x;
          copyPixel(
            source,
            (y * size.width + x) * 4,
            target,
            (destinationY * resultSize.width + destinationX) * 4,
          );
        }
      return target;
    }),
  };
}

export interface SelectionBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export type ScaleHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

/** Returns the tight pixel bounding box of a selection mask, or null if empty. */
export function getSelectionBounds(
  selection: Uint8Array,
  width: number,
  height: number,
): SelectionBounds | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let py = 0; py < height; py++) {
    const rowOffset = py * width;
    for (let px = 0; px < width; px++) {
      if (selection[rowOffset + px]) {
        if (px < minX) minX = px;
        if (py < minY) minY = py;
        if (px > maxX) maxX = px;
        if (py > maxY) maxY = py;
      }
    }
  }

  return minX <= maxX && minY <= maxY ? { minX, minY, maxX, maxY } : null;
}

/** Returns the 8 resize handle coordinates in canvas space for a bounding box. */
export function getScaleHandlePositions(
  bounds: SelectionBounds,
): Record<ScaleHandle, { x: number; y: number }> {
  const left = bounds.minX;
  const right = bounds.maxX + 1;
  const top = bounds.minY;
  const bottom = bounds.maxY + 1;
  const midX = (left + right) / 2;
  const midY = (top + bottom) / 2;

  return {
    nw: { x: left, y: top },
    n: { x: midX, y: top },
    ne: { x: right, y: top },
    e: { x: right, y: midY },
    se: { x: right, y: bottom },
    s: { x: midX, y: bottom },
    sw: { x: left, y: bottom },
    w: { x: left, y: midY },
  };
}

/** Computes the target bounding box when dragging a scale handle to (x, y). */
export function computeScaledBounds(
  handle: ScaleHandle,
  srcBounds: SelectionBounds,
  x: number,
  y: number,
  keepAspect: boolean,
): SelectionBounds {
  let { minX, minY, maxX, maxY } = srcBounds;

  if (handle === "nw" || handle === "w" || handle === "sw") {
    minX = Math.min(x, srcBounds.maxX);
  }
  if (handle === "ne" || handle === "e" || handle === "se") {
    maxX = Math.max(x, srcBounds.minX);
  }
  if (handle === "nw" || handle === "n" || handle === "ne") {
    minY = Math.min(y, srcBounds.maxY);
  }
  if (handle === "sw" || handle === "s" || handle === "se") {
    maxY = Math.max(y, srcBounds.minY);
  }

  const isCorner =
    handle === "nw" || handle === "ne" || handle === "se" || handle === "sw";
  if (keepAspect && isCorner) {
    const srcW = srcBounds.maxX - srcBounds.minX + 1;
    const srcH = srcBounds.maxY - srcBounds.minY + 1;
    const rawW = maxX - minX + 1;
    const rawH = maxY - minY + 1;

    let dstW: number;
    let dstH: number;
    if (rawW / srcW >= rawH / srcH) {
      dstW = rawW;
      dstH = Math.max(1, Math.round((rawW * srcH) / srcW));
    } else {
      dstH = rawH;
      dstW = Math.max(1, Math.round((rawH * srcW) / srcH));
    }

    if (handle === "se") {
      maxX = minX + dstW - 1;
      maxY = minY + dstH - 1;
    } else if (handle === "nw") {
      minX = maxX - dstW + 1;
      minY = maxY - dstH + 1;
    } else if (handle === "ne") {
      maxX = minX + dstW - 1;
      minY = maxY - dstH + 1;
    } else {
      minX = maxX - dstW + 1;
      maxY = minY + dstH - 1;
    }
  }

  return { minX, minY, maxX, maxY };
}

/**
 * Nearest-neighbor scales the selected pixels from `srcBounds` into `dstBounds`,
 * writing RGBA pixels into `targetData` and optionally updating `targetSelection`.
 */
export function scaleSelectionRegion(
  sourceData: Uint8ClampedArray,
  sourceSelection: Uint8Array,
  width: number,
  height: number,
  srcBounds: SelectionBounds,
  dstBounds: SelectionBounds,
  targetData: Uint8ClampedArray,
  targetSelection?: Uint8Array,
): void {
  const srcW = srcBounds.maxX - srcBounds.minX + 1;
  const srcH = srcBounds.maxY - srcBounds.minY + 1;
  const dstW = dstBounds.maxX - dstBounds.minX + 1;
  const dstH = dstBounds.maxY - dstBounds.minY + 1;

  const startY = Math.max(0, dstBounds.minY);
  const endY = Math.min(height - 1, dstBounds.maxY);
  const startX = Math.max(0, dstBounds.minX);
  const endX = Math.min(width - 1, dstBounds.maxX);

  for (let py = startY; py <= endY; py++) {
    const v = (py - dstBounds.minY + 0.5) / dstH;
    const srcY =
      srcBounds.minY + Math.min(srcH - 1, Math.max(0, Math.floor(v * srcH)));

    for (let px = startX; px <= endX; px++) {
      const u = (px - dstBounds.minX + 0.5) / dstW;
      const srcX =
        srcBounds.minX + Math.min(srcW - 1, Math.max(0, Math.floor(u * srcW)));

      const srcMaskIdx = srcY * width + srcX;
      if (!sourceSelection[srcMaskIdx]) continue;

      const dstMaskIdx = py * width + px;
      if (targetSelection) {
        targetSelection[dstMaskIdx] = 1;
      }
      copyPixel(sourceData, srcMaskIdx * 4, targetData, dstMaskIdx * 4);
    }
  }
}
