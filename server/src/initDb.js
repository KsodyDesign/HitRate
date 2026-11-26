import fs from "fs";
import path from "path";
import "dotenv/config";
import { pool } from "./db.js";
import { logger } from "./logger.js";

async function main() {
  const dbDir = path.resolve(import.meta.dirname, "..", "..", "db");
  const schemaSql = fs.readFileSync(path.join(dbDir, "schema.sql"), "utf-8");
  const seedSql = fs.readFileSync(path.join(dbDir, "seed.sql"), "utf-8");

  logger.info("Применяем schema.sql...");
  await pool.query(schemaSql);

  logger.info("Применяем seed.sql...");
  await pool.query(seedSql);

  logger.info("База данных успешно инициализирована.");
  await pool.end();
}

main().catch((err) => {
  logger.error("Ошибка инициализации БД", err.message);
  process.exit(1);
});
