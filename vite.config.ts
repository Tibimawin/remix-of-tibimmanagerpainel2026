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

const m3uDevProxyPlugin = () => ({
  name: "m3u-dev-proxy-plugin",
  configureServer(server: any) {
    server.middlewares.use("/api/m3u-proxy", async (req: any, res: any) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "*");

      if (req.method === "OPTIONS") {
        res.statusCode = 200;
        return res.end();
      }

      let rawBody = "";
      req.on("data", (chunk: any) => {
        rawBody += chunk;
      });

      req.on("end", async () => {
        try {
          let body: any = {};
          if (req.method === "POST" && rawBody) {
            try {
              body = JSON.parse(rawBody);
            } catch {
              body = {};
            }
          }

          let urlsToTry: string[] = [body.url, ...(Array.isArray(body.urls) ? body.urls : [])].filter(Boolean);

          if (urlsToTry.length === 0 && req.url) {
            try {
              const urlObj = new URL(req.url, "http://localhost:3000");
              const qUrl = urlObj.searchParams.get("url");
              if (qUrl) urlsToTry.push(qUrl);
            } catch {}
          }

          if (urlsToTry.length === 0) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            return res.end(JSON.stringify({ error: "URL do servidor é obrigatória" }));
          }

          const userAgent = body.userAgent || "IPTVSmartersPro/1.0.0 (Android; 9)";
          const timeout = Number(body.timeout) || 75000;

          let lastError: any = null;
          let lastStatus = 500;

          for (const currentUrl of urlsToTry) {
            try {
              const cleanUrl = currentUrl.trim().startsWith("http") ? currentUrl.trim() : `http://${currentUrl.trim()}`;
              console.log("[m3u-dev-proxy] Conectando:", cleanUrl);
              const controller = new AbortController();
              const timer = setTimeout(() => controller.abort(), timeout);

              const upstreamRes = await fetch(cleanUrl, {
                method: "GET",
                headers: {
                  "User-Agent": userAgent,
                  "Accept": "*/*",
                  "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
                },
                signal: controller.signal,
              });

              clearTimeout(timer);

              if (!upstreamRes.ok) {
                lastStatus = upstreamRes.status;
                lastError = new Error(`Servidor IPTV retornou status ${upstreamRes.status}`);
                continue;
              }

              const contentType = upstreamRes.headers.get("content-type") || "text/plain";
              const content = await upstreamRes.text();

              res.statusCode = 200;
              res.setHeader("Content-Type", contentType);
              console.log(`[m3u-dev-proxy] ✅ Sucesso! Recebidos ${(content.length / 1024).toFixed(1)} KB`);
              return res.end(content);
            } catch (err: any) {
              lastError = err;
              console.warn("[m3u-dev-proxy] Falha na URL:", currentUrl, err?.message);
            }
          }

          res.statusCode = lastStatus >= 400 && lastStatus < 600 ? lastStatus : 500;
          res.setHeader("Content-Type", "application/json");
          return res.end(JSON.stringify({
            error: lastError?.message || "Não foi possível conectar ao servidor IPTV.",
            lastUrl: urlsToTry[0],
          }));
        } catch (fatal: any) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          return res.end(JSON.stringify({ error: fatal?.message || "Erro interno no proxy IPTV" }));
        }
      });
    });
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: true,
    proxy: {
      "/api": {
        target: "https://tibimmanagerpainel2026-git-main-apktibim-1235s-projects.vercel.app",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path,
        configure: (proxy, options) => {
          proxy.on("error", (err) => {
            console.log("⚠️ [PROXY ERROR]:", err.message);
          });
          proxy.on("proxyReq", (proxyReq, req) => {
            const target = (options && typeof options === "object" && "target" in options && options.target) || "https://tibimmanagerpainel2026-git-main-apktibim-1235s-projects.vercel.app";
            const url = req.url || "";
            console.log("🔄 [PROXY] Redirecionando:", url, "→", target + url);
          });
          proxy.on("proxyRes", (proxyRes) => {
            delete proxyRes.headers["access-control-allow-credentials"];
            proxyRes.headers["access-control-allow-origin"] = "*";
          });
        },
      },
    },
  },
  plugins: [m3uDevProxyPlugin(), react(), mode === "development" && componentTagger(), versionFilePlugin()].filter(Boolean),
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
    chunkSizeWarningLimit: 1200,
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
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('react/') || id.includes('react-router-dom')) {
              return 'vendor-react';
            }
            if (id.includes('@radix-ui') || id.includes('tailwind-merge') || id.includes('class-variance-authority') || id.includes('clsx')) {
              return 'vendor-ui';
            }
            if (id.includes('firebase')) {
              return 'vendor-firebase';
            }
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('recharts') || id.includes('d3-')) {
              return 'vendor-charts';
            }
            if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('html-to-image')) {
              return 'vendor-export';
            }
            if (id.includes('framer-motion')) {
              return 'vendor-framer';
            }
            if (id.includes('@tanstack')) {
              return 'vendor-query';
            }
          }
        },
      },
    },
  },
  esbuild: {
    drop: mode === "production" ? ["debugger"] : [],
    legalComments: "none",
  },
}));
