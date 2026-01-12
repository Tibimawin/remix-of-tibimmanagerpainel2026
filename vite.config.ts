import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/api": {
        target: "https://tibimmanagerpain2025.vercel.app",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path,
        configure: (proxy, options) => {
          proxy.on("error", (err, req, res) => {
            console.log("⚠️ [PROXY ERROR]:", err.message);
          });
          proxy.on("proxyReq", (proxyReq, req, res) => {
            const target = (options && (options as any).target) || "https://tibimmanagerpain2025.vercel.app";
            const url = req.url || "";
            console.log("🔄 [PROXY] Redirecionando:", url, "→", target + url);
          });
        },
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
