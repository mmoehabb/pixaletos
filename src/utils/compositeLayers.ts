import type { Layer } from "../types";

/**
 * Composites visible layers bottom-to-top onto `targetCtx` using a reusable
 * `scratchCanvas` to avoid per-frame allocations during live drawing.
 */
export function compositeLayersToCanvas(
  targetCtx: CanvasRenderingContext2D,
  scratchCanvas: HTMLCanvasElement,
  layers: Layer[],
  width: number,
  height: number,
) {
  if (width <= 0 || height <= 0) return;

  if (scratchCanvas.width !== width || scratchCanvas.height !== height) {
    scratchCanvas.width = width;
    scratchCanvas.height = height;
  }

  const scratchCtx = scratchCanvas.getContext("2d");
  if (!scratchCtx) return;

  targetCtx.clearRect(0, 0, width, height);

  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i];
    if (!layer.visible || layer.opacity <= 0) continue;
    if (layer.data.length !== width * height * 4) continue;

    const imageData = new ImageData(
      new Uint8ClampedArray(layer.data),
      width,
      height,
    );
    scratchCtx.putImageData(imageData, 0, 0);
    targetCtx.globalAlpha = layer.opacity;
    targetCtx.drawImage(scratchCanvas, 0, 0);
  }

  targetCtx.globalAlpha = 1;
}
