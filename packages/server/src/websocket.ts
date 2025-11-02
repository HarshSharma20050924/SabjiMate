import { WebSocketServer, WebSocket } from 'ws';
import http, { IncomingMessage } from 'http';
import logger from './logger';

let wss: WebSocketServer;

export const initializeWebSocket = (server: http.Server) => {
    // Create the server without a pre-attached http server (noServer: true)
    // This allows us to manually handle the 'upgrade' event from the main http server.
    wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (request: IncomingMessage, socket, head) => {
        // Use URL to safely parse the pathname, ignoring query parameters.
        const pathname = request.url ? new URL(request.url, `http://${request.headers.host}`).pathname : '';
        
        // Only handle requests to our specific WebSocket path
        if (pathname === '/socket') {
            wss.handleUpgrade(request, socket, head, (ws) => {
                wss.emit('connection', ws, request);
            });
        }
        // By removing the 'else' block, we simply ignore upgrade requests
        // for other paths instead of destroying the socket. This prevents
        // interference with other WebSocket services (like Vite HMR).
    });

    wss.on('connection', (ws) => {
        logger.info('Client connected to WebSocket on /socket');
        
        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message.toString());
                // This is a hub; it just rebroadcasts location updates from the driver
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