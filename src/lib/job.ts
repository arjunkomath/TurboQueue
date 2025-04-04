import { randomUUIDv7 } from "bun";

export type Job = {
  id: string;
  url: string;
  payload: Record<string, any>;
  retries: number;
  retryDelayInMs: number;
  createdAt: number;
};

export function createJob(url: string, payload: Record<string, any>) {
  return {
    id: randomUUIDv7(),
    url,
    payload,
    retries: 0,
    retryDelayInMs: 3000,
    createdAt: Date.now(),
  };
}
