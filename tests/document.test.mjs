import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
const vite = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "silent",
});
after(() => vite.close());
const { useAppStore } = await vite.ssrLoadModule("/src/store/index.ts");
const {
  flipImage,
  getSelectionBounds,
  computeScaledBounds,
  scaleSelectionRegion,
} = await vite.ssrLoadModule("/src/utils/transforms.ts");

test("new projects have a frame with a stable active layer", () => {
  useAppStore.getState().createNewProject(4, 4);
  const s = useAppStore.getState();
  assert.equal(s.keyframes.length, 1);
  assert.equal(s.keyframes[0].layers[0].id, s.activeLayerId);
});

test("adding and switching frames preserves edited pixels and supports undo and redo", () => {
  useAppStore.getState().createNewProject(4, 4);
  let s = useAppStore.getState();
  const first = s.activeKeyframeId;
  const pixels = new Uint8ClampedArray(s.layers[0].data);
  pixels[3] = 255;
  s.updateLayerData(s.activeLayerId, pixels);
  useAppStore.getState().addKeyframe();
  useAppStore.getState().selectKeyframe(first);
  assert.equal(useAppStore.getState().layers[0].data[3], 255);
  useAppStore.getState().undo();
  assert.equal(useAppStore.getState().keyframes.length, 1);
  useAppStore.getState().redo();
  assert.equal(useAppStore.getState().keyframes.length, 2);
});

test("layer actions undo without losing existing pixel data", () => {
  useAppStore.getState().createNewProject(4, 4);
  const before = useAppStore.getState().activeLayerId;
  useAppStore.getState().addLayer();
  assert.equal(useAppStore.getState().layers.length, 2);
  useAppStore.getState().undo();
  assert.equal(useAppStore.getState().layers.length, 1);
  assert.equal(useAppStore.getState().activeLayerId, before);
  useAppStore.getState().redo();
  assert.equal(useAppStore.getState().layers.length, 2);
});

test("horizontal flip preserves layer identity and moves pixels", () => {
  const layer = {
    id: "layer",
    name: "test",
    visible: true,
    opacity: 1,
    data: new Uint8ClampedArray([1, 2, 3, 255, 0, 0, 0, 0]),
  };
  const [flipped] = flipImage([layer], { width: 2, height: 1 }, true);
  assert.equal(flipped.id, layer.id);
  assert.deepEqual([...flipped.data], [0, 0, 0, 0, 1, 2, 3, 255]);
});

test("blank frames start transparent and can be reordered with undo", () => {
  useAppStore.getState().createNewProject(2, 2);
  let s = useAppStore.getState();
  const original = s.activeKeyframeId;
  const pixels = new Uint8ClampedArray(s.layers[0].data);
  pixels[3] = 255;
  s.updateLayerData(s.activeLayerId, pixels);
  s.addKeyframe(true);
  s = useAppStore.getState();
  assert.equal(s.layers[0].data[3], 0);
  const blank = s.activeKeyframeId;
  s.moveKeyframe(blank, 0);
  assert.equal(useAppStore.getState().keyframes[0].id, blank);
  useAppStore.getState().undo();
  assert.equal(useAppStore.getState().keyframes[0].id, original);
});

test("pixel history targets the frame where the edit was made", () => {
  useAppStore.getState().createNewProject(2, 2);
  const first = useAppStore.getState().activeKeyframeId;
  useAppStore.getState().addKeyframe(true);
  const second = useAppStore.getState().activeKeyframeId;
  const id = useAppStore.getState().activeLayerId;
  const before = new Uint8ClampedArray(16);
  const after = new Uint8ClampedArray(16);
  after[3] = 255;
  useAppStore.getState().executeCommand({
    name: "Tool: pencil",
    redo: () => useAppStore.getState().updateLayerData(id, after),
    undo: () => useAppStore.getState().updateLayerData(id, before),
  });
  useAppStore.getState().selectKeyframe(first);
  useAppStore.getState().undo();
  assert.equal(useAppStore.getState().activeKeyframeId, second);
  assert.equal(useAppStore.getState().layers[0].data[3], 0);
  useAppStore.getState().redo();
  assert.equal(useAppStore.getState().layers[0].data[3], 255);
  useAppStore.getState().selectKeyframe(first);
  assert.equal(useAppStore.getState().layers[0].data[3], 0);
});

test("paste redo restores the original pixels after a subsequent stroke", async () => {
  const { copySelection, pasteSelection } = await vite.ssrLoadModule(
    "/src/utils/clipboard.ts",
  );
  useAppStore.getState().createNewProject(2, 2);
  copySelection();
  pasteSelection();
  const id = useAppStore.getState().activeLayerId;
  useAppStore.getState().layers[0].data[7] = 255;
  useAppStore.getState().executeCommand({
    name: "Tool: pencil",
    undo: () => {
      const data = new Uint8ClampedArray(useAppStore.getState().layers[0].data);
      data[7] = 0;
      useAppStore.getState().updateLayerData(id, data);
    },
    redo: () => {},
  });
  useAppStore.getState().undo();
  useAppStore.getState().undo();
  useAppStore.getState().redo();
  assert.equal(useAppStore.getState().layers[0].data[7], 0);
});

