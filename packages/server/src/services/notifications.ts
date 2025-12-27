
import webpush from 'web-push';
import logger from '../logger';
import prisma from '../db';
// @ts-ignore
import { PushSubscription } from '@prisma/client';

let isConfigured = false;

const configurePush = () => {
    if (isConfigured) return;

    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;

    if (!publicKey || !privateKey) {
        logger.warn('⚠️ VAPID keys are not configured in .env. Push notifications will NOT work.');
        return;
    }

    try {
        webpush.setVapidDetails(
            'mailto:support@sabzimate.com',
            publicKey,
            privateKey
        );
        isConfigured = true;
        logger.info('✅ web-push service configured successfully with VAPID keys.');
    } catch (e) {
        logger.error(e, '❌ Failed to configure web-push. Check VAPID keys format.');
    }
};

interface NotificationPayload {
    title: string;
    body: string;
    icon?: string;
    data?: any;
}

const sendNotification = async (subscription: PushSubscription, payload: NotificationPayload): Promise<boolean> => {
    if (!isConfigured) {
        logger.warn('Attempted to send notification, but web-push is not configured.');
        return false;
    }

    try {
        await webpush.sendNotification(
            {
                endpoint: subscription.endpoint,
                keys: subscription.keys as unknown as webpush.PushSubscription['keys'],
            },
            JSON.stringify(payload)
        );
        return true;
    } catch (error: any) {
        logger.error(error, `Failed to send notification to endpoint: ${subscription.endpoint}`);
        
        // If the subscription is no longer valid, remove it from the database.
        if (error.statusCode === 404 || error.statusCode === 410) {
            logger.warn(`Subscription expired or invalid. Deleting from DB: ${subscription.endpoint}`);
            await prisma.pushSubscription.delete({ where: { endpoint: subscription.endpoint } }).catch(e => {
                logger.error(e, 'Failed to delete expired subscription from DB.');
            });
        }
        return false;
    }
};

export {
    configurePush,
    sendNotification,
    NotificationPayload,
};
