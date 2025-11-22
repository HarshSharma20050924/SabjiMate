import React, { useState, useContext, lazy, Suspense, useCallback, useEffect, useRef } from 'react';
import { Language, ActiveTab, User, OrderItem } from '@common/types';
import Header from './Header';
import BottomNav from './BottomNav';
import { AuthContext, AuthContextType } from '@common/AuthContext';
import LoadingSpinner from '@common/components/LoadingSpinner';
import ConfirmationOverlay from '@common/components/ConfirmationOverlay';
// @FIX: Import AppState type for explicit typing.
import { useStore, AppState } from '@client/store';
import { getWebSocketUrl } from '@common/utils';

// Define global interface for the window object
declare global {
  interface Window {
    deferredPrompt: any;
  }
}

// Lazy load screen components for code splitting
const HomeScreen = lazy(() => import('./screens/HomeScreen'));
const UrgentOrderScreen = lazy(() => import('./screens/UrgentOrderScreen'));
const RecipeChatScreen = lazy(() => import('./screens/RecipeChatScreen'));
const LocationScreen = lazy(() => import('./screens/LocationScreen'));
const BillsScreen = lazy(() => import('./screens/BillsScreen'));
const ProfileScreen = lazy(() => import('./screens/ProfileScreen'));
const HistoryScreen = lazy(() => import('./screens/HistoryScreen'));
const SettingsScreen = lazy(() => import('./screens/SettingsScreen'));
const StandingOrderScreen = lazy(() => import('./screens/StandingOrderScreen'));
const MyListScreen = lazy(() => import('./screens/MyListScreen'));
const SupportScreen = lazy(() => import('./screens/SupportScreen'));


interface MainLayoutProps {
  user: User;
  language: Language;
  setLanguage: (language: Language) => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({ user, language, setLanguage }) => {
  const [activeScreen, setActiveScreen] = useState<ActiveTab>(ActiveTab.Home);
  const [showStandingOrderScreen, setShowStandingOrderScreen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null); // State for PWA install prompt
  const auth = useContext(AuthContext) as AuthContextType;

  // FIX: Refactor to use individual selectors for performance and to fix infinite loops.
  const wishlistCount = useStore((state: AppState) => state.wishlist.length);
  const fetchVeggies = useStore((state: AppState) => state.fetchVeggies);
  const fetchInitialList = useStore((state: AppState) => state.fetchInitialList);
  const handleReorderInStore = useStore((state: AppState) => state.handleReorder);
  const isTruckLive = useStore((state: AppState) => state.isTruckLive);
  
  // Local component state for UI effects
  const [confirmation, setConfirmation] = useState({ show: false, message: '' });
  const [reorderMessage, setReorderMessage] = useState('');
  const [standingOrderMessage, setStandingOrderMessage] = useState('');
  const [showLiveTracker, setShowLiveTracker] = useState(false);
  
  const ws = useRef<WebSocket | null>(null);


  // --- WebSocket for Truck Status ---
  useEffect(() => {
    // Access actions directly from store hook, don't include in dependency array
    const setTruckLiveAction = useStore.getState().setTruckLive;
    const clearLocalWishlistAction = useStore.getState().clearLocalWishlist;

    const socket = new WebSocket(getWebSocketUrl());
    ws.current = socket;
    
    socket.onopen = () => {
        console.log("MainLayout WebSocket connected.");
        // Identify the user for targeted messages
        socket.send(JSON.stringify({ type: 'identify_user', payload: { userId: user.phone } }));
    };

    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'truck_location_broadcast' && data.payload) {
                setTruckLiveAction(true);
            }
            if (data.type === 'wishlist_cleared') {
                console.log("Received wishlist cleared signal. Clearing local state.");
                clearLocalWishlistAction();
            }
        } catch (e) {
             // Ignore non-JSON messages or parsing errors
        }
    };

    socket.onclose = () => {
        setTruckLiveAction(false);
        console.log("MainLayout WebSocket disconnected.");
    };
    
    socket.onerror = (err) => {
        console.error("WebSocket Error in MainLayout: ", err);
        setTruckLiveAction(false);
    }

