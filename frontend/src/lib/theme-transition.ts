import { flushSync } from "react-dom";

let pointerOrigin: { x: number; y: number } | null = null;

if (typeof window !== "undefined") {
  window.addEventListener(
    "pointerdown",
    (event) => {
      pointerOrigin = { x: event.clientX, y: event.clientY };
    },
    { capture: true, passive: true },
  );
}

function setRippleOrigin() {
  const x = pointerOrigin?.x ?? window.innerWidth / 2;
  const y = pointerOrigin?.y ?? window.innerHeight / 2;
  const distanceX = Math.max(x, window.innerWidth - x);
  const distanceY = Math.max(y, window.innerHeight - y);
  const radius = Math.hypot(distanceX, distanceY);
  const root = document.documentElement;
  root.style.setProperty("--vt-x", `${x}px`);
  root.style.setProperty("--vt-y", `${y}px`);
  root.style.setProperty("--vt-r", `${radius}px`);
}

export function runWithThemeTransition(callback: () => void): void {
  const reduced =
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    document.documentElement.classList.contains("reduce-motion");

  if (
    reduced ||
    document.visibilityState === "hidden" ||
    typeof document.startViewTransition !== "function"
  ) {
    callback();
    return;
  }

  setRippleOrigin();
  let updated = false;
  const commit = () => {
    updated = true;
    flushSync(callback);
  };

  try {
    const transition = document.startViewTransition(commit);
    transition.finished.catch(() => {});
  } catch {
    if (!updated) commit();
  }
}

export function nextThemeMode(currentDark: boolean): "light" | "dark" {
  return currentDark ? "light" : "dark";
}
