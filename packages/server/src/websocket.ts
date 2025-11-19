import { WebSocketServer, WebSocket } from 'ws';
import http, { IncomingMessage } from 'http';
import logger from './logger';
import prisma from './db';
import { sendNotification } from './services/notifications';
import IORedis from 'ioredis';

let wss: WebSocketServer;
const redisClient = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

// Map to store driverId -> WebSocket connection for targeted messaging
export const driverConnections = new Map<string, WebSocket>();
// Map to store userId -> WebSocket connection for targeted messaging
export const userConnections = new Map<string, WebSocket>();

// A simple in-memory set to track which drivers have already triggered the notification today.
// In a multi-server setup, this should be moved to a shared store like Redis.
const notifiedDriversToday = new Set<string>();
// Clear the set daily (e.g., at midnight)
setInterval(() => notifiedDriversToday.clear(), 24 * 60 * 60 * 1000);


export const initializeWebSocket = (server: http.Server) => {
    wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (request: IncomingMessage, socket, head) => {
        const pathname = request.url ? new URL(request.url, `http://${request.headers.host}`).pathname : '';
        
        if (pathname === '/socket') {
            wss.handleUpgrade(request, socket, head, (ws) => {
                wss.emit('connection', ws, request);
            });
        }
    });

    wss.on('connection', (ws) => {
        logger.info('Client connected to WebSocket on /socket');
        let driverId: string | null = null; // Scope driverId to this connection
        let userId: string | null = null; // Scope userId to this connection
        
        ws.on('message', async (message) => {
            try {
                const data = JSON.parse(message.toString());
                
                // When a regular user identifies themselves
                if (data.type === 'identify_user' && data.payload.userId) {
                    userId = data.payload.userId;
                    userConnections.set(userId!, ws);
                    logger.info(`User ${userId} identified and connected.`);
                }

                // When a driver goes "online"
                if (data.type === 'start_broadcast' && data.driverId) {
                    driverId = data.driverId;
                    driverConnections.set(driverId!, ws);
                    await redisClient.sadd('available_drivers', driverId!);
                    logger.info(`Driver ${driverId} connected and is broadcasting.`);

                    if (!notifiedDriversToday.has(data.driverId)) {
                        notifiedDriversToday.add(data.driverId);
                        logger.info(`Triggering "on the way" notifications as driver ${data.driverId} is starting their day.`);
                        await notifyConfirmedUsers();
                    }
                }
                
                // When a driver's location is updated
                if (data.type === 'driver_location_update') {
                    const { lat, lon, driverId: dId } = data.payload;
                    if (dId && lat && lon) {
                        // Store location in Redis Geo set for proximity searches
                        await redisClient.geoadd('drivers_locations', lon, lat, dId);
                    }
                    // Broadcast location to all clients (for admin/user maps)
                    broadcast({ type: 'truck_location_broadcast', payload: data.payload });
                }

                // When a driver accepts an order
                if (data.type === 'accept_order') {
                    if (driverId) {
                         logger.info(`Driver ${driverId} accepted order ${data.payload.orderId}`);
                        // Notify all clients (especially admins) that the order has been claimed
                        broadcast({ type: 'order_accepted_by_driver', payload: { orderId: data.payload.orderId, driverId } });
                    }
                }

            } catch (e) {
                logger.error(e, 'Error parsing WebSocket message');
            }
        });

        ws.on('close', async () => {
            if (driverId) {
                driverConnections.delete(driverId);
                await redisClient.srem('available_drivers', driverId); // Remove from available set
                await redisClient.zrem('drivers_locations', driverId); // Remove from geo set
                logger.info(`Driver ${driverId} disconnected.`);
            }
            if (userId) {
                userConnections.delete(userId);
                logger.info(`User ${userId} disconnected.`);
            }
            logger.info('Client disconnected from /socket');
        });
    });
};

export const broadcast = (data: any) => {
    if (!wss) {
        logger.error("WebSocket server not initialized!");
        return;
    }
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
};

async function notifyConfirmedUsers() {
    try {
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        const confirmedDeliveries = await prisma.deliveryConfirmation.findMany({
            where: { date: today, choice: 'YES' },
            select: { userId: true },
        });

        const userIds = confirmedDeliveries.map(d => d.userId);
        if (userIds.length === 0) return;

        const subscriptions = await prisma.pushSubscription.findMany({
            where: { userId: { in: userIds } },
        });

        const payload = {
            title: 'Your SabziMATE is on the way! 🚚',
            body: 'Track your delivery live in the app.',
            icon: '/logo.svg',
            data: { url: '/?action=track' },
        };

        logger.info(`Sending "on the way" notifications to ${subscriptions.length} subscribers.`);

        for (const sub of subscriptions) {
            await sendNotification(sub, payload);
        }
    } catch (error) {
        logger.error(error, 'Failed to send batch notifications for confirmed users.');
    }
}