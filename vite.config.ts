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
      "/api/asaas-proxy": {
        target: "https://kuszskrqzxwpzsmfsjwg.supabase.co/functions/v1",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => "/asaas-proxy",
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            proxyReq.setHeader("apikey", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1c3pza3Jxenh3cHpzbWZzandnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MTA0MzYsImV4cCI6MjA3NjI4NjQzNn0.pF6l6M7zWNohrbsm-ugc7YOO0QlvjPq7VeiQk8J1Dbg");
            proxyReq.setHeader("Authorization", "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1c3pza3Jxenh3cHpzbWZzandnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MTA0MzYsImV4cCI6MjA3NjI4NjQzNn0.pF6l6M7zWNohrbsm-ugc7YOO0QlvjPq7VeiQk8J1Dbg");
          });
        },
      },
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
