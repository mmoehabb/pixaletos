// Run with a Vite dev server at TABLET_TEST_URL (default http://127.0.0.1:5173).
import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage();
  await page.goto(process.env.TABLET_TEST_URL || "http://127.0.0.1:5173");
  await page.waitForSelector(".touch-none");
  const result = await page.evaluate(async () => {
    const { useAppStore: s } = await import("/src/store/index.ts");
    const { useInputSettings: i, usePressureSettings: p } =
      await import("/src/input/settings.ts");
    const tick = () => new Promise((r) => setTimeout(r, 30));
    s.getState().createNewProject(16, 16);
    s.getState().setTool("pencil");
    s.getState().setBrushSize(1);
    s.getState().setZoom(10);
    await tick();
    const canvas = document.querySelector(".touch-none");
    // Synthetic pointer IDs are not registered with the browser's native capture implementation.
    let capture = false;
    canvas.setPointerCapture = () => {
      capture = true;
    };
    canvas.hasPointerCapture = () => capture;
    canvas.releasePointerCapture = () => {
      capture = false;
    };
    const rect = () =>
      document
        .querySelector('[aria-label="Pixel canvas"]')
        .getBoundingClientRect();
    const event = async (
      type,
      x,
      y,
      buttons = 1,
      pressure = 1,
      id = 1,
      pointerType = "pen",
      button = 0,
    ) => {
      const r = rect();
      canvas.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          pointerId: id,
          pointerType,
          buttons,
          button,
          pressure,
          clientX: r.left + (x + 0.5) * s.getState().zoom,
          clientY: r.top + (y + 0.5) * s.getState().zoom,
        }),
      );
      await tick();
    };
    const alpha = (x, y) => s.getState().layers[0].data[(y * 16 + x) * 4 + 3];
    p.getState().save({ size: false, opacity: true, minimum: 0, curve: 1 });
    await tick();
    await event("pointerdown", 2, 2, 1, 0.25);
    await event("pointermove", 6, 2, 1, 1);
    await event("pointerup", 6, 2, 0, 0);
    const pressure = [alpha(2, 2), alpha(4, 2), alpha(6, 2)];
    const history = s.getState().past.length;
    s.getState().undo();
    const undone = alpha(4, 2);
    s.getState().redo();
    i.getState().save({ "pen:2": "pan", "pen:5": "eraser" });
    await event("pointerdown", 3, 4);
    await event("pointermove", 4, 4, 3, 1, 1, "pen", 2);
    await event("pointerup", 4, 4, 0, 0, 2, "touch"); // unrelated pointer cannot terminate pen pan
    const before = { ...s.getState().pan };
    await event("pointermove", 5, 4, 3);
    const panned = s.getState().pan.x !== before.x;
    await event("pointermove", 5, 4, 1, 1, 1, "pen", 2); // release barrel while tip remains down
    await event("pointermove", 7, 4);
    await event("pointerup", 7, 4, 0, 0);
    const resumed = alpha(7, 4) > 0;
    await event("pointerdown", 8, 8);
    window.dispatchEvent(new Event("blur"));
    await tick();
    const blurHistory = s.getState().past.length;
    await event("pointermove", 10, 8);
    const stopped = alpha(10, 8) === 0;
    await event("pointerdown", 9, 9);
    await event("pointercancel", 9, 9, 0);
    const cancelHistory = s.getState().past.length;
    await event("pointerdown", 10, 10);
    canvas.dispatchEvent(
      new PointerEvent("lostpointercapture", { bubbles: true, pointerId: 1 }),
    );
    await tick();
    const lostHistory = s.getState().past.length;
    await event("pointerdown", 12, 12, 1, 0.1, 3, "mouse");
    await event("pointerup", 12, 12, 0, 0, 3, "mouse");
    const mouseAlpha = alpha(12, 12);
    await event("pointerdown", 12, 12, 32, 1, 1, "pen", 5);
    await event("pointerup", 12, 12, 0, 0, 1, "pen", 5);
    const erased = alpha(12, 12);
    s.getState().undo();
    const restored = alpha(12, 12);

    return {
      pressure,
      history,
      undone,
      panned,
      resumed,
      stopped,
      blurHistory,
      cancelHistory,
      lostHistory,
      mouseAlpha,
      erased,
      restored,
      tool: s.getState().currentTool,
    };
  });
  assert.ok(
    result.pressure[0] > 0 &&
      result.pressure[0] < result.pressure[1] &&
      result.pressure[1] < result.pressure[2],
    JSON.stringify(result),
  );
  assert.equal(result.mouseAlpha, 255);
  assert.equal(result.erased, 0);
  assert.equal(result.restored, 255);
  assert.equal(result.undone, 0);
  assert.ok(result.panned);
  assert.ok(result.resumed);
  assert.ok(result.stopped);
  assert.equal(result.tool, "pencil");
  assert.equal(result.cancelHistory, result.blurHistory + 1);
  assert.equal(result.lostHistory, result.cancelHistory + 1);
  await page.evaluate(async () => {
    const { useInputSettings: i } = await import("/src/input/settings.ts");
    i.getState().setOpen(true);
  });
  await page
    .getByRole("dialog", { name: "Tablet and input settings" })
    .waitFor();
  await page.getByRole("button", { name: "Record input", exact: true }).click();
  await page.keyboard.press("Control+Shift+K");
  await page.getByText("key:Ctrl+Shift+KeyK", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.reload();
  await page.waitForSelector(".touch-none");
  assert.equal(
    await page.evaluate(async () => {
      const { useInputSettings: i } = await import("/src/input/settings.ts");
      return i.getState().bindings["key:Ctrl+Shift+KeyK"];
    }),
    "none",
  );
  console.log(
    "Tablet browser interaction and persistence checks passed",
    result,
  );
} finally {
  await browser.close();
}
