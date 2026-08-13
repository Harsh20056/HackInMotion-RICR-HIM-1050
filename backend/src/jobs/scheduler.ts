import { PgBoss } from "pg-boss";
import { env } from "../config/env.js";
import { logger } from "../shared/lib/logger.js";
import { runSlaSweep } from "./slaMonitor.js";
import { runNotificationDispatch } from "./notificationWorker.js";

/**
 * pg-boss owns the schedule, using the same Postgres instance as the app —
 * no Redis, no separate broker. It creates its own `pgboss` schema.
 */

const SLA_QUEUE = "sla-sweep";
const NOTIFY_QUEUE = "notification-dispatch";

let boss: PgBoss | null = null;

export async function startScheduler(): Promise<PgBoss | null> {
  if (env.NODE_ENV === "test" || env.DISABLE_JOBS) {
    logger.info("Background jobs disabled");
    return null;
  }

  boss = new PgBoss({ connectionString: env.DATABASE_URL, schema: "pgboss" });

  boss.on("error", (err: unknown) => logger.error({ err }, "pg-boss error"));

  await boss.start();

  await boss.createQueue(SLA_QUEUE);
  await boss.createQueue(NOTIFY_QUEUE);

  await boss.work(SLA_QUEUE, async () => {
    await runSlaSweep();
  });
  await boss.work(NOTIFY_QUEUE, async () => {
    await runNotificationDispatch();
  });

  // Detect SLA breaches every 5 minutes; drain the notification queue every
  // minute so the bell feels responsive.
  await boss.schedule(SLA_QUEUE, "*/5 * * * *");
  await boss.schedule(NOTIFY_QUEUE, "* * * * *");

  // Don't make the first sweep wait for the first cron tick.
  await boss.send(SLA_QUEUE, {});
  await boss.send(NOTIFY_QUEUE, {});

  logger.info("Scheduler started: SLA sweep every 5m, notification dispatch every 1m");
  return boss;
}

export async function stopScheduler(): Promise<void> {
  if (boss) {
    await boss.stop({ graceful: true });
    boss = null;
  }
}
