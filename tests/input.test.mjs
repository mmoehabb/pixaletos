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
  penButton,
  pressureFactor,
  defaultPressure,
  keyInput,
  useInputSettings,
  runAction,
} = await vite.ssrLoadModule("/src/input/settings.ts");
const { useAppStore } = await vite.ssrLoadModule("/src/store/index.ts");
test("pen chords prioritize eraser and side button over tip contact", () => {
  assert.equal(penButton(3), 2);
  assert.equal(penButton(33), 5);
  assert.equal(penButton(1), 0);
  assert.equal(penButton(0), -1);
});
test("pressure respects minimum, endpoints, curve and invalid samples", () => {
  assert.equal(pressureFactor(0, defaultPressure), 0.1);
  assert.equal(pressureFactor(1, defaultPressure), 1);
  assert.equal(pressureFactor(-1, defaultPressure), 0.1);
  assert.equal(pressureFactor(NaN, defaultPressure), 1);
  assert.ok(
    pressureFactor(0.5, { ...defaultPressure, curve: 2 }) <
      pressureFactor(0.5, defaultPressure),
  );
});
test("shortcut identity distinguishes modifiers", () => {
  assert.equal(keyInput({ code: "KeyZ", ctrlKey: true }), "key:Ctrl+KeyZ");
  assert.equal(
    keyInput({ code: "KeyZ", metaKey: true, shiftKey: true }),
    "key:Meta+Shift+KeyZ",
  );
});
test("preferences and brush actions do not enter document history", () => {
  const before = useAppStore.getState().past.length;
  useInputSettings.getState().save({ "pen:2": "eyedropper" });
  assert.equal(useInputSettings.getState().bindings["pen:2"], "eyedropper");
  useAppStore.getState().setBrushSize(1);
  runAction("brushDecrease");
  assert.equal(useAppStore.getState().brushSize, 1);
  runAction("brushIncrease");
  assert.equal(useAppStore.getState().brushSize, 2);
  assert.equal(useAppStore.getState().past.length, before);
});
