# Pathfinding Visualizer

A Vite React app for exploring A*, uniform-cost search / Dijkstra, BFS, DFS, greedy best-first, and hill climbing. The existing grid, styling, animations, metrics, and learning workspace are preserved. All search runs in the browser; Python is not required.

## Run

From `Project 2`:

```powershell
npm install
npm run dev
```

Open the local URL printed by Vite (normally http://localhost:5173). This version uses Vite rather than opening `index.html` directly.

```powershell
npm run build    # Production output in dist/
npm run preview  # Preview the production build
npm test         # Search and React interaction checks
```

## Source layout

- `src/App.jsx`: assembles the page.
- `src/components/`: header controls, workspace and statistics, editable grid and tooltips, and learning panels.
- `src/usePathfinding.js`: React state, playback, editing, demonstrations, and maze generation.
- `src/search.js`: independent search engine, shared by the visualizer and tests.
- `src/styles.css`: the existing responsive design.
- `tests/`: algorithm and React interaction regression checks.

The requested “The idea behind the journey” explanation and formula section have been removed. The older standalone controller scripts have been replaced by React components and a hook.

## Explore

Draw walls by dragging from an empty square, or erase by dragging from a wall. Drag the start and goal markers to move them. Moving a marker during playback pauses and resets the search. Markers cannot overlap.

Visualize runs the search; Pause and Resume control playback. Step expands one node. Reset search preserves walls and markers. Generate maze, Scatter walls, and Clear all walls are in the landscape menu. Animation speed is in the speedometer menu.

Tab to the grid and use arrow keys to navigate. Enter or Space toggles a wall; S or G moves the start or goal. Hover or focus a square to inspect g, h, and f. Escape dismisses the tooltip or closes either control menu.

Learning mode includes problem formulation, a graph of the current node and its legal neighbors, and live OPEN/CLOSED lists with parent links. Empty map, Wall detour, and Blocked goal load reproducible demonstrations.

## Search details

The 30 by 18 grid has 540 nodes. The interface uses four-direction movement with cost 1 per edge. A* uses Manhattan distance, Dijkstra uses h = 0, and BFS explores by depth. All three find shortest routes on this uniform grid. The search engine also supports diagonals for independent tests.

Explored nodes include the start and, on success, the goal. Path length counts moves; path cost sums edge costs. Search time measures generator computation, excluding rendering and animation delays. The final route is highlighted in gold.

Google Fonts are optional; system fonts work offline.

## Algorithms and weighted terrain

Six algorithms are available: BFS, DFS, uniform-cost search / Dijkstra, greedy best-first, A*, and hill climbing.

Choose Walls, Weighted terrain, or Erase in the Draw control and drag across the grid. Weighted terrain can cost 3, 5 or 9; normal cells cost 1. The number is the cost paid when entering that cell. The start costs nothing initially. Press W on a focused cell to toggle terrain. Clear terrain removes weights; Reset search and algorithm changes preserve the map. Demos and new landscape generation start with fresh terrain.

Weighted demo places cost-5 cells on the direct route. BFS finds a 19-step route costing 91. Dijkstra and A* take a 21-step route costing 21. BFS optimizes step count, while Dijkstra and A* optimize total terrain cost. DFS, greedy and hill climbing do not guarantee a cheapest route; hill climbing can get stuck even if a route exists. Manhattan distance remains admissible because every legal move costs at least 1.

Cell details, graph labels and OPEN columns show only relevant quantities: A* shows g(n), h(n), f(n); Dijkstra shows g(n); greedy and hill climbing show h(n); BFS and DFS show traversal depth. Terrain entry cost is displayed separately. Walls have no search values.

AO*, minimax, constraint satisfaction and other handout techniques need their own problem models and are outside this route grid.