test("AI edit undo selects its originating frame", () => {
  useAppStore.getState().createNewProject(2, 2);
  const first = useAppStore.getState().activeKeyframeId;
  useAppStore.getState().addKeyframe(true);
  const second = useAppStore.getState().activeKeyframeId;
  const id = useAppStore.getState().activeLayerId;
  const data = new Uint8ClampedArray(16);
  data[3] = 255;
  useAppStore.getState().updateLayerData(id, data);
  useAppStore.getState().selectKeyframe(first);
  useAppStore.getState().executeCommand({
    name: "AI Edit",
    undo: () =>
      useAppStore.getState().updateLayerData(id, new Uint8ClampedArray(16)),
    redo: () => {},
  });
  useAppStore.getState().selectKeyframe(second);
  useAppStore.getState().undo();
  assert.equal(useAppStore.getState().activeKeyframeId, first);
  useAppStore.getState().selectKeyframe(second);
  assert.equal(useAppStore.getState().layers[0].data[3], 255);
});

test("cut history remains immutable across strokes and repeated undo and redo", async () => {
  const { copySelection } = await vite.ssrLoadModule("/src/utils/clipboard.ts");
  useAppStore.getState().createNewProject(2, 2);
  const id = useAppStore.getState().activeLayerId;
  const initial = new Uint8ClampedArray(16);
  initial[3] = 255;
  useAppStore.getState().updateLayerData(id, initial);
  const mask = new Uint8Array(4);
  mask[0] = 1;
  useAppStore.getState().setSelection(mask);
  copySelection(true);
  useAppStore.getState().layers[0].data[7] = 255;
  useAppStore.getState().executeCommand({
    name: "Tool: pencil",
    redo: () => {},
    undo: () => {
      const data = new Uint8ClampedArray(useAppStore.getState().layers[0].data);
      data[7] = 0;
      useAppStore.getState().updateLayerData(id, data);
    },
  });
  useAppStore.getState().undo();
  useAppStore.getState().undo();
  assert.equal(useAppStore.getState().layers[0].data[3], 255);
  useAppStore.getState().redo();
  assert.equal(useAppStore.getState().layers[0].data[3], 0);
  assert.equal(useAppStore.getState().layers[0].data[7], 0);
  useAppStore.getState().undo();
  useAppStore.getState().layers[0].data[11] = 255;
  useAppStore.getState().redo();
  useAppStore.getState().undo();
  assert.equal(useAppStore.getState().layers[0].data[11], 0);
});

test("scaleSelectionRegion scales selected pixels and mask up and down", () => {
  const width = 4;
  const height = 4;
  const srcData = new Uint8ClampedArray(width * height * 4);
  // Put red at (0,0) and blue at (1,1)
  srcData[0] = 255;
  srcData[3] = 255;
  const p11 = (1 * width + 1) * 4;
  srcData[p11 + 2] = 255;
  srcData[p11 + 3] = 255;

  // L-shaped 2x2 selection: (0,0), (0,1), (1,1) — (1,0) is unselected
  const srcMask = new Uint8Array(width * height);
  srcMask[0] = 1;
  srcMask[width] = 1;
  srcMask[width + 1] = 1;

  const srcBounds = getSelectionBounds(srcMask, width, height);
  assert.deepEqual(srcBounds, { minX: 0, minY: 0, maxX: 1, maxY: 1 });

  // Scale 2x2 -> 4x4 (2x scale up)
  const upData = new Uint8ClampedArray(width * height * 4);
  const upMask = new Uint8Array(width * height);
  scaleSelectionRegion(
    srcData,
    srcMask,
    width,
    height,
    srcBounds,
    { minX: 0, minY: 0, maxX: 3, maxY: 3 },
    upData,
    upMask,
  );
  // Top-left 2x2 should be red and selected
  assert.equal(upData[0], 255);
  assert.equal(upData[(1 * width + 1) * 4], 255);
  assert.equal(upMask[0], 1);
  // Top-right 2x2 was unselected in source, so should remain unselected & transparent
  assert.equal(upMask[2], 0);
  assert.equal(upData[2 * 4 + 3], 0);
  // Bottom-right 2x2 should be blue and selected
  assert.equal(upData[(3 * width + 3) * 4 + 2], 255);
  assert.equal(upMask[3 * width + 3], 1);

  // Scale 4x4 -> 2x2 (0.5x scale down)
  const downData = new Uint8ClampedArray(width * height * 4);
  const downMask = new Uint8Array(width * height);
  scaleSelectionRegion(
    upData,
    upMask,
    width,
    height,
    { minX: 0, minY: 0, maxX: 3, maxY: 3 },
    { minX: 1, minY: 1, maxX: 2, maxY: 2 },
    downData,
    downMask,
  );
  assert.equal(downMask[1 * width + 1], 1);
  assert.equal(downData[(1 * width + 1) * 4], 255);
  assert.equal(downMask[1 * width + 2], 0);
  assert.equal(downMask[2 * width + 2], 1);
  assert.equal(downData[(2 * width + 2) * 4 + 2], 255);
});

test("computeScaledBounds clamps to 1x1 minimum and preserves aspect ratio with Shift", () => {
  const src = { minX: 2, minY: 2, maxX: 5, maxY: 3 }; // 4x2
  const clamped = computeScaledBounds("se", src, 0, 0, false);
  assert.deepEqual(clamped, { minX: 2, minY: 2, maxX: 2, maxY: 2 });

  const aspect = computeScaledBounds("se", src, 9, 3, true); // width -> 8 (2x), height -> 4 (2x)
  assert.deepEqual(aspect, { minX: 2, minY: 2, maxX: 9, maxY: 5 });
});
