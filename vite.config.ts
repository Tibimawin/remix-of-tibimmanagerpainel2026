import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";

const BUILD_ID = String(Date.now());

const versionFilePlugin = () => ({
  name: "version-file-plugin",
  apply: "build" as const,
  closeBundle() {
    try {
      const outDir = path.resolve(__dirname, "dist");
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(
        path.join(outDir, "version.json"),
        JSON.stringify({ version: BUILD_ID, builtAt: new Date().toISOString() })
      );
    } catch (e) {
      console.warn("[version-file-plugin] failed:", e);
    }
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 3000,
    proxy: {
      "/api": {
        target: "https://tibimmanagerpainel2026-git-main-apktibim-1235s-projects.vercel.app",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path,
        configure: (proxy, options) => {
          proxy.on("error", (err, req, res) => {
            console.log("⚠️ [PROXY ERROR]:", err.message);
          });
          proxy.on("proxyReq", (proxyReq, req, res) => {
            const target = (options && typeof options === "object" && "target" in options && options.target) || "https://tibimmanagerpainel2026-git-main-apktibim-1235s-projects.vercel.app";
            const url = req.url || "";
            console.log("🔄 [PROXY] Redirecionando:", url, "→", target + url);
          });
        },
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger(), versionFilePlugin()].filter(Boolean),
  define: {
    __APP_VERSION__: JSON.stringify(BUILD_ID),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    sourcemap: false,
    minify: "esbuild",
    cssMinify: true,
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-[hash].js`,
        chunkFileNames: `assets/[name]-[hash].js`,
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return `assets/[name]-v${BUILD_ID.slice(-6)}-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
      },
    },
  },
  esbuild: {
    drop: mode === "production" ? ["debugger"] : [],
    legalComments: "none",
  },
}));
