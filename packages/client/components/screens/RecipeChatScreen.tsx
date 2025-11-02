import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Language, ChatMessage, Vegetable } from '@common/types';
import { useStore, AppState } from '@client/store';
import * as api from '@common/api';
import Lottie from 'lottie-react';
import loadingAnimation from '@common/assets/loading.json';


interface RecipeChatScreenProps {
  language: Language;
}

const SYSTEM_INSTRUCTION = "You are 'रसोई MATE', a professional and friendly Indian cooking assistant from Sabzi MATE. Your primary language is Hinglish (Hindi written in Roman script), and you are fluent in pure Hindi as well. Your role is to assist users with all cooking-related questions. You can suggest recipes based on ingredients they have, provide recipes they ask for, or answer general cooking queries. Always be warm, encouraging, and clear. When providing recipes, format them with clear 'Ingredients' and 'Instructions' sections.";

// --- ICONS ---
const ChefHatIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 18V14C6 12.8954 6.89543 12 8 12H16C17.1046 12 18 12.8954 18 14V18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M6 18H18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M9 12C9 10.3431 10.3431 9 12 9C13.6569 9 15 10.3431 15 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M9 9C7.89543 9 7 8.10457 7 7C7 5.89543 7.89543 5 9 5C10.1046 5 11 5.89543 11 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M15 9C16.1046 9 17 8.10457 17 7C17 5.89543 16.1046 5 15 5C13.8954 5 13 5.89543 13 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
);
const MicIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6 text-white"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
);
const SendIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
    </svg>
);

// --- Sub-components ---
const veggies = ['🥕', '🍅', '🥔', '🥬', '🥦', '🧅'];
const itemPositions = [
    { top: '0px', left: '50%', transform: 'translateX(-50%)' }, { top: '25%', left: '93.3%', transform: 'translate(-50%, -50%)' },
    { top: '75%', left: '93.3%', transform: 'translate(-50%, -50%)' }, { top: '100%', left: '50%', transform: 'translate(-50%, -100%)' },
    { top: '75%', left: '6.7%', transform: 'translate(-50%, -50%)' }, { top: '25%', left: '6.7%', transform: 'translate(-50%, -50%)' },
];

const ChatLoadingIndicator: React.FC = () => (
     <div className="relative w-16 h-16">
        {veggies.map((veg, index) => (
            <div key={index} className="absolute text-2xl"
                style={{ ...itemPositions[index], animation: `veggie-fade 1.2s infinite`, animationDelay: `${index * 0.2}s` }}>
                {veg}
            </div>
        ))}
    </div>
);

const TodaysSelections: React.FC<{ vegetables: Vegetable[], language: Language }> = ({ vegetables, language }) => {
    if (vegetables.length === 0) return null;

    return (
        <div className="p-4 animate-slide-in-up-subtle">
             <div className="mb-3">
                <h3 className="text-sm font-bold text-gray-800">आपके आज के सब्ज़ी MATE आइटम्स:</h3>
                <p className="text-xs font-semibold text-green-700 -mt-1">Today's Selections</p>
            </div>
            <div className="flex overflow-x-auto space-x-4 pb-2">
                {vegetables.map(veg => (
                    <div key={veg.id} className="flex-shrink-0 text-center">
                        <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center border-2 border-gray-200">
                            <img src={veg.image} alt={veg.name[language]} className="w-12 h-12 object-contain rounded-full" />
                        </div>
                    </div>
                ))}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1 mt-2">
                <div className="bg-gray-400 h-1 rounded-full" style={{ width: '40%' }}></div>
            </div>
        </div>
    );
};

const GreetingBubble: React.FC<{ selectionText: string }> = ({ selectionText }) => {
    const greetingText = selectionText 
        ? `नमस्ते! आपकी रसोई MATE यहाँ है। आज आपके पास ${selectionText} है — क्या हम इनसे कुछ बनाने की कोशिश करें?`
        : "नमस्ते! मैं हूँ आपकी रसोई MATE। आज कौनसी लाजवाब डिश बनानी है?";

    return (
        <div className="flex justify-start animate-slide-in-up-subtle">
            <div className="max-w-xs md:max-w-md lg:max-w-lg px-5 py-3 rounded-t-2xl rounded-r-2xl bg-slate-100">
                <p className="text-gray-800 leading-relaxed text-base" dangerouslySetInnerHTML={{ __html: greetingText.replace(/Sabzi MATE/g, '<b class="font-semibold text-green-800">Sabzi MATE</b>').replace(/रसोई MATE/g, '<b class="font-semibold text-green-800">रसोई MATE</b>') }}></p>
            </div>
        </div>
    );
};


