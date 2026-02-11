import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return

          if (id.includes("xlsx")) {
            return "vendor-xlsx"
          }

          if (id.includes("jszip")) {
            return "vendor-jszip"
          }

          if (id.includes("html2canvas")) {
            return "vendor-html2canvas"
          }

          if (id.includes("@radix-ui")) {
            return "vendor-radix"
          }

          if (id.includes("lucide-react")) {
            return "vendor-icons"
          }

          if (id.includes("sonner")) {
            return "vendor-sonner"
          }

          if (id.includes("react-dom") || id.includes("react/jsx-runtime") || id.includes("/react/")) {
            return "vendor-react"
          }
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
