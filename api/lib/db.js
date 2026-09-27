import { createClient } from "@libsql/client";
import path from "node:path";
import fs from "node:fs";

let client = null;

export function getDb() {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (url) {
      client = createClient({
        url,
        authToken: authToken || undefined,
      });
    } else {
      // Local fallback SQLite database
      const dbDir = path.resolve(process.cwd(), "data");
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
      const localDbPath = path.join(dbDir, "agenda.db");
      client = createClient({
        url: `file:${localDbPath}`,
      });
    }
  }
  return client;
}
