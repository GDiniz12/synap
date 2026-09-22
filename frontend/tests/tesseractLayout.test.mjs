import test from 'node:test';
import assert from 'node:assert/strict';
import { connectionCrossesCube, cubeSize, frameExtent, layoutCubes, readPositions } from '../src/lib/tesseractLayout.ts';

const nodes = Array.from({ length: 80 }, (_, index) => ({ id: String(index), size: cubeSize(index * 80) }));
const links = nodes.slice(1).map((node, index) => ({ source: String(index), target: node.id }));

function assertSeparated(nodes, positions) {
  for (const [i, a] of nodes.entries()) for (const b of nodes.slice(i + 1)) {
    const gap = (a.size + b.size) / 2 + 4;
    assert.ok(positions[a.id].some((v, axis) => Math.abs(v - positions[b.id][axis]) >= gap - 1e-8), `${a.id} overlaps ${b.id}`);
  }
}

test('sizes grow gradually and remain bounded', () => {
  assert.equal(cubeSize(0), 2.5);
  assert.ok(cubeSize(100) > cubeSize(10));
  assert.equal(cubeSize(1e9), 7.5);
});
test('deterministic 3D placement has no overlaps and fits inside the frame', () => {
  const positions = layoutCubes(nodes, links);
  assert.deepEqual(positions, layoutCubes([...nodes].reverse(), links));
  assertSeparated(nodes, positions);
  const extent = frameExtent(nodes, positions);
  for (const node of nodes) for (const value of positions[node.id]) assert.ok(Math.abs(value) + node.size / 2 < extent);
  for (let axis = 0; axis < 3; axis++) assert.ok(new Set(Object.values(positions).map(p => p[axis])).size > 5);
});
test('adding, deleting and reconnecting notes preserves existing locations', () => {
  const positions = layoutCubes(nodes, links);
  const added = { id: 'new', size: 30 };
  const next = layoutCubes([...nodes, added], [...links, { source: '0', target: 'new' }], positions);
  for (const node of nodes) assert.deepEqual(next[node.id], positions[node.id]);
  assertSeparated([...nodes, added], next);
  const removed = layoutCubes(nodes.slice(1), [], positions);
  assert.equal(removed['0'], undefined);
  for (const node of nodes.slice(1)) assert.deepEqual(removed[node.id], positions[node.id]);
});
test('enlarging a note resolves collisions without a full relayout', () => {
  const small = nodes.map(node => ({ ...node, size: 10 }));
  const before = layoutCubes(small, links);
  const grown = small.map(node => node.id === '0' ? { ...node, size: 30 } : node);
  const after = layoutCubes(grown, links, before);
  assertSeparated(grown, after);
  assert.ok(grown.filter(node => JSON.stringify(after[node.id]) === JSON.stringify(before[node.id])).length > 60);
});
test('restores valid stored coordinates and rejects malformed data', () => {
  assert.deepEqual({ ...readPositions('{"a":[1,2,3],"b":[null,0,0],"c":[1e100,0,0]}') }, { a: [1, 2, 3] });
  assert.deepEqual({ ...readPositions('broken') }, {});
  assert.deepEqual({ ...readPositions(null) }, {});
  assert.deepEqual({ ...layoutCubes([], []) }, {});
});

test('moves a saved isolated cube out of a connection without moving either endpoint', () => {
  const notes = [{ id: 'a', size: 5 }, { id: 'b', size: 5 }, { id: 'isolated', size: 5 }, { id: 'unaffected', size: 5 }];
  const saved = { a: [-30, 0, 0], b: [30, 0, 0], isolated: [0, 0, 0], unaffected: [0, 25, 0] };
  const edges = [{ source: 'a', target: 'b' }];
  const result = layoutCubes(notes, edges, saved);
  assert.deepEqual(result.a, saved.a);
  assert.deepEqual(result.b, saved.b);
  assert.deepEqual(result.unaffected, saved.unaffected);
  assert.ok(Math.abs(result.isolated[1]) > 4.5 || Math.abs(result.isolated[2]) > 4.5 || Math.abs(result.isolated[0]) > 34.5);
  assertSeparated(notes, result);
  assert.deepEqual(layoutCubes(notes, edges, result), result);
});

test('new isolated notes avoid the interior of existing links', () => {
  const notes = [{ id: 'a', size: 5 }, { id: 'b', size: 5 }, { id: 'isolated', size: 5 }];
  const result = layoutCubes(notes, [{ source: 'a', target: 'b' }], { a: [-30, 0, 0], b: [30, 0, 0] });
  assert.ok(Math.abs(result.isolated[1]) > 4.5 || Math.abs(result.isolated[2]) > 4.5 || Math.abs(result.isolated[0]) > 34.5);
  assertSeparated(notes, result);
});

test('a cached isolated note is checked after a newly connected endpoint is placed', () => {
  const notes = [{ id: 'a', size: 5 }, { id: 'new-endpoint', size: 5 }, { id: 'isolated', size: 5 }];
  const edges = [{ source: 'a', target: 'new-endpoint' }];
  const result = layoutCubes(notes, edges, { a: [-30, 0, 0], isolated: [-24, 0, 0] });
  assert.equal(connectionCrossesCube(result.a, result['new-endpoint'], result.isolated, 5), false);
  assertSeparated(notes, result);
});

test('connection clearance respects diagonal paths, cube size, and actual depth', () => {
  assert.equal(connectionCrossesCube([-20, -20, -20], [20, 20, 20], [0, 0, 0], 5), true);
  assert.equal(connectionCrossesCube([-20, 0, 0], [20, 0, 0], [0, 6, 0], 5), false);
  assert.equal(connectionCrossesCube([-20, 0, 0], [20, 0, 0], [0, 6, 0], 10), true);
  assert.equal(connectionCrossesCube([-20, 0, 0], [20, 0, 0], [0, 0, 15], 5), false);
  assert.equal(connectionCrossesCube([-20, 0, 0], [-10, 0, 0], [0, 0, 0], 5), false);
});

test('multiple corridors stay clear after adding a link and growing an isolated note', () => {
  const notes = [{ id: 'a', size: 5 }, { id: 'b', size: 5 }, { id: 'c', size: 5 }, { id: 'd', size: 5 }, { id: 'isolated', size: 7.5 }];
  const saved = { a: [-30, 0, 0], b: [30, 0, 0], c: [0, 0, -30], d: [0, 0, 30], isolated: [0, 5, 0] };
  const edges = [{ source: 'a', target: 'b' }, { source: 'c', target: 'd' }];
  const result = layoutCubes(notes, edges, saved);
  for (const edge of edges) assert.equal(connectionCrossesCube(result[edge.source], result[edge.target], result.isolated, 7.5), false);
  for (const id of ['a', 'b', 'c', 'd']) assert.deepEqual(result[id], saved[id]);
  assertSeparated(notes, result);
});
