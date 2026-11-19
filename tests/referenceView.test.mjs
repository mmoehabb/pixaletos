import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";

const vite = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "silent",
});
after(() => vite.close());

const {
  useReferenceViewStore,
  clampOverlayRect,
  computeCameraViewportRect,
  REFERENCE_VIEW_MIN_WIDTH,
  REFERENCE_VIEW_MIN_HEIGHT,
  REFERENCE_VIEW_HEADER_HEIGHT,
} = await vite.ssrLoadModule("/src/store/referenceView.ts");

test("referenceView store toggles open, minimize, mode, and opacity clamping", () => {
  const store = useReferenceViewStore.getState();
  store.setOpen(true);
  assert.equal(useReferenceViewStore.getState().isOpen, true);

  store.toggleMinimized();
  assert.equal(useReferenceViewStore.getState().isMinimized, true);
  store.toggleMinimized();
  assert.equal(useReferenceViewStore.getState().isMinimized, false);

  store.setMode("canvas");
  assert.equal(useReferenceViewStore.getState().mode, "canvas");
  store.setMode("image");
  assert.equal(useReferenceViewStore.getState().mode, "image");

  store.setOpacity(0.1);
  assert.equal(useReferenceViewStore.getState().opacity, 0.3);
  store.setOpacity(1.5);
  assert.equal(useReferenceViewStore.getState().opacity, 1);

  store.setOpen(false);
  assert.equal(useReferenceViewStore.getState().isOpen, false);
});

test("clampOverlayRect enforces minimum size and workspace bounds", () => {
  const bounds = { width: 800, height: 600 };

  const tooSmall = clampOverlayRect(
    { x: -50, y: -20 },
    { width: 50, height: 50 },
    bounds,
    false,
  );
  assert.equal(tooSmall.position.x, 0);
  assert.equal(tooSmall.position.y, 0);
  assert.equal(tooSmall.size.width, REFERENCE_VIEW_MIN_WIDTH);
  assert.equal(tooSmall.size.height, REFERENCE_VIEW_MIN_HEIGHT);

  const outOfBounds = clampOverlayRect(
    { x: 900, y: 700 },
    { width: 300, height: 250 },
    bounds,
    false,
  );
  assert.equal(outOfBounds.position.x, 500);
  assert.equal(outOfBounds.position.y, 350);

  const minimizedBounds = clampOverlayRect(
    { x: 900, y: 700 },
    { width: 300, height: 250 },
    bounds,
    true,
  );
  assert.equal(minimizedBounds.position.x, 500);
  assert.equal(minimizedBounds.position.y, 600 - REFERENCE_VIEW_HEADER_HEIGHT);
});

test("computeCameraViewportRect returns visible canvas region when zoomed in", () => {
  const rect = computeCameraViewportRect(
    { x: 0, y: 0 },
    4,
    { width: 64, height: 64 },
    { width: 128, height: 128 },
  );
  assert.ok(rect);
  // At pan=(0,0), zoom=4, 64x64 canvas:
  // canvasLeft = 0 + 64*(1-4)/2 = -96
  // x = 96 / 4 = 24, width = 128 / 4 = 32
  assert.equal(rect.x, 24);
  assert.equal(rect.y, 24);
  assert.equal(rect.width, 32);
  assert.equal(rect.height, 32);
});