    return () => {
        if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
            socket.close();
        }
        ws.current = null;
    };
  }, [user.phone]); // Rerun if user changes

  // --- PWA Install Prompt Handler ---
  useEffect(() => {
    // Check if the event was already captured in index.html
    if (window.deferredPrompt) {
        console.log('PWA install prompt recovered from global scope.');
        setInstallPrompt(window.deferredPrompt);
    }

    const handler = (e: Event) => {
        e.preventDefault();
        console.log('PWA install prompt captured (listener).');
        setInstallPrompt(e);
        window.deferredPrompt = e;
    };
    window.addEventListener('beforeinstallprompt', handler);
    
    // Also check if app is already installed to potentially hide instructions
    window.addEventListener('appinstalled', () => {
        setInstallPrompt(null);
        window.deferredPrompt = null;
        console.log('PWA was installed');
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // --- Handle Notification Click Action ---
  useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      if (params.get('action') === 'track') {
          setShowLiveTracker(true);
          // Clean the URL so the tracking screen doesn't open again on refresh
          window.history.replaceState({}, document.title, window.location.pathname);
      }
  }, []);

  const handleInstallClick = () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then((choiceResult: { outcome: string }) => {
        if (choiceResult.outcome === 'accepted') {
            console.log('User accepted the install prompt');
        } else {
            console.log('User dismissed the install prompt');
        }
        setInstallPrompt(null); // The prompt can only be used once
        window.deferredPrompt = null;
    });
  };


  // Fetch initial data on mount
  useEffect(() => {
    const fetchAllInitialData = async () => {
      await fetchVeggies(user.city, language);
      const message = await fetchInitialList();
      if (message) {
        setStandingOrderMessage(message);
      }
    };
    fetchAllInitialData();
  }, [user.city, language, fetchVeggies, fetchInitialList]);
  
  // Effect to clear standing order message after a delay
  useEffect(() => {
    if (standingOrderMessage) {
        const timer = setTimeout(() => {
            setStandingOrderMessage('');
        }, 4000);
        return () => clearTimeout(timer);
    }
  }, [standingOrderMessage]);


  const handleReorder = useCallback((itemsToReorder: OrderItem[]) => {
    const message = handleReorderInStore(itemsToReorder, language);
    setReorderMessage(message);
    setActiveScreen(ActiveTab.Home);
  }, [handleReorderInStore, language]);
  
  const handleConfirmSuccess = useCallback(() => {
    setConfirmation({ show: true, message: 'Wishlist Saved!' });
    setActiveScreen(ActiveTab.Home); // Navigate home after confirmation
  }, []);

  const handleCloseStandingOrder = useCallback(() => setShowStandingOrderScreen(false), []);
  
  const handleNavClick = useCallback((tab: ActiveTab) => {
    setActiveScreen(tab);
  }, []);

  const renderContent = () => {
    switch (activeScreen) {
      case ActiveTab.Home:
        return <HomeScreen 
                    language={language} 
                    user={user} 
                    reorderMessage={reorderMessage}
                    clearReorderMessage={() => setReorderMessage('')}
                    standingOrderMessage={standingOrderMessage}
                    onConfirmSuccess={handleConfirmSuccess}
                    onTrackNow={() => setShowLiveTracker(true)}
                />;
      case ActiveTab.UrgentOrder:
        return <UrgentOrderScreen language={language} user={user} />;
      case ActiveTab.Recipe:
        return <RecipeChatScreen language={language} />;
      case ActiveTab.Bills:
        return <BillsScreen 
                    language={language} 
                    user={user} 
                    isTruckLive={isTruckLive} 
                    onTrackNow={() => setShowLiveTracker(true)}
                    onReorder={handleReorder}
                />;
      case ActiveTab.History:
        return <HistoryScreen language={language} user={user} onReorder={handleReorder} />;
      case ActiveTab.Profile:
        return <ProfileScreen language={language} onSaveSuccess={auth.updateUserSession} />;
      case ActiveTab.MyList:
          return <MyListScreen 
                    language={language}
                    onConfirmSuccess={handleConfirmSuccess}
                />;
      case ActiveTab.Support:
          return <SupportScreen language={language} />;
      case ActiveTab.Settings:
          return <SettingsScreen
              language={language}
              setLanguage={setLanguage}
              onClose={() => setActiveScreen(ActiveTab.Home)}
              onNavigateToProfile={() => setActiveScreen(ActiveTab.Profile)}
              onNavigateToHistory={() => setActiveScreen(ActiveTab.Bills)}
              onNavigateToStandingOrder={() => setShowStandingOrderScreen(true)}
              onNavigateToSupport={() => setActiveScreen(ActiveTab.Support)}
              isInstallable={!!installPrompt}
              onInstallApp={handleInstallClick}
          />;
      default:
        return <HomeScreen 
                    language={language} 
                    user={user} 
                    reorderMessage={reorderMessage}
                    clearReorderMessage={() => setReorderMessage('')}
                    standingOrderMessage={standingOrderMessage}
                    onConfirmSuccess={handleConfirmSuccess}
                    onTrackNow={() => setShowLiveTracker(true)}
                />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <ConfirmationOverlay 
            show={confirmation.show} 
            message={confirmation.message}
            onClose={() => setConfirmation({ show: false, message: '' })}
       />
      <Header 
        user={user}
        onProfileClick={() => setActiveScreen(ActiveTab.Profile)}
        onSettingsClick={() => setActiveScreen(ActiveTab.Settings)}
        installPrompt={installPrompt}
        onInstallClick={handleInstallClick}
      />
      <main className="flex-grow overflow-y-auto pb-20 bg-gray-50">
        <Suspense fallback={<div className="h-full flex items-center justify-center"><LoadingSpinner /></div>}>
            {renderContent()}
        </Suspense>
      </main>
      <BottomNav activeTab={activeScreen} setActiveTab={handleNavClick} language={language} wishlistCount={wishlistCount} />

      {showLiveTracker && (
        <Suspense fallback={<div className="fixed inset-0 bg-gray-50 z-50 flex items-center justify-center"><LoadingSpinner /></div>}>
            <LocationScreen language={language} onClose={() => setShowLiveTracker(false)} />
        </Suspense>
      )}

      {showStandingOrderScreen && (
         <Suspense fallback={<div className="fixed inset-0 bg-gray-50 z-50 flex items-center justify-center"><LoadingSpinner /></div>}>
            <StandingOrderScreen
                language={language}
                user={user}
                onClose={handleCloseStandingOrder}
            />
        </Suspense>
      )}
    </div>
  );
};

export default MainLayout;