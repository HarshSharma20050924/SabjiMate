import React, { useState } from 'react';
import { sendBroadcastNotification } from '@common/api';

const BroadcastNotifications: React.FC = () => {
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim() || isSending) {
            return;
        }
        setIsSending(true);
        setStatus(null);
        try {
            const response = await sendBroadcastNotification(message);
            setStatus({ type: 'success', text: response.message });
            setMessage('');
        } catch (error: any) {
            setStatus({ type: 'error', text: error.message || 'An unknown error occurred.' });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Broadcast Notification to All Users</h2>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="broadcast-message" className="block text-sm font-medium text-gray-700 mb-1">
                            Notification Message
                        </label>
                        <textarea
                            id="broadcast-message"
                            rows={5}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Enter the message you want to send to all app users..."
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                            required
                        />
                         <p className="text-xs text-gray-500 mt-1">This message will be sent as a push notification to all users who have enabled them.</p>
                    </div>
                    <button
                        type="submit"
                        disabled={isSending || !message.trim()}
                        className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg shadow-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                    >
                        {isSending ? 'Sending...' : 'Send Broadcast'}
                    </button>
                </form>

                {status && (
                    <div className={`mt-4 p-3 rounded-lg text-sm font-semibold ${status.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {status.text}
                    </div>
                )}
            </div>
        </div>
    );
};

export default BroadcastNotifications;