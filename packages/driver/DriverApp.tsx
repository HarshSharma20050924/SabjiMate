import React, { useContext, useState, useEffect, useRef } from 'react';
import { AuthContext } from '@common/AuthContext';
import LoadingSpinner from '@common/components/LoadingSpinner';
import DriverDashboard from './components/DriverDashboard';
import DriverLogin from './components/DriverLogin';
import UrgentOrderToast from '@common/components/UrgentOrderToast';
import { Sale } from '@common/types';
import { getActions, clearActions } from './offline';
import * as api from '@common/api';
import { getWebSocketUrl } from '@common/utils';

const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  return isOnline;
};

const StatusBanner: React.FC<{ isOnline: boolean; syncStatus: string; }> = ({ isOnline, syncStatus }) => {
    if (syncStatus) {
        return (
            <div className="bg-blue-600 text-white text-sm font-bold text-center p-2">
                {syncStatus}
            </div>
        );
    }
    if (!isOnline) {
        return (
            <div className="bg-yellow-500 text-black text-sm font-bold text-center p-2">
                You are currently offline. Actions will be synced later.
            </div>
        );
    }
    return null;
};

const DriverApp: React.FC = () => {
    const auth = useContext(AuthContext);
    const [newOrderToast, setNewOrderToast] = useState<Sale | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState('');
    const ws = useRef<WebSocket | null>(null);
    const isOnline = useOnlineStatus();

    const processOfflineActions = async () => {
        if (isSyncing || !isOnline) return;
        
        const actions = await getActions();
        if (actions.length === 0) {
            return;
        }

        setIsSyncing(true);
        setSyncStatus(`Syncing ${actions.length} offline action(s)...`);

        let success = true;
        for (const action of actions) {
            try {
                switch (action.type) {
                    case 'RECORD_SALE':
                        await api.recordSale(action.payload.userId, action.payload.items, action.payload.total, action.payload.isUrgent);
                        break;
                    case 'MARK_PAID_CASH':
                        await api.driverMarkSaleAsPaidCash(action.payload.saleId);
                        break;
                    default:
                        console.warn('Unknown offline action type:', action.type);
                }
            } catch (error) {
                console.error('Failed to sync action:', action, error);
                success = false;
                break; 
            }
        }

        if (success) {
            await clearActions();
            setSyncStatus(`Synced ${actions.length} action(s) successfully!`);
        } else {
            setSyncStatus('Sync failed. Will retry later.');
        }

        setTimeout(() => setSyncStatus(''), 4000);
        setIsSyncing(false);
    };

    useEffect(() => {
        if (isOnline) {
            processOfflineActions();
        }
    }, [isOnline]);

    useEffect(() => {
        if (auth?.user && auth.user.role === 'DRIVER') {
            ws.current = new WebSocket(getWebSocketUrl());
            
            ws.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'new_urgent_order') {
                        setNewOrderToast(data.payload);
                        setTimeout(() => setNewOrderToast(null), 8000);
                    }
                } catch(e) {
                    console.error('Error parsing driver websocket message:', e);
                }
            };
            
            return () => ws.current?.close();
        }
    }, [auth?.user]);


    if (!auth || auth.isInitialLoading) {
        return <div className="h-screen flex items-center justify-center"><LoadingSpinner /></div>;
    }

    const renderContent = () => {
        if (auth.user && auth.user.role === 'DRIVER') {
            return <DriverDashboard isOnline={isOnline} />;
        }
        return <DriverLogin />;
    }

    return (
        <div className="bg-slate-50 min-h-screen">
            <StatusBanner isOnline={isOnline} syncStatus={syncStatus} />
            <UrgentOrderToast order={newOrderToast} onClose={() => setNewOrderToast(null)} />
            {renderContent()}
        </div>
    );
};

export default DriverApp;