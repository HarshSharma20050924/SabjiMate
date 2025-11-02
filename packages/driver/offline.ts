import { openDB, DBSchema } from 'idb';

const DB_NAME = 'sabzimate-driver-db';
const STORE_NAME = 'pending-actions';
const DB_VERSION = 1;

interface PendingAction {
  id?: number;
  type: 'RECORD_SALE' | 'MARK_PAID_CASH';
  payload: any;
  timestamp: number;
}

interface SabziMateDB extends DBSchema {
  [STORE_NAME]: {
    key: number;
    value: PendingAction;
    indexes: { 'by-timestamp': number };
  };
}

let dbPromise: Promise<any> | null = null;

const initDB = async () => {
    if (dbPromise) return dbPromise;
    dbPromise = openDB<SabziMateDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
            const store = db.createObjectStore(STORE_NAME, {
                keyPath: 'id',
                autoIncrement: true,
            });
            store.createIndex('by-timestamp', 'timestamp');
        },
    });
    return dbPromise;
};

export const addAction = async (action: Omit<PendingAction, 'id' | 'timestamp'>) => {
    const db = await initDB();
    await db.add(STORE_NAME, {
        ...action,
        timestamp: Date.now(),
    });
};

export const getActions = async (): Promise<PendingAction[]> => {
    const db = await initDB();
    return await db.getAllFromIndex(STORE_NAME, 'by-timestamp');
};

export const clearActions = async () => {
    const db = await initDB();
    await db.clear(STORE_NAME);
};

// Initialize DB on script load
initDB();
