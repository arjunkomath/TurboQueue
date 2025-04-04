import { Hono } from "hono";
import Redis from "ioredis";
import { REDIS_SET_KEY } from "./data";

const app = new Hono();

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

app.get("/", (c) => {
  return c.json({
    server: "Turbo Queue API",
    status: "ok",
  });
});

app.post("/enqueue", async (c) => {
  const { url, payload } = await c.req.json();
  if (!url || !payload) {
    return c.json({ error: "URL and payload are required" }, 400);
  }

  const jobJson = JSON.stringify({ url, payload });
  const result = await redis.zadd(REDIS_SET_KEY, Date.now(), jobJson);

  return c.json({ status: "Job enqueued", result });
});

app.post("/schedule", async (c) => {
  const { url, payload, executeAt } = await c.req.json();
  if (!url || !payload || !executeAt) {
    return c.json({ error: "URL, payload and executeAt are required" }, 400);
  }

  const jobJson = JSON.stringify({ url, payload });
  const result = await redis.zadd(REDIS_SET_KEY, executeAt, jobJson);

  return c.json({ status: "Job scheduled", result });
});

export default app;
