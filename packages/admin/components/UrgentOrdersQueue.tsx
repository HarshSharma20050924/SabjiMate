import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sale } from '@common/types';
import { getUrgentOrders } from '@common/api';
import LoadingSpinner from '@common/components/LoadingSpinner';
import { getWebSocketUrl } from '@common/utils';

const RefreshIcon: React.FC<{className: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
    </svg>
);

const UrgentOrdersQueue: React.FC = () => {
    const [orders, setOrders] = useState<Sale[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [assignments, setAssignments] = useState<Record<number, string>>({}); // { [orderId]: driverId }
    const ws = useRef<WebSocket | null>(null);

    const fetchOrders = useCallback(async () => {
        try {
            setIsLoading(true);
            const ordersData = await getUrgentOrders();
            setOrders(ordersData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        } catch (error) {
            console.error("Failed to fetch urgent orders", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOrders();

        ws.current = new WebSocket(getWebSocketUrl());

        ws.current.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'new_urgent_order') {
                // Add the new order to the top of the list
                setOrders(prevOrders => [data.payload, ...prevOrders]);
            }
             if (data.type === 'order_accepted_by_driver') {
                setAssignments(prev => ({ ...prev, [data.payload.orderId]: data.payload.driverId }));
            }
        };

        return () => ws.current?.close();
    }, [fetchOrders]);
    
    return (
        <div>
            <div className="flex items-center space-x-3 mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Urgent Order Queue</h2>
                <button onClick={fetchOrders} disabled={isLoading} className="text-blue-600 hover:text-blue-800 disabled:text-gray-400">
                    <RefreshIcon className={`w-6 h-6 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>
            {isLoading ? <LoadingSpinner /> : (
                <div className="bg-white rounded-lg shadow">
                    {orders.length > 0 ? (
                        <ul className="divide-y divide-gray-200">
                            {orders.map(order => {
                                const assignedDriver = assignments[order.id];
                                return (
                                <li key={order.id} className="p-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold text-gray-900">Order #{order.id}</p>
                                            <p className="text-sm text-gray-600">User Phone: {order.userId}</p>
                                            <p className="text-sm text-gray-500">{new Date(order.date).toLocaleString()}</p>
                                        </div>
                                        <div className="text-right">
                                             <p className="font-bold text-lg text-green-600">₹{order.total.toFixed(2)}</p>
                                             <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                                                 assignedDriver ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                                             }`}>
                                                {assignedDriver ? `ASSIGNED` : 'PENDING'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mt-2 border-t pt-2">
                                        {assignedDriver && (
                                            <p className="text-sm font-semibold text-blue-700 mb-2">
                                                Accepted by Driver: {assignedDriver}
                                            </p>
                                        )}
                                        <p className="text-sm font-semibold">Items:</p>
                                        <ul className="list-disc list-inside text-sm text-gray-600">
                                            {order.items.map((item, index) => (
                                                <li key={index}>{item.vegetableName} ({item.quantity}) - ₹{item.price.toFixed(2)}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <p className="text-center text-gray-500 p-8">No pending urgent orders.</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default UrgentOrdersQueue;