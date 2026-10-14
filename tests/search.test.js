import assert from "node:assert/strict";
import { search } from "../src/search.js";
function solve(options) {
  return [...search(options)].at(-1);
}
const base = { rows: 5, cols: 7, start: 0, goal: 34, walls: new Set() };
assert.equal(solve(base).cost, 10);
assert.equal(solve({ ...base, start: 0, goal: 0 }).cost, 0);
assert.equal(solve({ ...base, walls: new Set([1, 7]) }).found, false);
const diagonal = solve({
  rows: 3,
  cols: 3,
  start: 0,
  goal: 8,
  walls: new Set(),
  diagonal: true,
});
assert.ok(Math.abs(diagonal.cost - 2 * Math.SQRT2) < 1e-9);
assert.equal(
  solve({
    rows: 2,
    cols: 2,
    start: 0,
    goal: 3,
    walls: new Set([1, 2]),
    diagonal: true,
  }).found,
  false,
);
assert.ok(Math.abs(solve({ ...base, diagonal: true, algorithm: "bfs" }).cost - (2 + 4 * Math.SQRT2)) < 1e-9);
// Check A* against uninformed search over reproducible obstacle maps.
let seed = 42;
const random = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 2 ** 32;
};
for (let i = 0; i < 80; i++) {
  const walls = new Set(
    Array.from({ length: 35 }, (_, id) => id).filter(
      (id) => id !== 0 && id !== 34 && random() < 0.3,
    ),
  );
  for (const diagonal of [false, true]) {
    const options = { ...base, walls, diagonal };
    const a = solve(options),
      d = solve({ ...options, algorithm: "dijkstra" });
    assert.equal(a.found, d.found);
    if (a.found) {
      assert.ok(Math.abs(a.cost - d.cost) < 1e-9);
      assert.equal(a.path[0], options.start);
      assert.equal(a.path.at(-1), options.goal);
      for (const id of a.path) assert.ok(!walls.has(id));
      for (let j = 1; j < a.path.length; j++) {
        const previous = a.path[j - 1],
          next = a.path[j];
        const dr = Math.abs(Math.floor(previous / 7) - Math.floor(next / 7)),
          dc = Math.abs((previous % 7) - (next % 7));
        assert.ok(
          dr <= 1 && dc <= 1 && dr + dc > 0 && (diagonal || dr + dc === 1),
        );
        if (dr && dc) {
          assert.ok(!walls.has(Math.floor(previous / 7) * 7 + (next % 7)));
          assert.ok(!walls.has(Math.floor(next / 7) * 7 + (previous % 7)));
        }
      }
    }
    if (!diagonal)
      assert.equal(a.cost, solve({ ...options, algorithm: "bfs" }).cost);
  }
}
console.log(
  "Search checks passed: shortest paths, blocked goals, diagonal costs, corner rules, and 160 obstacle scenarios.",
);

// Traversal disciplines must differ, rather than merely changing menu labels.
const tiny = { rows: 3, cols: 3, start: 4, goal: 0, walls: new Set() };
assert.equal([...search({ ...tiny, algorithm: "bfs" })][1].current, 1);
assert.equal([...search({ ...tiny, algorithm: "dfs" })][1].current, 3);
assert.equal([...search({ ...tiny, algorithm: "greedy" })][1].current, 1);
for (const algorithm of ["dfs", "greedy", "hill"]) {
  const result = solve({ ...base, algorithm });
  assert.equal(result.found, true);
  assert.equal(result.path[0], base.start);
  assert.equal(result.path.at(-1), base.goal);
  assert.equal(result.cost, result.path.length - 1);
  assert.equal(solve({ ...base, algorithm, start: base.goal }).cost, 0);
  assert.equal(solve({ ...base, algorithm, walls: new Set([1, 7]) }).found, false);
}
const detour = { rows: 3, cols: 5, start: 5, goal: 9, walls: new Set([7]) };
assert.equal(solve({ ...detour, algorithm: "hill" }).reason, "local-minimum");
assert.equal(solve(detour).found, true);
for (const algorithm of ["dfs", "greedy"]) {
  for (let i = 0; i < 20; i++) {
    const walls = new Set(Array.from({ length: 35 }, (_, id) => id).filter(id => id !== 0 && id !== 34 && random() < 0.3));
    const options = { ...base, walls, algorithm };
    const result = solve(options);
    assert.equal(result.found, solve({ ...options, algorithm: "bfs" }).found);
    if (result.found) {
      assert.equal(new Set(result.path).size, result.path.length);
      for (let j = 1; j < result.path.length; j++) {
        const a = result.path[j - 1], b = result.path[j];
        assert.ok(!walls.has(b));
        assert.equal(Math.abs(a % 7 - b % 7) + Math.abs(Math.floor(a / 7) - Math.floor(b / 7)), 1);
      }
    }
  }
}

const weighted = { rows: 3, cols: 5, start: 5, goal: 9, walls: new Set(), terrain: new Map([[6, 5], [7, 5], [8, 5]]) };
const breadth = solve({ ...weighted, algorithm: "bfs" });
assert.equal(breadth.path.length - 1, 4);
assert.equal(breadth.cost, 16);
for (const algorithm of ["astar", "dijkstra"]) {
  const route = solve({ ...weighted, algorithm });
  assert.equal(route.cost, 6);
  assert.equal(route.path.length - 1, 6);
}
for (let i = 0; i < 50; i++) {
  const terrain = new Map(Array.from({ length: 35 }, (_, id) => [id, [1, 3, 5, 9][Math.floor(random() * 4)]]));
  const walls = new Set(Array.from({ length: 35 }, (_, id) => id).filter(id => id !== 0 && id !== 34 && random() < 0.2));
  const options = { ...base, terrain, walls };
  const a = solve(options), d = solve({ ...options, algorithm: "dijkstra" });
  assert.equal(a.found, d.found);
  if (a.found) {
    assert.equal(a.cost, d.cost);
    assert.equal(a.cost, a.path.slice(1).reduce((sum, id) => sum + terrain.get(id), 0));
  }
}
