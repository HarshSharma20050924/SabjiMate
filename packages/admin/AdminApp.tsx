import React, { useContext, useState, useEffect, useRef } from 'react';
import AdminDashboard from './components/AdminDashboard';
import AdminLogin from './components/AdminLogin';
import { AuthContext } from '@common/AuthContext';
import LoadingSpinner from '@common/components/LoadingSpinner';
import UrgentOrderToast from '@common/components/UrgentOrderToast';
import { Sale } from '@common/types';
import PaymentConfirmationToast from '@common/components/PaymentConfirmationToast';
import { getWebSocketUrl } from '@common/utils';

const AdminApp: React.FC = () => {
    const auth = useContext(AuthContext);
    const [newOrderToast, setNewOrderToast] = useState<Sale | null>(null);
    const [paymentToast, setPaymentToast] = useState<any | null>(null);
    const ws = useRef<WebSocket | null>(null);

    useEffect(() => {
        // Only establish WebSocket connection if the user is an admin
        if (auth?.user?.role === 'ADMIN') {
            ws.current = new WebSocket(getWebSocketUrl());

            ws.current.onopen = () => {
                console.log("Admin WebSocket connected.");
            };

            ws.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'new_urgent_order') {
                        setNewOrderToast(data.payload);
                        // Auto-hide toast after a delay
                        setTimeout(() => setNewOrderToast(null), 8000);
                    }
                    if (data.type === 'payment_received_cash' || data.type === 'payment_received_online') {
                        setPaymentToast(data.payload);
                        // Auto-hide toast after a delay
                        setTimeout(() => setPaymentToast(null), 8000);
                    }
                } catch (e) {
                    console.error('Error parsing admin websocket message:', e);
                }
            };
            
            ws.current.onclose = () => {
                console.log("Admin WebSocket disconnected.");
            };

            // Cleanup on component unmount
            return () => {
                ws.current?.close();
            };
        }
    }, [auth?.user]);


    if (!auth || auth.isInitialLoading) {
        return (
            <div className="h-screen flex items-center justify-center">
                <LoadingSpinner />
            </div>
        );
    }

    const renderContent = () => {
        if (auth.user && auth.user.role === 'ADMIN') {
            return <AdminDashboard />;
        }
        return <AdminLogin />;
    };

    return (
        <div className="bg-gray-100 min-h-screen">
            <UrgentOrderToast order={newOrderToast} onClose={() => setNewOrderToast(null)} />
            <PaymentConfirmationToast data={paymentToast} onClose={() => setPaymentToast(null)} />
            {renderContent()}
        </div>
    );
};

export default AdminApp;