import Redis from 'ioredis';
import { logger } from './logger';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export let redisClient: Redis | null = null;
let isRedisConnected = false;

export const initRedis = (): Redis => {
  if (redisClient) return redisClient;

  redisClient = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      const delay = Math.min(times * 100, 3000);
      return delay;
    },
    enableOfflineQueue: false,
  });

  redisClient.on('connect', () => {
    isRedisConnected = true;
    logger.info(`Connected to Redis at ${REDIS_URL}`);
  });

  redisClient.on('error', (err) => {
    isRedisConnected = false;
    logger.warn(`Redis connection warning: ${err.message}. Cache bypass active.`);
  });

  return redisClient;
};

export const getCached = async <T>(key: string): Promise<T | null> => {
  if (!redisClient || !isRedisConnected) return null;
  try {
    const raw = await redisClient.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (err: any) {
    logger.warn(`Redis getCached error for key ${key}: ${err.message}`);
    return null;
  }
};

export const setCached = async (key: string, data: any, ttlSeconds: number = 300): Promise<void> => {
  if (!redisClient || !isRedisConnected) return;
  try {
    await redisClient.setex(key, ttlSeconds, JSON.stringify(data));
  } catch (err: any) {
    logger.warn(`Redis setCached error for key ${key}: ${err.message}`);
  }
};

export const invalidateCachePattern = async (pattern: string): Promise<void> => {
  if (!redisClient || !isRedisConnected) return;
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
      logger.info(`Invalidated ${keys.length} Redis cache keys matching "${pattern}"`);
    }
  } catch (err: any) {
    logger.warn(`Redis invalidateCachePattern error for "${pattern}": ${err.message}`);
  }
};

export const isRedisReady = (): boolean => isRedisConnected;
