import { estimate } from "./search.js";

// Only expose the quantities used by the selected search discipline.
export function metricFields(algorithm) {
  if (["astar"].includes(algorithm)) return [
    { key: "g", label: "g(n)", description: "cost from start" },
    { key: "h", label: "h(n)", description: "estimate to goal" },
    { key: "f", label: "f(n)", description: "g(n) + h(n)" },
  ];
  if (algorithm === "dijkstra") return [{ key: "g", label: "g(n)", description: "cost from start; lowest cost expands first" }];
  if (["greedy", "hill"].includes(algorithm)) return [{ key: "h", label: "h(n)", description: "estimate to goal" }];
  return [{ key: "depth", label: "Depth", description: algorithm === "bfs" ? "moves from start; FIFO queue" : "moves from start; LIFO stack" }];
}

export function nodeMetrics(state, id, cols) {
  const g = id === state.start ? 0 : (state.costs.get(id) ?? Infinity);
  const h = estimate(id, state.goal, cols, false, state.algorithm);
  let depth = id === state.start ? 0 : Infinity;
  if (state.parents.has(id)) {
    depth = 0;
    let current = id;
    const seen = new Set();
    while (current !== state.start && !seen.has(current)) {
      seen.add(current);
      current = state.parents.get(current);
      depth++;
    }
    if (current !== state.start) depth = Infinity;
  }
  const values = { g, h, f: g + h, depth };
  return metricFields(state.algorithm).map(field => ({ ...field, value: values[field.key] }));
}
