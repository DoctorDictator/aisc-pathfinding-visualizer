import React, { useEffect, useState } from "react";
import Header from "./components/Header.jsx";
import Workspace from "./components/Workspace.jsx";
import LearningPanel from "./components/LearningPanel.jsx";
import usePathfinding from "./usePathfinding.js";
export default function App() {
  const { state, actions } = usePathfinding();
  const [theme, setTheme] = useState(() => {
    try {
      const saved = window.localStorage.getItem("pathfinding-theme-v3");
      if (saved === "light" || saved === "dark") return saved;
    } catch {}
    return "light";
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { window.localStorage.setItem("pathfinding-theme-v3", theme); } catch {}
  }, [theme]);
  useEffect(() => {
    const menus = () => [...document.querySelectorAll('details[name="visualizer-menu"]')];
    const closeOthers = active => menus().forEach(menu => {
      if (menu !== active) menu.open = false;
    });
    const dismiss = event => {
      const active = event.target.closest('details[name="visualizer-menu"]');
      closeOthers(active);
    };
    const toggle = event => {
      if (event.target.matches?.('details[name="visualizer-menu"]') && event.target.open)
        closeOthers(event.target);
    };
    const escape = event => {
      if (event.key !== "Escape") return;
      const active = menus().find(menu => menu.open);
      if (active) {
        active.open = false;
        active.querySelector("summary").focus();
      }
    };
    document.addEventListener("pointerdown", dismiss, true);
    document.addEventListener("click", dismiss, true);
    document.addEventListener("focusin", dismiss);
    document.addEventListener("toggle", toggle, true);
    document.addEventListener("keydown", escape, true);
    return () => {
      document.removeEventListener("pointerdown", dismiss, true);
      document.removeEventListener("click", dismiss, true);
      document.removeEventListener("focusin", dismiss);
      document.removeEventListener("toggle", toggle, true);
      document.removeEventListener("keydown", escape, true);
    };
  }, []);
  return (
    <>
      <Header state={state} actions={actions} theme={theme} toggleTheme={() => setTheme(current => current === "light" ? "dark" : "light")} />
      <main>
        <Workspace state={state} actions={actions} />
        <LearningPanel state={state} actions={actions} />
        <footer>
          <span>Pathfinding Visualizer</span>
          <span>Explore. Find a path.</span>
        </footer>
      </main>
    </>
  );
}
