import React from "react";
import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { search } from "../src/search.js";
import usePathfinding, { ROWS, COLS } from "../src/usePathfinding.js";
import App from "../src/App.jsx";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost",
});
for (const key of [
  "window",
  "document",
  "HTMLElement",
  "Node",
  "MutationObserver",
])
  globalThis[key] = dom.window[key];
Object.defineProperty(globalThis, "navigator", {
  value: dom.window.navigator,
  configurable: true,
});
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
window.PointerEvent = window.MouseEvent;
HTMLElement.prototype.setPointerCapture = () => {};
const { render, renderHook, fireEvent, act, cleanup } =
  await import("@testing-library/react");
const solve = (state) =>
  [...search({ rows: ROWS, cols: COLS, ...state })].at(-1);

test("React search state preserves shortest routes, demonstrations, editing and connected mazes", () => {
  const { result, unmount } = renderHook(usePathfinding);
  const perform = (name, ...args) =>
    act(() => result.current.actions[name](...args));
  for (const algorithm of ["astar", "dijkstra", "bfs"]) {
    perform("setAlgorithm", algorithm);
    for (const scenario of ["empty", "detour", "blocked"]) {
      perform("demo", scenario);
      const expected = solve(result.current.state);
      for (let i = 0; i < 541 && !result.current.state.finished; i++)
        perform("step");
      const state = result.current.state;
      assert.equal(state.finished, true);
      assert.equal(state.result.found, scenario !== "blocked");
      assert.equal(state.result.cost, expected.cost);
      assert.equal(state.parents.size, state.costs.size - 1);
      assert.equal(state.path.size, state.result.path.length);
      if (scenario === "empty") assert.equal(state.result.cost, 19);
      if (scenario === "detour") assert.ok(state.result.cost > 19);
    }
  }
  perform("demo", "empty");
  perform("paint", 10, "wall");
  perform("step");
  perform("reset");
  assert.ok(result.current.state.walls.has(10));
  assert.equal(result.current.state.visited.size, 0);
  perform("paint", 10, "start");
  assert.equal(result.current.state.start, 10);
  assert.equal(result.current.state.walls.has(10), false);
  perform("paint", result.current.state.goal, "start");
  assert.equal(result.current.state.start, 10);
  for (const [start, goal] of [
    [0, 539],
    [29, 510],
    [245, 264],
  ]) {
    perform("paint", start, "start");
    perform("paint", goal, "goal");
    for (let i = 0; i < 10; i++) {
      perform("maze");
      assert.equal(solve(result.current.state).found, true);
    }
  }
  perform("random");
  assert.equal(
    result.current.state.walls.has(result.current.state.start),
    false,
  );
  assert.equal(
    result.current.state.walls.has(result.current.state.goal),
    false,
  );
  perform("clearWalls");
  assert.equal(result.current.state.walls.size, 0);
  unmount();
  cleanup();
});

