import React, { useState } from 'react';
import { broadcastNotification } from '@common/api';

const BroadcastNotifications: React.FC = () => {
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const handleSendBroadcast = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !body) {
            setError('Title and Body are required.');
            return;
        }

        setIsSending(true);
        setError('');
        setSuccessMessage('');

        try {
            const { count } = await broadcastNotification(title, body);
            setSuccessMessage(`Broadcast sent successfully to ${count} subscribers!`);
            setTitle('');
            setBody('');
        } catch (err: any) {
            setError(err.message || 'Failed to send broadcast. Please try again.');
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Send a Custom Notification</h2>
            <p className="text-gray-600 mb-6">
                This message will be sent as a push notification to all users who have opted-in.
                Use this for announcements, special offers, or important updates.
            </p>

            <form onSubmit={handleSendBroadcast} className="space-y-6">
                <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                        Notification Title
                    </label>
                    <input
                        type="text"
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                        placeholder="e.g., ✨ Special Offer Today! ✨"
                        required
                    />
                </div>

                <div>
                    <label htmlFor="body" className="block text-sm font-medium text-gray-700">
                        Notification Body
                    </label>
                    <textarea
                        id="body"
                        rows={4}
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                        placeholder="e.g., Get 10% off on all leafy greens, only for today. Order now!"
                        required
                    />
                </div>
                
                {error && <p className="text-sm text-red-600">{error}</p>}
                {successMessage && <p className="text-sm text-green-600">{successMessage}</p>}

                <div className="text-right">
                    <button
                        type="submit"
                        disabled={isSending}
                        className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:bg-gray-400"
                    >
                        {isSending ? 'Sending...' : 'Send Broadcast'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default BroadcastNotifications;