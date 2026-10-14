import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { nodeMetrics } from "../nodeMetrics.js";
import { ROWS, COLS, TOTAL, formatCost } from "../usePathfinding.js";

export default function Grid({ state, actions }) {
  const [focused, setFocused] = useState(state.start);
  const [inspected, setInspected] = useState(null);
  const [position, setPosition] = useState({ left: 8, top: 8 });
  const [draggingMarker, setDraggingMarker] = useState(false);
  const drag = useRef(null),
    cells = useRef([]),
    tooltip = useRef(null);
  const hideTooltip = () => setInspected(null);
  useEffect(() => {
    window.addEventListener("resize", hideTooltip);
    window.addEventListener("scroll", hideTooltip, true);
    return () => {
      window.removeEventListener("resize", hideTooltip);
      window.removeEventListener("scroll", hideTooltip, true);
    };
  }, []);
  const g =
    inspected === null || state.walls.has(inspected)
      ? Infinity
      : inspected === state.start
        ? 0
        : (state.costs.get(inspected) ?? Infinity);
  const label = state.walls.has(inspected)
    ? "Wall · not traversable"
    : !Number.isFinite(g)
      ? "Undiscovered"
      : state.visited.has(inspected)
        ? "Explored"
        : inspected === state.start
          ? "Start"
          : "Frontier";
  const details = inspected === null ? "" : [
    `Row ${Math.floor(inspected / COLS) + 1} | Column ${(inspected % COLS) + 1}`,
    label,
    ...(state.walls.has(inspected) ? [] : [`Terrain cost: ${state.terrain.get(inspected) ?? 1} (paid when entering)`]),
    ...(state.walls.has(inspected) ? [] : ["", ...nodeMetrics(state, inspected, COLS).map(
      metric => `${metric.label}  ${formatCost(metric.value)}   |   ${metric.description}`,
    )]),
  ].join("\n");
  useLayoutEffect(() => {
    if (inspected === null) return;
    const rect = cells.current[inspected].getBoundingClientRect(),
      tip = tooltip.current;
    const top = rect.bottom + 10;
    setPosition({
      left: Math.max(
        8,
        Math.min(rect.left, window.innerWidth - tip.offsetWidth - 8),
      ),
      top: Math.max(
        8,
        top + tip.offsetHeight <= window.innerHeight - 8
          ? top
          : rect.top - tip.offsetHeight - 10,
      ),
    });
  }, [inspected, details]);
  const inspect = (id) => {
    if (!drag.current) setInspected(id);
  };
  const finishDrag = () => {
    drag.current = null;
    setDraggingMarker(false);
  };
  const pointerDown = (event) => {
    const cell = event.target.closest(".cell");
    if (!cell || event.button !== 0) return;
    const id = Number(cell.dataset.id),
      marker = id === state.start ? "start" : id === state.goal ? "goal" : null;
    if (state.running && !marker) return;
    if (state.running) actions.pauseForMarker();
    hideTooltip();
    event.preventDefault();
    const tool = marker ?? (state.tool === "wall" && state.walls.has(id) ? "erase" : state.tool);
    drag.current = { tool, last: id };
    setDraggingMarker(Boolean(marker));
    if (!marker) actions.paint(id, tool);
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const pointerMove = (event) => {
    if (!drag.current) return;
    const cell = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest(".cell");
    if (!cell || !event.currentTarget.contains(cell)) {
      drag.current.last = null;
      return;
    }
    const id = Number(cell.dataset.id),
      { tool, last } = drag.current;
    if (last === id) return;
    if (tool === "start" || tool === "goal") actions.paint(id, tool);
    else {
      const from = last ?? id,
        x0 = from % COLS,
        y0 = Math.floor(from / COLS),
        x1 = id % COLS,
        y1 = Math.floor(id / COLS);
      const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let i = 0; i <= steps; i++)
        actions.paint(
          Math.round(y0 + (y1 - y0) * (steps ? i / steps : 0)) * COLS +
            Math.round(x0 + (x1 - x0) * (steps ? i / steps : 0)),
          tool,
        );
    }
    drag.current.last = id;
  };
  const keyDown = (event) => {
    if (event.key === "Escape") {
      hideTooltip();
      return;
    }
    const cell = event.target.closest(".cell");
    if (!cell) return;
    const id = Number(cell.dataset.id),
      offsets = {
        ArrowUp: -COLS,
        ArrowDown: COLS,
        ArrowLeft: -1,
        ArrowRight: 1,
      };
    if (event.key in offsets) {
      event.preventDefault();
      const next = id + offsets[event.key];
      if (
        next >= 0 &&
        next < TOTAL &&
        !(event.key === "ArrowLeft" && id % COLS === 0) &&
        !(event.key === "ArrowRight" && id % COLS === COLS - 1)
      ) {
        setFocused(next);
        cells.current[next].focus();
      }
    } else if (["s", "g"].includes(event.key.toLowerCase())) {
      event.preventDefault();
      actions.paint(id, event.key.toLowerCase() === "s" ? "start" : "goal");
    } else if (event.key.toLowerCase() === "w") {
      event.preventDefault();
      actions.paint(id, state.terrain.has(id) ? "erase" : "terrain");
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      actions.paint(id, state.walls.has(id) ? "erase" : "wall");
    }
  };
  return (
    <>
      <div
        id="grid"
        className={draggingMarker ? "dragging-marker" : ""}
        role="grid"
        aria-rowcount={ROWS}
        aria-colcount={COLS}
        aria-label="Editable pathfinding grid. Use arrow keys to navigate and Enter or Space to toggle walls. Press W to toggle weighted terrain. Press S or G to move start or goal to the focused square."
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onLostPointerCapture={finishDrag}
        onPointerLeave={hideTooltip}
        onKeyDown={keyDown}
      >
        {Array.from({ length: TOTAL }, (_, id) => {
          const kind =
            id === state.start
              ? "start"
              : id === state.goal
                ? "goal"
                : state.walls.has(id)
                  ? "wall"
                  : state.path.has(id)
                    ? "path"
                    : state.visited.has(id)
                      ? "visited"
                      : state.frontier.has(id)
                        ? "frontier"
                        : "";
          return (
            <button
              key={id}
              ref={(element) => {
                cells.current[id] = element;
              }}
              className={`cell ${kind} ${state.terrain.has(id) && !state.walls.has(id) ? "weighted" : ""}`}
              data-id={id}
              role="gridcell"
              tabIndex={id === focused ? 0 : -1}
              aria-label={`Row ${Math.floor(id / COLS) + 1}, column ${(id % COLS) + 1}, ${kind || "empty"}, terrain cost ${state.terrain.get(id) ?? 1}`}
              aria-describedby={inspected === id ? "node-tooltip" : undefined}
              onPointerOver={() => inspect(id)}
              onFocus={() => inspect(id)}
              onBlur={hideTooltip}
            >
              {state.terrain.has(id) && !state.walls.has(id) && <span className="terrain-badge">{state.terrain.get(id)}</span>}
              {kind === "start" ? "↗" : kind === "goal" ? "⚑" : ""}
            </button>
          );
        })}
      </div>
      <div
        ref={tooltip}
        id="node-tooltip"
        role="tooltip"
        hidden={inspected === null}
        style={position}
      >
        {details}
      </div>
    </>
  );
}
