import { Hono } from "hono";
import Redis from "ioredis";
import { REDIS_SET_KEY } from "./data";
import { createJob } from "./lib/job";

const app = new Hono();

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

app.get("/", (c) => {
  return c.json({
    server: "Turbo Queue API",
    status: "ok",
  });
});

app.post("/enqueue", async (c) => {
  try {
    const { url, payload } = await c.req.json();
    if (!url || !payload) {
      return c.json({ error: "URL and payload are required" }, 400);
    }

    const job = createJob(url, payload);
    await redis.zadd(REDIS_SET_KEY, job.createdAt, JSON.stringify(job));

    return c.json({ status: "Job enqueued", id: job.id });
  } catch (error) {
    console.error("Failed to enqueue job", error);
    return c.json({ error: "Failed to enqueue job, Bad Request" }, 400);
  }
});

app.post("/schedule", async (c) => {
  const { url, payload, executeAt } = await c.req.json();
  if (!url || !payload || !executeAt) {
    return c.json({ error: "URL, payload and executeAt are required" }, 400);
  }

  const job = createJob(url, payload);
  await redis.zadd(REDIS_SET_KEY, executeAt, JSON.stringify(job));

  return c.json({ status: "Job scheduled", id: job.id });
});

export default app;
