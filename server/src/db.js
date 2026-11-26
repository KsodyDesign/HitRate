import pg from "pg";
import { logger } from "./logger.js";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export function formatError(err) {
  if (!err) return "Неизвестная ошибка";
  if (err.message) return err.message;
  if (Array.isArray(err.errors) && err.errors.length) {
    return err.errors.map((e) => e.message || e.code).filter(Boolean).join("; ");
  }
  return err.code || String(err);
}

pool.on("error", (err) => {
  logger.error("Ошибка пула соединений PostgreSQL", formatError(err));
});

// Удобная обёртка для параметризованных SQL-запросов
export async function query(sql, params = []) {
  try {
    return await pool.query(sql, params);
  } catch (err) {
    logger.error("Ошибка выполнения SQL-запроса", { error: formatError(err), sql: sql.slice(0, 120) });
    throw err;
  }
}

export async function checkDbConnection() {
  const res = await query("SELECT NOW() AS now");
  return res.rows[0].now;
}
