export const normalizePixelArt = (
  sourceData: Uint8ClampedArray,
  sourceDimensions: { width: number; height: number },
  targetDimensions: { width: number; height: number },
  palette?: string[],
): Uint8ClampedArray => {
  const result = new Uint8ClampedArray(
    targetDimensions.width * targetDimensions.height * 4,
  );

  // 1. Resolution normalization (nearest-neighbor scaling)
  for (let y = 0; y < targetDimensions.height; y++) {
    for (let x = 0; x < targetDimensions.width; x++) {
      const srcX = Math.floor(
        (x / targetDimensions.width) * sourceDimensions.width,
      );
      const srcY = Math.floor(
        (y / targetDimensions.height) * sourceDimensions.height,
      );

      const srcIdx = (srcY * sourceDimensions.width + srcX) * 4;
      const targetIdx = (y * targetDimensions.width + x) * 4;

      result[targetIdx] = sourceData[srcIdx];
      result[targetIdx + 1] = sourceData[srcIdx + 1];
      result[targetIdx + 2] = sourceData[srcIdx + 2];
      result[targetIdx + 3] = sourceData[srcIdx + 3];
    }
  }

  // 2. Palette normalization (map colors to nearest palette color if palette is provided and non-empty)
  if (palette && palette.length > 0) {
    const parsedPalette = palette.map((hex) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return { r, g, b };
    });

    for (let i = 0; i < result.length; i += 4) {
      if (result[i + 3] === 0) continue; // Skip transparent pixels

      let minDistance = Infinity;
      let closestColor = parsedPalette[0];

      for (const color of parsedPalette) {
        // Simple Euclidean distance in RGB space
        const dr = result[i] - color.r;
        const dg = result[i + 1] - color.g;
        const db = result[i + 2] - color.b;
        const distance = dr * dr + dg * dg + db * db;

        if (distance < minDistance) {
          minDistance = distance;
          closestColor = color;
        }
      }

      result[i] = closestColor.r;
      result[i + 1] = closestColor.g;
      result[i + 2] = closestColor.b;
    }
  }

  // 3. Pixel cleanup (ensure pixel-aligned format if needed, already handled by Uint8ClampedArray bounds)

  return result;
};
