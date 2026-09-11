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
