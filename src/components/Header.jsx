import React from "react";
import { algorithms } from "../search.js";
const speedLabels = ["", "Slow", "Relaxed", "Steady", "Fast", "Instant"];
export const closeOnEscape = (event) => {
  if (event.key === "Escape") event.currentTarget.open = false;
};
export default function Header({ state, actions, theme, toggleTheme }) {
  return (
    <header className="topbar">
      <a className="app-title" href="./">
        Pathfinding Visualizer
      </a>
      <nav className="navbar-controls" aria-label="Visualizer controls">
        <div className="nav-algorithm">
          <span className="algorithm-label">Algorithm</span>
          <details name="visualizer-menu" id="algorithm-menu" className="landscape-menu algorithm-menu" onKeyDown={closeOnEscape}>
            <summary id="algorithm" aria-label="Algorithm" aria-disabled={state.running} onClick={event => { if (state.running) event.preventDefault(); }}>
              {algorithms[state.algorithm].name}<span>&#8964;</span>
            </summary>
            <div className="algorithm-popover" aria-label="Choose algorithm">
              {[{ label: "Uninformed search", ids: ["bfs", "dfs", "dijkstra"] }, { label: "Heuristic search", ids: ["greedy", "astar", "hill"] }].map(group => (
                <div className="algorithm-group" key={group.label}>
                  <p className="algorithm-group-label">{group.label}</p>
                  {group.ids.map(id => (
                    <button key={id} type="button" data-algorithm={id} disabled={state.running} aria-pressed={state.algorithm === id} onClick={event => {
                      actions.setAlgorithm(id);
                      const menu = event.currentTarget.closest("details");
                      menu.open = false;
                      menu.querySelector("summary").focus();
                    }}>
                      <span><strong>{algorithms[id].label}</strong><small>{algorithms[id].rule}</small></span>
                      {state.algorithm === id && <span className="algorithm-check" aria-hidden="true">&#10003;</span>}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </details>
        </div>
        <details
          name="visualizer-menu"
          id="speed-menu"
          onKeyDown={closeOnEscape}
          className="speed-menu"
        >
          <summary aria-label="Animation speed" title="Animation speed">
            <svg
              width="21"
              height="21"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M4 18a9 9 0 1 1 16 0M12 13l5-5"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
              <circle
                cx="12"
                cy="13"
                r="2"
                stroke="currentColor"
                strokeWidth="1.7"
              />
            </svg>
          </summary>
          <div className="speed-popover">
            <p className="popover-heading">Playback speed</p>
            <p className="popover-caption">Choose how quickly nodes are explored.</p>
            <div className="label-row">
              <label htmlFor="speed">Animation speed</label>
              <span id="speed-label">{speedLabels[state.speed]}</span>
            </div>
            <input
              type="range"
              id="speed"
              min="1"
              max="5"
              value={state.speed}
              aria-valuetext={speedLabels[state.speed]}
              onChange={(event) => actions.setSpeed(Number(event.target.value))}
            />
            <div className="range-labels">
              <span>Slow</span>
              <span>Instant</span>
            </div>
          </div>
        </details>
        <button id="theme-toggle" className="theme-toggle" type="button" onClick={toggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`} title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>
          {theme === "dark" ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M20.5 14A8.7 8.7 0 0 1 10 3.5 8.8 8.8 0 1 0 20.5 14Z" /></svg>
          )}
        </button>
      </nav>
    </header>
  );
}
