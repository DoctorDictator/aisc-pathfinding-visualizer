import { useCallback, useEffect, useRef, useState } from "react";
import { search, algorithms } from "./search.js";

export const ROWS = 18,
  COLS = 30,
  TOTAL = ROWS * COLS;
export const formatCost = (value) =>
  Number.isFinite(value) ? String(Number(value.toFixed(2))) : "∞";
export const nodeName = (id) =>
  id === undefined ? "—" : `(${Math.floor(id / COLS) + 1}, ${(id % COLS) + 1})`;
const ready = ["", ""];
const emptySearch = () => ({
  visited: new Set(),
  frontier: new Set(),
  path: new Set(),
  costs: new Map(),
  parents: new Map(),
  decision: null,
  result: null,
  elapsed: 0,
  started: false,
  finished: false,
  running: false,
});
const initialState = () => ({
  ...emptySearch(),
  start: 8 * COLS + 5,
  goal: 8 * COLS + 24,
  walls: new Set(),
  terrain: new Map(),
  tool: "wall",
  terrainCost: 5,
  algorithm: "astar",
  speed: 4,
  status: ready,
});

// React owns the rendered state; refs hold the generator and the latest event state.
export default function usePathfinding() {
  const [state, setState] = useState(initialState);
  const latest = useRef(state);
  const iterator = useRef(null);
  const commit = useCallback((next) => {
    latest.current = next;
    setState(next);
  }, []);
  const reset = useCallback(
    (changes = {}) => {
      iterator.current = null;
      commit({
        ...latest.current,
        ...emptySearch(),
        status: ready,
        ...changes,
      });
    },
    [commit],
  );
  const advance = useCallback(() => {
    const previous = latest.current;
    if (previous.finished) return;
    iterator.current ??= search({
      rows: ROWS,
      cols: COLS,
      ...previous,
      diagonal: false,
    });
    const before = performance.now();
    const snapshot = iterator.current.next().value;
    const elapsed = previous.elapsed + performance.now() - before;
    if (!snapshot) return;
    const visited = new Set(previous.visited);
    if (snapshot.current !== undefined) visited.add(snapshot.current);
    const next = {
      ...previous,
      visited,
      frontier: new Set(snapshot.frontier),
      costs: snapshot.costs,
      parents: snapshot.parents,
      decision: snapshot.decision ?? previous.decision,
      elapsed,
      started: true,
    };
    if (snapshot.done) {
      next.finished = true;
      next.running = false;
      next.result = snapshot;
      next.path = new Set(snapshot.path);
      next.status = snapshot.found
        ? [
            "Destination reached",
            `Found ${previous.algorithm === "bfs" ? "a fewest-step path" : algorithms[previous.algorithm].optimal ? "a lowest-cost path" : "a route"} in ${snapshot.path.length - 1} steps. ${visited.size} nodes explored.`,
          ]
        : [
            "No path found",
            snapshot.reason === "local-minimum"
              ? "Stopped at a local minimum or plateau. Try A* or BFS to search for a detour."
              : "No route connects the markers. Erase a few walls and try again.",
          ];
    }
    commit(next);
  }, [commit]);
  useEffect(() => {
    if (!state.running) return;
    let timer;
    const tick = () => {
      const speed = latest.current.speed,
        batch = speed === 5 ? 10 : speed === 4 ? 3 : 1;
      for (let i = 0; i < batch && latest.current.running; i++) advance();
      if (latest.current.running)
        timer = setTimeout(tick, [0, 220, 110, 45, 16, 0][speed]);
    };
    tick();
    return () => clearTimeout(timer);
    // Each tick reads the current state through latest, including speed changes.
  }, [state.running, advance]);
  const paint = (id, tool) => {
    let current = latest.current;
    if (current.running || id < 0 || id >= TOTAL) return;
    if (current.started || current.finished) {
      reset();
      current = latest.current;
    }
    const walls = new Set(current.walls);
    const terrain = new Map(current.terrain);
    let { start, goal } = current;
    if (tool === "start" && id !== goal) {
      start = id;
      walls.delete(id);
    } else if (tool === "goal" && id !== start) {
      goal = id;
      walls.delete(id);
    } else if (id !== start && id !== goal) {
      if (tool === "wall") { walls.add(id); terrain.delete(id); }
      if (tool === "terrain") { walls.delete(id); terrain.set(id, current.terrainCost); }
      if (tool === "erase") { walls.delete(id); terrain.delete(id); }
    }
    commit({ ...current, walls, terrain, start, goal });
  };
  const maze = () => {
    const walls = new Set(Array.from({ length: TOTAL }, (_, id) => id));
    const stack = [[1, 1]],
      carved = new Set([COLS + 1]);
    walls.delete(COLS + 1);
    while (stack.length) {
      const [r, c] = stack.at(-1);
      const options = [
        [-2, 0],
        [2, 0],
        [0, -2],
        [0, 2],
      ].filter(
        ([dr, dc]) =>
          r + dr > 0 &&
          r + dr < ROWS - 1 &&
          c + dc > 0 &&
          c + dc < COLS - 1 &&
          !carved.has((r + dr) * COLS + c + dc),
      );
      if (!options.length) {
        stack.pop();
        continue;
      }
      const [dr, dc] = options[Math.floor(Math.random() * options.length)],
        next = (r + dr) * COLS + c + dc;
      walls.delete((r + dr / 2) * COLS + c + dc / 2);
      walls.delete(next);
      carved.add(next);
      stack.push([r + dr, c + dc]);
    }
    for (const id of [latest.current.start, latest.current.goal]) {
      let r = Math.floor(id / COLS),
        c = id % COLS;
      const targetR = Math.min(ROWS - 3, Math.max(1, r % 2 ? r : r - 1));
      const targetC = Math.min(COLS - 3, Math.max(1, c % 2 ? c : c - 1));
      walls.delete(r * COLS + c);
      while (r !== targetR) {
        r += Math.sign(targetR - r);
        walls.delete(r * COLS + c);
      }
      while (c !== targetC) {
        c += Math.sign(targetC - c);
        walls.delete(r * COLS + c);
      }
    }
    reset({
      walls,
      terrain: new Map(),
      status: [
        "A maze of possibilities",
        "A winding landscape is ready. Find the route between your markers.",
      ],
    });
  };
  const actions = {
    reset: () => reset(),
    paint,
    setTool: (tool) => commit({ ...latest.current, tool }),
    setTerrainCost: (terrainCost) => commit({ ...latest.current, terrainCost }),
    clearTerrain: () => reset({ terrain: new Map() }),
    maze,
    pauseForMarker: () =>
      commit({
        ...latest.current,
        running: false,
        status: ["Search paused", "Move the marker to begin a new search."],
      }),
    setAlgorithm: (algorithm) => reset({ algorithm }),
    setSpeed: (speed) => commit({ ...latest.current, speed }),
    step: () => {
      if (!latest.current.running && !latest.current.finished) {
        commit({
          ...latest.current,
          status: [
            "One step closer",
            "Use Step again, or resume to watch the full search.",
          ],
        });
        advance();
      }
    },
    toggleRun: () => {
      if (latest.current.running)
        commit({
          ...latest.current,
          running: false,
          status: [
            "Search paused",
            "Resume the journey or use Step to explore one node at a time.",
          ],
        });
      else {
        if (latest.current.finished) reset();
        commit({
          ...latest.current,
          running: true,
          status: [
            "Finding a way…",
            "Exploring the graph, one possibility at a time.",
          ],
        });
      }
    },
    clearWalls: () => reset({ walls: new Set() }),
    random: () => {
      const { start, goal } = latest.current;
      const walls = new Set(
        Array.from({ length: TOTAL }, (_, id) => id).filter(
          (id) => id !== start && id !== goal && Math.random() < 0.25,
        ),
      );
      reset({
        walls,
        terrain: new Map(),
        status: [
          "A new landscape",
          "Scattered walls may block the goal. Explore or carve a way through.",
        ],
      });
    },
    demo: (scenario) => {
      const start = 8 * COLS + 5,
        goal = 8 * COLS + 24,
        walls = new Set(),
        terrain = new Map();
      if (scenario === "weighted")
        for (let c = 6; c <= 23; c++) terrain.set(8 * COLS + c, 5);
      if (scenario === "detour")
        for (let r = 2; r <= 14; r++) walls.add(r * COLS + 15);
      if (scenario === "blocked")
        for (const [dr, dc] of [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
          [-1, -1],
          [-1, 1],
          [1, -1],
          [1, 1],
        ])
          walls.add(goal + dr * COLS + dc);
      reset({
        start,
        goal,
        walls,
        terrain,
        status: [
          "Demonstration ready",
          {
            weighted: "Compare BFS through costly terrain with Dijkstra or A* taking a cheaper detour.",
            empty: "An open map: compare direct routes.",
            detour: "A wall detour: watch the route bend around an obstacle.",
            blocked:
              "A blocked goal: explain why OPEN eventually becomes empty.",
          }[scenario],
        ],
      });
    },
  };
  return { state, actions };
}
