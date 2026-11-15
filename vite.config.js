import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";

const API_ROUTE_MODULES = {
  "/api/agenda": "./api/agenda.js",
  "/api/calendar": "./api/calendar.js",
  "/api/auth/login": "./api/auth/login.js",
  "/api/auth/me": "./api/auth/me.js",
  "/api/auth/change-password": "./api/auth/change-password.js",
  "/api/presensi": "./api/presensi/index.js",
  "/api/presensi/sync": "./api/presensi/sync.js",
  "/api/presensi/students": "./api/presensi/students.js",
  "/api/presensi/courses": "./api/presensi/courses.js",
  "/api/presensi/lecturers": "./api/presensi/lecturers.js",
  "/api/mentari": "./api/mentari.js",
};

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
          const modulePath = API_ROUTE_MODULES[urlObj.pathname];

          if (!modulePath) {
            return next();
          }

          const handlerModule = await import(modulePath);

          req.query = Object.fromEntries(urlObj.searchParams.entries());

          res.status = (code) => {
            res.statusCode = code;
            return res;
          };
          res.send = (body) => {
            if (typeof body === "object" && body !== null && !Buffer.isBuffer(body)) {
              return res.json(body);
            }
            res.end(body);
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
  const env = loadEnv(mode, process.cwd(), ["VITE_", "TURSO_", "JWT_", "TURNSTILE_"]);
  Object.assign(process.env, env);

  return {
    plugins: [vue(), apiDevPlugin()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    optimizeDeps: {
      include: [
        "@fullcalendar/vue3",
        "@fullcalendar/core",
        "@fullcalendar/daygrid",
        "@fullcalendar/interaction",
      ],
    },
    test: {
      environment: "happy-dom",
      globals: true,
    },
  };
});
