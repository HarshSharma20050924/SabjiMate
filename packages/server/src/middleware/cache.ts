import { Request, Response, NextFunction } from 'express';
import IORedis from 'ioredis';
import logger from '../logger';

const redisClient = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

export const cacheMiddleware = (duration: number) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        if (req.method !== 'GET') {
            return next();
        }

        const key = `cache:${req.originalUrl}`;

        try {
            const cachedResponse = await redisClient.get(key);
            if (cachedResponse) {
                logger.info({ url: req.originalUrl }, 'Cache HIT');
                res.setHeader('X-Cache', 'HIT');
                return res.json(JSON.parse(cachedResponse));
            }

            logger.info({ url: req.originalUrl }, 'Cache MISS');
            res.setHeader('X-Cache', 'MISS');

            // Intercept res.json to store the response in Redis
            const originalJson = res.json;
            res.json = (body) => {
                redisClient.set(key, JSON.stringify(body), 'EX', duration);
                return originalJson.call(res, body);
            };

            next();
        } catch (error) {
            logger.error(error, 'Redis cache error');
            next();
        }
    };
};

export const invalidateCache = async (pattern: string) => {
    try {
        const keys = await redisClient.keys(`cache:${pattern}*`);
        if (keys.length > 0) {
            await redisClient.del(keys);
            logger.info({ pattern, count: keys.length }, 'Cache invalidated');
        }
    } catch (error) {
        logger.error(error, 'Redis cache invalidation error');
    }
};
