import React, { useState } from "react";
import { estimate, algorithms, searchPriority } from "../search.js";
import { metricFields, nodeMetrics } from "../nodeMetrics.js";
import { COLS, ROWS, formatCost, nodeName } from "../usePathfinding.js";
export default function LearningPanel({ state, actions }) {
  const [enabled, setEnabled] = useState(true);
  const fields = metricFields(state.algorithm);
  const h = (id) => estimate(id, state.goal, COLS, false, state.algorithm);
  const g = (id) =>
    id === state.start ? 0 : (state.costs.get(id) ?? Infinity);
  const open = state.started ? [...state.frontier] : [state.start];
  if (["dfs"].includes(state.algorithm)) open.reverse();
  else if (state.algorithm !== "bfs")
    open.sort((a, b) => searchPriority(g(a), h(a), state.algorithm) - searchPriority(g(b), h(b), state.algorithm));
  return (
    <>
      <div className="learning-toolbar">
        <div>
          <p className="eyebrow">COURSE WORKSPACE · HEURISTIC SEARCH</p>
          <h2>See the reasoning behind each move.</h2>
        </div>
        <label className="toggle-row" htmlFor="learning-toggle">
          <span>Learning mode</span>
          <input
            id="learning-toggle"
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
          />
        </label>
      </div>
      <section
        id="learning-panel"
        hidden={!enabled}
        className="learning-panel"
        aria-label="Heuristic search learning mode"
      >
        <div className="learning-card problem-card">
          <p className="eyebrow">01 · FORMULATE THE PROBLEM</p>
          <h2>A robot navigating an obstacle map</h2>
          <p className="hint">
            Find a route from the start to the goal while avoiding blocked
            cells. The grid is a graph: traversable squares are states and legal
            moves are edges.
          </p>
          <dl className="problem-definition">
            <div>
              <dt>Initial state</dt>
              <dd id="problem-start">{`Start at row, column ${nodeName(state.start)}`}</dd>
            </div>
            <div>
              <dt>Goal test</dt>
              <dd id="problem-goal">{`Current state equals ${nodeName(state.goal)}`}</dd>
            </div>
            <div>
              <dt>Actions & costs</dt>
              <dd id="problem-actions">
                {
                  "4 directions: up, right, down, left. Entering a normal cell costs 1; weighted cells cost their displayed number."
                }
              </dd>
            </div>
            {["astar", "greedy", "hill"].includes(state.algorithm) && (
              <div>
                <dt>Heuristic</dt>
                <dd id="problem-heuristic">
                  Manhattan distance: |row - goal row| + |column - goal column|
                </dd>
              </div>
            )}
            <div>
              <dt>Expansion rule</dt>
              <dd>{algorithms[state.algorithm].rule}</dd>
            </div>
          </dl>
          <p className="learning-note">
            {algorithms[state.algorithm].description}
          </p>
          <p className="hint">AO* uses AND/OR problem-reduction graphs; minimax and alpha-beta use game trees. Constraint satisfaction and means-ends analysis require different state models and are outside this route grid.</p>
          <p className="section-label demo-label">
            REPRODUCIBLE DEMONSTRATIONS
          </p>
          <div className="demo-buttons">
            <button
              id="demo-empty"
              onClick={() => actions.demo("empty")}
              className="secondary"
            >
              Empty map
            </button>
            <button
              id="demo-detour"
              onClick={() => actions.demo("detour")}
              className="secondary"
            >
              Wall detour
            </button>
            <button
              id="demo-blocked"
              onClick={() => actions.demo("blocked")}
              className="secondary"
            >
              Blocked goal
            </button>
          </div>
        </div>
        <div className="learning-card graph-card">
          <p className="eyebrow">02 · INSPECT THE GRAPH</p>
          <h2>The current node and its legal neighbors</h2>
          <p className="hint">
            A local view of the same grid graph. Edge labels are movement costs;
            node labels show the selected algorithm’s values. Teal = current, sage = OPEN,
            gray = CLOSED.
          </p>
          <div className="local-graph-wrap">
            <LocalGraph state={state} />
          </div>
        </div>
        <div className="learning-card">
          <p className="eyebrow">03 · READ THE SEARCH STATE</p>
          <div className="state-heading">
            <h2>OPEN · waiting to expand</h2>
            <span id="open-count" className="count-badge">
              {open.length}
            </span>
          </div>
          <p className="hint">
            {algorithms[state.algorithm].rule}. Parent links record the discovered route.
            CLOSED nodes have already been expanded.
          </p>
          <div className="state-table-wrap">
            <table className="learning-table">
              <thead>
                <tr>
                  <th>Node (r,c)</th>
                  {fields.map(field => <th key={field.key}>{field.label}</th>)}
                  <th>Parent</th>
                </tr>
              </thead>
              <tbody id="open-list">
                {open.map((id) => (
                  <tr key={id}>
                    {[
                      nodeName(id),
                      ...nodeMetrics(state, id, COLS).map(metric => formatCost(metric.value)),
                      nodeName(state.parents.get(id)),
                    ].map((value, index) => (
                      <td key={index}>{value}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="state-heading closed-heading">
            <h2>CLOSED · expanded</h2>
            <span id="closed-count" className="count-badge">
              {state.visited.size}
            </span>
          </div>
          <div id="closed-list" className="closed-list">
            {state.visited.size
              ? [...state.visited].map(nodeName).join("  ·  ")
              : "No expanded nodes yet."}
          </div>
        </div>
      </section>
    </>
  );
}
function LocalGraph({ state }) {
  const current = state.decision?.chosen;
  const nodes =
    current === undefined
      ? []
      : [{ id: current, x: 380, y: 210, chosen: true }];
  if (current !== undefined) {
    const row = Math.floor(current / COLS),
      col = current % COLS;
    for (const [dr, dc] of [
      [-1, 0],
      [0, 1],
      [1, 0],
      [0, -1],
    ]) {
      const r = row + dr,
        c = col + dc,
        id = r * COLS + c;
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS && !state.walls.has(id))
        nodes.push({ id, x: 380 + dc * 260, y: 210 + dr * 150 });
    }
  }
  return (
    <svg
      id="local-graph"
      viewBox="0 0 760 420"
      role="img"
      aria-label="Current search node and legal neighbor graph"
    >
      {!nodes.length && (
        <text x="380" y="210" textAnchor="middle" fill="var(--muted)">
          Step through the search to reveal the graph.
        </text>
      )}
      {nodes.slice(1).map((node) => (
        <g key={"edge" + node.id}>
          <line
            x1="380"
            y1="210"
            x2={node.x}
            y2={node.y}
            stroke="var(--graph-line)"
            strokeWidth="2"
          />
          <text
            x={(380 + node.x) / 2 + 8}
            y={(210 + node.y) / 2 - 6}
            fill="var(--muted)"
            fontSize="12"
          >
            {state.terrain.get(node.id) ?? 1}
          </text>
        </g>
      ))}
      {nodes.map(({ id, x, y, chosen }) => {
        const metrics = nodeMetrics(state, id, COLS);
        const fill = chosen
            ? "var(--graph-current)"
            : state.visited.has(id)
              ? "var(--graph-closed)"
              : "var(--graph-open)",
          ink = chosen ? "var(--graph-current-ink)" : "var(--ink)";
        return (
          <g key={id}>
            <rect
              x={x - 100}
              y={y - 38}
              width="200"
              height="76"
              rx="10"
              fill={fill}
              stroke="var(--graph-line)"
            />
            <text
              x={x}
              y={y - 12}
              textAnchor="middle"
              fill={ink}
              fontSize="14"
              fontWeight="600"
            >
              {nodeName(id)} ·{" "}
              {chosen
                ? "current"
                : state.visited.has(id)
                  ? "CLOSED"
                  : state.frontier.has(id)
                    ? "OPEN"
                    : "neighbor"}
            </text>
            <text x={x} y={y + 12} textAnchor="middle" fill={ink} fontSize="12">
              {metrics.map(metric => `${metric.label} ${formatCost(metric.value)}`).join(" | ")}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
