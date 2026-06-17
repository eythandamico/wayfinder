import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // Order matters: more-specific first so "@/api/*" hits the
      // functions/ tree instead of being swallowed by "@/" → src/.
      "@/api": path.resolve(__dirname, "./functions/api"),
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    // Proxy API calls to wrangler pages dev so the trading desk's
    // /api/* endpoints work in dev. Start `npm run pages:dev` in a
    // second terminal once you need the API routes; until then the
    // panels that call them will just show empty states.
    proxy: {
      "/api": {
        target: "http://localhost:8788",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
