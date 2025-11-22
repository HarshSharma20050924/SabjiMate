
import React, { useState, useEffect, useRef } from 'react';
import { Language, SupportTicket, ChatMessage } from '@common/types';
import * as api from '@common/api';

interface SupportScreenProps {
    language: Language;
}

const ChatInterface: React.FC = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const SYSTEM_INSTRUCTION = `You are a helpful support assistant for SabziMATE, a vegetable delivery application. 
    Your goal is to assist users with their orders, account issues, and general inquiries. 
    Be polite, professional, and concise. 
    If you cannot resolve an issue, advise the user to submit a formal support ticket or contact support via WhatsApp.`;

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage: ChatMessage = { role: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        const messageToSend = input;
        setInput('');
        setLoading(true);

        try {
            const response = await api.sendChatMessage(messages, messageToSend, SYSTEM_INSTRUCTION);
            const aiMessage: ChatMessage = { role: 'model', text: response.response };
            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error('Failed to send message', error);
            const errorMessage: ChatMessage = { role: 'model', text: "I'm sorry, I'm having trouble connecting right now. Please try again later or use the ticket system." };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex flex-col h-[600px] bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="text-center text-gray-500 mt-10">
                        <p>👋 Hi! How can I help you today?</p>
                    </div>
                )}
                {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-lg p-3 ${msg.role === 'user'
                            ? 'bg-green-600 text-white rounded-br-none'
                            : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
                            }`}>
                            <p className="whitespace-pre-wrap text-sm">{msg.text}</p>
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-gray-200 rounded-lg p-3 rounded-bl-none animate-pulse">
                            <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <div className="p-3 bg-white border-t border-gray-200 rounded-b-lg">
                <div className="flex space-x-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type your message..."
                        className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                        disabled={loading}
                    />
                    <button
                        onClick={handleSend}
                        disabled={loading || !input.trim()}
                        className="bg-green-600 text-white rounded-full p-2 hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

const SupportScreen: React.FC<SupportScreenProps> = ({ language }) => {
    const [activeTab, setActiveTab] = useState<'contact' | 'chat' | 'tickets'>('contact');
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // WhatsApp Configuration
    const SUPPORT_PHONE = '919876543210'; 
    const whatsappUrl = `https://wa.me/${SUPPORT_PHONE}?text=Hi%20SabziMATE%20Support,%20I%20need%20help%20with...`;

    useEffect(() => {
        if (activeTab === 'tickets') {
            fetchTickets();
        }
    }, [activeTab]);

    const fetchTickets = async () => {
        try {
            const data = await api.getSupportTickets();
            setTickets(data);
        } catch (err) {
            console.error('Failed to fetch tickets', err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            await api.createSupportTicket(subject, message);
            setSuccess('Ticket submitted successfully!');
            setSubject('');
            setMessage('');
        } catch (err: any) {
            setError(err.message || 'Failed to submit ticket');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50">
             {/* Sticky Tabs Header */}
            <div className="bg-white shadow-sm sticky top-0 z-10 flex-shrink-0">
                <div className="flex justify-around border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('contact')}
                        className={`flex-1 py-4 text-sm font-medium text-center transition-colors ${activeTab === 'contact'
                                ? 'text-green-600 border-b-2 border-green-600'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Contact Us
                    </button>
                    <button
                        onClick={() => setActiveTab('chat')}
                        className={`flex-1 py-4 text-sm font-medium text-center transition-colors ${activeTab === 'chat'
                                ? 'text-green-600 border-b-2 border-green-600'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        AI Chat
                    </button>
                    <button
                        onClick={() => setActiveTab('tickets')}
                        className={`flex-1 py-4 text-sm font-medium text-center transition-colors ${activeTab === 'tickets'
                                ? 'text-green-600 border-b-2 border-green-600'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        My Tickets
                    </button>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-grow overflow-y-auto p-4 pb-24">
                {activeTab === 'contact' && (
                    <div className="space-y-6 max-w-lg mx-auto animate-slide-in-up-subtle">
                        {/* WhatsApp Section */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.463 1.065 2.876 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-gray-800">Need Quick Help?</h3>
                            <p className="text-gray-500 text-sm mb-4">Chat with us directly on WhatsApp for urgent queries.</p>
                            <a
                                href={whatsappUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-bold rounded-full text-white bg-green-600 hover:bg-green-700 shadow-md transition-transform transform hover:scale-105"
                            >
                                Chat on WhatsApp
                            </a>
                        </div>

                        {/* Ticket Form */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">Submit a Request</h3>
                            {error && (
                                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-200">
                                    {error}
                                </div>
                            )}
                            {success && (
                                <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm mb-4 border border-green-200">
                                    {success}
                                </div>
                            )}
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                                    <input
                                        type="text"
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                        placeholder="e.g., Order Issue"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                                    <textarea
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent h-32 resize-none"
                                        placeholder="Describe your issue..."
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
                                >
                                    {loading ? 'Submitting...' : 'Submit Ticket'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {activeTab === 'chat' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-full">
                        <ChatInterface />
                    </div>
                )}

                {activeTab === 'tickets' && (
                    <div className="space-y-4 max-w-lg mx-auto animate-slide-in-up-subtle">
                        {tickets.length === 0 ? (
                            <div className="text-center py-10 text-gray-500 bg-white rounded-xl shadow-sm">
                                No tickets found.
                            </div>
                        ) : (
                            tickets.map((ticket) => (
                                <div key={ticket.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-medium text-gray-900">{ticket.subject}</h4>
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                                ticket.status === 'OPEN' ? 'bg-blue-100 text-blue-800' :
                                                ticket.status === 'RESOLVED' ? 'bg-green-100 text-green-800' :
                                                'bg-gray-100 text-gray-800'
                                            }`}>
                                            {ticket.status}
                                        </span>
                                    </div>
                                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">{ticket.message}</p>
                                    <div className="text-xs text-gray-400">
                                        {new Date(ticket.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SupportScreen;
