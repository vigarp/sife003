import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";

function apiDevPlugin() {
  return {
    name: "vite-api-dev-server",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith("/api")) {
          return next();
        }

        try {
          const urlObj = new URL(req.url, "http://localhost");
          const pathname = urlObj.pathname;

          let handlerModule = null;
          if (pathname === "/api/agenda") {
            handlerModule = await import("./api/agenda.js");
          } else if (pathname === "/api/auth/login") {
            handlerModule = await import("./api/auth/login.js");
          } else if (pathname === "/api/auth/me") {
            handlerModule = await import("./api/auth/me.js");
          } else if (pathname === "/api/auth/change-password") {
            handlerModule = await import("./api/auth/change-password.js");
          } else if (pathname === "/api/presensi") {
            handlerModule = await import("./api/presensi/index.js");
          } else if (pathname === "/api/presensi/sync") {
            handlerModule = await import("./api/presensi/sync.js");
          } else if (pathname === "/api/presensi/students") {
            handlerModule = await import("./api/presensi/students.js");
          } else if (pathname === "/api/presensi/courses") {
            handlerModule = await import("./api/presensi/courses.js");
          }

          if (!handlerModule) {
            return next();
          }

          req.query = Object.fromEntries(urlObj.searchParams.entries());

          res.status = (code) => {
            res.statusCode = code;
            return res;
          };
          res.json = (data) => {
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(data));
            return res;
          };

          if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
            await handlerModule.default(req, res);
            return;
          }

          let bodyData = "";
          req.on("data", (chunk) => {
            bodyData += chunk;
          });

          req.on("end", async () => {
            if (bodyData) {
              try {
                req.body = JSON.parse(bodyData);
              } catch {
                req.body = bodyData;
              }
            } else {
              req.body = {};
            }
            await handlerModule.default(req, res);
          });
        } catch (err) {
          console.error("Vite API Middleware Error:", err);
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  Object.assign(process.env, env);

  return {
    plugins: [vue(), apiDevPlugin()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    test: {
      environment: "happy-dom",
      globals: true,
    },
  };
});
