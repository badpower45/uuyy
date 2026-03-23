import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { pool } from "@workspace/db";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/healthz/db", async (_req, res) => {
  const startedAt = Date.now();
  const client = await pool.connect();

  try {
    const [driversCountRes, restaurantsCountRes, ordersCountRes, earningsCountRes] = await Promise.all([
      client.query("SELECT COUNT(*)::int AS count FROM drivers"),
      client.query("SELECT COUNT(*)::int AS count FROM restaurants"),
      client.query("SELECT COUNT(*)::int AS count FROM orders"),
      client.query("SELECT COUNT(*)::int AS count FROM earnings"),
    ]);

    const sampleDriverRes = await client.query(
      "SELECT id FROM drivers ORDER BY id ASC LIMIT 1"
    );

    let writeCheck = "skipped" as "ok" | "skipped";
    if (sampleDriverRes.rows.length) {
      const driverId = sampleDriverRes.rows[0]?.id as number;
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO driver_locations (driver_id, order_id, latitude, longitude, accuracy, heading, speed)
         VALUES ($1, NULL, $2, $3, NULL, NULL, NULL)`,
        [driverId, 30.0444, 31.2357]
      );
      await client.query("ROLLBACK");
      writeCheck = "ok";
    }

    return res.json({
      status: "ok",
      latencyMs: Date.now() - startedAt,
      counts: {
        drivers: driversCountRes.rows[0]?.count ?? 0,
        restaurants: restaurantsCountRes.rows[0]?.count ?? 0,
        orders: ordersCountRes.rows[0]?.count ?? 0,
        earnings: earningsCountRes.rows[0]?.count ?? 0,
      },
      checks: {
        read: "ok",
        write: writeCheck,
      },
    });
  } catch (err: any) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // ignore rollback failure
    }

    return res.status(500).json({
      status: "error",
      latencyMs: Date.now() - startedAt,
      error: err?.message ?? "Database health check failed",
    });
  } finally {
    client.release();
  }
});

export default router;
