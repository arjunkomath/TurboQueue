import Redis from "ioredis";
import { REDIS_SET_KEY } from "./data";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

async function worker() {
  const now = Date.now();
  const jobs = await redis.zrangebyscore(REDIS_SET_KEY, 0, now);

  if (jobs.length > 0) {
    console.log(`Processing ${jobs.length} jobs`);
    await redis.zremrangebyscore(REDIS_SET_KEY, 0, now);

    for (const jobJson of jobs) {
      try {
        const job = JSON.parse(jobJson);
        console.log(`Processing job for ${job.url}`);
      } catch (error) {
        console.error("Error processing job:", error);
        await redis.zadd(REDIS_SET_KEY, Date.now() + 5000, jobJson);
      }
    }
  }
}

setInterval(() => {
  worker().catch(console.error);
}, 1000);
