import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  base: "./",
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173
  },
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
        "atelier-vault-7291": resolve(__dirname, "atelier-vault-7291.html"),
        client: resolve(__dirname, "client.html")
      }
    }
  }
});
