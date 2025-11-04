import { WebSocketServer, WebSocket } from 'ws';
import http, { IncomingMessage } from 'http';
import logger from './logger';
import prisma from './db';
import { sendNotification } from './services/notifications';

let wss: WebSocketServer;

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
        
        ws.on('message', async (message) => {
            try {
                const data = JSON.parse(message.toString());

                if (data.type === 'start_broadcast' && data.driverId) {
                    // Only send notifications once per driver per day.
                    if (!notifiedDriversToday.has(data.driverId)) {
                        notifiedDriversToday.add(data.driverId);
                        logger.info(`Driver ${data.driverId} started broadcasting. Triggering notifications.`);
                        await notifyConfirmedUsers();
                    }
                }
                
                if (data.type === 'driver_location_update') {
                    broadcast({
                        type: 'truck_location_broadcast',
                        payload: data.payload
                    });
                }
            } catch (e) {
                logger.error(e, 'Error parsing WebSocket message');
            }
        });

        ws.on('close', () => {
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