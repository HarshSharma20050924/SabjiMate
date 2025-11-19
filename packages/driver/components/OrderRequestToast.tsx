import React, { useState, useEffect } from 'react';
import { Sale } from '@common/types';
import { WebSocket } from 'ws';

interface Props {
  order: Sale;
  onAccept: () => void;
  onDecline: () => void;
  ws: WebSocket | null;
}

const OrderRequestToast: React.FC<Props> = ({ order, onAccept, onDecline, ws }) => {
    const [timeLeft, setTimeLeft] = useState(30);

    useEffect(() => {
        if (timeLeft <= 0) {
            onDecline();
            return;
        }
        const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
        return () => clearTimeout(timer);
    }, [timeLeft, onDecline]);
    
    const handleAccept = () => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'accept_order', payload: { orderId: order.id } }));
        }
        onAccept();
    };

    return (
        <div className="fixed top-4 left-4 right-4 max-w-md mx-auto bg-slate-800 text-white rounded-xl shadow-2xl p-4 z-50 animate-slide-in-bottom">
            <h3 className="text-lg font-bold text-yellow-300">New Urgent Order!</h3>
            <div className="flex justify-between items-baseline mt-1">
                <p>Order #{order.id}</p>
                <p className="font-bold text-2xl">₹{order.total.toFixed(2)}</p>
            </div>
            
            <div className="w-full bg-gray-600 rounded-full h-1.5 mt-3">
                <div className="bg-yellow-400 h-1.5 rounded-full" style={{ width: `${(timeLeft / 30) * 100}%`, transition: 'width 1s linear' }}></div>
            </div>
            <div className="flex space-x-3 mt-4">
                <button onClick={onDecline} className="flex-1 bg-gray-600 hover:bg-gray-700 font-bold py-3 rounded-lg transition-colors">Decline</button>
                <button onClick={handleAccept} className="flex-1 bg-green-600 hover:bg-green-700 font-bold py-3 rounded-lg transition-colors animate-pulse-broadcast">Accept ({timeLeft}s)</button>
            </div>
        </div>
    );
};

export default OrderRequestToast;
