import { lazy, Suspense, useEffect } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";

// Lazy-load route trees so the marketing landing doesn't pay for
// the trading desk bundle (and vice versa). Each route boundary
// becomes its own chunk.
const MarketingPage = lazy(() =>
  import("./routes/marketing").then((m) => ({ default: m.MarketingPage })),
);
const ShellsPage = lazy(() =>
  import("./routes/shells/page").then((m) => ({ default: m.ShellsPage })),
);
const DSPage = lazy(() =>
  import("./routes/ds/page").then((m) => ({ default: m.DSPage })),
);
const PathsPage = lazy(() =>
  import("./routes/paths/page").then((m) => ({ default: m.PathsPage })),
);

// Per-route document titles. Next handled this via Metadata exports;
// here we update document.title from useLocation. Tiny but real for
// browser tabs, history, and screen readers announcing the page.
const ROUTE_TITLES: Record<string, string> = {
  "/": "Wayfinder — Your crypto agent, your way.",
  "/shells": "Wayfinder — Trading desk",
  "/ds": "Wayfinder — Design system",
  "/paths": "Wayfinder — Paths catalog",
};

function useRouteTitle() {
  const location = useLocation();
  useEffect(() => {
    document.title =
      ROUTE_TITLES[location.pathname] ??
      "Wayfinder — Your trading desk, intelligent.";
  }, [location.pathname]);
}

export function App() {
  useRouteTitle();
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<MarketingPage />} />
        <Route path="/shells" element={<ShellsPage />} />
        <Route path="/ds" element={<DSPage />} />
        <Route path="/paths" element={<PathsPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

function RouteFallback() {
  // Match the body bg so route swaps don't flash a white frame.
  return <div className="min-h-screen bg-background" />;
}

function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 bg-background px-6 text-center text-foreground">
      <p className="font-mono text-caption uppercase tracking-[0.22em] text-muted-foreground">
        404 · Path not found
      </p>
      <h1 className="font-heading text-5xl font-semibold tracking-tight">
        Off the map.
      </h1>
      <p className="max-w-md text-pretty text-body text-muted-foreground">
        This route doesn't exist. The trading desk is at{" "}
        <Link to="/shells" className="text-primary underline-offset-4 hover:underline">
          /shells
        </Link>
        , or head back to the{" "}
        <Link to="/" className="text-primary underline-offset-4 hover:underline">
          landing
        </Link>
        .
      </p>
    </main>
  );
}
