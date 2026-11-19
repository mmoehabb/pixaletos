export interface Point {
  x: number;
  y: number;
}

export interface LockedDirection {
  /** Unit step on X axis: -1, 0, or 1 */
  dx: -1 | 0 | 1;
  /** Unit step on Y axis: -1, 0, or 1 */
  dy: -1 | 0 | 1;
}

/**
 * Determine the nearest 8-way direction (horizontal, vertical, or 45-degree diagonal)
 * from `anchor` to `current`. Returns null if the distance is below `minDistance`
 * (or if `current` equals `anchor`).
 */
export function pickLockedDirection(
  anchor: Point,
  current: Point,
  minDistance = 0,
): LockedDirection | null {
  const dx = current.x - anchor.x;
  const dy = current.y - anchor.y;
  if (dx === 0 && dy === 0) return null;
  if (minDistance > 0 && Math.hypot(dx, dy) < minDistance) return null;

  const angle = Math.atan2(dy, dx);
  const sector = Math.round(angle / (Math.PI / 4));
  const rad = sector * (Math.PI / 4);

  return {
    dx: (Math.round(Math.cos(rad)) || 0) as -1 | 0 | 1,
    dy: (Math.round(Math.sin(rad)) || 0) as -1 | 0 | 1,
  };
}

/**
 * Project `current` onto the line passing through `anchor` with direction `dir`.
 * Guarantees exact horizontal, vertical, or 1:1 45-degree diagonal pixel coordinates.
 */
export function projectOntoLockedDirection(
  anchor: Point,
  dir: LockedDirection,
  current: Point,
): Point {
  if (dir.dy === 0) {
    return { x: current.x, y: anchor.y };
  }
  if (dir.dx === 0) {
    return { x: anchor.x, y: current.y };
  }
  const dx = current.x - anchor.x;
  const dy = current.y - anchor.y;
  const steps = Math.round((dx * dir.dx + dy * dir.dy) / 2);
  return {
    x: anchor.x + dir.dx * steps,
    y: anchor.y + dir.dy * steps,
  };
}
