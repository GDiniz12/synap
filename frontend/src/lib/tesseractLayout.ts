import type { GraphLink } from './graphLinks';

export type Point3 = [number, number, number];
export interface CubeSize { id: string; size: number }
export type CubePositions = Record<string, Point3>;

export function cubeSize(textLength: number): number {
  return Math.min(7.5, 2.5 + Math.cbrt(Math.max(0, textLength)) * 0.25);
}

export function readPositions(raw: string | null): CubePositions {
  const result: CubePositions = Object.create(null);
  try {
    const data: unknown = JSON.parse(raw || '{}');
    if (!data || typeof data !== 'object' || Array.isArray(data)) return result;
    for (const [id, value] of Object.entries(data)) {
      if (Array.isArray(value) && value.length === 3 && value.every(v => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) < 100000)) {
        result[id] = [value[0], value[1], value[2]];
      }
    }
  } catch { /* Unavailable or outdated storage must not prevent navigation. */ }
  return result;
}

/** Segment/box intersection, including a margin around the cube for moving pulses. */
export function connectionCrossesCube(start: Point3, end: Point3, center: Point3, size: number): boolean {
  const halfExtent = size / 2 + 2;
  let entry = 0;
  let exit = 1;
  for (let axis = 0; axis < 3; axis++) {
    const delta = end[axis] - start[axis];
    const min = center[axis] - halfExtent;
    const max = center[axis] + halfExtent;
    if (Math.abs(delta) < 1e-9) {
      if (start[axis] < min || start[axis] > max) return false;
      continue;
    }
    const a = (min - start[axis]) / delta;
    const b = (max - start[axis]) / delta;
    entry = Math.max(entry, Math.min(a, b));
    exit = Math.min(exit, Math.max(a, b));
    if (entry > exit) return false;
  }
  return true;
}

/** Keep established locations; place new or enlarged cubes in the nearest free space. */
export function layoutCubes(nodes: CubeSize[], links: GraphLink[], previous: CubePositions = {}): CubePositions {
  const sizes = new Map(nodes.map(node => [node.id, node.size]));
  const visibleLinks = links.filter(link => link.source !== link.target && sizes.has(link.source) && sizes.has(link.target));
  const neighbors = new Map<string, string[]>();
  for (const { source, target } of visibleLinks) {
    neighbors.set(source, [...(neighbors.get(source) || []), target]);
    neighbors.set(target, [...(neighbors.get(target) || []), source]);
  }
  const positions: CubePositions = Object.create(null);
  // Restore all surviving notes first, so new notes cannot displace them.
  for (const node of nodes) {
    if (previous[node.id]) positions[node.id] = [...previous[node.id]];
  }
  // Only neighboring spatial cells can collide, including in large workspaces.
  const cellSize = Math.max(7.5, ...nodes.map(node => node.size)) + 4;
  const cells = new Map<string, Set<string>>();
  const cellKey = (point: Point3) => point.map(value => Math.floor(value / cellSize)).join(',');
  const indexPosition = (id: string, point: Point3) => {
    const key = cellKey(point);
    const cell = cells.get(key) || new Set<string>();
    cell.add(id);
    cells.set(key, cell);
  };
  for (const [id, point] of Object.entries(positions)) indexPosition(id, point);
  // Settle connected notes first, then reserve their final connection corridors.
  // Isolated notes keep their cached positions unless they obstruct a corridor.
  const ordered = [...nodes].sort((a, b) =>
    Number(neighbors.has(b.id)) - Number(neighbors.has(a.id)) ||
    Number(Boolean(previous[b.id])) - Number(Boolean(previous[a.id])) ||
    (neighbors.get(b.id)?.length || 0) - (neighbors.get(a.id)?.length || 0) || a.id.localeCompare(b.id));

  for (const node of ordered) {
    let seed = 0;
    for (const character of node.id) seed = (seed * 31 + character.charCodeAt(0)) >>> 0;
    seed = Math.imul(seed ^ (seed >>> 16), 0x45d9f3b) >>> 0;
    seed = Math.imul(seed ^ (seed >>> 16), 0x45d9f3b) >>> 0;
    seed = (seed ^ (seed >>> 16)) >>> 0;
    const related = (neighbors.get(node.id) || []).flatMap(id => positions[id] ? [positions[id]] : []);
    const average = (axis: number) => related.reduce((sum, p) => sum + p[axis], 0) / related.length;
    const anchor: Point3 = previous[node.id] ? [...previous[node.id]] : related.length
      ? [average(0), average(1), average(2)] : [0, 0, 0];
    const isFree = (p: Point3) => {
      const [cx, cy, cz] = p.map(value => Math.floor(value / cellSize));
      for (let x = cx - 1; x <= cx + 1; x++) for (let y = cy - 1; y <= cy + 1; y++) for (let z = cz - 1; z <= cz + 1; z++) {
        const cell = cells.get(`${x},${y},${z}`);
        if (!cell) continue;
        for (const id of cell) {
          if (id === node.id) continue;
          const other = positions[id];
          const distance = (node.size + (sizes.get(id) || 2.5)) / 2 + 4;
          if (p.every((value, axis) => Math.abs(value - other[axis]) < distance)) return false;
        }
      }
      if (!neighbors.has(node.id)) {
        for (const { source, target } of visibleLinks) {
          if (connectionCrossesCube(positions[source], positions[target], p, node.size)) return false;
        }
      }
      return true;
    };
    let candidate = anchor;
    let attempt = 0;
    // Deterministic spherical shells spread notes throughout all three dimensions.
    while (!isFree(candidate)) {
      const shell = Math.floor(attempt / 48) + 1;
      const sample = (attempt + seed) % 48;
      const y = 1 - 2 * (sample + 0.5) / 48;
      const angle = sample * Math.PI * (3 - Math.sqrt(5)) + seed;
      const radius = shell * 12;
      const horizontal = Math.sqrt(1 - y * y);
      candidate = [anchor[0] + Math.cos(angle) * horizontal * radius, anchor[1] + y * radius, anchor[2] + Math.sin(angle) * horizontal * radius];
      attempt++;
    }
    if (positions[node.id]) cells.get(cellKey(positions[node.id]))?.delete(node.id);
    positions[node.id] = candidate;
    indexPosition(node.id, candidate);
  }
  return positions;
}

export function frameExtent(nodes: CubeSize[], positions: CubePositions): number {
  return Math.max(80, ...nodes.map(node => Math.max(...(positions[node.id] || [0, 0, 0]).map(Math.abs)) + node.size / 2 + 24));
}
