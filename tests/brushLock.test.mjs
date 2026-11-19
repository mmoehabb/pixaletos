import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";

const vite = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "silent",
});
after(() => vite.close());

const { pickLockedDirection, projectOntoLockedDirection } =
  await vite.ssrLoadModule("/src/utils/brushLock.ts");

test("pickLockedDirection returns null when pointer has not moved past minDistance", () => {
  assert.equal(pickLockedDirection({ x: 10, y: 10 }, { x: 10, y: 10 }), null);
  assert.equal(
    pickLockedDirection({ x: 10, y: 10 }, { x: 11, y: 10 }, 6),
    null,
  );
  assert.equal(
    pickLockedDirection({ x: 10, y: 10 }, { x: 13, y: 13 }, 6),
    null,
  );
  assert.deepEqual(pickLockedDirection({ x: 10, y: 10 }, { x: 15, y: 15 }, 6), {
    dx: 1,
    dy: 1,
  });
});

test("pickLockedDirection selects horizontal, vertical, and all 4 diagonal directions", () => {
  const anchor = { x: 20, y: 20 };

  assert.deepEqual(pickLockedDirection(anchor, { x: 30, y: 21 }), {
    dx: 1,
    dy: 0,
  });
  assert.deepEqual(pickLockedDirection(anchor, { x: 10, y: 19 }), {
    dx: -1,
    dy: 0,
  });
  assert.deepEqual(pickLockedDirection(anchor, { x: 21, y: 30 }), {
    dx: 0,
    dy: 1,
  });
  assert.deepEqual(pickLockedDirection(anchor, { x: 19, y: 10 }), {
    dx: 0,
    dy: -1,
  });

  assert.deepEqual(pickLockedDirection(anchor, { x: 30, y: 31 }), {
    dx: 1,
    dy: 1,
  });
  assert.deepEqual(pickLockedDirection(anchor, { x: 30, y: 9 }), {
    dx: 1,
    dy: -1,
  });
  assert.deepEqual(pickLockedDirection(anchor, { x: 10, y: 31 }), {
    dx: -1,
    dy: 1,
  });
  assert.deepEqual(pickLockedDirection(anchor, { x: 10, y: 9 }), {
    dx: -1,
    dy: -1,
  });
});

test("projectOntoLockedDirection constrains horizontal and vertical strokes", () => {
  const anchor = { x: 5, y: 8 };

  assert.deepEqual(
    projectOntoLockedDirection(anchor, { dx: 1, dy: 0 }, { x: 14, y: 22 }),
    { x: 14, y: 8 },
  );
  assert.deepEqual(
    projectOntoLockedDirection(anchor, { dx: -1, dy: 0 }, { x: 2, y: -3 }),
    { x: 2, y: 8 },
  );
  assert.deepEqual(
    projectOntoLockedDirection(anchor, { dx: 0, dy: 1 }, { x: 18, y: 15 }),
    { x: 5, y: 15 },
  );
  assert.deepEqual(
    projectOntoLockedDirection(anchor, { dx: 0, dy: -1 }, { x: -4, y: 1 }),
    { x: 5, y: 1 },
  );
});

test("projectOntoLockedDirection constrains 45-degree diagonal strokes to exact 1:1 steps", () => {
  const anchor = { x: 10, y: 10 };

  // Down-right diagonal with slight off-axis drift
  assert.deepEqual(
    projectOntoLockedDirection(anchor, { dx: 1, dy: 1 }, { x: 16, y: 14 }),
    { x: 15, y: 15 },
  );
  // Up-right diagonal
  assert.deepEqual(
    projectOntoLockedDirection(anchor, { dx: 1, dy: -1 }, { x: 15, y: 5 }),
    { x: 15, y: 5 },
  );
  // Down-left diagonal
  assert.deepEqual(
    projectOntoLockedDirection(anchor, { dx: -1, dy: 1 }, { x: 4, y: 16 }),
    { x: 4, y: 16 },
  );
  // Up-left diagonal, including moving backwards past anchor
  assert.deepEqual(
    projectOntoLockedDirection(anchor, { dx: -1, dy: -1 }, { x: 12, y: 12 }),
    { x: 12, y: 12 },
  );
});
