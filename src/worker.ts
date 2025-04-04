import { Hono } from "hono";
import Redis from "ioredis";

const app = new Hono();

app.get("/", (c) => {
  return c.json({
    server: "Turbo Queue Worker",
    status: "ok",
  });
});

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

async function worker() {
  const now = Date.now();
  const jobs = await redis.zrangebyscore("tq:job_schedule", 0, now);

  if (jobs.length > 0) {
    console.log(`Processing ${jobs.length} jobs`);
    await redis.zremrangebyscore("tq:job_schedule", 0, now);

    for (const jobJson of jobs) {
      try {
        const job = JSON.parse(jobJson);
        console.log(`Processing job for ${job.url}`);
      } catch (error) {
        console.error("Error processing job:", error);
        await redis.zadd("tq:job_schedule", Date.now() + 5000, jobJson);
      }
    }
  }
}

setInterval(() => {
  worker().catch(console.error);
}, 1000);
