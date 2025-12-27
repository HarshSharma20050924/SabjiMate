import { rateLimit } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import IORedis from 'ioredis';
import logger from '../logger';

const redisClient = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

redisClient.on('error', (err) => {
    logger.error(err, 'Redis connection error in Rate Limiter');
});

// General API Rate Limiter
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 1000, // Limit each IP to 1000 requests per windowMs
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    store: new RedisStore({
        // @ts-ignore
        sendCommand: (...args: string[]) => redisClient.call(...args),
    }) as any,
    handler: (req, res) => {
        logger.warn({ ip: req.ip }, 'Rate limit exceeded');
        res.status(429).json({
            error: 'Too many requests, please try again later.',
        });
    },
});

// Stricter Auth Rate Limiter (Login/OTP)
export const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    limit: 20, // Limit each IP to 20 login attempts per hour
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    store: new RedisStore({
        // @ts-ignore
        sendCommand: (...args: string[]) => redisClient.call(...args),
        prefix: 'rl:auth:',
    }) as any,
    handler: (req, res) => {
        logger.warn({ ip: req.ip }, 'Auth rate limit exceeded');
        res.status(429).json({
            error: 'Too many login attempts, please try again later.',
        });
    },
});
