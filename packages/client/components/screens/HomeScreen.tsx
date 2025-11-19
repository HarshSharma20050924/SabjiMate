import React, { useState, useRef, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { Language, Vegetable, OrderItem, ParsedOrderItem, User, BillEntry } from '../../../common/types';
import { translations } from '../../../common/constants';
import VegetableCard from '../VegetableCard';
import LoadingSpinner from '../../../common/components/LoadingSpinner';
import { sendDeliveryConfirmation, processAudioOrder, getBills } from '../../../common/api';
import { calculateItemPrice } from '@common/utils';
import { useStore, AppState } from '../../store';

const VegetableDetailModal = lazy(() => import('../VegetableDetailModal'));

const ErrorIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-16 w-16"} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
);
const EmptyIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-16 w-16"} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.012-1.244h3.859M12 3v8.25m0 0l-3-3m3 3l3-3" /></svg>
);

interface HomeScreenProps {
  language: Language;
  user: User;
  reorderMessage: string;
  clearReorderMessage: () => void;
  standingOrderMessage: string;
  onConfirmSuccess: () => void;
  onTrackNow: () => void;
}

const LiveDeliveryBanner: React.FC<{onClick: () => void}> = ({ onClick }) => (
    <div 
        onClick={onClick} 
        className="sticky top-0 bg-blue-100 border-b-2 border-blue-300 text-blue-800 p-3 flex justify-between items-center cursor-pointer z-10 animate-pulse-bg"
        style={{ animationDuration: '3s' }}
    >
        <p className="font-semibold text-sm">Your SabziMATE is arriving soon!</p>
        <span className="font-bold text-sm flex items-center">
            Track now 
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
        </span>
    </div>
);

const WishlistLockBanner: React.FC = () => (
    <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4" role="alert">
      <div className="flex">
        <div className="py-1"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
        <div className="ml-3">
          <p className="font-bold">Today's list is now locked.</p>
          <p className="text-sm">Your selections for today are final for delivery planning. You can start building your list for tomorrow.</p>
        </div>
      </div>
    </div>
);

const TrustBanner: React.FC = () => (
    <div className="bg-gradient-to-r from-amber-50 to-orange-100 p-4 rounded-lg shadow-md flex items-center justify-center space-x-4 animate-banner-slide-in">
        <span className="text-2xl">✨</span>
        <p className="font-bold text-base text-amber-800 text-center">Trusted by Lakhs for Happy Families!</p>
        <span className="text-2xl">✨</span>
    </div>
);

const RefreshIcon: React.FC<{className: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
    </svg>
);

const YesBanner: React.FC<{ show: boolean, language: Language }> = ({ show, language }) => {
    const text = language === Language.HI
        ? "आज की ताज़ी सब्ज़ियों की लिस्ट बनाएं, हम आपके घर ज़रूर रुकेंगे!"
        : "Build your list for today's delivery, we'll be sure to stop by!";

    if (!show) return null;

    return (
        <div className="bg-gradient-to-r from-green-100 via-teal-50 to-green-100 p-4 rounded-lg shadow-md animate-banner-slide-in text-center">
            <h2 className="text-lg font-bold text-green-800">✅ {text}</h2>
        </div>
    );
};

// Animation helper for the "fly to bucket" effect
const triggerFlyAnimation = (startElement: HTMLElement, endElement: HTMLElement, imageUrl: string) => {
    const startRect = startElement.getBoundingClientRect();
    const endRect = endElement.getBoundingClientRect();

    const flyingImage = document.createElement('img');
    flyingImage.src = imageUrl;
    flyingImage.style.position = 'fixed';
    flyingImage.style.left = `${startRect.left}px`;
    flyingImage.style.top = `${startRect.top}px`;
    flyingImage.style.width = `${startRect.width}px`;
    flyingImage.style.height = `${startRect.height}px`;
    flyingImage.style.borderRadius = '0.5rem';
    flyingImage.style.zIndex = '1000';
    flyingImage.style.transition = 'all 0.7s cubic-bezier(0.5, -0.5, 0.2, 1.2)';
    flyingImage.style.objectFit = 'cover';
    document.body.appendChild(flyingImage);

    requestAnimationFrame(() => {
        flyingImage.style.left = `${endRect.left + endRect.width / 2}px`;
        flyingImage.style.top = `${endRect.top + endRect.height / 2}px`;
        flyingImage.style.width = '24px';
        flyingImage.style.height = '24px';
        flyingImage.style.transform = 'translate(-50%, -50%) rotate(360deg) scale(0.5)';
        flyingImage.style.opacity = '0.5';
    });

    setTimeout(() => {
        document.body.removeChild(flyingImage);
    }, 700);
};


