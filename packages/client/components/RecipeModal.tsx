import React, { useState, useEffect, useRef } from 'react';
import { Language, ChatMessage } from '@common/types';
import { useStore } from '@client/store';
import * as api from '@common/api';

interface RecipeChatScreenProps {
  language: Language;
}

const TypingIndicator = () => (
    <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
    </div>
);

const RecipeChatScreen: React.FC<RecipeChatScreenProps> = ({ language }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  const wishlist = useStore(state => state.wishlist);
  const vegetables = useStore(state => state.vegetables);

  useEffect(() => {
    chatContainerRef.current?.scrollTo(0, chatContainerRef.current.scrollHeight);
  }, [messages, isLoading]);

  useEffect(() => {
    if (messages.length > 0 || vegetables.length === 0) return;

    const initializeChat = async () => {
      setIsLoading(true);
      setError('');
      try {
        const wishlistItems = wishlist
            .map(item => vegetables.find(v => v.id === item.id)?.name[language])
            .filter(Boolean) as string[];

        let firstPrompt: string;
        if (wishlistItems.length > 0) {
            firstPrompt = `Based on these vegetables: ${wishlistItems.join(', ')}, suggest one simple and delicious recipe. Start your response with a friendly Hinglish greeting like 'Namaste!' and then suggest the recipe.`;
        } else {
            firstPrompt = "Start with a friendly Hinglish greeting like 'Namaste!' and ask me what I'd like to cook today.";
        }
        
        const systemInstruction = "You are 'RasoiMATE', a friendly and expert Indian cooking assistant. Your main language is Hinglish (Hindi written in Roman script), but you can also use pure Hindi. Suggest simple, tasty Indian recipes. Be warm, encouraging, and 'aunty-friendly'. Your responses should be concise and easy to understand. Format recipes clearly with ingredients and instructions.";

        const { response } = await api.sendChatMessage([], firstPrompt, systemInstruction);

        setMessages([{ role: 'model', text: response }]);

      } catch (e) {
        console.error("Failed to initialize chat:", e);
        setError("Sorry, I'm having trouble connecting right now. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    initializeChat();
  }, [vegetables, wishlist, language, messages.length]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentInput = userInput.trim();
    if (!currentInput || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', text: currentInput };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setUserInput('');
    setIsLoading(true);
    setError('');

    try {
        const systemInstruction = "You are 'RasoiMATE', a friendly and expert Indian cooking assistant. Your main language is Hinglish (Hindi written in Roman script), but you can also use pure Hindi. Suggest simple, tasty Indian recipes. Be warm, encouraging, and 'aunty-friendly'. Your responses should be concise and easy to understand. Format recipes clearly with ingredients and instructions.";
        
        const { response } = await api.sendChatMessage(messages, currentInput, systemInstruction);
        
        setMessages(prev => [...prev, { role: 'model', text: response }]);
    } catch (e) {
      console.error("Failed to send message:", e);
      setError("I'm sorry, I couldn't process that. Please try again.");
      setMessages(messages); // Rollback on error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-green-50" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2394e3a5' fill-opacity='0.2'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }}>
      <header className="p-4 bg-white border-b sticky top-0 z-10 text-center">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center justify-center space-x-2">
            <span className="text-3xl">🧑‍🍳</span>
            <span>रसोईMATE</span>
        </h2>
        <p className="text-sm text-gray-500">Your Personal Cooking Assistant</p>
      </header>

      <div ref={chatContainerRef} className="flex-grow overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-3 rounded-2xl ${msg.role === 'user' ? 'bg-white border border-gray-200' : 'bg-lime-100'}`}>
              <p className="text-gray-800 whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}
        {isLoading && (
            <div className="flex justify-start">
                <div className="max-w-xs px-4 py-3 rounded-2xl bg-lime-100">
                    <TypingIndicator />
                </div>
            </div>
        )}
        {error && <p className="text-red-500 text-center">{error}</p>}
      </div>

      <footer className="p-4 bg-white border-t sticky bottom-16">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Ask for a recipe..."
            className="flex-grow w-full text-base pl-4 pr-4 py-3 bg-gray-100 border-2 border-transparent rounded-full text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading || !userInput.trim()} className="bg-green-600 text-white rounded-full p-3 shadow-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </button>
        </form>
      </footer>
    </div>
  );
};

export default RecipeChatScreen;