// import { Queue } from 'bullmq';
// import IORedis from 'ioredis';
// import logger from './logger';

// const connection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
//     maxRetriesPerRequest: null,
// });

// connection.on('connect', () => logger.info('Redis connected for BullMQ'));
// connection.on('error', (err) => logger.error(err, 'Redis connection error for BullMQ'));

// // A queue for sending notifications.
// // Each job in this queue will represent one notification to be sent to a user.
// export const notificationQueue = new Queue('notification-queue', { connection });