test("React components retain controls, keyboard editing, tooltips, marker dragging and learning views", (t) => {
  t.after(cleanup);
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const view = render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
  const byId = (id) => document.getElementById(id);
  const cells = () => [...document.querySelectorAll(".cell")];
  assert.equal(cells().length, 540);
  assert.equal(view.queryByText("Curiosity, with a sense of direction."), null);
  assert.equal(view.queryByText("THE IDEA BEHIND THE JOURNEY"), null);
  assert.equal(byId("speed-label").textContent, "Fast");
  fireEvent.change(byId("speed"), { target: { value: "2" } });
  assert.equal(byId("speed-label").textContent, "Relaxed");
  fireEvent.click(document.querySelector(`[data-algorithm=${"bfs"}]`));
  assert.match(byId("run").textContent, /BFS/);
  fireEvent.keyDown(cells()[10], { key: "Enter" });
  assert.ok(cells()[10].classList.contains("wall"));
  fireEvent.keyDown(cells()[10], { key: " " });
  assert.equal(cells()[10].classList.contains("wall"), false);
  fireEvent.focus(cells()[245]);
  assert.match(byId("node-tooltip").textContent, /Depth  0/);
  fireEvent.keyDown(cells()[245], { key: "ArrowRight" });
  assert.equal(document.activeElement, cells()[246]);
  fireEvent.keyDown(cells()[246], { key: "s" });
  assert.ok(cells()[246].classList.contains("start"));
  fireEvent.click(byId("demo-empty"));
  const grid = byId("grid");
  const down = (id) =>
    fireEvent.pointerDown(cells()[id], { button: 0, pointerId: 1 });
  const move = (id) => {
    document.elementFromPoint = () => cells()[id];
    fireEvent.pointerMove(grid, { clientX: 0, clientY: 0, pointerId: 1 });
  };
  down(10);
  move(12);
  fireEvent.pointerUp(grid);
  assert.ok([10, 11, 12].every((id) => cells()[id].classList.contains("wall")));
  down(12);
  move(10);
  fireEvent.pointerCancel(grid);
  assert.ok(
    [10, 11, 12].every((id) => !cells()[id].classList.contains("wall")),
  );
  down(245);
  move(100);
  fireEvent.pointerUp(grid);
  assert.ok(cells()[100].classList.contains("start"));
  assert.ok(![101, 102].some((id) => cells()[id].classList.contains("wall")));
  fireEvent.click(byId("demo-empty"));
  fireEvent.click(byId("step"));
  assert.equal(byId("explored").textContent, "1");
  assert.equal(byId("closed-count").textContent, "1");
  assert.match(byId("local-graph").textContent, /current/);
  fireEvent.click(byId("learning-toggle"));
  assert.equal(byId("learning-panel").hidden, true);
  fireEvent.click(byId("learning-toggle"));
  assert.equal(byId("learning-panel").hidden, false);
  fireEvent.click(byId("run"));
  assert.match(byId("run").textContent, /Pause search/);
  assert.equal(byId("step").disabled, true);
  assert.equal(byId("algorithm").getAttribute("aria-disabled"), "true");
  fireEvent.click(byId("run"));
  assert.match(byId("run").textContent, /Resume search/);
  assert.equal(byId("status-title").textContent, "Search paused");
  // A marker drag during playback pauses and resets the previous search.
  fireEvent.click(byId("run"));
  down(264);
  move(200);
  fireEvent.pointerUp(grid);
  assert.ok(cells()[200].classList.contains("goal"));
  assert.equal(byId("explored").textContent, "0");
  fireEvent.click(byId("demo-empty"));
  fireEvent.change(byId("speed"), { target: { value: "5" } });
  fireEvent.click(byId("run"));
  act(() => t.mock.timers.tick(1000));
  assert.equal(byId("status-title").textContent, "Destination reached");
  assert.equal(byId("path-length").textContent, "19");
  assert.equal(byId("cost").textContent, "19");
  fireEvent.click(byId("reset"));
  assert.equal(byId("path-length").textContent, "—");
  byId("speed-menu").open = true;
  fireEvent.keyDown(byId("speed-menu"), { key: "Escape" });
  assert.equal(byId("speed-menu").open, false);
  byId("landscape-menu").open = true;
  fireEvent.click(byId("clear-walls"));
  assert.equal(byId("landscape-menu").open, false);
  view.unmount();
  cleanup();
});

test("Every course grid algorithm is selectable and produces an honest result", (t) => {
  t.after(cleanup);
  const view = render(<App />);
  const byId = id => document.getElementById(id);
  for (const algorithm of ["dfs", "greedy", "hill"]) {
    fireEvent.click(document.querySelector(`[data-algorithm=${algorithm}]`));
    fireEvent.click(byId("demo-empty"));
    assert.ok(byId("algorithm-description").textContent.length > 30);
    for (let i = 0; i < 541 && !byId("step").disabled; i++) fireEvent.click(byId("step"));
    assert.equal(byId("status-title").textContent, "Destination reached");
    assert.match(byId("status-detail").textContent, /Found a route/);
    assert.ok(!byId("status-detail").textContent.includes("shortest"));
  }
  fireEvent.click(byId("demo-detour"));
  for (let i = 0; i < 541 && !byId("step").disabled; i++) fireEvent.click(byId("step"));
  assert.match(byId("status-detail").textContent, /local minimum/);
  view.unmount();
});

