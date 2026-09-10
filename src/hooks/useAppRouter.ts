import { useState } from "react";

export type AppRoute = string;

export function useAppRouter(initialRoute: AppRoute) {
  const [route, setRoute] = useState(initialRoute);
  const [history, setHistory] = useState<AppRoute[]>([]);

  function goTo(nextRoute: AppRoute) {
    setHistory(current => [...current, route]);
    setRoute(nextRoute);
  }

  function replace(nextRoute: AppRoute) {
    setHistory([]);
    setRoute(nextRoute);
  }

  function goBack() {
    const previous = history[history.length - 1];
    if (!previous) return;
    setHistory(current => current.slice(0, -1));
    setRoute(previous);
  }

  return { route, goTo, replace, goBack };
}
