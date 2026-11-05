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
const { flipImage } = await vite.ssrLoadModule("/src/utils/transforms.ts");

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