test("Cell details, graph labels and OPEN columns match the algorithm", (t) => {
  t.after(cleanup);
  const view = render(<App />);
  const byId = id => document.getElementById(id);
  for (const [algorithm, labels] of [
    ["astar", ["g(n)", "h(n)", "f(n)"]],
    ["dijkstra", ["g(n)"]],
    ["greedy", ["h(n)"]],
    ["hill", ["h(n)"]],
    ["bfs", ["Depth"]], ["dfs", ["Depth"]],
  ]) {
    fireEvent.click(document.querySelector(`[data-algorithm=${algorithm}]`));
    fireEvent.focus(document.querySelector('[data-id="245"]'));
    fireEvent.click(byId("step"));
    const tooltip = byId("node-tooltip").textContent;
    const graph = byId("local-graph").textContent;
    const headers = [...document.querySelectorAll(".learning-table th")].map(th => th.textContent);
    for (const label of ["g(n)", "h(n)", "f(n)", "Depth"]) {
      assert.equal(tooltip.includes(label), labels.includes(label), `${algorithm} tooltip ${label}`);
      assert.equal(graph.includes(label), labels.includes(label), `${algorithm} graph ${label}`);
      assert.equal(headers.includes(label), labels.includes(label), `${algorithm} table ${label}`);
    }
    assert.equal(Boolean(byId("problem-heuristic")), labels.includes("h(n)"));
  }
  fireEvent.keyDown(document.querySelector('[data-id="10"]'), { key: "Enter" });
  fireEvent.focus(document.querySelector('[data-id="10"]'));
  assert.match(byId("node-tooltip").textContent, /not traversable/);
  assert.ok(!byId("node-tooltip").textContent.includes("Depth"));
  view.unmount();
});

test("Weighted terrain edits, costs and algorithm changes stay consistent", (t) => {
  t.after(cleanup);
  const { result, unmount } = renderHook(usePathfinding);
  const perform = (name, ...args) => act(() => result.current.actions[name](...args));
  perform("demo", "weighted");
  perform("setAlgorithm", "bfs");
  const bfs = solve(result.current.state);
  assert.equal(bfs.path.length - 1, 19);
  assert.equal(bfs.cost, 91);
  perform("setAlgorithm", "dijkstra");
  assert.equal(result.current.state.terrain.size, 18);
  assert.equal(solve(result.current.state).cost, 21);
  perform("paint", 10, "terrain");
  assert.equal(result.current.state.terrain.get(10), 5);
  perform("step");
  perform("reset");
  assert.equal(result.current.state.terrain.get(10), 5);
  perform("paint", 10, "wall");
  assert.ok(!result.current.state.terrain.has(10));
  perform("paint", 10, "terrain");
  assert.ok(!result.current.state.walls.has(10));
  perform("paint", 10, "erase");
  assert.ok(!result.current.state.terrain.has(10));
  perform("clearTerrain");
  assert.equal(result.current.state.terrain.size, 0);
  unmount();
  const view = render(<App />);
  const byId = id => document.getElementById(id);
  assert.equal(document.querySelectorAll("[data-algorithm]").length, 6);
  fireEvent.change(byId("paint-tool"), { target: { value: "terrain" } });
  fireEvent.change(byId("terrain-cost"), { target: { value: "9" } });
  const cell = document.querySelector('[data-id="10"]');
  fireEvent.pointerDown(cell, { button: 0, pointerId: 1 });
  fireEvent.pointerUp(byId("grid"));
  assert.ok(cell.classList.contains("weighted"));
  assert.equal(cell.querySelector(".terrain-badge").textContent, "9");
  fireEvent.focus(cell);
  assert.match(byId("node-tooltip").textContent, /Terrain cost: 9/);
  fireEvent.keyDown(cell, { key: "w" });
  assert.ok(!cell.classList.contains("weighted"));
  fireEvent.click(byId("demo-weighted"));
  assert.equal(document.querySelectorAll(".weighted").length, 18);
  fireEvent.click(byId("clear-terrain"));
  assert.equal(document.querySelectorAll(".weighted").length, 0);
  view.unmount();
});