// --- Main Component ---
const RecipeChatScreen: React.FC<RecipeChatScreenProps> = ({ language }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const wishlist = useStore((state: AppState) => state.wishlist);
  const vegetables = useStore((state: AppState) => state.vegetables);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const todaysSelectionVeggies = useMemo(() => {
    return wishlist
        .map(item => vegetables.find(v => v.id === item.id))
        .filter((v): v is Vegetable => !!v);
  }, [wishlist, vegetables]);
  
  const selectionText = useMemo(() => {
    if (todaysSelectionVeggies.length === 0) return '';
    const names = todaysSelectionVeggies.map(v => `<b>${v.name[Language.HI]}</b>`);
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} और ${names[1]}`;
    return `${names[0]}, ${names[1]} और अन्य सब्ज़ियाँ`;
  }, [todaysSelectionVeggies]);
  
  const dynamicSuggestion = useMemo(() => {
    if (todaysSelectionVeggies.length > 0) {
        return `Recipes with ${todaysSelectionVeggies[0].name['EN']}`;
    }
    return 'Recipes with Carrots';
  }, [todaysSelectionVeggies]);


  const handleSendMessage = async (messageText: string) => {
    const currentInput = messageText.trim();
    if (!currentInput || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', text: currentInput };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setUserInput('');
    setIsLoading(true);
    setError('');

    try {
        const { response } = await api.sendChatMessage(messages, currentInput, SYSTEM_INSTRUCTION);
        setMessages(prev => [...prev, { role: 'model', text: response }]);
    } catch (e) {
      console.error("Failed to send message:", e);
      setError("I'm sorry, I couldn't process that. Please try again.");
      setMessages(messages);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ height: 'calc(100vh - 128px)' }} className="flex flex-col bg-white">
      {/* --- Header Section --- */}
     <header className="p-4 bg-white border-b sticky top-0 z-10 flex flex-col items-center justify-center text-center">
  <div className="flex flex-col items-center">
    <div className="p-2 bg-green-100 rounded-full mb-2">
      <ChefHatIcon className="h-8 w-8 text-green-700" />
    </div>

    <h2 className="text-2xl font-bold text-gray-800">रसोई MATE</h2>
    <p className="text-sm font-medium text-gray-500">Your Personal Cooking Assistant</p>
  </div>

  <p className="text-xs text-gray-500 mt-2 max-w-xs">
    Instantly match recipes to your <b className="font-semibold text-green-700">Sabzi MATE</b> items.
  </p>
</header>

      
      {/* --- Main Content Area --- */}
      <main className="flex-grow overflow-y-auto">
        <TodaysSelections vegetables={todaysSelectionVeggies} language={language} />
        <div className="p-4 space-y-4">
            {messages.length === 0 && <GreetingBubble selectionText={selectionText} />}
            {messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs md:max-w-md lg:max-w-lg px-5 py-3 rounded-2xl ${msg.role === 'user' ? 'bg-green-600 text-white rounded-br-none' : 'bg-slate-100 text-gray-800 rounded-bl-none'}`}>
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            ))}
            {isLoading && (
  <div className="flex justify-start animate-slide-in-up-subtle">
    <div className="px-4 py-3 rounded-2xl bg-transparent flex justify-center items-center" style={{ minHeight: '100px' }}>
      <Lottie
        animationData={loadingAnimation}
        loop
        autoplay
        style={{ width: 80, height: 80, background: 'transparent' }}
      />
    </div>
  </div>
)}


            {error && <p className="text-red-500 text-center text-sm p-2 bg-red-50 rounded-md">{error}</p>}
            <div ref={messagesEndRef} />
        </div>
      </main>

      {/* --- Input Footer Section --- */}
      <footer className="p-4 bg-white border-t flex-shrink-0">
        <div className="space-y-3">
            <div className="flex items-center space-x-3">
                <div className="flex-grow relative">
                    <button onClick={() => alert('Voice input coming soon!')} className="absolute inset-y-0 left-0 flex items-center pl-4">
                        <MicIcon className="h-6 w-6 text-gray-500 hover:text-green-600" />
                    </button>
                    <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(userInput); }} className="w-full">
                        <input
                            type="text"
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            placeholder="Search by dish name or ingredients..."
                            className="w-full text-base pl-12 pr-5 py-3 bg-gray-100 border-2 border-transparent rounded-full text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                            disabled={isLoading}
                        />
                    </form>
                </div>
                <button 
                    type="button" 
                    onClick={() => handleSendMessage(userInput)} 
                    disabled={!userInput.trim() || isLoading}
                    className="bg-green-600 text-white rounded-full p-3 shadow-md hover:bg-green-700 transition-colors flex-shrink-0 disabled:bg-gray-400 disabled:cursor-not-allowed">
                    <SendIcon className="h-6 w-6 text-white" />
                </button>
            </div>
            <div className="flex justify-center items-center space-x-2 overflow-x-auto pb-1">
                <button type="button" onClick={() => handleSendMessage('Quick Dinner ⚡')} className="flex-shrink-0 px-4 py-2 text-sm font-semibold rounded-full bg-white text-green-800 border-2 border-green-100 hover:bg-green-50">Quick Dinner ⚡</button>
                <button type="button" onClick={() => handleSendMessage(dynamicSuggestion)} className="flex-shrink-0 px-4 py-2 text-sm font-semibold rounded-full bg-white text-green-800 border-2 border-green-100 hover:bg-green-50">{dynamicSuggestion}</button>
                <button type="button" onClick={() => handleSendMessage('Festival Special 🇮🇳')} className="flex-shrink-0 px-4 py-2 text-sm font-semibold rounded-full bg-white text-green-800 border-2 border-green-100 hover:bg-green-50">Festival Special 🇮🇳</button>
            </div>
        </div>
      </footer>
    </div>
  );
};

export default RecipeChatScreen;
