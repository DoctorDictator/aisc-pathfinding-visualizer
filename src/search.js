/* Pure search engine: each yield represents one expanded graph node. */
export const algorithms = {
  astar: { name: "A*", label: "A* search", optimal: true, rule: "Lowest g + h first", description: "A* combines route cost and admissible Manhattan distance to find a lowest-cost path." },
  dijkstra: { name: "Dijkstra", label: "Uniform-cost search / Dijkstra", optimal: true, rule: "Lowest g first", description: "Uniform-cost search expands the lowest accumulated cost. It is Dijkstra's algorithm with a goal test." },
  bfs: { name: "BFS", label: "Breadth-first search (BFS)", optimal: true, rule: "FIFO queue: oldest first", description: "BFS explores one depth layer at a time. It finds a shortest path when all moves cost the same." },
  dfs: { name: "DFS", label: "Depth-first search (DFS)", optimal: false, rule: "LIFO stack: newest first", description: "DFS follows the most recently discovered branch and backtracks at dead ends. Its route need not be shortest." },
  greedy: { name: "Best-first", label: "Greedy best-first search", optimal: false, rule: "Lowest h first", description: "Greedy best-first search follows the estimated distance to the goal, ignoring accumulated route cost. It need not find a lowest-cost path." },
  hill: { name: "Hill climbing", label: "Hill climbing", optimal: false, rule: "Only a strictly better neighbor", description: "Steepest hill climbing moves to the neighbor closest to the goal. It stops at a plateau or local minimum, even when a detour exists." },
};
export const searchPriority = (g, h, algorithm) =>
  algorithm === "greedy" || algorithm === "hill" ? h : g + h;

export function estimate(
  id,
  goal,
  cols,
  diagonal = false,
  algorithm = "astar",
) {
  const dx = Math.abs((id % cols) - (goal % cols)),
    dy = Math.abs(Math.floor(id / cols) - Math.floor(goal / cols));
  return !["astar", "greedy", "hill"].includes(algorithm)
    ? 0
    : diagonal
      ? (Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy))
      : (dx + dy);
}
export function* search({
  rows,
  cols,
  start,
  goal,
  walls,
  terrain = new Map(),
  algorithm = "astar",
  diagonal = false,
}) {
  if (!algorithms[algorithm]) throw new Error(`Unknown search algorithm: ${algorithm}`);
  const distance = new Map([[start, 0]]),
    parent = new Map(),
    closed = new Set();
  const frontier = new Set([start]);
  const heuristic = (id) => estimate(id, goal, cols, diagonal, algorithm);
  const directions = [
    [-1, 0],
    [0, 1],
    [1, 0],
    [0, -1],
  ];
  if (diagonal) directions.push([-1, -1], [-1, 1], [1, 1], [1, -1]);
  while (frontier.size) {
    let current,
      priority = Infinity;
    for (const id of frontier) {
      const score = searchPriority(distance.get(id), heuristic(id), algorithm);
      if (score < priority) {
        priority = score;
        current = id;
      }
    }
    if (algorithm === "bfs") current = frontier.values().next().value;
    if (algorithm === "dfs") current = [...frontier].at(-1);
    priority = searchPriority(distance.get(current), heuristic(current), algorithm);
    const decision = { chosen: current, priority, rule: algorithms[algorithm].rule };
    frontier.delete(current);
    closed.add(current);
    if (current === goal) {
      const path = [goal];
      while (path[0] !== start) path.unshift(parent.get(path[0]));
      yield {
        current,
        decision,
        parents: new Map(parent),
        frontier: [...frontier],
        costs: new Map(distance),
        found: true,
        path,
        cost: distance.get(goal),
        done: true,
      };
      return;
    }
    const row = Math.floor(current / cols),
      col = current % cols;
    const candidates = [];
    for (const [dr, dc] of directions) {
      const r = row + dr,
        c = col + dc,
        id = r * cols + c;
      if (
        r < 0 ||
        r >= rows ||
        c < 0 ||
        c >= cols ||
        walls.has(id) ||
        closed.has(id)
      )
        continue;
      // Do not cut through the corner of a blocked cell.
      if (dr && dc && (walls.has(row * cols + c) || walls.has(r * cols + col)))
        continue;
      const cost =
        distance.get(current) +
        (dr && dc ? Math.SQRT2 : 1) * (terrain.get(id) ?? 1);
      if (algorithm === "hill") {
        candidates.push({ id, cost });
        continue;
      }
      const firstVisit = ["bfs", "dfs", "greedy"].includes(algorithm);
      if (firstVisit ? !distance.has(id) : cost < (distance.get(id) ?? Infinity)) {
        parent.set(id, current);
        distance.set(id, cost);
        frontier.add(id);
      }
    }
    if (algorithm === "hill") {
      candidates.sort((a, b) => heuristic(a.id) - heuristic(b.id));
      const best = candidates[0];
      if (!best || heuristic(best.id) >= heuristic(current)) {
        yield { current, decision, parents: new Map(parent), frontier: [], costs: new Map(distance), done: true, found: false, path: [], reason: "local-minimum" };
        return;
      }
      parent.set(best.id, current);
      distance.set(best.id, best.cost);
      frontier.add(best.id);
    }
    yield {
      current,
      decision,
      parents: new Map(parent),
      frontier: [...frontier],
      costs: new Map(distance),
      done: false,
    };
  }
  yield {
    done: true,
    found: false,
    path: [],
    frontier: [],
    costs: new Map(distance),
    parents: new Map(parent),
  };
}

