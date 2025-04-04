import Redis from "ioredis";
import { MAX_RETRIES, MAX_RETRY_DELAY_IN_MS, REDIS_SET_KEY } from "./data";
import { Job } from "./lib/job";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

async function processJob(job: Job) {
  console.log(`Processing job`, job.id);
  const response = await fetch(job.url, {
    method: "POST",
    body: JSON.stringify(job.payload),
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Turbo Queue Worker",
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to process job: ${response.statusText}`);
  }
}

async function worker() {
  const now = Date.now();

  const multi = redis.multi();
  multi.zrangebyscore(REDIS_SET_KEY, 0, now);
  multi.zremrangebyscore(REDIS_SET_KEY, 0, now);

  const results = await multi.exec();
  if (!results) {
    return;
  }

  const [error, jobs] = results[0];
  if (error || !Array.isArray(jobs)) {
    console.error("Failed to fetch jobs:", error);
    return;
  }

  if (jobs.length) {
    console.log(`Processing ${jobs.length} jobs`);

    for (const jobJson of jobs) {
      let job: Job;

      try {
        job = JSON.parse(jobJson) as Job;
      } catch (error) {
        console.error("Failed to parse job, we can't process it", error);
        continue;
      }

      try {
        await processJob(job);
      } catch (error) {
        console.error("Failed to process job, we'll retry it later", error);

        if (job.retries >= MAX_RETRIES) {
          console.error("Job failed too many times, we won't retry it");
          continue;
        }

        job.retries++;
        const retryTime =
          Date.now() + Math.min(job.retryDelayInMs, MAX_RETRY_DELAY_IN_MS);
        await redis.zadd(REDIS_SET_KEY, retryTime, JSON.stringify(job));
      }
    }
  }
}

setInterval(() => {
  worker().catch(console.error);
}, 1000);