test("Dropdowns are mutually exclusive and dismiss with outside click or Escape", (t) => {
  t.after(cleanup);
  render(<App />);
  const byId = id => document.getElementById(id);
  const open = id => {
    const menu = byId(id);
    fireEvent.click(menu.querySelector("summary"));
    assert.equal(menu.open, true);
    assert.equal(document.querySelectorAll('details[name="visualizer-menu"][open]').length, 1);
  };
  open("landscape-menu");
  open("terrain-menu");
  assert.equal(byId("landscape-menu").open, false);
  fireEvent.change(byId("terrain-cost"), { target: { value: "3" } });
  assert.equal(byId("terrain-menu").open, true);
  open("speed-menu");
  assert.equal(byId("terrain-menu").open, false);
  fireEvent.keyDown(document.body, { key: "Escape" });
  assert.equal(byId("speed-menu").open, false);
  assert.equal(document.activeElement, byId("speed-menu").querySelector("summary"));
  open("terrain-menu");
  fireEvent.click(byId("algorithm"));
  assert.equal(byId("terrain-menu").open, false);
  open("landscape-menu");
  fireEvent.click(byId("algorithm-description"));
  assert.equal(byId("landscape-menu").open, false);
});

test("Navbar algorithm menu highlights selection and closes after choosing", (t) => {
  t.after(cleanup);
  render(<App />);
  const menu = document.getElementById("algorithm-menu");
  fireEvent.click(menu.querySelector("summary"));
  assert.equal(menu.open, true);
  const dfs = document.querySelector('[data-algorithm="dfs"]');
  fireEvent.click(dfs);
  assert.equal(menu.open, false);
  assert.equal(dfs.getAttribute("aria-pressed"), "true");
  assert.match(menu.querySelector("summary").textContent, /DFS/);
  fireEvent.click(document.getElementById("terrain-menu").querySelector("summary"));
  fireEvent.click(menu.querySelector("summary"));
  assert.equal(document.getElementById("terrain-menu").open, false);
});

test("Theme toggle applies light/dark palettes and persists across remounts", (t) => {
  t.after(() => { cleanup(); window.localStorage.removeItem("pathfinding-theme-v3"); document.documentElement.dataset.theme = "light"; });
  window.localStorage.setItem("pathfinding-theme-v3", "light");
  const view = render(<App />);
  const button = document.getElementById("theme-toggle");
  assert.equal(document.documentElement.dataset.theme, "light");
  fireEvent.click(button);
  assert.equal(document.documentElement.dataset.theme, "dark");
  assert.equal(window.localStorage.getItem("pathfinding-theme-v3"), "dark");
  assert.equal(button.getAttribute("aria-label"), "Switch to light theme");
  view.unmount();
  const second = render(<App />);
  assert.equal(document.documentElement.dataset.theme, "dark");
  fireEvent.click(document.getElementById("theme-toggle"));
  assert.equal(document.documentElement.dataset.theme, "light");
  second.unmount();
});

test("Light is the default theme for a fresh visit", (t) => {
  t.after(() => { cleanup(); window.localStorage.removeItem("pathfinding-theme-v3"); });
  window.localStorage.removeItem("pathfinding-theme-v3");
  render(<App />);
  assert.equal(document.documentElement.dataset.theme, "light");
  assert.equal(document.getElementById("theme-toggle").getAttribute("aria-label"), "Switch to dark theme");
});
