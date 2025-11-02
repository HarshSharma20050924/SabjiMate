import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import logger from './logger';
import path from 'path';
import dotenv from 'dotenv';
import { messaging } from './firebase-admin'; // Import the initialized Firebase messaging service
import prisma from './db';
import { fileURLToPath } from 'url';


const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
const envPath = path.resolve(__dirname, `../../../${envFile}`);
dotenv.config({ path: envPath });

const connection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
    maxRetriesPerRequest: null,
});

connection.on('connect', () => logger.info('Redis connected for Worker'));
connection.on('error', (err) => logger.error(err, 'Redis connection error for Worker'));

logger.info('Worker process starting...');

// The worker's job is to process tasks from the 'notification-queue'.
const worker = new Worker('notification-queue', async job => {
  if (!messaging) {
    logger.error('Firebase Messaging service is not available. Aborting job, will retry.');
    // Throw an error to signal that the job should be retried later
    throw new Error('Firebase Messaging not initialized');
  }
  
  const { userId, message } = job.data;
  
  try {
    const user = await prisma.user.findUnique({
        where: { phone: userId },
        select: { fcmToken: true }
    });

    if (!user || !user.fcmToken) {
        logger.warn({ userId }, `User not found or has no FCM token. Skipping notification.`);
        return { status: 'skipped', reason: 'No token' };
    }

    const payload = {
        notification: {
            title: 'सब्ज़ीMATE Broadcast',
            body: message,
        },
        token: user.fcmToken,
    };
    
    logger.info({ userId, message }, `Sending push notification`);
    const response = await messaging.send(payload);
    logger.info({ userId, response }, 'Successfully sent message');
    return { status: 'ok', userId, deliveredAt: new Date().toISOString() };

  } catch (error: any) {
    logger.error(error, `Failed to send notification to user ${userId}`);
    // If the token is invalid, it's a good idea to remove it from the database
    if (error.code === 'messaging/registration-token-not-registered') {
        await prisma.user.update({
            where: { phone: userId },
            data: { fcmToken: null }
        });
        logger.warn({ userId }, `Removed invalid FCM token.`);
    }
    // Let BullMQ know the job failed so it can be retried if configured
    throw error;
  }
}, { connection });

worker.on('completed', job => {
  logger.info(`Job ${job.id} has completed!`);
});

worker.on('failed', (job, err) => {
  if(job) {
    logger.error(err, `Job ${job.id} has failed`);
  } else {
    logger.error(err, 'An unknown job has failed');
  }
});

logger.info('Worker is listening for jobs on the notification-queue.');