import { redis } from "../config/redis";
import { logger } from "../config/logger";

export async function getOrSetCache<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<T> {
  try {
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached) as T;
    }
  } catch (err) {
    logger.error(`Cache read failed for ${key}: ${(err as Error).message}`);
  }

  const fresh = await fetcher();

  redis
    .set(key, JSON.stringify(fresh), "EX", ttlSeconds)
    .catch((err: Error) => logger.error(`Cache write failed for ${key}: ${err.message}`));

  return fresh;
}

export async function invalidateCache(...keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  await redis.del(...keys).catch((err: Error) => logger.error(`Cache invalidation failed: ${err.message}`));
}
