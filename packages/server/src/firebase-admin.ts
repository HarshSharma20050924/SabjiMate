// import * as admin from 'firebase-admin';
// import type { Messaging } from 'firebase-admin/messaging';
// import logger from './logger';
// import path from 'path';
// import fs from 'fs';
// import { fileURLToPath } from 'url';

// let messaging: Messaging | null = null;

// try {
//     let serviceAccount: admin.ServiceAccount;

//     const serviceAccountPath = path.resolve(__dirname, '../firebase-service-account.json');

//     if (fs.existsSync(serviceAccountPath)) {
//         // Option 1: Load from file (ideal for local development)
//         serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
//         logger.info('Initializing Firebase Admin SDK from file...');
//     } else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
//         // Option 2: Load from environment variable (for production/deployment)
//         logger.info('Initializing Firebase Admin SDK from environment variable...');
//         serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
//     } else {
//         throw new Error('Firebase service account key is not found. Set FIREBASE_SERVICE_ACCOUNT_JSON env var or create firebase-service-account.json in packages/server.');
//     }
    
//     // Prevent re-initialization on hot reloads in development
//     if (admin.apps.length === 0) {
//         admin.initializeApp({
//             credential: admin.credential.cert(serviceAccount)
//         });
//         logger.info('✅ Firebase Admin SDK initialized successfully.');
//     } else {
//         logger.info('Firebase Admin SDK already initialized.');
//     }

//     messaging = admin.messaging();

// } catch (error) {
//     logger.error(error, '❌ Failed to initialize Firebase Admin SDK. Push notifications will be unavailable.');
// }

// export { messaging };