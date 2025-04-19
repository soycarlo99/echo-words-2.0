import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, "../EchoWords.Server/wwwroot"),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5086", // Match your ASP.NET Core port
        changeOrigin: true,
      },
      "/gameHub": {
        target: "http://localhost:5086",
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
