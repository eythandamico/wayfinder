import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@fontsource/geist-mono/400.css";
import "@fontsource/geist-mono/600.css";
import "./styles/globals.css";
import { App } from "./App";

// StrictMode is intentionally NOT used here. The TradingView embed
// script (src/routes/shells/_components/ChartPanel.tsx) doesn't survive
// React's dev-time double-mount — its async iframe setup races against
// our second mount and throws an uncaught querySelector TypeError.
// The script is third-party and not patchable from the host page; the
// console filter inside ChartPanel covers its other noise. Re-enable
// StrictMode only if/when the chart is swapped for a library we own.
createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