const HomeScreen: React.FC<HomeScreenProps> = ({ 
    language, user, reorderMessage, clearReorderMessage, standingOrderMessage,
    onConfirmSuccess, onTrackNow
}) => {
  const t = translations[language];
  
  // Using individual selectors for performance optimization
  const vegetables = useStore((state: AppState) => state.vegetables);
  const isLoadingVeggies = useStore((state: AppState) => state.isLoadingVeggies);
  const vegetablesError = useStore((state: AppState) => state.vegetablesError);
  const wishlist = useStore((state: AppState) => state.wishlist);
  const isInitialWishlistLoading = useStore((state: AppState) => state.isInitialWishlistLoading);
  const isWishlistConfirmed = useStore((state: AppState) => state.isWishlistConfirmed);
  const isWishlistLocked = useStore((state: AppState) => state.isWishlistLocked);
  const isTruckLive = useStore((state: AppState) => state.isTruckLive);
  const updateQuantity = useStore((state: AppState) => state.updateQuantity);
  const confirmWishlist = useStore((state: AppState) => state.confirmWishlist);
  const fetchVeggies = useStore((state: AppState) => state.fetchVeggies);
  const clearWishlist = useStore((state: AppState) => state.clearWishlist);
  const triggerBucketAnimation = useStore((state: AppState) => state.triggerBucketAnimation);

  const [deliveryChoice, setDeliveryChoice] = useState<'YES' | 'NO' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVegetable, setModalVegetable] = useState<Vegetable | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [orderHistory, setOrderHistory] = useState<BillEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories: { key: string, label: keyof typeof t }[] = [
    { key: 'All', label: 'all' },
    { key: 'LEAFY', label: 'leafy' },
    { key: 'ROOT', label: 'root' },
    { key: 'FRUIT', label: 'fruit' },
    { key: 'OTHER', label: 'other' }
  ];

  const isLoading = isLoadingVeggies || isInitialWishlistLoading;

  useEffect(() => {
    const fetchHistory = async () => {
        try {
            const bills = await getBills(user);
            bills.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setOrderHistory(bills);
        } catch (e) { console.error("Failed to fetch order history for Buy Again", e); } 
        finally { setIsLoadingHistory(false); }
    };
    fetchHistory();
  }, [user]);

  useEffect(() => {
    if (reorderMessage) {
        const timer = setTimeout(() => clearReorderMessage(), 3000);
        return () => clearTimeout(timer);
    }
  }, [reorderMessage, clearReorderMessage]);

  useEffect(() => {
    if (!isLoading && wishlist.length > 0 && deliveryChoice === null) {
        setDeliveryChoice('YES');
    }
  }, [isLoading, wishlist, deliveryChoice]);

  const handleDeliveryChoice = async (choice: 'YES' | 'NO') => {
    if (isWishlistLocked) return;
    setDeliveryChoice(choice);
    sendDeliveryConfirmation(choice, user);
    if (choice === 'NO') {
      await clearWishlist();
    }
  };

  const handleQuantityUpdate = (vegId: number, newQuantity: string) => {
    if (newQuantity && deliveryChoice !== 'YES') {
        handleDeliveryChoice('YES');
    }
    updateQuantity(vegId, newQuantity, language);
  };

  const onConfirm = async () => {
    try {
        await confirmWishlist();
        onConfirmSuccess();
    } catch (err: any) {
        alert(err.message);
    }
  };
  
  const getQuantity = (vegId: number): string => wishlist.find(item => item.id === vegId)?.quantity || '';
  
  const handleAddToWishlist = (vegId: number, startElement: HTMLElement, imageUrl: string) => {
    handleQuantityUpdate(vegId, '250g');
    const endElement = document.getElementById('my-list-nav-item');
    if (startElement && endElement) {
        triggerFlyAnimation(startElement, endElement, imageUrl);
    }
    triggerBucketAnimation();
  };

  const buyAgainItems = useMemo(() => {
    if (isLoadingHistory || !orderHistory.length || !vegetables.length) return [];
    const availableVegMap = new Map(vegetables.map(v => [v.id, v]));
    const recentItems = new Map<number, { veg: Vegetable, quantity: string }>();
    for (const bill of orderHistory.slice(0, 5)) {
        for (const item of bill.items) {
            if (!recentItems.has(item.vegetableId) && availableVegMap.has(item.vegetableId)) {
                recentItems.set(item.vegetableId, { veg: availableVegMap.get(item.vegetableId)!, quantity: String(item.quantity) });
            }
        }
    }
    return Array.from(recentItems.values()).slice(0, 10);
  }, [orderHistory, vegetables, isLoadingHistory]);

  const speak = (text: string, lang = 'hi-IN') => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessingVoice(true);
    }
  };

  const startRecording = async () => {
    setIsRecording(true);
    speak('आज आप कौनसी सब्जी लेना चाहेंगे?');
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mimeType = 'audio/webm;codecs=opus';
        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
        audioChunksRef.current = [];
        mediaRecorderRef.current.ondataavailable = (event) => audioChunksRef.current.push(event.data);
        mediaRecorderRef.current.onstop = async () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
            try {
                const parsedItems = await processAudioOrder(audioBlob);
                if (!parsedItems || parsedItems.length === 0) {
                    speak('माफ़ कीजिये, मैंने सुना नहीं।');
                } else {
                    parsedItems.forEach(item => {
                        const veg = vegetables.find(v => v.name[Language.EN].toLowerCase() === item.vegetable.toLowerCase() || v.name[Language.HI] === item.vegetable);
                        if (veg) {
                            handleQuantityUpdate(veg.id, item.quantity);
                            const confirmationMsg = `${veg.name[Language.HI]}, ${item.quantity}, लिस्ट में जुड़ गया है।`;
                            speak(confirmationMsg);
                        }
                    });
                }
            } catch (error) {
                console.error("Error processing audio order:", error);
                speak('माफ़ कीजिये, मैंने सुना नहीं।');
            } finally {
                setIsProcessingVoice(false);
                stream.getTracks().forEach(track => track.stop());
            }
        };
        mediaRecorderRef.current.start();
    } catch (error) {
        console.error("Failed to start recording:", error);
        setIsRecording(false);
        speak('माइक्रोफ़ोन शुरू नहीं हो सका। कृपया अनुमति जांचें।');
    }
  };
  
  const handleVoiceButtonClick = () => {
    if (isRecording) stopRecording();
    else {
      if (deliveryChoice !== 'YES') handleDeliveryChoice('YES');
      startRecording();
    }
  };

  useEffect(() => {
    return () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') mediaRecorderRef.current.stop();
        window.speechSynthesis.cancel();
    };
  }, []);
  
  const filteredVegetables = useMemo(() => vegetables.filter(veg => {
    const searchMatch = searchQuery === '' || veg.name[Language.EN].toLowerCase().includes(searchQuery.toLowerCase()) || veg.name[Language.HI].includes(searchQuery);
    const categoryMatch = selectedCategory === 'All' || (veg.category === selectedCategory);
    return searchMatch && categoryMatch;
  }), [vegetables, searchQuery, selectedCategory]);
  
  const totalPrice = useMemo(() => {
    return wishlist.reduce((total, item) => {
      const vegetable = vegetables.find(v => v.id === item.id);
      if (!vegetable) return total;
      return total + (calculateItemPrice(vegetable.price, item.quantity) || 0);
    }, 0);
  }, [wishlist, vegetables]);

  const renderVegetableList = () => {
    if (isLoading) return <LoadingSpinner />;
    
    if (vegetablesError) {
      return (
        <div className="text-center p-8 my-8 bg-gray-50 rounded-lg">
          <div className="mx-auto w-16 h-16 text-red-500"><ErrorIcon /></div>
          <h3 className="mt-4 text-xl font-semibold text-gray-800">Something Went Wrong</h3>
          <p className="mt-2 text-gray-600">{vegetablesError}</p>
          <div className="mt-6">
            <button onClick={() => fetchVeggies(user.city, language)} className="bg-green-600 text-white font-bold py-2 px-6 rounded-lg shadow-md hover:bg-green-700">
              Retry
            </button>
          </div>
        </div>
      );
    }

    if (filteredVegetables.length > 0) {
      return (
        <div className="grid grid-cols-2 gap-4">
          {filteredVegetables.map((veg, index) => (
            <div key={veg.id} className="animate-slide-in-up-subtle" style={{ animationDelay: `${Math.min(index * 50, 500)}ms` }}>
                <VegetableCard 
                    vegetable={veg} 
                    language={language} 
                    onClick={() => setModalVegetable(veg)} 
                    quantity={getQuantity(veg.id)} 
                    onQuickAdd={(startElement, imageUrl) => handleAddToWishlist(veg.id, startElement, imageUrl)}
                    isLocked={isWishlistLocked} 
                />
            </div>
          ))}
        </div>
      );
    }
    
    return (
        <div className="text-center p-8 my-8 bg-gray-50 rounded-lg">
            <div className="mx-auto w-16 h-16 text-gray-400"><EmptyIcon /></div>
            <h3 className="mt-4 text-xl font-semibold text-gray-800">{t.noVeggiesFound}</h3>
            <p className="mt-2 text-gray-600">There are no vegetables available for your location right now. Please check back later.</p>
        </div>
    );
  };
  
  const isConfirmBarVisible = deliveryChoice === 'YES' && wishlist.length > 0 && !isWishlistConfirmed && !isWishlistLocked;

  return (
    <div className="pb-40">
       {isTruckLive && <LiveDeliveryBanner onClick={onTrackNow} />}
       {isWishlistLocked && <WishlistLockBanner />}
       
        <div className="p-4 space-y-4">
            {reorderMessage && (
                <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-lg shadow-md" role="alert">
                <p className="font-bold">{reorderMessage}</p>
                </div>
            )}
            {standingOrderMessage && (
                <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 rounded-lg shadow-md" role="alert">
                <p className="font-bold">{standingOrderMessage}</p>
                </div>
            )}
            
            <TrustBanner />

            {deliveryChoice === null && (
                <div className="bg-white p-4 rounded-lg shadow-md text-center">
                    <div className="space-y-3">
                        <h2 className="text-lg font-bold text-gray-800">{t.willYouTakeVeg}</h2>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => handleDeliveryChoice('YES')} className="flex items-center justify-center py-3 text-xl font-bold text-white rounded-lg shadow-md transition-all bg-green-500 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed" disabled={isWishlistLocked}><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>{t.yes}</button>
                            <button onClick={() => handleDeliveryChoice('NO')} className="flex items-center justify-center py-3 text-xl font-bold text-white rounded-lg shadow-md transition-all bg-red-500 hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed" disabled={isWishlistLocked}><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>{t.no}</button>
                        </div>
                    </div>
                </div>
            )}
            <YesBanner show={deliveryChoice === 'YES'} language={language} />
            {deliveryChoice === 'NO' && (<div className="bg-white p-4 rounded-lg shadow-md text-center py-3"><h2 className="text-lg font-bold text-red-700">See you tomorrow!</h2><p className="pt-2 text-sm font-semibold text-red-800">{t.noDeliveryConfirmation}</p></div>)}
            
            <>
                {buyAgainItems.length > 0 && (
                  <div className="bg-white p-4 rounded-lg shadow-md">
                      <h3 className="text-lg font-bold text-gray-800 mb-3 decorated-header">Buy Again</h3>
                      <div className="flex overflow-x-auto space-x-3 pb-3 -mx-4 px-4">
                          {buyAgainItems.map(({ veg, quantity: lastQuantity }) => {
                              const currentQuantity = getQuantity(veg.id);
                              const isSelected = !!currentQuantity;
                              return (
                                  <div key={veg.id} className="flex-shrink-0 w-32 text-center">
                                      <div className={`relative rounded-lg p-2 border-2 transition-all h-full flex flex-col justify-between ${isSelected ? 'border-green-500 bg-green-50' : 'border-transparent bg-gray-100'}`}>
                                          <img src={veg.image} alt={veg.name[language]} className="w-full h-20 object-cover rounded-md mb-2" />
                                          <div><p className="text-sm font-semibold truncate text-gray-800">{veg.name[language]}</p><p className="text-xs text-gray-500 mb-2">Last: {lastQuantity}</p></div>
                                          <button onClick={() => { handleQuantityUpdate(veg.id, isSelected ? '' : lastQuantity); }} className={`w-full text-xs font-bold py-1.5 rounded-md transition-colors ${isSelected ? 'bg-red-500 text-white' : 'bg-green-600 text-white'} disabled:bg-gray-400`} disabled={isWishlistLocked}>{isSelected ? 'Remove' : '+ Add'}</button>
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  </div>
                )}

                <div className="bg-white p-4 rounded-lg shadow-md">
                <button onClick={handleVoiceButtonClick} disabled={isProcessingVoice || isWishlistLocked} className={`w-full py-3 text-lg font-bold text-white rounded-lg shadow-md transition-colors flex items-center justify-center space-x-2 ${isRecording ? 'bg-orange-500 animate-listening-pulse' : isProcessingVoice ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700'} disabled:bg-gray-400 disabled:cursor-not-allowed`} aria-label={isRecording ? 'Stop recording' : isProcessingVoice ? 'Processing your order' : 'Start recording for vegetable selection'}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                    <span>{isRecording ? t.listening : isProcessingVoice ? t.processing : t.speakHere}</span>
                </button>
                </div>

                <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></div>
                    <input type="text" placeholder={t.searchPlaceholder} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full text-lg pl-12 pr-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"/>
                </div>

                <div className="flex space-x-3 overflow-x-auto pb-3 -mx-4 px-4">
                    {categories.map(category => (<button key={category.key} onClick={() => setSelectedCategory(category.key)} className={`px-4 py-2 text-sm font-semibold rounded-full flex-shrink-0 transition-colors duration-200 ease-in-out ${selectedCategory === category.key ? 'bg-green-600 text-white shadow-lg' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'}`}>{t[category.label]}</button>))}
                </div>

                <div className="mb-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-gray-800 decorated-header">{t.todaysVeggies}</h2>
                        <button onClick={() => fetchVeggies(user.city, language)} disabled={isLoading} className="text-gray-500 hover:text-blue-600 disabled:text-gray-300">
                            <RefreshIcon className={`w-6 h-6 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                     <p className="text-sm text-gray-500 mt-1">
                        Freshly sourced for {new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}.
                    </p>
                </div>
                {renderVegetableList()}
              </>
        </div>

      {modalVegetable && (
          <Suspense fallback={<div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"><LoadingSpinner /></div>}>
            <VegetableDetailModal vegetable={modalVegetable} language={language} onClose={() => setModalVegetable(null)} onQuantityChange={handleQuantityUpdate} initialQuantity={getQuantity(modalVegetable.id)} isLocked={isWishlistLocked} />
          </Suspense>
      )}

      {isConfirmBarVisible && (
        <div className="fixed bottom-16 left-0 right-0 max-w-md mx-auto p-3 bg-gray-50 border-t-2 border-green-500 shadow-2xl">
          <div className="flex justify-between items-center">
              <div><p className="font-bold text-gray-800 text-lg">{wishlist.length} {wishlist.length > 1 ? t.items : t.item}</p><p className="text-sm text-gray-600">Total: <span className="font-extrabold text-xl">₹{totalPrice.toFixed(2)}</span></p></div>
              <button onClick={onConfirm} className="bg-green-600 text-white font-bold py-3 px-5 rounded-lg shadow-lg flex items-center justify-center text-md hover:bg-green-700 transition-all transform hover:scale-105"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>{t.confirmSelection}</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeScreen;