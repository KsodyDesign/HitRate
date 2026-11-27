import { Router } from "express";
import { query } from "../db.js";

const router = Router();

// Получить все кампании со сводкой по листовкам, переходам и средней стоимости перехода
router.get("/", async (req, res, next) => {
  try {
    const sql = `
      SELECT
        c.id,
        c.name,
        c.goal,
        c.status,
        c.start_date,
        c.end_date,
        c.created_at,
        COUNT(DISTINCT a.id)::int AS ads_count,
        COALESCE(SUM(CASE WHEN cl.id IS NOT NULL AND NOT cl.is_test AND NOT cl.is_bot THEN 1 ELSE 0 END), 0)::int AS valid_clicks,
        COALESCE((
          SELECT SUM(CASE WHEN a2.is_free THEN 0 ELSE a2.unit_cost * a2.print_run + a2.extra_cost END)
          FROM ads a2 WHERE a2.campaign_id = c.id
        ), 0)::numeric(12,2) AS total_cost
      FROM campaigns c
      LEFT JOIN ads a ON a.campaign_id = c.id
      LEFT JOIN qr_links q ON q.ad_id = a.id
      LEFT JOIN qr_clicks cl ON cl.qr_link_id = q.id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `;
    const { rows } = await query(sql);

    const data = rows.map((r) => {
      const totalCost = Number(r.total_cost) || 0;
      const clicks = Number(r.valid_clicks) || 0;
      const costPerClick = clicks > 0 ? Math.round((totalCost / clicks) * 10) / 10 : null;

      // Прогресс срока кампании в %
      let progressPct = 0;
      if (r.start_date && r.end_date) {
        const start = new Date(r.start_date).getTime();
        const end = new Date(r.end_date).getTime();
        const now = Date.now();
        if (end > start) {
          progressPct = Math.max(0, Math.min(100, Math.round(((now - start) / (end - start)) * 100)));
        }
      }

      return {
        ...r,
        total_cost: totalCost,
        cost_per_click: costPerClick,
        progress_pct: progressPct,
      };
    });

    res.json(data);
  } catch (err) {
    next(err);
  }
});

// Создать новую кампанию
router.post("/", async (req, res, next) => {
  try {
    const { name, goal = "", start_date, end_date } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: "Укажите название кампании" });
    }

    const { rows } = await query(
      `INSERT INTO campaigns (name, goal, start_date, end_date)
       VALUES ($1, $2, COALESCE($3::date, CURRENT_DATE), $4::date)
       RETURNING *`,
      [String(name).trim(), String(goal).trim(), start_date || null, end_date || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// Обновить кампанию
router.patch("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { name, goal, status, start_date, end_date } = req.body;

    if (status && !["active", "paused", "archived"].includes(status)) {
      return res.status(400).json({ error: "Некорректный статус кампании" });
    }

    const { rows } = await query(
      `UPDATE campaigns
       SET name = COALESCE($1, name),
           goal = COALESCE($2, goal),
           status = COALESCE($3, status),
           start_date = COALESCE($4::date, start_date),
           end_date = COALESCE($5::date, end_date)
       WHERE id = $6
       RETURNING *`,
      [
        name !== undefined ? String(name).trim() : null,
        goal !== undefined ? String(goal).trim() : null,
        status || null,
        start_date || null,
        end_date || null,
        id,
      ]
    );

    if (!rows.length) return res.status(404).json({ error: "Кампания не найдена" });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// Удалить кампанию
router.delete("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { rowCount } = await query("DELETE FROM campaigns WHERE id = $1", [id]);
    if (!rowCount) return res.status(404).json({ error: "Кампания не найдена" });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
