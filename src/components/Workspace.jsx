import React from "react";
import Grid from "./Grid.jsx";
import { closeOnEscape } from "./Header.jsx";
import { algorithms } from "../search.js";
export default function Workspace({ state, actions }) {
  return (
    <>
      <p id="algorithm-description" className="hint">
        {algorithms[state.algorithm].description}
      </p>
      <div className="workspace">
        <section className="board-panel" aria-label="Pathfinding workspace">
          <div className="board-header">
          <div className="legend">
            <span><i className="legend-terrain"></i>Weighted terrain</span>
            <span>
              <i className="legend-start"></i>Start
            </span>
            <span>
              <i className="legend-goal"></i>Goal
            </span>
            <span>
              <i className="legend-wall"></i>Wall
            </span>
            <span>
              <i className="legend-visited"></i>Explored
            </span>
            <span>
              <i className="legend-frontier"></i>Frontier
            </span>
            <span>
              <i className="legend-path"></i>Shortest path
            </span>
          </div>
            <div className="board-actions">
              <details
                name="visualizer-menu"
                id="landscape-menu"
                onKeyDown={closeOnEscape}
                className="landscape-menu"
              >
                <summary>
                  Try a new landscape <span>&#8964;</span>
                </summary>
                <div className="landscape-options">
                  <p className="popover-heading">Landscape</p>
                  <p className="popover-caption">Set up your next search.</p>
                  <button
                    id="maze"
                    disabled={state.running}
                    onClick={(event) => {
                      actions.maze();
                      event.currentTarget.closest("details").open = false;
                    }}
                  >
                    <strong>Generate maze</strong><small>Carve a winding route</small>
                  </button>
                  <button
                    id="random"
                    disabled={state.running}
                    onClick={(event) => {
                      actions.random();
                      event.currentTarget.closest("details").open = false;
                    }}
                  >
                    <strong>Scatter walls</strong><small>Add random obstacles</small>
                  </button>
                  <button
                    id="clear-walls"
                    disabled={state.running}
                    onClick={(event) => {
                      actions.clearWalls();
                      event.currentTarget.closest("details").open = false;
                    }}
                  >
                    <strong>Clear all walls</strong><small>Open up the grid</small>
                  </button>
                </div>
              </details>
              <details name="visualizer-menu" id="terrain-menu" className="landscape-menu terrain-menu" onKeyDown={closeOnEscape}>
                <summary>Terrain{state.tool === "terrain" ? ` (${state.terrainCost})` : state.tool === "erase" ? " (erase)" : ""} <span>&#8964;</span></summary>
          <div className="terrain-tools terrain-popover" aria-label="Grid editing tools">
            <div className="terrain-heading"><p className="popover-heading">Drawing tools</p><p className="popover-caption">Choose a brush, then drag on the grid.</p></div>
            <label htmlFor="paint-tool">Draw</label>
            <select id="paint-tool" disabled={state.running} value={state.tool} onChange={event => actions.setTool(event.target.value)}>
              <option value="wall">Walls</option>
              <option value="terrain">Weighted terrain</option>
              <option value="erase">Erase</option>
            </select>
            <label htmlFor="terrain-cost">Terrain cost</label>
            <select id="terrain-cost" disabled={state.running} value={state.terrainCost} onChange={event => actions.setTerrainCost(Number(event.target.value))}>
              <option value="3">3</option><option value="5">5</option><option value="9">9</option>
            </select>
            <button id="clear-terrain" className="secondary" disabled={state.running} onClick={event => { actions.clearTerrain(); event.currentTarget.closest("details").open = false; }}>Clear terrain</button>
            <button id="demo-weighted" className="secondary" disabled={state.running} onClick={event => { actions.demo("weighted"); event.currentTarget.closest("details").open = false; }}>Weighted demo</button>
            <p className="terrain-hint">Normal cells cost 1; numbered cells cost 3, 5 or 9 to enter. BFS minimizes steps; Dijkstra and A* minimize total cost.</p>
          </div>
              </details>
              <button
                id="reset"
                onClick={actions.reset}
                className="text-button"
              >
                ↻ Reset search
              </button>
            </div>
          </div>
          <div className="grid-wrap">
            <Grid state={state} actions={actions} />
          </div>
          <div className="board-footer">
            <p>
              <span>↖</span>{" "}
              <span id="grid-instruction">
                {state.running
                  ? "Follow the frontier — drag a marker to change the route."
                  : "Drag to use the selected drawing tool. Press W on a focused cell to toggle terrain. Drag markers to move them."}
              </span>
            </p>
            <span>540 possibilities</span>
          </div>
          <div className="transport">
            <div className="status" style={{ visibility: state.status[0] ? "visible" : "hidden" }}>
              <span
                id="status-dot"
                className={state.running ? "running" : ""}
              ></span>
              <div>
                <strong id="status-title">{state.status[0]}</strong>
                <p id="status-detail" aria-live="polite">
                  {state.status[1]}
                </p>
              </div>
            </div>
            <div className="run-actions">
              <button
                id="step"
                disabled={state.running || state.finished}
                onClick={actions.step}
                className="secondary"
              >
                Step <span>→</span>
              </button>
              <button id="run" onClick={actions.toggleRun} className="primary">
                <span>{state.running ? "Ⅱ" : "▶"}</span>{" "}
                {state.running
                  ? "Pause search"
                  : state.started && !state.finished
                    ? "Resume search"
                    : "Visualize " + algorithms[state.algorithm].name}
              </button>
            </div>
          </div>
        </section>
      </div>
      <section className="metrics" aria-label="Search statistics">
        <div>
          <span className="metric-icon">◎</span>
          <div>
            <p>NODES EXPLORED</p>
            <strong id="explored">{state.visited.size}</strong>
            <span> / 540 nodes</span>
          </div>
        </div>
        <div>
          <span className="metric-icon">⌁</span>
          <div>
            <p>PATH LENGTH</p>
            <strong id="path-length">
              {state.result?.found ? state.result.path.length - 1 : "—"}
            </strong>
            <span> steps</span>
          </div>
        </div>
        <div>
          <span className="metric-icon">◷</span>
          <div>
            <p>SEARCH TIME</p>
            <strong id="time">{state.elapsed.toFixed(1)}</strong>
            <span> ms · computation</span>
          </div>
        </div>
        <div>
          <span className="metric-icon">↗</span>
          <div>
            <p>PATH COST</p>
            <strong id="cost">
              {state.result?.found ? Number(state.result.cost.toFixed(2)) : "—"}
            </strong>
            <span> terrain cost</span>
          </div>
        </div>
      </section>
    </>
  );
}
