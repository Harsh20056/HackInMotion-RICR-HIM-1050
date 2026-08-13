import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // No manualChunks: letting the bundler split per dynamic-import
    // boundary keeps route-specific dependencies (Leaflet, recharts,
    // pdfjs-dist, admin-only Radix dialogs) out of the eagerly-loaded
    // entry bundle. A manual vendor grouping was tried and made things
    // worse here — it forced those libraries into eagerly-fetched chunks.
  },
}));
